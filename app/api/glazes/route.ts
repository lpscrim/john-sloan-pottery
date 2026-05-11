import { NextResponse } from 'next/server';
import { getGlazes } from '@/app/_lib/customMug';

export async function GET() {
  const glazes = await getGlazes();
  return NextResponse.json({ glazes });
}
