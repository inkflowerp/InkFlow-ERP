'use server'

import { revalidatePath } from 'next/cache'
import { CompanyUsersService } from '@/services/company-users.service'
import { EntitlementService } from '@/services/entitlement.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { TenantRepository } from '@/lib/repositories/tenant.repository'

async function isSelfTarget(targetCompanyUserId: string, companyId: string, currentUserId?: string): Promise<boolean> {
  if (!targetCompanyUserId || !currentUserId || !companyId) return false
  if (targetCompanyUserId === currentUserId) return true
  try {
    const users = await TenantRepository.getCompanyUsers(companyId)
    const target = users.find((u) => u.id === targetCompanyUserId)
    return target?.user_id === currentUserId
  } catch {
    return false
  }
}

export async function createCompanyUserAction(params: {
  companyId: string
  tenantSlug: string
  fullName: string
  fullNameBn?: string
  email: string
  phone: string
  password?: string
  roleId: string
  branchId?: string | null
}) {
  const tenant = await getCurrentTenant(params.companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.create') &&
      !tenant.permissions.includes('users.manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient permissions to create team users.' }
  }

  try {
    await EntitlementService.enforceLimit(tenant.companyId, 'max_users')
  } catch (err: any) {
    return { success: false, message: err?.message || 'Plan user limit exceeded' }
  }

  const result = await CompanyUsersService.createCompanyUser({
    ...params,
    companyId: tenant.companyId,
    actorName: tenant.fullName || 'Admin',
  })

  revalidatePath(`/${params.tenantSlug}/settings/users`)
  return result
}

export async function inviteUserAction(
  companyId: string,
  tenantSlug: string,
  email: string,
  roleId: string,
  branchId?: string | null,
  fullName?: string,
  phone?: string
) {
  const tenant = await getCurrentTenant(companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.create') &&
      !tenant.permissions.includes('users.manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient permissions to invite team users.' }
  }

  try {
    await EntitlementService.enforceLimit(tenant.companyId, 'max_users')
  } catch (err: any) {
    return { success: false, message: err?.message || 'Plan user limit exceeded' }
  }

  const result = await CompanyUsersService.inviteUser(
    tenant.companyId,
    email,
    roleId,
    branchId,
    fullName,
    phone,
    tenant.fullName || 'Admin'
  )
  revalidatePath(`/${tenantSlug}/settings/users`)
  return result
}

export async function toggleUserStatusAction(
  companyUserId: string,
  newStatus: 'active' | 'disabled',
  tenantSlug: string
) {
  const tenant = await getCurrentTenant()
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.disable') &&
      !tenant.permissions.includes('users.manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient permissions to change user status.' }
  }

  // Anti-self-disable check
  if (await isSelfTarget(companyUserId, tenant.companyId, tenant.userId)) {
    return { success: false, message: 'You cannot disable your own active user account.' }
  }

  const result =
    newStatus === 'active'
      ? await CompanyUsersService.activateUser(companyUserId, tenant.companyId, tenant.fullName || 'Admin')
      : await CompanyUsersService.disableUser(companyUserId, tenant.companyId, tenant.fullName || 'Admin')

  revalidatePath(`/${tenantSlug}/settings/users`)
  return result
}

export async function changeUserRoleAction(
  companyUserId: string,
  newRoleId: string,
  companyId: string,
  tenantSlug: string
) {
  const tenant = await getCurrentTenant(companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.role_change') &&
      !tenant.permissions.includes('users.manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient permissions to modify user roles.' }
  }

  // Anti-self-escalation check
  if (tenant.companyRole !== 'business_owner' && (await isSelfTarget(companyUserId, tenant.companyId, tenant.userId))) {
    return { success: false, message: 'Self-escalation denied: You cannot change your own role.' }
  }

  const result = await CompanyUsersService.changeUserRole(
    companyUserId,
    newRoleId,
    tenant.companyId
  )
  revalidatePath(`/${tenantSlug}/settings/users`)
  return result
}

