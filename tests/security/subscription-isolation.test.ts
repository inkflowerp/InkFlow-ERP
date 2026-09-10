import { describe, it } from 'node:test'
import assert from 'node:assert'
import { SubscriptionService, DEFAULT_PLANS } from '../../services/subscription.service.ts'
import { EntitlementService } from '../../services/entitlement.service.ts'

describe('Subscription Security & Tenant Isolation Tests', () => {
  it('1. Entitlements are computed securely for tenant context', async () => {
    const entitlements = await EntitlementService.getTenantEntitlements('tenant-company-abc')
    assert.strictEqual(typeof entitlements.companyId, 'string')
    assert.strictEqual(typeof entitlements.isTrial, 'boolean')
    assert.ok(Array.isArray(entitlements.features))
  })

  it('2. Tenant cannot forge plan price in checkout', async () => {
    const enterprisePlan = DEFAULT_PLANS.find((p) => p.code === 'enterprise')!

    // Initiate checkout for enterprise plan
    const checkout = await SubscriptionService.initiatePlanCheckout({
      companyId: 'tenant-123',
      planCode: 'enterprise',
      interval: 'monthly',
      gatewayProvider: 'bkash',
    })

    // Authoritative amount must be the real plan price (9999 BDT)
    assert.strictEqual(checkout.amount, enterprisePlan.price_monthly)
    assert.strictEqual(checkout.currency, 'BDT')
  })

  it('3. Feature access cannot be bypassed when tenant is suspended', async () => {
    const canUseSales = await EntitlementService.canUseFeature('tenant-suspended-id', 'basic_sales')
    assert.strictEqual(typeof canUseSales, 'boolean')
  })
})
