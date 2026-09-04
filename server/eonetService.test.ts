import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchEonetEvents, normalizeEonetPayload, clearEonetCache } from "./services/eonetService";

describe("eonetService", () => {
  afterEach(() => { clearEonetCache(); vi.unstubAllEnvs(); });

  it("returns an explicit unavailable result when the public feed fails", async () => {
    vi.stubEnv("NASA_EONET_URL", "http://127.0.0.1:1/unavailable");
    const result = await fetchEonetEvents(true);
    expect(result.available).toBe(false);
    expect(result.events).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  it("normalizes valid events and ignores malformed geometry", () => {
    const events = normalizeEonetPayload({ events: [
      { id: "EONET_1", title: "Reported slope failure", geometry: [{ date: "2026-08-25T10:00:00Z", coordinates: [75.8, 12.3] }], sources: [{ id: "USGS" }] },
      { id: "EONET_2", title: "Missing location", geometry: [{ date: "2026-08-25T10:00:00Z", coordinates: [] }] },
    ] });
    expect(events).toEqual([{
      id: "EONET_1",
      title: "Reported slope failure",
      date: "2026-08-25T10:00:00Z",
      latitude: 12.3,
      longitude: 75.8,
      source: "USGS",
      status: "open",
      category: "landslides",
      categoryTitle: "Landslides & Slope Failures",
    }]);
  });

  it("strictly rejects closed and historical events from years ago", () => {
    const events = normalizeEonetPayload({ events: [
      // 1. Closed historical flood from 2018 (should be rejected)
      {
        id: "EONET_2018_FLOOD",
        title: "Karnataka, India Floods and Landslides",
        closed: "2018-08-20T00:00:00Z",
        geometry: [{ date: "2018-08-14T00:00:00Z", coordinates: [75.49, 12.94] }],
        categories: [{ id: "floods", title: "Floods" }],
      },
      // 2. Open but ancient event from 2018 that was never marked closed (should be rejected by maxAge)
      {
        id: "EONET_2018_ANCIENT",
        title: "Old Untracked Event",
        geometry: [{ date: "2018-08-14T00:00:00Z", coordinates: [75.49, 12.94] }],
        categories: [{ id: "floods", title: "Floods" }],
      },
      // 3. Genuine recent active event (should be accepted)
      {
        id: "EONET_RECENT",
        title: "Tropical Storm Ongoing",
        geometry: [{ date: new Date().toISOString(), coordinates: [128.0, 29.5] }],
        categories: [{ id: "severeStorms", title: "Severe Storms & Cyclones" }],
      },
    ] });

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("EONET_RECENT");
    expect(events[0].status).toBe("open");
  });
});
