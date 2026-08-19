import {
  AlertTriangle, ArrowLeft, Bath, BedDouble, Building2, CalendarDays,
  Check, CheckCircle2, ChevronLeft, ChevronRight, DoorOpen, Edit3, Heart,
  Mail, MapPin, Menu,
  Phone,
  Share2,
  Star,
  Square,
  Users,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { EditApartmentDialog } from "@/app/shared/components/common/EditApartmentDialog";
import { EvidenceUploader, type EvidenceFile } from "@/app/shared/components/common/EvidenceUploader";
import { LandlordSidebar } from "@/app/landlord/components/LandlordSidebar";
import { RoomImageGallery } from "@/app/shared/components/common/RoomImageGallery";
import { VerifiedBadge } from "@/app/shared/components/common/VerifiedBadge";
import { MapView } from "@/app/shared/components/features/map/MapView";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { useApartmentsContext } from "@/app/shared/contexts/ApartmentsContext";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import { isTenantRole } from "@/app/shared/services/authService";
import type { Apartment, ApartmentRoom } from "@/app/shared/data/apartments";
import { fetchApartmentWithImages, getLandlordVerification, persistApartmentImages, recordApartmentView, updateApartment } from "@/app/shared/data/apartments";
import type { UploadedImage } from "@/app/shared/components/common/MultiImageUploader";
import { useFavorites } from "@/app/shared/hooks/useFavorites";
import { createReport, fetchPublicLandlordById, type DashboardUserRow } from "@/app/shared/services/dashboardSupabaseService";
import { uploadReportEvidence } from "@/app/shared/services/reportEvidenceService";
import { fetchApartmentRatings, removeApartmentRating, saveApartmentRating, subscribeToApartmentRatings, type ApartmentRatingRow } from "@/app/shared/services/apartmentRatingsService";
import { apartmentToFormValues } from "@/app/shared/utils/apartmentMappers";
import { formatApartmentLocation } from "@/app/shared/utils/apartmentLocation";
import { getImageUrl } from "@/app/shared/utils/images";
import { isTenantVisibleApartment } from "@/app/shared/utils/listingVisibility";
import { hasValidApartmentCoordinates, isDefaultMapCenter } from "@/app/shared/utils/mapCoordinates";
import { TenantMobileNavigation } from "@/app/tenant/components/TenantMobileNavigation";
import { TenantSidebar } from "@/app/tenant/components/TenantSidebar";

const STATUS_LABEL: Record<string, string> = { available: "Available", occupied: "Occupied", reserved: "Reserved", maintenance: "Maintenance" };
const STATUS_STYLE: Record<string, string> = { available: "bg-emerald-50 text-emerald-700", occupied: "bg-rose-50 text-rose-700", reserved: "bg-amber-50 text-amber-700", maintenance: "bg-violet-50 text-violet-700" };
const roomStatus = (room: ApartmentRoom) => room.status ?? (room.isOccupied ? "occupied" : "available");
const dateLabel = (value?: string) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};
const listFromUnknown = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  : typeof value === "string" ? value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean) : [];

const recordedDetailViewKeys = new Set<string>();

