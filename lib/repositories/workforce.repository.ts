// ==============================================================================
// InkFlow ERP - Authoritative Workforce Repository
// PostgreSQL persistence with DataStore fallback for Employees, Shifts,
// Daily Attendance, Overtime Records, Salary Advances, Payroll & Payments
// ==============================================================================

import { createAdminClient } from '../supabase/admin.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import type {
  EmployeeRecord,
  ShiftRecord,
  AttendanceDailySummaryRecord,
  OvertimeRecord,
  SalaryAdvanceRecord,
  PayrollPeriodRecord,
  PayrollItemRecord,
  SalaryPaymentRecord,
  WorkforceAuditLogRecord,
} from '../../types/workforce.types.ts'

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
        .select('*, branches(name)')
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
        return data.map((d: any) => ({
          ...d,
          branch_name: d.branches?.name || null,
        })) as EmployeeRecord[]
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
        .select('*, branches(name)')
        .eq('company_id', companyId)
        .eq('id', id)
        .maybeSingle()

      if (!error && data) {
        return {
          ...data,
          branch_name: data.branches?.name || null,
        } as EmployeeRecord
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

  static async deleteEmployee(id: string, companyId: string): Promise<boolean> {
    try {
      const admin = createAdminClient()
      await (admin as any)
        .from('employees')
        .delete()
        .eq('company_id', companyId)
        .eq('id', id)
    } catch (e) {
      console.warn('[WorkforceRepository.deleteEmployee] DB delete fallback:', e)
    }

    return PrintERPDataStore.removeItem(STORAGE_KEYS.EMPLOYEES, id)
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

  static async assignShiftToEmployee(assignment: {
    id: string
    company_id: string
    employee_id: string
    shift_id: string
    effective_from: string
    effective_to?: string | null
    is_active: boolean
    created_at?: string
  }): Promise<any> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('employee_shifts')
        .insert(assignment)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.EMPLOYEE_SHIFTS, data)
        return data
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

    const assignments = PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEE_SHIFTS) || []
    const match = assignments.find(
      (a) => a.company_id === companyId && a.employee_id === employeeId && a.is_active
    )
    if (match) {
      return this.getShiftById(match.shift_id, companyId)
    }

    const allShifts = await this.getShifts(companyId)
    return allShifts.find((s) => s.is_active) || null
  }

  // ============================================================================
  // 3. DAILY ATTENDANCE SUMMARIES
  // ============================================================================

  static async getDailyAttendanceSummaries(
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
  ): Promise<AttendanceDailySummaryRecord[]> {
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('attendance_daily_summaries')
        .select('*, employees(name, role, department), shifts(shift_name), attendance_locations(name), job_orders(job_order_number)')
        .eq('company_id', companyId)
        .order('attendance_date', { ascending: false })

      if (options?.date) {
        query = query.eq('attendance_date', options.date)
      }
      if (options?.startDate) {
        query = query.gte('attendance_date', options.startDate)
      }
      if (options?.endDate) {
        query = query.lte('attendance_date', options.endDate)
      }
      if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId)
      }
      if (options?.status) {
        query = query.eq('status', options.status)
      }
      if (options?.branchId) {
        query = query.eq('branch_id', options.branchId)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          ...d,
          employee_name: d.employees?.name || 'Staff',
          employee_role: d.employees?.role || 'Operator',
          employee_department: d.employees?.department || 'printing',
          shift_name: d.shifts?.shift_name || null,
          location_name: d.attendance_locations?.name || null,
          job_order_number: d.job_orders?.job_order_number || null,
        })) as AttendanceDailySummaryRecord[]
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getDailyAttendanceSummaries] DB fallback:', e)
    }

    const summaries = PrintERPDataStore.get<AttendanceDailySummaryRecord[]>(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES) || []
    return summaries.filter((s) => {
      if (s.company_id && s.company_id !== companyId) return false
      if (options?.date && s.attendance_date !== options.date) return false
      if (options?.startDate && s.attendance_date < options.startDate) return false
      if (options?.endDate && s.attendance_date > options.endDate) return false
      if (options?.employeeId && s.employee_id !== options.employeeId) return false
      if (options?.status && s.status !== options.status) return false
      if (options?.branchId && s.branch_id !== options.branchId) return false
      return true
    })
  }

  static async upsertDailyAttendanceSummary(
    summary: AttendanceDailySummaryRecord
  ): Promise<AttendanceDailySummaryRecord> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('attendance_daily_summaries')
        .upsert(summary, { onConflict: 'company_id,employee_id,attendance_date' })
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<AttendanceDailySummaryRecord>(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, data.id, data)
        return data as AttendanceDailySummaryRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.upsertDailyAttendanceSummary] DB fallback:', e)
    }

    const existing = PrintERPDataStore.get<AttendanceDailySummaryRecord[]>(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES) || []
    const idx = existing.findIndex(
      (s) => s.company_id === summary.company_id && s.employee_id === summary.employee_id && s.attendance_date === summary.attendance_date
    )
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...summary, updated_at: new Date().toISOString() }
      PrintERPDataStore.set(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, existing)
      return existing[idx]
    } else {
      PrintERPDataStore.addItem(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, summary)
      return summary
    }
  }

  // ============================================================================
  // 4. OVERTIME RECORDS
  // ============================================================================

  static async getOvertimeRecords(
    companyId: string,
    options?: { employeeId?: string; status?: string; otDate?: string; payrollPeriodId?: string }
  ): Promise<OvertimeRecord[]> {
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('overtime_records')
        .select('*, employees(name, role, department)')
        .eq('company_id', companyId)
        .order('ot_date', { ascending: false })

      if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId)
      }
      if (options?.status) {
        query = query.eq('status', options.status)
      }
      if (options?.otDate) {
        query = query.eq('ot_date', options.otDate)
      }
      if (options?.payrollPeriodId) {
        query = query.eq('payroll_period_id', options.payrollPeriodId)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          ...d,
          employee_name: d.employees?.name || 'Staff',
          employee_role: d.employees?.role || 'Staff',
          employee_department: d.employees?.department || 'printing',
        })) as OvertimeRecord[]
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getOvertimeRecords] DB fallback:', e)
    }

    const records = PrintERPDataStore.get<OvertimeRecord[]>(STORAGE_KEYS.WF_OVERTIME_RECORDS) || []
    return records.filter((r) => {
      if (r.company_id && r.company_id !== companyId) return false
      if (options?.employeeId && r.employee_id !== options.employeeId) return false
      if (options?.status && r.status !== options.status) return false
      if (options?.otDate && r.ot_date !== options.otDate) return false
      if (options?.payrollPeriodId && r.payroll_period_id !== options.payrollPeriodId) return false
      return true
    })
  }

  static async createOvertimeRecord(record: OvertimeRecord): Promise<OvertimeRecord> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('overtime_records')
        .insert(record)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.WF_OVERTIME_RECORDS, data as OvertimeRecord)
        return data as OvertimeRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.createOvertimeRecord] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.WF_OVERTIME_RECORDS, record)
    return record
  }

  static async updateOvertimeRecord(
    id: string,
    companyId: string,
    updates: Partial<OvertimeRecord>
  ): Promise<OvertimeRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }

    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('overtime_records')
        .update(payload)
        .eq('company_id', companyId)
        .eq('id', id)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<OvertimeRecord>(STORAGE_KEYS.WF_OVERTIME_RECORDS, id, data)
        return data as OvertimeRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.updateOvertimeRecord] DB fallback:', e)
    }

    return PrintERPDataStore.updateItem<OvertimeRecord>(STORAGE_KEYS.WF_OVERTIME_RECORDS, id, payload)
  }

  // ============================================================================
  // 5. SALARY ADVANCES
  // ============================================================================

  static async getSalaryAdvances(
    companyId: string,
    options?: { employeeId?: string; status?: string; isSettled?: boolean }
  ): Promise<SalaryAdvanceRecord[]> {
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('salary_advances')
        .select('*, employees(name)')
        .eq('company_id', companyId)
        .order('disbursed_date', { ascending: false })

      if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId)
      }
      if (options?.status) {
        query = query.eq('status', options.status)
      }
      if (options?.isSettled !== undefined) {
        query = query.eq('is_settled', options.isSettled)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          ...d,
          employee_name: d.employees?.name || 'Staff',
        })) as SalaryAdvanceRecord[]
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getSalaryAdvances] DB fallback:', e)
    }

    const advances = PrintERPDataStore.get<SalaryAdvanceRecord[]>(STORAGE_KEYS.SALARY_ADVANCES) || []
    return advances.filter((a) => {
      if (a.company_id && a.company_id !== companyId) return false
      if (options?.employeeId && a.employee_id !== options.employeeId) return false
      if (options?.status && a.status !== options.status) return false
      if (options?.isSettled !== undefined && a.is_settled !== options.isSettled) return false
      return true
    })
  }

  static async createSalaryAdvance(advance: SalaryAdvanceRecord): Promise<SalaryAdvanceRecord> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('salary_advances')
        .insert(advance)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.SALARY_ADVANCES, data as SalaryAdvanceRecord)
        return data as SalaryAdvanceRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.createSalaryAdvance] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.SALARY_ADVANCES, advance)
    return advance
  }

  static async updateSalaryAdvance(
    id: string,
    companyId: string,
    updates: Partial<SalaryAdvanceRecord>
  ): Promise<SalaryAdvanceRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }

    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('salary_advances')
        .update(payload)
        .eq('company_id', companyId)
        .eq('id', id)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<SalaryAdvanceRecord>(STORAGE_KEYS.SALARY_ADVANCES, id, data)
        return data as SalaryAdvanceRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.updateSalaryAdvance] DB fallback:', e)
    }

    return PrintERPDataStore.updateItem<SalaryAdvanceRecord>(STORAGE_KEYS.SALARY_ADVANCES, id, payload)
  }

  // ============================================================================
  // 6. PAYROLL PERIODS & ITEMS
  // ============================================================================

  static async getPayrollPeriods(companyId: string, options?: { status?: string }): Promise<PayrollPeriodRecord[]> {
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('payroll_periods')
        .select('*, payroll_items(*, employees(name, name_bn, employee_id_number, role, department))')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (options?.status) {
        query = query.eq('status', options.status)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data.map((p: any) => ({
          ...p,
          items: (p.payroll_items || []).map((i: any) => ({
            ...i,
            employee_name: i.employees?.name || 'Staff',
            employee_name_bn: i.employees?.name_bn || null,
            employee_id_number: i.employees?.employee_id_number || 'EMP',
            role: i.employees?.role || i.role || 'Staff',
            department: i.employees?.department || i.department || 'printing',
          })),
        })) as PayrollPeriodRecord[]
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getPayrollPeriods] DB fallback:', e)
    }

    const periods = PrintERPDataStore.get<PayrollPeriodRecord[]>(STORAGE_KEYS.PAYROLL_PERIODS) || []
    return periods.filter((p) => {
      if (p.company_id && p.company_id !== companyId) return false
      if (options?.status && p.status !== options.status) return false
      return true
    })
  }

  static async getPayrollPeriodById(id: string, companyId: string): Promise<PayrollPeriodRecord | null> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('payroll_periods')
        .select('*, payroll_items(*, employees(name, name_bn, employee_id_number, role, department))')
        .eq('company_id', companyId)
        .eq('id', id)
        .maybeSingle()

      if (!error && data) {
        return {
          ...data,
          items: (data.payroll_items || []).map((i: any) => ({
            ...i,
            employee_name: i.employees?.name || 'Staff',
            employee_name_bn: i.employees?.name_bn || null,
            employee_id_number: i.employees?.employee_id_number || 'EMP',
            role: i.employees?.role || i.role || 'Staff',
            department: i.employees?.department || i.department || 'printing',
          })),
        } as PayrollPeriodRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getPayrollPeriodById] DB fallback:', e)
    }

    const periods = await this.getPayrollPeriods(companyId)
    return periods.find((p) => p.id === id || p.period_name.toLowerCase().includes(id.toLowerCase())) || null
  }

  static async createPayrollPeriod(
    period: PayrollPeriodRecord,
    items: PayrollItemRecord[]
  ): Promise<PayrollPeriodRecord> {
    try {
      const admin = createAdminClient()
      const { data: savedPeriod, error: pErr } = await (admin as any)
        .from('payroll_periods')
        .insert({
          id: period.id,
          company_id: period.company_id,
          branch_id: period.branch_id || null,
          period_name: period.period_name,
          start_date: period.start_date,
          end_date: period.end_date,
          working_days_count: period.working_days_count,
          status: period.status,
          total_gross_salary: period.total_gross_salary,
          total_ot_amount: period.total_ot_amount,
          total_advances_deducted: period.total_advances_deducted,
          total_other_deductions: period.total_other_deductions,
          total_net_salary: period.total_net_salary,
          total_paid_amount: period.total_paid_amount,
          total_due_amount: period.total_due_amount,
          notes: period.notes || null,
        })
        .select()
        .single()

      if (!pErr && savedPeriod && items.length > 0) {
        await (admin as any).from('payroll_items').insert(
          items.map((i) => ({
            ...i,
            payroll_period_id: savedPeriod.id,
          }))
        )
      }
    } catch (e) {
      console.warn('[WorkforceRepository.createPayrollPeriod] DB insert fallback:', e)
    }

    const completePeriod: PayrollPeriodRecord = {
      ...period,
      items,
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PAYROLL_PERIODS, completePeriod)
    return completePeriod
  }

  static async updatePayrollPeriod(
    id: string,
    companyId: string,
    updates: Partial<PayrollPeriodRecord>
  ): Promise<PayrollPeriodRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }

    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('payroll_periods')
        .update(payload)
        .eq('company_id', companyId)
        .eq('id', id)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<PayrollPeriodRecord>(STORAGE_KEYS.PAYROLL_PERIODS, id, data)
        return data as PayrollPeriodRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.updatePayrollPeriod] DB update fallback:', e)
    }

    return PrintERPDataStore.updateItem<PayrollPeriodRecord>(STORAGE_KEYS.PAYROLL_PERIODS, id, payload)
  }

  static async updatePayrollItem(
    id: string,
    companyId: string,
    updates: Partial<PayrollItemRecord>
  ): Promise<PayrollItemRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }

    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('payroll_items')
        .update(payload)
        .eq('company_id', companyId)
        .eq('id', id)
        .select()
        .single()

      if (!error && data) {
        return data as PayrollItemRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.updatePayrollItem] DB fallback:', e)
    }

    return null
  }

  // ============================================================================
  // 7. SALARY PAYMENTS
  // ============================================================================

  static async getSalaryPayments(
    companyId: string,
    options?: { payrollPeriodId?: string; employeeId?: string }
  ): Promise<SalaryPaymentRecord[]> {
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('salary_payments')
        .select('*, employees(name)')
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false })

      if (options?.payrollPeriodId) {
        query = query.eq('payroll_period_id', options.payrollPeriodId)
      }
      if (options?.employeeId) {
        query = query.eq('employee_id', options.employeeId)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          ...d,
          employee_name: d.employees?.name || 'Staff',
        })) as SalaryPaymentRecord[]
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getSalaryPayments] DB fallback:', e)
    }

    const payments = PrintERPDataStore.get<SalaryPaymentRecord[]>(STORAGE_KEYS.WF_SALARY_PAYMENTS) || []
    return payments.filter((p) => {
      if (p.company_id && p.company_id !== companyId) return false
      if (options?.payrollPeriodId && p.payroll_period_id !== options.payrollPeriodId) return false
      if (options?.employeeId && p.employee_id !== options.employeeId) return false
      return true
    })
  }

  static async recordSalaryPayment(payment: SalaryPaymentRecord): Promise<SalaryPaymentRecord> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('salary_payments')
        .insert(payment)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.WF_SALARY_PAYMENTS, data as SalaryPaymentRecord)
        return data as SalaryPaymentRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.recordSalaryPayment] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.WF_SALARY_PAYMENTS, payment)
    return payment
  }

  // ============================================================================
  // 8. WORKFORCE AUDIT LOGS
  // ============================================================================

  static async logWorkforceAudit(log: WorkforceAuditLogRecord): Promise<void> {
    try {
      const admin = createAdminClient()
      await (admin as any).from('workforce_audit_logs').insert(log)
    } catch (e) {
      console.warn('[WorkforceRepository.logWorkforceAudit] DB audit fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.WF_AUDIT_LOGS, log)
  }

  static async getWorkforceAuditLogs(companyId: string, limit = 50): Promise<WorkforceAuditLogRecord[]> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('workforce_audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!error && data && data.length > 0) {
        return data as WorkforceAuditLogRecord[]
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getWorkforceAuditLogs] DB fallback:', e)
    }

    const logs = PrintERPDataStore.get<WorkforceAuditLogRecord[]>(STORAGE_KEYS.WF_AUDIT_LOGS) || []
    return logs.filter((l) => !l.company_id || l.company_id === companyId).slice(0, limit)
  }

  // ============================================================================
  // 9. DAILY LABOR LOGS
  // ============================================================================

  static async recordDailyLabor(log: {
    id?: string
    company_id: string
    employee_id: string
    employee_name?: string
    work_date: string
    assigned_job_number?: string | null
    daily_rate: number
    overtime_hours?: number
    hourly_overtime_rate?: number
    total_payout: number
    production_contribution?: string
    payment_status?: string
    created_at?: string
  }): Promise<any> {
    const record = {
      id: log.id || `dll-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: log.company_id,
      employee_id: log.employee_id,
      employee_name: log.employee_name,
      work_date: log.work_date,
      assigned_job_number: log.assigned_job_number || null,
      daily_rate: log.daily_rate,
      overtime_hours: log.overtime_hours || 0,
      hourly_overtime_rate: log.hourly_overtime_rate || 0,
      total_payout: log.total_payout,
      production_contribution: log.production_contribution || 'Shop Floor Labor',
      payment_status: log.payment_status || 'unpaid',
      created_at: log.created_at || new Date().toISOString(),
    }

    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('daily_labor_logs')
        .insert({
          id: record.id,
          company_id: record.company_id,
          employee_id: record.employee_id,
          work_date: record.work_date,
          assigned_job_number: record.assigned_job_number,
          daily_rate: record.daily_rate,
          overtime_hours: record.overtime_hours,
          total_payout: record.total_payout,
          production_contribution: record.production_contribution,
          payment_status: record.payment_status,
          created_at: record.created_at,
        })
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.DAILY_LABOR_LOGS, { ...record, ...data })
        return { ...record, ...data }
      }
    } catch (e) {
      console.warn('[WorkforceRepository.recordDailyLabor] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.DAILY_LABOR_LOGS, record)
    return record
  }

  static async getDailyLaborLogs(
    companyId: string,
    filter?: { employeeId?: string; assignedJobNumber?: string; workDate?: string }
  ): Promise<any[]> {
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('daily_labor_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('work_date', { ascending: false })

      if (filter?.employeeId) {
        query = query.eq('employee_id', filter.employeeId)
      }
      if (filter?.assignedJobNumber) {
        query = query.eq('assigned_job_number', filter.assignedJobNumber)
      }
      if (filter?.workDate) {
        query = query.eq('work_date', filter.workDate)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getDailyLaborLogs] DB fallback:', e)
    }

    const logs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DAILY_LABOR_LOGS) || []
    return logs.filter((l) => {
      if (l.company_id && l.company_id !== companyId) return false
      if (filter?.employeeId && l.employee_id !== filter.employeeId) return false
      if (filter?.assignedJobNumber && l.assigned_job_number !== filter.assignedJobNumber) return false
      if (filter?.workDate && l.work_date !== filter.workDate) return false
      return true
    })
  }
}
