import { describe, it, expect } from "vitest";
import { evaluateBudgetThreshold } from "@/lib/budget/calculations";

describe("evaluateBudgetThreshold", () => {
  const TRIP_LIMIT_MINOR = 10000000; // 100,000 INR / USD in minor units

  it("returns nominal status when spending is below 80%", () => {
    // 50% allocation (50,000)
    const result = evaluateBudgetThreshold(5000000, TRIP_LIMIT_MINOR, "INR");
    expect(result.level).toBe("nominal");
    expect(result.isWarning80).toBe(false);
    expect(result.isCritical95).toBe(false);
    expect(result.velocityPercent).toBe(50);
    expect(result.remainingRunwayMajor).toBe(50000);
    expect(result.badge).toBe("HEALTHY BUFFER");
  });

  it("triggers warning_80 when spending hits exactly 80%", () => {
    // 80% allocation (80,000)
    const result = evaluateBudgetThreshold(8000000, TRIP_LIMIT_MINOR, "INR");
    expect(result.level).toBe("warning_80");
    expect(result.isWarning80).toBe(true);
    expect(result.isCritical95).toBe(false);
    expect(result.velocityPercent).toBe(80);
    expect(result.remainingRunwayMajor).toBe(20000);
    expect(result.badge).toBe("80% THRESHOLD WARNING");
    expect(result.bannerClasses.icon).toBe("warning");
  });

  it("maintains warning_80 between 80% and 94.9%", () => {
    // 88.5% allocation (88,500)
    const result = evaluateBudgetThreshold(8850000, TRIP_LIMIT_MINOR, "INR");
    expect(result.level).toBe("warning_80");
    expect(result.isWarning80).toBe(true);
    expect(result.isCritical95).toBe(false);
    expect(result.velocityPercent).toBe(88.5);
    expect(result.remainingRunwayMajor).toBe(11500);
  });

  it("triggers critical_95 when spending reaches 95%", () => {
    // 95% allocation (95,000)
    const result = evaluateBudgetThreshold(9500000, TRIP_LIMIT_MINOR, "INR");
    expect(result.level).toBe("critical_95");
    expect(result.isWarning80).toBe(true);
    expect(result.isCritical95).toBe(true);
    expect(result.velocityPercent).toBe(95);
    expect(result.remainingRunwayMajor).toBe(5000);
    expect(result.badge).toBe("CRITICAL 95% THRESHOLD");
    expect(result.bannerClasses.icon).toBe("error");
  });

  it("handles over-budget scenarios (>100%) gracefully as critical_95", () => {
    // 105% allocation (105,000)
    const result = evaluateBudgetThreshold(10500000, TRIP_LIMIT_MINOR, "INR");
    expect(result.level).toBe("critical_95");
    expect(result.isCritical95).toBe(true);
    expect(result.velocityPercent).toBe(105);
    expect(result.remainingRunwayMajor).toBe(0);
    expect(result.remainingRunwayMinorUnits).toBe(0);
  });
});
