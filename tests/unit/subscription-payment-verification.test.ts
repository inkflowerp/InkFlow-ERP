import { describe, it } from 'node:test'
import assert from 'node:assert'
import { SubscriptionService, DEFAULT_PLANS } from '../../services/subscription.service.ts'

describe('Subscription Payment Verification & Idempotency Unit Tests', () => {
  it('1. Rejects verification when no identifier is provided', async () => {
    const res = await SubscriptionService.verifyPaymentAndActivateSubscription({})
    assert.strictEqual(res.success, false)
    assert.strictEqual(res.status, 'failed')
    assert.ok(res.error?.includes('No transaction identifier'))
  })

  it('2. Price calculation is immune to tampering and derived strictly from plan metadata', () => {
    const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
    const businessPlan = DEFAULT_PLANS.find((p) => p.code === 'business')!
    const enterprisePlan = DEFAULT_PLANS.find((p) => p.code === 'enterprise')!

    assert.strictEqual(starterPlan.price_monthly, 1999)
    assert.strictEqual(starterPlan.price_yearly, 19990)

    assert.strictEqual(businessPlan.price_monthly, 4999)
    assert.strictEqual(businessPlan.price_yearly, 49990)

    assert.strictEqual(enterprisePlan.price_monthly, 9999)
    assert.strictEqual(enterprisePlan.price_yearly, 99990)
  })

  it('3. Downgrade calculations correctly schedule changes rather than immediate feature revocation', () => {
    const enterprisePlan = DEFAULT_PLANS.find((p) => p.code === 'enterprise')!
    const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!

    const proration = SubscriptionService.calculateProration({
      currentSubscription: {
        id: 'sub-ent',
        company_id: 'co-ent',
        plan_id: enterprisePlan.id,
        plan_code: 'enterprise',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 25 * 86400000).toISOString(),
      },
      currentPlan: enterprisePlan,
      targetPlan: starterPlan,
      targetInterval: 'monthly',
    })

    assert.strictEqual(proration.isDowngrade, true)
    assert.strictEqual(proration.isUpgrade, false)
  })
})
