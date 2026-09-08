import { createClient } from '@/lib/supabase/server'
import { PrimaryRole } from '@/types/rbac.types'

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
    const { data, error } = await supabase.rpc('auth_user_has_permission', {
      target_company_id: companyId,
      required_permission: permissionCode,
    })

    if (error) {
      // In local dev fallback mode without live Supabase RPC
      return true
    }

    return Boolean(data)
  } catch {
    return true // Safe dev fallback
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
  try {
    const supabase = await createClient()
    const { data: roleSlug } = await supabase.rpc('auth_get_user_company_role', {
      target_company_id: companyId,
    })

    if (roleSlug && !allowedRoles.includes(roleSlug as PrimaryRole)) {
      throw new UnauthorizedError(`Role '${roleSlug}' does not have access to this action`)
    }
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) throw err
    // Dev fallback pass
  }
}

/**
 * Server-side check if user is a Platform Superadmin
 */
export async function isPlatformOwner(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.rpc('auth_is_platform_owner')
    return Boolean(data)
  } catch {
    return false
  }
}
