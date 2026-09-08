// ==============================================================================
// PrintERP SaaS - Tenant Authorization Utilities (Server-Side)
// Guards all tenant operations against cross-tenant data access.
// Never trusts client-side company_id without database membership verification.
// ==============================================================================

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TenantContext, TenantRole, TenantSessionData, TENANT_SESSION_COOKIE } from './types'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { DEFAULT_ROLE_MATRICES, checkPermission } from '@/lib/auth/rbac.client'
import { PrimaryRole, MODULE_ACTION_SPECS } from '@/types/rbac.types'
import { CompanyUserWithProfile } from '@/types/tenant.types'
import { PlatformTenantCompany } from '@/types/platform.types'
import { getCurrentPlatformUser } from './platform-auth'

const SUPPORT_COOKIE_NAME = 'printerp_support_tenant'

/**
 * Resolves verified tenant context for the currently authenticated user.
 */
export async function getCurrentTenant(requestedSlugOrId?: string): Promise<TenantContext | null> {
  try {
    const cookieStore = await cookies()

    // 1. Check for Platform Support Mode cookie if platform admin is viewing as tenant
    const supportSessionCookie = cookieStore.get(SUPPORT_COOKIE_NAME)?.value
    if (supportSessionCookie) {
      try {
        const supportSession = JSON.parse(supportSessionCookie)
        const platformUser = await getCurrentPlatformUser()
        if (platformUser && platformUser.is_active) {
          return {
            userId: platformUser.user_id,
            userEmail: platformUser.email,
            fullName: platformUser.full_name,
            companyId: supportSession.targetCompanyId,
            companySlug: supportSession.targetCompanySlug,
            companyName: supportSession.targetCompanyName,
            companyRole: 'business_owner',
            primaryRole: 'business_owner',
            permissions: ['*'],
            isSupportMode: true,
          }
        }
      } catch {
        // Invalid support cookie
      }
    }

    // 2. Check for explicit Tenant Session Cookie (Local dev / SSR / Fast path)
    const tenantSessionRaw = cookieStore.get(TENANT_SESSION_COOKIE)?.value
    if (tenantSessionRaw) {
      try {
        const session: TenantSessionData = JSON.parse(decodeURIComponent(tenantSessionRaw))
        if (session && session.userId && session.userEmail) {
          // Verify user status has not been disabled
          const users =
            PrintERPDataStore.get<CompanyUserWithProfile[]>(STORAGE_KEYS.COMPANY_USERS) || []

          const liveUser = users.find(
            (u) =>
              u.user_id === session.userId ||
              u.profile?.email.toLowerCase() === session.userEmail.toLowerCase()
          )

          if (liveUser && liveUser.status === 'disabled') {
            return null
          }

          // Cross-tenant verification: check company boundary
          if (
            requestedSlugOrId &&
            session.companySlug !== requestedSlugOrId &&
            session.companyId !== requestedSlugOrId
          ) {
            return null // Reject cross-tenant access!
          }

          // Calculate effective permissions considering user overrides
          let permissions: string[] = []
          const isOwner = session.role === 'business_owner' || session.primaryRole === 'business_owner'
          if (isOwner) {
            permissions = ['*']
          } else {
            const userCtx = {
              userId: session.userId,
              role: session.role,
              primaryRole: session.primaryRole,
              responsibilities: liveUser?.responsibilities || session.responsibilities || [session.role],
              overrides: liveUser?.overrides || {},
            }

            for (const [mod, spec] of Object.entries(MODULE_ACTION_SPECS)) {
              for (const act of spec.actions) {
                if (checkPermission(userCtx, `${mod}.${act}`)) {
                  permissions.push(`${mod}.${act}`)
                }
              }
            }
          }

          return {
            userId: session.userId,
            userEmail: session.userEmail,
            fullName: session.fullName,
            fullNameBn: session.fullNameBn,
            phone: session.phone,
            companyId: session.companyId,
            companySlug: session.companySlug,
            companyName: session.companyName,
            companyNameBn: session.companyNameBn || session.companyName,
            companyRole: session.role,
            primaryRole: session.primaryRole,
            branchId: session.branchId,
            branchName: session.branchName,
            responsibilities: liveUser?.responsibilities || session.responsibilities || [session.role],
            permissions,
          }
        }
      } catch {
        // Invalid tenant cookie format
      }
    }

    // 3. Query Supabase Auth Session
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Find matching user profile & company membership
      const users =
        PrintERPDataStore.get<CompanyUserWithProfile[]>(STORAGE_KEYS.COMPANY_USERS) || []

      const userMatch = users.find(
        (u) =>
          u.user_id === user.id ||
          u.profile?.email.toLowerCase() === (user.email || '').toLowerCase()
      )

      if (userMatch) {
        if (userMatch.status === 'disabled') {
          return null
        }

        const platformCompanies =
          PrintERPDataStore.get<PlatformTenantCompany[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []

        const comp = platformCompanies.find((c) => c.id === userMatch.company_id || c.slug === userMatch.company_id)

        if (comp) {
          // Cross-tenant boundary check
          if (
            requestedSlugOrId &&
            comp.slug !== requestedSlugOrId &&
            comp.id !== requestedSlugOrId
          ) {
            return null
          }

          const roleObj = userMatch.roles?.[0]
          let role: TenantRole = 'business_owner'
          let primaryRole: PrimaryRole = 'business_owner'

          if (roleObj?.slug === 'manager' || roleObj?.slug === 'sales') {
            role = 'sales_manager'
            primaryRole = 'sales_manager'
          } else if (roleObj?.slug === 'designer') {
            role = 'graphic_designer'
            primaryRole = 'designer'
          } else if (roleObj?.slug === 'operator') {
            role = 'machine_operator'
            primaryRole = 'operator'
          } else if (roleObj?.slug === 'accountant') {
            role = 'accountant'
            primaryRole = 'general_staff'
          } else if (roleObj?.slug === 'installer') {
            role = 'delivery_coordinator'
            primaryRole = 'general_staff'
          }

          let permissions: string[] = []
          if (primaryRole === 'business_owner') {
            permissions = ['*']
          } else {
            const userCtx = {
              userId: user.id,
              role,
              primaryRole,
              responsibilities: userMatch.responsibilities || (roleObj ? [roleObj.slug || roleObj.name] : [primaryRole]),
              overrides: userMatch.overrides || {},
            }
            for (const [mod, spec] of Object.entries(MODULE_ACTION_SPECS)) {
              for (const act of spec.actions) {
                if (checkPermission(userCtx, `${mod}.${act}`)) {
                  permissions.push(`${mod}.${act}`)
                }
              }
            }
          }

          return {
            userId: user.id,
            userEmail: user.email || userMatch.profile?.email || '',
            fullName: userMatch.profile?.full_name,
            fullNameBn: userMatch.profile?.full_name_bn,
            phone: userMatch.profile?.phone,
            companyId: comp.id,
            companySlug: comp.slug,
            companyName: comp.name,
            companyNameBn: (comp as any).name_bn || comp.name,
            companyRole: role,
            primaryRole,
            branchId: userMatch.branch_id,
            branchName: userMatch.branch?.name,
            responsibilities: userMatch.responsibilities || (roleObj ? [roleObj.name] : []),
            permissions,
          }
        }
      }

      // Production Supabase company_users table check
      const adminClient = createAdminClient()
      const { data: membership, error } = await (adminClient as any)
        .from('company_users')
        .select('id, company_id, branch_id, role, status, companies!inner(id, name, slug, is_active)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (!error && membership && (membership as any).companies?.is_active) {
        const comp = membership.companies as any
        if (
          requestedSlugOrId &&
          comp.slug !== requestedSlugOrId &&
          comp.id !== requestedSlugOrId
        ) {
          return null
        }

        return {
          userId: user.id,
          userEmail: user.email || '',
          companyId: comp.id,
          companySlug: comp.slug,
          companyName: comp.name,
          companyNameBn: comp.name_bn || comp.name,
          companyRole: (membership.role as TenantRole) || 'business_owner',
          branchId: membership.branch_id,
          permissions: ['*'],
        }
      }
    }

    return null
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

  // Business owners and platform support mode bypass individual permission checks
  if (tenant.companyRole === 'business_owner' || tenant.isSupportMode || tenant.primaryRole === 'business_owner') {
    return tenant
  }

  // Check specific permission against effective permissions list
  const hasPerm =
    tenant.permissions.includes('*') ||
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
  if (!tenant?.companySlug) {
    redirect('/login')
  }
  return tenant.companySlug
}


