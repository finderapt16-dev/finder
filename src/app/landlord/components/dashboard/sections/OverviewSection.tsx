import { getRoomStatus } from "@/app/landlord/utils/landlordStatus";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { type Apartment } from "@/app/shared/data/apartments";
import { formatApartmentLocation } from "@/app/shared/utils/apartmentLocation";
import { AlertCircle, Bell, Building2, CheckCheck, CheckCircle2, ChevronRight, Clock, Edit2, Eye, Heart, MapPin, Plus } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import type { Dispatch, SetStateAction } from "react";

interface OverviewSectionProps {
  myApartments: Apartment[];
  user: { name?: string } | null;
  availableCount: number;
  landlordVerified: boolean;
  landlordPermit: string;
  setSettingsTab: Dispatch<SetStateAction<string>>;
  setActiveSection: Dispatch<SetStateAction<string>>;
  isLoadingApartments: boolean;
  openViewers: (aptId: string, aptTitle: string, count: number) => void;
  aptViews: (aptId: string) => number;
  openFavoriters: (aptId: string, aptTitle: string, count: number) => void;
  aptFavs: (aptId: string) => number;
  setEditingApartment: Dispatch<SetStateAction<Apartment | null>>;
  handleTogglePublication: (apartmentId: string, nextValue: boolean) => Promise<void>;
  deletingApartmentId: string | null;
  handleDeleteApartment: (apartmentId: string) => Promise<void>;
}

