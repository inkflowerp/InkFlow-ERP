/**
 * InkFlow ERP — Authoritative Material Compatibility & Physical Geometry Engine
 * Validates whether physical production dimensions fit available roll widths,
 * rigid sheet media, or usable inventory remnants.
 * 
 * CRITICAL INVARIANT:
 * Area alone CANNOT prove physical fit. Physical width and length must be checked.
 */

import { formatFeetAndInches } from './production-geometry.ts'
import type { InventoryRollRecord, InventoryRemnantRecord } from '../../types/inventory.types.ts'

export interface MaterialWidthOption {
  widthFt: number
  rollLengthFt?: number
  label?: string
}

export interface CompatibilityCheckInput {
  materialName: string
  productionWidthFt: number
  productionLengthFt: number
  availableWidthsFt?: number[] // e.g. [3.0, 4.0, 5.0] or [3.25, 4.25, 5.25]
  standardRollLengthFt?: number // e.g. 164.0 ft
  allowRotation?: boolean
  physicalRolls?: InventoryRollRecord[]
  availableRemnants?: InventoryRemnantRecord[]
}

export interface CompatibilityCheckResult {
  isCompatible: boolean
  materialName: string
  productionWidthFt: number
  productionLengthFt: number
  formattedProductionSize: string
  
  // Best fit roll width if compatible
  bestFitWidthFt: number | null
  sideWastageWidthFt: number | null
  
  // Physical stock matches
  bestFitRollId: string | null
  bestFitRollCode: string | null
  bestFitRemnantId: string | null
  bestFitRemnantCode: string | null
  
  // Status and explanatory message
  reasonCode: 'COMPATIBLE' | 'NO_CONFIGURED_WIDTH' | 'NO_IN_STOCK_ROLL' | 'EXCEEDS_ROLL_LENGTH'
  message: string
  warningLevel: 'none' | 'warning' | 'error'
  availableWidthsFormatted: string
}

/**
 * Checks physical roll and remnant compatibility for a requested production piece.
 */
