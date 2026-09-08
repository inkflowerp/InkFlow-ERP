'use server'

import { revalidatePath } from 'next/cache'
import { CompanyUsersService } from '@/services/company-users.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'

export async function inviteUserAction(
  companyId: string,
  tenantSlug: string,
  email: string,
  roleId: string,
  branchId?: string | null
) {
  const tenant = await getCurrentTenant(companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('*') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient user management permissions.' }
  }

  const result = await CompanyUsersService.inviteUser(tenant.companyId, email, roleId, branchId)
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
      !tenant.permissions.includes('*') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient user management permissions.' }
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
      !tenant.permissions.includes('*') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient user management permissions.' }
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
      !tenant.permissions.includes('*') &&
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

export async function listBranchesAction(companyId: string) {
  return await CompanyUsersService.listBranches(companyId)
}

export async function updateUserAccessAndPermissionsAction(params: {
  companyUserId: string
  companyId?: string
  responsibilities?: string[]
  overrides?: Record<string, boolean>
  dataScopes?: any
  department?: string | null
  branchId?: string | null
  actorName?: string
  actorId?: string
}) {
  const tenant = await getCurrentTenant(params.companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('*') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient permissions to modify user access.' }
  }

  return await CompanyUsersService.updateUserAccessAndPermissions({
    ...params,
    companyId: tenant.companyId,
    actorName: tenant.fullName || params.actorName || 'Owner',
    actorId: tenant.userId || params.actorId || 'system',
  })
}

export async function resetUserAccessAction(email: string) {
  const tenant = await getCurrentTenant()
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('*') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient user management permissions.' }
  }

  return await CompanyUsersService.resetAccess(email)
}
