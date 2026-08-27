import { Home, Images, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Apartment } from "../../data/apartments";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { LocationPicker } from "./LocationPicker";
import { MultiImageUploader, type UploadedImage } from "./MultiImageUploader";
import { DEFAULT_LA_PAZ_MAP_CENTER, hasValidApartmentCoordinates } from "../../utils/mapCoordinates";

interface EditApartmentDialogProps {
  apartment: Apartment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedApartment: Apartment, images: UploadedImage[]) => void | Promise<void>;
}

const getEditableFeatures = (apartment: Apartment): string[] => {
  const rawFeatures = apartment.features;
  const features = Array.isArray(rawFeatures)
    ? rawFeatures.filter((item): item is string => typeof item === "string")
    : rawFeatures && typeof rawFeatures === "object" && Array.isArray(rawFeatures.customFeatures)
      ? rawFeatures.customFeatures.filter((item): item is string => typeof item === "string")
      : [];
  const addLegacyFeature = (enabled: boolean, label: string) => {
    if (enabled && !features.some((item) => item.toLowerCase() === label.toLowerCase())) features.push(label);
  };
  addLegacyFeature(apartment.petFriendly, "Pet Friendly");
  addLegacyFeature(apartment.parking, "Parking");
  addLegacyFeature(apartment.furnished, "Furnished");
  return features;
};

