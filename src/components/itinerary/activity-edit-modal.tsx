"use client";

import { useState } from "react";
import type { Activity } from "@/lib/itinerary/actions";

export interface ActivityEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Activity>) => Promise<void> | void;
  initialData?: Partial<Activity> | null;
  dayNumber: number;
}

export const CATEGORY_DEFINITIONS = [
  { id: "Sightseeing", label: "Sightseeing", icon: "tour", color: "text-primary" },
  { id: "Culture / Temple", label: "Culture / Temple", icon: "temple_buddhist", color: "text-secondary" },
  { id: "Dining / Nightlife", label: "Dining / Nightlife", icon: "nightlife", color: "text-tertiary" },
  { id: "Food / Market", label: "Food / Market", icon: "restaurant", color: "text-amber-600" },
  { id: "Nature / Park", label: "Nature / Park", icon: "park", color: "text-emerald-600" },
  { id: "Transit / Welcome", label: "Transit / Welcome", icon: "directions_transit", color: "text-blue-600" },
  { id: "Shopping", label: "Shopping", icon: "shopping_bag", color: "text-rose-600" },
  { id: "Lodging", label: "Lodging", icon: "hotel", color: "text-indigo-600" },
  { id: "Experience / Workshop", label: "Experience / Workshop", icon: "palette", color: "text-violet-600" },
] as const;

export type PriceEvidenceType =
  | "published_price"
  | "live_quote"
  | "verified_range"
  | "calculated_estimate"
  | "user_entered"
  | "unknown"
  | "free";

const PRICE_EVIDENCE_OPTIONS: {
  id: PriceEvidenceType;
  label: string;
  badge: string;
  description: string;
}[] = [
  { id: "user_entered", label: "User Entered", badge: "bg-surface-container-high text-on-surface", description: "Manual user estimate" },
  { id: "published_price", label: "Published Tariff", badge: "bg-emerald-500/10 text-emerald-600", description: "Official venue admission fee" },
  { id: "live_quote", label: "Live Quote", badge: "bg-primary/10 text-primary", description: "Confirmed rate or booking quote" },
  { id: "calculated_estimate", label: "Calculated Estimate", badge: "bg-amber-500/10 text-amber-600", description: "Derived average estimate" },
  { id: "free", label: "Free Entry", badge: "bg-secondary/10 text-secondary", description: "No admission fee required" },
  { id: "unknown", label: "Unknown / TBD", badge: "bg-surface-container-highest text-on-surface-variant", description: "Fee unconfirmed" },
];

const TIME_PRESETS = [
  { label: "09:00 (Morning)", value: "09:00" },
  { label: "12:30 (Lunch)", value: "12:30" },
  { label: "15:00 (Afternoon)", value: "15:00" },
  { label: "18:30 (Evening)", value: "18:30" },
];

