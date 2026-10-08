'use server'

import { withTenantAction } from '@/lib/actions/action-wrapper'


// ==============================================================================
// PrintFlow - Authoritative Workforce, Attendance, Overtime & Payroll Server Actions
// Strict Multi-Tenant Isolation, RBAC Permission Checks, and Audit Logging
// ==============================================================================

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { requireTenantUser, getCurrentTenant } from '@/lib/auth/tenant-auth'
import { WorkforceService } from '@/services/workforce.service'
import { WorkforceRepository } from '@/lib/repositories/workforce.repository'
import { AttendanceService } from '@/services/attendance.service'
import { resolveRequestOrigin } from '@/lib/security/runtime-env'
import type {
  EmployeeRecord,
  ShiftRecord,
  AttendanceDailySummaryRecord,
  OvertimeRecord,
  SalaryAdvanceRecord,
  PayrollPeriodRecord,
  SalaryPaymentRecord,
  WorkforceSummaryKPIs,
  PaymentMethod,
  PortalCredentials,
} from '@/types/workforce.types'

export interface WorkforceOverviewSummary {
  kpis: {
    totalEmployees: number
    presentToday: number
    absentToday: number
    lateToday: number
    payrollDue: number
    overtimePending: number
  }
  todayAttendance: {
    present: number
    late: number
    leave: number
    absent: number
    currentlyWorking: number
    totalActive: number
  }
  payrollStatus: {
    periodName: string
    grossPayroll: number
    paid: number
    pending: number
    due: number
  }
  pendingActions: Array<{
    id: string
    type: 'overtime' | 'correction' | 'advance' | 'salary_due'
    title: string
    titleBn: string
    subtitle: string
    actionLabel: string
    actionLabelBn: string
    actionHref: string
    dateOrTime?: string
  }>
}

async function getRequestBaseUrl(): Promise<string> {
  try {
    const headerStore = await headers()
    return resolveRequestOrigin(headerStore)
  } catch {
    return resolveRequestOrigin()
  }
}

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
  details?: any
}

function hasAnyPermission(tenant: any, permissions: string[]): boolean {
  if (
    tenant.companyRole === 'business_owner' ||
    tenant.primaryRole === 'business_owner' ||
    tenant.isSupportMode === true ||
    tenant.permissions?.includes('*') ||
    tenant.permissions?.includes('platform.admin')
  ) {
    return true
  }
  return permissions.some((p) => tenant.permissions?.includes(p))
}

// ============================================================================
// 1. WORKFORCE DASHBOARD & KPIS
// ============================================================================

export const getWorkforceSummaryAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, companyIdParam?: string) : Promise<ServerActionResult<WorkforceSummaryKPIs>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const summary = await WorkforceService.getWorkforceSummary(tenant.companyId)
    return { success: true, data: summary }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch workforce summary.' }
  }

})

export const getWorkforceOverviewSummaryAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, companyIdParam?: string) : Promise<ServerActionResult<WorkforceOverviewSummary>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const todayStr = new Date().toISOString().split('T')[0]

    const [
      employees,
      todaySummaries,
      pendingOvertime,
      approvedOvertime,
      pendingCorrections,
      advances,
      payrollPeriods,
    ] = await Promise.all([
      WorkforceRepository.getEmployees(tenant.companyId, { status: 'active' }),
      WorkforceRepository.getDailyAttendanceSummaries(tenant.companyId, { date: todayStr }),
      WorkforceRepository.getOvertimeRecords(tenant.companyId, { status: 'pending_approval' }),
      WorkforceRepository.getOvertimeRecords(tenant.companyId, { status: 'approved' }),
      AttendanceService.getTenantCorrections(tenant.companyId, 'pending').catch(() => []),
      WorkforceRepository.getSalaryAdvances(tenant.companyId, { isSettled: false }),
      WorkforceRepository.getPayrollPeriods(tenant.companyId),
    ])

    const totalActive = employees.length
    const present = todaySummaries.filter((s) => s.status === 'present' || s.status === 'half_day').length
    const late = todaySummaries.filter((s) => s.status === 'late' || s.late_minutes > 0).length
    const leave = todaySummaries.filter((s) => s.status === 'leave').length
    const currentlyWorking = todaySummaries.filter((s) => s.check_in_time && !s.check_out_time).length
    const accountedFor = present + late + leave
    const absent = Math.max(0, totalActive - accountedFor)

    // Current Payroll
    const latestPeriod = payrollPeriods[0] || null
    const grossPayroll = latestPeriod
      ? Number(latestPeriod.total_gross_salary || 0)
      : employees.reduce((acc, e) => acc + Number(e.base_salary || 0), 0)
    const paidPayroll = latestPeriod ? Number(latestPeriod.total_paid_amount || 0) : 0
    const duePayroll = latestPeriod ? Number(latestPeriod.total_due_amount || latestPeriod.total_net_salary || 0) : 0
    const pendingPayroll = latestPeriod && latestPeriod.status === 'draft' ? Number(latestPeriod.total_net_salary || 0) : 0

    // Overtime pending hours
    const pendingOtHours =
      Math.round(
        pendingOvertime.reduce(
          (acc, ot) => acc + (ot.duration_hours || (ot.duration_minutes ? ot.duration_minutes / 60 : 0)),
          0
        ) * 10
      ) / 10

    // Build decision-useful pending actions
    const pendingActions: WorkforceOverviewSummary['pendingActions'] = []

    for (const c of (pendingCorrections || []).slice(0, 3)) {
      pendingActions.push({
        id: `corr-${c.id}`,
        type: 'correction',
        title: 'Attendance Correction',
        titleBn: 'হাজিরা সংশোধন',
        subtitle: `${c.employee_name || 'Staff'} — ${c.attendance_date} (${c.requested_type})`,
        actionLabel: 'Review',
        actionLabelBn: 'রিভিউ',
        actionHref: `/hr/attendance?tab=corrections`,
        dateOrTime: c.attendance_date,
      })
    }

    for (const ot of pendingOvertime.slice(0, 3)) {
      pendingActions.push({
        id: `ot-${ot.id}`,
        type: 'overtime',
        title: 'Overtime Request',
        titleBn: 'ওভারটাইম অনুরোধ',
        subtitle: `${ot.employee_name || 'Staff'} — ${ot.duration_hours}h (${ot.ot_type})`,
        actionLabel: 'Review',
        actionLabelBn: 'রিভিউ',
        actionHref: `/hr/attendance?tab=overtime`,
        dateOrTime: ot.ot_date,
      })
    }

    const pendingAdvList = advances.filter((a) => a.status === 'pending')
    for (const adv of pendingAdvList.slice(0, 2)) {
      pendingActions.push({
        id: `adv-${adv.id}`,
        type: 'advance',
        title: 'Advance Approval',
        titleBn: 'অগ্রিম অনুমোদন',
        subtitle: `${adv.employee_name || 'Staff'} — ৳${Number(adv.amount).toLocaleString('en-IN')}`,
        actionLabel: 'Review',
        actionLabelBn: 'রিভিউ',
        actionHref: `/hr/advances`,
        dateOrTime: adv.disbursed_date,
      })
    }

    if (duePayroll > 0 && latestPeriod) {
      pendingActions.push({
        id: `pay-${latestPeriod.id}`,
        type: 'salary_due',
        title: 'Salary Payments Due',
        titleBn: 'বেতন বকেয়া',
        subtitle: `${latestPeriod.period_name} — ৳${duePayroll.toLocaleString('en-IN')}`,
        actionLabel: 'View Payroll',
        actionLabelBn: 'বেতন দেখুন',
        actionHref: `/hr/payroll/${latestPeriod.id}`,
      })
    }

    return {
      success: true,
      data: {
        kpis: {
          totalEmployees: totalActive,
          presentToday: present,
          absentToday: absent,
          lateToday: late,
          payrollDue: duePayroll,
          overtimePending: pendingOtHours,
        },
        todayAttendance: {
          present,
          late,
          leave,
          absent,
          currentlyWorking,
          totalActive,
        },
        payrollStatus: {
          periodName: latestPeriod?.period_name || 'Current Period',
          grossPayroll,
          paid: paidPayroll,
          pending: pendingPayroll,
          due: duePayroll,
        },
        pendingActions,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch workforce overview summary.' }
  }

})

// ============================================================================
// 2. EMPLOYEES ACTIONS
// ============================================================================

