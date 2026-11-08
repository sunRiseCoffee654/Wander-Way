"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { Database } from "@/lib/types/database";
import {
  getItineraryEvidenceBadge,
  formatTransitDuration,
  formatTransitDistance,
  sortItineraryActivities,
} from "@/lib/itinerary/helpers";
import { GroupTalkDrawer } from "@/components/collaboration/group-talk-drawer";

type ItineraryDayWithActivities = Database["public"]["Tables"]["itinerary_days"]["Row"] & {
  itinerary_activities: Database["public"]["Tables"]["itinerary_activities"]["Row"][];
};

interface ItineraryClientViewProps {
  tripId: string;
  tripTitle: string;
  destination: string;
  dbDays: ItineraryDayWithActivities[];
}

interface ShowcaseActivity {
  id: string;
  step: number;
  time: string;
  title: string;
  category: string;
  categoryType: string;
  evidence: string;
  evidenceBadge: string;
  description: string;
  duration: string;
  cost: string;
  curatorNote?: string;
  location?: string;
  isAiSuggestion?: boolean;
}

interface ShowcaseTransit {
  id: string;
  icon: string;
  title: string;
  badge: string;
  sub: string;
  cost: string;
  statusIcon: string;
}

interface ShowcaseDayData {
  title: string;
  meta: string;
  statusBadge: string;
  activities: ShowcaseActivity[];
  transits: ShowcaseTransit[];
  mapWaypoints: Array<{ id: string; label: string; x: string; y: string; isAi?: boolean }>;
  transitKm: string;
  transitMins: string;
}