export function normalizeTimeString(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  // Match HH:mm (24-hour)
  if (/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }
  // Match hh:mm AM/PM (12-hour)
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const mins = match12[2];
    const meridiem = match12[3].toUpperCase();
    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${mins}`;
  }
  return trimmed;
}

function parseInitialCostData(req: string) {
  let isFree = false;
  let cost = "";
  let evidence: PriceEvidenceType = "user_entered";

  if (req.toLowerCase().includes("free")) {
    isFree = true;
    evidence = "free";
  } else {
    const matchNum = req.match(/[\$¥€£]?\s*([0-9,]+(\.[0-9]{2})?)/);
    if (matchNum) {
      cost = matchNum[1].replace(/,/g, "");
    }

    if (req.includes("Published") || req.includes("Tariff")) {
      evidence = "published_price";
    } else if (req.includes("Quote")) {
      evidence = "live_quote";
    } else if (req.includes("Estimate")) {
      evidence = "calculated_estimate";
    }
  }

  return { isFree, cost, evidence };
}

export function ActivityEditModal(props: ActivityEditModalProps) {
  if (!props.isOpen) return null;
  return <ActivityEditModalContent key={props.initialData?.id || "new"} {...props} />;
}

function ActivityEditModalContent({
  onClose,
  onSave,
  initialData,
  dayNumber,
}: ActivityEditModalProps) {
  const isEditing = Boolean(initialData && initialData.id);
  const costInfo = parseInitialCostData(initialData?.booking_requirement || "");

  const [title, setTitle] = useState(initialData?.title || "");
  const [plannedTime, setPlannedTime] = useState(initialData?.planned_time || "");
  const [durationMinutes, setDurationMinutes] = useState(initialData?.duration_minutes ?? 60);
  const [placeName, setPlaceName] = useState(initialData?.place_name || "");
  const [placeCategory, setPlaceCategory] = useState<string>(
    initialData?.place_category || "Sightseeing"
  );
  const [description, setDescription] = useState(initialData?.description || "");
  const [isMustSee, setIsMustSee] = useState(Boolean(initialData?.is_must_see));

  // Price evidence & Cost state
  const [costAmount, setCostAmount] = useState<string>(costInfo.cost);
  const [currency, setCurrency] = useState<string>("JPY");
  const [evidenceType, setEvidenceType] = useState<PriceEvidenceType>(costInfo.evidence);
  const [isFreeEntry, setIsFreeEntry] = useState(costInfo.isFree);
  const [customBookingNote, setCustomBookingNote] = useState(
    initialData?.booking_requirement || ""
  );

  // Coordinates state
  const hasCoords = initialData?.latitude != null || initialData?.longitude != null;
  const [showCoordinates, setShowCoordinates] = useState(hasCoords);
  const [latitude, setLatitude] = useState<string>(
    initialData?.latitude != null ? String(initialData.latitude) : ""
  );
  const [longitude, setLongitude] = useState<string>(
    initialData?.longitude != null ? String(initialData.longitude) : ""
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Please enter an activity title.");
      return;
    }

    if (durationMinutes <= 0) {
      setErrorMsg("Duration must be greater than 0 minutes.");
      return;
    }

    // Validate coordinates if provided
    let parsedLat: number | null = null;
    let parsedLng: number | null = null;

    if (latitude.trim()) {
      const latNum = parseFloat(latitude.trim());
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        setErrorMsg("Latitude must be a valid number between -90 and 90.");
        return;
      }
      parsedLat = latNum;
    }

    if (longitude.trim()) {
      const lngNum = parseFloat(longitude.trim());
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        setErrorMsg("Longitude must be a valid number between -180 and 180.");
        return;
      }
      parsedLng = lngNum;
    }

    // Assemble booking_requirement with evidence tier
    let finalBookingReq: string | null = null;
    if (isFreeEntry) {
      finalBookingReq = customBookingNote.trim() || "No booking required (Free entry)";
    } else if (costAmount.trim()) {
      const currSymbol = currency === "JPY" ? "¥" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
      const evidenceLabel =
        evidenceType === "published_price"
          ? "Published Tariff"
          : evidenceType === "live_quote"
          ? "Live Quote"
          : evidenceType === "calculated_estimate"
          ? "Calculated Estimate"
          : "User Entered";
      finalBookingReq = `${currSymbol}${costAmount.trim()} [${evidenceLabel}]${
        customBookingNote.trim() ? ` — ${customBookingNote.trim()}` : ""
      }`;
    } else if (customBookingNote.trim()) {
      finalBookingReq = customBookingNote.trim();
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      const normalizedTime = plannedTime.trim() ? normalizeTimeString(plannedTime) : null;

      await onSave({
        title: title.trim(),
        planned_time: normalizedTime,
        duration_minutes: Number(durationMinutes) || 60,
        place_name: placeName.trim() || null,
        place_category: placeCategory,
        booking_requirement: finalBookingReq,
        description: description.trim() || null,
        is_must_see: isMustSee,
        latitude: parsedLat,
        longitude: parsedLng,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save activity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryDef =
    CATEGORY_DEFINITIONS.find((c) => c.id === placeCategory) || CATEGORY_DEFINITIONS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-surface text-on-surface rounded-3xl border border-surface-container-high/40 shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container-high/40 bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-primary">
              {isEditing ? "edit_calendar" : "add_location_alt"}
            </span>
            <h2 id="activity-modal-title" className="text-lg font-semibold text-on-surface">
              {isEditing ? "Edit Activity" : `Add Activity • Day ${dayNumber}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Activity Title <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fushimi Inari Morning Torii Walk"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          {/* Category Selector with Icons */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Category
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <span className={`material-symbols-outlined text-[18px] ${selectedCategoryDef.color}`}>
                  {selectedCategoryDef.icon}
                </span>
              </div>
              <select
                value={placeCategory}
                onChange={(e) => setPlaceCategory(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all cursor-pointer"
              >
                {CATEGORY_DEFINITIONS.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Planned Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-on-surface">
                  Planned Time
                </label>
                <span className="text-[10px] text-on-surface-variant font-mono">HH:mm (24h)</span>
              </div>
              <input
                type="text"
                value={plannedTime}
                onChange={(e) => setPlannedTime(e.target.value)}
                placeholder="e.g. 09:30 or 14:00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              {/* Quick Time Presets */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {TIME_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlannedTime(p.value)}
                    className="px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-[10px] font-medium transition-colors"
                  >
                    {p.value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="5"
                max="1440"
                step="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Math.max(5, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Place Name / Venue */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Place Name / Venue
            </label>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="e.g. Fushimi Inari Shrine"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          {/* Structured Cost & Price Evidence Tier (PRD v3.0 §5.7) */}
          <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">payments</span>
                <span>Cost & Pricing Evidence Tier</span>
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-on-surface select-none">
                <input
                  type="checkbox"
                  checked={isFreeEntry}
                  onChange={(e) => {
                    setIsFreeEntry(e.target.checked);
                    if (e.target.checked) setEvidenceType("free");
                  }}
                  className="size-3.5 rounded accent-primary"
                />
                <span>Free Admission</span>
              </label>
            </div>

            {!isFreeEntry && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                    Cost Amount
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="px-2 py-2 rounded-xl bg-surface-container border border-surface-container-high text-on-surface text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="JPY">¥ JPY</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                      <option value="GBP">£ GBP</option>
                      <option value="INR">₹ INR</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={costAmount}
                      onChange={(e) => setCostAmount(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-surface-container-high text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                    Evidence Tier (PRD §5.7)
                  </label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value as PriceEvidenceType)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-surface-container-high text-on-surface text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {PRICE_EVIDENCE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                Booking Requirement / Reservation Details
              </label>
              <input
                type="text"
                value={customBookingNote}
                onChange={(e) => setCustomBookingNote(e.target.value)}
                placeholder="e.g. Reservation Confirmed #GS-104 or Pay on entrance"
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-surface-container-high text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Coordinates (Optional, Map Pin Placement) */}
          <div className="rounded-2xl border border-surface-container-high/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCoordinates(!showCoordinates)}
              className="w-full px-3.5 py-2.5 bg-surface-container-low hover:bg-surface-container flex items-center justify-between text-xs font-semibold text-on-surface transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">pin_drop</span>
                <span>Map Coordinates (Vector Topology)</span>
              </span>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                {showCoordinates ? "expand_less" : "expand_more"}
              </span>
            </button>

            {showCoordinates && (
              <div className="p-3.5 bg-surface-container-lowest/50 space-y-2.5 border-t border-surface-container-high/40">
                <p className="text-[11px] text-on-surface-variant">
                  Optional GPS coordinates allow this activity to be plotted as a waypoint on the Vector Map.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface-variant mb-1">
                      Latitude (-90 to 90)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="e.g. 35.7148"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container border border-surface-container-high text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface-variant mb-1">
                      Longitude (-180 to 180)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="e.g. 139.7967"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container border border-surface-container-high text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes, tips, or what to see..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Priority Star / Must See */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="is-must-see-checkbox"
              type="checkbox"
              checked={isMustSee}
              onChange={(e) => setIsMustSee(e.target.checked)}
              className="size-4 rounded accent-primary cursor-pointer"
            />
            <label
              htmlFor="is-must-see-checkbox"
              className="text-xs font-medium text-on-surface cursor-pointer select-none flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-500">star</span>
              <span>Mark as Priority &ldquo;Must See&rdquo;</span>
            </label>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-surface-container-high/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isEditing ? "check" : "add"}
              </span>
              <span>{isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Add Activity"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
