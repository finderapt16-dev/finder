import { AlertTriangle, Bell, ChevronRight, Heart, HelpCircle, Home, LogOut, Search, Settings, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { LogoutConfirmation } from "@/app/shared/components/common/LogoutConfirmation";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import { useFavorites } from "@/app/shared/hooks/useFavorites";
import { useTenantNotifications } from "@/app/tenant/hooks/useTenantNotifications";

type TenantSidebarSection = "apartments" | "favorites" | "suggested" | "popular" | "notifications" | "settings" | "report" | "help";

function SidebarLink({ icon: Icon, label, href, active, badge }: { icon: LucideIcon; label: string; href: string; active?: boolean; badge?: number }) {
  return <Link to={href} aria-current={active ? "page" : undefined} className={`app-sidebar-nav-item flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${active ? "bg-[#f3efeA] text-[#8b735b]" : "text-[#302820] hover:bg-[#faf8f5] hover:text-[#8b735b]"}`}><Icon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1">{label}</span>{badge !== undefined && badge > 0 && <span className="app-sidebar-badge flex min-w-5 items-center justify-center rounded-full bg-[#8b735b] px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span>}</Link>;
}

export function TenantSidebar({ active = "apartments" }: { active?: TenantSidebarSection }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();
  const { unreadCount } = useTenantNotifications();

  return <aside className="app-sidebar flex h-full w-64 shrink-0 flex-col border-r border-[#e8ded1] bg-white">
    <div className="app-sidebar-brand px-5 pb-5 pt-6"><Link to="/browse" className="flex items-center gap-2.5"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#e8ded1] bg-[#faf8f5] text-[#8b735b]"><Home className="h-6 w-6" /></div><div><span className="text-xl font-bold tracking-tight text-[#302820]">AptFindr</span><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#756a60]">La Paz, Iloilo City</p></div></Link></div>
    <div className="px-4 pb-5"><div className="app-sidebar-profile flex items-center gap-3 rounded-lg border border-[#e8ded1] bg-[#faf8f5] px-3 py-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#8b735b] text-sm font-bold text-white">{user?.avatar ? <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" /> : user?.name?.[0]?.toUpperCase() ?? "U"}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#302820]">{user?.name?.trim() || "Welcome"}</p><p className="truncate text-xs text-[#756a60]">{user?.email ?? ""}</p></div><ChevronRight className="h-4 w-4 text-[#756a60]" /></div></div>
    <nav className="space-y-1 px-3 py-3"><p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756a60]">Main</p><SidebarLink icon={Search} label="Apartments" href="/browse" active={active === "apartments"} /><SidebarLink icon={Heart} label="My Favorites" href="/favorites" active={active === "favorites"} badge={favorites.length} /><SidebarLink icon={Sparkles} label="Suggested" href="/dashboard?section=suggested" active={active === "suggested"} /><SidebarLink icon={TrendingUp} label="Popular" href="/dashboard?section=popular" active={active === "popular"} /><SidebarLink icon={Bell} label="Notifications" href="/dashboard?section=notifications" active={active === "notifications"} badge={unreadCount} /></nav>
    <nav className="space-y-1 border-t border-[#e8ded1] px-3 py-4"><p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756a60]">Account</p><SidebarLink icon={Settings} label="Settings" href="/dashboard?section=settings" active={active === "settings"} /><SidebarLink icon={AlertTriangle} label="Report a Problem" href="/dashboard?section=report" active={active === "report"} /><SidebarLink icon={HelpCircle} label="Help" href="/dashboard?section=help" active={active === "help"} /></nav>
    <div className="mt-auto border-t border-[#e8ded1] px-4 py-4"><LogoutConfirmation onConfirm={() => { logout?.(); navigate("/"); }}><button className="app-sidebar-logout flex w-full items-center gap-3 rounded-lg border border-[#e8ded1] bg-white px-3 py-3 text-sm font-semibold text-[#756a60] transition hover:border-red-100 hover:bg-red-50 hover:text-red-700"><LogOut className="h-4 w-4" />Log Out</button></LogoutConfirmation></div>
  </aside>;
}
