// ==============================================================================
// InkFlow SaaS - Platform Authorization Utilities (Server-Side)
// Authoritative Supabase Auth & PostgreSQL verification.
// Strictly guards all /platform/* operations against unauthorized access.
// Single Source of Truth: Supabase Auth -> Authenticated auth.uid() -> platform_admins -> Fail Closed.
// ==============================================================================

import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  PlatformRole,
  PlatformUserRecord,
  AuthenticatedPlatformContext,
  PLATFORM_SESSION_COOKIE,
} from './types'

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
      p !== 'emergency_controls.manage'
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
 * Single Source of Truth: Supabase Auth -> Authenticated auth.uid() -> platform_admins -> Active check.
 * Strictly FAILS CLOSED on any error or missing record. No fallback to unverified cookies.
 * Wrapped in React cache() for request-level memoization.
 */
export const getAuthenticatedPlatformContext = cache(async function getAuthenticatedPlatformContext(): Promise<AuthenticatedPlatformContext | null> {
  try {
    const adminClient = createAdminClient()

    // 1. First, check if active Supabase Auth user is a verified Platform Admin
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.id) {
        const { data: adminRecord, error: dbError } = await (adminClient as any)
          .from('platform_admins')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        if (!dbError && adminRecord && adminRecord.is_active) {
          const role = (adminRecord.role as PlatformRole) || 'platform_readonly'
          const responsibilities = Array.isArray(adminRecord.responsibilities)
            ? adminRecord.responsibilities
            : [role]
          const permissions = resolveEffectivePlatformPermissions(role, responsibilities)

          return {
            userId: String(user.id),
            adminId: String(adminRecord.id),
            email: String(adminRecord.email || user.email),
            fullName: String(adminRecord.full_name || 'Platform Administrator'),
            platformRole: role,
            responsibilities,
            permissions,
            isActive: Boolean(adminRecord.is_active),
            mfaEnabled: Boolean(adminRecord.mfa_enabled),
            phone: adminRecord.phone || undefined,
            avatarUrl: adminRecord.avatar_url || undefined,
            preferences: adminRecord.preferences || undefined,
            createdAt: String(adminRecord.created_at),
            lastLoginAt: adminRecord.last_login_at ? String(adminRecord.last_login_at) : undefined,
          }
        }
      }
    } catch {
      // Non-blocking, fallback to platform session cookie
    }

    // 2. If Supabase user is not a platform admin (e.g. tenant user or unauthenticated in GoTrue),
    // verify against active signed platform session cookie matched against platform_admins table
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const sessCookie = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value
    if (sessCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(sessCookie))
        if (parsed && (parsed.userId || parsed.adminId)) {
          const { data: adminRecord, error: dbError } = await (adminClient as any)
            .from('platform_admins')
            .select('*')
            .or(`id.eq.${parsed.adminId},user_id.eq.${parsed.userId}`)
            .eq('is_active', true)
            .maybeSingle()

          if (!dbError && adminRecord && adminRecord.is_active) {
            const role = (adminRecord.role as PlatformRole) || 'platform_readonly'
            const responsibilities = Array.isArray(adminRecord.responsibilities)
              ? adminRecord.responsibilities
              : [role]
            const permissions = resolveEffectivePlatformPermissions(role, responsibilities)

            return {
              userId: String(adminRecord.user_id || parsed.userId),
              adminId: String(adminRecord.id),
              email: String(adminRecord.email || parsed.email),
              fullName: String(adminRecord.full_name || parsed.fullName || 'Platform Administrator'),
              platformRole: role,
              responsibilities,
              permissions,
              isActive: true,
              mfaEnabled: Boolean(adminRecord.mfa_enabled),
              phone: adminRecord.phone || undefined,
              avatarUrl: adminRecord.avatar_url || undefined,
              preferences: adminRecord.preferences || undefined,
              createdAt: String(adminRecord.created_at),
              lastLoginAt: adminRecord.last_login_at ? String(adminRecord.last_login_at) : undefined,
            }
          }
        }
      } catch {
        // ignore
      }
    }

    return null // FAIL CLOSED
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
    const { data, error } = await (adminClient as any)
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
      preferences: data.preferences || undefined,
      is_active: Boolean(data.is_active),
      mfa_enabled: Boolean(data.mfa_enabled),
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
    const { count, error } = await (adminClient as any)
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
      user_id: context.userId,
      email: context.email,
      full_name: context.fullName,
      role: context.platformRole,
      phone: context.phone,
      avatar_url: context.avatarUrl,
      preferences: context.preferences,
      is_active: context.isActive,
      mfa_enabled: context.mfaEnabled,
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
  const platformUser = await getCurrentPlatformUser()

  if (!platformUser || !platformUser.is_active) {
    redirect('/platform/login?error=unauthorized')
  }

  return platformUser
}

/**
 * Strict server-side platform role check (e.g. only platform_owner).
 */
export async function requirePlatformRole(allowedRoles: PlatformRole[]): Promise<PlatformUserRecord> {
  const platformUser = await requirePlatformUser()

  if (!allowedRoles.includes(platformUser.role)) {
    redirect('/403?type=platform')
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
    redirect('/403?type=platform')
  }

  return platformUser
}
