import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TripGenerationInputSchema } from "@/lib/ai/schema";
import { checkGenerationQuota } from "@/lib/ai/quota";
import { runGeneration } from "@/lib/ai/pipeline";
import { PROMPT_VERSION, getGeminiModel } from "@/lib/ai/gemini-client";

export const maxDuration = 60;

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
    const parsed = TripGenerationInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid trip generation input", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const input = parsed.data;

    // Check user has editor access to the trip
    const { data: hasAccess, error: accessErr } = await supabase.rpc("is_trip_member", {
      lookup_trip_id: input.tripId,
      min_role: "editor",
    });

    if (accessErr || !hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: You must be an owner or editor of this trip." },
        { status: 403 },
      );
    }

    // Check quota and cooldown
    const quota = await checkGenerationQuota(supabase, user.id, input.tripId);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.reason || "Quota limit reached" },
        { status: 429 },
      );
    }

    // Create the proposal row atomically via RPC
    const { data: proposal, error: rpcErr } = await supabase.rpc("create_trip_proposal", {
      p_trip_id: input.tripId,
      p_created_by: user.id,
      p_input_snapshot: input as unknown as Record<string, unknown>,
      p_model: getGeminiModel(),
      p_prompt_version: PROMPT_VERSION,
    });

    if (rpcErr || !proposal) {
      console.error("[generate proposal rpc error]", rpcErr);
      return NextResponse.json(
        { error: "Failed to initialize trip proposal record." },
        { status: 500 },
      );
    }

    // Trigger asynchronous background generation with Next.js after()
    after(async () => {
      await runGeneration(proposal.id);
    });

    // Return 202 Accepted immediately
    return NextResponse.json(
      {
        proposalId: proposal.id,
        tripId: input.tripId,
        status: "generating",
        stage: "queued",
      },
      { status: 202 },
    );
  } catch (err) {
    console.error("[POST /api/trips/generate unexpected error]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while starting plan generation." },
      { status: 500 },
    );
  }
}
