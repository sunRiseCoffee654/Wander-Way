import type {
  Booking,
  BookingStatus,
  BookingFilterOptions,
  BookingMetrics,
} from "./types";

/**
 * Validates status transitions through the booking funnel
 */
const FUNNEL_ORDER: Record<BookingStatus, number> = {
  idea: 0,
  researching: 1,
  price_selected: 2,
  booked: 3,
  completed: 4,
  cancelled: -1,
};

export function isValidStatusTransition(
  currentStatus: BookingStatus,
  targetStatus: BookingStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  if (currentStatus === "completed" || currentStatus === "cancelled") {
    return false;
  }
  if (targetStatus === "cancelled") {
    return true;
  }

  const currentRank = FUNNEL_ORDER[currentStatus];
  const targetRank = FUNNEL_ORDER[targetStatus];

  return targetRank >= currentRank;
}

/**
 * Filters a list of bookings by type/category, status, and query
 */
export function filterBookings(
  bookings: Booking[],
  filters: BookingFilterOptions
): Booking[] {
  return bookings.filter((b) => {
    if (filters.category && filters.category !== "all" && b.booking_type !== filters.category) {
      return false;
    }
    if (filters.status && filters.status !== "all" && b.status !== filters.status) {
      return false;
    }
    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchProvider = b.provider_name.toLowerCase().includes(q);
      const matchCode = b.confirmation_code?.toLowerCase().includes(q) ?? false;
      if (!matchProvider && !matchCode) return false;
    }
    return true;
  });
}

/**
 * Calculates budget metrics in minor units across bookings
 */
export function calculateBookingMetrics(bookings: Booking[]): BookingMetrics {
  let totalConfirmed = 0;
  let totalPending = 0;
  const spendByCurrency: Record<string, number> = {};
  const counts: Record<BookingStatus, number> = {
    idea: 0,
    researching: 0,
    price_selected: 0,
    booked: 0,
    cancelled: 0,
    completed: 0,
  };

  for (const b of bookings) {
    counts[b.status] = (counts[b.status] || 0) + 1;

    if (b.status === "booked" || b.status === "completed") {
      totalConfirmed += b.amount_minor_units;
      spendByCurrency[b.currency] =
        (spendByCurrency[b.currency] || 0) + b.amount_minor_units;
    } else if (
      b.status === "idea" ||
      b.status === "researching" ||
      b.status === "price_selected"
    ) {
      totalPending += b.amount_minor_units;
    }
  }

  return {
    totalConfirmedMinorUnits: totalConfirmed,
    totalPendingMinorUnits: totalPending,
    spendByCurrency,
    counts,
    totalCount: bookings.length,
  };
}
