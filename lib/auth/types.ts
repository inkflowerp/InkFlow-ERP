// ==============================================================================
// PrintERP / InkFlow SaaS - Platform vs Tenant Authentication Types
// Strictly segregates Platform Administration from Tenant / Business Users.
// ==============================================================================

export type PlatformRole =
  | 'platform_owner'
  | 'platform_admin'
  | 'platform_support'
  | 'platform_operations'
  | 'platform_finance'
  | 'platform_readonly'

export interface PlatformUserRecord {
  id: string
  user_id: string
  email: string
  full_name: string
  role: PlatformRole
  phone?: string
  avatar_url?: string
  is_active: boolean
  mfa_enabled?: boolean
  preferences?: {
    language?: string
    timezone?: string
    date_format?: string
    currency?: string
  }
  last_login_at?: string
  created_at: string
}

export interface AuthenticatedPlatformContext {
  userId: string
  adminId: string
  email: string
  fullName: string
  platformRole: PlatformRole
  responsibilities: string[]
  permissions: string[]
  isActive: boolean
  mfaEnabled?: boolean
  phone?: string
  avatarUrl?: string
  preferences?: Record<string, any>
  createdAt: string
  lastLoginAt?: string
}

export const PLATFORM_SESSION_COOKIE = 'printerp_platform_session'

export interface PlatformSessionData {
  userId: string
  adminId: string
  email: string
  fullName: string
  role: PlatformRole
  mfaVerified?: boolean
  loginTime: string
  token: string
}

export type TenantRole =
  | 'business_owner'
  | 'sales_manager'
  | 'graphic_designer'
  | 'production_manager'
  | 'machine_operator'
  | 'general_staff'
  | 'accountant'
  | 'delivery_coordinator'

/**
 * Safely resolves a raw role string or responsibilities list to a canonical TenantRole.
 * Guarantees that employees never default to 'business_owner'.
 */
export function resolveTenantRole(
  primaryRole?: string | null,
  responsibilities?: string[] | null,
  isOwner?: boolean
): TenantRole {
  if (isOwner) return 'business_owner'

  const raw = (primaryRole || responsibilities?.[0] || '').toLowerCase().trim()
  if (raw === 'business_owner' || raw === 'platform_owner' || raw === 'owner') {
    return 'business_owner'
  }
  if (raw === 'sales_manager' || raw === 'sales' || raw === 'sales_executive' || raw === 'manager') {
    return 'sales_manager'
  }
  if (
    raw === 'graphic_designer' ||
    raw === 'designer' ||
    raw.includes('design') ||
    raw.includes('graphic') ||
    raw.includes('prepress') ||
    raw.includes('artwork')
  ) {
    return 'graphic_designer'
  }
  if (raw === 'machine_operator' || raw === 'operator' || raw === 'technician' || raw.includes('operat')) {
    return 'machine_operator'
  }
  if (raw === 'production_manager' || raw === 'production' || raw.includes('production')) {
    return 'production_manager'
  }
  if (raw === 'accountant' || raw === 'accounts' || raw === 'billing' || raw.includes('account')) {
    return 'accountant'
  }
  if (raw === 'delivery_coordinator' || raw === 'delivery' || raw === 'installer' || raw.includes('deliver')) {
    return 'delivery_coordinator'
  }
  return 'general_staff'
}

/**
 * Maps a TenantSessionData or raw role string to a client UI TenantRole ('owner', 'manager', 'designer', 'operator', 'accountant', 'installer').
 */
export function mapSessionToTenantRole(sessionOrRole: TenantSessionData | string | null): any {
  if (!sessionOrRole) return 'owner'
  const rawRole = (
    typeof sessionOrRole === 'string'
      ? sessionOrRole
      : (sessionOrRole as any).role || sessionOrRole.primaryRole || sessionOrRole.responsibilities?.[0] || ''
  ).toLowerCase().trim()

  if (rawRole === 'business_owner' || rawRole === 'owner' || rawRole === 'platform_owner' || rawRole.includes('owner') || rawRole.includes('admin')) return 'owner'
  if (
    rawRole === 'graphic_designer' ||
    rawRole === 'designer' ||
    rawRole.includes('design') ||
    rawRole.includes('graphic') ||
    rawRole.includes('prepress') ||
    rawRole.includes('pre-press') ||
    rawRole.includes('artwork')
  ) {
    return 'designer'
  }
  if (rawRole === 'sales_manager' || rawRole === 'sales' || rawRole === 'sales_executive' || rawRole === 'manager' || rawRole.includes('sale')) return 'manager'
  if (rawRole === 'machine_operator' || rawRole === 'operator' || rawRole === 'technician' || rawRole.includes('operat')) return 'operator'
  if (rawRole === 'production_manager' || rawRole === 'production' || rawRole.includes('production')) return 'manager'
  if (rawRole === 'accountant' || rawRole === 'accounts' || rawRole === 'billing' || rawRole.includes('account')) return 'accountant'
  if (rawRole === 'delivery_coordinator' || rawRole === 'delivery' || rawRole === 'installer' || rawRole.includes('deliver')) return 'installer'
  if (rawRole === 'general_staff' || rawRole === 'staff') return 'operator'
  return rawRole || 'operator'
}

export const TENANT_SESSION_COOKIE = 'printerp_tenant_session'

export interface TenantSessionData {
  userId: string
  userEmail: string
  fullName: string
  fullNameBn?: string | null
  phone?: string | null
  companyId: string
  companySlug: string
  companyName: string
  companyNameBn?: string | null
  branchId: string | null
  branchName?: string
  role: TenantRole
  primaryRole: string
  responsibilities: string[]
  permissions: string[]
  loginTime: string
  token: string
}

export interface TenantContext {
  userId: string
  userEmail: string
  fullName?: string
  fullNameBn?: string | null
  phone?: string | null
  companyId: string
  companySlug: string
  companyName: string
  companyNameBn?: string | null
  companyRole: TenantRole
  primaryRole?: string
  branchId?: string | null
  branchName?: string
  responsibilities?: string[]
  permissions: string[]
  isSupportMode?: boolean
}

export interface PlatformSupportSession {
  sessionId?: string
  platformUserId: string
  platformUserEmail: string
  targetCompanyId: string
  targetCompanySlug: string
  targetCompanyName: string
  reason: string
  accessLevel: 'read_only' | 'config_only' | 'full_support'
  startedAt: string
  expiresAt: string
}
