import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/app/_lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId, cancelToken } = await req.json();
    if (typeof paymentIntentId !== 'string' || !paymentIntentId) {
      return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 });
    }
    if (typeof cancelToken !== 'string' || !cancelToken) {
      return NextResponse.json({ error: 'Missing cancelToken' }, { status: 400 });
    }

    const stripe = getStripe();
    // PI lives on the connected account — must pass stripeAccount for all operations
    const clientAccountId = process.env.STRIPE_CONNECT_CLIENT_ACCOUNT_ID?.trim() || undefined;
    const stripeOpts = clientAccountId ? { stripeAccount: clientAccountId } : undefined;

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {}, stripeOpts);

    // Verify cancel token to prevent accidental / malicious cancellation
    if (pi.metadata?.cancel_token !== cancelToken) {
      return NextResponse.json({ error: 'Invalid cancel token' }, { status: 403 });
    }

    // Only cancel if still cancellable
    if (!['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(pi.status)) {
      return NextResponse.json({ cancelled: false, reason: 'not_cancellable' });
    }

    await stripe.paymentIntents.cancel(paymentIntentId, {}, stripeOpts);

    // Stock is restored by the payment_intent.canceled webhook — do not restore here
    // to avoid double-restoring (which would inflate stock counts).

    return NextResponse.json({ cancelled: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
