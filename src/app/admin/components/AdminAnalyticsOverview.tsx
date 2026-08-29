import { BarChart3, CalendarDays, Eye, Heart, Home, RefreshCw, Star } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/app/shared/components/ui/button";
import { fetchAdminAnalyticsData, type AdminAnalyticsData } from "@/app/shared/services/dashboardSupabaseService";
import { supabase } from "@/lib/supabaseClient";

type PeriodDays = 7 | 30 | 90;
type PeriodSelection = PeriodDays | "custom";
type Bucket = { key: string; label: string; start: number; end: number };
const MANILA = "Asia/Manila";
const BROWN = "#8B735B";
const GREEN = "#4f7d5e";

function dateKey(value: Date | string | number) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: MANILA, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
const utc = (key: string) => Date.parse(`${key}T00:00:00.000Z`);
function bucketsFor(period: PeriodDays, customStart?: string, customEnd?: string): Bucket[] {
  const today = utc(dateKey(new Date()));
  const requestedStart = customStart ? utc(customStart) : Number.NaN;
  const requestedEnd = customEnd ? utc(customEnd) : Number.NaN;
  const custom = Number.isFinite(requestedStart) && Number.isFinite(requestedEnd) && requestedStart <= requestedEnd;
  const start = custom ? requestedStart : today - (period - 1) * 86_400_000;
  const end = custom ? Math.min(requestedEnd, today) : today;
  const days = Math.max(1, Math.round((end - start) / 86_400_000) + 1);
  const size = days <= 7 ? 1 : days <= 30 ? 3 : 7;
  const result: Bucket[] = [];
  for (let offset = 0; offset < days; offset += size) {
    const bucketStart = start + offset * 86_400_000;
    result.push({ key: new Date(bucketStart).toISOString(), label: new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "short", day: "numeric" }).format(bucketStart), start: bucketStart, end: Math.min(end + 86_399_999, bucketStart + size * 86_400_000 - 1) });
  }
  return result;
}
function inBucket(value: string | null | undefined, bucket: Bucket) { if (!value) return false; const time = utc(dateKey(value)); return time >= bucket.start && time <= bucket.end; }
const percent = (value: number, total: number) => total ? Math.round(value / total * 100) : 0;
const peso = (value: number) => `₱${Math.round(value).toLocaleString("en-PH")}`;

