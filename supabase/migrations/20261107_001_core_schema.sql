-- WanderWay core schema (Phase 2, baseline capture).
-- Captures the database state as of 2026-11-07. Idempotent: safe to re-run
-- against the live project or a fresh one.
--
-- Money model:
--   * All amounts use integer minor units (`*_minor_units`, bigint) so that all
--     budget arithmetic stays exact — never floating point.
--   * Unknown prices are stored with evidence_type = 'unknown'; a missing price
--     is never silently treated as zero.
--
-- Integrity model:
--   * Every trip-owned table carries `trip_id` so Row Level Security (applied
--     in 20261107_002_rls_policies.sql) never needs a two-hop join to decide
--     access.

create extension if not exists postgis;

create table if not exists public.profiles (
  id uuid not null references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  preferred_currency text not null default 'USD',
  home_location text,
  travel_preferences jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_pkey primary key (id)
);

create table if not exists public.trips (
  id uuid not null default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  destination text not null,
  origin_location text,
  start_date date not null,
  end_date date not null,
  traveler_count integer not null default 1,
  adult_count integer not null default 1,
  child_count integer not null default 0,
  room_count integer not null default 1,
  budget_minor_units bigint not null default 0,
  budget_currency text not null default 'USD',
  budget_basis text not null default 'total',
  travel_pace text not null default 'balanced',
  travel_style text,
  trip_state text not null default 'draft',
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_pkey primary key (id),
  constraint trips_traveler_count_check check (traveler_count >= 1),
  constraint trips_adult_count_check check (adult_count >= 1),
  constraint trips_child_count_check check (child_count >= 0),
  constraint trips_room_count_check check (room_count >= 1),
  constraint trips_budget_basis_check check (budget_basis in ('total', 'per_person')),
  constraint trips_travel_pace_check check (travel_pace in ('slow', 'balanced', 'fast')),
  constraint trips_trip_state_check check (trip_state in ('draft', 'upcoming', 'active', 'completed', 'archived')),
  constraint trips_owner_id_fkey foreign key (owner_id) references public.profiles (id) on delete cascade
);

create table if not exists public.trip_members (
  id uuid not null default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'editor',
  joined_at timestamptz not null default now(),
  constraint trip_members_pkey primary key (id),
  constraint trip_members_trip_id_user_id_key unique (trip_id, user_id),
  constraint trip_members_role_check check (role in ('owner', 'editor', 'viewer'))
);

create table if not exists public.itinerary_days (
  id uuid not null default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day_number integer not null,
  calendar_date date not null,
  title text,
  notes text,
  created_at timestamptz not null default now(),
  constraint itinerary_days_pkey primary key (id),
  constraint itinerary_days_day_number_check check (day_number >= 1)
);

create table if not exists public.itinerary_activities (
  id uuid not null default gen_random_uuid(),
  day_id uuid not null references public.itinerary_days (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null,
  description text,
  place_name text,
  place_category text,
  -- Place identity resolved by Geoapify, never invented by the AI planner.
  geoapify_place_id text,
  latitude double precision,
  longitude double precision,
  -- Maintained by the sync_activity_geom() trigger (20261107_003_postgis_helpers.sql).
  geom geometry(Point, 4326),
  planned_time time,
  duration_minutes integer not null default 60,
  sort_order integer not null default 0,
  travel_mode_to_next text,
  transit_distance_meters integer,
  transit_duration_seconds integer,
  is_user_edited boolean not null default false,
  is_must_see boolean not null default false,
  booking_requirement text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint itinerary_activities_pkey primary key (id)
);

create table if not exists public.budget_line_items (
  id uuid not null default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  activity_id uuid references public.itinerary_activities (id) on delete set null,
  category text not null,
  title text not null,
  amount_minor_units bigint not null default 0,
  currency text not null default 'USD',
  -- Price evidence taxonomy (PRD 5.7): exact provenance for every numeric price.
  evidence_type text not null default 'unknown',
  source_name text,
  source_url text,
  checked_at timestamptz,
  -- Retained conversion rate + timestamp for transparent cross-currency math.
  fx_rate_to_trip_currency numeric(12, 6),
  fx_timestamp timestamptz,
  is_paid boolean not null default false,
  paid_by_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint budget_line_items_pkey primary key (id),
  constraint budget_line_items_evidence_type_check check (
    evidence_type in (
      'live_quote', 'published_price', 'verified_range',
      'calculated_estimate', 'user_entered', 'unknown'
    )
  )
);

create table if not exists public.bookings (
  id uuid not null default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  booking_type text not null,
  provider_name text not null,
  confirmation_code text,
  -- Quote→booking funnel: idea → researching → price_selected → booked.
  status text not null default 'idea',
  amount_minor_units bigint not null default 0,
  currency text not null default 'USD',
  metadata jsonb default '{}'::jsonb,
  booking_date timestamptz,
  created_at timestamptz not null default now(),
  constraint bookings_pkey primary key (id),
  constraint bookings_booking_type_check check (
    booking_type in ('flight', 'train', 'bus', 'accommodation', 'activity', 'rental', 'other')
  ),
  constraint bookings_status_check check (
    status in ('idea', 'researching', 'price_selected', 'booked', 'cancelled', 'completed')
  )
);

create table if not exists public.packing_items (
  id uuid not null default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  assigned_to_user_id uuid references public.profiles (id) on delete set null,
  category text not null,
  item_name text not null,
  is_packed boolean not null default false,
  is_suggested boolean not null default false,
  created_at timestamptz not null default now(),
  constraint packing_items_pkey primary key (id)
);

create table if not exists public.documents (
  id uuid not null default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  category text not null,
  storage_path text not null,
  file_size_bytes bigint not null default 0,
  mime_type text not null,
  created_at timestamptz not null default now(),
  constraint documents_pkey primary key (id)
);

-- Access-path indexes for the query shapes the app ships with (trip-scoped
-- listing, ordered activity timeline, role lookups). The unique constraint on
-- (trip_id, user_id) already created its backing index above.
create index if not exists idx_itinerary_activities_day_order
  on public.itinerary_activities using btree (day_id, sort_order);
create index if not exists idx_itinerary_activities_geom
  on public.itinerary_activities using gist (geom);
