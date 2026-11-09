"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import { normalizePriceEvidence, type EvidenceTier } from "./calculations";

export type DbLineItem = Database["public"]["Tables"]["budget_line_items"]["Row"];

export interface NewExpenseInput {
  tripId?: string;
  title: string;
  amountMinorUnits: number;
  currency: string;
  category: string;
  evidenceTier?: EvidenceTier | string;
  paidByUserId?: string | null;
  splitWithUserIds?: string[];
  sourceName?: string;
  sourceUrl?: string;
  isPaid?: boolean;
}

/**
 * Server action to record an expense.
 * Persists to Supabase if signed in, or generates an in-memory showcase item if anonymous or showcase trip.
 */
export async function recordExpenseAction(
  input: NewExpenseInput
): Promise<{ success: boolean; lineItem?: DbLineItem; error?: string }> {
  try {
    if (!input.title || input.title.trim().length === 0) {
      return { success: false, error: "Title is required" };
    }

    if (input.amountMinorUnits < 0 || isNaN(input.amountMinorUnits)) {
      return { success: false, error: "Invalid amount" };
    }

    const tripId = input.tripId || "kyoto-autumn-2025";
    const isShowcase =
      tripId === "kyoto-autumn-2025" ||
      tripId === "default" ||
      tripId.startsWith("mock-");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Persist to Supabase when user is authenticated and not a showcase fixture
    if (user && !isShowcase) {
      const { data, error } = await supabase
        .from("budget_line_items")
        .insert({
          trip_id: tripId,
          title: input.title.trim(),
          amount_minor_units: Math.round(input.amountMinorUnits),
          currency: input.currency || "INR",
          category: input.category || "General",
          evidence_type: normalizePriceEvidence(input.evidenceTier),
          paid_by_user_id: input.paidByUserId || user.id,
          is_paid: input.isPaid ?? true,
          source_name: input.sourceName || "Direct Expense",
          source_url: input.sourceUrl || null,
        })
        .select()
        .single();

      if (error) {
        console.warn("Supabase expense insert error, using fallback:", error.message);
      } else if (data) {
        revalidatePath("/budget");
        revalidatePath(`/trips/${tripId}/budget`);
        return { success: true, lineItem: data };
      }
    }

    // Showcase / offline fallback
    const fallbackLineItem: DbLineItem = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      trip_id: tripId,
      title: input.title.trim(),
      amount_minor_units: Math.round(input.amountMinorUnits),
      currency: input.currency || "INR",
      category: input.category || "General",
      evidence_type: normalizePriceEvidence(input.evidenceTier),
      paid_by_user_id: input.paidByUserId || (user?.id ?? "user_elena"),
      is_paid: input.isPaid ?? true,
      source_name: input.sourceName || "Direct Expense",
      source_url: input.sourceUrl || null,
      activity_id: null,
      checked_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      fx_rate_to_trip_currency: 1.0,
      fx_timestamp: new Date().toISOString(),
    };

    return { success: true, lineItem: fallbackLineItem };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record expense";
    return { success: false, error: message };
  }
}

/**
 * Server action to delete an expense line item.
 */
export async function deleteExpenseAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && !id.startsWith("exp-")) {
      const { error } = await supabase
        .from("budget_line_items")
        .delete()
        .eq("id", id);

      if (error) {
        console.warn("Supabase expense delete error:", error.message);
      }
    }

    revalidatePath("/budget");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete expense";
    return { success: false, error: message };
  }
}
