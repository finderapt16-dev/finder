import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  HelpCircle,
  Lock,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  Upload,
  User
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import { deleteUser as deleteUserAccount, getTenantType } from "@/app/shared/services/authService";
import { fetchUserPreferenceSections, fetchUserProfileDetails, saveUserPreferenceSection, updateUserProfile, uploadUserAvatar } from "@/app/shared/services/dashboardSupabaseService";

type UserSettingsProfile = {
  firstName: string;
  lastName: string;
  middleInitial: string;
  email: string;
  mobile: string;
  bio: string;
  avatar: string;
  address: string;
  school?: string;
  guardianName?: string;
  guardianAddress?: string;
  guardianContact?: string;
  company?: string;
  workAddress?: string;
  permitNumber?: string;
  department?: string;
  adminLevel?: string;
  otherOccupation?: string;
  otherOrganization?: string;
  otherWorkplace?: string;
};

type UserAlerts = {
  newListings: boolean;
  priceDrop: boolean;
  favoriteAvailable: boolean;
  recommendations: boolean;
  systemPush: boolean;
  digest: string;
  quietStart: string;
  quietEnd: string;
  quietEnabled: boolean;
};

const inputClass = "h-12 w-full rounded-xl border border-[#e8ded1] bg-white px-4 text-base font-medium text-[#302820] outline-none transition duration-200 placeholder:text-[#8b8178] focus:border-[#8b735b] focus:ring-2 focus:ring-[#8b735b]/10";
const textareaClass = "min-h-28 w-full resize-none rounded-xl border border-[#e8ded1] bg-white px-4 py-3 text-base font-medium text-[#302820] outline-none transition duration-200 placeholder:text-[#8b8178] focus:border-[#8b735b] focus:ring-2 focus:ring-[#8b735b]/10";

function SettingsLineArt() {
  return (
    <svg aria-hidden="true" className="tenant-architecture" viewBox="0 0 520 210" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className="tenant-architecture-lines" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 194h484M95 194v-70h268v70M76 124h307M113 194v-43h45v43m171 0v-43h24v43" />
        <path d="M141 124V48h102v76M156 64h72v45h-72M173 78h38m-30 15h22" />
        <path d="M272 124V67h99v57M288 83h67m-67 18h67M306 76v14m29 4v14" />
        <path d="M407 194V80m0 0c0-17 13-29 30-29h20M394 80h26M457 51l18 11-18 11" />
        <path d="M48 194v-34h39v34M68 160c-1-25-6-46-16-64m16 64c2-28 9-51 23-69m-23 69c-10-18-23-32-39-42m39 26c11-13 24-22 39-27" />
        <path d="M405 120h66v53h-66zM425 120v-12c0-9 7-16 13-16s13 7 13 16v12M430 145h16M438 139v13" />
        <path d="m477 31 2.5 6.5L486 40l-6.5 2.5L477 49l-2.5-6.5L468 40l6.5-2.5L477 31Z" />
      </g>
    </svg>
  );
}

