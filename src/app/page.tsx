import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { StitchHomeLauncher } from "@/components/home/stitch-home-launcher";

export const metadata: Metadata = {
  title: "WanderWay — Home & Trip Planning Launcher",
  description:
    "Discover places, plan with confidence, and travel with clarity. Grounded AI travel planner and companion.",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  let dbTrips = null;

  if (user) {
    const [profileRes, tripsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("trips")
        .select("id, title, destination, start_date, end_date, traveler_count, status:trip_state")
        .order("created_at", { ascending: false }),
    ]);

    profile = profileRes.data;
    dbTrips = tripsRes.data;
  }

  return (
    <StitchHomeLauncher
      userEmail={user?.email || null}
      userName={profile?.full_name || (user?.email ? user.email.split("@")[0] : "Elena Rostova")}
      userAvatar={profile?.avatar_url || undefined}
      dbTrips={dbTrips}
    />
  );
}
