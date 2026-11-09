import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { StitchSidebar } from "@/components/layout/stitch-sidebar";
import { StitchHeader } from "@/components/layout/stitch-header";
import { PageTransition } from "@/components/motion/page-transition";

export const metadata: Metadata = {
  title: "WanderWay — Material 3 Travel Companion",
  description: "Grounded travel itineraries, budget intelligence, and live trip vault.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Find user's profile and latest trip if signed in
  let profile: { full_name: string | null; avatar_url: string | null } | null = null;
  let latestTrip: { id: string; title: string; start_date: string | null; end_date: string | null } | null = null;

  if (user) {
    const [profileRes, tripRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("trips")
        .select("id, title, start_date, end_date")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    profile = profileRes.data;
    latestTrip = tripRes.data;
  }

  const datesSubtitle = latestTrip?.start_date && latestTrip?.end_date
    ? `${latestTrip.title} • ${new Date(latestTrip.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(latestTrip.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : latestTrip?.title
    ? `${latestTrip.title} • Active Journey`
    : "WanderWay • Grounded Travel Companion";

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface antialiased flex flex-col">
      <StitchSidebar
        currentTripTitle={latestTrip?.title || "Plan a Journey"}
        activeTripId={latestTrip?.id}
      />
      <div className="pl-0 lg:pl-72 flex flex-col min-h-screen w-full">
        <StitchHeader
          tripDatesSubtitle={datesSubtitle}
          userName={profile?.full_name || (user?.email ? user.email.split("@")[0] : "Traveler")}
          userAvatar={profile?.avatar_url || undefined}
          userEmail={user?.email || ""}
        />
        {!user && (
          <div className="bg-primary/10 border-b border-primary/20 px-4 sm:px-6 lg:px-8 py-2.5 text-xs text-primary flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">info</span>
              <span>Sign in to save your itineraries, track expenses, and access the document vault offline.</span>
            </div>
            <a href="/login" className="font-semibold underline hover:text-primary-container">
              Sign in to sync your trips →
            </a>
          </div>
        )}
        <main id="main" className="pt-16 min-h-screen bg-surface w-full">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
