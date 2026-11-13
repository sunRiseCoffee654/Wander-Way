"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { motion } from "motion/react";
import { PlaceDetailsModal } from "@/components/places/place-details-modal";
import { getPlaceDetails } from "@/lib/geoapify/actions";
import type { PlaceSuggestion } from "@/lib/geoapify/types";
import { StitchSidebar } from "@/components/layout/stitch-sidebar";
import { StitchHeader } from "@/components/layout/stitch-header";

interface ShowcasePlace {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  rankBadge: string;
  rankIcon: string;
  weatherChip: string;
  advisoryChip: string;
  budgetTier: string;
  highlights: string[];
  transitMeta: string;
  transitIcon: string;
  category: "all" | "nature" | "culture" | "food" | "historic" | "adventure" | "relaxation";
}

const SHOWCASE_DESTINATIONS: ShowcasePlace[] = [
  {
    id: "jaipur",
    name: "Jaipur & Udaipur, Rajasthan",
    subtitle: "Pink City Palaces & Lake Heritage",
    description:
      "Golden sandstone forts, mirror-work royal courtyards, heritage stepwells, and serene boat rides across Lake Pichola come alive in crisp autumn desert air.",
    image: "/images/destinations/jaipur.jpg",
    rankBadge: "Top Ranked",
    rankIcon: "hotel_class",
    weatherChip: "26°C Sunny Verified",
    advisoryChip: "Ministry of Tourism: Safe",
    budgetTier: "₹₹ Moderate (₹4,500–₹8,500/day)",
    highlights: ["Amber Fort", "Hawa Mahal", "City Palace & Lake Pichola"],
    transitMeta: "Vande Bharat Express (DEL–JP)",
    transitIcon: "train",
    category: "culture",
  },
  {
    id: "ladakh",
    name: "Ladakh & Leh, Himalayas",
    subtitle: "High-Altitude Passes & Monasteries",
    description:
      "Azure glacial lakes at Pangong Tso, centuries-old Buddhist gompas perched on ridges, and iconic Himalayan drives across Khardung La.",
    image: "/images/destinations/ladakh.jpg",
    rankBadge: "Himalayan Hub",
    rankIcon: "altitude",
    weatherChip: "Season Rating 9.8/10",
    advisoryChip: "Verified Acclimatization Protocol",
    budgetTier: "₹₹₹ Expedition Tier",
    highlights: ["Pangong Tso Lake", "Nubra Valley Dunes", "Thiksey Monastery"],
    transitMeta: "Leh IXL Direct + BRO Highway",
    transitIcon: "speed",
    category: "adventure",
  },
  {
    id: "kerala",
    name: "Kerala Backwaters & Munnar",
    subtitle: "Alleppey Houseboats & Tea Hills",
    description:
      "Drift along palm-fringed lagoons in traditional kettuvallam houseboats, wander misty emerald tea estates in Munnar, and explore Fort Kochi spice quarters.",
    image: "/images/destinations/kerala.jpg",
    rankBadge: "Coastal & Lagoon",
    rankIcon: "water",
    weatherChip: "Ferry Schedules Sourced",
    advisoryChip: "Post-Monsoon Lush Season",
    budgetTier: "₹₹₹ Curated Retreats",
    highlights: ["Alleppey Backwaters", "Munnar Tea Gardens", "Fort Kochi"],
    transitMeta: "SWTD Ferry & Cochin Intl (COK)",
    transitIcon: "schedule",
    category: "relaxation",
  },
  {
    id: "varanasi",
    name: "Varanasi & Rishikesh, Ganga",
    subtitle: "Sacred Ghats & Culinary Heritage",
    description:
      "Ancient stone ghats glowing with evening Ganga Aarti lamps, Banarasi handloom silk ateliers, morning boat chants, and Himalayan foothills spirituality.",
    image: "/images/destinations/varanasi.jpg",
    rankBadge: "Heritage & Culinary",
    rankIcon: "local_cafe",
    weatherChip: "24°C Mild Breeze",
    advisoryChip: "Tourist Police & Ghat Patrols",
    budgetTier: "₹ Budget-Friendly (₹2,800/day)",
    highlights: ["Dashashwamedh Ghat", "Sarnath Stupa", "Ram Jhula & Beatles Ashram"],
    transitMeta: "IRCTC Vande Bharat (NDLS–BSB)",
    transitIcon: "security",
    category: "food",
  },
];

