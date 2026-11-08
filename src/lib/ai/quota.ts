import { SupabaseClient } from "@supabase/supabase-js";

export const DAILY_USER_QUOTA = 10;
export const TRIP_COOLDOWN_SECONDS = 30;

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  remainingDaily?: number;
}

/**
 * Enforces per-user daily limits and per-trip cooldowns to prevent abuse and runaway cost.
 */
export async function checkGenerationQuota(
  supabase: SupabaseClient,
  userId: string,
  tripId: string,
): Promise<QuotaCheckResult> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const cooldownThreshold = new Date(Date.now() - TRIP_COOLDOWN_SECONDS * 1000).toISOString();

  // Check trip cooldown
  const { data: recentTripProposals, error: tripErr } = await supabase
    .from("trip_proposals")
    .select("created_at")
    .eq("trip_id", tripId)
    .gt("created_at", cooldownThreshold)
    .limit(1);

  if (tripErr) {
    console.error("[checkGenerationQuota trip check error]", tripErr);
  } else if (recentTripProposals && recentTripProposals.length > 0) {
    return {
      allowed: false,
      reason: `Please wait ${TRIP_COOLDOWN_SECONDS} seconds between generation attempts on the same trip.`,
    };
  }

  // Check daily user quota
  const { count, error: userErr } = await supabase
    .from("trip_proposals")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .gt("created_at", oneDayAgo);

  if (userErr) {
    console.error("[checkGenerationQuota user check error]", userErr);
  } else if ((count ?? 0) >= DAILY_USER_QUOTA) {
    return {
      allowed: false,
      reason: `Daily generation limit (${DAILY_USER_QUOTA} proposals per 24 hours) reached. Please try again tomorrow.`,
      remainingDaily: 0,
    };
  }

  return {
    allowed: true,
    remainingDaily: DAILY_USER_QUOTA - (count ?? 0),
  };
}
