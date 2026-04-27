import { NextRequest, NextResponse } from 'next/server';

// TODO: Set BREVO_FORM_URL in your environment variables.
// Find this URL in your Brevo account under Contacts > Forms > [Your form] > Share.
const BREVO_FORM_URL = process.env.BREVO_FORM_URL ?? '';

export async function POST(req: NextRequest) {
  let email: string;
  try {
    const body = await req.json();
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const form = new URLSearchParams();
  form.set('EMAIL', email);
  form.set('email_address_check', '');
  form.set('locale', 'en');

  try {
    const res = await fetch(BREVO_FORM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    if (res.ok || res.status === 302) {
      return NextResponse.json({ success: true });
    }

    console.error('[SUBSCRIBE] Brevo form error:', res.status);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  } catch (err) {
    console.error('[SUBSCRIBE] Fetch error:', err);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
