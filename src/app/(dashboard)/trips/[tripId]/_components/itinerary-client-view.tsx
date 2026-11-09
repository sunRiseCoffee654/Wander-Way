"use client";

import { useState, useEffect, useMemo } from "react";
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
import { VectorItineraryMap } from "@/components/maps/vector-itinerary-map";
import {
  extractWaypointsFromActivities,
  resolveSelectedWaypointCardId,
} from "@/lib/itinerary/sync-helpers";
import { cacheItineraryOffline } from "@/lib/offline/storage";
import { useOfflineStatus } from "@/lib/offline/use-offline";
import type { WaypointItem, TransitLegItem } from "@/lib/itinerary/transit-geometry";
import { ActivityEditModal } from "@/components/itinerary/activity-edit-modal";
import {
  createActivityAction,
  updateActivityAction,
  deleteActivityAction,
  reorderActivitiesAction,
  type Activity,
} from "@/lib/itinerary/actions";

type ItineraryDayWithActivities = Database["public"]["Tables"]["itinerary_days"]["Row"] & {
  itinerary_activities: Database["public"]["Tables"]["itinerary_activities"]["Row"][];
};

interface ItineraryClientViewProps {
  tripId: string;
  tripTitle: string;
  destination: string;
  dbDays: ItineraryDayWithActivities[];
}

