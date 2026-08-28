import {
  Bath,
  Bed,
  Bookmark,
  Building2,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  Flame,
  Grid2X2,
  Heart,
  Home as HomeIcon,
  LocateFixed,
  Map,
  MapPin,
  PawPrint,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sofa,
  Sparkles,
  Square,
  Star,
  Tag,
  TrendingUp,
  TriangleAlert
} from "lucide-react";
import { ImageWithFallback } from "@/app/shared/components/figma/ImageWithFallback";
import { useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { VerifiedBadge } from "@/app/shared/components/common/VerifiedBadge";
import { ApartmentRatingSummary } from "@/app/shared/components/common/ApartmentRatingSummary";
import { MapView } from "@/app/shared/components/features/map/MapView";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/shared/components/ui/dialog";
import { Label } from "@/app/shared/components/ui/label";
import { Switch } from "@/app/shared/components/ui/switch";
import { useApartmentsContext } from "@/app/shared/contexts/ApartmentsContext";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import { getTenantType, isTenantRole } from "@/app/shared/services/authService";
import { getTimeBasedGreeting } from "@/app/tenant/utils/tenantGreeting";
import { fetchApartmentRatings, subscribeToApartmentRatings, summarizeApartmentRatings, type ApartmentRatingRow } from "@/app/shared/services/apartmentRatingsService";
import type { Apartment } from "@/app/shared/data/apartments";
import { useFavorites } from "@/app/shared/hooks/useFavorites";
import {
  defaultTenantPreferences,
  fetchApartmentViews,
  fetchFavorites as fetchDashboardFavorites,
  fetchTenantPreferences,
  saveTenantPreferences,
  type DashboardApartmentViewRow,
  type DashboardFavoriteRow,
  type TenantPreferenceSettings,
  type TenantPreferenceSortOption,
} from "@/app/shared/services/dashboardSupabaseService";
import { formatApartmentLocation } from "@/app/shared/utils/apartmentLocation";
import { getApartmentImageUrl, getImageUrl } from "@/app/shared/utils/images";
import {
  getAvailableRoomCount,
  isTenantVisibleApartment,
} from "@/app/shared/utils/listingVisibility";
import {
  DEFAULT_LA_PAZ_MAP_CENTER,
  hasValidApartmentCoordinates,
} from "@/app/shared/utils/mapCoordinates";
import { rankApartments, type TenantPreferences } from "@/app/shared/utils/rankingEngine";
import { geocodeLocationWithinLaPaz, GeocodingError, type GeocodedLocation } from "@/app/shared/services/geocodingService";
import { findNearbyApartments, formatDistance, parseNearbySearchIntent } from "@/app/shared/utils/geospatialSearch";
import { toast } from "sonner";
import { MarketOverview } from "@/app/landlord/pages/MarketOverview";
import { TenantMobileNavigation } from "@/app/tenant/components/TenantMobileNavigation";
import { TenantSidebar } from "@/app/tenant/components/TenantSidebar";
import { useTenantNotifications } from "@/app/tenant/hooks/useTenantNotifications";

type SortOption = TenantPreferenceSortOption;
type BrowseApartment = Apartment & { distanceMeters?: number };

const DEFAULT_PRICE_RANGE: [number, number] = [1000, 6000];

const hasMeaningfulBudgetPreference = (preferences: TenantPreferenceSettings) =>
  preferences.saveBudgetPreferences === true && Number(preferences.maxBudget) !== DEFAULT_PRICE_RANGE[1];

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Unavailable",
  maintenance: "Maintenance",
};

const STATUS_CLASS: Record<string, string> = {
  available: "bg-emerald-600 text-white",
  occupied: "bg-rose-600 text-white",
  reserved: "bg-amber-500 text-white",
  maintenance: "bg-slate-600 text-white",
};

const parseMoneyValue = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
};

const getAvailableApartmentPrice = (apartment: Apartment): number | null => {
  const roomPrices = (apartment.rooms ?? [])
    .filter((room) => {
      const status = room.status ?? (room.isOccupied ? "occupied" : "available");
      return status === "available" && room.isOccupied !== true;
    })
    .map((room) => parseMoneyValue(room.price))
    .filter((price): price is number => price !== null);

  if (roomPrices.length > 0) return Math.min(...roomPrices);

  return parseMoneyValue(apartment.price);
};

const getApartmentPublishedTime = (apartment: Apartment): number => {
  const candidates = [apartment.publishedAt, apartment.updatedAt, apartment.createdAt, apartment.availableDate];

  for (const value of candidates) {
    if (!value) continue;
    const timestamp = new Date(value).getTime();
    if (!Number.isNaN(timestamp)) return timestamp;
  }

  return Number.NEGATIVE_INFINITY;
};

const compareOptionalNumber = (left: number | null, right: number | null, direction: "asc" | "desc"): number => {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === "asc" ? left - right : right - left;
};

