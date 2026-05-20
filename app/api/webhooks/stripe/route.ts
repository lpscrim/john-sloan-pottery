import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/app/_lib/stripe';
import { createServerSupabase } from '@/app/_lib/supabase';
import type Stripe from 'stripe';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  // Events from the connected account are forwarded via a Connect webhook
  // (signed with STRIPE_CONNECT_WEBHOOK_SECRET). If that is not configured,
  // fall back to the platform webhook secret for local/test environments.
  const secret = (process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, secret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[WEBHOOK] signature verification failed:', message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  // Stock is reserved when the PaymentIntent is created.
  // We listen to charge.succeeded (not payment_intent.succeeded) because
  // balance_transaction is guaranteed to exist by the time charge.succeeded fires,
  // whereas on payment_intent.succeeded it may not be populated yet.
  // We still listen to payment_intent.canceled for stock restoration.

  if (event.type === 'charge.succeeded') {
    const charge = event.data.object as Stripe.Charge;
    console.log('[ORDER COMPLETED]', {
      chargeId: charge.id,
      paymentIntentId: charge.payment_intent,
      amount: charge.amount,
      currency: charge.currency,
    });
    await notifyClientFromCharge(charge, stripe);
    await syncEtsyStockAfterSale(charge, stripe);
  }

  if (event.type === 'payment_intent.canceled') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const raw = pi.metadata?.reserved_items;
    if (raw) {
      try {
        const reserved = JSON.parse(raw) as { stripe_price_id: string; qty: number }[];
        const supabase = createServerSupabase();
        await supabase.rpc('restore_stock', { items: reserved });
      } catch (err) {
        console.error('Failed to restore stock on PI cancellation:', err);
      }
    }
  }

  return NextResponse.json({ received: true });
}

async function notifyClientFromCharge(charge: Stripe.Charge, stripe: ReturnType<typeof import('@/app/_lib/stripe').getStripe>) {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL;
  if (!apiKey || !notifyEmail) return;

  const resend = new Resend(apiKey);
  const recipients = notifyEmail.split(',').map((e) => e.trim()).filter(Boolean);

  const clientAccountId = process.env.STRIPE_CONNECT_CLIENT_ACCOUNT_ID?.trim() || undefined;
  const stripeOpts = clientAccountId ? { stripeAccount: clientAccountId } : undefined;

  // Retrieve balance_transaction if not already expanded on the charge event
  let balanceTx: Stripe.BalanceTransaction | null = null;
  // For direct Connect charges, balance_transaction is settled asynchronously —
  // it may be null at charge.succeeded time. Retrieve the full charge with
  // expand to catch cases where it IS available, then fall back to estimation.
  try {
    const fullCharge = await stripe.charges.retrieve(
      charge.id,
      { expand: ['balance_transaction'] },
      stripeOpts,
    );
    if (fullCharge.balance_transaction && typeof fullCharge.balance_transaction !== 'string') {
      balanceTx = fullCharge.balance_transaction as Stripe.BalanceTransaction;
    }
  } catch (err) {
    console.error('[WEBHOOK] Failed to retrieve charge with balance_transaction:', err);
  }

  // Fetch PaymentIntent for metadata (reserved_items, shipping_amount).
  // If this fails we still send the email — just without item breakdown / shipping split.
  let pi: Stripe.PaymentIntent | null = null;
  if (charge.payment_intent && typeof charge.payment_intent === 'string') {
    try {
      pi = await stripe.paymentIntents.retrieve(charge.payment_intent, undefined, stripeOpts);
    } catch (err) {
      console.error('[WEBHOOK] Failed to retrieve PaymentIntent:', err);
    }
  }

  const billingEmail = charge.billing_details?.email ?? null;
  const billingName = charge.billing_details?.name ?? null;
  const shipping = charge.shipping;

  const amountTotal = charge.amount;
  // shippingCost is null (not 0) when metadata is unavailable, so the email
  // can show "Total" only rather than misreporting "Subtotal" + "Free shipping".
  const shippingCost = pi?.metadata?.shipping_amount
    ? parseInt(pi.metadata.shipping_amount, 10)
    : null;
  const subtotal = shippingCost !== null ? amountTotal - shippingCost : null;
  const platformFee = Math.round(amountTotal * 0.05);
  const stripeFee = balanceTx?.fee ?? null;
  const netToClient = stripeFee !== null ? amountTotal - platformFee - stripeFee : null;

  const fmt = (pence: number) => `£${(pence / 100).toFixed(2)}`;

  const addressLines = shipping?.address
    ? [
        shipping.address.line1,
        shipping.address.line2,
        shipping.address.city,
        shipping.address.postal_code,
        shipping.address.country,
      ]
        .filter(Boolean)
        .join(', ')
    : 'Not provided';

  const phone = (shipping as { phone?: string } | null)?.phone
    ?? (charge.billing_details as { phone?: string } | null)?.phone
    ?? 'Not provided';

  let itemsHtml = '';
  try {
    const reserved = JSON.parse(pi?.metadata?.reserved_items ?? '[]') as { title: string; qty: number; price: number; image?: string; type?: string }[];
    itemsHtml = reserved
      .map((i) => `<div style="display:inline-block;margin:8px;vertical-align:top;text-align:center;width:160px">
        ${i.image ? `<img src="${i.image}" alt="${i.title}" width="160" height="160" style="object-fit:cover;border-radius:6px;display:block">` : ''}
        <p style="margin:6px 0 2px;font-weight:600">${i.title}</p>
        ${i.type ? `<p style="margin:0 0 2px;color:#888;font-size:12px;text-transform:capitalize">${i.type}</p>` : ''}
        <p style="margin:0;color:#555">x${i.qty} &mdash; ${fmt(i.price)}</p>
      </div>`)
      .join('');
  } catch {
    itemsHtml = '<p>See Stripe dashboard for items</p>';
  }

  const html = `
    <h2>New Order — ${billingName ?? 'New Customer'}</h2>
    <p><strong>Customer:</strong> ${billingName ?? 'Unknown'}<br>
    <strong>Email:</strong> ${billingEmail ?? 'Unknown'}<br>
    <strong>Phone:</strong> ${phone}</p>
    <p><strong>Shipping address:</strong><br>${addressLines}</p>
    <h3>Items</h3>
    <div>${itemsHtml}</div>
    <table style="width:100%;max-width:360px;border-collapse:collapse;margin-top:12px;font-size:14px">
      ${subtotal !== null ? `<tr><td style="color:#555;padding:3px 0">Subtotal</td><td style="text-align:right">${fmt(subtotal)}</td></tr>` : ''}
      ${shippingCost !== null ? `<tr><td style="color:#555;padding:3px 0">Shipping</td><td style="text-align:right">${shippingCost === 0 ? 'Free' : fmt(shippingCost)}</td></tr>` : ''}
      <tr><td style="padding:3px 0;font-weight:600">Total</td><td style="text-align:right;font-weight:600">${fmt(amountTotal)}</td></tr>
      <tr><td style="color:#555;padding:3px 0;border-top:1px solid #eee">Platform fee (5%)</td><td style="text-align:right;border-top:1px solid #eee">−${fmt(platformFee)}</td></tr>
      <tr><td style="color:#555;padding:3px 0">Stripe processing fee</td><td style="text-align:right">${stripeFee !== null ? `−${fmt(stripeFee)}` : 'See dashboard'}</td></tr>
      <tr><td style="padding:3px 0;font-weight:600;border-top:1px solid #eee">Net to you</td><td style="text-align:right;font-weight:600;border-top:1px solid #eee">${netToClient !== null ? fmt(netToClient) : 'See dashboard'}</td></tr>
    </table>
    <p style="color:#888;font-size:12px;margin-top:12px">Charge: ${charge.id} | Payment Intent: ${pi?.id ?? 'N/A'}</p>
  `;

  try {
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
    const result = await resend.emails.send({
      from: fromAddress,
      to: recipients,
      subject: `New Order — ${billingName ?? billingEmail ?? charge.id}`,
      html,
    });
    console.log('[NOTIFY EMAIL RESULT]', JSON.stringify(result));
  } catch (err) {
    console.error('[NOTIFY EMAIL FAILED]', err);
  }
}

