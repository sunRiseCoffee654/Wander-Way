"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { Database } from "@/lib/types/database";
import { extractWaypointsFromActivities } from "@/lib/itinerary/sync-helpers";
import {
  sortItineraryActivities,
  formatTransitDuration,
  formatTransitDistance,
} from "@/lib/itinerary/helpers";
import {
  calculateHaversineDistance,
  detectTransitMode,
  type WaypointItem,
  type TransitLegItem,
} from "@/lib/itinerary/transit-geometry";
import { VectorItineraryMap } from "@/components/maps/vector-itinerary-map";
import { useOfflineStatus } from "@/lib/offline/use-offline";

type ItineraryDayWithActivities = Database["public"]["Tables"]["itinerary_days"]["Row"] & {
  itinerary_activities: Database["public"]["Tables"]["itinerary_activities"]["Row"][];
};

interface TripMapClientViewProps {
  tripId: string;
  tripTitle: string;
  destination: string;
  dbDays: ItineraryDayWithActivities[];
}

export function TripMapClientView({
  tripId,
  tripTitle,
  destination,
  dbDays,
}: TripMapClientViewProps) {
  const hasCustomSchedule = Boolean(dbDays && dbDays.length > 0);
  const defaultDay = hasCustomSchedule ? (dbDays[0]?.day_number || 1) : 1;
  const [selectedDay, setSelectedDay] = useState<number>(defaultDay);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const { isOffline } = useOfflineStatus(tripId);

  // Day navigation tabs
  const daysList = useMemo(() => {
    if (hasCustomSchedule) {
      return dbDays.map((d) => ({
        dayNumber: d.day_number,
        date: d.calendar_date
          ? new Date(d.calendar_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : `Day ${d.day_number}`,
        weather: "20°C",
        title: d.title || `Day ${d.day_number}`,
      }));
    }
    return [{ dayNumber: 1, date: "Day 1", weather: "20°C", title: "Day 1" }];
  }, [hasCustomSchedule, dbDays]);

  const currentDbDay = useMemo(() => {
    if (!hasCustomSchedule) return null;
    return dbDays.find((d) => d.day_number === selectedDay) || dbDays[0] || null;
  }, [hasCustomSchedule, dbDays, selectedDay]);

  const currentDbActivities = useMemo(() => {
    return currentDbDay?.itinerary_activities
      ? sortItineraryActivities(currentDbDay.itinerary_activities)
      : [];
  }, [currentDbDay]);

  // Resolve waypoints from activities
  const waypoints = useMemo<WaypointItem[]>(() => {
    return extractWaypointsFromActivities(currentDbActivities);
  }, [currentDbActivities]);

  // Resolve transit legs between consecutive waypoints
  const transitLegs = useMemo<TransitLegItem[]>(() => {
    const legs: TransitLegItem[] = [];
    if (currentDbActivities.length > 1) {
      for (let i = 0; i < currentDbActivities.length - 1; i++) {
        const from = currentDbActivities[i];
        const to = currentDbActivities[i + 1];
        if (
          from.latitude !== null &&
          from.longitude !== null &&
          to.latitude !== null &&
          to.longitude !== null
        ) {
          const dist = from.transit_distance_meters ?? calculateHaversineDistance(from.latitude, from.longitude, to.latitude, to.longitude);
          const dur = from.transit_duration_seconds ?? Math.round(dist / 1.3);
          const mode = from.travel_mode_to_next === "transit" ? "metro" : from.travel_mode_to_next === "drive" ? "taxi" : detectTransitMode(dist);
          legs.push({
            fromId: from.id,
            toId: to.id,
            mode,
            distanceMeters: dist,
            durationSeconds: dur,
          });
        }
      }
    }
    return legs;
  }, [currentDbActivities]);

  // Aggregate metrics
  const totalMeters = useMemo(() => {
    return transitLegs.reduce((acc, leg) => acc + (leg.distanceMeters ?? 0), 0);
  }, [transitLegs]);

  const totalMinutes = useMemo(() => {
    const totalSecs = transitLegs.reduce((acc, leg) => {
      const dur = leg.durationSeconds ?? Math.round((leg.distanceMeters ?? 0) / 1.3);
      return acc + dur;
    }, 0);
    return Math.max(1, Math.round(totalSecs / 60));
  }, [transitLegs]);

  return (
    <div className="flex flex-col w-full h-[calc(100vh-80px)] min-h-[600px] overflow-hidden">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-surface border-b border-surface-container-high/40 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href={`/trips/${tripId}` as Route}
            className="size-8 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
            title="Back to Itinerary"
            aria-label="Back to Itinerary"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                {tripTitle}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-semibold">
                Vector Topology
              </span>
              {isOffline && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">offline_pin</span>
                  Offline
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant">
              {destination} • Day {selectedDay} active • {waypoints.length} waypoints • {formatTransitDistance(totalMeters)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Day Selector Pills */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-sm sm:max-w-none">
            {daysList.map((d) => (
              <button
                key={d.dayNumber}
                type="button"
                onClick={() => {
                  setSelectedDay(d.dayNumber);
                  setActiveActivityId(null);
                }}
                className={`px-3 py-1.5 rounded-full text-xs transition-all shrink-0 cursor-pointer ${
                  selectedDay === d.dayNumber
                    ? "bg-primary text-on-primary font-bold shadow-xs"
                    : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-medium"
                }`}
              >
                Day {d.dayNumber}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPanelOpen(!panelOpen)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            title={panelOpen ? "Collapse sidebar" : "Show sidebar"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {panelOpen ? "view_sidebar" : "vertical_split"}
            </span>
            <span className="hidden sm:inline">{panelOpen ? "Hide Panel" : "Show Waypoints"}</span>
          </button>

          <Link
            href={`/trips/${tripId}` as Route}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition-all shrink-0 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">view_timeline</span>
            <span>Timeline</span>
          </Link>
        </div>
      </div>

      {/* Main Map + Collapsible Details View */}
      <div className="relative flex-1 w-full overflow-hidden flex">
        {/* Fullscreen Map Canvas */}
        <div className="flex-1 w-full h-full relative">
          <VectorItineraryMap
            destination={destination}
            waypoints={waypoints}
            transitLegs={transitLegs}
            activeActivityId={activeActivityId}
            onSelectWaypoint={setActiveActivityId}
            className="w-full h-full rounded-none"
            isOffline={isOffline}
          />
        </div>

        {/* Collapsible Waypoints & Route Legs Panel */}
        {panelOpen && (
          <aside className="absolute top-3 left-3 bottom-3 w-80 sm:w-96 max-w-[calc(100vw-24px)] bg-surface/95 backdrop-blur-md rounded-2xl border border-surface-container-high/60 shadow-xl flex flex-col overflow-hidden z-20 animate-in fade-in slide-in-from-left-4 duration-200">
            {/* Panel Header */}
            <div className="p-4 border-b border-surface-container-high/40 bg-surface-container-lowest/80 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-on-surface">
                  Day {selectedDay}: Route Waypoints
                </h2>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  {waypoints.length} stops • {formatTransitDistance(totalMeters)} total movement • ~{totalMinutes} mins
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="size-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                title="Close panel"
                aria-label="Close panel"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Panel Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Route Summary Card */}
              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/40 text-xs">
                <span className="font-semibold text-on-surface mb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">route</span>
                  Route Leg Summaries
                </span>
                {transitLegs.length === 0 ? (
                  <p className="text-on-surface-variant text-[11px]">
                    No transit legs recorded for this day yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {transitLegs.map((leg, idx) => (
                      <div
                        key={`leg-${idx}`}
                        className="flex items-center justify-between bg-surface-container-lowest px-2.5 py-1.5 rounded-lg border border-surface-container-high/30"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            {leg.mode === "walk" ? "directions_walk" : leg.mode === "shinkansen" ? "train" : "subway"}
                          </span>
                          <span className="font-medium text-on-surface capitalize">
                            Leg {idx + 1}: {leg.mode}
                          </span>
                        </div>
                        <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
                          <span>{formatTransitDistance(leg.distanceMeters)}</span>
                          <span>•</span>
                          <span>{formatTransitDuration(leg.durationSeconds)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Waypoints List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-on-surface px-1 block">
                  Scheduled Waypoints
                </span>
                {waypoints.length === 0 ? (
                  <div className="p-4 text-center text-xs text-on-surface-variant">
                    No waypoints with resolved GPS coordinates on this day.
                  </div>
                ) : (
                  waypoints.map((wp) => {
                    const isSelected = activeActivityId === wp.id;
                    return (
                      <div
                        key={wp.id}
                        onClick={() => setActiveActivityId(wp.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary-fixed/30 border-primary shadow-sm"
                            : "bg-surface-container-lowest hover:bg-surface-container-low border-surface-container-high/40"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              wp.isAi
                                ? "bg-secondary text-on-secondary"
                                : "bg-primary text-on-primary"
                            }`}
                          >
                            {wp.step}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-xs font-bold text-on-surface truncate">
                                {wp.title}
                              </h3>
                              {wp.time && (
                                <span className="text-[10px] text-on-surface-variant font-medium shrink-0">
                                  {wp.time}
                                </span>
                              )}
                            </div>
                            {wp.category && (
                              <span className="text-[10px] text-on-surface-variant block truncate mt-0.5">
                                {wp.category}
                              </span>
                            )}
                            <div className="text-[10px] text-outline mt-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px] text-primary">location_on</span>
                              <span>{wp.lat.toFixed(4)}°, {wp.lng.toFixed(4)}°</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
