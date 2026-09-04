import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { COOKIE_NAME } from "@shared/const";

type GoogleAuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
};

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Sign In with Google",
  description = "Connect your Google Account to access real-time landslide monitoring, AI decision support, and search grounding.",
}) => {
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");

  const googleSignInMutation = trpc.auth.googleSignIn.useMutation({
    onSuccess: (data) => {
      if (data.sessionToken) {
        try {
          localStorage.setItem("landsora_session_token", data.sessionToken);
          sessionStorage.setItem("landsora_session_token", data.sessionToken);
          sessionStorage.setItem("manus-cookie", `${COOKIE_NAME}=${data.sessionToken}`);
        } catch {
          // ignore storage errors
        }
      }
      utils.auth.me.invalidate();
      utils.chat.quota.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handle1ClickGoogleLogin = async () => {
    const targetEmail = email && email.includes("@") ? email.trim() : "user@gmail.com";
    try {
      await googleSignInMutation.mutateAsync({
        email: targetEmail,
        name: targetEmail.split("@")[0],
      });
    } catch {
      try {
        startLogin();
      } catch {
        // fallback
      }
    }
  };

  const handleManualEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    await googleSignInMutation.mutateAsync({
      email: email.trim(),
      name: email.trim().split("@")[0],
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm bg-[#151C1F] border border-stone-700/80 rounded-2xl shadow-2xl p-6 text-stone-100 overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-stone-800 to-stone-900 border border-stone-700 flex items-center justify-center mb-3 shadow-md">
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-6 h-6"
            />
          </div>
          <h3 className="text-base font-bold text-stone-100 tracking-wide font-sans">{title}</h3>
          <p className="text-xs text-stone-400 mt-1 leading-relaxed">{description}</p>
        </div>

        {/* Primary 1-Click Google Button */}
        <button
          type="button"
          onClick={handle1ClickGoogleLogin}
          disabled={googleSignInMutation.isPending}
          className="w-full py-2.5 px-4 bg-white hover:bg-stone-100 text-stone-900 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-white/5 active:scale-[0.98] disabled:opacity-60"
        >
          {googleSignInMutation.isPending ? (
            <span className="w-4 h-4 rounded-full border-2 border-stone-900 border-t-transparent animate-spin" />
          ) : (
            <>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google logo"
                className="w-4 h-4"
              />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 h-px bg-stone-800" />
          <span className="px-3 text-[10px] font-mono text-stone-500 uppercase tracking-wider">
            OR WITH EMAIL
          </span>
          <div className="flex-1 h-px bg-stone-800" />
        </div>

        {/* Direct Email input */}
        <form onSubmit={handleManualEmailSubmit} className="space-y-3">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your google email address"
              className="w-full bg-stone-900/90 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={googleSignInMutation.isPending || !email.includes("@")}
            className="w-full py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 border border-stone-700 disabled:opacity-40"
          >
            <span>Sign in</span>
            <ArrowRight size={13} />
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-stone-800/80 text-center">
          <span className="text-[10px] font-mono text-stone-500 flex items-center justify-center gap-1">
            <Sparkles size={11} className="text-amber-400/80" />
            <span>Quota managed per Google account</span>
          </span>
        </div>
      </div>
    </div>
  );
};
