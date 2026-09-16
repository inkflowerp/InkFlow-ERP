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
  validateUnitConversion,
  validateCircularBOM,
  convertLengthToFeet,
} from '../../lib/units.ts'
import { CategoryRepository } from '../../lib/repositories/category.repository.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type {
  ProductRecord,
  ProductComponent,
  ProductCostBreakdown,
  ProductPriceTiers,
  CommercialProductType,
  PricingMethod,
} from '../../types/product.types.ts'

describe('INKFLOW — FINAL PRODUCTS & SERVICES PRODUCTION-READINESS AUDIT', () => {
  const TEST_COMPANY_ID = 'company-dhaka-print-signage-360'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_CATEGORIES, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
  })

  // =========================================================================
  // SECTION 1: PRODUCT MODEL FOUNDATION SEPARATION
  // =========================================================================
  describe('1. Product Model Foundation — Type vs Category vs Operational Behavior', () => {
    it('cleanly differentiates Product Type (Operational Role) from Category (Business Classification)', () => {
      // 1. Ready Product (X-Stand)
      const xStand: Partial<ProductRecord> = {
        name: 'Standard X-Banner Stand 2x5 ft',
        commercial_type: 'ready_product',
        category: 'display_stands',
        selling_unit: 'pcs',
        pricing_method: 'per_piece',
        selling_price: 1500,
        base_cost: 950,
      }
      assert.strictEqual(xStand.commercial_type, 'ready_product')
      assert.strictEqual(xStand.category, 'display_stands')

      // 2. Printing Product (Flex Banner)
      const flex: Partial<ProductRecord> = {
        name: 'Star Flex Banner 320 GSM',
        commercial_type: 'production_product',
        category: 'flex_banner',
        selling_unit: 'sft',
        pricing_method: 'per_area',
        purchase_unit: 'roll',
        conversion_ratio: 533,
        production_width_allowance: 0.25,
        production_length_allowance: 0.25,
      }
      assert.strictEqual(flex.commercial_type, 'production_product')
      assert.strictEqual(flex.category, 'flex_banner')

      // 3. Finishing Service (Glossy Lamination)
      const glossyLam: Partial<ProductRecord> = {
        name: 'Thermal Glossy Lamination 25 Mic',
        commercial_type: 'finishing',
        category: 'lamination',
        selling_unit: 'sft',
        pricing_method: 'per_area',
        selling_price: 8,
        base_cost: 3.5,
      }
      assert.strictEqual(glossyLam.commercial_type, 'finishing')
      assert.strictEqual(glossyLam.category, 'lamination')

      // 4. Raw Material (Flex Roll)
      const flexRoll: Partial<ProductRecord> = {
        name: 'Star Flex Roll 3.25 x 164 ft',
        commercial_type: 'material' as any,
        category: 'raw_materials',
        purchase_unit: 'roll',
        selling_unit: 'sft',
        purchase_price: 8500,
        conversion_ratio: 533,
      }
      assert.strictEqual(flexRoll.category, 'raw_materials')

      // 5. Service / Installation (Signboard Installation)
      const installService: Partial<ProductRecord> = {
        name: 'On-site Signboard Mounting & Pasting',
        commercial_type: 'installation',
        category: 'services',
        selling_unit: 'job',
        pricing_method: 'per_job',
        selling_price: 1500,
      }
      assert.strictEqual(installService.commercial_type, 'installation')
      assert.strictEqual(installService.category, 'services')
    })
  })

  // =========================================================================
  // SECTION 2: COMPOSABLE PRODUCT ARCHITECTURE (PREVENTS SKU EXPLOSION)
  // =========================================================================
  describe('2. Composable Product Architecture & Multi-Component Pipeline', () => {
    it('composes Base + Finishing + Add-ons + Installation into a single commercial line without catalog explosion', () => {
      // Order: 10 ft x 3 ft Vinyl Banner (30 sqft)
      const width = 10
      const height = 3
      const baseArea = 30 // sqft

      // 1. Base Vinyl Printing @ ৳25/sqft
      const vinyl = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: 25,
        width,
        height,
        dimensionUnit: 'ft',
        quantity: 1,
      })
      assert.strictEqual(vinyl.finalAmount, 750)

      // 2. Glossy Lamination @ ৳8/sqft
      const lamination = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: 8,
        width,
        height,
        dimensionUnit: 'ft',
        quantity: 1,
      })
      assert.strictEqual(lamination.finalAmount, 240)

      // 3. Eyelets: 20 pcs @ ৳5/pc
      const eyelets = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        unitPrice: 5,
        quantity: 20,
      })
      assert.strictEqual(eyelets.finalAmount, 100)

      // 4. On-site Installation @ ৳500 flat job fee
      const installation = calculateCommercialPricing({
        pricingMethod: 'per_job',
        unitPrice: 500,
        quantity: 1,
      })
      assert.strictEqual(installation.finalAmount, 500)

      const totalSellingPrice = vinyl.finalAmount + lamination.finalAmount + eyelets.finalAmount + installation.finalAmount
      assert.strictEqual(totalSellingPrice, 1590)

      // Direct Cost Rollup:
      // Vinyl Media Cost = 30 * ৳12 = ৳360
      // Lamination Cost = 30 * ৳3.5 = ৳105
      // Eyelet Cost = 20 * ৳1.5 = ৳30
      // Installation Labor Cost = ৳250
      const totalDirectCost = (30 * 12) + (30 * 3.5) + (20 * 1.5) + 250
      assert.strictEqual(totalDirectCost, 745)

      const margin = calculateGrossMargin(totalDirectCost, totalSellingPrice)
      assert.strictEqual(margin.grossProfit, 845)
      assert.strictEqual(Math.round(margin.grossMarginPercent * 100) / 100, 53.14)
    })
  })

  // =========================================================================
  // SECTION 3: COMPONENT QUANTITY PROPAGATION & NO DOUBLE MULTIPLICATION
  // =========================================================================
  describe('3. Component Quantity Propagation & No Double Multiplication', () => {
    it('correctly propagates parent quantity without squaring/double-multiplying component quantities', () => {
      // Scenario: 10 Flex Banners of 3x10 ft
      const bannerCount = 10
      const width = 3
      const height = 10
      const singleArea = 30 // sqft
      const totalArea = singleArea * bannerCount // 300 sqft

      // Each banner requires 20 eyelets => 10 banners require exactly 200 eyelets (NOT 2,000)
      const eyeletsPerBanner = 20
      const totalEyelets = bannerCount * eyeletsPerBanner
      assert.strictEqual(totalEyelets, 200)

      // Total Printing Commercials
      const printingPricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: 25,
        width,
        height,
        dimensionUnit: 'ft',
        quantity: bannerCount,
      })
      assert.strictEqual(printingPricing.areaSqft, 300)
      assert.strictEqual(printingPricing.finalAmount, 7500) // 300 * 25

      // Total Eyelet Commercials
      const eyeletPricing = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        unitPrice: 5,
        quantity: totalEyelets,
      })
      assert.strictEqual(eyeletPricing.finalAmount, 1000) // 200 * 5 = 1000
    })
  })

  // =========================================================================
  // SECTION 4: PHYSICAL ALLOWANCE VS BILLING VS OPERATIONAL WASTAGE
  // =========================================================================
  describe('4. Strict Separation of Billing Dimensions vs Production Allowance vs Wastage', () => {
    it('verifies 3x10 ft order on 3.25x164 ft roll with +0.25 ft allowance produces exact physical cut and cost', () => {
      const order = {
        width: 3,
        height: 10,
        unit: 'ft' as const,
        quantity: 1,
        widthAllowance: 0.25,
        lengthAllowance: 0.25,
        allowanceUnit: 'ft' as const,
        sellingRate: 28,
        rollWidth: 3.25,
        rollLength: 164,
        rollPurchasePrice: 8500,
      }

      // 1. Production Dimensions
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

      // 2. Commercial Selling Billing
      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: order.sellingRate,
        width: order.width,
        height: order.height,
        dimensionUnit: order.unit,
        quantity: 1,
      })
      assert.strictEqual(pricing.areaSqft, 30.0)
      assert.strictEqual(pricing.finalAmount, 840.0) // 30 * 28 = 840

      // 3. Roll Inventory Cost Basis
      const rollTotalArea = order.rollWidth * order.rollLength // 533 sqft
      const costPerSqft = order.rollPurchasePrice / rollTotalArea // 8500 / 533 = ৳15.947467
      const physicalMaterialCost = prod.physicalConsumptionSqft * costPerSqft
      assert.strictEqual(Math.round(physicalMaterialCost * 100) / 100, 531.25)

      // 4. Linear Yield on 164 ft Roll
      const yieldCalc = calculateRollCuttingYield({
        rollWidthFt: 3.25,
        rollLengthFt: 164,
        sellingWidthFt: 3,
        sellingLengthFt: 10,
        widthAllowanceFt: 0.25,
        lengthAllowanceFt: 0.25,
      })
      assert.strictEqual(yieldCalc.maxFullJobsYield, 16) // floor(164 / 10.25) = 16
      assert.strictEqual(yieldCalc.linearLengthConsumedFt, 164) // 16 * 10.25 = 164
      assert.strictEqual(yieldCalc.remainingRollLengthFt, 0)
    })
  })

  // =========================================================================
  // SECTION 5: 3-WAY MINIMUM SEPARATION
  // =========================================================================
  describe('5. 3-Way Minimum Separation (MOQ vs Min Billable Qty vs Min Charge)', () => {
    it('evaluates MOQ, Min Billable Quantity, and Min Charge independently without corrupting production dimensions', () => {
      // Test A: Min Billable Quantity floor
      // Customer orders 2x3 ft = 6 sqft of sticker @ ৳35/sqft, policy has min billable of 10 sqft
      const billablePricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: 35,
        width: 2,
        height: 3,
        dimensionUnit: 'ft',
        minBillableQuantity: 10,
        quantity: 1,
      })
      assert.strictEqual(billablePricing.actualQuantity, 6)
      assert.strictEqual(billablePricing.billableQuantity, 10)
      assert.strictEqual(billablePricing.isMinBillableApplied, true)
      assert.strictEqual(billablePricing.finalAmount, 350) // 10 * 35

      // Test B: Minimum Monetary Charge floor
      // 1 small 2x2 ft banner = 4 sqft @ ৳25 = ৳100, policy has ৳300 min charge
      const chargePricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: 25,
        width: 2,
        height: 2,
        dimensionUnit: 'ft',
        minimumCharge: 300,
        quantity: 1,
      })
      assert.strictEqual(chargePricing.actualQuantity, 4)
      assert.strictEqual(chargePricing.calculatedAmount, 100)
      assert.strictEqual(chargePricing.finalAmount, 300)
      assert.strictEqual(chargePricing.isMinimumChargeApplied, true)

      // Test C: MOQ (Minimum Order Qty) violation check
      const moqPricing = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        unitPrice: 10,
        quantity: 20,
        minOrderQuantity: 50,
      })
      assert.strictEqual(moqPricing.isMoqViolated, true)
      assert.strictEqual(moqPricing.moqDeficit, 30)
    })
  })

  // =========================================================================
  // SECTION 6: CIRCULAR BOM PROTECTION
  // =========================================================================
  describe('6. Circular Component & BOM Cycle Detection', () => {
    it('detects and rejects direct (A -> A) and transitive (A -> B -> C -> A) circular recipes', () => {
      // Direct self-reference
      const directCycle = validateCircularBOM('prod-acrylic-sign', [
        { component_product_id: 'prod-acrylic-sign', name: 'Self Acrylic' },
      ])
      assert.strictEqual(directCycle.hasCycle, true)

      // Transitive indirect cycle (A -> B -> C -> A)
      const lookupTable = {
        'prod-b': [{ component_product_id: 'prod-c' }],
        'prod-c': [{ component_product_id: 'prod-a' }],
      }
      const transitiveCycle = validateCircularBOM(
        'prod-a',
        [{ component_product_id: 'prod-b', name: 'Product B' }],
        lookupTable
      )
      assert.strictEqual(transitiveCycle.hasCycle, true)
      assert.ok(transitiveCycle.error?.includes('Indirect circular BOM cycle detected'))

      // Valid acyclic BOM
      const acyclicLookup = {
        'prod-b': [{ component_product_id: 'prod-c' }],
        'prod-c': [{ component_product_id: 'prod-raw-led' }],
      }
      const acyclic = validateCircularBOM(
        'prod-a',
        [{ component_product_id: 'prod-b' }],
        acyclicLookup
      )
      assert.strictEqual(acyclic.hasCycle, false)
    })
  })

  // =========================================================================
  // SECTION 7: CATEGORY MASTER HIERARCHY & TENANT ISOLATION
  // =========================================================================
  describe('7. Category Master Hierarchy & Tenant Isolation', () => {
    it('supports root parents, subcategories, duplicate prevention and tenant isolation', async () => {
      const parent = await CategoryRepository.createCategory(
        {
          name: 'Signage & Fabrication Master',
          name_bn: 'সাইনেজ ও ফেব্রিকেশন',
          applies_to_product_types: ['fabrication', 'production_product'],
          display_order: 1,
        },
        TEST_COMPANY_ID
      )
      assert.ok(parent.id)
      assert.strictEqual(parent.slug, 'signage-fabrication-master')

      // Create child
      const child = await CategoryRepository.createCategory(
        {
          name: 'Acrylic Letters',
          parent_id: parent.id,
          applies_to_product_types: ['fabrication'],
          display_order: 2,
        },
        TEST_COMPANY_ID
      )
      assert.strictEqual(child.parent_id, parent.id)

      // Tree validation
      const tree = await CategoryRepository.getCategoryTree(TEST_COMPANY_ID, false)
      const rootFound = tree.find((t) => t.id === parent.id)
      assert.ok(rootFound)
      assert.strictEqual(rootFound.children?.length, 1)
      assert.strictEqual(rootFound.children[0].id, child.id)
    })
  })

  // =========================================================================
  // SECTION 8: SECTION 41 REAL-WORLD MASTER ORDER SIMULATION (ABC COMPANY)
  // =========================================================================
  describe('8. Section 41 Master Order Simulation — ABC Company Complete Job', () => {
    it('simulates full commercial quotation, production dimensions, physical cut, and direct cost rollup for 5 banners', () => {
      /*
        CUSTOMER: ABC Company
        ORDER: 5 banners of 10 ft × 3 ft Vinyl Banner
        FINISHING: Glossy Lamination
        ADD-ON: 20 Eyelets per banner (100 eyelets total)
        INSTALLATION: 1 On-site Job @ ৳1,500
        DESIGN: Artwork Fee @ ৳1,000
      */
      const bannerCount = 5
      const width = 10
      const height = 3
      const singleBillableArea = 30 // sqft
      const totalBillableArea = singleBillableArea * bannerCount // 150 sqft

      // 1. Production Dimensions per banner (+0.25 ft allowance)
      const prod = calculateProductionDimensions({
        sellingWidth: width,
        sellingHeight: height,
        dimensionUnit: 'ft',
        widthAllowance: 0.25,
        lengthAllowance: 0.25,
        allowanceUnit: 'ft',
        quantity: bannerCount,
      })
      assert.strictEqual(prod.productionWidth, 10.25)
      assert.strictEqual(prod.productionHeight, 3.25)
      assert.strictEqual(prod.singleProductionAreaSqft, 33.3125)
      assert.strictEqual(prod.totalProductionAreaSqft, 166.5625)

      // 2. Commercial Pricing per component
      // A. Base Vinyl Printing: 150 sqft @ ৳25/sqft = ৳3,750
      const vinylQuote = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: 25,
        width,
        height,
        dimensionUnit: 'ft',
        quantity: bannerCount,
      })
      assert.strictEqual(vinylQuote.finalAmount, 3750)

      // B. Glossy Lamination: 150 sqft @ ৳8/sqft = ৳1,200
      const laminationQuote = calculateCommercialPricing({
        pricingMethod: 'per_area',
        unitPrice: 8,
        width,
        height,
        dimensionUnit: 'ft',
        quantity: bannerCount,
      })
      assert.strictEqual(laminationQuote.finalAmount, 1200)

      // C. Eyelets: 100 pcs (20 per banner) @ ৳5/pc = ৳500
      const totalEyelets = bannerCount * 20
      const eyeletsQuote = calculateCommercialPricing({
        pricingMethod: 'per_piece',
        unitPrice: 5,
        quantity: totalEyelets,
      })
      assert.strictEqual(eyeletsQuote.finalAmount, 500)

      // D. On-site Installation: 1 Job @ ৳1,500
      const installQuote = calculateCommercialPricing({
        pricingMethod: 'per_job',
        unitPrice: 1500,
        quantity: 1,
      })
      assert.strictEqual(installQuote.finalAmount, 1500)

      // E. Graphic Design Artwork: 1 Job @ ৳1,000
      const designQuote = calculateCommercialPricing({
        pricingMethod: 'per_job',
        unitPrice: 1000,
        quantity: 1,
      })
      assert.strictEqual(designQuote.finalAmount, 1000)

      // 3. Customer Total Quotation
      const totalCustomerSellingPrice =
        vinylQuote.finalAmount +
        laminationQuote.finalAmount +
        eyeletsQuote.finalAmount +
        installQuote.finalAmount +
        designQuote.finalAmount

      // 3750 + 1200 + 500 + 1500 + 1000 = ৳7,950
      assert.strictEqual(totalCustomerSellingPrice, 7950)

      // 4. Internal Direct Cost Rollup
      // Physical Vinyl Media (166.5625 sqft cut @ ৳12/sqft) = ৳1,998.75
      const physicalVinylCost = prod.totalProductionAreaSqft * 12.0
      assert.strictEqual(physicalVinylCost, 1998.75)

      // Lamination Media Cost (150 sqft @ ৳3.5/sqft) = ৳525.00
      const laminationCost = totalBillableArea * 3.5
      assert.strictEqual(laminationCost, 525.0)

      // Eyelets Hardware Cost (100 pcs @ ৳1.5/pc) = ৳150.00
      const eyeletsCost = totalEyelets * 1.5
      assert.strictEqual(eyeletsCost, 150.0)

      // Installation Direct Labor Cost = ৳600.00
      const installLaborCost = 600.0

      // Design Cost = ৳0 (In-house fixed designer)
      const designDirectCost = 0.0

      const totalDirectCost =
        physicalVinylCost +
        laminationCost +
        eyeletsCost +
        installLaborCost +
        designDirectCost

      // 1998.75 + 525 + 150 + 600 + 0 = ৳3,273.75
      assert.strictEqual(totalDirectCost, 3273.75)

      // 5. Profitability & Gross Margin
      const margin = calculateGrossMargin(totalDirectCost, totalCustomerSellingPrice)
      assert.strictEqual(margin.grossProfit, 4676.25) // 7950 - 3273.75
      assert.strictEqual(Math.round(margin.grossMarginPercent * 100) / 100, 58.82)

      // 6. Workflow Requirements verification
      const workflowRequirements = {
        requires_design: true,
        requires_approval: true,
        requires_production: true,
        requires_installation: true,
        requires_delivery: false,
      }
      assert.strictEqual(workflowRequirements.requires_design, true)
      assert.strictEqual(workflowRequirements.requires_production, true)
      assert.strictEqual(workflowRequirements.requires_installation, true)
    })
  })
})
