/**
 * InkFlow ERP — Centralized Commercial Unit & Conversion Engine
 * Standardizes units, conversions, wastage calculations, and margin metrics.
 */

export type MeasurementType = 'piece' | 'length' | 'area' | 'weight' | 'volume' | 'job' | 'time'

export type UnitCategory =
  | 'count'
  | 'area'
  | 'length'
  | 'weight'
  | 'volume'
  | 'time'
  | 'service'

export interface CommercialProductTypeDefinition {
  id: string
  label: string
  label_bn: string
  description: string
}

export const PRICING_METHODS = [
  'fixed',
  'per_piece',
  'per_area',
  'per_length',
  'per_weight',
  'per_volume',
  'per_job',
  'per_hour',
  'tiered',
  'formula',
] as const

export const PRICING_METHOD_OPTIONS: { id: (typeof PRICING_METHODS)[number]; label: string; example: string }[] = [
  { id: 'fixed', label: 'Fixed Price', example: '৳1,000 flat' },
  { id: 'per_piece', label: 'Per Piece (pcs / units)', example: 'Eyelet @ ৳5/pc' },
  { id: 'per_area', label: 'Per Area (sqft / sqm)', example: 'Flex @ ৳28/sqft' },
  { id: 'per_length', label: 'Per Length (rft / m)', example: 'MS Frame @ ৳120/rft' },
  { id: 'per_weight', label: 'Per Weight (kg / gm)', example: 'Scrap/Metal @ ৳450/kg' },
  { id: 'per_volume', label: 'Per Volume (liter / ml)', example: 'Ink @ ৳2.5/ml' },
  { id: 'per_job', label: 'Per Job / Project', example: 'Design @ ৳500/job' },
  { id: 'per_hour', label: 'Per Hour (Machine / Labor)', example: 'Machine @ ৳1,500/hr' },
  { id: 'tiered', label: 'Tiered Quantity', example: 'Volume breaks' },
  { id: 'formula', label: 'Dynamic Formula', example: 'Custom script' },
]

export const PRICE_TIER_KEYS = [
  'retail',
  'corporate',
  'dealer',
  'wholesale',
  'custom',
] as const

export const COST_COMPONENTS = [
  'material',
  'ink',
  'machine',
  'labor',
  'finishing',
  'fabrication',
  'installation',
  'delivery',
  'other',
] as const

export const COMMERCIAL_PRODUCT_TYPES: CommercialProductTypeDefinition[] = [
  {
    id: 'ready_product',
    label: 'Ready Product (তৈরি পণ্য)',
    label_bn: 'তৈরি পণ্য',
    description: 'Off-the-shelf retail items ready to dispatch (e.g. frames, standees, accessories)',
  },
  {
    id: 'production_product',
    label: 'Production Product (উৎপাদন পণ্য)',
    label_bn: 'উৎপাদন পণ্য',
    description: 'Custom manufactured print & signage items requiring machine runs',
  },
  {
    id: 'service',
    label: 'General Service (সাধারণ সেবা)',
    label_bn: 'সাধারণ সেবা',
    description: 'Billed professional services (e.g. banner design, artwork correction)',
  },
  {
    id: 'finishing',
    label: 'Finishing Service (পোস্ট-প্রেস ফিনিশিং)',
    label_bn: 'ফিনিশিং সেবা',
    description: 'Post-press operations (e.g. hemming, eyelets, thermal lamination, die-cutting)',
  },
  {
    id: 'fabrication',
    label: 'Fabrication Service (ফেব্রিকেশন / সাইনেজ)',
    label_bn: 'ফেব্রিকেশন সেবা',
    description: 'Metal, MS frame, SS frame, ACP, or acrylic structure fabrication',
  },
  {
    id: 'installation',
    label: 'Installation Service (ইনস্টলেশন সেবা)',
    label_bn: 'ইনস্টলেশন সেবা',
    description: 'On-site billboard, signage, or sticker mounting at client premises',
  },
  {
    id: 'delivery',
    label: 'Delivery & Logistics (ডেলিভারি / লজিস্টিকস)',
    label_bn: 'ডেলিভারি সেবা',
    description: 'Courier, van transport, or Dhaka inter-district transport dispatch',
  },
  {
    id: 'package',
    label: 'Package / Bundle Product (প্যাকেজ / বান্ডেল)',
    label_bn: 'প্যাকেজ পণ্য',
    description: 'Turnkey event branding bundles (e.g. Backdrop + X-Stand + Installation)',
  },
]

