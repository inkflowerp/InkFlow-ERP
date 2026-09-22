export type MaterialCategory =
  | 'roll_media'
  | 'rigid_sheet'
  | 'metal_framing'
  | 'led_electrical'
  | 'ink_chemistry'
  | 'hardware_accessories'
  | 'flex'
  | 'vinyl'
  | 'sticker_paper'
  | 'pvc'
  | 'acrylic'
  | 'acp'
  | 'foam_board'
  | 'paper'
  | 'fabric'
  | 'ink'
  | 'lamination_film'
  | 'led'
  | 'channel_letter'
  | 'metal'
  | 'wood'
  | 'adhesive'
  | 'packaging'
  | 'other'
  | string

export type MaterialUnit =
  | 'pcs'
  | 'sheet'
  | 'roll'
  | 'meter'
  | 'square_meter'
  | 'feet'
  | 'square_feet'
  | 'sft'
  | 'kg'
  | 'gram'
  | 'liter'
  | 'ml'
  | 'box'
  | 'packet'
  | 'set'
  | 'pair'
  | string

export type StockState =
  | 'available'
  | 'reserved'
  | 'issued'
  | 'consumed'
  | 'wastage'
  | 'remnant'
  | 'damaged'

export type InventoryTransactionType =
  | 'RECEIPT'
  | 'PURCHASE_RECEIPT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'RESERVATION'
  | 'RELEASE'
  | 'ISSUE'
  | 'RETURN'
  | 'CONSUMPTION'
  | 'WASTAGE'
  | 'REMNANT'
  | 'DAMAGE'
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

export type LocationType =
  | 'main_store'
  | 'raw_material_store'
  | 'ink_store'
  | 'finished_goods'
  | 'production_floor'
  | 'scrap_area'
  | 'remnant_rack'
  | 'branch_store'
  | 'other'

