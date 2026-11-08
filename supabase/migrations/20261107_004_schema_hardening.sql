-- WanderWay Phase 2 hardening.
-- Reconciles the captured baseline with the canonical product vocabulary and
-- tightens integrity + access paths. Idempotent.
--
-- 1. Vocabulary alignment
-- 2. Uniqueness: one day number / calendar date per trip
-- 3. Access-path indexes for trip-scoped queries and role lookups
-- 4. updated_at maintenance triggers
-- 5. Owner membership invariant (trip row always has its owner member row)
-- 6. Cross-trip link guards (activities ↔ days, budget lines ↔ activities)
-- 7. FX rate sanity
-- 8. SECURITY DEFINER search_path hygiene for the auth bootstrap trigger

-- 1. Trip lifecycle (PRD 7.x): state names carry 'cancelled' alongside the
--    lifecycle used by the app (draft → upcoming → active → completed →
--    archived/cancelled).
alter table public.trips drop constraint if exists trips_trip_state_check;
alter table public.trips add constraint trips_trip_state_check
  check (trip_state in ('draft', 'upcoming', 'active', 'completed', 'cancelled', 'archived'));

-- Travel pace vocabulary follows UI_UX_PLAN §3.3: relaxed / balanced / full.
alter table public.trips drop constraint if exists trips_travel_pace_check;
alter table public.trips add constraint trips_travel_pace_check
  check (travel_pace in ('relaxed', 'balanced', 'full'));

-- 2. One day number and one calendar date per trip.
create unique index if not exists itinerary_days_trip_id_day_number_key
  on public.itinerary_days using btree (trip_id, day_number);
create unique index if not exists itinerary_days_trip_id_calendar_date_key
  on public.itinerary_days using btree (trip_id, calendar_date);

-- 3. Indexes for the shapes the app queries: owner dashboards, state filters,
--    role lookups, trip-scoped lists, quote funnels, packing assignment.
create index if not exists idx_trips_owner_id
  on public.trips using btree (owner_id);
create index if not exists idx_trips_trip_state
  on public.trips using btree (trip_state);
create index if not exists idx_trip_members_user_id
  on public.trip_members using btree (user_id);
create index if not exists idx_itinerary_activities_trip_id
  on public.itinerary_activities using btree (trip_id);
create index if not exists idx_budget_line_items_trip_id
  on public.budget_line_items using btree (trip_id);
create index if not exists idx_budget_line_items_activity_id
  on public.budget_line_items using btree (activity_id);
create index if not exists idx_bookings_trip_status
  on public.bookings using btree (trip_id, status);
create index if not exists idx_packing_items_trip_id
  on public.packing_items using btree (trip_id);
create index if not exists idx_packing_items_assigned_to
  on public.packing_items using btree (assigned_to_user_id);
create index if not exists idx_documents_trip_id
  on public.documents using btree (trip_id);

-- 4. updated_at maintenance for tables that carry the column.
create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  set search_path = 'public'
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_trips_set_updated_at on public.trips;
create trigger trg_trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

drop trigger if exists trg_activities_set_updated_at on public.itinerary_activities;
create trigger trg_activities_set_updated_at
  before update on public.itinerary_activities
  for each row execute function public.set_updated_at();

-- 5. Every trip always has an owner row in trip_members: RLS membership checks
--    and future share flows can trust the roster as the single source of truth.
create or replace function public.add_owner_member()
  returns trigger
  language plpgsql
  security definer
  set search_path = 'public'
as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (trip_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_add_owner_member on public.trips;
create trigger trg_add_owner_member
  after insert on public.trips
  for each row execute function public.add_owner_member();

-- 6. Cross-trip link guards. RLS editors can (in principle) write rows whose
-- day/activity reference points into another trip; these triggers close that
-- direct-SQL/service-role edge and keep every joined trip honest.
create or replace function public.validate_activity_day()
  returns trigger
  language plpgsql
  security definer
  set search_path = 'public'
as $$
begin
  if not exists (
    select 1 from public.itinerary_days
    where id = new.day_id and trip_id = new.trip_id
  ) then
    raise exception 'activity day does not belong to the same trip';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_activity_day on public.itinerary_activities;
create trigger trg_validate_activity_day
  before insert or update on public.itinerary_activities
  for each row execute function public.validate_activity_day();

create or replace function public.validate_budget_activity()
  returns trigger
  language plpgsql
  security definer
  set search_path = 'public'
as $$
begin
  if new.activity_id is not null and not exists (
    select 1 from public.itinerary_activities
    where id = new.activity_id and trip_id = new.trip_id
  ) then
    raise exception 'budget line activity does not belong to the same trip';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_budget_activity on public.budget_line_items;
create trigger trg_validate_budget_activity
  before insert or update on public.budget_line_items
  for each row execute function public.validate_budget_activity();

-- 7. Retained FX rates must be strictly positive to keep minor-unit math valid.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'budget_line_items_fx_rate_positive_check'
  ) then
    alter table public.budget_line_items add constraint budget_line_items_fx_rate_positive_check
      check (fx_rate_to_trip_currency is null or fx_rate_to_trip_currency > 0);
  end if;
end;
$$;

-- 8. Supabase security advisor hygiene: the auth bootstrap function is
-- SECURITY DEFINER, so pin its search_path. Body unchanged.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = 'public'
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