export const getEmployeesAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, options?: { branchId?: string; status?: string; department?: string; isDailyWorker?: boolean },
  companyIdParam?: string) : Promise<ServerActionResult<EmployeeRecord[]>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const employees = await WorkforceService.getEmployees(tenant.companyId, options)
    return { success: true, data: employees }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch employees.' }
  }

})

export const getMyWorkforceDataAction = withTenantAction(
  {
    entityType: 'workforce',
  },
  async (
    ctx,
    companyIdParam?: string
  ): Promise<
    ServerActionResult<{
      employee: EmployeeRecord | null
      attendances: AttendanceDailySummaryRecord[]
      advances: SalaryAdvanceRecord[]
      overtimes: OvertimeRecord[]
    }>
  > => {
    try {
      const tenant = ctx.tenant || (await requireTenantUser(companyIdParam))
      let employee = await WorkforceRepository.getEmployeeByUserId(tenant.userId, tenant.companyId)

      // Fallback auto-link by email or phone if user_id was not yet attached
      if (!employee) {
        try {
          const allEmployees = await WorkforceRepository.getEmployees(tenant.companyId)
          const normEmail = tenant.userEmail?.toLowerCase().trim()
          const normPhone = tenant.phone?.replace(/\D/g, '')

          const matched = allEmployees.find((e) => {
            if (e.status === 'terminated') return false
            if (normEmail && e.email && e.email.toLowerCase().trim() === normEmail) return true
            if (normPhone && e.mobile) {
              const empPhone = e.mobile.replace(/\D/g, '')
              if (empPhone && (empPhone === normPhone || empPhone.endsWith(normPhone) || normPhone.endsWith(empPhone))) {
                return true
              }
            }
            return false
          })

          if (matched) {
            await WorkforceRepository.updateEmployee(matched.id, tenant.companyId, { user_id: tenant.userId })
            matched.user_id = tenant.userId
            employee = matched
          }
        } catch {}
      }

      let attendances: AttendanceDailySummaryRecord[] = []
      let advances: SalaryAdvanceRecord[] = []
      let overtimes: OvertimeRecord[] = []

      if (employee) {
        const [atts, advs, ots] = await Promise.all([
          WorkforceRepository.getDailyAttendanceSummaries(tenant.companyId, { employeeId: employee.id }),
          WorkforceRepository.getSalaryAdvances(tenant.companyId, { employeeId: employee.id }),
          WorkforceRepository.getOvertimeRecords(tenant.companyId, { employeeId: employee.id }),
        ])
        attendances = atts
        advances = advs
        overtimes = ots
      }

      return {
        success: true,
        data: {
          employee,
          attendances,
          advances,
          overtimes,
        },
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch personal workforce data.' }
    }
  }
)

export const recordSelfAttendancePunchAction = withTenantAction(
  {
    entityType: 'workforce',
  },
  async (
    ctx,
    params: {
      type: 'clock_in' | 'clock_out'
      notes?: string
    },
    companyIdParam?: string
  ): Promise<ServerActionResult<AttendanceDailySummaryRecord>> => {
    try {
      const tenant = ctx.tenant || (await requireTenantUser(companyIdParam))
      let employee = await WorkforceRepository.getEmployeeByUserId(tenant.userId, tenant.companyId)
      if (!employee) {
        return { success: false, error: 'Employee record not found for your account.' }
      }

      const now = new Date()
      const timeStr = now.toTimeString().slice(0, 5)
      const isoStr = now.toISOString()
      const todayStr = isoStr.slice(0, 10)

      if (params.type === 'clock_in') {
        const startTimeStr = employee.duty_settings?.office_start_time || '09:00'
        const graceMin = employee.duty_settings?.late_grace_minutes || 15
        const [startH, startM] = startTimeStr.split(':').map(Number)
        const [curH, curM] = timeStr.split(':').map(Number)
        const startMinutes = startH * 60 + startM
        const curMinutes = curH * 60 + curM
        const diff = curMinutes - (startMinutes + graceMin)
        const lateMinutes = diff > 0 ? diff : 0
        const status = lateMinutes > 0 ? 'late' : 'present'

        const record = await WorkforceService.recordAttendanceSummary({
          companyId: tenant.companyId,
          employeeId: employee.id,
          attendanceDate: todayStr,
          status: status as any,
          checkInTime: timeStr,
          attendanceSource: 'qr_geo',
          notes: params.notes || 'Employee Portal Self-Punch In',
          actorId: tenant.userId,
          actorName: employee.name || tenant.fullName,
        })
        return { success: true, data: record }
      } else {
        const existing = await WorkforceRepository.getDailyAttendanceSummaries(tenant.companyId, {
          employeeId: employee.id,
          date: todayStr,
        })
        const todayRec = existing[0]

        const record = await WorkforceService.recordAttendanceSummary({
          companyId: tenant.companyId,
          employeeId: employee.id,
          attendanceDate: todayStr,
          status: todayRec?.status || 'present',
          checkInTime: todayRec?.check_in_time || undefined,
          checkOutTime: timeStr,
          attendanceSource: 'qr_geo',
          notes: params.notes || 'Employee Portal Self-Punch Out',
          actorId: tenant.userId,
          actorName: employee.name || tenant.fullName,
        })
        return { success: true, data: record }
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to record attendance punch.' }
    }
  }
)

export const requestSelfSalaryAdvanceAction = withTenantAction(
  {
    entityType: 'workforce',
  },
  async (
    ctx,
    params: {
      amount: number
      reason: string
    },
    companyIdParam?: string
  ): Promise<ServerActionResult<SalaryAdvanceRecord>> => {
    try {
      const tenant = ctx.tenant || (await requireTenantUser(companyIdParam))
      let employee = await WorkforceRepository.getEmployeeByUserId(tenant.userId, tenant.companyId)
      if (!employee) {
        return { success: false, error: 'Employee record not found for your account.' }
      }

      const todayStr = new Date().toISOString().slice(0, 10)
      const record = await WorkforceRepository.createSalaryAdvance({
        id: `adv_${Date.now()}`,
        company_id: tenant.companyId,
        branch_id: employee.branch_id || null,
        advance_voucher_number: `ADV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        employee_id: employee.id,
        employee_name: employee.name,
        amount: params.amount,
        deducted_amount: 0,
        remaining_amount: params.amount,
        disbursed_date: todayStr,
        payment_method: 'cash',
        reason: params.reason,
        status: 'pending',
        is_settled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      return { success: true, data: record }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit advance request.' }
    }
  }
)

export const getEmployeeByIdAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, id: string,
  companyIdParam?: string) : Promise<ServerActionResult<EmployeeRecord | null>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const employee = await WorkforceService.getEmployeeById(id, tenant.companyId)
    return { success: true, data: employee }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch employee.' }
  }

})

export const createEmployeeAction = withTenantAction(
  {
    permission: "hr.create",
    entityType: "workforce"
  },
  async (ctx, input: Partial<EmployeeRecord> & { name: string },
  companyIdParam?: string) : Promise<ServerActionResult<EmployeeRecord>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    if (!hasAnyPermission(tenant, ['hr.create', 'hr.edit', 'hr.manage', 'hr.full_control', 'settings.manage'])) {
      return { success: false, error: 'Unauthorized: You do not have permission to add employees.' }
    }

    const employee = await WorkforceService.createEmployee(
      { ...input, company_id: tenant.companyId },
      tenant.userId,
      tenant.fullName || 'Admin'
    )

    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/employees`)
    revalidatePath(`/${tenant.companySlug}/hr/attendance`)
    revalidatePath(`/${tenant.companySlug}/hr/payroll`)
    return { success: true, data: employee }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create employee.' }
  }

})

export const updateEmployeeAction = withTenantAction(
  {
    permission: "hr.edit",
    entityType: "workforce"
  },
  async (ctx, id: string,
  updates: Partial<EmployeeRecord>,
  companyIdParam?: string) : Promise<ServerActionResult<EmployeeRecord | null>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    if (!hasAnyPermission(tenant, ['hr.edit', 'hr.manage', 'hr.full_control', 'settings.manage'])) {
      return { success: false, error: 'Unauthorized: You do not have permission to edit employees.' }
    }

    const employee = await WorkforceService.updateEmployee(
      id,
      tenant.companyId,
      updates,
      tenant.userId,
      tenant.fullName || 'Admin'
    )

    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/employees`)
    revalidatePath(`/${tenant.companySlug}/hr/attendance`)
    revalidatePath(`/${tenant.companySlug}/hr/payroll`)
    return { success: true, data: employee }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update employee.' }
  }

})

export const deleteEmployeeAction = withTenantAction(
  {
    permission: "hr.delete",
    destructive: true,
    requireConfirmation: false,
    auditAction: "workforce.deleteemployee",
    entityType: "workforce"
  },
  async (ctx, id: string,
  companyIdParam?: string) : Promise<ServerActionResult<boolean>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    if (!hasAnyPermission(tenant, ['hr.delete', 'hr.full_control', 'settings.manage'])) {
      return { success: false, error: 'Unauthorized: You do not have permission to delete employees.' }
    }

    const result = await WorkforceService.deleteEmployee(
      id,
      tenant.companyId,
      tenant.userId,
      tenant.fullName || 'Admin'
    )
    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/employees`)
    revalidatePath(`/${tenant.companySlug}/hr/attendance`)
    revalidatePath(`/${tenant.companySlug}/hr/payroll`)
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete employee.' }
  }

})

