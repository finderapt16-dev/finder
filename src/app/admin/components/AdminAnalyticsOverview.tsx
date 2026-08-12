import { BarChart3, Building2, Eye, Heart, RefreshCw, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/app/shared/components/ui/button";
import {
  fetchAdminAnalyticsData,
  type AdminAnalyticsData,
} from "@/app/shared/services/dashboardSupabaseService";
import { supabase } from "@/lib/supabaseclient";

type PeriodDays = 1 | 7 | 30 | 90;
type PeriodSelection = PeriodDays | "custom";
type Bucket = { key: string; label: string; start: number; end: number };

const MANILA_TIME_ZONE = "Asia/Manila";
const STATUS_COLORS = ["#22c55e", "#f59e0b", "#94a3b8", "#ef4444", "#8b5cf6"];

function manilaDateKey(value: Date | string | number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function dateKeyToUtc(key: string): number {
  return Date.parse(`${key}T00:00:00.000Z`);
}

function makeBuckets(period: PeriodDays, customStart?: string, customEnd?: string): Bucket[] {
  const today = dateKeyToUtc(manilaDateKey(new Date()));
  const requestedStart = customStart ? dateKeyToUtc(customStart) : Number.NaN;
  const requestedEnd = customEnd ? dateKeyToUtc(customEnd) : Number.NaN;
  const hasCustomRange = Number.isFinite(requestedStart) && Number.isFinite(requestedEnd) && requestedStart <= requestedEnd;
  const startDay = hasCustomRange ? requestedStart : today - (period - 1) * 86_400_000;
  const endDay = hasCustomRange ? Math.min(requestedEnd, today) : today;
  const effectiveDays = Math.max(1, Math.round((endDay - startDay) / 86_400_000) + 1);
  const bucketSize = effectiveDays <= 7 ? 1 : effectiveDays <= 30 ? 3 : 7;
  const buckets: Bucket[] = [];

  for (let offset = 0; offset < effectiveDays; offset += bucketSize) {
    const bucketStart = startDay + offset * 86_400_000;
    const bucketEnd = Math.min(endDay + 86_399_999, bucketStart + bucketSize * 86_400_000 - 1);
    buckets.push({
      key: new Date(bucketStart).toISOString(),
      label: new Intl.DateTimeFormat("en-PH", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
      }).format(bucketStart),
      start: bucketStart,
      end: bucketEnd,
    });
  }
  return buckets;
}

function timestampInBucket(value: string | null | undefined, bucket: Bucket): boolean {
  if (!value) return false;
  const timestamp = dateKeyToUtc(manilaDateKey(value));
  return timestamp >= bucket.start && timestamp <= bucket.end;
}

function percentage(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

function Donut({ values, colors, center }: { values: number[]; colors: string[]; center: ReactNode }) {
  const total = values.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  const segments = total === 0
    ? "#e2e8f0 0 100%"
    : values.map((value, index) => {
      const start = cursor;
      cursor += (value / total) * 100;
      return `${colors[index]} ${start}% ${cursor}%`;
    }).join(", ");

  return (
    <div
      className="relative h-32 w-32 shrink-0 rounded-full"
      style={{ background: `conic-gradient(${segments})` }}
      role="img"
      aria-label={`${total} total records`}
    >
      <div className="absolute inset-[18%] flex items-center justify-center rounded-full bg-white text-center">{center}</div>
    </div>
  );
}

function LineChart({
  buckets,
  submitted,
  published,
}: {
  buckets: Bucket[];
  submitted: number[];
  published: number[];
}) {
  const width = 720;
  const height = 220;
  const left = 34;
  const right = 12;
  const top = 16;
  const bottom = 38;
  const max = Math.max(1, ...submitted, ...published);
  const x = (index: number) => left + (index / Math.max(1, buckets.length - 1)) * (width - left - right);
  const y = (value: number) => top + (1 - value / max) * (height - top - bottom);
  const points = (values: number[]) => values.map((value, index) => `${x(index)},${y(value)}`).join(" ");

  return (
    <div className="min-w-0 overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Apartment submissions and publications over the selected period">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const gridY = top + ratio * (height - top - bottom);
          return <line key={ratio} x1={left} x2={width - right} y1={gridY} y2={gridY} stroke="#e2e8f0" strokeWidth="1" />;
        })}
        <polyline fill="none" stroke="#f97316" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points(submitted)} />
        <polyline fill="none" stroke="#22c55e" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points(published)} />
        {submitted.map((value, index) => <circle key={`s-${buckets[index].key}`} cx={x(index)} cy={y(value)} r="4" fill="#f97316"><title>{`${buckets[index].label}: ${value} submitted`}</title></circle>)}
        {published.map((value, index) => <circle key={`p-${buckets[index].key}`} cx={x(index)} cy={y(value)} r="4" fill="#22c55e"><title>{`${buckets[index].label}: ${value} published`}</title></circle>)}
        {buckets.map((bucket, index) => (
          <text key={bucket.key} x={x(index)} y={height - 12} textAnchor="middle" className="fill-slate-400 text-[10px] font-semibold">
            {buckets.length > 10 && index % 2 === 1 ? "" : bucket.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function CardState({ loading, error, empty, children }: { loading: boolean; error: string | null; empty: boolean; children: ReactNode }) {
  if (loading) return <div className="flex min-h-48 items-center justify-center text-xs font-semibold text-slate-400"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Loading analytics...</div>;
  if (error) return <div className="flex min-h-48 items-center justify-center rounded-lg bg-rose-50 p-5 text-center text-xs font-semibold text-rose-600">{error}</div>;
  if (empty) return <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 p-5 text-center text-xs font-semibold text-slate-400">No records are available for this view yet.</div>;
  return <>{children}</>;
}

export function AdminAnalyticsOverview() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [period, setPeriod] = useState<PeriodSelection>(30);
  const [customStart, setCustomStart] = useState(manilaDateKey(Date.now() - 29 * 86_400_000));
  const [customEnd, setCustomEnd] = useState(manilaDateKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequestRef = useRef(false);
  const queuedRequestRef = useRef(false);
  const mountedRef = useRef(true);
  const prefersReducedMotion = useReducedMotion();

  const load = useCallback(async () => {
    if (activeRequestRef.current) {
      queuedRequestRef.current = true;
      return;
    }
    activeRequestRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const nextData = await fetchAdminAnalyticsData();
      if (mountedRef.current) setData(nextData);
    } catch (loadError) {
      if (mountedRef.current) setError(loadError instanceof Error ? loadError.message : "Analytics could not be refreshed.");
    } finally {
      activeRequestRef.current = false;
      if (mountedRef.current) setLoading(false);
      if (queuedRequestRef.current && mountedRef.current) {
        queuedRequestRef.current = false;
        void load();
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => { mountedRef.current = false; };
  }, [load]);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void load(), 150);
    };
    const channel = supabase
      .channel("admin-analytics-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "apartments" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_rooms" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_views" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites" }, scheduleRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "app_users" }, scheduleRefresh)
      .subscribe();
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const analytics = useMemo(() => {
    const buckets = period === "custom"
      ? makeBuckets(30, customStart, customEnd)
      : makeBuckets(period);
    const activeApartments = (data?.apartments ?? []).filter((apartment) => !apartment.deleted_at && !apartment.is_archived);
    const activeIds = new Set(activeApartments.map((apartment) => apartment.id));
    const submitted = buckets.map((bucket) => activeApartments.filter((apartment) => timestampInBucket(apartment.created_at, bucket)).length);
    const published = buckets.map((bucket) => activeApartments.filter((apartment) => timestampInBucket(apartment.published_at, bucket)).length);
    const statusCounts = [
      activeApartments.filter((apartment) => apartment.is_published).length,
      activeApartments.filter((apartment) => !apartment.is_published && apartment.approval_status === "pending").length,
      activeApartments.filter((apartment) => !apartment.is_published && apartment.approval_status === "approved").length,
      activeApartments.filter((apartment) => !apartment.is_published && apartment.approval_status === "rejected").length,
      activeApartments.filter((apartment) => !apartment.is_published && !["pending", "approved", "rejected"].includes(apartment.approval_status ?? "")).length,
    ];
    const periodViews = (data?.views ?? []).filter((view) => activeIds.has(view.apartment_id) && buckets.some((bucket) => timestampInBucket(view.viewed_at, bucket)));
    const periodFavorites = (data?.favorites ?? []).filter((favorite) => activeIds.has(favorite.apartment_id) && buckets.some((bucket) => timestampInBucket(favorite.created_at, bucket)));
    const demandByBucket = buckets.map((bucket) => ({
      views: periodViews.filter((view) => timestampInBucket(view.viewed_at, bucket)).reduce((sum, view) => sum + Math.max(0, Number(view.view_count) || 0), 0),
      favorites: periodFavorites.filter((favorite) => timestampInBucket(favorite.created_at, bucket)).length,
    }));
    const rooms = activeApartments.flatMap((apartment) => apartment.apartment_rooms ?? []);
    const roomCounts = ["available", "occupied", "reserved", "maintenance"].map((status) => rooms.filter((room) => {
      const normalized = room.status ?? (room.is_occupied ? "occupied" : "available");
      return normalized === status;
    }).length);
    const landlords = data?.users ?? [];
    const verificationCategory = (landlord: (typeof landlords)[number]) => {
      if (landlord.is_verified) return 0;
      const statuses = [landlord.status, landlord.verification_status, landlord.landlord_status]
        .map((value) => String(value ?? "").toLowerCase());
      if (statuses.includes("rejected")) return 2;
      if (statuses.includes("pending") || statuses.includes("unverified")) return 1;
      return 3;
    };
    const verificationCounts = [0, 1, 2, 3].map((category) => landlords.filter((landlord) => verificationCategory(landlord) === category).length);
    return {
      buckets, submitted, published, activeApartments, statusCounts, demandByBucket,
      totalViews: periodViews.reduce((sum, view) => sum + Math.max(0, Number(view.view_count) || 0), 0),
      totalFavorites: periodFavorites.length, roomCounts, rooms, verificationCounts, landlords,
    };
  }, [customEnd, customStart, data, period]);

  const statusLabels = ["Published", "Pending verification", "Unpublished", "Rejected", "Unknown status"];
  const roomLabels = ["Available", "Occupied", "Reserved", "Maintenance"];
  const roomColors = ["#22c55e", "#3b82f6", "#8b5cf6", "#f97316"];
  const verificationLabels = ["Verified", "Pending", "Rejected", "Incomplete"];
  const verificationColors = ["#22c55e", "#f59e0b", "#ef4444", "#94a3b8"];
  const demandMax = Math.max(1, ...analytics.demandByBucket.map((bucket) => bucket.views));

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-orange-500" /><h2 className="text-lg font-black text-slate-950">Analytics Overview</h2></div>
          <p className="mt-1 text-xs font-medium text-slate-500">Monitor apartment activity, demand, availability, and verification performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="analytics-period">Analytics period</label>
          <select id="analytics-period" value={period} onChange={(event) => setPeriod(event.target.value === "custom" ? "custom" : Number(event.target.value) as PeriodDays)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100">
            <option value={1}>Today</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value="custom">Custom range</option>
          </select>
          {period === "custom" && <><label className="sr-only" htmlFor="analytics-start">Start date</label><input id="analytics-start" type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600" /><label className="sr-only" htmlFor="analytics-end">End date</label><input id="analytics-end" type="date" value={customEnd} min={customStart} max={manilaDateKey(new Date())} onChange={(event) => setCustomEnd(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600" /></>}
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()} className="h-9 rounded-lg border-slate-200 text-xs font-bold">
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />{loading ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </div>

      {error && data && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error} Existing analytics remain visible.</div>}

      <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <article className="min-w-0 rounded-xl border border-slate-200 p-4 lg:col-span-2 xl:col-span-2">
          <div className="mb-2"><h3 className="text-sm font-black text-slate-900">Apartment Activity Trend</h3><p className="text-[11px] font-medium text-slate-500">Submissions and publications grouped in Asia/Manila time.</p></div>
          <div className="mb-1 flex flex-wrap gap-4 text-[10px] font-bold text-slate-500"><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-orange-500" />Submitted</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-green-500" />Published</span></div>
          <CardState loading={loading && !data} error={!data ? error : null} empty={analytics.submitted.every((value) => value === 0) && analytics.published.every((value) => value === 0)}>
            <LineChart buckets={analytics.buckets} submitted={analytics.submitted} published={analytics.published} />
          </CardState>
        </article>

        <article className="rounded-xl border border-slate-200 p-4">
          <div><h3 className="text-sm font-black text-slate-900">Listing Status</h3><p className="text-[11px] font-medium text-slate-500">Current non-deleted apartment records.</p></div>
          <CardState loading={loading && !data} error={!data ? error : null} empty={analytics.activeApartments.length === 0}>
            <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row lg:flex-col 2xl:flex-row">
              <Donut values={analytics.statusCounts} colors={STATUS_COLORS} center={<div><strong className="block text-xl font-black text-slate-950">{analytics.activeApartments.length}</strong><span className="text-[9px] font-bold text-slate-400">Total</span></div>} />
              <div className="w-full min-w-0 space-y-2">{statusLabels.map((label, index) => <div key={label} className="flex items-center gap-2 text-[10px]"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[index] }} /><span className="min-w-0 flex-1 truncate font-semibold text-slate-600">{label}</span><strong className="text-slate-900">{analytics.statusCounts[index]} ({percentage(analytics.statusCounts[index], analytics.activeApartments.length)}%)</strong></div>)}</div>
            </div>
          </CardState>
        </article>

        <article className="rounded-xl border border-slate-200 p-4">
          <div><h3 className="text-sm font-black text-slate-900">Rental Demand</h3><p className="text-[11px] font-medium text-slate-500">Stored tenant engagement during the selected period.</p></div>
          <CardState loading={loading && !data} error={!data ? error : null} empty={analytics.totalViews === 0 && analytics.totalFavorites === 0}>
            <div className="mt-4 flex h-20 items-end gap-1" aria-label="Apartment views by period bucket">{analytics.demandByBucket.map((bucket, index) => <div key={analytics.buckets[index].key} className="group relative flex min-w-0 flex-1 items-end"><div className="w-full rounded-t bg-orange-400/80" style={{ height: `${Math.max(4, (bucket.views / demandMax) * 72)}px` }} title={`${analytics.buckets[index].label}: ${bucket.views} views, ${bucket.favorites} favorites`} /></div>)}</div>
            <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg bg-blue-50 p-3"><Eye className="h-4 w-4 text-blue-600" /><strong className="mt-2 block text-xl font-black text-slate-950">{analytics.totalViews.toLocaleString()}</strong><span className="text-[10px] font-bold text-slate-500">Views</span></div><div className="rounded-lg bg-rose-50 p-3"><Heart className="h-4 w-4 text-rose-500" /><strong className="mt-2 block text-xl font-black text-slate-950">{analytics.totalFavorites.toLocaleString()}</strong><span className="text-[10px] font-bold text-slate-500">Favorites added</span></div></div>
          </CardState>
        </article>

        <article className="rounded-xl border border-slate-200 p-4">
          <div><h3 className="text-sm font-black text-slate-900">Room Availability</h3><p className="text-[11px] font-medium text-slate-500">Current room status across active apartments.</p></div>
          <CardState loading={loading && !data} error={!data ? error : null} empty={analytics.rooms.length === 0}>
            <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row lg:flex-col 2xl:flex-row"><Donut values={analytics.roomCounts} colors={roomColors} center={<div><strong className="block text-xl font-black text-slate-950">{analytics.rooms.length}</strong><span className="text-[9px] font-bold text-slate-400">Rooms</span></div>} /><div className="w-full space-y-2">{roomLabels.map((label, index) => <div key={label} className="flex items-center gap-2 text-[10px]"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: roomColors[index] }} /><span className="flex-1 font-semibold text-slate-600">{label}</span><strong>{analytics.roomCounts[index]} ({percentage(analytics.roomCounts[index], analytics.rooms.length)}%)</strong></div>)}</div></div>
          </CardState>
        </article>

        <article className="rounded-xl border border-slate-200 p-4">
          <div><h3 className="text-sm font-black text-slate-900">Verification Progress</h3><p className="text-[11px] font-medium text-slate-500">Current landlord verification state.</p></div>
          <CardState loading={loading && !data} error={!data ? error : null} empty={analytics.landlords.length === 0}>
            <div className="mt-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><ShieldCheck className="h-5 w-5" /></span><div><strong className="text-2xl font-black text-emerald-600">{percentage(analytics.verificationCounts[0], analytics.landlords.length)}%</strong><p className="text-[10px] font-bold text-slate-400">Landlords verified</p></div></div>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100">{analytics.verificationCounts.map((count, index) => <span key={verificationLabels[index]} style={{ width: `${percentage(count, analytics.landlords.length)}%`, backgroundColor: verificationColors[index] }} title={`${verificationLabels[index]}: ${count}`} />)}</div>
            <div className="mt-5 grid grid-cols-2 gap-2">{verificationLabels.map((label, index) => <div key={label} className="rounded-lg bg-slate-50 p-2.5"><span className="text-[9px] font-bold text-slate-500">{label}</span><strong className="block text-lg font-black" style={{ color: verificationColors[index] }}>{analytics.verificationCounts[index]}</strong></div>)}</div>
          </CardState>
        </article>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-slate-400"><Building2 className="h-3 w-3" />Deleted and archived apartments are excluded from listing, room, view, and favorite totals.</p>
    </motion.section>
  );
}
