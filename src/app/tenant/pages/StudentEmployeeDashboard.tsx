import { ApartmentCard } from "@/app/shared/components/common/ApartmentCard";
import { ApartmentRatingSummary } from "@/app/shared/components/common/ApartmentRatingSummary";
import { EvidenceUploader, type EvidenceFile } from "@/app/shared/components/common/EvidenceUploader";
import { LogoutConfirmation } from "@/app/shared/components/common/LogoutConfirmation";
import { VerifiedBadge } from "@/app/shared/components/common/VerifiedBadge";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/shared/components/ui/card";
import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
import { useApartmentsContext } from "@/app/shared/contexts/ApartmentsContext";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import { getTenantType, isTenantRole } from "@/app/shared/services/authService";
import { getTimeBasedGreeting } from "@/app/tenant/utils/tenantGreeting";
import { TenantNotifications } from "@/app/tenant/components/TenantNotifications";
import { useTenantNotifications } from "@/app/tenant/hooks/useTenantNotifications";
import { fetchApartmentRatings, subscribeToApartmentRatings, summarizeApartmentRatings, type ApartmentRatingRow } from "@/app/shared/services/apartmentRatingsService";
import { useFavorites } from "@/app/shared/hooks/useFavorites";
import { Settings as AccountSettings } from "@/app/shared/pages/settings/Settings";
import {
  createReport,
  createSupportTicket,
  defaultTenantPreferences,
  fetchApartmentViews,
  fetchFavorites as fetchDashboardFavorites,
  fetchTenantPreferences,
  type DashboardApartmentViewRow,
  type DashboardFavoriteRow,
  type TenantPreferenceSettings
} from "@/app/shared/services/dashboardSupabaseService";
import { uploadReportEvidence } from "@/app/shared/services/reportEvidenceService";
import { formatApartmentLocation } from "@/app/shared/utils/apartmentLocation";
import { getImageUrl } from "@/app/shared/utils/images";
import { getAvailableRoomCount, isTenantVisibleApartment } from "@/app/shared/utils/listingVisibility";
import { rankApartments, type TenantPreferences } from "@/app/shared/utils/rankingEngine";
import {
  AlertTriangle,
  Bell,
  Bath,
  Bed,
  Bookmark,
  BookOpen,
  Building2,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  Grid2X2,
  Heart,
  HelpCircle,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  List,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Loader2,
  RotateCcw,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
  X,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

function SuggestedLineArt() {
  return (
    <svg aria-hidden="true" className="tenant-architecture" viewBox="0 0 520 210" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className="tenant-architecture-lines" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 194h484M150 194V43c0-11 9-20 20-20h166c11 0 20 9 20 20v151M171 194V51h164v143M253 51v63" />
        <path d="M215 181c-8-19-7-39 2-58 7-15 20-23 36-23h24c18 0 32 9 39 26 7 18 7 36-1 55M210 181h111M224 181l-6 13m91-13 7 13M229 135c8 9 21 14 38 14 16 0 29-5 39-14" />
        <path d="M395 194V76m0 0c0-18 14-31 32-31h22M381 76h28M449 45l20 12-20 12M395 157h53m-42 0v37m31-37v37M399 157c0-6 5-11 11-11h33c6 0 11 5 11 11" />
        <path d="M88 194v-39h43v39M109 155c-2-31-6-57-19-81m19 81c1-35 9-66 27-93m-27 93c-13-27-31-47-53-61m53 61c16-20 34-34 55-42M90 74c-18-2-26 8-24 24 16 2 25-7 24-24Zm46-12c16 0 23 11 18 26-15-1-22-10-18-26ZM56 94c-16 1-22 12-17 26 15-1 21-11 17-26Zm108 19c15 2 20 13 14 27-14-3-19-13-14-27Z" />
        <path d="M34 194v-22h28v22m-14-22c0-17 2-31 8-43m-8 43c-4-14-10-25-19-34m19 20c7-10 15-17 25-21" />
        <path d="m455 22 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Zm34 54 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5ZM78 35l2.5 6.5L87 44l-6.5 2.5L78 53l-2.5-6.5L69 44l6.5-2.5L78 35Z" />
      </g>
    </svg>
  );
}

function PopularLineArt() {
  return (
    <svg aria-hidden="true" className="tenant-architecture" viewBox="0 0 520 210" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className="tenant-architecture-lines" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 194h496M66 194V83h82v111M82 100h18m17 0h15m-50 24h18m17 0h15m-50 24h18m17 0h15M174 194V48h105v146M193 70h23m24 0h21m-68 29h23m24 0h21m-68 29h23m24 0h21m-68 29h23m24 0h21M309 194V104h85v90m-67-70h20m20 0h11m-51 27h20m20 0h11" />
        <path d="M39 168c45-7 84-19 119-37 35-17 68-40 100-70 28-26 58-40 91-42" strokeWidth="1.8" />
        <path d="m335 12 15 7-13 10M428 194v-35m-22 35v-35h45v35m-52-35h59M478 194c5-15 5-30 0-45m0 22c-8-5-10-12-9-18m9 10c8-6 10-13 9-21" />
        <path d="M422 82c0-13 10-23 23-23s23 10 23 23c0 18-23 39-23 39s-23-21-23-39Zm23-8a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z" />
        <path d="m382 38 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Zm90-10 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
      </g>
    </svg>
  );
}

function ReportLineArt() {
  return (
    <svg aria-hidden="true" className="tenant-architecture" viewBox="0 0 520 210" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className="tenant-architecture-lines" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 194h484M112 194V33h172v161M136 33V20h124l24 25M260 20v25h24" />
        <path d="M145 69h105M145 87h78M145 105h94M145 142h52M145 160h74" />
        <path d="M145 116h64v17h-64zM155 128l13-8 12 7 10-6 12 8" />
        <path d="M348 148a48 48 0 1 0 0-96 48 48 0 0 0 0 96Zm34-14 48 48M421 173l18 18" strokeWidth="1.8" />
        <path d="M332 83h32v31h-32zM339 91h18m-18 8h13m-13 8h17" />
        <path d="M442 54h45v34h-30l-10 10 2-10h-7V54Zm11 12h23m-23 9h16" />
        <path d="M72 194v-30h34v30M89 164c-1-22-5-40-14-55m14 55c1-25 7-46 19-64m-19 64c-8-16-19-28-33-36m33 21c8-10 18-17 29-21" />
        <path d="M390 37h17l9 15-9 15h-17l-9-15 9-15Zm8 9v9m0 5h.01" />
      </g>
    </svg>
  );
}

function HelpLineArt() {
  return (
    <svg aria-hidden="true" className="tenant-architecture" viewBox="0 0 520 210" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className="tenant-architecture-lines" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 194h484M112 171c36-9 72-6 108 10V61c-34-17-70-20-108-10v120Zm216 0c-36-9-72-6-108 10V61c34-17 70-20 108-10v120Z" />
        <path d="M132 73c24-4 47-1 68 8m-68 16c24-4 47-1 68 8m-68 16c24-4 47-1 68 8m108-56c-24-4-47-1-68 8m68 16c-24-4-47-1-68 8m68 16c-24-4-47-1-68 8" />
        <path d="M181 151v33l13-9 13 9v-29M407 160a39 39 0 1 0 0-78 39 39 0 0 0 0 78Zm0-64v50m-25-25h50" />
        <path d="M407 104l11 17-11 17-11-17 11-17Z" />
        <path d="M66 194v-34h37v34M85 160c-1-25-6-46-16-64m16 64c2-28 9-51 23-69m-23 69c-10-18-23-32-39-42m39 27c11-13 24-22 39-27" />
        <path d="M371 57c13-21 35-34 65-40m-9-7 14 6-10 12M455 194V91m0 0c0-15 12-27 27-27h14M443 91h24" />
      </g>
    </svg>
  );
}

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
  { icon: HelpCircle,    label: "Help",               section: "help",    isLink: false },
];

