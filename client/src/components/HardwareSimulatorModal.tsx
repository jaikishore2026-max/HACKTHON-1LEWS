import React, { useState } from "react";
import { X, Cpu, Send, CheckCircle2, AlertTriangle, Radio, Terminal, Copy, Check } from "lucide-react";
import axios from "axios";
import { GLOBAL_GEOTECHNICAL_STATIONS } from "@shared/stations";

interface HardwareSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  onTelemetryInjected?: (data: any) => void;
}

export function HardwareSimulatorModal({
  isOpen,
  onClose,
  nodeId,
  onTelemetryInjected,
}: HardwareSimulatorModalProps) {
  const [selectedNode, setSelectedNode] = useState(nodeId || "KDG-03");
  const [rainfallMm, setRainfallMm] = useState(112.4);
  const [soilMoisture, setSoilMoisture] = useState(78.2);
  const [tiltDegrees, setTiltDegrees] = useState(3.45);
  const [batteryVoltage, setBatteryVoltage] = useState(4.08);
  const [wifiRssi, setWifiRssi] = useState(-68);
  const [temperatureC, setTemperatureC] = useState(22.8);
  const [humidity, setHumidity] = useState(84.0);

  const [isTransmitting, setIsTransmitting] = useState(false);
  const [responseLog, setResponseLog] = useState<{ status: number; body: any; timestamp: string } | null>(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const payload = {
    nodeId: selectedNode,
    rainfallMm: Number(rainfallMm.toFixed(1)),
    soilMoisture: Number(soilMoisture.toFixed(1)),
    tiltDegrees: Number(tiltDegrees.toFixed(3)),
    batteryVoltage: Number(batteryVoltage.toFixed(2)),
    wifiRssiDbm: wifiRssi,
    temperatureC: Number(temperatureC.toFixed(1)),
    humidity: Number(humidity.toFixed(1)),
    timestamp: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(payload, null, 2);

  const handleTransmit = async () => {
    setIsTransmitting(true);
    setResponseLog(null);
    try {
      const res = await axios.post("/api/telemetry/ingest", payload);
      setResponseLog({
        status: res.status,
        body: res.data,
        timestamp: new Date().toLocaleTimeString(),
      });
      if (onTelemetryInjected) {
        onTelemetryInjected(res.data);
      }
    } catch (err: any) {
      setResponseLog({
        status: err.response?.status || 500,
        body: err.response?.data || { error: err.message },
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsTransmitting(false);
    }
  };

  const copyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ESP32 Hardware Ingestion and Packet Simulator"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-stone-950 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-gradient-to-r from-stone-900 to-amber-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Cpu size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-stone-100 uppercase">
                ESP32 Hardware Ingestion & Packet Simulator
              </h2>
              <p className="text-[11px] text-stone-400 font-mono">
                Live REST Ingest · POST /api/telemetry/ingest
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-stone-400">TARGET NODE ID</label>
              <select
                value={selectedNode}
                onChange={(e) => setSelectedNode(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              >
                {GLOBAL_GEOTECHNICAL_STATIONS.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.countryFlag} {st.id} — {st.name} ({st.country})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-stone-400">
                <span>RAINFALL</span>
                <span className="text-amber-400 font-bold">{rainfallMm} mm/hr</span>
              </div>
              <input
                type="range"
                min="0"
                max="250"
                step="0.5"
                value={rainfallMm}
                onChange={(e) => setRainfallMm(Number(e.target.value))}
                className="w-full mt-2 accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-stone-400">
                <span>SOIL MOISTURE</span>
                <span className="text-cyan-400 font-bold">{soilMoisture}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="0.5"
                value={soilMoisture}
                onChange={(e) => setSoilMoisture(Number(e.target.value))}
                className="w-full mt-2 accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-stone-400">
                <span>SLOPE TILT</span>
                <span className="text-orange-400 font-bold">{tiltDegrees}°/hr</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="15.0"
                step="0.05"
                value={tiltDegrees}
                onChange={(e) => setTiltDegrees(Number(e.target.value))}
                className="w-full mt-2 accent-orange-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Code Preview Terminal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-stone-400">
              <span className="flex items-center gap-1.5">
                <Terminal size={13} className="text-amber-400" />
                OUTGOING TELEMETRY PACKET (JSON)
              </span>
              <button
                type="button"
                onClick={copyJson}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy Payload"}
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-stone-900/90 border border-stone-800 text-[11px] font-mono text-stone-300 overflow-x-auto">
              {jsonString}
            </pre>
          </div>

          {/* Response Box if transmitted */}
          {responseLog && (
            <div
              className="p-3 rounded-lg border space-y-1"
              style={{
                borderColor: responseLog.status === 200 ? "#6FA37760" : "#C24B3F60",
                background: responseLog.status === 200 ? "rgba(111,163,119,0.1)" : "rgba(194,75,63,0.1)",
              }}
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold" style={{ color: responseLog.status === 200 ? "#6FA377" : "#C24B3F" }}>
                  HTTP {responseLog.status} {responseLog.status === 200 ? "TELEMETRY INGESTED" : "INGESTION FAILED"}
                </span>
                <span className="text-stone-400">{responseLog.timestamp}</span>
              </div>
              <pre className="text-[11px] font-mono text-stone-300 overflow-x-auto">
                {JSON.stringify(responseLog.body, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-900/50 flex items-center justify-between">
          <span className="text-[11px] text-stone-400 font-mono">Ready to inject live hardware telemetry</span>
          <button
            type="button"
            onClick={handleTransmit}
            disabled={isTransmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors shadow-md disabled:opacity-50"
          >
            <Send size={13} />
            <span>{isTransmitting ? "TRANSMITTING..." : "TRANSMIT PACKET"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
