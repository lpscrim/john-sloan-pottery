'use client';

import { useActionState, useTransition, useRef, useState } from 'react';
import Image from 'next/image';
import Button from '@/app/_components/UI/Layout/Button';
import type { Glaze, MugShape, MugSize } from '@/app/_lib/customMug';
import {
  addGlaze, toggleGlazeActive, deleteGlaze,
  addShape, toggleShapeActive, deleteShape,
  addSize, updateSizePrice, toggleSizeActive, deleteSize,
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

  return (
    <section className="space-y-6">
      <SectionHeading>Glazes</SectionHeading>

      {glazes.length > 0 && (
        <ul className="space-y-2">
          {glazes.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-4 border border-muted rounded-sm px-3 py-2 text-base">
              <span>{g.name} <span className="text-muted-foreground text-base">({g.slug})</span></span>
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
        }}
        className="flex gap-3 items-end"
      >
        <div className="flex-1">
          <label className="block text-base text-muted-foreground mb-1">Glaze name</label>
          <input name="name" required placeholder="e.g. Celadon" className={inputCls()} />
        </div>
        <SaveButton pending={pending} />
      </form>
      {state.error && <p className="text-base text-destructive">{state.error}</p>}
      <p className="text-base text-muted-foreground">Slug is auto-generated from the name. Upload tile images below.</p>
    </section>
  );
}

// ─── Shapes section ───────────────────────────────────────────────────────────

function ShapesSection({ shapes }: { shapes: MugShape[] }) {
  const [state, action, pending] = useActionState(addShape, {});
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section className="space-y-6">
      <SectionHeading>Mug shapes</SectionHeading>

      {shapes.length > 0 && (
        <ul className="space-y-2">
          {shapes.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 border border-muted rounded-sm px-3 py-2 text-base">
              <span>{s.name} <span className="text-muted-foreground text-base">({s.slug})</span></span>
              <div className="flex gap-4">
                <button
                  onClick={() => startTransition(() => toggleShapeActive(s.id, !(s as MugShape & { active?: boolean }).active))}
                  className="text-base text-muted-foreground hover:text-foreground transition-colors"
                >
                  {(s as MugShape & { active?: boolean }).active !== false ? 'Disable' : 'Enable'}
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
          await action(fd);
          formRef.current?.reset();
        }}
        className="space-y-3"
      >
        <div>
          <label className="block text-base text-muted-foreground mb-1">Shape name</label>
          <input name="name" required placeholder="e.g. Classic" className={inputCls()} />
        </div>
        <div>
          <label className="block text-base text-muted-foreground mb-1">Description (optional)</label>
          <input name="description" placeholder="e.g. Straight sides, generous handle" className={inputCls()} />
        </div>
        <div>
          <label className="block text-base text-muted-foreground mb-1">Photo of unfired mug</label>
          <input name="image" type="file" accept="image/*" className="text-base" />
        </div>
        <SaveButton pending={pending} />
      </form>
      {state.error && <p className="text-base text-destructive">{state.error}</p>}
    </section>
  );
}

// ─── Sizes section ────────────────────────────────────────────────────────────

function SizesSection({ sizes }: { sizes: MugSize[] }) {
  const [state, action, pending] = useActionState(addSize, {});
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  function handleSavePrice(id: string) {
    const pence = Math.round(parseFloat(editPrice) * 100);
    if (!Number.isFinite(pence) || pence <= 0) return;
    startTransition(() => updateSizePrice(id, pence));
    setEditingId(null);
  }

  return (
    <section className="space-y-6">
      <SectionHeading>Mug sizes & prices</SectionHeading>

      {sizes.length > 0 && (
        <ul className="space-y-2">
          {sizes.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 border border-muted rounded-sm px-3 py-2 text-base">
              <span className="flex-1">{s.name}</span>

              {editingId === s.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-base">£</span>
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
                  £{(s.price_pence / 100).toFixed(2)}
                </span>
              )}

              <div className="flex gap-4">
                {editingId !== s.id && (
                  <button
                    onClick={() => { setEditingId(s.id); setEditPrice((s.price_pence / 100).toFixed(2)); }}
                    className="text-base text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Edit price
                  </button>
                )}
                <button
                  onClick={() => startTransition(() => toggleSizeActive(s.id, !(s as MugSize & { active?: boolean }).active))}
                  className="text-base text-muted-foreground hover:text-foreground transition-colors"
                >
                  {(s as MugSize & { active?: boolean }).active !== false ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${s.name}"?`)) startTransition(() => deleteSize(s.id)); }}
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
        }}
        className="flex flex-wrap gap-3 items-end"
      >
        <div className="flex-1 min-w-32">
          <label className="block text-base text-muted-foreground mb-1">Size name</label>
          <input name="name" required placeholder="e.g. Medium" className={inputCls()} />
        </div>
        <div className="w-32">
          <label className="block text-base text-muted-foreground mb-1">Price (£)</label>
          <input name="price" type="number" step="0.01" min="0.01" required placeholder="35.00" className={inputCls()} />
        </div>
        <div className="w-24">
          <label className="block text-base text-muted-foreground mb-1">Sort order</label>
          <input name="sort_order" type="number" min="0" placeholder="0" className={inputCls()} />
        </div>
        <SaveButton pending={pending} />
      </form>
      {state.error && <p className="text-base text-destructive">{state.error}</p>}
    </section>
  );
}

// ─── Glaze tile upload ────────────────────────────────────────────────────────

function GlazeTileUpload({ glazes }: { glazes: Glaze[] }) {
  const [state, action, pending] = useActionState(uploadGlazeTile, {});
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
  sizes: (MugSize & { active: boolean })[];
  examples: { name: string; id: string | null }[];
  supabaseUrl: string;
}

export default function CustomMugAdminClient({ glazes, shapes, sizes, examples, supabaseUrl }: Props) {
  return (
    <div className="space-y-16">
      <GlazesSection glazes={glazes} />
      <ShapesSection shapes={shapes} />
      <SizesSection sizes={sizes} />
      <GlazeTileUpload glazes={glazes} />
      <ExamplesSection examples={examples} supabaseUrl={supabaseUrl} />
    </div>
  );
}
