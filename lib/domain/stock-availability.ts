/**
 * Authoritative Stock Availability & Warning Engine
 * Evaluates required materials vs. available physical inventory.
 * Strictly separates:
 * 1. LOW STOCK: Current inventory is below configured reorder level.
 * 2. INSUFFICIENT FOR THIS ORDER: Available usable stock is less than this order's requirement.
 * 3. GEOMETRY INCOMPATIBLE: Physical roll width does not fit production dimensions.
 */

import { calculateProductionDimensions, resolveAllowanceHierarchy } from './production-geometry.ts'
import { evaluateMaterialCompatibility } from './material-compatibility.ts'
import type { InventoryRollRecord, InventoryRemnantRecord, MaterialRecord, InventoryStockBalanceRecord } from '../../types/inventory.types.ts'
import type { ProductRecord } from '../../types/product.types.ts'

export type AvailabilityStatus =
  | 'AVAILABLE'
  | 'LOW_STOCK'
  | 'INSUFFICIENT_FOR_ORDER'
  | 'OUT_OF_STOCK'
  | 'GEOMETRY_INCOMPATIBLE'
  | 'UNVERIFIED'

export interface StockAvailabilityResult {
  status: AvailabilityStatus
  isAvailableForOrder: boolean
  isLowStock: boolean
  isShortage: boolean
  isGeometryCompatible: boolean
  requiredQty: number
  requiredUnit: string
  availableQty: number
  shortageQty: number
  reorderLevel: number
  productionWidthFt?: number
  productionLengthFt?: number
  compatibleRollsCount: number
  compatibleRemnantsCount: number
  warningTitle?: string
  warningMessage?: string
  badgeVariant: 'success' | 'warning' | 'destructive' | 'neutral'
}

export interface EvaluateAvailabilityInput {
  service?: ProductRecord | null
  materialId?: string | null
  materialName?: string | null
  customerWidthFt: number
  customerLengthFt: number
  quantity: number
  allowancePerSideIn?: number
  materials?: MaterialRecord[]
  stockBalances?: InventoryStockBalanceRecord[]
  physicalRolls?: InventoryRollRecord[]
  remnants?: InventoryRemnantRecord[]
}