const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-[#8b735b]" : "bg-[#e8ded1]"} ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
  >
    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
  </button>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-black uppercase tracking-wide text-[#756a60]">{label}</label>
    {children}
    {hint && <p className="text-xs font-medium text-[#8b8178]">{hint}</p>}
  </div>
);

const CardTitle = ({ icon: Icon, title, subtitle, tone = "bg-[#f3efea] text-[#8b735b]" }: { icon: typeof User; title: string; subtitle?: string; tone?: string }) => (
  <div className="mb-5 flex items-center gap-3">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <h3 className="font-black text-[#302820]">{title}</h3>
      {subtitle && <p className="text-sm font-medium text-[#756a60]">{subtitle}</p>}
    </div>
  </div>
);

function profileStateFromUser(user: ReturnType<typeof useAuth>["user"]): UserSettingsProfile {
  return {
    firstName: user?.name?.split(" ")[0] || "",
    lastName: user?.name?.split(" ").slice(1).join(" ") || "",
    middleInitial: user?.middleInitial || "",
    email: user?.email || "",
    mobile: user?.mobileNumber || user?.mobile || "",
    bio: user?.bio || "",
    avatar: user?.avatar || "",
    address: user?.address || "",
    school: user?.school || "",
    guardianName: user?.guardianName || "",
    guardianAddress: user?.guardianAddress || "",
    guardianContact: user?.guardianContact || "",
    company: user?.company || "",
    workAddress: "",
    permitNumber: user?.permitNumber || "",
    department: user?.department || "",
    adminLevel: user?.adminLevel || "",
    otherOccupation: user?.otherOccupation || "",
    otherOrganization: user?.otherOrganization || "",
    otherWorkplace: user?.otherWorkplace || "",
  };
}

const AlertRow = ({ label, hint, pushVal, onPush }: { label: string; hint?: string; pushVal: boolean; onPush: (v: boolean) => void }) => (
  <div className="flex items-start justify-between gap-4 border-b border-[#eee7df] py-4 last:border-0">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold text-[#302820]">{label}</p>
      {hint && <p className="mt-0.5 text-xs font-medium text-[#8b8178]">{hint}</p>}
    </div>
    <Toggle checked={pushVal} onChange={onPush} />
  </div>
);

export function Settings({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [settingsTab, setSettingsTab] = useState<"profile" | "alerts" | "security">("profile");
  const [settingsMenu, setSettingsMenu] = useState<"personal" | "employment">("personal");

  const [profile, setProfile] = useState<UserSettingsProfile>(() => profileStateFromUser(user));

  const [alerts, setAlerts] = useState<UserAlerts>(() => {
    return {
      newListings: true,
      priceDrop: true,
      favoriteAvailable: true,
      recommendations: true,
      systemPush: false,
      digest: "daily",
      quietStart: "22:00",
      quietEnd: "07:00",
      quietEnabled: true,
    };
  });

  const [security, setSecurity] = useState(() => {
    return { passwordLastChanged: "" };
  });

  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [visiblePasswords, setVisiblePasswords] = useState({ current: false, next: false, confirm: false });

  useEffect(() => {
    let active = true;
    if (!user?.id) return () => { active = false; };
    void Promise.all([
      fetchUserPreferenceSections(user.id),
      fetchUserProfileDetails(user.id),
    ])
      .then(([sections, details]) => {
        if (!active) return;
        if (details?.user) {
          const nameParts = String(details.user.name ?? "").trim().split(/\s+/).filter(Boolean);
          const middleInitial = String(details.user.middle_initial ?? "").trim();
          const lastName = middleInitial
            ? nameParts.filter((part, index) => index !== 0 && part.replace(".", "").toLowerCase() !== middleInitial.toLowerCase()).join(" ")
            : nameParts.slice(1).join(" ");
          setProfile((current) => ({
            ...current,
            firstName: nameParts[0] ?? "",
            lastName,
            middleInitial,
            email: String(details.user.email ?? ""),
            mobile: String(details.user.mobile ?? details.user.mobileNumber ?? ""),
            bio: String(details.user.bio ?? ""),
            avatar: String(details.user.avatar_url ?? ""),
            address: String(details.user.address ?? ""),
            school: String(details.studentProfile?.school ?? ""),
            guardianName: String(details.studentProfile?.guardian_name ?? ""),
            guardianAddress: String(details.studentProfile?.guardian_address ?? ""),
            guardianContact: String(details.studentProfile?.guardian_contact ?? ""),
            company: String(details.employeeProfile?.company ?? ""),
            workAddress: String(details.employeeProfile?.work_address ?? ""),
            otherOccupation: String(details.user.other_occupation ?? ""),
            otherOrganization: String(details.user.other_organization ?? ""),
            otherWorkplace: String(details.user.other_workplace ?? ""),
            permitNumber: String(details.landlordProfile?.permit_number ?? details.user.permit_number ?? ""),
            department: String(details.adminProfile?.department ?? details.user.department ?? ""),
            adminLevel: String(details.adminProfile?.admin_level ?? details.user.admin_level ?? ""),
          }));
        }
        if (sections.alerts && typeof sections.alerts === "object" && !Array.isArray(sections.alerts)) {
          setAlerts((current) => ({ ...current, ...sections.alerts as Partial<UserAlerts> }));
        }
        if (sections.security && typeof sections.security === "object" && !Array.isArray(sections.security)) {
          const saved = sections.security as Record<string, unknown>;
          if (typeof saved.passwordLastChanged === "string") setSecurity({ passwordLastChanged: saved.passwordLastChanged });
        }
      })
      .catch((error) => console.error("Unable to load account preferences:", error));
    return () => { active = false; };
  }, [user?.id]);

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const tenantType = getTenantType(user);
  const roleLabel = tenantType === "student" ? "Student Tenant" : tenantType === "employee" ? "Employee Tenant" : tenantType === "other" ? "Tenant" : user?.role || "Tenant";
  const roleProfileLabel = tenantType === "student"
    ? "Student Profile Information"
    : tenantType === "employee"
      ? "Employment Information"
      : tenantType === "other"
        ? "Tenant Information"
      : user?.role === "landlord"
        ? "Landlord / Business Information"
        : user?.role === "admin"
          ? "Admin Profile Information"
          : "Profile Information";
  const roleProfileSubtitle = tenantType === "student"
    ? "School, guardian, and contact details."
    : tenantType === "employee"
      ? "Your company and work details."
      : tenantType === "other"
        ? "Your occupation, affiliation, and main activity location."
      : user?.role === "landlord"
        ? "Business and permit details."
        : user?.role === "admin"
          ? "Administrative account details."
          : "Role-specific details.";

  const updateProfile = (updater: (prev: UserSettingsProfile) => UserSettingsProfile) => {
    setProfile((p) => updater(p));
  };

  const setA = (key: keyof UserAlerts, val: unknown) => {
    setAlerts((p) => {
      const updated = { ...p, [key]: val };
      return updated;
    });
  };

  const updateSecurity = (updater: (prev: typeof security) => typeof security) => {
    setSecurity((p) => {
      const updated = updater(p);
      return updated;
    });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile photo must be 2MB or smaller.");
      event.target.value = "";
      return;
    }

    if (!user) return;
    try {
      const avatar = await uploadUserAvatar(user.id, file);
      updateProfile((p) => ({ ...p, avatar }));
      const synced = await updateUserProfile({ id: user.id, email: user.email, name: user.name, avatar_url: avatar });
      if (!synced) throw new Error("Unable to update the profile photo.");
      toast.success("Profile photo uploaded!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload the profile photo.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    updateProfile((p) => ({ ...p, avatar: "" }));
    if (user) {
      try {
        await updateUserProfile({ id: user.id, email: user.email, name: user.name, avatar_url: "" });
      } catch {
        // Profile UI still updates locally.
      }
    }
    toast.success("Profile photo removed.");
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      toast.error("Please enter your first and last name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (tenantType === "other" && !profile.otherOccupation?.trim()) {
      toast.error("Occupation / Tenant Type is required.");
      return;
    }

    try {
      const name = `${profile.firstName.trim()} ${profile.middleInitial.trim() ? `${profile.middleInitial.trim()}. ` : ""}${profile.lastName.trim()}`.trim();
      await updateUser(user.id, {
        name,
        email: profile.email.trim(),
        mobileNumber: profile.mobile.trim(),
        middleInitial: profile.middleInitial.trim(),
        address: profile.address.trim(),
        school: profile.school?.trim(),
        guardianName: profile.guardianName?.trim(),
        guardianAddress: profile.guardianAddress?.trim(),
        guardianContact: profile.guardianContact?.trim(),
        company: profile.company?.trim(),
        workAddress: profile.workAddress?.trim(),
        permitNumber: profile.permitNumber?.trim(),
        department: profile.department?.trim(),
        adminLevel: profile.adminLevel?.trim(),
        tenantType,
        otherOccupation: tenantType === "other" ? profile.otherOccupation?.trim() : undefined,
        otherOrganization: tenantType === "other" ? profile.otherOrganization?.trim() : undefined,
        otherWorkplace: tenantType === "other" ? profile.otherWorkplace?.trim() : undefined,
      });
      const updated = await updateUserProfile({
        id: user.id,
        email: profile.email.trim(),
        name,
        role: user.role,
        tenant_type: tenantType,
        mobile: profile.mobile.trim(),
        avatar_url: profile.avatar,
        bio: profile.bio,
        middle_initial: profile.middleInitial.trim(),
        address: profile.address.trim(),
        permit_number: user.role === "landlord" ? profile.permitNumber?.trim() : undefined,
        school: profile.school?.trim(),
        guardian_name: profile.guardianName?.trim(),
        guardian_address: profile.guardianAddress?.trim(),
        guardian_contact: profile.guardianContact?.trim(),
        company: profile.company?.trim(),
        work_address: profile.workAddress?.trim(),
        department: profile.department?.trim(),
        admin_level: profile.adminLevel?.trim(),
        other_occupation: tenantType === "other" ? profile.otherOccupation?.trim() : undefined,
        other_organization: tenantType === "other" ? profile.otherOrganization?.trim() : undefined,
        other_workplace: tenantType === "other" ? profile.otherWorkplace?.trim() : undefined,
      });
      if (updated) {
        const refreshed = await fetchUserProfileDetails(user.id);
        if (refreshed?.user) {
          const nameParts = String(refreshed.user.name ?? "").trim().split(/\s+/).filter(Boolean);
          const middleInitial = String(refreshed.user.middle_initial ?? "").trim();
          const lastName = middleInitial
            ? nameParts.filter((part, index) => index !== 0 && part.replace(".", "").toLowerCase() !== middleInitial.toLowerCase()).join(" ")
            : nameParts.slice(1).join(" ");
          setProfile((current) => ({
            ...current,
            firstName: nameParts[0] ?? "",
            lastName,
            middleInitial,
            email: String(refreshed.user.email ?? ""),
            mobile: String(refreshed.user.mobile ?? refreshed.user.mobileNumber ?? ""),
            address: String(refreshed.user.address ?? ""),
            school: String(refreshed.studentProfile?.school ?? ""),
            guardianName: String(refreshed.studentProfile?.guardian_name ?? ""),
            guardianAddress: String(refreshed.studentProfile?.guardian_address ?? ""),
            guardianContact: String(refreshed.studentProfile?.guardian_contact ?? ""),
            company: String(refreshed.employeeProfile?.company ?? ""),
            workAddress: String(refreshed.employeeProfile?.work_address ?? ""),
            otherOccupation: String(refreshed.user.other_occupation ?? ""),
            otherOrganization: String(refreshed.user.other_organization ?? ""),
            otherWorkplace: String(refreshed.user.other_workplace ?? ""),
          }));
        }
      }
      toast.success("Profile updated successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update profile.";
      toast.error(message);
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;

    if (passwordForm.next.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    if (passwordForm.next !== passwordForm.confirm) {
      toast.error("New passwords do not match.");
      return;
    }

    try {
      await updateUser(user.id, { password: passwordForm.next });
      const passwordLastChanged = new Date().toISOString();
      updateSecurity(() => ({ passwordLastChanged }));
      await saveUserPreferenceSection(user.id, "security", { passwordLastChanged });
      setPasswordForm({ current: "", next: "", confirm: "" });
      toast.success("Password updated successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update password.";
      toast.error(message);
    }
  };

  const handleSaveAlerts = async () => {
    if (!user?.id) return;
    try {
      await saveUserPreferenceSection(user.id, "alerts", alerts);
      toast.success("Settings saved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save alert preferences.");
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      if (!user) return;
      try {
        await deleteUserAccount(user.id);
        logout();
        toast.success("Account deleted successfully");
        navigate("/");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to delete the account.");
      }
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <section className="settings-profile-summary rounded-xl border border-[#e8ded1] bg-gradient-to-r from-[#faf8f5] via-white to-[#f8f4ef] p-6 shadow-[0_8px_24px_rgba(48,40,32,0.06)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="relative h-28 w-28 shrink-0">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl bg-[#8b735b] text-3xl font-black text-white shadow-md">
              {profile.avatar ? <img src={profile.avatar} alt="Profile" className="h-full w-full object-cover" /> : (profile.firstName[0] || user?.name?.[0] || "U").toUpperCase()}
            </div>
            <div className="absolute -bottom-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#e8ded1] bg-white text-[#8b735b] shadow-md">
              <Camera className="h-4 w-4" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black text-[#302820]">{fullName || "Not provided"}</h2>
            <Badge className="mt-3 rounded-full bg-[#f3efea] text-[#8b735b] ring-1 ring-[#e8ded1]">{roleLabel}</Badge>
            <p className="mt-3 text-sm font-medium text-[#756a60]">{profile.email || "Not provided"}</p>
            {!profile.avatar && <p className="mt-1 text-xs font-semibold text-slate-400">No profile photo uploaded</p>}
          </div>
          <div className="flex flex-col gap-3 lg:w-56">
            <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#8b735b] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#75614e]">
              <Upload className="h-4 w-4" />
              Upload Photo
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" />
            </label>
            <button type="button" onClick={handleRemoveAvatar} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#e8ded1] bg-white px-4 text-sm font-black text-[#756a60] shadow-sm transition hover:bg-[#faf8f5] hover:text-[#8b735b]">
              <Trash2 className="h-4 w-4" />
              Remove Photo
            </button>
            <p className="text-center text-xs font-medium text-slate-400">JPG, PNG, or WebP up to 2MB</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-[#e8ded1] bg-white p-4 shadow-sm">
          <h3 className="mb-4 px-2 text-sm font-black text-[#302820]">Settings Menu</h3>
          <MenuButton icon={User} label="Personal Information" active={settingsMenu === "personal"} onClick={() => setSettingsMenu("personal")} />
          <MenuButton icon={BriefcaseBusiness} label={roleProfileLabel} active={settingsMenu === "employment"} onClick={() => setSettingsMenu("employment")} />
          <div className="mt-8 rounded-lg border border-[#e8ded1] bg-[#faf8f5] p-4">
            <HelpCircle className="mb-3 h-7 w-7 text-[#8b735b]" />
            <p className="font-black text-[#302820]">Need help?</p>
            <p className="mt-1 text-xs font-medium leading-5 text-[#756a60]">If you need assistance, please visit our Help Center.</p>
            <Button variant="outline" onClick={() => navigate("/dashboard?section=help")} className="mt-4 w-full rounded-lg border-[#e8ded1] font-black text-[#8b735b] hover:bg-[#f3efea]">
              Go to Help Center
            </Button>
          </div>
        </aside>

        <div className="space-y-5">
          {settingsMenu === "personal" && (
            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <CardTitle icon={User} title="Personal Information" subtitle="Update your personal details." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First Name">
                  <input className={inputClass} value={profile.firstName} onChange={(e) => updateProfile((p) => ({ ...p, firstName: e.target.value }))} placeholder="Not provided" />
                </Field>
                <Field label="Last Name">
                  <input className={inputClass} value={profile.lastName} onChange={(e) => updateProfile((p) => ({ ...p, lastName: e.target.value }))} placeholder="Not provided" />
                </Field>
                <Field label="Middle Initial">
                  <input className={inputClass} value={profile.middleInitial} onChange={(e) => updateProfile((p) => ({ ...p, middleInitial: e.target.value.slice(0, 3) }))} placeholder="Not provided" />
                </Field>
                <Field label="Home Address">
                  <input className={inputClass} value={profile.address} onChange={(e) => updateProfile((p) => ({ ...p, address: e.target.value }))} placeholder="Not provided" />
                </Field>
              </div>
              <div className="mt-4 space-y-4">
                <Field label="Email Address" hint="Used for account login and notifications">
                  <input className={inputClass} type="email" value={profile.email} onChange={(e) => updateProfile((p) => ({ ...p, email: e.target.value }))} placeholder="Not provided" />
                </Field>
                <Field label="Mobile Number" hint="Optional contact number">
                  <input className={inputClass} type="tel" value={profile.mobile} onChange={(e) => updateProfile((p) => ({ ...p, mobile: e.target.value }))} placeholder="Not provided" />
                </Field>
                <Field label="Bio / About You" hint="Short description (max 200 characters)">
                  <textarea className={textareaClass} value={profile.bio} onChange={(e) => updateProfile((p) => ({ ...p, bio: e.target.value.slice(0, 200) }))} placeholder="Not provided" />
                  <p className="text-right text-xs font-medium text-slate-400">{profile.bio.length}/200</p>
                </Field>
              </div>
            </section>
          )}

          {settingsMenu === "employment" && (
            <DisclosureCard icon={BriefcaseBusiness} title={roleProfileLabel} subtitle={roleProfileSubtitle} tone="bg-[#f3efea] text-[#8b735b]">
              {tenantType === "student" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="School">
                    <input className={inputClass} value={profile.school || ""} onChange={(e) => updateProfile((p) => ({ ...p, school: e.target.value }))} placeholder="Not provided" />
                  </Field>
                  <Field label="Guardian Name">
                    <input className={inputClass} value={profile.guardianName || ""} onChange={(e) => updateProfile((p) => ({ ...p, guardianName: e.target.value }))} placeholder="Not provided" />
                  </Field>
                  <Field label="Guardian Contact Number">
                    <input className={inputClass} type="tel" value={profile.guardianContact || ""} onChange={(e) => updateProfile((p) => ({ ...p, guardianContact: e.target.value }))} placeholder="Not provided" />
                  </Field>
                  <Field label="Guardian Address">
                    <input className={inputClass} value={profile.guardianAddress || ""} onChange={(e) => updateProfile((p) => ({ ...p, guardianAddress: e.target.value }))} placeholder="Not provided" />
                  </Field>
                  <Field label="Home Address">
                    <input className={inputClass} value={profile.address} onChange={(e) => updateProfile((p) => ({ ...p, address: e.target.value }))} placeholder="Not provided" />
                  </Field>
                  <Field label="Mobile Number">
                    <input className={inputClass} type="tel" value={profile.mobile} onChange={(e) => updateProfile((p) => ({ ...p, mobile: e.target.value }))} placeholder="Not provided" />
                  </Field>
                  <Field label="Email Address">
                    <input className={inputClass} type="email" value={profile.email} onChange={(e) => updateProfile((p) => ({ ...p, email: e.target.value }))} placeholder="Not provided" />
                  </Field>
                </div>
              ) : tenantType === "employee" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Company / Organization">
                    <input className={inputClass} value={profile.company || ""} onChange={(e) => updateProfile((p) => ({ ...p, company: e.target.value }))} placeholder="Not provided" />
                  </Field>
                  <Field label="Work Address">
                    <input className={inputClass} value={profile.workAddress || ""} onChange={(e) => updateProfile((p) => ({ ...p, workAddress: e.target.value }))} placeholder="Not provided" />
                  </Field>
                </div>
              ) : tenantType === "other" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Occupation / Tenant Type"><input className={inputClass} value={profile.otherOccupation || ""} onChange={(e) => updateProfile((p) => ({ ...p, otherOccupation: e.target.value }))} placeholder="Not provided" /></Field>
                  <Field label="Organization / Affiliation"><input className={inputClass} value={profile.otherOrganization || ""} onChange={(e) => updateProfile((p) => ({ ...p, otherOrganization: e.target.value }))} placeholder="Not provided" /></Field>
                  <Field label="Workplace / Main Activity Location"><input className={inputClass} value={profile.otherWorkplace || ""} onChange={(e) => updateProfile((p) => ({ ...p, otherWorkplace: e.target.value }))} placeholder="Not provided" /></Field>
                </div>
              ) : user?.role === "landlord" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Permit Number">
                    <input className={inputClass} value={profile.permitNumber || ""} onChange={(e) => updateProfile((p) => ({ ...p, permitNumber: e.target.value }))} placeholder="Not provided" />
                  </Field>
                </div>
              ) : user?.role === "admin" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Department">
                    <input className={inputClass} value={profile.department || ""} onChange={(e) => updateProfile((p) => ({ ...p, department: e.target.value }))} placeholder="Not provided" />
                  </Field>
                  <Field label="Admin Level">
                    <input className={inputClass} value={profile.adminLevel || ""} onChange={(e) => updateProfile((p) => ({ ...p, adminLevel: e.target.value }))} placeholder="Not provided" />
                  </Field>
                </div>
              ) : null}
            </DisclosureCard>
          )}
        </div>
      </div>

      <SaveBar onSave={handleUpdateProfile} />
    </div>
  );

  const renderAlertsTab = () => (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <CardTitle icon={Bell} title="Apartment Alerts" subtitle="Get notified about new listings and updates." />
        <AlertRow label="New Listings" hint="Notify when new apartments match your preferences" pushVal={alerts.newListings} onPush={(v) => setA("newListings", v)} />
        <AlertRow label="Price Drops" hint="Alert when saved apartments reduce their price" pushVal={alerts.priceDrop} onPush={(v) => setA("priceDrop", v)} />
        <AlertRow label="Favorite Available" hint="Notify when favorited apartments become available" pushVal={alerts.favoriteAvailable} onPush={(v) => setA("favoriteAvailable", v)} />
        <AlertRow label="Personalized Recommendations" hint="Get apartment suggestions based on your activity" pushVal={alerts.recommendations} onPush={(v) => setA("recommendations", v)} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <CardTitle icon={Clock} title="Delivery Preferences" subtitle="Digest schedule and quiet hours." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Activity Digest">
            <select className={inputClass} value={alerts.digest} onChange={(e) => setA("digest", e.target.value)}>
              <option value="realtime">Real-time</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div>
              <p className="text-sm font-bold text-slate-800">Quiet Hours</p>
              <p className="text-xs font-medium text-slate-500">Pause notifications during rest hours</p>
            </div>
            <Toggle checked={alerts.quietEnabled} onChange={(v) => setA("quietEnabled", v)} />
          </div>
        </div>
        {alerts.quietEnabled && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Quiet From">
              <input className={inputClass} type="time" value={alerts.quietStart} onChange={(e) => setA("quietStart", e.target.value)} />
            </Field>
            <Field label="Quiet Until">
              <input className={inputClass} type="time" value={alerts.quietEnd} onChange={(e) => setA("quietEnd", e.target.value)} />
            </Field>
          </div>
        )}
      </section>

      <SaveBar onSave={() => void handleSaveAlerts()} />
    </div>
  );

  const PasswordField = ({
    id,
    value,
    visible,
    placeholder,
    onChange,
  }: {
    id: keyof typeof passwordForm;
    value: string;
    visible: boolean;
    placeholder: string;
    onChange: (value: string) => void;
  }) => (
    <div className="relative">
      <input
        className={`${inputClass} pr-12`}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisiblePasswords((current) => ({ ...current, [id]: !current[id] }))}
        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <CardTitle icon={Lock} title="Password" subtitle={security.passwordLastChanged ? `Last changed: ${new Date(security.passwordLastChanged).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}` : "Password change date not provided."} tone="bg-[#f3efea] text-[#8b735b]" />
        <div className="space-y-4">
          <Field label="Current Password">
            <PasswordField id="current" value={passwordForm.current} visible={visiblePasswords.current} onChange={(value) => setPasswordForm((p) => ({ ...p, current: value }))} placeholder="Current password" />
          </Field>
          <Field label="New Password" hint="At least 6 characters">
            <PasswordField id="next" value={passwordForm.next} visible={visiblePasswords.next} onChange={(value) => setPasswordForm((p) => ({ ...p, next: value }))} placeholder="New password" />
          </Field>
          <Field label="Confirm New Password">
            <PasswordField id="confirm" value={passwordForm.confirm} visible={visiblePasswords.confirm} onChange={(value) => setPasswordForm((p) => ({ ...p, confirm: value }))} placeholder="Repeat new password" />
          </Field>
          <Button onClick={handlePasswordChange} className="rounded-lg bg-[#8b735b] font-black text-white hover:bg-[#75614e]">Update Password</Button>
        </div>
      </section>

      <section className="settings-danger-zone rounded-lg border border-red-100 bg-red-50 p-6 shadow-sm">
        <CardTitle icon={Trash2} title="Danger Zone" subtitle="Irreversible account actions." tone="bg-white text-red-600" />
        <p className="text-sm font-medium text-slate-600">Once you delete your account, there is no going back. Please be certain.</p>
        <Button variant="destructive" onClick={handleDeleteAccount} className="mt-4 rounded-lg font-black">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete My Account
        </Button>
      </section>
    </div>
  );

  return (
    <div className={embedded ? "tenant-settings pb-6" : "min-h-screen bg-[#f8fafc] pb-12"}>
      <div className={embedded ? "" : "mx-auto max-w-7xl px-4 py-8"}>
        {!embedded && (
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 font-bold text-[#756a60] hover:bg-[#faf8f5] hover:text-[#8b735b]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}

        <div className="mx-auto max-w-6xl space-y-6">
          <header className="settings-hero relative flex min-h-[170px] items-center overflow-hidden rounded-2xl border border-[#e8ded1] bg-gradient-to-r from-[#faf8f5] to-[#fffdfb] p-6 md:px-8">
            <div className="relative z-10 max-w-[58%] max-md:max-w-full">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8ded1] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8b735b] shadow-sm">
                <SettingsIcon className="h-4 w-4" />
                Account Management
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[#302820] md:text-[34px]">Settings</h1>
              <p className="mt-3 text-base font-medium text-[#756a60]">Manage your profile, preferences, security, and account options.</p>
              <div className="mt-4 flex gap-2">
              <button className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-[#e8ded1] bg-white text-[#756a60] transition hover:bg-[#faf8f5] hover:text-[#8b735b]">
                <Bell className="h-5 w-5" />
              </button>
              <button onClick={() => navigate("/dashboard?section=help")} className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#e8ded1] bg-white text-[#756a60] transition hover:bg-[#faf8f5] hover:text-[#8b735b]">
                <HelpCircle className="h-5 w-5" />
              </button>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-3 hidden w-[43%] items-end text-[#b9a58f] md:flex"><SettingsLineArt /></div>
          </header>

          <nav className="grid rounded-xl border border-[#e8ded1] bg-white p-1 shadow-sm sm:grid-cols-3">
            <TabButton icon={User} label="Profile" active={settingsTab === "profile"} onClick={() => setSettingsTab("profile")} />
            <TabButton icon={Bell} label="Alerts" active={settingsTab === "alerts"} onClick={() => setSettingsTab("alerts")} />
            <TabButton icon={Shield} label="Security" active={settingsTab === "security"} onClick={() => setSettingsTab("security")} />
          </nav>

          {settingsTab === "profile" && renderProfileTab()}
          {settingsTab === "alerts" && renderAlertsTab()}
          {settingsTab === "security" && renderSecurityTab()}
        </div>
      </div>
    </div>
  );
}

function TabButton({ icon: Icon, label, active, onClick }: { icon: typeof User; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex h-14 items-center justify-center gap-2 rounded-lg text-sm font-black transition ${active ? "bg-[#f3efea] text-[#8b735b] ring-1 ring-[#e8ded1]" : "text-[#756a60] hover:bg-[#faf8f5] hover:text-[#8b735b]"}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function MenuButton({ icon: Icon, label, active, onClick }: { icon: typeof User; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`mb-2 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-bold transition ${active ? "bg-[#f3efea] text-[#8b735b]" : "text-[#756a60] hover:bg-[#faf8f5] hover:text-[#8b735b]"}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function DisclosureCard({ icon: Icon, title, subtitle, tone, children }: { icon: typeof User; title: string; subtitle: string; tone: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e8ded1] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-4">
        <div className={`settings-card-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-black text-[#302820]">{title}</h3>
          <p className="text-sm font-medium text-[#756a60]">{subtitle}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-400" />
      </div>
      {children}
    </section>
  );
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <section className="settings-save-bar flex flex-col gap-4 rounded-xl border border-[#e8ded1] bg-[#faf8f5] p-5 shadow-sm sm:flex-row sm:items-center">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-[#8b735b] shadow-sm ring-1 ring-[#e8ded1]">
        <Shield className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-black text-[#302820]">Your changes are saved securely.</p>
        <p className="text-sm font-medium text-[#756a60]">Make sure to save your changes before leaving.</p>
      </div>
      <Button onClick={onSave} className="rounded-lg bg-[#8b735b] px-8 font-black text-white hover:bg-[#75614e]">
        <Check className="mr-2 h-4 w-4" />
        Save Changes
      </Button>
    </section>
  );
}
