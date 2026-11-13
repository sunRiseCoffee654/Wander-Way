import { createClient } from "@/lib/supabase/server";
import { GlobalTripProgressBar } from "@/components/trips/global-trip-progress-bar";
import { getMockRajasthanDays } from "@/lib/itinerary/showcase-days";
import {
  getMockRajasthanBudgetLineItems,
  getMockRajasthanTripBudget,
} from "@/lib/budget/showcase-budget";
import { buildTripReadinessFromWorkspace } from "@/lib/trips/readiness";

export default async function TripWorkspaceLayout(props: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let trip: {
    id: string;
    title: string | null;
    destination: string | null;
    budget_minor_units: number | null;
  } | null = null;

  if (user) {
    const { data } = await supabase
      .from("trips")
      .select("id, title, destination, budget_minor_units")
      .eq("id", tripId)
      .maybeSingle();
    trip = data;
  }

  const isMockRoute = tripId.startsWith("mock-");
  if (!trip && isMockRoute) {
    const mockCfg = getMockRajasthanTripBudget(tripId);
    trip = {
      id: mockCfg.id,
      title: mockCfg.title,
      destination: mockCfg.destination,
      budget_minor_units: mockCfg.budget_minor_units,
    };
  }

  // Allow child pages to render their own notFound() cleanly when trip doesn't exist
  if (!trip) {
    return <>{props.children}</>;
  }

  let days: Array<{ id?: string; itinerary_activities?: Array<{ id?: string }> | null }> = [];
  let lineItems: Array<{
    amount_minor_units?: number | null;
    evidence_type?: string | null;
    is_paid?: boolean | null;
  }> = [];
  let documents: Array<{ category?: string | null }> = [];

  if (user) {
    const [daysRes, itemsRes, docsRes] = await Promise.all([
      supabase
        .from("itinerary_days")
        .select("id, itinerary_activities ( id )")
        .eq("trip_id", tripId),
      supabase
        .from("budget_line_items")
        .select("amount_minor_units, evidence_type, is_paid")
        .eq("trip_id", tripId),
      supabase
        .from("documents")
        .select("category")
        .eq("trip_id", tripId),
    ]);
    days = daysRes.data || [];
    lineItems = itemsRes.data || [];
    documents = docsRes.data || [];
  }

  if (isMockRoute) {
    if (days.length === 0) {
      days = getMockRajasthanDays(tripId);
    }
    if (lineItems.length === 0) {
      lineItems = getMockRajasthanBudgetLineItems(tripId);
    }
  }

  const readiness = buildTripReadinessFromWorkspace({
    days,
    budgetLimitMinorUnits: trip.budget_minor_units,
    lineItems,
    documents,
  });

  return (
    <div className="flex flex-col min-w-0 w-full">
      <GlobalTripProgressBar
        tripId={tripId}
        tripTitle={trip.title || `Trip to ${trip.destination || "Destination"}`}
        destination={trip.destination || undefined}
        readiness={readiness}
      />
      {props.children}
    </div>
  );
}
