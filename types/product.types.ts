export type ProductType =
  | 'PRODUCT'
  | 'SERVICE'
  | 'finished_product'
  | 'print_service'
  | 'fabrication_service'
  | 'installation_service'
  | 'custom_job'
  | 'material'
  | 'ready_product'
  | 'production_product'
  | 'service'
  | 'finishing'
  | 'additional'
  | 'fabrication'
  | 'installation'
  | 'delivery'
  | 'package_bundle'

export type CommercialProductType =
  | 'ready_product'
  | 'production_product'
  | 'service'
  | 'finishing'
  | 'additional'
  | 'fabrication'
  | 'installation'
  | 'delivery'
  | 'package_bundle'
  | 'material'
  | 'package'

export type MeasurementType =
  | 'piece'
  | 'length'
  | 'area'
  | 'weight'
  | 'volume'
  | 'job'
  | 'time'

export type UnitOfMeasure =
  | 'pcs'
  | 'sft'
  | 'sqft'
  | 'rft'
  | 'inch'
  | 'ft'
  | 'sqm'
  | 'meter'
  | 'sheet'
  | 'roll'
  | 'kg'
  | 'ltr'
  | 'liter'
  | 'ml'
  | 'hr'
  | 'hour'
  | 'set'
  | 'box'
  | 'pack'
  | 'packet'
  | 'pair'
  | 'job'
  | 'trip'
  | string

export type PricingMethod =
  | 'fixed'
  | 'per_piece'
  | 'per_area'
  | 'per_length'
  | 'per_weight'
  | 'per_volume'
  | 'per_job'
  | 'per_hour'
  | 'tiered'
  | 'formula'
  | 'per_sft'
  | 'per_rft'
  | 'per_inch'
  | 'per_meter'
  | 'per_sheet'
  | 'per_roll'
  | 'per_kg'
  | 'per_liter'
  | 'dimensional_area'
  | 'running_length'
  | 'compound_signage'
  | 'custom_formula'

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

export type PriceListTier = 'retail' | 'wholesale' | 'agency' | 'dealer' | 'corporate' | 'vip' | 'custom'

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
  model?: 'dimensional_area' | 'running_length' | 'unit_quantity' | 'compound_signage' | 'custom_formula' | PricingMethod
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

export interface ProductUsageStats {
  quotationCount: number
  invoiceCount: number
  jobCount: number
  totalRevenueBDT: number
  lastSoldDate?: string | null
  isReferenced: boolean
}

export type PriceTierKey = 'retail' | 'corporate' | 'dealer' | 'wholesale' | 'custom'
export type ProductPriceTiers = Partial<Record<PriceTierKey, number>>

export interface ProductSupplierPriceRecord {
  id: string
  company_id: string
  product_id: string
  supplier_id?: string | null
  supplier_name: string
  purchase_unit: string
  conversion_ratio: number
  purchase_price: number
  moq: number
  lead_time_days: number
  last_purchase_date?: string | null
  is_preferred: boolean
  notes?: string | null
  created_at: string
  updated_at: string
}

export type ProductionRole =
  | 'hardware'
  | 'print'
  | 'finishing'
  | 'assembly'
  | 'structure'
  | 'electrical'
  | 'mounting'
  | 'labor'
  | 'delivery'
  | 'material'
  | 'raw_material'
  | 'accessory'
  | 'packaging'
  | 'installation'
  | 'other'

export interface ProductComponent {
  id?: string
  component_product_id?: string | null
  name?: string
  component_name?: string
  quantity?: number
  unit?: string
  waste_percent?: number
  is_optional?: boolean
  is_required?: boolean
  cost_contribution?: number
  unit_cost?: number
  production_role?: ProductionRole | string
  notes?: string | null
}

export interface ProductCostBreakdown {
  material_cost?: number
  ink_cost?: number
  machine_cost?: number
  labor_cost?: number
  finishing_cost?: number
  fabrication_cost?: number
  installation_cost?: number
  delivery_cost?: number
  other_direct_cost?: number
  total_direct_cost?: number
  // Shorthand aliases
  material?: number
  ink?: number
  machine?: number
  labor?: number
  finishing?: number
  fabrication?: number
  installation?: number
  delivery?: number
  other_direct?: number
  [key: string]: number | undefined
}

