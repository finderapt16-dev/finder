import { PropertyCard } from "@/app/landlord/components/properties/PropertyCard";
import { Button } from "@/app/shared/components/ui/button";
import { type Apartment, type ApartmentStatus } from "@/app/shared/data/apartments";
import { Building2, ChevronRight, Clock, LayoutGrid, List, Plus, Search } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import type { Dispatch, SetStateAction } from "react";
import type { ApartmentRatingStats } from "@/app/shared/services/apartmentRatingsService";
import { getApartmentStatus } from "@/app/landlord/utils/landlordStatus";

interface PropertiesSectionProps {
  myApartments: Apartment[];
  setPropertyFilter: Dispatch<SetStateAction<ApartmentStatus | "all">>;
  propertyFilter: ApartmentStatus | "all";
  propertySort: "name" | "newest" | "oldest" | "price-high" | "price-low";
  setPropertySort: Dispatch<SetStateAction<"name" | "newest" | "oldest" | "price-high" | "price-low">>;
  setPropertyViewMode: Dispatch<SetStateAction<"list" | "grid">>;
  propertyViewMode: "list" | "grid";
  isLoadingApartments: boolean;
  paginatedApartments: Apartment[];
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
  filteredApartments: Apartment[];
  safePropertyPage: number;
  propertiesPerPage: number;
  setPropertyPage: Dispatch<SetStateAction<number>>;
  propertyPageCount: number;
  setPropertiesPerPage: Dispatch<SetStateAction<number>>;
}

