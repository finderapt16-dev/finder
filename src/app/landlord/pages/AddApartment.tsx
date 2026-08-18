import { LocationPicker } from "@/app/shared/components/common/LocationPicker";
import { LogoutConfirmation } from "@/app/shared/components/common/LogoutConfirmation";
import { MultiImageUploader, type UploadedImage } from "@/app/shared/components/common/MultiImageUploader";
import { Alert, AlertDescription, AlertTitle } from "@/app/shared/components/ui/alert";
import { Button } from "@/app/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/shared/components/ui/card";
import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
import { Textarea } from "@/app/shared/components/ui/textarea";
import { useApartmentsContext } from "@/app/shared/contexts/ApartmentsContext";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import {
  apartmentFormValuesFromApartment,
  createApartment,
  createApartmentRoom,
  fetchApartmentWithImages,
  resolveAppUserId,
  updateApartmentRoom,
  uploadApartmentImage,
  uploadApartmentRoomImage,
  type Apartment,
  type ApartmentStatus,
} from "@/app/shared/data/apartments";
import {
  VERIFICATION_DOCUMENT_TYPES,
  uploadVerificationDocuments,
  validateVerificationFile,
  type PendingVerificationDocument,
  type VerificationDocumentType,
} from "@/app/shared/services/verificationDocumentsService";
import {
  deletePropertyDraft,
  fetchPropertyDraft,
  savePropertyDraft,
} from "@/app/shared/services/propertyDraftService";
import {
  DEFAULT_LA_PAZ_MAP_CENTER,
  hasValidApartmentCoordinates,
} from "@/app/shared/utils/mapCoordinates";
import { supabase } from "@/lib/supabaseclient";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  Camera,
  Check,
  Cloud, CloudUpload,
  FileText,
  Home,
  HelpCircle,
  ListChecks,
  MapPin,
  Menu,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Trash2,
  TrendingUp,
  LogOut,
  Upload, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

// ── Room type ─────────────────────────────────────────────────────────────────
type Room = {
  id: string;
  roomName: string;              // Room number or name (e.g., "Room 101", "Unit A")
  type: string;
  sqft: number;
  maxOccupants?: number;
  rent?: number;
  hasPrivateBath: boolean;
  bathroomType: string;        // "en-suite" | "separate" | ""
  sharedBathLocation: string;
  status: ApartmentStatus;
  isOccupied: boolean;
  hasAC: boolean;
  description: string;           // Room description
  images: string[];              // Room images (URLs or data URLs)
};

type PropertyDraft = {
  version: 2;
  savedAt: string;
  currentStep: number;
  formData: Partial<Apartment>;
  rooms: Room[];
  amenitiesInput: string;
  utilitiesInput: string;
  features: string[];
  featureInput: string;
  verificationData: {
    propertyAddress: string;
    businessPermit: string;
    tinNumber: string;
    idType: string;
    idNumber: string;
  };
  uploadedImages: UploadedImage[];
  requiresImageReupload: boolean;
};

type DraftStatus = "idle" | "saving" | "saved" | "restored" | "error";

function isPropertyDraft(value: unknown): value is PropertyDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<PropertyDraft>;
  return draft.version === 2 && typeof draft.savedAt === "string" && Number.isFinite(draft.currentStep);
}

const makeRoom = (): Room => ({
  id: Date.now().toString() + Math.random(),
  roomName: "",
  type: "Bedroom",
  sqft: 150,
  maxOccupants: undefined,
  rent: undefined,
  hasPrivateBath: false,
  bathroomType: "",
  sharedBathLocation: "",
  status: "available",
  isOccupied: false,
  hasAC: false,
  description: "",
  images: [],
});
// ─────────────────────────────────────────────────────────────────────────────

const VALID_ID_TYPES = [
  "Passport",
  "Driver's License",
  "SSS ID",
  "GSIS ID",
  "PhilHealth ID",
  "Postal ID",
  "Voter's ID",
  "PRC ID",
  "National ID (PhilSys)",
  "TIN ID",
  "Barangay ID",
  "Senior Citizen ID",
  "PWD ID",
  "OFW ID",
];

const SUGGESTED_FEATURES = [
  "Pet Friendly",
  "Parking",
  "Furnished",
  "Semi-Furnished",
  "WiFi Ready",
  "CCTV",
  "Security Guard",
  "Swimming Pool",
  "Gym",
  "Balcony",
  "Garden",
  "Elevator",
  "Generator / Backup Power",
  "Water Heater",
  "Laundry Area",
  "Storage Room",
  "Near Market",
  "Near Hospital",
  "Near School",
];

const INITIAL_FORM_DATA: Partial<Apartment> = {
  title: "",
  sqft: 500,
  address: "",
  city: "La Paz",
  state: "Iloilo City",
  zip: "5000",
  description: "",
  availableDate: new Date().toISOString().split("T")[0],
  petFriendly: false,
  parking: false,
  furnished: false,
  image: "",
  images: [],
  amenities: [],
  utilities: false,
  status: "available",
};

const INITIAL_VERIFICATION_DATA = {
  propertyAddress: "",
  businessPermit: "",
  tinNumber: "",
  idType: "",
  idNumber: "",
};