export const MEASUREMENT_TYPES: { id: MeasurementType; label: string; description: string }[] = [
  { id: 'area', label: 'Area / Substrate (বর্গফুট / স্কয়ার ফিট)', description: 'Flex, Vinyl, Banner, Acrylic, PVC, ACP (sqft / sqm)' },
  { id: 'piece', label: 'Piece / Count (পিস / সংখ্যা)', description: 'Display stands, business cards, eyelets, badges, brochures' },
  { id: 'length', label: 'Length / Running Feet (দৈর্ঘ্য / রানিং ফিট)', description: 'MS pipes, aluminum channels, border profiles, LED strips' },
  { id: 'weight', label: 'Weight / Mass (ওজন / কেজি)', description: 'Raw metals, scrap, bulk vinyl pellets, paper reams (kg / gram)' },
  { id: 'volume', label: 'Volume / Liquid (আয়তন / তরল)', description: 'Solvent ink, UV ink, cleaning solution, adhesives (liter / ml)' },
  { id: 'job', label: 'Job / Project Tariff (জব / এককালীন চার্জ)', description: 'Design fees, installation charges, trip fees' },
  { id: 'time', label: 'Time / Hourly Labor (সময় / ঘণ্টা)', description: 'Technician labor time, machine hourly rate' },
]

export interface StandardUnitDefinition {
  code: string
  name: string
  name_bn: string
  category: UnitCategory
  measurement_type: MeasurementType
  decimal_precision: number
  is_active: boolean
  default_conversion_to_base?: number
}

export const COMMON_PURCHASE_UNITS = [
  { code: 'roll', name: 'Roll (রোল)', measurement_type: 'area' },
  { code: 'sheet', name: 'Sheet (শীট)', measurement_type: 'area' },
  { code: 'box', name: 'Box (বক্স)', measurement_type: 'piece' },
  { code: 'pack', name: 'Pack (প্যাকেট)', measurement_type: 'piece' },
  { code: 'bottle', name: 'Bottle (বোতল)', measurement_type: 'volume' },
  { code: 'kg', name: 'Kilogram (কেজি)', measurement_type: 'weight' },
  { code: 'pcs', name: 'Pieces (পিস)', measurement_type: 'piece' },
  { code: 'job', name: 'Job (জব)', measurement_type: 'job' },
]

export const COMMON_SELLING_UNITS = [
  { code: 'sft', name: 'Square Feet (sft / sqft)', measurement_type: 'area' },
  { code: 'pcs', name: 'Pieces (পিস)', measurement_type: 'piece' },
  { code: 'rft', name: 'Running Feet (rft)', measurement_type: 'length' },
  { code: 'sheet', name: 'Sheet (শীট)', measurement_type: 'area' },
  { code: 'meter', name: 'Meter (মিটার)', measurement_type: 'length' },
  { code: 'ml', name: 'Milliliter (মিলি)', measurement_type: 'volume' },
  { code: 'kg', name: 'Kilogram (কেজি)', measurement_type: 'weight' },
  { code: 'job', name: 'Job / Flat Charge (জব)', measurement_type: 'job' },
  { code: 'trip', name: 'Trip (ট্রিপ)', measurement_type: 'job' },
  { code: 'hour', name: 'Hour (ঘণ্টা)', measurement_type: 'time' },
]

