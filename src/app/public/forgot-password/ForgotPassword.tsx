import { AppLogo } from "@/app/shared/components/common/AppLogo";
import { ImageWithFallback } from "@/app/shared/components/figma/ImageWithFallback";
import { Alert, AlertDescription } from "@/app/shared/components/ui/alert";
import { Button } from "@/app/shared/components/ui/button";
import { supabase } from "@/lib/supabaseclient";
import {
  AlertCircle,
  ArrowLeft, ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Home,
  Key, Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

/* ─── Floating label input (identical to Login & Signup) ──── */
function FloatInput({
  id, label, type = "text", value, onChange, required, icon,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean;
  icon?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[15px] font-semibold leading-5 text-slate-700">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <div className={`relative flex h-[50px] items-center rounded-xl border bg-white transition-all duration-200 ${
        focused ? "border-amber-500 ring-[3px] ring-amber-500/10" : "border-slate-200 hover:border-slate-300"
      }`}>
        {icon && (
          <span className={`absolute left-3.5 transition-colors duration-200 ${focused ? "text-amber-500" : "text-slate-400"}`}>
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={`Enter your ${label.toLowerCase()}`}
          required={required}
          className={`h-full w-full bg-transparent text-base text-slate-800 outline-none ${icon ? "pl-10" : "pl-4"} pr-4 placeholder:text-slate-500`}
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      setLoading(false);
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      console.error("Password recovery request failed:", resetError);
      if (resetError.status === 429 || /rate|too many|seconds/i.test(resetError.message)) {
        setError("Too many email requests. Please wait before trying again.");
        return;
      }
    }

    setSent(true);
    toast.success("If an account exists for this email, password reset instructions have been sent.");
  };

  return (
    <div className="auth-palette min-h-screen flex flex-col lg:flex-row bg-slate-50">

      {/* ── LEFT PANEL ────────────────────────────────────────── */}
      <div className="auth-visual-panel hidden lg:flex flex-col w-[38%] xl:w-[40%] flex-shrink-0 relative overflow-hidden min-h-screen border-r border-[#EEE7DE]">
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=960"
            alt="Modern apartment in La Paz"
            className="auth-background-image w-full h-full object-cover object-[center_72%] opacity-30"
          />
          <div className="auth-background-overlay absolute inset-0" />
        </div>

        <div className="relative z-10 flex flex-col h-full p-8 xl:p-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group mb-auto">
            <AppLogo className="h-10 w-10 rounded-xl group-hover:scale-105 transition-transform" iconClassName="h-5 w-5" />
            <div>
              <span className="text-lg font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">AptFindr</span>
              <p className="text-[10px] text-white/40 font-semibold -mt-0.5 uppercase tracking-widest">La Paz, Iloilo City</p>
            </div>
          </Link>

          {/* Hero copy */}
          <div className="mt-16 mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-400/30 rounded-full mb-5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-bold text-amber-300 tracking-wide">AptFindr Account Recovery</span>
              </div>
              <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight mb-4">
                Reset your<br />
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  account password
                </span>
              </h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                Enter your account email to request password reset instructions.
              </p>
            </motion.div>
          </div>

          {/* Security highlights */}
          <motion.div
            className="auth-benefits space-y-3 mb-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {[
              { icon: ShieldCheck, text: "Request instructions using your account email" },
              { icon: Lock,        text: "Open the link provided in the email" },
              { icon: BadgeCheck,  text: "Choose a new account password" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex-shrink-0 h-6 w-6 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Icon className="h-3 w-3 text-amber-400" />
                </div>
                <span className="text-sm text-white/70 font-medium">{text}</span>
              </div>
            ))}
          </motion.div>

          {/* Stats */}
        </div>
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto">

        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3.5 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
          <Link to="/" className="flex items-center gap-2.5">
            <AppLogo className="h-8 w-8 rounded-lg" iconClassName="h-4 w-4" />
            <span className="font-black text-amber-600 text-base">AptFindr</span>
          </Link>
          <Link to="/login" className="text-sm font-bold text-slate-500 hover:text-amber-600 transition-colors">
            Sign in
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8 lg:py-12 lg:px-10 xl:px-16">
          <div className="auth-form-shell w-full max-w-[470px]">

            {/* Page heading */}
            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">
                {sent ? "Check your email" : "Forgot your password?"}
              </h1>
              <p className="text-slate-500 text-sm mt-1.5">
                Remember your password?{" "}
                <Link to="/login" className="text-amber-600 font-bold hover:text-amber-700 transition-colors">
                  Sign in here
                </Link>
              </p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-5"
                >
                  <Alert variant="destructive" className="rounded-xl py-3 border-rose-200 bg-rose-50">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <AlertDescription className="font-semibold text-rose-700 text-sm">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">

              {/* ── INITIAL STATE ─────────────────────────────── */}
              {!sent && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <form onSubmit={handleEmailSubmit} className="space-y-4">

                    {/* Form card */}
                    <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
                      <div className="px-5 py-5 space-y-4">
                        <FloatInput
                          id="email"
                          label="Email Address"
                          type="email"
                          value={email}
                          onChange={setEmail}
                          required
                          icon={<Mail className="h-4 w-4" />}
                        />
                        <p className="text-xs text-slate-400 font-medium px-1">
                          Enter the email associated with your account. If eligible, reset instructions will be sent to that address.
                        </p>
                      </div>

                      {/* Security notice strip */}
                      <div className="flex items-start gap-3 px-5 py-3.5 bg-amber-50/60 border-t border-amber-100">
                        <ShieldCheck className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 font-medium leading-relaxed">
                          For your security, use the most recent recovery email and follow its instructions promptly.
                        </p>
                      </div>
                    </div>

                    {/* Submit */}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-[#8B735B] hover:bg-[#76614D] text-white rounded-xl font-bold text-base shadow-none transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <motion.div
                            className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                          />
                          Sending reset link...
                        </>
                      ) : (
                        <>
                          Send Reset Link
                        </>
                      )}
                    </Button>

                    {/* Trust badges */}
                    {/* Back to Sign In */}
                    <Link
                      to="/login"
                      className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-amber-700 transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Sign In
                    </Link>
                  </form>
                </motion.div>
              )}

              {/* ── SUCCESS STATE ──────────────────────────────── */}
              {sent && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  {/* Success card */}
                  <div className="rounded-2xl border-2 border-emerald-200 bg-white overflow-hidden">

                    {/* Icon + message */}
                    <div className="px-5 py-6 flex flex-col items-center text-center gap-3">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                        className="h-16 w-16 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center"
                      >
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      </motion.div>
                      <div>
                        <p className="font-black text-slate-900 text-base">Check your email</p>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                          Password reset instructions were requested for
                        </p>
                        <p className="text-sm text-slate-600 mt-2">If an account exists for this email, password reset instructions have been sent.</p>
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="px-5 pb-5 space-y-2">
                      {[
                        { step: "1", text: "Open your email inbox" },
                        { step: "2", text: "Open the password reset link" },
                        { step: "3", text: "Choose a new password" },
                      ].map(({ step, text }) => (
                        <div key={step} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="h-6 w-6 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-black text-amber-600">{step}</span>
                          </div>
                          <span className="text-sm font-medium text-slate-700">{text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Spam notice */}
                    <div className="flex items-start gap-3 px-5 py-3.5 bg-amber-50/60 border-t border-amber-100">
                      <Mail className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 font-medium leading-relaxed">
                        Can't find it? Check your spam or junk folder, or request another email.
                      </p>
                    </div>
                  </div>

                  {/* Back to Sign In CTA */}
                  <Button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="w-full h-12 bg-[#8B735B] hover:bg-[#76614D] text-white rounded-xl font-bold text-base shadow-none transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-5 w-5" />
                    Back to Sign In
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  {/* Trust badges */}
                  <div className="flex items-center justify-center gap-4 pt-1">
                    {["Account Email", "Reset Link", "New Password"].map((b) => (
                      <div key={b} className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {b}
                      </div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400 font-medium">or</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  {/* Resend / home row */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => { setSent(false); setEmail(""); }}
                      className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/40 text-sm font-bold text-slate-600 hover:text-amber-700 transition-all duration-200"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try again
                    </button>
                    <Link
                      to="/"
                      className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/40 text-sm font-bold text-slate-600 hover:text-amber-700 transition-all duration-200"
                    >
                      <Home className="h-4 w-4" />
                      Back to Home
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
