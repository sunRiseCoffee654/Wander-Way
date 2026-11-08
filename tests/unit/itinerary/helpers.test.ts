import { describe, it, expect } from "vitest";
import {
  getItineraryEvidenceBadge,
  formatTransitDuration,
  formatTransitDistance,
  sortItineraryActivities,
} from "@/lib/itinerary/helpers";

describe("Itinerary Helpers (PRD v3.0 Compliance)", () => {
  describe("getItineraryEvidenceBadge", () => {
    it("returns Live Quote metadata with bolt icon", () => {
      const meta = getItineraryEvidenceBadge("live_quote");
      expect(meta.label).toBe("Live Quote");
      expect(meta.icon).toBe("bolt");
      expect(meta.badge).toContain("bg-tertiary-fixed");
    });

    it("returns Published Tariff metadata with menu_book icon", () => {
      const meta = getItineraryEvidenceBadge("published_price");
      expect(meta.label).toBe("Published Tariff");
      expect(meta.icon).toBe("menu_book");
      expect(meta.badge).toContain("bg-primary-fixed");
    });

    it("returns Calculated Est. metadata with calculate icon", () => {
      const meta = getItineraryEvidenceBadge("calculated_estimate");
      expect(meta.label).toBe("Calculated Est.");
      expect(meta.icon).toBe("calculate");
      expect(meta.badge).toContain("bg-secondary-fixed");
    });

    it("falls back safely to Price Unknown for unknown or empty input", () => {
      const metaNull = getItineraryEvidenceBadge(null);
      expect(metaNull.label).toBe("Price Unknown");
      expect(metaNull.icon).toBe("help_outline");

      const metaUndefined = getItineraryEvidenceBadge(undefined);
      expect(metaUndefined.label).toBe("Price Unknown");

      const metaUnknown = getItineraryEvidenceBadge("invalid_evidence");
      expect(metaUnknown.label).toBe("Price Unknown");
    });
  });

  describe("Transit Metrics Formatting", () => {
    it("formats transit duration in seconds to rounded minutes", () => {
      expect(formatTransitDuration(720)).toBe("12 mins");
      expect(formatTransitDuration(60)).toBe("1 mins");
      expect(formatTransitDuration(45)).toBe("1 mins");
      expect(formatTransitDuration(0)).toBe("0 mins");
      expect(formatTransitDuration(null)).toBe("0 mins");
    });

    it("formats transit distance in meters to kilometers with 1 decimal", () => {
      expect(formatTransitDistance(850)).toBe("0.9 km");
      expect(formatTransitDistance(18200)).toBe("18.2 km");
      expect(formatTransitDistance(1000)).toBe("1.0 km");
      expect(formatTransitDistance(0)).toBe("0.0 km");
      expect(formatTransitDistance(null)).toBe("0.0 km");
    });
  });

  describe("sortItineraryActivities", () => {
    it("sorts activities stably by sort_order ascending", () => {
      const activities = [
        { id: "act-3", sort_order: 3, planned_time: "14:00" },
        { id: "act-1", sort_order: 1, planned_time: "09:00" },
        { id: "act-2", sort_order: 2, planned_time: "11:00" },
      ];

      const sorted = sortItineraryActivities(activities);
      expect(sorted.map((a) => a.id)).toEqual(["act-1", "act-2", "act-3"]);
    });

    it("breaks ties in sort_order using planned_time", () => {
      const activities = [
        { id: "act-b", sort_order: 1, planned_time: "14:00" },
        { id: "act-a", sort_order: 1, planned_time: "10:00" },
      ];

      const sorted = sortItineraryActivities(activities);
      expect(sorted.map((a) => a.id)).toEqual(["act-a", "act-b"]);
    });
  });
});