function ApartmentLineArt() {
  return (
    <svg aria-hidden="true" className="tenant-architecture" viewBox="0 0 520 210" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className="tenant-architecture-lines" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 194H510M38 194v-29l18-17 18 17v29m-27 0v-20h18v20M104 194V87h58v107M96 87l38-47 37 47M119 194v-82h29v82M126 58V25l17-17 18 17v62M135 43h9v19h-9M191 194V110h91v84M203 110l34-36 37 36M210 132h23v25h-23m34-25h23v25h-23M298 194V71h65v123M291 71l39-42 41 42M316 93h29v28h-29m0 18h29v31h-29M385 194V99h74v95M377 99l38-38 51 38M401 122h19v27h-19m26-27h19v27h-19" />
        <path d="M16 194c8-20 8-42 0-62m0 34c-12-7-14-16-13-24m13 13c11-8 14-18 13-28M481 194c8-24 8-49 0-73m0 38c-12-8-15-18-14-29m14 18c12-9 15-20 14-33M76 194c3-15 3-28 0-42m0 21c-8-5-9-11-9-18m9 10c7-5 9-12 8-18" />
        <path d="M3 105c5-5 10-5 15 0 5-5 10-5 15 0m347-61c5-5 10-5 15 0 5-5 10-5 15 0m68 24c5-5 10-5 15 0 5-5 10-5 15 0" />
      </g>
    </svg>
  );
}

function BrowseContent() {
  const { user } = useAuth();

  if (user?.role === "landlord") {
    return <MarketOverview />;
  }

  return <TenantBrowse />;
}