export async function assignUserBranchAction(
  companyUserId: string,
  branchId: string | null,
  tenantSlug: string
) {
  const tenant = await getCurrentTenant()
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.branch_assign') &&
      !tenant.permissions.includes('users.manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient branch assignment permissions.' }
  }

  const result = await CompanyUsersService.assignBranch(companyUserId, branchId)
  revalidatePath(`/${tenantSlug}/settings/users`)
  return result
}

export async function listCompanyUsersAction(companyId: string) {
  try {
    return await CompanyUsersService.listCompanyUsers(companyId)
  } catch (error: any) {
    console.error('[Action] listCompanyUsersAction error:', error?.message)
    return { success: false, error: error?.message || 'Failed to list users', data: [] }
  }
}

export async function listRolesAction(companyId?: string) {
  try {
    const roles = await CompanyUsersService.listRoles(companyId)
    return Array.isArray(roles) ? roles : []
  } catch (error: any) {
    console.error('[Action] listRolesAction error:', error?.message)
    return []
  }
}

export async function listRolesWithPermissionsAction(companyId?: string) {
  try {
    const roles = await CompanyUsersService.listRolesWithPermissions(companyId)
    return Array.isArray(roles) ? roles : []
  } catch (error: any) {
    console.error('[Action] listRolesWithPermissionsAction error:', error?.message)
    return []
  }
}

export async function listBranchesAction(companyId: string) {
  try {
    const branches = await CompanyUsersService.listBranches(companyId)
    return Array.isArray(branches) ? branches : []
  } catch (error: any) {
    console.error('[Action] listBranchesAction error:', error?.message)
    return []
  }
}

export async function updateUserAccessAndPermissionsAction(params: {
  companyUserId: string
  companyId?: string
  tenantSlug?: string
  responsibilities?: string[]
  overrides?: Record<string, boolean>
  dataScopes?: any
  authorizedBranchIds?: string[]
  department?: string | null
  branchId?: string | null
  actorName?: string
  actorId?: string
}) {
  const tenant = await getCurrentTenant(params.companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.permission_manage') &&
      !tenant.permissions.includes('users.manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient permissions to modify user access.' }
  }

  // Anti-self-escalation check
  if (tenant.companyRole !== 'business_owner' && (await isSelfTarget(params.companyUserId, tenant.companyId, tenant.userId))) {
    return { success: false, message: 'Self-escalation denied: You cannot modify your own access privileges.' }
  }

  const result = await CompanyUsersService.updateUserAccessAndPermissions({
    ...params,
    companyId: tenant.companyId,
    actorName: tenant.fullName || params.actorName || 'Owner',
    actorId: tenant.userId || params.actorId || 'system',
  })

  const slug = params.tenantSlug || tenant.companySlug
  if (slug) {
    revalidatePath(`/${slug}/settings/users`)
    revalidatePath(`/${slug}/settings/roles`)
  }

  return result
}

export async function resetUserAccessAction(email: string) {
  const tenant = await getCurrentTenant()
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.reset_password') &&
      !tenant.permissions.includes('users.manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient user management permissions.' }
  }

  return await CompanyUsersService.resetAccess(email)
}

export async function createCustomRoleAction(params: {
  companyId: string
  tenantSlug: string
  name: string
  nameBn?: string
  slug?: string
  description?: string
  permissions: string[]
}) {
  const tenant = await getCurrentTenant(params.companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.permission_manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Only Business Owner can create custom roles.' }
  }

  const result = await CompanyUsersService.createCustomRole({
    ...params,
    companyId: tenant.companyId,
    actorName: tenant.fullName || 'Owner',
  })
  revalidatePath(`/${params.tenantSlug}/settings/roles`)
  return result
}

export async function updateRolePermissionsAction(params: {
  companyId: string
  tenantSlug: string
  roleId: string
  permissions: string[]
  details?: { name?: string; nameBn?: string; description?: string }
}) {
  const tenant = await getCurrentTenant(params.companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.permission_manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Only Business Owner can update role matrices.' }
  }

  const result = await CompanyUsersService.updateRolePermissions({
    ...params,
    companyId: tenant.companyId,
    actorName: tenant.fullName || 'Owner',
  })
  revalidatePath(`/${params.tenantSlug}/settings/roles`)
  return result
}

