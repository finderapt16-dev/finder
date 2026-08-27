import {
  ChevronRight,
  Bell,
  Heart,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { LogoutConfirmation } from "@/app/shared/components/common/LogoutConfirmation";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import { getTenantType, isTenantRole } from "@/app/shared/services/authService";
import { useFavorites } from "@/app/shared/hooks/useFavorites";

type TenantNavSection =
  | "apartments"
  | "favorites"
  | "suggested"
  | "popular"
  | "notifications"
  | "settings"
  | "report"
  | "help";

interface TenantMobileNavigationProps {
  active?: TenantNavSection;
  unreadCount?: number;
}

export function TenantMobileNavigation({ active = "apartments", unreadCount = 0 }: TenantMobileNavigationProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();
  const [open, setOpen] = useState(false);

  const isTenant = isTenantRole(user?.role);
  const tenantType = getTenantType(user);
  const portalLabel = tenantType === "student" ? "Student Portal" : tenantType === "employee" ? "Employee Portal" : "Tenant Portal";
  const displayName = user?.name?.trim();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!isTenant) return null;

  const handleLogout = () => {
    setOpen(false);
    logout?.();
    navigate("/");
  };

  const navItemClass = (key: TenantNavSection) =>
    `app-sidebar-nav-item flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${
      active === key
        ? "bg-[#f3efeA] text-[#8b735b]"
        : "text-[#302820] hover:bg-[#faf8f5] hover:text-[#8b735b]"
    }`;

  const NavLink = ({
    icon: Icon,
    label,
    to,
    section,
    badge,
  }: {
    icon: typeof Home;
    label: string;
    to: string;
    section: TenantNavSection;
    badge?: number;
  }) => (
    <Link to={to} onClick={() => setOpen(false)} aria-current={active === section ? "page" : undefined} className={navItemClass(section)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="app-sidebar-badge flex min-w-5 items-center justify-center rounded-full bg-[#8b735b] px-1.5 py-0.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
      {section === "apartments" && <ChevronRight className="h-4 w-4" />}
    </Link>
  );

  return (
    <>
      <button
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="app-sidebar-trigger fixed left-4 top-4 z-[90] flex h-10 w-10 items-center justify-center rounded-lg bg-[#8b735b] text-white shadow-md transition hover:bg-[#75604d] lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="app-sidebar-drawer relative h-full w-64 max-w-[86vw] border-r border-[#e8ded1] bg-white shadow-2xl">
            <button
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="app-sidebar-close absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8ded1] bg-white text-[#756a60] transition hover:bg-[#faf8f5] hover:text-[#8b735b]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="app-sidebar flex h-full w-full flex-col overflow-y-auto">
              <div className="app-sidebar-brand px-5 pb-5 pt-6">
                <Link to="/browse" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#e8ded1] bg-[#faf8f5] text-[#8b735b]">
                    <img src="/icon.svg" alt="" className="h-9 w-9 object-contain" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-xl font-bold tracking-tight text-[#302820]">AptFindr</span>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#756a60]">La Paz, Iloilo City</p>
                  </div>
                </Link>
              </div>

              <div className="px-4 pb-5">
                <div className="app-sidebar-profile flex items-center gap-3 rounded-lg border border-[#e8ded1] bg-[#faf8f5] px-3 py-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#8b735b] text-sm font-bold text-white">
                    {user?.avatar ? <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" /> : user?.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#302820]">{displayName || "Welcome"}</p>
                    <p className="truncate text-xs text-[#756a60]">{portalLabel}</p>
                  </div>
                </div>
              </div>

              <nav className="space-y-1 px-3 py-3">
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756a60]">Main</p>
                <NavLink icon={Search} label="Apartments" to="/browse" section="apartments" />
                <NavLink icon={Heart} label="My Favorites" to="/favorites" section="favorites" badge={favorites.length} />
                <NavLink icon={Sparkles} label="Suggested for You" to="/dashboard?section=suggested" section="suggested" />
                <NavLink icon={TrendingUp} label="Popular" to="/dashboard?section=popular" section="popular" />
                <NavLink icon={Bell} label="Notifications" to="/dashboard?section=notifications" section="notifications" badge={unreadCount} />
              </nav>

              <nav className="space-y-1 border-t border-[#e8ded1] px-3 py-4">
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756a60]">Account</p>
                <NavLink icon={Settings} label="Settings" to="/dashboard?section=settings" section="settings" />
                <NavLink icon={TriangleAlert} label="Report a Problem" to="/dashboard?section=report" section="report" />
                <NavLink icon={HelpCircle} label="Help" to="/dashboard?section=help" section="help" />
              </nav>

              <div className="mt-auto border-t border-[#e8ded1] px-4 py-4">
                <LogoutConfirmation onConfirm={handleLogout}>
                  <button className="app-sidebar-logout flex w-full items-center gap-3 rounded-lg border border-[#e8ded1] bg-white px-3 py-3 text-sm font-semibold text-[#756a60] transition hover:border-red-100 hover:bg-red-50 hover:text-red-700">
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </LogoutConfirmation>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
