"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { AdminProduct } from "./types";
import {
  deleteProduct,
  updateProduct,
  type DeleteProductState,
  type UpdateProductState,
} from "./actions";
import { compressImage } from "../compressImage";
import { ColourPicker } from "@/app/admin/ColourPicker";

const initialUpdateState: UpdateProductState = { success: false };
const initialDeleteState: DeleteProductState = { success: false };
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_TOTAL_SIZE = 4 * 1024 * 1024; // Vercel serverless limit
const MAX_SECONDARY = 4;

export default function EditProductClient({
  products,
}: {
  products: AdminProduct[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    () => products[0]?.id ?? null,
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [updateState, updateAction, isUpdating] = useActionState(
    updateProduct,
    initialUpdateState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteProduct,
    initialDeleteState,
  );

  useEffect(() => {
    if (updateState.success) {
      setSavedAt(Date.now());
      formRef.current?.reset();
      const timer = setTimeout(() => setFileError(null), 0);
      return () => clearTimeout(timer);
    }
  }, [updateState]);

  useEffect(() => {
    if (updateState.success || deleteState.success) {
      router.refresh();
    }
  }, [updateState.success, deleteState.success, router]);

  const [productSearch, setProductSearch] = useState('');
  const [glazeColours, setGlazeColours] = useState<[string, string, string]>(['', '', '']);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const resolvedSelectedId = useMemo(() => {
    if (selectedId !== null && products.some((p) => p.id === selectedId)) {
      return selectedId;
    }
    return products[0]?.id ?? null;
  }, [products, selectedId]);

  const selected = useMemo(
    () => products.find((p) => p.id === resolvedSelectedId) ?? null,
    [products, resolvedSelectedId],
  );

  // Auto-dismiss success banner after 3s
  useEffect(() => {
    if (!savedAt) return;
    const timer = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(timer);
  }, [savedAt]);

  // Sync glaze colours when selected product changes
  useEffect(() => {
    const sel = products.find((p) => p.id === resolvedSelectedId) ?? null;
    setGlazeColours([
      sel?.glaze[0]?.colour ?? '',
      sel?.glaze[1]?.colour ?? '',
      sel?.glaze[2]?.colour ?? '',
    ]);
  }, [resolvedSelectedId, products]);

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFileError('Please select an image file.');
      e.target.value = "";
    }
  }

  function handleGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const files = Array.from(e.target.files ?? []);
    if (files.length > MAX_SECONDARY) {
      setFileError(
        `You can upload a maximum of ${MAX_SECONDARY} gallery images.`,
      );
      e.target.value = "";
      return;
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFileError(null);
    setSavedAt(null);
    setCompressing(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      // Compress cover image
      const coverFile = formData.get('image') as File | null;
      if (coverFile && coverFile.size > 0) {
        const compressed = await compressImage(coverFile);
        formData.set('image', compressed);
      }

      // Compress secondary images
      const secondaryFiles = formData.getAll('secondary') as File[];
      formData.delete('secondary');
      for (const file of secondaryFiles) {
        if (file.size > 0) {
          const compressed = await compressImage(file);
          formData.append('secondary', compressed);
        } else {
          formData.append('secondary', file);
        }
      }

      // Check total size after compression
      let totalSize = 0;
      for (const value of formData.values()) {
        if (value instanceof File) totalSize += value.size;
      }
      if (totalSize > MAX_TOTAL_SIZE) {
        setFileError(`Total upload size (${(totalSize / 1024 / 1024).toFixed(1)} MB) is still too large after compression. Use fewer or smaller images.`);
        return;
      }

      updateAction(formData);
    } catch (err) {
      setFileError(`Image compression failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCompressing(false);
    }
  }

  if (!selected) {
    return (
      <div className="min-h-screen bg-background text-foreground px-6 py-16">
        <div className="max-w-xl mx-auto">
          <h1 className="text-3xl tracking-tight mb-4">EDIT PRODUCT</h1>
          <p className="text-base text-muted-foreground">No products found.</p>
        </div>
      </div>
    );
  }

  const priceDisplay = (selected.price_hw / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl tracking-tight mb-2">EDIT PRODUCT</h1>
          <p className="text-base text-muted-foreground">
            Current stock: {selected.stock_level}
          </p>
        </div>

        <div>
          <span className="text-base font-medium block mb-2">Select Product</span>
          <input
            type="text"
            placeholder="Search products…"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="mb-3 block w-full rounded-md border border-muted bg-background px-3 py-2 text-base"
          />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-72 overflow-y-auto pr-1">
            {filteredProducts.map((product) => {
              const isActive = product.id === resolvedSelectedId;
              const thumb = product.image_url || product.gallery[0]?.url || null;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedId(product.id)}
                  className={`rounded-md border-2 overflow-hidden text-left transition-colors ${isActive ? 'border-foreground' : 'border-muted hover:border-foreground/40'}`}
                >
                  <div className="aspect-square w-full bg-muted relative">
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="20vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-base p-1 text-center">
                        No image
                      </div>
                    )}
                  </div>
                  <p className="text-base px-1.5 py-1 truncate leading-tight">{product.name}</p>
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <p className="col-span-full text-base text-muted-foreground py-2">No products match.</p>
            )}
          </div>
        </div>

        <form
          ref={formRef}
          action={updateAction}
          onSubmit={handleSubmit}
          className="space-y-5"
          key={selected.id}
        >
          <input type="hidden" name="productId" value={selected.id} />

          <label className="block">
            <span className="text-base font-medium">Name *</span>
            <input
              name="name"
              type="text"
              required
              defaultValue={selected.name}
              className="mt-1 block w-full rounded-md border border-muted bg-background px-3 py-2 text-base"
            />
          </label>

          <label className="block">
            <span className="text-base font-medium">Description</span>
            <textarea
              name="description"
              rows={3}
              defaultValue={selected.description}
              className="mt-1 block w-full rounded-md border border-muted bg-background px-3 py-2 text-base"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-base font-medium">Price (GBP) *</span>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={priceDisplay}
                className="mt-1 block w-full rounded-md border border-muted bg-background px-3 py-2 text-base"
              />
            </label>
            <label className="block">
              <span className="text-base font-medium">Stock</span>
              <input
                name="stock"
                type="number"
                min="0"
                defaultValue={selected.stock_level}
                className="mt-1 block w-full rounded-md border border-muted bg-background px-3 py-2 text-base"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-base font-medium">
              Categories (comma-separated)
            </span>
            <input
              name="categories"
              type="text"
              defaultValue={selected.categories.join(", ")}
              className="mt-1 block w-full rounded-md border border-muted bg-background px-3 py-2 text-base"
            />
          </label>

          <div className="block">
            <span className="text-base font-medium">Glaze</span>
            <div className="mt-1 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <input name={`glaze_${i}_name`} type="text" defaultValue={selected.glaze[i]?.name ?? ''} placeholder={`Glaze ${i + 1} label (shown to customer)`} className="block w-full rounded-md border border-muted bg-background px-3 py-2 text-base" />
                  <input name={`glaze_${i}_note`} type="text" defaultValue={selected.glaze[i]?.note ?? ''} placeholder="Description (sent to you on order)" className="block w-full rounded-md border border-muted bg-background px-3 py-2 text-base" />
                  <ColourPicker
                    name={`glaze_${i}_colour`}
                    value={glazeColours[i]}
                    onChange={(hex) => setGlazeColours(prev => { const next = [...prev] as [string,string,string]; next[i] = hex; return next; })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium">Cover Image</span>
            </div>
            {selected.image_url ? (
              <div className="relative aspect-4/5 max-w-60 overflow-hidden rounded-md bg-muted">
                <Image
                  src={selected.image_url}
                  alt="Cover"
                  fill
                  className="object-cover"
                  sizes="240px"
                />
              </div>
            ) : (
              <p className="text-base text-muted-foreground">
                No cover image uploaded.
              </p>
            )}
            <input
              name="image"
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="mt-1 block w-full text-base file:mr-4 file:rounded-md file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-base file:font-medium file:text-background hover:file:opacity-80"
            />
          </div>

          <div className="space-y-3">
            <span className="text-base font-medium">Gallery Images</span>
            {selected.gallery.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {selected.gallery.map((image) => (
                  <label key={image.path} className="space-y-2">
                    <div className="relative aspect-4/5 overflow-hidden rounded-md bg-muted">
                      <Image
                        src={image.url}
                        alt="Gallery"
                        fill
                        className="object-cover"
                        sizes="(min-width: 640px) 33vw, 50vw"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-base">
                      <input
                        type="checkbox"
                        name="removeGallery"
                        value={image.path}
                      />
                      Remove
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-base text-muted-foreground">
                No gallery images uploaded.
              </p>
            )}
            <input
              name="secondary"
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryChange}
              className="mt-1 block w-full text-base file:mr-4 file:rounded-md file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-base file:font-medium file:text-background hover:file:opacity-80"
            />
          </div>
          <div className="">
            {(updateState.error || deleteState.error || fileError) && (
              <div className="rounded-md border border-red-400 bg-red-50 px-4 py-3 text-red-700 text-base">
                {fileError || updateState.error || deleteState.error}
              </div>
            )}

            {(updateState.success && savedAt) || deleteState.success ? (
              <div className="rounded-md border border-green-400 bg-green-50 px-4 py-3 text-green-700 text-base">
                {updateState.success
                  ? "Product updated successfully."
                  : "Product removed successfully."}
              </div>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={isUpdating || compressing}
            className="w-full rounded-md bg-foreground px-4 py-2.5 text-base font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {compressing ? "Compressing images…" : isUpdating ? "Updating…" : "Update Product"}
          </button>
        </form>

        <form action={deleteAction} onSubmit={(e) => {
          if (!confirm(`Delete "${selected.name}"? This cannot be undone.`)) {
            e.preventDefault();
          }
        }} className="space-y-3">
          <input type="hidden" name="productId" value={selected.id} />
          <button
            type="submit"
            disabled={isDeleting}
            className="w-full rounded-md border border-red-400 px-4 py-2.5 text-base font-medium text-red-500 transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {isDeleting ? "Removing…" : "Remove Product"}
          </button>
        </form>
      </div>
    </div>
  );
}
