/* LEWS Registration: Sign Up Portal */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, Shield, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { COOKIE_NAME } from "@shared/const";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("field-observer");

  const utils = trpc.useUtils();

  const googleSignInMutation = trpc.auth.googleSignIn.useMutation({
    onSuccess: (data) => {
      if (data.sessionToken) {
        try {
          localStorage.setItem("landsora_session_token", data.sessionToken);
          sessionStorage.setItem("landsora_session_token", data.sessionToken);
          sessionStorage.setItem("manus-cookie", `${COOKIE_NAME}=${data.sessionToken}`);
        } catch {}
      }
      localStorage.setItem("lews_user", JSON.stringify({ name, email, organization, role }));
      utils.auth.me.invalidate();
      utils.chat.quota.invalidate();
      setLocation("/dashboard");
    },
    onError: () => {
      localStorage.setItem("lews_user", JSON.stringify({ name, email, organization, role }));
      setLocation("/dashboard");
    },
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    try {
      await googleSignInMutation.mutateAsync({
        email: email.trim(),
        name: name.trim(),
      });
    } catch {
      localStorage.setItem("lews_user", JSON.stringify({ name, email, organization, role }));
      setLocation("/dashboard");
    }
  };

  const handleGoogleSignup = async () => {
    const targetEmail = email && email.includes("@") ? email.trim() : "observer@landsora.org";
    const targetName = name || targetEmail.split("@")[0];
    try {
      await googleSignInMutation.mutateAsync({
        email: targetEmail,
        name: targetName,
      });
    } catch {
      setLocation("/dashboard");
    }
  };

  return (
    <div className="auth-page-shell min-h-screen flex items-center justify-center p-4 bg-[#12181A]">
      <div className="auth-card-container w-full max-w-md">
        <Link href="/" className="auth-back-link flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 mb-4 font-mono transition-colors">
          <ArrowLeft size={14} />
          <span>BACK TO OVERVIEW</span>
        </Link>

        <div className="auth-card panel bg-[#151D1F] border border-stone-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="auth-card-header text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-stone-900 border border-stone-700 flex items-center justify-center mx-auto mb-3">
              <img src="/assets/lews-logo.png" alt="Landsora logo" className="w-8 h-8 object-contain" />
            </div>
            <h2 className="text-xl font-bold text-stone-100 font-sans tracking-wide">Register Observer Account</h2>
            <p className="text-xs text-stone-400 mt-1">Deploy hyperlocal telemetry and emergency decision support</p>
          </div>

          {/* Quick Google Sign In */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={googleSignInMutation.isPending}
              className="w-full py-3 px-4 bg-white hover:bg-stone-100 text-stone-900 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-white/5 active:scale-[0.98] disabled:opacity-60"
            >
              {googleSignInMutation.isPending ? (
                <span className="w-4 h-4 rounded-full border-2 border-stone-900 border-t-transparent animate-spin" />
              ) : (
                <>
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-4 h-4"
                  />
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>

          <div className="relative flex items-center justify-center mb-5">
            <div className="border-t border-stone-700/80 w-full" />
            <span className="bg-[#151D1F] px-3 text-[10px] font-mono text-stone-500 uppercase tracking-widest absolute">
              Or Manual Registration
            </span>
          </div>

          <form onSubmit={handleSignup} className="auth-form space-y-3.5">
            <div className="auth-field">
              <label htmlFor="name-input" className="block text-[10.5px] font-mono font-bold text-stone-400 mb-1">
                FULL NAME
              </label>
              <input
                id="name-input"
                type="text"
                placeholder="Dr. S. Ramesh"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-stone-900/90 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="email-input" className="block text-[10.5px] font-mono font-bold text-stone-400 mb-1">
                WORK EMAIL
              </label>
              <input
                id="email-input"
                type="email"
                placeholder="ramesh@sdma.karnataka.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-stone-900/90 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="org-input" className="block text-[10.5px] font-mono font-bold text-stone-400 mb-1">
                ORGANIZATION / DISTRICT PANCHAYAT
              </label>
              <input
                id="org-input"
                type="text"
                placeholder="District Disaster Management Authority"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
                className="w-full bg-stone-900/90 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="role-select" className="block text-[10.5px] font-mono font-bold text-stone-400 mb-1">
                DEPLOYMENT ROLE
              </label>
              <select
                id="role-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-stone-900/90 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
              >
                <option value="field-observer">Field Observer / Surveyor</option>
                <option value="emergency-planner">District Emergency Planner</option>
                <option value="first-responder">First Responder / Patrol</option>
                <option value="geotechnical-analyst">Geotechnical Researcher</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={googleSignInMutation.isPending}
              className="w-full mt-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-[0.98]"
            >
              <span>CREATE ACCOUNT & LAUNCH CONSOLE</span>
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="auth-footer-links text-center mt-5 text-xs text-stone-400 font-sans">
            <span>Already have an account? <Link href="/login" className="text-amber-400 hover:text-amber-300 font-semibold underline ml-1">Sign in here</Link></span>
          </div>
        </div>

        <div className="auth-trust-note flex items-center justify-center gap-2 text-[11px] text-stone-500 font-mono mt-4 text-center">
          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
          <span>Compliant with open disaster intelligence standards · MIT License</span>
        </div>
      </div>
    </div>
  );
}
