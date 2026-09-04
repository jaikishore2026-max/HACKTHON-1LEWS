/*
 * =========================================================================================
 * LANDSORA REAL LEAFLET GIS SATELLITE & TERRAIN MAP ENGINE
 * Real-world interactive satellite imagery, topographic contour tiles, and dark GIS vector layers
 * for India's vulnerable mountain belts (Western Ghats & Himalayas).
 * =========================================================================================
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Compass,
  Layers,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  Radio,
  Eye,
  EyeOff,
  Navigation,
  MapPin,
  X,
  Crosshair,
  ChevronDown,
  Check,
} from "lucide-react";

export type GisZone = {
  id: string;
  name: string;
  region: string;
  continent?: "INDIA" | "ASIA_PACIFIC" | "EUROPE" | "AMERICAS" | "AFRICA_OCEANIA";
  country?: string;
  countryFlag?: string;
  coords: string;
  lat: number;
  lng: number;
  rainfall: number;
  soil: number;
  tilt: number;
  riskScore: number;
  tier: "STABLE" | "WATCH" | "CRITICAL";
  elevation: string;
  geology: string;
};

export type NasaEvent = {
  id: string;
  title: string;
  date: string;
  latitude: number;
  longitude: number;
  category?: string;
  categoryTitle?: string;
  source?: string;
  status?: string;
};

export const HAZARD_STYLES: Record<string, { label: string; icon: string; color: string; border: string }> = {
  landslides: { label: "Landslide / Slope Failure", icon: "⛰️", color: "#d97706", border: "#fde68a" },
  severeStorms: { label: "Severe Storm / Cyclone", icon: "🌀", color: "#06b6d4", border: "#ffffff" },
  floods: { label: "Flood / Inundation", icon: "🌊", color: "#2563eb", border: "#93c5fd" },
  earthquakes: { label: "Earthquake / Seismic", icon: "⚡", color: "#eab308", border: "#fef08a" },
  volcanoes: { label: "Volcano / Eruption", icon: "🌋", color: "#dc2626", border: "#fca5a5" },
  wildfires: { label: "Wildfire", icon: "🔥", color: "#ea580c", border: "#fdba74" },
  snow: { label: "Snow / Ice", icon: "❄️", color: "#38bdf8", border: "#e0f2fe" },
  seaLakeIce: { label: "Sea & Lake Ice", icon: "🧊", color: "#38bdf8", border: "#e0f2fe" },
  tempExtremes: { label: "Extreme Temperature", icon: "🌡️", color: "#a855f7", border: "#f3e8ff" },
  drought: { label: "Drought", icon: "☀️", color: "#ca8a04", border: "#fef9c3" },
  dustHaze: { label: "Dust & Haze", icon: "💨", color: "#78716c", border: "#d6d3d1" },
  waterColor: { label: "Water Color", icon: "🌊", color: "#0ea5e9", border: "#bae6fd" },
  manmade: { label: "Manmade Event", icon: "⚠️", color: "#f59e0b", border: "#fef08a" },
};

export interface InteractiveGisMapProps {
  zones: GisZone[];
  selectedZoneId?: string;
  focusedZoneId?: string;
  onSelectZone?: (zoneId: string) => void;
  onMapClickPoint?: (point: { latitude: number; longitude: number; simulatedScore?: number }) => void;
  selectedPoint?: { latitude: number; longitude: number; simulatedScore?: number } | null;
  nasaEvents?: NasaEvent[];
  className?: string;
  onAnalysisPinSelect?: (coords: { lat: number; lng: number; simulatedScore: number }) => void;
  rightPanelOpen?: boolean;
  bottomDrawerOpen?: boolean;
}

type BasemapType = "SATELLITE" | "TOPOGRAPHY" | "DARK_GIS" | "STREET";

const BASEMAP_CONFIGS: Record<BasemapType, { url: string; attribution: string; maxNativeZoom: number; maxZoom: number; subdomains?: string[] }> = {
  SATELLITE: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri &mdash; Earthstar Geographics & USGS",
    maxNativeZoom: 18,
    maxZoom: 19,
  },
  TOPOGRAPHY: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "Map data: &copy; OpenStreetMap, SRTM | Map style: &copy; OpenTopoMap",
    maxNativeZoom: 17,
    maxZoom: 19,
    subdomains: ["a", "b", "c"],
  },
  DARK_GIS: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; CARTO &copy; OpenStreetMap contributors",
    maxNativeZoom: 19,
    maxZoom: 19,
    subdomains: ["a", "b", "c", "d"],
  },
  STREET: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxNativeZoom: 19,
    maxZoom: 19,
    subdomains: ["a", "b", "c"],
  },
};

export function InteractiveGisMap({
  zones,
  selectedZoneId,
  focusedZoneId,
  onSelectZone,
  onMapClickPoint,
  selectedPoint,
  nasaEvents = [],
  className = "",
  onAnalysisPinSelect,
  rightPanelOpen = false,
  bottomDrawerOpen = false,
}: InteractiveGisMapProps) {
  const activeZoneId = selectedZoneId || focusedZoneId;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const nasaLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const evacuationLayerRef = useRef<L.LayerGroup | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);

  const [basemap, setBasemap] = useState<BasemapType>("SATELLITE");
  const [showNasa, setShowNasa] = useState(true);
  const [selectedHazardCategory, setSelectedHazardCategory] = useState<string>("ALL");
  const [showHalos, setShowHalos] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showEvacuation, setShowEvacuation] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [basemapMenuOpen, setBasemapMenuOpen] = useState(false);
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number; zoom: number }>({
    lat: 13.0,
    lng: 76.5,
    zoom: 6,
  });
  const [analysisPin, setAnalysisPin] = useState<{ lat: number; lng: number; risk: number } | null>(null);

  // Sync selectedPoint with analysisPin
  useEffect(() => {
    if (selectedPoint) {
      setAnalysisPin({
        lat: selectedPoint.latitude,
        lng: selectedPoint.longitude,
        risk: selectedPoint.simulatedScore || 65,
      });
    }
  }, [selectedPoint]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 50);
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 250);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    try {
      // Compute dynamic minimum zoom to prevent world tile repetition across wide viewports
      const containerW = mapContainerRef.current.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 1200);
      const computedMinZoom = Math.max(3, Math.ceil(Math.log2(containerW / 256)));

      // Strict single-world CRS with zero repetition and boundary locking
      const map = L.map(mapContainerRef.current, {
        center: [20.0, 15.0],
        zoom: computedMinZoom,
        zoomControl: false,
        attributionControl: false,
        minZoom: computedMinZoom,
        maxZoom: 20,
        worldCopyJump: false,
        maxBounds: [
          [-85, -180],
          [85, 180],
        ],
        maxBoundsViscosity: 1.0,
      });

      // Tile Layer with noWrap: true to strictly prevent horizontal antimeridian repetition (no duplicate Greenlands)
      const cfg = BASEMAP_CONFIGS["SATELLITE"];
      const tileLayer = L.tileLayer(cfg.url, {
        maxNativeZoom: cfg.maxNativeZoom,
        maxZoom: 20,
        subdomains: cfg.subdomains || ["0", "1", "2", "3"],
        noWrap: true,
        bounds: [
          [-85, -180],
          [85, 180],
        ],
      });

      if (tileLayer) {
        tileLayer.addTo(map);
      }

      tileLayerRef.current = tileLayer;

      // Layer groups for clean management
      const markersGroup = L.layerGroup().addTo(map);
      const nasaGroup = L.layerGroup().addTo(map);
      const heatmapGroup = L.layerGroup().addTo(map);
      const evacuationGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      nasaLayerRef.current = nasaGroup;
      heatmapLayerRef.current = heatmapGroup;
      evacuationLayerRef.current = evacuationGroup;

      // Track mouse coordinates
      map.on("mousemove", (e: L.LeafletMouseEvent) => {
        setMouseCoords({
          lat: Number(e.latlng.lat.toFixed(4)),
          lng: Number(e.latlng.lng.toFixed(4)),
          zoom: map.getZoom(),
        });
      });

      // Map click for custom analysis pin
      map.on("click", (e: L.LeafletMouseEvent) => {
        const lat = Number(e.latlng.lat.toFixed(4));
        const lng = Number(e.latlng.lng.toFixed(4));

        // Calculate simulated risk based on proximity to mountain stations
        let minDist = 999;
        let baseRisk = 45;
        zones.forEach((z) => {
          const d = Math.sqrt(Math.pow(z.lat - lat, 2) + Math.pow(z.lng - lng, 2));
          if (d < minDist) {
            minDist = d;
            baseRisk = z.riskScore;
          }
        });
        const simulatedScore = Math.min(98, Math.max(12, Math.round(baseRisk - minDist * 8 + (Math.sin(lat * 10) * 8))));

        setAnalysisPin({ lat, lng, risk: simulatedScore });

        if (onMapClickPoint) {
          onMapClickPoint({ latitude: lat, longitude: lng, simulatedScore });
        }
        if (onAnalysisPinSelect) {
          onAnalysisPinSelect({ lat, lng, simulatedScore });
        }
      });

      mapInstanceRef.current = map;

      // Active ResizeObserver to continuously handle sidebar opening/closing without tile gaps or over-zooming out
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
          const w = mapContainerRef.current?.clientWidth || window.innerWidth;
          const newMin = Math.max(3, Math.ceil(Math.log2(w / 256)));
          if (map.getMinZoom() !== newMin) {
            map.setMinZoom(newMin);
            if (map.getZoom() < newMin) {
              map.setZoom(newMin);
            }
          }
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      // Initial layout stabilization
      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {}
      }, 150);

      return () => {
        resizeObserver?.disconnect();
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (error) {
      console.warn("Leaflet map failed to initialize; falling back to static dashboard mode.", error);
    }
  }, []);

  // Update Basemap Tiles when changed
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }

      const cfg = BASEMAP_CONFIGS[basemap];
      const newLayer = L.tileLayer(cfg.url, {
        maxNativeZoom: cfg.maxNativeZoom,
        maxZoom: 20,
        subdomains: cfg.subdomains || ["0", "1", "2", "3"],
        noWrap: true,
        bounds: [
          [-85, -180],
          [85, 180],
        ],
      });

      newLayer.addTo(map);
      tileLayerRef.current = newLayer;
    } catch (err) {
      console.error("Failed to switch basemap:", err);
    }
  }, [basemap]);

  // Render & Update Station Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersLayerRef.current;
    if (!map || !group) return;

    group.clearLayers();

    zones.forEach((zone) => {
      const isFocused = activeZoneId === zone.id;
      const isCritical = zone.tier === "CRITICAL";
      const isWatch = zone.tier === "WATCH";

      const color = isCritical ? "#ef4444" : isWatch ? "#f59e0b" : "#10b981";
      const glowColor = isCritical ? "rgba(239, 68, 68, 0.5)" : isWatch ? "rgba(245, 158, 11, 0.4)" : "rgba(16, 185, 129, 0.35)";

      // Technical sharp aerospace square station marker (0px border-radius)
      const html = `
        <div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; cursor: pointer;">
          ${isFocused ? `<div style="position: absolute; width: 22px; height: 22px; border-radius: 0; border: 1.5px solid ${color}; opacity: 0.85;"></div>` : ""}
          <div style="
            width: ${isFocused ? "13px" : "11px"};
            height: ${isFocused ? "13px" : "11px"};
            border-radius: 0;
            background: ${color};
            border: 2px solid #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.85), 0 0 8px ${glowColor};
            transition: transform 0.15s ease;
          "></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html,
        className: "landsora-dot-marker",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14],
      });

      const marker = L.marker([zone.lat, zone.lng], { icon: customIcon });

      // Clean Technical HUD Hover Tooltip (0px border-radius)
      const tooltipContent = `
        <div style="background: rgba(16, 23, 25, 0.98); backdrop-filter: blur(8px); border: 1px solid ${color}; color: #f3f4f6; padding: 7px 11px; border-radius: 0; font-family: system-ui, -apple-system, sans-serif; font-size: 11px; box-shadow: 0 8px 24px rgba(0,0,0,0.75); min-width: 185px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 3px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 13px;">${zone.countryFlag || "📍"}</span>
              <strong style="color: #ffffff; font-size: 11.5px; font-weight: 700;">${zone.name}</strong>
            </div>
            <span style="background: ${color}25; color: ${color}; border: 1px solid ${color}80; font-size: 9px; font-weight: 800; font-family: monospace; padding: 1px 5px; border-radius: 0;">
              ${zone.tier} ${zone.riskScore}%
            </span>
          </div>
          <div style="color: #9ca3af; font-size: 9.5px; font-family: monospace; margin-bottom: 5px;">
            ${zone.id} &bull; ${zone.region} &bull; ${zone.elevation}
          </div>
          <div style="display: flex; gap: 8px; font-size: 9.5px; font-family: monospace; border-top: 1px solid rgba(255,255,255,0.12); padding-top: 4px;">
            <span>Rain: <b style="color: #60a5fa;">${zone.rainfall}mm</b></span>
            <span>Soil: <b style="color: #f59e0b;">${zone.soil}%</b></span>
            <span>Tilt: <b style="color: #c084fc;">${zone.tilt}&deg;</b></span>
          </div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: "top",
        offset: [0, -10],
        opacity: 1,
        className: "landsora-leaflet-tooltip",
      });

      marker.on("click", () => {
        if (onSelectZone) onSelectZone(zone.id);
      });

      group.addLayer(marker);
    });
  }, [zones, activeZoneId, showHalos, onSelectZone]);

  // Fly to focused zone
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeZoneId) return;

    const target = zones.find((z) => z.id === activeZoneId);
    if (target) {
      map.flyTo([target.lat, target.lng], 11, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [activeZoneId, zones]);

  // Render NASA EONET Incidents (High-Performance Canvas Multi-Hazard Connected Layer)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = nasaLayerRef.current;
    if (!map || !group) return;

    group.clearLayers();
    if (!showNasa) return;

    // Use High-Performance Leaflet Canvas Renderer for smooth 60fps with 7,000+ markers
    const canvasRenderer = L.canvas({ padding: 0.5 });

    const filteredEvents = selectedHazardCategory === "ALL"
      ? nasaEvents
      : nasaEvents.filter((ev) => ev.category === selectedHazardCategory || (selectedHazardCategory === "snow" && ev.category === "seaLakeIce"));

    // Render non-wildfire events (storms, volcanoes, landslides, floods, earthquakes) ON TOP of wildfires
    const sortedForDisplay = [...filteredEvents].sort((a, b) => {
      const aW = a.category === "wildfires" ? 0 : 1;
      const bW = b.category === "wildfires" ? 0 : 1;
      return aW - bW;
    });

    sortedForDisplay.forEach((ev) => {
      const isWildfire = ev.category === "wildfires";
      const isStorm = ev.category === "severeStorms";
      const isVolcano = ev.category === "volcanoes";
      const isLandslide = ev.category === "landslides";
      const isFlood = ev.category === "floods";
      const isEarthquake = ev.category === "earthquakes";

      const style = HAZARD_STYLES[ev.category || ""] || {
        label: ev.categoryTitle || ev.category || "Natural Hazard",
        icon: "🛰️",
        color: "#f59e0b",
        border: "#fef08a",
      };

      // Sophisticated visual hierarchy:
      // Wildfires are subtle 3.5px thermal dots; storms, volcanoes, landslides & floods are bold, high-visibility beacons
      const radius = isWildfire ? 3.5 : isLandslide ? 9 : isStorm ? 8.5 : isVolcano ? 8 : (isFlood || isEarthquake) ? 8 : 6.5;
      const weight = isWildfire ? 0.5 : 2;
      const opacity = isWildfire ? 0.75 : 1;
      const fillOpacity = isWildfire ? 0.6 : 0.92;

      const circle = L.circleMarker([ev.latitude, ev.longitude], {
        renderer: canvasRenderer,
        radius,
        fillColor: style.color,
        color: style.border,
        weight,
        opacity,
        fillOpacity,
      });

      circle.bindPopup(`
        <div style="background: #0b0f12; color: #f3f4f6; padding: 12px; font-size: 11px; font-family: 'JetBrains Mono', monospace; border: 1px solid ${style.color}; border-radius: 0; min-width: 240px; box-shadow: 0 8px 30px rgba(0,0,0,0.85);">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 4px;">
            <strong style="color: ${style.color}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 4px;">
              <span>${style.icon}</span> <span>${style.label}</span>
            </strong>
            <span style="color: #34d399; font-size: 8.5px; border: 1px solid rgba(52,211,153,0.4); background: rgba(52,211,153,0.1); padding: 1px 5px; text-transform: uppercase; font-weight: bold; border-radius: 0; display: inline-flex; align-items: center; gap: 3px;">
              <span style="display: inline-block; width: 5px; height: 5px; background: #34d399; border-radius: 0;"></span>
              ACTIVE (LIVE)
            </span>
          </div>
          <div style="font-weight: bold; margin-bottom: 6px; font-size: 12px; line-height: 1.35; color: #ffffff;">${ev.title}</div>
          <div style="color: #9ca3af; font-size: 10px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
            <span>LATEST TRACK: <b style="color: #f3f4f6;">${ev.date.slice(0, 10)}</b></span>
            <span style="color: #60a5fa;">SOURCE: ${(ev.source || "NASA EONET").slice(0, 14)}</span>
          </div>
          <div style="color: #cbd5e1; font-size: 9.5px; background: rgba(255,255,255,0.04); padding: 5px 7px; border-left: 2px solid ${style.color}; margin-bottom: 6px;">
            COORDINATES: ${ev.latitude.toFixed(4)}&deg;N, ${ev.longitude.toFixed(4)}&deg;E
          </div>
          <div style="text-align: right;">
            <a href="https://eonet.gsfc.nasa.gov" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: none; font-size: 9px; font-weight: bold;">VIEW ON NASA EONET &rarr;</a>
          </div>
        </div>
      `, {
        className: "landsora-leaflet-popup",
      });

      group.addLayer(circle);
    });
  }, [nasaEvents, showNasa, selectedHazardCategory]);

  // Auto-focus on selected hazard category bounds
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || selectedHazardCategory === "ALL" || !showNasa) return;

    const filtered = nasaEvents.filter(
      (e) => e.category === selectedHazardCategory || (selectedHazardCategory === "snow" && e.category === "seaLakeIce")
    );
    if (filtered.length > 0) {
      const bounds = L.latLngBounds(filtered.map((e) => [e.latitude, e.longitude] as [number, number]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
      }
    }
  }, [selectedHazardCategory, showNasa, nasaEvents]);

  // Render Analysis Pin
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pinMarkerRef.current) {
      map.removeLayer(pinMarkerRef.current);
      pinMarkerRef.current = null;
    }

    if (analysisPin) {
      const pinHtml = `
        <div style="display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: rgba(8, 51, 68, 0.94);
            backdrop-filter: blur(8px);
            border: 1.5px solid #38bdf8;
            color: #ffffff;
            padding: 2px 7px;
            border-radius: 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6), 0 0 8px rgba(56, 189, 248, 0.4);
            font-family: var(--font-mono, monospace);
            font-size: 10.5px;
            font-weight: 700;
            white-space: nowrap;
          ">
            <span style="width: 6px; height: 6px; border-radius: 0; background: #38bdf8; box-shadow: 0 0 5px #38bdf8;"></span>
            <span>PIN ${analysisPin.risk}%</span>
          </div>
        </div>
      `;

      const pinIcon = L.divIcon({
        html: pinHtml,
        className: "analysis-crosshair-icon",
        iconSize: [60, 20],
        iconAnchor: [30, 10],
      });

      const marker = L.marker([analysisPin.lat, analysisPin.lng], { icon: pinIcon }).addTo(map);
      marker.bindPopup(`
        <div style="background: #141c1e; color: #f3f4f6; padding: 10px; font-size: 11px; font-family: monospace; border: 1px solid #38bdf8; border-radius: 0;">
          <strong style="color: #38bdf8; font-size: 12px; display: block; margin-bottom: 2px;">📍 ANALYSIS POINT</strong>
          <div style="color: #9ca3af; font-family: monospace; font-size: 10px; margin-bottom: 4px;">
            ${analysisPin.lat}&deg;N, ${analysisPin.lng}&deg;E
          </div>
          <div style="background: #0f1416; padding: 4px 8px; border-radius: 0; font-family: monospace; color: #f59e0b; font-weight: bold;">
            ESTIMATED RISK: ${analysisPin.risk}%
          </div>
        </div>
      `).openPopup();

      pinMarkerRef.current = marker;
    }
  }, [analysisPin]);

  // Render Landslide Susceptibility Heatmap Canvas Layer
  useEffect(() => {
    const group = heatmapLayerRef.current;
    if (!group) return;
    group.clearLayers();
    if (!showHeatmap) return;

    zones.forEach((z) => {
      const isCritical = z.tier === "CRITICAL";
      const isWatch = z.tier === "WATCH";
      const color = isCritical ? "#ef4444" : isWatch ? "#f59e0b" : "#10b981";
      const radius = (z.riskScore / 100) * 8000 + 3000;

      const outerGlow = L.circle([z.lat, z.lng], {
        radius,
        color: "transparent",
        fillColor: color,
        fillOpacity: isCritical ? 0.16 : isWatch ? 0.10 : 0.05,
        weight: 0,
      });
      group.addLayer(outerGlow);

      const coreGlow = L.circle([z.lat, z.lng], {
        radius: radius * 0.45,
        color: color,
        weight: 1,
        opacity: 0.25,
        fillColor: color,
        fillOpacity: isCritical ? 0.25 : 0.12,
      });
      group.addLayer(coreGlow);
    });
  }, [zones, showHeatmap]);

  // Render Evacuation Shelters & Safe Corridors Layer
  useEffect(() => {
    const group = evacuationLayerRef.current;
    if (!group) return;
    group.clearLayers();
    if (!showEvacuation) return;

    const EVACUATION_SHELTERS = [
      { id: "SHELTER-KDG", name: "Coorg Valley High Ground Shelter", lat: 12.48, lng: 75.82, type: "PRIMARY RELIEF CAMP", capacity: "1,200 Persons" },
      { id: "SHELTER-WYD", name: "Wayanad Disaster Relief Center", lat: 11.68, lng: 76.18, type: "MEDICAL & EVACUATION HUB", capacity: "2,500 Persons" },
      { id: "SHELTER-IDK", name: "Idukki Ridge Safe Pavilion", lat: 9.92, lng: 77.02, type: "HELIPAD & EMERGENCY REFUGE", capacity: "800 Persons" },
      { id: "SHELTER-NIL", name: "Nilgiris High Plateau Cantonment", lat: 11.42, lng: 76.78, type: "COMMUNITY SHELTER", capacity: "1,500 Persons" },
    ];

    EVACUATION_SHELTERS.forEach((shelter) => {
      const iconHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
          <div style="width: 26px; height: 26px; border-radius: 0; background: #064e3b; border: 2px solid #34d399; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(52, 211, 153, 0.6); font-size: 13px;">
            🛡️
          </div>
        </div>
      `;
      const icon = L.divIcon({ html: iconHtml, className: "evac-shelter-icon", iconSize: [32, 32], iconAnchor: [16, 16] });
      const marker = L.marker([shelter.lat, shelter.lng], { icon });
      marker.bindPopup(`
        <div style="background: #0f172a; color: #f8fafc; padding: 10px; font-size: 11px; border: 1px solid #10b981; border-radius: 0; min-width: 200px;">
          <strong style="color: #34d399; font-size: 12px; display: block; margin-bottom: 2px;">🛡️ ${shelter.name}</strong>
          <div style="color: #94a3b8; font-family: monospace; font-size: 10px;">${shelter.type}</div>
          <div style="color: #cbd5e1; font-size: 10px; margin-top: 4px;">CAPACITY: <b style="color: #6ee7b7;">${shelter.capacity}</b></div>
        </div>
      `);
      group.addLayer(marker);
    });

    // Safe evacuation corridors (Polyline dashed paths from high risk nodes to nearest shelters)
    const corridors = [
      [[12.3375, 75.8069], [12.48, 75.82]],
      [[11.55, 76.13], [11.68, 76.18]],
      [[9.85, 76.95], [9.92, 77.02]],
    ];
    corridors.forEach((path) => {
      const line = L.polyline(path as L.LatLngExpression[], {
        color: "#34d399",
        weight: 3,
        dashArray: "6, 8",
        opacity: 0.85,
      });
      group.addLayer(line);
    });
  }, [showEvacuation]);

  // Controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetOverview = () => {
    if (!mapInstanceRef.current) return;
    const currentMin = mapInstanceRef.current.getMinZoom() || 3;
    mapInstanceRef.current.setView([20.0, 15.0], currentMin, { animate: true });
  };

  const handleFlyToContinent = (center: [number, number], zoom: number) => {
    if (!mapInstanceRef.current) return;
    const minZ = mapInstanceRef.current.getMinZoom() || 3;
    mapInstanceRef.current.flyTo(center, Math.max(zoom, minZ), { duration: 1.2 });
  };

  const toggleFullscreen = () => {
    const isCurrentlyFs = Boolean(document.fullscreenElement);
    if (!isCurrentlyFs) {
      if (wrapperRef.current?.requestFullscreen) {
        wrapperRef.current.requestFullscreen().catch(() => {
          setIsFullscreen((prev) => !prev);
        });
      } else {
        setIsFullscreen((prev) => !prev);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 100);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 350);
  };

  const activeZone = zones.find((z) => z.id === activeZoneId) || zones[0];

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden bg-[#101719] rounded-none transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-[99999] w-screen h-screen rounded-none"
          : className || "w-full h-full"
      }`}
    >
      {/* 1. REAL LEAFLET MAP CANVAS */}
      <div ref={mapContainerRef} className="w-full h-full z-0" style={{ background: "#101719" }} />

      {/* 2. ZOOM EARTH FLOATING RIGHT-HAND MAP CONTROLS */}
      <div
        className={`absolute top-3 z-[900] flex flex-col items-end gap-2 pointer-events-none transition-all duration-300 ${
          rightPanelOpen ? "right-[340px] sm:right-[360px]" : "right-3"
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Basemap Switcher Dropdown */}
          <div className="relative pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                setBasemapMenuOpen((v) => !v);
                setLayersMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-[#0c1015]/90 hover:bg-[#162028] backdrop-blur-xl border border-white/10 hover:border-amber-500/50 text-stone-200 hover:text-white text-xs font-mono font-bold shadow-2xl transition-all"
              title="Select Base Map Layer"
            >
              <Layers size={13} className="text-amber-400" />
              <span>{basemap === "SATELLITE" ? "🛰️ SATELLITE" : basemap === "TOPOGRAPHY" ? "⛰️ TOPO" : basemap === "DARK_GIS" ? "🌑 DARK" : "🗺️ STREET"}</span>
              <ChevronDown size={12} className="text-stone-400" />
            </button>

            {basemapMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-40 bg-[#0c1015]/98 backdrop-blur-2xl border border-white/15 shadow-2xl flex flex-col py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                {(["SATELLITE", "TOPOGRAPHY", "DARK_GIS", "STREET"] as BasemapType[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setBasemap(mode);
                      setBasemapMenuOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-mono text-left transition-colors ${
                      basemap === mode
                        ? "bg-amber-500/20 text-amber-300 font-bold border-l-2 border-amber-400"
                        : "text-stone-300 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <span>{mode === "SATELLITE" ? "🛰️ Satellite" : mode === "TOPOGRAPHY" ? "⛰️ Topography" : mode === "DARK_GIS" ? "🌑 Dark GIS" : "🗺️ Street Map"}</span>
                    {basemap === mode && <Check size={12} className="text-amber-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hazard Layers Popover */}
          <div className="relative pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                setLayersMenuOpen((v) => !v);
                setBasemapMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-[#0c1015]/90 hover:bg-[#162028] backdrop-blur-xl border border-white/10 hover:border-amber-500/50 text-stone-200 hover:text-white text-xs font-mono font-bold shadow-2xl transition-all"
              title="Toggle Hazard Layers & NASA Feed"
            >
              <Radio size={13} className={showNasa ? "text-amber-400 animate-pulse" : "text-stone-400"} />
              <span>LAYERS {showNasa ? `(${selectedHazardCategory === "ALL" ? nasaEvents.length.toLocaleString() : (selectedHazardCategory === "snow" ? nasaEvents.filter(e => e.category === "snow" || e.category === "seaLakeIce").length : nasaEvents.filter(e => e.category === selectedHazardCategory).length).toLocaleString()})` : ""}</span>
              <ChevronDown size={12} className="text-stone-400" />
            </button>

            {layersMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-72 bg-[#0c1015]/98 backdrop-blur-2xl border border-white/15 p-3.5 shadow-2xl space-y-3 z-50 text-xs font-mono animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-amber-400 font-bold tracking-wider uppercase text-[10px]">HAZARD OVERLAYS</span>
                  <button type="button" onClick={() => setLayersMenuOpen(false)} className="text-stone-400 hover:text-white p-0.5">
                    <X size={13} />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center justify-between cursor-pointer p-1.5 hover:bg-white/[0.04] transition-colors">
                    <span className="flex items-center gap-2 text-stone-200">
                      <span>🔥</span>
                      <span>Landslide Susceptibility</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={showHeatmap}
                      onChange={(e) => setShowHeatmap(e.target.checked)}
                      className="accent-amber-500 rounded-none w-3.5 h-3.5"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-1.5 hover:bg-white/[0.04] transition-colors">
                    <span className="flex items-center gap-2 text-stone-200">
                      <span>🛡️</span>
                      <span>Evacuation Corridors</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={showEvacuation}
                      onChange={(e) => setShowEvacuation(e.target.checked)}
                      className="accent-emerald-500 rounded-none w-3.5 h-3.5"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-1.5 hover:bg-white/[0.04] transition-colors">
                    <span className="flex items-center gap-2 text-stone-200">
                      <span>📐</span>
                      <span>Slip Surface Profile</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={showProfileDrawer}
                      onChange={(e) => setShowProfileDrawer(e.target.checked)}
                      className="accent-cyan-500 rounded-none w-3.5 h-3.5"
                    />
                  </label>

                  <div className="border-t border-white/10 pt-2">
                    <label className="flex items-center justify-between cursor-pointer p-1.5 hover:bg-white/[0.04] transition-colors mb-1.5">
                      <span className="flex items-center gap-2 text-stone-200 font-bold">
                        <Radio size={12} className={showNasa ? "text-amber-400 animate-pulse" : "text-stone-500"} />
                        <span>NASA Live Hazards</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={showNasa}
                        onChange={(e) => setShowNasa(e.target.checked)}
                        className="accent-amber-500 rounded-none w-3.5 h-3.5"
                      />
                    </label>

                    {showNasa && (
                      <select
                        value={selectedHazardCategory}
                        onChange={(e) => setSelectedHazardCategory(e.target.value)}
                        className="w-full bg-[#162028] text-[10.5px] font-mono font-bold text-amber-300 border border-amber-500/40 p-1.5 rounded-none outline-none cursor-pointer mt-1"
                        aria-label="Filter NASA hazard category"
                      >
                        <option value="ALL" className="bg-[#11171D] text-stone-200">🌐 ALL LIVE EVENTS ({nasaEvents.length.toLocaleString()})</option>
                        {nasaEvents.filter(e => e.category === "severeStorms").length > 0 && (
                          <option value="severeStorms" className="bg-[#11171D] text-cyan-300">🌀 SEVERE STORMS ({nasaEvents.filter(e => e.category === "severeStorms").length})</option>
                        )}
                        {nasaEvents.filter(e => e.category === "volcanoes").length > 0 && (
                          <option value="volcanoes" className="bg-[#11171D] text-red-300">🌋 VOLCANOES ({nasaEvents.filter(e => e.category === "volcanoes").length})</option>
                        )}
                        {nasaEvents.filter(e => e.category === "landslides").length > 0 && (
                          <option value="landslides" className="bg-[#11171D] text-amber-300">⛰️ LANDSLIDES ({nasaEvents.filter(e => e.category === "landslides").length})</option>
                        )}
                        {nasaEvents.filter(e => e.category === "floods").length > 0 && (
                          <option value="floods" className="bg-[#11171D] text-blue-300">🌊 FLOODS ({nasaEvents.filter(e => e.category === "floods").length})</option>
                        )}
                        {nasaEvents.filter(e => e.category === "earthquakes").length > 0 && (
                          <option value="earthquakes" className="bg-[#11171D] text-yellow-300">⚡ EARTHQUAKES ({nasaEvents.filter(e => e.category === "earthquakes").length})</option>
                        )}
                        {nasaEvents.filter(e => e.category === "seaLakeIce" || e.category === "snow").length > 0 && (
                          <option value="snow" className="bg-[#11171D] text-sky-300">❄️ SEA ICE & SNOW ({nasaEvents.filter(e => e.category === "seaLakeIce" || e.category === "snow").length})</option>
                        )}
                        {nasaEvents.filter(e => e.category === "wildfires").length > 0 && (
                          <option value="wildfires" className="bg-[#11171D] text-orange-300">🔥 WILDFIRES ({nasaEvents.filter(e => e.category === "wildfires").length.toLocaleString()})</option>
                        )}
                        {nasaEvents.filter(e => e.category === "drought").length > 0 && (
                          <option value="drought" className="bg-[#11171D] text-amber-200">☀️ DROUGHT ({nasaEvents.filter(e => e.category === "drought").length})</option>
                        )}
                        {nasaEvents.filter(e => e.category === "dustHaze").length > 0 && (
                          <option value="dustHaze" className="bg-[#11171D] text-stone-300">💨 DUST & HAZE ({nasaEvents.filter(e => e.category === "dustHaze").length})</option>
                        )}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vertical Zoom & Overview Stack (Zoom Earth Style) */}
        <div className="pointer-events-auto flex flex-col bg-[#0c1015]/90 backdrop-blur-xl border border-white/10 shadow-2xl divide-y divide-white/10">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 hover:bg-white/[0.08] text-stone-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 hover:bg-white/[0.08] text-stone-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={handleResetOverview}
            className="p-2 hover:bg-white/[0.08] text-stone-300 hover:text-white transition-colors"
            title="Reset World Overview"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/[0.08] text-stone-300 hover:text-white transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* TOPOGRAPHIC CROSS-SECTION DRAWER (WHEN PROFILE ACTIVE) */}
      {showProfileDrawer && activeZone && (
        <div className="absolute top-14 left-3 right-3 z-[1000] p-3.5 rounded-none bg-stone-950/95 backdrop-blur-md border border-cyan-500/40 shadow-2xl space-y-2 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-cyan-300 font-bold flex items-center gap-1.5">
              <span>📐</span> {activeZone.name} — TOPOGRAPHIC CROSS-SECTION & SLIP SURFACE
            </span>
            <div className="flex items-center gap-3">
              <span className="text-stone-400">ELEVATION: <b className="text-stone-200">{activeZone.elevation}</b></span>
              <span className="text-stone-400">GEOLOGY: <b className="text-amber-300">{activeZone.geology}</b></span>
              <button
                type="button"
                onClick={() => setShowProfileDrawer(false)}
                className="text-stone-400 hover:text-white p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="relative h-20 w-full bg-stone-900/90 rounded-none overflow-hidden border border-stone-800 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 500 80" preserveAspectRatio="none">
              <polygon points="0,80 500,80 500,50 350,30 200,20 0,60" fill="#1e292d" />
              <polygon points="0,60 200,20 350,30 500,50 500,42 350,22 200,12 0,52" fill={activeZone.riskScore > 75 ? "#7f1d1d" : activeZone.riskScore > 45 ? "#78350f" : "#064e3b"} />
              <line x1="0" y1="52" x2="500" y2="42" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,4" />
            </svg>
            <div className="absolute top-2 left-3 text-[10px] font-mono text-cyan-300">
              Active Slip Surface (Depth: ~3.8m &middot; Inclinometer Tilt: {activeZone.tilt}&deg;/hr)
            </div>
            <div className="absolute bottom-2 right-3 text-[10px] font-mono text-stone-300">
              Risk Surface: <b className={activeZone.riskScore > 75 ? "text-red-400" : activeZone.riskScore > 45 ? "text-amber-400" : "text-emerald-400"}>{activeZone.riskScore}/100 ({activeZone.tier})</b>
            </div>
          </div>
        </div>
      )}

      {/* 3. BOTTOM HUD COORDINATES & STATUS BAR */}
      <div
        className={`absolute bottom-2.5 left-3 right-3 z-[900] flex flex-wrap items-center justify-between gap-2 pointer-events-none transition-opacity duration-200 ${
          bottomDrawerOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Left Telemetry HUD */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-none bg-stone-900/90 backdrop-blur-md border border-stone-800 text-[10px] font-mono text-stone-300 pointer-events-auto">
          <Navigation size={11} className="text-amber-400 animate-spin-slow" />
          <span>
            LAT: <b>{mouseCoords.lat}&deg;N</b> &middot; LNG: <b>{mouseCoords.lng}&deg;E</b>
          </span>
          <span className="text-stone-500">|</span>
          <span className="text-stone-400">ZOOM: {mouseCoords.zoom}x</span>
        </div>

        {/* Right Active Stations Legend */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-none bg-stone-900/90 backdrop-blur-md border border-stone-800 text-[10px] font-mono pointer-events-auto">
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-none bg-emerald-400" /> STABLE
          </span>
          <span className="text-amber-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-none bg-amber-400" /> WATCH
          </span>
          <span className="text-red-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-none bg-red-400 animate-pulse" /> CRITICAL
          </span>
          {analysisPin && (
            <button
              type="button"
              onClick={() => setAnalysisPin(null)}
              className="text-[9px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-1.5 py-0.5 rounded-none flex items-center gap-1 hover:bg-cyan-900/60"
            >
              <span>PIN {analysisPin.risk}%</span>
              <X size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
