import { AppLogo } from "@/app/shared/components/common/AppLogo";
import { ImageWithFallback } from "@/app/shared/components/figma/ImageWithFallback";
import { Alert, AlertDescription } from "@/app/shared/components/ui/alert";
import { Button } from "@/app/shared/components/ui/button";
import { useAuth, type UserRole } from "@/app/shared/contexts/AuthContext";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown, ChevronRight,
  ClipboardList,
  Eye, EyeOff,
  Home,
  Key,
  Lock, Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  Users
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

/* ─── Floating label input ─────────────────────────────────── */
function FloatInput({
  id, label, type = "text", value, onChange, required, icon, suffix, placeholder = " ",
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean;
  icon?: React.ReactNode; suffix?: React.ReactNode; placeholder?: string;
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
          placeholder={placeholder === " " ? `Enter your ${label.toLowerCase()}` : placeholder}
          required={required}
          className={`h-full w-full bg-transparent text-base text-slate-800 outline-none ${icon ? "pl-10" : "pl-4"} ${suffix ? "pr-12" : "pr-4"} placeholder:text-slate-500`}
        />
        {suffix && <div className="absolute inset-y-0 right-0 flex w-11 items-center justify-center">{suffix}</div>}
      </div>
    </div>
  );
}

/* ─── Password strength ────────────────────────────────────── */
function getStrength(p: string) {
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}
const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
const strengthColor = ["", "bg-rose-400", "bg-orange-400", "bg-amber-400", "bg-lime-500", "bg-emerald-500"];
const strengthText  = ["", "text-rose-500", "text-orange-500", "text-amber-600", "text-lime-600", "text-emerald-600"];

