import { CompanyUserWithProfile, RoleRow } from '@/types/tenant.types'
import { getResponsibilityPresetsForRole, getPracticalDefaultDataScope } from '@/lib/auth/rbac.client'
import { ROLE_NAMES_BN } from './roles-matrix-tab'

export interface ResolvedRole {
  name: string
  nameBn: string
  slug: string
}

/**
 * Resolves the user's role consistently, properly inspecting:
 * 1. Explicit joined role (u.roles or u.role)
 * 2. User responsibilities list (e.g. ['business_owner'])
 * 3. Matched roles in company
 * 4. Default fallback to General Staff
 */
export function resolveUserRole(
  u: CompanyUserWithProfile,
  rolesList?: RoleRow[]
): ResolvedRole {
  // 1. If explicit role object exists on user
  const primaryRole = u.roles?.[0] || u.role
  if (primaryRole?.name) {
    const slug = (primaryRole.slug || primaryRole.name).toLowerCase().replace(/\s+/g, '_')
    const nameBn =
      (primaryRole as any).name_bn ||
      ROLE_NAMES_BN[slug] ||
      ROLE_NAMES_BN[primaryRole.name] ||
      primaryRole.name
    return { name: primaryRole.name, nameBn, slug }
  }

  // 2. Check user's responsibilities array
  const resps = u.responsibilities || []
  if (resps.includes('business_owner') || resps.includes('owner')) {
    return {
      name: 'Business Owner',
      nameBn: 'ব্যবসা স্বত্বাধিকারী',
      slug: 'business_owner',
    }
  }

  // Check if any role slug from rolesList matches user's responsibilities
  if (rolesList && rolesList.length > 0) {
    for (const r of rolesList) {
      if (r.slug && resps.includes(r.slug)) {
        const nameBn = (r as any).name_bn || ROLE_NAMES_BN[r.slug] || ROLE_NAMES_BN[r.name] || r.name
        return { name: r.name, nameBn, slug: r.slug }
      }
    }
  }

  // Check predefined ROLE_NAMES_BN keys in responsibilities
  for (const r of resps) {
    if (ROLE_NAMES_BN[r]) {
      const slug = r.toLowerCase().replace(/\s+/g, '_')
      const name = r.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      return { name, nameBn: ROLE_NAMES_BN[r], slug }
    }
  }

  // 3. Fallback to General Staff
  return {
    name: 'General Staff',
    nameBn: 'সাধারণ কর্মী',
    slug: 'general_staff',
  }
}

/**
 * Resolves user data scope from explicit settings, data_scopes map, or role defaults.
 */
export function resolveUserDataScope(
  u: CompanyUserWithProfile,
  roleSlug?: string
): string {
  if (u.data_scope) return u.data_scope
  if ((u as any).dataScope) return (u as any).dataScope

  if (u.data_scopes && typeof u.data_scopes === 'object') {
    const scopes = Object.values(u.data_scopes)
    if (scopes.includes('company')) return 'company'
    if (scopes.includes('branch')) return 'branch'
    if (scopes.includes('department')) return 'department'
    if (scopes.includes('assigned')) return 'assigned'
  }

  if (roleSlug === 'business_owner' || roleSlug === 'owner') return 'company'

  if (roleSlug) {
    return getPracticalDefaultDataScope(roleSlug)
  }

  return 'branch'
}

const ROLE_IDENTIFIER_SLUGS = new Set([
  'business_owner',
  'owner',
  'sales_manager',
  'designer',
  'production_manager',
  'operator',
  'store_manager',
  'accountant',
  'delivery_coordinator',
  'general_staff',
  'staff',
  'branch_manager',
  'manager',
])

/**
 * Extracts meaningful operational responsibilities for the user.
 * Filters out role identifiers like 'business_owner' and returns presets if empty.
 */
export function resolveUserResponsibilities(
  u: CompanyUserWithProfile,
  roleSlug: string
): string[] {
  const custom = (u.responsibilities || []).filter(
    (r) => !ROLE_IDENTIFIER_SLUGS.has(r.toLowerCase())
  )

  if (custom.length > 0) {
    return custom
  }

  return getResponsibilityPresetsForRole(roleSlug)
}
