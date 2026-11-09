import type { Json } from "@/lib/types/supabase-types";

export const BOOKING_TYPES = [
  "flight",
  "accommodation",
  "train",
  "bus",
  "activity",
  "rental",
  "other",
] as const;

export type BookingType = (typeof BOOKING_TYPES)[number];

export const BOOKING_STATUSES = [
  "idea",
  "researching",
  "price_selected",
  "booked",
  "cancelled",
  "completed",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface Booking {
  id: string;
  trip_id: string;
  provider_name: string;
  booking_type: BookingType;
  confirmation_code: string | null;
  booking_date: string | null;
  amount_minor_units: number;
  currency: string;
  status: BookingStatus;
  metadata?: Record<string, unknown> | Json | null;
  created_at: string;
}

export interface NewBookingInput {
  trip_id: string;
  provider_name: string;
  booking_type: BookingType;
  confirmation_code?: string | null;
  booking_date?: string | null;
  amount_minor_units: number;
  currency?: string;
  status?: BookingStatus;
  metadata?: Record<string, unknown> | Json | null;
}

export interface BookingMetrics {
  totalConfirmedMinorUnits: number;
  totalPendingMinorUnits: number;
  spendByCurrency: Record<string, number>;
  counts: Record<BookingStatus, number>;
  totalCount: number;
}

export interface BookingFilterOptions {
  category?: BookingType | "all";
  status?: BookingStatus | "all";
  searchQuery?: string;
}
