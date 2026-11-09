"use server";

import { createClient } from "@/lib/supabase/server";
import {
  activityStore,
  getActivitiesForDay,
  resetActivityStore as resetActivityStoreInternal,
  seedActivityStore as seedActivityStoreInternal,
  type Activity,
} from "./store";

export type { Activity };

export interface NewActivityInput {
  trip_id: string;
  day_id: string;
  title: string;
  planned_time?: string | null;
  duration_minutes?: number;
  place_name?: string | null;
  place_category?: string | null;
  booking_requirement?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geoapify_place_id?: string | null;
  sort_order?: number;
  is_must_see?: boolean;
  travel_mode_to_next?: string | null;
}

export interface ActivityActionResult {
  success: boolean;
  activity: Activity;
  data: Activity;
  error?: string;
}

export interface DeleteActivityResult {
  success: boolean;
  activityId: string;
  error?: string;
}

export interface ReorderActivitiesResult {
  success: boolean;
  orderedActivityIds: string[];
  error?: string;
}

/**
 * Reset memory store (primarily for unit tests and local isolation)
 */
export async function resetActivityStore(): Promise<void> {
  await resetActivityStoreInternal();
}

/**
 * Seed store with activities
 */
export async function seedActivityStore(activities: Activity[]): Promise<void> {
  await seedActivityStoreInternal(activities);
}

function isDemoTripId(tripId: string): boolean {
  return (
    tripId.startsWith("trip-test-") ||
    tripId.startsWith("mock-") ||
    tripId === "kyoto-autumn-2025" ||
    tripId === "default"
  );
}

function validateCoordinates(latitude?: number | null, longitude?: number | null): void {
  if (latitude !== undefined && latitude !== null) {
    if (typeof latitude !== "number" || isNaN(latitude) || latitude < -90 || latitude > 90) {
      throw new Error("Latitude must be between -90 and 90 degrees.");
    }
  }
  if (longitude !== undefined && longitude !== null) {
    if (typeof longitude !== "number" || isNaN(longitude) || longitude < -180 || longitude > 180) {
      throw new Error("Longitude must be between -180 and 180 degrees.");
    }
  }
}

function validateDuration(duration_minutes?: number | null): void {
  if (duration_minutes !== undefined && duration_minutes !== null) {
    if (typeof duration_minutes !== "number" || isNaN(duration_minutes) || duration_minutes <= 0) {
      throw new Error("duration_minutes must be greater than 0.");
    }
  }
}

/**
 * Creates a new activity.
 * Invariant: User actions strictly enforce `is_user_edited = true`.
 */
export async function createActivityAction(
  activityData: NewActivityInput,
): Promise<ActivityActionResult> {
  if (!activityData.trip_id?.trim() || !activityData.day_id?.trim() || !activityData.title?.trim()) {
    throw new Error("Missing required activity parameters (trip_id, day_id, or title).");
  }

  validateCoordinates(activityData.latitude, activityData.longitude);
  validateDuration(activityData.duration_minutes);

  // Compute default sort order if not provided
  let sortOrder = activityData.sort_order;
  if (typeof sortOrder !== "number") {
    const existingForDay = getActivitiesForDay(activityData.day_id);
    sortOrder = existingForDay.length > 0
      ? Math.max(...existingForDay.map((a) => a.sort_order)) + 1
      : 1;
  }

  const newActivityId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const now = new Date().toISOString();

  const activityRecord: Activity = {
    id: newActivityId,
    trip_id: activityData.trip_id.trim(),
    day_id: activityData.day_id.trim(),
    title: activityData.title.trim(),
    planned_time: activityData.planned_time || null,
    duration_minutes: activityData.duration_minutes ?? 60,
    place_name: activityData.place_name || null,
    place_category: activityData.place_category || null,
    booking_requirement: activityData.booking_requirement || null,
    description: activityData.description || null,
    latitude: activityData.latitude ?? null,
    longitude: activityData.longitude ?? null,
    geoapify_place_id: activityData.geoapify_place_id || null,
    geom: null,
    sort_order: sortOrder,
    order_index: sortOrder,
    is_must_see: activityData.is_must_see ?? false,
    // INVARIANT: User additions always outrank AI generation
    is_user_edited: true,
    travel_mode_to_next: activityData.travel_mode_to_next || null,
    transit_distance_meters: null,
    transit_duration_seconds: null,
    proposal_id: null,
    source: "user",
    created_at: now,
    updated_at: now,
  };

  // Attempt Supabase insert if not a demo trip
  if (!isDemoTripId(activityData.trip_id)) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("itinerary_activities")
          .insert({
            id: activityRecord.id,
            trip_id: activityRecord.trip_id,
            day_id: activityRecord.day_id,
            title: activityRecord.title,
            planned_time: activityRecord.planned_time,
            duration_minutes: activityRecord.duration_minutes,
            place_name: activityRecord.place_name,
            place_category: activityRecord.place_category,
            booking_requirement: activityRecord.booking_requirement,
            description: activityRecord.description,
            latitude: activityRecord.latitude,
            longitude: activityRecord.longitude,
            geoapify_place_id: activityRecord.geoapify_place_id,
            sort_order: activityRecord.sort_order,
            is_must_see: activityRecord.is_must_see,
            is_user_edited: true,
            travel_mode_to_next: activityRecord.travel_mode_to_next,
            source: "user",
          })
          .select()
          .maybeSingle();

        if (!error && data) {
          const syncedActivity: Activity = {
            ...(data as Activity),
            order_index: data.sort_order,
            is_user_edited: true,
          };
          activityStore.set(syncedActivity.id, syncedActivity);
          return { success: true, activity: syncedActivity, data: syncedActivity };
        }
      }
    } catch {
      // Fall through to memory store on DB/session error
    }
  }

  activityStore.set(activityRecord.id, activityRecord);
  return { success: true, activity: activityRecord, data: activityRecord };
}

