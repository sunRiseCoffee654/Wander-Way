import { describe, it, expect } from "vitest";
import {
  parseISODate,
  formatDisplayDateRange,
  calculateQuickChipRange,
} from "@/components/home/date-range-picker";
import {
  formatMinorUnits,
  convertMinorUnitsDeterministic,
  CURRENCY_DECIMALS,
} from "@/lib/currency/service";
import {
  formatMinorUnitsCurrency,
} from "@/lib/budget/calculations";
import { parsePartyAndBudget } from "@/components/home/stitch-home-launcher";

describe("Challenger M4-1: Empirical Stress Tests for WanderWay v3.2", () => {
  // =========================================================================
  // 1. DATE RANGE PICKER & DATE UTILITIES STRESS TESTS
  // =========================================================================
  describe("1. Date Utilities & Range Picker Stress Suite", () => {
    describe("Month Boundaries & Rollovers", () => {
      it("Jan 31 to Feb 1 boundary computes exactly 1 day and correct formatting", () => {
        const start = "2026-01-31";
        const end = "2026-02-01";
        const formatted = formatDisplayDateRange(start, end);
        expect(formatted).toBe("Jan 31 – Feb 1 (1 Day)");

        const s = parseISODate(start);
        const e = parseISODate(end);
        const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
        expect(diffDays).toBe(1);
      });

      it("Leap year 2024 February 28 to March 1 computes 2 days", () => {
        const start = "2024-02-28";
        const end = "2024-03-01";
        const formatted = formatDisplayDateRange(start, end);
        expect(formatted).toBe("Feb 28 – Mar 1 (2 Days)");
      });

      it("Leap year 2024 February 29 to March 1 computes 1 day", () => {
        const start = "2024-02-29";
        const end = "2024-03-01";
        const formatted = formatDisplayDateRange(start, end);
        expect(formatted).toBe("Feb 29 – Mar 1 (1 Day)");
      });

      it("Non-leap year 2025 February 28 to March 1 computes 1 day", () => {
        const start = "2025-02-28";
        const end = "2025-03-01";
        const formatted = formatDisplayDateRange(start, end);
        expect(formatted).toBe("Feb 28 – Mar 1 (1 Day)");
      });

      it("Century leap year (2000) vs non-leap century (2100) date arithmetic", () => {
        const s2000 = parseISODate("2000-02-28");
        const e2000 = parseISODate("2000-03-01");
        expect(Math.round((e2000.getTime() - s2000.getTime()) / 86400000)).toBe(2);

        const s2100 = parseISODate("2100-02-28");
        const e2100 = parseISODate("2100-03-01");
        expect(Math.round((e2100.getTime() - s2100.getTime()) / 86400000)).toBe(1);
      });

      it("December to January year rollover formats both years properly", () => {
        const start = "2026-12-31";
        const end = "2027-01-01";
        const formatted = formatDisplayDateRange(start, end);
        expect(formatted).toBe("Dec 31, 2026 – Jan 1, 2027 (1 Day)");
      });

      it("December 25 to January 8 (14 days) crosses year rollover cleanly", () => {
        const start = "2026-12-25";
        const end = "2027-01-08";
        const formatted = formatDisplayDateRange(start, end);
        expect(formatted).toBe("Dec 25, 2026 – Jan 8, 2027 (14 Days)");
      });
    });

    describe("Selection Edge Cases: State Machine Simulation", () => {
      // Replicate the exact selection state machine from DateRangePicker
      function simulateDayClick(
        currentStart: string,
        currentEnd: string,
        clickedDate: string
      ): { startDate: string; endDate: string; shouldClose: boolean } {
        if (!currentStart || (currentStart && currentEnd)) {
          // Begin new selection
          return { startDate: clickedDate, endDate: "", shouldClose: false };
        } else if (currentStart && !currentEnd) {
          if (clickedDate < currentStart) {
            // Clicked earlier date: pivot start date
            return { startDate: clickedDate, endDate: "", shouldClose: false };
          } else {
            // Clicked same or later date: complete range selection
            return { startDate: currentStart, endDate: clickedDate, shouldClose: true };
          }
        }
        return { startDate: currentStart, endDate: currentEnd, shouldClose: false };
      }

      it("State Machine: Clicking end before start pivots start date backwards", () => {
        // Step 1: user picked Nov 20
        const step1 = simulateDayClick("", "", "2026-11-20");
        expect(step1.startDate).toBe("2026-11-20");
        expect(step1.endDate).toBe("");
        expect(step1.shouldClose).toBe(false);

        // Step 2: user clicks Nov 15 (earlier than Nov 20)
        const step2 = simulateDayClick(step1.startDate, step1.endDate, "2026-11-15");
        expect(step2.startDate).toBe("2026-11-15");
        expect(step2.endDate).toBe("");
        expect(step2.shouldClose).toBe(false);

        // Step 3: user clicks Nov 22 (after Nov 15)
        const step3 = simulateDayClick(step2.startDate, step2.endDate, "2026-11-22");
        expect(step3.startDate).toBe("2026-11-15");
        expect(step3.endDate).toBe("2026-11-22");
        expect(step3.shouldClose).toBe(true);
      });

      it("State Machine: Clicking the same day completes a 1-day range", () => {
        const step1 = simulateDayClick("", "", "2026-11-14");
        const step2 = simulateDayClick(step1.startDate, step1.endDate, "2026-11-14");
        expect(step2.startDate).toBe("2026-11-14");
        expect(step2.endDate).toBe("2026-11-14");
        expect(step2.shouldClose).toBe(true);

        const formatted = formatDisplayDateRange(step2.startDate, step2.endDate);
        expect(formatted).toBe("Nov 14 – Nov 14");
        expect(formatted).not.toContain("0 Days");
      });

      it("State Machine: Clicking after range is already selected resets and starts new range", () => {
        const step1 = simulateDayClick("2026-11-14", "2026-11-21", "2026-12-01");
        expect(step1.startDate).toBe("2026-12-01");
        expect(step1.endDate).toBe("");
        expect(step1.shouldClose).toBe(false);
      });

      it("Calendar month calculation creates 29 days for Feb in leap year 2028", () => {
        const year = 2028;
        const month = 1; // Feb (0-indexed)
        const daysInFeb2028 = new Date(year, month + 1, 0).getDate();
        expect(daysInFeb2028).toBe(29);
      });

      it("Calendar month calculation creates 28 days for Feb in non-leap year 2026", () => {
        const year = 2026;
        const month = 1; // Feb
        const daysInFeb2026 = new Date(year, month + 1, 0).getDate();
        expect(daysInFeb2026).toBe(28);
      });

      it("Rapid month navigation does not overflow on 31st (anchor day 1)", () => {
        const viewMonth = new Date(2026, 0, 1); // Jan 1, 2026
        const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
        expect(nextMonth.getMonth()).toBe(1); // February
        expect(nextMonth.getFullYear()).toBe(2026);

        const nextNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1);
        expect(nextNextMonth.getMonth()).toBe(2); // March
      });
    });

    describe("Quick Chips Calculations Across Complex Boundaries", () => {
      it("Weekend chip when base is Monday Nov 9, 2026 targets upcoming Friday Nov 13 to Monday Nov 16", () => {
        const refMonday = new Date(2026, 10, 9); // Monday
        const chip = calculateQuickChipRange("weekend", undefined, refMonday);
        expect(chip.startDate).toBe("2026-11-13");
        expect(chip.endDate).toBe("2026-11-16");
      });

      it("Weekend chip when base is Friday Nov 13, 2026 targets today's Friday Nov 13 to Monday Nov 16", () => {
        const refFriday = new Date(2026, 10, 13); // Friday
        const chip = calculateQuickChipRange("weekend", undefined, refFriday);
        expect(chip.startDate).toBe("2026-11-13");
        expect(chip.endDate).toBe("2026-11-16");
      });

      it("Weekend chip when base is Saturday Nov 14, 2026 targets NEXT Friday Nov 20 to Monday Nov 23", () => {
        const refSaturday = new Date(2026, 10, 14); // Saturday
        const chip = calculateQuickChipRange("weekend", undefined, refSaturday);
        expect(chip.startDate).toBe("2026-11-20");
        expect(chip.endDate).toBe("2026-11-23");
      });

      it("Weekend chip when base is Sunday Nov 15, 2026 targets NEXT Friday Nov 20 to Monday Nov 23", () => {
        const refSunday = new Date(2026, 10, 15); // Sunday
        const chip = calculateQuickChipRange("weekend", undefined, refSunday);
        expect(chip.startDate).toBe("2026-11-20");
        expect(chip.endDate).toBe("2026-11-23");
      });

      it("Weekend chip crossing month boundary (October 30, 2026 to November 2, 2026)", () => {
        const refFri = new Date(2026, 9, 30); // Oct 30, 2026 is Friday
        const chip = calculateQuickChipRange("weekend", undefined, refFri);
        expect(chip.startDate).toBe("2026-10-30");
        expect(chip.endDate).toBe("2026-11-02");
        expect(formatDisplayDateRange(chip.startDate, chip.endDate)).toBe("Oct 30 – Nov 2 (3 Days)");
      });

      it("1 Week (7d) chip crossing leap year boundary (Feb 25, 2024 -> Mar 3, 2024)", () => {
        const chip = calculateQuickChipRange(7, "2024-02-25");
        expect(chip.startDate).toBe("2024-02-25");
        expect(chip.endDate).toBe("2024-03-03");
      });

      it("1 Week (7d) chip crossing non-leap year boundary (Feb 25, 2025 -> Mar 4, 2025)", () => {
        const chip = calculateQuickChipRange(7, "2025-02-25");
        expect(chip.startDate).toBe("2025-02-25");
        expect(chip.endDate).toBe("2025-03-04");
      });

      it("10 Days chip crossing month boundary (Jan 25 -> Feb 4)", () => {
        const chip = calculateQuickChipRange(10, "2026-01-25");
        expect(chip.startDate).toBe("2026-01-25");
        expect(chip.endDate).toBe("2026-02-04");
      });

      it("2 Weeks (14d) chip crossing year boundary (Dec 25, 2026 -> Jan 8, 2027)", () => {
        const chip = calculateQuickChipRange(14, "2026-12-25");
        expect(chip.startDate).toBe("2026-12-25");
        expect(chip.endDate).toBe("2027-01-08");
      });
    });
  });

  // =========================================================================
  // 2. CURRENCY & BUDGET MATH EMPIRICAL STRESS TESTS
  // =========================================================================
  describe("2. Currency & Budget Math Stress Suite", () => {
    describe("formatMinorUnits INR Edge Cases & Indian Numbering", () => {
      it("formats ₹0 minor units (0 paise) accurately", () => {
        const formatted = formatMinorUnits(0, "INR");
        expect(formatted).toContain("₹");
        expect(formatted).toMatch(/0\.00/);
      });

      it("formats ₹0.01 minor units (1 paisa) accurately", () => {
        const formatted = formatMinorUnits(1, "INR");
        expect(formatted).toContain("₹");
        expect(formatted).toMatch(/0\.01/);
      });

      it("formats ₹9,999,999.99 (999,999,999 paise) accurately with Indian numbering", () => {
        const formatted = formatMinorUnits(999999999, "INR");
        expect(formatted).toContain("₹");
        expect(formatted).toMatch(/99,99,999\.99/);
      });

      it("verifies Indian numbering system comma grouping across orders of magnitude", () => {
        expect(formatMinorUnits(1000, "INR")).toMatch(/10\.00/);
        expect(formatMinorUnits(10000, "INR")).toMatch(/100\.00/);
        expect(formatMinorUnits(100000, "INR")).toMatch(/1,000\.00/);
        expect(formatMinorUnits(1000000, "INR")).toMatch(/10,000\.00/);
        expect(formatMinorUnits(10000000, "INR")).toMatch(/1,00000\.00|1,00,000\.00/);
        expect(formatMinorUnits(100000000, "INR")).toMatch(/10,00,000\.00/);
        expect(formatMinorUnits(1000000000, "INR")).toMatch(/1,00,00,000\.00/);
        expect(formatMinorUnits(10000000000, "INR")).toMatch(/10,00,00,000\.00/);
      });

      it("formats negative INR amounts cleanly (-₹50.00)", () => {
        const formatted = formatMinorUnits(-5000, "INR");
        expect(formatted).toContain("50.00");
      });
    });

    describe("Zero-Decimal Currencies (JPY) vs Two-Decimal (INR, USD, EUR)", () => {
      it("CURRENCY_DECIMALS specifies 0 for JPY and 2 for INR, USD, EUR", () => {
        expect(CURRENCY_DECIMALS.JPY).toBe(0);
        expect(CURRENCY_DECIMALS.INR).toBe(2);
        expect(CURRENCY_DECIMALS.USD).toBe(2);
        expect(CURRENCY_DECIMALS.EUR).toBe(2);
      });

      it("formatMinorUnits for JPY displays integer major without decimal fraction digits", () => {
        const formatted = formatMinorUnits(1500, "JPY");
        expect(formatted).toContain("¥");
        expect(formatted).toContain("1,500");
        expect(formatted).not.toContain(".00");
      });

      it("formatMinorUnits for USD displays two decimals", () => {
        const formatted = formatMinorUnits(1500, "USD");
        expect(formatted).toContain("$");
        expect(formatted).toContain("15.00");
      });

      it("formatMinorUnits for EUR displays two decimals", () => {
        const formatted = formatMinorUnits(1500, "EUR");
        expect(formatted).toContain("€");
        expect(formatted).toContain("15.00");
      });

      it("deterministic conversion handles zero-decimal target (INR -> JPY)", () => {
        const result = convertMinorUnitsDeterministic(1000000, "INR", "JPY");
        expect(result.original_currency).toBe("INR");
        expect(result.target_currency).toBe("JPY");
        expect(result.converted_amount_minor).toBeGreaterThan(0);
        expect(Number.isInteger(result.converted_amount_minor)).toBe(true);
        expect(result.formatted_converted).not.toContain(".00");
      });

      it("deterministic conversion handles zero-decimal origin (JPY -> INR)", () => {
        const result = convertMinorUnitsDeterministic(15000, "JPY", "INR");
        expect(result.original_currency).toBe("JPY");
        expect(result.target_currency).toBe("INR");
        expect(result.converted_amount_minor).toBeGreaterThan(0);
        expect(Number.isInteger(result.converted_amount_minor)).toBe(true);
        expect(result.formatted_converted).toContain("₹");
        expect(result.formatted_converted).toMatch(/\.\d{2}/);
      });

      it("preserves currency conversion reversibility within rounding margin", () => {
        const toUsd = convertMinorUnitsDeterministic(1000000, "INR", "USD");
        const backToInr = convertMinorUnitsDeterministic(toUsd.converted_amount_minor, "USD", "INR");
        const differenceMinor = Math.abs(backToInr.converted_amount_minor - 1000000);
        expect(differenceMinor).toBeLessThan(100);
      });
    });

    describe("formatMinorUnitsCurrency Default Behaviors", () => {
      it("defaults to INR and en-IN with ₹ symbol and 2 decimals", () => {
        const formatted = formatMinorUnitsCurrency(7500000);
        expect(formatted).toContain("₹");
        expect(formatted).toMatch(/75,000\.00/);
      });

      it("supports multiplier for split calculations", () => {
        const formatted = formatMinorUnitsCurrency(7500000, "INR", "en-IN", 0.5);
        expect(formatted).toContain("₹");
        expect(formatted).toMatch(/37,500\.00/);
      });

      it("correctly formats zero-decimal currency (JPY) without fractional digits", () => {
        const formatted = formatMinorUnitsCurrency(1500, "JPY");
        expect(formatted).toMatch(/1,500/);
        expect(formatted).not.toMatch(/\.00/);
        expect(formatted).toContain("¥");
      });
    });
  });

  // =========================================================================
  // 3. QUERY PARAMETER ROBUSTNESS & SANITIZATION STRESS TESTS
  // =========================================================================
  describe("3. Query Parameter Parsing & Sanitization Stress Suite", () => {
    const DEFAULT_FORM_DATA = {
      destination: "",
      title: "",
      startDate: "",
      endDate: "",
      adultCount: 2,
      childCount: 0,
      infantCount: 0,
      hasBudget: true,
      budgetAmount: "75000",
      budgetCurrency: "INR",
      budgetBasis: "total",
    };

    function simulateWizardInit(searchParams: {
      dest?: string;
      startDate?: string;
      endDate?: string;
      party?: string;
      budget?: string;
    }) {
      const base = { ...DEFAULT_FORM_DATA };

      if (searchParams.dest) {
        base.destination = searchParams.dest;
        base.title = `${searchParams.dest} Journey`;
      }
      if (searchParams.startDate) {
        base.startDate = searchParams.startDate;
      }
      if (searchParams.endDate) {
        base.endDate = searchParams.endDate;
      }
      if (searchParams.party) {
        const p = parseInt(searchParams.party, 10);
        if (!isNaN(p) && p > 0) base.adultCount = p;
      }
      if (searchParams.budget) {
        base.hasBudget = true;
        base.budgetAmount = String(searchParams.budget);
      }

      return base;
    }

    function validateWizardStep0(formData: { destination: string; startDate: string; endDate: string }) {
      const errs: Record<string, string> = {};
      if (!formData.destination || formData.destination.trim().length < 2) {
        errs.destination = "Destination is required.";
      }
      if (!formData.startDate) {
        errs.startDate = "Start date is required.";
      }
      if (!formData.endDate) {
        errs.endDate = "End date is required.";
      } else if (formData.startDate && formData.endDate < formData.startDate) {
        errs.endDate = "End date must be on or after start date.";
      }
      return errs;
    }

    function validateWizardStep1(formData: { adultCount: number; hasBudget: boolean; budgetAmount: string }) {
      const errs: Record<string, string> = {};
      if (formData.adultCount < 1) {
        errs.adultCount = "At least one adult traveller is required.";
      }
      if (formData.hasBudget && formData.budgetAmount) {
        const val = Number(formData.budgetAmount);
        if (isNaN(val) || val < 0) {
          errs.budgetAmount = "Please enter a valid positive budget amount.";
        }
      }
      return errs;
    }

    it("handles all missing params cleanly by preserving default INR 75,000 and 2 adults", () => {
      const form = simulateWizardInit({});
      expect(form.destination).toBe("");
      expect(form.budgetAmount).toBe("75000");
      expect(form.budgetCurrency).toBe("INR");
      expect(form.adultCount).toBe(2);
      expect(form.startDate).toBe("");
      expect(form.endDate).toBe("");
    });

    it("handles empty string params without overwriting defaults", () => {
      const form = simulateWizardInit({
        dest: "",
        startDate: "",
        endDate: "",
        party: "",
        budget: "",
      });
      expect(form.destination).toBe("");
      expect(form.budgetAmount).toBe("75000");
      expect(form.adultCount).toBe(2);
    });

    it("sanitizes non-numeric party parameter: falls back to default 2 adults", () => {
      expect(simulateWizardInit({ party: "abc" }).adultCount).toBe(2);
      expect(simulateWizardInit({ party: "-5" }).adultCount).toBe(2);
      expect(simulateWizardInit({ party: "0" }).adultCount).toBe(2);
      expect(simulateWizardInit({ party: "NaN" }).adultCount).toBe(2);
      expect(simulateWizardInit({ party: "undefined" }).adultCount).toBe(2);
      expect(simulateWizardInit({ party: "null" }).adultCount).toBe(2);
    });

    it("accepts valid party parameter", () => {
      expect(simulateWizardInit({ party: "4" }).adultCount).toBe(4);
      expect(simulateWizardInit({ party: "1" }).adultCount).toBe(1);
    });

    it("catches non-numeric budget parameter in Step 1 validation", () => {
      const form = simulateWizardInit({ budget: "free" });
      expect(form.budgetAmount).toBe("free");

      const errs = validateWizardStep1(form);
      expect(errs.budgetAmount).toBe("Please enter a valid positive budget amount.");
    });

    it("catches negative budget parameter in Step 1 validation", () => {
      const form = simulateWizardInit({ budget: "-5000" });
      const errs = validateWizardStep1(form);
      expect(errs.budgetAmount).toBe("Please enter a valid positive budget amount.");
    });

    it("passes valid numeric budget parameter", () => {
      const form = simulateWizardInit({ budget: "150000" });
      const errs = validateWizardStep1(form);
      expect(errs.budgetAmount).toBeUndefined();
    });

    it("catches inverted date range (endDate < startDate) in Step 0 validation", () => {
      const form = simulateWizardInit({
        dest: "Goa, India",
        startDate: "2026-11-20",
        endDate: "2026-11-10",
      });
      const errs = validateWizardStep0(form);
      expect(errs.endDate).toBe("End date must be on or after start date.");
    });

    it("passes valid date range (endDate >= startDate) in Step 0 validation", () => {
      const form = simulateWizardInit({
        dest: "Goa, India",
        startDate: "2026-11-10",
        endDate: "2026-11-20",
      });
      const errs = validateWizardStep0(form);
      expect(errs.endDate).toBeUndefined();
      expect(errs.destination).toBeUndefined();
    });

    it("passes same-day single-day trip in Step 0 validation", () => {
      const form = simulateWizardInit({
        dest: "Mysuru, India",
        startDate: "2026-11-10",
        endDate: "2026-11-10",
      });
      const errs = validateWizardStep0(form);
      expect(errs.endDate).toBeUndefined();
    });

    it("empirically demonstrates Home Launcher regex flaw: optional currency symbol matches traveler count instead of budget", () => {
      // In src/components/home/stitch-home-launcher.tsx lines 104-108:
      // const budgetMatch = partyBudget.match(/(?:₹|\$|rs\.?|inr)?\s*([\d,]+)/i);
      const partyBudget = "4 Travelers · ₹1,50,000";
      const currentRegex = /(?:₹|\$|rs\.?|inr)?\s*([\d,]+)/i;
      const budgetMatch = partyBudget.match(currentRegex);

      expect(budgetMatch).not.toBeNull();
      // Because the symbol prefix is optional (?), the regex matches index 0 ("4")!
      expect(budgetMatch![1]).toBe("4"); // Matches the traveler count, NOT the budget!

      // Then in the launcher:
      // const b = parseInt(budgetMatch[1].replace(/,/g, ""), 10);
      // if (!isNaN(b) && b > 100) currentBudget = b;
      const b = parseInt(budgetMatch![1].replace(/,/g, ""), 10);
      expect(b).toBe(4);
      expect(b > 100).toBe(false); // Fails the > 100 threshold!
      // Therefore, currentBudget remains the default (75,000) and the user's typed 1,50,000 is silently dropped!

      // EMPIRICAL PROOF OF SECONDARY FAILURE:
      // If travelers is >= 100 (e.g. tour group of 150):
      const largeGroup = "150 Travelers · ₹50,000";
      const groupMatch = largeGroup.match(currentRegex);
      const groupB = parseInt(groupMatch![1].replace(/,/g, ""), 10);
      expect(groupB).toBe(150);
      expect(groupB > 100).toBe(true);
      // currentBudget is corrupted to 150 (the traveler count)!
    });

    it("verifies the proposed robust parser correctly extracts both travelers and budget", () => {
      const partyBudget = "4 Travelers · ₹1,50,000";
      const parts = partyBudget.split("·");
      let extractedTravelers = 2;
      let extractedBudget = 75000;

      if (parts[0]) {
        const pMatch = parts[0].match(/(\d+)/);
        if (pMatch) extractedTravelers = parseInt(pMatch[1], 10);
      }
      if (parts[1]) {
        const bMatch = parts[1].match(/([\d,]+)/);
        if (bMatch) extractedBudget = parseInt(bMatch[1].replace(/,/g, ""), 10);
      }

      expect(extractedTravelers).toBe(4);
      expect(extractedBudget).toBe(150000);
    });

    it("verifies StitchHomeLauncher parsePartyAndBudget correctly extracts 4 and 150 travelers with custom budgets", () => {
      const res1 = parsePartyAndBudget("4 Travelers · ₹1,50,000");
      expect(res1.travelers).toBe(4);
      expect(res1.budget).toBe(150000);

      const res2 = parsePartyAndBudget("150 Travelers · ₹2,00,000");
      expect(res2.travelers).toBe(150);
      expect(res2.budget).toBe(200000);
    });

    it("URLSearchParams roundtrips complex special characters in destination cleanly", () => {
      const dest = "Kyoto & Osaka, Japan (Special #1 / 5★)";
      const params = new URLSearchParams();
      params.set("dest", dest);

      const qs = params.toString();
      const parsed = new URLSearchParams(qs);
      expect(parsed.get("dest")).toBe(dest);
    });
  });
});
