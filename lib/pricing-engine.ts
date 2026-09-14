import type {
  PricingFormulaConfig,
  PricingCalculationInput,
  PricingCalculationOutput,
} from '../types/product.types.ts'

/**
 * Converts various measurement units to feet
 */
export function convertToFeet(value: number, unit: 'ft' | 'inch' | 'm'): number {
  if (!value || isNaN(value)) return 0
  switch (unit) {
    case 'inch':
      return value / 12
    case 'm':
      return value * 3.28084
    case 'ft':
    default:
      return value
  }
}

/**
 * Calculates area in square feet given width, height, and unit.
 */
export function calculateAreaSft(width: number, height: number, unit: 'ft' | 'inch' | 'm' = 'ft'): number {
  const wFt = convertToFeet(width, unit)
  const hFt = convertToFeet(height, unit)
  return Math.round(wFt * hFt * 100) / 100
}

/**
 * Calculates perimeter in feet given width, height, and unit.
 */
export function calculatePerimeterFt(width: number, height: number, unit: 'ft' | 'inch' | 'm' = 'ft'): number {
  const wFt = convertToFeet(width, unit)
  const hFt = convertToFeet(height, unit)
  return Math.round(2 * (wFt + hFt) * 100) / 100
}

/**
 * Evaluates pricing for printing, fabrication, and signage jobs without using eval().
 * Operates purely on declarative structured rules, waste factors, and numerical coefficients.
 */
