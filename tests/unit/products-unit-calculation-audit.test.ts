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
  convertLengthToFeet,
  calculateProductionDimensions,
  validateConversionRatio,
  validateUnitConversion,
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

describe('Unit: Products & Services Unit Calculation Logic Audit', () => {
  const companyId = 'tenant-unit-calculation-audit'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_HISTORY, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_VARIANTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_FORMULAS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_SUPPLIER_PRICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_OVERRIDES, [])
  })

  // =========================================================================
  // 1. UNIT SEPARATION & CONVERSION MODEL (Section 2 & 3)
  // =========================================================================
  describe('1. Unit Separation & Conversion Logic', () => {
    it('1.1 Separates Purchase Unit (Roll) from Selling Unit (sqft) with 1,640 ratio', () => {
      const rollArea = calculateRollAreaSqft(10, 164)
      assert.strictEqual(rollArea, 1640)

      const validation = validateUnitConversion({
        purchaseUnit: 'roll',
        sellingUnit: 'sft',
        conversionRatio: 1640,
        measurementType: 'area',
      })
      assert.strictEqual(validation.isValid, true)

      // Calculate cost per sqft: ৳8,500 / 1,640 = ৳5.1829/sqft
      const costCalc = calculateEffectiveUnitCost({
        purchasePrice: 8500,
        conversionRatio: 1640,
        defaultWastagePercent: 0,
      })
      assert.strictEqual(costCalc.rawCostWithoutWastage, 5.1829)
      assert.strictEqual(costCalc.expectedUsableUnits, 1640)
    })

    it('1.2 Piece conversion: 1 Box = 100 pcs @ ৳500 purchase price', () => {
      const costCalc = calculateEffectiveUnitCost({
        purchasePrice: 500,
        conversionRatio: 100,
        defaultWastagePercent: 0,
      })
      assert.strictEqual(costCalc.rawCostWithoutWastage, 5) // ৳5/pc

      // Order 10 pcs
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        catalogSellingPrice: 8,
        quantity: 10,
        conversionRatio: 100,
        effectiveMaterialCost: costCalc.effectiveCostPerSellingUnit,
      })
      assert.strictEqual(pricing.outputQuantity, 10)
      assert.strictEqual(pricing.purchaseEquivalentQuantity, 0.10) // 10 / 100 = 0.1 box
      assert.strictEqual(pricing.finalAmount, 80) // 10 * 8 = ৳80
      assert.strictEqual(pricing.estimatedMaterialCost, 50) // 10 * 5 = ৳50
      assert.strictEqual(pricing.grossProfitAmount, 30) // 80 - 50 = ৳30
    })

    it('1.3 Area dimensions: calculates feet, inches, meters, and centimeters without error', () => {
      // 10 ft x 5 ft
      assert.strictEqual(convertDimensionsToSqft(10, 5, 'ft'), 50)
      // 10 in x 5 in = 50 / 144 = 0.3472 sqft
      assert.strictEqual(convertDimensionsToSqft(10, 5, 'inch'), 0.3472)
      // 100 cm x 50 cm = 5000 / 929.0304 = 5.382 sqft
      assert.strictEqual(convertDimensionsToSqft(100, 50, 'cm'), 5.382)
      // 2 m x 1 m = 2 * 10.7639 = 21.5278 sqft
      assert.strictEqual(convertDimensionsToSqft(2, 1, 'm'), 21.5278)
    })

    it('1.4 Length: MS Pipe (1 Length = 20 rft @ ৳480)', () => {
      const lengthCalc = calculateEffectiveUnitCost({
        purchasePrice: 480,
        conversionRatio: 20,
        defaultWastagePercent: 5,
      })
      // 20 * 0.95 = 19 rft usable -> 480 / 19 = ৳25.2632/rft
      assert.strictEqual(lengthCalc.expectedUsableUnits, 19)
      assert.strictEqual(lengthCalc.effectiveCostPerSellingUnit, 25.2632)
    })

    it('1.5 Weight: Metal Scrap / Substrate (1 kg = 1,000 g @ ৳450/kg)', () => {
      const weightCalc = calculateEffectiveUnitCost({
        purchasePrice: 450,
        conversionRatio: 1000,
        defaultWastagePercent: 0,
      })
      assert.strictEqual(weightCalc.effectiveCostPerSellingUnit, 0.45) // ৳0.45/gram
    })

    it('1.6 Volume: Solvent Ink (1 Bottle = 1,000 ml @ ৳2,200 with 3% waste)', () => {
      const volumeCalc = calculateEffectiveUnitCost({
        purchasePrice: 2200,
        conversionRatio: 1000,
        defaultWastagePercent: 3,
      })
      assert.strictEqual(volumeCalc.expectedUsableUnits, 970)
      assert.strictEqual(volumeCalc.effectiveCostPerSellingUnit, 2.268) // ৳2.268/ml
    })
  })

  // =========================================================================
  // 2. ALL 10 PRICING METHODS EVALUATION (Section 4)
  // =========================================================================
  describe('2. All 10 Supported Pricing Methods', () => {
    it('2.1 Fixed Pricing', () => {
      const r = calculateCommercialPricing({ pricingMethod: 'fixed', catalogSellingPrice: 2000, quantity: 1 })
      assert.strictEqual(r.finalAmount, 2000)
    })

    it('2.2 Per Piece Pricing', () => {
      const r = calculateCommercialPricing({ pricingMethod: 'per_piece', catalogSellingPrice: 5, quantity: 100 })
      assert.strictEqual(r.finalAmount, 500)
    })

    it('2.3 Per Area Pricing (10ft x 5ft x 2 pcs @ ৳28/sqft)', () => {
      const r = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 10,
        height: 5,
        quantity: 2,
        catalogSellingPrice: 28,
      })
      assert.strictEqual(r.outputQuantity, 100) // 10 * 5 * 2 = 100 sqft
      assert.strictEqual(r.finalAmount, 2800) // 100 * 28 = ৳2,800
    })

    it('2.4 Per Length Pricing (30 rft @ ৳120/rft)', () => {
      const r = calculateCommercialPricing({ pricingMethod: 'per_length', quantity: 30, catalogSellingPrice: 120 })
      assert.strictEqual(r.finalAmount, 3600)
    })

    it('2.5 Per Weight Pricing (50 kg @ ৳450/kg)', () => {
      const r = calculateCommercialPricing({ pricingMethod: 'per_weight', quantity: 50, catalogSellingPrice: 450 })
      assert.strictEqual(r.finalAmount, 22500)
    })

    it('2.6 Per Volume Pricing (500 ml @ ৳2.5/ml)', () => {
      const r = calculateCommercialPricing({ pricingMethod: 'per_volume', quantity: 500, catalogSellingPrice: 2.5 })
      assert.strictEqual(r.finalAmount, 1250)
    })

    it('2.7 Per Job Pricing (Design @ ৳1,500 flat)', () => {
      const r = calculateCommercialPricing({ pricingMethod: 'per_job', quantity: 1, catalogSellingPrice: 1500 })
      assert.strictEqual(r.finalAmount, 1500)
    })

    it('2.8 Per Hour Pricing (Machine Rate @ ৳1,500/hr for 2.5 hrs)', () => {
      const r = calculateCommercialPricing({ pricingMethod: 'per_hour', quantity: 2.5, catalogSellingPrice: 1500 })
      assert.strictEqual(r.finalAmount, 3750)
    })

    it('2.9 Tiered Quantity Pricing (Resolves Dealer tier ৳24 vs Retail ৳28)', () => {
      const r = calculateCommercialPricing({
        catalogSellingPrice: 28,
        priceTiers: { retail: 28, dealer: 24 },
        selectedPriceTier: 'dealer',
        quantity: 50,
      })
      assert.strictEqual(r.appliedSellingPrice, 24)
      assert.strictEqual(r.finalAmount, 1200)
    })

    it('2.10 Formula Pricing Mode', () => {
      const r = calculateCommercialPricing({ pricingMethod: 'formula', catalogSellingPrice: 45, quantity: 20 })
      assert.strictEqual(r.finalAmount, 900)
    })
  })

  // =========================================================================
  // 3. MINIMUM BILLABLE QUANTITY VS ACTUAL PRODUCTION QUANTITY (Section 5)
  // =========================================================================
  describe('3. Minimum Billable Quantity vs Actual Production Quantity Separation', () => {
    it('3.1 Actual production quantity (6 pcs) remains distinct from billable quantity (10 pcs @ ৳20)', () => {
      const r = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        catalogSellingPrice: 20,
        quantity: 6,
        minBillableQuantity: 10,
        effectiveMaterialCost: 8,
      })

      // Physical output produced
      assert.strictEqual(r.outputQuantity, 6)
      assert.strictEqual(r.actualQuantity, 6)

      // Customer billing quantity
      assert.strictEqual(r.billableQuantity, 10)
      assert.strictEqual(r.isMinBillableApplied, true)
      assert.strictEqual(r.finalAmount, 200) // 10 * 20 = ৳200

      // Costing quantity is based on actual net production (6 pcs * ৳8 = ৳48)
      assert.strictEqual(r.costingQuantity, 6)
      assert.strictEqual(r.estimatedMaterialCost, 48)
    })
  })

  // =========================================================================
  // 4. MINIMUM CHARGE FLOOR (Section 6)
  // =========================================================================
  describe('4. Minimum Monetary Charge Floor', () => {
    it('4.1 Calculated ৳150 is elevated to ৳500 minimum charge without corrupting production quantity', () => {
      const r = calculateCommercialPricing({
        pricingMethod: 'per_area',
        catalogSellingPrice: 15,
        quantity: 10, // 10 * 15 = 150 < 500
        minimumCharge: 500,
        effectiveMaterialCost: 5,
      })

      assert.strictEqual(r.outputQuantity, 10)
      assert.strictEqual(r.billableQuantity, 10)
      assert.strictEqual(r.calculatedAmount, 150)
      assert.strictEqual(r.isMinimumChargeApplied, true)
      assert.strictEqual(r.finalAmount, 500)
      assert.strictEqual(r.estimatedMaterialCost, 50) // 10 * 5 = ৳50
    })
  })

  // =========================================================================
  // 5. WASTAGE & YIELD AUDIT (Section 8)
  // =========================================================================
  describe('5. Wastage and Yield Verification (Method A Single-Recovery Proof)', () => {
    it('5.1 Proves that Method A (Net Output x Effective Cost) prevents double-charging wastage', () => {
      // 1 Roll = 10ft x 164ft = 1,640 sqft @ ৳8,500 with 5% waste
      const costCalc = calculateEffectiveUnitCost({
        purchasePrice: 8500,
        conversionRatio: 1640,
        defaultWastagePercent: 5.0,
      })
      assert.strictEqual(costCalc.expectedUsableUnits, 1558)
      assert.strictEqual(costCalc.effectiveCostPerSellingUnit, 5.4557)

      // Job Output: 400 sqft
      const pricing = calculateCommercialPricing({
        quantity: 400,
        catalogSellingPrice: 28,
        conversionRatio: 1640,
        effectiveMaterialCost: costCalc.effectiveCostPerSellingUnit,
        defaultWastagePercent: 5.0,
      })

      // 1. Estimated Material Cost: 400 * 5.4557 = ৳2,182.28
      assert.strictEqual(pricing.estimatedMaterialCost, 2182.28)
      // 2. Expected Physical Consumption: 400 * 1.05 = 420 sqft (Physical roll cut)
      assert.strictEqual(pricing.expectedConsumptionUnits, 420)
      // 3. Purchase-Equivalent Quantity: 400 / 1640 = 0.2439 roll
      assert.strictEqual(pricing.purchaseEquivalentQuantity, 0.2439)
      // 4. Purchase-Equivalent Consumption: 420 / 1640 = 0.2561 roll
      assert.strictEqual(pricing.purchaseEquivalentConsumption, 0.2561)
    })
  })

  // =========================================================================
  // 6. MARGIN VS MARKUP FORMULAS (Section 10)
  // =========================================================================
  describe('6. Margin vs Markup Mathematical Verification', () => {
    it('6.1 Cost = ৳100, Selling = ৳200 -> Margin = 50%, Markup = 100%', () => {
      const m = calculateGrossMargin(100, 200)
      assert.strictEqual(m.grossProfit, 100)
      assert.strictEqual(m.grossMarginPercent, 50)
      assert.strictEqual(m.markupPercent, 100)
    })

    it('6.2 Cost = ৳100, Target Margin = 35% -> Suggested Price = ৳153.85', () => {
      const suggested = calculateSuggestedSellingPrice(100, 35)
      // 100 / (1 - 0.35) = 153.846... ≈ 153.85
      assert.strictEqual(suggested, 153.85)
    })
  })

  // =========================================================================
  // 7. REAL BANGLADESH PRINT TEST CASES (CASES A - G) (Section 12)
  // =========================================================================
  describe('7. Real Bangladesh Print Business Test Cases (A through G)', () => {
    // CASE A: FLEX
    it('7.1 CASE A — FLEX: 400 sqft Star Flex Banner 280 GSM', () => {
      const rollCalc = calculateEffectiveUnitCost({ purchasePrice: 8500, conversionRatio: 1640, defaultWastagePercent: 5.0 })
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 20,
        height: 10,
        quantity: 2, // 400 sqft
        catalogSellingPrice: 28,
        conversionRatio: 1640,
        effectiveMaterialCost: rollCalc.effectiveCostPerSellingUnit,
        defaultWastagePercent: 5.0,
      })

      assert.strictEqual(pricing.outputQuantity, 400)
      assert.strictEqual(pricing.finalAmount, 11200)
      assert.strictEqual(pricing.estimatedMaterialCost, 2182.28)
      assert.strictEqual(pricing.expectedConsumptionUnits, 420)
      assert.strictEqual(pricing.grossProfitAmount, 9017.72)
      assert.strictEqual(pricing.grossMarginPercent, 80.52)
    })

    // CASE B: BUSINESS CARD
    it('7.2 CASE B — BUSINESS CARD: 1 Box = 1,000 pcs @ ৳2,500, sell 250 pcs @ ৳4/pc', () => {
      const cardCalc = calculateEffectiveUnitCost({ purchasePrice: 2500, conversionRatio: 1000, defaultWastagePercent: 0 })
      assert.strictEqual(cardCalc.effectiveCostPerSellingUnit, 2.5) // ৳2.5/card

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        catalogSellingPrice: 4,
        quantity: 250,
        conversionRatio: 1000,
        effectiveMaterialCost: cardCalc.effectiveCostPerSellingUnit,
      })

      assert.strictEqual(pricing.outputQuantity, 250)
      assert.strictEqual(pricing.purchaseEquivalentQuantity, 0.25) // 0.25 box
      assert.strictEqual(pricing.finalAmount, 1000) // 250 * 4 = ৳1,000
      assert.strictEqual(pricing.estimatedMaterialCost, 625) // 250 * 2.5 = ৳625
      assert.strictEqual(pricing.grossProfitAmount, 375) // ৳375
      assert.strictEqual(pricing.grossMarginPercent, 37.5)
    })

    // CASE C: ACRYLIC SHEET
    it('7.3 CASE C — ACRYLIC: 1 Sheet 4x8ft (32 sqft) @ ৳8,000, sell 20 sqft @ ৳380/sqft', () => {
      const acrylicCalc = calculateEffectiveUnitCost({ purchasePrice: 8000, conversionRatio: 32, defaultWastagePercent: 0 })
      assert.strictEqual(acrylicCalc.effectiveCostPerSellingUnit, 250) // ৳250/sqft

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        quantity: 20,
        catalogSellingPrice: 380,
        conversionRatio: 32,
        effectiveMaterialCost: acrylicCalc.effectiveCostPerSellingUnit,
      })

      assert.strictEqual(pricing.finalAmount, 7600) // 20 * 380 = ৳7,600
      assert.strictEqual(pricing.estimatedMaterialCost, 5000) // 20 * 250 = ৳5,000
      assert.strictEqual(pricing.grossProfitAmount, 2600) // ৳2,600
      assert.strictEqual(pricing.grossMarginPercent, 34.21)
    })

    // CASE D: EYELET
    it('7.4 CASE D — EYELET: 1 Box = 1,000 pcs @ ৳1,500, order 120 pcs @ ৳3/pc', () => {
      const eyeletCalc = calculateEffectiveUnitCost({ purchasePrice: 1500, conversionRatio: 1000, defaultWastagePercent: 0 })
      assert.strictEqual(eyeletCalc.effectiveCostPerSellingUnit, 1.5) // ৳1.5/pc

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        catalogSellingPrice: 3,
        quantity: 120,
        conversionRatio: 1000,
        effectiveMaterialCost: eyeletCalc.effectiveCostPerSellingUnit,
      })

      assert.strictEqual(pricing.finalAmount, 360) // 120 * 3 = ৳360
      assert.strictEqual(pricing.estimatedMaterialCost, 180) // 120 * 1.5 = ৳180
      assert.strictEqual(pricing.grossProfitAmount, 180)
    })

    // CASE E: DESIGN
    it('7.5 CASE E — DESIGN: Banner Artwork @ ৳1,500 flat job price (0 material cost)', () => {
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_job',
        catalogSellingPrice: 1500,
        quantity: 1,
        effectiveMaterialCost: 0,
      })
      assert.strictEqual(pricing.finalAmount, 1500)
      assert.strictEqual(pricing.costBasisType, 'none')
      assert.strictEqual(pricing.grossMarginPercent, 100)
    })

    // CASE F: INSTALLATION
    it('7.6 CASE F — INSTALLATION: 10ft x 5ft (50 sqft) @ ৳15/sqft', () => {
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 10,
        height: 5,
        quantity: 1,
        catalogSellingPrice: 15,
        costBreakdown: { labor_cost: 8 },
      })
      assert.strictEqual(pricing.outputQuantity, 50)
      assert.strictEqual(pricing.finalAmount, 750) // 50 * 15 = ৳750
      assert.strictEqual(pricing.totalDirectCostPerUnit, 8)
      assert.strictEqual(pricing.totalEstimatedCost, 400) // 50 * 8 = ৳400
      assert.strictEqual(pricing.grossProfitAmount, 350)
    })

    // CASE G: MIXED QUOTATION
    it('7.7 CASE G — MIXED QUOTATION: Flex + Eyelets + Design + Installation + Delivery', () => {
      // Line 1: Flex Banner 500 sqft @ ৳28/sqft
      const l1 = calculateCommercialPricing({ pricingMethod: 'per_area', quantity: 500, catalogSellingPrice: 28, effectiveMaterialCost: 5.4557 })
      // Line 2: Eyelets 100 pcs @ ৳2/pc
      const l2 = calculateCommercialPricing({ pricingMethod: 'per_piece', quantity: 100, catalogSellingPrice: 2, effectiveMaterialCost: 0.3571 })
      // Line 3: Design 1 Job @ ৳1,500
      const l3 = calculateCommercialPricing({ pricingMethod: 'per_job', quantity: 1, catalogSellingPrice: 1500 })
      // Line 4: Installation 500 sqft @ ৳12/sqft
      const l4 = calculateCommercialPricing({ pricingMethod: 'per_area', quantity: 500, catalogSellingPrice: 12, costBreakdown: { labor_cost: 6 } })
      // Line 5: Delivery 1 Trip @ ৳800
      const l5 = calculateCommercialPricing({ pricingMethod: 'fixed', quantity: 1, catalogSellingPrice: 800 })

      const subtotal = l1.finalAmount + l2.finalAmount + l3.finalAmount + l4.finalAmount + l5.finalAmount
      // 14000 + 200 + 1500 + 6000 + 800 = ৳22,500
      assert.strictEqual(subtotal, 22500)

      const totalCost = Math.round((l1.totalEstimatedCost + l2.totalEstimatedCost + l3.totalEstimatedCost + l4.totalEstimatedCost + l5.totalEstimatedCost) * 100) / 100
      // (500 * 5.4557 = 2727.85) + (100 * 0.3571 = 35.71) + 0 + (500 * 6 = 3000) + 0 = 5763.56
      assert.strictEqual(totalCost, 5763.56)

      const totalProfit = Math.round((subtotal - totalCost) * 100) / 100
      assert.strictEqual(totalProfit, 16736.44)
    })
  })

  // =========================================================================
  // 9. REAL BANGLADESH PRINT-SHOP FLEX / ROLL ALLOWANCE VS SELLING AREA AUDIT
  // =========================================================================
  describe('9. Flex / Roll Material Production Allowance vs Selling Area Audit', () => {
    const rawCostPerSqft = 8500 / 533 // ৳15.947467...

    it('9.1 Case 1: 3x10 ft Flex Banner (+0.25ft W, +0.25ft L allowance)', () => {
      const dim = calculateProductionDimensions({
        sellingWidth: 3,
        sellingHeight: 10,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
        quantity: 1,
      })

      assert.strictEqual(dim.sellingWidth, 3)
      assert.strictEqual(dim.sellingHeight, 10)
      assert.strictEqual(dim.productionWidth, 3.25)
      assert.strictEqual(dim.productionHeight, 10.25)
      assert.strictEqual(dim.singleSellingAreaSqft, 30)
      assert.strictEqual(dim.totalSellingAreaSqft, 30)
      assert.strictEqual(dim.singleProductionAreaSqft, 33.3125)
      assert.strictEqual(dim.totalProductionAreaSqft, 33.3125)
      assert.strictEqual(dim.physicalConsumptionSqft, 33.3125)
      assert.strictEqual(dim.allowanceAreaSqft, 3.3125)

      // Commercial calculation
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 3,
        height: 10,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
        quantity: 1,
        catalogSellingPrice: 28,
        conversionRatio: 533,
        effectiveMaterialCost: 15.9475,
      })

      assert.strictEqual(pricing.outputQuantity, 30) // Customer sees 30 sqft
      assert.strictEqual(pricing.billableQuantity, 30)
      assert.strictEqual(pricing.finalAmount, 840) // 30 * 28 = ৳840
      assert.strictEqual(pricing.productionAreaSqft, 33.3125)
      assert.strictEqual(pricing.physicalConsumptionSqft, 33.3125)
      assert.strictEqual(pricing.costingQuantity, 33.3125)
      assert.strictEqual(pricing.estimatedMaterialCost, 531.25) // 33.3125 * 15.9475 = ৳531.25
      assert.strictEqual(pricing.grossProfitAmount, 308.75) // 840 - 531.25 = ৳308.75
      assert.strictEqual(pricing.grossMarginPercent, 36.76) // 308.75 / 840 = 36.76%
    })

    it('9.2 Case 2: 3x20 ft Flex Banner (+0.25ft W, +0.25ft L allowance)', () => {
      const dim = calculateProductionDimensions({
        sellingWidth: 3,
        sellingHeight: 20,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
      })

      assert.strictEqual(dim.singleSellingAreaSqft, 60)
      assert.strictEqual(dim.productionWidth, 3.25)
      assert.strictEqual(dim.productionHeight, 20.25)
      assert.strictEqual(dim.physicalConsumptionSqft, 65.8125)
      assert.strictEqual(dim.allowanceAreaSqft, 5.8125)

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 3,
        height: 20,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
        catalogSellingPrice: 28,
        effectiveMaterialCost: 15.9475,
      })

      assert.strictEqual(pricing.outputQuantity, 60)
      assert.strictEqual(pricing.finalAmount, 1680) // 60 * 28 = ৳1,680
      assert.strictEqual(pricing.productionAreaSqft, 65.8125)
      assert.strictEqual(pricing.estimatedMaterialCost, 1049.54) // 65.8125 * 15.9475 = ৳1049.54
      assert.strictEqual(pricing.grossProfitAmount, 630.46)
      assert.strictEqual(pricing.grossMarginPercent, 37.53)
    })

    it('9.3 Case 3: 2x10 ft Flex Banner (+0.25ft W, +0.25ft L allowance)', () => {
      const dim = calculateProductionDimensions({
        sellingWidth: 2,
        sellingHeight: 10,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
      })

      assert.strictEqual(dim.singleSellingAreaSqft, 20)
      assert.strictEqual(dim.productionWidth, 2.25)
      assert.strictEqual(dim.productionHeight, 10.25)
      assert.strictEqual(dim.physicalConsumptionSqft, 23.0625)

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 2,
        height: 10,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
        catalogSellingPrice: 28,
        effectiveMaterialCost: 15.9475,
      })

      assert.strictEqual(pricing.outputQuantity, 20)
      assert.strictEqual(pricing.finalAmount, 560) // 20 * 28 = ৳560
      assert.strictEqual(pricing.productionAreaSqft, 23.0625)
      assert.strictEqual(pricing.estimatedMaterialCost, 367.79) // 23.0625 * 15.9475 = ৳367.79
      assert.strictEqual(pricing.grossProfitAmount, 192.21)
      assert.strictEqual(pricing.grossMarginPercent, 34.32)
    })

    it('9.4 Case 4: 2.5x10 ft Flex Banner (+0.25ft W, +0.25ft L allowance)', () => {
      const dim = calculateProductionDimensions({
        sellingWidth: 2.5,
        sellingHeight: 10,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
      })

      assert.strictEqual(dim.singleSellingAreaSqft, 25)
      assert.strictEqual(dim.productionWidth, 2.75)
      assert.strictEqual(dim.productionHeight, 10.25)
      assert.strictEqual(dim.physicalConsumptionSqft, 28.1875)

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 2.5,
        height: 10,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
        catalogSellingPrice: 28,
        effectiveMaterialCost: 15.9475,
      })

      assert.strictEqual(pricing.outputQuantity, 25)
      assert.strictEqual(pricing.finalAmount, 700) // 25 * 28 = ৳700
      assert.strictEqual(pricing.productionAreaSqft, 28.1875)
      assert.strictEqual(pricing.estimatedMaterialCost, 449.52) // 28.1875 * 15.9475 = ৳449.52
      assert.strictEqual(pricing.grossProfitAmount, 250.48)
      assert.strictEqual(pricing.grossMarginPercent, 35.78)
    })

    it('9.5 Case 5: 3x5 ft Flex Banner (+0.25ft W, +0.25ft L allowance)', () => {
      const dim = calculateProductionDimensions({
        sellingWidth: 3,
        sellingHeight: 5,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
      })

      assert.strictEqual(dim.singleSellingAreaSqft, 15)
      assert.strictEqual(dim.productionWidth, 3.25)
      assert.strictEqual(dim.productionHeight, 5.25)
      assert.strictEqual(dim.physicalConsumptionSqft, 17.0625)

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 3,
        height: 5,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
        catalogSellingPrice: 28,
        effectiveMaterialCost: 15.9475,
      })

      assert.strictEqual(pricing.outputQuantity, 15)
      assert.strictEqual(pricing.finalAmount, 420) // 15 * 28 = ৳420
      assert.strictEqual(pricing.productionAreaSqft, 17.0625)
      assert.strictEqual(pricing.estimatedMaterialCost, 272.1) // 17.0625 * 15.9475 = ৳272.10
      assert.strictEqual(pricing.grossProfitAmount, 147.9)
      assert.strictEqual(pricing.grossMarginPercent, 35.21)
    })

    it('9.6 Case 6: Multiple Quantities (10 banners of 3x10 ft)', () => {
      const dim = calculateProductionDimensions({
        sellingWidth: 3,
        sellingHeight: 10,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
        quantity: 10,
      })

      assert.strictEqual(dim.singleSellingAreaSqft, 30)
      assert.strictEqual(dim.totalSellingAreaSqft, 300)
      assert.strictEqual(dim.singleProductionAreaSqft, 33.3125)
      assert.strictEqual(dim.totalProductionAreaSqft, 333.125)
      assert.strictEqual(dim.physicalConsumptionSqft, 333.125)
      assert.strictEqual(dim.allowanceAreaSqft, 33.125)

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 3,
        height: 10,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
        quantity: 10,
        catalogSellingPrice: 28,
        conversionRatio: 533,
        effectiveMaterialCost: 15.9475,
      })

      assert.strictEqual(pricing.outputQuantity, 300) // Customer billed for 300 sqft
      assert.strictEqual(pricing.finalAmount, 8400) // 300 * 28 = ৳8,400
      assert.strictEqual(pricing.productionAreaSqft, 333.125) // Shop floor cuts 333.125 sqft
      assert.strictEqual(pricing.costingQuantity, 333.125)
      assert.strictEqual(pricing.estimatedMaterialCost, 5312.51) // 333.125 * 15.9475 = ৳5,312.51
      assert.strictEqual(pricing.grossProfitAmount, 3087.49) // 8400 - 5312.51 = ৳3,087.49
      assert.strictEqual(pricing.grossMarginPercent, 36.76)
    })

    it('9.7 Case 7: Zero Allowance (3x10 ft, 0 allowance)', () => {
      const dim = calculateProductionDimensions({
        sellingWidth: 3,
        sellingHeight: 10,
        widthAllowance: 0,
        heightAllowance: 0,
      })

      assert.strictEqual(dim.singleSellingAreaSqft, 30)
      assert.strictEqual(dim.productionWidth, 3)
      assert.strictEqual(dim.productionHeight, 10)
      assert.strictEqual(dim.physicalConsumptionSqft, 30)
      assert.strictEqual(dim.allowanceAreaSqft, 0)

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 3,
        height: 10,
        widthAllowance: 0,
        heightAllowance: 0,
        catalogSellingPrice: 28,
        effectiveMaterialCost: 15.9475,
      })

      assert.strictEqual(pricing.outputQuantity, 30)
      assert.strictEqual(pricing.productionAreaSqft, 30)
      assert.strictEqual(pricing.estimatedMaterialCost, 478.43) // 30 * 15.9475 = ৳478.43
    })

    it('9.8 Case 8: Width-Only Allowance (3x10 ft, +0.25ft W, 0 L)', () => {
      const dim = calculateProductionDimensions({
        sellingWidth: 3,
        sellingHeight: 10,
        widthAllowance: 0.25,
        heightAllowance: 0,
      })

      assert.strictEqual(dim.singleSellingAreaSqft, 30)
      assert.strictEqual(dim.productionWidth, 3.25)
      assert.strictEqual(dim.productionHeight, 10)
      assert.strictEqual(dim.physicalConsumptionSqft, 32.5) // 3.25 * 10 = 32.5 sqft
      assert.strictEqual(dim.allowanceAreaSqft, 2.5)

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 3,
        height: 10,
        widthAllowance: 0.25,
        heightAllowance: 0,
        catalogSellingPrice: 28,
        effectiveMaterialCost: 15.9475,
      })

      assert.strictEqual(pricing.outputQuantity, 30)
      assert.strictEqual(pricing.productionAreaSqft, 32.5)
      assert.strictEqual(pricing.estimatedMaterialCost, 518.29) // 32.5 * 15.9475 = ৳518.29
    })

    it('9.9 Case 9: Length-Only Allowance (3x10 ft, 0 W, +0.5ft L)', () => {
      const dim = calculateProductionDimensions({
        sellingWidth: 3,
        sellingHeight: 10,
        widthAllowance: 0,
        heightAllowance: 0.5,
      })

      assert.strictEqual(dim.singleSellingAreaSqft, 30)
      assert.strictEqual(dim.productionWidth, 3)
      assert.strictEqual(dim.productionHeight, 10.5)
      assert.strictEqual(dim.physicalConsumptionSqft, 31.5) // 3 * 10.5 = 31.5 sqft
      assert.strictEqual(dim.allowanceAreaSqft, 1.5)

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 3,
        height: 10,
        widthAllowance: 0,
        heightAllowance: 0.5,
        catalogSellingPrice: 28,
        effectiveMaterialCost: 15.9475,
      })

      assert.strictEqual(pricing.outputQuantity, 30)
      assert.strictEqual(pricing.productionAreaSqft, 31.5)
      assert.strictEqual(pricing.estimatedMaterialCost, 502.35) // 31.5 * 15.9475 = ৳502.35
    })

    it('9.10 Case 10: Inches Dimension & Bleed Allowance Conversion', () => {
      // 36 in x 120 in (3ft x 10ft) with 3 in width allowance (0.25ft) and 3 in length allowance (0.25ft)
      const dim = calculateProductionDimensions({
        sellingWidth: 36,
        sellingHeight: 120,
        dimensionUnit: 'inch',
        widthAllowance: 3,
        heightAllowance: 3,
        allowanceUnit: 'inch',
      })

      assert.strictEqual(dim.singleSellingAreaSqft, 30)
      assert.strictEqual(dim.productionWidth, 3.25) // 39 in / 12 = 3.25 ft
      assert.strictEqual(dim.productionHeight, 10.25) // 123 in / 12 = 10.25 ft
      assert.strictEqual(dim.physicalConsumptionSqft, 33.3125)
      assert.strictEqual(dim.allowanceAreaSqft, 3.3125)
    })

    it('9.11 Allowance vs Operational Wastage Distinction (No Double-Counting)', () => {
      // Physical cut is 33.3125 sqft (from 3.25 x 10.25)
      // Operational wastage (e.g. 2% printer head calibration) is evaluated on the physical cut
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 3,
        height: 10,
        widthAllowance: 0.25,
        heightAllowance: 0.25,
        catalogSellingPrice: 28,
        conversionRatio: 533,
        effectiveMaterialCost: 15.9475,
        defaultWastagePercent: 2.0,
      })

      // Customer still billed for 30 sqft
      assert.strictEqual(pricing.outputQuantity, 30)
      assert.strictEqual(pricing.finalAmount, 840)

      // Production media cut is 33.3125 sqft
      assert.strictEqual(pricing.productionAreaSqft, 33.3125)

      // Expected media consumption including 2% operational waste = 33.3125 * 1.02 = 33.9788 sqft
      assert.strictEqual(pricing.expectedConsumptionUnits, 33.9788)

      // Estimated material cost remains based on physical cut: 33.3125 * 15.9475 = ৳531.25
      assert.strictEqual(pricing.estimatedMaterialCost, 531.25)
    })

    it('9.12 Roll Yield & 164 ft Roll Utilization Audit', () => {
      // Roll: 3.25 ft x 164 ft = 533 sqft
      // Banners: 3 ft x 10 ft requiring 3.25 ft x 10.25 ft physical cut per job
      const rollLengthFt = 164
      const jobLengthFt = 10.25
      const maxFullJobs = Math.floor(rollLengthFt / jobLengthFt)
      assert.strictEqual(maxFullJobs, 16) // 16 * 10.25 = 164 ft (100% exact roll consumption)

      const totalPhysicalMediaConsumed = maxFullJobs * 33.3125 // 16 * 33.3125 = 533 sqft
      assert.strictEqual(totalPhysicalMediaConsumed, 533)

      const totalSellableCustomerArea = maxFullJobs * 30 // 16 * 30 = 480 sqft
      assert.strictEqual(totalSellableCustomerArea, 480)

      const allowanceMediaArea = totalPhysicalMediaConsumed - totalSellableCustomerArea
      assert.strictEqual(allowanceMediaArea, 53) // 53 sqft production allowance
    })

    it('9.13 Product Catalog & Repository Production Allowance Integration', async () => {
      const created = await ProductRepository.createProduct({
        company_id: companyId,
        name: 'Star Flex Banner 3ft Roll',
        sku: 'FLEX-3FT-ROLL-01',
        unit: 'sft',
        selling_unit: 'sft',
        purchase_unit: 'roll',
        purchase_price: 8500,
        conversion_ratio: 533,
        roll_width_ft: 3.25,
        roll_length_ft: 164,
        production_width_allowance: 0.25,
        production_length_allowance: 0.25,
        allowance_unit: 'ft',
        selling_price: 28,
        default_wastage_percentage: 0,
        target_margin_percentage: 35,
      })

      assert.strictEqual(created.roll_width_ft, 3.25)
      assert.strictEqual(created.roll_length_ft, 164)
      assert.strictEqual(created.production_width_allowance, 0.25)
      assert.strictEqual(created.production_length_allowance, 0.25)
      assert.strictEqual(created.allowance_unit, 'ft')
      assert.strictEqual(created.effective_unit_cost, 15.9475)

      // Resolve product price
      const resolved = await ProductRepository.resolveCustomerProductPrice(created.id, undefined, companyId)
      assert.strictEqual(resolved.production_width_allowance, 0.25)
      assert.strictEqual(resolved.production_length_allowance, 0.25)
      assert.strictEqual(resolved.allowance_unit, 'ft')
      assert.strictEqual(resolved.effectiveUnitCost, 15.9475)

      // Calculate commercial pricing with product allowances
      const pricing = calculateCommercialPricing({
        pricingMethod: resolved.pricingMethod,
        width: 3,
        height: 10,
        productionWidthAllowance: resolved.production_width_allowance || 0,
        productionLengthAllowance: resolved.production_length_allowance || 0,
        allowanceUnit: resolved.allowance_unit || 'ft',
        catalogSellingPrice: resolved.effectiveRate,
        effectiveMaterialCost: resolved.effectiveUnitCost,
      })

      assert.strictEqual(pricing.outputQuantity, 30) // Customer sees 30 sqft
      assert.strictEqual(pricing.finalAmount, 840) // 30 * 28 = ৳840
      assert.strictEqual(pricing.productionAreaSqft, 33.3125) // Shop floor consumes 33.3125 sqft
      assert.strictEqual(pricing.estimatedMaterialCost, 531.25)
      assert.strictEqual(pricing.grossProfitAmount, 308.75)
    })
  })
})
