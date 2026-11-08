import { describe, it, expect } from "vitest";
import { parsePartyAndBudget } from "@/components/home/stitch-home-launcher";
import { formatMinorUnitsCurrency } from "@/lib/budget/calculations";
import { formatMinorUnits, CURRENCY_DECIMALS } from "@/lib/currency/service";

describe("Challenger R2: Independent Empirical Verification Harness", () => {
  // =========================================================================
  // DEFECT 1: Party & Budget Extraction Robustness (StitchHomeLauncher)
  // =========================================================================
  describe("Defect 1: Party & Budget Extraction (parsePartyAndBudget)", () => {
    describe("Mandatory Orchestrator Test Cases", () => {
      it("Case 1: correctly extracts '4 Travelers · ₹1,50,000'", () => {
        const result = parsePartyAndBudget("4 Travelers · ₹1,50,000");
        expect(result.travelers).toBe(4);
        expect(result.budget).toBe(150000);
      });

      it("Case 2: correctly extracts '150 Travelers · ₹2,00,000' (large group > 100 never corrupts budget)", () => {
        const result = parsePartyAndBudget("150 Travelers · ₹2,00,000");
        expect(result.travelers).toBe(150);
        expect(result.budget).toBe(200000);
      });

      it("Case 3: correctly handles '2 Travelers · Balanced' (preserves fallback budget without corruption)", () => {
        const result = parsePartyAndBudget("2 Travelers · Balanced", 2, 75000);
        expect(result.travelers).toBe(2);
        expect(result.budget).toBe(75000);
      });

      it("Case 3b: handles other qualitative presets like 'Luxury' and 'Backpacker'", () => {
        const lux = parsePartyAndBudget("3 Travelers · Luxury", 3, 100000);
        expect(lux.travelers).toBe(3);
        expect(lux.budget).toBe(100000);

        const eco = parsePartyAndBudget("1 Traveler · Backpacker", 1, 25000);
        expect(eco.travelers).toBe(1);
        expect(eco.budget).toBe(25000);
      });
    });

    describe("Boundary & Adversarial Inputs", () => {
      it("handles single traveler with modest budget '1 Traveler · ₹5,000'", () => {
        const result = parsePartyAndBudget("1 Traveler · ₹5,000");
        expect(result.travelers).toBe(1);
        expect(result.budget).toBe(5000);
      });

      it("handles very large groups: 500 travelers with ₹50,00,000 budget", () => {
        const result = parsePartyAndBudget("500 Travelers · ₹50,00,000");
        expect(result.travelers).toBe(500);
        expect(result.budget).toBe(5000000);
      });

      it("handles extreme group: 1000 travelers with ₹1,00,00,000 (1 crore) budget", () => {
        const result = parsePartyAndBudget("1000 Travelers · ₹1,00,00,000");
        expect(result.travelers).toBe(1000);
        expect(result.budget).toBe(10000000);
      });

      it("handles unusual whitespace and indentation around delimiters", () => {
        const result = parsePartyAndBudget("   8    Travelers    ·    ₹   12,50,000   ");
        expect(result.travelers).toBe(8);
        expect(result.budget).toBe(1250000);
      });

      it("handles alternative delimiters cleanly ('|', '-', '—', '–', '/')", () => {
        expect(parsePartyAndBudget("5 Travelers | ₹2,50,000")).toEqual({ travelers: 5, budget: 250000 });
        expect(parsePartyAndBudget("5 Travelers - ₹2,50,000")).toEqual({ travelers: 5, budget: 250000 });
        expect(parsePartyAndBudget("5 Travelers — ₹2,50,000")).toEqual({ travelers: 5, budget: 250000 });
        expect(parsePartyAndBudget("5 Travelers – ₹2,50,000")).toEqual({ travelers: 5, budget: 250000 });
        expect(parsePartyAndBudget("5 Travelers / ₹2,50,000")).toEqual({ travelers: 5, budget: 250000 });
      });

      it("handles non-delimited inputs with currency symbols ($ £ € ¥ ₹ Rs. INR)", () => {
        expect(parsePartyAndBudget("4 Travelers $5,000")).toEqual({ travelers: 4, budget: 5000 });
        expect(parsePartyAndBudget("4 Travelers €4,500")).toEqual({ travelers: 4, budget: 4500 });
        expect(parsePartyAndBudget("4 Travelers £3,800")).toEqual({ travelers: 4, budget: 3800 });
        expect(parsePartyAndBudget("4 Travelers ¥500,000")).toEqual({ travelers: 4, budget: 500000 });
        expect(parsePartyAndBudget("4 Travelers Rs. 150000")).toEqual({ travelers: 4, budget: 150000 });
        expect(parsePartyAndBudget("4 Travelers INR 150000")).toEqual({ travelers: 4, budget: 150000 });
      });

      it("handles reversed currency input order '₹1,50,000 for 4 Travelers'", () => {
        const result = parsePartyAndBudget("₹1,50,000 for 4 Travelers");
        expect(result.travelers).toBe(4);
        expect(result.budget).toBe(150000);
      });

      it("handles empty or degenerate strings gracefully with fallbacks", () => {
        expect(parsePartyAndBudget("", 2, 75000)).toEqual({ travelers: 2, budget: 75000 });
        expect(parsePartyAndBudget("    ", 2, 75000)).toEqual({ travelers: 2, budget: 75000 });
        expect(parsePartyAndBudget("No numbers here at all", 2, 75000)).toEqual({ travelers: 2, budget: 75000 });
      });

      it("handles zero values without corrupting fallback state", () => {
        const result = parsePartyAndBudget("0 Travelers · ₹0", 2, 75000);
        expect(result.travelers).toBe(2);
        expect(result.budget).toBe(75000);
      });
    });

    describe("Fuzz Generator: 100 Randomized Party & Budget Inputs", () => {
      it("guarantees custom user budgets and traveler counts are NEVER dropped or corrupted", () => {
        // Deterministic pseudo-random sequence for repeatability
        let seed = 42;
        const pseudoRand = () => {
          seed = (seed * 1664525 + 1013904223) % 4294967296;
          return seed / 4294967296;
        };

        for (let i = 0; i < 100; i++) {
          const travelers = Math.floor(pseudoRand() * 200) + 1; // 1 to 200
          const budget = Math.floor(pseudoRand() * 5000000) + 1000; // 1000 to 5001000

          // Format with Indian numbering system commas
          const formattedBudget = budget.toLocaleString("en-IN");
          const input = `${travelers} Travelers · ₹${formattedBudget}`;

          const parsed = parsePartyAndBudget(input, 2, 75000);
          expect(parsed.travelers).toBe(travelers);
          expect(parsed.budget).toBe(budget);
        }
      });
    });
  });

  // =========================================================================
  // DEFECT 2: Zero-Decimal Currency Formatting (formatMinorUnitsCurrency)
  // =========================================================================
  describe("Defect 2: Zero-Decimal Currency Formatting (formatMinorUnitsCurrency)", () => {
    describe("Mandatory Orchestrator Test Cases", () => {
      it("Case 1: formatMinorUnitsCurrency(1500, 'JPY') produces NO '.00' fractional digits", () => {
        const formatted = formatMinorUnitsCurrency(1500, "JPY");
        // Must contain 1,500 or 1500
        expect(formatted).toMatch(/1,500/);
        // Must NEVER contain .00 or any fractional decimal part
        expect(formatted).not.toMatch(/\.00/);
        expect(formatted).not.toMatch(/\.\d+/);
        // Must contain currency symbol
        expect(formatted).toContain("¥");
      });

      it("Case 2: verifies delegation directly aligns with formatMinorUnits for JPY", () => {
        const direct = formatMinorUnits(1500, "JPY", "en-IN");
        const delegated = formatMinorUnitsCurrency(1500, "JPY", "en-IN");
        expect(delegated).toBe(direct);
      });
    });

    describe("Stress Testing All Supported Currencies & Multipliers", () => {
      it("verifies JPY zero-decimal precision across diverse scales", () => {
        expect(formatMinorUnitsCurrency(0, "JPY")).toMatch(/¥0/);
        expect(formatMinorUnitsCurrency(0, "JPY")).not.toMatch(/\./);

        expect(formatMinorUnitsCurrency(1, "JPY")).toMatch(/¥1/);
        expect(formatMinorUnitsCurrency(1, "JPY")).not.toMatch(/\./);

        expect(formatMinorUnitsCurrency(999, "JPY")).toMatch(/¥999/);
        expect(formatMinorUnitsCurrency(999, "JPY")).not.toMatch(/\./);

        expect(formatMinorUnitsCurrency(50000, "JPY")).toMatch(/¥50,000/);
        expect(formatMinorUnitsCurrency(50000, "JPY")).not.toMatch(/\./);

        expect(formatMinorUnitsCurrency(12000000, "JPY")).toMatch(/¥1,20,00,000|¥12,000,000/);
        expect(formatMinorUnitsCurrency(12000000, "JPY")).not.toMatch(/\./);
      });

      it("verifies JPY with split multipliers never produces fractional decimals", () => {
        // 1500 / 2 = 750
        const half = formatMinorUnitsCurrency(1500, "JPY", "en-IN", 0.5);
        expect(half).toMatch(/¥750/);
        expect(half).not.toMatch(/\./);

        // 1501 * 0.5 = 750.5 -> rounded to 751
        const oddHalf = formatMinorUnitsCurrency(1501, "JPY", "en-IN", 0.5);
        expect(oddHalf).toMatch(/¥751/);
        expect(oddHalf).not.toMatch(/\./);

        // 1500 * 0.33333333 = 500
        const third = formatMinorUnitsCurrency(1500, "JPY", "en-IN", 1 / 3);
        expect(third).toMatch(/¥500/);
        expect(third).not.toMatch(/\./);
      });

      it("verifies two-decimal currencies (INR, USD, EUR, GBP) maintain proper 2-decimal formatting", () => {
        // INR: 7500000 minor units = 75,000.00
        const inr = formatMinorUnitsCurrency(7500000, "INR", "en-IN");
        expect(inr).toContain("₹");
        expect(inr).toMatch(/75,000\.00/);

        // USD: 50000 minor units = 500.00
        const usd = formatMinorUnitsCurrency(50000, "USD", "en-US");
        expect(usd).toContain("$");
        expect(usd).toMatch(/500\.00/);

        // EUR: 25000 minor units = 250.00
        const eur = formatMinorUnitsCurrency(25000, "EUR", "en-US");
        expect(eur).toContain("€");
        expect(eur).toMatch(/250\.00/);

        // GBP: 18000 minor units = 180.00
        const gbp = formatMinorUnitsCurrency(18000, "GBP", "en-GB");
        expect(gbp).toContain("£");
        expect(gbp).toMatch(/180\.00/);
      });

      it("CURRENCY_DECIMALS dictionary correctly maps JPY to 0 and other standards to 2", () => {
        expect(CURRENCY_DECIMALS["JPY"]).toBe(0);
        expect(CURRENCY_DECIMALS["INR"]).toBe(2);
        expect(CURRENCY_DECIMALS["USD"]).toBe(2);
        expect(CURRENCY_DECIMALS["EUR"]).toBe(2);
        expect(CURRENCY_DECIMALS["GBP"]).toBe(2);
      });
    });
  });

  // =========================================================================
  // INTEGRATION CONTRACT: Query String Generation & Parsing
  // =========================================================================
  describe("Integration Contract: Home Launcher URL Query Serialization", () => {
    it("serializes parsed parameters into /trips/new query strings without loss", () => {
      const inputs = [
        {
          raw: "4 Travelers · ₹1,50,000",
          dest: "Kyoto, Japan",
          start: "2026-11-14",
          end: "2026-11-21",
          expectedParty: "4",
          expectedBudget: "150000",
        },
        {
          raw: "150 Travelers · ₹2,00,000",
          dest: "Goa, India",
          start: "2026-12-01",
          end: "2026-12-05",
          expectedParty: "150",
          expectedBudget: "200000",
        },
        {
          raw: "2 Travelers · Balanced",
          dest: "Swiss Alps",
          start: "2027-01-10",
          end: "2027-01-17",
          expectedParty: "2",
          expectedBudget: "75000",
        },
      ];

      for (const item of inputs) {
        const parsed = parsePartyAndBudget(item.raw, 2, 75000);
        const params = new URLSearchParams();
        params.set("dest", item.dest);
        params.set("startDate", item.start);
        params.set("endDate", item.end);
        params.set("party", String(parsed.travelers));
        params.set("budget", String(parsed.budget));

        const queryString = params.toString();
        const readBack = new URLSearchParams(queryString);

        expect(readBack.get("dest")).toBe(item.dest);
        expect(readBack.get("startDate")).toBe(item.start);
        expect(readBack.get("endDate")).toBe(item.end);
        expect(readBack.get("party")).toBe(item.expectedParty);
        expect(readBack.get("budget")).toBe(item.expectedBudget);
      }
    });
  });
});
