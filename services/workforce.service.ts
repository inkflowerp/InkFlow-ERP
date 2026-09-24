// ==============================================================================
// InkFlow ERP - Authoritative Workforce, Attendance, Overtime & Payroll Service
// Orchestrates Business Logic, Double-Entry General Ledger, Audit Trails & Costing
// ==============================================================================

import { WorkforceRepository } from '../lib/repositories/workforce.repository.ts'
import { CostingRepository } from '../lib/repositories/costing.repository.ts'
import { FinanceRepository } from '../lib/repositories/finance.repository.ts'
import { FinanceService } from './finance.service.ts'
import { WorkforceCalculatorService } from './workforce-calculator.service.ts'
import { createAdminClient } from '../lib/supabase/admin.ts'
import { TenantRepository } from '../lib/repositories/tenant.repository.ts'
import { AuthEmailService } from './auth-email.service.ts'
import { AuthService } from './auth.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'
import type {
  EmployeeRecord,
  ShiftRecord,
  AttendanceDailySummaryRecord,
  OvertimeRecord,
  SalaryAdvanceRecord,
  PayrollPeriodRecord,
  PayrollItemRecord,
  SalaryPaymentRecord,
  WorkforceSummaryKPIs,
  EmploymentType,
  PaymentMethod,
  PortalCredentials,
} from '../types/workforce.types.ts'

export class WorkforceService {
  // ============================================================================
  // 1. WORKFORCE SUMMARY & OWNER KPIS
  // ============================================================================

  static async getWorkforceSummary(companyId: string): Promise<WorkforceSummaryKPIs> {
    const todayStr = new Date().toISOString().split('T')[0]
    const employees = await WorkforceRepository.getEmployees(companyId, { status: 'active' })
    const todaySummaries = await WorkforceRepository.getDailyAttendanceSummaries(companyId, { date: todayStr })
    const pendingOvertime = await WorkforceRepository.getOvertimeRecords(companyId, { status: 'pending_approval' })
    const approvedOvertime = await WorkforceRepository.getOvertimeRecords(companyId, { status: 'approved' })
    const advances = await WorkforceRepository.getSalaryAdvances(companyId, { isSettled: false })
    const payrollPeriods = await WorkforceRepository.getPayrollPeriods(companyId)

    // Today Attendance Stats
    const present = todaySummaries.filter((s) => s.status === 'present' || s.status === 'half_day').length
    const late = todaySummaries.filter((s) => s.status === 'late' || s.late_minutes > 0).length
    const absent = todaySummaries.filter((s) => s.status === 'absent').length
    const onLeave = todaySummaries.filter((s) => s.status === 'leave').length
    const fieldWork = todaySummaries.filter((s) => s.status === 'field_work' || s.job_order_id).length
    const currentlyWorking = todaySummaries.filter((s) => s.check_in_time && !s.check_out_time).length
    const potentialOtMins = todaySummaries.reduce((sum, s) => sum + (s.potential_ot_minutes || 0), 0)

    // Monthly Financial Stats
    const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const currentPayroll = payrollPeriods.find((p) => p.period_name.toLowerCase().includes(currentMonthName.toLowerCase())) || payrollPeriods[0]
    const grossPayroll = currentPayroll ? Number(currentPayroll.total_gross_salary || 0) : employees.reduce((sum, e) => sum + Number(e.base_salary || 0), 0)
    const approvedOtAmount = approvedOvertime.reduce((sum, ot) => sum + Number(ot.calculated_amount || 0), 0)
    const pendingOtAmount = pendingOvertime.reduce((sum, ot) => sum + Number(ot.calculated_amount || 0), 0)
    const advancesOutstanding = employees.reduce((sum, e) => sum + Number(e.current_advance_balance || 0), 0)
    const advancesDisbursedThisMonth = advances.reduce((sum, a) => sum + Number(a.amount || 0), 0)
    const unpaidSalaryDue = currentPayroll ? Number(currentPayroll.total_due_amount || currentPayroll.total_net_salary || 0) : grossPayroll

    return {
      todayAttendance: {
        totalEmployees: employees.length,
        present,
        late,
        absent,
        onLeave,
        fieldWork,
        currentlyWorking,
        potentialOtMinutes: potentialOtMins,
        potentialOtHours: Math.round((potentialOtMins / 60) * 10) / 10,
      },
      monthFinancials: {
        periodName: currentPayroll?.period_name || currentMonthName,
        grossPayroll,
        approvedOtAmount,
        pendingOtAmount,
        advancesOutstanding,
        advancesDisbursedThisMonth,
        unpaidSalaryDue,
        totalActiveStaff: employees.length,
      },
    }
  }

  // ============================================================================
  // 2. EMPLOYEES MANAGEMENT
  // ============================================================================

  static async getEmployees(companyId: string, options?: { branchId?: string; status?: string; department?: string; isDailyWorker?: boolean }) {
    return WorkforceRepository.getEmployees(companyId, options)
  }

  static async getEmployeeById(id: string, companyId: string) {
    return WorkforceRepository.getEmployeeById(id, companyId)
  }

