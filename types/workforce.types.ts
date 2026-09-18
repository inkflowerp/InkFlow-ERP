// ==============================================================================
// InkFlow ERP - Authoritative Workforce, Attendance, Overtime & Payroll Types
// Designed for Bangladeshi Print & Signage Shops with permanent, daily & hourly staff
// ==============================================================================

export type EmploymentType =
  | 'permanent'
  | 'contract'
  | 'daily_labor'
  | 'daily_worker'
  | 'hourly_worker'
  | 'temporary'
  | 'part_time'
  | 'field_worker'

export type SalaryBasis = 'monthly' | 'daily_rate' | 'hourly_rate' | 'contract'

export type AttendanceDailyStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'half_day'
  | 'leave'
  | 'holiday'
  | 'off_day'
  | 'field_work'

export type AttendanceSource = 'qr_geo' | 'manual' | 'field_job' | 'biometric' | 'system'

export type OvertimeType = 'regular_day' | 'weekly_off' | 'holiday' | 'night_shift'

export type OvertimeStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'cancelled'

export type SalaryAdvanceStatus = 'draft' | 'pending' | 'approved' | 'disbursed' | 'rejected'

export type PayrollPeriodStatus = 'draft' | 'review' | 'approved' | 'paid' | 'locked'

export type SalaryPaymentStatus = 'unpaid' | 'partial' | 'paid'

export type PaymentMethod = 'cash' | 'bank' | 'bkash' | 'nagad' | 'rocket' | 'other'

export interface SalaryStructure {
  basic: number
  house_allowance: number
  transport_allowance: number
  food_allowance: number
  medical_allowance: number
  other_allowances: number
  bonuses?: number
  commission?: number
}

export interface BankPaymentInfo {
  bank_name?: string
  account_name?: string
  account_number?: string
  branch_name?: string
  routing_number?: string
}

export interface MfsPaymentInfo {
  provider?: 'bkash' | 'nagad' | 'rocket' | 'other'
  wallet_number?: string
  account_type?: 'personal' | 'merchant' | 'agent'
}

export interface EmployeeRecord {
  id: string
  company_id: string
  branch_id?: string | null
  branch_name?: string | null
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
  employee_type: EmploymentType
  salary_basis: SalaryBasis
  joining_date: string
  base_salary: number
  daily_rate: number
  hourly_rate: number
  overtime_hourly_rate: number
  current_advance_balance: number
  is_daily_worker?: boolean
  salary_structure?: SalaryStructure | null
  bank_payment_info?: BankPaymentInfo | null
  mfs_payment_info?: MfsPaymentInfo | null
  status: 'active' | 'on_leave' | 'terminated'
  notes?: string | null
  created_at: string
  updated_at: string
}

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

export interface AttendanceDailySummaryRecord {
  id: string
  company_id: string
  branch_id?: string | null
  branch_name?: string | null
  employee_id: string
  employee_name?: string
  employee_role?: string
  employee_department?: string
  shift_id?: string | null
  shift_name?: string | null
  attendance_date: string
  status: AttendanceDailyStatus
  leave_type?: string | null
  check_in_time?: string | null
  check_out_time?: string | null
  check_in_at?: string | null
  check_out_at?: string | null
  late_minutes: number
  early_leave_minutes: number
  worked_minutes: number
  worked_duration_formatted?: string
  potential_ot_minutes: number
  potential_ot_formatted?: string
  approved_ot_minutes: number
  attendance_source: AttendanceSource
  location_id?: string | null
  location_name?: string | null
  job_order_id?: string | null
  job_order_number?: string | null
  notes?: string | null
  correction_status?: 'pending' | 'approved' | 'rejected' | null
  approved_by_id?: string | null
  approved_by_name?: string | null
  created_at: string
  updated_at: string
}

export interface OvertimeRecord {
  id: string
  company_id: string
  branch_id?: string | null
  employee_id: string
  employee_name?: string
  employee_role?: string
  employee_department?: string
  attendance_id?: string | null
  ot_date: string
  start_time?: string | null
  end_time?: string | null
  duration_minutes: number
  duration_hours: number
  ot_type: OvertimeType
  base_hourly_rate: number
  multiplier: number
  effective_ot_rate: number
  calculated_amount: number
  status: OvertimeStatus
  reason: string
  requested_by_id?: string | null
  requested_by_name: string
  approved_by_id?: string | null
  approved_by_name?: string | null
  approved_at?: string | null
  rejection_reason?: string | null
  payroll_period_id?: string | null
  created_at: string
  updated_at: string
}

