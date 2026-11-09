import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TripWizard } from "@/components/wizard/trip-wizard";

export const metadata: Metadata = {
  title: "New trip — WanderWay",
  description: "Plan your trip with AI assistance or create a manual itinerary.",
};

export default async function NewTripPage(props: {
  searchParams?: Promise<{
    dest?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    party?: string;
    budget?: string;
  }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto w-full max-w-app px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <TripWizard
        userId={user?.id || "demo-traveler"}
        initialDestination={searchParams.dest || searchParams.destination}
        initialStartDate={searchParams.startDate}
        initialEndDate={searchParams.endDate}
        initialParty={searchParams.party}
        initialBudget={searchParams.budget}
      />
    </div>
  );
}
