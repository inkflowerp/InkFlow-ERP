// ==============================================================================
// PrintERP SaaS - Platform vs Tenant Authentication Types
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
  is_active: boolean
  mfa_enabled?: boolean
  last_login_at?: string
  created_at: string
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
  platformUserId: string
  platformUserEmail: string
  targetCompanyId: string
  targetCompanySlug: string
  targetCompanyName: string
  reason: string
  startedAt: string
  expiresAt: string
}