const SHOWCASE_SCHEDULES: Record<number, ShowcaseDayData> = {
  1: {
    title: "Arrival at Haneda & Shinjuku Nightscape",
    meta: "3 stops scheduled • SFO JL 001 touch down • 18.2 km movement",
    statusBadge: "Arrival Smooth",
    transitKm: "18.2 km",
    transitMins: "55 mins",
    mapWaypoints: [
      { id: "1", label: "Haneda Airport (HND)", x: "22%", y: "78%" },
      { id: "2", label: "Hotel Cerulean Shinjuku", x: "48%", y: "42%" },
      { id: "3", label: "Omoide Yokocho", x: "58%", y: "30%" },
    ],
    transits: [
      {
        id: "t1",
        icon: "directions_subway",
        title: "Tokyo Monorail & Yamanote Line • HND to Shinjuku",
        badge: "Official Schedule",
        sub: "35 mins • IC card tap (Suica/Pasmo) • Platform 1",
        cost: "¥660 (~$4.50)",
        statusIcon: "check_circle",
      },
      {
        id: "t2",
        icon: "directions_walk",
        title: "Evening Walk • Hotel to Omoide Yokocho",
        badge: "Pedestrian",
        sub: "12 mins • 800m through neon corridors",
        cost: "Free",
        statusIcon: "navigation",
      },
    ],
    activities: [
      {
        id: "d1-1",
        step: 1,
        time: "03:15 PM",
        title: "Haneda International Arrival & Pocket Wi-Fi Pickup",
        category: "Transit / Welcome",
        categoryType: "bg-surface-container-high text-on-surface-variant",
        evidence: "Live Quote",
        evidenceBadge: "bg-tertiary-fixed text-on-tertiary-fixed",
        description: "Clear customs at Terminal 3, collect Japan Rail Pass exchange vouchers and Ninja Wi-Fi router counter.",
        duration: "Duration: 1h 00m",
        cost: "Pre-paid",
        location: "Terminal 3 Arrival Lobby",
      },
      {
        id: "d1-2",
        step: 2,
        time: "05:00 PM",
        title: "Check-in at Tokyo Boutique Hotel & Refresh",
        category: "Lodging",
        categoryType: "bg-surface-container-high text-on-surface-variant",
        evidence: "Live Quote",
        evidenceBadge: "bg-tertiary-fixed text-on-tertiary-fixed",
        description: "Unpack luggage, change into light evening layers, and survey city skyline views over Shinjuku.",
        duration: "Duration: 1h 30m",
        cost: "Covered by Booking",
        location: "Cerulean Tower Shinjuku",
      },
      {
        id: "d1-3",
        step: 3,
        time: "07:30 PM",
        title: "Dinner & Lantern Stroll at Omoide Yokocho",
        category: "Dining / Nightlife",
        categoryType: "bg-surface-container-high text-on-surface-variant",
        evidence: "Calculated Estimate",
        evidenceBadge: "bg-secondary-fixed text-on-secondary-fixed",
        description: "Atmospheric post-war alleyway serving binchotan-grilled yakitori skewers and draft Sapporo beer.",
        duration: "Duration: 2h 00m",
        cost: "Pay on site (~¥3,500)",
        location: "Shinjuku West Exit",
      },
    ],
  },
  2: {
    title: "Kyoto Heritage, Shrines & Culinary Lane",
    meta: "4 stops scheduled • 1 pending confirmation • 7.4 km total movement",
    statusBadge: "Schedule Balanced",
    transitKm: "7.4 km",
    transitMins: "47 mins",
    mapWaypoints: [
      { id: "1", label: "Nishiki Market", x: "18%", y: "28%" },
      { id: "2", label: "Fushimi Inari", x: "52%", y: "74%" },
      { id: "3", label: "Gion Karyo", x: "64%", y: "39%" },
      { id: "4", label: "Kiyomizu (AI)", x: "82%", y: "52%", isAi: true },
      { id: "5", label: "Pontocho", x: "44%", y: "25%" },
    ],
    transits: [
      {
        id: "t1",
        icon: "directions_walk",
        title: "Walking 850m • 12 mins via Shijo-dori",
        badge: "Sourced Map Route",
        sub: "toward Gion-Shijo / Keihan Line",
        cost: "Free",
        statusIcon: "navigation",
      },
      {
        id: "t2",
        icon: "train",
        title: "JR Nara Line Train • Inari Stn to Tofukuji / Gion Transfer",
        badge: "Official Schedule",
        sub: "15 mins in transit • Frequency: Every 10 mins • Track 2 Direction Kyoto",
        cost: "¥150 (~$1.05)",
        statusIcon: "check_circle",
      },
      {
        id: "t3",
        icon: "local_taxi",
        title: "Taxi / Rideshare estimate • Higashiyama to Pontocho",
        badge: "Calculated Estimate",
        sub: "Disclosed: 3.2km @ local standard daytime rate • 10 mins",
        cost: "¥1,800 (~$12.50)",
        statusIcon: "info",
      },
    ],
    activities: [
      {
        id: "d2-1",
        step: 1,
        time: "08:30 AM",
        title: "Breakfast at Nishiki Market",
        category: "Food / Culture",
        categoryType: "bg-surface-container-high text-on-surface-variant",
        evidence: "User Entered",
        evidenceBadge: "bg-primary-fixed text-on-primary-fixed",
        description: "Explore morning street vendors for freshly grilled dashi tamagoyaki, matcha warabi mochi, and artisanal tsukemono.",
        duration: "Duration: 1h 15m",
        cost: "Pay on site (~¥1,200)",
        location: "Nakagyo Ward, Kyoto",
      },
      {
        id: "d2-2",
        step: 2,
        time: "10:00 AM",
        title: "Fushimi Inari Taisha Shrine",
        category: "Priority Star",
        categoryType: "bg-secondary-fixed text-on-secondary-fixed font-semibold",
        evidence: "Published Tariff",
        evidenceBadge: "bg-tertiary-fixed text-on-tertiary-fixed",
        description: "Hike beneath thousands of vermilion torii gates winding up the sacred Mount Inari trail.",
        duration: "Duration: 2h 30m",
        cost: "Free Admission [Published]",
        curatorNote: "Arrive before peak crowds. The Senbon Torii path clears up 40% after the first quarter mile up to Yotsutsuji intersection.",
        location: "Fushimi Ward, Kyoto • GPS: 34.9671° N, 135.7727° E",
      },
      {
        id: "d2-3",
        step: 3,
        time: "01:15 PM",
        title: "Traditional Kaiseki Lunch at Gion Karyo",
        category: "Booking Confirmed: Res #GK-9821",
        categoryType: "bg-tertiary-fixed text-on-tertiary-fixed font-semibold",
        evidence: "Live Quote",
        evidenceBadge: "bg-tertiary-fixed text-on-tertiary-fixed",
        description: "10-course seasonal lunch menu highlighting local matsutake broth, seasonal sashimi, and clay-pot cooked rice in a preserved machiya.",
        duration: "Duration: 1h 45m",
        cost: "¥7,500 ($52.00) [Live Quote]",
        location: "Gion historic quarter",
      },
      {
        id: "d2-4",
        step: 4,
        time: "03:00 PM",
        title: "Kiyomizu-dera Temple & Higashiyama Stroll",
        category: "AI Draft Suggestion",
        categoryType: "bg-secondary-fixed text-on-secondary-fixed font-semibold",
        evidence: "Published Price",
        evidenceBadge: "bg-primary-fixed text-on-primary-fixed",
        description: "Walk through Ninenzaka & Sannenzaka historic slopes leading up to the grand wooden stage with panoramic Kyoto foliage views.",
        duration: "Est. 1h 45m",
        cost: "¥400 general entry",
        isAiSuggestion: true,
        location: "Higashiyama Ward, Kyoto",
      },
      {
        id: "d2-5",
        step: 5,
        time: "06:30 PM",
        title: "Pontocho Alley Evening Walk & Dinner",
        category: "Nightlife / Dining",
        categoryType: "bg-surface-container-high text-on-surface-variant",
        evidence: "Calculated Estimate",
        evidenceBadge: "bg-secondary-fixed text-on-secondary-fixed",
        description: "Atmospheric pedestrian lantern street bordering the Kamogawa River. Drop into local Yakitori or craft sake spots along the canal.",
        duration: "Open Evening Window (~2h 00m)",
        cost: "Pay on site (~¥4,000)",
        location: "Kamogawa River Boardwalk",
      },
    ],
  },
  3: {
    title: "Nozomi Shinkansen & Arashiyama Bamboo",
    meta: "3 stops scheduled • Tokaido Bullet Train • 12.8 km movement",
    statusBadge: "Transit On Track",
    transitKm: "12.8 km",
    transitMins: "38 mins",
    mapWaypoints: [
      { id: "1", label: "Kyoto Stn Shinkansen", x: "32%", y: "70%" },
      { id: "2", label: "Tenryu-ji Temple", x: "65%", y: "35%" },
      { id: "3", label: "Arashiyama Bamboo Grove", x: "78%", y: "24%" },
    ],
    transits: [
      {
        id: "t1",
        icon: "train",
        title: "JR San-in Line • Kyoto Station to Saga-Arashiyama",
        badge: "JR Pass Included",
        sub: "16 mins rapid transit • Track 32 departure",
        cost: "¥240 (Included)",
        statusIcon: "check_circle",
      },
    ],
    activities: [
      {
        id: "d3-1",
        step: 1,
        time: "09:00 AM",
        title: "Morning Transit to Arashiyama Foothills",
        category: "Scenic Rail",
        categoryType: "bg-surface-container-high text-on-surface-variant",
        evidence: "Published Tariff",
        evidenceBadge: "bg-primary-fixed text-on-primary-fixed",
        description: "Board scenic local train west toward the Hozu River and mountains.",
        duration: "Duration: 40m",
        cost: "JR Pass Sourced",
        location: "Saga-Arashiyama Station",
      },
      {
        id: "d3-2",
        step: 2,
        time: "10:15 AM",
        title: "Tenryu-ji World Heritage Zen Temple & Garden",
        category: "Heritage / Nature",
        categoryType: "bg-secondary-fixed text-on-secondary-fixed font-semibold",
        evidence: "Published Price",
        evidenceBadge: "bg-primary-fixed text-on-primary-fixed",
        description: "14th-century landscape garden reflecting autumn colors across Sogenchi Pond with mountain backdrops.",
        duration: "Duration: 1h 30m",
        cost: "¥500 entry",
        location: "Tenryu-ji Main Compound",
      },
      {
        id: "d3-3",
        step: 3,
        time: "12:00 PM",
        title: "Arashiyama Bamboo Grove & Togetsukyo Bridge",
        category: "Iconic Walk",
        categoryType: "bg-surface-container-high text-on-surface-variant",
        evidence: "Published Price",
        evidenceBadge: "bg-tertiary-fixed text-on-tertiary-fixed",
        description: "Immersive soaring green stalks corridor leading into the tranquil residential village and riverbank.",
        duration: "Duration: 2h 00m",
        cost: "Free Access",
        location: "Arashiyama Bamboo Pathway",
      },
    ],
  },
  4: {
    title: "Gion Cultural Heart & Machiya Tea Ceremony",
    meta: "3 stops scheduled • Reservation Required • 4.6 km movement",
    statusBadge: "Action Needed",
    transitKm: "4.6 km",
    transitMins: "25 mins",
    mapWaypoints: [
      { id: "1", label: "Kodai-ji Temple", x: "42%", y: "45%" },
      { id: "2", label: "Tea Ceremony Machiya", x: "60%", y: "48%" },
      { id: "3", label: "Philosophers Path", x: "85%", y: "22%" },
    ],
    transits: [
      {
        id: "t1",
        icon: "directions_walk",
        title: "Walking • Kodai-ji to Tea House via Ishibe-koji",
        badge: "Pedestrian Alley",
        sub: "8 mins • Preserved flagstone lane",
        cost: "Free",
        statusIcon: "navigation",
      },
    ],
    activities: [
      {
        id: "d4-1",
        step: 1,
        time: "09:30 AM",
        title: "Kodai-ji Zen Temple & Rock Garden",
        category: "Culture",
        categoryType: "bg-surface-container-high text-on-surface-variant",
        evidence: "Published Price",
        evidenceBadge: "bg-primary-fixed text-on-primary-fixed",
        description: "Tranquil hillside temple founded in 1606, featuring bamboo grove and raked dry landscape gravel gardens.",
        duration: "Duration: 1h 30m",
        cost: "¥600 admission",
        location: "Higashiyama, Kyoto",
      },
      {
        id: "d4-2",
        step: 2,
        time: "11:30 AM",
        title: "Private Machiya Urasenke Tea Ceremony",
        category: "Action Needed • Slot Unreserved",
        categoryType: "bg-secondary-fixed text-on-secondary-fixed font-semibold",
        evidence: "Live Quote",
        evidenceBadge: "bg-secondary-fixed text-on-secondary-fixed",
        description: "Authentic tea preparation ritual with tea master explaining etiquette, seasonal confections (wagashi), and philosophy.",
        duration: "Duration: 1h 15m",
        cost: "¥4,500 ($31.00) [Live Quote]",
        curatorNote: "Booking pending. Only 4 morning places remaining for this time slot.",
        location: "Gion Shirakawa preservation district",
      },
      {
        id: "d4-3",
        step: 3,
        time: "02:30 PM",
        title: "Philosopher's Path Canal Stroll",
        category: "Scenic Nature",
        categoryType: "bg-surface-container-high text-on-surface-variant",
        evidence: "Published Price",
        evidenceBadge: "bg-tertiary-fixed text-on-tertiary-fixed",
        description: "Stone path following a cherry tree-lined canal between Ginkaku-ji and Nanzen-ji temples.",
        duration: "Duration: 2h 00m",
        cost: "Free Access",
        location: "Sakyo Ward, Kyoto",
      },
    ],
  },
  5: {
    title: "Northern Kyoto & Golden Pavilion",
    meta: "3 stops scheduled • Zen Architecture • 9.1 km movement",
    statusBadge: "Verified Schedule",
    transitKm: "9.1 km",
    transitMins: "35 mins",
    mapWaypoints: [
      { id: "1", label: "Kinkaku-ji (Golden Pavilion)", x: "35%", y: "20%" },
      { id: "2", label: "Ryoan-ji Rock Garden", x: "24%", y: "26%" },
      { id: "3", label: "Daitoku-ji Compound", x: "50%", y: "15%" },
    ],
    transits: [
      {
        id: "t1",
        icon: "directions_bus",
        title: "Kyoto City Bus 205 • Kinkaku-ji to Ryoan-ji",
        badge: "City Transit",
        sub: "8 mins in transit • IC Card accepted",
        cost: "¥230",
        statusIcon: "check_circle",
      },
    ],
    activities: [
      {
        id: "d5-1",
        step: 1,
        time: "09:00 AM",
        title: "Kinkaku-ji (The Golden Pavilion)",
        category: "World Heritage",
        categoryType: "bg-primary-fixed text-on-primary-fixed font-semibold",
        evidence: "Published Price",
        evidenceBadge: "bg-primary-fixed text-on-primary-fixed",
        description: "Two-story gold-leaf pavilion mirrored over the tranquil waters of Kyoko-chi (Mirror Pond).",
        duration: "Duration: 1h 15m",
        cost: "¥500 entry",
        location: "Kita Ward, Kyoto",
      },
      {
        id: "d5-2",
        step: 2,
        time: "10:45 AM",
        title: "Ryoan-ji Famous Dry Landscape Garden",
        category: "Zen Meditation",
        categoryType: "bg-surface-container-high text-on-surface-variant",
        evidence: "Published Price",
        evidenceBadge: "bg-primary-fixed text-on-primary-fixed",
        description: "Fifteen mysterious rocks arranged in white raked sand, designed so that only 14 can be seen from any vantage point.",
        duration: "Duration: 1h 00m",
        cost: "¥600 admission",
        location: "Ryoanji Goryonoshitacho",
      },
      {
        id: "d5-3",
        step: 3,
        time: "01:00 PM",
        title: "Shojin Ryori Zen Vegetarian Lunch at Daitoku-ji",
        category: "Culinary Tradition",
        categoryType: "bg-tertiary-fixed text-on-tertiary-fixed font-semibold",
        evidence: "Live Quote",
        evidenceBadge: "bg-tertiary-fixed text-on-tertiary-fixed",
        description: "Traditional Buddhist temple cuisine served in lacquered bowls with seasonal sesame tofu, lotus root, and simmered greens.",
        duration: "Duration: 1h 30m",
        cost: "¥4,200 ($29.00)",
        location: "Izusen Daitoku-ji Compound",
      },
    ],
  },
  6: {
    title: "Nara Deer Park & Ancient Temples",
    meta: "3 stops scheduled • Day Trip Departure • 22.4 km movement",
    statusBadge: "Day Trip Active",
    transitKm: "22.4 km",
    transitMins: "50 mins",
    mapWaypoints: [
      { id: "1", label: "JR Nara Stn", x: "50%", y: "82%" },
      { id: "2", label: "Todai-ji Great Buddha", x: "65%", y: "45%" },
      { id: "3", label: "Nara Deer Park", x: "72%", y: "58%" },
    ],
    transits: [
      {
        id: "t1",
        icon: "train",
        title: "JR Miyakoji Rapid • Kyoto Stn to Nara Stn",
        badge: "Express Transit",
        sub: "45 mins rapid train • JR Pass valid",
        cost: "¥720 (Included)",
        statusIcon: "check_circle",
      },
    ],
    activities: [
      {
        id: "d6-1",
        step: 1,
        time: "09:30 AM",
        title: "Todai-ji Temple & The Great Bronze Buddha (Daibutsu)",
        category: "World Heritage",
        categoryType: "bg-primary-fixed text-on-primary-fixed font-semibold",
        evidence: "Published Price",
        evidenceBadge: "bg-primary-fixed text-on-primary-fixed",
        description: "One of the world's largest wooden buildings housing the towering 15-meter bronze Buddha statue cast in 752 AD.",
        duration: "Duration: 2h 00m",
        cost: "¥600 admission",
        location: "Zoshicho, Nara",
      },
      {
        id: "d6-2",
        step: 2,
        time: "12:00 PM",
        title: "Nara Deer Park Interaction & Shika Senbei",
        category: "Wildlife / Nature",
        categoryType: "bg-surface-container-high text-on-surface-variant",
        evidence: "User Entered",
        evidenceBadge: "bg-surface-container-highest text-on-surface",
        description: "Over 1,000 gentle, bowing sika deer roaming freely under autumn maples and ancient cedars.",
        duration: "Duration: 1h 30m",
        cost: "¥200 deer crackers",
        location: "Noborioji-cho, Nara",
      },
      {
        id: "d6-3",
        step: 3,
        time: "02:30 PM",
        title: "Kasuga Taisha Shrine & Lantern Paths",
        category: "Shinto Shrine",
        categoryType: "bg-surface-container-high text-on-surface-variant",
        evidence: "Published Price",
        evidenceBadge: "bg-primary-fixed text-on-primary-fixed",
        description: "Forest sanctuary lined with over 3,000 stone and bronze lanterns, illuminated with ancient moss carpets.",
        duration: "Duration: 1h 30m",
        cost: "¥500 inner sanctuary",
        location: "Kasugano-cho, Nara",
      },
    ],
  },
};

