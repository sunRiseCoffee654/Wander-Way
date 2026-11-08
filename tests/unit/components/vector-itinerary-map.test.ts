import { describe, it, expect } from "vitest";
import {
  extractMapBounds,
  formatLegBadgeText,
  getTransitModeColor,
} from "@/components/maps/vector-map-helpers";

describe("Vector Itinerary Map Helpers (MapLibre GL & Geoapify Integration)", () => {
  describe("extractMapBounds", () => {
    it("computes accurate bounding box for valid coordinates", () => {
      const waypoints = [
        { id: "1", lat: 35.5494, lng: 139.7798 }, // Haneda
        { id: "2", lat: 35.6895, lng: 139.6917 }, // Shinjuku
      ];

      const bounds = extractMapBounds(waypoints);
      expect(bounds).not.toBeNull();
      expect(bounds?.minLng).toBeCloseTo(139.6917, 3);
      expect(bounds?.maxLng).toBeCloseTo(139.7798, 3);
      expect(bounds?.minLat).toBeCloseTo(35.5494, 3);
      expect(bounds?.maxLat).toBeCloseTo(35.6895, 3);
    });

    it("returns null when waypoints list is empty", () => {
      expect(extractMapBounds([])).toBeNull();
    });

    it("expands single coordinate with small bounding margin", () => {
      const waypoints = [{ id: "1", lat: 35.0116, lng: 135.7681 }];
      const bounds = extractMapBounds(waypoints);
      expect(bounds).not.toBeNull();
      expect(bounds?.maxLat).toBeGreaterThan(bounds!.minLat);
      expect(bounds?.maxLng).toBeGreaterThan(bounds!.minLng);
    });
  });

  describe("formatLegBadgeText", () => {
    it("formats walking leg badge with pedestrian icon and duration", () => {
      const badge = formatLegBadgeText("walk", 800, 720);
      expect(badge.label).toBe("800m • 12 mins");
      expect(badge.icon).toBe("directions_walk");
      expect(badge.modeTitle).toBe("Walking");
    });

    it("formats metro transit badge with distance in km", () => {
      const badge = formatLegBadgeText("metro", 18200, 2100);
      expect(badge.label).toBe("18.2 km • 35 mins");
      expect(badge.icon).toBe("directions_subway");
      expect(badge.modeTitle).toBe("Metro / Rail");
    });

    it("formats high-speed Shinkansen leg with bullet train badge", () => {
      const badge = formatLegBadgeText("shinkansen", 452000, 8100);
      expect(badge.label).toBe("452.0 km • 2h 15m");
      expect(badge.icon).toBe("train");
      expect(badge.modeTitle).toBe("Shinkansen Bullet Train");
    });
  });

  describe("getTransitModeColor", () => {
    it("returns distinct theme colors matching Material 3 tokens", () => {
      expect(getTransitModeColor("walk")).toBe("#006A60"); // Primary teal
      expect(getTransitModeColor("metro")).toBe("#4F5B92"); // Indigo
      expect(getTransitModeColor("shinkansen")).toBe("#E06D10"); // Amber/Orange
      expect(getTransitModeColor("drive")).toBe("#7B5800"); // Tertiary
    });
  });
});