const DASHBOARD_SECTIONS = ["overview", "favorites", "suggested", "popular", "notifications", "settings", "report", "help"];

export function StudentEmployeeDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites: favoriteIds, toggleFavorite, refreshFavorites } = useFavorites();
  const tenantNotifications = useTenantNotifications();
  const [activeSection, setActiveSection] = useState("suggested");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [favoriteFilter, setFavoriteFilter] = useState<"all" | "available" | "unavailable">("all");
  const [favoriteSort, setFavoriteSort] = useState<"newest" | "price-low" | "price-high" | "name">("newest");
  const [favoriteView, setFavoriteView] = useState<"grid" | "list">("grid");
  const [removingFavoriteId, setRemovingFavoriteId] = useState<string | null>(null);

  // ── Report form state ────────────────────────────────────────────────────
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportForm, setReportForm] = useState({
    apartment: "",
    details: "",
    contact: user?.email || "",
  });
  const [reportEvidenceFiles, setReportEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // ── Help & support state ────────────────────────────────────────────────
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportForm, setSupportForm] = useState({
    topic: "",
    message: "",
    contact: user?.email || "",
  });

  // ── Settings state ───────────────────────────────────────────────────────
  const [preferredArea, setPreferredArea]     = useState("");
  const [maxBudget, setMaxBudget]             = useState("0");
  const [prefPetFriendly, setPrefPetFriendly] = useState(false);
  const [prefParking, setPrefParking]         = useState(false);
  const [prefFurnished, setPrefFurnished]     = useState(false);
  const [prefWifi, setPrefWifi] = useState(false);
  const [prefAc, setPrefAc] = useState(false);
  const [prefLaundry, setPrefLaundry] = useState(false);
  const [recommendationLocation, setRecommendationLocation] = useState(true);
  const [dashboardFavoriteRows, setDashboardFavoriteRows] = useState<DashboardFavoriteRow[]>([]);
  const [dashboardViewRows, setDashboardViewRows] = useState<DashboardApartmentViewRow[]>([]);
  const [dashboardRatingRows, setDashboardRatingRows] = useState<ApartmentRatingRow[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  const {
    apartments: allApartments,
    isLoading: apartmentsLoading,
    error: apartmentsError,
    refreshApartments,
  } = useApartmentsContext();

  const applyTenantPreferences = (preferences: TenantPreferenceSettings) => {
    setPreferredArea(preferences.preferredArea);
    setMaxBudget(String(preferences.maxBudget || 0));
    setPrefPetFriendly(preferences.petFriendly);
    setPrefParking(preferences.parking);
    setPrefFurnished(preferences.furnished);
    setPrefWifi(preferences.wifi); setPrefAc(preferences.ac); setPrefLaundry(preferences.laundryArea);
    setRecommendationLocation(preferences.recommendationLocation);
  };

  useEffect(() => {
    const section = new URLSearchParams(location.search).get("section");
    if (section && DASHBOARD_SECTIONS.includes(section)) {
      setActiveSection(section);
    }
  }, [location.search]);

  useEffect(() => {
    let mounted = true;

    const loadRankingData = () => Promise.all([fetchDashboardFavorites(), fetchApartmentViews(), fetchApartmentRatings()])
      .then(([favorites, views, ratings]) => {
        if (!mounted) return;
        setDashboardFavoriteRows(favorites);
        setDashboardViewRows(views);
        setDashboardRatingRows(ratings);
        setRatingsLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setDashboardFavoriteRows([]);
        setDashboardViewRows([]);
        setDashboardRatingRows([]);
        setRatingsLoading(false);
      });
    void loadRankingData();
    const unsubscribe = subscribeToApartmentRatings(() => { void loadRankingData(); });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    applyTenantPreferences(defaultTenantPreferences);

    if (!user?.id || !isTenantRole(user.role)) return;

    let mounted = true;
    const tenantId = user.id;

    void fetchTenantPreferences(tenantId)
      .then((preferences) => {
        if (!mounted || !preferences) return;
        applyTenantPreferences(preferences);
      })
      .catch(() => {
        if (!mounted) return;
        toast.error("Unable to load tenant preferences.");
      });

    return () => {
      mounted = false;
    };
  }, [user?.id, user?.role]);

  const publishedApartments = useMemo(() => {
    return allApartments.filter(isTenantVisibleApartment);
  }, [allApartments]);
  const ratingSummary = useMemo(() => summarizeApartmentRatings(dashboardRatingRows), [dashboardRatingRows]);

  const isApartmentAvailable = isTenantVisibleApartment;

  const availableApartments = useMemo(() => {
    return publishedApartments.filter(isApartmentAvailable);
  }, [publishedApartments]);

  const availableRoomsCount = useMemo(() => {
    return publishedApartments.reduce((total, apt) => total + getAvailableRoomCount(apt), 0);
  }, [publishedApartments]);

  const tenantRankingPreferences = useMemo<TenantPreferences>(() => {
    const parsedBudget = Number(maxBudget);

    return {
      maxBudget: Number.isFinite(parsedBudget) && parsedBudget > 0 ? parsedBudget : undefined,
      preferredArea: recommendationLocation && preferredArea.trim() ? preferredArea.trim() : undefined,
      petFriendly: prefPetFriendly,
      parking: prefParking,
      furnished: prefFurnished,
      wifi: prefWifi, ac: prefAc, laundryArea: prefLaundry,
      tenantType: getTenantType(user) ?? "other",
    };
  }, [maxBudget, preferredArea, recommendationLocation, prefPetFriendly, prefParking, prefFurnished, prefWifi, prefAc, prefLaundry, user?.role, user?.tenantType]);

  // Personalized recommendations based on saved tenant preferences
  const suggestedApartments = useMemo(() => {
    if (isTenantRole(user?.role)) {
      const apartmentViewCounts = new Map<string, number>();
      dashboardViewRows.forEach((row) => {
        const apartmentId = row.apartment_id ?? row.apartmentId ?? "";
        if (apartmentId) apartmentViewCounts.set(apartmentId, (apartmentViewCounts.get(apartmentId) ?? 0) + (Number(row.view_count) || 1));
      });
      const apartmentFavoriteCounts = new Map<string, number>();
      dashboardFavoriteRows.forEach((row) => {
        const apartmentId = row.apartment_id ?? row.apartmentId ?? "";
        if (apartmentId) apartmentFavoriteCounts.set(apartmentId, (apartmentFavoriteCounts.get(apartmentId) ?? 0) + 1);
      });
      const ratingSummary = summarizeApartmentRatings(dashboardRatingRows);
      return rankApartments(publishedApartments, tenantRankingPreferences, favoriteIds, {
        apartmentViewCounts,
        apartmentFavoriteCounts,
        apartmentRatingStats: ratingSummary.byApartment,
        platformAverageRating: ratingSummary.platformAverage,
      }).slice(0, 6);
    }
    return publishedApartments.slice(0, 6);
  }, [dashboardFavoriteRows, dashboardRatingRows, dashboardViewRows, favoriteIds, publishedApartments, tenantRankingPreferences, user?.role]);


  // Popular apartments (most viewed, most favorited, highest engagement)
  const popularApartments = useMemo(() => {
    const getApartmentId = (row: DashboardFavoriteRow | DashboardApartmentViewRow) => row.apartment_id ?? row.apartmentId ?? "";
    const getViewWeight = (row: DashboardApartmentViewRow) => Number(row.view_count) || 1;
    const engagementByApartment = new Map<string, number>();

    dashboardFavoriteRows.forEach((row) => {
      const apartmentId = getApartmentId(row);
      if (apartmentId) engagementByApartment.set(apartmentId, (engagementByApartment.get(apartmentId) ?? 0) + 2);
    });

    dashboardViewRows.forEach((row) => {
      const apartmentId = getApartmentId(row);
      if (apartmentId) engagementByApartment.set(apartmentId, (engagementByApartment.get(apartmentId) ?? 0) + getViewWeight(row));
    });

    return [...publishedApartments]
      .filter((apartment) => (engagementByApartment.get(apartment.id) ?? 0) > 0)
      .sort((a, b) => {
        return (engagementByApartment.get(b.id) ?? 0) - (engagementByApartment.get(a.id) ?? 0);
      })
      .slice(0, 6);
  }, [dashboardFavoriteRows, dashboardViewRows, publishedApartments]);

  const favoriteApartments = publishedApartments.filter((apt) => favoriteIds.includes(apt.id));
  const getAvailableRooms = getAvailableRoomCount;

  const visibleFavoriteApartments = useMemo(() => {
    return [...favoriteApartments]
      .filter((apartment) => {
        if (favoriteFilter === "available") return isApartmentAvailable(apartment);
        if (favoriteFilter === "unavailable") return !isApartmentAvailable(apartment);
        return true;
      })
      .sort((a, b) => {
        if (favoriteSort === "price-low") return Number(a.price || 0) - Number(b.price || 0);
        if (favoriteSort === "price-high") return Number(b.price || 0) - Number(a.price || 0);
        if (favoriteSort === "name") return a.title.localeCompare(b.title);

        const bDate = new Date(b.updatedAt || b.createdAt || b.availableDate).getTime();
        const aDate = new Date(a.updatedAt || a.createdAt || a.availableDate).getTime();
        return (Number.isNaN(bDate) ? 0 : bDate) - (Number.isNaN(aDate) ? 0 : aDate);
      });
  }, [favoriteApartments, favoriteFilter, favoriteSort]);
  const displayName = user?.name?.trim();
  const tenantGreeting = getTimeBasedGreeting(user?.name);
  const tenantType = getTenantType(user);
  const dashboardSubtitle = tenantType === "student"
    ? "Find a verified place that fits your study routine."
    : tenantType === "employee"
      ? "Discover your ideal home near your workplace."
      : "Discover a verified home that fits your everyday needs.";

  const handleLogout = () => { logout?.(); navigate("/"); };

  const removeFavorite = async (apartmentId: string) => {
    setRemovingFavoriteId(apartmentId);
    try {
      await toggleFavorite(apartmentId);
      await refreshFavorites();
    } finally {
      setRemovingFavoriteId(null);
    }
  };

  const handleReportSubmit = async () => {
    if (isSubmittingReport) return;
    if (!reportForm.apartment) {
      toast.error("Please select the apartment you want to report.");
      return;
    }

    if (!reportForm.details.trim()) {
      toast.error("Please describe the problem before submitting.");
      return;
    }

    if (!user?.id) {
      toast.error("Please sign in to submit a report.");
      return;
    }

    const apartment = allApartments.find((apt) => apt.id === reportForm.apartment);

    setIsSubmittingReport(true);
    try {
      const createdReport = await createReport({
        reporter_id: user.id,
        reporter_role: getTenantType(user) ?? "tenant",
        apartment_id: reportForm.apartment,
        category: "Apartment problem",
        issue_type: "Tenant-submitted problem",
        severity: "med",
        tags: [],
        details: reportForm.details.trim(),
        contact: reportForm.contact.trim() || user.email,
        landlord_id: apartment?.landlordId,
        has_evidence: reportEvidenceFiles.length > 0,
        evidence_count: reportEvidenceFiles.length,
      });

      if (!createdReport?.id) {
        throw new Error("Unable to save report.");
      }

      const reportId = createdReport.id;
      const uploadResults = await Promise.all(
        reportEvidenceFiles.map((evidence) =>
          uploadReportEvidence({
            reportId,
            file: evidence.file,
            fileName: evidence.fileName,
            fileType: evidence.fileType,
            mimeType: evidence.mimeType,
            uploadedBy: user.id,
          }),
        ),
      );

      if (uploadResults.some((result) => !result)) {
        throw new Error("Report saved, but one or more evidence files could not be uploaded. Please contact support.");
      }

      setReportSubmitted(true);
      toast.success("Report submitted successfully. Admin will review it.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit report.";
      toast.error(message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const resetReport = () => {
    setReportSubmitted(false);
    setReportForm({ apartment: "", details: "", contact: user?.email || "" });
    setReportEvidenceFiles([]);
  };

  const handleSupportSubmit = async () => {
    if (isSubmittingSupport) return;
    if (!supportForm.topic || !supportForm.message.trim()) {
      toast.error("Please choose a topic and describe your concern.");
      return;
    }

    if (!user?.id) return void toast.error("Please sign in to contact support.");
    setIsSubmittingSupport(true);
    try {
      await createSupportTicket({
        userId: user.id,
        topic: supportForm.topic,
        message: supportForm.message,
        contact: supportForm.contact,
      });
      setSupportSubmitted(true);
      setSupportForm({ topic: "", message: "", contact: user.email || "" });
      toast.success("Support request sent!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send the support request.");
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="app-sidebar flex flex-col h-full overflow-y-auto">
      <div className="app-sidebar-brand px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e8ded1] bg-[#faf8f5] text-[#8b735b]">
            <Home className="h-6 w-6" />
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

  // ── Section: Overview ────────────────────────────────────────────────────
  const SummaryCard = ({
    title,
    value,
    detail,
    icon: Icon,
    tone,
    onClick,
  }: {
    title: string;
    value: number;
    detail: string;
    icon: LucideIcon;
    tone: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="group flex min-h-36 items-center gap-5 rounded-lg border border-slate-200 bg-white p-6 text-left shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.12)]"
    >
      <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg shadow-lg ${tone}`}>
        <Icon className="h-8 w-8" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-600">{title}</span>
        <strong className="mt-1 block text-4xl font-black leading-none text-[#756A60]">{value.toLocaleString()}</strong>
        <span className="mt-2 block text-sm font-medium text-slate-500">{detail}</span>
      </span>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-[#8B735B] transition group-hover:bg-[#8B735B] group-hover:text-white">
        <ChevronRight className="h-5 w-5" />
      </span>
    </button>
  );

  const FeatureCard = ({
    title,
    description,
    count,
    icon: Icon,
    section,
    accent,
  }: {
    title: string;
    description: string;
    count: number;
    icon: LucideIcon;
    section: string;
    accent: "orange" | "indigo" | "green";
  }) => {
    const accentClass = {
      orange: "bg-[#FAF8F5] text-[#756A60] border-[#F3EFEA]",
      indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
      green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    }[accent];

    return (
      <button
        onClick={() => setActiveSection(section)}
        className={`relative min-h-80 overflow-hidden rounded-lg border bg-white p-7 text-left shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.12)] ${accentClass}`}
      >
        <div className="relative z-10">
          <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg border bg-white/80 shadow-sm">
            <Icon className="h-7 w-7" />
          </span>
          <h3 className="text-2xl font-black text-slate-950">{title}</h3>
          <p className="mt-4 max-w-72 text-sm font-medium leading-6 text-slate-600">{description}</p>
          <div className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider">
            {count.toLocaleString()} {count === 1 ? "listing" : "listings"}
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-current/25 bg-white px-4 py-2 text-sm font-black">
            Explore Now
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
        <div className="absolute -bottom-10 -right-8 h-36 w-36 rounded-full bg-current/10" />
        <div className="absolute bottom-0 right-0 h-24 w-40 bg-gradient-to-tl from-current/20 to-transparent" />
      </button>
    );
  };

  const EmptyState = ({
    icon: Icon,
    message,
    actionLabel,
    action,
  }: {
    icon: LucideIcon;
    message: string;
    actionLabel?: string;
    action?: () => void;
  }) => (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]">
        <Icon className="h-7 w-7" />
      </span>
      <p className="max-w-md text-base font-bold text-slate-700">{message}</p>
      {actionLabel && action && (
        <Button onClick={action} className="mt-5 rounded-lg bg-[#8B735B] font-black text-white hover:bg-[#756A60]">
          {actionLabel}
        </Button>
      )}
    </div>
  );

  const InfoPill = ({
    icon: Icon,
    value,
    label,
    tone,
  }: {
    icon: LucideIcon;
    value: string;
    label: string;
    tone: string;
  }) => (
    <div className="flex items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-lg font-black leading-none text-slate-950">{value}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
      </div>
    </div>
  );

  const FavoriteApartmentCard = ({ apartment }: { apartment: (typeof favoriteApartments)[number] }) => {
    const status = apartment.status ?? "available";
    const statusClass: Record<string, string> = {
      available: "bg-emerald-600 text-white",
      occupied: "bg-rose-600 text-white",
      reserved: "bg-amber-500 text-white",
      maintenance: "bg-slate-600 text-white",
    };
    const statusLabel: Record<string, string> = {
      available: "Available",
      occupied: "Occupied",
      reserved: "Unavailable",
      maintenance: "Maintenance",
    };
    const availableRooms = getAvailableRooms(apartment);
    const images = [apartment.image, ...(apartment.images ?? [])].filter(Boolean);
    const locationLabel = formatApartmentLocation(apartment);

    return (
      <article className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] ${favoriteView === "list" ? "grid lg:grid-cols-[minmax(280px,0.9fr)_1fr]" : ""}`}>
        <div className="relative bg-slate-100">
          <div className={favoriteView === "list" ? "aspect-[4/3] lg:h-full lg:aspect-auto" : "aspect-[4/3]"}>
            {images[0] ? (
              <img src={getImageUrl(images[0])} alt={apartment.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100">
                <Building2 className="h-12 w-12 text-slate-300" />
              </div>
            )}
          </div>
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            <VerifiedBadge label="Verified Listing" className="bg-white/95 shadow-lg backdrop-blur-sm" />
            {apartment.petFriendly && <Badge className="rounded-full bg-emerald-600 text-white">Pet Friendly</Badge>}
            <Badge className={`rounded-full ${statusClass[status] ?? statusClass.available}`}>{statusLabel[status] ?? "Available"}</Badge>
          </div>
          <button
            onClick={() => void removeFavorite(apartment.id)}
            disabled={removingFavoriteId === apartment.id}
            className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-rose-500 shadow-lg transition hover:scale-105 disabled:opacity-60"
            aria-label="Remove from favorites"
          >
            <Heart className="h-6 w-6 fill-current" />
          </button>
          {images.length > 1 && (
            <div className="absolute inset-x-4 bottom-4 grid grid-cols-4 gap-2">
              {images.slice(1, 5).map((image, index) => (
                <div key={`${image}-${index}`} className="aspect-[4/3] overflow-hidden rounded-md bg-white/80 shadow">
                  <img src={getImageUrl(image)} alt={`${apartment.title} ${index + 2}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-slate-950">{apartment.title}</h2>
              <ApartmentRatingSummary stats={ratingSummary.byApartment.get(apartment.id)} isLoading={ratingsLoading} className="mt-1.5" />
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                <MapPin className="h-4 w-4 text-rose-500" />
                <span>{locationLabel}</span>
              </div>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-sm font-black text-[#756A60]">View room prices</p>
            </div>
          </div>

          <div className="my-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 sm:grid-cols-4">
            <InfoPill icon={Bookmark} value={availableRooms.toLocaleString()} label={availableRooms === 1 ? "Room" : "Rooms"} tone="bg-[#FAF8F5] text-[#756A60]" />
            <InfoPill icon={Bed} value={apartment.rooms?.length ? apartment.rooms.length.toLocaleString() : apartment.bedrooms.toLocaleString()} label={apartment.rooms?.length ? "Room count" : "Beds"} tone="bg-rose-50 text-rose-600" />
            <InfoPill icon={Bath} value={apartment.bathrooms.toLocaleString()} label={apartment.bathrooms === 1 ? "Bath" : "Baths"} tone="bg-purple-50 text-purple-600" />
            <InfoPill icon={Square} value={Number(apartment.sqft || 0).toLocaleString()} label="Sqft" tone="bg-sky-50 text-sky-600" />
          </div>

          {apartment.description && (
            <p className="line-clamp-2 text-sm font-medium leading-6 text-slate-600">{apartment.description}</p>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row">
            <Button asChild variant="outline" className="h-12 flex-1 rounded-lg border-slate-200 font-black text-slate-700 hover:bg-slate-50">
              <Link to={`/apartment/${apartment.id}`} state={{ returnTo: "/dashboard?section=favorites", backLabel: "Back to Favorites" }}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </Button>
            <Button
              variant="outline"
              disabled={removingFavoriteId === apartment.id}
              onClick={() => void removeFavorite(apartment.id)}
              className="h-12 flex-1 rounded-lg border-red-200 bg-red-50 font-black text-red-600 hover:bg-red-100"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {removingFavoriteId === apartment.id ? "Removing..." : "Remove"}
            </Button>
          </div>
        </div>
      </article>
    );
  };

  const renderOverview = () => (
    <div className="mx-auto max-w-7xl space-y-7">
      <section className="relative overflow-hidden rounded-lg border border-[#F3EFEA] bg-white px-6 py-8 shadow-[0_22px_60px_rgba(15,23,42,0.08)] md:px-9 md:py-10">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-[#F3EFEA] bg-[#FAF8F5] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#756A60] shadow-sm">
            <LayoutDashboard className="h-4 w-4" />
            Your Dashboard
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-6xl">{tenantGreeting}</h1>
          <p className="mt-5 text-lg font-medium text-slate-600">{dashboardSubtitle}</p>
        </div>
        <div className="pointer-events-none absolute right-6 top-6 hidden h-48 w-72 rounded-full bg-[#F3EFEA] md:block" />
        <div className="pointer-events-none absolute right-12 top-20 hidden h-28 w-56 rounded-lg border border-[#F3EFEA] bg-white/80 shadow-lg md:block">
          <div className="absolute bottom-5 left-7 h-12 w-40 rounded-lg bg-[#F3EFEA]" />
          <div className="absolute bottom-16 left-12 h-12 w-12 rounded-lg bg-slate-200" />
          <div className="absolute bottom-16 right-12 h-12 w-12 rounded-lg bg-[#E8DED1]" />
          <div className="absolute -right-8 bottom-0 h-24 w-10 rounded-full bg-emerald-100" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SummaryCard
          title="Your Favorites"
          value={favoriteIds.length}
          detail="Apartments saved"
          icon={Heart}
          tone="bg-[#8B735B] text-white"
          onClick={() => setActiveSection("favorites")}
        />
        <SummaryCard
          title="Available Now"
          value={availableApartments.length}
          detail={`${availableRoomsCount.toLocaleString()} available ${availableRoomsCount === 1 ? "room" : "rooms"}`}
          icon={Clock}
          tone="bg-emerald-600 text-white"
          onClick={() => navigate("/browse")}
        />
      </section>

      {availableApartments.length === 0 && (
        <EmptyState icon={Clock} message="No available apartments at the moment." />
      )}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <FeatureCard title="Suggested for You" description="Apartment recommendations based on your preferences and available listings." count={suggestedApartments.length} icon={Sparkles} section="suggested" accent="orange" />
        <FeatureCard title="Popular Apartments" description="Apartments receiving more interest from AptFindr users through views and favorites." count={popularApartments.length} icon={TrendingUp} section="popular" accent="indigo" />
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:flex-row sm:items-center">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-[#756A60]">
          <Search className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black text-slate-950">Looking for something specific?</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Use Browse All to find apartments from the live listing database.</p>
        </div>
        <Button onClick={() => navigate("/browse")} className="rounded-lg bg-[#8B735B] px-6 font-black text-white hover:bg-[#756A60]">
          Browse All Apartments
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </section>
    </div>
  );

  // ── Section: Favorites ───────────────────────────────────────────────────
  const renderFavorites = () => (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-[#F3EFEA] bg-white px-6 py-8 shadow-[0_22px_60px_rgba(15,23,42,0.08)] md:px-9">
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-500 shadow-sm">
            <Heart className="h-8 w-8 fill-current" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Your Favorites</h1>
            <p className="mt-2 text-lg font-medium text-slate-600">Apartments you've saved for later</p>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-0 right-8 hidden h-28 w-72 rounded-t-lg bg-[#FAF8F5] md:block" />
        <div className="pointer-events-none absolute bottom-8 right-20 hidden h-16 w-36 rounded-lg bg-[#F3EFEA] md:block" />
      </section>

      <section className="grid gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:grid-cols-2">
        <div className="flex items-center gap-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
            <Heart className="h-8 w-8 fill-current" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-600">Total Favorites</p>
            <p className="mt-1 text-4xl font-black text-rose-500">{favoriteApartments.length.toLocaleString()}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">{favoriteApartments.length === 1 ? "apartment saved" : "apartments saved"}</p>
          </div>
        </div>
        <div className="flex items-center gap-5 border-t border-slate-100 pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]">
            <Bookmark className="h-8 w-8 fill-current" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-600">Save for later</p>
            <p className="mt-2 max-w-sm text-base font-medium leading-7 text-slate-600">Compare and revisit real listings you saved from Browse and Apartment Details.</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_14px_35px_rgba(15,23,42,0.07)] lg:flex-row lg:items-center lg:justify-between">
        <select value={favoriteFilter} onChange={(event) => setFavoriteFilter(event.target.value as typeof favoriteFilter)} className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-[#DCC9B4] focus:ring-2 focus:ring-[#F3EFEA]">
          <option value="all">All Favorites ({favoriteApartments.length})</option>
          <option value="available">Available Only</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select value={favoriteSort} onChange={(event) => setFavoriteSort(event.target.value as typeof favoriteSort)} className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-[#DCC9B4] focus:ring-2 focus:ring-[#F3EFEA]">
            <option value="newest">Newest Added</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name</option>
          </select>
          <div className="grid h-12 grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
            <button onClick={() => setFavoriteView("grid")} className={`flex h-10 w-12 items-center justify-center rounded-md transition ${favoriteView === "grid" ? "bg-[#FAF8F5] text-[#756A60]" : "text-slate-500 hover:bg-slate-50"}`} aria-label="Grid view">
              <Grid2X2 className="h-5 w-5" />
            </button>
            <button onClick={() => setFavoriteView("list")} className={`flex h-10 w-12 items-center justify-center rounded-md transition ${favoriteView === "list" ? "bg-[#FAF8F5] text-[#756A60]" : "text-slate-500 hover:bg-slate-50"}`} aria-label="List view">
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {favoriteApartments.length === 0 ? (
        <EmptyState
          icon={Heart}
          message="No favorites yet. Browse apartments to save listings."
          actionLabel="Browse Apartments"
          action={() => navigate("/browse")}
        />
      ) : visibleFavoriteApartments.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
          <Search className="mb-4 h-10 w-10 text-slate-300" />
          <h2 className="text-xl font-black text-slate-950">No favorites match this filter</h2>
          <Button variant="outline" onClick={() => setFavoriteFilter("all")} className="mt-5 rounded-lg font-black">Show All Favorites</Button>
        </div>
      ) : (
        <div className={favoriteView === "grid" ? "grid grid-cols-1 gap-6 xl:grid-cols-2" : "space-y-6"}>
          {visibleFavoriteApartments.map((apartment) => (
            <FavoriteApartmentCard key={apartment.id} apartment={apartment} />
          ))}
        </div>
      )}

      <section className="flex flex-col gap-4 rounded-lg border border-[#F3EFEA] bg-[#FAF8F5] p-6 shadow-[0_16px_35px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-[#756A60] shadow-sm">
          <Building2 className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black text-slate-950">Explore more apartments</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">Find more places you'll love and add to your favorites.</p>
        </div>
        <Button onClick={() => navigate("/browse")} className="rounded-lg bg-[#8B735B] px-6 font-black text-white hover:bg-[#756A60]">
          Browse Apartments
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </section>
    </div>
  );

  // ── Section: Suggested ───────────────────────────────────────────────────
  const renderSuggested = () => (
    <div className="suggested-page mx-auto max-w-7xl space-y-5">
      <section className="suggested-hero relative flex min-h-[180px] items-center overflow-hidden rounded-xl border border-[#e8ded1] bg-gradient-to-r from-[#faf8f5] to-[#fffdfb] p-6 md:px-8">
        <div className="relative z-10 max-w-[58%] max-md:max-w-full">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8ded1] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8b735b] shadow-sm">
            <Sparkles className="h-4 w-4" />
            Personalized Discovery
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#302820] md:text-[34px]">Suggested for You</h2>
          <p className="mt-3 text-base font-medium text-[#756a60]">Apartments that may match what you're looking for.</p>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-3 hidden w-[43%] items-end text-[#b9a58f] md:flex"><SuggestedLineArt /></div>
      </section>
      <div className="flex justify-end">
        <Button onClick={() => navigate("/browse")} variant="outline" className="h-11 rounded-lg border-[#e8ded1] bg-white px-5 font-bold text-[#8b735b] hover:bg-[#faf8f5]">Browse All</Button>
      </div>
      {suggestedApartments.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {suggestedApartments.map((apartment) => (
            <div key={apartment.id} className="suggested-card relative">
              <Badge className="absolute right-16 top-3 z-10 border border-[#e8ded1] bg-[#faf8f5] text-xs font-semibold text-[#8b735b] shadow-sm hover:bg-[#faf8f5]">Suggested</Badge>
              <ApartmentCard apartment={apartment} ratingStats={ratingSummary.byApartment.get(apartment.id)} ratingsLoading={ratingsLoading} detailState={{ returnTo: "/dashboard?section=suggested", backLabel: "Back to Suggested" }} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          message="No suggestions yet. Browse apartments to improve recommendations."
          actionLabel="Browse Apartments"
          action={() => navigate("/browse")}
        />
      )}
    </div>
  );

  // ── Section: Popular ─────────────────────────────────────────────────────
  const renderPopular = () => (
    <div className="popular-page mx-auto max-w-7xl space-y-5">
      <section className="popular-hero relative flex min-h-[175px] items-center overflow-hidden rounded-xl border border-[#e8ded1] bg-gradient-to-r from-[#faf8f5] to-[#fffdfb] p-6 md:px-8">
        <div className="relative z-10 max-w-[58%] max-md:max-w-full">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8ded1] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8b735b] shadow-sm">
            <TrendingUp className="h-4 w-4" />
            Trending Choices
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#302820] md:text-[34px]">Popular Apartments</h2>
          <p className="mt-3 text-base font-medium text-[#756a60]">Explore apartments receiving more interest from AptFindr users through views and favorites.</p>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-3 hidden w-[43%] items-end text-[#b9a58f] md:flex"><PopularLineArt /></div>
      </section>
      <div className="flex justify-end">
        <Button onClick={() => navigate("/browse")} variant="outline" className="h-11 rounded-lg border-[#e8ded1] bg-white px-5 font-bold text-[#8b735b] hover:bg-[#faf8f5]">Browse All</Button>
      </div>
      {popularApartments.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {popularApartments.map((apartment) => (
            <div key={apartment.id} className="popular-card relative">
              <Badge className="absolute right-16 top-3 z-10 border border-[#e8ded1] bg-[#faf8f5] text-xs font-semibold text-[#8b735b] shadow-sm hover:bg-[#faf8f5]">Popular</Badge>
              <ApartmentCard apartment={apartment} ratingStats={ratingSummary.byApartment.get(apartment.id)} ratingsLoading={ratingsLoading} detailState={{ returnTo: "/dashboard?section=popular", backLabel: "Back to Popular" }} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={TrendingUp} message="No popular apartments yet." />
      )}
    </div>
  );

  // ── Section: Recent ──────────────────────────────────────────────────────
  // ── Section: Settings ────────────────────────────────────────────────────
  const renderReportPremium = () => (
    <div className="report-page mx-auto max-w-6xl space-y-6">
      <header className="report-hero relative flex min-h-[170px] items-center overflow-hidden rounded-2xl border border-[#e8ded1] bg-gradient-to-r from-[#faf8f5] to-[#fffdfb] p-6 md:px-8">
        <div className="relative z-10 max-w-[58%] max-md:max-w-full">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8ded1] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8b735b] shadow-sm">
            <AlertTriangle className="h-4 w-4" />
            Support &amp; Safety
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#302820] md:text-[34px]">Report a Problem</h2>
          <p className="mt-3 text-base font-medium text-[#756a60]">Tell us about inaccurate or problematic apartment listing information.</p>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-3 hidden w-[43%] items-end text-[#b9a58f] md:flex"><ReportLineArt /></div>
      </header>

      {reportSubmitted ? (
        <Card className="report-success rounded-xl border border-emerald-100 bg-white shadow-[0_4px_18px_rgba(48,40,32,0.06)]">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-black text-[#302820]">Report Submitted</h3>
            <p className="max-w-md text-sm font-medium leading-6 text-[#756a60]">
              Thank you for helping us keep listings accurate. You will receive a notification after an administrator completes the review.
            </p>
            <Button onClick={resetReport} className="mt-2 rounded-lg bg-[#8b735b] px-6 font-black text-white hover:bg-[#75614e]">
              Submit Another Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="report-form overflow-hidden rounded-xl border border-[#e8ded1] bg-white shadow-[0_4px_18px_rgba(48,40,32,0.06)]">
          <CardContent className="p-0">
            <ReportStep icon={Building2} step="1" title="Select Apartment" description="Choose the apartment listing related to your report." tone="bg-[#f3efea] text-[#8b735b]">
              <select value={reportForm.apartment} onChange={(e) => setReportForm((f) => ({ ...f, apartment: e.target.value }))} className="h-12 w-full rounded-xl border border-[#e8ded1] bg-white px-4 text-base font-semibold text-[#302820] outline-none transition focus:border-[#8b735b] focus:ring-2 focus:ring-[#8b735b]/10">
                <option value="">Select an apartment...</option>
                {publishedApartments.map((apt) => <option key={apt.id} value={apt.id}>{apt.title}</option>)}
              </select>
            </ReportStep>

            <ReportStep icon={MessageCircle} step="2" title="Describe the Problem" description="Please provide as much detail as possible." tone="bg-[#f3efea] text-[#8b735b]">
              <div className="relative">
                <textarea rows={5} maxLength={500} value={reportForm.details} onChange={(e) => setReportForm((f) => ({ ...f, details: e.target.value }))} placeholder="Describe what you experienced in as much detail as possible..." className="min-h-40 w-full resize-none rounded-xl border border-[#e8ded1] bg-white px-4 py-4 text-base font-medium text-[#302820] outline-none transition focus:border-[#8b735b] focus:ring-2 focus:ring-[#8b735b]/10" />
                <span className="absolute bottom-3 right-4 text-xs font-bold text-slate-400">{reportForm.details.length}/500</span>
              </div>
            </ReportStep>

            <ReportStep icon={ImageIcon} step="3" title="Upload Image / Evidence" description="Attach images or documents that can help us understand the issue." note="Optional" tone="bg-[#f3efea] text-[#8b735b]">
              <EvidenceUploader evidenceFiles={reportEvidenceFiles} onEvidenceChange={setReportEvidenceFiles} maxFiles={5} maxFileSize={10} required={false} />
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#e8ded1] bg-[#faf8f5] p-4">
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#8b735b]" />
                <div>
                  <p className="text-sm font-black text-[#302820]">Evidence helps us review your report faster.</p>
                  <p className="mt-1 text-xs font-medium text-[#756a60]">Clear screenshots, photos, or documents are very helpful.</p>
                </div>
              </div>
            </ReportStep>

            <ReportStep icon={Mail} step="4" title="Contact Information" description="We may contact you for more details if needed." tone="bg-[#f3efea] text-[#8b735b]">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input type="text" value={reportForm.contact} onChange={(e) => setReportForm((f) => ({ ...f, contact: e.target.value }))} placeholder={user?.email || "Enter your email address"} className="h-12 w-full rounded-xl border border-[#e8ded1] bg-white pl-12 pr-4 text-base font-semibold text-[#302820] outline-none transition focus:border-[#8b735b] focus:ring-2 focus:ring-[#8b735b]/10" />
              </div>
            </ReportStep>

            <div className="grid gap-4 border-t border-[#e8ded1] bg-[#faf8f5] p-5 lg:grid-cols-[220px_1fr_260px] lg:items-center">
              <Button variant="outline" onClick={resetReport} className="h-12 rounded-lg border-[#e8ded1] bg-white font-black text-[#756a60] hover:bg-[#f3efea] hover:text-[#8b735b]">
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear Form
              </Button>
              <div className="flex items-center justify-center gap-3 text-center text-sm font-medium text-[#756a60]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#8b735b] shadow-sm"><LockKeyhole className="h-4 w-4" /></span>
                <span><strong className="font-black text-[#302820]">Your information is secure.</strong> We only use this information for this report.</span>
              </div>
              <Button onClick={() => void handleReportSubmit()} disabled={isSubmittingReport || !reportForm.apartment || !reportForm.details.trim()} className="h-12 rounded-lg bg-[#8b735b] font-black text-white shadow-sm hover:bg-[#75614e] disabled:cursor-not-allowed disabled:opacity-50">
                <Send className="mr-2 h-4 w-4" />
                {isSubmittingReport ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderSettings = () => <AccountSettings embedded />;

  // ── Section: Help ────────────────────────────────────────────────────────
  const renderHelp = () => (
    <div className="help-page mx-auto max-w-6xl space-y-6">
      <header className="help-hero relative flex min-h-[170px] items-center overflow-hidden rounded-2xl border border-[#e8ded1] bg-gradient-to-r from-[#faf8f5] to-[#fffdfb] p-6 md:px-8">
        <div className="relative z-10 max-w-[58%] max-md:max-w-full">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8ded1] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8b735b] shadow-sm">
            <HelpCircle className="h-4 w-4" />
            Guidance &amp; Support
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#302820] md:text-[34px]">Help</h1>
          <p className="mt-3 text-base font-medium text-[#756a60]">Find answers and guidance for using AptFindr.</p>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-3 hidden w-[43%] items-end text-[#b9a58f] md:flex"><HelpLineArt /></div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Search, title: "Browse apartments", desc: "Search, filter, and compare available places.", action: () => navigate("/browse") },
          { icon: Heart, title: "Review favorites", desc: "Return to apartments you saved earlier.", action: () => navigate("/favorites") },
          { icon: AlertTriangle, title: "Report a problem", desc: "Report inaccurate, suspicious, or unavailable listings.", action: () => setActiveSection("report") },
        ].map(({ icon: Icon, title, desc, action }) => (
          <button
            key={title}
            onClick={action}
            className="help-shortcut rounded-xl border border-[#e8ded1] bg-white p-5 text-left shadow-[0_2px_10px_rgba(48,40,32,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#d7c9b8] hover:shadow-[0_7px_18px_rgba(48,40,32,0.08)]"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-[#e8ded1] bg-[#faf8f5]">
              <Icon className="h-5 w-5 text-[#8b735b]" />
            </div>
            <p className="font-black text-[#302820]">{title}</p>
            <p className="mt-1 text-sm font-medium leading-6 text-[#756a60]">{desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="help-guide-card rounded-xl border-[#e8ded1] bg-white shadow-[0_2px_10px_rgba(48,40,32,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-black text-[#302820]">
              <BookOpen className="h-5 w-5 text-[#8b735b]" />
              Renter Guide
            </CardTitle>
            <CardDescription>Learn how to find and compare apartments in AptFindr.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Search and filters", "Use area, budget, bedrooms, parking, pet-friendly, and furnished filters to narrow listings."],
              ["Favorites", "Tap the heart on an apartment to save it for later comparison."],
              ["Listing details", "Check rent, room availability, amenities, location, photos, and verified listing status."],
              ["Report updates", "Open Notifications to check updates after an administrator reviews your report."],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-lg border border-[#e8ded1] bg-[#faf8f5] p-4">
                <p className="text-base font-bold text-[#302820]">{title}</p>
                <p className="mt-1 text-sm font-medium leading-6 text-[#756a60]">{desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="help-guide-card rounded-xl border-[#e8ded1] bg-white shadow-[0_2px_10px_rgba(48,40,32,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-black text-[#302820]">
              <Shield className="h-5 w-5 text-[#8b735b]" />
              Safety & Support
            </CardTitle>
            <CardDescription>Use listing information carefully and report details that appear inaccurate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Before visiting", "Confirm the exact location, rent inclusions, room availability, and viewing schedule."],
              ["Verified listings", "A verified badge means submitted listing documents were reviewed; it is not a guarantee of ownership or safety."],
              ["Report problems", "Use Report a Problem for inaccurate, suspicious, or unavailable listings."],
              ["Account help", "Use the form below for login, profile, favorites, or general app issues."],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3 rounded-lg border border-[#e8ded1] bg-[#faf8f5] p-4">
                <CheckCircle className="mt-1 h-4 w-4 shrink-0 text-[#8b735b]" />
                <div>
                  <p className="text-base font-bold text-[#302820]">{title}</p>
                  <p className="mt-1 text-sm font-medium leading-6 text-[#756a60]">{desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="help-support-card rounded-xl border-[#e8ded1] bg-white shadow-[0_2px_10px_rgba(48,40,32,0.04)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-black text-[#302820]">
            <MessageCircle className="h-5 w-5 text-[#8b735b]" />
            Contact Support
          </CardTitle>
          <CardDescription>Submitted requests are securely sent to the support team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {supportSubmitted ? (
            <div className="p-5 rounded-2xl bg-green-50 border border-green-200 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-black text-slate-900">Support request received</p>
              <p className="text-sm text-slate-500 font-medium mt-1">Our team will review your concern and contact you using the details provided.</p>
              <Button
                onClick={() => setSupportSubmitted(false)}
                className="mt-4 rounded-lg bg-[#8b735b] font-bold text-white hover:bg-[#75614e]"
              >
                Send Another Request
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#302820]">Topic</Label>
                  <select
                    value={supportForm.topic}
                    onChange={(e) => setSupportForm((f) => ({ ...f, topic: e.target.value }))}
                    className="h-12 w-full rounded-xl border border-[#e8ded1] bg-white px-4 text-base font-semibold text-[#302820] focus:border-[#8b735b] focus:outline-none focus:ring-2 focus:ring-[#8b735b]/10"
                  >
                    <option value="">Choose a topic...</option>
                    <option value="Account or login">Account or login</option>
                    <option value="Search and filters">Search and filters</option>
                    <option value="Favorites">Favorites</option>
                    <option value="Contacting landlord">Contacting landlord</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#302820]">Contact</Label>
                  <Input
                    value={supportForm.contact}
                    onChange={(e) => setSupportForm((f) => ({ ...f, contact: e.target.value }))}
                    placeholder="Email or phone number"
                    className="h-12 rounded-xl border-[#e8ded1] bg-white text-base focus-visible:border-[#8b735b] focus-visible:ring-[#8b735b]/10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-[#302820]">Message</Label>
                  <span className="text-xs text-slate-400 font-medium">{supportForm.message.length}/500</span>
                </div>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={supportForm.message}
                  onChange={(e) => setSupportForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us what happened or what you need help with..."
                  className="w-full resize-none rounded-xl border border-[#e8ded1] bg-white px-4 py-3 text-base font-medium text-[#302820] focus:border-[#8b735b] focus:outline-none focus:ring-2 focus:ring-[#8b735b]/10"
                />
              </div>
              <Button
                onClick={() => void handleSupportSubmit()}
                disabled={isSubmittingSupport}
                className="h-12 w-full rounded-lg bg-[#8b735b] font-bold text-white shadow-sm hover:bg-[#75614e]"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmittingSupport ? "Sending..." : "Send Support Request"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const sectionMap: Record<string, () => ReactElement> = {
    overview:  renderOverview,
    favorites: renderFavorites,
    suggested: renderSuggested,
    popular:   renderPopular,
    notifications: () => <TenantNotifications state={tenantNotifications} />,
    report:    renderReportPremium,
    settings:  renderSettings,
    help:      renderHelp,
  };

  const renderDashboardLoading = () => (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-lg border border-[#F3EFEA] bg-white px-6 py-8 shadow-[0_22px_60px_rgba(15,23,42,0.08)] md:px-9">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#F3EFEA] bg-[#FAF8F5] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#756A60]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading Dashboard
            </div>
            <div className="h-12 w-72 max-w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-5 w-96 max-w-full animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="grid w-full gap-3 md:w-80">
            <div className="h-20 animate-pulse rounded-lg bg-[#FAF8F5]" />
            <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 animate-pulse rounded-lg bg-[#FAF8F5]" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                <div className="h-8 w-20 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-44 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="min-h-64 rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
            <div className="h-14 w-14 animate-pulse rounded-lg bg-slate-100" />
            <div className="mt-6 h-6 w-40 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="mt-8 h-10 w-32 animate-pulse rounded-lg bg-[#FAF8F5]" />
          </div>
        ))}
      </section>
    </div>
  );

  const renderDashboardError = () => (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4">
      <section className="w-full rounded-lg border border-rose-100 bg-white p-8 text-center shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <AlertTriangle className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-black text-slate-950">Dashboard data could not load</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-slate-500">
          {apartmentsError || "We could not load the latest apartment records. Please try again."}
        </p>
        <Button onClick={() => void refreshApartments()} className="mt-6 rounded-lg bg-[#8B735B] px-6 font-black text-white hover:bg-[#756A60]">
          <RotateCcw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </section>
    </div>
  );

  const activeContent = apartmentsError && allApartments.length === 0
    ? renderDashboardError()
    : apartmentsLoading && allApartments.length === 0
      ? renderDashboardLoading()
      : (sectionMap[activeSection] ?? renderOverview)();
  return (
    <div className="tenant-browse app-shell fixed inset-0 z-50 overflow-hidden bg-white">
      <div className="app-shell-frame relative z-10 flex h-full">
        <aside className="app-shell-sidebar hidden lg:flex flex-col w-64 shrink-0 h-full bg-[#07142f] shadow-2xl shadow-slate-900/40">
          {SidebarContent()}
        </aside>

        {sidebarOpen && (
          <div className="app-sidebar-overlay fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside
          className={`app-sidebar-drawer fixed top-0 left-0 h-full z-50 w-64 bg-[#07142f] shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="app-sidebar-close absolute top-4 right-4 h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all z-10"
          >
            <X className="h-4 w-4" />
          </button>
          {SidebarContent()}
        </aside>

        <button
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
          className="app-sidebar-trigger fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-[#8b735b] text-white shadow-md transition hover:bg-[#75604d] lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="app-shell-main flex-1 min-w-0 h-full overflow-y-auto">
          <main className="app-shell-content app-shell-content-mobile-nav px-4 py-6 pt-16 md:px-8 lg:px-10 lg:pt-8">
            {activeContent}
          </main>
        </div>
      </div>
    </div>
  );
}

function ReportStep({
  icon: Icon,
  step,
  title,
  description,
  note,
  tone,
  children,
}: {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
  note?: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <section className="report-step grid gap-5 border-b border-[#e8ded1] p-5 last:border-b-0 lg:grid-cols-[320px_1fr] lg:p-6">
      <div className="flex gap-5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8b735b] text-xs font-black text-white">{step}</span>
            <h3 className="text-base font-black text-[#302820]">{title}</h3>
            {note && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">{note}</span>}
          </div>
          <p className="text-sm font-medium leading-6 text-[#756a60]">{description}</p>
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
