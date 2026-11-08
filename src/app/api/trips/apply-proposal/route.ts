import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ApplyProposalSchema = z.object({
  proposalId: z.string().uuid("Invalid proposal ID"),
  selectedActivityIds: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = ApplyProposalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid apply proposal request", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { proposalId, selectedActivityIds } = parsed.data;

    // Call atomic apply RPC
    const { data: result, error: rpcError } = await supabase.rpc("apply_trip_proposal", {
      p_proposal_id: proposalId,
      p_selected_activity_ids: selectedActivityIds,
    });

    if (rpcError) {
      console.error("[apply_trip_proposal RPC error]", rpcError);
      if (rpcError.message.includes("proposal_not_pending")) {
        return NextResponse.json(
          { error: "This proposal is not pending review or has already been applied." },
          { status: 409 },
        );
      }
      if (rpcError.message.includes("not_authorized")) {
        return NextResponse.json(
          { error: "You do not have permission to apply proposals to this trip." },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: "Failed to apply proposal to trip itinerary." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("[POST /api/trips/apply-proposal error]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while applying the proposal." },
      { status: 500 },
    );
  }
}
