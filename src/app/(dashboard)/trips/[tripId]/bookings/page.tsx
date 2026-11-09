import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBookingsAction } from "@/lib/bookings/actions";
import { BookingsClientView } from "@/components/bookings/bookings-client-view";

export const metadata: Metadata = {
  title: "Reservations & Bookings Tracker — WanderWay",
  description:
    "Track external flight reservations, hotel vouchers, train passes, and tour bookings with status funnels and expense analytics.",
};

export default async function TripBookingsPage(props: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let trip: { id: string; title: string; destination: string; base_currency?: string } | null = null;

  if (user) {
    const { data: tripData } = await supabase
      .from("trips")
      .select("id, title, destination, base_currency")
      .eq("id", tripId)
      .maybeSingle();
    trip = tripData;
  }

  // If trip not found in DB, return 404
  if (!trip) {
    notFound();
  }

  // Load bookings for trip
  const { bookings } = await getBookingsAction(tripId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <BookingsClientView
        tripId={tripId}
        tripTitle={trip.title || `Trip to ${trip.destination}`}
        initialBookings={bookings}
        defaultCurrency={trip.base_currency || "USD"}
      />
    </div>
  );
}
