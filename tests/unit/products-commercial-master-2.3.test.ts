import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import {
  calculateCommercialPricing,
  calculateEffectiveUnitCost,
  calculateGrossMargin,
  calculateSuggestedSellingPrice,
  applyMinimumCharge,
  normalizePricingMethod,
  convertDimensionsToSqft,
  convertDimensionToRft,
  validateConversionRatio,
  validateCircularBOM,
  calculateRollAreaSqft,
  calculateSheetAreaSqft,
  PRICING_METHODS,
  PRICE_TIER_KEYS,
  COST_COMPONENTS,
  COMMERCIAL_PRODUCT_TYPES,
  MEASUREMENT_TYPES,
} from '../../lib/units.ts'
import { ProductService } from '../../services/product.service.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type {
  ProductRecord,
  ProductComponent,
  ProductCostBreakdown,
  ProductPriceTiers,
  ProductSupplierPriceRecord,
  PriceOverrideRecord,
} from '../../types/product.types.ts'

describe('Unit: Commercial Master 2.3 — Real-World Commercial Sanity Audit', () => {
  const companyId = 'tenant-real-world-commercial-2-3'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_HISTORY, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_VARIANTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_FORMULAS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_SUPPLIER_PRICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_OVERRIDES, [])
  })

  // =========================================================================
  // 1. REAL BUSINESS PRODUCT AUDIT ACROSS 9 REAL CATEGORIES
  // =========================================================================
  describe('1. Real Business Product Economics (9 Industry Categories)', () => {
    // CATEGORY 1: READY PRODUCTS
    it('1.1 Ready Product: X-Stand Standard (60x160cm) sold per piece', () => {
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        catalogSellingPrice: 950,
        quantity: 5,
        materialUnitCost: 550,
        targetMarginPercent: 40,
      })
      assert.strictEqual(pricing.outputQuantity, 5)
      assert.strictEqual(pricing.finalAmount, 4750)
      assert.strictEqual(pricing.totalEstimatedCost, 2750) // 550 * 5
      assert.strictEqual(pricing.grossProfitAmount, 2000) // 4750 - 2750
      assert.strictEqual(pricing.grossMarginPercent, 42.11) // ((950-550)/950)*100
    })

    // CATEGORY 2: PRINTING SERVICES
    it('1.2 Printing: Star Flex Banner 280 GSM (10ft x 164ft Roll @ ৳8,500, 5% waste, selling @ ৳28/sqft)', () => {
      const rollCalc = calculateEffectiveUnitCost({ purchasePrice: 8500, conversionRatio: 1640, defaultWastagePercent: 5.0 })
      assert.strictEqual(rollCalc.effectiveCostPerSellingUnit, 5.4557)

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 20,
        height: 10,
        quantity: 2, // 20ft x 10ft x 2 pcs = 400 sqft
        catalogSellingPrice: 28,
        effectiveMaterialCost: rollCalc.effectiveCostPerSellingUnit,
        defaultWastagePercent: 5.0,
      })

      assert.strictEqual(pricing.outputQuantity, 400)
      assert.strictEqual(pricing.finalAmount, 11200) // 400 * 28
      assert.strictEqual(pricing.estimatedMaterialCost, 2182.28) // 400 * 5.4557
      assert.strictEqual(pricing.expectedConsumptionUnits, 420) // 400 * 1.05 for physical inventory
      assert.strictEqual(pricing.grossProfitAmount, 9017.72) // 11200 - 2182.28
      assert.strictEqual(pricing.grossMarginPercent, 80.52)
    })

    it('1.3 Printing: Vinyl Sticker Glossy (4ft x 164ft Roll @ ৳6,200, 8% waste, selling @ ৳45/sqft)', () => {
      const rollArea = calculateRollAreaSqft(4, 164) // 656 sqft
      const rollCalc = calculateEffectiveUnitCost({ purchasePrice: 6200, conversionRatio: rollArea, defaultWastagePercent: 8.0 })
      assert.strictEqual(rollCalc.effectiveCostPerSellingUnit, 10.2731)

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 3,
        height: 2,
        quantity: 5, // 3ft x 2ft x 5 pcs = 30 sqft
        catalogSellingPrice: 45,
        effectiveMaterialCost: rollCalc.effectiveCostPerSellingUnit,
      })

      assert.strictEqual(pricing.outputQuantity, 30)
      assert.strictEqual(pricing.finalAmount, 1350)
      assert.strictEqual(pricing.estimatedMaterialCost, 308.19) // 30 * 10.2731
    })

    // CATEGORY 3: FINISHING SERVICES
    it('1.4 Finishing: Eyelet Punching (৳2/pc with ৳50 Minimum Charge)', () => {
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        catalogSellingPrice: 2,
        quantity: 12, // 12 * 2 = 24 < 50 min charge
        minimumCharge: 50,
      })
      assert.strictEqual(pricing.outputQuantity, 12)
      assert.strictEqual(pricing.calculatedAmount, 24)
      assert.strictEqual(pricing.isMinimumChargeApplied, true)
      assert.strictEqual(pricing.finalAmount, 50)
    })

    it('1.5 Finishing: Thermal Lamination (100 sqft @ ৳8/sqft with ৳3/sqft film material cost)', () => {
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        quantity: 100,
        catalogSellingPrice: 8,
        effectiveMaterialCost: 3,
      })
      assert.strictEqual(pricing.finalAmount, 800)
      assert.strictEqual(pricing.estimatedMaterialCost, 300)
      assert.strictEqual(pricing.grossProfitAmount, 500)
      assert.strictEqual(pricing.grossMarginPercent, 62.5)
    })

    // CATEGORY 4: FABRICATION SERVICES
    it('1.6 Fabrication: MS 1-inch Square Pipe Frame (30 rft @ ৳120/rft with ৳65/rft material + ৳25/rft labor)', () => {
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_length',
        quantity: 30,
        catalogSellingPrice: 120,
        effectiveMaterialCost: 65,
        costBreakdown: { labor_cost: 25 },
      })
      assert.strictEqual(pricing.finalAmount, 3600)
      assert.strictEqual(pricing.costBasisType, 'direct_cost')
      assert.strictEqual(pricing.totalDirectCostPerUnit, 90) // 65 + 25
      assert.strictEqual(pricing.totalEstimatedCost, 2700) // 90 * 30
      assert.strictEqual(pricing.grossProfitAmount, 900) // 3600 - 2700
      assert.strictEqual(pricing.grossMarginPercent, 25)
    })

    // CATEGORY 5: INSTALLATION SERVICES
    it('1.7 Installation: Billboard Mounting (500 sqft @ ৳12/sqft with ৳1,000 Minimum Charge)', () => {
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        quantity: 500,
        catalogSellingPrice: 12,
        minimumCharge: 1000,
        costBreakdown: { labor_cost: 7 },
      })
      assert.strictEqual(pricing.finalAmount, 6000)
      assert.strictEqual(pricing.isMinimumChargeApplied, false)
      assert.strictEqual(pricing.totalEstimatedCost, 3500) // 7 * 500
    })

    // CATEGORY 6: DESIGN SERVICES
    it('1.8 Design: Banner Artwork Design (৳500 flat charge, 0 material cost)', () => {
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_job',
        quantity: 1,
        catalogSellingPrice: 500,
        effectiveMaterialCost: 0,
      })
      assert.strictEqual(pricing.finalAmount, 500)
      assert.strictEqual(pricing.costBasisType, 'none')
      assert.strictEqual(pricing.grossMarginPercent, 100)
    })

    // CATEGORY 7: PACKAGING PRODUCTS
    it('1.9 Packaging: Paper Shopping Bags (500 pcs @ ৳30/pc selling with ৳18/pc cost)', () => {
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        quantity: 500,
        catalogSellingPrice: 30,
        materialUnitCost: 18,
      })
      assert.strictEqual(pricing.finalAmount, 15000)
      assert.strictEqual(pricing.totalEstimatedCost, 9000)
      assert.strictEqual(pricing.grossProfitAmount, 6000)
      assert.strictEqual(pricing.grossMarginPercent, 40)
    })

    // CATEGORY 8: DELIVERY LOGISTICS
    it('1.10 Delivery: Inside Dhaka Covered Van Dispatch (৳800 flat tariff)', () => {
      const pricing = calculateCommercialPricing({
        pricingMethod: 'fixed',
        catalogSellingPrice: 800,
        quantity: 1,
      })
      assert.strictEqual(pricing.finalAmount, 800)
    })
  })

  // =========================================================================
  // 2. AREA & DIMENSIONAL CALCULATIONS AUDIT
  // =========================================================================
  describe('2. Area & Dimensional Precision (Zero Multiplication Errors)', () => {
    it('2.1 Flex Banner: 10 ft x 5 ft x 2 pcs = 100 sqft', () => {
      const area = convertDimensionsToSqft(10, 5, 'ft') * 2
      assert.strictEqual(area, 100)
    })

    it('2.2 Vinyl Sticker: 3 ft x 2 ft x 5 pcs = 30 sqft', () => {
      const area = convertDimensionsToSqft(3, 2, 'ft') * 5
      assert.strictEqual(area, 30)
    })

    it('2.3 Acrylic Sheet: 4 ft x 8 ft x 2 sheets = 64 sqft', () => {
      const area = convertDimensionsToSqft(4, 8, 'ft') * 2
      assert.strictEqual(area, 64)
    })

    it('2.4 Metric Conversion: 2m x 1m = 21.5278 sqft', () => {
      const area = convertDimensionsToSqft(2, 1, 'm')
      assert.strictEqual(area, 21.5278)
    })
  })

  // =========================================================================
  // 3. SEPARATION OF FINANCIAL COSTING VS PHYSICAL INVENTORY CONSUMPTION
  // =========================================================================
  describe('3. Financial Costing vs Physical Inventory Consumption', () => {
    it('3.1 Validates exact separation between cost recovery and roll length deduction', () => {
      // Purchase: 1 Roll 10ft x 164ft = 1,640 sqft @ ৳8,500 with 5% waste
      const costCalc = calculateEffectiveUnitCost({ purchasePrice: 8500, conversionRatio: 1640, defaultWastagePercent: 5.0 })
      assert.strictEqual(costCalc.effectiveCostPerSellingUnit, 5.4557)

      // Job: 400 sqft
      const pricing = calculateCommercialPricing({
        quantity: 400,
        catalogSellingPrice: 28,
        effectiveMaterialCost: costCalc.effectiveCostPerSellingUnit,
        defaultWastagePercent: 5.0,
      })

      // 1. Financial Cost: 400 * 5.4557 = ৳2,182.28 (Method A - exact cost recovery)
      assert.strictEqual(pricing.estimatedMaterialCost, 2182.28)
      // 2. Physical Consumption: 400 * 1.05 = 420 sqft (Physical roll yardage to deduct in V3)
      assert.strictEqual(pricing.expectedConsumptionUnits, 420)
      // 3. Assert no double counting: cost is NOT 420 * 5.4557 (৳2,291.39)
      assert.notStrictEqual(pricing.estimatedMaterialCost, 2291.39)
    })
  })

  // =========================================================================
  // 4. SUGGESTED SELLING PRICE VS CATALOG PRICE INDEPENDENCE
  // =========================================================================
  describe('4. Suggested Selling Price vs Catalog Selling Price Independence', () => {
    it('4.1 Suggested price is purely advisory and does not overwrite catalog rate', () => {
      const effectiveCost = 5.4557
      const targetMargin = 35.0
      const suggested = calculateSuggestedSellingPrice(effectiveCost, targetMargin)

      // 5.4557 / 0.65 = ৳8.39 / sqft
      assert.strictEqual(suggested, 8.39)

      // Catalog selling rate is set at market competitive price ৳28/sqft
      const catalogRate = 28.0
      const margin = calculateGrossMargin(effectiveCost, catalogRate)

      assert.strictEqual(margin.grossMarginPercent, 80.52)
      assert.notStrictEqual(suggested, catalogRate)
    })
  })

  // =========================================================================
  // 5. SEPARATION OF THE 3 MINIMUMS WITH BUSINESS EXPLANATIONS
  // =========================================================================
  describe('5. 3-Way Minimum Controls (MOQ vs Min Billable Qty vs Min Charge)', () => {
    const config = {
      catalogSellingPrice: 28,
      minOrderQuantity: 10,
      minBillableQuantity: 20,
      minimumCharge: 500,
    }

    it('5.1 Case 5 sqft: violates MOQ (deficit 5), billed as 20 sqft = ৳560', () => {
      const r = calculateCommercialPricing({ ...config, quantity: 5 })
      assert.strictEqual(r.outputQuantity, 5)
      assert.strictEqual(r.isMoqViolated, true)
      assert.strictEqual(r.moqDeficit, 5)
      assert.strictEqual(r.billableQuantity, 20)
      assert.strictEqual(r.isMinBillableApplied, true)
      assert.strictEqual(r.finalAmount, 560)
    })

    it('5.2 Case 12 sqft: meets MOQ, billed as 20 sqft = ৳560', () => {
      const r = calculateCommercialPricing({ ...config, quantity: 12 })
      assert.strictEqual(r.outputQuantity, 12)
      assert.strictEqual(r.isMoqViolated, false)
      assert.strictEqual(r.billableQuantity, 20)
      assert.strictEqual(r.isMinBillableApplied, true)
      assert.strictEqual(r.finalAmount, 560)
    })

    it('5.3 Case 20 sqft: exactly at minimum billable = ৳560', () => {
      const r = calculateCommercialPricing({ ...config, quantity: 20 })
      assert.strictEqual(r.outputQuantity, 20)
      assert.strictEqual(r.isMinBillableApplied, false)
      assert.strictEqual(r.billableQuantity, 20)
      assert.strictEqual(r.finalAmount, 560)
    })

    it('5.4 Case 30 sqft: standard billing = ৳840', () => {
      const r = calculateCommercialPricing({ ...config, quantity: 30 })
      assert.strictEqual(r.outputQuantity, 30)
      assert.strictEqual(r.billableQuantity, 30)
      assert.strictEqual(r.finalAmount, 840)
    })
  })

  // =========================================================================
  // 6. REAL QUOTATION END-TO-END TEST: ABC ADVERTISING
  // =========================================================================
  describe('6. Real Quotation Test: ABC Advertising (Star Flex Banner)', () => {
    it('6.1 End-to-end commercial validation for 400 sqft banner quotation', async () => {
      // 1. Create Product Master
      const product = await ProductService.createProduct({
        company_id: companyId,
        name: 'Star Flex Banner 280 GSM',
        sku: 'FLX-STR-280',
        category: 'flex_banner',
        product_type: 'print_service',
        purchase_unit: 'roll',
        selling_unit: 'sft',
        purchase_price: 8500,
        conversion_ratio: 1640,
        default_wastage_percentage: 5.0,
        selling_price: 28,
        min_billable_quantity: 20,
        minimum_charge: 500,
      })

      assert.strictEqual(product.effective_unit_cost, 5.4557)

      // 2. Calculate Job Line (20ft x 10ft x 2 pcs = 400 sqft)
      const lineMath = calculateCommercialPricing({
        pricingMethod: product.pricing_method,
        width: 20,
        height: 10,
        quantity: 2,
        catalogSellingPrice: product.selling_price,
        effectiveMaterialCost: product.effective_unit_cost,
        defaultWastagePercent: product.default_wastage_percentage,
        minBillableQuantity: product.min_billable_quantity,
        minimumCharge: product.minimum_charge,
      })

      // Customer view attributes
      assert.strictEqual(lineMath.outputQuantity, 400)
      assert.strictEqual(lineMath.billableQuantity, 400)
      assert.strictEqual(lineMath.appliedSellingPrice, 28)
      assert.strictEqual(lineMath.finalAmount, 11200)

      // Internal business economics (Authorized Staff view only)
      assert.strictEqual(lineMath.expectedConsumptionUnits, 420)
      assert.strictEqual(lineMath.estimatedMaterialCost, 2182.28)
      assert.strictEqual(lineMath.grossProfitAmount, 9017.72)
      assert.strictEqual(lineMath.grossMarginPercent, 80.52)
      assert.strictEqual(lineMath.costBasisType, 'material')
    })
  })
})
