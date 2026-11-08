import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPackingItems } from "@/lib/packing/actions";
import { StitchPackingView } from "@/components/packing/stitch-packing-view";

export const metadata: Metadata = {
  title: "Smart Packing & Gear Companion — WanderWay",
  description:
    "AI-grounded contextual packing checklist based on local weather, destination etiquette, and planned activities.",
};

export default async function TripPackingPage(props: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let trip: {
    id: string;
    title: string;
    destination_name: string;
    start_date: string;
    end_date: string;
  } | null = null;

  if (user && !tripId.startsWith("mock-")) {
    const { data: tripData } = await supabase
      .from("trips")
      .select("id, title, destination_name, start_date, end_date")
      .eq("id", tripId)
      .maybeSingle();

    if (tripData) {
      trip = tripData;
    }
  }

  const isShowcase =
    tripId.startsWith("mock-") ||
    tripId === "kyoto-autumn-2025" ||
    tripId === "default" ||
    tripId === "autumn-kyoto-2026";

  if (!trip && !isShowcase) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        tripId
      );
    if (isUuid) {
      notFound();
    }
  }

  const destination = trip?.destination_name || "Kyoto, Japan";
  const tripTitle = trip?.title || "Kyoto & Tokyo Autumn Odyssey";
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
