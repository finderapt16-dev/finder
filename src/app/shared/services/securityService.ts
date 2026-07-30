import { supabase } from "../../../lib/supabaseclient";

export async function generateBackupCodes(): Promise<string[]> {
  const { data, error } = await supabase.rpc("fn_generate_backup_codes");
  if (error) throw new Error(error.message || "Unable to generate backup codes.");
  if (!Array.isArray(data) || !data.every((code) => typeof code === "string")) {
    throw new Error("The backup-code service returned an invalid response.");
  }
  return data;
}

export async function consumeBackupCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("fn_consume_backup_code", { p_code: code });
  if (error) throw new Error(error.message || "Unable to verify the backup code.");
  return data === true;
}
