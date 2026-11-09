import { describe, it, expect } from "vitest";
import {
  calculateNetBalances,
  calculateOptimalSettlements,
  verifyZeroSum,
  type MemberBalance,
} from "@/lib/budget/settlement";

describe("Debt Settlement & Group Ledger Engine (PRD Phase 7)", () => {
  const members3 = [
    { id: "user_alice", name: "Alice" },
    { id: "user_bob", name: "Bob" },
    { id: "user_charlie", name: "Charlie" },
  ];

  describe("calculateNetBalances", () => {
    it("handles equal split when one member pays for everyone", () => {
      // Alice pays 30000 minor units ($300.00) for all 3 members ($100 each)
      const expenses = [
        {
          paidByUserId: "user_alice",
          amountMinor: 30000,
          splitWithUserIds: ["user_alice", "user_bob", "user_charlie"],
        },
      ];

      const balances = calculateNetBalances(members3, expenses);

      expect(balances).toHaveLength(3);
      const alice = balances.find((b) => b.userId === "user_alice")!;
      const bob = balances.find((b) => b.userId === "user_bob")!;
      const charlie = balances.find((b) => b.userId === "user_charlie")!;

      // Alice paid 300, her share is 100 -> net +200
      expect(alice.netBalanceMinor).toBe(20000);
      // Bob paid 0, his share is 100 -> net -100
      expect(bob.netBalanceMinor).toBe(-10000);
      // Charlie paid 0, his share is 100 -> net -100
      expect(charlie.netBalanceMinor).toBe(-10000);

      expect(verifyZeroSum(balances)).toBe(true);
    });

    it("defaults splitWithUserIds to all members when omitted or empty", () => {
      const expenses = [
        {
          paidByUserId: "user_bob",
          amountMinor: 15000, // $150.00 / 3 = $50 each
        },
      ];

      const balances = calculateNetBalances(members3, expenses);
      const bob = balances.find((b) => b.userId === "user_bob")!;
      const alice = balances.find((b) => b.userId === "user_alice")!;

      expect(bob.netBalanceMinor).toBe(10000); // +150 - 50 = +100
      expect(alice.netBalanceMinor).toBe(-5000);
      expect(verifyZeroSum(balances)).toBe(true);
    });

    it("handles multiple expenses paid by different members", () => {
      // Alice pays $90 for all 3 (share = $30 each)
      // Bob pays $60 for Bob & Charlie (share = $30 each)
      const expenses = [
        {
          paidByUserId: "user_alice",
          amountMinor: 9000,
          splitWithUserIds: ["user_alice", "user_bob", "user_charlie"],
        },
        {
          paidByUserId: "user_bob",
          amountMinor: 6000,
          splitWithUserIds: ["user_bob", "user_charlie"],
        },
      ];

      const balances = calculateNetBalances(members3, expenses);
      const alice = balances.find((b) => b.userId === "user_alice")!;
      const bob = balances.find((b) => b.userId === "user_bob")!;
      const charlie = balances.find((b) => b.userId === "user_charlie")!;

      // Alice: +90 - 30 = +60
      expect(alice.netBalanceMinor).toBe(6000);
      // Bob: -30 (from Alice's bill) + 60 (paid) - 30 (his share of 2nd bill) = 0
      expect(bob.netBalanceMinor).toBe(0);
      // Charlie: -30 (1st bill) - 30 (2nd bill) = -60
      expect(charlie.netBalanceMinor).toBe(-6000);

      expect(verifyZeroSum(balances)).toBe(true);
    });
  });

  describe("Minor Unit Exact Arithmetic (No Float Drift)", () => {
    it("distributes odd cents deterministically so sum of net balances is exactly 0", () => {
      // 100 cents ($1.00) split 3 ways -> 34, 33, 33 cents
      const expenses = [
        {
          paidByUserId: "user_alice",
          amountMinor: 100,
          splitWithUserIds: ["user_alice", "user_bob", "user_charlie"],
        },
      ];

      const balances = calculateNetBalances(members3, expenses);
      const alice = balances.find((b) => b.userId === "user_alice")!;
      const bob = balances.find((b) => b.userId === "user_bob")!;
      const charlie = balances.find((b) => b.userId === "user_charlie")!;

      // Alice pays 100, Alice allocated 34 -> net +66
      expect(alice.netBalanceMinor).toBe(66);
      // Bob allocated 33 -> net -33
      expect(bob.netBalanceMinor).toBe(-33);
      // Charlie allocated 33 -> net -33
      expect(charlie.netBalanceMinor).toBe(-33);

      expect(alice.netBalanceMinor + bob.netBalanceMinor + charlie.netBalanceMinor).toBe(0);
      expect(verifyZeroSum(balances)).toBe(true);
    });

    it("handles large amounts with penny precision without IEEE 754 drift", () => {
      // 10,000,001 cents ($100,000.01) split 3 ways
      const expenses = [
        {
          paidByUserId: "user_alice",
          amountMinor: 10000001,
        },
      ];

      const balances = calculateNetBalances(members3, expenses);
      const sum = balances.reduce((acc, b) => acc + b.netBalanceMinor, 0);
      expect(sum).toBe(0);
      expect(verifyZeroSum(balances)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("handles solo trips (single traveler) where balance is always 0", () => {
      const solo = [{ id: "user_solo", name: "Solo Traveler" }];
      const expenses = [
        {
          paidByUserId: "user_solo",
          amountMinor: 250000,
        },
      ];

      const balances = calculateNetBalances(solo, expenses);
      expect(balances).toHaveLength(1);
      expect(balances[0].netBalanceMinor).toBe(0);

      const settlements = calculateOptimalSettlements(balances, "USD");
      expect(settlements).toEqual([]);
    });

    it("handles empty expenses array returning all zero balances", () => {
      const balances = calculateNetBalances(members3, []);
      expect(balances.every((b) => b.netBalanceMinor === 0)).toBe(true);

      const settlements = calculateOptimalSettlements(balances, "INR");
      expect(settlements).toEqual([]);
    });

    it("handles custom split ratios/weights (e.g. 2:1)", () => {
      const members2 = [
        { id: "user_a", name: "Alice" },
        { id: "user_b", name: "Bob" },
      ];
      // Alice pays $300 (30000 cents), split 2:1 (Alice 2 shares, Bob 1 share)
      // Alice share: 20000, Bob share: 10000
      const expenses = [
        {
          paidByUserId: "user_a",
          amountMinor: 30000,
          splitWithUserIds: ["user_a", "user_b"],
          splitRatios: { user_a: 2, user_b: 1 },
        },
      ];

      const balances = calculateNetBalances(members2, expenses);
      const a = balances.find((b) => b.userId === "user_a")!;
      const b = balances.find((b) => b.userId === "user_b")!;

      expect(a.netBalanceMinor).toBe(10000); // paid 300, share 200 -> +100
      expect(b.netBalanceMinor).toBe(-10000); // paid 0, share 100 -> -100
      expect(verifyZeroSum(balances)).toBe(true);
    });

    it("handles circular debts where net balances completely cancel out", () => {
      // Alice pays 100 for Bob, Bob pays 100 for Charlie, Charlie pays 100 for Alice
      const expenses = [
        { paidByUserId: "user_alice", amountMinor: 10000, splitWithUserIds: ["user_bob"] },
        { paidByUserId: "user_bob", amountMinor: 10000, splitWithUserIds: ["user_charlie"] },
        { paidByUserId: "user_charlie", amountMinor: 10000, splitWithUserIds: ["user_alice"] },
      ];

      const balances = calculateNetBalances(members3, expenses);
      expect(balances.every((b) => b.netBalanceMinor === 0)).toBe(true);

      const settlements = calculateOptimalSettlements(balances, "USD");
      expect(settlements).toHaveLength(0);
    });
  });

  describe("calculateOptimalSettlements (Minimal Transactions Engine)", () => {
    it("settles a 2-person debt with exactly 1 transaction", () => {
      const balances: MemberBalance[] = [
        { userId: "user_alice", name: "Alice", netBalanceMinor: 5000 },
        { userId: "user_bob", name: "Bob", netBalanceMinor: -5000 },
      ];

      const transfers = calculateOptimalSettlements(balances, "USD");
      expect(transfers).toHaveLength(1);
      expect(transfers[0]).toEqual({
        fromUserId: "user_bob",
        fromName: "Bob",
        toUserId: "user_alice",
        toName: "Alice",
        amountMinor: 5000,
        currency: "USD",
      });
    });

    it("reduces a 3-person debt to at most 2 transactions (N-1)", () => {
      // Alice is owed 60, Bob is owed 20, Charlie owes 80
      const balances: MemberBalance[] = [
        { userId: "user_alice", name: "Alice", netBalanceMinor: 6000 },
        { userId: "user_bob", name: "Bob", netBalanceMinor: 2000 },
        { userId: "user_charlie", name: "Charlie", netBalanceMinor: -8000 },
      ];

      const transfers = calculateOptimalSettlements(balances, "EUR");
      expect(transfers.length).toBeLessThanOrEqual(2);

      // Total transferred must equal 8000
      const totalTransferred = transfers.reduce((acc, t) => acc + t.amountMinor, 0);
      expect(totalTransferred).toBe(8000);

      // Charlie should be paying Alice 60 and Bob 20
      const toAlice = transfers.find((t) => t.toUserId === "user_alice");
      const toBob = transfers.find((t) => t.toUserId === "user_bob");
      expect(toAlice?.amountMinor).toBe(6000);
      expect(toBob?.amountMinor).toBe(2000);
      expect(toAlice?.fromUserId).toBe("user_charlie");
      expect(toBob?.fromUserId).toBe("user_charlie");
    });

    it("minimizes transactions across 4 members with paired debts", () => {
      // 2 creditors (+50, +50), 2 debtors (-50, -50)
      const balances: MemberBalance[] = [
        { userId: "user_a", name: "Alice", netBalanceMinor: 5000 },
        { userId: "user_b", name: "Bob", netBalanceMinor: 5000 },
        { userId: "user_c", name: "Charlie", netBalanceMinor: -5000 },
        { userId: "user_d", name: "Diana", netBalanceMinor: -5000 },
      ];

      const transfers = calculateOptimalSettlements(balances, "INR");
      // Optimal is 2 transactions
      expect(transfers).toHaveLength(2);
      const totalTransferred = transfers.reduce((acc, t) => acc + t.amountMinor, 0);
      expect(totalTransferred).toBe(10000);
      expect(transfers.every((t) => t.currency === "INR")).toBe(true);
    });

    it("returns empty array when all members have zero net balance", () => {
      const balances: MemberBalance[] = [
        { userId: "user_a", name: "Alice", netBalanceMinor: 0 },
        { userId: "user_b", name: "Bob", netBalanceMinor: 0 },
      ];

      const transfers = calculateOptimalSettlements(balances, "USD");
      expect(transfers).toEqual([]);
    });
  });
});
