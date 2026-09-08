// ==============================================================================
// PrintERP SaaS - Platform Authorization Utilities (Server-Side)
// Guards all /platform/* operations against unauthorized tenant users.
// ==============================================================================

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PlatformRole, PlatformUserRecord, PLATFORM_SESSION_COOKIE, PlatformSessionData } from './types'

export { PLATFORM_SESSION_COOKIE }

/**
 * Validates whether the given email or user ID belongs to an active platform administrator.
 */
export async function getPlatformUser(userIdOrEmail?: string): Promise<PlatformUserRecord | null> {
  if (!userIdOrEmail) return null

  // Query production Supabase platform_admins table
  try {
    const adminClient = createAdminClient()
    const { data, error } = await (adminClient as any)
      .from('platform_admins')
      .select('*')
      .or(`email.eq.${userIdOrEmail},user_id.eq.${userIdOrEmail}`)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) return null

    return {
      id: String(data.id),
      user_id: String(data.user_id),
      email: String(data.email),
      full_name: String(data.full_name),
      role: (data.role as PlatformRole) || 'platform_support',
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
 * Retrieves the current authenticated platform user from session cookies or Supabase auth.
 */
export async function getCurrentPlatformUser(): Promise<PlatformUserRecord | null> {
  try {
    // 1. Check for platform session cookie first
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value
    
    if (sessionCookie) {
      try {
        const sessionData: PlatformSessionData = JSON.parse(sessionCookie)
        if (sessionData && (sessionData.email || sessionData.userId)) {
          const user = await getPlatformUser(sessionData.email || sessionData.userId)
          if (user && user.is_active) {
            return user
          }
        }
      } catch {
        // Corrupted session cookie
      }
    }

    // 2. Check Supabase authenticated user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const platformUser = await getPlatformUser(user.email || user.id)
      if (platformUser && platformUser.is_active) {
        return platformUser
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Strict server-side platform guard.
 * Must be called in Platform Server Components and Server Actions.
 * Throws 403 or redirects to /platform/login if the user is not a platform administrator.
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
 * Checks if a platform user has permission for a specific platform action.
 */
export function hasPlatformPermission(user: PlatformUserRecord, action: string): boolean {
  if (!user.is_active) return false
  if (user.role === 'platform_owner') return true

  if (user.role === 'platform_admin') {
    return !action.startsWith('platform.owner_only')
  }

  if (user.role === 'platform_finance') {
    return (
      action.startsWith('subscription.') ||
      action.startsWith('billing.') ||
      action.startsWith('plan.') ||
      action.startsWith('company.view') ||
      action.startsWith('audit.view')
    )
  }

  if (user.role === 'platform_operations') {
    return (
      action.startsWith('system.') ||
      action.startsWith('job.') ||
      action.startsWith('incident.') ||
      action.startsWith('integration.') ||
      action.startsWith('company.view') ||
      action.startsWith('audit.view')
    )
  }

  if (user.role === 'platform_support') {
    return (
      action.startsWith('company.view') ||
      action.startsWith('company.support_access') ||
      action.startsWith('system.view') ||
      action.startsWith('audit.view')
    )
  }

  if (user.role === 'platform_readonly') {
    return action.endsWith('.view') || action.startsWith('view.')
  }

  return false
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
