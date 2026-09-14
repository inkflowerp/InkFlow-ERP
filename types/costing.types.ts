export type LaborCostMode =
  | 'fixed_job'
  | 'hourly'
  | 'daily_worker'
  | 'employee_contribution'

export type CostingStatus = 'estimated' | 'in_production' | 'actualized' | 'closed'

export interface CostHeads {
  material_cost: number
  machine_cost: number
  ink_cost: number
  printing_cost: number
  finishing_cost: number
  labor_cost: number
  fabrication_cost: number
  installation_cost: number
  transport_cost: number
  other_cost: number
  total_cost: number
}

export interface CostingSnapshotItem {
  timestamp: string
  version: string
  product_id?: string | null
  product_name?: string | null
  product_sku?: string | null
  variant_id?: string | null
  formula_id?: string | null
  rates: {
    material_rate?: number
    machine_rate?: number
    print_rate?: number
    cutting_rate?: number
    lamination_rate?: number
    finishing_rate?: number
    labor_rate?: number
    transport_rate?: number
    other_rate?: number
  }
  dimensions: {
    width: number
    height: number
    unit: string
    area_sft: number
    perimeter_ft: number
  }
  quantity: number
  waste_factor_percent: number
  applied_margin_percent: number
}

export interface JobCostingRecord {
  id: string
  company_id: string
  branch_id?: string | null
  job_id?: string | null
  job_order_id?: string | null
  sales_order_id?: string | null
  quotation_id?: string | null
  product_id?: string | null
  job_number: string
  customer_id: string
  customer_name: string
  item_title: string
  dimensions_spec?: string | null
  quantity: number
  unit: string
  selling_price: number

  // Pre-Production Estimated
  est: CostHeads & {
    profit: number
    margin_percentage: number
  }

  // Post-Production Actual
  act: CostHeads & {
    profit: number
    margin_percentage: number
  }

  // Variances (Actual - Estimated)
  variances: {
    material_variance: number
    machine_variance: number
    labor_variance: number
    finishing_variance: number
    transport_variance: number
    total_variance: number
  }

  costing_snapshot: Record<string, any>
  labor_cost_mode: LaborCostMode
  status: CostingStatus
  notes?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}
