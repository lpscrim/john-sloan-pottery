'use client';
import Button from './Button';
import { useCart } from '../../Cart/CartContext';

interface BuyButtonProps {
  stripePriceId: string | null;
  stockLevel: number;
  /** Price in pence */
  priceHw: number;
  /** Product name (shown in cart) */
  name: string;
  /** Thumbnail URL (shown in cart) */
  imageUrl: string;
}

export function BuyButton({ stripePriceId, stockLevel, priceHw, name, imageUrl }: BuyButtonProps) {
  const { addItem } = useCart();

  const outOfStock = stockLevel <= 0;
  const notAvailable = !stripePriceId;

  const displayPrice = (priceHw / 100).toFixed(0);

  function handleClick() {
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
      disabled={outOfStock || notAvailable}
      size='lg'
    >
      <div className="relative inline-flex alttext">
        <span className={`transition-opacity duration-200 ${outOfStock ? 'opacity-100 text-red-600' : 'group-hover:opacity-0 opacity-100'}`}>
          {outOfStock
            ? 'Sold'
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
