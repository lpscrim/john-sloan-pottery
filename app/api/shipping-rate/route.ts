import { NextResponse } from 'next/server';
import { getShippingRatePence } from '@/app/_lib/shippingSettings';

export async function GET() {
  const rate = await getShippingRatePence();
  return NextResponse.json({ rate });
}
