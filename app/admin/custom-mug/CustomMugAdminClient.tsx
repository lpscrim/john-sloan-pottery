'use client';

import { useActionState, useTransition, useRef, useState } from 'react';
import Image from 'next/image';
import Button from '@/app/_components/UI/Layout/Button';
import { compressImage } from '../compressImage';
import type { Glaze, MugShape } from '@/app/_lib/customMug';
import { ColourPicker } from '@/app/admin/ColourPicker';
import {
  addGlaze, toggleGlazeActive, deleteGlaze,
  addShape, toggleShapeActive, deleteShape, updateShapePrice,
  uploadGlazeTile, uploadMugExample, deleteMugExample,
} from './actions';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SaveButton({ pending, label = 'Add' }: { pending: boolean; label?: string }) {
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? 'Saving…' : label}
    </Button>
  );
}

function inputCls() {
  return 'w-full border border-muted bg-background px-3 py-2 text-base rounded-sm focus:outline-none focus:border-foreground transition-colors';
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base tracking-widest uppercase text-muted-foreground mb-6">{children}</h2>;
}

// ─── Glazes section ───────────────────────────────────────────────────────────

function GlazesSection({ glazes }: { glazes: Glaze[] }) {
  const [state, action, pending] = useActionState(addGlaze, {});
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [newColour, setNewColour] = useState('');

  return (
    <section className="space-y-6">
      <SectionHeading>Glazes</SectionHeading>

      {glazes.length > 0 && (
        <ul className="space-y-2">
          {glazes.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-4 border border-muted rounded-sm px-3 py-2 text-base">
              <span>{g.name}
                {(g as Glaze & { note?: string; active?: boolean }).note && (
                  <span className="text-muted-foreground ml-2">— {(g as Glaze & { note?: string }).note}</span>
                )}
                {(g as Glaze & { colour?: string }).colour && (
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-full ml-2 shrink-0 align-middle border border-black/10"
                    style={{ backgroundColor: (g as Glaze & { colour?: string }).colour }}
                  />
                )}
                <span className="text-muted-foreground text-base ml-1">({g.slug})</span>
              </span>
              <div className="flex gap-4">
                <button
                  onClick={() => startTransition(() => toggleGlazeActive(g.id, !(g as Glaze & { active?: boolean }).active))}
                  className="text-base text-muted-foreground hover:text-foreground transition-colors"
                >
                  {(g as Glaze & { active?: boolean }).active !== false ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${g.name}"?`)) startTransition(() => deleteGlaze(g.id)); }}
                  className="text-base text-destructive hover:opacity-70 transition-opacity"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={async (fd) => {
          await action(fd);
          formRef.current?.reset();
          setNewColour('');
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-base text-muted-foreground mb-1">Name <span className="text-muted-foreground/60">(shown to customer)</span></label>
            <input name="name" required placeholder="e.g. r1" className={inputCls()} />
          </div>
          <div>
            <label className="block text-base text-muted-foreground mb-1">Description <span className="text-muted-foreground/60">(sent to you on order)</span></label>
            <input name="note" placeholder="e.g. Rutile reduction" className={inputCls()} />
          </div>
          <div>
            <label className="block text-base text-muted-foreground mb-1">Colour <span className="text-muted-foreground/60">(filter circle)</span></label>
            <ColourPicker name="colour" value={newColour} onChange={setNewColour} />
          </div>
        </div>
        <SaveButton pending={pending} />
      </form>
      {state.error && <p className="text-base text-destructive">{state.error}</p>}
      <p className="text-base text-muted-foreground">Slug is auto-generated from the name. Upload tile images below.</p>
    </section>
  );
}

// ─── Types section ────────────────────────────────────────────────────────────

function TypesSection({ shapes }: { shapes: (MugShape & { active: boolean })[] }) {
  const [state, action, pending] = useActionState(addShape, {});
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  function handleSavePrice(id: string) {
    const pence = Math.round(parseFloat(editPrice) * 100);
    if (!Number.isFinite(pence) || pence <= 0) return;
    startTransition(() => updateShapePrice(id, pence));
    setEditingId(null);
  }

  return (
    <section className="space-y-6">
      <SectionHeading>Mug types</SectionHeading>

      {shapes.length > 0 && (
        <ul className="space-y-2">
          {shapes.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 border border-muted rounded-sm px-3 py-2 text-base">
              <span className="flex-1">
                {s.name}
                {s.description && <span className="text-muted-foreground ml-2">— {s.description}</span>}
              </span>

              {editingId === s.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">£</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-20 border border-muted bg-background px-2 py-1 text-base rounded-sm focus:outline-none focus:border-foreground"
                    autoFocus
                  />
                  <button onClick={() => handleSavePrice(s.id)} className="text-base hover:opacity-70">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-base text-muted-foreground hover:opacity-70">Cancel</button>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  £{((s.price_pence ?? 0) / 100).toFixed(2)}
                </span>
              )}

              <div className="flex gap-4">
                {editingId !== s.id && (
                  <button
                    onClick={() => { setEditingId(s.id); setEditPrice(((s.price_pence ?? 0) / 100).toFixed(2)); }}
                    className="text-base text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Edit price
                  </button>
                )}
                <button
                  onClick={() => startTransition(() => toggleShapeActive(s.id, !s.active))}
                  className="text-base text-muted-foreground hover:text-foreground transition-colors"
                >
                  {s.active !== false ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${s.name}"?`)) startTransition(() => deleteShape(s.id)); }}
                  className="text-base text-destructive hover:opacity-70 transition-opacity"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={async (fd) => {
          const file = fd.get('image') as File | null;
          if (file && file.size > 0) {
            const compressed = await compressImage(file).catch(() => file);
            fd.set('image', compressed);
          }
          await action(fd);
          formRef.current?.reset();
        }}
        className="space-y-3"
      >
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label className="block text-base text-muted-foreground mb-1">Type name</label>
            <input name="name" required placeholder="e.g. Classic" className={inputCls()} />
          </div>
          <div className="w-32">
            <label className="block text-base text-muted-foreground mb-1">Price (£)</label>
            <input name="price" type="number" step="0.01" min="0.01" required placeholder="35.00" className={inputCls()} />
          </div>
        </div>
        <div>
          <label className="block text-base text-muted-foreground mb-1">Description (optional)</label>
          <input name="description" placeholder="e.g. Classic straight-sided mug" className={inputCls()} />
        </div>
        <div>
          <label className="block text-base text-muted-foreground mb-1">Photo of mug (optional)</label>
          <input name="image" type="file" accept="image/*" className="text-base" />
        </div>
        <SaveButton pending={pending} />
      </form>
      {state.error && <p className="text-base text-destructive">{state.error}</p>}
    </section>
  );
}

// ─── Glaze tile upload ────────────────────────────────────────────────────────

function GlazeTileUpload({ glazes }: { glazes: Glaze[] }) {
  const [state, action, pending] = useActionState(uploadGlazeTile, {} as { error?: string; success?: string });
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section className="space-y-6">
      <SectionHeading>Glaze tile images</SectionHeading>
      <p className="text-base text-muted-foreground">
        Upload a photo of the test tile for each glaze combination. Files are stored as{' '}
        <code className="text-base bg-muted px-1 py-0.5 rounded">{'{slugA}-{slugB}.jpg'}</code> (alphabetical).
      </p>

      <form
        ref={formRef}
        action={async (fd) => {
          const file = fd.get('image') as File | null;
          if (file && file.size > 0) {
            const compressed = await compressImage(file).catch(() => file);
            fd.set('image', compressed);
          }
          await action(fd);
          formRef.current?.reset();
        }}
        className="space-y-3"
      >
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-base text-muted-foreground mb-1">Base glaze</label>
            <select name="slug1" required className={inputCls()}>
              <option value="">Select…</option>
              {glazes.map((g) => <option key={g.id} value={g.slug}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-base text-muted-foreground mb-1">Accent glaze</label>
            <select name="slug2" required className={inputCls()}>
              <option value="">Select…</option>
              {glazes.map((g) => <option key={g.id} value={g.slug}>{g.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-base text-muted-foreground mb-1">Tile photo</label>
          <input name="image" type="file" accept="image/*" required className="text-base" />
        </div>
        <SaveButton pending={pending} label="Upload" />
      </form>
      {state.error && <p className="text-base text-destructive">{state.error}</p>}
      {'success' in state && state.success && <p className="text-base text-green-700">{state.success as string}</p>}
    </section>
  );
}

// ─── Example photos ───────────────────────────────────────────────────────────

function ExamplesSection({ examples, supabaseUrl }: { examples: { name: string; id: string | null }[]; supabaseUrl: string }) {
  const [state, action, pending] = useActionState(uploadMugExample, {});
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section className="space-y-6">
      <SectionHeading>Example mug photos</SectionHeading>
      <p className="text-base text-muted-foreground">
        These appear in the gallery on the custom mug page.
      </p>

      {examples.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {examples.map((f) => (
            <div key={f.name} className="relative group">
              <div className="relative aspect-square bg-muted/20">
                <Image
                  src={`${supabaseUrl}/storage/v1/object/public/mug-examples/${f.name}`}
                  alt="Mug example"
                  fill
                  className="object-cover"
                />
              </div>
              <button
                onClick={() => { if (confirm('Remove this photo?')) startTransition(() => deleteMugExample(f.name)); }}
                className="absolute top-1 right-1 bg-background/80 text-destructive text-base px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        ref={formRef}
        action={async (fd) => {
          const file = fd.get('image') as File | null;
          if (file && file.size > 0) {
            const compressed = await compressImage(file).catch(() => file);
            fd.set('image', compressed);
          }
          await action(fd);
          formRef.current?.reset();
        }}
        className="flex gap-3 items-end"
      >
        <input name="image" type="file" accept="image/*" required className="text-base flex-1" />
        <SaveButton pending={pending} label="Upload" />
      </form>
      {state.error && <p className="text-base text-destructive">{state.error}</p>}
    </section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  glazes: (Glaze & { active: boolean })[];
  shapes: (MugShape & { active: boolean })[];
  examples: { name: string; id: string | null }[];
  supabaseUrl: string;
}

export default function CustomMugAdminClient({ glazes, shapes, examples, supabaseUrl }: Props) {
  return (
    <div className="space-y-16">
      <GlazesSection glazes={glazes} />
      <TypesSection shapes={shapes} />
      <GlazeTileUpload glazes={glazes} />
      <ExamplesSection examples={examples} supabaseUrl={supabaseUrl} />
    </div>
  );
}
