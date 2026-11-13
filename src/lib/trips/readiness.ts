import { VAULT_CATEGORIES } from "@/lib/vault/helpers";

export type ReadinessStatus = "complete" | "partial" | "pending";
export type ReadinessTier = "ready" | "in_progress" | "getting_started";
export type ReadinessPillarKey = "itinerary" | "budget" | "documents";

export interface TripReadinessInput {
  itinerary: {
    totalDays: number;
    scheduledDays: number;
    totalActivities: number;
  };
  budget: {
    hasBudgetLimit: boolean;
    totalLineItems: number;
    settledOrPaidCount: number;
    verifiedPriceCount: number;
    spentMinorUnits: number;
    limitMinorUnits: number;
  };
  documents: {
    totalDocuments: number;
    coveredCategories: string[];
    targetCategoriesCount?: number;
  };
}

export interface ReadinessPillarSummary {
  key: ReadinessPillarKey;
  label: string;
  percent: number;
  status: ReadinessStatus;
  detail: string;
  hrefSuffix: string;
}

export interface TripReadinessSummary {
  overallPercent: number;
  tier: ReadinessTier;
  tierLabel: string;
  isOverBudget: boolean;
  pillars: {
    itinerary: ReadinessPillarSummary;
    budget: ReadinessPillarSummary;
    documents: ReadinessPillarSummary;
  };
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toStatus(percent: number): ReadinessStatus {
  if (percent >= 85) return "complete";
  if (percent > 0) return "partial";
  return "pending";
}

/**
 * Computes deterministic, grounded readiness across itinerary, budget, and documents.
 */
export function calculateTripReadiness(input: TripReadinessInput): TripReadinessSummary {
  // 1. Itinerary Pillar
  const safeTotalDays = Math.max(0, Math.floor(input.itinerary.totalDays));
  const safeScheduledDays = Math.max(0, Math.min(safeTotalDays, Math.floor(input.itinerary.scheduledDays)));
  const safeActivities = Math.max(0, Math.floor(input.itinerary.totalActivities));

  let itineraryPercent = 0;
  if (safeTotalDays > 0 && safeActivities > 0) {
    const dayCoverageRatio = safeScheduledDays / safeTotalDays;
    const targetStops = Math.max(2, safeTotalDays * 2);
    const activityDensityRatio = Math.min(1, safeActivities / targetStops);
    itineraryPercent = clampPercent(dayCoverageRatio * 70 + activityDensityRatio * 30);
  }

  const itineraryDetail =
    safeActivities > 0
      ? `${safeScheduledDays}/${Math.max(1, safeTotalDays)} days · ${safeActivities} ${safeActivities === 1 ? "stop" : "stops"}`
      : "No stops added yet";

  // 2. Budget Pillar
  const totalItems = Math.max(0, Math.floor(input.budget.totalLineItems));
  const paidCount = Math.max(0, Math.min(totalItems, Math.floor(input.budget.settledOrPaidCount)));
  const verifiedCount = Math.max(0, Math.min(totalItems, Math.floor(input.budget.verifiedPriceCount)));
  const spent = Math.max(0, Math.round(input.budget.spentMinorUnits));
  const limit = Math.max(0, Math.round(input.budget.limitMinorUnits));
  const isOverBudget = limit > 0 && spent > limit;

  let budgetScore = 0;
  if (input.budget.hasBudgetLimit || limit > 0) {
    budgetScore += 30;
  }
  if (totalItems > 0) {
    budgetScore += 30;
    budgetScore += (verifiedCount / totalItems) * 20;
    budgetScore += (paidCount / totalItems) * 20;
  }
  const budgetPercent = clampPercent(budgetScore);

  let budgetDetail = "No budget set yet";
  if (totalItems > 0) {
    budgetDetail = isOverBudget
      ? `${paidCount}/${totalItems} paid · Over limit`
      : `${paidCount}/${totalItems} paid · ${verifiedCount}/${totalItems} priced`;
  } else if (input.budget.hasBudgetLimit || limit > 0) {
    budgetDetail = "Cap set · Add expenses";
  }

  // 3. Documents Pillar
  const safeDocs = Math.max(0, Math.floor(input.documents.totalDocuments));
  const targetCats = Math.max(1, input.documents.targetCategoriesCount ?? VAULT_CATEGORIES.length);
  const validCategorySet = new Set<string>(VAULT_CATEGORIES);
  const distinctCovered = new Set(
    input.documents.coveredCategories
      .map((c) => c.trim().toLowerCase())
      .filter((c) => validCategorySet.has(c)),
  ).size;

  let documentsPercent = 0;
  if (safeDocs > 0) {
    const fileBaseline = Math.min(1, safeDocs / 3) * 40;
    const categoryCoverage = Math.min(1, distinctCovered / targetCats) * 60;
    documentsPercent = clampPercent(fileBaseline + categoryCoverage);
  }

  const documentsDetail =
    safeDocs > 0
      ? `${distinctCovered}/${targetCats} vaults · ${safeDocs} ${safeDocs === 1 ? "file" : "files"}`
      : "0 passes uploaded";

  // Overall Aggregated Readiness
  const overallPercent = clampPercent(
    (itineraryPercent + budgetPercent + documentsPercent) / 3,
  );

  let tier: ReadinessTier = "getting_started";
  let tierLabel = "Getting Started";
  if (overallPercent >= 80) {
    tier = "ready";
    tierLabel = "Launch Ready";
  } else if (overallPercent >= 40) {
    tier = "in_progress";
    tierLabel = "In Progress";
  }

  return {
    overallPercent,
    tier,
    tierLabel,
    isOverBudget,
    pillars: {
      itinerary: {
        key: "itinerary",
        label: "Itinerary",
        percent: itineraryPercent,
        status: toStatus(itineraryPercent),
        detail: itineraryDetail,
        hrefSuffix: "",
      },
      budget: {
        key: "budget",
        label: "Budget",
        percent: budgetPercent,
        status: toStatus(budgetPercent),
        detail: budgetDetail,
        hrefSuffix: "/budget",
      },
      documents: {
        key: "documents",
        label: "Documents",
        percent: documentsPercent,
        status: toStatus(documentsPercent),
        detail: documentsDetail,
        hrefSuffix: "/vault",
      },
    },
  };
}

export interface WorkspaceReadinessSource {
  days: Array<{
    id?: string;
    itinerary_activities?: Array<{ id?: string }> | null;
  }>;
  budgetLimitMinorUnits: number | null | undefined;
  lineItems: Array<{
    amount_minor_units?: number | null;
    evidence_type?: string | null;
    is_paid?: boolean | null;
  }>;
  documents: Array<{
    category?: string | null;
  }>;
}

/**
 * Maps Supabase / showcase workspace collections into a normalized readiness summary.
 */
export function buildTripReadinessFromWorkspace(
  source: WorkspaceReadinessSource,
): TripReadinessSummary {
  const days = source.days || [];
  const totalDays = days.length;
  const scheduledDays = days.filter(
    (d) => Array.isArray(d.itinerary_activities) && d.itinerary_activities.length > 0,
  ).length;
  const totalActivities = days.reduce(
    (sum, d) => sum + (d.itinerary_activities?.length || 0),
    0,
  );

  const lineItems = source.lineItems || [];
  const limitMinorUnits = Math.max(0, Number(source.budgetLimitMinorUnits || 0));
  const spentMinorUnits = lineItems.reduce(
    (sum, item) => sum + Math.max(0, Number(item.amount_minor_units || 0)),
    0,
  );
  const settledOrPaidCount = lineItems.filter((item) => Boolean(item.is_paid)).length;
  const verifiedPriceCount = lineItems.filter(
    (item) => Boolean(item.evidence_type) && item.evidence_type !== "unknown",
  ).length;

  const docs = source.documents || [];
  const coveredCategories = docs
    .map((d) => d.category || "")
    .filter((c) => c.length > 0);

  return calculateTripReadiness({
    itinerary: {
      totalDays,
      scheduledDays,
      totalActivities,
    },
    budget: {
      hasBudgetLimit: limitMinorUnits > 0,
      totalLineItems: lineItems.length,
      settledOrPaidCount,
      verifiedPriceCount,
      spentMinorUnits,
      limitMinorUnits,
    },
    documents: {
      totalDocuments: docs.length,
      coveredCategories,
    },
  });
}
