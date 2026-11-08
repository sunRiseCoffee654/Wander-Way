import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/types/supabase-types";
import { draftCandidatePlan } from "./gemini-client";
import { groundCandidatePlan } from "./grounding";
import type { TripGenerationInput } from "./types";

/**
 * Runs the end-to-end background generation and grounding pipeline for a proposal.
 * Can be executed inside Next.js `after()`, a serverless queue worker, or an Edge function.
 */
export async function runGeneration(proposalId: string): Promise<void> {
  const startTime = Date.now();
  const supabase = createAdminClient();

  // 1. Fetch proposal
  const { data: proposal, error: fetchErr } = await supabase
    .from("trip_proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (fetchErr || !proposal) {
    console.error(`[runGeneration] Proposal ${proposalId} not found:`, fetchErr);
    return;
  }

  if (proposal.status !== "generating") {
    console.log(`[runGeneration] Proposal ${proposalId} is already in state '${proposal.status}'. Skipping.`);
    return;
  }

  const input = proposal.input_snapshot as unknown as TripGenerationInput;

  try {
    // 2. Drafting stage with Gemini
    await supabase
      .from("trip_proposals")
      .update({ stage: "drafting" })
      .eq("id", proposalId);

    const draftResult = await draftCandidatePlan(input);

    // 3. Grounding stage with Geoapify
    await supabase
      .from("trip_proposals")
      .update({ stage: "grounding" })
      .eq("id", proposalId);

    const { proposalData, groundingStats } = await groundCandidatePlan(
      draftResult.plan,
      input.destination,
    );

    // 4. Routing stage completed in groundCandidatePlan, now finalize
    await supabase
      .from("trip_proposals")
      .update({
        status: "pending_review",
        stage: "done",
        summary: proposalData.summary,
        proposal_data: proposalData as unknown as Json,
        grounding_stats: groundingStats as unknown as Json,
        model: draftResult.model,
        prompt_version: draftResult.promptVersion,
        generation_ms: Date.now() - startTime,
      })
      .eq("id", proposalId);

    console.log(`[runGeneration] Successfully generated proposal ${proposalId} in ${Date.now() - startTime}ms.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[runGeneration] Error generating proposal ${proposalId}:`, message);

    await supabase
      .from("trip_proposals")
      .update({
        status: "failed",
        stage: "done",
        error_code: message.substring(0, 250),
        generation_ms: Date.now() - startTime,
      })
      .eq("id", proposalId);
  }
}
