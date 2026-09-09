import { TenantDashboardSidebar } from "@/app/tenant/components/dashboard/TenantDashboardSidebar";
import { HelpSection } from "@/app/tenant/components/dashboard/sections/HelpSection";
import { ReportSection } from "@/app/tenant/components/dashboard/sections/ReportSection";
import { PopularSection } from "@/app/tenant/components/dashboard/sections/PopularSection";
import { SuggestedSection } from "@/app/tenant/components/dashboard/sections/SuggestedSection";
import { FavoritesSection } from "@/app/tenant/components/dashboard/sections/FavoritesSection";
import { OverviewSection } from "@/app/tenant/components/dashboard/sections/OverviewSection";
import type { EvidenceFile } from "@/app/shared/components/common/EvidenceUploader";
import { Button } from "@/app/shared/components/ui/button";
import { useApartmentsContext } from "@/app/shared/contexts/ApartmentsContext";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import { isTenantRole } from "@/app/shared/services/authService";
import { getTimeBasedGreeting } from "@/app/tenant/utils/tenantGreeting";
import { TenantNotifications } from "@/app/tenant/components/notifications/TenantNotifications";
import { useTenantNotifications } from "@/app/tenant/hooks/useTenantNotifications";
import { fetchApartmentRatings, subscribeToApartmentRatings, summarizeApartmentRatings, type ApartmentRatingRow } from "@/app/shared/services/apartmentRatingsService";
import { useFavorites } from "@/app/shared/hooks/useFavorites";
import { Settings as AccountSettings } from "@/app/shared/pages/settings/Settings";
import { createReport, createSupportTicket, defaultTenantPreferences, fetchApartmentViews, fetchFavorites as fetchDashboardFavorites, fetchTenantPreferences, type DashboardApartmentViewRow, type DashboardFavoriteRow, type TenantPreferenceSettings } from "@/app/shared/services/dashboardSupabaseService";
import { uploadReportEvidence } from "@/app/shared/services/reportEvidenceService";
import { getAvailableRoomCount, isTenantVisibleApartment } from "@/app/shared/utils/listingVisibility";
import { hasMeaningfulPreferences, rankApartments, type TenantPreferences } from "@/app/shared/utils/rankingEngine";
import { AlertTriangle, Menu, Loader2, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const DASHBOARD_SECTIONS = ["overview", "favorites", "suggested", "popular", "notifications", "settings", "report", "help"];

export function TenantDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites: favoriteIds, toggleFavorite, refreshFavorites } = useFavorites();
  const tenantNotifications = useTenantNotifications();
  const [activeSection, setActiveSection] = useState("suggested");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [favoriteFilter, setFavoriteFilter] = useState<"all" | "available">("all");
  const [favoriteSort, setFavoriteSort] = useState<"newest" | "price-low" | "price-high" | "name">("newest");
  const [favoriteView, setFavoriteView] = useState<"grid" | "list">("grid");
  const [removingFavoriteId, setRemovingFavoriteId] = useState<string | null>(null);

  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportForm, setReportForm] = useState({
    apartment: "",
    details: "",
    contact: user?.email || "",
  });
  const [reportEvidenceFiles, setReportEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportForm, setSupportForm] = useState({
    topic: "",
    message: "",
    contact: user?.email || "",
  });

  const [tenantPreferences, setTenantPreferences] = useState<TenantPreferenceSettings>(defaultTenantPreferences);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
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
    setTenantPreferences(preferences);
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

    if (!user?.id || !isTenantRole(user.role)) {
      setPreferencesLoading(false);
      return;
    }

    let mounted = true;
    const tenantId = user.id;

    void fetchTenantPreferences(tenantId)
      .then((preferences) => {
        if (!mounted) return;
        applyTenantPreferences(preferences ?? defaultTenantPreferences);
        setPreferencesLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setPreferencesLoading(false);
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
    const parsedBudget = Number(tenantPreferences.maxBudget);

    return {
      maxBudget: tenantPreferences.saveBudgetPreferences && Number.isFinite(parsedBudget) && parsedBudget > 0 ? parsedBudget : undefined,
      preferredArea: tenantPreferences.recommendationLocation && tenantPreferences.preferredArea.trim() ? tenantPreferences.preferredArea.trim() : undefined,
      minBedrooms: tenantPreferences.minBedrooms,
      petFriendly: tenantPreferences.petFriendly,
      parking: tenantPreferences.parking,
      furnished: tenantPreferences.furnished,
      wifi: tenantPreferences.wifi,
      ac: tenantPreferences.ac,
      laundryArea: tenantPreferences.laundryArea,
      recommendationLocation: tenantPreferences.recommendationLocation,
      saveBudgetPreferences: tenantPreferences.saveBudgetPreferences,
    };
  }, [tenantPreferences]);
  const hasPersonalizationPreferences = hasMeaningfulPreferences(tenantRankingPreferences);

  // Personalized recommendations based on saved tenant preferences
  const suggestedApartments = useMemo(() => {
    if (isTenantRole(user?.role) && hasPersonalizationPreferences) {
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
      return rankApartments(publishedApartments, tenantRankingPreferences, {
        apartmentViewCounts,
        apartmentFavoriteCounts,
        apartmentRatingStats: ratingSummary.byApartment,
        platformAverageRating: ratingSummary.platformAverage,
      }).slice(0, 6);
    }
    return [];
  }, [dashboardFavoriteRows, dashboardRatingRows, dashboardViewRows, hasPersonalizationPreferences, publishedApartments, tenantRankingPreferences, user?.role]);

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

  const visibleFavoriteApartments = useMemo(() => {
    return [...favoriteApartments]
      .filter((apartment) => {
        if (favoriteFilter === "available") return isApartmentAvailable(apartment);
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
  const dashboardSubtitle = "Find verified apartments that fit your needs.";

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

    if (reportEvidenceFiles.length === 0) {
      toast.error("Please upload at least one image or evidence file.");
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
        reporter_role: "tenant",
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

  const renderSettings = () => <AccountSettings embedded />;

  const sectionMap: Record<string, () => ReactElement> = {
    overview:  () => (
      <OverviewSection
        tenantGreeting={tenantGreeting}
        dashboardSubtitle={dashboardSubtitle}
        favoriteIds={favoriteIds}
        availableApartments={availableApartments}
        availableRoomsCount={availableRoomsCount}
        hasPersonalizationPreferences={hasPersonalizationPreferences}
        suggestedApartments={suggestedApartments}
        popularApartments={popularApartments}
        setActiveSection={setActiveSection}
        navigate={navigate}
      />
    ),
    favorites: () => (
      <FavoritesSection
        favoriteApartments={favoriteApartments}
        visibleFavoriteApartments={visibleFavoriteApartments}
        favoriteFilter={favoriteFilter}
        setFavoriteFilter={setFavoriteFilter}
        favoriteSort={favoriteSort}
        setFavoriteSort={setFavoriteSort}
        favoriteView={favoriteView}
        setFavoriteView={setFavoriteView}
        removingFavoriteId={removingFavoriteId}
        removeFavorite={removeFavorite}
        ratingSummary={ratingSummary}
        ratingsLoading={ratingsLoading}
        navigate={navigate}
      />
    ),
    suggested: () => (
      <SuggestedSection
        hasPersonalizationPreferences={hasPersonalizationPreferences}
        preferencesLoading={preferencesLoading}
        suggestedApartments={suggestedApartments}
        ratingSummary={ratingSummary}
        ratingsLoading={ratingsLoading}
        navigate={navigate}
      />
    ),
    popular:   () => (
      <PopularSection
        popularApartments={popularApartments}
        ratingSummary={ratingSummary}
        ratingsLoading={ratingsLoading}
        navigate={navigate}
      />
    ),
    notifications: () => <TenantNotifications state={tenantNotifications} />,
    report:    () => (
      <ReportSection
        reportSubmitted={reportSubmitted}
        resetReport={resetReport}
        reportForm={reportForm}
        setReportForm={setReportForm}
        publishedApartments={publishedApartments}
        reportEvidenceFiles={reportEvidenceFiles}
        setReportEvidenceFiles={setReportEvidenceFiles}
        user={user}
        handleReportSubmit={handleReportSubmit}
        isSubmittingReport={isSubmittingReport}
      />
    ),
    settings:  renderSettings,
    help:      () => (
      <HelpSection
        navigate={navigate}
        setActiveSection={setActiveSection}
        supportSubmitted={supportSubmitted}
        setSupportSubmitted={setSupportSubmitted}
        supportForm={supportForm}
        setSupportForm={setSupportForm}
        handleSupportSubmit={handleSupportSubmit}
        isSubmittingSupport={isSubmittingSupport}
      />
    ),
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
      : (sectionMap[activeSection] ?? sectionMap.overview)();
  return (
    <div className="tenant-browse app-shell fixed inset-0 z-50 overflow-hidden bg-white">
      <div className="app-shell-frame relative z-10 flex h-full">
        <aside className="app-shell-sidebar hidden lg:flex flex-col w-64 shrink-0 h-full bg-[#07142f] shadow-2xl shadow-slate-900/40">
          <TenantDashboardSidebar
            user={user}
            displayName={displayName}
            favoriteIds={favoriteIds}
            tenantNotifications={tenantNotifications}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            setSidebarOpen={setSidebarOpen}
            handleLogout={handleLogout}
          />
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
          <TenantDashboardSidebar
            user={user}
            displayName={displayName}
            favoriteIds={favoriteIds}
            tenantNotifications={tenantNotifications}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            setSidebarOpen={setSidebarOpen}
            handleLogout={handleLogout}
          />
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
