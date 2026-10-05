// ==============================================================================
// PrintFlow - Authoritative Job Costing Formulas (lib/calc/costing.ts)
// Calculates Material Wastage, Machine Running Time, Labor Hours, Overheads,
// and True Gross Margin for commercial print production.
// ==============================================================================

import { moneyAdd, moneySub, moneyMul, moneyPercent, moneySum } from '../money.ts'

export interface JobCostingInput {
  // Material parameters
  substrateCost: number | string // Base paper, flex, vinyl, acrylic cost
  wastagePercentage?: number // Standard print floor wastage (e.g. 5% - 15%)
  inkCost?: number | string // CMYK / UV ink cost
  platesCost?: number | string // CTP Offset plates or die-cut plates
  finishingMaterialsCost?: number | string // Lamination roll, eyelets, glue, board

  // Machinery parameters
  machineHours?: number
  machineHourlyRate?: number // Energy, maintenance depreciation per hour

  // Labor parameters
  laborHours?: number
  laborHourlyRate?: number // Operator and assistant wage per hour

  // Overhead & Quoted price
  overheadPercentage?: number // General shop floor overhead allocation (e.g. 10%)
  quotedPrice?: number | string // Expected or finalized customer invoice price
}

export interface ComputedJobCosting {
  totalMaterialCost: number
  materialWastageCost: number
  totalMachineCost: number
  totalLaborCost: number
  subtotalDirectCost: number
  overheadAmount: number
  totalProductionCost: number
  quotedPrice: number
  estimatedGrossProfit: number
  profitMarginPercent: number
  isProfitable: boolean
}

export function calculateJobCosting(input: JobCostingInput): ComputedJobCosting {
  const baseMaterial = Math.max(0, Number(input.substrateCost) || 0)
  const wastagePct = Math.max(0, Number(input.wastagePercentage) || 0)
  const materialWastageCost = moneyPercent(baseMaterial, wastagePct)
  const ink = Math.max(0, Number(input.inkCost) || 0)
  const plates = Math.max(0, Number(input.platesCost) || 0)
  const finishing = Math.max(0, Number(input.finishingMaterialsCost) || 0)

  // Total Material Cost = Substrate + Wastage + Ink + Plates + Finishing
  const totalMaterialCost = moneySum([baseMaterial, materialWastageCost, ink, plates, finishing])

  // Machine Running Cost = machineHours * machineHourlyRate
  const mHours = Math.max(0, Number(input.machineHours) || 0)
  const mRate = Math.max(0, Number(input.machineHourlyRate) || 0)
  const totalMachineCost = moneyMul(mRate, mHours)

  // Labor Cost = laborHours * laborHourlyRate
  const lHours = Math.max(0, Number(input.laborHours) || 0)
  const lRate = Math.max(0, Number(input.laborHourlyRate) || 0)
  const totalLaborCost = moneyMul(lRate, lHours)

  // Direct Cost Subtotal
  const subtotalDirectCost = moneySum([totalMaterialCost, totalMachineCost, totalLaborCost])

  // Overhead allocation
  const overheadPct = Math.max(0, Number(input.overheadPercentage) || 0)
  const overheadAmount = moneyPercent(subtotalDirectCost, overheadPct)

  // Total Production Cost
  const totalProductionCost = moneyAdd(subtotalDirectCost, overheadAmount)

  // Profitability vs Quoted Revenue
  const quoted = Math.max(0, Number(input.quotedPrice) || 0)
  const estimatedGrossProfit = moneySub(quoted, totalProductionCost)
  const profitMarginPercent = quoted > 0
    ? Math.round(((quoted - totalProductionCost) / quoted) * 10000) / 100
    : 0

  return {
    totalMaterialCost,
    materialWastageCost,
    totalMachineCost,
    totalLaborCost,
    subtotalDirectCost,
    overheadAmount,
    totalProductionCost,
    quotedPrice: quoted,
    estimatedGrossProfit,
    profitMarginPercent,
    isProfitable: estimatedGrossProfit > 0,
  }
}
