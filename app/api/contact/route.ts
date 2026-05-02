import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  let name: string, email: string, message: string;
  try {
    const body = await req.json();
    name = typeof body?.name === 'string' ? body.name.trim() : '';
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    message = typeof body?.message === 'string' ? body.message.trim() : '';
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !notifyEmail || !fromEmail) {
    console.error('[CONTACT] Missing RESEND_API_KEY, NOTIFY_EMAIL, or RESEND_FROM_EMAIL env vars');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const recipients = notifyEmail.split(',').map((e) => e.trim()).filter(Boolean);

  try {
    await resend.emails.send({
      from: fromEmail,
      to: recipients,
      replyTo: email,
      subject: `New enquiry from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p><hr/><p>${message.replace(/\n/g, '<br/>')}</p>`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[CONTACT] Resend error:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
