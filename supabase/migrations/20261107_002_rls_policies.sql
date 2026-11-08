-- WanderWay RLS + zero-trust membership (Phase 2, baseline capture).
-- Captures the policy state as of 2026-11-07. Idempotent: policies are
-- dropped and recreated; RLS enablement is declarative.
--
-- Access matrix (authenticated users only; anon/default-deny by absence of
-- policies):
--
--   role       trips   members   days/   budget   bookings   packing   docs
--                                activities & lines
--   owner     CRUD     CRUD      CRUD    CRUD       CRUD      CRUD      CRUD*
--   editor    update   view      CRUD    CRUD       CRUD      CRUD      CRUD*
--   viewer    view     view      view    view       view     CRUD       view
--   others    none     none      none    none       none     none       none
--
--   * documents delete is additionally restricted to the uploader or owner.
--
-- Membership is resolved through trusted database relationships inside a
-- SECURITY DEFINER helper so policy evaluation never recurses into RLS.

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.itinerary_activities enable row level security;
alter table public.budget_line_items enable row level security;
alter table public.bookings enable row level security;
alter table public.packing_items enable row level security;
alter table public.documents enable row level security;

-- Replaces any prior definition; signature is shared with every policy below.
create or replace function public.is_trip_member(lookup_trip_id uuid, min_role text default 'viewer')
  returns boolean
  language sql
  stable
  security definer
  set search_path = 'public'
as $$
  select exists (
    select 1 from public.trips where id = lookup_trip_id and owner_id = auth.uid()
  ) or exists (
    select 1 from public.trip_members
    where trip_id = lookup_trip_id and user_id = auth.uid()
    and (
      min_role = 'viewer'
      or (min_role = 'editor' and role in ('owner', 'editor'))
      or (min_role = 'owner' and role = 'owner')
    )
  );
$$;

-- Profiles: self-service rows; authenticated users may read them (needed for
-- future share/invite flows). No delete policy: profiles are not deletable.
drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trips: owner is authoritative; editors may update; others nothing.
drop policy if exists "Users can create their own trips" on public.trips;
create policy "Users can create their own trips"
  on public.trips
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Users can view trips they own or participate in" on public.trips;
create policy "Users can view trips they own or participate in"
  on public.trips
  for select
  to authenticated
  using (owner_id = auth.uid() or is_trip_member(id, 'viewer'));

drop policy if exists "Owners and editors can update trips" on public.trips;
create policy "Owners and editors can update trips"
  on public.trips
  for update
  to authenticated
  using (owner_id = auth.uid() or is_trip_member(id, 'editor'))
  with check (owner_id = auth.uid() or is_trip_member(id, 'editor'));

drop policy if exists "Only owners can delete trips" on public.trips;
create policy "Only owners can delete trips"
  on public.trips
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- Trip members: owner manages roster; members can see it; anyone may leave.
drop policy if exists "Members can view other members of their trip" on public.trip_members;
create policy "Members can view other members of their trip"
  on public.trip_members
  for select
  to authenticated
  using (is_trip_member(trip_id, 'viewer'));

drop policy if exists "Only trip owners can add members" on public.trip_members;
create policy "Only trip owners can add members"
  on public.trip_members
  for insert
  to authenticated
  with check (is_trip_member(trip_id, 'owner'));

drop policy if exists "Only trip owners can update member roles" on public.trip_members;
create policy "Only trip owners can update member roles"
  on public.trip_members
  for update
  to authenticated
  using (is_trip_member(trip_id, 'owner'))
  with check (is_trip_member(trip_id, 'owner'));

drop policy if exists "Owners can remove members or members can remove themselves" on public.trip_members;
create policy "Owners can remove members or members can remove themselves"
  on public.trip_members
  for delete
  to authenticated
  using (is_trip_member(trip_id, 'owner') or user_id = auth.uid());

-- Itinerary days.
drop policy if exists "Members can view itinerary days" on public.itinerary_days;
create policy "Members can view itinerary days"
  on public.itinerary_days
  for select
  to authenticated
  using (is_trip_member(trip_id, 'viewer'));

drop policy if exists "Owners and editors can insert itinerary days" on public.itinerary_days;
create policy "Owners and editors can insert itinerary days"
  on public.itinerary_days
  for insert
  to authenticated
  with check (is_trip_member(trip_id, 'editor'));

