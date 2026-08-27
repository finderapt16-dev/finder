import { EvidenceViewer, type EvidenceItem } from "@/app/shared/components/common/EvidenceViewer";
import { AdminAnalyticsOverview } from "@/app/admin/components/AdminAnalyticsOverview";
import { LogoutConfirmation } from "@/app/shared/components/common/LogoutConfirmation";
import { ImageWithFallback } from "@/app/shared/components/figma/ImageWithFallback";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/shared/components/ui/alert-dialog";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { Card, CardContent } from "@/app/shared/components/ui/card";
import { useAuth, type User } from "@/app/shared/contexts/AuthContext";
import { type ListingRecord } from "@/app/shared/data/apartments";
import { updateApartmentPublication } from "@/app/shared/services/apartmentsService";
import {
  createAuditLog,
  createViolation,
  archiveAppeal,
  archiveReport,
  canArchiveAppealStatus,
  canArchiveReportStatus,
  deleteNotification,
  deleteViolation as deleteViolationRecord,
  fetchArchivedAppeals,
  fetchArchivedReports,
  fetchAdminActivityLogs,
  fetchAdminReports,
  fetchApartments,
  fetchLandlordWithDetails,
  fetchNotifications,
  fetchPendingAppeals,
  fetchRecentActivityLogs,
  fetchReportWithDetails,
  fetchSupportTicketById,
  fetchUserById,
  fetchUsers,
  fetchViolations,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  notifyReportDismissed,
  notifyReportResolved,
  permanentlyDeleteNotification,
  permanentlyDeleteAppeal,
  permanentlyDeleteReport,
  restoreAppeal,
  restoreReport,
  unarchiveNotification,
  updateAppealStatus,
  updateReportStatus,
  updateUserProfile,
  type DashboardAppealRow,
  type DashboardAuditLogRow,
  type DashboardLandlordDetailsRow,
  type DashboardNotificationRow,
  type DashboardReportRow,
  type DashboardSupportTicketRow,
  type DashboardUserRow,
  type DashboardViolationRow
} from "@/app/shared/services/dashboardSupabaseService";
import { getReportEvidence } from "@/app/shared/services/reportEvidenceService";
import { formatApartmentLocation } from "@/app/shared/utils/apartmentLocation";
import { formatAuditLogForDisplay, formatNotificationType, safeNotificationText } from "@/app/shared/utils/auditLogDisplay";
import { supabase } from "@/lib/supabaseclient";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Archive,
  ArrowLeft,
  BedDouble,
  Bell, BellRing,
  Building2,
  Calendar,
  Car,
  CheckCheck,
  CheckCircle2,
  ChevronRight, Clock,
  ClipboardList,
  Edit2,
  Eye,
  FileText,
  Flag,
  History,
  Home,
  LayoutDashboard,
  Lock,
  LifeBuoy,
  LogOut,
  Mail, MailOpen,
  MapPin,
  Menu,
  PawPrint,
  Phone,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sofa,
  Trash2,
  User as UserIcon,
  Users,
  Wifi,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactElement, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { clearAdminNavigationMemory, getAdminModuleLocation, getAdminModulePath, rememberAdminModuleLocation, type AdminModule } from "@/app/admin/utils/adminNavigationMemory";
import { AdminManagement } from "@/app/super-admin/pages/AdminManagement";
import { AuditLogs } from "@/app/super-admin/pages/AuditLogs";
import { UserManagement } from "@/app/super-admin/pages/UserManagement";
import { HelpCenter } from "@/app/super-admin/pages/HelpCenter";
import { SystemControl } from "@/app/super-admin/pages/SystemControl";
import { SuperAdminProfile } from "@/app/super-admin/pages/SuperAdminProfile";
import { fetchMaintenanceState, fetchSupportRequests, type MaintenanceState, type SupportTicketRow } from "@/app/super-admin/services/superAdminService";

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV_MAIN = [
  { icon: LayoutDashboard, label: "Dashboard",      section: "overview" },
  { icon: Bell,            label: "Notifications",  section: "notifications" },
  { icon: Users,           label: "Landlords",      section: "landlords" },
  { icon: Building2,       label: "Apartments",     section: "apartments" },
  { icon: Flag,            label: "Reports",        section: "reports" },
  { icon: AlertTriangle,   label: "Appeals",        section: "appeals" },
];
const NAV_ACCOUNT = [
  { icon: Shield, label: "Settings", section: "admininfo" },
];

// ── Severity map ──────────────────────────────────────────────────────────────
const SEVERITY_LABEL: Record<string, { label: string; class: string }> = {
  low:  { label: "Low",    class: "bg-green-100 text-green-800 border-green-300" },
  med:  { label: "Medium", class: "bg-amber-100 text-amber-800 border-amber-300" },
  high: { label: "High",   class: "bg-red-100 text-red-800 border-red-300" },
};

// ── Violation types ───────────────────────────────────────────────────────────
const VIOLATION_TYPES = [
  "Inaccurate listing information",
  "Fraudulent / scam listing",
  "Misleading photos",
  "Price manipulation",
  "Unresponsive to inquiries",
  "Safety hazard",
  "Permit non-compliance",
  "Other",
];

const NOTICE_TYPES = [
  "Formal warning – first offense",
  "Final warning – second offense",
  "Listing temporarily suspended",
  "Account suspended pending review",
  "Permit re-verification required",
];
const ADMIN_DASHBOARD_SECTIONS = new Set(["overview", "notifications", "landlords", "apartments", "reports", "appeals", "admininfo"]);
const isAdminModule = (value: string): value is AdminModule => ADMIN_DASHBOARD_SECTIONS.has(value);
type PortalSection = AdminModule | "admin-management" | "user-management" | "help-center" | "audit-logs" | "system-control" | "profile";

type AdminProfileState = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  bio: string;
  avatar: string;
  department: string;
  adminLevel: string;
};

type AdminActivityItem = {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  section: string;
};

function toAdminProfileState(source: User | DashboardUserRow | null | undefined): AdminProfileState {
  const name = String(source?.name ?? "").trim();
  const [firstName = "", ...lastNameParts] = name.split(/\s+/).filter(Boolean);
  const dashboardSource = source as DashboardUserRow | undefined;
  const authSource = source as User | undefined;

  return {
    firstName,
    lastName: lastNameParts.join(" "),
    email: String(source?.email ?? ""),
    mobile: String(dashboardSource?.mobile ?? dashboardSource?.mobileNumber ?? authSource?.mobileNumber ?? authSource?.mobile ?? ""),
    bio: String(dashboardSource?.bio ?? authSource?.bio ?? ""),
    avatar: String(dashboardSource?.avatar_url ?? authSource?.avatar ?? ""),
    department: String(dashboardSource?.department ?? authSource?.department ?? ""),
    adminLevel: String(dashboardSource?.admin_level ?? dashboardSource?.adminLevel ?? authSource?.adminLevel ?? ""),
  };
}

// ── Mock reports ──────────────────────────────────────────────────────────────
function formatOptionalDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", options);
}

function text(value: string | null | undefined, fallback = ""): string {
  return value && value.length > 0 ? value : fallback;
}

const getLandlordVerificationStatus = (landlord: DashboardUserRow | null): string => {
  if (!landlord) return "Missing";
  const explicitStatus = String(landlord.landlord_status ?? landlord.verification_status ?? landlord.status ?? "").trim();
  if (landlord.isVerified === true || landlord.is_verified === true) return "Verified";
  if (explicitStatus.length > 0) return explicitStatus.charAt(0).toUpperCase() + explicitStatus.slice(1).toLowerCase();
  return "Pending";
};

const canPublishForLandlord = (landlord: DashboardUserRow | null): boolean =>
  (landlord?.isVerified ?? landlord?.is_verified) === true && !["pending", "unverified", "rejected", "suspended", "disabled"].includes(
    String(landlord?.landlord_status ?? landlord?.verification_status ?? landlord?.status ?? "").trim().toLowerCase(),
  );

function activityTimestamp(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : "";
}

function toEvidenceItem(row: any): EvidenceItem | null {
  const fileUrl = text(row?.file_url);
  if (!fileUrl) return null;

  const fileType =
    row?.file_type === "document" || row?.file_type === "screenshot" ? row.file_type : "image";

  return {
    id: text(row?.id, fileUrl),
    fileName: text(row?.file_name, "Evidence file"),
    fileUrl,
    fileType,
    mimeType: text(row?.mime_type, "image/jpeg"),
    fileSize: typeof row?.file_size === "number" ? row.file_size : undefined,
    uploadedBy: text(row?.uploaded_by),
    uploadedAt: text(row?.uploaded_at),
  };
}

function SectionHeading({
  title,
  description,
  action,
  actionLabel = "View all",
}: {
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-black text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {action && <button onClick={action} className="shrink-0 text-xs font-bold text-amber-600 hover:text-amber-700">{actionLabel}</button>}
    </div>
  );
}

function OverviewEmpty({ icon: Icon, text: message }: { icon: typeof Building2; text: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <Icon className="mb-3 h-7 w-7 text-slate-300" />
      <p className="text-sm font-bold text-slate-600">{message}</p>
    </div>
  );
}

function NotificationEmpty({
  title,
  message,
  onRefresh,
  refreshing,
}: {
  title: string;
  message: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="flex min-h-[390px] flex-col items-center justify-center p-6 text-center">
      <span className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#f7f1eb] text-[#76502f]">
        <Bell className="h-10 w-10" />
      </span>
      <h3 className="text-xl font-black text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm font-medium text-slate-500">{message}</p>
      {onRefresh && <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="mt-5 h-9 rounded-md border-[#dfcdbb] text-xs font-black text-[#6f4525] hover:bg-[#f7f1eb]">
        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />Refresh
      </Button>}
    </div>
  );
}

function ArchiveEmpty({ kind, icon: Icon }: { kind: "notifications" | "reports" | "appeals"; icon: typeof Archive }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-6 flex h-24 w-32 items-end justify-center text-[#8a6542]" aria-hidden="true">
        <div className="absolute bottom-0 h-14 w-24 rounded-lg border-2 border-[#cbb8a5] bg-[#fbf7f2]" />
        <div className="absolute bottom-12 h-5 w-16 rounded-t-md border-2 border-b-0 border-[#cbb8a5] bg-[#f4ebe2]" />
        <span className="absolute bottom-5 flex h-11 w-11 items-center justify-center rounded-lg border border-[#dfcdbb] bg-white"><Icon className="h-6 w-6" /></span>
      </div>
      <h3 className="text-lg font-black text-stone-900">No archived {kind}</h3>
      <p className="mt-1 text-sm font-medium text-stone-500">{kind === "notifications" ? "Notifications you archive" : `Archived ${kind}`} will appear here.</p>
    </div>
  );
}