/**
 * Updates an existing activity.
 * Invariant: User edits always set `is_user_edited = true`.
 */
export async function updateActivityAction(
  activityId: string,
  updates: Partial<Activity>,
): Promise<ActivityActionResult> {
  if (!activityId || !activityId.trim()) {
    throw new Error("Missing activityId for update.");
  }

  validateCoordinates(updates.latitude, updates.longitude);
  validateDuration(updates.duration_minutes);

  let existing = activityStore.get(activityId);
  const now = new Date().toISOString();

  // If not in local store, try fetching from Supabase for real trips
  if (!existing) {
    try {
      const supabase = await createClient();
      const { data: act } = await supabase
        .from("itinerary_activities")
        .select("*")
        .eq("id", activityId)
        .maybeSingle();
      if (act) {
        const loadedAct: Activity = {
          ...(act as Activity),
          order_index: act.sort_order,
        };
        existing = loadedAct;
        activityStore.set(loadedAct.id, loadedAct);
      }
    } catch {
      // Ignore
    }
  }

  if (!existing) {
    throw new Error(`Activity with id "${activityId}" not found.`);
  }

  // Invariant enforcement: is_user_edited is unconditionally true
  const sanitizedUpdates: Partial<Activity> = {
    ...updates,
    is_user_edited: true,
    updated_at: now,
  };

  const updatedRecord: Activity = {
    ...existing,
    ...sanitizedUpdates,
    sort_order: sanitizedUpdates.sort_order ?? existing.sort_order,
    order_index: sanitizedUpdates.sort_order ?? existing.sort_order,
    is_user_edited: true,
    updated_at: now,
  };

  const tripId = updatedRecord.trip_id;
  if (!isDemoTripId(tripId)) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("itinerary_activities")
          .update({
            ...updates,
            is_user_edited: true,
            updated_at: now,
          })
          .eq("id", activityId)
          .select()
          .maybeSingle();

        if (!error && data) {
          const synced: Activity = {
            ...(data as Activity),
            order_index: data.sort_order,
            is_user_edited: true,
          };
          activityStore.set(synced.id, synced);
          return { success: true, activity: synced, data: synced };
        }
      }
    } catch {
      // Fall through to memory store
    }
  }

  activityStore.set(updatedRecord.id, updatedRecord);
  return { success: true, activity: updatedRecord, data: updatedRecord };
}

/**
 * Deletes an activity by id.
 */
export async function deleteActivityAction(
  activityId: string,
): Promise<DeleteActivityResult> {
  if (!activityId || !activityId.trim()) {
    throw new Error("Missing activityId for deletion.");
  }

  let existing = activityStore.get(activityId);

  // If not found in memory, try checking Supabase
  if (!existing) {
    try {
      const supabase = await createClient();
      const { data: act } = await supabase
        .from("itinerary_activities")
        .select("*")
        .eq("id", activityId)
        .maybeSingle();
      if (act) {
        existing = act as Activity;
      }
    } catch {
      // Ignore
    }
  }

  if (!existing) {
    throw new Error(`Activity with id "${activityId}" not found.`);
  }

  const tripId = existing.trip_id || "";

  if (tripId && !isDemoTripId(tripId)) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("itinerary_activities").delete().eq("id", activityId);
      }
    } catch {
      // Fall through
    }
  }

  activityStore.delete(activityId);
  return { success: true, activityId };
}

/**
 * Reorders activities within a day.
 * Sets sequential sort_order (1-based) and marks `is_user_edited = true`.
 */
export async function reorderActivitiesAction(
  dayId: string,
  orderedActivityIds: string[],
): Promise<ReorderActivitiesResult> {
  if (!dayId || !dayId.trim() || !Array.isArray(orderedActivityIds) || orderedActivityIds.length === 0) {
    throw new Error("Invalid parameters for reorderActivitiesAction.");
  }

  // Validate that all activities exist and belong to this day
  for (const actId of orderedActivityIds) {
    let existing = activityStore.get(actId);
    if (!existing) {
      try {
        const supabase = await createClient();
        const { data: act } = await supabase
          .from("itinerary_activities")
          .select("*")
          .eq("id", actId)
          .maybeSingle();
        if (act) {
          existing = act as Activity;
          activityStore.set(act.id, existing);
        }
      } catch {
        // Ignore
      }
    }

    if (!existing) {
      throw new Error(`Activity with id "${actId}" not found.`);
    }

    if (existing.day_id !== dayId) {
      throw new Error(`Activity "${actId}" does not belong to day "${dayId}".`);
    }
  }

  const now = new Date().toISOString();

  // Update in-memory fallback store
  for (let i = 0; i < orderedActivityIds.length; i++) {
    const actId = orderedActivityIds[i];
    const existing = activityStore.get(actId);
    if (existing) {
      activityStore.set(actId, {
        ...existing,
        sort_order: i + 1,
        order_index: i + 1,
        is_user_edited: true,
        updated_at: now,
      });
    }
  }

  // Attempt Supabase batch update if possible
  try {
    const firstAct = activityStore.get(orderedActivityIds[0]);
    const tripId = firstAct?.trip_id;
    if (tripId && !isDemoTripId(tripId)) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        for (let i = 0; i < orderedActivityIds.length; i++) {
          await supabase
            .from("itinerary_activities")
            .update({
              sort_order: i + 1,
              is_user_edited: true,
              updated_at: now,
            })
            .eq("id", orderedActivityIds[i]);
        }
      }
    }
  } catch {
    // Graceful fallback
  }

  return { success: true, orderedActivityIds };
}
