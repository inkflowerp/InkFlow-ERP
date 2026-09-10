// ==============================================================================
// PrintERP / InkFlow SaaS - Tenant Authorization Utilities (Server-Side)
// Authoritative Supabase Auth & PostgreSQL verification.
// Guards all tenant operations against cross-tenant data access.
// ==============================================================================

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TenantContext, TenantRole, TenantSessionData, TENANT_SESSION_COOKIE } from './types'
import { TenantRepository } from '@/lib/repositories/tenant.repository'
import { getCurrentPlatformUser } from './platform-auth'
import { MODULE_ACTION_SPECS } from '@/types/rbac.types'

const SUPPORT_COOKIE_NAME = 'printerp_support_tenant'

/**
 * Resolves verified tenant context for the currently authenticated user from Supabase.
 */
export async function getCurrentTenant(requestedSlugOrId?: string): Promise<TenantContext | null> {
  try {
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

    // 2. Query Authoritative Supabase Auth Session
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let resolvedUserId = user?.id
    if (!resolvedUserId) {
      const sessionCookie = cookieStore.get(TENANT_SESSION_COOKIE)?.value
      if (sessionCookie) {
        try {
          const sessionData = JSON.parse(decodeURIComponent(sessionCookie))
          if (sessionData && sessionData.userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionData.userId)) {
            resolvedUserId = sessionData.userId
          }
        } catch {
          // Ignore
        }
      }
    }

    if (!resolvedUserId) {
      // Unauthenticated user -> Strictly return null
      return null
    }

    // Hard Security Boundary: Platform Administrator accounts cannot resolve tenant context as a tenant user
    const adminClient = createAdminClient()
    const { data: platformAdmin } = await (adminClient as any)
      .from('platform_admins')
      .select('id')
      .eq('user_id', resolvedUserId)
      .eq('is_active', true)
      .maybeSingle()

    if (platformAdmin) {
      return null
    }

    const membership = await TenantRepository.resolveUserMembership(resolvedUserId, requestedSlugOrId)
    if (!membership) {
      // User is authenticated, but has no active membership in requested tenant
      return null
    }

    const { company, companyUser, effectivePermissions, primaryRole } = membership

    // Validate tenant boundary if requested
    if (
      requestedSlugOrId &&
      company.slug !== requestedSlugOrId &&
      company.id !== requestedSlugOrId
    ) {
      return null
    }

    return {
      userId: resolvedUserId,
      userEmail: user?.email || companyUser.profile?.email || '',
      fullName: companyUser.profile?.full_name || user?.email?.split('@')[0] || 'User',
      fullNameBn: companyUser.profile?.full_name_bn || null,
      phone: companyUser.profile?.phone || null,
      companyId: company.id,
      companySlug: company.slug,
      companyName: company.name,
      companyNameBn: company.name_bn || company.name,
      companyRole: (companyUser.roles?.[0]?.slug as TenantRole) || (primaryRole as TenantRole) || 'business_owner',
      primaryRole: primaryRole as any,
      branchId: companyUser.branch_id || undefined,
      branchName: companyUser.branch?.name,
      responsibilities: companyUser.responsibilities || [primaryRole],
      permissions: effectivePermissions,
    }
  } catch {
    return null
  }
}

/**
 * Strict server-side guard for tenant routes (e.g. /app/* or /[tenantSlug]/*).
 * Throws redirect to /login or /403 if user lacks access to this tenant.
 */
export async function requireTenantUser(requestedSlugOrId?: string): Promise<TenantContext> {
  const tenantContext = await getCurrentTenant(requestedSlugOrId)

  if (!tenantContext) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect(`/login${requestedSlugOrId ? `?redirectTo=/${requestedSlugOrId}/dashboard` : ''}`)
    } else {
      // Authenticated user exists but does NOT have membership in this tenant
      redirect('/403?type=tenant')
    }
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
    redirect(`/403?type=tenant&missing=${requiredPermission}`)
  }

  return tenant
}

/**
 * Verifies if user has access to a specific branch scope
 */
export function hasBranchAccess(
  userBranchId: string | null | undefined,
  targetBranchId: string | null | undefined,
  isOwnerOrAdmin: boolean = false
): boolean {
  if (isOwnerOrAdmin || !targetBranchId || !userBranchId) return true
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

  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(TENANT_SESSION_COOKIE)?.value
    if (sessionCookie) {
      const parsed = JSON.parse(sessionCookie)
      if (parsed?.companySlug) return parsed.companySlug
    }

    const supportCookie = cookieStore.get(SUPPORT_COOKIE_NAME)?.value
    if (supportCookie) {
      const parsed = JSON.parse(supportCookie)
      if (parsed?.targetCompanySlug) return parsed.targetCompanySlug
    }

    const companies = await TenantRepository.getAllCompanies()
    if (companies && companies.length > 0 && companies[0].slug) {
      return companies[0].slug
    }
  } catch {
    // fallback gracefully
  }

  redirect('/login')
}
