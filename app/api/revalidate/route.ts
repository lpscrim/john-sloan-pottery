import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/app/_lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.REVALIDATE_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'REVALIDATE_SECRET is not configured' },
      { status: 500 }
    );
  }

  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  // Ping Supabase to keep the free-tier database from pausing
  const supabase = createServerSupabase();
  await supabase.from('products').select('id').limit(1);

  revalidatePath('/');
  revalidatePath('/work');

  return NextResponse.json({ revalidated: true });
}
