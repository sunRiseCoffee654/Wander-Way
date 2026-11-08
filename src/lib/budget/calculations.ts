/**
 * Deterministic Minor-Unit Budget Math & Evidence Normalization
 * PRD v3.0 Compliance:
 * - Integer minor-unit arithmetic prevents floating point drift
 * - Truthful evidence tiers: live_quote | published_price | verified_range | calculated_estimate | user_entered | unknown
 * - Unknown costs must never be silently converted to 0
 */

import { formatMinorUnits } from "@/lib/currency/service";

export type EvidenceTier =
  | "live_quote"
  | "published_price"
  | "verified_range"
  | "calculated_estimate"
  | "user_entered"
  | "unknown";

export interface BudgetLineItemLike {
  amount_minor_units?: number | null;
  evidence_type?: string | null;
}

export interface EvidenceBreakdownItem {
  amountMinorUnits: number;
  amountMajor: number;
  percentage: number;
}

export interface BudgetTotals {
  totalAllocatedMinorUnits: number;
  totalAllocatedMajor: number;
  tripLimitMinorUnits: number;
  tripLimitMajor: number;
  remainingRunwayMinorUnits: number;
  remainingRunwayMajor: number;
  velocityPercent: number;
  hasUnknownCosts: boolean;
  evidenceBreakdown: Record<EvidenceTier, EvidenceBreakdownItem>;
}

export interface SplitResult {
  perPersonMinorUnits: number;
  perPersonMajor: number;
  remainderMinorUnits: number;
  allocations: number[]; // Exact integer minor units for each participant, summing strictly to totalMinorUnits
}

/**
 * Converts minor units (e.g. cents) to major units (dollars).
 */
export function minorUnitsToMajor(minorUnits: number): number {
  return Math.round(minorUnits) / 100;
}

/**
 * Converts major units (dollars) to minor units (cents) safely rounding to nearest integer.
 */
export function majorToMinorUnits(major: number): number {
  return Math.round(major * 100);
}

/**
 * Normalizes any string to the PRD v3.0 EvidenceTier taxonomy.
 */
export function normalizePriceEvidence(raw: string | null | undefined): EvidenceTier {
  if (!raw) return "unknown";
  const normalized = raw.trim().toLowerCase();
  switch (normalized) {
    case "live_quote":
    case "live":
      return "live_quote";
    case "published_price":
    case "published":
    case "tariff":
      return "published_price";
    case "verified_range":
    case "range":
      return "verified_range";
    case "calculated_estimate":
    case "calculated":
    case "estimate":
      return "calculated_estimate";
    case "user_entered":
    case "user":
      return "user_entered";
    case "unknown":
    default:
      return "unknown";
  }
}

/**
 * Deterministically computes budget totals, runway, velocity, and evidence breakdown.
 */
