import { supabase as supabaseClient } from '../../../lib/supabaseclient';
import { safeRandomId } from '../utils/safeRandomId';

export type UserRole = 'tenant' | 'landlord' | 'admin' | 'super_admin' | 'student' | 'employee';
export type TenantType = 'student' | 'employee' | 'other';
export type UserStatus = 'pending' | 'verified' | 'approved' | 'active' | 'disabled' | string;

export interface User {
  id: string;
  authId?: string;
  name: string;
  email: string;
  username?: string;
  middleInitial?: string;
  address?: string;
  role: UserRole;
  tenantType?: TenantType;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
  isVerified?: boolean;
  mobileNumber?: string;
  mobile?: string;
  bio?: string;
  avatar?: string;
  department?: string;
  adminLevel?: string;
  permitNumber?: string;
  school?: string;
  guardianName?: string;
  guardianAddress?: string;
  guardianContact?: string;
  yearLevel?: string;
  studentId?: string;
  course?: string;
  company?: string;
  position?: string;
  employeeId?: string;
  otherOccupation?: string;
  otherOrganization?: string;
  otherWorkplace?: string;
}

type AppUserRow = {
  id?: string;
  auth_id?: string | null;
  name?: string;
  full_name?: string;
  email?: string;
  username?: string | null;
  middle_initial?: string | null;
  address?: string | null;
  role?: string;
  status?: string;
  verification_status?: string;
  landlord_status?: string;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  mobile?: string;
  avatar_url?: string;
  bio?: string;
  permit_number?: string;
  department?: string;
  admin_level?: string;
  tenant_type?: string | null;
  other_occupation?: string | null;
  other_organization?: string | null;
  other_workplace?: string | null;
};

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  tenantType?: TenantType;
  status?: UserStatus;
  mobile?: string;
  mobileNumber?: string;
  middleInitial?: string;
  address?: string;
  school?: string;
  guardianName?: string;
  guardianAddress?: string;
  guardianContact?: string;
  company?: string;
  department?: string;
  workAddress?: string;
  permitNumber?: string;
  adminLevel?: string;
  permitDocument?: File;
  idDocument?: File;
  termsAccepted?: boolean;
  landlordVerificationAccepted?: boolean;
  otherOccupation?: string;
  otherOrganization?: string;
  otherWorkplace?: string;
}

export interface SignupResult {
  user: User;
  accountCreated: boolean;
  profileCreated: boolean;
  requiresEmailVerification: boolean;
  existingAccount: boolean;
  profileSetupError?: string;
}

export class SignupFlowError extends Error {
  constructor(
    message: string,
    public readonly stage: 'validation' | 'auth' | 'profile' | 'verification',
    public readonly code: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = 'SignupFlowError';
    if (options && 'cause' in options) Object.defineProperty(this, 'cause', { value: options.cause, enumerable: false });
  }
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  tenantType?: TenantType;
  status?: UserStatus;
  isVerified?: boolean;
  mobile?: string;
  mobileNumber?: string;
  middleInitial?: string;
  address?: string;
  school?: string;
  guardianName?: string;
  guardianAddress?: string;
  guardianContact?: string;
  company?: string;
  department?: string;
  workAddress?: string;
  permitNumber?: string;
  adminLevel?: string;
  otherOccupation?: string;
  otherOrganization?: string;
  otherWorkplace?: string;
}

const APP_USERS_TABLE = 'app_users';
const VALID_ROLES = new Set<UserRole>(['tenant', 'student', 'employee', 'landlord', 'admin', 'super_admin']);
const VALID_TENANT_TYPES = new Set<TenantType>(['student', 'employee', 'other']);
let latestAuthProfileRequestId = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringValue(row: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

function getBooleanValue(row: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
  }

  return undefined;
}

