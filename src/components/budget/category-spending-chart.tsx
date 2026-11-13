"use client";

import React, { useState, useMemo, useRef } from "react";
import * as d3 from "d3";

export interface CategoryExpenseData {
  id: string;
  category: string;
  title: string;
  amount: number; // in major currency units
  isPaid?: boolean;
}

interface CategorySpendingChartProps {
  items: CategoryExpenseData[];
  currencySymbol?: string;
  formatCurrency: (amount: number) => string;
  onSelectCategory?: (category: string | null) => void;
  selectedCategory?: string | null;
}

interface CategorySummary {
  key: string;
  label: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
  itemCount: number;
}

const CATEGORY_DEFINITIONS: Record<
  string,
  { label: string; icon: string; color: string; keywords: string[] }
> = {
  transport: {
    label: "Transport",
    icon: "train",
    color: "#2563eb", // blue-600
    keywords: ["transport", "train", "flight", "rail", "shinkansen", "transit", "taxi", "bus", "car"],
  },
  lodging: {
    label: "Lodging",
    icon: "hotel",
    color: "#7c3aed", // violet-600
    keywords: ["lodging", "hotel", "ryokan", "stay", "resort", "hostel", "airbnb", "accommodation"],
  },
  activities: {
    label: "Activities",
    icon: "attractions",
    color: "#059669", // emerald-600
    keywords: ["activities", "activity", "attraction", "tour", "temple", "museum", "pass", "ticket", "sightseeing"],
  },
  food: {
    label: "Food & Dining",
    icon: "restaurant",
    color: "#ea580c", // orange-600
    keywords: ["food", "dining", "restaurant", "meal", "kaiseki", "snack", "market", "cafe", "dinner", "lunch"],
  },
  gear: {
    label: "Gear & Misc",
    icon: "backpack",
    color: "#0891b2", // cyan-600
    keywords: ["gear", "misc", "miscellaneous", "luggage", "wifi", "equipment", "souvenir", "shopping"],
  },
};

function normalizeCategoryKey(rawCategory: string): string {
  const lower = (rawCategory || "").toLowerCase();
  for (const [key, def] of Object.entries(CATEGORY_DEFINITIONS)) {
    if (def.keywords.some((k) => lower.includes(k))) {
      return key;
    }
  }
  return "gear";
}

