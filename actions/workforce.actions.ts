'use server'

// ==============================================================================
// InkFlow ERP - Authoritative Workforce Server Actions (V6)
// ==============================================================================

import { WorkforceService } from '@/services/workforce.service'
import { getTenantCompanyId } from '@/lib/auth/tenant-auth'
import type { EmployeeRecord, ShiftRecord } from '@/types/hr.types'

export async function getEmployeesAction(options?: { branchId?: string; status?: string; department?: string }) {
  try {
    const companyId = await getTenantCompanyId()
    const employees = await WorkforceService.getEmployees(companyId, options)
    return { success: true, data: employees }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch employees.' }
  }
}

export async function createEmployeeAction(input: Partial<EmployeeRecord> & { name: string }) {
  try {
    const companyId = await getTenantCompanyId()
    const employee = await WorkforceService.createEmployee({ ...input, company_id: companyId })
    return { success: true, data: employee }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create employee.' }
  }
}

export async function updateEmployeeAction(id: string, updates: Partial<EmployeeRecord>) {
  try {
    const companyId = await getTenantCompanyId()
    const employee = await WorkforceService.updateEmployee(id, companyId, updates)
    return { success: true, data: employee }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update employee.' }
  }
}

export async function getShiftsAction(branchId?: string) {
  try {
    const companyId = await getTenantCompanyId()
    const shifts = await WorkforceService.getShifts(companyId, branchId)
    return { success: true, data: shifts }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch shifts.' }
  }
}

export async function createShiftAction(input: Partial<ShiftRecord> & { shift_name: string; start_time: string; end_time: string }) {
  try {
    const companyId = await getTenantCompanyId()
    const shift = await WorkforceService.createShift({ ...input, company_id: companyId })
    return { success: true, data: shift }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create shift.' }
  }
}

export async function recordDailyLaborAction(input: {
  employeeId: string
  employeeName: string
  workDate: string
  assignedJobNumber?: string | null
  dailyRate: number
  overtimeHours?: number
  productionContribution: string
}) {
  try {
    const companyId = await getTenantCompanyId()
    const log = await WorkforceService.recordDailyLabor({
      companyId,
      ...input,
    })
    return { success: true, data: log }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record daily labor log.' }
  }
}
