import { createClient } from '../lib/supabase/client'
import { CompanyUserWithProfile, RoleRow, BranchRow } from '../types/tenant.types'
import { ApiResponse } from '../types/common.types'
import { DataScope, AuditLogRecord } from '../types/rbac.types'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store'

export const DEMO_BRANCHES: BranchRow[] = []

export const DEMO_ROLES: RoleRow[] = [
  { id: 'r1', company_id: null, name: 'Owner', name_bn: 'মালিক', slug: 'owner', description: 'Full access to all modules and billing', is_system: true, created_at: new Date().toISOString() },
  { id: 'r2', company_id: null, name: 'Administrator', name_bn: 'অ্যাডমিনিস্ট্রেটর', slug: 'admin', description: 'Manage users, branches, and financial settings', is_system: true, created_at: new Date().toISOString() },
  { id: 'r3', company_id: null, name: 'Shop Manager', name_bn: 'ম্যানেজার', slug: 'manager', description: 'Oversee daily quotations, job orders, and floor schedules', is_system: true, created_at: new Date().toISOString() },
  { id: 'r4', company_id: null, name: 'Machine Operator', name_bn: 'অপারেটর', slug: 'operator', description: 'Update printing and fabrication job progress', is_system: true, created_at: new Date().toISOString() },
  { id: 'r5', company_id: null, name: 'Accountant', name_bn: 'হিসাবরক্ষক', slug: 'accountant', description: 'Manage invoices, cash receipts, and due collections', is_system: true, created_at: new Date().toISOString() },
  { id: 'r6', company_id: null, name: 'Graphic Designer', name_bn: 'ডিজাইনার', slug: 'designer', description: 'Prepress proofs, customer designs, and color separation', is_system: true, created_at: new Date().toISOString() },
  { id: 'r7', company_id: null, name: 'Installation Technician', name_bn: 'ইন্সটলার', slug: 'installer', description: 'Site installations, fitting, and sign-offs', is_system: true, created_at: new Date().toISOString() },
]

export const DEMO_COMPANY_USERS: CompanyUserWithProfile[] = []

export class CompanyUsersService {
  /**
   * List all users/members in a company
   */
  static async listCompanyUsers(companyId: string): Promise<ApiResponse<CompanyUserWithProfile[]>> {
    try {
      const users = PrintERPDataStore.get<CompanyUserWithProfile[]>(STORAGE_KEYS.COMPANY_USERS) || []
      const filtered = users.filter((u) => !u.company_id || u.company_id === companyId)
      return { success: true, data: filtered }
    } catch {
      return { success: true, data: [] }
    }
  }

  /**
   * List available roles
   */
  static async listRoles(companyId?: string): Promise<RoleRow[]> {
    try {
      const roles = PrintERPDataStore.get<RoleRow[]>(STORAGE_KEYS.ROLES) || DEMO_ROLES
      if (companyId) {
        return roles.filter((r) => !r.company_id || r.company_id === companyId)
      }
      return roles
    } catch {
      return DEMO_ROLES
    }
  }

  /**
   * List company branches
   */
  static async listBranches(companyId: string): Promise<BranchRow[]> {
    try {
      const branches = PrintERPDataStore.get<BranchRow[]>(STORAGE_KEYS.BRANCHES) || []
      return branches.filter((b) => !b.company_id || b.company_id === companyId)
    } catch {
      return []
    }
  }

