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
  let selectedFinishing: any[] = input.selectedFinishing || input.finishing_options || input.finishingOptions || input.selected_finishing || []
  if (input.selected_finishing_ids && Array.isArray(input.selected_finishing_ids) && srvCfg.finishing_options) {
    selectedFinishing = srvCfg.finishing_options.filter((f: any) => input.selected_finishing_ids.includes(f.id))
  }

  let finishingAmount = 0
  let finishingCost = 0
  const finishingBreakdown: Array<{ name: string; price: number; cost: number; totalPrice: number; totalCost: number; quantity: number; unitPrice: number }> = []

  if (selectedFinishing.length > 0) {
    for (const f of selectedFinishing) {
      let fItemPrice = 0
      let fItemCost = 0
      let itemQty = qty
      const price = Number(f.unit_price ?? f.price) || 0
      const cost = Number(f.unit_cost ?? f.cost) || 0

      if (f.pricing_method === 'per_sqft' || f.pricing_method === 'per_area') {
        itemQty = geom.totalCustomerAreaSqft
        fItemPrice = geom.totalCustomerAreaSqft * price
        fItemCost = geom.totalProductionAreaSqft * cost
      } else if (f.pricing_method === 'per_rft' || f.pricing_method === 'per_length') {
        const perimeterFt = 2 * (geom.customerWidthFt + geom.customerLengthFt) * qty
        itemQty = perimeterFt
        fItemPrice = perimeterFt * price
        fItemCost = perimeterFt * cost
      } else if (f.pricing_method === 'per_piece') {
        const compQty = Math.max(1, Number(f.quantity_per_piece ?? f.component_quantity) || 1)
        itemQty = qty * compQty
        fItemPrice = itemQty * price
        fItemCost = itemQty * cost
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
        totalPrice: Math.round(fItemPrice * 100) / 100,
        totalCost: Math.round(fItemCost * 100) / 100,
        quantity: itemQty,
        unitPrice: price,
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
        const compQty = Math.max(1, Number(a.quantity_per_piece ?? a.component_quantity) || 1)
        const totalCompQty = qty * compQty
        aItemPrice = totalCompQty * price
        aItemCost = totalCompQty * cost
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

export interface BOMConsumptionContext {
  orderQuantity?: number
  customerWidthFt?: number
  customerLengthFt?: number
  customerAreaSqft?: number
  productionAreaSqft?: number
  perimeterFt?: number
}

/**
 * Canonical formula engine for evaluating raw material BOM consumption and cost
 */
export function evaluateBOMConsumption(
  item: ServiceRequiredMaterial,
  context: BOMConsumptionContext = {}
): {
  requiredQuantity: number
  unitCost: number
  subtotalCost: number
  wasteQuantity: number
} {
  const method = (item.consumption_method || item.consumption_rule || 'per_sqft').toLowerCase()
  const qtyPerUnit = Math.max(0, Number(item.quantity_per_unit ?? item.quantity_required) || 1)
  const wastePercent = Math.max(0, Number(item.waste_percent) || 0)
  const unitCost = Math.max(0, Number(item.unit_cost) || 0)
  const orderQty = Math.max(0, Number(context.orderQuantity ?? 1))
  const widthFt = Math.max(0, Number(context.customerWidthFt) || 0)
  const lengthFt = Math.max(0, Number(context.customerLengthFt) || 0)
  const areaSqft = Math.max(0, Number(context.productionAreaSqft ?? context.customerAreaSqft ?? (widthFt * lengthFt)))
  const perimeterFt = Math.max(0, Number(context.perimeterFt ?? (2 * (widthFt + lengthFt))))

  let baseQty = qtyPerUnit

  switch (method) {
    case 'area_print':
    case 'area_direct':
    case 'area_sqft':
      baseQty = areaSqft * qtyPerUnit
      break
    case 'per_piece':
    case 'piece_count':
      baseQty = orderQty * qtyPerUnit
      break
    case 'per_sqft':
      baseQty = areaSqft * qtyPerUnit
      break
    case 'per_sqm':
      baseQty = (areaSqft / 10.7639) * qtyPerUnit
      break
    case 'per_rft':
    case 'linear_direct':
    case 'roll_linear_length':
      baseQty = perimeterFt * qtyPerUnit
      break
    case 'per_inch':
      baseQty = perimeterFt * 12 * qtyPerUnit
      break
    case 'fixed':
      baseQty = qtyPerUnit
      break
    case 'formula':
      if (item.consumption_formula && item.consumption_formula.trim() !== '') {
        try {
          const formula = item.consumption_formula
            .replace(/width/gi, String(widthFt || 1))
            .replace(/height|length/gi, String(lengthFt || 1))
            .replace(/area/gi, String(areaSqft || 1))
            .replace(/qty|quantity/gi, String(orderQty || 1))
            .replace(/perimeter/gi, String(perimeterFt || 1))
          
          // Guard against division by zero in formula string (e.g. / 0)
          if (/\/(\s*)0+(\.0+)?(\s*[\+\-\*\/\)\,]|$)/.test(formula)) {
            baseQty = qtyPerUnit
          } else {
            const calculated = Function(`"use strict"; return (${formula})`)()
            if (!isNaN(calculated) && isFinite(calculated) && Number(calculated) >= 0) {
              baseQty = Number(calculated)
            } else {
              baseQty = qtyPerUnit
            }
          }
        } catch {
          baseQty = qtyPerUnit
        }
      } else {
        baseQty = qtyPerUnit
      }
      break
    default:
      baseQty = qtyPerUnit
      break
  }

  const wasteQty = baseQty * (wastePercent / 100)
  const totalQty = baseQty + wasteQty
  const subtotalCost = Math.round(totalQty * unitCost * 100) / 100

  return {
    requiredQuantity: parseFloat(totalQty.toFixed(4)),
    unitCost,
    subtotalCost,
    wasteQuantity: parseFloat(wasteQty.toFixed(4)),
  }
}

/**
 * Creates an authoritative, immutable recipe snapshot when a Quotation or Job Order is created.
 * Guarantees that future edits to the Service Master, raw material inventory prices,
 * or BOM specifications never alter historical quotes, invoices, or completed jobs.
 */
export function createServiceJobSnapshot(
  service: any,
  input: any = {},
  costingResult: any = {}
): any {
  const srvCfg = service?.service_config || {}
  const geom = costingResult.dimensions || calculateProductionGeometry(
    { width: input.customer_width || input.width || 0, length: input.customer_length || input.height || 0, unit: input.dimension_unit || 'ft' },
    input.allowanceRule,
    Math.max(1, Number(input.quantity) || 1)
  )

  const printMedia = srvCfg.substrate || srvCfg.bom?.consumption_groups?.print_media || {
    material_id: service?.printable_material_id,
    material_name: service?.printable_material_name,
    consumption_method: 'area_print',
    waste_percent: srvCfg.default_wastage_percent ?? service?.default_wastage_percentage ?? 5,
    unit_cost: costingResult.plannedMaterialCost && geom.totalProductionAreaSqft > 0 ? costingResult.plannedMaterialCost / geom.totalProductionAreaSqft : Number(service?.base_cost) || 0,
    subtotal_cost: costingResult.plannedMaterialCost || 0,
  }

  const ink = srvCfg.ink || srvCfg.bom?.consumption_groups?.ink || {
    profile: srvCfg.ink_profile || 'cmyk_standard',
    channels: srvCfg.selected_inks || [],
    consume_per_unit_ml: srvCfg.consume_per_unit_ml || 1.2,
    unit_cost: costingResult.plannedInkCost && geom.totalCustomerAreaSqft > 0 ? costingResult.plannedInkCost / geom.totalCustomerAreaSqft : Number(srvCfg.ink_cost) || 0,
  }

  const finishingMaterials = (srvCfg.required_materials || []).filter((m: any) =>
    (m.category || '').toLowerCase().includes('finish') || (m.material_name || '').toLowerCase().includes('laminat')
  )

  const additionalConsumables = (srvCfg.required_materials || []).filter((m: any) =>
    !(m.category || '').toLowerCase().includes('finish') && !(m.material_name || '').toLowerCase().includes('laminat') && !m.is_primary
  )

  const consumptionGroups = {
    print_media: printMedia,
    ink,
    finishing_materials: finishingMaterials,
    additional_consumables: additionalConsumables,
  }

  return {
    snapshot_version: 1,
    snapshot_created_at: new Date().toISOString(),
    service_id: service?.id,
    service_name: service?.name || 'Printing Service',
    service_sku: service?.sku,
    service_type: service?.service_type || srvCfg.service_type || 'printing',
    category: service?.category || srvCfg.category,
    sub_category: service?.sub_category || srvCfg.sub_category,
    technology: service?.print_technology || srvCfg.print_technology || srvCfg.classification?.technology,
    production_method: service?.production_method || srvCfg.production_method || srvCfg.classification?.production_method,
    department: service?.default_department || srvCfg.default_department || srvCfg.classification?.department,

    consumption_groups: consumptionGroups,

    customer_dimensions: {
      width: geom.singleCustomerWidthFt || Number(input.customer_width) || 0,
      length: geom.singleCustomerLengthFt || Number(input.customer_length) || 0,
      unit: input.dimension_unit || 'ft',
      total_area_sqft: geom.totalCustomerAreaSqft || 0,
    },
    production_dimensions: {
      width: geom.singleProductionWidthFt || 0,
      length: geom.singleProductionLengthFt || 0,
      formatted_spec: geom.formattedProductionDimension || '',
      total_area_sqft: geom.totalProductionAreaSqft || 0,
    },
    order_quantity: Math.max(1, Number(input.quantity) || 1),
    billable_quantity: costingResult.billableQuantity || costingResult.total_customer_area_sqft || 0,

    selected_finishing: (costingResult.finishingBreakdown || []).map((f: any) => ({
      name: f.name,
      pricing_method: f.pricing_method || 'per_sqft',
      unit_cost: f.cost || 0,
      price: f.price || 0,
    })),
    selected_additionals: (costingResult.additionalBreakdown || []).map((a: any) => ({
      name: a.name,
      pricing_method: a.pricing_method || 'per_piece',
      unit_cost: a.cost || 0,
      price: a.price || 0,
    })),
    installation_config: costingResult.installationBreakdown ? {
      required: true,
      unit_cost: costingResult.installationBreakdown.cost || 0,
      price: costingResult.installationBreakdown.price || 0,
    } : undefined,
    delivery_config: costingResult.deliveryBreakdown ? {
      required: true,
      unit_cost: costingResult.deliveryBreakdown.cost || 0,
      price: costingResult.deliveryBreakdown.price || 0,
    } : undefined,

    pricing: {
      unit: service?.selling_unit || srvCfg.billing?.selling_unit || 'sft',
      base_selling_rate: costingResult.baseServiceRate || service?.selling_price || 0,
      minimum_job_charge: costingResult.minimumCharge || service?.minimum_charge,
      discount_amount: costingResult.discountAmount || 0,
      subtotal: costingResult.finalSubtotal || costingResult.final_selling_price || 0,
      tax_rate_percent: costingResult.vatRatePercent || service?.tax_rate || 0,
      grand_total: costingResult.grandTotalBDT || costingResult.finalSubtotal || 0,
    },

    cost_assumptions: {
      estimated_media_cost: costingResult.plannedMaterialCost || 0,
      estimated_ink_cost: costingResult.plannedInkCost || 0,
      estimated_machine_cost: Number(service?.machine_hourly_rate) || 0,
      estimated_labor_cost: costingResult.plannedLaborCost || 0,
      estimated_finishing_cost: costingResult.plannedFinishingCost || 0,
      estimated_additional_cost: costingResult.plannedAdditionalCost || 0,
      estimated_installation_cost: costingResult.plannedInstallationCost || 0,
      estimated_delivery_cost: 0,
      total_estimated_direct_cost: costingResult.totalPlannedCost || 0,
      gross_profit: costingResult.grossProfitBDT || 0,
      gross_margin_percent: costingResult.grossMarginPercent || 0,
    },
  }
}
