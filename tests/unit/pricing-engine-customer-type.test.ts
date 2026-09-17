import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PricingRepository } from '../../lib/repositories/pricing.repository.ts'
import { PricingService } from '../../services/pricing.service.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { CustomerRepository } from '../../lib/repositories/customer.repository.ts'
import {
  calculateMarginOrMarkupPrice,
  applyPriceRounding,
  resolveTierRate,
  calculatePricingRulePrice,
  isRuleCurrentlyEffective,
} from '../../lib/pricing/pricing-engine.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { PricingTierRange, PricingRuleRecord } from '../../types/pricing.types.ts'

describe('InkFlow ERP — Customer-Type-Based Pricing Engine Unit Tests', () => {
  const companyId = `comp-pricing-test-${Date.now()}`
  const companyIdB = `comp-pricing-other-${Date.now()}`

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMER_RATES, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICING_RULES, [])
  })

  // --------------------------------------------------------------------------
  // 1. Core Mathematical Utilities: Margin vs Markup & Rounding
  // --------------------------------------------------------------------------
  it('1.1 Accurately distinguishes between Target Margin and Markup', () => {
    const cost = 100

    // Margin: 50% margin means profit is 50% of selling price -> Selling price = ৳200
    const marginPrice = calculateMarginOrMarkupPrice(cost, 50, 'margin')
    assert.strictEqual(marginPrice, 200.0)

    // Markup: 50% markup means 50% added to cost -> Selling price = ৳150
    const markupPrice = calculateMarginOrMarkupPrice(cost, 50, 'markup')
    assert.strictEqual(markupPrice, 150.0)

    // Margin: 35% margin on ৳65 cost -> 65 / (1 - 0.35) = 100.0
    const margin35 = calculateMarginOrMarkupPrice(65, 35, 'margin')
    assert.strictEqual(margin35, 100.0)
  })

  it('1.2 Applies configured price rounding policies correctly', () => {
    const rawVal = 23.47

    assert.strictEqual(applyPriceRounding(rawVal, 'none'), 23.47)
    assert.strictEqual(applyPriceRounding(rawVal, 'round_1'), 23)
    assert.strictEqual(applyPriceRounding(rawVal, 'round_5'), 25)
    assert.strictEqual(applyPriceRounding(rawVal, 'round_10'), 20)
    assert.strictEqual(applyPriceRounding(rawVal, 'ceil_5'), 25)
    assert.strictEqual(applyPriceRounding(rawVal, 'floor_5'), 20)
  })

  it('1.3 Resolves tiered quantity rates dynamically', () => {
    const tiers: PricingTierRange[] = [
      { min_qty: 1, max_qty: 9, unit_price: 30 },
      { min_qty: 10, max_qty: 49, unit_price: 27 },
      { min_qty: 50, max_qty: 99, unit_price: 25 },
      { min_qty: 100, max_qty: null, unit_price: 23 },
    ]

    assert.strictEqual(resolveTierRate(5, tiers, 35).unitPrice, 30)
    assert.strictEqual(resolveTierRate(25, tiers, 35).unitPrice, 27)
    assert.strictEqual(resolveTierRate(75, tiers, 35).unitPrice, 25)
    assert.strictEqual(resolveTierRate(250, tiers, 35).unitPrice, 23)
    assert.strictEqual(resolveTierRate(5, [], 35).unitPrice, 35) // fallback
  })

  // --------------------------------------------------------------------------
  // 2. Full Customer-Type Matrix (Scenario from Prompt)
  // --------------------------------------------------------------------------
  it('2.1 Resolves independent rates across all 6 Customer Types for UV Vinyl Print', async () => {
    // Base Product: UV Vinyl Print @ ৳25/sft
    const product = await ProductRepository.createProduct({
      company_id: companyId,
      name: 'UV Vinyl Print Glossy',
      sku: 'PRD-UV-VINYL',
      unit: 'sft',
      selling_price: 25.0,
      base_cost: 14.0,
      category: 'large_format_print',
    })

    // Configure pricing rules for all 6 customer types:
    // Retail: ৳25 (0%)
    await PricingRepository.createPricingRule(companyId, {
      product_id: product.id,
      customer_type: 'retail',
      pricing_rule_type: 'fixed_price',
      fixed_price: 25.0,
    })

    // Reseller: -16% -> ৳21.00
    await PricingRepository.createPricingRule(companyId, {
      product_id: product.id,
      customer_type: 'reseller',
      pricing_rule_type: 'percentage_adjustment',
      adjustment_type: 'percentage',
      adjustment_value: -16,
    })

    // Corporate: -8% -> ৳23.00
    await PricingRepository.createPricingRule(companyId, {
      product_id: product.id,
      customer_type: 'corporate',
      pricing_rule_type: 'percentage_adjustment',
      adjustment_type: 'percentage',
      adjustment_value: -8,
    })

    // Agency: -12% -> ৳22.00
    await PricingRepository.createPricingRule(companyId, {
      product_id: product.id,
      customer_type: 'agency',
      pricing_rule_type: 'percentage_adjustment',
      adjustment_type: 'percentage',
      adjustment_value: -12,
    })

    // Government: -4% -> ৳24.00
    await PricingRepository.createPricingRule(companyId, {
      product_id: product.id,
      customer_type: 'government',
      pricing_rule_type: 'percentage_adjustment',
      adjustment_type: 'percentage',
      adjustment_value: -4,
    })

    // Regular: -4% -> ৳24.00
    await PricingRepository.createPricingRule(companyId, {
      product_id: product.id,
      customer_type: 'regular',
      pricing_rule_type: 'percentage_adjustment',
      adjustment_type: 'percentage',
      adjustment_value: -4,
    })

    // Verify Product Master default remains unchanged at ৳25
    const reloadedProduct = await ProductRepository.getProductById(product.id, companyId)
    assert.strictEqual(reloadedProduct?.selling_price, 25.0)

    // Resolve for each customer type
    const retailRes = await PricingRepository.resolvePrice(companyId, { productId: product.id, customerType: 'retail' })
    const resellerRes = await PricingRepository.resolvePrice(companyId, { productId: product.id, customerType: 'reseller' })
    const corporateRes = await PricingRepository.resolvePrice(companyId, { productId: product.id, customerType: 'corporate' })
    const agencyRes = await PricingRepository.resolvePrice(companyId, { productId: product.id, customerType: 'agency' })
    const govRes = await PricingRepository.resolvePrice(companyId, { productId: product.id, customerType: 'government' })
    const regularRes = await PricingRepository.resolvePrice(companyId, { productId: product.id, customerType: 'regular' })

    assert.strictEqual(retailRes.effectiveUnitPrice, 25.0)
    assert.strictEqual(resellerRes.effectiveUnitPrice, 21.0)
    assert.strictEqual(corporateRes.effectiveUnitPrice, 23.0)
    assert.strictEqual(agencyRes.effectiveUnitPrice, 22.0)
    assert.strictEqual(govRes.effectiveUnitPrice, 24.0)
    assert.strictEqual(regularRes.effectiveUnitPrice, 24.0)

    assert.strictEqual(agencyRes.source, 'customer_type')
    assert.ok(agencyRes.sourceLabel.includes('Agency'))
  })

  it('2.2 Simulates Agency customer quotation calculation (3ft x 10ft = 30 SFT @ ৳22 = ৳660)', async () => {
    const product = await ProductRepository.createProduct({
      company_id: companyId,
      name: 'UV Vinyl Print',
      sku: 'UV-VIN-01',
      unit: 'sft',
      selling_price: 25.0,
      base_cost: 14.0,
    })

    await PricingRepository.createPricingRule(companyId, {
      product_id: product.id,
      customer_type: 'agency',
      pricing_rule_type: 'fixed_price',
      fixed_price: 22.0,
    })

    const agencyCustomer = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'ABC Advertising Agency',
      mobile: '+8801700112233',
      customer_type: 'agency',
    })

    // Resolve rate for this customer
    const resolved = await PricingRepository.resolvePrice(companyId, {
      productId: product.id,
      customerId: agencyCustomer.id,
      customerType: agencyCustomer.customer_type,
      width: 3,
      height: 10,
      dimensionUnit: 'ft',
      quantity: 1,
    })

    const areaSft = 3 * 10
    const totalAmount = areaSft * resolved.effectiveUnitPrice

    assert.strictEqual(resolved.effectiveUnitPrice, 22.0)
    assert.strictEqual(totalAmount, 660.0)
    assert.strictEqual(resolved.source, 'customer_type')
  })

  // --------------------------------------------------------------------------
  // 3. Hierarchy & Overrides: Customer-Specific vs Customer-Type vs Default
  // --------------------------------------------------------------------------
  it('3.1 Customer-Specific Rate takes top priority over Customer-Type rule', async () => {
    const product = await ProductRepository.createProduct({
      company_id: companyId,
      name: 'Backlit Film Print',
      sku: 'BLF-01',
      unit: 'sft',
      selling_price: 40.0,
    })

    // Customer-Type agency rule: ৳35
    await PricingRepository.createPricingRule(companyId, {
      product_id: product.id,
      customer_type: 'agency',
      pricing_rule_type: 'fixed_price',
      fixed_price: 35.0,
    })

    const customer = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'Apex Design Ltd',
      mobile: '+8801999887766',
      customer_type: 'agency',
    })

    // Customer-specific contract rate: ৳32.00
    await CustomerRepository.upsertCustomerRate(
      companyId,
      customer.id,
      product.id,
      32.0,
      'Annual Special Contract'
    )

    const resolved = await PricingRepository.resolvePrice(companyId, {
      productId: product.id,
      customerId: customer.id,
      customerType: 'agency',
    })

    assert.strictEqual(resolved.effectiveUnitPrice, 32.0)
    assert.strictEqual(resolved.source, 'customer_specific')
    assert.ok(resolved.sourceDetails.includes('Annual Special Contract'))
  })

  it('3.2 Falls back to Product Master default price if no customer rule exists', async () => {
    const product = await ProductRepository.createProduct({
      company_id: companyId,
      name: 'Foam Board 5mm',
      sku: 'FBD-5MM',
      unit: 'piece',
      selling_price: 450.0,
    })

    const resolved = await PricingRepository.resolvePrice(companyId, {
      productId: product.id,
      customerType: 'government',
    })

    assert.strictEqual(resolved.effectiveUnitPrice, 450.0)
    assert.strictEqual(resolved.source, 'product_default')
  })

  // --------------------------------------------------------------------------
  // 4. Commercial Minimums & Date Filtering
  // --------------------------------------------------------------------------
  it('4.1 Enforces Minimum Billable Quantity and Minimum Charge properly', async () => {
    const product = await ProductRepository.createProduct({
      company_id: companyId,
      name: 'Custom Sticker Die-Cut',
      sku: 'STK-DIE',
      unit: 'sft',
      selling_price: 35.0,
    })

    await PricingRepository.createPricingRule(companyId, {
      product_id: product.id,
      customer_type: 'retail',
      pricing_rule_type: 'fixed_price',
      fixed_price: 35.0,
      minimum_billable_quantity: 10.0, // Min 10 sft
      minimum_charge: 250.0, // Min ৳250
    })

    const resolved = await PricingRepository.resolvePrice(companyId, {
      productId: product.id,
      customerType: 'retail',
      quantity: 6, // customer requests 6 sft
    })

    assert.strictEqual(resolved.minimumBillableQuantity, 10.0)
    assert.strictEqual(resolved.minimumCharge, 250.0)

    // Billed quantity is max(6, 10) = 10 -> 10 * 35 = 350 (which exceeds 250 min charge)
    const billableQty = Math.max(6, resolved.minimumBillableQuantity)
    const calculatedAmount = billableQty * resolved.effectiveUnitPrice
    const finalCharge = Math.max(calculatedAmount, resolved.minimumCharge)

    assert.strictEqual(billableQty, 10.0)
    assert.strictEqual(finalCharge, 350.0)
  })

  it('4.2 Honors Effective Date ranges (ignores expired / future scheduled rules)', async () => {
    const product = await ProductRepository.createProduct({
      company_id: companyId,
      name: 'Reflective Road Sign Sheet',
      sku: 'RFL-SGN',
      unit: 'sft',
      selling_price: 80.0,
    })

    // Expired Rule: was ৳60 until yesterday
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    await PricingRepository.createPricingRule(companyId, {
      product_id: product.id,
      customer_type: 'government',
      pricing_rule_type: 'fixed_price',
      fixed_price: 60.0,
      effective_from: lastWeek,
      effective_until: yesterday,
    })

    // Resolving today should ignore the expired rule and fall back to product default ৳80
    const resolved = await PricingRepository.resolvePrice(companyId, {
      productId: product.id,
      customerType: 'government',
    })

    assert.strictEqual(resolved.effectiveUnitPrice, 80.0)
    assert.strictEqual(resolved.source, 'product_default')
  })

  // --------------------------------------------------------------------------
  // 5. Bulk Pricing & Copy Pricing Operations
  // --------------------------------------------------------------------------
  it('5.1 Applies Bulk Pricing across multiple selected products for Reseller', async () => {
    const p1 = await ProductRepository.createProduct({ company_id: companyId, name: 'PVC Banner', sku: 'P1', selling_price: 20.0, unit: 'sft' })
    const p2 = await ProductRepository.createProduct({ company_id: companyId, name: 'Inkjet Paper', sku: 'P2', selling_price: 30.0, unit: 'sft' })
    const p3 = await ProductRepository.createProduct({ company_id: companyId, name: 'Clear Vinyl', sku: 'P3', selling_price: 40.0, unit: 'sft' })

    const result = await PricingRepository.bulkCreateOrUpdateRules(companyId, {
      customer_type: 'reseller',
      product_ids: [p1.id, p2.id, p3.id],
      adjustment_type: 'percentage',
      adjustment_value: -10, // 10% discount
      override_existing: true,
    })

    assert.strictEqual(result.createdCount, 3)

    const r1 = await PricingRepository.resolvePrice(companyId, { productId: p1.id, customerType: 'reseller' })
    const r2 = await PricingRepository.resolvePrice(companyId, { productId: p2.id, customerType: 'reseller' })
    const r3 = await PricingRepository.resolvePrice(companyId, { productId: p3.id, customerType: 'reseller' })

    assert.strictEqual(r1.effectiveUnitPrice, 18.0) // 20 - 10%
    assert.strictEqual(r2.effectiveUnitPrice, 27.0) // 30 - 10%
    assert.strictEqual(r3.effectiveUnitPrice, 36.0) // 40 - 10%
  })

  it('5.2 Copies pricing from Retail to Regular with a -5% modifier', async () => {
    const p1 = await ProductRepository.createProduct({ company_id: companyId, name: 'Acrylic 3mm', sku: 'ACR-3', selling_price: 100.0, unit: 'sft' })

    await PricingRepository.createPricingRule(companyId, {
      product_id: p1.id,
      customer_type: 'retail',
      pricing_rule_type: 'fixed_price',
      fixed_price: 100.0,
    })

    const copyResult = await PricingRepository.copyPricingBetweenCustomerTypes(companyId, {
      source_customer_type: 'retail',
      target_customer_type: 'regular',
      adjustment_percent: -5,
      override_existing: true,
    })

    assert.strictEqual(copyResult.copiedCount, 1)

    const regularRes = await PricingRepository.resolvePrice(companyId, { productId: p1.id, customerType: 'regular' })
    assert.strictEqual(regularRes.effectiveUnitPrice, 95.0) // 100 - 5% = 95
  })

  // --------------------------------------------------------------------------
  // 6. Multi-Customer Matrix & Tenant Isolation
  // --------------------------------------------------------------------------
  it('6.1 Generates Pricing Matrix comparing all 6 customer types side-by-side', async () => {
    const product = await ProductRepository.createProduct({
      company_id: companyId,
      name: 'Roll-up Standee Media',
      sku: 'RUS-01',
      unit: 'sft',
      selling_price: 50.0,
      base_cost: 30.0,
    })

    await PricingRepository.createPricingRule(companyId, {
      product_id: product.id,
      customer_type: 'reseller',
      pricing_rule_type: 'fixed_price',
      fixed_price: 42.0,
    })

    const matrix = await PricingRepository.getPricingMatrix(companyId)
    const row = matrix.find((r) => r.productId === product.id)

    assert.ok(row)
    assert.strictEqual(row.defaultSellingPrice, 50.0)
    assert.strictEqual(row.prices.retail.price, 50.0)
    assert.strictEqual(row.prices.reseller.price, 42.0)
    assert.strictEqual(row.prices.reseller.hasCustomRule, true)
    assert.strictEqual(row.prices.corporate.price, 50.0)
    assert.strictEqual(row.prices.corporate.hasCustomRule, false)
  })

  it('6.2 Enforces strict tenant isolation (Company A rules not accessible by Company B)', async () => {
    const productA = await ProductRepository.createProduct({
      company_id: companyId,
      name: 'Fabric Flag Print',
      sku: 'FLG-01',
      unit: 'sft',
      selling_price: 60.0,
    })

    // Company A creates VIP Agency price: ৳45
    await PricingRepository.createPricingRule(companyId, {
      product_id: productA.id,
      customer_type: 'agency',
      pricing_rule_type: 'fixed_price',
      fixed_price: 45.0,
    })

    // Company B creates same product SKU
    const productB = await ProductRepository.createProduct({
      company_id: companyIdB,
      name: 'Fabric Flag Print',
      sku: 'FLG-01',
      unit: 'sft',
      selling_price: 60.0,
    })

    // Company B should NOT see Company A's ৳45 agency price
    const rulesB = await PricingRepository.getPricingRules(companyIdB)
    assert.strictEqual(rulesB.length, 0)

    const resolvedB = await PricingRepository.resolvePrice(companyIdB, {
      productId: productB.id,
      customerType: 'agency',
    })

    assert.strictEqual(resolvedB.effectiveUnitPrice, 60.0)
    assert.strictEqual(resolvedB.source, 'product_default')
  })
})
