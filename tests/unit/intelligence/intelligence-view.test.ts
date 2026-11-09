import { describe, it, expect } from "vitest";
import { getCountryAdvisory } from "@/lib/advisories/service";
import { getDestinationWeather } from "@/lib/weather/service";

describe("Live Travel Intelligence Engine", () => {
  it("retrieves consular safety advisory with destination emergency contacts", () => {
    const advisory = getCountryAdvisory("Tokyo, Japan");
    expect(advisory.country_code).toBe("JP");
    expect(advisory.level).toBe(1);
    expect(advisory.emergency_contacts.police).toBe("110");
    expect(advisory.emergency_contacts.ambulance).toBe("119");
    expect(advisory.safety_score).toBeGreaterThanOrEqual(90);
  });

  it("fetches weather telemetry with daily forecasts and warning alerts", async () => {
    const weather = await getDestinationWeather("Kyoto, Japan", 35.0116, 135.7681);
    expect(weather.destination).toBe("Kyoto, Japan");
    expect(weather.temperature_unit).toBe("C");
    expect(weather.daily).toBeDefined();
    expect(weather.daily.length).toBeGreaterThan(0);
    expect(weather.rain_risk).toMatch(/low|moderate|high/);
  });

  it("resolves consular advisories for Schengen European countries", () => {
    const advisory = getCountryAdvisory("Rome, Italy");
    expect(advisory.country_name).toBe("Italy");
    expect(advisory.entry_requirements.schengen_zone).toBe(true);
    expect(advisory.emergency_contacts.police).toBe("112");
  });
});
