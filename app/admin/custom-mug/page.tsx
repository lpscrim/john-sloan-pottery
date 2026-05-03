import { createServerSupabase } from '@/app/_lib/supabase';
import AdminBackButton from '../AdminBackButton';
import CustomMugAdminClient from './CustomMugAdminClient';

export const dynamic = 'force-dynamic';

async function getData() {
  const supabase = createServerSupabase();

  const [glazesRes, shapesRes, sizesRes, examplesRes] = await Promise.all([
    supabase.from('glazes').select('id, name, slug, active').order('name'),
    supabase.from('mug_shapes').select('id, name, slug, description, active').order('name'),
    supabase.from('mug_sizes').select('id, name, price_pence, sort_order, active').order('sort_order'),
    supabase.storage.from('mug-examples').list('', { limit: 50, sortBy: { column: 'name', order: 'asc' } }),
  ]);

  return {
    glazes: glazesRes.data ?? [],
    shapes: shapesRes.data ?? [],
    sizes: sizesRes.data ?? [],
    examples: (examplesRes.data ?? []).filter((f) => !f.name.startsWith('.') && f.id !== null),
  };
}

export default async function CustomMugAdminPage() {
  const { glazes, shapes, sizes, examples } = await getData();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <div className="bg-background text-foreground px-6 pt-16 pb-24">
      <div className="max-w-xl mx-auto space-y-8">
        <AdminBackButton />
        <h1 className="text-3xl tracking-tight">CUSTOM MUG BUILDER</h1>
        <p className="text-muted-foreground">
          Manage glazes, shapes, sizes, tile photos and example images.
        </p>
        <CustomMugAdminClient
          glazes={glazes}
          shapes={shapes}
          sizes={sizes}
          examples={examples}
          supabaseUrl={supabaseUrl}
        />
      </div>
    </div>
  );
}
