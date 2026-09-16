/**
 * InkFlow ERP — Authoritative Production Geometry Engine
 * Handles deterministic bleed / production allowances, dimension formatting,
 * and physical cutting geometry without double-multiplication or rounding drift.
 */

export interface DimensionInput {
  width: number
  length: number
  unit?: 'ft' | 'inch' | 'm' | 'mm' | 'cm' | string
}

export interface AllowanceConfig {
  widthAllowancePerSide?: number // e.g. 1.0 (inch)
  lengthAllowancePerSide?: number // e.g. 1.0 (inch)
  totalWidthAllowance?: number // total addition across width
  totalLengthAllowance?: number // total addition across length
  unit?: 'inch' | 'ft' | 'mm' | 'cm' | 'm' | string
}

export interface ProductionDimensionResult {
  customerWidth: number
  customerLength: number
  customerUnit: string
  customerWidthFt: number
  customerLengthFt: number
  singleCustomerAreaSqft: number
  totalCustomerAreaSqft: number
  
  widthAllowancePerSideIn: number
  lengthAllowancePerSideIn: number
  totalWidthAllowanceIn: number
  totalLengthAllowanceIn: number
  
  productionWidthFt: number
  productionLengthFt: number
  singleProductionAreaSqft: number
  totalProductionAreaSqft: number
  
  productionAllowanceAreaSqft: number
  productionAllowanceRatio: number
  
  formattedCustomerDimension: string // e.g. "4ft × 12ft"
  formattedProductionDimension: string // e.g. "4ft 2in × 12ft 2in"
  formattedProductionFeet: string // e.g. "4.17ft × 12.17ft"
}

/**
 * Converts length in any supported unit to feet
 */
export function convertLengthToFeet(value: number, unit: string = 'ft'): number {
  const v = Math.max(0, Number(value) || 0)
  const u = (unit || 'ft').toLowerCase().trim()
  if (u === 'inch' || u === 'in' || u === '"') return v / 12
  if (u === 'm' || u === 'meter' || u === 'metre') return v * 3.28084
  if (u === 'mm' || u === 'millimeter') return v / 304.8
  if (u === 'cm' || u === 'centimeter') return v / 30.48
  return v
}

/**
 * Converts length in any supported unit to inches
 */
export function convertLengthToInches(value: number, unit: string = 'inch'): number {
  const v = Math.max(0, Number(value) || 0)
  const u = (unit || 'inch').toLowerCase().trim()
  if (u === 'ft' || u === 'feet' || u === "'") return v * 12
  if (u === 'm' || u === 'meter' || u === 'metre') return v * 39.3701
  if (u === 'mm' || u === 'millimeter') return v / 25.4
  if (u === 'cm' || u === 'centimeter') return v / 2.54
  return v
}

/**
 * Formats a length in feet into clean Feet and Inches (e.g. 4.1667 ft -> "4ft 2in")
 */
export function formatFeetAndInches(lengthInFeet: number): string {
  const totalInches = Math.round(lengthInFeet * 12 * 100) / 100
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round((totalInches % 12) * 10) / 10

  if (feet === 0) return `${inches}in`
  return `${feet}ft ${inches}in`
}

/**
 * Authoritative production dimension calculator.
 * Applies exact allowance rules (defaulting to 1 inch each side for print production).
 */
