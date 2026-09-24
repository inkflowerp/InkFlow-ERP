import type { ProductRecord } from '../types/product.types.ts'

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
    label: 'Ready Product',
    label_bn: 'তৈরি পণ্য',
    description: 'Off-the-shelf retail items ready to dispatch (e.g. frames, standees, accessories)',
  },
  {
    id: 'production_product',
    label: 'Production Product',
    label_bn: 'উৎপাদন পণ্য',
    description: 'Custom manufactured print & signage items requiring machine runs',
  },
  {
    id: 'service',
    label: 'General Service',
    label_bn: 'সাধারণ সেবা',
    description: 'Billed professional services (e.g. banner design, artwork correction)',
  },
  {
    id: 'finishing',
    label: 'Finishing Service',
    label_bn: 'ফিনিশিং সেবা',
    description: 'Post-press operations (e.g. hemming, eyelets, thermal lamination, die-cutting)',
  },
  {
    id: 'fabrication',
    label: 'Fabrication Service',
    label_bn: 'ফেব্রিকেশন সেবা',
    description: 'Metal, MS frame, SS frame, ACP, or acrylic structure fabrication',
  },
  {
    id: 'installation',
    label: 'Installation Service',
    label_bn: 'ইনস্টলেশন সেবা',
    description: 'On-site billboard, signage, or sticker mounting at client premises',
  },
  {
    id: 'delivery',
    label: 'Delivery & Logistics',
    label_bn: 'ডেলিভারি সেবা',
    description: 'Courier, van transport, or Dhaka inter-district transport dispatch',
  },
  {
    id: 'package',
    label: 'Package / Bundle Product',
    label_bn: 'প্যাকেজ পণ্য',
    description: 'Turnkey event branding bundles (e.g. Backdrop + X-Stand + Installation)',
  },
  {
    id: 'outsource',
    label: 'Outsource Product',
    label_bn: 'আউটসোর্স পণ্য',
    description: 'Third-party vendor outsourced products & jobs (e.g. Offset, Neon bending, Embroidery, Debossing) requiring no internal stock depletion.',
  },
]

export const MEASUREMENT_TYPES: { id: MeasurementType; label: string; label_bn: string; description: string }[] = [
  { id: 'area', label: 'Area / Substrate', label_bn: 'বর্গফুট / স্কয়ার ফিট', description: 'Flex, Vinyl, Banner, Acrylic, PVC, ACP (sqft / sqm)' },
  { id: 'piece', label: 'Piece / Count', label_bn: 'পিস / সংখ্যা', description: 'Display stands, business cards, eyelets, badges, brochures' },
  { id: 'length', label: 'Length / Running Feet', label_bn: 'দৈর্ঘ্য / রানিং ফিট', description: 'MS pipes, aluminum channels, border profiles, LED strips' },
  { id: 'weight', label: 'Weight / Mass', label_bn: 'ওজন', description: 'Raw metals, scrap, bulk vinyl pellets, paper reams (kg / gram)' },
  { id: 'volume', label: 'Volume / Liquid', label_bn: 'আয়তন', description: 'Solvent ink, UV ink, cleaning solution, adhesives (liter / ml)' },
  { id: 'job', label: 'Job / Project Tariff', label_bn: 'কাজের এককালীন চার্জ', description: 'Design fees, installation charges, trip fees' },
  { id: 'time', label: 'Time / Hourly Labor', label_bn: 'সময় / ঘণ্টা', description: 'Technician labor time, machine hourly rate' },
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
  { code: 'roll', name: 'Roll', name_bn: 'রোল', measurement_type: 'area' },
  { code: 'sheet', name: 'Sheet', name_bn: 'শীট', measurement_type: 'area' },
  { code: 'box', name: 'Box', name_bn: 'বক্স', measurement_type: 'piece' },
  { code: 'pack', name: 'Pack', name_bn: 'প্যাকেট', measurement_type: 'piece' },
  { code: 'bottle', name: 'Bottle', name_bn: 'বোতল', measurement_type: 'volume' },
  { code: 'kg', name: 'Kilogram', name_bn: 'কেজি', measurement_type: 'weight' },
  { code: 'pcs', name: 'Pieces', name_bn: 'পিস', measurement_type: 'piece' },
  { code: 'job', name: 'Job', name_bn: 'কাজের অর্ডার', measurement_type: 'job' },
]

export const COMMON_SELLING_UNITS = [
  { code: 'sft', name: 'Square Feet', name_bn: 'বর্গফুট', measurement_type: 'area' },
  { code: 'pcs', name: 'Pieces', name_bn: 'পিস', measurement_type: 'piece' },
  { code: 'rft', name: 'Running Feet', name_bn: 'রানিং ফিট', measurement_type: 'length' },
  { code: 'sheet', name: 'Sheet', name_bn: 'শীট', measurement_type: 'area' },
  { code: 'meter', name: 'Meter', name_bn: 'মিটার', measurement_type: 'length' },
  { code: 'ml', name: 'Milliliter', name_bn: 'মিলি', measurement_type: 'volume' },
  { code: 'kg', name: 'Kilogram', name_bn: 'কেজি', measurement_type: 'weight' },
  { code: 'job', name: 'Job / Flat Charge', name_bn: 'এককালীন চার্জ', measurement_type: 'job' },
  { code: 'trip', name: 'Trip', name_bn: 'ট্রিপ', measurement_type: 'job' },
  { code: 'hour', name: 'Hour', name_bn: 'ঘণ্টা', measurement_type: 'time' },
]

