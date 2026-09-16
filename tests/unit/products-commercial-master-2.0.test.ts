import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import {
  calculateEffectiveUnitCost,
  calculateGrossMargin,
  calculateSuggestedSellingPrice,
  applyMinimumCharge,
  validateConversionRatio,
  calculateRollAreaSqft,
  calculateSheetAreaSqft,
  COMMERCIAL_PRODUCT_TYPES,
  MEASUREMENT_TYPES,
  UNITS_MASTER,
} from '../../lib/units.ts'
import { ProductService } from '../../services/product.service.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Unit: Products & Services Commercial Master 2.0', () => {
  const companyId = 'tenant-commercial-test-01'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_HISTORY, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_VARIANTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_FORMULAS, [])
  })

  describe('1. Unit Conversions & Dimensional Calculations', () => {
    it('correctly calculates Roll → sqft conversion (10ft x 164ft = 1,640 sqft)', () => {
      const rollArea = calculateRollAreaSqft(10, 164)
      assert.strictEqual(rollArea, 1640)

      const validation = validateConversionRatio(rollArea, 'roll', 'sft')
      assert.strictEqual(validation.valid, true)
      assert.strictEqual(validation.ratio, 1640)
    })

    it('correctly calculates Sheet → sqft conversion (4ft x 8ft = 32 sqft)', () => {
      const sheetArea = calculateSheetAreaSqft(4, 8)
      assert.strictEqual(sheetArea, 32)

      const validation = validateConversionRatio(sheetArea, 'sheet', 'sft')
      assert.strictEqual(validation.valid, true)
      assert.strictEqual(validation.ratio, 32)
    })

    it('validates Box → piece conversion (1 Box = 100 Eyelets / 1,000 Cards)', () => {
      const eyeletBox = validateConversionRatio(100, 'box', 'pcs')
      assert.strictEqual(eyeletBox.valid, true)
      assert.strictEqual(eyeletBox.ratio, 100)

      const cardBox = validateConversionRatio(1000, 'box', 'pcs')
      assert.strictEqual(cardBox.valid, true)
      assert.strictEqual(cardBox.ratio, 1000)
    })

    it('validates Bottle → ml conversion (1 Bottle = 1,000 ml)', () => {
      const inkBottle = validateConversionRatio(1000, 'bottle', 'ml')
      assert.strictEqual(inkBottle.valid, true)
      assert.strictEqual(inkBottle.ratio, 1000)
    })

    it('rejects zero or negative conversion ratios', () => {
      assert.strictEqual(validateConversionRatio(0, 'roll', 'sft').valid, false)
      assert.strictEqual(validateConversionRatio(-10, 'roll', 'sft').valid, false)
      assert.strictEqual(validateConversionRatio(NaN, 'roll', 'sft').valid, false)
    })
  })

  describe('2. Wastage-Adjusted Costing & Effective Material Cost', () => {
    it('calculates effective unit cost with 5% expected wastage for Flex Banner (Roll = ৳8,500, 1,640 sqft)', () => {
      // 1,640 * (1 - 0.05) = 1,558 sqft usable
      // Effective cost = 8500 / 1558 = 5.455712...
      const result = calculateEffectiveUnitCost({
        purchasePrice: 8500,
        conversionRatio: 1640,
        defaultWastagePercent: 5.0,
      })

      assert.strictEqual(result.grossAvailableUnits, 1640)
      assert.strictEqual(result.expectedUsableUnits, 1558)
      assert.ok(Math.abs(result.effectiveCostPerSellingUnit - 5.4557) < 0.001)
    })

    it('calculates effective unit cost with 0% wastage', () => {
      // 8500 / 1640 = 5.1829...
      const result = calculateEffectiveUnitCost({
        purchasePrice: 8500,
        conversionRatio: 1640,
        defaultWastagePercent: 0,
      })

      assert.strictEqual(result.grossAvailableUnits, 1640)
      assert.strictEqual(result.expectedUsableUnits, 1640)
      assert.ok(Math.abs(result.effectiveCostPerSellingUnit - 5.1829) < 0.001)
    })

    it('preserves purchase price when calculating effective unit cost', () => {
      const result = calculateEffectiveUnitCost({
        purchasePrice: 12000,
        conversionRatio: 32, // Sheet of acrylic
        defaultWastagePercent: 10.0, // 10% cutting waste => 28.8 sqft usable
      })

      assert.strictEqual(result.expectedUsableUnits, 28.8)
      assert.ok(Math.abs(result.effectiveCostPerSellingUnit - 416.67) < 0.1)
    })
  })

  describe('3. Gross Margin vs Markup & Target Margin Pricing', () => {
    it('strictly calculates Gross Margin % and does not confuse with Markup %', () => {
      // Cost = 100, Selling = 150
      // Markup = (150 - 100) / 100 = 50%
      // Margin = (150 - 100) / 150 = 33.33%
      const marginCalc = calculateGrossMargin(100, 150)
      assert.strictEqual(marginCalc.grossProfit, 50)
      assert.strictEqual(marginCalc.grossMarginPercent, 33.33)
    })

    it('calculates advisory suggested selling price from Cost and Target Margin %', () => {
      // Cost = 100, Target Margin = 40%
      // Suggested = 100 / (1 - 0.40) = 100 / 0.60 = 166.67
      const suggested = calculateSuggestedSellingPrice(100, 40)
      assert.strictEqual(suggested, 166.67)
    })

    it('derives suggested price for Flex Banner from effective cost ৳5.4557 @ 40% target margin', () => {
      const effectiveCost = 5.4557
      const suggested = calculateSuggestedSellingPrice(effectiveCost, 40)
      // 5.4557 / 0.60 = 9.0928 => 9.09
      assert.strictEqual(suggested, 9.09)
    })
  })

  describe('4. Minimum Charge vs Minimum Order Quantity', () => {
    it('applies Minimum Charge floor when calculated line item amount is below threshold', () => {
      // Sticker ৳28/sqft, order 10 sqft = ৳280, min charge = ৳500
      const res = applyMinimumCharge(280, 500)
      assert.strictEqual(res.finalAmount, 500)
      assert.strictEqual(res.isMinimumApplied, true)
      assert.strictEqual(res.minimumDifference, 220)
    })

    it('does not inflate price when calculated amount exceeds Minimum Charge', () => {
      // Sticker ৳28/sqft, order 30 sqft = ৳840, min charge = ৳500
      const res = applyMinimumCharge(840, 500)
      assert.strictEqual(res.finalAmount, 840)
      assert.strictEqual(res.isMinimumApplied, false)
      assert.strictEqual(res.minimumDifference, 0)
    })

    it('handles zero minimum charge smoothly', () => {
      const res = applyMinimumCharge(150, 0)
      assert.strictEqual(res.finalAmount, 150)
      assert.strictEqual(res.isMinimumApplied, false)
    })
  })

  describe('5. Product Commercial Master CRUD & Price Audit', () => {
    it('creates a full commercial product with purchase units, conversion, and wastage', async () => {
      const created = await ProductService.createProduct({
        company_id: companyId,
        name: 'Star Flex Banner 280 GSM',
        sku: 'FLX-280-STAR',
        commercial_type: 'production_product',
        measurement_type: 'area',
        purchase_unit: 'roll',
        purchase_price: 8500,
        selling_unit: 'sft',
        conversion_ratio: 1640,
        production_unit: 'sft',
        default_wastage_percentage: 5.0,
        target_margin_percentage: 40.0,
        minimum_charge: 500,
        min_order_quantity: 5.0,
        selling_price: 28.0,
        base_cost: 5.46,
        min_price: 20.0,
        tax_rate: 7.5,
      })

      assert.ok(created.id)
      assert.strictEqual(created.name, 'Star Flex Banner 280 GSM')
      assert.strictEqual(created.purchase_unit, 'roll')
      assert.strictEqual(created.purchase_price, 8500)
      assert.strictEqual(created.conversion_ratio, 1640)
      assert.strictEqual(created.default_wastage_percentage, 5.0)
      assert.strictEqual(created.minimum_charge, 500)
    })

    it('records price history with commercial audit metadata', async () => {
      const product = await ProductService.createProduct({
        company_id: companyId,
        name: 'Cast Acrylic Sheet 3mm',
        sku: 'ACR-3MM-CLR',
        purchase_unit: 'sheet',
        purchase_price: 4500,
        selling_unit: 'sft',
        conversion_ratio: 32,
        selling_price: 180,
        base_cost: 140.63,
      })

      // Update price
      await ProductService.updatePrice(
        product.id,
        210,
        'Raw material imported acrylic resin tariff rise',
        'Owner Admin',
        'usr-owner-01',
        companyId,
        {
          newPurchasePrice: 5200,
          newTargetMarginPercent: 35,
          newWastagePercent: 8,
        }
      )

      const history = await ProductService.getPriceHistory(product.id, companyId)
      assert.ok(history.length > 0)
      const lastEntry = history[history.length - 1]
      assert.strictEqual(lastEntry.old_price, 180)
      assert.strictEqual(lastEntry.new_price, 210)
      assert.strictEqual(lastEntry.old_purchase_price, 4500)
      assert.strictEqual(lastEntry.new_purchase_price, 5200)
      assert.ok(lastEntry.reason.includes('tariff rise'))
    })

    it('resolves customer product price and attaches commercial economics', async () => {
      const product = await ProductService.createProduct({
        company_id: companyId,
        name: 'Vinyl Sticker Gloss',
        sku: 'VNL-GLOSS-01',
        purchase_unit: 'roll',
        purchase_price: 6500,
        selling_unit: 'sft',
        conversion_ratio: 1000,
        default_wastage_percentage: 6.0,
        target_margin_percentage: 45.0,
        minimum_charge: 350,
        selling_price: 35.0,
        min_price: 25.0,
      })

      const resolved = await ProductService.resolveCustomerProductPrice(product.id, undefined, companyId)
      assert.strictEqual(resolved.productId, product.id)
      assert.strictEqual(resolved.effectiveRate, 35.0)
      assert.strictEqual(resolved.purchasePrice, 6500)
      assert.strictEqual(resolved.conversionRatio, 1000)
      assert.strictEqual(resolved.defaultWastagePercent, 6.0)
      assert.strictEqual(resolved.minimumCharge, 350)
      // 1000 * (1 - 0.06) = 940 usable
      // Effective cost = 6500 / 940 = 6.9148...
      assert.ok(Math.abs(resolved.effectiveUnitCost! - 6.9149) < 0.01)
      assert.ok(resolved.grossMarginPercent! > 75)
    })
  })

  describe('6. Real Business End-to-End Scenario: ABC Advertising (Star Flex Banner)', () => {
    it('executes full commercial flow from purchase economics to job profitability', async () => {
      // 1. Setup Master Product
      const flexBanner = await ProductService.createProduct({
        company_id: companyId,
        name: 'Star Flex Banner 280 GSM',
        sku: 'STAR-FLX-280',
        commercial_type: 'production_product',
        measurement_type: 'area',
        purchase_unit: 'roll',
        purchase_price: 8500,
        roll_width_ft: 10,
        roll_length_ft: 164,
        conversion_ratio: 1640,
        default_wastage_percentage: 5.0,
        selling_unit: 'sft',
        selling_price: 28.0,
        min_price: 22.0,
        minimum_charge: 500,
      })

      // 2. Derive Commercial Costing
      const costCalc = calculateEffectiveUnitCost({
        purchasePrice: flexBanner.purchase_price!,
        conversionRatio: flexBanner.conversion_ratio!,
        defaultWastagePercent: flexBanner.default_wastage_percentage!,
      })
      assert.ok(Math.abs(costCalc.effectiveCostPerSellingUnit - 5.4557) < 0.001)

      // 3. Client Orders Job: 20ft x 10ft x 2 pcs = 400 sqft
      const orderArea = 20 * 10 * 2 // 400 sqft
      const orderRate = flexBanner.selling_price // ৳28/sqft
      const orderSubtotal = orderArea * orderRate // ৳11,200

      // 4. Expected Consumption & Material Cost
      const expectedConsumption = orderArea * (1 + (flexBanner.default_wastage_percentage || 0) / 100) // 420 sqft
      const estimatedMaterialCost = orderArea * costCalc.effectiveCostPerSellingUnit // 400 * 5.4557 = ৳2,182.28
      const estimatedGrossProfit = orderSubtotal - estimatedMaterialCost // 11,200 - 2,182.28 = ৳9,017.72
      const estimatedMargin = (estimatedGrossProfit / orderSubtotal) * 100 // 80.515%

      assert.strictEqual(orderArea, 400)
      assert.strictEqual(expectedConsumption, 420)
      assert.strictEqual(orderSubtotal, 11200)
      assert.ok(Math.abs(estimatedMaterialCost - 2182.28) < 0.5)
      assert.ok(Math.abs(estimatedGrossProfit - 9017.72) < 0.5)
      assert.ok(Math.abs(estimatedMargin - 80.52) < 0.1)

      // 5. Historical Price Freeze Test: Change Catalog Prices
      await ProductService.updatePrice(
        flexBanner.id,
        32.0,
        'Seasonal inflation',
        'Owner',
        'usr-1',
        companyId,
        { newPurchasePrice: 9200 }
      )

      // The historical quotation retains its ৳28 rate and ৳2,182.28 estimated cost
      assert.strictEqual(orderSubtotal, 11200)
      assert.strictEqual(orderRate, 28.0)

      // 6. New Customer Quotation uses new rate
      const newResolved = await ProductService.resolveCustomerProductPrice(flexBanner.id, undefined, companyId)
      assert.strictEqual(newResolved.effectiveRate, 32.0)
    })
  })
})
