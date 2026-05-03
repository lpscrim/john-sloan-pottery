'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/app/_components/Cart/CartContext';
import type { Glaze, MugShape, MugSize } from '@/app/_lib/customMug';

interface Props {
  glazes: Glaze[];
  shapes: MugShape[];
  sizes: MugSize[];
  examples: string[];
}

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

export default function CustomMugConfigurator({ glazes, shapes, sizes, examples }: Props) {
  const [glaze1, setGlaze1] = useState<Glaze | null>(null);
  const [glaze2, setGlaze2] = useState<Glaze | null>(null);
  const [glazeStep, setGlazeStep] = useState<1 | 2>(1);
  const [shape, setShape] = useState<MugShape | null>(null);
  const [size, setSize] = useState<MugSize | null>(null);

  const { addItem } = useCart();

  const handleGlazeClick = (glaze: Glaze) => {
    if (glazeStep === 1) {
      setGlaze1(glaze);
      setGlaze2(null);
      setGlazeStep(2);
    } else {
      if (glaze.id === glaze1?.id) return;
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
  const canAddToCart = glaze1 && glaze2 && shape && size;

  const handleAddToCart = () => {
    if (!glaze1 || !glaze2 || !shape || !size) return;
    addItem({
      priceId: `custom-mug-${crypto.randomUUID()}`,
      name: `Custom ${size.name} Mug`,
      imageUrl: currentTileUrl ?? '',
      priceHw: size.price_pence,
      stockLevel: 1,
      customMug: {
        sizeId: size.id,
        sizeName: size.name,
        glaze1Slug: glaze1.slug,
        glaze2Slug: glaze2.slug,
        glaze1Name: glaze1.name,
        glaze2Name: glaze2.name,
        shapeSlug: shape.slug,
        shapeName: shape.name,
      },
    });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-16 xl:gap-24">
      {/* ── Left: configuration steps ─────────────────────────── */}
      <div className="space-y-14">

        {/* Step 1: Glazes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl tracking-tight">
              {!glaze1
                ? 'Choose your base glaze'
                : !glaze2
                ? 'Now choose your accent glaze'
                : 'Glazes'}
            </h2>
            {glaze1 && (
              <button
                onClick={resetGlazes}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          {glaze1 && !glaze2 && (
            <p className="text-sm text-muted-foreground mb-4">
              Base: <span className="text-foreground">{glaze1.name}</span>
            </p>
          )}
          {glaze1 && glaze2 && (
            <p className="text-sm text-muted-foreground mb-4">
              <span className="text-foreground">{glaze1.name}</span>
              {' + '}
              <span className="text-foreground">{glaze2.name}</span>
            </p>
          )}
          {!glaze1 && <p className="text-sm text-muted-foreground mb-4">Select a base glaze first, then an accent.</p>}

          <div className="flex flex-wrap gap-2">
            {glazes.map((glaze) => {
              const isBase = glaze.id === glaze1?.id;
              const isAccent = glaze.id === glaze2?.id;
              const isDisabled = glazeStep === 2 && glaze.id === glaze1?.id;

              return (
                <button
                  key={glaze.id}
                  onClick={() => handleGlazeClick(glaze)}
                  disabled={isDisabled}
                  className={`px-4 py-2 text-sm border transition-all ${
                    isBase
                      ? 'border-foreground bg-foreground text-background'
                      : isAccent
                      ? 'border-foreground bg-foreground/15 text-foreground'
                      : isDisabled
                      ? 'border-foreground/10 text-foreground/30 cursor-not-allowed'
                      : 'border-foreground/20 hover:border-foreground/60'
                  }`}
                >
                  {glaze.name}
                  {isBase && <span className="ml-1.5 text-xs opacity-50">base</span>}
                  {isAccent && <span className="ml-1.5 text-xs opacity-50">accent</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Shape */}
        <div>
          <h2 className="text-xl tracking-tight mb-4">Choose your shape</h2>
          {shapes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shapes available yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {shapes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setShape(s)}
                  className={`text-left border transition-all overflow-hidden ${
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

        {/* Step 3: Size */}
        <div>
          <h2 className="text-xl tracking-tight mb-4">Choose your size</h2>
          {sizes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sizes available yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {sizes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSize(s)}
                  className={`px-6 py-3 border text-sm transition-all ${
                    size?.id === s.id
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-foreground/20 hover:border-foreground/60'
                  }`}
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-2 opacity-60">{formatPrice(s.price_pence)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: live preview ────────────────────────────────── */}
      <div className="space-y-8 lg:sticky lg:top-24 lg:self-start">

        {/* Glaze tile preview */}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Glaze combination
          </p>
          <div className="relative aspect-square bg-muted/20 w-full max-w-sm">
            {currentTileUrl ? (
              <Image
                key={currentTileUrl}
                src={currentTileUrl}
                alt={`${glaze1?.name} + ${glaze2?.name} glaze tile`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center px-6">
                <p className="text-sm text-muted-foreground text-center">
                  {!glaze1
                    ? 'Select a base glaze to preview the combination'
                    : 'Select an accent glaze'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Shape preview */}
        {shape && (
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Shape</p>
            <div className="relative aspect-square bg-muted/20 w-full max-w-sm">
              <Image
                src={shapeUrl(shape.slug)}
                alt={shape.name}
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}

        {/* Order summary + add to cart */}
        <div className="space-y-4 max-w-sm">
          {canAddToCart && (
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>
                <span className="text-foreground">{glaze1!.name}</span>
                {' (base) + '}
                <span className="text-foreground">{glaze2!.name}</span>
                {' (accent)'}
              </p>
              <p>Shape: <span className="text-foreground">{shape!.name}</span></p>
              <p className="text-lg text-foreground font-medium pt-1">
                {formatPrice(size!.price_pence)}
              </p>
            </div>
          )}

          <button
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className={`w-full px-8 py-4 text-sm tracking-widest uppercase transition-all ${
              canAddToCart
                ? 'bg-foreground text-background hover:opacity-80 cursor-pointer'
                : 'bg-foreground/10 text-foreground/30 cursor-not-allowed'
            }`}
          >
            {canAddToCart ? 'Add to basket' : 'Select glazes, shape & size'}
          </button>

          {canAddToCart && (
            <p className="text-xs text-muted-foreground">
              Made to order — allow 2–4 weeks for delivery.
            </p>
          )}
        </div>

        {/* Examples gallery */}
        {examples.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Examples</p>
            <div className="grid grid-cols-3 gap-2 max-w-sm">
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
    </div>
  );
}
