// ==============================================================================
// InkFlow ERP - Authoritative Workforce Service (V6)
// Shift schedules, Overnight shift calculations, Overtime rules, Daily labor & V4 Costing Bridge
// ==============================================================================

import { WorkforceRepository } from '../lib/repositories/workforce.repository.ts'
import { CostingRepository } from '../lib/repositories/costing.repository.ts'
import type {
  EmployeeRecord,
  ShiftRecord,
  DailyLaborLogRecord,
} from '../types/hr.types.ts'

export class WorkforceService {
  // ============================================================================
  // 1. EMPLOYEES & RESPONSIBILITIES
  // ============================================================================

  static async getEmployees(companyId: string, options?: { branchId?: string; status?: string; department?: string }) {
    return WorkforceRepository.getEmployees(companyId, options)
  }

  static async getEmployeeById(id: string, companyId: string) {
    return WorkforceRepository.getEmployeeById(id, companyId)
  }

  static async createEmployee(input: Partial<EmployeeRecord> & { company_id: string; name: string }): Promise<EmployeeRecord> {
    const year = new Date().getFullYear()
    const randomSeq = Math.floor(Math.random() * 900000) + 100000
    const code = input.employee_id_number || `EMP-${year}-${randomSeq}`

    const now = new Date().toISOString()
    const employee: EmployeeRecord = {
      id: input.id || `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: input.company_id,
      branch_id: input.branch_id || null,
      user_id: input.user_id || null,
      employee_id_number: code,
      name: input.name,
      name_bn: input.name_bn || null,
      mobile: input.mobile || '',
      email: input.email || null,
      address: input.address || null,
      emergency_contact_name: input.emergency_contact_name || null,
      emergency_contact_phone: input.emergency_contact_phone || null,
      emergency_contact_relation: input.emergency_contact_relation || null,
      role: input.role || 'Staff',
      responsibilities: input.responsibilities || [input.role || 'Staff'],
      department: input.department || 'printing',
      employee_type: input.employee_type || 'permanent',
      joining_date: input.joining_date || now.split('T')[0],
      salary_type: input.salary_type || 'monthly',
      base_salary: Number(input.base_salary || 0),
      daily_rate: Number(input.daily_rate || 0),
      hourly_rate: Number(input.hourly_rate || (input.base_salary ? (input.base_salary / 208).toFixed(2) : 0)),
      overtime_hourly_rate: Number(input.overtime_hourly_rate || ((input.hourly_rate || (input.base_salary ? input.base_salary / 208 : 100)) * 1.5).toFixed(2)),
      current_advance_balance: Number(input.current_advance_balance || 0),
      is_daily_worker: Boolean(input.is_daily_worker || input.employee_type === 'daily_labor' || input.employee_type === 'daily_worker'),
      bank_payment_info: input.bank_payment_info || null,
      mfs_payment_info: input.mfs_payment_info || null,
      status: input.status || 'active',
      notes: input.notes || null,
      created_at: now,
      updated_at: now,
    }

    return WorkforceRepository.createEmployee(employee)
  }

  static async updateEmployee(id: string, companyId: string, updates: Partial<EmployeeRecord>) {
    return WorkforceRepository.updateEmployee(id, companyId, updates)
  }

  // ============================================================================
  // 2. SHIFTS & OVERNIGHT CALCULATION ENGINE
  // ============================================================================

  static async getShifts(companyId: string, branchId?: string) {
    return WorkforceRepository.getShifts(companyId, branchId)
  }

  static async createShift(input: Partial<ShiftRecord> & { company_id: string; shift_name: string; start_time: string; end_time: string }): Promise<ShiftRecord> {
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

  /**
   * Calculates planned shift duration in hours, properly supporting overnight shifts (e.g. 22:00 -> 06:00).
   */
  static calculateShiftDurationHours(shift: ShiftRecord): number {
    const [startH, startM] = shift.start_time.split(':').map(Number)
    const [endH, endM] = shift.end_time.split(':').map(Number)

    let startTotalMins = startH * 60 + startM
    let endTotalMins = endH * 60 + endM

    if (shift.is_overnight || endTotalMins <= startTotalMins) {
      endTotalMins += 24 * 60
    }

    const netMins = endTotalMins - startTotalMins - (shift.break_duration_minutes || 0)
    return Math.max(0, Number((netMins / 60).toFixed(2)))
  }

  /**
   * Calculates overtime hours and monetary amount for an attendance session.
   */
  static calculateOvertime(params: {
    checkInTime: string
    checkOutTime: string
    shift: ShiftRecord
    hourlyRate: number
    multiplier?: number
  }): { workedHours: number; overtimeMinutes: number; overtimeHours: number; overtimeAmount: number } {
    const checkIn = new Date(params.checkInTime)
    const checkOut = new Date(params.checkOutTime)

    const totalDiffMs = Math.max(0, checkOut.getTime() - checkIn.getTime())
    const totalWorkedMins = Math.floor(totalDiffMs / (1000 * 60))
    const workedHours = Number((totalWorkedMins / 60).toFixed(2))

    const plannedShiftHours = this.calculateShiftDurationHours(params.shift)
    const plannedShiftMins = plannedShiftHours * 60

    let overtimeMinutes = 0
    if (params.shift.overtime_rules?.enabled) {
      const minThreshold = params.shift.overtime_rules.min_minutes || 30
      const diffMins = totalWorkedMins - plannedShiftMins

      if (diffMins >= minThreshold) {
        overtimeMinutes = diffMins
      }
    }

    const overtimeHours = Number((overtimeMinutes / 60).toFixed(2))
    const multiplier = params.multiplier || params.shift.overtime_rules?.multiplier || 1.5
    const overtimeAmount = Number((overtimeHours * params.hourlyRate * multiplier).toFixed(2))

    return {
      workedHours,
      overtimeMinutes,
      overtimeHours,
      overtimeAmount,
    }
  }

  // ============================================================================
  // 3. DAILY LABOR LOGS & ATTRIBUTION
  // ============================================================================

  static async recordDailyLabor(params: {
    companyId: string
    employeeId: string
    employeeName: string
    workDate: string
    assignedJobNumber?: string | null
    dailyRate: number
    overtimeHours?: number
    hourlyOvertimeRate?: number
    productionContribution: string
  }): Promise<DailyLaborLogRecord> {
    const otHours = Number(params.overtimeHours || 0)
    const otRate = Number(params.hourlyOvertimeRate || (params.dailyRate / 8) * 1.5)
    const totalPayout = Number((params.dailyRate + otHours * otRate).toFixed(2))

    const now = new Date().toISOString()
    const log: DailyLaborLogRecord = {
      id: `dll-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: params.companyId,
      employee_id: params.employeeId,
      employee_name: params.employeeName,
      work_date: params.workDate,
      assigned_job_number: params.assignedJobNumber || null,
      daily_rate: params.dailyRate,
      overtime_hours: otHours,
      total_payout: totalPayout,
      production_contribution: params.productionContribution,
      payment_status: 'unpaid',
      created_at: now,
    }

    return WorkforceRepository.recordDailyLabor(log)
  }

