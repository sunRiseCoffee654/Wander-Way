"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { DateRangePicker } from "./date-range-picker";
import { gsap, useGSAP } from "@/lib/motion/gsap-setup";
import { motion } from "motion/react";

interface TripSummary {
  id: string;
  title: string;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  traveler_count?: number | null;
  status?: string;
}

interface StitchHomeLauncherProps {
  userEmail?: string | null;
  userName?: string | null;
  userAvatar?: string;
  dbTrips?: TripSummary[] | null;
}

export function parsePartyAndBudget(
  partyBudget: string,
  fallbackTravelers = 2,
  fallbackBudget = 75000
): { travelers: number; budget: number } {
  let currentTravelers = fallbackTravelers;
  let currentBudget = fallbackBudget;

  if (partyBudget.includes("·")) {
    const parts = partyBudget.split("·");
    if (parts[0]) {
      const pMatch = parts[0].match(/(\d+)/);
      if (pMatch) {
        const p = parseInt(pMatch[1], 10);
        if (!isNaN(p) && p > 0) currentTravelers = p;
      }
    }
    if (parts[1]) {
      const bMatch = parts[1].match(/([\d,]+)/);
      if (bMatch) {
        const b = parseInt(bMatch[1].replace(/,/g, ""), 10);
        if (!isNaN(b) && b > 0) currentBudget = b;
      }
    }
  } else if (/[|\-—–/]/.test(partyBudget)) {
    const parts = partyBudget.split(/[|\-—–/]/);
    if (parts[0]) {
      const pMatch = parts[0].match(/(\d+)/);
      if (pMatch) {
        const p = parseInt(pMatch[1], 10);
        if (!isNaN(p) && p > 0) currentTravelers = p;
      }
    }
    if (parts[1]) {
      const bMatch = parts[1].match(/([\d,]+)/);
      if (bMatch) {
        const b = parseInt(bMatch[1].replace(/,/g, ""), 10);
        if (!isNaN(b) && b > 0) currentBudget = b;
      }
    }
  } else {
    // Graceful fallback if no delimiter is used:
    // 1. If explicit currency symbol attached to a number, extract budget first
    const currencyBudgetMatch = partyBudget.match(/(?:₹|\$|€|£|¥|rs\.?|inr)\s*([\d,]+)/i);
    if (currencyBudgetMatch) {
      const b = parseInt(currencyBudgetMatch[1].replace(/,/g, ""), 10);
      if (!isNaN(b) && b > 0) currentBudget = b;
      const remainder = partyBudget.replace(currencyBudgetMatch[0], "");
      const pMatch = remainder.match(/(\d+)/);
      if (pMatch) {
        const p = parseInt(pMatch[1], 10);
        if (!isNaN(p) && p > 0) currentTravelers = p;
      }
    } else {
      // 2. Extract all numbers: first travelers, second budget (or threshold check if only one number)
      const numbers = Array.from(partyBudget.matchAll(/([\d,]+)/g))
        .map((m) => parseInt(m[1].replace(/,/g, ""), 10))
        .filter((n) => !isNaN(n) && n > 0);

      if (numbers.length >= 2) {
        currentTravelers = numbers[0];
        currentBudget = numbers[1];
      } else if (numbers.length === 1) {
        if (numbers[0] > 500) {
          currentBudget = numbers[0];
        } else {
          currentTravelers = numbers[0];
        }
      }
    }
  }

  return { travelers: currentTravelers, budget: currentBudget };
}

