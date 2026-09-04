import { describe, expect, it } from "vitest";
import {
  createQueuedReport,
  saveQueuedReport,
  appendQueuedReport,
  getQueuedReports,
  clearQueuedReports,
  exportReportsToGeoJson,
} from "./reportQueue";

describe("local report queue", () => {
  it("creates and stores a geolocated report with attachment metadata", () => {
    const writes: Array<{ key: string; value: string }> = [];
    const storage = { setItem: (key: string, value: string) => writes.push({ key, value }) };
    const report = createQueuedReport({
      reportId: "LEWS-2026-1001",
      category: "BLOCKED ROAD",
      severity: "HIGH",
      description: "Rockfall across the access road",
      location: { latitude: 13.3153, longitude: 75.7754 },
      attachment: "field-photo.jpg",
    }, new Date("2026-08-27T10:00:00.000Z"));
    saveQueuedReport(report, storage);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.key).toBe("lews-report-queue");
    expect(JSON.parse(writes[0]?.value ?? "{}")).toMatchObject({ reportId: "LEWS-2026-1001", attachment: "field-photo.jpg", location: { latitude: 13.3153 } });
  });

  it("appends multiple reports to list and retrieves them", () => {
    const store: Record<string, string> = {};
    const mockStorage: any = {
      setItem: (key: string, val: string) => { store[key] = val; },
      getItem: (key: string) => store[key] ?? null,
      removeItem: (key: string) => { delete store[key]; },
    };

    const r1 = createQueuedReport({
      reportId: "LEWS-1",
      category: "SLOPE CRACK",
      severity: "MEDIUM",
      description: "Tension crack on upper tier",
      location: { latitude: 13.31, longitude: 75.77 },
      attachment: null,
    });
    const r2 = createQueuedReport({
      reportId: "LEWS-2",
      category: "BLOCKED ROAD",
      severity: "CRITICAL",
      description: "Debris on highway",
      location: { latitude: 13.32, longitude: 75.78 },
      attachment: "debris.jpg",
    });

    appendQueuedReport(r1, mockStorage);
    appendQueuedReport(r2, mockStorage);

    const retrieved = getQueuedReports(mockStorage);
    expect(retrieved).toHaveLength(2);
    expect(retrieved[0]?.reportId).toBe("LEWS-2");
    expect(retrieved[1]?.reportId).toBe("LEWS-1");

    const geojson = exportReportsToGeoJson(retrieved);
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features).toHaveLength(2);
    expect(geojson.features[0].geometry.coordinates).toEqual([75.78, 13.32]);
    expect(geojson.features[0].properties.reportId).toBe("LEWS-2");

    clearQueuedReports(mockStorage);
    expect(getQueuedReports(mockStorage)).toEqual([]);
  });
});
