import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/app/_lib/supabase';

/**
 * GET /api/stock?ids=price_xxx,price_yyy
 * Returns current stock levels for the given Stripe price IDs.
 */
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get('ids');
  if (!idsParam) {
    return NextResponse.json({ error: 'Missing ids query param' }, { status: 400 });
  }

  const priceIds = idsParam.split(',').filter(Boolean).slice(0, 50);
  if (priceIds.length === 0) {
    return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from('products')
    .select('stripe_price_id, stock_level')
    .in('stripe_price_id', priceIds);

  if (error) {
    return NextResponse.json({ error: 'Failed to check stock' }, { status: 500 });
  }

  const stock: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.stripe_price_id) {
      stock[row.stripe_price_id] = row.stock_level;
    }
  }

  return NextResponse.json(
    { stock },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
