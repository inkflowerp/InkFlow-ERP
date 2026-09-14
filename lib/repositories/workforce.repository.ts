// ==============================================================================
// InkFlow ERP - Authoritative Workforce Repository (V6)
// PostgreSQL persistence for Employees, Shifts, Shift Assignments, and Daily Labor
// ==============================================================================

import { createAdminClient } from '../supabase/admin.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import type {
  EmployeeRecord,
  ShiftRecord,
  EmployeeShiftRecord,
  DailyLaborLogRecord,
} from '../../types/hr.types.ts'

export class WorkforceRepository {
  // ============================================================================
  // 1. EMPLOYEES
  // ============================================================================

  static async getEmployees(
    companyId: string,
    options?: { branchId?: string; status?: string; department?: string; isDailyWorker?: boolean }
  ): Promise<EmployeeRecord[]> {
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (options?.branchId) {
        query = query.eq('branch_id', options.branchId)
      }
      if (options?.status) {
        query = query.eq('status', options.status)
      }
      if (options?.department) {
        query = query.eq('department', options.department)
      }
      if (options?.isDailyWorker !== undefined) {
        query = query.eq('is_daily_worker', options.isDailyWorker)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as EmployeeRecord[]
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getEmployees] DB query fallback to store:', e)
    }

    const emps = PrintERPDataStore.get<EmployeeRecord[]>(STORAGE_KEYS.EMPLOYEES) || []
    return emps.filter((e) => {
      if (e.company_id && e.company_id !== companyId) return false
      if (options?.branchId && e.branch_id !== options.branchId) return false
      if (options?.status && e.status !== options.status) return false
      if (options?.department && e.department !== options.department) return false
      if (options?.isDailyWorker !== undefined && Boolean(e.is_daily_worker) !== options.isDailyWorker) return false
      return true
    })
  }

  static async getEmployeeById(id: string, companyId: string): Promise<EmployeeRecord | null> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', id)
        .maybeSingle()

      if (!error && data) {
        return data as EmployeeRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getEmployeeById] DB fallback:', e)
    }

    const emps = await this.getEmployees(companyId)
    return emps.find((e) => e.id === id || e.employee_id_number === id) || null
  }

  static async createEmployee(emp: EmployeeRecord): Promise<EmployeeRecord> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('employees')
        .insert(emp)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.EMPLOYEES, data as EmployeeRecord)
        return data as EmployeeRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.createEmployee] DB insert fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.EMPLOYEES, emp)
    return emp
  }

  static async updateEmployee(
    id: string,
    companyId: string,
    updates: Partial<EmployeeRecord>
  ): Promise<EmployeeRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }

    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('employees')
        .update(payload)
        .eq('company_id', companyId)
        .eq('id', id)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<EmployeeRecord>(STORAGE_KEYS.EMPLOYEES, id, data)
        return data as EmployeeRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.updateEmployee] DB update fallback:', e)
    }

    return PrintERPDataStore.updateItem<EmployeeRecord>(STORAGE_KEYS.EMPLOYEES, id, payload)
  }

  // ============================================================================
  // 2. SHIFTS
  // ============================================================================

  static async getShifts(companyId: string, branchId?: string): Promise<ShiftRecord[]> {
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('shifts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (branchId) {
        query = query.eq('branch_id', branchId)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as ShiftRecord[]
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getShifts] DB fallback:', e)
    }

    const shifts = PrintERPDataStore.get<ShiftRecord[]>(STORAGE_KEYS.SHIFTS) || []
    return shifts.filter((s) => {
      if (s.company_id && s.company_id !== companyId) return false
      if (branchId && s.branch_id !== branchId) return false
      return true
    })
  }

  static async getShiftById(id: string, companyId: string): Promise<ShiftRecord | null> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('shifts')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', id)
        .maybeSingle()

      if (!error && data) {
        return data as ShiftRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getShiftById] DB fallback:', e)
    }

    const shifts = await this.getShifts(companyId)
    return shifts.find((s) => s.id === id || s.shift_code === id) || null
  }

  static async createShift(shift: ShiftRecord): Promise<ShiftRecord> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('shifts')
        .insert(shift)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.SHIFTS, data as ShiftRecord)
        return data as ShiftRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.createShift] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.SHIFTS, shift)
    return shift
  }

  static async updateShift(
    id: string,
    companyId: string,
    updates: Partial<ShiftRecord>
  ): Promise<ShiftRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }

    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('shifts')
        .update(payload)
        .eq('company_id', companyId)
        .eq('id', id)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<ShiftRecord>(STORAGE_KEYS.SHIFTS, id, data)
        return data as ShiftRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.updateShift] DB fallback:', e)
    }

    return PrintERPDataStore.updateItem<ShiftRecord>(STORAGE_KEYS.SHIFTS, id, payload)
  }

  // ============================================================================
  // 3. EMPLOYEE SHIFT ASSIGNMENTS
  // ============================================================================

  static async assignShiftToEmployee(assignment: EmployeeShiftRecord): Promise<EmployeeShiftRecord> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('employee_shifts')
        .insert(assignment)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.EMPLOYEE_SHIFTS, data as EmployeeShiftRecord)
        return data as EmployeeShiftRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.assignShiftToEmployee] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.EMPLOYEE_SHIFTS, assignment)
    return assignment
  }

  static async getActiveShiftForEmployee(
    employeeId: string,
    companyId: string
  ): Promise<ShiftRecord | null> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('employee_shifts')
        .select('*, shifts(*)')
        .eq('company_id', companyId)
        .eq('employee_id', employeeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!error && data && data.shifts) {
        return data.shifts as ShiftRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getActiveShiftForEmployee] DB fallback:', e)
    }

    const assignments = PrintERPDataStore.get<EmployeeShiftRecord[]>(STORAGE_KEYS.EMPLOYEE_SHIFTS) || []
    const match = assignments.find(
      (a) => a.company_id === companyId && a.employee_id === employeeId && a.is_active
    )
    if (match) {
      return this.getShiftById(match.shift_id, companyId)
    }

    // Default to first active company shift
    const allShifts = await this.getShifts(companyId)
    return allShifts.find((s) => s.is_active) || null
  }

  // ============================================================================
  // 4. DAILY LABOR LOGS
  // ============================================================================

  static async getDailyLaborLogs(
    companyId: string,
    options?: { workDate?: string; jobNumber?: string; employeeId?: string }
  ): Promise<DailyLaborLogRecord[]> {
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('daily_labor_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('work_date', { ascending: false })

      if (options?.workDate) {
        query = query.eq('work_date', options.workDate)
      }
      if (options?.jobNumber) {
        query = query.eq('assigned_job_number', options.jobNumber)
      }
      if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as DailyLaborLogRecord[]
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getDailyLaborLogs] DB fallback:', e)
    }

    const logs = PrintERPDataStore.get<DailyLaborLogRecord[]>(STORAGE_KEYS.DAILY_LABOR_LOGS) || []
    return logs.filter((l) => {
      if (l.company_id && l.company_id !== companyId) return false
      if (options?.workDate && l.work_date !== options.workDate) return false
      if (options?.jobNumber && l.assigned_job_number !== options.jobNumber) return false
      if (options?.employeeId && l.employee_id !== options.employeeId) return false
      return true
    })
  }

  static async recordDailyLabor(log: DailyLaborLogRecord): Promise<DailyLaborLogRecord> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('daily_labor_logs')
        .insert(log)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.DAILY_LABOR_LOGS, data as DailyLaborLogRecord)
        return data as DailyLaborLogRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.recordDailyLabor] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.DAILY_LABOR_LOGS, log)
    return log
  }
}
