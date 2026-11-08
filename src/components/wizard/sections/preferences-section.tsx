"use client";

import {
  Compass,
  Coffee,
  Zap,
  Landmark,
  Utensils,
  Trees,
  Building2,
  Palette,
  ShoppingBag,
  Sparkles,
  Camera,
  Heart,
  Music,
  Map,
  Check,
} from "lucide-react";
import type { TravelPace } from "@/lib/ai/types";

interface PreferencesData {
  travelPace: TravelPace;
  interests: string[];
  notes: string;
}

interface PreferencesSectionProps {
  data: PreferencesData;
  onChange: (updated: Partial<PreferencesData>) => void;
  errors?: Record<string, string>;
}

const PACE_OPTIONS: Array<{
  value: TravelPace;
  label: string;
  badge: string;
  sublabel: string;
  icon: typeof Coffee;
}> = [
  {
    value: "relaxed",
    label: "Relaxed",
    badge: "2–3 stops / day",
    sublabel: "Leisurely mornings, long coffee breaks, and unhurried strolls.",
    icon: Coffee,
  },
  {
    value: "balanced",
    label: "Balanced",
    badge: "3–4 stops / day",
    sublabel: "A thoughtful rhythm of iconic highlights and local neighborhood gems.",
    icon: Compass,
  },
  {
    value: "full",
    label: "Full",
    badge: "5–6 stops / day",
    sublabel: "High-energy exploration maximizing your time from morning to night.",
    icon: Zap,
  },
];

const INTEREST_TAGS: Array<{ label: string; icon: typeof Landmark }> = [
  { label: "Culture & Heritage", icon: Landmark },
  { label: "Food & Dining", icon: Utensils },
  { label: "Nature & Outdoors", icon: Trees },
  { label: "Architecture", icon: Building2 },
  { label: "Art & Museums", icon: Palette },
  { label: "Shopping & Markets", icon: ShoppingBag },
  { label: "Historic Sites", icon: Landmark },
  { label: "Scenic Photography", icon: Camera },
  { label: "Hidden Gems", icon: Sparkles },
  { label: "Local Neighborhoods", icon: Map },
  { label: "Family Friendly", icon: Heart },
  { label: "Nightlife & Music", icon: Music },
];

export function PreferencesSection({
  data,
  onChange,
}: PreferencesSectionProps) {
  function toggleInterest(tag: string) {
    if (data.interests.includes(tag)) {
      onChange({ interests: data.interests.filter((t) => t !== tag) });
    } else {
      onChange({ interests: [...data.interests, tag] });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Step 3 of 4
        </span>
        <h2 className="mt-1 font-serif text-2xl font-semibold tracking-[-0.01em] text-text-primary sm:text-3xl">
          Travel pace and interests
        </h2>
        <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
          Fine-tune the daily density of activities and the cultural themes that shape your journey.
        </p>
      </div>

      {/* Travel Pace Cards */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-text-primary">
          Daily travel pace
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PACE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = data.travelPace === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ travelPace: opt.value })}
                className={`relative flex cursor-pointer flex-col items-start rounded-panel border p-5 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-selected-bg/40 text-text-primary ring-2 ring-primary/40 shadow-xs"
                    : "border-border-subtle bg-surface text-text-secondary hover:border-control-border hover:bg-surface-elevated shadow-xs"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`flex size-10 items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-primary bg-primary text-on-primary"
                        : "border-border-subtle bg-surface-elevated text-primary"
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <span className="rounded-control bg-surface-elevated px-2 py-0.5 text-[10px] font-semibold text-text-primary border border-border-subtle">
                    {opt.badge}
                  </span>
                </div>

                <div className="mt-4 font-serif text-base font-bold text-text-primary">
                  {opt.label}
                </div>
                <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                  {opt.sublabel}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interests Multi-Select Pills */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-text-primary">
            Interests & themes
          </label>
          <span className="text-xs text-text-muted">
            {data.interests.length} selected
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {INTEREST_TAGS.map(({ label, icon: Icon }) => {
            const isSelected = data.interests.includes(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleInterest(label)}
                className={`flex cursor-pointer items-center gap-2 rounded-panel border px-3.5 py-2 text-xs font-medium transition-all ${
                  isSelected
                    ? "border-primary bg-primary text-on-primary shadow-xs"
                    : "border-border-subtle bg-surface text-text-primary hover:border-control-border hover:bg-surface-elevated"
                }`}
              >
                <Icon className={`size-3.5 ${isSelected ? "text-on-primary" : "text-primary"}`} />
                <span>{label}</span>
                {isSelected && <Check className="size-3 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Special Preferences & Dietary Notes */}
      <div className="space-y-2 pt-2">
        <label htmlFor="trip-notes" className="block text-sm font-semibold text-text-primary">
          Special notes & dietary requirements{" "}
          <span className="text-xs font-normal text-text-muted">(Optional, max 500 chars)</span>
        </label>
        <textarea
          id="trip-notes"
          rows={3}
          maxLength={500}
          value={data.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="e.g. Vegetarian dining preferred, prefer walking wherever possible, travelling with elderly family members."
          className="w-full rounded-control border border-control-border bg-surface p-3.5 text-sm text-text-primary placeholder:text-text-muted focus:border-focus focus:ring-2 focus:ring-focus/20 shadow-xs leading-relaxed"
        />
        <div className="flex justify-between text-[11px] text-text-muted">
          <span>Notes are treated as preferences only; Gemini never bypasses grounding rules.</span>
          <span>{data.notes.length}/500</span>
        </div>
      </div>
    </div>
  );
}
