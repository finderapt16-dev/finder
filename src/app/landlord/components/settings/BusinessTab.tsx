import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { type Apartment } from "@/app/shared/data/apartments";
import { formatApartmentLocation } from "@/app/shared/utils/apartmentLocation";
import { Building2, MapPin, Plus, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import type { Dispatch, SetStateAction } from "react";
import type { ApartmentRoom } from "@/app/shared/data/apartments";
import { SettingsField as Field } from "@/app/landlord/components/settings/SettingsField";
import { SettingsInput } from "@/app/landlord/components/settings/SettingsInput";
import { SettingsSelect } from "@/app/landlord/components/settings/SettingsSelect";
import { SettingsSectionTitle as SectionTitle } from "@/app/landlord/components/settings/SettingsSectionTitle";
import type { LandlordBusiness } from "@/app/landlord/types/settings";

interface BusinessTabProps {
  business: LandlordBusiness;
  setB: (key: string, val: string) => void;
  myApartments: Apartment[];
  allRooms: ApartmentRoom[];
  availableCount: number;
  setEditingApartment: Dispatch<SetStateAction<Apartment | null>>;
  setBusiness: Dispatch<SetStateAction<LandlordBusiness>>;
  savedBusiness: LandlordBusiness;
  handleSaveBusiness: () => Promise<void>;
}

export const BusinessTab = ({
  business,
  setB,
  myApartments,
  allRooms,
  availableCount,
  setEditingApartment,
  setBusiness,
  savedBusiness,
  handleSaveBusiness,
}: BusinessTabProps) => (
  <div className="space-y-5">
    <div className="space-y-4 rounded-2xl border-2 border-slate-100 bg-white p-5">
      <SectionTitle icon="🏢" title="Business Information" subtitle="Information that applies to your landlord business" />
      <Field label="Business / Trade Name" hint="Leave blank to use your personal name">
        <SettingsInput value={business.businessName} onChange={(e: any) => setB("businessName", e.target.value)} placeholder="e.g. Santos Apartments" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Business Type">
          <SettingsSelect value={business.businessType} onChange={(e: any) => setB("businessType", e.target.value)}>
            <option value="sole_proprietor">Sole Proprietor</option>
            <option value="partnership">Partnership</option>
            <option value="corporation">Corporation / OPC</option>
          </SettingsSelect>
        </Field>
        <Field label="Years in Operation">
          <SettingsInput type="number" min="0" value={business.yearsActive} onChange={(e: any) => setB("yearsActive", e.target.value)} placeholder="e.g. 5" />
        </Field>
      </div>
      <Field label="BIR TIN" hint="Tax Identification Number, if applicable">
        <SettingsInput value={business.taxId} onChange={(e: any) => setB("taxId", e.target.value)} placeholder="XXX-XXX-XXX-000" />
      </Field>
    </div>

    <div className="space-y-4 rounded-2xl border-2 border-slate-100 bg-white p-5">
      <SectionTitle icon="🏘️" title="Property Portfolio" subtitle="Calculated automatically from your registered properties and rooms" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Properties", value: myApartments.length },
          { label: "Total Rooms", value: allRooms.length },
          { label: "Available Rooms", value: availableCount },
        ].map((item) => <div key={item.label} className="rounded-xl border border-[#E8DED1] bg-[#FAF8F5] p-4"><p className="text-xs font-bold text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-black text-slate-900">{item.value}</p></div>)}
      </div>
    </div>

    <div className="space-y-4 rounded-2xl border-2 border-slate-100 bg-white p-5">
      <SectionTitle icon="📄" title="Property Verification & Permits" subtitle="Manage permit and verification information for each of your properties." />
      {myApartments.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-[#DCC9B4] bg-[#FAF8F5] p-8 text-center">
          <Building2 className="h-9 w-9 text-[#C9B8A5]" /><h3 className="mt-3 font-black text-slate-900">No properties yet</h3><p className="mt-1 text-sm text-slate-500">Add a property first to manage its permit and verification information.</p>
          <Link to="/add-apartment"><Button className="mt-4 bg-[#8B735B] font-bold text-white hover:bg-[#756A60]"><Plus className="mr-2 h-4 w-4" />Add Property</Button></Link>
        </div>
      ) : (
        <div className="divide-y divide-[#EEE6DC] overflow-hidden rounded-xl border border-[#E8DED1]">
          {myApartments.map((apartment) => {
            const featureRecord = apartment.features && !Array.isArray(apartment.features) ? apartment.features : {};
            const propertyVerification = featureRecord.verification && typeof featureRecord.verification === "object" && !Array.isArray(featureRecord.verification) ? featureRecord.verification as Record<string, unknown> : {};
            const permit = typeof propertyVerification.businessPermit === "string" ? propertyVerification.businessPermit : "";
            const expiry = typeof propertyVerification.permitExpiry === "string" ? propertyVerification.permitExpiry : "";
            const status = apartment.approvalStatus === "approved" ? "Verified" : apartment.approvalStatus === "rejected" ? "Rejected" : "Pending Verification";
            return <div key={apartment.id} className="grid gap-4 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center"><div className="min-w-0"><p className="truncate font-black text-slate-900">{apartment.title || "Untitled property"}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{formatApartmentLocation(apartment, "Address unavailable")}</p></div><div><p className="text-[10px] font-bold uppercase text-slate-400">Verification Status</p><Badge className="mt-1 bg-[#FAF8F5] text-[#5F5145]">{status}</Badge></div><div><p className="text-[10px] font-bold uppercase text-slate-400">Business Permit No.</p><p className="mt-1 text-sm font-bold text-slate-700">{permit || "Not provided"}</p><p className="mt-1 text-xs text-slate-500">Expiry: {expiry ? new Date(`${expiry}T00:00:00`).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "Not provided"}</p></div><Button variant="outline" onClick={() => setEditingApartment(apartment as Apartment)} className="border-[#DCC9B4] font-bold text-[#8B735B] hover:bg-[#FAF8F5]">View / Update Permit</Button></div>;
          })}
        </div>
      )}
    </div>

    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button variant="outline" onClick={() => setBusiness(savedBusiness)} className="rounded-md font-bold"><RotateCcw className="mr-2 h-4 w-4" />Reset Changes</Button>
      <Button onClick={handleSaveBusiness} className="rounded-md bg-[#8B735B] font-bold text-white hover:bg-[#756A60]">Save Business Details</Button>
    </div>
  </div>
);
