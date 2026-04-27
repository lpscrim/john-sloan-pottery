import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/app/_lib/supabase';

function getAllowlist() {
  const raw = process.env.ADMIN_EMAIL_ALLOWLIST ?? '';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedEmail(email: string | null | undefined) {
  const allowlist = getAllowlist();
  if (allowlist.length === 0) return false;
  if (!email) return false;
  return allowlist.includes(email.toLowerCase());
}

function buildCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60,
  };
}

export async function POST(request: Request) {
  const { accessToken } = await request.json().catch(() => ({ accessToken: null }));
  if (!accessToken || typeof accessToken !== 'string') {
    return NextResponse.json({ error: 'Missing access token.' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  }

  if (!isAllowedEmail(data.user.email)) {
    const res = NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    res.cookies.set('admin_access_token', '', { ...buildCookieOptions(), maxAge: 0 });
    return res;
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_access_token', accessToken, buildCookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_access_token', '', { ...buildCookieOptions(), maxAge: 0 });
  return res;
}
