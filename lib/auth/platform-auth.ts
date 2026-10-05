// ==============================================================================
// PrintFlow SaaS - Platform Authorization Utilities (Server-Side)
// Authoritative Supabase Auth & PostgreSQL verification.
// Strictly guards all /platform/* operations against unauthorized access.
// Single Source of Truth: Supabase Auth -> Authenticated auth.uid() -> platform_admins -> Fail Closed.
// ==============================================================================

import { cache } from 'react'
import { createClient } from '../supabase/server.ts'
import { createAdminClient } from '../supabase/admin.ts'
import type {
  PlatformRole,
  PlatformUserRecord,
  AuthenticatedPlatformContext,
} from './types.ts'
import { PLATFORM_SESSION_COOKIE } from './types.ts'
import { verifySessionToken, signSessionToken } from '../security/session-signer.ts'

async function performRedirect(url: string): Promise<never> {
  try {
    const nav = await import('next/navigation')
    if (typeof nav?.redirect === 'function') {
      nav.redirect(url)
    }
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      typeof (error as { digest?: unknown }).digest === 'string' &&
      ((error as { digest: string }).digest).startsWith('NEXT_REDIRECT')
    ) {
      throw error
    }
    throw new Error(`REDIRECT:${url}`)
  }
  throw new Error(`REDIRECT:${url}`)
}

export { PLATFORM_SESSION_COOKIE }

// Canonical Platform Permissions Master Registry
export const ALL_PLATFORM_PERMISSIONS = [
  'platform.view',
  'platform.manage',
  'platform.dashboard',
  'tenant.view',
  'tenant.create',
  'tenant.edit',
  'tenant.activate',
  'tenant.suspend',
  'tenant.reactivate',
  'tenant.cancel',
  'tenant.archive',
  'tenant.delete',
  'tenant.purge',
  'company.view',
  'company.create',
  'company.edit',
  'company.suspend',
  'company.reactivate',
  'company.cancel',
  'company.archive',
  'company.delete',
  'company.purge',
  'company.export',
  'company.support_mode',
  'company.activity',
  'subscription.view',
  'subscription.manage',
  'subscription.edit',
  'plan.view',
  'plan.create',
  'plan.edit',
  'plan.archive',
  'plan.delete',
  'plan.change',
  'feature.view',
  'feature.manage',
  'feature_flags.view',
  'feature_flags.manage',
  'platform_user.view',
  'platform_user.create',
  'platform_user.edit',
  'platform_user.disable',
  'platform_user.manage_permissions',
  'support.view',
  'support.reply',
  'support.assign',
  'support.internal_note',
  'support.manage',
  'support.close',
  'support.export',
  'support.request',
  'support.start',
  'support.end',
  'support.revoke',
  'support.access',
  'company.support_access',
  'audit.view',
  'security.view',
  'security.manage',
  'security.revoke_session',
  'system.view',
  'system.health',
  'system.manage',
  'system.job_retry',
  'system.resolve',
  'system.incidents',
  'system.integrations',
  'system.emergency_controls',
  'emergency_controls.manage',
  'incident.view',
  'incident.manage',
  'job.view',
  'job.manage',
  'billing.reconcile',
] as const

