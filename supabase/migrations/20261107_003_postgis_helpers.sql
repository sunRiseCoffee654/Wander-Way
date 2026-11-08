-- WanderWay PostGIS helpers (Phase 2).
-- Keeps itinerary_activities.geom in sync with the resolved latitude/longitude
-- so spatial queries (nearby places, geodesic distances, map clustering) always
-- see the geometry the row claims. Idempotent.

create or replace function public.sync_activity_geom()
  returns trigger
  language plpgsql
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

drop trigger if exists trg_sync_activity_geom on public.itinerary_activities;
create trigger trg_sync_activity_geom
  before insert or update on public.itinerary_activities
  for each row execute function public.sync_activity_geom();
