import { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReadinessGauge } from "@/components/trips/readiness-gauge";
import { formatMinorUnits } from "@/lib/currency/service";
import type { Database } from "@/lib/types/database";

type TripActivity = { id: string; title: string; planned_time?: string | null; place_name?: string | null; duration_minutes?: number | null; is_must_see?: boolean | null };
type TripDay = { id: string; day_number: number; calendar_date?: string | null; title?: string | null; itinerary_activities?: TripActivity[] };
type TripBooking = { id: string; booking_type: string; status: string; amount_minor_units?: number | null; provider_name?: string | null };
type TripPackingItem = { id: string; item_name: string; is_packed: boolean };
type TripDocument = { id: string; title: string; category?: string | null };
type TripBudgetLineItem = { id: string; amount_minor_units?: number | null; currency?: string | null; evidence_type?: string | null; is_paid?: boolean | null };

type TripWithRelations = Database["public"]["Tables"]["trips"]["Row"] & {
  itinerary_days?: TripDay[];
  budget_line_items?: TripBudgetLineItem[];
  bookings?: TripBooking[];
  packing_items?: TripPackingItem[];
  documents?: TripDocument[];
  trip_members?: Array<{ id: string; role: string; user_id: string; profiles?: { id: string; full_name?: string | null; email?: string | null } | null }>;
};

export const metadata: Metadata = {
  title: "Trip Command Center — WanderWay",
  description: "Monitor readiness, live forecasts, packing progress, and journey timeline.",
};

const POPULAR_DESTINATIONS = [
  {
    name: "Tokyo, Japan",
    tagline: "Neon corridors, historic shrines & culinary alleys",
    theme: "Metropolis & Culture",
    icon: "temple_buddhist",
    bgClass: "from-rose-500/10 via-amber-500/5 to-transparent",
  },
  {
    name: "Paris, France",
    tagline: "Iconic museums, Seine river walks & café culture",
    theme: "Art & Architecture",
    icon: "museum",
    bgClass: "from-blue-500/10 via-indigo-500/5 to-transparent",
  },
  {
    name: "Rome, Italy",
    tagline: "Ancient Colosseum, Vatican treasures & vibrant piazzas",
    theme: "History & Dining",
    icon: "account_balance",
    bgClass: "from-amber-500/10 via-orange-500/5 to-transparent",
  },
  {
    name: "Bali, Indonesia",
    tagline: "Lush rice terraces, coastal sunsets & sacred temples",
    theme: "Nature & Retreat",
    icon: "forest",
    bgClass: "from-emerald-500/10 via-teal-500/5 to-transparent",
  },
  {
    name: "New York, USA",
    tagline: "Central Park, Broadway theaters & world-class dining",
    theme: "Urban & Skyline",
    icon: "apartment",
    bgClass: "from-purple-500/10 via-pink-500/5 to-transparent",
  },
  {
    name: "Barcelona, Spain",
    tagline: "Gaudí masterpieces, Gothic Quarter & Mediterranean coast",
    theme: "Coastal & Heritage",
    icon: "beach_access",
    bgClass: "from-sky-500/10 via-cyan-500/5 to-transparent",
  },
];

