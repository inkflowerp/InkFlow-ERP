import { createClient } from '@/lib/supabase/server'
import { PrimaryRole } from '@/types/rbac.types'
import { TenantRepository } from '@/lib/repositories/tenant.repository'

export class UnauthorizedError extends Error {
  constructor(message = 'Access forbidden: insufficient permissions') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Server-side check if current authenticated user has a permission in a company
 */
export async function hasPermission(
  companyId: string,
  permissionCode: string
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return false

    // Try live RPC first
    const { data, error } = await supabase.rpc('auth_user_has_permission', {
      target_company_id: companyId,
      required_permission: permissionCode,
    })

    if (!error && typeof data === 'boolean') {
      return data
    }

    // Fallback to direct resolution via repository
    const membership = await TenantRepository.resolveUserMembership(user.id, companyId)
    if (!membership) return false

    const responsibilities = membership.companyUser.responsibilities || []
    if (membership.primaryRole === 'business_owner' || responsibilities.includes('business_owner') || responsibilities.includes('owner')) {
      return true
    }

    const [mod] = permissionCode.split('.')
    return (
      membership.effectivePermissions.includes(permissionCode) ||
      membership.effectivePermissions.includes(`${mod}.full_control`)
    )
  } catch {
    return false
  }
}

/**
 * Server-side guard: throws UnauthorizedError if permission is missing
 */
export async function requirePermission(
  companyId: string,
  permissionCode: string
): Promise<void> {
  const allowed = await hasPermission(companyId, permissionCode)
  if (!allowed) {
    throw new UnauthorizedError(`Missing required permission: ${permissionCode}`)
  }
}

/**
 * Server-side guard: asserts user role is within allowed roles
 */
export async function requireRole(
  companyId: string,
  allowedRoles: PrimaryRole[]
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new UnauthorizedError('Authentication required.')
  }

  const membership = await TenantRepository.resolveUserMembership(user.id, companyId)
  if (!membership) {
    throw new UnauthorizedError('User does not belong to this organization.')
  }

  const responsibilities = membership.companyUser.responsibilities || []
  const hasMatchingRole = responsibilities.some((r) =>
    allowedRoles.includes(r as PrimaryRole)
  )

  if (!hasMatchingRole && !allowedRoles.includes(membership.primaryRole as PrimaryRole)) {
    throw new UnauthorizedError(`Role '${membership.primaryRole}' does not have access to this action`)
  }
}

/**
 * Server-side check if user is a Platform Superadmin
 */
export async function isPlatformOwner(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return false

    const { data } = await (supabase as any).rpc('auth_is_platform_owner')
    if (typeof data === 'boolean') return data

    // Fallback: check platform_admins table
    const { data: adminRow } = await (supabase as any)
      .from('platform_admins')
      .select('id, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    return Boolean(adminRow)
  } catch {
    return false
  }
}
