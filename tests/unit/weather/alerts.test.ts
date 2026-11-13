import { describe, it, expect } from "vitest";
import { evaluateSevereWeatherAlerts } from "@/lib/weather/alerts";
import type { DestinationWeatherForecast } from "@/lib/weather/types";

describe("evaluateSevereWeatherAlerts", () => {
  it("returns empty array when forecast is null or undefined", () => {
    expect(evaluateSevereWeatherAlerts(null)).toEqual([]);
    expect(evaluateSevereWeatherAlerts(undefined)).toEqual([]);
  });

  it("detects thunderstorm or high wind alert when WMO code >= 95 or wind >= 40 km/h", () => {
    const stormForecast: DestinationWeatherForecast = {
      destination: "Jaipur, Rajasthan",
      latitude: 26.91,
      longitude: 75.78,
      timezone: "Asia/Kolkata",
      temperature_current: 24,
      temperature_unit: "C",
      condition_code: 95,
      condition_text: "Thunderstorms & Gusts",
      condition_icon: "thunderstorm",
      rain_risk: "high",
      precipitation_probability: 85,
      precipitation_mm: 18.0,
      wind_speed_kmh: 46,
      daily: [
        {
          date: "2026-11-12",
          temperature_max: 27,
          temperature_min: 19,
          precipitation_probability: 85,
          precipitation_sum_mm: 18.0,
          condition_code: 95,
          condition_text: "Thunderstorm",
          condition_icon: "thunderstorm",
          rain_risk: "high",
          wind_speed_kmh: 46,
        },
      ],
      warnings: [],
      source: "India Meteorological Department (IMD) Grounding",
      fetched_at: new Date().toISOString(),
    };

    const alerts = evaluateSevereWeatherAlerts(stormForecast);
    expect(alerts.length).toBeGreaterThan(0);
    const stormAlert = alerts.find((a) => a.id === "alert-severe-thunderstorm");
    expect(stormAlert).toBeDefined();
    expect(stormAlert?.severity).toBe("severe");
    expect(stormAlert?.bannerClasses.icon).toBe("thunderstorm");
  });

  it("detects heavy precipitation warning when rain probability >= 70%", () => {
    const rainForecast: DestinationWeatherForecast = {
      destination: "Kerala Backwaters",
      latitude: 9.49,
      longitude: 76.33,
      timezone: "Asia/Kolkata",
      temperature_current: 28,
      temperature_unit: "C",
      condition_code: 61,
      condition_text: "Moderate Rain",
      condition_icon: "rainy",
      rain_risk: "high",
      precipitation_probability: 80,
      precipitation_mm: 8.5,
      wind_speed_kmh: 18,
      daily: [
        {
          date: "2026-11-13",
          temperature_max: 29,
          temperature_min: 24,
          precipitation_probability: 80,
          precipitation_sum_mm: 8.5,
          condition_code: 61,
          condition_text: "Moderate Rain",
          condition_icon: "rainy",
          rain_risk: "high",
        },
      ],
      warnings: [],
      source: "Open-Meteo Global WMO Forecast",
      fetched_at: new Date().toISOString(),
    };

    const alerts = evaluateSevereWeatherAlerts(rainForecast);
    expect(alerts.length).toBeGreaterThan(0);
    const rainAlert = alerts.find((a) => a.id === "alert-heavy-precipitation");
    expect(rainAlert).toBeDefined();
    expect(rainAlert?.severity).toBe("warning");
    expect(rainAlert?.badge).toBe("SEVERE RAIN WARNING");
  });

  it("returns no alerts for calm fair weather", () => {
    const fairForecast: DestinationWeatherForecast = {
      destination: "Jaipur, Rajasthan",
      latitude: 26.91,
      longitude: 75.78,
      timezone: "Asia/Kolkata",
      temperature_current: 22,
      temperature_unit: "C",
      condition_code: 0,
      condition_text: "Clear Skies",
      condition_icon: "wb_sunny",
      rain_risk: "low",
      precipitation_probability: 5,
      precipitation_mm: 0,
      wind_speed_kmh: 12,
      daily: [
        {
          date: "2026-11-14",
          temperature_max: 25,
          temperature_min: 14,
          precipitation_probability: 5,
          precipitation_sum_mm: 0,
          condition_code: 0,
          condition_text: "Clear",
          condition_icon: "wb_sunny",
          rain_risk: "low",
        },
      ],
      warnings: [],
      source: "Open-Meteo Global WMO Forecast",
      fetched_at: new Date().toISOString(),
    };

    const alerts = evaluateSevereWeatherAlerts(fairForecast);
    expect(alerts.length).toBe(0);
  });
});
