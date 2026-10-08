// ==============================================================================
// PrintFlow SaaS - Platform vs Tenant Authentication Types
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
  userId?: string
  adminId?: string
  email: string
  full_name: string
  fullName?: string
  role: PlatformRole
  platformRole?: PlatformRole
  phone?: string
  avatar_url?: string
  avatarUrl?: string
  is_active: boolean
  mfa_enabled?: boolean
  mfaEnabled?: boolean
  is_mfa_verified?: boolean
  isMfaVerified?: boolean
  mfa_verified_at?: number
  mfaVerifiedAt?: number
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
  id?: string
  user_id?: string
  email: string
  fullName: string
  platformRole: PlatformRole
  role?: PlatformRole
  responsibilities: string[]
  permissions: string[]
  isActive: boolean
  mfaEnabled?: boolean
  isMfaVerified?: boolean
  mfaVerifiedAt?: number
  phone?: string
  avatarUrl?: string
  preferences?: Record<string, unknown>
  createdAt: string
  lastLoginAt?: string
}

export const PLATFORM_SESSION_COOKIE = 'printflow_platform_session'

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
  | 'branch_manager'
  | 'sales_manager'
  | 'graphic_designer'
  | 'production_manager'
  | 'machine_operator'
  | 'general_staff'
  | 'accountant'
  | 'delivery_coordinator'
  | 'owner'
  | 'admin'
  | 'manager'
  | 'operator'
  | 'designer'
  | 'installer'

/**
 * Safely resolves a raw role string or responsibilities list to a canonical TenantRole.
 * Guarantees that employees never default to 'business_owner'.
 */