export type CostBasisType = 'material_cost' | 'direct_cost' | 'none' | 'material'

export interface CommercialCalculationParams {
  pricingMethod?: PricingMethod
  unitPrice: number
  quantity: number
  width?: number
  height?: number
  dimensionUnit?: 'ft' | 'inch' | 'm'
  widthAllowance?: number
  heightAllowance?: number
  lengthAllowance?: number
  productionWidthAllowance?: number
  productionLengthAllowance?: number
  allowanceUnit?: 'ft' | 'inch' | 'mm' | 'cm' | 'm' | string
  minBillableQuantity?: number
  minOrderQuantity?: number
  minimumCharge?: number
  costBreakdown?: ProductCostBreakdown
  materialUnitCost?: number
  defaultWastagePercent?: number
  targetMarginPercent?: number
  minAllowedMarginPercent?: number
  isTaxInclusive?: boolean
  vatRatePercent?: number
}

export interface CommercialCalculationResult {
  pricingMethod: PricingMethod
  actualQuantity: number
  billableQuantity: number
  isMinBillableApplied: boolean
  unitPrice: number
  calculatedAmount: number
  minimumCharge: number
  isMinimumChargeApplied: boolean
  finalAmount: number
  minOrderQuantity: number
  isMoqViolated: boolean
  moqDeficit: number
  // Dimensions & Area
  areaSqft?: number
  lengthRft?: number
  sellingWidth?: number
  sellingHeight?: number
  productionWidth?: number
  productionHeight?: number
  widthAllowance?: number
  heightAllowance?: number
  singleAreaSqft?: number
  singleProductionAreaSqft?: number
  productionAreaSqft?: number
  physicalConsumptionSqft?: number
  // Costing & Margins
  estimatedMaterialCost: number
  estimatedDirectCost: number
  costBasisType: CostBasisType
  costBasisAmount: number
  grossProfitAmount: number
  grossMarginPercent: number
  markupPercent: number
  suggestedSellingPrice: number
  minAllowedMarginPercent: number
  isBelowMinimumMargin: boolean
  marginDeficitPercent: number
  // Taxes
  vatRatePercent: number
  vatAmount: number
  grandTotalWithVat: number
}

