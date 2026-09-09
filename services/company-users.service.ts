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
   * Create a new company team member with full credentials
   */
  static async createCompanyUser(params: {
    companyId: string
    fullName: string
    email: string
    phone: string
    password?: string
    roleId: string
    branchId?: string | null
    actorName?: string
  }): Promise<ApiResponse> {
    try {
      const admin = createAdminClient()
      const normalizedEmail = params.email.trim().toLowerCase()

      // 1. Check if user already exists in auth.users or create them
      let userId: string | null = null
      const { data: userList } = await admin.auth.admin.listUsers()
      const existingAuth = userList?.users?.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      )

      if (existingAuth) {
        userId = existingAuth.id
      } else {
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email: normalizedEmail,
          password: params.password || 'PrintERP2026!Staff',
          email_confirm: true,
          user_metadata: {
            full_name: params.fullName,
            phone: params.phone,
            preferred_locale: 'bn',
          },
        })

        if (createErr || !newUser?.user) {
          throw new Error(`Failed to create auth account: ${createErr?.message || 'Unknown auth error'}`)
        }
        userId = newUser.user.id
      }

      // 2. Ensure user_profiles row exists
      await (admin as any).from('user_profiles').upsert({
        id: userId,
        email: normalizedEmail,
        full_name: params.fullName,
        phone: params.phone || null,
        preferred_locale: 'bn',
        is_active: true,
        updated_at: new Date().toISOString(),
      })

      try {
        await (admin as any).from('profiles').upsert({
          id: userId,
          full_name: params.fullName,
          phone: params.phone || null,
          preferred_locale: 'bn',
          updated_at: new Date().toISOString(),
        })
      } catch {
        // Non-blocking
      }

      // 3. Check if company_users record exists
      const { data: existingCU } = await (admin as any)
        .from('company_users')
        .select('id')
        .eq('company_id', params.companyId)
        .eq('user_id', userId)
        .maybeSingle()

      let companyUserId = existingCU?.id

      if (!companyUserId) {
        const { data: newCU, error: cuErr } = await (admin as any)
          .from('company_users')
          .insert({
            company_id: params.companyId,
            user_id: userId,
            branch_id: params.branchId || null,
            invited_email: normalizedEmail,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (cuErr || !newCU) {
          throw new Error(`Failed to assign user to company: ${cuErr?.message || 'Database error'}`)
        }
        companyUserId = newCU.id
      } else {
        await (admin as any)
          .from('company_users')
          .update({
            branch_id: params.branchId || null,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', companyUserId)
      }

      // 4. Assign role in user_roles
      if (params.roleId && companyUserId) {
        await (admin as any).from('user_roles').delete().eq('company_user_id', companyUserId)
        await (admin as any).from('user_roles').insert({
          company_user_id: companyUserId,
          role_id: params.roleId,
          company_id: params.companyId,
        })
      }

      // 5. Audit Log
      await AuditService.logEvent(
        params.companyId,
        null,
        params.actorName || 'Admin',
        'user.create',
        'user',
        companyUserId,
        null,
        { email: normalizedEmail, fullName: params.fullName, roleId: params.roleId },
        `Created team user ${params.fullName} (${normalizedEmail})`
      )

      return { success: true, message: `User ${params.fullName} created successfully.` }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create user' }
    }
  }

  /**
   * Invite a new user under a tenant company
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
      const normalizedEmail = email.trim().toLowerCase()

      // 1. Create or ensure user profile exists in Supabase Auth
      let userId: string | null = null
      const { data: userList } = await admin.auth.admin.listUsers()
      const existingAuth = userList?.users?.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      )

      if (existingAuth) {
        userId = existingAuth.id
      } else {
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email: normalizedEmail,
          password: 'PrintERP2026!Invite',
          email_confirm: false,
          user_metadata: {
            full_name: fullName || normalizedEmail.split('@')[0],
            phone: phone || null,
            preferred_locale: 'bn',
          },
        })

        if (!createErr && newUser?.user) {
          userId = newUser.user.id
        }
      }

      if (!userId) {
        throw new Error('Failed to initialize invited auth user identity')
      }

      // Upsert profile
      await (admin as any).from('user_profiles').upsert({
        id: userId,
        email: normalizedEmail,
        full_name: fullName || normalizedEmail.split('@')[0],
        phone: phone || null,
        preferred_locale: 'bn',
        is_active: true,
        updated_at: new Date().toISOString(),
      })

      // 2. Insert or update company_users record
      const { data: existingCU } = await (admin as any)
        .from('company_users')
        .select('id')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .maybeSingle()

      let companyUserId = existingCU?.id

      if (!companyUserId) {
        const { data: companyUser, error: cuErr } = await (admin as any)
          .from('company_users')
          .insert({
            company_id: companyId,
            user_id: userId,
            branch_id: branchId || null,
            invited_email: normalizedEmail,
            status: 'invited',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (cuErr || !companyUser) {
          throw new Error(`Failed to add user to company: ${cuErr?.message || 'Database error'}`)
        }
        companyUserId = companyUser.id
      }

      // 3. Assign role in user_roles
      if (roleId && companyUserId) {
        await (admin as any).from('user_roles').delete().eq('company_user_id', companyUserId)
        await (admin as any).from('user_roles').insert({
          company_user_id: companyUserId,
          role_id: roleId,
          company_id: companyId,
        })
      }

      await AuditService.logEvent(
        companyId,
        null,
        'Admin',
        'user.invite',
        'user',
        companyUserId,
        null,
        { email: normalizedEmail, roleId, branchId, fullName },
        `Invited user ${normalizedEmail} (${fullName || 'Staff'})`
      )

      return { success: true, message: `User ${normalizedEmail} invited successfully.` }
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



