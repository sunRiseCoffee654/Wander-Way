import { describe, it, expect } from "vitest";
import { getKyotoDemoPacking, generatePackingRecommendations } from "@/lib/ai/packing";

describe("AI Contextual Packing & Gear Assistant", () => {
  it("provides comprehensive Kyoto packing recommendations with weather and gear grounding", () => {
    const packing = getKyotoDemoPacking();

    expect(packing.summary).toBeTruthy();
    expect(packing.weather_overview.rain_risk).toBe("moderate");
    expect(packing.weather_overview.temperature_range).toContain("12°C");

    const itemNames = packing.items.map((i) => i.item_name.toLowerCase());

    // Verify user-specified requirements: umbrella, shoes, bag, hat, clothes
    const hasUmbrella = itemNames.some((name) => name.includes("umbrella"));
    const hasShoes = itemNames.some((name) => name.includes("shoes") || name.includes("boots"));
    const hasBag = itemNames.some((name) => name.includes("daypack") || name.includes("bag"));
    const hasHat = itemNames.some((name) => name.includes("hat"));
    const hasAttire = itemNames.some((name) => name.includes("layer") || name.includes("attire") || name.includes("modest"));

    expect(hasUmbrella).toBe(true);
    expect(hasShoes).toBe(true);
    expect(hasBag).toBe(true);
    expect(hasHat).toBe(true);
    expect(hasAttire).toBe(true);
  });

  it("categorizes all items into valid Material 3 companion categories", () => {
    const packing = getKyotoDemoPacking();
    const validCategories = [
      "weather_climate",
      "footwear_gear",
      "clothing_attire",
      "electronics_adapters",
      "essentials_health",
    ];

    for (const item of packing.items) {
      expect(validCategories).toContain(item.category);
      expect(item.quantity).toBeGreaterThanOrEqual(1);
      expect(typeof item.is_essential).toBe("boolean");
      expect(item.reason.length).toBeGreaterThan(10);
    }
  });

  it("generatePackingRecommendations returns complete result structure", async () => {
    const result = await generatePackingRecommendations({
      destination: "Kyoto, Japan",
      startDate: "2026-10-15",
      endDate: "2026-10-21",
    });

    expect(result.summary).toBeDefined();
    expect(result.weather_overview).toBeDefined();
    expect(result.items.length).toBeGreaterThanOrEqual(5);
  });
});
