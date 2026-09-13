// ==============================================================================
// InkFlow SaaS - Machineries & Equipment Fleet Types
// ==============================================================================

export type MachineryType =
  | 'digital_printing'
  | 'offset_printing'
  | 'large_format_printing'
  | 'uv_flatbed'
  | 'eco_solvent'
  | 'sublimation'
  | 'dtf_dtg'
  | 'cutting_plotter'
  | 'laser_cutting'
  | 'cnc_router'
  | 'engraving'
  | 'acrylic_fabrication'
  | 'metal_fabrication'
  | 'welding'
  | 'finishing'
  | 'binding'
  | 'laminating'
  | 'installation'
  | 'other'

export type MachineryCategory =
  | 'printing'
  | 'cutting_cnc'
  | 'fabrication'
  | 'finishing'
  | 'installation'
  | 'other'

export type MachineryDepartment =
  | 'printing'
  | 'finishing'
  | 'fabrication'
  | 'design'
  | 'installation'
  | 'other'

export type MachineryStatus =
  | 'available'
  | 'in_use'
  | 'scheduled'
  | 'maintenance'
  | 'breakdown'
  | 'offline'
  | 'retired'

export type DimensionUnit = 'inch' | 'ft' | 'mm' | 'cm' | 'm'

export interface MachineryRecord {
  id: string
  company_id: string
  branch_id?: string | null
  name: string
  code: string
  machine_type: MachineryType | string
  category: MachineryCategory | string
  brand?: string | null
  model?: string | null
  serial_number?: string | null
  description?: string | null
  photo_url?: string | null
  purchase_date?: string | null
  installation_date?: string | null
  supplier?: string | null
  supplier_id?: string | null
  warranty_expiry?: string | null
  location?: string | null
  department: MachineryDepartment | string
  status: MachineryStatus
  status_notes?: string | null
  status_updated_at?: string | null
  is_archived: boolean

  // Production Specifications
  supported_production_types: string[]
  supported_materials: string[]
  supported_units: string[]
  max_width?: number | null
  max_height?: number | null
  max_length?: number | null
  min_width?: number | null
  min_height?: number | null
  dimension_unit?: DimensionUnit | string
  production_capacity: number
  capacity_unit: string
  estimated_speed: number
  speed_unit: string
  setup_time_mins: number
  changeover_time_mins: number
  default_operator_requirement?: string | null
  operators_required_count: number

  // Cost Information (V4 Costing Readiness)
  purchase_cost: number
  hourly_machine_cost: number
  per_unit_machine_cost: number
  electricity_cost_per_hour: number
  maintenance_cost_per_hour: number
  other_operating_cost_per_hour: number

  // Joined/Aggregated relationships
  current_assignment?: MachineryAssignmentRecord | null
  latest_breakdown?: MachineryBreakdownRecord | null
  next_maintenance?: MachineryMaintenanceRecord | null
  branch?: { id: string; name: string; code: string } | null

  created_at: string
  updated_at: string
}

export type AssignmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface MachineryAssignmentRecord {
  id: string
  company_id: string
  machine_id: string
  job_order_id?: string | null
  production_job_id?: string | null
  operator_id?: string | null
  operator_name?: string | null
  scheduled_start: string
  scheduled_end: string
  actual_start?: string | null
  actual_end?: string | null
  status: AssignmentStatus
  notes?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string

  // Joined relationships
  machine?: MachineryRecord | null
  job_order?: {
    id: string
    job_number: string
    product_name: string
    customer_name: string
    quantity: number
    deadline: string
    status: string
  } | null
  production_job?: {
    id: string
    production_job_number: string
    product_name: string
    customer_name: string
    department: string
    status: string
  } | null
}

export type MaintenanceType =
  | 'preventive'
  | 'corrective'
  | 'emergency'
  | 'inspection'
  | 'cleaning'
  | 'calibration'
  | 'other'

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface MachineryMaintenanceRecord {
  id: string
  company_id: string
  machine_id: string
  maintenance_type: MaintenanceType
  status: MaintenanceStatus
  scheduled_date: string
  start_time?: string | null
  end_time?: string | null
  technician_name?: string | null
  vendor_name?: string | null
  problem_description?: string | null
  work_performed?: string | null
  parts_used?: string | null
  cost: number
  notes?: string | null
  attachment_url?: string | null
  next_maintenance_date?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string

  machine?: MachineryRecord | null
}