  static async createEmployee(
    input: Partial<EmployeeRecord> & { company_id: string; name: string },
    actorId?: string,
    actorName = 'Admin'
  ): Promise<EmployeeRecord> {
    const year = new Date().getFullYear()
    const randomSeq = Math.floor(Math.random() * 900000) + 100000
    const code = input.employee_id_number || `EMP-${year}-${randomSeq}`
    const now = new Date().toISOString()

    const employeeType: EmploymentType = input.employee_type || 'permanent'
    const isDaily = Boolean(input.is_daily_worker || employeeType === 'daily_labor' || employeeType === 'daily_worker')
    const salaryBasis = input.salary_basis || (isDaily ? 'daily_rate' : employeeType === 'hourly_worker' ? 'hourly_rate' : 'monthly')

    const baseSalary = Number(input.base_salary || 0)
    const dailyRate = Number(input.daily_rate || 0)
    const hourlyRate = Number(input.hourly_rate || (baseSalary > 0 ? (baseSalary / 208).toFixed(2) : 0))
    const otRate = Number(input.overtime_hourly_rate || ((hourlyRate > 0 ? hourlyRate : 100) * 1.5).toFixed(2))

    // Ensure no duplicate credentials across login accounts (Email, Username, Phone, Badge ID)
    const uniquenessCheck = await AuthService.validateIdentifierUniqueness({
      email: input.portal_credentials?.email || input.email,
      username: input.portal_credentials?.username,
      phone: input.mobile,
      employeeIdNumber: input.employee_id_number,
      companyId: input.company_id,
    })

    if (!uniquenessCheck.available) {
      throw new Error(uniquenessCheck.error || 'Duplicate credential detected')
    }

    const employee: EmployeeRecord = {
      id: input.id || `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: input.company_id,
      branch_id: input.branch_id || null,
      user_id: input.user_id || null,
      employee_id_number: code,
      name: input.name,
      name_bn: input.name_bn || null,
      mobile: input.mobile || '+8801700000000',
      email: input.email || null,
      address: input.address || null,
      permanent_address: input.permanent_address || null,
      educational_qualification: input.educational_qualification || null,
      emergency_contact_name: input.emergency_contact_name || null,
      emergency_contact_phone: input.emergency_contact_phone || null,
      emergency_contact_relation: input.emergency_contact_relation || null,
      role: input.role || 'Staff',
      responsibilities: input.responsibilities || [input.role || 'Staff'],
      department: input.department || 'printing',
      employee_type: employeeType,
      salary_basis: salaryBasis,
      joining_date: input.joining_date || now.split('T')[0],
      contract_end_date: input.contract_end_date || null,
      allowed_monthly_leaves: input.allowed_monthly_leaves !== undefined ? input.allowed_monthly_leaves : 2,
      payment_method: input.payment_method || (input.bank_payment_info ? 'bank' : input.mfs_payment_info ? 'bkash' : 'cash'),
      base_salary: baseSalary,
      daily_rate: dailyRate,
      hourly_rate: hourlyRate,
      overtime_hourly_rate: otRate,
      current_advance_balance: Number(input.current_advance_balance || 0),
      is_daily_worker: isDaily,
      salary_structure: input.salary_structure || {
        basic: Math.round(baseSalary * 0.6),
        house_allowance: Math.round(baseSalary * 0.2),
        transport_allowance: Math.round(baseSalary * 0.1),
        food_allowance: 0,
        medical_allowance: Math.round(baseSalary * 0.1),
        other_allowances: 0,
      },
      commission_settings: input.commission_settings || null,
      duty_settings: input.duty_settings || null,
      portal_credentials: input.portal_credentials || null,
      bank_payment_info: input.bank_payment_info || null,
      mfs_payment_info: input.mfs_payment_info || null,
      profile_picture_url: input.profile_picture_url || null,
      document_attachments: input.document_attachments || null,
      status: input.status || 'active',
      notes: input.notes || null,
      created_at: now,
      updated_at: now,
    }

    const created = await WorkforceRepository.createEmployee(employee)

    // Synchronize Portal Login if requested
    let finalEmployee = created
    if (input.portal_credentials?.create_login) {
      try {
        const synced = await this.syncEmployeePortalLogin(
          created,
          input.portal_credentials,
          actorName,
          undefined,
          undefined,
          undefined,
          Boolean(input.portal_credentials.send_invitation)
        )
        if (synced?.employee) {
          finalEmployee = synced.employee
        }
      } catch (e) {
        console.warn('[WorkforceService.createEmployee] Portal sync error:', e)
      }
    }

    await WorkforceRepository.logWorkforceAudit({
      id: `wfa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: input.company_id,
      actor_id: actorId || null,
      actor_name: actorName,
      action_type: 'employee_created',
      entity_type: 'employee',
      entity_id: finalEmployee.id,
      after_state: finalEmployee as any,
      reason: `Created employee record ${finalEmployee.name} (${finalEmployee.employee_id_number})`,
      created_at: now,
    })