function Trend({ buckets, first, second, label }: { buckets: Bucket[]; first: number[]; second: number[]; label: string }) {
  const w=620,h=150,l=16,r=10,t=12,b=27,max=Math.max(1,...first,...second);
  const x=(i:number)=>l+(i/Math.max(1,buckets.length-1))*(w-l-r), y=(v:number)=>t+(1-v/max)*(h-t-b);
  const points=(values:number[])=>values.map((value,index)=>`${x(index)},${y(value)}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-auto w-full" role="img" aria-label={label}>{[0,.5,1].map(q=><line key={q} x1={l} x2={w-r} y1={t+q*(h-t-b)} y2={t+q*(h-t-b)} stroke="#eee6dc"/>)}<polyline fill="none" stroke={BROWN} strokeWidth="2.5" points={points(first)}/><polyline fill="none" stroke={GREEN} strokeWidth="2.5" points={points(second)}/>{buckets.map((bucket,index)=><text key={bucket.key} x={x(index)} y={h-7} textAnchor="middle" className="fill-slate-400 text-[9px] font-semibold">{buckets.length>8&&index%2?"":bucket.label}</text>)}</svg>;
}
function Panel({ title, subtitle, className="", children }: { title:string; subtitle:string; className?:string; children:ReactNode }) { return <article className={`min-w-0 rounded-xl border border-[#E8DED1] bg-white p-4 ${className}`}><h3 className="text-xs font-black uppercase tracking-wide text-[#302820]">{title}</h3><p className="mt-1 text-[11px] text-[#756A60]">{subtitle}</p>{children}</article>; }
function Metric({ label, value, color="#302820", icon }: { label:string; value:number; color?:string; icon?:ReactNode }) { return <div className="rounded-lg border border-[#EEE6DC] p-3">{icon&&<span style={{color}}>{icon}</span>}<strong className="mt-1 block text-2xl" style={{color}}>{value.toLocaleString()}</strong><span className="text-[10px] font-bold text-[#756A60]">{label}</span></div>; }
function Row({ label, value, total, color, compact=false }: { label:string; value:number; total:number; color:string; compact?:boolean }) { return <div><div className={`flex justify-between font-semibold text-[#5F5A55] ${compact?"text-[9px]":"text-[10px]"}`}><span>{label}</span><strong>{value} ({percent(value,total)}%)</strong></div><div className={`${compact?"mt-0.5 h-1.5":"mt-1 h-2"} overflow-hidden rounded bg-[#F3EFEA]`}><span className="block h-full rounded" style={{width:`${percent(value,total)}%`,backgroundColor:color}}/></div></div>; }

export function AdminAnalyticsOverview() {
  const [data,setData]=useState<AdminAnalyticsData|null>(null),[period,setPeriod]=useState<PeriodSelection>(30);
  const [customStart,setCustomStart]=useState(dateKey(Date.now()-29*86_400_000)),[customEnd,setCustomEnd]=useState(dateKey(new Date()));
  const [loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
  const active=useRef(false),queued=useRef(false),mounted=useRef(true),reduced=useReducedMotion();
  const load=useCallback(async()=>{if(active.current){queued.current=true;return;}active.current=true;setLoading(true);setError(null);try{const next=await fetchAdminAnalyticsData();if(mounted.current)setData(next);}catch(cause){if(mounted.current)setError(cause instanceof Error?cause.message:"Analytics could not be refreshed.");}finally{active.current=false;if(mounted.current)setLoading(false);if(queued.current&&mounted.current){queued.current=false;void load();}}},[]);
  useEffect(()=>{mounted.current=true;void load();return()=>{mounted.current=false;}},[load]);
  useEffect(()=>{let timer:ReturnType<typeof setTimeout>|null=null;const refresh=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>void load(),180)};const channel=supabase.channel("admin-analytics-sync").on("postgres_changes",{event:"*",schema:"public",table:"apartments"},refresh).on("postgres_changes",{event:"*",schema:"public",table:"apartment_rooms"},refresh).on("postgres_changes",{event:"*",schema:"public",table:"apartment_views"},refresh).on("postgres_changes",{event:"*",schema:"public",table:"favorites"},refresh).on("postgres_changes",{event:"*",schema:"public",table:"apartment_ratings"},refresh).on("postgres_changes",{event:"UPDATE",schema:"public",table:"app_users"},refresh).subscribe();return()=>{if(timer)clearTimeout(timer);void supabase.removeChannel(channel);}},[load]);
  const a=useMemo(()=>{
    const buckets=period==="custom"?bucketsFor(30,customStart,customEnd):bucketsFor(period);
    const apartments=(data?.apartments??[]).filter(item=>!item.deleted_at&&!item.is_archived),ids=new Set(apartments.map(item=>item.id));
    const submitted=buckets.map(bucket=>apartments.filter(item=>inBucket(item.created_at,bucket)).length),published=buckets.map(bucket=>apartments.filter(item=>inBucket(item.published_at,bucket)).length);
    const views=(data?.views??[]).filter(item=>ids.has(item.apartment_id)&&buckets.some(bucket=>inBucket(item.viewed_at,bucket))),favorites=(data?.favorites??[]).filter(item=>ids.has(item.apartment_id)&&buckets.some(bucket=>inBucket(item.created_at,bucket)));
    const viewTrend=buckets.map(bucket=>views.filter(item=>inBucket(item.viewed_at,bucket)).reduce((sum,item)=>sum+Math.max(0,Number(item.view_count)||0),0)),favoriteTrend=buckets.map(bucket=>favorites.filter(item=>inBucket(item.created_at,bucket)).length);
    const currentListings=apartments.filter(item=>item.is_published&&item.approval_status==="approved"&&item.status==="available"),rooms=currentListings.flatMap(item=>item.apartment_rooms??[]),available=rooms.filter(room=>(room.status??(room.is_occupied?"occupied":"available"))==="available"&&!room.is_occupied),rents=available.map(room=>Number(room.rent)).filter(rent=>Number.isFinite(rent)&&rent>0);
    const listing=[apartments.filter(x=>x.is_published).length,apartments.filter(x=>!x.is_published&&x.approval_status==="pending").length,apartments.filter(x=>!x.is_published&&!["pending","rejected"].includes(x.approval_status??"")).length,apartments.filter(x=>!x.is_published&&x.approval_status==="rejected").length];
    const landlords=data?.users??[],category=(item:(typeof landlords)[number])=>{if(item.is_verified)return 0;const values=[item.status,item.verification_status,item.landlord_status].map(v=>String(v??"").toLowerCase());if(values.includes("rejected"))return 2;if(values.some(v=>["pending","unverified","under_review"].includes(v)))return 1;return 3;},verification=[0,1,2,3].map(index=>landlords.filter(item=>category(item)===index).length);
    const ratings=(data?.ratings??[]).filter(item=>ids.has(item.apartment_id)&&Number(item.rating)>=1&&Number(item.rating)<=5);
    return {buckets,apartments,submitted,published,views:viewTrend.reduce((x,y)=>x+y,0),favorites:favorites.length,viewTrend,favoriteTrend,available:available.length,rents,listing,landlords,verification,ratings};
  },[customEnd,customStart,data,period]);
  const average=a.ratings.length?a.ratings.reduce((sum,item)=>sum+Number(item.rating),0)/a.ratings.length:0,distribution=[5,4,3,2,1].map(star=>a.ratings.filter(item=>Number(item.rating)===star).length);
  return <motion.section initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} className="rounded-xl border border-[#E8DED1] bg-[#FCFAF7] p-4 sm:p-5">
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:justify-between"><div><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[#8B735B]"/><h2 className="text-sm font-black uppercase tracking-wide text-[#302820]">Descriptive Analytics</h2></div><p className="mt-1 text-xs text-[#756A60]">Descriptive insights based on recorded AptFindr platform activity.</p></div><div className="flex flex-wrap gap-1 self-start rounded-lg border border-[#E8DED1] bg-white p-1">{[7,30,90].map(days=><button key={days} onClick={()=>setPeriod(days as PeriodDays)} className={`h-8 rounded-md px-3 text-xs font-bold ${period===days?"bg-[#8B735B] text-white":"text-[#756A60] hover:bg-[#FAF8F5]"}`}>{days} Days</button>)}<button onClick={()=>setPeriod("custom")} className={`h-8 rounded-md px-3 text-xs font-bold ${period==="custom"?"bg-[#8B735B] text-white":"text-[#756A60] hover:bg-[#FAF8F5]"}`}>Custom</button><Button variant="ghost" size="sm" disabled={loading} onClick={()=>void load()} className="h-8 px-2"><RefreshCw className={`h-3.5 w-3.5 ${loading?"animate-spin":""}`}/></Button></div></div>
    {period==="custom"&&<div className="mb-4 flex flex-wrap justify-end gap-2"><input aria-label="Analytics start date" type="date" value={customStart} max={customEnd} onChange={e=>setCustomStart(e.target.value)} className="h-9 rounded-md border border-[#E8DED1] px-3 text-xs font-bold"/><input aria-label="Analytics end date" type="date" value={customEnd} min={customStart} max={dateKey(new Date())} onChange={e=>setCustomEnd(e.target.value)} className="h-9 rounded-md border border-[#E8DED1] px-3 text-xs font-bold"/></div>}
    {loading&&!data?<div className="flex min-h-64 items-center justify-center text-xs text-[#756A60]"><RefreshCw className="mr-2 h-4 w-4 animate-spin"/>Loading analytics...</div>:!data&&error?<div className="rounded-lg border border-red-200 bg-red-50 p-5 text-center text-xs font-semibold text-red-700">{error}</div>:<>{error&&<p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error} Existing analytics remain visible.</p>}<div className="grid gap-3 xl:grid-cols-12">
      <Panel title="Listing Activity" subtitle="Selected period" className="xl:col-span-5"><div className="mt-4 grid grid-cols-2 gap-3"><Metric label="Submitted Listings" value={a.submitted.reduce((x,y)=>x+y,0)} color={BROWN}/><Metric label="Published Listings" value={a.published.reduce((x,y)=>x+y,0)} color={GREEN}/></div><Legend first="Submitted" second="Published"/><Trend buckets={a.buckets} first={a.submitted} second={a.published} label="Listing activity trend"/></Panel>
      <Panel title="Availability & Pricing" subtitle="Current database state" className="xl:col-span-3"><div className="mt-4 rounded-lg bg-[#FAF8F5] p-3"><Home className="h-4 w-4 text-[#8B735B]"/><strong className="mt-2 block text-2xl text-[#302820]">{a.available}</strong><span className="text-[10px] font-bold text-[#756A60]">Available Rooms</span></div><div className="mt-3 border-t border-[#E8DED1] pt-3"><p className="text-[10px] font-bold text-[#756A60]">Average Listed Rent</p><strong className="text-xl text-[#302820]">{a.rents.length?peso(a.rents.reduce((x,y)=>x+y,0)/a.rents.length):"Unavailable"}</strong><div className="mt-3 grid grid-cols-2 text-xs"><Small label="Lowest Rent" value={a.rents.length?peso(Math.min(...a.rents)):"—"}/><Small label="Highest Rent" value={a.rents.length?peso(Math.max(...a.rents)):"—"}/></div></div></Panel>
      <Panel title="Tenant Engagement" subtitle="Selected period" className="xl:col-span-4"><div className="mt-4 grid grid-cols-2 gap-3"><Metric label="Apartment Views" value={a.views} color={BROWN} icon={<Eye className="h-4 w-4"/>}/><Metric label="Favorites Added" value={a.favorites} icon={<Heart className="h-4 w-4"/>}/></div><Legend first="Views" second="Favorites"/><Trend buckets={a.buckets} first={a.viewTrend} second={a.favoriteTrend} label="Tenant engagement trend"/></Panel>
      <Panel title="Verification Status" subtitle="Current landlord state" className="xl:col-span-4"><div className="mt-4 flex gap-4"><div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[14px] border-emerald-600/80"><strong>{percent(a.verification[0],a.landlords.length)}%</strong></div><div className="flex-1 space-y-2">{["Verified","Pending","Rejected","Incomplete"].map((label,index)=><Row key={label} label={label} value={a.verification[index]} total={a.landlords.length} color={[GREEN,"#d8a142","#dc4747","#a89d94"][index]}/>)}</div></div><p className="mt-3 border-t border-[#E8DED1] pt-3 text-xs font-bold text-[#756A60]">Verification Rate <strong className="float-right text-base text-emerald-700">{percent(a.verification[0],a.landlords.length)}%</strong></p></Panel>
      <Panel title="Listing Status" subtitle="Current apartment state" className="xl:col-span-4"><div className="mt-4 space-y-3">{["Published","Pending Review","Unpublished","Rejected"].map((label,index)=><Row key={label} label={label} value={a.listing[index]} total={a.apartments.length} color={[GREEN,"#c98a45","#d8a142","#dc4747"][index]}/>)}</div></Panel>
      <Panel title="Rating Overview" subtitle="All-time · secondary metric" className="xl:col-span-4"><div className="mt-4 grid gap-4 sm:grid-cols-[120px_1fr]"><div><div className="flex items-center gap-2"><strong className="text-3xl">{average?average.toFixed(1):"—"}</strong><Star className="h-5 w-5 fill-[#e5aa4b] text-[#e5aa4b]"/></div><p className="text-[10px] font-bold text-[#756A60]">{a.ratings.length} total ratings</p></div><div className="space-y-1">{distribution.map((count,index)=><Row key={index} label={`${5-index} Stars`} value={count} total={a.ratings.length} color="#d9a24a" compact/>)}</div></div></Panel>
    </div><p className="mt-3 flex items-center gap-1 text-[10px] text-[#756A60]"><CalendarDays className="h-3 w-3"/>Archived and deleted apartments are excluded. Availability, pricing, verification, and listing status are current-state metrics.</p></>}
  </motion.section>;
}
function Legend({first,second}:{first:string;second:string}){return <div className="mt-3 flex gap-4 text-[9px] font-bold text-[#756A60]"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#8B735B]"/>{first}</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#4f7d5e]"/>{second}</span></div>}
function Small({label,value}:{label:string;value:string}){return <div><span className="block text-[9px] font-bold text-[#756A60]">{label}</span><strong className="text-sm">{value}</strong></div>}
