import React, { useState } from "react";
import { X, Activity, ShieldAlert, ShieldCheck, HelpCircle, Layers, Sliders, Play, RotateCcw } from "lucide-react";

interface SlopeStabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneName: string;
  initialSoilMoisture?: number;
  initialTilt?: number;
}

export function SlopeStabilityModal({
  isOpen,
  onClose,
  zoneName,
  initialSoilMoisture = 75,
  initialTilt = 32,
}: SlopeStabilityModalProps) {
  // Geotechnical Soil Mechanics Parameters (Mohr-Coulomb & Infinite Slope Model)
  const [cohesion, setCohesion] = useState(15.0); // c' (kPa) Effective Cohesion
  const [frictionAngle, setFrictionAngle] = useState(28.0); // phi' (degrees) Internal Friction Angle
  const [slopeAngle, setSlopeAngle] = useState(Math.max(15, Math.min(60, initialTilt || 32))); // beta (degrees)
  const [soilDepth, setSoilDepth] = useState(3.5); // z (meters) Depth to Slip Surface
  const [unitWeight, setUnitWeight] = useState(18.5); // gamma (kN/m^3) Soil Unit Weight
  const [porePressureRatio, setPorePressureRatio] = useState(Number((initialSoilMoisture / 100 * 0.55).toFixed(2))); // r_u (0.0 to 0.6)

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Mohr-Coulomb Infinite Slope Factor of Safety Calculation:
  // FoS = [c' + (gamma * z * cos^2(beta) * (1 - r_u * sec^2(beta))) * tan(phi')] / [gamma * z * sin(beta) * cos(beta)]
  const betaRad = (slopeAngle * Math.PI) / 180;
  const phiRad = (frictionAngle * Math.PI) / 180;
  const cosBeta = Math.cos(betaRad);
  const sinBeta = Math.sin(betaRad);
  const tanPhi = Math.tan(phiRad);

  const normalStress = unitWeight * soilDepth * Math.pow(cosBeta, 2);
  const porePressure = porePressureRatio * unitWeight * soilDepth;
  const effectiveNormalStress = Math.max(0, normalStress - porePressure);

  const resistingForce = cohesion + effectiveNormalStress * tanPhi;
  const drivingForce = Math.max(0.1, unitWeight * soilDepth * sinBeta * cosBeta);

  const factorOfSafety = Number((resistingForce / drivingForce).toFixed(3));

  const stabilityStatus =
    factorOfSafety < 1.0
      ? { label: "IMMINENT SLOPE FAILURE", color: "#C24B3F", desc: "Driving shear stresses exceed shear strength. Catastrophic mass movement expected." }
      : factorOfSafety < 1.3
      ? { label: "CRITICAL WATCH / UNSTABLE", color: "#D6A24E", desc: "Marginal stability margin. Rainfall saturation will trigger slip plane shear." }
      : { label: "GEOTECHNICALLY STABLE", color: "#6FA377", desc: "Resisting shear strength provides adequate safety factor against gravity loads." };

  const handleReset = () => {
    setCohesion(15.0);
    setFrictionAngle(28.0);
    setSlopeAngle(32.0);
    setSoilDepth(3.5);
    setUnitWeight(18.5);
    setPorePressureRatio(0.35);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Mohr-Coulomb Factor of Safety Slope Simulator for ${zoneName}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-stone-950 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-gradient-to-r from-stone-900 to-amber-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Activity size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-stone-100 uppercase">
                Mohr-Coulomb Factor of Safety (FoS) Slope Simulator
              </h2>
              <p className="text-[11px] text-stone-400 font-mono">
                Infinite Slope Shear Mechanics & Pore Pressure Model · {zoneName}
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
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Score Banner */}
          <div
            className="p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{
              borderColor: `${stabilityStatus.color}60`,
              background: `linear-gradient(90deg, ${stabilityStatus.color}15, rgba(18,24,26,0.9))`,
            }}
          >
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-mono font-bold tracking-wider" style={{ color: stabilityStatus.color }}>
                  {stabilityStatus.label}
                </span>
              </div>
              <p className="text-xs text-stone-300 max-w-md">{stabilityStatus.desc}</p>
            </div>
            <div className="text-center sm:text-right shrink-0">
              <div className="text-3xl font-mono font-extrabold tracking-tight" style={{ color: stabilityStatus.color }}>
                {factorOfSafety} <span className="text-xs text-stone-400 font-normal">FoS</span>
              </div>
              <div className="text-[10px] text-stone-400 font-mono">
                {factorOfSafety < 1.0 ? "FoS < 1.0 (Failure)" : factorOfSafety < 1.3 ? "1.0 ≤ FoS < 1.3 (Critical)" : "FoS ≥ 1.3 (Safe)"}
              </div>
            </div>
          </div>

          {/* Interactive Geotechnical Cross-Section Diagram */}
          <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-stone-400">
              <span>SLOPE CROSS-SECTION (SLIP PLANE SHEAR)</span>
              <span>DEPTH: {soilDepth}m · TILT: {slopeAngle}°</span>
            </div>
            <div className="relative h-28 w-full bg-stone-950 rounded-lg overflow-hidden border border-stone-800/80 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                {/* Bedrock */}
                <polygon points="0,120 400,120 400,80 0,110" fill="#1e292d" />
                {/* Colluvium Soil Layer */}
                <polygon
                  points={`0,110 400,80 400,${Math.max(10, 80 - slopeAngle * 1.1)} 0,${Math.max(30, 110 - slopeAngle * 0.9)}`}
                  fill={porePressureRatio > 0.4 ? "#3d3224" : "#2f3e37"}
                />
                {/* Slip Plane Dashed Line */}
                <line x1="0" y1="110" x2="400" y2="80" stroke={stabilityStatus.color} strokeWidth="2.5" strokeDasharray="5,3" />
                {/* Groundwater level */}
                <line
                  x1="0"
                  y1={110 - porePressureRatio * 40}
                  x2="400"
                  y2={80 - porePressureRatio * 40}
                  stroke="#6AD6C4"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                />
              </svg>
              <div className="absolute top-2 left-3 text-[10px] font-mono text-stone-400">
                Groundwater Table (<span className="text-[#6AD6C4]">u = {porePressure.toFixed(1)} kPa</span>)
              </div>
              <div className="absolute bottom-2 right-3 text-[10px] font-mono" style={{ color: stabilityStatus.color }}>
                Shear Plane τ = {resistingForce.toFixed(1)} / {drivingForce.toFixed(1)} kPa
              </div>
            </div>
          </div>

          {/* Parameter Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Slope Angle beta */}
            <div className="space-y-1 p-3 rounded-lg bg-stone-900/60 border border-stone-800">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-stone-300">Slope Gradient (β):</span>
                <span className="text-amber-400 font-bold">{slopeAngle}°</span>
              </div>
              <input
                type="range"
                min="15"
                max="60"
                step="1"
                value={slopeAngle}
                onChange={(e) => setSlopeAngle(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                <span>15° (Gentle)</span>
                <span>45° (Steep)</span>
                <span>60° (Cliff)</span>
              </div>
            </div>

            {/* 2. Pore Water Pressure Ratio r_u */}
            <div className="space-y-1 p-3 rounded-lg bg-stone-900/60 border border-stone-800">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-stone-300">Pore Pressure Ratio (r_u):</span>
                <span className="text-cyan-400 font-bold">{porePressureRatio}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.6"
                step="0.02"
                value={porePressureRatio}
                onChange={(e) => setPorePressureRatio(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                <span>0.0 (Dry)</span>
                <span>0.3 (Saturated)</span>
                <span>0.6 (Flooded)</span>
              </div>
            </div>

            {/* 3. Effective Cohesion c' */}
            <div className="space-y-1 p-3 rounded-lg bg-stone-900/60 border border-stone-800">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-stone-300">Effective Cohesion (c&apos;):</span>
                <span className="text-amber-300 font-bold">{cohesion} kPa</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={cohesion}
                onChange={(e) => setCohesion(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                <span>0 (Loose Sand)</span>
                <span>15 (Clayey Silt)</span>
                <span>40 (Dense Clay)</span>
              </div>
            </div>

            {/* 4. Internal Friction Angle phi' */}
            <div className="space-y-1 p-3 rounded-lg bg-stone-900/60 border border-stone-800">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-stone-300">Friction Angle (φ&apos;):</span>
                <span className="text-amber-300 font-bold">{frictionAngle}°</span>
              </div>
              <input
                type="range"
                min="18"
                max="42"
                step="1"
                value={frictionAngle}
                onChange={(e) => setFrictionAngle(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                <span>18° (Saturated Clay)</span>
                <span>28° (Colluvium)</span>
                <span>42° (Gravel)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-900/50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors shadow-md"
          >
            Apply to Field Telemetry
          </button>
        </div>
      </div>
    </div>
  );
}
