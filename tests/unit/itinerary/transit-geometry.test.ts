import { describe, it, expect } from "vitest";
import {
  calculateHaversineDistance,
  formatTransitHoursMinutes,
  detectTransitMode,
  generateTransitCurve,
  buildDayTransitGeoJSON,
} from "@/lib/itinerary/transit-geometry";

describe("Transit Geometry & Vector Engine (PRD v3.0 Grounding Invariants)", () => {
  describe("calculateHaversineDistance", () => {
    it("calculates accurate ground distance in meters between two coordinates", () => {
      // Haneda Airport (35.5494, 139.7798) to Tokyo Station (35.6812, 139.7671)
      const distance = calculateHaversineDistance(35.5494, 139.7798, 35.6812, 139.7671);
      // Roughly 14.7 km (~14,700m)
      expect(distance).toBeGreaterThan(14000);
      expect(distance).toBeLessThan(16000);
    });

    it("returns 0 when coordinates are identical", () => {
      const distance = calculateHaversineDistance(35.6812, 139.7671, 35.6812, 139.7671);
      expect(distance).toBe(0);
    });

    it("handles negative latitudes and longitudes safely", () => {
      const distance = calculateHaversineDistance(-33.8688, 151.2093, -37.8136, 144.9631);
      // Sydney to Melbourne: ~713 km
      expect(distance).toBeGreaterThan(700000);
      expect(distance).toBeLessThan(730000);
    });
  });

  describe("formatTransitHoursMinutes", () => {
    it("formats sub-hour durations in minutes", () => {
      expect(formatTransitHoursMinutes(720)).toBe("12 mins");
      expect(formatTransitHoursMinutes(300)).toBe("5 mins");
      expect(formatTransitHoursMinutes(59)).toBe("1 min");
    });

    it("formats multi-hour durations with hours and minutes", () => {
      // 2 hours 15 minutes = 8100 seconds
      expect(formatTransitHoursMinutes(8100)).toBe("2h 15m");
      // 1 hour exact = 3600 seconds
      expect(formatTransitHoursMinutes(3600)).toBe("1h 0m");
    });

    it("safely handles 0, null, or undefined", () => {
      expect(formatTransitHoursMinutes(0)).toBe("0 mins");
      expect(formatTransitHoursMinutes(null)).toBe("0 mins");
      expect(formatTransitHoursMinutes(undefined)).toBe("0 mins");
    });
  });

  describe("detectTransitMode", () => {
    it("respects explicit mode hints for walk, metro, shinkansen, and drive", () => {
      expect(detectTransitMode(500, "walk")).toBe("walk");
      expect(detectTransitMode(12000, "metro")).toBe("metro");
      expect(detectTransitMode(20000, "subway")).toBe("metro");
      expect(detectTransitMode(450000, "shinkansen")).toBe("shinkansen");
      expect(detectTransitMode(450000, "bullet_train")).toBe("shinkansen");
      expect(detectTransitMode(15000, "drive")).toBe("drive");
      expect(detectTransitMode(15000, "taxi")).toBe("drive");
    });

    it("auto-detects 'walk' for short distances under 1.5 km", () => {
      expect(detectTransitMode(800)).toBe("walk");
      expect(detectTransitMode(1400)).toBe("walk");
    });

    it("auto-detects 'metro' for urban distances between 1.5 km and 100 km", () => {
      expect(detectTransitMode(5000)).toBe("metro");
      expect(detectTransitMode(18200)).toBe("metro");
      expect(detectTransitMode(65000)).toBe("metro");
    });

    it("auto-detects 'shinkansen' for long inter-city distances over 100 km", () => {
      expect(detectTransitMode(452000)).toBe("shinkansen");
      expect(detectTransitMode(120000)).toBe("shinkansen");
    });
  });

  describe("generateTransitCurve", () => {
    it("generates line coordinates between origin and destination", () => {
      const origin: [number, number] = [139.7798, 35.5494]; // [lng, lat]
      const dest: [number, number] = [139.6917, 35.6895];
      const curve = generateTransitCurve(origin, dest, "metro");

      expect(curve.length).toBeGreaterThanOrEqual(2);
      expect(curve[0][0]).toBeCloseTo(origin[0], 4);
      expect(curve[0][1]).toBeCloseTo(origin[1], 4);
      expect(curve[curve.length - 1][0]).toBeCloseTo(dest[0], 4);
      expect(curve[curve.length - 1][1]).toBeCloseTo(dest[1], 4);
    });

    it("generates smooth multi-node arc for high-speed rail / Shinkansen legs", () => {
      const tokyo: [number, number] = [139.7671, 35.6812];
      const kyoto: [number, number] = [135.7588, 34.9858];
      const curve = generateTransitCurve(tokyo, kyoto, "shinkansen");

      expect(curve.length).toBeGreaterThanOrEqual(5);
      expect(curve[0]).toEqual(tokyo);
      expect(curve[curve.length - 1]).toEqual(kyoto);
    });
  });

  describe("buildDayTransitGeoJSON", () => {
    it("constructs valid GeoJSON FeatureCollection with point pins and transit line strings", () => {
      const waypoints = [
        { id: "wp-1", step: 1, title: "Haneda Airport", lat: 35.5494, lng: 139.7798 },
        { id: "wp-2", step: 2, title: "Hotel Cerulean", lat: 35.6895, lng: 139.6917 },
      ];
      const legs = [
        {
          fromId: "wp-1",
          toId: "wp-2",
          mode: "metro",
          distanceMeters: 18200,
          durationSeconds: 2100,
        },
      ];

      const geojson = buildDayTransitGeoJSON(waypoints, legs);
      expect(geojson.type).toBe("FeatureCollection");
      expect(geojson.features.length).toBe(3); // 2 waypoint points + 1 transit line

      const pointFeatures = geojson.features.filter((f) => f.geometry.type === "Point");
      expect(pointFeatures.length).toBe(2);
      expect(pointFeatures[0].properties?.step).toBe(1);
      expect(pointFeatures[0].properties?.title).toBe("Haneda Airport");

      const lineFeatures = geojson.features.filter((f) => f.geometry.type === "LineString");
      expect(lineFeatures.length).toBe(1);
      expect(lineFeatures[0].properties?.mode).toBe("metro");
      expect(lineFeatures[0].properties?.distanceLabel).toBe("18.2 km");
      expect(lineFeatures[0].properties?.durationLabel).toBe("35 mins");
    });
  });
});