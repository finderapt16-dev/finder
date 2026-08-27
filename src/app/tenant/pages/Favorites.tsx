import {
  Bath,
  Bell,
  Bed,
  Bookmark,
  Building2,
  ChevronRight,
  Eye,
  Grid2X2,
  Heart,
  HelpCircle,
  List,
  LogOut,
  MapPin,
  Search,
  Settings,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { VerifiedBadge } from "@/app/shared/components/common/VerifiedBadge";
import { LogoutConfirmation } from "@/app/shared/components/common/LogoutConfirmation";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { useApartmentsContext } from "@/app/shared/contexts/ApartmentsContext";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import { listFavoriteApartments, type Apartment } from "@/app/shared/data/apartments";
import { useFavorites } from "@/app/shared/hooks/useFavorites";
import { formatApartmentLocation } from "@/app/shared/utils/apartmentLocation";
import { getImageUrl } from "@/app/shared/utils/images";
import { TenantMobileNavigation } from "@/app/tenant/components/TenantMobileNavigation";
import { useTenantNotifications } from "@/app/tenant/hooks/useTenantNotifications";
import {
  getAvailableRoomCount,
  getLowestAvailableRoomPrice,
  isTenantVisibleApartment,
} from "@/app/shared/utils/listingVisibility";

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

type FavoriteFilter = "all" | "available" | "unavailable";
type FavoriteSort = "newest" | "price-low" | "price-high" | "name";
type ViewMode = "grid" | "list";

function FavoriteHomeLineArt() {
  return (
    <svg aria-hidden="true" className="tenant-architecture" viewBox="0 0 520 210" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className="tenant-architecture-lines" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 194h472M74 194V95l72-59 72 59v99M102 194v-65h87v65M126 108h38M264 194V78h145v116M250 78l87-55 89 55M291 106h34v32h-34m57-32h34v32h-34M309 194v-35h57v35M454 194c7-20 7-41 0-62m0 32c-11-7-14-16-13-24m13 13c11-8 14-17 13-27" />
        <path d="M236 115c-22-18-51 13 0 48 51-35 22-66 0-48Z" />
      </g>
    </svg>
  );
}

export function Favorites() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { refreshFavorites, toggleFavorite } = useFavorites();
  const { unreadCount } = useTenantNotifications();
  const { apartments } = useApartmentsContext();
  const [favoriteApartments, setFavoriteApartments] = useState<Awaited<ReturnType<typeof listFavoriteApartments>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FavoriteFilter>("all");
  const [sort, setSort] = useState<FavoriteSort>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user?.id) {
        setFavoriteApartments([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const apartments = await listFavoriteApartments(user.id);
        if (active) {
          setFavoriteApartments(
            apartments.filter((apt) => (
              isTenantVisibleApartment(apt) &&
              !(user.role === "landlord" && apt.landlordId === user.id)
            )),
          );
        }
      } catch (error) {
        console.error("Failed to load favorite apartments:", error);
        if (active) setFavoriteApartments([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    void refreshFavorites();

    return () => {
      active = false;
    };
  }, [apartments, user?.id, user?.role, refreshFavorites]);

  const isApartmentAvailable = isTenantVisibleApartment;
  const getAvailableRooms = getAvailableRoomCount;

  const visibleFavorites = useMemo(() => {
    return [...favoriteApartments]
      .filter((apartment) => {
        if (filter === "available") return isApartmentAvailable(apartment);
        if (filter === "unavailable") return !isApartmentAvailable(apartment);
        return true;
      })
      .sort((a, b) => {
        if (sort === "price-low") return (getLowestAvailableRoomPrice(a) ?? Number.MAX_SAFE_INTEGER) - (getLowestAvailableRoomPrice(b) ?? Number.MAX_SAFE_INTEGER);
        if (sort === "price-high") return (getLowestAvailableRoomPrice(b) ?? -1) - (getLowestAvailableRoomPrice(a) ?? -1);
        if (sort === "name") return a.title.localeCompare(b.title);

        const bDate = new Date(b.updatedAt || b.createdAt || b.availableDate).getTime();
        const aDate = new Date(a.updatedAt || a.createdAt || a.availableDate).getTime();
        return (Number.isNaN(bDate) ? 0 : bDate) - (Number.isNaN(aDate) ? 0 : aDate);
      });
  }, [favoriteApartments, filter, sort]);

  const favoriteCount = favoriteApartments.length;
  const displayName = user?.name?.trim();

  const removeFavorite = async (apartmentId: string) => {
    if (!user?.id) return;

    setRemovingId(apartmentId);
    try {
      await toggleFavorite(apartmentId);
      await refreshFavorites();
      const apartments = await listFavoriteApartments(user.id);
      setFavoriteApartments(
        apartments.filter((apt) => (
          isTenantVisibleApartment(apt) &&
          !(user.role === "landlord" && apt.landlordId === user.id)
        )),
      );
    } finally {
      setRemovingId(null);
    }
  };

  const handleLogout = () => {
    logout?.();
    navigate("/");
  };

  if (user?.role === "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const SidebarLink = ({
    icon: Icon,
    label,
    href,
    active,
    badge,
  }: {
    icon: typeof Heart;
    label: string;
    href: string;
    active?: boolean;
    badge?: number;
  }) => (
    <Link
      to={href}
      aria-current={active ? "page" : undefined}
      className={`app-sidebar-nav-item flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${
        active ? "bg-[#f3efeA] text-[#8b735b]" : "text-[#302820] hover:bg-[#faf8f5] hover:text-[#8b735b]"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="app-sidebar-badge flex min-w-5 items-center justify-center rounded-full bg-[#8b735b] px-1.5 py-0.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );

  const FavoriteCard = ({ apartment }: { apartment: Apartment }) => {
    const status = apartment.status ?? "available";
    const availableRooms = getAvailableRooms(apartment);
    const images = [apartment.image, ...(apartment.images ?? [])].filter(Boolean);
    const location = formatApartmentLocation(apartment);

    return (
      <article className={`overflow-hidden rounded-xl border border-[#e8ded1] bg-white shadow-[0_2px_12px_rgba(48,40,32,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(48,40,32,0.10)] ${viewMode === "list" ? "grid lg:grid-cols-[minmax(280px,0.9fr)_1fr]" : ""}`}>
        <div className="relative bg-slate-100">
          <div className={viewMode === "list" ? "aspect-[4/3] lg:h-full lg:aspect-auto" : "aspect-[4/3]"}>
            {images[0] ? (
              <img src={getImageUrl(images[0])} alt={apartment.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100">
                <Building2 className="h-12 w-12 text-slate-300" />
              </div>
            )}
          </div>
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            {apartment.landlordVerified === true && <VerifiedBadge label="Verified Listing" className="bg-white/95 shadow-lg backdrop-blur-sm" />}
            {apartment.petFriendly && <Badge className="rounded-full border border-[#e8ded1] bg-[#f3efeA] text-[#756a60]">Pet Friendly</Badge>}
            <Badge className={`rounded-full ${STATUS_CLASS[status] ?? STATUS_CLASS.available}`}>{STATUS_LABEL[status] ?? "Available"}</Badge>
          </div>
          <button
            onClick={() => void removeFavorite(apartment.id)}
            disabled={removingId === apartment.id}
            className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#e8ded1] bg-white text-[#8b735b] shadow-sm transition hover:bg-[#faf8f5] disabled:opacity-60"
            aria-label="Remove from favorites"
          >
            <Heart className="h-6 w-6 fill-current" />
          </button>
        </div>

        <div className="flex flex-col p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-[#302820]">{apartment.title}</h2>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-[#756a60]">
                <MapPin className="h-4 w-4 text-[#8b735b]" />
                <span>{location}</span>
              </div>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-sm font-bold text-[#8b735b]">View room prices</p>
            </div>
          </div>

          <div className="my-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 sm:grid-cols-4">
            <InfoPill icon={Bookmark} value={availableRooms.toLocaleString()} label={availableRooms === 1 ? "Room" : "Rooms"} tone="text-[#8b735b] bg-[#faf8f5]" />
            <InfoPill icon={Bed} value={apartment.rooms?.length ? apartment.rooms.length.toLocaleString() : apartment.bedrooms.toLocaleString()} label={apartment.rooms?.length ? "Room count" : "Beds"} tone="text-[#8b735b] bg-[#faf8f5]" />
            <InfoPill icon={Bath} value={apartment.bathrooms.toLocaleString()} label={apartment.bathrooms === 1 ? "Bath" : "Baths"} tone="text-[#8b735b] bg-[#faf8f5]" />
            <InfoPill icon={Square} value={Number(apartment.sqft || 0).toLocaleString()} label="Sqft" tone="text-[#8b735b] bg-[#faf8f5]" />
          </div>

          {apartment.description && (
            <p className="line-clamp-2 text-sm font-medium leading-6 text-slate-600">{apartment.description}</p>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row">
            <Button asChild variant="outline" className="h-12 flex-1 rounded-lg border-[#e8ded1] font-bold text-[#8b735b] hover:bg-[#faf8f5]">
              <Link to={`/apartment/${apartment.id}`} state={{ returnTo: "/favorites", backLabel: "Back to Favorites" }}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </Button>
            <Button
              variant="outline"
              disabled={removingId === apartment.id}
              onClick={() => void removeFavorite(apartment.id)}
              className="h-12 flex-1 rounded-lg border-[#e8ded1] bg-white font-bold text-[#756a60] hover:border-red-100 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {removingId === apartment.id ? "Removing..." : "Remove"}
            </Button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="tenant-browse app-shell fixed inset-0 z-50 overflow-hidden bg-white">
      <TenantMobileNavigation active="favorites" unreadCount={unreadCount} />
      <div className="app-shell-frame flex h-full">
        <aside className="app-shell-sidebar hidden h-full w-64 shrink-0 flex-col border-r border-[#e8ded1] bg-white lg:flex">
          <div className="app-sidebar flex h-full w-full flex-col overflow-y-auto">
          <div className="app-sidebar-brand px-5 pb-5 pt-6">
            <Link to="/browse" className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#e8ded1] bg-[#faf8f5] text-[#8b735b]">
                <img src="/icon.svg" alt="" className="h-9 w-9 object-contain" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-[#302820]">AptFindr</span>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#756a60]">La Paz, Iloilo City</p>
              </div>
            </Link>
          </div>

          <div className="px-4 pb-5">
            <div className="app-sidebar-profile flex items-center gap-3 rounded-lg border border-[#e8ded1] bg-[#faf8f5] px-3 py-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#8b735b] text-sm font-bold text-white">
                {user?.avatar ? <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" /> : user?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#302820]">{displayName || "Welcome"}</p>
                <p className="truncate text-xs text-[#756a60]">{user?.email ?? ""}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[#756a60]" />
            </div>
          </div>

          <nav className="space-y-1 px-3 py-3">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756a60]">Main</p>
            <SidebarLink icon={Search} label="Apartments" href="/browse" />
            <SidebarLink icon={Heart} label="My Favorites" href="/favorites" active badge={favoriteCount} />
            <SidebarLink icon={Sparkles} label="Suggested for You" href="/dashboard?section=suggested" />
            <SidebarLink icon={TrendingUp} label="Popular" href="/dashboard?section=popular" />
            <SidebarLink icon={Bell} label="Notifications" href="/dashboard?section=notifications" badge={unreadCount} />
          </nav>

          <nav className="space-y-1 border-t border-[#e8ded1] px-3 py-4">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756a60]">Account</p>
            <SidebarLink icon={Settings} label="Settings" href="/dashboard?section=settings" />
            <SidebarLink icon={TriangleAlert} label="Report a Problem" href="/dashboard?section=report" />
            <SidebarLink icon={HelpCircle} label="Help" href="/dashboard?section=help" />
          </nav>

          <div className="mt-auto border-t border-[#e8ded1] px-4 py-4">
            <LogoutConfirmation onConfirm={handleLogout}>
              <button className="app-sidebar-logout flex w-full items-center gap-3 rounded-lg border border-[#e8ded1] bg-white px-3 py-3 text-sm font-semibold text-[#756a60] transition hover:border-red-100 hover:bg-red-50 hover:text-red-700">
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </LogoutConfirmation>
          </div>
          </div>
        </aside>

        <main className="app-shell-main min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="app-shell-content app-shell-content-mobile-nav mx-auto max-w-7xl px-4 py-6 md:px-8 lg:px-10 lg:py-8">
            <section className="tenant-favorites-hero relative flex min-h-[160px] items-center overflow-hidden rounded-xl border border-[#e8ded1] bg-gradient-to-r from-[#faf8f5] to-[#fffdfb] p-6 md:px-7">
              <div className="relative z-10 max-w-[58%] max-md:max-w-full">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8ded1] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8b735b] shadow-sm">
                  <Heart className="h-4 w-4" />
                  Saved Apartments
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-[#302820] md:text-[34px]">Your Favorites</h1>
                <p className="mt-3 text-base font-medium text-[#756a60]">
                  {favoriteCount > 0 ? `${favoriteCount.toLocaleString()} ${favoriteCount === 1 ? "apartment" : "apartments"} saved for later` : "Save apartments you like and return to them anytime."}
                </p>
              </div>
              <div className="pointer-events-none absolute bottom-0 right-4 hidden w-[42%] text-[#b9a58f] md:block"><FavoriteHomeLineArt /></div>
            </section>

            <section className="mt-5 flex flex-col gap-3 rounded-xl border border-[#e8ded1] bg-white p-2 shadow-[0_2px_10px_rgba(48,40,32,0.035)] sm:p-2.5 lg:flex-row lg:items-center lg:justify-between">
              <select value={filter} onChange={(event) => setFilter(event.target.value as FavoriteFilter)} className="h-12 rounded-lg border border-[#e8ded1] bg-white px-4 text-sm font-bold text-[#302820] outline-none focus:border-[#8b735b] focus:ring-2 focus:ring-[#8b735b]/15">
                <option value="all">All Favorites ({favoriteCount})</option>
                <option value="available">Available Only</option>
                <option value="unavailable">Unavailable</option>
              </select>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select value={sort} onChange={(event) => setSort(event.target.value as FavoriteSort)} className="h-12 rounded-lg border border-[#e8ded1] bg-white px-4 text-sm font-bold text-[#302820] outline-none focus:border-[#8b735b] focus:ring-2 focus:ring-[#8b735b]/15">
                  <option value="newest">Newest Added</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name</option>
                </select>
                <div className="grid h-12 grid-cols-2 rounded-lg border border-[#e8ded1] bg-white p-1">
                  <button onClick={() => setViewMode("grid")} className={`flex h-10 w-12 items-center justify-center rounded-md transition ${viewMode === "grid" ? "bg-[#f3efeA] text-[#8b735b]" : "text-[#756a60] hover:bg-[#faf8f5]"}`} aria-label="Grid view">
                    <Grid2X2 className="h-5 w-5" />
                  </button>
                  <button onClick={() => setViewMode("list")} className={`flex h-10 w-12 items-center justify-center rounded-md transition ${viewMode === "list" ? "bg-[#f3efeA] text-[#8b735b]" : "text-[#756a60] hover:bg-[#faf8f5]"}`} aria-label="List view">
                    <List className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-5">
              {isLoading ? (
                <div className="flex min-h-72 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-500 shadow-sm">
                  Loading favorites...
                </div>
              ) : favoriteCount === 0 ? (
                <div className="flex min-h-[230px] flex-col items-center justify-center rounded-xl border border-[#e8ded1] bg-white p-6 text-center shadow-[0_2px_10px_rgba(48,40,32,0.035)]">
                  <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-[#e8ded1] bg-[#faf8f5] text-[#8b735b]">
                    <Heart className="h-7 w-7" />
                  </div>
                  <h2 className="text-[22px] font-bold text-[#302820]">No favorites yet</h2>
                  <p className="mt-2 max-w-md text-base font-medium leading-6 text-[#756a60]">Save apartments you like and they'll appear here.</p>
                  <Button onClick={() => navigate("/browse")} className="mt-5 h-11 rounded-[10px] bg-[#8b735b] px-5 font-bold text-white transition-colors duration-200 hover:bg-[#75604d]">
                    Browse Apartments
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : visibleFavorites.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                  <Search className="mb-4 h-10 w-10 text-slate-300" />
                  <h2 className="text-xl font-black text-slate-950">No favorites match this filter</h2>
                  <Button variant="outline" onClick={() => setFilter("all")} className="mt-5 rounded-lg font-black">Show All Favorites</Button>
                </div>
              ) : (
                <div className={viewMode === "grid" ? "grid grid-cols-1 gap-6 xl:grid-cols-2" : "space-y-6"}>
                  {visibleFavorites.map((apartment) => (
                    <FavoriteCard key={apartment.id} apartment={apartment} />
                  ))}
                </div>
              )}
            </section>

            {favoriteCount > 0 && <section className="my-6 flex flex-col gap-4 rounded-xl border border-[#e8ded1] bg-[#faf8f5] p-5 sm:flex-row sm:items-center">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#e8ded1] bg-white text-[#8b735b]">
                <Building2 className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-[#302820]">Explore more apartments</h2>
                <p className="mt-1 text-sm font-medium text-[#756a60]">Find more places you'll love and add to your favorites.</p>
              </div>
              <Button onClick={() => navigate("/browse")} className="rounded-lg bg-[#8b735b] px-6 font-bold text-white hover:bg-[#75604d]">
                Browse Apartments
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </section>}
          </div>
        </main>
      </div>
    </div>
  );
}

function InfoPill({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Bed;
  value: string;
  label: string;
  tone: string;
}) {
  return (
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
}
