/**
 * Geoapify Routing API client for calculating transit legs between sequential itinerary stops.
 * PRD v3.0 §5.4, §5.6.
 */

const API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || process.env.GEOAPIFY_API_KEY;
const BASE_URL = "https://api.geoapify.com/v1";

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  mode: "walk" | "drive";
}

interface GeoapifyRouteResponse {
  features?: Array<{
    properties?: {
      distance: number;
      time: number;
    };
  }>;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates estimated travel distance and duration between two coordinates.
 * Defaults to "walk" for distances under ~1.5km, otherwise "drive".
 */
export async function calculateRouteLeg(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  mode: "walk" | "drive" = "drive",
): Promise<RouteResult | null> {
  if (!API_KEY) {
    return null;
  }

  const url = new URL(`${BASE_URL}/routing`);
  url.searchParams.set("waypoints", `${originLat},${originLon}|${destLat},${destLon}`);
  url.searchParams.set("mode", mode);
  url.searchParams.set("apiKey", API_KEY);

  let attempt = 0;
  const maxRetries = 2;
  let delay = 500;

  while (attempt <= maxRetries) {
    attempt++;
    try {
      const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });

      if (res.status === 429 || res.status >= 500) {
        if (attempt > maxRetries) return null;
        await sleep(delay);
        delay *= 2;
        continue;
      }

      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as GeoapifyRouteResponse;
      if (!data.features || data.features.length === 0 || !data.features[0].properties) {
        return null;
      }

      const props = data.features[0].properties;
      return {
        distanceMeters: Math.round(props.distance),
        durationSeconds: Math.round(props.time),
        mode,
      };
    } catch {
      if (attempt > maxRetries) return null;
      await sleep(delay);
      delay *= 2;
    }
  }

  return null;
}
