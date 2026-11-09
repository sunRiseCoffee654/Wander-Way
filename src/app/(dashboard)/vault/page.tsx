import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { StitchVaultView } from "@/components/vault/stitch-vault-view";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Live Travel Intelligence & Vault — WanderWay",
  description:
    "Real-time aviation bulletins, weather alerts, local transit detours, and AES-256 encrypted travel document vault.",
};

export default async function GlobalVaultPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's active/latest trip if signed in
  let trip = null;
  let dbDocuments: Database["public"]["Tables"]["documents"]["Row"][] = [];

  if (user) {
    const { data: tripData } = await supabase
      .from("trips")
      .select("id, title, destination")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    trip = tripData;

    if (trip?.id) {
      const { data: docs } = await supabase
        .from("documents")
        .select("*")
        .eq("trip_id", trip.id)
        .order("created_at", { ascending: false });
      if (docs) {
        dbDocuments = docs;
      }
    }
  }

  return (
    <StitchVaultView
      tripTitle={trip?.title || "Document Vault"}
      tripId={trip?.id || "default"}
      destination={trip?.destination || "Destination"}
      dbDocuments={dbDocuments}
    />
  );
}
