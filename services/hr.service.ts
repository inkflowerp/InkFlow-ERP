import {
  EmployeeRecord,
  AttendanceRecord,
  SalaryAdvanceRecord,
  PayrollPeriodRecord,
  PayrollItemRecord,
  DailyLaborLogRecord,
} from '@/types/hr.types'
import { createAdminClient } from '@/lib/supabase/admin'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { formatTime } from '@/lib/formatters'

export class HrService {
  static async getEmployees(companyId: string = 'c-01'): Promise<EmployeeRecord[]> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        return data as EmployeeRecord[]
      }
    } catch (e) {
      console.warn('[HrService.getEmployees] DB query fallback to store:', e)
    }

    const employees = PrintERPDataStore.get<EmployeeRecord[]>(STORAGE_KEYS.EMPLOYEES) || []
    return employees.filter((e) => !e.company_id || e.company_id === companyId)
  }

  static async getEmployeeById(id: string, companyId: string = 'c-01'): Promise<EmployeeRecord | null> {
    const employees = await this.getEmployees(companyId)
    return employees.find((e) => e.id === id || e.employee_id_number === id) || null
  }

  static async createEmployee(data: Partial<EmployeeRecord>): Promise<EmployeeRecord> {
    const id = data.id || `emp-${Date.now()}`
    const num = data.employee_id_number || `EMP-00${Math.floor(Math.random() * 90) + 10}`
    const newEmp: EmployeeRecord = {
      id,
      company_id: data.company_id || 'c-01',
      employee_id_number: num,
      name: data.name || 'Employee',
      name_bn: data.name_bn || null,
      mobile: data.mobile || '+8801711000000',
      address: data.address || 'Dhaka',
      role: data.role || 'Staff',
      department: data.department || 'printing',
      employee_type: data.employee_type || 'permanent',
      joining_date: data.joining_date || new Date().toISOString().split('T')[0],
      salary_type: data.salary_type || 'monthly',
      base_salary: data.base_salary || 25000,
      daily_rate: data.daily_rate || 0,
      overtime_hourly_rate: data.overtime_hourly_rate || 150,
      current_advance_balance: data.current_advance_balance || 0,
      status: data.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const admin = createAdminClient()
      await (admin as any).from('employees').insert(newEmp)
    } catch (e) {
      console.warn('[HrService.createEmployee] DB write fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.EMPLOYEES, newEmp)
    return newEmp
  }

  static async updateEmployee(id: string, data: Partial<EmployeeRecord>): Promise<EmployeeRecord | null> {
    try {
      const admin = createAdminClient()
      await (admin as any).from('employees').update(data).eq('id', id)
    } catch (e) {
      console.warn('[HrService.updateEmployee] DB update fallback:', e)
    }
    return PrintERPDataStore.updateItem<EmployeeRecord>(STORAGE_KEYS.EMPLOYEES, id, data)
  }

  static async deleteEmployee(id: string): Promise<boolean> {
    try {
      const admin = createAdminClient()
      await (admin as any).from('employees').delete().eq('id', id)
    } catch (e) {
      console.warn('[HrService.deleteEmployee] DB delete fallback:', e)
    }
    return PrintERPDataStore.removeItem(STORAGE_KEYS.EMPLOYEES, id)
  }

  static async getAttendance(companyId: string = 'c-01', date?: string): Promise<AttendanceRecord[]> {
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('attendance_records')
        .select('*, employees(name, role)')
        .eq('company_id', companyId)
        .order('checked_at', { ascending: false })

      if (date) {
        query = query.eq('attendance_date', date)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          company_id: r.company_id,
          employee_id: r.employee_id,
          employee_name: r.employees?.name || 'Staff',
          attendance_date: r.attendance_date,
          status: 'present',
          check_in_time: formatTime(r.checked_at),
          late_minutes: 0,
          overtime_hours: 0,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          gps_accuracy_meters: Number(r.gps_accuracy_meters),
          distance_from_location_meters: Number(r.distance_from_location_meters),
          verification_status: r.verification_status,
          notes: r.notes,
          created_at: r.created_at,
        })) as AttendanceRecord[]
      }
    } catch (e) {
      console.warn('[HrService.getAttendance] DB query error:', e)
    }

    return []
  }

  static async getPayroll(): Promise<PayrollPeriodRecord[]> {
    return PrintERPDataStore.get<PayrollPeriodRecord[]>(STORAGE_KEYS.PAYROLL) || []
  }
}
