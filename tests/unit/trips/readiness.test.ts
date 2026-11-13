import { describe, expect, it } from "vitest";
import {
  buildTripReadinessFromWorkspace,
  calculateTripReadiness,
} from "@/lib/trips/readiness";
import { getMockRajasthanDays } from "@/lib/itinerary/showcase-days";
import {
  getMockRajasthanBudgetLineItems,
  getMockRajasthanTripBudget,
} from "@/lib/budget/showcase-budget";

describe("Global Trip Readiness Calculation", () => {
  it("returns 0% readiness across all pillars for a completely empty trip", () => {
    const summary = calculateTripReadiness({
      itinerary: { totalDays: 0, scheduledDays: 0, totalActivities: 0 },
      budget: {
        hasBudgetLimit: false,
        totalLineItems: 0,
        settledOrPaidCount: 0,
        verifiedPriceCount: 0,
        spentMinorUnits: 0,
        limitMinorUnits: 0,
      },
      documents: { totalDocuments: 0, coveredCategories: [] },
    });

    expect(summary.overallPercent).toBe(0);
    expect(summary.tier).toBe("getting_started");
    expect(summary.isOverBudget).toBe(false);
    expect(summary.pillars.itinerary.percent).toBe(0);
    expect(summary.pillars.budget.percent).toBe(0);
    expect(summary.pillars.documents.percent).toBe(0);
  });

  it("reaches 100% Launch Ready when itinerary, budget, and all 4 document categories are complete", () => {
    const summary = calculateTripReadiness({
      itinerary: { totalDays: 3, scheduledDays: 3, totalActivities: 9 },
      budget: {
        hasBudgetLimit: true,
        totalLineItems: 4,
        settledOrPaidCount: 4,
        verifiedPriceCount: 4,
        spentMinorUnits: 12000000,
        limitMinorUnits: 20000000,
      },
      documents: {
        totalDocuments: 4,
        coveredCategories: ["flights", "hotels", "passports", "insurance"],
      },
    });

    expect(summary.overallPercent).toBe(100);
    expect(summary.tier).toBe("ready");
    expect(summary.tierLabel).toBe("Launch Ready");
    expect(summary.pillars.itinerary.status).toBe("complete");
    expect(summary.pillars.budget.status).toBe("complete");
    expect(summary.pillars.documents.status).toBe("complete");
  });

  it("rewards grounded pricing evidence and flags over-budget spending accurately", () => {
    const grounded = calculateTripReadiness({
      itinerary: { totalDays: 2, scheduledDays: 2, totalActivities: 4 },
      budget: {
        hasBudgetLimit: true,
        totalLineItems: 4,
        settledOrPaidCount: 2,
        verifiedPriceCount: 4,
        spentMinorUnits: 25000000,
        limitMinorUnits: 20000000,
      },
      documents: { totalDocuments: 0, coveredCategories: [] },
    });

    const unverified = calculateTripReadiness({
      itinerary: { totalDays: 2, scheduledDays: 2, totalActivities: 4 },
      budget: {
        hasBudgetLimit: true,
        totalLineItems: 4,
        settledOrPaidCount: 2,
        verifiedPriceCount: 0,
        spentMinorUnits: 10000000,
        limitMinorUnits: 20000000,
      },
      documents: { totalDocuments: 0, coveredCategories: [] },
    });

    expect(grounded.isOverBudget).toBe(true);
    expect(grounded.pillars.budget.detail).toContain("Over limit");
    expect(grounded.pillars.budget.percent).toBeGreaterThan(
      unverified.pillars.budget.percent,
    );
  });

  it("computes deterministic showcase readiness from Rajasthan mock workspace fixtures", () => {
    const days = getMockRajasthanDays("mock-jaipur-current");
    const budgetCfg = getMockRajasthanTripBudget("mock-jaipur-current");
    const lineItems = getMockRajasthanBudgetLineItems("mock-jaipur-current");

    const summary = buildTripReadinessFromWorkspace({
      days,
      budgetLimitMinorUnits: budgetCfg.budget_minor_units,
      lineItems,
      documents: [],
    });

    expect(summary.pillars.itinerary.percent).toBe(100);
    expect(summary.pillars.itinerary.detail).toBe("3/3 days · 9 stops");
    expect(summary.pillars.budget.percent).toBe(90);
    expect(summary.pillars.documents.percent).toBe(0);
    expect(summary.overallPercent).toBe(63);
    expect(summary.tier).toBe("in_progress");
    expect(summary.isOverBudget).toBe(false);
  });
});
