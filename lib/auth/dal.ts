import 'server-only'

import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '../supabase/server.ts'
import { resolveTenant } from '../tenant/tenant-resolution.ts'
import { TenantRepository } from '../repositories/tenant.repository.ts'
import type { CompanyRow, CompanyUserWithProfile } from '../../types/tenant.types.ts'
import type { PrimaryRole } from '../../types/rbac.types.ts'

async function performRedirect(url: string): Promise<never> {
  try {
    const nav: any = await import('next/navigation.js').catch(() => import('next/navigation'))
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

async function getRequestHeaders(): Promise<Headers | null> {
  try {
    const nextHeaders: any = await import('next/headers.js').catch(() => import('next/headers'))
    if (typeof nextHeaders?.headers === 'function') {
      return await nextHeaders.headers()
    }
  } catch {}
  return null
}

export class UnauthorizedError extends Error {
  constructor(message = 'Access forbidden: insufficient permissions') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class TenantNotFoundError extends Error {
  constructor(message = 'Tenant not found or inactive') {
    super(message)
    this.name = 'TenantNotFoundError'
  }
}

export interface TenantMemberContext {
  user: User
  tenant: CompanyRow
  membership: CompanyUserWithProfile
  permissions: string[]
  role: string
}

/**
 * Request-scoped resolution of active tenant.
 * Derives tenant exclusively from server-verified request headers and database state.
 */
export const getTenant = cache(async function getTenant(
  explicitSlug?: string
): Promise<CompanyRow | null> {
  let slug = explicitSlug

  if (!slug) {
    try {
      const headerStore = await getRequestHeaders()
      if (headerStore) {
        const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || ''
        const pathname = headerStore.get('x-invoke-path') || ''
        
        const resolution = resolveTenant(host, pathname)
        if (resolution.type === 'tenant' && resolution.slug) {
          slug = resolution.slug
        } else {
          // Fallback to internal header set by verified middleware rewrite
          const headerSlug = headerStore.get('x-tenant-slug')
          if (headerSlug && headerSlug !== 'default' && headerSlug !== 'c-01') {
            slug = headerSlug
          }
        }
      }
    } catch {
      // In isolated environments without headers()
    }
  }

  if (!slug) {
    return null
  }

  const company = await TenantRepository.getCompanyBySlug(slug)
  if (!company || company.is_active === false) {
    return null
  }

  return company
})

/**
 * Asserts that a valid active tenant exists for the current request.
 * Throws TenantNotFoundError or redirects if unresolvable.
 */
export async function requireTenant(explicitSlug?: string): Promise<CompanyRow> {
  const tenant = await getTenant(explicitSlug)
  if (!tenant) {
    throw new TenantNotFoundError('Tenant workspace could not be identified or is inactive.')
  }
  return tenant
}

/**
 * Request-scoped resolution of authenticated user from Supabase SSR session cookies.
 * FAIL-CLOSED: Rejects unauthenticated requests and redirects to login.
 */
export const requireUser = cache(async function requireUser(
  redirectTo?: string
): Promise<User> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    const target = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'
    await performRedirect(target)
    throw new UnauthorizedError('Authentication required')
  }

  return user
})

/**
 * Gets authenticated user without redirecting. Returns null if not authenticated.
 */
export const getUser = cache(async function getUser(): Promise<User | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch {
    return null
  }
})

/**
 * Enforces that the current authenticated user is an active member of the resolved tenant.
 * Security Invariant: Every Server Action and protected Page/API must call this before any data access.
 */
export async function requireTenantMember(
  tenantIdOrSlug?: string,
  userId?: string
): Promise<TenantMemberContext> {
  let user: User
  if (userId) {
    const currentUser = await getUser()
    if (!currentUser || currentUser.id !== userId) {
      throw new UnauthorizedError('User session mismatch.')
    }
    user = currentUser
  } else {
    user = await requireUser()
  }

  let tenant: CompanyRow | null = null
  if (tenantIdOrSlug) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdOrSlug)
    tenant = isUuid
      ? await TenantRepository.getCompanyById(tenantIdOrSlug)
      : await TenantRepository.getCompanyBySlug(tenantIdOrSlug)
  } else {
    tenant = await getTenant()
  }

  if (!tenant) {
    throw new TenantNotFoundError('Target tenant does not exist or is inactive.')
  }

  const membershipResult = await TenantRepository.resolveUserMembership(user.id, tenant.id)
  if (!membershipResult || !membershipResult.companyUser) {
    throw new UnauthorizedError(`User ${user.email} is not an authorized member of workspace '${tenant.name}'.`)
  }

  if ((membershipResult.companyUser as any).is_active === false || (membershipResult.companyUser as any).status === 'suspended') {
    throw new UnauthorizedError('User account in this workspace is deactivated or suspended.')
  }

  return {
    user,
    tenant,
    membership: membershipResult.companyUser,
    permissions: membershipResult.effectivePermissions,
    role: membershipResult.primaryRole,
  }
}

/**
 * Guards execution by checking if the user's role matches any of the allowed roles.
 */
export async function requireRole(
  allowedRoles: PrimaryRole | PrimaryRole[],
  tenantIdOrSlug?: string
): Promise<TenantMemberContext> {
  const memberContext = await requireTenantMember(tenantIdOrSlug)
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

  const isOwner = memberContext.role === 'business_owner' || (memberContext.membership.responsibilities || []).includes('business_owner')
  if (isOwner) {
    return memberContext
  }

  const hasRole = roles.includes(memberContext.role as PrimaryRole) ||
    (memberContext.membership.responsibilities || []).some((r) => roles.includes(r as PrimaryRole))

  if (!hasRole) {
    throw new UnauthorizedError(`Required role [${roles.join(', ')}] not held by user (current: ${memberContext.role}).`)
  }

  return memberContext
}

/**
 * Guards execution by checking if the user holds a specific granular permission code.
 */
export async function requirePermission(
  permissionCode: string,
  tenantIdOrSlug?: string
): Promise<TenantMemberContext> {
  const memberContext = await requireTenantMember(tenantIdOrSlug)

  const isOwner = memberContext.role === 'business_owner' || (memberContext.membership.responsibilities || []).includes('business_owner')
  if (isOwner) {
    return memberContext
  }

  const [module] = permissionCode.split('.')
  const hasPerm =
    memberContext.permissions.includes(permissionCode) ||
    memberContext.permissions.includes(`${module}.full_control`)

  if (!hasPerm) {
    throw new UnauthorizedError(`Missing required permission: ${permissionCode}`)
  }

  return memberContext
}

/**
 * Returns an authenticated Supabase client for SSR context.
 */
export async function getScopedDbClient() {
  return createClient()
}
