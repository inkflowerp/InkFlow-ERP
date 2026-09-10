import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  SubscriptionService,
  DEFAULT_PLANS,
  DEFAULT_TRIAL_PLAN,
  checkFeatureAccess,
  checkResourceLimit,
  getTrialDaysRemaining,
} from '../../services/subscription.service.ts'
import { resolveSubscriptionPlan, resolveTenantAccountType } from '../../types/subscription.types.ts'
import type { CompanySubscriptionRecord, SubscriptionPlanRecord } from '../../types/subscription.types.ts'

describe('Subscription Lifecycle & Entitlement Unit Tests', () => {
  const trialSub: CompanySubscriptionRecord = {
    id: 'sub-trial-1',
    company_id: 'co-test-1',
    plan_id: DEFAULT_TRIAL_PLAN.id,
    plan_code: 'trial',
    status: 'trial',
    billing_interval: 'monthly',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 14 * 86400000).toISOString(),
    trial_ends_at: new Date(Date.now() + 10 * 86400000).toISOString(),
  }

  const activeStarterSub: CompanySubscriptionRecord = {
    id: 'sub-starter-1',
    company_id: 'co-test-2',
    plan_id: DEFAULT_PLANS[1].id,
    plan_code: 'starter',
    status: 'active',
    billing_interval: 'monthly',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 20 * 86400000).toISOString(),
    trial_ends_at: null,
  }

  it('1. Correctly resolves Trial account type and days remaining', () => {
    const accType = resolveTenantAccountType(trialSub)
    assert.strictEqual(accType, 'trial')

    const resolved = resolveSubscriptionPlan(trialSub)
    assert.strictEqual(resolved.isTrial, true)
    assert.strictEqual(resolved.badgeTextEn, 'Trial')
    assert.strictEqual(resolved.planCode, 'trial')

    const daysRemaining = getTrialDaysRemaining(trialSub.trial_ends_at)
    assert.ok(daysRemaining <= 10 && daysRemaining >= 9)
  })

  it('2. Never identifies Trial account as Starter plan', () => {
    const resolved = resolveSubscriptionPlan(trialSub)
    assert.notStrictEqual(resolved.planCode, 'starter')
    assert.notStrictEqual(resolved.badgeTextEn, 'Starter')
  })

  it('3. Feature access gate properly distinguishes plans', () => {
    // Trial plan includes all features
    assert.strictEqual(checkFeatureAccess('trial', 'multi_department', DEFAULT_PLANS), true)
    assert.strictEqual(checkFeatureAccess('trial', 'inventory_rolls', DEFAULT_PLANS), true)
    assert.strictEqual(checkFeatureAccess('trial', 'api_access', DEFAULT_PLANS), true)

    // Starter plan only has basic features
    assert.strictEqual(checkFeatureAccess('starter', 'basic_sales', DEFAULT_PLANS), true)
    assert.strictEqual(checkFeatureAccess('starter', 'quotation_pdf', DEFAULT_PLANS), true)
    assert.strictEqual(checkFeatureAccess('starter', 'inventory_rolls', DEFAULT_PLANS), false)
    assert.strictEqual(checkFeatureAccess('starter', 'api_access', DEFAULT_PLANS), false)

    // Business plan includes inventory & production
    assert.strictEqual(checkFeatureAccess('business', 'inventory_rolls', DEFAULT_PLANS), true)
    assert.strictEqual(checkFeatureAccess('business', 'production_kanban', DEFAULT_PLANS), true)
    assert.strictEqual(checkFeatureAccess('business', 'api_access', DEFAULT_PLANS), false)

    // Enterprise plan includes advanced features
    assert.strictEqual(checkFeatureAccess('enterprise', 'api_access', DEFAULT_PLANS), true)
    assert.strictEqual(checkFeatureAccess('enterprise', 'custom_workflows', DEFAULT_PLANS), true)
  })

  it('4. Enforces configurable resource limits accurately', () => {
    const starterPlan = DEFAULT_PLANS[1] // max_users: 3, max_branches: 1
    const withinLimit = checkResourceLimit('max_users', 2, starterPlan)
    assert.strictEqual(withinLimit.exceeded, false)
    assert.strictEqual(withinLimit.percentage, 67)

    const atLimit = checkResourceLimit('max_users', 3, starterPlan)
    assert.strictEqual(atLimit.exceeded, true)
    assert.strictEqual(atLimit.percentage, 100)

    const exceededLimit = checkResourceLimit('max_users', 4, starterPlan)
    assert.strictEqual(exceededLimit.exceeded, true)
  })

  it('5. Calculates server-side proration on plan upgrade', () => {
    const starterPlan = DEFAULT_PLANS[1] // 1999 BDT/mo
    const businessPlan = DEFAULT_PLANS[2] // 4999 BDT/mo

    const proration = SubscriptionService.calculateProration({
      currentSubscription: activeStarterSub,
      currentPlan: starterPlan,
      targetPlan: businessPlan,
      targetInterval: 'monthly',
    })

    assert.strictEqual(proration.isUpgrade, true)
    assert.strictEqual(proration.targetPlanPrice, 4999)
    assert.ok(proration.unusedCredit > 0)
    assert.ok(proration.finalAmount < 4999)
    assert.strictEqual(proration.currency, 'BDT')
  })

  it('6. Does not apply proration credit to trial upgrades', () => {
    const businessPlan = DEFAULT_PLANS[2] // 4999 BDT/mo

    const proration = SubscriptionService.calculateProration({
      currentSubscription: trialSub,
      currentPlan: DEFAULT_TRIAL_PLAN,
      targetPlan: businessPlan,
      targetInterval: 'monthly',
    })

    assert.strictEqual(proration.unusedCredit, 0)
    assert.strictEqual(proration.finalAmount, 4999)
  })
})
