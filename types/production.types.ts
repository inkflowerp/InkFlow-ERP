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