export const STANDARD_COMMERCIAL_UNITS: Record<string, StandardUnitDefinition> = {
  // Count / Discrete
  pcs: {
    code: 'pcs',
    name: 'Pieces (Pcs)',
    name_bn: 'পিস',
    category: 'count',
    measurement_type: 'piece',
    decimal_precision: 0,
    is_active: true,
  },
  box: {
    code: 'box',
    name: 'Box',
    name_bn: 'বক্স',
    category: 'count',
    measurement_type: 'piece',
    decimal_precision: 0,
    is_active: true,
  },
  pack: {
    code: 'pack',
    name: 'Pack / Packet',
    name_bn: 'প্যাকেট',
    category: 'count',
    measurement_type: 'piece',
    decimal_precision: 0,
    is_active: true,
  },
  set: {
    code: 'set',
    name: 'Set',
    name_bn: 'সেট',
    category: 'count',
    measurement_type: 'piece',
    decimal_precision: 0,
    is_active: true,
  },
  pair: {
    code: 'pair',
    name: 'Pair',
    name_bn: 'জোড়া',
    category: 'count',
    measurement_type: 'piece',
    decimal_precision: 0,
    is_active: true,
  },
  thousand: {
    code: '1000 pcs',
    name: 'Thousand (1,000 pcs)',
    name_bn: 'হাজার পিস',
    category: 'count',
    measurement_type: 'piece',
    decimal_precision: 0,
    is_active: true,
  },

  // Area / Substrate Media
  sft: {
    code: 'sft',
    name: 'Square Feet (sft / sqft)',
    name_bn: 'বর্গফুট (স্কয়ার ফিট)',
    category: 'area',
    measurement_type: 'area',
    decimal_precision: 2,
    is_active: true,
  },
  sqft: {
    code: 'sqft',
    name: 'Square Feet (sqft)',
    name_bn: 'স্কয়ার ফিট',
    category: 'area',
    measurement_type: 'area',
    decimal_precision: 2,
    is_active: true,
  },
  sqm: {
    code: 'sqm',
    name: 'Square Meter (sqm)',
    name_bn: 'বর্গমিটার',
    category: 'area',
    measurement_type: 'area',
    decimal_precision: 2,
    is_active: true,
  },
  sheet: {
    code: 'sheet',
    name: 'Sheet (Board / Acrylic / Paper)',
    name_bn: 'শীট',
    category: 'area',
    measurement_type: 'area',
    decimal_precision: 0,
    is_active: true,
  },
  roll: {
    code: 'roll',
    name: 'Roll (Flex / Vinyl / Banner)',
    name_bn: 'রোল',
    category: 'area',
    measurement_type: 'area',
    decimal_precision: 0,
    is_active: true,
  },

  // Length
  rft: {
    code: 'rft',
    name: 'Running Feet (rft)',
    name_bn: 'রানিং ফিট',
    category: 'length',
    measurement_type: 'length',
    decimal_precision: 2,
    is_active: true,
  },
  ft: {
    code: 'ft',
    name: 'Feet (ft)',
    name_bn: 'ফিট',
    category: 'length',
    measurement_type: 'length',
    decimal_precision: 2,
    is_active: true,
  },
  inch: {
    code: 'inch',
    name: 'Inch (in)',
    name_bn: 'ইঞ্চি',
    category: 'length',
    measurement_type: 'length',
    decimal_precision: 2,
    is_active: true,
  },
  meter: {
    code: 'meter',
    name: 'Meter (m)',
    name_bn: 'মিটার',
    category: 'length',
    measurement_type: 'length',
    decimal_precision: 2,
    is_active: true,
  },

  // Weight
  kg: {
    code: 'kg',
    name: 'Kilogram (kg)',
    name_bn: 'কেজি',
    category: 'weight',
    measurement_type: 'weight',
    decimal_precision: 2,
    is_active: true,
  },
  gram: {
    code: 'gram',
    name: 'Gram (g)',
    name_bn: 'গ্রাম',
    category: 'weight',
    measurement_type: 'weight',
    decimal_precision: 0,
    is_active: true,
  },

  // Volume / Liquid Media
  liter: {
    code: 'liter',
    name: 'Liter (L / ltr)',
    name_bn: 'লিটার',
    category: 'volume',
    measurement_type: 'volume',
    decimal_precision: 2,
    is_active: true,
  },
  ml: {
    code: 'ml',
    name: 'Milliliter (ml)',
    name_bn: 'মিলি',
    category: 'volume',
    measurement_type: 'volume',
    decimal_precision: 0,
    is_active: true,
  },
  bottle: {
    code: 'bottle',
    name: 'Bottle (Ink / Solvent)',
    name_bn: 'বোতল',
    category: 'volume',
    measurement_type: 'volume',
    decimal_precision: 0,
    is_active: true,
  },

  // Time / Labor
  hour: {
    code: 'hour',
    name: 'Hour (hr)',
    name_bn: 'ঘণ্টা',
    category: 'time',
    measurement_type: 'time',
    decimal_precision: 1,
    is_active: true,
  },

  // Services & Deliverables
  job: {
    code: 'job',
    name: 'Job / Project',
    name_bn: 'জব / প্রজেক্ট',
    category: 'service',
    measurement_type: 'job',
    decimal_precision: 0,
    is_active: true,
  },
  trip: {
    code: 'trip',
    name: 'Trip / Delivery Delivery',
    name_bn: 'ট্রিপ',
    category: 'service',
    measurement_type: 'job',
    decimal_precision: 0,
    is_active: true,
  },
  design: {
    code: 'design',
    name: 'Design / Creative',
    name_bn: 'ডিজাইন',
    category: 'service',
    measurement_type: 'job',
    decimal_precision: 0,
    is_active: true,
  },
}

/**
 * Normalizes a unit string to standard code.
 */
export function normalizeUnitCode(unitStr?: string | null): string {
  if (!unitStr) return 'pcs'
  const clean = unitStr.trim().toLowerCase()
  if (clean === 'sqft' || clean === 'sft' || clean === 'sq.ft' || clean === 'sq_ft') return 'sft'
  if (clean === 'pcs' || clean === 'pc' || clean === 'piece' || clean === 'pieces') return 'pcs'
  if (clean === 'rft' || clean === 'running_ft') return 'rft'
  if (clean === 'ltr' || clean === 'liter' || clean === 'litre') return 'liter'
  if (clean === 'hr' || clean === 'hours' || clean === 'hour') return 'hour'
  return clean
}

/**
 * Calculates conversion ratio from dimensions (e.g. 164 ft × 10 ft roll = 1,640 sqft).
 */
export function calculateRollAreaSft(widthFt: number, lengthFt: number): number {
  const w = Math.max(0, Number(widthFt) || 0)
  const l = Math.max(0, Number(lengthFt) || 0)
  return Math.round(w * l * 100) / 100
}

/**
 * Calculates conversion ratio for sheet (e.g. 8 ft × 4 ft acrylic sheet = 32 sqft).
 */
export function calculateSheetAreaSft(widthFt: number, lengthFt: number): number {
  const w = Math.max(0, Number(widthFt) || 0)
  const l = Math.max(0, Number(lengthFt) || 0)
  return Math.round(w * l * 100) / 100
}

