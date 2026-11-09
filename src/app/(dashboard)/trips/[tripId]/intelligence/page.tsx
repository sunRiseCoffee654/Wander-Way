import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IntelligenceClientView } from "@/components/intelligence/intelligence-client-view";

export const metadata: Metadata = {
  title: "Live Travel Intelligence & Telemetry — WanderWay",
  description:
    "Real-time aviation bulletins, weather alerts, local transit detours, and consular safety notices.",
};

export default async function TripIntelligencePage(props: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let trip: { id: string; title: string; destination: string } | null = null;

  if (user) {
    const { data: tripData } = await supabase
      .from("trips")
      .select("id, title, destination")
      .eq("id", tripId)
      .maybeSingle();
    trip = tripData;
  }

  // If trip not found in DB, return 404
  if (!trip) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <IntelligenceClientView
        tripId={tripId}
        tripTitle={trip.title || `Trip to ${trip.destination}`}
        destination={trip.destination || "Destination"}
      />
    </div>
  );
}
