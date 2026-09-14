import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { EntitlementService } from '../../services/entitlement.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { DEFAULT_PLANS } from '../../lib/subscription/subscription-constants.ts'
import type { CompanySubscriptionRecord } from '../../types/subscription.types.ts'

describe('Subscription 360 - Resource Limits & Enforcement Unit Tests', () => {
  const testCompanyId = 'co-test-limits-1'

  beforeEach(() => {
    PrintERPDataStore.clear()
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_PLANS, DEFAULT_PLANS, false)

    const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
    const starterSub: CompanySubscriptionRecord = {
      id: 'sub-starter-limits',
      company_id: testCompanyId,
      plan_id: starterPlan.id,
      plan_code: 'starter',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [testCompanyId]: starterSub }, false)
  })

  it('1. Starter plan enforces max 3 users limit', async () => {
    // 2 users -> Allowed
    const quota2 = await EntitlementService.checkResourceQuota(testCompanyId, 'max_users', 2)
    assert.strictEqual(quota2.allowed, true)
    assert.strictEqual(quota2.limit, 3)
    assert.strictEqual(quota2.current, 2)
    assert.strictEqual(quota2.exceeded, false)

    // 3 users -> Limit reached
    const quota3 = await EntitlementService.checkResourceQuota(testCompanyId, 'max_users', 3)
    assert.strictEqual(quota3.allowed, false)
    assert.strictEqual(quota3.exceeded, true)
  })

  it('2. Starter plan enforces max 1 branch limit', async () => {
    const quota1 = await EntitlementService.checkResourceQuota(testCompanyId, 'max_branches', 1)
    assert.strictEqual(quota1.allowed, false)
    assert.strictEqual(quota1.exceeded, true)
  })

  it('3. Starter plan enforces monthly order limit of 50 orders', async () => {
    // 40 orders -> Warning threshold (80%)
    const quota40 = await EntitlementService.checkResourceQuota(testCompanyId, 'monthly_orders', 40)
    assert.strictEqual(quota40.allowed, true)
    assert.strictEqual(quota40.warning, true)
    assert.strictEqual(quota40.percentage, 80)

    // 50 orders -> Exceeded
    const quota50 = await EntitlementService.checkResourceQuota(testCompanyId, 'monthly_orders', 50)
    assert.strictEqual(quota50.allowed, false)
    assert.strictEqual(quota50.exceeded, true)
  })

  it('4. Custom limits override takes precedence over base plan limit', async () => {
    const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
    const customSub: CompanySubscriptionRecord = {
      id: 'sub-custom-limits',
      company_id: testCompanyId,
      plan_id: starterPlan.id,
      plan_code: 'starter',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      custom_limits_override: {
        max_users: 7, // Overriding starter 3 to 7
      },
    }
    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [testCompanyId]: customSub }, false)

    const quota = await EntitlementService.checkResourceQuota(testCompanyId, 'max_users', 4)
    assert.strictEqual(quota.limit, 7)
    assert.strictEqual(quota.allowed, true)
    assert.strictEqual(quota.exceeded, false)
  })
})