function SettingsSectionTitle({
  icon: Icon,
  tone,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tone}`}><Icon className="h-4 w-4" /></span>
      <div><h3 className="font-black text-slate-950">{title}</h3><p className="text-xs font-medium text-slate-500">{description}</p></div>
    </div>
  );
}

function SettingsField({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return <label className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}><span className="text-xs font-bold text-slate-600">{label}</span>{children}</label>;
}

export function AdminDashboard({ portalMode = "admin" }: { portalMode?: "admin" | "super_admin" }) {
  const { user, verifyLandlord, updateUser, refreshUsers, logout } = useAuth();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const isSuperAdminPortal = portalMode === "super_admin";
  const portalBasePath = isSuperAdminPortal ? "/super-admin" : "/dashboard";
  const apartmentDetailBasePath = isSuperAdminPortal ? "/super-admin/apartment" : "/admin/apartment";
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get("section")
    ?? (routeLocation.pathname.endsWith("/admin-management") ? "admin-management" : routeLocation.pathname.endsWith("/user-management") ? "user-management" : routeLocation.pathname.endsWith("/help-center") ? "help-center" : routeLocation.pathname.endsWith("/audit-logs") ? "audit-logs" : routeLocation.pathname.endsWith("/system-control") ? "system-control" : routeLocation.pathname.endsWith("/profile") ? "profile" : "overview");
  const isAvailableSection = (value: string): value is PortalSection => isAdminModule(value) || (isSuperAdminPortal && ["admin-management", "user-management", "help-center", "audit-logs", "system-control", "profile"].includes(value));
  const [activeSection, setActiveSection] = useState<PortalSection>(() => isAvailableSection(requestedSection) ? requestedSection : "overview");

  useEffect(() => {
    if (isAvailableSection(requestedSection)) setActiveSection(requestedSection);
  }, [requestedSection]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navigationDataReady, setNavigationDataReady] = useState(false);

  // landlords
  const [landlords, setLandlords] = useState<DashboardUserRow[]>([]);
  const [platformUsers, setPlatformUsers] = useState<DashboardUserRow[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportTicketRow[]>([]);
  const [platformStatus, setPlatformStatus] = useState<MaintenanceState | null>(null);
  const [verifyAction, setVerifyAction] = useState<{ landlordId: string; verify: boolean } | null>(null);
  const [landlordSearch, setLandlordSearch] = useState("");
  const [landlordStatusFilter, setLandlordStatusFilter] = useState<"all" | "pending" | "verified" | "violations">("all");
  const [landlordSort, setLandlordSort] = useState<"newest" | "oldest" | "name">("newest");

  // Loading states for action prevention
  const [deletingNotifId, setDeletingNotifId] = useState<string | null>(null);
  const [isMarkingAllNotifs, setIsMarkingAllNotifs] = useState(false);
  const [isResolvingReportId, setIsResolvingReportId] = useState<string | null>(null);
  const [isDismissingReportId, setIsDismissingReportId] = useState<string | null>(null);
  const [caseAction, setCaseAction] = useState<{
    type: "archive-report" | "archive-appeal" | "restore-report" | "restore-appeal" | "delete-report" | "delete-appeal";
    id: string;
    label: string;
  } | null>(null);
  const [processingCaseAction, setProcessingCaseAction] = useState(false);

  // reports
  const [reports, setReports] = useState<DashboardReportRow[]>([]);
  const [archivedReports, setArchivedReports] = useState<DashboardReportRow[]>([]);
  const [selectedReport, setSelectedReport] = useState<DashboardReportRow | null>(null);
  const [selectedReportDetails, setSelectedReportDetails] = useState<{
    report: DashboardReportRow | null;
    reporter: DashboardUserRow | null;
    apartment: any | null;
    landlord: DashboardUserRow | null;
  } | null>(null);
  const [selectedReportEvidence, setSelectedReportEvidence] = useState<EvidenceItem[]>([]);
  const [dismissReportModal, setDismissReportModal] = useState<{ reportId: string; reason: string } | null>(null);
  const [viewingUserProfile, setViewingUserProfile] = useState<DashboardUserRow | null>(null);
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState<"all" | "pending" | "resolved" | "dismissed">("all");
  const [reportTypeFilter, setReportTypeFilter] = useState("all");
  const [reportSort, setReportSort] = useState<"newest" | "oldest">("newest");
  const [reportArchiveView, setReportArchiveView] = useState(false);

  // violations / notices  { landlordId, type, category, message, issuedAt, apartmentTitle }
  const [violations, setViolations] = useState<DashboardViolationRow[]>([]);

  // appeals
  const [appeals, setAppeals] = useState<DashboardAppealRow[]>([]);
  const [archivedAppeals, setArchivedAppeals] = useState<DashboardAppealRow[]>([]);
  const [selectedAppeal, setSelectedAppeal] = useState<DashboardAppealRow | null>(null);
  const [appealResponse, setAppealResponse] = useState("");
  const [appealStatus, setAppealStatus] = useState<"under_review" | "needs_information" | "approved" | "rejected" | "dismissed">("under_review");
  const [appealSearch, setAppealSearch] = useState("");
  const [appealTypeFilter, setAppealTypeFilter] = useState<"all" | "report" | "violation" | "general">("all");
  const [appealSort, setAppealSort] = useState<"newest" | "oldest">("newest");
  const [appealArchiveView, setAppealArchiveView] = useState(false);
  // Retained only by the retired History renderer so its old route can remain non-destructive.
  const [historySearch, setHistorySearch] = useState("");
  const [historyKindFilter, setHistoryKindFilter] = useState<"all" | "reports" | "appeals" | "notifications">("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");

  useEffect(() => {
    if (!selectedAppeal) return;
    const status = selectedAppeal.status;
    if (status === "under_review" || status === "needs_information" || status === "approved" || status === "rejected" || status === "dismissed") {
      setAppealStatus(status);
    } else {
      setAppealStatus("under_review");
    }
    setAppealResponse(selectedAppeal.admin_response ?? "");
  }, [selectedAppeal?.id]);

  // violation modal
  const [violationModal, setViolationModal] = useState<{
    open: boolean;
    mode: "violation" | "notice";
    landlordId: string;
    landlordName: string;
    apartmentTitle: string;
    reportId?: string;
    apartmentId?: string;
    sourceModule: AdminModule;
  } | null>(null);
  const [vType, setVType]       = useState(VIOLATION_TYPES[0]);
  const [vMessage, setVMessage] = useState("");
  const [nType, setNType]       = useState(NOTICE_TYPES[0]);
  const [nMessage, setNMessage] = useState("");
  const [vExpirationDays, setVExpirationDays] = useState(90);
  const [isIssuingViolation, setIsIssuingViolation] = useState(false);

  // violation edit modal
  const [editViolationModal, setEditViolationModal] = useState<DashboardViolationRow | null>(null);
  const [editVMessage, setEditVMessage] = useState("");
  const [editVExpirationDays, setEditVExpirationDays] = useState(90);

  // password change modal
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<DashboardAuditLogRow[]>([]);
  const [recentActivityLogs, setRecentActivityLogs] = useState<DashboardAuditLogRow[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // admin notifications (new property submissions)
  const [adminNotifs, setAdminNotifs] = useState<DashboardNotificationRow[]>([]);
  const [notifSearch, setNotifSearch] = useState("");
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "archived">("all");
  const [notifTypeFilter, setNotifTypeFilter] = useState<"all" | "system" | "landlord" | "activities" | "reports" | "appeals">("all");
  const [notifActivityFilter, setNotifActivityFilter] = useState("all");
  const [isRefreshingNotifs, setIsRefreshingNotifs] = useState(false);
  const [notifPage, setNotifPage] = useState(1);
  const [notificationToDelete, setNotificationToDelete] = useState<DashboardNotificationRow | null>(null);
  const [selectedSupportRequest, setSelectedSupportRequest] = useState<{
    ticket: DashboardSupportTicketRow;
    submitter: DashboardUserRow | null;
  } | null>(null);
  const [loadingSupportRequestId, setLoadingSupportRequestId] = useState<string | null>(null);

  const isNotificationRead = (notification: DashboardNotificationRow) =>
    (notification.read ?? notification.is_read) === true;

  const getNotificationCategory = (notification: DashboardNotificationRow) => {
    const payload = notification.payload ?? {};
    const type = String(notification.type ?? "").toLowerCase();
    const title = String(notification.title ?? "").toLowerCase();
    const message = String(notification.message ?? "").toLowerCase();
    const action = String(payload.action ?? "").toLowerCase();
    const value = `${type} ${title} ${message} ${action}`;

    if (type === "support_request" || payload.ticket_id || payload.support_ticket_id) return "reports";
    if (type === "landlord_activity" || payload.category === "landlord_activity" || payload.activity_type) return "activities";
    if (value.includes("report") || value.includes("violation")) return "reports";
    if (value.includes("appeal")) return "appeals";
    if (
      value.includes("landlord") ||
      value.includes("property") ||
      value.includes("submission") ||
      value.includes("verification") ||
      payload.landlord_id ||
      payload.landlordId
    ) return "landlord";
    return "system";
  };

  const loadAdminNotifications = useCallback(async () => {
    if (!user?.id) {
      setAdminNotifs([]);
      return [];
    }

    const notifications = await fetchNotifications(user.id, true);
    setAdminNotifs(notifications);
    return notifications;
  }, [user?.id]);

  const markNotifsRead = async () => {
    if (!user?.id || isMarkingAllNotifs) return;

    const unreadCount = adminNotifs.filter((notification) => !notification.is_deleted && !isNotificationRead(notification)).length;
    if (unreadCount === 0) return;

    setIsMarkingAllNotifs(true);
    setAdminNotifs((previous) => previous.map((notification) => notification.is_deleted ? notification : ({
      ...notification, read: true, is_read: true, read_at: new Date().toISOString(),
    })));

    const updatedCount = await markAllNotificationsRead(user.id);
    await loadAdminNotifications();
    setIsMarkingAllNotifs(false);

    if (updatedCount === 0) {
      toast.error("Could not mark notifications as read. Please try again.");
    }
  };

  const deleteNotif = async (notificationId: string) => {
    if (deletingNotifId === notificationId) {
      toast.error("Deletion in progress...");
      return;
    }
    if (!user?.id || !notificationId) return;

    const notification = adminNotifs.find((item) => item.id === notificationId);
    if (notification?.is_deleted !== true) return;
    setDeletingNotifId(notificationId);
    setAdminNotifs((prev) => prev.filter((n) => n.id !== notificationId));
    const deleted = await permanentlyDeleteNotification(notificationId, user.id);
    await loadAdminNotifications();
    setDeletingNotifId(null);
    setNotificationToDelete(null);
    if (!deleted) toast.error("Could not permanently delete the archived notification. Please try again.");
  };

  const archiveNotif = async (notificationId: string) => {
    if (!user?.id || !notificationId || deletingNotifId === notificationId) return;
    setDeletingNotifId(notificationId);
    setAdminNotifs((previous) => previous.map((notification) => notification.id === notificationId
      ? { ...notification, is_deleted: true, deleted_at: new Date().toISOString() }
      : notification));

    const archived = await deleteNotification(notificationId, user.id);
    await loadAdminNotifications();
    setDeletingNotifId(null);
    if (!archived) toast.error("Could not archive the notification. Please try again.");
  };

  const unarchiveNotif = async (notificationId: string) => {
    if (!user?.id || !notificationId || deletingNotifId === notificationId) return;
    setDeletingNotifId(notificationId);
    setAdminNotifs((previous) => previous.map((notification) => notification.id === notificationId
      ? { ...notification, is_deleted: false, deleted_at: null }
      : notification));

    const restored = await unarchiveNotification(notificationId, user.id);
    await loadAdminNotifications();
    setDeletingNotifId(null);
    if (!restored) toast.error("Could not restore the notification. Please try again.");
  };

  const openSupportRequest = async (notification: DashboardNotificationRow) => {
    const ticketId = String(notification.payload?.ticket_id ?? notification.payload?.support_ticket_id ?? notification.action_target_id ?? "");
    if (!ticketId || loadingSupportRequestId) {
      if (!ticketId) toast.error("This support request is missing its ticket reference.");
      return;
    }

    setLoadingSupportRequestId(notification.id ?? ticketId);
    try {
      const ticket = await fetchSupportTicketById(ticketId);
      if (!ticket) {
        toast.error("The support request could not be loaded.");
        return;
      }

      const submitter = ticket.user_id ? await fetchUserById(ticket.user_id) : null;
      setSelectedSupportRequest({ ticket, submitter });

      if (notification.id && !notification.is_deleted && !isNotificationRead(notification)) {
        await markNotificationRead(notification.id, user?.id);
        await loadAdminNotifications();
      }
    } catch (error) {
      console.error("Unable to open support request:", error);
      toast.error("The support request could not be loaded.");
    } finally {
      setLoadingSupportRequestId(null);
    }
  };

  const openAppealNotification = async (notification: DashboardNotificationRow) => {
    const appealId = String(notification.payload?.appeal_id ?? "");
    if (!appealId) return void toast.error("This notification is missing its appeal reference.");
    let appeal = appeals.find((item) => item.id === appealId);
    if (!appeal) {
      const latestAppeals = await fetchPendingAppeals();
      setAppeals(latestAppeals);
      appeal = latestAppeals.find((item) => item.id === appealId);
    }
    if (!appeal) return void toast.error("The linked appeal could not be found.");
    if (user?.id) rememberAdminModuleLocation(user.id, "appeals", { view: "appeal-review", appealId });
    setSelectedAppeal(appeal);
    setActiveSection("appeals");
    navigate(`${portalBasePath}?section=appeals`);
  };

  const refreshAdminNotifications = async () => {
    if (isRefreshingNotifs) return;
    setIsRefreshingNotifs(true);
    await loadAdminNotifications();
    setIsRefreshingNotifs(false);
  };

  const toggleNotifReadStatus = async (notificationId: string, isCurrentlyRead: boolean) => {
    if (!user?.id || !notificationId) return;

    setAdminNotifs((previous) => previous.map((notification) =>
      notification.id === notificationId
        ? { ...notification, read: !isCurrentlyRead, is_read: !isCurrentlyRead }
        : notification
    ));

    const updated = isCurrentlyRead
      ? await markNotificationUnread(notificationId, user.id)
      : await markNotificationRead(notificationId, user.id);

    if (!updated) {
      toast.error("Could not update the notification status. Please try again.");
    }
    await loadAdminNotifications();
  };

  const filteredNotifs = useMemo(() => {
    return adminNotifs.filter((n) => {
      const category = getNotificationCategory(n);
      if (category === "reports" || category === "appeals") return false;
      const matchesSearch = !notifSearch || 
        n.title?.toLowerCase().includes(notifSearch.toLowerCase()) ||
        n.message?.toLowerCase().includes(notifSearch.toLowerCase()) ||
        n.type?.toLowerCase().includes(notifSearch.toLowerCase());
      const isRead = isNotificationRead(n);
      const isArchived = n.is_deleted === true;
      const matchesStatus = notifFilter === "archived"
        ? isArchived
        : !isArchived && (notifFilter === "all" || !isRead);
      const matchesType = notifTypeFilter === "all" || category === notifTypeFilter;
      const matchesActivity = notifActivityFilter === "all" || String(n.payload?.activity_type ?? n.type ?? "") === notifActivityFilter;
      const payloadText = `${n.payload?.landlord_name ?? ""} ${n.payload?.property_name ?? ""} ${n.payload?.room_name ?? ""} ${n.payload?.topic ?? ""}`.toLowerCase();
      const matchesExpandedSearch = matchesSearch || Boolean(notifSearch && payloadText.includes(notifSearch.toLowerCase()));
      return matchesExpandedSearch && matchesStatus && matchesType && matchesActivity;
    });
  }, [adminNotifs, notifSearch, notifFilter, notifTypeFilter, notifActivityFilter]);

  useEffect(() => {
    setNotifPage(1);
  }, [notifSearch, notifFilter, notifTypeFilter, notifActivityFilter]);

  // apartments
  const [aptSearch, setAptSearch]   = useState("");
  const [selectedApt, setSelectedApt] = useState<ListingRecord | null>(null);
  const [aptFilter, setAptFilter] = useState<"all" | "reported">("all");
  const [aptStatusFilter, setAptStatusFilter] = useState<"all" | "available" | "occupied" | "review">("all");
  const [aptPropertyTypeFilter, setAptPropertyTypeFilter] = useState("all");
  const [aptSort, setAptSort] = useState<"newest" | "oldest" | "price-low" | "price-high" | "name">("newest");
  const [publishingApartmentId, setPublishingApartmentId] = useState<string | null>(null);

  // landlord details modal
  const [selectedLandlord, setSelectedLandlord] = useState<DashboardUserRow | null>(null);
  const [selectedLandlordDetails, setSelectedLandlordDetails] = useState<DashboardLandlordDetailsRow | null>(null);
  const [isLoadingLandlordDetails, setIsLoadingLandlordDetails] = useState(false);

  const [allApartments, setAllApartments] = useState<ListingRecord[]>([]);

  const [adminProfile, setAdminProfile] = useState<AdminProfileState>(() => toAdminProfileState(user));
  const [savedAdminProfile, setSavedAdminProfile] = useState<AdminProfileState>(() => toAdminProfileState(user));
  const [isEditingAdminProfile, setIsEditingAdminProfile] = useState(false);
  const [isSavingAdminProfile, setIsSavingAdminProfile] = useState(false);
  const [isLoadingAdminProfile, setIsLoadingAdminProfile] = useState(Boolean(user?.id));

  const updateAdminProfile = (updater: (prev: AdminProfileState) => AdminProfileState) => {
    setAdminProfile(updater);
  };

  const handleUpdateAdminProfile = async () => {
    if (!user) {
      return;
    }

    if (!adminProfile.firstName.trim() || !adminProfile.lastName.trim()) {
      toast.error("Please enter your first and last name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminProfile.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSavingAdminProfile(true);
    const updatedUser = {
      id: user.id,
      role: user.role,
      email: adminProfile.email.trim(),
      name: `${adminProfile.firstName.trim()} ${adminProfile.lastName.trim()}`,
      mobile: adminProfile.mobile.trim(),
      avatar_url: adminProfile.avatar || null,
      bio: adminProfile.bio.trim(),
      department: adminProfile.department.trim(),
      admin_level: adminProfile.adminLevel,
      is_verified: user.isVerified ?? false,
      permit_number: user.permitNumber ?? null,
    };

    try {
      const result = await updateUserProfile(updatedUser);
      if (result) {
        const savedProfile = toAdminProfileState(result);
        setAdminProfile(savedProfile);
        setSavedAdminProfile(savedProfile);
        setIsEditingAdminProfile(false);
        await refreshUsers();
        await createAuditLog({
          admin_id: user.id,
          action: "admin_profile_updated",
          target_type: "user",
          target_id: user.id,
          details: { fields: ["name", "email", "mobile", "bio", "department", "admin_level"] },
        });
        toast.success("Profile updated successfully!");
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSavingAdminProfile(false);
    }
  };

  const handleResetAdminProfile = () => {
    setAdminProfile(savedAdminProfile);
    setIsEditingAdminProfile(false);
  };

  const openActivityLog = async () => {
    if (!user?.id) return;
    setActivityLogOpen(true);
    setIsLoadingActivity(true);
    try {
      const [adminLogs, platformLogs] = await Promise.all([
        fetchAdminActivityLogs(user.id),
        fetchRecentActivityLogs(),
      ]);
      setActivityLogs(adminLogs);
      setRecentActivityLogs(platformLogs);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const getApartmentReportCount = (apartmentId: string | undefined) => {
    if (!apartmentId) return 0;
    return reports.filter((r) => r.apartmentId === apartmentId && r.status === "pending").length;
  };

  const handleApproveAndPublishApartment = async (apartment: ListingRecord) => {
    if (!apartment.id || !user?.id || publishingApartmentId) return;
    const landlord = getLandlordForApt(apartment);
    if (!canPublishForLandlord(landlord)) {
      toast.error("This apartment cannot be published because the landlord has not been verified.");
      return;
    }

    setPublishingApartmentId(apartment.id);
    try {
      await updateApartmentPublication(apartment.id, true, user.id);
      const updatedApartment = {
        ...apartment,
        isPublished: true,
        is_published: true,
        approvalStatus: "approved" as const,
        approval_status: "approved",
        isArchived: false,
        is_archived: false,
        deletedAt: undefined,
        deleted_at: null,
      };
      setAllApartments((current) => current.map((item) => item.id === apartment.id ? { ...item, ...updatedApartment } : item));
      setSelectedApt((current) => current?.id === apartment.id ? { ...current, ...updatedApartment } : current);
      toast.success("Property approved and published");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to approve and publish this apartment.");
    } finally {
      setPublishingApartmentId(null);
    }
  };

  const filteredApts = useMemo(() => {
    const query = aptSearch.trim().toLowerCase();
    let filtered = allApartments.filter((apartment) => {
      const landlordName = landlords.find((landlord) => landlord.id === apartment.landlordId)?.name ?? "";
      const matchesSearch = !query || [apartment.title, apartment.location, apartment.address, landlordName]
        .some((value) => String(value ?? "").toLowerCase().includes(query));
      const status = apartment.isPublished === false
        ? "review"
        : apartment.status === "occupied" ? "occupied" : "available";
      const matchesStatus = aptStatusFilter === "all" || status === aptStatusFilter;
      const matchesType = aptPropertyTypeFilter === "all" || apartment.propertyType === aptPropertyTypeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });

    if (aptFilter === "reported") {
      filtered = filtered.filter((apartment) => getApartmentReportCount(apartment.id) > 0);
    }

    return filtered.sort((left, right) => {
      if (aptSort === "name") return left.title.localeCompare(right.title);
      if (aptSort === "price-low") return Number(left.price || 0) - Number(right.price || 0);
      if (aptSort === "price-high") return Number(right.price || 0) - Number(left.price || 0);
      const leftTime = new Date(left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.createdAt ?? 0).getTime();
      return aptSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [allApartments, aptSearch, aptFilter, aptStatusFilter, aptPropertyTypeFilter, aptSort, reports, landlords]);

  useEffect(() => {
    let active = true;

    if (!user?.id) {
      const emptyProfile = toAdminProfileState(null);
      setAdminProfile(emptyProfile);
      setSavedAdminProfile(emptyProfile);
      setIsLoadingAdminProfile(false);
      return () => {
        active = false;
      };
    }

    setIsLoadingAdminProfile(true);
    void fetchUserById(user.id)
      .then((profile) => {
        if (!active) return;
        const loadedProfile = toAdminProfileState(profile ?? user);
        setAdminProfile(loadedProfile);
        setSavedAdminProfile(loadedProfile);
      })
      .finally(() => {
        if (active) setIsLoadingAdminProfile(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const loadData = async () => {
      const [loadedReports, loadedViolations, loadedNotifications, loadedApartments, loadedAppeals, loadedArchivedReports, loadedArchivedAppeals, loadedActivityLogs, loadedUsers] = await Promise.all([
        fetchAdminReports(),
        fetchViolations(),
        user?.id ? fetchNotifications(user.id, true) : Promise.resolve([]),
        fetchApartments(),
        fetchPendingAppeals(),
        fetchArchivedReports(),
        fetchArchivedAppeals(),
        fetchRecentActivityLogs(),
        fetchUsers(),
      ]);

      setReports(loadedReports);
      setViolations(loadedViolations);
      setAdminNotifs(loadedNotifications);
      setAllApartments(loadedApartments as unknown as ListingRecord[]);
      setAppeals(loadedAppeals);
      setArchivedReports(loadedArchivedReports);
      setArchivedAppeals(loadedArchivedAppeals);
      setRecentActivityLogs(loadedActivityLogs);
      setPlatformUsers(loadedUsers);
      setLandlords(loadedUsers.filter((account) => account.role === "landlord"));
      if (isSuperAdminPortal) {
        const [tickets, status] = await Promise.all([fetchSupportRequests(), fetchMaintenanceState()]);
        setSupportRequests(tickets);
        setPlatformStatus(status);
      }
      setNavigationDataReady(true);
    };

    void loadData();
  }, [user?.id]);

  useEffect(() => {
    if (activeSection === "notifications") {
      void loadAdminNotifications();
    }
    if (activeSection === "reports") {
      void fetchAdminReports().then(setReports);
      void fetchArchivedReports().then(setArchivedReports);
    }
    if (activeSection === "apartments") {
      void fetchApartments().then((items) =>
        setAllApartments(items as unknown as ListingRecord[]),
      );
    }
    if (activeSection === "appeals") {
      void fetchPendingAppeals().then(setAppeals);
      void fetchArchivedAppeals().then(setArchivedAppeals);
    }
  }, [activeSection, loadAdminNotifications]);

  useEffect(() => {
    if (user?.role !== "admin" && user?.role !== "super_admin") return;
    const channel = supabase
      .channel(`admin-dashboard-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        void fetchAdminReports().then(setReports);
        void fetchArchivedReports().then(setArchivedReports);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "violations" }, () => { void fetchViolations().then(setViolations); })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => { void loadAdminNotifications(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "appeals" }, () => {
        void fetchPendingAppeals().then(setAppeals);
        void fetchArchivedAppeals().then(setArchivedAppeals);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "apartments" }, () => { void fetchApartments().then((items) => setAllApartments(items as unknown as ListingRecord[])); })
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_rooms" }, () => { void fetchApartments().then((items) => setAllApartments(items as unknown as ListingRecord[])); })
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_images" }, () => { void fetchApartments().then((items) => setAllApartments(items as unknown as ListingRecord[])); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadAdminNotifications, user?.id, user?.role]);

  // Fetch full report details when a report is selected
  useEffect(() => {
    let active = true;

    if (selectedReport?.id) {
      void Promise.all([
        fetchReportWithDetails(selectedReport.id),
        getReportEvidence(selectedReport.id),
      ]).then(([details, evidenceRows]) => {
        if (!active) return;
        setSelectedReportDetails(details);
        setSelectedReportEvidence(
          evidenceRows
            .map(toEvidenceItem)
            .filter((item): item is EvidenceItem => Boolean(item)),
        );
      });
    } else {
      setSelectedReportDetails(null);
      setSelectedReportEvidence([]);
    }

    return () => {
      active = false;
    };
  }, [selectedReport?.id]);

  // Fetch full landlord details when a landlord is selected
  useEffect(() => {
    if (!selectedLandlord?.id) {
      setSelectedLandlordDetails(null);
      setIsLoadingLandlordDetails(false);
      return;
    }

    let active = true;
    const permitNumber = selectedLandlord.permit_number ?? selectedLandlord.permitNumber ?? null;
    setSelectedLandlordDetails({
      user: selectedLandlord,
      profile: {
        user_id: selectedLandlord.id,
        permit_number: permitNumber,
        business_permit_number: permitNumber,
        is_verified: selectedLandlord.is_verified ?? selectedLandlord.isVerified ?? false,
      },
      properties: [],
      violations: [],
      reports: [],
      propertyStats: {
        totalProperties: 0,
        publishedProperties: 0,
        totalViews: 0,
        totalFavorites: 0,
        averagePrice: 0,
      },
    });
    setIsLoadingLandlordDetails(true);

    void fetchLandlordWithDetails(selectedLandlord.id)
      .then((details) => {
        if (active && details) setSelectedLandlordDetails(details);
      })
      .finally(() => {
        if (active) setIsLoadingLandlordDetails(false);
      });

    return () => {
      active = false;
    };
  }, [selectedLandlord]);

  const loadLandlords = async () => {
    const users = await fetchUsers();
    setLandlords(users.filter((x) => x.role === "landlord"));
  };

  const confirmVerification = () => {
    if (!verifyAction) return;
    const pendingAction = verifyAction;
    const previousLandlords = landlords;
    setVerifyAction(null);
    setLandlords((current) => current.map((landlord) =>
      landlord.id === pendingAction.landlordId
        ? {
            ...landlord,
            is_verified: pendingAction.verify,
            isVerified: pendingAction.verify,
            status: pendingAction.verify ? "verified" : "pending",
          }
        : landlord,
    ));
    const toastId = toast.loading(pendingAction.verify ? "Verifying landlord…" : "Revoking verification…");
    const action = verifyLandlord(pendingAction.landlordId, pendingAction.verify);
    void action.then(() => {
      toast.success(pendingAction.verify ? "Landlord verified" : "Verification revoked", { id: toastId });
      void loadLandlords();
    }).catch((error) => {
      setLandlords(previousLandlords);
      console.error("Unable to update landlord verification:", error);
      toast.error(error instanceof Error ? error.message : "Unable to update landlord verification.", { id: toastId });
    });
  };

  const resolveReport = (id: string) => {
    if (isResolvingReportId === id) {
      toast.error("Operation in progress...");
      return;
    }
    setIsResolvingReportId(id);
    void updateReportStatus(id, "resolved").then(async (updated) => {
      if (updated) {
        setReports((p) => p.map((r) => (r.id === id ? updated : r)));
        
        // Send notifications to landlord and reporter
        if (selectedReportDetails?.report?.id && selectedReportDetails?.landlord?.id && selectedReportDetails?.reporter?.id) {
          await notifyReportResolved(
            selectedReportDetails.report.id,
            selectedReportDetails.landlord.id,
            selectedReportDetails.reporter.id,
            selectedReportDetails.report.apartment_title || selectedReportDetails.report.apartment || "Reported Apartment",
          );
        }
        
        setSelectedReport(null);
        toast.success("Report marked as resolved and notifications sent");
      }
    }).finally(() => {
      setIsResolvingReportId(null);
    });
  };

  const dismissReport = (id: string, reason?: string) => {
    if (isDismissingReportId === id) {
      toast.error("Operation in progress...");
      return;
    }
    setIsDismissingReportId(id);
    void updateReportStatus(id, "dismissed").then(async (updated) => {
      if (updated) {
        setReports((p) => p.map((r) => (r.id === id ? updated : r)));
        
        // Send notification to reporter
        if (selectedReportDetails?.report?.id && selectedReportDetails?.reporter?.id) {
          await notifyReportDismissed(
            selectedReportDetails.report.id,
            selectedReportDetails.reporter.id,
            selectedReportDetails.report.apartment_title || selectedReportDetails.report.apartment || "Reported Apartment",
            reason,
          );
        }
        
        setSelectedReport(null);
        setDismissReportModal(null);
        toast.success("Report dismissed and notification sent to reporter");
      }
    }).finally(() => {
      setIsDismissingReportId(null);
    });
  };

  const executeCaseAction = async () => {
    if (!caseAction || !user?.id || processingCaseAction) return;
    setProcessingCaseAction(true);
    try {
      if (caseAction.type === "archive-report") {
        const archived = await archiveReport(caseAction.id, user.id);
        setReports((current) => current.filter((report) => report.id !== caseAction.id));
        setArchivedReports((current) => [archived, ...current.filter((report) => report.id !== caseAction.id)]);
        setSelectedReport(null);
        toast.success("Report archived.");
      } else if (caseAction.type === "archive-appeal") {
        const archived = await archiveAppeal(caseAction.id, user.id);
        setAppeals((current) => current.filter((appeal) => appeal.id !== caseAction.id));
        setArchivedAppeals((current) => [archived, ...current.filter((appeal) => appeal.id !== caseAction.id)]);
        setSelectedAppeal(null);
        toast.success("Appeal archived.");
      } else if (caseAction.type === "restore-report") {
        const restored = await restoreReport(caseAction.id, user.id);
        setArchivedReports((current) => current.filter((report) => report.id !== caseAction.id));
        setReports((current) => [restored, ...current.filter((report) => report.id !== caseAction.id)]);
        toast.success("Report restored to the active list.");
      } else if (caseAction.type === "restore-appeal") {
        const restored = await restoreAppeal(caseAction.id, user.id);
        setArchivedAppeals((current) => current.filter((appeal) => appeal.id !== caseAction.id));
        setAppeals((current) => [restored, ...current.filter((appeal) => appeal.id !== caseAction.id)]);
        toast.success("Appeal restored to the active list.");
      } else if (caseAction.type === "delete-report") {
        await permanentlyDeleteReport(caseAction.id, user.id);
        setArchivedReports((current) => current.filter((report) => report.id !== caseAction.id));
        toast.success("Archived report permanently deleted.");
      } else if (caseAction.type === "delete-appeal") {
        await permanentlyDeleteAppeal(caseAction.id, user.id);
        setArchivedAppeals((current) => current.filter((appeal) => appeal.id !== caseAction.id));
        toast.success("Archived appeal permanently deleted.");
      }
      setCaseAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to complete this action.");
    } finally {
      setProcessingCaseAction(false);
    }
  };

  const issueViolation = async () => {
    if (!violationModal || !user || isIssuingViolation) return;

    const type = (violationModal.mode === "violation" ? vType : nType).trim();
    const message = (violationModal.mode === "violation" ? vMessage : nMessage).trim();
    const expirationDays = Number(vExpirationDays);

    if (!violationModal.landlordId) {
      toast.error("The selected landlord could not be identified");
      return;
    }
    if (!type) {
      toast.error(`Please select a ${violationModal.mode} type`);
      return;
    }
    if (violationModal.mode === "violation" && (!Number.isInteger(expirationDays) || expirationDays < 1 || expirationDays > 365)) {
      toast.error("Expiration must be between 1 and 365 days");
      return;
    }

    setIsIssuingViolation(true);
    try {
      const created = await createViolation({
        landlord_id: violationModal.landlordId,
        admin_id: user.id,
        mode: violationModal.mode,
        type,
        message: message || null,
        issued_at: new Date().toISOString(),
        expires_at: violationModal.mode === "violation"
          ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
          : null,
        related_report_id: violationModal.reportId ?? null,
        apartment_id: violationModal.apartmentId ?? null,
        active: true,
      });

      if (!created) throw new Error("The violation record could not be saved");

      setViolations(await fetchViolations());
      if (violationModal.reportId) {
        const updatedReport = await updateReportStatus(violationModal.reportId, "resolved");
        if (updatedReport) {
          setReports((previous) => previous.map((report) => report.id === violationModal.reportId ? updatedReport : report));
          setSelectedReport(null);
        }
      }

      setViolationModal(null);
      setVMessage("");
      setNMessage("");
      setVExpirationDays(90);

      toast.success(violationModal.mode === "violation" ? "Violation issued and landlord notified" : "Notice sent to landlord");
    } catch (error) {
      console.error("Error issuing violation or notice:", error);
      toast.error(error instanceof Error ? error.message : `Unable to issue ${violationModal.mode}`);
    } finally {
      setIsIssuingViolation(false);
    }
  };

  // ── Password Change ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!user) {
      toast.error("User not found");
      return;
    }

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast.error("All password fields are required");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      await updateUser(user.id, { password: newPassword });
      toast.success("Password changed successfully!");
      setPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to change password.";
      toast.error(message);
    }
  };

  const saveViolationEdit = () => {
    if (!editViolationModal?.id) return;

    if (!editVMessage.trim()) {
      toast.error("Violation message cannot be empty");
      return;
    }

    void createViolation({
      landlord_id: editViolationModal.landlord_id ?? editViolationModal.landlordId ?? null,
      admin_id: editViolationModal.admin_id ?? null,
      mode: editViolationModal.mode ?? "violation",
      type: editViolationModal.type ?? null,
      message: editVMessage,
      issued_at: editViolationModal.issued_at ?? editViolationModal.issuedAt ?? new Date().toISOString(),
      expires_at: new Date(Date.now() + editVExpirationDays * 24 * 60 * 60 * 1000).toISOString(),
      related_report_id: editViolationModal.related_report_id ?? editViolationModal.reportId ?? null,
      active: editViolationModal.active ?? true,
    }).then((created) => {
      if (created) {
        void deleteViolationRecord(editViolationModal.id ?? "");
        void fetchViolations().then(setViolations);
        toast.success("Violation updated successfully");
        setEditViolationModal(null);
        setEditVMessage("");
        setEditVExpirationDays(90);
      }
    });
  };

  const openViolationModal = (
    mode: "violation" | "notice",
    landlordId: string,
    landlordName: string,
    apartmentTitle: string,
    reportId?: string,
    apartmentId?: string,
    sourceModule: AdminModule = isAdminModule(activeSection) ? activeSection : "overview",
  ) => {
    setVType(VIOLATION_TYPES[0]);
    setNType(NOTICE_TYPES[0]);
    setVMessage(""); setNMessage("");
    setVExpirationDays(90);
    setViolationModal({ open: true, mode, landlordId, landlordName, apartmentTitle, reportId, apartmentId, sourceModule });
  };

  const getLandlordForApt = (apt: ListingRecord) =>
    landlords.find((l) => l.id === apt.landlordId) ?? null;

  const violationsForLandlord = (lid: string) =>
    violations.filter((v) => {
      const violationLandlordId = text(v.landlordId ?? v.landlord_id);
      return violationLandlordId === lid && v.active !== false;
    });

  const verifiedCount      = landlords.filter((l) => l.isVerified ?? l.is_verified).length;
  const pendingCount       = landlords.filter((landlord) => {
    if (landlord.isVerified ?? landlord.is_verified) return false;
    const statuses = [landlord.landlord_status, landlord.verification_status, landlord.status]
      .map((value) => String(value ?? "").trim().toLowerCase());
    return !statuses.includes("rejected");
  }).length;
  const pendingReports     = reports.filter((r) => r.status === "pending").length;
  const activeAppealsCount = appeals.filter((appeal) => appeal.status === "pending" || appeal.status === "under_review" || appeal.status === "needs_information").length;
  const unreadNotifsCount  = adminNotifs.filter((n) => {
    const category = getNotificationCategory(n);
    return category !== "reports" && category !== "appeals" && !n.is_deleted && !isNotificationRead(n);
  }).length;

  const restoreAdminModule = (section: AdminModule) => {
    if (!user?.id) return;
    const remembered = getAdminModuleLocation(user.id, section);

    if (section === "landlords") {
      const landlordId = remembered?.view === "landlord-details" || remembered?.view === "landlord-action" ? remembered.landlordId : "";
      const landlord = landlordId ? landlords.find((item) => text(item.id) === landlordId) ?? null : null;
      setSelectedLandlord(landlord);
      if (remembered?.view === "landlord-action" && landlord) {
        openViolationModal(remembered.mode, landlordId, text(landlord.name, "Landlord"), "General", undefined, undefined, "landlords");
      } else if (violationModal?.sourceModule === "landlords") {
        setViolationModal(null);
      }
      if (remembered && remembered.view !== "overview" && !landlord) {
        rememberAdminModuleLocation(user.id, "landlords", { view: "overview" });
      }
    }

    if (section === "reports") {
      const reportId = remembered?.view === "report-review" ? remembered.reportId : "";
      const report = reportId ? [...reports, ...archivedReports].find((item) => text(item.id) === reportId) ?? null : null;
      setSelectedReport(report);
      if (remembered?.view === "report-review" && !report) {
        rememberAdminModuleLocation(user.id, "reports", { view: "overview" });
      }
    }

    if (section === "appeals") {
      const appealId = remembered?.view === "appeal-review" ? remembered.appealId : "";
      const appeal = appealId ? [...appeals, ...archivedAppeals].find((item) => text(item.id) === appealId) ?? null : null;
      setSelectedAppeal(appeal);
      if (remembered?.view === "appeal-review" && !appeal) {
        rememberAdminModuleLocation(user.id, "appeals", { view: "overview" });
      }
    }
  };

  const navigateToAdminModule = (section: PortalSection) => {
    setSidebarOpen(false);
    if (!isAdminModule(section)) {
      if (!isSuperAdminPortal) return;
      setActiveSection(section);
      navigate(`${portalBasePath}/${section}`);
      return;
    }
    if (!user?.id) {
      setActiveSection(section);
      navigate(`${portalBasePath}?section=${section}`);
      return;
    }
    const rememberedPath = getAdminModulePath(user.id, section);
    const path = isSuperAdminPortal && rememberedPath.startsWith("/admin/apartment/")
      ? rememberedPath.replace("/admin/apartment/", `${apartmentDetailBasePath}/`)
      : rememberedPath.startsWith("/dashboard") ? rememberedPath.replace("/dashboard", portalBasePath) : rememberedPath;
    if (path.startsWith("/admin/apartment/")) {
      navigate(path, { state: { returnTo: `${portalBasePath}?section=apartments`, backLabel: "Back to Apartments" } });
      return;
    }
    if (path.startsWith("/super-admin/apartment/")) {
      navigate(path, { state: { returnTo: `${portalBasePath}?section=apartments`, backLabel: "Back to Apartments" } });
      return;
    }
    restoreAdminModule(section);
    setActiveSection(section);
    navigate(path);
  };

  useEffect(() => {
    if (!navigationDataReady || !user?.id || !isAdminModule(requestedSection)) return;
    restoreAdminModule(requestedSection);
  }, [navigationDataReady, requestedSection, user?.id]);

  useEffect(() => {
    if (!navigationDataReady || !user?.id) return;
    if (activeSection === "landlords") {
      if (violationModal?.open && violationModal.sourceModule === "landlords") {
        rememberAdminModuleLocation(user.id, "landlords", { view: "landlord-action", landlordId: violationModal.landlordId, mode: violationModal.mode });
      } else if (selectedLandlord?.id) {
        rememberAdminModuleLocation(user.id, "landlords", { view: "landlord-details", landlordId: text(selectedLandlord.id) });
      } else {
        rememberAdminModuleLocation(user.id, "landlords", { view: "overview" });
      }
    } else if (activeSection === "reports") {
      rememberAdminModuleLocation(user.id, "reports", selectedReport?.id ? { view: "report-review", reportId: text(selectedReport.id) } : { view: "overview" });
    } else if (activeSection === "appeals") {
      rememberAdminModuleLocation(user.id, "appeals", selectedAppeal?.id ? { view: "appeal-review", appealId: text(selectedAppeal.id) } : { view: "overview" });
    } else if (isAdminModule(activeSection)) {
      rememberAdminModuleLocation(user.id, activeSection, { view: "overview" });
    }
  }, [activeSection, navigationDataReady, selectedAppeal?.id, selectedLandlord?.id, selectedReport?.id, user?.id, violationModal]);

  const handleLogout = () => { if (user?.id) clearAdminNavigationMemory(user.id); logout?.(); navigate("/"); };