export function EditApartmentDialog({ apartment, open, onOpenChange, onSave }: EditApartmentDialogProps) {
  const [formData, setFormData] = useState<Apartment>(apartment);
  const [isSaving, setIsSaving] = useState(false);
  const [locationLookupRequest, setLocationLookupRequest] = useState(0);
  const [locationResolving, setLocationResolving] = useState(false);
  const lastAutoGeocodedAddressRef = useRef("");
  const [amenitiesInput, setAmenitiesInput] = useState(apartment.amenities.join(", "));
  const [utilitiesInput, setUtilitiesInput] = useState(
    Array.isArray(apartment.utilities) ? apartment.utilities.join(", ") : "",
  );
  const [featuresInput, setFeaturesInput] = useState(() => {
    return getEditableFeatures(apartment).join(", ");
  });

  // ── Image Management State ─────────────────────────────────────────────
  const [existingImages, setExistingImages] = useState<UploadedImage[]>(
    (apartment.images || []).map((url, idx) => ({
      id: `existing-${idx}`,
      url,
      isPrimary: idx === 0 || url === apartment.image,
      sortOrder: idx,
    }))
  );
  const [newImages, setNewImages] = useState<UploadedImage[]>([]);
  useEffect(() => {
    if (!open) return;
    setFormData(apartment);
    setAmenitiesInput(apartment.amenities.join(", "));
    setUtilitiesInput(Array.isArray(apartment.utilities) ? apartment.utilities.join(", ") : "");
    setFeaturesInput(getEditableFeatures(apartment).join(", "));
    setLocationLookupRequest(0);
    setLocationResolving(false);
    lastAutoGeocodedAddressRef.current = [apartment.address, apartment.city, apartment.state, apartment.zip, "Philippines"]
      .filter(Boolean)
      .join(", ")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
    setExistingImages((apartment.images || []).map((url, index) => ({
      id: `existing-${index}`,
      url,
      isPrimary: url === apartment.image || (!apartment.image && index === 0),
      sortOrder: index,
    })));
    setNewImages([]);
  }, [apartment, open]);
  // ───────────────────────────────────────────────────────────────────────

  const handleExistingImageDelete = (id: string) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleExistingImageSetPrimary = (id: string) => {
    setExistingImages((prev) =>
      prev.map((img) => ({
        ...img,
        isPrimary: img.id === id,
      }))
    );
  };

  const locationAddressQuery = useMemo(
    () => [formData.address, formData.city, formData.state, formData.zip, "Philippines"].filter(Boolean).join(", "),
    [formData.address, formData.city, formData.state, formData.zip],
  );

  useEffect(() => {
    if (!open) return;
    if (!formData.address.trim()) return;

    const normalizedQuery = locationAddressQuery.trim().replace(/\s+/g, " ").toLowerCase();
    if (!normalizedQuery || normalizedQuery === lastAutoGeocodedAddressRef.current) return;

    setLocationResolving(true);
    const timer = window.setTimeout(() => {
      lastAutoGeocodedAddressRef.current = normalizedQuery;
      setLocationLookupRequest((request) => request + 1);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [formData.address, locationAddressQuery, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!formData.address.trim()) {
      toast.error("Address is required before saving.");
      return;
    }

    if (locationResolving) {
      toast.error("Please wait for the map location to finish resolving.");
      return;
    }

    if (!hasValidApartmentCoordinates(formData.lat, formData.lng)) {
      toast.error("We could not find this address on the map. Please check the address or move the marker manually.");
      return;
    }

    // Combine all images (existing + new)
    const imageRecords = [...existingImages, ...newImages];
    const allImages = imageRecords.map((image) => image.url);

    // Find primary image
    const primaryImage =
      existingImages.find((img) => img.isPrimary)?.url ||
      newImages.find((img) => img.isPrimary)?.url ||
      allImages[0];
    const amenities = amenitiesInput.split(",").map((item) => item.trim()).filter(Boolean);
    const utilities = utilitiesInput.split(",").map((item) => item.trim()).filter(Boolean);
    const customFeatures = featuresInput.split(",").map((item) => item.trim()).filter(Boolean);
    const normalizedFeatureNames = customFeatures.map((item) => item.toLowerCase());
    const existingFeatureRecord = formData.features && !Array.isArray(formData.features)
      ? formData.features
      : {};

    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        rooms: apartment.rooms,
        images: allImages,
        image: primaryImage,
        amenities,
        utilities,
        petFriendly: normalizedFeatureNames.includes("pet friendly"),
        parking: normalizedFeatureNames.includes("parking"),
        furnished: normalizedFeatureNames.includes("furnished"),
        features: { ...existingFeatureRecord, customFeatures },
        bedrooms: apartment.bedrooms,
        bathrooms: apartment.bathrooms,
        price: apartment.price,
      }, imageRecords);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-x-hidden overflow-y-auto p-4 sm:max-h-[90vh] sm:w-full sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Apartment</DialogTitle>
          <DialogDescription>
            Update the details of your apartment listing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Images Section */}
          <div className="space-y-3 border-b pb-4">
            <div className="flex items-center gap-2">
              <Images className="h-5 w-5 text-[#756A60]" />
              <Label className="text-[#5F5145] font-bold">Property Images</Label>
            </div>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Current Images</h4>
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {existingImages.map((img) => (
                    <div
                      key={img.id}
                      className={`relative group rounded-lg overflow-hidden border-2 aspect-square ${
                        img.isPrimary
                          ? "border-yellow-400 ring-2 ring-yellow-300"
                          : "border-gray-200"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt="Apartment"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <button
                          type="button"
                          title="Set as primary"
                          onClick={(e) => {
                            e.preventDefault();
                            handleExistingImageSetPrimary(img.id);
                          }}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white p-1.5 rounded"
                        >
                          <Star className="h-3 w-3 fill-current" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={(e) => {
                            e.preventDefault();
                            handleExistingImageDelete(img.id);
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {img.isPrimary && (
                        <div className="absolute top-1 right-1 bg-yellow-400 rounded-full p-0.5">
                          <Star className="h-3 w-3 text-yellow-900 fill-current" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Images Upload */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">Add More Images</h4>
              <MultiImageUploader
                images={newImages}
                onImagesChange={setNewImages}
                maxImages={10 - existingImages.length}
                maxFileSize={5}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="sqft">Square Feet</Label>
              <Input
                id="sqft"
                type="number"
                value={formData.sqft || ""}
                onChange={(e) => setFormData({ ...formData, sqft: Number(e.target.value) })}
                required
                className="hide-number-spinners"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => {
                setFormData({ ...formData, address: e.target.value, lat: Number.NaN, lng: Number.NaN });
                setLocationResolving(Boolean(e.target.value.trim()));
              }}
              onBlur={() => setLocationLookupRequest((request) => request + 1)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => {
                  setFormData({ ...formData, city: e.target.value, lat: Number.NaN, lng: Number.NaN });
                  setLocationResolving(Boolean(formData.address.trim()));
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => {
                  setFormData({ ...formData, state: e.target.value, lat: Number.NaN, lng: Number.NaN });
                  setLocationResolving(Boolean(formData.address.trim()));
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={formData.zip}
                onChange={(e) => {
                  setFormData({ ...formData, zip: e.target.value, lat: Number.NaN, lng: Number.NaN });
                  setLocationResolving(Boolean(formData.address.trim()));
                }}
                required
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-[#F3EFEA] bg-[#FAF8F5]/30 p-4">
            <div>
              <Label className="text-[#5F5145]">Map Location</Label>
              <p className="mt-1 text-xs text-slate-500">Use the address lookup or drag the pin to the exact apartment location.</p>
            </div>
            <LocationPicker
              lat={Number.isFinite(Number(formData.lat)) ? Number(formData.lat) : DEFAULT_LA_PAZ_MAP_CENTER.lat}
              lng={Number.isFinite(Number(formData.lng)) ? Number(formData.lng) : DEFAULT_LA_PAZ_MAP_CENTER.lng}
              addressQuery={locationAddressQuery}
              geocodeRequestKey={locationLookupRequest}
              onGeocodeStatusChange={(status) => setLocationResolving(status === "loading")}
              onLocationChange={(lat, lng) => setFormData((current) => ({ ...current, lat, lng }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="availableDate">Available Date</Label>
            <Input
              id="availableDate"
              type="date"
              value={formData.availableDate}
              onChange={(e) => setFormData({ ...formData, availableDate: e.target.value })}
              required
            />
          </div>

+          <div className="flex flex-col gap-3 rounded-lg border border-[#F3EFEA] bg-[#FAF8F5]/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label className="font-bold text-[#5F5145]">Room Management</Label>
              <p className="mt-1 text-xs text-slate-500">Existing rooms, rent, images, capacity, and status are preserved. Use Manage Rooms for room changes.</p>
            </div>
            <a href={`/landlord/properties/${apartment.id}/rooms`} className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-[#DCC9B4] bg-white px-4 text-sm font-bold text-[#5F5145] transition hover:bg-[#FAF8F5]">Manage Rooms</a>
          </div>
          <div className="space-y-4 rounded-lg border border-[#F3EFEA] bg-[#FAF8F5]/30 p-4">
            <div className="flex items-center gap-2 border-b border-[#F3EFEA] pb-3">
              <Home className="h-5 w-5 text-[#756A60]" />
              <div>
                <Label className="font-bold text-[#5F5145]">Amenities & Features</Label>
                <p className="text-xs text-slate-500">These values use the same format as Add Property.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAmenities">Amenities (comma-separated)</Label>
              <Textarea id="editAmenities" rows={2} value={amenitiesInput} onChange={(event) => setAmenitiesInput(event.target.value)} placeholder="Parking, WiFi, Gym, Pool" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editUtilities">Utilities Included (comma-separated)</Label>
              <Textarea id="editUtilities" rows={2} value={utilitiesInput} onChange={(event) => setUtilitiesInput(event.target.value)} placeholder="Water, Electricity, Internet" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFeatures">Additional Features (comma-separated)</Label>
              <Textarea id="editFeatures" rows={2} value={featuresInput} onChange={(event) => setFeaturesInput(event.target.value)} placeholder="Pet Friendly, Parking, Furnished" />
            </div>
          </div>

          <DialogFooter className="sticky -bottom-4 z-10 border-t bg-white py-4 sm:-bottom-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || locationResolving}>
              {isSaving ? "Saving..." : locationResolving ? "Finding location..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
