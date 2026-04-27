import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/app/_lib/stripe';
import { createServerSupabase } from '@/app/_lib/supabase';
import { getShippingRatePence } from '@/app/_lib/shippingSettings';
import type Stripe from 'stripe';

interface CartLineItem {
  priceId: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both legacy single-item { priceId } and new multi-item { items }
    let lineItems: CartLineItem[];

    if (Array.isArray(body.items)) {
      lineItems = body.items as CartLineItem[];
    } else if (body.priceId) {
      lineItems = [{ priceId: body.priceId, quantity: 1 }];
    } else {
      return NextResponse.json({ error: 'Missing items or priceId' }, { status: 400 });
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Validate each line item
    for (const item of lineItems) {
      if (typeof item.priceId !== 'string' || !item.priceId) {
        return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return NextResponse.json({ error: 'Quantity must be a positive integer' }, { status: 400 });
      }
    }

    // ── Reserve stock atomically before creating Stripe session ─────
    const supabase = createServerSupabase();

    // Build a reservation payload: [{ stripe_price_id, quantity }]
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

    // result is an array of { stripe_price_id, title, reserved }
    const failed = (result as { stripe_price_id: string; title: string; reserved: boolean }[])
      .filter((r) => !r.reserved);

    if (failed.length > 0) {
      // Restore any that DID succeed in this batch (partial rollback)
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

    // ── Create Stripe checkout session ─────────────────────────────
    const stripe = getStripe();
    const shippingRatePence = await getShippingRatePence();

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const cancelToken = crypto.randomUUID();

    // Fetch price + product data for metadata and fee calculation
    const prices = await Promise.all(
      lineItems.map((item) => stripe.prices.retrieve(item.priceId, { expand: ['product'] }))
    );

    // Fetch type from Supabase for each price ID
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

    // Application fee: 1% flat
    const clientAccountId = process.env.STRIPE_CONNECT_CLIENT_ACCOUNT_ID?.trim() || undefined;
    console.log('[CONNECT] clientAccountId:', JSON.stringify(clientAccountId));
    let applicationFeeAmount: number | undefined;
    if (clientAccountId) {
      const totalAmount = prices.reduce((sum, price, i) => {
        return sum + (price.unit_amount ?? 0) * lineItems[i].quantity;
      }, 0);
      applicationFeeAmount = Math.round(totalAmount * 0.01);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems.map((item) => ({
        price: item.priceId,
        quantity: item.quantity,
      })),
      phone_number_collection: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ['GB'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: shippingRatePence, currency: 'gbp' },
            display_name: shippingRatePence === 0 ? 'Free shipping' : 'Standard shipping',
          },
        },
      ],
      ...(clientAccountId && applicationFeeAmount !== undefined
        ? {
            payment_intent_data: {
              application_fee_amount: applicationFeeAmount,
              transfer_data: { destination: clientAccountId },
            },
          }
        : {}),
      // Store reserved items so we can restore stock on expiry
      metadata: {
        reserved_items: JSON.stringify(enrichedReservations),
        cancel_token: cancelToken,
      },
      // 30 min to complete payment before session expires
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${siteUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/purchase/cancelled?session_id={CHECKOUT_SESSION_ID}&cancel_token=${cancelToken}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
