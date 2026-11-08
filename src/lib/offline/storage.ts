/**
 * PWA Offline Storage Engine (PRD v3.0 §5.10 & §5.11)
 *
 * Implements deterministic client-side caching for trip itineraries,
 * Live Vault documents, and destination telemetry with schema versioning.
 * Uses localStorage in the browser with in-memory fallback for SSR and test runtimes.
 */

export interface CachedOfflineData<T> {
  version: number;
  cachedAt: string; // ISO 8601
  tripId?: string;
  data: T;
}

const CURRENT_SCHEMA_VERSION = 1;
const PREFIX_ITINERARY = "wanderway:offline:itinerary:";
const PREFIX_VAULT = "wanderway:offline:vault:";
const PREFIX_TELEMETRY = "wanderway:offline:telemetry:";

// In-memory fallback map for Node/SSR environments or storage errors
const memoryStore = new Map<string, string>();

function isStorageAvailable(): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }
  try {
    const testKey = "__ww_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function setStorageItem(key: string, value: string): void {
  if (isStorageAvailable()) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {
      // Quota exceeded or permission error, fallback to memory
    }
  }
  memoryStore.set(key, value);
}

function getStorageItem(key: string): string | null {
  if (isStorageAvailable()) {
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    } catch {
      // Fall through to memory
    }
  }
  return memoryStore.get(key) ?? null;
}

export function removeStorageItem(key: string): void {
  if (isStorageAvailable()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
  memoryStore.delete(key);
}

/**
 * Caches trip itinerary data (days and activities) for offline access.
 */
export function cacheItineraryOffline<T>(tripId: string, data: T): void {
  if (!tripId) return;
  const payload: CachedOfflineData<T> = {
    version: CURRENT_SCHEMA_VERSION,
    cachedAt: new Date().toISOString(),
    tripId,
    data,
  };
  setStorageItem(`${PREFIX_ITINERARY}${tripId}`, JSON.stringify(payload));
}

/**
 * Retrieves cached itinerary data if available.
 */
export function getCachedItineraryOffline<T>(tripId: string): CachedOfflineData<T> | null {
  if (!tripId) return null;
  const raw = getStorageItem(`${PREFIX_ITINERARY}${tripId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedOfflineData<T>;
  } catch {
    return null;
  }
}

/**
 * Caches Live Vault documents for offline document access.
 */
export function cacheVaultOffline<T>(tripId: string, documents: T): void {
  if (!tripId) return;
  const payload: CachedOfflineData<T> = {
    version: CURRENT_SCHEMA_VERSION,
    cachedAt: new Date().toISOString(),
    tripId,
    data: documents,
  };
  setStorageItem(`${PREFIX_VAULT}${tripId}`, JSON.stringify(payload));
}

/**
 * Retrieves cached Live Vault documents if available.
 */
export function getCachedVaultOffline<T>(tripId: string): CachedOfflineData<T> | null {
  if (!tripId) return null;
  const raw = getStorageItem(`${PREFIX_VAULT}${tripId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedOfflineData<T>;
  } catch {
    return null;
  }
}

/**
 * Caches telemetry data (weather, consular safety bulletins) for a destination.
 */
export function cacheTelemetryOffline<T>(destination: string, data: T): void {
  if (!destination) return;
  const key = `${PREFIX_TELEMETRY}${destination.toLowerCase().trim()}`;
  const payload: CachedOfflineData<T> = {
    version: CURRENT_SCHEMA_VERSION,
    cachedAt: new Date().toISOString(),
    data,
  };
  setStorageItem(key, JSON.stringify(payload));
}

/**
 * Retrieves cached destination telemetry if available.
 */
export function getCachedTelemetryOffline<T>(destination: string): CachedOfflineData<T> | null {
  if (!destination) return null;
  const key = `${PREFIX_TELEMETRY}${destination.toLowerCase().trim()}`;
  const raw = getStorageItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedOfflineData<T>;
  } catch {
    return null;
  }
}

/**
 * Clears all WanderWay offline cached entries.
 */
export function clearOfflineCache(keyPrefix = "wanderway:offline:"): void {
  if (isStorageAvailable()) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(keyPrefix)) {
          keysToRemove.push(key);
        }
      }
      for (const k of keysToRemove) {
        window.localStorage.removeItem(k);
      }
    } catch {
      // Ignore
    }
  }

  // Clear memory store matching prefix
  for (const key of Array.from(memoryStore.keys())) {
    if (key.startsWith(keyPrefix)) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Inspection helper for test assertions.
 */
export function getMemoryStoreSnapshot(): Map<string, string> {
  return new Map(memoryStore);
}