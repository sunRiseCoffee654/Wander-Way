/**
 * Core domain types for AI Plan Generation, Grounding, and Proposal Review.
 * PRD v3.0 §5.4, §5.5, §5.7; UI_UX_PLAN.md §2.4, §3.1, §5.4.
 */

export type MatchTier = "matched_high" | "matched_low" | "unresolved";

export type LegStatus = "available" | "unavailable";

export type BookingHint =
  | "free"
  | "ticket_likely"
  | "reservation_recommended"
  | "unknown";

export type TravelPace = "relaxed" | "balanced" | "full";

export type BudgetBasis = "total" | "per_person";

/**
 * Raw candidate activity produced by the Gemini AI drafting model.
 * Note: Coordinates and exact prices are strictly excluded from AI generation.
 */
export interface CandidateActivity {
  id: string;
  title: string;
  description: string;
  place_name: string;
  place_category: string;
  planned_time: string; // "HH:MM" 24h format
  duration_minutes: number;
  booking_hint: BookingHint;
  is_must_see?: boolean;
  notes?: string;
}

export interface CandidateDay {
  day_number: number;
  calendar_date: string; // "YYYY-MM-DD"
  title: string;
  theme?: string;
  activities: CandidateActivity[];
}

export interface CandidatePlan {
  summary: string;
  days: CandidateDay[];
}

/**
 * Verified activity after Geoapify grounding and routing.
 */
export interface GroundedActivity extends CandidateActivity {
  geoapify_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  formatted_address: string | null;
  match_tier: MatchTier;
  match_confidence: number;
  travel_mode_to_next: "walk" | "drive" | null;
  transit_distance_meters: number | null;
  transit_duration_seconds: number | null;
  leg_status: LegStatus;
}

export interface GroundedDay {
  day_number: number;
  calendar_date: string;
  title: string;
  theme?: string;
  activities: GroundedActivity[];
}

export interface GroundingStats {
  total_places: number;
  matched_high: number;
  matched_low: number;
  unresolved: number;
  total_legs: number;
  computed_legs: number;
  dropped_items: number;
}

export interface ProposalData {
  summary: string;
  days: GroundedDay[];
}

import type { TripGenerationInput } from "./schema";
export type { TripGenerationInput };

export type ProposalStatus =
  | "generating"
  | "pending_review"
  | "applied"
  | "rejected"
  | "superseded"
  | "failed";

export type GenerationStage =
  | "queued"
  | "drafting"
  | "grounding"
  | "routing"
  | "done";

export interface TripProposalRecord {
  id: string;
  trip_id: string;
  created_by: string;
  status: ProposalStatus;
  stage: GenerationStage;
  error_code: string | null;
  summary: string | null;
  model: string | null;
  prompt_version: string | null;
  generation_ms: number | null;
  input_snapshot: TripGenerationInput;
  proposal_data: ProposalData;
  grounding_stats: GroundingStats;
  created_at: string;
  updated_at: string;
  applied_at: string | null;
}
