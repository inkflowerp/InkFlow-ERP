import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { EntitlementService } from '../../services/entitlement.service.ts'
import { SubscriptionGuard } from '../../lib/subscription/subscription-guard.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { DEFAULT_PLANS } from '../../lib/subscription/subscription-constants.ts'
import type { CompanySubscriptionRecord } from '../../types/subscription.types.ts'

describe('Subscription 360 - Central Entitlement Engine & Guard Tests', () => {
  const testCompanyId = 'co-test-entitlement-1'
  const testSlug = 'alpha-print'

  beforeEach(() => {
    PrintERPDataStore.clear()
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_PLANS, DEFAULT_PLANS, false)
    const trialPlan = DEFAULT_PLANS.find((p) => p.code === 'trial')!
    const trialSub: CompanySubscriptionRecord = {
      id: 'sub-trial-1',
      company_id: testCompanyId,
      plan_id: trialPlan.id,
      plan_code: 'trial',
      status: 'trial',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + (trialPlan.trial_days || 30) * 86400000).toISOString(),
      trial_ends_at: new Date(Date.now() + (trialPlan.trial_days || 30) * 86400000).toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [testCompanyId]: trialSub }, false)
  })

  it('1. Authoritatively resolves trial plan for active trial tenant', async () => {
    const { subscription, plan } = await EntitlementService.getSubscription(testCompanyId, testSlug)
    assert.ok(subscription)
    assert.strictEqual(subscription.status, 'trial')
    assert.strictEqual(subscription.plan_code, 'trial')
    assert.strictEqual(plan.code, 'trial')
  })

  it('2. Evaluates full module access during active trial period', async () => {
    const hasInventory = await EntitlementService.canUseFeature(testCompanyId, 'inventory')
    const hasJobCosting = await EntitlementService.canUseFeature(testCompanyId, 'job_costing')
    const hasWhatsApp = await EntitlementService.canUseFeature(testCompanyId, 'whatsapp_notifications')
    const hasMultiBranch = await EntitlementService.canUseFeature(testCompanyId, 'multi_branch')

    assert.strictEqual(hasInventory, true)
    assert.strictEqual(hasJobCosting, true)
    assert.strictEqual(hasWhatsApp, true)
    assert.strictEqual(hasMultiBranch, true)
  })

  it('3. Evaluates feature gating correctly on Starter plan', async () => {
    const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
    const starterSub: CompanySubscriptionRecord = {
      id: 'sub-starter-1',
      company_id: testCompanyId,
      plan_id: starterPlan.id,
      plan_code: 'starter',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [testCompanyId]: starterSub }, false)

    // Allowed on Starter
    assert.strictEqual(await EntitlementService.canUseFeature(testCompanyId, 'basic_sales'), true)
    assert.strictEqual(await EntitlementService.canUseFeature(testCompanyId, 'quotation_pdf'), true)

    // Forbidden on Starter (Requires Business/Enterprise)
    assert.strictEqual(await EntitlementService.canUseFeature(testCompanyId, 'inventory'), false)
    assert.strictEqual(await EntitlementService.canUseFeature(testCompanyId, 'hr_payroll'), false)
    assert.strictEqual(await EntitlementService.canUseFeature(testCompanyId, 'multi_branch'), false)
  })

  it('4. Evaluates feature gating correctly on Business plan', async () => {
    const businessPlan = DEFAULT_PLANS.find((p) => p.code === 'business')!
    const businessSub: CompanySubscriptionRecord = {
      id: 'sub-business-1',
      company_id: testCompanyId,
      plan_id: businessPlan.id,
      plan_code: 'business',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [testCompanyId]: businessSub }, false)

    // Allowed on Business
    assert.strictEqual(await EntitlementService.canUseFeature(testCompanyId, 'inventory'), true)
    assert.strictEqual(await EntitlementService.canUseFeature(testCompanyId, 'job_costing'), true)
    assert.strictEqual(await EntitlementService.canUseFeature(testCompanyId, 'whatsapp_notifications'), true)

    // Forbidden on Business (Requires Enterprise)
    assert.strictEqual(await EntitlementService.canUseFeature(testCompanyId, 'multi_branch'), false)
    assert.strictEqual(await EntitlementService.canUseFeature(testCompanyId, 'api_access'), false)
  })

  it('5. SubscriptionGuard throws when account is suspended or expired', async () => {
    const suspendedSub: CompanySubscriptionRecord = {
      id: 'sub-suspended-1',
      company_id: testCompanyId,
      plan_id: 'sp-01',
      plan_code: 'starter',
      status: 'suspended',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [testCompanyId]: suspendedSub }, false)

    await assert.rejects(
      async () => {
        await SubscriptionGuard.requireSubscription(testCompanyId)
      },
      /Account Suspended/i
    )

    await assert.rejects(
      async () => {
        await SubscriptionGuard.requireFeature(testCompanyId, 'basic_sales')
      },
      /Account Suspended/i
    )
  })

  it('6. SubscriptionGuard provides getLimit, getUsage, and getRemaining helpers', async () => {
    const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
    const starterSub: CompanySubscriptionRecord = {
      id: 'sub-starter-2',
      company_id: testCompanyId,
      plan_id: starterPlan.id,
      plan_code: 'starter',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [testCompanyId]: starterSub }, false)

    const limit = await SubscriptionGuard.getLimit(testCompanyId, 'max_users')
    assert.strictEqual(limit, 3)

    const isUnlim = await SubscriptionGuard.isUnlimited(testCompanyId, 'max_users')
    assert.strictEqual(isUnlim, false)

    const remaining = await SubscriptionGuard.getRemaining(testCompanyId, 'max_users')
    assert.ok(remaining >= 0)
  })
})
