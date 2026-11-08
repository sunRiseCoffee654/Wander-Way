-- Migration: 20261108100000_fix_proposal_booking_hint.sql
-- Fixes booking_hint data loss and adds formatted_address, match_tier, and notes to itinerary_activities

alter table public.itinerary_activities
  add column if not exists formatted_address text,
  add column if not exists match_tier text,
  add column if not exists notes text;

create or replace function public.apply_trip_proposal(
  p_proposal_id uuid,
  p_trip_id uuid,
  p_selected_activity_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_proposal record;
  v_day_record jsonb;
  v_act_record jsonb;
  v_day_id uuid;
  v_max_sort int;
  v_days_created int := 0;
  v_activities_created int := 0;
  v_activities_skipped int := 0;
begin
  -- 1. Lock and retrieve proposal with pessimistic row lock
  select * into v_proposal
  from public.trip_proposals
  where id = p_proposal_id and trip_id = p_trip_id
  for update;

  if not found then
    raise exception 'proposal_not_found';
  end if;

  if v_proposal.status != 'pending_review' then
    raise exception 'proposal_not_pending';
  end if;

  -- 2. Verify caller has editor access
  if not public.is_trip_member(p_trip_id, 'editor') then
    raise exception 'insufficient_privileges';
  end if;

  -- 3. Iterate through proposed days
  if v_proposal.proposal_data is not null and v_proposal.proposal_data ? 'days' then
    for v_day_record in select * from jsonb_array_elements(v_proposal.proposal_data->'days')
    loop
      -- Find or insert the itinerary_day
      select id into v_day_id
      from public.itinerary_days
      where trip_id = p_trip_id
        and (
          (v_day_record->>'calendar_date' is not null and calendar_date = (v_day_record->>'calendar_date')::date)
          or day_number = (v_day_record->>'day_number')::int
        )
      limit 1;

      if v_day_id is null then
        insert into public.itinerary_days (
          trip_id,
          day_number,
          calendar_date,
          theme
        )
        values (
          p_trip_id,
          (v_day_record->>'day_number')::int,
          (v_day_record->>'calendar_date')::date,
          coalesce(v_day_record->>'theme', v_day_record->>'title')
        )
        returning id into v_day_id;

        v_days_created := v_days_created + 1;
      end if;

      -- 4. Iterate through activities for this day
      if v_day_record ? 'activities' then
        for v_act_record in select * from jsonb_array_elements(v_day_record->'activities')
        loop
          -- Only insert if the activity ID is in the user's selected list
          if (v_act_record->>'id') = any(p_selected_activity_ids) then
            -- Get max current sort_order to append safely
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
              formatted_address,
              match_tier,
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
              notes,
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
              v_act_record->>'formatted_address',
              v_act_record->>'match_tier',
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
              coalesce(v_act_record->>'booking_hint', v_act_record->>'booking_requirement'),
              v_act_record->>'notes',
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