/**
 * Commercial Costing Model:
 * Calculates usable yield and effective cost per selling unit accounting for default wastage.
 *
 * Formula:
 * Usable Yield = Conversion Ratio * (1 - (Default Wastage % / 100))
 * Effective Unit Cost = Purchase Price / Usable Yield
 *
 * Example:
 * Purchase Price: ৳8,500 / Roll
 * Conversion: 1,640 sqft / Roll
 * Wastage: 5%
 * Expected Usable Yield = 1640 * (1 - 0.05) = 1,558 sqft
 * Effective Unit Cost = 8500 / 1558 = ৳5.4557 / sqft
 */
export function calculateEffectiveUnitCost(params: {
  purchasePrice: number
  conversionRatio: number
  defaultWastagePercent?: number
}): {
  grossUnitsPerPurchaseUnit: number
  grossAvailableUnits: number
  expectedUsableUnits: number
  effectiveCostPerSellingUnit: number
  rawCostWithoutWastage: number
  wastageCostPerUnit: number
} {
  const purchasePrice = Math.max(0, Number(params.purchasePrice) || 0)
  const conversionRatio = Math.max(0.0001, Number(params.conversionRatio) || 1.0)
  const wastagePercent = Math.min(99.0, Math.max(0, Number(params.defaultWastagePercent) || 0))

  const grossUnitsPerPurchaseUnit = conversionRatio
  const usableFactor = Math.max(0.01, 1 - wastagePercent / 100)
  const expectedUsableUnits = Math.round(conversionRatio * usableFactor * 10000) / 10000

  const rawCostWithoutWastage = conversionRatio > 0 ? purchasePrice / conversionRatio : purchasePrice
  const effectiveCostPerSellingUnit =
    expectedUsableUnits > 0 ? Math.round((purchasePrice / expectedUsableUnits) * 10000) / 10000 : rawCostWithoutWastage

  const wastageCostPerUnit = Math.max(0, effectiveCostPerSellingUnit - rawCostWithoutWastage)

  return {
    grossUnitsPerPurchaseUnit,
    grossAvailableUnits: grossUnitsPerPurchaseUnit,
    expectedUsableUnits,
    effectiveCostPerSellingUnit,
    rawCostWithoutWastage: Math.round(rawCostWithoutWastage * 10000) / 10000,
    wastageCostPerUnit: Math.round(wastageCostPerUnit * 10000) / 10000,
  }
}

/**
 * Calculates Gross Margin % from Cost and Selling Price.
 * Definition:
 * Gross Margin % = ((Selling Price - Cost) / Selling Price) * 100
 *
 * Note: Never confuse with Markup %: ((Selling Price - Cost) / Cost) * 100
 */
export function calculateGrossMargin(cost: number, sellingPrice: number): {
  grossProfit: number
  grossMarginPercent: number
  markupPercent: number
} {
  const c = Math.max(0, Number(cost) || 0)
  const p = Math.max(0, Number(sellingPrice) || 0)
  const grossProfit = Math.round((p - c) * 100) / 100

  const grossMarginPercent =
    p > 0 ? Math.round(((p - c) / p) * 10000) / 100 : 0

  const markupPercent =
    c > 0 ? Math.round(((p - c) / c) * 10000) / 100 : 0

  return {
    grossProfit,
    grossMarginPercent,
    markupPercent,
  }
}

/**
 * Calculates Suggested Selling Price from Effective Unit Cost and Target Margin %.
 * Formula:
 * Suggested Selling Price = Cost / (1 - (Target Margin % / 100))
 *
 * Example:
 * Cost: ৳100
 * Target Margin: 40%
 * Suggested Price = 100 / (1 - 0.40) = ৳166.67
 */
export function calculateSuggestedSellingPrice(
  effectiveUnitCost: number,
  targetMarginPercent: number = 35.0
): number {
  const cost = Math.max(0, Number(effectiveUnitCost) || 0)
  const targetMargin = Math.min(95.0, Math.max(0, Number(targetMarginPercent) || 0))
  const divisor = Math.max(0.05, 1 - targetMargin / 100)
  return Math.round((cost / divisor) * 100) / 100
}

/**
 * Applies Minimum Charge threshold to a calculated line item amount.
 *
 * Example:
 * 10 sqft @ ৳28/sqft = ৳280
 * Minimum Charge = ৳500
 * Billable Amount = max(280, 500) = ৳500
 */
export function applyMinimumCharge(
  calculatedAmount: number,
  minimumCharge: number = 0
): {
  finalBillableAmount: number
  isMinimumChargeApplied: boolean
  originalCalculatedAmount: number
  minimumChargeAmount: number
  finalAmount: number
  isMinimumApplied: boolean
  minimumDifference: number
} {
  const original = Math.max(0, Number(calculatedAmount) || 0)
  const minCharge = Math.max(0, Number(minimumCharge) || 0)

  if (minCharge > 0 && original < minCharge) {
    const diff = Math.round((minCharge - original) * 100) / 100
    return {
      finalBillableAmount: minCharge,
      isMinimumChargeApplied: true,
      originalCalculatedAmount: original,
      minimumChargeAmount: minCharge,
      finalAmount: minCharge,
      isMinimumApplied: true,
      minimumDifference: diff,
    }
  }

  return {
    finalBillableAmount: original,
    isMinimumChargeApplied: false,
    originalCalculatedAmount: original,
    minimumChargeAmount: minCharge,
    finalAmount: original,
    isMinimumApplied: false,
    minimumDifference: 0,
  }
}

