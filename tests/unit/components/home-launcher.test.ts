import { describe, it, expect } from "vitest";
import { parsePartyAndBudget } from "@/components/home/stitch-home-launcher";

describe("Home Launcher Party & Budget Parsing (PRD v3.2 Remediation)", () => {
  describe("Standard Delimiter-Aware Extraction ('·')", () => {
    it("extracts party and custom budget from '4 Travelers · ₹1,50,000'", () => {
      const result = parsePartyAndBudget("4 Travelers · ₹1,50,000");
      expect(result.travelers).toBe(4);
      expect(result.budget).toBe(150000);
    });

    it("extracts party and custom budget from '150 Travelers · ₹2,00,000' (large group > 100)", () => {
      const result = parsePartyAndBudget("150 Travelers · ₹2,00,000");
      expect(result.travelers).toBe(150);
      expect(result.budget).toBe(200000);
    });

    it("extracts party and custom budget from default string '2 Travelers · ₹75,000'", () => {
      const result = parsePartyAndBudget("2 Travelers · ₹75,000");
      expect(result.travelers).toBe(2);
      expect(result.budget).toBe(75000);
    });

    it("handles single traveler with small budget '1 Traveler · ₹5,000'", () => {
      const result = parsePartyAndBudget("1 Traveler · ₹5,000");
      expect(result.travelers).toBe(1);
      expect(result.budget).toBe(5000);
    });

    it("handles multi-lakh budget with Indian comma grouping '8 Travelers · ₹10,50,000'", () => {
      const result = parsePartyAndBudget("8 Travelers · ₹10,50,000");
      expect(result.travelers).toBe(8);
      expect(result.budget).toBe(1050000);
    });
  });

  describe("Alternative Delimiter Extraction ('|', '-', '/')", () => {
    it("extracts from pipe delimiter '4 Travelers | ₹1,50,000'", () => {
      const result = parsePartyAndBudget("4 Travelers | ₹1,50,000");
      expect(result.travelers).toBe(4);
      expect(result.budget).toBe(150000);
    });

    it("extracts from dash delimiter '4 Travelers - ₹1,50,000'", () => {
      const result = parsePartyAndBudget("4 Travelers - ₹1,50,000");
      expect(result.travelers).toBe(4);
      expect(result.budget).toBe(150000);
    });

    it("extracts from slash delimiter '6 Travelers / ₹3,00,000'", () => {
      const result = parsePartyAndBudget("6 Travelers / ₹3,00,000");
      expect(result.travelers).toBe(6);
      expect(result.budget).toBe(300000);
    });
  });

  describe("Graceful Fallback When No Delimiter Is Used", () => {
    it("handles currency symbol attached to budget '4 Travelers ₹1,50,000'", () => {
      const result = parsePartyAndBudget("4 Travelers ₹1,50,000");
      expect(result.travelers).toBe(4);
      expect(result.budget).toBe(150000);
    });

    it("handles large group without delimiter '150 Travelers ₹2,00,000'", () => {
      const result = parsePartyAndBudget("150 Travelers ₹2,00,000");
      expect(result.travelers).toBe(150);
      expect(result.budget).toBe(200000);
    });

    it("handles only travelers entered '6 Travelers'", () => {
      const result = parsePartyAndBudget("6 Travelers", 2, 75000);
      expect(result.travelers).toBe(6);
      expect(result.budget).toBe(75000);
    });

    it("handles only budget entered '₹1,50,000'", () => {
      const result = parsePartyAndBudget("₹1,50,000", 2, 75000);
      expect(result.travelers).toBe(2);
      expect(result.budget).toBe(150000);
    });

    it("handles raw two numbers without letters or symbols '4 150000'", () => {
      const result = parsePartyAndBudget("4 150000", 2, 75000);
      expect(result.travelers).toBe(4);
      expect(result.budget).toBe(150000);
    });

    it("falls back to default parameters when empty string is passed", () => {
      const result = parsePartyAndBudget("", 2, 75000);
      expect(result.travelers).toBe(2);
      expect(result.budget).toBe(75000);
    });
  });
});
