import { type Apartment } from "@/app/shared/data/apartments";
import { type ApartmentRatingRow } from "@/app/shared/services/apartmentRatingsService";
import { type DashboardApartmentViewRow, type DashboardFavoriteRow } from "@/app/shared/services/dashboardSupabaseService";
import { Calendar, Clock, Eye, Heart, Star, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";
import { PropertyActivityEmptyIllustration } from "@/app/landlord/components/dashboard/illustrations/PropertyActivityEmptyIllustration";

interface ActivitySectionProps {
  activityRange: "all" | "today" | "7d" | "30d";
  landlordViewRows: DashboardApartmentViewRow[];
  landlordFavoriteRows: DashboardFavoriteRow[];
  ratingRows: ApartmentRatingRow[];
  propertyIds: Set<string>;
  myApartments: Apartment[];
  getViewWeight: (view: DashboardApartmentViewRow) => number;
  setActivityRange: Dispatch<SetStateAction<"all" | "today" | "7d" | "30d">>;
  isLoadingApartments: boolean;
  isLoadingActivityData: boolean;
}

export const ActivitySection = ({
  activityRange,
  landlordViewRows,
  landlordFavoriteRows,
  ratingRows,
  propertyIds,
  myApartments,
  getViewWeight,
  setActivityRange,
  isLoadingApartments,
  isLoadingActivityData,
}: ActivitySectionProps) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const rangeStart = activityRange === "today"
    ? todayStart
    : activityRange === "7d"
      ? weekStart
      : activityRange === "30d"
        ? monthStart
        : null;
  const isInSelectedRange = (value: string | null | undefined) => {
    if (rangeStart === null) return true;
    if (!value) return false;
    const timestamp = new Date(value).getTime();
    return !Number.isNaN(timestamp) && timestamp >= rangeStart;
  };
  const rangedViews = landlordViewRows.filter((view) => isInSelectedRange(view.viewed_at));
  const rangedFavorites = landlordFavoriteRows.filter((favorite) => isInSelectedRange(favorite.created_at));
  const ratingTimestamp = (rating: ApartmentRatingRow) => rating.updated_at || rating.created_at;
  const rangedRatings = ratingRows.filter((rating) => propertyIds.has(rating.apartment_id) && isInSelectedRange(ratingTimestamp(rating)));
  const findProperty = (apartmentId: string) => myApartments.find((apartment) => apartment.id === apartmentId);
  const recentActivity = [
    ...rangedViews.map((view) => {
      const apartmentId = view.apartment_id ?? view.apartmentId ?? "";
      const count = getViewWeight(view);
      return { id: `view-${view.id ?? `${apartmentId}-${view.viewed_at}`}`, timestamp: view.viewed_at ?? "", title: `${count.toLocaleString()} new ${count === 1 ? "view" : "views"}`, property: findProperty(apartmentId)?.title || "Untitled property", icon: Eye };
    }).filter((item) => item.title !== "0 new views"),
    ...rangedFavorites.map((favorite) => {
      const apartmentId = favorite.apartment_id ?? favorite.apartmentId ?? "";
      return { id: `favorite-${favorite.id ?? `${apartmentId}-${favorite.created_at}`}`, timestamp: favorite.created_at ?? "", title: "Added to Favorites", property: findProperty(apartmentId)?.title || "Untitled property", icon: Heart };
    }),
    ...rangedRatings.map((rating) => ({ id: `rating-${rating.id}`, timestamp: ratingTimestamp(rating), title: `Received a ${rating.rating}-star rating`, property: findProperty(rating.apartment_id)?.title || "Untitled property", icon: Star })),
  ].filter((item) => item.timestamp).sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
  const summaryCards = [
    { label: "Views", value: rangedViews.reduce((total, view) => total + getViewWeight(view), 0), help: "Property views", icon: Eye },
    { label: "Favorites", value: rangedFavorites.length, help: "Times tenants saved your properties", icon: Heart },
    { label: "Ratings", value: rangedRatings.length, help: "Ratings received", icon: Star },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><TrendingUp className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-wide text-[#8B735B]">Activity</p><h1 className="text-2xl font-black text-[#302820] sm:text-3xl">Property Activity</h1><p className="mt-1 text-sm font-medium text-[#756A60]">See how tenants interact with your properties.</p></div></div>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-[#EEE6DC] bg-white px-3 text-xs font-bold text-[#756A60] shadow-sm"><Calendar className="h-4 w-4 text-[#8B735B]" /><select value={activityRange} onChange={(event) => setActivityRange(event.target.value as typeof activityRange)} className="min-w-28 bg-transparent font-black text-[#302820] outline-none"><option value="today">Today</option><option value="7d">This Week</option><option value="30d">This Month</option><option value="all">All Time</option></select></label>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {summaryCards.map(({ label, value, help, icon: Icon }) => <motion.div key={label} whileHover={{ y: -2 }} className="rounded-xl border border-[#EEE6DC] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><Icon className="h-5 w-5" /></span><span className="text-sm font-black text-[#5F5A55]">{label}</span></div><strong className="mt-5 block text-3xl font-black text-[#302820]">{value.toLocaleString()}</strong><span className="mt-1 block text-xs font-medium leading-relaxed text-[#756A60]">{help}</span></motion.div>)}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#EEE6DC] bg-white shadow-sm">
        <div className="border-b border-[#EEE6DC] p-5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><Clock className="h-4 w-4" /></span><div><h2 className="font-black text-[#302820]">Recent Activity</h2><p className="text-xs font-medium text-[#756A60]">The latest tenant interactions during the selected period.</p></div></div></div>

        <div className="p-4 sm:p-5">
          {isLoadingApartments || isLoadingActivityData ? (
            <div className="flex min-h-80 items-center justify-center"><Clock className="h-7 w-7 animate-pulse text-[#8B735B]" /></div>
          ) : recentActivity.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-[#DCC9B4] bg-[#FAF8F5] p-8 text-center"><PropertyActivityEmptyIllustration /><h3 className="font-black text-[#302820]">No activity yet</h3><p className="mt-1 max-w-md text-sm font-medium text-[#756A60]">Tenant views, favorites, and ratings will appear here.</p></div>
          ) : (
            <div className="divide-y divide-[#EEE6DC]">
              {recentActivity.map(({ id, timestamp, title, property, icon: Icon }) => <article key={id} className="flex items-start gap-4 px-1 py-4 sm:px-2"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><Icon className="h-4.5 w-4.5" /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-black text-[#302820]">{title}</h3><p className="mt-0.5 truncate text-sm font-medium text-[#5F5A55]">{property}</p><time className="mt-1 block text-xs font-medium text-[#8A8179]">{new Date(timestamp).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</time></div></article>)}
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
};