    return finalEmployee
  }

  static async updateEmployee(
    id: string,
    companyId: string,
    updates: Partial<EmployeeRecord>,
    actorId?: string,
    actorName = 'Admin'
  ) {
    const existing = await WorkforceRepository.getEmployeeById(id, companyId)
    if (!existing) {
      throw new Error('Employee record not found.')
    }

    // Ensure no duplicate credentials on update
    const uniquenessCheck = await AuthService.validateIdentifierUniqueness({
      email: updates.portal_credentials?.email || updates.email,
      username: updates.portal_credentials?.username,
      phone: updates.mobile,
      employeeIdNumber: updates.employee_id_number,
      excludeEmployeeId: id,
      excludeUserId: existing.user_id,
      companyId,
    })

    if (!uniquenessCheck.available) {
      throw new Error(uniquenessCheck.error || 'Duplicate credential detected')
    }

    let updated = await WorkforceRepository.updateEmployee(id, companyId, updates)

    if (updates.portal_credentials && updated) {
      try {
        const synced = await this.syncEmployeePortalLogin(
          updated,
          updates.portal_credentials,
          actorName,
          undefined,
          undefined,
          undefined,
          Boolean(updates.portal_credentials.send_invitation)
        )
        if (synced?.employee) {
          updated = synced.employee
        }
      } catch (e) {
        console.warn('[WorkforceService.updateEmployee] Portal sync error:', e)
      }
    }

    if (updated) {
      await WorkforceRepository.logWorkforceAudit({
        id: `wfa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        company_id: companyId,
        actor_id: actorId || null,
        actor_name: actorName,
        action_type: 'employee_updated',
        entity_type: 'employee',
        entity_id: id,
        before_state: existing as any,
        after_state: updated as any,
        reason: `Updated employee profile for ${updated.name}`,
        created_at: new Date().toISOString(),
      })
    }

    return updated
  }

  static async resolveRoleIdForEmployee(companyId: string, roleInput?: string): Promise<string> {
    try {
      const roles = await TenantRepository.getRoles(companyId)
      const norm = (roleInput || '').toLowerCase().trim()

      const byId = roles.find((r) => r.id === roleInput)
      if (byId) return byId.id

      const bySlug = roles.find((r) => r.slug?.toLowerCase() === norm)
      if (bySlug) return bySlug.id

      const mapping: Record<string, string> = {
        operator: 'operator',
        technician: 'operator',
        designer: 'designer',
        sales: 'sales_manager',
        sales_executive: 'sales_manager',
        accounts: 'accountant',
        accountant: 'accountant',
        billing: 'accountant',
        manager: 'production_manager',
        branch_manager: 'production_manager',
        staff: 'general_staff',
      }
      const mappedSlug = mapping[norm]
      if (mappedSlug) {
        const matched = roles.find((r) => r.slug?.toLowerCase() === mappedSlug)
        if (matched) return matched.id
      }

      const byName = roles.find((r) => r.name?.toLowerCase().includes(norm))
      if (byName) return byName.id

      const fallback = roles.find((r) => r.slug === 'operator') || roles.find((r) => r.slug === 'general_staff') || roles[0]
      return fallback ? fallback.id : '00000000-0000-0000-0000-000000000005'
    } catch {
      return '00000000-0000-0000-0000-000000000005'
    }
  }

  static async syncEmployeePortalLogin(
    employee: EmployeeRecord,
    portalCreds: PortalCredentials,
    actorName = 'Admin',
    companyName?: string,
    companySlug?: string,
    appUrl?: string,
    sendInvite = false
  ): Promise<{ employee: EmployeeRecord; inviteUrl?: string }> {
    if (!portalCreds || !portalCreds.create_login) {
      if (employee.user_id) {
        try {
          const admin = createAdminClient()
          await (admin as any)
            .from('company_users')
            .update({ status: 'disabled', updated_at: new Date().toISOString() })
            .eq('company_id', employee.company_id)
            .eq('user_id', employee.user_id)
        } catch {}
      }
      const updatedCreds: PortalCredentials = {
        ...portalCreds,
        create_login: false,
        status: 'disabled',
      }
      const updated = await WorkforceRepository.updateEmployee(employee.id, employee.company_id, {
        portal_credentials: updatedCreds,
      })
      return { employee: updated || { ...employee, portal_credentials: updatedCreds } }
    }

    let email = portalCreds.email?.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      if (employee.email && employee.email.includes('@')) {
        email = employee.email.trim().toLowerCase()
      } else {
        const cleanSlug = employee.company_id.replace(/^comp-/, '').replace(/^co-/, '')
        const uname = (portalCreds.username || employee.mobile).replace(/[^a-zA-Z0-9._-]/g, '')
        email = `${uname}@${cleanSlug}.local`
      }
    }

    const password = portalCreds.password?.trim() || `InkFlow@${Math.floor(100000 + Math.random() * 900000)}`
    let userId = employee.user_id || portalCreds.user_id || null

    try {
      const admin = createAdminClient()

      if (!userId) {
        const { data: userList } = await admin.auth.admin.listUsers()
        const existingAuth = userList?.users?.find((u) => u.email?.toLowerCase() === email)
        if (existingAuth) {
          userId = existingAuth.id
          if (portalCreds.password?.trim()) {
            await admin.auth.admin.updateUserById(userId, {
              password: portalCreds.password.trim(),
              email_confirm: true,
            })
          }
        } else {
          const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: employee.name,
              name_bn: employee.name_bn || null,
              phone: employee.mobile,
              username: portalCreds.username || email.split('@')[0],
              employee_id: employee.employee_id_number,
              preferred_locale: 'bn',
            },
          })
          if (!createErr && newUser?.user) {
            userId = newUser.user.id
          }
        }
      } else if (portalCreds.password?.trim()) {
        try {
          await admin.auth.admin.updateUserById(userId, {
            password: portalCreds.password.trim(),
            email_confirm: true,
          })
        } catch {}
      }

      if (userId) {
        await (admin as any).from('user_profiles').upsert({
          id: userId,
          email,
          username: portalCreds.username ? portalCreds.username.trim().toLowerCase() : null,
          full_name: employee.name,
          full_name_bn: employee.name_bn || null,
          phone: employee.mobile || null,
          preferred_locale: 'bn',
          is_active: true,
          updated_at: new Date().toISOString(),
        })

        try {
          await (admin as any).from('profiles').upsert({
            id: userId,
            username: portalCreds.username ? portalCreds.username.trim().toLowerCase() : null,
            full_name: employee.name,
            full_name_bn: employee.name_bn || null,
            phone: employee.mobile || null,
            preferred_locale: 'bn',
            updated_at: new Date().toISOString(),
          })
        } catch {}

        const { data: existingCU } = await (admin as any)
          .from('company_users')
          .select('id')
          .eq('company_id', employee.company_id)
          .eq('user_id', userId)
          .maybeSingle()

        let companyUserId = existingCU?.id
        const assignedRole = portalCreds.role || employee.role || 'operator'
        const normalizedRole = assignedRole === 'sales' ? 'sales_manager' : assignedRole

        if (!companyUserId) {
          const { data: newCU } = await (admin as any)
            .from('company_users')
            .insert({
              company_id: employee.company_id,
              user_id: userId,
              branch_id: employee.branch_id || null,
              invited_email: email,
              status: 'active',
              responsibilities: [normalizedRole],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single()
          companyUserId = newCU?.id
        } else {
          await (admin as any)
            .from('company_users')
            .update({
              branch_id: employee.branch_id || null,
              status: 'active',
              responsibilities: [normalizedRole],
              updated_at: new Date().toISOString(),
            })
            .eq('id', companyUserId)
        }

        // Also sync local data store for memory/offline fallback
        try {
          const localUsers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.COMPANY_USERS) || []
          const existingIdx = localUsers.findIndex((u: any) => u.user_id === userId && u.company_id === employee.company_id)
          const updatedCuRecord = {
            id: companyUserId || `cu-${userId}`,
            company_id: employee.company_id,
            user_id: userId,
            branch_id: employee.branch_id || null,
            responsibilities: [normalizedRole],
            status: 'active',
            updated_at: new Date().toISOString(),
          }
          if (existingIdx >= 0) {
            localUsers[existingIdx] = { ...localUsers[existingIdx], ...updatedCuRecord }
          } else {
            localUsers.push(updatedCuRecord)
          }
          PrintERPDataStore.set(STORAGE_KEYS.COMPANY_USERS, localUsers)
        } catch {}

        const roleId = await this.resolveRoleIdForEmployee(employee.company_id, portalCreds.role || 'operator')
        if (roleId && companyUserId) {
          await (admin as any).from('user_roles').delete().eq('company_user_id', companyUserId)
          await (admin as any).from('user_roles').insert({
            company_user_id: companyUserId,
            role_id: roleId,
            company_id: employee.company_id,
          })
        }
      }
    } catch (e) {
      console.warn('[syncEmployeePortalLogin] Auth/DB sync fallback:', e)
    }

    let inviteUrl: string | undefined = undefined
    let inviteSentAt: string | undefined = undefined

    if (sendInvite && email && !email.endsWith('.local')) {
      try {
        const resolvedBaseUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const rec = await AuthEmailService.createVerificationRecord({
          email,
          purpose: 'registration',
          userId,
          ttlSeconds: 86400 * 7,
        })

        if (!('error' in rec)) {
          inviteUrl = `${resolvedBaseUrl}/verify?token=${rec.token}&email=${encodeURIComponent(email)}&purpose=registration`
          await AuthEmailService.sendUserInvitationEmail({
            email,
            inviteUrl,
            companyName: companyName || 'InkFlow PrintERP',
            roleName: portalCreds.role || employee.role || 'Team Member',
            invitedByName: actorName,
            tenantId: employee.company_id,
            userName: employee.name,
          })
          inviteSentAt = new Date().toISOString()
        }
      } catch (err) {
        console.warn('[syncEmployeePortalLogin] Invitation dispatch warning:', err)
      }
    }

    const updatedCreds: PortalCredentials = {
      ...portalCreds,
      create_login: true,
      email,
      username: portalCreds.username || email.split('@')[0],
      password,
      role: portalCreds.role || 'operator',
      user_id: userId,
      status: inviteSentAt ? 'invited' : 'active',
      last_invite_sent_at: inviteSentAt || portalCreds.last_invite_sent_at || null,
      invite_link: inviteUrl || portalCreds.invite_link || null,
    }

    const updatedEmployee = await WorkforceRepository.updateEmployee(employee.id, employee.company_id, {
      portal_credentials: updatedCreds,
      user_id: userId,
      email: employee.email || (email.endsWith('.local') ? null : email),
    })

    return {
      employee: updatedEmployee || { ...employee, portal_credentials: updatedCreds, user_id: userId },
      inviteUrl,
    }
  }

  static async sendEmployeeInvitation(
    employeeId: string,
    companyId: string,
    companyName: string,
    companySlug: string,
    actorName: string,
    appUrl: string,
    overrideEmail?: string
  ): Promise<{ success: boolean; message: string; inviteUrl?: string; email?: string }> {
    const employee = await WorkforceRepository.getEmployeeById(employeeId, companyId)
    if (!employee) {
      return { success: false, message: 'Employee record not found.' }
    }

    const targetEmail = (
      overrideEmail ||
      employee.portal_credentials?.email ||
      employee.email ||
      ''
    ).trim().toLowerCase()

    if (!targetEmail || !targetEmail.includes('@') || targetEmail.endsWith('.local')) {
      return {
        success: false,
        message: 'A valid email address is required to dispatch an invitation link.',
      }
    }

    const creds: PortalCredentials = {
      create_login: true,
      email: targetEmail,
      username: employee.portal_credentials?.username || targetEmail.split('@')[0],
      role: employee.portal_credentials?.role || 'operator',
      password: employee.portal_credentials?.password,
      send_invitation: true,
    }

    const result = await this.syncEmployeePortalLogin(
      employee,
      creds,
      actorName,
      companyName,
      companySlug,
      appUrl,
      true
    )

    if (result.inviteUrl) {
      return {
        success: true,
        message: `Invitation link sent successfully to ${targetEmail}.`,
        inviteUrl: result.inviteUrl,
        email: targetEmail,
      }
    }

    return {
      success: true,
      message: `Login account credentials verified for ${targetEmail}.`,
      email: targetEmail,
    }
  }

  static async updateEmployeeLoginCredentials(
    employeeId: string,
    companyId: string,
    credentials: PortalCredentials,
    actorId?: string,
    actorName = 'Admin',
    companyName?: string,
    companySlug?: string,
    appUrl?: string
  ): Promise<EmployeeRecord> {
    const employee = await WorkforceRepository.getEmployeeById(employeeId, companyId)
    if (!employee) {
      throw new Error('Employee record not found.')
    }

    // Ensure no duplicate credentials when updating credentials
    const uniquenessCheck = await AuthService.validateIdentifierUniqueness({
      email: credentials.email || employee.email,
      username: credentials.username,
      phone: employee.mobile,
      excludeEmployeeId: employeeId,
      excludeUserId: employee.user_id,
      companyId,
    })

    if (!uniquenessCheck.available) {
      throw new Error(uniquenessCheck.error || 'Duplicate credential detected')
    }

    const shouldSendInvite = Boolean(credentials.send_invitation)
    const result = await this.syncEmployeePortalLogin(
      employee,
      credentials,
      actorName,
      companyName,
      companySlug,
      appUrl,
      shouldSendInvite
    )

    await WorkforceRepository.logWorkforceAudit({
      id: `wfa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: companyId,
      actor_id: actorId || null,
      actor_name: actorName,
      action_type: 'employee_updated',
      entity_type: 'employee',
      entity_id: employee.id,
      after_state: result.employee as any,
      reason: `Updated portal login credentials for ${employee.name}`,
      created_at: new Date().toISOString(),
    })

    return result.employee
  }

  static async deleteEmployee(id: string, companyId: string) {
    return WorkforceRepository.deleteEmployee(id, companyId)
  }

  // ============================================================================
  // 3. SHIFTS
  // ============================================================================

  static async getShifts(companyId: string, branchId?: string) {
    return WorkforceRepository.getShifts(companyId, branchId)
  }

  static async createShift(
    input: Partial<ShiftRecord> & { company_id: string; shift_name: string; start_time: string; end_time: string }
  ): Promise<ShiftRecord> {
    const year = new Date().getFullYear()
    const randomSeq = Math.floor(Math.random() * 900000) + 100000
    const code = input.shift_code || `SHF-${year}-${randomSeq}`

    const startH = parseInt(input.start_time.split(':')[0], 10)
    const endH = parseInt(input.end_time.split(':')[0], 10)
    const isOvernight = input.is_overnight !== undefined ? input.is_overnight : endH <= startH

    const now = new Date().toISOString()
    const shift: ShiftRecord = {
      id: input.id || `shf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: input.company_id,
      branch_id: input.branch_id || null,
      shift_code: code,
      shift_name: input.shift_name,
      start_time: input.start_time,
      end_time: input.end_time,
      is_overnight: isOvernight,
      grace_period_minutes: input.grace_period_minutes !== undefined ? input.grace_period_minutes : 15,
      break_duration_minutes: input.break_duration_minutes !== undefined ? input.break_duration_minutes : 60,
      working_days: input.working_days || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
      overtime_rules: input.overtime_rules || { enabled: true, multiplier: 1.5, min_minutes: 30 },
      is_active: input.is_active !== undefined ? input.is_active : true,
      created_at: now,
      updated_at: now,
    }

    return WorkforceRepository.createShift(shift)
  }

  // ============================================================================
  // 4. DAILY ATTENDANCE & PUNCHES
  // ============================================================================

  static async getDailyAttendance(
    companyId: string,
    options?: {
      date?: string
      startDate?: string
      endDate?: string
      employeeId?: string
      department?: string
      status?: string
      branchId?: string
    }
  ) {
    return WorkforceRepository.getDailyAttendanceSummaries(companyId, options)
  }

  /**
   * Authoritative daily check-in/out or manual attendance registration.
   * Calculates late minutes after grace, worked duration, and potential overtime.
   */
  static async recordAttendanceSummary(params: {
    companyId: string
    employeeId: string
    attendanceDate: string
    status: AttendanceDailySummaryRecord['status']
    checkInTime?: string
    checkOutTime?: string
    shiftId?: string
    jobOrderId?: string
    locationId?: string
    attendanceSource?: AttendanceDailySummaryRecord['attendance_source']
    notes?: string
    actorId?: string
    actorName?: string
  }): Promise<AttendanceDailySummaryRecord> {
    const {
      companyId,
      employeeId,
      attendanceDate,
      status,
      checkInTime,
      checkOutTime,
      shiftId,
      jobOrderId,
      locationId,
      attendanceSource = 'manual',
      notes,
      actorId,
      actorName = 'Manager',
    } = params

    const employee = await WorkforceRepository.getEmployeeById(employeeId, companyId)
    if (!employee) {
      throw new Error(`Employee ${employeeId} not found.`)
    }

    // Resolve shift (default 9:00 - 18:00 if not specified)
    const shifts = await WorkforceRepository.getShifts(companyId)
    const shift = (shiftId ? shifts.find((s) => s.id === shiftId) : shifts[0]) || {
      id: null,
      start_time: '09:00',
      end_time: '18:00',
      is_overnight: false,
      grace_period_minutes: 15,
      break_duration_minutes: 60,
    }

    // 1. Calculate Late Minutes after Grace Period
    let lateMinutes = 0
    if (checkInTime && (status === 'present' || status === 'late')) {
      lateMinutes = WorkforceCalculatorService.calculateLateMinutes(
        checkInTime,
        shift.start_time,
        shift.grace_period_minutes
      )
    }

    // 2. Calculate Early Leave Minutes
    let earlyLeaveMinutes = 0
    if (checkOutTime && (status === 'present' || status === 'late')) {
      earlyLeaveMinutes = WorkforceCalculatorService.calculateEarlyLeaveMinutes(
        checkOutTime,
        shift.end_time,
        shift.is_overnight
      )
    }

    // 3. Calculate Worked Duration
    let workedMinutes = 0
    if (checkInTime && checkOutTime) {
      const [inH, inM] = checkInTime.split(':').map(Number)
      const [outH, outM] = checkOutTime.split(':').map(Number)
      let inTotal = inH * 60 + (inM || 0)
      let outTotal = outH * 60 + (outM || 0)
      if (shift.is_overnight || outTotal < inTotal) {
        outTotal += 24 * 60
      }
      workedMinutes = Math.max(0, outTotal - inTotal)
    } else if (status === 'present' || status === 'field_work') {
      workedMinutes = WorkforceCalculatorService.calculateShiftDurationHours(shift as any) * 60
    }

    // 4. Calculate Potential Overtime
    let potentialOtMinutes = 0
    if (checkOutTime) {
      potentialOtMinutes = WorkforceCalculatorService.calculatePotentialOvertimeMinutes(
        checkOutTime,
        shift.end_time,
        30
      )
    }

    const effectiveStatus = lateMinutes > 0 ? 'late' : status
    const now = new Date().toISOString()

    const summary: AttendanceDailySummaryRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: companyId,
      branch_id: employee.branch_id || null,
      employee_id: employeeId,
      employee_name: employee.name,
      shift_id: shift.id || null,
      attendance_date: attendanceDate,
      status: effectiveStatus,
      check_in_time: checkInTime || null,
      check_out_time: checkOutTime || null,
      late_minutes: lateMinutes,
      early_leave_minutes: earlyLeaveMinutes,
      worked_minutes: workedMinutes,
      potential_ot_minutes: potentialOtMinutes,
      approved_ot_minutes: 0,
      attendance_source: attendanceSource,
      location_id: locationId || null,
      job_order_id: jobOrderId || null,
      notes: notes || null,
      approved_by_id: actorId || null,
      approved_by_name: actorName,
      created_at: now,
      updated_at: now,
    }

    const saved = await WorkforceRepository.upsertDailyAttendanceSummary(summary)

    // Automatically create potential overtime record if candidate OT exists and none pending
    if (potentialOtMinutes > 0) {
      const existingOt = await WorkforceRepository.getOvertimeRecords(companyId, {
        employeeId,
        otDate: attendanceDate,
      })

      if (existingOt.length === 0) {
        const baseOtRate = Number(employee.overtime_hourly_rate || (employee.base_salary ? employee.base_salary / 208 : 100) * 1.5)
        const otCalc = WorkforceCalculatorService.calculateOvertimeAmount({
          durationMinutes: potentialOtMinutes,
          baseHourlyRate: baseOtRate,
          multiplier: 1.0, // base rate already has OT consideration or standard
        })

        await WorkforceRepository.createOvertimeRecord({
          id: `ot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          company_id: companyId,
          branch_id: employee.branch_id || null,
          employee_id: employeeId,
          attendance_id: saved.id,
          ot_date: attendanceDate,
          start_time: shift.end_time,
          end_time: checkOutTime,
          duration_minutes: potentialOtMinutes,
          duration_hours: otCalc.durationHours,
          ot_type: 'regular_day',
          base_hourly_rate: baseOtRate,
          multiplier: 1.0,
          effective_ot_rate: baseOtRate,
          calculated_amount: otCalc.amount,
          status: 'pending_approval',
          reason: `Automatic shift checkout overtime (+${potentialOtMinutes} mins past ${shift.end_time})`,
          requested_by_id: actorId || null,
          requested_by_name: employee.name,
          created_at: now,
          updated_at: now,
        })
      }
    }

    await WorkforceRepository.logWorkforceAudit({
      id: `wfa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: companyId,
      actor_id: actorId || null,
      actor_name: actorName,
      action_type: 'attendance_created',
      entity_type: 'attendance',
      entity_id: saved.id,
      after_state: saved as any,
      reason: `Recorded attendance for ${employee.name} (${attendanceDate}): ${effectiveStatus.toUpperCase()}`,
      created_at: now,
    })

    return saved
  }

  // ============================================================================
  // 5. OVERTIME APPROVAL WORKFLOW
  // ============================================================================

  static async getOvertimeRecords(companyId: string, options?: { employeeId?: string; status?: string; otDate?: string; payrollPeriodId?: string }) {
    return WorkforceRepository.getOvertimeRecords(companyId, options)
  }

  static async createOvertimeRequest(params: {
    companyId: string
    employeeId: string
    otDate: string
    durationMinutes: number
    otType?: OvertimeRecord['ot_type']
    reason: string
    requestedById?: string
    requestedByName?: string
  }): Promise<OvertimeRecord> {
    const employee = await WorkforceRepository.getEmployeeById(params.employeeId, params.companyId)
    if (!employee) {
      throw new Error(`Employee ${params.employeeId} not found.`)
    }

    const baseHourlyRate = Number(employee.hourly_rate || (employee.base_salary ? employee.base_salary / 208 : 100))
    const otType = params.otType || 'regular_day'
    const multiplier = otType === 'holiday' ? 2.0 : otType === 'weekly_off' ? 1.5 : 1.5

    const otCalc = WorkforceCalculatorService.calculateOvertimeAmount({
      durationMinutes: params.durationMinutes,
      baseHourlyRate,
      multiplier,
    })

    const now = new Date().toISOString()
    const otRecord: OvertimeRecord = {
      id: `ot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: params.companyId,
      branch_id: employee.branch_id || null,
      employee_id: params.employeeId,
      ot_date: params.otDate,
      duration_minutes: params.durationMinutes,
      duration_hours: otCalc.durationHours,
      ot_type: otType,
      base_hourly_rate: baseHourlyRate,
      multiplier,
      effective_ot_rate: otCalc.effectiveRate,
      calculated_amount: otCalc.amount,
      status: 'pending_approval',
      reason: params.reason,
      requested_by_id: params.requestedById || null,
      requested_by_name: params.requestedByName || employee.name,
      created_at: now,
      updated_at: now,
    }

    const created = await WorkforceRepository.createOvertimeRecord(otRecord)

    await WorkforceRepository.logWorkforceAudit({
      id: `wfa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: params.companyId,
      actor_id: params.requestedById || null,
      actor_name: params.requestedByName || employee.name,
      action_type: 'overtime_requested',
      entity_type: 'overtime',
      entity_id: created.id,
      after_state: created as any,
      reason: `Overtime request submitted for ${employee.name} (${otCalc.durationHours} hrs)`,
      created_at: now,
    })

    return created
  }

  static async reviewOvertime(params: {
    id: string
    companyId: string
    status: 'approved' | 'rejected'
    multiplier?: number
    reviewerId?: string
    reviewerName?: string
    rejectionReason?: string
  }): Promise<OvertimeRecord> {
    const existing = (await WorkforceRepository.getOvertimeRecords(params.companyId)).find((r) => r.id === params.id)
    if (!existing) {
      throw new Error(`Overtime record ${params.id} not found.`)
    }

    const now = new Date().toISOString()
    const updates: Partial<OvertimeRecord> = {
      status: params.status,
      approved_by_id: params.reviewerId || null,
      approved_by_name: params.reviewerName || 'Manager',
      approved_at: params.status === 'approved' ? now : null,
      rejection_reason: params.status === 'rejected' ? params.rejectionReason || 'Rejected by management' : null,
    }

    if (params.multiplier && params.status === 'approved') {
      const otCalc = WorkforceCalculatorService.calculateOvertimeAmount({
        durationMinutes: existing.duration_minutes,
        baseHourlyRate: existing.base_hourly_rate,
        multiplier: params.multiplier,
      })
      updates.multiplier = params.multiplier
      updates.effective_ot_rate = otCalc.effectiveRate
      updates.calculated_amount = otCalc.amount
    }

    const updated = await WorkforceRepository.updateOvertimeRecord(params.id, params.companyId, updates)
    if (!updated) {
      throw new Error(`Failed to update overtime record ${params.id}`)
    }

    // If linked to daily attendance summary, reflect approved OT minutes
    if (existing.attendance_id && params.status === 'approved') {
      const summaries = await WorkforceRepository.getDailyAttendanceSummaries(params.companyId, {
        date: existing.ot_date,
        employeeId: existing.employee_id,
      })
      if (summaries[0]) {
        await WorkforceRepository.upsertDailyAttendanceSummary({
          ...summaries[0],
          approved_ot_minutes: existing.duration_minutes,
        })
      }
    }

    await WorkforceRepository.logWorkforceAudit({
      id: `wfa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: params.companyId,
      actor_id: params.reviewerId || null,
      actor_name: params.reviewerName || 'Manager',
      action_type: params.status === 'approved' ? 'overtime_approved' : 'overtime_rejected',
      entity_type: 'overtime',
      entity_id: params.id,
      before_state: existing as any,
      after_state: updated as any,
      reason: `Overtime ${params.status}: ${updated.duration_hours} hrs, ৳ ${updated.calculated_amount}`,
      created_at: now,
    })

    return updated
  }

  // ============================================================================
  // 6. SALARY ADVANCES & DISBURSEMENT
  // ============================================================================

  static async getSalaryAdvances(companyId: string, options?: { employeeId?: string; status?: string; isSettled?: boolean }) {
    return WorkforceRepository.getSalaryAdvances(companyId, options)
  }

  static async disburseSalaryAdvance(params: {
    companyId: string
    employeeId: string
    amount: number
    paymentMethod: PaymentMethod
    reason?: string
    actorId?: string
    actorName?: string
  }): Promise<SalaryAdvanceRecord> {
    const { companyId, employeeId, amount, paymentMethod, reason, actorId, actorName = 'Accounts Manager' } = params

    if (amount <= 0) {
      throw new Error('Salary advance amount must be greater than zero.')
    }

    const employee = await WorkforceRepository.getEmployeeById(employeeId, companyId)
    if (!employee) {
      throw new Error(`Employee ${employeeId} not found.`)
    }

    const advances = await WorkforceRepository.getSalaryAdvances(companyId)
    const year = new Date().getFullYear()
    const voucherNumber = `ADV-${year}-${String(advances.length + 1).padStart(4, '0')}`
    const now = new Date().toISOString()
    const today = now.split('T')[0]

    // 1. Create Double-Entry Journal Entry in Financial Transactions
    let transactionId: string | null = null
    try {
      const accounts = await FinanceRepository.getAccounts(companyId, employee.branch_id || undefined)
      let paymentAcc = accounts.find((a) => {
        if (paymentMethod === 'bank') return a.code.startsWith('102') || a.account_subtype === 'BANK'
        if (paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'rocket') return a.code.startsWith('103') || a.account_subtype === 'MFS'
        return a.code === '1010' || a.account_subtype === 'CASH'
      })
      if (!paymentAcc) {
        paymentAcc = accounts.find((a) => a.account_type === 'ASSET') || accounts[0]
      }

      if (paymentAcc) {
        const finTxn = await FinanceService.recordExpense({
          companyId,
          branchId: employee.branch_id || null,
          category: 'OPEX_SALARY',
          amount,
          paymentAccountId: paymentAcc.id,
          vendorName: employee.name,
          description: `Salary advance voucher ${voucherNumber} disbursed to ${employee.name} (${reason || 'Advance'})`,
          actorName,
        })
        transactionId = finTxn.id
      }
    } catch (finErr) {
      console.warn('[WorkforceService.disburseSalaryAdvance] Non-blocking finance journal posting:', finErr)
    }

    // 2. Create Salary Advance Record
    const advanceRecord: SalaryAdvanceRecord = {
      id: `adv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: companyId,
      branch_id: employee.branch_id || null,
      advance_voucher_number: voucherNumber,
      employee_id: employeeId,
      employee_name: employee.name,
      amount,
      deducted_amount: 0,
      remaining_amount: amount,
      disbursed_date: today,
      payment_method: paymentMethod,
      reason: reason || null,
      status: 'disbursed',
      approved_by_id: actorId || null,
      approved_by_name: actorName,
      approved_at: now,
      is_settled: false,
      transaction_id: transactionId,
      created_at: now,
      updated_at: now,
    }

    const created = await WorkforceRepository.createSalaryAdvance(advanceRecord)

    // 3. Atomically increase employee's current advance balance
    const updatedBalance = Number(employee.current_advance_balance || 0) + amount
    await WorkforceRepository.updateEmployee(employee.id, companyId, {
      current_advance_balance: updatedBalance,
    })

    // 4. Audit Log
    await WorkforceRepository.logWorkforceAudit({
      id: `wfa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: companyId,
      actor_id: actorId || null,
      actor_name: actorName,
      action_type: 'salary_advance_disbursed',
      entity_type: 'advance',
      entity_id: created.id,
      after_state: created as any,
      reason: `Salary advance ৳ ${amount} disbursed to ${employee.name}. New outstanding balance: ৳ ${updatedBalance}`,
      created_at: now,
    })

    return created
  }

  // ============================================================================
  // 7. PAYROLL PERIOD GENERATION & LIFECYCLE
  // ============================================================================

  static async getPayrollPeriods(companyId: string, options?: { status?: string }) {
    return WorkforceRepository.getPayrollPeriods(companyId, options)
  }

  static async getPayrollPeriodById(id: string, companyId: string) {
    return WorkforceRepository.getPayrollPeriodById(id, companyId)
  }

  /**
   * Generates a monthly payroll draft using the authoritative calculation engine.
   * Aggregates active employees, approved attendance, approved overtime, and advance balances.
   */
  static async generateMonthlyPayrollDraft(params: {
    companyId: string
    branchId?: string
    periodName: string // e.g. "September 2026"
    startDate: string
    endDate: string
    workingDaysCount?: number
    actorId?: string
    actorName?: string
  }): Promise<PayrollPeriodRecord> {
    const { companyId, branchId, periodName, startDate, endDate, workingDaysCount = 26, actorId, actorName = 'Accounts Manager' } = params

    // 1. Prevent regenerating locked payroll periods
    const existingPeriods = await WorkforceRepository.getPayrollPeriods(companyId)
    const duplicate = existingPeriods.find((p) => p.period_name.toLowerCase().trim() === periodName.toLowerCase().trim())
    if (duplicate && duplicate.status === 'locked') {
      throw new Error(`Payroll period "${periodName}" is already locked and cannot be re-generated.`)
    }

    const employees = await WorkforceRepository.getEmployees(companyId, { branchId, status: 'active' })
    if (employees.length === 0) {
      throw new Error('No active employees found to generate payroll.')
    }

    const allApprovedOt = await WorkforceRepository.getOvertimeRecords(companyId, { status: 'approved' })
    const allSummaries = await WorkforceRepository.getDailyAttendanceSummaries(companyId, { startDate, endDate })

    const periodId = duplicate?.id || `pp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const items: PayrollItemRecord[] = []

    let totalGross = 0
    let totalOt = 0
    let totalAdvancesDeducted = 0
    let totalOtherDeductions = 0
    let totalNet = 0

    for (const emp of employees) {
      const empSummaries = allSummaries.filter((s) => s.employee_id === emp.id)
      const empApprovedOt = allApprovedOt.filter((ot) => ot.employee_id === emp.id && ot.ot_date >= startDate && ot.ot_date <= endDate)

      const daysPresent = empSummaries.filter((s) => s.status === 'present' || s.status === 'late' || s.status === 'half_day' || s.status === 'field_work').length || workingDaysCount
      const totalWorkedMins = empSummaries.reduce((sum, s) => sum + (s.worked_minutes || 0), 0)
      const totalWorkedHours = totalWorkedMins > 0 ? Math.round((totalWorkedMins / 60) * 100) / 100 : workingDaysCount * 8

      const { item, snapshot } = WorkforceCalculatorService.calculateEmployeePayrollItem({
        companyId,
        payrollPeriodId: periodId,
        employee: emp,
        workingDaysInMonth: workingDaysCount,
        daysPresent,
        hoursWorked: totalWorkedHours,
        approvedOvertimeRecords: empApprovedOt,
      })

      const completeItem: PayrollItemRecord = {
        ...item,
        id: `pi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      items.push(completeItem)

      totalGross += completeItem.gross_salary
      totalOt += completeItem.overtime_amount
      totalAdvancesDeducted += completeItem.advance_salary_deducted
      totalOtherDeductions += completeItem.absence_deduction + completeItem.late_fine + completeItem.other_deductions
      totalNet += completeItem.net_salary
    }

    const now = new Date().toISOString()
    const periodRecord: PayrollPeriodRecord = {
      id: periodId,
      company_id: companyId,
      branch_id: branchId || null,
      period_name: periodName,
      start_date: startDate,
      end_date: endDate,
      working_days_count: workingDaysCount,
      status: 'draft',
      total_gross_salary: Math.round(totalGross * 100) / 100,
      total_ot_amount: Math.round(totalOt * 100) / 100,
      total_advances_deducted: Math.round(totalAdvancesDeducted * 100) / 100,
      total_other_deductions: Math.round(totalOtherDeductions * 100) / 100,
      total_net_salary: Math.round(totalNet * 100) / 100,
      total_paid_amount: 0,
      total_due_amount: Math.round(totalNet * 100) / 100,
      notes: `Generated draft payroll for ${employees.length} employees`,
      items,
      created_at: now,
      updated_at: now,
    }

    const saved = await WorkforceRepository.createPayrollPeriod(periodRecord, items)

    await WorkforceRepository.logWorkforceAudit({
      id: `wfa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: companyId,
      actor_id: actorId || null,
      actor_name: actorName,
      action_type: 'payroll_generated',
      entity_type: 'payroll',
      entity_id: saved.id,
      after_state: saved as any,
      reason: `Generated draft payroll "${periodName}" (Gross: ৳ ${totalGross}, Net: ৳ ${totalNet})`,
      created_at: now,
    })

    return saved
  }

  /**
   * Approves a payroll period. Separate from locking and payment.
   */
  static async approvePayrollPeriod(
    id: string,
    companyId: string,
    approverId?: string,
    approverName = 'Managing Director'
  ): Promise<PayrollPeriodRecord> {
    const period = await WorkforceRepository.getPayrollPeriodById(id, companyId)
    if (!period) {
      throw new Error(`Payroll period ${id} not found.`)
    }

    const now = new Date().toISOString()
    const updated = await WorkforceRepository.updatePayrollPeriod(id, companyId, {
      status: 'approved',
      approved_by_id: approverId || null,
      approved_by_name: approverName,
      approved_at: now,
    })

    if (!updated) {
      throw new Error(`Failed to approve payroll period ${id}`)
    }

    await WorkforceRepository.logWorkforceAudit({
      id: `wfa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: companyId,
      actor_id: approverId || null,
      actor_name: approverName,
      action_type: 'payroll_approved',
      entity_type: 'payroll',
      entity_id: id,
      reason: `Payroll period "${period.period_name}" approved by ${approverName}`,
      created_at: now,
    })

    return updated
  }

  /**
   * Locks a payroll period permanently.
   * Freezes historical numbers and settles deducted advances.
   */
  static async lockPayrollPeriod(
    id: string,
    companyId: string,
    actorId?: string,
    actorName = 'Managing Director'
  ): Promise<PayrollPeriodRecord> {
    const period = await WorkforceRepository.getPayrollPeriodById(id, companyId)
    if (!period) {
      throw new Error(`Payroll period ${id} not found.`)
    }

    const now = new Date().toISOString()

    // 1. Settle deducted salary advances and reduce employee current advance balances
    if (period.items) {
      for (const item of period.items) {
        if (item.advance_salary_deducted > 0) {
          const emp = await WorkforceRepository.getEmployeeById(item.employee_id, companyId)
          if (emp) {
            const newBal = Math.max(0, Number(emp.current_advance_balance || 0) - item.advance_salary_deducted)
            await WorkforceRepository.updateEmployee(emp.id, companyId, {
              current_advance_balance: newBal,
            })
          }
        }
      }
    }

    const updated = await WorkforceRepository.updatePayrollPeriod(id, companyId, {
      status: 'locked',
      locked_at: now,
    })

    if (!updated) {
      throw new Error(`Failed to lock payroll period ${id}`)
    }

    await WorkforceRepository.logWorkforceAudit({
      id: `wfa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: companyId,
      actor_id: actorId || null,
      actor_name: actorName,
      action_type: 'payroll_locked',
      entity_type: 'payroll',
      entity_id: id,
      reason: `Payroll period "${period.period_name}" permanently locked and archived.`,
      created_at: now,
    })

    return updated
  }

  // ============================================================================
  // 8. SALARY PAYMENT RECORDING
  // ============================================================================

  /**
   * Records a salary payment against a payroll item.
   * Updates payment status, voucher number, and posts double-entry journal entry.
   */
  static async recordSalaryPayment(params: {
    companyId: string
    payrollPeriodId: string
    payrollItemId: string
    employeeId: string
    amount: number
    paymentMethod: PaymentMethod
    referenceNumber?: string
    notes?: string
    paidById?: string
    paidByName?: string
  }): Promise<SalaryPaymentRecord> {
    const {
      companyId,
      payrollPeriodId,
      payrollItemId,
      employeeId,
      amount,
      paymentMethod,
      referenceNumber,
      notes,
      paidById,
      paidByName = 'Accounts Manager',
    } = params

    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero.')
    }

    const period = await WorkforceRepository.getPayrollPeriodById(payrollPeriodId, companyId)
    if (!period) {
      throw new Error(`Payroll period ${payrollPeriodId} not found.`)
    }

    const item = (period.items || []).find((i) => i.id === payrollItemId || i.employee_id === employeeId)
    if (!item) {
      throw new Error(`Payroll item for employee ${employeeId} not found in period.`)
    }

    const payments = await WorkforceRepository.getSalaryPayments(companyId)
    const year = new Date().getFullYear()
    const voucherNumber = `SP-${year}-${String(payments.length + 1).padStart(4, '0')}`
    const now = new Date().toISOString()
    const today = now.split('T')[0]

    // 1. Post to Double-Entry Financial Transactions (OPEX_SALARY)
    let transactionId: string | null = null
    try {
      const accounts = await FinanceRepository.getAccounts(companyId, period.branch_id || undefined)
      let paymentAcc = accounts.find((a) => {
        if (paymentMethod === 'bank') return a.code.startsWith('102') || a.account_subtype === 'BANK'
        if (paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'rocket') return a.code.startsWith('103') || a.account_subtype === 'MFS'
        return a.code === '1010' || a.account_subtype === 'CASH'
      })
      if (!paymentAcc) {
        paymentAcc = accounts.find((a) => a.account_type === 'ASSET') || accounts[0]
      }

      if (paymentAcc) {
        const finTxn = await FinanceService.recordExpense({
          companyId,
          branchId: period.branch_id || null,
          category: 'OPEX_SALARY',
          amount,
          paymentAccountId: paymentAcc.id,
          vendorName: item.employee_name,
          description: `Salary payment voucher ${voucherNumber} for ${period.period_name} to ${item.employee_name}`,
          actorName: paidByName,
        })
        transactionId = finTxn.id
      }
    } catch (finErr) {
      console.warn('[WorkforceService.recordSalaryPayment] Finance posting non-blocking:', finErr)
    }

    // 2. Create Salary Payment Record
    const paymentRecord: SalaryPaymentRecord = {
      id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: companyId,
      branch_id: period.branch_id || null,
      payment_voucher_number: voucherNumber,
      payroll_period_id: payrollPeriodId,
      payroll_item_id: item.id,
      employee_id: employeeId,
      employee_name: item.employee_name,
      payment_date: today,
      amount,
      payment_method: paymentMethod,
      reference_number: referenceNumber || null,
      notes: notes || `Salary payment for ${period.period_name}`,
      paid_by_id: paidById || null,
      paid_by_name: paidByName,
      transaction_id: transactionId,
      created_at: now,
    }

    const savedPayment = await WorkforceRepository.recordSalaryPayment(paymentRecord)

    // 3. Update Payroll Item paid/due totals and status
    const updatedPaid = Number(item.paid_amount || 0) + amount
    const updatedDue = Math.max(0, Number(item.net_salary || 0) - updatedPaid)
    const paymentStatus = updatedDue === 0 ? 'paid' : 'partial'

    await WorkforceRepository.updatePayrollItem(item.id, companyId, {
      paid_amount: updatedPaid,
      due_amount: updatedDue,
      payment_status: paymentStatus,
    })

    // 4. Update Payroll Period paid/due totals
    const periodPayments = await WorkforceRepository.getSalaryPayments(companyId, { payrollPeriodId })
    const totalPaidInPeriod = periodPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const totalDueInPeriod = Math.max(0, Number(period.total_net_salary || 0) - totalPaidInPeriod)
    const periodStatus = totalDueInPeriod === 0 ? 'paid' : period.status

    await WorkforceRepository.updatePayrollPeriod(payrollPeriodId, companyId, {
      total_paid_amount: totalPaidInPeriod,
      total_due_amount: totalDueInPeriod,
      status: periodStatus,
    })

    // 5. Audit Log
    await WorkforceRepository.logWorkforceAudit({
      id: `wfa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: companyId,
      actor_id: paidById || null,
      actor_name: paidByName,
      action_type: 'salary_payment_recorded',
      entity_type: 'payment',
      entity_id: savedPayment.id,
      after_state: savedPayment as any,
      reason: `Salary payment of ৳ ${amount} recorded for ${item.employee_name} via ${paymentMethod.toUpperCase()}`,
      created_at: now,
    })

    return savedPayment
  }

  // ============================================================================
  // 9. LEGACY & COSTING RECONCILIATION COMPATIBILITY HELPERS
  // ============================================================================

  static calculateShiftDurationHours(shift: {
    start_time: string
    end_time: string
    is_overnight?: boolean
    break_duration_minutes?: number
  }): number {
    return WorkforceCalculatorService.calculateShiftDurationHours(shift)
  }

  static calculateOvertime(params: {
    checkInTime: string
    checkOutTime: string
    shift: ShiftRecord | any
    hourlyRate: number
    multiplier?: number
  }): {
    workedHours: number
    overtimeMinutes: number
    overtimeHours: number
    overtimeAmount: number
  } {
    const checkIn = new Date(params.checkInTime).getTime()
    const checkOut = new Date(params.checkOutTime).getTime()
    const diffHours = (checkOut - checkIn) / (1000 * 60 * 60)
    const workedHours = Math.round(diffHours * 100) / 100

    const shiftDuration = WorkforceCalculatorService.calculateShiftDurationHours(params.shift)
    const rawOtHours = Math.max(0, workedHours - shiftDuration)
    const rawOtMinutes = Math.round(rawOtHours * 60)

    const minMinutes = params.shift?.overtime_rules?.min_minutes ?? 30
    if (rawOtMinutes < minMinutes) {
      return {
        workedHours,
        overtimeMinutes: 0,
        overtimeHours: 0,
        overtimeAmount: 0,
      }
    }

    const otHours = Math.round((rawOtMinutes / 60) * 100) / 100
    const multiplier = params.multiplier ?? (params.shift?.overtime_rules?.multiplier ?? 1.5)
    const overtimeAmount = Math.round(otHours * params.hourlyRate * multiplier * 100) / 100

    return {
      workedHours,
      overtimeMinutes: rawOtMinutes,
      overtimeHours: otHours,
      overtimeAmount,
    }
  }

  static async recordDailyLabor(params: {
    companyId: string
    employeeId: string
    employeeName: string
    workDate: string
    assignedJobNumber?: string | null
    dailyRate: number
    overtimeHours?: number
    hourlyOvertimeRate?: number
    productionContribution?: string
  }): Promise<any> {
    const otHours = params.overtimeHours || 0
    const otRate = params.hourlyOvertimeRate || 0
    const totalPayout = params.dailyRate + otHours * otRate

    return WorkforceRepository.recordDailyLabor({
      company_id: params.companyId,
      employee_id: params.employeeId,
      employee_name: params.employeeName,
      work_date: params.workDate,
      assigned_job_number: params.assignedJobNumber,
      daily_rate: params.dailyRate,
      overtime_hours: otHours,
      hourly_overtime_rate: otRate,
      total_payout: totalPayout,
      production_contribution: params.productionContribution,
      payment_status: 'unpaid',
    })
  }

  static async reconcileJobLaborCost(
    companyId: string,
    jobOrderId: string,
    jobNumber?: string
  ): Promise<number> {
    const logs = await WorkforceRepository.getDailyLaborLogs(companyId)
    const matched = logs.filter(
      (l) =>
        (jobNumber && l.assigned_job_number === jobNumber) ||
        l.assigned_job_number === jobOrderId ||
        l.job_order_id === jobOrderId
    )

    const totalLaborCost = matched.reduce((sum, l) => sum + Number(l.total_payout || 0), 0)

    try {
      const costing =
        (await CostingRepository.getJobCostingByJobId(jobOrderId, companyId)) ||
        (jobNumber ? await CostingRepository.getCostingById(jobNumber, companyId) : null)

      if (costing) {
        const currentAct = costing.act || {
          material_cost: 0,
          machine_cost: 0,
          ink_cost: 0,
          printing_cost: 0,
          finishing_cost: 0,
          labor_cost: 0,
          fabrication_cost: 0,
          installation_cost: 0,
          transport_cost: 0,
          other_cost: 0,
          total_cost: 0,
          profit: 0,
          margin_percentage: 0,
        }

        const totalCostWithoutLabor = (currentAct.total_cost || 0) - (currentAct.labor_cost || 0)
        const updatedTotalCost = totalCostWithoutLabor + totalLaborCost
        const profit = (costing.selling_price || 0) - updatedTotalCost
        const marginPercentage = costing.selling_price > 0 ? (profit / costing.selling_price) * 100 : 0

        const updatedAct = {
          ...currentAct,
          labor_cost: totalLaborCost,
          total_cost: updatedTotalCost,
          profit,
          margin_percentage: Number(marginPercentage.toFixed(2)),
        }

        const laborVariance = totalLaborCost - (costing.est?.labor_cost || 0)
        const totalVariance = updatedTotalCost - (costing.est?.total_cost || 0)

        await CostingRepository.updateCosting(
          costing.id,
          {
            act: updatedAct,
            variances: {
              ...(costing.variances || {
                material_variance: 0,
                machine_variance: 0,
                finishing_variance: 0,
                transport_variance: 0,
                total_variance: 0,
              }),
              labor_variance: laborVariance,
              total_variance: totalVariance,
            },
          },
          companyId
        )
      }
    } catch (e) {
      console.warn('[WorkforceService.reconcileJobLaborCost] Costing reconciliation fallback:', e)
    }

    return totalLaborCost
  }
}
