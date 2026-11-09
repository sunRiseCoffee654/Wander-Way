"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/supabase-types";
import {
  type Booking,
  type NewBookingInput,
} from "./types";
import { isValidStatusTransition } from "./helpers";

// In-memory fallback / demo cache for test suites and showcase trips
const BOOKINGS_STORE = new Map<string, Booking>();

// Pre-populate showcase trip bookings
function seedDemoBookings(tripId: string) {
  if (BOOKINGS_STORE.size > 0) return;

  const demoItems: Booking[] = [
    {
      id: "book-1",
      trip_id: tripId,
      provider_name: "All Nippon Airways (ANA NH107)",
      booking_type: "flight",
      confirmation_code: "ANA-NH107-TK",
      booking_date: "2026-10-14T11:00:00Z",
      amount_minor_units: 84000,
      currency: "USD",
      status: "booked",
      metadata: { seat: "14K", flight_num: "NH107" },
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: "book-2",
      trip_id: tripId,
      provider_name: "Gion Machiya Heritage Ryokan",
      booking_type: "accommodation",
      confirmation_code: "RYO-44910-KY",
      booking_date: "2026-10-15T15:00:00Z",
      amount_minor_units: 125000,
      currency: "USD",
      status: "booked",
      metadata: { check_in: "15:00", nights: 4 },
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "book-3",
      trip_id: tripId,
      provider_name: "JR Tokaido Shinkansen (Nozomi)",
      booking_type: "train",
      confirmation_code: "JR-SHK-8821",
      booking_date: "2026-10-18T09:30:00Z",
      amount_minor_units: 14500,
      currency: "USD",
      status: "price_selected",
      metadata: { car: "Green Car 8", seat: "5A" },
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "book-4",
      trip_id: tripId,
      provider_name: "Arashiyama Bamboo Dawn Rickshaw",
      booking_type: "activity",
      confirmation_code: null,
      booking_date: "2026-10-16T07:00:00Z",
      amount_minor_units: 6500,
      currency: "USD",
      status: "researching",
      metadata: { duration_hours: 2 },
      created_at: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: "book-5",
      trip_id: tripId,
      provider_name: "Toyota Rent a Car Kyoto",
      booking_type: "rental",
      confirmation_code: null,
      booking_date: "2026-10-19T08:00:00Z",
      amount_minor_units: 11000,
      currency: "USD",
      status: "idea",
      metadata: { vehicle: "Compact Hybrid" },
      created_at: new Date(Date.now() - 21600000).toISOString(),
    },
  ];

  for (const b of demoItems) {
    BOOKINGS_STORE.set(b.id, b);
  }
}

/**
 * Resets memory store for unit testing
 */
export async function resetBookingsStore(): Promise<void> {
  BOOKINGS_STORE.clear();
}

/**
 * Server action: Create a new booking
 */
