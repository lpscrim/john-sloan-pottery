import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/app/_lib/stripe';
import { getShippingRates, resolveRateForCountry } from '@/app/_lib/shippingSettings';
import {
  calculateUpdatedPaymentIntentTotal,
  isUpdatablePaymentIntentStatus,
  isValidCountryCode,
} from '@/app/_lib/paymentIntentShipping';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentIntentId, cancelToken, country } = body;

    if (
      typeof paymentIntentId !== 'string' || !paymentIntentId ||
      typeof cancelToken !== 'string' || !cancelToken ||
      typeof country !== 'string' || !country
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate country is a 2-letter ISO 3166-1 alpha-2 code
    if (!isValidCountryCode(country)) {
      return NextResponse.json({ error: 'Invalid country code' }, { status: 400 });
    }

    const stripe = getStripe();
    const clientAccountId = process.env.STRIPE_CONNECT_CLIENT_ACCOUNT_ID?.trim() || undefined;
    const stripeOpts = clientAccountId ? { stripeAccount: clientAccountId } : undefined;

    // Retrieve the PI to validate the cancel token and read item types
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, stripeOpts);

    // Validate cancel token (acts as a lightweight ownership check)
    if (pi.metadata.cancel_token !== cancelToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only update while the PI can still be modified
    if (!isUpdatablePaymentIntentStatus(pi.status)) {
      return NextResponse.json({ error: 'Payment intent cannot be updated' }, { status: 400 });
    }

    const rates = await getShippingRates();
    const newShippingRate = resolveRateForCountry(rates, country);
    const prevShipping = parseInt(pi.metadata.shipping_amount ?? '0', 10);
    const newTotal = calculateUpdatedPaymentIntentTotal(
      pi.amount,
      prevShipping,
      newShippingRate,
    );

    await stripe.paymentIntents.update(
      paymentIntentId,
      {
        amount: newTotal,
        metadata: { ...pi.metadata, shipping_amount: String(newShippingRate) },
      },
      stripeOpts,
    );

    return NextResponse.json({ shippingRate: newShippingRate, total: newTotal });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update shipping';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
