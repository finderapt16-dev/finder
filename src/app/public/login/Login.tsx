import { AppLogo } from "@/app/shared/components/common/AppLogo";
import { ImageWithFallback } from "@/app/shared/components/figma/ImageWithFallback";
import { Alert, AlertDescription } from "@/app/shared/components/ui/alert";
import { Button } from "@/app/shared/components/ui/button";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import { isTenantRole, resendSignupVerification } from "@/app/shared/services/authService";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2, Eye, EyeOff,
  Home,
  Key,
  UserRound,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

/* ─── Floating label input (identical to Signup) ─────────── */
function FloatInput({
  id, label, type = "text", value, onChange, required, icon, suffix,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean;
  icon?: React.ReactNode; suffix?: React.ReactNode;
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
          className={`h-full w-full bg-transparent text-base text-slate-800 outline-none ${icon ? "pl-10" : "pl-4"} ${suffix ? "pr-12" : "pr-4"} placeholder:text-slate-500`}
        />
        {suffix && <div className="absolute inset-y-0 right-0 flex w-11 items-center justify-center">{suffix}</div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const requestedRedirect = new URLSearchParams(location.search).get("redirect");
  const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : "/dashboard";
  const signupPath = requestedRedirect
    ? `/signup?redirect=${encodeURIComponent(redirectTo)}`
    : "/signup";

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      if (typeof location.state.verificationEmail === "string") setVerificationEmail(location.state.verificationEmail);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const resendVerification = async () => {
    if (!verificationEmail || resending || resendCooldown > 0) return;
    setResending(true); setError("");
    try {
      await resendSignupVerification(verificationEmail);
      setSuccessMessage("Verification email requested. Check your inbox and spam folder.");
      setResendCooldown(60);
    } catch (resendError) {
      console.error("Unable to resend verification email:", resendError);
      setError(resendError instanceof Error ? resendError.message : "Unable to resend the verification email. Please try again later.");
    } finally { setResending(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login({ username, password });
      if (result.success) {
        const hasRequestedRedirect = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//");
        navigate(hasRequestedRedirect ? redirectTo : result.user?.role === "super_admin" ? "/super-admin" : result.user?.role === "admin" ? "/admin" : isTenantRole(result.user?.role) ? "/browse" : "/dashboard", { replace: true });
      } else {
        const message = result.error || "Invalid username or password.";
        setError(message);
      }
    } catch {
      setError("Unable to sign in. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
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
                <span className="text-xs font-bold text-amber-300 tracking-wide">Apartment Finder for La Paz</span>
              </div>
              <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight mb-4">
                Continue to<br />
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  AptFindr
                </span>
              </h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                Sign in to browse apartments or manage your property listings.
              </p>
            </motion.div>
          </div>

          {/* Benefits list */}
          <motion.div
            className="auth-benefits space-y-3 mb-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {[
              { icon: BadgeCheck, text: "Review landlord verification status" },
              { icon: ShieldCheck, text: "Check available rooms and listing details" },
              { icon: MapPin,     text: "Compare apartment locations on the map" },
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
          <Link to={signupPath} className="text-sm font-bold text-slate-500 hover:text-amber-600 transition-colors">
            Create account
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8 lg:py-12 lg:px-10 xl:px-16">
          <div className="auth-form-shell w-full max-w-[470px]">

            {/* Page heading */}
            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">Sign in to AptFindr</h1>
            </div>

            {/* Alerts */}
            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-5"
                >
                  <Alert className="rounded-xl py-3 border-emerald-200 bg-emerald-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <AlertDescription className="font-semibold text-emerald-700 text-sm">{successMessage}</AlertDescription>
                  </Alert>
                  {verificationEmail && <button type="button" disabled={resending || resendCooldown > 0} onClick={() => void resendVerification()} className="mt-2 text-xs font-bold text-amber-700 disabled:text-slate-400">{resending ? "Sending..." : resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend Verification Email"}</button>}
                </motion.div>
              )}
            </AnimatePresence>

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

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Form card — same rounded-2xl border-2 treatment as Signup accordion sections */}
              <div>
                <div className="space-y-5">
                  <FloatInput
                    id="username"
                    label="Username"
                    value={username}
                    onChange={setUsername}
                    required
                    icon={<UserRound className="h-4 w-4" />}
                  />

                  <div className="space-y-1">
                    <FloatInput
                      id="password"
                      label="Password"
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={setPassword}
                      required
                      icon={<Key className="h-4 w-4" />}
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="auth-password-toggle text-slate-500 hover:text-slate-700 transition-colors"
                          aria-label={showPass ? "Hide password" : "Show password"}
                        >
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />
                    <div className="flex justify-end pt-1">
                      <Link
                        to="/forgot-password"
                        className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit — exact same style as Signup */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#8B735B] hover:bg-[#75604B] text-white rounded-xl font-bold text-base shadow-none transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <motion.div
                      className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                    />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                  </>
                )}
              </Button>

              <p className="text-center text-sm font-medium text-slate-500">Don't have an account? <Link to={signupPath} className="font-bold text-amber-600 hover:text-amber-700">Create account</Link></p>

              {/* Trust badges — same as Signup */}
              {/* Back to Home */}
              <Link
                to="/"
                className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-amber-700 transition-colors"
              >
                <Home className="h-4 w-4" />
                Back to Home
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