  // ============================================================================
  // 4. WORKFORCE COST INTEGRATION WITH V4 COSTING
  // ============================================================================

  /**
   * Reconciles workforce labor costs for a specific job order with V4 Costing.
   * Updates `job_costings.actual_labor_cost` non-destructively without mutating historical snapshots.
   */
  static async reconcileJobLaborCost(companyId: string, jobOrderId: string, jobNumber?: string): Promise<number> {
    // 1. Gather all daily labor logs for this job
    const dailyLogs = await WorkforceRepository.getDailyLaborLogs(companyId, {
      jobNumber: jobNumber || undefined,
    })

    const dailyLaborSum = dailyLogs.reduce((sum, l) => sum + Number(l.total_payout || 0), 0)

    // 2. Fetch job costing record in V4
    const jobCosting = await CostingRepository.getJobCostingByJobId(jobOrderId, companyId)
    if (jobCosting) {
      const currentLabor = Number(jobCosting.act?.labor_cost || (jobCosting as any).actual_labor_cost || 0)
      const updatedActualLabor = Number((currentLabor + dailyLaborSum).toFixed(2))
      const updatedAct = jobCosting.act
        ? {
            ...jobCosting.act,
            labor_cost: updatedActualLabor,
            total_cost: Number(((jobCosting.act.total_cost || 0) + dailyLaborSum).toFixed(2)),
          }
        : undefined

      await CostingRepository.updateJobCosting(jobCosting.id, companyId, {
        ...(updatedAct ? { act: updatedAct } : {}),
        ...({ actual_labor_cost: updatedActualLabor } as any),
      })
      return updatedActualLabor
    }

    return dailyLaborSum
  }
}
