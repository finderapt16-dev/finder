export interface GeocodedLocation { lat: number; lng: number; label: string }
export type GeocodingErrorReason = "not-found" | "outside-scope" | "network";
export class GeocodingError extends Error {
  constructor(message: string, public reason: GeocodingErrorReason) { super(message); this.name = "GeocodingError"; }
}

const BOUNDS = { south: 10.68, north: 10.75, west: 122.535, east: 122.595 };
const cache = new Map<string, GeocodedLocation>();
const reverseCache = new Map<string, GeocodedLocation>();
const inside = ({ lat, lng }: GeocodedLocation) => lat >= BOUNDS.south && lat <= BOUNDS.north && lng >= BOUNDS.west && lng <= BOUNDS.east;

async function lookup(query: string, bounded: boolean, signal?: AbortSignal): Promise<GeocodedLocation[]> {
  const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "5", countrycodes: "ph", addressdetails: "1" });
  if (bounded) { params.set("viewbox", `${BOUNDS.west},${BOUNDS.north},${BOUNDS.east},${BOUNDS.south}`); params.set("bounded", "1"); }
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new GeocodingError("Location search is temporarily unavailable.", "network");
  return ((await response.json()) as Array<{ lat: string; lon: string; display_name: string }>).map((row) => ({ lat: Number(row.lat), lng: Number(row.lon), label: row.display_name })).filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng));
}

export async function geocodeLocationWithinLaPaz(target: string, signal?: AbortSignal): Promise<GeocodedLocation> {
  const key = target.trim().toLowerCase();
  const cached = cache.get(key); if (cached) return cached;
  try {
    const scopedQuery = /la paz/i.test(target) ? target : `${target}, La Paz, Iloilo City`;
    const match = (await lookup(scopedQuery, true, signal)).find(inside);
    if (match) { if (cache.size >= 100) cache.delete(cache.keys().next().value as string); cache.set(key, match); return match; }
    const broad = (await lookup(`${target}, Philippines`, false, signal))[0];
    if (broad && !inside(broad)) throw new GeocodingError("That location is outside the supported La Paz search area.", "outside-scope");
    throw new GeocodingError("We couldn't find that location. Try a more specific landmark or street.", "not-found");
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    if (error instanceof GeocodingError) throw error;
    throw new GeocodingError("Location search is temporarily unavailable.", "network");
  }
}

export async function reverseGeocodeWithinLaPaz(lat: number, lng: number, signal?: AbortSignal): Promise<GeocodedLocation> {
  const point = { lat, lng, label: "" };
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inside(point)) {
    throw new GeocodingError("That location is outside the supported La Paz area.", "outside-scope");
  }

  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = reverseCache.get(key);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: "jsonv2",
      addressdetails: "1",
      zoom: "18",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new GeocodingError("Location lookup is temporarily unavailable.", "network");
    const row = await response.json() as { display_name?: string };
    const label = String(row.display_name ?? "").trim();
    if (!label) throw new GeocodingError("No address was found for that map point.", "not-found");
    const result = { lat, lng, label };
    if (reverseCache.size >= 100) reverseCache.delete(reverseCache.keys().next().value as string);
    reverseCache.set(key, result);
    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    if (error instanceof GeocodingError) throw error;
    throw new GeocodingError("Location lookup is temporarily unavailable.", "network");
  }
}
