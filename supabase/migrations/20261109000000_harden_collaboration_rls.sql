-- ==============================================================================
-- Migration: 20261109000000_harden_collaboration_rls.sql
-- Description: Harden RLS policies for trip invitations and activity proposals.
-- Prevents system-wide invitation harvesting and privilege escalation.
-- ==============================================================================

-- 1. Restrict trip_invitations SELECT:
-- Drop overly permissive policy that allowed viewing any pending invitation globally
drop policy if exists "Members and invitees can view invitations" on public.trip_invitations;

create policy "Trip members and targeted invitees can view invitations"
  on public.trip_invitations for select to authenticated
  using (
    public.is_trip_member(trip_id, 'viewer')
    or inviter_id = (select auth.uid())
    or (
      invitee_email is not null
      and lower(invitee_email) = lower((select auth.jwt()->>'email'))
    )
  );

-- 2. Restrict trip_invitations UPDATE:
-- Drop update policy that allowed any user to mutate pending invitations
drop policy if exists "Trip owners can manage invitations" on public.trip_invitations;

create policy "Trip owners and inviter can manage invitations"
  on public.trip_invitations for update to authenticated
  using (
    public.is_trip_member(trip_id, 'owner')
    or inviter_id = (select auth.uid())
  )
  with check (
    public.is_trip_member(trip_id, 'owner')
    or inviter_id = (select auth.uid())
  );

-- 3. Restrict trip_activity_proposals UPDATE:
-- Separate editor administration from voter participation
drop policy if exists "Trip members can update proposals (voting)" on public.trip_activity_proposals;

create policy "Trip editors can update proposals"
  on public.trip_activity_proposals for update to authenticated
  using (public.is_trip_member(trip_id, 'editor'))
  with check (public.is_trip_member(trip_id, 'editor'));

create policy "Trip viewers can vote on pending proposals"
  on public.trip_activity_proposals for update to authenticated
  using (
    public.is_trip_member(trip_id, 'viewer')
    and status = 'pending'
  )
  with check (
    public.is_trip_member(trip_id, 'viewer')
    and status = 'pending'
  );

-- 4. Secure RPC to fetch invitation details safely by code (for invite acceptance)
create or replace function public.get_invitation_by_code(p_code text)
returns table (
  id uuid,
  trip_id uuid,
  inviter_id uuid,
  role text,
  status text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    i.id,
    i.trip_id,
    i.inviter_id,
    i.role,
    i.status,
    i.expires_at
  from public.trip_invitations i
  where i.invitation_code = p_code
    and i.status = 'pending'
    and i.expires_at > now();
end;
$$;

-- Grant execution to authenticated users
grant execute on function public.get_invitation_by_code(text) to authenticated;
