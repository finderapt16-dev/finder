import { Button } from "@/app/shared/components/ui/button";
import { type DashboardAppealRow, type DashboardNotificationRow } from "@/app/shared/services/dashboardSupabaseService";
import { Bell, CheckCheck, Clock, Eye, Flag, Home, LayoutGrid, Mail, MailOpen, Megaphone, MoreVertical, Search, ShieldCheck, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";
import { PropertyNotificationEmptyIllustration } from "@/app/landlord/components/dashboard/illustrations/PropertyNotificationEmptyIllustration";

interface NotificationsSectionProps {
  notifications: DashboardNotificationRow[];
  notifSearch: string;
  notifCategory: "verification" | "all" | "reports" | "unread";
  notifSort: "newest" | "oldest";
  isMarkingAllNotifs: boolean;
  markAllLandlordNotificationsRead: () => Promise<void>;
  setNotifCategory: Dispatch<SetStateAction<"verification" | "all" | "reports" | "unread">>;
  setNotifSearch: Dispatch<SetStateAction<string>>;
  setNotifSort: Dispatch<SetStateAction<"newest" | "oldest">>;
  isLoadingNotifications: boolean;
  handleNotificationClick: (notification: DashboardNotificationRow) => Promise<void>;
  setOpenNotifMenuId: Dispatch<SetStateAction<string | null>>;
  openNotifMenuId: string | null;
  toggleNotifReadStatus: (notificationId: string, isCurrentlyRead: boolean) => Promise<void>;
  deletingNotifId: string | null;
  deleteNotif: (notificationId: string) => Promise<void>;
  landlordAppeals: DashboardAppealRow[];
  getAppealMetadata: (appeal: DashboardAppealRow, kind: string) => Record<string, unknown> | undefined;
}

export const NotificationsSection = ({
  notifications,
  notifSearch,
  notifCategory,
  notifSort,
  isMarkingAllNotifs,
  markAllLandlordNotificationsRead,
  setNotifCategory,
  setNotifSearch,
  setNotifSort,
  isLoadingNotifications,
  handleNotificationClick,
  setOpenNotifMenuId,
  openNotifMenuId,
  toggleNotifReadStatus,
  deletingNotifId,
  deleteNotif,
  landlordAppeals,
  getAppealMetadata,
}: NotificationsSectionProps) => {
  const isNotificationRead = (notification: DashboardNotificationRow) => (notification.read ?? notification.is_read) === true;
  const getNotificationCategory = (notification: DashboardNotificationRow): "reports" | "verification" | "apartments" | "system" => {
    const payload = notification.payload as Record<string, unknown> | null | undefined;
    const explicitCategory = String(payload?.category ?? payload?.notification_category ?? "").toLowerCase();
    if (["report", "reports", "violation", "appeal"].includes(explicitCategory)) return "reports";
    if (["verification", "permit"].includes(explicitCategory)) return "verification";
    if (["apartment", "apartments", "property", "listing"].includes(explicitCategory)) return "apartments";
    if (explicitCategory === "system") return "system";

    const targetType = String(notification.action_target_type ?? payload?.action_target_type ?? "").toLowerCase();
    if (["apartment", "property", "room", "listing"].includes(targetType)) return "apartments";
    const value = `${notification.type ?? ""} ${notification.title ?? ""} ${notification.message ?? ""} ${payload?.action ?? ""}`.toLowerCase();
    if (value.includes("report") || value.includes("violation") || value.includes("appeal") || value.includes("notice") || notification.type === "admin_message") return "reports";
    if (value.includes("verif") || value.includes("permit")) return "verification";
    if (["apartment", "property", "listing", "room", "favorite", "view", "application", "inquiry", "tenant"].some((keyword) => value.includes(keyword))) return "apartments";
    return "system";
  };
  const getCategoryMeta = (category: "reports" | "verification" | "apartments" | "system") => {
    if (category === "reports") return { label: "Reports", icon: Flag, tone: "bg-rose-50 text-rose-600", badge: "bg-rose-50 text-rose-700" };
    if (category === "verification") return { label: "Verification", icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-600", badge: "bg-emerald-50 text-emerald-700" };
    if (category === "apartments") return { label: "Apartments", icon: Home, tone: "bg-blue-50 text-blue-600", badge: "bg-blue-50 text-blue-700" };
    return { label: "System", icon: Megaphone, tone: "bg-[#FAF8F5] text-[#756A60]", badge: "bg-[#FAF8F5] text-[#5F5145]" };
  };
  const unreadCount = notifications.filter((notification) => !isNotificationRead(notification)).length;
  const categoryCounts = {
    reports: notifications.filter((notification) => getNotificationCategory(notification) === "reports").length,
    verification: notifications.filter((notification) => getNotificationCategory(notification) === "verification").length,
  };
  const visibleNotifications = notifications
    .filter((notification) => {
      const query = notifSearch.trim().toLowerCase();
      const matchesSearch = !query || `${notification.title ?? ""} ${notification.message ?? ""} ${notification.type ?? ""}`.toLowerCase().includes(query);
      const read = isNotificationRead(notification);
      const category = getNotificationCategory(notification);
      const matchesCategory = notifCategory === "all" || (notifCategory === "unread" ? !read : category === notifCategory);
      return matchesSearch && matchesCategory;
    })
    .sort((left, right) => {
      const leftTime = new Date(left.created_at ?? left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.created_at ?? right.createdAt ?? 0).getTime();
      return notifSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
  const tabs: Array<{ key: typeof notifCategory; label: string; count?: number; icon: typeof Bell }> = [
    { key: "all", label: "All", count: notifications.length, icon: LayoutGrid },
    { key: "unread", label: "Unread", count: unreadCount, icon: Mail },
    { key: "reports", label: "Reports", count: categoryCounts.reports, icon: Flag },
    { key: "verification", label: "Verification", count: categoryCounts.verification, icon: ShieldCheck },
  ];
  const getActionLabel = (notification: DashboardNotificationRow, category: ReturnType<typeof getNotificationCategory>) => {
    const value = `${notification.type ?? ""} ${notification.action_target_type ?? ""}`.toLowerCase();
    if (value.includes("appeal")) return "View Appeal";
    if (category === "reports") return "View Report";
    if (category === "apartments" || value.includes("property") || value.includes("apartment")) return "View Property";
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-black text-[#302820] sm:text-3xl">Notifications</h1><p className="mt-1 text-sm font-medium text-[#756A60]">Stay updated about your account and properties.</p></div>
        <Button variant="outline" disabled={unreadCount === 0 || isMarkingAllNotifs} onClick={() => void markAllLandlordNotificationsRead()} className="h-11 self-start rounded-lg border-[#DCC9B4] px-5 font-bold text-[#8B735B] transition-colors hover:bg-[#FAF8F5] hover:text-[#756A60] focus-visible:ring-[#C9B8A5] sm:self-auto"><CheckCheck className="mr-2 h-4 w-4" />{isMarkingAllNotifs ? "Updating..." : "Mark all as read"}</Button>
      </header>

      <div className="flex items-center gap-3 rounded-xl border border-[#EEE6DC] bg-white px-5 py-4 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FAF3EB] text-[#8B4F24]"><Bell className="h-5 w-5" /></span><div><strong className="text-2xl font-black text-[#302820]">{unreadCount}</strong><p className="text-sm font-medium text-[#5F5A55]">{unreadCount === 1 ? "Unread notification" : "Unread notifications"}</p></div></div>

      <section className="rounded-xl border border-[#EEE6DC] bg-white p-2 shadow-sm"><div className="flex gap-1 overflow-x-auto">{tabs.map(({ key, label, count, icon: Icon }) => <button key={key} onClick={() => setNotifCategory(key)} className={`flex h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9B8A5] ${notifCategory === key ? "border-[#DCC9B4] bg-[#F3EFEA] text-[#8B735B]" : "border-transparent text-[#5F5A55] hover:bg-[#FAF8F5] hover:text-[#8B735B]"}`}><Icon className="h-4 w-4" />{label}{typeof count === "number" && count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${notifCategory === key ? "bg-white text-[#8B735B]" : "bg-[#F3EFEA]"}`}>{count}</span>}</button>)}</div></section>

      <div>
        <section className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B735B]" /><input value={notifSearch} onChange={(event) => setNotifSearch(event.target.value)} placeholder="Search notifications" className="h-12 w-full rounded-lg border border-[#EEE6DC] bg-white pl-10 pr-3 text-sm font-medium shadow-sm outline-none focus:border-[#C9B8A5] focus:ring-2 focus:ring-[#F3E9DE]" /></div><label className="flex h-12 items-center justify-between rounded-lg border border-[#EEE6DC] bg-white px-4 text-sm font-bold text-[#5F5A55] shadow-sm"><select aria-label="Sort notifications" value={notifSort} onChange={(event) => setNotifSort(event.target.value as typeof notifSort)} className="w-full bg-transparent font-bold text-[#302820] outline-none"><option value="newest">Newest</option><option value="oldest">Oldest</option></select></label></div>
          {isLoadingNotifications ? <div className="flex min-h-96 items-center justify-center rounded-lg border border-slate-200 bg-white"><Clock className="h-7 w-7 animate-pulse text-[#8B735B]" /></div> : <>
          {visibleNotifications.length > 0 ? <div className="overflow-hidden rounded-xl border border-[#EEE6DC] bg-white shadow-sm">{visibleNotifications.map((notification, index) => { const read = isNotificationRead(notification); const category = getNotificationCategory(notification); const meta = getCategoryMeta(category); const Icon = meta.icon; const actionLabel = getActionLabel(notification, category); const notificationId = notification.id ?? `notification-${index}`; const createdAt = notification.created_at ?? notification.createdAt; return <article key={notificationId} className={`relative flex gap-3 border-b border-[#F3EDE6] p-4 last:border-b-0 sm:p-5 ${read ? "bg-white" : "bg-[#FDF8F2]"}`}>{!read && <span className="absolute left-2 top-7 h-2 w-2 rounded-full bg-[#9A5A2A]" />}<span className="ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FAF3EB] text-[#8B4F24]"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="font-black text-[#302820]">{notification.title || notification.type || "Notification"}</h3><p className="mt-1 text-sm font-medium leading-6 text-[#5F5A55]">{notification.message || "No additional details were provided."}</p><div className="mt-2 flex flex-wrap items-center gap-3"><time className="text-xs font-medium text-[#8A8179]">{createdAt ? new Date(createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Time unavailable"}</time>{actionLabel && <button onClick={() => void handleNotificationClick(notification)} className="rounded-md border border-[#DCC9B4] px-3 py-1.5 text-xs font-black text-[#8B735B] transition-colors hover:bg-[#FAF8F5] hover:text-[#756A60] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9B8A5]">{actionLabel}</button>}</div></div>{notification.id && <div className="relative"><button title="Notification actions" onClick={() => setOpenNotifMenuId(openNotifMenuId === notification.id ? null : notification.id!)} className="flex h-9 w-9 items-center justify-center rounded-md text-[#8A8179] hover:bg-[#F3EFEA]"><MoreVertical className="h-4 w-4" /></button>{openNotifMenuId === notification.id && <div className="absolute right-0 top-10 z-20 w-44 rounded-lg border border-[#EEE6DC] bg-white p-1 shadow-xl"><button onClick={() => void handleNotificationClick(notification)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-bold text-[#5F5A55] hover:bg-[#FAF8F5]"><Eye className="h-4 w-4" />Open notification</button><button onClick={() => void toggleNotifReadStatus(notification.id!, read)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-bold text-[#5F5A55] hover:bg-[#FAF8F5]">{read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}{read ? "Mark unread" : "Mark read"}</button><button disabled={deletingNotifId === notification.id} onClick={() => void deleteNotif(notification.id!)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />Delete</button></div>}</div>}</article>; })}</div> : notifications.length === 0 ? <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-[#DCC9B4] bg-white p-8 text-center"><PropertyNotificationEmptyIllustration /><h2 className="text-lg font-black text-[#302820]">You're all caught up.</h2><p className="mt-1 text-sm font-medium text-[#756A60]">Important updates about your account and properties will appear here.</p></div> : <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#DCC9B4] bg-white p-8 text-center"><Search className="mb-3 h-8 w-8 text-[#C9B8A5]" /><h2 className="font-black text-[#302820]">{notifCategory === "reports" ? "No report notifications." : notifCategory === "verification" ? "No verification notifications." : "No matching notifications"}</h2>{notifCategory === "all" || notifCategory === "unread" ? <p className="mt-1 text-sm font-medium text-[#756A60]">Try changing your search or filter.</p> : null}</div>}
          </>}
          <div className="mt-6 rounded-xl border border-[#EEE6DC] bg-white p-5 shadow-sm">
            <div className="mb-4"><h2 className="font-black text-[#302820]">Appeal History</h2><p className="mt-1 text-xs font-medium text-[#756A60]">View your submitted appeals and administrator decisions.</p></div>
            {landlordAppeals.length === 0 ? <p className="rounded-lg bg-[#FAF8F5] p-5 text-center text-sm font-medium text-[#756A60]">No appeals submitted yet.</p> : <div className="divide-y divide-[#F3EDE6]">{landlordAppeals.map((appeal) => { const source = getAppealMetadata(appeal, "source"); const submittedAt = appeal.submitted_at ?? appeal.created_at; const relatedNotification = notifications.find((notification) => String((notification.payload as Record<string, unknown> | null)?.appeal_id ?? "") === appeal.id); return <article key={appeal.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"><div className="min-w-0"><h3 className="truncate text-sm font-black text-[#302820]">{String(source?.apartment_title ?? source?.related_label ?? appeal.reason ?? "Appeal")}</h3><p className="mt-1 text-xs font-medium text-[#5F5A55]">{appeal.reason || "Related issue"}</p>{submittedAt && <time className="mt-2 block text-xs text-[#8A8179]">Submitted {new Date(submittedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</time>}{appeal.admin_response && <p className="mt-2 text-xs font-medium text-[#5F5A55]">Administrator: {appeal.admin_response}</p>}</div><div className="flex flex-wrap items-center gap-2 sm:justify-end"><span className="rounded-md bg-[#F3EFEA] px-2 py-1 text-[10px] font-black uppercase text-[#6F3F1D]">{String(appeal.status ?? "pending").replace(/_/g, " ")}</span>{relatedNotification && <button onClick={() => void handleNotificationClick(relatedNotification)} className="rounded-md border border-[#DCC9B4] px-3 py-1.5 text-xs font-black text-[#8B735B] transition-colors hover:bg-[#FAF8F5] hover:text-[#756A60] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9B8A5]">View Appeal</button>}</div></article>; })}</div>}
          </div>
        </section>
      </div>
    </motion.div>
  );
};
