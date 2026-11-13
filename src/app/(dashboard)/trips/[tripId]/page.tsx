import { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ItineraryClientView } from "./_components/itinerary-client-view";
import { TripWeatherWidget } from "@/components/weather/trip-weather-widget";
import { SevereWeatherBanner } from "@/components/weather/severe-weather-banner";
import { getMockRajasthanDays } from "@/lib/itinerary/showcase-days";

export const metadata: Metadata = {
  title: "Itinerary & Route Legs — WanderWay",
  description: "Explore day schedules, transit legs, verified pricing tiers, and interactive topology map.",
};

export default async function TripDetailPage(props: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch trip from Supabase
  let trip = null;
  if (user) {
    const { data } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .maybeSingle();
    trip = data;
  }

  if (!trip && tripId.startsWith("mock-")) {
    trip = {
      id: tripId,
      title: "Royal Rajasthan Heritage & Cultural Circuit",
      destination: "Jaipur, Rajasthan",
      start_date: "2026-11-11",
      end_date: "2026-11-16",
    };
  }

  // If trip doesn't exist in database, return 404
  if (!trip) {
    notFound();
  }

  // Fetch pending proposals
  const { data: activeProposal } = await supabase
    .from("trip_proposals")
    .select("id, status, stage, summary")
    .eq("trip_id", tripId)
    .in("status", ["generating", "pending_review"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch itinerary days and activities
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

  const resolvedDays =
    days && days.length > 0
      ? days
      : tripId.startsWith("mock-")
      ? getMockRajasthanDays(tripId)
      : [];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 max-w-7xl mx-auto flex flex-col gap-4">
      {/* Pending Proposal Callout Banner if AI proposal is ready */}
      {activeProposal && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-primary-fixed p-4 text-on-primary-fixed shadow-xs">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[24px] text-primary shrink-0">
              auto_awesome
            </span>
            <div>
              <span className="text-sm font-bold block">
                AI proposal generated and ready for review!
              </span>
              <p className="text-xs text-on-primary-fixed/80">
                {activeProposal.summary || "Review proposed days, route topology, and price evidence tiers."}
              </p>
            </div>
          </div>
          <Link
            href={`/trips/${tripId}/review/${activeProposal.id}` as Route}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold shrink-0 shadow-xs hover:bg-primary-container transition-colors"
          >
            Review Proposal
          </Link>
        </div>
      )}

      {/* Real-time Severe Weather Alert Banner */}
      <SevereWeatherBanner
        destination={tripDestination}
        tripId={tripId}
      />

      {/* 5-Day Weather Forecast & Preparation Widget */}
      <TripWeatherWidget
        tripId={tripId}
        tripTitle={tripTitle}
        destination={tripDestination}
        startDate={trip.start_date}
        endDate={trip.end_date}
      />

      {/* Main Itinerary Client View (Days Selector + 60/40 Split + Vector Map) */}
      <ItineraryClientView
        tripId={tripId}
        tripTitle={tripTitle}
        destination={tripDestination}
        dbDays={resolvedDays}
      />
    </div>
  );
}
