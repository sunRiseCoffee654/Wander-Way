import { describe, it, expect } from "vitest";
import {
  interpretWmoCode,
  calculateRainRisk,
  resolveCoordinates,
  getFallbackWeather,
  celsiusToFahrenheit,
  getWeatherPreparationAdvice,
} from "@/lib/weather/service";

describe("Meteorological Weather Service", () => {
  it("interprets WMO standard weather codes accurately", () => {
    expect(interpretWmoCode(0)).toEqual({ text: "Clear Skies", icon: "wb_sunny" });
    expect(interpretWmoCode(1).icon).toBe("partly_cloudy_day");
    expect(interpretWmoCode(61).icon).toBe("rainy");
    expect(interpretWmoCode(71).icon).toBe("ac_unit");
    expect(interpretWmoCode(95).icon).toBe("thunderstorm");
  });

  it("calculates rain risk levels strictly based on probability and millimeter thresholds", () => {
    // Low risk: < 25% and < 1mm
    expect(calculateRainRisk(15, 0.2)).toBe("low");
    expect(calculateRainRisk(20, 0.8)).toBe("low");

    // Moderate risk: 25-59% or 1-5mm (triggers compact umbrella requirement)
    expect(calculateRainRisk(30, 0.5)).toBe("moderate");
    expect(calculateRainRisk(15, 2.0)).toBe("moderate");
    expect(calculateRainRisk(50, 4.0)).toBe("moderate");

    // High risk: >= 60% or >= 6mm (triggers waterproof footwear and storm advisory)
    expect(calculateRainRisk(70, 2.0)).toBe("high");
    expect(calculateRainRisk(20, 8.5)).toBe("high");
    expect(calculateRainRisk(90, 15.0)).toBe("high");
  });

  it("resolves coordinates accurately for travel hubs and falls back safely", () => {
    const kyoto = resolveCoordinates("Kyoto, Japan");
    expect(kyoto.lat).toBeCloseTo(35.0116, 2);
    expect(kyoto.lon).toBeCloseTo(135.7681, 2);

    const dolomites = resolveCoordinates("Dolomites Mountain Trek");
    expect(dolomites.lat).toBeCloseTo(46.4102, 2);

    // Custom coordinates override
    const custom = resolveCoordinates("Unknown Island", 12.34, 56.78);
    expect(custom.lat).toBe(12.34);
    expect(custom.lon).toBe(56.78);
  });

  it("generates resilient fallback weather with 7 daily forecasts and warnings", () => {
    const fallback = getFallbackWeather("Kyoto, Japan");
    expect(fallback.destination).toBe("Kyoto, Japan");
    expect(fallback.daily.length).toBe(7);
    expect(fallback.temperature_current).toBeGreaterThan(0);
    expect(fallback.warnings.length).toBeGreaterThanOrEqual(1);
    expect(fallback.rain_risk).toBe("moderate");
  });

  it("converts Celsius to Fahrenheit accurately", () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(20)).toBe(68);
    expect(celsiusToFahrenheit(30)).toBe(86);
    expect(celsiusToFahrenheit(-10)).toBe(14);
  });

  it("generates actionable weather preparation advice based on precipitation and temperature", () => {
    const fallback = getFallbackWeather("Kyoto, Japan");
    const advice = getWeatherPreparationAdvice(fallback);

    expect(advice.gearTips.length).toBeGreaterThanOrEqual(2);
    expect(advice.headline).toBeTruthy();
    expect(advice.summary).toBeTruthy();
    expect(advice.comfortIndex).toMatch(/Optimal|Variable|Challenging/);
    expect(advice.maxTempC).toBeGreaterThanOrEqual(advice.minTempC);

    // Tests date-scoped filtering
    const firstDate = fallback.daily[0].date;
    const secondDate = fallback.daily[1].date;
    const scopedAdvice = getWeatherPreparationAdvice(fallback, firstDate, secondDate);
    expect(scopedAdvice.travelDateMatch).toBe(true);
  });
});