/**
 * After a confirmed sale, notify Make.com to update the linked Etsy listing quantity.
 * Stock is already decremented in Supabase by the time charge.succeeded fires.
 * Make.com handles the actual Etsy API call.
 */
async function syncEtsyStockAfterSale(
  charge: Stripe.Charge,
  stripe: ReturnType<typeof import('@/app/_lib/stripe').getStripe>,
): Promise<void> {
  const makeWebhookUrl = process.env.MAKE_ETSY_WEBHOOK_URL;
  if (!makeWebhookUrl) return;

  const clientAccountId = process.env.STRIPE_CONNECT_CLIENT_ACCOUNT_ID?.trim() || undefined;
  const stripeOpts = clientAccountId ? { stripeAccount: clientAccountId } : undefined;

  let pi: Stripe.PaymentIntent | null = null;
  if (charge.payment_intent && typeof charge.payment_intent === 'string') {
    try {
      pi = await stripe.paymentIntents.retrieve(charge.payment_intent, undefined, stripeOpts);
    } catch {
      return;
    }
  }

  const raw = pi?.metadata?.reserved_items;
  if (!raw) return;

  let reserved: { stripe_price_id: string; qty: number }[];
  try {
    reserved = JSON.parse(raw);
  } catch {
    return;
  }

  const supabase = createServerSupabase();
  const priceIds = reserved.map((r) => r.stripe_price_id);

  const { data: products } = await supabase
    .from('products')
    .select('stock_level, etsy_listing_id, stripe_price_id')
    .in('stripe_price_id', priceIds)
    .not('etsy_listing_id', 'is', null);

  if (!products || products.length === 0) return;

  for (const product of products) {
    try {
      await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: product.etsy_listing_id,
          quantity: product.stock_level ?? 0,
        }),
      });
      console.log(`[ETSY SYNC] Triggered Make for listing ${product.etsy_listing_id} → qty ${product.stock_level}`);
    } catch (err) {
      console.error(`[ETSY SYNC] Failed to trigger Make for listing ${product.etsy_listing_id}:`, err);
    }
  }
}
