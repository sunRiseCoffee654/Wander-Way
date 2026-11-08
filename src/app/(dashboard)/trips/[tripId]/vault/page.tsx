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

  const isShowcase = tripId === "kyoto-autumn-2025" || tripId === "default";
  if (!trip && !isShowcase) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        tripId
      );
    if (isUuid) {
      notFound();
    }
  }

  return (
    <StitchVaultView
      tripTitle={trip?.title || "Kyoto & Tokyo Autumn Journey 2025"}
      tripId={tripId}
      destination={trip?.destination || "Kyoto, Japan"}
      dbDocuments={documents || []}
    />
  );
}
