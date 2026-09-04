import axios from "axios";

export interface HourlyWeatherItem {
  time: string;
  temperatureC: number;
  relativeHumidityPct: number;
  precipitationMm: number;
  precipitationProbabilityPct: number;
  windSpeedKmh: number;
  surfacePressureHpa: number;
  uvIndex: number;
  soilMoisturePct: number;
}

export interface DailyForecastItem {
  date: string;
  dayName: string;
  weatherCode: number;
  weatherLabel: string;
  weatherIcon: string;
  temperatureMaxC: number;
  temperatureMinC: number;
  precipitationSumMm: number;
  precipitationProbabilityMaxPct: number;
  windSpeedMaxKmh: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
}

export interface LiveTelemetrySnapshot {
  zoneId: string;
  source: "OPEN_METEO_LIVE" | "CACHED_LIVE" | "FALLBACK";
  timestamp: string;
  elevationMeters: number;
  
  // Basic & Thermal
  temperatureC: number;
  apparentTemperatureC: number;
  relativeHumidityPct: number;
  dewPointC: number;
  isDay: boolean;

  // Weather Condition Meta
  weatherCode: number;
  weatherLabel: string;
  weatherIcon: string;
  cloudCoverPct: number;

  // Precipitation
  rainfallMmHr: number;
  accumulatedRain24hMm: number;

  // Pressure & Wind
  surfacePressureHpa: number;
  pressureMslHpa: number;
  pressureTendency3hHpa: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windDirectionCompass: string;
  windGustsKmh: number;

  // Radiation & Sun
  uvIndex: number;
  sunrise: string;
  sunset: string;

  // Soil & Subsurface Profile
  soilTemperatureC: number;
  soilMoisturePct: number;
  soilMoistureProfile: {
    depth0to1cm: number;
    depth1to3cm: number;
    depth3to9cm: number;
    depth9to27cm: number;
  };

  // Hourly (24h) & 7-Day Forecast
  hourlyRainfall: { time: string; rainMm: number; soilMoisturePct: number }[];
  hourly24h: HourlyWeatherItem[];
  sevenDayForecast: DailyForecastItem[];

  // Seismic & Geotechnical Hazard Matrix
  seismicEvents: {
    id: string;
    magnitude: number;
    place: string;
    distanceKm: number;
    depthKm: number;
    time: string;
  }[];
  geotechnicalAnalysis: {
    poreWaterPressureKpa: number;
    factorOfSafety: number;
    antecedentRainfallRisk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
    seismicTriggerRisk: "NONE" | "MODERATE" | "HIGH";
  };
  meteorologicalAlerts: {
    severity: "INFO" | "WARNING" | "CRITICAL";
    title: string;
    description: string;
  }[];
}

interface CacheEntry {
  data: LiveTelemetrySnapshot;
  cachedAt: number;
}
const telemetryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3 * 60 * 1000;

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const p = Math.PI / 180;
  const dLat = (lat2 - lat1) * p;
  const dLon = (lon2 - lon1) * p;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function degreesToCompass(deg: number): string {
  const compass = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const val = Math.floor((deg / 22.5) + 0.5);
  return compass[val % 16];
}

function interpretWmoCode(code: number, isDay: boolean = true): { label: string; icon: string } {
  switch (code) {
    case 0:
      return { label: "Clear Sky", icon: isDay ? "☀️" : "🌙" };
    case 1:
      return { label: "Mainly Clear", icon: isDay ? "🌤️" : "☁️" };
    case 2:
      return { label: "Partly Cloudy", icon: "⛅" };
    case 3:
      return { label: "Overcast", icon: "☁️" };
    case 45:
    case 48:
      return { label: "Fog & Rime Fog", icon: "🌫️" };
    case 51:
    case 53:
    case 55:
      return { label: "Drizzle (Light to Dense)", icon: "🌦️" };
    case 61:
      return { label: "Slight Rain", icon: "🌧️" };
    case 63:
      return { label: "Moderate Rain", icon: "🌧️" };
    case 65:
      return { label: "Heavy Torrential Rain", icon: "⛈️" };
    case 71:
    case 73:
    case 75:
      return { label: "Snow Fall", icon: "🌨️" };
    case 80:
    case 81:
    case 82:
      return { label: "Rain Showers", icon: "🌦️" };
    case 95:
      return { label: "Thunderstorm", icon: "⚡" };
    case 96:
    case 99:
      return { label: "Severe Thunderstorm with Hail", icon: "🌩️" };
    default:
      return { label: "Variable Mountain Weather", icon: "⛅" };
  }
}

