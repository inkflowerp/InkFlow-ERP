import { describe, it } from 'node:test'
import assert from 'node:assert'
import { SubscriptionService } from '../../services/subscription.service.ts'
import { DEFAULT_PLANS } from '../../lib/subscription/subscription-constants.ts'
import type { CompanySubscriptionRecord } from '../../types/subscription.types.ts'

describe('Subscription 360 - Proration & Billing Calculations', () => {
  const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
  const businessPlan = DEFAULT_PLANS.find((p) => p.code === 'business')!
  const enterprisePlan = DEFAULT_PLANS.find((p) => p.code === 'enterprise')!

  it('1. Calculates full price for new purchase when currently on trial', () => {
    const trialSub: CompanySubscriptionRecord = {
      id: 'sub-trial',
      company_id: 'co-proration-1',
      plan_id: 'sp-00',
      plan_code: 'trial',
      status: 'trial',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }

    const proration = SubscriptionService.calculateProration({
      currentSubscription: trialSub,
      currentPlan: starterPlan,
      targetPlan: businessPlan,
      targetInterval: 'monthly',
    })

    assert.strictEqual(proration.targetPlanPrice, 4999)
    assert.strictEqual(proration.unusedCredit, 0)
    assert.strictEqual(proration.finalAmount, 4999)
    assert.strictEqual(proration.isUpgrade, true)
  })

  it('2. Calculates upgrade proration credit accurately for active monthly subscription with 15 days remaining', () => {
    const now = Date.now()
    const activeStarterSub: CompanySubscriptionRecord = {
      id: 'sub-starter-active',
      company_id: 'co-proration-2',
      plan_id: starterPlan.id,
      plan_code: 'starter',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date(now - 15 * 86400000).toISOString(),
      current_period_end: new Date(now + 15 * 86400000).toISOString(), // 15 days left out of 30
    }

    const proration = SubscriptionService.calculateProration({
      currentSubscription: activeStarterSub,
      currentPlan: starterPlan,
      targetPlan: businessPlan,
      targetInterval: 'monthly',
    })

    assert.strictEqual(proration.targetPlanPrice, 4999)
    // Starter is 1999/mo. 15 days left = 1999 * (15/30) ≈ 1000 credit
    assert.ok(proration.unusedCredit >= 950)
    assert.ok(proration.unusedCredit <= 1050)
    assert.strictEqual(proration.finalAmount, proration.targetPlanPrice - proration.unusedCredit)
    assert.strictEqual(proration.isUpgrade, true)
  })

  it('3. Calculates yearly plan pricing with 10x multiplier (2 months free discount)', () => {
    assert.strictEqual(starterPlan.price_yearly, 19990)
    assert.strictEqual(businessPlan.price_yearly, 49990)
    assert.strictEqual(enterprisePlan.price_yearly, 99990)
  })

  it('4. Flags downgrade correctly when selecting lower tier plan', () => {
    const activeBusinessSub: CompanySubscriptionRecord = {
      id: 'sub-bus-active',
      company_id: 'co-proration-3',
      plan_id: businessPlan.id,
      plan_code: 'business',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }

    const proration = SubscriptionService.calculateProration({
      currentSubscription: activeBusinessSub,
      currentPlan: businessPlan,
      targetPlan: starterPlan,
      targetInterval: 'monthly',
    })

    assert.strictEqual(proration.isDowngrade, true)
    assert.strictEqual(proration.isUpgrade, false)
  })
})
