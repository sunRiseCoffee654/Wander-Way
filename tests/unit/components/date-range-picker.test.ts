import { describe, it, expect } from "vitest";
import {
  parseISODate,
  formatISODate,
  formatDisplayDateRange,
  calculateQuickChipRange,
} from "@/components/home/date-range-picker";

describe("Date Range Picker Logic & Helpers", () => {
  describe("parseISODate and formatISODate", () => {
    it("roundtrips ISO date string without timezone shifts", () => {
      const input = "2026-11-14";
      const date = parseISODate(input);
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(10); // 0-indexed November
      expect(date.getDate()).toBe(14);
      expect(formatISODate(date)).toBe(input);
    });

    it("handles leap years and boundary dates", () => {
      const leap = "2028-02-29";
      const parsed = parseISODate(leap);
      expect(formatISODate(parsed)).toBe(leap);
    });
  });

  describe("formatDisplayDateRange", () => {
    it("returns prompt placeholder when both dates are empty", () => {
      expect(formatDisplayDateRange("", "")).toBe("Select travel dates");
    });

    it("returns prompt to select return when only start date is picked", () => {
      expect(formatDisplayDateRange("2026-11-14", "")).toBe("Nov 14 – Select return");
    });

    it("formats 7-day range within the same month matching PRD requirement", () => {
      expect(formatDisplayDateRange("2026-11-14", "2026-11-21")).toBe("Nov 14 – Nov 21 (7 Days)");
    });

    it("formats 1-day range with singular 'Day'", () => {
      expect(formatDisplayDateRange("2026-11-14", "2026-11-15")).toBe("Nov 14 – Nov 15 (1 Day)");
    });

    it("formats ranges across different months", () => {
      expect(formatDisplayDateRange("2026-10-28", "2026-11-04")).toBe("Oct 28 – Nov 4 (7 Days)");
    });

    it("formats ranges across different years with full year labels", () => {
      expect(formatDisplayDateRange("2026-12-28", "2027-01-04")).toBe(
        "Dec 28, 2026 – Jan 4, 2027 (7 Days)"
      );
    });
  });

  describe("calculateQuickChipRange", () => {
    it("computes 1 Week (7d) from given base start date", () => {
      const range = calculateQuickChipRange(7, "2026-11-14");
      expect(range.startDate).toBe("2026-11-14");
      expect(range.endDate).toBe("2026-11-21");
    });

    it("computes 10 Days from given base start date", () => {
      const range = calculateQuickChipRange(10, "2026-11-14");
      expect(range.startDate).toBe("2026-11-14");
      expect(range.endDate).toBe("2026-11-24");
    });

    it("computes 2 Weeks (14d) from given base start date", () => {
      const range = calculateQuickChipRange(14, "2026-11-14");
      expect(range.startDate).toBe("2026-11-14");
      expect(range.endDate).toBe("2026-11-28");
    });

    it("computes weekend starting on upcoming Friday", () => {
      // Sunday Nov 8, 2026 -> next Friday is Nov 13, end Monday Nov 16 (3 days)
      const refSunday = new Date(2026, 10, 8);
      const range = calculateQuickChipRange("weekend", undefined, refSunday);
      expect(range.startDate).toBe("2026-11-13");
      expect(range.endDate).toBe("2026-11-16");
    });
  });

  describe("Query Parameter Synchronization Contracts", () => {
    it("constructs standard query string with all parameters for /trips/new", () => {
      const destination = "Kyoto & Osaka, Japan";
      const startDate = "2026-11-14";
      const endDate = "2026-11-21";
      const travelers = 2;
      const budget = 75000;

      const params = new URLSearchParams();
      params.set("dest", destination);
      params.set("startDate", startDate);
      params.set("endDate", endDate);
      params.set("party", String(travelers));
      params.set("budget", String(budget));

      const queryString = params.toString();
      expect(queryString).toContain("dest=Kyoto+%26+Osaka%2C+Japan");
      expect(queryString).toContain("startDate=2026-11-14");
      expect(queryString).toContain("endDate=2026-11-21");
      expect(queryString).toContain("party=2");
      expect(queryString).toContain("budget=75000");

      // Verify deserialization contract expected by NewTripPage / TripWizard
      const parsed = new URLSearchParams(queryString);
      expect(parsed.get("dest")).toBe("Kyoto & Osaka, Japan");
      expect(parsed.get("startDate")).toBe("2026-11-14");
      expect(parsed.get("endDate")).toBe("2026-11-21");
      expect(parsed.get("party")).toBe("2");
      expect(parsed.get("budget")).toBe("75000");
    });
  });
});