function normalizeStatus(row: Record<string, unknown>): string {
  const status = getStringValue(row, ['status', 'verification_status', 'landlord_status']);
  if (status) {
    return status;
  }

  const isVerified = getBooleanValue(row, ['is_verified']);
  if (typeof isVerified === 'boolean') {
    return isVerified ? 'verified' : 'pending';
  }

  return 'active';
}

function normalizeRoleValue(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeTenantType(value: unknown, role?: string): TenantType | undefined {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (VALID_TENANT_TYPES.has(normalized as TenantType)) return normalized as TenantType;
  if (role === 'student' || role === 'employee') return role;
  return undefined;
}

export function isTenantRole(role: unknown): boolean {
  return role === 'tenant' || role === 'student' || role === 'employee';
}

export function getTenantType(user: Pick<User, 'role' | 'tenantType'> | null | undefined): TenantType | undefined {
  return normalizeTenantType(user?.tenantType, user?.role);
}

function assertValidRole(role: string): void {
  if (!VALID_ROLES.has(role as UserRole)) {
    throw new Error('Your account role is missing or invalid. Please contact support.');
  }
}

function normalizeUser(row: AppUserRow): User {
  const record: Record<string, unknown> = isRecord(row) ? row : {};
  const role = normalizeRoleValue(record.role);

  return {
    id: getStringValue(record, ['id']),
    authId: getStringValue(record, ['auth_id']) || undefined,
    name: getStringValue(record, ['name', 'full_name']),
    email: getStringValue(record, ['email']),
    username: getStringValue(record, ['username']) || undefined,
    middleInitial: getStringValue(record, ['middle_initial']),
    address: getStringValue(record, ['address']),
    role: role as UserRole,
    tenantType: normalizeTenantType(record.tenant_type, role),
    status: normalizeStatus(record),
    createdAt: getStringValue(record, ['created_at']),
    updatedAt: getStringValue(record, ['updated_at']),
    isVerified: getBooleanValue(record, ['is_verified']),
    mobileNumber: getStringValue(record, ['mobile']),
    mobile: getStringValue(record, ['mobile']),
    avatar: getStringValue(record, ['avatar_url']),
    bio: getStringValue(record, ['bio']),
    permitNumber: getStringValue(record, ['permit_number']),
    department: getStringValue(record, ['department']),
    adminLevel: getStringValue(record, ['admin_level']),
    otherOccupation: getStringValue(record, ['other_occupation']),
    otherOrganization: getStringValue(record, ['other_organization']),
    otherWorkplace: getStringValue(record, ['other_workplace']),
  };
}

function toUserPayload(input: UpdateUserInput): Record<string, string | boolean | undefined> {
  const payload: Record<string, string | boolean | undefined> = {};

  if (typeof input.name === 'string') payload.name = input.name;
  if (typeof input.email === 'string') payload.email = input.email;
  if (typeof input.middleInitial === 'string') payload.middle_initial = input.middleInitial;
  if (typeof input.address === 'string') payload.address = input.address;
  if (typeof input.role === 'string') payload.role = input.role;
  if (typeof input.tenantType === 'string') payload.tenant_type = input.tenantType;
  if (typeof input.status === 'string') payload.status = input.status;
  if (typeof input.isVerified === 'boolean') {
    payload.is_verified = input.isVerified;
    payload.verification_status = input.isVerified ? 'verified' : 'pending';
    payload.landlord_status = input.isVerified ? 'verified' : 'pending';
  }
  if (typeof input.mobile === 'string') payload.mobile = input.mobile;
  if (typeof input.mobileNumber === 'string') payload.mobile = input.mobileNumber;
  if (typeof input.permitNumber === 'string') payload.permit_number = input.permitNumber;
  if (typeof input.department === 'string') payload.department = input.department;
  if (typeof input.adminLevel === 'string') payload.admin_level = input.adminLevel;
  if (typeof input.otherOccupation === 'string') payload.other_occupation = input.otherOccupation;
  if (typeof input.otherOrganization === 'string') payload.other_organization = input.otherOrganization;
  if (typeof input.otherWorkplace === 'string') payload.other_workplace = input.otherWorkplace;

  return payload;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

async function recordLogin(profile: User | null, authId: string, success = true, metadata: Record<string, unknown> = {}): Promise<void> {
  const { error } = await supabaseClient.from('logins').insert({
    user_id: profile?.id ?? null,
    auth_id: authId,
    event: 'sign_in',
    success,
    user_agent: typeof navigator === 'undefined' ? null : navigator.userAgent,
    metadata,
  });

  if (error) {
    console.warn('Failed to record login audit row:', error.message);
  }
}

async function ensureRoleProfile(userId: string, role: UserRole, input: Partial<CreateUserInput & UpdateUserInput>): Promise<void> {
  let table: 'student_profiles' | 'employee_profiles' | 'landlord_profiles' | 'admin_profiles' | null = null;
  let payload: Record<string, unknown> = { user_id: userId };

  const tenantType = normalizeTenantType(input.tenantType, role);

  if (tenantType === 'student') {
    table = 'student_profiles';
    if (typeof input.school === 'string') payload.school = nonEmptyString(input.school);
    if (typeof input.guardianName === 'string') payload.guardian_name = nonEmptyString(input.guardianName);
    if (typeof input.guardianAddress === 'string') payload.guardian_address = nonEmptyString(input.guardianAddress);
    if (typeof input.guardianContact === 'string') payload.guardian_contact = nonEmptyString(input.guardianContact);
  }

  if (tenantType === 'employee') {
    table = 'employee_profiles';
    if (typeof input.company === 'string') payload.company = nonEmptyString(input.company);
    if (typeof input.workAddress === 'string') payload.work_address = nonEmptyString(input.workAddress);
  }

  if (role === 'landlord') {
    table = 'landlord_profiles';
    if (typeof input.permitNumber === 'string') {
      payload.permit_number = nonEmptyString(input.permitNumber);
      payload.business_permit_number = nonEmptyString(input.permitNumber);
    }
    if (typeof input.isVerified === 'boolean') payload.is_verified = input.isVerified;
  }

  if (role === 'admin' || role === 'super_admin') {
    table = 'admin_profiles';
    if (typeof input.adminLevel === 'string') payload.admin_level = input.adminLevel;
    if (typeof input.department === 'string') payload.department = input.department;
  }

  if (!table) return;

  const { error } = await supabaseClient.from(table).upsert(payload, { onConflict: 'user_id' });
  if (error) {
    throw new Error(`Failed to sync ${table}: ${error.message}`);
  }
}

async function uploadLandlordSignupDocuments(userId: string, input: CreateUserInput): Promise<void> {
  if (input.role !== 'landlord') return;
  const files = [
    { file: input.permitDocument, column: 'verification_document_url', prefix: 'permit' },
    { file: input.idDocument, column: 'id_document_url', prefix: 'identity' },
  ].filter((item): item is { file: File; column: string; prefix: string } => item.file instanceof File);
  if (files.length === 0) return;

  const updates: Record<string, string> = {};
  for (const item of files) {
    const extension = item.file.name.split('.').pop()?.toLowerCase() || 'bin';
    const path = `${userId}/${item.prefix}-${safeRandomId()}.${extension}`;
    const { error } = await supabaseClient.storage.from('verification-documents').upload(path, item.file, {
      contentType: item.file.type || undefined,
      upsert: false,
    });
    if (error) throw new Error(`Unable to upload ${item.prefix} document: ${error.message}`);
    updates[item.column] = path;
  }

  const { error } = await supabaseClient.from('landlord_profiles').update(updates).eq('user_id', userId);
  if (error) throw new Error(`Unable to link verification documents: ${error.message}`);
}

export function readCurrentUserFromStorage(): User | null {
  return null;
}

export function persistCurrentUser(_user: User | null): void {
  // Compatibility no-op. Supabase Auth and the database profile are authoritative.
}

export async function fetchAppUsers(): Promise<User[]> {
  const [{ data, error }, { data: publicLandlords, error: publicError }] = await Promise.all([
    supabaseClient.from(APP_USERS_TABLE).select('*'),
    supabaseClient.from('public_landlords').select('*'),
  ]);

  if (error && publicError) {
    throw new Error(error.message);
  }

  const users = new Map<string, User>();
  [...(publicLandlords ?? []), ...(data ?? [])].forEach((row) => {
    const normalized = normalizeUser(row as AppUserRow);
    if (normalized.id) users.set(normalized.id, normalized);
  });
  return [...users.values()];
}

export async function fetchUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabaseClient.from(APP_USERS_TABLE).select('*').eq('id', userId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeUser(data as AppUserRow) : null;
}

export async function fetchUserByAuthId(authId: string): Promise<User | null> {
  const { data, error } = await supabaseClient.from(APP_USERS_TABLE).select('*').eq('auth_id', authId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeUser(data as AppUserRow) : null;
}

export async function fetchUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabaseClient.from(APP_USERS_TABLE).select('*').eq('email', email).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizeUser(data as AppUserRow) : null;
}

async function ensureProfileForAuthUser(authUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<User> {
  const existingByAuthId = await fetchUserByAuthId(authUser.id);
  if (existingByAuthId) {
    assertValidRole(existingByAuthId.role);
    await ensureRoleProfile(existingByAuthId.id, existingByAuthId.role, {
      tenantType: existingByAuthId.tenantType ?? normalizeTenantType(authUser.user_metadata?.tenantType, existingByAuthId.role),
      school: typeof authUser.user_metadata?.school === 'string' ? authUser.user_metadata.school : undefined,
      guardianName: typeof authUser.user_metadata?.guardianName === 'string' ? authUser.user_metadata.guardianName : undefined,
      guardianAddress: typeof authUser.user_metadata?.guardianAddress === 'string' ? authUser.user_metadata.guardianAddress : undefined,
      guardianContact: typeof authUser.user_metadata?.guardianContact === 'string' ? authUser.user_metadata.guardianContact : undefined,
      company: typeof authUser.user_metadata?.company === 'string' ? authUser.user_metadata.company : undefined,
      workAddress: typeof authUser.user_metadata?.workAddress === 'string' ? authUser.user_metadata.workAddress : undefined,
      permitNumber: existingByAuthId.permitNumber,
      adminLevel: existingByAuthId.adminLevel,
      department: existingByAuthId.department,
      isVerified: existingByAuthId.isVerified,
    });
    return existingByAuthId;
  }

  const email = authUser.email ?? '';
  const existingByEmail = email ? await fetchUserByEmail(email) : null;
  if (existingByEmail) {
    assertValidRole(existingByEmail.role);
    const { data, error } = await supabaseClient
      .from(APP_USERS_TABLE)
      .update({ auth_id: authUser.id })
      .eq('id', existingByEmail.id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const profile = normalizeUser(data as AppUserRow);
    assertValidRole(profile.role);
    await ensureRoleProfile(profile.id, profile.role, {
      tenantType: profile.tenantType,
      adminLevel: profile.adminLevel,
      department: profile.department,
      permitNumber: profile.permitNumber,
      isVerified: profile.isVerified,
    });
    return profile;
  }

  const role = normalizeRoleValue(authUser.user_metadata?.role);
  if (role !== 'tenant' && role !== 'student' && role !== 'employee' && role !== 'landlord') {
    throw new Error('A public account profile cannot be created with this role.');
  }
  const name = typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name : email.split('@')[0] || 'User';
  const middleInitial = typeof authUser.user_metadata?.middleInitial === 'string' ? authUser.user_metadata.middleInitial : null;
  const address = typeof authUser.user_metadata?.address === 'string' ? authUser.user_metadata.address : null;
  const mobile = typeof authUser.user_metadata?.mobile === 'string' ? authUser.user_metadata.mobile : null;
  const tenantType = normalizeTenantType(authUser.user_metadata?.tenantType, role);
  const status = role === 'landlord' ? 'pending' : 'active';

  const { data, error } = await supabaseClient
    .from(APP_USERS_TABLE)
    .insert({
      auth_id: authUser.id,
      email,
      name,
      middle_initial: nonEmptyString(middleInitial),
      address: nonEmptyString(address),
      mobile: nonEmptyString(mobile),
      role,
      tenant_type: tenantType ?? null,
      other_occupation: nonEmptyString(authUser.user_metadata?.otherOccupation),
      other_organization: nonEmptyString(authUser.user_metadata?.otherOrganization),
      other_workplace: nonEmptyString(authUser.user_metadata?.otherWorkplace),
      status,
      is_verified: role !== 'landlord',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const profile = normalizeUser(data as AppUserRow);
  await ensureRoleProfile(profile.id, profile.role, {
    tenantType: profile.tenantType ?? tenantType,
    school: typeof authUser.user_metadata?.school === 'string' ? authUser.user_metadata.school : undefined,
    guardianName: typeof authUser.user_metadata?.guardianName === 'string' ? authUser.user_metadata.guardianName : undefined,
    guardianAddress: typeof authUser.user_metadata?.guardianAddress === 'string' ? authUser.user_metadata.guardianAddress : undefined,
    guardianContact: typeof authUser.user_metadata?.guardianContact === 'string' ? authUser.user_metadata.guardianContact : undefined,
    company: typeof authUser.user_metadata?.company === 'string' ? authUser.user_metadata.company : undefined,
    workAddress: typeof authUser.user_metadata?.workAddress === 'string' ? authUser.user_metadata.workAddress : undefined,
    permitNumber: typeof authUser.user_metadata?.permitNumber === 'string' ? authUser.user_metadata.permitNumber : undefined,
    isVerified: profile.isVerified,
  });
  return profile;
}

function requiresPendingEmailVerification(authUser: { email_confirmed_at?: string | null }): boolean {
  return !authUser.email_confirmed_at;
}

function assertActiveAccount(user: User): void {
  if (String(user.status).toLowerCase() === 'disabled') {
    throw new Error('This account has been deactivated. Contact the Super Administrator.');
  }
}

export async function getCurrentAuthenticatedUser(): Promise<User | null> {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  const authUser = data.session?.user;
  if (!authUser) {
    persistCurrentUser(null);
    return null;
  }

  if (requiresPendingEmailVerification(authUser)) {
    await supabaseClient.auth.signOut();
    persistCurrentUser(null);
    return null;
  }

  const profile = await ensureProfileForAuthUser(authUser);
  assertActiveAccount(profile);
  persistCurrentUser(profile);
  return profile;
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  const { data } = supabaseClient.auth.onAuthStateChange((_event: string, session) => {
    const requestId = ++latestAuthProfileRequestId;
    const authUser = session?.user;

    if (!authUser) {
      persistCurrentUser(null);
      callback(null);
      return;
    }

    if (requiresPendingEmailVerification(authUser)) {
      void supabaseClient.auth.signOut();
      persistCurrentUser(null);
      callback(null);
      return;
    }

    void ensureProfileForAuthUser(authUser)
      .then((profile) => {
        if (requestId !== latestAuthProfileRequestId) return;
        assertActiveAccount(profile);
        persistCurrentUser(profile);
        callback(profile);
      })
      .catch((error) => {
        if (requestId !== latestAuthProfileRequestId) return;
        console.error('Failed to load Supabase Auth profile:', error);
        persistCurrentUser(null);
        callback(null);
      });
  });

  return () => data.subscription.unsubscribe();
}

function signupLog(message: string, details?: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  if (details) console.info(message, details);
  else console.info(message);
}

function mapSignupError(error: { message?: string; status?: number; code?: string }): SignupFlowError {
  const message = error.message ?? '';
  const code = error.code ?? '';
  console.error('[AUTH] Signup request failed', { message, status: error.status, code: error.code });
  if (/already registered|already exists|user.*exists/i.test(message)) {
    return new SignupFlowError('An account may already exist for this email. Try signing in, resending verification, or resetting your password.', 'auth', 'email_exists', { cause: error });
  }
  if (/invalid.*email|email.*invalid/i.test(message)) return new SignupFlowError('Enter a valid email address.', 'validation', 'invalid_email', { cause: error });
  if (/password|weak/i.test(message)) return new SignupFlowError('Choose a stronger password that meets the password requirements.', 'validation', 'weak_password', { cause: error });
  if (/signup.*disabled|signups.*disabled/i.test(message)) return new SignupFlowError('Account registration is temporarily unavailable.', 'auth', 'signup_disabled', { cause: error });
  if (error.status === 429 || /rate|too many|seconds/i.test(message) || /over_email_send_rate_limit/i.test(code)) {
    return new SignupFlowError("We couldn't send the confirmation email right now. Please try again shortly.", 'auth', 'confirmation_email_rate_limit', { cause: error });
  }
  if (/smtp|mailer|email.*send|send.*email|confirmation.*email|email.*not.*authorized|not.*authorized.*email/i.test(`${code} ${message}`)) {
    return new SignupFlowError("We couldn't send the confirmation email right now. Please try again shortly.", 'auth', 'confirmation_email_delivery', { cause: error });
  }
  if (/database|trigger|permission|row-level|rls/i.test(message)) return new SignupFlowError('Account registration could not be completed because profile setup failed. No retry is needed until the database configuration is corrected.', 'profile', 'profile_database', { cause: error });
  if (/fetch|network|connection/i.test(message)) return new SignupFlowError('We could not reach the account service. Check your connection and try again.', 'auth', 'network', { cause: error });
  return new SignupFlowError('We could not complete account registration. Please try again later.', 'auth', 'unexpected', { cause: error });
}

function pendingSignupUser(input: CreateUserInput, authId: string, role: UserRole, tenantType: TenantType | undefined): User {
  return {
    id: authId,
    authId,
    name: input.name,
    email: input.email.trim().toLowerCase(),
    username: input.username.trim().toLowerCase(),
    role,
    tenantType,
    status: role === 'landlord' ? 'pending' : 'active',
    isVerified: role !== 'landlord',
    mobile: input.mobile ?? input.mobileNumber,
    mobileNumber: input.mobile ?? input.mobileNumber,
  };
}

export async function signupUser(input: CreateUserInput): Promise<SignupResult> {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  const role: UserRole = isTenantRole(input.role) ? 'tenant' : input.role;
  const tenantType = normalizeTenantType(input.tenantType, input.role);
  if (role !== 'tenant' && role !== 'landlord') throw new SignupFlowError('Public registration supports tenant and landlord accounts only.', 'validation', 'invalid_public_role');
  if (input.termsAccepted !== true) throw new SignupFlowError('You must agree to the Terms of Use and Privacy Policy to continue.', 'validation', 'terms_required');
  if (role === 'landlord' && input.landlordVerificationAccepted !== true) throw new SignupFlowError('You must agree to the Terms of Use and Landlord Verification Policy to continue.', 'validation', 'landlord_policy_required');
  if (!/^[a-z0-9_]{4,30}$/.test(username)) throw new SignupFlowError('Username must be 4–30 characters using only letters, numbers, or underscores.', 'validation', 'invalid_username');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new SignupFlowError('Enter a valid email address.', 'validation', 'invalid_email');

  signupLog('[AUTH] Signup started', { email, role, tenantType });

  const { data: authData, error: authError } = await supabaseClient.auth.signUp({
    email,
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        username,
        name: input.name,
        role,
        mobile: input.mobile ?? input.mobileNumber,
        middleInitial: input.middleInitial,
        address: input.address,
        permitNumber: role === 'landlord' ? input.permitNumber : undefined,
        termsAccepted: true,
        landlordVerificationAccepted: role === 'landlord' ? true : undefined,
        requires_email_verification: true,
      },
    },
  });

  if (authError) throw mapSignupError(authError);

  if (!authData.user) {
    console.error('[AUTH] Signup returned no user and no Supabase error');
    throw new SignupFlowError('We could not confirm that account registration completed. Try signing in, resending verification, or resetting your password before registering again.', 'auth', 'missing_auth_response');
  }

  // Supabase deliberately obscures duplicate-email signup when email
  // confirmation is enabled. An empty identities array means no new identity
  // was created, so never continue with profile creation or report success.
  const existingAccount = Array.isArray(authData.user.identities) && authData.user.identities.length === 0;
  if (existingAccount) {
    signupLog('[AUTH] Existing account response received', { email });
    return {
      user: pendingSignupUser(input, authData.user.id, role, tenantType),
      accountCreated: false,
      profileCreated: false,
      requiresEmailVerification: true,
      existingAccount: true,
    };
  }

  const requiresEmailVerification = !authData.user.email_confirmed_at;
  signupLog('[AUTH] Auth account created', { authUserId: authData.user.id });
  signupLog(requiresEmailVerification ? '[AUTH] Verification pending' : '[AUTH] Email already confirmed');

  // handle_new_auth_user runs in the same database transaction as Auth user
  // creation. A successful signUp therefore means the base app_users and role
  // profile upserts completed. With confirmation enabled there is no session,
  // so the client must not attempt anonymous writes to private profile tables.
  let profile = pendingSignupUser(input, authData.user.id, role, tenantType);
  let profileSetupError: string | undefined;
  if (authData.session) {
    try {
      signupLog('[PROFILE] Checking app_users profile');
      profile = await ensureProfileForAuthUser(authData.user);
      signupLog('[PROFILE] Profile exists', { profileId: profile.id });
      await uploadLandlordSignupDocuments(profile.id, input);
    } catch (error) {
      console.error('[PROFILE] Auth account exists but profile finalization failed', error);
      profileSetupError = 'Your account was created, but we could not finish setting up your profile. Verify your email, then try signing in or contact support.';
    } finally {
      await supabaseClient.auth.signOut();
    }
  }

  signupLog('[AUTH] Signup flow complete', { requiresEmailVerification, profileSetupError: Boolean(profileSetupError) });
  return {
    user: profile,
    accountCreated: true,
    profileCreated: !profileSetupError,
    requiresEmailVerification,
    existingAccount: false,
    profileSetupError,
  };
}

export async function loginUser(credentials: AuthCredentials): Promise<User> {
  const username = credentials.username?.trim().toLowerCase();
  const password = credentials.password;

  if (!username || !password) {
    throw new Error('Username and password are required.');
  }

  // Resolve only the internal Supabase Auth email. Password verification still
  // happens through Supabase Auth, and app_users remains protected by RLS.
  const { data: resolvedEmail, error: resolveError } = await supabaseClient.rpc('fn_resolve_username_login', {
    p_username: username,
  });

  if (resolveError) {
    console.error('[AUTH] Username resolution failed', {
      message: resolveError.message,
      code: resolveError.code,
      details: resolveError.details,
    });
    throw new Error('Username sign-in is temporarily unavailable. Please try again later.');
  }

  if (typeof resolvedEmail !== 'string' || !resolvedEmail.trim()) {
    throw new Error('Invalid username or password.');
  }

  const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
    email: resolvedEmail.trim(),
    password,
  });

  if (signInError || !data.user) {
    const message = signInError?.message ?? '';
    console.error('[AUTH] Password sign-in failed', {
      message,
      status: signInError?.status,
      code: signInError?.code,
    });
    if (signInError?.status === 429 || /rate|too many/i.test(message)) {
      throw new Error('Too many sign-in attempts. Please wait before trying again.');
    }
    if (/email.*not.*confirm|confirm.*email|verify.*email/i.test(message)) {
      throw new Error('Please verify your account before signing in.');
    }
    throw new Error('Invalid username or password.');
  }

  if (requiresPendingEmailVerification(data.user)) {
    await supabaseClient.auth.signOut();
    throw new Error('Please verify your account before signing in.');
  }

  const profile = await ensureProfileForAuthUser(data.user);
  assertActiveAccount(profile);
  await recordLogin(profile, data.user.id, true, { username });
  persistCurrentUser(profile);
  return profile;
}

export async function resendSignupVerification(email: string): Promise<void> {
  const normalizedEmail = email.trim();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error('Enter a valid email address.');
  const { error } = await supabaseClient.auth.resend({
    type: 'signup', email: normalizedEmail,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  if (!error) return;
  console.error('[AUTH] Verification resend failed', { message: error.message, status: error.status, code: error.code });
  if (error.status === 429 || /rate|too many|seconds|smtp|mailer|email.*send|send.*email|email.*not.*authorized|not.*authorized.*email/i.test(`${error.code ?? ''} ${error.message}`)) {
    throw new Error("We couldn't send the confirmation email right now. Please try again shortly.");
  }
  if (/already.*confirm|already.*verif/i.test(error.message)) throw new Error('This email is already verified. Try signing in or resetting your password.');
  if (/invalid.*email/i.test(error.message)) throw new Error('Enter a valid email address.');
  throw new Error('The verification email could not be requested. Please try again later.');
}

export async function updateUser(userId: string, updates: UpdateUserInput): Promise<User> {
  if (typeof updates.password === 'string' && updates.password.length > 0) {
    const { error } = await supabaseClient.auth.updateUser({ password: updates.password });
    if (error) {
      throw new Error(error.message);
    }
  }

  const payload = toUserPayload(updates);

  const existing = await fetchUserById(userId);
  if (!existing) {
    throw new Error('User profile not found.');
  }

  if (Object.keys(payload).length === 0) {
    await ensureRoleProfile(userId, existing.role, updates);
    return existing;
  }

  const { data, error } = await supabaseClient.from(APP_USERS_TABLE).update(payload).eq('id', userId).select('*').single();

  if (error) {
    throw new Error(error.message);
  }

  const user = normalizeUser(data as AppUserRow);
  await ensureRoleProfile(user.id, user.role, { ...updates, isVerified: user.isVerified });
  persistCurrentUser(user);
  return user;
}

export async function deleteUser(userId: string): Promise<void> {
  const current = await getCurrentAuthenticatedUser();
  if (!current || current.id !== userId) {
    throw new Error('You can only delete your own account from this screen.');
  }

  const { error } = await supabaseClient.rpc('fn_delete_my_account');

  if (error) {
    throw new Error(error.message);
  }

  await supabaseClient.auth.signOut();
  persistCurrentUser(null);
}

export async function logoutUser(): Promise<void> {
  latestAuthProfileRequestId += 1;
  persistCurrentUser(null);
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
  persistCurrentUser(null);
}

export async function verifyLandlord(userId: string, verified = true): Promise<User> {
  const { error } = await supabaseClient.rpc('fn_set_landlord_verification', {
    p_landlord_id: userId,
    p_verified: verified,
  });
  if (error) {
    throw new Error(error.message);
  }

  const user = await fetchUserById(userId);
  if (!user) {
    throw new Error('Landlord account not found after verification update.');
  }
  return user;
}

export async function getPendingLandlordCount(): Promise<number> {
  const { data, error } = await supabaseClient.from('public_landlords').select('is_verified');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).filter((row: AppUserRow) => row.is_verified !== true).length;
}
