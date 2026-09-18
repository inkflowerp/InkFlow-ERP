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
} from '../../types/product.types.ts'

describe('Unit: Commercial Master 2.2 — Final Business-Owner Audit & Hardening', () => {
  const companyId = 'tenant-commercial-v2-2-audit'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_HISTORY, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_VARIANTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_FORMULAS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_SUPPLIER_PRICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_OVERRIDES, [])
  })

  // =========================================================================
  // 1. CRITICAL COSTING & WASTAGE DOUBLE-COUNTING AUDIT (Sections 2 & 3)
  // =========================================================================
  describe('1. Critical Costing & Wastage Double-Counting Audit', () => {
    it('1.1 Computes correct usable yield and effective unit cost for 10ft x 164ft Flex Roll', () => {
      // 1 Roll = 10ft x 164ft = 1,640 sqft gross @ ৳8,500 with 5% default wastage
      const rollArea = calculateRollAreaSqft(10, 164)
      assert.strictEqual(rollArea, 1640)

      const costCalc = calculateEffectiveUnitCost({
        purchasePrice: 8500,
        conversionRatio: 1640,
        defaultWastagePercent: 5.0,
      })

      // Expected Usable Yield = 1,640 * (1 - 0.05) = 1,558 sqft
      assert.strictEqual(costCalc.expectedUsableUnits, 1558)
      // Effective Unit Cost = 8,500 / 1,558 = ৳5.4557 / sqft
      assert.strictEqual(costCalc.effectiveCostPerSellingUnit, 5.4557)
      // Raw cost without wastage = 8,500 / 1,640 = ৳5.1829 / sqft
      assert.strictEqual(costCalc.rawCostWithoutWastage, 5.1829)
      // Wastage cost premium = 5.4557 - 5.1829 = ৳0.2728 / sqft
      assert.strictEqual(costCalc.wastageCostPerUnit, 0.2728)
    })

    it('1.2 Verifies that Job Material Cost uses Method A (Net Output x Effective Cost) and prevents double-counting', () => {
      // Job: 20ft x 10ft, 2 pcs = 400 sqft net output
      // Effective Unit Cost: ৳5.4557 / sqft (already embeds 5% wastage)
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 20,
        height: 10,
        quantity: 2,
        dimensionUnit: 'ft',
        catalogSellingPrice: 28,
        effectiveMaterialCost: 5.4557,
        defaultWastagePercent: 5.0,
      })

      // Net output produced and billed
      assert.strictEqual(pricing.outputQuantity, 400)
      assert.strictEqual(pricing.billableQuantity, 400)

      // Estimated Material Cost MUST be Net Qty (400) * Effective Cost (5.4557) = ৳2,182.28
      assert.strictEqual(pricing.estimatedMaterialCost, 2182.28)

      // Expected physical planning consumption for V3 Inventory = 400 * 1.05 = 420 sqft
      assert.strictEqual(pricing.expectedConsumptionUnits, 420)

      // Ensure cost does NOT multiply 420 * 5.4557 (which would equal ৳2,291.39 and double-count wastage)
      assert.notStrictEqual(pricing.estimatedMaterialCost, 2291.39)
      assert.strictEqual(pricing.costBasisAmount, 2182.28)
    })
  })

  // =========================================================================
  // 2. UNIT ECONOMICS AUDIT ACROSS 11 BANGLADESHI INDUSTRY CATEGORIES (Section 4)
  // =========================================================================
  describe('2. Unit Economics Audit Across 11 Standard Bangladesh Print/Signage Materials', () => {
    it('2.1 Flex Roll (Roll -> sqft): 10ft x 164ft roll @ ৳8,500', () => {
      const calc = calculateEffectiveUnitCost({ purchasePrice: 8500, conversionRatio: 1640, defaultWastagePercent: 5 })
      assert.strictEqual(calc.expectedUsableUnits, 1558)
      assert.strictEqual(calc.effectiveCostPerSellingUnit, 5.4557)
    })

    it('2.2 Vinyl Roll (Roll -> sqft): 4ft x 164ft roll @ ৳6,200 with 8% wastage', () => {
      const ratio = calculateRollAreaSqft(4, 164) // 656 sqft
      assert.strictEqual(ratio, 656)
      const calc = calculateEffectiveUnitCost({ purchasePrice: 6200, conversionRatio: ratio, defaultWastagePercent: 8 })
      // 656 * 0.92 = 603.52 sqft usable -> 6200 / 603.52 = ৳10.2731/sqft
      assert.strictEqual(calc.expectedUsableUnits, 603.52)
      assert.strictEqual(calc.effectiveCostPerSellingUnit, 10.2731)
    })

    it('2.3 Acrylic Sheet (Sheet -> sqft): 8ft x 4ft sheet @ ৳3,800 with 10% wastage', () => {
      const sheetArea = calculateSheetAreaSqft(8, 4) // 32 sqft
      assert.strictEqual(sheetArea, 32)
      const calc = calculateEffectiveUnitCost({ purchasePrice: 3800, conversionRatio: sheetArea, defaultWastagePercent: 10 })
      // 32 * 0.9 = 28.8 sqft usable -> 3800 / 28.8 = ৳131.9444/sqft
      assert.strictEqual(calc.expectedUsableUnits, 28.8)
      assert.strictEqual(calc.effectiveCostPerSellingUnit, 131.9444)
    })

    it('2.4 PVC Foam Board (Sheet -> sqft): 8ft x 4ft sheet @ ৳1,400 with 5% wastage', () => {
      const calc = calculateEffectiveUnitCost({ purchasePrice: 1400, conversionRatio: 32, defaultWastagePercent: 5 })
      // 32 * 0.95 = 30.4 sqft -> 1400 / 30.4 = ৳46.0526/sqft
      assert.strictEqual(calc.expectedUsableUnits, 30.4)
      assert.strictEqual(calc.effectiveCostPerSellingUnit, 46.0526)
    })

    it('2.5 Eyelet (Box -> pcs): 1 Box of 1,000 pcs @ ৳350 with 2% defect rate', () => {
      const calc = calculateEffectiveUnitCost({ purchasePrice: 350, conversionRatio: 1000, defaultWastagePercent: 2 })
      // 1000 * 0.98 = 980 pcs -> 350 / 980 = ৳0.3571/pc
      assert.strictEqual(calc.expectedUsableUnits, 980)
      assert.strictEqual(calc.effectiveCostPerSellingUnit, 0.3571)
    })

    it('2.6 LED Module (Box -> pcs): 1 Box of 200 pcs @ ৳3,200 with 1% defect rate', () => {
      const calc = calculateEffectiveUnitCost({ purchasePrice: 3200, conversionRatio: 200, defaultWastagePercent: 1 })
      // 200 * 0.99 = 198 pcs -> 3200 / 198 = ৳16.1616/pc
      assert.strictEqual(calc.expectedUsableUnits, 198)
      assert.strictEqual(calc.effectiveCostPerSellingUnit, 16.1616)
    })

    it('2.7 Solvent Ink (Bottle -> ml): 1 Bottle 1,000 ml @ ৳2,200 with 3% purging waste', () => {
      const calc = calculateEffectiveUnitCost({ purchasePrice: 2200, conversionRatio: 1000, defaultWastagePercent: 3 })
      // 1000 * 0.97 = 970 ml -> 2200 / 970 = ৳2.2680/ml
      assert.strictEqual(calc.expectedUsableUnits, 970)
      assert.strictEqual(calc.effectiveCostPerSellingUnit, 2.268)
    })

    it('2.8 MS Pipe (Bundle/Length -> rft): 20 ft Length @ ৳480 with 5% cutting offcut', () => {
      const calc = calculateEffectiveUnitCost({ purchasePrice: 480, conversionRatio: 20, defaultWastagePercent: 5 })
      // 20 * 0.95 = 19 rft -> 480 / 19 = ৳25.2632/rft
      assert.strictEqual(calc.expectedUsableUnits, 19)
      assert.strictEqual(calc.effectiveCostPerSellingUnit, 25.2632)
    })

    it('2.9 Business Cards (Box -> pcs): 1 Box of 100 cards @ ৳180 cost, selling @ ৳350/box', () => {
      const margin = calculateGrossMargin(180, 350)
      assert.strictEqual(margin.grossProfit, 170)
      assert.strictEqual(margin.grossMarginPercent, 48.57)
      assert.strictEqual(margin.markupPercent, 94.44)
    })

    it('2.10 Design Creative (Job -> job): ৳500 flat charge with 0 material cost', () => {
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_job',
        quantity: 1,
        catalogSellingPrice: 500,
        effectiveMaterialCost: 0,
      })
      assert.strictEqual(pricing.billableQuantity, 1)
      assert.strictEqual(pricing.finalAmount, 500)
      assert.strictEqual(pricing.costBasisType, 'none')
      assert.strictEqual(pricing.grossMarginPercent, 100)
    })

    it('2.11 Installation Service (Area / sqft): ৳12/sqft labor cost, selling @ ৳25/sqft', () => {
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        quantity: 100,
        catalogSellingPrice: 25,
        costBreakdown: { labor_cost: 12 },
      })
      assert.strictEqual(pricing.billableQuantity, 100)
      assert.strictEqual(pricing.finalAmount, 2500)
      assert.strictEqual(pricing.costBasisType, 'direct_cost')
      assert.strictEqual(pricing.totalDirectCostPerUnit, 12)
      assert.strictEqual(pricing.grossMarginPercent, 52) // (25-12)/25 = 52%
    })
  })

  // =========================================================================
  // 3. MINIMUMS AUDIT: MOQ vs MIN BILLABLE QTY vs MIN CHARGE (Section 5)
  // =========================================================================
  describe('3. Minimums Precision Audit (MOQ, Minimum Billable Quantity, Minimum Charge)', () => {
    // Selling: ৳28/sqft | MOQ: 10 sqft | Minimum Billable: 20 sqft | Minimum Charge: ৳500
    const config = {
      pricingMethod: 'per_area',
      catalogSellingPrice: 28,
      minOrderQuantity: 10,
      minBillableQuantity: 20,
      minimumCharge: 500,
      effectiveMaterialCost: 5.4557,
    }

    it('3.1 Scenario: 5 sqft order (Violates MOQ, Under Min Billable)', () => {
      const result = calculateCommercialPricing({ ...config, quantity: 5 })
      // Physically produced
      assert.strictEqual(result.outputQuantity, 5)
      // MOQ Violated by 5 sqft
      assert.strictEqual(result.isMoqViolated, true)
      assert.strictEqual(result.moqDeficit, 5)
      // Billed at Minimum Billable Floor (20 sqft)
      assert.strictEqual(result.billableQuantity, 20)
      assert.strictEqual(result.isMinBillableApplied, true)
      // 20 * 28 = ৳560 > Minimum Charge ৳500
      assert.strictEqual(result.calculatedAmount, 560)
      assert.strictEqual(result.isMinimumChargeApplied, false)
      assert.strictEqual(result.finalAmount, 560)
    })

    it('3.2 Scenario: 12 sqft order (Meets MOQ, Under Min Billable)', () => {
      const result = calculateCommercialPricing({ ...config, quantity: 12 })
      assert.strictEqual(result.outputQuantity, 12)
      assert.strictEqual(result.isMoqViolated, false)
      assert.strictEqual(result.billableQuantity, 20)
      assert.strictEqual(result.isMinBillableApplied, true)
      assert.strictEqual(result.finalAmount, 560)
    })

    it('3.3 Scenario: 20 sqft order (Exactly Min Billable)', () => {
      const result = calculateCommercialPricing({ ...config, quantity: 20 })
      assert.strictEqual(result.outputQuantity, 20)
      assert.strictEqual(result.isMoqViolated, false)
      assert.strictEqual(result.billableQuantity, 20)
      assert.strictEqual(result.isMinBillableApplied, false)
      assert.strictEqual(result.finalAmount, 560)
    })

    it('3.4 Scenario: 30 sqft order (Above all minimums)', () => {
      const result = calculateCommercialPricing({ ...config, quantity: 30 })
      assert.strictEqual(result.outputQuantity, 30)
      assert.strictEqual(result.isMoqViolated, false)
      assert.strictEqual(result.billableQuantity, 30)
      assert.strictEqual(result.isMinBillableApplied, false)
      // 30 * 28 = ৳840
      assert.strictEqual(result.finalAmount, 840)
    })

    it('3.5 Scenario: Monetary Minimum Charge applies when subtotal < Minimum Charge', () => {
      // 1 sqft @ ৳28/sqft with Min Billable = 1 sqft and Minimum Charge = ৳500
      const result = calculateCommercialPricing({
        pricingMethod: 'per_area',
        catalogSellingPrice: 28,
        quantity: 1,
        minBillableQuantity: 1,
        minimumCharge: 500,
      })
      assert.strictEqual(result.billableQuantity, 1)
      assert.strictEqual(result.calculatedAmount, 28)
      assert.strictEqual(result.isMinimumChargeApplied, true)
      assert.strictEqual(result.finalAmount, 500)
    })

    it('3.6 Scenario: Zero Min Billable Quantity preserves fractional sub-unit billing (0.5 hour)', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_hour',
        catalogSellingPrice: 600,
        quantity: 0.5,
        minBillableQuantity: 0,
        minimumCharge: 0,
      })
      assert.strictEqual(result.billableQuantity, 0.5)
      assert.strictEqual(result.isMinBillableApplied, false)
      assert.strictEqual(result.finalAmount, 300)
    })
  })

  // =========================================================================
  // 4. ALL 10 PRICING METHODS AUDIT (Section 6)
  // =========================================================================
  describe('4. Authoritative Evaluation of All 10 Pricing Methods', () => {
    const allMethods = [
      'fixed',
      'per_piece',
      'per_area',
      'per_length',
      'per_weight',
      'per_volume',
      'per_job',
      'per_hour',
      'tiered',
      'formula',
    ] as const

    it('4.1 Confirms all 10 pricing methods are standardized', () => {
      assert.strictEqual(PRICING_METHODS.length, 10)
      for (const m of allMethods) {
        assert.strictEqual(normalizePricingMethod(m), m)
      }
    })

    it('4.2 Tests Fixed Pricing Method', () => {
      const r = calculateCommercialPricing({ pricingMethod: 'fixed', catalogSellingPrice: 1500, quantity: 5 })
      assert.strictEqual(r.finalAmount, 1500)
    })

    it('4.3 Tests Per Length with Dimension Conversion (120 inches = 10 rft @ ৳120/rft)', () => {
      const r = calculateCommercialPricing({
        pricingMethod: 'per_length',
        width: 120,
        dimensionUnit: 'inch',
        quantity: 2,
        catalogSellingPrice: 120,
      })
      // 120 in = 10 ft * 2 pcs = 20 rft @ ৳120 = ৳2,400
      assert.strictEqual(r.outputQuantity, 20)
      assert.strictEqual(r.finalAmount, 2400)
    })

    it('4.4 Tests Per Weight Method (50 kg Scrap @ ৳450/kg)', () => {
      const r = calculateCommercialPricing({ pricingMethod: 'per_weight', quantity: 50, catalogSellingPrice: 450 })
      assert.strictEqual(r.finalAmount, 22500)
    })

    it('4.5 Tests Per Volume Method (500 ml Ink @ ৳2.5/ml)', () => {
      const r = calculateCommercialPricing({ pricingMethod: 'per_volume', quantity: 500, catalogSellingPrice: 2.5 })
      assert.strictEqual(r.finalAmount, 1250)
    })
  })

  // =========================================================================
  // 5. PRICE TIER & RESOLUTION PRECEDENCE AUDIT (Section 7)
  // =========================================================================
  describe('5. Multi-Tier Resolution Precedence & Security Audit', () => {
    const tiers: ProductPriceTiers = {
      retail: 30,
      corporate: 26,
      dealer: 24,
      wholesale: 22,
      custom: 20,
    }

    it('5.1 Default Catalog Price resolves when no tier is specified', () => {
      const r = calculateCommercialPricing({ catalogSellingPrice: 30, priceTiers: tiers, quantity: 10 })
      assert.strictEqual(r.appliedSellingPrice, 30)
    })

    it('5.2 Price Tier overrides default catalog price', () => {
      const r = calculateCommercialPricing({
        catalogSellingPrice: 30,
        priceTiers: tiers,
        selectedPriceTier: 'dealer',
        quantity: 10,
      })
      assert.strictEqual(r.appliedSellingPrice, 24)
      assert.strictEqual(r.appliedPriceTier, 'dealer')
    })

    it('5.3 Customer-Specific Price overrides Price Tier', () => {
      const r = calculateCommercialPricing({
        catalogSellingPrice: 30,
        priceTiers: tiers,
        selectedPriceTier: 'dealer',
        customerSpecificPrice: 23,
        quantity: 10,
      })
      assert.strictEqual(r.appliedSellingPrice, 23)
      assert.strictEqual(r.isCustomerSpecificApplied, true)
    })

    it('5.4 Manual Price Override takes highest precedence', () => {
      const r = calculateCommercialPricing({
        catalogSellingPrice: 30,
        priceTiers: tiers,
        selectedPriceTier: 'dealer',
        customerSpecificPrice: 23,
        manualPriceOverride: 21,
        quantity: 10,
      })
      assert.strictEqual(r.appliedSellingPrice, 21)
      assert.strictEqual(r.isManualOverrideApplied, true)
    })
  })

  // =========================================================================
  // 6. SUPPLIER-SPECIFIC PURCHASE PRICES AUDIT (Section 8)
  // =========================================================================
  describe('6. Supplier-Specific Purchase Economics Audit', () => {
    it('6.1 Stores and queries multiple supplier quotes without corrupting default purchase price', async () => {
      const product = await ProductService.createProduct({
        company_id: companyId,
        name: 'Flex 280gsm Standard',
        sku: 'FLX-280-STD',
        purchase_price: 8500,
        conversion_ratio: 1640,
        default_wastage_percentage: 5,
        selling_price: 28,
      })

      // Add 3 different supplier quotes
      await ProductRepository.upsertSupplierPrice({
        company_id: companyId,
        product_id: product.id,
        supplier_id: 'sup-a',
        supplier_name: 'National Inks & Media',
        purchase_price: 8500,
        purchase_unit: 'roll',
        conversion_ratio: 1640,
        is_preferred: true,
      })

      await ProductRepository.upsertSupplierPrice({
        company_id: companyId,
        product_id: product.id,
        supplier_id: 'sup-b',
        supplier_name: 'Dhaka Trade Importers',
        purchase_price: 8350,
        purchase_unit: 'roll',
        conversion_ratio: 1640,
        is_preferred: false,
      })

      await ProductRepository.upsertSupplierPrice({
        company_id: companyId,
        product_id: product.id,
        supplier_id: 'sup-c',
        supplier_name: 'Chittagong Poly Impex',
        purchase_price: 8700,
        purchase_unit: 'roll',
        conversion_ratio: 1640,
        is_preferred: false,
      })

      const quotes = await ProductRepository.getSupplierPrices(product.id, companyId)
      assert.strictEqual(quotes.length, 3)

      const preferred = quotes.find((q) => q.is_preferred)
      assert.strictEqual(preferred?.supplier_id, 'sup-a')
      assert.strictEqual(preferred?.purchase_price, 8500)

      // Ensure product default remained pristine
      const loaded = await ProductService.getProductById(product.id, companyId)
      assert.strictEqual(loaded?.purchase_price, 8500)
    })
  })

  // =========================================================================
  // 7. BOM / RECIPE AUDIT & CIRCULAR BOM PROTECTION (Section 9)
  // =========================================================================
  describe('7. BOM / Recipe Costing & Circular Reference Protection', () => {
    it('7.1 Tests multi-component X-Stand BOM rollup', () => {
      const components: ProductComponent[] = [
        { name: 'X-Stand Metal Hardware 60x160cm', quantity: 1, unit_cost: 320, cost_contribution: 320, waste_percent: 0 },
        { name: 'Printed Graphic 2x5ft @ ৳25/sqft', quantity: 10, unit_cost: 25, cost_contribution: 250, waste_percent: 5 }, // 250 * 1.05 = 262.5
        { name: 'Eyelets (4 corners)', quantity: 4, unit_cost: 2, cost_contribution: 8, waste_percent: 0 },
        { name: 'Assembly & Bag Packing', quantity: 1, unit_cost: 40, cost_contribution: 40, waste_percent: 0 },
      ]

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        catalogSellingPrice: 950,
        quantity: 2,
        components,
      })

      // Total component cost per unit = 320 + (250 * 1.05 = 262.5) + 8 + 40 = 630.5
      assert.strictEqual(pricing.componentsTotalCostPerUnit, 630.5)
      assert.strictEqual(pricing.costBasisType, 'direct_cost')
      assert.strictEqual(pricing.totalEstimatedCost, 1261) // 630.5 * 2
      assert.strictEqual(pricing.finalAmount, 1900) // 950 * 2
      assert.strictEqual(pricing.totalEstimatedProfit, 639) // 1900 - 1261
    })

    it('7.2 Tests complex LED ACP Sign multi-component BOM rollup', () => {
      const components: ProductComponent[] = [
        { name: 'ACP Sheet 4x8ft (Substrate)', quantity: 32, unit_cost: 85, cost_contribution: 2720, waste_percent: 5 },
        { name: 'Laser Cut Acrylic Lettering', quantity: 1, unit_cost: 3500, cost_contribution: 3500, waste_percent: 0 },
        { name: 'Samsung LED Modules', quantity: 150, unit_cost: 18, cost_contribution: 2700, waste_percent: 2 },
        { name: 'MeanWell 12V 30A Power Supply', quantity: 2, unit_cost: 1200, cost_contribution: 2400, waste_percent: 0 },
        { name: 'MS 1.5 inch Frame & Fabrication', quantity: 1, unit_cost: 4500, cost_contribution: 4500, waste_percent: 0 },
      ]

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        catalogSellingPrice: 24000,
        quantity: 1,
        components,
        costBreakdown: { installation_cost: 3000 },
      })

      // Sub-costs:
      // ACP = 2720 * 1.05 = 2856
      // Acrylic = 3500
      // LED = 2700 * 1.02 = 2754
      // PSU = 2400
      // Frame = 4500
      // Total components = 16010 + Installation 3000 = 19010
      assert.strictEqual(pricing.componentsTotalCostPerUnit, 16010)
      assert.strictEqual(pricing.totalDirectCostPerUnit, 19010)
      assert.strictEqual(pricing.finalAmount, 24000)
      assert.strictEqual(pricing.grossProfitAmount, 4990)
    })

    it('7.3 Detects and rejects direct self-referencing circular BOM (A -> A)', () => {
      const validation = validateCircularBOM('prod-sign-1', [
        { component_product_id: 'prod-sign-1', name: 'Self Component' },
      ])
      assert.strictEqual(validation.hasCycle, true)
      assert.match(validation.error || '', /Circular BOM reference detected/)
    })

    it('7.4 Detects and rejects indirect transitive circular BOM cycles (A -> B -> A)', () => {
      const lookupMap = {
        'prod-b': [{ component_product_id: 'prod-a' }],
      }
      const validation = validateCircularBOM('prod-a', [{ component_product_id: 'prod-b' }], lookupMap)
      assert.strictEqual(validation.hasCycle, true)
      assert.match(validation.error || '', /Indirect circular BOM cycle detected/)
    })
  })

  // =========================================================================
  // 8. COST BASIS & MARGIN METRICS AUDIT (Sections 10 & 11)
  // =========================================================================
  describe('8. Cost Basis Transparency & Margin Mathematical Robustness', () => {
    it('8.1 Distinguishes "material" vs "direct_cost" cost basis in calculations', () => {
      // Material-only product
      const matOnly = calculateCommercialPricing({
        catalogSellingPrice: 28,
        quantity: 10,
        effectiveMaterialCost: 5.4557,
      })
      assert.strictEqual(matOnly.costBasisType, 'material')
      assert.strictEqual(matOnly.activeCostBasis, 5.4557)

      // Multi-direct cost product
      const multiCost = calculateCommercialPricing({
        catalogSellingPrice: 50,
        quantity: 10,
        effectiveMaterialCost: 5.4557,
        costBreakdown: { ink_cost: 3.5, labor_cost: 6.0 },
      })
      assert.strictEqual(multiCost.costBasisType, 'direct_cost')
      assert.strictEqual(multiCost.totalDirectCostPerUnit, 14.96) // 5.4557 + 3.5 + 6.0 = 14.9557 ≈ 14.96
    })

    it('8.2 Evaluates standard Gross Margin (Cost=100, Selling=150 -> 33.33% Margin, 50% Markup)', () => {
      const m = calculateGrossMargin(100, 150)
      assert.strictEqual(m.grossProfit, 50)
      assert.strictEqual(m.grossMarginPercent, 33.33)
      assert.strictEqual(m.markupPercent, 50)
    })

    it('8.3 Evaluates Margin Edge Cases cleanly without NaN or Infinity', () => {
      // Cost = 0
      const cZero = calculateGrossMargin(0, 100)
      assert.strictEqual(cZero.grossMarginPercent, 100)
      assert.strictEqual(cZero.markupPercent, 0)

      // Selling = 0
      const sZero = calculateGrossMargin(100, 0)
      assert.strictEqual(sZero.grossMarginPercent, 0)
      assert.strictEqual(sZero.markupPercent, -100)

      // Selling = Cost
      const sEqualC = calculateGrossMargin(100, 100)
      assert.strictEqual(sEqualC.grossMarginPercent, 0)
      assert.strictEqual(sEqualC.markupPercent, 0)

      // Selling < Cost (Negative Margin)
      const loss = calculateGrossMargin(120, 100)
      assert.strictEqual(loss.grossProfit, -20)
      assert.strictEqual(loss.grossMarginPercent, -20)
      assert.strictEqual(loss.markupPercent, -16.67)
    })
  })

  // =========================================================================
  // 9. LOW-MARGIN GOVERNANCE & OVERRIDE AUDIT (Section 12)
  // =========================================================================
  describe('9. Low-Margin Governance & Authorization Audit', () => {
    it('9.1 Triggers low-margin safety warning when price drops below min allowed margin', () => {
      // Cost = ৳15/sqft | Normal Selling = ৳28/sqft | Min Allowed Margin = 25% | Override Selling = ৳18/sqft (Margin = 16.67%)
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        catalogSellingPrice: 28,
        manualPriceOverride: 18,
        effectiveMaterialCost: 15,
        minAllowedMarginPercent: 25.0,
        quantity: 10,
      })

      assert.strictEqual(pricing.appliedSellingPrice, 18)
      assert.strictEqual(pricing.grossMarginPercent, 16.67)
      assert.strictEqual(pricing.isBelowMinimumMargin, true)
      assert.strictEqual(pricing.marginDeficitPercent, 8.33)
    })

    it('9.2 Records authorized price override in persistent audit trail', async () => {
      const product = await ProductService.createProduct({
        company_id: companyId,
        name: 'Vinyl Sticker Glossy',
        sku: 'VNL-GLS-001',
        purchase_price: 6200,
        conversion_ratio: 656,
        selling_price: 45,
        min_allowed_margin_percent: 25,
      })

      const overrideRecord = await ProductRepository.recordPriceOverride({
        company_id: companyId,
        product_id: product.id,
        document_type: 'quotation',
        document_id: 'quot-1002',
        standard_price: 45,
        overridden_price: 32,
        authorized_by_id: 'mgr-007',
        authorized_by_name: 'Shamim Hossain (General Manager)',
        reason: 'Key corporate account bulk annual contract price',
        overridden_margin_percent: 18.5,
      })

      assert.strictEqual(overrideRecord.overridden_price, 32)
      assert.strictEqual(overrideRecord.authorized_by_name, 'Shamim Hossain (General Manager)')

      const history = await ProductRepository.getPriceOverrides(companyId, product.id)
      assert.strictEqual(history.length, 1)
      assert.strictEqual(history[0].reason, 'Key corporate account bulk annual contract price')
    })
  })

  // =========================================================================
  // 10. HISTORICAL SNAPSHOT IMMUTABILITY AUDIT (Section 13)
  // =========================================================================
  describe('10. Historical Commercial Snapshot Immutability Audit', () => {
    it('10.1 Changing product master price does not alter historical document commercial snapshots', async () => {
      const product = await ProductService.createProduct({
        company_id: companyId,
        name: 'Backlit Banner 510gsm',
        sku: 'BKL-510',
        purchase_price: 12000,
        conversion_ratio: 1640,
        selling_price: 45,
      })

      // Create initial quotation commercial snapshot at ৳45/sqft
      const quoteCommercialSnapshot = calculateCommercialPricing({
        catalogSellingPrice: product.selling_price,
        quantity: 100,
        effectiveMaterialCost: product.effective_unit_cost,
        pricingMethod: 'per_area',
      })
      assert.strictEqual(quoteCommercialSnapshot.finalAmount, 4500)

      // Update Product Master catalog price to ৳55/sqft
      await ProductService.updateProduct(product.id, { selling_price: 55 }, companyId)

      // Re-verify that old quotation snapshot remains intact at ৳45 / ৳4,500
      assert.strictEqual(quoteCommercialSnapshot.appliedSellingPrice, 45)
      assert.strictEqual(quoteCommercialSnapshot.finalAmount, 4500)

      // New quotation calculates with new rate ৳55
      const updatedProduct = await ProductService.getProductById(product.id, companyId)
      const newQuoteCommercialSnapshot = calculateCommercialPricing({
        catalogSellingPrice: updatedProduct?.selling_price,
        quantity: 100,
        effectiveMaterialCost: updatedProduct?.effective_unit_cost,
        pricingMethod: 'per_area',
      })
      assert.strictEqual(newQuoteCommercialSnapshot.appliedSellingPrice, 55)
      assert.strictEqual(newQuoteCommercialSnapshot.finalAmount, 5500)
    })
  })

  // =========================================================================
  // 11. MULTI-TENANT ISOLATION AUDIT (Section 18)
  // =========================================================================
  describe('11. Multi-Tenant Isolation & Data Isolation Audit', () => {
    it('11.1 Tenant A products, supplier prices, and overrides are strictly isolated from Tenant B', async () => {
      const tenantA = 'tenant-dhaka-print'
      const tenantB = 'tenant-chittagong-media'

      const prodA = await ProductService.createProduct({
        company_id: tenantA,
        name: 'Flex 280gsm Dhaka',
        sku: 'DHK-FLX-01',
        selling_price: 28,
        purchase_price: 8500,
      })

      const prodB = await ProductService.createProduct({
        company_id: tenantB,
        name: 'Flex 280gsm Ctg',
        sku: 'CTG-FLX-01',
        selling_price: 32,
        purchase_price: 9000,
      })

      // Query Tenant A catalog
      const listA = await ProductService.getProducts(tenantA)
      assert.strictEqual(listA.length, 1)
      assert.strictEqual(listA[0].sku, 'DHK-FLX-01')

      // Query Tenant B catalog
      const listB = await ProductService.getProducts(tenantB)
      assert.strictEqual(listB.length, 1)
      assert.strictEqual(listB[0].sku, 'CTG-FLX-01')

      // Attempt cross-tenant access -> must return null or error
      const crossFetch = await ProductService.getProductById(prodA.id, tenantB)
      assert.strictEqual(crossFetch, null)
    })
  })
})
