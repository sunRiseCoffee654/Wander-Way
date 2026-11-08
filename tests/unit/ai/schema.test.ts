import { describe, it, expect } from "vitest";
import {
  TripGenerationInputSchema,
  CandidateActivitySchema,
  CandidatePlanSchema,
} from "@/lib/ai/schema";

describe("AI Schema Validation", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";

  it("accepts a valid TripGenerationInput", () => {
    const input = {
      tripId: validUuid,
      destination: "Kyoto, Japan",
      startDate: "2027-04-10",
      endDate: "2027-04-15",
      adultCount: 2,
      childCount: 1,
      travelPace: "balanced" as const,
      interests: ["Culture & Heritage", "Food & Dining"],
      notes: "Vegetarian options preferred",
    };

    const parsed = TripGenerationInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.destination).toBe("Kyoto, Japan");
      expect(parsed.data.adultCount).toBe(2);
      expect(parsed.data.budgetCurrency).toBe("INR");
      expect(parsed.data.notes).toBe("Vegetarian options preferred");
    }
  });

  it("truncates control characters in notes", () => {
    const input = {
      tripId: validUuid,
      destination: "Paris, France",
      startDate: "2027-05-01",
      endDate: "2027-05-05",
      adultCount: 1,
      notes: "Test\u0000with\u001Fcontrol\u007Fcharacters",
    };

    const parsed = TripGenerationInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.notes).toBe("Testwithcontrolcharacters");
    }
  });

  it("validates CandidateActivity and enforces 24h planned_time format", () => {
    const validAct = {
      title: "Fushimi Inari Shrine",
      description: "Walk the thousands of vermilion torii gates.",
      place_name: "Fushimi Inari-taisha",
      place_category: "Shrine",
      planned_time: "09:30",
      duration_minutes: 90,
      booking_hint: "free",
    };

    const result = CandidateActivitySchema.safeParse(validAct);
    expect(result.success).toBe(true);

    const invalidTimeAct = {
      ...validAct,
      planned_time: "9:30 AM", // Invalid format
    };
    const invalidResult = CandidateActivitySchema.safeParse(invalidTimeAct);
    expect(invalidResult.success).toBe(false);
  });

  it("validates CandidatePlan structure", () => {
    const plan = {
      summary: "A cultural exploration of ancient temples and serene bamboo groves.",
      days: [
        {
          day_number: 1,
          calendar_date: "2027-04-10",
          title: "Historic Southern Kyoto",
          activities: [
            {
              title: "Fushimi Inari Shrine",
              description: "Explore the scenic mountain path.",
              place_name: "Fushimi Inari-taisha",
              place_category: "Shrine",
              planned_time: "09:00",
              duration_minutes: 120,
              booking_hint: "free",
            },
          ],
        },
      ],
    };

    const parsed = CandidatePlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);
  });
});
