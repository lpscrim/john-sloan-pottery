import { getStripe } from "@/app/_lib/stripe";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClearCart } from "./clearCart";
import { ImageWithFallback } from "../../_components/UI/Layout/ImageWithFallback";
import type Stripe from "stripe";

interface SuccessPageProps {
  searchParams: Promise<{ payment_intent?: string }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { payment_intent } = await searchParams;

  if (!payment_intent) redirect("/shop");

  const stripe = getStripe();

  // PI lives on the artist's connected account — must scope the retrieve to that account
  const clientAccountId = process.env.STRIPE_CONNECT_CLIENT_ACCOUNT_ID?.trim() || undefined;

  let pi: Stripe.PaymentIntent;
  let charge: Stripe.Charge | null = null;
  try {
    pi = await stripe.paymentIntents.retrieve(
      payment_intent,
      { expand: ["latest_charge"] },
      clientAccountId ? { stripeAccount: clientAccountId } : undefined,
    );
    charge = pi.latest_charge as Stripe.Charge | null;
  } catch {
    redirect("/work");
  }

  if (pi.status !== "succeeded") redirect("/work");

  type ReservedItem = {
    title: string;
    qty: number;
    price: number;
    image?: string;
    type?: string;
  };
  let reservedItems: ReservedItem[] = [];
  try {
    reservedItems = JSON.parse(pi.metadata?.reserved_items ?? "[]");
  } catch {
    // show empty items gracefully
  }

  const shippingCost = parseInt(pi.metadata?.shipping_amount ?? "0", 10);
  const subtotal = pi.amount - shippingCost;

  const billingName = charge?.billing_details?.name ?? null;
  const billingEmail = charge?.billing_details?.email ?? null;
  const shipping = charge?.shipping ?? pi.shipping;
  const phone = (shipping as { phone?: string } | null)?.phone ?? null;

  const shippingAddress = shipping?.address
    ? [
        shipping.address.line1,
        shipping.address.line2,
        shipping.address.city,
        shipping.address.postal_code,
        shipping.address.country,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <section className="min-h-[75svh] px-6 py-24 xl:py-32 max-w-2xl mx-auto">
      <ClearCart />

      <h1 className="text-3xl md:text-5xl tracking-tight mb-4">THANK YOU</h1>
      <p className="text-muted-foreground mb-8">
        Your order has been confirmed. A receipt has been sent to{" "}
        <span className="text-foreground">{billingEmail}</span>.
      </p>

      {/* Customer details */}
      <div className="mb-10 space-y-1 text-sm">
        {billingName && <p className="text-foreground">{billingName}</p>}
        {phone && <p className="text-muted-foreground">{phone}</p>}
        {shippingAddress && (
          <p className="text-muted-foreground">{shippingAddress}</p>
        )}
      </div>

      <div className="border-t border-foreground/10">
        {reservedItems.map((item, idx) => (
          <div key={idx} className="py-4 border-b border-foreground/10">
            <div className="relative w-full aspect-square rounded-sm overflow-hidden bg-muted mb-3">
              <ImageWithFallback
                src={item.image ?? ""}
                alt={item.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 672px"
              />
            </div>
            <div className="flex justify-between items-start">
              <div>
                <p className="tracking-tight">{item.title}</p>
                <p className="text-muted-foreground text-sm">Qty: {item.qty}</p>
              </div>
              <p className="tracking-tight">£{(item.price / 100).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-foreground/10 mt-4 space-y-2 py-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>£{(subtotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span>
            {shippingCost === 0 ? "Free" : `£${(shippingCost / 100).toFixed(2)}`}
          </span>
        </div>
        <div className="flex justify-between text-base font-medium border-t border-foreground/10 pt-3 mt-1">
          <span>Total</span>
          <span>£{(pi.amount / 100).toFixed(2)}</span>
        </div>
      </div>

      <Link
        href="/shop"
        className="inline-block mt-8 text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to gallery
      </Link>
    </section>
  );
}
