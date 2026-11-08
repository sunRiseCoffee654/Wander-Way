import { describe, it, expect, beforeEach } from "vitest";
import {
  cacheItineraryOffline,
  getCachedItineraryOffline,
  cacheVaultOffline,
  getCachedVaultOffline,
  cacheTelemetryOffline,
  getCachedTelemetryOffline,
  clearOfflineCache,
  getMemoryStoreSnapshot,
} from "@/lib/offline/storage";

describe("PWA Offline Storage Engine (PRD v3.0 Offline Availability)", () => {
  beforeEach(() => {
    clearOfflineCache();
  });

  describe("Itinerary Offline Persistence", () => {
    it("caches itinerary data with metadata and retrieves it successfully", () => {
      const tripId = "kyoto-autumn-2025";
      const sampleDays = [
        {
          day_number: 1,
          title: "Arrival at Haneda & Shinjuku Nightscape",
          activities: [{ id: "act-1", title: "Haneda Arrival", planned_time: "15:15" }],
        },
      ];

      cacheItineraryOffline(tripId, sampleDays);
      const cached = getCachedItineraryOffline<typeof sampleDays>(tripId);

      expect(cached).not.toBeNull();
      expect(cached?.tripId).toBe(tripId);
      expect(cached?.version).toBe(1);
      expect(cached?.data.length).toBe(1);
      expect(cached?.data[0].title).toBe("Arrival at Haneda & Shinjuku Nightscape");
      expect(new Date(cached!.cachedAt).getTime()).not.toBeNaN();
    });

    it("returns null for non-cached trip IDs without error", () => {
      const cached = getCachedItineraryOffline("unknown-trip-id");
      expect(cached).toBeNull();
    });
  });

  describe("Live Vault Offline Persistence", () => {
    it("caches encrypted vault documents and recovers them offline", () => {
      const tripId = "trip-uuid-123";
      const mockDocs = [
        {
          id: "doc-1",
          title: "ANA Boarding Pass",
          category: "flights",
          downloadName: "ANA_NH107.pdf",
        },
        {
          id: "doc-2",
          title: "Kyoto Ryokan Voucher",
          category: "hotels",
          downloadName: "Machiya_Voucher.pdf",
        },
      ];

      cacheVaultOffline(tripId, mockDocs);
      const cached = getCachedVaultOffline<typeof mockDocs>(tripId);

      expect(cached).not.toBeNull();
      expect(cached?.data.length).toBe(2);
      expect(cached?.data[0].title).toBe("ANA Boarding Pass");
      expect(cached?.data[1].category).toBe("hotels");
    });
  });

  describe("Telemetry Offline Persistence", () => {
    it("caches consular and weather bulletins with destination keying", () => {
      const destination = "Kyoto, Japan";
      const telemetry = {
        advisory: { level: "Level 1", advisoryText: "Exercise normal precautions" },
        weather: { tempC: 18, condition: "Partly Cloudy" },
      };

      cacheTelemetryOffline(destination, telemetry);
      const cached = getCachedTelemetryOffline<typeof telemetry>(destination);

      expect(cached).not.toBeNull();
      expect(cached?.data.advisory.level).toBe("Level 1");
      expect(cached?.data.weather.tempC).toBe(18);
    });
  });

  describe("Cache Clearing & Snapshotting", () => {
    it("clears all stored offline data cleanly", () => {
      cacheItineraryOffline("trip-1", { foo: "bar" });
      cacheVaultOffline("trip-1", [{ id: "doc-1" }]);

      expect(getMemoryStoreSnapshot().size).toBeGreaterThanOrEqual(2);

      clearOfflineCache();
      expect(getMemoryStoreSnapshot().size).toBe(0);
      expect(getCachedItineraryOffline("trip-1")).toBeNull();
      expect(getCachedVaultOffline("trip-1")).toBeNull();
    });
  });
});