export interface ResolvedProductPrice {
  productId: string
  productName: string
  sku: string
  unit: string
  sellingPrice: number
  effectiveRate: number
  minPrice: number
  baseCost: number
  source: 'custom' | 'price_list' | 'customer_tier' | 'last_invoice' | 'default'
  sourceLabel: string
  sourceDetails?: string
  priceListCode?: string | null
  isBelowMinimum?: boolean
  isFloorEnforced?: boolean
  originalRequestedRate?: number
  overrideReason?: string
  authorizedBy?: string
  // Commercial Master 2.0 & 2.1 fields
  pricingMethod?: PricingMethod
  minBillableQuantity?: number
  minAllowedMarginPercent?: number
  isBelowMinimumMargin?: boolean
  costBasisType?: CostBasisType
  estimatedDirectCost?: number
  priceTiers?: ProductPriceTiers
  purchaseUnit?: string | null
  purchasePrice?: number
  conversionRatio?: number
  defaultWastagePercent?: number
  targetMarginPercent?: number
  minimumCharge?: number
  minOrderQuantity?: number
  effectiveUnitCost?: number
  suggestedSellingPrice?: number
  grossProfitPerUnit?: number
  grossMarginPercent?: number
  isMinimumChargeApplied?: boolean
  appliedTier?: string
  tier?: string
  production_width_allowance?: number | null
  production_length_allowance?: number | null
  allowance_unit?: string | null
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
  commercial_type?: CommercialProductType
  unit: UnitOfMeasure
  selling_unit?: string | null
  purchase_unit?: string | null
  purchase_price?: number
  conversion_ratio?: number
  measurement_type?: MeasurementType
  production_unit?: string | null
  default_wastage_percentage?: number
  target_margin_percentage?: number
  minimum_charge?: number
  min_order_quantity?: number
  // Commercial Master 2.1 additions
  pricing_method?: PricingMethod
  min_billable_quantity?: number
  allow_manual_override?: boolean
  min_allowed_margin_percent?: number
  price_tiers?: ProductPriceTiers
  cost_breakdown?: ProductCostBreakdown
  components?: ProductComponent[]
  supplier_prices?: ProductSupplierPriceRecord[]
  vat_applicable?: boolean
  is_tax_inclusive?: boolean
  roll_width_ft?: number | null
  roll_length_ft?: number | null
  sheet_width_ft?: number | null
  sheet_length_ft?: number | null
  production_width_allowance?: number | null
  production_length_allowance?: number | null
  allowance_unit?: string | null
  printing_method?: string | null
  printing_methods?: string[] | null
  printing_method_name?: string | null
  printable_material_id?: string | null
  printable_material_name?: string | null
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
  requires_design?: boolean
  requires_approval?: boolean
  requires_production?: boolean
  requires_fabrication?: boolean
  requires_finishing?: boolean
  requires_installation?: boolean
  requires_delivery?: boolean
  default_department?: string
  estimated_production_time_hours?: number
  default_finishing?: string | null
  production_instructions?: string | null
  internal_notes?: string | null
  is_active: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
  usage_stats?: ProductUsageStats
  // V3 Rebuild Architecture additions
  entity_type?: EntityType
  is_service?: boolean
  is_ready_product?: boolean
  service_config?: ServiceConfiguration | null
  material_config?: MaterialConfiguration | null
  available_widths_ft?: number[]
  standard_roll_length_ft?: number
  // Computed commercial helpers
  effective_unit_cost?: number
  suggested_selling_price?: number
  gross_margin_percent?: number
  estimated_material_cost?: number
  estimated_direct_cost?: number
  cost_basis_type?: CostBasisType
}

export type EntityType = 'product' | 'service' | 'material' | 'finishing' | 'additional' | 'installation'

export interface ServiceDimensionPreset {
  id?: string
  width: number
  length: number
  unit?: 'ft' | 'inch' | 'm' | string
  label?: string
}

export interface ServiceAllowanceRule {
  widthAllowancePerSide: number
  lengthAllowancePerSide: number
  unit: 'inch' | 'ft' | 'mm' | 'cm' | string
}

export interface ServiceRequiredMaterial {
  id?: string
  material_id?: string
  material_name: string
  is_required?: boolean
  is_primary?: boolean
  consumption_rule?: 'roll_geometry' | 'area_direct' | 'linear_direct' | 'liquid_volume' | 'piece_count' | 'roll_linear_length' | 'area_sqft' | string
  allowance_per_side?: number
  allowance_per_side_in?: number
  allowance_unit?: string
  unit?: string
  consumption_unit?: string
  compatible_widths_ft?: number[]
  waste_percent?: number
}

export interface ServiceFinishingOption {
  id: string
  name: string
  name_bn?: string
  material_id?: string
  material_name?: string
  pricing_method: string // 'per_sqft' | 'per_rft' | 'per_piece' | 'fixed'
  price?: number
  unit_price?: number
  cost?: number
  unit_cost?: number
  is_default?: boolean
}

export interface ServiceAdditionalOption {
  id: string
  name: string
  name_bn?: string
  product_id?: string
  product_name?: string
  pricing_method: string // 'per_piece' | 'per_sqft' | 'fixed'
  price?: number
  unit_price?: number
  cost?: number
  unit_cost?: number
}

export interface ServiceInstallationOption {
  id: string
  name: string
  name_bn?: string
  fulfillment_type?: 'installation' | 'delivery' | 'pickup' | string
  pricing_method: string // 'per_sqft' | 'per_piece' | 'fixed' | 'per_job'
  price?: number
  unit_price?: number
  cost?: number
  unit_cost?: number
  creates_task?: boolean
}

