import { ApartmentCard } from "@/app/shared/components/common/ApartmentCard";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { TrendingUp } from "lucide-react";
import type { Apartment } from "@/app/shared/data/apartments";
import type { NavigateFunction } from "react-router-dom";
import type { ApartmentRatingStats } from "@/app/shared/services/apartmentRatingsService";
import { PopularLineArt } from "@/app/tenant/components/dashboard/illustrations/PopularLineArt";
import { EmptyState } from "@/app/tenant/components/dashboard/EmptyState";

interface PopularSectionProps {
  popularApartments: Apartment[];
  ratingSummary: { byApartment: Map<string, ApartmentRatingStats> };
  ratingsLoading: boolean;
  navigate: NavigateFunction;
}

export const PopularSection = ({
  popularApartments,
  ratingSummary,
  ratingsLoading,
  navigate,
}: PopularSectionProps) => (
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
      <EmptyState icon={TrendingUp} message="No popular apartments available right now." />
    )}
  </div>
);
