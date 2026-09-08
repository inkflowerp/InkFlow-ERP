export type MaterialCategory =
  | 'roll_media'
  | 'rigid_sheet'
  | 'metal_framing'
  | 'led_electrical'
  | 'ink_chemistry'
  | 'hardware_accessories'

export type MaterialUnit =
  | 'roll'
  | 'sheet'
  | 'piece'
  | 'meter'
  | 'sft'
  | 'liter'
  | 'kg'

export type InventoryTransactionType =
  | 'purchase'
  | 'consumption'
  | 'adjustment'
  | 'return'
  | 'wastage'
  | 'transfer'
  | 'opening_stock'

export type ValuationMethod =
  | 'last_purchase_price'
  | 'average_cost'
  | 'manual_cost'
  | 'supplier_price'

export interface InventoryRollRecord {
  id: string
  material_id: string
  roll_tag: string
  width_ft: number
  initial_length_ft: number
  initial_area_sft: number
  consumed_area_sft: number
  remaining_area_sft: number
  status: 'in_warehouse' | 'mounted' | 'depleted' | 'scrapped'
  mounted_press_name?: string | null
  created_at: string
}

export interface StockLedgerRecord {
  id: string
  company_id: string
  material_id: string
  material_name: string
  transaction_type: InventoryTransactionType
  quantity_change: number
  unit: MaterialUnit
  balance_after: number
  unit_cost: number
  total_cost: number
  reference_id?: string | null
  notes?: string | null
  performed_by_name: string
  created_at: string
}

export interface MaterialWastageRecord {
  id: string
  company_id: string
  material_id: string
  material_name: string
  job_order_id?: string | null
  expected_usage: number
  actual_usage: number
  wastage_quantity: number
  unit: MaterialUnit
  wastage_reason: string
  estimated_cost: number
  created_at: string
}

export interface MaterialRecord {
  id: string
  company_id: string
  sku: string
  name: string
  name_bn?: string | null
  category: MaterialCategory
  unit: MaterialUnit
  is_roll: boolean
  roll_width_ft?: number | null
  roll_length_ft?: number | null
  total_roll_area_sft?: number | null
  current_stock: number
  min_stock_level: number
  coverage_rate_sft_per_unit?: number | null // e.g. 850 sft/liter (configurable!)
  last_purchase_price: number
  average_cost: number
  manual_cost: number
  valuation_method: ValuationMethod
  location?: string | null
  active_rolls?: InventoryRollRecord[]
  created_at: string
  updated_at: string
}