export const STANDARD_COMMERCIAL_UNITS: Record<string, StandardUnitDefinition> = {
  // Count / Discrete
  pcs: {
    code: 'pcs',
    name: 'Pieces',
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
    name: 'Thousand',
    name_bn: 'হাজার পিস',
    category: 'count',
    measurement_type: 'piece',
    decimal_precision: 0,
    is_active: true,
  },

  // Area / Substrate Media
  sft: {
    code: 'sft',
    name: 'Square Feet',
    name_bn: 'বর্গফুট',
    category: 'area',
    measurement_type: 'area',
    decimal_precision: 2,
    is_active: true,
  },
  sqft: {
    code: 'sqft',
    name: 'Square Feet',
    name_bn: 'স্কয়ার ফিট',
    category: 'area',
    measurement_type: 'area',
    decimal_precision: 2,
    is_active: true,
  },
  sqm: {
    code: 'sqm',
    name: 'Square Meter',
    name_bn: 'বর্গমিটার',
    category: 'area',
    measurement_type: 'area',
    decimal_precision: 2,
    is_active: true,
  },
  sheet: {
    code: 'sheet',
    name: 'Sheet',
    name_bn: 'শীট',
    category: 'area',
    measurement_type: 'area',
    decimal_precision: 0,
    is_active: true,
  },
  roll: {
    code: 'roll',
    name: 'Roll',
    name_bn: 'রোল',
    category: 'area',
    measurement_type: 'area',
    decimal_precision: 0,
    is_active: true,
  },

  // Length
  rft: {
    code: 'rft',
    name: 'Running Feet',
    name_bn: 'রানিং ফিট',
    category: 'length',
    measurement_type: 'length',
    decimal_precision: 2,
    is_active: true,
  },
  ft: {
    code: 'ft',
    name: 'Feet',
    name_bn: 'ফিট',
    category: 'length',
    measurement_type: 'length',
    decimal_precision: 2,
    is_active: true,
  },
  inch: {
    code: 'inch',
    name: 'Inch',
    name_bn: 'ইঞ্চি',
    category: 'length',
    measurement_type: 'length',
    decimal_precision: 2,
    is_active: true,
  },
  meter: {
    code: 'meter',
    name: 'Meter',
    name_bn: 'মিটার',
    category: 'length',
    measurement_type: 'length',
    decimal_precision: 2,
    is_active: true,
  },

  // Weight
  kg: {
    code: 'kg',
    name: 'Kilogram',
    name_bn: 'কেজি',
    category: 'weight',
    measurement_type: 'weight',
    decimal_precision: 2,
    is_active: true,
  },
  gram: {
    code: 'gram',
    name: 'Gram',
    name_bn: 'গ্রাম',
    category: 'weight',
    measurement_type: 'weight',
    decimal_precision: 0,
    is_active: true,
  },

  // Volume / Liquid Media
  liter: {
    code: 'liter',
    name: 'Liter',
    name_bn: 'লিটার',
    category: 'volume',
    measurement_type: 'volume',
    decimal_precision: 2,
    is_active: true,
  },
  ml: {
    code: 'ml',
    name: 'Milliliter',
    name_bn: 'মিলি',
    category: 'volume',
    measurement_type: 'volume',
    decimal_precision: 0,
    is_active: true,
  },
  bottle: {
    code: 'bottle',
    name: 'Bottle',
    name_bn: 'বোতল',
    category: 'volume',
    measurement_type: 'volume',
    decimal_precision: 0,
    is_active: true,
  },

  // Time / Labor
  hour: {
    code: 'hour',
    name: 'Hour',
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
    name_bn: 'কাজের অর্ডার',
    category: 'service',
    measurement_type: 'job',
    decimal_precision: 0,
    is_active: true,
  },
  trip: {
    code: 'trip',
    name: 'Trip',
    name_bn: 'ট্রিপ',
    category: 'service',
    measurement_type: 'job',
    decimal_precision: 0,
    is_active: true,
  },
  design: {
    code: 'design',
    name: 'Design',
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
 * Calculates physical cutting yield for roll media, considering width constraints,
 * length constraints, lanes across roll width, production allowances, customer billable area,
 * and remaining remnants.
 */
export function calculateRollCuttingYield(params: {
  rollWidthFt: number
  rollLengthFt: number
  sellingWidthFt: number
  sellingLengthFt: number
  widthAllowanceFt?: number
  lengthAllowanceFt?: number
  allowRotation?: boolean
}): {
  rollWidthFt: number
  rollLengthFt: number
  totalRollAreaSqft: number
  sellingWidthFt: number
  sellingLengthFt: number
  singleSellingAreaSqft: number
  productionWidthFt: number
  productionLengthFt: number
  singleProductionAreaSqft: number
  fitsRoll: boolean
  isRotated: boolean
  lanesAcrossWidth: number
  cutsAlongLength: number
  maxFullJobsYield: number
  totalPhysicalAreaCutSqft: number
  totalSellableCustomerAreaSqft: number
  totalProductionAllowanceSqft: number
  linearLengthConsumedFt: number
  remainingRollLengthFt: number
  remainingRollRemnantAreaSqft: number
  sideStripRemnantAreaSqft: number
  totalRemnantAreaSqft: number
  naiveAreaDivisionYield: number
  cuttingEfficiencyPercent: number
} {
  const rollW = Math.max(0, Number(params.rollWidthFt) || 0)
  const rollL = Math.max(0, Number(params.rollLengthFt) || 0)
  const totalRollArea = Math.round(rollW * rollL * 10000) / 10000

  const sW = Math.max(0, Number(params.sellingWidthFt) || 0)
  const sL = Math.max(0, Number(params.sellingLengthFt) || 0)
  const wAllow = Math.max(0, Number(params.widthAllowanceFt) || 0)
  const lAllow = Math.max(0, Number(params.lengthAllowanceFt) || 0)

  let pW = sW + wAllow
  let pL = sL + lAllow
  let isRotated = false

  // Standard orientation check
  let lanes = pW > 0 ? Math.floor(rollW / pW) : 0
  let cutsAlongLength = pL > 0 ? Math.floor(rollL / pL) : 0
  let totalYield = lanes * cutsAlongLength

  // Check rotated orientation if enabled
  if (params.allowRotation) {
    const rotPW = sL + wAllow
    const rotPL = sW + lAllow
    const rotLanes = rotPW > 0 ? Math.floor(rollW / rotPW) : 0
    const rotCuts = rotPL > 0 ? Math.floor(rollL / rotPL) : 0
    const rotYield = rotLanes * rotCuts
    if (rotYield > totalYield) {
      pW = rotPW
      pL = rotPL
      lanes = rotLanes
      cutsAlongLength = rotCuts
      totalYield = rotYield
      isRotated = true
    }
  }

  const fitsRoll = totalYield > 0
  const singleSellingArea = Math.round(sW * sL * 10000) / 10000
  const singleProductionArea = Math.round(pW * pL * 10000) / 10000

  const totalPhysicalAreaCut = Math.round(totalYield * singleProductionArea * 10000) / 10000
  const totalSellableArea = Math.round(totalYield * singleSellingArea * 10000) / 10000
  const totalAllowanceArea = Math.round((totalPhysicalAreaCut - totalSellableArea) * 10000) / 10000

  const linearLengthConsumed = fitsRoll ? Math.round(cutsAlongLength * pL * 10000) / 10000 : 0
  const remainingRollLength = Math.max(0, Math.round((rollL - linearLengthConsumed) * 10000) / 10000)
  const remainingRollRemnantArea = Math.round(remainingRollLength * rollW * 10000) / 10000

  // Side strip leftover during linear cut
  const usedWidthAcrossRoll = lanes * pW
  const sideStripWidth = Math.max(0, rollW - usedWidthAcrossRoll)
  const sideStripRemnantArea = Math.round(sideStripWidth * linearLengthConsumed * 10000) / 10000

  const totalRemnantArea = Math.round((remainingRollRemnantArea + sideStripRemnantArea) * 10000) / 10000
  const naiveAreaDivisionYield = singleProductionArea > 0 ? Math.floor(totalRollArea / singleProductionArea) : 0
  const cuttingEfficiencyPercent = totalRollArea > 0 ? Math.round((totalPhysicalAreaCut / totalRollArea) * 10000) / 100 : 0

  return {
    rollWidthFt: rollW,
    rollLengthFt: rollL,
    totalRollAreaSqft: totalRollArea,
    sellingWidthFt: sW,
    sellingLengthFt: sL,
    singleSellingAreaSqft: singleSellingArea,
    productionWidthFt: Math.round(pW * 10000) / 10000,
    productionLengthFt: Math.round(pL * 10000) / 10000,
    singleProductionAreaSqft: singleProductionArea,
    fitsRoll,
    isRotated,
    lanesAcrossWidth: lanes,
    cutsAlongLength,
    maxFullJobsYield: totalYield,
    totalPhysicalAreaCutSqft: totalPhysicalAreaCut,
    totalSellableCustomerAreaSqft: totalSellableArea,
    totalProductionAllowanceSqft: totalAllowanceArea,
    linearLengthConsumedFt: linearLengthConsumed,
    remainingRollLengthFt: remainingRollLength,
    remainingRollRemnantAreaSqft: remainingRollRemnantArea,
    sideStripRemnantAreaSqft: sideStripRemnantArea,
    totalRemnantAreaSqft: totalRemnantArea,
    naiveAreaDivisionYield,
    cuttingEfficiencyPercent,
  }
}

/**
 * Calculates multi-job sequential consumption along a roll of material.
 */
export function calculateMultiJobRollConsumption(params: {
  rollWidthFt: number
  rollLengthFt: number
  jobs: Array<{
    name?: string
    sellingWidthFt: number
    sellingLengthFt: number
    quantity: number
    widthAllowanceFt?: number
    lengthAllowanceFt?: number
  }>
}): {
  rollWidthFt: number
  rollLengthFt: number
  totalRollAreaSqft: number
  totalLinearLengthConsumedFt: number
  totalPhysicalAreaCutSqft: number
  totalCustomerBillableAreaSqft: number
  totalProductionAllowanceSqft: number
  remainingRollLengthFt: number
  remainingRollRemnantAreaSqft: number
  isRollSufficient: boolean
  lengthDeficitFt: number
  jobBreakdown: Array<{
    name?: string
    quantity: number
    singleSellingAreaSqft: number
    totalSellingAreaSqft: number
    productionWidthFt: number
    productionLengthFt: number
    singleProductionAreaSqft: number
    totalProductionAreaSqft: number
    linearLengthFt: number
  }>
} {
  const rollW = Math.max(0, Number(params.rollWidthFt) || 0)
  const rollL = Math.max(0, Number(params.rollLengthFt) || 0)
  const totalRollArea = Math.round(rollW * rollL * 10000) / 10000

  let totalLinearLength = 0
  let totalPhysicalArea = 0
  let totalCustomerArea = 0

  const jobBreakdown = (params.jobs || []).map((j) => {
    const qty = Math.max(1, Number(j.quantity) || 1)
    const sW = Math.max(0, Number(j.sellingWidthFt) || 0)
    const sL = Math.max(0, Number(j.sellingLengthFt) || 0)
    const wAllow = Math.max(0, Number(j.widthAllowanceFt) || 0)
    const lAllow = Math.max(0, Number(j.lengthAllowanceFt) || 0)

    const pW = sW + wAllow
    const pL = sL + lAllow

    const singleSellingArea = Math.round(sW * sL * 10000) / 10000
    const totalSellingArea = Math.round(singleSellingArea * qty * 10000) / 10000

    const singleProductionArea = Math.round(pW * pL * 10000) / 10000
    const totalProductionArea = Math.round(singleProductionArea * qty * 10000) / 10000

    const linearLength = Math.round(pL * qty * 10000) / 10000

    totalLinearLength += linearLength
    totalPhysicalArea += totalProductionArea
    totalCustomerArea += totalSellingArea

    return {
      name: j.name,
      quantity: qty,
      singleSellingAreaSqft: singleSellingArea,
      totalSellingAreaSqft: totalSellingArea,
      productionWidthFt: pW,
      productionLengthFt: pL,
      singleProductionAreaSqft: singleProductionArea,
      totalProductionAreaSqft: totalProductionArea,
      linearLengthFt: linearLength,
    }
  })

  totalLinearLength = Math.round(totalLinearLength * 10000) / 10000
  totalPhysicalArea = Math.round(totalPhysicalArea * 10000) / 10000
  totalCustomerArea = Math.round(totalCustomerArea * 10000) / 10000
  const totalAllowanceArea = Math.round((totalPhysicalArea - totalCustomerArea) * 10000) / 10000

  const isRollSufficient = rollL >= totalLinearLength
  const remainingLength = isRollSufficient ? Math.round((rollL - totalLinearLength) * 10000) / 10000 : 0
  const lengthDeficit = isRollSufficient ? 0 : Math.round((totalLinearLength - rollL) * 10000) / 10000
  const remainingRemnantArea = Math.round(remainingLength * rollW * 10000) / 10000

  return {
    rollWidthFt: rollW,
    rollLengthFt: rollL,
    totalRollAreaSqft: totalRollArea,
    totalLinearLengthConsumedFt: totalLinearLength,
    totalPhysicalAreaCutSqft: totalPhysicalArea,
    totalCustomerBillableAreaSqft: totalCustomerArea,
    totalProductionAllowanceSqft: totalAllowanceArea,
    remainingRollLengthFt: remainingLength,
    remainingRollRemnantAreaSqft: remainingRemnantArea,
    isRollSufficient,
    lengthDeficitFt: lengthDeficit,
    jobBreakdown,
  }
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
 * Resolves the true purchase-to-consumption conversion ratio for a product/material.
 * Accurately derives:
 * 1. Roll Media: width_ft * length_ft (e.g. 6ft * 164ft = 984 sft, 10ft * 164ft = 1640 sft, 3ft * 164ft = 492 sft)
 * 2. Purchase Price & Base Cost ratio: purchase_price / base_cost (e.g. 6888 / 7 = 984)
 * 3. Rigid Sheets: width_ft * length_ft (e.g. 4 * 8 = 32 sft)
 * 4. Box / Pack / Packet: pack_quantity (e.g. 1000 pcs)
 * 5. Explicit conversion_ratio > 1
 */
export function getProductConversionRatio(item: any): number {
  if (!item) return 1

  const rawRatio = Number(item.conversion_ratio ?? (item.material_config as any)?.conversion_ratio)
  const isRoll = Boolean(
    item.is_roll ||
    item.purchase_unit === 'roll' ||
    (item.category && ['flex', 'vinyl', 'banner', 'sticker', 'pvc', 'canvas', 'mesh', 'roll_media', 'roll'].some((c: string) => String(item.category).toLowerCase().includes(c))) ||
    (item.name && ['flex', 'vinyl', 'banner', 'sticker', 'pvc', 'canvas', 'mesh', 'sav'].some((c: string) => String(item.name).toLowerCase().includes(c)))
  )

  // Explicit valid ratio for rolls (>10) or non-rolls (>1)
  if (rawRatio > 1 && (!isRoll || rawRatio > 10)) {
    return rawRatio
  }

  if (isRoll) {
    // 1. Check explicit roll dimensions
    const width = Number(
      item.roll_width_ft ||
      item.width ||
      (Array.isArray(item.available_widths_ft) && item.available_widths_ft.length > 0 ? item.available_widths_ft[0] : 0) ||
      (item.material_config as any)?.roll_width_ft ||
      (item.material_config as any)?.width ||
      (Array.isArray((item.material_config as any)?.available_widths_ft) && (item.material_config as any).available_widths_ft.length > 0 ? (item.material_config as any).available_widths_ft[0] : 0) ||
      (Array.isArray(item.roll_sizes) && item.roll_sizes.length > 0 ? (item.roll_sizes[0].width || item.roll_sizes[0].width_ft) : 0) ||
      (Array.isArray((item.material_config as any)?.roll_sizes) && (item.material_config as any).roll_sizes.length > 0 ? ((item.material_config as any).roll_sizes[0].width || (item.material_config as any).roll_sizes[0].width_ft) : 0) ||
      0
    )
    const length = Number(
      item.standard_roll_length_ft ||
      item.roll_length_ft ||
      item.length ||
      (item.material_config as any)?.standard_roll_length_ft ||
      (item.material_config as any)?.roll_length_ft ||
      (Array.isArray(item.roll_sizes) && item.roll_sizes.length > 0 ? (item.roll_sizes[0].length || item.roll_sizes[0].length_ft) : 0) ||
      164
    )

    if (width > 0 && length > 0) {
      return Math.round(width * length * 100) / 100
    }

    // 2. Cost-based derivation: purchase_price / base_cost (e.g. 6888 / 7 = 984)
    const buyPrice = Number(item.purchase_price || 0)
    const costPerSft = Number(item.base_cost || item.purchase_price_per_sft || (item.material_config as any)?.purchase_price_per_sft || 0)
    if (buyPrice > 0 && costPerSft > 0 && buyPrice > costPerSft) {
      const derived = Math.round(buyPrice / costPerSft)
      if (derived > 10) return derived
    }

    if (rawRatio > 1) return rawRatio
    return 492
  }

  // Rigid sheet
  const isSheet = Boolean(
    item.purchase_unit === 'sheet' ||
    (item.category && ['rigid_sheet', 'sheet', 'acrylic', 'pvc_board', 'foam_board', 'acp'].some((c: string) => String(item.category).toLowerCase().includes(c))) ||
    (item.name && ['sheet', 'board', 'acrylic', 'foam'].some((c: string) => String(item.name).toLowerCase().includes(c)))
  )
  if (isSheet) {
    const sw = Number(item.sheet_width_ft || item.width || (item.material_config as any)?.sheet_width_ft || 4)
    const sl = Number(item.sheet_length_ft || item.length || (item.material_config as any)?.sheet_length_ft || 8)
    if (sw > 0 && sl > 0) return sw * sl
    return 32
  }

  // Box / Pack / Packet
  const isPack = ['box', 'pack', 'carton', 'packet'].includes(String(item.purchase_unit || '').toLowerCase())
  if (isPack) {
    const packQty = Number(
      item.pack_quantity ||
      (item.material_config as any)?.pack_quantity ||
      (item.material_config as any)?.conversion_ratio ||
      1000
    )
    if (packQty > 1) return packQty
  }

  if (rawRatio > 0) return rawRatio
  return 1
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
 * Converts length to feet from any standard measurement unit.
 */
export function convertLengthToFeet(length: number, unit: string = 'ft'): number {
  const l = Math.max(0, Number(length) || 0)
  const u = (unit || 'ft').toLowerCase()
  if (u === 'inch' || u === 'in') return l / 12
  if (u === 'm' || u === 'meter' || u === 'metre') return l * 3.28084
  if (u === 'mm' || u === 'millimeter') return l / 304.8
  if (u === 'cm' || u === 'centimeter') return l / 30.48
  return l
}

/**
 * Calculates physical production dimensions, allowances, customer billable area,
 * and physical consumption area for roll/sheet materials.
 */
export function calculateProductionDimensions(params: {
  sellingWidth: number
  sellingHeight: number
  dimensionUnit?: 'ft' | 'inch' | 'm' | 'mm' | 'cm' | string
  widthAllowance?: number
  heightAllowance?: number
  lengthAllowance?: number
  allowanceUnit?: 'ft' | 'inch' | 'm' | 'mm' | 'cm' | string
  quantity?: number
}): {
  sellingWidth: number
  sellingHeight: number
  widthAllowance: number
  heightAllowance: number
  productionWidth: number
  productionHeight: number
  singleSellingAreaSqft: number
  totalSellingAreaSqft: number
  singleProductionAreaSqft: number
  totalProductionAreaSqft: number
  physicalConsumptionSqft: number
  billableAreaSqft: number
  allowanceAreaSqft: number
  allowanceRatio: number
} {
  const sW = Math.max(0, Number(params.sellingWidth) || 0)
  const sH = Math.max(0, Number(params.sellingHeight) || 0)
  const dimUnit = (params.dimensionUnit || 'ft').toLowerCase()
  const allowUnit = (params.allowanceUnit || dimUnit).toLowerCase()
  const qty = Math.max(1, Number(params.quantity) || 1)

  const wAllow = Math.max(0, Number(params.widthAllowance) || 0)
  const hAllow = Math.max(0, Number(params.heightAllowance ?? params.lengthAllowance) || 0)

  const sWFt = convertLengthToFeet(sW, dimUnit)
  const sHFt = convertLengthToFeet(sH, dimUnit)

  const wAllowFt = convertLengthToFeet(wAllow, allowUnit)
  const hAllowFt = convertLengthToFeet(hAllow, allowUnit)

  const pWFt = sWFt + wAllowFt
  const pHFt = sHFt + hAllowFt

  const singleSellingAreaSqft = Math.round(sWFt * sHFt * 10000) / 10000
  const totalSellingAreaSqft = Math.round(singleSellingAreaSqft * qty * 10000) / 10000

  const singleProductionAreaSqft = Math.round(pWFt * pHFt * 10000) / 10000
  const totalProductionAreaSqft = Math.round(singleProductionAreaSqft * qty * 10000) / 10000

  const allowanceAreaSqft = Math.round((totalProductionAreaSqft - totalSellingAreaSqft) * 10000) / 10000
  const allowanceRatio = totalSellingAreaSqft > 0 ? Math.round((totalProductionAreaSqft / totalSellingAreaSqft) * 10000) / 10000 : 1.0

  return {
    sellingWidth: sW,
    sellingHeight: sH,
    widthAllowance: wAllow,
    heightAllowance: hAllow,
    productionWidth: Math.round(pWFt * 10000) / 10000,
    productionHeight: Math.round(pHFt * 10000) / 10000,
    singleSellingAreaSqft,
    totalSellingAreaSqft,
    singleProductionAreaSqft,
    totalProductionAreaSqft,
    physicalConsumptionSqft: totalProductionAreaSqft,
    billableAreaSqft: totalSellingAreaSqft,
    allowanceAreaSqft,
    allowanceRatio,
  }
}

/**
 * Centralized Commercial Pricing Calculation Engine.
 * Evaluates pricing methods, minimum billable quantities, minimum monetary charges,
 * expected material and direct costs, component recipe rollups, multi-tier pricing resolution,
 * gross margins, production allowances, and low-margin protections.
 */
export function calculateCommercialPricing(params: {
  pricingMethod?: string
  unitPrice?: number
  catalogSellingPrice?: number
  quantity?: number
  width?: number
  height?: number
  dimensionUnit?: 'ft' | 'inch' | 'mm' | 'cm' | 'm'
  widthAllowance?: number
  heightAllowance?: number
  lengthAllowance?: number
  productionWidthAllowance?: number
  productionLengthAllowance?: number
  allowanceUnit?: 'ft' | 'inch' | 'mm' | 'cm' | 'm' | string
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
  conversionRatio?: number
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
  sellingWidth?: number
  sellingHeight?: number
  productionWidth?: number
  productionHeight?: number
  widthAllowance?: number
  heightAllowance?: number
  singleProductionAreaSqft?: number
  productionAreaSqft?: number
  physicalConsumptionSqft?: number
  expectedConsumptionUnits: number
  expectedConsumption: number
  purchaseEquivalentQuantity: number
  purchaseEquivalentConsumption: number
  costingQuantity: number
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
  const targetMargin = params.targetMarginPercent !== undefined && params.targetMarginPercent !== null && !isNaN(Number(params.targetMarginPercent))
    ? Number(params.targetMarginPercent)
    : 35.0
  const minAllowedMargin = params.minAllowedMarginPercent !== undefined && params.minAllowedMarginPercent !== null && !isNaN(Number(params.minAllowedMarginPercent))
    ? Number(params.minAllowedMarginPercent)
    : 15.0

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
  let singleAreaSqft: number | undefined
  let sellingWidth: number | undefined
  let sellingHeight: number | undefined
  let productionWidth: number | undefined
  let productionHeight: number | undefined
  let widthAllowance: number | undefined
  let heightAllowance: number | undefined
  let singleProductionAreaSqft: number | undefined
  let productionAreaSqft: number | undefined
  let physicalConsumptionSqft: number | undefined

  if (method === 'per_area') {
    if (params.width && params.height && Number(params.width) > 0 && Number(params.height) > 0) {
      const wAllow = Math.max(0, Number(params.productionWidthAllowance ?? params.widthAllowance) || 0)
      const hAllow = Math.max(0, Number(params.productionLengthAllowance ?? params.heightAllowance ?? params.lengthAllowance) || 0)
      const allowUnit = params.allowanceUnit || params.dimensionUnit || 'ft'

      const dimCalc = calculateProductionDimensions({
        sellingWidth: Number(params.width),
        sellingHeight: Number(params.height),
        dimensionUnit: params.dimensionUnit || 'ft',
        widthAllowance: wAllow,
        heightAllowance: hAllow,
        allowanceUnit: allowUnit,
        quantity: rawQty || 1,
      })

      actualQuantity = dimCalc.totalSellingAreaSqft
      areaSqft = actualQuantity
      singleAreaSqft = dimCalc.singleSellingAreaSqft
      sellingWidth = dimCalc.sellingWidth
      sellingHeight = dimCalc.sellingHeight
      productionWidth = dimCalc.productionWidth
      productionHeight = dimCalc.productionHeight
      widthAllowance = dimCalc.widthAllowance
      heightAllowance = dimCalc.heightAllowance
      singleProductionAreaSqft = dimCalc.singleProductionAreaSqft
      productionAreaSqft = dimCalc.totalProductionAreaSqft
      physicalConsumptionSqft = dimCalc.physicalConsumptionSqft
    } else {
      actualQuantity = rawQty
      areaSqft = rawQty
      singleAreaSqft = rawQty > 0 ? 1 : 0
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

  // 7. Costing & Physical Consumption Analysis
  const materialUnitCost = Math.max(0, Number(params.effectiveMaterialCost ?? params.materialUnitCost) || 0)
  const defaultWastage = Math.max(0, Number(params.defaultWastagePercent) || 0)

  // Base physical quantity before operational wastage:
  // If production dimensions exist (e.g. 33.3125 sqft), use productionAreaSqft; otherwise actualQuantity.
  const basePhysicalQuantity = productionAreaSqft !== undefined && productionAreaSqft > 0 ? productionAreaSqft : actualQuantity
  const expectedConsumptionUnits = Math.round(basePhysicalQuantity * (1 + defaultWastage / 100) * 10000) / 10000

  // Estimated Material Cost is based on physical material consumption:
  const estimatedMaterialCost = Math.round(materialUnitCost * basePhysicalQuantity * 100) / 100

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
  const estimatedDirectCost = Math.round(
    (estimatedMaterialCost + (extraDirectCostPerUnit + componentsTotalCostPerUnit) * actualQuantity) * 100
  ) / 100

  const hasExtraDirectCosts = extraDirectCostPerUnit > 0 || componentsTotalCostPerUnit > 0
  const costBasisType: 'material' | 'direct_cost' | 'none' = hasExtraDirectCosts
    ? 'direct_cost'
    : (materialUnitCost > 0 ? 'material' : 'none')

  const totalEstimatedCost = hasExtraDirectCosts ? estimatedDirectCost : estimatedMaterialCost
  const costBasisAmount = totalEstimatedCost
  const activeCostBasis =
    productionAreaSqft !== undefined && productionAreaSqft > 0 && actualQuantity > 0 && productionAreaSqft !== actualQuantity
      ? Math.round((totalEstimatedCost / actualQuantity) * 10000) / 10000
      : (hasExtraDirectCosts ? totalDirectCostPerUnit : materialUnitCost)

  const grossProfitAmount = Math.round((finalAmount - totalEstimatedCost) * 100) / 100
  const totalEstimatedProfit = grossProfitAmount
  const grossProfitPerUnit = actualQuantity > 0 ? Math.round((grossProfitAmount / actualQuantity) * 100) / 100 : Math.round((appliedSellingPrice - activeCostBasis) * 100) / 100

  const grossMarginPercent = finalAmount > 0
    ? Math.round(((finalAmount - totalEstimatedCost) / finalAmount) * 10000) / 100
    : 0

  const markupPercent = totalEstimatedCost > 0
    ? Math.round(((finalAmount - totalEstimatedCost) / totalEstimatedCost) * 10000) / 100
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
    singleAreaSqft: singleAreaSqft !== undefined ? singleAreaSqft : (areaSqft ? Math.round((areaSqft / (rawQty || 1)) * 100) / 100 : 0),
    lengthRft,
    sellingWidth,
    sellingHeight,
    productionWidth,
    productionHeight,
    widthAllowance,
    heightAllowance,
    singleProductionAreaSqft,
    productionAreaSqft,
    physicalConsumptionSqft,
    expectedConsumptionUnits,
    expectedConsumption: expectedConsumptionUnits,
    purchaseEquivalentQuantity: Math.round((actualQuantity / Math.max(0.0001, Number(params.conversionRatio) || 1.0)) * 10000) / 10000,
    purchaseEquivalentConsumption: Math.round((expectedConsumptionUnits / Math.max(0.0001, Number(params.conversionRatio) || 1.0)) * 10000) / 10000,
    costingQuantity: basePhysicalQuantity,
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

/**
 * Authoritative Entity Type Classification
 * Standardizes categorization across Catalog, Detail Pages, Quoting, Invoicing, and Order Processing.
 */
export function isOutsourceProduct(p: Partial<ProductRecord> | any): boolean {
  if (!p) return false
  const raw = p as any
  if (raw.workflow_routing === 'outsource' || raw.item_kind === 'outsource') return true
  const cat = (raw.category || '').toLowerCase()
  const sku = (raw.sku || '').toUpperCase()

  return Boolean(
    raw.is_outsource === true ||
    raw.is_non_inventory === true ||
    raw.entity_type === 'outsource' ||
    raw.commercial_type === 'outsource' ||
    raw.product_type === 'outsource' ||
    raw.product_type === 'outsource_product' ||
    sku.startsWith('OUT-') ||
    cat === 'outsource' ||
    cat.startsWith('outsource_') ||
    cat === 'subcontract' ||
    (raw.outsource_config && typeof raw.outsource_config === 'object' && Object.keys(raw.outsource_config).length > 0)
  )
}

export function isServiceProduct(p: Partial<ProductRecord> | null | undefined): boolean {
  if (!p) return false
  if (isOutsourceProduct(p)) return false
  const cat = (p.category || '').toLowerCase()
  const name = (p.name || '').toLowerCase()
  const sku = (p.sku || '').toUpperCase()

  // 1. Explicit Service Flags, Types or Prefixes
  if (
    p.entity_type === 'service' ||
    p.entity_type === 'finishing' ||
    p.entity_type === 'installation' ||
    p.entity_type === 'additional' ||
    p.is_service === true ||
    p.product_type === 'print_service' ||
    p.product_type === 'service' ||
    p.product_type === 'SERVICE' ||
    p.product_type === 'fabrication_service' ||
    p.product_type === 'installation_service' ||
    p.product_type === 'finishing' ||
    p.product_type === 'fabrication' ||
    p.product_type === 'installation' ||
    p.product_type === 'delivery' ||
    p.product_type === 'production' ||
    p.product_type === 'production_product' ||
    p.product_type === 'custom_job' ||
    p.commercial_type === 'service' ||
    p.commercial_type === 'production_product' ||
    p.commercial_type === 'finishing' ||
    p.commercial_type === 'fabrication' ||
    p.commercial_type === 'installation' ||
    p.commercial_type === 'delivery' ||
    sku.startsWith('SRV-') ||
    sku.startsWith('PRN-') ||
    sku.startsWith('FIN-') ||
    sku.startsWith('FAB-') ||
    sku.startsWith('INS-')
  ) {
    return true
  }

  // 2. Ready Product Check - if explicitly a ready product, not a service
  if (
    p.is_ready_product === true ||
    p.commercial_type === 'ready_product' ||
    p.product_type === 'ready_product' ||
    p.product_type === 'finished_product' ||
    (p.product_type as any) === 'finished_good' ||
    p.product_type === 'PRODUCT' ||
    sku.startsWith('RP-') ||
    ['display_stands', 'frames_hardware', 'signage_accessories', 'acrylic_displays', 'promo_items', 'apparel_blanks', 'ready_products'].includes(cat)
  ) {
    return false
  }

  // 3. Service configuration object presence
  if (p.service_config && typeof p.service_config === 'object' && Object.keys(p.service_config).length > 0 && (p.entity_type as string) !== 'product' && !p.is_ready_product && (p.product_type as string) !== 'ready_product') {
    return true
  }

  // 4. Service by Name or Category Keywords (Lamination, Printing, Fabrication, Installation, Service, Finishing)
  if (
    ['services', 'printing', 'printing_services', 'print_services', 'custom_printing', 'fabrication', 'installation', 'finishing', 'lamination', 'signage'].includes(cat) ||
    name.includes('lamination') ||
    name.includes('lamication') ||
    name.includes('printing') ||
    name.includes('fabrication') ||
    name.includes('installation') ||
    name.includes('service')
  ) {
    return true
  }

  // 5. Area or Running-Length Dimensional Units / Pricing methods
  if (
    p.unit === 'sft' ||
    p.unit === 'sqft' ||
    p.unit === 'sqm' ||
    p.unit === 'sqin' ||
    p.unit === 'rft' ||
    p.selling_unit === 'sft' ||
    p.selling_unit === 'sqft' ||
    p.selling_unit === 'sqm' ||
    p.selling_unit === 'sqin' ||
    p.selling_unit === 'rft' ||
    (p.pricing_method as string) === 'per_sqft' ||
    p.pricing_method === 'per_sft' ||
    p.pricing_method === 'per_rft' ||
    p.pricing_method === 'per_area' ||
    p.pricing_method === 'per_length' ||
    p.pricing_method === 'dimensional_area' ||
    p.pricing_method === 'running_length' ||
    p.pricing_method === 'compound_signage' ||
    (p.pricing_method as string) === 'per_meter'
  ) {
    // Check if it is a pure raw inventory material
    const isPureRawRollStock =
      (sku.startsWith('MAT-') || sku.startsWith('RM-')) &&
      (cat === 'roll_media' || cat === 'rigid_sheets' || cat === 'inks' || p.product_type === 'material') &&
      p.entity_type === 'material' &&
      !p.is_service

    if (!isPureRawRollStock) {
      return true
    }
  }

  return false
}

export function isReadyProduct(p: Partial<ProductRecord> | any | null | undefined): boolean {
  if (!p) return false
  if (isOutsourceProduct(p)) return false

  // If item explicitly requires design or pre-press checking or is a custom manufacturing job, it is not a ready product
  const rawAny = p as any
  if (
    rawAny.workflow_routing === 'design_required' ||
    rawAny.workflow_routing === 'design_ok' ||
    rawAny.workflow_routing === 'ready_production' ||
    rawAny.design_required === true ||
    rawAny.design_required === 'true' ||
    rawAny.item_kind === 'custom_manufacturing' ||
    rawAny.item_kind === 'service' ||
    rawAny.item_kind === 'custom' ||
    Boolean(rawAny.design_number) ||
    Boolean(rawAny.versions)
  ) {
    return false
  }

  if (isServiceProduct(p)) return false
  const cat = (p.category || '').toLowerCase()
  const sku = (p.sku || '').toUpperCase()

  return Boolean(
    p.entity_type === 'product' ||
    (p.entity_type as string) === 'ready_product' ||
    p.is_ready_product === true ||
    p.product_type === 'ready_product' ||
    p.product_type === 'PRODUCT' ||
    p.product_type === 'finished_product' ||
    (p.product_type as any) === 'finished_good' ||
    p.commercial_type === 'ready_product' ||
    sku.startsWith('RP-') ||
    ['display_stands', 'frames_hardware', 'signage_accessories', 'acrylic_displays', 'promo_items', 'apparel_blanks', 'ready_products'].includes(cat) ||
    ((p.unit === 'pcs' ||
      p.unit === 'piece' ||
      p.unit === 'set' ||
      p.unit === 'box' ||
      p.unit === 'pack' ||
      p.unit === 'pair' ||
      p.unit === 'carton' ||
      p.unit === 'kg' ||
      p.selling_unit === 'pcs' ||
      p.selling_unit === 'piece' ||
      p.selling_unit === 'set' ||
      p.selling_unit === 'box' ||
      p.selling_unit === 'pack' ||
      p.selling_unit === 'pair' ||
      p.selling_unit === 'carton' ||
      p.selling_unit === 'kg' ||
      p.pricing_method === 'per_piece' ||
      p.pricing_method === 'fixed' ||
      (p.pricing_method as string) === 'per_item' ||
      (p.pricing_method as string) === 'per_unit') &&
      p.entity_type !== 'material' &&
      p.product_type !== 'material' &&
      p.commercial_type !== 'material' &&
      !sku.startsWith('MAT-') &&
      !sku.startsWith('RM-') &&
      cat !== 'materials' &&
      cat !== 'roll_media' &&
      cat !== 'rigid_sheets' &&
      cat !== 'inks')
  )
}

export function isMaterialProduct(p: Partial<ProductRecord> | null | undefined): boolean {
  if (!p) return false
  if (isOutsourceProduct(p)) return false
  if (isServiceProduct(p) || isReadyProduct(p)) return false
  const cat = (p.category || '').toLowerCase()
  const sku = (p.sku || '').toUpperCase()

  return Boolean(
    p.entity_type === 'material' ||
    p.product_type === 'material' ||
    (p.product_type as any) === 'raw_material' ||
    p.commercial_type === 'material' ||
    cat === 'materials' ||
    cat === 'roll_media' ||
    cat === 'rigid_sheets' ||
    cat === 'inks' ||
    cat === 'raw_materials' ||
    sku.startsWith('MAT-') ||
    sku.startsWith('RM-') ||
    (p.material_config && typeof p.material_config === 'object' && Object.keys(p.material_config).length > 0)
  )
}

export function getProductEntityKind(p: Partial<ProductRecord> | null | undefined): 'service' | 'material' | 'product' | 'outsource' {
  if (!p) return 'product'
  if (isOutsourceProduct(p)) return 'outsource'
  if (isServiceProduct(p)) return 'service'
  if (isReadyProduct(p)) return 'product'
  if (isMaterialProduct(p)) return 'material'
  return 'product'
}

export function getProductEntityKindLabel(p: Partial<ProductRecord> | null | undefined): 'Service' | 'Raw Material' | 'Ready Product' | 'Outsource (Non-Inventory)' {
  const kind = getProductEntityKind(p)
  if (kind === 'outsource') return 'Outsource (Non-Inventory)'
  if (kind === 'service') return 'Service'
  if (kind === 'material') return 'Raw Material'
  return 'Ready Product'
}

/**
 * ----------------------------------------------------------------------------------
 * BANGLADESHI INDUSTRIAL PRINTING & SIGNAGE CALCULATION EXTENSIONS
 * Specially designed for Offset Presses (Arambagh/Nilkhet/Tejgaon), Digital & Signage
 * ----------------------------------------------------------------------------------
 */

export interface OffsetPaperCalculationInput {
  totalCopies: number
  pagesPerCopy: number
  cutPerSheet: number
  isDoubleSided?: boolean
  wastagePercent?: number
  sheetsPerReam?: number
  reamPurchasePrice?: number
  plateCount?: number
  plateCostPerUnit?: number
  impressionRatePerThousand?: number
}

export interface OffsetPaperCalculationResult {
  totalSignaturesOrFormas: number
  totalImpressions: number
  netSheetsRequired: number
  wastageSheets: number
  grossFullSheetsRequired: number
  fullReamsRequired: number
  remainderSheets: number
  totalReamsFractional: number
  estimatedPaperCost: number
  totalPlates: number
  estimatedPlateCost: number
  thousandImpressionsCount: number
  estimatedImpressionCost: number
  totalProductionCost: number
  costPerCopy: number
}

/**
 * Calculates complete Offset Press Paper, CTP Plate & Impression breakdown.
 */
export function calculateOffsetPaperRequirement(
  input: OffsetPaperCalculationInput
): OffsetPaperCalculationResult {
  const copies = Math.max(1, Number(input.totalCopies) || 1)
  const pages = Math.max(1, Number(input.pagesPerCopy) || 1)
  const cut = Math.max(1, Number(input.cutPerSheet) || 1)
  const isDouble = input.isDoubleSided !== false
  const wastePct = Math.min(50, Math.max(0, Number(input.wastagePercent) || 5))
  const sheetsPerReam = Math.max(100, Number(input.sheetsPerReam) || 500)
  const reamPrice = Math.max(0, Number(input.reamPurchasePrice) || 0)
  const plateCost = Math.max(0, Number(input.plateCostPerUnit) || 0)
  const impRatePerK = Math.max(0, Number(input.impressionRatePerThousand) || 0)

  const pagesPerFullSheet = isDouble ? cut * 2 : cut
  const totalFormas = Math.ceil(pages / Math.max(1, pagesPerFullSheet))

  const netSheets = Math.ceil((copies * pages) / Math.max(1, pagesPerFullSheet))
  const wastageSheets = Math.ceil(netSheets * (wastePct / 100))
  const grossSheets = netSheets + wastageSheets

  const fullReams = Math.floor(grossSheets / sheetsPerReam)
  const remainderSheets = grossSheets % sheetsPerReam
  const totalReamsFractional = Math.round((grossSheets / sheetsPerReam) * 1000) / 1000

  const paperCost = Math.round(totalReamsFractional * reamPrice * 100) / 100

  const defaultPlates = totalFormas * (isDouble ? 8 : 4)
  const totalPlates = input.plateCount !== undefined ? Math.max(0, input.plateCount) : defaultPlates
  const plateTotalCost = Math.round(totalPlates * plateCost * 100) / 100

  const sidesPerSheet = isDouble ? 2 : 1
  const totalImpressions = grossSheets * sidesPerSheet
  const thousandImpressionsCount = Math.round((totalImpressions / 1000) * 100) / 100
  const impressionCost = Math.round((totalImpressions / 1000) * impRatePerK * 100) / 100

  const totalProdCost = Math.round((paperCost + plateTotalCost + impressionCost) * 100) / 100
  const costPerCopy = Math.round((totalProdCost / copies) * 100) / 100

  return {
    totalSignaturesOrFormas: totalFormas,
    totalImpressions,
    netSheetsRequired: netSheets,
    wastageSheets,
    grossFullSheetsRequired: grossSheets,
    fullReamsRequired: fullReams,
    remainderSheets,
    totalReamsFractional,
    estimatedPaperCost: paperCost,
    totalPlates,
    estimatedPlateCost: plateTotalCost,
    thousandImpressionsCount,
    estimatedImpressionCost: impressionCost,
    totalProductionCost: totalProdCost,
    costPerCopy,
  }
}

/**
 * 3D Letter & Signage Structure Bill of Materials (BOM) & Power Calculator
 */
export interface SignageStructureBOMInput {
  widthFt: number
  heightFt: number
  hasBacklitLED?: boolean
  ledModulesPerSqft?: number
  ledWattsPerModule?: number
  frameProfileSizeInch?: number
  hasACPBacking?: boolean
  acrylicFaceThicknessMm?: number
  hasSSBorder?: boolean
}

export interface SignageStructureBOMResult {
  totalSignboardAreaSqft: number
  perimeterRft: number
  msPipeRequiredRft: number
  acpBackingSqft: number
  acrylicFaceSqft: number
  totalLedModules: number
  totalLedWattage: number
  recommendedPowerSupplyWattage: number
  powerSupplyCount: number
}

export function calculateSignageStructureBOM(
  input: SignageStructureBOMInput
): SignageStructureBOMResult {
  const w = Math.max(0.5, Number(input.widthFt) || 1)
  const h = Math.max(0.5, Number(input.heightFt) || 1)
  const area = Math.round(w * h * 100) / 100
  const perimeter = Math.round((2 * (w + h)) * 100) / 100

  const verticalBraces = Math.max(0, Math.floor(w / 2) - 1)
  const horizontalBraces = Math.max(0, Math.floor(h / 2) - 1)
  const internalBraceRft = verticalBraces * h + horizontalBraces * w
  const msPipeRequiredRft = Math.round((perimeter + internalBraceRft) * 100) / 100

  const acpBackingSqft = input.hasACPBacking !== false ? area : 0
  const acrylicFaceSqft = area

  const hasLED = input.hasBacklitLED !== false
  const ledDensity = Math.max(6, Number(input.ledModulesPerSqft) || 14)
  const ledWatts = Math.max(0.5, Number(input.ledWattsPerModule) || 1.2)

  const totalLedModules = hasLED ? Math.ceil(area * ledDensity) : 0
  const totalLedWattage = Math.round(totalLedModules * ledWatts * 10) / 10

  const recommendedPSWatts = hasLED ? Math.ceil((totalLedWattage / 0.8) / 50) * 50 : 0
  const powerSupplyCount = hasLED ? Math.max(1, Math.ceil(recommendedPSWatts / 400)) : 0

  return {
    totalSignboardAreaSqft: area,
    perimeterRft: perimeter,
    msPipeRequiredRft,
    acpBackingSqft,
    acrylicFaceSqft,
    totalLedModules,
    totalLedWattage,
    recommendedPowerSupplyWattage: recommendedPSWatts,
    powerSupplyCount,
  }
}

export interface InventoryCanonicalAttributes {
  name: string
  width_ft: number
  length_ft: number
  allowance_ft: number
  purchase_price: number
  gsm: number
  finishing: string
}

/**
 * Normalizes an inventory grouping attribute set according to the canonical 7-attribute ERP rule:
 * 1. Material/Product Name
 * 2. Width (ft)
 * 3. Length (ft)
 * 4. Allowance (ft)
 * 5. Purchase Price (BDT / unit cost)
 * 6. GSM
 * 7. Finishing
 *
 * If even ONE attribute is different, the item belongs to a separate group.
 * Normalizes technical representations (e.g. 2 ft vs 2.00 ft, null/empty allowance, etc.)
 */
export function normalizeInventoryGroupAttributes(raw: {
  name?: string | null
  material_name?: string | null
  product_name?: string | null
  width?: number | string | null
  width_ft?: number | string | null
  nominal_width_ft?: number | string | null
  length?: number | string | null
  length_ft?: number | string | null
  initial_length_ft?: number | string | null
  current_length_ft?: number | string | null
  standard_roll_length_ft?: number | string | null
  allowance?: number | string | null
  allowance_ft?: number | string | null
  extra_allowance?: number | string | null
  production_width_allowance?: number | string | null
  extra_width_allowance_ft?: number | string | null
  purchase_price?: number | string | null
  unit_cost?: number | string | null
  cost_per_unit?: number | string | null
  average_cost?: number | string | null
  last_purchase_price?: number | string | null
  base_cost?: number | string | null
  gsm?: number | string | null
  weight_gsm?: number | string | null
  finishing?: string | null
  finish?: string | null
  default_finishing?: string | null
  finish_color?: string | null
  specification?: string | null
  material_spec?: string | null
}): InventoryCanonicalAttributes {
  // 1. Name: trimmed string (preserve casing in display, lowercase for key)
  const rawName = String(raw.name || raw.material_name || raw.product_name || 'Item').trim()

  // 2. Width: numeric value in feet normalized (e.g. 2, 2.25)
  const rawW = Number(raw.width_ft ?? raw.nominal_width_ft ?? raw.width ?? 0)
  const width_ft = isNaN(rawW) || rawW < 0 ? 0 : Math.round(rawW * 10000) / 10000

  // 3. Length: numeric value in feet normalized (e.g. 100, 164, 400)
  const rawL = Number(
    raw.length_ft ??
    raw.current_length_ft ??
    raw.initial_length_ft ??
    raw.standard_roll_length_ft ??
    raw.length ??
    0
  )
  const length_ft = isNaN(rawL) || rawL < 0 ? 0 : Math.round(rawL * 10000) / 10000

  // 4. Allowance: numeric value in feet (null/undefined/empty => 0)
  const rawAllow = raw.allowance_ft !== undefined && raw.allowance_ft !== null
    ? Number(raw.allowance_ft)
    : raw.extra_allowance !== undefined && raw.extra_allowance !== null
    ? Number(raw.extra_allowance)
    : raw.allowance !== undefined && raw.allowance !== null
    ? Number(raw.allowance)
    : 0
  const allowance_ft = isNaN(rawAllow) || rawAllow <= 0 ? 0 : Math.round(rawAllow * 10000) / 10000

  // 5. Purchase Price: numeric value with exact 2-decimal precision (never round in a way that merges 1000 and 1050)
  const rawPrice = Number(
    raw.purchase_price ??
    raw.unit_cost ??
    raw.cost_per_unit ??
    raw.last_purchase_price ??
    raw.average_cost ??
    raw.base_cost ??
    0
  )
  const purchase_price = isNaN(rawPrice) || rawPrice < 0 ? 0 : Math.round(rawPrice * 100) / 100

  // 6. GSM: numeric value (extract from raw.gsm, raw.weight_gsm, or parse from spec/name)
  let rawGsm = Number(raw.gsm ?? raw.weight_gsm ?? 0)
  if (!rawGsm || isNaN(rawGsm)) {
    const specStr = `${rawName} ${raw.specification || ''} ${raw.material_spec || ''}`
    const match = specStr.match(/(\d+)\s*gsm/i)
    if (match) {
      rawGsm = Number(match[1])
    }
  }
  const gsm = isNaN(rawGsm) || rawGsm <= 0 ? 0 : Math.round(rawGsm)

  // 7. Finishing: normalized string (null, undefined, '', 'none', 'None', '-' => 'none')
  let rawFin = String(raw.finishing || raw.finish || raw.default_finishing || raw.finish_color || '').trim()
  if (!rawFin || rawFin.toLowerCase() === 'none' || rawFin.toLowerCase() === 'null' || rawFin.toLowerCase() === 'undefined' || rawFin === '-') {
    rawFin = 'none'
  }

  return {
    name: rawName,
    width_ft,
    length_ft,
    allowance_ft,
    purchase_price,
    gsm,
    finishing: rawFin,
  }
}

/**
 * Creates a deterministic canonical grouping key based on the 7 canonical attributes.
 */
export function createInventoryGroupingKey(attrs: InventoryCanonicalAttributes): string {
  const normName = attrs.name.trim().toLowerCase().replace(/\s+/g, ' ')
  const w = attrs.width_ft.toFixed(4).replace(/\.?0+$/, '')
  const l = attrs.length_ft.toFixed(4).replace(/\.?0+$/, '')
  const a = attrs.allowance_ft.toFixed(4).replace(/\.?0+$/, '')
  const p = attrs.purchase_price.toFixed(2).replace(/\.?0+$/, '')
  const g = String(attrs.gsm || 0)
  const f = attrs.finishing.trim().toLowerCase().replace(/\s+/g, ' ')

  return `grp|${normName}|w:${w}|l:${l}|a:${a}|p:${p}|gsm:${g}|f:${f}`
}

export interface WarehouseRollStockItem {
  key?: string
  name?: string
  width_ft: number
  length_ft: number
  allowance_ft?: number
  purchase_price?: number
  gsm?: number
  finishing?: string
  roll_count: number
  total_sft: number
  unit_cost?: number
  total_valuation?: number
  label?: string
}

export interface MaterialWarehouseStockBreakdown {
  is_roll: boolean
  purchase_unit_display: string
  consumption_unit_display: string
  roll_items: WarehouseRollStockItem[]
  total_rolls: number
  total_stock_display: string
  formatted_summary: string
  purchase_unit: string
  consumption_unit: string
  cost_per_purchase_unit: number
  cost_per_consumption_unit: number
  cost_display_primary: string
  cost_display_secondary: string | null
  total_valuation: number
}

/**
 * Calculates and formats warehouse stock in Purchase Units (Rolls, Sheets, Cans, Boxes)
 * along with normalized unit costs and accurate inventory valuation, strictly applying
 * the 7 canonical attributes grouping rule.
 */
export function getMaterialWarehouseStockBreakdown(
  material: any,
  warehouseRolls?: any[]
): MaterialWarehouseStockBreakdown {
  if (!material) {
    return {
      is_roll: false,
      purchase_unit_display: '0 units',
      consumption_unit_display: '0 units',
      roll_items: [],
      total_rolls: 0,
      total_stock_display: '0',
      formatted_summary: '',
      purchase_unit: 'pcs',
      consumption_unit: 'pcs',
      cost_per_purchase_unit: 0,
      cost_per_consumption_unit: 0,
      cost_display_primary: '৳ 0',
      cost_display_secondary: null,
      total_valuation: 0,
    }
  }

  const currentStock = Number(material.current_stock ?? material.stock ?? 0)
  const rawCost = Number(
    material.average_cost ||
    material.last_purchase_price ||
    material.cost_per_unit ||
    material.purchase_price ||
    material.base_cost ||
    material.cost ||
    material.unit_cost ||
    material.purchase_price_per_sft ||
    (material.material_config as any)?.purchase_price ||
    (material.material_config as any)?.cost_per_unit ||
    (material.material_config as any)?.average_cost ||
    (material.material_config as any)?.last_purchase_price ||
    (material.material_config as any)?.purchase_price_per_sft ||
    (material.material_config as any)?.base_cost ||
    (material.pricing_formula as any)?.material_rate ||
    (material.pricing_formula as any)?.base_cost ||
    (material.pricing_formula as any)?.base_rate ||
    (material.pricing_formula as any)?.cost_breakdown?.material ||
    (material.pricing_formula as any)?.cost_breakdown?.material_cost ||
    (material.pricing_formula as any)?.material_config?.purchase_price ||
    (material.pricing_formula as any)?.material_config?.purchase_price_per_sft ||
    (material.cost_breakdown as any)?.material ||
    (material.cost_breakdown as any)?.material_cost ||
    material.selling_price ||
    0
  )
  const consumptionUnit = String(material.unit || material.selling_unit || 'pcs').toLowerCase()
  const matCategory = String(material.category || '').toLowerCase()
  const matName = String(material.name || '').toLowerCase()
  const rawPurchaseUnit = String(
    material.purchase_unit ||
    material.master_purchase_unit ||
    (material.material_config as any)?.purchase_unit ||
    ''
  ).toLowerCase()

  const isExplicitSheet =
    rawPurchaseUnit === 'sheet' ||
    ['rigid_sheet', 'rigid_sheets', 'acrylic', 'pvc_board', 'foam_board', 'acp'].some(c => matCategory.includes(c)) ||
    (material.is_roll === false && (matName.includes('sheet') || matName.includes('board') || matName.includes('acrylic') || matName.includes('foam')))

  const isRoll =
    !isExplicitSheet &&
    (Boolean(material.is_roll) ||
      rawPurchaseUnit === 'roll' ||
      ['roll_media', 'flex', 'flex_banner', 'banner', 'vinyl', 'sticker_paper', 'pvc', 'fabric', 'lamination_film', 'mesh', 'canvas', 'paper_roll'].some(c => matCategory.includes(c)) ||
      (['flex', 'vinyl', 'banner', 'sticker', 'canvas', 'mesh', 'sav'].some(c => matName.includes(c)) && !matName.includes('stand') && !matName.includes('standee') && !matName.includes('frame') && !matName.includes('hardware') && !matName.includes('sheet') && !matName.includes('board')) ||
      (material.is_roll !== false && !['box', 'pack', 'carton', 'bottle', 'can', 'sheet', 'pcs', 'piece'].includes(rawPurchaseUnit) && ['sft', 'sqft'].includes(consumptionUnit)))

  if (isRoll) {
    // 1. Check if explicit physical rolls exist in warehouse
    const matRolls = (warehouseRolls || []).filter(
      (r) =>
        (r.material_id === material.id || (material.sku && r.material?.sku && r.material.sku.toLowerCase() === material.sku.toLowerCase())) &&
        (r.status === 'in_warehouse' || r.status === 'available' || !r.status) &&
        r.location_name !== 'Print Floor' &&
        (!r.mounted_machine_id && !r.mounted_machine_name)
    )

    const standardLength = Number(material.standard_roll_length_ft || material.roll_length_ft || material.length || 164)
    const globalAllowance = Number(
      material.production_width_allowance ??
      (material.material_config as any)?.extra_width_allowance_ft ??
      (material.material_config as any)?.production_width_allowance ??
      (material.pricing_formula as any)?.extra_width_allowance_ft ??
      (material.pricing_formula as any)?.production_width_allowance ??
      0
    )

    // Determine configured roll sizes from roll_sizes array, material_config, pricing_formula, or variants
    const rawRollSizes: any[] = Array.isArray(material.roll_sizes) && material.roll_sizes.length > 0
      ? material.roll_sizes
      : Array.isArray((material.material_config as any)?.roll_sizes) && (material.material_config as any).roll_sizes.length > 0
      ? (material.material_config as any).roll_sizes
      : Array.isArray((material.pricing_formula as any)?.roll_sizes) && (material.pricing_formula as any).roll_sizes.length > 0
      ? (material.pricing_formula as any).roll_sizes
      : Array.isArray((material.pricing_formula as any)?.material_config?.roll_sizes) && (material.pricing_formula as any).material_config.roll_sizes.length > 0
      ? (material.pricing_formula as any).material_config.roll_sizes
      : Array.isArray(material.variants) && material.variants.length > 0
      ? material.variants
      : []

    // Determine roll width (prioritizing explicit master configuration & configured sizes)
    let inferredWidth = Number(
      material.roll_width_ft ||
      (rawRollSizes.length > 0 ? (rawRollSizes[0].width || rawRollSizes[0].width_ft || rawRollSizes[0].size) : 0) ||
      material.width ||
      (Array.isArray(material.available_widths_ft) && material.available_widths_ft.length === 1 ? material.available_widths_ft[0] : 0) ||
      (matName.includes('10ft') || matName.includes('10 ft') ? 10 :
       matName.includes('8ft') || matName.includes('8 ft') ? 8 :
       matName.includes('7ft') || matName.includes('7 ft') ? 7 :
       matName.includes('6ft') || matName.includes('6 ft') ? 6 :
       matName.includes('5ft') || matName.includes('5 ft') ? 5 :
       matName.includes('4ft') || matName.includes('4 ft') ? 4 :
       matName.includes('3.2ft') || matName.includes('3.2 ft') ? 3.2 : 0)
    )

    if (!inferredWidth && currentStock > 0 && standardLength > 0) {
      const ratio = currentStock / standardLength
      if (currentStock % standardLength === 0 || [3, 3.2, 3.25, 4, 4.25, 5, 6, 7, 8, 10, 10.5, 12, 12.5].includes(ratio)) {
        inferredWidth = ratio
      } else {
        inferredWidth = Math.max(3.2, Math.round(ratio * 10) / 10)
      }
    }
    if (!inferredWidth) inferredWidth = 4

    // Derive reference per-SFT rate and reference master area for proportional roll costing
    const explicitPerSft = Number(
      material.purchase_price_per_sft ||
      (material.material_config as any)?.purchase_price_per_sft ||
      (material.pricing_formula as any)?.purchase_price_per_sft ||
      (material.pricing_formula as any)?.material_config?.purchase_price_per_sft ||
      (material.cost_breakdown as any)?.material ||
      (material.cost_breakdown as any)?.material_cost ||
      0
    )

    const masterWidthRef = Number(
      material.roll_width_ft ||
      (rawRollSizes.length > 0 ? (rawRollSizes[0].width || rawRollSizes[0].width_ft || rawRollSizes[0].size) : 0) ||
      inferredWidth ||
      4
    )
    const masterAreaRef = (masterWidthRef + globalAllowance) * standardLength
    const derivedPerSft = explicitPerSft > 0
      ? explicitPerSft
      : rawCost > 0
      ? (rawCost <= 150 ? rawCost : (masterAreaRef > 0 ? rawCost / masterAreaRef : (rawCost / (inferredWidth * standardLength))))
      : 0

    let totalRolls = 0
    let rollItems: WarehouseRollStockItem[] = []
    let totalSft = 0
    let totalValuationCalculated = 0

    const map = new Map<string, WarehouseRollStockItem>()

    if (matRolls.length > 0) {
      // Group discrete warehouse physical rolls strictly using the 7 canonical attributes
      for (const r of matRolls) {
        const w = Number(r.width_ft) || inferredWidth
        const l = Number(r.current_length_ft ?? r.initial_length_ft) || standardLength
        const rawRollAllow = Number((r as any).allowance_ft ?? (r as any).extra_allowance ?? (r as any).allowance ?? 0)
        const allow = rawRollAllow
        let pPrice = Number(r.unit_cost ?? (r as any).purchase_price ?? 0)
        if (pPrice <= 0) {
          if (derivedPerSft > 0) {
            pPrice = Math.round(derivedPerSft * (w * l))
          } else if (rawCost > 0) {
            pPrice = rawCost <= 150 ? Math.round(rawCost * (w * l)) : rawCost
          }
        }
        const gsm = Number((r as any).gsm ?? material.gsm ?? (material as any)?.weight_gsm ?? 0)
        const fin = String((r as any).finishing ?? (r as any).finish ?? material.default_finishing ?? (material as any)?.finish ?? 'none')

        const attrs = normalizeInventoryGroupAttributes({
          name: material.name,
          width_ft: w,
          length_ft: l,
          allowance_ft: allow,
          purchase_price: pPrice,
          gsm: gsm,
          finishing: fin,
          specification: material.specification,
          material_spec: (material as any)?.material_spec,
        })
        const key = createInventoryGroupingKey(attrs)
        const sft = Number(r.remaining_area_sft ?? r.initial_area_sft ?? (attrs.width_ft * attrs.length_ft))

        const rollCost = attrs.purchase_price > 0
          ? (attrs.purchase_price > 150 ? attrs.purchase_price : attrs.purchase_price * (attrs.width_ft * attrs.length_ft))
          : (rawCost > 150 ? rawCost : rawCost * (attrs.width_ft * attrs.length_ft))
        const itemValuation = rollCost > 0 ? rollCost : 0

        if (!map.has(key)) {
          map.set(key, {
            key,
            name: attrs.name,
            width_ft: attrs.width_ft,
            length_ft: attrs.length_ft,
            allowance_ft: attrs.allowance_ft,
            purchase_price: attrs.purchase_price,
            gsm: attrs.gsm,
            finishing: attrs.finishing,
            roll_count: 0,
            total_sft: 0,
            unit_cost: attrs.purchase_price,
            total_valuation: 0,
            label: `${attrs.width_ft}ft × ${attrs.length_ft}ft`,
          })
        }
        const item = map.get(key)!
        item.roll_count += 1
        item.total_sft += sft
        item.total_valuation = (item.total_valuation || 0) + itemValuation
      }

      // If there are configured sizes not represented in physical rolls, add them with explicit count if any, or 0 count
      if (rawRollSizes.length > 0) {
        for (const rs of rawRollSizes) {
          const rawW = Number(rs.nominal_width_ft || rs.width || rs.width_ft || rs.size || inferredWidth || 4)
          const rawRsAllow = rs.extra_allowance !== undefined
            ? Number(rs.extra_allowance)
            : rs.allowance !== undefined
            ? Number(rs.allowance)
            : rs.allowance_ft !== undefined
            ? Number(rs.allowance_ft)
            : 0
          const allowance = rawRsAllow
          const w = rs.width_ft !== undefined && Number(rs.width_ft) > 0
            ? Number(rs.width_ft)
            : ((allowance > 0) ? Math.round((rawW + allowance) * 100) / 100 : rawW)
          const l = Number(rs.length || rs.length_ft || standardLength)
          const explicitCount = Number(rs.quantity ?? rs.stock_qty ?? rs.stock ?? rs.roll_count ?? rs.count ?? 0)
          const rollArea = w * l
          let price = Number(rs.price ?? rs.unit_cost ?? rs.purchase_price ?? 0)
          if (price <= 0) {
            if (derivedPerSft > 0) {
              price = Math.round(derivedPerSft * rollArea)
            } else if (rawCost > 0) {
              price = rawCost <= 150 ? Math.round(rawCost * rollArea) : rawCost
            } else {
              price = 0
            }
          }
          const gsm = Number(rs.gsm ?? material.gsm ?? (material as any)?.weight_gsm ?? 0)
          const fin = String(rs.finishing ?? rs.finish ?? material.default_finishing ?? (material as any)?.finish ?? 'none')

          const attrs = normalizeInventoryGroupAttributes({
            name: material.name,
            width_ft: w,
            length_ft: l,
            allowance_ft: allowance,
            purchase_price: price,
            gsm: gsm,
            finishing: fin,
            specification: material.specification,
            material_spec: (material as any)?.material_spec,
          })
          const key = createInventoryGroupingKey(attrs)

          const matchedItem = Array.from(map.values()).find(
            (item) => (Math.abs(item.width_ft - attrs.width_ft) < 0.05 || Math.abs(item.width_ft - rawW) < 0.05) && Math.abs(item.length_ft - attrs.length_ft) < 0.05
          )

          const rollCost = attrs.purchase_price > 0
            ? (attrs.purchase_price > 150 ? attrs.purchase_price : attrs.purchase_price * (attrs.width_ft * attrs.length_ft))
            : (rawCost > 150 ? rawCost : rawCost * (attrs.width_ft * attrs.length_ft))

          if (matchedItem) {
            if (explicitCount > matchedItem.roll_count) {
              matchedItem.roll_count = explicitCount
              matchedItem.total_sft = explicitCount * (matchedItem.width_ft * matchedItem.length_ft)
              matchedItem.total_valuation = explicitCount * (matchedItem.unit_cost || rollCost)
            }
          } else if (!map.has(key)) {
            const itemSft = explicitCount > 0 ? explicitCount * attrs.width_ft * attrs.length_ft : 0
            const itemVal = explicitCount * rollCost
            map.set(key, {
              key,
              name: attrs.name,
              width_ft: attrs.width_ft,
              length_ft: attrs.length_ft,
              allowance_ft: attrs.allowance_ft,
              purchase_price: attrs.purchase_price,
              gsm: attrs.gsm,
              finishing: attrs.finishing,
              roll_count: explicitCount,
              total_sft: itemSft,
              unit_cost: attrs.purchase_price,
              total_valuation: itemVal,
              label: `${attrs.width_ft}ft × ${attrs.length_ft}ft`,
            })
          }
        }
      }

      if (currentStock <= 0) {
        for (const item of map.values()) {
          item.roll_count = 0
          item.total_sft = 0
          item.total_valuation = 0
        }
      }

      rollItems = Array.from(map.values()).sort((a, b) => a.width_ft - b.width_ft || a.length_ft - b.length_ft || (a.purchase_price || 0) - (b.purchase_price || 0))
      totalRolls = rollItems.reduce((sum, it) => sum + (it.roll_count || 0), 0)
      totalSft = rollItems.reduce((sum, it) => sum + (it.total_sft || 0), 0)
      totalValuationCalculated = rollItems.reduce((sum, it) => sum + (it.total_valuation || 0), 0)
    } else if (rawRollSizes.length > 0) {
      for (const rs of rawRollSizes) {
        const rawW = Number(rs.nominal_width_ft || rs.width || rs.width_ft || rs.size || inferredWidth || 4)
        const rawRsAllow = rs.extra_allowance !== undefined
          ? Number(rs.extra_allowance)
          : rs.allowance !== undefined
          ? Number(rs.allowance)
          : rs.allowance_ft !== undefined
          ? Number(rs.allowance_ft)
          : 0
        const allowance = rawRsAllow
        const w = rs.width_ft !== undefined && Number(rs.width_ft) > 0
          ? Number(rs.width_ft)
          : ((allowance > 0) ? Math.round((rawW + allowance) * 100) / 100 : rawW)
        const l = Number(rs.length || rs.length_ft || standardLength)
        const explicitCount = Number(rs.quantity ?? rs.stock_qty ?? rs.stock ?? rs.roll_count ?? rs.count ?? 0)
        const rollArea = w * l
        let price = Number(rs.price ?? rs.unit_cost ?? rs.purchase_price ?? 0)
        if (price <= 0) {
          if (derivedPerSft > 0) {
            price = Math.round(derivedPerSft * rollArea)
          } else if (rawCost > 0) {
            price = rawCost <= 150 ? Math.round(rawCost * rollArea) : rawCost
          } else {
            price = 0
          }
        }
        const gsm = Number(rs.gsm ?? material.gsm ?? (material as any)?.weight_gsm ?? 0)
        const fin = String(rs.finishing ?? rs.finish ?? material.default_finishing ?? (material as any)?.finish ?? 'none')

        const attrs = normalizeInventoryGroupAttributes({
          name: material.name,
          width_ft: w,
          length_ft: l,
          allowance_ft: allowance,
          purchase_price: price,
          gsm: gsm,
          finishing: fin,
          specification: material.specification,
          material_spec: (material as any)?.material_spec,
        })
        const key = createInventoryGroupingKey(attrs)
        const sft = explicitCount > 0 ? explicitCount * attrs.width_ft * attrs.length_ft : (Number(rs.total_sft ?? rs.sft) || 0)
        const rollCost = attrs.purchase_price > 0
          ? (attrs.purchase_price > 150 ? attrs.purchase_price : attrs.purchase_price * (attrs.width_ft * attrs.length_ft))
          : (rawCost > 150 ? rawCost : rawCost * (attrs.width_ft * attrs.length_ft))
        const itemVal = explicitCount * rollCost

        map.set(key, {
          key,
          name: attrs.name,
          width_ft: attrs.width_ft,
          length_ft: attrs.length_ft,
          allowance_ft: attrs.allowance_ft,
          purchase_price: attrs.purchase_price,
          gsm: attrs.gsm,
          finishing: attrs.finishing,
          roll_count: explicitCount,
          total_sft: sft,
          unit_cost: attrs.purchase_price,
          total_valuation: itemVal,
          label: `${attrs.width_ft}ft × ${attrs.length_ft}ft`,
        })
      }

      // If no explicit counts exist on any size but currentStock > 0, allocate cleanly
      const currentExplicitRolls = Array.from(map.values()).reduce((sum, it) => sum + (it.roll_count || 0), 0)

      if (currentExplicitRolls === 0 && currentStock > 0) {
        const configuredList = Array.from(map.values())
        
        // 1. Check if currentStock is an exact multiple of any single configured size
        const exactMatchIdx = configuredList.findIndex(
          (item) => (item.width_ft * item.length_ft > 0) && (Math.abs(currentStock % (item.width_ft * item.length_ft)) < 0.5)
        )

        if (exactMatchIdx !== -1) {
          const item = configuredList[exactMatchIdx]
          const area = item.width_ft * item.length_ft
          const count = Math.max(1, Math.round(currentStock / area))
          item.roll_count = count
          item.total_sft = count * area
          const price = Number(item.purchase_price || 0)
          const rollCost = price > 0
            ? (price > 150 ? price : price * area)
            : (rawCost > 150 ? rawCost : rawCost * area)
          item.total_valuation = count * rollCost
        } else if (configuredList.length === 1) {
          const item = configuredList[0]
          const area = item.width_ft * item.length_ft
          const count = area > 0 ? Math.max(1, Math.round(currentStock / area)) : 1
          item.roll_count = count
          item.total_sft = currentStock
          const price = Number(item.purchase_price || 0)
          const rollCost = price > 0
            ? (price > 150 ? price : price * area)
            : (rawCost > 150 ? rawCost : rawCost * area)
          item.total_valuation = count * rollCost
        } else {
          // If total stock is equal to sum of standard roll areas across all configured sizes (e.g. Test 2: 12032 with sumSetArea = 6016)
          const sumSetArea = configuredList.reduce((sum, it) => sum + (it.width_ft * it.length_ft), 0)
          if (sumSetArea > 0 && Math.abs(currentStock % sumSetArea) < 0.5) {
            const sets = Math.round(currentStock / sumSetArea)
            for (const item of configuredList) {
              const area = item.width_ft * item.length_ft
              item.roll_count = sets
              item.total_sft = sets * area
              const price = Number(item.purchase_price || 0)
              const rollCost = price > 0
                ? (price > 150 ? price : price * area)
                : (rawCost > 150 ? rawCost : rawCost * area)
              item.total_valuation = sets * rollCost
            }
          }
        }
      }

      if (currentStock <= 0) {
        for (const item of map.values()) {
          item.roll_count = 0
          item.total_sft = 0
          item.total_valuation = 0
        }
      }

      rollItems = Array.from(map.values()).sort((a, b) => a.width_ft - b.width_ft || a.length_ft - b.length_ft)
      totalRolls = rollItems.reduce((sum, it) => sum + (it.roll_count || 0), 0)
      totalSft = rollItems.reduce((sum, it) => sum + (it.total_sft || 0), 0)
      totalValuationCalculated = rollItems.reduce((sum, it) => sum + (it.total_valuation || 0), 0)
    } else {
      const effectiveInferredW = inferredWidth
      const areaPerRoll = effectiveInferredW * standardLength
      totalRolls = areaPerRoll > 0 ? Math.max(1, Math.round(currentStock / areaPerRoll)) : 1
      if (currentStock <= 0) totalRolls = 0
      totalSft = currentStock

      const attrs = normalizeInventoryGroupAttributes({
        name: material.name,
        width_ft: effectiveInferredW,
        length_ft: standardLength,
        allowance_ft: 0,
        purchase_price: rawCost,
        gsm: material.gsm ?? (material as any)?.weight_gsm,
        finishing: material.default_finishing ?? (material as any)?.finish,
        specification: material.specification,
        material_spec: (material as any)?.material_spec,
      })
      const rollCost = attrs.purchase_price > 0
        ? (attrs.purchase_price > 150 ? attrs.purchase_price : attrs.purchase_price * (attrs.width_ft * attrs.length_ft))
        : (rawCost > 150 ? rawCost : rawCost * (attrs.width_ft * attrs.length_ft))
      const itemVal = totalRolls * rollCost

      rollItems = totalRolls > 0 ? [
        {
          key: createInventoryGroupingKey(attrs),
          name: attrs.name,
          width_ft: attrs.width_ft,
          length_ft: attrs.length_ft,
          allowance_ft: attrs.allowance_ft,
          purchase_price: attrs.purchase_price,
          gsm: attrs.gsm,
          finishing: attrs.finishing,
          roll_count: totalRolls,
          total_sft: currentStock,
          unit_cost: attrs.purchase_price,
          total_valuation: itemVal,
          label: `${effectiveInferredW}ft × ${standardLength}ft`,
        }
      ] : []
      totalValuationCalculated = itemVal
    }

    // Format summary string
    let formattedSummary = ''
    if (totalRolls > 0) {
      const activeItems = rollItems.filter((it) => it.roll_count > 0)
      if (activeItems.length > 1) {
        formattedSummary = activeItems
          .map((it) => `${it.roll_count} Roll (${it.width_ft}ft × ${it.length_ft}ft)`)
          .join(' • ')
      } else if (activeItems.length === 1) {
        formattedSummary = `(${activeItems[0].width_ft}ft × ${activeItems[0].length_ft}ft)`
      }
    } else if (rollItems.length > 0) {
      formattedSummary = `(${rollItems[0].width_ft}ft × ${rollItems[0].length_ft}ft)`
    } else if (rawRollSizes.length > 0) {
      const primaryBaseW = Number(rawRollSizes[0].nominal_width_ft || rawRollSizes[0].width || rawRollSizes[0].width_ft || rawRollSizes[0].size || inferredWidth || 4)
      const rawRsAllow = rawRollSizes[0].extra_allowance !== undefined
        ? Number(rawRollSizes[0].extra_allowance)
        : rawRollSizes[0].allowance !== undefined
        ? Number(rawRollSizes[0].allowance)
        : rawRollSizes[0].allowance_ft !== undefined
        ? Number(rawRollSizes[0].allowance_ft)
        : 0
      const allowance = rawRsAllow
      const primaryW = rawRollSizes[0].width_ft !== undefined && Number(rawRollSizes[0].width_ft) > 0
        ? Number(rawRollSizes[0].width_ft)
        : ((allowance > 0) ? Math.round((primaryBaseW + allowance) * 100) / 100 : primaryBaseW)
      const primaryL = Number(rawRollSizes[0].length || rawRollSizes[0].length_ft || standardLength)
      formattedSummary = `(${primaryW}ft × ${primaryL}ft)`
    } else {
      const effectiveInferredW = inferredWidth
      formattedSummary = `(${effectiveInferredW}ft × ${standardLength}ft)`
    }

    const effectiveStockSft = (matRolls.length > 0 || totalSft > 0) ? totalSft : currentStock
    const primaryW = rollItems[0]?.width_ft || (rawRollSizes[0] ? Number(rawRollSizes[0].width || rawRollSizes[0].width_ft || 0) : 0) || inferredWidth
    const primaryL = rollItems[0]?.length_ft || standardLength
    const areaPerStandardRoll = primaryW * primaryL
    let costPerRoll = 0
    let costPerSft = 0
    let totalValuation = 0

    if (explicitPerSft > 0) {
      costPerSft = explicitPerSft
      costPerRoll = areaPerStandardRoll > 0 ? (costPerSft * areaPerStandardRoll) : (costPerSft * 656)
      totalValuation = effectiveStockSft > 0 ? effectiveStockSft * costPerSft : 0
    } else if (totalValuationCalculated > 0) {
      totalValuation = totalValuationCalculated
      costPerSft = effectiveStockSft > 0 ? (totalValuation / effectiveStockSft) : 0
      costPerRoll = totalRolls > 0 ? (totalValuation / totalRolls) : (areaPerStandardRoll > 0 ? costPerSft * areaPerStandardRoll : 0)
    } else if (derivedPerSft > 0) {
      costPerSft = derivedPerSft
      costPerRoll = areaPerStandardRoll > 0 ? (costPerSft * areaPerStandardRoll) : (costPerSft * 656)
      totalValuation = effectiveStockSft > 0 ? effectiveStockSft * costPerSft : 0
    } else if (rawCost > 0) {
      if (rawCost > 100) {
        // rawCost is per-Roll (e.g. ৳ 6,560 / Roll)
        costPerRoll = rawCost
        costPerSft = areaPerStandardRoll > 0 ? (rawCost / areaPerStandardRoll) : rawCost
        totalValuation = effectiveStockSft > 0 ? effectiveStockSft * costPerSft : 0
      } else {
        // rawCost is per-SFT (e.g. ৳ 10.00 / SFT)
        costPerSft = rawCost
        costPerRoll = areaPerStandardRoll > 0 ? (rawCost * areaPerStandardRoll) : (rawCost * 656)
        totalValuation = effectiveStockSft > 0 ? effectiveStockSft * costPerSft : 0
      }
    }

    let purchaseUnitDisplay = '0 Rolls'
    if (totalRolls > 0) {
      purchaseUnitDisplay = `${totalRolls} ${totalRolls === 1 ? 'Roll' : 'Rolls'}`
    } else if (currentStock > 0) {
      purchaseUnitDisplay = `${currentStock.toLocaleString()} SFT`
    }

    return {
      is_roll: true,
      purchase_unit_display: purchaseUnitDisplay,
      consumption_unit_display: `${effectiveStockSft.toLocaleString()} SFT`,
      roll_items: rollItems,
      total_rolls: totalRolls,
      total_stock_display: `${effectiveStockSft.toLocaleString()} SFT`,
      formatted_summary: formattedSummary,
      purchase_unit: 'roll',
      consumption_unit: 'sft',
      cost_per_purchase_unit: costPerRoll,
      cost_per_consumption_unit: costPerSft,
      cost_display_primary: costPerRoll > 0 ? `৳ ${Math.round(costPerRoll).toLocaleString()} / Roll` : (costPerSft > 0 ? `৳ ${costPerSft.toFixed(2)} / SFT` : '—'),
      cost_display_secondary: costPerSft > 0 && costPerRoll > 0 ? `(৳ ${costPerSft.toFixed(2)} / SFT)` : null,
      total_valuation: totalValuation,
    }
  }

  // 2. Check for Rigid Sheets with SFT or Sheet consumption
  if (
    rawPurchaseUnit === 'sheet' ||
    ['rigid_sheet', 'rigid_sheets', 'acrylic', 'pvc_board', 'foam_board', 'acp'].some(c => matCategory.includes(c))
  ) {
    const rawSheetSizes: any[] = (Array.isArray(material.sheet_sizes) && material.sheet_sizes.length > 0)
      ? material.sheet_sizes
      : (Array.isArray(material.available_sheet_sizes) && material.available_sheet_sizes.length > 0)
      ? material.available_sheet_sizes
      : ((material.material_config as any)?.available_sheet_sizes && Array.isArray((material.material_config as any).available_sheet_sizes) && (material.material_config as any).available_sheet_sizes.length > 0)
      ? (material.material_config as any).available_sheet_sizes
      : ((material.material_config as any)?.sheet_sizes && Array.isArray((material.material_config as any).sheet_sizes) && (material.material_config as any).sheet_sizes.length > 0)
      ? (material.material_config as any).sheet_sizes
      : ((material.pricing_formula as any)?.available_sheet_sizes && Array.isArray((material.pricing_formula as any).available_sheet_sizes) && (material.pricing_formula as any).available_sheet_sizes.length > 0)
      ? (material.pricing_formula as any).available_sheet_sizes
      : ((material.pricing_formula as any)?.material_config?.available_sheet_sizes && Array.isArray((material.pricing_formula as any).material_config.available_sheet_sizes) && (material.pricing_formula as any).material_config.available_sheet_sizes.length > 0)
      ? (material.pricing_formula as any).material_config.available_sheet_sizes
      : []

    const defaultSheetW = Number(material.sheet_width_ft || material.width || 8)
    const defaultSheetL = Number(material.sheet_length_ft || material.length || 4)
    const defaultSheetArea = defaultSheetW * defaultSheetL > 0 ? defaultSheetW * defaultSheetL : 32
    const isSftCons = ['sft', 'sqft'].includes(consumptionUnit)

    let rollItems: WarehouseRollStockItem[] = []
    let totalSheets = 0
    let totalSft = 0
    let totalValuation = 0

    if (rawSheetSizes.length > 0) {
      const sheetMap = new Map<string, WarehouseRollStockItem>()

      for (const ss of rawSheetSizes) {
        let w = defaultSheetW
        let l = defaultSheetL
        if (typeof ss === 'string') {
          const match = ss.match(/(\d+(?:\.\d+)?)\s*(?:ft|')?\s*[xX*×]\s*(\d+(?:\.\d+)?)/)
          if (match) {
            w = Number(match[1])
            l = Number(match[2])
          }
        } else if (typeof ss === 'object' && ss !== null) {
          w = Number(ss.width || ss.width_ft || defaultSheetW)
          l = Number(ss.length || ss.length_ft || defaultSheetL)
        }
        const area = w * l > 0 ? w * l : defaultSheetArea
        const allowance = typeof ss === 'object' && ss ? Number(ss.allowance_ft || ss.allowance || 0) : 0
        const explicitCount = typeof ss === 'object' && ss ? Number(ss.quantity ?? ss.stock_qty ?? ss.stock ?? ss.sheet_count ?? ss.count ?? 0) : 0

        let price = typeof ss === 'object' && ss ? Number(ss.purchase_price ?? ss.unit_cost ?? ss.default_supplier_price ?? ss.price ?? 0) : 0
        if (price <= 0) {
          if (rawCost > 150) {
            price = rawCost
          } else if (rawCost > 0 && isSftCons) {
            price = rawCost * area
          } else {
            price = rawCost
          }
        }
        const gsm = typeof ss === 'object' && ss ? Number(ss.gsm || ss.thickness_mm || material.gsm || material.thickness_mm || 0) : Number(material.gsm || material.thickness_mm || 0)
        const fin = typeof ss === 'object' && ss ? String(ss.finishing || ss.finish || material.default_finishing || (material as any)?.finish || 'none') : String(material.default_finishing || (material as any)?.finish || 'none')

        const attrs = normalizeInventoryGroupAttributes({
          name: material.name,
          width_ft: w,
          length_ft: l,
          allowance_ft: allowance,
          purchase_price: price,
          gsm,
          finishing: fin,
          specification: material.specification,
          material_spec: (material as any)?.material_spec,
        })
        const key = createInventoryGroupingKey(attrs)

        sheetMap.set(key, {
          key,
          name: attrs.name,
          width_ft: attrs.width_ft,
          length_ft: attrs.length_ft,
          allowance_ft: attrs.allowance_ft,
          purchase_price: attrs.purchase_price,
          gsm: attrs.gsm,
          finishing: attrs.finishing,
          roll_count: explicitCount,
          total_sft: explicitCount > 0 ? (isSftCons ? explicitCount * area : explicitCount) : 0,
          unit_cost: attrs.purchase_price,
          total_valuation: explicitCount * attrs.purchase_price,
          label: `${attrs.width_ft}ft × ${attrs.length_ft}ft`,
        })
      }

      // If explicit counts were not provided per sheet size or if stock changed, distribute currentStock
      const explicitSum = Array.from(sheetMap.values()).reduce((s, it) => s + (it.roll_count || 0), 0)
      const totalExplicitSft = Array.from(sheetMap.values()).reduce((s, it) => s + (it.total_sft || 0), 0)

      if (currentStock > 0 && (explicitSum === 0 || (sheetMap.size === 1 && totalExplicitSft !== currentStock))) {
        const list = Array.from(sheetMap.values())
        if (list.length === 1) {
          const it = list[0]
          const area = it.width_ft * it.length_ft > 0 ? it.width_ft * it.length_ft : defaultSheetArea
          const count = isSftCons ? Math.floor(currentStock / area) : currentStock
          it.roll_count = Math.max(0, count)
          it.total_sft = currentStock
          it.total_valuation = it.roll_count * (it.purchase_price || rawCost)
        } else if (explicitSum === 0) {
          // Multiple sizes: allocate to the best matching area or distribute
          let bestIdx = 0
          for (let i = 0; i < list.length; i++) {
            const area = list[i].width_ft * list[i].length_ft
            if (area > 0 && currentStock % area === 0) {
              bestIdx = i
              break
            }
          }
          const it = list[bestIdx]
          const area = it.width_ft * it.length_ft > 0 ? it.width_ft * it.length_ft : defaultSheetArea
          const count = isSftCons ? Math.floor(currentStock / area) : currentStock
          it.roll_count = Math.max(1, count)
          it.total_sft = currentStock
          it.total_valuation = it.roll_count * (it.purchase_price || rawCost)
        }
      }

      if (currentStock <= 0) {
        for (const it of sheetMap.values()) {
          it.roll_count = 0
          it.total_sft = 0
          it.total_valuation = 0
        }
      }

      rollItems = Array.from(sheetMap.values()).sort((a, b) => a.width_ft - b.width_ft || a.length_ft - b.length_ft)
      totalSheets = rollItems.reduce((s, it) => s + (it.roll_count || 0), 0)
      totalSft = rollItems.reduce((s, it) => s + (it.total_sft || 0), 0)
      totalValuation = rollItems.reduce((s, it) => s + (it.total_valuation || 0), 0)
    } else {
      totalSheets = isSftCons && defaultSheetArea > 0 ? Math.floor(currentStock / defaultSheetArea) : currentStock
      let costPerSheet = rawCost
      let costPerCons = rawCost
      if (isSftCons) {
        if (rawCost > 150) {
          costPerSheet = rawCost
          costPerCons = defaultSheetArea > 0 ? rawCost / defaultSheetArea : rawCost
        } else {
          costPerCons = rawCost
          costPerSheet = rawCost * defaultSheetArea
        }
      }
      totalValuation = currentStock * costPerCons

      const attrs = normalizeInventoryGroupAttributes({
        name: material.name,
        width_ft: defaultSheetW,
        length_ft: defaultSheetL,
        allowance_ft: 0,
        purchase_price: costPerSheet,
        gsm: Number(material.gsm || material.thickness_mm || 0),
        finishing: String(material.default_finishing || (material as any)?.finish || 'none'),
        specification: material.specification,
        material_spec: (material as any)?.material_spec,
      })

      rollItems = [
        {
          key: createInventoryGroupingKey(attrs),
          name: attrs.name,
          width_ft: attrs.width_ft,
          length_ft: attrs.length_ft,
          allowance_ft: attrs.allowance_ft,
          purchase_price: attrs.purchase_price,
          gsm: attrs.gsm,
          finishing: attrs.finishing,
          roll_count: totalSheets,
          total_sft: currentStock,
          unit_cost: costPerSheet,
          total_valuation: totalValuation,
          label: `${defaultSheetW}ft × ${defaultSheetL}ft`,
        },
      ]
    }

    const remainderSft = isSftCons && defaultSheetArea > 0 ? currentStock % defaultSheetArea : 0
    const sheetDisplay = `${totalSheets} ${totalSheets === 1 ? 'Sheet' : 'Sheets'}${remainderSft > 0 ? ` + ${remainderSft} SFT` : ''}`
    const primaryW = rollItems[0]?.width_ft || defaultSheetW
    const primaryL = rollItems[0]?.length_ft || defaultSheetL
    const primaryArea = primaryW * primaryL > 0 ? primaryW * primaryL : defaultSheetArea
    const costPerSheet = rollItems[0]?.purchase_price || (isSftCons ? (rawCost > 150 ? rawCost : rawCost * primaryArea) : rawCost)
    const costPerCons = isSftCons && primaryArea > 0 ? costPerSheet / primaryArea : rawCost

    return {
      is_roll: false,
      purchase_unit_display: totalSheets > 0 ? sheetDisplay : `${currentStock.toLocaleString()} ${consumptionUnit}`,
      consumption_unit_display: `${currentStock.toLocaleString()} ${consumptionUnit}`,
      roll_items: rollItems,
      total_rolls: 0,
      total_stock_display: `${currentStock.toLocaleString()} ${consumptionUnit}`,
      formatted_summary: isSftCons ? `${primaryW}ft × ${primaryL}ft (${primaryArea} SFT/Sheet)` : `1 Sheet`,
      purchase_unit: 'sheet',
      consumption_unit: consumptionUnit,
      cost_per_purchase_unit: costPerSheet,
      cost_per_consumption_unit: costPerCons,
      cost_display_primary: costPerSheet > 0 ? `৳ ${costPerSheet.toLocaleString()} / Sheet` : '—',
      cost_display_secondary: costPerCons > 0 && isSftCons ? `(৳ ${costPerCons.toFixed(2)} / SFT)` : null,
      total_valuation: totalValuation,
    }
  }

  // 3. Check for Liquids / Inks / Solvents
  const isFluid =
    ['bottle', 'can', 'liter', 'ltr', 'gallon', 'ml'].includes(rawPurchaseUnit) ||
    ['ink', 'fluid', 'solvent', 'chemical', 'liquid', 'dye', 'pigment'].some(c => matCategory.includes(c) || matName.includes(c))

  if (isFluid) {
    const rawVariants: any[] = Array.isArray(material.variants) && material.variants.length > 0
      ? material.variants
      : []

    let rollItems: WarehouseRollStockItem[] = []
    let totalPacks = 0
    let totalValuation = 0

    if (rawVariants.length > 0) {
      const varMap = new Map<string, WarehouseRollStockItem>()

      for (const v of rawVariants) {
        const vPrice = Number(v.purchase_price ?? v.unit_cost ?? (rawCost + Number(v.cost_adjustment || 0)))
        const fin = String(v.variant_name || v.color || v.finish || v.size_spec || 'none')
        const count = Number(v.quantity ?? v.stock ?? v.stock_qty ?? v.count ?? 0)

        const attrs = normalizeInventoryGroupAttributes({
          name: material.name,
          width_ft: 0,
          length_ft: 0,
          allowance_ft: 0,
          purchase_price: vPrice,
          gsm: 0,
          finishing: fin,
          specification: material.specification,
          material_spec: (material as any)?.material_spec,
        })
        const key = createInventoryGroupingKey(attrs)

        varMap.set(key, {
          key,
          name: attrs.name,
          width_ft: 0,
          length_ft: 0,
          allowance_ft: 0,
          purchase_price: attrs.purchase_price,
          gsm: 0,
          finishing: attrs.finishing,
          roll_count: count,
          total_sft: count,
          unit_cost: attrs.purchase_price,
          total_valuation: count * attrs.purchase_price,
          label: `${v.variant_name || 'Variant'}${v.size_spec ? ` (${v.size_spec})` : ''}`,
        })
      }

      const explicitSum = Array.from(varMap.values()).reduce((s, it) => s + (it.roll_count || 0), 0)
      if (explicitSum === 0 && currentStock > 0) {
        const first = Array.from(varMap.values())[0]
        first.roll_count = currentStock
        first.total_sft = currentStock
        first.total_valuation = currentStock * (first.purchase_price || rawCost)
      }

      if (currentStock <= 0) {
        for (const it of varMap.values()) {
          it.roll_count = 0
          it.total_sft = 0
          it.total_valuation = 0
        }
      }

      rollItems = Array.from(varMap.values())
      totalPacks = rollItems.reduce((s, it) => s + (it.roll_count || 0), 0)
      totalValuation = rollItems.reduce((s, it) => s + (it.total_valuation || 0), 0)
    } else {
      totalPacks = currentStock
      totalValuation = currentStock * rawCost

      const attrs = normalizeInventoryGroupAttributes({
        name: material.name,
        width_ft: 0,
        length_ft: 0,
        allowance_ft: 0,
        purchase_price: rawCost,
        gsm: 0,
        finishing: String(material.default_finishing || (material as any)?.finish || 'none'),
        specification: material.specification,
        material_spec: (material as any)?.material_spec,
      })

      rollItems = [
        {
          key: createInventoryGroupingKey(attrs),
          name: attrs.name,
          width_ft: 0,
          length_ft: 0,
          allowance_ft: 0,
          purchase_price: attrs.purchase_price,
          gsm: 0,
          finishing: attrs.finishing,
          roll_count: totalPacks,
          total_sft: currentStock,
          unit_cost: rawCost,
          total_valuation: totalValuation,
          label: material.name,
        },
      ]
    }

    const displayUnit = rawPurchaseUnit || 'bottle'

    return {
      is_roll: false,
      purchase_unit_display: `${currentStock.toLocaleString()} ${displayUnit}${currentStock !== 1 ? 's' : ''}`,
      consumption_unit_display: `${currentStock.toLocaleString()} ${consumptionUnit}`,
      roll_items: rollItems,
      total_rolls: 0,
      total_stock_display: `${currentStock.toLocaleString()} ${consumptionUnit}`,
      formatted_summary: `${currentStock.toLocaleString()} ${displayUnit}`,
      purchase_unit: displayUnit,
      consumption_unit: consumptionUnit,
      cost_per_purchase_unit: rawCost,
      cost_per_consumption_unit: rawCost,
      cost_display_primary: rawCost > 0 ? `৳ ${rawCost.toLocaleString()} / ${displayUnit}` : '—',
      cost_display_secondary: null,
      total_valuation: totalValuation,
    }
  }

  // 4. Check for Pack / Box / Discrete Items with conversion
  const packQuantity = Number(
    material.pack_quantity ||
    (material.material_config as any)?.pack_quantity ||
    (material.pricing_formula as any)?.material_config?.pack_quantity ||
    1
  )

  if (['box', 'pack', 'carton', 'set'].includes(rawPurchaseUnit) && packQuantity > 1) {
    const rawVariants: any[] = Array.isArray(material.variants) && material.variants.length > 0
      ? material.variants
      : []

    let rollItems: WarehouseRollStockItem[] = []
    let totalPacks = Math.floor(currentStock / packQuantity)
    const remainderPcs = currentStock % packQuantity
    const packDisplay = `${totalPacks} ${rawPurchaseUnit.toUpperCase()}${totalPacks !== 1 ? 's' : ''}${remainderPcs > 0 ? ` + ${remainderPcs} ${consumptionUnit}` : ''}`

    let costPerPack = rawCost
    let costPerPc = rawCost / packQuantity
    if (rawCost <= 50) {
      costPerPc = rawCost
      costPerPack = rawCost * packQuantity
    }
    let totalValuation = currentStock * costPerPc

    if (rawVariants.length > 0) {
      const varMap = new Map<string, WarehouseRollStockItem>()

      for (const v of rawVariants) {
        const vPrice = Number(v.purchase_price ?? v.unit_cost ?? (costPerPack + Number(v.cost_adjustment || 0)))
        const fin = String(v.variant_name || v.spec || v.size_spec || 'none')
        const count = Number(v.quantity ?? v.stock ?? v.stock_qty ?? v.count ?? 0)

        const attrs = normalizeInventoryGroupAttributes({
          name: material.name,
          width_ft: 0,
          length_ft: 0,
          allowance_ft: 0,
          purchase_price: vPrice,
          gsm: 0,
          finishing: fin,
          specification: material.specification,
          material_spec: (material as any)?.material_spec,
        })
        const key = createInventoryGroupingKey(attrs)

        varMap.set(key, {
          key,
          name: attrs.name,
          width_ft: 0,
          length_ft: 0,
          allowance_ft: 0,
          purchase_price: attrs.purchase_price,
          gsm: 0,
          finishing: attrs.finishing,
          roll_count: count,
          total_sft: count * packQuantity,
          unit_cost: attrs.purchase_price,
          total_valuation: count * attrs.purchase_price,
          label: `${v.variant_name || 'Variant'}${v.size_spec ? ` (${v.size_spec})` : ''}`,
        })
      }

      const explicitSum = Array.from(varMap.values()).reduce((s, it) => s + (it.roll_count || 0), 0)
      if (explicitSum === 0 && totalPacks > 0) {
        const first = Array.from(varMap.values())[0]
        first.roll_count = totalPacks
        first.total_sft = currentStock
        first.total_valuation = totalPacks * (first.purchase_price || costPerPack)
      }

      rollItems = Array.from(varMap.values())
      totalPacks = rollItems.reduce((s, it) => s + (it.roll_count || 0), 0)
      totalValuation = rollItems.reduce((s, it) => s + (it.total_valuation || 0), 0)
    } else {
      const attrs = normalizeInventoryGroupAttributes({
        name: material.name,
        width_ft: 0,
        length_ft: 0,
        allowance_ft: 0,
        purchase_price: costPerPack,
        gsm: 0,
        finishing: String(material.default_finishing || (material as any)?.finish || 'none'),
        specification: material.specification,
        material_spec: (material as any)?.material_spec,
      })

      rollItems = [
        {
          key: createInventoryGroupingKey(attrs),
          name: attrs.name,
          width_ft: 0,
          length_ft: 0,
          allowance_ft: 0,
          purchase_price: attrs.purchase_price,
          gsm: 0,
          finishing: attrs.finishing,
          roll_count: totalPacks,
          total_sft: currentStock,
          unit_cost: costPerPack,
          total_valuation: totalValuation,
          label: `${packQuantity} ${consumptionUnit}/${rawPurchaseUnit}`,
        },
      ]
    }

    return {
      is_roll: false,
      purchase_unit_display: totalPacks > 0 ? packDisplay : `${currentStock.toLocaleString()} ${consumptionUnit}`,
      consumption_unit_display: `${currentStock.toLocaleString()} ${consumptionUnit}`,
      roll_items: rollItems,
      total_rolls: 0,
      total_stock_display: `${currentStock.toLocaleString()} ${consumptionUnit}`,
      formatted_summary: `${packQuantity} ${consumptionUnit}/${rawPurchaseUnit}`,
      purchase_unit: rawPurchaseUnit,
      consumption_unit: consumptionUnit,
      cost_per_purchase_unit: costPerPack,
      cost_per_consumption_unit: costPerPc,
      cost_display_primary: costPerPack > 0 ? `৳ ${costPerPack.toLocaleString()} / ${rawPurchaseUnit}` : '—',
      cost_display_secondary: costPerPc > 0 ? `(৳ ${costPerPc.toFixed(2)} / ${consumptionUnit})` : null,
      total_valuation: totalValuation,
    }
  }

  // 5. Hardware / Display Stands / Merchandise / General Consumables
  const rawVariants: any[] = Array.isArray(material.variants) && material.variants.length > 0
    ? material.variants
    : []

  let rollItems: WarehouseRollStockItem[] = []
  let totalValuation = currentStock * rawCost
  const displayUnit = rawPurchaseUnit || consumptionUnit || 'pcs'

  if (rawVariants.length > 0) {
    const varMap = new Map<string, WarehouseRollStockItem>()

    for (const v of rawVariants) {
      let w = Number(v.width || v.width_ft || 0)
      let l = Number(v.length || v.length_ft || 0)
      if (w === 0 && l === 0 && (v.size_spec || v.variant_name)) {
        const match = String(v.size_spec || v.variant_name).match(/(\d+(?:\.\d+)?)\s*(?:ft|')?\s*[xX*×]\s*(\d+(?:\.\d+)?)/)
        if (match) {
          w = Number(match[1])
          l = Number(match[2])
        }
      }
      const vPrice = Number(v.purchase_price ?? v.unit_cost ?? (rawCost + Number(v.cost_adjustment || 0)))
      const fin = String(v.variant_name || v.color || v.finish || v.size_spec || 'none')
      const count = Number(v.quantity ?? v.stock ?? v.stock_qty ?? v.count ?? 0)

      const attrs = normalizeInventoryGroupAttributes({
        name: material.name,
        width_ft: w,
        length_ft: l,
        allowance_ft: 0,
        purchase_price: vPrice,
        gsm: Number(v.gsm || material.gsm || (material as any)?.weight_gsm || 0),
        finishing: fin,
        specification: material.specification,
        material_spec: (material as any)?.material_spec,
      })
      const key = createInventoryGroupingKey(attrs)

      varMap.set(key, {
        key,
        name: attrs.name,
        width_ft: attrs.width_ft,
        length_ft: attrs.length_ft,
        allowance_ft: attrs.allowance_ft,
        purchase_price: attrs.purchase_price,
        gsm: attrs.gsm,
        finishing: attrs.finishing,
        roll_count: count,
        total_sft: count,
        unit_cost: attrs.purchase_price,
        total_valuation: count * attrs.purchase_price,
        label: `${v.variant_name || 'Variant'}${v.size_spec ? ` (${v.size_spec})` : ''}`,
      })
    }

    const explicitSum = Array.from(varMap.values()).reduce((s, it) => s + (it.roll_count || 0), 0)
    if (explicitSum === 0 && currentStock > 0) {
      const first = Array.from(varMap.values())[0]
      first.roll_count = currentStock
      first.total_sft = currentStock
      first.total_valuation = currentStock * (first.purchase_price || rawCost)
    }

    rollItems = Array.from(varMap.values())
    totalValuation = rollItems.reduce((s, it) => s + (it.total_valuation || 0), 0)
  } else {
    const attrs = normalizeInventoryGroupAttributes({
      name: material.name,
      width_ft: Number(material.width || 0),
      length_ft: Number(material.length || 0),
      allowance_ft: 0,
      purchase_price: rawCost,
      gsm: Number(material.gsm || (material as any)?.weight_gsm || 0),
      finishing: String(material.default_finishing || (material as any)?.finish || 'none'),
      specification: material.specification,
      material_spec: (material as any)?.material_spec,
    })

    rollItems = [
      {
        key: createInventoryGroupingKey(attrs),
        name: attrs.name,
        width_ft: attrs.width_ft,
        length_ft: attrs.length_ft,
        allowance_ft: attrs.allowance_ft,
        purchase_price: attrs.purchase_price,
        gsm: attrs.gsm,
        finishing: attrs.finishing,
        roll_count: currentStock,
        total_sft: currentStock,
        unit_cost: rawCost,
        total_valuation: totalValuation,
        label: material.name,
      },
    ]
  }

  return {
    is_roll: false,
    purchase_unit_display: `${currentStock.toLocaleString()} ${displayUnit}`,
    consumption_unit_display: `${currentStock.toLocaleString()} ${consumptionUnit}`,
    roll_items: rollItems,
    total_rolls: 0,
    total_stock_display: `${currentStock.toLocaleString()} ${consumptionUnit}`,
    formatted_summary: `${currentStock.toLocaleString()} ${displayUnit}`,
    purchase_unit: displayUnit,
    consumption_unit: consumptionUnit,
    cost_per_purchase_unit: rawCost,
    cost_per_consumption_unit: rawCost,
    cost_display_primary: rawCost > 0 ? `৳ ${rawCost.toLocaleString()} / ${displayUnit}` : '—',
    cost_display_secondary: null,
    total_valuation: totalValuation,
  }
}

/**
 * Formats an on-floor active roll / substrate piece in Consumption Unit format
 * e.g. "PVC Width 3ft Available Length 143.75ft - 1 Pcs"
 */
export function formatFloorPieceDisplay(roll: any): string {
  if (!roll) return ''
  const matName = roll.material_name || roll.material?.name || 'Substrate'
  const width = Number(roll.width_ft || 3)
  const currentLen = Number(
    roll.current_length_ft ?? (roll.remaining_area_sft ? roll.remaining_area_sft / width : 0)
  )
  const tag = roll.roll_code || roll.roll_tag || ''
  return `${matName} Width ${width}ft Available Length ${currentLen.toFixed(2)}ft - 1 Pcs${tag ? ` [${tag}]` : ''}`
}




