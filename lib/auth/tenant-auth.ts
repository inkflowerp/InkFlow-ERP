// ==============================================================================
// PrintERP / InkFlow SaaS - Tenant Authorization Utilities (Server-Side)
// Authoritative Supabase Auth & PostgreSQL verification.
// Guards all tenant operations against cross-tenant data access.
// ==============================================================================

import { cache } from 'react'
import { createClient } from '../supabase/server.ts'
import { createAdminClient } from '../supabase/admin.ts'
import { resolveTenantRole, type TenantContext, type TenantRole, type TenantSessionData } from './types.ts'
import { TENANT_SESSION_COOKIE } from './types.ts'
import { TenantRepository } from '../repositories/tenant.repository.ts'
import { getCurrentPlatformUser } from './platform-auth.ts'
import { MODULE_ACTION_SPECS } from '../../types/rbac.types.ts'

async function performRedirect(url: string): Promise<never> {
  try {
    const nav = await import('next/navigation')
    if (typeof nav?.redirect === 'function') {
      nav.redirect(url)
    }
  } catch (error: any) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.startsWith('NEXT_REDIRECT')
    ) {
      throw error
    }
    throw new Error(`REDIRECT:${url}`)
  }
  throw new Error(`REDIRECT:${url}`)
}

const SUPPORT_COOKIE_NAME = 'printerp_support_tenant'

// High-speed in-memory short-lived cache for concurrent server action deduplication
const platformAdminCheckCache = new Map<string, { isAdmin: boolean; expiresAt: number }>()
const tenantContextCache = new Map<string, { context: TenantContext | null; expiresAt: number }>()

export function invalidateTenantAuthCache(userId?: string) {
  if (userId) {
    platformAdminCheckCache.delete(userId)
    for (const key of tenantContextCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        tenantContextCache.delete(key)
      }
    }
    TenantRepository.invalidateMembershipCache(userId)
  } else {
    platformAdminCheckCache.clear()
    tenantContextCache.clear()
    TenantRepository.invalidateMembershipCache()
  }
}

/**
 * Resolves verified tenant context for the currently authenticated user from Supabase.
 * Wrapped in React cache() for request-scoped deduplication across server layouts and components,
 * with fast-path in-memory TTL caching for concurrent server actions.
 */
