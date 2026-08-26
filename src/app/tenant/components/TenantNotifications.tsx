import { Bell, Building2, Check, FileText, MoreVertical, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/app/shared/components/ui/button";
import type { DashboardNotificationRow } from "@/app/shared/services/dashboardSupabaseService";
import type { TenantNotificationsState } from "@/app/tenant/hooks/useTenantNotifications";

function relativeTime(value?: string | null) {
  if (!value) return "Recently";
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function notificationKind(item: DashboardNotificationRow) {
  const type = (item.type ?? "").toLowerCase();
  const target = (item.action_target_type ?? "").toLowerCase();
  if (target === "report" || type.includes("report")) return "report";
  if (target === "apartment" || type.includes("apartment") || type.includes("availability")) return "apartment";
  return "system";
}

export function TenantNotifications({ state }: { state: TenantNotificationsState }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, unreadCount, loading, markRead, markUnread, markAllRead, remove } = state;
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<DashboardNotificationRow | null>(null);
  const visible = useMemo(() => filter === "unread" ? notifications.filter((item) => item.read !== true) : notifications, [filter, notifications]);

  useEffect(() => {
    const reportId = new URLSearchParams(location.search).get("reportId");
    if (!reportId || selectedReport?.action_target_id === reportId) return;
    const reportNotification = notifications.find((item) => item.action_target_type === "report" && item.action_target_id === reportId);
    if (!reportNotification) return;
    setSelectedReport(reportNotification);
    if (reportNotification.id && reportNotification.read !== true) void markRead(reportNotification.id);
  }, [location.search, markRead, notifications, selectedReport?.action_target_id]);

  const openNotification = async (item: DashboardNotificationRow) => {
    if (item.id && item.read !== true && !await markRead(item.id)) toast.error("Notification could not be marked as read.");
    const kind = notificationKind(item);
    if (kind === "report") {
      setSelectedReport(item);
      return;
    }
    if (item.action_url?.startsWith("/")) navigate(item.action_url);
  };

  return <div className="mx-auto max-w-7xl space-y-5">
    <section className="relative min-h-44 overflow-hidden rounded-xl border border-[#e8ded1] bg-[#fffdfb] p-7 md:p-9">
      <div className="relative z-10 max-w-2xl"><h1 className="text-4xl font-black tracking-tight text-[#211b16]">Notifications</h1><p className="mt-3 text-base font-medium text-[#756a60]">Stay updated on your reports and apartment activity.</p></div>
      <Bell aria-hidden="true" className="pointer-events-none absolute -bottom-7 right-8 h-40 w-40 stroke-[1] text-[#d7c4af] opacity-70 md:right-20" />
    </section>

    <section className="overflow-hidden rounded-xl border border-[#e8ded1] bg-white shadow-[0_16px_45px_rgba(48,40,32,0.07)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee6dc] p-3 md:px-5">
        <div className="flex gap-2" role="tablist" aria-label="Notification filter">
          {(["all", "unread"] as const).map((value) => <button key={value} role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`min-w-24 rounded-lg border px-5 py-2.5 text-sm font-bold capitalize transition ${filter === value ? "border-[#8b735b] bg-[#8b735b] text-white" : "border-[#e8ded1] bg-white text-[#756a60] hover:bg-[#faf8f5]"}`}>{value}{value === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}</button>)}
        </div>
        <Button variant="outline" disabled={unreadCount === 0} onClick={async () => { if (await markAllRead()) toast.success("All notifications marked as read."); else toast.error("Notifications could not be updated."); }} className="rounded-lg border-[#e8ded1] font-bold text-[#302820]"><Check className="mr-2 h-4 w-4" />Mark all as read</Button>
      </div>

      {loading ? <div className="space-y-2 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg bg-[#faf8f5]" />)}</div> : visible.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center"><span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#faf8f5] text-[#b39a80]"><Bell className="h-10 w-10 stroke-[1.5]" /></span><h2 className="mt-5 text-xl font-black text-[#302820]">You're all caught up!</h2><p className="mt-2 max-w-md text-sm font-medium text-[#756a60]">Updates about your reports and apartment activity will appear here.</p></div> : <div className="divide-y divide-[#eee6dc]">{visible.map((item) => {
        const kind = notificationKind(item);
        const Icon = kind === "report" ? FileText : kind === "apartment" ? Building2 : ShieldCheck;
        const action = kind === "report" ? "View Report" : kind === "apartment" ? "View Apartment" : item.action_url ? "View Update" : null;
        return <article key={item.id} className={`relative flex gap-4 p-5 transition md:items-center md:px-6 ${item.read !== true ? "bg-[#fffdf9]" : "bg-white"}`}>
          <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${kind === "report" ? "bg-blue-50 text-blue-600" : kind === "apartment" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}><Icon className="h-7 w-7" /></span>
          <button onClick={() => void openNotification(item)} className="min-w-0 flex-1 text-left"><span className="flex items-center gap-2"><strong className="text-base text-[#211b16]">{item.title || "AptFindr update"}</strong>{item.read !== true && <span className="h-2 w-2 rounded-full bg-[#8b735b]" aria-label="Unread" />}</span><span className="mt-1 block text-sm leading-6 text-[#756a60]">{item.message || "You have a new update."}</span><time className="mt-1 block text-xs font-medium text-[#9a8c7e]" dateTime={item.created_at ?? undefined}>{relativeTime(item.created_at ?? item.createdAt)}</time></button>
          {action && <Button variant="outline" onClick={() => void openNotification(item)} className="hidden shrink-0 rounded-lg border-[#e8ded1] text-[#75604d] sm:inline-flex">{action}</Button>}
          <div className="relative"><button aria-label="Notification options" onClick={() => setMenuId(menuId === item.id ? null : item.id ?? null)} className="rounded-lg p-2 text-[#756a60] hover:bg-[#faf8f5]"><MoreVertical className="h-5 w-5" /></button>{menuId === item.id && <div className="absolute right-0 top-10 z-20 w-44 rounded-lg border border-[#e8ded1] bg-white p-1 shadow-xl"><button onClick={async () => { if (item.id) await (item.read === true ? markUnread(item.id) : markRead(item.id)); setMenuId(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-[#302820] hover:bg-[#faf8f5]"><Check className="h-4 w-4" />Mark as {item.read === true ? "unread" : "read"}</button><button onClick={async () => { if (item.id && await remove(item.id)) toast.success("Notification removed."); else toast.error("Notification could not be removed."); setMenuId(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />Remove</button></div>}</div>
        </article>;
      })}</div>}
    </section>

    {selectedReport && <section className="rounded-xl border border-[#e8ded1] bg-[#faf8f5] p-6" aria-live="polite"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-[#8b735b]">My report status</p><h2 className="mt-2 text-xl font-black text-[#302820]">{selectedReport.title || "Report update"}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#756a60]">{selectedReport.message}</p><p className="mt-3 text-xs font-semibold text-[#9a8c7e]">Updated {relativeTime(selectedReport.created_at ?? selectedReport.createdAt)}</p></div><button onClick={() => setSelectedReport(null)} className="rounded-lg border border-[#e8ded1] bg-white px-3 py-2 text-sm font-bold text-[#756a60]">Close</button></div></section>}
  </div>;
}
