"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Ticket,
  Car,
  Footprints,
  ArrowLeft,
  Sparkles,
  Layers,
  Map as MapIcon,
  List as ListIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenerationProgress } from "@/components/ai/generation-progress";
import { SameDayMap } from "@/components/maps/same-day-map";
import type {
  TripProposalRecord,
  GroundedDay,
  MatchTier,
  BookingHint,
} from "@/lib/ai/types";

interface ProposalReviewClientProps {
  initialProposal: TripProposalRecord;
  tripId: string;
}

export function ProposalReviewClient({
  initialProposal,
  tripId,
}: ProposalReviewClientProps) {
  const router = useRouter();
  const [proposal, setProposal] = useState<TripProposalRecord>(initialProposal);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  // Synchronously initialize selected activity IDs from initial proposal (prevents CLS & cascading render)
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(() => {
    const initialSet = new Set<string>();
    if (initialProposal.status === "pending_review" && initialProposal.proposal_data?.days) {
      for (const day of initialProposal.proposal_data.days) {
        for (const act of day.activities) {
          if (act.match_tier === "matched_high") {
            initialSet.add(act.id);
          }
        }
      }
    }
    return initialSet;
  });

  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"itinerary" | "map">("itinerary");
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Poll for status updates if still generating
  useEffect(() => {
    if (proposal.status !== "generating") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/trips/proposals/${proposal.id}`);
        if (res.ok) {
          const updated: TripProposalRecord = await res.json();
          setProposal(updated);

          if (updated.status === "pending_review" && updated.proposal_data?.days) {
            setSelectedActivityIds((prev) => {
              if (prev.size > 0) return prev;
              const next = new Set<string>();
              for (const day of updated.proposal_data.days) {
                for (const act of day.activities) {
                  if (act.match_tier === "matched_high") {
                    next.add(act.id);
                  }
                }
              }
              return next;
            });
          }
        }
      } catch (err) {
        console.error("Error polling proposal:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [proposal.id, proposal.status]);

  function toggleActivitySelection(id: string) {
    setSelectedActivityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleApplyProposal() {
    setIsApplying(true);
    setApplyError(null);

    try {
      const res = await fetch("/api/trips/apply-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.id,
          selectedActivityIds: Array.from(selectedActivityIds),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to apply proposal to trip.");
      }

      router.push(`/trips/${tripId}` as Route);
      router.refresh();
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err));
      setIsApplying(false);
    }
  }

  // If still generating or failed, show progress / retry tracker
  if (proposal.status === "generating" || proposal.status === "failed") {
    return (
      <div className="mx-auto max-w-app px-4 py-16 sm:px-6 lg:px-8">
        <GenerationProgress
          status={proposal.status}
          stage={proposal.stage}
          errorCode={proposal.error_code}
          onRetry={() => router.push("/trips/new" as Route)}
        />
      </div>
    );
  }

  const days: GroundedDay[] = proposal.proposal_data?.days || [];
  const currentDay = days[selectedDayIdx];
  const stats = proposal.grounding_stats;
  const destination = proposal.input_snapshot?.destination || "Destination";

  const totalActivitiesCount = days.reduce((acc, d) => acc + d.activities.length, 0);
  const selectedCount = selectedActivityIds.size;

  return (
    <div className="mx-auto w-full max-w-app px-4 py-8 sm:px-6 sm:py-12 lg:px-8 pb-32">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="size-3.5" />
            <span>Field Atlas Proposal Review</span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-[-0.01em] text-text-primary sm:text-4xl">
            Review proposed itinerary
          </h1>
          <p className="mt-1 text-sm text-text-secondary max-w-2xl">
            {proposal.summary ||
              "Inspect stops, verify map locations, and accept changes. Unverified places have no invented pins."}
          </p>
        </div>

        <Button
          as="a"
          href={`/trips/${tripId}`}
          variant="outline"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to trip</span>
        </Button>
      </div>

      {/* Grounding Stats & Honest Limitation Bar */}
      {stats && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-panel border border-border-subtle bg-surface p-4 text-xs">
          <div className="flex items-center gap-1.5 text-text-primary font-medium">
            <CheckCircle2 className="size-4 text-success-fg" />
            <span>{stats.matched_high} places located on map</span>
          </div>
          {stats.matched_low > 0 && (
            <div className="flex items-center gap-1.5 text-warning-fg font-medium">
              <AlertTriangle className="size-4" />
              <span>{stats.matched_low} places need location check</span>
            </div>
          )}
          {stats.unresolved > 0 && (
            <div className="flex items-center gap-1.5 text-text-muted">
              <HelpCircle className="size-4" />
              <span>{stats.unresolved} unresolved (no fake pins)</span>
            </div>
          )}
          <div className="ml-auto text-text-muted">
            {stats.computed_legs} of {stats.total_legs} transit legs estimated
          </div>
        </div>
      )}

      {/* Mobile Tab Toggle (List vs Map) */}
      <div className="mt-6 flex lg:hidden border-b border-border-subtle pb-2">
        <button
          type="button"
          onClick={() => setMobileTab("itinerary")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-control transition-colors ${
            mobileTab === "itinerary"
              ? "bg-selected-bg text-on-selected"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <ListIcon className="size-3.5" />
          <span>Itinerary List</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("map")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-control transition-colors ${
            mobileTab === "map"
              ? "bg-selected-bg text-on-selected"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <MapIcon className="size-3.5" />
          <span>Same-Day Map</span>
        </button>
      </div>

      {/* Day Selector Tabs */}
      {days.length > 0 && (
        <div className="mt-6 flex gap-2 overflow-x-auto border-b border-border-subtle pb-3">
          {days.map((day, idx) => {
            const isSelected = selectedDayIdx === idx;
            const selectedInDayCount = day.activities.filter((a) =>
              selectedActivityIds.has(a.id),
            ).length;

            return (
              <button
                key={day.day_number}
                type="button"
                onClick={() => {
                  setSelectedDayIdx(idx);
                  setActiveActivityId(null);
                }}
                className={`flex shrink-0 flex-col items-start rounded-panel border px-4 py-2.5 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-selected-bg/40 text-text-primary shadow-xs ring-1 ring-primary"
                    : "border-border-subtle bg-surface text-text-secondary hover:bg-surface-elevated"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-serif text-sm font-semibold text-text-primary">
                    Day {day.day_number}
                  </span>
                  {day.calendar_date && (
                    <span className="text-[11px] text-text-muted">
                      {new Date(day.calendar_date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
                <span className="mt-1 text-[11px] font-medium text-text-secondary">
                  {selectedInDayCount} of {day.activities.length} selected
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main 55/45 Split Workspace (UI_UX_PLAN.md §5.4 & §5.5) */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Itinerary List (55% on desktop, lg:col-span-7) */}
        <div className={`space-y-6 lg:col-span-7 ${mobileTab === "map" ? "hidden lg:block" : "block"}`}>
          {currentDay && (
            <div>
              <div className="flex items-baseline justify-between border-b border-border-subtle pb-3">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-text-primary">
                    Day {currentDay.day_number}: {currentDay.title}
                  </h2>
                  {currentDay.theme && (
                    <p className="mt-0.5 text-xs text-text-secondary">{currentDay.theme}</p>
                  )}
                </div>
                <span className="text-xs text-text-muted">
                  {currentDay.activities.length} proposed stops
                </span>
              </div>

              {/* Waypoint Activity Stack */}
              <div className="mt-6 space-y-4">
                {currentDay.activities.map((act, actIdx) => {
                  const isSelected = selectedActivityIds.has(act.id);
                  const isActive = activeActivityId === act.id;
                  const isLast = actIdx === currentDay.activities.length - 1;

                  return (
                    <div key={act.id} className="relative">
                      {/* Activity Card */}
                      <div
                        onClick={() => setActiveActivityId(act.id)}
                        className={`rounded-panel border p-4.5 transition-all cursor-pointer ${
                          isActive
                            ? "border-primary bg-selected-bg/30 ring-2 ring-primary/40 shadow-xs"
                            : isSelected
                              ? "border-border-subtle bg-surface hover:border-control-border shadow-xs"
                              : "border-border-subtle/60 bg-surface/40 opacity-60"
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Selection Checkbox */}
                          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleActivitySelection(act.id)}
                              className="size-4.5 rounded-control text-primary focus:ring-focus cursor-pointer"
                              aria-label={`Select ${act.title}`}
                            />
                          </div>

                          <div className="flex-1 space-y-2.5">
                            {/* Sequence Number, Time, Match Tier & Booking Hint */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="flex size-6 items-center justify-center rounded-full bg-surface-elevated text-xs font-serif font-bold text-text-primary border border-border-subtle shadow-xs">
                                {actIdx + 1}
                              </span>
                              <span className="flex items-center gap-1 font-mono text-xs font-semibold text-text-primary">
                                <Clock className="size-3 text-text-muted" />
                                {act.planned_time || "09:00"}
                              </span>
                              <span className="text-xs text-text-muted">
                                ({act.duration_minutes} min)
                              </span>

                              {/* Match Tier Badge */}
                              <MatchTierBadge tier={act.match_tier} />

                              {/* Booking Hint Badge */}
                              <BookingHintBadge hint={act.booking_hint} />
                            </div>

                            {/* Title & Place Category */}
                            <div>
                              <h3 className="text-base font-semibold text-text-primary tracking-[-0.01em]">
                                {act.title}
                              </h3>
                              <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
                                <MapPin className="size-3.5 text-primary shrink-0" />
                                <span className="font-medium text-text-primary">{act.place_name}</span>
                                {act.place_category && (
                                  <span className="rounded-control bg-surface-elevated px-2 py-0.5 text-[10px] text-text-muted border border-border-subtle">
                                    {act.place_category}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Formatted Address if resolved */}
                            {act.formatted_address && (
                              <p className="text-xs text-text-muted line-clamp-1">
                                {act.formatted_address}
                              </p>
                            )}

                            {/* Description */}
                            {act.description && (
                              <p className="text-xs text-text-secondary leading-relaxed">
                                {act.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Transit Connector to Next Stop */}
                      {!isLast && (
                        <div className="my-2.5 ml-8 flex items-center gap-2 text-xs text-text-muted">
                          <div className="h-4 w-px bg-border-subtle" />
                          {act.travel_mode_to_next === "walk" ? (
                            <Footprints className="size-3.5 text-primary" />
                          ) : (
                            <Car className="size-3.5 text-text-muted" />
                          )}
                          <span>
                            {act.transit_distance_meters
                              ? `${(act.transit_distance_meters / 1000).toFixed(1)} km`
                              : "Transit"}
                            {act.transit_duration_seconds
                              ? ` (~${Math.round(act.transit_duration_seconds / 60)} min ${act.travel_mode_to_next || "transit"})`
                              : " estimated"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Same-Day Map (45% on desktop, lg:col-span-5) */}
        <div
          className={`lg:col-span-5 lg:sticky lg:top-24 space-y-4 ${
            mobileTab === "itinerary" ? "hidden lg:block" : "block"
          }`}
        >
          {currentDay && (
            <SameDayMap
              destination={destination}
              activities={currentDay.activities}
              selectedActivityIds={selectedActivityIds}
              onSelectActivity={(id) => setActiveActivityId(id)}
              activeActivityId={activeActivityId}
            />
          )}

          {/* Map Guidance Card */}
          <div className="rounded-panel border border-border-subtle bg-surface p-4 text-xs text-text-secondary space-y-1.5">
            <div className="font-semibold text-text-primary flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" />
              <span>Map Navigation & Numbering</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Numbered markers match your activity schedule. Solid lagoon pins indicate high-confidence
              verified locations; dashed amber pins represent places requiring manual confirmation.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message if apply fails */}
      {applyError && (
        <div className="mt-6 rounded-panel border border-error-fg/30 bg-error-bg p-4 text-xs text-error-fg">
          {applyError}
        </div>
      )}

      {/* Sticky Bottom Review Action Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border-subtle bg-surface/95 backdrop-blur-md py-4 shadow-elevation-2">
        <div className="mx-auto flex max-w-app items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <div className="text-sm font-semibold text-text-primary">
              {selectedCount} of {totalActivitiesCount} stops selected
            </div>
            <p className="text-xs text-text-muted hidden sm:block">
              Selected activities will be safely appended to your trip without overwriting manual notes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              as="a"
              href={`/trips/${tripId}`}
              variant="outline"
              size="md"
            >
              Discard proposal
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleApplyProposal}
              isLoading={isApplying}
              disabled={isApplying || selectedCount === 0}
              className="gap-2 shadow-xs"
            >
              <Sparkles className="size-4" />
              <span>Apply selected changes</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchTierBadge({ tier }: { tier: MatchTier }) {
  if (tier === "matched_high") {
    return (
      <span className="inline-flex items-center gap-1 rounded-control bg-selected-bg px-2 py-0.5 text-[11px] font-medium text-on-selected">
        <CheckCircle2 className="size-3" />
        <span>Located on map</span>
      </span>
    );
  }

  if (tier === "matched_low") {
    return (
      <span className="inline-flex items-center gap-1 rounded-control bg-warning-bg px-2 py-0.5 text-[11px] font-medium text-warning-fg border border-dashed border-warning-fg/40">
        <AlertTriangle className="size-3" />
        <span>Check location</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-control bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-text-muted border border-border-subtle">
      <HelpCircle className="size-3" />
      <span>Location not found</span>
    </span>
  );
}

function BookingHintBadge({ hint }: { hint: BookingHint }) {
  if (hint === "free") {
    return (
      <span className="rounded-control bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-text-secondary border border-border-subtle">
        Free entry
      </span>
    );
  }

  if (hint === "ticket_likely") {
    return (
      <span className="inline-flex items-center gap-1 rounded-control bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-text-secondary border border-border-subtle">
        <Ticket className="size-2.5 text-text-muted" />
        <span>Ticket likely</span>
      </span>
    );
  }

  if (hint === "reservation_recommended") {
    return (
      <span className="rounded-control bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
        Reservation recommended
      </span>
    );
  }

  return (
    <span className="rounded-control bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-text-muted">
      Hours unverified
    </span>
  );
}