export async function createBookingAction(
  data: NewBookingInput
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  try {
    if (!data.trip_id || !data.provider_name || !data.booking_type) {
      return { success: false, error: "Missing required booking details." };
    }

    const newBooking: Booking = {
      id: `booking-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      trip_id: data.trip_id,
      provider_name: data.provider_name.trim(),
      booking_type: data.booking_type,
      confirmation_code: data.confirmation_code?.trim() || null,
      booking_date: data.booking_date || null,
      amount_minor_units: Math.round(Number(data.amount_minor_units) || 0),
      currency: (data.currency || "USD").toUpperCase(),
      status: data.status || "idea",
      metadata: data.metadata || null,
      created_at: new Date().toISOString(),
    };

    // Store in memory store
    BOOKINGS_STORE.set(newBooking.id, newBooking);

    // Attempt Supabase insert if available
    try {
      const supabase = await createClient();
      const { data: dbData, error } = await supabase
        .from("bookings")
        .insert({
          id: newBooking.id,
          trip_id: newBooking.trip_id,
          provider_name: newBooking.provider_name,
          booking_type: newBooking.booking_type,
          confirmation_code: newBooking.confirmation_code,
          booking_date: newBooking.booking_date,
          amount_minor_units: newBooking.amount_minor_units,
          currency: newBooking.currency,
          status: newBooking.status,
          metadata: newBooking.metadata as Json,
        })
        .select()
        .single();

      if (!error && dbData) {
        return { success: true, booking: dbData as Booking };
      }
    } catch {
      // Graceful fallback to memory store
    }

    return { success: true, booking: newBooking };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create booking";
    return { success: false, error: message };
  }
}

/**
 * Server action: Update an existing booking
 */
export async function updateBookingAction(
  id: string,
  updates: Partial<NewBookingInput>
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  try {
    const existing = BOOKINGS_STORE.get(id);

    if (existing && updates.status) {
      if (!isValidStatusTransition(existing.status, updates.status)) {
        return {
          success: false,
          error: `Cannot transition from '${existing.status}' to '${updates.status}'.`,
        };
      }
    }

    const updated: Booking = {
      ...(existing || {
        id,
        trip_id: updates.trip_id || "default",
        provider_name: updates.provider_name || "Reservation",
        booking_type: updates.booking_type || "other",
        confirmation_code: null,
        booking_date: null,
        amount_minor_units: 0,
        currency: "USD",
        status: "idea",
        created_at: new Date().toISOString(),
      }),
      ...(updates.provider_name ? { provider_name: updates.provider_name.trim() } : {}),
      ...(updates.booking_type ? { booking_type: updates.booking_type } : {}),
      ...(updates.confirmation_code !== undefined
        ? { confirmation_code: updates.confirmation_code?.trim() || null }
        : {}),
      ...(updates.booking_date !== undefined ? { booking_date: updates.booking_date } : {}),
      ...(updates.amount_minor_units !== undefined
        ? { amount_minor_units: Math.round(Number(updates.amount_minor_units)) }
        : {}),
      ...(updates.currency ? { currency: updates.currency.toUpperCase() } : {}),
      ...(updates.status ? { status: updates.status } : {}),
      ...(updates.metadata !== undefined ? { metadata: updates.metadata } : {}),
    };

    BOOKINGS_STORE.set(id, updated);

    // Attempt Supabase update
    try {
      const supabase = await createClient();
      const { data: dbData, error } = await supabase
        .from("bookings")
        .update({
          ...(updates.provider_name ? { provider_name: updates.provider_name.trim() } : {}),
          ...(updates.booking_type ? { booking_type: updates.booking_type } : {}),
          ...(updates.confirmation_code !== undefined
            ? { confirmation_code: updates.confirmation_code?.trim() || null }
            : {}),
          ...(updates.booking_date !== undefined ? { booking_date: updates.booking_date } : {}),
          ...(updates.amount_minor_units !== undefined
            ? { amount_minor_units: Math.round(Number(updates.amount_minor_units)) }
            : {}),
          ...(updates.currency ? { currency: updates.currency.toUpperCase() } : {}),
          ...(updates.status ? { status: updates.status } : {}),
          ...(updates.metadata !== undefined ? { metadata: updates.metadata as Json } : {}),
        })
        .eq("id", id)
        .select()
        .single();

      if (!error && dbData) {
        return { success: true, booking: dbData as Booking };
      }
    } catch {
      // Retain memory store
    }

    return { success: true, booking: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update booking";
    return { success: false, error: message };
  }
}

/**
 * Server action: Delete a booking
 */
export async function deleteBookingAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    BOOKINGS_STORE.delete(id);

    try {
      const supabase = await createClient();
      await supabase.from("bookings").delete().eq("id", id);
    } catch {
      // Memory store already cleaned
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete booking";
    return { success: false, error: message };
  }
}

/**
 * Server action: Fetch all bookings for a trip
 */
export async function getBookingsAction(
  tripId: string
): Promise<{ success: boolean; bookings: Booking[]; error?: string }> {
  try {
    // If showcase trip and store is empty, seed demo items
    if (tripId.includes("kyoto") || tripId === "default") {
      seedDemoBookings(tripId);
    }

    // Try Supabase first
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return { success: true, bookings: data as Booking[] };
      }
    } catch {
      // Fall through to memory store
    }

    const memoryList = Array.from(BOOKINGS_STORE.values()).filter(
      (b) => b.trip_id === tripId
    );

    return { success: true, bookings: memoryList };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch bookings";
    return { success: false, bookings: [], error: message };
  }
}
