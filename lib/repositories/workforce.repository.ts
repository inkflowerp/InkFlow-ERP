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
  EmploymentType,
  SalaryBasis,
  PaymentMethod,
  SalaryStructure,
  OvertimeType,
} from '../../types/workforce.types.ts'

function isMatchingCompany(recordCompanyId?: string | null, targetCompanyId?: string | null): boolean {
  if (!recordCompanyId || !targetCompanyId) return true
  if (recordCompanyId === targetCompanyId) return true
  const norm1 = recordCompanyId.toLowerCase().replace(/^comp-/, '').replace(/^co-/, '')
  const norm2 = targetCompanyId.toLowerCase().replace(/^comp-/, '').replace(/^co-/, '')
  return norm1 === norm2
}

export class WorkforceRepository {
  // ============================================================================
  // 1. EMPLOYEES
  // ============================================================================

  static async seedDefaultEmployees(companyId: string): Promise<EmployeeRecord[]> {
    const now = new Date().toISOString()
    const cleanId = companyId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8) || 'default'

    const rawSeeds = [
      {
        id: `emp-seed-1-${cleanId}`,
        employee_id_number: 'EMP-2024-1001',
        name: 'Md. Rafiqul Islam',
        name_bn: 'মো. রফিকুল ইসলাম',
        mobile: '+8801711234501',
        email: 'rafiqul.print@example.com',
        role: 'Master Offset Machine Operator',
        designation: 'Senior Machine Operator',
        department: 'printing',
        employee_type: 'permanent' as EmploymentType,
        salary_basis: 'monthly' as SalaryBasis,
        joining_date: '2023-01-15',
        allowed_monthly_leaves: 2,
        payment_method: 'bank' as PaymentMethod,
        base_salary: 35000,
        daily_rate: 1200,
        hourly_rate: 168,
        overtime_hourly_rate: 250,
        current_advance_balance: 0,
        is_daily_worker: false,
        salary_structure: {
          basic: 21000,
          house_allowance: 7000,
          transport_allowance: 3500,
          medical_allowance: 3500,
          food_allowance: 0,
          other_allowances: 0,
        },
        duty_settings: {
          office_start_time: '09:00',
          office_end_time: '18:00',
          daily_duty_hours: 9,
          late_grace_minutes: 15,
          weekly_off_day: 'Friday',
          ot_calc_type: '1.5x_standard' as const,
          overtime_rate_value: 250,
          absent_deduction_allowed: true,
          late_fine_enabled: true,
          late_fine_policy: '3_late_1_day_salary' as const,
        },
        bank_payment_info: {
          bank_name: 'Dutch-Bangla Bank (DBBL)',
          account_name: 'Md. Rafiqul Islam',
          account_number: '115.120.345678',
          branch_name: 'Motijheel Branch, Dhaka',
        },
        status: 'active' as const,
        address: 'Fakirapool, Arambagh, Motijheel, Dhaka',
        educational_qualification: 'Diploma in Graphic Arts & Printing',
      },
      {
        id: `emp-seed-2-${cleanId}`,
        employee_id_number: 'EMP-2024-1002',
        name: 'Tanvir Ahmed',
        name_bn: 'তানভীর আহমেদ',
        mobile: '+8801812345678',
        email: 'tanvir.uv@example.com',
        role: 'Large Format & UV Flatbed Operator',
        designation: 'UV Machine Incharge',
        department: 'printing',
        employee_type: 'permanent' as EmploymentType,
        salary_basis: 'monthly' as SalaryBasis,
        joining_date: '2023-05-10',
        allowed_monthly_leaves: 2,
        payment_method: 'bkash' as PaymentMethod,
        base_salary: 26000,
        daily_rate: 900,
        hourly_rate: 125,
        overtime_hourly_rate: 190,
        current_advance_balance: 0,
        is_daily_worker: false,
        salary_structure: {
          basic: 15600,
          house_allowance: 5200,
          transport_allowance: 2600,
          medical_allowance: 2600,
          food_allowance: 0,
          other_allowances: 0,
        },
        duty_settings: {
          office_start_time: '09:00',
          office_end_time: '18:00',
          daily_duty_hours: 9,
          late_grace_minutes: 15,
          weekly_off_day: 'Friday',
          ot_calc_type: '1.5x_standard' as const,
          overtime_rate_value: 190,
          absent_deduction_allowed: true,
          late_fine_enabled: true,
          late_fine_policy: '3_late_1_day_salary' as const,
        },
        mfs_payment_info: {
          provider: 'bkash' as const,
          wallet_number: '+8801812345678',
          account_type: 'personal' as const,
        },
        status: 'active' as const,
        address: 'Naya Paltan, Dhaka',
        educational_qualification: 'HSC Passed',
      },
      {
        id: `emp-seed-3-${cleanId}`,
        employee_id_number: 'EMP-2024-1003',
        name: 'Kawsar Hossain',
        name_bn: 'কাওসার হোসেন',
        mobile: '+8801913456789',
        email: 'kawsar.finishing@example.com',
        role: 'Finishing & Die-Cutting Specialist',
        designation: 'Finishing Incharge',
        department: 'finishing',
        employee_type: 'permanent' as EmploymentType,
        salary_basis: 'monthly' as SalaryBasis,
        joining_date: '2023-08-01',
        allowed_monthly_leaves: 2,
        payment_method: 'cash' as PaymentMethod,
        base_salary: 22000,
        daily_rate: 800,
        hourly_rate: 105,
        overtime_hourly_rate: 160,
        current_advance_balance: 0,
        is_daily_worker: false,
        salary_structure: {
          basic: 13200,
          house_allowance: 4400,
          transport_allowance: 2200,
          medical_allowance: 2200,
          food_allowance: 0,
          other_allowances: 0,
        },
        duty_settings: {
          office_start_time: '09:00',
          office_end_time: '18:00',
          daily_duty_hours: 9,
          late_grace_minutes: 15,
          weekly_off_day: 'Friday',
          ot_calc_type: '1.5x_standard' as const,
          overtime_rate_value: 160,
          absent_deduction_allowed: true,
          late_fine_enabled: true,
        },
        status: 'active' as const,
        address: 'Sadarghat, Old Dhaka',
        educational_qualification: 'SSC Passed',
      },
      {
        id: `emp-seed-4-${cleanId}`,
        employee_id_number: 'EMP-2024-1004',
        name: 'Rubel Mia',
        name_bn: 'রুবেল মিয়া',
        mobile: '+8801724567890',
        email: 'rubel.sign@example.com',
        role: 'Signage & Acrylic CNC Fabricator',
        designation: 'Master Fabricator',
        department: 'fabrication',
        employee_type: 'permanent' as EmploymentType,
        salary_basis: 'monthly' as SalaryBasis,
        joining_date: '2023-03-20',
        allowed_monthly_leaves: 2,
        payment_method: 'nagad' as PaymentMethod,
        base_salary: 28000,
        daily_rate: 950,
        hourly_rate: 135,
        overtime_hourly_rate: 200,
        current_advance_balance: 0,
        is_daily_worker: false,
        salary_structure: {
          basic: 16800,
          house_allowance: 5600,
          transport_allowance: 2800,
          medical_allowance: 2800,
          food_allowance: 0,
          other_allowances: 0,
        },
        duty_settings: {
          office_start_time: '09:00',
          office_end_time: '18:00',
          daily_duty_hours: 9,
          late_grace_minutes: 15,
          weekly_off_day: 'Friday',
          ot_calc_type: '1.5x_standard' as const,
          overtime_rate_value: 200,
          absent_deduction_allowed: true,
          late_fine_enabled: true,
        },
        mfs_payment_info: {
          provider: 'nagad' as const,
          wallet_number: '+8801724567890',
          account_type: 'personal' as const,
        },
        status: 'active' as const,
        address: 'Keraniganj, Dhaka',
        educational_qualification: 'Technical Vocational Training',
      },
      {
        id: `emp-seed-5-${cleanId}`,
        employee_id_number: 'EMP-2024-1005',
        name: 'Sumon Barua',
        name_bn: 'সুমন বড়ুয়া',
        mobile: '+8801635678901',
        email: 'sumon.design@example.com',
        role: 'Senior Graphic Designer & Prepress',
        designation: 'Prepress Specialist',
        department: 'design',
        employee_type: 'permanent' as EmploymentType,
        salary_basis: 'monthly' as SalaryBasis,
        joining_date: '2022-11-01',
        allowed_monthly_leaves: 2,
        payment_method: 'bank' as PaymentMethod,
        base_salary: 30000,
        daily_rate: 1000,
        hourly_rate: 144,
        overtime_hourly_rate: 220,
        current_advance_balance: 0,
        is_daily_worker: false,
        salary_structure: {
          basic: 18000,
          house_allowance: 6000,
          transport_allowance: 3000,
          medical_allowance: 3000,
          food_allowance: 0,
          other_allowances: 0,
        },
        duty_settings: {
          office_start_time: '09:30',
          office_end_time: '18:30',
          daily_duty_hours: 9,
          late_grace_minutes: 15,
          weekly_off_day: 'Friday',
          ot_calc_type: '1.5x_standard' as const,
          overtime_rate_value: 220,
          absent_deduction_allowed: true,
          late_fine_enabled: true,
        },
        bank_payment_info: {
          bank_name: 'BRAC Bank',
          account_name: 'Sumon Barua',
          account_number: '1501204987654001',
          branch_name: 'Gulshan Branch, Dhaka',
        },
        status: 'active' as const,
        address: 'Badda, Dhaka',
        educational_qualification: 'BFA in Graphic Design',
      },
      {
        id: `emp-seed-6-${cleanId}`,
        employee_id_number: 'EMP-2024-1006',
        name: 'Farzana Akhter',
        name_bn: 'ফারজানা আক্তার',
        mobile: '+8801746789012',
        email: 'farzana.accounts@example.com',
        role: 'Accounts & Billing Officer',
        designation: 'Accounts Officer',
        department: 'accounts',
        employee_type: 'permanent' as EmploymentType,
        salary_basis: 'monthly' as SalaryBasis,
        joining_date: '2023-06-15',
        allowed_monthly_leaves: 2,
        payment_method: 'bank' as PaymentMethod,
        base_salary: 28000,
        daily_rate: 950,
        hourly_rate: 135,
        overtime_hourly_rate: 200,
        current_advance_balance: 0,
        is_daily_worker: false,
        salary_structure: {
          basic: 16800,
          house_allowance: 5600,
          transport_allowance: 2800,
          medical_allowance: 2800,
          food_allowance: 0,
          other_allowances: 0,
        },
        duty_settings: {
          office_start_time: '09:00',
          office_end_time: '18:00',
          daily_duty_hours: 9,
          late_grace_minutes: 15,
          weekly_off_day: 'Friday',
          ot_calc_type: '1.5x_standard' as const,
          overtime_rate_value: 200,
          absent_deduction_allowed: true,
          late_fine_enabled: true,
        },
        bank_payment_info: {
          bank_name: 'The City Bank',
          account_name: 'Farzana Akhter',
          account_number: '210345678901',
          branch_name: 'Dhanmondi Branch, Dhaka',
        },
        status: 'active' as const,
        address: 'Dhanmondi, Dhaka',
        educational_qualification: 'BBA in Accounting',
      },
      {
        id: `emp-seed-7-${cleanId}`,
        employee_id_number: 'EMP-2024-1007',
        name: 'Shakil Ahmed',
        name_bn: 'শাকিল আহমেদ',
        mobile: '+8801557890123',
        email: null,
        role: 'Daily Production Laborer',
        designation: 'Floor Worker',
        department: 'printing',
        employee_type: 'daily_worker' as EmploymentType,
        salary_basis: 'daily_rate' as SalaryBasis,
        joining_date: '2024-01-01',
        allowed_monthly_leaves: 0,
        payment_method: 'cash' as PaymentMethod,
        base_salary: 0,
        daily_rate: 800,
        hourly_rate: 100,
        overtime_hourly_rate: 150,
        current_advance_balance: 0,
        is_daily_worker: true,
        salary_structure: {
          basic: 0,
          house_allowance: 0,
          transport_allowance: 0,
          medical_allowance: 0,
          food_allowance: 0,
          other_allowances: 0,
        },
        duty_settings: {
          office_start_time: '08:30',
          office_end_time: '17:30',
          daily_duty_hours: 9,
          late_grace_minutes: 15,
          weekly_off_day: 'Friday',
          ot_calc_type: 'fixed_rate' as const,
          overtime_rate_value: 150,
          absent_deduction_allowed: false,
          late_fine_enabled: false,
        },
        status: 'active' as const,
        address: 'Bangshal, Old Dhaka',
        educational_qualification: 'Class 8 Passed',
      },
    ]

