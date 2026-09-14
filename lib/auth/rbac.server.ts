import { createClient } from '../supabase/server.ts'
import type { PrimaryRole } from '../../types/rbac.types.ts'
import { TenantRepository } from '../repositories/tenant.repository.ts'

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

/**
 * Server-side data scope evaluator. Validates whether the actor has access to a target record based on scope.
 */
export function evaluateDataScopeAccess(
  actor: {
    userId: string
    branchId?: string | null
    department?: string | null
    primaryRole?: string | null
    responsibilities?: string[]
  },
  resource: {
    created_by?: string | null
    assigned_to?: string | null
    assigned_workers?: string[] | null
    branch_id?: string | null
    department?: string | null
  },
  scope: 'own' | 'assigned' | 'department' | 'branch' | 'selected_branches' | 'company' | 'all_branches' = 'assigned'
): boolean {
  // Owner or platform owner has universal scope
  const isOwner = actor.primaryRole === 'business_owner' || actor.responsibilities?.includes('business_owner') || actor.responsibilities?.includes('owner')
  if (isOwner || scope === 'company' || scope === 'all_branches') {
    return true
  }

  if (scope === 'own') {
    return resource.created_by === actor.userId
  }

  if (scope === 'assigned') {
    if (resource.created_by === actor.userId) return true
    if (resource.assigned_to === actor.userId) return true
    if (resource.assigned_workers && resource.assigned_workers.includes(actor.userId)) return true
    return false
  }

  if (scope === 'department') {
    return Boolean(actor.department && resource.department === actor.department)
  }

  if (scope === 'branch' || scope === 'selected_branches') {
    if (!actor.branchId) return true // Unrestricted if not bound to specific branch
    return resource.branch_id === actor.branchId
  }

  return false
}

/**
 * Comprehensive server-side authorization check enforcing:
 * User Authenticated + Company Member + Permission + Data Scope + Branch Access
 */
export async function verifyServerPermission(params: {
  companyId: string
  permissionCode: string
  targetResource?: {
    created_by?: string | null
    assigned_to?: string | null
    assigned_workers?: string[] | null
    branch_id?: string | null
    department?: string | null
  }
  requiredScope?: 'own' | 'assigned' | 'department' | 'branch' | 'selected_branches' | 'company' | 'all_branches'
}): Promise<{
  allowed: boolean
  userId?: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { allowed: false, error: 'Authentication required' }
    }

    const membership = await TenantRepository.resolveUserMembership(user.id, params.companyId)
    if (!membership || !membership.companyUser || (membership.companyUser as any).is_active === false) {
      return { allowed: false, userId: user.id, error: 'User is not an active member of this company' }
    }

    const isOwner = membership.primaryRole === 'business_owner' || (membership.companyUser.responsibilities || []).includes('business_owner')
    if (isOwner) {
      return { allowed: true, userId: user.id }
    }

    const hasPerm = await hasPermission(params.companyId, params.permissionCode)
    if (!hasPerm) {
      return { allowed: false, userId: user.id, error: `Missing permission: ${params.permissionCode}` }
    }

    if (params.targetResource) {
      const allowedScope = evaluateDataScopeAccess(
        {
          userId: user.id,
          branchId: membership.companyUser.branch_id,
          department: membership.companyUser.department,
          primaryRole: membership.primaryRole,
          responsibilities: membership.companyUser.responsibilities,
        },
        params.targetResource,
        params.requiredScope || 'assigned'
      )

      if (!allowedScope) {
        return { allowed: false, userId: user.id, error: 'Access denied by data scope policy' }
      }
    }

    return { allowed: true, userId: user.id }
  } catch (err: any) {
    return { allowed: false, error: err.message || 'Authorization check failed' }
  }
}
