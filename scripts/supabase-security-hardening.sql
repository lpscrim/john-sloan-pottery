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
grant select, insert, update, delete on public.products to service_role;
grant select, insert, update, delete on public.settings to service_role;
grant select, insert, update, delete on public.about_content to service_role;
grant select, insert, update, delete on public.order_tracking to service_role;

drop policy if exists "Service role all products" on public.products;
drop policy if exists "Service role all settings" on public.settings;
drop policy if exists "Service role all about content" on public.about_content;
drop policy if exists "Service role all order tracking" on public.order_tracking;

create policy "Service role all products"
  on public.products
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role all settings"
  on public.settings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role all about content"
  on public.about_content
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role all order tracking"
  on public.order_tracking
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Fresh projects after May 30 also need explicit grants for these Data API tables.
grant select on public.glazes, public.mug_shapes, public.mug_sizes to anon, authenticated;
grant select, insert, update, delete on public.glazes, public.mug_shapes, public.mug_sizes to service_role;

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
  item       jsonb;
  result     jsonb := '[]';
  qty_needed integer;
  cur_stock  integer;
  available  boolean;
  all_ok     boolean := true;
begin
  -- Lock all target rows in a consistent order (prevents deadlocks under concurrency)
  perform 1
  from public.products
  where stripe_price_id = any(
    array(select value->>'stripe_price_id' from jsonb_array_elements(items))
  )
  order by stripe_price_id
  for update;

  -- First pass: check availability for every item and build the result
  for item in select * from jsonb_array_elements(items)
  loop
    qty_needed := (item->>'qty')::integer;

    select stock_level into cur_stock
    from public.products
    where stripe_price_id = item->>'stripe_price_id';

    available := cur_stock is not null and cur_stock >= qty_needed;

    if not available then
      all_ok := false;
    end if;

    result := result || jsonb_build_object(
      'stripe_price_id', item->>'stripe_price_id',
      'title', (
        select name from public.products
        where stripe_price_id = item->>'stripe_price_id'
      ),
      'reserved', available
    );
  end loop;

  -- Second pass: decrement stock only if every item is available (all-or-nothing)
  if all_ok then
    for item in select * from jsonb_array_elements(items)
    loop
      update public.products
      set stock_level = stock_level - (item->>'qty')::integer
      where stripe_price_id = item->>'stripe_price_id';
    end loop;
  end if;

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
revoke all on function public.reserve_stock(jsonb) from public;
revoke all on function public.restore_stock(jsonb) from public;
revoke all on function public.reserve_stock(jsonb) from anon, authenticated;
revoke all on function public.restore_stock(jsonb) from anon, authenticated;
grant execute on function public.reserve_stock(jsonb) to service_role;
grant execute on function public.restore_stock(jsonb) to service_role;

-- 4. Auth setting fix
-- "Leaked Password Protection Disabled" is a dashboard setting, not SQL.
-- Enable it in Supabase Dashboard -> Authentication -> Providers -> Email.