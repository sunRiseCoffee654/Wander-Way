/**
 * Itinerary Helpers (PRD v3.0 Compliance)
 * - Ground-truth evidence badge formatting
 * - Deterministic transit time & distance metrics
 * - Activity sorting
 */

import { normalizePriceEvidence, type EvidenceTier } from "@/lib/budget/calculations";

export interface EvidenceBadgeMeta {
  label: string;
  badge: string;
  icon: string;
}

export function getItineraryEvidenceBadge(evidence: string | null | undefined): EvidenceBadgeMeta {
  const tier: EvidenceTier = normalizePriceEvidence(evidence);
  switch (tier) {
    case "live_quote":
      return {
        label: "Live Quote",
        badge: "bg-tertiary-fixed text-on-tertiary-fixed",
        icon: "bolt",
      };
    case "published_price":
      return {
        label: "Published Tariff",
        badge: "bg-primary-fixed text-on-primary-fixed",
        icon: "menu_book",
      };
    case "verified_range":
      return {
        label: "Verified Range",
        badge: "bg-primary-fixed-dim text-on-primary-fixed",
        icon: "stacked_line_chart",
      };
    case "calculated_estimate":
      return {
        label: "Calculated Est.",
        badge: "bg-secondary-fixed text-on-secondary-fixed",
        icon: "calculate",
      };
    case "user_entered":
      return {
        label: "User Entered",
        badge: "bg-surface-container-highest text-on-surface",
        icon: "edit_note",
      };
    case "unknown":
    default:
      return {
        label: "Price Unknown",
        badge: "bg-surface-container-high text-on-surface-variant",
        icon: "help_outline",
      };
  }
}

/**
 * Formats duration in seconds to a human-readable minutes string.
 */
export function formatTransitDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0 mins";
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} mins`;
}

/**
 * Formats distance in meters to a human-readable km string with 1 decimal.
 */
export function formatTransitDistance(meters: number | null | undefined): string {
  if (!meters || meters <= 0) return "0.0 km";
  const km = Math.round(meters / 100) / 10;
  return `${km.toFixed(1)} km`;
}

/**
 * Sorts activities stably by sort_order or planned_time.
 */
export function sortItineraryActivities<
  T extends { sort_order?: number | null; planned_time?: string | null }
>(activities: T[]): T[] {
  return [...activities].sort((a, b) => {
    const orderA = a.sort_order ?? 0;
    const orderB = b.sort_order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    const timeA = a.planned_time || "";
    const timeB = b.planned_time || "";
    return timeA.localeCompare(timeB);
  });
}