export interface SalaryAdvanceRecord {
  id: string
  company_id: string
  branch_id?: string | null
  advance_voucher_number: string
  employee_id: string
  employee_name: string
  amount: number
  deducted_amount: number
  remaining_amount: number
  disbursed_date: string
  payment_method: PaymentMethod
  reason?: string | null
  status: SalaryAdvanceStatus
  approved_by_id?: string | null
  approved_by_name?: string | null
  approved_at?: string | null
  is_settled: boolean
  settled_in_payroll_period?: string | null
  transaction_id?: string | null
  created_at: string
  updated_at: string
}

export interface PayrollItemSnapshot {
  calculated_at: string
  salary_basis: SalaryBasis
  base_rate_used: number
  overtime_rate_used: number
  days_in_month: number
  working_days_count: number
  days_present: number
  hours_worked: number
  earnings: {
    basic: number
    house_allowance: number
    transport_allowance: number
    food_allowance: number
    medical_allowance: number
    other_allowances: number
    overtime_amount: number
    bonuses: number
    commission: number
    gross_earnings: number
  }
  deductions: {
    advance_deducted: number
    advance_balance_before: number
    advance_balance_after: number
    absence_deduction: number
    late_deduction: number
    loan_deduction: number
    other_deductions: number
    total_deductions: number
  }
  net_payable: number
}

export interface PayrollItemRecord {
  id: string
  company_id: string
  payroll_period_id: string
  employee_id: string
  employee_name: string
  employee_name_bn?: string | null
  employee_id_number?: string
  role: string
  department: string
  employee_type: EmploymentType
  salary_basis: SalaryBasis
  base_salary: number
  daily_rate: number
  hourly_rate: number
  days_present: number
  hours_worked: number
  overtime_hours: number
  overtime_amount: number
  allowances_breakdown: SalaryStructure
  bonuses: number
  gross_salary: number
  advance_salary_deducted: number
  advance_remaining_balance: number
  absence_deduction: number
  late_fine: number
  loan_deduction: number
  other_deductions: number
  net_salary: number
  paid_amount: number
  due_amount: number
  payment_status: SalaryPaymentStatus
  snapshot_data?: PayrollItemSnapshot | null
  created_at: string
  updated_at: string
}

export interface PayrollPeriodRecord {
  id: string
  company_id: string
  branch_id?: string | null
  period_name: string // e.g. "September 2026"
  start_date: string
  end_date: string
  working_days_count: number
  status: PayrollPeriodStatus
  total_gross_salary: number
  total_ot_amount: number
  total_advances_deducted: number
  total_other_deductions: number
  total_net_salary: number
  total_paid_amount: number
  total_due_amount: number
  approved_by_id?: string | null
  approved_by_name?: string | null
  approved_at?: string | null
  locked_at?: string | null
  notes?: string | null
  items: PayrollItemRecord[]
  created_at: string
  updated_at: string
}

export interface SalaryPaymentRecord {
  id: string
  company_id: string
  branch_id?: string | null
  payment_voucher_number: string
  payroll_period_id: string
  payroll_item_id: string
  employee_id: string
  employee_name?: string
  payment_date: string
  amount: number
  payment_method: PaymentMethod
  reference_number?: string | null
  notes?: string | null
  paid_by_id?: string | null
  paid_by_name: string
  transaction_id?: string | null
  created_at: string
}

export interface WorkforceAuditLogRecord {
  id: string
  company_id: string
  actor_id?: string | null
  actor_name: string
  action_type:
    | 'employee_created'
    | 'employee_updated'
    | 'employee_status_changed'
    | 'attendance_created'
    | 'attendance_corrected'
    | 'attendance_approved'
    | 'overtime_requested'
    | 'overtime_approved'
    | 'overtime_rejected'
    | 'salary_advance_requested'
    | 'salary_advance_disbursed'
    | 'salary_advance_settled'
    | 'payroll_generated'
    | 'payroll_reviewed'
    | 'payroll_approved'
    | 'payroll_locked'
    | 'salary_payment_recorded'
    | 'salary_adjusted'
  entity_type: 'employee' | 'attendance' | 'overtime' | 'advance' | 'payroll' | 'payment'
  entity_id?: string | null
  before_state?: Record<string, any> | null
  after_state?: Record<string, any> | null
  reason?: string | null
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
}

export interface WorkforceSummaryKPIs {
  todayAttendance: {
    totalEmployees: number
    present: number
    late: number
    absent: number
    onLeave: number
    fieldWork: number
    currentlyWorking: number
    potentialOtMinutes: number
    potentialOtHours: number
  }
  monthFinancials: {
    periodName: string
    grossPayroll: number
    approvedOtAmount: number
    pendingOtAmount: number
    advancesOutstanding: number
    advancesDisbursedThisMonth: number
    unpaidSalaryDue: number
    totalActiveStaff: number
  }
}
