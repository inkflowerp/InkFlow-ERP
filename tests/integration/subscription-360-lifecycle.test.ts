import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { SubscriptionService } from '../../services/subscription.service.ts'
import { SaasBillingService } from '../../services/saas-billing.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { DEFAULT_PLANS } from '../../lib/subscription/subscription-constants.ts'

describe('Subscription 360 - Full Lifecycle Integration Tests', () => {
  const companyId = 'co-lifecycle-test-100'

  beforeEach(() => {
    PrintERPDataStore.clear()
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_PLANS, DEFAULT_PLANS, false)
  })

  it('1. Executes end-to-end subscription lifecycle: Trial -> Checkout -> Payment -> Activation -> Downgrade', async () => {
    // Phase 1: Onboarding creates initial trial subscription
    const trialPlan = DEFAULT_PLANS.find((p) => p.code === 'trial')!
    const trialSub = {
      id: 'sub-lifecycle-trial-1',
      company_id: companyId,
      plan_id: trialPlan.id,
      plan_code: 'trial',
      status: 'trial' as const,
      trial_starts_at: new Date().toISOString(),
      trial_ends_at: new Date(Date.now() + (trialPlan.trial_days || 30) * 86400000).toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [companyId]: trialSub }, false)

    const initialSub = await SubscriptionService.getTenantSubscription(companyId)
    assert.strictEqual(initialSub.status, 'trial')
    assert.strictEqual(initialSub.plan_code, 'trial')

    // Phase 2: Checkout initiation generates SaaS invoice and gateway transaction
    const checkout = await SubscriptionService.initiatePlanCheckout({
      companyId,
      planCode: 'business',
      interval: 'monthly',
      gatewayProvider: 'mock',
      customerName: 'Rahim Printing Ltd',
      customerPhone: '01711000000',
    })

    assert.strictEqual(checkout.success, true)
    assert.ok(checkout.internalTrxId)
    assert.strictEqual(checkout.amount, 4999)

    // Phase 3: Verify SaaS Invoices were generated
    const invoices = await SaasBillingService.getCompanyInvoices(companyId)
    assert.ok(invoices.length > 0)
    const latestInvoice = invoices[0]
    assert.strictEqual(latestInvoice.status, 'unpaid')
    assert.strictEqual(latestInvoice.total_amount, 4999)

    // Phase 4: Settle invoice upon verified payment
    const verifyRes = await SubscriptionService.verifyPaymentAndActivateSubscription({
      internalTrxId: checkout.internalTrxId,
      provider: 'mock',
      userId: 'user-admin-1',
    })

    assert.strictEqual(verifyRes.success, true)
    assert.strictEqual(verifyRes.status, 'paid')
    assert.strictEqual(verifyRes.planCode, 'business')

    // Phase 5: Verify scheduled downgrade to Starter for next billing cycle
    const downgradeRes = await SubscriptionService.schedulePlanDowngrade(companyId, 'starter')
    assert.strictEqual(downgradeRes.success, true)
    assert.ok(downgradeRes.effectiveAt)
  })
})
