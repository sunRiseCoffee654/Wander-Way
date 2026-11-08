"use client";

import { useEffect, useState } from "react";
import { Sparkles, MapPin, Route, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GenerationStage, ProposalStatus } from "@/lib/ai/types";

interface GenerationProgressProps {
  status: ProposalStatus;
  stage: GenerationStage;
  errorCode?: string | null;
  onRetry?: () => void;
}

const STAGES = [
  { id: "drafting", label: "Synthesizing schedule", icon: Sparkles, desc: "Drafting daily activities with Gemini AI" },
  { id: "grounding", label: "Locating places", icon: MapPin, desc: "Verifying real-world places with Geoapify" },
  { id: "routing", label: "Estimating transit", icon: Route, desc: "Computing route legs and transit times" },
  { id: "done", label: "Proposal ready", icon: CheckCircle2, desc: "Ready for your review and edits" },
];

export function GenerationProgress({
  status,
  stage,
  errorCode,
  onRetry,
}: GenerationProgressProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (status !== "generating") return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const currentStageIndex =
    stage === "queued"
      ? 0
      : stage === "drafting"
        ? 0
        : stage === "grounding"
          ? 1
          : stage === "routing"
            ? 2
            : 3;

  if (status === "failed") {
    return (
      <div className="mx-auto max-w-md rounded-panel border border-error-fg/30 bg-surface p-6 text-center shadow-elevation-1">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-error-bg text-error-fg">
          <AlertCircle className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-text-primary">Generation paused</h2>
        <p className="mt-2 text-xs text-text-secondary leading-relaxed">
          {errorCode || "An unexpected error occurred while grounding your trip proposal."}
        </p>
        {onRetry && (
          <Button
            type="button"
            onClick={onRetry}
            variant="primary"
            size="md"
            className="mt-6 gap-2"
          >
            <RefreshCw className="size-4" />
            <span>Try generation again</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-panel border border-border-subtle bg-surface p-8 shadow-elevation-1">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-selected-bg text-primary">
          <Sparkles className="size-6 animate-pulse" />
        </div>
        <h2 className="mt-4 font-serif text-2xl font-semibold text-text-primary">
          Designing your itinerary
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          Elapsed time: {seconds}s • Following PRD v3.0 grounded verification protocol
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {STAGES.map((s, idx) => {
          const Icon = s.icon;
          const isDone = currentStageIndex > idx;
          const isCurrent = currentStageIndex === idx && status === "generating";

          return (
            <div
              key={s.id}
              className={`flex items-start gap-4 rounded-control p-3 transition-colors ${
                isCurrent ? "bg-surface-elevated border border-primary/20" : ""
              }`}
            >
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isDone
                    ? "bg-primary text-on-primary"
                    : isCurrent
                      ? "border-2 border-primary bg-surface text-primary"
                      : "border border-border-subtle bg-surface text-text-muted"
                }`}
              >
                {isDone ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-medium ${
                      isDone || isCurrent ? "text-text-primary" : "text-text-muted"
                    }`}
                  >
                    {s.label}
                  </span>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                      <span className="size-1.5 animate-ping rounded-full bg-primary" />
                      In progress
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-0.5">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 border-t border-border-subtle pt-4 text-center">
        <p className="text-[11px] text-text-muted">
          Places and coordinates are validated through Geoapify spatial lookup. No coordinates are fabricated by AI.
        </p>
      </div>
    </div>
  );
}