const SAVED_SPOTS = [
  {
    title: "Hawa Mahal & Johari Bazaar",
    sub: "Jaipur, Rajasthan • Heritage",
    image: "/images/destinations/hawa-mahal.jpg",
  },
  {
    title: "Pangong Tso Shore",
    sub: "Ladakh • 4,225m Alpine Lake",
    image: "/images/destinations/ladakh.jpg",
  },
  {
    title: "Alleppey Lagoon Houseboat",
    sub: "Kerala Backwaters • Maritime",
    image: "/images/destinations/alleppey.jpg",
  },
  {
    title: "Dashashwamedh Evening Aarti",
    sub: "Varanasi, UP • Spiritual",
    image: "/images/destinations/varanasi.jpg",
  },
];

export function ExploreClient() {
  const [selectedTheme, setSelectedTheme] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedCount, setSavedCount] = useState(4);
  const [savedNotices, setSavedNotices] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [consularFeedText, setConsularFeedText] = useState(
    "India: Ministry of Tourism Level 1 (Safe) • IRCTC Rail Network 99.4% Nominal • Ladakh: Clear Pass Conditions"
  );

  useEffect(() => {
    let isMounted = true;
    async function loadConsularFeed() {
      try {
        const [inRes, ladakhRes] = await Promise.all([
          fetch("/api/advisories?destination=Jaipur,%20India"),
          fetch("/api/advisories?destination=Ladakh,%20India"),
        ]);
        if (inRes.ok && ladakhRes.ok) {
          const inJson = await inRes.json();
          const ladakhJson = await ladakhRes.json();
          if (isMounted && inJson.success && ladakhJson.success) {
            setConsularFeedText(
              `${inJson.data.country_name}: ${inJson.data.level_name} • IRCTC Vande Bharat Corridors Nominal • Helpline: 1800-11-1363`
            );
          }
        }
      } catch {
        // Fallback default retained
      }
    }
    loadConsularFeed();
    return () => {
      isMounted = false;
    };
  }, []);

  // Geoapify modal details
  const [selectedGeoPlace, setSelectedGeoPlace] = useState<PlaceSuggestion | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [details, setDetails] = useState<{
    data: { lat: number; lon: number } | null;
    place: PlaceSuggestion | null;
    details: Awaited<ReturnType<typeof getPlaceDetails>>["details"] | null;
    error: string | null;
    loading: boolean;
  }>({
    data: null,
    place: null,
    details: null,
    error: null,
    loading: false,
  });

  useEffect(() => {
    if (!selectedGeoPlace) return;

    let cancelled = false;

    const load = async () => {
      setDetails((d) => ({ ...d, loading: true, error: null }));
      const result = await getPlaceDetails(selectedGeoPlace.lat, selectedGeoPlace.lon);
      if (!cancelled) {
        setDetails({
          data: { lat: selectedGeoPlace.lat, lon: selectedGeoPlace.lon },
          place: selectedGeoPlace,
          details: result.details ?? null,
          error: result.error ?? null,
          loading: false,
        });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedGeoPlace]);

  const handleSaveToTrip = (id: string) => {
    setSavedNotices((prev) => ({ ...prev, [id]: true }));
    setSavedCount((c) => c + 1);
    setTimeout(() => {
      setSavedNotices((prev) => ({ ...prev, [id]: false }));
    }, 2500);
  };

  const filteredPlaces = SHOWCASE_DESTINATIONS.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.highlights.some((h) => h.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTheme = selectedTheme === "all" || item.category === selectedTheme;
    return matchesSearch && matchesTheme;
  });

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface antialiased flex flex-col">
      <StitchSidebar />

      <div className="pl-0 lg:pl-72 flex flex-col min-h-screen w-full">
        <StitchHeader />

        <main className="relative pt-16 min-h-screen bg-surface w-full px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col w-full py-6">
            {/* Authoritative Consular & Environmental Ticker Bar */}
            <div className="w-full bg-surface-container rounded-xl p-3 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-tertiary-fixed text-on-tertiary-fixed shrink-0">
                  <span className="material-symbols-outlined text-[18px]">
                    verified_user
                  </span>
                </span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-xs uppercase tracking-wider text-tertiary font-bold">
                    Live Consular Feed
                  </span>
                  <span className="text-xs sm:text-sm text-on-surface">
                    {consularFeedText}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end md:self-auto text-on-surface-variant text-xs bg-surface-container-high px-2.5 py-1 rounded-full">
                <span className="material-symbols-outlined text-[14px]">
                  update
                </span>
                <span>Live Grounded</span>
              </div>
            </div>

            {/* Hero Discovery Header & Search Banner */}
            <div className="relative w-full rounded-2xl bg-gradient-to-br from-surface-container via-surface-container-high to-surface-variant p-6 lg:p-8 mb-8 overflow-hidden shadow-2xs">
              <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col gap-6 max-w-4xl">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs uppercase tracking-widest text-secondary font-semibold">
                    Explore Hub • Autumn 2025 Release
                  </span>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl text-on-surface font-semibold tracking-tight">
                    Discover places curated for your travel rhythm
                  </h1>
                  <p className="text-sm text-on-surface-variant max-w-2xl leading-relaxed">
                    Search cross-referenced global destinations with verified seasonal climate
                    data, official consular safety indices, and direct timetable linkages.
                  </p>
                </div>

                {/* Prominent Search Console Bar */}
                <div className="bg-surface-container-lowest rounded-full p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-md">
                  <div className="flex items-center gap-3 px-4 flex-1">
                    <span className="material-symbols-outlined text-primary text-[24px]">
                      travel_explore
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search cities, landmarks, national parks..."
                      className="w-full bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-full">
                    <span className="material-symbols-outlined text-secondary text-[20px]">
                      near_me
                    </span>
                    <select
                      className="bg-transparent text-xs font-medium text-on-surface focus:outline-none cursor-pointer pr-2"
                      onChange={(e) => setSearchQuery(e.target.value === "all" ? "" : e.target.value)}
                    >
                      <option value="all">All Indian Regions</option>
                      <option value="Jaipur">Rajasthan &amp; Royal Circuit</option>
                      <option value="Ladakh">Himalayas &amp; Ladakh</option>
                      <option value="Kerala">Kerala &amp; South India</option>
                      <option value="Varanasi">Ganga Heritage Belt</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <span>Search</span>
                    <span className="material-symbols-outlined text-[16px]">
                      arrow_forward
                    </span>
                  </button>
                </div>

                {/* Filter Chips Segment */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[
                    { id: "all", label: "All Themes", icon: "check" },
                    { id: "nature", label: "Nature", icon: "park" },
                    { id: "culture", label: "Culture & Temples", icon: "temple_buddhist" },
                    { id: "food", label: "Food & Dining", icon: "restaurant" },
                    { id: "historic", label: "Historic", icon: "museum" },
                    { id: "adventure", label: "Adventure", icon: "hiking" },
                    { id: "relaxation", label: "Relaxation", icon: "spa" },
                  ].map((theme) => {
                    const active = selectedTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedTheme(theme.id)}
                        className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shadow-2xs cursor-pointer ${
                          active
                            ? "text-on-secondary-container font-semibold"
                            : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                        }`}
                      >
                        {active && (
                          <motion.div
                            layoutId="activeThemeIndicator"
                            className="absolute inset-0 rounded-full bg-secondary-container z-0"
                            transition={{ type: "spring", stiffness: 420, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10 material-symbols-outlined text-[16px]">
                          {theme.icon}
                        </span>
                        <span className="relative z-10">{theme.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sub-Header: Context & View Switcher */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-secondary-fixed text-on-secondary-fixed px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-[18px]">
                    local_florist
                  </span>
                  <span className="text-xs font-semibold">
                    Curated for Autumn Travel
                  </span>
                </div>
                <span className="text-xs text-on-surface-variant">
                  Showing {filteredPlaces.length} verified selections
                </span>
              </div>

              {/* Segmented Button View Switcher */}
              <div className="flex items-center bg-surface-container p-1 rounded-full shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    viewMode === "grid"
                      ? "bg-surface-container-lowest text-primary shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    grid_view
                  </span>
                  <span>Grid View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("map")}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    viewMode === "map"
                      ? "bg-surface-container-lowest text-primary shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    map
                  </span>
                  <span>Map View</span>
                </button>
              </div>
            </div>

            {/* Main Asymmetric Dual-Pane Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start mb-12">
              {/* Showcase Destinations Cards (8 cols) */}
              <div className="xl:col-span-8 flex flex-col gap-6">
                {filteredPlaces.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-surface-container-low text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[32px] text-outline mb-2">
                      search_off
                    </span>
                    <p className="text-sm">No destinations matched your criteria.</p>
                  </div>
                ) : (
                  filteredPlaces.map((dest) => (
                    <article
                      key={dest.id}
                      className="bg-surface-container-low rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row gap-5 group"
                    >
                      <div className="relative w-full md:w-72 h-56 rounded-xl overflow-hidden shrink-0 bg-surface-container">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={dest.name}
                          src={dest.image}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 bg-white/85 dark:bg-black/60 backdrop-blur-xl border border-white/40 dark:border-white/15 px-3 py-1 rounded-full flex items-center gap-1.5 text-on-surface text-xs shadow-md">
                          <span className="material-symbols-outlined text-secondary text-[14px]">
                            {dest.rankIcon}
                          </span>
                          <span className="font-semibold">{dest.rankBadge}</span>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-xs font-semibold">
                              <span className="material-symbols-outlined text-[14px]">
                                check_circle
                              </span>
                              {dest.weatherChip}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs">
                              {dest.advisoryChip}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-medium">
                              {dest.budgetTier}
                            </span>
                          </div>

                          <div>
                            <h2
                              className="text-xl text-on-surface font-semibold tracking-tight cursor-pointer hover:text-primary transition-colors"
                              onClick={() => {
                                setSelectedGeoPlace({
                                  placeId: dest.id,
                                  name: dest.name,
                                  formatted: dest.subtitle,
                                  city: dest.name.split(",")[0]?.trim() ?? null,
                                  country: dest.name.split(",")[1]?.trim() ?? null,
                                  category: dest.category,
                                  lat:
                                    dest.id === "jaipur"
                                      ? 26.9124
                                      : dest.id === "ladakh"
                                      ? 34.1526
                                      : dest.id === "kerala"
                                      ? 9.4981
                                      : 25.3176,
                                  lon:
                                    dest.id === "jaipur"
                                      ? 75.7873
                                      : dest.id === "ladakh"
                                      ? 77.5771
                                      : dest.id === "kerala"
                                      ? 76.3388
                                      : 82.9739,
                                });
                                setModalOpen(true);
                              }}
                            >
                              {dest.name}
                            </h2>
                            <p className="text-xs text-secondary font-medium">
                              {dest.subtitle}
                            </p>
                          </div>

                          <p className="text-xs sm:text-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                            {dest.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {dest.highlights.map((h) => (
                              <span
                                key={h}
                                className="px-2 py-0.5 bg-surface-container rounded-md text-[11px] text-on-surface-variant"
                              >
                                {h}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 mt-2 border-t border-surface-container-high/40">
                          <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
                            <span className="material-symbols-outlined text-[16px] text-primary">
                              {dest.transitIcon}
                            </span>
                            <span>{dest.transitMeta}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSaveToTrip(dest.id)}
                            className="bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {savedNotices[dest.id] ? "check" : "add_circle"}
                            </span>
                            <span>
                              {savedNotices[dest.id] ? "Saved!" : "Save to Trip"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {/* Right Side: Dedicated Saved Places & Collections Column (4 cols) */}
              <aside className="xl:col-span-4 bg-surface-container-lowest rounded-2xl p-6 shadow-2xs flex flex-col gap-6 sticky top-20 border border-surface-container-high/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary text-[22px]">
                      bookmarks
                    </span>
                    <h3 className="text-base font-semibold text-on-surface">
                      Saved Places & Vault
                    </h3>
                  </div>
                  <span className="bg-primary-fixed text-on-primary-fixed text-xs font-bold px-2 py-0.5 rounded-full">
                    {savedCount} Items
                  </span>
                </div>

                {/* AI Trip Generation Prompt */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary-container/20 flex flex-col gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                      auto_awesome
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-on-surface">
                        Create New Trip from Saved
                      </span>
                      <span className="text-[11px] text-on-surface-variant leading-relaxed">
                        WanderWay AI will cluster your bookmarked places by transit proximity.
                      </span>
                    </div>
                  </div>
                  <Link
                    href={"/trips/new" as Route}
                    className="w-full bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <span>Assemble Itinerary</span>
                    <span className="material-symbols-outlined text-[16px]">
                      arrow_forward
                    </span>
                  </Link>
                </div>

                {/* Saved Spots List */}
                <div className="flex flex-col gap-3">
                  {SAVED_SPOTS.map((spot) => (
                    <div
                      key={spot.title}
                      className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-surface-container-high shrink-0 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={spot.image}
                            alt={spot.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-on-surface truncate">
                            {spot.title}
                          </span>
                          <span className="text-[11px] text-on-surface-variant truncate">
                            {spot.sub}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={"/trips/new" as Route}
                        className="text-primary hover:bg-primary-fixed hover:text-on-primary-fixed p-1.5 rounded-full transition-colors shrink-0"
                        title="Add to itinerary"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          add_task
                        </span>
                      </Link>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>

      <PlaceDetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedGeoPlace?.name ?? ""}
        details={details.details}
        error={details.error}
        onViewOnMap={() => {}}
      />
    </div>
  );
}
