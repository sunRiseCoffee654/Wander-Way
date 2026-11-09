import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TripMapClientView } from "./_components/trip-map-client-view";

export const metadata: Metadata = {
  title: "Vector Itinerary Map — WanderWay",
  description: "Interactive vector topology map with day selector tabs, route leg summaries, and waypoints list.",
};

export default async function TripMapPage(props: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let trip = null;
  if (user) {
    const { data } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .maybeSingle();
    trip = data;
  }

  // If trip not found in DB, return 404
  if (!trip) {
    notFound();
  }

  const { data: days } = await supabase
    .from("itinerary_days")
    .select(`
      *,
      itinerary_activities (*)
    `)
    .eq("trip_id", tripId)
    .order("day_number", { ascending: true });

  const tripTitle = trip.title || `Trip to ${trip.destination}`;
  const tripDestination = trip.destination || "Destination";

  return (
    <div className="w-full h-full flex flex-col">
      <TripMapClientView
        tripId={tripId}
        tripTitle={tripTitle}
        destination={tripDestination}
        dbDays={days || []}
      />
    </div>
  );
}
