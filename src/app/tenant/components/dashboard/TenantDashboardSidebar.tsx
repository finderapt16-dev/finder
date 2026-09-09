import { LogoutConfirmation } from "@/app/shared/components/common/LogoutConfirmation";
import { AlertTriangle, Bell, ChevronRight, Heart, HelpCircle, LogOut, Search, Settings, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { User } from "@/app/shared/services/authService";
import type { TenantNotificationsState } from "@/app/tenant/hooks/useTenantNotifications";

const NAV_MAIN = [
  { icon: Search,      label: "Apartments",   href: "/browse", section: "apartments" },
  { icon: Heart,       label: "My Favorites", href: "/favorites", section: "favorites" },
  { icon: Sparkles,    label: "Suggested for You", section: "suggested" },
  { icon: TrendingUp,  label: "Popular",      section: "popular" },
  { icon: Bell,        label: "Notifications", section: "notifications" },
];

const NAV_ACCOUNT = [
  { icon: Settings,      label: "Settings",           section: "settings",  isLink: false },
  { icon: AlertTriangle, label: "Report a Problem",   section: "report",  isLink: false },
  { icon: HelpCircle,    label: "Help & Support",     section: "help",    isLink: false },
];

interface TenantDashboardSidebarProps {
  user: User | null;
  displayName: string | undefined;
  favoriteIds: string[];
  tenantNotifications: Pick<TenantNotificationsState, "unreadCount">;
  activeSection: string;
  setActiveSection: (section: string) => void;
  setSidebarOpen: (open: boolean) => void;
  handleLogout: () => void;
}

export const TenantDashboardSidebar = ({
  user,
  displayName,
  favoriteIds,
  tenantNotifications,
  activeSection,
  setActiveSection,
  setSidebarOpen,
  handleLogout,
}: TenantDashboardSidebarProps) => (
  <div className="app-sidebar flex flex-col h-full overflow-y-auto">
    <div className="app-sidebar-brand px-5 pt-6 pb-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e8ded1] bg-[#faf8f5] text-[#8b735b]">
          <img src="/icon.svg" alt="" className="h-9 w-9 object-contain" aria-hidden="true" />
        </div>
        <div>
          <span className="text-xl font-bold tracking-tight text-[#302820]">AptFindr</span>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#756a60]">La Paz, Iloilo City</p>
        </div>
      </div>
    </div>

    <div className="px-4 pb-5">
      <div className="app-sidebar-profile flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.07] px-3 py-3 shadow-inner shadow-white/5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#8b735b] text-sm font-bold text-white">
          {user?.avatar ? (
            <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            user?.name?.[0]?.toUpperCase() ?? "U"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#302820]">{displayName || "Welcome"}</p>
          <p className="truncate text-xs text-[#756a60]">{user?.email ?? ""}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-[#756a60]" />
      </div>
    </div>

    <nav className="px-3 pt-4 pb-2">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756a60]">Main</p>
      <div className="space-y-0.5">
        {NAV_MAIN.map(({ icon: Icon, label, section, href }) => href ? (
          <Link key={section} to={href} onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#302820] transition hover:bg-[#faf8f5] hover:text-[#8b735b]">
            <Icon className="h-4 w-4 shrink-0" />{label}
            {label === "My Favorites" && favoriteIds.length > 0 && <span className="app-sidebar-badge ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#8b735b] px-1.5 text-[10px] font-bold text-white">{favoriteIds.length}</span>}
            {label === "Notifications" && tenantNotifications.unreadCount > 0 && <span className="app-sidebar-badge ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#8b735b] px-1.5 text-[10px] font-bold text-white">{tenantNotifications.unreadCount}</span>}
          </Link>
        ) : (
          <button key={section} aria-current={activeSection === section ? "page" : undefined} onClick={() => { setActiveSection(section); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${activeSection === section ? "bg-[#f3efeA] text-[#8b735b]" : "text-[#302820] hover:bg-[#faf8f5] hover:text-[#8b735b]"}`}>
            <Icon className="h-4 w-4 shrink-0" />{label}
            {label === "My Favorites" && favoriteIds.length > 0 && <span className="app-sidebar-badge ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#8b735b] px-1.5 text-[10px] font-bold text-white">{favoriteIds.length}</span>}
            {label === "Notifications" && tenantNotifications.unreadCount > 0 && <span className="app-sidebar-badge ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#8b735b] px-1.5 text-[10px] font-bold text-white">{tenantNotifications.unreadCount}</span>}
          </button>
        ))}
      </div>
    </nav>

    <nav className="px-3 pt-3 pb-2 border-t border-white/10 mt-2">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756a60]">Account</p>
      <div className="space-y-0.5">
        {NAV_ACCOUNT.map(({ icon: Icon, label, section, isLink }) =>
          !isLink ? (
            <button
              key={section}
              aria-current={activeSection === section ? "page" : undefined}
              onClick={() => { setActiveSection(section!); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all ${
                activeSection === section
                  ? "bg-[#f3efeA] text-[#8b735b]"
                  : "text-[#302820] hover:bg-[#faf8f5] hover:text-[#8b735b]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ) : null
        )}
      </div>
    </nav>

    <div className="flex-1" />

    <div className="px-4 py-4 border-t border-white/10 mt-2">
      <LogoutConfirmation onConfirm={handleLogout}>
        <button className="app-sidebar-logout flex w-full items-center gap-3 rounded-lg border border-[#e8ded1] bg-white px-3 py-3 text-sm font-semibold text-[#756a60] transition hover:border-red-100 hover:bg-red-50 hover:text-red-700">
          <LogOut className="h-4 w-4 shrink-0" />
          Log Out
        </button>
      </LogoutConfirmation>
    </div>
  </div>
);
