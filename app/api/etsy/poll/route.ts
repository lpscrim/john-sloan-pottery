import { NextRequest, NextResponse } from 'next/server';

/**
 * Triggers a Make.com scenario to fetch all active Etsy listings and push
 * quantities to /api/etsy/sync-stock. Called by the admin "Sync stock now"
 * button and can also be called by a cron job.
 *
 * Etsy API is accessed via Make.com (intermediary) rather than directly.
 */
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

  try {
    await fetch(makeSyncUrl, { method: 'POST' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to trigger Make sync: ${msg}` }, { status: 502 });
  }

  return NextResponse.json({ synced: 0, message: 'Sync triggered via Make.com — stock will update shortly' });
}
