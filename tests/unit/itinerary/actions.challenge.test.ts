import { describe, it, expect, beforeEach } from "vitest";
import {
  createActivityAction,
  updateActivityAction,
  reorderActivitiesAction,
  resetActivityStore,
  seedActivityStore,
  type Activity,
} from "@/lib/itinerary/actions";
import {
  getActivityById,
  getActivitiesForDay,
} from "@/lib/itinerary/store";

describe("Empirical Challenge Suite: Itinerary Actions (Phase 6)", () => {
  const TRIP_ID = "trip-challenge-2026";
  const DAY_ID = "day-challenge-1";
  const OTHER_DAY_ID = "day-challenge-2";

  beforeEach(async () => {
    await resetActivityStore();
  });

  // =========================================================================
  // CHALLENGE DIMENSION 1: Coordinate Extremes & Boundary Stress
  // =========================================================================
  describe("Coordinate Extremes & Boundary Stress", () => {
    it("accepts exact boundary coordinates: lat = -90, 90 and lng = -180, 180", async () => {
      // Exact North Pole and Antimeridian East
      const northEast = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "North Pole Antimeridian East",
        latitude: 90,
        longitude: 180,
      });
      expect(northEast.success).toBe(true);
      const neAct = (northEast.data || northEast.activity) as Activity;
      expect(neAct.latitude).toBe(90);
      expect(neAct.longitude).toBe(180);

      // Exact South Pole and Antimeridian West
      const southWest = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "South Pole Antimeridian West",
        latitude: -90,
        longitude: -180,
      });
      expect(southWest.success).toBe(true);
      const swAct = (southWest.data || southWest.activity) as Activity;
      expect(swAct.latitude).toBe(-90);
      expect(swAct.longitude).toBe(-180);
    });

    it("accepts origin coordinate (0, 0 / Null Island)", async () => {
      const origin = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Null Island",
        latitude: 0,
        longitude: 0,
      });
      expect(origin.success).toBe(true);
      const act = (origin.data || origin.activity) as Activity;
      expect(act.latitude).toBe(0);
      expect(act.longitude).toBe(0);
    });

    it("strictly rejects latitude just outside bounds: 90.0001 and -90.0001", async () => {
      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Above North Pole",
          latitude: 90.0001,
          longitude: 0,
        })
      ).rejects.toThrow(/Latitude must be between -90 and 90 degrees/i);

      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Below South Pole",
          latitude: -90.0001,
          longitude: 0,
        })
      ).rejects.toThrow(/Latitude must be between -90 and 90 degrees/i);
    });

    it("strictly rejects longitude just outside bounds: 180.0001 and -180.0001", async () => {
      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Beyond East Meridian",
          latitude: 0,
          longitude: 180.0001,
        })
      ).rejects.toThrow(/Longitude must be between -180 and 180 degrees/i);

      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Beyond West Meridian",
          latitude: 0,
          longitude: -180.0001,
        })
      ).rejects.toThrow(/Longitude must be between -180 and 180 degrees/i);
    });

    it("strictly rejects NaN for latitude or longitude in createActivityAction", async () => {
      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "NaN Latitude",
          latitude: NaN,
          longitude: 139.75,
        })
      ).rejects.toThrow(/Latitude must be between -90 and 90 degrees/i);

      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "NaN Longitude",
          latitude: 35.68,
          longitude: NaN,
        })
      ).rejects.toThrow(/Longitude must be between -180 and 180 degrees/i);
    });

    it("strictly rejects Infinity and -Infinity for coordinates in createActivityAction", async () => {
      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Infinity Latitude",
          latitude: Infinity,
          longitude: 0,
        })
      ).rejects.toThrow(/Latitude must be between -90 and 90 degrees/i);

      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "-Infinity Latitude",
          latitude: -Infinity,
          longitude: 0,
        })
      ).rejects.toThrow(/Latitude must be between -90 and 90 degrees/i);

      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Infinity Longitude",
          latitude: 0,
          longitude: Infinity,
        })
      ).rejects.toThrow(/Longitude must be between -180 and 180 degrees/i);

      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "-Infinity Longitude",
          latitude: 0,
          longitude: -Infinity,
        })
      ).rejects.toThrow(/Longitude must be between -180 and 180 degrees/i);
    });

    it("strictly validates coordinates in updateActivityAction on extremes, NaN, and Infinity", async () => {
      const created = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Valid Base Activity",
        latitude: 35.0,
        longitude: 135.0,
      });
      const id = (created.data || created.activity)!.id;

      // Update to exact boundaries must succeed
      const validUpdate = await updateActivityAction(id, {
        latitude: 90,
        longitude: -180,
      });
      expect(validUpdate.success).toBe(true);

      // Update with invalid latitude
      await expect(
        updateActivityAction(id, { latitude: 90.0001 })
      ).rejects.toThrow(/Latitude must be between -90 and 90 degrees/i);

      await expect(
        updateActivityAction(id, { latitude: -90.0001 })
      ).rejects.toThrow(/Latitude must be between -90 and 90 degrees/i);

      await expect(
        updateActivityAction(id, { latitude: NaN })
      ).rejects.toThrow(/Latitude must be between -90 and 90 degrees/i);

      await expect(
        updateActivityAction(id, { latitude: Infinity })
      ).rejects.toThrow(/Latitude must be between -90 and 90 degrees/i);

      // Update with invalid longitude
      await expect(
        updateActivityAction(id, { longitude: 180.0001 })
      ).rejects.toThrow(/Longitude must be between -180 and 180 degrees/i);

      await expect(
        updateActivityAction(id, { longitude: -180.0001 })
      ).rejects.toThrow(/Longitude must be between -180 and 180 degrees/i);

      await expect(
        updateActivityAction(id, { longitude: NaN })
      ).rejects.toThrow(/Longitude must be between -180 and 180 degrees/i);

      await expect(
        updateActivityAction(id, { longitude: -Infinity })
      ).rejects.toThrow(/Longitude must be between -180 and 180 degrees/i);
    });

    it("evaluates duration extremes: 0, negative, NaN, and Infinity", async () => {
      // 0 duration
      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Zero Duration Activity",
          duration_minutes: 0,
        })
      ).rejects.toThrow(/duration_minutes must be greater than 0/i);

      // Negative duration
      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "Negative Duration Activity",
          duration_minutes: -60,
        })
      ).rejects.toThrow(/duration_minutes must be greater than 0/i);

      // NaN duration
      await expect(
        createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "NaN Duration Activity",
          duration_minutes: NaN,
        })
      ).rejects.toThrow(/duration_minutes must be greater than 0/i);

      // In updateActivityAction
      const created = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Base for Duration Update",
      });
      const id = (created.data || created.activity)!.id;

      await expect(
        updateActivityAction(id, { duration_minutes: 0 })
      ).rejects.toThrow(/duration_minutes must be greater than 0/i);

      await expect(
        updateActivityAction(id, { duration_minutes: -15 })
      ).rejects.toThrow(/duration_minutes must be greater than 0/i);
    });

    it("permits clearing coordinates to null or leaving undefined without error", async () => {
      const created = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Coordinate Clearing Test",
        latitude: 35.0,
        longitude: 135.0,
      });
      const id = (created.data || created.activity)!.id;

      const updated = await updateActivityAction(id, {
        latitude: null,
        longitude: null,
      });
      const act = (updated.data || updated.activity) as Activity;
      expect(act.latitude).toBeNull();
      expect(act.longitude).toBeNull();
    });
  });

  // =========================================================================
  // CHALLENGE DIMENSION 2: Reordering Stress & Edge Cases
  // =========================================================================
  describe("Reordering Stress, Empty Lists, Large Arrays & Ordering Invariants", () => {
    it("rejects empty list in reorderActivitiesAction", async () => {
      await expect(
        reorderActivitiesAction(DAY_ID, [])
      ).rejects.toThrow(/Invalid parameters for reorderActivitiesAction/i);
    });

    it("rejects non-array parameters or whitespace dayId", async () => {
      await expect(
        reorderActivitiesAction("   ", ["act-1"])
      ).rejects.toThrow(/Invalid parameters for reorderActivitiesAction/i);

      await expect(
        reorderActivitiesAction(DAY_ID, null as unknown as string[])
      ).rejects.toThrow(/Invalid parameters for reorderActivitiesAction/i);

      await expect(
        reorderActivitiesAction(DAY_ID, undefined as unknown as string[])
      ).rejects.toThrow(/Invalid parameters for reorderActivitiesAction/i);
    });

    it("handles reverse ordering correctly across sequential activities", async () => {
      const ids: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const res = await createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: `Activity ${i}`,
        });
        ids.push((res.data || res.activity)!.id);
      }

      // Initial ordering check: 1, 2, 3, 4, 5
      const initialDayActs = getActivitiesForDay(DAY_ID);
      expect(initialDayActs.map((a) => a.id)).toEqual(ids);
      expect(initialDayActs.map((a) => a.sort_order)).toEqual([1, 2, 3, 4, 5]);

      // Reverse: 5, 4, 3, 2, 1
      const reversedIds = [...ids].reverse();
      const reorderResult = await reorderActivitiesAction(DAY_ID, reversedIds);
      expect(reorderResult.success).toBe(true);
      expect(reorderResult.orderedActivityIds).toEqual(reversedIds);

      // Verify each activity has correct 1-based sort_order and order_index
      const updatedDayActs = getActivitiesForDay(DAY_ID);
      expect(updatedDayActs.map((a) => a.id)).toEqual(reversedIds);
      expect(updatedDayActs.map((a) => a.sort_order)).toEqual([1, 2, 3, 4, 5]);
      expect(updatedDayActs.map((a) => a.order_index)).toEqual([1, 2, 3, 4, 5]);
      expect(updatedDayActs.every((a) => a.is_user_edited === true)).toBe(true);
    });

    it("handles large arrays (100+ items) without performance degradation or truncation", async () => {
      const count = 100;
      const ids: string[] = [];

      // Bulk create 100 activities
      for (let i = 1; i <= count; i++) {
        const res = await createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: `Item ${i}`,
        });
        ids.push((res.data || res.activity)!.id);
      }

      // Arbitrary non-trivial permutation: evens first, then odds
      const evens = ids.filter((_, idx) => idx % 2 === 0);
      const odds = ids.filter((_, idx) => idx % 2 !== 0);
      const permuted = [...evens, ...odds];

      const start = performance.now();
      const result = await reorderActivitiesAction(DAY_ID, permuted);
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Must be fast under 1 second

      const dayActs = getActivitiesForDay(DAY_ID);
      expect(dayActs.length).toBe(count);
      expect(dayActs.map((a) => a.id)).toEqual(permuted);

      // Strict verification of sequential 1..100 sort_order
      for (let i = 0; i < count; i++) {
        expect(dayActs[i].sort_order).toBe(i + 1);
        expect(dayActs[i].order_index).toBe(i + 1);
        expect(dayActs[i].is_user_edited).toBe(true);
      }
    });

    it("rejects reordering when activity belongs to a different day", async () => {
      const act1 = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Day 1 Activity",
      });
      const act2 = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: OTHER_DAY_ID,
        title: "Day 2 Activity",
      });

      const id1 = (act1.data || act1.activity)!.id;
      const id2 = (act2.data || act2.activity)!.id;

      // Attempting to reorder Day 1 with an activity from Day 2
      await expect(
        reorderActivitiesAction(DAY_ID, [id1, id2])
      ).rejects.toThrow(/does not belong to day/i);
    });

    it("handles large arrays (500 items) with sub-second execution and correct 1-based order", async () => {
      const count = 500;
      const ids: string[] = [];

      for (let i = 1; i <= count; i++) {
        const res = await createActivityAction({
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: `Item ${i}`,
        });
        ids.push((res.data || res.activity)!.id);
      }

      // Permutation: reverse order of 500 items
      const reversed = [...ids].reverse();

      const start = performance.now();
      const result = await reorderActivitiesAction(DAY_ID, reversed);
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1500); // 500 items reordered within 1.5s

      const dayActs = getActivitiesForDay(DAY_ID);
      expect(dayActs.length).toBe(count);
      expect(dayActs[0].id).toBe(ids[count - 1]);
      expect(dayActs[count - 1].id).toBe(ids[0]);

      // Strict sequential order
      for (let i = 0; i < count; i++) {
        expect(dayActs[i].sort_order).toBe(i + 1);
        expect(dayActs[i].order_index).toBe(i + 1);
        expect(dayActs[i].is_user_edited).toBe(true);
      }
    });

    it("evaluates behavior on duplicate activity IDs in reorderActivitiesAction", async () => {
      const act1 = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Activity A",
      });
      const act2 = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Activity B",
      });

      const id1 = (act1.data || act1.activity)!.id;
      const id2 = (act2.data || act2.activity)!.id;

      // Duplicate payload: [id1, id1, id2]
      // Empirical observation: reorderActivitiesAction currently does not reject duplicate IDs.
      // This test captures the exact empirical behavior and its consequences:
      const res = await reorderActivitiesAction(DAY_ID, [id1, id1, id2]);
      expect(res.success).toBe(true);
      expect(res.orderedActivityIds).toEqual([id1, id1, id2]);

      // Consequence: sort_order for id1 is overwritten by its latest position in the array.
      // At index 0: sort_order = 1 (written)
      // At index 1: sort_order = 2 (overwritten!)
      // At index 2: sort_order = 3 (written)
      const stored1 = getActivityById(id1)!;
      const stored2 = getActivityById(id2)!;
      expect(stored1.sort_order).toBe(2);
      expect(stored2.sort_order).toBe(3);

      // Verify consequence: getActivitiesForDay has a sequence gap (sort_order starts at 2, not 1)
      const dayActs = getActivitiesForDay(DAY_ID);
      expect(dayActs.map((a) => a.sort_order)).toEqual([2, 3]);
      expect(dayActs.find((a) => a.sort_order === 1)).toBeUndefined();
    });
  });

  // =========================================================================
  // CHALLENGE DIMENSION 3: Invariant Preservation (is_user_edited = true)
  // =========================================================================
  describe("Invariant Preservation: is_user_edited = true", () => {
    it("strictly assigns is_user_edited = true and source = 'user' upon createActivityAction", async () => {
      const res = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Brand New User Activity",
      });

      const act = (res.data || res.activity) as Activity;
      expect(act.is_user_edited).toBe(true);
      expect(act.source).toBe("user");

      const inStore = getActivityById(act.id)!;
      expect(inStore.is_user_edited).toBe(true);
      expect(inStore.source).toBe("user");
    });

    it("promotes AI-generated activity (is_user_edited = false) to true upon updateActivityAction", async () => {
      // Seed store with an AI-generated activity
      const aiActivity: Activity = {
        id: "ai-generated-act-101",
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "AI Suggested Museum Tour",
        planned_time: "10:00",
        duration_minutes: 120,
        place_name: "Kyoto National Museum",
        place_category: "Museum",
        booking_requirement: null,
        description: "Draft generated by Gemini",
        latitude: 34.9902,
        longitude: 135.7731,
        geoapify_place_id: null,
        geom: null,
        sort_order: 1,
        order_index: 1,
        is_must_see: false,
        is_user_edited: false, // Originally AI generated
        travel_mode_to_next: null,
        transit_distance_meters: null,
        transit_duration_seconds: null,
        proposal_id: "prop-ai-1",
        source: "ai",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await seedActivityStore([aiActivity]);

      // Verify baseline is false
      expect(getActivityById("ai-generated-act-101")!.is_user_edited).toBe(false);

      // User updates the activity
      const updateRes = await updateActivityAction("ai-generated-act-101", {
        title: "User Modified Museum Tour",
        duration_minutes: 90,
      });

      expect(updateRes.success).toBe(true);
      const updated = (updateRes.data || updateRes.activity) as Activity;
      expect(updated.is_user_edited).toBe(true);

      // In-store must also be true
      const inStore = getActivityById("ai-generated-act-101")!;
      expect(inStore.is_user_edited).toBe(true);
      expect(inStore.title).toBe("User Modified Museum Tour");
    });

    it("resists tamper when caller explicitly passes is_user_edited: false in update", async () => {
      const created = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Tamper Target",
      });
      const id = (created.data || created.activity)!.id;

      const updateRes = await updateActivityAction(id, {
        title: "Attempted Invariant Override",
        is_user_edited: false as unknown as boolean,
      });

      const updated = (updateRes.data || updateRes.activity) as Activity;
      expect(updated.is_user_edited).toBe(true);

      const inStore = getActivityById(id)!;
      expect(inStore.is_user_edited).toBe(true);
    });

    it("promotes AI-generated activities to is_user_edited = true upon reordering", async () => {
      const now = new Date().toISOString();
      const aiActs: Activity[] = [
        {
          id: "ai-act-1",
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "AI Act 1",
          planned_time: "09:00",
          duration_minutes: 60,
          place_name: null,
          place_category: null,
          booking_requirement: null,
          description: null,
          latitude: null,
          longitude: null,
          geoapify_place_id: null,
          geom: null,
          sort_order: 1,
          order_index: 1,
          is_must_see: false,
          is_user_edited: false,
          travel_mode_to_next: null,
          transit_distance_meters: null,
          transit_duration_seconds: null,
          proposal_id: null,
          source: "ai",
          created_at: now,
          updated_at: now,
        },
        {
          id: "ai-act-2",
          trip_id: TRIP_ID,
          day_id: DAY_ID,
          title: "AI Act 2",
          planned_time: "11:00",
          duration_minutes: 60,
          place_name: null,
          place_category: null,
          booking_requirement: null,
          description: null,
          latitude: null,
          longitude: null,
          geoapify_place_id: null,
          geom: null,
          sort_order: 2,
          order_index: 2,
          is_must_see: false,
          is_user_edited: false,
          travel_mode_to_next: null,
          transit_distance_meters: null,
          transit_duration_seconds: null,
          proposal_id: null,
          source: "ai",
          created_at: now,
          updated_at: now,
        },
      ];

      await seedActivityStore(aiActs);

      expect(getActivityById("ai-act-1")!.is_user_edited).toBe(false);
      expect(getActivityById("ai-act-2")!.is_user_edited).toBe(false);

      // Reorder activities
      const reorderRes = await reorderActivitiesAction(DAY_ID, ["ai-act-2", "ai-act-1"]);
      expect(reorderRes.success).toBe(true);

      // Both activities must now be marked is_user_edited = true
      const act1 = getActivityById("ai-act-1")!;
      const act2 = getActivityById("ai-act-2")!;
      expect(act1.is_user_edited).toBe(true);
      expect(act2.is_user_edited).toBe(true);
      expect(act2.sort_order).toBe(1);
      expect(act1.sort_order).toBe(2);
    });

    it("preserves is_user_edited = true across arbitrary field updates", async () => {
      const created = await createActivityAction({
        trip_id: TRIP_ID,
        day_id: DAY_ID,
        title: "Field Modification Test",
      });
      const id = (created.data || created.activity)!.id;

      // Update place_category
      const u1 = await updateActivityAction(id, { place_category: "Dining" });
      expect((u1.data || u1.activity).is_user_edited).toBe(true);

      // Update booking_requirement
      const u2 = await updateActivityAction(id, { booking_requirement: "Mandatory Reservation" });
      expect((u2.data || u2.activity).is_user_edited).toBe(true);

      // Update planned_time
      const u3 = await updateActivityAction(id, { planned_time: "19:00" });
      expect((u3.data || u3.activity).is_user_edited).toBe(true);

      // Update duration_minutes
      const u4 = await updateActivityAction(id, { duration_minutes: 150 });
      expect((u4.data || u4.activity).is_user_edited).toBe(true);

      // Update description
      const u5 = await updateActivityAction(id, { description: "Fine dining experience." });
      expect((u5.data || u5.activity).is_user_edited).toBe(true);

      // Final retrieval check
      const finalAct = getActivityById(id)!;
      expect(finalAct.is_user_edited).toBe(true);
      expect(finalAct.place_category).toBe("Dining");
      expect(finalAct.booking_requirement).toBe("Mandatory Reservation");
      expect(finalAct.planned_time).toBe("19:00");
      expect(finalAct.duration_minutes).toBe(150);
      expect(finalAct.description).toBe("Fine dining experience.");
    });
  });
});
