/* Landsora Console Settings: Operational parameters, language preferences, and cache controls */
import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Database, Globe2, Radio, Save, Shield, Sliders, Trash2, Wifi } from "lucide-react";
import { getStoredNotificationLanguage, notificationLanguages, saveNotificationLanguage, type NotificationLanguage } from "@/lib/notificationTranslations";
import { clearQueuedReports } from "@/lib/reportQueue";
import { useCriticalRiskToast } from "@/contexts/CriticalRiskToastContext";
import { GLOBAL_GEOTECHNICAL_STATIONS } from "@shared/stations";

export default function SettingsPage() {
  const {
    notificationPermission,
    requestNotificationPermission,
    isMuted,
    toggleMute,
    simulateCriticalAlert,
  } = useCriticalRiskToast();

  const [lang, setLang] = useState<NotificationLanguage>(() => getStoredNotificationLanguage());
  const [pollingInterval, setPollingInterval] = useState<string>(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("landsora-poll-interval") || "2.5";
    }
    return "2.5";
  });
  const [defaultZone, setDefaultZone] = useState<string>(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("landsora-default-zone") || "KDG-03";
    }
    return "KDG-03";
  });
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveNotificationLanguage(lang);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("landsora-poll-interval", pollingInterval);
      localStorage.setItem("landsora-default-zone", defaultZone);
    }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleClearCache = () => {
    if (window.confirm("Are you sure you want to clear all offline citizen reports from local browser storage?")) {
      clearQueuedReports();
      alert("Offline report queue cleared.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F12] text-[#F3F6F8] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-stone-300 hover:text-white transition-all border border-white/10 shadow-sm mb-4"
          >
            <ArrowLeft size={14} />
            <span>RETURN TO FIELD CONSOLE</span>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Console Preferences & Configuration</h1>
            <p className="text-stone-400 text-xs sm:text-sm mt-1 font-mono">Customize telemetry intervals, regional language synthesis, and local cache controls</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Language & Notifications */}
          <div className="bg-[#11171D] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-mono font-bold text-stone-200 uppercase tracking-wider">
                <Globe2 size={15} className="text-amber-400" /> REGIONAL LANGUAGE SYNTHESIS
              </span>
              <span className="text-[10px] font-mono text-stone-500 bg-white/[0.04] px-2 py-0.5 rounded-md">LAST-MILE ADVISORIES</span>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                <div>
                  <label htmlFor="default-lang" className="block text-xs font-bold text-stone-200">Default Alert Preview Language</label>
                  <small className="text-stone-400 text-[11px] block mt-0.5">Pre-compiled multilingual templates generated during WATCH and CRITICAL tier transitions.</small>
                </div>
                <select
                  id="default-lang"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as NotificationLanguage)}
                  className="bg-[#162028] border border-white/10 focus:border-amber-500/60 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono outline-none cursor-pointer"
                >
                  {notificationLanguages.map((l) => (
                    <option key={l.code} value={l.code} className="bg-[#11171D]">
                      {l.label} — {l.nativeLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                <div>
                  <label className="block text-xs font-bold text-stone-200">Browser Push Notifications (HTML5)</label>
                  <small className="text-stone-400 text-[11px] block mt-0.5">
                    Permission Status:{" "}
                    <b className={notificationPermission === "granted" ? "text-emerald-400" : "text-amber-400"}>
                      {notificationPermission === "granted"
                        ? "GRANTED (Active)"
                        : notificationPermission === "denied"
                        ? "DENIED (Blocked in browser settings)"
                        : notificationPermission === "unsupported"
                        ? "UNSUPPORTED"
                        : "NOT ENABLED"}
                    </b>
                  </small>
                </div>
                <div className="flex items-center gap-2">
                  {notificationPermission !== "granted" ? (
                    <button
                      type="button"
                      onClick={() => requestNotificationPermission()}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs font-mono transition-all shadow-md shadow-amber-500/20"
                    >
                      ENABLE PUSH NOTIFICATIONS
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => simulateCriticalAlert()}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-amber-300 font-mono text-xs border border-amber-500/30 transition-all"
                    >
                      TEST DESKTOP NOTIFICATION
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-200">Audible Critical Warning Beep</label>
                  <small className="text-stone-400 text-[11px] block mt-0.5">Emit browser audio beacon when risk escalates past 70/100 threshold.</small>
                </div>
                <input
                  type="checkbox"
                  checked={!isMuted}
                  onChange={toggleMute}
                  className="w-4 h-4 rounded bg-[#162028] border-white/20 text-amber-500 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Sensor & Stream Parameters */}
          <div className="bg-[#11171D] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-mono font-bold text-stone-200 uppercase tracking-wider">
                <Sliders size={15} className="text-amber-400" /> TELEMETRY POLLING & STREAMING
              </span>
              <span className="text-[10px] font-mono text-stone-500 bg-white/[0.04] px-2 py-0.5 rounded-md">IoT BRIDGE</span>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                <div>
                  <label htmlFor="poll-interval" className="block text-xs font-bold text-stone-200">Simulation Pulse Interval</label>
                  <small className="text-stone-400 text-[11px] block mt-0.5">Rate of random micro-drift and simulated sensor state updates.</small>
                </div>
                <select
                  id="poll-interval"
                  value={pollingInterval}
                  onChange={(e) => setPollingInterval(e.target.value)}
                  className="bg-[#162028] border border-white/10 focus:border-amber-500/60 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono outline-none cursor-pointer"
                >
                  <option value="1.0" className="bg-[#11171D]">1.0 second (High Frequency)</option>
                  <option value="2.5" className="bg-[#11171D]">2.5 seconds (Standard Console)</option>
                  <option value="5.0" className="bg-[#11171D]">5.0 seconds (Low Bandwidth)</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label htmlFor="default-zone" className="block text-xs font-bold text-stone-200">Default Focused Field Node</label>
                  <small className="text-stone-400 text-[11px] block mt-0.5">Initial sensor zone loaded when opening the dashboard.</small>
                </div>
                <select
                  id="default-zone"
                  value={defaultZone}
                  onChange={(e) => setDefaultZone(e.target.value)}
                  className="bg-[#162028] border border-white/10 focus:border-amber-500/60 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono outline-none cursor-pointer max-w-xs"
                >
                  {GLOBAL_GEOTECHNICAL_STATIONS.map((st) => (
                    <option key={st.id} value={st.id} className="bg-[#11171D]">
                      {st.countryFlag} {st.name} ({st.country}) [{st.id}]
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Offline Data & Local Storage */}
          <div className="bg-[#11171D] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-mono font-bold text-stone-200 uppercase tracking-wider">
                <Database size={15} className="text-amber-400" /> LOCAL STORAGE & OFFLINE CACHE
              </span>
              <span className="text-[10px] font-mono text-stone-500 bg-white/[0.04] px-2 py-0.5 rounded-md">BROWSER QUEUE</span>
            </div>
            <div className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-200">Purge Offline Citizen Incident Queue</label>
                  <small className="text-stone-400 text-[11px] block mt-0.5">Clears all locally queued slope observations, photos, and GPS tags stored in this browser.</small>
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Trash2 size={14} />
                  <span>CLEAR QUEUE</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs font-mono transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 active:scale-95"
            >
              <Save size={15} />
              <span>SAVE PREFERENCES</span>
            </button>
            {savedNotice && (
              <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-semibold animate-in fade-in duration-200">
                <Check size={15} /> Preferences saved successfully!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
