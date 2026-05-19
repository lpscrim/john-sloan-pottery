'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import type { HomeFeaturedCollectionsContent, HomeFeaturedCollectionSlide } from '@/app/_lib/homeFeaturedCollections';
import {
  resetHomeFeaturedCollections,
  saveHomeFeaturedCollections,
  uploadHomeFeaturedCollectionImage,
} from './actions';
import { compressImage } from '../compressImage';

function SaveButton({ pending, label = 'Save' }: { pending: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="cursor-pointer text-base transition-all duration-250 group disabled:opacity-50"
    >
      <span className="group-hover:px-0.5 transition-all duration-250">[</span>{' '}
      {pending ? 'Saving…' : label}{' '}
      <span className="group-hover:px-0.5 transition-all duration-250">]</span>
    </button>
  );
}

function StatusMsg({ ok, msg }: { ok?: boolean; msg: string }) {
  if (!msg) return null;
  return <p className={`text-base mt-2 ${ok ? 'text-green-700' : 'text-destructive'}`}>{msg}</p>;
}

export default function HomeFeaturedClient({
  initial,
  categoryOptions,
}: {
  initial: HomeFeaturedCollectionsContent;
  categoryOptions: string[];
}) {
  const [slides, setSlides] = useState<HomeFeaturedCollectionSlide[]>(initial.slides);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveOk, setSaveOk] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [resetOk, setResetOk] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadOk, setUploadOk] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [isPendingSave, startSave] = useTransition();
  const [isPendingReset, startReset] = useTransition();

  function updateSlide(index: number, patch: Partial<HomeFeaturedCollectionSlide>) {
    setSlides((current) => current.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)));
    setSaveMsg('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg('');
    startSave(async () => {
      const result = await saveHomeFeaturedCollections(slides);
      setSaveOk(result.success);
      setSaveMsg(result.success ? 'Saved.' : result.error ?? 'Failed to save.');
    });
  }

  async function handleUpload(index: number, file: File | null) {
    if (!file) return;
    setUploadMsg('');
    setUploadingIndex(index);
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append('image', compressed);
    fd.append('index', String(index));
    const result = await uploadHomeFeaturedCollectionImage(fd);
    setUploadingIndex(null);
    setUploadOk(result.success);
    setUploadMsg(result.success ? 'Image uploaded.' : result.error ?? 'Upload failed.');
    if (result.success && result.url) updateSlide(index, { imageUrl: result.url });
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetMsg('');
    startReset(async () => {
      const result = await resetHomeFeaturedCollections();
      setResetOk(result.success);
      setResetMsg(result.success ? 'Reset to defaults.' : result.error ?? 'Reset failed.');
      if (result.success) window.location.reload();
    });
  }

  return (
    <div className="space-y-12">
      <form onSubmit={handleSave} className="space-y-8">
        {slides.map((slide, index) => (
          <section key={index} className="border border-muted rounded-sm p-5 space-y-4">
            <h2 className="text-base tracking-widest uppercase text-muted-foreground">
              Slide {index + 1}
            </h2>

            <div className="grid md:grid-cols-2 gap-6 items-start">
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-sm text-muted-foreground">Title</span>
                  <input
                    value={slide.title}
                    onChange={(e) => updateSlide(index, { title: e.target.value })}
                    className="w-full border border-muted bg-background px-3 py-2 rounded-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm text-muted-foreground">Text</span>
                  <textarea
                    value={slide.text}
                    onChange={(e) => updateSlide(index, { text: e.target.value })}
                    rows={3}
                    className="w-full border border-muted bg-background px-3 py-2 rounded-sm resize-y"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm text-muted-foreground">Category filter</span>
                  <select
                    value={slide.category}
                    onChange={(e) => updateSlide(index, { category: e.target.value })}
                    className="w-full border border-muted bg-background px-3 py-2 rounded-sm"
                  >
                    {!categoryOptions.includes(slide.category) && slide.category ? (
                      <option value={slide.category}>{slide.category} (saved value)</option>
                    ) : null}
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-sm text-muted-foreground">Button label</span>
                  <input
                    value={slide.buttonLabel}
                    onChange={(e) => updateSlide(index, { buttonLabel: e.target.value })}
                    className="w-full border border-muted bg-background px-3 py-2 rounded-sm"
                  />
                </label>
              </div>

              <div className="space-y-3">
                <div className="relative aspect-4/5 overflow-hidden rounded-sm bg-muted border border-muted">
                  {slide.imageUrl ? (
                    <Image
                      src={slide.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 400px"
                      unoptimized={slide.imageUrl.startsWith('/')}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground text-center px-6">
                      No image uploaded yet.
                    </div>
                  )}
                </div>

                <label className={`inline-flex items-center justify-center border border-muted px-4 py-2 rounded-sm cursor-pointer hover:border-foreground transition-colors ${uploadingIndex === index ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploadingIndex === index ? 'Uploading…' : 'Upload image'}
                  <input
                    ref={(node) => { fileRefs.current[index] = node; }}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => handleUpload(index, e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>
          </section>
        ))}

        <SaveButton pending={isPendingSave} />
        <StatusMsg ok={saveOk} msg={saveMsg} />
        <StatusMsg ok={uploadOk} msg={uploadMsg} />
      </form>

      <section className="space-y-3 border-t border-muted pt-8">
        <h2 className="text-base tracking-widest uppercase text-muted-foreground">Reset to defaults</h2>
        <form onSubmit={handleReset}>
          <SaveButton pending={isPendingReset} label="Reset to defaults" />
          <StatusMsg ok={resetOk} msg={resetMsg} />
        </form>
      </section>
    </div>
  );
}