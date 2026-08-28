import { supabase } from "@/lib/supabaseClient";
import type { DashboardAuditLogRow, DashboardUserRow } from "@/app/shared/services/dashboardSupabaseService";

export class SuperAdminFunctionError extends Error {
  constructor(message: string, public readonly code: "not_reachable" | "unauthorized" | "forbidden" | "database" | "network" | "server") {
    super(message);
    this.name = "SuperAdminFunctionError";
  }
}

async function invokeSuperAdminFunction(body: Record<string, unknown>): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) throw new SuperAdminFunctionError("Your session has expired. Please sign in again.", "unauthorized");

  try {
    const { data, error } = await supabase.functions.invoke("super-admin-users", {
      body,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!error && data?.success !== false) return;

    let status = Number((error as { context?: Response } | null)?.context?.status ?? 0);
    let serverMessage = typeof data?.error === "string" ? data.error : "";
    const response = (error as { context?: Response } | null)?.context;
    if (response) {
      try {
        const payload = await response.clone().json() as { error?: string };
        serverMessage = payload.error || serverMessage;
      } catch { /* Non-JSON gateway response. */ }
    }
    if (status === 401) throw new SuperAdminFunctionError(serverMessage || "Your session is invalid or expired. Please sign in again.", "unauthorized");
    if (status === 403) throw new SuperAdminFunctionError(serverMessage || "Super Admin access is required for this action.", "forbidden");
    if (status >= 500) throw new SuperAdminFunctionError(serverMessage || "The maintenance service encountered a server or database error.", "database");
    if (status === 404 || /not found|failed to send/i.test(error?.message ?? "")) throw new SuperAdminFunctionError("The Super Admin Edge Function is not reachable. Deploy 'super-admin-users' to the Supabase project configured by this app.", "not_reachable");
    throw new SuperAdminFunctionError(serverMessage || error?.message || "The Super Admin action failed.", "server");
  } catch (error) {
    if (error instanceof SuperAdminFunctionError) throw error;
    if (error instanceof TypeError || /fetch|network|connection/i.test(error instanceof Error ? error.message : "")) throw new SuperAdminFunctionError("Network error while contacting Supabase. Check your connection and project URL.", "network");
    throw new SuperAdminFunctionError(error instanceof Error ? error.message : "Unexpected Super Admin service error.", "server");
  }
}

export type AdminAccountInput = {
  email: string;
  name: string;
  department?: string;
  adminLevel?: string;
  password?: string;
};

export async function fetchAdminAccounts(): Promise<DashboardUserRow[]> {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("role", "admin")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DashboardUserRow[];
}

export async function fetchPlatformUsers(): Promise<DashboardUserRow[]> {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DashboardUserRow[];
}

export async function setUserAccountActive(userId: string, active: boolean): Promise<void> {
  await invokeSuperAdminFunction({ action: "user-status", userId, active });
}

export async function createAdminAccount(input: AdminAccountInput): Promise<void> {
  await invokeSuperAdminFunction({ action: "create", ...input });
}

export async function updateAdminAccount(adminId: string, input: Omit<AdminAccountInput, "password">): Promise<void> {
  await invokeSuperAdminFunction({ action: "update", adminId, ...input });
}

export async function setAdminAccountActive(adminId: string, active: boolean): Promise<void> {
  await invokeSuperAdminFunction({ action: "status", adminId, active });
}

export async function fetchSuperAdminAuditLogs(limit = 200): Promise<DashboardAuditLogRow[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as DashboardAuditLogRow[];
}

export type SupportTicketRow = Record<string, unknown> & { id?: string; user_id?: string; topic?: string; message?: string; contact?: string; status?: string; created_at?: string; updated_at?: string };
export type MaintenanceState = Record<string, unknown> & { id?: boolean; status?: string; title?: string; message?: string; expected_end_at?: string | null; started_at?: string | null; started_by?: string | null; updated_at?: string };

export async function fetchSupportRequests(): Promise<SupportTicketRow[]> {
  const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SupportTicketRow[];
}

export async function updateSupportRequest(ticketId: string, status: string, response?: string): Promise<void> {
  await invokeSuperAdminFunction({ action: "support-status", ticketId, status, response });
}

export async function fetchMaintenanceState(): Promise<MaintenanceState | null> {
  const { data, error } = await supabase.from("platform_status").select("*").eq("id", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data as MaintenanceState | null;
}

export async function fetchMaintenanceHistory(): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from("maintenance_history").select("*").order("started_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function runSuperAdminAction(body: Record<string, unknown>): Promise<void> {
  await invokeSuperAdminFunction(body);
}
