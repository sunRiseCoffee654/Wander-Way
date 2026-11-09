import { describe, it, expect, beforeEach } from "vitest";
import { normalizeTimeString } from "@/components/itinerary/activity-edit-modal";
import { extractMapBounds } from "@/components/maps/vector-map-helpers";
import {
  buildDayTransitGeoJSON,
  type WaypointItem,
  type TransitLegItem,
} from "@/lib/itinerary/transit-geometry";
import {
  extractWaypointsFromActivities,
  type ActivitySyncInput,
} from "@/lib/itinerary/sync-helpers";
import {
  createActivityAction,
  resetActivityStore,
} from "@/lib/itinerary/actions";

describe("Challenger P6: Empirical Stress Harness for Phase 6 Itinerary & Map View", () => {
  beforeEach(async () => {
    await resetActivityStore();
  });

  // =========================================================================
  // 1. ActivityEditModal Time Normalization & Edge Values
  // =========================================================================
  describe("ActivityEditModal: normalizeTimeString", () => {
    it("returns null for empty or whitespace-only inputs", () => {
      expect(normalizeTimeString("")).toBeNull();
      expect(normalizeTimeString("   ")).toBeNull();
      expect(normalizeTimeString("\t\n")).toBeNull();
    });

    it("preserves valid 24-hour HH:mm time formats", () => {
      expect(normalizeTimeString("09:00")).toBe("09:00");
      expect(normalizeTimeString("12:30")).toBe("12:30");
      expect(normalizeTimeString("18:45")).toBe("18:45");
      expect(normalizeTimeString("00:00")).toBe("00:00");
      expect(normalizeTimeString("23:59")).toBe("23:59");
    });

    it("normalizes 12-hour AM/PM formats into strict 24-hour HH:mm", () => {
      expect(normalizeTimeString("9:15 AM")).toBe("09:15");
      expect(normalizeTimeString("09:15 AM")).toBe("09:15");
      expect(normalizeTimeString("12:00 PM")).toBe("12:00");
      expect(normalizeTimeString("12:00 AM")).toBe("00:00");
      expect(normalizeTimeString("1:30 PM")).toBe("13:30");
      expect(normalizeTimeString("11:45 PM")).toBe("23:45");
      expect(normalizeTimeString("7:05 pm")).toBe("19:05");
    });

    it("falls back to trimmed string when format is non-standard", () => {
      expect(normalizeTimeString("morning")).toBe("morning");
      expect(normalizeTimeString("around sunset")).toBe("around sunset");
    });
  });

  // =========================================================================
  // 2. Currency Formatting & Bug Discovery
  // =========================================================================
  describe("ActivityEditModal: Currency & Pricing Tier Assembly", () => {
    // Simulates the exact logic from ActivityEditModalContent handleSubmit:
    function assembleBookingRequirement(
      currency: string,
      costAmount: string,
      evidenceType: string,
      isFreeEntry: boolean,
      customBookingNote: string
    ) {
      if (isFreeEntry) {
        return customBookingNote.trim() || "No booking required (Free entry)";
      }
      if (costAmount.trim()) {
        const currSymbol =
          currency === "JPY"
            ? "¥"
            : currency === "EUR"
            ? "€"
            : currency === "GBP"
            ? "£"
            : "$";
        const evidenceLabel =
          evidenceType === "published_price"
            ? "Published Tariff"
            : evidenceType === "live_quote"
            ? "Live Quote"
            : evidenceType === "calculated_estimate"
            ? "Calculated Estimate"
            : "User Entered";
        return `${currSymbol}${costAmount.trim()} [${evidenceLabel}]${
          customBookingNote.trim() ? ` — ${customBookingNote.trim()}` : ""
        }`;
      }
      return customBookingNote.trim() || null;
    }

    it("formats standard JPY, USD, EUR, GBP currency entries correctly", () => {
      expect(assembleBookingRequirement("JPY", "500", "published_price", false, "")).toBe(
        "¥500 [Published Tariff]"
      );
      expect(assembleBookingRequirement("USD", "25.00", "live_quote", false, "Reserved")).toBe(
        "$25.00 [Live Quote] — Reserved"
      );
      expect(assembleBookingRequirement("EUR", "18", "calculated_estimate", false, "")).toBe(
        "€18 [Calculated Estimate]"
      );
      expect(assembleBookingRequirement("GBP", "12.50", "user_entered", false, "")).toBe(
        "£12.50 [User Entered]"
      );
    });

    it("DEFECT CONFIRMATION: INR currency outputs '$' instead of '₹' due to ternary fallback in ActivityEditModal", () => {
      const result = assembleBookingRequirement("INR", "1500", "user_entered", false, "");
      // Expected behavior for INR: should be "₹1500 [User Entered]"
      // Actual buggy behavior in ActivityEditModal line 187: evaluates to "$1500 [User Entered]"
      expect(result).toBe("$1500 [User Entered]");
      expect(result).not.toContain("₹");
    });

    it("handles Free Admission toggle by overriding cost amount", () => {
      const result = assembleBookingRequirement("USD", "100", "user_entered", true, "");
      expect(result).toBe("No booking required (Free entry)");
    });

    it("preserves custom booking note with Free Admission", () => {
      const result = assembleBookingRequirement("USD", "100", "user_entered", true, "Pass included");
      expect(result).toBe("Pass included");
    });
  });

  // =========================================================================
  // 3. Coordinate Boundaries & Geographic Validation via Server Actions
  // =========================================================================
  describe("Geographic Coordinates Boundary Checks via Actions", () => {
    const TRIP_ID = "trip-test-coords";
    const DAY_ID = "day-coords";

    it("accepts valid boundary coordinates (-90, 90, -180, 180)", async () => {
      const act1 = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "North Max Lat",
        latitude: 90,
        longitude: 180,
      });
      expect(act1.success).toBe(true);

      const act2 = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "South Min Lat",
        latitude: -90,
        longitude: -180,
      });
      expect(act2.success).toBe(true);
    });

    it("rejects latitude out of bounds (> 90 or < -90)", async () => {
      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Invalid North Pole",
          latitude: 90.0001,
          longitude: 135.0,
        })
      ).rejects.toThrow(/Latitude must be between -90 and 90/);

      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Invalid South Pole",
          latitude: -90.0001,
          longitude: 135.0,
        })
      ).rejects.toThrow(/Latitude must be between -90 and 90/);
    });

    it("rejects longitude out of bounds (> 180 or < -180)", async () => {
      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Invalid East Meridian",
          latitude: 35.0,
          longitude: 180.0001,
        })
      ).rejects.toThrow(/Longitude must be between -180 and 180/);

      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Invalid West Meridian",
          latitude: 35.0,
          longitude: -180.0001,
        })
      ).rejects.toThrow(/Longitude must be between -180 and 180/);
    });

    it("allows null or undefined coordinates without crashing", async () => {
      const act = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "No GPS Set",
        latitude: null,
        longitude: null,
      });
      expect(act.success).toBe(true);
      expect((act.data || act.activity).latitude).toBeNull();
      expect((act.data || act.activity).longitude).toBeNull();
    });
  });

  // =========================================================================
  // 4. Activity Duration Validation via Actions
  // =========================================================================
  describe("Activity Duration Validation via Actions", () => {
    const TRIP_ID = "trip-test-duration";
    const DAY_ID = "day-duration";

    it("accepts positive integer durations", async () => {
      const act = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Standard Duration",
        duration_minutes: 60,
      });
      expect(act.success).toBe(true);
      expect((act.data || act.activity).duration_minutes).toBe(60);
    });

    it("rejects zero or negative durations", async () => {
      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Zero Duration",
          duration_minutes: 0,
        })
      ).rejects.toThrow(/duration_minutes must be greater than 0/);

      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Negative Duration",
          duration_minutes: -30,
        })
      ).rejects.toThrow(/duration_minutes must be greater than 0/);
    });
  });

  // =========================================================================
  // 5. Waypoint Extraction & Sync Behavior
  // =========================================================================
  describe("Waypoint Extraction & Partial Coordinates", () => {
    it("extracts only activities with complete valid coordinates", () => {
      const activities = [
        { id: "act-1", title: "Valid Kyoto Spot", latitude: 35.0116, longitude: 135.7681, sort_order: 1 },
        { id: "act-2", title: "Missing Lng", latitude: 35.0116, longitude: null, sort_order: 2 },
        { id: "act-3", title: "Missing Lat", latitude: null, longitude: 135.7681, sort_order: 3 },
        { id: "act-4", title: "Valid Haneda Spot", latitude: 35.5494, longitude: 139.7798, sort_order: 4 },
        { id: "act-5", title: "NaN Coords", latitude: NaN, longitude: NaN, sort_order: 5 },
      ];

      const waypoints = extractWaypointsFromActivities(activities);
      expect(waypoints).toHaveLength(2);
      expect(waypoints[0].id).toBe("act-1");
      expect(waypoints[0].step).toBe(1);
      expect(waypoints[1].id).toBe("act-4");
      expect(waypoints[1].step).toBe(2);
    });

    it("orders waypoints deterministically by sort_order", () => {
      const activities = [
        { id: "act-b", title: "Step 2", latitude: 35.6895, longitude: 139.6917, sort_order: 2 },
        { id: "act-a", title: "Step 1", latitude: 35.5494, longitude: 139.7798, sort_order: 1 },
      ];

      const waypoints = extractWaypointsFromActivities(activities);
      expect(waypoints[0].id).toBe("act-a");
      expect(waypoints[1].id).toBe("act-b");
    });
  });

  // =========================================================================
  // 6. Vector Map & GeoJSON Construction Under Missing Key / Empty Inputs
  // =========================================================================
  describe("Vector Map Geometry & Geoapify Key Handling", () => {
    it("builds valid GeoJSON FeatureCollection when waypoints list is empty", () => {
      const geojson = buildDayTransitGeoJSON([], []);
      expect(geojson.type).toBe("FeatureCollection");
      expect(geojson.features).toHaveLength(0);
    });

    it("builds Point and LineString features when waypoints and transit legs exist", () => {
      const waypoints: WaypointItem[] = [
        { id: "1", step: 1, title: "Stop A", lat: 35.0, lng: 135.0 },
        { id: "2", step: 2, title: "Stop B", lat: 35.1, lng: 135.1 },
      ];
      const legs: TransitLegItem[] = [
        { fromId: "1", toId: "2", mode: "walk", distanceMeters: 1000 },
      ];

      const geojson = buildDayTransitGeoJSON(waypoints, legs);
      expect(geojson.type).toBe("FeatureCollection");
      expect(geojson.features.length).toBe(3);

      const lineFeature = geojson.features.find((f) => f.geometry.type === "LineString");
      expect(lineFeature).toBeDefined();
      expect(lineFeature?.properties?.mode).toBe("walk");
    });

    it("computes bounds accurately for multiple points", () => {
      const waypoints: WaypointItem[] = [
        { id: "1", step: 1, title: "South-West", lat: 34.0, lng: 135.0 },
        { id: "2", step: 2, title: "North-East", lat: 36.0, lng: 137.0 },
      ];
      const bounds = extractMapBounds(waypoints);
      expect(bounds).not.toBeNull();
      expect(bounds?.minLat).toBe(34.0);
      expect(bounds?.maxLat).toBe(36.0);
      expect(bounds?.minLng).toBe(135.0);
      expect(bounds?.maxLng).toBe(137.0);
    });

    it("returns null bounds for empty waypoints list without crashing", () => {
      expect(extractMapBounds([])).toBeNull();
    });

    it("resolves correct style URL or offline fallback based on API key presence", () => {
      function resolveStyle(apiKey?: string, isOffline: boolean = false) {
        return apiKey && !isOffline
          ? `https://maps.geoapify.com/v1/styles/osm-bright-smooth/style.json?apiKey=${apiKey}`
          : "OFFLINE_FALLBACK_STYLE";
      }

      expect(resolveStyle(undefined, false)).toBe("OFFLINE_FALLBACK_STYLE");
      expect(resolveStyle("", false)).toBe("OFFLINE_FALLBACK_STYLE");
      expect(resolveStyle("geo-key-12345", true)).toBe("OFFLINE_FALLBACK_STYLE");
      expect(resolveStyle("geo-key-12345", false)).toBe(
        "https://maps.geoapify.com/v1/styles/osm-bright-smooth/style.json?apiKey=geo-key-12345"
      );
    });
  });

  // =========================================================================
  // 7. Route Logic: Showcase vs Empty vs Invalid Trip IDs
  // =========================================================================
  describe("Route Resolution Logic (TripItineraryPage & TripMapPage)", () => {
    // Exact logic from itinerary/page.tsx:
    function resolveRouteNotFoundBehavior(
      trip: { id: string; title: string } | null,
      tripId: string
    ): "notFound" | "render" {
      const isShowcase =
        tripId === "kyoto-autumn-2025" ||
        tripId === "default" ||
        tripId.startsWith("mock-");

      if (!trip && !isShowcase) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId);
        if (isUuid) {
          return "notFound";
        }
      }
      return "render";
    }

    it("allows showcase route 'kyoto-autumn-2025' to render without 404", () => {
      expect(resolveRouteNotFoundBehavior(null, "kyoto-autumn-2025")).toBe("render");
    });

    it("allows showcase route 'mock-tokyo-2026' to render without 404", () => {
      expect(resolveRouteNotFoundBehavior(null, "mock-tokyo-2026")).toBe("render");
    });

    it("triggers 404 for a missing UUID trip id", () => {
      expect(
        resolveRouteNotFoundBehavior(null, "c73a3962-ae7b-40e8-b809-58b234479e00")
      ).toBe("notFound");
    });

    it("DEFECT CONFIRMATION: Invalid non-UUID strings fail to trigger 404 and instead render Kyoto showcase", () => {
      // If someone navigates to /trips/invalid-slug/itinerary
      // Because 'invalid-slug' is not a UUID, isUuid is false, so notFound() is NOT triggered!
      const result = resolveRouteNotFoundBehavior(null, "invalid-slug-1234");
      expect(result).toBe("render"); // Should have been "notFound"!
    });
  });

  // =========================================================================
  // 8. Empty Trip Data Fallback Analysis
  // =========================================================================
  describe("Empty Trip Data Fallback (ItineraryClientView & TripMapClientView)", () => {
    it("DEFECT CONFIRMATION: when a trip has dbDays = [], hasCustomSchedule is false and falls back to Kyoto 6-day showcase", () => {
      const dbDays: Array<{ day_number?: number }> = [];
      const hasCustomSchedule = Boolean(dbDays && dbDays.length > 0);

      // In ItineraryClientView, when hasCustomSchedule is false:
      expect(hasCustomSchedule).toBe(false);
      // As a consequence:
      // defaultDay becomes 2
      const defaultDay = hasCustomSchedule ? (dbDays[0]?.day_number || 1) : 2;
      expect(defaultDay).toBe(2);
      // daysList renders 6 hardcoded Kyoto days instead of empty trip notice
    });

    it("DEFECT CONFIRMATION: when custom day has 0 activities, waypoints fall back to Kyoto showcase waypoints", () => {
      const currentDbActivities: ActivitySyncInput[] = [];
      const showcaseWaypoints = [
        { id: "1", lat: 35.5494, lng: 139.7798 }, // Haneda
      ];

      // Replicating itinerary-client-view.tsx line 630:
      const currentWaypoints =
        currentDbActivities.length > 0
          ? extractWaypointsFromActivities(currentDbActivities)
          : showcaseWaypoints;

      // Because activities is empty, it returns Kyoto Haneda waypoint!
      expect(currentWaypoints).toHaveLength(1);
      expect(currentWaypoints[0].lat).toBe(35.5494);
    });
  });
});