export const PLATFORM_ROLE_PERMISSIONS_MAP: Record<PlatformRole, readonly string[]> = {
  platform_owner: ALL_PLATFORM_PERMISSIONS,
  platform_admin: ALL_PLATFORM_PERMISSIONS.filter(
    (p) =>
      p !== 'security.manage' &&
      p !== 'platform.manage' &&
      p !== 'system.emergency_controls' &&
      p !== 'emergency_controls.manage' &&
      p !== 'tenant.delete' &&
      p !== 'tenant.purge' &&
      p !== 'company.delete' &&
      p !== 'company.purge'
  ),
  platform_support: [
    'platform.view',
    'tenant.view',
    'company.view',
    'support.view',
    'support.reply',
    'support.assign',
    'support.internal_note',
    'support.manage',
    'support.close',
    'support.export',
    'support.request',
    'support.start',
    'support.end',
    'support.revoke',
    'support.access',
    'company.support_access',
    'audit.view',
    'system.view',
  ],
  platform_finance: [
    'platform.view',
    'tenant.view',
    'company.view',
    'subscription.view',
    'subscription.manage',
    'subscription.edit',
    'plan.view',
    'plan.create',
    'plan.edit',
    'billing.reconcile',
    'audit.view',
  ],
  platform_operations: [
    'platform.view',
    'tenant.view',
    'company.view',
    'system.view',
    'system.manage',
    'system.job_retry',
    'system.resolve',
    'incident.view',
    'incident.manage',
    'job.view',
    'job.manage',
    'audit.view',
  ],
  platform_readonly: [
    'platform.view',
    'tenant.view',
    'company.view',
    'subscription.view',
    'plan.view',
    'feature.view',
    'feature_flags.view',
    'platform_user.view',
    'support.view',
    'audit.view',
    'security.view',
    'system.view',
    'incident.view',
    'job.view',
  ],
}

/**
 * Calculates effective permissions across primary role and any assigned responsibilities.
 */
export function resolveEffectivePlatformPermissions(
  primaryRole: PlatformRole,
  responsibilities: string[] = []
): string[] {
  const permSet = new Set<string>()

  // 1. Add primary role permissions
  const rolePerms = PLATFORM_ROLE_PERMISSIONS_MAP[primaryRole] || []
  rolePerms.forEach((p) => permSet.add(p))

  // 2. Add responsibility permissions
  for (const resp of responsibilities) {
    if (resp in PLATFORM_ROLE_PERMISSIONS_MAP) {
      const respPerms = PLATFORM_ROLE_PERMISSIONS_MAP[resp as PlatformRole] || []
      respPerms.forEach((p) => permSet.add(p))
    }
  }

  return Array.from(permSet)
}

/**
 * Canonical Server-Side Platform Context Resolver.
 * Single Source of Truth: Supabase Auth -> Authenticated auth.uid() -> platform_admins.user_id -> Active check.
 * Strictly FAILS CLOSED: Cookies or client payloads alone CANNOT establish platform identity.
 * Wrapped in React cache() for request-level memoization.
 */
