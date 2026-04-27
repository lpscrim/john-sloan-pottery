import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/app/_lib/etsy';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/admin/etsy?error=${encodeURIComponent(oauthError)}`, req.url),
    );
  }

  const storedVerifier = req.cookies.get('etsy_code_verifier')?.value;
  const storedState = req.cookies.get('etsy_oauth_state')?.value;

  if (!code || !storedVerifier || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL('/admin/etsy?error=invalid_state', req.url),
    );
  }

  try {
    await exchangeCodeForTokens(code, storedVerifier);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(
      new URL(`/admin/etsy?error=${encodeURIComponent(msg)}`, req.url),
    );
  }

  const response = NextResponse.redirect(new URL('/admin/etsy?connected=1', req.url));
  response.cookies.delete('etsy_code_verifier');
  response.cookies.delete('etsy_oauth_state');
  return response;
}