function TenantBrowse() {
  const { unreadCount } = useTenantNotifications();
  const [searchParams] = useSearchParams();
  const { user, users } = useAuth();
  const {
    apartments: allApartments,
    isLoading: apartmentsLoading,
    isRefreshing: apartmentsRefreshing,
    error: apartmentsError,
    refreshApartments,
  } = useApartmentsContext();
  const { favorites: userFavorites, isFavorite, toggleFavorite, updatingFavoriteIds } = useFavorites();

  const urlSearchQuery = searchParams.get("search")?.trim() || "";
  const initialPriceRange: [number, number] = [
    DEFAULT_PRICE_RANGE[0],
    defaultTenantPreferences.saveBudgetPreferences === false ? DEFAULT_PRICE_RANGE[1] : Number(defaultTenantPreferences.maxBudget) || DEFAULT_PRICE_RANGE[1],
  ];
  const initialBudgetFilterEnabled = defaultTenantPreferences.saveBudgetPreferences === true;
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const [priceRange, setPriceRange] = useState<[number, number]>(initialPriceRange);
  const [budgetFilterEnabled, setBudgetFilterEnabled] = useState(initialBudgetFilterEnabled);
  const [minPriceInput, setMinPriceInput] = useState(String(initialPriceRange[0]));
  const [maxPriceInput, setMaxPriceInput] = useState(String(initialPriceRange[1]));
  const [bedrooms, setBedrooms] = useState(defaultTenantPreferences.minBedrooms || "any");
  const [petFriendly, setPetFriendly] = useState(Boolean(defaultTenantPreferences.petFriendly));
  const [parking, setParking] = useState(Boolean(defaultTenantPreferences.parking));
  const [furnished, setFurnished] = useState(Boolean(defaultTenantPreferences.furnished));
  const [sortBy, setSortBy] = useState<SortOption>(defaultTenantPreferences.sortBy || "recommended");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [viewRows, setViewRows] = useState<DashboardApartmentViewRow[]>([]);
  const [favoriteRows, setFavoriteRows] = useState<DashboardFavoriteRow[]>([]);
  const [ratingRows, setRatingRows] = useState<ApartmentRatingRow[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [savedPreferences, setSavedPreferences] = useState(defaultTenantPreferences);
  const [activeNearbySearch, setActiveNearbySearch] = useState<{ target: string; location: GeocodedLocation } | null>(null);
  const [nearbySearchLoading, setNearbySearchLoading] = useState(false);
  const [nearbySearchError, setNearbySearchError] = useState("");
  const geocodeRequest = useRef(0);
  const geocodeController = useRef<AbortController | null>(null);

  const applyPriceRange = (range: [number, number], enabled = true) => {
    setPriceRange(range);
    setMinPriceInput(String(range[0]));
    setMaxPriceInput(String(range[1]));
    setBudgetFilterEnabled(enabled);
  };

  useEffect(() => {
    let mounted = true;

    if (!user?.id) return;

    const tenantId = user.id;

    void fetchTenantPreferences(tenantId)
      .then((preferences) => {
        if (!mounted || !preferences) return;
        setSavedPreferences(preferences);
        setPriceRange([DEFAULT_PRICE_RANGE[0], preferences.maxBudget || DEFAULT_PRICE_RANGE[1]]);
        setMaxPriceInput(String(preferences.maxBudget || DEFAULT_PRICE_RANGE[1]));
        setBedrooms(preferences.minBedrooms);
        setPetFriendly(preferences.petFriendly);
        setParking(preferences.parking);
        setFurnished(preferences.furnished);
      })
      .catch(() => {
        if (!mounted) return;
        toast.error("Unable to load saved browse preferences.");
      });

    return () => {
      mounted = false;
    };
  }, [user?.id, urlSearchQuery]);

  useEffect(() => () => geocodeController.current?.abort(), []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, priceRange, budgetFilterEnabled, bedrooms, petFriendly, parking, furnished, sortBy, itemsPerPage]);

  useEffect(() => {
    let mounted = true;

    const loadRankingData = () => Promise.all([fetchApartmentViews(), fetchDashboardFavorites(), fetchApartmentRatings()])
      .then(([views, favorites, ratings]) => {
        if (!mounted) return;
        setViewRows(views);
        setFavoriteRows(favorites);
        setRatingRows(ratings);
        setRatingsLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setViewRows([]);
        setFavoriteRows([]);
        setRatingRows([]);
        setRatingsLoading(false);
      });
    void loadRankingData();
    const unsubscribe = subscribeToApartmentRatings(() => { void loadRankingData(); });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const isApartmentAvailable = isTenantVisibleApartment;
  const getAvailableRooms = getAvailableRoomCount;

  const getViewCount = (apartmentId: string) =>
    viewRows
      .filter((view) => (view.apartment_id ?? view.apartmentId) === apartmentId)
      .reduce((total, view) => total + Math.max(0, Number(view.view_count) || 0), 0);

  const getFavoriteCount = (apartmentId: string) =>
    favoriteRows.filter((favorite) => (favorite.apartment_id ?? favorite.apartmentId) === apartmentId).length;

  const viewLabel = (count: number) => `${count.toLocaleString()} ${count === 1 ? "view" : "views"}`;

  const landlordById = useMemo(() => new globalThis.Map(users.filter((row) => row.id).map((row) => [row.id!, row])), [users]);
  const ratingSummary = useMemo(() => summarizeApartmentRatings(ratingRows), [ratingRows]);

  const getLandlord = (apartment: Apartment) => apartment.landlordId ? landlordById.get(apartment.landlordId) : undefined;

  const isVerifiedListing = (apartment: Apartment) => {
    if (typeof apartment.landlordVerified === "boolean") return apartment.landlordVerified;
    const landlord = getLandlord(apartment);
    return landlord?.isVerified === true;
  };

  const getVerificationStatus = (apartment: Apartment) => {
    return isVerifiedListing(apartment) ? "verified" : "pending";
  };

  const nearbyIntent = useMemo(() => parseNearbySearchIntent(searchQuery), [searchQuery]);
  const updateSearchQuery = (value: string) => {
    geocodeController.current?.abort(); geocodeRequest.current += 1;
    setSearchQuery(value); setActiveNearbySearch(null); setNearbySearchError(""); setNearbySearchLoading(false);
  };
  const submitSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const intent = parseNearbySearchIntent(searchQuery);
    if (!intent) { setActiveNearbySearch(null); setNearbySearchError(""); return; }
    geocodeController.current?.abort(); const controller = new AbortController(); geocodeController.current = controller;
    const request = ++geocodeRequest.current; setNearbySearchLoading(true); setNearbySearchError(""); setActiveNearbySearch(null);
    try {
      const location = await geocodeLocationWithinLaPaz(intent.target, controller.signal);
      if (request === geocodeRequest.current) setActiveNearbySearch({ target: intent.target, location });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (request === geocodeRequest.current) setNearbySearchError(error instanceof GeocodingError ? error.message : "Unable to search that location.");
    } finally { if (request === geocodeRequest.current) setNearbySearchLoading(false); }
  };

  const filteredApartments = useMemo<BrowseApartment[]>(() => {
    const filtered = allApartments.filter((apt) => {
      if (apt.isPublished === false) return false;
      if (!isApartmentAvailable(apt)) return false;

      if (searchQuery && !nearbyIntent) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          apt.title.toLowerCase().includes(query) ||
          apt.city.toLowerCase().includes(query) ||
          apt.address.toLowerCase().includes(query) ||
          apt.description.toLowerCase().includes(query) ||
          apt.amenities.some((amenity) => amenity.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      return true;
    });

    if (nearbyIntent && nearbySearchError) return [];
    if (activeNearbySearch) return findNearbyApartments(filtered, activeNearbySearch.location);

    if (sortBy === "recommended") {
      const isTenant = isTenantRole(user?.role);

      if (isTenant) {
        const preferences: TenantPreferences = {
          maxBudget: savedPreferences.maxBudget || undefined,
          preferredArea: savedPreferences.preferredArea || undefined,
          minBedrooms: savedPreferences.minBedrooms,
          petFriendly: savedPreferences.petFriendly,
          parking: savedPreferences.parking,
          furnished: savedPreferences.furnished,
          wifi: savedPreferences.wifi,
          ac: savedPreferences.ac,
          laundryArea: savedPreferences.laundryArea,
          tenantType: getTenantType(user) ?? "other",
        };

        const apartmentViewCounts = new globalThis.Map<string, number>();
        viewRows.forEach((row) => {
          const apartmentId = row.apartment_id ?? row.apartmentId ?? "";
          if (apartmentId) apartmentViewCounts.set(apartmentId, (apartmentViewCounts.get(apartmentId) ?? 0) + (Number(row.view_count) || 1));
        });
        const apartmentFavoriteCounts = new globalThis.Map<string, number>();
        favoriteRows.forEach((row) => {
          const apartmentId = row.apartment_id ?? row.apartmentId ?? "";
          if (apartmentId) apartmentFavoriteCounts.set(apartmentId, (apartmentFavoriteCounts.get(apartmentId) ?? 0) + 1);
        });
        const ratingSummary = summarizeApartmentRatings(ratingRows);
        return rankApartments(filtered, preferences, userFavorites, {
          apartmentViewCounts,
          apartmentFavoriteCounts,
          apartmentRatingStats: ratingSummary.byApartment,
          platformAverageRating: ratingSummary.platformAverage,
        });
      }

      return [...filtered].sort((a, b) => getApartmentPublishedTime(b) - getApartmentPublishedTime(a));
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === "price_high") return compareOptionalNumber(getAvailableApartmentPrice(a), getAvailableApartmentPrice(b), "desc");
      if (sortBy === "newest") return getApartmentPublishedTime(b) - getApartmentPublishedTime(a);
      if (sortBy === "popular") {
        const leftViews = getViewCount(a.id);
        const rightViews = getViewCount(b.id);
        const leftFavorites = getFavoriteCount(a.id);
        const rightFavorites = getFavoriteCount(b.id);
        return rightViews - leftViews || rightFavorites - leftFavorites || getApartmentPublishedTime(b) - getApartmentPublishedTime(a);
      }
      return compareOptionalNumber(getAvailableApartmentPrice(a), getAvailableApartmentPrice(b), "asc");
    });
  }, [allApartments, searchQuery, nearbyIntent, nearbySearchError, activeNearbySearch, sortBy, user?.role, user?.tenantType, landlordById, userFavorites, viewRows, favoriteRows, ratingRows, savedPreferences]);

  const totalPages = Math.max(1, Math.ceil(filteredApartments.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * itemsPerPage;
  const paginatedApartments = filteredApartments.slice(pageStart, pageStart + itemsPerPage);
  const activeBudgetFilter = budgetFilterEnabled && (priceRange[0] !== DEFAULT_PRICE_RANGE[0] || priceRange[1] !== DEFAULT_PRICE_RANGE[1]);
  const activeFilterCount = [petFriendly, parking, furnished, bedrooms !== "any", activeBudgetFilter].filter(Boolean).length;
  const mappedApartmentCount = filteredApartments.filter((apartment) => hasValidApartmentCoordinates(apartment.lat, apartment.lng)).length;
  const tenantGreeting = getTimeBasedGreeting(user?.name);
  const hasActiveApartmentFilters = Boolean(searchQuery.trim() || activeNearbySearch || activeFilterCount > 0);
  const realPriceValues = useMemo(
    () =>
      allApartments
        .filter(isTenantVisibleApartment)
        .flatMap((apt) => (apt.rooms ?? []).map((room) => parseMoneyValue(room.price)))
        .filter((price): price is number => price !== null),
    [allApartments],
  );
  const quickBudgetChips = useMemo(() => {
    if (!realPriceValues.length) return [];

    const minPrice = Math.min(...realPriceValues);
    const maxPrice = Math.max(...realPriceValues);

    if (minPrice === maxPrice) {
      return [{ label: `₱${minPrice.toLocaleString("en-PH")}`, value: [minPrice, maxPrice] as [number, number] }];
    }

    const roundPrice = (value: number) => Math.round(value / 100) * 100;
    const step = (maxPrice - minPrice) / 4;

    return Array.from({ length: 4 }, (_, index) => {
      const start = index === 0 ? minPrice : roundPrice(minPrice + step * index);
      const end = index === 3 ? maxPrice : roundPrice(minPrice + step * (index + 1));
      return {
        label: index === 3 ? `₱${start.toLocaleString("en-PH")}+` : `₱${start.toLocaleString("en-PH")} - ₱${end.toLocaleString("en-PH")}`,
        value: [start, end] as [number, number],
      };
    });
  }, [realPriceValues]);

  const mapCenter = DEFAULT_LA_PAZ_MAP_CENTER;
  const resetFilters = () => {
    setSearchQuery("");
    applyPriceRange(DEFAULT_PRICE_RANGE, false);
    setBedrooms("any");
    setPetFriendly(false);
    setParking(false);
    setFurnished(false);
    setSortBy("recommended");
  };

  const resetPreferences = () => {
    setSavedPreferences(defaultTenantPreferences);
    applyPriceRange(DEFAULT_PRICE_RANGE, false);
    setBedrooms("any"); setPetFriendly(false); setParking(false); setFurnished(false); setSortBy("recommended");
  };

  const restoreSavedPreferences = async () => {
    if (!user?.id) {
      toast.error("Please sign in to restore browse preferences.");
      return;
    }

    const preferences = await fetchTenantPreferences(user.id);

    if (!preferences) {
      toast.error("No saved browse preferences yet.");
      return;
    }

    const useBudgetPreference = hasMeaningfulBudgetPreference(preferences);
    applyPriceRange(
      [DEFAULT_PRICE_RANGE[0], useBudgetPreference ? Number(preferences.maxBudget) || DEFAULT_PRICE_RANGE[1] : DEFAULT_PRICE_RANGE[1]],
      useBudgetPreference,
    );
    setBedrooms(preferences.minBedrooms || "any");
    setPetFriendly(Boolean(preferences.petFriendly));
    setParking(Boolean(preferences.parking));
    setFurnished(Boolean(preferences.furnished));
    setSortBy(preferences.sortBy || "recommended");
    setSavedPreferences(preferences);
    toast.success("Saved recommendation preferences restored.");
  };

  const saveBrowsePreferences = async () => {
    if (!user?.id) {
      toast.error("Please sign in to save browse preferences.");
      return;
    }

    if (!minPriceInput.trim() || !maxPriceInput.trim()) {
      toast.error("Please enter both minimum and maximum price.");
      return;
    }

    if (priceRange[0] > priceRange[1]) {
      toast.error("Minimum price cannot be higher than maximum price.");
      return;
    }

    try {
      await saveTenantPreferences(user.id, {
        preferredArea: savedPreferences.preferredArea,
        maxBudget: priceRange[1],
        minBedrooms: bedrooms,
        petFriendly,
        parking,
        furnished,
        wifi: savedPreferences.wifi,
        ac: savedPreferences.ac,
        laundryArea: savedPreferences.laundryArea,
        sortBy,
        saveBudgetPreferences: activeBudgetFilter,
      });
      setSavedPreferences((current) => ({ ...current, maxBudget: priceRange[1], minBedrooms: bedrooms, petFriendly, parking, furnished }));
      toast.success("Preferences saved for recommendations.");
      setPreferencesOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save browse preferences.";
      toast.error(message);
    }
  };

  const updateMinimumPrice = (value: string) => {
    setMinPriceInput(value);
    if (!value.trim()) return;
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    setBudgetFilterEnabled(true);
    setPriceRange((current) => [Math.max(0, next), current[1]]);
  };

  const updateMaximumPrice = (value: string) => {
    setMaxPriceInput(value);
    if (!value.trim()) return;
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    setBudgetFilterEnabled(true);
    setPriceRange((current) => [current[0], Math.max(0, next)]);
  };

  const renderFilterTrigger = (floating = false) => (
    <DialogTrigger asChild>
      <Button type="button" className={floating ? "h-14 w-14 rounded-full bg-[#8B735B] p-0 text-white shadow-lg hover:bg-[#75614E]" : "h-12 rounded-lg border border-[#E8DED1] bg-white px-5 font-black text-[#302820] shadow-sm hover:bg-[#FAF8F5]"} variant={floating ? "default" : "outline"}>
        <SlidersHorizontal className={floating ? "h-5 w-5" : "mr-2 h-4 w-4"} />
        {!floating && `Preferences${activeFilterCount ? ` (${activeFilterCount})` : ""}`}
      </Button>
    </DialogTrigger>
  );

  const renderFilterContent = () => (
      <DialogContent
        onClick={(event) => event.stopPropagation()}
        className="tenant-preferences max-h-[92vh] overflow-y-auto rounded-2xl border-[#E8DED1] bg-white p-0 shadow-[0_20px_50px_rgba(48,40,32,0.10)] sm:max-w-2xl"
      >
        <div onClick={(event) => event.stopPropagation()}>
          <DialogHeader className="border-b border-[#E8DED1] px-6 py-5 pr-12 text-left sm:px-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E8DED1] bg-[#FAF8F5] text-[#8B735B]">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[#8B735B]">Personalize your search</p>
                <DialogTitle className="text-[28px] font-bold tracking-tight text-[#302820]">Preferences</DialogTitle>
                <DialogDescription className="mt-1 max-w-xl text-sm font-medium leading-6 text-[#756A60]">
                  Adjust what matters most when browsing apartments and receiving recommendations.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-0 px-6 sm:px-7">
          <section className="border-b border-[#E8DED1] py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3EFEA] text-[#8B735B]">
                <HomeIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-[#302820]">Improve your recommendations</h3>
                <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-[#756A60]">
                  Browse All stays complete. These signals only change recommendation relevance and ordering.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-[#E8DED1] py-5">
            <Label htmlFor="preferred-area" className="text-base font-semibold text-[#302820]">Preferred location</Label>
            <input id="preferred-area" value={savedPreferences.preferredArea} onChange={(event) => setSavedPreferences((current) => ({ ...current, preferredArea: event.target.value }))} placeholder="Barangay, street, school, or workplace" className="mt-2 h-12 w-full rounded-xl border border-[#E8DED1] px-4 text-base text-[#302820] outline-none focus:border-[#8B735B] focus:ring-2 focus:ring-[#8B735B]/10" />
          </section>

          <section className="border-b border-[#E8DED1] py-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F3EFEA] text-[#8B735B]">
                <Tag className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#302820]">Price Range</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <PriceField label="Minimum Price" value={minPriceInput} onChange={updateMinimumPrice} />
              <span className="hidden pb-3 text-center text-xl font-black text-slate-500 sm:block">-</span>
              <PriceField label="Maximum Price" value={maxPriceInput} onChange={updateMaximumPrice} />
            </div>

            {quickBudgetChips.length > 0 && (
              <div className="mt-6">
                <Label className="text-sm font-black text-slate-950">Quick Budget</Label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {quickBudgetChips.map((chip) => {
                    const active = priceRange[0] === chip.value[0] && priceRange[1] === chip.value[1];
                    return (
                      <button
                        key={`${chip.value[0]}-${chip.value[1]}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          applyPriceRange(chip.value);
                        }}
                        className={`min-h-11 rounded-lg border px-3 text-sm font-semibold transition ${
                          active ? "border-[#8B735B] bg-[#F3EFEA] text-[#8B735B]" : "border-[#E8DED1] bg-white text-[#756A60] hover:bg-[#FAF8F5] hover:text-[#8B735B]"
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="border-b border-[#E8DED1] py-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F3EFEA] text-[#8B735B]">
                <Bed className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#302820]">Bedrooms</h3>
            </div>
            <input
              type="text"
              value={bedrooms === "any" ? "" : bedrooms}
              placeholder="Any beds"
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setBedrooms(event.target.value.trim() || "any")}
              className="h-12 w-full rounded-xl border border-[#E8DED1] bg-white px-4 text-base font-semibold text-[#302820] outline-none transition placeholder:text-[#8B8178] focus:border-[#8B735B] focus:ring-2 focus:ring-[#8B735B]/10"
            />
          </section>

          <section className="py-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F3EFEA] text-[#8B735B]">
                <Sofa className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#302820]">Amenities</h3>
            </div>
            <div className="space-y-3">
              <AmenityToggle icon={PawPrint} label="Pet Friendly" checked={petFriendly} onChange={setPetFriendly} tone="bg-[#F3EFEA] text-[#8B735B]" />
              <AmenityToggle icon={Car} label="Parking" checked={parking} onChange={setParking} tone="bg-[#F3EFEA] text-[#8B735B]" />
              <AmenityToggle icon={Sofa} label="Fully Furnished" checked={furnished} onChange={setFurnished} tone="bg-[#F3EFEA] text-[#8B735B]" />
              <AmenityToggle icon={Sofa} label="Wi-Fi" checked={savedPreferences.wifi} onChange={(wifi) => setSavedPreferences((current) => ({ ...current, wifi }))} tone="bg-[#F3EFEA] text-[#8B735B]" />
              <AmenityToggle icon={Sofa} label="Air Conditioning" checked={savedPreferences.ac} onChange={(ac) => setSavedPreferences((current) => ({ ...current, ac }))} tone="bg-[#F3EFEA] text-[#8B735B]" />
              <AmenityToggle icon={Sofa} label="Laundry Area" checked={savedPreferences.laundryArea} onChange={(laundryArea) => setSavedPreferences((current) => ({ ...current, laundryArea }))} tone="bg-[#F3EFEA] text-[#8B735B]" />
            </div>
          </section>
          </div>

          <div className="grid gap-3 border-t border-[#E8DED1] bg-[#FAF8F5] px-6 py-5 sm:px-7">
            <Button onClick={saveBrowsePreferences} className="h-12 rounded-[10px] bg-[#8B735B] text-base font-semibold text-white shadow-sm hover:bg-[#75614E]">
              <Bookmark className="mr-2 h-5 w-5" />
              Save Recommendation Preferences
            </Button>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" onClick={restoreSavedPreferences} className="h-11 rounded-[10px] border-[#E8DED1] bg-white font-semibold text-[#756A60] hover:bg-[#F3EFEA] hover:text-[#8B735B]">
                <Clock className="mr-2 h-5 w-5" />
                Restore Saved Preferences
              </Button>
              <Button variant="outline" onClick={resetPreferences} className="h-11 rounded-[10px] border-[#E8DED1] bg-white font-semibold text-[#756A60] hover:bg-[#F3EFEA] hover:text-[#8B735B]">
                <RotateCcw className="mr-2 h-5 w-5" />
                Reset Preferences
              </Button>
              <Button variant="outline" onClick={() => setPreferencesOpen(false)} className="h-11 rounded-[10px] border-[#E8DED1] bg-white font-semibold text-[#756A60] hover:bg-[#F3EFEA] hover:text-[#8B735B]">
                Cancel
              </Button>
            </div>
          </div>

          <div className="mx-6 mb-5 flex items-center gap-3 rounded-xl border border-[#E8DED1] bg-white p-4 sm:mx-7">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3EFEA] text-[#8B735B]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium leading-6 text-[#756A60]">Your preferences are private and stay connected to your tenant account.</p>
          </div>
        </div>
      </DialogContent>
  );

  const ApartmentBrowseCard = ({ apartment }: { apartment: BrowseApartment }) => {
    const status = apartment.status ?? "available";
    const availableRooms = getAvailableRooms(apartment);
    const locationText = formatApartmentLocation(apartment);
    const favorite = isFavorite(apartment.id);
    const favoriteUpdating = updatingFavoriteIds.includes(apartment.id);
    const imageUrl = getApartmentImageUrl(apartment);
    const viewCount = getViewCount(apartment.id);

    return (
      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.12)]">
        <div className="relative aspect-[4/3] bg-slate-100">
          {imageUrl ? (
            <ImageWithFallback src={imageUrl} alt={apartment.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Building2 className="h-12 w-12 text-slate-300" />
            </div>
          )}
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            {activeNearbySearch && apartment.distanceMeters !== undefined && <Badge className="rounded-md bg-slate-950 text-white">{formatDistance(apartment.distanceMeters)}</Badge>}
            <Badge className={`rounded-md ${STATUS_CLASS[status] ?? STATUS_CLASS.available}`}>{STATUS_LABEL[status] ?? "Available"}</Badge>
            {isVerifiedListing(apartment) && <VerifiedBadge label="Verified Listing" className="bg-white/95 shadow-lg backdrop-blur-sm" />}
            {apartment.petFriendly && <Badge className="rounded-md border border-[#e8ded1] bg-[#f3efeA] text-[#756a60]">Pet Friendly</Badge>}
          </div>
          <button
            type="button"
            title={favorite ? "Remove from favorites" : "Add to favorites"}
            disabled={favoriteUpdating}
            onClick={() => void toggleFavorite(apartment.id)}
            className={`absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 ${favorite ? "text-rose-500" : "text-slate-500"}`}
          >
            {favoriteUpdating ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Heart className="h-6 w-6" fill={favorite ? "currentColor" : "none"} />}
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black text-slate-950">{apartment.title}</h2>
              <ApartmentRatingSummary stats={ratingSummary.byApartment.get(apartment.id)} isLoading={ratingsLoading} className="mt-1.5" />
              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-slate-500"><MapPin className="h-4 w-4 text-[#8B735B]" />{locationText}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-black text-[#756A60]">View room prices</p>
              <p className="mt-1 flex items-center justify-end gap-1 text-xs font-bold text-slate-500"><Eye className="h-3.5 w-3.5 text-[#8B735B]" />{viewLabel(viewCount)}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2 border-t border-slate-100 pt-4 text-sm">
            <Metric icon={Building2} label="rooms" value={availableRooms.toLocaleString()} />
            <Metric icon={Bed} label="bed" value={apartment.bedrooms.toLocaleString()} />
            <Metric icon={Bath} label="bath" value={apartment.bathrooms.toLocaleString()} />
            <Metric icon={Square} label="sqft" value={Number(apartment.sqft || 0).toLocaleString()} />
          </div>
          <Button asChild variant="outline" className="mt-5 h-12 w-full rounded-lg border-[#E8DED1] font-black text-[#756A60] hover:bg-[#FAF8F5]">
            <Link to={`/apartment/${apartment.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Link>
          </Button>
        </div>
      </article>
    );
  };

  return (
    <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
      <div className="tenant-browse fixed inset-0 z-50 overflow-hidden bg-white">
      <TenantMobileNavigation active="apartments" unreadCount={unreadCount} />
      <div className="flex h-full">
        <div className="hidden h-full w-64 shrink-0 lg:block"><TenantSidebar active="apartments" unreadCount={unreadCount} /></div>

        <main className="app-shell-main min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="app-shell-content app-shell-content-mobile-nav mx-auto max-w-[1500px] px-4 py-6 md:px-8 lg:px-10">
            <form onSubmit={submitSearch} className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input value={searchQuery} onChange={(event) => updateSearchQuery(event.target.value)} placeholder="Search apartments or try near ISAT U" className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium outline-none focus:border-[#DCC9B4] focus:ring-2 focus:ring-[#F3EFEA]" />
                </div>
                {renderFilterTrigger()}
              </div>
              {nearbySearchLoading && <p className="px-1 pt-2 text-xs font-bold text-[#756A60]">Finding nearby apartments…</p>}
              {nearbySearchError && <p className="px-1 pt-2 text-xs font-bold text-red-600">{nearbySearchError}</p>}
            </form>

            <section className="relative mt-8 overflow-hidden rounded-lg bg-gradient-to-r from-white via-[#FAF8F5] to-[#F3EFEA] p-7">
              <div className="relative z-10">
                <p className="mb-3 text-lg font-black text-[#6F4E37] sm:text-xl">{tenantGreeting}</p>
                <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-[#F3EFEA] bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-[#756A60] shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  Find Your Next Home
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-[#302820] md:text-[34px]">Available Apartments</h1>
                <p className="mt-4 text-lg font-medium text-slate-600">{activeNearbySearch ? `${filteredApartments.length} apartments within 500 m of ${activeNearbySearch.target} · nearest first` : `${filteredApartments.length} ${filteredApartments.length === 1 ? "apartment" : "apartments"} found in La Paz`}</p>
              </div>
              <div className="pointer-events-none absolute bottom-0 right-4 hidden w-[43%] text-[#b9a58f] md:block"><ApartmentLineArt /></div>
            </section>

            <section className="mt-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-[0_14px_35px_rgba(15,23,42,0.07)] xl:flex-row xl:items-center xl:justify-between">
              {!activeNearbySearch && <div className="flex flex-wrap gap-2">
                <SortButton icon={Star} label="Recommended" active={sortBy === "recommended"} onClick={() => setSortBy("recommended")} />
                <SortButton icon={DollarSign} label="Price (Low)" active={sortBy === "price_low"} onClick={() => setSortBy("price_low")} />
                <SortButton icon={TrendingUp} label="Price (High)" active={sortBy === "price_high"} onClick={() => setSortBy("price_high")} />
                <SortButton icon={CalendarDays} label="Newest" active={sortBy === "newest"} onClick={() => setSortBy("newest")} />
                <SortButton icon={Flame} label="Popular" active={sortBy === "popular"} onClick={() => setSortBy("popular")} />
              </div>}
              <div className="grid h-12 grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
                <button onClick={() => setViewMode("grid")} className={`flex items-center justify-center gap-2 rounded-md px-5 text-sm font-black ${viewMode === "grid" ? "bg-[#FAF8F5] text-[#756A60]" : "text-slate-600 hover:bg-slate-50"}`}><Grid2X2 className="h-4 w-4" />Grid</button>
                <button onClick={() => setViewMode("map")} className={`flex items-center justify-center gap-2 rounded-md px-5 text-sm font-black ${viewMode === "map" ? "bg-[#FAF8F5] text-[#756A60]" : "text-slate-600 hover:bg-slate-50"}`}><Map className="h-4 w-4" />Map</button>
              </div>
            </section>

            <section className="mt-6">
              {apartmentsRefreshing && allApartments.length > 0 && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#F3EFEA] bg-[#FAF8F5] px-4 py-2 text-xs font-black text-[#5F5145]">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Refreshing latest apartment data...
                </div>
              )}
              {apartmentsLoading && allApartments.length === 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading apartments">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      <div className="aspect-[4/3] animate-pulse bg-slate-100" />
                      <div className="space-y-3 p-5">
                        <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
                        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                        <div className="h-9 w-full animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : apartmentsError && allApartments.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-red-100 bg-white p-6 text-center text-sm font-bold text-red-600 shadow-sm">
                  <TriangleAlert className="mb-3 h-8 w-8 text-red-300" />
                  <p>{apartmentsError}</p>
                  <Button variant="outline" onClick={() => void refreshApartments()} className="mt-4 rounded-md font-bold">
                    Try Again
                  </Button>
                </div>
              ) : filteredApartments.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                  <LocateFixed className="mb-4 h-12 w-12 text-slate-300" />
                  <h2 className="text-2xl font-black text-slate-950">No apartments found</h2>
                  <p className="mt-2 max-w-lg text-sm font-medium text-slate-500">Try adjusting your search, filters, or preferences to discover other available apartments.</p>
                  {hasActiveApartmentFilters && <Button onClick={resetFilters} className="mt-6 rounded-lg bg-[#8B735B] font-black text-white hover:bg-[#756A60]">Reset Search &amp; Filters</Button>}
                </div>
              ) : viewMode === "grid" ? (
                <>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {paginatedApartments.map((apartment) => (
                      <ApartmentBrowseCard key={apartment.id} apartment={apartment} />
                    ))}
                  </div>
                  <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    totalItems={filteredApartments.length}
                    pageStart={pageStart}
                    pageCount={paginatedApartments.length}
                    itemsPerPage={itemsPerPage}
                    setCurrentPage={setCurrentPage}
                    setItemsPerPage={setItemsPerPage}
                  />
                </>
              ) : (
                <div className="relative h-[calc(100vh-350px)] min-h-[550px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                  <div className="absolute left-4 top-4 z-[500] rounded-lg bg-white/95 px-4 py-3 text-xs font-bold text-slate-700 shadow-lg">
                    {mappedApartmentCount.toLocaleString()} of {filteredApartments.length.toLocaleString()} filtered listings have map coordinates
                  </div>
                  <MapView
                    lat={mapCenter.lat}
                    lng={mapCenter.lng}
                    zoom={12}
                    apartments={filteredApartments.map((apt) => ({
                      id: apt.id,
                      title: apt.title,
                      price: getAvailableApartmentPrice(apt) ?? 0,
                      lat: apt.lat,
                      lng: apt.lng,
                      bedrooms: apt.bedrooms,
                      bathrooms: apt.bathrooms,
                      image: apt.image ? getImageUrl(apt.image) : undefined,
                      location: formatApartmentLocation(apt),
                      availableRooms: getAvailableRooms(apt),
                      status: apt.status ?? "available",
                      isVerified: isVerifiedListing(apt),
                      verificationStatus: getVerificationStatus(apt),
                      availabilityStatus: isApartmentAvailable(apt) ? "available" : "unavailable",
                      markerStatus: "available",
                    }))}
                    emptyMessage="No apartments found on the map. Try another search."
                  />
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
      </div>
      {renderFilterContent()}
    </Dialog>
  );
}

function Metric({ icon: Icon, value, label }: { icon: ComponentType<{ className?: string }>; value: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-600">
      <Icon className="h-4 w-4 text-[#8B735B]" />
      <span className="font-bold">{value}</span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

function SortButton({ icon: Icon, label, active, onClick }: { icon: ComponentType<{ className?: string }>; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`inline-flex h-12 items-center gap-2 rounded-lg px-5 text-sm font-bold transition ${active ? "bg-[#8b735b] text-white shadow-sm" : "text-[#302820] hover:bg-[#faf8f5]"}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function PriceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-[#302820]">{label}</Label>
      <div className="flex h-12 items-center gap-3 rounded-xl border border-[#E8DED1] bg-white px-4 focus-within:border-[#8B735B] focus-within:ring-2 focus-within:ring-[#8B735B]/10">
        <span className="text-base font-black text-slate-500">₱</span>
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-[#302820] outline-none"
        />
      </div>
    </div>
  );
}

function AmenityToggle({
  icon: Icon,
  label,
  checked,
  onChange,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tone: string;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-[#EEE7DF] py-2.5 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-base font-semibold text-[#302820]">{label}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageStart,
  pageCount,
  itemsPerPage,
  setCurrentPage,
  setItemsPerPage,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageStart: number;
  pageCount: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
}) {
  const visiblePageCount = Math.min(5, totalPages);
  const firstVisiblePage = Math.min(
    Math.max(1, currentPage - Math.floor(visiblePageCount / 2)),
    Math.max(1, totalPages - visiblePageCount + 1),
  );
  const visiblePages = Array.from({ length: visiblePageCount }, (_, index) => firstVisiblePage + index);

  return (
    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-600">
        Showing {totalItems === 0 ? 0 : pageStart + 1} to {pageStart + pageCount} of {totalItems} apartments
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {visiblePages.map((page) => (
            <button key={page} onClick={() => setCurrentPage(page)} className={`h-10 min-w-10 rounded-lg px-3 text-sm font-black ${currentPage === page ? "bg-[#8B735B] text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
              {page}
            </button>
        ))}
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
        <select value={itemsPerPage} onChange={(event) => setItemsPerPage(Number(event.target.value))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
          <option value={6}>Show: 6 per page</option>
          <option value={9}>Show: 9 per page</option>
          <option value={12}>Show: 12 per page</option>
        </select>
      </div>
    </div>
  );
}

export function ApartmentBrowse() {
  return <BrowseContent />;
}
