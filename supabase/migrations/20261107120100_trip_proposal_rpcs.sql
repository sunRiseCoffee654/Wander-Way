-- Migration: 20261107120100_trip_proposal_rpcs.sql
-- RPC functions for atomic proposal creation and application (UI_UX_PLAN §2.4, §5.4).

create or replace function public.create_trip_proposal(
  p_trip_id uuid,
  p_created_by uuid,
  p_input_snapshot jsonb default '{}'::jsonb,
  p_model text default null,
  p_prompt_version text default null
)
returns public.trip_proposals
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_proposal public.trip_proposals;
begin
  -- Confirm caller has editor access to the trip
  if not (
    exists (
      select 1 from public.trips where id = p_trip_id and owner_id = auth.uid()
    ) or public.is_trip_member(p_trip_id, 'editor')
  ) then
    raise exception 'not_authorized' using hint = 'Must be an owner or editor of the trip';
  end if;

  -- Supersede existing active proposals for this trip
  update public.trip_proposals
  set status = 'superseded'
  where trip_id = p_trip_id
    and status in ('generating', 'pending_review');

  -- Insert new generating proposal
  insert into public.trip_proposals (
    trip_id,
    created_by,
    status,
    stage,
    input_snapshot,
    model,
    prompt_version
  )
  values (
    p_trip_id,
    p_created_by,
    'generating',
    'queued',
    p_input_snapshot,
    p_model,
    p_prompt_version
  )
  returning * into v_proposal;

  return v_proposal;
end;
$$;

create or replace function public.apply_trip_proposal(
  p_proposal_id uuid,
  p_selected_activity_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_proposal public.trip_proposals;
  v_trip public.trips;
  v_day_record jsonb;
  v_act_record jsonb;
  v_day_id uuid;
  v_calendar_date date;
  v_day_number int;
  v_max_sort int;
  v_days_created int := 0;
  v_activities_created int := 0;
  v_activities_skipped int := 0;
begin
  -- 1. Select proposal with row lock
  select * into v_proposal
  from public.trip_proposals
  where id = p_proposal_id
  for update;

  if not found then
    raise exception 'proposal_not_found';
  end if;

  -- 2. Verify status
  if v_proposal.status <> 'pending_review' then
    raise exception 'proposal_not_pending' using hint = 'Proposal is not pending review';
  end if;

  -- 3. Verify caller permission
  if not (
    exists (
      select 1 from public.trips where id = v_proposal.trip_id and owner_id = auth.uid()
    ) or public.is_trip_member(v_proposal.trip_id, 'editor')
  ) then
    raise exception 'not_authorized' using hint = 'Caller does not have editor permission for this trip';
  end if;

  -- Get trip details
  select * into v_trip from public.trips where id = v_proposal.trip_id;

  -- 4. Process days and activities in proposal_data
  if v_proposal.proposal_data ? 'days' then
    for v_day_record in select * from jsonb_array_elements(v_proposal.proposal_data->'days')
    loop
      v_calendar_date := (v_day_record->>'calendar_date')::date;
      v_day_number := (v_day_record->>'day_number')::int;

      -- Check if date is within trip bounds (skip if out of bounds)
      if v_calendar_date < v_trip.start_date or v_calendar_date > v_trip.end_date then
        v_activities_skipped := v_activities_skipped + jsonb_array_length(coalesce(v_day_record->'activities', '[]'::jsonb));
        continue;
      end if;

      -- Find or insert day
      select id into v_day_id
      from public.itinerary_days
      where trip_id = v_proposal.trip_id and calendar_date = v_calendar_date;

      if v_day_id is null then
        insert into public.itinerary_days (
          trip_id,
          day_number,
          calendar_date,
          title
        )
        values (
          v_proposal.trip_id,
          v_day_number,
          v_calendar_date,
          v_day_record->>'title'
        )
        returning id into v_day_id;

        v_days_created := v_days_created + 1;
      end if;

      -- Iterate activities in day
      if v_day_record ? 'activities' then
        for v_act_record in select * from jsonb_array_elements(v_day_record->'activities')
        loop
          -- Only append if selected
          if p_selected_activity_ids is null or (v_act_record->>'id') = any(p_selected_activity_ids) then
            -- Get max sort order in day to append
            select coalesce(max(sort_order), -1) into v_max_sort
            from public.itinerary_activities
            where day_id = v_day_id;

            insert into public.itinerary_activities (
              day_id,
              trip_id,
              title,
              description,
              place_name,
              place_category,
              geoapify_place_id,
              latitude,
              longitude,
              planned_time,
              duration_minutes,
              sort_order,
              travel_mode_to_next,
              transit_distance_meters,
              transit_duration_seconds,
              is_user_edited,
              is_must_see,
              booking_requirement,
              source,
              proposal_id
            )
            values (
              v_day_id,
              v_proposal.trip_id,
              coalesce(v_act_record->>'title', 'Untitled activity'),
              v_act_record->>'description',
              v_act_record->>'place_name',
              v_act_record->>'place_category',
              v_act_record->>'geoapify_place_id',
              (v_act_record->>'latitude')::double precision,
              (v_act_record->>'longitude')::double precision,
              nullif(v_act_record->>'planned_time', '')::time,
              coalesce((v_act_record->>'duration_minutes')::int, 60),
              v_max_sort + 1,
              v_act_record->>'travel_mode_to_next',
              (v_act_record->>'transit_distance_meters')::int,
              (v_act_record->>'transit_duration_seconds')::int,
              false,
              coalesce((v_act_record->>'is_must_see')::boolean, false),
              v_act_record->>'booking_requirement',
              'ai_proposal',
              p_proposal_id
            );

            v_activities_created := v_activities_created + 1;
          else
            v_activities_skipped := v_activities_skipped + 1;
          end if;
        end loop;
      end if;
    end loop;
  end if;

  -- 5. Update proposal status
  update public.trip_proposals
  set status = 'applied',
      applied_at = now()
  where id = p_proposal_id;

  return jsonb_build_object(
    'success', true,
    'days_created', v_days_created,
    'activities_created', v_activities_created,
    'activities_skipped', v_activities_skipped
  );
end;
$$;

grant execute on function public.create_trip_proposal to authenticated;
grant execute on function public.apply_trip_proposal to authenticated;
