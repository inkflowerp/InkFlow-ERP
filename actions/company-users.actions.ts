'use server'

import { revalidatePath } from 'next/cache'
import { CompanyUsersService } from '@/services/company-users.service'
import { EntitlementService } from '@/services/entitlement.service'
import { getCurrentTenant, invalidateTenantAuthCache } from '@/lib/auth/tenant-auth'
import { TenantRepository } from '@/lib/repositories/tenant.repository'
import { withTenantAction } from '@/lib/actions/action-wrapper'

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

export const createCompanyUserAction = withTenantAction(
  { permission: 'users.create', auditAction: 'user.create', entityType: 'user' },
  async (
    ctx,
    params: {
      companyId: string
      tenantSlug: string
      fullName: string
      fullNameBn?: string
      email: string
      phone: string
      password?: string
      roleId: string
      branchId?: string | null
    }
  ) => {
    try {
      await EntitlementService.enforceLimit(ctx.companyId, 'max_users')
    } catch (err: any) {
      return { success: false, message: err?.message || 'Plan user limit exceeded' }
    }

    const result = await CompanyUsersService.createCompanyUser({
      ...params,
      companyId: ctx.companyId,
      actorName: ctx.tenant.fullName || 'Admin',
    })

    revalidatePath(`/${params.tenantSlug}/settings/users`)
    return result
  }
)

export const inviteUserAction = withTenantAction(
  { permission: 'users.create', auditAction: 'user.invite', entityType: 'user' },
  async (
    ctx,
    companyId: string,
    tenantSlug: string,
    email: string,
    roleId: string,
    branchId?: string | null,
    fullName?: string,
    phone?: string
  ) => {
    try {
      await EntitlementService.enforceLimit(ctx.companyId, 'max_users')
    } catch (err: any) {
      return { success: false, message: err?.message || 'Plan user limit exceeded' }
    }

    const result = await CompanyUsersService.inviteUser(
      ctx.companyId,
      email,
      roleId,
      branchId,
      fullName,
      phone,
      ctx.tenant.fullName || 'Admin'
    )
    revalidatePath(`/${tenantSlug}/settings/users`)
    return result
  }
)

export const resendInvitationAction = withTenantAction(
  { permission: 'users.create', auditAction: 'user.resend_invitation', entityType: 'user' },
  async (
    ctx,
    companyUserId: string,
    tenantSlug: string
  ) => {
    const result = await CompanyUsersService.resendInvitation(
      companyUserId,
      ctx.companyId,
      ctx.tenant.fullName || 'Admin'
    )
    invalidateTenantAuthCache()
    revalidatePath(`/${tenantSlug}/settings/users`)
    return {
      ...result,
      message: result.message || (result as any).error,
    }
  }
)

export const toggleUserStatusAction = withTenantAction(
  { permission: 'users.disable', auditAction: 'user.toggle_status', entityType: 'user' },
  async (
    ctx,
    companyUserId: string,
    newStatus: 'active' | 'disabled',
    tenantSlug: string
  ) => {
    // Anti-self-disable check
    if (await isSelfTarget(companyUserId, ctx.companyId, ctx.user.id)) {
      return { success: false, message: 'You cannot disable your own active user account.' }
    }

    const result =
      newStatus === 'active'
        ? await CompanyUsersService.activateUser(companyUserId, ctx.companyId, ctx.tenant.fullName || 'Admin')
        : await CompanyUsersService.disableUser(companyUserId, ctx.companyId, ctx.tenant.fullName || 'Admin')

    invalidateTenantAuthCache()
    revalidatePath(`/${tenantSlug}/settings/users`)
    return {
      ...result,
      message: result.message || (result as any).error,
    }
  }
)

export const changeUserRoleAction = withTenantAction(
  { permission: 'users.role_change', auditAction: 'user.change_role', entityType: 'user' },
  async (
    ctx,
    companyUserId: string,
    newRoleId: string,
    companyId: string,
    tenantSlug: string
  ) => {
    const isOwner = ctx.tenant.companyRole === 'business_owner' || ctx.tenant.primaryRole === 'business_owner'

    // Anti-self-escalation check
    if (!isOwner && (await isSelfTarget(companyUserId, ctx.companyId, ctx.user.id))) {
      return { success: false, message: 'Self-escalation denied: You cannot change your own role.' }
    }

    const result = await CompanyUsersService.changeUserRole(
      companyUserId,
      newRoleId,
      ctx.companyId
    )

    invalidateTenantAuthCache()
    revalidatePath(`/${tenantSlug}/settings/users`)
    return {
      ...result,
      message: result.message || (result as any).error,
    }
  }
)

export const assignUserBranchAction = withTenantAction(
  { permission: 'users.branch_assign', auditAction: 'user.assign_branch', entityType: 'user' },
  async (
    ctx,
    companyUserId: string,
    branchId: string | null,
    tenantSlug: string
  ) => {
    const result = await CompanyUsersService.assignBranch(companyUserId, branchId)
    invalidateTenantAuthCache()
    revalidatePath(`/${tenantSlug}/settings/users`)
    return result
  }
)

