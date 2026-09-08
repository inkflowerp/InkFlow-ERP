export type ProductType =
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

export type PricingComponentKey =
  | 'material'
  | 'printing'
  | 'cutting'
  | 'lamination'
  | 'finishing'
  | 'fabrication'
  | 'labor'
  | 'installation'
  | 'transport'
  | 'other'

export interface PricingFormulaConfig {
  model: 'dimensional_area' | 'running_length' | 'unit_quantity' | 'compound_signage'
  min_area_sft?: number
  material_rate?: number
  print_rate?: number
  cutting_rate?: number
  lamination_rate?: number
  finishing_rate?: number
  fabrication_rate?: number
  labor_rate?: number
  installation_rate?: number
  transport_rate?: number
  default_margin_percent?: number
}

export interface PricingCalculationInput {
  width: number
  height: number
  dimensionUnit: 'ft' | 'inch' | 'm'
  quantity: number
  includeLamination?: boolean
  includeCutting?: boolean
  includeFinishing?: boolean
  includeFabrication?: boolean
  includeInstallation?: boolean
  includeTransport?: boolean
  discountPercent?: number
  discountFlat?: number
  vatRatePercent?: number
}

export interface PricingCalculationOutput {
  areaSft: number
  perimeterFt: number
  quantity: number
  componentBreakdown: {
    material: number
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
}

export interface ProductRecord {
  id: string
  company_id: string
  name: string
  name_bn?: string | null
  sku: string
  category: string
  product_type: ProductType
  unit: UnitOfMeasure
  material_spec?: string | null
  description?: string | null
  base_cost: number
  selling_price: number
  min_price: number
  tax_rate: number
  pricing_formula?: PricingFormulaConfig | null
  is_active: boolean
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
