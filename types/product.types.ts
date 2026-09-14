export type ProductType =
  | 'PRODUCT'
  | 'SERVICE'
  | 'finished_product'
  | 'print_service'
  | 'fabrication_service'
  | 'installation_service'
  | 'custom_job'
  | 'material'

export type UnitOfMeasure =
  | 'pcs'
  | 'sft'
  | 'inch'
  | 'ft'
  | 'sqm'
  | 'sheet'
  | 'roll'
  | 'kg'
  | 'ltr'
  | 'hr'
  | 'meter'
  | 'box'
  | 'packet'
  | 'set'
  | 'pair'
  | string

export type PricingComponentKey =
  | 'material'
  | 'machine'
  | 'printing'
  | 'cutting'
  | 'lamination'
  | 'finishing'
  | 'fabrication'
  | 'labor'
  | 'installation'
  | 'transport'
  | 'other'

export interface FormulaMaterialRequirement {
  material_id?: string | null
  material_sku?: string | null
  material_name?: string | null
  unit: string
  quantity_formula: string // e.g. "area_sft * 1.05" or "quantity * 1"
  unit_cost?: number
  waste_factor_percent?: number
}

export interface FormulaMachineOperation {
  machine_id?: string | null
  machine_type?: string | null
  machine_name?: string | null
  duration_formula_minutes: string // e.g. "area_sft / 2.5 + 5"
  hourly_rate?: number
}

export interface FormulaLaborOperation {
  department?: string | null
  role_name?: string | null
  duration_formula_minutes: string // e.g. "quantity * 15"
  hourly_rate?: number
}

export interface FormulaFinishingOperation {
  finishing_type: string
  rate_model: 'fixed' | 'per_unit' | 'per_sqft' | 'per_perimeter_ft' | 'per_hour'
  rate: number
  is_optional?: boolean
}

export interface FormulaOtherCost {
  cost_head: string
  amount: number
  is_variable?: boolean
}

export interface ProductFormulaRecord {
  id: string
  company_id: string
  product_id: string
  formula_name: string
  version: number
  model: 'dimensional_area' | 'running_length' | 'unit_quantity' | 'compound_signage' | 'custom_formula'
  waste_factor_percent: number
  material_requirements: FormulaMaterialRequirement[]
  machine_operations: FormulaMachineOperation[]
  labor_operations: FormulaLaborOperation[]
  finishing_operations: FormulaFinishingOperation[]
  other_costs: FormulaOtherCost[]
  target_margin_percent: number
  min_margin_percent: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductVariantRecord {
  id: string
  company_id: string
  product_id: string
  variant_name: string
  sku_suffix?: string | null
  thickness_mm?: number | null
  gsm?: number | null
  finish?: string | null
  color?: string | null
  size_spec?: string | null
  cost_adjustment: number
  price_adjustment: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PriceListTier = 'retail' | 'wholesale' | 'dealer' | 'corporate' | 'vip' | 'custom'

export interface PriceListRecord {
  id: string
  company_id: string
  name: string
  code: string
  tier_type: PriceListTier
  description?: string | null
  default_markup_percent: number
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PriceListItemRecord {
  id: string
  company_id: string
  price_list_id: string
  product_id: string
  custom_rate?: number | null
  discount_percent: number
  created_at: string
  updated_at: string
}

export interface PricingFormulaConfig {
  model?: 'dimensional_area' | 'running_length' | 'unit_quantity' | 'compound_signage' | 'custom_formula'
  base_rate?: number
  min_area_sft?: number
  waste_factor_percent?: number
  material_rate?: number
  machine_rate?: number
  print_rate?: number
  cutting_rate?: number
  lamination_rate?: number
  finishing_rate?: number
  fabrication_rate?: number
  labor_rate?: number
  installation_rate?: number
  transport_rate?: number
  other_rate?: number
  default_margin_percent?: number
  min_margin_percent?: number
  material_requirements?: FormulaMaterialRequirement[]
  machine_operations?: FormulaMachineOperation[]
  labor_operations?: FormulaLaborOperation[]
  finishing_operations?: FormulaFinishingOperation[]
}

export interface PricingCalculationInput {
  width: number
  height: number
  dimensionUnit: 'ft' | 'inch' | 'm'
  quantity: number
  variantId?: string | null
  priceListId?: string | null
  includeLamination?: boolean
  includeCutting?: boolean
  includeFinishing?: boolean
  includeFabrication?: boolean
  includeInstallation?: boolean
  includeTransport?: boolean
  customMaterialRate?: number
  customMachineRate?: number
  customLaborRate?: number
  customTransportRate?: number
  discountPercent?: number
  discountFlat?: number
  vatRatePercent?: number
}

export interface PricingCalculationOutput {
  areaSft: number
  perimeterFt: number
  quantity: number
  plannedWasteSft: number
  componentBreakdown: {
    material: number
    machine: number
    printing: number
    cutting: number
    lamination: number
    finishing: number
    fabrication: number
    labor: number
    installation: number
    transport: number
    other: number
  }
  totalBaseCost: number
  suggestedSellingPrice: number
  grossProfitAmount: number
  grossProfitMarginPercent: number
  subtotalBeforeDiscount: number
  discountAmount: number
  subtotalAfterDiscount: number
  vatRatePercent: number
  vatAmount: number
  grandTotalBDT: number
  unitPriceBDT: number
  isBelowMinimum: boolean
  minAllowedPriceBDT: number
  costingSnapshot: Record<string, any>
}

export interface ProductRecord {
  id: string
  company_id: string
  branch_id?: string | null
  name: string
  name_bn?: string | null
  sku: string
  category: string
  product_type: ProductType
  unit: UnitOfMeasure
  material_spec?: string | null
  description?: string | null
  description_bn?: string | null
  dimensions_spec?: string | null
  base_cost: number
  selling_price: number
  min_price: number
  tax_rate: number
  pricing_formula?: PricingFormulaConfig | null
  variants?: ProductVariantRecord[]
  formulas?: ProductFormulaRecord[]
  is_active: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface PriceHistoryRecord {
  id: string
  company_id: string
  product_id: string
  old_price: number
  new_price: number
  reason: string
  changed_by_name?: string
  created_at: string
}

export interface PriceOverrideRecord {
  id: string
  company_id: string
  product_id?: string | null
  document_type?: 'quotation' | 'order' | 'invoice' | null
  document_code?: string | null
  original_price: number
  override_price: number
  reason: string
  authorized_by_name?: string
  created_at: string
}