/* ─── Accordion section ────────────────────────────────────── */
function AccordionSection({
  title, icon, open, onToggle, done, children,
}: {
  title: string; icon: React.ReactNode;
  open: boolean; onToggle: () => void; done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
      open ? "border-amber-300 shadow-md shadow-amber-50" : done ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${
          open ? "bg-amber-50/60" : "bg-white hover:bg-slate-50"
        }`}
      >
        <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
          open ? "bg-amber-500 text-white" : done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
        }`}>
          {done && !open ? <Check className="h-4 w-4" /> : icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm ${open ? "text-amber-700" : done ? "text-emerald-700" : "text-slate-700"}`}>{title}</p>
          {done && !open && <p className="text-xs text-emerald-600 font-medium">Completed</p>}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className={`h-4 w-4 ${open ? "text-amber-500" : "text-slate-400"}`} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-5 pb-5 pt-1 space-y-4 bg-white">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup } = useAuth();
  const requestedRedirect = new URLSearchParams(location.search).get("redirect");
  const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : null;
  const loginPath = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submissionInFlightRef = useRef(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [openSection, setOpenSection] = useState<string>("personal");
  const permitRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);
  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [tenantTermsAccepted, setTenantTermsAccepted] = useState(false);
  const [landlordAgreementAccepted, setLandlordAgreementAccepted] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", middleInitial: "",
    username: "", email: "", mobileNumber: "", address: "",
    password: "", confirmPassword: "",
    role: "" as UserRole | "",
    permitNumber: "",
  });

  const set = (key: string, value: string) =>
    setFormData((p) => ({ ...p, [key]: value }));

  const strength = getStrength(formData.password);

  /* ── Section completion checks ─────────────────────────── */
  const donePersonal =
    !!formData.firstName && !!formData.lastName && !!formData.address;
  const doneContact = !!formData.mobileNumber;
  const doneRole = formData.role === "landlord" && !!formData.permitNumber;
  const doneSecurity =
    /^[A-Za-z0-9_]{4,30}$/.test(formData.username) &&
    /^\S+@\S+\.\S+$/.test(formData.email.trim()) &&
    !!formData.password &&
    formData.password.length >= 6 &&
    formData.password === formData.confirmPassword;

  /* ── Submit ─────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionInFlightRef.current) return;
    setError("");
    if (!formData.role) { setError("Please select a role."); return; }
    if (formData.role === "landlord" && !formData.permitNumber.trim()) { setError("Business permit number is required."); return; }
    if (formData.role === "tenant" && !tenantTermsAccepted) { setError("You must agree to the Terms of Use and Privacy Policy to continue."); return; }
    if (formData.role === "landlord" && !landlordAgreementAccepted) { setError("You must agree to the Terms of Use and Landlord Verification Policy to continue."); return; }
    if (!formData.firstName || !formData.lastName) { setError("Full name is required."); return; }
    if (!formData.address) { setError("Home address is required."); return; }
    if (!formData.mobileNumber) { setError("Mobile number is required."); return; }
    if (!/^[A-Za-z0-9_]{4,30}$/.test(formData.username.trim()) || formData.username.includes("@")) { setError("Username must be 4–30 characters using only letters, numbers, or underscores."); return; }
    if (!formData.email) { setError("Recovery email is required."); return; }
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) { setError("Enter a valid recovery email address."); return; }
    if (formData.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); return; }

    submissionInFlightRef.current = true;
    setLoading(true);
    const fullName = `${formData.firstName} ${formData.middleInitial ? formData.middleInitial + ". " : ""}${formData.lastName}`.trim();
    try {
      const result = await signup({
        name: fullName,
        username: formData.username.trim(),
        email: formData.email,
        password: formData.password,
        role: formData.role as UserRole,
        middleInitial: formData.middleInitial,
        address: formData.address,
        mobileNumber: formData.mobileNumber,
        permitNumber: formData.role === "landlord" ? formData.permitNumber : undefined,
        permitDocument: permitFile ?? undefined,
        idDocument: idFile ?? undefined,
        termsAccepted: formData.role === "tenant" ? tenantTermsAccepted : landlordAgreementAccepted,
        landlordVerificationAccepted: formData.role === "landlord" ? landlordAgreementAccepted : undefined,
      });
      if (result.success && result.signup?.existingAccount) {
        setError("An account may already exist for this email. Sign in, resend verification, or reset your password instead of registering again.");
      } else if (result.success && result.signup?.profileSetupError) {
        navigate(loginPath, { state: { message: result.signup.profileSetupError, verificationEmail: formData.email.trim() } });
      } else if (result.success && result.signup?.requiresEmailVerification) {
        navigate(loginPath, { state: { message: `Account created. A verification link was requested for ${formData.email.trim()}. Check your inbox and spam folder before signing in.`, verificationEmail: formData.email.trim() } });
      } else if (result.success) {
        navigate(loginPath, { state: { message: "Account created successfully. You can now sign in." } });
      } else {
        setError(result.error || "Signup failed");
      }
    } catch (submitError) {
      console.error("[AUTH] Unexpected signup UI failure", submitError);
      setError("We could not confirm that registration completed. Try signing in, resending verification, or resetting your password before registering again.");
    } finally {
      submissionInFlightRef.current = false;
      setLoading(false);
    }
  };

  const toggle = (id: string) => setOpenSection((o) => o === id ? "" : id);

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div className="auth-palette min-h-screen flex flex-col lg:flex-row bg-slate-50">

      {/* ── LEFT PANEL ────────────────────────────────────────── */}
      <div className="auth-visual-panel hidden lg:flex flex-col w-[38%] xl:w-[40%] flex-shrink-0 relative overflow-hidden min-h-screen border-r border-[#EEE7DE]">
        {/* Full-height apartment photo */}
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=960"
            alt="Modern apartment in La Paz"
            className="auth-background-image w-full h-full object-cover object-[center_72%] opacity-30"
          />
          <div className="auth-background-overlay absolute inset-0" />
        </div>

        {/* Content */}
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
                Create your<br />
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  AptFindr account
                </span>
              </h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                Choose an account type and provide the information required for your role.
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
              { icon: ShieldCheck, text: "Submit listing reports for admin review" },
              { icon: MapPin, text: "Compare apartment locations on the map" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex-shrink-0 h-6 w-6 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Icon className="h-3 w-3 text-amber-400" />
                </div>
                <span className="text-sm text-white/70 font-medium">{text}</span>
              </div>
            ))}
          </motion.div>

          {/* Stats frosted bar */}
        </div>
      </div>

      {/* ── RIGHT PANEL: Form ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto">

        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3.5 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
          <Link to="/" className="flex items-center gap-2.5">
            <AppLogo className="h-8 w-8 rounded-lg" iconClassName="h-4 w-4" />
            <span className="font-black text-amber-600 text-base">AptFindr</span>
          </Link>
          <Link to={loginPath} className="text-sm font-bold text-slate-500 hover:text-amber-600 transition-colors">
            Sign in
          </Link>
        </div>

        <div className="flex-1 flex items-start justify-center px-4 py-8 lg:py-12 lg:px-10 xl:px-16">
          <div className="w-full max-w-[470px]">

            {/* Page heading */}
            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">Create your account</h1>
              <p className="text-slate-500 text-sm mt-1.5">
                Already registered?{" "}
                <Link to={loginPath} className="text-amber-600 font-bold hover:text-amber-700 transition-colors">Sign in here</Link>
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
                  {(error.includes("may already exist") || error.includes("couldn't send the confirmation email")) && <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold"><Link to={loginPath} className="text-amber-700">Sign in</Link><Link to="/forgot-password" className="text-amber-700">Forgot password</Link><Link to={loginPath} state={{ message: "Use Resend Verification Email for this account.", verificationEmail: formData.email.trim() }} className="text-amber-700">Resend verification</Link></div>}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── Role cards ─────────────────────────────────── */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Choose your account type</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "tenant", label: "Tenant", sub: "Browse apartments", icon: Users },
                    { id: "landlord", label: "Landlord", sub: "Manage listings", icon: Building2 },
                  ].map((item) => {
                    const selected = formData.role === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ y: 0 }}
                        onClick={() => setFormData((previous) => ({
                          ...previous,
                          role: item.id as UserRole,
                        }))}
                        className={`relative flex flex-col items-center text-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                          selected
                            ? "border-amber-500 bg-amber-50"
                            : "border-slate-200 bg-white hover:border-amber-200"
                        }`}
                      >
                        <div className={`h-10 w-10 rounded-xl border flex items-center justify-center mb-2.5 transition-colors ${selected ? "border-amber-500 bg-amber-50 text-amber-600" : "border-slate-200 bg-white text-slate-500"}`}>
                          <item.icon className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-sm text-slate-900">{item.label}</span>
                        <span className="text-[11px] text-slate-500 mt-0.5">{item.sub}</span>
                        {selected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2 h-5 w-5 bg-amber-500 rounded-full flex items-center justify-center"
                          >
                            <Check className="h-3 w-3 text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* ── Accordion: Personal Info ─────────────────────── */}
              <AccordionSection
                title="Personal Information"
                icon={<User className="h-4 w-4" />}
                open={openSection === "personal"}
                onToggle={() => toggle("personal")}
                done={donePersonal}
              >
                <div className="grid grid-cols-2 gap-3">
                  <FloatInput id="firstName" label="First Name" value={formData.firstName} onChange={(v) => set("firstName", v)} required icon={<User className="h-4 w-4" />} />
                  <FloatInput id="lastName" label="Last Name" value={formData.lastName} onChange={(v) => set("lastName", v)} required />
                </div>
                <FloatInput id="middleInitial" label="Middle Initial (optional)" value={formData.middleInitial} onChange={(v) => set("middleInitial", v)} />
                <FloatInput id="address" label="Home Address" value={formData.address} onChange={(v) => set("address", v)} required icon={<MapPin className="h-4 w-4" />} />
                <div className="flex justify-end">
                  <button type="button" onClick={() => toggle("contact")}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
                    Next: Contact Info <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </AccordionSection>

              {/* ── Accordion: Contact Info ──────────────────────── */}
              <AccordionSection
                title="Contact Information"
                icon={<Phone className="h-4 w-4" />}
                open={openSection === "contact"}
                onToggle={() => toggle("contact")}
                done={doneContact}
              >
                <FloatInput id="mobile" label="Mobile Number" type="tel" value={formData.mobileNumber} onChange={(v) => set("mobileNumber", v)} required icon={<Phone className="h-4 w-4" />} />
                <div className="flex justify-end">
                  <button type="button" onClick={() => toggle(formData.role === "landlord" ? "role-details" : "security")}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
                    Next: {formData.role === "landlord" ? "Verification Details" : "Account Security"} <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </AccordionSection>

              {/* ── Accordion: Role-specific ─────────────────────── */}
              {formData.role === "landlord" && <AccordionSection
                title="Landlord Verification"
                icon={<ClipboardList className="h-4 w-4" />}
                open={openSection === "role-details"}
                onToggle={() => toggle("role-details")}
                done={doneRole}
              >
                {formData.role === "landlord" && (
                  <div className="space-y-4">
                    <FloatInput id="permitNumber" label="Business Permit Number" value={formData.permitNumber} onChange={(v) => set("permitNumber", v)} required icon={<ClipboardList className="h-4 w-4" />} />
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Business Permit", ref: permitRef, file: permitFile, setFile: setPermitFile },
                        { label: "Valid ID", ref: idRef, file: idFile, setFile: setIdFile },
                      ].map(({ label, ref, file, setFile }) => (
                        <div key={label}>
                          <p className="text-xs font-semibold text-slate-600 mb-1.5">{label}</p>
                          <p className="mb-2 text-[11px] font-medium text-slate-500">Optional during signup — required for verification</p>
                          <button type="button" onClick={() => ref.current?.click()}
                            className={`w-full rounded-xl border-2 border-dashed p-4 flex flex-col items-center gap-1.5 transition-all text-center ${
                              file ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-slate-50 hover:border-amber-300 hover:bg-amber-50/50"
                            }`}>
                            {file
                              ? <><CheckCircle2 className="h-5 w-5 text-amber-500" /><span className="text-[10px] text-amber-700 font-semibold truncate w-full">{file.name}</span></>
                              : <><Upload className="h-5 w-5 text-slate-400" /><span className="text-[11px] text-slate-400">Upload file</span></>
                            }
                          </button>
                          <input ref={ref} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                      <ShieldCheck className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-700 font-medium leading-relaxed">
                        You may upload your verification documents now or complete them later. Your apartment listings cannot be published until your landlord verification is approved.
                      </p>
                    </div>
                  </div>
                )}

                {formData.role && (
                  <div className="flex justify-end pt-1">
                    <button type="button" onClick={() => toggle("security")}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
                      Next: Account Security <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </AccordionSection>}

              {/* ── Accordion: Account Security ──────────────────── */}
              <AccordionSection
                title="Account Security"
                icon={<Lock className="h-4 w-4" />}
                open={openSection === "security"}
                onToggle={() => toggle("security")}
                done={doneSecurity}
              >
                <div className="space-y-2">
                  <FloatInput id="username" label="Username" value={formData.username} onChange={(v) => set("username", v)} required placeholder="Choose a unique username" icon={<User className="h-4 w-4" />} />
                  <p className="px-1 text-xs font-medium text-slate-500">You will use this username when signing in. Use 4–30 letters, numbers, or underscores with no spaces.</p>
                </div>
                <div className="space-y-2">
                  <FloatInput id="email" label="Recovery Email" type="email" value={formData.email} onChange={(v) => set("email", v)} required placeholder="you@example.com" icon={<Mail className="h-4 w-4" />} />
                  <p className="px-1 text-xs font-medium text-slate-500">Used for account verification, password recovery, and important account notices.</p>
                </div>
                {/* Password field */}
                <div>
                  <FloatInput
                    id="password"
                    label="Password"
                    type={showPass ? "text" : "password"}
                    value={formData.password}
                    onChange={(v) => set("password", v)}
                    required
                    icon={<Key className="h-4 w-4" />}
                    suffix={
                      <button type="button" onClick={() => setShowPass(!showPass)} className="auth-password-toggle text-slate-500 hover:text-slate-700 transition-colors" aria-label={showPass ? "Hide password" : "Show password"}>
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                  {/* Strength meter */}
                  {formData.password && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map((i) => (
                          <motion.div
                            key={i}
                            className={`flex-1 h-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor[strength] : "bg-slate-200"}`}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: i <= strength ? 1 : 0.3 }}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-semibold ${strengthText[strength]}`}>{strengthLabel[strength]}</p>
                    </div>
                  )}
                </div>

                <FloatInput
                  id="confirm"
                  label="Confirm Password"
                  type={showConfirm ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(v) => set("confirmPassword", v)}
                  required
                  icon={<Lock className="h-4 w-4" />}
                  suffix={
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="auth-password-toggle text-slate-500 hover:text-slate-700 transition-colors" aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}>
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Passwords do not match
                  </p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 6 && (
                  <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
                  </p>
                )}

                {/* Requirements checklist */}
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {[
                    { label: "At least 6 characters", met: formData.password.length >= 6 },
                    { label: "Uppercase strengthens it", met: /[A-Z]/.test(formData.password) },
                    { label: "Number strengthens it", met: /[0-9]/.test(formData.password) },
                    { label: "Passwords match", met: !!formData.password && formData.password === formData.confirmPassword },
                  ].map(({ label, met }) => (
                    <div key={label} className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${met ? "text-emerald-600" : "text-slate-400"}`}>
                      <div className={`h-3.5 w-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${met ? "bg-emerald-500" : "bg-slate-200"}`}>
                        {met && <Check className="h-2 w-2 text-white" />}
                      </div>
                      {label}
                    </div>
                  ))}
                </div>
              </AccordionSection>

              {/* ── Progress summary bar ─────────────────────────── */}
              {(donePersonal || doneContact || doneRole || doneSecurity) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl"
                >
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                      animate={{ width: `${([donePersonal, doneContact, doneRole, doneSecurity].filter(Boolean).length / 4) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {[donePersonal, doneContact, doneRole, doneSecurity].filter(Boolean).length}/4 sections done
                  </span>
                </motion.div>
              )}

              {/* ── Submit ──────────────────────────────────────────── */}
              {formData.role === "tenant" && (
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                  <input type="checkbox" checked={tenantTermsAccepted} onChange={(event) => setTenantTermsAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-amber-500" />
                  <span><strong>I agree to AptFindr&apos;s Terms of Use and Privacy Policy.</strong> I understand that the information I provide will be used to manage my AptFindr account and that I am responsible for using the platform appropriately.</span>
                </label>
              )}

              {formData.role === "landlord" && (
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                  <input type="checkbox" checked={landlordAgreementAccepted} onChange={(event) => setLandlordAgreementAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-amber-500" />
                  <span><strong>I agree to AptFindr&apos;s Terms of Use, Privacy Policy, and Landlord Verification Policy.</strong> I understand that my Business Permit Number and submitted verification information may be reviewed by the administrator, and that my apartment listings cannot be published until my landlord account is verified.</span>
                </label>
              )}

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
                    Creating your account...
                  </>
                ) : (
                  <>
                    Create Account
                  </>
                )}
              </Button>

              {/* Trust badges below submit */}
              <Link to="/" className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-amber-700 transition-colors">
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