export const listCompanyUsersAction = withTenantAction(
  { permission: 'users.view' },
  async (ctx, companyId?: string) => {
    try {
      return await CompanyUsersService.listCompanyUsers(ctx.companyId)
    } catch (error: any) {
      console.error('[Action] listCompanyUsersAction error:', error?.message)
      return { success: false, error: error?.message || 'Failed to list users', data: [] }
    }
  }
)

export const listRolesAction = withTenantAction(
  { permission: 'users.view' },
  async (ctx, companyId?: string) => {
    try {
      const roles = await CompanyUsersService.listRoles(ctx.companyId)
      return Array.isArray(roles) ? roles : []
    } catch (error: any) {
      console.error('[Action] listRolesAction error:', error?.message)
      return []
    }
  }
)

export const listRolesWithPermissionsAction = withTenantAction(
  { permission: 'users.view' },
  async (ctx, companyId?: string) => {
    try {
      const roles = await CompanyUsersService.listRolesWithPermissions(ctx.companyId)
      return Array.isArray(roles) ? roles : []
    } catch (error: any) {
      console.error('[Action] listRolesWithPermissionsAction error:', error?.message)
      return []
    }
  }
)

export const listBranchesAction = withTenantAction(
  { permission: 'users.view' },
  async (ctx, companyId?: string) => {
    try {
      const branches = await CompanyUsersService.listBranches(ctx.companyId)
      return Array.isArray(branches) ? branches : []
    } catch (error: any) {
      console.error('[Action] listBranchesAction error:', error?.message)
      return []
    }
  }
)

export const updateUserAccessAndPermissionsAction = withTenantAction(
  { permission: 'users.permission_manage', auditAction: 'user.update_access', entityType: 'user' },
  async (
    ctx,
    params: {
      companyUserId: string
      companyId?: string
      tenantSlug?: string
      roleId?: string
      responsibilities?: string[]
      overrides?: Record<string, boolean>
      dataScopes?: any
      authorizedBranchIds?: string[]
      department?: string | null
      branchId?: string | null
      actorName?: string
      actorId?: string
    }
  ) => {
    const isOwner = ctx.tenant.companyRole === 'business_owner' || ctx.tenant.primaryRole === 'business_owner'

    // Anti-self-escalation check
    if (!isOwner && (await isSelfTarget(params.companyUserId, ctx.companyId, ctx.user.id))) {
      return { success: false, message: 'Self-escalation denied: You cannot modify your own access privileges.' }
    }

    const result = await CompanyUsersService.updateUserAccessAndPermissions({
      ...params,
      companyId: ctx.companyId,
      actorName: ctx.tenant.fullName || params.actorName || 'Owner',
      actorId: ctx.user.id || params.actorId || 'system',
    })

    invalidateTenantAuthCache()
    const slug = params.tenantSlug || ctx.companySlug
    if (slug) {
      revalidatePath(`/${slug}/settings/users`)
      revalidatePath(`/${slug}/settings/roles`)
    }

    return {
      ...result,
      message: result.message || (result as any).error,
    }
  }
)

export const resetUserAccessAction = withTenantAction(
  { permission: 'users.reset_password', auditAction: 'user.reset_access', entityType: 'user' },
  async (ctx, email: string) => {
    return await CompanyUsersService.resetAccess(email)
  }
)

export const createCustomRoleAction = withTenantAction(
  { permission: 'users.permission_manage', auditAction: 'role.create', entityType: 'role' },
  async (
    ctx,
    params: {
      companyId: string
      tenantSlug: string
      name: string
      nameBn?: string
      slug?: string
      description?: string
      permissions: string[]
    }
  ) => {
    const isOwner = ctx.tenant.companyRole === 'business_owner' || ctx.tenant.primaryRole === 'business_owner'
    if (!isOwner) {
      return { success: false, message: 'Unauthorized: Only Business Owner can create custom roles.' }
    }

    const result = await CompanyUsersService.createCustomRole({
      ...params,
      companyId: ctx.companyId,
      actorName: ctx.tenant.fullName || 'Owner',
    })
    invalidateTenantAuthCache()
    revalidatePath(`/${params.tenantSlug}/settings/roles`)
    return result
  }
)

export const updateRolePermissionsAction = withTenantAction(
  { permission: 'users.permission_manage', auditAction: 'role.update_permissions', entityType: 'role' },
  async (
    ctx,
    params: {
      companyId: string
      tenantSlug: string
      roleId: string
      permissions: string[]
      details?: { name?: string; nameBn?: string; description?: string }
    }
  ) => {
    const isOwner = ctx.tenant.companyRole === 'business_owner' || ctx.tenant.primaryRole === 'business_owner'
    if (!isOwner) {
      return { success: false, message: 'Unauthorized: Only Business Owner can update role matrices.' }
    }

    const result = await CompanyUsersService.updateRolePermissions({
      ...params,
      companyId: ctx.companyId,
      actorName: ctx.tenant.fullName || 'Owner',
    })
    invalidateTenantAuthCache()
    revalidatePath(`/${params.tenantSlug}/settings/roles`)
    return result
  }
)