export function StitchHomeLauncher({
  userEmail,
  userName = "Aarav Sharma",
  userAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80",
  dbTrips,
}: StitchHomeLauncherProps) {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const [myTripsOpen, setMyTripsOpen] = useState(false);

  useGSAP(
    () => {
      gsap.from(".hero-stagger", {
        opacity: 0,
        y: 24,
        duration: 0.7,
        stagger: 0.12,
        ease: "power2.out",
      });
    },
    { scope: heroRef }
  );
  const [destination, setDestination] = useState("Jaipur & Udaipur, Rajasthan");
  const [startDate, setStartDate] = useState("2026-11-14");
  const [endDate, setEndDate] = useState("2026-11-21");
  const [travelers, setTravelers] = useState(2);
  const [budget, setBudget] = useState(75000);
  const [partyBudget, setPartyBudget] = useState("2 Travelers · ₹75,000");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Active trips from user database
  const activeTrips: TripSummary[] = dbTrips || [];

  const handleQuickPlan = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(`Calibrating verified itinerary draft for "${destination}" with realistic transit legs & budget estimates...`);

    let currentTravelers = travelers;
    let currentBudget = budget;
    const parsed = parsePartyAndBudget(partyBudget, currentTravelers, currentBudget);
    currentTravelers = parsed.travelers;
    currentBudget = parsed.budget;

    const params = new URLSearchParams();
    if (destination) params.set("dest", destination);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("party", String(currentTravelers));
    params.set("budget", String(currentBudget));

    setTimeout(() => {
      // Navigate to /trips/new with pre-filled query params
      router.push(`/trips/new?${params.toString()}` as Route);
    }, 1000);
  };

  const handleSelectJourney = (journeyTitle: string) => {
    setFeedbackMessage(`Loaded destination "${journeyTitle}". Creating verified itinerary workspace...`);
    const params = new URLSearchParams();
    params.set("dest", journeyTitle);
    params.set("budget", "75000");
    params.set("party", "2");
    setTimeout(() => {
      router.push(`/trips/new?${params.toString()}` as Route);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface antialiased flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* 1. Global Navigation Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-xl z-40 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container-high/40">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center group py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nav_logo.png"
              alt="WanderWay"
              className="h-9 w-auto max-w-[170px] object-contain group-hover:scale-105 transition-transform"
            />
          </Link>

          {/* Search bar (desktop) */}
          <div className="hidden md:flex items-center gap-2.5 w-72 lg:w-96 bg-surface-container rounded-full px-4 py-2 hover:bg-surface-container-high transition-colors focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary shadow-2xs">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places, trips, tickets..."
              className="bg-transparent w-full text-on-surface placeholder:text-on-surface-variant text-xs sm:text-sm focus:outline-none"
            />
            <span className="text-[11px] font-medium text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-md">
              ⌘K
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Nav: Explore */}
          <Link
            href="/explore"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">explore</span>
            <span>Explore</span>
          </Link>

          {/* Quick Nav: Overview Workspace */}
          <Link
            href="/trips"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">space_dashboard</span>
            <span>Workspace</span>
          </Link>

          {/* "My Trips" Dropdown Flyout Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMyTripsOpen(!myTripsOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-primary-fixed hover:bg-surface-container-high text-on-primary-fixed text-xs font-semibold transition-all shadow-xs ring-1 ring-primary/20"
            >
              <span className="material-symbols-outlined text-[20px] text-primary">
                folder_special
              </span>
              <span>My Trips</span>
              <span className="px-1.5 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold leading-none">
                {activeTrips.length}
              </span>
              <span className="material-symbols-outlined text-[18px]">
                {myTripsOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {/* Flyout Menu Dropdown */}
            {myTripsOpen && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 rounded-2xl bg-surface-container-lowest p-4 shadow-2xl border border-surface-container-high flex flex-col gap-3 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-on-surface">
                      Saved &amp; Active Trips
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      Select a trip to open its full workspace
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMyTripsOpen(false)}
                    className="p-1 text-on-surface-variant hover:text-on-surface rounded-full"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                  {activeTrips.length === 0 ? (
                    <div className="p-4 text-center text-xs text-on-surface-variant">
                      No saved trips yet. Start planning above to create your first journey.
                    </div>
                  ) : (
                    activeTrips.map((trip) => {
                    const status = trip.status || "active";
                    const isCompleted = status === "completed";
                    const isDraft = status === "draft";
                    const statusBadgeClass = isCompleted
                      ? "bg-surface-container-high text-on-surface-variant"
                      : isDraft
                        ? "bg-secondary-fixed text-on-secondary-fixed"
                        : "bg-tertiary-fixed text-on-tertiary-fixed";

                    return (
                      <Link
                        key={trip.id}
                        href={trip.id ? (`/trips/${trip.id}` as Route) : "/trips"}
                        onClick={() => setMyTripsOpen(false)}
                        className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="size-9 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold shrink-0">
                            <span className="material-symbols-outlined text-[20px]">
                              {isCompleted ? "landscape" : isDraft ? "sailing" : "luggage"}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs text-on-surface font-semibold group-hover:text-primary transition-colors truncate">
                              {trip.title}
                            </span>
                            <span className="text-[11px] text-on-surface-variant truncate">
                              {trip.start_date ? `${new Date(trip.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ` : ""}
                              {trip.traveler_count || 2} travelers
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize shrink-0 ${statusBadgeClass}`}>
                          {status}
                        </span>
                      </Link>
                    );
                  }))}
                </div>

                {/* Workspace Note */}
                <div className="p-3 rounded-xl bg-surface-container-high/60 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">
                    info
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-on-surface">
                      Trip Workspace Access
                    </span>
                    <span className="text-[10px] text-on-surface-variant leading-relaxed">
                      Selecting any trip launches the full Command Center, Day Timeline &amp; Route Legs, Budget Intelligence, and Live Vault.
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-surface-container">
                  <Link
                    href="/trips/new"
                    onClick={() => setMyTripsOpen(false)}
                    className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Plan New Trip</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Synced Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
            <span className="text-xs font-semibold">Synced</span>
          </div>

          {/* Profile & Settings Avatar */}
          <Link
            href="/profile"
            className="flex items-center pl-1 group"
            title={userEmail ? `Signed in as ${userName} (${userEmail})` : `Profile Settings (${userName})`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Profile"
              src={userAvatar}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-surface-container-high group-hover:ring-primary transition-all shadow-2xs"
            />
          </Link>
        </div>
      </header>

      {/* Main Home Content Container */}
      <main className="relative pt-20 pb-20 w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col gap-10">
        {/* Dynamic Simulation Feedback Banner */}
        {feedbackMessage && (
          <div className="w-full p-4 rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[24px] text-tertiary">
                check_circle
              </span>
              <span className="text-xs sm:text-sm font-medium">
                {feedbackMessage}
              </span>
            </div>
            <span className="text-xs bg-surface-container-lowest/80 px-3 py-1 rounded-full text-tertiary font-semibold shrink-0">
              100% Calibrated
            </span>
          </div>
        )}

        {/* 2. Immersive Hero Section with Dual Gradient Scrim */}
        <section ref={heroRef} className="relative w-full rounded-3xl overflow-hidden shadow-xl bg-surface-container-low min-h-[460px] md:min-h-[500px] flex flex-col justify-end">
          {/* Background Vista Image */}
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-1000 scale-105"
            style={{
              backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAVeWr8SgIR6rxUKNUS45wq2CbcEJ99thlJHDd2KMMUtiGtm_VmEvK0Ovmk3OOdelFEmDLXQarY4h4e9aKKwxumZN1TmjC48Drr6-KcZeaUBzK1IxK5DLxe2nr7-VlNPd1vbe4u6Yj4pe5J9X7rV4MkzN7Q1Kg0jChGFLeygufSppiSCbTE5lzRYdkRH5b_BWV9-_O05Q-uSZxI-uatgah0xcrnRZJdQ9DaGRzLKa4tyjC9XdahEts76g')`,
            }}
          />

          {/* Editorial Dual Gradient Scrims for Perfect Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/95 via-inverse-surface/60 to-primary/30 mix-blend-multiply pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface/95 via-inverse-surface/70 to-transparent pointer-events-none" />

          {/* Hero Content */}
          <div className="relative z-10 max-w-5xl px-6 sm:px-10 py-12 md:py-16 flex flex-col gap-6 text-inverse-on-surface">
            {/* Pill Badge */}
            <div className="hero-stagger inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 dark:bg-black/30 backdrop-blur-xl border border-white/25 shadow-lg self-start text-primary-fixed">
              <span className="material-symbols-outlined text-[18px]">travel_explore</span>
              <span className="text-xs font-semibold tracking-wide uppercase">
                Next-Gen Travel Engine
              </span>
            </div>

            {/* Headline */}
            <div className="flex flex-col gap-2 max-w-3xl">
              <h1 className="hero-stagger text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium text-white tracking-tight leading-[1.08]">
                Discover places.<br className="hidden sm:inline" /> Plan with confidence.<br className="hidden sm:inline" /> Travel with clarity.
              </h1>
              <p className="hero-stagger text-sm sm:text-base text-white/85 max-w-xl font-normal leading-relaxed pt-1">
                Your all-in-one companion from the first spark of wanderlust to the journey itself. Real-time routes, grounded budgets, and continuous live intel.
              </p>
            </div>

            {/* Floating Quick Trip Planner Launcher Bar */}
            <div className="hero-stagger mt-2 bg-white/80 dark:bg-stone-900/80 backdrop-blur-2xl rounded-2xl p-3 sm:p-4 shadow-2xl text-on-surface w-full max-w-4xl border border-white/40 dark:border-white/15 ring-1 ring-black/5">
              <form onSubmit={handleQuickPlan} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Where To */}
                <div className="md:col-span-4 flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group">
                  <span className="material-symbols-outlined text-primary text-[22px] group-hover:scale-110 transition-transform">
                    pin_drop
                  </span>
                  <div className="flex flex-col w-full min-w-0">
                    <label htmlFor="quick-dest-input" className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      Destination
                    </label>
                    <input
                      id="quick-dest-input"
                      type="text"
                      required
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Where do you want to go?"
                      className="bg-transparent text-on-surface text-xs sm:text-sm font-semibold focus:outline-none placeholder:text-outline truncate"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="md:col-span-3">
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={({ startDate: s, endDate: e }) => {
                      setStartDate(s);
                      setEndDate(e);
                    }}
                  />
                </div>

                {/* Party & Budget */}
                <div className="md:col-span-3 flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group">
                  <span className="material-symbols-outlined text-tertiary text-[22px] group-hover:scale-110 transition-transform">
                    group
                  </span>
                  <div className="flex flex-col w-full min-w-0">
                    <label htmlFor="quick-party-input" className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      Party &amp; Budget
                    </label>
                    <input
                      id="quick-party-input"
                      type="text"
                      value={partyBudget}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPartyBudget(val);
                        const parsed = parsePartyAndBudget(val, travelers, budget);
                        setTravelers(parsed.travelers);
                        setBudget(parsed.budget);
                      }}
                      placeholder="2 Travelers · ₹75,000"
                      className="bg-transparent text-on-surface text-xs sm:text-sm font-semibold focus:outline-none truncate"
                    />
                  </div>
                </div>

                {/* Plan Trip CTA */}
                <div className="md:col-span-2 flex items-center">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-12 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <span>Plan Trip</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </motion.button>
                </div>
              </form>

              {/* Quick Idea Chips */}
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-surface-container-high/40 text-xs text-on-surface-variant">
                <span className="text-outline flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-[16px]">bolt</span>
                  Quick ideas:
                </span>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDestination("Jaipur & Udaipur, Rajasthan")}
                  className="px-3 py-1 rounded-full bg-surface-container hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors text-[11px] font-medium cursor-pointer"
                >
                  Rajasthan Palaces
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDestination("Alleppey & Munnar, Kerala")}
                  className="px-3 py-1 rounded-full bg-surface-container hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors text-[11px] font-medium cursor-pointer"
                >
                  Kerala Backwaters
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDestination("Leh & Pangong Tso, Ladakh")}
                  className="px-3 py-1 rounded-full bg-surface-container hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors text-[11px] font-medium cursor-pointer"
                >
                  Ladakh High Passes
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDestination("Varanasi & Rishikesh, India")}
                  className="px-3 py-1 rounded-full bg-surface-container hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors text-[11px] font-medium cursor-pointer"
                >
                  Varanasi &amp; Ganga
                </motion.button>
              </div>
            </div>

            {/* Trust Highlights Pinned to Hero Bottom */}
            <div className="flex flex-wrap gap-3 pt-2 text-xs">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/35 backdrop-blur-xl border border-white/20 text-white shadow-md">
                <span className="flex items-center justify-center size-5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed">
                  <span className="material-symbols-outlined text-[13px]">verified</span>
                </span>
                <span className="font-medium">Verified Coordinates &amp; Trails</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/35 backdrop-blur-xl border border-white/20 text-white shadow-md">
                <span className="flex items-center justify-center size-5 rounded-full bg-secondary-fixed text-on-secondary-fixed">
                  <span className="material-symbols-outlined text-[13px]">account_balance_wallet</span>
                </span>
                <span className="font-medium">Deterministic Budgets</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/35 backdrop-blur-xl border border-white/20 text-white shadow-md">
                <span className="flex items-center justify-center size-5 rounded-full bg-primary-fixed text-on-primary-fixed">
                  <span className="material-symbols-outlined text-[13px]">cloud_sync</span>
                </span>
                <span className="font-medium">Live Rail &amp; Weather Intel</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Section 2: Why Travel with WanderWay (Action-focused Grid) */}
        <section className="w-full flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-primary tracking-wider uppercase">
                Built for Real Travelers
              </span>
              <h2 className="text-2xl sm:text-3xl font-medium text-on-surface tracking-tight">
                Why Travel with WanderWay
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-md leading-relaxed">
              Zero generic listicles or impossible 2-hour multi-city itineraries. Precision algorithms grounded in actual transport timetables and live field telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1 */}
            <div className="flex flex-col justify-between p-6 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all hover:-translate-y-1 shadow-xs group">
              <div className="flex flex-col gap-4">
                <div className="size-12 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[26px]">smart_toy</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-semibold text-on-surface">
                    Instant AI Itinerary, Zero Guesswork
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Multi-day schedules generated in seconds, strictly bound to verified train connections, realistic walking buffers, and opening hours.
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 flex items-center justify-between text-primary text-xs font-semibold border-t border-surface-container-high/40">
                <span className="inline-flex items-center gap-1">
                  Grounded schedules <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-primary-fixed-dim text-on-primary-fixed text-[10px]">
                  No hallucinations
                </span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="flex flex-col justify-between p-6 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all hover:-translate-y-1 shadow-xs group">
              <div className="flex flex-col gap-4">
                <div className="size-12 rounded-xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[26px]">receipt_long</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-semibold text-on-surface">
                    Transparent Budget Intelligence
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Line-item transparency with live ticket quotes, published transit fares, and realistic dining estimates. No surprise surcharges mid-trip.
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 flex items-center justify-between text-secondary text-xs font-semibold border-t border-surface-container-high/40">
                <span className="inline-flex items-center gap-1">
                  Exact cost ledger <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-fixed-dim text-on-secondary-fixed text-[10px]">
                  Live quotes
                </span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="flex flex-col justify-between p-6 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all hover:-translate-y-1 shadow-xs group">
              <div className="flex flex-col gap-4">
                <div className="size-12 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[26px]">gshield</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-semibold text-on-surface">
                    Live Intel &amp; Encrypted Vault
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Proactive alerts for IRCTC Vande Bharat delays, monsoon road advisories, and Himalayan pass alerts. Keep bookings, passes, and ID proofs offline and secure.
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 flex items-center justify-between text-tertiary text-xs font-semibold border-t border-surface-container-high/40">
                <span className="inline-flex items-center gap-1">
                  Offline ready <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed text-[10px]">
                  Sync active
                </span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="flex flex-col justify-between p-6 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all hover:-translate-y-1 shadow-xs group">
              <div className="flex flex-col gap-4">
                <div className="size-12 rounded-xl bg-surface-container-high text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[26px]">diversity_3</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-semibold text-on-surface">
                    Seamless Group Coordination
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Eliminate chaotic messaging threads. Group voting on attractions, automated multi-currency bill splitting, and instant role-based sharing.
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 flex items-center justify-between text-primary text-xs font-semibold border-t border-surface-container-high/40">
                <span className="inline-flex items-center gap-1">
                  Real-time sync <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px]">
                  Co-pilot
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Section 3: Trending Journeys Ready to Plan */}
        <section className="w-full flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-secondary tracking-wider uppercase">
                Curated Templates
              </span>
              <h2 className="text-2xl sm:text-3xl font-medium text-on-surface tracking-tight">
                Trending Journeys Ready to Plan
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/explore"
                className="px-4 py-2 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs hover:bg-primary-fixed-dim"
              >
                <span>View All 48 Journeys</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Journey 1: Royal Rajasthan */}
            <div className="flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all group border border-surface-container-high/30">
              <div className="relative h-48 w-full overflow-hidden bg-surface-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt="Amber Fort and sandstone palaces of Jaipur bathed in golden Rajasthani sunlight"
                  src="/images/destinations/jaipur.jpg"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/85 dark:bg-black/60 backdrop-blur-xl border border-white/40 dark:border-white/15 text-on-surface text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                  <span className="material-symbols-outlined text-secondary text-[14px]">done_all</span>
                  <span>Verified Route</span>
                </div>
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xl border border-white/20 text-white text-[11px] font-medium shadow-md">
                  7 Days
                </div>
              </div>
              <div className="p-5 flex flex-col justify-between flex-1 gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] font-medium">
                    <span className="material-symbols-outlined text-[16px] text-tertiary">fort</span>
                    <span>Heritage &amp; Palaces</span>
                  </div>
                  <h3 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                    Royal Rajasthan Heritage Circuit
                  </h3>
                  <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    From Jaipur&apos;s Amber Fort and Hawa Mahal to Udaipur&apos;s City Palace lakes and Rajasthani havelis.
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-between border-t border-surface-container">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-outline font-medium">Est. Budget</span>
                    <span className="text-xs font-bold text-on-surface">
                      ₹28,500 <span className="font-normal text-on-surface-variant">/person</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectJourney("Jaipur & Udaipur, Rajasthan")}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Explore
                  </button>
                </div>
              </div>
            </div>

            {/* Journey 2: Kerala Backwaters & Munnar */}
            <div className="flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all group border border-surface-container-high/30">
              <div className="relative h-48 w-full overflow-hidden bg-surface-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt="Palm-fringed Kerala backwaters and emerald tea plantations of Munnar"
                  src="/images/destinations/kerala.jpg"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/85 dark:bg-black/60 backdrop-blur-xl border border-white/40 dark:border-white/15 text-on-surface text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                  <span className="material-symbols-outlined text-secondary text-[14px]">price_check</span>
                  <span>Live Quotes Active</span>
                </div>
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xl border border-white/20 text-white text-[11px] font-medium shadow-md">
                  5 Days
                </div>
              </div>
              <div className="p-5 flex flex-col justify-between flex-1 gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] font-medium">
                    <span className="material-symbols-outlined text-[16px] text-secondary">spa</span>
                    <span>Backwaters &amp; Tea Estates</span>
                  </div>
                  <h3 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                    Kerala Backwaters &amp; Munnar
                  </h3>
                  <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    Alleppey kettuvallam houseboats, misty Munnar tea gardens, spice farms, and Kochi heritage walks.
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-between border-t border-surface-container">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-outline font-medium">Est. Budget</span>
                    <span className="text-xs font-bold text-on-surface">
                      ₹34,000 <span className="font-normal text-on-surface-variant">/person</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectJourney("Alleppey & Munnar, Kerala")}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Explore
                  </button>
                </div>
              </div>
            </div>

            {/* Journey 3: Ladakh & Leh Loop */}
            <div className="flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all group border border-surface-container-high/30">
              <div className="relative h-48 w-full overflow-hidden bg-surface-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt="High-altitude turquoise waters of Pangong Tso ringed by snowy Ladakh peaks"
                  src="/images/destinations/ladakh.jpg"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/85 dark:bg-black/60 backdrop-blur-xl border border-white/40 dark:border-white/15 text-on-surface text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                  <span className="material-symbols-outlined text-secondary text-[14px]">air</span>
                  <span>Weather Intel Ready</span>
                </div>
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xl border border-white/20 text-white text-[11px] font-medium shadow-md">
                  10 Days
                </div>
              </div>
              <div className="p-5 flex flex-col justify-between flex-1 gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] font-medium">
                    <span className="material-symbols-outlined text-[16px] text-primary">ac_unit</span>
                    <span>Himalayas &amp; High Passes</span>
                  </div>
                  <h3 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                    Ladakh &amp; Leh High-Altitude Loop
                  </h3>
                  <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    Khardung La mountain pass, Pangong Tso azure shoreline, Nubra Valley dunes, and Thiksey Monastery.
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-between border-t border-surface-container">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-outline font-medium">Est. Budget</span>
                    <span className="text-xs font-bold text-on-surface">
                      ₹42,500 <span className="font-normal text-on-surface-variant">/person</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectJourney("Leh & Pangong Tso, Ladakh")}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Explore
                  </button>
                </div>
              </div>
            </div>

            {/* Journey 4: Varanasi & Rishikesh */}
            <div className="flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all group border border-surface-container-high/30">
              <div className="relative h-48 w-full overflow-hidden bg-surface-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt="Ancient sandstone ghats glowing with evening lamps along the Ganga"
                  src="/images/destinations/varanasi.jpg"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/85 dark:bg-black/60 backdrop-blur-xl border border-white/40 dark:border-white/15 text-on-surface text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                  <span className="material-symbols-outlined text-secondary text-[14px]">star</span>
                  <span>Top Ranked</span>
                </div>
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xl border border-white/20 text-white text-[11px] font-medium shadow-md">
                  6 Days
                </div>
              </div>
              <div className="p-5 flex flex-col justify-between flex-1 gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] font-medium">
                    <span className="material-symbols-outlined text-[16px] text-secondary">temple_hindu</span>
                    <span>Ghats &amp; Himalayan Foothills</span>
                  </div>
                  <h3 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                    Varanasi &amp; Rishikesh Spiritual Trail
                  </h3>
                  <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    Sunrise boat rides on the Ganga, Dashashwamedh evening Aarti, and Rishikesh riverside retreats.
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-between border-t border-surface-container">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-outline font-medium">Est. Budget</span>
                    <span className="text-xs font-bold text-on-surface">
                      ₹19,800 <span className="font-normal text-on-surface-variant">/person</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectJourney("Varanasi & Rishikesh, India")}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Explore
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Section 4: How It Works in 3 Quick Steps */}
        <section className="w-full flex flex-col gap-8 p-6 sm:p-10 rounded-3xl bg-surface-container-low shadow-xs border border-surface-container-high/30">
          <div className="flex flex-col items-center text-center gap-2 max-w-2xl mx-auto">
            <span className="text-xs font-semibold text-primary tracking-wider uppercase">
              Frictionless Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-medium text-on-surface tracking-tight">
              How It Works in 3 Quick Steps
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              From wild dream to smooth departure in minutes. No spreadsheets, zero overlapping transport blunders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center gap-4 p-5 rounded-2xl bg-surface-container-lowest shadow-xs group">
              <div className="size-14 rounded-2xl bg-surface-container-low text-primary shadow-xs flex items-center justify-center text-xl font-bold group-hover:bg-primary group-hover:text-on-primary transition-all">
                1
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="inline-flex items-center justify-center gap-1 text-primary text-xs font-semibold">
                  <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                  <span>Dream &amp; Input</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Enter your destination, dates, travel party size, and daily travel pace (from relaxed café mornings to sunrise summits).
                </p>
              </div>
              <div className="w-full p-2.5 rounded-xl bg-surface-container text-left flex items-center gap-2.5 mt-auto">
                <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
                <div className="flex flex-col text-[11px]">
                  <span className="font-semibold text-on-surface">Pace: Balanced (3 places/day)</span>
                  <span className="text-on-surface-variant">Interests: Heritage forts, Rajasthani thali</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center gap-4 p-5 rounded-2xl bg-surface-container-lowest shadow-xs group">
              <div className="size-14 rounded-2xl bg-surface-container-low text-secondary shadow-xs flex items-center justify-center text-xl font-bold group-hover:bg-secondary group-hover:text-on-secondary transition-all">
                2
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="inline-flex items-center justify-center gap-1 text-secondary text-xs font-semibold">
                  <span className="material-symbols-outlined text-[18px]">dashboard_customize</span>
                  <span>Validate &amp; Customize</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Drag-and-drop activities on the visual timeline. The platform automatically recalibrates transfer times, walking fatigue, and total budget.
                </p>
              </div>
              <div className="w-full p-2.5 rounded-xl bg-surface-container text-left flex items-center gap-2.5 mt-auto">
                <span className="material-symbols-outlined text-secondary text-[18px]">transfer_within_a_station</span>
                <div className="flex flex-col text-[11px]">
                  <span className="font-semibold text-on-surface">Auto-computed Vande Bharat leg</span>
                  <span className="text-on-surface-variant">4h 15m · ₹1,850 IRCTC verified fare</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center gap-4 p-5 rounded-2xl bg-surface-container-lowest shadow-xs group">
              <div className="size-14 rounded-2xl bg-surface-container-low text-tertiary shadow-xs flex items-center justify-center text-xl font-bold group-hover:bg-tertiary group-hover:text-on-tertiary transition-all">
                3
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="inline-flex items-center justify-center gap-1 text-tertiary text-xs font-semibold">
                  <span className="material-symbols-outlined text-[18px]">airplane_ticket</span>
                  <span>Travel with Confidence</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Open full offline guides with GPS breadcrumbs on the road. Enjoy live push updates on gate changes, delays, and currency trends.
                </p>
              </div>
              <div className="w-full p-2.5 rounded-xl bg-surface-container text-left flex items-center gap-2.5 mt-auto">
                <span className="material-symbols-outlined text-tertiary text-[18px]">wifi_off</span>
                <div className="flex flex-col text-[11px]">
                  <span className="font-semibold text-on-surface">Offline Vault Cached</span>
                  <span className="text-on-surface-variant">Full vouchers + turn-by-turn saved</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Section 5: Telemetry Feed & Spatial Verification */}
        <section className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Telemetry Card */}
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-surface-container-lowest shadow-xs border border-surface-container-high/30 flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-tertiary animate-pulse" />
                  <span className="text-sm font-semibold text-on-surface">
                    Live Route Telemetry Feed
                  </span>
                </div>
                <span className="text-[10px] font-semibold bg-surface-container px-2.5 py-1 rounded-full text-on-surface-variant">
                  Real-time Stream
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                WanderWay&apos;s intelligence engine constantly evaluates connections, strikes, and local weather alerts to safeguard your plans before you even step foot outside.
              </p>

              <div className="flex flex-col gap-2.5 mt-1">
                <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[22px]">train</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-on-surface">
                        Vande Bharat Express (New Delhi ⇄ Jaipur)
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        Operating on schedule · 3 min platform transfer
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-semibold">
                    Clear
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-[22px]">foggy</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-on-surface">
                        Khardung La High-Pass Corridor
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        Mountain wind advisory 14:00 · Morning crossing advised
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-semibold">
                    Advisory
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-tertiary text-[22px]">currency_exchange</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-on-surface">
                        INR Multi-Currency Parity Shield
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        RBI Ref Rate locked · Favorable for advance heritage hotel bookings
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-semibold">
                    Opportunity
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 flex items-center justify-between border-t border-surface-container text-xs">
              <span className="text-on-surface-variant text-[11px]">
                Checked against 14 global APIs 3m ago
              </span>
              <Link
                href="/vault"
                className="text-primary font-semibold hover:underline flex items-center gap-1 text-xs"
              >
                <span>Live Intelligence Console</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </Link>
            </div>
          </div>

          {/* Right: Spatial Verification */}
          <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-surface-container-low shadow-xs border border-surface-container-high/30 flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">location_on</span>
                <span className="text-sm font-semibold text-on-surface">
                  Spatial Verification System
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Every waypoint on WanderWay is anchored to precise geographic coordinates via Geoapify and PostGIS, avoiding phantom pins and inaccessible backcountry spots.
              </p>

              <div
                className="w-full h-44 rounded-2xl bg-cover bg-center shadow-inner relative flex items-end p-3 overflow-hidden border border-white/20"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDdrgE551vST1aj6rkUR9qV6lF6joxh1gm-Znv4rPJy-KRNJx0-umpBmZU_22E62ekWT5mnpfsZdYVFvBgnX7IxX0LPg9pWXzfF0tSML0uBj7p3W940MgbVzaRZCU78AXAVx72ooyRzBHxPeY_Oq57J7ZPaWJh6Z5wxhX5T20yArz-CIHRWk7l53QHQC-L_meXzu-j43-a_Z_QS8ApCBI2yXFzX34UwAJ9NLP-cpbZg')`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/85 via-transparent to-transparent" />
                <div className="relative z-10 flex items-center justify-between w-full p-2.5 rounded-xl bg-black/50 backdrop-blur-xl border border-white/20 text-white shadow-md">
                  <span className="text-xs font-semibold">Jaipur Pink City Heritage Grid</span>
                  <span className="text-[10px] font-bold bg-primary px-2.5 py-0.5 rounded-full text-on-primary">
                    100% Geocoded
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 pt-2 border-t border-surface-container-high/40">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Coordinate Precision Standard</span>
                <span className="font-bold text-on-surface">Sub-meter GPS</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-[98%] rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* 7. Section 6: Direct Action CTA Banner */}
        <section className="w-full p-8 sm:p-12 md:p-14 rounded-3xl bg-primary text-on-primary shadow-xl relative overflow-hidden">
          <div className="absolute -right-24 -top-24 size-96 rounded-full bg-on-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 size-80 rounded-full bg-inverse-primary/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-on-primary/15 self-start text-on-primary text-xs font-semibold tracking-wide">
              <span className="material-symbols-outlined text-[16px]">flight_takeoff</span>
              <span>START YOUR ADVENTURE</span>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium text-on-primary leading-tight">
                Ready to turn your wanderlust into reality?
              </h2>
              <p className="text-xs sm:text-sm text-primary-fixed max-w-xl leading-relaxed">
                Join over 120,000 independent travelers who design confident, mathematically verified trips without the headache.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/trips/new"
                className="h-12 px-6 rounded-xl bg-surface-container-lowest text-primary hover:bg-primary-fixed hover:text-on-primary-fixed text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                <span>Create Your First Trip Now</span>
              </Link>
              <Link
                href="/explore"
                className="h-12 px-6 rounded-xl bg-primary-container text-on-primary hover:bg-on-primary/20 text-xs sm:text-sm font-medium flex items-center gap-2 transition-all border border-white/20"
              >
                <span className="material-symbols-outlined text-[20px]">explore</span>
                <span>Explore Public Destinations</span>
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 pt-4 border-t border-on-primary/20 text-on-primary/80 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-tertiary-fixed">check</span>
                <span>Over 120k trips planned</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-tertiary-fixed">check</span>
                <span>100% verified place coordinates</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-tertiary-fixed">check</span>
                <span>Zero hidden estimates</span>
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-container-high/40 bg-surface-container-low py-10 px-4 sm:px-6 lg:px-8 text-xs text-on-surface-variant">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/nav_logo.png"
                alt="WanderWay"
                className="h-7 w-auto object-contain group-hover:scale-105 transition-transform"
              />
            </Link>
            <span className="text-xs text-on-surface-variant font-medium">
              — Google Stitch Material 3 Travel Companion
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium">
            <Link href="/explore" className="hover:text-primary transition-colors">
              Explore
            </Link>
            <Link href="/trips" className="hover:text-primary transition-colors">
              Trips Workspace
            </Link>
            <Link href="/profile" className="hover:text-primary transition-colors">
              Profile
            </Link>
            <Link href="/login" className="hover:text-primary transition-colors">
              Sign In
            </Link>
            <span className="text-outline">PRD v3.0 Grounded Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
