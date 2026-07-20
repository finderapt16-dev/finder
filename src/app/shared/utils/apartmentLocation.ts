import type { Apartment } from "../data/apartments";

type LocationSource = Pick<Apartment, "address" | "city" | "state" | "zip" | "location">;

const cleanPart = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
};

const pushUnique = (parts: string[], value: unknown) => {
  const cleaned = cleanPart(value);
  if (!cleaned) return;

  const normalized = cleaned.toLowerCase();
  if (parts.some((part) => part.toLowerCase() === normalized)) return;
  parts.push(cleaned);
};

export function formatApartmentLocation(apartment: Partial<LocationSource> | null | undefined, fallback = "Location not provided"): string {
  if (!apartment) return fallback;

  const parts: string[] = [];
  pushUnique(parts, apartment.address);
  pushUnique(parts, apartment.city);
  pushUnique(parts, apartment.state);
  pushUnique(parts, apartment.zip);

  if (parts.length > 0) return parts.join(", ");

  const legacyLocation = cleanPart(apartment.location);
  return legacyLocation || fallback;
}

export function hasReadableApartmentLocation(apartment: Partial<LocationSource> | null | undefined): boolean {
  return formatApartmentLocation(apartment, "") !== "";
}
