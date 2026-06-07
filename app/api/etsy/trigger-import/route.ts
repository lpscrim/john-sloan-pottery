import { NextResponse } from 'next/server';
import { getAdminUser } from '@/app/_lib/adminAuth';

export async function POST() {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const makeImportUrl = process.env.MAKE_ETSY_IMPORT_WEBHOOK_URL;
  if (!makeImportUrl) {
    return NextResponse.json({ error: 'MAKE_ETSY_IMPORT_WEBHOOK_URL not configured' }, { status: 500 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(makeImportUrl, { method: 'POST', signal: controller.signal });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = err instanceof Error && err.name === 'AbortError' ? 504 : 502;
    return NextResponse.json({ error: `Failed to trigger import: ${msg}` }, { status });
  } finally {
    clearTimeout(timeout);
  }

  return NextResponse.json({ message: 'Import triggered — new Etsy listings will appear shortly' });
}
