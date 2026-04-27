'use server';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/app/_lib/supabase';

export async function setDispatched(sessionId: string, dispatched: boolean) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from('order_tracking').upsert(
    {
      stripe_session_id: sessionId,
      dispatched,
      dispatched_at: dispatched ? new Date().toISOString() : null,
    },
    { onConflict: 'stripe_session_id' }
  );
  if (error) throw new Error(error.message);
  revalidatePath('/admin/orders');
}
