"use client";

import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Compass,
  Edit2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BudgetBasis, TravelPace } from "@/lib/ai/types";

interface ReviewInputsData {
  title: string;
  destination: string;
  originLocation: string;
  startDate: string;
  endDate: string;
  adultCount: number;
  childCount: number;
  roomCount: number;
  hasBudget: boolean;
  budgetAmount: string;
  budgetCurrency: string;
  budgetBasis: BudgetBasis;
  travelPace: TravelPace;
  interests: string[];
  notes: string;
}

interface ReviewInputsSectionProps {
  data: ReviewInputsData;
  onJumpToStep: (stepIndex: number) => void;
  onGenerate: () => void;
  onStartManual: () => void;
  isSubmitting: boolean;
  submitError?: string | null;
}

export function ReviewInputsSection({
  data,
  onJumpToStep,
  onGenerate,
  onStartManual,
  isSubmitting,
  submitError,
}: ReviewInputsSectionProps) {
  const dayCount =
    data.startDate && data.endDate && data.endDate >= data.startDate
      ? Math.round(
          (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Step 4 of 4
        </span>
        <h2 className="mt-1 font-serif text-2xl font-semibold tracking-[-0.01em] text-text-primary sm:text-3xl">
          Review your trip brief
        </h2>
        <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
          Verify your parameters before synthesizing a proposal. You can generate a grounded AI plan or start manually.
        </p>
      </div>

      {submitError && (
        <div className="flex items-start gap-3 rounded-panel border border-error-fg/30 bg-error-bg p-4 text-sm text-error-fg">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <div>
            <div className="font-semibold">Unable to generate proposal</div>
            <p className="mt-0.5 text-xs">{submitError}</p>
          </div>
        </div>
      )}

      {/* Structured Editorial Summary Cards */}
      <div className="space-y-4">
        {/* Where and When Card */}
        <div className="rounded-panel border border-border-subtle bg-surface p-5 shadow-xs transition-colors hover:border-control-border">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <MapPin className="size-3.5" />
                <span>Destination & Dates</span>
              </div>
              <div className="font-serif text-xl font-bold text-text-primary">
                {data.destination || "Destination not specified"}
              </div>
              {data.title && (
                <div className="text-xs text-text-muted">Trip Title: {data.title}</div>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-text-secondary">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-text-muted" />
                  {data.startDate} → {data.endDate}
                </span>
                <span className="rounded-control bg-selected-bg px-2 py-0.5 font-medium text-on-selected text-[11px]">
                  {dayCount} {dayCount === 1 ? "day" : "days"} / {dayCount - 1} nights
                </span>
                {data.originLocation && (
                  <span className="text-text-muted">Starting from {data.originLocation}</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onJumpToStep(0)}
              className="flex items-center gap-1 rounded-control border border-border-subtle bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              <Edit2 className="size-3 text-text-muted" />
              <span>Change</span>
            </button>
          </div>
        </div>

        {/* Travellers and Budget Card */}
        <div className="rounded-panel border border-border-subtle bg-surface p-5 shadow-xs transition-colors hover:border-control-border">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <Users className="size-3.5" />
                <span>Party & Budget</span>
              </div>
              <div className="text-sm font-semibold text-text-primary">
                {data.adultCount} {data.adultCount === 1 ? "Adult" : "Adults"}
                {data.childCount > 0 && `, ${data.childCount} ${data.childCount === 1 ? "Child" : "Children"}`}
                {" • "}
                {data.roomCount} {data.roomCount === 1 ? "Room" : "Rooms"}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <DollarSign className="size-3.5 text-text-muted" />
                {data.hasBudget && data.budgetAmount ? (
                  <span>
                    Target:{" "}
                    <strong>
                      {data.budgetCurrency} {Number(data.budgetAmount).toLocaleString()}
                    </strong>{" "}
                    ({data.budgetBasis === "total" ? "Total trip" : "Per person"})
                  </span>
                ) : (
                  <span className="text-text-muted">No budget ceiling specified (Flexible)</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onJumpToStep(1)}
              className="flex items-center gap-1 rounded-control border border-border-subtle bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              <Edit2 className="size-3 text-text-muted" />
              <span>Change</span>
            </button>
          </div>
        </div>

        {/* Preferences & Interests Card */}
        <div className="rounded-panel border border-border-subtle bg-surface p-5 shadow-xs transition-colors hover:border-control-border">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <Compass className="size-3.5" />
                <span>Pacing & Selected Themes</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="capitalize font-semibold text-sm text-text-primary">
                  {data.travelPace} pace
                </span>
                <span className="text-xs text-text-muted">
                  (
                  {data.travelPace === "relaxed"
                    ? "2–3 stops/day"
                    : data.travelPace === "full"
                      ? "5–6 stops/day"
                      : "3–4 stops/day"}
                  )
                </span>
              </div>
              {data.interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {data.interests.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-control bg-surface-elevated px-2 py-0.5 text-[11px] font-medium text-text-secondary border border-border-subtle"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {data.notes && (
                <div className="pt-1 text-xs text-text-secondary italic">
                  &ldquo;{data.notes}&rdquo;
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onJumpToStep(2)}
              className="flex items-center gap-1 rounded-control border border-border-subtle bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              <Edit2 className="size-3 text-text-muted" />
              <span>Change</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Decision Block */}
      <div className="rounded-panel border border-primary/20 bg-selected-bg/30 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 text-primary shrink-0" />
          <div>
            <h3 className="font-serif text-base font-bold text-text-primary">
              Ready to create your grounded plan?
            </h3>
            <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">
              Gemini will draft your day-by-day stops and Geoapify will resolve map locations and
              transit times. You will review and approve everything on an interactive split map before
              anything is applied.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            onClick={onGenerate}
            disabled={isSubmitting || !data.destination || !data.startDate || !data.endDate}
            className="gap-2 shadow-xs flex-1 justify-center"
          >
            <Sparkles className="size-4" />
            <span>Generate proposal with Gemini</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={isSubmitting || !data.destination || !data.startDate || !data.endDate}
            onClick={onStartManual}
            className="flex-1 justify-center"
          >
            Start with empty manual itinerary
          </Button>
        </div>
      </div>
    </div>
  );
}
