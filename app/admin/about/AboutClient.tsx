'use client';

import { useState, useTransition, useRef } from 'react';
import Image from 'next/image';
import type { AboutContent } from '@/app/_lib/aboutContent';
import { saveAboutText, saveSecondaryText, uploadAboutPortrait, uploadAboutSecondaryImage, uploadGalleryImage, removeGalleryImage } from './actions';
import { compressImage } from '../compressImage';

// ── Small helpers ──────────────────────────────────────────────────────────

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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base tracking-widest uppercase text-muted-foreground mb-6">{children}</h2>;
}

function inputCls() {
  return 'w-full border border-muted bg-background px-3 py-2 text-base rounded-sm focus:outline-none focus:border-foreground transition-colors';
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AboutClient({ initial }: { initial: AboutContent }) {
  // Text state
  const [statement, setStatement] = useState(initial.statement);
  const [bio, setBio] = useState(initial.bio);
  const [textStatus, setTextStatus] = useState<{ ok?: boolean; msg: string }>({ msg: '' });

  // Portrait state
  const [portraitUrl, setPortraitUrl] = useState(initial.portrait_url);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const [portraitStatus, setPortraitStatus] = useState<{ ok?: boolean; msg: string }>({ msg: '' });
  const portraitRef = useRef<HTMLInputElement>(null);

  // Secondary image/text state
  const [secondaryImageUrl, setSecondaryImageUrl] = useState(initial.secondary_image_url);
  const [secondaryPreview, setSecondaryPreview] = useState<string | null>(null);
  const [secondaryText, setSecondaryText] = useState(initial.secondary_text);
  const [secondaryImgStatus, setSecondaryImgStatus] = useState<{ ok?: boolean; msg: string }>({ msg: '' });
  const [secondaryTextStatus, setSecondaryTextStatus] = useState<{ ok?: boolean; msg: string }>({ msg: '' });
  const secondaryRef = useRef<HTMLInputElement>(null);

  // Gallery state
  const [galleryImages, setGalleryImages] = useState<string[]>(initial.gallery_images);
  const [galleryStatus, setGalleryStatus] = useState<{ ok?: boolean; msg: string }>({ msg: '' });
  const galleryRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();

  // ── Handlers ──────────────────────────────────────────────

  async function handleSaveText(e: React.FormEvent) {
    e.preventDefault();
    setTextStatus({ msg: '' });
    const fd = new FormData();
    fd.set('statement', statement);
    fd.set('bio', bio);
    startTransition(async () => {
      const res = await saveAboutText(fd);
      setTextStatus({ ok: res.success, msg: res.success ? 'Saved.' : (res.error ?? 'Error') });
    });
  }

  function handleSecondaryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSecondaryPreview(URL.createObjectURL(file));
  }

  async function handleSecondaryUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = secondaryRef.current?.files?.[0];
    if (!file) { setSecondaryImgStatus({ msg: 'Select an image first.' }); return; }
    setSecondaryImgStatus({ msg: '' });
    const compressed = await compressImage(file).catch(() => file);
    const fd = new FormData();
    fd.set('image', compressed);
    startTransition(async () => {
      const res = await uploadAboutSecondaryImage(fd);
      if (res.success && res.url) {
        setSecondaryImageUrl(res.url);
        setSecondaryPreview(null);
        if (secondaryRef.current) secondaryRef.current.value = '';
      }
      setSecondaryImgStatus({ ok: res.success, msg: res.success ? 'Image updated.' : (res.error ?? 'Error') });
    });
  }

  async function handleSaveSecondaryText(e: React.FormEvent) {
    e.preventDefault();
    setSecondaryTextStatus({ msg: '' });
    const fd = new FormData();
    fd.set('secondary_text', secondaryText);
    startTransition(async () => {
      const res = await saveSecondaryText(fd);
      setSecondaryTextStatus({ ok: res.success, msg: res.success ? 'Saved.' : (res.error ?? 'Error') });
    });
  }

  function handlePortraitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPortraitPreview(URL.createObjectURL(file));
  }

  async function handlePortraitUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = portraitRef.current?.files?.[0];
    if (!file) { setPortraitStatus({ msg: 'Select an image first.' }); return; }
    setPortraitStatus({ msg: '' });

    const compressed = await compressImage(file).catch(() => file);
    const fd = new FormData();
    fd.set('portrait', compressed);

    startTransition(async () => {
      const res = await uploadAboutPortrait(fd);
      if (res.success && res.url) {
        setPortraitUrl(res.url);
        setPortraitPreview(null);
        if (portraitRef.current) portraitRef.current.value = '';
      }
      setPortraitStatus({ ok: res.success, msg: res.success ? 'Portrait updated.' : (res.error ?? 'Error') });
    });
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setGalleryStatus({ msg: '' });

    for (const file of files) {
      const compressed = await compressImage(file).catch(() => file);
      const fd = new FormData();
      fd.set('image', compressed);

      startTransition(async () => {
        const res = await uploadGalleryImage(fd);
        if (res.success && res.url) {
          setGalleryImages((prev) => [...prev, res.url!]);
        }
        if (!res.success) {
          setGalleryStatus({ ok: false, msg: res.error ?? 'Upload failed.' });
        }
      });
    }

    if (galleryRef.current) galleryRef.current.value = '';
  }

  async function handleRemoveGallery(url: string) {
    setGalleryStatus({ msg: '' });
    setGalleryImages((prev) => prev.filter((u) => u !== url));
    startTransition(async () => {
      const res = await removeGalleryImage(url);
      if (!res.success) {
        setGalleryImages((prev) => [...prev, url]); // revert
        setGalleryStatus({ ok: false, msg: res.error ?? 'Remove failed.' });
      }
    });
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-16 pb-24">

      {/* ── Portrait & Statement ── */}
      <section className="space-y-8 border-b border-muted pb-16">
        <SectionHeading>Portrait &amp; Statement</SectionHeading>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Portrait upload */}
          <div>
            <p className="text-base text-muted-foreground mb-3">Portrait image</p>
            {(portraitPreview ?? portraitUrl) && (
              <div className="relative aspect-3/4 w-48 mb-4 overflow-hidden rounded-sm">
                <Image
                  src={portraitPreview ?? portraitUrl}
                  alt="Portrait preview"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <form onSubmit={handlePortraitUpload} className="space-y-3">
              <input
                ref={portraitRef}
                type="file"
                accept="image/*"
                onChange={handlePortraitChange}
                className="text-base text-muted-foreground file:mr-3 file:border-0 file:bg-muted file:px-3 file:py-1 file:text-base file:cursor-pointer"
              />
              <div>
                <SaveButton pending={isPending} label="Upload portrait" />
              </div>
              <StatusMsg {...portraitStatus} />
            </form>
          </div>

          {/* Statement + Bio */}
          <form onSubmit={handleSaveText} className="space-y-4">
            <div>
              <label className="text-base text-muted-foreground block mb-1">Artist statement</label>
              <textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                rows={3}
                placeholder="Short artist statement shown prominently on the about page…"
                className={`${inputCls()} resize-none`}
              />
            </div>
            <div>
              <label className="text-base text-muted-foreground block mb-1">Biography</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={6}
                placeholder="Longer biography / artist&apos;s note…"
                className={`${inputCls()} resize-none`}
              />
            </div>
            <SaveButton pending={isPending} />
            <StatusMsg {...textStatus} />
          </form>
        </div>
      </section>

      {/* ── Secondary Image & Text ── */}
      <section className="space-y-8 border-b border-muted pb-16">
        <SectionHeading>Secondary Image &amp; Text</SectionHeading>
        <p className="text-base text-muted-foreground -mt-4">
          Shown as a second reversed block (text left, image right) below the gallery on the about page.
          Requires <code className="text-base bg-muted px-1 py-0.5 rounded">secondary_image_url</code> and{' '}
          <code className="text-base bg-muted px-1 py-0.5 rounded">secondary_text</code> columns in Supabase.
        </p>
        <div className="grid md:grid-cols-2 gap-10">
          {/* Secondary image upload */}
          <div>
            <p className="text-base text-muted-foreground mb-3">Secondary image</p>
            {(secondaryPreview ?? secondaryImageUrl) && (
              <div className="relative aspect-3/4 w-48 mb-4 overflow-hidden rounded-sm">
                <Image
                  src={secondaryPreview ?? secondaryImageUrl}
                  alt="Secondary image preview"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <form onSubmit={handleSecondaryUpload} className="space-y-3">
              <input
                ref={secondaryRef}
                type="file"
                accept="image/*"
                onChange={handleSecondaryChange}
                className="text-base text-muted-foreground file:mr-3 file:border-0 file:bg-muted file:px-3 file:py-1 file:text-base file:cursor-pointer"
              />
              <div>
                <SaveButton pending={isPending} label="Upload image" />
              </div>
              <StatusMsg {...secondaryImgStatus} />
            </form>
          </div>

          {/* Secondary text */}
          <form onSubmit={handleSaveSecondaryText} className="space-y-4">
            <div>
              <label className="text-base text-muted-foreground block mb-1">Secondary text</label>
              <textarea
                value={secondaryText}
                onChange={(e) => setSecondaryText(e.target.value)}
                rows={8}
                placeholder="Text shown alongside the secondary image…"
                className={`${inputCls()} resize-none`}
              />
            </div>
            <SaveButton pending={isPending} />
            <StatusMsg {...secondaryTextStatus} />
          </form>
        </div>
      </section>

      {/* ── Gallery Images ── */}
      <section className="space-y-8 pb-16">
        <SectionHeading>Gallery Images</SectionHeading>
        <p className="text-base text-muted-foreground -mt-4">Studio / exhibition images shown in the gallery grid on the about page. Compressed automatically.</p>

        {galleryImages.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {galleryImages.map((url) => (
              <div key={url} className="relative group aspect-square overflow-hidden rounded-sm">
                <Image src={url} alt="" fill className="object-cover" sizes="150px" />
                <button
                  type="button"
                  onClick={() => handleRemoveGallery(url)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-base cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="text-base text-muted-foreground block mb-2">Upload images (multiple allowed)</label>
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleGalleryUpload}
            disabled={isPending}
            className="text-base text-muted-foreground file:mr-3 file:border-0 file:bg-muted file:px-3 file:py-1 file:text-base file:cursor-pointer disabled:opacity-50"
          />
        </div>
        <StatusMsg {...galleryStatus} />
      </section>

    </div>
  );
}