    const seeded: EmployeeRecord[] = rawSeeds.map((s) => ({
      ...s,
      company_id: companyId,
      branch_id: null,
      branch_name: null,
      user_id: null,
      created_at: now,
      updated_at: now,
    }))

    // 1. Persist to DataStore in all relevant scopes
    for (const emp of seeded) {
      PrintERPDataStore.addItem(STORAGE_KEYS.EMPLOYEES, emp, companyId)
      const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
      if (cleanSlug !== companyId) {
        PrintERPDataStore.addItem(STORAGE_KEYS.EMPLOYEES, emp, cleanSlug)
      }
      PrintERPDataStore.addItem(STORAGE_KEYS.EMPLOYEES, emp)
    }

    // 2. Attempt DB insertion (best-effort)
    try {
      const admin = createAdminClient()
      for (const emp of seeded) {
        try {
          await (admin as any).from('employees').insert({
            company_id: emp.company_id,
            employee_id_number: emp.employee_id_number,
            name: emp.name,
            name_bn: emp.name_bn,
            mobile: emp.mobile,
            address: emp.address,
            role: emp.role,
            department: emp.department,
            employee_type: emp.employee_type === 'daily_worker' ? 'daily_labor' : emp.employee_type,
            salary_type: emp.salary_basis === 'daily_rate' ? 'daily_rate' : 'monthly',
            joining_date: emp.joining_date,
            base_salary: emp.base_salary,
            daily_rate: emp.daily_rate,
            overtime_hourly_rate: emp.overtime_hourly_rate,
            current_advance_balance: 0,
            status: emp.status,
            created_at: now,
            updated_at: now,
          })
        } catch {}
      }
    } catch {}