export function AddApartment() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { refreshApartments } = useApartmentsContext();

  // ── Wizard State ───────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const totalSteps = 4;

  const stepConfig = [
    { number: 1, title: "Property Information", description: "Photos, title, and basic details" },
    { number: 2, title: "Verification", description: "Permit details and supporting documents" },
    { number: 3, title: "Location", description: "Address and map location" },
    { number: 4, title: "Amenities & Features", description: "Utilities and additional features" },
  ];
  // ─────────────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState<Partial<Apartment>>({ ...INITIAL_FORM_DATA });
  const [locationLookupRequest, setLocationLookupRequest] = useState(0);
  const [locationPinned, setLocationPinned] = useState(false);
  const [locationResolving, setLocationResolving] = useState(false);
  const lastAutoGeocodedAddressRef = useRef("");

  // ── Rooms state ───────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<Room[]>([makeRoom()]);

  // ─────────────────────────────────────────────────────────────────────

  // ── Multiple Images State ──────────────────────────────────────────────
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  // ─────────────────────────────────────────────────────────────────────

  const [amenitiesInput, setAmenitiesInput] = useState("");
  const [utilitiesInput, setUtilitiesInput] = useState("");

  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");

  const addFeature = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (features.map((f) => f.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast.error("Feature already added");
      return;
    }
    setFeatures((prev) => [...prev, trimmed]);
    setFeatureInput("");
    setValidationErrors((previous) => {
      if (!previous.features) return previous;
      const next = { ...previous };
      delete next.features;
      return next;
    });
  };

  const removeFeature = (index: number) =>
    setFeatures((prev) => prev.filter((_, i) => i !== index));

  const handleFeatureKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addFeature(featureInput);
    }
  };

  const [verificationData, setVerificationData] = useState({ ...INITIAL_VERIFICATION_DATA });
  const [verificationDocuments, setVerificationDocuments] = useState<PendingVerificationDocument[]>([]);
  const [pendingDraft, setPendingDraft] = useState<PropertyDraft | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle");
  const [draftReady, setDraftReady] = useState(false);
  const [imageReuploadRequired, setImageReuploadRequired] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutoSaveRef = useRef(false);
  const submissionCompleteRef = useRef(false);

  const selectVerificationDocument = (type: VerificationDocumentType, file?: File) => {
    if (!file) return;
    const error = validateVerificationFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setVerificationDocuments((current) => {
      const previous = current.find((document) => document.type === type);
      if (previous?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(previous.previewUrl);
      return [
        ...current.filter((document) => document.type !== type),
        { type, file, previewUrl: URL.createObjectURL(file) },
      ];
    });
  };

  const removePendingVerificationDocument = (type: VerificationDocumentType) => {
    setVerificationDocuments((current) => {
      const document = current.find((item) => item.type === type);
      if (document?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(document.previewUrl);
      return current.filter((item) => item.type !== type);
    });
  };

  const hasDraftContent = useMemo(() => {
    const roomHasContent = rooms.length > 1 || rooms.some((room) =>
      Boolean(
        room.roomName.trim()
        || room.description.trim()
        || Number(room.rent) > 0
        || room.images.length > 0
        || room.hasPrivateBath
        || room.hasAC
        || room.status !== "available"
        || room.type !== "Bedroom"
        || room.sqft !== 150
        || (Number(room.maxOccupants) > 0 && Number(room.maxOccupants) !== 1),
      ),
    );
    const verificationHasContent = Object.values(verificationData).some((value) => value.trim().length > 0);

    return Boolean(
      String(formData.title ?? "").trim()
      || String(formData.description ?? "").trim()
      || String(formData.address ?? "").trim()
      || amenitiesInput.trim()
      || utilitiesInput.trim()
      || features.length > 0
      || featureInput.trim()
      || uploadedImages.length > 0
      || verificationDocuments.length > 0
      || roomHasContent
      || verificationHasContent
      || currentStep > 1,
    );
  }, [amenitiesInput, currentStep, featureInput, features, formData, rooms, uploadedImages, utilitiesInput, verificationData, verificationDocuments]);

  const resetDraftForm = () => {
    setCurrentStep(1);
    setFormData({ ...INITIAL_FORM_DATA });
    setRooms([makeRoom()]);
    setUploadedImages([]);
    setAmenitiesInput("");
    setUtilitiesInput("");
    setFeatures([]);
    setFeatureInput("");
    setVerificationData({ ...INITIAL_VERIFICATION_DATA });
    setVerificationDocuments((current) => {
      current.forEach((document) => {
        if (document.previewUrl.startsWith("blob:")) URL.revokeObjectURL(document.previewUrl);
      });
      return [];
    });
    setValidationErrors({});
    setImageReuploadRequired(false);
    setLocationPinned(false);
    setLocationResolving(false);
    lastAutoGeocodedAddressRef.current = "";
  };

  const discardDraft = (resetForm = true) => {
    if (user?.id) {
      void deletePropertyDraft(user.id).catch((error) => {
        console.error("Unable to delete the property draft:", error);
      });
    }
    setPendingDraft(null);
    setDraftReady(true);
    setDraftStatus("idle");
    if (resetForm) resetDraftForm();
  };

  const continueDraft = () => {
    if (!pendingDraft) return;
    skipNextAutoSaveRef.current = true;
    setCurrentStep(Math.min(totalSteps, Math.max(1, pendingDraft.currentStep || 1)));
    const restoredFormData = { ...INITIAL_FORM_DATA, ...pendingDraft.formData, image: "", images: [] };
    setFormData(restoredFormData);
    setLocationPinned(hasValidApartmentCoordinates(restoredFormData.lat, restoredFormData.lng));
    setRooms(pendingDraft.rooms.length > 0 ? pendingDraft.rooms : [makeRoom()]);
    setUploadedImages(pendingDraft.uploadedImages ?? []);
    setAmenitiesInput(pendingDraft.amenitiesInput ?? "");
    setUtilitiesInput(pendingDraft.utilitiesInput ?? "");
    setFeatures(pendingDraft.features ?? []);
    setFeatureInput(pendingDraft.featureInput ?? "");
    setVerificationData({ ...INITIAL_VERIFICATION_DATA, ...pendingDraft.verificationData });
    setImageReuploadRequired(Boolean(pendingDraft.requiresImageReupload));
    setPendingDraft(null);
    setDraftReady(true);
    setDraftStatus("restored");
    toast.success("Property draft restored");
  };

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    setDraftReady(false);
    setPendingDraft(null);
    void fetchPropertyDraft<unknown>(user.id)
      .then((parsed) => {
        if (!active) return;
        if (parsed && isPropertyDraft(parsed)) {
          setPendingDraft(parsed);
        } else if (parsed) {
          void deletePropertyDraft(user.id).catch((error) => {
            console.error("Unable to remove an invalid property draft:", error);
          });
        }
      })
      .catch((error) => {
        console.error("Unable to read the Add Property draft:", error);
      })
      .finally(() => {
        if (active) setDraftReady(true);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const persistDraft = useCallback(async (updateStatus = true) => {
    if (!user?.id || !hasDraftContent || submissionCompleteRef.current) return;
    const persistentImages = uploadedImages
      .filter((image) => !image.file && /^https?:\/\//i.test(image.url))
      .map((image) => ({ ...image, file: undefined }));
    const hasLocalPropertyImages = uploadedImages.some((image) => Boolean(image.file) || /^(data:|blob:)/i.test(image.url));
    const safeRooms = rooms.map((room) => ({
      ...room,
      images: room.images.filter((image) => /^https?:\/\//i.test(image)),
    }));
    const hasLocalRoomImages = rooms.some((room) => room.images.some((image) => !/^https?:\/\//i.test(image)));
    const { image: _image, images: _images, ...safeFormData } = formData;
    const draft: PropertyDraft = {
      version: 2,
      savedAt: new Date().toISOString(),
      currentStep,
      formData: safeFormData,
      rooms: safeRooms,
      amenitiesInput,
      utilitiesInput,
      features,
      featureInput,
      verificationData: INITIAL_VERIFICATION_DATA,
      uploadedImages: persistentImages,
      requiresImageReupload: hasLocalPropertyImages || hasLocalRoomImages || imageReuploadRequired,
    };

    try {
      await savePropertyDraft(user.id, draft);
      if (updateStatus) setDraftStatus("saved");
    } catch (error) {
      console.error("Unable to save the Add Property draft:", error);
      if (updateStatus) setDraftStatus("error");
    }
  }, [amenitiesInput, currentStep, featureInput, features, formData, hasDraftContent, imageReuploadRequired, rooms, uploadedImages, user?.id, utilitiesInput, verificationData]);

  useEffect(() => {
    if (!draftReady || !user?.id || submissionCompleteRef.current) return;
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (!hasDraftContent) {
      void deletePropertyDraft(user.id).catch((error) => {
        console.error("Unable to clear the empty property draft:", error);
      });
      setDraftStatus("idle");
      return;
    }

    setDraftStatus("saving");
    autoSaveTimerRef.current = setTimeout(() => void persistDraft(), 700);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [draftReady, hasDraftContent, persistDraft, user?.id]);

  const fieldClass = (field: string) => validationErrors[field]
    ? "rounded-xl border-red-400 focus-visible:border-red-500 focus-visible:ring-red-100"
    : "rounded-xl border-slate-200 focus-visible:border-amber-500 focus-visible:ring-amber-100";

  const clearValidationError = (field: string) => {
    setValidationErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const FieldError = ({ field }: { field: string }) =>
    validationErrors[field] ? <p className="text-xs font-bold text-red-600">{validationErrors[field]}</p> : null;

  const locationAddressQuery = useMemo(
    () => [formData.address, formData.city, formData.state, formData.zip, "Philippines"].filter(Boolean).join(", "),
    [formData.address, formData.city, formData.state, formData.zip],
  );

  useEffect(() => {
    if (currentStep !== 3) return;
    if (!String(formData.address ?? "").trim()) return;

    const normalizedQuery = locationAddressQuery.trim().replace(/\s+/g, " ").toLowerCase();
    if (!normalizedQuery || normalizedQuery === lastAutoGeocodedAddressRef.current) return;

    setLocationResolving(true);
    const timer = window.setTimeout(() => {
      lastAutoGeocodedAddressRef.current = normalizedQuery;
      setLocationLookupRequest((request) => request + 1);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [currentStep, formData.address, locationAddressQuery]);

  const getSubmittedAmenities = () =>
    amenitiesInput.split(",").map((amenity) => amenity.trim()).filter(Boolean);

  const getSubmittedFeatures = () => {
    const submittedFeatures = featureInput.trim() ? [...features, featureInput.trim()] : features;
    return submittedFeatures.filter((feature, index, list) =>
      list.findIndex((item) => item.toLowerCase() === feature.toLowerCase()) === index,
    );
  };

  const validateAllFields = (): { isValid: boolean; errors: Record<string, string>; firstStep: number } => {
    const errors: Record<string, string> = {};

    if (!String(formData.title ?? "").trim()) errors.title = "Property title is required.";
    if (!Number(formData.sqft)) errors.sqft = "Total property area is required.";
    if (!String(formData.description ?? "").trim()) errors.description = "Property description is required.";
    if (uploadedImages.length === 0) errors.images = "Upload at least one property image.";

    if (!String(formData.address ?? "").trim()) errors.address = "Complete address is required.";
    if (locationResolving) {
      errors.mapLocation = "Finding this address on the map. Please wait a moment.";
    } else if (!locationPinned || !hasValidApartmentCoordinates(formData.lat, formData.lng)) {
      errors.mapLocation = "Pin this apartment's real map location before submitting.";
    }

    if (!String(verificationData.businessPermit).trim()) errors.businessPermit = "Business permit number is required.";

    if (getSubmittedAmenities().length === 0) {
      errors.amenities = "Please select at least one amenity before submitting your property.";
    }
    if (getSubmittedFeatures().length === 0) {
      errors.features = "Please add at least one feature before submitting your property.";
    }

    const firstStep = errors.title || errors.sqft || errors.description || errors.images
      ? 1
      : errors.businessPermit
        ? 2
        : errors.address || errors.mapLocation
          ? 3
          : errors.amenities || errors.features
            ? 4
            : currentStep;

    return { isValid: Object.keys(errors).length === 0, errors, firstStep };
  };

  // ── Step validation ────────────────────────────────────────────────────
  const validateStep = (step: number): boolean => {
    const { errors } = validateAllFields();
    const belongsToStep = (field: string) => {
      if (step === 1) return ["title", "sqft", "description", "images"].includes(field);
      if (step === 2) return field === "businessPermit";
      if (step === 3) return ["address", "mapLocation"].includes(field);
      if (step === 4) return ["amenities", "features"].includes(field);
      return false;
    };
    const stepErrors = Object.fromEntries(Object.entries(errors).filter(([field]) => belongsToStep(field)));
    setValidationErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === currentStep || isSubmitting) return;

    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    for (let step = currentStep; step < targetStep; step += 1) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        toast.error(`Complete ${stepConfig[step - 1].title} before continuing.`);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    setCurrentStep(targetStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      if (currentStep === 1 && uploadedImages.length === 0) {
        toast.error("Please upload at least one property image");
      } else {
        toast.error("Please fill in all required fields for this step");
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions while async operation is in flight
    if (isSubmitting) {
      toast.error("Please wait for your submission to complete...");
      return;
    }
    
    if (!user || user.role !== "landlord") {
      toast.error("Only landlords can add apartments");
      return;
    }
    if (!user.id) {
      toast.error("User ID is missing. Please log in again.");
      return;
    }

    if (uploadedImages.length === 0) {
      toast.error("Please upload at least one property image");
      return;
    }

    const validation = validateAllFields();
    setValidationErrors(validation.errors);
    if (!validation.isValid) {
      setCurrentStep(validation.firstStep);
      toast.error("Please complete all required fields before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const submittedAmenities = getSubmittedAmenities();
    const submittedFeatures = getSubmittedFeatures();
    const featureLower = submittedFeatures.map((f) => f.toLowerCase());
    const utilityItems = utilitiesInput.split(",").map((u) => u.trim()).filter(Boolean);

    // Get primary image or use first image
    const primaryImageUrl = uploadedImages.find((img) => img.isPrimary)?.url || uploadedImages[0].url;

    const draftApartment: Apartment = {
      id: "",
      title: formData.title || "",
      price: 0,
      bedrooms: 0,
      bathrooms: 0,
      sqft: Number(formData.sqft) || 500,
      address: formData.address || "",
      city: formData.city || "La Paz",
      state: formData.state || "Iloilo City",
      zip: formData.zip || "5000",
      image: primaryImageUrl,
      images: uploadedImages.map((img) => img.url),
      description: formData.description || "",
      amenities: submittedAmenities,
      availableDate: formData.availableDate || new Date().toISOString().split("T")[0],
      petFriendly: featureLower.includes("pet friendly"),
      parking: featureLower.includes("parking"),
      furnished: featureLower.includes("furnished"),
      utilities: utilityItems,
      lat: Number(formData.lat),
      lng: Number(formData.lng),
      landlordId: user.id,
      isPublished: false,
      status: formData.status ?? "available",
    };

    setIsSubmitting(true);
    try {
      const formValues = {
        ...apartmentFormValuesFromApartment(draftApartment),
        utilityItems,
        customFeatures: submittedFeatures,
        verification: {
          propertyName: formData.title || "",
          propertyAddress: verificationData.propertyAddress || formData.address || "",
          businessPermit: verificationData.businessPermit,
          tinNumber: verificationData.tinNumber,
          idType: verificationData.idType,
          idNumber: verificationData.idNumber,
        },
      };
      const landlordIdentity = {
        id: user.id,
        authId: user.authId,
        email: user.email,
        name: user.name,
        role: user.role,
      };
      const resolvedLandlordId = await resolveAppUserId(landlordIdentity);
      const created = await createApartment(
        { ...formValues, landlordId: resolvedLandlordId },
        resolvedLandlordId,
      );
      const { error: profileSyncError } = await supabase.from("landlord_profiles").upsert({
        user_id: resolvedLandlordId,
        permit_number: verificationData.businessPermit.trim(),
        business_permit_number: verificationData.businessPermit.trim(),
        tin_number: verificationData.tinNumber.trim() || null,
        id_type: verificationData.idType || null,
        id_number: verificationData.idNumber.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (profileSyncError) throw new Error(profileSyncError.message || "Unable to synchronize verification details.");
      const { error: userPermitError } = await supabase.from("app_users").update({
        permit_number: verificationData.businessPermit.trim(),
        updated_at: new Date().toISOString(),
      }).eq("id", resolvedLandlordId);
      if (userPermitError) throw new Error(userPermitError.message || "Unable to synchronize the permit number.");

      // Upload all images and collect their URLs
      const uploadedImageUrls: string[] = [];
      for (let i = 0; i < uploadedImages.length; i++) {
        const img = uploadedImages[i];
        if (img.file) {
          const url = await uploadApartmentImage(created.id, img.file, `apartment-image-${i}.jpg`);
          uploadedImageUrls.push(url);
        } else {
          // If it's a data URL (from camera), convert and upload
          if (img.url.startsWith("data:")) {
            // Extract base64 data from data URL
            const base64 = img.url.split(",")[1];
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let j = 0; j < binaryString.length; j++) {
              bytes[j] = binaryString.charCodeAt(j);
            }
            const blob = new Blob([bytes], { type: "image/jpeg" });
            const url = await uploadApartmentImage(created.id, blob, `apartment-image-${i}.jpg`);
            uploadedImageUrls.push(url);
          }
        }
      }

      if (uploadedImageUrls.length > 0) {
        // Insert with primary flag
        const imagesToInsert = uploadedImageUrls.map((url, idx) => {
          const originalImg = uploadedImages[idx];
          return {
            url,
            is_primary: originalImg.isPrimary || idx === 0,
            sort_order: idx,
          };
        });
        // Insert directly into database with proper structure
        const insertPayload = imagesToInsert.map((img) => ({
          apartment_id: created.id,
          url: img.url,
          is_primary: img.is_primary,
          sort_order: img.sort_order,
        }));
        const { error: imageMetadataError } = await supabase.from("apartment_images").insert(insertPayload);
        if (imageMetadataError) throw new Error(imageMetadataError.message || "Unable to save apartment images.");
      }

      for (const room of rooms) {
        const createdRoom = await createApartmentRoom(created.id, {
          name: room.roomName,
          type: room.type,
          sqft: room.sqft,
          maxOccupants: room.maxOccupants,
          price: room.rent,
          hasPrivateBath: room.hasPrivateBath,
          bathroomType: room.bathroomType,
          sharedBathLocation: room.sharedBathLocation,
          status: room.status,
          isOccupied: room.status === "occupied",
          hasAC: room.hasAC,
          description: room.description,
          images: [],
        }, resolvedLandlordId);

        if (createdRoom.id && room.images.length > 0) {
          const roomImageUrls: string[] = [];
          for (let imageIndex = 0; imageIndex < room.images.length; imageIndex += 1) {
            const source = room.images[imageIndex];
            if (/^https?:\/\//i.test(source)) {
              roomImageUrls.push(source);
              continue;
            }
            const blob = await (await fetch(source)).blob();
            const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
            roomImageUrls.push(await uploadApartmentRoomImage(created.id, createdRoom.id, blob, `room-image-${imageIndex}.${extension}`));
          }
          await updateApartmentRoom(created.id, createdRoom.id, { ...createdRoom, images: roomImageUrls }, resolvedLandlordId);
        }
      }

      await uploadVerificationDocuments(created.id, resolvedLandlordId, verificationDocuments);

      const persistedApartment = await fetchApartmentWithImages(created.id);
      if (!persistedApartment || persistedApartment.images.length !== uploadedImageUrls.length) {
        throw new Error("The apartment was created, but its permanent images could not be verified.");
      }

      await refreshApartments();
      submissionCompleteRef.current = true;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      await deletePropertyDraft(user.id);
      setDraftStatus("idle");
      toast.success("Apartment added successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to submit apartment:", error);
      const message = error instanceof Error ? error.message : "Unable to save apartment.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived room stats ────────────────────────────────────────────────────
  if (user?.role !== "landlord") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="app-shell landlord-shell landlord-add-property fixed inset-0 z-50 overflow-hidden bg-[#FCFAF7]">
      <div className="app-shell-frame flex h-full">
        <aside className="app-shell-sidebar hidden h-full w-60 shrink-0 flex-col border-r border-[#E8DED1] bg-white lg:flex">
          <div className="app-sidebar flex h-full flex-col overflow-y-auto">
            <div className="app-sidebar-brand px-5 pb-5 pt-6"><div className="flex items-center gap-2.5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E8DED1] bg-[#FAF8F5] text-[#8B735B]"><Home className="h-6 w-6" /></span><div><span className="block text-xl font-bold tracking-tight text-[#302820]">AptFindr</span><p className="text-xs font-medium text-[#756A60]">Landlord Portal</p></div></div></div>
            <div className="px-4 pb-5"><div className="app-sidebar-profile flex items-center gap-3 rounded-lg border border-[#E8DED1] bg-[#FAF8F5] px-3 py-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#8B735B] text-sm font-bold text-white">{user?.avatar ? <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" /> : user?.name?.[0]?.toUpperCase() || ""}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#302820]">{user?.name || "Name unavailable"}</p><p className="truncate text-xs text-[#756A60]">{user?.email || ""}</p></div></div></div>
            <nav className="space-y-1 px-3 py-3"><p className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756A60]">Main<span className="h-px w-5 bg-[#8B735B]/45" /></p>{[{ label: "My Properties", icon: Building2, path: "/dashboard?section=overview" }, { label: "Activity", icon: TrendingUp, path: "/dashboard?section=activity" }, { label: "Notifications", icon: Bell, path: "/dashboard?section=notifications" }].map(({ label, icon: Icon, path }) => <button key={label} onClick={() => navigate(path)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#302820] transition-all hover:bg-[#FAF8F5] hover:text-[#8B735B]"><Icon className="h-4 w-4" />{label}</button>)}</nav>
            <nav className="space-y-1 border-t border-[#E8DED1] px-3 py-4"><p className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756A60]">Market<span className="h-px w-5 bg-[#8B735B]/45" /></p><button onClick={() => navigate("/browse")} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#302820] transition-all hover:bg-[#FAF8F5] hover:text-[#8B735B]"><TrendingUp className="h-4 w-4" />Market Overview</button></nav>
            <nav className="space-y-1 border-t border-[#E8DED1] px-3 py-4"><p className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756A60]">Manage<span className="h-px w-5 bg-[#8B735B]/45" /></p><button type="button" aria-current="page" className="app-sidebar-nav-item relative flex w-full items-center gap-3 rounded-lg bg-[#F3EFEA] px-3 py-3 text-sm font-semibold text-[#8B735B] transition-all"><Plus className="h-4 w-4" />Add Property</button></nav>
            <nav className="space-y-1 border-t border-[#E8DED1] px-3 py-4"><p className="mb-2 flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#756A60]">Account<span className="h-px w-5 bg-[#8B735B]/45" /></p><button onClick={() => navigate("/dashboard?section=settings")} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#302820] transition-all hover:bg-[#FAF8F5] hover:text-[#8B735B]"><Settings className="h-4 w-4" />Settings</button><button onClick={() => navigate("/dashboard?section=help")} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#302820] transition-all hover:bg-[#FAF8F5] hover:text-[#8B735B]"><HelpCircle className="h-4 w-4" />Help &amp; Support</button></nav>
            <div className="mt-auto border-t border-[#E8DED1] px-4 py-4"><LogoutConfirmation onConfirm={() => { logout?.(); navigate("/"); }}><button className="app-sidebar-logout flex w-full items-center gap-3 rounded-lg border border-[#E8DED1] bg-white px-3 py-3 text-sm font-semibold text-[#756A60] transition hover:border-red-100 hover:bg-red-50 hover:text-red-700"><LogOut className="h-4 w-4" />Log Out</button></LogoutConfirmation></div>
          </div>
        </aside>
        {sidebarOpen && <div className="app-sidebar-overlay fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={`app-sidebar-drawer fixed left-0 top-0 z-50 h-full w-64 border-r border-[#E8DED1] bg-white shadow-2xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="app-sidebar flex h-full flex-col overflow-y-auto p-3"><button type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#756A60]"><X className="h-4 w-4" /></button><div className="app-sidebar-brand px-2 pb-5 pt-2"><div className="flex items-center gap-2.5"><span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E8DED1] bg-[#FAF8F5] text-[#8B735B]"><Home className="h-6 w-6" /></span><div><span className="block text-xl font-bold text-[#302820]">AptFindr</span><p className="text-xs text-[#756A60]">Landlord Portal</p></div></div></div><nav className="space-y-1">{[{ label: "My Properties", icon: Building2, path: "/dashboard?section=overview" }, { label: "Activity", icon: TrendingUp, path: "/dashboard?section=activity" }, { label: "Notifications", icon: Bell, path: "/dashboard?section=notifications" }, { label: "Market Overview", icon: TrendingUp, path: "/browse" }].map(({ label, icon: Icon, path }) => <button key={label} onClick={() => navigate(path)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#302820] hover:bg-[#FAF8F5] hover:text-[#8B735B]"><Icon className="h-4 w-4" />{label}</button>)}<button type="button" aria-current="page" className="app-sidebar-nav-item relative flex w-full items-center gap-3 rounded-lg bg-[#F3EFEA] px-3 py-3 text-sm font-semibold text-[#8B735B]"><Plus className="h-4 w-4" />Add Property</button><button onClick={() => navigate("/dashboard?section=settings")} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#302820] hover:bg-[#FAF8F5]"><Settings className="h-4 w-4" />Settings</button><button onClick={() => navigate("/dashboard?section=help")} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[#302820] hover:bg-[#FAF8F5]"><HelpCircle className="h-4 w-4" />Help &amp; Support</button></nav></div>
        </aside>
        <button type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="app-sidebar-trigger fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B735B] text-white shadow-lg hover:bg-[#756A60] lg:hidden"><Menu className="h-5 w-5" /></button>

        <main className="app-shell-main min-w-0 flex-1 overflow-y-auto">
      <div className="app-shell-content app-shell-content-mobile-nav mx-auto max-w-[1200px] px-4 py-6 pt-16 md:px-8 lg:pt-6">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[#302820]">Add Property</h1>
          <p className="mt-1 text-sm font-medium text-[#756A60]">Create a new apartment listing and add its room details.</p>
          <p className="mt-3 text-sm font-semibold text-[#8B735B]">Step {currentStep} of {totalSteps}</p>
          <div className="mt-3 flex min-h-8 flex-wrap items-center gap-2">
            {draftStatus !== "idle" && (
              <span className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-bold shadow-sm ${
                draftStatus === "error" ? "border-red-200 text-red-600" : "border-amber-200 text-amber-700"
              }`}>
                {draftStatus === "saving" ? <Cloud className="h-3.5 w-3.5 animate-pulse" /> : <CloudUpload className="h-3.5 w-3.5" />}
                {draftStatus === "saving" && "Saving..."}
                {draftStatus === "saved" && "Draft saved"}
                {draftStatus === "restored" && "Restored from draft"}
                {draftStatus === "error" && "Draft could not be saved"}
              </span>
            )}
            {hasDraftContent && draftReady && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Discard this property draft and clear all entered details?")) discardDraft(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-red-600"
              >
                <RotateCcw className="h-3.5 w-3.5" />Discard Draft
              </button>
            )}
          </div>
        </div>

        {!user?.isVerified && (
          <Alert className="mb-8 max-w-4xl mx-auto border-amber-200 bg-white/80 rounded-2xl">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-900">Verification Pending</AlertTitle>
            <AlertDescription className="text-slate-600">
              You can save and manage this property now. Tenants will only see it after an admin verifies your landlord account.
            </AlertDescription>
          </Alert>
        )}

        <div className="max-w-4xl mx-auto mb-10">
          <div className="flex items-center justify-between">
            {stepConfig.map((step, idx) => (
              <div key={step.number} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => handleStepClick(step.number)}
                  disabled={isSubmitting}
                  aria-label={`Go to step ${step.number}: ${step.title}`}
                  aria-current={currentStep === step.number ? "step" : undefined}
                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60 hover:scale-105 ${
                    currentStep >= step.number
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {currentStep > step.number ? <Check className="h-5 w-5" /> : step.number}
                </button>
                {idx < stepConfig.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                      currentStep > step.number
                        ? "bg-gradient-to-r from-amber-500 to-orange-500"
                        : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {stepConfig.map((step) => (
              <button
                key={step.number}
                type="button"
                onClick={() => handleStepClick(step.number)}
                disabled={isSubmitting}
                aria-label={`Go to ${step.title}`}
                className={`rounded-md px-1 py-1 text-center text-xs font-bold uppercase transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                    currentStep === step.number
                      ? "text-amber-600"
                      : currentStep > step.number
                      ? "text-slate-500"
                      : "text-slate-400"
                  }`}
              >
                {step.title}
              </button>
            ))}
          </div>
        </div>

        <Card className="max-w-4xl mx-auto border-amber-100/50 shadow-2xl bg-white/90 rounded-3xl">
          <CardHeader className="pb-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
            <CardTitle className="text-2xl">{stepConfig[currentStep - 1].title}</CardTitle>
            <CardDescription>{stepConfig[currentStep - 1].description}</CardDescription>
          </CardHeader>

          <CardContent className="pt-10">
            <form onSubmit={handleSubmit} noValidate className="space-y-8">
              {/* ──────── STEP 1: Property Information ──────── */}
              {currentStep === 1 && (
                <>
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                      <Upload className="h-5 w-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-amber-600 uppercase">Property Photos</h3>
                    </div>

                    <MultiImageUploader
                      images={uploadedImages}
                      onImagesChange={(images) => {
                        setUploadedImages(images);
                        if (images.length > 0) setImageReuploadRequired(false);
                        setValidationErrors((prev) => {
                          const next = { ...prev };
                          delete next.images;
                          return next;
                        });
                      }}
                      maxImages={10}
                      maxFileSize={5}
                    />
                    {imageReuploadRequired && (
                      <Alert className="rounded-lg border-amber-200 bg-amber-50">
                        <Upload className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="font-semibold text-amber-800">Please re-upload images before submitting.</AlertDescription>
                      </Alert>
                    )}
                    <FieldError field="images" />
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                      <Building2 className="h-5 w-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-amber-600 uppercase">Basic Information</h3>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Property Title *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => {
                          setFormData({ ...formData, title: e.target.value });
                          if (e.target.value.trim()) clearValidationError("title");
                        }}
                        placeholder="e.g., Modern Loft"
                        required
                        aria-invalid={Boolean(validationErrors.title)}
                        className={fieldClass("title")}
                      />
                      <FieldError field="title" />
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-3">
                        <Label className="text-slate-700 font-bold">Total Property Area (sqft) *</Label>
                        <Input
                          type="number"
                          value={formData.sqft || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, sqft: Number(e.target.value) });
                            if (Number(e.target.value) > 0) clearValidationError("sqft");
                          }}
                          required
                          aria-invalid={Boolean(validationErrors.sqft)}
                          className={`${fieldClass("sqft")} hide-number-spinners`}
                        />
                        <FieldError field="sqft" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Description *</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => {
                          setFormData({ ...formData, description: e.target.value });
                          if (e.target.value.trim()) clearValidationError("description");
                        }}
                        rows={4}
                        required
                        aria-invalid={Boolean(validationErrors.description)}
                        placeholder="Describe your property..."
                        className={`${fieldClass("description")} resize-none`}
                      />
                      <FieldError field="description" />
                    </div>
                  </div>
                </>
              )}

              {/* ──────── STEP 3: Location ──────── */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                    <MapPin className="h-5 w-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-amber-600 uppercase">Location Details</h3>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-700 font-bold">Street Address *</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => {
                        setFormData({ ...formData, address: e.target.value, lat: undefined, lng: undefined });
                        setLocationPinned(false);
                        setLocationResolving(Boolean(e.target.value.trim()));
                        if (e.target.value.trim()) clearValidationError("address");
                      }}
                      onBlur={() => setLocationLookupRequest((request) => request + 1)}
                      placeholder="House number, street, subdivision"
                      required
                      aria-invalid={Boolean(validationErrors.address)}
                      className={fieldClass("address")}
                    />
                    <FieldError field="address" />
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">City</Label>
                      <Input value={formData.city} readOnly className="bg-slate-50 rounded-xl" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Province</Label>
                      <Input value={formData.state} readOnly className="bg-slate-50 rounded-xl" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">ZIP Code</Label>
                      <Input value={formData.zip} readOnly className="bg-slate-50 rounded-xl" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-700 font-bold">Map Location</Label>
                    <p className="text-xs text-slate-500">Enter the address, then use the map result or drag the marker to the exact apartment location.</p>
                    <div className="rounded-2xl border-2 border-amber-200 overflow-hidden bg-white shadow-sm" style={{ height: "500px" }}>
                      <LocationPicker
                        lat={Number.isFinite(Number(formData.lat)) ? Number(formData.lat) : DEFAULT_LA_PAZ_MAP_CENTER.lat}
                        lng={Number.isFinite(Number(formData.lng)) ? Number(formData.lng) : DEFAULT_LA_PAZ_MAP_CENTER.lng}
                        addressQuery={locationAddressQuery}
                        geocodeRequestKey={locationLookupRequest}
                        onGeocodeStatusChange={(status) => setLocationResolving(status === "loading")}
                        onLocationChange={(lat, lng) => {
                          setFormData((current) => ({ ...current, lat, lng }));
                          setLocationPinned(hasValidApartmentCoordinates(lat, lng));
                          if (hasValidApartmentCoordinates(lat, lng)) clearValidationError("mapLocation");
                        }}
                      />
                    </div>
                    <FieldError field="mapLocation" />
                  </div>
                </div>
              )}

              {/* ──────── STEP 4: Amenities & Features ──────── */}
              {currentStep === 4 && (
                <>
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                      <Building2 className="h-5 w-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-amber-600 uppercase">Amenities</h3>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Amenities (comma-separated) *</Label>
                      <Textarea
                        value={amenitiesInput}
                        onChange={(e) => {
                          setAmenitiesInput(e.target.value);
                          if (e.target.value.split(",").some((amenity) => amenity.trim())) {
                            clearValidationError("amenities");
                          }
                        }}
                        aria-invalid={Boolean(validationErrors.amenities)}
                        placeholder="e.g., Parking, WiFi, Gym, Pool"
                        rows={3}
                        className={`${fieldClass("amenities")} resize-none`}
                      />
                      <FieldError field="amenities" />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                      <Home className="h-5 w-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-amber-600 uppercase">Utilities Included</h3>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Included Utilities (comma-separated)</Label>
                      <Textarea
                        value={utilitiesInput}
                        onChange={(e) => setUtilitiesInput(e.target.value)}
                        placeholder="e.g., Water, Electricity, Internet"
                        rows={3}
                        className="rounded-xl border-amber-100 resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                      <ListChecks className="h-5 w-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-amber-600 uppercase">Additional Features</h3>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={featureInput}
                        onChange={(e) => {
                          setFeatureInput(e.target.value);
                          if (e.target.value.trim()) clearValidationError("features");
                        }}
                        onKeyDown={handleFeatureKeyDown}
                        aria-invalid={Boolean(validationErrors.features)}
                        placeholder="Type feature and press Enter"
                        className={`${fieldClass("features")} flex-1`}
                      />
                      <Button type="button" onClick={() => addFeature(featureInput)} className="bg-amber-500 rounded-xl px-4">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FieldError field="features" />

                    {features.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {features.map((feature, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-semibold rounded-full border border-amber-200"
                          >
                            {feature}
                            <button type="button" onClick={() => removeFeature(i)} className="hover:text-red-600">
                              <X className="h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase">Quick Add</p>
                      <div className="flex flex-wrap gap-2">
                        {SUGGESTED_FEATURES.filter(
                          (s) => !features.map((f) => f.toLowerCase()).includes(s.toLowerCase())
                        ).map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => addFeature(suggestion)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-200 text-slate-600 text-xs font-semibold rounded-full hover:bg-amber-50"
                          >
                            <Plus className="h-3" /> {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ──────── STEP 2: Verification ──────── */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                    <ShieldCheck className="h-5 w-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-amber-600 uppercase">Legitimacy & Verification</h3>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-700 font-bold flex items-center gap-1.5">
                      <Building2 className="h-3.5" /> Property / Apartment Name
                    </Label>
                    <Input
                      value={String(formData.title ?? "")}
                      readOnly
                      placeholder="e.g., Sunset Heights"
                      className="rounded-xl border-slate-200 bg-slate-50 font-semibold text-slate-700"
                    />
                    <p className="text-xs font-medium text-slate-500">Carried from Property Information. Go back to step 1 to edit this name.</p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-700 font-bold flex items-center gap-1.5">
                      <MapPin className="h-3.5" /> Complete Property Address
                    </Label>
                    <Input
                      value={verificationData.propertyAddress}
                      onChange={(e) => {
                        setVerificationData({ ...verificationData, propertyAddress: e.target.value });
                        if (e.target.value.trim()) clearValidationError("verificationPropertyAddress");
                      }}
                      aria-invalid={Boolean(validationErrors.verificationPropertyAddress)}
                      placeholder="Full address"
                      className={fieldClass("verificationPropertyAddress")}
                    />
                    <FieldError field="verificationPropertyAddress" />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold flex items-center gap-1.5">
                        <FileText className="h-3.5" /> Business Permit # *
                      </Label>
                      <Input
                        value={verificationData.businessPermit}
                        onChange={(e) => {
                          setVerificationData({ ...verificationData, businessPermit: e.target.value });
                          if (e.target.value.trim()) clearValidationError("businessPermit");
                        }}
                        aria-invalid={Boolean(validationErrors.businessPermit)}
                        placeholder="B-2024-XXXXX"
                        className={fieldClass("businessPermit")}
                      />
                      <FieldError field="businessPermit" />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">TIN Number (optional)</Label>
                      <Input
                        value={verificationData.tinNumber}
                        onChange={(e) => {
                          setVerificationData({ ...verificationData, tinNumber: e.target.value });
                          if (e.target.value.trim()) clearValidationError("tinNumber");
                        }}
                        aria-invalid={Boolean(validationErrors.tinNumber)}
                        placeholder="XXX-XXX-XXX-XXX"
                        className={fieldClass("tinNumber")}
                      />
                      <FieldError field="tinNumber" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">Valid ID Type (optional)</Label>
                      <select
                        value={verificationData.idType}
                        onChange={(e) => {
                          setVerificationData({ ...verificationData, idType: e.target.value });
                          if (e.target.value) clearValidationError("idType");
                        }}
                        aria-invalid={Boolean(validationErrors.idType)}
                        className={`w-full h-11 rounded-xl border bg-white px-3 text-sm outline-none transition focus:ring-[3px] ${
                          validationErrors.idType ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-200 focus:border-amber-500 focus:ring-amber-100"
                        }`}
                      >
                        <option value="">Select ID Type</option>
                        {VALID_ID_TYPES.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                      <FieldError field="idType" />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold">ID Number (optional)</Label>
                      <Input
                        value={verificationData.idNumber}
                        onChange={(e) => {
                          setVerificationData({ ...verificationData, idNumber: e.target.value });
                          if (e.target.value.trim()) clearValidationError("idNumber");
                        }}
                        aria-invalid={Boolean(validationErrors.idNumber)}
                        placeholder="Enter ID number"
                        className={fieldClass("idNumber")}
                      />
                      <FieldError field="idNumber" />
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-amber-100 pt-6">
                    <div>
                      <h3 className="font-black text-slate-900">Supporting documents</h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">Upload available documents now. Missing items appear as “Not provided” for the admin and can be supplied later.</p>
                      <p className="mt-1 text-xs font-bold text-amber-700">JPG, JPEG, PNG, WebP, or PDF · maximum 10 MB each</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {VERIFICATION_DOCUMENT_TYPES.map((documentType) => {
                        const document = verificationDocuments.find((item) => item.type === documentType.key);
                        const uploadId = `verification-upload-${documentType.key}`;
                        const cameraId = `verification-camera-${documentType.key}`;
                        return (
                          <div key={documentType.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex min-h-16 items-center gap-3 border-b border-slate-100 p-4">
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><FileText className="h-5 w-5" /></span>
                              <div className="min-w-0"><p className="text-sm font-black text-slate-900">{documentType.label}</p><p className="truncate text-xs font-medium text-slate-400">{document?.file.name || "Not provided"}</p></div>
                            </div>
                            {document && (
                              <div className="border-b border-slate-100 bg-slate-50 p-3">
                                {document.file.type === "application/pdf" ? (
                                  <a href={document.previewUrl} target="_blank" rel="noopener noreferrer" className="flex h-28 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700"><FileText className="h-6 w-6 text-rose-500" />Preview PDF</a>
                                ) : (
                                  <a href={document.previewUrl} target="_blank" rel="noopener noreferrer"><img src={document.previewUrl} alt={`${documentType.label} preview`} className="h-28 w-full rounded-xl object-cover" /></a>
                                )}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 p-3">
                              <input id={uploadId} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(event) => { selectVerificationDocument(documentType.key, event.target.files?.[0]); event.currentTarget.value = ""; }} />
                              <label htmlFor={uploadId} className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 text-xs font-black text-slate-700 hover:bg-slate-50"><Upload className="h-3.5 w-3.5" />{document ? "Replace" : "Upload"}</label>
                              <input id={cameraId} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(event) => { selectVerificationDocument(documentType.key, event.target.files?.[0]); event.currentTarget.value = ""; }} />
                              <label htmlFor={cameraId} className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 text-xs font-black text-slate-700 hover:bg-slate-50"><Camera className="h-3.5 w-3.5" />Take photo</label>
                              {document && <button type="button" onClick={() => removePendingVerificationDocument(documentType.key)} className="col-span-2 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 text-xs font-black text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" />Remove file</button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-10 border-t border-amber-100">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    className="flex-1 rounded-2xl h-12 font-bold"
                  >
                    <ArrowLeft className="h-5 mr-2" /> Previous
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="flex-1 rounded-2xl h-12 font-bold"
                  >
                    <ArrowLeft className="h-5 mr-2" /> Cancel
                  </Button>
                )}

                {currentStep < totalSteps ? (
                  <Button type="button" onClick={handleNextStep} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl h-12 font-bold">
                    Next <ArrowRight className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting || locationResolving} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl h-12 font-bold disabled:opacity-60 disabled:cursor-not-allowed">
                    <Check className="h-5 w-5" /> {isSubmitting ? "Submitting..." : locationResolving ? "Finding location..." : "List Property"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
        </main>
      </div>

      {pendingDraft && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="draft-dialog-title">
          <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <CloudUpload className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h2 id="draft-dialog-title" className="text-xl font-black text-slate-900">Continue your property draft?</h2>
                <p className="mt-1 text-sm font-medium leading-5 text-slate-500">
                  Saved {new Date(pendingDraft.savedAt).toLocaleString("en-PH")}. You can return to step {Math.min(totalSteps, Math.max(1, pendingDraft.currentStep || 1))} or start over.
                </p>
              </div>
            </div>
            {pendingDraft.requiresImageReupload && (
              <div className="mt-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                <Upload className="mt-0.5 h-4 w-4 shrink-0" />
                Please re-upload images before submitting.
              </div>
            )}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button type="button" onClick={continueDraft} className="h-11 rounded-lg bg-orange-500 font-bold text-white hover:bg-orange-600">
                Continue Draft
              </Button>
              <Button type="button" variant="outline" onClick={() => discardDraft(true)} className="h-11 rounded-lg border-slate-300 font-bold text-slate-700 hover:bg-slate-50">
                Discard Draft
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
