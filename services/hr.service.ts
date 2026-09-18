// ==============================================================================
// InkFlow ERP - HR Service (Unified Proxy to Authoritative Workforce Service)
// ==============================================================================

import { WorkforceService } from './workforce.service.ts'
import type { EmployeeRecord, AttendanceRecord, PayrollPeriodRecord } from '../types/hr.types.ts'

export class HrService {
  static async getEmployees(companyId: string = 'c-01'): Promise<EmployeeRecord[]> {
    const emps = await WorkforceService.getEmployees(companyId)
    return emps as any[]
  }

  static async getEmployeeById(id: string, companyId: string = 'c-01'): Promise<EmployeeRecord | null> {
    const emp = await WorkforceService.getEmployeeById(id, companyId)
    return emp as any
  }

  static async createEmployee(data: Partial<EmployeeRecord>): Promise<EmployeeRecord> {
    const created = await WorkforceService.createEmployee({
      ...data,
      company_id: data.company_id || 'c-01',
      name: data.name || 'Employee',
    } as any)
    return created as any
  }

  static async updateEmployee(id: string, data: Partial<EmployeeRecord>): Promise<EmployeeRecord | null> {
    const updated = await WorkforceService.updateEmployee(id, data.company_id || 'c-01', data as any)
    return updated as any
  }

  static async deleteEmployee(id: string, companyId = 'c-01'): Promise<boolean> {
    return WorkforceService.deleteEmployee(id, companyId)
  }

  static async getAttendance(companyId: string = 'c-01', date?: string): Promise<AttendanceRecord[]> {
    const summaries = await WorkforceService.getDailyAttendance(companyId, { date })
    return summaries.map((s) => ({
      id: s.id,
      company_id: s.company_id,
      employee_id: s.employee_id,
      employee_name: s.employee_name || 'Staff',
      attendance_date: s.attendance_date,
      status: s.status as any,
      check_in_time: s.check_in_time,
      check_out_time: s.check_out_time,
      late_minutes: s.late_minutes,
      overtime_hours: Math.round((s.approved_ot_minutes / 60) * 10) / 10,
      notes: s.notes,
      created_at: s.created_at,
    })) as AttendanceRecord[]
  }

  static async getPayroll(companyId = 'c-01'): Promise<PayrollPeriodRecord[]> {
    const periods = await WorkforceService.getPayrollPeriods(companyId)
    return periods as any[]
  }
}
