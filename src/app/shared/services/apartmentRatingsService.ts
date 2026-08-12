import { supabase } from "@/lib/supabaseclient";

export interface ApartmentRatingRow { id: string; apartment_id: string; tenant_id: string; rating: number; created_at: string; updated_at: string; }

export async function fetchApartmentRatings(apartmentId?: string): Promise<ApartmentRatingRow[]> {
  let query = supabase.from("apartment_ratings").select("id, apartment_id, tenant_id, rating, created_at, updated_at");
  if (apartmentId) query = query.eq("apartment_id", apartmentId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ApartmentRatingRow[];
}

export async function saveApartmentRating(apartmentId: string, tenantId: string, rating: number): Promise<void> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Choose a rating from 1 to 5 stars.");
  const { error } = await supabase.from("apartment_ratings").upsert(
    { apartment_id: apartmentId, tenant_id: tenantId, rating, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,apartment_id" },
  );
  if (error) throw new Error(error.message);
}

export async function removeApartmentRating(apartmentId: string, tenantId: string): Promise<void> {
  const { error } = await supabase.from("apartment_ratings").delete().eq("apartment_id", apartmentId).eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}
