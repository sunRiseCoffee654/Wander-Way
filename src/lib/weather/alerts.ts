import type { DestinationWeatherForecast, DailyForecast } from "./types";

export type WeatherAlertSeverity = "severe" | "warning" | "advisory";

export interface SevereWeatherAlert {
  id: string;
  severity: WeatherAlertSeverity;
  title: string;
  badge: string;
  message: string;
  impactDates?: string[];
  metricHighlight?: string;
  recommendedAction: string;
  source: string;
  bannerClasses: {
    container: string;
    badge: string;
    icon: string;
    button: string;
  };
}

/**
 * Styling presets for each alert severity tier adhering to high-contrast Material 3 principles.
 */
export const ALERT_STYLE_PRESETS: Record<
  WeatherAlertSeverity,
  { container: string; badge: string; icon: string; button: string }
> = {
  severe: {
    container:
      "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border border-red-300/40 shadow-lg shadow-red-950/25",
    badge: "bg-red-900/60 text-red-100 border border-red-300/40",
    icon: "thunderstorm",
    button: "bg-white text-red-700 hover:bg-red-50 focus:ring-red-400",
  },
  warning: {
    container:
      "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white border border-amber-300/40 shadow-md shadow-amber-950/20",
    badge: "bg-amber-950/60 text-amber-100 border border-amber-300/40",
    icon: "warning",
    button: "bg-white text-amber-800 hover:bg-amber-50 focus:ring-amber-400",
  },
  advisory: {
    container:
      "bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white border border-sky-300/40 shadow-md shadow-blue-950/20",
    badge: "bg-blue-950/60 text-blue-100 border border-blue-300/40",
    icon: "info",
    button: "bg-white text-blue-800 hover:bg-blue-50 focus:ring-blue-400",
  },
};

/**
 * Evaluates destination forecast and returns severe weather alerts if thresholds are exceeded.
 */
