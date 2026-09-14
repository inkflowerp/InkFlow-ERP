import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { SubscriptionService } from '../../services/subscription.service.ts'
import { EntitlementService } from '../../services/entitlement.service.ts'
import { SubscriptionGuard } from '../../lib/subscription/subscription-guard.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { SubscriptionPlanRecord, CompanySubscriptionRecord } from '../../types/subscription.types.ts'

describe('Authoritative SaaS Subscription Resolver & Single Source of Truth', () => {
  const dbTrialCompanyId = 'co-db-authoritative-trial'
  const paidCompanyId = 'co-db-authoritative-paid'
  const unknownCompanyId = 'co-non-existent-tenant'

  // Authoritative Database Plan: 30 days, 2 seats, 1 branch, 1 GB, 30 orders, 10 customers, 20 products, 21 modules
  const dbTrialPlan: SubscriptionPlanRecord = {
    id: 'sp-db-trial-30',
    code: 'trial',
    name: 'Free Trial (30 Days)',
    name_bn: '৩০ দিনের ফ্রি ট্রায়াল',
    description: 'Authoritative database trial plan',
    price_monthly: 0,
    price_yearly: 0,
    max_users: 2,
    max_branches: 1,
    storage_gb: 1,
    monthly_orders: 30,
    max_customers: 10,
    max_products: 20,
    trial_days: 30,
    features: [
      'basic_sales',
      'basic_customers',
      'quotation_pdf',
      'delivery_challan',
      'multi_department',
      'inventory',
      'inventory_rolls',
      'production',
      'production_kanban',
      'reports',
      'reports_analytics',
      'hr',
      'hr_payroll',
      'job_costing',
      'whatsapp_notifications',
      'sms_notifications',
      'machinery',
      'attendance_qr',
      'multi_branch',
      'advanced_analytics',
      'custom_workflows',
    ], // exactly 21 features
    is_active: true,
    sort_order: 0,
  }

  // Stale Browser Storage Plan: 14 days, 5 seats, 2 GB, 100 orders, 200 customers, 200 products, 24 modules
  const staleLocalStoragePlan: SubscriptionPlanRecord = {
    id: 'sp-stale-00',
    code: 'trial',
    name: 'Free Trial (14 Days)',
    name_bn: '১৪ দিনের ফ্রি ট্রায়াল',
    description: 'Stale cached local storage trial plan',
    price_monthly: 0,
    price_yearly: 0,
    max_users: 5,
    max_branches: 1,
    storage_gb: 2,
    monthly_orders: 100,
    max_customers: 200,
    max_products: 200,
    trial_days: 14,
    features: [
      'basic_sales',
      'basic_customers',
      'quotation_pdf',
      'delivery_challan',
      'multi_department',
      'inventory',
      'inventory_rolls',
      'production',
      'production_kanban',
      'reports',
      'reports_analytics',
      'hr',
      'hr_payroll',
      'job_costing',
      'whatsapp_notifications',
      'sms_notifications',
      'machinery',
      'attendance_qr',
      'multi_branch',
      'advanced_analytics',
      'advanced_permissions',
      'custom_workflows',
      'api_access',
      'priority_support',
    ], // 24 features
    is_active: true,
    sort_order: 0,
  }

  beforeEach(() => {
    PrintERPDataStore.clear()
    // Authoritative trial registered in store
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_PLANS, [dbTrialPlan], false)
    PrintERPDataStore.set(
      STORAGE_KEYS.COMPANY_SUBSCRIPTIONS,
      {
        [dbTrialCompanyId]: {
          id: 'sub-db-01',
          company_id: dbTrialCompanyId,
          plan_id: dbTrialPlan.id,
          plan_code: 'trial',
          status: 'trial',
          trial_ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        },
      },
      false
    )
  })

  it('1. Authoritative resolution returns Database trial values (30 days / 2 seats / 1 GB / 21 modules)', async () => {
    const snapshot = await SubscriptionService.resolveTenantSubscription(dbTrialCompanyId)

    // Verify exact database trial values are returned
    assert.strictEqual(snapshot.limits.maxUsers, 2, 'Must return 2 seats from database plan')
    assert.strictEqual(snapshot.limits.maxBranches, 1, 'Must return 1 branch from database plan')
    assert.strictEqual(snapshot.limits.storageGb, 1, 'Must return 1 GB storage from database plan')
    assert.strictEqual(snapshot.limits.monthlyOrders, 30, 'Must return 30 orders from database plan')
    assert.strictEqual(snapshot.limits.maxCustomers, 10, 'Must return 10 customers from database plan')
    assert.strictEqual(snapshot.limits.maxProducts, 20, 'Must return 20 products from database plan')
    assert.strictEqual(snapshot.features.length, 21, 'Must return 21 features from database plan')

    // Verify it NEVER returns the old 14-day / 5-seat / 2 GB / 24-module configuration
    assert.notStrictEqual(snapshot.limits.maxUsers, 5)
    assert.notStrictEqual(snapshot.limits.storageGb, 2)
    assert.notStrictEqual(snapshot.features.length, 24)

    // Verify snapshot shape matches canonical specification
    assert.strictEqual(snapshot.source, 'database')
    assert.strictEqual(typeof snapshot.resolvedAt, 'string')
    assert.strictEqual(snapshot.tenantId, dbTrialCompanyId)
  })

  it('2. Fails closed with status: "unknown" for non-existent companies (never defaults to trial or starter)', async () => {
    const unknownSnapshot = await SubscriptionService.resolveTenantSubscription(unknownCompanyId)

    assert.strictEqual(unknownSnapshot.status, 'unknown')
    assert.strictEqual(unknownSnapshot.planCode, 'unknown')
    assert.strictEqual(unknownSnapshot.planName, 'Unknown')
    assert.strictEqual(unknownSnapshot.limits.maxUsers, 0)
    assert.strictEqual(unknownSnapshot.limits.monthlyOrders, 0)
    assert.strictEqual(unknownSnapshot.features.length, 0)
  })

  it('3. Subscription guard rejects status: "unknown" with fail-closed security error', async () => {
    await assert.rejects(
      async () => {
        await SubscriptionGuard.requireSubscription(unknownCompanyId)
      },
      /Subscription Unavailable/
    )
  })

  it('4. Entitlement service hasFeatureAccess verifies tenant real subscription features', async () => {
    // Check feature access on unknown company -> should be false
    const unknownAccess = await EntitlementService.hasFeatureAccess({
      tenantId: unknownCompanyId,
      feature: 'production',
    })
    assert.strictEqual(unknownAccess, false)
  })

  it('5. Quota enforcement on unknown tenant is blocked (0 limits)', async () => {
    const quotaResult = await EntitlementService.checkResourceQuota(unknownCompanyId, 'max_users', 1)
    assert.strictEqual(quotaResult.allowed, false)
    assert.strictEqual(quotaResult.limit, 0)
    assert.strictEqual(quotaResult.exceeded, true)
  })
})
