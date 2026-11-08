/**
 * Deterministic Transit Geometry & Vector Engine
 * (PRD v3.0 Compliance — Ground-truth coordinates and honest metrics)
 */

export type TransitMode = "walk" | "metro" | "shinkansen" | "drive";

export interface WaypointItem {
  id: string;
  step: number;
  title: string;
  lat: number;
  lng: number;
  time?: string | null;
  category?: string | null;
  isAi?: boolean;
}

export interface TransitLegItem {
  fromId: string;
  toId: string;
  mode?: string | null;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  coordinates?: [number, number][]; // Array of [lng, lat]
}

/**
 * Calculates Great-Circle distance in meters using the Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats transit duration into human-readable hours and minutes ("2h 15m" or "35 mins" or "1 min").
 */
export function formatTransitHoursMinutes(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0 mins";

  if (seconds < 3600) {
    const mins = Math.max(1, Math.round(seconds / 60));
    return mins === 1 ? "1 min" : `${mins} mins`;
  }

  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Normalizes or auto-detects transit mode based on distance and optional hints.
 */
export function detectTransitMode(
  distanceMeters: number,
  explicitHint?: string | null,
): TransitMode {
  if (explicitHint) {
    const hint = explicitHint.toLowerCase().trim();
    if (hint.includes("walk") || hint.includes("pedestrian") || hint.includes("foot")) {
      return "walk";
    }
    if (
      hint.includes("shinkansen") ||
      hint.includes("bullet") ||
      hint.includes("high_speed") ||
      hint.includes("high speed")
    ) {
      return "shinkansen";
    }
    if (
      hint.includes("metro") ||
      hint.includes("subway") ||
      hint.includes("rail") ||
      hint.includes("train") ||
      hint.includes("monorail")
    ) {
      return "metro";
    }
    if (hint.includes("drive") || hint.includes("taxi") || hint.includes("car") || hint.includes("uber")) {
      return "drive";
    }
  }

  // Distance thresholds
  if (distanceMeters < 1500) {
    return "walk";
  }
  if (distanceMeters > 100000) {
    return "shinkansen";
  }
  return "metro";
}

/**
 * Generates an interpolated coordinate path for transit polylines.
 * For long rail/Shinkansen routes, generates a smooth curved arc.
 * Coordinates are formatted as GeoJSON standard: [longitude, latitude].
 */
export function generateTransitCurve(
  origin: [number, number],
  dest: [number, number],
  mode: string,
  numPoints = 8,
): [number, number][] {
  const [lng1, lat1] = origin;
  const [lng2, lat2] = dest;

  const isShinkansen = mode === "shinkansen";
  if (!isShinkansen) {
    return [
      [lng1, lat1],
      [lng2, lat2],
    ];
  }

  // Generate intermediate arc points for high-speed rail
  const points: [number, number][] = [];
  const midLng = (lng1 + lng2) / 2;
  const midLat = (lat1 + lat2) / 2;

  // Subtle curvature offset perpendicular to line
  const dLng = lng2 - lng1;
  const dLat = lat2 - lat1;
  const perpOffsetLng = -dLat * 0.08;
  const perpOffsetLat = dLng * 0.08;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    // Quadratic bezier curve interpolation
    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * (midLng + perpOffsetLng) + t * t * lng2;
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * (midLat + perpOffsetLat) + t * t * lat2;
    points.push([Number(lng.toFixed(5)), Number(lat.toFixed(5))]);
  }

  // Ensure exact start and end bounds
  points[0] = [lng1, lat1];
  points[points.length - 1] = [lng2, lat2];

  return points;
}

/**
 * Builds a GeoJSON FeatureCollection containing waypoint points and transit line strings.
 */
export function buildDayTransitGeoJSON(
  waypoints: WaypointItem[],
  transitLegs: TransitLegItem[],
): GeoJSON.FeatureCollection {
  const waypointMap = new Map<string, WaypointItem>();
  for (const wp of waypoints) {
    waypointMap.set(wp.id, wp);
  }

  const features: GeoJSON.Feature[] = [];

  // 1. Waypoint Point Features
  for (const wp of waypoints) {
    features.push({
      type: "Feature",
      id: `wp-${wp.id}`,
      geometry: {
        type: "Point",
        coordinates: [wp.lng, wp.lat],
      },
      properties: {
        id: wp.id,
        step: wp.step,
        title: wp.title,
        time: wp.time || "",
        category: wp.category || "",
        isAi: Boolean(wp.isAi),
      },
    });
  }

  // 2. Transit LineString Features
  for (const leg of transitLegs) {
    const origin = waypointMap.get(leg.fromId);
    const dest = waypointMap.get(leg.toId);
    if (!origin || !dest) continue;

    const distance =
      leg.distanceMeters ??
      calculateHaversineDistance(origin.lat, origin.lng, dest.lat, dest.lng);

    const mode = detectTransitMode(distance, leg.mode);
    const duration = leg.durationSeconds ?? Math.round(distance / (mode === "walk" ? 1.3 : mode === "shinkansen" ? 55 : 12));

    const lineCoords =
      leg.coordinates && leg.coordinates.length >= 2
        ? leg.coordinates
        : generateTransitCurve([origin.lng, origin.lat], [dest.lng, dest.lat], mode);

    const km = Math.round(distance / 100) / 10;
    const distanceLabel = `${km.toFixed(1)} km`;
    const durationLabel = formatTransitHoursMinutes(duration);

    features.push({
      type: "Feature",
      id: `transit-${leg.fromId}-${leg.toId}`,
      geometry: {
        type: "LineString",
        coordinates: lineCoords,
      },
      properties: {
        fromId: leg.fromId,
        toId: leg.toId,
        mode,
        distanceMeters: distance,
        durationSeconds: duration,
        distanceLabel,
        durationLabel,
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}