export function evaluateSevereWeatherAlerts(
  forecast: DestinationWeatherForecast | null | undefined
): SevereWeatherAlert[] {
  if (!forecast) return [];

  const alerts: SevereWeatherAlert[] = [];
  const daily: DailyForecast[] = forecast.daily || [];

  // Check 1: Severe thunderstorms / gale gusts (WMO code >= 95 or wind >= 40 km/h)
  const stormDays = daily.filter((d) => d.condition_code >= 95 || (d.wind_speed_kmh && d.wind_speed_kmh >= 40));
  if (stormDays.length > 0 || forecast.condition_code >= 95 || (forecast.wind_speed_kmh && forecast.wind_speed_kmh >= 40)) {
    const dates = stormDays.map((d) => d.date);
    alerts.push({
      id: "alert-severe-thunderstorm",
      severity: "severe",
      title: "Severe Thunderstorm & High Gale Advisory",
      badge: "CRITICAL WEATHER ALERT",
      message: `Violent thunderstorms and wind gusts up to ${Math.max(
        forecast.wind_speed_kmh || 0,
        ...stormDays.map((d) => d.wind_speed_kmh || 0)
      )} km/h forecast for ${forecast.destination}.`,
      impactDates: dates.length > 0 ? dates : [new Date().toISOString().split("T")[0]],
      metricHighlight: `Wind ${forecast.wind_speed_kmh || 42} km/h • Code 95 WMO Storm Alert`,
      recommendedAction:
        "Postpone exposed mountain hikes and open cable-car excursions. Seek sheltered indoor venues (museums, covered arcades).",
      source: forecast.source || "Open-Meteo Global WMO Forecast",
      bannerClasses: ALERT_STYLE_PRESETS.severe,
    });
  }

  // Check 2: High Precipitation / Rainstorm Hazard (Rain >= 70% or precipitation >= 6mm)
  const heavyRainDays = daily.filter(
    (d) => d.precipitation_probability >= 70 || d.precipitation_sum_mm >= 6.0
  );
  if (heavyRainDays.length > 0 || forecast.precipitation_probability >= 70 || forecast.precipitation_mm >= 6.0) {
    const dates = heavyRainDays.map((d) => d.date);
    const maxProb = Math.max(forecast.precipitation_probability, ...heavyRainDays.map((d) => d.precipitation_probability));
    const maxMm = Math.max(forecast.precipitation_mm, ...heavyRainDays.map((d) => d.precipitation_sum_mm));

    // Avoid duplicate if already triggered thunderstorm
    if (!alerts.some((a) => a.id === "alert-severe-thunderstorm")) {
      alerts.push({
        id: "alert-heavy-precipitation",
        severity: "warning",
        title: "High Precipitation & Flash Rainstorm Warning",
        badge: "SEVERE RAIN WARNING",
        message: `${maxProb}% rain probability with up to ${maxMm.toFixed(1)}mm accumulated downpour forecast in ${forecast.destination}.`,
        impactDates: dates.length > 0 ? dates : [new Date().toISOString().split("T")[0]],
        metricHighlight: `${maxProb}% Probability • ${maxMm.toFixed(1)}mm Rainfall`,
        recommendedAction:
          "Cobblestones and temple stone stairs will be hazardous. Equip waterproof footwear, windproof umbrellas, and waterproof gear covers.",
        source: forecast.source || "Open-Meteo Global WMO Forecast",
        bannerClasses: ALERT_STYLE_PRESETS.warning,
      });
    }
  }

  // Check 3: Check explicit warnings from weather service
  if (forecast.warnings && forecast.warnings.length > 0) {
    for (const w of forecast.warnings) {
      if (w.severity === "severe" || w.severity === "warning") {
        if (!alerts.some((a) => a.title.toLowerCase().includes(w.title.toLowerCase().slice(0, 10)))) {
          alerts.push({
            id: `warning-${w.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            severity: w.severity,
            title: w.title,
            badge: w.severity === "severe" ? "CRITICAL ALERT" : "TRAVEL ADVISORY",
            message: w.message,
            impactDates: [new Date().toISOString().split("T")[0]],
            recommendedAction: "Review day itinerary route adjustments and prepare protective outerwear.",
            source: w.source || forecast.source || "Open-Meteo",
            bannerClasses: ALERT_STYLE_PRESETS[w.severity],
          });
        }
      }
    }
  }

  return alerts;
}

/**
 * Pre-defined simulation alerts for testing and deterministic inspection.
 */
export const SIMULATED_ALERTS: Record<string, SevereWeatherAlert> = {
  severe: {
    id: "simulated-severe-storm",
    severity: "severe",
    title: "IMD Red Alert: Severe Monsoon Deluge & Gale Squall",
    badge: "CRITICAL IMD WEATHER WARNING",
    message: "Depression intensifying with torrential rainfall (>75mm/h) and sustained 65 km/h squally gusts across coastal & hillside corridors.",
    impactDates: ["2026-11-13", "2026-11-14"],
    metricHighlight: "65 km/h Gale Gusts • 75mm/h Torrential Deluge",
    recommendedAction: "All outdoor heritage walks and mountain pass excursions suspended. Vande Bharat & local rail services operating under caution speed restrictions.",
    source: "India Meteorological Department (IMD) Grounding",
    bannerClasses: ALERT_STYLE_PRESETS.severe,
  },
  warning: {
    id: "simulated-rainstorm",
    severity: "warning",
    title: "IMD Orange Alert: Heavy Monsoon Downpour & Runoff",
    badge: "SEVERE MONSOON WARNING",
    message: "85% precipitation probability with intense showers expected across palace courtyards, ghats, and city transit corridors.",
    impactDates: ["2026-11-12"],
    metricHighlight: "85% Probability • 28.5mm Rainfall Accumulation",
    recommendedAction: "Expect waterlogging in low-lying bazaar streets and slick temple stone marble. Carry wind-resistant umbrella and waterproof footwear.",
    source: "India Meteorological Department (IMD) Radar Network",
    bannerClasses: ALERT_STYLE_PRESETS.warning,
  },
  advisory: {
    id: "simulated-cold-snap",
    severity: "advisory",
    title: "Dense Northern Winter Fog & Visibility Advisory",
    badge: "TRANSIT WEATHER ADVISORY",
    message: "Dense early morning radiation fog dropping visibility below 100m across northern travel corridors and highway expressways.",
    impactDates: ["2026-11-15"],
    metricHighlight: "Visibility < 100m • Min Temp 8°C",
    recommendedAction: "Allow buffer time for morning IRCTC train departures and airport transfers. Carry warm pashmina or light fleece layer.",
    source: "WanderWay Subcontinental Meteorological Telemetry",
    bannerClasses: ALERT_STYLE_PRESETS.advisory,
  },
};
