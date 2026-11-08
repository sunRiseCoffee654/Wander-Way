-- Migration: 20261107120000_trip_proposals.sql
-- Supports independent proposal review lifecycle (UI_UX_PLAN §2.4, PRD §5.4).

create table if not exists public.trip_proposals (
  id uuid not null default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  status text not null default 'generating',
  stage text not null default 'queued',
  error_code text,
  summary text,
  model text,
  prompt_version text,
  generation_ms integer,
  input_snapshot jsonb not null default '{}'::jsonb,
  proposal_data jsonb not null default '{}'::jsonb,
  grounding_stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  applied_at timestamptz,
  constraint trip_proposals_pkey primary key (id),
  constraint trip_proposals_status_check check (
    status in ('generating', 'pending_review', 'applied', 'rejected', 'superseded', 'failed')
  ),
  constraint trip_proposals_stage_check check (
    stage in ('queued', 'drafting', 'grounding', 'routing', 'done')
  )
);

create index if not exists idx_trip_proposals_trip_status
  on public.trip_proposals (trip_id, status);

-- At most one active proposal per trip
create unique index if not exists uq_trip_proposals_one_active
  on public.trip_proposals (trip_id)
  where status in ('generating', 'pending_review');

-- Maintain updated_at using existing trigger function from 20261107_004_schema_hardening.sql
drop trigger if exists trg_trip_proposals_set_updated_at on public.trip_proposals;
create trigger trg_trip_proposals_set_updated_at
  before update on public.trip_proposals
  for each row execute function public.set_updated_at();

-- Add proposal tracking to itinerary_activities
alter table public.itinerary_activities
  add column if not exists proposal_id uuid references public.trip_proposals (id) on delete set null,
  add column if not exists source text not null default 'manual';

-- Enable Row Level Security
alter table public.trip_proposals enable row level security;

-- Policies: Trip owners and editors can read, insert, and update proposals
drop policy if exists "trip_proposals_select_owner_editor" on public.trip_proposals;
create policy "trip_proposals_select_owner_editor"
  on public.trip_proposals for select to authenticated
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_proposals.trip_id
        and (t.owner_id = (select auth.uid()) or public.is_trip_member(t.id, 'editor'))
    )
  );

drop policy if exists "trip_proposals_insert_owner_editor" on public.trip_proposals;
create policy "trip_proposals_insert_owner_editor"
  on public.trip_proposals for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.trips t
      where t.id = trip_proposals.trip_id
        and (t.owner_id = (select auth.uid()) or public.is_trip_member(t.id, 'editor'))
    )
  );

drop policy if exists "trip_proposals_update_owner_editor" on public.trip_proposals;
create policy "trip_proposals_update_owner_editor"
  on public.trip_proposals for update to authenticated
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_proposals.trip_id
        and (t.owner_id = (select auth.uid()) or public.is_trip_member(t.id, 'editor'))
    )
  )
  with check (
    exists (
      select 1 from public.trips t
      where t.id = trip_proposals.trip_id
        and (t.owner_id = (select auth.uid()) or public.is_trip_member(t.id, 'editor'))
    )
  );

-- Clients may only change status (e.g. reject). Content is written by server code/RPCs.
revoke update on public.trip_proposals from authenticated;
grant update (status) on public.trip_proposals to authenticated;
