'use client';

import { useState, useTransition, useRef } from 'react';
import Image from 'next/image';
import type { AboutContent, Exhibition, EducationItem, Award, PressItem } from '@/app/_lib/aboutContent';
import { saveAboutText, saveAboutCV, uploadAboutPortrait, uploadGalleryImage, removeGalleryImage } from './actions';
import { compressImage } from '../compressImage';

// ── Small helpers ──────────────────────────────────────────────────────────

function SaveButton({ pending, label = 'Save' }: { pending: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="cursor-crosshair text-sm transition-all duration-250 group disabled:opacity-50"
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
    <p className={`text-sm mt-2 ${ok ? 'text-green-700' : 'text-destructive'}`}>{msg}</p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs tracking-widest uppercase text-muted-foreground mb-6">{children}</h2>;
}

function inputCls() {
  return 'w-full border border-muted bg-background px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-foreground transition-colors';
}

// ── CV list editors ────────────────────────────────────────────────────────

function ExhibitionList({
  items,
  onChange,
}: {
  items: Exhibition[];
  onChange: (items: Exhibition[]) => void;
}) {
  function add() {
    onChange([...items, { year: '', title: '', location: '', type: 'solo' }]);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function update(i: number, field: keyof Exhibition, value: string) {
    onChange(items.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }

  return (
    <div className="space-y-3">
      {items.map((ex, i) => (
        <div key={i} className="grid grid-cols-[5rem_1fr_1fr_6rem_2rem] gap-2 items-center">
          <input className={inputCls()} placeholder="Year" value={ex.year} onChange={(e) => update(i, 'year', e.target.value)} />
          <input className={inputCls()} placeholder="Title" value={ex.title} onChange={(e) => update(i, 'title', e.target.value)} />
          <input className={inputCls()} placeholder="Location" value={ex.location} onChange={(e) => update(i, 'location', e.target.value)} />
          <select className={inputCls()} value={ex.type} onChange={(e) => update(i, 'type', e.target.value as 'solo' | 'group')}>
            <option value="solo">Solo</option>
            <option value="group">Group</option>
          </select>
          <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive text-lg leading-none cursor-crosshair">×</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm text-muted-foreground underline underline-offset-2 cursor-crosshair">+ Add exhibition</button>
    </div>
  );
}

function EducationList({
  items,
  onChange,
}: {
  items: EducationItem[];
  onChange: (items: EducationItem[]) => void;
}) {
  function add() {
    onChange([...items, { year: '', qualification: '', institution: '' }]);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function update(i: number, field: keyof EducationItem, value: string) {
    onChange(items.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }

  return (
    <div className="space-y-3">
      {items.map((ed, i) => (
        <div key={i} className="grid grid-cols-[5rem_1fr_1fr_2rem] gap-2 items-center">
          <input className={inputCls()} placeholder="Year" value={ed.year} onChange={(e) => update(i, 'year', e.target.value)} />
          <input className={inputCls()} placeholder="Qualification" value={ed.qualification} onChange={(e) => update(i, 'qualification', e.target.value)} />
          <input className={inputCls()} placeholder="Institution" value={ed.institution} onChange={(e) => update(i, 'institution', e.target.value)} />
          <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive text-lg leading-none cursor-crosshair">×</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm text-muted-foreground underline underline-offset-2 cursor-crosshair">+ Add education</button>
    </div>
  );
}

function AwardList({
  items,
  onChange,
}: {
  items: Award[];
  onChange: (items: Award[]) => void;
}) {
  function add() {
    onChange([...items, { year: '', title: '' }]);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function update(i: number, field: keyof Award, value: string) {
    onChange(items.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }

  return (
    <div className="space-y-3">
      {items.map((aw, i) => (
        <div key={i} className="grid grid-cols-[5rem_1fr_2rem] gap-2 items-center">
          <input className={inputCls()} placeholder="Year" value={aw.year} onChange={(e) => update(i, 'year', e.target.value)} />
          <input className={inputCls()} placeholder="Title / Award name" value={aw.title} onChange={(e) => update(i, 'title', e.target.value)} />
          <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive text-lg leading-none cursor-crosshair">×</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm text-muted-foreground underline underline-offset-2 cursor-crosshair">+ Add award</button>
    </div>
  );
}

function PressList({
  items,
  onChange,
}: {
  items: PressItem[];
  onChange: (items: PressItem[]) => void;
}) {
  function add() {
    onChange([...items, { year: '', title: '', publication: '', url: '' }]);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function update(i: number, field: keyof PressItem, value: string) {
    onChange(items.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  }

  return (
    <div className="space-y-3">
      {items.map((pr, i) => (
        <div key={i} className="grid grid-cols-[5rem_1fr_1fr_1fr_2rem] gap-2 items-center">
          <input className={inputCls()} placeholder="Year" value={pr.year} onChange={(e) => update(i, 'year', e.target.value)} />
          <input className={inputCls()} placeholder="Article title" value={pr.title} onChange={(e) => update(i, 'title', e.target.value)} />
          <input className={inputCls()} placeholder="Publication" value={pr.publication} onChange={(e) => update(i, 'publication', e.target.value)} />
          <input className={inputCls()} placeholder="URL (optional)" value={pr.url ?? ''} onChange={(e) => update(i, 'url', e.target.value)} />
          <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive text-lg leading-none cursor-crosshair">×</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm text-muted-foreground underline underline-offset-2 cursor-crosshair">+ Add press item</button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AboutClient({ initial }: { initial: AboutContent }) {
  // Text state
  const [statement, setStatement] = useState(initial.statement);
  const [bio, setBio] = useState(initial.bio);
  const [textStatus, setTextStatus] = useState<{ ok?: boolean; msg: string }>({ msg: '' });

  // CV state
  const [exhibitions, setExhibitions] = useState<Exhibition[]>(initial.exhibitions);
  const [education, setEducation] = useState<EducationItem[]>(initial.education);
  const [awards, setAwards] = useState<Award[]>(initial.awards);
  const [press, setPress] = useState<PressItem[]>(initial.press);
  const [cvStatus, setCvStatus] = useState<{ ok?: boolean; msg: string }>({ msg: '' });

  // Portrait state
  const [portraitUrl, setPortraitUrl] = useState(initial.portrait_url);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const [portraitStatus, setPortraitStatus] = useState<{ ok?: boolean; msg: string }>({ msg: '' });
  const portraitRef = useRef<HTMLInputElement>(null);

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

  async function handleSaveCv(e: React.FormEvent) {
    e.preventDefault();
    setCvStatus({ msg: '' });
    const fd = new FormData();
    fd.set('exhibitions', JSON.stringify(exhibitions));
    fd.set('education', JSON.stringify(education));
    fd.set('awards', JSON.stringify(awards));
    fd.set('press', JSON.stringify(press));
    startTransition(async () => {
      const res = await saveAboutCV(fd);
      setCvStatus({ ok: res.success, msg: res.success ? 'Saved.' : (res.error ?? 'Error') });
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
            <p className="text-sm text-muted-foreground mb-3">Portrait image</p>
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
                className="text-sm text-muted-foreground file:mr-3 file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:cursor-crosshair"
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
              <label className="text-sm text-muted-foreground block mb-1">Artist statement</label>
              <textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                rows={3}
                placeholder="Short artist statement shown prominently on the about page…"
                className={`${inputCls()} resize-none`}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Biography</label>
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

      {/* ── Gallery Images ── */}
      <section className="space-y-8 border-b border-muted pb-16">
        <SectionHeading>Gallery Images</SectionHeading>
        <p className="text-sm text-muted-foreground -mt-4">Studio / exhibition images shown in the gallery grid on the about page. Compressed automatically.</p>

        {galleryImages.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {galleryImages.map((url) => (
              <div key={url} className="relative group aspect-square overflow-hidden rounded-sm">
                <Image src={url} alt="" fill className="object-cover" sizes="150px" />
                <button
                  type="button"
                  onClick={() => handleRemoveGallery(url)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs cursor-crosshair"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="text-sm text-muted-foreground block mb-2">Upload images (multiple allowed)</label>
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleGalleryUpload}
            disabled={isPending}
            className="text-sm text-muted-foreground file:mr-3 file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:cursor-crosshair disabled:opacity-50"
          />
        </div>
        <StatusMsg {...galleryStatus} />
      </section>

      {/* ── CV ── */}
      <form onSubmit={handleSaveCv} className="space-y-12">
        <div className="flex items-center justify-between">
          <SectionHeading>CV</SectionHeading>
          <div className="flex items-center gap-4">
            <SaveButton pending={isPending} label="Save CV" />
          </div>
        </div>
        <StatusMsg {...cvStatus} />

        <div className="space-y-4">
          <p className="text-sm font-medium">Exhibitions</p>
          <ExhibitionList items={exhibitions} onChange={setExhibitions} />
        </div>

        <div className="space-y-4 border-t border-muted pt-8">
          <p className="text-sm font-medium">Education</p>
          <EducationList items={education} onChange={setEducation} />
        </div>

        <div className="space-y-4 border-t border-muted pt-8">
          <p className="text-sm font-medium">Awards &amp; Recognition</p>
          <AwardList items={awards} onChange={setAwards} />
        </div>

        <div className="space-y-4 border-t border-muted pt-8">
          <p className="text-sm font-medium">Press &amp; Publications</p>
          <PressList items={press} onChange={setPress} />
        </div>

        <div className="border-t border-muted pt-8">
          <SaveButton pending={isPending} label="Save CV" />
          <StatusMsg {...cvStatus} />
        </div>
      </form>

    </div>
  );
}