export const sendEmployeeInvitationAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, employeeId: string,
  companyIdParam?: string,
  overrideEmail?: string) : Promise<ServerActionResult<{ inviteUrl?: string; email?: string }>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    if (!hasAnyPermission(tenant, ['hr.edit', 'hr.manage', 'hr.full_control', 'settings.manage'])) {
      return { success: false, error: 'Unauthorized: You do not have permission to invite employees.' }
    }

    const appUrl = await getRequestBaseUrl()
    const result = await WorkforceService.sendEmployeeInvitation(
      employeeId,
      tenant.companyId,
      tenant.companyName,
      tenant.companySlug,
      tenant.fullName || 'Admin',
      appUrl,
      overrideEmail
    )

    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/employees`)
    return {
      success: result.success,
      data: { inviteUrl: result.inviteUrl, email: result.email },
      error: result.success ? undefined : result.message,
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send employee invitation.' }
  }

})

export const updateEmployeeLoginCredentialsAction = withTenantAction(
  {
    permission: "users.edit",
    destructive: true,
    auditAction: "workforce.updateemployeelogincredentials",
    entityType: "workforce"
  },
  async (ctx, employeeId: string,
  credentials: PortalCredentials,
  companyIdParam?: string) : Promise<ServerActionResult<EmployeeRecord>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    if (!hasAnyPermission(tenant, ['hr.edit', 'hr.manage', 'hr.full_control', 'settings.manage'])) {
      return { success: false, error: 'Unauthorized: You do not have permission to manage employee credentials.' }
    }

    const appUrl = await getRequestBaseUrl()
    const result = await WorkforceService.updateEmployeeLoginCredentials(
      employeeId,
      tenant.companyId,
      credentials,
      tenant.userId,
      tenant.fullName || 'Admin',
      tenant.companyName,
      tenant.companySlug,
      appUrl
    )

    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/employees`)
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update employee login credentials.' }
  }

})