export const deleteCustomRoleAction = withTenantAction(
  {
    permission: 'users.permission_manage',
    destructive: true,
    auditAction: 'role.delete',
    entityType: 'role',
  },
  async (
    ctx,
    params: {
      companyId: string
      tenantSlug: string
      roleId: string
    }
  ) => {
    const isOwner = ctx.tenant.companyRole === 'business_owner' || ctx.tenant.primaryRole === 'business_owner'
    if (!isOwner) {
      return { success: false, message: 'Unauthorized: Only Business Owner can delete custom roles.' }
    }

    const result = await CompanyUsersService.deleteCustomRole(
      params.roleId,
      ctx.companyId,
      ctx.tenant.fullName || 'Owner'
    )
    invalidateTenantAuthCache()
    revalidatePath(`/${params.tenantSlug}/settings/roles`)
    return result
  }
)

export const listLinkableEmployeesAction = withTenantAction(
  { permission: 'users.view' },
  async (ctx, companyId?: string) => {
    return await CompanyUsersService.listLinkableEmployees(ctx.companyId)
  }
)

export const createUserWithEmployeeAction = withTenantAction(
  { permission: 'users.create', auditAction: 'user.create_with_employee', entityType: 'user' },
  async (
    ctx,
    params: {
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
    }
  ) => {
    const isOwner = ctx.tenant.companyRole === 'business_owner' || ctx.tenant.primaryRole === 'business_owner'
    if (!isOwner) {
      const isOwnerRole = params.roleId === 'role-owner' || params.roleId === 'business_owner'
      if (isOwnerRole) {
        return { success: false, message: 'Unauthorized: Only Business Owner can grant Owner role.' }
      }
    }

    try {
      await EntitlementService.enforceLimit(ctx.companyId, 'max_users')
    } catch (err: any) {
      return { success: false, message: err?.message || 'Plan user limit exceeded' }
    }

    const result = await CompanyUsersService.createUserWithEmployee({
      ...params,
      companyId: ctx.companyId,
      actorName: ctx.tenant.fullName || 'Admin',
    })

    revalidatePath(`/${params.tenantSlug}/settings/users`)
    return result
  }
)

export const linkEmployeeToUserAction = withTenantAction(
  { permission: 'users.manage', auditAction: 'user.link_employee', entityType: 'user' },
  async (
    ctx,
    params: {
      companyUserId: string
      employeeId: string
      companyId: string
      tenantSlug: string
    }
  ) => {
    const result = await CompanyUsersService.linkEmployeeToUser({
      ...params,
      companyId: ctx.companyId,
      actorName: ctx.tenant.fullName || 'Admin',
    })

    revalidatePath(`/${params.tenantSlug}/settings/users`)
    return result
  }
)

export const unlinkEmployeeFromUserAction = withTenantAction(
  { permission: 'users.manage', auditAction: 'user.unlink_employee', entityType: 'user' },
  async (
    ctx,
    params: {
      companyUserId: string
      companyId: string
      tenantSlug: string
    }
  ) => {
    const result = await CompanyUsersService.unlinkEmployeeFromUser({
      ...params,
      companyId: ctx.companyId,
      actorName: ctx.tenant.fullName || 'Admin',
    })

    revalidatePath(`/${params.tenantSlug}/settings/users`)
    return result
  }
)

export const removeLoginAction = withTenantAction(
  {
    permission: 'users.manage',
    destructive: true,
    auditAction: 'user.remove_login',
    entityType: 'user',
  },
  async (
    ctx,
    params: {
      companyUserId: string
      companyId: string
      tenantSlug: string
    }
  ) => {
    // Anti-self-remove check
    if (await isSelfTarget(params.companyUserId, ctx.companyId, ctx.user.id)) {
      return { success: false, message: 'You cannot remove your own active login account.' }
    }

    const result = await CompanyUsersService.removeLogin({
      ...params,
      companyId: ctx.companyId,
      actorName: ctx.tenant.fullName || 'Admin',
    })

    invalidateTenantAuthCache()
    const slug = params.tenantSlug || ctx.companySlug
    if (slug) {
      revalidatePath(`/${slug}/settings/users`)
    }
    return {
      ...result,
      message: result.message || (result as any).error,
    }
  }
)

export const getAccountHealthAction = withTenantAction(
  { permission: 'users.manage' },
  async (ctx, companyUserId: string, companyId?: string) => {
    return await CompanyUsersService.getAccountHealth(companyUserId, ctx.companyId)
  }
)

export const getUserAuditActivityAction = withTenantAction(
  { permission: 'audit.view' },
  async (ctx, companyUserId: string, companyId?: string) => {
    return await CompanyUsersService.getUserAuditActivity(companyUserId, ctx.companyId)
  }
)
