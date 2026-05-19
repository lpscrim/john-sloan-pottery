'use client';

import { useState, useRef, useTransition } from 'react';
import Image from 'next/image';
import type { HomeAboutContent } from '@/app/_lib/homeAboutContent';
import {
  saveHomeAboutText,
  uploadHomeAboutImage,
  removeHomeAboutImage,
  resetHomeAboutToDefault,
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
  return (
    <p className={`text-base mt-2 ${ok ? 'text-green-700' : 'text-destructive'}`}>{msg}</p>
  );
}

export default function HomeAboutClient({ initial }: { initial: HomeAboutContent }) {
  const [text, setText] = useState(initial.text);
  const [images, setImages] = useState<string[]>(initial.images);
  const [textMsg, setTextMsg] = useState('');
  const [textOk, setTextOk] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadOk, setUploadOk] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [resetOk, setResetOk] = useState(false);
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPendingText, startText] = useTransition();
  const [isPendingUpload, startUpload] = useTransition();
  const [isPendingReset, startReset] = useTransition();

  async function handleSaveText(e: React.FormEvent) {
    e.preventDefault();
    setTextMsg('');
    startText(async () => {
      const result = await saveHomeAboutText(text);
      setTextOk(result.success);
      setTextMsg(result.success ? 'Saved.' : result.error ?? 'Failed to save.');
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;
    setUploadMsg('');
    startUpload(async () => {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('image', compressed);
      const result = await uploadHomeAboutImage(fd);
      setUploadOk(result.success);
      setUploadMsg(result.success ? 'Image uploaded.' : result.error ?? 'Upload failed.');
      if (result.success && result.url) {
        setImages((prev) => [...prev, result.url!]);
      }
    });
  }

  async function handleRemove(url: string) {
    setRemovingUrl(url);
    const result = await removeHomeAboutImage(url);
    setRemovingUrl(null);
    if (result.success) {
      setImages((prev) => prev.filter((u) => u !== url));
    } else {
      setUploadMsg(result.error ?? 'Failed to remove image.');
      setUploadOk(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetMsg('');
    startReset(async () => {
      const result = await resetHomeAboutToDefault();
      setResetOk(result.success);
      setResetMsg(result.success ? 'Reset to defaults.' : result.error ?? 'Reset failed.');
      if (result.success) {
        // Reload the page to get fresh initial values
        window.location.reload();
      }
    });
  }

  return (
    <div className="space-y-12">

      {/* ── Text ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-base tracking-widest uppercase text-muted-foreground">
          Intro text
        </h2>
        <form onSubmit={handleSaveText} className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setTextMsg(''); }}
            rows={5}
            className="w-full border border-muted bg-background px-3 py-2 text-base rounded-sm focus:outline-none focus:border-foreground transition-colors resize-y"
          />
          <SaveButton pending={isPendingText} />
          <StatusMsg ok={textOk} msg={textMsg} />
        </form>
      </section>

      {/* ── Images ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-base tracking-widest uppercase text-muted-foreground">
          Gallery images
        </h2>
        <p className="text-base text-muted-foreground">
          These images appear in the rotating gallery on the home page About section. Drag to reorder isn&apos;t available — remove and re-upload to change order.
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((url) => (
            <div key={url} className="relative group aspect-square overflow-hidden rounded-sm bg-muted">
              <Image
                src={url}
                alt=""
                fill
                className="object-cover"
                sizes="150px"
                unoptimized={url.startsWith('/')}
              />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                disabled={removingUrl === url}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-base tracking-widest cursor-pointer disabled:opacity-50"
              >
                {removingUrl === url ? 'Removing…' : 'REMOVE'}
              </button>
            </div>
          ))}

          {/* Upload slot */}
          <label className={`aspect-square flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-sm cursor-pointer hover:border-foreground transition-colors text-muted-foreground text-base text-center px-2 ${isPendingUpload ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-2xl leading-none mb-1">+</span>
            <span>{isPendingUpload ? 'Uploading…' : 'Add image'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleUpload}
              disabled={isPendingUpload}
            />
          </label>
        </div>

        <StatusMsg ok={uploadOk} msg={uploadMsg} />
      </section>

      {/* ── Reset ─────────────────────────────────────────────────── */}
      <section className="space-y-3 border-t border-muted pt-8">
        <h2 className="text-base tracking-widest uppercase text-muted-foreground">
          Reset to defaults
        </h2>
        <p className="text-base text-muted-foreground">
          Restores the original intro text and the five built-in images.
        </p>
        <form onSubmit={handleReset}>
          <SaveButton pending={isPendingReset} label="Reset to defaults" />
          <StatusMsg ok={resetOk} msg={resetMsg} />
        </form>
      </section>

    </div>
  );
}