// ============================================================================
// 3. SHIFTS ACTIONS
// ============================================================================

export const getShiftsAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, branchId?: string,
  companyIdParam?: string) : Promise<ServerActionResult<ShiftRecord[]>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const shifts = await WorkforceService.getShifts(tenant.companyId, branchId)
    return { success: true, data: shifts }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch shifts.' }
  }

})

export const createShiftAction = withTenantAction(
  {
    permission: "hr.create",
    entityType: "workforce"
  },
  async (ctx, input: Partial<ShiftRecord> & { shift_name: string; start_time: string; end_time: string },
  companyIdParam?: string) : Promise<ServerActionResult<ShiftRecord>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    if (!hasAnyPermission(tenant, ['hr.edit', 'hr.create', 'settings.manage'])) {
      return { success: false, error: 'Unauthorized: You do not have permission to configure shifts.' }
    }

    const shift = await WorkforceService.createShift({ ...input, company_id: tenant.companyId })
    revalidatePath(`/${tenant.companySlug}/hr`)
    return { success: true, data: shift }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create shift.' }
  }

})

// ============================================================================
// 4. DAILY ATTENDANCE ACTIONS
// ============================================================================

export const getDailyAttendanceAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, options?: {
    date?: string
    startDate?: string
    endDate?: string
    employeeId?: string
    department?: string
    status?: string
    branchId?: string
  },
  companyIdParam?: string) : Promise<ServerActionResult<AttendanceDailySummaryRecord[]>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const summaries = await WorkforceService.getDailyAttendance(tenant.companyId, options)
    return { success: true, data: summaries }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch daily attendance.' }
  }

})