export const getAuthenticatedPlatformContext = cache(async function getAuthenticatedPlatformContext(): Promise<AuthenticatedPlatformContext | null> {
  try {
    // 1. Authoritative Supabase Auth Verification (Mandatory Step 1)
    let authenticatedUser: import('@supabase/supabase-js').User | null = null
    try {
      const supabase = await createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user?.id) {
        return null // FAIL CLOSED: Unauthenticated in Supabase
      }
      authenticatedUser = user
    } catch {
      return null // FAIL CLOSED: Supabase client unavailable
    }

    if (!authenticatedUser?.id) {
      return null // FAIL CLOSED
    }

    // 2. Authoritative Database Platform Admin Verification (Mandatory Step 2)
    const adminClient = createAdminClient()
    let { data: adminRecord, error: dbError } = await adminClient
      .from('platform_admins')
      .select('*')
      .eq('user_id', authenticatedUser.id)
      .eq('is_active', true)
      .maybeSingle()

    // Secure initial provision binding: ONLY if user email is confirmed and record's user_id is unassigned
    if (!adminRecord && authenticatedUser.email && authenticatedUser.email_confirmed_at) {
      const { data: recordByEmail } = await adminClient
        .from('platform_admins')
        .select('*')
        .ilike('email', authenticatedUser.email)
        .eq('is_active', true)
        .is('user_id', null)
        .maybeSingle()

      if (recordByEmail) {
        adminRecord = recordByEmail
        try {
          await adminClient
            .from('platform_admins')
            .update({ user_id: authenticatedUser.id, updated_at: new Date().toISOString() })
            .eq('id', recordByEmail.id)
        } catch {}
      }
    }

    if (dbError || !adminRecord || !adminRecord.is_active) {
      return null // FAIL CLOSED: Authenticated user is not an active platform admin
    }

    // 3. Optional auxiliary session metadata (only valid if cryptographically signed and matches authenticated user ID)
    let auxiliaryPreferences = adminRecord.preferences as Record<string, unknown> | null | undefined
    let isMfaVerified = false
    let mfaVerifiedAt: number | undefined = undefined
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const sessCookie = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value
      if (sessCookie) {
        interface ParsedPlatformSession {
          userId?: string
          adminId?: string
          sub?: string
          mfaVerified?: boolean
          mfaVerifiedAt?: number
          iat?: number
          preferences?: Record<string, unknown>
        }
        const parsed = await verifySessionToken<ParsedPlatformSession>(sessCookie)
        if (parsed && (parsed.userId === authenticatedUser.id || parsed.adminId === adminRecord.id || parsed.sub === authenticatedUser.id)) {
          if (parsed.mfaVerified) {
            isMfaVerified = true
            mfaVerifiedAt = parsed.mfaVerifiedAt || (parsed.iat ? parsed.iat * 1000 : Date.now())
          }
          if (parsed.preferences) {
            const basePrefs =
              typeof adminRecord.preferences === 'object' && adminRecord.preferences !== null && !Array.isArray(adminRecord.preferences)
                ? (adminRecord.preferences as Record<string, unknown>)
                : {}
            auxiliaryPreferences = { ...basePrefs, ...parsed.preferences }
          }
        }
      }
    } catch {
      // Non-blocking: auxiliary cookie read failure does not invalidate DB verification
    }

    // Sanitize secrets from preferences before exposing
    let sanitizedPreferences = auxiliaryPreferences ? { ...auxiliaryPreferences } : undefined
    if (sanitizedPreferences && 'totp_secret' in sanitizedPreferences) {
      delete sanitizedPreferences.totp_secret
    }

    const role = (adminRecord.role as PlatformRole) || 'platform_readonly'
    const responsibilities: string[] = Array.isArray(adminRecord.responsibilities)
      ? adminRecord.responsibilities.filter((r): r is string => typeof r === 'string')
      : [role]
    const permissions = resolveEffectivePlatformPermissions(role, responsibilities)

    return {
      userId: String(authenticatedUser.id),
      adminId: String(adminRecord.id),
      id: String(adminRecord.id),
      user_id: String(authenticatedUser.id),
      email: String(adminRecord.email || authenticatedUser.email),
      fullName: String(adminRecord.full_name || 'Platform Administrator'),
      platformRole: role,
      role,
      responsibilities,
      permissions,
      isActive: true,
      mfaEnabled: Boolean(adminRecord.mfa_enabled),
      isMfaVerified,
      mfaVerifiedAt,
      phone: adminRecord.phone || undefined,
      avatarUrl: adminRecord.avatar_url || undefined,
      preferences: sanitizedPreferences,
      createdAt: String(adminRecord.created_at),
      lastLoginAt: adminRecord.last_login_at ? String(adminRecord.last_login_at) : undefined,
    }
  } catch {
    return null // FAIL CLOSED
  }
})

/**
 * Authoritative DB lookup for a specific user ID or admin ID.
 * Strictly FAILS CLOSED with NO heuristic fallbacks or mock data.
 */