export function calculateProductionGeometry(
  dimensions: DimensionInput,
  allowance?: AllowanceConfig,
  quantity: number = 1
): ProductionDimensionResult {
  const qty = Math.max(1, Number(quantity) || 1)
  const cW = Math.max(0, Number(dimensions.width) || 0)
  const cL = Math.max(0, Number(dimensions.length) || 0)
  const cUnit = dimensions.unit || 'ft'

  const cWFt = convertLengthToFeet(cW, cUnit)
  const cLFt = convertLengthToFeet(cL, cUnit)

  const singleCustomerAreaSqft = Math.round(cWFt * cLFt * 10000) / 10000
  const totalCustomerAreaSqft = Math.round(singleCustomerAreaSqft * qty * 10000) / 10000

  // 1 inch per side allowance default for real printing bleed / trim / mounting
  const wAllowPerSideIn = allowance?.widthAllowancePerSide !== undefined
    ? convertLengthToInches(allowance.widthAllowancePerSide, allowance.unit || 'inch')
    : 1.0
  const lAllowPerSideIn = allowance?.lengthAllowancePerSide !== undefined
    ? convertLengthToInches(allowance.lengthAllowancePerSide, allowance.unit || 'inch')
    : 1.0

  const totalWAllowIn = wAllowPerSideIn * 2
  const totalLAllowIn = lAllowPerSideIn * 2

  const totalWAllowFt = totalWAllowIn / 12
  const totalLAllowFt = totalLAllowIn / 12

  const pWFt = Math.round((cWFt + totalWAllowFt) * 10000) / 10000
  const pLFt = Math.round((cLFt + totalLAllowFt) * 10000) / 10000

  const singleProductionAreaSqft = Math.round(pWFt * pLFt * 10000) / 10000
  const totalProductionAreaSqft = Math.round(singleProductionAreaSqft * qty * 10000) / 10000

  const productionAllowanceAreaSqft = Math.round((totalProductionAreaSqft - totalCustomerAreaSqft) * 10000) / 10000
  const productionAllowanceRatio = totalCustomerAreaSqft > 0
    ? Math.round((totalProductionAreaSqft / totalCustomerAreaSqft) * 10000) / 10000
    : 1.0

  const formattedCustomer = `${cW} × ${cL} ${cUnit}`
  const formattedProduction = `${formatFeetAndInches(pWFt)} × ${formatFeetAndInches(pLFt)}`
  const formattedProdFt = `${Math.round(pWFt * 100) / 100}ft × ${Math.round(pLFt * 100) / 100}ft`

  return {
    customerWidth: cW,
    customerLength: cL,
    customerUnit: cUnit,
    customerWidthFt: cWFt,
    customerLengthFt: cLFt,
    singleCustomerAreaSqft,
    totalCustomerAreaSqft,
    
    widthAllowancePerSideIn: wAllowPerSideIn,
    lengthAllowancePerSideIn: lAllowPerSideIn,
    totalWidthAllowanceIn: totalWAllowIn,
    totalLengthAllowanceIn: totalLAllowIn,
    
    productionWidthFt: pWFt,
    productionLengthFt: pLFt,
    singleProductionAreaSqft,
    totalProductionAreaSqft,
    
    productionAllowanceAreaSqft,
    productionAllowanceRatio,
    
    formattedCustomerDimension: formattedCustomer,
    formattedProductionDimension: formattedProduction,
    formattedProductionFeet: formattedProdFt,

    // Snake_case aliases for domain consistency
    ordered_width_ft: cWFt,
    ordered_length_ft: cLFt,
    production_width_ft: pWFt,
    production_length_ft: pLFt,
    total_width_allowance_in: totalWAllowIn,
    total_length_allowance_in: totalLAllowIn,
    formatted_production_spec: formattedProduction,
  } as any
}

/**
 * Convenient wrapper function supporting flat arguments.
 */
export function calculateProductionDimensions(
  width: number,
  length: number,
  options?: {
    dimension_unit?: string
    allowance_per_side_in?: number
    allowance_width_in?: number
    allowance_length_in?: number
    quantity?: number
  }
) {
  return calculateProductionGeometry(
    { width, length, unit: options?.dimension_unit || 'ft' },
    {
      widthAllowancePerSide: options?.allowance_per_side_in ?? options?.allowance_width_in,
      lengthAllowancePerSide: options?.allowance_per_side_in ?? options?.allowance_length_in,
      unit: 'inch',
    },
    options?.quantity || 1
  ) as ProductionDimensionResult & {
    ordered_width_ft: number
    ordered_length_ft: number
    production_width_ft: number
    production_length_ft: number
    total_width_allowance_in: number
    total_length_allowance_in: number
    formatted_production_spec: string
  }
}

export function calculateOrderedArea(width: number, length: number, unit: string = 'ft'): number {
  const wFt = convertLengthToFeet(width, unit)
  const lFt = convertLengthToFeet(length, unit)
  return Math.round(wFt * lFt * 10000) / 10000
}