export const calculateRollAreaSqft = calculateRollAreaSft
export const calculateSheetAreaSqft = calculateSheetAreaSft
export const UNITS_MASTER = STANDARD_COMMERCIAL_UNITS

/**
 * Validates unit conversion ratio setup.
 */
export function validateConversionRatio(
  ratio: number,
  purchaseUnit?: string,
  sellingUnit?: string
): { valid: boolean; ratio?: number; error?: string } {
  if (isNaN(ratio) || ratio <= 0) {
    return { valid: false, error: 'Conversion ratio must be a positive number greater than zero.' }
  }
  return { valid: true, ratio }
}

/**
 * Validates unit conversion setup for consistency.
 */
export function validateUnitConversion(params: {
  purchaseUnit?: string | null
  sellingUnit?: string | null
  conversionRatio?: number | null
  measurementType?: MeasurementType | null
}): { isValid: boolean; error?: string } {
  const pUnit = params.purchaseUnit?.trim().toLowerCase()
  const sUnit = params.sellingUnit?.trim().toLowerCase()
  const ratio = Number(params.conversionRatio)

  if (!sUnit) {
    return { isValid: false, error: 'Selling unit is mandatory.' }
  }

  if (pUnit && pUnit !== sUnit) {
    if (!ratio || ratio <= 0 || isNaN(ratio)) {
      return {
        isValid: false,
        error: `Conversion ratio must be greater than zero when Purchase Unit (${pUnit}) differs from Selling Unit (${sUnit}).`,
      }
    }
  }

  return { isValid: true }
}

/**
 * Normalizes Pricing Method to standard key.
 */
export function normalizePricingMethod(method?: string | null): string {
  if (!method) return 'per_piece'
  const m = method.trim().toLowerCase()
  if (m === 'per_sft' || m === 'dimensional_area' || m === 'area' || m === 'per_sqft') return 'per_area'
  if (m === 'per_rft' || m === 'running_length' || m === 'length') return 'per_length'
  if (m === 'weight' || m === 'per_kg') return 'per_weight'
  if (m === 'volume' || m === 'per_liter' || m === 'per_litre' || m === 'per_ml') return 'per_volume'
  if (m === 'job' || m === 'per_job' || m === 'project') return 'per_job'
  if (m === 'hour' || m === 'per_hour' || m === 'time') return 'per_hour'
  if (m === 'fixed' || m === 'flat') return 'fixed'
  if (m === 'tiered') return 'tiered'
  if (m === 'formula' || m === 'custom_formula' || m === 'compound_signage') return 'formula'
  if (m === 'per_piece' || m === 'piece' || m === 'pcs') return 'per_piece'
  return m
}

/**
 * Calculates dimensional area in square feet.
 */
export function convertDimensionsToSqft(
  width: number,
  height: number,
  unit: 'ft' | 'inch' | 'm' | 'mm' | 'cm' | string = 'ft'
): number {
  const w = Math.max(0, Number(width) || 0)
  const h = Math.max(0, Number(height) || 0)
  if (w === 0 || h === 0) return 0

  const u = (unit || 'ft').toLowerCase()
  if (u === 'inch' || u === 'in') {
    return Math.round(((w * h) / 144) * 10000) / 10000
  }
  if (u === 'm' || u === 'meter' || u === 'metre') {
    return Math.round(w * h * 10.7639 * 10000) / 10000
  }
  if (u === 'mm' || u === 'millimeter') {
    return Math.round(((w * h) / 92903.04) * 10000) / 10000
  }
  if (u === 'cm' || u === 'centimeter') {
    return Math.round(((w * h) / 929.0304) * 10000) / 10000
  }
  return Math.round(w * h * 10000) / 10000
}

/**
 * Calculates dimensional length in running feet.
 */
export function convertDimensionToRft(
  length: number,
  unit: 'ft' | 'inch' | 'm' | 'mm' | 'cm' | string = 'ft'
): number {
  const l = Math.max(0, Number(length) || 0)
  const u = (unit || 'ft').toLowerCase()
  if (u === 'inch' || u === 'in') {
    return Math.round((l / 12) * 10000) / 10000
  }
  if (u === 'm' || u === 'meter' || u === 'metre') {
    return Math.round(l * 3.28084 * 10000) / 10000
  }
  if (u === 'mm' || u === 'millimeter') {
    return Math.round((l / 304.8) * 10000) / 10000
  }
  if (u === 'cm' || u === 'centimeter') {
    return Math.round((l / 30.48) * 10000) / 10000
  }
  return Math.round(l * 10000) / 10000
}