    return seeded
  }

  static async getEmployees(
    companyId: string,
    options?: { branchId?: string; status?: string; department?: string; isDailyWorker?: boolean }
  ): Promise<EmployeeRecord[]> {
    let dbEmployees: EmployeeRecord[] = []
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
        dbEmployees = data.map((d: any) => ({
          ...d,
          branch_name: d.branches?.name || null,
        })) as EmployeeRecord[]
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getEmployees] DB query fallback to store:', e)
    }

    // Retrieve from local store across tenant partitions (scoped, clean-slug, comp-slug, and global)
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    const storeEmpsScoped1 = PrintERPDataStore.get<EmployeeRecord[]>(STORAGE_KEYS.EMPLOYEES, companyId) || []
    const storeEmpsScoped2 = cleanSlug !== companyId ? (PrintERPDataStore.get<EmployeeRecord[]>(STORAGE_KEYS.EMPLOYEES, cleanSlug) || []) : []
    const storeEmpsScoped3 = compSlug !== companyId ? (PrintERPDataStore.get<EmployeeRecord[]>(STORAGE_KEYS.EMPLOYEES, compSlug) || []) : []
    const storeEmpsGlobal = PrintERPDataStore.get<EmployeeRecord[]>(STORAGE_KEYS.EMPLOYEES) || []

    const allStoreEmps = [...storeEmpsScoped1, ...storeEmpsScoped2, ...storeEmpsScoped3, ...storeEmpsGlobal]

    const filteredStoreEmps = allStoreEmps.filter((e) => {
      if (e.company_id && !isMatchingCompany(e.company_id, companyId)) return false
      if (options?.branchId && e.branch_id !== options.branchId) return false
      if (options?.status && e.status !== options.status) return false
      if (options?.department && e.department !== options.department) return false
      if (options?.isDailyWorker !== undefined && Boolean(e.is_daily_worker) !== options.isDailyWorker) return false
      return true
    })

    // Merge store and DB employees so newly enrolled employees in store or DB are NEVER lost
    const empMap = new Map<string, EmployeeRecord>()

    // 1. Seed store employees
    for (const s of filteredStoreEmps) {
      if (s.id) empMap.set(s.id, s)
      if (s.employee_id_number) empMap.set(s.employee_id_number, s)
    }

    // 2. Overlay DB employees (preserving extended rich fields from store if present)
    for (const d of dbEmployees) {
      const existing = empMap.get(d.id) || (d.employee_id_number ? empMap.get(d.employee_id_number) : null)
      if (existing) {
        empMap.set(d.id, { ...existing, ...d })
      } else {
        empMap.set(d.id, d)
      }
    }

    const uniqueEmployees = Array.from(new Set(empMap.values()))
    uniqueEmployees.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    return uniqueEmployees
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
        const storeEmp =
          (PrintERPDataStore.get<EmployeeRecord[]>(STORAGE_KEYS.EMPLOYEES, companyId) || []).find((e) => e.id === id || e.employee_id_number === id) ||
          (PrintERPDataStore.get<EmployeeRecord[]>(STORAGE_KEYS.EMPLOYEES) || []).find((e) => e.id === id || e.employee_id_number === id)

        return {
          ...(storeEmp || {}),
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
    // 1. Always save to DataStore in tenant scope, clean slug scope, and general scope to guarantee local persistence
    const cleanSlug = emp.company_id.replace(/^comp-/, '').replace(/^co-/, '')
    PrintERPDataStore.addItem(STORAGE_KEYS.EMPLOYEES, emp, emp.company_id)
    if (cleanSlug !== emp.company_id) {
      PrintERPDataStore.addItem(STORAGE_KEYS.EMPLOYEES, emp, cleanSlug)
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.EMPLOYEES, emp)

    // 2. Attempt DB insertion with schema sanitization
    try {
      const admin = createAdminClient()

      let dbEmpType = 'permanent'
      if (emp.employee_type === 'contract') dbEmpType = 'contract'
      else if (emp.employee_type === 'daily_labor' || emp.employee_type === 'daily_worker' || emp.is_daily_worker) dbEmpType = 'daily_labor'

      let dbSalaryType = 'monthly'
      if (emp.salary_basis === 'daily_rate' || dbEmpType === 'daily_labor') dbSalaryType = 'daily_rate'
      else if (emp.salary_basis === 'contract') dbSalaryType = 'contract'

      let dbStatus = 'active'
      if (emp.status === 'on_leave') dbStatus = 'on_leave'
      else if ((emp.status as string) === 'terminated' || (emp.status as string) === 'suspended') dbStatus = 'terminated'

      const allowedDepts = ['printing', 'finishing', 'fabrication', 'design', 'installation', 'accounts', 'sales', 'management']
      const dbDept = allowedDepts.includes(emp.department) ? emp.department : 'printing'

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(emp.id)

      const dbPayload: any = {
        company_id: emp.company_id,
        employee_id_number: emp.employee_id_number,
        name: emp.name,
        name_bn: emp.name_bn || null,
        mobile: emp.mobile,
        address: emp.address || null,
        role: emp.role || 'Staff',
        department: dbDept,
        employee_type: dbEmpType,
        joining_date: emp.joining_date || new Date().toISOString().split('T')[0],
        salary_type: dbSalaryType,
        base_salary: Number(emp.base_salary || 0),
        daily_rate: Number(emp.daily_rate || 0),
        overtime_hourly_rate: Number(emp.overtime_hourly_rate || 0),
        current_advance_balance: Number(emp.current_advance_balance || 0),
        status: dbStatus,
        created_at: emp.created_at || new Date().toISOString(),
        updated_at: emp.updated_at || new Date().toISOString(),
      }

      if (isUuid) {
        dbPayload.id = emp.id
      }

      const { data, error } = await (admin as any)
        .from('employees')
        .insert(dbPayload)
        .select()
        .single()

      if (!error && data) {
        const merged = { ...emp, id: data.id || emp.id }
        PrintERPDataStore.updateItem<EmployeeRecord>(STORAGE_KEYS.EMPLOYEES, emp.id, merged, emp.company_id)
        PrintERPDataStore.updateItem<EmployeeRecord>(STORAGE_KEYS.EMPLOYEES, emp.id, merged)
        return merged
      } else if (error) {
        console.warn('[WorkforceRepository.createEmployee] DB insert error:', error)
      }
    } catch (e) {
      console.warn('[WorkforceRepository.createEmployee] DB insert fallback:', e)
    }

    return emp
  }

  static async updateEmployee(
    id: string,
    companyId: string,
    updates: Partial<EmployeeRecord>
  ): Promise<EmployeeRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }

    // 1. Update DataStore in all scopes (companyId, cleanSlug, and global)
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    PrintERPDataStore.updateItem<EmployeeRecord>(STORAGE_KEYS.EMPLOYEES, id, payload, companyId)
    if (cleanSlug !== companyId) {
      PrintERPDataStore.updateItem<EmployeeRecord>(STORAGE_KEYS.EMPLOYEES, id, payload, cleanSlug)
    }
    PrintERPDataStore.updateItem<EmployeeRecord>(STORAGE_KEYS.EMPLOYEES, id, payload)

    // 2. Update DB
    try {
      const admin = createAdminClient()
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

      if (isUuid) {
        const dbUpdates: any = { updated_at: payload.updated_at }
        if (updates.name !== undefined) dbUpdates.name = updates.name
        if (updates.name_bn !== undefined) dbUpdates.name_bn = updates.name_bn
        if (updates.mobile !== undefined) dbUpdates.mobile = updates.mobile
        if (updates.address !== undefined) dbUpdates.address = updates.address
        if (updates.role !== undefined) dbUpdates.role = updates.role
        if (updates.department !== undefined) dbUpdates.department = updates.department
        if (updates.base_salary !== undefined) dbUpdates.base_salary = updates.base_salary
        if (updates.daily_rate !== undefined) dbUpdates.daily_rate = updates.daily_rate
        if (updates.overtime_hourly_rate !== undefined) dbUpdates.overtime_hourly_rate = updates.overtime_hourly_rate
        if (updates.current_advance_balance !== undefined) dbUpdates.current_advance_balance = updates.current_advance_balance
        if (updates.status !== undefined) dbUpdates.status = updates.status
        if (updates.salary_basis !== undefined) dbUpdates.salary_type = updates.salary_basis === 'daily_rate' ? 'daily_rate' : 'monthly'

        const { data, error } = await (admin as any)
          .from('employees')
          .update(dbUpdates)
          .eq('company_id', companyId)
          .eq('id', id)
          .select()
          .single()

        if (!error && data) {
          const storeEmp =
            (PrintERPDataStore.get<EmployeeRecord[]>(STORAGE_KEYS.EMPLOYEES, companyId) || []).find((e) => e.id === id) ||
            (PrintERPDataStore.get<EmployeeRecord[]>(STORAGE_KEYS.EMPLOYEES) || []).find((e) => e.id === id)
          const merged = { ...(storeEmp || {}), ...data, ...updates }
          PrintERPDataStore.updateItem<EmployeeRecord>(STORAGE_KEYS.EMPLOYEES, id, merged, companyId)
          if (cleanSlug !== companyId) {
            PrintERPDataStore.updateItem<EmployeeRecord>(STORAGE_KEYS.EMPLOYEES, id, merged, cleanSlug)
          }
          PrintERPDataStore.updateItem<EmployeeRecord>(STORAGE_KEYS.EMPLOYEES, id, merged)
          return merged
        }
      }
    } catch (e) {
      console.warn('[WorkforceRepository.updateEmployee] DB update fallback:', e)
    }

    const emps = await this.getEmployees(companyId)
    return emps.find((e) => e.id === id) || null
  }

  static async deleteEmployee(id: string, companyId: string): Promise<boolean> {
    try {
      const admin = createAdminClient()
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      if (isUuid) {
        await (admin as any)
          .from('employees')
          .delete()
          .eq('company_id', companyId)
          .eq('id', id)
      }
    } catch (e) {
      console.warn('[WorkforceRepository.deleteEmployee] DB delete fallback:', e)
    }

    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`
    PrintERPDataStore.removeItem(STORAGE_KEYS.EMPLOYEES, id, companyId)
    if (cleanSlug !== companyId) {
      PrintERPDataStore.removeItem(STORAGE_KEYS.EMPLOYEES, id, cleanSlug)
    }
    if (compSlug !== companyId) {
      PrintERPDataStore.removeItem(STORAGE_KEYS.EMPLOYEES, id, compSlug)
    }
    PrintERPDataStore.removeItem(STORAGE_KEYS.EMPLOYEES, id)
    return true
  }

  // ============================================================================
  // 2. SHIFTS
  // ============================================================================

  static async seedDefaultShifts(companyId: string): Promise<ShiftRecord[]> {
    const now = new Date().toISOString()
    const cleanId = companyId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8) || 'default'
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    const defaultShifts: ShiftRecord[] = [
      {
        id: `shf-day-${cleanId}`,
        company_id: companyId,
        branch_id: null,
        shift_code: 'SHF-DAY-01',
        shift_name: 'Regular Day Shift (০৯:০০ - ১৮:০০)',
        start_time: '09:00',
        end_time: '18:00',
        is_overnight: false,
        grace_period_minutes: 15,
        break_duration_minutes: 60,
        working_days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
        overtime_rules: { enabled: true, multiplier: 1.5, min_minutes: 30 },
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: `shf-night-${cleanId}`,
        company_id: companyId,
        branch_id: null,
        shift_code: 'SHF-NIGHT-02',
        shift_name: 'Night Press Shift (২০:০০ - ০৬:০০)',
        start_time: '20:00',
        end_time: '06:00',
        is_overnight: true,
        grace_period_minutes: 15,
        break_duration_minutes: 60,
        working_days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
        overtime_rules: { enabled: true, multiplier: 1.5, min_minutes: 30 },
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]

    for (const shift of defaultShifts) {
      PrintERPDataStore.addItem(STORAGE_KEYS.SHIFTS, shift, companyId)
      if (cleanSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.SHIFTS, shift, cleanSlug)
      if (compSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.SHIFTS, shift, compSlug)
      PrintERPDataStore.addItem(STORAGE_KEYS.SHIFTS, shift)
    }

    try {
      const admin = createAdminClient()
      for (const shift of defaultShifts) {
        await (admin as any).from('shifts').insert(shift)
      }
    } catch {}

    return defaultShifts
  }

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

    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    const storeScoped1 = PrintERPDataStore.get<ShiftRecord[]>(STORAGE_KEYS.SHIFTS, companyId) || []
    const storeScoped2 = cleanSlug !== companyId ? (PrintERPDataStore.get<ShiftRecord[]>(STORAGE_KEYS.SHIFTS, cleanSlug) || []) : []
    const storeScoped3 = compSlug !== companyId ? (PrintERPDataStore.get<ShiftRecord[]>(STORAGE_KEYS.SHIFTS, compSlug) || []) : []
    const storeGlobal = PrintERPDataStore.get<ShiftRecord[]>(STORAGE_KEYS.SHIFTS) || []

    const allShifts = [...storeScoped1, ...storeScoped2, ...storeScoped3, ...storeGlobal]
    const filtered = allShifts.filter((s) => {
      if (s.company_id && !isMatchingCompany(s.company_id, companyId)) return false
      if (branchId && s.branch_id !== branchId) return false
      return true
    })

    const shiftMap = new Map<string, ShiftRecord>()
    for (const s of filtered) {
      if (s.id && !shiftMap.has(s.id)) shiftMap.set(s.id, s)
    }

    const uniqueShifts = Array.from(shiftMap.values())
    return uniqueShifts
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
    const companyId = shift.company_id
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('shifts')
        .insert(shift)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.SHIFTS, data as ShiftRecord, companyId)
        if (cleanSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.SHIFTS, data as ShiftRecord, cleanSlug)
        if (compSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.SHIFTS, data as ShiftRecord, compSlug)
        PrintERPDataStore.addItem(STORAGE_KEYS.SHIFTS, data as ShiftRecord)
        return data as ShiftRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.createShift] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.SHIFTS, shift, companyId)
    if (cleanSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.SHIFTS, shift, cleanSlug)
    if (compSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.SHIFTS, shift, compSlug)
    PrintERPDataStore.addItem(STORAGE_KEYS.SHIFTS, shift)
    return shift
  }

  static async updateShift(
    id: string,
    companyId: string,
    updates: Partial<ShiftRecord>
  ): Promise<ShiftRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

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
        PrintERPDataStore.updateItem<ShiftRecord>(STORAGE_KEYS.SHIFTS, id, data, companyId)
        if (cleanSlug !== companyId) PrintERPDataStore.updateItem<ShiftRecord>(STORAGE_KEYS.SHIFTS, id, data, cleanSlug)
        if (compSlug !== companyId) PrintERPDataStore.updateItem<ShiftRecord>(STORAGE_KEYS.SHIFTS, id, data, compSlug)
        PrintERPDataStore.updateItem<ShiftRecord>(STORAGE_KEYS.SHIFTS, id, data)
        return data as ShiftRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.updateShift] DB fallback:', e)
    }

    PrintERPDataStore.updateItem<ShiftRecord>(STORAGE_KEYS.SHIFTS, id, payload, companyId)
    if (cleanSlug !== companyId) PrintERPDataStore.updateItem<ShiftRecord>(STORAGE_KEYS.SHIFTS, id, payload, cleanSlug)
    if (compSlug !== companyId) PrintERPDataStore.updateItem<ShiftRecord>(STORAGE_KEYS.SHIFTS, id, payload, compSlug)
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
      (a) => isMatchingCompany(a.company_id, companyId) && a.employee_id === employeeId && a.is_active
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

  static async seedDefaultAttendanceSummaries(companyId: string): Promise<AttendanceDailySummaryRecord[]> {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const currentDay = now.getDate()
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`
    const cleanId = companyId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8) || 'default'

    let employees = await this.getEmployees(companyId, { status: 'active' })
    if (employees.length === 0) {
      employees = await this.seedDefaultEmployees(companyId)
    }

    const shifts = await this.getShifts(companyId)
    const defaultShift = shifts[0] || {
      id: `shf-day-${cleanId}`,
      shift_name: 'Regular Day Shift',
      start_time: '09:00',
      end_time: '18:00',
    }

    const seeded: AttendanceDailySummaryRecord[] = []
    const daysToSeed = Math.max(currentDay, 26)

    for (let day = 1; day <= daysToSeed; day++) {
      const dateObj = new Date(year, month - 1, day)
      const dayOfWeek = dateObj.getDay() // 5 = Friday
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i]
        const idSuffix = `${day}-${i + 1}-${cleanId}`

        if (dayOfWeek === 5) {
          seeded.push({
            id: `att-off-${idSuffix}`,
            company_id: companyId,
            branch_id: emp.branch_id || null,
            employee_id: emp.id,
            employee_name: emp.name,
            employee_role: emp.role,
            employee_department: emp.department,
            shift_id: defaultShift.id,
            shift_name: defaultShift.shift_name,
            attendance_date: dateStr,
            status: 'off_day',
            check_in_time: null,
            check_out_time: null,
            late_minutes: 0,
            early_leave_minutes: 0,
            worked_minutes: 0,
            potential_ot_minutes: 0,
            approved_ot_minutes: 0,
            attendance_source: 'system',
            notes: 'Weekly Friday Off',
            created_at: new Date(year, month - 1, day, 8, 0, 0).toISOString(),
            updated_at: new Date(year, month - 1, day, 8, 0, 0).toISOString(),
          })
          continue
        }

        const isLate = (day + i) % 9 === 0
        const isFieldWork = emp.role.toLowerCase().includes('installation') && (day % 3 === 0)
        const isOt = (emp.role.toLowerCase().includes('operator') || emp.role.toLowerCase().includes('fabricator') || emp.is_daily_worker) && (day % 2 === 0)

        const checkIn = isLate ? '09:25:00' : '08:55:00'
        const checkOut = isOt ? '20:30:00' : '18:05:00'
        const lateMins = isLate ? 25 : 0
        const workedMins = isOt ? 690 : 540
        const otMins = isOt ? 120 : 0
        const status = isFieldWork ? 'field_work' : isLate ? 'late' : 'present'

        seeded.push({
          id: `att-day-${idSuffix}`,
          company_id: companyId,
          branch_id: emp.branch_id || null,
          employee_id: emp.id,
          employee_name: emp.name,
          employee_role: emp.role,
          employee_department: emp.department,
          shift_id: defaultShift.id,
          shift_name: defaultShift.shift_name,
          attendance_date: dateStr,
          status,
          check_in_time: checkIn,
          check_out_time: day === currentDay && dateObj.getHours() < 18 ? null : checkOut,
          late_minutes: lateMins,
          early_leave_minutes: 0,
          worked_minutes: workedMins,
          potential_ot_minutes: otMins,
          approved_ot_minutes: otMins,
          attendance_source: 'qr_geo',
          notes: isFieldWork ? 'On-site Client Installation' : isOt ? 'Night press run shift' : 'Standard Floor Shift',
          created_at: new Date(year, month - 1, day, 9, 0, 0).toISOString(),
          updated_at: new Date(year, month - 1, day, 18, 0, 0).toISOString(),
        })
      }
    }

    for (const record of seeded) {
      PrintERPDataStore.addItem(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, record, companyId)
      if (cleanSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, record, cleanSlug)
      if (compSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, record, compSlug)
      PrintERPDataStore.addItem(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, record)
    }

    try {
      const admin = createAdminClient()
      const dbRows = seeded.map((s) => ({
        id: s.id,
        company_id: s.company_id,
        branch_id: s.branch_id,
        employee_id: s.employee_id,
        shift_id: s.shift_id,
        attendance_date: s.attendance_date,
        status: s.status,
        check_in_time: s.check_in_time,
        check_out_time: s.check_out_time,
        late_minutes: s.late_minutes,
        early_leave_minutes: s.early_leave_minutes,
        worked_minutes: s.worked_minutes,
        potential_ot_minutes: s.potential_ot_minutes,
        approved_ot_minutes: s.approved_ot_minutes,
        attendance_source: s.attendance_source,
        notes: s.notes,
        created_at: s.created_at,
        updated_at: s.updated_at,
      }))
      await (admin as any).from('attendance_daily_summaries').upsert(dbRows, { onConflict: 'company_id,employee_id,attendance_date' })
    } catch {}

    return seeded
  }

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
    let dbSummaries: AttendanceDailySummaryRecord[] = []
    try {
      const admin = createAdminClient()
      let query = (admin as any)
        .from('attendance_daily_summaries')
        .select('*, employees(name, name_bn, role, department, employee_id_number), shifts(shift_name), attendance_locations(name), job_orders(job_order_number)')
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
        dbSummaries = data.map((d: any) => ({
          ...d,
          employee_name: d.employees?.name || 'Staff',
          employee_name_bn: d.employees?.name_bn || null,
          employee_id_number: d.employees?.employee_id_number || 'EMP',
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

    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    const storeScoped1 = PrintERPDataStore.get<AttendanceDailySummaryRecord[]>(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, companyId) || []
    const storeScoped2 = cleanSlug !== companyId ? (PrintERPDataStore.get<AttendanceDailySummaryRecord[]>(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, cleanSlug) || []) : []
    const storeScoped3 = compSlug !== companyId ? (PrintERPDataStore.get<AttendanceDailySummaryRecord[]>(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, compSlug) || []) : []
    const storeGlobal = PrintERPDataStore.get<AttendanceDailySummaryRecord[]>(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES) || []

    const allStore = [...storeScoped1, ...storeScoped2, ...storeScoped3, ...storeGlobal]

    const filteredStore = allStore.filter((s) => {
      if (s.company_id && !isMatchingCompany(s.company_id, companyId)) return false
      if (options?.date && s.attendance_date !== options.date) return false
      if (options?.startDate && s.attendance_date < options.startDate) return false
      if (options?.endDate && s.attendance_date > options.endDate) return false
      if (options?.employeeId && s.employee_id !== options.employeeId) return false
      if (options?.status && s.status !== options.status) return false
      if (options?.branchId && s.branch_id !== options.branchId) return false
      if (options?.department && s.employee_department && s.employee_department !== options.department) return false
      return true
    })

    const attMap = new Map<string, AttendanceDailySummaryRecord>()
    for (const s of filteredStore) {
      const key = `${s.employee_id}_${s.attendance_date}`
      attMap.set(key, s)
    }
    for (const d of dbSummaries) {
      const key = `${d.employee_id}_${d.attendance_date}`
      const existing = attMap.get(key) || (d.id ? attMap.get(d.id) : null)
      attMap.set(key, existing ? { ...existing, ...d } : d)
    }

    const uniqueSummaries = Array.from(attMap.values())
    uniqueSummaries.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date))
    return uniqueSummaries.filter((s) => {
      if (options?.date && s.attendance_date !== options.date) return false
      if (options?.startDate && s.attendance_date < options.startDate) return false
      if (options?.endDate && s.attendance_date > options.endDate) return false
      if (options?.employeeId && s.employee_id !== options.employeeId) return false
      if (options?.status && s.status !== options.status) return false
      return true
    })
  }

  static async upsertDailyAttendanceSummary(
    summary: AttendanceDailySummaryRecord
  ): Promise<AttendanceDailySummaryRecord> {
    const companyId = summary.company_id
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`
    const payload = { ...summary, updated_at: new Date().toISOString() }

    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('attendance_daily_summaries')
        .upsert(payload, { onConflict: 'company_id,employee_id,attendance_date' })
        .select()
        .single()

      if (!error && data) {
        const merged = { ...payload, ...data }
        PrintERPDataStore.addItem(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, merged, companyId)
        if (cleanSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, merged, cleanSlug)
        if (compSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, merged, compSlug)
        PrintERPDataStore.addItem(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, merged)
        return merged as AttendanceDailySummaryRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.upsertDailyAttendanceSummary] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, payload, companyId)
    if (cleanSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, payload, cleanSlug)
    if (compSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, payload, compSlug)
    PrintERPDataStore.addItem(STORAGE_KEYS.WF_ATTENDANCE_SUMMARIES, payload)
    return payload
  }

  // ============================================================================
  // 4. OVERTIME RECORDS
  // ============================================================================

  static async seedDefaultOvertimeRecords(companyId: string): Promise<OvertimeRecord[]> {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`
    const cleanId = companyId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8) || 'default'

    let employees = await this.getEmployees(companyId, { status: 'active' })
    if (employees.length === 0) {
      employees = await this.seedDefaultEmployees(companyId)
    }

    const seeded: OvertimeRecord[] = []
    const sampleOtProfiles: Array<{
      empIdx: number
      dayOffset: number
      duration: number
      type: OvertimeType
      status: 'approved' | 'pending_approval'
      reason: string
    }> = [
      { empIdx: 0, dayOffset: 1, duration: 120, type: 'regular_day', status: 'approved', reason: 'Evening rush offset print catalog run' },
      { empIdx: 1, dayOffset: 2, duration: 90, type: 'regular_day', status: 'approved', reason: 'Large format UV printing client urgent order' },
      { empIdx: 3, dayOffset: 3, duration: 150, type: 'regular_day', status: 'approved', reason: '3D acrylic signage laser cutting & polishing' },
      { empIdx: 6, dayOffset: 4, duration: 180, type: 'holiday', status: 'approved', reason: 'Night rush shop-floor loading and packing' },
      { empIdx: 2, dayOffset: 0, duration: 60, type: 'regular_day', status: 'pending_approval', reason: 'Late die-cutting setup for pharmaceutical packaging' },
    ]

    for (let idx = 0; idx < sampleOtProfiles.length; idx++) {
      const p = sampleOtProfiles[idx]
      const emp = employees[p.empIdx] || employees[0]
      const targetDay = Math.max(1, now.getDate() - p.dayOffset)
      const otDate = `${year}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
      const baseOtRate = Number(emp.overtime_hourly_rate || (emp.base_salary ? Math.round((emp.base_salary / 208) * 1.5) : 150))
      const hours = Math.round((p.duration / 60) * 10) / 10
      const amount = Math.round(hours * baseOtRate)

      seeded.push({
        id: `ot-seed-${idx + 1}-${cleanId}`,
        company_id: companyId,
        branch_id: emp.branch_id || null,
        employee_id: emp.id,
        employee_name: emp.name,
        employee_role: emp.role,
        employee_department: emp.department,
        attendance_id: null,
        ot_date: otDate,
        start_time: '18:00',
        end_time: `${18 + Math.floor(p.duration / 60)}:${String(p.duration % 60).padStart(2, '0')}`,
        duration_minutes: p.duration,
        duration_hours: hours,
        ot_type: p.type,
        base_hourly_rate: baseOtRate,
        multiplier: 1.0,
        effective_ot_rate: baseOtRate,
        calculated_amount: amount,
        status: p.status,
        reason: p.reason,
        requested_by_id: emp.id,
        requested_by_name: emp.name,
        approved_by_id: p.status === 'approved' ? 'admin' : null,
        approved_by_name: p.status === 'approved' ? 'Shop-Floor Manager' : null,
        approved_at: p.status === 'approved' ? now.toISOString() : null,
        created_at: new Date(year, month - 1, targetDay, 18, 0, 0).toISOString(),
        updated_at: new Date(year, month - 1, targetDay, 18, 0, 0).toISOString(),
      })
    }

    for (const record of seeded) {
      PrintERPDataStore.addItem(STORAGE_KEYS.WF_OVERTIME_RECORDS, record, companyId)
      if (cleanSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_OVERTIME_RECORDS, record, cleanSlug)
      if (compSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_OVERTIME_RECORDS, record, compSlug)
      PrintERPDataStore.addItem(STORAGE_KEYS.WF_OVERTIME_RECORDS, record)
    }

    try {
      const admin = createAdminClient()
      for (const record of seeded) {
        await (admin as any).from('overtime_records').insert(record)
      }
    } catch {}

    return seeded
  }

  static async getOvertimeRecords(
    companyId: string,
    options?: { employeeId?: string; status?: string; otDate?: string; payrollPeriodId?: string }
  ): Promise<OvertimeRecord[]> {
    let dbRecords: OvertimeRecord[] = []
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
        dbRecords = data.map((d: any) => ({
          ...d,
          employee_name: d.employees?.name || 'Staff',
          employee_role: d.employees?.role || 'Staff',
          employee_department: d.employees?.department || 'printing',
        })) as OvertimeRecord[]
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getOvertimeRecords] DB fallback:', e)
    }

    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    const storeScoped1 = PrintERPDataStore.get<OvertimeRecord[]>(STORAGE_KEYS.WF_OVERTIME_RECORDS, companyId) || []
    const storeScoped2 = cleanSlug !== companyId ? (PrintERPDataStore.get<OvertimeRecord[]>(STORAGE_KEYS.WF_OVERTIME_RECORDS, cleanSlug) || []) : []
    const storeScoped3 = compSlug !== companyId ? (PrintERPDataStore.get<OvertimeRecord[]>(STORAGE_KEYS.WF_OVERTIME_RECORDS, compSlug) || []) : []
    const storeGlobal = PrintERPDataStore.get<OvertimeRecord[]>(STORAGE_KEYS.WF_OVERTIME_RECORDS) || []

    const allRecords = [...storeScoped1, ...storeScoped2, ...storeScoped3, ...storeGlobal]

    const filtered = allRecords.filter((r) => {
      if (r.company_id && !isMatchingCompany(r.company_id, companyId)) return false
      if (options?.employeeId && r.employee_id !== options.employeeId) return false
      if (options?.status && r.status !== options.status) return false
      if (options?.otDate && r.ot_date !== options.otDate) return false
      if (options?.payrollPeriodId && r.payroll_period_id !== options.payrollPeriodId) return false
      return true
    })

    const otMap = new Map<string, OvertimeRecord>()
    for (const s of filtered) {
      if (s.id) otMap.set(s.id, s)
    }
    for (const d of dbRecords) {
      const existing = otMap.get(d.id)
      otMap.set(d.id, existing ? { ...existing, ...d } : d)
    }

    const uniqueRecords = Array.from(otMap.values())
    uniqueRecords.sort((a, b) => b.ot_date.localeCompare(a.ot_date))
    return uniqueRecords
  }

  static async createOvertimeRecord(record: OvertimeRecord): Promise<OvertimeRecord> {
    const companyId = record.company_id
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('overtime_records')
        .insert(record)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.WF_OVERTIME_RECORDS, data as OvertimeRecord, companyId)
        if (cleanSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_OVERTIME_RECORDS, data as OvertimeRecord, cleanSlug)
        if (compSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_OVERTIME_RECORDS, data as OvertimeRecord, compSlug)
        PrintERPDataStore.addItem(STORAGE_KEYS.WF_OVERTIME_RECORDS, data as OvertimeRecord)
        return data as OvertimeRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.createOvertimeRecord] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.WF_OVERTIME_RECORDS, record, companyId)
    if (cleanSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_OVERTIME_RECORDS, record, cleanSlug)
    if (compSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_OVERTIME_RECORDS, record, compSlug)
    PrintERPDataStore.addItem(STORAGE_KEYS.WF_OVERTIME_RECORDS, record)
    return record
  }

  static async updateOvertimeRecord(
    id: string,
    companyId: string,
    updates: Partial<OvertimeRecord>
  ): Promise<OvertimeRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

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
        PrintERPDataStore.updateItem<OvertimeRecord>(STORAGE_KEYS.WF_OVERTIME_RECORDS, id, data, companyId)
        if (cleanSlug !== companyId) PrintERPDataStore.updateItem<OvertimeRecord>(STORAGE_KEYS.WF_OVERTIME_RECORDS, id, data, cleanSlug)
        if (compSlug !== companyId) PrintERPDataStore.updateItem<OvertimeRecord>(STORAGE_KEYS.WF_OVERTIME_RECORDS, id, data, compSlug)
        PrintERPDataStore.updateItem<OvertimeRecord>(STORAGE_KEYS.WF_OVERTIME_RECORDS, id, data)
        return data as OvertimeRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.updateOvertimeRecord] DB fallback:', e)
    }

    PrintERPDataStore.updateItem<OvertimeRecord>(STORAGE_KEYS.WF_OVERTIME_RECORDS, id, payload, companyId)
    if (cleanSlug !== companyId) PrintERPDataStore.updateItem<OvertimeRecord>(STORAGE_KEYS.WF_OVERTIME_RECORDS, id, payload, cleanSlug)
    if (compSlug !== companyId) PrintERPDataStore.updateItem<OvertimeRecord>(STORAGE_KEYS.WF_OVERTIME_RECORDS, id, payload, compSlug)
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
          employee_name: d.employees?.name || d.employee_name || 'Staff',
        })) as SalaryAdvanceRecord[]
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getSalaryAdvances] DB fallback:', e)
    }

    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    const storeScoped1 = PrintERPDataStore.get<SalaryAdvanceRecord[]>(STORAGE_KEYS.SALARY_ADVANCES, companyId) || []
    const storeScoped2 = cleanSlug !== companyId ? (PrintERPDataStore.get<SalaryAdvanceRecord[]>(STORAGE_KEYS.SALARY_ADVANCES, cleanSlug) || []) : []
    const storeScoped3 = compSlug !== companyId ? (PrintERPDataStore.get<SalaryAdvanceRecord[]>(STORAGE_KEYS.SALARY_ADVANCES, compSlug) || []) : []
    const storeGlobal = PrintERPDataStore.get<SalaryAdvanceRecord[]>(STORAGE_KEYS.SALARY_ADVANCES) || []

    const allAdvances = [...storeScoped1, ...storeScoped2, ...storeScoped3, ...storeGlobal]

    const filtered = allAdvances.filter((a) => {
      if (a.company_id && !isMatchingCompany(a.company_id, companyId)) return false
      if (options?.employeeId && a.employee_id !== options.employeeId) return false
      if (options?.status && a.status !== options.status) return false
      if (options?.isSettled !== undefined && a.is_settled !== options.isSettled) return false
      return true
    })

    const advMap = new Map<string, SalaryAdvanceRecord>()
    for (const a of filtered) {
      if (a.id && !advMap.has(a.id)) {
        advMap.set(a.id, a)
      }
    }

    return Array.from(advMap.values())
  }

  static async createSalaryAdvance(advance: SalaryAdvanceRecord): Promise<SalaryAdvanceRecord> {
    const companyId = advance.company_id
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('salary_advances')
        .insert(advance)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.SALARY_ADVANCES, data as SalaryAdvanceRecord, companyId)
        if (cleanSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.SALARY_ADVANCES, data as SalaryAdvanceRecord, cleanSlug)
        if (compSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.SALARY_ADVANCES, data as SalaryAdvanceRecord, compSlug)
        PrintERPDataStore.addItem(STORAGE_KEYS.SALARY_ADVANCES, data as SalaryAdvanceRecord)
        return data as SalaryAdvanceRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.createSalaryAdvance] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.SALARY_ADVANCES, advance, companyId)
    if (cleanSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.SALARY_ADVANCES, advance, cleanSlug)
    if (compSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.SALARY_ADVANCES, advance, compSlug)
    PrintERPDataStore.addItem(STORAGE_KEYS.SALARY_ADVANCES, advance)
    return advance
  }

  static async updateSalaryAdvance(
    id: string,
    companyId: string,
    updates: Partial<SalaryAdvanceRecord>
  ): Promise<SalaryAdvanceRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

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
        PrintERPDataStore.updateItem<SalaryAdvanceRecord>(STORAGE_KEYS.SALARY_ADVANCES, id, data, companyId)
        if (cleanSlug !== companyId) PrintERPDataStore.updateItem<SalaryAdvanceRecord>(STORAGE_KEYS.SALARY_ADVANCES, id, data, cleanSlug)
        if (compSlug !== companyId) PrintERPDataStore.updateItem<SalaryAdvanceRecord>(STORAGE_KEYS.SALARY_ADVANCES, id, data, compSlug)
        PrintERPDataStore.updateItem<SalaryAdvanceRecord>(STORAGE_KEYS.SALARY_ADVANCES, id, data)
        return data as SalaryAdvanceRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.updateSalaryAdvance] DB fallback:', e)
    }

    PrintERPDataStore.updateItem<SalaryAdvanceRecord>(STORAGE_KEYS.SALARY_ADVANCES, id, payload, companyId)
    if (cleanSlug !== companyId) PrintERPDataStore.updateItem<SalaryAdvanceRecord>(STORAGE_KEYS.SALARY_ADVANCES, id, payload, cleanSlug)
    if (compSlug !== companyId) PrintERPDataStore.updateItem<SalaryAdvanceRecord>(STORAGE_KEYS.SALARY_ADVANCES, id, payload, compSlug)
    return PrintERPDataStore.updateItem<SalaryAdvanceRecord>(STORAGE_KEYS.SALARY_ADVANCES, id, payload)
  }

  // ============================================================================
  // 6. PAYROLL PERIODS & ITEMS
  // ============================================================================

  static async seedDefaultPayrollPeriod(companyId: string): Promise<PayrollPeriodRecord[]> {
    const now = new Date().toISOString()
    const cleanId = companyId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8) || 'default'
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    // 1. Ensure active employees exist
    let employees = await this.getEmployees(companyId, { status: 'active' })
    if (employees.length === 0) {
      employees = await this.seedDefaultEmployees(companyId)
    }

    const nowDate = new Date()
    const year = nowDate.getFullYear()
    const month = nowDate.getMonth() + 1
    const monthStr = String(month).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()
    const monthName = nowDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const periodName = `${monthName} Payroll`
    const periodId = `pp-seed-${year}-${monthStr}-${cleanId}`

    const items: PayrollItemRecord[] = []
    let totalGross = 0
    let totalOt = 0
    let totalAdvances = 0
    let totalDeductions = 0
    let totalNet = 0

    const otHoursMap: Record<string, number> = {
      'EMP-2024-1001': 14,
      'EMP-2024-1002': 10,
      'EMP-2024-1003': 8,
      'EMP-2024-1004': 12,
      'EMP-2024-1005': 6,
      'EMP-2024-1006': 0,
      'EMP-2024-1007': 16,
    }

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]
      const otHours = otHoursMap[emp.employee_id_number] || (emp.is_daily_worker ? 10 : 4)
      const otRate = Number(emp.overtime_hourly_rate || (emp.hourly_rate ? emp.hourly_rate * 1.5 : 150))
      const otAmount = Math.round(otHours * otRate)

      let baseSalary = Number(emp.base_salary || 0)
      if (emp.salary_basis === 'daily_rate' || emp.is_daily_worker) {
        baseSalary = Number(emp.daily_rate || 800) * 26
      }

      const grossSalary = baseSalary + otAmount
      const advanceDeduction = 0
      const absenceDeduction = 0
      const lateFine = 0
      const otherDeductions = 0
      const netSalary = grossSalary - advanceDeduction - absenceDeduction - lateFine - otherDeductions

      const allowances: SalaryStructure = emp.salary_structure || {
        basic: Math.round(baseSalary * 0.6),
        house_allowance: Math.round(baseSalary * 0.2),
        transport_allowance: Math.round(baseSalary * 0.1),
        food_allowance: 0,
        medical_allowance: Math.round(baseSalary * 0.1),
        other_allowances: 0,
      }

      const item: PayrollItemRecord = {
        id: `pi-seed-${i + 1}-${cleanId}`,
        company_id: companyId,
        payroll_period_id: periodId,
        employee_id: emp.id,
        employee_name: emp.name,
        employee_name_bn: emp.name_bn || null,
        employee_id_number: emp.employee_id_number,
        role: emp.role,
        department: emp.department,
        employee_type: emp.employee_type || 'permanent',
        salary_basis: emp.salary_basis || (emp.is_daily_worker ? 'daily_rate' : 'monthly'),
        base_salary: baseSalary,
        daily_rate: Number(emp.daily_rate || 0),
        hourly_rate: Number(emp.hourly_rate || (baseSalary > 0 ? Math.round(baseSalary / 208) : 0)),
        days_present: 26,
        hours_worked: 208,
        overtime_hours: otHours,
        overtime_amount: otAmount,
        allowances_breakdown: allowances,
        bonuses: 0,
        gross_salary: grossSalary,
        advance_salary_deducted: 0,
        advance_remaining_balance: Number(emp.current_advance_balance || 0),
        absence_deduction: 0,
        late_fine: 0,
        loan_deduction: 0,
        other_deductions: 0,
        net_salary: netSalary,
        paid_amount: 0,
        due_amount: netSalary,
        payment_status: 'unpaid',
        created_at: now,
        updated_at: now,
      }

      items.push(item)
      totalGross += grossSalary
      totalOt += otAmount
      totalAdvances += advanceDeduction
      totalDeductions += (absenceDeduction + lateFine + otherDeductions)
      totalNet += netSalary
    }

    const periodRecord: PayrollPeriodRecord = {
      id: periodId,
      company_id: companyId,
      branch_id: null,
      period_name: periodName,
      start_date: `${year}-${monthStr}-01`,
      end_date: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
      working_days_count: 26,
      status: 'approved',
      total_gross_salary: totalGross,
      total_ot_amount: totalOt,
      total_advances_deducted: totalAdvances,
      total_other_deductions: totalDeductions,
      total_net_salary: totalNet,
      total_paid_amount: 0,
      total_due_amount: totalNet,
      notes: `Automated monthly payroll sheet for ${employees.length} print & signage employees`,
      items,
      created_at: now,
      updated_at: now,
    }

    // Persist to store in all scopes
    PrintERPDataStore.addItem(STORAGE_KEYS.PAYROLL_PERIODS, periodRecord, companyId)
    if (cleanSlug !== companyId) {
      PrintERPDataStore.addItem(STORAGE_KEYS.PAYROLL_PERIODS, periodRecord, cleanSlug)
    }
    if (compSlug !== companyId) {
      PrintERPDataStore.addItem(STORAGE_KEYS.PAYROLL_PERIODS, periodRecord, compSlug)
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PAYROLL_PERIODS, periodRecord)

    // Best-effort DB insert
    try {
      const admin = createAdminClient()
      const { data: savedPeriod, error: pErr } = await (admin as any)
        .from('payroll_periods')
        .insert({
          id: periodRecord.id,
          company_id: periodRecord.company_id,
          branch_id: null,
          period_name: periodRecord.period_name,
          start_date: periodRecord.start_date,
          end_date: periodRecord.end_date,
          working_days_count: periodRecord.working_days_count,
          status: periodRecord.status,
          total_gross_salary: periodRecord.total_gross_salary,
          total_ot_amount: periodRecord.total_ot_amount,
          total_advances_deducted: periodRecord.total_advances_deducted,
          total_other_deductions: periodRecord.total_other_deductions,
          total_net_salary: periodRecord.total_net_salary,
          total_paid_amount: periodRecord.total_paid_amount,
          total_due_amount: periodRecord.total_due_amount,
          notes: periodRecord.notes,
        })
        .select()
        .single()

      if (!pErr && savedPeriod && items.length > 0) {
        await (admin as any).from('payroll_items').insert(
          items.map((it) => ({
            ...it,
            payroll_period_id: savedPeriod.id,
          }))
        )
      }
    } catch {}

    return [periodRecord]
  }

  static async getPayrollPeriods(companyId: string, options?: { status?: string }): Promise<PayrollPeriodRecord[]> {
    let dbPeriods: PayrollPeriodRecord[] = []
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
        dbPeriods = data.map((p: any) => ({
          ...p,
          items: (p.payroll_items || []).map((i: any) => ({
            ...i,
            employee_name: i.employees?.name || i.employee_name || 'Staff',
            employee_name_bn: i.employees?.name_bn || i.employee_name_bn || null,
            employee_id_number: i.employees?.employee_id_number || i.employee_id_number || 'EMP',
            role: i.employees?.role || i.role || 'Staff',
            department: i.employees?.department || i.department || 'printing',
          })),
        })) as PayrollPeriodRecord[]
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getPayrollPeriods] DB fallback:', e)
    }

    // Retrieve from local store across all tenant partitions (scoped, clean-slug, comp-slug, and global)
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    const storeScoped1 = PrintERPDataStore.get<PayrollPeriodRecord[]>(STORAGE_KEYS.PAYROLL_PERIODS, companyId) || []
    const storeScoped2 = cleanSlug !== companyId ? (PrintERPDataStore.get<PayrollPeriodRecord[]>(STORAGE_KEYS.PAYROLL_PERIODS, cleanSlug) || []) : []
    const storeScoped3 = compSlug !== companyId ? (PrintERPDataStore.get<PayrollPeriodRecord[]>(STORAGE_KEYS.PAYROLL_PERIODS, compSlug) || []) : []
    const storeGlobal = PrintERPDataStore.get<PayrollPeriodRecord[]>(STORAGE_KEYS.PAYROLL_PERIODS) || []

    const allStorePeriods = [...storeScoped1, ...storeScoped2, ...storeScoped3, ...storeGlobal]

    const filteredStorePeriods = allStorePeriods.filter((p) => {
      if (p.company_id && !isMatchingCompany(p.company_id, companyId)) return false
      if (options?.status && p.status !== options.status) return false
      return true
    })

    // Merge store and DB periods into periodMap
    const periodMap = new Map<string, PayrollPeriodRecord>()

    // 1. Seed store periods first
    for (const p of filteredStorePeriods) {
      if (p.id) {
        periodMap.set(p.id, p)
      }
    }

    // 2. Overlay DB periods (preserving items from store if DB items array is empty)
    for (const d of dbPeriods) {
      const existing = periodMap.get(d.id)
      if (existing) {
        const mergedItems = (d.items && d.items.length > 0) ? d.items : (existing.items || [])
        periodMap.set(d.id, { ...existing, ...d, items: mergedItems })
      } else {
        periodMap.set(d.id, d)
      }
    }

    const resultPeriods = Array.from(periodMap.values())
    resultPeriods.sort((a, b) => new Date(b.created_at || b.start_date || 0).getTime() - new Date(a.created_at || a.start_date || 0).getTime())
    return resultPeriods
  }

  static async getPayrollPeriodById(id: string, companyId: string): Promise<PayrollPeriodRecord | null> {
    const periods = await this.getPayrollPeriods(companyId)
    const found = periods.find((p) => p.id === id || p.period_name.toLowerCase() === id.toLowerCase()) || null
    return found
  }

  static async createPayrollPeriod(
    period: PayrollPeriodRecord,
    items: PayrollItemRecord[]
  ): Promise<PayrollPeriodRecord> {
    const companyId = period.company_id
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`
    const completePeriod: PayrollPeriodRecord = {
      ...period,
      items,
    }

    // 1. Persist to DataStore across all tenant partition keys (scoped, cleanSlug, compSlug, global)
    PrintERPDataStore.addItem(STORAGE_KEYS.PAYROLL_PERIODS, completePeriod, companyId)
    if (cleanSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.PAYROLL_PERIODS, completePeriod, cleanSlug)
    if (compSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.PAYROLL_PERIODS, completePeriod, compSlug)
    PrintERPDataStore.addItem(STORAGE_KEYS.PAYROLL_PERIODS, completePeriod)

    // 2. Best-effort DB upsert
    try {
      const admin = createAdminClient()
      const { data: savedPeriod, error: pErr } = await (admin as any)
        .from('payroll_periods')
        .upsert({
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
        }, { onConflict: 'id' })
        .select()
        .single()

      if (!pErr && savedPeriod && items.length > 0) {
        try {
          await (admin as any).from('payroll_items').upsert(
            items.map((i) => ({
              ...i,
              payroll_period_id: savedPeriod.id,
            })),
            { onConflict: 'id' }
          )
        } catch {}
      }
    } catch (e) {
      console.warn('[WorkforceRepository.createPayrollPeriod] DB insert fallback:', e)
    }

    return completePeriod
  }

  static async updatePayrollPeriod(
    id: string,
    companyId: string,
    updates: Partial<PayrollPeriodRecord>
  ): Promise<PayrollPeriodRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    // 1. Update in local store across all partitions
    PrintERPDataStore.updateItem<PayrollPeriodRecord>(STORAGE_KEYS.PAYROLL_PERIODS, id, payload, companyId)
    if (cleanSlug !== companyId) PrintERPDataStore.updateItem<PayrollPeriodRecord>(STORAGE_KEYS.PAYROLL_PERIODS, id, payload, cleanSlug)
    if (compSlug !== companyId) PrintERPDataStore.updateItem<PayrollPeriodRecord>(STORAGE_KEYS.PAYROLL_PERIODS, id, payload, compSlug)
    const storeUpdated = PrintERPDataStore.updateItem<PayrollPeriodRecord>(STORAGE_KEYS.PAYROLL_PERIODS, id, payload)

    // 2. Best-effort DB update (strip items array so DB update does not fail if column is missing)
    try {
      const { items, ...dbPayload } = payload
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('payroll_periods')
        .update(dbPayload)
        .eq('company_id', companyId)
        .eq('id', id)
        .select()
        .single()

      if (!error && data) {
        if (items && Array.isArray(items) && items.length > 0) {
          try {
            await (admin as any).from('payroll_items').upsert(
              items.map((i) => ({
                ...i,
                payroll_period_id: id,
              })),
              { onConflict: 'id' }
            )
          } catch {}
        }
        const merged = { ...payload, ...data, items: items || storeUpdated?.items || [] }
        return merged as PayrollPeriodRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.updatePayrollPeriod] DB update fallback:', e)
    }

    return storeUpdated
  }

  static async updatePayrollItem(
    id: string,
    companyId: string,
    updates: Partial<PayrollItemRecord>
  ): Promise<PayrollItemRecord | null> {
    const payload = { ...updates, updated_at: new Date().toISOString() }
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    try {
      const admin = createAdminClient()
      await (admin as any)
        .from('payroll_items')
        .update(payload)
        .eq('company_id', companyId)
        .eq('id', id)
    } catch (e) {
      console.warn('[WorkforceRepository.updatePayrollItem] DB fallback:', e)
    }

    // Update inside local store payroll periods across all partitions
    const periods = await this.getPayrollPeriods(companyId)
    let updatedItem: PayrollItemRecord | null = null

    for (const period of periods) {
      const itemIdx = (period.items || []).findIndex((it) => it.id === id)
      if (itemIdx >= 0) {
        updatedItem = { ...period.items[itemIdx], ...payload }
        period.items[itemIdx] = updatedItem

        // Recalculate period totals
        period.total_paid_amount = period.items.reduce((sum, it) => sum + Number(it.paid_amount || 0), 0)
        period.total_due_amount = period.items.reduce((sum, it) => sum + Number(it.due_amount || 0), 0)

        PrintERPDataStore.updateItem<PayrollPeriodRecord>(STORAGE_KEYS.PAYROLL_PERIODS, period.id, period, companyId)
        if (cleanSlug !== companyId) PrintERPDataStore.updateItem<PayrollPeriodRecord>(STORAGE_KEYS.PAYROLL_PERIODS, period.id, period, cleanSlug)
        if (compSlug !== companyId) PrintERPDataStore.updateItem<PayrollPeriodRecord>(STORAGE_KEYS.PAYROLL_PERIODS, period.id, period, compSlug)
        PrintERPDataStore.updateItem<PayrollPeriodRecord>(STORAGE_KEYS.PAYROLL_PERIODS, period.id, period)
        return updatedItem
      }
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
    let dbPayments: SalaryPaymentRecord[] = []
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
        dbPayments = data.map((d: any) => ({
          ...d,
          employee_name: d.employees?.name || 'Staff',
        })) as SalaryPaymentRecord[]
      }
    } catch (e) {
      console.warn('[WorkforceRepository.getSalaryPayments] DB fallback:', e)
    }

    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    const storeScoped1 = PrintERPDataStore.get<SalaryPaymentRecord[]>(STORAGE_KEYS.WF_SALARY_PAYMENTS, companyId) || []
    const storeScoped2 = cleanSlug !== companyId ? (PrintERPDataStore.get<SalaryPaymentRecord[]>(STORAGE_KEYS.WF_SALARY_PAYMENTS, cleanSlug) || []) : []
    const storeScoped3 = compSlug !== companyId ? (PrintERPDataStore.get<SalaryPaymentRecord[]>(STORAGE_KEYS.WF_SALARY_PAYMENTS, compSlug) || []) : []
    const storeGlobal = PrintERPDataStore.get<SalaryPaymentRecord[]>(STORAGE_KEYS.WF_SALARY_PAYMENTS) || []

    const allPayments = [...storeScoped1, ...storeScoped2, ...storeScoped3, ...storeGlobal]

    const filtered = allPayments.filter((p) => {
      if (p.company_id && !isMatchingCompany(p.company_id, companyId)) return false
      if (options?.payrollPeriodId && p.payroll_period_id !== options.payrollPeriodId) return false
      if (options?.employeeId && p.employee_id !== options.employeeId) return false
      return true
    })

    const payMap = new Map<string, SalaryPaymentRecord>()
    for (const p of filtered) {
      if (p.id) payMap.set(p.id, p)
    }
    for (const d of dbPayments) {
      payMap.set(d.id, d)
    }

    return Array.from(payMap.values())
  }

  static async recordSalaryPayment(payment: SalaryPaymentRecord): Promise<SalaryPaymentRecord> {
    const companyId = payment.company_id
    const cleanSlug = companyId.replace(/^comp-/, '').replace(/^co-/, '')
    const compSlug = `comp-${cleanSlug}`

    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('salary_payments')
        .insert(payment)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.WF_SALARY_PAYMENTS, data as SalaryPaymentRecord, companyId)
        if (cleanSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_SALARY_PAYMENTS, data as SalaryPaymentRecord, cleanSlug)
        if (compSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_SALARY_PAYMENTS, data as SalaryPaymentRecord, compSlug)
        PrintERPDataStore.addItem(STORAGE_KEYS.WF_SALARY_PAYMENTS, data as SalaryPaymentRecord)
        return data as SalaryPaymentRecord
      }
    } catch (e) {
      console.warn('[WorkforceRepository.recordSalaryPayment] DB fallback:', e)
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.WF_SALARY_PAYMENTS, payment, companyId)
    if (cleanSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_SALARY_PAYMENTS, payment, cleanSlug)
    if (compSlug !== companyId) PrintERPDataStore.addItem(STORAGE_KEYS.WF_SALARY_PAYMENTS, payment, compSlug)
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