export async function fetchLiveStationTelemetry(
  lat: number,
  lng: number,
  zoneId: string = "CUSTOM"
): Promise<LiveTelemetrySnapshot> {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const now = Date.now();
  const cached = telemetryCache.get(cacheKey);

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return {
      ...cached.data,
      source: "CACHED_LIVE",
    };
  }

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,soil_temperature_0_to_10cm,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,surface_pressure,wind_speed_10m,uv_index,soil_moisture_0_to_1cm&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;
    const seismicUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lng}&maxradiuskm=400&minmagnitude=2.5&limit=5`;

    const [weatherRes, seismicRes] = await Promise.allSettled([
      axios.get(weatherUrl, { timeout: 4500 }),
      axios.get(seismicUrl, { timeout: 3500 }),
    ]);

    let weatherData: any = null;
    if (weatherRes.status === "fulfilled" && weatherRes.value.data) {
      weatherData = weatherRes.value.data;
    }

    let seismicFeatures: any[] = [];
    if (seismicRes.status === "fulfilled" && seismicRes.value.data?.features) {
      seismicFeatures = seismicRes.value.data.features;
    }

    const current = weatherData?.current || {};
    const elevation = weatherData?.elevation || 1150;
    const isDay = current.is_day === 1 || current.is_day === undefined;
    const weatherCode = current.weather_code ?? 2;
    const { label: weatherLabel, icon: weatherIcon } = interpretWmoCode(weatherCode, isDay);

    const rawSoil01 = typeof current.soil_moisture_0_to_1cm === "number" ? current.soil_moisture_0_to_1cm : 0.28;
    const rawSoil13 = typeof current.soil_moisture_1_to_3cm === "number" ? current.soil_moisture_1_to_3cm : 0.30;
    const rawSoil39 = typeof current.soil_moisture_3_to_9cm === "number" ? current.soil_moisture_3_to_9cm : 0.32;
    const rawSoil927 = typeof current.soil_moisture_9_to_27cm === "number" ? current.soil_moisture_9_to_27cm : 0.35;

    const soilSaturationPct = Math.min(100, Math.round((rawSoil01 / 0.45) * 100));

    // Hourly Arrays
    const hourlyTimes: string[] = weatherData?.hourly?.time || [];
    const hourlyTemp: number[] = weatherData?.hourly?.temperature_2m || [];
    const hourlyHumidity: number[] = weatherData?.hourly?.relative_humidity_2m || [];
    const hourlyPrecipProb: number[] = weatherData?.hourly?.precipitation_probability || [];
    const hourlyPrecip: number[] = weatherData?.hourly?.precipitation || [];
    const hourlyWind: number[] = weatherData?.hourly?.wind_speed_10m || [];
    const hourlyPressure: number[] = weatherData?.hourly?.surface_pressure || [];
    const hourlyUv: number[] = weatherData?.hourly?.uv_index || [];
    const hourlySoil: number[] = weatherData?.hourly?.soil_moisture_0_to_1cm || [];

    const hourly24h: HourlyWeatherItem[] = hourlyTimes.slice(0, 24).map((timeStr, idx) => ({
      time: timeStr.includes("T") ? timeStr.split("T")[1].slice(0, 5) : timeStr,
      temperatureC: Number((hourlyTemp[idx] ?? 20.0).toFixed(1)),
      relativeHumidityPct: Math.round(hourlyHumidity[idx] ?? 80),
      precipitationMm: Number((hourlyPrecip[idx] ?? 0).toFixed(1)),
      precipitationProbabilityPct: Math.round(hourlyPrecipProb[idx] ?? 0),
      windSpeedKmh: Number((hourlyWind[idx] ?? 10).toFixed(1)),
      surfacePressureHpa: Number((hourlyPressure[idx] ?? 1013).toFixed(1)),
      uvIndex: Number((hourlyUv[idx] ?? 0).toFixed(1)),
      soilMoisturePct: Math.min(100, Math.round(((hourlySoil[idx] ?? 0.25) / 0.45) * 100)),
    }));

    const hourlyRainfall = hourlyTimes.slice(-16).map((timeStr, idx) => ({
      time: timeStr.includes("T") ? timeStr.split("T")[1] : timeStr,
      rainMm: hourlyPrecip[idx] ?? 0,
      soilMoisturePct: Math.min(100, Math.round(((hourlySoil[idx] ?? 0.25) / 0.45) * 100)),
    }));

    const accumulatedRain24h = hourlyPrecip.slice(0, 24).reduce((acc, p) => acc + (p || 0), 0);

    // Daily Forecast Arrays
    const dailyTimes: string[] = weatherData?.daily?.time || [];
    const dailyCodes: number[] = weatherData?.daily?.weather_code || [];
    const dailyMaxTemp: number[] = weatherData?.daily?.temperature_2m_max || [];
    const dailyMinTemp: number[] = weatherData?.daily?.temperature_2m_min || [];
    const dailySunrises: string[] = weatherData?.daily?.sunrise || [];
    const dailySunsets: string[] = weatherData?.daily?.sunset || [];
    const dailyUvMax: number[] = weatherData?.daily?.uv_index_max || [];
    const dailyPrecipSum: number[] = weatherData?.daily?.precipitation_sum || [];
    const dailyPrecipProbMax: number[] = weatherData?.daily?.precipitation_probability_max || [];
    const dailyWindMax: number[] = weatherData?.daily?.wind_speed_10m_max || [];

    const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const sevenDayForecast: DailyForecastItem[] = dailyTimes.slice(0, 7).map((dateStr, idx) => {
      const d = new Date(dateStr);
      const dayName = isNaN(d.getTime()) ? `DAY ${idx + 1}` : daysOfWeek[d.getDay()];
      const code = dailyCodes[idx] ?? 2;
      const { label, icon } = interpretWmoCode(code, true);

      return {
        date: dateStr,
        dayName: idx === 0 ? "TODAY" : dayName,
        weatherCode: code,
        weatherLabel: label,
        weatherIcon: icon,
        temperatureMaxC: Number((dailyMaxTemp[idx] ?? 24).toFixed(1)),
        temperatureMinC: Number((dailyMinTemp[idx] ?? 16).toFixed(1)),
        precipitationSumMm: Number((dailyPrecipSum[idx] ?? 0).toFixed(1)),
        precipitationProbabilityMaxPct: Math.round(dailyPrecipProbMax[idx] ?? 0),
        windSpeedMaxKmh: Number((dailyWindMax[idx] ?? 15).toFixed(1)),
        uvIndexMax: Number((dailyUvMax[idx] ?? 5).toFixed(1)),
        sunrise: dailySunrises[idx]?.split("T")[1]?.slice(0, 5) || "06:15",
        sunset: dailySunsets[idx]?.split("T")[1]?.slice(0, 5) || "18:30",
      };
    });

    const seismicEvents = seismicFeatures.map((f: any) => {
      const coords = f.geometry?.coordinates || [lng, lat, 10];
      const eqLng = coords[0];
      const eqLat = coords[1];
      const depth = coords[2] || 10;
      const dist = calculateDistanceKm(lat, lng, eqLat, eqLng);
      return {
        id: f.id,
        magnitude: f.properties?.mag || 3.0,
        place: f.properties?.place || "Regional Quake",
        distanceKm: dist,
        depthKm: Math.round(depth),
        time: new Date(f.properties?.time || Date.now()).toISOString(),
      };
    });

    // Dew point approximation: Td = T - ((100 - RH)/5)
    const tempNow = current.temperature_2m ?? 22.0;
    const rhNow = current.relative_humidity_2m ?? 80;
    const dewPoint = Number((tempNow - ((100 - rhNow) / 5)).toFixed(1));

    const windDeg = current.wind_direction_10m ?? 240;
    const windCompass = degreesToCompass(windDeg);

    // 3h Pressure tendency approximation
    const pressureNow = current.surface_pressure ?? 1013.2;
    const pressurePast3h = hourlyPressure[3] ?? pressureNow;
    const pressureTendency = Number((pressureNow - pressurePast3h).toFixed(1));

    // Geotechnical & Meteorological Alert Extraction
    const porePressure = Math.round((soilSaturationPct / 100) * 45.0 + (current.precipitation || 0) * 1.8);
    const baseFoS = 1.85 - (soilSaturationPct / 100) * 0.75 - Math.min(0.6, (current.precipitation || 0) * 0.04);
    const hasNearbyQuake = seismicEvents.some((e) => e.magnitude >= 4.5 && e.distanceKm <= 150);
    const finalFoS = Number((hasNearbyQuake ? Math.max(0.75, baseFoS - 0.25) : baseFoS).toFixed(2));

    const antecedentRisk =
      accumulatedRain24h > 60 || soilSaturationPct > 88
        ? "CRITICAL"
        : accumulatedRain24h > 30 || soilSaturationPct > 70
        ? "HIGH"
        : accumulatedRain24h > 10 || soilSaturationPct > 50
        ? "MODERATE"
        : "LOW";

    const seismicRisk = hasNearbyQuake ? "HIGH" : seismicEvents.length > 0 ? "MODERATE" : "NONE";

    const meteorologicalAlerts: { severity: "INFO" | "WARNING" | "CRITICAL"; title: string; description: string }[] = [];

    if (current.precipitation > 15 || accumulatedRain24h > 50) {
      meteorologicalAlerts.push({
        severity: "CRITICAL",
        title: "Intense Precipitation Warning",
        description: `Active rain rate is ${current.precipitation} mm/hr with ${accumulatedRain24h.toFixed(1)} mm accumulated in past 24 hours. High hazard for debris flow.`,
      });
    } else if (current.precipitation > 5 || accumulatedRain24h > 25) {
      meteorologicalAlerts.push({
        severity: "WARNING",
        title: "Heavy Rainfall Advisory",
        description: `Soil moisture saturation is ${soilSaturationPct}%. Mountain slopes approaching plastic limit.`,
      });
    }

    if (pressureTendency <= -2.5) {
      meteorologicalAlerts.push({
        severity: "WARNING",
        title: "Rapid Barometric Drop / Storm Front",
        description: `Atmospheric pressure dropped by ${pressureTendency} hPa over 3 hours. Active cyclonic/storm convection incoming.`,
      });
    }

    if (current.wind_gusts_10m >= 55) {
      meteorologicalAlerts.push({
        severity: "WARNING",
        title: "High Wind Gusts Alert",
        description: `Peak wind gusts reached ${current.wind_gusts_10m} km/h from ${windCompass}.`,
      });
    }

    if (hasNearbyQuake) {
      meteorologicalAlerts.push({
        severity: "CRITICAL",
        title: "Co-Seismic Slope Ground-Failure Risk",
        description: `USGS seismic sensors reported M${seismicEvents[0].magnitude.toFixed(1)} quake within ${seismicEvents[0].distanceKm} km.`,
      });
    }

    const snapshot: LiveTelemetrySnapshot = {
      zoneId,
      source: "OPEN_METEO_LIVE",
      timestamp: new Date().toISOString(),
      elevationMeters: Math.round(elevation),
      
      temperatureC: Number(tempNow.toFixed(1)),
      apparentTemperatureC: Number((current.apparent_temperature ?? tempNow).toFixed(1)),
      relativeHumidityPct: Math.round(rhNow),
      dewPointC: dewPoint,
      isDay,

      weatherCode,
      weatherLabel,
      weatherIcon,
      cloudCoverPct: Math.round(current.cloud_cover ?? 45),

      rainfallMmHr: Number((current.precipitation ?? 0).toFixed(1)),
      accumulatedRain24hMm: Number(accumulatedRain24h.toFixed(1)),

      surfacePressureHpa: Number(pressureNow.toFixed(1)),
      pressureMslHpa: Number((current.pressure_msl ?? 1013.2).toFixed(1)),
      pressureTendency3hHpa: pressureTendency,
      windSpeedKmh: Number((current.wind_speed_10m ?? 10).toFixed(1)),
      windDirectionDeg: windDeg,
      windDirectionCompass: windCompass,
      windGustsKmh: Number((current.wind_gusts_10m ?? (current.wind_speed_10m ?? 10) * 1.4).toFixed(1)),

      uvIndex: Number((hourlyUv[12] ?? 6.0).toFixed(1)),
      sunrise: dailySunrises[0]?.split("T")[1]?.slice(0, 5) || "06:15",
      sunset: dailySunsets[0]?.split("T")[1]?.slice(0, 5) || "18:30",

      soilTemperatureC: Number((current.soil_temperature_0_to_10cm ?? 20).toFixed(1)),
      soilMoisturePct: soilSaturationPct,
      soilMoistureProfile: {
        depth0to1cm: Math.round((rawSoil01 / 0.45) * 100),
        depth1to3cm: Math.round((rawSoil13 / 0.45) * 100),
        depth3to9cm: Math.round((rawSoil39 / 0.45) * 100),
        depth9to27cm: Math.round((rawSoil927 / 0.45) * 100),
      },

      hourlyRainfall,
      hourly24h,
      sevenDayForecast,

      seismicEvents,
      geotechnicalAnalysis: {
        poreWaterPressureKpa: porePressure,
        factorOfSafety: finalFoS,
        antecedentRainfallRisk: antecedentRisk,
        seismicTriggerRisk: seismicRisk,
      },
      meteorologicalAlerts,
    };

    telemetryCache.set(cacheKey, { data: snapshot, cachedAt: now });
    return snapshot;
  } catch (err) {
    console.warn(`[LiveTelemetryService] Fallback calculation active for (${lat}, ${lng}):`, err);

    return {
      zoneId,
      source: "FALLBACK",
      timestamp: new Date().toISOString(),
      elevationMeters: 1150,
      
      temperatureC: 22.0,
      apparentTemperatureC: 23.1,
      relativeHumidityPct: 82,
      dewPointC: 18.8,
      isDay: true,

      weatherCode: 61,
      weatherLabel: "Moderate Mountain Rain",
      weatherIcon: "🌧️",
      cloudCoverPct: 75,

      rainfallMmHr: 4.2,
      accumulatedRain24hMm: 18.5,

      surfacePressureHpa: 1011.5,
      pressureMslHpa: 1013.0,
      pressureTendency3hHpa: -0.8,
      windSpeedKmh: 12.0,
      windDirectionDeg: 230,
      windDirectionCompass: "SW",
      windGustsKmh: 18.5,

      uvIndex: 4.5,
      sunrise: "06:15",
      sunset: "18:35",

      soilTemperatureC: 21.0,
      soilMoisturePct: 65,
      soilMoistureProfile: {
        depth0to1cm: 65,
        depth1to3cm: 68,
        depth3to9cm: 72,
        depth9to27cm: 75,
      },

      hourlyRainfall: [
        { time: "10:00", rainMm: 0.5, soilMoisturePct: 60 },
        { time: "11:00", rainMm: 1.2, soilMoisturePct: 62 },
        { time: "12:00", rainMm: 2.5, soilMoisturePct: 65 },
        { time: "13:00", rainMm: 4.2, soilMoisturePct: 68 },
      ],
      hourly24h: Array.from({ length: 24 }, (_, i) => ({
        time: `${String(i).padStart(2, "0")}:00`,
        temperatureC: 20 + Math.sin(i / 3) * 4,
        relativeHumidityPct: 75 + Math.cos(i / 3) * 15,
        precipitationMm: i > 12 && i < 18 ? 2.5 : 0.2,
        precipitationProbabilityPct: i > 12 && i < 18 ? 85 : 20,
        windSpeedKmh: 10 + (i % 5) * 2,
        surfacePressureHpa: 1012,
        uvIndex: i >= 8 && i <= 16 ? 5 : 0,
        soilMoisturePct: 65,
      })),
      sevenDayForecast: Array.from({ length: 7 }, (_, i) => ({
        date: `2026-09-0${i + 2}`,
        dayName: ["TODAY", "THU", "FRI", "SAT", "SUN", "MON", "TUE"][i] || "DAY",
        weatherCode: 61,
        weatherLabel: "Rain Showers",
        weatherIcon: "🌦️",
        temperatureMaxC: 25.5,
        temperatureMinC: 18.0,
        precipitationSumMm: 12.0,
        precipitationProbabilityMaxPct: 80,
        windSpeedMaxKmh: 20.0,
        uvIndexMax: 6.0,
        sunrise: "06:15",
        sunset: "18:35",
      })),

      seismicEvents: [],
      geotechnicalAnalysis: {
        poreWaterPressureKpa: 28,
        factorOfSafety: 1.42,
        antecedentRainfallRisk: "MODERATE",
        seismicTriggerRisk: "NONE",
      },
      meteorologicalAlerts: [],
    };
  }
}
