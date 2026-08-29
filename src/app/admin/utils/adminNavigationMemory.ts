export type AdminModule = "overview" | "notifications" | "landlords" | "apartments" | "reports" | "appeals" | "admininfo";

export type AdminModuleLocation =
  | { view: "overview" }
  | { view: "landlord-details"; landlordId: string }
  | { view: "landlord-action"; landlordId: string; mode: "notice" | "violation" }
  | { view: "apartment-inspection"; apartmentId: string }
  | { view: "report-review"; reportId: string }
  | { view: "appeal-review"; appealId: string };

type AdminNavigationMemory = Partial<Record<AdminModule, AdminModuleLocation>>;

const keyFor = (adminId: string) => `aptfindr:admin-navigation:${adminId}`;

function readMemory(adminId: string): AdminNavigationMemory {
  if (!adminId) return {};
  try {
    const value = sessionStorage.getItem(keyFor(adminId));
    return value ? JSON.parse(value) as AdminNavigationMemory : {};
  } catch {
    return {};
  }
}

export function getAdminModuleLocation(adminId: string, module: AdminModule): AdminModuleLocation | null {
  return readMemory(adminId)[module] ?? null;
}

export function rememberAdminModuleLocation(adminId: string, module: AdminModule, location: AdminModuleLocation): void {
  if (!adminId) return;
  try {
    const memory = readMemory(adminId);
    memory[module] = location;
    sessionStorage.setItem(keyFor(adminId), JSON.stringify(memory));
  } catch {
    // Navigation memory is an enhancement; storage failures must not block navigation.
  }
}

export function clearAdminNavigationMemory(adminId: string): void {
  if (!adminId) return;
  try {
    sessionStorage.removeItem(keyFor(adminId));
  } catch {
    // Preserve the existing logout flow even when browser storage is unavailable.
  }
}

export function getAdminModulePath(adminId: string, module: AdminModule): string {
  const remembered = getAdminModuleLocation(adminId, module);
  if (module === "apartments" && remembered?.view === "apartment-inspection") {
    return `/admin/apartment/${encodeURIComponent(remembered.apartmentId)}`;
  }
  return `/admin?section=${module}`;
}
