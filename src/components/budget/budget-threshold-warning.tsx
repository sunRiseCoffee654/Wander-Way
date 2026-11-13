"use client";

import { useState } from "react";
import {
  evaluateBudgetThreshold,
  type BudgetThresholdStatus,
} from "@/lib/budget/calculations";
import { formatMinorUnits } from "@/lib/currency/service";

interface BudgetThresholdWarningProps {
  totalAllocatedMinorUnits: number;
  tripLimitMinorUnits: number;
  currency?: string;
  onAdjustCeilingClick?: () => void;
  className?: string;
}

export function BudgetThresholdWarning({
  totalAllocatedMinorUnits,
  tripLimitMinorUnits,
  currency = "INR",
  onAdjustCeilingClick,
  className = "",
}: BudgetThresholdWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [simulationOverride, setSimulationOverride] = useState<number | null>(null);

  // Use simulation override percentage if user clicks test buttons
  const activeAllocatedMinor =
    simulationOverride !== null
      ? Math.round((simulationOverride / 100) * tripLimitMinorUnits)
      : totalAllocatedMinorUnits;

  const threshold: BudgetThresholdStatus = evaluateBudgetThreshold(
    activeAllocatedMinor,
    tripLimitMinorUnits,
    currency
  );

  // Only render if >= 80% threshold reached (or if simulation is testing it)
  if (!threshold.isWarning80 && simulationOverride === null) {
    return (
      <div className={`flex items-center justify-between p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface-variant ${className}`}>
        <div className="flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
          </span>
          <span>
            <strong>Budget Runway Healthy:</strong> {threshold.velocityPercent}% allocated of{" "}
            {formatMinorUnits(tripLimitMinorUnits, currency)} total ceiling. Milestone warnings trigger at <strong>80%</strong> and <strong>95%</strong>.
          </span>
        </div>

        {/* Quick simulator triggers */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSimulationOverride(82)}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer"
            title="Simulate 82% threshold warning"
          >
            Test 80% Warning
          </button>
          <button
            type="button"
            onClick={() => setSimulationOverride(96)}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-500/15 text-red-800 dark:text-red-300 hover:bg-red-500/25 transition-colors cursor-pointer"
            title="Simulate 96% critical threshold"
          >
            Test 95% Critical
          </button>
        </div>
      </div>
    );
  }

  if (isDismissed && simulationOverride === null) {
    return (
      <div className={`flex items-center justify-between px-4 py-2 rounded-xl text-xs font-semibold ${
        threshold.isCritical95
          ? "bg-red-500/15 text-red-800 dark:text-red-300 border border-red-500/30"
          : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
      } ${className}`}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">
            {threshold.bannerClasses.icon}
          </span>
          <span>
            {threshold.badge}: {threshold.velocityPercent}% allocated ({formatMinorUnits(threshold.remainingRunwayMinorUnits, currency)} remaining)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="underline text-[11px] font-bold hover:opacity-80 cursor-pointer"
        >
          View Alert Details
        </button>
      </div>
    );
  }

  const { bannerClasses } = threshold;

  return (
    <div
      className={`w-full transition-all duration-300 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className={`p-4 sm:p-5 rounded-3xl ${bannerClasses.container}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Column: Icon + Badge + Warning Details */}
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xs shadow-xs">
              <span className="material-symbols-outlined text-[24px] text-white animate-pulse">
                {bannerClasses.icon}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${bannerClasses.badge}`}
                >
                  {threshold.badge}
                </span>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/15 text-white/95">
                  {threshold.velocityPercent}% UTILIZATION
                </span>
                <span className="text-[11px] font-semibold text-white/90">
                  Buffer: {formatMinorUnits(threshold.remainingRunwayMinorUnits, currency)} unallocated
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                {threshold.title}
              </h3>

              <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-3xl">
                {threshold.message}{" "}
                <strong className="font-semibold text-white">
                  Guidance: {threshold.recommendation}
                </strong>
              </p>
            </div>
          </div>

          {/* Right Column: Actions & Simulation */}
          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center gap-2.5 shrink-0">
            {onAdjustCeilingClick && (
              <button
                type="button"
                onClick={onAdjustCeilingClick}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-white text-on-surface shadow-xs hover:bg-white/90 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                <span>Adjust Ceiling</span>
              </button>
            )}

            <div className="flex items-center gap-1.5">
              {simulationOverride !== null && (
                <button
                  type="button"
                  onClick={() => setSimulationOverride(null)}
                  className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer"
                >
                  Reset Simulation
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                title="Dismiss warning notification"
                aria-label="Dismiss warning notification"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        </div>

        {/* Milestone Indicator Bar */}
        <div className="mt-4 pt-3 border-t border-white/15 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between text-white/80 text-[11px] font-medium">
            <span>Milestone Threshold Pacing</span>
            <span>
              Allocated {formatMinorUnits(activeAllocatedMinor, currency)} of{" "}
              {formatMinorUnits(tripLimitMinorUnits, currency)}
            </span>
          </div>

          <div className="relative w-full h-2.5 bg-black/25 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                threshold.isCritical95 ? "bg-red-300" : "bg-amber-300"
              }`}
              style={{ width: `${Math.min(100, threshold.velocityPercent)}%` }}
            />
            {/* 80% Marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/70 shadow-xs"
              style={{ left: "80%" }}
              title="80% Warning Threshold"
            />
            {/* 95% Marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-xs"
              style={{ left: "95%" }}
              title="95% Critical Threshold"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-white/70">
            <span>0%</span>
            <span className="font-bold text-white/90">80% Warning Marker</span>
            <span className="font-bold text-white/90">95% Critical Marker</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
