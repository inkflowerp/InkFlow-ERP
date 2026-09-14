/**
 * InkFlow V9 — Multi-Branch & Advanced Management Types
 */

export type BranchStatus = 'active' | 'inactive' | 'suspended' | 'archived'

export interface BranchDocumentNumberingConfig {
  invoice_prefix?: string
  quotation_prefix?: string
  challan_prefix?: string
  purchase_order_prefix?: string
  task_prefix?: string
}

export interface BranchFinancialSettings {
  default_cash_account_id?: string
  default_bank_account_id?: string
  default_mfs_account_id?: string
  allow_negative_cash?: boolean
  daily_cash_limit?: number
}

export interface BranchProductionCapability {
  capability: string
  machine_ids?: string[]
  max_capacity_units_per_day?: number
}

export interface BranchMasterRecord {
  id: string
  company_id: string
  name: string
  name_bn?: string | null
  code: string
  legal_name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  division_id?: number | null
  district_id?: number | null
  upazila_id?: number | null
  area?: string | null
  full_address?: string | null
  full_address_bn?: string | null
  is_main: boolean
  is_active: boolean
  status: BranchStatus
  manager_id?: string | null
  manager_name?: string | null
  operating_hours?: string | null
  timezone: string
  document_numbering_config?: BranchDocumentNumberingConfig | null
  financial_settings?: BranchFinancialSettings | null
  production_capabilities?: (string | BranchProductionCapability)[] | null
  contact_person?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  created_at: string
  updated_at: string
}

export type BranchTransferStatus =
  | 'draft'
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'dispatched'
  | 'in_transit'
  | 'received'
  | 'cancelled'

export interface BranchTransferRecord {
  id: string
  company_id: string
  transfer_number: string
  from_branch_id: string
  from_location_id?: string | null
  to_branch_id: string
  to_location_id?: string | null
  material_id: string
  material_name: string
  quantity: number
  unit: string
  status: BranchTransferStatus
  requested_by?: string | null
  requested_by_name?: string | null
  approved_by?: string | null
  approved_by_name?: string | null
  approved_at?: string | null
  dispatched_by?: string | null
  dispatched_by_name?: string | null
  dispatched_at?: string | null
  received_by?: string | null
  received_by_name?: string | null
  received_at?: string | null
  rejection_reason?: string | null
  notes?: string | null
  idempotency_key?: string | null
  created_at: string
  updated_at: string
}

export type InterBranchFinancialTransferStatus =
  | 'draft'
  | 'requested'
  | 'approved'
  | 'completed'
  | 'cancelled'

export interface InterBranchFinancialTransferRecord {
  id: string
  company_id: string
  transfer_number: string
  from_branch_id: string
  to_branch_id: string
  from_account_id?: string | null
  to_account_id?: string | null
  amount: number
  currency: string
  status: InterBranchFinancialTransferStatus
  requested_by?: string | null
  requested_by_name?: string | null
  approved_by?: string | null
  approved_by_name?: string | null
  approved_at?: string | null
  reference?: string | null
  notes?: string | null
  idempotency_key?: string | null
  created_at: string
  updated_at: string
}

export type EmployeeBranchAssignmentStatus = 'active' | 'ended' | 'cancelled'

export interface EmployeeBranchAssignmentRecord {
  id: string
  company_id: string
  employee_id: string
  branch_id: string
  start_date: string
  end_date?: string | null
  is_temporary: boolean
  status: EmployeeBranchAssignmentStatus
  assigned_by?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export type WorkflowType =
  | 'inventory_transfer'
  | 'cross_branch_production'
  | 'financial_transfer'
  | 'procurement_routing'

export interface WorkflowConfigurationRecord {
  id: string
  company_id: string
  branch_id?: string | null
  workflow_type: WorkflowType
  rules: Record<string, unknown>
  is_active: boolean
  updated_by?: string | null
  created_at: string
  updated_at: string
}

export interface UserBranchAccessRecord {
  id: string
  company_id: string
  user_id: string
  branch_id: string
  created_at: string
}

export interface BranchKPIs {
  branch_id: string
  branch_name: string
  branch_code: string
  sales: {
    quotation_count: number
    quotation_value: number
    invoice_count: number
    invoice_value: number
    collection_amount: number
    outstanding_amount: number
  }
  production: {
    queued_tasks: number
    in_progress_tasks: number
    completed_tasks: number
    rework_tasks: number
    machine_utilization_rate: number
  }
  inventory: {
    total_stock_value: number
    low_stock_item_count: number
    pending_inbound_transfers: number
    pending_outbound_transfers: number
  }
  finance: {
    cash_balance: number
    bank_balance: number
    mfs_balance: number
    total_expenses: number
    net_cash_flow: number
  }
  workforce: {
    total_employees: number
    present_today: number
    on_temporary_assignment: number
  }
}

export interface BranchPerformanceMetric {
  branch_id: string
  branch_name: string
  branch_code: string
  revenue: number
  cost_of_goods_sold: number
  gross_profit: number
  gross_margin_percent: number
  operating_expenses: number
  net_profit: number
  net_margin_percent: number
  jobs_count: number
  completed_jobs_count: number
  on_time_delivery_rate: number
  rework_rate: number
}

export interface BranchComparisonData {
  company_id: string
  period: string
  branches: BranchPerformanceMetric[]
  totals: {
    total_revenue: number
    total_cogs: number
    total_gross_profit: number
    average_gross_margin_percent: number
    total_operating_expenses: number
    total_net_profit: number
    total_jobs: number
    total_completed_jobs: number
  }
}

export interface ConsolidatedCompanyDashboardData {
  company_id: string
  company_name: string
  active_branch_count: number
  period: string
  kpis: {
    revenue: number
    gross_profit: number
    net_profit: number
    receivables: number
    payables: number
    inventory_value: number
    active_jobs: number
    employee_count: number
  }
  branch_metrics: BranchPerformanceMetric[]
  recent_transfers: BranchTransferRecord[]
  alerts: {
    low_stock_branches: { branch_name: string; items_count: number }[]
    delayed_production_branches: { branch_name: string; delayed_tasks: number }[]
    negative_margin_jobs: number
  }
}
