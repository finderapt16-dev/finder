import { EditApartmentDialog } from "@/app/shared/components/common/EditApartmentDialog";
import { EvidenceUploader, type EvidenceFile } from "@/app/shared/components/common/EvidenceUploader";
import { LandlordSidebar } from "@/app/landlord/components/LandlordSidebar";
import { ApartmentRatingSummary } from "@/app/shared/components/common/ApartmentRatingSummary";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/shared/components/ui/card";
import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/shared/components/ui/tabs";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import {
  deleteApartment as deleteApartmentInDb,
  fetchApartmentsForLandlord,
  persistApartmentImages,
  updateApartment,
  updateApartmentPublication,
  type Apartment,
  type ApartmentStatus
} from "@/app/shared/data/apartments";
import { deleteUser as deleteUserAccount } from "@/app/shared/services/authService";
import { fetchRatingsForApartments, subscribeToApartmentRatings, summarizeApartmentRatings, type ApartmentRatingRow } from "@/app/shared/services/apartmentRatingsService";
import { generateBackupCodes } from "@/app/shared/services/securityService";
import {
  createAppealWithEvidence,
  createAuditLog,
  createSupportTicket,
  deleteNotification,
  fetchAppealsByLandlord,
  fetchFavoritesForApartments,
  fetchViewActivityForApartments,
  fetchLandlordProfile,
  fetchNotifications,
  fetchViolations,
  fetchUserById,
  fetchUserPreferenceSections,
  fetchUsers,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  saveUserPreferenceSection,
  submitAppealFollowupWithEvidence,
  updateUserProfile,
  uploadUserAvatar,
  type DashboardAppealRow,
  type DashboardApartmentViewRow,
  type DashboardFavoriteRow,
  type DashboardNotificationRow,
  type DashboardViolationRow,
  type DashboardUserRow
} from "@/app/shared/services/dashboardSupabaseService";
import { apartmentToFormValues } from "@/app/shared/utils/apartmentMappers";
import { formatApartmentLocation } from "@/app/shared/utils/apartmentLocation";
import { supabase } from "@/lib/supabaseClient";
import {
  AlertCircle,
  AlertTriangle,
  Bath,
  BedDouble,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  Camera,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  Eye as EyeOpen,
  Flag,
  Heart,
  HelpCircle,
  Home,
  LayoutGrid,
  List,
  ListPlus,
  Mail,
  MailOpen,
  MapPin,
  Megaphone,
  Menu,
  MessageSquare,
  MoreVertical,
  Plus,
  RotateCcw,
  Ruler,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  User,
  X
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

// ── Nav groups ───────────────────────────────────────────────────────────────
const LANDLORD_DASHBOARD_SECTIONS = new Set(["overview", "properties", "activity", "notifications", "settings", "help"]);

const STATUS_OPTIONS: { value: ApartmentStatus; label: string; className: string }[] = [
  { value: "available", label: "Available", className: "bg-green-100 text-green-700 border-green-200" },
  { value: "occupied", label: "Occupied", className: "bg-red-100 text-red-700 border-red-200" },
  { value: "maintenance", label: "Under Maintenance", className: "bg-slate-100 text-slate-600 border-slate-200" },
];

const getStatusOption = (status?: string) =>
  STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[0];

// ── Modal component ──────────────────────────────────────────────────────────
function PeopleModal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor,
  names,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  names: string[];
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#F3EFEA] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${iconColor}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm">{title}</p>
              <p className="text-slate-400 text-xs font-medium">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-[#FAF8F5]/60">
          {names.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm font-medium">No one yet</div>
          ) : (
            names.map((name, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAF8F5]/40 transition-colors">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#F3EFEA] to-[#F3EFEA] flex items-center justify-center shrink-0 font-black text-[#5F5145] text-xs">
                  {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <span className="text-slate-800 font-semibold text-sm">{name}</span>
              </div>
            ))
          )}
        </div>
        <div className="px-5 py-3 border-t border-[#FAF8F5] bg-[#FAF8F5]/30">
          <p className="text-xs text-slate-400 font-medium text-center">
            {names.length} {names.length === 1 ? "person" : "people"} total
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Shared Settings UI primitives ────────────────────────────────────────────
const PropertyActivityEmptyIllustration = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 180 145"
    className="mb-5 h-auto w-40 text-[#8B735B]"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M28 127h126M69 127V70h51v57M64 70h61l-7-8H71zM80 82h10v14H80zm20 0h10v14h-10zm-20 25h10v13H80zm20 0h10v13h-10zM91 127v-16h10v16" />
    <path d="M47 127V104m0 0c-9-7-8-20 0-24 8 4 9 17 0 24zm0 0-6-7m6 7 6-7M120 127c13 0 20-5 20-13 0-6-4-10-10-11 1-9-4-16-12-18" opacity=".8" />
    <path d="M25 53h31a5 5 0 0 1 5 5v19a5 5 0 0 1-5 5H43l-6 6-6-6h-6a5 5 0 0 1-5-5V58a5 5 0 0 1 5-5z" />
    <path d="M30 67s5-7 11-7 11 7 11 7-5 7-11 7-11-7-11-7zm11-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
    <path d="M76 16h31a5 5 0 0 1 5 5v19a5 5 0 0 1-5 5H94l-6 6-6-6h-6a5 5 0 0 1-5-5V21a5 5 0 0 1 5-5z" />
    <path d="M82 28c0-4 5-6 7-2 2-4 7-2 7 2 0 5-7 9-7 9s-7-4-7-9z" fill="currentColor" stroke="none" opacity=".65" />
    <path d="M129 59h31a5 5 0 0 1 5 5v19a5 5 0 0 1-5 5h-6l-6 6-6-6h-13a5 5 0 0 1-5-5V64a5 5 0 0 1 5-5zM145 66l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z" />
    <path d="M16 101h6m-3-3v6m38-9h4m-2-2v4m70 5h6m-3-3v6m21-8h4m-2-2v4M63 45h3m61 6h3" opacity=".75" />
    <circle cx="61" cy="111" r="1.5" fill="currentColor" stroke="none" opacity=".55" />
    <circle cx="126" cy="113" r="1.5" fill="currentColor" stroke="none" opacity=".55" />
  </svg>
);

const PropertyNotificationEmptyIllustration = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 180 145"
    className="mb-5 h-auto w-40 text-[#8B735B]"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M27 128h128M72 128V68h48v60M67 68h58l-6-7H73zM82 80h10v14H82zm19 0h10v14h-10zm-19 25h10v13H82zm19 0h10v13h-10zM91 128v-17h10v17" />
    <path d="M58 128V106m0 0c-8-6-7-18 0-22 7 4 8 16 0 22zm0 0-5-6m5 6 5-6M120 128c12 0 19-5 19-13 0-6-4-10-10-10 1-9-3-15-10-17" opacity=".8" />
    <path d="M77 13h28a6 6 0 0 1 6 6v21a6 6 0 0 1-6 6H96l-6 6-6-6h-7a6 6 0 0 1-6-6V19a6 6 0 0 1 6-6z" />
    <path d="M82 34h16m-14-2c2-1 3-4 3-7a5 5 0 0 1 10 0c0 3 1 6 3 7m-11 5c1 2 5 2 6 0M104 21l5-5m-2 11 7-1m-10 8 6 4" />
    <path d="M23 57h29a5 5 0 0 1 5 5v15a5 5 0 0 1-5 5H39l-5 5-5-5h-6a5 5 0 0 1-5-5V62a5 5 0 0 1 5-5z" />
    <circle cx="29" cy="69" r="1.2" fill="currentColor" stroke="none" /><circle cx="38" cy="69" r="1.2" fill="currentColor" stroke="none" /><circle cx="47" cy="69" r="1.2" fill="currentColor" stroke="none" />
    <path d="M27 94h27v34H27zM27 94l6-6h21M34 103h13m-13 7h13m-13 7h10" />
    <path d="M132 62l16 7v12c0 11-7 18-16 22-9-4-16-11-16-22V69zM124 81l6 6 11-13" />
    <path d="M151 104h15v24h-15zm0 5h15m-12-2v4m6-4v4M10 91h6m-3-3v6m46-44h5m-2.5-2.5v5m95 43h6m-3-3v6" opacity=".75" />
    <circle cx="63" cy="91" r="1.5" fill="currentColor" stroke="none" opacity=".55" />
    <circle cx="146" cy="112" r="1.5" fill="currentColor" stroke="none" opacity=".55" />
  </svg>
);

const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
      checked ? "bg-[#8B735B]" : "bg-[#E8DED1]"
    } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
  </button>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-slate-400 font-medium">{hint}</p>}
  </div>
);

const SettingsInput = (props: any) => (
  <input
    {...props}
    className="w-full px-4 py-2.5 rounded-xl border-2 border-[#E8DED1] bg-white text-sm font-semibold text-[#302820] placeholder-[#C9B8A5] focus:outline-none focus:ring-2 focus:ring-[#C9B8A5] focus:border-[#8B735B] transition-all"
  />
);

const SettingsSelect = ({ children, ...props }: any) => (
  <select
    {...props}
    className="w-full px-4 py-2.5 rounded-xl border-2 border-[#E8DED1] bg-white text-sm font-semibold text-[#302820] focus:outline-none focus:ring-2 focus:ring-[#C9B8A5] focus:border-[#8B735B] transition-all"
  >
    {children}
  </select>
);

const SettingsTextarea = (props: any) => (
  <textarea
    {...props}
    className="w-full px-4 py-2.5 rounded-xl border-2 border-[#E8DED1] bg-white text-sm font-semibold text-[#302820] placeholder-[#C9B8A5] focus:outline-none focus:ring-2 focus:ring-[#C9B8A5] focus:border-[#8B735B] transition-all resize-none"
  />
);

