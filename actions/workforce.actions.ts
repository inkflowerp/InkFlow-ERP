'use server'

// ==============================================================================
// InkFlow ERP - Authoritative Workforce, Attendance, Overtime & Payroll Server Actions
// Strict Multi-Tenant Isolation, RBAC Permission Checks, and Audit Logging
// ==============================================================================

import { revalidatePath } from 'next/cache'
import { requireTenantUser, getCurrentTenant } from '@/lib/auth/tenant-auth'
import { WorkforceService } from '@/services/workforce.service'
import { WorkforceRepository } from '@/lib/repositories/workforce.repository'
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
} from '@/types/workforce.types'

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

export async function getWorkforceSummaryAction(
  companyIdParam?: string
): Promise<ServerActionResult<WorkforceSummaryKPIs>> {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const emps = await WorkforceRepository.getEmployees(tenant.companyId)
    if (emps.length === 0) {
      await WorkforceRepository.seedDefaultEmployees(tenant.companyId)
    }
    const summary = await WorkforceService.getWorkforceSummary(tenant.companyId)
    return { success: true, data: summary }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch workforce summary.' }
  }
}

// ============================================================================
// 2. EMPLOYEES ACTIONS
// ============================================================================

export async function getEmployeesAction(
  options?: { branchId?: string; status?: string; department?: string; isDailyWorker?: boolean },
  companyIdParam?: string
): Promise<ServerActionResult<EmployeeRecord[]>> {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    let employees = await WorkforceService.getEmployees(tenant.companyId, options)

    // If no employees found, check if tenant has ANY employees overall
    if (employees.length === 0) {
      const allEmps = await WorkforceService.getEmployees(tenant.companyId)
      if (allEmps.length === 0) {
        // Auto-seed for this tenant
        await WorkforceRepository.seedDefaultEmployees(tenant.companyId)
        employees = await WorkforceService.getEmployees(tenant.companyId, options)
      }
    }

    return { success: true, data: employees }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch employees.' }
  }
}

export async function getEmployeeByIdAction(
  id: string,
  companyIdParam?: string
): Promise<ServerActionResult<EmployeeRecord | null>> {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const employee = await WorkforceService.getEmployeeById(id, tenant.companyId)
    return { success: true, data: employee }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch employee.' }
  }
}

export async function createEmployeeAction(
  input: Partial<EmployeeRecord> & { name: string },
  companyIdParam?: string
): Promise<ServerActionResult<EmployeeRecord>> {
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
}

export async function updateEmployeeAction(
  id: string,
  updates: Partial<EmployeeRecord>,
  companyIdParam?: string
): Promise<ServerActionResult<EmployeeRecord | null>> {
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
}

