import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import {
  calculateCommercialPricing,
  calculateEffectiveUnitCost,
  calculateGrossMargin,
  calculateSuggestedSellingPrice,
  normalizePricingMethod,
  convertDimensionsToSqft,
  convertDimensionToRft,
  validateConversionRatio,
  calculateRollAreaSqft,
  calculateSheetAreaSqft,
  PRICING_METHODS,
  PRICE_TIER_KEYS,
  COST_COMPONENTS,
} from '../../lib/units.ts'
import { ProductService } from '../../services/product.service.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { ProductRecord, ProductComponent, ProductCostBreakdown, ProductPriceTiers } from '../../types/product.types.ts'

describe('Unit: Products & Services Commercial Master 2.1 — Final Business-Owner Upgrade', () => {
  const companyId = 'tenant-commercial-v2-1-test'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_HISTORY, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_VARIANTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_FORMULAS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_SUPPLIER_PRICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_OVERRIDES, [])
  })

  // =========================================================================
  // 1. All 10 Supported Pricing Methods
  // =========================================================================
  describe('1. Centralized Pricing Methods (10 Methods Evaluated Centrally)', () => {
    it('1.1 Per Area pricing method (Flex Banner @ ৳28/sqft)', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 10,
        height: 4,
        quantity: 2,
        dimensionUnit: 'ft',
        catalogSellingPrice: 28,
        effectiveMaterialCost: 5.4557,
      })

      // 10ft x 4ft = 40 sqft * 2 pcs = 80 sqft
      assert.strictEqual(result.outputQuantity, 80)
      assert.strictEqual(result.billableQuantity, 80)
      assert.strictEqual(result.appliedSellingPrice, 28)
      assert.strictEqual(result.finalAmount, 2240) // 80 * 28 = 2240
      assert.strictEqual(result.costBasisType, 'material')
      assert.strictEqual(result.grossMarginPercent, Math.round(((28 - 5.4557) / 28) * 10000) / 100)
    })

    it('1.2 Per Piece pricing method (Eyelet @ ৳5/pc)', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        quantity: 50,
        catalogSellingPrice: 5,
        effectiveMaterialCost: 1.2,
      })

      assert.strictEqual(result.outputQuantity, 50)
      assert.strictEqual(result.billableQuantity, 50)
      assert.strictEqual(result.finalAmount, 250) // 50 * 5 = 250
    })

    it('1.3 Per Length pricing method (MS Frame @ ৳120/rft)', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_length',
        width: 20, // 20 running feet
        quantity: 3,
        dimensionUnit: 'ft',
        catalogSellingPrice: 120,
        effectiveMaterialCost: 65,
      })

      // 20 rft * 3 = 60 rft
      assert.strictEqual(result.outputQuantity, 60)
      assert.strictEqual(result.finalAmount, 7200) // 60 * 120 = 7200
    })

    it('1.4 Per Job pricing method (Design @ ৳500/job)', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_job',
        quantity: 1,
        catalogSellingPrice: 500,
        effectiveMaterialCost: 50,
      })

      assert.strictEqual(result.outputQuantity, 1)
      assert.strictEqual(result.finalAmount, 500)
    })

    it('1.5 Per Hour pricing method (Machine Service @ ৳1,500/hour)', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_hour',
        quantity: 3.5, // 3.5 hours
        catalogSellingPrice: 1500,
        effectiveMaterialCost: 400,
      })

      assert.strictEqual(result.outputQuantity, 3.5)
      assert.strictEqual(result.finalAmount, 5250) // 3.5 * 1500
    })

    it('1.6 Fixed pricing method', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'fixed',
        quantity: 1,
        catalogSellingPrice: 1200,
        effectiveMaterialCost: 600,
      })

      assert.strictEqual(result.finalAmount, 1200)
    })

    it('1.7 Per Weight pricing method (Metal Scrap / Ink Bulk @ ৳450/kg)', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_weight',
        quantity: 12.5, // 12.5 kg
        catalogSellingPrice: 450,
        effectiveMaterialCost: 320,
      })

      assert.strictEqual(result.outputQuantity, 12.5)
      assert.strictEqual(result.finalAmount, 5625) // 12.5 * 450
    })

    it('1.8 Per Volume pricing method (Ink Bottle Refill @ ৳2.5/ml)', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_volume',
        quantity: 500, // 500 ml
        catalogSellingPrice: 2.5,
        effectiveMaterialCost: 1.1,
      })

      assert.strictEqual(result.outputQuantity, 500)
      assert.strictEqual(result.finalAmount, 1250) // 500 * 2.5
    })
  })

  // =========================================================================
  // 2. Separation of 3 Commercial Minimums (MOQ vs Min Billable vs Min Charge)
  // =========================================================================
  describe('2. Separation of 3 Commercial Minimums', () => {
    it('2.1 Min Billable Qty adjustment when physical qty is lower (Sticker: 12 sqft order billed as 20 sqft @ ৳28)', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 4,
        height: 3, // 12 sqft output
        quantity: 1,
        catalogSellingPrice: 28,
        minBillableQuantity: 20, // Min billable = 20 sqft
        minimumCharge: 500,
        effectiveMaterialCost: 10,
      })

      assert.strictEqual(result.outputQuantity, 12)
      assert.strictEqual(result.billableQuantity, 20)
      assert.strictEqual(result.isMinBillableApplied, true)
      assert.strictEqual(result.calculatedSubtotal, 560) // 20 * 28 = 560
      assert.strictEqual(result.finalAmount, 560)
      assert.strictEqual(result.isMinimumChargeApplied, false)
    })

    it('2.2 Minimum Charge Floor applied when calculated amount is below monetary floor (৳20/sqft * 15 sqft = ৳300 < ৳500)', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 5,
        height: 3, // 15 sqft output
        quantity: 1,
        catalogSellingPrice: 20,
        minBillableQuantity: 0,
        minimumCharge: 500, // Min monetary charge ৳500
        effectiveMaterialCost: 8,
      })

      assert.strictEqual(result.outputQuantity, 15)
      assert.strictEqual(result.billableQuantity, 15)
      assert.strictEqual(result.calculatedSubtotal, 300) // 15 * 20 = 300
      assert.strictEqual(result.finalAmount, 500) // Floor applied: 500
      assert.strictEqual(result.isMinimumChargeApplied, true)
    })

    it('2.3 Physical MOQ validation error when order is below workshop minimum', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        quantity: 5, // order 5 pcs
        minOrderQuantity: 100, // MOQ is 100 pcs
        catalogSellingPrice: 10,
        effectiveMaterialCost: 4,
      })

      assert.strictEqual(result.isMoqViolated, true)
      assert.strictEqual(result.outputQuantity, 5)
    })
  })

  // =========================================================================
  // 3. Multi-Tier Price Architecture (Customer Override > Price Tier > Default)
  // =========================================================================
  describe('3. Multi-Tier Price Architecture & Resolution Hierarchy', () => {
    const priceTiers: ProductPriceTiers = {
      retail: 30,
      corporate: 28,
      dealer: 25,
      wholesale: 22,
      custom: 20,
    }

    it('3.1 Resolves Price Tier price when tier is specified', () => {
      const corporateResult = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 10,
        height: 10,
        quantity: 1, // 100 sqft
        catalogSellingPrice: 30, // Retail default
        priceTiers,
        selectedPriceTier: 'corporate',
        effectiveMaterialCost: 5.46,
      })
      assert.strictEqual(corporateResult.appliedSellingPrice, 28)
      assert.strictEqual(corporateResult.appliedPriceTier, 'corporate')
      assert.strictEqual(corporateResult.finalAmount, 2800)

      const wholesaleResult = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 10,
        height: 10,
        quantity: 1,
        catalogSellingPrice: 30,
        priceTiers,
        selectedPriceTier: 'wholesale',
        effectiveMaterialCost: 5.46,
      })
      assert.strictEqual(wholesaleResult.appliedSellingPrice, 22)
      assert.strictEqual(wholesaleResult.finalAmount, 2200)
    })

    it('3.2 Customer-specific override takes precedence over Price Tier', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 10,
        height: 10,
        quantity: 1,
        catalogSellingPrice: 30,
        priceTiers,
        selectedPriceTier: 'corporate', // Corporate = 28
        customerSpecificPrice: 26.5, // Customer negotiated = 26.50
        effectiveMaterialCost: 5.46,
      })

      assert.strictEqual(result.appliedSellingPrice, 26.5)
      assert.strictEqual(result.isCustomerSpecificApplied, true)
      assert.strictEqual(result.finalAmount, 2650)
    })

    it('3.3 Authorized manual price override takes absolute precedence', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 10,
        height: 10,
        quantity: 1,
        catalogSellingPrice: 30,
        priceTiers,
        selectedPriceTier: 'dealer',
        customerSpecificPrice: 25,
        manualPriceOverride: 23.5, // Manual override
        effectiveMaterialCost: 5.46,
      })

      assert.strictEqual(result.appliedSellingPrice, 23.5)
      assert.strictEqual(result.isManualOverrideApplied, true)
      assert.strictEqual(result.finalAmount, 2350)
    })
  })

  // =========================================================================
  // 4. Direct Cost Components & Explicit Margin Basis
  // =========================================================================
  describe('4. Direct Cost Components & Explicit Margin Basis', () => {
    it('4.1 Accurately aggregates material + ink + machine + labor + finishing + installation', () => {
      const costBreakdown: ProductCostBreakdown = {
        material_cost: 15,
        ink_cost: 4,
        machine_cost: 3,
        labor_cost: 2,
        finishing_cost: 1.5,
        installation_cost: 5,
      }

      const result = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 10,
        height: 10,
        quantity: 1, // 100 sqft
        catalogSellingPrice: 50,
        effectiveMaterialCost: 15,
        costBreakdown,
      })

      // Total direct cost per unit = 15 + 4 + 3 + 2 + 1.5 + 5 = 30.50
      assert.strictEqual(result.totalDirectCostPerUnit, 30.5)
      assert.strictEqual(result.costBasisType, 'direct_cost')
      assert.strictEqual(result.activeCostBasis, 30.5)

      // Margin % = (50 - 30.5) / 50 * 100 = 39%
      assert.strictEqual(result.grossMarginPercent, 39)
      assert.strictEqual(result.grossProfitPerUnit, 19.5)
    })

    it('4.2 Explicitly labels cost basis as material when no extra direct costs exist', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 10,
        height: 10,
        quantity: 1,
        catalogSellingPrice: 28,
        effectiveMaterialCost: 5.46,
      })

      assert.strictEqual(result.costBasisType, 'material')
      assert.strictEqual(result.activeCostBasis, 5.46)
    })
  })

  // =========================================================================
  // 5. Recipe / Bill of Materials (BOM) Bundle Architecture
  // =========================================================================
  describe('5. Recipe / Bill of Materials (BOM) Bundle Architecture', () => {
    it('5.1 Calculates composite deliverable for X-Stand Complete', () => {
      const components: ProductComponent[] = [
        { component_name: 'X-Stand Hardware', quantity: 1, unit: 'pc', unit_cost: 350, production_role: 'hardware' },
        { component_name: 'Printed Graphic (Flex/PP)', quantity: 12, unit: 'sqft', unit_cost: 6, waste_percent: 5, production_role: 'print' }, // 12 * 6 * 1.05 = 75.60
        { component_name: 'Eyelet & Lamination Finishing', quantity: 1, unit: 'job', unit_cost: 40, production_role: 'finishing' },
        { component_name: 'Assembly Labor', quantity: 1, unit: 'job', unit_cost: 30, production_role: 'labor' },
      ]

      const result = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        quantity: 2, // 2 complete X-Stands
        catalogSellingPrice: 750,
        components,
      })

      // Component cost per unit = 350 + (12 * 6 * 1.05 = 75.6) + 40 + 30 = 495.60
      assert.strictEqual(result.componentsTotalCostPerUnit, 495.6)
      assert.strictEqual(result.costBasisType, 'direct_cost')
      assert.strictEqual(result.totalDirectCostPerUnit, 495.6)

      // Total revenue = 2 * 750 = 1500
      assert.strictEqual(result.finalAmount, 1500)
      // Total cost = 2 * 495.6 = 991.20
      assert.strictEqual(result.totalEstimatedCost, 991.2)
      // Total gross profit = 1500 - 991.2 = 508.80
      assert.strictEqual(result.totalEstimatedProfit, 508.8)
    })
  })

  // =========================================================================
  // 6. Low-Margin Approval & Commercial Governance Protection
  // =========================================================================
  describe('6. Low-Margin Commercial Protection', () => {
    it('6.1 Flags below-minimum margin when price is aggressively discounted', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 10,
        height: 10,
        quantity: 1,
        catalogSellingPrice: 28,
        manualPriceOverride: 10, // Discounted to ৳10 (Cost is ৳9)
        effectiveMaterialCost: 9,
        minAllowedMarginPercent: 20, // Min allowed margin is 20%
      })

      // Margin % = (10 - 9) / 10 = 10% < 20%
      assert.strictEqual(result.isBelowMinMargin, true)
      assert.strictEqual(result.grossMarginPercent, 10)
    })

    it('6.2 Allows price override when resulting margin is equal or above threshold', () => {
      const result = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 10,
        height: 10,
        quantity: 1,
        catalogSellingPrice: 28,
        manualPriceOverride: 20,
        effectiveMaterialCost: 10, // Margin = (20 - 10) / 20 = 50%
        minAllowedMarginPercent: 20,
      })

      assert.strictEqual(result.isBelowMinMargin, false)
      assert.strictEqual(result.grossMarginPercent, 50)
    })
  })

  // =========================================================================
  // 7. Real Bangladesh Business Test (ABC Advertising — Star Flex Banner 280 GSM)
  // =========================================================================
  describe('7. Real Business Test: ABC Advertising (Star Flex Banner 280 GSM)', () => {
    it('7.1 Validates complete commercial lifecycle from roll purchase to job revenue and profit', () => {
      // 1 Roll = 10ft x 164ft = 1,640 sqft @ ৳8,500/roll, 5% wastage
      const rollArea = calculateRollAreaSqft(10, 164)
      assert.strictEqual(rollArea, 1640)

      const costRes = calculateEffectiveUnitCost({
        purchasePrice: 8500,
        conversionRatio: 1640,
        defaultWastagePercent: 5.0,
      })

      // Usable Yield = 1640 * 0.95 = 1558 sqft
      assert.strictEqual(costRes.expectedUsableUnits, 1558)
      // Effective Cost = 8500 / 1558 ≈ ৳5.4557/sqft
      assert.ok(Math.abs(costRes.effectiveCostPerSellingUnit - 5.4557) < 0.001)

      // Job: 20ft x 10ft, 2 pcs = 400 sqft output
      const jobPricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 20,
        height: 10,
        quantity: 2,
        dimensionUnit: 'ft',
        catalogSellingPrice: 28,
        effectiveMaterialCost: costRes.effectiveCostPerSellingUnit,
        defaultWastagePercent: 5.0,
      })

      // Output Qty = 400 sqft
      assert.strictEqual(jobPricing.outputQuantity, 400)
      // Expected Consumption = 400 * 1.05 = 420 sqft
      assert.strictEqual(jobPricing.expectedConsumptionUnits, 420)
      // Revenue = 400 * 28 = ৳11,200
      assert.strictEqual(jobPricing.finalAmount, 11200)
      // Total Material Cost = 400 * 5.455712... = ৳2,182.28
      assert.ok(Math.abs(jobPricing.totalEstimatedCost - 2182.28) < 0.5)
      // Total Gross Profit = 11,200 - 2,182.28 = ৳9,017.72
      assert.ok(Math.abs(jobPricing.totalEstimatedProfit - 9017.72) < 0.5)
      // Gross Margin % = (28 - 5.4557) / 28 * 100 = 80.52%
      assert.ok(Math.abs(jobPricing.grossMarginPercent - 80.52) < 0.1)
    })
  })

  // =========================================================================
  // 8. Repository & Service Layer Extensibility
  // =========================================================================
  describe('8. Repository & Service Layer Extensibility', () => {
    it('8.1 Creates a Commercial Master 2.1 product with multi-tier, cost breakdown, and components', async () => {
      const created = await ProductService.createProduct({
        company_id: companyId,
        name: 'LED ACP 3D Sign Complete',
        sku: 'SIGN-LED-ACP-01',
        commercial_type: 'finished_good' as any,
        pricing_method: 'per_area',
        selling_price: 650,
        purchase_price: 0,
        purchase_unit: 'sqft',
        selling_unit: 'sqft',
        min_billable_quantity: 10,
        minimum_charge: 5000,
        min_allowed_margin_percent: 25,
        allow_manual_override: true,
        price_tiers: {
          retail: 650,
          corporate: 580,
          dealer: 520,
          wholesale: 480,
          custom: 450,
        },
        cost_breakdown: {
          material_cost: 220,
          ink_cost: 30,
          machine_cost: 25,
          labor_cost: 40,
          finishing_cost: 15,
          fabrication_cost: 60,
          installation_cost: 50,
        },
        components: [
          { component_name: '3mm ACP Sheet', quantity: 1, unit: 'sqft', unit_cost: 110, production_role: 'material' },
          { component_name: 'Cast Acrylic Letters', quantity: 1, unit: 'sqft', unit_cost: 70, production_role: 'material' },
          { component_name: 'Samsung LED Module & Power Supply', quantity: 3, unit: 'pcs', unit_cost: 25, production_role: 'hardware' },
        ],
      })

      assert.ok(created.id)
      assert.strictEqual(created.pricing_method, 'per_area')
      assert.strictEqual(created.min_billable_quantity, 10)
      assert.strictEqual(created.minimum_charge, 5000)
      assert.strictEqual(created.price_tiers?.corporate, 580)
      assert.strictEqual(created.components?.length, 3)

      // Verify customer price tier resolution
      const resolved = await ProductService.resolveCustomerProductPrice(
        created.id,
        'cust-corporate-01',
        companyId,
        'corporate'
      )
      assert.strictEqual(resolved.effectiveRate, 580)
      assert.strictEqual(resolved.appliedTier, 'corporate')
    })

    it('8.2 Saves and retrieves multi-supplier purchase price quotes', async () => {
      const prod = await ProductService.createProduct({
        company_id: companyId,
        name: 'Star Flex Banner 280 GSM',
        sku: 'FLEX-280-GSM',
        purchase_price: 8500,
        selling_price: 28,
      })

      await ProductService.saveProductSupplierPrice(companyId, {
        product_id: prod.id,
        supplier_id: 'supp-01',
        supplier_name: 'Apex Media Importers',
        purchase_price: 8350,
        purchase_unit: 'roll',
        moq: 5,
        lead_time_days: 2,
        is_preferred: true,
      })

      await ProductService.saveProductSupplierPrice(companyId, {
        product_id: prod.id,
        supplier_id: 'supp-02',
        supplier_name: 'Dhaka Sign Materials',
        purchase_price: 8500,
        purchase_unit: 'roll',
        moq: 1,
        lead_time_days: 1,
        is_preferred: false,
      })

      const suppliers = await ProductService.getProductSupplierPrices(prod.id, companyId)
      assert.strictEqual(suppliers.length, 2)
      assert.strictEqual(suppliers[0].purchase_price, 8350)
      assert.strictEqual(suppliers[0].is_preferred, true)
    })

    it('8.3 Logs and audits price overrides with margin calculations', async () => {
      const prod = await ProductService.createProduct({
        company_id: companyId,
        name: 'Star Flex Banner 280 GSM',
        sku: 'FLEX-280-GSM',
        purchase_price: 8500,
        selling_price: 28,
        base_cost: 5.46,
      })

      const logged = await ProductService.logPriceOverride(companyId, {
        product_id: prod.id,
        product_name: prod.name,
        original_price: 28,
        overridden_price: 22,
        original_margin_percent: 80.5,
        overridden_margin_percent: 75.18,
        reason: 'Bulk promotional discount for ABC Advertising',
        authorized_by: 'Managing Director',
      })

      assert.ok(logged.id)
      assert.strictEqual(logged.overridden_price, 22)

      const history = await ProductService.getPriceOverrides(companyId, prod.id)
      assert.strictEqual(history.length, 1)
      assert.strictEqual(history[0].authorized_by, 'Managing Director')
    })
  })
})