export const recordAttendanceSummaryAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, params: {
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
  },
  companyIdParam?: string) : Promise<ServerActionResult<AttendanceDailySummaryRecord>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    if (!hasAnyPermission(tenant, ['hr.create', 'hr.edit', 'production.edit', 'hr.manage'])) {
      return { success: false, error: 'Unauthorized: You do not have permission to mark attendance.' }
    }

    const record = await WorkforceService.recordAttendanceSummary({
      ...params,
      companyId: tenant.companyId,
      actorId: tenant.userId,
      actorName: tenant.fullName || 'Manager',
    })

    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/attendance`)
    revalidatePath(`/${tenant.companySlug}/hr/employees`)
    revalidatePath(`/${tenant.companySlug}/hr/payroll`)
    revalidatePath(`/${tenant.companySlug}/hr/salary-report`)
    return { success: true, data: record }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record attendance.' }
  }

})

// ============================================================================
// 5. OVERTIME ACTIONS
// ============================================================================

export const getOvertimeRecordsAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, options?: { employeeId?: string; status?: string; otDate?: string; payrollPeriodId?: string },
  companyIdParam?: string) : Promise<ServerActionResult<OvertimeRecord[]>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const records = await WorkforceService.getOvertimeRecords(tenant.companyId, options)
    return { success: true, data: records }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch overtime records.' }
  }

})

export const createOvertimeRequestAction = withTenantAction(
  {
    permission: "hr.create",
    entityType: "workforce"
  },
  async (ctx, params: {
    employeeId: string
    otDate: string
    durationMinutes: number
    otType?: OvertimeRecord['ot_type']
    reason: string
  },
  companyIdParam?: string) : Promise<ServerActionResult<OvertimeRecord>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const record = await WorkforceService.createOvertimeRequest({
      ...params,
      companyId: tenant.companyId,
      requestedById: tenant.userId,
      requestedByName: tenant.fullName || 'Staff',
    })

    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/attendance`)
    revalidatePath(`/${tenant.companySlug}/hr/payroll`)
    return { success: true, data: record }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit overtime request.' }
  }

})

export const reviewOvertimeAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, params: {
    id: string
    status: 'approved' | 'rejected'
    multiplier?: number
    rejectionReason?: string
  },
  companyIdParam?: string) : Promise<ServerActionResult<OvertimeRecord>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    if (!hasAnyPermission(tenant, ['hr.approve', 'hr.edit', 'hr.manage', 'settings.manage'])) {
      return { success: false, error: 'Unauthorized: You do not have permission to approve/reject overtime.' }
    }

    const reviewed = await WorkforceService.reviewOvertime({
      ...params,
      companyId: tenant.companyId,
      reviewerId: tenant.userId,
      reviewerName: tenant.fullName || 'Manager',
    })

    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/attendance`)
    revalidatePath(`/${tenant.companySlug}/hr/payroll`)
    return { success: true, data: reviewed }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to review overtime record.' }
  }

})

// ============================================================================
// 6. SALARY ADVANCES ACTIONS
// ============================================================================

export const getSalaryAdvancesAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, options?: { employeeId?: string; status?: string; isSettled?: boolean },
  companyIdParam?: string) : Promise<ServerActionResult<SalaryAdvanceRecord[]>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const advances = await WorkforceService.getSalaryAdvances(tenant.companyId, options)
    return { success: true, data: advances }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch salary advances.' }
  }

})

export const disburseSalaryAdvanceAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, params: {
    employeeId: string
    amount: number
    paymentMethod: PaymentMethod
    reason?: string
  },
  companyIdParam?: string) : Promise<ServerActionResult<SalaryAdvanceRecord>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    if (!hasAnyPermission(tenant, ['hr.edit', 'finance.edit', 'hr.manage', 'finance.manage', 'settings.manage'])) {
      return { success: false, error: 'Unauthorized: You do not have permission to disburse salary advances.' }
    }

    const advance = await WorkforceService.disburseSalaryAdvance({
      ...params,
      companyId: tenant.companyId,
      actorId: tenant.userId,
      actorName: tenant.fullName || 'Accounts Manager',
    })

    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/employees`)
    revalidatePath(`/${tenant.companySlug}/hr/payroll`)
    revalidatePath(`/${tenant.companySlug}/hr/salary-report`)
    return { success: true, data: advance }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to disburse salary advance.' }
  }

})

