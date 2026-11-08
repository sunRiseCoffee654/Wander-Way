"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import type { Database } from "@/lib/types/database";
import {
  calculateBudgetTotals,
  normalizePriceEvidence,
  type BudgetLineItemLike,
} from "@/lib/budget/calculations";
import {
  convertMinorUnitsDeterministic,
  formatMinorUnits,
  getLiveExchangeRates,
} from "@/lib/currency/service";
import type { SupportedCurrency } from "@/lib/currency/types";

type DbLineItem = Database["public"]["Tables"]["budget_line_items"]["Row"];

interface StitchBudgetViewProps {
  tripTitle?: string;
  budgetLimitMinorUnits?: number;
  budgetCurrency?: string;
  budgetBasis?: string;
  dbLineItems?: DbLineItem[];
}

export function StitchBudgetView({
  tripTitle = "Kyoto & Tokyo Autumn Journey 2025",
  budgetLimitMinorUnits,
  budgetCurrency = "INR",
  dbLineItems,
}: StitchBudgetViewProps) {
  const [viewMode, setViewMode] = useState<"group" | "person">("group");
  const [expenseNotice, setExpenseNotice] = useState(false);
  const [settleNotice, setSettleNotice] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>("INR");
  const [ratesMap, setRatesMap] = useState<Record<string, number>>({});
  const [rateSource, setRateSource] = useState<string>("European Central Bank");

  useEffect(() => {
    getLiveExchangeRates(budgetCurrency).then((res) => {
      setRatesMap(res.rates);
      setRateSource(res.source);
    });
  }, [budgetCurrency]);

  const isPerson = viewMode === "person";
  const multiplier = isPerson ? 0.5 : 1.0;

  const formatCurrency = (amount: number) => {
    const baseMinor = Math.round(amount * 100);
    const converted = convertMinorUnitsDeterministic(
      baseMinor,
      budgetCurrency,
      displayCurrency,
      ratesMap
    );
    const finalMinor = Math.round(converted.converted_amount_minor * multiplier);
    return formatMinorUnits(finalMinor, displayCurrency);
  };

  const hasCustomItems = Boolean(dbLineItems && dbLineItems.length > 0);

  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes("flight") || c.includes("air")) return "flight";
    if (c.includes("hotel") || c.includes("stay") || c.includes("lodg")) return "hotel";
    if (c.includes("food") || c.includes("din") || c.includes("meal")) return "restaurant";
    if (c.includes("attract") || c.includes("tour") || c.includes("act")) return "attractions";
    if (c.includes("train") || c.includes("trans") || c.includes("rail")) return "train";
    return "receipt_long";
  };

  const getProvenanceMeta = (evidence: string | null | undefined) => {
    const tier = normalizePriceEvidence(evidence);
    switch (tier) {
      case "live_quote":
        return { label: "Live Quote", badge: "bg-tertiary-fixed text-on-tertiary-fixed", icon: "bolt" };
      case "published_price":
        return { label: "Published Tariff", badge: "bg-primary-fixed text-on-primary-fixed", icon: "menu_book" };
      case "verified_range":
        return { label: "Verified Range", badge: "bg-primary-fixed-dim text-on-primary-fixed", icon: "stacked_line_chart" };
      case "calculated_estimate":
        return { label: "Calculated Est.", badge: "bg-secondary-fixed text-on-secondary-fixed", icon: "calculate" };
      case "user_entered":
        return { label: "User Entered", badge: "bg-surface-container-highest text-on-surface", icon: "edit_note" };
      default:
        return { label: "Unknown Cost", badge: "bg-surface-container-high text-on-surface-variant", icon: "help_outline" };
    }
  };

  const lineItems = hasCustomItems && dbLineItems
    ? dbLineItems.map((item) => {
        const prov = getProvenanceMeta(item.evidence_type);
        const amt = Number(item.amount_minor_units || 0) / 100;
        return {
          id: item.id,
          title: item.title,
          sub: `${item.category} • ${item.source_name || "Internal calculation"}`,
          ref: item.evidence_type,
          icon: getCategoryIcon(item.category),
          provenance: prov.label,
          provenanceBadge: prov.badge,
          provenanceIcon: prov.icon,
          status: item.is_paid ? "Paid" : "Planned",
          statusBadge: item.is_paid ? "bg-tertiary-fixed-dim/40 text-tertiary" : "bg-surface-container-highest text-on-surface-variant",
          amount: amt,
          paxAmount: amt / 2,
        };
      })
    : [
        {
          id: "flights",
          title: "Flights: SFO ⇄ HND Roundtrip",
          sub: "United Airlines • UA875 / UA876 • 2 Passengers economy",
          ref: "PNR #9X4KL2 Confirmed",
          icon: "flight",
          provenance: "Live Quote",
          provenanceBadge: "bg-tertiary-fixed text-on-tertiary-fixed",
          provenanceIcon: "bolt",
          status: "Paid",
          statusBadge: "bg-tertiary-fixed-dim/40 text-tertiary",
          amount: 1840.0,
          paxAmount: 920.0,
        },
        {
          id: "hotel",
          title: "Accommodation (3 Hotels, 9 Nights)",
          sub: "Kyoto Granvia (4n), Tokyo Cerulean (5n) • 1 Queen Room",
          ref: "Taxes ($142.00) & Kyoto City Bathing Tax included",
          icon: "hotel",
          provenance: "Live Quote",
          provenanceBadge: "bg-tertiary-fixed text-on-tertiary-fixed",
          provenanceIcon: "bolt",
          status: "Reserved (Pay at Desk)",
          statusBadge: "bg-secondary-fixed text-on-secondary-fixed",
          amount: 1620.0,
          paxAmount: 810.0,
        },
        {
          id: "food",
          title: "Food & Daily Dining Allowance",
          sub: "Model baseline: 9 Days • Mid-range culinary target",
          ref: "Disclosed formula: $40.00 / day / person ($80.00 / group / day)",
          icon: "restaurant",
          provenance: "Calculated Estimate",
          provenanceBadge: "bg-secondary-fixed text-on-secondary-fixed",
          provenanceIcon: "calculate",
          status: "Scheduled Plan",
          statusBadge: "bg-surface-container-highest text-on-surface-variant",
          amount: 720.0,
          paxAmount: 360.0,
        },
        {
          id: "activities",
          title: "Activities & Guided Attractions",
          sub: "teamLab Planets, Shibuya Sky VIP, Gion Tea Ceremony",
          ref: "Published ticket prices across official agency gates",
          icon: "attractions",
          provenance: "Published Tariff",
          provenanceBadge: "bg-primary-fixed text-on-primary-fixed",
          provenanceIcon: "menu_book",
          status: "Pre-paid (Vouchers)",
          statusBadge: "bg-tertiary-fixed-dim/40 text-tertiary",
          amount: 390.0,
          paxAmount: 195.0,
        },
        {
          id: "transport",
          title: "Local Transport & Shinkansen Bullet Train",
          sub: "Tokaido Shinkansen (Tokyo ⇄ Kyoto) + Suica Card Preloads",
          ref: "Official JR Central fare bracket & Metro IC integration",
          icon: "train",
          provenance: "Published Tariff",
          provenanceBadge: "bg-primary-fixed text-on-primary-fixed",
          provenanceIcon: "menu_book",
          status: "Tickets Staged",
          statusBadge: "bg-secondary-fixed text-on-secondary-fixed",
          amount: 280.0,
          paxAmount: 140.0,
        },
      ];

  const activeItems: BudgetLineItemLike[] = hasCustomItems && dbLineItems
    ? dbLineItems
    : [
        { amount_minor_units: 184000, evidence_type: "live_quote" },
        { amount_minor_units: 162000, evidence_type: "live_quote" },
        { amount_minor_units: 72000, evidence_type: "calculated_estimate" },
        { amount_minor_units: 39000, evidence_type: "published_price" },
        { amount_minor_units: 28000, evidence_type: "published_price" },
      ];

  const totals = calculateBudgetTotals(activeItems, budgetLimitMinorUnits, 620000);
  const totalAllocated = totals.totalAllocatedMajor;
  const tripLimit = totals.tripLimitMajor;
  const remainingRunway = totals.remainingRunwayMajor;
  const velocityPercent = totals.velocityPercent;

  const liveQuoteAmount = totals.evidenceBreakdown.live_quote.amountMajor;
  const publishedAmount = totals.evidenceBreakdown.published_price.amountMajor;
  const calculatedAmount = totals.evidenceBreakdown.calculated_estimate.amountMajor;
  const userEnteredAmount = totals.evidenceBreakdown.user_entered.amountMajor;
  const unknownAmount = totals.evidenceBreakdown.unknown.amountMajor;

  const livePct = totals.evidenceBreakdown.live_quote.percentage;
  const pubPct = totals.evidenceBreakdown.published_price.percentage;
  const calcPct = totals.evidenceBreakdown.calculated_estimate.percentage;
  const userPct = totals.evidenceBreakdown.user_entered.percentage;
  const unknownPct = totals.evidenceBreakdown.unknown.percentage;

  return (
    <div className="w-full flex flex-col gap-8 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high/40 pb-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-primary">
            Financial Intelligence • PRD v3.0 Grounded
          </span>
          <h1 className="text-2xl sm:text-3xl text-on-surface font-semibold tracking-tight mt-1">
            Budget Intelligence &amp; Financial Provenance
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            {tripTitle} • Honest minor-unit math and verified pricing evidence tiers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Live Currency Selector with Fluid Motion */}
          <div className="flex items-center p-1 rounded-xl bg-surface-container border border-outline-variant/30 text-xs font-semibold relative">
            {(["INR", "USD", "EUR", "GBP", "JPY"] as SupportedCurrency[]).map((curr) => {
              const active = displayCurrency === curr;
              return (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setDisplayCurrency(curr)}
                  className={`relative px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    active
                      ? "text-white font-bold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeBudgetCurrencyIndicator"
                      className="absolute inset-0 rounded-lg bg-primary shadow-xs z-0"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{curr}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              setExpenseNotice(true);
              setTimeout(() => setExpenseNotice(false), 2500);
            }}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>{expenseNotice ? "Expense Modal Opened!" : "Record Direct Expense"}</span>
          </button>
        </div>
      </div>

      {/* Live FX Rate Provenance Ribbon */}
      {displayCurrency !== budgetCurrency && ratesMap[displayCurrency] && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium -mt-4 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">currency_exchange</span>
            <span>
              Live Central Bank Parity: 1 {budgetCurrency} = {ratesMap[displayCurrency]} {displayCurrency}
            </span>
          </div>
          <span className="text-[11px] font-mono text-on-surface-variant">
            Source: {rateSource}
          </span>
        </div>
      )}

      {/* Top Summary & Metric Ribbon */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-between">
        {/* Primary Budget Stat Hero Card */}
        <div className="flex-1 bg-surface-container-low rounded-2xl p-6 shadow-2xs border border-surface-container-high/40 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 size-44 rounded-full bg-primary-fixed/20 pointer-events-none blur-2xl" />

          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Cap &amp; Liquidity
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant text-[11px] font-medium">
                Trip Limit: {formatCurrency(tripLimit)}
              </span>
            </div>
            <button
              type="button"
              className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Adjust Ceiling</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6 z-10">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-on-surface-variant">
                Allocated Expenditures
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl text-on-surface font-semibold tracking-tight">
                  {formatCurrency(totalAllocated)}
                </span>
                <span className="text-xs font-semibold text-tertiary">{velocityPercent}%</span>
              </div>
              <span className="text-xs text-on-surface-variant mt-0.5">
                Committed across {lineItems.length} categories
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-semibold text-on-surface-variant">
                Unallocated Runway
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl text-primary font-semibold tracking-tight">
                  {formatCurrency(remainingRunway)}
                </span>
                <span className="text-[11px] text-primary-container px-2 py-0.5 rounded-full bg-primary-fixed font-bold">
                  {Math.max(0, 100 - Math.round(velocityPercent))}% Buffer
                </span>
              </div>
              <span className="text-xs text-on-surface-variant mt-0.5">
                Available for contingency &amp; meals
              </span>
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex justify-between items-center mb-1.5 text-xs">
                <span className="text-on-surface-variant">Utilization Velocity</span>
                <span className="text-on-surface font-semibold">{velocityPercent}%</span>
              </div>
              <div className="w-full bg-surface-container-highest h-3 rounded-full overflow-hidden flex">
                <div
                  className="bg-primary h-full rounded-l-full transition-all duration-500"
                  style={{ width: `${velocityPercent}%` }}
                />
                <div
                  className="bg-tertiary-fixed-dim h-full"
                  style={{ width: `${Math.max(0, 100 - velocityPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-on-surface-variant text-[11px] mt-2">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-primary" />
                  Booked &amp; Est.
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-tertiary-fixed-dim" />
                  Safe Reserve
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-surface-container-high/40 z-10 text-xs">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-tertiary">
                verified_user
              </span>
              <span>Deterministic minor-unit arithmetic with retained conversion rates.</span>
            </div>
          </div>
        </div>

        {/* Controls & Currency Conversion Module */}
        <div className="w-full lg:w-96 bg-surface-container-low rounded-2xl p-5 shadow-2xs border border-surface-container-high/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-on-surface">
                Scope &amp; Currencies
              </span>
              <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-semibold flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-tertiary animate-ping" />
                Live Feed
              </span>
            </div>

            {/* M3 Segmented Button for View Toggle */}
            <div className="p-1 rounded-full bg-surface-container-highest flex items-center mb-5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("person")}
                className={`flex-1 py-1.5 px-3 rounded-full text-center transition-all cursor-pointer ${
                  isPerson
                    ? "bg-primary-fixed text-on-primary-fixed font-bold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface font-medium"
                }`}
              >
                Per Person ({formatCurrency(totalAllocated / 2)})
              </button>
              <button
                type="button"
                onClick={() => setViewMode("group")}
                className={`flex-1 py-1.5 px-3 rounded-full text-center transition-all cursor-pointer ${
                  !isPerson
                    ? "bg-primary-fixed text-on-primary-fixed font-bold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface font-medium"
                }`}
              >
                Total Group ({formatCurrency(totalAllocated)})
              </button>
            </div>

            {/* Forex Context Card */}
            <div className="bg-surface-container rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    currency_exchange
                  </span>
                  <span className="text-xs font-semibold text-on-surface">
                    FX Indexation
                  </span>
                </div>
                <span className="text-[10px] text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full font-medium">
                  Currency: {budgetCurrency}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-base font-bold text-on-surface">
                  1 USD = 148.20 JPY
                </span>
                <span className="text-xs text-tertiary font-semibold">
                  +0.42% 24h
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <span className="text-on-surface-variant">
                  Retrieved Oct 14, 08:00 UTC
                </span>
                <span className="text-secondary font-medium">Auto-pegged</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-surface-container-high/40 text-xs">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">group</span>
              <span>2 Pax Equal Split</span>
            </div>
            <button
              type="button"
              className="text-primary font-semibold hover:underline cursor-pointer"
            >
              Edit Split Ratios
            </button>
          </div>
        </div>
      </div>

      {/* Financial Provenance & Evidence Audit Bar (PRD Section 5.7) */}
      <div className="bg-surface-container-low rounded-2xl p-6 shadow-2xs border border-surface-container-high/40 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">policy</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-on-surface tracking-tight">
                Financial Provenance &amp; Evidence Audit
              </h2>
              <p className="text-xs text-on-surface-variant">
                Deterministic categorization based on verified data sources, not raw guessing.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant">Confidence Rating:</span>
            <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-xs font-bold flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-tertiary" />
              91% High Confidence
            </span>
          </div>
        </div>

        {/* Segmented Provenance Ribbon */}
        <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-surface-container-highest">
          <div
            className="bg-tertiary hover:opacity-90 transition-opacity cursor-pointer h-full"
            style={{ width: `${livePct}%` }}
            title={`Live Provider Quotes: ${formatCurrency(liveQuoteAmount)} (${livePct}%)`}
          />
          <div
            className="bg-primary hover:opacity-90 transition-opacity cursor-pointer h-full"
            style={{ width: `${pubPct}%` }}
            title={`Published Official Prices: ${formatCurrency(publishedAmount)} (${pubPct}%)`}
          />
          <div
            className="bg-secondary-container hover:opacity-90 transition-opacity cursor-pointer h-full"
            style={{ width: `${calcPct}%` }}
            title={`Calculated Estimates: ${formatCurrency(calculatedAmount)} (${calcPct}%)`}
          />
          <div
            className="bg-primary-fixed-dim hover:opacity-90 transition-opacity cursor-pointer h-full"
            style={{ width: `${userPct}%` }}
            title={`User Entered: ${formatCurrency(userEnteredAmount)} (${userPct}%)`}
          />
        </div>

        {/* 5-Card Source Badges Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-surface-container flex flex-col gap-1.5 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">bolt</span>
                Live Quotes
              </span>
              <span className="text-xs font-semibold text-on-surface-variant">
                {livePct}%
              </span>
            </div>
            <span className="text-lg font-bold text-on-surface mt-1">
              {formatCurrency(liveQuoteAmount)}
            </span>
            <span className="text-[11px] text-on-surface-variant truncate">
              Real-time GDS flight and hotel reservation locks
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container flex flex-col gap-1.5 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed text-[11px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">menu_book</span>
                Published
              </span>
              <span className="text-xs font-semibold text-on-surface-variant">
                {pubPct}%
              </span>
            </div>
            <span className="text-lg font-bold text-on-surface mt-1">
              {formatCurrency(publishedAmount)}
            </span>
            <span className="text-[11px] text-on-surface-variant truncate">
              Official JR rail tariffs &amp; museum admissions
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container flex flex-col gap-1.5 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed text-[11px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">calculate</span>
                Calculated Est.
              </span>
              <span className="text-xs font-semibold text-on-surface-variant">
                {calcPct}%
              </span>
            </div>
            <span className="text-lg font-bold text-on-surface mt-1">
              {formatCurrency(calculatedAmount)}
            </span>
            <span className="text-[11px] text-on-surface-variant truncate">
              Audited daily allowances &amp; taxi estimates
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container flex flex-col gap-1.5 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-surface-container-highest text-on-surface text-[11px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">edit_note</span>
                User Entered
              </span>
              <span className="text-xs font-semibold text-on-surface-variant">
                {userPct}%
              </span>
            </div>
            <span className="text-lg font-bold text-on-surface mt-1">
              {formatCurrency(userEnteredAmount)}
            </span>
            <span className="text-[11px] text-on-surface-variant truncate">
              Souvenir fund &amp; baggage allowance
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container flex flex-col gap-1.5 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[11px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">help_outline</span>
                Unaccounted
              </span>
              <span className="text-xs font-semibold text-on-surface-variant">
                {unknownPct}%
              </span>
            </div>
            <span className="text-lg font-bold text-on-surface mt-1">
              {formatCurrency(unknownAmount)}
            </span>
            <span className="text-[11px] text-on-surface-variant truncate">
              Never assumed zero; all items mapped
            </span>
          </div>
        </div>
      </div>

      {/* Main Workspace Split: Breakdown Table & Intelligence Explanation */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Detailed Category Expenses Breakdown (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className="bg-surface-container-low rounded-2xl shadow-2xs border border-surface-container-high/40 overflow-hidden flex flex-col">
            <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg text-on-surface font-semibold tracking-tight">
                  Category Expense Portfolio
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Line items parsed through WanderWay Financial Integrity Engine
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    filter_list
                  </span>
                  <span>All Sources</span>
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    download
                  </span>
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-surface-container text-on-surface-variant uppercase text-[11px] font-bold tracking-wider">
                  <tr>
                    <th scope="col" className="py-3.5 px-6">
                      Category &amp; Details
                    </th>
                    <th scope="col" className="py-3.5 px-4">
                      Provenance Type
                    </th>
                    <th scope="col" className="py-3.5 px-4">
                      Status
                    </th>
                    <th scope="col" className="py-3.5 px-6 text-right">
                      Total Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/40">
                  {lineItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-surface-container-high/40 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-3">
                          <div className="size-9 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[20px]">
                              {item.icon}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-on-surface">
                              {item.title}
                            </span>
                            <span className="text-xs text-on-surface-variant">
                              {item.sub}
                            </span>
                            <span className="text-[11px] text-tertiary mt-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">
                                lock
                              </span>
                              {item.ref}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${item.provenanceBadge}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {item.provenanceIcon}
                          </span>
                          {item.provenance}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${item.statusBadge}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right align-top">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-on-surface">
                            {formatCurrency(item.amount)}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            {formatCurrency(item.paxAmount)} / pax
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-surface-container flex items-center justify-between border-t border-surface-container-high/40">
              <span className="text-xs font-semibold text-on-surface-variant">
                Subtotal of {lineItems.length} Tracked Categories
              </span>
              <span className="text-base font-bold text-on-surface">
                {formatCurrency(totalAllocated)}
              </span>
            </div>
          </div>

          {/* Mathematical Transparency Card (PRD 8.3 & 5.7) */}
          <div className="bg-surface-container-low rounded-2xl p-6 shadow-2xs border border-surface-container-high/40 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                <span className="material-symbols-outlined text-[20px]">
                  functions
                </span>
              </div>
              <div>
                <h4 className="text-base font-semibold text-on-surface">
                  Mathematical Transparency: How Calculated Estimates Work
                </h4>
                <p className="text-xs text-on-surface-variant">
                  Zero phantom math. Formulas are audited and verifiable against destination baselines.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="p-4 rounded-xl bg-surface-container flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-on-surface">
                    Dining Allowance Model
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-highest text-[10px] text-on-surface font-mono">
                    Formula ID: CALC-FD-01
                  </span>
                </div>
                <div className="text-xs text-on-surface-variant">
                  <p className="font-mono text-primary text-xs py-1.5 bg-surface-container-lowest px-2.5 rounded-lg mt-1">
                    E_food = Days (9) × Allowance ($40) × Pax (2) = $720.00
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed">
                    Based on Japan National Tourism Organization (JNTO) mid-tier median meal index for Kyoto/Tokyo dining.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-on-surface">
                    FX Buffering Rule
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-highest text-[10px] text-on-surface font-mono">
                    Rule ID: RISK-FX-04
                  </span>
                </div>
                <div className="text-xs text-on-surface-variant">
                  <p className="font-mono text-primary text-xs py-1.5 bg-surface-container-lowest px-2.5 rounded-lg mt-1">
                    Buffer = Total Estimated JPY × +1.8% hedge
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed">
                    Protects against intra-week Yen volatility before card settlement clearing dates.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-surface-container-high/40 text-xs">
              <span className="text-on-surface-variant text-[11px]">
                All models reference audited data feeds updated every 6 hours.
              </span>
              <button
                type="button"
                className="text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Inspect Raw Parameters</span>
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Group Split, Settlement Engine & Insights (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-low rounded-2xl p-6 shadow-2xs border border-surface-container-high/40 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                  <span className="material-symbols-outlined text-[18px]">
                    balance
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-on-surface">
                    Group Split &amp; Ledger
                  </h3>
                  <span className="text-[11px] text-on-surface-variant">
                    2-Party Equal Share Allocation
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface text-[11px] font-semibold">
                50 / 50
              </span>
            </div>

            {/* Traveler Shares */}
            <div className="space-y-3">
              {/* Elena */}
              <div className="p-3.5 rounded-xl bg-surface-container flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center text-[10px] font-bold">
                      ER
                    </div>
                    <span className="text-xs font-semibold text-on-surface">
                      Elena Rostova (You)
                    </span>
                  </div>
                  <span className="text-xs font-bold text-tertiary">
                    +${(totalAllocated * 0.128).toFixed(2)} Owed
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-on-surface-variant">
                  <span>Target Share: {formatCurrency(totalAllocated / 2)}</span>
                  <span className="font-semibold text-on-surface">Paid: {formatCurrency((totalAllocated / 2) + (totalAllocated * 0.128))}</span>
                </div>
              </div>

              {/* Marcus */}
              <div className="p-3.5 rounded-xl bg-surface-container flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center text-[10px] font-bold">
                      MT
                    </div>
                    <span className="text-xs font-semibold text-on-surface">
                      Marcus Tanaka
                    </span>
                  </div>
                  <span className="text-xs font-bold text-secondary">
                    -${(totalAllocated * 0.128).toFixed(2)} Due
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-on-surface-variant">
                  <span>Target Share: {formatCurrency(totalAllocated / 2)}</span>
                  <span className="font-semibold text-on-surface">Paid: {formatCurrency((totalAllocated / 2) - (totalAllocated * 0.128))}</span>
                </div>
              </div>
            </div>

            {/* Settle Action */}
            <button
              type="button"
              onClick={() => {
                setSettleNotice(true);
                setTimeout(() => setSettleNotice(false), 2500);
              }}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                send_money
              </span>
              <span>{settleNotice ? "Settlement Initiated!" : "Settle via Transfer"}</span>
            </button>

            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant pt-2 border-t border-surface-container-high/40">
              <span className="material-symbols-outlined text-[16px] text-tertiary">
                verified
              </span>
              <span>Settlement balances auto-reconcile on card posting.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
