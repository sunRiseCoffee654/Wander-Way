/**
 * Synchronization helpers for Itinerary Timeline and Vector Map
 * (PRD v3.0 Compliance — Grounded coordinates and deterministic matching)
 */

import type { WaypointItem } from "./transit-geometry";

export interface ActivitySyncInput {
  id: string;
  title: string;
  latitude: number | null;
  longitude: number | null;
  planned_time?: string | null;
  sort_order?: number | null;
  proposal_id?: string | null;
}

/**
 * Extracts and filters waypoints that have valid geographic coordinates.
 * Strictly adheres to PRD v3.0 data provenance rules: no invented coordinates.
 */
export function extractWaypointsFromActivities(
  activities: ActivitySyncInput[],
): WaypointItem[] {
  const sorted = [...activities].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const validWaypoints: WaypointItem[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const act = sorted[i];
    if (
      act.latitude !== null &&
      act.longitude !== null &&
      !isNaN(act.latitude) &&
      !isNaN(act.longitude)
    ) {
      validWaypoints.push({
        id: act.id,
        step: validWaypoints.length + 1,
        title: act.title,
        lat: act.latitude,
        lng: act.longitude,
        time: act.planned_time || null,
        isAi: Boolean(act.proposal_id),
      });
    }
  }

  return validWaypoints;
}

/**
 * Resolves the deterministic DOM element ID for the activity card on the timeline.
 */
export function resolveSelectedWaypointCardId(activityId: string): string {
  return `activity-card-${activityId}`;
}