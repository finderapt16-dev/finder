import { Bell, HelpCircle, Home, LayoutGrid, ListPlus, LogOut, Settings, ShieldCheck, TrendingUp, User } from "lucide-react";
import { Link } from "react-router-dom";

import { LogoutConfirmation } from "@/app/shared/components/common/LogoutConfirmation";

type LandlordSection = "overview" | "activity" | "notifications" | "settings" | "help";

type LandlordSidebarProps = {
  user?: { name?: string | null; email?: string | null; avatar?: string | null } | null;
  verified?: boolean;
  activeSection: LandlordSection;
  unreadNotifications?: number;
  onSectionChange: (section: LandlordSection) => void;
  onClose?: () => void;
  onLogout: () => void;
};

const mainItems = [
  { label: "My Properties", section: "overview" as const, icon: LayoutGrid },
  { label: "Activity", section: "activity" as const, icon: TrendingUp },
  { label: "Notifications", section: "notifications" as const, icon: Bell },
];

const accountItems = [
  { label: "Settings", section: "settings" as const, icon: Settings },
  { label: "Help & Support", section: "help" as const, icon: HelpCircle },
];

export function LandlordSidebar({ user, verified = false, activeSection, unreadNotifications = 0, onSectionChange, onClose, onLogout }: LandlordSidebarProps) {
  const selectSection = (section: LandlordSection) => {
    onSectionChange(section);
    onClose?.();
  };
  const navClass = (active: boolean) => `app-sidebar-nav-item relative flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-all ${active ? "bg-[#F3EFEA] text-[#8B735B]" : "text-[#302820] hover:bg-[#FAF8F5] hover:text-[#8B735B]"}`;

  return (
    <div className="app-sidebar flex h-full min-w-0 flex-col overflow-x-hidden overflow-y-auto">
      <button type="button" onClick={() => selectSection("overview")} className="app-sidebar-brand px-5 pb-5 pt-6 text-left">
        <span className="flex items-center gap-2.5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E8DED1] bg-[#FAF8F5] text-[#8B735B]"><Home className="h-6 w-6" /></span><span><strong className="block text-xl font-bold tracking-tight text-[#302820]">AptFindr</strong><small className="text-xs font-medium text-[#756A60]">Landlord Portal</small></span></span>
      </button>

      <div className="px-4 pb-5">
        <div className="app-sidebar-profile flex items-center gap-3 rounded-lg border border-[#E8DED1] bg-[#FAF8F5] px-3 py-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#8B735B] text-sm font-bold text-white">{user?.avatar ? <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" /> : user?.name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}</span>
          <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-bold text-[#302820]">{user?.name || "Name unavailable"}</strong><small className="block truncate text-xs text-[#756A60]">{user?.email ?? ""}</small></span>
          {verified && <ShieldCheck className="h-4 w-4 shrink-0 text-green-400" />}
        </div>
      </div>

      <nav className="space-y-1 px-3 py-3"><p className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756A60]">Main<span className="h-px w-5 bg-[#8B735B]/45" /></p><div className="space-y-1">{mainItems.map(({ label, section, icon: Icon }) => <button key={section} aria-current={activeSection === section ? "page" : undefined} onClick={() => selectSection(section)} className={navClass(activeSection === section)}><Icon className="h-4 w-4 shrink-0" />{label}{section === "notifications" && unreadNotifications > 0 && <span className="app-sidebar-badge ml-auto flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{unreadNotifications}</span>}</button>)}</div></nav>
      <nav className="space-y-1 border-t border-[#E8DED1] px-3 py-4"><p className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756A60]">Market<span className="h-px w-5 bg-[#8B735B]/45" /></p><Link to="/browse" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#302820] transition-all hover:bg-[#FAF8F5] hover:text-[#8B735B]"><TrendingUp className="h-4 w-4 shrink-0" />Market Overview</Link></nav>
      <nav className="space-y-1 border-t border-[#E8DED1] px-3 py-4"><p className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756A60]">Manage<span className="h-px w-5 bg-[#8B735B]/45" /></p><Link to="/add-apartment" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#302820] transition-all hover:bg-[#FAF8F5] hover:text-[#8B735B]"><ListPlus className="h-4 w-4 shrink-0" />Add Property</Link></nav>
      <nav className="space-y-1 border-t border-[#E8DED1] px-3 py-4"><p className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756A60]">Account<span className="h-px w-5 bg-[#8B735B]/45" /></p><div className="space-y-1">{accountItems.map(({ label, section, icon: Icon }) => <button key={section} aria-current={activeSection === section ? "page" : undefined} onClick={() => selectSection(section)} className={navClass(activeSection === section)}><Icon className="h-4 w-4 shrink-0" />{label}</button>)}</div></nav>
      <div className="flex-1" />
      <div className="mt-2 border-t border-[#E8DED1] px-4 py-4"><LogoutConfirmation onConfirm={onLogout}><button className="app-sidebar-logout flex w-full items-center gap-3 rounded-lg border border-[#E8DED1] bg-white px-3 py-3 text-sm font-semibold text-[#756A60] transition hover:border-red-100 hover:bg-red-50 hover:text-red-700"><LogOut className="h-4 w-4 shrink-0" />Log Out</button></LogoutConfirmation></div>
    </div>
  );
}