export function resolveTenantRole(
  primaryRole?: string | null,
  responsibilities?: string[] | null,
  isOwner?: boolean
): TenantRole {
  const raw = (primaryRole || responsibilities?.[0] || '').toLowerCase().trim()
  const isExplicitStaff = [
    'operator',
    'machine_operator',
    'technician',
    'designer',
    'graphic_designer',
    'sales',
    'sales_manager',
    'sales_executive',
    'production',
    'production_manager',
    'accountant',
    'accounts',
    'billing',
    'delivery',
    'delivery_coordinator',
    'installer',
    'general_staff',
    'staff',
  ].includes(raw) ||
    raw.includes('operat') ||
    raw.includes('printer') ||
    raw.includes('design') ||
    raw.includes('graphic') ||
    raw.includes('sale') ||
    raw.includes('account') ||
    raw.includes('deliver')

  if (isOwner) return 'business_owner'

  if (raw === 'business_owner' || raw === 'platform_owner' || raw === 'owner') {
    return 'business_owner'
  }
  if (raw === 'branch_manager' || raw.includes('branch') || raw.includes('outlet') || raw.includes('showroom')) {
    return 'branch_manager'
  }
  if (raw === 'sales_manager' || raw === 'sales' || raw === 'sales_executive' || raw === 'manager' || raw.includes('sale')) {
    return 'sales_manager'
  }
  if (
    raw === 'graphic_designer' ||
    raw === 'designer' ||
    raw.includes('design') ||
    raw.includes('graphic') ||
    raw.includes('prepress') ||
    raw.includes('pre-press') ||
    raw.includes('artwork')
  ) {
    return 'graphic_designer'
  }
  if (
    raw === 'machine_operator' ||
    raw === 'operator' ||
    raw === 'technician' ||
    raw.includes('operat') ||
    raw.includes('printer') ||
    raw.includes('press') ||
    raw.includes('offset') ||
    raw.includes('finisher') ||
    raw.includes('machinist') ||
    raw.includes('die-cut') ||
    raw.includes('fabricat')
  ) {
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
 * Maps a TenantSessionData or raw role string to a client UI TenantRole ('owner', 'branch_manager', 'manager', 'designer', 'operator', 'accountant', 'installer').
 */
export function mapSessionToTenantRole(sessionOrRole: TenantSessionData | string | null): TenantRole {
  if (!sessionOrRole) return 'general_staff'
  const sessionObj = typeof sessionOrRole === 'object' && sessionOrRole !== null ? (sessionOrRole as unknown as Record<string, unknown>) : null
  
  // Check explicit assigned responsibilities and primary role first
  const explicitResp = (
    typeof sessionOrRole === 'object' && sessionOrRole !== null && Array.isArray(sessionOrRole.responsibilities) && sessionOrRole.responsibilities.length > 0
      ? sessionOrRole.responsibilities[0]
      : ''
  ).toLowerCase().trim()

  const rawRole = (
    typeof sessionOrRole === 'string'
      ? sessionOrRole
      : (sessionObj?.role as string) || sessionOrRole.primaryRole || explicitResp || ''
  ).toLowerCase().trim()

  // Assigned Staff Roles take absolute precedence over accidental owner fallback
  if (
    rawRole === 'graphic_designer' ||
    rawRole === 'designer' ||
    rawRole.includes('design') ||
    rawRole.includes('graphic') ||
    rawRole.includes('prepress') ||
    rawRole.includes('pre-press') ||
    rawRole.includes('artwork') ||
    explicitResp === 'designer' ||
    explicitResp === 'graphic_designer'
  ) {
    return 'designer'
  }

  if (
    rawRole === 'machine_operator' ||
    rawRole === 'operator' ||
    rawRole === 'technician' ||
    rawRole.includes('operat') ||
    rawRole.includes('printer') ||
    (rawRole.includes('press') && !rawRole.includes('prepress') && !rawRole.includes('pre-press')) ||
    rawRole.includes('offset') ||
    rawRole.includes('finisher') ||
    rawRole.includes('machinist') ||
    rawRole.includes('die-cut') ||
    rawRole.includes('fabricat') ||
    explicitResp === 'operator' ||
    explicitResp === 'machine_operator'
  ) return 'operator'

  if (
    rawRole === 'branch_manager' ||
    rawRole.includes('branch') ||
    rawRole.includes('outlet') ||
    rawRole.includes('showroom') ||
    explicitResp === 'branch_manager'
  ) {
    return 'branch_manager'
  }

  if (
    rawRole === 'sales_manager' ||
    rawRole === 'sales' ||
    rawRole === 'sales_executive' ||
    rawRole.includes('sale') ||
    explicitResp === 'sales_manager' ||
    explicitResp === 'sales'
  ) return 'manager'

  if (
    rawRole === 'production_manager' ||
    rawRole === 'production' ||
    rawRole.includes('production') ||
    explicitResp === 'production_manager'
  ) return 'manager'

  if (
    rawRole === 'accountant' ||
    rawRole === 'accounts' ||
    rawRole === 'billing' ||
    rawRole.includes('account') ||
    explicitResp === 'accountant'
  ) return 'accountant'

  if (
    rawRole === 'delivery_coordinator' ||
    rawRole === 'delivery' ||
    rawRole === 'installer' ||
    rawRole.includes('deliver') ||
    explicitResp === 'delivery_coordinator' ||
    explicitResp === 'installer'
  ) return 'installer'

  if (
    rawRole === 'business_owner' ||
    rawRole === 'owner' ||
    rawRole === 'platform_owner' ||
    (rawRole.includes('owner') && !rawRole.includes('operat') && !rawRole.includes('design'))
  ) {
    return 'owner'
  }

  if (rawRole === 'general_staff' || rawRole === 'staff') return 'general_staff'
  return (rawRole as TenantRole) || 'general_staff'
}

import type { CompanyRow } from '../../types/tenant.types.ts'

export const TENANT_SESSION_COOKIE = 'printflow_tenant_session'

export interface TenantSessionData {
  userId: string
  sub?: string
  userEmail: string
  fullName: string
  fullNameBn?: string | null
  phone?: string | null
  avatarUrl?: string | null
  companyId: string
  companySlug: string
  companyName: string
  companyNameBn?: string | null
  legalName?: string | null
  address?: string | null
  addressBn?: string | null
  area?: string | null
  branchId: string | null
  branchName?: string
  role: TenantRole
  primaryRole: string
  responsibilities: string[]
  permissions: string[]
  defaultLocale?: 'en' | 'bn'
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
  legalName?: string | null
  address?: string | null
  addressBn?: string | null
  area?: string | null
  companyRole: TenantRole
  primaryRole?: string
  branchId?: string | null
  branchName?: string
  responsibilities?: string[]
  permissions: string[]
  isSupportMode?: boolean
  defaultLocale?: 'en' | 'bn'
  company?: CompanyRow | null
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

/**
 * Resolves the designated home route for a given tenant role.
 * Ensures employees land strictly on their operational terminal rather than the owner dashboard.
 */
export function getRoleDefaultPath(role?: TenantRole | string | null, tenantSlug?: string): string {
  const normalized = (role || '').toLowerCase().trim()
  let subPath = '/dashboard'
  if (
    normalized === 'machine_operator' ||
    normalized === 'operator' ||
    normalized.includes('operat')
  ) {
    subPath = '/operator'
  } else if (
    normalized === 'graphic_designer' ||
    normalized === 'designer' ||
    normalized.includes('design')
  ) {
    subPath = '/designer'
  } else if (normalized === 'production_manager' || normalized.includes('production')) {
    subPath = '/production'
  } else if (normalized === 'sales_manager' || normalized.includes('sale')) {
    subPath = '/orders'
  } else if (normalized === 'general_staff' || normalized === 'staff') {
    subPath = '/portal'
  }
  return tenantSlug ? `/${tenantSlug}${subPath}` : subPath
}

