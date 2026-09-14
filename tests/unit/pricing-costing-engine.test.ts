import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  calculateJobPricing,
  convertToFeet,
  calculateAreaSft,
  calculatePerimeterFt,
} from '../../lib/pricing-engine.ts'
import { calculateNegotiationMargin } from '../../services/costing.service.ts'
import type { PricingFormulaConfig, PricingCalculationInput } from '../../types/product.types.ts'

describe('V4 Unit: Pricing & Costing Engine Calculations', () => {
  it('converts measurement units to feet accurately', () => {
    assert.strictEqual(convertToFeet(12, 'inch'), 1)
    assert.strictEqual(convertToFeet(24, 'inch'), 2)
    assert.strictEqual(convertToFeet(10, 'ft'), 10)
    assert.ok(Math.abs(convertToFeet(1, 'm') - 3.28084) < 0.001)
  })

  it('calculates area and perimeter in square feet and running feet', () => {
    const area = calculateAreaSft(10, 4, 'ft')
    assert.strictEqual(area, 40)

    const perimeter = calculatePerimeterFt(10, 4, 'ft')
    assert.strictEqual(perimeter, 28)

    // Inch dimensions: 24" x 36" = 2ft x 3ft = 6 sft
    const inchArea = calculateAreaSft(24, 36, 'inch')
    assert.strictEqual(inchArea, 6)
  })

  it('calculates pricing with planned waste factor and multi-component cost breakdown', () => {
    const formula: PricingFormulaConfig = {
      model: 'dimensional_area',
      waste_factor_percent: 10.0, // 10% planned waste
      material_rate: 20, // ৳20/sqft
      machine_rate: 10, // ৳10/sqft
      print_rate: 0,
      labor_rate: 5, // ৳5/sqft
      default_margin_percent: 40.0, // 40% margin
      min_margin_percent: 20.0,
    }

    const input: PricingCalculationInput = {
      width: 10,
      height: 10, // 100 sqft
      dimensionUnit: 'ft',
      quantity: 1,
    }

    const result = calculateJobPricing(formula, input)

    assert.strictEqual(result.areaSft, 100)
    assert.strictEqual(result.plannedWasteSft, 10) // 100 * 10% = 10 sqft
    // Material cost = 110 sqft * 20 = ৳2200
    assert.strictEqual(result.componentBreakdown.material, 2200)
    // Machine cost = 100 sqft * 10 = ৳1000
    assert.strictEqual(result.componentBreakdown.machine, 1000)
    // Labor cost = 100 sqft * 5 = ৳500
    assert.strictEqual(result.componentBreakdown.labor, 500)

    // Total base cost = 2200 + 1000 + 500 = 3700
    assert.strictEqual(result.totalBaseCost, 3700)

    // Selling price at 40% margin: 3700 / 0.6 = 6167
    assert.strictEqual(result.suggestedSellingPrice, 6167)
    assert.ok(result.grossProfitAmount >= 2467)
    assert.strictEqual(result.isBelowMinimum, false)
  })

  it('detects and flags pricing below minimum safety margin', () => {
    const formula: PricingFormulaConfig = {
      model: 'dimensional_area',
      material_rate: 20,
      default_margin_percent: 30.0,
      min_margin_percent: 20.0, // 20% minimum safety floor
    }

    const input: PricingCalculationInput = {
      width: 10,
      height: 4,
      dimensionUnit: 'ft',
      quantity: 1,
      discountPercent: 35, // Aggressive 35% discount pushing margin below 20%
    }

    const result = calculateJobPricing(formula, input, 1500)
    assert.strictEqual(result.isBelowMinimum, true)
  })

  it('evaluates negotiation margin simulator correctly', () => {
    // Selling price ৳10,000, Cost ৳6,000, Discount 10%
    const res = calculateNegotiationMargin(10000, 6000, 10)
    assert.strictEqual(res.discountAmount, 1000)
    assert.strictEqual(res.finalPrice, 9000)
    assert.strictEqual(res.finalProfit, 3000)
    assert.strictEqual(res.finalMargin, 33.3)
    assert.strictEqual(res.isSafeMargin, true)

    // Deep discount: 45% discount -> price 5500 (below cost 6000)
    const unsafeRes = calculateNegotiationMargin(10000, 6000, 45)
    assert.strictEqual(unsafeRes.finalPrice, 5500)
    assert.strictEqual(unsafeRes.finalProfit, -500)
    assert.strictEqual(unsafeRes.isSafeMargin, false)
  })

  it('generates an immutable costing snapshot payload with full rates preservation', () => {
    const formula: PricingFormulaConfig = {
      model: 'dimensional_area',
      material_rate: 25,
      machine_rate: 15,
      labor_rate: 8,
      default_margin_percent: 35.0,
      min_margin_percent: 15.0,
    }

    const input: PricingCalculationInput = {
      width: 8,
      height: 5,
      dimensionUnit: 'ft',
      quantity: 2,
      includeLamination: true,
      includeFinishing: true,
    }

    const result = calculateJobPricing(formula, input)
    assert.ok(result.costingSnapshot)
    assert.strictEqual(result.costingSnapshot.rates.material_rate, 25)
    assert.strictEqual(result.costingSnapshot.rates.machine_rate, 15)
    assert.strictEqual(result.costingSnapshot.dimensions.width, 8)
    assert.strictEqual(result.costingSnapshot.dimensions.height, 5)
    assert.strictEqual(result.costingSnapshot.quantity, 2)
  })
})