export const getCurrentTenant = cache(async function getCurrentTenant(
  requestedSlugOrId?: string
): Promise<TenantContext | null> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()

    // 0. Resolve targetSlugOrId from argument or incoming request headers
    let targetSlugOrId = requestedSlugOrId
    if (targetSlugOrId === 'c-01' || targetSlugOrId === 'default' || targetSlugOrId === 'all') {
      targetSlugOrId = undefined
    }
    if (!targetSlugOrId) {
      try {
        const { headers } = await import('next/headers')
        const headerStore = await headers()
        const headerSlug = headerStore.get('x-tenant-slug')
        if (headerSlug && headerSlug !== 'c-01' && headerSlug !== 'default') {
          targetSlugOrId = headerSlug
        }
      } catch {}
    }

    // 1. Check for Platform Support Mode session if platform admin is viewing as tenant
    const supportSessionCookie = cookieStore.get(SUPPORT_COOKIE_NAME)?.value
    if (supportSessionCookie) {
      try {
        const supportSession = JSON.parse(supportSessionCookie)
        const platformUser = await getCurrentPlatformUser()

        if (platformUser && platformUser.is_active && supportSession.targetCompanyId && supportSession.sessionId) {
          const now = new Date().getTime()
          const adminClient = createAdminClient()

          // Authoritative DB verification for support session (Strict Fail-Closed)
          const { data: dbSession, error: sessErr } = await (adminClient as any)
            .from('platform_support_sessions')
            .select('id, platform_admin_id, company_id, status, expires_at, access_level')
            .eq('id', supportSession.sessionId)
            .eq('company_id', supportSession.targetCompanyId)
            .maybeSingle()

          if (!sessErr && dbSession && dbSession.status === 'active') {
            const expiresAtMs = new Date(dbSession.expires_at).getTime()
            if (expiresAtMs > now && dbSession.platform_admin_id === platformUser.id) {
              const company = await TenantRepository.getCompanyById(supportSession.targetCompanyId)
              if (company && company.is_active) {
                // Least privilege: Support users get capabilities scoped to granted access level
                const accessLevel = dbSession.access_level || supportSession.accessLevel || 'read_only'
                const supportPerms: string[] = []

                for (const [mod, spec] of Object.entries(MODULE_ACTION_SPECS)) {
                  for (const act of spec.actions) {
                    if (accessLevel === 'full_support') {
                      supportPerms.push(`${mod}.${act}`)
                    } else if (accessLevel === 'config_only') {
                      if (mod === 'settings' || act === 'view') {
                        supportPerms.push(`${mod}.${act}`)
                      }
                    } else {
                      // read_only default: view only
                      if (act === 'view') {
                        supportPerms.push(`${mod}.${act}`)
                      }
                    }
                  }
                }

                return {
                  userId: platformUser.user_id,
                  userEmail: platformUser.email,
                  fullName: `${platformUser.full_name} (Platform Support)`,
                  companyId: company.id,
                  companySlug: company.slug,
                  companyName: company.name,
                  companyNameBn: company.name_bn || company.name,
                  companyRole: 'business_owner',
                  primaryRole: 'business_owner',
                  permissions: supportPerms,
                  isSupportMode: true,
                }
              }
            }
          }
        }
      } catch {
        // Invalid support cookie format -> Fail closed
      }
    }

    // 2. Query Authoritative Supabase Auth Session (Mandatory)
    let user: any = null
    try {
      const supabase = await createClient()
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError || !data?.user?.id) {
        return null // FAIL CLOSED: Unauthenticated in Supabase
      }
      user = data.user
    } catch {
      return null // FAIL CLOSED: Supabase client unavailable
    }

    if (!user?.id) {
      return null // FAIL CLOSED
    }

    // Fast-path in-memory tenant context check
    const contextCacheKey = `${user.id}:${targetSlugOrId || 'any'}`
    const cachedContext = tenantContextCache.get(contextCacheKey)
    if (cachedContext && cachedContext.expiresAt > Date.now()) {
      return cachedContext.context
    }

    // Hard Security Boundary: Platform Administrator accounts cannot resolve tenant context as a tenant user
    const adminCheck = platformAdminCheckCache.get(user.id)
    if (adminCheck && adminCheck.expiresAt > Date.now()) {
      if (adminCheck.isAdmin) {
        return null
      }
    } else {
      try {
        const adminClient = createAdminClient()
        const { data: platformAdmin } = await (adminClient as any)
          .from('platform_admins')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        const isAdmin = Boolean(platformAdmin)
        platformAdminCheckCache.set(user.id, {
          isAdmin,
          expiresAt: Date.now() + 60000,
        })

        if (isAdmin) {
          return null // Platform admins must use explicit support mode to access tenant scope
        }
      } catch {
        // Non-blocking
      }
    }

    // 3. Authoritative DB membership resolution from company_users & companies
    let membership: any = null
    try {
      membership = await TenantRepository.resolveUserMembership(user.id, targetSlugOrId)
    } catch {
      return null // FAIL CLOSED
    }

    if (!membership || !membership.company || !membership.companyUser) {
      tenantContextCache.set(contextCacheKey, { context: null, expiresAt: Date.now() + 5000 })
      return null // FAIL CLOSED: No active company membership found
    }

    const { company, companyUser, effectivePermissions, primaryRole } = membership

    // Validate tenant boundary if specific slug/id requested
    if (
      targetSlugOrId &&
      targetSlugOrId !== 'c-01' &&
      targetSlugOrId !== 'default' &&
      targetSlugOrId !== 'all' &&
      company.slug !== targetSlugOrId.toLowerCase().trim() &&
      company.id !== targetSlugOrId
    ) {
      tenantContextCache.set(contextCacheKey, { context: null, expiresAt: Date.now() + 5000 })
      return null // FAIL CLOSED: Access to non-member company denied
    }

    // Optional auxiliary cookie session data for display preferences only
    let displayPhone = companyUser.profile?.phone || null
    let displayFullNameBn = companyUser.profile?.full_name_bn || null
    try {
      const sessionCookie = cookieStore.get(TENANT_SESSION_COOKIE)?.value
      if (sessionCookie) {
        const parsed = JSON.parse(decodeURIComponent(sessionCookie))
        if (parsed && (parsed.userId === user.id || parsed.userEmail === user.email)) {
          if (parsed.phone) displayPhone = parsed.phone
          if (parsed.fullNameBn) displayFullNameBn = parsed.fullNameBn
        }
      }
    } catch {
      // Non-blocking
    }

    const tenantCtx: TenantContext = {
      userId: user.id,
      userEmail: user.email || companyUser.profile?.email || '',
      fullName: companyUser.profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      fullNameBn: displayFullNameBn,
      phone: displayPhone,
      companyId: company.id,
      companySlug: company.slug,
      companyName: company.name,
      companyRole: resolveTenantRole(
        (companyUser.roles?.[0]?.slug as string) || primaryRole,
        companyUser.responsibilities,
        company.owner_id === user.id || primaryRole === 'business_owner'
      ),
      branchId: companyUser.branch_id || undefined,
      branchName: companyUser.branch?.name,
      responsibilities: companyUser.responsibilities || [primaryRole],
      permissions: effectivePermissions || [],
    }

    // Cache verified tenant context for 30s
    tenantContextCache.set(contextCacheKey, {
      context: tenantCtx,
      expiresAt: Date.now() + 30000,
    })

    return tenantCtx
  } catch {
    return null // FAIL CLOSED
  }
})

