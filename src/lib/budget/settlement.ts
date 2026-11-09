/**
 * Deterministic Debt Settlement & Multi-Member Ledger Engine
 * PRD v3.0 Phase 7:
 * - Integer minor-unit arithmetic prevents floating point drift.
 * - Optimal cash flow settlement algorithm reducing N-person debts to minimal transactions.
 * - Strict zero-sum balance accounting (total owed == total owing).
 */

import { calculateSplitLedger } from "./calculations";

export interface MemberBalance {
  userId: string;
  name: string;
  netBalanceMinor: number;
}

export interface SettlementTransfer {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amountMinor: number;
  currency: string;
}

export interface ExpenseItemInput {
  paidByUserId: string;
  amountMinor: number;
  currency?: string;
  fxRateToTripCurrency?: number;
  splitWithUserIds?: string[];
  splitRatios?: Record<string, number>;
}

/**
 * Verifies that group member net balances sum strictly to 0 (zero-sum balance).
 */
export function verifyZeroSum(balances: MemberBalance[]): boolean {
  const sum = balances.reduce((acc, b) => acc + b.netBalanceMinor, 0);
  return Math.abs(sum) === 0;
}

/**
 * Calculates net balances for all trip members across a list of shared expenses.
 * Net balance > 0 means the member is owed money (creditor).
 * Net balance < 0 means the member owes money (debtor).
 */
export function calculateNetBalances(
  members: Array<{ id: string; name: string }>,
  expenses: ExpenseItemInput[],
  targetCurrency?: string
): MemberBalance[] {
  const balanceMap = new Map<string, MemberBalance>();
  for (const m of members) {
    balanceMap.set(m.id, {
      userId: m.id,
      name: m.name,
      netBalanceMinor: 0,
    });
  }

  for (const exp of expenses) {
    const rawAmount = Math.max(0, Math.round(exp.amountMinor));
    if (rawAmount === 0) continue;

    // Normalize to targetCurrency if fx rate is present
    let amount = rawAmount;
    if (targetCurrency && exp.currency && exp.currency.toUpperCase() !== targetCurrency.toUpperCase()) {
      if (exp.fxRateToTripCurrency && exp.fxRateToTripCurrency > 0) {
        amount = Math.round(rawAmount * exp.fxRateToTripCurrency);
      } else {
        console.warn(
          `[calculateNetBalances] Expense currency ${exp.currency} does not match target ${targetCurrency} and has no fxRateToTripCurrency.`
        );
      }
    }

    // Credit payer
    const payer = balanceMap.get(exp.paidByUserId);
    if (payer) {
      payer.netBalanceMinor += amount;
    }

    // Determine target members to split with
    let targetIds = exp.splitWithUserIds && exp.splitWithUserIds.length > 0
      ? exp.splitWithUserIds.filter((id) => balanceMap.has(id))
      : members.map((m) => m.id);

    if (targetIds.length === 0) {
      targetIds = members.map((m) => m.id);
    }

    if (targetIds.length === 0) continue;

    // Custom split weights or equal split
    if (exp.splitRatios) {
      const weights = targetIds.map((id) => Math.max(0, exp.splitRatios?.[id] ?? 1));
      const totalWeight = weights.reduce((a, b) => a + b, 0) || targetIds.length;

      let allocatedSum = 0;
      const allocations: number[] = [];
      const remainders: Array<{ index: number; rem: number }> = [];

      for (let i = 0; i < targetIds.length; i++) {
        const exact = (amount * weights[i]) / totalWeight;
        const floorVal = Math.floor(exact);
        allocations.push(floorVal);
        allocatedSum += floorVal;
        remainders.push({ index: i, rem: exact - floorVal });
      }

      const remainderMinor = amount - allocatedSum;
      remainders.sort((a, b) => b.rem - a.rem);
      for (let r = 0; r < remainderMinor && r < remainders.length; r++) {
        allocations[remainders[r].index] += 1;
      }

      for (let i = 0; i < targetIds.length; i++) {
        const member = balanceMap.get(targetIds[i])!;
        member.netBalanceMinor -= allocations[i];
      }
    } else {
      const ledger = calculateSplitLedger(amount, targetIds.length);
      for (let i = 0; i < targetIds.length; i++) {
        const member = balanceMap.get(targetIds[i])!;
        member.netBalanceMinor -= ledger.allocations[i];
      }
    }
  }

  return Array.from(balanceMap.values());
}

/**
 * Optimal debt settlement algorithm minimizing total transactions.
 * Matches largest debtors with largest creditors iteratively (O(N log N) greedy cash flow reduction).
 */
export function calculateOptimalSettlements(
  balances: MemberBalance[],
  currency: string
): SettlementTransfer[] {
  const creditors = balances
    .filter((b) => b.netBalanceMinor > 0)
    .map((b) => ({ ...b, remaining: Math.round(b.netBalanceMinor) }))
    .sort((a, b) => b.remaining - a.remaining || a.userId.localeCompare(b.userId));

  const debtors = balances
    .filter((b) => b.netBalanceMinor < 0)
    .map((b) => ({ ...b, remaining: Math.round(Math.abs(b.netBalanceMinor)) }))
    .sort((a, b) => b.remaining - a.remaining || a.userId.localeCompare(b.userId));

  const transfers: SettlementTransfer[] = [];
  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];

    const transferAmount = Math.min(creditor.remaining, debtor.remaining);
    if (transferAmount > 0) {
      transfers.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amountMinor: transferAmount,
        currency,
      });

      creditor.remaining -= transferAmount;
      debtor.remaining -= transferAmount;
    }

    if (creditor.remaining === 0) cIdx++;
    if (debtor.remaining === 0) dIdx++;
  }

  return transfers;
}
