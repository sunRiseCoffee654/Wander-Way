import type { Database } from "@/lib/types/database";

export type BudgetLineItemRow =
  Database["public"]["Tables"]["budget_line_items"]["Row"];

export interface MockTripBudgetConfig {
  id: string;
  title: string;
  destination: string;
  budget_minor_units: number;
  budget_currency: string;
  budget_basis: string;
}

export function getMockRajasthanTripBudget(tripId: string): MockTripBudgetConfig {
  return {
    id: tripId,
    title: "Royal Rajasthan Heritage & Cultural Circuit",
    destination: "Jaipur & Udaipur, Rajasthan",
    budget_minor_units: 35000000, // ₹3,50,000 INR
    budget_currency: "INR",
    budget_basis: "total",
  };
}

export function getMockRajasthanBudgetLineItems(tripId: string): BudgetLineItemRow[] {
  return [
    {
      id: "mock-bl-1",
      trip_id: tripId,
      title: "Heritage Haveli Palace Stay in Jaipur (3 Nights)",
      category: "Lodging",
      amount_minor_units: 9500000, // ₹95,000
      currency: "INR",
      evidence_type: "live_quote",
      source_name: "Heritage Haveli Palace Booking",
      source_url: null,
      fx_rate_to_trip_currency: 1,
      fx_timestamp: null,
      checked_at: null,
      is_paid: true,
      created_at: "2026-11-01T10:00:00Z",
      activity_id: null,
      paid_by_user_id: null,
    },
    {
      id: "mock-bl-2",
      trip_id: tripId,
      title: "Vande Bharat Express Executive Chair Car (Delhi–Jaipur)",
      category: "Transport",
      amount_minor_units: 4800000, // ₹48,000
      currency: "INR",
      evidence_type: "published_price",
      source_name: "IRCTC Official Tariff",
      source_url: null,
      fx_rate_to_trip_currency: 1,
      fx_timestamp: null,
      checked_at: null,
      is_paid: true,
      created_at: "2026-11-02T11:00:00Z",
      activity_id: null,
      paid_by_user_id: null,
    },
    {
      id: "mock-bl-3",
      trip_id: tripId,
      title: "Amber Fort & City Palace Guided Heritage Walk",
      category: "Activities",
      amount_minor_units: 1800000, // ₹18,000
      currency: "INR",
      evidence_type: "published_price",
      source_name: "ASI Heritage Official Ledger",
      source_url: null,
      fx_rate_to_trip_currency: 1,
      fx_timestamp: null,
      checked_at: null,
      is_paid: false,
      created_at: "2026-11-03T12:00:00Z",
      activity_id: null,
      paid_by_user_id: null,
    },
    {
      id: "mock-bl-4",
      trip_id: tripId,
      title: "Chokhi Dhani Royal Rajasthani Thali Dining",
      category: "Food & Dining",
      amount_minor_units: 3600000, // ₹36,000
      currency: "INR",
      evidence_type: "verified_range",
      source_name: "Verified Culinary Guide",
      source_url: null,
      fx_rate_to_trip_currency: 1,
      fx_timestamp: null,
      checked_at: null,
      is_paid: false,
      created_at: "2026-11-04T13:00:00Z",
      activity_id: null,
      paid_by_user_id: null,
    },
    {
      id: "mock-bl-5",
      trip_id: tripId,
      title: "Nahargarh Fort Sunset Trek & Royal Stepwell Tour",
      category: "Activities",
      amount_minor_units: 2200000, // ₹22,000
      currency: "INR",
      evidence_type: "live_quote",
      source_name: "Rajasthan Tourism Authorized Guide",
      source_url: null,
      fx_rate_to_trip_currency: 1,
      fx_timestamp: null,
      checked_at: null,
      is_paid: true,
      created_at: "2026-11-05T09:00:00Z",
      activity_id: null,
      paid_by_user_id: null,
    },
    {
      id: "mock-bl-6",
      trip_id: tripId,
      title: "Private AC Innova Car Transit & Pre-paid Auto Rickshaws",
      category: "Transport",
      amount_minor_units: 2800000, // ₹28,000
      currency: "INR",
      evidence_type: "published_price",
      source_name: "Rajasthan Tourism Development Corp",
      source_url: null,
      fx_rate_to_trip_currency: 1,
      fx_timestamp: null,
      checked_at: null,
      is_paid: true,
      created_at: "2026-11-06T14:00:00Z",
      activity_id: null,
      paid_by_user_id: null,
    },
    {
      id: "mock-bl-7",
      trip_id: tripId,
      title: "Johari Bazaar Street Food, Lassi & Sweets Fund",
      category: "Food & Dining",
      amount_minor_units: 1900000, // ₹19,000
      currency: "INR",
      evidence_type: "calculated_estimate",
      source_name: "Estimated Daily Food Allowance",
      source_url: null,
      fx_rate_to_trip_currency: 1,
      fx_timestamp: null,
      checked_at: null,
      is_paid: false,
      created_at: "2026-11-07T15:00:00Z",
      activity_id: null,
      paid_by_user_id: null,
    },
    {
      id: "mock-bl-8",
      trip_id: tripId,
      title: "Blue Pottery, Block Print Textiles & Monsoon Umbrellas",
      category: "Gear & Misc",
      amount_minor_units: 1100000, // ₹11,000
      currency: "INR",
      evidence_type: "user_entered",
      source_name: "Artisan Cooperative & Travel Gear",
      source_url: null,
      fx_rate_to_trip_currency: 1,
      fx_timestamp: null,
      checked_at: null,
      is_paid: false,
      created_at: "2026-11-08T16:00:00Z",
      activity_id: null,
      paid_by_user_id: null,
    },
  ];
}
