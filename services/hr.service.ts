import {
  EmployeeRecord,
  AttendanceRecord,
  SalaryAdvanceRecord,
  PayrollPeriodRecord,
  PayrollItemRecord,
  DailyLaborLogRecord,
} from '@/types/hr.types'



import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export class HrService {
  static async getEmployees(companyId: string = 'c-01'): Promise<EmployeeRecord[]> {
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
    PrintERPDataStore.addItem(STORAGE_KEYS.EMPLOYEES, newEmp)
    return newEmp
  }

  static async updateEmployee(id: string, data: Partial<EmployeeRecord>): Promise<EmployeeRecord | null> {
    return PrintERPDataStore.updateItem<EmployeeRecord>(STORAGE_KEYS.EMPLOYEES, id, data)
  }

  static async deleteEmployee(id: string): Promise<boolean> {
    return PrintERPDataStore.removeItem(STORAGE_KEYS.EMPLOYEES, id)
  }

  static async getAttendance(date?: string): Promise<AttendanceRecord[]> {
    const att = PrintERPDataStore.get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE) || []
    if (date) return att.filter((a) => a.attendance_date === date)
    return att
  }

  static async markAttendance(record: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    const id = record.id || `att-${Date.now()}`
    const newAtt: AttendanceRecord = {
      id,
      company_id: record.company_id || 'c-01',
      employee_id: record.employee_id || '',
      employee_name: record.employee_name || '',
      attendance_date: record.attendance_date || new Date().toISOString().split('T')[0],
      status: record.status || 'present',
      check_in_time: record.check_in_time || '09:00 AM',
      late_minutes: record.late_minutes || 0,
      overtime_hours: record.overtime_hours || 0,
      notes: record.notes || '',
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.ATTENDANCE, newAtt)
    return newAtt
  }

  static async getPayroll(): Promise<PayrollPeriodRecord[]> {
    return PrintERPDataStore.get<PayrollPeriodRecord[]>(STORAGE_KEYS.PAYROLL) || []
  }
}

