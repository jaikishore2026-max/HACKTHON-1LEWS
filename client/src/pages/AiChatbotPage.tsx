/* Landsora: Dedicated Gemini AI Chatbot & Geotechnical Intelligence Suite */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Activity,
  ArrowLeft,
  Bot,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  CloudRain,
  Compass,
  Gauge,
  Layers,
  Lock,
  MapPin,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Wifi,
  Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { GeminiChatbot } from "@/components/GeminiChatbot";
import { SearchGroundingPanel } from "@/components/SearchGroundingPanel";
import { MapsGroundingPanel } from "@/components/MapsGroundingPanel";
import { GoogleAuthModal } from "@/components/GoogleAuthModal";
import { useCriticalRiskToast } from "@/contexts/CriticalRiskToastContext";
import {
  detectLanguageForZone,
  detectLanguageFromCoords,
  notificationLanguages,
  type NotificationLanguage,
} from "@/lib/notificationTranslations";
import { GLOBAL_GEOTECHNICAL_STATIONS, type GeotechnicalStation } from "@shared/stations";

export default function AiChatbotPage() {
  const [selectedZoneId, setSelectedZoneId] = useState<string>("KDG-03");
  const [activeTab, setActiveTab] = useState<"CHATBOT" | "SEARCH_GROUNDING" | "MAPS_GROUNDING" | "RISK_SYNTHESIS">("CHATBOT");
  const [language, setLanguage] = useState<NotificationLanguage>("EN");
  const [autoDetectLanguage, setAutoDetectLanguage] = useState(true);
  const [googleAuthModalOpen, setGoogleAuthModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const currentZone = GLOBAL_GEOTECHNICAL_STATIONS.find((z) => z.id === selectedZoneId) || GLOBAL_GEOTECHNICAL_STATIONS[0];

  const authMeQuery = trpc.auth.me.useQuery();
  const quotaQuery = trpc.chat.quota.useQuery(undefined, { refetchInterval: 15000 });
  const quota = quotaQuery.data?.quota;
  const { triggerCriticalAlert, simulateCriticalAlert } = useCriticalRiskToast();

  const handleZoneChange = (id: string) => {
    setSelectedZoneId(id);
    const z = GLOBAL_GEOTECHNICAL_STATIONS.find((s) => s.id === id);
    if (!z) return;
    if (z.tier === "CRITICAL") {
      triggerCriticalAlert({
        nodeId: z.id,
        zoneName: z.name,
        state: z.region,
        riskScore: z.riskScore,
        riskLevel: "CRITICAL",
        rainfall: z.rainfall,
        soilMoisture: z.soil,
        tiltDegrees: z.tilt,
        triggerReason: `Sensor thresholds critical: Rainfall ${z.rainfall}mm & Tilt ${z.tilt}° at ${z.name}`,
        thresholdExceeded: `Risk Score ${z.riskScore}% · CRITICAL HAZARD`,
      });
    }
    if (autoDetectLanguage) {
      const detected = detectLanguageFromCoords(z.lat, z.lng);
      setLanguage(detected);
    }
  };

  useEffect(() => {
    if (autoDetectLanguage && currentZone) {
      const detected = detectLanguageFromCoords(currentZone.lat, currentZone.lng);
      setLanguage(detected);
    }
  }, [selectedZoneId, autoDetectLanguage, currentZone]);

  const handleDetectGpsLocation = () => {
    if (!navigator.geolocation) {
      setNotice("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detected = detectLanguageFromCoords(pos.coords.latitude, pos.coords.longitude);
        setLanguage(detected);
        setNotice(`📍 GPS Location verified: regional language set to ${detected}.`);
      },
      () => {
        const fallback = currentZone ? detectLanguageFromCoords(currentZone.lat, currentZone.lng) : "EN";
        setLanguage(fallback);
        setNotice(`GPS unavailable. Defaulted to active zone language: ${fallback}.`);
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0F12] text-[#F3F6F8] flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. TOP OPERATIONAL NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-[#11171D]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Page Identity */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-stone-300 hover:text-stone-100 transition-all border border-white/10 shadow-sm"
              title="Return to Main Dashboard"
            >
              <ArrowLeft size={14} />
              <span>DASHBOARD</span>
            </Link>

            <div className="h-4 w-px bg-stone-700/60 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shrink-0">
                <Sparkles size={17} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xs sm:text-sm font-bold tracking-wide text-white font-sans">
                    AI COMPANION
                  </h1>
                  <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    GEMINI 3.5 FLASH
                  </span>
                </div>
                <p className="text-[10.5px] text-stone-400 hidden sm:block font-mono">
                  Geotechnical Decision Support, IMD Grounding & Evacuation Navigation
                </p>
              </div>
            </div>
          </div>

          {/* Right Controls: Regional Language & Google Auth Status */}
          <div className="flex items-center gap-2.5">
            {/* Language Switcher */}
            <LanguageSwitcher
              language={language}
              autoDetectLanguage={autoDetectLanguage}
              onLanguageChange={(l) => {
                setLanguage(l);
                setNotice(`Language switched to ${l}`);
              }}
              onAutoDetectToggle={(next) => {
                setAutoDetectLanguage(next);
                if (next) {
                  const autoLang = detectLanguageFromCoords(currentZone.lat, currentZone.lng);
                  setLanguage(autoLang);
                  setNotice(`📍 Auto-region detection active: set to ${autoLang}.`);
                }
              }}
              onDetectGpsLocation={handleDetectGpsLocation}
              selectedZone={selectedZoneId}
            />

            {/* Google Account Authentication Status & Quota */}
            {authMeQuery.data?.user ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGoogleAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-xs font-medium text-emerald-300 transition-colors shadow-sm"
                  title={`Connected Google Account: ${authMeQuery.data.user.email || authMeQuery.data.user.name}`}
                >
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span className="font-mono text-[11px]">
                    {authMeQuery.data.user.email?.split("@")[0] || authMeQuery.data.user.name || "GOOGLE VERIFIED"}
                  </span>
                </button>
                {quota?.isUnlimited ? (
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                    🛡️ UNLIMITED
                  </span>
                ) : (
                  <span
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold"
                    title={`Daily limit: ${quota?.limit || 30} queries. Resets in ${quota?.resetsInHours || 24}h`}
                  >
                    ⚡ {quota?.remaining ?? 30}/{quota?.limit ?? 30} QUOTA
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setGoogleAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Sparkles size={13} />
                <span>SIGN IN WITH GOOGLE</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. ZONE TELEMETRY SELECTOR BAR */}
      <div className="bg-[#11171D] border-b border-white/10 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Zone Selector Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1 font-semibold">
              <MapPin size={12} className="text-amber-400" /> ACTIVE ZONE:
            </span>
            {GLOBAL_GEOTECHNICAL_STATIONS.map((z) => {
              const isSelected = selectedZoneId === z.id;
              const statusCol = z.tier === "CRITICAL" ? "#EF4444" : z.tier === "WATCH" ? "#F59E0B" : "#10B981";
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => handleZoneChange(z.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20"
                      : "bg-white/[0.03] hover:bg-white/[0.08] text-stone-300 hover:text-stone-100 border border-white/5"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? "#0B0F12" : statusCol }}
                  />
                  <span>{z.countryFlag} {z.name.split(" ")[0]}</span>
                  <span className="text-[10px] font-mono opacity-80">({z.id})</span>
                </button>
              );
            })}
          </div>

          {/* Active Zone Live Sensor Readings */}
          <div className="flex items-center gap-3 text-xs font-mono text-stone-300 shrink-0 bg-[#162028] px-3 py-1.5 rounded-xl border border-white/5 shadow-inner">
            <div className="flex items-center gap-1.5" title="Monitored 24h Cumulative Rainfall">
              <CloudRain size={13} className="text-blue-400" />
              <span>RAIN: <b className="text-white">{currentZone.rainfall}mm</b></span>
            </div>
            <div className="h-3 w-px bg-stone-700" />
            <div className="flex items-center gap-1.5" title="Volumetric Water Content Soil Saturation">
              <Activity size={13} className="text-amber-400" />
              <span>SOIL: <b className="text-white">{currentZone.soil}%</b></span>
            </div>
            <div className="h-3 w-px bg-stone-700" />
            <div className="flex items-center gap-1.5" title="Biaxial Inclinometer Slope Displacement">
              <Compass size={13} className="text-purple-400" />
              <span>TILT: <b className="text-white">{currentZone.tilt}°</b></span>
            </div>
            <div className="h-3 w-px bg-stone-700" />
            <div className="flex items-center gap-1.5 font-bold" style={{ color: currentZone.tier === "CRITICAL" ? "#EF4444" : currentZone.tier === "WATCH" ? "#F59E0B" : "#10B981" }}>
              <ShieldAlert size={13} />
              <span>{currentZone.tier} ({currentZone.riskScore}%)</span>
            </div>
            <div className="h-3 w-px bg-stone-700" />
            <button
              type="button"
              onClick={() =>
                simulateCriticalAlert({
                  nodeId: currentZone.id,
                  zoneName: currentZone.name,
                  state: currentZone.region,
                  rainfall: currentZone.rainfall,
                  soilMoisture: currentZone.soil,
                  tiltDegrees: currentZone.tilt,
                  riskScore: currentZone.riskScore,
                  riskLevel: currentZone.tier === "CRITICAL" ? "CRITICAL" : currentZone.tier === "WATCH" ? "HIGH" : "LOW",
                })
              }
              className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-mono border border-red-500/30 transition-colors"
              title="Test the Critical Sensor Toast Notification System"
            >
              TEST TOAST
            </button>
          </div>
        </div>
      </div>

      {/* 3. AI SUITE WORKSPACE & TABS */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 flex-1 flex flex-col w-full">
        {/* Navigation Tabs with Smooth Horizontal Scroll on Mobile */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 mb-4 p-1.5 rounded-2xl bg-[#11171D] border border-white/10 shadow-xl">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none whitespace-nowrap">
            <button
              type="button"
              onClick={() => setActiveTab("CHATBOT")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                activeTab === "CHATBOT"
                  ? "bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20"
                  : "text-stone-300 hover:text-stone-100 hover:bg-white/[0.05]"
              }`}
            >
              <Sparkles size={14} />
              <span>AI COMPANION</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-black/25 rounded-md">MULTI-TURN</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("SEARCH_GROUNDING")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                activeTab === "SEARCH_GROUNDING"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                  : "text-stone-300 hover:text-stone-100 hover:bg-white/[0.05]"
              }`}
            >
              <Search size={14} />
              <span>SEARCH GROUNDING (IMD)</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-black/25 rounded-md">CITATIONS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("MAPS_GROUNDING")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                activeTab === "MAPS_GROUNDING"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-stone-300 hover:text-stone-100 hover:bg-white/[0.05]"
              }`}
            >
              <MapPin size={14} />
              <span>MAPS GROUNDING (PASSES)</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-black/25 rounded-md">CORRIDORS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("RISK_SYNTHESIS")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                activeTab === "RISK_SYNTHESIS"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                  : "text-stone-300 hover:text-stone-100 hover:bg-white/[0.05]"
              }`}
            >
              <Activity size={14} />
              <span>SLOPE STABILITY</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10.5px] font-mono text-stone-400 px-2 shrink-0">
            <span>LOCATION: <b className="text-stone-200">{currentZone.name}</b></span>
          </div>
        </div>

        {/* Tab Viewports */}
        <div className="flex-1 flex flex-col">
          {activeTab === "CHATBOT" && (
            <div className="flex-1 flex flex-col">
              <GeminiChatbot
                location={currentZone.name}
                rainfall={currentZone.rainfall}
                soil={currentZone.soil}
                tilt={currentZone.tilt}
                riskScore={currentZone.riskScore}
                riskLevel={currentZone.tier}
                language={language}
                onOpenGoogleAuth={() => setGoogleAuthModalOpen(true)}
              />
            </div>
          )}

          {activeTab === "SEARCH_GROUNDING" && (
            <div className="flex-1">
              <SearchGroundingPanel
                location={currentZone.name}
                language={language}
                onOpenGoogleAuth={() => setGoogleAuthModalOpen(true)}
              />
            </div>
          )}

          {activeTab === "MAPS_GROUNDING" && (
            <div className="flex-1">
              <MapsGroundingPanel
                location={currentZone.name}
                language={language}
                onOpenGoogleAuth={() => setGoogleAuthModalOpen(true)}
              />
            </div>
          )}

          {activeTab === "RISK_SYNTHESIS" && (
            <div className="p-6 rounded-2xl bg-[#11171D] border border-white/10 text-stone-200 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
                    SLOPE STABILITY BREAKDOWN · {currentZone.name}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">
                    What the sensors are seeing right now
                  </h2>
                </div>
                <div
                  className="px-4 py-2 rounded-xl font-bold font-mono text-sm border flex items-center gap-2"
                  style={{
                    backgroundColor: currentZone.tier === "CRITICAL" ? "#EF444420" : currentZone.tier === "WATCH" ? "#F59E0B20" : "#10B98120",
                    borderColor: currentZone.tier === "CRITICAL" ? "#EF4444" : currentZone.tier === "WATCH" ? "#F59E0B" : "#10B981",
                    color: currentZone.tier === "CRITICAL" ? "#EF4444" : currentZone.tier === "WATCH" ? "#F59E0B" : "#10B981",
                  }}
                >
                  <ShieldAlert size={16} />
                  <span>{currentZone.tier} RISK · {currentZone.riskScore}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#162028] border border-white/5">
                  <span className="text-xs font-mono text-stone-400">24H RAINFALL</span>
                  <div className="text-2xl font-bold text-blue-400 mt-1">{currentZone.rainfall} mm</div>
                  <p className="text-xs text-stone-400 mt-1">
                    Threshold: 100mm. Heavy continuous rain is loading water weight onto the hillside.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#162028] border border-white/5">
                  <span className="text-xs font-mono text-stone-400">SOIL MOISTURE</span>
                  <div className="text-2xl font-bold text-amber-400 mt-1">{currentZone.soil}% SATURATED</div>
                  <p className="text-xs text-stone-400 mt-1">
                    Capacitive probe indicates the soil matrix is nearing fluid saturation.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#162028] border border-white/5">
                  <span className="text-xs font-mono text-stone-400">SLOPE ANGLE DRIFT</span>
                  <div className="text-2xl font-bold text-purple-400 mt-1">{currentZone.tilt}° TILT</div>
                  <p className="text-xs text-stone-400 mt-1">
                    Biaxial tiltmeter shows continuous micro-shift along the bedrock contact plane.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                <div className="flex items-center gap-2 font-bold mb-1 text-amber-300">
                  <Sparkles size={14} /> FIELD ADVISORY FOR PATROLS & DISTRICT CONTROL
                </div>
                <p className="leading-relaxed text-stone-300">
                  Notify taluk revenue officers immediately. Stop heavy commercial trucks from entering the pass road. Send local emergency teams to check downstream homes and prepare high-ground school buildings for sheltering.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 4. GOOGLE AUTH MODAL */}
      <GoogleAuthModal
        isOpen={googleAuthModalOpen}
        onClose={() => setGoogleAuthModalOpen(false)}
        onSuccess={() => {
          authMeQuery.refetch();
          setNotice("Google Account successfully verified for AI operations.");
        }}
      />

      {/* Toast Notice */}
      {notice && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs shadow-2xl flex items-center gap-2 animate-fade-in">
          <Check size={14} className="text-emerald-400" />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-stone-400 hover:text-stone-200 ml-2"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
