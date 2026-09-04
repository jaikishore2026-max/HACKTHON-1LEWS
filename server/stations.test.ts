import { describe, it, expect } from "vitest";
import { GLOBAL_GEOTECHNICAL_STATIONS, CONTINENT_LABELS } from "../shared/stations";

describe("Global Geotechnical Stations Dataset Integrity", () => {
  it("contains exactly 32 stations across all global operational zones", () => {
    expect(GLOBAL_GEOTECHNICAL_STATIONS.length).toBe(32);
  });

  it("ensures every station has unique ID, non-empty names and valid coordinates", () => {
    const ids = new Set<string>();
    GLOBAL_GEOTECHNICAL_STATIONS.forEach((st) => {
      expect(ids.has(st.id)).toBe(false);
      ids.add(st.id);

      expect(st.name.length).toBeGreaterThan(3);
      expect(st.country.length).toBeGreaterThan(1);
      expect(st.countryFlag.length).toBeGreaterThan(0);
      expect(st.lat).toBeGreaterThanOrEqual(-90);
      expect(st.lat).toBeLessThanOrEqual(90);
      expect(st.lng).toBeGreaterThanOrEqual(-180);
      expect(st.lng).toBeLessThanOrEqual(180);
      expect(st.rainfall).toBeGreaterThanOrEqual(0);
      expect(st.soil).toBeGreaterThanOrEqual(0);
      expect(st.soil).toBeLessThanOrEqual(100);
      expect(st.tilt).toBeGreaterThanOrEqual(0);
      expect(st.riskScore).toBeGreaterThanOrEqual(0);
      expect(st.riskScore).toBeLessThanOrEqual(100);
      expect(st.history.length).toBeGreaterThanOrEqual(10);
      expect(["STABLE", "WATCH", "CRITICAL"]).toContain(st.tier);
    });
  });

  it("covers all 5 continents plus India and verified labels", () => {
    const continents = new Set(GLOBAL_GEOTECHNICAL_STATIONS.map((s) => s.continent));
    expect(continents.has("INDIA")).toBe(true);
    expect(continents.has("ASIA_PACIFIC")).toBe(true);
    expect(continents.has("EUROPE")).toBe(true);
    expect(continents.has("AMERICAS")).toBe(true);
    expect(continents.has("AFRICA_OCEANIA")).toBe(true);
    expect(Object.keys(CONTINENT_LABELS).length).toBe(6);
  });
});
