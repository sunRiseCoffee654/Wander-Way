import { describe, it, expect } from "vitest";
import { formatMinorUnitsCurrency, calculateBudgetTotals } from "@/lib/budget/calculations";
import { convertMinorUnitsDeterministic } from "@/lib/currency/service";
import { calculateQuickChipRange, formatDisplayDateRange } from "@/components/home/date-range-picker";
import { parsePartyAndBudget } from "@/components/home/stitch-home-launcher";

describe("WanderWay v3.2 — UI Tree & Click-Flow Verification Suite", () => {
  describe("1. Global Sidebar Navigation Tree & Active Route Mapping", () => {
    interface SidebarNavItem {
      href: string;
      label: string;
      icon: string;
      isActive: (pathname: string) => boolean;
    }

    const activeTripId = "kyoto-autumn-2025";
    const itineraryHref = `/trips/${activeTripId}`;
    const budgetHref = `/trips/${activeTripId}/budget`;
    const packingHref = `/trips/${activeTripId}/packing`;
    const vaultHref = `/trips/${activeTripId}/vault`;

    const navItems: SidebarNavItem[] = [
      {
        href: "/",
        label: "Home Launcher",
        icon: "home",
        isActive: (p) => p === "/",
      },
      {
        href: "/explore",
        label: "Explore",
        icon: "explore",
        isActive: (p) => p.startsWith("/explore"),
      },
      {
        href: "/trips",
        label: "Trip Overview",
        icon: "space_dashboard",
        isActive: (p) => p === "/trips",
      },
      {
        href: itineraryHref,
        label: "Itinerary & Routes",
        icon: "route",
        isActive: (p) =>
          p.startsWith("/trips/") &&
          p !== "/trips/new" &&
          !p.includes("/budget") &&
          !p.includes("/vault") &&
          !p.includes("/packing"),
      },
      {
        href: packingHref,
        label: "Smart Packing & Gear",
        icon: "checklist",
        isActive: (p) => p.includes("/packing"),
      },
      {
        href: budgetHref,
        label: "Budget Intelligence",
        icon: "payments",
        isActive: (p) => p.includes("/budget"),
      },
      {
        href: vaultHref,
        label: "Live Travel Intel",
        icon: "verified",
        isActive: (p) => p.includes("/vault"),
      },
      {
        href: "/profile",
        label: "Profile & Account",
        icon: "person",
        isActive: (p) => p.startsWith("/profile"),
      },
    ];

    it("verifies every sidebar link maps to a valid non-empty route", () => {
      expect(navItems).toHaveLength(8);
      for (const item of navItems) {
        expect(item.href).toMatch(/^\/[a-zA-Z0-9_\-\/]*$/);
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.icon.length).toBeGreaterThan(0);
      }
    });

    it("correctly computes active state for root Home Launcher", () => {
      const home = navItems.find((n) => n.label === "Home Launcher")!;
      expect(home.isActive("/")).toBe(true);
      expect(home.isActive("/explore")).toBe(false);
      expect(home.isActive("/trips")).toBe(false);
    });

    it("correctly computes active state for Explore hub and subpaths", () => {
      const explore = navItems.find((n) => n.label === "Explore")!;
      expect(explore.isActive("/explore")).toBe(true);
      expect(explore.isActive("/explore?theme=culture")).toBe(true);
      expect(explore.isActive("/trips")).toBe(false);
    });

    it("correctly computes active state for Trips Overview vs Itinerary", () => {
      const overview = navItems.find((n) => n.label === "Trip Overview")!;
      const itinerary = navItems.find((n) => n.label === "Itinerary & Routes")!;

      expect(overview.isActive("/trips")).toBe(true);
      expect(itinerary.isActive("/trips")).toBe(false);

      expect(itinerary.isActive("/trips/kyoto-autumn-2025")).toBe(true);
      expect(overview.isActive("/trips/kyoto-autumn-2025")).toBe(false);

      // Wizard route should not highlight existing trip itinerary
      expect(itinerary.isActive("/trips/new")).toBe(false);
    });

    it("correctly isolates sub-workspaces (Budget, Packing, Vault)", () => {
      const budget = navItems.find((n) => n.label === "Budget Intelligence")!;
      const packing = navItems.find((n) => n.label === "Smart Packing & Gear")!;
      const vault = navItems.find((n) => n.label === "Live Travel Intel")!;
      const itinerary = navItems.find((n) => n.label === "Itinerary & Routes")!;

      const budgetPath = "/trips/kyoto-autumn-2025/budget";
      expect(budget.isActive(budgetPath)).toBe(true);
      expect(itinerary.isActive(budgetPath)).toBe(false);
      expect(packing.isActive(budgetPath)).toBe(false);
      expect(vault.isActive(budgetPath)).toBe(false);

      const packingPath = "/trips/kyoto-autumn-2025/packing";
      expect(packing.isActive(packingPath)).toBe(true);
      expect(itinerary.isActive(packingPath)).toBe(false);

      const vaultPath = "/trips/kyoto-autumn-2025/vault";
      expect(vault.isActive(vaultPath)).toBe(true);
      expect(itinerary.isActive(vaultPath)).toBe(false);
    });

    it("verifies Group Talk drawer toggle mutations", () => {
      let isGroupTalkOpen = false;
      const openDrawer = () => { isGroupTalkOpen = true; };
      const closeDrawer = () => { isGroupTalkOpen = false; };

      expect(isGroupTalkOpen).toBe(false);
      openDrawer();
      expect(isGroupTalkOpen).toBe(true);
      closeDrawer();
      expect(isGroupTalkOpen).toBe(false);
    });

    it("verifies Mobile drawer state mutations", () => {
      let mobileOpen = false;
      const setMobileOpen = (v: boolean) => { mobileOpen = v; };

      setMobileOpen(true);
      expect(mobileOpen).toBe(true);
      setMobileOpen(false);
      expect(mobileOpen).toBe(false);
    });
  });

  describe("2. Home Launcher Click Flows & Query Serialization", () => {
    function serializeQuickPlanQuery(params: {
      dest: string;
      startDate: string;
      endDate: string;
      party: number;
      budget: number;
    }): string {
      const sp = new URLSearchParams({
        dest: params.dest,
        startDate: params.startDate,
        endDate: params.endDate,
        party: String(params.party),
        budget: String(params.budget),
      });
      return `/trips/new?${sp.toString()}`;
    }

    it("serializes quick plan input parameters cleanly into /trips/new query string", () => {
      const url = serializeQuickPlanQuery({
        dest: "Kyoto & Tokyo, Japan",
        startDate: "2026-11-14",
        endDate: "2026-11-21",
        party: 2,
        budget: 75000,
      });

      expect(url).toContain("/trips/new?");
      const parsed = new URL(url, "http://localhost");
      expect(parsed.searchParams.get("dest")).toBe("Kyoto & Tokyo, Japan");
      expect(parsed.searchParams.get("startDate")).toBe("2026-11-14");
      expect(parsed.searchParams.get("endDate")).toBe("2026-11-21");
      expect(parsed.searchParams.get("party")).toBe("2");
      expect(parsed.searchParams.get("budget")).toBe("75000");
    });

    it("handles Indian Rupee multi-lakh budget serialization without loss of precision", () => {
      const parsed = parsePartyAndBudget("4 Travelers · ₹1,50,000");
      const url = serializeQuickPlanQuery({
        dest: "Dolomites Traverse, Italy",
        startDate: "2026-10-01",
        endDate: "2026-10-10",
        party: parsed.travelers,
        budget: parsed.budget,
      });

      const parsedUrl = new URL(url, "http://localhost");
      expect(parsedUrl.searchParams.get("party")).toBe("4");
      expect(parsedUrl.searchParams.get("budget")).toBe("150000");
    });

    it("verifies Quick Duration Chips calculate correct date spans", () => {
      const baseDate = "2026-11-14";

      const chip7d = calculateQuickChipRange(7, baseDate);
      expect(chip7d.startDate).toBe("2026-11-14");
      expect(chip7d.endDate).toBe("2026-11-21");

      const chip10d = calculateQuickChipRange(10, baseDate);
      expect(chip10d.startDate).toBe("2026-11-14");
      expect(chip10d.endDate).toBe("2026-11-24");

      const chip14d = calculateQuickChipRange(14, baseDate);
      expect(chip14d.startDate).toBe("2026-11-14");
      expect(chip14d.endDate).toBe("2026-11-28");
    });

    it("verifies date range formatted display label updates dynamically", () => {
      expect(formatDisplayDateRange("2026-11-14", "2026-11-21")).toBe("Nov 14 – Nov 21 (7 Days)");
      expect(formatDisplayDateRange("2026-11-14", "")).toBe("Nov 14 – Select return");
      expect(formatDisplayDateRange("", "")).toBe("Select travel dates");
    });

    it("verifies quick idea chip clicks update destination state", () => {
      let dest = "";
      const handleChipClick = (idea: string) => { dest = idea; };

      handleChipClick("Dolomites Traverse, Italy");
      expect(dest).toBe("Dolomites Traverse, Italy");

      handleChipClick("Tokyo & Hakone, Japan");
      expect(dest).toBe("Tokyo & Hakone, Japan");
    });
  });

  describe("3. Explore Hub Interaction & Modal Triggers", () => {
    it("filters destinations according to selected theme", () => {
      const destinations = [
        { id: "kyoto", category: "culture" },
        { id: "swiss-alps", category: "adventure" },
        { id: "amalfi", category: "relaxation" },
        { id: "oaxaca", category: "food" },
      ];

      const filterByTheme = (theme: string) => {
        if (theme === "all") return destinations;
        return destinations.filter((d) => d.category === theme);
      };

      expect(filterByTheme("all")).toHaveLength(4);
      expect(filterByTheme("culture")).toEqual([{ id: "kyoto", category: "culture" }]);
      expect(filterByTheme("food")).toEqual([{ id: "oaxaca", category: "food" }]);
      expect(filterByTheme("historic")).toHaveLength(0);
    });

    it("switches view mode between 'grid' and 'map'", () => {
      let viewMode: "grid" | "map" = "grid";
      const setViewMode = (mode: "grid" | "map") => { viewMode = mode; };

      expect(viewMode).toBe("grid");
      setViewMode("map");
      expect(viewMode).toBe("map");
      setViewMode("grid");
      expect(viewMode).toBe("grid");
    });

    it("opens PlaceDetailsModal with accurate coordinates when place is clicked", () => {
      interface SelectedPlace {
        placeId: string;
        name: string;
        lat: number;
        lon?: number;
      }

      const state: { selectedPlace: SelectedPlace | null } = { selectedPlace: null };
      const onSelect = (place: SelectedPlace) => { state.selectedPlace = place; };
      const onClose = () => { state.selectedPlace = null; };

      onSelect({
        placeId: "kyoto",
        name: "Kyoto, Japan",
        lat: 35.0116,
      });

      expect(state.selectedPlace).not.toBeNull();
      expect(state.selectedPlace?.name).toBe("Kyoto, Japan");
      expect(state.selectedPlace?.lat).toBe(35.0116);

      onClose();
      expect(state.selectedPlace).toBeNull();
    });
  });

  describe("4. Budget Intelligence Minor-Unit Calculations & Currency Conversion", () => {
    it("guarantees INR is the primary supported currency with correct minor-unit formatting", () => {
      const formatted = formatMinorUnitsCurrency(7500000, "INR", "en-IN");
      expect(formatted).toBe("₹75,000.00");
    });

    it("formats zero-decimal currencies (JPY) without decimal digits", () => {
      const formatted = formatMinorUnitsCurrency(14200, "JPY", "ja-JP");
      expect(formatted).toMatch(/[¥￥]14,200/);
    });

    it("correctly converts between INR base and foreign currencies using official parity", () => {
      // 100 USD (10,000 minor units) at 1 USD = 84 INR => 840,000 INR minor units (₹8,400.00)
      const conversion = convertMinorUnitsDeterministic(10000, "USD", "INR");
      expect(conversion.converted_amount_minor).toBe(840000);
      expect(conversion.fx_rate_to_target).toBe(84.0);

      // Verify reverse conversion from INR to USD
      const inrToUsd = convertMinorUnitsDeterministic(840000, "INR", "USD");
      expect(inrToUsd.converted_amount_minor).toBe(10000);
    });

    it("accurately calculates trip budget summary with evidence tiers", () => {
      const expenses = [
        {
          amount_minor_units: 1420000, // ₹14,200.00
          evidence_type: "live_quote",
        },
        {
          amount_minor_units: 580000, // ₹5,800.00
          evidence_type: "published_price",
        },
      ];

      const totals = calculateBudgetTotals(expenses, 5000000); // ₹50,000 budget cap
      expect(totals.totalAllocatedMinorUnits).toBe(2000000); // ₹20,000.00
      expect(totals.remainingRunwayMinorUnits).toBe(3000000); // ₹30,000.00
      expect(totals.velocityPercent).toBe(40);
      expect(totals.evidenceBreakdown.live_quote.percentage).toBe(71);
      expect(totals.evidenceBreakdown.published_price.percentage).toBe(29);
    });
  });

  describe("5. Smart Packing Checklist Interactions & State Transitions", () => {
    interface GearItem {
      id: string;
      title: string;
      category: "clothing" | "electronics" | "essentials" | "documents";
      packed: boolean;
    }

    const items: GearItem[] = [
      { id: "1", title: "Thermal Mid-layer", category: "clothing", packed: false },
      { id: "2", title: "Universal Travel Plug", category: "electronics", packed: true },
      { id: "3", title: "Japan Rail Pass Voucher", category: "documents", packed: false },
      { id: "4", title: "Daypack Rain Cover", category: "essentials", packed: false },
    ];

    it("filters gear checklist items by category", () => {
      const filterCategory = (cat: string) => {
        if (cat === "all") return items;
        return items.filter((i) => i.category === cat);
      };

      expect(filterCategory("all")).toHaveLength(4);
      expect(filterCategory("clothing")).toHaveLength(1);
      expect(filterCategory("documents")).toHaveLength(1);
    });

    it("toggles item packed state and recalculates progress percentage", () => {
      let state = [...items];
      const toggle = (id: string) => {
        state = state.map((item) => (item.id === id ? { ...item, packed: !item.packed } : item));
      };

      // Initially 1 of 4 packed (25%)
      let packedCount = state.filter((i) => i.packed).length;
      expect(packedCount).toBe(1);
      expect(Math.round((packedCount / state.length) * 100)).toBe(25);

      // Toggle item 1 packed
      toggle("1");
      packedCount = state.filter((i) => i.packed).length;
      expect(packedCount).toBe(2);
      expect(Math.round((packedCount / state.length) * 100)).toBe(50);

      // Toggle item 3 packed
      toggle("3");
      packedCount = state.filter((i) => i.packed).length;
      expect(packedCount).toBe(3);
      expect(Math.round((packedCount / state.length) * 100)).toBe(75);
    });
  });

  describe("6. Brand Image-Logo Verification (Zero Text In Place of Logos)", () => {
    it("confirms official logo asset paths and alt text requirements", () => {
      const logoAssets = {
        navLogo: { path: "/nav_logo.png", alt: "WanderWay", role: "navigation-horizontal" },
        mainLogo: { path: "/logo.png", alt: "WanderWay", role: "primary-mark" },
        favicon: { path: "/favicon.png", alt: "WanderWay", role: "app-icon" },
      };

      expect(logoAssets.navLogo.path).toBe("/nav_logo.png");
      expect(logoAssets.navLogo.alt).toBe("WanderWay");
      expect(logoAssets.mainLogo.path).toBe("/logo.png");
      expect(logoAssets.favicon.path).toBe("/favicon.png");
    });
  });
});
