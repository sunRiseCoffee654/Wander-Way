import { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReadinessGauge } from "@/components/trips/readiness-gauge";

export const metadata: Metadata = {
  title: "Trip Command Center — WanderWay",
  description: "Monitor readiness, live forecasts, packing progress, and journey timeline.",
};

export default async function TripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let trips = null;
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
        trip_proposals (
          id,
          status,
          stage
        )
      `)
      .order("created_at", { ascending: false });
    trips = data;
  }

  const hasDbTrips = Boolean(trips && trips.length > 0);
  const activeTrip = trips?.[0];
  const activeTripId = activeTrip?.id || "kyoto-autumn-2025";
  const activeTripTitle = activeTrip?.title || "Kyoto & Tokyo Autumn Journey 2025";

  let datesFormatted = "Oct 14 – Oct 24, 2025";
  let durationFormatted = "10 Days / 9 Nights";
  let corridorFormatted = "San Francisco (SFO) → Japan";
  let travelersFormatted = "2 Adults";
  let countdownFormatted = "T - 18 Days : 14 Hrs";
  let badgeSeason = "Autumn Season 2025";

  if (activeTrip?.start_date && activeTrip?.end_date) {
    const start = new Date(activeTrip.start_date);
    const end = new Date(activeTrip.end_date);
    datesFormatted = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))) + 1;
    durationFormatted = `${days} Days / ${Math.max(1, days - 1)} Nights`;
    corridorFormatted = `${activeTrip.origin_location || "Home Base"} → ${activeTrip.destination}`;
    travelersFormatted = `${activeTrip.traveler_count || 1} ${activeTrip.traveler_count === 1 ? "Traveler" : "Travelers"}`;
    const now = new Date();
    const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      countdownFormatted = `T - ${diffDays} Days`;
    } else if (diffDays === 0) {
      countdownFormatted = "Departure Today!";
    } else {
      countdownFormatted = "Trip Active";
    }
    badgeSeason = `${activeTrip.destination} Journey`;
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto flex flex-col gap-8 pb-24">
      {/* Immersive Active Trip Hero */}
      <section className="relative w-full rounded-3xl overflow-hidden shadow-xl bg-surface-container-low">
        <div
          className="bg-cover bg-center w-full min-h-[340px] relative flex flex-col justify-between p-6 sm:p-8"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDcA9ZjWgT9HlNMwRocwp6GfULkuuXf4CLkqnuy6MYzKSVaapK2vhNCm3E-gVErWJd-LD9JV_gThAzCKaEiYhA7ANAGCx6o95N5BQPAG7hf7Ejaj7z9LAWU352xkXpzh86FeXxtVm8WYoK-HCm2X3c-lcQk6khAf3QoFgsWpurnDsXm_ng9Ncq8aWYShVAT6njD_z-FiSFaYHMzR_mqLUMMZdNP6tYvBcLSNT0mJi6P')`,
          }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface via-inverse-surface/60 to-transparent" />

          {/* Top Badges & Actions */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border border-white/40 dark:border-white/15 text-on-surface text-xs font-semibold shadow-md">
                <span className="size-2 rounded-full bg-secondary animate-pulse" />
                {countdownFormatted.includes("T -") ? `Upcoming • Departs in ${countdownFormatted.replace("T - ", "")}` : countdownFormatted}
              </span>
              <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-tertiary-fixed/90 backdrop-blur-xl border border-white/20 text-on-tertiary-fixed text-xs font-semibold shadow-md">
                <span className="material-symbols-outlined text-[16px]">
                  verified
                </span>
                {badgeSeason}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/trips/${activeTripId}` as Route}
                className="p-2.5 rounded-full bg-white/75 dark:bg-stone-900/75 backdrop-blur-xl border border-white/40 dark:border-white/15 text-on-surface hover:bg-white/95 dark:hover:bg-stone-800 transition-all shadow-md"
                title="View Itinerary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  route
                </span>
              </Link>
              <Link
                href={"/trips/new" as Route}
                className="p-2.5 rounded-full bg-white/75 dark:bg-stone-900/75 backdrop-blur-xl border border-white/40 dark:border-white/15 text-on-surface hover:bg-white/95 dark:hover:bg-stone-800 transition-all shadow-md"
                title="Plan New Trip"
              >
                <span className="material-symbols-outlined text-[20px]">
                  add
                </span>
              </Link>
            </div>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 mt-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl text-inverse-on-surface">
              <div className="flex flex-wrap items-center gap-2 mb-2 text-xs uppercase tracking-wider text-secondary-fixed font-semibold">
                <span>{datesFormatted}</span>
                <span>•</span>
                <span>{durationFormatted}</span>
                <span>•</span>
                <span>{corridorFormatted}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-surface-container-lowest leading-tight tracking-tight">
                {activeTripTitle}
              </h1>
              <p className="text-xs sm:text-sm text-surface-variant/90 mt-2 flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">
                    group
                  </span>
                  {travelersFormatted}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">
                    flight_takeoff
                  </span>
                  Direct Transits
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">
                    hotel
                  </span>
                  Curated Stays
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/85 dark:bg-stone-900/85 backdrop-blur-xl border border-white/40 dark:border-white/15 px-4 py-3 rounded-2xl shadow-xl self-start md:self-auto text-on-surface">
              <div className="size-10 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                <span className="material-symbols-outlined text-[24px]">
                  luggage
                </span>
              </div>
              <div>
                <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                  Flight Countdown
                </div>
                <div className="text-base text-primary font-bold">
                  {countdownFormatted}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Column Command Grid: Readiness Score & AI Companion Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trip Readiness Score Widget (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 shadow-2xs border border-surface-container-high/40 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl text-on-surface font-semibold tracking-tight">
                    Trip Readiness Score
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-xs font-semibold">
                    85% Ready
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  3 of 4 core prerequisites verified and vault-synced.
                </p>
              </div>

              {/* Radial Gauge with GSAP Counter */}
              <ReadinessGauge score={85} />
            </div>

            {/* Checklist Items */}
            <div className="space-y-2.5 mt-2">
              {/* Item 1 */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low transition-all hover:bg-surface-container">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
                    <span className="material-symbols-outlined text-[18px]">
                      done
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-on-surface block">
                      Flights Booked
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      SFO → HND (JL 001) • NRT → SFO (JL 002)
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface-container-highest text-tertiary">
                  Confirmed
                </span>
              </div>

              {/* Item 2 */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low transition-all hover:bg-surface-container">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
                    <span className="material-symbols-outlined text-[18px]">
                      done
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-on-surface block">
                      Stays Reserved
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      3 of 3 accommodations confirmed (Kyoto Ryokan & Shinjuku)
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface-container-highest text-tertiary">
                  Confirmed
                </span>
              </div>

              {/* Item 3 */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low transition-all hover:bg-surface-container">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
                    <span className="material-symbols-outlined text-[18px]">
                      security
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-on-surface block">
                      Travel Insurance
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      Allianz Global Protect • Policy #ALZ-94812
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed">
                  In Vault
                </span>
              </div>

              {/* Item 4 */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary-fixed/40 transition-all hover:bg-secondary-fixed/60">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                    <span className="material-symbols-outlined text-[18px]">
                      priority_high
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-on-secondary-fixed block">
                      Day 4 Arashiyama Tea Ceremony
                    </span>
                    <span className="text-xs text-on-secondary-container">
                      Slot unreserved • Only 4 morning spots remain
                    </span>
                  </div>
                </div>
                <Link
                  href={`/trips/${activeTripId}` as Route}
                  className="px-3 py-1 rounded-full bg-secondary text-on-secondary text-xs font-semibold shadow-2xs hover:opacity-95 transition-all"
                >
                  Reserve Now
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 flex items-center justify-between border-t border-surface-container-high/40">
            <span className="text-[11px] text-on-surface-variant">
              Last automated readiness scan 20 mins ago
            </span>
            <Link
              href={`/trips/${activeTripId}/vault` as Route}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
            >
              <span>View full vault checklist</span>
              <span className="material-symbols-outlined text-[16px]">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>

        {/* AI Travel Companion Quick Widget (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-low rounded-3xl p-6 shadow-2xs border border-surface-container-high/40 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-12 -top-12 size-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/favicon.png"
                    alt="WanderWay"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <span className="text-base font-semibold text-on-surface block leading-tight">
                    WanderWay Companion
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Live trip concierge • Context aware
                  </span>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-surface-container-lowest text-primary font-semibold shadow-xs">
                AI Active
              </span>
            </div>

            <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
              Ask questions, optimize schedules, or pull up hyper-local transit tips for your
              route.
            </p>

            <div className="flex flex-col gap-2 mb-4">
              {[
                {
                  icon: "train",
                  text: "What's our transit time from Kyoto to Tokyo?",
                },
                {
                  icon: "confirmation_number",
                  text: "Do we need advance tickets for TeamLab Planets?",
                },
                {
                  icon: "umbrella",
                  text: "Autumn foliage peak dates along Philosophers Path?",
                },
              ].map((chip) => (
                <Link
                  key={chip.text}
                  href={`/trips/${activeTripId}` as Route}
                  className="group text-left p-3 rounded-2xl bg-surface-container-lowest hover:bg-primary hover:text-on-primary transition-all duration-200 shadow-2xs flex items-center justify-between"
                >
                  <span className="text-xs text-on-surface group-hover:text-on-primary transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary group-hover:text-on-primary">
                      {chip.icon}
                    </span>
                    {chip.text}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-on-primary">
                    arrow_forward
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="relative mt-2">
            <input
              type="text"
              placeholder="Ask Companion about tickets, trains, dining..."
              className="w-full bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant text-xs pl-4 pr-12 py-3 rounded-full shadow-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              className="absolute right-1.5 top-1.5 size-8 rounded-full bg-primary text-on-primary flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-xs"
              aria-label="Send query"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_upward
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Card Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Budget Health Card */}
        <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-2xs border border-surface-container-high/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                Budget Health
              </span>
              <div className="size-8 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">
                  account_balance_wallet
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl text-on-surface font-bold">
                $4,850
              </span>
              <span className="text-xs text-on-surface-variant">/ $6,200 total</span>
            </div>
            <div className="flex items-center gap-1.5 mb-3 text-xs">
              <span className="font-semibold text-tertiary">78% Allocated</span>
              <span className="text-on-surface-variant">• $1,350 cushion</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden flex mb-3">
              <div className="bg-primary h-full" style={{ width: "58%" }} />
              <div className="bg-secondary h-full" style={{ width: "20%" }} />
            </div>
          </div>
          <Link
            href={`/trips/${activeTripId}/budget` as Route}
            className="pt-2 flex items-center justify-between text-xs text-on-surface-variant border-t border-surface-container-high/40 hover:text-primary transition-colors"
          >
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary" />
              Live Quotes ($3.6k)
            </span>
            <span className="flex items-center gap-1 font-semibold text-primary">
              Inspect →
            </span>
          </Link>
        </div>

        {/* 2. Live Weather Snapshot Card */}
        <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-2xs border border-surface-container-high/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                Live Forecast
              </span>
              <div className="size-8 rounded-xl bg-surface-container-high flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px]">
                  wb_sunny
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div className="p-2.5 rounded-2xl bg-surface-container-low">
                <span className="text-[11px] text-on-surface-variant font-medium block">
                  Kyoto
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-bold text-on-surface">19°C</span>
                  <span className="material-symbols-outlined text-secondary text-[16px]">
                    sunny
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant block">
                  Clear skies
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-surface-container-low">
                <span className="text-[11px] text-on-surface-variant font-medium block">
                  Tokyo
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-bold text-on-surface">21°C</span>
                  <span className="material-symbols-outlined text-outline text-[16px]">
                    partly_cloudy_day
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant block">
                  Partly cloudy
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-on-surface-variant pt-2 border-t border-surface-container-high/40">
            <span className="flex items-center gap-1 text-tertiary font-semibold">
              <span className="material-symbols-outlined text-[14px]">
                check_circle
              </span>
              JMA Verified
            </span>
            <span>20m ago</span>
          </div>
        </div>

        {/* 3. Travel Group Card */}
        <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-2xs border border-surface-container-high/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                Travel Group
              </span>
              <button
                type="button"
                className="size-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center hover:opacity-90 transition-transform active:scale-90"
                title="Invite Companion"
              >
                <span className="material-symbols-outlined text-[18px]">
                  person_add
                </span>
              </button>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xl font-bold text-on-surface">2 Travelers</span>
              <span className="text-xs text-tertiary font-semibold">All Synced</span>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center text-[10px] font-bold">
                    ER
                  </div>
                  <span className="text-xs font-semibold text-on-surface">
                    Elena R.
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                  Owner
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center text-[10px] font-bold">
                    MT
                  </div>
                  <span className="text-xs font-semibold text-on-surface">
                    Marcus T.
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                  Member
                </span>
              </div>
            </div>
          </div>
          <Link
            href={`/profile` as Route}
            className="w-full py-1.5 rounded-full bg-surface-container-high text-primary hover:bg-surface-container-highest transition-colors text-xs font-semibold text-center block"
          >
            + Manage Group
          </Link>
        </div>

        {/* 4. Packing Progress Card */}
        <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-2xs border border-surface-container-high/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                Packing Progress
              </span>
              <div className="size-8 rounded-xl bg-surface-container-high flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[20px]">
                  check_box
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-on-surface">28 / 36</span>
              <span className="text-xs text-on-surface-variant">items packed</span>
            </div>
            <div className="flex items-center gap-1.5 mb-3 text-xs">
              <span className="font-semibold text-tertiary">77% Complete</span>
              <span className="text-on-surface-variant">• 8 remaining</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden mb-3">
              <div
                className="bg-tertiary h-full rounded-full transition-all duration-500"
                style={{ width: "77%" }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-on-surface-variant pt-2 border-t border-surface-container-high/40">
            <span className="flex items-center gap-1 text-[11px]">
              <span className="material-symbols-outlined text-[14px] text-secondary">
                backpack
              </span>
              Passports ready
            </span>
            <Link
              href={`/trips/${activeTripId}/vault` as Route}
              className="text-primary hover:underline font-semibold"
            >
              Checklist →
            </Link>
          </div>
        </div>
      </div>

      {/* Day-by-Day Journey Horizon Preview Strip */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-2xs border border-surface-container-high/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl text-on-surface font-semibold tracking-tight">
                Journey Horizon
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed">
                10 Days Route
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Quick jump to daily schedules, transport milestones, and dinner bookings.
            </p>
          </div>

          <Link
            href={`/trips/${activeTripId}` as Route}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Open Itinerary Editor</span>
            <span className="material-symbols-outlined text-[16px]">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* Scrollable Days Strip */}
        <div className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1">
          {[
            {
              day: "DAY 01",
              date: "Oct 14",
              title: "Arrival at Haneda",
              desc: "SFO Flight JL 001 touch down. Express transit to Shinjuku.",
              badge: "Arrival",
              icon: "flight_land",
              color: "text-tertiary",
            },
            {
              day: "DAY 02",
              date: "Oct 15",
              title: "Tokyo Modern Pulse",
              desc: "Shibuya Sky panoramic views, Harajuku & Meiji Shrine walk.",
              badge: "3 Stops",
              icon: "tour",
              color: "text-primary",
            },
            {
              day: "DAY 03",
              date: "Oct 16",
              title: "Shinkansen to Kyoto",
              desc: "Nozomi Bullet Train, Check-in at Gion Ryokan, Evening stroll.",
              badge: "Transit",
              icon: "train",
              color: "text-secondary",
            },
            {
              day: "DAY 04",
              date: "Oct 17",
              title: "Arashiyama Bamboo",
              desc: "Bamboo Grove sunrise, Tea ceremony booking missing.",
              badge: "Action req",
              icon: "warning",
              color: "text-secondary font-semibold",
              highlight: true,
            },
            {
              day: "DAY 05",
              date: "Oct 18",
              title: "Higashiyama & Fushimi",
              desc: "1,000 Vermilion Gates hike, Kiyomizu-dera temple sunset.",
              badge: "4 Stops",
              icon: "temple_buddhist",
              color: "text-primary",
            },
            {
              day: "DAY 06",
              date: "Oct 19",
              title: "Nara Deer & Todaiji",
              desc: "Day trip to Nara Park, Great Bronze Buddha, Kofuku-ji.",
              badge: "Day Trip",
              icon: "pets",
              color: "text-tertiary",
            },
          ].map((item) => (
            <Link
              key={item.day}
              href={`/trips/${activeTripId}` as Route}
              className={`min-w-[210px] shrink-0 rounded-2xl p-4 transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${
                item.highlight
                  ? "bg-secondary-fixed/30 hover:bg-secondary-fixed/50 border border-secondary/20"
                  : "bg-surface-container-low hover:bg-surface-container"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold ${item.color}`}>
                    {item.day}
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    {item.date}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-on-surface line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-4 pt-2 flex items-center justify-between border-t border-surface-container-high/40">
                <span className={`inline-flex items-center gap-1 text-[11px] ${item.color}`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {item.icon}
                  </span>
                  {item.badge}
                </span>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                  arrow_forward
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Database Trips Section */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-2xs border border-surface-container-high/40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl text-on-surface font-semibold tracking-tight">
              All Saved Itineraries ({trips?.length || 0})
            </h2>
            <p className="text-xs text-on-surface-variant">
              Your itineraries synced across database and cloud vault.
            </p>
          </div>
          <Link
            href={"/trips/new" as Route}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-primary-container hover:text-on-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">
              add
            </span>
            <span>New Trip</span>
          </Link>
        </div>

        {hasDbTrips && trips ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.map((t) => (
              <Link
                key={t.id}
                href={`/trips/${t.id}` as Route}
                className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                      {t.trip_state || "Planned"}
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
                  <span>Open workspace</span>
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-surface-container-low flex flex-col items-center justify-center text-center gap-3">
            <div className="size-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">luggage</span>
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-semibold text-on-surface">No saved itineraries yet</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Ready to embark? Generate a grounded itinerary with Gemini AI or build your own custom travel plan.
              </p>
            </div>
            <Link
              href={"/trips/new" as Route}
              className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center gap-2 shadow-2xs hover:bg-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Plan Your First Trip</span>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
