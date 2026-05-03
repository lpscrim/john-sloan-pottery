'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/app/_components/Cart/CartContext';
import type { Glaze, MugShape } from '@/app/_lib/customMug';

interface Props {
  glazes: Glaze[];
  shapes: MugShape[];
  examples: string[];
}

function tileUrl(slug1: string, slug2: string) {
  const [a, b] = [slug1, slug2].sort();
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/glaze-tiles/${a}-${b}.jpg`;
}

function glazeSwatchUrl(slug: string) {
  return tileUrl(slug, slug);
}

function shapeUrl(slug: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/mug-shapes/${slug}.jpg`;
}

function formatPrice(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

export default function CustomMugConfigurator({ glazes, shapes, examples }: Props) {
  const [glaze1, setGlaze1] = useState<Glaze | null>(null);
  const [glaze2, setGlaze2] = useState<Glaze | null>(null);
  const [glazeStep, setGlazeStep] = useState<1 | 2>(1);
  const [shape, setShape] = useState<MugShape | null>(null);

  const { addItem } = useCart();

  const handleGlazeClick = (glaze: Glaze) => {
    if (glazeStep === 1) {
      setGlaze1(glaze);
      setGlaze2(null);
      setGlazeStep(2);
    } else {
      // Same glaze allowed — single colour
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

          <p className="text-sm text-muted-foreground mb-5">
            {!glaze1
              ? 'Select a base glaze. You can choose the same glaze twice for a single colour.'
              : !glaze2
              ? `Base: ${glaze1.name}. Now pick your accent — or click the same glaze for a single colour.`
              : glaze1.id === glaze2.id
              ? `${glaze1.name} — single colour`
              : `${glaze1.name} (base) + ${glaze2.name} (accent)`
            }
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {glazes.map((glaze) => {
              const isBase = glaze.id === glaze1?.id;
              const isAccent = glaze.id === glaze2?.id;
              const isSingle = isBase && isAccent;

              return (
                <button
                  key={glaze.id}
                  onClick={() => handleGlazeClick(glaze)}
                  className={`text-left border transition-all overflow-hidden ${
                    isSingle
                      ? 'border-foreground ring-2 ring-foreground/20'
                      : isBase || isAccent
                      ? 'border-foreground'
                      : 'border-foreground/15 hover:border-foreground/40'
                  }`}
                >
                  <div className="relative aspect-square bg-muted/30">
                    <img
                      src={glazeSwatchUrl(glaze.slug)}
                      alt={glaze.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium leading-tight">{glaze.name}</p>
                    {isSingle && <p className="text-xs text-muted-foreground">single</p>}
                    {isBase && !isSingle && <p className="text-xs text-muted-foreground">base</p>}
                    {isAccent && !isSingle && <p className="text-xs text-muted-foreground">accent</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Type */}
        <div>
          <h2 className="text-xl tracking-tight mb-4">Choose your type</h2>
          {shapes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No types available yet.</p>
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
                {glaze1!.id === glaze2!.id
                  ? ' — single colour'
                  : <>{' (base) + '}<span className="text-foreground">{glaze2!.name}</span>{' (accent)'}</>
                }
              </p>
              <p>Shape: <span className="text-foreground">{shape!.name}</span></p>
              <p className="text-lg text-foreground font-medium pt-1">
                {formatPrice(shape!.price_pence)}
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
            {canAddToCart ? 'Add to basket' : 'Select glazes & type'}
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