export function ApartmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { user, canEditApartment, logout } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { apartments: contextApartments, refreshApartments } = useApartmentsContext();
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [landlord, setLandlord] = useState<DashboardUserRow | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDetails, setReportDetails] = useState("");
  const [reportContact, setReportContact] = useState("");
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ApartmentRoom | null>(null);
  const [ratings, setRatings] = useState<ApartmentRatingRow[]>([]);
  const [ratingSaving, setRatingSaving] = useState(false);
  const listingUpdatedAt = id ? contextApartments.find((item) => item.id === id)?.updatedAt : undefined;

  const returnTo = (() => {
    const value = (routeLocation.state as { returnTo?: unknown } | null)?.returnTo;
    return typeof value === "string" && value.startsWith("/") ? value : null;
  })();
  const backLabel = (() => {
    const value = (routeLocation.state as { backLabel?: unknown } | null)?.backLabel;
    return typeof value === "string" && value.trim() ? value : null;
  })();

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!id) return setLoading(false);
      setLoading(true);
      try {
        const listing = await fetchApartmentWithImages(id);
        if (!active) return;
        setApartment(listing);
        let landlordVerified = false;
        if (listing?.landlordId) {
          const [owner, isVerified] = await Promise.all([fetchPublicLandlordById(listing.landlordId), getLandlordVerification(listing.landlordId)]);
          landlordVerified = isVerified;
          if (active) { setLandlord(owner); setVerified(isVerified); }
        } else if (active) {
          setLandlord(null);
          setVerified(false);
        }
        if (listing && user && isTenantVisibleApartment({ ...listing, landlordVerified }) && isTenantRole(user.role) && listing.landlordId !== user.id) {
          const viewKey = `${routeLocation.key}:${user.id}:${listing.id}`;
          if (recordedDetailViewKeys.has(viewKey)) return;
          recordedDetailViewKeys.add(viewKey);
          void recordApartmentView(listing.id, { id: user.id, authId: user.authId, email: user.email, name: user.name, role: user.role })
            .catch((error) => {
              recordedDetailViewKeys.delete(viewKey);
              console.error("Unable to record apartment view:", error);
            });
        }
      } catch (error) {
        console.error("Failed to load apartment:", error);
        if (active) setApartment(null);
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [id, listingUpdatedAt, routeLocation.key, user?.authId, user?.email, user?.id, user?.name, user?.role]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const loadRatings = () => fetchApartmentRatings(id).then((rows) => { if (active) setRatings(rows); }).catch((error) => console.error("Unable to load apartment ratings:", error));
    void loadRatings();
    const unsubscribe = subscribeToApartmentRatings(loadRatings, id);
    return () => { active = false; unsubscribe(); };
  }, [id]);

  useEffect(() => {
    if (!selectedRoom?.id || !apartment?.rooms) return;
    setSelectedRoom(apartment.rooms.find((room) => room.id === selectedRoom.id) ?? null);
  }, [apartment?.rooms, selectedRoom?.id]);

  const images = useMemo(() => apartment
    ? [...new Set([apartment.image, ...apartment.images].filter(Boolean).map(getImageUrl).filter(Boolean))]
    : [], [apartment]);
  const favorite = apartment ? isFavorite(apartment.id) : false;
  const canEdit = apartment ? canEditApartment(apartment.id, apartment.landlordId) : false;
  const ownListing = user?.role === "landlord" && (apartment?.landlordId === user.id || canEdit);
  const landlordPortal = user?.role === "landlord";
  const landlordMarketDetail = landlordPortal && routeLocation.pathname.startsWith("/landlord/market/");
  const renter = isTenantRole(user?.role);
  const currentRating = ratings.find((rating) => rating.tenant_id === user?.id)?.rating ?? 0;
  const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + Number(rating.rating), 0) / ratings.length : 0;
  const setTenantRating = async (rating: number) => { if (!apartment || !user?.id) return; setRatingSaving(true); try { await saveApartmentRating(apartment.id, user.id, rating); toast.success("Rating saved."); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save rating."); } finally { setRatingSaving(false); } };
  const clearTenantRating = async () => { if (!apartment || !user?.id) return; setRatingSaving(true); try { await removeApartmentRating(apartment.id, user.id); toast.success("Rating removed."); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to remove rating."); } finally { setRatingSaving(false); } };

  const handleBack = () => {
    if (landlordMarketDetail) return navigate("/browse");
    if (returnTo) return navigate(returnTo);
    if (ownListing) return navigate("/dashboard?section=overview");
    navigate("/browse");
  };
  const shareListing = async () => {
    const data = { title: apartment?.title || "Apartment listing", text: apartment?.description || "", url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Listing link copied."); }
    } catch (error) { if ((error as Error).name !== "AbortError") toast.error("Unable to share this listing."); }
  };
  const saveApartment = async (updated: Apartment, images: UploadedImage[]) => {
    if (!apartment) return;
    try {
      await updateApartment(apartment.id, apartmentToFormValues(updated), user?.id);
      const saved = await persistApartmentImages(apartment.id, images, user?.id);
      setApartment(saved); await refreshApartments(); toast.success("Apartment updated successfully.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update apartment."); }
  };
  const submitReport = async () => {
    if (!apartment || !user?.id) return;
    if (!reportDetails.trim()) return void toast.error("Please describe the problem.");
    setSubmittingReport(true);
    try {
      const report = await createReport({ reporter_id: user.id, reporter_role: user.role, apartment_id: apartment.id, category: "Apartment problem", issue_type: "Tenant-submitted problem", tags: [], details: reportDetails.trim(), contact: reportContact.trim() || user.email, date_of_incident: null, landlord_id: apartment.landlordId, has_evidence: true, evidence_count: evidence.length });
      if (!report?.id) throw new Error("Unable to save report.");
      const uploads = await Promise.all(evidence.map((item) => uploadReportEvidence({ reportId: report.id!, file: item.file, fileName: item.fileName, fileType: item.fileType, mimeType: item.mimeType, uploadedBy: user.id })));
      if (uploads.some((result) => !result)) throw new Error("Report saved, but one or more evidence files could not be uploaded. Please contact support.");
      setReportOpen(false); setReportDetails(""); setReportContact(""); setEvidence([]); toast.success("Report submitted for admin review.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to submit report."); }
    finally { setSubmittingReport(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 grid place-items-center text-sm font-semibold text-slate-500">Loading apartment details...</div>;
  if (!apartment) return <div className="min-h-screen bg-slate-50 grid place-items-center p-6 text-center"><div><Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" /><h1 className="text-2xl font-bold">Apartment not found</h1><Button className="mt-5" onClick={() => navigate("/browse")}>Back to Browse</Button></div></div>;
  if (!ownListing && user?.role !== "admin" && !isTenantVisibleApartment({ ...apartment, landlordVerified: verified })) return <div className="min-h-screen bg-slate-50 grid place-items-center p-6 text-center"><div><AlertTriangle className="mx-auto mb-3 h-10 w-10 text-[#8B735B]" /><h1 className="text-2xl font-bold">Listing not available</h1><p className="mt-2 max-w-md text-sm font-medium text-slate-500">This apartment becomes visible after the property is approved, published, active, and its landlord is verified.</p><Button className="mt-5" onClick={handleBack}>Go Back</Button></div></div>;

  const locationText = formatApartmentLocation(apartment);
  const locationDetails = [
    { label: "Complete Address", value: apartment.address },
    { label: "City / District", value: [apartment.city, apartment.state].filter(Boolean).join(", ") },
    { label: "ZIP Code", value: apartment.zip },
  ].filter((item) => item.value && item.value.trim().length > 0);
  const mapPinAvailable = hasValidApartmentCoordinates(apartment.lat, apartment.lng);
  const hasAddressText = locationText !== "Location not provided";
  const mapPinMessage = isDefaultMapCenter(apartment.lat, apartment.lng)
    ? "This listing has an address, but its map pin is still the old default La Paz center. The landlord needs to edit the listing and pin the exact location."
    : hasAddressText
      ? "This listing has an address, but no exact latitude and longitude were saved for the map pin."
      : "No address or map pin has been saved for this listing.";
  const status = apartment.status ?? "available";
  const availableRooms = apartment.rooms?.filter((room) => roomStatus(room) === "available").length ?? 0;
  const maxOccupants = apartment.rooms?.reduce((total, room) => total + (room.maxOccupants || 0), 0) || 0;
  const featureRecord = !Array.isArray(apartment.features) && apartment.features ? apartment.features : {};
  const rules = listFromUnknown((featureRecord as Record<string, unknown>).safetyRules ?? (featureRecord as Record<string, unknown>).houseRules);
  const propertyFeatures = [apartment.petFriendly && "Pet Friendly", apartment.parking && "Parking", apartment.furnished && "Furnished", ...listFromUnknown((featureRecord as Record<string, unknown>).customFeatures)].filter(Boolean) as string[];
  const landlordName = landlord?.name || "Not provided";
  const missingValue = ownListing ? "Not specified" : "Not provided";

  const Sidebar = () => {
    if (user?.role === "landlord") {
      return <LandlordSidebar user={user} verified={user.isVerified} activeSection={landlordMarketDetail ? "market" : "overview"} onSectionChange={(section) => navigate(`/dashboard?section=${section}`)} onClose={() => setMobileNav(false)} onLogout={() => { logout(); navigate("/"); }} />;
    }
    return <TenantSidebar active="apartments" />;
  };

  return (
    <div className={`app-shell fixed inset-0 z-50 overflow-hidden text-slate-950 ${landlordPortal ? "landlord-shell landlord-property-detail bg-[#FCFAF7]" : "tenant-detail-colors bg-[#f6f7f9]"}`}>
      {renter && <TenantMobileNavigation active="apartments" />}
      <div className="app-shell-frame flex h-full">
      {landlordPortal
        ? <aside className="app-shell-sidebar hidden h-full w-60 shrink-0 flex-col border-r border-[#E8DED1] bg-white lg:flex">{Sidebar()}</aside>
        : <div className="hidden h-full w-64 shrink-0 lg:block"><TenantSidebar active="apartments" /></div>}
      {mobileNav && !renter && <div className="app-sidebar-overlay fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0" onClick={() => setMobileNav(false)} /><div className="app-sidebar-drawer relative h-full w-60 max-w-[86vw]">{Sidebar()}<button aria-label="Close navigation" onClick={() => setMobileNav(false)} className="app-sidebar-close absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md bg-white/10"><X className="h-4 w-4" /></button></div></div>}
      <div className="app-shell-main h-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-28 lg:pb-20"><main className="app-shell-content app-shell-content-mobile-nav w-full max-w-full px-4 sm:px-6 lg:px-8"><div className="mx-auto w-full max-w-[1380px] min-w-0">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-2">{!renter && <button aria-label="Open navigation" onClick={() => setMobileNav(true)} className="app-sidebar-trigger grid h-10 w-10 shrink-0 place-items-center rounded-lg border bg-white lg:hidden"><Menu className="h-5 w-5" /></button>}<Button variant="ghost" onClick={handleBack} className={`min-w-0 max-w-full justify-start px-2 ${landlordPortal ? "text-[#756A60] hover:bg-[#F3EFEA] hover:text-[#8B735B]" : ""}`}><ArrowLeft className="mr-2 h-4 w-4 shrink-0" /><span className="truncate">{landlordMarketDetail ? "Back to Market Overview" : backLabel ?? (ownListing ? "Back to My Properties" : "Back to Browse")}</span></Button></div><div className="flex flex-wrap gap-2 sm:justify-end"><Button variant="outline" onClick={() => void shareListing()} title="Share listing" className={landlordPortal ? "shrink-0 border-[#E8DED1] text-[#756A60] hover:bg-[#FAF8F5]" : "shrink-0"}><Share2 className="mr-2 h-4 w-4" />Share</Button>{!ownListing && user?.role !== "admin" && <Button variant="outline" size="icon" onClick={() => void toggleFavorite(apartment.id)} title={favorite ? "Remove favorite" : "Add favorite"} className="shrink-0"><Heart className={`h-5 w-5 ${favorite ? "fill-rose-500 text-rose-500" : ""}`} /></Button>}{canEdit && <Button onClick={() => setEditOpen(true)} className={`shrink-0 ${landlordPortal ? "bg-[#8B735B] hover:bg-[#756A60]" : "bg-[#8B735B] hover:bg-[#756A60]"}`}><Edit3 className="mr-2 h-4 w-4" />Edit Property</Button>}</div></div>

        <header className="mb-5 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end"><div className="min-w-0"><Badge className={`mb-3 rounded-md ${landlordPortal ? "bg-[#F3EFEA] text-[#8B735B]" : "bg-[#FAF8F5] text-[#5F5145]"}`}>For Rent</Badge><h1 className={`max-w-full break-words text-2xl font-black leading-tight sm:text-4xl ${landlordPortal ? "text-[#302820]" : "text-slate-950"}`}>{apartment.title || "Untitled apartment"}</h1><div className={`mt-3 flex min-w-0 flex-wrap items-center gap-3 text-sm font-medium ${landlordPortal ? "text-[#756A60]" : "text-slate-500"}`}><span className="flex min-w-0 items-start gap-1.5 break-words"><MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${landlordPortal ? "text-[#8B735B]" : "text-[#8B735B]"}`} /><span className="min-w-0 break-words">{locationText}</span></span><Badge className={apartment.isPublished === false ? "bg-[#F3EFEA] text-[#756A60]" : "bg-emerald-50 text-emerald-700"}>{apartment.isPublished === false ? "Unpublished" : "Published"}</Badge>{verified && <VerifiedBadge label="Verified Landlord" />}</div></div><div className={`w-full rounded-lg p-5 ${landlordPortal ? "border border-[#E8DED1] bg-white text-[#302820] shadow-sm" : "bg-gradient-to-br from-[#8B735B] to-[#756A60] text-white shadow-lg"}`}><p className={`text-xl font-black ${landlordPortal ? "text-[#8B735B]" : ""}`}>Room Pricing</p><p className={`mt-1 text-sm font-semibold ${landlordPortal ? "text-[#756A60]" : "text-[#FAF8F5]"}`}>View each room to see its monthly rent.</p><div className={`mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs font-bold ${landlordPortal ? "border-[#E8DED1]" : "border-white/25"}`}><span>{STATUS_LABEL[status]}</span><span className={ownListing && availableRooms > 0 ? "text-emerald-700" : ""}>{availableRooms > 0 ? `${availableRooms} ${availableRooms === 1 ? "room" : "rooms"} available` : "All rooms occupied"}</span></div></div></header>

        <section className="mb-5 max-w-full overflow-hidden"><div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-200 shadow-sm sm:aspect-[16/8] sm:min-h-64">{images.length ? <img src={images[imageIndex]} alt={`${apartment.title} image ${imageIndex + 1}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm font-semibold text-slate-500">No images uploaded</div>}{images.length > 1 && <><button onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white shadow sm:left-4 sm:h-11 sm:w-11"><ChevronLeft className="h-5 w-5" /></button><button onClick={() => setImageIndex((imageIndex + 1) % images.length)} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white shadow sm:right-4 sm:h-11 sm:w-11"><ChevronRight className="h-5 w-5" /></button><span className="absolute left-3 top-3 rounded-md bg-slate-950/75 px-3 py-1 text-xs font-bold text-white sm:left-4 sm:top-4">{imageIndex + 1} / {images.length}</span></>}</div>{images.length > 1 && <div className="mt-3 flex max-w-full gap-3 overflow-x-auto pb-1">{images.map((source, index) => <button key={`${source}-${index}`} onClick={() => setImageIndex(index)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 sm:h-20 sm:w-28 ${index === imageIndex ? (landlordPortal ? "border-[#8B735B]" : "border-[#8B735B]") : "border-transparent"}`}><img src={source} alt={`${apartment.title} thumbnail ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}</section>

        <section className="mb-5 grid min-w-0 grid-cols-1 gap-px overflow-hidden rounded-lg border bg-slate-200 shadow-sm min-[360px]:grid-cols-2 sm:grid-cols-5">{[{ label: "Bedrooms", value: apartment.bedrooms || missingValue, icon: BedDouble }, { label: "Bathrooms", value: apartment.bathrooms || missingValue, icon: Bath }, { label: "Floor Area", value: apartment.sqft ? `${apartment.sqft} sq ft` : missingValue, icon: Square }, { label: "Max Occupants", value: maxOccupants || missingValue, icon: Users }, { label: "Date Posted", value: dateLabel(apartment.createdAt) === "Not provided" ? missingValue : dateLabel(apartment.createdAt), icon: CalendarDays }].map(({ label, value, icon: Icon }) => <div key={label} className="flex min-h-24 min-w-0 items-center gap-3 bg-white p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-600"><Icon className="h-5 w-5" /></span><span className="min-w-0"><strong className="block break-words text-sm">{value}</strong><span className="text-[10px] font-semibold text-slate-500">{label}</span></span></div>)}</section>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,.75fr)]"><div className="min-w-0 space-y-5">
          <section className="min-w-0 rounded-lg border bg-white p-5 shadow-sm"><h2 className="text-lg font-black">About this apartment</h2><p className="mt-3 break-words text-sm font-medium leading-7 text-slate-600">{apartment.description || "No description provided."}</p><div className="mt-4 flex flex-wrap gap-2">{[...apartment.amenities, ...propertyFeatures].length ? [...new Set([...apartment.amenities, ...propertyFeatures])].map((item) => <span key={item} className={`inline-flex max-w-full items-center gap-2 break-words rounded-md px-3 py-2 text-xs font-bold text-slate-700 ${landlordPortal ? "bg-[#FAF8F5]" : "bg-[#FAF8F5]"}`}><Check className={`h-3.5 w-3.5 shrink-0 ${landlordPortal ? "text-[#8B735B]" : "text-[#756A60]"}`} />{item}</span>) : <p className="text-sm text-slate-500">No amenities provided.</p>}</div></section>
          <section className="min-w-0 rounded-lg border bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h2 className="text-lg font-black">Rooms & Amenities</h2><p className="text-xs text-slate-500">Current room availability from the landlord.</p></div><Badge className="w-fit bg-emerald-50 text-emerald-700">{availableRooms} available</Badge></div>{apartment.rooms?.length ? <div className="space-y-3">{apartment.rooms.map((room, index) => <button type="button" key={room.id || index} onClick={() => setSelectedRoom(room)} className={`w-full max-w-full overflow-hidden rounded-lg border bg-slate-50 text-left transition focus:outline-none focus:ring-2 ${landlordPortal ? "hover:border-[#DCC9B4] hover:bg-[#FAF8F5] focus:ring-[#E8DED1]" : "hover:border-[#E8DED1] hover:bg-[#FAF8F5]/40 focus:ring-[#E8DED1]"}`}><div className="grid min-w-0 sm:grid-cols-[150px_minmax(0,1fr)]">{room.images?.[0] ? <img src={getImageUrl(room.images[0])} alt={room.name || `Room ${index + 1}`} className="h-36 w-full object-cover sm:h-full" /> : <div className="grid min-h-28 place-items-center bg-slate-100"><DoorOpen className="h-7 w-7 text-slate-300" /></div>}<div className="min-w-0 p-4"><div className="flex flex-col gap-2 min-[360px]:flex-row min-[360px]:items-start min-[360px]:justify-between"><div className="min-w-0"><h3 className="break-words font-black">{room.name || `Room ${index + 1}`}</h3><p className="break-words text-xs text-slate-500">{room.type || "Room type not provided"}</p></div><Badge className={`${STATUS_STYLE[roomStatus(room)]} w-fit shrink-0`}>{STATUS_LABEL[roomStatus(room)]}</Badge></div><div className="mt-3 grid grid-cols-1 gap-2 text-xs min-[360px]:grid-cols-2 sm:grid-cols-4"><span className="min-w-0 break-words"><b>₱{Number(room.price || 0).toLocaleString("en-PH")}</b><small className="block text-slate-500">Monthly rent</small></span><span><b>{room.maxOccupants || "-"}</b><small className="block text-slate-500">Capacity</small></span><span><b>{room.hasPrivateBath ? "Private" : "Shared"}</b><small className="block text-slate-500">Bathroom</small></span><span><b>{room.hasAC ? "Yes" : "No"}</b><small className="block text-slate-500">Air conditioning</small></span></div>{room.description && <p className="mt-3 break-words text-xs leading-5 text-slate-600">{room.description}</p>}<p className={`mt-3 text-xs font-black ${landlordPortal ? "text-[#8B735B]" : "text-[#756A60]"}`}>View room details</p></div></div></button>)}</div> : <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No room information available.</div>}</section>
          <section className="min-w-0 rounded-lg border bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 text-lg font-black">Location</h2>
            <div className={`mb-4 rounded-lg border p-4 ${landlordPortal ? "border-[#E8DED1] bg-[#FAF8F5]" : "border-[#F3EFEA] bg-[#FAF8F5]/60"}`}>
              <div className="flex min-w-0 gap-3">
                <MapPin className={`mt-0.5 h-5 w-5 shrink-0 ${landlordPortal ? "text-[#8B735B]" : "text-[#8B735B]"}`} />
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900">Location Details</h3>
                  <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-600">{locationText}</p>
                </div>
              </div>
              {locationDetails.length > 0 && (
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  {locationDetails.map(({ label, value }) => (
                    <div key={label} className="min-w-0 rounded-md bg-white px-3 py-2">
                      <dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</dt>
                      <dd className="mt-1 break-words font-bold text-slate-700">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            {mapPinAvailable ? <div className="h-[300px] overflow-hidden rounded-lg sm:h-[360px]"><MapView lat={apartment.lat} lng={apartment.lng} zoom={15} showSingleMarker /></div> : <div className={`flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center ${landlordPortal ? "border-[#DCC9B4] bg-[#FAF8F5]" : "border-[#E8DED1] bg-[#FAF8F5]/60"}`}><MapPin className={`mb-3 h-8 w-8 ${landlordPortal ? "text-[#8B735B]" : "text-[#8B735B]"}`} /><p className="text-sm font-black text-slate-800">Exact map pin needed</p><p className="mt-2 max-w-md break-words text-xs font-semibold leading-5 text-slate-600">{mapPinMessage}</p>{canEdit && <Button onClick={() => setEditOpen(true)} variant="outline" className={landlordPortal ? "mt-4 border-[#DCC9B4] text-[#8B735B] hover:bg-[#F3EFEA]" : "mt-4 border-[#E8DED1] text-[#5F5145] hover:bg-[#F3EFEA]"}>Edit map location</Button>}</div>}
          </section>
        </div><aside className="min-w-0 space-y-5">
          <section className="min-w-0 rounded-lg border bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Landlord Information</h2><div className="mt-4 flex min-w-0 items-center gap-3 rounded-lg bg-slate-50 p-4"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full font-black ${landlordPortal ? "bg-[#F3EFEA] text-[#8B735B]" : "bg-[#F3EFEA] text-[#5F5145]"}`}>{landlordName === "Not provided" ? "L" : landlordName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span><div className="min-w-0"><strong className="block break-words">{landlordName}</strong>{verified && <VerifiedBadge label="Verified Landlord" className="mt-1" />}</div></div><div className="mt-4 space-y-2 text-sm text-slate-600"><p className="flex min-w-0 gap-2"><Mail className="h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{landlord?.email || "Email not provided"}</span></p><p className="flex min-w-0 gap-2"><Phone className="h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{landlord?.mobile || landlord?.mobileNumber || "Phone not provided"}</span></p></div></section>
          <section className="min-w-0 rounded-lg border bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Property Details</h2><dl className="mt-4 space-y-3 text-sm">{[{ label: "Property Type", value: apartment.propertyType || "Not provided" }, { label: "Available Date", value: dateLabel(apartment.availableDate) }, { label: "Utilities", value: Array.isArray(apartment.utilities) && apartment.utilities.length ? apartment.utilities.join(", ") : "Not included" }, { label: "Status", value: STATUS_LABEL[status] }, { label: "ZIP Code", value: apartment.zip || "Not provided" }].map(({ label, value }) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 border-b pb-2 last:border-0"><dt className="break-words text-slate-500">{label}</dt><dd className="break-words text-right font-bold">{value}</dd></div>)}</dl></section>
          <section className="min-w-0 rounded-lg border bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Safety & Rules</h2>{rules.length ? <ul className="mt-4 space-y-2">{rules.map((rule) => <li key={rule} className="flex min-w-0 gap-2 text-sm text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span className="min-w-0 break-words">{rule}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No safety rules provided.</p>}</section>
          {renter && <section className="min-w-0 rounded-lg border border-amber-100 bg-amber-50 p-5 shadow-sm"><h2 className="font-black">Tenant Rating</h2><p className="mt-1 text-xs text-slate-600">{ratings.length ? `★ ${averageRating.toFixed(1)} based on ${ratings.length} rating${ratings.length === 1 ? "" : "s"}` : "No ratings yet"}</p><div className="mt-3 flex gap-1">{[1,2,3,4,5].map((value) => <button key={value} type="button" disabled={ratingSaving} aria-label={`Rate ${value} stars`} onClick={() => void setTenantRating(value)}><Star className={`h-7 w-7 ${value <= currentRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} /></button>)}</div>{currentRating > 0 && <button type="button" disabled={ratingSaving} onClick={() => void clearTenantRating()} className="mt-3 text-xs font-bold text-slate-500 hover:text-rose-600">Remove my rating</button>}</section>}
          {renter && <section className="min-w-0 rounded-lg border border-[#F3EFEA] bg-[#FAF8F5] p-5 shadow-sm"><div className="flex min-w-0 gap-3"><AlertTriangle className="h-6 w-6 shrink-0 text-[#756A60]" /><div className="min-w-0"><h2 className="font-black">Report a Problem</h2><p className="mt-1 break-words text-xs leading-5 text-slate-600">Let us know about any issues you encountered with an apartment listing.</p></div></div><Button variant="outline" onClick={() => setReportOpen(true)} className="mt-4 w-full border-[#DCC9B4] text-[#5F5145] hover:bg-[#F3EFEA]">Report a Problem</Button></section>}
        </aside></div>
      </div></main>

      <div className={`fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur ${landlordPortal ? "lg:left-60" : "lg:left-64"}`}><div className="mx-auto flex max-w-[1380px] items-center gap-3 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8"><div className="mr-auto min-w-0"><strong className={`block break-words text-sm font-black ${landlordPortal ? "text-[#302820]" : "text-[#756A60]"}`}>Prices are listed per room</strong><span className="text-xs font-bold text-emerald-600">{STATUS_LABEL[status]}</span></div>{!ownListing && user?.role !== "admin" && <Button variant="outline" onClick={() => void toggleFavorite(apartment.id)} className="shrink-0"><Heart className={`mr-0 h-4 w-4 sm:mr-2 ${favorite ? "fill-rose-500 text-rose-500" : ""}`} /><span className="hidden sm:inline">{favorite ? "Saved" : "Add to Favorites"}</span></Button>}</div></div>
      </div>
      </div>

      {editOpen && <EditApartmentDialog apartment={apartment} open={editOpen} onOpenChange={setEditOpen} onSave={saveApartment} />}
      {selectedRoom && <div className="fixed inset-0 z-[115] grid place-items-center overflow-y-auto bg-slate-950/60 p-4" onClick={() => setSelectedRoom(null)}>
        <div className="my-8 w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b p-5"><div><h2 className="text-xl font-black text-slate-950">{selectedRoom.name || "Room details"}</h2><p className="text-sm font-medium text-slate-500">{selectedRoom.type || "Room type not provided"}</p></div><button onClick={() => setSelectedRoom(null)} className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="h-4 w-4" /></button></div>
          <div className="grid gap-6 p-5 md:grid-cols-2">
            <RoomImageGallery images={selectedRoom.images} roomName={selectedRoom.name || "Room"} />
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2"><Badge className={STATUS_STYLE[roomStatus(selectedRoom)]}>{STATUS_LABEL[roomStatus(selectedRoom)]}</Badge>{selectedRoom.sqft ? <Badge className="bg-slate-100 text-slate-700">{selectedRoom.sqft} sq ft</Badge> : null}</div>
              <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg border bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Monthly rent</p><p className="mt-1 font-black text-slate-950">₱{Number(selectedRoom.price || 0).toLocaleString("en-PH")}</p></div><div className="rounded-lg border bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Capacity</p><p className="mt-1 font-black text-slate-950">{selectedRoom.maxOccupants || "Not provided"}</p></div><div className="rounded-lg border bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Bathroom</p><p className="mt-1 font-black text-slate-950">{selectedRoom.hasPrivateBath ? "Private" : selectedRoom.bathroomType || "Shared"}</p></div><div className="rounded-lg border bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Air conditioning</p><p className="mt-1 font-black text-slate-950">{selectedRoom.hasAC ? "Yes" : "No"}</p></div></div>
              <div><h3 className="font-black text-slate-950">Amenities</h3><div className="mt-2 flex flex-wrap gap-2"><Badge className="bg-blue-50 text-blue-700">{selectedRoom.hasPrivateBath ? "Private bathroom" : "Shared bathroom"}</Badge>{selectedRoom.hasAC && <Badge className="bg-blue-50 text-blue-700">Air conditioning</Badge>}</div></div>
              {selectedRoom.sharedBathLocation && <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm"><p className="font-black text-blue-900">Shared bathroom location</p><p className="mt-1 font-medium text-blue-700">{selectedRoom.sharedBathLocation}</p></div>}
              <div><h3 className="font-black text-slate-950">Description</h3><p className="mt-2 text-sm font-medium leading-6 text-slate-600">{selectedRoom.description || "No room description provided."}</p></div>
            </div>
          </div>
        </div>
      </div>}
      {reportOpen && <div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-slate-950/60 p-4" onClick={() => setReportOpen(false)}><div className="my-8 w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-black">Report a Problem</h2><p className="text-xs text-slate-500">Let us know about any issues you encountered with an apartment listing.</p></div><button onClick={() => setReportOpen(false)} className="grid h-9 w-9 place-items-center rounded-md bg-slate-100"><X className="h-4 w-4" /></button></div><div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto"><section className="p-5"><div className="mb-3"><p className="text-xs font-black uppercase tracking-widest text-[#756A60]">1 Select Apartment</p><p className="mt-1 text-xs text-slate-500">Choose the apartment listing related to your report.</p></div><div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">{apartment.title || "Untitled apartment"}</div></section><section className="p-5"><div className="mb-3"><p className="text-xs font-black uppercase tracking-widest text-[#756A60]">2 Describe the Problem</p><p className="mt-1 text-xs text-slate-500">Please provide as much detail as possible.</p></div><div className="relative"><textarea rows={5} maxLength={500} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} className="min-h-36 w-full resize-none rounded-lg border border-slate-200 p-4 text-sm font-medium outline-none focus:border-[#DCC9B4] focus:ring-2 focus:ring-[#F3EFEA]" placeholder="Describe what you experienced in as much detail as possible..." /><span className="absolute bottom-3 right-4 text-xs font-bold text-slate-400">{reportDetails.length}/500</span></div></section><section className="p-5"><div className="mb-3"><p className="text-xs font-black uppercase tracking-widest text-violet-600">3 Upload Image / Evidence <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500">Optional</span></p><p className="mt-1 text-xs text-slate-500">Attach images or documents that can help us understand the issue.</p></div><EvidenceUploader evidenceFiles={evidence} onEvidenceChange={setEvidence} maxFiles={5} maxFileSize={10} required={false} /><div className="mt-4 rounded-lg border border-violet-100 bg-violet-50 p-4"><p className="text-sm font-black text-violet-900">Evidence helps us review your report faster.</p><p className="mt-1 text-xs font-medium text-violet-700">Clear screenshots, photos, or documents are very helpful.</p></div></section><section className="p-5"><div className="mb-3"><p className="text-xs font-black uppercase tracking-widest text-emerald-600">4 Contact Information</p><p className="mt-1 text-xs text-slate-500">We may contact you for more details if needed.</p></div><input value={reportContact} onChange={(event) => setReportContact(event.target.value)} placeholder={user?.email || "Enter your email address"} className="h-12 w-full rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-800 outline-none focus:border-[#DCC9B4] focus:ring-2 focus:ring-[#F3EFEA]" /></section></div><div className="grid gap-3 border-t bg-slate-50/70 p-5 sm:grid-cols-[1fr_1.3fr]"><Button variant="outline" onClick={() => { setReportDetails(""); setReportContact(user?.email || ""); setEvidence([]); }} disabled={submittingReport} className="h-12 rounded-lg border-slate-200 font-black text-slate-600 hover:bg-white">Clear Form</Button><Button onClick={() => void submitReport()} disabled={submittingReport || !reportDetails.trim()} className="h-12 rounded-lg bg-[#8B735B] font-black text-white hover:bg-[#756A60]">{submittingReport ? "Submitting..." : "Submit Report"}</Button></div></div></div>}
    </div>
  );
}
