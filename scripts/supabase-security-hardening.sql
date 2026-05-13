-- Supabase security hardening
-- Run this in the Supabase SQL editor after the base schema exists.

-- 1. Enable RLS on public tables exposed through PostgREST.
-- The app reads and writes these through the service-role key on the server,
-- so enabling RLS does not break the current architecture.
alter table if exists public.products enable row level security;
alter table if exists public.settings enable row level security;
alter table if exists public.about_content enable row level security;
alter table if exists public.order_tracking enable row level security;

-- Optional hardening: no anon/authenticated access is needed for these tables
-- because all reads and writes already go through server-side code.
revoke all on public.products from anon, authenticated;
revoke all on public.settings from anon, authenticated;
revoke all on public.about_content from anon, authenticated;
revoke all on public.order_tracking from anon, authenticated;

-- 2. Tighten custom mug service-role policies so they do not use WITH CHECK (true).
drop policy if exists "Service role all glazes" on public.glazes;
drop policy if exists "Service role all shapes" on public.mug_shapes;
drop policy if exists "Service role all sizes" on public.mug_sizes;

create policy "Service role all glazes"
  on public.glazes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role all shapes"
  on public.mug_shapes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role all sizes"
  on public.mug_sizes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 3. Recreate stock RPCs with a fixed search_path and explicit qualification.
create or replace function public.reserve_stock(items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  result jsonb := '[]';
  current_stock integer;
  reserved boolean;
begin
  for item in select * from jsonb_array_elements(items)
  loop
    select stock_level into current_stock
    from public.products
    where stripe_price_id = item->>'stripe_price_id'
    for update;

    if current_stock >= (item->>'qty')::integer then
      update public.products
      set stock_level = stock_level - (item->>'qty')::integer
      where stripe_price_id = item->>'stripe_price_id';
      reserved := true;
    else
      reserved := false;
    end if;

    result := result || jsonb_build_object(
      'stripe_price_id', item->>'stripe_price_id',
      'title', (
        select name
        from public.products
        where stripe_price_id = item->>'stripe_price_id'
      ),
      'reserved', reserved
    );
  end loop;

  return result;
end;
$$;

create or replace function public.restore_stock(items jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(items)
  loop
    update public.products
    set stock_level = stock_level + (item->>'qty')::integer
    where stripe_price_id = item->>'stripe_price_id';
  end loop;
end;
$$;

-- Only server-side code should execute these RPCs.
revoke all on function public.reserve_stock(jsonb) from anon, authenticated;
revoke all on function public.restore_stock(jsonb) from anon, authenticated;
grant execute on function public.reserve_stock(jsonb) to service_role;
grant execute on function public.restore_stock(jsonb) to service_role;

-- 4. Auth setting fix
-- "Leaked Password Protection Disabled" is a dashboard setting, not SQL.
-- Enable it in Supabase Dashboard -> Authentication -> Providers -> Email.