export type LaborCostMode =
  | 'fixed_job'
  | 'hourly'
  | 'daily_worker'
  | 'employee_contribution'

export type CostingStatus = 'estimated' | 'in_production' | 'actualized' | 'closed'

export interface CostHeads {
  material_cost: number
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

export interface JobCostingRecord {
  id: string
  company_id: string
  job_id?: string | null
  job_number: string
  customer_id: string
  customer_name: string
  item_title: string
  dimensions_spec?: string | null
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
    labor_variance: number
    transport_variance: number
    total_variance: number
  }

  labor_cost_mode: LaborCostMode
  status: CostingStatus
  notes?: string | null
  created_at: string
  updated_at: string
}
