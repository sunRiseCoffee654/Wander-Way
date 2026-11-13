"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Calendar, Compass, Globe } from "lucide-react";
import { autocompletePlaces } from "@/lib/geoapify/actions";
import type { PlaceSuggestion } from "@/lib/geoapify/types";

interface WhereWhenData {
  title: string;
  destination: string;
  originLocation: string;
  startDate: string;
  endDate: string;
}

interface WhereWhenSectionProps {
  data: WhereWhenData;
  onChange: (updated: Partial<WhereWhenData>) => void;
  errors?: Record<string, string>;
}

export function WhereWhenSection({
  data,
  onChange,
  errors = {},
}: WhereWhenSectionProps) {
  const [destQuery, setDestQuery] = useState(data.destination);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOriginField, setShowOriginField] = useState(Boolean(data.originLocation));
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced place autocomplete triggered by user typing
  function handleDestinationInput(query: string) {
    setDestQuery(query);
    onChange({ destination: query });

    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await autocompletePlaces(query);
        setSuggestions(res.suggestions || []);
        setIsOpen((res.suggestions || []).length > 0);
      } catch (err) {
        console.error("Autocomplete failed:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }

  // Click outside to dismiss suggestions
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate day and night count if valid dates
  const dayCount =
    data.startDate && data.endDate && data.endDate >= data.startDate
      ? Math.round(
          (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Step 1 of 4
        </span>
        <h2 className="mt-1 font-serif text-2xl font-semibold tracking-[-0.01em] text-text-primary sm:text-3xl">
          Where and when
        </h2>
        <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
          Set your destination and travel dates. WanderWay grounds your itinerary with verified real-world places.
        </p>
      </div>

      <div className="space-y-6">
        {/* Destination with Autocomplete */}
        <div className="relative" ref={dropdownRef}>
          <label htmlFor="destination-input" className="block text-sm font-medium text-text-primary">
            Destination <span className="text-error-fg">*</span>
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-primary">
              <MapPin className="size-4.5" />
            </span>
            <input
              id="destination-input"
              type="text"
              value={destQuery}
              onChange={(e) => handleDestinationInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setIsOpen(true)}
              placeholder="e.g. Jaipur, Rajasthan or Munnar, Kerala"
              className="w-full rounded-control border border-control-border bg-surface py-2.5 pr-4 pl-10 text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-focus focus:ring-2 focus:ring-focus/20 shadow-xs"
              autoComplete="off"
            />
            {loading && (
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs text-text-muted">
                Searching places...
              </span>
            )}
          </div>
          {errors.destination && (
            <p className="mt-1.5 text-xs font-medium text-error-fg">{errors.destination}</p>
          )}

          {/* Autocomplete Dropdown */}
          {isOpen && suggestions.length > 0 && (
            <ul
              role="listbox"
              className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-panel border border-border-subtle bg-surface py-1.5 shadow-elevation-2 animate-in fade-in duration-100"
            >
              {suggestions.map((s) => (
                <li
                  key={s.placeId}
                  role="option"
                  aria-selected={data.destination === s.formatted}
                  onClick={() => {
                    onChange({
                      destination: s.formatted,
                      title: data.title ? data.title : `Trip to ${s.name || s.formatted}`,
                    });
                    setDestQuery(s.formatted);
                    setIsOpen(false);
                  }}
                  className="flex cursor-pointer items-start gap-2.5 px-3.5 py-2.5 text-sm text-text-primary hover:bg-surface-elevated transition-colors"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <span className="font-semibold text-text-primary">{s.name}</span>
                    <span className="block text-xs text-text-secondary mt-0.5">{s.formatted}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Date Range Selection */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-text-primary">
              Departure date <span className="text-error-fg">*</span>
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                <Calendar className="size-4" />
              </span>
              <input
                id="start-date"
                type="date"
                value={data.startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => onChange({ startDate: e.target.value })}
                className="w-full rounded-control border border-control-border bg-surface py-2.5 pr-3 pl-10 text-sm font-medium text-text-primary focus:border-focus focus:ring-2 focus:ring-focus/20 shadow-xs"
              />
            </div>
            {errors.startDate && (
              <p className="mt-1.5 text-xs font-medium text-error-fg">{errors.startDate}</p>
            )}
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-text-primary">
              Return date <span className="text-error-fg">*</span>
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                <Calendar className="size-4" />
              </span>
              <input
                id="end-date"
                type="date"
                value={data.endDate}
                min={data.startDate || new Date().toISOString().split("T")[0]}
                onChange={(e) => onChange({ endDate: e.target.value })}
                className="w-full rounded-control border border-control-border bg-surface py-2.5 pr-3 pl-10 text-sm font-medium text-text-primary focus:border-focus focus:ring-2 focus:ring-focus/20 shadow-xs"
              />
            </div>
            {errors.endDate && (
              <p className="mt-1.5 text-xs font-medium text-error-fg">{errors.endDate}</p>
            )}
          </div>
        </div>

        {/* Derived Duration indicator */}
        {dayCount > 0 && (
          <div className="flex items-center gap-2 rounded-panel border border-primary/20 bg-selected-bg/60 px-4 py-3 text-xs font-semibold text-on-selected shadow-xs">
            <Compass className="size-4 text-primary shrink-0" />
            <span>
              {dayCount} {dayCount === 1 ? "day" : "days"} / {dayCount - 1}{" "}
              {dayCount - 1 === 1 ? "night" : "nights"} planned
            </span>
          </div>
        )}

        {/* Origin Location Disclosure */}
        <div className="pt-2">
          {!showOriginField ? (
            <button
              type="button"
              onClick={() => setShowOriginField(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              <Globe className="size-3.5" />
              <span>+ Add starting / home city (optional)</span>
            </button>
          ) : (
            <div>
              <label htmlFor="origin-location" className="block text-sm font-medium text-text-primary">
                Starting place / origin location <span className="text-xs font-normal text-text-muted">(Optional)</span>
              </label>
              <input
                id="origin-location"
                type="text"
                value={data.originLocation}
                onChange={(e) => onChange({ originLocation: e.target.value })}
                placeholder="e.g. New Delhi or Mumbai"
                className="mt-1.5 w-full rounded-control border border-control-border bg-surface px-3.5 py-2.5 text-sm text-text-primary focus:border-focus focus:ring-2 focus:ring-focus/20 shadow-xs"
              />
            </div>
          )}
        </div>

        {/* Optional Title */}
        <div className="pt-1">
          <label htmlFor="trip-title" className="block text-sm font-medium text-text-primary">
            Trip title <span className="text-xs font-normal text-text-muted">(Optional)</span>
          </label>
          <input
            id="trip-title"
            type="text"
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={data.destination ? `Trip to ${data.destination}` : "e.g. Royal Rajasthan Heritage"}
            className="mt-1.5 w-full rounded-control border border-control-border bg-surface px-3.5 py-2.5 text-sm text-text-primary focus:border-focus focus:ring-2 focus:ring-focus/20 shadow-xs"
          />
        </div>
      </div>
    </div>
  );
}
