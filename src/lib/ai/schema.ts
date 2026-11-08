import { z } from "zod";

/**
 * Validation schema for the generation request payload.
 * Truncates and sanitizes notes to prevent prompt injection.
 */
export const TripGenerationInputSchema = z.object({
  tripId: z.string().uuid("Invalid trip ID"),
  destination: z.string().min(2, "Destination must be at least 2 characters").max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
  adultCount: z.number().int().min(1, "At least 1 adult is required").max(50),
  childCount: z.number().int().min(0).max(50).default(0),
  roomCount: z.number().int().min(1).max(25).default(1),
  budgetMinorUnits: z.number().int().min(0).nullable().optional(),
  budgetCurrency: z.string().length(3).default("INR"),
  budgetBasis: z.enum(["total", "per_person"]).default("total"),
  travelPace: z.enum(["relaxed", "balanced", "full"]).default("balanced"),
  interests: z.array(z.string().max(40)).max(15).default([]),
  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .transform((val) => val.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim())
    .optional(),
});

export type TripGenerationInput = z.infer<typeof TripGenerationInputSchema>;

/**
 * Zod schema to validate structured JSON returned by Gemini AI.
 * Explicitly disallows coordinates or numeric prices in AI output.
 */
export const CandidateActivitySchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  title: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  place_name: z.string().min(1).max(150),
  place_category: z.string().max(80).default("Attraction"),
  planned_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)")
    .default("10:00"),
  duration_minutes: z.number().int().min(15).max(480).default(60),
  booking_hint: z
    .enum(["free", "ticket_likely", "reservation_recommended", "unknown"])
    .default("unknown"),
  is_must_see: z.boolean().default(false),
  notes: z.string().max(300).optional(),
});

export const CandidateDaySchema = z.object({
  day_number: z.number().int().min(1).max(60),
  calendar_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().max(100).default("Day Itinerary"),
  theme: z.string().max(100).optional(),
  activities: z.array(CandidateActivitySchema).min(1).max(15),
});

export const CandidatePlanSchema = z.object({
  summary: z.string().max(600).default("Proposed trip itinerary"),
  days: z.array(CandidateDaySchema).min(1).max(60),
});

export type CandidatePlanParsed = z.infer<typeof CandidatePlanSchema>;
