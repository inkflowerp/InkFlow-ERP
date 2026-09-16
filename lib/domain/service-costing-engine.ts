/**
 * InkFlow ERP — Authoritative Service Pricing & Costing Engine
 * Calculates customer selling prices, planned material and direct costs,
 * finishing options, additionals, and on-site installation economics.
 */

import {
  calculateProductionGeometry,
  convertLengthToFeet,
  type DimensionInput,
  type AllowanceConfig,
  type ProductionDimensionResult,
} from './production-geometry.ts'
import {
  evaluateMaterialCompatibility,
  type CompatibilityCheckResult,
} from './material-compatibility.ts'
import type {
  ServiceFinishingOption,
  ServiceAdditionalOption,
  ServiceInstallationOption,
  ServiceRequiredMaterial,
} from '../../types/product.types.ts'
import type { InventoryRollRecord, InventoryRemnantRecord } from '../../types/inventory.types.ts'

export interface ServiceCostingInput {
  serviceName: string
  dimensions: DimensionInput
  quantity: number
  unitPrice: number
  pricingMethod?: 'per_sqft' | 'per_piece' | 'per_job' | 'per_rft' | 'fixed' | string
  allowanceRule?: AllowanceConfig
  
  // Selected Options
  selectedFinishing?: ServiceFinishingOption[]
  selectedAdditional?: ServiceAdditionalOption[]
  selectedInstallation?: ServiceInstallationOption | null
  
  // Material specs
  requiredMaterials?: ServiceRequiredMaterial[]
  materialAvailableWidthsFt?: number[]
  materialUnitCostSqft?: number // e.g. ৳18/sqft
  uvInkCostSqft?: number // e.g. ৳4/sqft for UV ink
  
  // Commercial parameters
  minimumCharge?: number
  minBillableQty?: number
  discountAmount?: number
  discountPercent?: number
  vatRatePercent?: number
  
  // Inventory context
  physicalRolls?: InventoryRollRecord[]
  availableRemnants?: InventoryRemnantRecord[]
}

export interface ServiceCostingResult {
  serviceName: string
  quantity: number
  dimensions: ProductionDimensionResult
  compatibility: CompatibilityCheckResult
  
  // Billing quantities
  billableQuantity: number
  actualQuantity: number
  isMinBillableApplied: boolean
  
  // Revenue / Customer Pricing Breakdown
  baseServiceRate: number
  baseServiceAmount: number
  finishingAmount: number
  additionalAmount: number
  installationAmount: number
  subtotalBeforeDiscount: number
  discountAmount: number
  subtotalAfterDiscount: number
  minimumCharge: number
  isMinimumChargeApplied: boolean
  finalSubtotal: number
  vatRatePercent: number
  vatAmount: number
  grandTotalBDT: number
  unitPriceEffective: number
  
  // Planned Cost Breakdown (COGS)
  plannedMaterialCost: number
  plannedInkCost: number
  plannedFinishingCost: number
  plannedAdditionalCost: number
  plannedInstallationCost: number
  plannedLaborCost: number
  totalPlannedCost: number
  
  // Profitability
  grossProfitBDT: number
  grossMarginPercent: number
  markupPercent: number
  
  // Itemized breakdown descriptions for Invoices & Quotations
  finishingBreakdown: Array<{ name: string; price: number; cost: number }>
  additionalBreakdown: Array<{ name: string; price: number; cost: number }>
  installationBreakdown: { name: string; price: number; cost: number } | null
  
  // Commercial snapshot JSON
  commercialSnapshot: Record<string, any>
}

