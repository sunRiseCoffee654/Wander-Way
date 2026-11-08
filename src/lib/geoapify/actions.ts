"use server";

/**
 * Server-side Geoapify client.
 *
 * All calls run inside Next.js Server Actions so the Geoapify API key never
 * reaches the browser. Results are cached for one hour because place identity
 * (name, coordinates, category) changes infrequently and is not time-sensitive
 * pricing or availability data.
 */

import type { PlaceSuggestion, PlaceDetails } from "./types";

const API_KEY =
  process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
const BASE = "https://api.geoapify.com/v1";

if (!API_KEY) {
  console.warn(
    "[geoapify] NEXT_PUBLIC_GEOAPIFY_API_KEY is not set — place search will fail.",
  );
}

async function fetchGeoapify<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  if (!API_KEY) {
    throw new Error("Geoapify API key is not configured");
  }

  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("apiKey", API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Geoapify request failed (${response.status}): ${body || response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

// Minimal Geoapify autocomplete feature shape used by the app.
interface GeoapifyFeature {
  properties: {
    place_id: string;
    name: string;
    city?: string | null;
    country?: string | null;
    lat: number;
    lon: number;
    formatted: string;
    category?: string | null;
    [key: string]: unknown;
  };
}

interface GeoapifyAutocompleteResponse {
  features: GeoapifyFeature[];
}

// Minimal Geoapify reverse-geocode feature shape used by the app.
interface GeoapifyReverseFeature {
  properties: {
    place_id: string;
    name: string;
    formatted: string;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
    country_code?: string | null;
    lat: number;
    lon: number;
    categories: string[];
    timezone?: { name?: string | null } | null;
    [key: string]: unknown;
  };
}

interface GeoapifyReverseResponse {
  features: GeoapifyReverseFeature[];
}

/**
 * Server Action: autocomplete place suggestions for a free-text query.
 *
 * Debounced on the client. Returns up to 10 provider-backed suggestions
 * with verified coordinates — never invented place names or positions.
 */
export async function autocompletePlaces(
  text: string,
): Promise<{ suggestions: PlaceSuggestion[]; error?: string }> {
  if (!text || text.trim().length < 2) {
    return { suggestions: [] };
  }

  try {
    const data = await fetchGeoapify<GeoapifyAutocompleteResponse>(
      "/geocode/autocomplete",
      {
        text: text.trim(),
        limit: "10",
        lang: "en",
      },
    );

    const suggestions: PlaceSuggestion[] = data.features.map((f) => ({
      placeId: f.properties.place_id,
      name: f.properties.name,
      city: f.properties.city ?? null,
      country: f.properties.country ?? null,
      lat: f.properties.lat,
      lon: f.properties.lon,
      formatted: f.properties.formatted,
      category: f.properties.category ?? null,
    }));

    return { suggestions };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown autocomplete error";
    console.error("[geoapify autocomplete]", message);
    return { suggestions: [], error: message };
  }
}

/**
 * Server Action: place details by latitude/longitude (reverse geocode).
 *
 * Used by the destination detail view to render verified address, category
 * and coordinate information for a selected place.
 */
export async function getPlaceDetails(
  lat: number,
  lon: number,
): Promise<{ details: PlaceDetails | null; error?: string }> {
  try {
    const data = await fetchGeoapify<GeoapifyReverseResponse>(
      "/geocode/reverse",
      {
        lat: String(lat),
        lon: String(lon),
        lang: "en",
      },
    );

    if (!data.features.length) {
      return { details: null };
    }

    const f = data.features[0].properties;

    const details: PlaceDetails = {
      placeId: f.place_id,
      name: f.name,
      formatted: f.formatted,
      address: {
        street: f.street ?? null,
        city: f.city ?? null,
        state: f.state ?? null,
        postcode: f.postcode ?? null,
        country: f.country ?? null,
        countryCode: f.country_code ?? null,
      },
      location: { lat: f.lat, lon: f.lon },
      categories: f.categories ?? [],
      timezone: f.timezone?.name ?? null,
    };

    return { details };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown details error";
    console.error("[geoapify details]", message);
    return { details: null, error: message };
  }
}