// ============================================================================
// 7. PAYROLL PERIODS ACTIONS
// ============================================================================

export const getPayrollPeriodsAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, options?: { status?: string },
  companyIdParam?: string) : Promise<ServerActionResult<PayrollPeriodRecord[]>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const periods = await WorkforceService.getPayrollPeriods(tenant.companyId, options)
    return { success: true, data: periods }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch payroll periods.' }
  }

})

export const getPayrollPeriodDetailAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, id: string,
  companyIdParam?: string) : Promise<ServerActionResult<PayrollPeriodRecord | null>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const period = await WorkforceService.getPayrollPeriodById(id, tenant.companyId)
    return { success: true, data: period }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch payroll period.' }
  }

})

export const generatePayrollDraftAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, params: {
    periodName: string
    startDate: string
    endDate: string
    workingDaysCount?: number
    branchId?: string
  },
  companyIdParam?: string) : Promise<ServerActionResult<PayrollPeriodRecord>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    if (!hasAnyPermission(tenant, ['payroll.edit', 'payroll.manage', 'hr.manage', 'settings.manage'])) {
      return { success: false, error: 'Unauthorized: You do not have permission to generate payroll.' }
    }

    const period = await WorkforceService.generateMonthlyPayrollDraft({
      ...params,
      companyId: tenant.companyId,
      actorId: tenant.userId,
      actorName: tenant.fullName || 'Accounts Manager',
    })

    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/payroll`)
    revalidatePath(`/${tenant.companySlug}/hr/salary-report`)
    return { success: true, data: period }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate payroll sheet.' }
  }

})

export const approvePayrollAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, periodId: string,
  companyIdParam?: string) : Promise<ServerActionResult<PayrollPeriodRecord>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    if (!hasAnyPermission(tenant, ['payroll.approve', 'payroll.manage', 'settings.manage'])) {
      return { success: false, error: 'Unauthorized: You do not have permission to approve payroll.' }
    }

    const approved = await WorkforceService.approvePayrollPeriod(
      periodId,
      tenant.companyId,
      tenant.userId,
      tenant.fullName || 'Managing Director'
    )

    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/payroll`)
    revalidatePath(`/${tenant.companySlug}/hr/salary-report`)
    return { success: true, data: approved }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to approve payroll period.' }
  }

})

export const lockPayrollAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, periodId: string,
  companyIdParam?: string) : Promise<ServerActionResult<PayrollPeriodRecord>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    if (!hasAnyPermission(tenant, ['payroll.approve', 'payroll.manage', 'settings.manage'])) {
      return { success: false, error: 'Unauthorized: You do not have permission to lock payroll.' }
    }

    const locked = await WorkforceService.lockPayrollPeriod(
      periodId,
      tenant.companyId,
      tenant.userId,
      tenant.fullName || 'Managing Director'
    )

    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/payroll`)
    revalidatePath(`/${tenant.companySlug}/hr/salary-report`)
    return { success: true, data: locked }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to lock payroll period.' }
  }

})

export const recordSalaryPaymentAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "workforce"
  },
  async (ctx, params: {
    payrollPeriodId: string
    payrollItemId: string
    employeeId: string
    amount: number
    paymentMethod: PaymentMethod
    referenceNumber?: string
    notes?: string
  },
  companyIdParam?: string) : Promise<ServerActionResult<SalaryPaymentRecord>> => {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    if (!hasAnyPermission(tenant, ['payroll.pay', 'finance.edit', 'payroll.manage', 'settings.manage'])) {
      return { success: false, error: 'Unauthorized: You do not have permission to record salary payments.' }
    }

    const payment = await WorkforceService.recordSalaryPayment({
      ...params,
      companyId: tenant.companyId,
      paidById: tenant.userId,
      paidByName: tenant.fullName || 'Accounts Manager',
    })

    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/payroll`)
    revalidatePath(`/${tenant.companySlug}/hr/salary-report`)
    return { success: true, data: payment }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record salary payment.' }
  }

})
