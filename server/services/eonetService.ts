export type EonetEvent = {
  id: string;
  title: string;
  date: string;
  latitude: number;
  longitude: number;
  source: string;
  status: string;
  category: string;
  categoryTitle: string;
};

export type EonetResult = {
  events: EonetEvent[];
  available: boolean;
  updatedAt: string | null;
  error: string | null;
};

type EonetPayload = {
  events?: Array<{
    id?: string;
    title?: string;
    closed?: string | null;
    categories?: Array<{ id?: string; title?: string }>;
    sources?: Array<{ id?: string; url?: string }>;
    geometry?: Array<{ date?: string; type?: string; coordinates?: number[] }>;
  }>;
};

export const CATEGORY_TITLES: Record<string, string> = {
  landslides: "Landslides & Slope Failures",
  severeStorms: "Severe Storms & Cyclones",
  floods: "Floods & Inundations",
  earthquakes: "Earthquakes & Seismic Events",
  volcanoes: "Volcanoes & Ash Plumes",
  wildfires: "Wildfires",
  snow: "Snow & Ice Hazards",
  tempExtremes: "Temperature Extremes",
  drought: "Drought",
  dustHaze: "Dust & Atmospheric Haze",
  waterColor: "Water Color & Plumes",
  manmade: "Manmade Events",
  seaLakeIce: "Sea & Lake Ice",
};

export const ALL_EONET_CATEGORIES = [
  "landslides",
  "severeStorms",
  "floods",
  "earthquakes",
  "volcanoes",
  "wildfires",
  "snow",
  "tempExtremes",
  "drought",
  "dustHaze",
] as const;

const CACHE_MS = 5 * 60 * 1000;
export const MAX_EVENT_AGE_DAYS = 90;
let cache: { expiresAt: number; result: EonetResult } | null = null;

function normalizeEvent(
  event: NonNullable<EonetPayload["events"]>[number],
  fallbackCategory = "landslides",
  maxAgeDays = MAX_EVENT_AGE_DAYS
): EonetEvent | null {
  // A closed event is NEVER an ongoing live event - reject immediately
  if (event.closed) return null;

  const geometry = [...(event.geometry ?? [])].reverse().find(item => item.coordinates && item.coordinates.length >= 2);
  const longitude = geometry?.coordinates?.[0];
  const latitude = geometry?.coordinates?.[1];
  if (!event.id || !event.title || typeof latitude !== "number" || typeof longitude !== "number") return null;

  const eventDate = geometry?.date;
  if (!eventDate) return null;
  const eventTime = new Date(eventDate).getTime();
  if (isNaN(eventTime)) return null;

  // Strict live recency validation: reject events older than maxAgeDays (e.g. historical archives from 2018)
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  if (Date.now() - eventTime > maxAgeMs) {
    return null;
  }

  const source = event.sources?.find(item => item.id || item.url);
  const rawCat = event.categories?.[0];
  const category = rawCat?.id || fallbackCategory;
  const categoryTitle = rawCat?.title || CATEGORY_TITLES[category] || category;

  return {
    id: event.id,
    title: event.title,
    date: eventDate,
    latitude,
    longitude,
    source: source?.id || source?.url || "NASA EONET",
    status: "open",
    category,
    categoryTitle,
  };
}

export function normalizeEonetPayload(
  payload: EonetPayload,
  fallbackCategory = "landslides",
  maxAgeDays = MAX_EVENT_AGE_DAYS
): EonetEvent[] {
  return (payload.events ?? [])
    .map(e => normalizeEvent(e, fallbackCategory, maxAgeDays))
    .filter((event): event is EonetEvent => Boolean(event));
}

export async function fetchEonetEvents(force = false): Promise<EonetResult> {
  if (!force && cache && cache.expiresAt > Date.now()) return cache.result;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const envUrl = process.env.NASA_EONET_URL;
    // If a custom or mock test URL is specified (e.g. in vitest without nasa.gov), query that single URL
    if (envUrl && !envUrl.includes("nasa.gov")) {
      const response = await fetch(envUrl, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`NASA EONET returned HTTP ${response.status}`);
      const payload = (await response.json()) as EonetPayload;
      const result: EonetResult = {
        events: normalizeEonetPayload(payload),
        available: true,
        updatedAt: new Date().toISOString(),
        error: null,
      };
      cache = { expiresAt: Date.now() + CACHE_MS, result };
      return result;
    }

    const baseUrl = (envUrl || "https://eonet.gsfc.nasa.gov/api/v3").replace(/\/events\/?$/, "");

    // 1. Concurrently fetch all genuinely ongoing, live open events in the active 90-day window
    const liveOpenRequest = (async () => {
      const res = await fetch(`${baseUrl}/events?status=open&days=90`, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) return [];
      const payload = (await res.json()) as EonetPayload;
      return normalizeEonetPayload(payload);
    })();

    // 2. Concurrently check specific disaster categories with status=open&days=90 (never status=all)
    const categoryRequests = ALL_EONET_CATEGORIES.map(async (catId) => {
      const url = `${baseUrl}/categories/${catId}?status=open&days=90`;
      const res = await fetch(url, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) return [];
      const payload = (await res.json()) as EonetPayload;
      return normalizeEonetPayload(payload, catId);
    });

    const settled = await Promise.allSettled([liveOpenRequest, ...categoryRequests]);

    const eventMap = new Map<string, EonetEvent>();
    for (const item of settled) {
      if (item.status === "fulfilled") {
        for (const ev of item.value) {
          if (!eventMap.has(ev.id)) {
            eventMap.set(ev.id, ev);
          }
        }
      }
    }

    const allEvents = Array.from(eventMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const result: EonetResult = {
      events: allEvents,
      available: true,
      updatedAt: new Date().toISOString(),
      error: null,
    };
    cache = { expiresAt: Date.now() + CACHE_MS, result };
    return result;
  } catch (error) {
    const result: EonetResult = {
      events: [],
      available: false,
      updatedAt: null,
      error: error instanceof Error ? error.message : "NASA EONET unavailable",
    };
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

export function clearEonetCache() { cache = null; }

