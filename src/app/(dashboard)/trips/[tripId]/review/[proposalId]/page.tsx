import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/utils/safe-redirect";
import { ProposalReviewClient } from "@/components/itinerary/proposal-review-client";
import type { TripProposalRecord } from "@/lib/ai/types";

export const metadata: Metadata = {
  title: "Review proposal — WanderWay",
  description: "Review your AI-generated itinerary proposal.",
};

export default async function ProposalReviewPage(props: {
  params: Promise<{ tripId: string; proposalId: string }>;
}) {
  const { tripId, proposalId } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    safeRedirect("/login");
  }

  // Fetch proposal with RLS enforcement
  const { data: proposal, error } = await supabase
    .from("trip_proposals")
    .select("*")
    .eq("id", proposalId)
    .eq("trip_id", tripId)
    .single();

  if (error || !proposal) {
    notFound();
  }

  return (
    <ProposalReviewClient
      initialProposal={proposal as unknown as TripProposalRecord}
      tripId={tripId}
    />
  );
}
