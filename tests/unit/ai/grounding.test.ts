import { describe, it, expect } from "vitest";
import {
  haversineDistanceKm,
  computeNameSimilarity,
} from "@/lib/ai/grounding";

describe("Grounding Utilities", () => {
  it("calculates accurate haversine distance between two coordinates", () => {
    // Tokyo (35.6762, 139.6503) to Kyoto (35.0116, 135.7681) ~ 370 km
    const dist = haversineDistanceKm(35.6762, 139.6503, 35.0116, 135.7681);
    expect(dist).toBeGreaterThan(350);
    expect(dist).toBeLessThan(390);

    // Identical points should be 0 km
    expect(haversineDistanceKm(35.0, 135.0, 35.0, 135.0)).toBe(0);
  });

  it("computes string similarity accurately using character bigrams", () => {
    // Exact matches
    expect(computeNameSimilarity("Fushimi Inari Shrine", "Fushimi Inari Shrine")).toBe(1.0);
    expect(computeNameSimilarity("Eiffel Tower", "eiffel tower")).toBe(1.0);

    // High similarity
    const simHigh = computeNameSimilarity("Fushimi Inari Taisha", "Fushimi Inari Shrine");
    expect(simHigh).toBeGreaterThan(0.6);

    // Completely different strings
    const simLow = computeNameSimilarity("Colosseum", "Golden Gate Bridge");
    expect(simLow).toBeLessThan(0.2);
  });
});
