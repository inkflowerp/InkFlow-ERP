import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ProductService } from '../../services/product.service.ts'
import { CustomerRepository } from '../../lib/repositories/customer.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Unit: 5-Tier Deterministic Customer Pricing Hierarchy', () => {
  const companyId = `comp-pricing-hier-${Date.now()}`

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMER_RATES, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_LISTS, [])
  })

  it('1. Resolves standard catalog selling rate when no customer is passed (Default Tier 4)', async () => {
    const product = await ProductService.createProduct({
      company_id: companyId,
      name: 'Star Flex Banner 280 GSM',
      sku: 'FLX-280',
      unit: 'sft',
      selling_price: 18.0,
      base_cost: 11.5,
      min_price: 15.0,
    })

    const resolved = await ProductService.resolveCustomerProductPrice(product.id, undefined, companyId)

    assert.strictEqual(resolved.effectiveRate, 18.0)
    assert.strictEqual(resolved.source, 'default')
    assert.strictEqual(resolved.sourceLabel, 'Standard Catalog Rate')
  })

  it('2. Resolves Tier 1: Customer-specific dedicated rate from customer_rates', async () => {
    const product = await ProductService.createProduct({
      company_id: companyId,
      name: 'Star Flex Banner 280 GSM',
      sku: 'FLX-280-VIP',
      unit: 'sft',
      selling_price: 18.0,
      min_price: 14.0,
    })

    const customer = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'Mega Brands Ltd',
      mobile: '+8801811223344',
      customer_type: 'corporate',
    })

    // Set dedicated contract rate of ৳15.50
    await CustomerRepository.upsertCustomerRate(
      companyId,
      customer.id,
      product.id,
      15.5,
      'Annual billboard media contract'
    )

    const resolved = await ProductService.resolveCustomerProductPrice(product.id, customer.id, companyId)

    assert.strictEqual(resolved.effectiveRate, 15.5)
    assert.strictEqual(resolved.source, 'custom')
    assert.strictEqual(resolved.sourceLabel, 'Customer Specific Rate')
    assert.ok(resolved.sourceDetails?.includes('Annual billboard media contract'))
  })

  it('3. Resolves Tier 3: Category default price list markup for wholesale agency', async () => {
    const product = await ProductService.createProduct({
      company_id: companyId,
      name: 'Vinyl Sticker Gloss',
      sku: 'VIN-GLOSS',
      unit: 'sft',
      selling_price: 30.0,
    })

    // Create an Agency Price list with -20% markup
    await ProductService.createPriceList({
      company_id: companyId,
      name: 'Agency Partner Rates',
      code: 'AGENCY',
      tier_type: 'agency',
      default_markup_percent: -20, // 20% discount off standard rate
    })

    const agencyCustomer = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'Creative Ad Agency',
      mobile: '+8801911223344',
      customer_type: 'agency',
    })

    const resolved = await ProductService.resolveCustomerProductPrice(product.id, agencyCustomer.id, companyId)

    // ৳30 - 20% = ৳24
    assert.strictEqual(resolved.effectiveRate, 24.0)
    assert.strictEqual(resolved.source, 'customer_tier')
    assert.ok(resolved.sourceLabel.includes('Agency Partner Rates'))
    assert.strictEqual(resolved.priceListCode, 'AGENCY')
  })

  it('4. Prioritizes Tier 1 (Custom Rate) over Tier 3 (Price List Markup)', async () => {
    const product = await ProductService.createProduct({
      company_id: companyId,
      name: 'Panaflex 440 GSM',
      sku: 'PANA-440',
      unit: 'sft',
      selling_price: 35.0,
    })

    await ProductService.createPriceList({
      company_id: companyId,
      name: 'Corporate Tier Rates',
      code: 'CORPORATE',
      tier_type: 'corporate',
      default_markup_percent: -10, // ৳31.50
    })

    const customer = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'Apex Telecom',
      mobile: '+8801711998877',
      customer_type: 'corporate',
    })

    // Dedicated special contract rate overrides tier markup
    await CustomerRepository.upsertCustomerRate(
      companyId,
      customer.id,
      product.id,
      28.0,
      'Special nationwide rollout rate'
    )

    const resolved = await ProductService.resolveCustomerProductPrice(product.id, customer.id, companyId)

    assert.strictEqual(resolved.effectiveRate, 28.0)
    assert.strictEqual(resolved.source, 'custom')
  })
})
