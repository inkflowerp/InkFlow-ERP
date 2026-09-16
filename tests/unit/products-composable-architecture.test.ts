import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateProductionDimensions,
  calculateEffectiveUnitCost,
  calculateGrossMargin,
  calculateSuggestedSellingPrice,
  applyMinimumCharge,
  calculateCommercialPricing,
  calculateRollCuttingYield,
  calculateMultiJobRollConsumption,
  normalizePricingMethod,
} from '../../lib/units.ts'
import { CategoryRepository } from '../../lib/repositories/category.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { ProductRecord, ProductComponent } from '../../types/product.types.ts'
import type { CreateCategoryInput } from '../../types/category.types.ts'

describe('Products & Services Composable Architecture & Business Reality Tests', () => {
  const TEST_COMPANY_ID = 'test-company-print-shop-dhaka'

  beforeEach(() => {
    // Clear in-memory categories for clean isolation
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_CATEGORIES, [])
  })

  // =========================================================================
  // TEST A: READY PRODUCT
  // =========================================================================
  describe('TEST A: Ready Product (X-Stand / Roll-up Stand)', () => {
    it('calculates clean commercial selling amount without faking production bleed or roll dimensions', () => {
      const xStandOrder = {
        productType: 'ready_product',
        sellingPrice: 1500,
        quantity: 5,
        sellingUnit: 'pcs',
        purchasePrice: 950,
        conversionRatio: 1.0,
      }

      const billable = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        unitPrice: xStandOrder.sellingPrice,
        quantity: xStandOrder.quantity,
      })

      assert.strictEqual(billable.actualQuantity, 5)
      assert.strictEqual(billable.billableQuantity, 5)
      assert.strictEqual(billable.finalAmount, 7500)

      const margin = calculateGrossMargin(xStandOrder.purchasePrice, xStandOrder.sellingPrice)
      assert.strictEqual(margin.grossProfit, 550)
      assert.strictEqual(Math.round(margin.grossMarginPercent * 100) / 100, 36.67)
    })
  })

  // =========================================================================
  // TEST B: PRINTING PRODUCT (FLEX BANNER)
  // =========================================================================
  describe('TEST B: Flex Banner Physical vs Billing Independence', () => {
    it('correctly separates 3x10 ft customer billing (30 sqft) from 3.25x10.25 ft production (33.3125 sqft)', () => {
      const order = {
        width: 3,
        height: 10,
        unit: 'ft' as const,
        quantity: 1,
        widthAllowance: 0.25,
        lengthAllowance: 0.25,
        allowanceUnit: 'ft' as const,
        sellingRate: 28,
      }

      // Production & Physical Consumption Geometry
      const prod = calculateProductionDimensions({
        sellingWidth: order.width,
        sellingHeight: order.height,
        dimensionUnit: order.unit,
        widthAllowance: order.widthAllowance,
        lengthAllowance: order.lengthAllowance,
        allowanceUnit: order.allowanceUnit,
        quantity: order.quantity,
      })

      assert.strictEqual(prod.singleSellingAreaSqft, 30.0)
      assert.strictEqual(prod.productionWidth, 3.25)
      assert.strictEqual(prod.productionHeight, 10.25)
      assert.strictEqual(prod.physicalConsumptionSqft, 33.3125)

      // Commercial Pricing
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: order.sellingRate,
        quantity: order.quantity,
        width: order.width,
        height: order.height,
        dimensionUnit: order.unit,
      })
      assert.strictEqual(pricing.areaSqft, 30.0)
      assert.strictEqual(pricing.finalAmount, 840.0) // 30 * 28

      // Material Cost: 1 Roll = 533 sqft @ ৳8,500 => ৳15.947467.../sqft
      const costPerSqft = 8500 / 533
      const physicalMaterialCost = prod.physicalConsumptionSqft * costPerSqft
      assert.strictEqual(Math.round(physicalMaterialCost * 100) / 100, 531.25)
    })
  })

  // =========================================================================
  // TEST C: COMPOSABLE PRODUCT (VINYL + GLOSSY LAMINATION)
  // =========================================================================
  describe('TEST C: Vinyl Printing + Glossy Lamination Composition', () => {
    it('composes base printing + finishing line without creating separate exploded catalog SKUs', () => {
      // 3 ft x 10 ft vinyl banner = 30 sqft

      // Base Vinyl Line
      const vinylPricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: 25.0, // ৳25/sqft
        width: 3,
        height: 10,
        dimensionUnit: 'ft',
        quantity: 1,
      })
      assert.strictEqual(vinylPricing.finalAmount, 750.0)

      // Glossy Lamination Line (Finishing Service)
      const laminationPricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: 8.0, // ৳8/sqft
        width: 3,
        height: 10,
        dimensionUnit: 'ft',
        quantity: 1,
      })
      assert.strictEqual(laminationPricing.finalAmount, 240.0)

      const totalJobPrice = vinylPricing.finalAmount + laminationPricing.finalAmount
      assert.strictEqual(totalJobPrice, 990.0)

      // Costing: Vinyl Cost ৳12/sqft + Lamination Cost ৳3.5/sqft
      const billableArea = 30.0
      const totalDirectCost = (12.0 + 3.5) * billableArea
      assert.strictEqual(totalDirectCost, 465.0)

      const margin = calculateGrossMargin(totalDirectCost, totalJobPrice)
      assert.strictEqual(margin.grossProfit, 525.0)
      assert.strictEqual(Math.round(margin.grossMarginPercent * 100) / 100, 53.03)
    })
  })

  // =========================================================================
  // TEST D: COMPOSABLE PRODUCT (VINYL + GLOSSY + EYELETS + INSTALLATION)
  // =========================================================================
  describe('TEST D: Vinyl + Glossy + Eyelets + Installation Composable Pipeline', () => {
    it('calculates the exact customer quotation breakdown matching Section 3 specification', () => {
      // 1. Base Vinyl Printing: 30 sqft @ ৳25/sqft = ৳750
      const vinyl = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: 25.0,
        width: 3,
        height: 10,
        dimensionUnit: 'ft',
        quantity: 1,
      })

      // 2. Glossy Lamination: 30 sqft @ ৳8/sqft = ৳240
      const lamination = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: 8.0,
        width: 3,
        height: 10,
        dimensionUnit: 'ft',
        quantity: 1,
      })

      // 3. Eyelets: 20 pcs @ ৳5/pc = ৳100
      const eyelets = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        unitPrice: 5.0,
        quantity: 20,
      })

      // 4. Installation: 1 Job @ ৳500 = ৳500
      const installation = calculateCommercialPricing({
        pricingMethod: 'per_job',
        unitPrice: 500.0,
        quantity: 1,
      })

      const lineItems = [vinyl, lamination, eyelets, installation]
      const totalQuotation = lineItems.reduce((sum, item) => sum + item.finalAmount, 0)

      assert.strictEqual(vinyl.finalAmount, 750)
      assert.strictEqual(lamination.finalAmount, 240)
      assert.strictEqual(eyelets.finalAmount, 100)
      assert.strictEqual(installation.finalAmount, 500)
      assert.strictEqual(totalQuotation, 1590.0)
    })
  })

  // =========================================================================
  // TEST E: ACRYLIC SIGNAGE WITH BOM / RECIPE ROLLUP
  // =========================================================================
  describe('TEST E: Acrylic Signage Fabrication & BOM Rollup', () => {
    it('aggregates BOM components and applies correct markup', () => {
      const components: ProductComponent[] = [
        { name: 'Cast Acrylic Sheet 5mm (sqft)', quantity: 12, cost_contribution: 180, is_required: true, production_role: 'material' },
        { name: 'LED Modules Samsung 3-Lamp', quantity: 30, cost_contribution: 45, is_required: true, production_role: 'component' },
        { name: 'Rainproof Power Supply 12V 33A', quantity: 1, cost_contribution: 1400, is_required: true, production_role: 'hardware' },
        { name: 'CNC Letter Router Cutting', quantity: 1, cost_contribution: 800, is_required: true, production_role: 'labor' },
        { name: 'MS Angle Frame & Paint', quantity: 1, cost_contribution: 1200, is_required: true, production_role: 'labor' },
        { name: 'Site Mounting & Pasting', quantity: 1, cost_contribution: 1500, is_required: false, production_role: 'service' },
      ]

      // Component rollup cost = (12*180) + (30*45) + 1400 + 800 + 1200 + 1500 = 8410
      const totalCost = components.reduce((sum, c) => sum + ((c.cost_contribution ?? 0) * (c.quantity ?? 1)), 0)
      assert.strictEqual(totalCost, 8410)

      // Target 40% margin on ৳8,410 direct cost => Suggested Price = 8410 / (1 - 0.40) = 14016.67
      const suggestedPrice = calculateSuggestedSellingPrice(totalCost, 40)
      assert.strictEqual(suggestedPrice, 14016.67)

      const margin = calculateGrossMargin(totalCost, suggestedPrice)
      assert.strictEqual(margin.grossProfit, 5606.67)
      assert.ok(margin.grossMarginPercent >= 39.99)
    })
  })

  // =========================================================================
  // TEST F: VEHICLE BRANDING COMPOSABLE PIPELINE
  // =========================================================================
  describe('TEST F: Vehicle Branding Composition', () => {
    it('composes vinyl, lamination, design fee, and on-site pasting correctly', () => {
      // 160 sqft total van wrap area (e.g. 16 ft x 10 ft)
      // Cast Vinyl Media @ ৳55/sqft
      const vinyl = calculateCommercialPricing({ pricingMethod: 'per_area', unitPrice: 55, width: 16, height: 10, dimensionUnit: 'ft', quantity: 1 })
      // UV Lamination @ ৳15/sqft
      const lamination = calculateCommercialPricing({ pricingMethod: 'per_area', unitPrice: 15, width: 16, height: 10, dimensionUnit: 'ft', quantity: 1 })
      // Custom Graphic Artwork @ ৳3,000 fixed job fee
      const design = calculateCommercialPricing({ pricingMethod: 'per_job', unitPrice: 3000, quantity: 1 })
      // On-site Heat-gun Wrap Installation @ ৳4,500
      const installation = calculateCommercialPricing({ pricingMethod: 'per_job', unitPrice: 4500, quantity: 1 })

      const grandTotal = vinyl.finalAmount + lamination.finalAmount + design.finalAmount + installation.finalAmount
      // 8800 + 2400 + 3000 + 4500 = 18700
      assert.strictEqual(vinyl.finalAmount, 8800)
      assert.strictEqual(lamination.finalAmount, 2400)
      assert.strictEqual(design.finalAmount, 3000)
      assert.strictEqual(installation.finalAmount, 4500)
      assert.strictEqual(grandTotal, 18700)
    })
  })

  // =========================================================================
  // TEST G: DESIGN SERVICE ONLY
  // =========================================================================
  describe('TEST G: Design Service Only', () => {
    it('bills purely per job / hour without faking any material consumption', () => {
      const designPricing = calculateCommercialPricing({
        pricingMethod: 'per_job',
        unitPrice: 1500,
        quantity: 1,
      })

      assert.strictEqual(designPricing.actualQuantity, 1)
      assert.strictEqual(designPricing.billableQuantity, 1)
      assert.strictEqual(designPricing.finalAmount, 1500)
    })
  })

  // =========================================================================
  // TEST H: DELIVERY SERVICE ONLY
  // =========================================================================
  describe('TEST H: Delivery & Transport Service', () => {
    it('bills delivery trip accurately with no production allowance', () => {
      const deliveryPricing = calculateCommercialPricing({
        pricingMethod: 'per_job',
        unitPrice: 450,
        quantity: 2, // 2 trips
      })

      assert.strictEqual(deliveryPricing.finalAmount, 900)
    })
  })

  // =========================================================================
  // TEST I: CATEGORY MASTER & HIERARCHY
  // =========================================================================
  describe('TEST I: Category Master & Hierarchy Operations', () => {
    it('creates root categories, subcategories, builds hierarchy tree, and prevents duplicates', async () => {
      // 1. Create Root Category
      const printingCat = await CategoryRepository.createCategory(
        {
          name: 'Printing Master',
          name_bn: 'প্রিন্টিং মাস্টার',
          applies_to_product_types: ['production_product', 'ready_product'],
          description: 'Parent category for all print outputs',
          display_order: 1,
        },
        TEST_COMPANY_ID
      )
      assert.ok(printingCat.id)
      assert.strictEqual(printingCat.slug, 'printing-master')

      // 2. Duplicate prevention
      await assert.rejects(
        async () => {
          await CategoryRepository.createCategory(
            { name: 'Printing Master' },
            TEST_COMPANY_ID
          )
        },
        /already exists/
      )

      // 3. Create Subcategory with parent_id
      const flexSubCat = await CategoryRepository.createCategory(
        {
          name: 'Star Flex Media',
          parent_id: printingCat.id,
          applies_to_product_types: ['production_product'],
          description: 'Frontlit & backlit flex media',
          display_order: 2,
        },
        TEST_COMPANY_ID
      )
      assert.strictEqual(flexSubCat.parent_id, printingCat.id)

      // 4. Get Category Tree
      const tree = await CategoryRepository.getCategoryTree(TEST_COMPANY_ID, false)
      const rootInTree = tree.find((t) => t.id === printingCat.id)
      assert.ok(rootInTree)
      assert.strictEqual(rootInTree.children?.length, 1)
      assert.strictEqual(rootInTree.children[0].id, flexSubCat.id)

      // 5. Deletion safety: Cannot delete category if it has subcategories
      await assert.rejects(
        async () => {
          await CategoryRepository.deleteCategory(printingCat.id, TEST_COMPANY_ID)
        },
        /Cannot delete category because it has subcategories/
      )

      // 6. Delete child first, then root succeeds
      const deletedChild = await CategoryRepository.deleteCategory(flexSubCat.id, TEST_COMPANY_ID)
      assert.strictEqual(deletedChild, true)
      const deletedRoot = await CategoryRepository.deleteCategory(printingCat.id, TEST_COMPANY_ID)
      assert.strictEqual(deletedRoot, true)
    })
  })

  // =========================================================================
  // TEST J: 3-WAY MINIMUM SEPARATION (MOQ vs Min Billable Qty vs Min Charge)
  // =========================================================================
  describe('TEST J: 3-Way Minimum Separation', () => {
    it('enforces min billable quantity for pricing while keeping actual physical consumption separate', () => {
      // Customer orders 2x3 ft = 6 sqft of sticker
      const minBillableQty = 10.0 // Minimum 10 sqft charged
      const sellingRate = 35.0

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: sellingRate,
        width: 2,
        height: 3,
        dimensionUnit: 'ft',
        minBillableQuantity: minBillableQty,
        quantity: 1,
      })

      assert.strictEqual(pricing.actualQuantity, 6.0)
      assert.strictEqual(pricing.billableQuantity, 10.0)
      assert.strictEqual(pricing.finalAmount, 350.0) // 10 * 35 = 350
    })

    it('enforces minimum charge monetary cutoff without modifying physical production dimensions', () => {
      // 1 small banner 2x2 ft = 4 sqft @ ৳25 = ৳100, but Minimum Charge is ৳300
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: 25.0,
        width: 2,
        height: 2,
        dimensionUnit: 'ft',
        minimumCharge: 300.0,
        quantity: 1,
      })

      assert.strictEqual(pricing.actualQuantity, 4.0)
      assert.strictEqual(pricing.billableQuantity, 4.0)
      assert.strictEqual(pricing.calculatedAmount, 100.0)
      assert.strictEqual(pricing.finalAmount, 300.0) // Elevated to min charge ৳300
      assert.strictEqual(pricing.isMinimumChargeApplied, true)
    })
  })
})
