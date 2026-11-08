-- WanderWay Phase 2 advisor remediations (idempotent).
-- Resolves the Supabase linter findings surfaced after the baseline capture:
--
--   * security/function_search_path_mutable for sync_activity_geom
--   * security/rls_disabled_in_public (spatial_ref_sys) via moving PostGIS to
--     the recommended `extensions` schema
--   * security/*_security_definer_function_executable for our trigger-only
--     and policy helper functions
--   * performance/auth_rls_initplan: policies wrap auth.uid() in a select
--   * performance/multiple_permissive_policies on bookings (split the ALL
--     policy into insert/update/delete)
--   * performance/unindexed_foreign_keys for paid_by_user_id and uploaded_by

-- PostGIS in `extensions`: clears rls_disabled_in_public (spatial_ref_sys) and
-- extension_in_public. PostGIS is not relocatable (`SET SCHEMA` unsupported),
-- so on this empty database we drop the geometry column + extension and
-- reinstall it in the recommended `extensions` schema, then rebuild the column,
-- index and trigger. Rolls back atomically on any failure.
alter table public.itinerary_activities drop column if exists geom;
drop extension if exists postgis;
create extension postgis with schema extensions;
alter table public.itinerary_activities add column geom extensions.geometry(Point, 4326);
create index if not exists idx_itinerary_activities_geom
  on public.itinerary_activities using gist (geom);

-- Geometry sync trigger now resolves PostGIS helpers through both placed
-- schemas, regardless of install location.
create or replace function public.sync_activity_geom()
  returns trigger
  language plpgsql
  set search_path = 'public, extensions'
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.geom := extensions.st_setsrid(extensions.st_makepoint(new.longitude, new.latitude), 4326);
  else
    new.geom := null;
  end if;
  return new;
end;
$$;

-- auth_rls_initplan: single init-plan evaluation for auth.uid().
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can create their own trips" on public.trips;
create policy "Users can create their own trips"
  on public.trips
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "Users can view trips they own or participate in" on public.trips;
create policy "Users can view trips they own or participate in"
  on public.trips
  for select
  to authenticated
  using (owner_id = (select auth.uid()) or is_trip_member(id, 'viewer'));

drop policy if exists "Owners and editors can update trips" on public.trips;
create policy "Owners and editors can update trips"
  on public.trips
  for update
  to authenticated
  using (owner_id = (select auth.uid()) or is_trip_member(id, 'editor'))
  with check (owner_id = (select auth.uid()) or is_trip_member(id, 'editor'));

drop policy if exists "Only owners can delete trips" on public.trips;
create policy "Only owners can delete trips"
  on public.trips
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Owners can remove members or members can remove themselves" on public.trip_members;
create policy "Owners can remove members or members can remove themselves"
  on public.trip_members
  for delete
  to authenticated
  using (is_trip_member(trip_id, 'owner') or user_id = (select auth.uid()));

drop policy if exists "Uploaders and owners can delete documents" on public.documents;
create policy "Uploaders and owners can delete documents"
  on public.documents
  for delete
  to authenticated
  using (uploaded_by = (select auth.uid()) or is_trip_member(trip_id, 'owner'));

-- multiple_permissive_policies: the ALL policy overlapped the SELECT one.
drop policy if exists "Owners and editors can manage bookings" on public.bookings;
create policy "Owners and editors can insert bookings"
  on public.bookings
  for insert
  to authenticated
  with check (is_trip_member(trip_id, 'editor'));

create policy "Owners and editors can update bookings"
  on public.bookings
  for update
  to authenticated
  using (is_trip_member(trip_id, 'editor'))
  with check (is_trip_member(trip_id, 'editor'));

create policy "Owners and editors can delete bookings"
  on public.bookings
  for delete
  to authenticated
  using (is_trip_member(trip_id, 'editor'));

-- unindexed_foreign_keys.
create index if not exists idx_budget_line_items_paid_by
  on public.budget_line_items using btree (paid_by_user_id);
create index if not exists idx_documents_uploaded_by
  on public.documents using btree (uploaded_by);

-- SECURITY DEFINER hygiene: trigger-only and infrastructure functions are not
-- callable over PostgREST by anon. Authenticated keeps EXECUTE on functions
-- evaluated inside policies/triggered by user DML. The auth bootstrap trigger
-- is granted to the Supabase auth admin role only.
revoke execute on function public.sync_activity_geom() from public;
revoke execute on function public.sync_activity_geom() from anon;
revoke execute on function public.sync_activity_geom() from authenticated;

revoke execute on function public.add_owner_member() from public;
revoke execute on function public.add_owner_member() from anon;

revoke execute on function public.validate_activity_day() from public;
revoke execute on function public.validate_activity_day() from anon;

revoke execute on function public.validate_budget_activity() from public;
revoke execute on function public.validate_budget_activity() from anon;

revoke execute on function public.is_trip_member(lookup_trip_id uuid, min_role text) from public;
revoke execute on function public.is_trip_member(lookup_trip_id uuid, min_role text) from anon;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;