export function evaluateMaterialCompatibility(input: any): any {
  const allowanceIn = Number(input.allowancePerSideIn ?? input.allowance_per_side_in ?? input.allowanceIn ?? 0)
  const custW = Number(input.customerWidthFt ?? input.customer_width_ft ?? input.width ?? 0)
  const custL = Number(input.customerLengthFt ?? input.customer_length_ft ?? input.length ?? 0)

  let rawPW = Number(input.productionWidthFt ?? input.geometry?.production_width_ft ?? input.geometry?.productionWidthFt ?? input.production_width_ft)
  let rawPL = Number(input.productionLengthFt ?? input.geometry?.production_length_ft ?? input.geometry?.productionLengthFt ?? input.production_length_ft)

  if (isNaN(rawPW) || rawPW <= 0) {
    rawPW = custW > 0 ? custW + (allowanceIn * 2) / 12 : 0
  }
  if (isNaN(rawPL) || rawPL <= 0) {
    rawPL = custL > 0 ? custL + (allowanceIn * 2) / 12 : 0
  }

  const pW = Math.max(0, rawPW)
  const pL = Math.max(0, rawPL)
  const formattedSize = `${formatFeetAndInches(pW)} × ${formatFeetAndInches(pL)}`
  const materialName = input.materialName || input.required_material_name || 'Material'

  const rawWidths = input.availableWidthsFt ?? input.available_roll_widths_ft ?? input.availableRollWidthsFt
  const configuredWidths = (rawWidths && rawWidths.length > 0)
    ? [...rawWidths].sort((a: number, b: number) => a - b)
    : [3.0, 4.0, 5.0] // standard large format default widths

  const widthsFormatted = configuredWidths.map((w: number) => `${w}ft`).join(', ')

  // 1. Check if production piece fits standard configured roll widths (Normal Orientation: pW <= rollWidth)
  const standardCompatibleWidths = configuredWidths.filter((w: number) => w >= pW)
  
  // Check rotated orientation if enabled (Rotated Orientation: pL <= rollWidth)
  let isRotatedFit = false
  let rotatedCompatibleWidths: number[] = []
  if (input.allowRotation ?? input.allow_rotation) {
    rotatedCompatibleWidths = configuredWidths.filter((w: number) => w >= pL)
  }

  // 2. Determine best-fit purchase width
  let bestFitWidth: number | null = null
  let sideWastageFt: number | null = null

  if (standardCompatibleWidths.length > 0) {
    const chosen = standardCompatibleWidths[0]
    bestFitWidth = chosen
    sideWastageFt = Math.round((chosen - pW) * 10000) / 10000
  } else if (rotatedCompatibleWidths.length > 0) {
    isRotatedFit = true
    const chosen = rotatedCompatibleWidths[0]
    bestFitWidth = chosen
    sideWastageFt = Math.round((chosen - pL) * 10000) / 10000
  }

  const wasteStripIn = sideWastageFt !== null ? Math.round(sideWastageFt * 12 * 10) / 10 : null

  // If no configured purchase width can fit this production piece:
  if (bestFitWidth === null) {
    const msg = `No compatible ${materialName} material width configured for ${formatFeetAndInches(pW)} production width.`
    return {
      isCompatible: false,
      is_compatible: false,
      materialName,
      productionWidthFt: pW,
      productionLengthFt: pL,
      formattedProductionSize: formattedSize,
      bestFitWidthFt: null,
      selectedRollWidthFt: null,
      selected_roll_width_ft: null,
      sideWastageWidthFt: null,
      waste_strip_width_in: null,
      bestFitRollId: null,
      bestFitRollCode: null,
      bestFitRemnantId: null,
      bestFitRemnantCode: null,
      reasonCode: 'NO_CONFIGURED_WIDTH',
      error_code: 'NO_COMPATIBLE_WIDTH',
      rejectionReason: msg,
      message: msg,
      warning_message: msg,
      warningLevel: 'error',
      availableWidthsFormatted: widthsFormatted,
    }
  }

  // 3. Check Usable Remnants in Physical Stock
  const remnantsList = input.availableRemnants ?? input.available_remnants
  let matchedRemnant: InventoryRemnantRecord | null = null
  if (remnantsList && remnantsList.length > 0) {
    const usableRemnants = remnantsList.filter(
      (r: any) => (r.status === 'available' || r.status === 'usable') &&
        ((r.width >= pW && r.length >= pL) || ((input.allowRotation ?? input.allow_rotation) && r.width >= pL && r.length >= pW))
    )
    if (usableRemnants.length > 0) {
      usableRemnants.sort((a: any, b: any) => (Number(a.width) * Number(a.length)) - (Number(b.width) * Number(b.length)))
      matchedRemnant = usableRemnants[0]
    }
  }

  // 4. Check Available Physical Rolls in Stock
  const physicalRollsList = input.physicalRolls ?? input.active_physical_rolls
  let matchedRolls: InventoryRollRecord[] = []
  if (physicalRollsList && physicalRollsList.length > 0) {
    matchedRolls = physicalRollsList.filter(
      (r: any) => (r.status === 'available' || r.status === 'mounted' || r.status === 'in_warehouse' || r.status === 'in_use') &&
        r.width_ft >= (isRotatedFit ? pL : pW) &&
        (r.current_length_ft ?? r.remaining_area_sft / r.width_ft) >= (isRotatedFit ? pW : pL)
    )
    if (matchedRolls.length > 0) {
      matchedRolls.sort((a: any, b: any) => a.width_ft - b.width_ft)
    }
  }

  const primaryRoll = matchedRolls.length > 0 ? matchedRolls[0] : null

  return {
    isCompatible: true,
    is_compatible: true,
    materialName,
    productionWidthFt: pW,
    productionLengthFt: pL,
    formattedProductionSize: formattedSize,
    bestFitWidthFt: bestFitWidth,
    selectedRollWidthFt: bestFitWidth,
    selected_roll_width_ft: bestFitWidth,
    plannedLinearLengthFt: isRotatedFit ? pW : pL,
    sideWastageWidthFt: sideWastageFt,
    waste_strip_width_in: wasteStripIn,
    bestFitRollId: primaryRoll?.id || null,
    bestFitRollCode: primaryRoll?.roll_code || primaryRoll?.roll_tag || null,
    bestFitRemnantId: matchedRemnant?.id || null,
    bestFitRemnantCode: matchedRemnant?.remnant_code || null,
    compatible_physical_rolls: matchedRolls,
    reasonCode: 'COMPATIBLE',
    message: matchedRemnant
      ? `Compatible: Usable remnant ${matchedRemnant.remnant_code} (${matchedRemnant.width}ft × ${matchedRemnant.length}ft) is available.`
      : primaryRoll
      ? `Compatible: Physical roll ${primaryRoll.roll_code || primaryRoll.roll_tag} (${primaryRoll.width_ft}ft) in stock.`
      : `Compatible: Production dimension fits ${bestFitWidth}ft roll width (Side trim: ${formatFeetAndInches(sideWastageFt || 0)}).`,
    warningLevel: 'none',
    availableWidthsFormatted: widthsFormatted,
  }
}

export function findOptimalRollWidth(
  requiredWidthFt: number,
  availableWidthsFt: number[] = [3, 4, 5]
): { widthFt: number | null; wasteInches: number } {
  const sorted = [...availableWidthsFt].sort((a, b) => a - b)
  const fit = sorted.find((w) => w >= requiredWidthFt)
  if (!fit) return { widthFt: null, wasteInches: 0 }
  return {
    widthFt: fit,
    wasteInches: Math.round((fit - requiredWidthFt) * 12 * 10) / 10,
  }
}

export function checkRemnantFit(
  remnant: InventoryRemnantRecord,
  requiredWidthFt: number,
  requiredLengthFt: number
): { is_fit: boolean; is_rotated: boolean } {
  const rW = Number(remnant.width) || 0
  const rL = Number(remnant.length) || 0

  if (rW >= requiredWidthFt && rL >= requiredLengthFt) {
    return { is_fit: true, is_rotated: false }
  }
  if (rW >= requiredLengthFt && rL >= requiredWidthFt) {
    return { is_fit: true, is_rotated: true }
  }
  return { is_fit: false, is_rotated: false }
}
