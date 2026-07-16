-- Vital Map — database schema.
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It is idempotent: safe to re-run.
--
-- The design question this file answers is not "where do places live", it's
-- "who is allowed to say a kitchen is gluten free". Everything below is that
-- rule, expressed as row-level security:
--
--   * anyone, signed in or not, can READ places — it's a public map
--   * only an allowlisted editor can WRITE one
--
-- Anonymous writes are not an option here. On most apps a bad write is
-- vandalism you revert; on this one it's someone marking a wheat bakery as 100%
-- gluten free, and a coeliac believing it. The allowlist is the whole point.

-- ---------------------------------------------------------------- editors

create table if not exists public.editors (
  email    text primary key,
  name     text,
  added_at timestamptz not null default now()
);

comment on table public.editors is
  'Allowlist. Being signed in is not enough to write — your email must be in here.';

-- ---------------------------------------------------------------- places

create table if not exists public.places (
  id         text primary key,
  name       text not null,
  category   text not null check (category in
               ('restaurant','cafe','grocery','bakery','juice','butcher','market')),
  lat        double precision not null,
  lng        double precision not null,
  address    text,
  comuna     text,
  city       text not null default 'Santiago',
  website    text,
  instagram  text,
  items      text[] not null default '{}',
  -- The two-axis Claim model, one key per diet axis. jsonb rather than columns
  -- because a claim is a small object (scope, confidence, source, note,
  -- checkedAt) and adding a fifth axis shouldn't be a migration.
  diet       jsonb not null,
  caveat     text,
  sources    text[] not null default '{}',
  added_at   timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Who touched it last. Git gave us this for free; a database doesn't.
  updated_by text
);

comment on column public.places.diet is
  'Record<DietKey, {scope, confidence, source?, note?, checkedAt?}>. See src/types.ts.';

-- Santiago bounding box. The same guard as scripts/check-data.mjs, enforced at
-- the one place that can't be bypassed: a geocoder mishap put a real lookup in
-- La Pintana, 17km from the actual shop, and it looked perfectly plausible.
alter table public.places drop constraint if exists places_in_santiago;
alter table public.places add constraint places_in_santiago
  check (lat between -33.65 and -33.30 and lng between -70.85 and -70.50);

-- A claim above 'unverified' must cite a source. Same rule as check-data.mjs —
-- an unsourced "verified" is exactly the record that gets someone hurt, and it
-- must be impossible to insert, not merely discouraged.
create or replace function public.claims_are_sourced(d jsonb)
returns boolean language sql immutable as $$
  select coalesce(bool_and(
    case
      when (v->>'confidence') in ('verified','claimed')
        then coalesce(nullif(trim(v->>'source'), ''), null) is not null
      else true
    end
  ), true)
  from jsonb_each(d) as t(k, v);
$$;

alter table public.places drop constraint if exists places_claims_sourced;
alter table public.places add constraint places_claims_sourced
  check (public.claims_are_sourced(diet));

create index if not exists places_category_idx on public.places (category);

-- ---------------------------------------------------------------- is_editor

-- security definer so the policy can read `editors` without RLS on `editors`
-- recursing back into this check. Standard Supabase pattern.
create or replace function public.is_editor()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.editors
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------- RLS

alter table public.places  enable row level security;
alter table public.editors enable row level security;

drop policy if exists "places readable by everyone" on public.places;
create policy "places readable by everyone"
  on public.places for select
  using (true);

drop policy if exists "only editors insert places" on public.places;
create policy "only editors insert places"
  on public.places for insert
  to authenticated
  with check (public.is_editor());

drop policy if exists "only editors update places" on public.places;
create policy "only editors update places"
  on public.places for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- No delete policy on purpose: nothing deletes a place from the client. Removing
-- a real business is a decision that should happen in the dashboard, deliberately.

drop policy if exists "editors can see the allowlist" on public.editors;
create policy "editors can see the allowlist"
  on public.editors for select
  to authenticated
  using (public.is_editor());

-- ---------------------------------------------------------------- updated_at

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  return new;
end;
$$;

drop trigger if exists places_touch on public.places;
create trigger places_touch
  before insert or update on public.places
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- first editor
--
-- Replace with your own address before running, or add yourself from
-- Dashboard → Table editor → editors. Without a row here NOBODY can write,
-- including you.

insert into public.editors (email, name)
values ('david.egt7@gmail.com', 'David')
on conflict (email) do nothing;