const SectionTitle = ({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="h-9 w-9 rounded-xl border border-[#E8DED1] bg-[#FAF8F5] flex items-center justify-center text-[#8B735B] text-base shadow-sm shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="text-base font-black text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
    </div>
  </div>
);

const AlertRow = ({ label, hint, pushVal, onPush }: { label: string; hint?: string; pushVal: boolean; onPush: (v: boolean) => void }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-50 last:border-0">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-slate-800">{label}</p>
      {hint && <p className="text-xs text-slate-400 font-medium mt-0.5">{hint}</p>}
    </div>
    <Toggle checked={pushVal} onChange={onPush} />
  </div>
);

export function LandlordDashboard() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get("section") ?? "overview";
  const [activeSection, setActiveSection] = useState(() => LANDLORD_DASHBOARD_SECTIONS.has(requestedSection) ? requestedSection : "overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [apartmentsRefresh, setApartmentsRefresh] = useState(0);
  const [supportForm, setSupportForm] = useState({
    topic: "",
    message: "",
    contact: user?.email || "",
  });
  const [propertyFilter, setPropertyFilter] = useState<"all" | ApartmentStatus>("all");
  const [propertySort, setPropertySort] = useState<"newest" | "oldest" | "name" | "price-high" | "price-low">("newest");
  const [propertyViewMode, setPropertyViewMode] = useState<"grid" | "list">("grid");
  const [propertyPage, setPropertyPage] = useState(1);
  const [propertiesPerPage, setPropertiesPerPage] = useState(6);
  const [activityRange, setActivityRange] = useState<"today" | "7d" | "30d" | "all">("all");
  const [favoriteRows, setFavoriteRows] = useState<DashboardFavoriteRow[]>([]);
  const [viewRows, setViewRows] = useState<DashboardApartmentViewRow[]>([]);
  const [ratingRows, setRatingRows] = useState<ApartmentRatingRow[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);
  const [favoriteUsers, setFavoriteUsers] = useState<DashboardUserRow[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotificationRow[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notifSearch, setNotifSearch] = useState("");
  const [notifCategory, setNotifCategory] = useState<"all" | "unread" | "reports" | "verification">("all");
  const [notifSort, setNotifSort] = useState<"newest" | "oldest">("newest");
  const [openNotifMenuId, setOpenNotifMenuId] = useState<string | null>(null);
  const [isMarkingAllNotifs, setIsMarkingAllNotifs] = useState(false);

  // Loading states for action prevention
  const [deletingNotifId, setDeletingNotifId] = useState<string | null>(null);
  const [deletingApartmentId, setDeletingApartmentId] = useState<string | null>(null);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isLoadingApartments, setIsLoadingApartments] = useState(true);
  const [isLoadingActivityData, setIsLoadingActivityData] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  useEffect(() => {
    if (LANDLORD_DASHBOARD_SECTIONS.has(requestedSection)) {
      setActiveSection(requestedSection);
    }
  }, [requestedSection]);

  const deleteNotif = async (notificationId: string) => {
    if (deletingNotifId === notificationId) {
      toast.error("Deletion in progress...");
      return;
    }
    if (!user?.id) return;
    setDeletingNotifId(notificationId);
    try {
      const deleted = await deleteNotification(notificationId, user.id);
      if (!deleted) {
        toast.error("Unable to delete notification.");
        return;
      }
      setNotifications((previous) => previous.filter((notification) => notification.id !== notificationId));
      setUnreadNotificationCount((previous) => Math.max(0, previous - (notifications.some((notification) => notification.id === notificationId && !(notification.read ?? notification.is_read)) ? 1 : 0)));
      setOpenNotifMenuId(null);
      toast.success("Notification deleted.");
    } finally {
      setDeletingNotifId(null);
    }
  };

  const toggleNotifReadStatus = async (notificationId: string, isCurrentlyRead: boolean) => {
    if (!user?.id) return;
    const updated = isCurrentlyRead
      ? await markNotificationUnread(notificationId, user.id)
      : await markNotificationRead(notificationId, user.id);
    if (!updated) {
      toast.error("Unable to update notification status.");
      return;
    }
    setNotifications((previous) => previous.map((notification) => notification.id === notificationId ? { ...notification, ...updated, read: !isCurrentlyRead, is_read: !isCurrentlyRead } : notification));
    setUnreadNotificationCount((previous) => Math.max(0, previous + (isCurrentlyRead ? 1 : -1)));
    setOpenNotifMenuId(null);
  };

  const markAllLandlordNotificationsRead = async () => {
    if (!user?.id || isMarkingAllNotifs) return;
    const unread = notifications.filter((notification) => !(notification.read ?? notification.is_read));
    if (unread.length === 0) return;
    setIsMarkingAllNotifs(true);
    try {
      const updatedCount = await markAllNotificationsRead(user.id);
      if (updatedCount === 0) {
        toast.error("Unable to mark notifications as read.");
        return;
      }
      setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true, is_read: true, read_at: notification.read_at ?? new Date().toISOString() })));
      setUnreadNotificationCount(0);
      toast.success("All notifications marked as read.");
    } finally {
      setIsMarkingAllNotifs(false);
    }
  };

  const [appealModal, setAppealModal] = useState<{
    open: boolean;
    appealId: string | null;
    notificationId: string | null;
    apartmentId: string | null;
    apartmentTitle: string;
    reportId: string | null;
    violationId: string | null;
    relatedType: "report" | "violation" | "notice" | "admin_message";
    relatedLabel: string;
  }>({ open: false, appealId: null, notificationId: null, apartmentId: null, apartmentTitle: "", reportId: null, violationId: null, relatedType: "admin_message", relatedLabel: "" });
  const [appealMessage, setAppealMessage] = useState("");
  const [appealContact, setAppealContact] = useState(user?.email || "");
  const [appealEvidence, setAppealEvidence] = useState<EvidenceFile[]>([]);
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [landlordAppeals, setLandlordAppeals] = useState<DashboardAppealRow[]>([]);
  const [selectedNotificationDetail, setSelectedNotificationDetail] = useState<{
    notification: DashboardNotificationRow;
    violation: DashboardViolationRow | null;
    appeal: DashboardAppealRow | null;
  } | null>(null);

  const closeAppealModal = () => {
    setAppealModal({ open: false, appealId: null, notificationId: null, apartmentId: null, apartmentTitle: "", reportId: null, violationId: null, relatedType: "admin_message", relatedLabel: "" });
    setAppealMessage("");
    setAppealEvidence([]);
    setIsSubmittingAppeal(false);
  };

  const getAppealMetadata = (appeal: DashboardAppealRow, kind: string) => {
    const documents = Array.isArray(appeal.supporting_docs) ? appeal.supporting_docs : [];
    return [...documents].reverse().find((entry) => entry && typeof entry === "object" && !Array.isArray(entry) && (entry as Record<string, unknown>).kind === kind) as Record<string, unknown> | undefined;
  };

  const openAppealForNotification = (detail: NonNullable<typeof selectedNotificationDetail>) => {
    const payload = detail.notification.payload ?? {};
    const violation = detail.violation;
    const source = detail.appeal ? getAppealMetadata(detail.appeal, "source") : undefined;
    const violationId = String(payload.violation_id ?? violation?.id ?? detail.appeal?.violation_id ?? "") || null;
    const reportId = String(payload.report_id ?? payload.related_report_id ?? violation?.related_report_id ?? detail.appeal?.report_id ?? "") || null;
    const apartmentId = String(payload.apartment_id ?? violation?.apartment_id ?? source?.apartment_id ?? "") || null;
    const apartment = myApartments.find((item) => item.id === apartmentId);
    const apartmentTitle = String(payload.apartment_title ?? source?.apartment_title ?? apartment?.title ?? "Apartment unavailable");
    const relatedType = detail.notification.type === "notice_issued"
      ? "notice"
      : violationId ? "violation" : reportId ? "report" : "admin_message";
    const relatedLabel = relatedType === "notice"
      ? `Notice ${violationId ?? ""}`.trim()
      : relatedType === "violation"
        ? `Violation ${violationId ?? ""}`.trim()
        : relatedType === "report"
          ? `Report ${reportId ?? ""}`.trim()
          : `Admin message ${detail.notification.id ?? ""}`.trim();

    setAppealContact(user?.email || "");
    setAppealModal({
      open: true,
      appealId: detail.appeal?.status === "needs_information" ? detail.appeal.id ?? null : null,
      notificationId: detail.notification.id ?? null,
      apartmentId,
      apartmentTitle,
      reportId,
      violationId,
      relatedType,
      relatedLabel,
    });
  };

  const [modal, setModal] = useState<{
    open: boolean;
    type: "views" | "favorites";
    names: string[];
    aptTitle: string;
  }>({ open: false, type: "views", names: [], aptTitle: "" });

  const openViewers = (aptId: string, aptTitle: string, count: number) => {
    const names = viewRows
      .filter((view) => (view.apartment_id ?? view.apartmentId) === aptId)
      .map((view) => {
        const viewer = favoriteUsers.find((entry) => entry.id === (view.viewer_id ?? view.viewerId));
        return viewer?.name
          ? `${viewer.name} (${viewer.role ?? "viewer"})`
          : (view.viewer_id ?? view.viewerId) ? `User ${(view.viewer_id ?? view.viewerId)?.slice(0, 8)}` : "Anonymous viewer";
      });
    setModal({ open: true, type: "views", names: names.slice(0, count || names.length), aptTitle });
  };
  const openFavoriters = (aptId: string, aptTitle: string, count: number) => {
    const names = favoriteRows
      .filter((favorite) => (favorite.apartment_id ?? favorite.apartmentId) === aptId)
      .map((favorite) => {
        const favoriteUser = favoriteUsers.find((entry) => entry.id === (favorite.user_id ?? favorite.userId));
        return favoriteUser?.name
          ? `${favoriteUser.name} (${favoriteUser.role ?? "tenant"})`
          : (favorite.user_id ?? favorite.userId) ? `User ${(favorite.user_id ?? favorite.userId)?.slice(0, 8)}` : "Account unavailable";
      });
    setModal({ open: true, type: "favorites", names: names.slice(0, count || names.length), aptTitle });
  };
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const handleSupportSubmit = async () => {
    if (isSubmittingSupport) return;
    if (!supportForm.topic || !supportForm.message.trim() || !supportForm.contact.trim()) {
      toast.error("Please choose a topic and describe your concern.");
      return;
    }
    if (!validateEmail(supportForm.contact.trim())) {
      toast.error("Please enter a valid contact email address.");
      return;
    }
    if (!user?.id) return void toast.error("Please sign in again before sending a support request.");
    setIsSubmittingSupport(true);
    try {
      const ticket = await createSupportTicket({
        userId: user.id,
        topic: supportForm.topic,
        message: supportForm.message,
        contact: supportForm.contact,
      });
      if (!ticket?.id) throw new Error("Unable to save the support request.");
      setSupportSubmitted(true);
      setSupportForm({ topic: "", message: "", contact: profile.email || user.email || "" });
      toast.success("Support request sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send the support request.");
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const [myApartments, setMyApartments] = useState<any[]>([]);
  const ratingSummary = useMemo(() => summarizeApartmentRatings(ratingRows), [ratingRows]);

  useEffect(() => {
    let active = true;
    const apartmentIds = myApartments.map((apartment) => apartment.id).filter(Boolean);
    const loadRatings = () => fetchRatingsForApartments(apartmentIds)
      .then((rows) => {
        if (!active) return;
        setRatingRows(rows);
        setRatingsLoading(false);
      })
      .catch((error) => {
        // Keep the last valid aggregates during temporary network/realtime failures.
        console.error("Failed to load landlord apartment ratings:", error);
        if (active) setRatingsLoading(false);
      });
    void loadRatings();
    const unsubscribe = subscribeToApartmentRatings(loadRatings);
    return () => { active = false; unsubscribe(); };
  }, [myApartments]);

  useEffect(() => {
    let active = true;

    const loadLandlordApartments = async () => {
      if (!user?.id) {
        setMyApartments([]);
        setIsLoadingApartments(false);
        return;
      }

      setIsLoadingApartments(true);
      try {
        const apartments = await fetchApartmentsForLandlord(user.id);
        if (active) {
          setMyApartments(apartments);
        }
      } catch (error) {
        console.error("Failed to load landlord apartments:", error);
        if (active) {
          setMyApartments([]);
        }
      } finally {
        if (active) setIsLoadingApartments(false);
      }
    };

    void loadLandlordApartments();

    return () => {
      active = false;
    };
  }, [user?.id, apartmentsRefresh]);

  useEffect(() => {
    if (!user?.id) return;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => setApartmentsRefresh((current) => current + 1), 100);
    };
    const channel = supabase
      .channel(`landlord-properties-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "apartments", filter: `landlord_id=eq.${user.id}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_rooms" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_images" }, scheduleRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "app_users", filter: `id=eq.${user.id}` }, scheduleRefresh)
      .subscribe();
    const refreshOnFocus = () => scheduleRefresh();
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    const apartmentIds = myApartments.map((apartment) => apartment.id).filter(Boolean);

    const loadActivityData = async () => {
      setIsLoadingActivityData(true);
      try {
        const [favorites, views, ratings, users] = await Promise.all([
          fetchFavoritesForApartments(apartmentIds),
          fetchViewActivityForApartments(apartmentIds),
          fetchRatingsForApartments(apartmentIds),
          fetchUsers(),
        ]);
        if (active) {
          setFavoriteRows(favorites);
          setViewRows(views);
          setRatingRows(ratings);
          setFavoriteUsers(users);
        }
      } catch (error) {
        console.error("Failed to load landlord activity data:", error);
        if (active) {
          setFavoriteRows([]);
          setViewRows([]);
          setFavoriteUsers([]);
        }
      } finally {
        if (active) setIsLoadingActivityData(false);
      }
    };

    void loadActivityData();

    const channel = supabase
      .channel("landlord-apartment-views")
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_views" }, () => {
        void fetchViewActivityForApartments(apartmentIds)
          .then((views) => {
            if (active) setViewRows(views);
          })
          .catch((error) => console.error("Failed to refresh apartment views:", error));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites" }, () => {
        void fetchFavoritesForApartments(apartmentIds)
          .then((favorites) => {
            if (active) setFavoriteRows(favorites);
          })
          .catch((error) => console.error("Failed to refresh apartment favorites:", error));
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [apartmentsRefresh, myApartments]);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      if (!user?.id) {
        setNotifications([]);
        setUnreadNotificationCount(0);
        setIsLoadingNotifications(false);
        return;
      }

      setIsLoadingNotifications(true);
      try {
        const notifs = await fetchNotifications(user.id);
        if (active) {
          setNotifications(notifs);
          const unreadCount = notifs.filter((n) => !n.read).length;
          setUnreadNotificationCount(unreadCount);
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
        if (active) {
          setNotifications([]);
          setUnreadNotificationCount(0);
        }
      } finally {
        if (active) setIsLoadingNotifications(false);
      }
    };

    void loadNotifications();

    const notificationChannel = user?.id
      ? supabase
          .channel(`landlord-notifications-${user.id}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
            () => void loadNotifications(),
          )
          .subscribe()
      : null;
    const refreshOnFocus = () => void loadNotifications();
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshOnFocus);
      if (notificationChannel) void supabase.removeChannel(notificationChannel);
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setLandlordAppeals([]);
      return () => { active = false; };
    }

    const loadAppeals = async () => {
      const rows = await fetchAppealsByLandlord(user.id);
      if (active) setLandlordAppeals(rows);
    };
    void loadAppeals();
    const channel = supabase
      .channel(`landlord-appeals-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appeals", filter: `landlord_id=eq.${user.id}` }, () => void loadAppeals())
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleNotificationClick = async (notification: DashboardNotificationRow) => {
    // Mark as read
    if (!(notification.read ?? notification.is_read) && notification.id) {
      const updated = await markNotificationRead(notification.id, user?.id);
      if (updated) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, ...updated, read: true, is_read: true } : n))
        );
        setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
      } else {
        toast.error("Unable to mark notification as read.");
      }
    }

    const payload = notification.payload as Record<string, any>;
    const appealableTypes = new Set(["admin_message", "property_reported", "violation_issued", "notice_issued", "appeal_status_updated"]);
    if (appealableTypes.has(String(notification.type))) {
      let violation: DashboardViolationRow | null = null;
      if (payload?.violation_id) {
        const rows = await fetchViolations();
        violation = rows.find((row) => row.id === payload.violation_id) ?? null;
      }
      const appealId = String(payload?.appeal_id ?? "");
      const appeal = appealId
        ? landlordAppeals.find((row) => row.id === appealId) ?? (await fetchAppealsByLandlord(user?.id ?? "")).find((row) => row.id === appealId) ?? null
        : null;
      setSelectedNotificationDetail({ notification, violation, appeal });
      setActiveSection("notifications");
      return;
    }

    // Handle navigation based on notification type
    switch (notification.type) {
      case "property_reported":
        navigate(`/dashboard?section=notifications&report=${payload?.report_id || ""}`);
        break;
      case "violation_issued":
        navigate(`/dashboard?section=notifications&violation=${payload?.violation_id || ""}`);
        break;
      case "appeal_status_updated":
        navigate(`/dashboard?section=notifications&appeal=${payload?.appeal_id || ""}`);
        break;
      default:
        if (payload?.apartment_id && propertyIds.has(String(payload.apartment_id))) {
          navigate(`/apartment/${payload.apartment_id}`, { state: { returnTo: "/dashboard?section=notifications", backLabel: "Back to Notifications" } });
        } else {
          setActiveSection("notifications");
        }
    }
  };

  const refreshApartments = () => {
    setApartmentsRefresh((prev) => prev + 1);
  };

  const getRoomStatus = (room: any): ApartmentStatus => room.status ?? (room.isOccupied ? "occupied" : "available");
  const getApartmentStatus = (apartment: any): ApartmentStatus => {
    const rooms = apartment.rooms ?? [];
    if (rooms.length === 0) {
      return apartment.status ?? "available";
    }
    if (rooms.some((room: any) => getRoomStatus(room) === "available")) {
      return "available";
    }
    if (rooms.every((room: any) => getRoomStatus(room) === "occupied")) {
      return "occupied";
    }
    if (rooms.some((room: any) => getRoomStatus(room) === "maintenance")) {
      return "maintenance";
    }
    return apartment.status ?? "available";
  };
  const allRooms = myApartments.flatMap((apt: any) => apt.rooms ?? []);
  const unitStatuses: ApartmentStatus[] = allRooms.length > 0
    ? allRooms.map(getRoomStatus)
    : myApartments.map(getApartmentStatus);
  const availableCount = unitStatuses.filter((status) => status === "available").length;
  const occupiedCount  = unitStatuses.filter((status) => status === "occupied").length;
  const totalUnits = unitStatuses.length;
  const propertyIds = new Set(myApartments.map((apartment) => apartment.id));
  const landlordFavoriteRows = favoriteRows.filter((favorite) => propertyIds.has(favorite.apartment_id ?? favorite.apartmentId ?? ""));
  const landlordViewRows = viewRows.filter((view) => propertyIds.has(view.apartment_id ?? view.apartmentId ?? ""));
  const landlordAccount = favoriteUsers.find((entry) => entry.id === user?.id);
  const landlordVerified = landlordAccount?.isVerified ?? landlordAccount?.is_verified ?? user?.isVerified ?? false;
  const landlordPermit = landlordAccount?.permit_number ?? landlordAccount?.permitNumber ?? user?.permitNumber ?? "";
  const getViewWeight = (view: DashboardApartmentViewRow) => Math.max(0, Number(view.view_count) || 0);
  const totalViews     = landlordViewRows.reduce((total, view) => total + getViewWeight(view), 0);
  const totalFavorites = landlordFavoriteRows.length;
  const occupancyRate  = myApartments.length > 0
    ? Math.round((occupiedCount / (totalUnits || myApartments.length)) * 100)
    : 0;

  const aptViews = (aptId: string) => {
    return viewRows
      .filter((view) => (view.apartment_id ?? view.apartmentId) === aptId)
      .reduce((total, view) => total + getViewWeight(view), 0);
  };
  const aptFavs = (aptId: string) => {
    return favoriteRows.filter((favorite) => (favorite.apartment_id ?? favorite.apartmentId) === aptId).length;
  };
  const filteredApartments = useMemo(() => {
    const filtered = propertyFilter === "all"
      ? [...myApartments]
      : myApartments.filter((apartment) => getApartmentStatus(apartment) === propertyFilter);

    return filtered.sort((left, right) => {
      if (propertySort === "name") return String(left.title ?? "").localeCompare(String(right.title ?? ""));
      if (propertySort === "price-high") return Number(right.price ?? 0) - Number(left.price ?? 0);
      if (propertySort === "price-low") return Number(left.price ?? 0) - Number(right.price ?? 0);
      const leftTime = new Date(left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.createdAt ?? 0).getTime();
      return propertySort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [myApartments, propertyFilter, propertySort]);
  const propertyPageCount = Math.max(1, Math.ceil(filteredApartments.length / propertiesPerPage));
  const safePropertyPage = Math.min(propertyPage, propertyPageCount);
  const paginatedApartments = filteredApartments.slice((safePropertyPage - 1) * propertiesPerPage, safePropertyPage * propertiesPerPage);

  useEffect(() => {
    setPropertyPage(1);
  }, [propertyFilter, propertySort, propertiesPerPage]);

  const handleTogglePublication = async (apartmentId: string, nextValue: boolean) => {
    try {
      await updateApartmentPublication(apartmentId, nextValue, user?.id);
      refreshApartments();
      toast.success(nextValue ? "Listing published" : "Listing unpublished");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update listing.";
      toast.error(message);
    }
  };

  const handleDeleteApartment = async (apartmentId: string) => {
    if (deletingApartmentId === apartmentId) {
      toast.error("Deletion in progress...");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
      return;
    }

    setDeletingApartmentId(apartmentId);
    try {
      await deleteApartmentInDb(apartmentId);
      refreshApartments();
      toast.success("Listing deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete listing.";
      toast.error(message);
    } finally {
      setDeletingApartmentId(null);
    }
  };

  const handleSaveEditedApartment = async (updatedApartment: Apartment, images: import("@/app/shared/components/common/MultiImageUploader").UploadedImage[]) => {
    if (!editingApartment) return;

    try {
      await updateApartment(
        editingApartment.id,
        apartmentToFormValues({
          ...updatedApartment,
          id: editingApartment.id,
          landlordId: editingApartment.landlordId,
        }),
        user?.id,
      );
      const saved = await persistApartmentImages(editingApartment.id, images, user?.id);
      setMyApartments((previous) =>
        previous.map((apartment) => apartment.id === editingApartment.id ? saved : apartment),
      );
      refreshApartments();
      setEditingApartment(null);
      toast.success("Property updated successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update property.";
      toast.error(message);
      throw error;
    }
  };

  // ── Settings state ───────────────────────────────────────────────────────
  type LandlordProfile = {
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    bio: string;
    avatar: string;
  };

  const [profile, setProfile] = useState<LandlordProfile>(() => {
    return {
      firstName: user?.name?.split(" ")[0] || "",
      lastName: user?.name?.split(" ").slice(1).join(" ") || "",
      email: user?.email || "",
      mobile: user?.mobileNumber || "",
      bio: "",
      avatar: "",
    };
  });

  type LandlordAlerts = {
    reviewPush: boolean;
    reportPush: boolean;
    violationPush: boolean;
    listingPush: boolean;
    systemPush: boolean;
    permitPush: boolean;
    digest: string;
    quietStart: string;
    quietEnd: string;
    quietEnabled: boolean;
  };

  const [alerts, setAlerts] = useState<LandlordAlerts>(() => {
    return {
      reviewPush: true,
      reportPush: true,
      violationPush: true,
      listingPush: true,
      systemPush: false,
      permitPush: false,
      digest: "daily",
      quietStart: "22:00",
      quietEnd: "07:00",
      quietEnabled: true,
    };
  });

  type LandlordBusiness = {
    businessName: string;
    taxId: string;
    businessType: string;
    yearsActive: string;
  };

  const [business, setBusiness] = useState<LandlordBusiness>(() => {
    return {
      businessName: "",
      taxId: "",
      businessType: "sole_proprietor",
      yearsActive: "",
    };
  });

  type SecurityDevice = {
    id: number;
    name: string;
    location: string;
    lastActive: string;
    current: boolean;
  };

  type LandlordSecurity = {
    twoFactor: boolean;
    twoFactorMethod: string;
    loginAlerts: boolean;
    sessionTimeout: string;
    trustedDevices: boolean;
    activeDevices: SecurityDevice[];
    passwordLastChanged: string;
    recoveryEmail: string;
    recoveryMobile: string;
    dataSharing: boolean;
    analyticsConsent: boolean;
    profileIndexing: boolean;
  };

  const [security, setSecurity] = useState<LandlordSecurity>(() => {
    return {
      twoFactor: false,
      twoFactorMethod: "sms",
      loginAlerts: true,
      sessionTimeout: "30",
      trustedDevices: true,
      activeDevices: [],
      passwordLastChanged: "",
      recoveryEmail: "",
      recoveryMobile: "",
      dataSharing: false,
      analyticsConsent: true,
      profileIndexing: true,
    };
  });

  const [savedProfile, setSavedProfile] = useState(profile);
  const [savedBusiness, setSavedBusiness] = useState(business);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSettingsData = async () => {
      if (!user?.id) return;
      const [userRow, landlordRow, preferenceSections, mfaFactors] = await Promise.all([
        fetchUserById(user.id),
        fetchLandlordProfile(user.id),
        fetchUserPreferenceSections(user.id),
        supabase.auth.mfa.listFactors(),
      ]);
      if (!active) return;
      const fullName = (userRow?.name || user.name || "").trim().split(/\s+/).filter(Boolean);
      const nextProfile: LandlordProfile = {
        firstName: fullName[0] || "",
        lastName: fullName.slice(1).join(" "),
        email: userRow?.email || user.email || "",
        mobile: userRow?.mobile || userRow?.mobileNumber || user.mobileNumber || "",
        bio: userRow?.bio || "",
        avatar: userRow?.avatar_url || user.avatar || "",
      };
      const nextBusiness: LandlordBusiness = {
        businessName: String(landlordRow?.business_name ?? ""),
        taxId: String(landlordRow?.tin_number ?? ""),
        businessType: String(landlordRow?.business_type ?? "sole_proprietor"),
        yearsActive: landlordRow?.years_active == null ? "" : String(landlordRow.years_active),
      };
      setProfile(nextProfile);
      setSavedProfile(nextProfile);
      setSupportForm((current) => ({ ...current, contact: current.contact.trim() ? current.contact : nextProfile.email }));
      setBusiness(nextBusiness);
      setSavedBusiness(nextBusiness);
      if (preferenceSections.landlordAlerts && typeof preferenceSections.landlordAlerts === "object" && !Array.isArray(preferenceSections.landlordAlerts)) {
        setAlerts((current) => ({ ...current, ...preferenceSections.landlordAlerts as Partial<LandlordAlerts> }));
      }
      if (preferenceSections.landlordSecurity && typeof preferenceSections.landlordSecurity === "object" && !Array.isArray(preferenceSections.landlordSecurity)) {
        setSecurity((current) => ({
          ...current,
          ...preferenceSections.landlordSecurity as Partial<LandlordSecurity>,
          twoFactor: mfaFactors.data?.totp.some((factor) => factor.status === "verified") ?? false,
          activeDevices: [],
        }));
      } else {
        setSecurity((current) => ({
          ...current,
          twoFactor: mfaFactors.data?.totp.some((factor) => factor.status === "verified") ?? false,
          activeDevices: [],
        }));
      }
    };
    void loadSettingsData();
    return () => { active = false; };
  }, [user?.id]);

  const updateProfile = (updater: (prev: typeof profile) => typeof profile) => {
    setProfile(updater);
  };

  const setA = (key: string, val: unknown) => {
    setAlerts((p) => {
      const updated = { ...p, [key]: val };
      return updated;
    });
  };

  const setB = (key: string, val: string) => {
    setBusiness((p) => {
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

  const handleUpdateProfile = async () => {
    // Prevent duplicate submissions
    if (isUpdatingProfile) {
      toast.error("Please wait for your update to complete...");
      return;
    }
    
    // Validation
    if (!profile.firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!profile.lastName.trim()) {
      toast.error("Last name is required");
      return;
    }
    if (!profile.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!validateEmail(profile.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!profile.mobile.trim()) {
      toast.error("Mobile number is required");
      return;
    }
    if (!validatePhoneNumber(profile.mobile)) {
      toast.error("Please enter a valid Philippine phone number (09XXXXXXXXX)");
      return;
    }
    if (profile.bio.length > 300) {
      toast.error("Bio cannot exceed 300 characters");
      return;
    }

    setIsUpdatingProfile(true);
    if (user) {
      try {
        const updatedUser = {
          ...user,
          name: `${profile.firstName.trim()} ${profile.lastName.trim()}`,
          email: profile.email.trim(),
          mobileNumber: profile.mobile.trim(),
        };

        await updateUser(user.id, {
          name: updatedUser.name,
          email: updatedUser.email,
          mobileNumber: updatedUser.mobileNumber,
        });

        const synced = await updateUserProfile({
          id: user.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: "landlord",
          mobile: updatedUser.mobileNumber,
          avatar_url: profile.avatar,
          bio: profile.bio,
        });

        if (!synced) {
          throw new Error("Unable to sync profile information.");
        }

        setSavedProfile(profile);

        addAuditLog("PROFILE_UPDATED", `Updated profile information`);
        toast.success("Profile updated successfully!");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save profile information.";
        toast.error(message);
      } finally {
        setIsUpdatingProfile(false);
      }
    }
  };

  const handleSaveAlerts = async () => {
    if (!user) return;
    try {
      await saveUserPreferenceSection(user.id, "landlordAlerts", alerts);
      addAuditLog("ALERT_PREFERENCES_UPDATED", "Updated notification and alert preferences");
      toast.success("Alert preferences saved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save alert preferences.");
    }
  };

  const handleSaveBusiness = async () => {
    if (business.taxId.trim() && !/^\d{3}-\d{3}-\d{3}-\d{3}$/.test(business.taxId)) {
      toast.error("Please enter a valid BIR TIN (XXX-XXX-XXX-000)");
      return;
    }

    if (user) {
      try {
        await updateUser(user.id, {
          name: user.name,
          email: user.email,
        });

        const synced = await updateUserProfile({
          id: user.id,
          email: user.email,
          name: user.name,
          role: "landlord",
          business_name: business.businessName,
          tin_number: business.taxId,
          business_type: business.businessType,
          years_active: business.yearsActive,
        });

        if (!synced) {
          throw new Error("Unable to sync business information.");
        }

        addAuditLog("BUSINESS_INFO_UPDATED", "Updated landlord-level business information");
        setSavedBusiness(business);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save business information.";
        toast.error(message);
        return;
      }
    }
    toast.success("Business information saved!");
  };

  const handleSaveSecurity = async () => {
    // Validation
    if (security.recoveryEmail && !validateEmail(security.recoveryEmail)) {
      toast.error("Please enter a valid recovery email address");
      return;
    }
    if (security.recoveryMobile && !validatePhoneNumber(security.recoveryMobile)) {
      toast.error("Please enter a valid recovery phone number");
      return;
    }
    if (security.recoveryEmail === security.recoveryEmail) {
      // They're different (profile email is not security recovery email)
      if (security.recoveryEmail && security.recoveryEmail.trim()) {
        // Valid recovery email set
      }
    }

    if (!user) return;
    try {
      const { activeDevices: _activeDevices, ...persistentSecurity } = security;
      await saveUserPreferenceSection(user.id, "landlordSecurity", persistentSecurity);
      addAuditLog("SECURITY_SETTINGS_UPDATED", "Updated security preferences");
      toast.success("Security settings saved successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save security preferences.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
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

  const handleLogout = () => {
    logout?.();
    navigate("/");
  };

  // ── Session Management ───────────────────────────────────────────────────
  const addAuditLog = (action: string, details: string) => {
    if (user?.id) {
      void createAuditLog({
        admin_id: user.id,
        action: action.toLowerCase(),
        target_type: "user",
        target_id: user.id,
        details: { summary: details },
      });
    }
  };

  // ── Password Validation ──────────────────────────────────────────────────
  const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter");
    if (!/[0-9]/.test(password)) errors.push("At least one number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("At least one special character");
    return { valid: errors.length === 0, errors };
  };

  // ── 2FA Setup ────────────────────────────────────────────────────────────
  // ── Email Validation ─────────────────────────────────────────────────────
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ── Phone Validation ─────────────────────────────────────────────────────
  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^09\d{9}$|^\+639\d{9}$/;
    return phoneRegex.test(phone);
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────

  // ── Section: Settings (full version from File 2) ─────────────────────────
  const [settingsTab, setSettingsTab] = useState("profile");
  const [passwordState, setPasswordState] = useState({
    current: "",
    new: "",
    confirm: "",
    showCurrent: false,
    showNew: false,
    showConfirm: false,
    isChanging: false,
  });
  const [twoFAState, setTwoFAState] = useState({
    setupMode: false,
    factorId: "",
    secret: "",
    verificationCode: "",
    confirmed: false,
    isVerifying: false,
  });

  // ── Password Change Handler ──────────────────────────────────────────────
  const handlePasswordChange = async () => {
    if (!passwordState.current.trim()) {
      toast.error("Please enter your current password");
      return;
    }

    if (passwordState.new !== passwordState.confirm) {
      toast.error("New passwords do not match");
      return;
    }

    const validation = validatePassword(passwordState.new);
    if (!validation.valid) {
      toast.error("Password must have: " + validation.errors.join(", "));
      return;
    }

    if (passwordState.new === passwordState.current) {
      toast.error("New password must be different from current password");
      return;
    }

    setPasswordState((p) => ({ ...p, isChanging: true }));

    try {
      if (user) {
        await updateUser(user.id, { password: passwordState.new });
      }

      addAuditLog("PASSWORD_CHANGED", "Password successfully changed");
      toast.success("Password changed successfully!");

      // Clear password form
      setPasswordState({
        current: "",
        new: "",
        confirm: "",
        showCurrent: false,
        showNew: false,
        showConfirm: false,
        isChanging: false,
      });
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password");
      addAuditLog("PASSWORD_CHANGE_ERROR", "System error during password change");
    }
  };

  // ── 2FA Setup Handler ────────────────────────────────────────────────────
  const handleSetup2FA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "RentIloilo authenticator",
      });
      if (error) throw error;
      setTwoFAState((prev) => ({
        ...prev,
        setupMode: true,
        factorId: data.id,
        secret: data.totp.secret,
        verificationCode: "",
        confirmed: false,
      }));
      addAuditLog("2FA_SETUP_INITIATED", "User started 2FA setup process");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start 2FA setup.");
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFAState.verificationCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    setTwoFAState((prev) => ({ ...prev, isVerifying: true }));

    try {
      if (!twoFAState.factorId) throw new Error("The 2FA enrollment session has expired. Please start again.");
      const { error: verificationError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: twoFAState.factorId,
        code: twoFAState.verificationCode,
      });
      if (verificationError) throw verificationError;

      if (!user?.id) throw new Error("Authenticated landlord profile not found.");
      const backupCodes = await generateBackupCodes();
      const nextSecurity = { ...security, twoFactor: true };
      const { activeDevices: _activeDevices, ...persistentSecurity } = nextSecurity;
      await saveUserPreferenceSection(user.id, "landlordSecurity", persistentSecurity);
      setSecurity(nextSecurity);

      addAuditLog("2FA_ENABLED", "Two-factor authentication successfully enabled");
      const codeText = backupCodes.join("\n");
      let copied = false;
      try {
        await navigator.clipboard.writeText(codeText);
        copied = true;
      } catch {
        // The one-time prompt below still allows an explicit manual copy.
      }
      window.prompt(
        `Backup codes are shown only once${copied ? " and have been copied to your clipboard" : ""}. Save them securely, then close this dialog:`,
        codeText,
      );
      toast.success("2FA enabled. Your one-time backup codes are no longer retained by this page.");

      setTwoFAState({
        setupMode: false,
        factorId: "",
        secret: "",
        verificationCode: "",
        confirmed: true,
        isVerifying: false,
      });
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      toast.error("Failed to enable 2FA");
      addAuditLog("2FA_SETUP_ERROR", "System error during 2FA setup");
      setTwoFAState((prev) => ({ ...prev, isVerifying: false }));
    }
  };

  const handleCancel2FASetup = () => {
    if (twoFAState.factorId) void supabase.auth.mfa.unenroll({ factorId: twoFAState.factorId });
    setTwoFAState({
      setupMode: false,
      factorId: "",
      secret: "",
      verificationCode: "",
      confirmed: false,
      isVerifying: false,
    });
  };

  const renderSettings = () => {
    // ── Profile Tab ────────────────────────────────────────────────────────
    const renderProfileTab = () => (
      <div className="grid gap-5">
        {/* Avatar */}
        <div className="flex flex-col gap-5 rounded-lg border border-[#E8DED1] bg-[#FAF8F5] p-6 shadow-sm sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#8B735B] text-3xl font-black text-white shadow-lg">
            {profile.avatar ? <img src={profile.avatar} alt={`${profile.firstName || "Landlord"} profile`} className="h-full w-full object-cover" /> : (profile.firstName[0] || "L").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-black text-slate-950">{`${profile.firstName} ${profile.lastName}`.trim() || "Not provided"}</p>
            <p className="mb-4 text-sm font-medium text-slate-500">{profile.email || "Email not provided"}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={isUploadingProfilePhoto} onClick={() => profilePhotoInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-md bg-[#8B735B] px-4 py-2 text-xs font-black text-white hover:bg-[#756A60] disabled:opacity-50"><Camera className="h-4 w-4" />{isUploadingProfilePhoto ? "Uploading..." : "Upload Photo"}</button>
              <button type="button" disabled={!profile.avatar || isUploadingProfilePhoto} onClick={() => void handleRemoveProfilePhoto()} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50">Remove Photo</button>
              <input ref={profilePhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void handleProfilePhoto(event.target.files?.[0])} />
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle icon="👤" title="Personal Information" subtitle="Your public-facing landlord profile" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name">
              <SettingsInput value={profile.firstName} onChange={(e: any) => updateProfile(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" />
            </Field>
            <Field label="Last Name">
              <SettingsInput value={profile.lastName} onChange={(e: any) => updateProfile(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
            </Field>
          </div>
          <Field label="Email Address" hint="Used for account login and notifications">
            <SettingsInput type="email" value={profile.email} onChange={(e: any) => updateProfile(p => ({ ...p, email: e.target.value }))} placeholder="you@email.com" />
          </Field>
          <Field label="Mobile Number" hint="Visible to tenants if enabled in Business settings">
            <SettingsInput type="tel" value={profile.mobile} onChange={(e: any) => updateProfile(p => ({ ...p, mobile: e.target.value }))} placeholder="09XXXXXXXXX" />
          </Field>
          <Field label="Bio / About You" hint="Shown on your landlord profile page (max 300 characters)">
            <SettingsTextarea rows={3} value={profile.bio} onChange={(e: any) => updateProfile(p => ({ ...p, bio: e.target.value.slice(0, 300) }))} placeholder="Tell tenants about yourself…" />
            <p className="text-[11px] text-slate-400 font-medium text-right">{profile.bio.length}/300</p>
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setProfile(savedProfile)} className="rounded-md font-bold"><RotateCcw className="mr-2 h-4 w-4" />Reset Changes</Button>
          <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="rounded-md bg-[#8B735B] font-bold text-white hover:bg-[#756A60]">{isUpdatingProfile ? "Saving..." : "Save Changes"}</Button>
        </div>
      </div>
    );

    // ── Alerts Tab ─────────────────────────────────────────────────────────
    const renderAlertsTab = () => (
      <div className="space-y-5">
        {/* Tenant Activity */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5">
          <SectionTitle icon="🏠" title="Tenant Activity" subtitle="In-app reminders when tenants interact with your listings" />
          <AlertRow label="Listing Added to Favorites" hint="A tenant saves your apartment to their Favorites." pushVal={alerts.reviewPush} onPush={(v) => setA("reviewPush", v)} />
          <AlertRow label="Listing Appears in Suggested or Popular" hint="Your unit is being surfaced to tenants in their dashboard" pushVal={alerts.listingPush} onPush={(v) => setA("listingPush", v)} />
        </div>

        {/* Admin & Compliance */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5">
          <SectionTitle icon="⚠️" title="Admin & Compliance" subtitle="Reports, violations, and notices from platform administrators" />
          <AlertRow label="Report Filed Against Listing" hint="A tenant submits a report about your unit" pushVal={alerts.reportPush} onPush={(v) => setA("reportPush", v)} />
          <AlertRow label="Violation / Notice Issued" hint="Admin issues a formal violation or notice" pushVal={alerts.violationPush} onPush={(v) => setA("violationPush", v)} />
          <AlertRow label="Permit Verification Reminder" hint="30-day reminder before your business permit expires" pushVal={alerts.permitPush} onPush={(v) => setA("permitPush", v)} />
        </div>

        {/* System & Platform */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5">
          <SectionTitle icon="🛠️" title="System & Platform" subtitle="Account changes and platform announcements" />
          <AlertRow label="Platform Announcements" hint="New features, policy updates, maintenance" pushVal={alerts.systemPush} onPush={(v) => setA("systemPush", v)} />
        </div>

        {/* Digest & Quiet Hours */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="🕐" title="Delivery Preferences" subtitle="Digest schedule and quiet hours" />
          <Field label="Activity Digest" hint="Receive a summary instead of individual notifications">
            <SettingsSelect value={alerts.digest} onChange={(e: any) => setA("digest", e.target.value)}>
              <option value="realtime">Real-time (no digest)</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </SettingsSelect>
          </Field>
          <div className="flex items-center justify-between p-3 bg-[#FAF8F5] border border-[#E8DED1] rounded-xl">
            <div>
              <p className="text-sm font-bold text-slate-800">Quiet Hours</p>
              <p className="text-xs text-slate-500 font-medium">Pause push notifications during rest hours</p>
            </div>
            <Toggle checked={alerts.quietEnabled} onChange={(v) => setA("quietEnabled", v)} />
          </div>
          {alerts.quietEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Quiet From">
                <SettingsInput type="time" value={alerts.quietStart} onChange={(e: any) => setA("quietStart", e.target.value)} />
              </Field>
              <Field label="Quiet Until">
                <SettingsInput type="time" value={alerts.quietEnd} onChange={(e: any) => setA("quietEnd", e.target.value)} />
              </Field>
            </div>
          )}
        </div>

        <Button onClick={handleSaveAlerts} className="w-full bg-[#8B735B] hover:bg-[#756A60] text-white rounded-xl font-bold shadow-md shadow-[#E8DED1]">
          Save Alert Preferences
        </Button>
      </div>
    );

    // ── Business Tab ───────────────────────────────────────────────────────
    const renderBusinessTab = () => (
      <div className="space-y-5">
        <div className="space-y-4 rounded-2xl border-2 border-slate-100 bg-white p-5">
          <SectionTitle icon="🏢" title="Business Information" subtitle="Information that applies to your landlord business" />
          <Field label="Business / Trade Name" hint="Leave blank to use your personal name">
            <SettingsInput value={business.businessName} onChange={(e: any) => setB("businessName", e.target.value)} placeholder="e.g. Santos Apartments" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Business Type">
              <SettingsSelect value={business.businessType} onChange={(e: any) => setB("businessType", e.target.value)}>
                <option value="sole_proprietor">Sole Proprietor</option>
                <option value="partnership">Partnership</option>
                <option value="corporation">Corporation / OPC</option>
              </SettingsSelect>
            </Field>
            <Field label="Years in Operation">
              <SettingsInput type="number" min="0" value={business.yearsActive} onChange={(e: any) => setB("yearsActive", e.target.value)} placeholder="e.g. 5" />
            </Field>
          </div>
          <Field label="BIR TIN" hint="Tax Identification Number, if applicable">
            <SettingsInput value={business.taxId} onChange={(e: any) => setB("taxId", e.target.value)} placeholder="XXX-XXX-XXX-000" />
          </Field>
        </div>

        <div className="space-y-4 rounded-2xl border-2 border-slate-100 bg-white p-5">
          <SectionTitle icon="🏘️" title="Property Portfolio" subtitle="Calculated automatically from your registered properties and rooms" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Properties", value: myApartments.length },
              { label: "Total Rooms", value: allRooms.length },
              { label: "Available Rooms", value: availableCount },
            ].map((item) => <div key={item.label} className="rounded-xl border border-[#E8DED1] bg-[#FAF8F5] p-4"><p className="text-xs font-bold text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-black text-slate-900">{item.value}</p></div>)}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border-2 border-slate-100 bg-white p-5">
          <SectionTitle icon="📄" title="Property Verification & Permits" subtitle="Manage permit and verification information for each of your properties." />
          {myApartments.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[#DCC9B4] bg-[#FAF8F5] p-8 text-center">
              <Building2 className="h-9 w-9 text-[#C9B8A5]" /><h3 className="mt-3 font-black text-slate-900">No properties yet</h3><p className="mt-1 text-sm text-slate-500">Add a property first to manage its permit and verification information.</p>
              <Link to="/add-apartment"><Button className="mt-4 bg-[#8B735B] font-bold text-white hover:bg-[#756A60]"><Plus className="mr-2 h-4 w-4" />Add Property</Button></Link>
            </div>
          ) : (
            <div className="divide-y divide-[#EEE6DC] overflow-hidden rounded-xl border border-[#E8DED1]">
              {myApartments.map((apartment) => {
                const featureRecord = apartment.features && !Array.isArray(apartment.features) ? apartment.features : {};
                const propertyVerification = featureRecord.verification && typeof featureRecord.verification === "object" && !Array.isArray(featureRecord.verification) ? featureRecord.verification as Record<string, unknown> : {};
                const permit = typeof propertyVerification.businessPermit === "string" ? propertyVerification.businessPermit : "";
                const expiry = typeof propertyVerification.permitExpiry === "string" ? propertyVerification.permitExpiry : "";
                const status = apartment.approvalStatus === "approved" ? "Verified" : apartment.approvalStatus === "rejected" ? "Rejected" : "Pending Verification";
                return <div key={apartment.id} className="grid gap-4 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center"><div className="min-w-0"><p className="truncate font-black text-slate-900">{apartment.title || "Untitled property"}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{formatApartmentLocation(apartment, "Address unavailable")}</p></div><div><p className="text-[10px] font-bold uppercase text-slate-400">Verification Status</p><Badge className="mt-1 bg-[#FAF8F5] text-[#5F5145]">{status}</Badge></div><div><p className="text-[10px] font-bold uppercase text-slate-400">Business Permit No.</p><p className="mt-1 text-sm font-bold text-slate-700">{permit || "Not provided"}</p><p className="mt-1 text-xs text-slate-500">Expiry: {expiry ? new Date(`${expiry}T00:00:00`).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "Not provided"}</p></div><Button variant="outline" onClick={() => setEditingApartment(apartment as Apartment)} className="border-[#DCC9B4] font-bold text-[#8B735B] hover:bg-[#FAF8F5]">View / Update Permit</Button></div>;
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setBusiness(savedBusiness)} className="rounded-md font-bold"><RotateCcw className="mr-2 h-4 w-4" />Reset Changes</Button>
          <Button onClick={handleSaveBusiness} className="rounded-md bg-[#8B735B] font-bold text-white hover:bg-[#756A60]">Save Business Details</Button>
        </div>
      </div>
    );

    const renderSecurityTab = () => (
      <div className="space-y-5">
        {/* Password */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle
            icon="🔑"
            title="Password"
            subtitle={security.passwordLastChanged ? `Last changed: ${new Date(security.passwordLastChanged).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}` : "Last changed: Not provided"}
          />
          <Field label="Current Password">
            <div className="relative">
              <SettingsInput
                type={passwordState.showCurrent ? "text" : "password"}
                placeholder="Enter current password"
                value={passwordState.current}
                onChange={(e: any) => setPasswordState((p) => ({ ...p, current: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setPasswordState((p) => ({ ...p, showCurrent: !p.showCurrent }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {passwordState.showCurrent ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </Field>
          <Field label="New Password" hint="At least 8 characters with letters, numbers, and symbols">
            <div className="relative">
              <SettingsInput
                type={passwordState.showNew ? "text" : "password"}
                placeholder="New password"
                value={passwordState.new}
                onChange={(e: any) => setPasswordState((p) => ({ ...p, new: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setPasswordState((p) => ({ ...p, showNew: !p.showNew }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {passwordState.showNew ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </Field>
          <Field label="Confirm New Password">
            <div className="relative">
              <SettingsInput
                type={passwordState.showConfirm ? "text" : "password"}
                placeholder="Repeat new password"
                value={passwordState.confirm}
                onChange={(e: any) => setPasswordState((p) => ({ ...p, confirm: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setPasswordState((p) => ({ ...p, showConfirm: !p.showConfirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {passwordState.showConfirm ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </Field>
          <button
            className="px-5 py-2.5 bg-[#8B735B] hover:bg-[#756A60] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl transition-colors"
            onClick={handlePasswordChange}
            disabled={passwordState.isChanging}
          >
            {passwordState.isChanging ? "Updating..." : "Update Password"}
          </button>
        </div>

        {/* Two-Factor Authentication */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="🛡️" title="Two-Factor Authentication" subtitle="Extra layer of protection for your account" />
          
          {!security.twoFactor && !twoFAState.setupMode ? (
            <>
              <div className="p-4 bg-[#FAF8F5] border-2 border-[#E8DED1] rounded-xl">
                <p className="text-sm font-black text-slate-900">Two-Factor Authentication</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">⚠️ Disabled – your account is less secure</p>
              </div>
              <button
                onClick={handleSetup2FA}
                className="w-full px-4 py-2.5 bg-[#8B735B] hover:bg-[#756A60] text-white text-sm font-black rounded-xl transition-colors"
              >
                Enable 2FA
              </button>
            </>
          ) : security.twoFactor && !twoFAState.setupMode ? (
            <>
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                <p className="text-sm font-black text-slate-900">Two-Factor Authentication</p>
                <p className="text-xs text-green-600 font-medium mt-0.5">✅ Enabled – your account is protected</p>
              </div>
              <Field label="2FA Method">
                <SettingsSelect value={security.twoFactorMethod} onChange={(e: any) => updateSecurity(p => ({ ...p, twoFactorMethod: e.target.value }))}>
                  <option value="sms">SMS to mobile number</option>
                  <option value="email">Email OTP</option>
                  <option value="authenticator">Authenticator App (Google / Authy)</option>
                </SettingsSelect>
              </Field>
              <button
                onClick={() => {
                  toast.success("2FA is already enabled");
                }}
                className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-black rounded-xl transition-colors"
              >
                2FA Enabled
              </button>
            </>
          ) : (
            <>
              <div className="p-4 bg-[#FAF8F5] border-2 border-[#E8DED1] rounded-xl">
                <p className="text-sm font-black text-slate-900">Setup 2FA</p>
                <p className="text-xs text-[#756A60] font-medium mt-0.5">Follow the steps to enable two-factor authentication</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-slate-800">Step 1: Open your authenticator app</p>
                <p className="text-xs text-slate-600">Download Google Authenticator, Authy, or Microsoft Authenticator if you haven't already.</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-slate-800">Step 2: Scan the QR code</p>
                <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-center h-40">
                  <div className="text-slate-400 text-center">
                    <p className="text-xs font-mono">{twoFAState.secret}</p>
                    <p className="text-[10px] mt-2">(Or enter this code manually)</p>
                  </div>
                </div>
              </div>
              <Field label="Verification Code">
                <SettingsInput
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={twoFAState.verificationCode}
                  onChange={(e: any) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setTwoFAState((p) => ({ ...p, verificationCode: val }));
                  }}
                  maxLength="6"
                />
              </Field>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel2FASetup}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-black rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerify2FA}
                  disabled={twoFAState.isVerifying || twoFAState.verificationCode.length !== 6}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl transition-colors"
                >
                  {twoFAState.isVerifying ? "Verifying..." : "Verify & Enable"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Login & Sessions */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="💻" title="Login & Sessions" subtitle="Manage active sessions and login security" />
          <div className="space-y-3">
            {[
              { key: "loginAlerts",     label: "Login Alerts",              hint: "Get notified when your account is accessed from a new device or location" },
              { key: "trustedDevices",  label: "Remember Trusted Devices",  hint: "Skip 2FA on devices you've verified before" },
            ].map(({ key, label, hint }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{hint}</p>
                </div>
                <Toggle checked={(security as any)[key]} onChange={(v) => updateSecurity(p => ({ ...p, [key]: v }))} />
              </div>
            ))}
            <Field label="Auto Session Timeout" hint="Automatically log out after inactivity">
              <SettingsSelect value={security.sessionTimeout} onChange={(e: any) => updateSecurity(p => ({ ...p, sessionTimeout: e.target.value }))}>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="240">4 hours</option>
                <option value="0">Never</option>
              </SettingsSelect>
            </Field>
          </div>

          {/* Active Devices */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Sessions</p>
            <div className="space-y-2">
              {security.activeDevices.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-medium text-slate-500">No active session data is available.</div>
              )}
              {security.activeDevices.map((d: (typeof security.activeDevices)[number]) => (
                <div key={d.id} className={`flex items-center justify-between p-3 rounded-xl border ${d.current ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-100"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{d.name.includes("iPhone") || d.name.includes("Android") ? "📱" : "💻"}</span>
                    <div>
                      <p className="text-xs font-black text-slate-800">
                        {d.name}
                        {d.current && <span className="ml-2 text-[9px] font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">THIS DEVICE</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">{d.location} · {d.lastActive}</p>
                    </div>
                  </div>
                  {!d.current && (
                    <button
                      onClick={() => updateSecurity(p => ({ ...p, activeDevices: p.activeDevices.filter((x: (typeof p.activeDevices)[number]) => x.id !== d.id) }))}
                      className="text-xs font-black text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Account Recovery */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="📧" title="Account Recovery" subtitle="Backup contacts if you lose access to your account" />
          <Field label="Recovery Email" hint="Must be different from your primary email">
            <SettingsInput type="email" value={security.recoveryEmail} onChange={(e: any) => updateSecurity(p => ({ ...p, recoveryEmail: e.target.value }))} placeholder="backup@email.com" />
          </Field>
          <Field label="Recovery Mobile Number">
            <SettingsInput type="tel" value={security.recoveryMobile} onChange={(e: any) => updateSecurity(p => ({ ...p, recoveryMobile: e.target.value }))} placeholder="09XXXXXXXXX" />
          </Field>
        </div>

        {/* Privacy & Data */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="🔐" title="Privacy & Data" subtitle="Control how your data is used on the platform" />
          {[
            { key: "profileIndexing",  label: "Allow search engine indexing",         hint: "Your profile may appear in Google / Bing search results" },
            { key: "analyticsConsent", label: "Share usage analytics",                hint: "Help improve the platform with anonymous usage data" },
            { key: "dataSharing",      label: "Share data with third-party partners", hint: "Used for fraud detection and identity verification services" },
          ].map(({ key, label, hint }) => (
            <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-800">{label}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{hint}</p>
              </div>
              <Toggle checked={(security as any)[key]} onChange={(v) => updateSecurity(p => ({ ...p, [key]: v }))} />
            </div>
          ))}
        </div>

        <Button onClick={handleSaveSecurity} className="w-full bg-[#8B735B] hover:bg-[#756A60] text-white rounded-xl font-bold shadow-md shadow-[#E8DED1]">
          Save Security Settings
        </Button>

        {/* Danger Zone */}
        <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="⚠️" title="Danger Zone" subtitle="Irreversible account actions" />
          <p className="text-xs text-slate-600 font-medium">Once you delete your account, there is no going back. Please be certain.</p>
          <Button variant="destructive" className="w-full rounded-xl font-bold" onClick={handleDeleteAccount}>
            Delete My Account
          </Button>
        </div>
      </div>
    );

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="landlord-settings mx-auto max-w-[1500px] space-y-5 pb-8 [&_.rounded-2xl]:rounded-lg [&_.rounded-xl]:rounded-md [&_.border-2]:border">
        <div className="rounded-lg border border-[#E8DED1] bg-white px-5 py-6 shadow-sm sm:px-7">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-lg border border-[#E8DED1] bg-[#FAF8F5] text-[#8B735B] shadow-sm"><Settings className="h-6 w-6" /></span>
            <div><h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Settings</h1><p className="mt-1 text-sm font-medium text-slate-500">Manage your account, preferences, business information, and security.</p></div>
          </div>
        </div>

        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm sm:grid-cols-4">
            <TabsTrigger value="profile" className="min-h-11 rounded-md font-bold data-[state=active]:bg-[#F3EFEA] data-[state=active]:text-[#8B735B] data-[state=active]:shadow-sm">
              <User className="h-3.5 w-3.5 mr-1.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="alerts" className="min-h-11 rounded-md font-bold data-[state=active]:bg-[#F3EFEA] data-[state=active]:text-[#8B735B] data-[state=active]:shadow-sm">
              <Bell className="h-3.5 w-3.5 mr-1.5" /> Alerts
            </TabsTrigger>
            <TabsTrigger value="business" className="min-h-11 rounded-md font-bold data-[state=active]:bg-[#F3EFEA] data-[state=active]:text-[#8B735B] data-[state=active]:shadow-sm">
              <Building2 className="h-3.5 w-3.5 mr-1.5" /> Business
            </TabsTrigger>
            <TabsTrigger value="security" className="min-h-11 rounded-md font-bold data-[state=active]:bg-[#F3EFEA] data-[state=active]:text-[#8B735B] data-[state=active]:shadow-sm">
              <Shield className="h-3.5 w-3.5 mr-1.5" /> Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-0">{renderProfileTab()}</TabsContent>
          <TabsContent value="alerts" className="mt-0">{renderAlertsTab()}</TabsContent>
          <TabsContent value="business" className="mt-0">{renderBusinessTab()}</TabsContent>
          <TabsContent value="security" className="mt-0">{renderSecurityTab()}</TabsContent>
        </Tabs>
      </motion.div>
    );
  };

  // ── Section: Help ────────────────────────────────────────────────────────
  const renderHelp = () => (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5 pb-8">
      <header className="rounded-lg border border-[#E8DED1] bg-white px-5 py-7 shadow-sm sm:px-7">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-[#E8DED1] bg-[#FAF8F5] text-[#8B735B] shadow-sm"><HelpCircle className="h-6 w-6" /></span>
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#8B735B]">Help &amp; Support</p><h1 className="mt-1 text-2xl font-black text-[#302820] sm:text-3xl">Landlord Support Center</h1><p className="mt-1 text-sm font-medium text-[#756A60]">Get help managing listings, verification, and tenant inquiries.</p></div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: ListPlus, title: "Add a Property", desc: "Create a listing with photos, rent, rooms, and location.", action: () => navigate("/add-apartment"), tone: "bg-[#FAF8F5] text-[#8B735B]" },
          { icon: Building2, title: "Manage Listings", desc: "Review your posted properties and listing performance.", action: () => navigate("/dashboard?section=overview"), tone: "bg-[#FAF8F5] text-[#8B735B]" },
          { icon: Settings, title: "Business Settings", desc: "Update permit details, rental policies, and visibility.", action: () => { setSettingsTab("business"); navigate("/dashboard?section=settings"); }, tone: "bg-[#FAF8F5] text-[#8B735B]" },
        ].map(({ icon: Icon, title, desc, action, tone }) => (
          <button
            key={title}
            onClick={action}
            className="group flex min-h-28 items-center gap-4 rounded-lg border border-[#E8DED1] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#DCC9B4] hover:bg-[#FAF8F5] hover:shadow-md"
          >
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${tone}`}><Icon className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm text-[#302820]">{title}</strong><span className="mt-1 block text-xs font-medium leading-5 text-[#756A60]">{desc}</span></span>
            <ChevronRight className="h-5 w-5 text-[#C9B8A5] transition group-hover:translate-x-0.5 group-hover:text-[#8B735B]" />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="rounded-lg border-[#E8DED1] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#302820] font-black">
              <BookOpen className="h-5 w-5 text-[#8B735B]" />
              Listing Guide
            </CardTitle>
            <CardDescription>What landlords should put in each listing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Complete listing details", "Add rent, address, amenities, bedroom count, available date, and clear house rules."],
              ["Use real photos", "Upload accurate photos of the room, bathroom, kitchen, entrance, and shared areas."],
              ["Keep availability updated", "Mark units or rooms occupied as soon as they are no longer available."],
              ["Set clear policies", "Use Business settings for deposit, advance payment, lease term, pet, smoking, and maintenance terms."],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-lg border border-[#EEE6DC] bg-[#FAF8F5] p-4">
                <p className="font-black text-sm text-[#302820]">{title}</p>
                <p className="text-xs text-[#756A60] font-medium mt-0.5">{desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-[#E8DED1] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#302820] font-black">
              <ShieldCheck className="h-5 w-5 text-[#8B735B]" />
              Verification & Tenant Safety
            </CardTitle>
            <CardDescription>Keep listings trustworthy and easy to review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Permit verification", "Make sure your permit number and expiry date are current in Business settings."],
              ["Respond clearly", "Confirm rent inclusions, deposit requirements, viewing schedule, and move-in rules before visits."],
              ["Avoid misleading details", "Do not post outdated prices, unavailable rooms, or photos from a different unit."],
              ["Handle reports", "If a listing receives a report, review the details and update incorrect information quickly."],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3 rounded-lg border border-[#EEE6DC] bg-[#FAF8F5] p-4">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-black text-sm text-[#302820]">{title}</p>
                  <p className="text-xs text-[#756A60] font-medium mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border-[#E8DED1] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#302820] font-black">
            <MessageSquare className="h-5 w-5 text-[#8B735B]" />
            Contact Support
          </CardTitle>
          <CardDescription>Your request uses the contact email associated with your landlord profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {supportSubmitted ? (
            <div className="p-5 rounded-2xl bg-green-50 border border-green-200 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-black text-[#302820]">Support request received</p>
              <p className="text-sm text-[#756A60] font-medium mt-1">Our team will review your concern and contact you using the details provided.</p>
              <Button
                onClick={() => setSupportSubmitted(false)}
                className="mt-4 rounded-xl bg-[#8B735B] text-white font-bold hover:bg-[#756A60]"
              >
                Send Another Request
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-[#756A60] uppercase tracking-widest">Topic</Label>
                  <select
                    value={supportForm.topic}
                    onChange={(e) => setSupportForm((f) => ({ ...f, topic: e.target.value }))}
                    className="w-full rounded-xl border border-[#E8DED1] bg-white px-3 py-2.5 text-sm font-semibold text-[#302820] focus:outline-none focus:ring-2 focus:ring-[#C9B8A5] focus:border-[#8B735B]"
                  >
                    <option value="">Choose a topic...</option>
                    <option value="Listing setup">Listing setup</option>
                    <option value="Verification">Verification</option>
                    <option value="Property visibility">Property visibility</option>
                    <option value="Tenant inquiry issue">Tenant inquiry issue</option>
                    <option value="Account or login">Account or login</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-[#756A60] uppercase tracking-widest">Contact Email</Label>
                  <Input
                    value={supportForm.contact}
                    onChange={(e) => setSupportForm((f) => ({ ...f, contact: e.target.value }))}
                    placeholder="your@email.com"
                    className="rounded-xl border-[#E8DED1] bg-white focus-visible:ring-[#C9B8A5]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black text-[#756A60] uppercase tracking-widest">Message</Label>
                  <span className="text-xs text-[#C9B8A5] font-medium">{supportForm.message.length}/500</span>
                </div>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={supportForm.message}
                  onChange={(e) => setSupportForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us what happened or what you need help with..."
                  className="w-full rounded-xl border border-[#E8DED1] bg-white px-3 py-2.5 text-sm font-medium text-[#302820] focus:outline-none focus:ring-2 focus:ring-[#C9B8A5] focus:border-[#8B735B] resize-none"
                />
              </div>
              <Button
                onClick={() => void handleSupportSubmit()}
                disabled={isSubmittingSupport}
                className="w-full rounded-md bg-[#8B735B] text-white font-bold shadow-sm hover:bg-[#756A60]"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmittingSupport ? "Sending..." : "Send Support Request"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  // ── Section: Messaging ──────────────────────────────────────────────────


  const renderLegacyOverview = () => {
    const recentProperties = [...myApartments]
      .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime())
      .slice(0, 3);
    const getActorName = (userId: string | null | undefined, fallback: string) =>
      favoriteUsers.find((entry) => entry.id === userId)?.name || fallback;
    const recentActivity = [
      ...landlordViewRows.map((view) => {
        const apartmentId = view.apartment_id ?? view.apartmentId ?? "";
        const apartment = myApartments.find((item) => item.id === apartmentId);
        return {
          id: `view-${view.id ?? `${apartmentId}-${view.viewed_at}`}`,
          timestamp: view.viewed_at ?? "",
          title: apartment ? `${getActorName(view.viewer_id ?? view.viewerId, "Anonymous viewer")} viewed ${apartment.title}` : "Apartment viewed",
          icon: Eye,
          tone: "bg-blue-50 text-blue-600",
        };
      }),
      ...landlordFavoriteRows.map((favorite) => {
        const apartmentId = favorite.apartment_id ?? favorite.apartmentId ?? "";
        const apartment = myApartments.find((item) => item.id === apartmentId);
        return {
          id: `favorite-${favorite.id ?? `${apartmentId}-${favorite.created_at}`}`,
          timestamp: favorite.created_at ?? "",
          title: apartment ? `${getActorName(favorite.user_id ?? favorite.userId, "An account")} saved ${apartment.title}` : "Apartment saved",
          icon: Heart,
          tone: "bg-rose-50 text-rose-600",
        };
      }),
      ...myApartments.map((apartment) => ({
        id: `property-${apartment.id}`,
        timestamp: apartment.createdAt ?? "",
        title: `${apartment.title || "Untitled property"} added`,
        icon: Building2,
        tone: "bg-[#FAF8F5] text-[#756A60]",
      })),
      ...notifications.map((notification) => ({
        id: `notification-${notification.id}`,
        timestamp: notification.created_at ?? notification.createdAt ?? "",
        title: notification.title || "Notification received",
        icon: Bell,
        tone: "bg-violet-50 text-violet-600",
      })),
    ]
      .filter((item) => item.timestamp && !Number.isNaN(new Date(item.timestamp).getTime()))
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 6);
    const itemMotion = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

    return (
      <motion.div initial={false} animate="show" variants={{ show: { transition: { staggerChildren: 0.055 } } }} className="mx-auto max-w-[1500px] space-y-5">
        <motion.section variants={itemMotion} className={`flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between ${landlordVerified ? "border-emerald-200" : "border-[#E8DED1]"}`}>
          <div className="flex items-start gap-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${landlordVerified ? "bg-emerald-50 text-emerald-600" : "bg-[#FAF8F5] text-[#756A60]"}`}>{landlordVerified ? <ShieldCheck className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}</span>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-lg font-black text-slate-950">{landlordVerified ? "Account Verified" : "Verification Pending"}</h1><Badge className={`rounded-md ${landlordVerified ? "bg-emerald-100 text-emerald-700" : "bg-[#F3EFEA] text-[#5F5145]"}`}>{landlordVerified ? "Verified" : "Under review"}</Badge></div>
              <p className="mt-1 text-sm font-medium text-slate-600">{landlordPermit ? <>Permit <strong>{landlordPermit}</strong> {landlordVerified ? "is verified." : "is being reviewed by the administration team."}</> : "Verification information is available in your account settings."}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => { setSettingsTab("business"); setActiveSection("settings"); }} className="h-10 shrink-0 rounded-md border-[#E8DED1] font-bold text-[#5F5145] hover:bg-[#FAF8F5]">View Details<ChevronRight className="ml-2 h-4 w-4" /></Button>
        </motion.section>

        <motion.section variants={itemMotion} className="grid gap-3 sm:grid-cols-3">
          {[{ label: "Properties", value: myApartments.length, detail: "Total properties", icon: Building2, action: () => setActiveSection("properties"), tone: "bg-[#8B735B] text-white", iconTone: "bg-white/20" }, { label: "Total Views", value: totalViews, detail: "Across all properties", icon: Eye, action: () => setActiveSection("activity"), tone: "border border-slate-200 bg-white text-slate-950", iconTone: "bg-[#FAF8F5] text-[#756A60]" }, { label: "Favorites", value: totalFavorites, detail: "Saved by tenants", icon: Heart, action: () => setActiveSection("activity"), tone: "border border-slate-200 bg-white text-slate-950", iconTone: "bg-rose-50 text-rose-600" }, { label: "Available Rooms", value: availableCount, detail: "Currently available", icon: Home, action: () => setActiveSection("properties"), tone: "border border-slate-200 bg-white text-slate-950", iconTone: "bg-emerald-50 text-emerald-600" }].map(({ label, value, detail, icon: Icon, action, tone, iconTone }) => <motion.button key={label} whileHover={{ y: -3 }} onClick={action} className={`group flex min-h-32 items-center gap-4 rounded-lg p-5 text-left shadow-sm transition-shadow hover:shadow-lg ${tone}`}><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${iconTone}`}><Icon className="h-6 w-6" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-black uppercase">{label}</span><strong className="mt-1 block text-3xl">{value.toLocaleString()}</strong><span className={`block text-xs font-medium ${label === "Properties" ? "text-[#F3EFEA]" : "text-slate-500"}`}>{detail}</span></span><ChevronRight className={`h-4 w-4 transition group-hover:translate-x-0.5 ${label === "Properties" ? "text-white/70" : "text-slate-300"}`} /></motion.button>)}
        </motion.section>

        <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#756A60]" /><div><h2 className="font-black text-slate-950">{allRooms.length > 0 ? "Room Overview" : "Occupancy Overview"}</h2><p className="text-xs font-medium text-slate-500">Live room availability across your properties.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[{ label: "Total Units", value: totalUnits, detail: "Apartments or rooms", icon: Building2, tone: "bg-[#FAF8F5] text-[#756A60]" }, { label: "Available", value: availableCount, detail: "Ready for tenants", icon: Home, tone: "bg-emerald-50 text-emerald-600" }, { label: "Occupied", value: occupiedCount, detail: "Currently occupied", icon: ShieldCheck, tone: "bg-blue-50 text-blue-600" }].map(({ label, value, detail, icon: Icon, tone }) => <div key={label} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4"><span className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span><span><strong className="block text-2xl text-slate-950">{value}</strong><span className="block text-xs font-black text-slate-700">{label}</span><span className="block text-[11px] text-slate-500">{detail}</span></span></div>)}
          </div>
          {totalUnits > 0 ? <div className="mt-5"><div className="mb-2 flex justify-between text-xs font-black text-slate-500"><span>Occupancy Rate</span><span className="text-[#756A60]">{occupancyRate}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#8B735B] transition-all" style={{ width: `${occupancyRate}%` }} /></div></div> : <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm font-medium text-slate-500">Room information will appear after a property or room is added.</p>}
        </motion.section>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-3"><div><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[#756A60]" /><h2 className="font-black text-slate-950">My Properties</h2></div><p className="mt-1 text-xs font-medium text-slate-500">Your newest database listings.</p></div>{myApartments.length > 0 && <button onClick={() => setActiveSection("properties")} className="text-xs font-black text-[#756A60]">View all</button>}</div>
            {isLoadingApartments ? <div className="flex min-h-64 items-center justify-center"><Clock className="h-6 w-6 animate-pulse text-[#8B735B]" /></div> : recentProperties.length > 0 ? <div className="divide-y divide-slate-100">{recentProperties.map((apartment) => { const roomCount = apartment.rooms?.length ?? 0; const roomAvailable = apartment.rooms?.filter((room: any) => getRoomStatus(room) === "available").length ?? 0; return <button key={apartment.id} onClick={() => navigate(`/apartment/${apartment.id}`, { state: { returnTo: "/dashboard?section=overview", backLabel: "Back to Dashboard" } })} className="group flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0"><span className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">{apartment.image ? <img src={apartment.image} alt={apartment.title || "Property"} className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-slate-300" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{apartment.title || "Untitled property"}</strong><span className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500"><MapPin className="h-3 w-3 shrink-0" />{formatApartmentLocation(apartment, "Address unavailable")}</span><span className="mt-2 flex flex-wrap gap-2"><Badge className="rounded-md bg-[#FAF8F5] text-[#5F5145]">{roomCount} {roomCount === 1 ? "room" : "rooms"}</Badge><Badge className="rounded-md bg-emerald-50 text-emerald-700">{roomAvailable} available</Badge></span></span><ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#8B735B]" /></button>; })}</div> : <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><Building2 className="mb-3 h-8 w-8 text-slate-300" /><h3 className="font-black text-slate-800">No properties yet</h3><p className="mt-1 text-sm font-medium text-slate-500">Add your first property to begin managing rooms and listings.</p><Link to="/add-apartment"><Button className="mt-4 rounded-md bg-[#8B735B] font-bold text-white hover:bg-[#756A60]"><Plus className="mr-2 h-4 w-4" />Add Property</Button></Link></div>}
          </motion.section>

          <div className="space-y-5">
            <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#756A60]" /><h2 className="font-black text-slate-950">Recent Activity</h2></div>{recentActivity.length > 0 && <button onClick={() => setActiveSection("activity")} className="text-xs font-black text-[#756A60]">View all</button>}</div>
              {isLoadingActivityData ? <div className="flex min-h-44 items-center justify-center"><Clock className="h-6 w-6 animate-pulse text-[#8B735B]" /></div> : recentActivity.length > 0 ? <div className="divide-y divide-slate-100">{recentActivity.slice(0, 4).map(({ id, timestamp, title, icon: Icon, tone }) => <div key={id} className="flex items-center gap-3 py-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">{title}</span><time className="text-[10px] font-medium text-slate-400">{new Date(timestamp).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></span></div>)}</div> : <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center"><Clock className="mb-2 h-7 w-7 text-slate-300" /><p className="text-sm font-bold text-slate-700">No recent activity.</p><p className="text-xs text-slate-500">Views, favorites, and listing events will appear here.</p></div>}
            </motion.section>

            <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#756A60]" /><h2 className="font-black text-slate-950">Quick Actions</h2></div>
              <div className="grid grid-cols-2 gap-2">{[{ label: "Add Property", icon: Plus, action: () => navigate("/add-apartment") }, { label: "My Properties", icon: Building2, action: () => setActiveSection("properties") }, { label: "Market Overview", icon: TrendingUp, action: () => navigate("/browse") }, { label: "View Activity", icon: TrendingUp, action: () => setActiveSection("activity") }].map(({ label, icon: Icon, action }) => <button key={label} onClick={action} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-700 transition hover:border-[#E8DED1] hover:bg-[#FAF8F5] hover:text-[#5F5145]"><Icon className="h-5 w-5" />{label}</button>)}</div>
            </motion.section>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderOverview = () => {
    const publishedCount = myApartments.filter((apartment) => apartment.isPublished !== false).length;
    const recentUpdates = myApartments
      .map((apartment) => ({ id: `property-${apartment.id}`, title: apartment.isPublished === false ? "Property added" : "Property published", detail: `${apartment.title || "Your property"} ${apartment.isPublished === false ? "was added to your account." : "is visible to tenants."}`, timestamp: apartment.updatedAt ?? apartment.createdAt ?? "", icon: Building2 }))
      .filter((item) => item.timestamp && !Number.isNaN(new Date(item.timestamp).getTime()))
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 4);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const rawFirstName = user?.name?.trim().split(/\s+/)[0] || "Landlord";
    const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);
    const hasAvailableRooms = availableCount > 0;
    const statusTitle = !landlordVerified
      ? landlordPermit ? "Verification is pending" : "Complete your verification"
      : myApartments.length === 0
        ? "Start with your first property"
        : publishedCount === 0
          ? "Publish a property when it is ready"
          : !hasAvailableRooms
            ? "No rooms are currently available"
            : "Everything looks good!";
    const statusNeedsAttention = !landlordVerified || myApartments.length === 0 || publishedCount === 0 || !hasAvailableRooms;

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="landlord-home mx-auto max-w-[1500px] space-y-5 pb-8">
        <header className="landlord-welcome relative min-h-32 overflow-hidden px-1 py-3 sm:min-h-40">
          <div className="relative z-10 max-w-2xl"><h1 className="text-3xl font-black tracking-tight text-[#302820] sm:text-4xl">{greeting}, {firstName}! <span aria-hidden="true">👋</span></h1><p className="mt-4 text-base font-medium text-[#5F5A55]">Manage your properties, rooms, and availability in one place.</p></div>
          <svg aria-hidden="true" viewBox="0 0 520 150" className="absolute bottom-0 right-0 hidden h-full w-[44%] text-[#B48E67] lg:block" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"><path d="M18 136h484M176 136V28h142v108M165 28h165v7H165zM190 48h28v24h-28zm56 0h28v24h-28zm-56 37h28v24h-28zm56 0h28v24h-28zm-56 37h28v14h-28zm56 0h28v14h-28zM230 136v-22h34v22M318 136V67h58v69M318 75h58M334 87h12v20h-12zm18 0h12v20h-12zm-18 31h12v18h-12zm18 0h12v18h-12zM92 136V91h31v45M98 98h19v29H98zM104 104h7m-7 7h7m-7 7h7M132 136V78h31v58M139 87h17m-17 9h11m-11 9h17M415 136a25 25 0 1 1 0-50 25 25 0 0 1 0 50zm0-35a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 14v13m0-6h7M471 136V99m0 0c-14-10-14-29 0-29s14 19 0 29zm0 0-8-9m8 9 8-9m-8 9v18"/><path d="M46 55q12-9 24 0m21 14h28m16-25q10-7 20 0M393 47h33m18 15h27m10-18q9-7 18 0" opacity=".6"/></svg>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="landlord-status-summary">
              <section className="landlord-panel rounded-xl border border-[#E8DED1] bg-white p-6"><div className="flex items-start gap-4"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${statusNeedsAttention ? "bg-[#F3EFEA] text-[#8B735B]" : "bg-emerald-50 text-emerald-700"}`}>{statusNeedsAttention ? <AlertCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}</span><div><h2 className="font-black text-[#302820]">{statusTitle}</h2><div className="mt-3 space-y-2 text-sm font-medium leading-6 text-[#5F5A55]"><p>{landlordVerified ? "Your account is verified." : landlordPermit ? "Your verification information is being reviewed." : "Verify your landlord account before publishing properties."}</p>{myApartments.length > 0 ? <p>You have <strong>{publishedCount} published {publishedCount === 1 ? "property" : "properties"}</strong> with <strong>{availableCount} {availableCount === 1 ? "room" : "rooms"} available</strong>.</p> : <p>Add your property information so tenants can discover it.</p>}<p>{hasAvailableRooms ? "Keep your room information updated so tenants see accurate availability." : myApartments.length > 0 ? "Update a room status when one becomes available." : "Add a property to begin managing rooms and availability."}</p></div>{!landlordVerified ? <button type="button" onClick={() => { setSettingsTab("business"); setActiveSection("settings"); }} className="mt-4 text-sm font-black text-[#8B735B]">{landlordPermit ? "View verification details →" : "Continue verification →"}</button> : myApartments.length === 0 ? <Link to="/add-apartment" className="mt-4 inline-block text-sm font-black text-[#8B735B]">Add Property →</Link> : publishedCount === 0 ? <span className="mt-4 block text-sm font-medium text-[#756A60]">Publish a property using its management actions below.</span> : !hasAvailableRooms && myApartments[0] ? <Link to={`/landlord/properties/${myApartments[0].id}/rooms`} className="mt-4 inline-block text-sm font-black text-[#8B735B]">Manage Rooms →</Link> : null}</div></div></section>
              <section className="landlord-panel min-h-52 rounded-xl border border-[#E8DED1] bg-white p-6"><div className="flex items-start gap-4"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${myApartments.length > 0 && hasAvailableRooms ? "bg-emerald-50 text-emerald-700" : "bg-[#F3EFEA] text-[#8B735B]"}`}><CheckCircle2 className="h-6 w-6" /></span><div><h2 className="font-black text-[#302820]">{myApartments.length === 0 ? "Start with your first property" : !hasAvailableRooms ? "All rooms are currently occupied" : "Everything looks good!"}</h2><p className="mt-3 text-sm font-medium leading-6 text-[#5F5A55]">{myApartments.length === 0 ? "Add your property information so tenants can discover it." : !hasAvailableRooms ? "Update a room status when one becomes available." : `You have ${publishedCount} published ${publishedCount === 1 ? "property" : "properties"} with ${availableCount} ${availableCount === 1 ? "room" : "rooms"} available.`}</p>{myApartments.length > 0 && hasAvailableRooms && <p className="mt-3 text-sm font-medium leading-6 text-[#5F5A55]">Keep your room information updated so tenants see accurate availability.</p>}{myApartments.length === 0 ? <Link to="/add-apartment" className="mt-4 inline-block text-sm font-black text-[#8B735B]">Add Property →</Link> : !hasAvailableRooms && myApartments[0] ? <Link to={`/landlord/properties/${myApartments[0].id}/rooms`} className="mt-4 inline-block text-sm font-black text-[#8B735B]">Manage Rooms →</Link> : null}</div></div></section>
            </div>

            <section className="landlord-panel overflow-hidden rounded-xl border border-[#E8DED1] bg-white"><div className="flex flex-col gap-4 border-b border-[#EEE6DC] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF8F5] text-[#8B735B]"><Building2 className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#302820]">Your Properties</h2><p className="mt-1 text-sm font-medium text-[#756A60]">Manage your apartments, rooms, and availability.</p></div></div><Link to="/add-apartment"><Button className="bg-[#8B735B] font-bold text-white hover:bg-[#756A60]"><Plus className="mr-2 h-4 w-4" />Add Property<ChevronRight className="ml-2 h-4 w-4" /></Button></Link></div>
              {isLoadingApartments ? <div className="flex min-h-72 items-center justify-center"><Clock className="h-7 w-7 animate-pulse text-[#8B735B]" /></div> : myApartments.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FAF8F5] text-[#8B735B]"><Building2 className="h-8 w-8" /></span><h3 className="mt-4 text-xl font-black text-[#302820]">No properties yet</h3><p className="mt-2 max-w-sm text-sm text-[#756A60]">Add your first property to start listing available rooms.</p><Link to="/add-apartment"><Button className="mt-5 bg-[#8B735B] text-white hover:bg-[#756A60]"><Plus className="mr-2 h-4 w-4" />Add Property</Button></Link></div> : <div className="divide-y divide-[#EEE6DC]">{myApartments.map((apartment) => { const roomCount = apartment.rooms?.length ?? 0; const roomsAvailable = apartment.rooms?.filter((room: any) => getRoomStatus(room) === "available").length ?? 0; return <article key={apartment.id} className="grid gap-5 p-6 lg:grid-cols-[190px_minmax(0,1fr)_190px]"><div className="h-48 overflow-hidden rounded-xl bg-[#FAF8F5] lg:h-44">{apartment.image ? <img src={apartment.image} alt={apartment.title || "Property"} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Building2 className="h-10 w-10 text-[#C9B8A5]" /></div>}</div><div className="min-w-0"><h3 className="truncate text-xl font-black text-[#302820]">{apartment.title || "Untitled property"}</h3><p className="mt-2 flex items-center gap-2 text-sm font-medium text-[#5F5A55]"><MapPin className="h-4 w-4 text-[#8B735B]" />{formatApartmentLocation(apartment, "Address unavailable")}</p><Badge className={`mt-4 ${apartment.isPublished === false ? "bg-[#F3EFEA] text-[#756A60]" : "bg-emerald-50 text-emerald-700"}`}>{apartment.isPublished === false ? "Unpublished" : "Published"}</Badge><div className={`mt-4 w-fit rounded-lg px-4 py-3 ${roomsAvailable > 0 ? "bg-emerald-50 text-emerald-800" : "bg-[#FAF8F5] text-[#756A60]"}`}><strong className="block text-sm">{roomsAvailable > 0 ? `${roomsAvailable} ${roomsAvailable === 1 ? "room" : "rooms"} available` : "All rooms occupied"}</strong><span className="text-xs">{roomCount} total {roomCount === 1 ? "room" : "rooms"}</span></div><div className="mt-5 flex flex-wrap gap-5 text-sm text-[#756A60]"><button onClick={() => openViewers(apartment.id, apartment.title, aptViews(apartment.id))} className="flex items-center gap-2 hover:text-[#8B735B]"><Eye className="h-4 w-4" />{aptViews(apartment.id)} views</button><button onClick={() => openFavoriters(apartment.id, apartment.title, aptFavs(apartment.id))} className="flex items-center gap-2 hover:text-[#8B735B]"><Heart className="h-4 w-4" />{aptFavs(apartment.id)} favorites</button></div></div><div className="flex flex-col gap-3"><Link to={`/landlord/properties/${apartment.id}/rooms`}><Button className="w-full bg-[#8B735B] font-bold text-white hover:bg-[#756A60]">Manage Rooms<ChevronRight className="ml-2 h-4 w-4" /></Button></Link><Button variant="outline" onClick={() => setEditingApartment(apartment as Apartment)} className="w-full border-[#DCC9B4] text-[#8B735B] hover:bg-[#FAF8F5]">Edit Property<Edit2 className="ml-2 h-4 w-4" /></Button><Link to={`/apartment/${apartment.id}`} state={{ returnTo: "/dashboard?section=overview", backLabel: "Back to My Properties" }}><Button variant="outline" className="w-full border-[#DCC9B4] text-[#8B735B] hover:bg-[#FAF8F5]">View Property<Eye className="ml-2 h-4 w-4" /></Button></Link><div className="mt-auto grid grid-cols-2 gap-2">{apartment.isPublished ? <Button variant="outline" onClick={() => void handleTogglePublication(apartment.id, false)} className="text-xs">Unpublish</Button> : <Button variant="outline" onClick={() => void handleTogglePublication(apartment.id, true)} className="border-emerald-200 text-xs text-emerald-700">Publish</Button>}<Button variant="outline" disabled={deletingApartmentId === apartment.id} onClick={() => void handleDeleteApartment(apartment.id)} className="border-red-200 text-xs text-red-600">Delete</Button></div></div></article>; })}</div>}
            </section>
          </div>

          <aside className="space-y-4"><section className="landlord-panel rounded-xl border border-[#E8DED1] bg-white p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF8F5] text-[#8B735B]"><CheckCheck className="h-5 w-5" /></span><h2 className="font-black text-[#302820]">Things to Check</h2></div><div className="mt-5 space-y-4">{[{ ok: landlordVerified, label: landlordVerified ? "Account verified" : "Verification incomplete" }, { ok: publishedCount > 0, label: publishedCount > 0 ? `${publishedCount} ${publishedCount === 1 ? "property" : "properties"} published` : "No published property" }, { ok: hasAvailableRooms, label: hasAvailableRooms ? `${availableCount} ${availableCount === 1 ? "room" : "rooms"} available` : "No available rooms" }].map(({ ok, label }) => <div key={label} className="flex items-center gap-3 text-sm font-medium text-[#302820]">{ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <AlertCircle className="h-5 w-5 shrink-0 text-[#5F5145]" />}{label}</div>)}</div></section><section className="landlord-panel rounded-xl border border-[#E8DED1] bg-white p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF8F5] text-[#8B735B]"><Bell className="h-5 w-5" /></span><h2 className="font-black text-[#302820]">Recent Updates</h2></div><button onClick={() => setActiveSection("activity")} className="text-xs font-black text-[#8B735B]">View all</button></div>{recentUpdates.length > 0 ? <div className="mt-5 divide-y divide-[#EEE6DC]">{recentUpdates.map(({ id, title, detail, timestamp, icon: Icon }) => <div key={id} className="flex gap-3 py-4 first:pt-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-[#8B735B]"><Icon className="h-5 w-5" /></span><div><h3 className="text-sm font-black text-[#302820]">{title}</h3><p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-[#5F5A55]">{detail}</p><time className="mt-2 block text-[11px] text-[#756A60]">{new Date(timestamp).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div></div>)}</div> : <div className="py-10 text-center"><Bell className="mx-auto h-8 w-8 text-[#C9B8A5]" /><h3 className="mt-3 font-black text-[#302820]">No recent updates</h3><p className="mt-1 text-xs text-[#756A60]">Important property activity will appear here.</p></div>}</section></aside>
        </div>
      </motion.div>
    );

  };

  const handleProfilePhoto = async (file?: File) => {
    if (!file || !user?.id) return;
    setIsUploadingProfilePhoto(true);
    try {
      const avatar = await uploadUserAvatar(user.id, file);
      const next = { ...profile, avatar };
      const synced = await updateUserProfile({ id: user.id, email: next.email, name: `${next.firstName} ${next.lastName}`.trim(), role: "landlord", avatar_url: avatar });
      if (!synced) throw new Error("Unable to save profile photo.");
      updateProfile(() => next);
      setSavedProfile(next);
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload profile photo.");
    } finally {
      setIsUploadingProfilePhoto(false);
      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
    }
  };

  const handleRemoveProfilePhoto = async () => {
    if (!user?.id || !profile.avatar) return;
    const synced = await updateUserProfile({ id: user.id, email: profile.email, name: `${profile.firstName} ${profile.lastName}`.trim(), role: "landlord", avatar_url: "" });
    if (!synced) return void toast.error("Unable to remove profile photo.");
    const next = { ...profile, avatar: "" };
    updateProfile(() => next);
    setSavedProfile(next);
    toast.success("Profile photo removed.");
  };

  const renderProperties = () => {
    const availablePropertiesCount = myApartments.filter((apartment) => getApartmentStatus(apartment) === "available").length;

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5 pb-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#756A60]"><Building2 className="h-6 w-6" /></span>
            <div><p className="text-xs font-black uppercase text-[#756A60]">My Properties</p><h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Your Listings</h1><p className="mt-1 text-sm font-medium text-slate-500">Manage rooms, publication, and listing performance.</p></div>
          </div>
          <Link to="/add-apartment"><Button className="h-11 w-full rounded-lg bg-[#8B735B] px-5 font-bold text-white shadow-sm hover:bg-[#756A60] sm:w-auto"><Plus className="mr-2 h-4 w-4" />Add Property</Button></Link>
        </header>

        <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPropertyFilter("all")} className={`flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-black transition ${propertyFilter === "all" ? "border-[#8B735B] bg-[#8B735B] text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-[#E8DED1] hover:bg-[#FAF8F5]"}`}><LayoutGrid className="h-3.5 w-3.5" />All Units <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${propertyFilter === "all" ? "bg-white/20" : "bg-slate-100"}`}>{myApartments.length}</span></button>
            <button type="button" onClick={() => setPropertyFilter("available")} className={`flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-black transition ${propertyFilter === "available" ? "border-[#8B735B] bg-[#8B735B] text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-[#E8DED1] hover:bg-[#FAF8F5]"}`}><span className="h-2 w-2 rounded-full bg-emerald-500" />Available <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${propertyFilter === "available" ? "bg-white/20" : "bg-slate-100"}`}>{availablePropertiesCount}</span></button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500"><span className="shrink-0">Sort by</span><select value={propertySort} onChange={(event) => setPropertySort(event.target.value as typeof propertySort)} className="min-w-32 bg-transparent font-black text-slate-800 outline-none"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name</option><option value="price-high">Price: High</option><option value="price-low">Price: Low</option></select></label>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1"><button type="button" title="Grid view" onClick={() => setPropertyViewMode("grid")} className={`flex h-8 w-9 items-center justify-center rounded-md transition ${propertyViewMode === "grid" ? "bg-[#8B735B] text-white shadow-sm" : "text-slate-500 hover:bg-white"}`}><LayoutGrid className="h-4 w-4" /></button><button type="button" title="List view" onClick={() => setPropertyViewMode("list")} className={`flex h-8 w-9 items-center justify-center rounded-md transition ${propertyViewMode === "list" ? "bg-[#8B735B] text-white shadow-sm" : "text-slate-500 hover:bg-white"}`}><List className="h-4 w-4" /></button></div>
          </div>
        </section>

        {isLoadingApartments ? (
          <div className="flex min-h-96 items-center justify-center rounded-lg border border-slate-200 bg-white"><Clock className="h-7 w-7 animate-pulse text-[#8B735B]" /></div>
        ) : myApartments.length === 0 ? (
          <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm"><span className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><Building2 className="h-8 w-8" /></span><h2 className="text-xl font-black text-slate-900">No properties yet</h2><p className="mt-1 max-w-sm text-sm font-medium text-slate-500">You haven&apos;t added any properties yet.</p><Link to="/add-apartment"><Button className="mt-5 rounded-lg bg-[#8B735B] font-bold text-white hover:bg-[#756A60]"><Plus className="mr-2 h-4 w-4" />Add Your First Property</Button></Link></div>
        ) : paginatedApartments.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center"><Search className="mb-3 h-8 w-8 text-slate-300" /><h2 className="font-black text-slate-800">No matching properties</h2><p className="mt-1 text-sm font-medium text-slate-500">Try selecting a different availability filter.</p><Button variant="outline" onClick={() => setPropertyFilter("all")} className="mt-4 rounded-md font-bold">Show All Units</Button></div>
        ) : (
          <div className={propertyViewMode === "grid" ? "grid gap-5 xl:grid-cols-2" : "space-y-4"}>
            {paginatedApartments.map((apartment) => {
              const status = getApartmentStatus(apartment);
              const statusOption = getStatusOption(status);
              const roomCount = apartment.rooms?.length ?? 0;
              const availableRooms = apartment.rooms?.filter((room: any) => getRoomStatus(room) === "available").length ?? 0;
              const location = formatApartmentLocation(apartment, "Address unavailable");
              const roomOrBedCount = roomCount > 0 ? roomCount : Number(apartment.bedrooms ?? 0);
              return (
                <motion.article key={apartment.id} layout whileHover={{ y: -3 }} className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg ${propertyViewMode === "list" ? "md:grid md:grid-cols-[300px_minmax(0,1fr)]" : ""}`}>
                  <div className={`relative overflow-hidden bg-slate-100 ${propertyViewMode === "list" ? "min-h-64 md:h-full" : "aspect-[16/8]"}`}>
                    {apartment.image ? <img src={apartment.image} alt={apartment.title || "Property"} className="h-full w-full object-cover transition duration-500 hover:scale-105" /> : <div className="flex h-full min-h-56 items-center justify-center"><Building2 className="h-10 w-10 text-slate-300" /></div>}
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2"><Badge className="rounded-md bg-[#8B735B] text-white shadow-sm">Your Property</Badge><Badge className={`rounded-md border ${statusOption.className}`}>{statusOption.label}</Badge>{!apartment.isPublished && <Badge className="rounded-md bg-slate-800 text-white">Unpublished</Badge>}</div>
                  </div>
                  <div className="flex min-w-0 flex-col p-5">
                    <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate text-xl font-black text-slate-950">{apartment.title || "Untitled property"}</h2><ApartmentRatingSummary stats={ratingSummary.byApartment.get(apartment.id)} isLoading={ratingsLoading} className="mt-1" /><p className="mt-1 flex items-center gap-1 truncate text-sm font-medium text-slate-500"><MapPin className="h-4 w-4 shrink-0 text-[#8B735B]" />{location}</p></div><div className="shrink-0 text-right"><p className="text-sm font-black text-[#756A60]">Room pricing</p><p className="text-xs font-medium text-slate-500">Manage Rooms</p></div></div>
                    <div className="mt-4 grid grid-cols-3 gap-2">{[{ label: roomCount > 0 ? "Rooms" : "Beds", value: roomOrBedCount, icon: BedDouble }, { label: "Bathrooms", value: Number(apartment.bathrooms ?? 0), icon: Bath }, { label: "Floor Area", value: Number(apartment.sqft ?? 0) > 0 ? `${Number(apartment.sqft).toLocaleString("en-PH")} sqft` : "Unavailable", icon: Ruler }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3"><Icon className="mb-2 h-4 w-4 text-[#8B735B]" /><strong className="block truncate text-sm text-slate-900">{value}</strong><span className="text-[10px] font-semibold text-slate-500">{label}</span></div>)}</div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2"><Badge className="rounded-md bg-emerald-100 text-emerald-700">{statusOption.label}</Badge><span className="text-xs font-bold text-slate-600">{availableRooms} available / {roomCount} total rooms</span></div>
                    <div className="mt-4 grid grid-cols-2 gap-2"><Link to={`/apartment/${apartment.id}`} state={{ returnTo: "/dashboard?section=properties", backLabel: "Back to My Properties" }}><Button variant="outline" className="h-10 w-full rounded-md border-[#E8DED1] font-bold text-[#5F5145] hover:bg-[#FAF8F5]"><Eye className="mr-2 h-4 w-4" />View Property</Button></Link><Link to={`/landlord/properties/${apartment.id}/rooms`}><Button className="h-10 w-full rounded-md bg-[#8B735B] font-bold text-white hover:bg-[#756A60]">Manage Rooms</Button></Link></div>
                    <div className="mt-2 grid grid-cols-3 gap-2"><button onClick={() => openViewers(apartment.id, apartment.title, aptViews(apartment.id))} className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"><Eye className="h-4 w-4 text-[#8B735B]" />{aptViews(apartment.id)} Views</button><button onClick={() => openFavoriters(apartment.id, apartment.title, aptFavs(apartment.id))} className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"><Heart className="h-4 w-4 text-rose-500" />{aptFavs(apartment.id)} Saved</button><button onClick={() => setEditingApartment(apartment as Apartment)} className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"><Edit2 className="h-4 w-4 text-blue-500" />Edit</button></div>
                    <div className="mt-2 grid grid-cols-2 gap-2">{apartment.isPublished ? <Button variant="outline" onClick={() => void handleTogglePublication(apartment.id, false)} className="h-10 rounded-md border-[#E8DED1] font-bold text-[#5F5145] hover:bg-[#FAF8F5]"><EyeOff className="mr-2 h-4 w-4" />Unpublish</Button> : <Button variant="outline" onClick={() => void handleTogglePublication(apartment.id, true)} className="h-10 rounded-md border-emerald-200 font-bold text-emerald-700 hover:bg-emerald-50"><EyeOpen className="mr-2 h-4 w-4" />Publish</Button>}<Button variant="outline" disabled={deletingApartmentId === apartment.id} onClick={() => void handleDeleteApartment(apartment.id)} className="h-10 rounded-md border-red-200 font-bold text-red-600 hover:bg-red-50"><Trash2 className="mr-2 h-4 w-4" />{deletingApartmentId === apartment.id ? "Deleting..." : "Delete"}</Button></div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {filteredApartments.length > 0 && <footer className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between"><span>Showing {(safePropertyPage - 1) * propertiesPerPage + 1}-{Math.min(safePropertyPage * propertiesPerPage, filteredApartments.length)} of {filteredApartments.length} properties</span><div className="flex flex-wrap items-center gap-2"><button type="button" title="Previous page" disabled={safePropertyPage <= 1} onClick={() => setPropertyPage(Math.max(1, safePropertyPage - 1))} className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"><ChevronRight className="h-4 w-4 rotate-180" /></button><span className="flex h-9 min-w-9 items-center justify-center rounded-md bg-[#8B735B] px-3 font-black text-white">{safePropertyPage}</span><button type="button" title="Next page" disabled={safePropertyPage >= propertyPageCount} onClick={() => setPropertyPage(Math.min(propertyPageCount, safePropertyPage + 1))} className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button><label className="ml-1 flex items-center gap-2 text-xs font-bold"><span>Per page</span><select value={propertiesPerPage} onChange={(event) => setPropertiesPerPage(Number(event.target.value))} className="h-9 rounded-md border border-slate-200 bg-white px-2 font-black text-slate-800"><option value={6}>6</option><option value={10}>10</option><option value={20}>20</option></select></label></div></footer>}
      </motion.div>
    );
  };

  const renderActivity = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const rangeStart = activityRange === "today"
      ? todayStart
      : activityRange === "7d"
        ? weekStart
        : activityRange === "30d"
          ? monthStart
          : null;
    const isInSelectedRange = (value: string | null | undefined) => {
      if (rangeStart === null) return true;
      if (!value) return false;
      const timestamp = new Date(value).getTime();
      return !Number.isNaN(timestamp) && timestamp >= rangeStart;
    };
    const rangedViews = landlordViewRows.filter((view) => isInSelectedRange(view.viewed_at));
    const rangedFavorites = landlordFavoriteRows.filter((favorite) => isInSelectedRange(favorite.created_at));
    const ratingTimestamp = (rating: ApartmentRatingRow) => rating.updated_at || rating.created_at;
    const rangedRatings = ratingRows.filter((rating) => propertyIds.has(rating.apartment_id) && isInSelectedRange(ratingTimestamp(rating)));
    const findProperty = (apartmentId: string) => myApartments.find((apartment) => apartment.id === apartmentId);
    const recentActivity = [
      ...rangedViews.map((view) => {
        const apartmentId = view.apartment_id ?? view.apartmentId ?? "";
        const count = getViewWeight(view);
        return { id: `view-${view.id ?? `${apartmentId}-${view.viewed_at}`}`, timestamp: view.viewed_at ?? "", title: `${count.toLocaleString()} new ${count === 1 ? "view" : "views"}`, property: findProperty(apartmentId)?.title || "Untitled property", icon: Eye };
      }).filter((item) => item.title !== "0 new views"),
      ...rangedFavorites.map((favorite) => {
        const apartmentId = favorite.apartment_id ?? favorite.apartmentId ?? "";
        return { id: `favorite-${favorite.id ?? `${apartmentId}-${favorite.created_at}`}`, timestamp: favorite.created_at ?? "", title: "Added to Favorites", property: findProperty(apartmentId)?.title || "Untitled property", icon: Heart };
      }),
      ...rangedRatings.map((rating) => ({ id: `rating-${rating.id}`, timestamp: ratingTimestamp(rating), title: `Received a ${rating.rating}-star rating`, property: findProperty(rating.apartment_id)?.title || "Untitled property", icon: Star })),
    ].filter((item) => item.timestamp).sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
    const summaryCards = [
      { label: "Views", value: rangedViews.reduce((total, view) => total + getViewWeight(view), 0), help: "Property views", icon: Eye },
      { label: "Favorites", value: rangedFavorites.length, help: "Times tenants saved your properties", icon: Heart },
      { label: "Ratings", value: rangedRatings.length, help: "Ratings received", icon: Star },
    ];

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5 pb-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><TrendingUp className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-wide text-[#8B735B]">Activity</p><h1 className="text-2xl font-black text-[#302820] sm:text-3xl">Property Activity</h1><p className="mt-1 text-sm font-medium text-[#756A60]">See how tenants interact with your properties.</p></div></div>
          <label className="flex h-11 items-center gap-2 rounded-lg border border-[#EEE6DC] bg-white px-3 text-xs font-bold text-[#756A60] shadow-sm"><Calendar className="h-4 w-4 text-[#8B735B]" /><select value={activityRange} onChange={(event) => setActivityRange(event.target.value as typeof activityRange)} className="min-w-28 bg-transparent font-black text-[#302820] outline-none"><option value="today">Today</option><option value="7d">This Week</option><option value="30d">This Month</option><option value="all">All Time</option></select></label>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          {summaryCards.map(({ label, value, help, icon: Icon }) => <motion.div key={label} whileHover={{ y: -2 }} className="rounded-xl border border-[#EEE6DC] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><Icon className="h-5 w-5" /></span><span className="text-sm font-black text-[#5F5A55]">{label}</span></div><strong className="mt-5 block text-3xl font-black text-[#302820]">{value.toLocaleString()}</strong><span className="mt-1 block text-xs font-medium leading-relaxed text-[#756A60]">{help}</span></motion.div>)}
        </section>

        <section className="overflow-hidden rounded-xl border border-[#EEE6DC] bg-white shadow-sm">
          <div className="border-b border-[#EEE6DC] p-5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><Clock className="h-4 w-4" /></span><div><h2 className="font-black text-[#302820]">Recent Activity</h2><p className="text-xs font-medium text-[#756A60]">The latest tenant interactions during the selected period.</p></div></div></div>

          <div className="p-4 sm:p-5">
            {isLoadingApartments || isLoadingActivityData ? (
              <div className="flex min-h-80 items-center justify-center"><Clock className="h-7 w-7 animate-pulse text-[#8B735B]" /></div>
            ) : recentActivity.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-[#DCC9B4] bg-[#FAF8F5] p-8 text-center"><PropertyActivityEmptyIllustration /><h3 className="font-black text-[#302820]">No activity yet</h3><p className="mt-1 max-w-md text-sm font-medium text-[#756A60]">Tenant views, favorites, and ratings will appear here.</p></div>
            ) : (
              <div className="divide-y divide-[#EEE6DC]">
                {recentActivity.map(({ id, timestamp, title, property, icon: Icon }) => <article key={id} className="flex items-start gap-4 px-1 py-4 sm:px-2"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><Icon className="h-4.5 w-4.5" /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-black text-[#302820]">{title}</h3><p className="mt-0.5 truncate text-sm font-medium text-[#5F5A55]">{property}</p><time className="mt-1 block text-xs font-medium text-[#8A8179]">{new Date(timestamp).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</time></div></article>)}
              </div>
            )}
          </div>
        </section>
      </motion.div>
    );
  };

  const renderNotifications = () => {
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

  const sectionMap: Record<string, () => ReactElement> = {
    overview:      renderOverview,
    legacy:        renderLegacyOverview,
    properties:    renderProperties,
    activity:      renderActivity,
    notifications: renderNotifications,
    settings:      renderSettings,
    help:          renderHelp,
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="app-shell landlord-shell fixed inset-0 z-50 overflow-hidden bg-[#FCFAF7]">
      <div className="app-shell-frame flex h-full">

        {/* Desktop Sidebar */}
        <aside className="app-shell-sidebar hidden h-full w-60 shrink-0 flex-col border-r border-[#E8DED1] bg-white lg:flex">
          <LandlordSidebar user={user} verified={landlordVerified} activeSection={activeSection === "properties" ? "overview" : activeSection as "overview" | "activity" | "notifications" | "settings" | "help"} unreadNotifications={unreadNotificationCount} onSectionChange={setActiveSection} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="app-sidebar-overlay fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Mobile drawer */}
        <aside className={`app-sidebar-drawer fixed left-0 top-0 z-50 h-full w-64 border-r border-[#E8DED1] bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
            className="app-sidebar-close absolute top-4 right-4 h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all z-10"
          >
            <X className="h-4 w-4" />
          </button>
          <LandlordSidebar user={user} verified={landlordVerified} activeSection={activeSection === "properties" ? "overview" : activeSection as "overview" | "activity" | "notifications" | "settings" | "help"} unreadNotifications={unreadNotificationCount} onSectionChange={setActiveSection} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />
        </aside>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
          className="app-sidebar-trigger fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B735B] text-white shadow-lg transition hover:bg-[#756A60] lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Main content */}
        <div className="app-shell-main flex-1 min-w-0 h-full overflow-y-auto">
          <main className="app-shell-content app-shell-content-mobile-nav px-4 py-5 pt-16 md:px-6 lg:px-8 lg:pt-6">
            {(sectionMap[activeSection] ?? renderOverview)()}
          </main>
        </div>
      </div>

      {/* People modal */}
      <PeopleModal
        open={modal.open}
        onClose={closeModal}
        title={modal.type === "views" ? "Viewers" : "Saved by"}
        subtitle={modal.aptTitle}
        icon={modal.type === "views" ? Eye : Heart}
        iconColor={modal.type === "views" ? "bg-gradient-to-br from-[#8B735B] to-[#8B735B]" : "bg-[#8B735B]"}
        names={modal.names}
      />

      {editingApartment && (
        <EditApartmentDialog
          apartment={editingApartment}
          open={Boolean(editingApartment)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingApartment(null);
            }
          }}
          onSave={handleSaveEditedApartment}
        />
      )}

      {/* Landlord notification details */}
      {selectedNotificationDetail && (() => {
        const { notification, violation, appeal } = selectedNotificationDetail;
        const payload = notification.payload ?? {};
        const appealSource = appeal ? getAppealMetadata(appeal, "source") : undefined;
        const apartmentId = String(payload.apartment_id ?? violation?.apartment_id ?? appealSource?.apartment_id ?? "");
        const apartment = myApartments.find((item) => item.id === apartmentId);
        const apartmentTitle = String(payload.apartment_title ?? appealSource?.apartment_title ?? apartment?.title ?? "Apartment unavailable");
        const reportId = String(payload.report_id ?? payload.related_report_id ?? violation?.related_report_id ?? appeal?.report_id ?? "");
        const violationId = String(payload.violation_id ?? violation?.id ?? appeal?.violation_id ?? "");
        const existingAppeal = landlordAppeals.find((item) => {
          const source = getAppealMetadata(item, "source");
          return (reportId && item.report_id === reportId)
            || (violationId && item.violation_id === violationId)
            || (!reportId && !violationId && source?.notification_id === notification.id);
        });
        const canAppeal = notification.type !== "appeal_status_updated";
        const appealForAction = appeal ?? existingAppeal;
        const needsInformation = appealForAction?.status === "needs_information";
        return (
          <div className="fixed inset-0 z-[108] flex items-center justify-center overflow-y-auto p-4" onClick={() => setSelectedNotificationDetail(null)}>
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
            <div role="dialog" aria-modal="true" className="relative z-10 my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-[#F3EFEA] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between border-b border-[#F3EFEA] bg-[#FAF8F5]/50 px-6 py-5"><div><p className="text-xs font-black uppercase tracking-widest text-[#756A60]">Administrative notification</p><h2 className="mt-1 text-xl font-black text-slate-950">{notification.title || "Admin message"}</h2></div><button onClick={() => setSelectedNotificationDetail(null)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
              <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-400">Apartment</p><p className="mt-1 text-sm font-bold text-slate-800">{apartmentTitle}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-400">Date received</p><p className="mt-1 text-sm font-bold text-slate-800">{new Date(notification.created_at ?? notification.createdAt ?? Date.now()).toLocaleString("en-PH")}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-400">Related record</p><p className="mt-1 break-all text-sm font-bold text-slate-800">{violationId ? `${violation?.mode === "notice" ? "Notice" : "Violation"}: ${violationId}` : reportId ? `Report: ${reportId}` : `Message: ${notification.id ?? "Unavailable"}`}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-400">Status</p><p className="mt-1 text-sm font-bold capitalize text-slate-800">{String(appeal?.status ?? existingAppeal?.status ?? payload.status ?? "open").replace(/_/g, " ")}</p></div>
                </div>
                <div><p className="text-[10px] font-black uppercase text-slate-400">Admin message</p><p className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 p-4 text-sm font-medium leading-6 text-slate-700">{String(appeal?.admin_response ?? payload.admin_response ?? notification.message ?? "No message provided.")}</p></div>
                {(appeal || existingAppeal) && <div className="rounded-lg border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-black text-blue-800">Appeal status: {String((appeal || existingAppeal)?.status ?? "pending").replace(/_/g, " ")}</p>{(appeal || existingAppeal)?.admin_response && <p className="mt-2 text-xs font-medium text-blue-700">{(appeal || existingAppeal)?.admin_response}</p>}</div>}
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setSelectedNotificationDetail(null)} className="font-bold">Close</Button>{(canAppeal || needsInformation) && <Button disabled={Boolean(existingAppeal) && !needsInformation} onClick={() => openAppealForNotification({ ...selectedNotificationDetail, appeal: appealForAction ?? null })} className="bg-[#8B735B] font-bold text-white hover:bg-[#756A60]"><MessageSquare className="mr-2 h-4 w-4" />{needsInformation ? "Provide Information" : existingAppeal ? "Appeal Submitted" : "Submit Appeal"}</Button>}</div>
            </div>
          </div>
        );
      })()}

      {/* Appeal modal */}
      {appealModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto" onClick={closeAppealModal}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#F3EFEA] overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F3EFEA] bg-[#FAF8F5]/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow bg-gradient-to-br from-[#8B735B] to-[#756A60]">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-slate-900">Submit Appeal</p>
                  <p className="text-xs text-slate-400 font-medium">{appealModal.relatedLabel}</p>
                </div>
              </div>
              <button onClick={closeAppealModal} disabled={isSubmittingAppeal} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors disabled:opacity-50">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-400">Related apartment</p><p className="mt-1 text-sm font-bold text-slate-800">{appealModal.apartmentTitle}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-400">Related record</p><p className="mt-1 break-all text-xs font-bold text-slate-800">{appealModal.relatedLabel}</p></div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appeal Message (required)</label>
                  <span className="text-[10px] text-slate-400">{appealMessage.length}/500</span>
                </div>
                <textarea
                  rows={4} maxLength={500}
                  value={appealMessage}
                  onChange={(e) => setAppealMessage(e.target.value)}
                  placeholder="Explain your appeal and provide any supporting information…"
                  className="w-full rounded-xl border-2 border-[#F3EFEA] bg-[#FAF8F5]/30 px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#A68B70] resize-none"
                />
              </div>

              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact information</label><input type="email" value={appealContact} onChange={(event) => setAppealContact(event.target.value)} placeholder="Email address" className="w-full rounded-xl border-2 border-[#F3EFEA] bg-[#FAF8F5]/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#A68B70]" /></div>

              <div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Supporting evidence</p><EvidenceUploader evidenceFiles={appealEvidence} onEvidenceChange={setAppealEvidence} required={false} maxFiles={5} maxFileSize={10} /></div>

              <div className={`flex gap-3 p-3 rounded-xl border bg-[#FAF8F5] border-[#F3EFEA]`}>
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[#756A60]" />
                <p className="text-xs font-medium text-[#5F5145]">
                  Your appeal will be reviewed by an administrator. Please provide clear and detailed information.
                </p>
              </div>
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#FAF8F5] flex gap-3">
              <Button disabled={isSubmittingAppeal} onClick={async () => {
                if (!appealMessage.trim()) {
                  toast.error("Please enter an appeal message");
                  return;
                }
                if (!validateEmail(appealContact.trim())) {
                  toast.error("Please enter a valid contact email address");
                  return;
                }
                if (!user?.id || !appealModal.notificationId) {
                  toast.error("Missing required information");
                  return;
                }

                setIsSubmittingAppeal(true);
                try {
                  const evidence = appealEvidence.map((item) => ({ file: item.file, fileName: item.fileName, mimeType: item.mimeType }));
                  const created = appealModal.appealId
                    ? await submitAppealFollowupWithEvidence(appealModal.appealId, user.id, appealMessage.trim(), appealContact.trim(), evidence)
                    : await createAppealWithEvidence({
                        landlord_id: user.id,
                        report_id: appealModal.reportId,
                        violation_id: appealModal.violationId,
                        reason: `${appealModal.relatedType.replace(/_/g, " ")} appeal`,
                        description: appealMessage.trim(),
                        supporting_docs: [
                          { kind: "contact", value: appealContact.trim() },
                          { kind: "source", notification_id: appealModal.notificationId, apartment_id: appealModal.apartmentId, apartment_title: appealModal.apartmentTitle, related_type: appealModal.relatedType, related_label: appealModal.relatedLabel },
                        ],
                      }, evidence);
                  setLandlordAppeals((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
                  toast.success(appealModal.appealId ? "Additional information submitted" : "Appeal submitted successfully");
                  closeAppealModal();
                  setSelectedNotificationDetail(null);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to submit appeal");
                } finally {
                  setIsSubmittingAppeal(false);
                }
              }}
                className="flex-1 font-bold rounded-xl shadow-md text-white bg-gradient-to-r from-[#8B735B] to-[#756A60] hover:from-[#756A60] hover:to-[#5F5145]">
                <MessageSquare className="h-4 w-4 mr-2 inline" />
                {isSubmittingAppeal ? "Submitting..." : "Submit Appeal"}
              </Button>
              <Button variant="outline" onClick={closeAppealModal} disabled={isSubmittingAppeal} className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
