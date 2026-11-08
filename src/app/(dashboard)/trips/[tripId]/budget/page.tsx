import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StitchBudgetView } from "@/components/budget/stitch-budget-view";

export const metadata: Metadata = {
  title: "Budget Intelligence — WanderWay",
  description:
    "Deterministic budget calculations, price evidence tiers, and multi-currency expense ledger.",
};

export default async function TripBudgetPage(props: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch trip if signed in
  let trip = null;
  let lineItems = null;

  if (user) {
    const { data: tripData } = await supabase
      .from("trips")
      .select("id, title, budget_minor_units, budget_currency, budget_basis")
      .eq("id", tripId)
      .maybeSingle();
    trip = tripData;

    if (trip) {
      const { data: itemsData } = await supabase
        .from("budget_line_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });
      lineItems = itemsData;
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
    <StitchBudgetView
      tripTitle={trip?.title || "Kyoto & Tokyo Autumn Journey 2025"}
      budgetLimitMinorUnits={trip?.budget_minor_units}
      budgetCurrency={trip?.budget_currency || "INR"}
      budgetBasis={trip?.budget_basis || "total"}
      dbLineItems={lineItems || []}
    />
  );
}