/**
 * Centralized Commercial Pricing Calculation Engine.
 * Evaluates pricing methods, minimum billable quantities, minimum monetary charges,
 * expected material and direct costs, component recipe rollups, multi-tier pricing resolution,
 * gross margins, and low-margin protections.
 */
export function calculateCommercialPricing(params: {
  pricingMethod?: string
  unitPrice?: number
  catalogSellingPrice?: number
  quantity?: number
  width?: number
  height?: number
  dimensionUnit?: 'ft' | 'inch' | 'mm' | 'cm' | 'm'
  minBillableQuantity?: number
  minOrderQuantity?: number
  minimumCharge?: number
  priceTiers?: Record<string, number>
  selectedPriceTier?: string
  customerSpecificPrice?: number
  manualPriceOverride?: number
  costBreakdown?: {
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
  }
  components?: Array<{
    id?: string
    name?: string
    component_name?: string
    quantity?: number
    unit?: string
    unit_cost?: number
    cost_contribution?: number
    waste_percent?: number
    production_role?: string
    is_optional?: boolean
  }>
  materialUnitCost?: number
  effectiveMaterialCost?: number
  defaultWastagePercent?: number
  targetMarginPercent?: number
  minAllowedMarginPercent?: number
  isTaxInclusive?: boolean
  vatRatePercent?: number
}): {
  pricingMethod: string
  actualQuantity: number
  outputQuantity: number
  billableQuantity: number
  isMinBillableApplied: boolean
  unitPrice: number
  appliedSellingPrice: number
  appliedPriceTier?: string
  isCustomerSpecificApplied: boolean
  isManualOverrideApplied: boolean
  calculatedSubtotal: number
  calculatedAmount: number
  baseLineTotal: number
  minimumCharge: number
  isMinimumChargeApplied: boolean
  finalAmount: number
  minOrderQuantity: number
  isMoqViolated: boolean
  moqDeficit: number
  areaSqft?: number
  singleAreaSqft?: number
  lengthRft?: number
  expectedConsumptionUnits: number
  expectedConsumption: number
  effectiveMaterialCost: number
  estimatedMaterialCost: number
  componentsTotalCostPerUnit: number
  totalDirectCostPerUnit: number
  estimatedDirectCost: number
  costBasisType: 'material' | 'direct_cost' | 'none' | 'material_cost'
  costBasisAmount: number
  activeCostBasis: number
  totalEstimatedCost: number
  totalEstimatedProfit: number
  grossProfitAmount: number
  grossProfitPerUnit: number
  grossMarginPercent: number
  markupPercent: number
  suggestedSellingPrice: number
  minAllowedMarginPercent: number
  isBelowMinimumMargin: boolean
  isBelowMinMargin: boolean
  isBelowMinAllowedMargin: boolean
  marginDeficitPercent: number
  vatRatePercent: number
  vatAmount: number
  grandTotalWithVat: number
  calculatedQuantity: number
} {
  const method = normalizePricingMethod(params.pricingMethod)
  const defaultRate = Math.max(0, Number(params.catalogSellingPrice ?? params.unitPrice) || 0)
  const rawQty = Math.max(0, Number(params.quantity) || 0)
  const minBillableQty = Math.max(0, Number(params.minBillableQuantity) || 0)
  const moq = Math.max(0, Number(params.minOrderQuantity) || 0)
  const minCharge = Math.max(0, Number(params.minimumCharge) || 0)
  const targetMargin = Number(params.targetMarginPercent) !== undefined ? Number(params.targetMarginPercent) : 35.0
  const minAllowedMargin = Number(params.minAllowedMarginPercent) !== undefined ? Number(params.minAllowedMarginPercent) : 15.0

  // 1. Price Resolution Hierarchy:
  // Manual Override > Customer Specific Rate > Price Tier > Default Catalog Rate
  let appliedSellingPrice = defaultRate
  let appliedPriceTier: string | undefined = undefined
  let isCustomerSpecificApplied = false
  let isManualOverrideApplied = false

  if (params.selectedPriceTier && params.priceTiers && params.priceTiers[params.selectedPriceTier] !== undefined) {
    appliedSellingPrice = Number(params.priceTiers[params.selectedPriceTier])
    appliedPriceTier = params.selectedPriceTier
  }

  if (params.customerSpecificPrice !== undefined && Number(params.customerSpecificPrice) > 0) {
    appliedSellingPrice = Number(params.customerSpecificPrice)
    isCustomerSpecificApplied = true
  }

  if (params.manualPriceOverride !== undefined && Number(params.manualPriceOverride) >= 0) {
    appliedSellingPrice = Number(params.manualPriceOverride)
    isManualOverrideApplied = true
  }

  // 2. Quantity & Dimension Evaluation
  let actualQuantity = rawQty
  let areaSqft: number | undefined
  let lengthRft: number | undefined

  if (method === 'per_area') {
    if (params.width && params.height && Number(params.width) > 0 && Number(params.height) > 0) {
      const pieceArea = convertDimensionsToSqft(Number(params.width), Number(params.height), params.dimensionUnit || 'ft')
      actualQuantity = Math.round(pieceArea * (rawQty || 1) * 100) / 100
      areaSqft = actualQuantity
    } else {
      actualQuantity = rawQty
      areaSqft = rawQty
    }
  } else if (method === 'per_length') {
    if (params.width && Number(params.width) > 0) {
      const pieceLength = convertDimensionToRft(Number(params.width), params.dimensionUnit || 'ft')
      actualQuantity = Math.round(pieceLength * (rawQty || 1) * 100) / 100
      lengthRft = actualQuantity
    } else {
      actualQuantity = rawQty
      lengthRft = rawQty
    }
  }

  // 3. Minimum Billable Quantity Evaluation
  let billableQuantity = actualQuantity
  let isMinBillableApplied = false
  if (minBillableQty > 0 && actualQuantity < minBillableQty) {
    billableQuantity = minBillableQty
    isMinBillableApplied = true
  }

  // 4. Minimum Order Quantity (MOQ) Validation
  const isMoqViolated = moq > 0 && actualQuantity < moq
  const moqDeficit = isMoqViolated ? Math.round((moq - actualQuantity) * 100) / 100 : 0

  // 5. Base Calculated Amount
  let calculatedAmount = 0
  if (method === 'fixed') {
    calculatedAmount = appliedSellingPrice
  } else {
    calculatedAmount = Math.round(billableQuantity * appliedSellingPrice * 100) / 100
  }

  // 6. Minimum Monetary Charge Evaluation
  let finalAmount = calculatedAmount
  let isMinimumChargeApplied = false
  if (minCharge > 0 && calculatedAmount < minCharge) {
    finalAmount = minCharge
    isMinimumChargeApplied = true
  }

  // 7. Costing & Yield Analysis
  const materialUnitCost = Math.max(0, Number(params.effectiveMaterialCost ?? params.materialUnitCost) || 0)
  const defaultWastage = Math.max(0, Number(params.defaultWastagePercent) || 0)
  const expectedConsumptionUnits = Math.round(actualQuantity * (1 + defaultWastage / 100) * 100) / 100

  const estimatedMaterialCost = Math.round(materialUnitCost * actualQuantity * 100) / 100

  // 8. Components / Recipe Rollup
  let componentsTotalCostPerUnit = 0
  if (params.components && params.components.length > 0) {
    componentsTotalCostPerUnit = params.components.reduce((acc, c) => {
      const unitCost = Number(c.unit_cost) || 0
      const qty = Number(c.quantity) || 1
      const waste = Number(c.waste_percent) || 0
      return acc + (unitCost * qty * (1 + waste / 100))
    }, 0)
    componentsTotalCostPerUnit = Math.round(componentsTotalCostPerUnit * 100) / 100
  }

  // 9. Direct Cost Components Breakdown
  let extraDirectCostPerUnit = 0
  if (params.costBreakdown) {
    const cb = params.costBreakdown
    const ink = Number(cb.ink_cost) || 0
    const mach = Number(cb.machine_cost) || 0
    const lab = Number(cb.labor_cost) || 0
    const fin = Number(cb.finishing_cost) || 0
    const fab = Number(cb.fabrication_cost) || 0
    const inst = Number(cb.installation_cost) || 0
    const del = Number(cb.delivery_cost) || 0
    const oth = Number(cb.other_direct_cost) || 0
    extraDirectCostPerUnit = Math.round((ink + mach + lab + fin + fab + inst + del + oth) * 100) / 100
  }

  const totalDirectCostPerUnit = Math.round((materialUnitCost + extraDirectCostPerUnit + componentsTotalCostPerUnit) * 100) / 100
  const estimatedDirectCost = Math.round(totalDirectCostPerUnit * actualQuantity * 100) / 100

  const hasExtraDirectCosts = extraDirectCostPerUnit > 0 || componentsTotalCostPerUnit > 0
  const costBasisType: 'material' | 'direct_cost' | 'none' = hasExtraDirectCosts
    ? 'direct_cost'
    : (materialUnitCost > 0 ? 'material' : 'none')

  const activeCostBasis = hasExtraDirectCosts ? totalDirectCostPerUnit : materialUnitCost
  const costBasisAmount = Math.round(activeCostBasis * actualQuantity * 100) / 100
  const totalEstimatedCost = costBasisAmount

  const grossProfitAmount = Math.round((finalAmount - costBasisAmount) * 100) / 100
  const totalEstimatedProfit = grossProfitAmount
  const grossProfitPerUnit = Math.round((appliedSellingPrice - activeCostBasis) * 100) / 100

  const grossMarginPercent = appliedSellingPrice > 0
    ? Math.round(((appliedSellingPrice - activeCostBasis) / appliedSellingPrice) * 10000) / 100
    : 0

  const markupPercent = activeCostBasis > 0
    ? Math.round(((appliedSellingPrice - activeCostBasis) / activeCostBasis) * 10000) / 100
    : 0

  const suggestedSellingPrice = calculateSuggestedSellingPrice(activeCostBasis, targetMargin)

  const isBelowMinimumMargin = minAllowedMargin > 0 && grossMarginPercent < minAllowedMargin
  const marginDeficitPercent = isBelowMinimumMargin ? Math.round((minAllowedMargin - grossMarginPercent) * 100) / 100 : 0

  // 10. VAT calculations
  const vatRate = Math.max(0, Number(params.vatRatePercent) || 0)
  let vatAmount = 0
  let grandTotalWithVat = finalAmount

  if (vatRate > 0) {
    if (params.isTaxInclusive) {
      vatAmount = Math.round((finalAmount - finalAmount / (1 + vatRate / 100)) * 100) / 100
      grandTotalWithVat = finalAmount
    } else {
      vatAmount = Math.round(finalAmount * (vatRate / 100) * 100) / 100
      grandTotalWithVat = Math.round((finalAmount + vatAmount) * 100) / 100
    }
  }

  return {
    pricingMethod: method,
    actualQuantity,
    outputQuantity: actualQuantity,
    billableQuantity,
    isMinBillableApplied,
    unitPrice: appliedSellingPrice,
    appliedSellingPrice,
    appliedPriceTier,
    isCustomerSpecificApplied,
    isManualOverrideApplied,
    calculatedSubtotal: calculatedAmount,
    calculatedAmount,
    baseLineTotal: calculatedAmount,
    minimumCharge: minCharge,
    isMinimumChargeApplied,
    finalAmount,
    minOrderQuantity: moq,
    isMoqViolated,
    moqDeficit,
    areaSqft,
    singleAreaSqft: areaSqft ? Math.round((areaSqft / (rawQty || 1)) * 100) / 100 : 0,
    lengthRft,
    expectedConsumptionUnits,
    expectedConsumption: expectedConsumptionUnits,
    calculatedQuantity: billableQuantity,
    effectiveMaterialCost: materialUnitCost,
    estimatedMaterialCost,
    componentsTotalCostPerUnit,
    totalDirectCostPerUnit,
    estimatedDirectCost,
    costBasisType,
    costBasisAmount,
    activeCostBasis,
    totalEstimatedCost,
    totalEstimatedProfit,
    grossProfitAmount,
    grossProfitPerUnit,
    grossMarginPercent,
    markupPercent,
    suggestedSellingPrice,
    minAllowedMarginPercent: minAllowedMargin,
    isBelowMinimumMargin,
    isBelowMinMargin: isBelowMinimumMargin,
    isBelowMinAllowedMargin: isBelowMinimumMargin,
    marginDeficitPercent,
    vatRatePercent: vatRate,
    vatAmount,
    grandTotalWithVat,
  }
}