export function ItineraryClientView({
  tripId,
  tripTitle,
  destination,
  dbDays,
}: ItineraryClientViewProps) {
  const hasCustomSchedule = Boolean(dbDays && dbDays.length > 0);
  const defaultDay = hasCustomSchedule ? (dbDays[0]?.day_number || 1) : 2;
  const [selectedDay, setSelectedDay] = useState<number>(defaultDay);

  const [aiSuggestionAccepted, setAiSuggestionAccepted] = useState(false);
  const [aiSuggestionRemoved, setAiSuggestionRemoved] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(true);
  const [exportNotice, setExportNotice] = useState(false);
  const [groupTalkOpen, setGroupTalkOpen] = useState(false);

  // Build the day navigation tabs
  const daysList = hasCustomSchedule
    ? dbDays.map((d) => ({
        dayNumber: d.day_number,
        date: d.calendar_date
          ? new Date(d.calendar_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : `Day ${d.day_number}`,
        weather: "19°C",
        icon: "wb_sunny",
        title: d.title || `Day ${d.day_number}`,
      }))
    : [
        { dayNumber: 1, date: "Oct 14", weather: "17°C", icon: "cloud", title: "Arrival" },
        { dayNumber: 2, date: "Oct 15 (Today)", weather: "18°C", icon: "wb_sunny", title: "Kyoto Heritage" },
        { dayNumber: 3, date: "Oct 16", weather: "20°C", icon: "wb_sunny", title: "Arashiyama" },
        { dayNumber: 4, date: "Oct 17", weather: "16°C", icon: "rainy", title: "Tea Ceremony" },
        { dayNumber: 5, date: "Oct 18", weather: "19°C", icon: "wb_sunny", title: "Golden Pavilion" },
        { dayNumber: 6, date: "Oct 19", weather: "21°C", icon: "wb_sunny", title: "Nara Day Trip" },
      ];

  const handleExport = () => {
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 2500);
  };

  // Resolve current day's data
  const currentDbDay = hasCustomSchedule
    ? dbDays.find((d) => d.day_number === selectedDay) || dbDays[0]
    : null;

  const currentDbActivities = currentDbDay?.itinerary_activities
    ? sortItineraryActivities(currentDbDay.itinerary_activities)
    : [];

  const currentShowcase = SHOWCASE_SCHEDULES[selectedDay] || SHOWCASE_SCHEDULES[2];
  const getEvidenceBadge = getItineraryEvidenceBadge;

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Sticky Day Selector Bar */}
      <div className="sticky top-16 z-20 bg-surface/95 backdrop-blur-md pb-4 pt-2 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-surface-container-high/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl text-on-surface font-semibold tracking-tight">
              {tripTitle}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-semibold">
              Day {selectedDay} Active{hasCustomSchedule ? " • Custom Plan" : ""} • {destination}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/trips/${tripId}/packing` as Route}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">
                checklist
              </span>
              <span>Packing List</span>
            </Link>

            <button
              type="button"
              onClick={() => setGroupTalkOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-bold transition-all shadow-2xs"
            >
              <span className="relative flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">forum</span>
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </span>
              <span>Group Hub &amp; Call</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">
                ios_share
              </span>
              <span>{exportNotice ? "Pack Exported!" : "Export Daily Pack"}</span>
            </button>

            <button
              type="button"
              onClick={() => setOfflineSaved(!offlineSaved)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-tertiary">
                offline_pin
              </span>
              <span>{offlineSaved ? "Saved Offline" : "Save Offline"}</span>
            </button>
          </div>
        </div>

        {/* M3 Segmented Pill Tabs for Days */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {daysList.map((d) => {
            const isSelected = selectedDay === d.dayNumber;
            return (
              <button
                key={d.dayNumber}
                type="button"
                onClick={() => setSelectedDay(d.dayNumber)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shrink-0 text-xs ${
                  isSelected
                    ? "bg-primary text-on-primary font-bold shadow-xs"
                    : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-medium"
                }`}
              >
                <span className="font-semibold">Day {d.dayNumber}</span>
                <span className={isSelected ? "text-on-primary/80" : "text-on-surface-variant"}>
                  {d.date}
                </span>
                <span
                  className={`flex items-center gap-1 pl-1 ${
                    isSelected
                      ? "bg-primary-container px-2 py-0.5 rounded-full text-on-primary-container"
                      : "text-on-surface-variant"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {d.icon}
                  </span>
                  {d.weather}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 60/40 Dual-Column Asymmetric Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6 items-start">
        {/* Left Column: Chronological Day Timeline (7 of 12 cols = ~60%) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Day Meta Header Strip */}
          <div className="flex items-center justify-between bg-surface-container-low rounded-2xl px-4 py-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed shrink-0">
                <span className="material-symbols-outlined text-[20px]">
                  temple_buddhist
                </span>
              </div>
              <div>
                <h2 className="text-base text-on-surface font-semibold leading-tight">
                  {hasCustomSchedule
                    ? (currentDbDay?.title || `Day ${selectedDay} Schedule`)
                    : currentShowcase.title}
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {hasCustomSchedule
                    ? `${currentDbActivities.length} activities scheduled • Live GPS Grounded`
                    : currentShowcase.meta}
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 bg-surface-container-high px-2.5 py-1 rounded-full text-on-surface text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px] text-tertiary">
                check_circle
              </span>
              <span>{hasCustomSchedule ? "Database Synced" : currentShowcase.statusBadge}</span>
            </div>
          </div>

          {/* DYNAMIC DATABASE ACTIVITIES (if present) */}
          {hasCustomSchedule ? (
            currentDbActivities.length === 0 ? (
              <div className="p-8 rounded-2xl bg-surface-container-lowest border border-surface-container-high/40 text-center flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-[32px] text-on-surface-variant">
                  calendar_today
                </span>
                <p className="text-sm text-on-surface-variant">
                  No activities scheduled for Day {selectedDay} yet.
                </p>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow-xs hover:bg-primary-container transition-colors"
                >
                  + Add First Activity
                </button>
              </div>
            ) : (
              currentDbActivities.map((act, idx) => {
                const evidenceInfo = getEvidenceBadge(act.booking_requirement ? "published_price" : "calculated_estimate");
                return (
                  <div key={act.id} className="flex flex-col gap-3">
                    <div className="relative bg-surface-container-lowest rounded-2xl p-5 shadow-2xs hover:shadow-md transition-shadow border border-surface-container-high/40">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="flex flex-col items-center">
                            <span className="size-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold shadow-xs">
                              {idx + 1}
                            </span>
                            <span className="text-[11px] text-on-surface-variant mt-1.5 font-semibold">
                              {act.planned_time ? act.planned_time.slice(0, 5) : "Daytime"}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base text-on-surface font-semibold">
                                {act.title}
                              </h3>
                              {act.is_must_see && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[11px] font-semibold">
                                  <span className="material-symbols-outlined text-[14px]">star</span>
                                  Must See
                                </div>
                              )}
                              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-medium">
                                {act.place_category || "Sightseeing"}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${evidenceInfo.badge}`}>
                                <span className="material-symbols-outlined text-[12px]">{evidenceInfo.icon}</span>
                                {evidenceInfo.label}
                              </span>
                            </div>

                            {act.description && (
                              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                                {act.description}
                              </p>
                            )}

                            {act.place_name && (
                              <div className="text-[11px] text-on-surface-variant flex items-center gap-1 pt-0.5">
                                <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                                <span>{act.place_name}</span>
                                {act.latitude && act.longitude && (
                                  <span className="text-outline">
                                    • {act.latitude.toFixed(4)}° N, {act.longitude.toFixed(4)}° E
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-4 pt-1 text-xs text-on-surface-variant">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px] text-primary">
                                  schedule
                                </span>
                                Duration: {act.duration_minutes}m
                              </span>
                              {act.booking_requirement && (
                                <span className="flex items-center gap-1 text-secondary font-medium">
                                  <span className="material-symbols-outlined text-[16px]">
                                    confirmation_number
                                  </span>
                                  {act.booking_requirement}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container-high"
                          aria-label="Options"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            more_vert
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Transit Leg if travel mode specified */}
                    {act.travel_mode_to_next && (
                      <div className="relative pl-6 py-1">
                        <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-xl shadow-2xs border border-surface-container-high/30">
                          <div className="size-7 rounded-full bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                            <span className="material-symbols-outlined text-[18px]">
                              {act.travel_mode_to_next === "transit" ? "train" : act.travel_mode_to_next === "drive" ? "local_taxi" : "directions_walk"}
                            </span>
                          </div>
                          <div className="flex-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-on-surface capitalize">
                                {act.travel_mode_to_next} to Next Stop
                              </span>
                              {act.transit_duration_seconds && (
                                <span className="text-on-surface-variant">
                                  • {formatTransitDuration(act.transit_duration_seconds)}
                                </span>
                              )}
                              {act.transit_distance_meters && (
                                <span className="text-on-surface-variant">
                                  ({formatTransitDistance(act.transit_distance_meters)})
                                </span>
                              )}
                            </div>
                            <span className="text-tertiary flex items-center gap-1 font-medium">
                              <span className="material-symbols-outlined text-[16px]">navigation</span>
                              Ground Verified
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : (
            /* SHOWCASE SCHEDULE (Days 1–6) */
            <>
              {currentShowcase.activities.map((act, index) => {
                if (act.isAiSuggestion && aiSuggestionRemoved) return null;

                const isAiCard = act.isAiSuggestion;
                return (
                  <div
                    key={act.id}
                    className="flex flex-col gap-3 transition-transform duration-150 hover:scale-[1.008]"
                  >
                    <div
                      className={`relative rounded-2xl p-5 shadow-2xs transition-all border ${
                        isAiCard
                          ? aiSuggestionAccepted
                            ? "bg-tertiary-fixed/30 border-tertiary/30"
                            : "bg-surface-container-lowest border-surface-container-high/40"
                          : "bg-surface-container-lowest hover:shadow-md border-surface-container-high/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="flex flex-col items-center">
                            <span
                              className={`size-8 rounded-full flex items-center justify-center text-sm font-bold shadow-xs ${
                                isAiCard
                                  ? "bg-secondary text-on-secondary"
                                  : "bg-primary text-on-primary"
                              }`}
                            >
                              {act.step}
                            </span>
                            <span className="text-[11px] text-on-surface-variant mt-1.5 font-semibold">
                              {act.time}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base text-on-surface font-semibold">
                                {act.title}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] ${act.categoryType}`}>
                                {isAiCard && aiSuggestionAccepted ? "Confirmed in Itinerary" : act.category}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${act.evidenceBadge}`}>
                                {act.evidence}
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                              {act.description}
                            </p>

                            {act.location && (
                              <div className="text-[11px] text-on-surface-variant flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                                <span>{act.location}</span>
                              </div>
                            )}

                            {act.curatorNote && (
                              <div className="flex items-start gap-2 bg-secondary-fixed/40 rounded-xl p-2.5 text-on-secondary-container text-xs">
                                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0 mt-0.5">
                                  tips_and_updates
                                </span>
                                <p className="leading-relaxed">
                                  <strong>Curator Note:</strong> {act.curatorNote}
                                </p>
                              </div>
                            )}

                            <div className="flex items-center gap-4 pt-1 text-xs text-on-surface-variant">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px] text-primary">
                                  schedule
                                </span>
                                {act.duration}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px] text-secondary">
                                  payments
                                </span>
                                {act.cost}
                              </span>
                            </div>

                            {/* AI Suggestion Accept/Replace/Remove Buttons */}
                            {isAiCard && !aiSuggestionAccepted && (
                              <div className="flex items-center gap-2.5 pt-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setAiSuggestionAccepted(true)}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-semibold transition-all shadow-2xs cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    check_circle
                                  </span>
                                  <span>Accept</span>
                                </button>
                                <button
                                  type="button"
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold transition-all cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    swap_horiz
                                  </span>
                                  <span>Replace</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAiSuggestionRemoved(true)}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-high hover:bg-error-container hover:text-on-error-container text-on-surface-variant font-semibold transition-all cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    delete
                                  </span>
                                  <span>Remove</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container-high"
                          aria-label="Options"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            more_vert
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Associated Transit Leg */}
                    {currentShowcase.transits[index] && (
                      <div className="relative pl-6 py-1">
                        <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-xl shadow-2xs border border-surface-container-high/30">
                          <div className="size-7 rounded-full bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                            <span className="material-symbols-outlined text-[18px]">
                              {currentShowcase.transits[index].icon}
                            </span>
                          </div>
                          <div className="flex-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-on-surface">
                                {currentShowcase.transits[index].title}
                              </span>
                              <span className="text-on-surface-variant">
                                • {currentShowcase.transits[index].sub}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-on-surface">
                                {currentShowcase.transits[index].cost}
                              </span>
                              <span className="material-symbols-outlined text-[16px] text-tertiary">
                                {currentShowcase.transits[index].statusIcon}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Add Activity Action Button */}
          <button
            type="button"
            className="w-full py-4 rounded-2xl bg-surface-container-low hover:bg-surface-container text-primary flex items-center justify-center gap-2 text-sm font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">
              add_circle
            </span>
            <span>+ Add Activity to Day {selectedDay}</span>
          </button>
        </div>

        {/* Right Column: Route Topology Map (5 of 12 cols = ~40%) */}
        <div className="lg:col-span-5 flex flex-col gap-4 sticky top-36">
          <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-2xs border border-surface-container-high/40 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  map
                </span>
                <h3 className="text-base font-semibold text-on-surface">
                  Route Topology
                </h3>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-full text-xs text-on-surface-variant font-medium">
                <span className="size-2 rounded-full bg-tertiary animate-pulse" />
                Live GPS Sourced
              </div>
            </div>

            {/* Stylized Map Canvas with Pins & Transit Vector Paths */}
            <div className="relative w-full h-80 bg-surface-container rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              {/* Subtle Road Grid Background */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                fill="none"
                viewBox="0 0 400 320"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  className="text-surface-container-high stroke-current"
                  d="M 20 80 Q 200 60 380 90"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  className="text-surface-container-high stroke-current"
                  d="M 50 20 L 50 300"
                  strokeWidth="2"
                />
                <path
                  className="text-surface-container-high stroke-current"
                  d="M 180 20 L 180 300"
                  strokeWidth="2"
                />
                <path
                  className="text-surface-container-high stroke-current"
                  d="M 320 20 L 320 300"
                  strokeWidth="2"
                />

                {/* Route Vector Polylines */}
                <path
                  className="text-primary stroke-current"
                  d="M 70 90 L 150 90 L 210 240"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
                <path
                  className="text-primary stroke-current"
                  d="M 210 240 Q 240 180 260 130"
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
                <path
                  className="text-secondary stroke-current"
                  d="M 260 130 Q 300 140 330 170"
                  strokeDasharray="3 3"
                  strokeWidth="3"
                />
                <path
                  className="text-primary-container stroke-current"
                  d="M 330 170 Q 220 120 180 85"
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
              </svg>

              {/* Waypoint Pins */}
              {currentShowcase.mapWaypoints.map((wp, idx) => (
                <div
                  key={wp.id}
                  style={{ left: wp.x, top: wp.y }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
                >
                  <span
                    className={`size-7 rounded-full text-xs font-bold flex items-center justify-center shadow-md ring-2 ring-surface-container-lowest ${
                      wp.isAi
                        ? "bg-secondary text-on-secondary"
                        : "bg-primary text-on-primary"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="mt-1 px-1.5 py-0.5 rounded bg-surface/90 backdrop-blur-xs text-[10px] font-semibold text-on-surface shadow-xs truncate max-w-[100px]">
                    {wp.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Waypoint Summary Cards below map */}
            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div className="bg-surface-container-low rounded-xl p-3 flex flex-col">
                <span className="text-[10px] text-on-surface-variant uppercase font-semibold">
                  Transit Coverage
                </span>
                <span className="text-base font-bold text-primary mt-0.5">
                  {currentShowcase.transitKm}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  Walking, Rail &amp; Taxi
                </span>
              </div>
              <div className="bg-surface-container-low rounded-xl p-3 flex flex-col">
                <span className="text-[10px] text-on-surface-variant uppercase font-semibold">
                  Transit Time
                </span>
                <span className="text-base font-bold text-tertiary mt-0.5">
                  {currentShowcase.transitMins}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  All legs scheduled
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-out Group Talk & Live WebRTC Call Drawer */}
      <GroupTalkDrawer
        tripId={tripId}
        tripTitle={tripTitle}
        isOpen={groupTalkOpen}
        onClose={() => setGroupTalkOpen(false)}
      />
    </div>
  );
}
