import { Star } from "lucide-react";
import type { ApartmentRatingStats } from "../../services/apartmentRatingsService";

interface ApartmentRatingSummaryProps {
  stats?: ApartmentRatingStats;
  isLoading?: boolean;
  className?: string;
}

export function ApartmentRatingSummary({ stats, isLoading = false, className = "" }: ApartmentRatingSummaryProps) {
  if (isLoading) {
    return <span className={`inline-block h-4 w-28 animate-pulse rounded bg-slate-200 ${className}`} aria-label="Loading apartment rating" />;
  }

  if (!stats || stats.count < 1) {
    return <span className={`text-xs font-semibold text-slate-400 ${className}`}>No ratings yet</span>;
  }

  const ratingLabel = `${stats.average.toFixed(1)} (${stats.count.toLocaleString()} ${stats.count === 1 ? "rating" : "ratings"})`;
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 text-xs font-bold text-slate-600 ${className}`} aria-label={`${ratingLabel} from tenants`}>
      <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" aria-hidden="true" />
      <span className="whitespace-nowrap">{ratingLabel}</span>
    </span>
  );
}
