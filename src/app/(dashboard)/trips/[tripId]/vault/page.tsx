import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StitchVaultView } from "@/components/vault/stitch-vault-view";

export const metadata: Metadata = {
  title: "Live Travel Intelligence & Vault — WanderWay",
  description:
    "Real-time aviation bulletins, weather alerts, local transit detours, and AES-256 encrypted travel document vault.",
};

export default async function TripVaultPage(props: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch trip and documents if signed in
  let trip = null;
  let documents = null;

  if (user) {
    const { data: tripData } = await supabase
      .from("trips")
      .select("id, title, destination")
      .eq("id", tripId)
      .maybeSingle();
    trip = tripData;

    if (trip) {
      const { data: docsData } = await supabase
        .from("documents")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      documents = docsData;
    }
  }

  // If trip not found in DB, return 404
  if (!trip) {
    notFound();
  }

  return (
    <StitchVaultView
      tripTitle={trip.title || `Trip to ${trip.destination}`}
      tripId={tripId}
      destination={trip.destination || "Destination"}
      dbDocuments={documents || []}
    />
  );
}
