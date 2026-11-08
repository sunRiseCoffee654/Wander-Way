-- Migration: 20261108140000_group_collaboration_and_chat.sql
-- Milestone 7: Group Talk, Collaborative Hub, Realtime In-Trip Chat, Activity Proposals & Invitations

-- 1. Trip Invitations
create table if not exists public.trip_invitations (
  id uuid not null default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique,
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked')),
  invited_email text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  constraint trip_invitations_pkey primary key (id)
);

create index if not exists idx_trip_invitations_trip_id on public.trip_invitations (trip_id);
create index if not exists idx_trip_invitations_code on public.trip_invitations (invite_code);

-- 2. Trip Messages (Real-time in-trip group chat)
create table if not exists public.trip_messages (
  id uuid not null default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  message_type text not null default 'text' check (message_type in ('text', 'system', 'proposal', 'call_event', 'image')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint trip_messages_pkey primary key (id)
);

create index if not exists idx_trip_messages_trip_created on public.trip_messages (trip_id, created_at asc);
create index if not exists idx_trip_messages_sender on public.trip_messages (sender_id);

-- 3. Trip Activity Proposals (Collaborative changes to activities with peer voting)
create table if not exists public.trip_activity_proposals (
  id uuid not null default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  proposer_id uuid not null references public.profiles (id) on delete cascade,
  day_id uuid references public.itinerary_days (id) on delete cascade,
  proposed_action text not null check (proposed_action in ('add', 'remove', 'modify', 'reorder')),
  target_activity_id uuid references public.itinerary_activities (id) on delete set null,
  proposal_data jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn', 'applied')),
  upvotes uuid[] not null default '{}',
  downvotes uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_activity_proposals_pkey primary key (id)
);

create index if not exists idx_trip_activity_proposals_trip on public.trip_activity_proposals (trip_id, status);

-- Trigger for updated_at on proposals
drop trigger if exists trg_trip_activity_proposals_set_updated_at on public.trip_activity_proposals;
create trigger trg_trip_activity_proposals_set_updated_at
  before update on public.trip_activity_proposals
  for each row execute function public.set_updated_at();

-- 4. Enhance packing_items with notes and quantity if missing
alter table public.packing_items
  add column if not exists notes text,
  add column if not exists quantity integer default 1;

-- 5. Row Level Security Setup
alter table public.trip_invitations enable row level security;
alter table public.trip_messages enable row level security;
alter table public.trip_activity_proposals enable row level security;

-- Invitations RLS:
-- Members can view invitations for their trip, or any authenticated user can view an invitation by its unique code
drop policy if exists "Members and invitees can view invitations" on public.trip_invitations;
create policy "Members and invitees can view invitations"
  on public.trip_invitations for select to authenticated
  using (
    public.is_trip_member(trip_id, 'viewer')
    or (status = 'pending' and expires_at > now())
  );

drop policy if exists "Trip editors and owners can create invitations" on public.trip_invitations;
create policy "Trip editors and owners can create invitations"
  on public.trip_invitations for insert to authenticated
  with check (
    public.is_trip_member(trip_id, 'editor')
    and inviter_id = (select auth.uid())
  );

drop policy if exists "Trip owners can manage invitations" on public.trip_invitations;
create policy "Trip owners can manage invitations"
  on public.trip_invitations for update to authenticated
  using (
    public.is_trip_member(trip_id, 'owner')
    or inviter_id = (select auth.uid())
    or status = 'pending'
  );

-- Messages RLS:
drop policy if exists "Trip members can view messages" on public.trip_messages;
create policy "Trip messages select policy"
  on public.trip_messages for select to authenticated
  using (public.is_trip_member(trip_id, 'viewer'));

drop policy if exists "Trip members can insert messages" on public.trip_messages;
create policy "Trip messages insert policy"
  on public.trip_messages for insert to authenticated
  with check (
    public.is_trip_member(trip_id, 'viewer')
    and sender_id = (select auth.uid())
  );

-- Activity Proposals RLS:
drop policy if exists "Trip members can view proposals" on public.trip_activity_proposals;
create policy "Trip activity proposals select policy"
  on public.trip_activity_proposals for select to authenticated
  using (public.is_trip_member(trip_id, 'viewer'));

drop policy if exists "Trip members can insert proposals" on public.trip_activity_proposals;
create policy "Trip activity proposals insert policy"
  on public.trip_activity_proposals for insert to authenticated
  with check (
    public.is_trip_member(trip_id, 'viewer')
    and proposer_id = (select auth.uid())
  );

drop policy if exists "Trip members can update proposals (voting)" on public.trip_activity_proposals;
create policy "Trip activity proposals update policy"
  on public.trip_activity_proposals for update to authenticated
  using (public.is_trip_member(trip_id, 'viewer'))
  with check (public.is_trip_member(trip_id, 'viewer'));

-- 6. Enable Realtime Replication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.trip_messages;
    alter publication supabase_realtime add table public.trip_activity_proposals;
  end if;
exception when others then
  -- publication add table may fail if already present
  null;
end $$;
