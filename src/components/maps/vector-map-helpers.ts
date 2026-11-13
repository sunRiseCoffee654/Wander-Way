/**
 * Vector Map Helpers for MapLibre GL & Geoapify Integration
 * (PRD v3.0 Compliance — Grounded metrics and clean presentation)
 */

import { formatTransitHoursMinutes, type TransitMode } from "@/lib/itinerary/transit-geometry";

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface MapBoundsResult {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export interface LegBadgeMeta {
  label: string;
  icon: string;
  modeTitle: string;
}

/**
 * Calculates a bounding box enclosing an array of points, adding padding if single point.
 */
export function extractMapBounds(points: LatLngPoint[]): MapBoundsResult | null {
  if (!points || points.length === 0) return null;

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const pt of points) {
    if (typeof pt.lat !== "number" || typeof pt.lng !== "number") continue;
    if (isNaN(pt.lat) || isNaN(pt.lng)) continue;
    if (pt.lng < minLng) minLng = pt.lng;
    if (pt.lng > maxLng) maxLng = pt.lng;
    if (pt.lat < minLat) minLat = pt.lat;
    if (pt.lat > maxLat) maxLat = pt.lat;
  }

  if (minLng === Infinity || minLat === Infinity) return null;

  // Single point case: expand bounds slightly
  if (minLng === maxLng && minLat === maxLat) {
    minLng -= 0.01;
    maxLng += 0.01;
    minLat -= 0.01;
    maxLat += 0.01;
  }

  return { minLng, maxLng, minLat, maxLat };
}

/**
 * Formats a transit leg badge label with distance and time.
 */
export function formatLegBadgeText(
  mode: string,
  distanceMeters: number,
  durationSeconds: number,
): LegBadgeMeta {
  const timeStr = formatTransitHoursMinutes(durationSeconds);
  let distStr = "";

  if (distanceMeters < 1000) {
    distStr = `${Math.round(distanceMeters)}m`;
  } else {
    distStr = `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  switch (mode) {
    case "walk":
      return {
        label: `${distStr} • ${timeStr}`,
        icon: "directions_walk",
        modeTitle: "Walking",
      };
    case "metro":
      return {
        label: `${distStr} • ${timeStr}`,
        icon: "directions_subway",
        modeTitle: "Metro / Rail",
      };
    case "shinkansen":
      return {
        label: `${distStr} • ${timeStr}`,
        icon: "train",
        modeTitle: "Shinkansen Bullet Train",
      };
    case "vande_bharat":
    case "express_rail":
      return {
        label: `${distStr} • ${timeStr}`,
        icon: "train",
        modeTitle: "Vande Bharat / Express Rail",
      };
    case "drive":
    default:
      return {
        label: `${distStr} • ${timeStr}`,
        icon: "directions_car",
        modeTitle: "Drive / Taxi",
      };
  }
}

/**
 * Returns distinct Material 3 color hex for transit modes.
 */
export function getTransitModeColor(mode: TransitMode | string): string {
  switch (mode) {
    case "walk":
      return "#006A60"; // Primary teal
    case "metro":
      return "#4F5B92"; // Indigo
    case "shinkansen":
      return "#E06D10"; // Amber/Orange
    case "drive":
    default:
      return "#7B5800"; // Tertiary
  }
}