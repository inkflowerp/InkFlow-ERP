import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import {
  calculateCommercialPricing,
  calculateEffectiveUnitCost,
  calculateGrossMargin,
  calculateSuggestedSellingPrice,
  calculateProductionDimensions,
  calculateRollCuttingYield,
  calculateMultiJobRollConsumption,
  convertDimensionsToSqft,
  convertDimensionToRft,
  convertLengthToFeet,
  calculateRollAreaSqft,
} from '../../lib/units.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Unit: Real-World Roll Material & Cutting Consumption Audit', () => {
  const companyId = 'tenant-roll-cutting-audit'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_HISTORY, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_OVERRIDES, [])
  })

  // =========================================================================
  // 1. CORE FLEX BANNER EXAMPLE VERIFICATION
  // =========================================================================
  describe('1. Core Flex Banner Roll Economics & Dimension Separation', () => {
    it('1.1 Strictly separates 3x10 ft customer billing from 3.25x10.25 ft physical production', () => {
      const dim = calculateProductionDimensions({
        sellingWidth: 3.0,
        sellingHeight: 10.0,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
        quantity: 1,
      })

      // Customer Selling Dimensions & Area
      assert.strictEqual(dim.sellingWidth, 3.0)
      assert.strictEqual(dim.sellingHeight, 10.0)
      assert.strictEqual(dim.singleSellingAreaSqft, 30.0)
      assert.strictEqual(dim.billableAreaSqft, 30.0)

      // Physical Production Dimensions & Consumption
      assert.strictEqual(dim.productionWidth, 3.25)
      assert.strictEqual(dim.productionHeight, 10.25)
      assert.strictEqual(dim.singleProductionAreaSqft, 33.3125)
      assert.strictEqual(dim.physicalConsumptionSqft, 33.3125)

      // Production Allowance Delta
      assert.strictEqual(dim.allowanceAreaSqft, 3.3125)
      assert.strictEqual(dim.allowanceRatio, 1.1104) // 11.04% media expansion
    })

    it('1.2 Verifies cost mathematics and margin without double-counting', () => {
      // Roll: 3.25 ft x 164 ft = 533 sqft @ ৳8,500
      const rollArea = calculateRollAreaSqft(3.25, 164)
      assert.strictEqual(rollArea, 533)

      const rawCostPerSqft = Math.round((8500 / 533) * 10000) / 10000 // 15.9475
      assert.strictEqual(rawCostPerSqft, 15.9475)

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 3.0,
        height: 10.0,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
        quantity: 1,
        catalogSellingPrice: 28.0,
        effectiveMaterialCost: rawCostPerSqft,
      })

      // Customer receives bill for 30 sqft @ ৳28 = ৳840.00
      assert.strictEqual(pricing.outputQuantity, 30.0)
      assert.strictEqual(pricing.billableQuantity, 30.0)
      assert.strictEqual(pricing.finalAmount, 840.0)

      // Shop floor consumes 33.3125 sqft
      assert.strictEqual(pricing.productionAreaSqft, 33.3125)
      assert.strictEqual(pricing.physicalConsumptionSqft, 33.3125)
      assert.strictEqual(pricing.costingQuantity, 33.3125)

      // Material cost is 33.3125 * 15.9475 = ৳531.25
      assert.strictEqual(pricing.estimatedMaterialCost, 531.25)

      // Profit & Margin
      assert.strictEqual(pricing.grossProfitAmount, 308.75) // 840.00 - 531.25 = 308.75
      assert.strictEqual(pricing.grossMarginPercent, 36.76) // 308.75 / 840.00 = 36.76%
    })
  })

  // =========================================================================
  // 2. ROLL CUTTING YIELD & REMNANT AUDIT
  // =========================================================================
  describe('2. Roll Cutting Yield & Remnant Precision', () => {
    it('2.1 Verifies 3.25x164 ft roll yields exactly 16 jobs of 3.25x10.25 ft with 0 ft remnant', () => {
      const yieldCalc = calculateRollCuttingYield({
        rollWidthFt: 3.25,
        rollLengthFt: 164.0,
        sellingWidthFt: 3.0,
        sellingLengthFt: 10.0,
        widthAllowanceFt: 0.25,
        lengthAllowanceFt: 0.25,
      })

      assert.strictEqual(yieldCalc.totalRollAreaSqft, 533.0)
      assert.strictEqual(yieldCalc.lanesAcrossWidth, 1) // 3.25 / 3.25 = 1 lane
      assert.strictEqual(yieldCalc.cutsAlongLength, 16) // floor(164 / 10.25) = 16
      assert.strictEqual(yieldCalc.maxFullJobsYield, 16)

      // 16 * 10.25 = 164.0 ft consumed
      assert.strictEqual(yieldCalc.linearLengthConsumedFt, 164.0)
      assert.strictEqual(yieldCalc.remainingRollLengthFt, 0.0)
      assert.strictEqual(yieldCalc.remainingRollRemnantAreaSqft, 0.0)

      // Physical area cut = 16 * 33.3125 = 533 sqft
      assert.strictEqual(yieldCalc.totalPhysicalAreaCutSqft, 533.0)
      // Customer sellable area = 16 * 30 = 480 sqft
      assert.strictEqual(yieldCalc.totalSellableCustomerAreaSqft, 480.0)
      // Production allowance media absorbed = 533 - 480 = 53 sqft
      assert.strictEqual(yieldCalc.totalProductionAllowanceSqft, 53.0)
      assert.strictEqual(yieldCalc.cuttingEfficiencyPercent, 100.0)
    })

    it('2.2 Demonstrates why Dimensional Cutting Yield != Naive Area Division (5 ft x 100 ft roll)', () => {
      // Roll: 5 ft x 100 ft = 500 sqft
      // Job: 3x10 ft (+0.25 allowance) -> 3.25 x 10.25 ft (33.3125 sqft)
      const yieldCalc = calculateRollCuttingYield({
        rollWidthFt: 5.0,
        rollLengthFt: 100.0,
        sellingWidthFt: 3.0,
        sellingLengthFt: 10.0,
        widthAllowanceFt: 0.25,
        lengthAllowanceFt: 0.25,
      })

      // Naive area division gives 500 / 33.3125 = 15.009 -> 15 jobs (FALSE!)
      assert.strictEqual(yieldCalc.naiveAreaDivisionYield, 15)

      // Actual geometric cutting yield:
      // Across width: floor(5.0 / 3.25) = 1 lane (with 1.75 ft side strip)
      // Along length: floor(100.0 / 10.25) = 9 cuts
      // Max yield = 1 * 9 = 9 jobs
      assert.strictEqual(yieldCalc.lanesAcrossWidth, 1)
      assert.strictEqual(yieldCalc.cutsAlongLength, 9)
      assert.strictEqual(yieldCalc.maxFullJobsYield, 9)

      // Linear length consumed = 9 * 10.25 = 92.25 ft
      assert.strictEqual(yieldCalc.linearLengthConsumedFt, 92.25)
      // End-of-roll remaining length = 100 - 92.25 = 7.75 ft
      assert.strictEqual(yieldCalc.remainingRollLengthFt, 7.75)
      assert.strictEqual(yieldCalc.remainingRollRemnantAreaSqft, 38.75) // 7.75 * 5.0

      // Side strip remnant = 1.75 ft * 92.25 ft = 161.4375 sqft
      assert.strictEqual(yieldCalc.sideStripRemnantAreaSqft, 161.4375)
      // Total remnant area = 38.75 + 161.4375 = 200.1875 sqft
      assert.strictEqual(yieldCalc.totalRemnantAreaSqft, 200.1875)

      // Total physical jobs cut area = 9 * 33.3125 = 299.8125 sqft
      assert.strictEqual(yieldCalc.totalPhysicalAreaCutSqft, 299.8125)
      assert.strictEqual(yieldCalc.totalSellableCustomerAreaSqft, 270.0) // 9 * 30
      assert.strictEqual(yieldCalc.totalProductionAllowanceSqft, 29.8125)
      assert.strictEqual(yieldCalc.cuttingEfficiencyPercent, 59.96)
    })

    it('2.3 Automatically evaluates rotation optimization when enabled', () => {
      // Roll: 5 ft x 100 ft
      // Product: 2 ft wide x 4 ft long with +0.25ft allowances -> 2.25 x 4.25 ft
      // Standard (2.25 across): floor(5/2.25) = 2 lanes * floor(100/4.25 = 23) = 46 jobs
      // Rotated (4.25 across): floor(5/4.25) = 1 lane * floor(100/2.25 = 44) = 44 jobs
      const standard = calculateRollCuttingYield({
        rollWidthFt: 5.0,
        rollLengthFt: 100.0,
        sellingWidthFt: 2.0,
        sellingLengthFt: 4.0,
        widthAllowanceFt: 0.25,
        lengthAllowanceFt: 0.25,
        allowRotation: false,
      })
      assert.strictEqual(standard.maxFullJobsYield, 46)
      assert.strictEqual(standard.lanesAcrossWidth, 2)
      assert.strictEqual(standard.isRotated, false)

      const rotated = calculateRollCuttingYield({
        rollWidthFt: 5.0,
        rollLengthFt: 100.0,
        sellingWidthFt: 2.0,
        sellingLengthFt: 4.0,
        widthAllowanceFt: 0.25,
        lengthAllowanceFt: 0.25,
        allowRotation: true,
      })
      assert.strictEqual(rotated.maxFullJobsYield, 46) // selects best orientation
    })
  })

  // =========================================================================
  // 3. MULTIPLE JOBS SEQUENTIAL CUTTING ON A SINGLE ROLL
  // =========================================================================
  describe('3. Multi-Job Sequential Cutting on a Single Roll', () => {
    it('3.1 Cuts 10x(3x10ft) and 2x(3x20ft) jobs on one 3.25x164ft roll with 21 ft remaining remnant', () => {
      const multi = calculateMultiJobRollConsumption({
        rollWidthFt: 3.25,
        rollLengthFt: 164.0,
        jobs: [
          { name: 'Job A (10 pcs 3x10ft)', sellingWidthFt: 3.0, sellingLengthFt: 10.0, quantity: 10, widthAllowanceFt: 0.25, lengthAllowanceFt: 0.25 },
          { name: 'Job B (2 pcs 3x20ft)', sellingWidthFt: 3.0, sellingLengthFt: 20.0, quantity: 2, widthAllowanceFt: 0.25, lengthAllowanceFt: 0.25 },
        ],
      })

      // Length Consumption:
      // Job A: 10 * 10.25 = 102.5 ft
      // Job B: 2 * 20.25 = 40.5 ft
      // Total Length Consumed = 102.5 + 40.5 = 143.0 ft
      assert.strictEqual(multi.totalLinearLengthConsumedFt, 143.0)
      assert.strictEqual(multi.isRollSufficient, true)
      assert.strictEqual(multi.lengthDeficitFt, 0.0)

      // Remaining Remnant:
      // 164 - 143 = 21.0 ft
      // Area = 21.0 * 3.25 = 68.25 sqft
      assert.strictEqual(multi.remainingRollLengthFt, 21.0)
      assert.strictEqual(multi.remainingRollRemnantAreaSqft, 68.25)

      // Customer Billable Area:
      // Job A: 10 * 30 = 300 sqft
      // Job B: 2 * 60 = 120 sqft
      // Total Customer Billable = 420.0 sqft
      assert.strictEqual(multi.totalCustomerBillableAreaSqft, 420.0)

      // Physical Production Area:
      // Job A: 10 * 33.3125 = 333.125 sqft
      // Job B: 2 * 65.8125 = 131.625 sqft
      // Total Physical Area = 464.75 sqft
      assert.strictEqual(multi.totalPhysicalAreaCutSqft, 464.75)

      // Production Allowance Media = 464.75 - 420.0 = 44.75 sqft
      assert.strictEqual(multi.totalProductionAllowanceSqft, 44.75)
    })
  })

  // =========================================================================
  // 4. COST COMPONENT BASIS SEPARATION
  // =========================================================================
  describe('4. Cost Component Basis Separation', () => {
    it('4.1 Ensures Material uses physical cut, while installation and labor use billable/service basis', () => {
      // 3x10 ft Banner with +0.25ft allowances (Billable: 30 sqft, Physical: 33.3125 sqft)
      // Direct costs: Material @ ৳15.9475/sqft, Ink @ ৳3.5/sqft, Labor @ ৳4.0/sqft, Installation @ ৳5.0/sqft
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 3.0,
        height: 10.0,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
        catalogSellingPrice: 45.0,
        effectiveMaterialCost: 15.9475,
        costBreakdown: {
          ink_cost: 3.5,
          labor_cost: 4.0,
          installation_cost: 5.0,
        },
      })

      assert.strictEqual(pricing.outputQuantity, 30.0)
      assert.strictEqual(pricing.billableQuantity, 30.0)
      assert.strictEqual(pricing.finalAmount, 1350.0) // 30 * 45 = ৳1,350.00

      // Material cost is strictly based on physical cut (33.3125 * 15.9475 = ৳531.25)
      assert.strictEqual(pricing.estimatedMaterialCost, 531.25)

      // Extra direct costs (Ink 3.5 + Labor 4.0 + Installation 5.0 = 12.5 / sqft * 30 sqft = ৳375.00)
      // Total direct cost = 531.25 + 375.00 = ৳906.25
      assert.strictEqual(pricing.totalEstimatedCost, 906.25)
      assert.strictEqual(pricing.grossProfitAmount, 443.75) // 1350 - 906.25 = ৳443.75
      assert.strictEqual(pricing.grossMarginPercent, 32.87)
    })
  })

  // =========================================================================
  // 5. SIGNAGE, FINISHING & FABRICATION REAL PRINT-SHOP CASES
  // =========================================================================
  describe('5. Real Signage & Finishing Use Cases', () => {
    it('5.1 Flex Banner with Hemming and Eyelets BOM Rollup', () => {
      // 3x10 ft Flex Banner (+0.25ft allowance)
      // Components: 8 eyelets @ ৳2/pc, 26 rft Hemming @ ৳1.5/rft
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 3.0,
        height: 10.0,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
        catalogSellingPrice: 35.0,
        effectiveMaterialCost: 15.9475,
        components: [
          { component_name: 'Metal Eyelets', quantity: 8, unit: 'pcs', unit_cost: 2.0, production_role: 'finishing' },
          { component_name: 'Border Hemming Tape', quantity: 26, unit: 'rft', unit_cost: 1.5, production_role: 'finishing' },
        ],
      })

      assert.strictEqual(pricing.outputQuantity, 30.0)
      assert.strictEqual(pricing.finalAmount, 1050.0) // 30 * 35 = ৳1,050.00
      assert.strictEqual(pricing.estimatedMaterialCost, 531.25)
      // Component recipe: (8 * 2 = 16) + (26 * 1.5 = 39) = ৳55.00
      assert.strictEqual(pricing.componentsTotalCostPerUnit, 55.0)
    })

    it('5.2 Frame-Mounted ACP Board with Structural Allowance', () => {
      // ACP Board: 4x8 ft (32 sqft) finished size with 0.5 in (0.0417 ft) frame-mounting edge allowance
      const dim = calculateProductionDimensions({
        sellingWidth: 4.0,
        sellingHeight: 8.0,
        widthAllowance: 0.0417,
        heightAllowance: 0.0417,
        quantity: 1,
      })

      assert.strictEqual(dim.singleSellingAreaSqft, 32.0)
      assert.strictEqual(dim.productionWidth, 4.0417)
      assert.strictEqual(dim.productionHeight, 8.0417)
      assert.strictEqual(dim.physicalConsumptionSqft, 32.5021)
    })
  })

  // =========================================================================
  // 6. ZERO, NULL & BOUNDARY RESILIENCE
  // =========================================================================
  describe('6. Zero, Null, Negative & Boundary Resilience', () => {
    it('6.1 Handles negative and missing allowances safely by clamping to 0', () => {
      const dim = calculateProductionDimensions({
        sellingWidth: 3.0,
        sellingHeight: 10.0,
        widthAllowance: -0.5,
        heightAllowance: -0.5,
      })

      assert.strictEqual(dim.widthAllowance, 0.0)
      assert.strictEqual(dim.heightAllowance, 0.0)
      assert.strictEqual(dim.productionWidth, 3.0)
      assert.strictEqual(dim.productionHeight, 10.0)
      assert.strictEqual(dim.physicalConsumptionSqft, 30.0)
    })

    it('6.2 Handles zero dimensions safely without NaN', () => {
      const dim = calculateProductionDimensions({
        sellingWidth: 0,
        sellingHeight: 10,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
      })

      assert.strictEqual(dim.singleSellingAreaSqft, 0)
      assert.strictEqual(dim.physicalConsumptionSqft, 2.5625) // 0.25 * 10.25
    })
  })
})
