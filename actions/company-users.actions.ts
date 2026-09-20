'use server'

import { revalidatePath } from 'next/cache'
import { CompanyUsersService } from '@/services/company-users.service'
import { EntitlementService } from '@/services/entitlement.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'

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
  if (tenant.userId && companyUserId === tenant.userId) {
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
  if (tenant.companyRole !== 'business_owner' && tenant.userId === companyUserId) {
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
  return await CompanyUsersService.listCompanyUsers(companyId)
}

export async function listRolesAction(companyId?: string) {
  return await CompanyUsersService.listRoles(companyId)
}

export async function listRolesWithPermissionsAction(companyId?: string) {
  return await CompanyUsersService.listRolesWithPermissions(companyId)
}

export async function listBranchesAction(companyId: string) {
  return await CompanyUsersService.listBranches(companyId)
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
  if (tenant.companyRole !== 'business_owner' && tenant.userId === params.companyUserId) {
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
