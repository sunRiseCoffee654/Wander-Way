/**
 * Geoapify Geocoding & Place Search with Destination Biasing, Retries, and Caching.
 * PRD v3.0 §5.4, §5.6; UI_UX_PLAN.md §3.1.
 */

const API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || process.env.GEOAPIFY_API_KEY;
const BASE_URL = "https://api.geoapify.com/v1";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const geocodeCache = new Map<string, CacheEntry<ResolvedGeoapifyPlace | null>>();

export interface ResolvedGeoapifyPlace {
  placeId: string;
  name: string;
  formatted: string;
  lat: number;
  lon: number;
  confidence: number;
  category?: string;
}

interface GeoapifyFeature {
  properties: {
    place_id: string;
    name?: string;
    formatted: string;
    lat: number;
    lon: number;
    rank?: {
      confidence?: number;
      importance?: number;
    };
    category?: string;
    categories?: string[];
  };
}

interface GeoapifyResponse {
  features: GeoapifyFeature[];
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes a Geoapify request with retry and exponential backoff on 429 or 5xx.
 */
async function fetchWithRetry<T>(url: string, maxRetries = 3): Promise<T> {
  let attempt = 0;
  let delay = 500;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });

      if (res.status === 429 || res.status >= 500) {
        if (attempt >= maxRetries) {
          throw new Error(`Geoapify HTTP ${res.status} after ${maxRetries} attempts`);
        }
        await sleep(delay);
        delay *= 2;
        continue;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Geoapify request failed with status ${res.status}: ${text}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (attempt >= maxRetries) {
        throw err;
      }
      await sleep(delay);
      delay *= 2;
    }
  }

  throw new Error("Geoapify request exceeded retry limits");
}

/**
 * Geocodes the destination center to obtain reference coordinates for radius validation.
 */
export async function geocodeDestination(
  destination: string,
): Promise<{ lat: number; lon: number; formatted: string } | null> {
  if (!API_KEY) {
    console.warn("[geoapify] No API key available for geocoding destination.");
    return null;
  }

  const cacheKey = `dest:${destination.trim().toLowerCase()}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data ? { lat: cached.data.lat, lon: cached.data.lon, formatted: cached.data.formatted } : null;
  }

  const url = new URL(`${BASE_URL}/geocode/search`);
  url.searchParams.set("text", destination);
  url.searchParams.set("limit", "1");
  url.searchParams.set("lang", "en");
  url.searchParams.set("apiKey", API_KEY);

  try {
    const data = await fetchWithRetry<GeoapifyResponse>(url.toString());
    if (!data.features || data.features.length === 0) {
      geocodeCache.set(cacheKey, { data: null, expiresAt: Date.now() + 300000 });
      return null;
    }

    const first = data.features[0].properties;
    const resolved: ResolvedGeoapifyPlace = {
      placeId: first.place_id,
      name: first.name || destination,
      formatted: first.formatted,
      lat: first.lat,
      lon: first.lon,
      confidence: first.rank?.confidence ?? 1.0,
      category: first.category,
    };

    geocodeCache.set(cacheKey, { data: resolved, expiresAt: Date.now() + 3600000 });
    return { lat: resolved.lat, lon: resolved.lon, formatted: resolved.formatted };
  } catch (err) {
    console.error("[geocodeDestination error]", err);
    return null;
  }
}

/**
 * Searches for a specific place within a destination using circular bias.
 */
export async function searchPlaceInDestination(
  placeName: string,
  destination: string,
  destLat?: number,
  destLon?: number,
): Promise<ResolvedGeoapifyPlace | null> {
  if (!API_KEY) {
    return null;
  }

  const cacheKey = `place:${destination.trim().toLowerCase()}:${placeName.trim().toLowerCase()}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = new URL(`${BASE_URL}/geocode/search`);
  url.searchParams.set("text", `${placeName}, ${destination}`);
  url.searchParams.set("limit", "1");
  url.searchParams.set("lang", "en");
  url.searchParams.set("apiKey", API_KEY);

  if (destLat !== undefined && destLon !== undefined) {
    // 50km circular bias around destination centroid
    url.searchParams.set("bias", `proximity:${destLon},${destLat}`);
  }

  try {
    const data = await fetchWithRetry<GeoapifyResponse>(url.toString());
    if (!data.features || data.features.length === 0) {
      geocodeCache.set(cacheKey, { data: null, expiresAt: Date.now() + 300000 });
      return null;
    }

    const first = data.features[0].properties;
    const resolved: ResolvedGeoapifyPlace = {
      placeId: first.place_id,
      name: first.name || placeName,
      formatted: first.formatted,
      lat: first.lat,
      lon: first.lon,
      confidence: first.rank?.confidence ?? 0.5,
      category: first.category || (first.categories && first.categories[0]),
    };

    geocodeCache.set(cacheKey, { data: resolved, expiresAt: Date.now() + 3600000 });
    return resolved;
  } catch (err) {
    console.error(`[searchPlaceInDestination error: ${placeName}]`, err);
    return null;
  }
}