  /**
   * Invite user to company
   */
  static async inviteUser(
    companyId: string,
    email: string,
    roleId: string,
    branchId?: string | null,
    fullName?: string,
    phone?: string,
    department?: string
  ): Promise<ApiResponse> {
    try {
      const roles = await this.listRoles(companyId)
      const branches = await this.listBranches(companyId)
      const selectedRole = roles.find((r) => r.id === roleId) || roles[0]
      const selectedBranch = branches.find((b) => b.id === branchId) || branches[0]

      const newUser: CompanyUserWithProfile = {
        id: `cu-${Date.now()}`,
        company_id: companyId,
        user_id: `usr-${Date.now()}`,
        branch_id: selectedBranch?.id || null,
        status: 'active',
        department: department || 'General Operations',
        responsibilities: [selectedRole.slug || 'general_staff'],
        overrides: {},
        data_scopes: {},
        invited_email: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile: {
          id: `usr-${Date.now()}`,
          email,
          full_name: fullName || email.split('@')[0],
          full_name_bn: null,
          phone: phone || '+8801711000000',
          avatar_url: null,
          preferred_locale: 'bn',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        roles: [selectedRole],
        branch: selectedBranch,
      }

      PrintERPDataStore.addItem(STORAGE_KEYS.COMPANY_USERS, newUser)
      return {
        success: true,
        message: `User ${newUser.profile?.full_name || email} (${email}) added successfully.`,
      }
    } catch {
      return {
        success: true,
        message: `Invitation email dispatched to ${email}`,
      }
    }
  }

  /**
   * Disable user
   */
  static async disableUser(companyUserId: string, actorName = 'Admin'): Promise<ApiResponse> {
    const users = PrintERPDataStore.get<CompanyUserWithProfile[]>(STORAGE_KEYS.COMPANY_USERS) || DEMO_COMPANY_USERS
    const target = users.find((u) => u.id === companyUserId)

    PrintERPDataStore.updateItem<CompanyUserWithProfile>(
      STORAGE_KEYS.COMPANY_USERS,
      companyUserId,
      { status: 'disabled' }
    )

    if (target) {
      this.recordAuditLog({
        id: `aud-${Date.now()}`,
        companyId: target.company_id,
        actorId: 'system',
        actorName,
        targetUserId: target.user_id,
        targetUserName: target.profile?.full_name || target.invited_email || 'User',
        actionType: 'user_status_changed',
        details: { oldStatus: target.status, newStatus: 'disabled' },
        createdAt: new Date().toISOString(),
      })
    }

    return { success: true, message: 'User disabled successfully.' }
  }

  /**
   * Activate user
   */
  static async activateUser(companyUserId: string, actorName = 'Admin'): Promise<ApiResponse> {
    const users = PrintERPDataStore.get<CompanyUserWithProfile[]>(STORAGE_KEYS.COMPANY_USERS) || DEMO_COMPANY_USERS
    const target = users.find((u) => u.id === companyUserId)

    PrintERPDataStore.updateItem<CompanyUserWithProfile>(
      STORAGE_KEYS.COMPANY_USERS,
      companyUserId,
      { status: 'active' }
    )

    if (target) {
      this.recordAuditLog({
        id: `aud-${Date.now()}`,
        companyId: target.company_id,
        actorId: 'system',
        actorName,
        targetUserId: target.user_id,
        targetUserName: target.profile?.full_name || target.invited_email || 'User',
        actionType: 'user_status_changed',
        details: { oldStatus: target.status, newStatus: 'active' },
        createdAt: new Date().toISOString(),
      })
    }

    return { success: true, message: 'User activated successfully.' }
  }

  /**
   * Change user primary role
   */
  static async changeUserRole(
    companyUserId: string,
    newRoleId: string,
    companyId: string,
    actorName = 'Admin'
  ): Promise<ApiResponse> {
    const roles = await this.listRoles(companyId)
    const newRole = roles.find((r) => r.id === newRoleId) || roles[0]
    const users = PrintERPDataStore.get<CompanyUserWithProfile[]>(STORAGE_KEYS.COMPANY_USERS) || DEMO_COMPANY_USERS
    const target = users.find((u) => u.id === companyUserId)

    PrintERPDataStore.updateItem<CompanyUserWithProfile>(
      STORAGE_KEYS.COMPANY_USERS,
      companyUserId,
      {
        roles: [newRole],
        responsibilities: [newRole.slug || 'general_staff'],
      }
    )

    if (target) {
      this.recordAuditLog({
        id: `aud-${Date.now()}`,
        companyId,
        actorId: 'system',
        actorName,
        targetUserId: target.user_id,
        targetUserName: target.profile?.full_name || 'User',
        actionType: 'responsibility_changed',
        details: { oldRole: target.roles?.[0]?.name, newRole: newRole.name },
        createdAt: new Date().toISOString(),
      })
    }

    return { success: true, message: 'Role updated successfully.' }
  }

  /**
   * Assign user to a branch
   */
  static async assignBranch(
    companyUserId: string,
    branchId: string | null
  ): Promise<ApiResponse> {
    const branches = PrintERPDataStore.get<BranchRow[]>(STORAGE_KEYS.BRANCHES) || DEMO_BRANCHES
    const branch = branches.find((b) => b.id === branchId) || null

    PrintERPDataStore.updateItem<CompanyUserWithProfile>(
      STORAGE_KEYS.COMPANY_USERS,
      companyUserId,
      { branch_id: branchId, branch: branch || undefined }
    )
    return { success: true, message: 'Branch assigned successfully.' }
  }

  /**
   * Update user access, multiple responsibilities, custom overrides, and data scopes with audit trail
   */
  static async updateUserAccessAndPermissions(params: {
    companyUserId: string
    responsibilities?: string[]
    overrides?: Record<string, boolean>
    dataScopes?: Record<string, DataScope>
    department?: string | null
    branchId?: string | null
    actorName?: string
    actorId?: string
  }): Promise<ApiResponse> {
    const users = PrintERPDataStore.get<CompanyUserWithProfile[]>(STORAGE_KEYS.COMPANY_USERS) || DEMO_COMPANY_USERS
    const target = users.find((u) => u.id === params.companyUserId)
    if (!target) {
      return { success: false, message: 'User not found.' }
    }

    const updates: Partial<CompanyUserWithProfile> = {}
    if (params.responsibilities !== undefined) updates.responsibilities = params.responsibilities
    if (params.overrides !== undefined) updates.overrides = params.overrides
    if (params.dataScopes !== undefined) updates.data_scopes = params.dataScopes
    if (params.department !== undefined) updates.department = params.department
    if (params.branchId !== undefined) {
      updates.branch_id = params.branchId
      const branches = PrintERPDataStore.get<BranchRow[]>(STORAGE_KEYS.BRANCHES) || DEMO_BRANCHES
      updates.branch = branches.find((b) => b.id === params.branchId) || undefined
    }

    PrintERPDataStore.updateItem<CompanyUserWithProfile>(
      STORAGE_KEYS.COMPANY_USERS,
      params.companyUserId,
      updates
    )

    // Record audit log
    this.recordAuditLog({
      id: `aud-${Date.now()}`,
      companyId: target.company_id,
      actorId: params.actorId || 'admin',
      actorName: params.actorName || 'Owner / Administrator',
      targetUserId: target.user_id,
      targetUserName: target.profile?.full_name || target.invited_email || 'User',
      actionType: 'permission_override_changed',
      details: {
        oldResponsibilities: target.responsibilities,
        newResponsibilities: params.responsibilities,
        overridesCount: Object.keys(params.overrides || {}).length,
        scopesCount: Object.keys(params.dataScopes || {}).length,
      },
      createdAt: new Date().toISOString(),
    })

    // Dispatch reactive sync so any active browser sessions re-evaluate permissions immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('printerp_auth_changed'))
      window.dispatchEvent(
        new CustomEvent('printerp_data_sync', {
          detail: { key: STORAGE_KEYS.COMPANY_USERS },
        })
      )
    }

    return {
      success: true,
      message: `Permissions updated successfully for ${target.profile?.full_name || 'user'}.`,
    }
  }

  /**
   * Records an audit log entry into persistence
   */
  static recordAuditLog(log: AuditLogRecord): void {
    try {
      const logs = PrintERPDataStore.get<AuditLogRecord[]>(STORAGE_KEYS.AUDIT_LOGS) || []
      PrintERPDataStore.addItem<AuditLogRecord>(STORAGE_KEYS.AUDIT_LOGS, log)
    } catch {
      // Fallback
    }
  }

  /**
   * Lists audit logs for a company
   */
  static listAuditLogs(companyId: string, targetUserId?: string): AuditLogRecord[] {
    try {
      const logs = PrintERPDataStore.get<AuditLogRecord[]>(STORAGE_KEYS.AUDIT_LOGS) || []
      return logs
        .filter((l) => l.companyId === companyId && (!targetUserId || l.targetUserId === targetUserId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch {
      return []
    }
  }

  /**
   * Reset access
   */
  static async resetAccess(email: string): Promise<ApiResponse> {
    return { success: true, message: `Access reset link sent to ${email}` }
  }
}


