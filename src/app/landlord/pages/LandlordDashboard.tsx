import { AppealModal } from "@/app/landlord/components/dashboard/modals/AppealModal";
import { NotificationDetailModal } from "@/app/landlord/components/dashboard/modals/NotificationDetailModal";
import { PeopleModal } from "@/app/landlord/components/dashboard/modals/PeopleModal";
import { ActivitySection } from "@/app/landlord/components/dashboard/sections/ActivitySection";
import { HelpSection } from "@/app/landlord/components/dashboard/sections/HelpSection";
import { NotificationsSection } from "@/app/landlord/components/dashboard/sections/NotificationsSection";
import { OverviewSection } from "@/app/landlord/components/dashboard/sections/OverviewSection";
import { PropertiesSection } from "@/app/landlord/components/dashboard/sections/PropertiesSection";
import { SettingsSection } from "@/app/landlord/components/dashboard/sections/SettingsSection";
import { LandlordSidebar } from "@/app/landlord/components/navigation/LandlordSidebar";
import { AlertsTab } from "@/app/landlord/components/settings/AlertsTab";
import { BusinessTab } from "@/app/landlord/components/settings/BusinessTab";
import { ProfileTab } from "@/app/landlord/components/settings/ProfileTab";
import { SecurityTab } from "@/app/landlord/components/settings/SecurityTab";
import type { LandlordProfile, LandlordAlerts, LandlordBusiness, LandlordSecurity } from "@/app/landlord/types/settings";
import { getRoomStatus, getApartmentStatus } from "@/app/landlord/utils/landlordStatus";
import { EditApartmentDialog } from "@/app/shared/components/common/EditApartmentDialog";
import { type EvidenceFile } from "@/app/shared/components/common/EvidenceUploader";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import {
  deleteApartment as deleteApartmentInDb,
  fetchApartmentsForLandlord,
  persistApartmentImages,
  updateApartment,
  updateApartmentPublication,
  type Apartment,
  type ApartmentStatus,
} from "@/app/shared/data/apartments";
import {
  fetchRatingsForApartments,
  subscribeToApartmentRatings,
  summarizeApartmentRatings,
  type ApartmentRatingRow,
} from "@/app/shared/services/apartmentRatingsService";
import { deleteUser as deleteUserAccount } from "@/app/shared/services/authService";
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
  type DashboardUserRow,
} from "@/app/shared/services/dashboardSupabaseService";
import { generateBackupCodes } from "@/app/shared/services/securityService";
import { apartmentToFormValues } from "@/app/shared/utils/apartmentMappers";
import { supabase } from "@/lib/supabaseClient";
import { Eye, Heart, Menu, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const LANDLORD_DASHBOARD_SECTIONS = new Set(["overview", "properties", "activity", "notifications", "settings", "help"]);

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

  const allRooms = myApartments.flatMap((apt: any) => apt.rooms ?? []);
  const unitStatuses: ApartmentStatus[] = allRooms.length > 0
    ? allRooms.map(getRoomStatus)
    : myApartments.map(getApartmentStatus);
  const availableCount = unitStatuses.filter((status) => status === "available").length;

  const propertyIds = new Set(myApartments.map((apartment) => apartment.id));
  const landlordFavoriteRows = favoriteRows.filter((favorite) => propertyIds.has(favorite.apartment_id ?? favorite.apartmentId ?? ""));
  const landlordViewRows = viewRows.filter((view) => propertyIds.has(view.apartment_id ?? view.apartmentId ?? ""));
  const landlordAccount = favoriteUsers.find((entry) => entry.id === user?.id);
  const landlordVerified = landlordAccount?.isVerified ?? landlordAccount?.is_verified ?? user?.isVerified ?? false;
  const landlordPermit = landlordAccount?.permit_number ?? landlordAccount?.permitNumber ?? user?.permitNumber ?? "";
  const getViewWeight = (view: DashboardApartmentViewRow) => Math.max(0, Number(view.view_count) || 0);

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

  const [business, setBusiness] = useState<LandlordBusiness>(() => {
    return {
      businessName: "",
      taxId: "",
      businessType: "sole_proprietor",
      yearsActive: "",
    };
  });

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
  };  const addAuditLog = (action: string, details: string) => {
    if (user?.id) {
      void createAuditLog({
        admin_id: user.id,
        action: action.toLowerCase(),
        target_type: "user",
        target_id: user.id,
        details: { summary: details },
      });
    }
  };  const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter");
    if (!/[0-9]/.test(password)) errors.push("At least one number");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("At least one special character");
    return { valid: errors.length === 0, errors };
  };  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^09\d{9}$|^\+639\d{9}$/;
    return phoneRegex.test(phone);
  };  const [settingsTab, setSettingsTab] = useState("profile");
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
  });  const handlePasswordChange = async () => {
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
  };  const handleSetup2FA = async () => {
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

  const handleSubmitAppeal = async () => {
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
  };

  const sectionMap: Record<string, () => ReactElement> = {
    overview:      () => (
      <OverviewSection
        myApartments={myApartments}
        user={user}
        availableCount={availableCount}
        landlordVerified={landlordVerified}
        landlordPermit={landlordPermit}
        setSettingsTab={setSettingsTab}
        setActiveSection={setActiveSection}
        isLoadingApartments={isLoadingApartments}
        openViewers={openViewers}
        aptViews={aptViews}
        openFavoriters={openFavoriters}
        aptFavs={aptFavs}
        setEditingApartment={setEditingApartment}
        handleTogglePublication={handleTogglePublication}
        deletingApartmentId={deletingApartmentId}
        handleDeleteApartment={handleDeleteApartment}
      />
    ),
    properties:    () => (
      <PropertiesSection
        myApartments={myApartments}
        setPropertyFilter={setPropertyFilter}
        propertyFilter={propertyFilter}
        propertySort={propertySort}
        setPropertySort={setPropertySort}
        setPropertyViewMode={setPropertyViewMode}
        propertyViewMode={propertyViewMode}
        isLoadingApartments={isLoadingApartments}
        paginatedApartments={paginatedApartments}
        ratingSummary={ratingSummary}
        ratingsLoading={ratingsLoading}
        openViewers={openViewers}
        aptViews={aptViews}
        openFavoriters={openFavoriters}
        aptFavs={aptFavs}
        setEditingApartment={setEditingApartment}
        handleTogglePublication={handleTogglePublication}
        deletingApartmentId={deletingApartmentId}
        handleDeleteApartment={handleDeleteApartment}
        filteredApartments={filteredApartments}
        safePropertyPage={safePropertyPage}
        propertiesPerPage={propertiesPerPage}
        setPropertyPage={setPropertyPage}
        propertyPageCount={propertyPageCount}
        setPropertiesPerPage={setPropertiesPerPage}
      />
    ),
    activity:      () => (
      <ActivitySection
        activityRange={activityRange}
        landlordViewRows={landlordViewRows}
        landlordFavoriteRows={landlordFavoriteRows}
        ratingRows={ratingRows}
        propertyIds={propertyIds}
        myApartments={myApartments}
        getViewWeight={getViewWeight}
        setActivityRange={setActivityRange}
        isLoadingApartments={isLoadingApartments}
        isLoadingActivityData={isLoadingActivityData}
      />
    ),
    notifications: () => (
      <NotificationsSection
        notifications={notifications}
        notifSearch={notifSearch}
        notifCategory={notifCategory}
        notifSort={notifSort}
        isMarkingAllNotifs={isMarkingAllNotifs}
        markAllLandlordNotificationsRead={markAllLandlordNotificationsRead}
        setNotifCategory={setNotifCategory}
        setNotifSearch={setNotifSearch}
        setNotifSort={setNotifSort}
        isLoadingNotifications={isLoadingNotifications}
        handleNotificationClick={handleNotificationClick}
        setOpenNotifMenuId={setOpenNotifMenuId}
        openNotifMenuId={openNotifMenuId}
        toggleNotifReadStatus={toggleNotifReadStatus}
        deletingNotifId={deletingNotifId}
        deleteNotif={deleteNotif}
        landlordAppeals={landlordAppeals}
        getAppealMetadata={getAppealMetadata}
      />
    ),
    settings: () => (
      <SettingsSection settingsTab={settingsTab} setSettingsTab={setSettingsTab}
        profileTab={<ProfileTab
      profile={profile}
      isUploadingProfilePhoto={isUploadingProfilePhoto}
      profilePhotoInputRef={profilePhotoInputRef}
      handleRemoveProfilePhoto={handleRemoveProfilePhoto}
      handleProfilePhoto={handleProfilePhoto}
      updateProfile={updateProfile}
      setProfile={setProfile}
      savedProfile={savedProfile}
      handleUpdateProfile={handleUpdateProfile}
      isUpdatingProfile={isUpdatingProfile}
    />}
        alertsTab={<AlertsTab
      alerts={alerts}
      setA={setA}
      handleSaveAlerts={handleSaveAlerts}
    />}
        businessTab={<BusinessTab
      business={business}
      setB={setB}
      myApartments={myApartments}
      allRooms={allRooms}
      availableCount={availableCount}
      setEditingApartment={setEditingApartment}
      setBusiness={setBusiness}
      savedBusiness={savedBusiness}
      handleSaveBusiness={handleSaveBusiness}
    />}
        securityTab={<SecurityTab
      security={security}
      passwordState={passwordState}
      setPasswordState={setPasswordState}
      handlePasswordChange={handlePasswordChange}
      twoFAState={twoFAState}
      handleSetup2FA={handleSetup2FA}
      updateSecurity={updateSecurity}
      setTwoFAState={setTwoFAState}
      handleCancel2FASetup={handleCancel2FASetup}
      handleVerify2FA={handleVerify2FA}
      handleSaveSecurity={handleSaveSecurity}
      handleDeleteAccount={handleDeleteAccount}
    />}
      />
    ),
    help:          () => (
      <HelpSection
        navigate={navigate}
        setSettingsTab={setSettingsTab}
        supportSubmitted={supportSubmitted}
        setSupportSubmitted={setSupportSubmitted}
        supportForm={supportForm}
        setSupportForm={setSupportForm}
        handleSupportSubmit={handleSupportSubmit}
        isSubmittingSupport={isSubmittingSupport}
      />
    ),
  };  return (
    <div className="app-shell landlord-shell fixed inset-0 z-50 overflow-hidden bg-[#FCFAF7]">
      <div className="app-shell-frame flex h-full">

        <aside className="app-shell-sidebar hidden h-full w-60 shrink-0 flex-col border-r border-[#E8DED1] bg-white lg:flex">
          <LandlordSidebar user={user} verified={landlordVerified} activeSection={activeSection === "properties" ? "overview" : activeSection as "overview" | "activity" | "notifications" | "settings" | "help"} unreadNotifications={unreadNotificationCount} onSectionChange={setActiveSection} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />
        </aside>

        {sidebarOpen && (
          <div className="app-sidebar-overlay fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

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

        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
          className="app-sidebar-trigger fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B735B] text-white shadow-lg transition hover:bg-[#756A60] lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="app-shell-main flex-1 min-w-0 h-full overflow-y-auto">
          <main className="app-shell-content app-shell-content-mobile-nav px-4 py-5 pt-16 md:px-6 lg:px-8 lg:pt-6">
            {(sectionMap[activeSection] ?? sectionMap.overview)()}
          </main>
        </div>
      </div>

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

      {selectedNotificationDetail && <NotificationDetailModal
        selectedNotificationDetail={selectedNotificationDetail}
        getAppealMetadata={getAppealMetadata}
        myApartments={myApartments}
        landlordAppeals={landlordAppeals}
        setSelectedNotificationDetail={setSelectedNotificationDetail}
        openAppealForNotification={openAppealForNotification}
      />}

      {appealModal.open && <AppealModal
        closeAppealModal={closeAppealModal}
        appealModal={appealModal}
        isSubmittingAppeal={isSubmittingAppeal}
        appealMessage={appealMessage}
        setAppealMessage={setAppealMessage}
        appealContact={appealContact}
        setAppealContact={setAppealContact}
        appealEvidence={appealEvidence}
        setAppealEvidence={setAppealEvidence}
        handleSubmitAppeal={handleSubmitAppeal}
      />}
    </div>
  );
}
