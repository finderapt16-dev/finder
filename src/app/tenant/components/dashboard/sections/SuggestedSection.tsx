import { ApartmentCard } from "@/app/shared/components/common/ApartmentCard";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import type { Apartment } from "@/app/shared/data/apartments";
import type { NavigateFunction } from "react-router-dom";
import type { ApartmentRatingStats } from "@/app/shared/services/apartmentRatingsService";
import { SuggestedLineArt } from "@/app/tenant/components/dashboard/illustrations/SuggestedLineArt";
import { EmptyState } from "@/app/tenant/components/dashboard/EmptyState";

interface SuggestedSectionProps {
  hasPersonalizationPreferences: boolean;
  preferencesLoading: boolean;
  suggestedApartments: Apartment[];
  ratingSummary: { byApartment: Map<string, ApartmentRatingStats> };
  ratingsLoading: boolean;
  navigate: NavigateFunction;
}

export const SuggestedSection = ({
  hasPersonalizationPreferences,
  preferencesLoading,
  suggestedApartments,
  ratingSummary,
  ratingsLoading,
  navigate,
}: SuggestedSectionProps) => (
  <div className="suggested-page mx-auto max-w-7xl space-y-5">
    <section className="suggested-hero relative flex min-h-[180px] items-center overflow-hidden rounded-xl border border-[#e8ded1] bg-gradient-to-r from-[#faf8f5] to-[#fffdfb] p-6 md:px-8">
      <div className="relative z-10 max-w-[58%] max-md:max-w-full">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8ded1] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8b735b] shadow-sm">
          <Sparkles className="h-4 w-4" />
          {hasPersonalizationPreferences ? "Based on Your Preferences" : "Apartment Listings"}
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[#302820] md:text-[34px]">{hasPersonalizationPreferences ? "Suggested for You" : "Find Apartments for You"}</h2>
        <p className="mt-3 text-base font-medium text-[#756a60]">{hasPersonalizationPreferences ? "Apartment suggestions based on your preferences." : "Set your preferences to receive personalized apartment suggestions."}</p>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-3 hidden w-[43%] items-end text-[#b9a58f] md:flex"><SuggestedLineArt /></div>
    </section>
    <div className="flex justify-end">
      <Button onClick={() => navigate("/browse")} variant="outline" className="h-11 rounded-lg border-[#e8ded1] bg-white px-5 font-bold text-[#8b735b] hover:bg-[#faf8f5]">Browse All</Button>
    </div>
    {preferencesLoading ? (
      <div className="flex min-h-72 items-center justify-center rounded-lg border border-slate-200 bg-white"><Loader2 className="h-7 w-7 animate-spin text-[#8b735b]" /></div>
    ) : !hasPersonalizationPreferences ? (
      <EmptyState icon={Sparkles} message="Set your preferences to receive personalized apartment suggestions." actionLabel="Set Preferences" action={() => navigate("/browse?preferences=open")} />
    ) : suggestedApartments.length > 0 ? (
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
        message="No apartments currently match your preferences."
        actionLabel="Adjust Preferences"
        action={() => navigate("/browse?preferences=open")}
      />
    )}
  </div>
);