drop policy if exists "Owners and editors can update itinerary days" on public.itinerary_days;
create policy "Owners and editors can update itinerary days"
  on public.itinerary_days
  for update
  to authenticated
  using (is_trip_member(trip_id, 'editor'))
  with check (is_trip_member(trip_id, 'editor'));

drop policy if exists "Owners and editors can delete itinerary days" on public.itinerary_days;
create policy "Owners and editors can delete itinerary days"
  on public.itinerary_days
  for delete
  to authenticated
  using (is_trip_member(trip_id, 'editor'));

-- Itinerary activities.
drop policy if exists "Members can view itinerary activities" on public.itinerary_activities;
create policy "Members can view itinerary activities"
  on public.itinerary_activities
  for select
  to authenticated
  using (is_trip_member(trip_id, 'viewer'));

drop policy if exists "Owners and editors can insert itinerary activities" on public.itinerary_activities;
create policy "Owners and editors can insert itinerary activities"
  on public.itinerary_activities
  for insert
  to authenticated
  with check (is_trip_member(trip_id, 'editor'));

drop policy if exists "Owners and editors can update itinerary activities" on public.itinerary_activities;
create policy "Owners and editors can update itinerary activities"
  on public.itinerary_activities
  for update
  to authenticated
  using (is_trip_member(trip_id, 'editor'))
  with check (is_trip_member(trip_id, 'editor'));

drop policy if exists "Owners and editors can delete itinerary activities" on public.itinerary_activities;
create policy "Owners and editors can delete itinerary activities"
  on public.itinerary_activities
  for delete
  to authenticated
  using (is_trip_member(trip_id, 'editor'));

-- Budget line items.
drop policy if exists "Members can view budget line items" on public.budget_line_items;
create policy "Members can view budget line items"
  on public.budget_line_items
  for select
  to authenticated
  using (is_trip_member(trip_id, 'viewer'));

drop policy if exists "Owners and editors can insert budget line items" on public.budget_line_items;
create policy "Owners and editors can insert budget line items"
  on public.budget_line_items
  for insert
  to authenticated
  with check (is_trip_member(trip_id, 'editor'));

drop policy if exists "Owners and editors can update budget line items" on public.budget_line_items;
create policy "Owners and editors can update budget line items"
  on public.budget_line_items
  for update
  to authenticated
  using (is_trip_member(trip_id, 'editor'))
  with check (is_trip_member(trip_id, 'editor'));

drop policy if exists "Owners and editors can delete budget line items" on public.budget_line_items;
create policy "Owners and editors can delete budget line items"
  on public.budget_line_items
  for delete
  to authenticated
  using (is_trip_member(trip_id, 'editor'));

-- Bookings.
drop policy if exists "Members can view bookings" on public.bookings;
create policy "Members can view bookings"
  on public.bookings
  for select
  to authenticated
  using (is_trip_member(trip_id, 'viewer'));

drop policy if exists "Owners and editors can manage bookings" on public.bookings;
create policy "Owners and editors can manage bookings"
  on public.bookings
  for all
  to authenticated
  using (is_trip_member(trip_id, 'editor'))
  with check (is_trip_member(trip_id, 'editor'));

-- Packing list: every member of the trip can manage their checklist.
drop policy if exists "Members can view and manage packing items" on public.packing_items;
create policy "Members can view and manage packing items"
  on public.packing_items
  for all
  to authenticated
  using (is_trip_member(trip_id, 'viewer'))
  with check (is_trip_member(trip_id, 'viewer'));

-- Documents: editable by editors; deleting is additionally limited to the
-- uploader or the trip owner.
drop policy if exists "Members can view trip documents" on public.documents;
create policy "Members can view trip documents"
  on public.documents
  for select
  to authenticated
  using (is_trip_member(trip_id, 'viewer'));

drop policy if exists "Owners and editors can upload documents" on public.documents;
create policy "Owners and editors can upload documents"
  on public.documents
  for insert
  to authenticated
  with check (is_trip_member(trip_id, 'editor'));

drop policy if exists "Owners and editors can update documents" on public.documents;
create policy "Owners and editors can update documents"
  on public.documents
  for update
  to authenticated
  using (is_trip_member(trip_id, 'editor'))
  with check (is_trip_member(trip_id, 'editor'));

drop policy if exists "Uploaders and owners can delete documents" on public.documents;
create policy "Uploaders and owners can delete documents"
  on public.documents
  for delete
  to authenticated
  using (uploaded_by = auth.uid() or is_trip_member(trip_id, 'owner'));

-- Profiles bootstrap: every new auth user gets a profile row.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
