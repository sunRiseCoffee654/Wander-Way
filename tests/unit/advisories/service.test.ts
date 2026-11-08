import { describe, it, expect } from "vitest";
import { getCountryAdvisory } from "@/lib/advisories/service";

describe("Consular Travel Advisories & Safety Feed", () => {
  it("resolves official Japan consular advisory and emergency contacts", () => {
    const jp = getCountryAdvisory("Kyoto, Japan");
    expect(jp.country_code).toBe("JP");
    expect(jp.level).toBe(1);
    expect(jp.safety_score).toBeGreaterThanOrEqual(95);
    expect(jp.emergency_contacts.police).toBe("110");
    expect(jp.emergency_contacts.ambulance).toBe("119");
    expect(jp.entry_requirements.visa_free_tourism_days).toBe(90);
  });

  it("resolves European emergency standards for Italy and Switzerland", () => {
    const italy = getCountryAdvisory("Amalfi Coast, Italy");
    expect(italy.country_code).toBe("IT");
    expect(italy.level).toBe(2);
    expect(italy.emergency_contacts.police).toBe("112");
    expect(italy.entry_requirements.schengen_zone).toBe(true);

    const swiss = getCountryAdvisory("Swiss Alps, Interlaken");
    expect(swiss.country_code).toBe("CH");
    expect(swiss.level).toBe(1);
    expect(swiss.emergency_contacts.police).toBe("117");
  });

  it("provides resilient global fallback advisory for unknown destinations", () => {
    const globalAdv = getCountryAdvisory("Tropical Remote Atoll");
    expect(globalAdv.level).toBe(1);
    expect(globalAdv.emergency_contacts.police).toContain("112");
    expect(globalAdv.safety_score).toBeGreaterThan(0);
  });
});