export function evaluateStockAvailability(
  input: EvaluateAvailabilityInput
): StockAvailabilityResult {
  const {
    service,
    materialId,
    materialName,
    customerWidthFt,
    customerLengthFt,
    quantity,
    allowancePerSideIn,
    materials = [],
    stockBalances = [],
    physicalRolls = [],
    remnants = [],
  } = input

  // If no dimensions or qty provided, return UNVERIFIED
  if (!customerWidthFt || !customerLengthFt || quantity <= 0) {
    return {
      status: 'AVAILABLE',
      isAvailableForOrder: true,
      isLowStock: false,
      isShortage: false,
      isGeometryCompatible: true,
      requiredQty: 0,
      requiredUnit: 'sft',
      availableQty: 0,
      shortageQty: 0,
      reorderLevel: 0,
      compatibleRollsCount: 0,
      compatibleRemnantsCount: 0,
      badgeVariant: 'neutral',
    }
  }

  // 1. Resolve Material
  const cfg = service?.service_config as any
  const targetMatId = materialId || cfg?.required_material_id || cfg?.required_materials?.[0]?.material_id
  const targetMatName = materialName || cfg?.required_material_name
  const material = materials.find((m) => m.id === targetMatId || m.name === targetMatName)

  if (!material) {
    return {
      status: 'UNVERIFIED',
      isAvailableForOrder: true,
      isLowStock: false,
      isShortage: false,
      isGeometryCompatible: true,
      requiredQty: customerWidthFt * customerLengthFt * quantity,
      requiredUnit: 'sft',
      availableQty: 0,
      shortageQty: 0,
      reorderLevel: 0,
      compatibleRollsCount: 0,
      compatibleRemnantsCount: 0,
      warningTitle: 'Material Stock Unverified',
      warningMessage: 'Material availability has not been confirmed in inventory master.',
      badgeVariant: 'neutral',
    }
  }

  // 2. Resolve Production Geometry & Allowance
  const resolvedAllowance = resolveAllowanceHierarchy({
    serviceDefaultAllowanceIn: (service?.service_config as any)?.allowance_per_side_in,
    materialOverrideAllowanceIn: material.default_allowance_per_side_in,
    customerOverrideAllowanceIn: allowancePerSideIn,
  })

  const prodDim = calculateProductionDimensions(customerWidthFt, customerLengthFt, {
    dimension_unit: 'ft',
    allowance_per_side_in: resolvedAllowance.allowance_width_in,
    quantity,
  })

  const singleProductionAreaSqft = prodDim.productionWidthFt * prodDim.productionLengthFt
  const totalRequiredAreaSqft = singleProductionAreaSqft * quantity
  const requiredLinearFt = prodDim.productionLengthFt * quantity

  const isRoll = material.is_roll || material.material_type === 'roll' || material.category === 'roll_media'

  // 3. Resolve Current Stock Balance
  const balance = stockBalances.find((b) => b.material_id === material.id)
  const availableStockQty = balance ? balance.available_quantity : Number(material.current_stock) || 0
  const reorderLevel = Number(material.reorder_level || material.min_stock_level) || 0

  const isLowStock = availableStockQty <= reorderLevel && availableStockQty > 0

  // 4. Physical Geometry & Roll Compatibility Check
  if (isRoll) {
    const activeMaterialRolls = physicalRolls.filter(
      (r) => r.material_id === material.id && (r.status === 'available' || r.status === 'mounted' || r.status === 'in_warehouse')
    )
    const activeRemnants = remnants.filter(
      (rem) => ((rem as any).material_id === material.id || rem.parent_material_id === material.id) && rem.status === 'available'
    )

    const availableRollWidths = material.available_widths_ft && material.available_widths_ft.length > 0
      ? material.available_widths_ft
      : activeMaterialRolls.map((r) => r.width_ft).filter(Boolean)

    const compatResult = evaluateMaterialCompatibility({
      customerWidthFt,
      customerLengthFt,
      allowancePerSideIn: resolvedAllowance.allowance_width_in,
      availableRollWidthsFt: availableRollWidths.length > 0 ? availableRollWidths : [3, 4, 5, 6, 10],
      activePhysicalRolls: activeMaterialRolls,
      availableRemnants: activeRemnants,
    })

    if (!compatResult.isCompatible) {
      return {
        status: 'GEOMETRY_INCOMPATIBLE',
        isAvailableForOrder: false,
        isLowStock,
        isShortage: true,
        isGeometryCompatible: false,
        requiredQty: totalRequiredAreaSqft,
        requiredUnit: 'sqft',
        availableQty: availableStockQty,
        shortageQty: totalRequiredAreaSqft,
        reorderLevel,
        productionWidthFt: prodDim.productionWidthFt,
        productionLengthFt: prodDim.productionLengthFt,
        compatibleRollsCount: 0,
        compatibleRemnantsCount: 0,
        warningTitle: 'Physical Geometry Incompatible',
        warningMessage: compatResult.rejectionReason || compatResult.message || `No configured roll width fits ${prodDim.formatted_production_spec || prodDim.formattedProductionDimension} production width.`,
        badgeVariant: 'destructive',
      }
    }

    const compatibleRolls = compatResult.compatible_physical_rolls || compatResult.compatiblePhysicalRolls || []
    const compatibleRemnants = compatResult.compatible_remnants || compatResult.compatibleRemnants || []

    // Calculate total linear/sqft stock across compatible physical rolls
    const totalCompatibleSqft = compatibleRolls.reduce((sum: number, r: any) => sum + (r.remaining_area_sft || (r.width_ft * (r.current_length_ft || r.initial_length_ft))), 0)

    if ((activeMaterialRolls.length > 0 && totalCompatibleSqft < totalRequiredAreaSqft) || (availableStockQty < totalRequiredAreaSqft)) {
      const shortage = Math.max(0, totalRequiredAreaSqft - availableStockQty)
      return {
        status: 'INSUFFICIENT_FOR_ORDER',
        isAvailableForOrder: false,
        isLowStock,
        isShortage: true,
        isGeometryCompatible: true,
        requiredQty: totalRequiredAreaSqft,
        requiredUnit: 'sqft',
        availableQty: availableStockQty,
        shortageQty: shortage,
        reorderLevel,
        productionWidthFt: prodDim.productionWidthFt,
        productionLengthFt: prodDim.productionLengthFt,
        compatibleRollsCount: compatibleRolls.length,
        compatibleRemnantsCount: compatibleRemnants.length,
        warningTitle: 'Insufficient Material For Order',
        warningMessage: `Required: ${totalRequiredAreaSqft.toFixed(1)} sqft (${requiredLinearFt.toFixed(1)} linear ft) | Available: ${availableStockQty.toFixed(1)} sqft (Shortage: ${shortage.toFixed(1)} sqft).`,
        badgeVariant: 'warning',
      }
    }

    if (isLowStock) {
      return {
        status: 'LOW_STOCK',
        isAvailableForOrder: true,
        isLowStock: true,
        isShortage: false,
        isGeometryCompatible: true,
        requiredQty: totalRequiredAreaSqft,
        requiredUnit: 'sqft',
        availableQty: availableStockQty,
        shortageQty: 0,
        reorderLevel,
        productionWidthFt: prodDim.productionWidthFt,
        productionLengthFt: prodDim.productionLengthFt,
        compatibleRollsCount: compatibleRolls.length,
        compatibleRemnantsCount: compatibleRemnants.length,
        warningTitle: 'Low Stock Level',
        warningMessage: `Current stock (${availableStockQty} sqft) is below reorder threshold (${reorderLevel} sqft).`,
        badgeVariant: 'warning',
      }
    }

    return {
      status: 'AVAILABLE',
      isAvailableForOrder: true,
      isLowStock: false,
      isShortage: false,
      isGeometryCompatible: true,
      requiredQty: totalRequiredAreaSqft,
      requiredUnit: 'sqft',
      availableQty: availableStockQty,
      shortageQty: 0,
      reorderLevel,
      productionWidthFt: prodDim.productionWidthFt,
      productionLengthFt: prodDim.productionLengthFt,
      compatibleRollsCount: compatibleRolls.length,
      compatibleRemnantsCount: compatibleRemnants.length,
      badgeVariant: 'success',
    }
  }

  // Non-roll / Sheet / Liquid / Hardware Piece stock check
  const requiredQty = quantity
  if (availableStockQty < requiredQty) {
    const shortage = requiredQty - availableStockQty
    return {
      status: 'INSUFFICIENT_FOR_ORDER',
      isAvailableForOrder: false,
      isLowStock,
      isShortage: true,
      isGeometryCompatible: true,
      requiredQty,
      requiredUnit: material.unit || 'pcs',
      availableQty: availableStockQty,
      shortageQty: shortage,
      reorderLevel,
      compatibleRollsCount: 0,
      compatibleRemnantsCount: 0,
      warningTitle: 'Insufficient Stock For Order',
      warningMessage: `Required: ${requiredQty} ${material.unit} | Available: ${availableStockQty} ${material.unit} (Shortage: ${shortage} ${material.unit}).`,
      badgeVariant: 'warning',
    }
  }

  if (isLowStock) {
    return {
      status: 'LOW_STOCK',
      isAvailableForOrder: true,
      isLowStock: true,
      isShortage: false,
      isGeometryCompatible: true,
      requiredQty,
      requiredUnit: material.unit || 'pcs',
      availableQty: availableStockQty,
      shortageQty: 0,
      reorderLevel,
      compatibleRollsCount: 0,
      compatibleRemnantsCount: 0,
      warningTitle: 'Low Stock Level',
      warningMessage: `Current stock (${availableStockQty} ${material.unit}) is below reorder threshold (${reorderLevel} ${material.unit}).`,
      badgeVariant: 'warning',
    }
  }

  return {
    status: 'AVAILABLE',
    isAvailableForOrder: true,
    isLowStock: false,
    isShortage: false,
    isGeometryCompatible: true,
    requiredQty,
    requiredUnit: material.unit || 'pcs',
    availableQty: availableStockQty,
    shortageQty: 0,
    reorderLevel,
    compatibleRollsCount: 0,
    compatibleRemnantsCount: 0,
    badgeVariant: 'success',
  }
}