export type BreakdownSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ProductionImpact = 'none' | 'minor_delay' | 'job_stalled' | 'facility_halt'
export type BreakdownStatus = 'reported' | 'under_repair' | 'resolved' | 'unrepairable'

export interface MachineryBreakdownRecord {
  id: string
  company_id: string
  machine_id: string
  reported_by_id?: string | null
  reported_by_name: string
  reported_at: string
  problem_title: string
  problem_description: string
  severity: BreakdownSeverity
  production_impact: ProductionImpact
  affected_job_order_id?: string | null
  affected_production_job_id?: string | null
  attachment_url?: string | null
  status: BreakdownStatus
  diagnosis?: string | null
  repair_action?: string | null
  technician_name?: string | null
  parts_replaced?: string | null
  repair_cost: number
  downtime_minutes: number
  resolved_at?: string | null
  resolved_by_name?: string | null
  resolution_notes?: string | null
  created_at: string
  updated_at: string

  machine?: MachineryRecord | null
  affected_job_order?: {
    id: string
    job_number: string
    product_name: string
    customer_name: string
  } | null
}

export interface ConflictCheckResult {
  hasConflict: boolean
  reason?: string
  conflictType?: 'status_invalid' | 'overlapping_assignment' | 'overlapping_maintenance' | 'branch_mismatch'
  conflictingItem?: {
    id: string
    title: string
    start: string
    end: string
    details: string
  }
  suggestions?: string[]
}

export interface MachinerySummaryMetrics {
  totalMachines: number
  available: number
  inUse: number
  scheduled: number
  maintenance: number
  breakdown: number
  offline: number
  retired: number
  totalDowntimeMinutesThisMonth: number
  maintenanceDueCount: number
}

export interface MachineryFilterOptions {
  search?: string
  status?: MachineryStatus | 'all'
  machine_type?: MachineryType | 'all'
  category?: MachineryCategory | 'all'
  department?: MachineryDepartment | 'all'
  branch_id?: string | 'all'
  availabilityOnly?: boolean
  includeArchived?: boolean
}

export interface CreateMachineryInput {
  name: string
  code: string
  machine_type: MachineryType | string
  category?: MachineryCategory | string
  brand?: string | null
  model?: string | null
  serial_number?: string | null
  description?: string | null
  photo_url?: string | null
  purchase_date?: string | null
  installation_date?: string | null
  supplier?: string | null
  supplier_id?: string | null
  warranty_expiry?: string | null
  location?: string | null
  department?: MachineryDepartment | string
  branch_id?: string | null
  
  // Production Specs
  supported_production_types?: string[]
  supported_materials?: string[]
  supported_units?: string[]
  max_width?: number | null
  max_height?: number | null
  max_length?: number | null
  min_width?: number | null
  min_height?: number | null
  dimension_unit?: DimensionUnit | string
  production_capacity?: number
  capacity_unit?: string
  estimated_speed?: number
  speed_unit?: string
  setup_time_mins?: number
  changeover_time_mins?: number
  default_operator_requirement?: string | null
  operators_required_count?: number

  // Cost Specs
  purchase_cost?: number
  hourly_machine_cost?: number
  per_unit_machine_cost?: number
  electricity_cost_per_hour?: number
  maintenance_cost_per_hour?: number
  other_operating_cost_per_hour?: number

  company_id?: string
}

export interface UpdateMachineryInput extends Partial<CreateMachineryInput> {
  status?: MachineryStatus
  status_notes?: string | null
  is_archived?: boolean
}

// Convenient shorthand type aliases
export type Machinery = MachineryRecord
export type MachineryAssignment = MachineryAssignmentRecord
export type MachineryMaintenance = MachineryMaintenanceRecord
export type MachineryBreakdown = MachineryBreakdownRecord