export interface InventoryLocationRecord {
  id: string
  company_id: string
  branch_id?: string | null
  location_code: string
  location_name: string
  location_type: LocationType
  description?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InventoryStockBalanceRecord {
  id: string
  company_id: string
  branch_id?: string | null
  material_id: string
  location_id: string
  available_quantity: number
  reserved_quantity: number
  issued_quantity: number
  unit: MaterialUnit
  updated_at: string
  material?: Partial<MaterialRecord>
  location?: Partial<InventoryLocationRecord>
}

export interface InventoryRollRecord {
  id: string
  company_id?: string
  branch_id?: string | null
  location_id?: string | null
  material_id: string
  roll_code?: string
  roll_tag: string
  width_ft: number
  initial_length_ft: number
  current_length_ft?: number
  original_length_ft?: number
  remaining_length_ft?: number
  initial_area_sft: number
  consumed_area_sft: number
  remaining_area_sft: number
  current_area_sft?: number
  is_remnant?: boolean
  status: 'available' | 'reserved' | 'mounted' | 'in_use' | 'depleted' | 'scrapped' | 'in_warehouse' | 'remnant'
  mounted_press_name?: string | null
  mounted_machine_id?: string | null
  mounted_machine_name?: string | null
  mounted_at?: string | null
  mounted_by_name?: string | null
  location_name?: string
  unit_cost?: number
  total_cost?: number
  purchase_order_id?: string | null
  grn_id?: string | null
  supplier_id?: string | null
  batch_lot_number?: string | null
  notes?: string | null
  material?: Partial<MaterialRecord>
  created_at: string
  updated_at?: string
}

export interface RollFeedCalculationInput {
  roll_width_ft: number
  roll_current_length_ft?: number
  roll_available_length_ft?: number
  job_width_ft: number
  job_length_ft: number
  quantity?: number
  orientation?: 'auto' | 'normal' | 'rotated'
  bleed_allowance_in?: number
  bleed_allowance_inches?: number
  wastage_length_ft?: number
  wastage_reason?: string | null
}

export interface RollFeedCalculationResult {
  orientation: 'normal' | 'rotated'
  fits_on_roll: boolean
  is_fit_across_width: boolean
  linear_feed_per_unit_ft: number
  job_linear_feed_ft: number
  linear_feed_ft: number
  bleed_allowance_ft: number
  wastage_length_ft: number
  wastage_reason?: string | null
  wastage_area_sft: number
  total_deducted_length_ft: number
  total_linear_deduction_ft: number
  remaining_roll_length_ft: number
  new_remaining_length_ft: number
  has_shortage: boolean
  is_shortage: boolean
  shortage_length_ft: number
  shortage_amount_ft: number
  utilized_width_ft: number
  side_margin_loss_ft: number
  total_utilized_area_sft: number
  total_deducted_area_sft: number
  roll_current_length_ft: number
}

export interface IssueMasterRollParams {
  material_id: string
  width_ft: number
  length_ft?: number
  quantity_rolls?: number
  location_id?: string | null
  destination?: 'machine' | 'floor_staging'
  machine_id?: string | null
  machine_name?: string | null
  lot_number?: string | null
  roll_code_custom?: string | null
  notes?: string | null
  operator_name?: string
  unit_cost?: number
  company_id?: string
  branch_id?: string | null
  actor_email?: string
}

export interface IssueMasterRollResult {
  roll: InventoryRollRecord
  rolls: InventoryRollRecord[]
  total_area_sft: number
  total_valuation: number
  quantity_issued: number
}


export interface StockLedgerRecord {
  id: string
  company_id: string
  branch_id?: string | null
  material_id: string
  material_name?: string
  location_id?: string | null
  transaction_type: InventoryTransactionType
  quantity_change: number
  unit: MaterialUnit
  normalized_quantity?: number | null
  normalized_unit?: string | null
  balance_after: number
  unit_cost: number
  total_cost: number
  reference_type?: string | null
  reference_id?: string | null
  production_task_id?: string | null
  notes?: string | null
  performed_by_id?: string | null
  performed_by_name: string
  created_at: string
  material?: { name: string; sku: string }
  location?: { location_name: string; location_code: string }
}

export interface MaterialWastageRecord {
  id: string
  company_id: string
  material_id: string
  material_name?: string
  job_order_id?: string | null
  production_task_id?: string | null
  expected_usage?: number
  actual_usage?: number
  wastage_quantity: number
  unit: MaterialUnit
  wastage_reason: string
  estimated_cost?: number
  created_at: string
}

export interface MaterialRecord {
  id: string
  company_id: string
  branch_id?: string | null
  sku: string
  name: string
  name_bn?: string | null
  category: MaterialCategory
  material_type?: string | null
  description?: string | null
  brand?: string | null
  specification?: string | null
  color?: string | null
  thickness?: string | null
  width?: number | null
  length?: number | null
  dimension_unit?: string | null
  available_widths_ft?: number[]
  standard_roll_length_ft?: number
  default_allowance_per_side_in?: number
  unit: MaterialUnit
  purchase_unit?: string | null
  master_purchase_unit?: string | null
  base_unit?: string | null
  conversion_factor?: number
  is_roll: boolean
  roll_width_ft?: number | null
  roll_length_ft?: number | null
  total_roll_area_sft?: number | null
  current_stock: number
  min_stock_level: number
  reorder_level?: number
  coverage_rate_sft_per_unit?: number | null
  cost_per_unit?: number
  average_cost?: number
  last_purchase_price?: number
  manual_cost?: number
  valuation_method?: ValuationMethod
  preferred_supplier_id?: string | null
  location?: string | null
  is_active?: boolean
  notes?: string | null
  active_rolls?: InventoryRollRecord[]
  variants?: any[]
  available_sheet_sizes?: string[] | any[]
  roll_sizes?: any[]
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface TaskMaterialRequirementRecord {
  id: string
  company_id: string
  production_task_id: string
  material_id: string
  estimated_quantity: number
  unit: MaterialUnit
  notes?: string | null
  created_at: string
  material?: Partial<MaterialRecord>
}

export type MaterialRequestStatus =
  | 'draft'
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'partially_issued'
  | 'issued'
  | 'cancelled'

export type MaterialRequestPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface MaterialRequestItemRecord {
  id: string
  request_id: string
  material_id: string
  requested_quantity: number
  issued_quantity: number
  unit: MaterialUnit
  notes?: string | null
  material?: Partial<MaterialRecord>
}

export interface MaterialRequestRecord {
  id: string
  company_id: string
  branch_id?: string | null
  request_number: string
  production_task_id?: string | null
  destination_location_id?: string | null
  source_location_id?: string | null
  status: MaterialRequestStatus
  priority: MaterialRequestPriority
  requested_by_id?: string | null
  requested_by_name: string
  approved_by_id?: string | null
  approved_by_name?: string | null
  rejection_reason?: string | null
  notes?: string | null
  items?: MaterialRequestItemRecord[]
  production_task?: { id: string; title: string; task_code?: string; status: string }
  created_at: string
  updated_at: string
}

export interface MaterialIssueItemRecord {
  id: string
  issue_id: string
  request_item_id?: string | null
  material_id: string
  material_name?: string
  issued_quantity: number
  consumed_quantity?: number
  returned_quantity?: number
  wastage_quantity?: number
  wastage_reason?: string | null
  remaining_floor_balance?: number
  unit: MaterialUnit
  unit_cost?: number
  total_cost?: number
  roll_id?: string | null
  roll_code?: string | null
  machine_id?: string | null
  machine_name?: string | null
  job_reference?: string | null
  status?: 'on_floor' | 'partially_consumed' | 'fully_consumed' | 'returned'
  last_consumption_at?: string | null
  material?: Partial<MaterialRecord>
}

export interface MaterialIssueRecord {
  id: string
  company_id: string
  branch_id?: string | null
  issue_number: string
  request_id?: string | null
  production_task_id?: string | null
  source_location_id: string
  destination_location_id?: string | null
  issued_by_id?: string | null
  issued_by_name: string
  received_by_name?: string | null
  assigned_machine?: string | null
  job_reference?: string | null
  status: 'completed' | 'cancelled' | 'in_use' | 'closed'
  notes?: string | null
  items?: MaterialIssueItemRecord[]
  created_at: string
}

export interface FloorConsumptionRecord {
  id: string
  company_id: string
  branch_id?: string | null
  issue_id?: string | null
  issue_number?: string | null
  issue_item_id?: string | null
  material_id: string
  material_name: string
  sku?: string | null
  roll_id?: string | null
  roll_code?: string | null
  machine_id?: string | null
  machine_name?: string | null
  job_order_id?: string | null
  job_reference?: string | null
  production_task_id?: string | null
  operator_id?: string | null
  operator_name: string
  issued_quantity: number
  consumed_quantity: number
  unit: MaterialUnit
  unit_cost: number
  total_cost: number
  wastage_quantity: number
  wastage_reason?: string | null
  wastage_cost: number
  returned_quantity: number
  return_location_id?: string | null
  return_location_name?: string | null
  remnants_count: number
  remnants_area_sft?: number
  remaining_floor_balance: number
  status: 'on_floor' | 'partially_consumed' | 'fully_consumed' | 'returned'
  notes?: string | null
  created_at: string
  updated_at: string
  material?: Partial<MaterialRecord>
  location?: Partial<InventoryLocationRecord>
}

export interface InventoryRemnantRecord {
  id: string
  company_id: string
  branch_id?: string | null
  remnant_code: string
  parent_material_id: string
  production_task_id?: string | null
  issue_item_id?: string | null
  location_id: string
  width: number
  length: number
  dimension_unit: string
  area_sft?: number | null
  quantity: number
  unit: MaterialUnit
  condition: 'excellent' | 'usable' | 'minor_defect'
  status: 'available' | 'reserved' | 'consumed' | 'scrapped'
  notes?: string | null
  created_by_name: string
  created_at: string
  updated_at: string
  parent_material?: Partial<MaterialRecord>
  location?: Partial<InventoryLocationRecord>
}

export interface InventoryTransferRecord {
  id: string
  company_id: string
  transfer_number: string
  source_branch_id?: string | null
  source_location_id: string
  destination_branch_id?: string | null
  destination_location_id: string
  material_id: string
  quantity: number
  unit: MaterialUnit
  status: 'completed' | 'cancelled'
  transferred_by_name: string
  reason?: string | null
  created_at: string
  material?: Partial<MaterialRecord>
  source_location?: Partial<InventoryLocationRecord>
  destination_location?: Partial<InventoryLocationRecord>
}

export interface InventoryAdjustmentRecord {
  id: string
  company_id: string
  branch_id?: string | null
  adjustment_number: string
  location_id: string
  material_id: string
  adjustment_type: 'physical_count' | 'damage_discovered' | 'data_correction' | 'opening_balance' | 'other'
  previous_quantity: number
  new_quantity: number
  variance_quantity: number
  unit: MaterialUnit
  reason: string
  authorized_by_name: string
  created_at: string
  material?: Partial<MaterialRecord>
  location?: Partial<InventoryLocationRecord>
}

export interface InventorySummaryStats {
  totalMaterials: number
  totalAvailableStockValue: number
  lowStockCount: number
  pendingRequestsCount: number
  totalRemnantsCount: number
  totalWastageRecordsCount: number
}


