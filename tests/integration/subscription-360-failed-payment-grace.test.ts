import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { EntitlementService } from '../../services/entitlement.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { DEFAULT_PLANS } from '../../lib/subscription/subscription-constants.ts'
import type { CompanySubscriptionRecord } from '../../types/subscription.types.ts'

describe('Subscription 360 - Failed Payment, Grace Period & Suspension Tests', () => {
  const companyId = 'co-grace-test-200'

  beforeEach(() => {
    PrintERPDataStore.clear()
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_PLANS, DEFAULT_PLANS, false)
  })

  it('1. Grace period allows operational access while showing billing warning', async () => {
    const businessPlan = DEFAULT_PLANS.find((p) => p.code === 'business')!
    const graceSub: CompanySubscriptionRecord = {
      id: 'sub-grace-1',
      company_id: companyId,
      plan_id: businessPlan.id,
      plan_code: 'business',
      status: 'grace_period',
      billing_interval: 'monthly',
      current_period_start: new Date(Date.now() - 32 * 86400000).toISOString(),
      current_period_end: new Date(Date.now() - 2 * 86400000).toISOString(),
      grace_period_ends_at: new Date(Date.now() + 5 * 86400000).toISOString(), // 5 days remaining in grace
    }
    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [companyId]: graceSub }, false)

    const entitlements = await EntitlementService.getTenantEntitlements(companyId)
    assert.strictEqual(entitlements.status, 'grace_period')
    assert.strictEqual(entitlements.isGracePeriod, true)
    assert.strictEqual(entitlements.isSuspended, false)

    // Feature access is retained during grace period
    const hasInventory = await EntitlementService.canUseFeature(companyId, 'inventory')
    assert.strictEqual(hasInventory, true)
  })

  it('2. Suspended state completely blocks premium features and quota allocation', async () => {
    const businessPlan = DEFAULT_PLANS.find((p) => p.code === 'business')!
    const suspendedSub: CompanySubscriptionRecord = {
      id: 'sub-suspended-1',
      company_id: companyId,
      plan_id: businessPlan.id,
      plan_code: 'business',
      status: 'suspended',
      billing_interval: 'monthly',
      current_period_start: new Date(Date.now() - 40 * 86400000).toISOString(),
      current_period_end: new Date(Date.now() - 10 * 86400000).toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [companyId]: suspendedSub }, false)

    const entitlements = await EntitlementService.getTenantEntitlements(companyId)
    assert.strictEqual(entitlements.status, 'suspended')
    assert.strictEqual(entitlements.isSuspended, true)

    const hasInventory = await EntitlementService.canUseFeature(companyId, 'inventory')
    assert.strictEqual(hasInventory, false)

    const quota = await EntitlementService.checkResourceQuota(companyId, 'max_users')
    assert.strictEqual(quota.allowed, false)
    assert.match(quota.reason || '', /Account Suspended/i)
  })
})
