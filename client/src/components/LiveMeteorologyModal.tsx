import React, { useState } from "react";
import {
  X,
  CloudRain,
  Wind,
  Compass,
  Sun,
  Sunset,
  Sunrise,
  Gauge,
  Droplets,
  Cloud,
  Thermometer,
  ShieldAlert,
  Calendar,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { LiveTelemetrySnapshot } from "../../../server/services/liveTelemetryService";

interface LiveMeteorologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: LiveTelemetrySnapshot | null;
  stationName: string;
  stationRegion: string;
  countryFlag?: string;
  elevation?: string;
  coords?: string;
}

export function LiveMeteorologyModal({
  isOpen,
  onClose,
  data,
  stationName,
  stationRegion,
  countryFlag = "📍",
  elevation = "1,150m MSL",
  coords = "",
}: LiveMeteorologyModalProps) {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "HOURLY_24H" | "DAILY_7D" | "GEOTECH">("OVERVIEW");

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const temp = data?.temperatureC ?? 22.0;
  const apparentTemp = data?.apparentTemperatureC ?? 23.1;
  const condition = data?.weatherLabel ?? "Partly Cloudy";
  const icon = data?.weatherIcon ?? "⛅";
  const rainRate = data?.rainfallMmHr ?? 0.0;
  const rain24h = data?.accumulatedRain24hMm ?? 0.0;
  const humidity = data?.relativeHumidityPct ?? 80;
  const dewPoint = data?.dewPointC ?? 18.5;
  const pressure = data?.surfacePressureHpa ?? 1013.2;
  const pressureTendency = data?.pressureTendency3hHpa ?? 0.0;
  const windSpeed = data?.windSpeedKmh ?? 12.0;
  const windGusts = data?.windGustsKmh ?? 18.0;
  const windCompass = data?.windDirectionCompass ?? "SW";
  const windDeg = data?.windDirectionDeg ?? 225;
  const uvIndex = data?.uvIndex ?? 5.5;
  const cloudCover = data?.cloudCoverPct ?? 50;
  const sunrise = data?.sunrise ?? "06:15";
  const sunset = data?.sunset ?? "18:30";
  const hourly = data?.hourly24h ?? [];
  const daily = data?.sevenDayForecast ?? [];
  const alerts = data?.meteorologicalAlerts ?? [];

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#101719] border border-stone-700/80 rounded-2xl shadow-2xl overflow-hidden font-sans text-stone-200">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-[#141D20]/90">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{countryFlag}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">{stationName}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  METEOROLOGICAL RADAR
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  OPEN-METEO LIVE
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono mt-0.5">
                {stationRegion} &middot; {elevation} &middot; [{coords}]
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-700 transition-colors"
            title="Close Meteorology Station"
          >
            <X size={16} />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-[#0D1315] border-b border-stone-800/80 overflow-x-auto scrollbar-none">
          {[
            { id: "OVERVIEW", label: "🌦️ CURRENT ATMOSPHERE" },
            { id: "HOURLY_24H", label: "⏱️ 24-HOUR RADAR TIMELINE" },
            { id: "DAILY_7D", label: "📅 7-DAY EXTENDED FORECAST" },
            { id: "GEOTECH", label: "⛰️ HYDRO-GEOTECHNICAL LINK" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20"
                  : "bg-stone-900/80 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          
          {/* TAB 1: CURRENT ATMOSPHERE OVERVIEW */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-4">
              {/* TOP HERO WEATHER CARD */}
              <div className="p-5 rounded-xl bg-gradient-to-r from-[#172428] via-[#142024] to-[#121B1E] border border-cyan-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-5xl drop-shadow-md">{icon}</span>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-white tracking-tight">{temp}°C</span>
                      <span className="text-xs text-stone-400 font-mono">Feels like <b>{apparentTemp}°C</b></span>
                    </div>
                    <div className="text-sm font-semibold text-cyan-300 mt-0.5">{condition}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-stone-300">
                  <div className="bg-stone-900/90 p-2.5 rounded-lg border border-stone-800 text-center min-w-[90px]">
                    <span className="text-[10px] text-stone-400 block">PRECIP RATE</span>
                    <strong className="text-sky-300 text-sm">{rainRate.toFixed(1)} mm/h</strong>
                  </div>
                  <div className="bg-stone-900/90 p-2.5 rounded-lg border border-stone-800 text-center min-w-[90px]">
                    <span className="text-[10px] text-stone-400 block">24H TOTAL</span>
                    <strong className="text-sky-300 text-sm">{rain24h.toFixed(1)} mm</strong>
                  </div>
                  <div className="bg-stone-900/90 p-2.5 rounded-lg border border-stone-800 text-center min-w-[90px]">
                    <span className="text-[10px] text-stone-400 block">WIND GUSTS</span>
                    <strong className="text-amber-300 text-sm">{windGusts} km/h</strong>
                  </div>
                </div>
              </div>

              {/* METEOROLOGICAL HAZARD ALERTS */}
              {alerts.length > 0 && (
                <div className="space-y-2">
                  {alerts.map((al, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border flex items-start gap-3 text-xs font-mono ${
                        al.severity === "CRITICAL"
                          ? "bg-red-950/40 border-red-500/50 text-red-200"
                          : "bg-amber-950/40 border-amber-500/50 text-amber-200"
                      }`}
                    >
                      <ShieldAlert size={16} className={al.severity === "CRITICAL" ? "text-red-400 flex-none" : "text-amber-400 flex-none"} />
                      <div>
                        <strong className="font-bold tracking-wide uppercase">{al.title}</strong>
                        <p className="mt-0.5 text-stone-300 opacity-90">{al.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 6-CARD ATMOSPHERIC VITAL MATRIX */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* 1. HUMIDITY & DEW POINT */}
                <div className="p-4 rounded-xl bg-[#141E22] border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                    <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                      <Droplets size={14} /> HUMIDITY & DEW POINT
                    </span>
                    <span>{humidity}%</span>
                  </div>
                  <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden border border-stone-800">
                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${humidity}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-stone-400 pt-1">
                    <span>Dew Point: <b className="text-stone-200">{dewPoint}°C</b></span>
                    <span>Saturation: <b className="text-cyan-300">{humidity > 85 ? "Near Saturation" : "Moderate"}</b></span>
                  </div>
                </div>

                {/* 2. WIND SPEED & COMPASS DIRECTION */}
                <div className="p-4 rounded-xl bg-[#141E22] border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                    <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                      <Wind size={14} /> WIND DYNAMICS
                    </span>
                    <span className="text-amber-300">{windCompass} ({windDeg}°)</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold text-white font-mono">{windSpeed}</span>
                      <span className="text-xs text-stone-400 font-mono ml-1">km/h</span>
                    </div>
                    <div className="text-right text-[11px] font-mono text-stone-400">
                      <span>Peak Gusts: <b className="text-amber-300">{windGusts} km/h</b></span>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-stone-500">
                    Mountain slope windward boundary conditions
                  </div>
                </div>

                {/* 3. BAROMETRIC AIR PRESSURE */}
                <div className="p-4 rounded-xl bg-[#141E22] border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                    <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                      <Gauge size={14} /> BAROMETRIC PRESSURE
                    </span>
                    <span className="flex items-center gap-1">
                      {pressureTendency < 0 ? (
                        <TrendingDown size={13} className="text-amber-400" />
                      ) : (
                        <TrendingUp size={13} className="text-emerald-400" />
                      )}
                      <b className="text-stone-200">{pressureTendency > 0 ? `+${pressureTendency}` : pressureTendency} hPa/3h</b>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold text-white font-mono">{pressure}</span>
                      <span className="text-xs text-stone-400 font-mono ml-1">hPa</span>
                    </div>
                    <span className="text-[11px] font-mono text-stone-400">
                      MSL: <b>{data?.pressureMslHpa ?? 1013.2} hPa</b>
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-stone-500">
                    {pressureTendency <= -2.0 ? "⚠️ Falling barometric trend (Incoming storm)" : "Stable atmospheric column"}
                  </div>
                </div>

                {/* 4. UV INDEX & RADIATION */}
                <div className="p-4 rounded-xl bg-[#141E22] border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Sun size={14} /> UV RADIATION INDEX
                    </span>
                    <span className="text-amber-400 font-bold">
                      {uvIndex < 3 ? "LOW" : uvIndex < 6 ? "MODERATE" : uvIndex < 8 ? "HIGH" : "VERY HIGH"}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold text-white font-mono">{uvIndex}</span>
                      <span className="text-xs text-stone-400 font-mono ml-1">/ 11+</span>
                    </div>
                    <div className="text-right text-[11px] font-mono text-stone-400">
                      <span>Solar Noon Radiation</span>
                    </div>
                  </div>
                  <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden border border-stone-800">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(100, (uvIndex / 11) * 100)}%` }} />
                  </div>
                </div>

                {/* 5. SUNRISE & SUNSET EPHEMERIS */}
                <div className="p-4 rounded-xl bg-[#141E22] border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                    <span className="flex items-center gap-1.5 text-orange-300 font-bold">
                      <Sunset size={14} /> SOLAR EPHEMERIS
                    </span>
                    <span>DAYLIGHT</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center pt-1">
                    <div className="bg-[#101719] p-2 rounded-lg border border-stone-800">
                      <span className="text-[10px] text-stone-400 font-mono flex items-center justify-center gap-1">
                        <Sunrise size={11} className="text-amber-400" /> SUNRISE
                      </span>
                      <strong className="text-stone-200 font-mono text-sm block mt-0.5">{sunrise}</strong>
                    </div>
                    <div className="bg-[#101719] p-2 rounded-lg border border-stone-800">
                      <span className="text-[10px] text-stone-400 font-mono flex items-center justify-center gap-1">
                        <Sunset size={11} className="text-orange-400" /> SUNSET
                      </span>
                      <strong className="text-stone-200 font-mono text-sm block mt-0.5">{sunset}</strong>
                    </div>
                  </div>
                </div>

                {/* 6. CLOUD COVER & VOLUMETRIC SATURATION */}
                <div className="p-4 rounded-xl bg-[#141E22] border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                    <span className="flex items-center gap-1.5 text-sky-300 font-bold">
                      <Cloud size={14} /> CLOUD COVER & SKY
                    </span>
                    <span>{cloudCover}%</span>
                  </div>
                  <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden border border-stone-800">
                    <div className="bg-sky-400 h-full rounded-full" style={{ width: `${cloudCover}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-stone-400 pt-1">
                    <span>Sky Condition: <b className="text-stone-200">{cloudCover > 70 ? "Overcast" : cloudCover > 30 ? "Scattered Clouds" : "Clear"}</b></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 24-HOUR HOURLY RADAR TIMELINE */}
          {activeTab === "HOURLY_24H" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#141E22] border border-stone-800">
                <h3 className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock size={14} /> 24-HOUR HIGH-RESOLUTION HOURLY FORECAST MATRIX
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                  {hourly.slice(0, 16).map((h, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl border text-center font-mono transition-all ${
                        h.precipitationMm > 0.5
                          ? "bg-cyan-950/30 border-cyan-500/40 text-cyan-200"
                          : "bg-[#101719] border-stone-800 text-stone-300"
                      }`}
                    >
                      <span className="text-[10px] text-stone-400 block">{h.time}</span>
                      <strong className="text-sm font-bold text-white block my-1">{h.temperatureC}°C</strong>
                      
                      <div className="space-y-1 text-[9.5px] border-t border-stone-800/80 pt-1.5">
                        <div className="flex items-center justify-between text-sky-300">
                          <span>💧 {h.precipitationProbabilityPct}%</span>
                          <span>{h.precipitationMm}mm</span>
                        </div>
                        <div className="flex items-center justify-between text-stone-400">
                          <span>💨 {h.windSpeedKmh}k</span>
                          <span>🌱 {h.soilMoisturePct}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 7-DAY EXTENDED METEOROLOGICAL FORECAST */}
          {activeTab === "DAILY_7D" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar size={14} /> 7-DAY SYNOPTIC METEOROLOGICAL OUTLOOK
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5">
                {daily.map((d, i) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded-xl border font-mono flex flex-col justify-between text-center transition-all ${
                      i === 0
                        ? "bg-[#162529] border-amber-500/50 shadow-lg"
                        : "bg-[#141E22] border-stone-800"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-amber-300 block">{d.dayName}</span>
                      <span className="text-[9.5px] text-stone-400 block">{d.date.slice(5)}</span>
                      <div className="text-3xl my-2">{d.weatherIcon}</div>
                      <span className="text-[10.5px] text-stone-300 font-semibold block leading-tight min-h-[28px]">
                        {d.weatherLabel}
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-stone-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-center gap-2">
                        <strong className="text-white">{d.temperatureMaxC}°</strong>
                        <span className="text-stone-400">{d.temperatureMinC}°</span>
                      </div>
                      <div className="text-[10px] text-sky-300 font-semibold">
                        🌧️ {d.precipitationSumMm} mm ({d.precipitationProbabilityMaxPct}%)
                      </div>
                      <div className="text-[9.5px] text-stone-400">
                        💨 Max: {d.windSpeedMaxKmh} km/h
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: HYDRO-GEOTECHNICAL LINK */}
          {activeTab === "GEOTECH" && (
            <div className="space-y-4 font-mono">
              <div className="p-4 rounded-xl bg-[#141E22] border border-cyan-500/30 space-y-3">
                <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} /> HYDRO-METEOROLOGICAL & MOHR-COULOMB SLOPE CORRELATION
                </h3>

                <p className="text-xs text-stone-300 leading-relaxed">
                  Real-time precipitation infiltration directly affects the effective shear strength $\tau_f$ along potential slip surfaces by increasing pore water pressure $u$ and reducing the effective normal stress $\sigma'$.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-[#101719] border border-stone-800">
                    <span className="text-[10px] text-stone-400 block">FACTOR OF SAFETY ($FoS$)</span>
                    <strong className="text-lg text-emerald-400 block mt-1">
                      {data?.geotechnicalAnalysis.factorOfSafety ?? 1.45}
                    </strong>
                    <span className="text-[9.5px] text-stone-500">Threshold: &lt;1.0 (Failure), &gt;1.3 (Stable)</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#101719] border border-stone-800">
                    <span className="text-[10px] text-stone-400 block">PORE WATER PRESSURE</span>
                    <strong className="text-lg text-amber-300 block mt-1">
                      {data?.geotechnicalAnalysis.poreWaterPressureKpa ?? 28} kPa
                    </strong>
                    <span className="text-[9.5px] text-stone-500">Hydrostatic + Matric Suction loss</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#101719] border border-stone-800">
                    <span className="text-[10px] text-stone-400 block">ANTECEDENT RAIN RISK</span>
                    <strong className="text-lg text-sky-300 block mt-1">
                      {data?.geotechnicalAnalysis.antecedentRainfallRisk ?? "MODERATE"}
                    </strong>
                    <span className="text-[9.5px] text-stone-500">Based on 24h & 72h accumulated rain</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-stone-800 bg-[#141D20]/90 text-xs font-mono text-stone-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ECMWF / GFS Weather Models Synchronized</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-colors"
          >
            DISMISS RADAR
          </button>
        </div>

      </div>
    </div>
  );
}
