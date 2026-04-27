import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/app/_lib/adminAuth';
import crypto from 'crypto';

function base64urlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  const apiKey = process.env.ETSY_API_KEY;
  if (!apiKey) {
    return NextResponse.redirect(
      new URL('/admin/etsy?error=ETSY_API_KEY+not+configured', req.url),
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const redirectUri = `${siteUrl}/api/etsy/auth/callback`;

  // PKCE — generate verifier and challenge
  const codeVerifier = base64urlEncode(crypto.randomBytes(32));
  const codeChallenge = base64urlEncode(
    crypto.createHash('sha256').update(codeVerifier).digest(),
  );
  const state = base64urlEncode(crypto.randomBytes(16));

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: apiKey,
    redirect_uri: redirectUri,
    scope: 'listings_r listings_w',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://www.etsy.com/oauth/connect?${params.toString()}`;
  const response = NextResponse.redirect(authUrl);

  response.cookies.set('etsy_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
    sameSite: 'lax',
  });
  response.cookies.set('etsy_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
    sameSite: 'lax',
  });

  return response;
}
