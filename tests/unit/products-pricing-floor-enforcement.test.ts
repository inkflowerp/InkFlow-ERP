import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ProductService } from '../../services/product.service.ts'
import { CustomerRepository } from '../../lib/repositories/customer.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Unit: Phase 8 Minimum Price Safety Floor Enforcement', () => {
  const companyId = `comp-floor-test-${Date.now()}`

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMER_RATES, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_LISTS, [])
  })

  it('1. Enforces minPrice floor when resolved customer custom rate is below the floor', async () => {
    // Flex Banner with selling_price=৳20, base_cost=৳12, min_price floor=৳16
    const product = await ProductService.createProduct({
      company_id: companyId,
      name: 'Star Flex Banner 280 GSM',
      sku: 'FLX-FLOOR-01',
      unit: 'sft',
      selling_price: 20.0,
      base_cost: 12.0,
      min_price: 16.0,
    })

    const customer = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'Discount Hunter Co',
      mobile: '+8801700112233',
      customer_type: 'corporate',
    })

    // Suppose an unauthorized or aggressive custom rate was set to ৳14 (below ৳16 floor)
    await CustomerRepository.upsertCustomerRate(
      companyId,
      customer.id,
      product.id,
      14.0,
      'Aggressive contract discount'
    )

    // Standard resolution without override must enforce the floor at ৳16
    const resolved = await ProductService.resolveCustomerProductPrice(product.id, customer.id, companyId)

    assert.strictEqual(resolved.effectiveRate, 16.0, 'Effective rate must be raised to the minimum price floor ৳16')
    assert.strictEqual(resolved.isBelowMinimum, true, 'isBelowMinimum flag must be true')
    assert.strictEqual(resolved.isFloorEnforced, true, 'isFloorEnforced flag must be true')
    assert.strictEqual(resolved.originalRequestedRate, 14.0, 'originalRequestedRate must record the requested ৳14')
    assert.ok(resolved.sourceDetails?.includes('Floor Enforced'), 'sourceDetails must record floor enforcement')
  })

  it('2. Enforces minPrice floor when customer category tier discount dips below the floor', async () => {
    const product = await ProductService.createProduct({
      company_id: companyId,
      name: 'PVC Foam Board UV Print',
      sku: 'PVC-UV-5MM',
      unit: 'sft',
      selling_price: 150.0,
      base_cost: 100.0,
      min_price: 130.0,
    })

    // Agency tier with 25% discount => 150 * 0.75 = ৳112.50 (which is below the ৳130 floor)
    await ProductService.createPriceList({
      company_id: companyId,
      name: 'Super Agency Discount',
      code: 'SUPER_AGENCY',
      tier_type: 'agency',
      default_markup_percent: -25,
    })

    const customer = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'National Ad Agency',
      mobile: '+8801811556677',
      customer_type: 'agency',
    })

    const resolved = await ProductService.resolveCustomerProductPrice(product.id, customer.id, companyId)

    assert.strictEqual(resolved.effectiveRate, 130.0, 'Must clamp rate to minimum floor ৳130 instead of ৳112.50')
    assert.strictEqual(resolved.isBelowMinimum, true)
    assert.strictEqual(resolved.isFloorEnforced, true)
  })

  it('3. Permits authorized manager override below the floor with logged reason and auditor', async () => {
    const product = await ProductService.createProduct({
      company_id: companyId,
      name: 'Acrylic LED Letter',
      sku: 'ACR-LED-3MM',
      unit: 'inch',
      selling_price: 85.0,
      base_cost: 50.0,
      min_price: 70.0,
    })

    const customer = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'Government Ministry Tender',
      mobile: '+8801911998877',
      customer_type: 'government',
    })

    await CustomerRepository.upsertCustomerRate(
      companyId,
      customer.id,
      product.id,
      65.0,
      'National high-volume tender rate'
    )

    // Authorized override passed by managing director
    const resolved = await ProductService.resolveCustomerProductPrice(product.id, customer.id, companyId, {
      allowFloorOverride: true,
      overrideReason: 'Managing Director approved national volume tender pricing',
      authorizedBy: 'MD Shamol (user-md-01)',
    })

    assert.strictEqual(resolved.effectiveRate, 65.0, 'Effective rate reflects overridden price ৳65')
    assert.strictEqual(resolved.isBelowMinimum, true, 'isBelowMinimum is still flagged')
    assert.strictEqual(resolved.isFloorEnforced, false, 'isFloorEnforced is false because override was authorized')
    assert.strictEqual(resolved.overrideReason, 'Managing Director approved national volume tender pricing')
    assert.strictEqual(resolved.authorizedBy, 'MD Shamol (user-md-01)')
    assert.ok(resolved.sourceDetails?.includes('Floor Override'), 'Details reflect floor override audit trail')
  })
})