export default async function TripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let trips: TripWithRelations[] | null = null;
  if (user) {
    const { data } = await supabase
      .from("trips")
      .select(`
        *,
        trip_members (
          id,
          role,
          user_id,
          profiles ( id, full_name, email )
        ),
        itinerary_days (
          id,
          day_number,
          calendar_date,
          title,
          itinerary_activities (
            id,
            title,
            planned_time,
            place_name,
            duration_minutes,
            is_must_see
          )
        ),
        budget_line_items (
          id,
          amount_minor_units,
          currency,
          evidence_type,
          is_paid
        ),
        bookings (
          id,
          booking_type,
          status,
          amount_minor_units,
          provider_name
        ),
        packing_items (
          id,
          item_name,
          is_packed
        ),
        documents (
          id,
          title,
          category
        )
      `)
      .order("start_date", { ascending: true });
    trips = data;
  }

  // If no trips exist in the database, show the clean, production-grade onboarding command center
  if (!trips || trips.length === 0) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto flex flex-col gap-10 pb-24">
        {/* Welcome Empty State Hero */}
        <section className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-primary-fixed/20 via-surface-container to-surface-container-low border border-primary/20 p-8 sm:p-12 shadow-sm">
          <div className="max-w-3xl flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold w-fit">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span>Grounded AI Planning Engine</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-on-surface tracking-tight leading-tight">
              Where would you like to travel next?
            </h1>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              WanderWay pairs Google Gemini AI with real-world spatial verification to craft practical, grounded itineraries—without invented prices or hallucinated locations.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={"/trips/new" as Route}
                className="px-6 py-3 rounded-2xl bg-primary text-on-primary text-sm font-semibold flex items-center gap-2 shadow-md hover:bg-primary-container hover:text-on-primary-container transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Plan Your First Trip</span>
              </Link>
              <Link
                href={"/explore" as Route}
                className="px-5 py-3 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-sm font-semibold flex items-center gap-2 transition-colors border border-surface-container-highest"
              >
                <span className="material-symbols-outlined text-[18px]">explore</span>
                <span>Explore Curated Destinations</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Quick-Start Popular Destination Inspiration */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-on-surface tracking-tight">
                Popular Destination Ideas
              </h2>
              <p className="text-xs text-on-surface-variant">
                Select a destination to launch the Gemini AI itinerary generator.
              </p>
            </div>
            <Link
              href={"/explore" as Route}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {POPULAR_DESTINATIONS.map((dest) => (
              <Link
                key={dest.name}
                href={`/trips/new?destination=${encodeURIComponent(dest.name)}` as Route}
                className={`p-5 rounded-2xl bg-surface-container-low border border-surface-container-high/60 hover:border-primary/40 hover:shadow-md transition-all group flex flex-col justify-between bg-gradient-to-br ${dest.bgClass}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="size-10 rounded-xl bg-surface-container flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[22px]">{dest.icon}</span>
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                      {dest.theme}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                    {dest.name}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    {dest.tagline}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-surface-container-high/40 flex items-center justify-between text-xs font-semibold text-primary">
                  <span>Start planning</span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // Active / Most Relevant Upcoming Trip
  const activeTrip = trips[0];
  const activeTripId = activeTrip.id;
  const activeTripTitle = activeTrip.title || `Trip to ${activeTrip.destination}`;

  // Real dates calculation
  const start = activeTrip.start_date ? new Date(activeTrip.start_date) : new Date();
  const end = activeTrip.end_date ? new Date(activeTrip.end_date) : new Date();
  const datesFormatted = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const daysCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))) + 1;
  const durationFormatted = `${daysCount} Days / ${Math.max(1, daysCount - 1)} Nights`;
  const corridorFormatted = `${activeTrip.origin_location || "Home"} → ${activeTrip.destination}`;
  const travelersFormatted = `${activeTrip.traveler_count || 1} ${activeTrip.traveler_count === 1 ? "Traveler" : "Travelers"}`;

  const now = new Date();
  const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  let countdownFormatted = "Trip Active";
  if (diffDays > 0) {
    countdownFormatted = `T - ${diffDays} Days`;
  } else if (diffDays === 0) {
    countdownFormatted = "Departure Today!";
  }

  // Compute real readiness score from actual database items
  const bookings = activeTrip.bookings || [];
  const packingItems = activeTrip.packing_items || [];
  const documents = activeTrip.documents || [];
  const itineraryDays = activeTrip.itinerary_days || [];
  const budgetLineItems = activeTrip.budget_line_items || [];

  const totalActivities = itineraryDays.reduce(
    (acc: number, d: TripDay) => acc + (d.itinerary_activities?.length || 0),
    0
  );
  const confirmedBookings = bookings.filter((b: TripBooking) => b.status === "booked" || b.status === "completed").length;
  const packedItems = packingItems.filter((p: TripPackingItem) => p.is_packed).length;

  let prereqScore = 0;
  if (totalActivities > 0) prereqScore += 25;
  if (bookings.length > 0 && confirmedBookings > 0) prereqScore += 25;
  if (documents.length > 0) prereqScore += 25;
  if (packingItems.length > 0 && packedItems > 0) prereqScore += 25;
  if (prereqScore === 0 && totalActivities > 0) prereqScore = 40;

  const totalSpentMinor = budgetLineItems.reduce(
    (acc: number, item: TripBudgetLineItem) => acc + Number(item.amount_minor_units || 0),
    0
  );
  const tripLimitMinor = Number(activeTrip.budget_minor_units || 0);
  const currency = activeTrip.budget_currency || "USD";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto flex flex-col gap-8 pb-24">
      {/* Immersive Active Trip Hero */}
      <section className="relative w-full rounded-3xl overflow-hidden shadow-sm bg-surface-container-low border border-surface-container-high/60">
        <div className="w-full min-h-[300px] relative flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-r from-primary-fixed/30 via-surface-container-low to-surface-container">
          {/* Top Badges & Actions */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md border border-surface-container-highest text-on-surface text-xs font-semibold shadow-2xs">
                <span className="size-2 rounded-full bg-secondary animate-pulse" />
                {countdownFormatted}
              </span>
              <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold shadow-2xs">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                {activeTrip.destination}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/trips/${activeTripId}/itinerary` as Route}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all shadow-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">route</span>
                <span>Open Itinerary</span>
              </Link>
              <Link
                href={"/trips/new" as Route}
                className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-all border border-surface-container-highest"
                title="Plan New Trip"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </Link>
            </div>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 mt-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 mb-2 text-xs uppercase tracking-wider text-primary font-semibold">
                <span>{datesFormatted}</span>
                <span>•</span>
                <span>{durationFormatted}</span>
                <span>•</span>
                <span>{corridorFormatted}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-on-surface leading-tight tracking-tight">
                {activeTripTitle}
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-2 flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">group</span>
                  {travelersFormatted}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                  {itineraryDays.length} Days Scheduled
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">explore</span>
                  {totalActivities} Activities
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Column Command Grid: Readiness Score & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trip Readiness Score Widget */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 shadow-2xs border border-surface-container-high/40 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl text-on-surface font-semibold tracking-tight">
                    Trip Readiness Score
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
                    {prereqScore}% Prepared
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Calculated dynamically from confirmed reservations, vault documents, and packing progress.
                </p>
              </div>
              <ReadinessGauge score={prereqScore} />
            </div>

            {/* Checklist Items */}
            <div className="space-y-2.5 mt-2">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low">
                <div className="flex items-center gap-3">
                  <span className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    totalActivities > 0 ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container-high text-on-surface-variant"
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {totalActivities > 0 ? "check" : "schedule"}
                    </span>
                  </span>
                  <div>
                    <span className="text-sm font-semibold text-on-surface block">
                      Itinerary Planning
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {totalActivities > 0 ? `${totalActivities} stops scheduled across ${itineraryDays.length} days` : "No stops added yet"}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/trips/${activeTripId}/itinerary` as Route}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {totalActivities > 0 ? "View Itinerary" : "+ Add Stops"}
                </Link>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low">
                <div className="flex items-center gap-3">
                  <span className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    confirmedBookings > 0 ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container-high text-on-surface-variant"
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {confirmedBookings > 0 ? "check" : "confirmation_number"}
                    </span>
                  </span>
                  <div>
                    <span className="text-sm font-semibold text-on-surface block">
                      Bookings &amp; Tickets
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {bookings.length > 0 ? `${confirmedBookings} of ${bookings.length} reservations confirmed` : "No reservations recorded"}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/trips/${activeTripId}/bookings` as Route}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {bookings.length > 0 ? "Manage Bookings" : "+ Add Booking"}
                </Link>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low">
                <div className="flex items-center gap-3">
                  <span className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    documents.length > 0 ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container-high text-on-surface-variant"
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {documents.length > 0 ? "check" : "folder"}
                    </span>
                  </span>
                  <div>
                    <span className="text-sm font-semibold text-on-surface block">
                      Document Vault
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {documents.length > 0 ? `${documents.length} encrypted passes &amp; vouchers stored` : "No passes uploaded"}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/trips/${activeTripId}/vault` as Route}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {documents.length > 0 ? "Open Vault" : "+ Upload Document"}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Hub Navigation Cards (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <Link
            href={`/trips/${activeTripId}/itinerary` as Route}
            className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 hover:border-primary/40 hover:shadow-sm transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
              </span>
              <div>
                <span className="text-sm font-semibold text-on-surface block">Interactive Itinerary</span>
                <span className="text-xs text-on-surface-variant">Edit stops, duration &amp; times</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-sm text-primary">arrow_forward</span>
          </Link>

          <Link
            href={`/trips/${activeTripId}/map` as Route}
            className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 hover:border-primary/40 hover:shadow-sm transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">map</span>
              </span>
              <div>
                <span className="text-sm font-semibold text-on-surface block">Fullscreen Route Map</span>
                <span className="text-xs text-on-surface-variant">Vector waypoints &amp; transit legs</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-sm text-primary">arrow_forward</span>
          </Link>

          <Link
            href={`/trips/${activeTripId}/budget` as Route}
            className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 hover:border-primary/40 hover:shadow-sm transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">payments</span>
              </span>
              <div>
                <span className="text-sm font-semibold text-on-surface block">Budget Intelligence</span>
                <span className="text-xs text-on-surface-variant">Expenses &amp; multi-member splits</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-sm text-primary">arrow_forward</span>
          </Link>

          <Link
            href={`/trips/${activeTripId}/intelligence` as Route}
            className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 hover:border-primary/40 hover:shadow-sm transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">radar</span>
              </span>
              <div>
                <span className="text-sm font-semibold text-on-surface block">Live Travel Intel</span>
                <span className="text-xs text-on-surface-variant">Weather radar &amp; consular alerts</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-sm text-primary">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* 4-Card Key Real Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Budget Health Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-2xs border border-surface-container-high/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                Budget Health
              </span>
              <span className="material-symbols-outlined text-primary text-[20px]">account_balance_wallet</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-xl text-on-surface font-bold">
                {formatMinorUnits(totalSpentMinor, currency)}
              </span>
              {tripLimitMinor > 0 && (
                <span className="text-xs text-on-surface-variant">
                  / {formatMinorUnits(tripLimitMinor, currency)}
                </span>
              )}
            </div>
            <span className="text-xs text-on-surface-variant">
              {budgetLineItems.length} expenses recorded
            </span>
          </div>
          <Link
            href={`/trips/${activeTripId}/budget` as Route}
            className="mt-3 pt-2 text-xs font-semibold text-primary hover:underline border-t border-surface-container-high/40 flex items-center justify-between"
          >
            <span>Inspect Budget</span>
            <span>→</span>
          </Link>
        </div>

        {/* 2. Reservations Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-2xs border border-surface-container-high/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                Reservations
              </span>
              <span className="material-symbols-outlined text-secondary text-[20px]">confirmation_number</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-xl text-on-surface font-bold">{bookings.length} Bookings</span>
            </div>
            <span className="text-xs text-on-surface-variant">
              {confirmedBookings} confirmed
            </span>
          </div>
          <Link
            href={`/trips/${activeTripId}/bookings` as Route}
            className="mt-3 pt-2 text-xs font-semibold text-primary hover:underline border-t border-surface-container-high/40 flex items-center justify-between"
          >
            <span>Manage Bookings</span>
            <span>→</span>
          </Link>
        </div>

        {/* 3. Document Vault Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-2xs border border-surface-container-high/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                Document Vault
              </span>
              <span className="material-symbols-outlined text-tertiary text-[20px]">verified</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-xl text-on-surface font-bold">{documents.length} Files</span>
            </div>
            <span className="text-xs text-on-surface-variant">
              Offline encrypted sync
            </span>
          </div>
          <Link
            href={`/trips/${activeTripId}/vault` as Route}
            className="mt-3 pt-2 text-xs font-semibold text-primary hover:underline border-t border-surface-container-high/40 flex items-center justify-between"
          >
            <span>Open Vault</span>
            <span>→</span>
          </Link>
        </div>

        {/* 4. Packing Assistant Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-2xs border border-surface-container-high/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                Smart Packing
              </span>
              <span className="material-symbols-outlined text-primary text-[20px]">backpack</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-xl text-on-surface font-bold">{packedItems} / {packingItems.length}</span>
            </div>
            <span className="text-xs text-on-surface-variant">
              {packingItems.length > 0 ? `${Math.round((packedItems / packingItems.length) * 100)}% Packed` : "Checklist ready"}
            </span>
          </div>
          <Link
            href={`/trips/${activeTripId}/packing` as Route}
            className="mt-3 pt-2 text-xs font-semibold text-primary hover:underline border-t border-surface-container-high/40 flex items-center justify-between"
          >
            <span>Open Checklist</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Database Trips Section */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-2xs border border-surface-container-high/40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl text-on-surface font-semibold tracking-tight">
              All Saved Itineraries ({trips.length})
            </h2>
            <p className="text-xs text-on-surface-variant">
              Your real journeys synced with Supabase PostgreSQL and offline PWA.
            </p>
          </div>
          <Link
            href={"/trips/new" as Route}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-primary-container hover:text-on-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Plan New Trip</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((t) => (
            <Link
              key={t.id}
              href={`/trips/${t.id}` as Route}
              className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all group flex flex-col justify-between border border-surface-container-high/40"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                    {t.trip_state || "Active"}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-on-surface group-hover:text-primary transition-colors">
                  {t.title}
                </h3>
                {t.destination && (
                  <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">
                    {t.destination}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-2 flex items-center justify-between border-t border-surface-container-high/40 text-xs text-primary font-medium">
                <span>Open Workspace</span>
                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
