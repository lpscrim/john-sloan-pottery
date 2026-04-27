import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/app/_lib/stripe';
import { createServerSupabase } from '@/app/_lib/supabase';
import { getShippingRates, resolveShippingRate } from '@/app/_lib/shippingSettings';
import type Stripe from 'stripe';

interface CartLineItem {
  priceId: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let lineItems: CartLineItem[];
    if (Array.isArray(body.items)) {
      lineItems = body.items as CartLineItem[];
    } else {
      return NextResponse.json({ error: 'Missing items' }, { status: 400 });
    }
    const collect = body.collect === true;

    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    for (const item of lineItems) {
      if (typeof item.priceId !== 'string' || !item.priceId) {
        return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return NextResponse.json({ error: 'Quantity must be a positive integer' }, { status: 400 });
      }
    }

    // ── Reserve stock atomically ────────────────────────────────────
    const supabase = createServerSupabase();
    const reservations = lineItems.map((i) => ({
      stripe_price_id: i.priceId,
      qty: i.quantity,
    }));

    const { data: result, error: reserveError } = await supabase.rpc(
      'reserve_stock',
      { items: reservations }
    );

    if (reserveError) {
      return NextResponse.json({ error: 'Failed to verify stock' }, { status: 500 });
    }

    const failed = (result as { stripe_price_id: string; title: string; reserved: boolean }[])
      .filter((r) => !r.reserved);

    if (failed.length > 0) {
      const succeeded = (result as { stripe_price_id: string; title: string; reserved: boolean }[])
        .filter((r) => r.reserved);
      if (succeeded.length > 0) {
        await supabase.rpc('restore_stock', {
          items: succeeded.map((s) => ({
            stripe_price_id: s.stripe_price_id,
            qty: reservations.find((r) => r.stripe_price_id === s.stripe_price_id)!.qty,
          })),
        });
      }
      return NextResponse.json(
        {
          error: `Out of stock: ${failed.map((f) => f.title).join(', ')}`,
          outOfStock: failed.map((f) => f.title),
        },
        { status: 409 }
      );
    }

    // ── Fetch price + product data ──────────────────────────────────
    const stripe = getStripe();
    const prices = await Promise.all(
      lineItems.map((item) => stripe.prices.retrieve(item.priceId, { expand: ['product'] }))
    );

    const priceIds = lineItems.map((item) => item.priceId);
    const { data: productRows } = await supabase
      .from('products')
      .select('stripe_price_id, type')
      .in('stripe_price_id', priceIds);
    const typeByPriceId = new Map<string, string>();
    for (const row of productRows ?? []) {
      if (row.stripe_price_id) typeByPriceId.set(row.stripe_price_id, row.type ?? 'artwork');
    }

    const enrichedReservations = reservations.map((r, i) => ({
      ...r,
      title: (prices[i].product as Stripe.Product)?.name ?? 'Unknown',
      price: (prices[i].unit_amount ?? 0) * lineItems[i].quantity,
      image: ((prices[i].product as Stripe.Product)?.images?.[0] ?? '') as string,
      type: typeByPriceId.get(r.stripe_price_id) ?? 'artwork',
    }));

    // ── Calculate totals ────────────────────────────────────────────
    const shippingRates = await getShippingRates();
    const itemTypes = enrichedReservations.map((r) => r.type);
    const shippingRatePence = collect ? 0 : resolveShippingRate(shippingRates, itemTypes);
    const subtotal = prices.reduce((sum, price, i) => {
      return sum + (price.unit_amount ?? 0) * lineItems[i].quantity;
    }, 0);
    const totalAmount = subtotal + shippingRatePence;

    // ── Create PaymentIntent as a direct charge on the artist's connected account ──
    // Creating the PI with { stripeAccount } makes the artist the merchant of record:
    // Stripe processing fees are deducted from her balance, not the platform's.
    // application_fee_amount flows back to the platform (Lewis's 1%).
    const clientAccountId = process.env.STRIPE_CONNECT_CLIENT_ACCOUNT_ID?.trim() || undefined;
    const applicationFeeAmount = clientAccountId
      ? Math.round(totalAmount * 0.01)
      : undefined;

    const cancelToken = crypto.randomUUID();

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: totalAmount,
        currency: 'gbp',
        automatic_payment_methods: { enabled: true },
        ...(applicationFeeAmount !== undefined
          ? { application_fee_amount: applicationFeeAmount }
          : {}),
        metadata: {
          reserved_items: JSON.stringify(enrichedReservations),
          shipping_amount: String(shippingRatePence),
          cancel_token: cancelToken,
          ...(collect ? { collection: 'true' } : {}),
        },
      },
      // Passing stripeAccount here is what makes this a direct charge.
      // Without this the platform (Lewis) would be charged Stripe fees.
      clientAccountId ? { stripeAccount: clientAccountId } : undefined,
    );

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      cancelToken,
      total: totalAmount,
      shippingRate: shippingRatePence,
      stripeAccount: clientAccountId ?? null,
      collect,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