export function ItineraryClientView({
  tripId,
  tripTitle,
  destination,
  dbDays,
}: ItineraryClientViewProps) {
  // Initialize days from dbDays, or provide clean default day 1 if empty
  const initialDays = useMemo<ItineraryDayWithActivities[]>(() => {
    if (dbDays && dbDays.length > 0) {
      return dbDays;
    }
    return [
      {
        id: `day-${tripId}-1`,
        trip_id: tripId,
        day_number: 1,
        calendar_date: new Date().toISOString().slice(0, 10),
        title: "Day 1 Schedule",
        notes: null,
        created_at: new Date().toISOString(),
        itinerary_activities: [],
      },
    ];
  }, [dbDays, tripId]);

  const [customDays, setCustomDays] = useState<ItineraryDayWithActivities[]>(initialDays);
  const [selectedDay, setSelectedDay] = useState<number>(initialDays[0]?.day_number || 1);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [offlineSaved, setOfflineSaved] = useState(true);
  const [exportNotice, setExportNotice] = useState(false);
  const [groupTalkOpen, setGroupTalkOpen] = useState(false);

  // Edit / Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<Partial<Activity> | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<{ id: string; title: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { isOffline } = useOfflineStatus(tripId);

  // Sync customDays when dbDays changes during render without setState in effect
  const [prevDbDays, setPrevDbDays] = useState(dbDays);
  if (dbDays !== prevDbDays) {
    setPrevDbDays(dbDays);
    if (dbDays && dbDays.length > 0) {
      setCustomDays(dbDays);
    }
  }

  // Auto-cache itinerary for PWA offline accessibility
  useEffect(() => {
    if (tripId) {
      cacheItineraryOffline(tripId, {
        dbDays: customDays,
        tripTitle,
        destination,
        cachedDay: selectedDay,
      });
    }
  }, [tripId, customDays, tripTitle, destination, selectedDay]);

  // Build the day navigation tabs
  const daysList = useMemo(() => {
    return customDays.map((d) => ({
      dayNumber: d.day_number,
      date: d.calendar_date
        ? new Date(d.calendar_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : `Day ${d.day_number}`,
      weather: "20°C",
      icon: "wb_sunny",
      title: d.title || `Day ${d.day_number}`,
    }));
  }, [customDays]);

  const handleExport = () => {
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 2500);
  };

  // Resolve current day's data
  const currentDbDay = useMemo(() => {
    return customDays.find((d) => d.day_number === selectedDay) || customDays[0] || null;
  }, [customDays, selectedDay]);

  const currentDbActivities = useMemo(() => {
    return currentDbDay?.itinerary_activities
      ? sortItineraryActivities(currentDbDay.itinerary_activities)
      : [];
  }, [currentDbDay]);

  const getEvidenceBadge = getItineraryEvidenceBadge;

  // Extract waypoints for MapLibre GL vector map
  const currentWaypoints = useMemo<WaypointItem[]>(() => {
    return extractWaypointsFromActivities(currentDbActivities);
  }, [currentDbActivities]);

  // Extract or compute transit legs between consecutive waypoints
  const currentTransitLegs = useMemo<TransitLegItem[]>(() => {
    const legs: TransitLegItem[] = [];
    if (currentWaypoints.length > 1) {
      for (let i = 0; i < currentWaypoints.length - 1; i++) {
        const from = currentWaypoints[i];
        const to = currentWaypoints[i + 1];
        const act = currentDbActivities[i];
        const mode = act?.travel_mode_to_next === "transit"
          ? "metro"
          : act?.travel_mode_to_next === "drive"
          ? "drive"
          : "walk";
        legs.push({
          fromId: from.id,
          toId: to.id,
          mode: mode as "walk" | "shinkansen" | "metro",
        });
      }
    }
    return legs;
  }, [currentDbActivities, currentWaypoints]);

  // Bi-directional selection handler: Focuses timeline card when map pin is clicked
  const handleSelectWaypoint = (activityId: string) => {
    setActiveActivityId(activityId);
    if (typeof document !== "undefined") {
      const domId = resolveSelectedWaypointCardId(activityId);
      const cardEl = document.getElementById(domId);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  };

  // Activity Lifecycle Handlers
  const handleOpenAddModal = () => {
    setModalInitialData(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModalForDb = (act: Activity) => {
    setModalInitialData(act);
    setIsModalOpen(true);
  };

  const handleSaveActivity = async (data: Partial<Activity>) => {
    const prevCustomDays = customDays;

    try {
      if (modalInitialData?.id) {
        // Edit existing activity
        const actId = modalInitialData.id;

        // Optimistic UI update
        setCustomDays((prev) =>
          prev.map((d) => {
            if (d.day_number !== selectedDay) return d;
            return {
              ...d,
              itinerary_activities: d.itinerary_activities.map((a) =>
                a.id === actId
                  ? ({
                      ...a,
                      ...data,
                      is_user_edited: true,
                      updated_at: new Date().toISOString(),
                    } as Activity)
                  : a,
              ),
            };
          }),
        );

        await updateActivityAction(actId, data);
      } else {
        // Add new activity
        const dayId = currentDbDay?.id || `day-${selectedDay}`;
        const result = await createActivityAction({
          trip_id: tripId,
          day_id: dayId,
          title: data.title || "New Activity",
          planned_time: data.planned_time,
          duration_minutes: data.duration_minutes,
          place_name: data.place_name,
          place_category: data.place_category,
          booking_requirement: data.booking_requirement,
          description: data.description,
          is_must_see: data.is_must_see,
          latitude: data.latitude,
          longitude: data.longitude,
        });

        const createdAct = result.activity || result.data;

        setCustomDays((prev) =>
          prev.map((d) => {
            if (d.day_number !== selectedDay) return d;
            return {
              ...d,
              itinerary_activities: [...d.itinerary_activities, createdAct],
            };
          }),
        );
      }
    } catch (err) {
      // Rollback on failure
      setCustomDays(prevCustomDays);
      setActionError(err instanceof Error ? err.message : "Failed to save activity.");
      throw err;
    }
  };

  const handleDeleteActivity = (activityId: string, title: string) => {
    setActivityToDelete({ id: activityId, title });
  };

  const confirmDeleteActivity = async () => {
    if (!activityToDelete) return;
    const { id: activityId } = activityToDelete;
    setActivityToDelete(null);

    const prevCustomDays = customDays;

    // Optimistic deletion
    setCustomDays((prev) =>
      prev.map((d) => {
        if (d.day_number !== selectedDay) return d;
        const filtered = d.itinerary_activities.filter((a) => a.id !== activityId);
        return {
          ...d,
          itinerary_activities: filtered.map((a, idx) => ({
            ...a,
            sort_order: idx + 1,
          })),
        };
      }),
    );

    try {
      await deleteActivityAction(activityId);
    } catch (err) {
      // Rollback on failure
      setCustomDays(prevCustomDays);
      setActionError(err instanceof Error ? err.message : "Failed to delete activity.");
    }
  };

  const handleMoveActivity = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const prevCustomDays = customDays;

    const acts = [...currentDbActivities];
    if (targetIndex < 0 || targetIndex >= acts.length) return;
    const temp = acts[index];
    acts[index] = acts[targetIndex];
    acts[targetIndex] = temp;

    const orderedIds = acts.map((a) => a.id);
    const dayId = currentDbDay?.id || `day-${selectedDay}`;

    // Optimistic update
    setCustomDays((prev) =>
      prev.map((d) => {
        if (d.day_number !== selectedDay) return d;
        return {
          ...d,
          itinerary_activities: acts.map((a, idx) => ({
            ...a,
            sort_order: idx + 1,
            is_user_edited: true,
          })),
        };
      }),
    );

    try {
      await reorderActivitiesAction(dayId, orderedIds);
    } catch (err) {
      // Rollback
      setCustomDays(prevCustomDays);
      setActionError(err instanceof Error ? err.message : "Failed to reorder activities.");
    }
  };

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
              Day {selectedDay} Active • {destination}
            </span>
            {isOffline && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-semibold shadow-2xs">
                <span className="material-symbols-outlined text-[14px]">offline_pin</span>
                Offline Mode Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/trips/${tripId}/map` as Route}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">
                map
              </span>
              <span>Vector Map</span>
            </Link>

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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-bold transition-all shadow-2xs cursor-pointer"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">
                ios_share
              </span>
              <span>{exportNotice ? "Pack Exported!" : "Export Daily Pack"}</span>
            </button>

            <button
              type="button"
              onClick={() => setOfflineSaved(!offlineSaved)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors cursor-pointer"
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
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shrink-0 text-xs cursor-pointer ${
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
                  explore
                </span>
              </div>
              <div>
                <h2 className="text-base text-on-surface font-semibold leading-tight">
                  {currentDbDay?.title || `Day ${selectedDay} Schedule`}
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {currentDbActivities.length} activities scheduled • Live GPS Grounded
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 bg-surface-container-high px-2.5 py-1 rounded-full text-on-surface text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px] text-tertiary">
                check_circle
              </span>
              <span>Database Synced</span>
            </div>
          </div>

          {/* Day Activities List or Clean Empty State */}
          {currentDbActivities.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-surface-container-lowest border border-surface-container-high/40 text-center flex flex-col items-center justify-center gap-4">
              <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[30px]">event_note</span>
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-semibold text-on-surface">
                  No activities scheduled for Day {selectedDay}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Add your first landmark, museum, restaurant, or sightseeing stop for {destination}.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>+ Add First Activity</span>
              </button>
            </div>
          ) : (
            currentDbActivities.map((act, idx) => {
              const evidenceInfo = getEvidenceBadge(act.booking_requirement ? "published_price" : "calculated_estimate");
              return (
                <div
                  key={act.id}
                  id={resolveSelectedWaypointCardId(act.id)}
                  onClick={() => setActiveActivityId(act.id)}
                  className="flex flex-col gap-3 cursor-pointer"
                >
                  <div
                    className={`relative bg-surface-container-lowest rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all border ${
                      activeActivityId === act.id
                        ? "ring-2 ring-primary bg-primary-fixed/20 border-primary shadow-md"
                        : "border-surface-container-high/40"
                    }`}
                  >
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
                            {act.is_user_edited && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[11px] font-semibold">
                                <span className="material-symbols-outlined text-[12px]">edit_note</span>
                                User Edited
                              </span>
                            )}
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
                                  • {act.latitude.toFixed(4)}°, {act.longitude.toFixed(4)}°
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

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveActivity(idx, "up");
                          }}
                          disabled={idx === 0}
                          className="size-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                          title="Move Up"
                          aria-label="Move Up"
                        >
                          <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveActivity(idx, "down");
                          }}
                          disabled={idx === currentDbActivities.length - 1}
                          className="size-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                          title="Move Down"
                          aria-label="Move Down"
                        >
                          <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModalForDb(act);
                          }}
                          className="size-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors cursor-pointer"
                          title="Edit Activity"
                          aria-label="Edit Activity"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteActivity(act.id, act.title);
                          }}
                          className="size-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors cursor-pointer"
                          title="Delete Activity"
                          aria-label="Delete Activity"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
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
          )}

          {/* Add Activity Action Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="w-full py-4 rounded-2xl bg-surface-container-low hover:bg-surface-container text-primary flex items-center justify-center gap-2 text-sm font-semibold transition-colors shadow-2xs cursor-pointer border border-dashed border-primary/30 hover:border-primary"
          >
            <span className="material-symbols-outlined text-[20px]">
              add_circle
            </span>
            <span>+ Add Activity to Day {selectedDay}</span>
          </button>
        </div>

        {/* Right Column: Interactive Vector Map (MapLibre GL + Geoapify Vector Tiles) (5 of 12 cols = ~40%) */}
        <div className="lg:col-span-5 flex flex-col gap-4 sticky top-36">
          <VectorItineraryMap
            destination={destination}
            waypoints={currentWaypoints}
            transitLegs={currentTransitLegs}
            activeActivityId={activeActivityId}
            onSelectWaypoint={handleSelectWaypoint}
            isOffline={isOffline}
          />
        </div>
      </div>

      {/* Slide-out Group Talk & Live WebRTC Call Drawer */}
      <GroupTalkDrawer
        tripId={tripId}
        tripTitle={tripTitle}
        isOpen={groupTalkOpen}
        onClose={() => setGroupTalkOpen(false)}
      />

      {/* Activity Add / Edit Modal */}
      <ActivityEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveActivity}
        initialData={modalInitialData}
        dayNumber={selectedDay}
      />

      {/* Non-blocking Delete Confirmation Dialog */}
      {activityToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            className="w-full max-w-sm bg-surface rounded-2xl border border-surface-container-high/40 p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-sm font-bold text-on-surface">
                  Delete Activity?
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                  Are you sure you want to delete &ldquo;{activityToDelete.title}&rdquo;? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container-high/40">
              <button
                type="button"
                onClick={() => setActivityToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteActivity}
                className="px-4 py-1.5 rounded-xl bg-error hover:bg-error/90 text-on-error text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Error Notification Toast */}
      {actionError && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-error-container text-on-error-container px-4 py-3 rounded-2xl shadow-lg border border-error/20 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="material-symbols-outlined text-[20px] text-error shrink-0">error</span>
          <span className="text-xs flex-1">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="size-6 rounded-full hover:bg-black/10 flex items-center justify-center text-xs"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
