import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ proposalId: string }> },
) {
  try {
    const { proposalId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RLS ensures only owners and editors can read this proposal
    const { data: proposal, error: fetchErr } = await supabase
      .from("trip_proposals")
      .select("*")
      .eq("id", proposalId)
      .single();

    if (fetchErr || !proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: proposal.id,
      trip_id: proposal.trip_id,
      status: proposal.status,
      stage: proposal.stage,
      error_code: proposal.error_code,
      summary: proposal.summary,
      model: proposal.model,
      generation_ms: proposal.generation_ms,
      input_snapshot: proposal.input_snapshot,
      grounding_stats: proposal.grounding_stats,
      proposal_data: proposal.proposal_data,
      created_at: proposal.created_at,
      applied_at: proposal.applied_at,
    });
  } catch (err) {
    console.error("[GET /api/trips/proposals/[proposalId] error]", err);
    return NextResponse.json(
      { error: "Failed to retrieve proposal status." },
      { status: 500 },
    );
  }
}
