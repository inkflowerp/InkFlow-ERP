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
      ? await CompanyUsersService.activateUser(companyUserId, tenant.fullName || 'Admin')
      : await CompanyUsersService.disableUser(companyUserId, tenant.fullName || 'Admin')

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
    tenant.companyId,
    tenant.fullName || 'Admin'
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

export async function resetUserAccessAction(email: string) {
  const tenant = await getCurrentTenant()
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('*') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, message: 'Unauthorized: Insufficient permissions to reset access.' }
  }

  return await CompanyUsersService.resetAccess(email)
}
