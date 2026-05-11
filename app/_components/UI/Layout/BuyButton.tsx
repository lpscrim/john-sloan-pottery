'use client';
import Button from './Button';
import { useCart } from '../../Cart/CartContext';
import { useRouter } from 'next/navigation';
import type { GlazeEntry } from '@/app/_data/projects';

interface BuyButtonProps {
  stripePriceId: string | null;
  stockLevel: number;
  /** Price in pence */
  priceHw: number;
  /** Product name (shown in cart) */
  name: string;
  /** Thumbnail URL (shown in cart) */
  imageUrl: string;
  /** If set and sold out, redirects to Build a Mug with this shape pre-selected */
  mugShapeSlug?: string;
  /** Glaze entries from the product — used to pre-select glazes in the configurator */
  glaze?: GlazeEntry[];
}

export function BuyButton({ stripePriceId, stockLevel, priceHw, name, imageUrl, mugShapeSlug, glaze }: BuyButtonProps) {
  const { addItem } = useCart();
  const router = useRouter();

  const outOfStock = stockLevel <= 0;
  const notAvailable = !stripePriceId;
  const canBuildMug = outOfStock && !!mugShapeSlug;

  const displayPrice = (priceHw / 100).toFixed(0);

  function handleClick() {
    if (canBuildMug) {
      const params = new URLSearchParams({ shape: mugShapeSlug! });
      const slugs = (glaze ?? []).map(g => g.slug).filter(Boolean) as string[];
      if (slugs[0]) params.set('g1', slugs[0]);
      if (slugs[1]) params.set('g2', slugs[1]);
      router.push(`/custom-mug?${params.toString()}`);
      return;
    }
    if (outOfStock || notAvailable) return;
    addItem({
      priceId: stripePriceId!,
      name,
      imageUrl,
      priceHw,
      stockLevel,
    });
  }

  return (
    <Button
      onClick={handleClick}
      disabled={!canBuildMug && (outOfStock || notAvailable)}
      size='lg'
    >
      <div className="relative inline-flex alttext">
        <span className={`transition-opacity duration-200 ${outOfStock && !canBuildMug ? 'opacity-100 text-red-600' : 'group-hover:opacity-0 opacity-100'}`}>
          {outOfStock
            ? canBuildMug ? 'Build' : 'Sold'
            : 'Buy'}
        </span>
        {!outOfStock && (
          <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 opacity-0 group-hover:opacity-100">
            £{displayPrice}
          </span>
        )}
      </div>
    </Button>
  );
}