export const PropertiesSection = ({
  myApartments,
  setPropertyFilter,
  propertyFilter,
  propertySort,
  setPropertySort,
  setPropertyViewMode,
  propertyViewMode,
  isLoadingApartments,
  paginatedApartments,
  ratingSummary,
  ratingsLoading,
  openViewers,
  aptViews,
  openFavoriters,
  aptFavs,
  setEditingApartment,
  handleTogglePublication,
  deletingApartmentId,
  handleDeleteApartment,
  filteredApartments,
  safePropertyPage,
  propertiesPerPage,
  setPropertyPage,
  propertyPageCount,
  setPropertiesPerPage,
}: PropertiesSectionProps) => {
  const availablePropertiesCount = myApartments.filter((apartment) => getApartmentStatus(apartment) === "available").length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#756A60]"><Building2 className="h-6 w-6" /></span>
          <div><p className="text-xs font-black uppercase text-[#756A60]">My Properties</p><h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Your Listings</h1><p className="mt-1 text-sm font-medium text-slate-500">Manage rooms, publication, and listing performance.</p></div>
        </div>
        <Link to="/add-apartment"><Button className="h-11 w-full rounded-lg bg-[#8B735B] px-5 font-bold text-white shadow-sm hover:bg-[#756A60] sm:w-auto"><Plus className="mr-2 h-4 w-4" />Add Property</Button></Link>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPropertyFilter("all")} className={`flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-black transition ${propertyFilter === "all" ? "border-[#8B735B] bg-[#8B735B] text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-[#E8DED1] hover:bg-[#FAF8F5]"}`}><LayoutGrid className="h-3.5 w-3.5" />All Units <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${propertyFilter === "all" ? "bg-white/20" : "bg-slate-100"}`}>{myApartments.length}</span></button>
          <button type="button" onClick={() => setPropertyFilter("available")} className={`flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-black transition ${propertyFilter === "available" ? "border-[#8B735B] bg-[#8B735B] text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-[#E8DED1] hover:bg-[#FAF8F5]"}`}><span className="h-2 w-2 rounded-full bg-emerald-500" />Available <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${propertyFilter === "available" ? "bg-white/20" : "bg-slate-100"}`}>{availablePropertiesCount}</span></button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500"><span className="shrink-0">Sort by</span><select value={propertySort} onChange={(event) => setPropertySort(event.target.value as typeof propertySort)} className="min-w-32 bg-transparent font-black text-slate-800 outline-none"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name</option><option value="price-high">Price: High</option><option value="price-low">Price: Low</option></select></label>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1"><button type="button" title="Grid view" onClick={() => setPropertyViewMode("grid")} className={`flex h-8 w-9 items-center justify-center rounded-md transition ${propertyViewMode === "grid" ? "bg-[#8B735B] text-white shadow-sm" : "text-slate-500 hover:bg-white"}`}><LayoutGrid className="h-4 w-4" /></button><button type="button" title="List view" onClick={() => setPropertyViewMode("list")} className={`flex h-8 w-9 items-center justify-center rounded-md transition ${propertyViewMode === "list" ? "bg-[#8B735B] text-white shadow-sm" : "text-slate-500 hover:bg-white"}`}><List className="h-4 w-4" /></button></div>
        </div>
      </section>

      {isLoadingApartments ? (
        <div className="flex min-h-96 items-center justify-center rounded-lg border border-slate-200 bg-white"><Clock className="h-7 w-7 animate-pulse text-[#8B735B]" /></div>
      ) : myApartments.length === 0 ? (
        <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm"><span className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]"><Building2 className="h-8 w-8" /></span><h2 className="text-xl font-black text-slate-900">No properties yet</h2><p className="mt-1 max-w-sm text-sm font-medium text-slate-500">You haven&apos;t added any properties yet.</p><Link to="/add-apartment"><Button className="mt-5 rounded-lg bg-[#8B735B] font-bold text-white hover:bg-[#756A60]"><Plus className="mr-2 h-4 w-4" />Add Your First Property</Button></Link></div>
      ) : paginatedApartments.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center"><Search className="mb-3 h-8 w-8 text-slate-300" /><h2 className="font-black text-slate-800">No matching properties</h2><p className="mt-1 text-sm font-medium text-slate-500">Try selecting a different availability filter.</p><Button variant="outline" onClick={() => setPropertyFilter("all")} className="mt-4 rounded-md font-bold">Show All Units</Button></div>
      ) : (
        <div className={propertyViewMode === "grid" ? "grid gap-5 xl:grid-cols-2" : "space-y-4"}>
          {paginatedApartments.map((apartment) => (
              <PropertyCard key={apartment.id} apartment={apartment}
                propertyViewMode={propertyViewMode}
                ratingSummary={ratingSummary}
                ratingsLoading={ratingsLoading}
                openViewers={openViewers}
                aptViews={aptViews}
                openFavoriters={openFavoriters}
                aptFavs={aptFavs}
                setEditingApartment={setEditingApartment}
                handleTogglePublication={handleTogglePublication}
                deletingApartmentId={deletingApartmentId}
                handleDeleteApartment={handleDeleteApartment}
              />
            ))}
        </div>
      )}

      {filteredApartments.length > 0 && <footer className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between"><span>Showing {(safePropertyPage - 1) * propertiesPerPage + 1}-{Math.min(safePropertyPage * propertiesPerPage, filteredApartments.length)} of {filteredApartments.length} properties</span><div className="flex flex-wrap items-center gap-2"><button type="button" title="Previous page" disabled={safePropertyPage <= 1} onClick={() => setPropertyPage(Math.max(1, safePropertyPage - 1))} className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"><ChevronRight className="h-4 w-4 rotate-180" /></button><span className="flex h-9 min-w-9 items-center justify-center rounded-md bg-[#8B735B] px-3 font-black text-white">{safePropertyPage}</span><button type="button" title="Next page" disabled={safePropertyPage >= propertyPageCount} onClick={() => setPropertyPage(Math.min(propertyPageCount, safePropertyPage + 1))} className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button><label className="ml-1 flex items-center gap-2 text-xs font-bold"><span>Per page</span><select value={propertiesPerPage} onChange={(event) => setPropertiesPerPage(Number(event.target.value))} className="h-9 rounded-md border border-slate-200 bg-white px-2 font-black text-slate-800"><option value={6}>6</option><option value={10}>10</option><option value={20}>20</option></select></label></div></footer>}
    </motion.div>
  );
};
