"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  evaluateSevereWeatherAlerts,
  SIMULATED_ALERTS,
  type SevereWeatherAlert,
  type WeatherAlertSeverity,
} from "@/lib/weather/alerts";
import type { DestinationWeatherForecast } from "@/lib/weather/types";

interface SevereWeatherBannerProps {
  destination?: string;
  tripId?: string;
  forceSeverity?: WeatherAlertSeverity | "none" | null;
  className?: string;
}

const STORAGE_KEY = "wanderway_weather_alert_sim";

export function SevereWeatherBanner({
  destination = "Jaipur, Rajasthan",
  tripId = "mock-jaipur-current",
  forceSeverity = null,
  className = "",
}: SevereWeatherBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [activeAlert, setActiveAlert] = useState<SevereWeatherAlert | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const updateAlertState = async () => {
      // 1. Check local storage simulation override
      const storedSim = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const simMode = forceSeverity ?? (storedSim as WeatherAlertSeverity | "none" | null);

      if (simMode === "none") {
        if (!isCancelled) setActiveAlert(null);
        return;
      }

      if (simMode && SIMULATED_ALERTS[simMode]) {
        if (!isCancelled) setActiveAlert(SIMULATED_ALERTS[simMode]);
        return;
      }

      // 2. Fetch live weather and evaluate
      try {
        const res = await fetch(`/api/weather?destination=${encodeURIComponent(destination)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const forecast: DestinationWeatherForecast = json.data;
            const alerts = evaluateSevereWeatherAlerts(forecast);
            if (alerts.length > 0) {
              setActiveAlert(alerts[0]);
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch real-time weather for alerts:", err);
      }

      // 3. No severe weather hazards detected in live forecast
      if (!isCancelled) {
        setActiveAlert(null);
      }
    };

    updateAlertState();

    // Listen for custom dispatch events from Trip Intelligence View
    const handleOverride = (e: Event) => {
      const customEvent = e as CustomEvent<{ severity: WeatherAlertSeverity | "none" | "live" }>;
      const sev = customEvent.detail?.severity;
      if (sev === "none") {
        setActiveAlert(null);
        setIsDismissed(false);
      } else if (sev === "live") {
        localStorage.removeItem(STORAGE_KEY);
        updateAlertState();
        setIsDismissed(false);
      } else if (sev && SIMULATED_ALERTS[sev]) {
        setActiveAlert(SIMULATED_ALERTS[sev]);
        setIsDismissed(false);
      }
    };

    window.addEventListener("wanderway:weather-alert-override", handleOverride);
    return () => {
      isCancelled = true;
      window.removeEventListener("wanderway:weather-alert-override", handleOverride);
    };
  }, [destination, forceSeverity]);

  if (!mounted || !activeAlert || isDismissed) {
    return null;
  }

  const { bannerClasses } = activeAlert;

  if (isCollapsed) {
    return (
      <div
        className={`w-full transition-all duration-300 ${className}`}
        role="alert"
        aria-live="assertive"
      >
        <div
          className={`flex items-center justify-between px-4 py-2.5 rounded-2xl ${bannerClasses.container}`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="material-symbols-outlined text-[18px] animate-pulse">
              {bannerClasses.icon}
            </span>
            <span>
              {activeAlert.badge}: {activeAlert.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer transition-colors"
            >
              Expand Details
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white cursor-pointer transition-colors"
              title="Dismiss for session"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full transition-all duration-300 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className={`p-4 sm:p-5 rounded-3xl ${bannerClasses.container}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Column: Icon + Headline + Warning Message */}
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xs shadow-xs">
              <span className="material-symbols-outlined text-[24px] text-white animate-pulse">
                {bannerClasses.icon}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${bannerClasses.badge}`}
                >
                  {activeAlert.badge}
                </span>
                {activeAlert.metricHighlight && (
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/15 text-white/95">
                    {activeAlert.metricHighlight}
                  </span>
                )}
                {activeAlert.impactDates && activeAlert.impactDates.length > 0 && (
                  <span className="text-[11px] font-medium text-white/80">
                    Impact: {activeAlert.impactDates.join(", ")}
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                {activeAlert.title}
              </h3>

              <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-3xl">
                {activeAlert.message}{" "}
                <strong className="font-semibold text-white">
                  Guidance: {activeAlert.recommendedAction}
                </strong>
              </p>
            </div>
          </div>

          {/* Right Column: CTA Buttons & Dismiss */}
          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
            <Link
              href={`/trips/${tripId}/intelligence` as Route}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer ${bannerClasses.button}`}
            >
              <span className="material-symbols-outlined text-[18px]">radar</span>
              <span>Trip Intelligence Telemetry →</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer transition-colors"
              title="Minimize banner"
              aria-label="Minimize banner"
            >
              <span className="material-symbols-outlined text-[18px]">keyboard_arrow_up</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer transition-colors"
              title="Dismiss alert"
              aria-label="Dismiss alert"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
