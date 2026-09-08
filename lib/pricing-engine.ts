import {
  PricingFormulaConfig,
  PricingCalculationInput,
  PricingCalculationOutput,
} from '@/types/product.types'

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
 * Evaluates pricing for printing, fabrication, and signage jobs without using eval().
 * Operates purely on declarative structured rules and numerical coefficients.
 */
export function calculateJobPricing(
  formula?: PricingFormulaConfig | null,
  input: PricingCalculationInput = { width: 0, height: 0, dimensionUnit: 'ft', quantity: 1 },
  minPriceFloor: number = 0
): PricingCalculationOutput {
  const safeFormula: PricingFormulaConfig = formula || {
    model: 'dimensional_area',
    material_rate: 18,
    print_rate: 12,
    default_margin_percent: 40.0,
  }
  const qty = Math.max(1, Number(input.quantity) || 1)
  const widthFt = convertToFeet(Number(input.width) || 0, input.dimensionUnit)
  const heightFt = convertToFeet(Number(input.height) || 0, input.dimensionUnit)

  // Single unit area and total job area
  const singleItemAreaSft = widthFt * heightFt
  const totalAreaSft = Math.max(
    (safeFormula.min_area_sft || 0) * qty,
    singleItemAreaSft * qty
  )

  // Perimeter in feet for borders/eyelets/hemming
  const singlePerimeterFt = 2 * (widthFt + heightFt)
  const totalPerimeterFt = singlePerimeterFt * qty

  // 1. Material Component Cost
  const materialCost = totalAreaSft * (safeFormula.material_rate || 0)

  // 2. Printing Service Cost
  const printingCost = totalAreaSft * (safeFormula.print_rate || 0)

  // 3. Cutting / Die-cut Cost
  const cuttingCost = input.includeCutting
    ? totalAreaSft * (safeFormula.cutting_rate || 0)
    : 0

  // 4. Lamination (Gloss/Matte thermal) Cost
  const laminationCost = input.includeLamination
    ? totalAreaSft * (safeFormula.lamination_rate || 0)
    : 0

  // 5. Finishing (Eyelets, Hemming, Border taping) Cost
  const finishingCost = input.includeFinishing
    ? totalPerimeterFt * (safeFormula.finishing_rate || 0)
    : 0

  // 6. Fabrication (Metal frame, Channel letter bending) Cost
  const fabricationCost = input.includeFabrication
    ? totalAreaSft * (safeFormula.fabrication_rate || 0)
    : 0

  // 7. Direct Machine Operator Labor
  const laborCost = totalAreaSft * (safeFormula.labor_rate || 0)

  // 8. On-site Installation / Rigging
  const installationCost = input.includeInstallation
    ? totalAreaSft * (safeFormula.installation_rate || 0)
    : 0

  // 9. Logistics & Pickup Van Transport
  const transportCost = input.includeTransport
    ? safeFormula.transport_rate || 0
    : 0

  const otherCost = 0

  // Total Base Production Cost (internal cost of goods sold)
  const totalBaseCost =
    materialCost +
    printingCost +
    cuttingCost +
    laminationCost +
    finishingCost +
    fabricationCost +
    laborCost +
    installationCost +
    transportCost +
    otherCost

  // Markup / Margin calculation
  const marginPercent = safeFormula.default_margin_percent ?? 40.0
  const multiplier = 1 + marginPercent / 100
  const subtotalBeforeDiscount = Math.round(totalBaseCost * multiplier)
  const grossProfitAmount = subtotalBeforeDiscount - totalBaseCost
  const grossProfitMarginPercent =
    subtotalBeforeDiscount > 0
      ? Math.round((grossProfitAmount / subtotalBeforeDiscount) * 100)
      : 0

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
  const isBelowMinimum = minPriceFloor > 0 && unitPriceBDT < minPriceFloor

  return {
    areaSft: Math.round(totalAreaSft * 100) / 100,
    perimeterFt: Math.round(totalPerimeterFt * 100) / 100,
    quantity: qty,
    componentBreakdown: {
      material: Math.round(materialCost),
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
    totalBaseCost: Math.round(totalBaseCost),
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
  }
}
