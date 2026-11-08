import { describe, it, expect } from "vitest";
import {
  minorUnitsToMajor,
  majorToMinorUnits,
  normalizePriceEvidence,
  calculateBudgetTotals,
  calculateSplitLedger,
  formatMinorUnitsCurrency,
} from "@/lib/budget/calculations";

describe("Deterministic Budget Calculations (PRD v3.0 Compliance)", () => {
  describe("Minor/Major Unit Conversions", () => {
    it("converts integer minor units to major units with 2 decimal precision", () => {
      expect(minorUnitsToMajor(100)).toBe(1.0);
      expect(minorUnitsToMajor(485000)).toBe(4850.0);
      expect(minorUnitsToMajor(1999)).toBe(19.99);
      expect(minorUnitsToMajor(0)).toBe(0);
    });

    it("converts major units to integer minor units safely avoiding IEEE 754 drift", () => {
      expect(majorToMinorUnits(1.0)).toBe(100);
      expect(majorToMinorUnits(19.99)).toBe(1999);
      expect(majorToMinorUnits(4850.0)).toBe(485000);
      expect(majorToMinorUnits(0.07)).toBe(7);
    });
  });

  describe("Price Evidence Normalization", () => {
    it("normalizes canonical evidence types", () => {
      expect(normalizePriceEvidence("live_quote")).toBe("live_quote");
      expect(normalizePriceEvidence("published_price")).toBe("published_price");
      expect(normalizePriceEvidence("verified_range")).toBe("verified_range");
      expect(normalizePriceEvidence("calculated_estimate")).toBe("calculated_estimate");
      expect(normalizePriceEvidence("user_entered")).toBe("user_entered");
      expect(normalizePriceEvidence("unknown")).toBe("unknown");
    });

    it("normalizes common aliases and trims/lowercases", () => {
      expect(normalizePriceEvidence(" LIVE ")).toBe("live_quote");
      expect(normalizePriceEvidence("tariff")).toBe("published_price");
      expect(normalizePriceEvidence("estimate")).toBe("calculated_estimate");
      expect(normalizePriceEvidence("user")).toBe("user_entered");
      expect(normalizePriceEvidence("range")).toBe("verified_range");
    });

    it("treats null, undefined, or unrecognized strings as unknown", () => {
      expect(normalizePriceEvidence(null)).toBe("unknown");
      expect(normalizePriceEvidence(undefined)).toBe("unknown");
      expect(normalizePriceEvidence("")).toBe("unknown");
      expect(normalizePriceEvidence("hallucinated_rate")).toBe("unknown");
    });
  });

  describe("calculateBudgetTotals", () => {
    it("computes exact allocated totals, runway buffer, and velocity", () => {
      const items = [
        { amount_minor_units: 184000, evidence_type: "live_quote" }, // $1,840.00
        { amount_minor_units: 162000, evidence_type: "live_quote" }, // $1,620.00
        { amount_minor_units: 72000, evidence_type: "calculated_estimate" }, // $720.00
        { amount_minor_units: 39000, evidence_type: "published_price" }, // $390.00
        { amount_minor_units: 28000, evidence_type: "published_price" }, // $280.00
      ];

      // Limit: $6,200.00 (620,000 minor units)
      const result = calculateBudgetTotals(items, 620000);

      expect(result.totalAllocatedMinorUnits).toBe(485000);
      expect(result.totalAllocatedMajor).toBe(4850.0);
      expect(result.tripLimitMinorUnits).toBe(620000);
      expect(result.tripLimitMajor).toBe(6200.0);
      expect(result.remainingRunwayMinorUnits).toBe(135000);
      expect(result.remainingRunwayMajor).toBe(1350.0);
      // Velocity: 485000 / 620000 = 78.2258% -> 78.2%
      expect(result.velocityPercent).toBe(78.2);
      expect(result.hasUnknownCosts).toBe(false);

      // Evidence breakdown check
      expect(result.evidenceBreakdown.live_quote.amountMajor).toBe(3460.0);
      expect(result.evidenceBreakdown.published_price.amountMajor).toBe(670.0);
      expect(result.evidenceBreakdown.calculated_estimate.amountMajor).toBe(720.0);
      expect(result.evidenceBreakdown.user_entered.amountMajor).toBe(0.0);
      expect(result.evidenceBreakdown.unknown.amountMajor).toBe(0.0);
    });

    it("preserves unknown costs without converting them to zero or hallucinating", () => {
      const items = [
        { amount_minor_units: 5000, evidence_type: "published_price" },
        { amount_minor_units: null, evidence_type: "unknown" },
        { amount_minor_units: 2500, evidence_type: "unknown" },
      ];

      const result = calculateBudgetTotals(items, 10000);
      expect(result.hasUnknownCosts).toBe(true);
      expect(result.totalAllocatedMinorUnits).toBe(7500);
      expect(result.evidenceBreakdown.unknown.amountMinorUnits).toBe(2500);
    });

    it("handles empty items array gracefully", () => {
      const result = calculateBudgetTotals([], 500000);
      expect(result.totalAllocatedMinorUnits).toBe(0);
      expect(result.totalAllocatedMajor).toBe(0);
      expect(result.remainingRunwayMinorUnits).toBe(500000);
      expect(result.velocityPercent).toBe(0);
      expect(result.hasUnknownCosts).toBe(false);
    });
  });

  describe("Split Ledger Math", () => {
    it("splits evenly when cleanly divisible", () => {
      const split = calculateSplitLedger(10000, 2); // $100.00 / 2 = $50.00 each
      expect(split.perPersonMinorUnits).toBe(5000);
      expect(split.perPersonMajor).toBe(50.0);
      expect(split.remainderMinorUnits).toBe(0);
      expect(split.allocations).toEqual([5000, 5000]);
      expect(split.allocations.reduce((a, b) => a + b, 0)).toBe(10000);
    });

    it("distributes odd remainder penny-by-penny preserving the exact sum", () => {
      const split = calculateSplitLedger(100, 3); // 100 cents / 3 = 33 cents each, remainder 1 cent
      expect(split.perPersonMinorUnits).toBe(33);
      expect(split.remainderMinorUnits).toBe(1);
      expect(split.allocations).toEqual([34, 33, 33]);
      expect(split.allocations.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it("handles edge cases with 0 or 1 participant", () => {
      const splitZero = calculateSplitLedger(5000, 0);
      expect(splitZero.perPersonMinorUnits).toBe(5000);
      expect(splitZero.allocations).toEqual([5000]);

      const splitOne = calculateSplitLedger(5000, 1);
      expect(splitOne.perPersonMinorUnits).toBe(5000);
      expect(splitOne.allocations).toEqual([5000]);
    });
  });

  describe("formatMinorUnitsCurrency", () => {
    it("formats minor units with default INR currency and en-IN locale", () => {
      const formatted = formatMinorUnitsCurrency(7500000);
      expect(formatted).toContain("₹");
      expect(formatted).toContain("75,000.00");
    });

    it("formats minor units with standard USD currency symbol", () => {
      const formatted = formatMinorUnitsCurrency(485000, "USD", "en-US");
      expect(formatted).toBe("$4,850.00");
    });

    it("applies multiplier for per-person projections", () => {
      const formatted = formatMinorUnitsCurrency(485000, "USD", "en-US", 0.5);
      expect(formatted).toBe("$2,425.00");
    });

    it("correctly formats zero-decimal currency (JPY) without fractional digits", () => {
      const formatted = formatMinorUnitsCurrency(1500, "JPY");
      expect(formatted).toMatch(/1,500/);
      expect(formatted).not.toMatch(/\.00/);
      expect(formatted).toContain("¥");
    });
  });
});