export interface ServiceConfiguration {
  dimension_presets?: ServiceDimensionPreset[]
  presets?: ServiceDimensionPreset[]
  allow_custom_dimensions?: boolean
  default_unit?: 'ft' | 'inch' | 'm' | string
  dimension_unit?: 'ft' | 'inch' | 'm' | string
  allowance_rule?: ServiceAllowanceRule
  available_widths_ft?: number[]
  extra_width_allowance_ft?: number
  standard_roll_length_ft?: number
  available_sheet_sizes?: Array<{ width: number; length: number; label?: string }>
  required_materials?: ServiceRequiredMaterial[]
  finishing_options?: ServiceFinishingOption[]
  additional_options?: ServiceAdditionalOption[]
  installation_options?: ServiceInstallationOption[]
  min_charge?: number
  minimum_charge?: number
  min_billable_qty?: number
  pricing_method?: string
  printing_methods?: string[]
  printing_method?: string
  printable_material_id?: string | null
  printable_material_name?: string | null
}

export interface MaterialConfiguration {
  material_type?: 'roll' | 'sheet' | 'rigid' | 'liquid' | 'hardware' | 'accessory'
  available_widths_ft?: number[]
  standard_roll_length_ft?: number
  available_sheet_sizes?: Array<{ width: number; length: number; label?: string }>
  extra_width_allowance_ft?: number
  purchase_unit?: string
  purchase_price?: number
  usage_unit?: string
  conversion_ratio?: number
  default_allowance_per_side_in?: number
  waste_percent?: number
  effective_unit_cost?: number
  thickness_mm?: number
  storage_location?: string
  pack_quantity?: number
  reorder_level?: number
}

export interface PriceHistoryRecord {
  id: string
  company_id: string
  product_id: string
  old_price: number
  new_price: number
  old_purchase_price?: number | null
  new_purchase_price?: number | null
  old_margin_percent?: number | null
  new_margin_percent?: number | null
  old_wastage_percent?: number | null
  new_wastage_percent?: number | null
  reason: string
  changed_by?: string | null
  changed_by_name?: string
  created_at: string
}

export interface PriceOverrideRecord {
  id: string
  company_id: string
  product_id?: string | null
  product_name?: string | null
  document_type?: 'quotation' | 'order' | 'invoice' | 'job' | null
  document_code?: string | null
  document_id?: string | null
  original_price: number
  override_price: number
  overridden_price?: number
  original_margin_percent?: number | null
  override_margin_percent?: number | null
  overridden_margin_percent?: number | null
  reason: string
  authorized_by?: string | null
  authorized_by_id?: string | null
  authorized_by_name?: string
  tenant_slug?: string | null
  created_at: string
}

export interface PrintingMethod {
  id: string
  company_id: string
  name: string
  name_bn?: string | null
  code?: string | null
  description?: string | null
  category_id?: string | null
  compatible_material_types?: string[]
  cost_per_sqft?: number
  default_ink_type?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface MaterialPurchaseConfig {
  id: string
  company_id: string
  material_id: string
  supplier_id?: string | null
  supplier_name?: string | null
  config_name: string
  width_ft: number
  length_ft: number
  unit: string
  purchase_price: number
  item_code_sku?: string | null
  is_default: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface FinishingOptionRecord {
  id: string
  company_id: string
  name: string
  name_bn?: string | null
  category?: string
  pricing_method: 'sqft' | 'per_piece' | 'per_linear_ft' | 'fixed' | 'percentage' | string
  selling_price: number
  cost: number
  material_id?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface AdditionalOptionRecord {
  id: string
  company_id: string
  name: string
  name_bn?: string | null
  product_id?: string | null
  pricing_method: 'sqft' | 'per_piece' | 'fixed' | string
  selling_price: number
  cost: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface InstallationOptionRecord {
  id: string
  company_id: string
  name: string
  name_bn?: string | null
  fulfillment_type: 'installation' | 'delivery' | 'pickup' | 'custom' | string
  pricing_method: 'fixed' | 'per_piece' | 'sqft' | 'per_km' | string
  selling_price: number
  cost: number
  creates_task: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}
