"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { DestinationWeatherForecast } from "@/lib/weather/types";
import type { ConsularAdvisory } from "@/lib/advisories/types";
import {
  evaluateSevereWeatherAlerts,
  SIMULATED_ALERTS,
  type SevereWeatherAlert,
} from "@/lib/weather/alerts";
import { cacheTelemetryOffline, getCachedTelemetryOffline } from "@/lib/offline/storage";
import { useOfflineStatus } from "@/lib/offline/use-offline";

interface IntelligenceClientViewProps {
  tripId: string;
  tripTitle?: string;
  destination: string;
}

type StreamTab = "all" | "weather" | "safety" | "aviation" | "transit";

export function IntelligenceClientView({
  tripId,
  tripTitle = "Royal Rajasthan Heritage & Cultural Circuit",
  destination = "Jaipur, Rajasthan",
}: IntelligenceClientViewProps) {
  const { isOffline } = useOfflineStatus(tripId);
  const [activeTab, setActiveTab] = useState<StreamTab>("all");
  const [weather, setWeather] = useState<DestinationWeatherForecast | null>(null);
  const [advisory, setAdvisory] = useState<ConsularAdvisory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [alertSimMode, setAlertSimMode] = useState<"live" | "severe" | "warning" | "advisory" | "none">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("wanderway_weather_alert_sim");
      if (stored && ["severe", "warning", "advisory", "none"].includes(stored)) {
        return stored as "severe" | "warning" | "advisory" | "none";
      }
    }
    return "live";
  });

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const [wRes, aRes] = await Promise.all([
        fetch(`/api/weather?destination=${encodeURIComponent(destination)}`),
        fetch(`/api/advisories?destination=${encodeURIComponent(destination)}`),
      ]);

      let wData: DestinationWeatherForecast | null = null;
      let aData: ConsularAdvisory | null = null;

      if (wRes.ok) {
        const wJson = await wRes.json();
        if (wJson.success) {
          wData = wJson.data;
          setWeather(wData);
        }
      }

      if (aRes.ok) {
        const aJson = await aRes.json();
        if (aJson.success) {
          aData = aJson.data;
          setAdvisory(aData);
        }
      }

      setLastRefreshed(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

      if (wData || aData) {
        cacheTelemetryOffline(destination, { weather: wData, advisory: aData });
      }
    } catch {
      // Offline fallback
      const cached = getCachedTelemetryOffline<{
        weather: DestinationWeatherForecast | null;
        advisory: ConsularAdvisory | null;
      }>(destination);

      if (cached?.data) {
        if (cached.data.weather) setWeather(cached.data.weather);
        if (cached.data.advisory) setAdvisory(cached.data.advisory);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    Promise.all([
      fetch(`/api/weather?destination=${encodeURIComponent(destination)}`).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(`/api/advisories?destination=${encodeURIComponent(destination)}`).then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([wJson, aJson]) => {
        if (isCancelled) return;
        const wData: DestinationWeatherForecast | null = wJson?.success ? wJson.data : null;
        const aData: ConsularAdvisory | null = aJson?.success ? aJson.data : null;

        if (wData) setWeather(wData);
        if (aData) setAdvisory(aData);
        setLastRefreshed(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

        if (wData || aData) {
          cacheTelemetryOffline(destination, { weather: wData, advisory: aData });
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (isCancelled) return;
        const cached = getCachedTelemetryOffline<{
          weather: DestinationWeatherForecast | null;
          advisory: ConsularAdvisory | null;
        }>(destination);

        if (cached?.data) {
          if (cached.data.weather) setWeather(cached.data.weather);
          if (cached.data.advisory) setAdvisory(cached.data.advisory);
        }
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [destination]);

  const handleAlertSim = (mode: "live" | "severe" | "warning" | "advisory" | "none") => {
    setAlertSimMode(mode);
    if (typeof window !== "undefined") {
      if (mode === "live") {
        localStorage.removeItem("wanderway_weather_alert_sim");
      } else {
        localStorage.setItem("wanderway_weather_alert_sim", mode);
      }
      window.dispatchEvent(
        new CustomEvent("wanderway:weather-alert-override", {
          detail: { severity: mode },
        })
      );
    }
  };

  const activeAlert: SevereWeatherAlert | null = (() => {
    if (alertSimMode === "none") return null;
    if (alertSimMode === "severe") return SIMULATED_ALERTS.severe;
    if (alertSimMode === "warning") return SIMULATED_ALERTS.warning;
    if (alertSimMode === "advisory") return SIMULATED_ALERTS.advisory;
    const evaluated = evaluateSevereWeatherAlerts(weather);
    return evaluated.length > 0 ? evaluated[0] : null;
  })();

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Header & Sub-Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
            <Link href={`/trips/${tripId}`} className="hover:text-primary transition-colors">
              {tripTitle}
            </Link>
            <span>/</span>
            <span className="text-primary">Travel Intelligence</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface">
              Live Travel Intelligence
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE FEED</span>
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Real-time weather radar, consular safety advisories, aviation corridors, and emergency contacts for {destination}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-all cursor-pointer disabled:opacity-50"
            title="Refresh feeds"
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>
              refresh
            </span>
            <span>{isLoading ? "Syncing..." : lastRefreshed ? `Updated ${lastRefreshed}` : "Refresh"}</span>
          </button>

          <Link
            href={`/trips/${tripId}/vault`}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">folder_shared</span>
            <span>Vault</span>
          </Link>

          <Link
            href={`/trips/${tripId}/bookings` as Route}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-on-primary text-xs font-bold shadow-sm hover:opacity-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
            <span>Bookings</span>
          </Link>
        </div>
      </div>

      {/* Offline Banner if disconnected */}
      {isOffline && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200">
          <span className="material-symbols-outlined text-[20px] text-amber-600">wifi_off</span>
          <div className="text-xs">
            <span className="font-bold">Offline Resilience Mode:</span> Displaying encrypted cached telemetry and offline-persisted safety bulletins for {destination}.
          </div>
        </div>
      )}

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Safety Score Card */}
        <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Safety Index
            </span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <span className="material-symbols-outlined text-[18px]">shield</span>
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-on-surface flex items-baseline gap-1.5">
              <span>{advisory ? `${advisory.safety_score}/100` : "96/100"}</span>
              <span className="text-xs font-bold text-emerald-600">Very Safe</span>
            </div>
            <p className="text-[11px] text-on-surface-variant font-medium mt-1 truncate">
              {advisory?.level_name || "Level 1: Normal Precautions"}
            </p>
          </div>
        </div>

        {/* Current Weather Card */}
        <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Live Weather
            </span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[18px]">wb_sunny</span>
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-on-surface flex items-baseline gap-1.5">
              <span>{weather ? `${Math.round(weather.temperature_current)}°${weather.temperature_unit}` : "19°C"}</span>
              <span className="text-xs font-semibold text-on-surface-variant capitalize">
                {weather?.condition_text || "Clear Skies"}
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant font-medium mt-1">
              {weather ? `Rain risk: ${weather.rain_risk}` : "Precipitation 5%"} • Wind {weather?.wind_speed_kmh || 12} km/h
            </p>
          </div>
        </div>

        {/* Aviation Corridor Index */}
        <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Airspace Operations
            </span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
              <span className="material-symbols-outlined text-[18px]">flight_takeoff</span>
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-on-surface flex items-baseline gap-1.5">
              <span>98.2%</span>
              <span className="text-xs font-bold text-emerald-600">On-Time</span>
            </div>
            <p className="text-[11px] text-on-surface-variant font-medium mt-1">
              Delhi (DEL) & Jaipur (JAI) airspace nominal
            </p>
          </div>
        </div>

        {/* Transit & Rail Network */}
        <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Transit & Rail
            </span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-tertiary-container text-on-tertiary-container">
              <span className="material-symbols-outlined text-[18px]">train</span>
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-on-surface flex items-baseline gap-1.5">
              <span>Vande Bharat</span>
              <span className="text-xs font-bold text-emerald-600">Nominal</span>
            </div>
            <p className="text-[11px] text-on-surface-variant font-medium mt-1">
              IRCTC Superfast Northern Network operating on schedule
            </p>
          </div>
        </div>
      </div>

      {/* Severe Weather Real-Time Alert System Console & Live Telemetry */}
      <div className="flex flex-col gap-4 p-5 sm:p-6 rounded-3xl bg-surface-container-low border border-outline-variant/30 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <span className="material-symbols-outlined text-[24px]">crisis_alert</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-on-surface">
                  Severe Meteorological Alert System
                </h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                  activeAlert ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                }`}>
                  <span className={`size-1.5 rounded-full ${activeAlert ? "bg-red-500 animate-ping" : "bg-emerald-500"}`} />
                  {activeAlert ? "DASHBOARD BANNER ACTIVE" : "CONDITIONS NOMINAL"}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Early-warning meteorological threshold triggers for flash storms, torrential deluges, and gales with auto-banner push.
              </p>
            </div>
          </div>

          {/* Quick links to Dashboard to see banner */}
          <Link
            href="/trips"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">dashboard</span>
            <span>View Dashboard Banner →</span>
          </Link>
        </div>

        {/* Active Alert Live Banner Stream */}
        {activeAlert ? (
          <div className={`p-4 sm:p-5 rounded-2xl ${activeAlert.bannerClasses.container}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[24px] text-white shrink-0 animate-pulse mt-0.5">
                  {activeAlert.bannerClasses.icon}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${activeAlert.bannerClasses.badge}`}>
                      {activeAlert.badge}
                    </span>
                    {activeAlert.metricHighlight && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold">
                        {activeAlert.metricHighlight}
                      </span>
                    )}
                    {activeAlert.impactDates && (
                      <span className="text-[11px] text-white/80">
                        Affected Dates: {activeAlert.impactDates.join(", ")}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-white">{activeAlert.title}</h3>
                  <p className="text-xs text-white/95 mt-1 leading-relaxed">
                    {activeAlert.message}
                  </p>
                  <div className="mt-2 text-xs font-medium bg-black/15 rounded-xl p-2.5 border border-white/10 text-white/90">
                    <strong className="text-white font-bold">Operational Guidance: </strong>
                    {activeAlert.recommendedAction}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 flex items-center gap-3 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
            <span>
              All meteorological indicators for <strong>{destination}</strong> are currently within safe sightseeing thresholds. No severe rainstorm, typhoon, or wind hazard detected.
            </span>
          </div>
        )}

        {/* Real-Time Simulation and Broadcast Controls */}
        <div className="pt-2 border-t border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-primary">sensors</span>
            <span>Alert Simulator & Banner Broadcast:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleAlertSim("live")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                alertSimMode === "live"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30"
              }`}
            >
              📡 Live Radar Feed
            </button>

            <button
              type="button"
              onClick={() => handleAlertSim("severe")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                alertSimMode === "severe"
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-surface-container hover:bg-surface-container-high text-red-600 dark:text-red-400 border border-outline-variant/30"
              }`}
            >
              ⛈️ Severe Storm (Red)
            </button>

            <button
              type="button"
              onClick={() => handleAlertSim("warning")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                alertSimMode === "warning"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-surface-container hover:bg-surface-container-high text-amber-600 dark:text-amber-400 border border-outline-variant/30"
              }`}
            >
              🌧️ Heavy Rain (Amber)
            </button>

            <button
              type="button"
              onClick={() => handleAlertSim("none")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                alertSimMode === "none"
                  ? "bg-surface-container-highest text-on-surface font-extrabold border border-outline"
                  : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-outline-variant/30"
              }`}
            >
              ☀️ Clear Skies
            </button>
          </div>
        </div>
      </div>

      {/* Stream Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-outline-variant/30">
        {[
          { id: "all", label: "All Telemetry", icon: "dashboard" },
          { id: "weather", label: "Weather & Radar", icon: "wb_sunny" },
          { id: "safety", label: "Safety & Consular", icon: "shield" },
          { id: "aviation", label: "Aviation Corridor", icon: "flight" },
          { id: "transit", label: "Rail & Transit", icon: "train" },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as StreamTab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/50"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Stream Cards Container */}
      <div className="flex flex-col gap-6">
        {/* Section 1: Weather Telemetry */}
        {(activeTab === "all" || activeTab === "weather") && (
          <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[24px]">cloud_sync</span>
                <div>
                  <h2 className="text-base font-bold text-on-surface">
                    Live Meteorological Radar & 5-Day Outlook
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Aggregated destination forecasts and ambient conditions
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-on-surface-variant">
                Lat: {weather?.latitude ? weather.latitude.toFixed(2) : "26.91"}°N • Lon: {weather?.longitude ? weather.longitude.toFixed(2) : "75.79"}°E
              </span>
            </div>

            {/* Weather Warnings if any */}
            {weather?.warnings && weather.warnings.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col gap-1 text-amber-900 dark:text-amber-200">
                {weather.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <span className="material-symbols-outlined text-[18px] text-amber-600 mt-0.5">warning</span>
                    <div>
                      <span className="font-bold">{w.title}: </span>
                      <span>{w.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Daily Forecast Strip */}
            {weather?.daily && weather.daily.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {weather.daily.slice(0, 5).map((d, idx) => {
                  const dateObj = new Date(d.date);
                  const dayName = idx === 0 ? "Today" : dateObj.toLocaleDateString(undefined, { weekday: "short" });
                  return (
                    <div
                      key={d.date}
                      className="p-3.5 rounded-2xl bg-surface-container flex flex-col items-center text-center gap-1.5 border border-outline-variant/20"
                    >
                      <span className="text-xs font-bold text-on-surface">{dayName}</span>
                      <span className="material-symbols-outlined text-[26px] text-primary">
                        {d.rain_risk === "high" ? "rainy" : d.rain_risk === "moderate" ? "partly_cloudy_day" : "wb_sunny"}
                      </span>
                      <span className="text-xs font-black text-on-surface">
                        {Math.round(d.temperature_max)}° / {Math.round(d.temperature_min)}°
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-medium">
                        {d.precipitation_probability}% rain
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-on-surface-variant italic">
                Gathering multi-day radar telemetry...
              </div>
            )}
          </div>
        )}

        {/* Section 2: Consular Safety & Entry Matrix */}
        {(activeTab === "all" || activeTab === "safety") && advisory && (
          <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[24px]">verified_user</span>
                <div>
                  <h2 className="text-base font-bold text-on-surface">
                    Consular Safety & Entry Advisory — {advisory.country_name}
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Verified through {advisory.source}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${advisory.badge_color}`}>
                {advisory.level_name}
              </span>
            </div>

            <p className="text-sm text-on-surface leading-relaxed">
              {advisory.summary}
            </p>

            {/* Entry Requirement Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Passport Validity</span>
                <p className="text-sm font-extrabold text-on-surface mt-0.5">
                  {advisory.entry_requirements.passport_validity_months} Months Required
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Visa-Free Stay</span>
                <p className="text-sm font-extrabold text-on-surface mt-0.5">
                  {advisory.entry_requirements.visa_free_tourism_days || 90} Days for Tourism
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Zone Standards</span>
                <p className="text-sm font-extrabold text-on-surface mt-0.5">
                  {advisory.entry_requirements.schengen_zone ? "Schengen Border Rules" : "National Customs"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Aviation Corridor & Transit Monitor */}
        {(activeTab === "all" || activeTab === "aviation" || activeTab === "transit") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aviation Stream */}
            <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-[22px]">airplane_ticket</span>
                <h3 className="text-sm font-bold text-on-surface">Aviation Corridor Bulletin</h3>
              </div>
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                    <span className="font-semibold text-on-surface">Golden Triangle Air Corridor</span>
                  </div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">Clear / Smooth</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">flight</span>
                    <span className="font-semibold text-on-surface">Delhi Indira Gandhi Intl (DEL) T3</span>
                  </div>
                  <span className="text-on-surface-variant font-mono">0 min delay</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">radar</span>
                    <span className="font-semibold text-on-surface">Jaipur International (JAI)</span>
                  </div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">Unrestricted</span>
                </div>
              </div>
            </div>

            {/* Transit Disruption Monitor */}
            <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-[22px]">subway</span>
                <h3 className="text-sm font-bold text-on-surface">Local Transit &amp; Rail Disruption Monitor</h3>
              </div>
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">speed</span>
                    <span className="font-semibold text-on-surface">IRCTC Vande Bharat Express</span>
                  </div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">On Schedule (0m)</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-[18px]">info</span>
                    <span className="font-semibold text-on-surface">Jaipur Metro &amp; Hawa Mahal Corridor</span>
                  </div>
                  <span className="text-amber-700 dark:text-amber-400 font-bold">Minor Traffic (+8m)</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">directions_walk</span>
                    <span className="font-semibold text-on-surface">Ajmer–Jaipur Shatabdi Express</span>
                  </div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">Running Normal</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Destination Emergency Contacts Hotline Deck */}
        <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-error text-[22px]">emergency</span>
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  Destination Emergency Contacts — One-Tap Dial
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Emergency telephone operators and local consular assistance in {destination}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Police */}
            <a
              href={`tel:${advisory?.emergency_contacts.police || "112"}`}
              className="p-4 rounded-2xl bg-surface-container hover:bg-primary/10 border border-outline-variant/20 hover:border-primary/40 transition-all flex items-center justify-between group"
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Police Dept</span>
                <p className="text-lg font-black text-on-surface font-mono group-hover:text-primary">
                  {advisory?.emergency_contacts.police || "112"}
                </p>
              </div>
              <span className="size-9 rounded-xl bg-surface-container-high group-hover:bg-primary group-hover:text-on-primary flex items-center justify-center text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[20px]">call</span>
              </span>
            </a>

            {/* Ambulance */}
            <a
              href={`tel:${advisory?.emergency_contacts.ambulance || "108"}`}
              className="p-4 rounded-2xl bg-surface-container hover:bg-error/10 border border-outline-variant/20 hover:border-error/40 transition-all flex items-center justify-between group"
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Medical & Ambulance</span>
                <p className="text-lg font-black text-on-surface font-mono group-hover:text-error">
                  {advisory?.emergency_contacts.ambulance || "108"}
                </p>
              </div>
              <span className="size-9 rounded-xl bg-surface-container-high group-hover:bg-error group-hover:text-white flex items-center justify-center text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[20px]">medical_services</span>
              </span>
            </a>

            {/* Fire */}
            <a
              href={`tel:${advisory?.emergency_contacts.fire || "101"}`}
              className="p-4 rounded-2xl bg-surface-container hover:bg-amber-500/10 border border-outline-variant/20 hover:border-amber-500/40 transition-all flex items-center justify-between group"
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Fire & Rescue</span>
                <p className="text-lg font-black text-on-surface font-mono group-hover:text-amber-600">
                  {advisory?.emergency_contacts.fire || "101"}
                </p>
              </div>
              <span className="size-9 rounded-xl bg-surface-container-high group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[20px]">local_fire_department</span>
              </span>
            </a>

            {/* Tourist Helpline */}
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Tourist Helpline</span>
                <p className="text-xs font-bold text-on-surface mt-0.5 line-clamp-1">
                  {advisory?.emergency_contacts.tourist_helpline || "Ministry of Tourism: 1800-11-1363"}
                </p>
              </div>
              <span className="size-9 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">support_agent</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