// ── Sidebar ───────────────────────────────────────────────────────────────
  const PortalSidebarContent = () => {
    const navItemClass = (section: string) =>
      `app-sidebar-nav-item relative flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
        activeSection === section
          ? "bg-[#F3EFEA] text-[#8B735B] before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-[#8B735B]"
          : "text-[#302820] hover:bg-[#FAF8F5] hover:text-[#8B735B]"
      }`;
    const countBadge = "app-sidebar-badge ml-auto flex h-5 min-w-[22px] items-center justify-center rounded-full border border-[#D8C5B1] bg-white px-1.5 text-[10px] font-bold text-[#8B735B]";

    return (
      <div className="app-sidebar flex h-full min-w-0 select-none flex-col overflow-x-hidden overflow-y-auto">
        <div className="app-sidebar-brand px-5 pb-5 pt-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E8DED1] bg-[#FAF8F5] text-[#8B735B]">
              <Home className="h-6 w-6" />
            </span>
            <span><strong className="block text-xl font-bold tracking-tight text-[#302820]">AptFindr</strong><small className="text-xs font-medium text-[#756A60]">{isSuperAdminPortal ? "Super Admin Portal" : "Admin Portal"}</small></span>
          </div>
        </div>
        <div className="px-4 pb-5">
          <div className="app-sidebar-profile flex items-center gap-3 rounded-lg border border-[#E8DED1] bg-[#FAF8F5] px-3 py-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8B735B] text-sm font-bold text-white">{user?.name?.[0]?.toUpperCase() ?? "A"}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#302820]">{user?.name ?? (isSuperAdminPortal ? "Super Administrator" : "Admin")}</p><p className="mt-0.5 truncate text-xs text-[#756A60]">{user?.email ?? ""}</p>{isSuperAdminPortal && <span className="mt-1 inline-flex rounded bg-[#8B735B] px-1.5 py-0.5 text-[9px] font-black tracking-wider text-white">SUPER ADMIN</span>}</div>
            <Shield className="h-4 w-4 shrink-0 text-[#8B735B]" aria-label={isSuperAdminPortal ? "Super Administrator account" : "Administrator account"} />
          </div>
        </div>
        <nav className="space-y-1 px-3 py-3">
          <p className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756A60]"><span>Main</span><span className="h-px w-5 bg-[#8B735B]/45" /></p>
          {(isSuperAdminPortal ? NAV_MAIN.filter(({ section }) => section === "overview") : NAV_MAIN).map(({ icon: Icon, label, section }) => {
            const count = label === "Reports" ? pendingReports : label === "Appeals" ? activeAppealsCount : label === "Landlords" ? pendingCount : label === "Notifications" ? unreadNotifsCount : 0;
            return (
              <button key={section} aria-current={activeSection === section ? "page" : undefined} onClick={() => navigateToAdminModule(section as AdminModule)} className={navItemClass(section)}>
                <Icon className="h-4 w-4 shrink-0" /><span className="flex-1 text-left">{label}</span>
                {count > 0 && <span className={countBadge}>{count}</span>}
              </button>
            );
          })}
          {isSuperAdminPortal && <>
            <button aria-current={activeSection === "admin-management" ? "page" : undefined} onClick={() => navigateToAdminModule("admin-management")} className={navItemClass("admin-management")}><Users className="h-4 w-4 shrink-0" /><span className="flex-1 text-left">Admins</span></button>
            <button aria-current={activeSection === "user-management" ? "page" : undefined} onClick={() => navigateToAdminModule("user-management")} className={navItemClass("user-management")}><UserIcon className="h-4 w-4 shrink-0" /><span className="flex-1 text-left">Users</span></button>
            <button aria-current={activeSection === "help-center" ? "page" : undefined} onClick={() => navigateToAdminModule("help-center")} className={navItemClass("help-center")}><LifeBuoy className="h-4 w-4 shrink-0" /><span className="flex-1 text-left">Help Center</span></button>
            <button aria-current={activeSection === "audit-logs" ? "page" : undefined} onClick={() => navigateToAdminModule("audit-logs")} className={navItemClass("audit-logs")}><ClipboardList className="h-4 w-4 shrink-0" /><span className="flex-1 text-left">Audit Logs</span></button>
            <button aria-current={activeSection === "system-control" ? "page" : undefined} onClick={() => navigateToAdminModule("system-control")} className={navItemClass("system-control")}><Wrench className="h-4 w-4 shrink-0" /><span className="flex-1 text-left">System Control</span></button>
          </>}
        </nav>
        <nav className="space-y-1 border-t border-[#E8DED1] px-3 py-4">
          <p className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756A60]"><span>Account</span><span className="h-px w-5 bg-[#8B735B]/45" /></p>
          {isSuperAdminPortal && <button aria-current={activeSection === "profile" ? "page" : undefined} onClick={() => navigateToAdminModule("profile")} className={navItemClass("profile")}><UserIcon className="h-4 w-4 shrink-0" /><span className="flex-1 text-left">Profile</span></button>}
          {NAV_ACCOUNT.map(({ icon: Icon, label, section }) => (
            <button key={section} aria-current={activeSection === section ? "page" : undefined} onClick={() => navigateToAdminModule(section as AdminModule)} className={navItemClass(section)}>
              <Icon className="h-4 w-4 shrink-0" /><span className="flex-1 text-left">{label}</span>
            </button>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="mt-2 border-t border-[#E8DED1] px-4 py-4">
          <LogoutConfirmation onConfirm={handleLogout}>
            <button className="app-sidebar-logout flex w-full items-center gap-3 rounded-lg border border-[#E8DED1] bg-white px-3 py-3 text-sm font-semibold text-[#756A60] transition hover:border-red-100 hover:bg-red-50 hover:text-red-700">
              <LogOut className="h-4 w-4 shrink-0" /><span>Log Out</span>
            </button>
          </LogoutConfirmation>
        </div>
      </div>
    );
  };
 // ── Section: Notifications ────────────────────────────────────────────────
  const renderOverview = () => {
    const pendingAppealCount = appeals.filter((appeal) => ["pending", "under_review", "needs_information"].includes(String(appeal.status ?? "").toLowerCase())).length;
    const pendingReviewCount = allApartments.filter((apartment) =>
      String(apartment.approval_status ?? "").toLowerCase() === "pending"
    ).length;
    const pendingLandlords = landlords.filter((landlord) => {
      if (landlord.isVerified ?? landlord.is_verified) return false;
      const statuses = [landlord.landlord_status, landlord.verification_status, landlord.status].map((value) => String(value ?? "").toLowerCase());
      return !statuses.includes("rejected");
    });
    const getReportApartment = (report: DashboardReportRow) => allApartments.find((apartment) =>
      apartment.id === (report.apartmentId ?? report.apartment_id)
    );
    const getReportTitle = (report: DashboardReportRow) =>
      report.apartment_title ?? report.apartment ?? getReportApartment(report)?.title ?? "Apartment listing";
    const priorityTasks = [
      ...pendingLandlords.map((landlord) => ({ id: `landlord-${landlord.id}`, section: "landlords", icon: ShieldAlert, type: "Landlord Verification", context: `${landlord.name || "Unnamed landlord"} submitted verification information.`, timestamp: activityTimestamp(landlord.created_at as string | undefined), action: "Review" })),
      ...allApartments.filter((apartment) => String(apartment.approval_status ?? "").toLowerCase() === "pending").map((apartment) => ({ id: `apartment-${apartment.id}`, section: "apartments", icon: Building2, type: "Apartment Review", context: `${apartment.title || "Untitled apartment"} is waiting for review.`, timestamp: activityTimestamp(apartment.createdAt ?? apartment.created_at), action: "Review" })),
      ...reports.filter((report) => report.status === "pending").map((report) => ({ id: `report-${report.id}`, section: "reports", icon: Flag, type: "Report Review", context: `${getReportTitle(report)} has an unresolved report.`, timestamp: activityTimestamp(report.submittedAt ?? report.submitted_at), action: "View" })),
      ...appeals.filter((appeal) => ["pending", "under_review", "needs_information"].includes(String(appeal.status ?? "").toLowerCase())).map((appeal) => ({ id: `appeal-${appeal.id}`, section: "appeals", icon: FileText, type: "Appeal Review", context: `${landlords.find((landlord) => landlord.id === appeal.landlord_id)?.name || "Landlord"} has an appeal waiting for review.`, timestamp: activityTimestamp(appeal.submitted_at ?? appeal.created_at), action: "Review" })),
    ].sort((left, right) => new Date(left.timestamp ?? 0).getTime() - new Date(right.timestamp ?? 0).getTime()).slice(0, 6);
    const getNotificationActivityMeta = (notification: DashboardNotificationRow) => {
      const category = getNotificationCategory(notification);
      if (category === "reports") return { icon: Flag, tone: "bg-rose-50 text-rose-600", section: "reports" };
      if (category === "appeals") return { icon: FileText, tone: "bg-blue-50 text-blue-600", section: "appeals" };
      if (category === "landlord") return { icon: Users, tone: "bg-amber-50 text-amber-700", section: "landlords" };
      return { icon: Bell, tone: "bg-slate-100 text-slate-600", section: "notifications" };
    };
    const activity: AdminActivityItem[] = [
      ...reports.map((report) => ({
        id: `report-${report.id}`, timestamp: activityTimestamp(report.submittedAt ?? report.submitted_at),
        title: "Report submitted",
        detail: `${getReportTitle(report)}${report.reporter_name ?? report.reporter ? ` by ${report.reporter_name ?? report.reporter}` : ""}`,
        icon: Flag,
        tone: "bg-rose-50 text-rose-600", section: "reports",
      })),
      ...allApartments.map((apartment) => ({
        id: `apartment-${apartment.id}`, timestamp: activityTimestamp(apartment.createdAt ?? apartment.created_at),
        title: "Apartment added",
        detail: `${apartment.title}${landlords.find((landlord) => landlord.id === apartment.landlordId)?.name ? ` by ${landlords.find((landlord) => landlord.id === apartment.landlordId)?.name}` : ""}`,
        icon: Building2,
        tone: "bg-emerald-50 text-emerald-600", section: "apartments",
      })),
      ...violations.map((violation) => ({
        id: `violation-${violation.id}`, timestamp: activityTimestamp(violation.issuedAt ?? violation.issued_at),
        title: violation.mode === "notice" ? "Notice issued" : "Violation issued",
        detail: [violation.landlordName, violation.apartmentTitle].filter(Boolean).join(" - "),
        icon: violation.mode === "notice" ? Bell : AlertOctagon,
        tone: violation.mode === "notice" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600",
        section: "landlords",
      })),
      ...appeals.map((appeal) => ({
        id: `appeal-${appeal.id}`, timestamp: activityTimestamp(appeal.submitted_at ?? appeal.created_at),
        title: "Appeal submitted",
        detail: landlords.find((landlord) => landlord.id === appeal.landlord_id)?.name ?? "Landlord appeal",
        icon: FileText, tone: "bg-blue-50 text-blue-600", section: "appeals",
      })),
      ...adminNotifs.filter((notification) => !notification.is_deleted).map((notification) => {
        const meta = getNotificationActivityMeta(notification);
        return {
          id: `notification-${notification.id}`,
          timestamp: activityTimestamp(notification.createdAt ?? notification.created_at),
          title: safeNotificationText(notification.title, "Notification received"),
          detail: safeNotificationText(notification.message, "Administrative notification"),
          icon: meta.icon,
          tone: meta.tone,
          section: meta.section,
        };
      }),
      ...recentActivityLogs.map((log) => {
        const displayLog = formatAuditLogForDisplay(log);
        return {
          id: `audit-${log.id}`,
          timestamp: activityTimestamp(log.created_at),
          title: displayLog.title,
          detail: displayLog.detail,
          icon: History,
          tone: "bg-violet-50 text-violet-600",
          section: "admininfo",
        };
      }),
    ].filter((item) => item.timestamp)
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 5);
    const itemMotion = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

    if (isSuperAdminPortal) {
      const admins = platformUsers.filter((account) => account.role === "admin" || account.role === "super_admin");
      const tenants = platformUsers.filter((account) => ["tenant", "student", "employee"].includes(String(account.role)));
      const activeAdmins = admins.filter((account) => String(account.status ?? "active").toLowerCase() !== "disabled");
      const publishedApartments = allApartments.filter((apartment) => apartment.isPublished ?? apartment.is_published);
      const verifiedLandlords = landlords.filter((landlord) => landlord.isVerified ?? landlord.is_verified);
      const openHelpRequests = supportRequests.filter((ticket) => ["open", "in_progress"].includes(String(ticket.status ?? "open"))).length;
      const stats = [
        { label: "Total Users", value: platformUsers.length, icon: Users },
        { label: "Total Admins", value: admins.length, icon: ShieldCheck },
        { label: "Active Admins", value: activeAdmins.length, icon: CheckCircle2 },
        { label: "Total Landlords", value: landlords.length, icon: Users },
        { label: "Total Tenants", value: tenants.length, icon: UserIcon },
        { label: "Total Apartments", value: allApartments.length, icon: Building2 },
        { label: "Open Help Requests", value: openHelpRequests, icon: LifeBuoy },
        { label: "Platform Status", value: platformStatus?.status === "maintenance" ? "Maintenance" : "Operational", icon: Wrench },
      ];
      return <motion.div initial={false} animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }} className="mx-auto max-w-[1500px] space-y-5 text-[#302820]">
        <motion.header variants={itemMotion}><h1 className="text-2xl font-black md:text-3xl">Super Admin Dashboard</h1><p className="mt-1 text-sm text-[#756A60]">Platform administration and user oversight</p></motion.header>
        <motion.section variants={itemMotion} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{stats.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-xl border border-[#E8DED1] bg-white p-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3EFEA] text-[#8B735B]"><Icon className="h-5 w-5" /></span><p className="mt-3 text-xs font-semibold text-[#756A60]">{label}</p><strong className="mt-1 block text-2xl">{value}</strong></article>)}</motion.section>
        <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          <motion.section variants={itemMotion} className="rounded-xl border border-[#E8DED1] bg-white p-5"><div className="mb-4 flex items-center justify-between"><SectionHeading title="Admin Management" description="Recently registered administrator accounts." /><button onClick={() => navigateToAdminModule("admin-management")} className="text-xs font-bold text-[#8B735B]">Manage Admins →</button></div>{admins.length === 0 ? <OverviewEmpty icon={ShieldCheck} text="No administrators found." /> : <div className="divide-y divide-[#EEE6DC]">{admins.slice(0, 5).map((admin) => <div key={String(admin.id)} className="flex items-center gap-3 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3EFEA] font-bold text-[#8B735B]">{String(admin.name ?? "A")[0]}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{String(admin.name ?? "Administrator")}</strong><span className="block truncate text-xs text-[#756A60]">{String(admin.email ?? "")}</span></span><Badge className={String(admin.status).toLowerCase() === "disabled" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}>{String(admin.status).toLowerCase() === "disabled" ? "Inactive" : "Active"}</Badge></div>)}</div>}</motion.section>
          <motion.section variants={itemMotion} className="rounded-xl border border-[#E8DED1] bg-white p-5"><SectionHeading title="Platform Overview" description="Current platform-wide totals." /><dl className="divide-y divide-[#EEE6DC]">{[["Total Tenants", tenants.length], ["Total Landlords", landlords.length], ["Verified Landlords", verifiedLandlords.length], ["Total Apartments", allApartments.length], ["Published Apartments", publishedApartments.length]].map(([label, value]) => <div key={String(label)} className="flex justify-between py-3 text-sm"><dt className="text-[#756A60]">{label}</dt><dd className="font-black">{value}</dd></div>)}</dl></motion.section>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <motion.section variants={itemMotion} className="rounded-xl border border-[#E8DED1] bg-white p-5"><SectionHeading title="System Attention" description="Operational workload handled by normal Administrators." /><div className="grid gap-3 sm:grid-cols-2">{[["Landlord Verifications", pendingCount], ["Apartment Reviews", pendingReviewCount], ["Open Reports", pendingReports], ["Pending Appeals", pendingAppealCount]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-[#EEE6DC] p-4"><p className="text-xs text-[#756A60]">{label}</p><strong className="mt-1 block text-xl">{value}</strong></div>)}</div></motion.section>
          <motion.section variants={itemMotion} className="rounded-xl border border-[#E8DED1] bg-white p-5"><div className="mb-3 flex items-center justify-between"><SectionHeading title="Recent Administrative Activity" description="Latest real actions from audit logs." /><button onClick={() => navigateToAdminModule("audit-logs")} className="text-xs font-bold text-[#8B735B]">View Audit Logs →</button></div>{recentActivityLogs.length === 0 ? <OverviewEmpty icon={ClipboardList} text="No audit activity yet." /> : <div className="divide-y divide-[#EEE6DC]">{recentActivityLogs.slice(0, 5).map((log) => { const display = formatAuditLogForDisplay(log); return <div key={String(log.id)} className="py-3"><strong className="block text-xs">{display.title}</strong><p className="truncate text-xs text-[#756A60]">{display.detail}</p></div>; })}</div>}</motion.section>
        </div>
        <motion.section variants={itemMotion} className="rounded-xl border border-[#E8DED1] bg-white p-5"><div className="flex items-center justify-between"><SectionHeading title="User Overview" description="All registered user groups." /><button onClick={() => navigateToAdminModule("user-management")} className="text-xs font-bold text-[#8B735B]">View All Users →</button></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{[["Admins", admins.length], ["Landlords", landlords.length], ["Tenants", tenants.length]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-[#FAF8F5] p-4"><p className="text-xs text-[#756A60]">{label}</p><strong className="text-2xl">{value}</strong></div>)}</div></motion.section>
      </motion.div>;
    }

    return (
      <motion.div
        initial={false}
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.055 } } }}
        className="mx-auto max-w-[1500px] space-y-5 text-slate-900"
      >
        <motion.header variants={itemMotion} className="flex flex-col gap-4 pb-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-[#302820] md:text-3xl">{isSuperAdminPortal ? "Super Admin Dashboard" : "Admin Dashboard"}</h1>
            <p className="mt-1 text-sm text-[#756A60]">{isSuperAdminPortal ? "Platform administration and user oversight" : "Monitor platform activity and manage items that require administrative attention."}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigateToAdminModule("notifications")} title="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-600">
              <Bell className="h-4 w-4" />
              {unreadNotifsCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">{unreadNotifsCount}</span>}
            </button>
            <button onClick={() => navigateToAdminModule("admininfo")} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 shadow-sm transition hover:border-amber-300">
              {user?.avatar ? <img src={user.avatar} alt="" className="h-7 w-7 rounded-md object-cover" /> : <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-black text-white">{user?.name?.[0]?.toUpperCase() ?? "A"}</span>}
              <span className="hidden max-w-28 truncate text-xs font-bold text-slate-700 md:block">{user?.name || "Admin"}</span>
            </button>
          </div>
        </motion.header>

        <motion.section variants={itemMotion} className="rounded-xl border border-[#E8DED1] bg-white p-4 sm:p-5">
          <SectionHeading title="Needs Attention" description="Items currently requiring administrative action." />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Pending Verifications", value: pendingCount, suffix: "Pending", action: "View Landlords", icon: ShieldAlert, section: "landlords" },
            { label: "Pending Apartment Reviews", value: pendingReviewCount, suffix: "Pending", action: "View Apartments", icon: Building2, section: "apartments" },
            { label: "Open Reports", value: pendingReports, suffix: "Open", action: "View Reports", icon: Flag, section: "reports" },
            { label: "Pending Appeals", value: pendingAppealCount, suffix: "Pending", action: "View Appeals", icon: FileText, section: "appeals" },
          ].map(({ label, value, suffix, action, icon: Icon, section }) => (
            <motion.button key={label} whileHover={{ y: -2 }} onClick={() => isAdminModule(section) && navigateToAdminModule(section)} className="group rounded-xl border border-[#E8DED1] bg-white p-4 text-left transition hover:border-[#DCC9B4] hover:shadow-sm">
              <span className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-bold text-[#302820]">{label}</span><span className="mt-1 flex items-baseline gap-2"><strong className="text-2xl text-[#302820]">{value}</strong><small className="font-semibold text-[#756A60]">{suffix}</small></span></span></span>
              <span className="mt-3 flex items-center justify-between border-t border-[#EEE6DC] pt-3 text-xs font-bold text-[#8B735B]">{action}<ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
            </motion.button>
          ))}
          </div>
        </motion.section>

        <AdminAnalyticsOverview />

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeading title="Priority Tasks" description="Administrative actions currently waiting for review." />
            {priorityTasks.length === 0 ? <div className="py-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /><h3 className="mt-3 font-black text-[#302820]">You're all caught up</h3><p className="mt-1 text-xs text-[#756A60]">No administrative actions are currently waiting for review.</p></div> : (
              <div className="divide-y divide-[#EEE6DC]">
                {priorityTasks.map(({ id, section, icon: Icon, type, context, timestamp, action }) => (
                  <div key={id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-[#8B735B]"><Icon className="h-4 w-4" /></span><span className="min-w-0"><strong className="block text-xs text-[#302820]">{type}</strong><span className="block truncate text-xs text-[#756A60]">{context}</span><time className="text-[10px] text-slate-400">{formatOptionalDate(timestamp, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></span></span>
                    <button onClick={() => isAdminModule(section) && navigateToAdminModule(section)} className="h-8 rounded-md border border-[#DCC9B4] px-4 text-xs font-bold text-[#8B735B] hover:bg-[#FAF8F5]">{action}</button>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          <motion.section variants={itemMotion} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <SectionHeading title="Recent Activity" description="Latest platform and administrative activities." />
            {activity.length === 0 ? <OverviewEmpty icon={Clock} text="No recent activities." /> : (
              <div className="divide-y divide-slate-100">
                {activity.map(({ id, timestamp, title, detail, icon: Icon, tone, section }) => (
                  <button key={id} onClick={() => isAdminModule(section) && navigateToAdminModule(section)} className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-slate-50">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-3.5 w-3.5" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800">{title}</span><span className="block truncate text-xs text-slate-500">{detail}</span></span>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-400">{formatOptionalDate(timestamp, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.section>
        </div>

      </motion.div>
    );
  };

  // ── Section: Landlords ────────────────────────────────────────────────────
  const renderNotifications = () => {
    const notificationCenterItems = adminNotifs.filter((notification) => {
      const category = getNotificationCategory(notification);
      return category !== "reports" && category !== "appeals";
    });
    const activeNotifications = notificationCenterItems.filter((notification) => !notification.is_deleted);
    const unreadCount = activeNotifications.filter((notification) => !isNotificationRead(notification)).length;
    const selectNotificationView = (
      status: "all" | "unread" | "archived",
      type: "all" | "system" | "landlord" | "activities" | "reports" | "appeals" = "all",
    ) => {
      setNotifFilter(status);
      setNotifTypeFilter(type);
      setNotifActivityFilter("all");
    };
    const isViewActive = (status: typeof notifFilter, type: typeof notifTypeFilter = "all") =>
      notifFilter === status && notifTypeFilter === type;
    const notificationTone = (notification: DashboardNotificationRow) => {
      const category = getNotificationCategory(notification);
      if (category === "activities") return { icon: Activity, bg: "bg-violet-50", text: "text-violet-600" };
      if (category === "landlord") return { icon: Users, bg: "bg-amber-50", text: "text-amber-800" };
      return { icon: Bell, bg: "bg-stone-100", text: "text-stone-600" };
    };
    const activityTypes = Array.from(new Set(notificationCenterItems
      .filter((notification) => getNotificationCategory(notification) === "activities")
      .map((notification) => String(notification.payload?.activity_type ?? notification.type ?? ""))
      .filter(Boolean))).sort();
    const pageSize = 8;
    const pageCount = Math.max(1, Math.ceil(filteredNotifs.length / pageSize));
    const currentPage = Math.min(notifPage, pageCount);
    const visibleNotifs = filteredNotifs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5">
        <header>
          <h1 className="text-3xl font-black tracking-tight text-stone-950">Notifications</h1>
          <p className="mt-1 text-sm font-medium text-stone-500">Review system updates and items relevant to administration.</p>
        </header>
        <div className="flex gap-3">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <input value={notifSearch} onChange={(event) => setNotifSearch(event.target.value)} placeholder="Search notifications..." className="h-12 w-full rounded-xl border border-[#e7d8c9] bg-white pl-12 pr-4 text-sm text-stone-800 outline-none transition focus:border-[#8a6542] focus:ring-2 focus:ring-[#eadfd3]" />
          </label>
          <button onClick={() => void refreshAdminNotifications()} disabled={isRefreshingNotifs} title="Refresh" aria-label="Refresh notifications" className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#e7d8c9] bg-white text-[#6f4a2b] transition hover:bg-[#f7f1eb] disabled:opacity-50"><RefreshCw className={`h-5 w-5 ${isRefreshingNotifs ? "animate-spin" : ""}`} /></button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-[#6f4525]">{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You're all caught up."}</p>
          <Button variant="outline" onClick={() => void markNotifsRead()} disabled={isMarkingAllNotifs || unreadCount === 0} className="h-10 rounded-lg border-[#dfcdbb] text-sm font-bold text-[#6f4525] hover:bg-[#f7f1eb]"><CheckCheck className="mr-2 h-4 w-4" />{isMarkingAllNotifs ? "Marking..." : "Mark all as read"}</Button>
        </div>

        <section className="space-y-4">
          <div className="flex min-w-0 gap-1 overflow-x-auto rounded-xl border border-[#e7d8c9] bg-white p-1">
              {[
                { label: "All", status: "all", type: "all", icon: Bell },
                { label: "Unread", status: "unread", type: "all", icon: Mail },
                { label: "System", status: "all", type: "system", icon: ShieldAlert },
                { label: "Landlord", status: "all", type: "landlord", icon: Users },
                { label: "Activity", status: "all", type: "activities", icon: Activity },
                { label: "Archived", status: "archived", type: "all", icon: Archive },
              ].map(({ label, status, type, icon: Icon }) => {
                const selected = isViewActive(status as typeof notifFilter, type as typeof notifTypeFilter);
                return <button key={label} onClick={() => selectNotificationView(status as typeof notifFilter, type as typeof notifTypeFilter)} className={`flex h-9 flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${selected ? "bg-[#76502f] text-white" : "text-stone-600 hover:bg-[#f7f1eb] hover:text-stone-900"}`}><Icon className="h-3.5 w-3.5" />{label}</button>;
              })}
          </div>
          {notifTypeFilter === "activities" && <select value={notifActivityFilter} onChange={(event) => setNotifActivityFilter(event.target.value)} className="h-10 w-full max-w-xs rounded-lg border border-[#e7d8c9] bg-white px-3 text-sm font-medium text-stone-700 outline-none"><option value="all">All activity types</option>{activityTypes.map((type) => <option key={type} value={type}>{formatNotificationType(type)}</option>)}</select>}

          {notificationCenterItems.length === 0 ? (
            <NotificationEmpty title="No notifications found." message="New administrative notifications will appear here." />
          ) : filteredNotifs.length === 0 ? (
            notifFilter === "unread" && !notifSearch && notifTypeFilter === "all"
              ? <NotificationEmpty title="You're all caught up." message="You have no unread notifications." />
              : notifFilter === "archived" ? <ArchiveEmpty kind="notifications" icon={Bell} /> : <NotificationEmpty title="No notifications found." message="Try adjusting your search or filter." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#e7d8c9] bg-white">
              {visibleNotifs.map((notification) => {
                const tone = notificationTone(notification);
                const Icon = tone.icon;
                const archived = notification.is_deleted === true;
                const read = isNotificationRead(notification);
                const apartmentId = String(notification.payload?.apartment_id ?? notification.apartmentId ?? notification.action_target_id ?? "");
                const apartment = apartmentId ? allApartments.find((item) => item.id === apartmentId) : undefined;
                const rawActionUrl = String(notification.action_url ?? notification.payload?.action_url ?? "");
                const actionUrl = rawActionUrl.startsWith("/")
                  ? rawActionUrl
                  : apartment ? `${apartmentDetailBasePath}/${apartmentId}` : "";
                const supportTicketId = String(notification.payload?.ticket_id ?? notification.payload?.support_ticket_id ?? notification.action_target_id ?? "");
                const isSupportRequest = String(notification.type ?? "").toLowerCase() === "support_request"
                  || Boolean(notification.payload?.ticket_id ?? notification.payload?.support_ticket_id);
                const isAppealNotification = ["appeal_submitted", "appeal_information_submitted"].includes(String(notification.type ?? "").toLowerCase());
                const supportRequestLoading = loadingSupportRequestId === (notification.id ?? supportTicketId);
                return (
                  <motion.article
                    key={notification.id}
                    layout
                    className={`flex flex-col gap-3 border-b border-[#eee3d8] p-4 last:border-b-0 md:flex-row md:items-center ${!read && !archived ? "bg-[#fcf8f3]" : "bg-white"}`}
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.bg} ${tone.text}`}><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!read && !archived && <span className="h-2 w-2 rounded-full bg-[#7b4f2c]" aria-label="Unread" />}
                        <h3 className={`text-sm text-stone-900 ${read || archived ? "font-semibold" : "font-bold"}`}>{safeNotificationText(notification.title, "Notification")}</h3>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-stone-600">{safeNotificationText(notification.message, "No additional details provided.")}</p>
                      <p className="mt-1.5 text-xs font-medium text-stone-400">{formatOptionalDate(notification.createdAt ?? notification.created_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      {!archived && isSupportRequest && <Button size="sm" variant="outline" disabled={supportRequestLoading} onClick={() => void openSupportRequest(notification)} className="h-9 rounded-lg border-[#dfcdbb] text-xs font-bold text-[#6f4525]"><Eye className="mr-1.5 h-3.5 w-3.5" />{supportRequestLoading ? "Loading..." : "View Details"}</Button>}
                      {!archived && isAppealNotification && <Button size="sm" variant="outline" onClick={() => void openAppealNotification(notification)} className="h-9 rounded-lg border-[#dfcdbb] text-xs font-bold text-[#6f4525]"><Eye className="mr-1.5 h-3.5 w-3.5" />View Details</Button>}
                      {actionUrl && !archived && !isSupportRequest && !isAppealNotification && <Button size="sm" variant="outline" onClick={() => { if (!read && notification.id) void markNotificationRead(notification.id, user?.id); navigate(actionUrl, { state: { returnTo: `${portalBasePath}?section=notifications`, backLabel: "Back to Notifications" } }); }} className="h-9 rounded-lg border-[#dfcdbb] text-xs font-bold text-[#6f4525]"><Eye className="mr-1.5 h-3.5 w-3.5" />View Details</Button>}
                      {!archived && <button onClick={() => void toggleNotifReadStatus(notification.id || "", read)} title={read ? "Mark as unread" : "Mark as read"} aria-label={read ? "Mark as unread" : "Mark as read"} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7d8c9] text-stone-600 hover:bg-[#f7f1eb]">{read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}</button>}
                      {!archived && <button onClick={() => void archiveNotif(notification.id || "")} title="Archive" aria-label="Archive notification" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7d8c9] text-stone-600 hover:bg-[#f7f1eb]"><Archive className="h-4 w-4" /></button>}
                      {archived && <Button size="sm" variant="outline" disabled={deletingNotifId === notification.id} onClick={() => void unarchiveNotif(notification.id || "")} className="h-9 rounded-lg border-[#dfcdbb] text-xs font-bold text-[#6f4525]"><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Restore</Button>}
                      {archived && <Button size="sm" variant="outline" disabled={deletingNotifId === notification.id} onClick={() => setNotificationToDelete(notification)} className="h-9 rounded-lg border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50"><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete Permanently</Button>}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
          {filteredNotifs.length > pageSize && <nav className="flex items-center justify-center gap-2" aria-label="Notification pages">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setNotifPage((page) => Math.max(1, page - 1))} className="border-[#dfcdbb]">Previous</Button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => <button key={page} onClick={() => setNotifPage(page)} className={`h-9 min-w-9 rounded-lg text-sm font-bold ${page === currentPage ? "bg-[#76502f] text-white" : "text-stone-600 hover:bg-[#f7f1eb]"}`}>{page}</button>)}
            <Button variant="outline" size="sm" disabled={currentPage === pageCount} onClick={() => setNotifPage((page) => Math.min(pageCount, page + 1))} className="border-[#dfcdbb]">Next</Button>
          </nav>}
        </section>
      </motion.div>
    );
  };

  // ── Section: Apartments ───────────────────────────────────────────────────
  const renderLandlords = () => {
    const normalizedSearch = landlordSearch.trim().toLowerCase();
    const visibleLandlords = landlords
      .filter((landlord) => {
        const verified = (landlord.isVerified ?? landlord.is_verified) === true;
        const hasActiveViolation = violationsForLandlord(text(landlord.id)).length > 0;
        const matchesStatus = landlordStatusFilter === "all"
          || (landlordStatusFilter === "violations" ? hasActiveViolation : landlordStatusFilter === "verified" ? verified : !verified);
        const matchesSearch = !normalizedSearch || [landlord.name, landlord.email, landlord.id]
          .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
        return matchesStatus && matchesSearch;
      })
      .sort((left, right) => {
        if (landlordSort === "name") return String(left.name ?? "").localeCompare(String(right.name ?? ""));
        const leftTime = new Date(String(left.created_at ?? 0)).getTime();
        const rightTime = new Date(String(right.created_at ?? 0)).getTime();
        return landlordSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
      });
    const activeViolationCount = violations.filter((violation) => violation.active !== false).length;
    const currentDate = new Date().toLocaleDateString("en-PH", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FAF8F5] text-[#8B735B] shadow-sm">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-950 md:text-3xl">Landlord Verification</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Review landlord credentials and verification status.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button onClick={() => navigateToAdminModule("notifications")} title="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#E8DED1] bg-white text-[#756A60] shadow-sm transition hover:border-[#D8C5B1] hover:text-[#8B735B]">
              <Bell className="h-4 w-4" />
              {unreadNotifsCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">{unreadNotifsCount}</span>}
            </button>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#756A60] shadow-sm"><Calendar className="h-4 w-4 text-[#8B735B]" />{currentDate}</div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Landlords", value: landlords.length, note: "Registered landlords", icon: Users, tone: "bg-[#FAF8F5] text-[#8B735B]" },
            { label: "Pending Review", value: pendingCount, note: "Awaiting verification", icon: Clock, tone: "bg-[#FAF8F5] text-[#8B735B]" },
            { label: "Verified", value: verifiedCount, note: "Verified landlords", icon: CheckCircle2, tone: "bg-[#FAF8F5] text-[#8B735B]" },
            { label: "Violations", value: activeViolationCount, note: "Compliance information", icon: AlertTriangle, tone: "bg-[#FAF8F5] text-[#8B735B]" },
          ].map(({ label, value, note, icon: Icon, tone }) => (
            <button key={label} type="button" onClick={() => label === "Violations" ? setLandlordStatusFilter("violations") : undefined} className={`flex min-h-[112px] items-center gap-3 rounded-xl border border-[#E8DED1] bg-white p-4 text-left shadow-sm transition md:p-5 ${label === "Violations" ? "hover:bg-[#FAF8F5]" : "cursor-default"}`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span>
              <span className="min-w-0"><span className="block text-2xl font-black text-slate-950">{value}</span><span className="block truncate text-xs font-bold text-slate-700">{label}</span><span className="block truncate text-[10px] font-semibold text-slate-400">{note}</span></span>
            </button>
          ))}
        </section>

        <section className="grid gap-3 rounded-xl border border-[#E8DED1] bg-white p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_210px_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={landlordSearch} onChange={(event) => setLandlordSearch(event.target.value)} placeholder="Search landlords by name, email, or ID" className="h-10 w-full rounded-lg border border-[#E8DED1] bg-[#FAF8F5] pl-10 pr-3 text-sm font-medium text-[#302820] outline-none transition focus:border-[#8B735B] focus:bg-white focus:ring-2 focus:ring-[#EEE6DC]" />
          </label>
          <select value={landlordStatusFilter} onChange={(event) => setLandlordStatusFilter(event.target.value as "all" | "pending" | "verified" | "violations")} className="h-10 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] outline-none focus:border-[#8B735B]">
            <option value="all">Verification Status: All</option><option value="pending">Verification Status: Pending</option><option value="verified">Verification Status: Verified</option><option value="violations">Verification Status: Violations</option>
          </select>
          <select value={landlordSort} onChange={(event) => setLandlordSort(event.target.value as "newest" | "oldest" | "name")} className="h-10 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] outline-none focus:border-[#8B735B]">
            <option value="newest">Sort by: Newest</option><option value="oldest">Sort by: Oldest</option><option value="name">Sort by: Name</option>
          </select>
        </section>

        <section className="overflow-hidden rounded-xl border border-[#E8DED1] bg-white shadow-sm">
          {landlords.length === 0 ? (
            <OverviewEmpty icon={Users} text="No landlords registered yet." />
          ) : visibleLandlords.length === 0 ? (
            <OverviewEmpty icon={Search} text="No landlords match your current search or verification filter." />
          ) : (
            <div className="divide-y divide-[#EEE6DC]">
              {visibleLandlords.map((landlord) => {
                const landlordViolations = violationsForLandlord(text(landlord.id));
                const verified = (landlord.isVerified ?? landlord.is_verified) === true;
                const permitNumber = landlord.permitNumber ?? landlord.permit_number;
                return (
                  <motion.article key={landlord.id} whileHover={{ backgroundColor: "rgba(250, 248, 245, 0.85)" }} className="grid cursor-pointer gap-5 p-4 md:grid-cols-2 md:p-5 xl:grid-cols-[minmax(250px,1.35fr)_170px_minmax(180px,0.8fr)_220px] xl:items-center" onClick={() => setSelectedLandlord(landlord)}>
                    <div className="flex min-w-0 items-center gap-3">
                      {landlord.avatar_url ? <img src={landlord.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-[#E8DED1]" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FAF8F5] text-base font-black text-[#302820] ring-1 ring-[#E8DED1]">{landlord.name?.[0]?.toUpperCase() ?? "L"}</span>}
                      <div className="min-w-0">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Landlord</p>
                        <h3 className="truncate text-base font-black text-slate-950">{landlord.name || "Unnamed landlord"}</h3>
                        <p className="truncate text-xs font-medium text-slate-500">{landlord.email || "No email provided"}</p>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Registered {formatOptionalDate(landlord.created_at as string | undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Verification Status</p>
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#E8DED1] bg-[#FAF8F5] px-2.5 text-[10px] font-black text-[#6F4E37]">
                        {verified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{verified ? "Verified" : "Pending Review"}
                      </span>
                      {landlordViolations.length > 0 && <p className="mt-2 text-[10px] font-bold text-[#756A60]">{landlordViolations.length} active {landlordViolations.length === 1 ? "violation" : "violations"}</p>}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Submitted Credential</p>
                      {permitNumber ? <p className="mt-2 flex items-center gap-2 truncate text-sm font-bold text-slate-700"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><FileText className="h-3.5 w-3.5" /></span>Permit #{permitNumber}</p> : <p className="mt-2 text-xs font-medium text-slate-500">No permit information submitted.</p>}
                    </div>

                    <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
                      <Button size="sm" onClick={() => setSelectedLandlord(landlord)} className="h-9 w-full rounded-lg bg-[#8B735B] text-xs font-black text-white hover:bg-[#765F4A]"><Eye className="mr-1.5 h-3.5 w-3.5" />Review Details</Button>
                      <div className="grid grid-cols-3 gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setVerifyAction({ landlordId: text(landlord.id), verify: !verified })} className="h-8 rounded-md border-[#E8DED1] text-[10px] font-black text-[#302820] hover:bg-[#FAF8F5]">
                        {verified ? <XCircle className="mr-1 h-3 w-3" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}{verified ? "Revoke" : "Verify"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openViolationModal("violation", text(landlord.id), text(landlord.name, "Landlord"), "General")} className="h-8 rounded-md border-[#E8DED1] text-[10px] font-black text-[#302820] hover:bg-[#FAF8F5]"><AlertOctagon className="mr-1 h-3 w-3" />Violation</Button>
                      <Button variant="outline" size="sm" onClick={() => openViolationModal("notice", text(landlord.id), text(landlord.name, "Landlord"), "General")} className="h-8 rounded-md border-[#E8DED1] text-[10px] font-black text-[#302820] hover:bg-[#FAF8F5]"><BellRing className="mr-1 h-3 w-3" />Notice</Button>
                      </div>
                      <p className="text-center text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Verification · Administrative actions</p>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex gap-3 rounded-xl border border-[#E8DED1] bg-[#FAF8F5] p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#8B735B]" />
          <div><p className="text-sm font-black text-slate-800">Verification requirements</p><p className="mt-0.5 text-xs font-medium text-slate-600">Only verified landlords can add and edit apartments. Use violations for serious offenses and notices for warnings.</p></div>
        </section>
      </motion.div>
    );
  };

  const renderApartments = () => {
    const reportedCount = allApartments.filter((a) => getApartmentReportCount(a.id) > 0).length;
    const availableCount = allApartments.filter((apartment) => apartment.isPublished !== false && apartment.status === "available").length;
    const reviewCount = allApartments.filter((apartment) => apartment.isPublished === false).length;
    const propertyTypes = Array.from(new Set(allApartments.map((apartment) => apartment.propertyType).filter((value): value is string => Boolean(value)))).sort();
    const currentDate = new Date().toLocaleDateString("en-PH", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });

    return (
      <div className="space-y-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5">
          <header className="flex flex-col gap-4 pb-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#E8DED1] bg-[#FAF8F5] text-[#8B735B]"><Building2 className="h-5 w-5" /></span>
              <div><h1 className="text-2xl font-black text-[#302820] md:text-3xl">Apartments</h1><p className="text-sm font-medium text-[#756A60]">Review and manage apartment listings.</p></div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button onClick={() => setActiveSection("notifications")} title="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#E8DED1] bg-white text-[#756A60] shadow-sm transition hover:border-[#D8C5B1] hover:text-[#6F4E37]"><Bell className="h-4 w-4" />{unreadNotifsCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">{unreadNotifsCount}</span>}</button>
              <div className="flex h-10 items-center gap-2 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] shadow-sm"><Calendar className="h-4 w-4 text-[#8B735B]" />{currentDate}</div>
            </div>
          </header>

          <section className="grid overflow-hidden rounded-lg border border-[#E8DED1] bg-white shadow-sm sm:grid-cols-3">
            {[
              { label: "Total Apartments", value: allApartments.length, note: "All listings", icon: Building2 },
              { label: "Published", value: availableCount, note: "Visible to tenants", icon: CheckCircle2 },
              { label: "Under Review", value: reviewCount, note: "Requires inspection", icon: Clock },
            ].map(({ label, value, note, icon: Icon }) => (
              <div key={label} className="flex min-h-[108px] items-center gap-4 p-4 md:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-2xl font-black text-[#302820]">{value}</span><span className="block truncate text-xs font-bold text-[#302820]">{label}</span><span className="block truncate text-[10px] font-semibold text-[#756A60]">{note}</span></span></div>
            ))}
          </section>

          <section className="grid gap-3 rounded-lg border border-[#E8DED1] bg-white p-3 shadow-sm lg:grid-cols-[minmax(280px,1fr)_160px_190px_170px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#756A60]" />
              <input value={aptSearch} onChange={(event) => setAptSearch(event.target.value)} placeholder="Search apartments by name, location, or landlord" className="h-10 w-full rounded-lg border border-[#E8DED1] bg-[#FAF8F5] pl-10 pr-3 text-sm font-medium text-[#302820] outline-none transition placeholder:text-[#756A60] focus:border-[#D8C5B1] focus:bg-white focus:ring-2 focus:ring-[#EEE6DC]" />
            </label>
            <select value={aptStatusFilter} onChange={(event) => setAptStatusFilter(event.target.value as typeof aptStatusFilter)} className="h-10 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] outline-none focus:border-[#D8C5B1]"><option value="all">Status: All</option><option value="available">Published</option><option value="occupied">Occupied</option><option value="review">Under Review</option></select>
            <select value={aptPropertyTypeFilter} onChange={(event) => setAptPropertyTypeFilter(event.target.value)} className="h-10 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] outline-none focus:border-[#D8C5B1]"><option value="all">Property Type: All</option>{propertyTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
            <select value={aptSort} onChange={(event) => setAptSort(event.target.value as typeof aptSort)} className="h-10 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] outline-none focus:border-[#D8C5B1]"><option value="newest">Sort by: Newest</option><option value="oldest">Sort by: Oldest</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="name">Sort by: Name</option></select>
          </section>

          {filteredApts.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm"><OverviewEmpty icon={Building2} text={aptFilter === "reported" ? "No reported apartments." : allApartments.length === 0 ? "No apartments have been added yet." : "No apartments match the selected filters."} /></div>
          ) : (
            <section className="space-y-3">
              {filteredApts.map((apartment) => {
                const landlord = getLandlordForApt(apartment);
                const reportCount = getApartmentReportCount(apartment.id);
                const isReview = apartment.isPublished === false;
                const status = isReview
                  ? "Under Review"
                  : apartment.status === "occupied" ? "Occupied"
                    : apartment.status === "reserved" ? "Reserved"
                      : apartment.status === "maintenance" ? "Maintenance"
                        : "Published";
                const location = formatApartmentLocation(apartment);
                const roomCount = apartment.rooms?.length || apartment.bedrooms || 0;
                return (
                  <motion.article key={apartment.id} whileHover={{ y: -2 }} onClick={() => setSelectedApt(apartment)} className="group grid cursor-pointer overflow-hidden rounded-lg border border-[#E8DED1] bg-white shadow-sm transition-shadow hover:shadow-md md:grid-cols-[185px_minmax(0,1fr)_160px_150px] md:items-stretch">
                    <div className="relative h-40 overflow-hidden bg-[#FAF8F5] md:h-auto">
                      {apartment.image ? <ImageWithFallback src={apartment.image} alt={apartment.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full min-h-32 w-full items-center justify-center"><Building2 className="h-10 w-10 text-[#D8C5B1]" /></div>}
                    </div>
                    <div className="min-w-0 p-4">
                      <h3 className="truncate text-base font-black text-[#302820]">{apartment.title}</h3>
                      <p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-[#756A60]"><MapPin className="h-3 w-3 shrink-0 text-[#8B735B]" />{location || "Location not provided"}</p>
                      <p className="mt-2 truncate text-xs text-[#756A60]">Submitted by <span className="font-bold text-[#302820]">{landlord?.name || "Not available"}</span></p>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#756A60]">
                        <span className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5 text-[#8B735B]" />{roomCount || 0} {roomCount === 1 ? "Room/Unit" : "Rooms/Units"}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-[#8B735B]" />Added {formatOptionalDate(apartment.createdAt, { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>
                    <div className="flex items-center px-4 py-3">
                      <div><span className="inline-flex items-center gap-1.5 rounded-md border border-[#E8DED1] bg-[#FAF8F5] px-3 py-2 text-xs font-bold text-[#6F4E37]"><ShieldCheck className="h-3.5 w-3.5" />{status}</span>{reportCount > 0 && <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-600"><Flag className="h-3 w-3" />{reportCount} {reportCount === 1 ? "report" : "reports"}</p>}</div>
                    </div>
                    <div className="flex items-center p-4">
                      <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); navigate(`${apartmentDetailBasePath}/${apartment.id}`, { state: { returnTo: `${portalBasePath}?section=apartments`, backLabel: "Back to Apartments" } }); }} className="h-10 w-full rounded-md border-[#D8C5B1] text-xs font-black text-[#6F4E37] hover:bg-[#FAF8F5]"><Eye className="mr-1.5 h-3.5 w-3.5" />Inspect</Button>
                    </div>
                  </motion.article>
                );
              })}
            </section>
          )}
        </motion.div>

        <div className="hidden items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">All Apartments</h2>
            <p className="text-slate-500 text-sm font-medium">Browse, inspect, and take action on listings</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="hidden gap-3 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-amber-100 shadow-sm w-fit">
          <Button
            variant={aptFilter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setAptFilter("all")}
            className={`rounded-xl px-6 py-2 transition-all font-bold ${
              aptFilter === "all"
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-orange-300/50"
                : "text-slate-600 hover:text-amber-600 hover:bg-amber-50"
            }`}
          >
            <Building2 className="h-4 w-4 mr-2" />
            All ({allApartments.length})
          </Button>
          <Button
            variant={aptFilter === "reported" ? "default" : "ghost"}
            size="sm"
            onClick={() => setAptFilter("reported")}
            className={`rounded-xl px-6 py-2 transition-all font-bold ${
              aptFilter === "reported"
                ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg hover:shadow-red-300/50"
                : "text-slate-600 hover:text-red-600 hover:bg-red-50"
            }`}
          >
            <Flag className="h-4 w-4 mr-2" />
            Reported ({reportedCount})
          </Button>
        </div>

        {/* Search */}
        <div className="relative hidden">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
          <input
            value={aptSearch}
            onChange={(e) => setAptSearch(e.target.value)}
            placeholder="Search by name or location…"
            className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-amber-100 bg-white/90 backdrop-blur-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow"
          />
        </div>

      {/* Grid */}
      <div className="hidden grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredApts.map((apt) => {
          const landlord = getLandlordForApt(apt);
          const aptViolations = violations.filter((v) => v.apartment_id === apt.id || (!v.apartment_id && v.apartmentTitle === apt.title));
          const aptReportCount = getApartmentReportCount(apt.id);
          const isAvailable = new Date(apt.availableDate) <= new Date();
          return (
            <div key={apt.id}
              className="bg-white/90 backdrop-blur-xl border-2 border-amber-100/60 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer"
              onClick={() => setSelectedApt(apt)}>
              {/* Image */}
              <div className="relative h-44 bg-gradient-to-br from-amber-100 to-orange-100 overflow-hidden">
                {apt.images?.[0]
                  ? <img src={apt.images[0]} alt={apt.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  : <div className="w-full h-full flex items-center justify-center"><Building2 className="h-12 w-12 text-amber-300" /></div>}
                <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow ${
                    isAvailable ? "bg-green-500 text-white" : "bg-slate-500 text-white"
                  }`}>{isAvailable ? "Published" : "Occupied"}</span>
                  {aptReportCount > 0 && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-500 text-white shadow flex items-center gap-1">
                      <Flag className="h-3 w-3" />{aptReportCount} {aptReportCount === 1 ? "Report" : "Reports"}
                    </span>
                  )}
                  {aptViolations.length > 0 && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500 text-white shadow flex items-center gap-1">
                      <AlertOctagon className="h-3 w-3" />{aptViolations.length}
                    </span>
                  )}
                </div>
                {landlord && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-xl px-2.5 py-1">
                    <div className="h-5 w-5 rounded-lg bg-amber-400 flex items-center justify-center font-black text-white text-[9px]">
                      {landlord.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-white text-[10px] font-bold truncate max-w-[80px]">{landlord.name}</span>
                    {landlord.isVerified && <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />}
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="p-4">
                <h3 className="font-black text-slate-900 truncate mb-1">{apt.title}</h3>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mb-3">
                  <MapPin className="h-3 w-3 text-amber-500" />{apt.location}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-amber-700">₱{apt.price?.toLocaleString()}<span className="text-xs text-slate-400 font-medium">/mo</span></span>
                  <div className="flex gap-1.5">
                    {apt.wifi     && <span className="h-6 w-6 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center"><Wifi className="h-3 w-3 text-amber-600" /></span>}
                    {apt.parking  && <span className="h-6 w-6 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center"><Car className="h-3 w-3 text-amber-600" /></span>}
                    {apt.petFriendly && <span className="h-6 w-6 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center"><PawPrint className="h-3 w-3 text-amber-600" /></span>}
                    {apt.furnished && <span className="h-6 w-6 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center"><Sofa className="h-3 w-3 text-amber-600" /></span>}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-amber-50 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline"
                    onClick={() => setSelectedApt(apt)}
                    className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 font-bold rounded-xl text-xs">
                    <Eye className="h-3.5 w-3.5 mr-1.5" />Inspect
                  </Button>
                  {landlord && <>
                    <Button size="sm" variant="outline"
                      onClick={() => openViolationModal("violation", text(landlord.id), text(landlord.name, "Landlord"), apt.title, undefined, apt.id)}
                      className="border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl text-xs">
                      <AlertOctagon className="h-3.5 w-3.5 mr-1.5" />Violation
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => openViolationModal("notice", text(landlord.id), text(landlord.name, "Landlord"), apt.title, undefined, apt.id)}
                      className="border-amber-200 text-amber-700 hover:bg-amber-50 font-bold rounded-xl text-xs">
                      <Bell className="h-3.5 w-3.5 mr-1.5" />Notice
                    </Button>
                  </>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filteredApts.length === 0 && (
        <div className="hidden py-16 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-3 text-amber-200" />
          <p className="text-slate-400 font-medium">No apartments found</p>
        </div>
      )}

      {/* Apartment detail modal */}
      {selectedApt && (() => {
        const landlord = getLandlordForApt(selectedApt);
        const landlordVerificationStatus = getLandlordVerificationStatus(landlord);
        const landlordCanPublish = canPublishForLandlord(landlord);
        const publicationBlockedByLandlord = selectedApt.isPublished === false && !landlordCanPublish;
        const aptViolations = violations.filter((v) => v.apartment_id === selectedApt.id || (!v.apartment_id && v.apartmentTitle === selectedApt.title));
        const aptReports = reports.filter((r) => r.apartmentId === selectedApt.id && r.status === "pending");
        const isAvailable = new Date(selectedApt.availableDate) <= new Date();
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedApt(null)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-100 overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}>
              {/* Header image */}
              <div className="relative h-52 bg-gradient-to-br from-amber-100 to-orange-100 shrink-0">
                {selectedApt.images?.[0]
                  ? <ImageWithFallback src={selectedApt.images[0]} alt={selectedApt.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Building2 className="h-16 w-16 text-amber-300" /></div>}
                <button onClick={() => setSelectedApt(null)}
                  className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-black/50 backdrop-blur-sm hover:bg-black/70 flex items-center justify-center text-white transition-all">
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-4 left-4">
                  <span className={`text-xs font-black px-3 py-1.5 rounded-full shadow ${isAvailable ? "bg-green-500 text-white" : "bg-slate-600 text-white"}`}>
                    {isAvailable ? "Published" : "Occupied"}
                  </span>
                </div>
              </div>
              {/* Body */}
              <div className="overflow-y-auto p-6 space-y-5">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{selectedApt.title}</h3>
                  <p className="text-slate-500 text-sm font-medium flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-amber-500" />{selectedApt.location}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Room Pricing", value: "See individual rooms" },
                    { label: "Bedrooms", value: selectedApt.bedrooms ?? "—" },
                    { label: "Bathrooms", value: selectedApt.bathrooms ?? "—" },
                    { label: "Available", value: new Date(selectedApt.availableDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">{label}</p>
                      <p className="font-black text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
                {selectedApt.description && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{selectedApt.description}</p>
                  </div>
                )}
                {/* Amenities */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amenities</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "wifi",        icon: Wifi,       label: "WiFi" },
                      { key: "parking",     icon: Car,        label: "Parking" },
                      { key: "petFriendly", icon: PawPrint,   label: "Pet-friendly" },
                      { key: "furnished",   icon: Sofa,       label: "Furnished" },
                    ].map(({ key, icon: Icon, label }) => (
                      <span key={key} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border-2 ${
                        selectedApt[key] ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-400 line-through"
                      }`}>
                        <Icon className="h-3.5 w-3.5" />{label}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Features */}
                {Array.isArray(selectedApt.features) && selectedApt.features.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Features</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedApt.features.map((f: string, i: number) => (
                        <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Rooms */}
                {(selectedApt.rooms?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Rooms ({selectedApt.rooms?.length ?? 0})
                    </p>
                    <div className="space-y-2">
                      {(selectedApt.rooms ?? []).map((room, i) => {
                        const roomData = room as Record<string, unknown>;
                        return (
                        <div key={String(roomData.id ?? i)} className="p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-amber-800">{String(roomData.type ?? "Room")}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              roomData.isOccupied ? "bg-red-100 text-red-700 border border-red-200" : "bg-green-100 text-green-700 border border-green-200"
                            }`}>
                              {roomData.isOccupied ? "Occupied" : "Available"}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: "Rent", value: `₱${Number(roomData.rent ?? 0).toLocaleString()}/mo` },
                              { label: "Size", value: `${String(roomData.sqft ?? "—")} sqft` },
                              { label: "Max Pax", value: `${String(roomData.maxOccupants ?? "—")}` },
                            ].map(({ label, value }) => (
                              <div key={label} className="text-center p-1.5 bg-white rounded-lg border border-amber-100">
                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">{label}</p>
                                <p className="text-xs font-black text-slate-800 mt-0.5">{value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {Boolean(roomData.hasPrivateBath) && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                {roomData.bathroomType === "en-suite" ? "Private en-suite bath" : "Private separate bath"}
                              </span>
                            )}
                            {!Boolean(roomData.hasPrivateBath) && (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                                Shared bath{roomData.sharedBathLocation ? ` (${String(roomData.sharedBathLocation)})` : ""}
                              </span>
                            )}
                            {Boolean(roomData.hasAC) && (
                              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                                Air conditioned
                              </span>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Landlord */}
                {landlord && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Landlord</p>
                    <div className="flex items-center gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-black text-white text-sm shadow shrink-0">
                        {landlord.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-sm">{landlord.name}</p>
                        <p className="text-xs text-slate-400 font-medium">{landlord.email}</p>
                      </div>
                      {landlordCanPublish
                        ? <Badge className="bg-green-100 text-green-800 border border-green-200 font-bold text-xs shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                        : <Badge className="bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs shrink-0"><Clock className="h-3 w-3 mr-1" />{landlordVerificationStatus}</Badge>}
                    </div>
                    {publicationBlockedByLandlord && (
                      <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs font-bold leading-5 text-amber-800">
                          This apartment cannot be published because the landlord has not been verified.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedApt(null);
                            setSelectedLandlord(landlord);
                          }}
                          className="mt-2 h-8 rounded-lg border-amber-200 text-xs font-black text-amber-700 hover:bg-amber-100"
                        >
                          <FileText className="mr-1.5 h-3.5 w-3.5" />
                          Review Landlord Verification
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {/* Reports from tenants */}
                {aptReports.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Flag className="h-3.5 w-3.5" />
                      Pending Reports ({aptReports.length})
                    </p>
                    <div className="space-y-2">
                      {aptReports.map((r) => (
                        <div key={r.id} className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-1">
                              <Badge className="bg-orange-600 text-white text-[10px] font-black">{r.issueType}</Badge>
                              <span className="text-[10px] text-slate-500 font-medium">by {r.reporter} ({r.role})</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              {formatOptionalDate(r.submittedAt ?? r.submitted_at, { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium">{r.details}</p>
                          {r.contact && (
                            <p className="text-[10px] text-slate-500 mt-1">Contact: {r.contact}</p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline"
                              onClick={(e) => { e.stopPropagation(); resolveReport(text(r.id)); }}
                              className="flex-1 border-green-200 text-green-700 hover:bg-green-50 font-bold rounded-lg text-xs">
                              <CheckCheck className="h-3.5 w-3.5 mr-1" />Resolve
                            </Button>
                            <Button size="sm" variant="outline"
                              onClick={(e) => { e.stopPropagation(); dismissReport(text(r.id)); }}
                              className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs">
                              <XCircle className="h-3.5 w-3.5 mr-1" />Dismiss
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Past violations for this apartment */}
                {aptViolations.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Violations on this Listing</p>
                    <div className="space-y-2">
                      {aptViolations.map((v) => (
                        <div key={v.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                          <AlertOctagon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-black text-red-800">{v.type}</p>
                            {v.message && <p className="text-xs text-red-600 font-medium mt-0.5">{v.message}</p>}
                            <p className="text-[10px] text-red-400 mt-1">{formatOptionalDate(v.issuedAt ?? v.issued_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
                {/* Footer actions */}
                {landlord && (
                  <div className="px-6 py-4 border-t border-amber-50 flex gap-3 shrink-0 flex-wrap">
                  {selectedApt.isPublished === false && (
                    <Button
                      onClick={() => void handleApproveAndPublishApartment(selectedApt)}
                      disabled={publishingApartmentId === selectedApt.id || publicationBlockedByLandlord}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-xl shadow-md"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {publishingApartmentId === selectedApt.id ? "Publishing..." : "Approve & Publish"}
                    </Button>
                  )}
                  <Button onClick={() => navigate(`${apartmentDetailBasePath}/${selectedApt.id}`, { state: { returnTo: `${portalBasePath}?section=apartments`, backLabel: "Back to Apartments" } })}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-md">
                    <Eye className="h-4 w-4 mr-2" />Full Inspection
                  </Button>
                  <Button onClick={() => { setSelectedApt(null); openViolationModal("violation", text(landlord.id), text(landlord.name, "Landlord"), selectedApt.title, undefined, selectedApt.id); }}
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold rounded-xl shadow-md">
                    <AlertOctagon className="h-4 w-4 mr-2" />Issue Violation
                  </Button>
                  <Button variant="outline" onClick={() => { setSelectedApt(null); openViolationModal("notice", text(landlord.id), text(landlord.name, "Landlord"), selectedApt.title, undefined, selectedApt.id); }}
                    className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 font-bold rounded-xl">
                    <BellRing className="h-4 w-4 mr-2" />Send Notice
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
      </div>
    );
  };

  // ── Section: Reports ──────────────────────────────────────────────────────
  const renderReports = () => {
    const pending   = reports.filter((r: any) => r.status === "pending");
    const resolved  = reports.filter((r: any) => r.status === "resolved");
    const dismissed = reports.filter((r: any) => r.status === "dismissed");
    const reportSource = reportArchiveView ? archivedReports : reports;
    const reportTypes = Array.from(new Set(reportSource.map((report) => String(report.issueType ?? report.issue_type ?? report.category ?? "").trim()).filter(Boolean))).sort();
    const normalizedSearch = reportSearch.trim().toLowerCase();
    const getReportApartment = (report: DashboardReportRow) => allApartments.find((apartment) => apartment.id === (report.apartmentId ?? report.apartment_id));
    const getReportApartmentTitle = (report: DashboardReportRow) => report.apartment_title ?? report.apartment ?? getReportApartment(report)?.title ?? report.apartment_id ?? "Apartment unavailable";
    const getReporterLabel = (report: DashboardReportRow) => report.reporter_name ?? report.reporter ?? report.reporter_id ?? "Reporter unavailable";
    const visibleReports = reportSource
      .filter((report) => {
        const type = String(report.issueType ?? report.issue_type ?? report.category ?? "");
        const matchesStatus = reportArchiveView || reportStatusFilter === "all" || report.status === reportStatusFilter;
        const matchesType = reportTypeFilter === "all" || type === reportTypeFilter;
        const matchesSearch = !normalizedSearch || [getReportApartmentTitle(report), getReporterLabel(report), type, report.details, report.id]
          .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
        return matchesStatus && matchesType && matchesSearch;
      })
      .sort((left, right) => {
        const leftTime = new Date(left.submittedAt ?? left.submitted_at ?? 0).getTime();
        const rightTime = new Date(right.submittedAt ?? right.submitted_at ?? 0).getTime();
        return reportSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
      });
    const currentDate = new Date().toLocaleDateString("en-PH", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });

    if (selectedReport) {
      const reportApartment = selectedReportDetails?.apartment ?? getReportApartment(selectedReport);
      const reporter = selectedReportDetails?.reporter;
      const landlord = selectedReportDetails?.landlord;
      const reporterName = reporter?.name ?? selectedReport.reporter_name ?? selectedReport.reporter ?? "Reporter unavailable";
      const reporterRole = reporter?.role ?? selectedReport.reporter_role ?? selectedReport.role ?? "Role unavailable";
      const reporterContact = reporter?.email ?? selectedReport.contact;
      const issueType = String(selectedReport.issueType ?? selectedReport.issue_type ?? selectedReport.category ?? "Report type not specified");
      const apartmentName = selectedReport.apartment_title ?? selectedReport.apartment ?? reportApartment?.title;
      const statusClass = selectedReport.status === "resolved" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : selectedReport.status === "dismissed" ? "border-slate-200 bg-slate-100 text-slate-600" : "border-[#E8DED1] bg-[#FAF8F5] text-[#6F4E37]";
      const sectionClass = "rounded-xl border border-[#E8DED1] bg-white p-5 shadow-sm md:p-6";
      const sectionTitleClass = "text-xs font-black uppercase tracking-[0.08em] text-[#6F4E37]";

      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5">
          <div className="flex items-center justify-between gap-4">
            <button onClick={() => setSelectedReport(null)} className="inline-flex items-center gap-2 text-sm font-bold text-[#6F4E37] transition hover:text-[#302820]"><ArrowLeft className="h-4 w-4" />Back to Reports</button>
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveSection("notifications")} title="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#E8DED1] bg-white text-[#756A60] shadow-sm"><Bell className="h-4 w-4" />{unreadNotifsCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">{unreadNotifsCount}</span>}</button>
              <div className="hidden h-10 items-center gap-2 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] shadow-sm sm:flex"><Calendar className="h-4 w-4 text-[#8B735B]" />{currentDate}</div>
            </div>
          </div>

          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#FAF8F5] text-[#6F4E37]"><Flag className="h-6 w-6" /></span>
              <div><h1 className="text-2xl font-black text-[#302820] md:text-3xl">Report Details</h1><p className="mt-1 text-sm font-medium text-[#756A60]">Review the reported issue, related records, and submitted evidence.</p></div>
            </div>
          </header>
          <div className="flex flex-wrap items-center gap-3"><span className={`inline-flex rounded-full border px-4 py-1.5 text-xs font-black capitalize ${statusClass}`}>{selectedReport.status || "Pending"}</span><span className="text-xs font-medium text-[#756A60]">Submitted {formatOptionalDate(selectedReport.submittedAt ?? selectedReport.submitted_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>

          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>1. Reported Issue</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
              <div><p className="text-xs font-medium text-[#756A60]">Issue Type</p><p className="mt-2 text-sm font-black text-[#302820]">{issueType}</p></div>
              <div><p className="text-xs font-medium text-[#756A60]">Issue Description</p><p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-[#302820]">{selectedReport.details || "No description provided."}</p></div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>2. Reported By</h2>
              <div className="mt-5 flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-sm font-black text-[#6F4E37]">{text(reporterName).split(" ").map((name: string) => name[0]).join("").slice(0, 2).toUpperCase() || "R"}</span><div className="min-w-0 flex-1"><p className="font-black text-[#302820]">{reporterName}</p><p className="mt-0.5 text-xs font-medium capitalize text-[#756A60]">{reporterRole}</p>{reporterContact && <p className="mt-4 flex items-center gap-2 truncate text-sm text-[#756A60]"><Mail className="h-4 w-4 shrink-0 text-[#8B735B]" />{reporterContact}</p>}</div>{reporter && <Button size="sm" variant="outline" onClick={() => setViewingUserProfile(reporter)} className="border-[#D8C5B1] text-xs font-bold text-[#6F4E37]"><UserIcon className="mr-1 h-3.5 w-3.5" />View Reporter</Button>}</div>
            </section>

            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>3. Reported Apartment</h2>
              {reportApartment || apartmentName ? <><div className="mt-5 flex items-center gap-4"><span className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#FAF8F5]">{reportApartment?.image ? <ImageWithFallback src={reportApartment.image} alt={apartmentName || "Reported apartment"} className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-[#D8C5B1]" />}</span><div className="min-w-0"><p className="truncate font-black text-[#302820]">{apartmentName || "Apartment unavailable"}</p>{reportApartment && <p className="mt-1 text-xs leading-relaxed text-[#756A60]">{formatApartmentLocation(reportApartment) || "Location not provided"}</p>}</div></div><Button variant="outline" disabled={!reportApartment?.id} onClick={() => { if (reportApartment?.id) { setSelectedReport(null); navigate(`${apartmentDetailBasePath}/${reportApartment.id}`, { state: { returnTo: `${portalBasePath}?section=reports`, backLabel: "Back to Reports" } }); } }} className="mt-5 w-full border-[#D8C5B1] font-bold text-[#6F4E37] hover:bg-[#FAF8F5]"><Eye className="mr-2 h-4 w-4" />View Apartment</Button></> : <div className="mt-5"><p className="font-black text-[#302820]">Apartment unavailable</p><p className="mt-1 text-sm text-[#756A60]">The linked apartment information is currently unavailable.</p></div>}
            </section>
          </div>

          {landlord && <section className={sectionClass}><h2 className={sectionTitleClass}>4. Property Owner</h2><div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] font-black text-[#6F4E37]">{landlord.name?.[0]?.toUpperCase() || "L"}</span><div className="min-w-0 flex-1"><p className="font-black text-[#302820]">{landlord.name}</p>{landlord.email && <p className="mt-2 flex items-center gap-2 truncate text-sm text-[#756A60]"><Mail className="h-4 w-4 text-[#8B735B]" />{landlord.email}</p>}{landlord.mobile && <p className="mt-2 flex items-center gap-2 text-sm text-[#756A60]"><Phone className="h-4 w-4 text-[#8B735B]" />{landlord.mobile}</p>}</div><Button variant="outline" onClick={() => setViewingUserProfile(landlord)} className="border-[#D8C5B1] font-bold text-[#6F4E37]"><UserIcon className="mr-2 h-4 w-4" />View Landlord</Button></div></section>}

          <section className={sectionClass}><h2 className={sectionTitleClass}>5. Evidence ({selectedReportEvidence.length})</h2><div className="mt-5"><EvidenceViewer evidence={selectedReportEvidence} title="Submitted Evidence" /></div></section>

          <section className={sectionClass}><h2 className={sectionTitleClass}>6. Admin Decision</h2>{!reportArchiveView && selectedReport.status === "pending" ? <><p className="mt-3 text-sm text-[#756A60]">Choose the appropriate action based on your review of the report and evidence.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Button onClick={() => resolveReport(text(selectedReport.id))} className="h-11 bg-[#6F4E37] font-bold text-white hover:bg-[#5F4230]"><CheckCheck className="mr-2 h-4 w-4" />Resolve Report</Button><Button variant="outline" onClick={() => setDismissReportModal({ reportId: text(selectedReport.id), reason: "" })} className="h-11 border-[#D8C5B1] font-bold text-[#6F4E37] hover:bg-[#FAF8F5]"><XCircle className="mr-2 h-4 w-4" />Dismiss Report</Button></div></> : <div className="mt-4"><p className="text-sm font-medium text-[#756A60]">This report has been <span className="font-black capitalize text-[#302820]">{selectedReport.status}</span> on {formatOptionalDate(selectedReport.resolved_at, { month: "short", day: "numeric" })}.</p>{!reportArchiveView && canArchiveReportStatus(selectedReport.status) && <Button variant="outline" onClick={() => setCaseAction({ type: "archive-report", id: text(selectedReport.id), label: selectedReport.apartment || text(selectedReport.id) })} className="mt-4 border-[#D8C5B1] font-bold text-[#6F4E37]"><Archive className="mr-2 h-4 w-4" />Archive</Button>}</div>}</section>
        </motion.div>
      );
    }

    const ReportRow = ({ report }: { report: any }) => {
      const sev = SEVERITY_LABEL[report.severity] ?? SEVERITY_LABEL["med"];
      const reporterLabel = getReporterLabel(report);
      const reporterRole = String(report.reporter_role ?? report.role ?? "tenant");
      const reporterInitials = reporterLabel.split(/\s+/).map((name: string) => name[0]).join("").slice(0, 2).toUpperCase() || "T";
      const apartmentLabel = getReportApartmentTitle(report);
      const issueType = String(report.issueType ?? report.issue_type ?? report.category ?? "Report");
      return (
        <div
          className={`px-6 py-4 hover:bg-amber-50/40 transition-colors cursor-pointer ${
            report.status === "pending" ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-transparent"
          }`}
          onClick={() => setSelectedReport(report)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`mt-1 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs shadow ${
                reporterRole === "student" ? "bg-gradient-to-br from-blue-100 to-sky-100 text-blue-700" : "bg-gradient-to-br from-purple-100 to-violet-100 text-purple-700"
              }`}>
                {reporterInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="font-black text-slate-900 text-sm">{reporterLabel}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    reporterRole === "student" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                  }`}>{reporterRole}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev.class}`}>{sev.label}</span>
                  {report.status === "resolved"  && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">Resolved</span>}
                  {report.status === "dismissed" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Dismissed</span>}
                </div>
                <p className="text-xs text-slate-500 font-medium truncate">
                  <span className="text-amber-700 font-bold">{apartmentLabel}</span> — {issueType}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{report.details}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-slate-400 font-medium">
                {formatOptionalDate(report.submittedAt ?? report.submitted_at, { month: "short", day: "numeric" })}
              </p>
              <ChevronRight className="h-4 w-4 text-slate-300 ml-auto mt-1" />
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5">
          <header className="flex flex-col gap-4 pb-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#E8DED1] bg-[#FAF8F5] text-[#8B735B]"><Flag className="h-5 w-5" /></span>
              <div><h1 className="text-2xl font-black text-[#302820] md:text-3xl">Reports</h1><p className="text-sm font-medium text-[#756A60]">Review and manage reported issues.</p></div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button onClick={() => setActiveSection("notifications")} title="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#E8DED1] bg-white text-[#756A60] shadow-sm transition hover:border-[#D8C5B1] hover:text-[#6F4E37]"><Bell className="h-4 w-4" />{unreadNotifsCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">{unreadNotifsCount}</span>}</button>
              <div className="flex h-10 items-center gap-2 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] shadow-sm"><Calendar className="h-4 w-4 text-[#8B735B]" />{currentDate}</div>
            </div>
          </header>

          <section className="grid gap-3 md:grid-cols-3">
            {[
              { label: "Pending Reports", value: pending.length, note: "Awaiting review", icon: Clock },
              { label: "Resolved Reports", value: resolved.length, note: "Successfully resolved", icon: CheckCircle2 },
              { label: "Dismissed Reports", value: dismissed.length, note: "No action required", icon: XCircle },
            ].map(({ label, value, note, icon: Icon }) => (
              <motion.div key={label} whileHover={{ y: -2 }} className="flex min-h-[112px] items-center gap-4 rounded-lg border border-[#E8DED1] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><Icon className="h-5 w-5" /></span><span><span className="block text-2xl font-black text-[#302820]">{value}</span><span className="block text-xs font-bold text-[#302820]">{label}</span><span className="block text-[10px] font-semibold text-[#756A60]">{note}</span></span></motion.div>
            ))}
          </section>

          <section className="grid gap-3 rounded-lg border border-[#E8DED1] bg-white p-3 shadow-sm lg:grid-cols-[minmax(240px,1fr)_160px_190px_150px_auto]">
            <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#756A60]" /><input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search reports by apartment, reporter, type, or ID" className="h-10 w-full rounded-lg border border-[#E8DED1] bg-[#FAF8F5] pl-10 pr-3 text-sm font-medium text-[#302820] outline-none transition placeholder:text-[#756A60] focus:border-[#D8C5B1] focus:bg-white focus:ring-2 focus:ring-[#EEE6DC]" /></label>
            <select value={reportStatusFilter} onChange={(event) => setReportStatusFilter(event.target.value as typeof reportStatusFilter)} disabled={reportArchiveView} className="h-10 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] outline-none focus:border-[#D8C5B1] disabled:bg-[#FAF8F5] disabled:text-[#9A9189]"><option value="all">Status: All</option><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select>
            <select value={reportTypeFilter} onChange={(event) => setReportTypeFilter(event.target.value)} className="h-10 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] outline-none focus:border-[#D8C5B1]"><option value="all">Type: All</option>{reportTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
            <select value={reportSort} onChange={(event) => setReportSort(event.target.value as typeof reportSort)} className="h-10 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] outline-none focus:border-[#D8C5B1]"><option value="newest">Sort by: Newest</option><option value="oldest">Sort by: Oldest</option></select>
            <button onClick={() => setReportArchiveView((current) => !current)} className={`flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition ${reportArchiveView ? "border-[#8B735B] bg-[#8B735B] text-white" : "border-[#E8DED1] bg-white text-[#6F4E37] hover:bg-[#FAF8F5]"}`}><Archive className="h-3.5 w-3.5" />{reportArchiveView ? "Current Reports" : `Archived (${archivedReports.length})`}</button>
          </section>

          <section className="rounded-lg border border-[#E8DED1] bg-white p-3 shadow-sm">
            {reportArchiveView && archivedReports.length === 0 ? (
              <ArchiveEmpty kind="reports" icon={Flag} />
            ) : !reportArchiveView && reports.length === 0 ? (
              <div className="flex min-h-[390px] flex-col items-center justify-center p-6 text-center"><span className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-orange-50 text-orange-500"><Flag className="h-10 w-10" /></span><h3 className="text-xl font-black text-slate-900">No reports submitted yet.</h3><p className="mt-1 max-w-sm text-sm font-medium text-slate-500">Reports submitted by tenants will appear here for review.</p></div>
            ) : visibleReports.length === 0 ? (
              <OverviewEmpty icon={Search} text="No reports match the selected filters." />
            ) : (
              <div className="space-y-3">
                {visibleReports.map((report) => {
                  const apartment = getReportApartment(report);
                  const severity = SEVERITY_LABEL[report.severity ?? "med"] ?? SEVERITY_LABEL.med;
                  const reporterLabel = getReporterLabel(report);
                  const reporterIsId = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(reporterLabel);
                  const statusClass = report.status === "resolved" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : report.status === "dismissed" ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-[#FAF8F5] text-[#6F4E37] border-[#E8DED1]";
                  return (
                    <motion.article key={report.id} whileHover={{ y: -2 }} onClick={() => setSelectedReport(report)} className="grid cursor-pointer gap-4 rounded-lg border border-[#E8DED1] bg-white p-4 shadow-sm transition-shadow hover:shadow-md md:p-5 xl:grid-cols-[minmax(220px,1fr)_minmax(210px,1.1fr)_minmax(150px,0.7fr)_125px_190px] xl:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#FAF8F5]">{apartment?.image ? <ImageWithFallback src={apartment.image} alt={apartment.title} className="h-full w-full object-cover" /> : <Flag className="h-5 w-5 text-[#D8C5B1]" />}</span>
                        <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wide text-[#756A60]">Apartment</p><h3 className="mt-1 truncate text-sm font-black text-[#302820]">{getReportApartmentTitle(report)}</h3>{apartment && <p className="mt-1 line-clamp-2 text-[10px] font-medium text-[#756A60]">{formatApartmentLocation(apartment) || "Location not provided"}</p>}</div>
                      </div>
                      <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wide text-[#756A60]">Reported issue</p><p className="mt-1 truncate text-xs font-bold text-[#302820]">{String(report.issueType ?? report.issue_type ?? report.category ?? "Report type not specified")}</p><p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[#756A60]">{report.details || "No description provided."}</p></div>
                      <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wide text-[#756A60]">Reported by</p><p className={`mt-1 truncate font-bold ${reporterIsId ? "font-mono text-[10px] text-[#756A60]" : "text-xs text-[#302820]"}`}>{reporterLabel}</p><p className="mt-1 text-[10px] font-medium capitalize text-[#756A60]">{reporterIsId ? "Reporter ID" : report.reporter_role ?? report.role ?? "Role unavailable"}</p></div>
                      <div><p className="text-[9px] font-black uppercase tracking-wide text-[#756A60]">Submitted</p><p className="mt-1 text-[10px] font-semibold leading-relaxed text-[#302820]">{formatOptionalDate(report.submittedAt ?? report.submitted_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                      <div className="min-w-0"><div className="flex flex-wrap gap-1.5"><span className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-black capitalize ${statusClass}`}>{report.status || "Pending"}</span><span className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-bold ${severity.class}`}>{severity.label}</span></div>
                      <div className="mt-3 grid grid-cols-2 gap-2" onClick={(event) => event.stopPropagation()}>
                        <Button size="sm" onClick={() => setSelectedReport(report)} className="col-span-2 h-8 rounded-md bg-[#6F4E37] text-[10px] font-black text-white hover:bg-[#5F4230]"><Eye className="mr-1 h-3 w-3" />Review Report</Button>
                        {reportArchiveView ? <><Button size="sm" variant="outline" onClick={() => setCaseAction({ type: "restore-report", id: text(report.id), label: getReportApartmentTitle(report) })} className="h-8 rounded-md border-emerald-200 text-[10px] font-black text-emerald-700"><RotateCcw className="mr-1 h-3 w-3" />Restore</Button><Button size="sm" variant="outline" onClick={() => setCaseAction({ type: "delete-report", id: text(report.id), label: getReportApartmentTitle(report) })} className="h-8 rounded-md border-rose-200 text-[10px] font-black text-rose-700"><Trash2 className="mr-1 h-3 w-3" />Delete</Button></> : <><Button size="sm" variant="outline" disabled={!apartment?.id} onClick={() => apartment?.id && navigate(`${apartmentDetailBasePath}/${apartment.id}`, { state: { returnTo: `${portalBasePath}?section=reports`, backLabel: "Back to Reports" } })} className="col-span-2 h-8 rounded-md border-[#D8C5B1] text-[10px] font-black text-[#6F4E37] hover:bg-[#FAF8F5]"><Building2 className="mr-1 h-3 w-3" />View Apartment</Button>{canArchiveReportStatus(report.status) && <Button size="sm" variant="outline" onClick={() => setCaseAction({ type: "archive-report", id: text(report.id), label: getReportApartmentTitle(report) })} className="col-span-2 h-8 rounded-md border-[#E8DED1] text-[10px] font-black text-[#756A60]"><Archive className="mr-1 h-3 w-3" />Archive</Button>}</>}
                      </div></div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </section>
        </motion.div>

        <div className="hidden items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
            <Flag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">Reports</h2>
            <p className="text-slate-500 text-sm font-medium">Submitted by tenants</p>
          </div>
        </div>
        <div className="hidden grid-cols-3 gap-3">
          {[
            { label: "Pending",   count: pending.length,   grad: "from-amber-500 to-orange-600" },
            { label: "Resolved",  count: resolved.length,  grad: "from-green-500 to-emerald-600" },
            { label: "Dismissed", count: dismissed.length, grad: "from-slate-400 to-slate-500" },
          ].map(({ label, count, grad }) => (
            <div key={label} className="bg-white/90 backdrop-blur-xl border border-amber-100 rounded-2xl p-4 shadow text-center">
              <p className={`text-3xl font-black bg-gradient-to-r ${grad} bg-clip-text text-transparent`}>{count}</p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        {pending.length > 0 && (
          <Card className="hidden border-2 border-amber-200/60 bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
            <div className="px-6 py-3 border-b border-amber-50 bg-amber-50/50 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Pending — needs action</span>
            </div>
            <div className="divide-y divide-amber-50">{pending.map((r: any) => <ReportRow key={r.id} report={r} />)}</div>
          </Card>
        )}
        {(resolved.length > 0 || dismissed.length > 0) && (
          <Card className="hidden border-2 border-slate-100 bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Closed</span>
            </div>
            <div className="divide-y divide-slate-50">{[...resolved, ...dismissed].map((r: any) => <ReportRow key={r.id} report={r} />)}</div>
          </Card>
        )}
        {reports.length === 0 && (
          <div className="hidden py-16 text-center">
            <Flag className="h-12 w-12 mx-auto mb-3 text-amber-200" />
            <p className="text-slate-400 font-medium">No reports submitted yet</p>
          </div>
        )}

        {/* Dismiss Report Modal with Reason */}
        {dismissReportModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setDismissReportModal(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-amber-100 p-6"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-black text-slate-900 mb-2">Dismiss Report</h3>
              <p className="text-sm text-slate-500 font-medium mb-4">
                Why are you dismissing this report? (Optional)
              </p>
              <textarea
                value={dismissReportModal.reason}
                onChange={(e) => setDismissReportModal({ ...dismissReportModal, reason: e.target.value })}
                placeholder="e.g., Investigation inconclusive, False complaint, Already resolved by landlord..."
                className="w-full px-4 py-3 rounded-xl border-2 border-amber-200 bg-white/80 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                rows={4}
              />
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setDismissReportModal(null)}
                  className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (dismissReportModal.reportId) {
                      dismissReport(dismissReportModal.reportId, dismissReportModal.reason || undefined);
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl"
                >
                  Confirm Dismissal
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* User Profile Modal */}
        {viewingUserProfile && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setViewingUserProfile(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-amber-100 overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-black text-white">User Profile</h3>
                <button onClick={() => setViewingUserProfile(null)} className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
              <div className="px-6 py-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center font-black text-2xl text-orange-700 shadow shrink-0">
                    {viewingUserProfile.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-slate-900">{viewingUserProfile.name}</p>
                    <p className="text-xs text-slate-500 font-medium capitalize">{viewingUserProfile.role}</p>
                  </div>
                </div>
                <div className="space-y-3 pt-2 border-t border-amber-50">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                    <p className="text-sm font-medium text-slate-800">{viewingUserProfile.email}</p>
                  </div>
                  {viewingUserProfile.mobile && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                      <p className="text-sm font-medium text-slate-800">{viewingUserProfile.mobile}</p>
                    </div>
                  )}
                  {typeof viewingUserProfile.address === "string" && viewingUserProfile.address.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Address</p>
                      <p className="text-sm font-medium text-slate-800">{viewingUserProfile.address}</p>
                    </div>
                  )}
                  {viewingUserProfile.is_verified !== undefined && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Verification</p>
                      <Badge className={`text-xs font-bold ${
                        viewingUserProfile.is_verified ? "bg-green-100 text-green-800 border border-green-300" : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}>
                        {viewingUserProfile.is_verified ? "Verified" : "Pending"}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Section: Appeals Management ─────────────────────────────────────────
  const renderAppeals = () => {
    const landlordMap = new Map<string, DashboardUserRow>();
    landlords.forEach((l) => {
      if (l.id) landlordMap.set(l.id, l);
    });
    const getAppealMetadata = (appeal: DashboardAppealRow, kind: string) => {
      const documents = Array.isArray(appeal.supporting_docs) ? appeal.supporting_docs : [];
      return [...documents].reverse().find((entry) => entry && typeof entry === "object" && !Array.isArray(entry) && (entry as Record<string, unknown>).kind === kind) as Record<string, unknown> | undefined;
    };
    const getAppealContext = (appeal: DashboardAppealRow) => {
      const report = reports.find((item) => item.id === appeal.report_id) ?? archivedReports.find((item) => item.id === appeal.report_id);
      const violation = violations.find((item) => item.id === appeal.violation_id);
      const source = getAppealMetadata(appeal, "source");
      const apartmentId = String(report?.apartment_id ?? report?.apartmentId ?? violation?.apartment_id ?? source?.apartment_id ?? "");
      const apartment = allApartments.find((item) => item.id === apartmentId);
      return { report, violation, source, apartmentId, apartment };
    };
    const normalizedSearch = appealSearch.trim().toLowerCase();
    const appealSource = appealArchiveView ? archivedAppeals : appeals;
    const visibleAppeals = appealSource
      .filter((appeal) => {
        const landlord = landlordMap.get(appeal.landlord_id ?? "");
        const type = appeal.report_id ? "report" : appeal.violation_id ? "violation" : "general";
        const matchesType = appealTypeFilter === "all" || appealTypeFilter === type;
        const context = getAppealContext(appeal);
        const matchesSearch = !normalizedSearch || [landlord?.name, landlord?.email, appeal.reason, appeal.description, appeal.id, context.apartment?.title, context.source?.related_label]
          .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
        return matchesType && matchesSearch;
      })
      .sort((left, right) => {
        const leftTime = new Date(left.submitted_at ?? left.created_at ?? 0).getTime();
        const rightTime = new Date(right.submitted_at ?? right.created_at ?? 0).getTime();
        return appealSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
      });
    const reportAppealCount = appeals.filter((appeal) => Boolean(appeal.report_id)).length;
    const violationAppealCount = appeals.filter((appeal) => Boolean(appeal.violation_id)).length;
    const pendingAppealCount = appeals.filter((appeal) => appeal.status === "pending" || appeal.status === "under_review" || appeal.status === "needs_information").length;
    const currentDate = new Date().toLocaleDateString("en-PH", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });

    const handleUpdateAppealStatus = async () => {
      if (!selectedAppeal?.id || !user?.id) {
        toast.error("Cannot update appeal - missing information");
        return;
      }

      if (["needs_information", "approved", "rejected", "dismissed"].includes(appealStatus) && !appealResponse.trim()) {
        toast.error("Please enter a message for the landlord.");
        return;
      }

      try {
        const updated = await updateAppealStatus(
          selectedAppeal.id,
          appealStatus,
          user.id,
          appealResponse.trim()
        );

        if (updated) {
          toast.success(`Appeal marked as ${appealStatus.replace(/_/g, " ")}`);
          setAppeals((prev) => prev.map((a) => (a.id === selectedAppeal.id ? updated : a)));
          setSelectedAppeal(null);
          setAppealResponse("");
          setAppealStatus("under_review");
        } else {
          toast.error("Failed to update appeal");
        }
      } catch (error) {
        console.error("Error updating appeal:", error);
        toast.error("Error updating appeal");
      }
    };

    if (selectedAppeal) {
      const landlord = landlordMap.get(selectedAppeal.landlord_id ?? "");
      const context = getAppealContext(selectedAppeal);
      const appealType = selectedAppeal.report_id ? "Report Appeal" : selectedAppeal.violation_id ? context.violation?.mode === "notice" ? "Notice Appeal" : "Violation Appeal" : "General Appeal";
      const evidenceDocuments = (selectedAppeal.supporting_docs ?? []).map((doc, index) => {
        const document = typeof doc === "object" && doc !== null && !Array.isArray(doc) ? doc as Record<string, unknown> : null;
        if (document && document.kind !== "evidence") return null;
        const url = typeof doc === "string" ? doc : String(document?.file_url ?? document?.url ?? "");
        const name = String(document?.file_name ?? document?.name ?? `Supporting evidence ${index + 1}`);
        return { url, name };
      }).filter((document): document is { url: string; name: string } => Boolean(document));
      const relatedReportTitle = context.report ? String(context.report.issueType ?? context.report.issue_type ?? context.report.category ?? context.report.apartment_title ?? "Related report") : "Report unavailable";
      const statusClass = selectedAppeal.status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : selectedAppeal.status === "rejected" || selectedAppeal.status === "dismissed" ? "border-slate-200 bg-slate-100 text-slate-600" : "border-[#E8DED1] bg-[#FAF8F5] text-[#6F4E37]";
      const sectionClass = "rounded-xl border border-[#E8DED1] bg-white p-5 shadow-sm md:p-6";
      const headingClass = "text-xs font-black uppercase tracking-[0.08em] text-[#6F4E37]";

      return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5">
        <div className="flex items-center justify-between gap-4"><button onClick={() => { setSelectedAppeal(null); setAppealResponse(""); setAppealStatus("under_review"); }} className="inline-flex items-center gap-2 text-sm font-bold text-[#6F4E37] hover:text-[#302820]"><ArrowLeft className="h-4 w-4" />Back to Appeals</button><div className="flex items-center gap-2"><button onClick={() => setActiveSection("notifications")} title="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#E8DED1] bg-white text-[#756A60] shadow-sm"><Bell className="h-4 w-4" />{unreadNotifsCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">{unreadNotifsCount}</span>}</button><div className="hidden h-10 items-center gap-2 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] shadow-sm sm:flex"><Calendar className="h-4 w-4 text-[#8B735B]" />{currentDate}</div></div></div>

        <header className="flex items-center gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#FAF8F5] text-[#6F4E37]"><Flag className="h-6 w-6" /></span><div><h1 className="text-2xl font-black text-[#302820] md:text-3xl">Review Appeal</h1><p className="mt-1 text-sm font-medium text-[#756A60]">Review the appeal, related case, supporting evidence, and administrative decision.</p></div></header>
        <div className="flex flex-wrap items-center gap-3"><span className="rounded-full border border-[#D8C5B1] bg-[#FAF8F5] px-4 py-1.5 text-xs font-black text-[#6F4E37]">{appealType}</span><span className={`rounded-full border px-4 py-1.5 text-xs font-black capitalize ${statusClass}`}>{String(selectedAppeal.status || "Pending").replace(/_/g, " ")}</span><span className="text-xs font-medium text-[#756A60]">Submitted {formatOptionalDate(selectedAppeal.submitted_at ?? selectedAppeal.created_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>

        <section className={sectionClass}><h2 className={headingClass}>1. Appeal Submitted By</h2><div className="mt-5 flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] font-black text-[#6F4E37]">{landlord?.name?.[0]?.toUpperCase() ?? "L"}</span><div className="min-w-0"><p className="font-black text-[#302820]">{landlord?.name || "Landlord unavailable"}</p>{landlord?.email && <p className="mt-3 flex items-center gap-2 text-sm text-[#756A60]"><Mail className="h-4 w-4 text-[#8B735B]" />{landlord.email}</p>}{landlord?.mobile && <p className="mt-2 flex items-center gap-2 text-sm text-[#756A60]"><Phone className="h-4 w-4 text-[#8B735B]" />{landlord.mobile}</p>}</div></div></section>

        <section className={sectionClass}><h2 className={headingClass}>2. Related Case</h2><div className="mt-5 grid gap-5 md:grid-cols-2"><div><p className="text-xs font-medium text-[#756A60]">Appeal Type</p><p className="mt-2 text-sm font-black text-[#302820]">{appealType}</p><p className="mt-5 text-xs font-medium text-[#756A60]">Apartment</p><p className="mt-2 text-sm font-black text-[#302820]">{context.apartment?.title || String(context.source?.apartment_title ?? "Apartment unavailable")}</p>{context.apartment && <p className="mt-1 text-xs text-[#756A60]">{formatApartmentLocation(context.apartment) || "Location not provided"}</p>}</div><div><p className="text-xs font-medium text-[#756A60]">{selectedAppeal.report_id ? "Related Report" : selectedAppeal.violation_id ? "Related Violation" : "Related Record"}</p><p className="mt-2 text-sm font-black text-[#302820]">{selectedAppeal.report_id ? relatedReportTitle : selectedAppeal.violation_id ? context.violation?.mode === "notice" ? "Administrative notice" : "Administrative violation" : String(context.source?.related_label ?? "Unavailable")}</p>{(selectedAppeal.report_id || selectedAppeal.violation_id) && <p className="mt-1 break-all text-[10px] text-[#756A60]">Record ID: {selectedAppeal.report_id || selectedAppeal.violation_id}</p>}</div></div><div className="mt-5 flex flex-wrap gap-3">{context.report && <Button variant="outline" onClick={() => { setSelectedReport(context.report!); setActiveSection("reports"); }} className="border-[#D8C5B1] font-bold text-[#6F4E37]"><Eye className="mr-2 h-4 w-4" />View Report</Button>}{context.apartmentId && <Button variant="outline" onClick={() => navigate(`/admin/apartment/${context.apartmentId}`, { state: { returnTo: "/dashboard?section=appeals", backLabel: "Back to Appeals" } })} className="border-[#D8C5B1] font-bold text-[#6F4E37]"><Building2 className="mr-2 h-4 w-4" />View Apartment</Button>}</div></section>

        <section className={sectionClass}><h2 className={headingClass}>3. Appeal Reason</h2><div className="mt-5"><p className="text-xs font-medium text-[#756A60]">Reason</p><p className="mt-2 whitespace-pre-wrap text-sm text-[#302820]">{selectedAppeal.reason || "—"}</p>{selectedAppeal.description && <div className="mt-5 border-t border-[#E8DED1] pt-5"><p className="text-[10px] font-black uppercase tracking-wide text-[#756A60]">Landlord&apos;s Explanation</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#302820]">{selectedAppeal.description}</p></div>}</div></section>

        <section className={sectionClass}><h2 className={headingClass}>4. Supporting Evidence ({evidenceDocuments.length})</h2>{evidenceDocuments.length > 0 ? <div className="mt-5 space-y-3">{evidenceDocuments.map((document, index) => <div key={`${document.url}-${index}`} className="flex flex-col gap-3 rounded-lg border border-[#E8DED1] bg-[#FFFEFC] p-4 sm:flex-row sm:items-center"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><FileText className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#302820]">{document.name}</p><p className="mt-1 text-[10px] text-[#756A60]">Submitted evidence</p></div>{document.url && <a href={document.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center rounded-md border border-[#D8C5B1] px-4 text-xs font-bold text-[#6F4E37] hover:bg-[#FAF8F5]"><Eye className="mr-2 h-3.5 w-3.5" />Preview</a>}</div>)}</div> : <p className="mt-4 text-sm text-[#756A60]">No supporting evidence submitted.</p>}</section>

        <section className={sectionClass}><h2 className={headingClass}>5. Admin Decision</h2>{selectedAppeal.admin_response && <div className="mt-5 rounded-lg border border-[#E8DED1] bg-[#FAF8F5] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-medium text-[#756A60]">Decision</p><span className={`mt-2 inline-flex rounded-md border px-2 py-1 text-[10px] font-black capitalize ${statusClass}`}>{String(selectedAppeal.status || "Pending").replace(/_/g, " ")}</span></div>{selectedAppeal.reviewed_at && <div><p className="text-xs font-medium text-[#756A60]">Decision Date</p><p className="mt-2 text-xs font-bold text-[#302820]">{formatOptionalDate(selectedAppeal.reviewed_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>}</div><div className="mt-4 border-t border-[#E8DED1] pt-4"><p className="text-xs font-medium text-[#756A60]">Admin Response</p><p className="mt-2 text-sm text-[#302820]">{selectedAppeal.admin_response}</p></div></div>}
          <div className="mt-5"><label className="block text-xs font-bold text-[#302820]">Update Status</label><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{(["under_review", "needs_information", "approved", "rejected", "dismissed"] as const).map((status) => <Button key={status} disabled={appealArchiveView} onClick={() => setAppealStatus(status)} className={`text-xs font-bold ${appealStatus === status ? "bg-[#6F4E37] text-white hover:bg-[#5F4230]" : "bg-[#FAF8F5] text-[#6F4E37] hover:bg-[#EEE6DC]"}`}>{status === "under_review" ? "Under Review" : status === "needs_information" ? "Request Info" : status.charAt(0).toUpperCase() + status.slice(1)}</Button>)}</div></div>
          <div className="mt-5"><label className="block text-xs font-bold text-[#302820]">Admin Response Message</label><textarea disabled={appealArchiveView} value={appealResponse} onChange={(event) => setAppealResponse(event.target.value)} placeholder="Enter your decision and explanation..." className="mt-2 min-h-[100px] w-full resize-y rounded-lg border border-[#D8C5B1] bg-white px-3 py-2 text-xs font-medium text-[#302820] outline-none focus:ring-2 focus:ring-[#EEE6DC]" /></div>
          <div className="mt-5 flex flex-wrap gap-3"><Button disabled={appealArchiveView} onClick={handleUpdateAppealStatus} className="min-w-48 flex-1 bg-[#6F4E37] font-black text-white hover:bg-[#5F4230]">Save Appeal Decision</Button><Button onClick={() => { setSelectedAppeal(null); setAppealResponse(""); setAppealStatus("under_review"); }} variant="outline" className="border-[#D8C5B1] font-bold text-[#6F4E37]">Cancel</Button></div>{!appealArchiveView && canArchiveAppealStatus(selectedAppeal.status) && <Button variant="outline" onClick={() => setCaseAction({ type: "archive-appeal", id: text(selectedAppeal.id), label: selectedAppeal.reason || text(selectedAppeal.id) })} className="mt-3 w-full border-[#E8DED1] font-bold text-[#756A60]"><Archive className="mr-2 h-4 w-4" />Archive</Button>}</section>
      </motion.div>;
    }

    return ((selectedAppeal: DashboardAppealRow | null) => (
      <div className="space-y-5">
        <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-[1500px] flex-col gap-4 pb-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#E8DED1] bg-[#FAF8F5] text-[#8B735B]"><Flag className="h-5 w-5" /></span>
            <div><h1 className="text-2xl font-black text-[#302820] md:text-3xl">Appeals</h1><p className="text-sm font-medium text-[#756A60]">Review and manage landlord appeals.</p></div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button onClick={() => setActiveSection("notifications")} title="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#E8DED1] bg-white text-[#756A60] shadow-sm transition hover:border-[#D8C5B1] hover:text-[#6F4E37]"><Bell className="h-4 w-4" />{unreadNotifsCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-black leading-4 text-white">{unreadNotifsCount}</span>}</button>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] shadow-sm"><Calendar className="h-4 w-4 text-[#8B735B]" />{currentDate}</div>
          </div>
        </motion.header>

        <div className="hidden items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest">
              Appeal Management ({appeals.length})
            </h2>
          </div>
        </div>

        {selectedAppeal ? (
          // Detail view
          <div className="space-y-4">
            <Button
              onClick={() => {
                setSelectedAppeal(null);
                setAppealResponse("");
                setAppealStatus("under_review");
              }}
              variant="outline"
              className="border-amber-200 text-amber-600 hover:bg-amber-50 font-bold text-xs"
            >
              Back to Appeals
            </Button>

            <Card className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <CardContent className="pt-6 space-y-4">
                {/* Landlord Info */}
                {selectedAppeal.landlord_id && (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <h3 className="font-bold text-sm text-slate-900 mb-2">Landlord Information</h3>
                    {(() => {
                      const landlord = landlordMap.get(selectedAppeal.landlord_id);
                      return landlord ? (
                        <div className="space-y-1 text-xs">
                          <p><strong>Name:</strong> {landlord.name || "—"}</p>
                          <p><strong>Email:</strong> {landlord.email || "—"}</p>
                          <p><strong>Phone:</strong> {landlord.mobile || "—"}</p>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-xs">Landlord record unavailable.</p>
                      );
                    })()}
                  </div>
                )}

                {(() => {
                  const context = getAppealContext(selectedAppeal);
                  const contact = getAppealMetadata(selectedAppeal, "contact");
                  return <div className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-2">
                    <div><p className="text-[10px] font-black uppercase text-blue-500">Apartment</p><p className="mt-1 text-sm font-bold text-slate-800">{context.apartment?.title || String(context.source?.apartment_title ?? "Unavailable")}</p>{context.apartmentId && <Button size="sm" variant="outline" onClick={() => navigate(`/admin/apartment/${context.apartmentId}`, { state: { returnTo: "/dashboard?section=appeals", backLabel: "Back to Appeals" } })} className="mt-2 h-8 border-blue-200 text-[10px] font-black text-blue-700"><Eye className="mr-1 h-3 w-3" />Open Apartment</Button>}</div>
                    <div><p className="text-[10px] font-black uppercase text-blue-500">Related record</p><p className="mt-1 break-all text-xs font-bold text-slate-800">{selectedAppeal.violation_id ? `${context.violation?.mode === "notice" ? "Notice" : "Violation"}: ${selectedAppeal.violation_id}` : selectedAppeal.report_id ? `Report: ${selectedAppeal.report_id}` : String(context.source?.related_label ?? "Admin message")}</p>{context.report && <Button size="sm" variant="outline" onClick={() => { setSelectedReport(context.report!); setActiveSection("reports"); }} className="mt-2 h-8 border-blue-200 text-[10px] font-black text-blue-700"><Flag className="mr-1 h-3 w-3" />Open Report</Button>}</div>
                    <div><p className="text-[10px] font-black uppercase text-blue-500">Contact information</p><p className="mt-1 break-all text-xs font-bold text-slate-800">{String(contact?.value ?? landlordMap.get(selectedAppeal.landlord_id ?? "")?.email ?? "Not provided")}</p></div>
                  <div><p className="text-[10px] font-black uppercase text-blue-500">Submitted</p><p className="mt-1 text-xs font-bold text-slate-800">{formatOptionalDate(selectedAppeal.submitted_at ?? selectedAppeal.created_at, { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                  </div>;
                })()}

                {/* Appeal Details */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-900">Appeal Details</h3>

                  {selectedAppeal.report_id && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <Badge className="bg-blue-600 mb-2">Report Appeal</Badge>
                      <p className="text-xs text-slate-600">Linked report information is available to the review workflow.</p>
                    </div>
                  )}

                  {selectedAppeal.violation_id && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <Badge className="bg-red-600 mb-2">{getAppealContext(selectedAppeal).violation?.mode === "notice" ? "Notice Appeal" : "Violation Appeal"}</Badge>
                      <p className="text-xs text-slate-600">The linked {getAppealContext(selectedAppeal).violation?.mode === "notice" ? "notice" : "violation"} is attached to this review.</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">Reason for Appeal</label>
                    <div className="p-3 rounded-lg bg-slate-100 text-slate-700 text-xs border border-slate-200">
                      {selectedAppeal.reason || "—"}
                    </div>
                  </div>

                  {selectedAppeal.description && (
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">Description</label>
                      <div className="p-3 rounded-lg bg-slate-100 text-slate-700 text-xs border border-slate-200">
                        {selectedAppeal.description}
                      </div>
                    </div>
                  )}

                  {selectedAppeal.supporting_docs && selectedAppeal.supporting_docs.some((doc) => typeof doc === "string" || (doc && typeof doc === "object" && !Array.isArray(doc) && (doc as Record<string, unknown>).kind === "evidence")) && (
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">Supporting Documents</label>
                      <div className="space-y-1">
                        {selectedAppeal.supporting_docs.map((doc, i) => {
                          const document = typeof doc === "object" && doc !== null ? doc as Record<string, unknown> : null;
                          if (document && document.kind !== "evidence") return null;
                          const url = typeof doc === "string" ? doc : String(document?.file_url ?? document?.url ?? "");
                          const name = String(document?.file_name ?? document?.name ?? `Supporting document ${i + 1}`);
                          return url ? (
                            <a key={`${url}-${i}`} href={url} target="_blank" rel="noreferrer" className="block text-xs font-bold text-blue-600 hover:underline">{name}</a>
                          ) : (
                            <p key={i} className="text-xs font-medium text-slate-500">{name}</p>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500 font-medium">Submitted</p>
                      <p className="text-slate-900 font-bold">
                        {selectedAppeal.submitted_at
                          ? new Date(selectedAppeal.submitted_at).toLocaleDateString("en-PH")
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Status</p>
                      <Badge
                        className={`inline-block font-bold text-[10px] ${
                          selectedAppeal.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : selectedAppeal.status === "under_review"
                              ? "bg-blue-100 text-blue-800"
                              : selectedAppeal.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedAppeal.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Admin Action Section */}
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <h3 className="font-bold text-sm text-slate-900">Admin Response</h3>

                  {selectedAppeal.admin_response && (
                    <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                      <p className="text-xs text-slate-500 font-medium mb-1">Previous Response</p>
                      <p className="text-xs text-slate-700">{selectedAppeal.admin_response}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-2">Update Status</label>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {(["under_review", "needs_information", "approved", "rejected", "dismissed"] as const).map((status) => (
                        <Button
                          key={status}
                          disabled={appealArchiveView}
                          onClick={() => setAppealStatus(status)}
                          className={`flex-1 text-xs font-bold py-2 ${
                            appealStatus === status
                              ? status === "under_review" ? "bg-blue-600 text-white"
                                : status === "needs_information" ? "bg-violet-600 text-white"
                                  : status === "approved" ? "bg-green-600 text-white"
                                    : status === "dismissed" ? "bg-slate-700 text-white"
                                      : "bg-red-600 text-white"
                              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                          }`}
                        >
                          {status === "under_review" ? "Under Review" : status === "needs_information" ? "Request Info" : status.charAt(0).toUpperCase() + status.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">Admin Response Message</label>
                    <textarea
                      disabled={appealArchiveView}
                      value={appealResponse}
                      onChange={(e) => setAppealResponse(e.target.value)}
                      placeholder="Enter your decision and explanation..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-400 focus:border-transparent text-xs font-medium text-slate-900 placeholder-slate-400 resize-vertical min-h-[100px]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      disabled={appealArchiveView}
                      onClick={handleUpdateAppealStatus}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-xs hover:shadow-lg"
                    >
                      Save Appeal Decision
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedAppeal(null);
                        setAppealResponse("");
                        setAppealStatus("under_review");
                      }}
                      variant="outline"
                      className="border-amber-300 text-amber-600 hover:bg-amber-50 font-bold text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                  {!appealArchiveView && canArchiveAppealStatus(selectedAppeal.status) && (
                    <Button
                      variant="outline"
                      onClick={() => setCaseAction({ type: "archive-appeal", id: text(selectedAppeal.id), label: selectedAppeal.reason || text(selectedAppeal.id) })}
                      className="w-full border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs"
                    >
                      <Archive className="h-4 w-4 mr-2" />Archive
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // List view
          <div className="mx-auto max-w-[1500px] space-y-5">
            <section className="grid gap-3 md:grid-cols-3">
              {[
                { label: "Active Appeals", value: pendingAppealCount, note: "Awaiting Admin review", icon: AlertTriangle },
                { label: "Report Appeals", value: reportAppealCount, note: "Related to reports", icon: Flag },
                { label: "Violation Appeals", value: violationAppealCount, note: "Related to violations", icon: ShieldAlert },
              ].map(({ label, value, note, icon: Icon }) => (
                <motion.div key={label} whileHover={{ y: -2 }} className="flex min-h-[110px] items-center gap-4 rounded-lg border border-[#E8DED1] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><Icon className="h-5 w-5" /></span><span><span className="block text-2xl font-black text-[#302820]">{value}</span><span className="block text-xs font-bold text-[#302820]">{label}</span><span className="block text-[10px] font-semibold text-[#756A60]">{note}</span></span></motion.div>
              ))}
            </section>

            <section className="grid gap-3 rounded-lg border border-[#E8DED1] bg-white p-3 shadow-sm md:grid-cols-[minmax(220px,1fr)_190px_150px]">
              <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#756A60]" /><input value={appealSearch} onChange={(event) => setAppealSearch(event.target.value)} placeholder="Search appeals by landlord, reason, email, or ID" className="h-10 w-full rounded-lg border border-[#E8DED1] bg-[#FAF8F5] pl-10 pr-3 text-sm font-medium text-[#302820] outline-none transition placeholder:text-[#756A60] focus:border-[#D8C5B1] focus:bg-white focus:ring-2 focus:ring-[#EEE6DC]" /></label>
              <select value={appealTypeFilter} onChange={(event) => setAppealTypeFilter(event.target.value as typeof appealTypeFilter)} className="h-10 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] outline-none focus:border-[#D8C5B1]"><option value="all">Type: All Appeals</option><option value="report">Report Appeals</option><option value="violation">Violation Appeals</option><option value="general">General Appeals</option></select>
              <select value={appealSort} onChange={(event) => setAppealSort(event.target.value as typeof appealSort)} className="h-10 rounded-lg border border-[#E8DED1] bg-white px-3 text-xs font-bold text-[#302820] outline-none focus:border-[#D8C5B1]"><option value="newest">Sort by: Newest</option><option value="oldest">Sort by: Oldest</option></select>
            </section>

            <nav className="flex items-center gap-2">
              <button onClick={() => setAppealArchiveView(false)} className={`flex h-9 min-w-28 items-center justify-center gap-2 rounded-lg border px-4 text-xs font-black transition ${!appealArchiveView ? "border-[#6F4E37] bg-[#6F4E37] text-white" : "border-[#E8DED1] bg-white text-[#756A60] hover:bg-[#FAF8F5]"}`}>Active <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${!appealArchiveView ? "bg-white text-[#6F4E37]" : "bg-[#FAF8F5] text-[#756A60]"}`}>{appeals.length}</span></button>
              <button onClick={() => setAppealArchiveView(true)} className={`flex h-9 min-w-28 items-center justify-center gap-2 rounded-lg border px-4 text-xs font-black transition ${appealArchiveView ? "border-[#6F4E37] bg-[#6F4E37] text-white" : "border-[#E8DED1] bg-white text-[#756A60] hover:bg-[#FAF8F5]"}`}>Archived <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${appealArchiveView ? "bg-white text-[#6F4E37]" : "bg-[#FAF8F5] text-[#756A60]"}`}>{archivedAppeals.length}</span></button>
            </nav>

            {appealArchiveView && archivedAppeals.length === 0 ? (
              <section className="overflow-hidden rounded-lg border border-[#e7d8c9] bg-white shadow-sm"><ArchiveEmpty kind="appeals" icon={FileText} /></section>
            ) : !appealArchiveView && appeals.length === 0 ? (
              <section className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm"><span className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-orange-50 text-orange-500"><AlertTriangle className="h-10 w-10" /></span><h3 className="text-xl font-black text-slate-900">No appeals submitted.</h3><p className="mt-1 max-w-sm text-sm font-medium text-slate-500">Landlord appeals will appear here when submitted.</p></section>
            ) : visibleAppeals.length === 0 ? (
              <section className="rounded-lg border border-slate-200 bg-white shadow-sm"><OverviewEmpty icon={Search} text="No appeals match the selected filters." /></section>
            ) : (
              <section className="overflow-hidden rounded-lg border border-[#E8DED1] bg-white shadow-sm">
                <div className="hidden grid-cols-[minmax(200px,1fr)_125px_minmax(160px,0.8fr)_minmax(180px,1fr)_110px_130px_160px] gap-4 border-b border-[#E8DED1] bg-[#FFFEFC] px-5 py-4 text-[9px] font-black uppercase tracking-wide text-[#756A60] xl:grid"><span>Landlord</span><span>Appeal Type</span><span>Related Record</span><span>Reason</span><span>Status</span><span>Submitted</span><span>Actions</span></div>
                <div className="divide-y divide-[#E8DED1]">{visibleAppeals.map((appeal) => {
                  const landlord = landlordMap.get(appeal.landlord_id ?? "");
                  const context = getAppealContext(appeal);
                  const type = appeal.report_id ? "Report Appeal" : appeal.violation_id ? context.violation?.mode === "notice" ? "Notice Appeal" : "Violation Appeal" : "General Appeal";
                  const relatedRecord = appeal.report_id ? `Report: ${context.apartment?.title || String(context.source?.apartment_title ?? "Unavailable")}` : appeal.violation_id ? `${context.violation?.mode === "notice" ? "Notice" : "Violation"}: ${context.apartment?.title || "Unavailable"}` : String(context.source?.related_label ?? "Unavailable");
                  const statusClass = appeal.status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : appeal.status === "rejected" || appeal.status === "dismissed" ? "border-slate-200 bg-slate-100 text-slate-600" : "border-[#E8DED1] bg-[#FAF8F5] text-[#6F4E37]";
                  return <motion.article key={appeal.id} whileHover={{ backgroundColor: "#FFFEFC" }} onClick={() => setSelectedAppeal(appeal)} className="grid cursor-pointer gap-4 p-4 transition-colors md:p-5 xl:grid-cols-[minmax(200px,1fr)_125px_minmax(160px,0.8fr)_minmax(180px,1fr)_110px_130px_160px] xl:items-center">
                    <div className="flex min-w-0 items-center gap-3">{landlord?.avatar_url ? <img src={landlord.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-sm font-black text-[#6F4E37]">{landlord?.name?.[0]?.toUpperCase() ?? "L"}</span>}<div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wide text-[#756A60] xl:hidden">Landlord</p><h3 className="mt-1 truncate text-sm font-black text-[#302820]">{landlord?.name || "Landlord unavailable"}</h3><p className="mt-1 truncate text-[10px] font-medium text-[#756A60]">{landlord?.email || "Contact unavailable"}</p>{landlord?.mobile && <p className="mt-1 flex items-center gap-1 truncate text-[10px] font-medium text-[#756A60]"><Phone className="h-3 w-3" />{landlord.mobile}</p>}</div></div>
                    <div><p className="text-[9px] font-black uppercase tracking-wide text-[#756A60] xl:hidden">Appeal Type</p><span className="mt-2 inline-flex rounded-md border border-[#E8DED1] bg-[#FAF8F5] px-2 py-1 text-[9px] font-black text-[#6F4E37] xl:mt-0">{type}</span></div>
                    <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wide text-[#756A60] xl:hidden">Related Record</p><p className="mt-2 line-clamp-2 text-xs font-bold text-[#302820] xl:mt-0">{relatedRecord}</p>{(appeal.report_id || appeal.violation_id) && <p className="mt-1 truncate text-[9px] font-medium text-[#756A60]">{appeal.report_id ? `Report ID: ${appeal.report_id}` : `Record ID: ${appeal.violation_id}`}</p>}</div>
                    <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wide text-[#756A60] xl:hidden">Reason</p><p className="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-[#302820] xl:mt-0">{appeal.reason || appeal.description || "No appeal reason provided."}</p></div>
                    <div><p className="text-[9px] font-black uppercase tracking-wide text-[#756A60] xl:hidden">Status</p><span className={`mt-2 inline-flex rounded-md border px-2 py-1 text-[9px] font-black capitalize xl:mt-0 ${statusClass}`}>{String(appeal.status || "Pending").replace(/_/g, " ")}</span></div>
                    <div><p className="text-[9px] font-black uppercase tracking-wide text-[#756A60] xl:hidden">Submitted</p><p className="mt-2 text-[10px] font-semibold leading-relaxed text-[#302820] xl:mt-0">{formatOptionalDate(appeal.submitted_at ?? appeal.created_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                    <div className="grid gap-2" onClick={(event) => event.stopPropagation()}>
                      <Button size="sm" onClick={() => setSelectedAppeal(appeal)} className="h-8 rounded-md bg-[#6F4E37] text-[10px] font-black text-white hover:bg-[#5F4230]"><Eye className="mr-1 h-3 w-3" />Review Appeal</Button>
                      {appealArchiveView ? <><Button size="sm" variant="outline" onClick={() => setCaseAction({ type: "restore-appeal", id: text(appeal.id), label: appeal.reason || text(appeal.id) })} className="h-8 rounded-md border-emerald-200 text-[10px] font-black text-emerald-700"><RotateCcw className="mr-1 h-3 w-3" />Restore</Button><Button size="sm" variant="outline" onClick={() => setCaseAction({ type: "delete-appeal", id: text(appeal.id), label: appeal.reason || text(appeal.id) })} className="h-8 rounded-md border-rose-200 text-[10px] font-black text-rose-700"><Trash2 className="mr-1 h-3 w-3" />Delete Permanently</Button></> : canArchiveAppealStatus(appeal.status) && <Button size="sm" variant="outline" onClick={() => setCaseAction({ type: "archive-appeal", id: text(appeal.id), label: appeal.reason || text(appeal.id) })} className="h-8 rounded-md border-[#dfcdbb] text-[10px] font-black text-[#6f4525]"><Archive className="mr-1 h-3 w-3" />Archive</Button>}
                    </div>
                  </motion.article>;
                })}</div>
              </section>
            )}
          </div>
        )}
      </div>
    ))(selectedAppeal);
  };

  const renderAdminInfo = () => {
    const inputClass = "h-11 w-full rounded-lg border border-[#E8DED1] bg-white px-3 text-sm font-semibold text-[#302820] outline-none transition focus:border-[#8B735B] focus:ring-2 focus:ring-[#EEE6DC] disabled:cursor-not-allowed disabled:bg-[#FAF8F5] disabled:text-[#756A60]";
    const adminName = `${adminProfile.firstName} ${adminProfile.lastName}`.trim();
    const accountStatus = user?.status || "Unavailable";
    const ViewField = ({ label, value, wide = false }: { label: string; value?: string; wide?: boolean }) => <div className={wide ? "sm:col-span-2" : ""}><p className="text-xs font-semibold text-[#756A60]">{label}</p><p className="mt-1.5 whitespace-pre-wrap text-sm font-bold leading-6 text-[#302820]">{value?.trim() || (label === "Bio" ? "No bio provided" : "Not provided")}</p></div>;

    if (isSuperAdminPortal) return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1000px] space-y-5"><header className="border-b border-[#E8DED1] pb-5"><p className="text-xs font-black uppercase tracking-[.16em] text-[#8B735B]">Account</p><h1 className="mt-1 text-2xl font-black text-[#302820]">Super Admin Settings</h1><p className="mt-1 text-sm text-[#756A60]">Manage secure account options. Personal information is managed from Profile.</p></header><Card className="rounded-xl border-[#E8DED1] bg-white shadow-sm"><CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between"><SettingsSectionTitle icon={Lock} tone="bg-[#FAF8F5] text-[#8B735B]" title="Password Security" description="Use AptFindr’s authenticated password-change flow." /><Button onClick={() => setPasswordModal(true)} variant="outline" className="h-10 rounded-lg border-[#D8C5B1] font-bold text-[#6F4E37] hover:bg-[#FAF8F5]"><Lock className="mr-2 h-4 w-4" />Change Password</Button></CardContent></Card><Card className="rounded-xl border-[#E8DED1] bg-white shadow-sm"><CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between"><SettingsSectionTitle icon={UserIcon} tone="bg-[#FAF8F5] text-[#8B735B]" title="Profile Information" description="Name, avatar, and department are managed on your protected profile page." /><Button onClick={() => navigateToAdminModule("profile")} className="bg-[#8B735B] text-white hover:bg-[#756A60]"><UserIcon className="mr-2 h-4 w-4" />Open Profile</Button></CardContent></Card></motion.div>;

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1200px] space-y-5 pb-8">
        <header className="flex flex-col gap-4 border-b border-[#E8DED1] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#E8DED1] bg-[#FAF8F5] text-[#8B735B]"><Settings className="h-5 w-5" /></span>
            <div>
              <h2 className="text-2xl font-black text-[#302820] sm:text-3xl">Admin Settings</h2>
              <p className="mt-0.5 text-sm font-medium text-[#756A60]">Manage your admin profile, account information, and security.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void openActivityLog()} className="h-10 rounded-lg border-[#D8C5B1] bg-white font-bold text-[#6F4E37] hover:bg-[#FAF8F5]"><History className="mr-2 h-4 w-4" />View Activity Log</Button>
        </header>

        <Card className="rounded-xl border-[#E8DED1] bg-white shadow-sm">
          <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#8B735B] text-3xl font-black text-white">
              {adminProfile.avatar ? <img src={adminProfile.avatar} alt={adminName || "Admin profile"} className="h-full w-full object-cover" /> : (adminProfile.firstName[0]?.toUpperCase() || <UserIcon className="h-8 w-8" />)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-black text-[#302820]">{isLoadingAdminProfile ? "Loading profile..." : (adminName || "Profile name unavailable")}</h3>
              <p className="mt-1 truncate text-sm font-medium text-[#756A60]">{adminProfile.email || "Email unavailable"}</p>
              <p className="mt-3 text-xs font-bold text-[#6F4E37]">{adminProfile.adminLevel || "Administrator"} <span className="px-1.5 text-[#C9B8A5]">·</span> <span className="capitalize">{accountStatus}</span></p>
            </div>
            <Button onClick={() => setIsEditingAdminProfile(true)} disabled={isEditingAdminProfile || isLoadingAdminProfile} className="h-10 shrink-0 rounded-lg bg-[#8B735B] font-bold text-white hover:bg-[#756A60]"><Edit2 className="mr-2 h-4 w-4" />Edit Profile</Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-[#E8DED1] bg-white shadow-sm"><CardContent className="p-5 sm:p-6">
          <SettingsSectionTitle icon={UserIcon} tone="bg-[#FAF8F5] text-[#8B735B]" title="Personal Information" description="Your saved account and contact details." />
          {isEditingAdminProfile ? <fieldset disabled={isSavingAdminProfile} className="mt-6 grid gap-4 sm:grid-cols-2">
                  <SettingsField label="First Name"><input value={adminProfile.firstName} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, firstName: event.target.value }))} className={inputClass} /></SettingsField>
                  <SettingsField label="Last Name"><input value={adminProfile.lastName} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, lastName: event.target.value }))} className={inputClass} /></SettingsField>
                  <SettingsField label="Email Address" wide><input type="email" value={adminProfile.email} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, email: event.target.value }))} className={inputClass} /></SettingsField>
                  <SettingsField label="Mobile Number" wide><div className="relative"><Smartphone className="absolute left-3 top-3.5 h-4 w-4 text-[#8A8179]" /><input type="tel" value={adminProfile.mobile} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, mobile: event.target.value }))} placeholder="Not provided" className={`${inputClass} pl-9`} /></div></SettingsField>
                  <SettingsField label="Bio" wide><textarea rows={4} value={adminProfile.bio} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, bio: event.target.value.slice(0, 200) }))} placeholder="No bio provided" className={`${inputClass} h-auto resize-none py-3`} /><span className="block text-right text-[11px] font-semibold text-slate-400">{adminProfile.bio.length}/200</span></SettingsField>
                </fieldset> : <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2"><ViewField label="First Name" value={adminProfile.firstName} /><ViewField label="Last Name" value={adminProfile.lastName} /><ViewField label="Email Address" value={adminProfile.email} /><ViewField label="Mobile Number" value={adminProfile.mobile} /><ViewField label="Bio" value={adminProfile.bio} wide /></div>}
        </CardContent></Card>

        <Card className="rounded-xl border-[#E8DED1] bg-white shadow-sm"><CardContent className="p-5 sm:p-6">
          <SettingsSectionTitle icon={Shield} tone="bg-[#FAF8F5] text-[#8B735B]" title="Administrative Information" description="Your administrative role and access information." />
          {isEditingAdminProfile ? <fieldset disabled={isSavingAdminProfile} className="mt-6 grid gap-4 sm:grid-cols-2">
                  <SettingsField label="Department"><input value={adminProfile.department} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, department: event.target.value }))} placeholder="Not provided" className={inputClass} /></SettingsField>
                  <SettingsField label="Admin Level"><select value={adminProfile.adminLevel} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, adminLevel: event.target.value }))} className={inputClass}><option value="">Not provided</option>{adminProfile.adminLevel && !["Full Administrator", "Senior Moderator", "Moderator"].includes(adminProfile.adminLevel) && <option value={adminProfile.adminLevel}>{adminProfile.adminLevel}</option>}<option value="Full Administrator">Full Administrator</option><option value="Senior Moderator">Senior Moderator</option><option value="Moderator">Moderator</option></select></SettingsField>
                </fieldset> : <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2"><ViewField label="Department" value={adminProfile.department} /><ViewField label="Admin Level" value={adminProfile.adminLevel} /></div>}
        </CardContent></Card>

        {isEditingAdminProfile && <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="outline" onClick={handleResetAdminProfile} disabled={isSavingAdminProfile} className="h-10 rounded-lg border-[#D8C5B1] font-bold text-[#6F4E37] hover:bg-[#FAF8F5]"><RotateCcw className="mr-2 h-4 w-4" />Reset Changes</Button><Button onClick={() => void handleUpdateAdminProfile()} disabled={isSavingAdminProfile} className="h-10 rounded-lg bg-[#8B735B] px-6 font-bold text-white hover:bg-[#756A60]"><Save className="mr-2 h-4 w-4" />{isSavingAdminProfile ? "Saving..." : "Save Changes"}</Button></div>}

        <Card className="rounded-xl border-[#E8DED1] bg-white shadow-sm"><CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><SettingsSectionTitle icon={Lock} tone="bg-[#FAF8F5] text-[#8B735B]" title="Security" description="Manage the security of your administrator account." /><div className="sm:text-right"><p className="mb-3 max-w-md text-sm text-[#756A60]">Protect your administrator account with an updated password.</p><Button onClick={() => setPasswordModal(true)} variant="outline" className="h-10 rounded-lg border-[#D8C5B1] font-bold text-[#6F4E37] hover:bg-[#FAF8F5]"><Lock className="mr-2 h-4 w-4" />Change Password</Button></div></CardContent></Card>
      </motion.div>
    );
  };

  const renderHistory = () => {
    const landlordMap = new Map(landlords.filter((landlord) => landlord.id).map((landlord) => [landlord.id as string, landlord]));
    const apartmentMap = new Map(allApartments.filter((apartment) => apartment.id).map((apartment) => [apartment.id as string, apartment]));
    const historyItems = [
      ...archivedReports.map((report) => {
        const apartmentId = text(report.apartment_id ?? report.apartmentId);
        const tenantId = text(report.reporter_id ?? report.user_id);
        const landlordId = text(report.landlord_id);
        return {
          kind: "report" as const,
          id: text(report.id),
          label: report.issueType ?? report.issue_type ?? report.category ?? "Report",
          apartment: report.apartment_title ?? report.apartment ?? apartmentMap.get(apartmentId)?.title ?? "Apartment unavailable",
          landlord: landlordMap.get(landlordId)?.name ?? landlordId,
          tenant: report.reporter_name ?? report.reporter ?? tenantId,
          status: report.status ?? "resolved",
          decision: report.status ?? "Processed",
          notes: report.details ?? "No resolution notes recorded.",
          createdAt: report.submitted_at ?? report.submittedAt ?? report.created_at,
          resolvedAt: report.resolved_at ?? report.reviewed_at,
          archivedAt: report.archived_at,
          archivedBy: report.archived_by === user?.id ? user?.name ?? "Admin" : "Admin",
        };
      }),
      ...archivedAppeals.map((appeal) => {
        const report = reports.find((item) => item.id === appeal.report_id) ?? archivedReports.find((item) => item.id === appeal.report_id);
        const apartmentId = text(report?.apartment_id ?? report?.apartmentId);
        const landlordId = text(appeal.landlord_id);
        return {
          kind: "appeal" as const,
          id: text(appeal.id),
          label: appeal.report_id ? "Report Appeal" : appeal.violation_id ? "Violation Appeal" : "General Appeal",
          apartment: report?.apartment_title ?? report?.apartment ?? apartmentMap.get(apartmentId)?.title ?? "Apartment unavailable",
          landlord: landlordMap.get(landlordId)?.name ?? landlordId,
          tenant: text(report?.reporter_name ?? report?.reporter ?? report?.reporter_id ?? report?.user_id, "—"),
          status: appeal.status ?? "reviewed",
          decision: appeal.admin_response ?? appeal.status ?? "Reviewed",
          notes: appeal.description ?? appeal.reason ?? "No appeal notes recorded.",
          createdAt: appeal.submitted_at ?? appeal.created_at,
          resolvedAt: appeal.reviewed_at,
          archivedAt: appeal.archived_at,
          archivedBy: appeal.archived_by === user?.id ? user?.name ?? "Admin" : "Admin",
        };
      }),
      ...adminNotifs.filter((notification) => notification.is_deleted === true).map((notification) => {
        const payload = notification.payload ?? {};
        return {
          kind: "notification" as const,
          id: text(notification.id),
          label: safeNotificationText(notification.title, "Notification"),
          apartment: text(String(payload.property_name ?? payload.apartment_title ?? payload.topic ?? notification.action_target_type ?? "Notification")),
          landlord: text(String(payload.landlord_name ?? "—")),
          tenant: text(String(payload.reporter_name ?? payload.tenant_name ?? "—")),
          status: isNotificationRead(notification) ? "read" : "unread",
          decision: formatNotificationType(notification.type),
          notes: safeNotificationText(notification.message, "No notification message recorded."),
          createdAt: notification.createdAt ?? notification.created_at,
          resolvedAt: notification.read_at,
          archivedAt: notification.deleted_at,
          archivedBy: user?.name ?? "Admin",
        };
      }),
    ];
    const statusOptions = Array.from(new Set(historyItems.map((item) => item.status).filter(Boolean))).sort();
    const query = historySearch.trim().toLowerCase();
    const visibleHistory = historyItems
      .filter((item) => historyKindFilter === "all" || (historyKindFilter === "reports" ? item.kind === "report" : historyKindFilter === "appeals" ? item.kind === "appeal" : item.kind === "notification"))
      .filter((item) => historyStatusFilter === "all" || item.status === historyStatusFilter)
      .filter((item) => !query || [item.id, item.label, item.apartment, item.landlord, item.tenant, item.status, item.decision, item.notes].some((value) => String(value ?? "").toLowerCase().includes(query)))
      .sort((left, right) => new Date(right.archivedAt ?? 0).getTime() - new Date(left.archivedAt ?? 0).getTime());

    return (
      <motion.div initial={false} animate="show" className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-950 text-white shadow-lg"><History className="h-5 w-5" /></span>
            <div><h1 className="text-2xl font-black text-slate-950 md:text-3xl">History</h1><p className="text-sm font-medium text-slate-500">Archived reports, appeals, and notifications remain available for audit and restoration.</p></div>
          </div>
          <Button variant="outline" onClick={() => { void fetchArchivedReports().then(setArchivedReports); void fetchArchivedAppeals().then(setArchivedAppeals); void loadAdminNotifications(); }} className="h-10 rounded-lg border-slate-200 font-bold text-slate-700"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          {[{ label: "Archived Reports", value: archivedReports.length, icon: Flag, tone: "bg-blue-50 text-blue-600" }, { label: "Archived Appeals", value: archivedAppeals.length, icon: AlertTriangle, tone: "bg-orange-50 text-orange-600" }, { label: "Archived Notifications", value: adminNotifs.filter((notification) => notification.is_deleted === true).length, icon: Bell, tone: "bg-violet-50 text-violet-600" }, { label: "Total History", value: historyItems.length, icon: Archive, tone: "bg-slate-100 text-slate-700" }].map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className="rounded-lg border-slate-200 bg-white shadow-sm"><CardContent className="flex items-center gap-4 p-5"><span className={`flex h-12 w-12 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span><span><strong className="block text-2xl text-slate-950">{value}</strong><span className="text-xs font-bold text-slate-600">{label}</span></span></CardContent></Card>
          ))}
        </section>

        <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[minmax(240px,1fr)_160px_170px]">
          <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search history by apartment, landlord, tenant, status, or ID" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100" /></label>
          <select value={historyKindFilter} onChange={(event) => setHistoryKindFilter(event.target.value as typeof historyKindFilter)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none"><option value="all">Type: All</option><option value="reports">Reports</option><option value="appeals">Appeals</option><option value="notifications">Notifications</option></select>
          <select value={historyStatusFilter} onChange={(event) => setHistoryStatusFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none"><option value="all">Status: All</option>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {visibleHistory.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center p-6 text-center"><Archive className="mb-4 h-10 w-10 text-slate-300" /><h3 className="text-lg font-black text-slate-900">No archived items found.</h3><p className="mt-1 max-w-md text-sm font-medium text-slate-500">Processed reports, appeals, and deleted notifications moved from active queues will appear here.</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleHistory.map((item) => (
                <article key={`${item.kind}-${item.id}`} className="grid gap-4 p-4 md:p-5 xl:grid-cols-[120px_minmax(220px,1fr)_minmax(180px,0.8fr)_190px] xl:items-center">
                  <div><Badge className={item.kind === "report" ? "bg-blue-100 text-blue-700" : item.kind === "appeal" ? "bg-orange-100 text-orange-700" : "bg-violet-100 text-violet-700"}>{item.kind === "report" ? "Report" : item.kind === "appeal" ? "Appeal" : "Notification"}</Badge><p className="mt-2 break-all text-[10px] font-bold text-slate-400">{item.id}</p></div>
                  <div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-900">{String(item.apartment ?? "Apartment unavailable")}</h3><p className="mt-1 text-xs font-bold text-slate-600">{String(item.label ?? "Archived item")}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{String(item.notes ?? "No notes recorded.")}</p></div>
                  <div className="grid gap-1 text-xs"><span><strong>Landlord:</strong> {String(item.landlord || "—")}</span><span><strong>Tenant:</strong> {String(item.tenant || "—")}</span><span><strong>Status:</strong> <span className="capitalize">{String(item.status ?? "")}</span></span><span><strong>Archived:</strong> {formatOptionalDate(item.archivedAt, { month: "short", day: "numeric", year: "numeric" })}</span></div>
                  <div className="grid gap-2">
                    {item.kind === "notification" ? (
                      <>
                        <Button size="sm" variant="outline" disabled={deletingNotifId === item.id} onClick={() => void unarchiveNotif(item.id)} className="h-8 rounded-md border-emerald-200 text-[10px] font-black text-emerald-700 hover:bg-emerald-50"><RotateCcw className="mr-1 h-3 w-3" />Restore</Button>
                        <Button size="sm" variant="outline" disabled={deletingNotifId === item.id} onClick={() => void deleteNotif(item.id)} className="h-8 rounded-md border-rose-200 text-[10px] font-black text-rose-700 hover:bg-rose-50"><Trash2 className="mr-1 h-3 w-3" />Permanent Delete</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setCaseAction({ type: item.kind === "report" ? "restore-report" : "restore-appeal", id: item.id, label: item.apartment })} className="h-8 rounded-md border-emerald-200 text-[10px] font-black text-emerald-700 hover:bg-emerald-50"><RotateCcw className="mr-1 h-3 w-3" />Restore</Button>
                        <Button size="sm" variant="outline" onClick={() => setCaseAction({ type: item.kind === "report" ? "delete-report" : "delete-appeal", id: item.id, label: item.apartment })} className="h-8 rounded-md border-rose-200 text-[10px] font-black text-rose-700 hover:bg-rose-50"><Trash2 className="mr-1 h-3 w-3" />Permanent Delete</Button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </motion.div>
    );
  };

  const renderLandlordDetails = () => {
    if (!selectedLandlord || !selectedLandlordDetails) return renderLandlords();

    const verified = selectedLandlord.isVerified || selectedLandlord.is_verified;
    const closeDetails = () => setSelectedLandlord(null);

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5">
        <button type="button" onClick={closeDetails} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#302820] transition hover:text-[#8B735B]">
          <ChevronRight className="h-4 w-4 rotate-180" />Back to Landlords
        </button>

        <header className="flex items-center justify-between gap-4 border-b border-[#E8DED1] pb-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#8B735B] text-xl font-black text-white">
              {selectedLandlord.name?.[0]?.toUpperCase() ?? "L"}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-black text-slate-950 md:text-3xl">{selectedLandlord.name}</h1>
                <Badge className="border border-[#E8DED1] bg-[#FAF8F5] text-xs font-bold text-[#6F4E37]">
                  {verified ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <Clock className="mr-1 h-3.5 w-3.5" />}
                  {verified ? "Verified" : "Pending Review"}
                </Badge>
              </div>
              <p className="mt-1 truncate text-sm font-medium text-slate-600">{selectedLandlord.email}</p>
            </div>
          </div>
          <button type="button" onClick={closeDetails} aria-label="Close landlord details" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E8DED1] bg-white text-[#756A60] transition hover:bg-[#FAF8F5] hover:text-[#302820]">
            <X className="h-4 w-4" />
          </button>
        </header>

        {isLoadingLandlordDetails && <div className="flex items-center gap-2 rounded-xl border border-[#E8DED1] bg-[#FAF8F5] px-4 py-3 text-xs font-bold text-[#756A60]"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading landlord details…</div>}

        <section className="border-b border-[#E8DED1] pb-5">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#8B735B]"><UserIcon className="h-4 w-4" />Account Information</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#E8DED1] bg-white p-4"><p className="text-xs font-semibold text-slate-500">Phone</p><p className="mt-2 flex items-center gap-1.5 text-base font-bold text-slate-900"><Phone className="h-4 w-4 text-[#8B735B]" />{selectedLandlord.mobile || "Not provided"}</p></div>
            <div className="rounded-xl border border-[#E8DED1] bg-white p-4"><p className="text-xs font-semibold text-slate-500">Account Status</p><p className="mt-2 text-base font-bold text-slate-900">Active</p></div>
            <div className="rounded-xl border border-[#E8DED1] bg-white p-4"><p className="text-xs font-semibold text-slate-500">Registered</p><p className="mt-2 flex items-center gap-1.5 text-base font-bold text-slate-900"><Calendar className="h-4 w-4 text-[#8B735B]" />{formatOptionalDate(selectedLandlord.created_at as string | undefined, { month: "short", day: "numeric", year: "numeric" })}</p></div>
          </div>
        </section>

        <section className="border-b border-[#E8DED1] pb-5">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#8B735B]"><Shield className="h-4 w-4" />Verification Details</h2>
          <div className="grid gap-5 rounded-xl border border-[#E8DED1] bg-white p-5 sm:grid-cols-2">
            <div><p className="text-xs font-semibold text-slate-500">Verification Status</p><Badge className="mt-3 border border-[#E8DED1] bg-[#FAF8F5] text-xs font-bold text-[#6F4E37]">{verified ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <Clock className="mr-1 h-3.5 w-3.5" />}{verified ? "Verified" : "Pending Review"}</Badge></div>
            <div className="border-[#E8DED1] sm:border-l sm:pl-5"><p className="text-xs font-semibold text-slate-500">Submitted Credential</p><p className="mt-2 text-base font-black text-slate-900">Business Permit</p><p className="mt-1 text-sm font-medium text-slate-600">Permit #{selectedLandlordDetails.profile?.business_permit_number || selectedLandlordDetails.profile?.permit_number || selectedLandlord.permit_number || selectedLandlord.permitNumber || "Not provided"}</p>{selectedLandlordDetails.profile?.verification_document_url ? <a href={selectedLandlordDetails.profile.verification_document_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-9 items-center rounded-lg border border-[#D8C5B1] bg-white px-3 text-xs font-bold text-[#6F4E37] transition hover:bg-[#FAF8F5]"><FileText className="mr-1.5 h-3.5 w-3.5" />View Document</a> : <Button type="button" variant="outline" size="sm" disabled title="No uploaded verification document is available" className="mt-3 h-9 rounded-lg border-[#D8C5B1] bg-white text-xs font-bold text-[#756A60]"><FileText className="mr-1.5 h-3.5 w-3.5" />View Document</Button>}</div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#8B735B]"><ClipboardList className="h-4 w-4" />Administrative Record</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#E8DED1] bg-white p-4"><p className="text-xs font-semibold text-slate-500">Violations</p><p className="mt-2 text-xl font-black text-slate-900">{selectedLandlordDetails.violations.filter((item) => item.mode === "violation").length}</p></div>
            <div className="rounded-xl border border-[#E8DED1] bg-white p-4"><p className="text-xs font-semibold text-slate-500">Notices</p><p className="mt-2 text-xl font-black text-slate-900">{selectedLandlordDetails.violations.filter((item) => item.mode === "notice").length}</p></div>
          </div>
        </section>

        <section className="grid gap-2 border-t border-[#E8DED1] pt-5 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {verified ? <Button variant="outline" onClick={(e) => { e.stopPropagation(); setVerifyAction({ landlordId: text(selectedLandlord.id), verify: false }); setSelectedLandlord(null); }} className="h-11 rounded-xl border-[#E8DED1] font-bold text-[#302820] hover:bg-white"><XCircle className="mr-2 h-4 w-4" />Revoke Verification</Button> : <Button onClick={(e) => { e.stopPropagation(); setVerifyAction({ landlordId: text(selectedLandlord.id), verify: true }); setSelectedLandlord(null); }} className="h-11 rounded-xl bg-[#8B735B] font-bold text-white hover:bg-[#765F4A]"><CheckCircle2 className="mr-2 h-4 w-4" />Verify Landlord</Button>}
          <Button variant="outline" onClick={(e) => { e.stopPropagation(); openViolationModal("violation", text(selectedLandlord.id), text(selectedLandlord.name, "Landlord"), "General"); }} className="h-11 rounded-xl border-[#E8DED1] font-bold text-[#302820] hover:bg-white"><AlertOctagon className="mr-2 h-4 w-4" />Issue Violation</Button>
          <Button variant="outline" onClick={(e) => { e.stopPropagation(); openViolationModal("notice", text(selectedLandlord.id), text(selectedLandlord.name, "Landlord"), "General"); }} className="h-11 rounded-xl border-[#E8DED1] font-bold text-[#302820] hover:bg-white"><BellRing className="mr-2 h-4 w-4" />Send Notice</Button>
        </section>
      </motion.div>
    );
  };

  const renderAdministrativeAction = () => {
    if (!violationModal?.open) return renderLandlords();
    const isViolation = violationModal.mode === "violation";
    const subject = selectedLandlord ?? landlords.find((landlord) => text(landlord.id) === violationModal.landlordId) ?? null;
    const closeAction = () => setViolationModal(null);

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5">
        <button type="button" onClick={closeAction} disabled={isIssuingViolation} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#302820] transition hover:text-[#8B735B] disabled:opacity-50"><ChevronRight className="h-4 w-4 rotate-180" />Back to Landlord Details</button>

        <header className="flex min-w-0 items-center gap-4 border-b border-[#E8DED1] pb-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#8B735B] text-xl font-black text-white">{subject?.name?.[0]?.toUpperCase() ?? violationModal.landlordName?.[0]?.toUpperCase() ?? "L"}</div>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-2xl font-black text-slate-950 md:text-3xl">{subject?.name || violationModal.landlordName || "Landlord"}</h1>{subject && <Badge className="border border-[#E8DED1] bg-[#FAF8F5] text-xs font-bold text-[#6F4E37]">{subject.isVerified || subject.is_verified ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <Clock className="mr-1 h-3.5 w-3.5" />}{subject.isVerified || subject.is_verified ? "Verified" : "Pending Review"}</Badge>}</div><p className="mt-1 truncate text-sm font-medium text-slate-600">{subject?.email || "Email unavailable"}</p></div>
        </header>

        <section className="rounded-xl border border-[#E8DED1] bg-white p-4 sm:p-5">
          <div className="mb-5 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FAF8F5] text-[#8B735B]">{isViolation ? <ShieldAlert className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}</span><div><h2 className="text-xl font-black text-slate-950">{isViolation ? "Issue Violation" : "Send Notice"}</h2><p className="mt-0.5 text-sm font-medium text-slate-500">{isViolation ? "Issue an administrative violation for this landlord." : "Send a formal administrative notice to this landlord."}</p></div></div>

          <div className="grid gap-4 border-y border-[#E8DED1] py-4 sm:grid-cols-2">
            <div><p className="text-xs font-semibold text-slate-500">Landlord</p><p className="mt-2 text-base font-black text-slate-900">{subject?.name || violationModal.landlordName || "Landlord unavailable"}</p><p className="mt-1 text-sm text-slate-500">{subject?.email || "Email unavailable"}</p></div>
            <div className="border-[#E8DED1] sm:border-l sm:pl-5"><p className="text-xs font-semibold text-slate-500">Linked Apartment</p><p className="mt-2 text-base font-black text-slate-900">{violationModal.apartmentId ? violationModal.apartmentTitle : "None"}</p>{!violationModal.apartmentId && <p className="mt-1 text-sm text-slate-500">No apartment linked to this record.</p>}</div>
          </div>

          <div className="mt-5 space-y-5">
            <div className="space-y-2"><label htmlFor="violation-type" className="text-xs font-black uppercase tracking-wide text-[#6F4E37]">{isViolation ? "Violation Type" : "Notice Type"}</label><div className="relative"><select id="violation-type" value={isViolation ? vType : nType} onChange={(e) => isViolation ? setVType(e.target.value) : setNType(e.target.value)} disabled={isIssuingViolation} className="h-11 w-full appearance-none rounded-lg border border-[#E8DED1] bg-white px-4 pr-10 text-sm font-bold text-slate-900 outline-none transition focus:border-[#8B735B] focus:ring-2 focus:ring-[#EEE6DC] disabled:opacity-60">{(isViolation ? VIOLATION_TYPES : NOTICE_TYPES).map((type) => <option key={type} value={type}>{type}</option>)}</select><ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-500" /></div><p className="text-xs font-medium text-slate-500">Select the type of {isViolation ? "violation you are issuing" : "notice you are sending"} to this landlord.</p></div>

            <div className="space-y-2"><div className="flex items-center justify-between"><label htmlFor="violation-description" className="text-xs font-black uppercase tracking-wide text-[#6F4E37]">{isViolation ? "Violation Details" : "Notice Details"} <span className="font-semibold text-slate-400">(optional)</span></label><span className="text-xs font-semibold tabular-nums text-slate-400">{(isViolation ? vMessage : nMessage).length}/500</span></div><textarea id="violation-description" rows={5} maxLength={500} value={isViolation ? vMessage : nMessage} onChange={(e) => isViolation ? setVMessage(e.target.value) : setNMessage(e.target.value)} disabled={isIssuingViolation} placeholder={isViolation ? "Provide additional details about this violation..." : "Provide additional context or instructions for the landlord..."} className="w-full resize-none rounded-lg border border-[#E8DED1] bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#8B735B] focus:ring-2 focus:ring-[#EEE6DC] disabled:opacity-60"/><p className="text-xs font-medium text-slate-500">Additional context helps ensure accurate review and follow-up.</p></div>

            {isViolation && <div className="space-y-2"><label htmlFor="violation-expiration" className="text-xs font-black uppercase tracking-wide text-[#6F4E37]">Days Until Expiration</label><input id="violation-expiration" type="number" min="1" max="365" value={vExpirationDays} step="1" onChange={(e) => setVExpirationDays(Number(e.target.value))} disabled={isIssuingViolation} placeholder="Days" className="h-11 w-full rounded-lg border border-[#E8DED1] bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-[#8B735B] focus:ring-2 focus:ring-[#EEE6DC] disabled:opacity-60"/><p className="text-xs font-medium text-slate-500">Number of days before this violation expires.<br />Enter a whole number from 1 to 365.</p></div>}

            <div className="flex gap-3 rounded-lg border border-[#E8DED1] bg-[#FAF8F5] p-4"><AlertTriangle className="h-5 w-5 shrink-0 text-[#8B735B]" /><p className="text-sm font-semibold leading-5 text-[#756A60]">{isViolation ? "This action will be recorded in the landlord's administrative record." : "This notice will be sent to the landlord as a formal warning on record."}</p></div>
          </div>

          <div className="mt-5 grid gap-3 border-t border-[#E8DED1] pt-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]"><Button onClick={() => void issueViolation()} disabled={isIssuingViolation} className="h-11 rounded-lg bg-[#8B735B] font-black text-white hover:bg-[#765F4A] disabled:cursor-not-allowed disabled:opacity-60">{isIssuingViolation ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Saving...</> : isViolation ? <><ShieldAlert className="mr-2 h-4 w-4" />Issue Violation</> : <><BellRing className="mr-2 h-4 w-4" />Send Notice</>}</Button><Button type="button" variant="outline" onClick={closeAction} disabled={isIssuingViolation} className="h-11 rounded-lg border-[#E8DED1] bg-white font-black text-slate-700 hover:bg-[#FAF8F5] disabled:opacity-60">Cancel</Button></div>
        </section>
      </motion.div>
    );
  };

  const sectionMap: Record<string, () => ReactElement> = {
    overview:      renderOverview,
    notifications: renderNotifications,
    landlords:     renderLandlords,
    apartments:    renderApartments,
    reports:       renderReports,
    appeals:       renderAppeals,
    history:       renderHistory,
    admininfo:     renderAdminInfo,
    ...(isSuperAdminPortal ? {
      "admin-management": () => <AdminManagement />,
      "user-management": () => <UserManagement />,
      "help-center": () => <HelpCenter />,
      "audit-logs": () => <AuditLogs />,
      "system-control": () => <SystemControl />,
      "profile": () => <SuperAdminProfile />,
    } : {}),
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="admin-portal-shell app-shell fixed inset-0 z-50 overflow-hidden bg-slate-50">
      <div className="app-shell-frame relative z-10 flex h-full">
        <aside className="app-shell-sidebar hidden h-full w-60 shrink-0 flex-col bg-[#FFFEFC] lg:flex">
          {PortalSidebarContent()}
        </aside>
        {sidebarOpen && <div className="app-sidebar-overlay fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={`app-sidebar-drawer fixed left-0 top-0 z-50 h-full w-64 bg-[#FFFEFC] shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="app-sidebar-close absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8DED1] bg-white text-[#756A60] transition-colors hover:bg-[#FAF8F5] hover:text-[#302820]">
            <X className="h-4 w-4" />
          </button>
          {PortalSidebarContent()}
        </aside>
        <button aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="app-sidebar-trigger fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B735B] text-white shadow-md transition-colors hover:bg-[#6F4E37] lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="app-shell-main flex-1 min-w-0 h-full overflow-y-auto">
          <main className="app-shell-content app-shell-content-mobile-nav px-4 py-5 pt-16 md:px-6 lg:px-8 lg:pt-6">
            {violationModal?.open && violationModal.sourceModule === activeSection
              ? renderAdministrativeAction()
              : activeSection === "landlords" && selectedLandlord && selectedLandlordDetails
                ? renderLandlordDetails()
                : (sectionMap[activeSection] ?? renderOverview)()}
          </main>
        </div>
      </div>

      {/* Verify dialog */}
      <AlertDialog open={!!verifyAction} onOpenChange={() => setVerifyAction(null)}>
        <AlertDialogContent className="rounded-2xl border-amber-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">{verifyAction?.verify ? "Verify Landlord" : "Revoke Verification"}</AlertDialogTitle>
            <AlertDialogDescription>
              {verifyAction?.verify
                ? "This landlord will be able to add and edit apartments on the platform."
                : "This landlord will no longer be able to add or edit apartments."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVerification}
              className={`rounded-xl font-bold ${verifyAction?.verify ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
              {verifyAction?.verify ? "Verify" : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Support request details */}
      <AlertDialog open={selectedSupportRequest !== null} onOpenChange={(open) => { if (!open) setSelectedSupportRequest(null); }}>
        <AlertDialogContent className="max-w-2xl rounded-2xl border-rose-100 p-0 overflow-hidden">
          <AlertDialogHeader className="border-b border-slate-100 bg-rose-50/60 px-6 py-5 text-left">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600"><Flag className="h-5 w-5" /></span>
              <div className="min-w-0">
                <AlertDialogTitle className="font-black text-slate-950">Support Request Details</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">Review the complete request submitted to platform support.</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          {selectedSupportRequest && (
            <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Submitted by</p><p className="mt-1 text-sm font-bold text-slate-800">{selectedSupportRequest.submitter?.name || "User unavailable"}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">User role</p><p className="mt-1 text-sm font-bold capitalize text-slate-800">{selectedSupportRequest.submitter?.role || "Unavailable"}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Contact email</p><p className="mt-1 break-all text-sm font-bold text-slate-800">{selectedSupportRequest.ticket.contact || selectedSupportRequest.submitter?.email || "Not provided"}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Date submitted</p><p className="mt-1 text-sm font-bold text-slate-800">{formatOptionalDate(selectedSupportRequest.ticket.created_at, { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Topic</p><p className="mt-1 text-sm font-bold text-slate-800">{selectedSupportRequest.ticket.topic || "Not provided"}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Status</p><p className="mt-1 text-sm font-bold capitalize text-slate-800">{(selectedSupportRequest.ticket.status || "Unavailable").replace(/_/g, " ")}</p></div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Full message</p>
                <p className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium leading-6 text-slate-700">{selectedSupportRequest.ticket.message || "No message provided."}</p>
              </div>
            </div>
          )}
          <AlertDialogFooter className="border-t border-slate-100 px-6 py-4">
            <AlertDialogCancel className="rounded-lg font-bold">Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {activityLogOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setActivityLogOpen(false)}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <div className="relative z-10 flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-orange-600"><History className="h-5 w-5" /></span><div><h3 className="font-black text-slate-950">Admin Activity Log</h3><p className="text-xs font-medium text-slate-500">Recorded actions for this administrator.</p></div></div>
              <button type="button" title="Close activity log" onClick={() => setActivityLogOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-64 flex-1 overflow-y-auto p-5">
              {isLoadingActivity ? (
                <div className="flex min-h-56 items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-orange-500" /></div>
              ) : activityLogs.length === 0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><History className="mb-3 h-8 w-8 text-slate-300" /><h4 className="font-black text-slate-800">No activity recorded yet.</h4><p className="mt-1 text-sm font-medium text-slate-500">Administrative actions will appear here after they are saved.</p></div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activityLogs.map((log) => {
                    const displayLog = formatAuditLogForDisplay(log);
                    return <div key={log.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-orange-50 text-orange-600"><CheckCircle2 className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800">{displayLog.title}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{displayLog.detail}</p>
                        {displayLog.changes.length > 1 && <div className="mt-2 space-y-1 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">{displayLog.changes.slice(1).map((change) => <p key={change.key}>{change.summary}</p>)}</div>}
                      </div>
                      <time className="shrink-0 text-right text-[11px] font-semibold text-slate-400">{log.created_at ? new Date(log.created_at).toLocaleString("en-PH") : "Time unavailable"}</time>
                    </div>;
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3"><Button variant="outline" onClick={() => void openActivityLog()} disabled={isLoadingActivity} className="h-9 rounded-md font-bold"><RefreshCw className={`mr-2 h-4 w-4 ${isLoadingActivity ? "animate-spin" : ""}`} />Refresh</Button></div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setPasswordModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-red-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-red-100 bg-red-50/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-slate-900">Change Password</p>
                  <p className="text-xs text-slate-400 font-medium">Update your admin account password</p>
                </div>
              </div>
              <button onClick={() => setPasswordModal(false)} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full rounded-xl border-2 border-red-100 bg-red-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (minimum 6 characters)"
                  className="w-full rounded-xl border-2 border-red-100 bg-red-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-xl border-2 border-red-100 bg-red-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div className="flex gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <p className="text-xs font-medium text-red-700">
                  Use a strong password with a mix of letters, numbers, and special characters for better security.
                </p>
              </div>
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-red-100 flex gap-3">
              <Button onClick={handleChangePassword}
                className="flex-1 font-bold rounded-xl shadow-md text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">
                <Lock className="h-4 w-4 mr-2" />Change Password
              </Button>
              <Button variant="outline" onClick={() => setPasswordModal(false)} className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Violation Modal */}
      {editViolationModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setEditViolationModal(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-amber-100 bg-amber-50/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow">
                  <Edit2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-slate-900">Edit {editViolationModal.mode === "violation" ? "Violation" : "Notice"}</p>
                  <p className="text-xs text-slate-400 font-medium">{editViolationModal.landlordName}</p>
                </div>
              </div>
              <button onClick={() => setEditViolationModal(null)} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message</label>
                  <span className="text-[10px] text-slate-400">
                    {editVMessage.length}/300
                  </span>
                </div>
                <textarea
                  rows={4} maxLength={300}
                  value={editVMessage}
                  onChange={(e) => setEditVMessage(e.target.value)}
                  placeholder="Edit the violation message…"
                  className="w-full rounded-xl border-2 border-amber-100 bg-amber-50/30 px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Expiration Days (for violations only)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={editVExpirationDays}
                  onChange={(e) => setEditVExpirationDays(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="Days"
                  className="w-full rounded-xl border-2 border-amber-100 bg-amber-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <p className="text-[10px] text-slate-500">
                  This violation will expire in {editVExpirationDays} days ({new Date(Date.now() + editVExpirationDays * 24 * 60 * 60 * 1000).toLocaleDateString()})
                </p>
              </div>
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-amber-100 flex gap-3">
              <Button onClick={saveViolationEdit}
                className="flex-1 font-bold rounded-xl shadow-md text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                <CheckCheck className="h-4 w-4 mr-2" />Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditViolationModal(null)} className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={Boolean(notificationToDelete)} onOpenChange={(open) => !open && !deletingNotifId && setNotificationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this notification permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
              {notificationToDelete?.title ? <span className="mt-2 block font-semibold text-stone-700">{safeNotificationText(notificationToDelete.title, "Notification")}</span> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingNotifId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(deletingNotifId)}
              onClick={(event) => {
                event.preventDefault();
                if (notificationToDelete?.id) void deleteNotif(notificationToDelete.id);
              }}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {deletingNotifId ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(caseAction)} onOpenChange={(open) => !open && !processingCaseAction && setCaseAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {caseAction?.type.startsWith("archive") ? "Remove from active list?" : caseAction?.type.startsWith("restore") ? "Restore this item?" : "Permanently delete this item?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {caseAction?.type.startsWith("archive")
                ? "This item will move to the Archived view in its current module and can be restored later."
                : caseAction?.type.startsWith("restore")
                  ? "This item will return to the active admin list with its existing resolution status preserved."
                  : "This permanently removes the archived database record after confirmation. Related notifications, notices, and violations are not removed by this action."}
              {caseAction?.label ? <span className="mt-2 block font-semibold text-slate-700">{caseAction.label}</span> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingCaseAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={processingCaseAction}
              onClick={(event) => {
                event.preventDefault();
                void executeCaseAction();
              }}
              className={caseAction?.type.startsWith("delete") ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-orange-600 text-white hover:bg-orange-700"}
            >
              {processingCaseAction ? "Working..." : caseAction?.type.startsWith("archive") ? "Archive" : caseAction?.type.startsWith("restore") ? "Restore" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