export async function deleteEmployeeAction(
  id: string,
  companyIdParam?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    if (!hasAnyPermission(tenant, ['hr.delete', 'hr.full_control', 'settings.manage'])) {
      return { success: false, error: 'Unauthorized: You do not have permission to delete employees.' }
    }

    const result = await WorkforceService.deleteEmployee(id, tenant.companyId)
    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/employees`)
    revalidatePath(`/${tenant.companySlug}/hr/attendance`)
    revalidatePath(`/${tenant.companySlug}/hr/payroll`)
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete employee.' }
  }
}

// ============================================================================
// 3. SHIFTS ACTIONS
// ============================================================================

export async function getShiftsAction(
  branchId?: string,
  companyIdParam?: string
): Promise<ServerActionResult<ShiftRecord[]>> {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const shifts = await WorkforceService.getShifts(tenant.companyId, branchId)
    return { success: true, data: shifts }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch shifts.' }
  }
}

export async function createShiftAction(
  input: Partial<ShiftRecord> & { shift_name: string; start_time: string; end_time: string },
  companyIdParam?: string
): Promise<ServerActionResult<ShiftRecord>> {
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
}

// ============================================================================
// 4. DAILY ATTENDANCE ACTIONS
// ============================================================================

export async function getDailyAttendanceAction(
  options?: {
    date?: string
    startDate?: string
    endDate?: string
    employeeId?: string
    department?: string
    status?: string
    branchId?: string
  },
  companyIdParam?: string
): Promise<ServerActionResult<AttendanceDailySummaryRecord[]>> {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const summaries = await WorkforceService.getDailyAttendance(tenant.companyId, options)
    return { success: true, data: summaries }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch daily attendance.' }
  }
}

export async function recordAttendanceSummaryAction(
  params: {
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
  companyIdParam?: string
): Promise<ServerActionResult<AttendanceDailySummaryRecord>> {
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
    revalidatePath(`/${tenant.companySlug}/attendance`)
    return { success: true, data: record }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record attendance.' }
  }
}

// ============================================================================
// 5. OVERTIME ACTIONS
// ============================================================================

export async function getOvertimeRecordsAction(
  options?: { employeeId?: string; status?: string; otDate?: string; payrollPeriodId?: string },
  companyIdParam?: string
): Promise<ServerActionResult<OvertimeRecord[]>> {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const records = await WorkforceService.getOvertimeRecords(tenant.companyId, options)
    return { success: true, data: records }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch overtime records.' }
  }
}

export async function createOvertimeRequestAction(
  params: {
    employeeId: string
    otDate: string
    durationMinutes: number
    otType?: OvertimeRecord['ot_type']
    reason: string
  },
  companyIdParam?: string
): Promise<ServerActionResult<OvertimeRecord>> {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const record = await WorkforceService.createOvertimeRequest({
      ...params,
      companyId: tenant.companyId,
      requestedById: tenant.userId,
      requestedByName: tenant.fullName || 'Staff',
    })

    revalidatePath(`/${tenant.companySlug}/hr`)
    return { success: true, data: record }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit overtime request.' }
  }
}

export async function reviewOvertimeAction(
  params: {
    id: string
    status: 'approved' | 'rejected'
    multiplier?: number
    rejectionReason?: string
  },
  companyIdParam?: string
): Promise<ServerActionResult<OvertimeRecord>> {
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
    return { success: true, data: reviewed }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to review overtime record.' }
  }
}

// ============================================================================
// 6. SALARY ADVANCES ACTIONS
// ============================================================================

export async function getSalaryAdvancesAction(
  options?: { employeeId?: string; status?: string; isSettled?: boolean },
  companyIdParam?: string
): Promise<ServerActionResult<SalaryAdvanceRecord[]>> {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    const advances = await WorkforceService.getSalaryAdvances(tenant.companyId, options)
    return { success: true, data: advances }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch salary advances.' }
  }
}

export async function disburseSalaryAdvanceAction(
  params: {
    employeeId: string
    amount: number
    paymentMethod: PaymentMethod
    reason?: string
  },
  companyIdParam?: string
): Promise<ServerActionResult<SalaryAdvanceRecord>> {
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
    return { success: true, data: advance }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to disburse salary advance.' }
  }
}

// ============================================================================
// 7. PAYROLL PERIODS ACTIONS
// ============================================================================

export async function getPayrollPeriodsAction(
  options?: { status?: string },
  companyIdParam?: string
): Promise<ServerActionResult<PayrollPeriodRecord[]>> {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    let periods = await WorkforceService.getPayrollPeriods(tenant.companyId, options)
    if (periods.length === 0) {
      periods = await WorkforceRepository.seedDefaultPayrollPeriod(tenant.companyId)
    }
    return { success: true, data: periods }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch payroll periods.' }
  }
}

export async function getPayrollPeriodDetailAction(
  id: string,
  companyIdParam?: string
): Promise<ServerActionResult<PayrollPeriodRecord | null>> {
  try {
    const tenant = await requireTenantUser(companyIdParam)
    let period = await WorkforceService.getPayrollPeriodById(id, tenant.companyId)
    if (!period) {
      const periods = await WorkforceRepository.getPayrollPeriods(tenant.companyId)
      period = periods.find((p) => p.id === id || p.period_name.toLowerCase().includes(id.toLowerCase())) || periods[0] || null
    }
    return { success: true, data: period }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch payroll period.' }
  }
}

export async function generatePayrollDraftAction(
  params: {
    periodName: string
    startDate: string
    endDate: string
    workingDaysCount?: number
    branchId?: string
  },
  companyIdParam?: string
): Promise<ServerActionResult<PayrollPeriodRecord>> {
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
    return { success: true, data: period }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate payroll sheet.' }
  }
}

export async function approvePayrollAction(
  periodId: string,
  companyIdParam?: string
): Promise<ServerActionResult<PayrollPeriodRecord>> {
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
    return { success: true, data: approved }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to approve payroll period.' }
  }
}

export async function lockPayrollAction(
  periodId: string,
  companyIdParam?: string
): Promise<ServerActionResult<PayrollPeriodRecord>> {
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
    return { success: true, data: locked }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to lock payroll period.' }
  }
}

export async function recordSalaryPaymentAction(
  params: {
    payrollPeriodId: string
    payrollItemId: string
    employeeId: string
    amount: number
    paymentMethod: PaymentMethod
    referenceNumber?: string
    notes?: string
  },
  companyIdParam?: string
): Promise<ServerActionResult<SalaryPaymentRecord>> {
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
    return { success: true, data: payment }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record salary payment.' }
  }
}
