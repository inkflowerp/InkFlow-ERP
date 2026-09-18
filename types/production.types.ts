export type ProductionDepartment =
  | 'design'
  | 'printing'
  | 'finishing'
  | 'fabrication'
  | 'installation'

export type ProductionJobStatus =
  | 'queued'
  | 'in_progress'
  | 'paused'
  | 'quality_check'
  | 'completed'
  | 'rework'
  | 'rejected'

export type JobPriority = 'normal' | 'urgent' | 'very_urgent'

export type FinishingTask =
  | 'lamination'
  | 'cutting'
  | 'mounting'
  | 'eyelet'
  | 'binding'
  | 'folding'
  | 'other'

export type FabricationTask =
  | 'welding'
  | 'painting'
  | 'frame_making'
  | 'acrylic_work'
  | 'led_installation'

export interface ProductionReworkRecord {
  id: string
  production_job_id: string
  rework_number: string
  reason: string
  responsible_department: ProductionDepartment
  material_wastage: string
  extra_labor_hours: number
  additional_time_hours: number
  estimated_wastage_cost: number
  reported_by_name: string
  status: 'pending' | 'in_rework' | 'resolved'
  created_at: string
}

export interface ProductionJobRecord {
  id: string
  company_id: string
  production_job_number: string
  job_order_id?: string | null
  sales_order_id?: string | null
  customer_name: string
  product_name: string
  department: ProductionDepartment
  stage: string
  status: ProductionJobStatus
  pause_reason?: string | null
  priority: 'normal' | 'urgent' | 'very_urgent'
  deadline: string
  dimensions_spec: string
  quantity: number
  material_spec: string
  artwork_proof_url?: string | null
  production_instructions?: string | null
  assigned_workers: string[]
  finishing_tasks?: FinishingTask[]
  fabrication_tasks?: FabricationTask[]
  has_rework: boolean
  rework_count: number
  reworks?: ProductionReworkRecord[]
  created_at: string
  updated_at: string
}

export interface DepartmentKanbanColumn {
  id: string
  title: string
  titleBn: string
  statusMatch: ProductionJobStatus[]
}

// ==============================================================================
// V2 ADVANCED PRODUCTION PLANNING & SCHEDULING TYPES
// ==============================================================================

export type ProductionTaskStatus =
  | 'queued'
  | 'scheduled'
  | 'ready'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'on_hold'
  | 'rework'
  | 'cancelled'

export type ProductionTaskType =
  | 'prepress'
  | 'printing'
  | 'lamination'
  | 'cutting'
  | 'fabrication'
  | 'finishing'
  | 'mounting'
  | 'installation'
  | 'manual'
  | 'other'

export type TaskPriority = 'low' | 'normal' | 'urgent' | 'very_urgent'

export type HoldReason =
  | 'customer_approval'
  | 'material_unavailable'
  | 'machine_breakdown'
  | 'artwork_issue'
  | 'payment_hold'
  | 'quality_issue'
  | 'other'

export const HOLD_REASON_LABELS: Record<HoldReason, { labelEn: string; labelBn: string }> = {
  customer_approval: { labelEn: 'Customer Approval Pending', labelBn: 'কাস্টমার অনুমোদন অপেক্ষমাণ' },
  material_unavailable: { labelEn: 'Material Out of Stock', labelBn: 'কাঁচামাল ঘাটতি / স্টক নেই' },
  machine_breakdown: { labelEn: 'Machine Breakdown / Repair', labelBn: 'মেশিন নষ্ট / মেরামত চলছে' },
  artwork_issue: { labelEn: 'Artwork / File Defect', labelBn: 'আর্টওয়ার্ক ফাইলে ত্রুটি' },
  payment_hold: { labelEn: 'Payment / Commercial Hold', labelBn: 'বকেয়া বা পেমেন্ট সংক্রান্ত স্থগিতাদেশ' },
  quality_issue: { labelEn: 'Quality Inspection Hold', labelBn: 'মান যাচাই স্থগিতাদেশ' },
  other: { labelEn: 'Other Operational Reason', labelBn: 'অন্যান্য কারণ' },
}

