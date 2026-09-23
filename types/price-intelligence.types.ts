export type MasterPhysicalClassification =
  | 'roll'       // Large format rolls (Flex, Vinyl, Canvas, Backlit, Banner, Lamination)
  | 'sheet'      // Rigid sheets & offset boards (PVC, Acrylic, ACP, Foam board, Art card, Swedish board)
  | 'liquid'     // Inks, solvents, chemicals, adhesives (Bottles, Cans, Gallons, Liters)
  | 'hardware'   // Display hardware, merchandise, fasteners (X-Stands, Roll-ups, Pop-ups, Frames, Grommets, LEDs)
  | 'box_pack'   // Boxed goods, packaged accessories, bulk packs
  | 'weight'     // Materials bought by weight (KG, ton)
  | 'piece'      // Individual discrete piece items (Eyelets, LED Modules)
  | 'general'    // General physical inventory items

export interface ConfiguredMaterialSize {
  id: string
  label: string
  physical_form: MasterPhysicalClassification
  width_ft?: number
  nominal_width_ft?: number
  allowance_ft?: number
  length_ft?: number
  length_unit?: 'ft' | 'm'
  standard_area_sft?: number
  sheet_size_label?: string
  thickness_mm?: number
  capacity_liters?: number
  pack_quantity?: number
  default_supplier_price?: number
  is_active: boolean
  sku_suffix?: string
}

export interface PriceIntelligenceRecord {
  id: string
  company_id: string
  branch_id?: string | null
  material_id: string
  material_name: string
  material_sku: string
  physical_form: MasterPhysicalClassification
  size_id?: string
  size_label: string
  width_ft?: number
  length_ft?: number
  area_sft?: number
  purchase_unit: string
  supplier_id?: string | null
  supplier_name: string
  supplier_phone?: string | null
  unit_purchase_price: number
  quantity_received: number
  total_amount: number
  normalized_area_sft?: number
  normalized_price_per_sft?: number
  normalized_price_per_linear_ft?: number
  normalized_price_per_unit?: number
  challan_number?: string | null
  supplier_invoice_number?: string | null
  batch_lot_number?: string | null
  location_id?: string | null
  location_name?: string | null
  purchase_date: string
  created_at: string
}

export interface SupplierPriceComparisonItem {
  supplier_id?: string | null
  supplier_name: string
  latest_price: number
  previous_price?: number
  lowest_price: number
  highest_price: number
  average_price: number
  last_purchase_date: string
  last_invoice_number?: string | null
  total_purchases_count: number
  normalized_price_per_sft?: number
}

export interface PriceIntelligenceSummary {
  material_id: string
  material_name: string
  material_sku: string
  physical_form: MasterPhysicalClassification
  size_label: string
  purchase_unit: string
  // Core price metrics
  latest_cost: number
  average_cost: number
  lowest_cost: number
  lowest_supplier_name?: string
  highest_cost: number
  highest_supplier_name?: string
  // Delta & Trend
  price_change_percent: number
  trend: 'up' | 'down' | 'stable'
  previous_cost?: number
  // Normalized unit economics
  normalized_cost_per_sft?: number
  normalized_cost_per_linear_ft?: number
  standard_area_sft?: number
  // History & Supplier breakdown
  history: PriceIntelligenceRecord[]
  supplier_comparison: SupplierPriceComparisonItem[]
  total_records_count: number
}