export async function deleteCustomRoleAction(params: {
  companyId: string
  tenantSlug: string
  roleId: string
}) {
  const tenant = await getCurrentTenant(params.companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.permission_manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Only Business Owner can delete custom roles.' }
  }

  const result = await CompanyUsersService.deleteCustomRole(
    params.roleId,
    tenant.companyId,
    tenant.fullName || 'Owner'
  )
  revalidatePath(`/${params.tenantSlug}/settings/roles`)
  return result
}

export async function listLinkableEmployeesAction(companyId: string) {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, error: 'Unauthorized: Session required', data: [] }
  }
  return await CompanyUsersService.listLinkableEmployees(tenant.companyId)
}

export async function createUserWithEmployeeAction(params: {
  companyId: string
  tenantSlug: string
  employeeId?: string | null
  email: string
  username?: string
  fullName: string
  phone?: string
  roleId: string
  responsibilities?: string[]
  branchId?: string | null
  additionalBranchIds?: string[]
  dataScopes?: any
}) {
  const tenant = await getCurrentTenant(params.companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.create') &&
      !tenant.permissions.includes('users.manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient permissions to create team users.' }
  }

  // Anti-self-escalation: only business owner can grant company-wide scope or owner role
  if (tenant.companyRole !== 'business_owner') {
    const isOwnerRole = params.roleId === 'role-owner' || params.roleId === 'business_owner'
    if (isOwnerRole) {
      return { success: false, message: 'Unauthorized: Only Business Owner can grant Owner role.' }
    }
  }

  try {
    await EntitlementService.enforceLimit(tenant.companyId, 'max_users')
  } catch (err: any) {
    return { success: false, message: err?.message || 'Plan user limit exceeded' }
  }

  const result = await CompanyUsersService.createUserWithEmployee({
    ...params,
    companyId: tenant.companyId,
    actorName: tenant.fullName || 'Admin',
  })

  revalidatePath(`/${params.tenantSlug}/settings/users`)
  return result
}

export async function linkEmployeeToUserAction(params: {
  companyUserId: string
  employeeId: string
  companyId: string
  tenantSlug: string
}) {
  const tenant = await getCurrentTenant(params.companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient permissions to link employees.' }
  }

  const result = await CompanyUsersService.linkEmployeeToUser({
    ...params,
    companyId: tenant.companyId,
    actorName: tenant.fullName || 'Admin',
  })

  revalidatePath(`/${params.tenantSlug}/settings/users`)
  return result
}

export async function unlinkEmployeeFromUserAction(params: {
  companyUserId: string
  companyId: string
  tenantSlug: string
}) {
  const tenant = await getCurrentTenant(params.companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient permissions to unlink employees.' }
  }

  const result = await CompanyUsersService.unlinkEmployeeFromUser({
    ...params,
    companyId: tenant.companyId,
    actorName: tenant.fullName || 'Admin',
  })

  revalidatePath(`/${params.tenantSlug}/settings/users`)
  return result
}

export async function removeLoginAction(params: {
  companyUserId: string
  companyId: string
  tenantSlug: string
}) {
  const tenant = await getCurrentTenant(params.companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient permissions to remove user login.' }
  }

  // Anti-self-remove check
  if (await isSelfTarget(params.companyUserId, tenant.companyId, tenant.userId)) {
    return { success: false, message: 'You cannot remove your own active login account.' }
  }

  const result = await CompanyUsersService.removeLogin({
    ...params,
    companyId: tenant.companyId,
    actorName: tenant.fullName || 'Admin',
  })

  revalidatePath(`/${params.tenantSlug}/settings/users`)
  return result
}

export async function getAccountHealthAction(companyUserId: string, companyId?: string) {
  const tenant = await getCurrentTenant(companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('users.manage') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, error: 'Unauthorized: Insufficient permissions.' }
  }

  return await CompanyUsersService.getAccountHealth(companyUserId, tenant.companyId)
}

export async function getUserAuditActivityAction(companyUserId: string, companyId?: string) {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) return []
  return await CompanyUsersService.getUserAuditActivity(companyUserId, tenant.companyId)
}
