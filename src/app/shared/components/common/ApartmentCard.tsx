import { Bath, Bed, Heart, MapPin, Square } from "lucide-react";
import type { ApartmentRatingStats } from "../../services/apartmentRatingsService";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Apartment } from "../../data/apartments";
import { useFavorites } from "../../hooks/useFavorites";
import { isTenantRole } from "../../services/authService";
import { formatApartmentLocation } from "../../utils/apartmentLocation";
import { getImageUrl } from "../../utils/images";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { VerifiedBadge } from "./VerifiedBadge";
import { ApartmentRatingSummary } from "./ApartmentRatingSummary";
import { ImageWithFallback } from "../figma/ImageWithFallback";

interface ApartmentCardProps {
  apartment: Apartment;
  ratingStats?: ApartmentRatingStats;
  ratingsLoading?: boolean;
  detailState?: {
    returnTo?: string;
    backLabel?: string;
  };
}

const STATUS_BADGE: Record<string, string> = {
  available: "bg-green-600 text-white",
  occupied: "bg-red-600 text-white",
  maintenance: "bg-slate-500 text-white",
};

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  maintenance: "Under Maintenance",
};

export function ApartmentCard({ apartment, detailState, ratingStats, ratingsLoading }: ApartmentCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user, users } = useAuth();
  const favorite = isFavorite(apartment.id);
  const isOwnListing = user?.role === "landlord" && apartment.landlordId === user.id;
  const showFavoriteButton = isTenantRole(user?.role) && !isOwnListing;

  const landlord = apartment.landlordId ? users.find((entry) => entry.id === apartment.landlordId) : undefined;
  const verifiedLandlord = apartment.landlordVerified ?? landlord?.isVerified === true;
  const locationText = formatApartmentLocation(apartment);
  const imageUrl = getImageUrl(apartment.image || apartment.images?.[0] || "");
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(apartment.id);
  };

  return (
    <Link to={`/apartment/${apartment.id}`} state={detailState}>
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:transform hover:-translate-y-2 border-2 hover:border-[#E8DED1] animate-fade-in">
        <div className="relative aspect-[4/3] overflow-hidden group">
          {imageUrl ? <ImageWithFallback src={imageUrl} alt={apartment.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" /> : <div className="flex h-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500">Image unavailable</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {showFavoriteButton && (
            <Button
              variant="ghost"
              size="icon"
              className={`absolute right-2 top-2 rounded-full bg-white/90 backdrop-blur-md hover:bg-white shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 ${
                favorite ? "text-rose-500" : ""
              }`}
              onClick={handleFavoriteClick}
              aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`h-5 w-5 ${favorite ? "animate-pulse" : ""}`} fill={favorite ? "currentColor" : "none"} />
            </Button>
          )}
          <div className="absolute left-2 top-2 flex flex-col gap-2 animate-slide-in-left">
            {verifiedLandlord && (
              <VerifiedBadge label="Verified Listing" className="bg-white/95 shadow-lg backdrop-blur-sm" />
            )}
            {apartment.petFriendly && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg">Pet Friendly</Badge>
            )}
            <Badge className={`${STATUS_BADGE[apartment.status ?? "available"]} shadow-lg`}>
              {STATUS_LABEL[apartment.status ?? "available"]}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4 bg-gradient-to-br from-white to-[#FAF8F5]/30">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1 text-slate-900 group-hover:text-[#756A60] transition-colors">{apartment.title}</h3>
              <ApartmentRatingSummary stats={ratingStats} isLoading={ratingsLoading} className="mb-2" />
              <div className="flex items-center text-slate-600 text-sm mb-3">
                <MapPin className="h-4 w-4 mr-1 text-[#8B735B]" />
                <span>{locationText}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-[#756A60]">View room prices</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600 border-t border-[#F3EFEA] pt-3 mt-3">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4 text-[#8B735B]" />
              <span>{apartment.bedrooms} bed</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4 text-purple-500" />
              <span>{apartment.bathrooms} bath</span>
            </div>
            <div className="flex items-center gap-1">
              <Square className="h-4 w-4 text-[#8B735B]" />
              <span>{apartment.sqft} sqft</span>
            </div>
          </div>

        </CardContent>
      </Card>
    </Link>
  );
}

