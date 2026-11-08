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

  // Derive cached availability directly during render
  const cachedItin = tripId ? getCachedItineraryOffline(tripId) : null;
  const cachedVault = tripId ? getCachedVaultOffline(tripId) : null;

  const hasCachedItinerary = Boolean(cachedItin);
  const hasCachedVault = Boolean(cachedVault);

  let lastSynced: Date | null = null;
  if (cachedItin) {
    lastSynced = new Date(cachedItin.cachedAt);
  }
  if (cachedVault) {
    const vaultDate = new Date(cachedVault.cachedAt);
    if (!lastSynced || vaultDate > lastSynced) {
      lastSynced = vaultDate;
    }
  }

  return {
    isOffline,
    hasCachedItinerary,
    hasCachedVault,
    lastSynced,
  };
}