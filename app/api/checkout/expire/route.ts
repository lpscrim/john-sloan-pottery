import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/app/_lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, cancelToken } = await req.json();
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }
    if (!cancelToken || typeof cancelToken !== 'string') {
      return NextResponse.json({ error: 'Missing cancelToken' }, { status: 400 });
    }

    const stripe = getStripe();

    // Verify the cancel token matches before expiring
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.cancel_token !== cancelToken) {
      return NextResponse.json({ error: 'Invalid cancel token' }, { status: 403 });
    }

    await stripe.checkout.sessions.expire(sessionId);

    return NextResponse.json({ expired: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to expire session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
