-- ─────────────────────────────────────────────────────────────────────────────
-- Custom Mug Builder — Supabase Schema Migration
-- Run this in your Supabase SQL editor (project dashboard → SQL editor)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Glazes
--    "slug" is used in image filenames: e.g. slug "celadon" + "tenmoku"
--    → glaze-tiles bucket file: celadon-tenmoku.jpg (always alphabetical)
create table if not exists glazes (
  id          uuid primary key default gen_random_uuid(),
  name        text    not null,
  slug        text    not null unique,  -- lowercase, hyphen-separated, no spaces
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 2. Mug shapes
--    "slug" is used in the mug-shapes bucket: e.g. slug "classic" → classic.jpg
create table if not exists mug_shapes (
  id          uuid primary key default gen_random_uuid(),
  name        text    not null,
  slug        text    not null unique,  -- lowercase, hyphen-separated, no spaces
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 3. Mug sizes
--    price_pence is set by John via the admin panel
create table if not exists mug_sizes (
  id          uuid primary key default gen_random_uuid(),
  name        text    not null,         -- e.g. "Small", "Medium", "Large"
  price_pence integer not null check (price_pence > 0),
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─── Row-level security ──────────────────────────────────────────────────────
-- Public read (the configurator page needs unauthenticated reads)
alter table glazes    enable row level security;
alter table mug_shapes enable row level security;
alter table mug_sizes  enable row level security;

create policy "Public read glazes"    on glazes    for select using (true);
create policy "Public read mug_shapes" on mug_shapes for select using (true);
create policy "Public read mug_sizes"  on mug_sizes  for select using (true);

-- Service role can do everything (admin panel uses service key)
create policy "Service role all glazes"    on glazes    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role all shapes"    on mug_shapes for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "Service role all sizes"     on mug_sizes  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- ─── Storage buckets ─────────────────────────────────────────────────────────
-- Create these in Supabase dashboard → Storage → New bucket (set to Public):
--
--   glaze-tiles   (public)
--     Upload files named:  {slugA}-{slugB}.jpg   (slugs alphabetically sorted)
--     Example: for glazes "tenmoku" and "celadon" → celadon-tenmoku.jpg
--
--   mug-shapes    (public)
--     Upload files named:  {slug}.jpg
--     Example: for shape "classic" → classic.jpg
--
--   mug-examples  (public)
--     Upload any finished mug photos here — they appear in the examples gallery.
--     File names don't matter.

-- ─── Seed data (optional — delete / change as needed) ────────────────────────
-- insert into mug_sizes (name, price_pence, sort_order) values
--   ('Small',  3500, 1),
--   ('Medium', 4500, 2),
--   ('Large',  5500, 3);
