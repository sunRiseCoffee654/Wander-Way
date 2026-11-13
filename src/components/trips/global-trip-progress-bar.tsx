"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  Route as RouteIcon,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import type {
  ReadinessPillarKey,
  ReadinessPillarSummary,
  TripReadinessSummary,
} from "@/lib/trips/readiness";

interface GlobalTripProgressBarProps {
  tripId: string;
  tripTitle: string;
  destination?: string;
  readiness: TripReadinessSummary;
}

const PILLAR_ICONS: Record<ReadinessPillarKey, typeof RouteIcon> = {
  itinerary: RouteIcon,
  budget: Wallet,
  documents: FileCheck2,
};

function getBarColorClass(status: ReadinessPillarSummary["status"], isOverBudget?: boolean): string {
  if (isOverBudget) return "bg-amber-500";
  if (status === "complete") return "bg-emerald-500";
  if (status === "partial") return "bg-primary";
  return "bg-outline-variant/50";
}

function getBadgeClasses(tier: TripReadinessSummary["tier"]): string {
  if (tier === "ready") {
    return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25";
  }
  if (tier === "in_progress") {
    return "bg-primary/10 text-primary border-primary/20";
  }
  return "bg-surface-container-high text-on-surface-variant border-outline-variant/40";
}

export function GlobalTripProgressBar({
  tripId,
  tripTitle,
  destination,
  readiness,
}: GlobalTripProgressBarProps) {
  const pathname = usePathname() || "";
  const reducedMotion = useReducedMotion();

  const pillars: ReadinessPillarSummary[] = [
    readiness.pillars.itinerary,
    readiness.pillars.budget,
    readiness.pillars.documents,
  ];

  const activePillar: ReadinessPillarKey | null = pathname.includes("/budget")
    ? "budget"
    : pathname.includes("/vault") || pathname.includes("/bookings")
    ? "documents"
    : pathname.startsWith(`/trips/${tripId}`) &&
      !pathname.includes("/packing") &&
      !pathname.includes("/intelligence")
    ? "itinerary"
    : null;

  return (
    <section
      aria-label="Global trip readiness progress"
      data-testid="global-trip-progress-bar"
      className="w-full bg-surface-container-lowest/95 backdrop-blur-md border-b border-surface-container-high/60"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-2.5">
        {/* Top Row: Title, Tier Badge, Overall Percentage & Main Progress Track */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-tight text-on-surface shrink-0">
              <Sparkles className="size-3.5 text-primary" />
              <span>Trip Readiness</span>
            </span>
            <span className="text-on-surface-variant/50 hidden sm:inline">•</span>
            <span className="text-xs font-medium text-on-surface-variant truncate max-w-[260px] sm:max-w-[340px]">
              {tripTitle}
              {destination ? ` — ${destination}` : ""}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getBadgeClasses(readiness.tier)}`}
            >
              {readiness.tier === "ready" && <CheckCircle2 className="size-3" />}
              <span>{readiness.tierLabel}</span>
            </span>
            {readiness.isOverBudget && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                <AlertTriangle className="size-3" />
                <span>Over Budget</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="w-36 sm:w-48 h-2 rounded-full bg-surface-container-high overflow-hidden">
              <motion.div
                role="progressbar"
                aria-label="Overall trip readiness percentage"
                aria-valuenow={readiness.overallPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                initial={reducedMotion ? false : { width: 0 }}
                animate={{ width: `${readiness.overallPercent}%` }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { duration: 0.65, ease: [0.05, 0.7, 0.1, 1.0] }
                }
                className={`h-full rounded-full ${
                  readiness.overallPercent >= 80
                    ? "bg-emerald-500"
                    : readiness.overallPercent >= 40
                    ? "bg-primary"
                    : "bg-secondary"
                }`}
              />
            </div>
            <span
              data-testid="global-readiness-percent"
              className="text-xs font-bold tabular-nums text-on-surface min-w-[4.5rem] text-right"
            >
              {readiness.overallPercent}% Ready
            </span>
          </div>
        </div>

        {/* Bottom Row: 3 Aggregated Pillar Links (Itinerary, Budget, Documents) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {pillars.map((pillar) => {
            const Icon = PILLAR_ICONS[pillar.key];
            const href = `/trips/${tripId}${pillar.hrefSuffix}` as Route;
            const isCurrent = activePillar === pillar.key;
            const barColor = getBarColorClass(
              pillar.status,
              pillar.key === "budget" && readiness.isOverBudget,
            );

            return (
              <Link
                key={pillar.key}
                href={href}
                data-testid={`readiness-pillar-${pillar.key}`}
                className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-all ${
                  isCurrent
                    ? "bg-primary/8 border-primary/30 shadow-2xs"
                    : "bg-surface-container-low/80 border-surface-container-high/50 hover:bg-surface-container hover:border-primary/25"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${
                      pillar.status === "complete"
                        ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                        : isCurrent
                        ? "bg-primary/15 text-primary"
                        : "bg-surface-container-high text-on-surface-variant group-hover:text-primary"
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-on-surface">
                        {pillar.label}
                      </span>
                      <span className="text-[11px] font-bold tabular-nums text-on-surface">
                        {pillar.percent}%
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <motion.div
                          initial={reducedMotion ? false : { width: 0 }}
                          animate={{ width: `${pillar.percent}%` }}
                          transition={
                            reducedMotion
                              ? { duration: 0 }
                              : { duration: 0.55, ease: [0.05, 0.7, 0.1, 1.0] }
                          }
                          className={`h-full rounded-full ${barColor}`}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                      {pillar.detail}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-3.5 text-on-surface-variant/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