export function calculateJobPricing(
  formula?: PricingFormulaConfig | null,
  input: PricingCalculationInput = { width: 0, height: 0, dimensionUnit: 'ft', quantity: 1 },
  minPriceFloor: number = 0
): PricingCalculationOutput {
  const safeFormula: PricingFormulaConfig = formula || {
    model: 'dimensional_area',
    waste_factor_percent: 5.0,
    material_rate: 18,
    machine_rate: 10,
    print_rate: 12,
    default_margin_percent: 35.0,
    min_margin_percent: 15.0,
  }

  const qty = Math.max(1, Number(input.quantity) || 1)
  const widthFt = convertToFeet(Number(input.width) || 0, input.dimensionUnit)
  const heightFt = convertToFeet(Number(input.height) || 0, input.dimensionUnit)

  // Single unit area and total job area
  const singleItemAreaSft = widthFt * heightFt
  const baseAreaSft = Math.max(
    (safeFormula.min_area_sft || 0) * qty,
    singleItemAreaSft * qty
  )

  // Planned waste factor
  const wastePercent = safeFormula.waste_factor_percent ?? 5.0
  const plannedWasteSft = Math.round(baseAreaSft * (wastePercent / 100) * 100) / 100
  const effectiveMaterialAreaSft = baseAreaSft + plannedWasteSft

  // Perimeter in feet for borders/eyelets/hemming
  const singlePerimeterFt = 2 * (widthFt + heightFt)
  const totalPerimeterFt = singlePerimeterFt * qty

  // 1. Material Component Cost (includes planned waste)
  const effectiveMaterialRate = input.customMaterialRate !== undefined ? input.customMaterialRate : (safeFormula.material_rate || 0)
  const materialCost = effectiveMaterialAreaSft * effectiveMaterialRate

  // 2. Machine Operation Cost
  const effectiveMachineRate = input.customMachineRate !== undefined ? input.customMachineRate : (safeFormula.machine_rate || safeFormula.print_rate || 0)
  const machineCost = baseAreaSft * effectiveMachineRate

  // 3. Printing Service Cost
  const printingCost = safeFormula.print_rate ? baseAreaSft * safeFormula.print_rate : 0

  // 4. Cutting / Die-cut Cost
  const cuttingCost = input.includeCutting
    ? baseAreaSft * (safeFormula.cutting_rate || 0)
    : 0

  // 5. Lamination (Gloss/Matte thermal) Cost
  const laminationCost = input.includeLamination
    ? baseAreaSft * (safeFormula.lamination_rate || 0)
    : 0

  // 6. Finishing (Eyelets, Hemming, Border taping) Cost
  const finishingCost = input.includeFinishing
    ? totalPerimeterFt * (safeFormula.finishing_rate || 0)
    : 0

  // 7. Fabrication (Metal frame, Channel letter bending) Cost
  const fabricationCost = input.includeFabrication
    ? baseAreaSft * (safeFormula.fabrication_rate || 0)
    : 0

  // 8. Direct Labor Cost
  const effectiveLaborRate = input.customLaborRate !== undefined ? input.customLaborRate : (safeFormula.labor_rate || 0)
  const laborCost = baseAreaSft * effectiveLaborRate

  // 9. On-site Installation / Rigging
  const installationCost = input.includeInstallation
    ? baseAreaSft * (safeFormula.installation_rate || 0)
    : 0

  // 10. Logistics & Transport
  const effectiveTransportRate = input.customTransportRate !== undefined ? input.customTransportRate : (safeFormula.transport_rate || 0)
  const transportCost = input.includeTransport ? effectiveTransportRate : 0

  const otherCost = safeFormula.other_rate ? baseAreaSft * safeFormula.other_rate : 0

  // Total Base Production Cost (Internal Cost of Goods Sold)
  const totalBaseCost = Math.round(
    materialCost +
    machineCost +
    printingCost +
    cuttingCost +
    laminationCost +
    finishingCost +
    fabricationCost +
    laborCost +
    installationCost +
    transportCost +
    otherCost
  )

  // Target Margin & Markup Calculation
  const targetMarginPercent = safeFormula.default_margin_percent ?? 35.0
  const minMarginPercent = safeFormula.min_margin_percent ?? 15.0

  // Selling Price based on Margin formula: Cost / (1 - Margin/100)
  const marginDivisor = Math.max(0.1, 1 - targetMarginPercent / 100)
  const subtotalBeforeDiscount = Math.round(totalBaseCost / marginDivisor)
  const grossProfitAmount = Math.max(0, subtotalBeforeDiscount - totalBaseCost)
  const grossProfitMarginPercent =
    subtotalBeforeDiscount > 0
      ? Math.round((grossProfitAmount / subtotalBeforeDiscount) * 1000) / 10
      : 0

  // Minimum Allowed Price based on Minimum Margin
  const minMarginDivisor = Math.max(0.1, 1 - minMarginPercent / 100)
  const minAllowedSubtotal = Math.round(totalBaseCost / minMarginDivisor)
  const minAllowedPriceBDT = Math.max(minPriceFloor * qty, minAllowedSubtotal)

  // Discount calculations
  const discountFlat = Number(input.discountFlat) || 0
  const discountPercent = Number(input.discountPercent) || 0
  const percentageDiscountAmount = (subtotalBeforeDiscount * discountPercent) / 100
  const discountAmount = Math.min(subtotalBeforeDiscount, discountFlat + percentageDiscountAmount)
  const subtotalAfterDiscount = Math.max(0, subtotalBeforeDiscount - discountAmount)

  // NBR Value Added Tax (VAT)
  const vatRate = input.vatRatePercent ?? 7.5
  const vatAmount = Math.round((subtotalAfterDiscount * vatRate) / 100)
  const grandTotalBDT = subtotalAfterDiscount + vatAmount

  const unitPriceBDT = qty > 0 ? Math.round(grandTotalBDT / qty) : grandTotalBDT
  const isBelowMinimum = (subtotalAfterDiscount < minAllowedSubtotal) || (minPriceFloor > 0 && unitPriceBDT < minPriceFloor)

  // Snapshot for complete historical costing preservation
  const costingSnapshot = {
    calculated_at: new Date().toISOString(),
    rates: {
      material_rate: effectiveMaterialRate,
      machine_rate: effectiveMachineRate,
      print_rate: safeFormula.print_rate || 0,
      cutting_rate: safeFormula.cutting_rate || 0,
      lamination_rate: safeFormula.lamination_rate || 0,
      finishing_rate: safeFormula.finishing_rate || 0,
      fabrication_rate: safeFormula.fabrication_rate || 0,
      labor_rate: effectiveLaborRate,
      installation_rate: safeFormula.installation_rate || 0,
      transport_rate: effectiveTransportRate,
    },
    dimensions: {
      width: Number(input.width) || 0,
      height: Number(input.height) || 0,
      unit: input.dimensionUnit,
      area_sft: Math.round(baseAreaSft * 100) / 100,
      perimeter_ft: Math.round(totalPerimeterFt * 100) / 100,
      planned_waste_sft: plannedWasteSft,
    },
    quantity: qty,
    base_cost: totalBaseCost,
    target_margin_percent: targetMarginPercent,
    min_margin_percent: minMarginPercent,
    min_allowed_price: minAllowedPriceBDT,
    suggested_price: subtotalBeforeDiscount,
  }

  return {
    areaSft: Math.round(baseAreaSft * 100) / 100,
    perimeterFt: Math.round(totalPerimeterFt * 100) / 100,
    quantity: qty,
    plannedWasteSft,
    componentBreakdown: {
      material: Math.round(materialCost),
      machine: Math.round(machineCost),
      printing: Math.round(printingCost),
      cutting: Math.round(cuttingCost),
      lamination: Math.round(laminationCost),
      finishing: Math.round(finishingCost),
      fabrication: Math.round(fabricationCost),
      labor: Math.round(laborCost),
      installation: Math.round(installationCost),
      transport: Math.round(transportCost),
      other: Math.round(otherCost),
    },
    totalBaseCost,
    suggestedSellingPrice: subtotalBeforeDiscount,
    grossProfitAmount: Math.round(grossProfitAmount),
    grossProfitMarginPercent,
    subtotalBeforeDiscount,
    discountAmount: Math.round(discountAmount),
    subtotalAfterDiscount: Math.round(subtotalAfterDiscount),
    vatRatePercent: vatRate,
    vatAmount,
    grandTotalBDT,
    unitPriceBDT,
    isBelowMinimum,
    minAllowedPriceBDT,
    costingSnapshot,
  }
}
