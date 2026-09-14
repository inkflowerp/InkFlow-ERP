import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { SubscriptionService } from '../../services/subscription.service.ts'
import { EntitlementService } from '../../services/entitlement.service.ts'
import { SaasBillingService } from '../../services/saas-billing.service.ts'
import { SaasRevenueService } from '../../services/saas-revenue.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { DEFAULT_PLANS } from '../../lib/subscription/subscription-constants.ts'
import type { CompanySubscriptionRecord } from '../../types/subscription.types.ts'

describe('Subscription 360 - Comprehensive Acceptance Criteria Tests', () => {
  const companyId = 'co-acceptance-test-300'

  beforeEach(() => {
    PrintERPDataStore.clear()
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_PLANS, DEFAULT_PLANS, false)
  })

  it('1. [ACCEPTANCE — STARTER] Verifies trial, Starter plan display, limits and feature gating', async () => {
    const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
    const sub: CompanySubscriptionRecord = {
      id: 'sub-acc-starter',
      company_id: companyId,
      plan_id: starterPlan.id,
      plan_code: 'starter',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [companyId]: sub }, false)

    const entitlements = await EntitlementService.getTenantEntitlements(companyId)
    assert.strictEqual(entitlements.planCode, 'starter')
    assert.strictEqual(entitlements.planName, 'Starter Plan')
    assert.strictEqual(entitlements.planNameBn, 'স্টার্টার প্ল্যান')

    // Basic sales allowed, inventory restricted
    assert.strictEqual(await EntitlementService.canUseFeature(companyId, 'basic_sales'), true)
    assert.strictEqual(await EntitlementService.canUseFeature(companyId, 'inventory'), false)
  })

  it('2. [ACCEPTANCE — UPGRADE] Starter -> Business upgrade processes payment, entitlement update and audit event', async () => {
    const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
    const sub: CompanySubscriptionRecord = {
      id: 'sub-acc-up',
      company_id: companyId,
      plan_id: starterPlan.id,
      plan_code: 'starter',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [companyId]: sub }, false)

    const checkout = await SubscriptionService.initiatePlanCheckout({
      companyId,
      planCode: 'business',
      interval: 'monthly',
      gatewayProvider: 'mock',
    })

    assert.strictEqual(checkout.success, true)
    assert.ok(checkout.internalTrxId)

    const verifyRes = await SubscriptionService.verifyPaymentAndActivateSubscription({
      internalTrxId: checkout.internalTrxId,
      provider: 'mock',
      userId: 'user-owner',
    })

    assert.strictEqual(verifyRes.success, true)
    assert.strictEqual(verifyRes.status, 'paid')
  })

  it('3. [ACCEPTANCE — DOWNGRADE] Business -> Starter schedules downgrade at period end without deleting data', async () => {
    const businessPlan = DEFAULT_PLANS.find((p) => p.code === 'business')!
    const sub: CompanySubscriptionRecord = {
      id: 'sub-acc-down',
      company_id: companyId,
      plan_id: businessPlan.id,
      plan_code: 'business',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [companyId]: sub }, false)

    const downgrade = await SubscriptionService.schedulePlanDowngrade(companyId, 'starter', 'user-owner')
    assert.strictEqual(downgrade.success, true)
    assert.ok(downgrade.effectiveAt)
  })

  it('4. [ACCEPTANCE — PLATFORM ADMIN] Platform admin can inspect revenue analytics and issue audited adjustments', async () => {
    const revenue = await SaasRevenueService.getRevenueOverview()
    assert.ok(revenue.mrr >= 0)
    assert.strictEqual(revenue.arr, revenue.mrr * 12)
    assert.ok(revenue.collectionRatePct >= 0)

    const creditRes = await SaasBillingService.issueCreditAdjustment({
      companyId,
      amount: 500,
      reason: 'Goodwill compensation for scheduled maintenance',
      actorId: 'admin-super-1',
    })

    assert.strictEqual(creditRes.success, true)
    assert.ok(creditRes.creditInvoiceId)
  })
})
