import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PricingRepository } from '../../lib/repositories/pricing.repository.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { CustomerRepository } from '../../lib/repositories/customer.repository.ts'
import { PrintFlowDataStore } from '../../lib/db/data-store.ts'

describe('Quotation Line Items Customer Type Tier Resolution', () => {
  const companyId = `test-comp-quote-tier-${Date.now()}`

  beforeEach(() => {
    PrintFlowDataStore.clear()
  })

  it('1. Resolves Product price_tiers across Corporate, Reseller, Government, and Retail customer types in PricingRepository', async () => {
    const product = await ProductRepository.createProduct({
      company_id: companyId,
      name: 'Eco-Solvent Vinyl Banner',
      sku: 'PRD-VINYL-TIERS',
      unit: 'sft',
      selling_price: 30.0,
      base_cost: 15.0,
      category: 'digital_print',
      price_tiers: {
        retail: 30.0,
        corporate: 24.0,
        reseller: 20.0,
        government: 22.0,
      },
    })

    // Corporate
    const corpRes = await PricingRepository.resolvePrice(companyId, {
      productId: product.id,
      customerType: 'corporate',
    })
    assert.strictEqual(corpRes.effectiveUnitPrice, 24.0, 'Corporate price should be ৳24')
    assert.strictEqual(corpRes.source, 'customer_type')

    // Reseller
    const resellerRes = await PricingRepository.resolvePrice(companyId, {
      productId: product.id,
      customerType: 'reseller',
    })
    assert.strictEqual(resellerRes.effectiveUnitPrice, 20.0, 'Reseller price should be ৳20')
    assert.strictEqual(resellerRes.source, 'customer_type')

    // Government
    const govtRes = await PricingRepository.resolvePrice(companyId, {
      productId: product.id,
      customerType: 'government',
    })
    assert.strictEqual(govtRes.effectiveUnitPrice, 22.0, 'Government price should be ৳22')
    assert.strictEqual(govtRes.source, 'customer_type')

    // Retail
    const retailRes = await PricingRepository.resolvePrice(companyId, {
      productId: product.id,
      customerType: 'retail',
    })
    assert.strictEqual(retailRes.effectiveUnitPrice, 30.0, 'Retail price should be ৳30')
  })

  it('2. Resolves Product price_tiers in CustomerRepository.resolveCustomerRates for different customer types', async () => {
    const product = await ProductRepository.createProduct({
      company_id: companyId,
      name: 'Die-Cut Sticker Sheet',
      sku: 'PRD-STICKER-TIERS',
      unit: 'pcs',
      selling_price: 15.0,
      base_cost: 7.0,
      category: 'digital_print',
      price_tiers: {
        retail: 15.0,
        corporate: 12.0,
        dealer: 10.0,
        govt: 11.0,
      },
    })

    // Create Corporate Customer
    const corpCust = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'Grameenphone Corporate',
      mobile: '01711000001',
      customer_type: 'corporate',
    })

    const corpRates = await CustomerRepository.resolveCustomerRates(companyId, corpCust.id)
    const corpProductRate = corpRates.find((r) => r.productId === product.id)
    assert.ok(corpProductRate, 'Product rate should be resolved')
    assert.strictEqual(corpProductRate.effectiveRate, 12.0, 'Corporate customer should receive ৳12 tier rate')

    // Create Reseller Customer
    const resellerCust = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'Dhaka Print Press Reseller',
      mobile: '01711000002',
      customer_type: 'reseller',
    })

    const resellerRates = await CustomerRepository.resolveCustomerRates(companyId, resellerCust.id)
    const resellerProductRate = resellerRates.find((r) => r.productId === product.id)
    assert.ok(resellerProductRate, 'Product rate should be resolved')
    assert.strictEqual(resellerProductRate.effectiveRate, 10.0, 'Reseller customer should receive ৳10 dealer tier rate')

    // Create Government Customer
    const govtCust = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'Ministry of Education',
      mobile: '01711000003',
      customer_type: 'government',
    })

    const govtRates = await CustomerRepository.resolveCustomerRates(companyId, govtCust.id)
    const govtProductRate = govtRates.find((r) => r.productId === product.id)
    assert.ok(govtProductRate, 'Product rate should be resolved')
    assert.strictEqual(govtProductRate.effectiveRate, 11.0, 'Government customer should receive ৳11 govt tier rate')
  })

  it('3. Prioritizes Negotiated Contract Rate over Customer Type Tiers', async () => {
    const product = await ProductRepository.createProduct({
      company_id: companyId,
      name: 'Custom Acrylic Sign',
      sku: 'PRD-ACRYLIC',
      unit: 'sft',
      selling_price: 150.0,
      base_cost: 80.0,
      category: 'signage_3d',
      price_tiers: {
        retail: 150.0,
        corporate: 130.0,
      },
    })

    const corpCust = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'Apex Footwear Ltd',
      mobile: '01711000004',
      customer_type: 'corporate',
    })

    // Add dedicated customer negotiated rate (৳115)
    await CustomerRepository.upsertCustomerRate(
      companyId,
      corpCust.id,
      product.id,
      115.0
    )

    const rates = await CustomerRepository.resolveCustomerRates(companyId, corpCust.id)
    const productRate = rates.find((r) => r.productId === product.id)
    assert.ok(productRate, 'Product rate should be resolved')
    assert.strictEqual(productRate.effectiveRate, 115.0, 'Dedicated contract rate ৳115 should take precedence')
    assert.strictEqual(productRate.source, 'custom')
  })
})
