'use client';

import { useCart } from './CartContext';
import { ImageWithFallback } from '../UI/Layout/ImageWithFallback';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHECKOUT_STORAGE_KEY } from '@/app/checkout/CheckoutClient';

export function CartDrawer() {
  const { items, count, isOpen, closeCart, removeItem, updateQuantity, clearCart, shippingRate } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const subtotal = items.reduce((sum, i) => sum + i.priceHw * i.quantity, 0);
  const total = subtotal + shippingRate;

  async function handleCheckout() {
    if (items.length === 0 || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            priceId: i.priceId,
            quantity: i.quantity,
            ...(i.customMug ? { customMug: i.customMug } : {}),
          })),
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(data.error ?? 'Some items are no longer available');
        if (Array.isArray(data.outOfStock)) {
          for (const name of data.outOfStock) {
            const item = items.find((i) => i.name === name);
            if (item) removeItem(item.priceId);
          }
        }
      } else if (data.clientSecret) {
        sessionStorage.setItem(
          CHECKOUT_STORAGE_KEY,
          JSON.stringify({
            clientSecret: data.clientSecret,
            paymentIntentId: data.paymentIntentId,
            cancelToken: data.cancelToken,
            total: data.total,
            shippingRate: data.shippingRate,
            stripeAccount: data.stripeAccount ?? null,
          })
        );
        closeCart();
        router.push('/checkout');
      } else {
        setError(data.error ?? 'Checkout failed');
        console.error('Checkout error:', data.error);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-998 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCart}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-999 h-full w-full max-w-md bg-background border-l border-muted shadow-lg flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 ">
          <h2 className="text-lg font-semibold tracking-tight">CART [{count}]</h2>
          <button
            onClick={closeCart}
            className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors text-2xl leading-none"
            aria-label="Close cart"
          >
            &times;
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4">
          {items.length === 0 && (
            <p className="text-muted-foreground text-base">Your cart is empty.</p>
          )}

          {items.map((item) => (
            <div key={item.priceId} className="flex gap-4 items-start">
              {/* Thumbnail */}
              <div className="relative w-16 h-20 shrink-0 rounded-sm overflow-hidden bg-muted">
                <ImageWithFallback
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium truncate">{item.name}</p>
                <p className="text-base text-muted-foreground">
                  £{(item.priceHw / 100).toFixed(2)}
                </p>

                {/* Quantity */}
                {item.stockLevel > 1 && (
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => updateQuantity(item.priceId, item.quantity - 1)}
                    className="cursor-pointer text-muted-foreground hover:text-foreground text-base w-6 h-6 flex items-center justify-center border border-muted rounded-sm transition-colors"
                  >
                    −
                  </button>
                  <span className="text-base w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.priceId, item.quantity + 1)}
                    disabled={item.quantity >= item.stockLevel}
                    className="cursor-pointer text-muted-foreground hover:text-foreground text-base w-6 h-6 flex items-center justify-center border border-muted rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
               )}
               </div>

              {/* Line total + remove */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-base font-medium">
                  £{((item.priceHw * item.quantity) / 100).toFixed(2)}
                </span>
                <button
                  onClick={() => removeItem(item.priceId)}
                  className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  REMOVE
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-muted px-6 py-4 space-y-3">
            {error && (
              <p className="text-base text-red-500">{error}</p>
            )}
            <div className="flex items-center justify-between text-base">
              <span className="text-muted-foreground">SUBTOTAL</span>
              <span>£{(subtotal / 100).toFixed(2)}</span>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-base">
                <span className="text-muted-foreground">SHIPPING</span>
                <span>{shippingRate === 0 ? 'Free' : `£${(shippingRate / 100).toFixed(2)}`}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                EU &amp; international shipping may be more at checkout
              </p>
            </div>
            <div className="flex items-center justify-between text-base font-semibold border-t border-muted pt-2">
              <span>TOTAL</span>
              <span>£{(total / 100).toFixed(2)}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full cursor-pointer rounded-md bg-foreground px-4 py-2.5 text-base font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'PREPARING…' : 'CHECKOUT'}
            </button>

            <button
              onClick={clearCart}
              className="w-full cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              CLEAR CART
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
