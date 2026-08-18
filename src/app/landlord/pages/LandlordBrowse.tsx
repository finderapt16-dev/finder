import {
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Eye,
  HelpCircle,
  Home,
  LayoutGrid,
  List,
  LogOut,
  MapPin,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings,
  TrendingUp,
  X
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { LogoutConfirmation } from "@/app/shared/components/common/LogoutConfirmation";
import { ImageWithFallback } from "@/app/shared/components/figma/ImageWithFallback";

import { VerifiedBadge } from "@/app/shared/components/common/VerifiedBadge";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { useApartmentsContext } from "@/app/shared/contexts/ApartmentsContext";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import type { Apartment } from "@/app/shared/data/apartments";
import { getApartmentImageUrl } from "@/app/shared/utils/images";
import {
  fetchApartmentViews,
  fetchFavorites,
  fetchNotifications,
  type DashboardApartmentViewRow,
  type DashboardFavoriteRow,
} from "@/app/shared/services/dashboardSupabaseService";
import { formatApartmentLocation } from "@/app/shared/utils/apartmentLocation";
import {
  getAvailableRoomCount,
  getLowestAvailableRoomPrice,
  isTenantVisibleApartment,
} from "@/app/shared/utils/listingVisibility";

type SortOption = "newest" | "most_viewed" | "most_favorited" | "price_low" | "price_high";

const getImageUrl = (apartment: Apartment) => getApartmentImageUrl(apartment);

export function LandlordBrowse() {
  const navigate = useNavigate();
  const { user, users, logout } = useAuth();
  const {
    apartments: allApartments,
    isLoading: apartmentsLoading,
    isRefreshing: apartmentsRefreshing,
    error: apartmentsError,
    refreshApartments,
  } = useApartmentsContext();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [viewRows, setViewRows] = useState<DashboardApartmentViewRow[]>([]);
  const [favoriteRows, setFavoriteRows] = useState<DashboardFavoriteRow[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [marketDataLoading, setMarketDataLoading] = useState(true);

  const [searchDraft, setSearchDraft] = useState("");
  const [locationDraft, setLocationDraft] = useState("all");
  const [minPriceDraft, setMinPriceDraft] = useState("");
  const [maxPriceDraft, setMaxPriceDraft] = useState("");
  const [sortDraft, setSortDraft] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, Number.MAX_SAFE_INTEGER]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  useEffect(() => {
    let active = true;

    const loadMarketData = async () => {
      setMarketDataLoading(true);
      try {
        const [views, favorites, notifications] = await Promise.all([
          fetchApartmentViews(),
          fetchFavorites(),
          user?.id ? fetchNotifications(user.id) : Promise.resolve([]),
        ]);
        if (!active) return;
        setViewRows(views);
        setFavoriteRows(favorites);
        setUnreadNotifications(notifications.filter((notification) => !(notification.read ?? notification.is_read)).length);
      } catch (error) {
        console.error("Unable to load landlord market metrics:", error);
        if (active) {
          setViewRows([]);
          setFavoriteRows([]);
          setUnreadNotifications(0);
        }
      } finally {
        if (active) setMarketDataLoading(false);
      }
    };

    void loadMarketData();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const publishedApartments = useMemo(
    () => allApartments.filter(isTenantVisibleApartment),
    [allApartments],
  );

  const getViewCount = (apartmentId: string) =>
    viewRows
      .filter((view) => (view.apartment_id ?? view.apartmentId) === apartmentId)
      .reduce((total, view) => total + Math.max(0, Number(view.view_count) || 0), 0);

  const getFavoriteCount = (apartmentId: string) =>
    favoriteRows.filter((favorite) => (favorite.apartment_id ?? favorite.apartmentId) === apartmentId).length;

  const viewLabel = (count: number) => `${count.toLocaleString()} ${count === 1 ? "view" : "views"}`;

  const marketInsights = useMemo(() => {
    const totalListings = publishedApartments.length;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentlyAddedCount = publishedApartments.filter((apartment) => {
      const timestamp = new Date(apartment.createdAt ?? 0).getTime();
      return !Number.isNaN(timestamp) && timestamp >= sevenDaysAgo;
    }).length;
    const topPerformers = [...publishedApartments]
      .map((apartment) => ({ apartment, views: getViewCount(apartment.id), saves: getFavoriteCount(apartment.id) }))
      .filter((item) => item.views > 0 || item.saves > 0)
      .sort((left, right) =>
        right.views - left.views ||
        right.saves - left.saves ||
        new Date(right.apartment.updatedAt ?? right.apartment.createdAt ?? 0).getTime() - new Date(left.apartment.updatedAt ?? left.apartment.createdAt ?? 0).getTime()
      )
      .slice(0, 3)
      .map((item) => item.apartment);

    return { totalListings, recentlyAddedCount, topPerformers };
  }, [publishedApartments, viewRows, favoriteRows]);

  const locations = useMemo(
    () => Array.from(new Set(publishedApartments.map((apartment) => apartment.city).filter(Boolean))).sort(),
    [publishedApartments],
  );

  const filteredApartments = useMemo(() => {
    const hasPriceFilter = priceRange[0] > 0 || priceRange[1] < Number.MAX_SAFE_INTEGER;

    const filtered = publishedApartments.filter((apartment) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query || `${apartment.title} ${apartment.address} ${apartment.city} ${apartment.description}`.toLowerCase().includes(query);
      const matchesLocation = locationFilter === "all" || apartment.city === locationFilter;
      const price = getLowestAvailableRoomPrice(apartment);
      const matchesPrice = !hasPriceFilter || (price !== null && price >= priceRange[0] && price <= priceRange[1]);
      return matchesSearch && matchesLocation && matchesPrice;
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === "most_viewed") return getViewCount(right.id) - getViewCount(left.id);
      if (sortBy === "most_favorited") return getFavoriteCount(right.id) - getFavoriteCount(left.id);
      if (sortBy === "price_low") return (getLowestAvailableRoomPrice(left) ?? Number.MAX_SAFE_INTEGER) - (getLowestAvailableRoomPrice(right) ?? Number.MAX_SAFE_INTEGER);
      if (sortBy === "price_high") return (getLowestAvailableRoomPrice(right) ?? -1) - (getLowestAvailableRoomPrice(left) ?? -1);
      return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
    });
  }, [publishedApartments, searchQuery, locationFilter, priceRange, sortBy, viewRows, favoriteRows]);

  const applyFilters = () => {
    const minimum = minPriceDraft.trim() ? Math.max(0, Number(minPriceDraft)) : 0;
    const maximum = maxPriceDraft.trim() ? Math.max(0, Number(maxPriceDraft)) : Number.MAX_SAFE_INTEGER;
    setSearchQuery(searchDraft.trim());
    setLocationFilter(locationDraft);
    setPriceRange([Math.min(minimum, maximum), Math.max(minimum, maximum)]);
    setSortBy(sortDraft);
  };

  const clearFilters = () => {
    setSearchDraft("");
    setLocationDraft("all");
    setMinPriceDraft("");
    setMaxPriceDraft("");
    setSortDraft("newest");
    setSearchQuery("");
    setLocationFilter("all");
    setPriceRange([0, Number.MAX_SAFE_INTEGER]);
    setSortBy("newest");
  };

  const SidebarContent = () => (
    <div className="app-sidebar flex h-full flex-col overflow-y-auto">
      <div className="app-sidebar-brand px-5 pb-5 pt-6"><div className="flex items-center gap-2.5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E8DED1] bg-[#FAF8F5] text-[#8B735B]"><Home className="h-6 w-6" /></span><div><span className="block text-xl font-bold tracking-tight text-[#302820]">AptFindr</span><p className="text-xs font-medium text-[#756A60]">Landlord Portal</p></div></div></div>
      <div className="px-4 pb-5"><div className="app-sidebar-profile flex items-center gap-3 rounded-lg border border-[#E8DED1] bg-[#FAF8F5] px-3 py-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#8B735B] text-sm font-bold text-white">{user?.avatar ? <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" /> : user?.name?.[0]?.toUpperCase() || ""}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#302820]">{user?.name || "Name unavailable"}</p><p className="truncate text-xs text-[#756A60]">{user?.email || ""}</p></div></div></div>
      <nav className="space-y-1 px-3 py-3"><p className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756A60]">Main<span className="h-px w-5 bg-[#8B735B]/45" /></p>{[{ label: "My Properties", icon: LayoutGrid, path: "/dashboard?section=overview" }, { label: "Activity", icon: TrendingUp, path: "/dashboard?section=activity" }, { label: "Notifications", icon: Bell, path: "/dashboard?section=notifications" }].map(({ label, icon: Icon, path }) => <button key={label} onClick={() => navigate(path)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#302820] transition-all hover:bg-[#FAF8F5] hover:text-[#8B735B]"><Icon className="h-4 w-4" />{label}{label === "Notifications" && unreadNotifications > 0 && <span className="app-sidebar-badge ml-auto flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{unreadNotifications}</span>}</button>)}</nav>
      <nav className="space-y-1 border-t border-[#E8DED1] px-3 py-4"><p className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756A60]">Market<span className="h-px w-5 bg-[#8B735B]/45" /></p><button type="button" aria-current="page" className="app-sidebar-nav-item relative flex w-full items-center gap-3 rounded-lg bg-[#F3EFEA] px-3 py-3 text-sm font-semibold text-[#8B735B] transition-all"><TrendingUp className="h-4 w-4 shrink-0" />Market Overview</button></nav>
      <nav className="space-y-1 border-t border-[#E8DED1] px-3 py-4"><p className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756A60]">Manage<span className="h-px w-5 bg-[#8B735B]/45" /></p><button onClick={() => navigate("/add-apartment")} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#302820] transition-all hover:bg-[#FAF8F5] hover:text-[#8B735B]"><Plus className="h-4 w-4" />Add Property</button></nav>
      <nav className="space-y-1 border-t border-[#E8DED1] px-3 py-4"><p className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756A60]">Account<span className="h-px w-5 bg-[#8B735B]/45" /></p><button onClick={() => navigate("/dashboard?section=settings")} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#302820] transition-all hover:bg-[#FAF8F5] hover:text-[#8B735B]"><Settings className="h-4 w-4" />Settings</button><button onClick={() => navigate("/dashboard?section=help")} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#302820] transition-all hover:bg-[#FAF8F5] hover:text-[#8B735B]"><HelpCircle className="h-4 w-4" />Help &amp; Support</button></nav>
      <div className="mt-auto border-t border-[#E8DED1] px-4 py-4"><LogoutConfirmation onConfirm={() => { logout?.(); navigate("/"); }}><button className="app-sidebar-logout flex w-full items-center gap-3 rounded-lg border border-[#E8DED1] bg-white px-3 py-3 text-sm font-semibold text-[#756A60] transition hover:border-red-100 hover:bg-red-50 hover:text-red-700"><LogOut className="h-4 w-4" />Log Out</button></LogoutConfirmation></div>
    </div>
  );

  const PropertyCard = ({ apartment, compact = false }: { apartment: Apartment; compact?: boolean }) => {
    const imageUrl = getApartmentImageUrl(apartment);
    const availableRooms = getAvailableRoomCount(apartment);
    const viewCount = getViewCount(apartment.id);
    const favoriteCount = getFavoriteCount(apartment.id);
    const landlord = users.find((entry) => entry.id === apartment.landlordId);
    const location = formatApartmentLocation(apartment, "Address unavailable");

    return (
      <motion.article whileHover={{ y: -3 }} onClick={() => navigate(`/apartment/${apartment.id}`, { state: { returnTo: "/browse", backLabel: "Back to Market Overview" } })} className="group cursor-pointer overflow-hidden rounded-xl border border-[#E8DED1] bg-white shadow-sm transition-shadow hover:shadow-lg">
        <div className={`relative flex items-center justify-center overflow-hidden bg-[#FAF8F5] ${compact ? "aspect-[16/8]" : "aspect-[4/3]"}`}>{imageUrl ? <ImageWithFallback src={imageUrl} alt={apartment.title || "Property"} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <Building2 className="h-10 w-10 text-[#C9B8A5]" />}<Badge className="absolute left-3 top-3 rounded-md bg-[#8B735B] text-white"><Eye className="mr-1 h-3 w-3" />{viewLabel(viewCount)}</Badge></div>
        <div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-lg font-black text-[#302820]">{apartment.title || "Untitled property"}</h3><p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-[#756A60]"><MapPin className="h-3.5 w-3.5 shrink-0 text-[#8B735B]" />{location}</p></div><p className="shrink-0 text-xs font-black text-[#8B735B]">View room prices</p></div>{(apartment.landlordVerified ?? landlord?.isVerified) === true && <VerifiedBadge label="Verified Landlord" className="mt-3" />}<div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-lg bg-emerald-50 p-2.5"><strong className="block text-sm text-emerald-700">{availableRooms}</strong><span className="text-[10px] font-semibold text-[#756A60]">Available rooms</span></div><div className="rounded-lg bg-[#FAF8F5] p-2.5"><strong className="block text-sm text-[#8B735B]">{viewCount}</strong><span className="text-[10px] font-semibold text-[#756A60]">{viewCount === 1 ? "View" : "Views"}</span></div><div className="rounded-lg bg-[#FAF8F5] p-2.5"><strong className="block text-sm text-[#8B735B]">{favoriteCount}</strong><span className="text-[10px] font-semibold text-[#756A60]">Saved</span></div></div><Button onClick={(event) => { event.stopPropagation(); navigate(`/apartment/${apartment.id}`, { state: { returnTo: "/browse", backLabel: "Back to Market Overview" } }); }} className="mt-4 h-10 w-full rounded-md bg-[#8B735B] font-bold text-white hover:bg-[#756A60]">View Details<ChevronRight className="ml-2 h-4 w-4" /></Button></div>
      </motion.article>
    );
  };

  const isLoading = (apartmentsLoading || marketDataLoading) && allApartments.length === 0;
  const isRefreshing = apartmentsRefreshing || (marketDataLoading && allApartments.length > 0);
  const summaryCards = [
    { label: "Available Apartments", value: marketInsights.totalListings.toLocaleString(), detail: "Currently available to tenants", icon: Home, tone: "bg-[#FAF8F5] text-[#8B735B]" },
    { label: "Recently Added", value: marketInsights.recentlyAddedCount.toLocaleString(), detail: "Added in the last 7 days", icon: CalendarDays, tone: "bg-[#FAF8F5] text-[#8B735B]" },
  ];

  return (
    <div className="app-shell landlord-shell landlord-market fixed inset-0 z-50 overflow-hidden bg-[#FCFAF7]">
      <div className="app-shell-frame flex h-full">
        <aside className="app-shell-sidebar hidden h-full w-60 shrink-0 flex-col border-r border-[#E8DED1] bg-white lg:flex">{SidebarContent()}</aside>
        {sidebarOpen && <div className="app-sidebar-overlay fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={`app-sidebar-drawer fixed left-0 top-0 z-50 h-full w-64 border-r border-[#E8DED1] bg-white shadow-2xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}><button title="Close navigation" onClick={() => setSidebarOpen(false)} className="app-sidebar-close absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md bg-[#FAF8F5] text-[#756A60]"><X className="h-4 w-4" /></button>{SidebarContent()}</aside>
        <button title="Open navigation" onClick={() => setSidebarOpen(true)} className="app-sidebar-trigger fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B735B] text-white shadow-lg hover:bg-[#756A60] lg:hidden"><Menu className="h-5 w-5" /></button>

        <main className="app-shell-main min-w-0 flex-1 overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="app-shell-content app-shell-content-mobile-nav mx-auto max-w-[1500px] space-y-6 pb-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-3xl font-black text-[#302820]">Market Overview</h1><p className="mt-1 text-sm font-medium text-[#756A60]">Explore currently available apartment listings in La Paz, Iloilo City.</p></div></header>

            <section className="grid gap-3 sm:grid-cols-2">{summaryCards.map(({ label, value, detail, icon: Icon, tone }) => <motion.div key={label} whileHover={{ y: -3 }} className="flex min-h-32 items-center gap-3 rounded-xl border border-[#E8DED1] bg-white p-4 shadow-sm transition-shadow hover:shadow-lg"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="text-xs font-bold text-[#756A60]">{label}</span><strong className="mt-1 block truncate text-xl text-[#302820] sm:text-2xl">{value}</strong><span className="text-[11px] font-medium text-[#8A8179]">{detail}</span></span></motion.div>)}</section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-orange-600" /><h2 className="text-lg font-black text-slate-950">Top Performing Properties</h2></div><p className="mt-1 text-xs font-medium text-slate-500">Ranked using real views and favorites.</p></div><button onClick={() => document.getElementById("market-properties")?.scrollIntoView({ behavior: "smooth" })} className="flex items-center gap-2 text-xs font-black text-orange-600">View All Properties<ArrowRight className="h-4 w-4" /></button></div>{isLoading ? <div className="flex min-h-64 items-center justify-center"><TrendingUp className="h-7 w-7 animate-pulse text-orange-500" /></div> : marketInsights.topPerformers.length > 0 ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{marketInsights.topPerformers.map((apartment) => <PropertyCard key={apartment.id} apartment={apartment} compact />)}</div> : <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><TrendingUp className="mb-3 h-8 w-8 text-slate-300" /><h3 className="font-black text-slate-800">No performance data yet</h3><p className="mt-1 text-sm font-medium text-slate-500">Properties will appear here after views or favorites are recorded.</p></div>}</section>

            <section id="market-properties" className="scroll-mt-6 rounded-lg border border-orange-100 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center gap-2"><Search className="h-5 w-5 text-orange-600" /><div><h2 className="font-black text-slate-950">Search Properties</h2><p className="text-xs font-medium text-slate-500">Apply filters to the live market inventory.</p></div></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><label className="space-y-1.5 xl:col-span-2"><span className="text-xs font-bold text-slate-600">Search</span><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Name, address, or keyword" className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></div></label><label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">Location</span><select value={locationDraft} onChange={(event) => setLocationDraft(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"><option value="all">All La Paz locations</option>{locations.map((location) => <option key={location} value={location}>{location}</option>)}</select></label><label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">Price Range (₱)</span><div className="flex gap-2"><input type="number" min="0" value={minPriceDraft} onChange={(event) => setMinPriceDraft(event.target.value)} placeholder="Min" className="h-10 min-w-0 w-full rounded-md border border-slate-200 px-3 text-sm outline-none" /><input type="number" min="0" value={maxPriceDraft} onChange={(event) => setMaxPriceDraft(event.target.value)} placeholder="Max" className="h-10 min-w-0 w-full rounded-md border border-slate-200 px-3 text-sm outline-none" /></div></label><label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">Sort By</span><select value={sortDraft} onChange={(event) => setSortDraft(event.target.value as SortOption)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"><option value="newest">Newest First</option><option value="most_viewed">Most Viewed</option><option value="most_favorited">Most Favorited</option><option value="price_low">Price: Low to High</option><option value="price_high">Price: High to Low</option></select></label></div><div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={clearFilters} className="rounded-md font-bold">Clear</Button><Button onClick={applyFilters} className="rounded-md bg-orange-500 px-7 font-bold text-white hover:bg-orange-600"><CheckCircle2 className="mr-2 h-4 w-4" />Apply Filters</Button></div></section>

            {isRefreshing && <div className="flex items-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-black text-orange-700"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Refreshing market data...</div>}
            <section><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">Available Properties</h2><p className="text-xs font-medium text-slate-500">{filteredApartments.length} matching tenant-visible {filteredApartments.length === 1 ? "listing" : "listings"}</p></div><div className="flex rounded-lg border border-slate-200 bg-white p-1"><button title="Grid view" onClick={() => setViewMode("grid")} className={`flex h-8 w-9 items-center justify-center rounded-md ${viewMode === "grid" ? "bg-orange-500 text-white" : "text-slate-500"}`}><LayoutGrid className="h-4 w-4" /></button><button title="Table view" onClick={() => setViewMode("table")} className={`flex h-8 w-9 items-center justify-center rounded-md ${viewMode === "table" ? "bg-orange-500 text-white" : "text-slate-500"}`}><List className="h-4 w-4" /></button></div></div>{isLoading ? <div className="flex min-h-96 items-center justify-center rounded-lg border border-slate-200 bg-white"><Home className="h-8 w-8 animate-pulse text-orange-500" /></div> : apartmentsError && allApartments.length === 0 ? <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-red-200 bg-white p-8 text-center"><Home className="mb-3 h-9 w-9 text-red-300" /><h3 className="font-black text-slate-800">Market data could not be loaded</h3><p className="mt-1 text-sm text-slate-500">{apartmentsError}</p><Button variant="outline" onClick={() => void refreshApartments()} className="mt-4 rounded-md font-bold">Try Again</Button></div> : filteredApartments.length === 0 ? <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center"><Search className="mb-3 h-9 w-9 text-slate-300" /><h3 className="font-black text-slate-800">No market properties found</h3><p className="mt-1 text-sm font-medium text-slate-500">Adjust the filters to broaden the results.</p><Button variant="outline" onClick={clearFilters} className="mt-4 rounded-md font-bold">Clear Filters</Button></div> : viewMode === "grid" ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredApartments.map((apartment) => <PropertyCard key={apartment.id} apartment={apartment} />)}</div> : <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[820px]"><thead className="bg-slate-50"><tr>{["Property", "Location", "Lowest Available Room Rent", "Available Rooms", "Views", "Saved", "Action"].map((label) => <th key={label} className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-500">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredApartments.map((apartment) => { const imageUrl = getImageUrl(apartment); const roomPrice = getLowestAvailableRoomPrice(apartment); return <tr key={apartment.id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-12 w-14 items-center justify-center overflow-hidden rounded-md bg-slate-100">{imageUrl ? <ImageWithFallback src={imageUrl} alt={apartment.title || "Property"} className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5 text-slate-300" />}</span><strong className="max-w-48 truncate text-sm text-slate-900">{apartment.title || "Untitled property"}</strong></div></td><td className="px-4 py-3 text-xs font-medium text-slate-500">{formatApartmentLocation(apartment, "Unavailable")}</td><td className="px-4 py-3 text-sm font-black text-orange-600">{roomPrice === null ? "Unavailable" : `₱${roomPrice.toLocaleString("en-PH")}`}</td><td className="px-4 py-3 text-sm font-bold text-emerald-700">{getAvailableRoomCount(apartment)}</td><td className="px-4 py-3 text-sm font-bold text-slate-700">{getViewCount(apartment.id)}</td><td className="px-4 py-3 text-sm font-bold text-slate-700">{getFavoriteCount(apartment.id)}</td><td className="px-4 py-3"><Button size="sm" onClick={() => navigate(`/apartment/${apartment.id}`, { state: { returnTo: "/browse", backLabel: "Back to Market Overview" } })} className="rounded-md bg-orange-500 text-xs font-bold text-white hover:bg-orange-600">View Details</Button></td></tr>; })}</tbody></table></div>}</section>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
