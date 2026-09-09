import { Button } from "@/app/shared/components/ui/button";
import { Bookmark, Building2, ChevronRight, Grid2X2, Heart, List, Search } from "lucide-react";
import type { Apartment } from "@/app/shared/data/apartments";
import type { NavigateFunction } from "react-router-dom";
import type { ApartmentRatingStats } from "@/app/shared/services/apartmentRatingsService";
import { EmptyState } from "@/app/tenant/components/dashboard/EmptyState";
import { FavoriteApartmentCard } from "@/app/tenant/components/dashboard/FavoriteApartmentCard";

interface FavoritesSectionProps {
  favoriteApartments: Apartment[];
  visibleFavoriteApartments: Apartment[];
  favoriteFilter: "all" | "available";
  setFavoriteFilter: (filter: "all" | "available") => void;
  favoriteSort: "newest" | "price-low" | "price-high" | "name";
  setFavoriteSort: (sort: "newest" | "price-low" | "price-high" | "name") => void;
  favoriteView: "grid" | "list";
  setFavoriteView: (view: "grid" | "list") => void;
  removingFavoriteId: string | null;
  removeFavorite: (apartmentId: string) => Promise<void>;
  ratingSummary: { byApartment: Map<string, ApartmentRatingStats> };
  ratingsLoading: boolean;
  navigate: NavigateFunction;
}

export const FavoritesSection = ({
  favoriteApartments,
  visibleFavoriteApartments,
  favoriteFilter,
  setFavoriteFilter,
  favoriteSort,
  setFavoriteSort,
  favoriteView,
  setFavoriteView,
  removingFavoriteId,
  removeFavorite,
  ratingSummary,
  ratingsLoading,
  navigate,
}: FavoritesSectionProps) => (
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
          <FavoriteApartmentCard key={apartment.id} apartment={apartment} favoriteView={favoriteView} removingFavoriteId={removingFavoriteId} removeFavorite={removeFavorite} ratingSummary={ratingSummary} ratingsLoading={ratingsLoading} />
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
