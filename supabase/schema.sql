-- =====================================================================
-- Ink Masters database schema for Supabase
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- Run it once on a fresh project.
--
-- Money is stored in cents (integer) to avoid rounding errors:
--   $150.00 is stored as 15000.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Helper: keeps every table's updated_at column current
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 1. USERS
-- One row per person who signs up (clients and artists).
-- Supabase keeps logins in its own auth.users table; this table holds
-- the app-level details and is filled in automatically on sign-up.
-- ---------------------------------------------------------------------
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  avatar_url  text,
  phone       text,
  role        text not null default 'client' check (role in ('client', 'artist')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Create a public.users row whenever someone signs up.
-- Pass { full_name, role } as user metadata in supabase.auth.signUp().
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'artist' then 'artist' else 'client' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only the trigger should run this function, not the public API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 2. ARTIST PROFILES
-- The public page for a tattoo artist (one per artist user).
-- ---------------------------------------------------------------------
create table public.artist_profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references public.users (id) on delete cascade,
  display_name          text not null,
  slug                  text not null unique check (slug ~ '^[a-z0-9-]+$'),  -- used in URLs: /artists/marisol-vega
  shop_name             text,
  bio                   text,
  instagram_handle      text,
  avatar_url            text,
  header_image_url      text,
  address               text,
  city                  text,
  neighborhood          text,
  latitude              double precision,
  longitude             double precision,
  styles                text[] not null default '{}',  -- e.g. {Traditional,Neo-Trad}
  starting_price_cents  integer check (starting_price_cents >= 0),
  hourly_rate_cents     integer check (hourly_rate_cents >= 0),
  deposit_cents         integer not null default 5000 check (deposit_cents >= 0),
  years_experience      integer check (years_experience >= 0),
  rating_avg            numeric(2,1) not null default 0 check (rating_avg between 0 and 5),
  rating_count          integer not null default 0 check (rating_count >= 0),
  books_open            boolean not null default true,
  payment_methods       text[] not null default '{cash}'  -- names only; handles live in artist_payment_handles
                          constraint payment_methods_valid check (
                            cardinality(payment_methods) > 0
                            and payment_methods <@ array['cash','card','venmo','paypal','cashapp','zelle']::text[]),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index artist_profiles_styles_idx on public.artist_profiles using gin (styles);
create index artist_profiles_city_idx   on public.artist_profiles (city);

create trigger artist_profiles_set_updated_at
  before update on public.artist_profiles
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 3. PORTFOLIOS
-- Every image on an artist's page. kind = 'portfolio' for past work,
-- kind = 'flash' for pre-drawn designs with a set price and time.
-- ---------------------------------------------------------------------
create table public.portfolios (
  id                 uuid primary key default gen_random_uuid(),
  artist_id          uuid not null references public.artist_profiles (id) on delete cascade,
  kind               text not null default 'portfolio' check (kind in ('portfolio', 'flash')),
  title              text,
  image_path         text not null,          -- path inside the 'portfolio' storage bucket
  style              text,
  placement          text,                   -- e.g. 'Forearm'
  session_hours      numeric(4,1),           -- past work: how long it took
  is_healed          boolean not null default false,
  -- Flash designs only:
  price_cents        integer check (price_cents >= 0),
  estimated_minutes  integer check (estimated_minutes > 0),
  size_inches        numeric(4,1) check (size_inches > 0),
  is_repeatable      boolean not null default true,
  is_claimed         boolean not null default false,
  sort_order         integer not null default 0,
  tryon_image_path   text,                   -- optional clean design on white for the try-on (portfolio bucket)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint flash_has_price_and_time
    check (kind <> 'flash' or (price_cents is not null and estimated_minutes is not null))
);

create index portfolios_artist_idx on public.portfolios (artist_id, kind, sort_order);

create trigger portfolios_set_updated_at
  before update on public.portfolios
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 4. BOOKINGS
-- A client's booking request to an artist (the 3-step form).
-- ---------------------------------------------------------------------
create table public.bookings (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references public.users (id) on delete cascade,
  artist_id              uuid not null references public.artist_profiles (id) on delete cascade,
  flash_id               uuid references public.portfolios (id) on delete set null,  -- set when booking a flash design
  idea_description       text not null check (char_length(idea_description) between 20 and 600),
  placement              text not null,
  size_inches            numeric(4,1) not null check (size_inches between 0.5 and 24),
  reference_image_paths  text[] not null default '{}' check (cardinality(reference_image_paths) <= 6),
  requested_start        timestamptz not null,
  status                 text not null default 'pending'
                           check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  quoted_price_cents     integer check (quoted_price_cents >= 0),
  deposit_paid           boolean not null default false,
  artist_note            text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index bookings_client_idx on public.bookings (client_id, created_at desc);
create index bookings_artist_idx on public.bookings (artist_id, requested_start);
create index bookings_flash_idx  on public.bookings (flash_id);

-- An artist can't accept two bookings for the same start time.
create unique index bookings_no_double_booking
  on public.bookings (artist_id, requested_start)
  where status = 'accepted';

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 5. SECURITY (Row Level Security)
-- With RLS on, nobody can read or change a row unless a policy below
-- allows it. This is what makes it safe to use the publishable key in
-- the browser.
-- ---------------------------------------------------------------------
alter table public.users           enable row level security;
alter table public.artist_profiles enable row level security;
alter table public.portfolios      enable row level security;
alter table public.bookings        enable row level security;

grant select on public.artist_profiles, public.portfolios to anon;
grant select, insert, update, delete
  on public.users, public.artist_profiles, public.portfolios, public.bookings
  to authenticated;

-- USERS: you can see and edit your own row. Artists can see the
-- clients who sent them a booking (to show their name and contact info).
create policy "Users can read their own row"
  on public.users for select to authenticated
  using ((select auth.uid()) = id);

create policy "Artists can read clients who booked them"
  on public.users for select to authenticated
  using (exists (
    select 1
    from public.bookings b
    join public.artist_profiles a on a.id = b.artist_id
    where b.client_id = users.id
      and a.user_id = (select auth.uid())
  ));

create policy "Users can update their own row"
  on public.users for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ARTIST PROFILES: public to everyone, editable only by the owner.
create policy "Anyone can view artist profiles"
  on public.artist_profiles for select to anon, authenticated
  using (true);

create policy "Artists can create their own profile"
  on public.artist_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Artists can update their own profile"
  on public.artist_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Artists can delete their own profile"
  on public.artist_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

-- PORTFOLIOS: public to everyone, managed only by the artist who owns them.
create policy "Anyone can view portfolios"
  on public.portfolios for select to anon, authenticated
  using (true);

create policy "Artists can add to their own portfolio"
  on public.portfolios for insert to authenticated
  with check (exists (
    select 1 from public.artist_profiles a
    where a.id = portfolios.artist_id and a.user_id = (select auth.uid())
  ));

create policy "Artists can edit their own portfolio"
  on public.portfolios for update to authenticated
  using (exists (
    select 1 from public.artist_profiles a
    where a.id = portfolios.artist_id and a.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.artist_profiles a
    where a.id = portfolios.artist_id and a.user_id = (select auth.uid())
  ));

create policy "Artists can delete from their own portfolio"
  on public.portfolios for delete to authenticated
  using (exists (
    select 1 from public.artist_profiles a
    where a.id = portfolios.artist_id and a.user_id = (select auth.uid())
  ));

-- BOOKINGS: visible only to the client who made it and the artist it's for.
create policy "Clients and artists can view their bookings"
  on public.bookings for select to authenticated
  using (
    client_id = (select auth.uid())
    or exists (
      select 1 from public.artist_profiles a
      where a.id = bookings.artist_id and a.user_id = (select auth.uid())
    )
  );

-- Only the artist sets the quote, the note and whether the deposit was received.
create policy "Clients can create booking requests"
  on public.bookings for insert to authenticated
  with check (
    client_id = (select auth.uid()) and status = 'pending'
    and deposit_paid = false and quoted_price_cents is null and artist_note is null
  );

create policy "Clients can edit or cancel their pending requests"
  on public.bookings for update to authenticated
  using (client_id = (select auth.uid()) and status = 'pending')
  with check (
    client_id = (select auth.uid()) and status in ('pending', 'cancelled')
    and deposit_paid = false and quoted_price_cents is null and artist_note is null
  );

create policy "Artists can respond to their bookings"
  on public.bookings for update to authenticated
  using (exists (
    select 1 from public.artist_profiles a
    where a.id = bookings.artist_id and a.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.artist_profiles a
    where a.id = bookings.artist_id and a.user_id = (select auth.uid())
  ));


-- ---------------------------------------------------------------------
-- 6. IMAGE STORAGE
-- 'portfolio'          public bucket for artist work and flash images
-- 'booking-references' private bucket for clients' reference photos
-- Files go in a folder named after the uploader's user id:
--   portfolio/<user-id>/rose.jpg
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true),
       ('booking-references', 'booking-references', false)
on conflict (id) do nothing;

create policy "Artists upload portfolio images to their own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Artists update their own portfolio images"
  on storage.objects for update to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Artists delete their own portfolio images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Clients upload reference images to their own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'booking-references' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Clients view their own reference images"
  on storage.objects for select to authenticated
  using (bucket_id = 'booking-references' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Artists view reference images on their bookings"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'booking-references'
    and exists (
      select 1
      from public.bookings b
      join public.artist_profiles a on a.id = b.artist_id
      where a.user_id = (select auth.uid())
        and objects.name = any (b.reference_image_paths)
    )
  );


-- ---------------------------------------------------------------------
-- 7. BOOKING CALENDAR
-- Lets the booking calendar grey out taken times without exposing who
-- booked them.
-- ---------------------------------------------------------------------
create or replace function public.artist_busy_slots(p_artist_id uuid, p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.requested_start
  from public.bookings b
  where b.artist_id = p_artist_id
    and b.status in ('pending', 'accepted')
    and b.requested_start >= p_from
    and b.requested_start < p_to
$$;

revoke execute on function public.artist_busy_slots(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.artist_busy_slots(uuid, timestamptz, timestamptz) to authenticated;


-- ---------------------------------------------------------------------
-- 8. PAYMENT HANDLES
-- The artist's Venmo / PayPal / Cash App / Zelle details. Private: only
-- the artist, and clients with an accepted booking, can read them.
-- ---------------------------------------------------------------------
create table public.artist_payment_handles (
  artist_id   uuid primary key references public.artist_profiles (id) on delete cascade,
  venmo       text check (char_length(venmo) <= 60),
  paypal      text check (char_length(paypal) <= 60),
  cashapp     text check (char_length(cashapp) <= 60),
  zelle       text check (char_length(zelle) <= 120),
  updated_at  timestamptz not null default now()
);

create trigger artist_payment_handles_set_updated_at
  before update on public.artist_payment_handles
  for each row execute function public.set_updated_at();

alter table public.artist_payment_handles enable row level security;
grant select, insert, update, delete on public.artist_payment_handles to authenticated;

create policy "Artists manage their own payment handles"
  on public.artist_payment_handles for all to authenticated
  using (exists (select 1 from public.artist_profiles a where a.id = artist_payment_handles.artist_id and a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.artist_profiles a where a.id = artist_payment_handles.artist_id and a.user_id = (select auth.uid())));

create policy "Clients with an accepted booking can see how to pay"
  on public.artist_payment_handles for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.artist_id = artist_payment_handles.artist_id
      and b.client_id = (select auth.uid())
      and b.status = 'accepted'
  ));