export async function getPlatformUser(userIdOrAdminId?: string): Promise<PlatformUserRecord | null> {
  if (!userIdOrAdminId) return null

  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('platform_admins')
      .select('*')
      .or(`user_id.eq.${userIdOrAdminId},id.eq.${userIdOrAdminId}`)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      return null // FAIL CLOSED
    }

    return {
      id: String(data.id),
      user_id: String(data.user_id),
      email: String(data.email),
      full_name: String(data.full_name),
      role: (data.role as PlatformRole) || 'platform_readonly',
      phone: data.phone || undefined,
      avatar_url: data.avatar_url || undefined,
      preferences:
        typeof data.preferences === 'object' && data.preferences !== null && !Array.isArray(data.preferences)
          ? (data.preferences as PlatformUserRecord['preferences'])
          : undefined,
      is_active: Boolean(data.is_active),
      mfa_enabled: Boolean(data.mfa_enabled),
      is_mfa_verified: false,
      last_login_at: data.last_login_at ? String(data.last_login_at) : undefined,
      created_at: String(data.created_at),
    }
  } catch {
    return null
  }
}

/**
 * Checks if the specified admin is the sole active Platform Owner.
 * Used for Last-Owner Protection server guards.
 */
export async function isLastPlatformOwner(adminId: string): Promise<boolean> {
  try {
    const adminClient = createAdminClient()
    const { count, error } = await adminClient
      .from('platform_admins')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'platform_owner')
      .eq('is_active', true)

    if (error || count === null) return true // Fail safe to protect
    return count <= 1
  } catch {
    return true
  }
}

/**
 * Retrieves the current authenticated platform user from Supabase auth and platform_admins.
 * Server-side validated: client cookies alone cannot grant platform access.
 * Wrapped in React cache() for request-scoped deduplication.
 */
export const getCurrentPlatformUser = cache(async function getCurrentPlatformUser(): Promise<PlatformUserRecord | null> {
  const context = await getAuthenticatedPlatformContext()
  if (context && context.isActive) {
    return {
      id: context.adminId,
      adminId: context.adminId,
      user_id: context.userId,
      userId: context.userId,
      email: context.email,
      full_name: context.fullName,
      fullName: context.fullName,
      role: context.platformRole,
      platformRole: context.platformRole,
      phone: context.phone,
      avatar_url: context.avatarUrl,
      avatarUrl: context.avatarUrl,
      preferences: context.preferences,
      is_active: context.isActive,
      mfa_enabled: context.mfaEnabled,
      mfaEnabled: context.mfaEnabled,
      is_mfa_verified: context.isMfaVerified,
      isMfaVerified: context.isMfaVerified,
      mfa_verified_at: context.mfaVerifiedAt,
      mfaVerifiedAt: context.mfaVerifiedAt,
      last_login_at: context.lastLoginAt,
      created_at: context.createdAt,
    }
  }
  return null
})

/**
 * Strict server-side platform guard.
 * Must be called in Platform Server Components and Server Actions.
 * Throws redirect to /platform/login if the user is not a verified platform administrator.
 */
export async function requirePlatformUser(): Promise<PlatformUserRecord> {
  const context = await getAuthenticatedPlatformContext()

  if (!context || !context.isActive) {
    await performRedirect('/platform/login?error=unauthorized')
    throw new Error('Unauthorized')
  }

  // Strict MFA Enforcement: If admin has MFA configured, they must have verified MFA!
  if (context.mfaEnabled && !context.isMfaVerified) {
    await performRedirect('/platform/login?error=mfa_required')
    throw new Error('MFA Verification Required')
  }

  return {
    id: context.adminId,
    adminId: context.adminId,
    user_id: context.userId,
    userId: context.userId,
    email: context.email,
    full_name: context.fullName,
    fullName: context.fullName,
    role: context.platformRole,
    platformRole: context.platformRole,
    phone: context.phone,
    avatar_url: context.avatarUrl,
    avatarUrl: context.avatarUrl,
    preferences: context.preferences,
    is_active: context.isActive,
    mfa_enabled: context.mfaEnabled,
    mfaEnabled: context.mfaEnabled,
    is_mfa_verified: context.isMfaVerified,
    isMfaVerified: context.isMfaVerified,
    mfa_verified_at: context.mfaVerifiedAt,
    mfaVerifiedAt: context.mfaVerifiedAt,
    last_login_at: context.lastLoginAt,
    created_at: context.createdAt,
  }
}