/**
 * Detects circular references in Bill of Materials (BOM) / Recipe definitions.
 * Prevents direct self-reference (A -> A) and indirect transitive cycles (A -> B -> A).
 */
export function validateCircularBOM(
  targetProductId: string | null | undefined,
  components: Array<{ component_product_id?: string | null; name?: string; component_name?: string }>,
  existingProductsLookup?: Record<string, Array<{ component_product_id?: string | null }>>
): { hasCycle: boolean; cyclePath?: string[]; error?: string } {
  if (!targetProductId || !components || !Array.isArray(components) || components.length === 0) {
    return { hasCycle: false }
  }

  // 1. Direct Self-Reference Check (A -> A)
  for (const comp of components) {
    if (comp.component_product_id && comp.component_product_id === targetProductId) {
      const name = comp.component_name || comp.name || targetProductId
      return {
        hasCycle: true,
        cyclePath: [targetProductId, comp.component_product_id],
        error: `Circular BOM reference detected: Product "${targetProductId}" cannot include itself ("${name}") as a component.`,
      }
    }
  }

  // 2. Transitive / Indirect Cycle Check (A -> B -> A)
  if (existingProductsLookup) {
    const visited = new Set<string>([targetProductId])
    const checkCycle = (
      currentId: string,
      path: string[]
    ): { hasCycle: boolean; cyclePath?: string[]; error?: string } => {
      const childComps = existingProductsLookup[currentId] || []
      for (const child of childComps) {
        if (!child.component_product_id) continue
        if (child.component_product_id === targetProductId) {
          return {
            hasCycle: true,
            cyclePath: [...path, child.component_product_id],
            error: `Indirect circular BOM cycle detected: ${[...path, child.component_product_id].join(' -> ')}`,
          }
        }
        if (!visited.has(child.component_product_id)) {
          visited.add(child.component_product_id)
          const subResult = checkCycle(child.component_product_id, [...path, child.component_product_id])
          if (subResult.hasCycle) return subResult
        }
      }
      return { hasCycle: false }
    }

    for (const comp of components) {
      if (comp.component_product_id) {
        const result = checkCycle(comp.component_product_id, [targetProductId, comp.component_product_id])
        if (result.hasCycle) return result
      }
    }
  }

  return { hasCycle: false }
}

