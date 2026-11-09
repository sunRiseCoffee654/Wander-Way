import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPackingItems } from "@/lib/packing/actions";
import { StitchPackingView } from "@/components/packing/stitch-packing-view";

export const metadata: Metadata = {
  title: "Smart Packing & Gear Companion — WanderWay",
  description:
    "AI-grounded contextual packing checklist based on local weather, destination etiquette, and planned activities.",
};

export default async function GlobalPackingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let trip: {
    id: string;
    title: string;
    destination: string;
  } | null = null;

  if (user) {
    const { data } = await supabase
      .from("trips")
      .select("id, title, destination")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    trip = data;
  }

  const tripId = trip?.id || "default";
  const destination = trip?.destination || "Destination";
  const tripTitle = trip?.title || "Smart Packing & Gear";
  const initialItems = await getPackingItems(tripId);

  return (
    <div className="py-6 sm:py-8 px-4 sm:px-8">
      <StitchPackingView
        tripId={tripId}
        tripTitle={tripTitle}
        destination={destination}
        initialItems={initialItems}
      />
    </div>
  );
}
