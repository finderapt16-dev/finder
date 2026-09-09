import { ApartmentRatingSummary } from "@/app/shared/components/common/ApartmentRatingSummary";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { type Apartment } from "@/app/shared/data/apartments";
import { formatApartmentLocation } from "@/app/shared/utils/apartmentLocation";
import { Bath, BedDouble, Building2, Edit2, Eye, EyeOff, Eye as EyeOpen, Heart, MapPin, Ruler, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import type { Dispatch, SetStateAction } from "react";
import type { ApartmentRatingStats } from "@/app/shared/services/apartmentRatingsService";
import { getRoomStatus, getApartmentStatus, getStatusOption } from "@/app/landlord/utils/landlordStatus";

interface PropertyCardProps {
  apartment: Apartment;
  propertyViewMode: "list" | "grid";
  ratingSummary: { byApartment: Map<string, ApartmentRatingStats>; platformAverage: number; };
  ratingsLoading: boolean;
  openViewers: (aptId: string, aptTitle: string, count: number) => void;
  aptViews: (aptId: string) => number;
  openFavoriters: (aptId: string, aptTitle: string, count: number) => void;
  aptFavs: (aptId: string) => number;
  setEditingApartment: Dispatch<SetStateAction<Apartment | null>>;
  handleTogglePublication: (apartmentId: string, nextValue: boolean) => Promise<void>;
  deletingApartmentId: string | null;
  handleDeleteApartment: (apartmentId: string) => Promise<void>;
}

export const PropertyCard = ({ apartment, propertyViewMode, ratingSummary, ratingsLoading, openViewers, aptViews, openFavoriters, aptFavs, setEditingApartment, handleTogglePublication, deletingApartmentId, handleDeleteApartment }: PropertyCardProps) => {
const status = getApartmentStatus(apartment);
const statusOption = getStatusOption(status);
const roomCount = apartment.rooms?.length ?? 0;
const availableRooms = apartment.rooms?.filter((room: any) => getRoomStatus(room) === "available").length ?? 0;
const location = formatApartmentLocation(apartment, "Address unavailable");
const roomOrBedCount = roomCount > 0 ? roomCount : Number(apartment.bedrooms ?? 0);
return (
  <motion.article key={apartment.id} layout whileHover={{ y: -3 }} className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg ${propertyViewMode === "list" ? "md:grid md:grid-cols-[300px_minmax(0,1fr)]" : ""}`}>
    <div className={`relative overflow-hidden bg-slate-100 ${propertyViewMode === "list" ? "min-h-64 md:h-full" : "aspect-[16/8]"}`}>
      {apartment.image ? <img src={apartment.image} alt={apartment.title || "Property"} className="h-full w-full object-cover transition duration-500 hover:scale-105" /> : <div className="flex h-full min-h-56 items-center justify-center"><Building2 className="h-10 w-10 text-slate-300" /></div>}
      <div className="absolute left-4 top-4 flex flex-wrap gap-2"><Badge className="rounded-md bg-[#8B735B] text-white shadow-sm">Your Property</Badge><Badge className={`rounded-md border ${statusOption.className}`}>{statusOption.label}</Badge>{!apartment.isPublished && <Badge className="rounded-md bg-slate-800 text-white">Unpublished</Badge>}</div>
    </div>
    <div className="flex min-w-0 flex-col p-5">
      <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate text-xl font-black text-slate-950">{apartment.title || "Untitled property"}</h2><ApartmentRatingSummary stats={ratingSummary.byApartment.get(apartment.id)} isLoading={ratingsLoading} className="mt-1" /><p className="mt-1 flex items-center gap-1 truncate text-sm font-medium text-slate-500"><MapPin className="h-4 w-4 shrink-0 text-[#8B735B]" />{location}</p></div><div className="shrink-0 text-right"><p className="text-sm font-black text-[#756A60]">Room pricing</p><p className="text-xs font-medium text-slate-500">Manage Rooms</p></div></div>
      <div className="mt-4 grid grid-cols-3 gap-2">{[{ label: roomCount > 0 ? "Rooms" : "Beds", value: roomOrBedCount, icon: BedDouble }, { label: "Bathrooms", value: Number(apartment.bathrooms ?? 0), icon: Bath }, { label: "Floor Area", value: Number(apartment.sqft ?? 0) > 0 ? `${Number(apartment.sqft).toLocaleString("en-PH")} sqft` : "Unavailable", icon: Ruler }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3"><Icon className="mb-2 h-4 w-4 text-[#8B735B]" /><strong className="block truncate text-sm text-slate-900">{value}</strong><span className="text-[10px] font-semibold text-slate-500">{label}</span></div>)}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2"><Badge className="rounded-md bg-emerald-100 text-emerald-700">{statusOption.label}</Badge><span className="text-xs font-bold text-slate-600">{availableRooms} available / {roomCount} total rooms</span></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><Link to={`/apartment/${apartment.id}`} state={{ returnTo: "/dashboard?section=properties", backLabel: "Back to My Properties" }}><Button variant="outline" className="h-10 w-full rounded-md border-[#E8DED1] font-bold text-[#5F5145] hover:bg-[#FAF8F5]"><Eye className="mr-2 h-4 w-4" />View Property</Button></Link><Link to={`/landlord/properties/${apartment.id}/rooms`}><Button className="h-10 w-full rounded-md bg-[#8B735B] font-bold text-white hover:bg-[#756A60]">Manage Rooms</Button></Link></div>
      <div className="mt-2 grid grid-cols-3 gap-2"><button onClick={() => openViewers(apartment.id, apartment.title, aptViews(apartment.id))} className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"><Eye className="h-4 w-4 text-[#8B735B]" />{aptViews(apartment.id)} Views</button><button onClick={() => openFavoriters(apartment.id, apartment.title, aptFavs(apartment.id))} className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"><Heart className="h-4 w-4 text-rose-500" />{aptFavs(apartment.id)} Saved</button><button onClick={() => setEditingApartment(apartment as Apartment)} className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"><Edit2 className="h-4 w-4 text-blue-500" />Edit</button></div>
      <div className="mt-2 grid grid-cols-2 gap-2">{apartment.isPublished ? <Button variant="outline" onClick={() => void handleTogglePublication(apartment.id, false)} className="h-10 rounded-md border-[#E8DED1] font-bold text-[#5F5145] hover:bg-[#FAF8F5]"><EyeOff className="mr-2 h-4 w-4" />Unpublish</Button> : <Button variant="outline" onClick={() => void handleTogglePublication(apartment.id, true)} className="h-10 rounded-md border-emerald-200 font-bold text-emerald-700 hover:bg-emerald-50"><EyeOpen className="mr-2 h-4 w-4" />Publish</Button>}<Button variant="outline" disabled={deletingApartmentId === apartment.id} onClick={() => void handleDeleteApartment(apartment.id)} className="h-10 rounded-md border-red-200 font-bold text-red-600 hover:bg-red-50"><Trash2 className="mr-2 h-4 w-4" />{deletingApartmentId === apartment.id ? "Deleting..." : "Delete"}</Button></div>
    </div>
  </motion.article>
);
          };