export interface ProductionTaskRecord {
  id: string
  company_id: string
  branch_id?: string | null
  job_order_id: string
  production_job_id?: string | null
  task_number: string
  task_name: string
  task_type: ProductionTaskType
  department: ProductionDepartment
  sequence_order: number
  description?: string | null
  quantity: number
  unit: string
  priority: TaskPriority
  required_machine_type?: string | null
  required_material?: string | null
  width?: number | null
  height?: number | null
  estimated_duration_minutes?: number
  assigned_machine_id?: string | null
  assigned_machine_name?: string | null
  assigned_operator_id?: string | null
  assigned_operator_name?: string | null
  scheduled_start?: string | null
  scheduled_end?: string | null
  actual_start?: string | null
  actual_end?: string | null
  status: ProductionTaskStatus
  hold_reason?: HoldReason | null
  hold_notes?: string | null
  is_rework?: boolean
  rework_parent_task_id?: string | null
  good_quantity?: number
  rejected_quantity?: number
  notes?: string | null
  created_at: string
  updated_at: string

  // Computed/Hydrated fields
  job_number?: string
  customer_name?: string
  product_name?: string
  job_deadline?: string
  is_blocked_by_dependency?: boolean
  blocking_dependency_task_name?: string | null
  is_blocked_by_commercial_gate?: boolean
  commercial_gate_reason?: string | null
  is_blocked_by_design_gate?: boolean
  design_gate_reason?: string | null
  invoice_id?: string | null
  invoice_number?: string | null
}


export interface CreateProductionTaskInput {
  job_order_id: string
  production_job_id?: string | null
  task_name: string
  task_type: ProductionTaskType
  department: ProductionDepartment
  sequence_order?: number
  description?: string | null
  quantity?: number
  unit?: string
  priority?: TaskPriority
  required_machine_type?: string | null
  required_material?: string | null
  width?: number | null
  height?: number | null
  estimated_duration_minutes?: number
  assigned_machine_id?: string | null
  assigned_operator_id?: string | null
  scheduled_start?: string | null
  scheduled_end?: string | null
  branch_id?: string | null
  notes?: string | null
}

export interface UpdateProductionTaskInput {
  task_name?: string
  task_type?: ProductionTaskType
  department?: ProductionDepartment
  sequence_order?: number
  description?: string | null
  quantity?: number
  unit?: string
  priority?: TaskPriority
  required_machine_type?: string | null
  required_material?: string | null
  width?: number | null
  height?: number | null
  estimated_duration_minutes?: number
  assigned_machine_id?: string | null
  assigned_operator_id?: string | null
  scheduled_start?: string | null
  scheduled_end?: string | null
  branch_id?: string | null
  notes?: string | null
}

export interface ScheduleTaskInput {
  task_id: string
  assigned_machine_id?: string | null
  assigned_operator_id?: string | null
  scheduled_start: string
  estimated_duration_minutes: number
  notes?: string | null
}

export interface HoldTaskInput {
  task_id: string
  hold_reason: HoldReason
  hold_notes?: string | null
}

export interface ReworkTaskInput {
  parent_task_id: string
  reason: string
  rework_quantity: number
  scrap_wastage?: string | null
  extra_estimated_minutes?: number
  assigned_machine_id?: string | null
  assigned_operator_id?: string | null
  notes?: string | null
}

export interface MachineQueueItem {
  task_id: string
  task_number: string
  task_name: string
  job_number: string
  customer_name: string
  scheduled_start: string
  scheduled_end: string
  estimated_duration_minutes: number
  operator_name: string
  priority: TaskPriority
  status: ProductionTaskStatus
  is_current: boolean
}

export interface MachineQueueGroup {
  machine_id: string
  machine_name: string
  machine_code: string
  machine_type: string
  department: string
  operating_status: string
  total_scheduled_minutes_today: number
  daily_utilization_percent: number
  now: MachineQueueItem | null
  next: MachineQueueItem | null
  later: MachineQueueItem[]
}

export interface ProductionBoardColumn {
  id: string
  title: string
  titleBn: string
  statuses: ProductionTaskStatus[]
}