export function calculateProductionArea(geom: any): number {
  const w = geom.productionWidthFt ?? geom.production_width_ft ?? 0
  const l = geom.productionLengthFt ?? geom.production_length_ft ?? 0
  return Math.round(w * l * 10000) / 10000
}

export const convertDimensionToFeet = convertLengthToFeet

export function convertDimensionFromFeet(feet: number, targetUnit: string = 'ft'): number {
  if (targetUnit === 'inch' || targetUnit === 'in') return feet * 12
  if (targetUnit === 'cm') return feet * 30.48
  if (targetUnit === 'mm') return feet * 304.8
  if (targetUnit === 'm') return feet / 3.28084
  return feet
}

export const formatDimensionWithInches = formatFeetAndInches

export interface AllowanceHierarchyInput {
  serviceDefault?: { widthAllowancePerSide?: number; lengthAllowancePerSide?: number; unit?: string }
  materialOverride?: { widthAllowancePerSide?: number; lengthAllowancePerSide?: number; unit?: string }
  customerOverride?: { widthAllowancePerSide?: number; lengthAllowancePerSide?: number; unit?: string }
  jobOverride?: { widthAllowancePerSide?: number; lengthAllowancePerSide?: number; unit?: string }
  serviceDefaultAllowanceIn?: number
  materialOverrideAllowanceIn?: number
  customerOverrideAllowanceIn?: number
  jobOverrideAllowanceIn?: number
}

/**
 * Resolves allowance rule following the strict priority chain:
 * Job Override > Customer/Quote Override > Material Override > Service Default > System Default (1.0 inch)
 */
export function resolveAllowanceHierarchy(input: AllowanceHierarchyInput): AllowanceConfig & {
  allowance_width_in: number
  allowance_length_in: number
  applied_source: 'job_override' | 'customer_override' | 'material_override' | 'service_default' | 'system_default'
} {
  let chosenWidth: number | undefined = undefined
  let chosenLength: number | undefined = undefined
  let appliedSource: 'job_override' | 'customer_override' | 'material_override' | 'service_default' | 'system_default' = 'system_default'

  if (input.jobOverride?.widthAllowancePerSide !== undefined || input.jobOverrideAllowanceIn !== undefined) {
    chosenWidth = input.jobOverride?.widthAllowancePerSide ?? input.jobOverrideAllowanceIn
    chosenLength = input.jobOverride?.lengthAllowancePerSide ?? input.jobOverrideAllowanceIn
    appliedSource = 'job_override'
  } else if (input.customerOverride?.widthAllowancePerSide !== undefined || input.customerOverrideAllowanceIn !== undefined) {
    chosenWidth = input.customerOverride?.widthAllowancePerSide ?? input.customerOverrideAllowanceIn
    chosenLength = input.customerOverride?.lengthAllowancePerSide ?? input.customerOverrideAllowanceIn
    appliedSource = 'customer_override'
  } else if (input.materialOverride?.widthAllowancePerSide !== undefined || input.materialOverrideAllowanceIn !== undefined) {
    chosenWidth = input.materialOverride?.widthAllowancePerSide ?? input.materialOverrideAllowanceIn
    chosenLength = input.materialOverride?.lengthAllowancePerSide ?? input.materialOverrideAllowanceIn
    appliedSource = 'material_override'
  } else if (input.serviceDefault?.widthAllowancePerSide !== undefined || input.serviceDefaultAllowanceIn !== undefined) {
    chosenWidth = input.serviceDefault?.widthAllowancePerSide ?? input.serviceDefaultAllowanceIn
    chosenLength = input.serviceDefault?.lengthAllowancePerSide ?? input.serviceDefaultAllowanceIn
    appliedSource = 'service_default'
  }

  const finalWidth = chosenWidth !== undefined ? chosenWidth : 1.0
  const finalLength = chosenLength !== undefined ? chosenLength : 1.0

  return {
    widthAllowancePerSide: finalWidth,
    lengthAllowancePerSide: finalLength,
    allowance_width_in: finalWidth,
    allowance_length_in: finalLength,
    applied_source: appliedSource,
    unit: 'inch',
  }
}