export const OverviewSection = ({
  myApartments,
  user,
  availableCount,
  landlordVerified,
  landlordPermit,
  setSettingsTab,
  setActiveSection,
  isLoadingApartments,
  openViewers,
  aptViews,
  openFavoriters,
  aptFavs,
  setEditingApartment,
  handleTogglePublication,
  deletingApartmentId,
  handleDeleteApartment,
}: OverviewSectionProps) => {
  const publishedCount = myApartments.filter((apartment) => apartment.isPublished !== false).length;
  const recentUpdates = myApartments
    .map((apartment) => ({ id: `property-${apartment.id}`, title: apartment.isPublished === false ? "Property added" : "Property published", detail: `${apartment.title || "Your property"} ${apartment.isPublished === false ? "was added to your account." : "is visible to tenants."}`, timestamp: apartment.updatedAt ?? apartment.createdAt ?? "", icon: Building2 }))
    .filter((item) => item.timestamp && !Number.isNaN(new Date(item.timestamp).getTime()))
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 4);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const rawFirstName = user?.name?.trim().split(/\s+/)[0] || "Landlord";
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);
  const hasAvailableRooms = availableCount > 0;
  const statusTitle = !landlordVerified
    ? landlordPermit ? "Verification is pending" : "Complete your verification"
    : myApartments.length === 0
      ? "Start with your first property"
      : publishedCount === 0
        ? "Publish a property when it is ready"
        : !hasAvailableRooms
          ? "No rooms are currently available"
          : "Everything looks good!";
  const statusNeedsAttention = !landlordVerified || myApartments.length === 0 || publishedCount === 0 || !hasAvailableRooms;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="landlord-home mx-auto max-w-[1500px] space-y-5 pb-8">
      <header className="landlord-welcome relative min-h-32 overflow-hidden px-1 py-3 sm:min-h-40">
        <div className="relative z-10 max-w-2xl"><h1 className="text-3xl font-black tracking-tight text-[#302820] sm:text-4xl">{greeting}, {firstName}! <span aria-hidden="true">👋</span></h1><p className="mt-4 text-base font-medium text-[#5F5A55]">Manage your properties, rooms, and availability in one place.</p></div>
        <svg aria-hidden="true" viewBox="0 0 520 150" className="absolute bottom-0 right-0 hidden h-full w-[44%] text-[#B48E67] lg:block" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"><path d="M18 136h484M176 136V28h142v108M165 28h165v7H165zM190 48h28v24h-28zm56 0h28v24h-28zm-56 37h28v24h-28zm56 0h28v24h-28zm-56 37h28v14h-28zm56 0h28v14h-28zM230 136v-22h34v22M318 136V67h58v69M318 75h58M334 87h12v20h-12zm18 0h12v20h-12zm-18 31h12v18h-12zm18 0h12v18h-12zM92 136V91h31v45M98 98h19v29H98zM104 104h7m-7 7h7m-7 7h7M132 136V78h31v58M139 87h17m-17 9h11m-11 9h17M415 136a25 25 0 1 1 0-50 25 25 0 0 1 0 50zm0-35a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 14v13m0-6h7M471 136V99m0 0c-14-10-14-29 0-29s14 19 0 29zm0 0-8-9m8 9 8-9m-8 9v18"/><path d="M46 55q12-9 24 0m21 14h28m16-25q10-7 20 0M393 47h33m18 15h27m10-18q9-7 18 0" opacity=".6"/></svg>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="landlord-status-summary">
            <section className="landlord-panel rounded-xl border border-[#E8DED1] bg-white p-6"><div className="flex items-start gap-4"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${statusNeedsAttention ? "bg-[#F3EFEA] text-[#8B735B]" : "bg-emerald-50 text-emerald-700"}`}>{statusNeedsAttention ? <AlertCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}</span><div><h2 className="font-black text-[#302820]">{statusTitle}</h2><div className="mt-3 space-y-2 text-sm font-medium leading-6 text-[#5F5A55]"><p>{landlordVerified ? "Your account is verified." : landlordPermit ? "Your verification information is being reviewed." : "Verify your landlord account before publishing properties."}</p>{myApartments.length > 0 ? <p>You have <strong>{publishedCount} published {publishedCount === 1 ? "property" : "properties"}</strong> with <strong>{availableCount} {availableCount === 1 ? "room" : "rooms"} available</strong>.</p> : <p>Add your property information so tenants can discover it.</p>}<p>{hasAvailableRooms ? "Keep your room information updated so tenants see accurate availability." : myApartments.length > 0 ? "Update a room status when one becomes available." : "Add a property to begin managing rooms and availability."}</p></div>{!landlordVerified ? <button type="button" onClick={() => { setSettingsTab("business"); setActiveSection("settings"); }} className="mt-4 text-sm font-black text-[#8B735B]">{landlordPermit ? "View verification details →" : "Continue verification →"}</button> : myApartments.length === 0 ? <Link to="/add-apartment" className="mt-4 inline-block text-sm font-black text-[#8B735B]">Add Property →</Link> : publishedCount === 0 ? <span className="mt-4 block text-sm font-medium text-[#756A60]">Publish a property using its management actions below.</span> : !hasAvailableRooms && myApartments[0] ? <Link to={`/landlord/properties/${myApartments[0].id}/rooms`} className="mt-4 inline-block text-sm font-black text-[#8B735B]">Manage Rooms →</Link> : null}</div></div></section>
            <section className="landlord-panel min-h-52 rounded-xl border border-[#E8DED1] bg-white p-6"><div className="flex items-start gap-4"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${myApartments.length > 0 && hasAvailableRooms ? "bg-emerald-50 text-emerald-700" : "bg-[#F3EFEA] text-[#8B735B]"}`}><CheckCircle2 className="h-6 w-6" /></span><div><h2 className="font-black text-[#302820]">{myApartments.length === 0 ? "Start with your first property" : !hasAvailableRooms ? "All rooms are currently occupied" : "Everything looks good!"}</h2><p className="mt-3 text-sm font-medium leading-6 text-[#5F5A55]">{myApartments.length === 0 ? "Add your property information so tenants can discover it." : !hasAvailableRooms ? "Update a room status when one becomes available." : `You have ${publishedCount} published ${publishedCount === 1 ? "property" : "properties"} with ${availableCount} ${availableCount === 1 ? "room" : "rooms"} available.`}</p>{myApartments.length > 0 && hasAvailableRooms && <p className="mt-3 text-sm font-medium leading-6 text-[#5F5A55]">Keep your room information updated so tenants see accurate availability.</p>}{myApartments.length === 0 ? <Link to="/add-apartment" className="mt-4 inline-block text-sm font-black text-[#8B735B]">Add Property →</Link> : !hasAvailableRooms && myApartments[0] ? <Link to={`/landlord/properties/${myApartments[0].id}/rooms`} className="mt-4 inline-block text-sm font-black text-[#8B735B]">Manage Rooms →</Link> : null}</div></div></section>
          </div>

          <section className="landlord-panel overflow-hidden rounded-xl border border-[#E8DED1] bg-white"><div className="flex flex-col gap-4 border-b border-[#EEE6DC] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF8F5] text-[#8B735B]"><Building2 className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#302820]">Your Properties</h2><p className="mt-1 text-sm font-medium text-[#756A60]">Manage your apartments, rooms, and availability.</p></div></div><Link to="/add-apartment"><Button className="bg-[#8B735B] font-bold text-white hover:bg-[#756A60]"><Plus className="mr-2 h-4 w-4" />Add Property<ChevronRight className="ml-2 h-4 w-4" /></Button></Link></div>
            {isLoadingApartments ? <div className="flex min-h-72 items-center justify-center"><Clock className="h-7 w-7 animate-pulse text-[#8B735B]" /></div> : myApartments.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FAF8F5] text-[#8B735B]"><Building2 className="h-8 w-8" /></span><h3 className="mt-4 text-xl font-black text-[#302820]">No properties yet</h3><p className="mt-2 max-w-sm text-sm text-[#756A60]">Add your first property to start listing available rooms.</p><Link to="/add-apartment"><Button className="mt-5 bg-[#8B735B] text-white hover:bg-[#756A60]"><Plus className="mr-2 h-4 w-4" />Add Property</Button></Link></div> : <div className="divide-y divide-[#EEE6DC]">{myApartments.map((apartment) => { const roomCount = apartment.rooms?.length ?? 0; const roomsAvailable = apartment.rooms?.filter((room: any) => getRoomStatus(room) === "available").length ?? 0; return <article key={apartment.id} className="grid gap-5 p-6 lg:grid-cols-[190px_minmax(0,1fr)_190px]"><div className="h-48 overflow-hidden rounded-xl bg-[#FAF8F5] lg:h-44">{apartment.image ? <img src={apartment.image} alt={apartment.title || "Property"} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Building2 className="h-10 w-10 text-[#C9B8A5]" /></div>}</div><div className="min-w-0"><h3 className="truncate text-xl font-black text-[#302820]">{apartment.title || "Untitled property"}</h3><p className="mt-2 flex items-center gap-2 text-sm font-medium text-[#5F5A55]"><MapPin className="h-4 w-4 text-[#8B735B]" />{formatApartmentLocation(apartment, "Address unavailable")}</p><Badge className={`mt-4 ${apartment.isPublished === false ? "bg-[#F3EFEA] text-[#756A60]" : "bg-emerald-50 text-emerald-700"}`}>{apartment.isPublished === false ? "Unpublished" : "Published"}</Badge><div className={`mt-4 w-fit rounded-lg px-4 py-3 ${roomsAvailable > 0 ? "bg-emerald-50 text-emerald-800" : "bg-[#FAF8F5] text-[#756A60]"}`}><strong className="block text-sm">{roomsAvailable > 0 ? `${roomsAvailable} ${roomsAvailable === 1 ? "room" : "rooms"} available` : "All rooms occupied"}</strong><span className="text-xs">{roomCount} total {roomCount === 1 ? "room" : "rooms"}</span></div><div className="mt-5 flex flex-wrap gap-5 text-sm text-[#756A60]"><button onClick={() => openViewers(apartment.id, apartment.title, aptViews(apartment.id))} className="flex items-center gap-2 hover:text-[#8B735B]"><Eye className="h-4 w-4" />{aptViews(apartment.id)} views</button><button onClick={() => openFavoriters(apartment.id, apartment.title, aptFavs(apartment.id))} className="flex items-center gap-2 hover:text-[#8B735B]"><Heart className="h-4 w-4" />{aptFavs(apartment.id)} favorites</button></div></div><div className="flex flex-col gap-3"><Link to={`/landlord/properties/${apartment.id}/rooms`}><Button className="w-full bg-[#8B735B] font-bold text-white hover:bg-[#756A60]">Manage Rooms<ChevronRight className="ml-2 h-4 w-4" /></Button></Link><Button variant="outline" onClick={() => setEditingApartment(apartment as Apartment)} className="w-full border-[#DCC9B4] text-[#8B735B] hover:bg-[#FAF8F5]">Edit Property<Edit2 className="ml-2 h-4 w-4" /></Button><Link to={`/apartment/${apartment.id}`} state={{ returnTo: "/dashboard?section=overview", backLabel: "Back to My Properties" }}><Button variant="outline" className="w-full border-[#DCC9B4] text-[#8B735B] hover:bg-[#FAF8F5]">View Property<Eye className="ml-2 h-4 w-4" /></Button></Link><div className="mt-auto grid grid-cols-2 gap-2">{apartment.isPublished ? <Button variant="outline" onClick={() => void handleTogglePublication(apartment.id, false)} className="text-xs">Unpublish</Button> : <Button variant="outline" onClick={() => void handleTogglePublication(apartment.id, true)} className="border-emerald-200 text-xs text-emerald-700">Publish</Button>}<Button variant="outline" disabled={deletingApartmentId === apartment.id} onClick={() => void handleDeleteApartment(apartment.id)} className="border-red-200 text-xs text-red-600">Delete</Button></div></div></article>; })}</div>}
          </section>
        </div>

        <aside className="space-y-4"><section className="landlord-panel rounded-xl border border-[#E8DED1] bg-white p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF8F5] text-[#8B735B]"><CheckCheck className="h-5 w-5" /></span><h2 className="font-black text-[#302820]">Things to Check</h2></div><div className="mt-5 space-y-4">{[{ ok: landlordVerified, label: landlordVerified ? "Account verified" : "Verification incomplete" }, { ok: publishedCount > 0, label: publishedCount > 0 ? `${publishedCount} ${publishedCount === 1 ? "property" : "properties"} published` : "No published property" }, { ok: hasAvailableRooms, label: hasAvailableRooms ? `${availableCount} ${availableCount === 1 ? "room" : "rooms"} available` : "No available rooms" }].map(({ ok, label }) => <div key={label} className="flex items-center gap-3 text-sm font-medium text-[#302820]">{ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <AlertCircle className="h-5 w-5 shrink-0 text-[#5F5145]" />}{label}</div>)}</div></section><section className="landlord-panel rounded-xl border border-[#E8DED1] bg-white p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF8F5] text-[#8B735B]"><Bell className="h-5 w-5" /></span><h2 className="font-black text-[#302820]">Recent Updates</h2></div><button onClick={() => setActiveSection("activity")} className="text-xs font-black text-[#8B735B]">View all</button></div>{recentUpdates.length > 0 ? <div className="mt-5 divide-y divide-[#EEE6DC]">{recentUpdates.map(({ id, title, detail, timestamp, icon: Icon }) => <div key={id} className="flex gap-3 py-4 first:pt-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-[#8B735B]"><Icon className="h-5 w-5" /></span><div><h3 className="text-sm font-black text-[#302820]">{title}</h3><p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-[#5F5A55]">{detail}</p><time className="mt-2 block text-[11px] text-[#756A60]">{new Date(timestamp).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div></div>)}</div> : <div className="py-10 text-center"><Bell className="mx-auto h-8 w-8 text-[#C9B8A5]" /><h3 className="mt-3 font-black text-[#302820]">No recent updates</h3><p className="mt-1 text-xs text-[#756A60]">Important property activity will appear here.</p></div>}</section></aside>
      </div>
    </motion.div>
  );

};
