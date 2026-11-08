"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface WizardStep {
  id: string;
  label: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStepIndex: number;
  onStepClick: (index: number) => void;
}

export function WizardStepper({
  steps,
  currentStepIndex,
  onStepClick,
}: WizardStepperProps) {
  return (
    <nav aria-label="Trip planning steps" className="w-full">
      <ol className="flex items-center justify-between gap-2 sm:gap-4">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isClickable = idx < currentStepIndex;

          return (
            <li key={step.id} className="flex-1">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(idx)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "group flex w-full flex-col items-start gap-1 rounded-control p-2 text-left transition-colors",
                  isClickable && "cursor-pointer hover:bg-surface-elevated",
                  !isClickable && "cursor-default",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                      isCompleted && "bg-primary text-on-primary",
                      isCurrent && "border-2 border-primary bg-surface text-primary",
                      !isCompleted && !isCurrent && "border border-border-subtle bg-surface text-text-muted",
                    )}
                  >
                    {isCompleted ? <Check className="size-3.5 stroke-[2.5]" /> : idx + 1}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium sm:text-sm",
                      isCurrent && "font-semibold text-text-primary",
                      isCompleted && "text-text-primary",
                      !isCompleted && !isCurrent && "text-text-muted",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {/* Visual progress bar segment */}
                <div
                  className={cn(
                    "h-1 w-full rounded-full transition-colors",
                    isCompleted && "bg-primary",
                    isCurrent && "bg-primary/50",
                    !isCompleted && !isCurrent && "bg-border-subtle",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
