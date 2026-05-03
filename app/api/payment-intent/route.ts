import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/app/_lib/stripe';
import { createServerSupabase } from '@/app/_lib/supabase';
import { getShippingRates, resolveShippingRate } from '@/app/_lib/shippingSettings';
import type Stripe from 'stripe';
import type { CustomMugDetails } from '@/app/_components/Cart/CartContext';

interface CartLineItem {
  priceId: string;
  quantity: number;
  customMug?: CustomMugDetails;
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

    // ── Separate custom-mug items from regular shop items ───────────
    const regularItems = lineItems.filter((i) => !i.customMug);
    const customMugItems = lineItems.filter((i) => i.customMug);

    const clientAccountId = process.env.STRIPE_CONNECT_CLIENT_ACCOUNT_ID?.trim() || undefined;
    const stripe = getStripe();
    const supabase = createServerSupabase();

    // ── Reserve stock atomically (regular items only) ───────────────
    type ReservedRow = { stripe_price_id: string; title: string; reserved: boolean };
    let enrichedReservations: { stripe_price_id: string; qty: number; title: string; price: number; image: string }[] = [];

    if (regularItems.length > 0) {
      const reservations = regularItems.map((i) => ({
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

      const failed = (result as ReservedRow[]).filter((r) => !r.reserved);

      if (failed.length > 0) {
        const succeeded = (result as ReservedRow[]).filter((r) => r.reserved);
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

      // ── Fetch Stripe price + product data for regular items ─────────
      const prices = await Promise.all(
        regularItems.map((item) =>
          stripe.prices.retrieve(
            item.priceId,
            { expand: ['product'] },
            clientAccountId ? { stripeAccount: clientAccountId } : undefined,
          )
        )
      );

      enrichedReservations = reservations.map((r, i) => ({
        ...r,
        title: (prices[i].product as Stripe.Product)?.name ?? 'Unknown',
        price: (prices[i].unit_amount ?? 0) * regularItems[i].quantity,
        image: ((prices[i].product as Stripe.Product)?.images?.[0] ?? '') as string,
      }));
    }

    // ── Resolve custom mug prices from Supabase (server-authoritative) ─
    let customMugTotal = 0;
    type EnrichedCustomItem = { title: string; qty: number; price: number; image: string };
    const enrichedCustomItems: EnrichedCustomItem[] = [];

    if (customMugItems.length > 0) {
      const shapeIds = [...new Set(customMugItems.map((i) => i.customMug!.shapeId))];
      const { data: shapeData, error: shapeError } = await supabase
        .from('mug_shapes')
        .select('id, name, price_pence')
        .in('id', shapeIds)
        .eq('active', true);

      if (shapeError || !shapeData) {
        return NextResponse.json({ error: 'Failed to load mug types' }, { status: 500 });
      }

      const shapeMap = new Map(shapeData.map((s) => [s.id, s]));

      for (const item of customMugItems) {
        const mugShape = shapeMap.get(item.customMug!.shapeId);
        if (!mugShape) {
          return NextResponse.json({ error: 'Invalid mug type' }, { status: 400 });
        }
        const itemPrice = mugShape.price_pence * item.quantity;
        customMugTotal += itemPrice;
        enrichedCustomItems.push({
          title: [
            `Custom ${mugShape.name} Mug`,
            `Glazes: ${item.customMug!.glaze1Name} (base) + ${item.customMug!.glaze2Name} (accent)`,
          ].join('\n'),
          qty: item.quantity,
          price: itemPrice,
          image: '',
        });
      }
    }

    // ── Calculate totals ────────────────────────────────────────────
    const shippingRates = await getShippingRates();
    const shippingRatePence = collect ? 0 : resolveShippingRate(shippingRates);
    const regularSubtotal = enrichedReservations.reduce((sum, r) => sum + r.price, 0);
    const totalAmount = regularSubtotal + customMugTotal + shippingRatePence;

    // ── Create PaymentIntent ────────────────────────────────────────
    const applicationFeeAmount = clientAccountId
      ? Math.round(totalAmount * 0.05)
      : undefined;

    const cancelToken = crypto.randomUUID();

    // Combine all items into reserved_items metadata so the orders page displays them
    let allReservedItems = [
      ...enrichedReservations,
      ...enrichedCustomItems,
    ];

    // Stripe metadata values are capped at 500 chars each; the whole set at 50 KB.
    // If the serialised items exceed 40 KB, strip image URLs to reduce size.
    // If still too large, return an error rather than silently truncating order data.
    let reservedItemsJson = JSON.stringify(allReservedItems);
    if (reservedItemsJson.length > 40_000) {
      allReservedItems = allReservedItems.map(({ image: _image, ...rest }) => rest) as typeof allReservedItems;
      reservedItemsJson = JSON.stringify(allReservedItems);
    }
    if (reservedItemsJson.length > 50_000) {
      return NextResponse.json({ error: 'Order too large to process — please contact us' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: totalAmount,
        currency: 'gbp',
        automatic_payment_methods: { enabled: true },
        ...(applicationFeeAmount !== undefined
          ? { application_fee_amount: applicationFeeAmount }
          : {}),
        metadata: {
          reserved_items: reservedItemsJson,
          shipping_amount: String(shippingRatePence),
          cancel_token: cancelToken,
          ...(collect ? { collection: 'true' } : {}),
        },
      },
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