export function CategorySpendingChart({
  items,
  formatCurrency,
  onSelectCategory,
  selectedCategory,
}: CategorySpendingChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Group line items into 5 standard categories
  const { summaries, totalSpend } = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {
      transport: { amount: 0, count: 0 },
      lodging: { amount: 0, count: 0 },
      activities: { amount: 0, count: 0 },
      food: { amount: 0, count: 0 },
      gear: { amount: 0, count: 0 },
    };

    let total = 0;
    for (const item of items) {
      const key = normalizeCategoryKey(item.category);
      const amt = Number(item.amount) || 0;
      map[key].amount += amt;
      map[key].count += 1;
      total += amt;
    }

    const list: CategorySummary[] = Object.entries(CATEGORY_DEFINITIONS)
      .map(([key, def]) => {
        const data = map[key] || { amount: 0, count: 0 };
        const pct = total > 0 ? (data.amount / total) * 100 : 0;
        return {
          key,
          label: def.label,
          icon: def.icon,
          color: def.color,
          amount: data.amount,
          percentage: Number(pct.toFixed(1)),
          itemCount: data.count,
        };
      })
      .filter((c) => c.amount > 0 || c.itemCount > 0)
      .sort((a, b) => b.amount - a.amount);

    return { summaries: list, totalSpend: total };
  }, [items]);

  // Dimensions
  const width = 280;
  const height = 280;
  const margin = 20;
  const radius = Math.min(width, height) / 2 - margin;
  const innerRadius = radius * 0.62;

  // D3 Pie Generator
  const pieData = useMemo(() => {
    const pie = d3
      .pie<CategorySummary>()
      .value((d) => d.amount)
      .sort(null)
      .padAngle(0.025);

    return pie(summaries);
  }, [summaries]);

  // D3 Arc Generator
  const arcGenerator = useMemo(() => {
    return d3
      .arc<d3.PieArcDatum<CategorySummary>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(6);
  }, [innerRadius, radius]);

  // Hovered Arc Generator (slightly enlarged outer radius)
  const hoveredArcGenerator = useMemo(() => {
    return d3
      .arc<d3.PieArcDatum<CategorySummary>>()
      .innerRadius(innerRadius - 2)
      .outerRadius(radius + 8)
      .cornerRadius(8);
  }, [innerRadius, radius]);

  // Active display info in donut hole
  const activeSummary = useMemo(() => {
    if (hoveredKey) {
      return summaries.find((s) => s.key === hoveredKey) || null;
    }
    if (selectedCategory) {
      return summaries.find((s) => s.key === selectedCategory || s.label.toLowerCase() === selectedCategory.toLowerCase()) || null;
    }
    return null;
  }, [hoveredKey, selectedCategory, summaries]);

  const handleCategoryClick = (key: string) => {
    if (onSelectCategory) {
      if (selectedCategory === key) {
        onSelectCategory(null);
      } else {
        onSelectCategory(key);
      }
    }
  };

  return (
    <div className="w-full bg-surface-container-low rounded-3xl p-6 sm:p-7 border border-surface-container-high/60 shadow-xs flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container-high/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">donut_large</span>
            <h3 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
              Spending Breakdown by Category
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              D3 Visualization
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Interactive expenditure distribution across transport, lodging, activities, dining, and gear.
          </p>
        </div>

        {selectedCategory && (
          <button
            type="button"
            onClick={() => onSelectCategory && onSelectCategory(null)}
            className="self-start sm:self-auto px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-[11px] font-semibold text-on-surface flex items-center gap-1 transition-colors cursor-pointer border border-surface-container-highest"
          >
            <span>Reset Category Filter</span>
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        )}
      </div>

      {summaries.length === 0 ? (
        <div className="py-12 text-center text-on-surface-variant flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-4xl text-primary/40">pie_chart</span>
          <p className="text-xs font-semibold">No category expenditures recorded yet</p>
          <p className="text-[11px] text-on-surface-variant/70 max-w-xs">
            Add line items to your budget to visualize interactive category proportions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: D3 Donut Visual (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            <div className="relative size-[280px]">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full overflow-visible drop-shadow-xs"
              >
                <g transform={`translate(${width / 2}, ${height / 2})`}>
                  {pieData.map((slice) => {
                    const isHovered = hoveredKey === slice.data.key;
                    const isSelected = selectedCategory === slice.data.key;
                    const isMuted = (hoveredKey && !isHovered) || (selectedCategory && !isSelected);

                    return (
                      <g
                        key={slice.data.key}
                        className="cursor-pointer transition-all duration-200"
                        onMouseEnter={() => setHoveredKey(slice.data.key)}
                        onMouseLeave={() => setHoveredKey(null)}
                        onClick={() => handleCategoryClick(slice.data.key)}
                      >
                        <path
                          d={(isHovered ? hoveredArcGenerator(slice) : arcGenerator(slice)) || undefined}
                          fill={slice.data.color}
                          opacity={isMuted ? 0.35 : 1}
                          stroke="#ffffff"
                          strokeWidth={isHovered ? 2.5 : 1.5}
                          className="transition-all duration-300"
                        />
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Centered Dynamic Readout in Donut Hole */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4"
                style={{
                  top: `${height * 0.18}px`,
                  bottom: `${height * 0.18}px`,
                  left: `${width * 0.18}px`,
                  right: `${width * 0.18}px`,
                }}
              >
                {activeSummary ? (
                  <div className="animate-in fade-in zoom-in-95 duration-150">
                    <span className="material-symbols-outlined text-primary text-[20px] mb-0.5">
                      {activeSummary.icon}
                    </span>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface truncate max-w-[130px]">
                      {activeSummary.label}
                    </div>
                    <div className="text-base sm:text-lg font-black text-on-surface tracking-tight mt-0.5 font-mono">
                      {formatCurrency(activeSummary.amount)}
                    </div>
                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-primary mt-0.5">
                      <span>{activeSummary.percentage}%</span>
                      <span>•</span>
                      <span>{activeSummary.itemCount} items</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
                      Total Allocated
                    </span>
                    <div className="text-lg sm:text-xl font-black text-on-surface tracking-tight mt-0.5 font-mono">
                      {formatCurrency(totalSpend)}
                    </div>
                    <span className="text-[10px] text-on-surface-variant/80 mt-0.5 block">
                      {items.length} total entries
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant/70 text-center mt-3">
              Hover over slices to inspect; click to isolate category expenses.
            </p>
          </div>

          {/* Right: Comparative Breakdown List & Progress Bars (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {summaries.map((cat) => {
              const isHovered = hoveredKey === cat.key;
              const isSelected = selectedCategory === cat.key;

              return (
                <div
                  key={cat.key}
                  onMouseEnter={() => setHoveredKey(cat.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={() => handleCategoryClick(cat.key)}
                  className={`p-3.5 rounded-2xl transition-all cursor-pointer border flex flex-col gap-2 ${
                    isSelected
                      ? "bg-surface-container border-primary shadow-xs ring-1 ring-primary/40"
                      : isHovered
                      ? "bg-surface-container border-outline-variant/60 shadow-xs"
                      : "bg-surface-container-lowest/80 border-surface-container-high/60 hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="size-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">
                        {cat.icon}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                        {cat.label}
                      </span>
                      <span className="text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded font-mono">
                        {cat.itemCount}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 shrink-0">
                      <span className="text-xs sm:text-sm font-extrabold text-on-surface font-mono">
                        {formatCurrency(cat.amount)}
                      </span>
                      <span className="text-xs font-bold text-primary font-mono w-10 text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Visual Proportion Bar */}
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
