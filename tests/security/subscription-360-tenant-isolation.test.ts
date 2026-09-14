import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { EntitlementService } from '../../services/entitlement.service.ts'
import { SaasBillingService } from '../../services/saas-billing.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { DEFAULT_PLANS } from '../../lib/subscription/subscription-constants.ts'
import type { CompanySubscriptionRecord } from '../../types/subscription.types.ts'

describe('Subscription 360 - Multi-Tenant Security & Isolation Tests', () => {
  const companyA = 'co-tenant-alpha'
  const companyB = 'co-tenant-beta'

  beforeEach(() => {
    PrintERPDataStore.clear()
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_PLANS, DEFAULT_PLANS, false)

    const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
    const enterprisePlan = DEFAULT_PLANS.find((p) => p.code === 'enterprise')!

    const subA: CompanySubscriptionRecord = {
      id: 'sub-alpha',
      company_id: companyA,
      plan_id: starterPlan.id,
      plan_code: 'starter',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }

    const subB: CompanySubscriptionRecord = {
      id: 'sub-beta',
      company_id: companyB,
      plan_id: enterprisePlan.id,
      plan_code: 'enterprise',
      status: 'active',
      billing_interval: 'yearly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 365 * 86400000).toISOString(),
    }

    PrintERPDataStore.set(
      STORAGE_KEYS.COMPANY_SUBSCRIPTIONS,
      { [companyA]: subA, [companyB]: subB },
      false
    )
  })

  it('1. Strictly separates entitlements: Tenant A cannot access Tenant B enterprise features', async () => {
    // Tenant A on Starter cannot use multi_branch
    const canAUseBranch = await EntitlementService.canUseFeature(companyA, 'multi_branch')
    assert.strictEqual(canAUseBranch, false)

    // Tenant B on Enterprise can use multi_branch
    const canBUseBranch = await EntitlementService.canUseFeature(companyB, 'multi_branch')
    assert.strictEqual(canBUseBranch, true)
  })

  it('2. Strictly isolates SaaS invoices: Company A invoices are not visible to Company B', async () => {
    await SaasBillingService.generateInvoice({
      companyId: companyA,
      planId: 'sp-01',
      billingInterval: 'monthly',
      subtotal: 1999,
    })

    await SaasBillingService.generateInvoice({
      companyId: companyB,
      planId: 'sp-03',
      billingInterval: 'yearly',
      subtotal: 99990,
    })

    const invoicesA = await SaasBillingService.getCompanyInvoices(companyA)
    const invoicesB = await SaasBillingService.getCompanyInvoices(companyB)

    assert.strictEqual(invoicesA.every((i) => i.company_id === companyA), true)
    assert.strictEqual(invoicesB.every((i) => i.company_id === companyB), true)
    assert.strictEqual(invoicesA.some((i) => i.company_id === companyB), false)
  })
})
