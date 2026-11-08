"use client";

import { DollarSign, Info, Plus, Minus, Check } from "lucide-react";
import type { BudgetBasis } from "@/lib/ai/types";

interface TravellersBudgetData {
  adultCount: number;
  childCount: number;
  roomCount: number;
  hasBudget: boolean;
  budgetAmount: string;
  budgetCurrency: string;
  budgetBasis: BudgetBasis;
}

interface TravellersBudgetSectionProps {
  data: TravellersBudgetData;
  onChange: (updated: Partial<TravellersBudgetData>) => void;
  errors?: Record<string, string>;
}

const SUPPORTED_CURRENCIES = [
  { code: "INR", symbol: "₹", name: "INR — Indian Rupee" },
  { code: "USD", symbol: "$", name: "USD — US Dollar" },
  { code: "EUR", symbol: "€", name: "EUR — Euro" },
  { code: "GBP", symbol: "£", name: "GBP — British Pound" },
  { code: "JPY", symbol: "¥", name: "JPY — Japanese Yen" },
  { code: "CAD", symbol: "CA$", name: "CAD — Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "AUD — Australian Dollar" },
];

export function TravellersBudgetSection({
  data,
  onChange,
  errors = {},
}: TravellersBudgetSectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Step 2 of 4
        </span>
        <h2 className="mt-1 font-serif text-2xl font-semibold tracking-[-0.01em] text-text-primary sm:text-3xl">
          Travellers and budget
        </h2>
        <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
          Specify party size, accommodation requirements, and your spending envelope.
        </p>
      </div>

      {/* Travellers & Rooms Counters */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Adults */}
        <div className="rounded-panel border border-border-subtle bg-surface p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Adults</span>
            <span className="text-xs text-text-muted">18+ years</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onChange({ adultCount: Math.max(1, data.adultCount - 1) })}
              className="flex size-9 items-center justify-center rounded-control border border-control-border bg-surface text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              aria-label="Decrease adults"
            >
              <Minus className="size-4" />
            </button>
            <span className="font-mono text-lg font-bold text-text-primary">
              {data.adultCount}
            </span>
            <button
              type="button"
              onClick={() => onChange({ adultCount: Math.min(25, data.adultCount + 1) })}
              className="flex size-9 items-center justify-center rounded-control border border-control-border bg-surface text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              aria-label="Increase adults"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* Children */}
        <div className="rounded-panel border border-border-subtle bg-surface p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Children</span>
            <span className="text-xs text-text-muted">Under 18</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onChange({ childCount: Math.max(0, data.childCount - 1) })}
              className="flex size-9 items-center justify-center rounded-control border border-control-border bg-surface text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              aria-label="Decrease children"
            >
              <Minus className="size-4" />
            </button>
            <span className="font-mono text-lg font-bold text-text-primary">
              {data.childCount}
            </span>
            <button
              type="button"
              onClick={() => onChange({ childCount: Math.min(20, data.childCount + 1) })}
              className="flex size-9 items-center justify-center rounded-control border border-control-border bg-surface text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              aria-label="Increase children"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* Rooms */}
        <div className="rounded-panel border border-border-subtle bg-surface p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Rooms</span>
            <span className="text-xs text-text-muted">Overnight</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onChange({ roomCount: Math.max(1, data.roomCount - 1) })}
              className="flex size-9 items-center justify-center rounded-control border border-control-border bg-surface text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              aria-label="Decrease rooms"
            >
              <Minus className="size-4" />
            </button>
            <span className="font-mono text-lg font-bold text-text-primary">
              {data.roomCount}
            </span>
            <button
              type="button"
              onClick={() => onChange({ roomCount: Math.min(10, data.roomCount + 1) })}
              className="flex size-9 items-center justify-center rounded-control border border-control-border bg-surface text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              aria-label="Increase rooms"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>
      {errors.adultCount && (
        <p className="text-xs font-medium text-error-fg">{errors.adultCount}</p>
      )}

      {/* Budget Target Envelope */}
      <div className="space-y-4 rounded-panel border border-border-subtle bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-primary" />
              <h3 className="font-serif text-base font-semibold text-text-primary">
                Spending target
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-text-secondary">
              Set an overall budget goal or plan with complete flexibility.
            </p>
          </div>

          {/* Budget Mode Switcher */}
          <div className="flex items-center gap-1 rounded-control border border-control-border bg-surface-elevated p-1">
            <button
              type="button"
              onClick={() => onChange({ hasBudget: true })}
              className={`rounded-control px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                data.hasBudget
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Set budget
            </button>
            <button
              type="button"
              onClick={() => onChange({ hasBudget: false, budgetAmount: "" })}
              className={`rounded-control px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                !data.hasBudget
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Flexible / No budget
            </button>
          </div>
        </div>

        {/* Budget Fields when hasBudget is true */}
        {data.hasBudget && (
          <div className="mt-4 space-y-4 pt-4 border-t border-border-subtle animate-in fade-in duration-150">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Currency Select */}
              <div>
                <label className="block text-xs font-medium text-text-primary">Currency</label>
                <select
                  value={data.budgetCurrency}
                  onChange={(e) => onChange({ budgetCurrency: e.target.value })}
                  className="mt-1.5 w-full rounded-control border border-control-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-focus focus:ring-1 focus:ring-focus shadow-xs"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-text-primary">
                  Target amount
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-mono text-sm text-text-muted">
                    {SUPPORTED_CURRENCIES.find((c) => c.code === data.budgetCurrency)?.symbol || "₹"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    placeholder="e.g. 75000"
                    value={data.budgetAmount}
                    onChange={(e) => onChange({ budgetAmount: e.target.value })}
                    className="w-full rounded-control border border-control-border bg-surface py-2 pr-3 pl-8 text-sm font-mono font-medium text-text-primary focus:border-focus focus:ring-1 focus:ring-focus shadow-xs"
                  />
                </div>
                {errors.budgetAmount && (
                  <p className="mt-1 text-xs text-error-fg">{errors.budgetAmount}</p>
                )}
              </div>
            </div>

            {/* Budget Basis Selection (Total vs Per Person / Day) */}
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1.5">
                Calculation basis
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ budgetBasis: "total" })}
                  className={`flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    data.budgetBasis === "total"
                      ? "border-primary bg-selected-bg text-on-selected"
                      : "border-border-subtle bg-surface text-text-secondary hover:bg-surface-elevated"
                  }`}
                >
                  {data.budgetBasis === "total" && <Check className="size-3 text-primary" />}
                  <span>Total trip target (for all travellers)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChange({ budgetBasis: "per_person" })}
                  className={`flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    data.budgetBasis === "per_person"
                      ? "border-primary bg-selected-bg text-on-selected"
                      : "border-border-subtle bg-surface text-text-secondary hover:bg-surface-elevated"
                  }`}
                >
                  {data.budgetBasis === "per_person" && <Check className="size-3 text-primary" />}
                  <span>Per person target</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PRD v3.0 Grounding Notice */}
        <div className="flex items-start gap-2.5 rounded-control bg-surface-elevated p-3 text-xs text-text-secondary">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            <strong>Deterministic Budget Guarantee:</strong> WanderWay never fabricates live ticket
            prices or claims instant reservations. Your budget envelope is preserved as a planning target.
          </span>
        </div>
      </div>
    </div>
  );
}
