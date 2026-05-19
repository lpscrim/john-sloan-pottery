'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  Elements,
  PaymentElement,
  AddressElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useCart } from '@/app/_components/Cart/CartContext';
import { ImageWithFallback } from '@/app/_components/UI/Layout/ImageWithFallback';

// ── Stripe singleton (never changes) ─────────────────────────────
// Loaded here to avoid re-creating on every render. stripeAccount is set
// dynamically inside the component based on sessionStorage data.
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

export const CHECKOUT_STORAGE_KEY = 'checkout_pi';

export interface CheckoutPiData {
  clientSecret: string;
  paymentIntentId: string;
  cancelToken: string;
  stripeAccount?: string | null;
}

// ── Inner form rendered inside <Elements> ─────────────────────────
function CheckoutForm({
  total,
  shippingRate,
  allowedCountries,
  paymentIntentId,
  cancelToken,
  onBack,
}: {
  total: number;
  shippingRate: number;
  allowedCountries: string[];
  paymentIntentId: string;
  cancelToken: string;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [shippingOverride, setShippingOverride] = useState<number | null>(null);
  const lastCountryRef = useRef<string | null>(null);
  const shippingValueRef = useRef<{ name: string; phone?: string; address: { line1: string; line2?: string; city: string; state: string; postal_code: string; country: string } } | null>(null);

  const displayShipping = shippingOverride ?? shippingRate;
  const subtotal = total - shippingRate;
  const displayTotal = subtotal + displayShipping;

  async function handleCountryChange(country: string) {
    if (!country || country === lastCountryRef.current) return;
    lastCountryRef.current = country;
    try {
      const res = await fetch('/api/payment-intent/update-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId, cancelToken, country }),
      });
      if (res.ok) {
        const data = await res.json();
        setShippingOverride(data.shippingRate);
      }
    } catch {
      // non-critical — payment will still go through at UK rate
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErrorMsg(null);

    const origin = window.location.origin;
    const billingDetails: Record<string, unknown> = { email: email.trim() || undefined };

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${origin}/purchase/success`,
        payment_method_data: { billing_details: billingDetails },
      },
    });

    // confirmPayment redirects on success — if we reach here, it failed
    if (error) {
      setErrorMsg(error.message ?? 'Payment failed. Please try again.');
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          Email
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="w-full border border-foreground/20 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
        />
      </div>

      {(
        // Standard shipping: collect shipping address
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Shipping address
          </p>
          <AddressElement
            onChange={(e) => {
              shippingValueRef.current = e.value as typeof shippingValueRef.current;
              handleCountryChange(e.value.address?.country ?? '');
            }}
            options={{
              mode: 'shipping',
              allowedCountries: allowedCountries ?? ['GB'],
              fields: { phone: 'always' },
              // Pre-fill country for UK-only so the form loads immediately in UK
              // format. For EU/International leave blank so the country selector
              // appears and the customer must choose their country explicitly.
              ...(allowedCountries && allowedCountries.length === 1
                ? { defaultValues: { address: { country: allowedCountries[0] } } }
                : {}),
            }}
          />
        </div>
      )}

      {/* Own billing-address toggle — all billing suppressed in PaymentElement
          so Stripe won't show its own 'same as shipping' checkbox alongside ours */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          Billing address
        </p>
        <AddressElement options={{ mode: 'billing', fields: { phone: 'never' } }} />
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
          Payment
        </p>
        {/* All billing suppressed — we handle it ourselves above.
            'never' for every field prevents Stripe rendering its own
            'billing same as shipping' toggle next to our checkbox. */}
        <PaymentElement
          options={{
            fields: {
              billingDetails: { email: 'never', name: 'never', phone: 'never', address: 'never' },
            },
          }}
        />
      </div>

      {errorMsg && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}

      <div className="border-t border-foreground/10 pt-4 space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>£{(subtotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Shipping</span>
          <span>{displayShipping === 0 ? 'Free' : `£${(displayShipping / 100).toFixed(2)}`}</span>
        </div>
        <div className="flex justify-between font-semibold pt-1">
          <span>Total</span>
          <span>£{(displayTotal / 100).toFixed(2)}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={!stripe || !elements || submitting}
          className="cursor-pointer group flex-1 border border-foreground py-3 px-6 text-sm tracking-widest uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="inline-block transition-transform group-hover:scale-105">
            {submitting ? 'Processing...' : `[ Pay £${(displayTotal / 100).toFixed(2)} ]`}
          </span>
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="cursor-pointer border border-foreground/30 py-3 px-6 text-sm tracking-widest uppercase text-muted-foreground hover:border-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          [ Back ]
        </button>
      </div>
    </form>
  );
}

// ── sessionStorage external store ─────────────────────────────────
// Reading the PI data via useSyncExternalStore lets us derive everything
// during render — no useEffect + setState dance, so React can never warn
// about cascading renders.
function subscribeNoop() {
  return () => {};
}
function getCheckoutSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
}
function getCheckoutServerSnapshot(): string | null {
  return null;
}

// ── Outer client component ────────────────────────────────────────
export default function CheckoutClient({ allowedCountries }: { allowedCountries?: string[] }) {
  const router = useRouter();
  const { items, shippingRate: cartShippingRate } = useCart();
  const cancellingRef = useRef(false);

  // Snapshot of sessionStorage (null on SSR / first hydrate / missing key)
  const raw = useSyncExternalStore(
    subscribeNoop,
    getCheckoutSnapshot,
    getCheckoutServerSnapshot,
  );

  // Derive PI data from the snapshot
  const parsed = useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CheckoutPiData & {
        total?: number;
        shippingRate?: number;
      };
    } catch {
      return null;
    }
  }, [raw]);

  // Stripe instance — memoised on the connected account so it isn't
  // recreated on every render.
  const stripePromise = useMemo(() => {
    if (!parsed) return null;
    return parsed.stripeAccount
      ? loadStripe(PUBLISHABLE_KEY, { stripeAccount: parsed.stripeAccount })
      : loadStripe(PUBLISHABLE_KEY);
  }, [parsed]);

  const piData: CheckoutPiData | null = parsed;
  const total = parsed?.total ?? 0;
  const shippingRate = parsed?.shippingRate ?? cartShippingRate;

  // After hydration, redirect away if there's no PI data (or it was bad).
  // This effect only navigates — it never calls setState in this component.
  useEffect(() => {
    const stored = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!stored) {
      router.replace('/work');
      return;
    }
    try {
      JSON.parse(stored);
    } catch {
      router.replace('/work');
    }
  }, [router]);

  async function handleBack() {
    if (cancellingRef.current || !piData) {
      router.back();
      return;
    }
    cancellingRef.current = true;
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);

    // Fire-and-forget PI cancel + stock restore
    try {
      await fetch('/api/payment-intent/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: piData.paymentIntentId,
          cancelToken: piData.cancelToken,
        }),
      });
    } catch {
      // Non-critical — webhook will catch it
    }
    router.back();
  }

  if (!piData || !stripePromise) {
    return (
      <section className="min-h-[75svh] px-6 py-24 max-w-2xl mx-auto">
        <p className="text-muted-foreground text-sm">Loading checkout…</p>
      </section>
    );
  }

  const subtotal = total - shippingRate;

  return (
    <section className="min-h-[75svh] px-6 py-24 xl:py-32 max-w-5xl mx-auto">
      <h1 className="text-3xl md:text-4xl tracking-tight mb-12">CHECKOUT</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Order summary */}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
            Order summary
          </p>
          <div className="space-y-4 mb-6">
            {items.map((item) => (
              <div key={item.priceId} className="flex gap-4 items-start">
                <div className="relative w-16 h-20 shrink-0 rounded-sm overflow-hidden bg-muted">
                  <ImageWithFallback
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm tracking-tight">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Qty: {item.quantity}
                  </p>
                </div>
                <p className="text-sm shrink-0">
                  £{((item.priceHw * item.quantity) / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-foreground/10 pt-4 space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>£{(subtotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{shippingRate === 0 ? 'Free' : `£${(shippingRate / 100).toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-foreground font-semibold pt-1">
              <span>Total</span>
              <span>£{(total / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Stripe Elements form */}
        <div>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: piData.clientSecret,
              appearance: {
                theme: 'flat',
                variables: {
                  colorBackground: 'rgb(242, 248, 239)',
                  colorText: '#1a1a1a',
                  colorTextSecondary: '#666',
                  borderRadius: '0px',
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontSizeBase: '15px',
                  focusBoxShadow: 'none',
                  focusOutline: '1px solid #1a1a1a',
                },
                rules: {
                  '.Input': {
                    border: '1px solid rgba(0,0,0,0.2)',
                    backgroundColor: 'transparent',
                    padding: '10px 12px',
                  },
                  '.Input:focus': {
                    border: '1px solid #1a1a1a',
                  },
                  '.Label': {
                    fontWeight: '400',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontSize: '11px',
                  },
                },
              },
            }}
          >
            <CheckoutForm
              total={total}
              shippingRate={shippingRate}
              allowedCountries={allowedCountries ?? ['GB']}
              paymentIntentId={piData.paymentIntentId}
              cancelToken={piData.cancelToken}
              onBack={handleBack}
            />
          </Elements>
        </div>
      </div>
    </section>
  );
}