/**
 * Strict server-side platform role check (e.g. only platform_owner).
 */
export async function requirePlatformRole(allowedRoles: PlatformRole[]): Promise<PlatformUserRecord> {
  const platformUser = await requirePlatformUser()

  if (!allowedRoles.includes(platformUser.role)) {
    await performRedirect('/403?type=platform')
    throw new Error('Forbidden')
  }

  return platformUser
}

/**
 * Checks if a platform user has permission for a specific granular platform action.
 */
export function hasPlatformPermission(
  user: PlatformUserRecord | AuthenticatedPlatformContext | null | undefined,
  action: string
): boolean {
  if (!user) return false
  const isActive = 'is_active' in user ? user.is_active : user.isActive
  if (!isActive) return false

  const role = 'role' in user ? user.role : user.platformRole

  // Platform owner always possesses full authorization for all platform operations
  if (role === 'platform_owner') {
    return true
  }

  // If user context already has calculated permissions array
  if ('permissions' in user && Array.isArray((user as AuthenticatedPlatformContext).permissions)) {
    return (user as AuthenticatedPlatformContext).permissions.includes(action)
  }

  // Otherwise calculate from role permissions map
  const rolePerms = PLATFORM_ROLE_PERMISSIONS_MAP[role as PlatformRole] || []
  return rolePerms.includes(action)
}

/**
 * Server guard for specific platform permission.
 */
export async function requirePlatformPermission(requiredAction: string): Promise<PlatformUserRecord> {
  const platformUser = await requirePlatformUser()

  if (!hasPlatformPermission(platformUser, requiredAction)) {
    await performRedirect('/403?type=platform')
    throw new Error('Forbidden')
  }

  return platformUser
}

/**
 * Checks if the platform administrator has verified MFA within the last maxMinutes (default 5).
 * Mandatory for destructive actions (tenant deletion, limit overrides, emergency controls).
 */
export function checkPlatformMfaRecency(
  user: PlatformUserRecord | AuthenticatedPlatformContext | null | undefined,
  maxMinutes = 5
): boolean {
  if (!user) return false
  type MfaFields = {
    isMfaVerified?: boolean
    is_mfa_verified?: boolean
    mfa_enabled?: boolean
    mfaVerifiedAt?: number
    mfa_verified_at?: string | number
    last_mfa_verified_at?: string | number
  }
  const u = user as unknown as MfaFields
  const isVerified = Boolean(
    ('isMfaVerified' in user && user.isMfaVerified) ||
    u.is_mfa_verified ||
    u.mfa_enabled
  )
  if (!isVerified) return false
  const verifiedAt =
    'mfaVerifiedAt' in user && user.mfaVerifiedAt
      ? user.mfaVerifiedAt
      : u.mfa_verified_at || u.last_mfa_verified_at
  if (!verifiedAt) return false
  const verifiedMs = typeof verifiedAt === 'number' ? verifiedAt : new Date(verifiedAt).getTime()
  if (isNaN(verifiedMs)) return false
  const diffMs = Date.now() - verifiedMs
  return diffMs >= 0 && diffMs <= maxMinutes * 60 * 1000
}

/**
 * Records an immutable administrative audit log into public.platform_audit_logs.
 */
export async function recordPlatformAuditLog(params: {
  adminId?: string | null
  actorEmail?: string
  action: string
  entityType: string
  entityId?: string | null
  targetCompanyId?: string | null
  details?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('platform_audit_logs').insert({
      platform_admin_id: params.adminId || null,
      actor_email: params.actorEmail || 'system@printflow.bd',
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      target_company_id: params.targetCompanyId || null,
      details: (params.details || {}) as import('@/types/database.types').Json,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    })
  } catch (err) {
    console.error('[recordPlatformAuditLog] Error recording audit log:', err)
  }
}

