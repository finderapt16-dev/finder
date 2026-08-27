import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Label } from "../ui/label";
import { geocodeLocationWithinLaPaz, reverseGeocodeWithinLaPaz, GeocodingError } from "../../services/geocodingService";

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
  addressQuery?: string;
  geocodeRequestKey?: number;
  onGeocodeStatusChange?: (status: "idle" | "loading" | "found" | "not-found" | "error") => void;
  onMapAddressChange?: (address: string) => void;
}

export function LocationPicker({
  lat,
  lng,
  onLocationChange,
  addressQuery = "",
  geocodeRequestKey = 0,
  onGeocodeStatusChange,
  onMapAddressChange,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const onGeocodeStatusChangeRef = useRef(onGeocodeStatusChange);
  const onMapAddressChangeRef = useRef(onMapAddressChange);
  const reverseControllerRef = useRef<AbortController | null>(null);
  const coordinatesRef = useRef({ lat, lng });
  const [isClient, setIsClient] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "loading" | "found" | "not-found" | "error">("idle");
  const [matchedAddress, setMatchedAddress] = useState("");

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    onGeocodeStatusChangeRef.current = onGeocodeStatusChange;
  }, [onGeocodeStatusChange]);

  useEffect(() => {
    onMapAddressChangeRef.current = onMapAddressChange;
  }, [onMapAddressChange]);

  const updateGeocodeStatus = (status: "idle" | "loading" | "found" | "not-found" | "error") => {
    setGeocodeStatus(status);
    onGeocodeStatusChangeRef.current?.(status);
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isClient || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([lat, lng], 15);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add initial marker
    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    const selectMapPoint = async (newLat: number, newLng: number) => {
      const previousPoint = coordinatesRef.current;
      marker.setLatLng([newLat, newLng]);
      reverseControllerRef.current?.abort();
      const controller = new AbortController();
      reverseControllerRef.current = controller;
      updateGeocodeStatus("loading");
      try {
        const location = await reverseGeocodeWithinLaPaz(newLat, newLng, controller.signal);
        setMatchedAddress(location.label);
        updateGeocodeStatus("found");
        coordinatesRef.current = { lat: newLat, lng: newLng };
        onLocationChangeRef.current(newLat, newLng);
        onMapAddressChangeRef.current?.(location.label);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Unable to identify the selected map location:", error);
        marker.setLatLng([previousPoint.lat, previousPoint.lng]);
        updateGeocodeStatus(error instanceof GeocodingError && error.reason !== "network" ? "not-found" : "error");
      }
    };

    // Handle map click to move marker
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: newLat, lng: newLng } = e.latlng;
      void selectMapPoint(newLat, newLng);
    });

    // Handle marker drag
    marker.on("dragend", () => {
      const position = marker.getLatLng();
      void selectMapPoint(position.lat, position.lng);
    });

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      reverseControllerRef.current?.abort();
    };
  }, [isClient]);

  // Update marker position when lat/lng props change
  useEffect(() => {
    coordinatesRef.current = { lat, lng };
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom());
    }
  }, [lat, lng]);

  useEffect(() => {
    if (!isClient || geocodeRequestKey === 0) return;

    const query = addressQuery.trim().replace(/\s+/g, " ");
    if (query.length < 3) {
      updateGeocodeStatus("not-found");
      setMatchedAddress("");
      return;
    }

    const controller = new AbortController();
    updateGeocodeStatus("loading");
    setMatchedAddress("");

    // Delay each user-triggered lookup so rapid focus changes never flood the public service.
    const timer = window.setTimeout(async () => {
      try {
        const location = await geocodeLocationWithinLaPaz(query, controller.signal);
        updateGeocodeStatus("found");
        setMatchedAddress(location.label);
        onLocationChangeRef.current(location.lat, location.lng);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Unable to locate the entered address:", error);
        updateGeocodeStatus(error instanceof GeocodingError && error.reason !== "network" ? "not-found" : "error");
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [addressQuery, geocodeRequestKey, isClient]);

  if (!isClient) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center rounded-lg bg-slate-100 sm:h-[400px] lg:h-[460px]">
        <p className="text-slate-500">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Location on Map *</Label>
      <div 
        ref={mapRef} 
        className="h-[300px] w-full touch-manipulation overflow-hidden rounded-lg border border-slate-200 sm:h-[400px] lg:h-[460px]"
      />
      <p className="text-sm text-slate-500">
        Click the map or drag the pin to select the property's exact location.
      </p>
      {geocodeStatus === "loading" && <p className="text-sm font-medium text-amber-700">Finding the entered address on the map...</p>}
      {geocodeStatus === "found" && matchedAddress && <p className="break-words text-sm font-medium text-emerald-700">Map pinned to: {matchedAddress}</p>}
      {geocodeStatus === "not-found" && <p className="text-sm font-medium text-red-600">We could not find this address on the map. Please check the address or move the marker manually.</p>}
      {geocodeStatus === "error" && <p className="text-sm font-medium text-red-600">The address lookup is temporarily unavailable. You can still click or drag the map pin.</p>}
      <div className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 min-[360px]:grid-cols-2">
        <div>
          <span className="font-medium">Latitude:</span> {lat.toFixed(6)}
        </div>
        <div>
          <span className="font-medium">Longitude:</span> {lng.toFixed(6)}
        </div>
      </div>
    </div>
  );
}

