/**
 * Grounding & Verification Pipeline for WanderWay AI Itineraries.
 * PRD v3.0 §5.4, §5.6; UI_UX_PLAN.md §3.1 (Match Tiers, Distance Guards, Concurrency).
 */

import { geocodeDestination, searchPlaceInDestination } from "@/lib/geoapify/geocode";
import { calculateRouteLeg } from "@/lib/geoapify/routing";
import type {
  CandidatePlan,
  GroundedActivity,
  GroundedDay,
  GroundingStats,
  MatchTier,
  ProposalData,
} from "./types";

const MAX_DESTINATION_RADIUS_KM = 50;
const HIGH_CONFIDENCE_THRESHOLD = 0.75;
const NAME_SIMILARITY_THRESHOLD = 0.6;
const MAX_CONCURRENT_GEO_REQUESTS = 4;

/**
 * Calculates great-circle distance in kilometers using the Haversine formula.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Normalized string similarity using character bigrams (Dice's coefficient).
 * Returns a value between 0.0 and 1.0.
 */
export function computeNameSimilarity(str1: string, str2: string): number {
  const clean1 = str1.toLowerCase().replace(/[^a-z0-9]/g, "");
  const clean2 = str2.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (clean1 === clean2) return 1.0;
  if (clean1.length < 2 || clean2.length < 2) {
    return clean1.includes(clean2) || clean2.includes(clean1) ? 0.7 : 0.0;
  }

  const getBigrams = (s: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.add(s.substring(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(clean1);
  const b2 = getBigrams(clean2);

  let matches = 0;
  for (const b of b1) {
    if (b2.has(b)) matches++;
  }

  return (2.0 * matches) / (b1.size + b2.size);
}

/**
 * A simple async semaphore / concurrency limiter.
 */
class ConcurrencyLimiter {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next?.();
      }
    }
  }
}

/**
 * Grounding pipeline: verifies each candidate place with Geoapify, assigns match tiers,
 * and computes transit routes between sequential stops.
 */
export async function groundCandidatePlan(
  candidatePlan: CandidatePlan,
  destination: string,
): Promise<{ proposalData: ProposalData; groundingStats: GroundingStats }> {
  const limiter = new ConcurrencyLimiter(MAX_CONCURRENT_GEO_REQUESTS);

  // 1. Resolve destination centroid
  const destCoords = await geocodeDestination(destination);

  let totalPlaces = 0;
  let matchedHigh = 0;
  let matchedLow = 0;
  let unresolved = 0;
  let totalLegs = 0;
  let computedLegs = 0;

  // 2. Resolve places for all activities concurrently via limiter
  const activityPromises = candidatePlan.days.flatMap((day) =>
    day.activities.map(async (act) => {
      const resolved = await limiter.run(() =>
        searchPlaceInDestination(
          act.place_name,
          destination,
          destCoords?.lat,
          destCoords?.lon,
        ),
      );
      return { dayNumber: day.day_number, act, resolved };
    }),
  );

  const resolvedActivities = await Promise.all(activityPromises);

  // Group resolved activities by day
  const dayActivitiesMap = new Map<number, GroundedActivity[]>();
  for (const day of candidatePlan.days) {
    dayActivitiesMap.set(day.day_number, []);
  }

  for (const item of resolvedActivities) {
    totalPlaces++;
    const { act, resolved } = item;

    let matchTier: MatchTier = "unresolved";
    let matchConfidence = 0.0;
    let lat: number | null = null;
    let lon: number | null = null;
    let formattedAddress: string | null = null;
    let placeId: string | null = null;

    if (resolved) {
      placeId = resolved.placeId;
      lat = resolved.lat;
      lon = resolved.lon;
      formattedAddress = resolved.formatted;
      matchConfidence = resolved.confidence;

      // Check distance from destination center if centroid is available
      const distFromCenter = destCoords
        ? haversineDistanceKm(destCoords.lat, destCoords.lon, lat, lon)
        : 0;

      const nameSim = computeNameSimilarity(act.place_name, resolved.name);

      if (distFromCenter > MAX_DESTINATION_RADIUS_KM) {
        // Out of radius: reject location to prevent wrong-country matches
        matchTier = "unresolved";
        lat = null;
        lon = null;
        unresolved++;
      } else if (
        matchConfidence >= HIGH_CONFIDENCE_THRESHOLD &&
        nameSim >= NAME_SIMILARITY_THRESHOLD
      ) {
        matchTier = "matched_high";
        matchedHigh++;
      } else {
        matchTier = "matched_low";
        matchedLow++;
      }
    } else {
      matchTier = "unresolved";
      unresolved++;
    }

    const grounded: GroundedActivity = {
      ...act,
      geoapify_place_id: placeId,
      latitude: lat,
      longitude: lon,
      formatted_address: formattedAddress,
      match_tier: matchTier,
      match_confidence: matchConfidence,
      travel_mode_to_next: null,
      transit_distance_meters: null,
      transit_duration_seconds: null,
      leg_status: "unavailable",
    };

    dayActivitiesMap.get(item.dayNumber)?.push(grounded);
  }

  // 3. Compute transit routes concurrently between adjacent stops
  const routeJobs: Array<{
    current: GroundedActivity;
    originLat: number;
    originLon: number;
    destLat: number;
    destLon: number;
    mode: "walk" | "drive";
  }> = [];

  for (const day of candidatePlan.days) {
    const activities = dayActivitiesMap.get(day.day_number) || [];
    for (let i = 0; i < activities.length - 1; i++) {
      totalLegs++;
      const current = activities[i];
      const next = activities[i + 1];

      // Only attempt routing if both stops have coordinates
      if (
        current.latitude !== null &&
        current.longitude !== null &&
        next.latitude !== null &&
        next.longitude !== null
      ) {
        const straightDistKm = haversineDistanceKm(
          current.latitude,
          current.longitude,
          next.latitude,
          next.longitude,
        );

        const preferredMode: "walk" | "drive" = straightDistKm < 1.5 ? "walk" : "drive";

        routeJobs.push({
          current,
          originLat: current.latitude,
          originLon: current.longitude,
          destLat: next.latitude,
          destLon: next.longitude,
          mode: preferredMode,
        });
      }
    }
  }

  // Execute route calculations concurrently via limiter
  await Promise.all(
    routeJobs.map(async (job) => {
      const routeResult = await limiter.run(() =>
        calculateRouteLeg(
          job.originLat,
          job.originLon,
          job.destLat,
          job.destLon,
          job.mode,
        ),
      );

      if (routeResult) {
        computedLegs++;
        job.current.travel_mode_to_next = routeResult.mode;
        job.current.transit_distance_meters = routeResult.distanceMeters;
        job.current.transit_duration_seconds = routeResult.durationSeconds;
        job.current.leg_status = "available";
      }
    }),
  );

  // Reassemble days in original order
  const groundedDays: GroundedDay[] = candidatePlan.days.map((day) => ({
    day_number: day.day_number,
    calendar_date: day.calendar_date,
    title: day.title,
    theme: day.theme,
    activities: dayActivitiesMap.get(day.day_number) || [],
  }));

  const stats: GroundingStats = {
    total_places: totalPlaces,
    matched_high: matchedHigh,
    matched_low: matchedLow,
    unresolved,
    total_legs: totalLegs,
    computed_legs: computedLegs,
    dropped_items: 0,
  };

  return {
    proposalData: {
      summary: candidatePlan.summary,
      days: groundedDays,
    },
    groundingStats: stats,
  };
}
