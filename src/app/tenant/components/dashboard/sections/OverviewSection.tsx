import { Button } from "@/app/shared/components/ui/button";
import { ChevronRight, Clock, Heart, LayoutDashboard, Search, Sparkles, TrendingUp } from "lucide-react";
import type { Apartment } from "@/app/shared/data/apartments";
import type { NavigateFunction } from "react-router-dom";
import { SummaryCard } from "@/app/tenant/components/dashboard/SummaryCard";
import { FeatureCard } from "@/app/tenant/components/dashboard/FeatureCard";
import { EmptyState } from "@/app/tenant/components/dashboard/EmptyState";

interface OverviewSectionProps {
  tenantGreeting: string;
  dashboardSubtitle: string;
  favoriteIds: string[];
  availableApartments: Apartment[];
  availableRoomsCount: number;
  hasPersonalizationPreferences: boolean;
  suggestedApartments: Apartment[];
  popularApartments: Apartment[];
  setActiveSection: (section: string) => void;
  navigate: NavigateFunction;
}

export const OverviewSection = ({
  tenantGreeting,
  dashboardSubtitle,
  favoriteIds,
  availableApartments,
  availableRoomsCount,
  hasPersonalizationPreferences,
  suggestedApartments,
  popularApartments,
  setActiveSection,
  navigate,
}: OverviewSectionProps) => (
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
      <FeatureCard setActiveSection={setActiveSection} title={hasPersonalizationPreferences ? "Suggested for You" : "Find Apartments for You"} description={hasPersonalizationPreferences ? "Apartment suggestions based on your preferences." : "Set your preferences to receive personalized apartment suggestions."} count={suggestedApartments.length} icon={Sparkles} section="suggested" accent="orange" />
      <FeatureCard setActiveSection={setActiveSection} title="Popular Apartments" description="Apartments receiving more interest from AptFindr users through views and favorites." count={popularApartments.length} icon={TrendingUp} section="popular" accent="indigo" />
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
