import { supabase } from "../../../lib/supabaseclient";

const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export async function fetchPropertyDraft<T>(userId: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("property_drafts")
    .select("draft_data, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message || "Unable to load the property draft.");
  if (!data) return null;

  if (Date.parse(String(data.expires_at)) <= Date.now()) {
    await deletePropertyDraft(userId);
    return null;
  }

  return data.draft_data as T;
}

export async function savePropertyDraft(userId: string, draft: unknown): Promise<void> {
  const { error } = await supabase.from("property_drafts").upsert(
    {
      user_id: userId,
      draft_data: draft,
      expires_at: new Date(Date.now() + DRAFT_TTL_MS).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(error.message || "Unable to save the property draft.");
}

export async function deletePropertyDraft(userId: string): Promise<void> {
  const { error } = await supabase.from("property_drafts").delete().eq("user_id", userId);
  if (error) throw new Error(error.message || "Unable to delete the property draft.");
}
