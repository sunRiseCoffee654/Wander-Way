import { describe, it, expect, beforeEach } from "vitest";
import {
  BOOKING_TYPES,
  type BookingType,
  type BookingStatus,
  type NewBookingInput,
} from "@/lib/bookings/types";
import {
  filterBookings,
  calculateBookingMetrics,
  isValidStatusTransition,
} from "@/lib/bookings/helpers";
import {
  createBookingAction,
  updateBookingAction,
  deleteBookingAction,
  getBookingsAction,
  resetBookingsStore,
} from "@/lib/bookings/actions";

describe("Bookings Service & External Reservations Tracker", () => {
  const tripId = "test-trip-tokyo-2026";

  beforeEach(() => {
    resetBookingsStore();
  });

  describe("Booking Creation for All Supported Types", () => {
    it("creates bookings for all 7 supported booking types", async () => {
      const allTypes: BookingType[] = [
        "flight",
        "accommodation",
        "train",
        "bus",
        "activity",
        "rental",
        "other",
      ];

      expect(BOOKING_TYPES).toEqual(allTypes);

      for (const type of allTypes) {
        const input: NewBookingInput = {
          trip_id: tripId,
          provider_name: `Provider for ${type}`,
          booking_type: type,
          confirmation_code: `CONF-${type.toUpperCase()}-123`,
          booking_date: "2026-10-15T09:00:00Z",
          amount_minor_units: 12500, // 125.00
          currency: "USD",
          status: "idea",
        };

        const res = await createBookingAction(input);
        expect(res.success).toBe(true);
        expect(res.booking).toBeDefined();
        expect(res.booking?.booking_type).toBe(type);
        expect(res.booking?.provider_name).toBe(`Provider for ${type}`);
        expect(res.booking?.confirmation_code).toBe(`CONF-${type.toUpperCase()}-123`);
        expect(res.booking?.amount_minor_units).toBe(12500);
        expect(res.booking?.currency).toBe("USD");
      }

      const all = await getBookingsAction(tripId);
      expect(all.bookings.length).toBe(allTypes.length);
    });

    it("defaults status to 'idea' and currency to 'USD' if omitted", async () => {
      const res = await createBookingAction({
        trip_id: tripId,
        provider_name: "Quick Tour",
        booking_type: "activity",
        amount_minor_units: 3500,
      });

      expect(res.success).toBe(true);
      expect(res.booking?.status).toBe("idea");
      expect(res.booking?.currency).toBe("USD");
    });
  });

  describe("Status Lifecycle Transitions", () => {
    it("validates standard funnel transitions: idea -> researching -> price_selected -> booked -> completed", () => {
      expect(isValidStatusTransition("idea", "researching")).toBe(true);
      expect(isValidStatusTransition("researching", "price_selected")).toBe(true);
      expect(isValidStatusTransition("price_selected", "booked")).toBe(true);
      expect(isValidStatusTransition("booked", "completed")).toBe(true);
    });

    it("permits cancellation from any non-completed state", () => {
      const cancellableStatuses: BookingStatus[] = ["idea", "researching", "price_selected", "booked"];
      for (const s of cancellableStatuses) {
        expect(isValidStatusTransition(s, "cancelled")).toBe(true);
      }
    });

    it("rejects backwards transitions from completed or cancelled", () => {
      expect(isValidStatusTransition("completed", "idea")).toBe(false);
      expect(isValidStatusTransition("completed", "researching")).toBe(false);
      expect(isValidStatusTransition("completed", "booked")).toBe(false);
      expect(isValidStatusTransition("cancelled", "booked")).toBe(false);
    });

    it("updates booking status through the full lifecycle via updateBookingAction", async () => {
      const createRes = await createBookingAction({
        trip_id: tripId,
        provider_name: "Japan Airlines",
        booking_type: "flight",
        amount_minor_units: 95000,
        currency: "USD",
        status: "idea",
      });

      const bookingId = createRes.booking!.id;

      // 1. Advance to researching
      let updateRes = await updateBookingAction(bookingId, { status: "researching" });
      expect(updateRes.success).toBe(true);
      expect(updateRes.booking?.status).toBe("researching");

      // 2. Advance to price_selected
      updateRes = await updateBookingAction(bookingId, { status: "price_selected" });
      expect(updateRes.success).toBe(true);
      expect(updateRes.booking?.status).toBe("price_selected");

      // 3. Confirm booked with confirmation code
      updateRes = await updateBookingAction(bookingId, {
        status: "booked",
        confirmation_code: "JL-006-TKY",
      });
      expect(updateRes.success).toBe(true);
      expect(updateRes.booking?.status).toBe("booked");
      expect(updateRes.booking?.confirmation_code).toBe("JL-006-TKY");

      // 4. Mark completed after travel
      updateRes = await updateBookingAction(bookingId, { status: "completed" });
      expect(updateRes.success).toBe(true);
      expect(updateRes.booking?.status).toBe("completed");
    });
  });

  describe("Minor-Unit Arithmetic & Currency Retention", () => {
    it("preserves integer minor units and accurate summation without floating point drift", async () => {
      const sampleBookings: NewBookingInput[] = [
        {
          trip_id: tripId,
          provider_name: "Flight Outbound",
          booking_type: "flight",
          amount_minor_units: 45050, // 450.50
          currency: "USD",
          status: "booked",
        },
        {
          trip_id: tripId,
          provider_name: "Boutique Hotel Kyoto",
          booking_type: "accommodation",
          amount_minor_units: 82575, // 825.75
          currency: "USD",
          status: "booked",
        },
        {
          trip_id: tripId,
          provider_name: "Tea Ceremony Workshop",
          booking_type: "activity",
          amount_minor_units: 6000, // 60.00
          currency: "USD",
          status: "completed",
        },
        {
          trip_id: tripId,
          provider_name: "Shinkansen Green Car",
          booking_type: "train",
          amount_minor_units: 14025, // 140.25
          currency: "USD",
          status: "price_selected",
        },
        {
          trip_id: tripId,
          provider_name: "Helicopter Night Tour",
          booking_type: "activity",
          amount_minor_units: 30000, // 300.00
          currency: "USD",
          status: "idea",
        },
        {
          trip_id: tripId,
          provider_name: "Unused Bus Option",
          booking_type: "bus",
          amount_minor_units: 2500, // 25.00
          currency: "USD",
          status: "cancelled",
        },
      ];

      for (const b of sampleBookings) {
        await createBookingAction(b);
      }

      const { bookings } = await getBookingsAction(tripId);
      const metrics = calculateBookingMetrics(bookings);

      // Confirmed spend: booked + completed = 45050 + 82575 + 6000 = 133625 (1,336.25)
      expect(metrics.totalConfirmedMinorUnits).toBe(133625);

      // Pending / Pipeline spend: idea + researching + price_selected = 14025 + 30000 = 44025 (440.25)
      expect(metrics.totalPendingMinorUnits).toBe(44025);

      // Total count should exclude cancelled from confirmed/pending
      expect(metrics.counts.booked).toBe(2);
      expect(metrics.counts.completed).toBe(1);
      expect(metrics.counts.price_selected).toBe(1);
      expect(metrics.counts.idea).toBe(1);
      expect(metrics.counts.cancelled).toBe(1);
      expect(metrics.totalCount).toBe(6);
    });

    it("correctly separates and aggregates multi-currency bookings", () => {
      const mixed = [
        {
          id: "1",
          trip_id: tripId,
          provider_name: "USD Hotel",
          booking_type: "accommodation" as BookingType,
          confirmation_code: null,
          booking_date: null,
          amount_minor_units: 10000,
          currency: "USD",
          status: "booked" as BookingStatus,
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          trip_id: tripId,
          provider_name: "JPY Ryokan",
          booking_type: "accommodation" as BookingType,
          confirmation_code: null,
          booking_date: null,
          amount_minor_units: 35000,
          currency: "JPY",
          status: "booked" as BookingStatus,
          created_at: new Date().toISOString(),
        },
      ];

      const metrics = calculateBookingMetrics(mixed);
      expect(metrics.spendByCurrency.USD).toBe(10000);
      expect(metrics.spendByCurrency.JPY).toBe(35000);
    });
  });

  describe("Filtering Bookings by Category and Status", () => {
    it("filters bookings precisely by category, status, and combined criteria", async () => {
      const items: NewBookingInput[] = [
        { trip_id: tripId, provider_name: "Flight A", booking_type: "flight", amount_minor_units: 1000, status: "booked" },
        { trip_id: tripId, provider_name: "Hotel A", booking_type: "accommodation", amount_minor_units: 2000, status: "booked" },
        { trip_id: tripId, provider_name: "Train A", booking_type: "train", amount_minor_units: 500, status: "idea" },
        { trip_id: tripId, provider_name: "Flight B", booking_type: "flight", amount_minor_units: 1200, status: "idea" },
      ];

      for (const item of items) {
        await createBookingAction(item);
      }

      const { bookings } = await getBookingsAction(tripId);

      // Filter by category only
      const flightsOnly = filterBookings(bookings, { category: "flight" });
      expect(flightsOnly.length).toBe(2);
      expect(flightsOnly.every((b) => b.booking_type === "flight")).toBe(true);

      // Filter by status only
      const bookedOnly = filterBookings(bookings, { status: "booked" });
      expect(bookedOnly.length).toBe(2);
      expect(bookedOnly.every((b) => b.status === "booked")).toBe(true);

      // Combined filter: flight AND booked
      const bookedFlights = filterBookings(bookings, { category: "flight", status: "booked" });
      expect(bookedFlights.length).toBe(1);
      expect(bookedFlights[0].provider_name).toBe("Flight A");

      // Filter with "all"
      const allResults = filterBookings(bookings, { category: "all", status: "all" });
      expect(allResults.length).toBe(4);
    });

    it("deletes a booking record properly", async () => {
      const created = await createBookingAction({
        trip_id: tripId,
        provider_name: "Temporary Car Rental",
        booking_type: "rental",
        amount_minor_units: 15000,
        status: "idea",
      });

      const bookingId = created.booking!.id;
      const deleteRes = await deleteBookingAction(bookingId);
      expect(deleteRes.success).toBe(true);

      const remaining = await getBookingsAction(tripId);
      expect(remaining.bookings.find((b) => b.id === bookingId)).toBeUndefined();
    });
  });
});
