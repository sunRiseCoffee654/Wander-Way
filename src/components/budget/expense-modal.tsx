"use client";

import { useState } from "react";
import { majorToMinorUnits, type EvidenceTier } from "@/lib/budget/calculations";
import { recordExpenseAction, type DbLineItem } from "@/lib/budget/actions";
import type { SupportedCurrency } from "@/lib/currency/types";

export interface ExpenseModalMember {
  id: string;
  name: string;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string;
  defaultCurrency?: string;
  members?: ExpenseModalMember[];
  onExpenseAdded?: (lineItem: DbLineItem, splitWithUserIds: string[]) => void;
}

const CATEGORIES = [
  "Food & Dining",
  "Activities & Tours",
  "Transport",
  "Accommodation",
  "Shopping & Souvenirs",
  "General",
];

const EVIDENCE_TIERS: Array<{ tier: EvidenceTier; label: string; hint: string }> = [
  { tier: "user_entered", label: "User Entered", hint: "Receipt, cash, or card transaction" },
  { tier: "live_quote", label: "Live Quote", hint: "Real-time vendor quotation" },
  { tier: "published_price", label: "Published Tariff", hint: "Official rate or admission price" },
  { tier: "verified_range", label: "Verified Range", hint: "Destination benchmark range" },
  { tier: "calculated_estimate", label: "Calculated Estimate", hint: "Daily allowance or distance formula" },
  { tier: "unknown", label: "Unknown Cost", hint: "Unverified / pending confirmation" },
];

const CURRENCIES: SupportedCurrency[] = ["INR", "USD", "EUR", "GBP", "JPY"];

export function ExpenseModal({
  isOpen,
  onClose,
  tripId,
  defaultCurrency = "INR",
  members = [
    { id: "user_you", name: "Aarav Sharma (You)" },
    { id: "user_rohan", name: "Rohan Mehta" },
    { id: "user_priya", name: "Priya Nair" },
  ],
  onExpenseAdded,
}: ExpenseModalProps) {
  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [category, setCategory] = useState<string>("Food & Dining");
  const [paidByUserId, setPaidByUserId] = useState<string>(members[0]?.id || "");
  const [splitWithUserIds, setSplitWithUserIds] = useState<string[]>(
    members.map((m) => m.id)
  );
  const [evidenceTier, setEvidenceTier] = useState<EvidenceTier>("user_entered");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSplitMember = (memberId: string) => {
    setSplitWithUserIds((prev) => {
      if (prev.includes(memberId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((id) => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleSelectAllSplit = () => {
    setSplitWithUserIds(members.map((m) => m.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Please enter a valid amount greater than 0");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Please enter an expense title");
      return;
    }

    const amountMinorUnits = majorToMinorUnits(parsedAmount);

    try {
      setIsSubmitting(true);
      const res = await recordExpenseAction({
        tripId,
        title: title.trim(),
        amountMinorUnits,
        currency,
        category,
        evidenceTier,
        paidByUserId,
        splitWithUserIds,
        sourceName: "Direct Expense Entry",
        isPaid: true,
      });

      if (!res.success || !res.lineItem) {
        setErrorMessage(res.error || "Failed to record expense");
        return;
      }

      onExpenseAdded?.(res.lineItem, splitWithUserIds);
      // Reset form
      setTitle("");
      setAmountStr("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error saving expense";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-surface-container-low border border-surface-container-high/60 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
              <span className="material-symbols-outlined text-[20px]">
                receipt_long
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-on-surface">
                Record Direct Expense
              </h2>
              <p className="text-xs text-on-surface-variant">
                Exact minor-unit ledger entry with evidence classification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface">
              Expense Title <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner at Chokhi Dhani, Jaipur Metro pass"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-hidden focus:border-primary transition-colors"
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface">
                Amount <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm font-semibold focus:outline-hidden focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm font-semibold focus:outline-hidden focus:border-primary transition-colors"
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-hidden focus:border-primary transition-colors"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Paid By */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface">
              Paid By (Payer)
            </label>
            <select
              value={paidByUserId}
              onChange={(e) => setPaidByUserId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-hidden focus:border-primary transition-colors"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Split With */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-on-surface">
                Split With ({splitWithUserIds.length} of {members.length} members)
              </label>
              <button
                type="button"
                onClick={handleSelectAllSplit}
                className="text-[11px] text-primary font-semibold hover:underline cursor-pointer"
              >
                Select All
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {members.map((m) => {
                const isSelected = splitWithUserIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleSplitMember(m.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
                      isSelected
                        ? "bg-primary-fixed text-on-primary-fixed border-primary font-bold shadow-2xs"
                        : "bg-surface-container text-on-surface-variant border-outline-variant/20 hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {isSelected ? "check_circle" : "radio_button_unchecked"}
                    </span>
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Evidence Classification (PRD Section 5.7) */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-xs font-semibold text-on-surface flex items-center gap-1">
              <span>Price Evidence Provenance Tier</span>
              <span className="material-symbols-outlined text-[14px] text-primary">
                verified
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EVIDENCE_TIERS.map((tierItem) => {
                const isSelected = evidenceTier === tierItem.tier;
                return (
                  <button
                    key={tierItem.tier}
                    type="button"
                    onClick={() => setEvidenceTier(tierItem.tier)}
                    className={`p-2.5 rounded-xl text-left border flex flex-col gap-0.5 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-surface-container border-outline-variant/20 text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span className="text-xs font-semibold">{tierItem.label}</span>
                    <span className="text-[10px] opacity-80 truncate">
                      {tierItem.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container-high/40 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="size-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">
                    check
                  </span>
                  <span>Record Expense</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
