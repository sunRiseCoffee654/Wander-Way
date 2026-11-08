import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { StitchBudgetView } from "@/components/budget/stitch-budget-view";

export const metadata: Metadata = {
  title: "Budget Intelligence — WanderWay",
  description:
    "Deterministic budget calculations, price evidence tiers, and multi-currency expense ledger.",
};

export default async function GlobalBudgetPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's active/latest trip if signed in
  let trip = null;
  if (user) {
    const { data } = await supabase
      .from("trips")
      .select("id, title, budget_minor_units, budget_currency, budget_basis")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    trip = data;
  }

  // Get line items if trip exists
  let lineItems = null;
  if (trip?.id) {
    const { data } = await supabase
      .from("budget_line_items")
      .select("*")
      .eq("trip_id", trip.id)
      .order("created_at", { ascending: true });
    lineItems = data;
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