export function calculateBudgetTotals(
  items: BudgetLineItemLike[],
  budgetLimitMinorUnits?: number | null,
  fallbackLimitMinorUnits = 620000
): BudgetTotals {
  let totalAllocatedMinorUnits = 0;
  let hasUnknownCosts = false;

  const breakdownMinorUnits: Record<EvidenceTier, number> = {
    live_quote: 0,
    published_price: 0,
    verified_range: 0,
    calculated_estimate: 0,
    user_entered: 0,
    unknown: 0,
  };

  for (const item of items) {
    const rawAmt = item.amount_minor_units;
    const tier = normalizePriceEvidence(item.evidence_type);

    if (rawAmt === null || rawAmt === undefined) {
      hasUnknownCosts = true;
      breakdownMinorUnits.unknown += 0;
      continue;
    }

    const amt = Math.max(0, Math.round(rawAmt));
    totalAllocatedMinorUnits += amt;
    breakdownMinorUnits[tier] += amt;

    if (tier === "unknown") {
      hasUnknownCosts = true;
    }
  }

  const tripLimitMinorUnits =
    budgetLimitMinorUnits && budgetLimitMinorUnits > 0
      ? Math.round(budgetLimitMinorUnits)
      : fallbackLimitMinorUnits;

  const remainingRunwayMinorUnits = Math.max(
    0,
    tripLimitMinorUnits - totalAllocatedMinorUnits
  );

  const velocityPercent =
    tripLimitMinorUnits > 0
      ? Math.min(
          100,
          Math.round(
            (totalAllocatedMinorUnits / tripLimitMinorUnits) * 1000
          ) / 10
        )
      : 0;

  const totalSumMinor = totalAllocatedMinorUnits > 0 ? totalAllocatedMinorUnits : 1;

  const evidenceBreakdown: Record<EvidenceTier, EvidenceBreakdownItem> = {
    live_quote: {
      amountMinorUnits: breakdownMinorUnits.live_quote,
      amountMajor: minorUnitsToMajor(breakdownMinorUnits.live_quote),
      percentage: Math.round(
        (breakdownMinorUnits.live_quote / totalSumMinor) * 100
      ),
    },
    published_price: {
      amountMinorUnits: breakdownMinorUnits.published_price,
      amountMajor: minorUnitsToMajor(breakdownMinorUnits.published_price),
      percentage: Math.round(
        (breakdownMinorUnits.published_price / totalSumMinor) * 100
      ),
    },
    verified_range: {
      amountMinorUnits: breakdownMinorUnits.verified_range,
      amountMajor: minorUnitsToMajor(breakdownMinorUnits.verified_range),
      percentage: Math.round(
        (breakdownMinorUnits.verified_range / totalSumMinor) * 100
      ),
    },
    calculated_estimate: {
      amountMinorUnits: breakdownMinorUnits.calculated_estimate,
      amountMajor: minorUnitsToMajor(breakdownMinorUnits.calculated_estimate),
      percentage: Math.round(
        (breakdownMinorUnits.calculated_estimate / totalSumMinor) * 100
      ),
    },
    user_entered: {
      amountMinorUnits: breakdownMinorUnits.user_entered,
      amountMajor: minorUnitsToMajor(breakdownMinorUnits.user_entered),
      percentage: Math.round(
        (breakdownMinorUnits.user_entered / totalSumMinor) * 100
      ),
    },
    unknown: {
      amountMinorUnits: breakdownMinorUnits.unknown,
      amountMajor: minorUnitsToMajor(breakdownMinorUnits.unknown),
      percentage: Math.round(
        (breakdownMinorUnits.unknown / totalSumMinor) * 100
      ),
    },
  };

  return {
    totalAllocatedMinorUnits,
    totalAllocatedMajor: minorUnitsToMajor(totalAllocatedMinorUnits),
    tripLimitMinorUnits,
    tripLimitMajor: minorUnitsToMajor(tripLimitMinorUnits),
    remainingRunwayMinorUnits,
    remainingRunwayMajor: minorUnitsToMajor(remainingRunwayMinorUnits),
    velocityPercent,
    hasUnknownCosts,
    evidenceBreakdown,
  };
}

/**
 * Deterministic minor-unit group split calculation.
 * Ensures the sum of individual allocations EXACTLY equals totalMinorUnits,
 * distributing any remainder penny-by-penny across the first participants.
 */
export function calculateSplitLedger(
  totalMinorUnits: number,
  participantsCount: number
): SplitResult {
  if (participantsCount <= 0) {
    return {
      perPersonMinorUnits: totalMinorUnits,
      perPersonMajor: minorUnitsToMajor(totalMinorUnits),
      remainderMinorUnits: 0,
      allocations: [totalMinorUnits],
    };
  }

  const baseMinor = Math.floor(totalMinorUnits / participantsCount);
  const remainderMinor = totalMinorUnits % participantsCount;

  const allocations: number[] = [];
  for (let i = 0; i < participantsCount; i++) {
    // Distribute remaining 1-cent/minor-unit increments to the first `remainderMinor` participants
    allocations.push(baseMinor + (i < remainderMinor ? 1 : 0));
  }

  return {
    perPersonMinorUnits: baseMinor,
    perPersonMajor: minorUnitsToMajor(baseMinor),
    remainderMinorUnits: remainderMinor,
    allocations,
  };
}

/**
 * Formats minor units into an internationalized currency string.
 * Delegates to formatMinorUnits to properly respect currency decimal precision (e.g. JPY 0 decimals).
 */
export function formatMinorUnitsCurrency(
  minorUnits: number,
  currency = "INR",
  locale = "en-IN",
  multiplier = 1.0
): string {
  return formatMinorUnits(Math.round(minorUnits * multiplier), currency, locale);
}
