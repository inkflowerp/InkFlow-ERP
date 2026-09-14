// ==============================================================================
// InkFlow ERP - Phase 24: V8 Mobile Operations Types
// Mobile Home, Task Terminal, Attendance Punch & Operational Hub
// ==============================================================================

export type MobileTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type MobileTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'HOLD' | 'COMPLETED' | 'CANCELLED'

export interface MobileTaskItem {
  id: string
  company_id: string
  branch_id?: string | null
  job_order_id?: string | null
  job_order_number?: string | null
  title: string
  customer_name?: string | null
  task_type: string
  priority: MobileTaskPriority
  status: MobileTaskStatus
  assigned_user_id?: string | null
  assigned_user_name?: string | null
  machine_id?: string | null
  machine_name?: string | null
  due_date?: string | null
  notes?: string | null
  materials_required?: Array<{
    material_id: string
    material_name: string
    quantity: number
    unit: string
  }>
  created_at: string
  updated_at: string
}

export interface MobileTodaySummary {
  date: string
  pending_tasks_count: number
  in_progress_tasks_count: number
  designs_awaiting_approval_count: number
  active_production_jobs_count: number
  scheduled_deliveries_count: number
  overdue_invoices_count: number
  total_due_amount: number
  low_stock_alerts_count: number
  unread_notifications_count: number
  attendance_status: {
    is_checked_in: boolean
    check_in_time?: string | null
    shift_name?: string | null
  }
}

export interface MobileAttendancePunchPayload {
  idempotency_key: string
  employee_id: string
  punch_type: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END'
  timestamp: string
  latitude?: number | null
  longitude?: number | null
  accuracy_meters?: number | null
  qr_code?: string | null
  notes?: string | null
  device_id: string
}
