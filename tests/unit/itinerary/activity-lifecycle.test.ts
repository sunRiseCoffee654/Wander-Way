import { describe, it, expect, beforeEach } from "vitest";
import {
  createActivityAction,
  updateActivityAction,
  deleteActivityAction,
  reorderActivitiesAction,
  resetActivityStore,
  type NewActivityInput,
  type Activity,
} from "@/lib/itinerary/actions";
import {
  getActivityById,
  getActivitiesForDay,
} from "@/lib/itinerary/store";

// Helper to assert action failure whether via rejected promise or { success: false }
async function assertActionRejectsOrFails(
  actionPromise: Promise<{ success: boolean; error?: string } | unknown>
) {
  let resolved: { success: boolean; error?: string } | null = null;
  let rejected = false;
  let error: unknown = null;
  try {
    resolved = (await actionPromise) as { success: boolean; error?: string };
  } catch (err) {
    rejected = true;
    error = err;
  }

  if (rejected) {
    expect(error).toBeDefined();
    return;
  }

  expect(resolved).toBeDefined();
  expect(resolved?.success).toBe(false);
  expect(resolved?.error).toBeDefined();
}

describe("Itinerary Activity Lifecycle & Invariant Verification (Phase 6 TDD)", () => {
  const TRIP_ID = "trip-test-tokyo-2026";
  const DAY_ID = "day-1";

  beforeEach(async () => {
    await resetActivityStore();
  });

  describe("1. Adding a new activity (createActivityAction)", () => {
    it("creates an activity with proper day_id, title, coordinates, and sets is_user_edited = true", async () => {
      const input: NewActivityInput = {
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Senso-ji Morning Exploration",
        planned_time: "08:30",
        duration_minutes: 90,
        place_name: "Senso-ji, Asakusa",
        place_category: "Culture / Temple",
        booking_requirement: "No booking required (Free entry)",
        description: "Visit Tokyo's oldest Buddhist temple before mid-day crowds gather.",
        latitude: 35.7148,
        longitude: 139.7967,
      };

      const result = await createActivityAction(input);

      expect(result.success).toBe(true);
      // Support dual return contract: both .data and .activity populated
      const act = (result.data || result.activity) as Activity;
      expect(act).toBeDefined();
      expect(act.id).toBeDefined();
      expect(act.trip_id).toBe(TRIP_ID);
      expect(act.day_id).toBe(DAY_ID);
      expect(act.title).toBe("Senso-ji Morning Exploration");
      expect(act.planned_time).toBe("08:30");
      expect(act.duration_minutes).toBe(90);
      expect(act.place_name).toBe("Senso-ji, Asakusa");
      expect(act.place_category).toBe("Culture / Temple");
      expect(act.booking_requirement).toBe("No booking required (Free entry)");
      expect(act.latitude).toBe(35.7148);
      expect(act.longitude).toBe(139.7967);

      // Invariant: User additions outrank AI and are strictly marked is_user_edited = true
      expect(act.is_user_edited).toBe(true);
      expect(act.source).toBe("user");

      // Verify sequence initialized
      expect(act.sort_order).toBe(1);
      expect(act.order_index ?? act.sort_order).toBe(1);
    });

    it("auto-increments sort_order / order_index when multiple activities are added to the same day", async () => {
      const act1 = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Activity 1",
      });
      const act2 = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Activity 2",
      });
      const act3 = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Activity 3",
      });

      const a1 = act1.data || act1.activity;
      const a2 = act2.data || act2.activity;
      const a3 = act3.data || act3.activity;

      expect(a1.sort_order).toBe(1);
      expect(a1.order_index ?? a1.sort_order).toBe(1);

      expect(a2.sort_order).toBe(2);
      expect(a2.order_index ?? a2.sort_order).toBe(2);

      expect(a3.sort_order).toBe(3);
      expect(a3.order_index ?? a3.sort_order).toBe(3);
    });

    it("leaves latitude and longitude null when coordinates are not provided (no fake GPS)", async () => {
      const result = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Ungrounded Coffee Break",
      });

      const act = (result.data || result.activity) as Activity;
      expect(act.latitude).toBeNull();
      expect(act.longitude).toBeNull();
    });
  });

  describe("2. Editing an activity (updateActivityAction)", () => {
    it("modifies fields cleanly and preserves/sets is_user_edited = true", async () => {
      const created = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Initial Draft Lunch",
        planned_time: "12:00",
        duration_minutes: 60,
        place_name: "Draft Place",
      });
      const initialId = (created.data || created.activity)!.id;

      const updateResult = await updateActivityAction(initialId, {
        title: "Kappo Ryokan Kaiseki Lunch",
        planned_time: "12:30",
        duration_minutes: 90,
        place_name: "Gion Sasaki",
        booking_requirement: "Reservation Confirmed #GS-104",
      });

      expect(updateResult.success).toBe(true);
      const updated = (updateResult.data || updateResult.activity) as Activity;
      expect(updated.title).toBe("Kappo Ryokan Kaiseki Lunch");
      expect(updated.planned_time).toBe("12:30");
      expect(updated.duration_minutes).toBe(90);
      expect(updated.place_name).toBe("Gion Sasaki");
      expect(updated.booking_requirement).toBe("Reservation Confirmed #GS-104");

      // Invariant: Edits MUST mark is_user_edited = true
      expect(updated.is_user_edited).toBe(true);
    });

    it("enforces invariant is_user_edited = true even if caller tries to pass false", async () => {
      const created = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Tamper Test Activity",
      });
      const initialId = (created.data || created.activity)!.id;

      const updateResult = await updateActivityAction(initialId, {
        title: "Modified Title",
        is_user_edited: false,
      });

      const updated = (updateResult.data || updateResult.activity) as Activity;
      expect(updated.is_user_edited).toBe(true);
    });
  });

  describe("3. Deleting an activity (deleteActivityAction)", () => {
    it("deletes an activity from a day and verifies it is no longer retrievable", async () => {
      const created = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "To Be Deleted",
      });
      const actId = (created.data || created.activity)!.id;

      expect(getActivityById(actId)).toBeDefined();

      const deleteResult = await deleteActivityAction(actId);
      expect(deleteResult.success).toBe(true);

      expect(getActivityById(actId)).toBeUndefined();
      expect(getActivitiesForDay(DAY_ID).find((a) => a.id === actId)).toBeUndefined();
    });
  });

  describe("4. Reordering activities within a day (reorderActivitiesAction)", () => {
    it("updates order_index / sort_order sequence properly and marks all as is_user_edited = true", async () => {
      const act1 = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Step 1",
      });
      const act2 = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Step 2",
      });
      const act3 = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Step 3",
      });

      const id1 = (act1.data || act1.activity)!.id;
      const id2 = (act2.data || act2.activity)!.id;
      const id3 = (act3.data || act3.activity)!.id;

      // Reverse order: Step 3, Step 1, Step 2
      const newOrder = [id3, id1, id2];
      const reorderResult = await reorderActivitiesAction(DAY_ID, newOrder);

      expect(reorderResult.success).toBe(true);

      const updated1 = getActivityById(id1)!;
      const updated2 = getActivityById(id2)!;
      const updated3 = getActivityById(id3)!;

      // Verify sequential order_index and sort_order
      expect(updated3.sort_order).toBe(1);
      expect(updated3.order_index ?? updated3.sort_order).toBe(1);

      expect(updated1.sort_order).toBe(2);
      expect(updated1.order_index ?? updated1.sort_order).toBe(2);

      expect(updated2.sort_order).toBe(3);
      expect(updated2.order_index ?? updated2.sort_order).toBe(3);

      // Invariant: Reordered activities reflect user arrangement
      expect(updated3.is_user_edited).toBe(true);
      expect(updated1.is_user_edited).toBe(true);
      expect(updated2.is_user_edited).toBe(true);

      // Verify day retrieval returns updated order
      const dayActivities = getActivitiesForDay(DAY_ID);
      expect(dayActivities.map((a) => a.id)).toEqual(newOrder);
    });
  });

  describe("5. Error Cases: Non-Existent Trip/Day and Invalid Inputs", () => {
    it("rejects creation when required fields are missing", async () => {
      // Missing title
      await assertActionRejectsOrFails(
        createActivityAction({ trip_id: TRIP_ID, day_id: DAY_ID, title: "" })
      );
      // Missing trip_id
      await assertActionRejectsOrFails(
        createActivityAction({ trip_id: "", day_id: DAY_ID, title: "Valid Title" })
      );
      // Missing day_id
      await assertActionRejectsOrFails(
        createActivityAction({ trip_id: TRIP_ID, day_id: "", title: "Valid Title" })
      );
    });

    it("rejects creation when latitude or longitude are out of geographic bounds", async () => {
      // Latitude > 90
      await assertActionRejectsOrFails(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Invalid North Pole",
          latitude: 95.0,
          longitude: 139.0,
        })
      );
      // Latitude < -90
      await assertActionRejectsOrFails(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Invalid South Pole",
          latitude: -95.0,
          longitude: 139.0,
        })
      );
      // Longitude > 180
      await assertActionRejectsOrFails(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Invalid East Meridian",
          latitude: 35.0,
          longitude: 195.0,
        })
      );
      // Longitude < -180
      await assertActionRejectsOrFails(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Invalid West Meridian",
          latitude: 35.0,
          longitude: -195.0,
        })
      );
    });

    it("rejects creation with non-positive duration_minutes", async () => {
      await assertActionRejectsOrFails(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Zero Duration",
          duration_minutes: 0,
        })
      );
      await assertActionRejectsOrFails(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Negative Duration",
          duration_minutes: -30,
        })
      );
    });

    it("rejects updating a non-existent activity ID", async () => {
      await assertActionRejectsOrFails(
        updateActivityAction("non-existent-activity-id-404", {
          title: "Ghost Activity Update",
        })
      );
    });

    it("rejects updating when activityId is empty", async () => {
      await assertActionRejectsOrFails(
        updateActivityAction("", { title: "No ID Update" })
      );
    });

    it("rejects deleting a non-existent activity ID", async () => {
      await assertActionRejectsOrFails(
        deleteActivityAction("non-existent-activity-id-404")
      );
    });

    it("rejects deleting when activityId is empty", async () => {
      await assertActionRejectsOrFails(deleteActivityAction(""));
    });

    it("rejects reordering when dayId is empty or activity IDs do not exist", async () => {
      await assertActionRejectsOrFails(
        reorderActivitiesAction("", ["act-1", "act-2"])
      );
      await assertActionRejectsOrFails(
        reorderActivitiesAction(DAY_ID, ["non-existent-activity-id"])
      );
    });
  });
});
