const APP_NAMESPACE = "rentiloilo";
const STORAGE_SCHEMA_KEY = `${APP_NAMESPACE}:storage-schema`;
const STORAGE_SCHEMA_VERSION = 2;

type StoredEnvelope<T> = {
  version: number;
  savedAt: string;
  expiresAt?: string;
  value: T;
};

type ReadOptions<T> = {
  version: number;
  validate: (value: unknown) => value is T;
};

type WriteOptions = {
  version: number;
  ttlMs?: number;
  maxBytes?: number;
};

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function userStorageKey(name: string, userId: string, role?: string): string {
  const safeUserId = encodeURIComponent(userId);
  return role
    ? `${APP_NAMESPACE}:${name}:${encodeURIComponent(role)}:${safeUserId}`
    : `${APP_NAMESPACE}:${name}:${safeUserId}`;
}

export function readStoredValue<T>(key: string, options: ReadOptions<T>): T | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredEnvelope<unknown>>;
    if (
      parsed.version !== options.version ||
      typeof parsed.savedAt !== "string" ||
      (parsed.expiresAt && Date.parse(parsed.expiresAt) <= Date.now()) ||
      !options.validate(parsed.value)
    ) {
      storage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function writeStoredValue<T>(key: string, value: T, options: WriteOptions): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const now = Date.now();
    const envelope: StoredEnvelope<T> = {
      version: options.version,
      savedAt: new Date(now).toISOString(),
      expiresAt: options.ttlMs ? new Date(now + options.ttlMs).toISOString() : undefined,
      value,
    };
    const serialized = JSON.stringify(envelope);
    if (new Blob([serialized]).size > (options.maxBytes ?? 512_000)) return false;
    storage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

export function removeStoredValue(key: string): void {
  getStorage()?.removeItem(key);
}

export function removeStoredValues(keys: readonly string[]): void {
  const storage = getStorage();
  if (!storage) return;
  keys.forEach((key) => storage.removeItem(key));
}

export function listStorageKeys(prefix: string): string[] {
  const storage = getStorage();
  if (!storage) return [];
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

export function migrateBrowserStorage(userId?: string): void {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem("apartmentViews");
  storage.removeItem("favorites");
  storage.removeItem("users");
  if (userId) {
    removeStoredValues([
      `2fa_backup_codes_${userId}`,
      `userSecurity_${userId}`,
      `landlordSecurity_${userId}`,
      `userPreferences_${userId}`,
      `userAlerts_${userId}`,
      `landlordProfile_${userId}`,
      `landlordBusiness_${userId}`,
      `landlordAlerts_${userId}`,
    ]);
  }
  storage.setItem(STORAGE_SCHEMA_KEY, String(STORAGE_SCHEMA_VERSION));
}

export function clearUserStorage(userId: string, role?: string): void {
  removeStoredValues([
    "apartment_finder_current_user",
    `rentiloilo:add-property-draft:${userId}`,
    `rentiloilo_chat_history:${role ?? ""}:${userId}`,
    userStorageKey("add-property-draft", userId),
    userStorageKey("chat-history", userId, role),
    `userPreferences_${userId}`,
    `userAlerts_${userId}`,
    `userSecurity_${userId}`,
    `landlordProfile_${userId}`,
    `landlordBusiness_${userId}`,
    `landlordAlerts_${userId}`,
    `landlordSecurity_${userId}`,
    `landlordSessions_${userId}`,
    `landlordAuditLog_${userId}`,
    `2fa_backup_codes_${userId}`,
  ]);
}

export function pruneStoragePrefix(prefix: string, maximumEntries: number): void {
  const storage = getStorage();
  if (!storage) return;
  const entries = listStorageKeys(prefix).map((key) => {
    try {
      const parsed = JSON.parse(storage.getItem(key) ?? "{}") as Partial<StoredEnvelope<unknown>>;
      return { key, savedAt: Date.parse(parsed.savedAt ?? "") || 0 };
    } catch {
      return { key, savedAt: 0 };
    }
  });
  entries
    .sort((left, right) => right.savedAt - left.savedAt)
    .slice(maximumEntries)
    .forEach(({ key }) => storage.removeItem(key));
}
