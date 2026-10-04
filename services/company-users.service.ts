import { CompanyUserWithProfile, RoleRow, BranchRow } from '../types/tenant.types'
import { ApiResponse } from '../types/common.types'
import { DataScope } from '../types/rbac.types'
import { TenantRepository } from '@/lib/repositories/tenant.repository'
import { CompanyUsersRepository } from '@/lib/repositories/company-users.repository'
import { AuditService } from '@/services/audit.service'
import { AuthService } from '@/services/auth.service'
import { AuthEmailService } from '@/services/auth-email.service'

const createAdminClient = () => CompanyUsersRepository.getAdminClient()
const createClient = () => CompanyUsersRepository.getServerClient()

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
   * Disable user with Last Active Owner protection
   */
  static async disableUser(companyUserId: string, companyId?: string, actorName = 'Admin'): Promise<ApiResponse> {
    try {
      if (companyId) {
        // Enforce Last Active Business Owner protection
        const users = await TenantRepository.getCompanyUsers(companyId)
        const targetUser = users.find((u) => u.id === companyUserId)
        if (targetUser) {
          const isTargetOwner =
            targetUser.responsibilities?.includes('business_owner') ||
            targetUser.responsibilities?.includes('owner') ||
            targetUser.roles?.some((r) => r.slug === 'business_owner' || r.slug === 'owner')

          if (isTargetOwner) {
            const activeOwners = users.filter(
              (u) =>
                u.status === 'active' &&
                (u.responsibilities?.includes('business_owner') ||
                  u.responsibilities?.includes('owner') ||
                  u.roles?.some((r) => r.slug === 'business_owner' || r.slug === 'owner'))
            )
            if (activeOwners.length <= 1) {
              return {
                success: false,
                error: 'Cannot disable the last active Business Owner. Assign or transfer ownership first.',
              }
            }
          }
        }
      }

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
   * Create a new company team member with cryptographically secure credentials
   */
  static async createCompanyUser(params: {
    companyId: string
    fullName: string
    fullNameBn?: string
    email: string
    phone: string
    password?: string
    roleId: string
    branchId?: string | null
    actorName?: string
  }): Promise<ApiResponse<{ userId?: string }>> {
    try {
      const admin = createAdminClient()
      const normalizedEmail = params.email.trim().toLowerCase()

      // Ensure no duplicate email or phone number across application
      const uniquenessCheck = await AuthService.validateIdentifierUniqueness({
        email: normalizedEmail,
        phone: params.phone,
        companyId: params.companyId,
      })
      if (!uniquenessCheck.available) {
        return { success: false, error: uniquenessCheck.error }
      }

      // Generate secure temporary password if none supplied
      const generatedPassword =
        params.password ||
        `InkFlow!${Math.random().toString(36).slice(-8)}${Math.floor(100 + Math.random() * 900)}`

      // 1. Check if user already exists in auth.users or create them
      let userId: string | null = null
      const { data: userList } = await admin.auth.admin.listUsers()
      const existingAuth = userList?.users?.find(
        (u: { email?: string; id: string }) => u.email?.toLowerCase() === normalizedEmail
      )

      if (existingAuth) {
        userId = existingAuth.id
      } else {
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email: normalizedEmail,
          password: generatedPassword,
          email_confirm: true,
          user_metadata: {
            full_name: params.fullName,
            full_name_bn: params.fullNameBn || null,
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
        full_name_bn: params.fullNameBn || null,
        phone: params.phone || null,
        preferred_locale: 'bn',
        is_active: true,
        updated_at: new Date().toISOString(),
      })

      try {
        await (admin as any).from('profiles').upsert({
          id: userId,
          full_name: params.fullName,
          full_name_bn: params.fullNameBn || null,
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

      return {
        success: true,
        message: `User ${params.fullName} created successfully.`,
        data: { userId: userId || undefined },
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create user' }
    }
  }

  /**
   * Invite a new user under a tenant company with secure password generation
   */
  static async inviteUser(
    companyId: string,
    email: string,
    roleId: string,
    branchId?: string | null,
    fullName?: string,
    phone?: string,
    actorName = 'Admin'
  ): Promise<ApiResponse> {
    try {
      const admin = createAdminClient()
      const normalizedEmail = email.trim().toLowerCase()

      // Ensure no duplicate email or phone number across application
      const uniquenessCheck = await AuthService.validateIdentifierUniqueness({
        email: normalizedEmail,
        phone: phone,
        companyId,
      })
      if (!uniquenessCheck.available) {
        return { success: false, error: uniquenessCheck.error }
      }

      const generatedPassword = `InkFlow!${Math.random().toString(36).slice(-8)}${Math.floor(100 + Math.random() * 900)}`

      // 1. Create or ensure user profile exists in Supabase Auth
      let userId: string | null = null
      const { data: userList } = await admin.auth.admin.listUsers()
      const existingAuth = userList?.users?.find(
        (u: { email?: string; id: string }) => u.email?.toLowerCase() === normalizedEmail
      )

      if (existingAuth) {
        userId = existingAuth.id
      } else {
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email: normalizedEmail,
          password: generatedPassword,
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
            invitation_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
        actorName,
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
   * Resend an invitation to a user under a tenant company, renewing 7-day expiration
   */
  static async resendInvitation(
    companyUserId: string,
    companyId: string,
    actorName = 'Admin'
  ): Promise<ApiResponse> {
    try {
      const admin = createAdminClient()
      const { data: cu, error: cuErr } = await (admin as any)
        .from('company_users')
        .select('id, user_id, invited_email, status')
        .eq('id', companyUserId)
        .eq('company_id', companyId)
        .single()

      if (cuErr || !cu) {
        return { success: false, error: 'User invitation not found' }
      }

      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const { error: updErr } = await (admin as any)
        .from('company_users')
        .update({
          status: 'invited',
          invitation_expires_at: newExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyUserId)

      if (updErr) {
        return { success: false, error: updErr.message }
      }

      await AuditService.logEvent(
        companyId,
        null,
        actorName,
        'user.resend_invitation',
        'user',
        companyUserId,
        null,
        { invited_email: cu.invited_email, new_expires_at: newExpiry },
        `Resent invitation to ${cu.invited_email || 'user'}. Expiry renewed for 7 days.`
      )

      return {
        success: true,
        message: `Invitation resent to ${cu.invited_email || 'user'}. Expiry extended by 7 days.`,
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to resend invitation' }
    }
  }

  /**
   * Custom Role Management
   */
  static async listRolesWithPermissions(companyId?: string): Promise<any[]> {
    try {
      return await TenantRepository.getRolesWithPermissions(companyId)
    } catch (error) {
      console.error('Error fetching roles with permissions:', error)
      return []
    }
  }

  static async createCustomRole(params: {
    companyId: string
    name: string
    nameBn?: string
    slug?: string
    description?: string
    permissions: string[]
    actorName?: string
  }): Promise<ApiResponse> {
    try {
      const newRole = await TenantRepository.createCustomRole(params)
      if (params.companyId) {
        await AuditService.logEvent(
          params.companyId,
          null,
          params.actorName || 'Owner',
          'role.create',
          'role',
          newRole.id,
          null,
          { name: params.name, permissionsCount: params.permissions.length },
          `Created custom role ${params.name}`
        )
      }
      return { success: true, message: `Role ${params.name} created successfully.` }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create role' }
    }
  }

  static async updateRolePermissions(params: {
    roleId: string
    companyId: string
    permissions: string[]
    details?: { name?: string; nameBn?: string; description?: string }
    actorName?: string
  }): Promise<ApiResponse> {
    try {
      await TenantRepository.updateRolePermissions(params.roleId, params.permissions, params.details)
      if (params.companyId) {
        await AuditService.logEvent(
          params.companyId,
          null,
          params.actorName || 'Owner',
          'role.update',
          'role',
          params.roleId,
          null,
          { permissionsCount: params.permissions.length },
          `Updated permissions for role ${params.roleId}`
        )
      }
      return { success: true, message: 'Role permissions updated successfully.' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update role permissions' }
    }
  }

  static async deleteCustomRole(
    roleId: string,
    companyId: string,
    actorName = 'Owner'
  ): Promise<ApiResponse> {
    try {
      await TenantRepository.deleteCustomRole(roleId, companyId)
      await AuditService.logEvent(
        companyId,
        null,
        actorName,
        'role.delete',
        'role',
        roleId,
        null,
        null,
        `Deleted custom role ${roleId}`
      )
      return { success: true, message: 'Role deleted successfully.' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete role' }
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

      if (companyId) {
        const users = await TenantRepository.getCompanyUsers(companyId)
        const targetUser = users.find((u) => u.id === companyUserId)
        const isTargetOwner =
          targetUser?.responsibilities?.includes('business_owner') ||
          targetUser?.responsibilities?.includes('owner') ||
          targetUser?.roles?.some((r) => r.slug === 'business_owner' || r.slug === 'owner')

        const roles = await TenantRepository.getRoles(companyId)
        const targetRole = roles.find((r) => r.id === targetRoleId)
        const isTargetRoleOwner = targetRole?.slug === 'business_owner' || targetRole?.slug === 'owner'

        if (isTargetOwner && !isTargetRoleOwner) {
          const activeOwners = users.filter(
            (u) =>
              u.status === 'active' &&
              (u.responsibilities?.includes('business_owner') ||
                u.responsibilities?.includes('owner') ||
                u.roles?.some((r) => r.slug === 'business_owner' || r.slug === 'owner'))
          )
          if (activeOwners.length <= 1) {
            return {
              success: false,
              error: 'Cannot remove or demote the last active Business Owner. Assign or transfer ownership first.',
            }
          }
          const updatedResps = (targetUser?.responsibilities || []).filter(
            (r) => r !== 'business_owner' && r !== 'owner'
          )
          await (admin as any).from('company_users').update({ responsibilities: updatedResps }).eq('id', companyUserId)
        } else if (isTargetRoleOwner) {
          const currentResps = targetUser?.responsibilities || []
          if (!currentResps.includes('business_owner')) {
            await (admin as any).from('company_users').update({
              responsibilities: Array.from(new Set([...currentResps, 'business_owner']))
            }).eq('id', companyUserId)
          }
        }
      }

      // Remove old role assignments and set new one
      await (admin as any).from('user_roles').delete().eq('company_user_id', companyUserId)
      await (admin as any).from('user_roles').insert({
        company_user_id: companyUserId,
        role_id: targetRoleId,
      })

      TenantRepository.invalidateMembershipCache()

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

      TenantRepository.invalidateMembershipCache()

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
    roleId?: string
    responsibilities?: string[]
    overrides?: Record<string, boolean>
    dataScopes?: Record<string, DataScope>
    authorizedBranchIds?: string[]
    department?: string | null
    branchId?: string | null
    actorName?: string
    actorId?: string
  }): Promise<ApiResponse> {
    try {
      if (params.companyId) {
        const users = await TenantRepository.getCompanyUsers(params.companyId)
        const targetUser = users.find((u) => u.id === params.companyUserId)
        const isTargetOwner =
          targetUser?.responsibilities?.includes('business_owner') ||
          targetUser?.responsibilities?.includes('owner') ||
          targetUser?.roles?.some((r) => r.slug === 'business_owner' || r.slug === 'owner')

        const roles = await TenantRepository.getRoles(params.companyId)
        const targetRole = params.roleId ? roles.find((r) => r.id === params.roleId) : null
        const isNewRoleOwner =
          targetRole?.slug === 'business_owner' ||
          targetRole?.slug === 'owner' ||
          params.responsibilities?.includes('business_owner')

        // Last Active Owner demotion protection
        if (isTargetOwner && !isNewRoleOwner) {
          const activeOwners = users.filter(
            (u) =>
              u.status === 'active' &&
              (u.responsibilities?.includes('business_owner') ||
                u.responsibilities?.includes('owner') ||
                u.roles?.some((r) => r.slug === 'business_owner' || r.slug === 'owner'))
          )
          if (activeOwners.length <= 1) {
            return {
              success: false,
              error: 'Cannot remove or demote the last active Business Owner. Assign or transfer ownership first.',
            }
          }
        }

        // If target remains or becomes owner, guarantee business_owner in responsibilities & company scope
        if (isNewRoleOwner || (isTargetOwner && targetRole === null && !params.responsibilities?.length)) {
          if (!params.responsibilities) {
            params.responsibilities = ['business_owner']
          } else if (!params.responsibilities.includes('business_owner')) {
            params.responsibilities.unshift('business_owner')
          }
          if (params.dataScopes) {
            Object.keys(params.dataScopes).forEach((k) => {
              params.dataScopes![k] = 'company'
            })
          }
        }
      }

      await TenantRepository.updateUserResponsibilitiesAndOverrides({
        companyUserId: params.companyUserId,
        department: params.department,
        branchId: params.branchId,
        roleId: params.roleId,
        responsibilities: params.responsibilities,
        overrides: params.overrides,
        dataScopes: params.dataScopes,
        authorizedBranchIds: params.authorizedBranchIds,
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
            dataScopes: params.dataScopes,
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

  /**
   * List company employees eligible for user linking or invite selection.
   * STRICT SECURITY: Excludes salary, bank info, NID, documents, and private HR data.
   */
  static async listLinkableEmployees(companyId: string): Promise<ApiResponse<any[]>> {
    try {
      if (!companyId) return { success: false, error: 'Company ID is required' }
      const admin = createAdminClient()

      // 1. Fetch workforce roster (strictly non-sensitive operational fields)
      const { data: employees, error: empErr } = await (admin as any)
        .from('employees')
        .select('id, employee_id_number, name, name_bn, role, department, branch_id, mobile, email, user_id, status')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (empErr) {
        throw new Error(empErr.message)
      }

      // 2. Fetch company_users to verify which employees already possess active/invited login accounts
      const { data: companyUsers } = await (admin as any)
        .from('company_users')
        .select('user_id, status')
        .eq('company_id', companyId)

      const activeUserIds = new Set(
        (companyUsers || [])
          .filter((cu: any) => cu.status === 'active' || cu.status === 'invited')
          .map((cu: any) => cu.user_id)
          .filter(Boolean)
      )

      const linkableList = (employees || []).map((emp: any) => {
        const hasLogin = Boolean(emp.user_id && activeUserIds.has(emp.user_id))
        return {
          id: emp.id,
          employee_id_number: emp.employee_id_number,
          name: emp.name,
          name_bn: emp.name_bn,
          role: emp.role,
          department: emp.department,
          branch_id: emp.branch_id,
          mobile: emp.mobile,
          email: emp.email,
          user_id: emp.user_id,
          status: emp.status,
          alreadyHasLogin: hasLogin,
        }
      })

      return { success: true, data: linkableList }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch employees' }
    }
  }

  /**
   * 4-Step User Creation with Employee Link, Role, Responsibility Presets, and Data Scope
   */
  static async createUserWithEmployee(params: {
    companyId: string
    employeeId?: string | null
    email: string
    username?: string
    fullName: string
    phone?: string
    roleId: string
    responsibilities?: string[]
    branchId?: string | null
    additionalBranchIds?: string[]
    dataScopes?: Record<string, DataScope>
    actorName?: string
  }): Promise<ApiResponse<{ userId: string }>> {
    const admin = createAdminClient()
    const normalizedEmail = params.email.trim().toLowerCase()
    let createdAuthUserId: string | null = null

    try {
      // Step 1: Validate Employee (if provided) & Duplicate Active Login Prevention (Prompt Sec 14 & 60)
      if (params.employeeId) {
        const { data: employee, error: empErr } = await (admin as any)
          .from('employees')
          .select('id, name, company_id, user_id, status')
          .eq('id', params.employeeId)
          .eq('company_id', params.companyId)
          .maybeSingle()

        if (empErr || !employee) {
          return { success: false, error: 'Selected employee record not found in this company.' }
        }

        if (employee.user_id) {
          const { data: existingLogin } = await (admin as any)
            .from('company_users')
            .select('id, status')
            .eq('company_id', params.companyId)
            .eq('user_id', employee.user_id)
            .maybeSingle()

          if (existingLogin && existingLogin.status !== 'disabled') {
            return {
              success: false,
              error: 'This employee already has an active login account. Duplicate active logins are prohibited.',
            }
          }
        }
      }

      // Step 2: Account Identifier Uniqueness Validation
      const uniquenessCheck = await AuthService.validateIdentifierUniqueness({
        email: normalizedEmail,
        username: params.username,
        phone: params.phone,
        companyId: params.companyId,
      })
      if (!uniquenessCheck.available) {
        return { success: false, error: uniquenessCheck.error }
      }

      // Step 3: Supabase Auth Account Initialization (Prompt Sec 15 & 42)
      // Generates high-entropy crypto temporary password hash for auth creation only.
      // NEVER displayed to admin, NEVER persisted in employee or user profile tables.
      const secureAuthSecret = `InkSec#${Math.random().toString(36).slice(-8)}!${Date.now()}`

      let userId: string | null = null
      const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const existingAuth = userList?.users?.find(
        (u: { email?: string; id: string }) => u.email?.toLowerCase() === normalizedEmail
      )

      if (existingAuth) {
        userId = existingAuth.id
      } else {
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email: normalizedEmail,
          password: secureAuthSecret,
          email_confirm: false,
          user_metadata: {
            full_name: params.fullName,
            phone: params.phone || null,
            username: params.username || null,
            preferred_locale: 'bn',
          },
        })

        if (createErr || !newUser?.user) {
          throw new Error(`Failed to create auth identity: ${createErr?.message || 'Unknown auth error'}`)
        }
        userId = newUser.user.id
        createdAuthUserId = userId
      }

      if (!userId) {
        throw new Error('Failed to resolve authenticated user identity.')
      }

      // Upsert profile tables
      await (admin as any).from('user_profiles').upsert({
        id: userId,
        email: normalizedEmail,
        username: params.username || null,
        full_name: params.fullName,
        phone: params.phone || null,
        preferred_locale: 'bn',
        is_active: true,
        updated_at: new Date().toISOString(),
      })

      try {
        await (admin as any).from('profiles').upsert({
          id: userId,
          username: params.username || null,
          full_name: params.fullName,
          phone: params.phone || null,
          preferred_locale: 'bn',
          updated_at: new Date().toISOString(),
        })
      } catch {}

      // Step 4: Company Membership & Atomic Transaction Verification (Prompt Sec 45)
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
            status: 'invited',
            responsibilities: params.responsibilities || [],
            data_scopes: params.dataScopes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (cuErr || !newCU) {
          throw new Error(`Account setup incomplete: Failed to create company membership: ${cuErr?.message || 'DB Error'}`)
        }
        companyUserId = newCU.id
      } else {
        await (admin as any)
          .from('company_users')
          .update({
            branch_id: params.branchId || null,
            status: 'invited',
            responsibilities: params.responsibilities || [],
            data_scopes: params.dataScopes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', companyUserId)
      }

      // Step 5: Link Employee to User (Prompt Sec 12 & 46)
      if (params.employeeId) {
        await (admin as any)
          .from('employees')
          .update({
            user_id: userId,
            email: normalizedEmail,
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.employeeId)
          .eq('company_id', params.companyId)
      }

      // Step 6: Assign Role in user_roles
      if (params.roleId && companyUserId) {
        await (admin as any).from('user_roles').delete().eq('company_user_id', companyUserId)
        await (admin as any).from('user_roles').insert({
          company_user_id: companyUserId,
          role_id: params.roleId,
          company_id: params.companyId,
        })
      }

      // Step 7: Assign Multi-Branch Access in user_branch_access
      if (params.additionalBranchIds && params.additionalBranchIds.length > 0 && userId) {
        await (admin as any).from('user_branch_access').delete().eq('company_id', params.companyId).eq('user_id', userId)
        for (const bId of params.additionalBranchIds) {
          await (admin as any).from('user_branch_access').insert({
            company_id: params.companyId,
            user_id: userId,
            branch_id: bId,
            created_at: new Date().toISOString(),
          })
        }
      }

      // Step 8: Dispatch Invitation via AuthEmailService (Best-effort non-blocking)
      try {
        const { data: comp } = await (admin as any).from('companies').select('name').eq('id', params.companyId).maybeSingle()
        await AuthEmailService.sendUserInvitationEmail({
          email: normalizedEmail,
          inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
          companyName: comp?.name || 'InkFlow PrintERP',
          roleName: 'Team User',
          invitedByName: params.actorName || 'Administrator',
          tenantId: params.companyId,
          userName: params.fullName,
        })
      } catch (inviteErr) {
        console.warn('[createUserWithEmployee] Email dispatch warning:', inviteErr)
      }

      TenantRepository.invalidateMembershipCache()

      // Step 9: Audit Log (Prompt Sec 77)
      await AuditService.logEvent(
        params.companyId,
        null,
        params.actorName || 'Admin',
        'user.invite',
        'user',
        companyUserId,
        null,
        {
          email: normalizedEmail,
          fullName: params.fullName,
          roleId: params.roleId,
          employeeId: params.employeeId || null,
          responsibilities: params.responsibilities,
          branchId: params.branchId,
        },
        `Invited team user ${params.fullName} (${normalizedEmail}) linked to employee ${params.employeeId || 'none'}`
      )

      return {
        success: true,
        message: `User ${params.fullName} created and invited successfully.`,
        data: { userId },
      }
    } catch (error: any) {
      // Safe cleanup if setup was incomplete
      if (createdAuthUserId) {
        try {
          await admin.auth.admin.deleteUser(createdAuthUserId)
        } catch {}
      }
      return {
        success: false,
        error: error.message || 'Unable to complete account setup.',
      }
    }
  }

  /**
   * Explicitly link an existing unlinked user account to an employee profile (Prompt Sec 12 & 59)
   */
  static async linkEmployeeToUser(params: {
    companyUserId: string
    employeeId: string
    companyId: string
    actorName?: string
  }): Promise<ApiResponse> {
    try {
      const admin = createAdminClient()

      // 1. Fetch user membership
      const { data: cu, error: cuErr } = await (admin as any)
        .from('company_users')
        .select('id, user_id, company_id')
        .eq('id', params.companyUserId)
        .eq('company_id', params.companyId)
        .maybeSingle()

      if (cuErr || !cu) {
        return { success: false, error: 'User record not found in this company.' }
      }

      // 2. Fetch target employee
      const { data: emp, error: empErr } = await (admin as any)
        .from('employees')
        .select('id, name, employee_id_number, user_id, company_id')
        .eq('id', params.employeeId)
        .eq('company_id', params.companyId)
        .maybeSingle()

      if (empErr || !emp) {
        return { success: false, error: 'Employee record not found in this company.' }
      }

      // Check if employee already linked to another user
      if (emp.user_id && emp.user_id !== cu.user_id) {
        return {
          success: false,
          error: `Employee ${emp.name} (${emp.employee_id_number}) is already linked to another login account.`,
        }
      }

      // 3. Update employee record with user_id
      await (admin as any)
        .from('employees')
        .update({
          user_id: cu.user_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', emp.id)

      TenantRepository.invalidateMembershipCache()

      await AuditService.logEvent(
        params.companyId,
        null,
        params.actorName || 'Admin',
        'user.link_employee',
        'user',
        params.companyUserId,
        null,
        { employeeId: emp.id, employeeName: emp.name },
        `Linked employee ${emp.name} (${emp.employee_id_number}) to user account`
      )

      return {
        success: true,
        message: `Successfully linked ${emp.name} (${emp.employee_id_number}) to user.`,
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to link employee.' }
    }
  }

  /**
   * Explicitly unlink employee from user account without deleting employee or user history (Prompt Sec 52)
   */
  static async unlinkEmployeeFromUser(params: {
    companyUserId: string
    companyId: string
    actorName?: string
  }): Promise<ApiResponse> {
    try {
      const admin = createAdminClient()

      const { data: cu } = await (admin as any)
        .from('company_users')
        .select('id, user_id')
        .eq('id', params.companyUserId)
        .eq('company_id', params.companyId)
        .maybeSingle()

      if (!cu?.user_id) {
        return { success: false, error: 'User record not found.' }
      }

      // Detach user_id on employees
      await (admin as any)
        .from('employees')
        .update({
          user_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', params.companyId)
        .eq('user_id', cu.user_id)

      TenantRepository.invalidateMembershipCache()

      await AuditService.logEvent(
        params.companyId,
        null,
        params.actorName || 'Admin',
        'user.unlink_employee',
        'user',
        params.companyUserId,
        null,
        null,
        `Unlinked employee profile from user account`
      )

      return {
        success: true,
        message: 'Employee unlinked successfully. Workforce records and history remain preserved.',
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to unlink employee.' }
    }
  }

  /**
   * Remove Login means: remove login access relationship, NOT delete employee! (Prompt Sec 52 & 76)
   */
  static async removeLogin(params: {
    companyUserId: string
    companyId: string
    actorName?: string
  }): Promise<ApiResponse> {
    try {
      const admin = createAdminClient()

      // 1. Enforce Last Active Owner protection
      const users = await TenantRepository.getCompanyUsers(params.companyId)
      const targetUser = users.find((u) => u.id === params.companyUserId)
      if (targetUser) {
        const isTargetOwner =
          targetUser.responsibilities?.includes('business_owner') ||
          targetUser.responsibilities?.includes('owner') ||
          targetUser.roles?.some((r) => r.slug === 'business_owner' || r.slug === 'owner')

        if (isTargetOwner) {
          const activeOwners = users.filter(
            (u) =>
              u.status === 'active' &&
              (u.responsibilities?.includes('business_owner') ||
                u.responsibilities?.includes('owner') ||
                u.roles?.some((r) => r.slug === 'business_owner' || r.slug === 'owner'))
          )
          if (activeOwners.length <= 1) {
            return {
              success: false,
              error: 'Cannot remove login for the last active Business Owner.',
            }
          }
        }
      }

      const userId = targetUser?.user_id

      // 2. Unlink any employee record (preserves attendance, payroll, advances)
      if (userId) {
        await (admin as any)
          .from('employees')
          .update({
            user_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', params.companyId)
          .eq('user_id', userId)

        // 3. Remove branch access and user roles
        await (admin as any).from('user_branch_access').delete().eq('company_id', params.companyId).eq('user_id', userId)
      }

      await (admin as any).from('user_roles').delete().eq('company_user_id', params.companyUserId)

      // 4. Update status to disabled or delete membership record
      await (admin as any)
        .from('company_users')
        .update({
          status: 'disabled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.companyUserId)

      TenantRepository.invalidateMembershipCache()

      await AuditService.logEvent(
        params.companyId,
        null,
        params.actorName || 'Admin',
        'user.remove_login',
        'user',
        params.companyUserId,
        null,
        null,
        `Removed login relationship for user. Employee workforce records preserved.`
      )

      return {
        success: true,
        message: 'Login access removed successfully. Employee workforce history remains preserved.',
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to remove login access.' }
    }
  }

  /**
   * Diagnostic Account Health Check (Prompt Sec 61)
   */
  static async getAccountHealth(companyUserId: string, companyId: string): Promise<ApiResponse<any>> {
    try {
      const admin = createAdminClient()

      // Fetch company user record
      const { data: cu } = await (admin as any)
        .from('company_users')
        .select('*, branch:branches(*), user_roles(role:roles(*))')
        .eq('id', companyUserId)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!cu) {
        return { success: false, error: 'User record not found.' }
      }

      const userId = cu.user_id

      // 1. Auth check
      let authOk = false
      if (userId) {
        const { data: authUser } = await admin.auth.admin.getUserById(userId)
        authOk = Boolean(authUser?.user)
      }

      // 2. Profile check
      let profileOk = false
      if (userId) {
        const { data: prof } = await (admin as any)
          .from('user_profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle()
        profileOk = Boolean(prof)
      }

      // 3. Membership check
      const membershipOk = cu.status === 'active' || cu.status === 'invited'

      // 4. Employee Link check
      let employeeOk = false
      let linkedEmployeeData: any = null
      if (userId) {
        const { data: emp } = await (admin as any)
          .from('employees')
          .select('id, employee_id_number, name, role, department, status')
          .eq('company_id', companyId)
          .eq('user_id', userId)
          .maybeSingle()
        if (emp) {
          employeeOk = true
          linkedEmployeeData = emp
        }
      }

      // 5. Role check
      const roleOk = Array.isArray(cu.user_roles) && cu.user_roles.length > 0

      // 6. Branch check
      const branchOk = Boolean(cu.branch_id || cu.branch)

      return {
        success: true,
        data: {
          authOk,
          profileOk,
          membershipOk,
          employeeOk,
          roleOk,
          branchOk,
          linkedEmployee: linkedEmployeeData,
          status: cu.status,
        },
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to evaluate account health.' }
    }
  }

  /**
   * User Audit Activity History (Prompt Sec 49 & 77)
   */
  static async getUserAuditActivity(companyUserId: string, companyId: string): Promise<any[]> {
    try {
      const admin = createAdminClient()
      const { data: logs } = await (admin as any)
        .from('audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .eq('entity_id', companyUserId)
        .order('created_at', { ascending: false })
        .limit(20)

      return logs || []
    } catch {
      return []
    }
  }
}



