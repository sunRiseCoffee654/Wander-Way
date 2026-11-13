import { describe, it, expect } from "vitest";
import {
  celsiusToFahrenheit,
  getWeatherPreparationAdvice,
  getFallbackWeather,
  interpretUvIndex,
} from "@/lib/weather/service";

describe("5-Day Weather Forecast Widget Logic & Data Transformation", () => {
  it("provides 5-day daily forecast slice from destination meteorological data with humidity, wind speed, and UV index", () => {
    const weather = getFallbackWeather("Kyoto, Japan");
    const fiveDays = weather.daily.slice(0, 5);

    expect(fiveDays).toHaveLength(5);
    fiveDays.forEach((day) => {
      expect(day.date).toBeTruthy();
      expect(day.temperature_max).toBeGreaterThanOrEqual(day.temperature_min);
      expect(day.condition_text).toBeTruthy();
      expect(day.condition_icon).toBeTruthy();
      expect(day.precipitation_probability).toBeGreaterThanOrEqual(0);
      expect(day.precipitation_probability).toBeLessThanOrEqual(100);
      expect(["low", "moderate", "high"]).toContain(day.rain_risk);

      // Detailed daily metrics tested
      expect(day.humidity_percent).toBeDefined();
      expect(day.humidity_percent).toBeGreaterThanOrEqual(0);
      expect(day.humidity_percent).toBeLessThanOrEqual(100);

      expect(day.wind_speed_kmh).toBeDefined();
      expect(day.wind_speed_kmh).toBeGreaterThanOrEqual(0);

      expect(day.uv_index).toBeDefined();
      expect(day.uv_index).toBeGreaterThanOrEqual(0);
    });
  });

  it("evaluates UV index levels and semantic advice correctly", () => {
    const low = interpretUvIndex(1.5);
    expect(low.level).toBe("Low");
    expect(low.tone).toBe("low");
    expect(low.advice).toContain("Minimal sun hazard");

    const moderate = interpretUvIndex(4.2);
    expect(moderate.level).toBe("Moderate");
    expect(moderate.tone).toBe("moderate");

    const high = interpretUvIndex(6.8);
    expect(high.level).toBe("High");
    expect(high.tone).toBe("high");

    const veryHigh = interpretUvIndex(9.5);
    expect(veryHigh.level).toBe("Very High");
    expect(veryHigh.tone).toBe("very-high");

    const extreme = interpretUvIndex(12.0);
    expect(extreme.level).toBe("Extreme");
    expect(extreme.tone).toBe("extreme");
  });

  it("handles Fahrenheit unit conversion accurately across diverse ranges", () => {
    expect(celsiusToFahrenheit(15)).toBe(59);
    expect(celsiusToFahrenheit(25)).toBe(77);
    expect(celsiusToFahrenheit(32)).toBe(90);
    expect(celsiusToFahrenheit(5)).toBe(41);
  });

  it("generates contextual gear recommendations with packing item metadata matching travel dates", () => {
    const weather = getFallbackWeather("Tokyo, Japan");
    const firstDay = weather.daily[0].date;
    const thirdDay = weather.daily[2].date;

    const advice = getWeatherPreparationAdvice(weather, firstDay, thirdDay);
    expect(advice.travelDateMatch).toBe(true);
    expect(advice.gearTips.length).toBeGreaterThan(0);
    expect(advice.headline).toBeTruthy();
    expect(advice.summary).toBeTruthy();

    const gearIds = advice.gearTips.map((g) => g.id);
    expect(gearIds.length).toBeLessThanOrEqual(4);

    // Verify packing auto-suggestion metadata
    advice.gearTips.forEach((tip) => {
      expect(tip.suggestedItemName).toBeTruthy();
      expect(tip.packingCategory).toBeTruthy();
      expect(["Clothing", "Gear", "Personal Care", "Accessories"]).toContain(tip.packingCategory);
    });
  });

  it("automatically suggests adding an umbrella when rain is forecast for the destination", () => {
    const weather = getFallbackWeather("Kyoto, Japan");
    // Kyoto fallback forecast has rainy days at index 1 and 3
    const advice = getWeatherPreparationAdvice(weather);

    const hasUmbrellaTip = advice.gearTips.some(
      (g) => g.suggestedItemName.toLowerCase().includes("umbrella") || g.id.includes("umbrella")
    );
    expect(hasUmbrellaTip).toBe(true);
  });

  it("safely generates fallback preparation tips when dates are empty or undefined", () => {
    const weather = getFallbackWeather("Paris, France");
    const advice = getWeatherPreparationAdvice(weather, null, null);

    expect(advice.travelDateMatch).toBe(false);
    expect(advice.comfortIndex).toBeDefined();
    expect(advice.gearTips.length).toBeGreaterThanOrEqual(1);
    expect(advice.gearTips[0].suggestedItemName).toBeTruthy();
  });
});

