import { NextResponse } from 'next/server';
import { getMugShapes } from '@/app/_lib/customMug';

export async function GET() {
  const shapes = await getMugShapes();
  return NextResponse.json({ shapes });
}
