export type EmployeeType =
  | 'permanent'
  | 'contract'
  | 'daily_labor'
  | 'daily_worker'
  | 'temporary'
  | 'part_time'
  | 'field_worker'

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'leave'
  | 'half_day'
  | 'holiday'

export type LeaveType =
  | 'paid_leave'
  | 'unpaid_leave'
  | 'sick_leave'
  | 'casual_leave'
  | 'other'

export type PayrollStatus = 'draft' | 'processed' | 'locked' | 'disbursed'

export interface ShiftRecord {
  id: string
  company_id: string
  branch_id?: string | null
  shift_code: string
  shift_name: string
  start_time: string // 'HH:mm' e.g. '09:00' or '22:00'
  end_time: string   // 'HH:mm' e.g. '18:00' or '06:00'
  is_overnight: boolean
  grace_period_minutes: number
  break_duration_minutes: number
  working_days: string[]
  overtime_rules: {
    enabled: boolean
    multiplier: number
    min_minutes: number
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmployeeShiftRecord {
  id: string
  company_id: string
  employee_id: string
  shift_id: string
  effective_from: string
  effective_to?: string | null
  is_active: boolean
  created_at: string
}

export interface EmployeeRecord {
  id: string
  company_id: string
  branch_id?: string | null
  user_id?: string | null
  employee_id_number: string
  name: string
  name_bn?: string | null
  mobile: string
  email?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relation?: string | null
  role: string
  responsibilities?: string[]
  department:
    | 'printing'
    | 'finishing'
    | 'fabrication'
    | 'design'
    | 'installation'
    | 'accounts'
    | 'sales'
    | 'management'
    | 'field_ops'
    | string
  employee_type: EmployeeType
  joining_date: string
  salary_type: 'monthly' | 'daily_rate' | 'hourly_rate' | 'contract'
  base_salary: number
  daily_rate: number
  hourly_rate?: number
  overtime_hourly_rate: number
  current_advance_balance: number
  is_daily_worker?: boolean
  bank_payment_info?: {
    bank_name?: string
    account_name?: string
    account_number?: string
    branch_name?: string
    routing_number?: string
  } | null
  mfs_payment_info?: {
    provider?: 'bkash' | 'nagad' | 'rocket' | 'other'
    wallet_number?: string
    account_type?: 'personal' | 'merchant' | 'agent'
  } | null
  status: 'active' | 'on_leave' | 'terminated'
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceRecord {
  id: string
  company_id: string
  employee_id: string
  employee_name: string
  shift_id?: string | null
  job_order_id?: string | null
  attendance_date: string
  status: AttendanceStatus
  leave_type?: LeaveType | null
  check_in_time?: string | null
  check_out_time?: string | null
  late_minutes: number
  overtime_hours: number
  overtime_minutes?: number
  is_overtime_approved?: boolean
  approved_overtime_hours?: number
  workforce_labor_cost?: number
  latitude?: number | null
  longitude?: number | null
  gps_accuracy_meters?: number | null
  distance_from_location_meters?: number | null
  location_name?: string | null
  verification_status?: string | null
  notes?: string | null
  created_at: string
}

export interface SalaryAdvanceRecord {
  id: string
  company_id: string
  advance_voucher_number: string
  employee_id: string
  employee_name: string
  amount: number
  disbursed_date: string
  payment_method: 'cash' | 'bank' | 'bkash'
  reason?: string | null
  is_settled: boolean
  settled_in_payroll_period?: string | null
  created_at: string
}

export interface PayrollItemRecord {
  id: string
  payroll_period_id: string
  employee_id: string
  employee_name: string
  role: string
  department: string
  base_salary: number
  overtime_hours: number
  overtime_amount: number
  allowances: number
  bonuses: number
  gross_salary: number
  advance_salary_deducted: number
  absence_deduction: number
  late_fine: number
  loan_deduction: number
  other_deductions: number
  net_salary: number
  payment_status: 'unpaid' | 'paid'
  created_at: string
}

export interface PayrollPeriodRecord {
  id: string
  company_id: string
  period_name: string
  start_date: string
  end_date: string
  status: PayrollStatus
  total_gross_salary: number
  total_advances_deducted: number
  total_net_salary: number
  approved_by_name?: string | null
  approved_at?: string | null
  items: PayrollItemRecord[]
  created_at: string
}

export interface DailyLaborLogRecord {
  id: string
  company_id: string
  employee_id: string
  employee_name: string
  work_date: string
  assigned_job_number?: string | null
  daily_rate: number
  overtime_hours: number
  total_payout: number
  production_contribution: string
  payment_status: 'unpaid' | 'paid'
  created_at: string
}