/**
 * Strict server-side guard for tenant routes (e.g. /app/* or /[tenantSlug]/*).
 * Throws redirect to /login or 403 if user lacks access to this tenant.
 */
export async function requireTenantUser(requestedSlugOrId?: string): Promise<TenantContext> {
  let targetSlug = requestedSlugOrId
  let isSubdomain = false

  try {
    const { headers } = await import('next/headers')
    const headerStore = await headers()
    const headerSlug = headerStore.get('x-tenant-slug')
    if (headerSlug && !targetSlug) {
      targetSlug = headerSlug
    }
    const headerHost = headerStore.get('x-tenant-hostname') || headerStore.get('host')
    if (headerHost) {
      const { resolveHostname } = await import('../tenant/tenant-resolution.ts')
      const resolution = resolveHostname(headerHost)
      if (resolution.hostType === 'tenant') {
        isSubdomain = true
        if (!targetSlug && resolution.tenantSlug) {
          targetSlug = resolution.tenantSlug
        }
      }
    }
  } catch {}

  const tenant = await getCurrentTenant(targetSlug)

  if (!tenant) {
    let hasPlatformCookie = false
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      hasPlatformCookie = Boolean(cookieStore.get('printerp_platform_session')?.value)
    } catch {}

    if (hasPlatformCookie) {
      await performRedirect('/platform')
    }

    // Verify if workspace actually exists and is active
    if (targetSlug) {
      try {
        const company = await TenantRepository.getCompanyBySlug(targetSlug)
        if (!company) {
          await performRedirect(`/tenant-not-found?slug=${encodeURIComponent(targetSlug)}`)
          throw new Error('Tenant Not Found')
        }
        if (company.is_active === false) {
          await performRedirect(`/tenant-suspended?slug=${encodeURIComponent(targetSlug)}`)
          throw new Error('Tenant Suspended')
        }
      } catch (err: any) {
        if (err?.message?.startsWith('REDIRECT:') || err?.digest?.startsWith('NEXT_REDIRECT')) {
          throw err
        }
        // Fall through if lookup error
      }
    }

    // Check if the user is authenticated in Supabase but lacks access to THIS tenant (Cross-tenant access attempt)
    let isUserLoggedIn = false
    try {
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser()
      isUserLoggedIn = Boolean(data?.user?.id)
    } catch {}

    if (isUserLoggedIn && targetSlug) {
      // 403 Forbidden: User is logged in to PrintERP but does not have active membership in targetSlug
      await performRedirect(`/403?type=tenant&tenant=${encodeURIComponent(targetSlug)}`)
      throw new Error('Forbidden: Cross-Tenant Access Denied')
    }

    const redirectPath = '/dashboard'
    await performRedirect(
      `/login?error=unauthorized&redirectTo=${encodeURIComponent(redirectPath)}`
    )
    throw new Error('Unauthorized')
  }

  return tenant
}

/**
 * Resolves verified company ID for the currently authenticated tenant user.
 */
export async function getTenantCompanyId(requestedSlugOrId?: string): Promise<string> {
  const tenant = await requireTenantUser(requestedSlugOrId)
  return tenant.companyId
}

/**
 * Validates whether the user has the required permission within their verified tenant.
 */
export async function requireTenantPermission(
  companyId: string,
  requiredPermission: string
): Promise<TenantContext> {
  const tenant = await requireTenantUser(companyId)

  // Check specific permission against effective permissions list
  const hasPerm =
    tenant.companyRole === 'business_owner' ||
    tenant.primaryRole === 'business_owner' ||
    tenant.isSupportMode ||
    tenant.permissions.includes(requiredPermission) ||
    tenant.permissions.includes(requiredPermission.split('.')[0] + '.full_control')

  if (!hasPerm) {
    await performRedirect(`/403?type=tenant&missing=${requiredPermission}`)
    throw new Error('Forbidden')
  }

  return tenant
}

/**
 * Verifies if user has access to a specific branch scope.
 * FAILS CLOSED: Unassigned branch users are denied access to branch-scoped resources.
 */
export function hasBranchAccess(
  userBranchId: string | null | undefined,
  targetBranchId: string | null | undefined,
  isOwnerOrAdmin: boolean = false
): boolean {
  if (isOwnerOrAdmin) return true
  if (!targetBranchId) return true // Unscoped resource: accessible subject to company-level permissions
  if (!userBranchId) return false // User has no assigned branch: denied for branch-scoped resource
  return userBranchId === targetBranchId
}

/**
 * Resolves the authenticated user's tenant slug for dynamic root redirects.
 */
export async function getTenantRedirectSlug(): Promise<string> {
  const tenant = await getCurrentTenant()
  if (tenant?.companySlug) {
    return tenant.companySlug
  }

  await performRedirect('/login')
  throw new Error('Unauthorized')
}


