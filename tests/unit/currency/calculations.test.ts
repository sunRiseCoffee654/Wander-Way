import { describe, it, expect } from "vitest";
import {
  convertMinorUnitsDeterministic,
  formatMinorUnits,
  getFallbackRates,
} from "@/lib/currency/service";

describe("Deterministic FX Currency Engine", () => {
  it("converts between standard 2-decimal currencies deterministically", () => {
    // Convert $100.00 USD (10000 minor units) to EUR at rate 0.925
    const result = convertMinorUnitsDeterministic(10000, "USD", "EUR", { EUR: 0.925 });
    expect(result.original_amount_minor).toBe(10000);
    expect(result.converted_amount_minor).toBe(9250); // €92.50
    expect(result.fx_rate_to_target).toBe(0.925);
    expect(result.target_currency).toBe("EUR");
    expect(result.formatted_converted).toContain("92.50");
  });

  it("accurately handles 0-decimal currencies like JPY without floating point errors", () => {
    // Convert $10.00 USD (1000 minor cents) to JPY at rate 154.50 JPY/USD
    const result = convertMinorUnitsDeterministic(1000, "USD", "JPY", { JPY: 154.5 });
    // $10.00 * 154.5 = 1545 JPY (0 decimals -> 1545 minor units)
    expect(result.converted_amount_minor).toBe(1545);
    expect(result.formatted_converted).toContain("1,545");

    // Convert 1545 JPY back to USD at rate 1/154.50 = 0.00647249
    const backToUsd = convertMinorUnitsDeterministic(1545, "JPY", "USD", { USD: 1 / 154.5 });
    expect(backToUsd.converted_amount_minor).toBe(1000); // exactly $10.00 (1000 cents)
  });

  it("handles identical currency conversion with parity 1:1", () => {
    const result = convertMinorUnitsDeterministic(5500, "USD", "USD");
    expect(result.converted_amount_minor).toBe(5500);
    expect(result.fx_rate_to_target).toBe(1.0);
    expect(result.fx_source).toBe("Parity 1:1");
  });

  it("generates fallback rates matrix with 10 major global currencies", () => {
    const fallback = getFallbackRates("USD");
    expect(fallback.base).toBe("USD");
    expect(fallback.rates.USD).toBe(1.0);
    expect(fallback.rates.JPY).toBeGreaterThan(100);
    expect(fallback.rates.EUR).toBeGreaterThan(0.5);
    expect(fallback.rates.GBP).toBeGreaterThan(0.5);
  });

  it("defaults to INR base currency in fallback rates matrix", () => {
    const fallback = getFallbackRates();
    expect(fallback.base).toBe("INR");
    expect(fallback.rates.INR).toBe(1.0);
    expect(fallback.rates.USD).toBeLessThan(0.1);
    expect(fallback.rates.EUR).toBeLessThan(0.1);
  });

  it("formats international currencies with correct minor unit display", () => {
    expect(formatMinorUnits(1550, "USD")).toContain("15.50");
    expect(formatMinorUnits(284280, "JPY")).toContain("284,280");
  });

  it("formats minor units with default INR currency and symbol", () => {
    const formatted = formatMinorUnits(7500000);
    expect(formatted).toContain("₹");
    expect(formatted).toContain("75,000.00");
  });
});
