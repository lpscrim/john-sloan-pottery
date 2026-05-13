'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/app/_components/Cart/CartContext';
import type { Glaze, MugShape } from '@/app/_lib/customMug';
import Button from '@/app/_components/UI/Layout/Button';

interface Props {
  glazes: Glaze[];
  shapes: MugShape[];
  examples: string[];
}

type TileCombo = { g1: Glaze; g2: Glaze; url: string; key: string };

function tileUrl(slug1: string, slug2: string) {
  const [a, b] = [slug1, slug2].sort();
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/glaze-tiles/${a}-${b}.jpg`;
}

function shapeUrl(slug: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/mug-shapes/${slug}.jpg`;
}

function formatPrice(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

export default function CustomMugConfigurator({ glazes, shapes, examples }: Props) {
  const searchParams = useSearchParams();
  const [glaze1, setGlaze1] = useState<Glaze | null>(null);
  const [glaze2, setGlaze2] = useState<Glaze | null>(null);
  const [glazeStep, setGlazeStep] = useState<1 | 2>(1);
  const [shape, setShape] = useState<MugShape | null>(null);
  const [colourFilters, setColourFilters] = useState<string[]>([]);

  // Pre-select from URL params (e.g. ?shape=bowl&g1=r1&g2=b2)
  useEffect(() => {
    const shapeSlug = searchParams.get('shape');
    const g1Slug = searchParams.get('g1');
    const g2Slug = searchParams.get('g2');
    if (shapeSlug) {
      const found = shapes.find(s => s.slug === shapeSlug);
      if (found) setShape(found);
    }
    if (g1Slug) {
      const found = glazes.find(g => g.slug === g1Slug);
      if (found) { setGlaze1(found); setGlazeStep(2); }
    }
    if (g2Slug) {
      const found = glazes.find(g => g.slug === g2Slug);
      if (found) { setGlaze2(found); setGlazeStep(1); }
    }
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allColours = useMemo(() => {
    const seen = new Set<string>();
    glazes.forEach(g => { if (g.colour) seen.add(g.colour); });
    return [...seen].sort();
  }, [glazes]);

  const toggleColour = (c: string) =>
    setColourFilters(prev =>
      prev.includes(c)
        ? prev.filter(x => x !== c)
        : prev.length < 2 ? [...prev, c] : [prev[1], c]
    );

  const visibleGlazes = useMemo(
    () => colourFilters.length > 0 ? glazes.filter(g => g.colour && colourFilters.includes(g.colour)) : glazes,
    [glazes, colourFilters]
  );

  const { addItem } = useCart();

  // All combinations including same-glaze (single colour)
  const tileCombos = useMemo((): TileCombo[] => {
    const out: TileCombo[] = [];
    for (let i = 0; i < glazes.length; i++) {
      for (let j = i; j < glazes.length; j++) {
        const g1 = glazes[i], g2 = glazes[j];
        out.push({
          g1, g2,
          url: tileUrl(g1.slug, g2.slug),
          key: [g1.id, g2.id].sort().join('|'),
        });
      }
    }
    return out;
  }, [glazes]);

  // Filtered tile combos — a combo is visible if both glazes pass the colour filter
  const visibleTileCombos = useMemo(() => {
    if (colourFilters.length === 0) return tileCombos;
    return tileCombos.filter(
      c => visibleGlazes.some(g => g.id === c.g1.id) && visibleGlazes.some(g => g.id === c.g2.id)
    );
  }, [tileCombos, colourFilters, visibleGlazes]);

  const selectedKey = glaze1 && glaze2
    ? [glaze1.id, glaze2.id].sort().join('|')
    : null;

  const handleTileSelect = (combo: TileCombo) => {
    setGlaze1(combo.g1);
    setGlaze2(combo.g2);
    setGlazeStep(1);
  };

  const handleGlazeClick = (glaze: Glaze) => {
    if (glazeStep === 1) {
      setGlaze1(glaze);
      setGlaze2(null);
      setGlazeStep(2);
    } else {
      setGlaze2(glaze);
      setGlazeStep(1);
    }
  };

  const resetGlazes = () => {
    setGlaze1(null);
    setGlaze2(null);
    setGlazeStep(1);
  };

  const currentTileUrl = glaze1 && glaze2 ? tileUrl(glaze1.slug, glaze2.slug) : null;
  const canAddToCart = glaze1 && glaze2 && shape;

  const handleAddToCart = () => {
    if (!glaze1 || !glaze2 || !shape) return;
    addItem({
      priceId: `custom-mug-${crypto.randomUUID()}`,
      name: `Custom ${shape.name} Mug`,
      imageUrl: currentTileUrl ?? '',
      priceHw: shape.price_pence,
      stockLevel: 1,
      customMug: {
        shapeId: shape.id,
        glaze1Slug: glaze1.slug,
        glaze2Slug: glaze2.slug,
        glaze1Name: glaze1.name,
        glaze2Name: glaze2.name,
        glaze1Note: glaze1.note,
        glaze2Note: glaze2.note,
        shapeSlug: shape.slug,
        shapeName: shape.name,
      },
    });
  };

  return (
    <div className="space-y-16">

      {/* ── Step 1: Choose glaze ─────────────────────────────────── */}
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Step 1</p>
          <h2 className="text-2xl tracking-tight">Choose your glaze</h2>
        </div>

        {/* Colour filter circles + reset */}
        <div className="flex items-center justify-between gap-4">
          {allColours.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => setColourFilters([])}
                className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer text-xs font-medium ${
                  colourFilters.length === 0
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-foreground/30 text-foreground/60 hover:border-foreground/60'
                }`}
              >
                All
              </button>
              {allColours.map(c => (
                <button
                  key={c}
                  onClick={() => toggleColour(c)}
                  title={c}
                  className={`w-8 h-8 rounded-lg border-2 transition-all cursor-pointer ${
                    colourFilters.includes(c)
                      ? 'border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background'
                      : 'border-transparent hover:border-foreground/40'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
          {(glaze1 || glaze2) && (
            <Button size="sm" onClick={resetGlazes}>Reset</Button>
          )}
        </div>

        {/* Tile grid */}
        <div className="grid auto-rows-[6rem] md:auto-rows-[8rem] grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] md:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] grid-flow-dense gap-1.5 min-h-[80svh]">
          {visibleTileCombos.map((combo) => {
            const isSelected = combo.key === selectedKey;
            const label = combo.g1.id === combo.g2.id
              ? `${combo.g1.name} — single`
              : `${combo.g1.name} + ${combo.g2.name}`;

            return (
              <button
                key={combo.key}
                title={label}
                onClick={() => handleTileSelect(combo)}
                className={`relative overflow-hidden border rounded-md transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'col-span-4 row-span-4 border-foreground'
                    : 'col-span-1 row-span-1 border-foreground/10 hover:border-foreground/40'
                }`}
              >
                <Image
                  src={combo.url}
                  alt={label}
                  fill
                  className="object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                />
                {isSelected && (
                  <div className="absolute inset-x-0 bottom-0 bg-background/85 backdrop-blur-sm px-2 py-1.5">
                    <p className="text-xs font-medium leading-tight">{label}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Glaze name buttons */}
        <div className="flex flex-wrap gap-2">
          {visibleGlazes.map((glaze) => {
            const isBase = glaze.id === glaze1?.id;
            const isAccent = glaze.id === glaze2?.id;
            const isSingle = isBase && isAccent;
            const isDisabled = glazeStep === 2 && glaze.id === glaze1?.id && !!glaze2;

            return (
              <button
                key={glaze.id}
                onClick={() => handleGlazeClick(glaze)}
                disabled={isDisabled}
                className={`px-3 py-1 text-xs border transition-all cursor-pointer ${
                  isSingle
                    ? 'border-foreground bg-foreground text-background'
                    : isBase
                    ? 'border-foreground bg-foreground text-background'
                    : isAccent
                    ? 'border-foreground bg-foreground/15 text-foreground'
                    : isDisabled
                    ? 'border-foreground/10 text-foreground/30 cursor-not-allowed!'
                    : 'border-foreground/20 hover:border-foreground/60'
                }`}
              >
                {glaze.name}
                {isSingle && <span className="ml-1.5 text-xs opacity-50">single</span>}
                {isBase && !isSingle && <span className="ml-1.5 text-xs opacity-50">base</span>}
                {isAccent && !isSingle && <span className="ml-1.5 text-xs opacity-50">accent</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step 2: Choose style + confirm ──────────────────────── */}
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Step 2</p>
          <h2 className="text-2xl tracking-tight">Choose your style</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">

          {/* Style selector */}
          <div>
            {shapes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No styles available yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {shapes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setShape(s)}
                  className={`text-left border transition-all overflow-hidden cursor-pointer ${
                    shape?.id === s.id
                      ? 'border-foreground'
                      : 'border-foreground/20 hover:border-foreground/50'
                  }`}
                >
                  <div className="relative aspect-square bg-muted/20">
                    <Image
                      src={shapeUrl(s.slug)}
                      alt={s.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-sm font-medium mt-0.5">{formatPrice(s.price_pence)}</p>
                    {s.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {s.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          </div>

          {/* Confirm / add to cart */}
        <div className="space-y-4">
          {canAddToCart && (
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>
                <span className="text-foreground">{glaze1!.name}</span>
                {glaze1!.id === glaze2!.id
                  ? ' — single colour'
                  : <>{' (base) + '}<span className="text-foreground">{glaze2!.name}</span>{' (accent)'}</>
                }
              </p>
              <p>Type: <span className="text-foreground">{shape!.name}</span></p>
              <p className="text-lg text-foreground font-medium pt-1">
                {formatPrice(shape!.price_pence)}
              </p>
            </div>
          )}

          <Button
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            size="base"
          >
            {canAddToCart ? 'Add to basket' : 'Select glazes & type'}
          </Button>

          {canAddToCart && (
            <p className="text-xs text-muted-foreground">
              Made to order — allow 2–4 weeks for delivery.
            </p>
          )}
        </div>
      </div>
      </div>

      {/* ── Examples gallery ─────────────────────────────────────── */}
      {examples.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Examples</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {examples.map((url, i) => (
              <div key={i} className="relative aspect-square bg-muted/20">
                <Image
                  src={url}
                  alt={`Finished mug example ${i + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
