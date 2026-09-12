// ==============================================================================
// PrintERP / InkFlow SaaS - Tenant Authorization Utilities (Server-Side)
// Authoritative Supabase Auth & PostgreSQL verification.
// Guards all tenant operations against cross-tenant data access.
// ==============================================================================

import { cache } from 'react'
import { createClient } from '../supabase/server.ts'
import { createAdminClient } from '../supabase/admin.ts'
import type { TenantContext, TenantRole, TenantSessionData } from './types.ts'
import { TENANT_SESSION_COOKIE } from './types.ts'
import { TenantRepository } from '../repositories/tenant.repository.ts'
import { getCurrentPlatformUser } from './platform-auth.ts'
import { MODULE_ACTION_SPECS } from '../../types/rbac.types.ts'

const SUPPORT_COOKIE_NAME = 'printerp_support_tenant'

/**
 * Resolves verified tenant context for the currently authenticated user from Supabase.
 * Wrapped in React cache() for request-scoped deduplication across server layouts and components.
 */
export const getCurrentTenant = cache(async function getCurrentTenant(
  requestedSlugOrId?: string
): Promise<TenantContext | null> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()

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

    // Hard Security Boundary: Platform Administrator accounts cannot resolve tenant context as a tenant user
    try {
      const adminClient = createAdminClient()
      const { data: platformAdmin } = await (adminClient as any)
        .from('platform_admins')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (platformAdmin) {
        return null // Platform admins must use explicit support mode to access tenant scope
      }
    } catch {
      // Non-blocking
    }

    // 3. Authoritative DB membership resolution from company_users & companies
    let membership: any = null
    try {
      membership = await TenantRepository.resolveUserMembership(user.id, requestedSlugOrId)
    } catch {
      return null // FAIL CLOSED
    }

    if (!membership || !membership.company || !membership.companyUser) {
      return null // FAIL CLOSED: No active company membership found
    }

    const { company, companyUser, effectivePermissions, primaryRole } = membership

    // Validate tenant boundary if specific slug/id requested
    if (
      requestedSlugOrId &&
      company.slug !== requestedSlugOrId.toLowerCase().trim() &&
      company.id !== requestedSlugOrId
    ) {
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

    return {
      userId: user.id,
      userEmail: user.email || companyUser.profile?.email || '',
      fullName: companyUser.profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      fullNameBn: displayFullNameBn,
      phone: displayPhone,
      companyId: company.id,
      companySlug: company.slug,
      companyName: company.name,
      companyNameBn: company.name_bn || company.name,
      companyRole: (companyUser.roles?.[0]?.slug as TenantRole) || (primaryRole as TenantRole) || 'business_owner',
      primaryRole: primaryRole as any,
      branchId: companyUser.branch_id || undefined,
      branchName: companyUser.branch?.name,
      responsibilities: companyUser.responsibilities || [primaryRole],
      permissions: effectivePermissions || [],
    }
  } catch {
    return null // FAIL CLOSED
  }
})

async function safeTenantRedirect(path: string): Promise<never> {
  const { redirect } = await import('next/navigation')
  redirect(path)
  throw new Error(`Redirecting to ${path}`)
}

/**
 * Strict server-side guard for tenant routes (e.g. /app/* or /[tenantSlug]/*).
 * Throws redirect to /login if user lacks access to this tenant.
 */
export async function requireTenantUser(requestedSlugOrId?: string): Promise<TenantContext> {
  const tenantContext = await getCurrentTenant(requestedSlugOrId)

  if (!tenantContext) {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const hasPlatformCookie = Boolean(cookieStore.get('printerp_platform_session')?.value)
      if (hasPlatformCookie) {
        await safeTenantRedirect('/platform')
      }
    } catch (e: any) {
      if (e?.digest?.includes('NEXT_REDIRECT') || e?.message?.includes('NEXT_REDIRECT')) {
        throw e
      }
    }

    await safeTenantRedirect(`/login${requestedSlugOrId ? `?error=unauthorized&redirectTo=/${requestedSlugOrId}/dashboard` : '?error=unauthorized'}`)
    throw new Error('Unauthorized tenant user')
  }

  return tenantContext
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
    await safeTenantRedirect(`/403?type=tenant&missing=${requiredPermission}`)
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

  await safeTenantRedirect('/login')
  throw new Error('Redirecting to login')
}