export function calculateServiceCosting(input: any): any {
  const service = input.service
  const srvCfg = service?.service_config || {}

  const customerWidth = input.customer_width ?? input.dimensions?.width ?? 0
  const customerLength = input.customer_length ?? input.dimensions?.length ?? 0
  const dimUnit = input.dimension_unit ?? input.dimensions?.unit ?? srvCfg.dimension_unit ?? 'ft'

  const dimensions = { width: Number(customerWidth) || 0, length: Number(customerLength) || 0, unit: dimUnit }
  const qty = Math.max(1, Number(input.quantity) || 1)
  const geom = calculateProductionGeometry(dimensions, input.allowanceRule, qty)

  const serviceName = input.serviceName || service?.name || 'Service'
  const unitPrice = input.unitPrice ?? service?.selling_price ?? 0
  const minimumCharge = input.minimumCharge ?? service?.minimum_charge ?? srvCfg.minimum_charge ?? 0

  // 1. Material Compatibility Check
  const reqMaterials = input.requiredMaterials || srvCfg.required_materials || []
  const mainMaterial = (reqMaterials.length > 0)
    ? reqMaterials[0]
    : { material_name: 'Roll Media', compatible_widths_ft: input.materialAvailableWidthsFt || [3.0, 4.0, 5.0] }

  const compatibility = evaluateMaterialCompatibility({
    materialName: mainMaterial.material_name,
    productionWidthFt: geom.productionWidthFt,
    productionLengthFt: geom.productionLengthFt,
    availableWidthsFt: mainMaterial.compatible_widths_ft || input.materialAvailableWidthsFt || [3.0, 4.0, 5.0],
    physicalRolls: input.physicalRolls,
    availableRemnants: input.availableRemnants,
  })

  // 2. Billing Quantity Resolution
  const pricingMethod = input.pricingMethod || srvCfg.pricing_method || service?.pricing_method || 'per_area'
  let actualQty = geom.totalCustomerAreaSqft
  if (pricingMethod === 'per_piece' || pricingMethod === 'fixed' || pricingMethod === 'per_job') {
    actualQty = qty
  } else if (pricingMethod === 'per_rft' || pricingMethod === 'per_length') {
    actualQty = geom.customerLengthFt * qty
  }

  const minBillable = Math.max(0, Number(input.minBillableQty) || 0)
  const isMinBillableApplied = minBillable > 0 && actualQty < minBillable
  const billableQty = isMinBillableApplied ? minBillable : actualQty

  // 3. Base Service Pricing
  const baseRate = Math.max(0, Number(unitPrice) || 0)
  const baseServiceAmount = Math.round(billableQty * baseRate * 100) / 100

  // 4. Resolve Finishing Options
  let selectedFinishing: any[] = input.selectedFinishing || []
  if (input.selected_finishing_ids && Array.isArray(input.selected_finishing_ids) && srvCfg.finishing_options) {
    selectedFinishing = srvCfg.finishing_options.filter((f: any) => input.selected_finishing_ids.includes(f.id))
  }

  let finishingAmount = 0
  let finishingCost = 0
  const finishingBreakdown: Array<{ name: string; price: number; cost: number }> = []

  if (selectedFinishing.length > 0) {
    for (const f of selectedFinishing) {
      let fItemPrice = 0
      let fItemCost = 0
      const price = Number(f.unit_price ?? f.price) || 0
      const cost = Number(f.unit_cost ?? f.cost) || 0

      if (f.pricing_method === 'per_sqft' || f.pricing_method === 'per_area') {
        fItemPrice = geom.totalCustomerAreaSqft * price
        fItemCost = geom.totalProductionAreaSqft * cost
      } else if (f.pricing_method === 'per_rft' || f.pricing_method === 'per_length') {
        const perimeterFt = 2 * (geom.customerWidthFt + geom.customerLengthFt) * qty
        fItemPrice = perimeterFt * price
        fItemCost = perimeterFt * cost
      } else if (f.pricing_method === 'per_piece') {
        fItemPrice = qty * price
        fItemCost = qty * cost
      } else {
        fItemPrice = price
        fItemCost = cost
      }

      finishingAmount += fItemPrice
      finishingCost += fItemCost
      finishingBreakdown.push({
        name: f.name,
        price: Math.round(fItemPrice * 100) / 100,
        cost: Math.round(fItemCost * 100) / 100,
      })
    }
  }

  // 5. Resolve Additional Options
  let selectedAdditional: any[] = input.selectedAdditional || []
  if (input.selected_additional_ids && Array.isArray(input.selected_additional_ids) && srvCfg.additional_options) {
    selectedAdditional = srvCfg.additional_options.filter((a: any) => input.selected_additional_ids.includes(a.id))
  }

  let additionalAmount = 0
  let additionalCost = 0
  const additionalBreakdown: Array<{ name: string; price: number; cost: number }> = []

  if (selectedAdditional.length > 0) {
    for (const a of selectedAdditional) {
      let aItemPrice = 0
      let aItemCost = 0
      const price = Number(a.unit_price ?? a.price) || 0
      const cost = Number(a.unit_cost ?? a.cost) || 0

      if (a.pricing_method === 'per_sqft' || a.pricing_method === 'per_area') {
        aItemPrice = geom.totalCustomerAreaSqft * price
        aItemCost = geom.totalProductionAreaSqft * cost
      } else if (a.pricing_method === 'per_piece') {
        aItemPrice = qty * price
        aItemCost = qty * cost
      } else {
        aItemPrice = price
        aItemCost = cost
      }

      additionalAmount += aItemPrice
      additionalCost += aItemCost
      additionalBreakdown.push({
        name: a.name,
        price: Math.round(aItemPrice * 100) / 100,
        cost: Math.round(aItemCost * 100) / 100,
      })
    }
  }

  // 6. Resolve Installation / Fulfillment
  let selectedInstallation: any = input.selectedInstallation || null
  if (input.selected_installation_id && srvCfg.installation_options) {
    selectedInstallation = srvCfg.installation_options.find((inst: any) => inst.id === input.selected_installation_id) || null
  }

  let installationAmount = 0
  let installationCost = 0
  let installationBreakdown: { name: string; price: number; cost: number } | null = null

  if (selectedInstallation) {
    const inst = selectedInstallation
    const price = Number(inst.unit_price ?? inst.price) || 0
    const cost = Number(inst.unit_cost ?? inst.cost) || 0

    if (inst.pricing_method === 'per_sqft' || inst.pricing_method === 'per_area') {
      installationAmount = geom.totalCustomerAreaSqft * price
      installationCost = geom.totalCustomerAreaSqft * cost
    } else if (inst.pricing_method === 'per_piece') {
      installationAmount = qty * price
      installationCost = qty * cost
    } else {
      installationAmount = price
      installationCost = cost
    }

    installationBreakdown = {
      name: inst.name,
      price: Math.round(installationAmount * 100) / 100,
      cost: Math.round(installationCost * 100) / 100,
    }
  }

  // 7. Subtotals & Discounts
  const subtotalBeforeDiscount = Math.round((baseServiceAmount + finishingAmount + additionalAmount + installationAmount) * 100) / 100
  let discountAmount = Number(input.discountAmount) || 0
  if (input.discountPercent && input.discountPercent > 0) {
    discountAmount = Math.round((subtotalBeforeDiscount * input.discountPercent) / 100 * 100) / 100
  }
  const subtotalAfterDiscount = Math.max(0, subtotalBeforeDiscount - discountAmount)

  // 8. Minimum Charge Rule
  const minCharge = Math.max(0, Number(minimumCharge) || 0)
  const isMinimumChargeApplied = minCharge > 0 && subtotalAfterDiscount < minCharge
  const finalSubtotal = isMinimumChargeApplied ? minCharge : subtotalAfterDiscount

  // 9. Taxes (VAT)
  const vatRate = Number(input.vatRatePercent ?? service?.tax_rate) || 0
  const vatAmount = Math.round((finalSubtotal * vatRate) / 100 * 100) / 100
  const grandTotalBDT = Math.round((finalSubtotal + vatAmount) * 100) / 100
  const unitPriceEffective = qty > 0 ? Math.round((grandTotalBDT / qty) * 100) / 100 : grandTotalBDT

  // 10. Planned Production Direct Costs (COGS)
  const matUnitCost = Number(input.materialUnitCostSqft ?? service?.base_cost) || 18.0
  const inkUnitCost = Number(input.uvInkCostSqft) || 4.0
  const plannedMaterialCost = Math.round(geom.totalProductionAreaSqft * matUnitCost * 100) / 100
  const plannedInkCost = Math.round(geom.totalCustomerAreaSqft * inkUnitCost * 100) / 100
  const plannedLaborCost = Math.round(geom.totalCustomerAreaSqft * 3.0 * 100) / 100 // standard ৳3/sqft labor

  const totalPlannedCost = Math.round(
    (plannedMaterialCost + plannedInkCost + finishingCost + additionalCost + installationCost + plannedLaborCost) * 100
  ) / 100

  // 11. Profitability Analysis
  const grossProfitBDT = Math.round((finalSubtotal - totalPlannedCost) * 100) / 100
  const grossMarginPercent = finalSubtotal > 0
    ? Math.round((grossProfitBDT / finalSubtotal) * 10000) / 100
    : 0
  const markupPercent = totalPlannedCost > 0
    ? Math.round((grossProfitBDT / totalPlannedCost) * 10000) / 100
    : 0

  const commercialSnapshot = {
    service_name: serviceName,
    serviceName,
    dimensions_summary: geom.formattedCustomerDimension,
    customerDimensions: geom.formattedCustomerDimension,
    production_dimensions_summary: geom.formattedProductionDimension,
    productionDimensions: geom.formattedProductionDimension,
    quantity: qty,
    unit_price: baseRate,
    unitPrice: baseRate,
    total_area_sqft: geom.totalCustomerAreaSqft,
    billable_quantity: billableQty,
    billableQuantity: billableQty,
    subtotal: finalSubtotal,
    total_price: finalSubtotal,
    selected_finishing: finishingBreakdown.map((f) => f.name),
    finishing: finishingBreakdown,
    selected_additional: additionalBreakdown.map((a) => a.name),
    additionals: additionalBreakdown,
    selected_installation: installationBreakdown?.name || null,
    installation: installationBreakdown,
    planned_cost: totalPlannedCost,
    plannedCost: totalPlannedCost,
    gross_margin_percent: grossMarginPercent,
    grossMarginPercent,
    vat_rate_percent: vatRate,
    vatRatePercent: vatRate,
    grand_total: grandTotalBDT,
    grandTotal: grandTotalBDT,
    compatibility_status: compatibility.reasonCode,
    compatibilityStatus: compatibility.reasonCode,
  }

  return {
    serviceName,
    quantity: qty,
    dimensions: geom,
    compatibility,
    billableQuantity: billableQty,
    actualQuantity: actualQty,
    isMinBillableApplied,
    baseServiceRate: baseRate,
    baseServiceAmount,
    finishingAmount,
    additionalAmount,
    installationAmount,
    subtotalBeforeDiscount,
    discountAmount,
    subtotalAfterDiscount,
    minimumCharge: minCharge,
    isMinimumChargeApplied,
    finalSubtotal,
    vatRatePercent: vatRate,
    vatAmount,
    grandTotalBDT,
    unitPriceEffective,
    plannedMaterialCost,
    plannedInkCost,
    plannedFinishingCost: finishingCost,
    plannedAdditionalCost: additionalCost,
    plannedInstallationCost: installationCost,
    plannedLaborCost,
    totalPlannedCost,
    grossProfitBDT,
    grossMarginPercent,
    markupPercent,
    finishingBreakdown,
    additionalBreakdown,
    installationBreakdown,
    commercialSnapshot,

    // Snake_case aliases
    customer_single_area_sqft: geom.singleCustomerAreaSqft,
    total_customer_area_sqft: geom.totalCustomerAreaSqft,
    production_geometry: geom,
    production_single_area_sqft: geom.singleProductionAreaSqft,
    total_production_area_sqft: geom.totalProductionAreaSqft,
    base_service_price: baseServiceAmount,
    finishing_total_price: finishingAmount,
    additional_total_price: additionalAmount,
    installation_total_price: installationAmount,
    subtotal_price: subtotalBeforeDiscount,
    is_minimum_charge_applied: isMinimumChargeApplied,
    final_selling_price: finalSubtotal,
    commercial_snapshot: commercialSnapshot,
  }
}
