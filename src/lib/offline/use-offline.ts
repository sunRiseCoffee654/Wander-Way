"use client";

import { useState, useEffect } from "react";
import { getCachedItineraryOffline, getCachedVaultOffline } from "./storage";

export interface OfflineStatus {
  isOffline: boolean;
  hasCachedItinerary: boolean;
  hasCachedVault: boolean;
  lastSynced: Date | null;
}

/**
 * React hook to observe browser online/offline status and cached availability.
 */
export function useOfflineStatus(tripId?: string): OfflineStatus {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return !navigator.onLine;
    }
    return false;
  });

  const [hasCachedItinerary, setHasCachedItinerary] = useState<boolean>(false);
  const [hasCachedVault, setHasCachedVault] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    function updateStatus() {
      if (typeof navigator !== "undefined") {
        setIsOffline(!navigator.onLine);
      }
    }

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  useEffect(() => {
    if (!tripId) return;

    const itin = getCachedItineraryOffline(tripId);
    if (itin) {
      setHasCachedItinerary(true);
      setLastSynced(new Date(itin.cachedAt));
    }

    const vault = getCachedVaultOffline(tripId);
    if (vault) {
      setHasCachedVault(true);
      if (!itin || new Date(vault.cachedAt) > new Date(itin.cachedAt)) {
        setLastSynced(new Date(vault.cachedAt));
      }
    }
  }, [tripId, isOffline]);

  return {
    isOffline,
    hasCachedItinerary,
    hasCachedVault,
    lastSynced,
  };
}