"use client";

import { useState } from "react";
import {
  calculateNetBalances,
  calculateOptimalSettlements,
  type MemberBalance,
  type SettlementTransfer,
  type ExpenseItemInput,
} from "@/lib/budget/settlement";
import { formatMinorUnits } from "@/lib/currency/service";

export interface DebtSettlementCardProps {
  members: Array<{ id: string; name: string }>;
  expenses: ExpenseItemInput[];
  currency?: string;
  onSettleTransfer?: (transfer: SettlementTransfer) => void;
  onOpenRecordExpense?: () => void;
}

export function DebtSettlementCard({
  members,
  expenses,
  currency = "INR",
  onSettleTransfer,
  onOpenRecordExpense,
}: DebtSettlementCardProps) {
  const [settledTransferIds, setSettledTransferIds] = useState<Set<string>>(
    new Set()
  );

  const balances: MemberBalance[] = calculateNetBalances(members, expenses);
  const transfers: SettlementTransfer[] = calculateOptimalSettlements(
    balances,
    currency
  );

  const getInitials = (name: string) => {
    return name
      .replace(/\(You\)/i, "")
      .trim()
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const handleSettle = (transfer: SettlementTransfer, key: string) => {
    setSettledTransferIds((prev) => new Set(prev).add(key));
    onSettleTransfer?.(transfer);
  };

  const activeTransfers = transfers.filter(
    (t, idx) => !settledTransferIds.has(`${t.fromUserId}->${t.toUserId}-${idx}`)
  );

  const totalOwedMinor = balances
    .filter((b) => b.netBalanceMinor > 0)
    .reduce((acc, b) => acc + b.netBalanceMinor, 0);

  return (
    <div className="bg-surface-container-low rounded-2xl p-6 shadow-2xs border border-surface-container-high/40 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
            <span className="material-symbols-outlined text-[18px]">
              balance
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-on-surface">
              Group Split &amp; Settlement
            </h3>
            <span className="text-[11px] text-on-surface-variant">
              {members.length}-Party Fair Share • Exact Minor-Unit Ledger
            </span>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface text-[11px] font-semibold">
          {activeTransfers.length === 0 ? "Balanced" : `${activeTransfers.length} Transfers`}
        </span>
      </div>

      {/* Group Net Balances List */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
          Member Balances
        </span>
        {balances.map((member) => {
          const isCreditor = member.netBalanceMinor > 0;
          const isDebtor = member.netBalanceMinor < 0;
          const isSettled = member.netBalanceMinor === 0;

          return (
            <div
              key={member.userId}
              className="p-3.5 rounded-xl bg-surface-container flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isCreditor
                      ? "bg-tertiary-fixed text-on-tertiary-fixed"
                      : isDebtor
                      ? "bg-secondary-fixed text-on-secondary-fixed"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {getInitials(member.name)}
                </div>
                <span className="text-xs font-semibold text-on-surface truncate">
                  {member.name}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isCreditor && (
                  <span className="text-xs font-bold text-tertiary bg-tertiary/10 px-2.5 py-0.5 rounded-full">
                    +{formatMinorUnits(member.netBalanceMinor, currency)} Owed
                  </span>
                )}
                {isDebtor && (
                  <span className="text-xs font-bold text-secondary bg-secondary/10 px-2.5 py-0.5 rounded-full">
                    -{formatMinorUnits(Math.abs(member.netBalanceMinor), currency)} Due
                  </span>
                )}
                {isSettled && (
                  <span className="text-xs font-semibold text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full">
                    Settled ($0.00)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Simplified Transfer Instructions */}
      <div className="pt-2 flex flex-col gap-2.5 border-t border-surface-container-high/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
            Simplified Debt Settlement
          </span>
          <span className="text-[10px] text-tertiary font-semibold flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[13px]">speed</span>
            Minimal Transfers
          </span>
        </div>

        {activeTransfers.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-surface-container/60 border border-outline-variant/20 flex items-center gap-2.5 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-tertiary">
              check_circle
            </span>
            <span>All debts are settled! No money transfers needed.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTransfers.map((transfer, idx) => {
              const transferKey = `${transfer.fromUserId}->${transfer.toUserId}-${idx}`;
              return (
                <div
                  key={transferKey}
                  className="p-3 rounded-xl bg-surface-container border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                      arrow_forward
                    </span>
                    <div>
                      <span className="font-semibold text-on-surface">
                        {transfer.fromName}
                      </span>{" "}
                      <span className="text-on-surface-variant">pays</span>{" "}
                      <span className="font-semibold text-on-surface">
                        {transfer.toName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="font-bold text-on-surface text-sm">
                      {formatMinorUnits(transfer.amountMinor, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSettle(transfer, transferKey)}
                      className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      Settle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record Expense Quick Action */}
      {onOpenRecordExpense && (
        <button
          type="button"
          onClick={onOpenRecordExpense}
          className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">
            add_circle
          </span>
          <span>Record Direct Expense</span>
        </button>
      )}

      {/* Reconcile Footnote */}
      <div className="flex items-center gap-2 text-[11px] text-on-surface-variant pt-2 border-t border-surface-container-high/40">
        <span className="material-symbols-outlined text-[16px] text-tertiary">
          verified
        </span>
        <span>
          Owed pool: {formatMinorUnits(totalOwedMinor, currency)}. Zero float drift across splits.
        </span>
      </div>
    </div>
  );
}
