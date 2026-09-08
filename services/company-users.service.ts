import { CompanyUserWithProfile, RoleRow, BranchRow } from '../types/tenant.types'
import { ApiResponse } from '../types/common.types'
import { DataScope } from '../types/rbac.types'
import { TenantRepository } from '@/lib/repositories/tenant.repository'
import { AuditService } from '@/services/audit.service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export class CompanyUsersService {
  /**
   * List all users/members in a company
   */
  static async listCompanyUsers(companyId: string): Promise<ApiResponse<CompanyUserWithProfile[]>> {
    try {
      if (!companyId) return { success: false, error: 'Company ID is required' }
      const users = await TenantRepository.getCompanyUsers(companyId)
      return { success: true, data: users }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to list company users' }
    }
  }

  /**
   * List available roles
   */
  static async listRoles(companyId?: string): Promise<RoleRow[]> {
    try {
      return await TenantRepository.getRoles(companyId)
    } catch (error) {
      console.error('Error fetching roles:', error)
      return []
    }
  }

  /**
   * List company branches
   */
  static async listBranches(companyId: string): Promise<BranchRow[]> {
    try {
      if (!companyId) return []
      return await TenantRepository.getBranches(companyId)
    } catch (error) {
      console.error('Error fetching branches:', error)
      return []
    }
  }

  /**
   * Disable user
   */
  static async disableUser(companyUserId: string, companyId?: string, actorName = 'Admin'): Promise<ApiResponse> {
    try {
      await TenantRepository.updateUserStatus(companyUserId, 'disabled')
      if (companyId) {
        await AuditService.logEvent(
          companyId,
          null,
          actorName,
          'user.disable',
          'user',
          companyUserId,
          { status: 'active' },
          { status: 'disabled' },
          `User ${companyUserId} disabled by ${actorName}`
        )
      }
      return { success: true, message: 'User disabled successfully.' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to disable user' }
    }
  }

  /**
   * Activate user
   */
  static async activateUser(companyUserId: string, companyId?: string, actorName = 'Admin'): Promise<ApiResponse> {
    try {
      await TenantRepository.updateUserStatus(companyUserId, 'active')
      if (companyId) {
        await AuditService.logEvent(
          companyId,
          null,
          actorName,
          'user.activate',
          'user',
          companyUserId,
          { status: 'disabled' },
          { status: 'active' },
          `User ${companyUserId} activated by ${actorName}`
        )
      }
      return { success: true, message: 'User activated successfully.' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to activate user' }
    }
  }

  /**
   * Invite or create a new user under a tenant company
   */
  static async inviteUser(
    companyId: string,
    email: string,
    roleId: string,
    branchId?: string | null,
    fullName?: string,
    phone?: string
  ): Promise<ApiResponse> {
    try {
      const admin = createAdminClient()

      // 1. Create or ensure user profile exists
      let userId: string | null = null
      const { data: existingUser } = await (admin as any)
        .from('user_profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle()

      if (existingUser) {
        userId = existingUser.id
      }

      // 2. Insert company_users record
      const { data: companyUser, error: cuErr } = await (admin as any)
        .from('company_users')
        .insert({
          company_id: companyId,
          user_id: userId,
          branch_id: branchId || null,
          invited_email: email.trim().toLowerCase(),
          status: userId ? 'active' : 'invited',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (cuErr) {
        throw new Error(`Failed to add user to company: ${cuErr.message}`)
      }

      // 3. Assign role in user_roles
      if (roleId && companyUser) {
        await (admin as any).from('user_roles').insert({
          company_user_id: companyUser.id,
          role_id: roleId,
        })
      }

      await AuditService.logEvent(
        companyId,
        null,
        'Admin',
        'user.invite',
        'user',
        companyUser.id,
        null,
        { email, roleId, branchId, fullName },
        `Invited user ${email} (${fullName || 'Staff'})`
      )

      return { success: true, message: `User ${email} invited successfully.` }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to invite user' }
    }
  }

  /**
   * Change user primary role
   */
  static async changeUserRole(
    companyUserId: string,
    targetRoleId: string,
    companyId?: string
  ): Promise<ApiResponse> {
    try {
      const admin = createAdminClient()
      // Remove old role assignments and set new one
      await (admin as any).from('user_roles').delete().eq('company_user_id', companyUserId)
      await (admin as any).from('user_roles').insert({
        company_user_id: companyUserId,
        role_id: targetRoleId,
      })

      if (companyId) {
        await AuditService.logEvent(
          companyId,
          null,
          'Admin',
          'user.role_change',
          'user',
          companyUserId,
          null,
          { roleId: targetRoleId },
          `User ${companyUserId} role updated to ${targetRoleId}`
        )
      }

      return { success: true, message: 'Role changed successfully.' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to change user role' }
    }
  }

  /**
   * Assign user to a specific branch
   */
  static async assignBranch(
    companyUserId: string,
    branchId: string | null
  ): Promise<ApiResponse> {
    try {
      const admin = createAdminClient()
      await (admin as any)
        .from('company_users')
        .update({
          branch_id: branchId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyUserId)

      return { success: true, message: 'Branch assigned successfully.' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to assign branch' }
    }
  }

  /**
   * Dispatch password reset email via Supabase Auth
   */
  static async resetAccess(email: string): Promise<ApiResponse> {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
      if (error) {
        throw new Error(error.message)
      }
      return { success: true, message: `Password reset dispatched to ${email}` }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to dispatch password reset' }
    }
  }

  /**
   * List audit logs for user/company
   */
  static listAuditLogs(_companyId: string, _userId?: string): any[] {
    return []
  }

  /**
   * Update user access, multiple responsibilities, custom overrides, and data scopes with audit trail
   */
  static async updateUserAccessAndPermissions(params: {
    companyUserId: string
    companyId?: string
    responsibilities?: string[]
    overrides?: Record<string, boolean>
    dataScopes?: Record<string, DataScope>
    department?: string | null
    branchId?: string | null
    actorName?: string
    actorId?: string
  }): Promise<ApiResponse> {
    try {
      await TenantRepository.updateUserResponsibilitiesAndOverrides({
        companyUserId: params.companyUserId,
        department: params.department,
        branchId: params.branchId,
        responsibilities: params.responsibilities,
        overrides: params.overrides,
      })

      if (params.companyId) {
        await AuditService.trackPermissionChange(
          params.companyId,
          params.actorId || 'system',
          params.actorName || 'Owner / Administrator',
          params.companyUserId,
          {},
          {
            responsibilities: params.responsibilities,
            overrides: params.overrides,
            department: params.department,
            branchId: params.branchId,
          }
        )
      }

      return {
        success: true,
        message: 'Permissions and responsibilities updated successfully.',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update user permissions',
      }
    }
  }
}



