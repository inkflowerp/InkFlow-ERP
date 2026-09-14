import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { SaasRevenueService } from '../../services/saas-revenue.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { DEFAULT_PLANS } from '../../lib/subscription/subscription-constants.ts'
import type { CompanySubscriptionRecord } from '../../types/subscription.types.ts'

describe('Subscription 360 - SaaS Revenue & Financial Metrics', () => {
  beforeEach(() => {
    PrintERPDataStore.clear()
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_PLANS, DEFAULT_PLANS, false)
  })

  it('1. Computes MRR and ARR accurately for mixed monthly and yearly active subscriptions', async () => {
    // 2 Starter monthly (1999 * 2 = 3998)
    // 1 Business monthly (4999)
    // 1 Enterprise yearly (99990 / 12 = 8332.5 -> 8333)
    const mockSubs: Record<string, CompanySubscriptionRecord> = {
      'co-1': {
        id: 'sub-1',
        company_id: 'co-1',
        plan_id: 'sp-01',
        plan_code: 'starter',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      'co-2': {
        id: 'sub-2',
        company_id: 'co-2',
        plan_id: 'sp-01',
        plan_code: 'starter',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      'co-3': {
        id: 'sub-3',
        company_id: 'co-3',
        plan_id: 'sp-02',
        plan_code: 'business',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      'co-4': {
        id: 'sub-4',
        company_id: 'co-4',
        plan_id: 'sp-03',
        plan_code: 'enterprise',
        status: 'active',
        billing_interval: 'yearly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 86400000).toISOString(),
      },
      'co-5': {
        id: 'sub-5',
        company_id: 'co-5',
        plan_id: 'sp-00',
        plan_code: 'trial',
        status: 'trial',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 14 * 86400000).toISOString(),
      },
    }

    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, mockSubs, false)

    const revenue = await SaasRevenueService.getRevenueOverview()

    // Expected MRR = 1999 + 1999 + 4999 + round(99990/12 = 8333) = 17330
    assert.strictEqual(revenue.activeSubscriptionsCount, 4)
    assert.strictEqual(revenue.trialSubscriptionsCount, 1)
    assert.ok(revenue.mrr >= 17300)
    assert.ok(revenue.mrr <= 17400)
    assert.strictEqual(revenue.arr, revenue.mrr * 12)
    assert.strictEqual(revenue.arpu, Math.round(revenue.mrr / 4))
  })

  it('2. Computes churn rate correctly based on cancelled subscriptions', async () => {
    const mockSubs: Record<string, CompanySubscriptionRecord> = {
      'co-a': {
        id: 'sub-a',
        company_id: 'co-a',
        plan_id: 'sp-01',
        plan_code: 'starter',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date().toISOString(),
      },
      'co-b': {
        id: 'sub-b',
        company_id: 'co-b',
        plan_id: 'sp-01',
        plan_code: 'starter',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date().toISOString(),
      },
      'co-c': {
        id: 'sub-c',
        company_id: 'co-c',
        plan_id: 'sp-01',
        plan_code: 'starter',
        status: 'cancelled',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date().toISOString(),
      },
    }

    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, mockSubs, false)

    const revenue = await SaasRevenueService.getRevenueOverview()
    // 1 cancelled out of 3 total = 33.3% churn
    assert.strictEqual(revenue.cancelledSubscriptionsCount, 1)
    assert.ok(Math.abs(revenue.churnRatePct - 33.3) <= 1)
  })
})
