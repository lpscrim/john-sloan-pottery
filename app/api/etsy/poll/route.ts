import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/app/_lib/adminAuth';

/**
 * Triggers a Make.com scenario to fetch all active Etsy listings and push
 * quantities to /api/etsy/sync-stock. Called by the admin "Sync stock now"
 * button (POST, admin session) and by the cron job (GET, CRON_SECRET).
 *
 * Etsy API is accessed via Make.com (intermediary) rather than directly.
 */
async function triggerMakeSync(url: string): Promise<{ status: number; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(url, { method: 'POST', signal: controller.signal });
    return { status: 200 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = err instanceof Error && err.name === 'AbortError' ? 504 : 502;
    return { status, error: `Failed to trigger Make sync: ${msg}` };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST() {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const makeSyncUrl = process.env.MAKE_ETSY_SYNC_WEBHOOK_URL;
  if (!makeSyncUrl) {
    return NextResponse.json({ error: 'MAKE_ETSY_SYNC_WEBHOOK_URL not configured' }, { status: 500 });
  }

  const result = await triggerMakeSync(makeSyncUrl);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ synced: 0, message: 'Sync triggered via Make.com — stock will update shortly' });
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const makeSyncUrl = process.env.MAKE_ETSY_SYNC_WEBHOOK_URL;
  if (!makeSyncUrl) {
    return NextResponse.json({ error: 'MAKE_ETSY_SYNC_WEBHOOK_URL not configured' }, { status: 500 });
  }

  const result = await triggerMakeSync(makeSyncUrl);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ synced: 0, message: 'Sync triggered via Make.com — stock will update shortly' });
}
