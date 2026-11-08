import { describe, it, expect } from "vitest";
import {
  extractWaypointsFromActivities,
  resolveSelectedWaypointCardId,
} from "@/lib/itinerary/sync-helpers";

describe("Itinerary Timeline & Vector Map Bi-directional Sync (PRD v3.0 §5.4)", () => {
  describe("extractWaypointsFromActivities", () => {
    it("extracts valid waypoints from activities with geographic coordinates", () => {
      const activities = [
        {
          id: "act-1",
          title: "Haneda Airport Arrival",
          latitude: 35.5494,
          longitude: 139.7798,
          planned_time: "15:15",
          sort_order: 1,
        },
        {
          id: "act-2",
          title: "Hotel Cerulean Shinjuku",
          latitude: 35.6895,
          longitude: 139.6917,
          planned_time: "17:00",
          sort_order: 2,
        },
      ];

      const waypoints = extractWaypointsFromActivities(activities);
      expect(waypoints.length).toBe(2);
      expect(waypoints[0].step).toBe(1);
      expect(waypoints[0].lat).toBe(35.5494);
      expect(waypoints[0].lng).toBe(139.7798);
      expect(waypoints[1].step).toBe(2);
    });

    it("filters out activities with missing coordinates to prevent hallucinated map pins", () => {
      const activities = [
        {
          id: "act-valid",
          title: "Valid Place",
          latitude: 35.0,
          longitude: 135.0,
          sort_order: 1,
        },
        {
          id: "act-invalid",
          title: "Unresolved Place",
          latitude: null,
          longitude: null,
          sort_order: 2,
        },
      ];

      const waypoints = extractWaypointsFromActivities(activities);
      expect(waypoints.length).toBe(1);
      expect(waypoints[0].id).toBe("act-valid");
    });
  });

  describe("resolveSelectedWaypointCardId", () => {
    it("generates deterministic DOM ID for timeline card matching", () => {
      expect(resolveSelectedWaypointCardId("act-123")).toBe("activity-card-act-123");
    });
  });
});