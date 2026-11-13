"use client";

import { useState, useEffect, useMemo, useId } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { DestinationWeatherForecast, DailyForecast } from "@/lib/weather/types";
import {
  celsiusToFahrenheit,
  getWeatherPreparationAdvice,
  getFallbackWeather,
  interpretUvIndex,
} from "@/lib/weather/service";
import { addCustomPackingItem } from "@/lib/packing/actions";
import { cacheTelemetryOffline, getCachedTelemetryOffline } from "@/lib/offline/storage";
import { useOfflineStatus } from "@/lib/offline/use-offline";

interface TripWeatherWidgetProps {
  tripId?: string;
  tripTitle?: string;
  destination: string;
  startDate?: string | null;
  endDate?: string | null;
  initialWeather?: DestinationWeatherForecast | null;
  className?: string;
}

export function TripWeatherWidget({
  tripId,
  tripTitle,
  destination = "Jaipur, Rajasthan",
  startDate,
  endDate,
  initialWeather,
  className = "",
}: TripWeatherWidgetProps) {
  const [weather, setWeather] = useState<DestinationWeatherForecast | null>(initialWeather || null);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [isLoading, setIsLoading] = useState(!initialWeather);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [copiedTipId, setCopiedTipId] = useState<string | null>(null);

  // Weather-driven packing suggestions state
  const [addingItemId, setAddingItemId] = useState<string | null>(null);
  const [isAddingAll, setIsAddingAll] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const storageKey = `wanderway_weather_packing_${tripId || "demo"}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Set(parsed);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    return new Set();
  });
  const [packingToast, setPackingToast] = useState<{ message: string; itemName: string } | null>(null);

  const { isOffline } = useOfflineStatus(tripId || "global");
  const widgetId = useId();

  // Async data fetcher for component lifecycle
  useEffect(() => {
    let isCancelled = false;

    if (initialWeather) {
      return;
    }

    fetch(`/api/weather?destination=${encodeURIComponent(destination)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Unable to fetch live feed");
        return res.json();
      })
      .then((json) => {
        if (isCancelled) return;
        if (json.success && json.data) {
          setWeather(json.data);
          cacheTelemetryOffline(destination, { weather: json.data });
          setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (isCancelled) return;
        const cached = getCachedTelemetryOffline<{ weather?: DestinationWeatherForecast }>(destination);
        if (cached?.data?.weather) {
          setWeather(cached.data.weather);
        } else {
          setWeather(getFallbackWeather(destination));
        }
        setLastUpdated("Cached / Fallback");
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [destination, initialWeather]);

  // User-triggered manual refresh handler
  const handleManualRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/weather?destination=${encodeURIComponent(destination)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setWeather(json.data);
          cacheTelemetryOffline(destination, { weather: json.data });
          setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          return;
        }
      }
      throw new Error("Unable to fetch live feed");
    } catch {
      const cached = getCachedTelemetryOffline<{ weather?: DestinationWeatherForecast }>(destination);
      if (cached?.data?.weather) {
        setWeather(cached.data.weather);
      } else {
        setWeather(getFallbackWeather(destination));
      }
      setLastUpdated("Cached / Fallback");
    } finally {
      setIsLoading(false);
    }
  };

  // Derived 5-day forecast slice
  const fiveDayForecast = useMemo<DailyForecast[]>(() => {
    if (!weather?.daily || weather.daily.length === 0) {
      return getFallbackWeather(destination).daily.slice(0, 5);
    }
    return weather.daily.slice(0, 5);
  }, [weather, destination]);

  // Derived preparation advice for travel window
  const advice = useMemo(() => {
    const effectiveWeather = weather || getFallbackWeather(destination);
    return getWeatherPreparationAdvice(effectiveWeather, startDate, endDate);
  }, [weather, destination, startDate, endDate]);

  const activeDay = fiveDayForecast[selectedDayIdx] || fiveDayForecast[0];

  const formatTemp = (celsius: number) => {
    if (tempUnit === "F") {
      return `${celsiusToFahrenheit(celsius)}°F`;
    }
    return `${Math.round(celsius)}°C`;
  };

  const getRainRiskBadge = (risk: string) => {
    switch (risk) {
      case "high":
        return {
          bg: "bg-error-container text-on-error-container border-error/30",
          dot: "bg-error",
          label: "High Rain Risk",
        };
      case "moderate":
        return {
          bg: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
          dot: "bg-amber-500",
          label: "Showers Likely",
        };
      default:
        return {
          bg: "bg-tertiary-fixed text-on-tertiary-fixed border-tertiary/20",
          dot: "bg-tertiary",
          label: "Dry / Low Risk",
        };
    }
  };

  const handleCopyGearTip = (tipLabel: string, tipId: string) => {
    navigator.clipboard?.writeText?.(tipLabel);
    setCopiedTipId(tipId);
    setTimeout(() => setCopiedTipId(null), 2000);
  };

  const handleAddToPackingList = async (item: {
    id: string;
    suggestedItemName: string;
    packingCategory: string;
    note: string;
  }) => {
    setAddingItemId(item.id);
    try {
      const targetTripId = tripId || "mock-jaipur-current";
      await addCustomPackingItem(
        targetTripId,
        item.suggestedItemName,
        item.packingCategory || "Gear",
        item.note || "Auto-suggested from weather forecast",
        1
      );

      setAddedItemIds((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        try {
          const storageKey = `wanderway_weather_packing_${tripId || "demo"}`;
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch {
          // ignore storage error
        }
        return next;
      });

      setPackingToast({
        message: `Added "${item.suggestedItemName}" to your trip packing checklist.`,
        itemName: item.suggestedItemName,
      });
      setTimeout(() => setPackingToast(null), 4500);
    } catch (err) {
      console.warn("Failed to add packing item:", err);
    } finally {
      setAddingItemId(null);
    }
  };

  const handleAddAllSuggestions = async () => {
    if (!advice.gearTips.length) return;
    setIsAddingAll(true);
    const targetTripId = tripId || "mock-jaipur-current";
    try {
      const itemsToAdd = advice.gearTips.filter((tip) => !addedItemIds.has(tip.id));
      for (const tip of itemsToAdd) {
        await addCustomPackingItem(
          targetTripId,
          tip.suggestedItemName,
          tip.packingCategory || "Gear",
          tip.note || "Auto-suggested from weather forecast",
          1
        );
      }

      setAddedItemIds((prev) => {
        const next = new Set(prev);
        advice.gearTips.forEach((tip) => next.add(tip.id));
        try {
          const storageKey = `wanderway_weather_packing_${tripId || "demo"}`;
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch {
          // ignore storage error
        }
        return next;
      });

      setPackingToast({
        message: `Added all ${itemsToAdd.length || advice.gearTips.length} weather-recommended items to your packing checklist.`,
        itemName: "All Items",
      });
      setTimeout(() => setPackingToast(null), 5000);
    } catch (err) {
      console.warn("Failed to add all packing items:", err);
    } finally {
      setIsAddingAll(false);
    }
  };

  return (
    <section
      aria-labelledby={`${widgetId}-title`}
      className={`relative w-full rounded-3xl bg-surface-container-lowest border border-surface-container-high/60 shadow-xs p-5 sm:p-6 flex flex-col gap-5 ${className}`}
    >
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container-high/40">
        <div className="flex items-start sm:items-center gap-3">
          <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">cloud_sync</span>
          </div>
          <div>
            {tripTitle && (
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                {tripTitle}
              </span>
            )}
            <div className="flex items-center gap-2">
              <h2
                id={`${widgetId}-title`}
                className="text-lg sm:text-xl font-bold text-on-surface tracking-tight"
              >
                5-Day Weather Forecast
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-fixed text-on-primary-fixed uppercase tracking-wider">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                Live Radar
              </span>
            </div>
            <p className="text-xs text-on-surface-variant flex flex-wrap items-center gap-2 mt-0.5">
              <span>{destination}</span>
              <span>•</span>
              <span className="text-[11px] font-mono">
                Lat: {weather?.latitude ? weather.latitude.toFixed(2) : "26.91"}°N, Lon:{" "}
                {weather?.longitude ? weather.longitude.toFixed(2) : "75.79"}°E
              </span>
              {lastUpdated && (
                <>
                  <span>•</span>
                  <span>Updated {lastUpdated}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Top Controls: Temperature Toggle & Refresh */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Unit Switcher */}
          <div
            className="inline-flex p-0.5 rounded-xl bg-surface-container border border-surface-container-highest"
            role="group"
            aria-label="Temperature unit"
          >
            <button
              type="button"
              onClick={() => setTempUnit("C")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                tempUnit === "C"
                  ? "bg-surface-container-lowest text-primary shadow-2xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              aria-pressed={tempUnit === "C"}
            >
              °C
            </button>
            <button
              type="button"
              onClick={() => setTempUnit("F")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                tempUnit === "F"
                  ? "bg-surface-container-lowest text-primary shadow-2xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              aria-pressed={tempUnit === "F"}
            >
              °F
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoading}
            aria-label="Refresh weather data"
            className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-all border border-surface-container-highest disabled:opacity-50"
            title="Refresh weather telemetry"
          >
            <span
              className={`material-symbols-outlined text-[18px] block ${
                isLoading ? "animate-spin text-primary" : ""
              }`}
            >
              refresh
            </span>
          </button>

          {/* Link to Live Intelligence Stream if tripId provided */}
          {tripId && (
            <Link
              href={`/trips/${tripId}/intelligence` as Route}
              className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold flex items-center gap-1 border border-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">radar</span>
              <span className="hidden sm:inline">Telemetry</span>
            </Link>
          )}
        </div>
      </div>

      {/* Offline Alert if disconnected */}
      {isOffline && (
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
          <span className="material-symbols-outlined text-[18px] text-amber-600">wifi_off</span>
          <span>Offline mode active: Displaying cached meteorological telemetry for travel readiness.</span>
        </div>
      )}

      {/* Current Conditions Spotlight & Ambient Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        {/* Current Condition Hero (5 cols) */}
        <div className="sm:col-span-5 p-4 rounded-2xl bg-gradient-to-br from-primary-fixed/20 via-surface-container-low to-surface-container border border-surface-container-high/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant block mb-1">
              Current Conditions
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">
                {formatTemp(weather?.temperature_current ?? 18)}
              </span>
              <span className="text-xs font-semibold text-primary">
                {weather?.condition_text || "Partly Sunny & Crisp"}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {(() => {
                const badge = getRainRiskBadge(weather?.rain_risk || "low");
                return (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                  >
                    <span className={`size-1.5 rounded-full ${badge.dot}`} />
                    <span>{badge.label}</span>
                  </span>
                );
              })()}
            </div>
          </div>
          <span className="material-symbols-outlined text-[48px] text-primary shrink-0 opacity-90">
            {weather?.condition_icon || "partly_cloudy_day"}
          </span>
        </div>

        {/* Ambient Telemetry Pills (7 cols) */}
        <div className="sm:col-span-7 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="p-3 rounded-2xl bg-surface-container-low border border-surface-container-high/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="text-[11px] font-medium">Precipitation</span>
              <span className="material-symbols-outlined text-[16px] text-primary">water_drop</span>
            </div>
            <div className="mt-2">
              <span className="text-base sm:text-lg font-bold text-on-surface block">
                {weather?.precipitation_probability ?? 30}%
              </span>
              <span className="text-[10px] text-on-surface-variant">
                {weather?.precipitation_mm ?? 1.2} mm accumulation
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface-container-low border border-surface-container-high/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="text-[11px] font-medium">Wind Speed</span>
              <span className="material-symbols-outlined text-[16px] text-primary">air</span>
            </div>
            <div className="mt-2">
              <span className="text-base sm:text-lg font-bold text-on-surface block">
                {weather?.wind_speed_kmh ?? 14} <span className="text-xs font-normal">km/h</span>
              </span>
              <span className="text-[10px] text-on-surface-variant">
                {(weather?.wind_speed_kmh ?? 14) > 25 ? "Breezy gusts" : "Light breeze"}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface-container-low border border-surface-container-high/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="text-[11px] font-medium">Humidity</span>
              <span className="material-symbols-outlined text-[16px] text-primary">humidity_percentage</span>
            </div>
            <div className="mt-2">
              <span className="text-base sm:text-lg font-bold text-on-surface block">
                {weather?.humidity_percent ?? 62}%
              </span>
              <span className="text-[10px] text-on-surface-variant">Comfortable range</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Day Forecast Grid */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
            Daily Itinerary Weather Window
          </span>
          <span className="text-[11px] text-on-surface-variant">
            Click any day to view detailed sightseeing conditions
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {fiveDayForecast.map((day, idx) => {
            const dateObj = new Date(day.date);
            const isToday = idx === 0;
            const dayName = isToday
              ? "Today"
              : dateObj.toLocaleDateString("en-US", { weekday: "short" });
            const monthDay = dateObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            const isSelected = selectedDayIdx === idx;
            const riskBadge = getRainRiskBadge(day.rain_risk);

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDayIdx(idx)}
                aria-pressed={isSelected}
                className={`p-3.5 rounded-2xl border text-left flex flex-col items-center justify-between gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary-fixed/25 border-primary shadow-xs ring-2 ring-primary/20"
                    : "bg-surface-container-low hover:bg-surface-container border-surface-container-high/50"
                }`}
              >
                {/* Day Header */}
                <div className="w-full text-center">
                  <span className="text-xs font-bold text-on-surface block">{dayName}</span>
                  <span className="text-[10px] text-on-surface-variant">{monthDay}</span>
                </div>

                {/* Weather Icon */}
                <div className="my-1 size-10 rounded-xl bg-surface-container flex items-center justify-center text-primary shadow-2xs">
                  <span className="material-symbols-outlined text-[24px]">
                    {day.condition_icon || "wb_sunny"}
                  </span>
                </div>

                {/* Condition Name */}
                <span className="text-[11px] font-semibold text-on-surface text-center line-clamp-1 h-4">
                  {day.condition_text}
                </span>

                {/* Temp Max / Min */}
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold w-full">
                  <span className="text-on-surface">{formatTemp(day.temperature_max)}</span>
                  <span className="text-on-surface-variant text-[11px] font-normal">
                    {formatTemp(day.temperature_min)}
                  </span>
                </div>

                {/* Rain Risk Pill */}
                <div className="w-full pt-1 border-t border-surface-container-high/40 flex items-center justify-between text-[10px]">
                  <span className="inline-flex items-center gap-0.5 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[12px] text-primary">water_drop</span>
                    <span>{day.precipitation_probability}%</span>
                  </span>
                  <span className={`size-1.5 rounded-full ${riskBadge.dot}`} title={riskBadge.label} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Expanded Detail Spotlight */}
      {activeDay && (() => {
        const uvInfo = interpretUvIndex(activeDay.uv_index ?? 3.5);
        const dayRainBadge = getRainRiskBadge(activeDay.rain_risk);
        const windFormatted =
          tempUnit === "F"
            ? `${Math.round((activeDay.wind_speed_kmh ?? 12) * 0.621371)} mph`
            : `${activeDay.wind_speed_kmh ?? 12} km/h`;
        const humidityVal = activeDay.humidity_percent ?? 55;

        return (
          <div
            data-testid="selected-day-spotlight"
            className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-4"
          >
            {/* Day Header & Overview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container-high/40">
              <div className="flex items-start sm:items-center gap-3">
                <span className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[26px]">
                    {activeDay.condition_icon || "wb_sunny"}
                  </span>
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      Day {selectedDayIdx + 1} Outlook ({activeDay.date})
                    </span>
                    <span className="text-xs font-semibold text-on-surface">
                      {activeDay.condition_text}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${dayRainBadge.bg}`}
                    >
                      <span className={`size-1.5 rounded-full ${dayRainBadge.dot}`} />
                      <span>{dayRainBadge.label}</span>
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Temperature span between {formatTemp(activeDay.temperature_min)} and{" "}
                    {formatTemp(activeDay.temperature_max)}. Detailed sightseeing parameters below.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-on-surface-variant block">Sightseeing Guidance</span>
                  <span className="text-xs font-bold text-on-surface">
                    {activeDay.rain_risk === "high"
                      ? "🏛️ Plan Indoor Museums & Arcades"
                      : activeDay.rain_risk === "moderate"
                      ? "⛅ Flexible Sightseeing with Umbrella"
                      : "🕌 Ideal for Heritage Walks"}
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Detailed Day Metrics Grid: Humidity, Wind Speed, UV Index, Precipitation */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Metric 1: Humidity */}
              <div
                data-testid="metric-humidity"
                className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/50 flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Humidity</span>
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    humidity_percentage
                  </span>
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-extrabold text-on-surface block tracking-tight">
                    {humidityVal}%
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    {humidityVal > 70
                      ? "Muggy & humid air"
                      : humidityVal < 40
                      ? "Dry & crisp air"
                      : "Comfortable range"}
                  </span>
                </div>
              </div>

              {/* Metric 2: Wind Speed */}
              <div
                data-testid="metric-wind-speed"
                className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/50 flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Wind Speed</span>
                  <span className="material-symbols-outlined text-[18px] text-primary">air</span>
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-extrabold text-on-surface block tracking-tight">
                    {windFormatted}
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    {(activeDay.wind_speed_kmh ?? 12) > 28
                      ? "Strong breeze / gusts"
                      : (activeDay.wind_speed_kmh ?? 12) > 15
                      ? "Moderate breeze"
                      : "Gentle airflow"}
                  </span>
                </div>
              </div>

              {/* Metric 3: UV Index */}
              <div
                data-testid="metric-uv-index"
                className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/50 flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">UV Index</span>
                  <span className="material-symbols-outlined text-[18px] text-primary">light_mode</span>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight">
                      UV {(activeDay.uv_index ?? 3.5).toFixed(1)}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${uvInfo.badgeClass}`}
                    >
                      {uvInfo.level}
                    </span>
                  </div>
                  <span className="text-[11px] text-on-surface-variant font-medium block truncate" title={uvInfo.advice}>
                    {uvInfo.advice}
                  </span>
                </div>
              </div>

              {/* Metric 4: Precipitation */}
              <div
                data-testid="metric-precipitation"
                className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/50 flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Precipitation</span>
                  <span className="material-symbols-outlined text-[18px] text-primary">water_drop</span>
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-extrabold text-on-surface block tracking-tight">
                    {(activeDay.precipitation_sum_mm ?? 0).toFixed(1)} mm
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    {activeDay.precipitation_probability}% probability
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Contextual Weather Alert for Selected Day */}
            {(activeDay.rain_risk === "high" || activeDay.rain_risk === "moderate") && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-[18px]">umbrella</span>
                  <span className="text-on-surface">
                    <strong>Rain expected on Day {selectedDayIdx + 1}:</strong> Pack a windproof or compact umbrella for your excursions.
                  </span>
                </div>
                {!addedItemIds.has("compact-umbrella") && !addedItemIds.has("heavy-rain") && (
                  <button
                    type="button"
                    onClick={() =>
                      handleAddToPackingList({
                        id: "umbrella-day",
                        suggestedItemName: "Compact Travel Umbrella",
                        packingCategory: "Gear",
                        note: `Rain forecast for Day ${selectedDayIdx + 1} (${activeDay.date})`,
                      })
                    }
                    className="px-3 py-1 rounded-lg bg-primary text-on-primary text-[11px] font-semibold hover:bg-primary/90 transition-all shrink-0 cursor-pointer shadow-2xs"
                  >
                    + Add Umbrella
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Weather-Driven Packing Suggestions Banner & 1-Click Addition */}
      <div
        data-testid="weather-packing-section"
        className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-4"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="size-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[20px]">backpack</span>
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-on-surface tracking-tight">
                  Weather-Driven Packing Suggestions
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    advice.comfortTone === "alert"
                      ? "bg-error-container text-on-error-container"
                      : advice.comfortTone === "warning"
                      ? "bg-amber-500/20 text-amber-900 dark:text-amber-200"
                      : "bg-tertiary-fixed text-on-tertiary-fixed"
                  }`}
                >
                  {advice.comfortIndex} Comfort Index
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  Auto-Analyzed for {destination}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                {advice.summary} Click below to immediately add recommended gear to your packing checklist.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {/* Add All Suggestions Bulk Button */}
            <button
              type="button"
              onClick={handleAddAllSuggestions}
              disabled={isAddingAll || advice.gearTips.every((t) => addedItemIds.has(t.id))}
              className="px-3.5 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-semibold hover:bg-secondary/90 transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="Add all suggested items to your trip packing checklist"
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  isAddingAll ? "animate-spin" : ""
                }`}
              >
                {isAddingAll ? "progress_activity" : "playlist_add_check"}
              </span>
              <span>
                {advice.gearTips.every((t) => addedItemIds.has(t.id))
                  ? "All Added"
                  : isAddingAll
                  ? "Adding..."
                  : "Add All Suggestions"}
              </span>
            </button>

            {tripId && (
              <Link
                href={`/trips/${tripId}/packing` as Route}
                className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold flex items-center gap-1.5 border border-surface-container-highest transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">checklist</span>
                <span className="hidden sm:inline">Checklist</span>
              </Link>
            )}
          </div>
        </div>

        {/* Confirmation Toast Alert */}
        {packingToast && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 text-xs animate-in fade-in"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                check_circle
              </span>
              <span>{packingToast.message}</span>
            </div>
            {tripId && (
              <Link
                href={`/trips/${tripId}/packing` as Route}
                className="font-bold underline text-emerald-800 dark:text-emerald-200 shrink-0 hover:opacity-80"
              >
                View Checklist →
              </Link>
            )}
          </div>
        )}

        {/* Actionable Gear Suggestions Grid with 1-Click Add */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {advice.gearTips.map((tip) => {
            const isAdded = addedItemIds.has(tip.id);
            const isAdding = addingItemId === tip.id;

            return (
              <div
                key={tip.id}
                data-testid={`packing-tip-${tip.id}`}
                className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/40 flex flex-col justify-between gap-3 hover:border-primary/40 transition-all shadow-2xs group"
              >
                <div className="flex items-start gap-2.5">
                  <span className="size-9 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">{tip.icon}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-on-surface truncate block" title={tip.suggestedItemName}>
                        {tip.suggestedItemName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyGearTip(tip.suggestedItemName, tip.id)}
                        aria-label={`Copy ${tip.suggestedItemName} to clipboard`}
                        className="text-[10px] text-on-surface-variant hover:text-primary shrink-0"
                        title="Copy item name"
                      >
                        {copiedTipId === tip.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-surface-container text-on-surface-variant border border-surface-container-highest mt-0.5">
                      {tip.packingCategory}
                    </span>
                    <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-1.5 leading-snug">
                      {tip.note}
                    </p>
                  </div>
                </div>

                {/* 1-Click Add Button */}
                <div className="pt-2 border-t border-surface-container-high/40">
                  {isAdded ? (
                    <div className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>In Packing List</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddToPackingList(tip)}
                      disabled={isAdding}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      <span
                        className={`material-symbols-outlined text-[16px] ${
                          isAdding ? "animate-spin" : ""
                        }`}
                      >
                        {isAdding ? "progress_activity" : "add"}
                      </span>
                      <span>{isAdding ? "Adding..." : "Add to Packing List"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
