'use client';

import { useActionState, useRef, useState, useEffect, useTransition } from 'react';
import { addProduct, type AddProductState } from './actions';
import { compressImage } from '../compressImage';
import Button from '@/app/_components/UI/Layout/Button';
import { GlazeSelect } from '@/app/admin/GlazeSelect';
import type { Glaze, MugShape } from '@/app/_lib/customMug';

const initialState: AddProductState = { success: false };
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB (post-compression safety net)
const MAX_TOTAL_SIZE = 4 * 1024 * 1024; // 4 MB total — Vercel serverless limit
const MAX_SECONDARY = 4;

export default function AddProductPage() {
  const [state, formAction, isPending] = useActionState(addProduct, initialState);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [secondaryPreviews, setSecondaryPreviews] = useState<(string | null)[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [glazeResetKey, setGlazeResetKey] = useState(0);
  const [glazes, setGlazes] = useState<Glaze[]>([]);
  const [shapes, setShapes] = useState<MugShape[]>([]);

  useEffect(() => {
    fetch('/api/glazes').then(r => r.json()).then((data: { glazes: Glaze[] }) => setGlazes(data.glazes ?? [])).catch(() => {});
    fetch('/api/mug-shapes').then(r => r.json()).then((data: { shapes: MugShape[] }) => setShapes(data.shapes ?? [])).catch(() => {});
  }, []);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileError(null);

    if (file) {
      if (!file.type.startsWith('image/')) {
        setFileError('Please select an image file.');
        e.target.value = '';
        setPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
        return;
      }
      const url = URL.createObjectURL(file);
      setPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    } else {
      setPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    }
  }

  function handleSecondaryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const files = Array.from(e.target.files ?? []);

    if (files.length > MAX_SECONDARY) {
      setFileError(`You can upload a maximum of ${MAX_SECONDARY} secondary images. You selected ${files.length}.`);
      e.target.value = '';
      setSecondaryPreviews([]);
      return;
    }

    setSecondaryPreviews((prev) => {
      prev.forEach((url) => { if (url) URL.revokeObjectURL(url); });
      return files.map(f => URL.createObjectURL(f));
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFileError(null);
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

      startTransition(() => formAction(formData));
    } catch (err) {
      setFileError(`Image compression failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCompressing(false);
    }
  }

  // Reset form on success
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      // Use setTimeout to defer state update and avoid cascading renders
      const timer = setTimeout(() => {
        setPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
        setSecondaryPreviews((prev) => {
          prev.forEach((url) => { if (url) URL.revokeObjectURL(url); });
          return [];
        });
        setGlazeResetKey(k => k + 1);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-16">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl tracking-tight mb-8">ADD PRODUCT</h1>

        <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <label className="block">
            <span className="text-base font-medium">Name *</span>
            <input
              name="name"
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-muted bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-foreground"
            />
          </label>

          {/* Description */}
          <label className="block">
            <span className="text-base font-medium">Description</span>
            <textarea
              name="description"
              rows={3}
              className="mt-1 block w-full rounded-md border border-muted bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-foreground"
            />
          </label>

          {/* Price */}
          <label className="block">
            <span className="text-base font-medium">Price (£) *</span>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="mt-1 block w-full rounded-md border border-muted bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-foreground"
            />
          </label>

          {/* Stock */}
          <label className="block">
            <span className="text-base font-medium">Stock</span>
            <input
              name="stock"
              type="number"
              min="0"
              defaultValue={0}
              className="mt-1 block w-full rounded-md border border-muted bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-foreground"
            />
          </label>

          {/* Categories */}
          <label className="block">
            <span className="text-base font-medium">
              Categories{' '}
              <span className="text-muted-foreground font-normal">(comma-separated)</span>
            </span>
            <input
              name="categories"
              type="text"
              placeholder="LANDSCAPE, BW"
              className="mt-1 block w-full rounded-md border border-muted bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-foreground"
            />
          </label>

          <div className="block">
            <span className="text-base font-medium">Glaze</span>
            <div className="mt-1 space-y-2">
              {[0, 1, 2].map((i) => (
                <GlazeSelect key={`${glazeResetKey}-${i}`} index={i} glazes={glazes} />
              ))}
            </div>
          </div>

          {shapes.length > 0 && (
            <label className="block">
              <span className="text-base font-medium">Mug shape <span className="text-muted-foreground font-normal">(optional — links sold-out buy button to Build a Mug)</span></span>
              <select
                name="mug_shape_slug"
                className="mt-1 block w-full rounded-md border border-muted bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-foreground"
              >
                <option value="">None</option>
                {shapes.map(s => (
                  <option key={s.id} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </label>
          )}

          {/* Image */}
          <label className="block">
            <span className="text-base font-medium">Cover Image</span>
            <input
              name="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-1 block w-full text-base file:mr-4 file:rounded-md file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-base file:font-medium file:text-background hover:file:opacity-80"
            />
          </label>

          {/* Preview */}
          {preview && (
            <div className="relative aspect-4/5 max-w-50 overflow-hidden rounded-md bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Secondary Images (up to 4) */}
          <label className="block">
            <span className="text-base font-medium">
              Gallery Images{' '}
              <span className="text-muted-foreground font-normal">(up to 4, optional)</span>
            </span>
            <input
              name="secondary"
              type="file"
              accept="image/*"
              multiple
              onChange={handleSecondaryChange}
              className="mt-1 block w-full text-base file:mr-4 file:rounded-md file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-base file:font-medium file:text-background hover:file:opacity-80"
            />
          </label>

          {/* Secondary Previews */}
          {secondaryPreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {secondaryPreviews.map((src, i) => (
                <div key={i} className="relative aspect-4/5 w-25 overflow-hidden rounded-md bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src!} alt={`Secondary ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Notifications */}
          <div>
            {(state.error || fileError) && (
              <div className="rounded-md border border-red-400 bg-red-50 px-4 py-3 text-red-700 text-base">
                {fileError || state.error}
              </div>
            )}

            {state.success && (
              <div className="rounded-md border border-green-400 bg-green-50 px-4 py-3 text-green-700 text-base">
                Product created successfully!
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isPending || compressing}
            size="base"
          >
            {compressing ? 'Compressing images…' : isPending ? 'Creating…' : 'Create Product'}
          </Button>
        </form>
      </div>
    </div>
  );
}
