import { ApartmentRatingSummary } from "@/app/shared/components/common/ApartmentRatingSummary";
import { VerifiedBadge } from "@/app/shared/components/common/VerifiedBadge";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { formatApartmentLocation } from "@/app/shared/utils/apartmentLocation";
import { getImageUrl } from "@/app/shared/utils/images";
import { Bath, Bed, Bookmark, Building2, Eye, Heart, MapPin, Square, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { Apartment } from "@/app/shared/data/apartments";
import type { ApartmentRatingStats } from "@/app/shared/services/apartmentRatingsService";
import { getAvailableRoomCount as getAvailableRooms } from "@/app/shared/utils/listingVisibility";
import { InfoPill } from "@/app/tenant/components/dashboard/InfoPill";

interface FavoriteApartmentCardProps {
  apartment: Apartment;
  favoriteView: "grid" | "list";
  removingFavoriteId: string | null;
  removeFavorite: (apartmentId: string) => Promise<void>;
  ratingSummary: { byApartment: Map<string, ApartmentRatingStats> };
  ratingsLoading: boolean;
}

export const FavoriteApartmentCard = ({
  apartment,
  favoriteView,
  removingFavoriteId,
  removeFavorite,
  ratingSummary,
  ratingsLoading,
}: FavoriteApartmentCardProps) => {
  const status = apartment.status ?? "available";
  const statusClass: Record<string, string> = {
    available: "bg-emerald-600 text-white",
    occupied: "bg-rose-600 text-white",
    maintenance: "bg-slate-600 text-white",
  };
  const statusLabel: Record<string, string> = {
    available: "Available",
    occupied: "Occupied",
    maintenance: "Under Maintenance",
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
