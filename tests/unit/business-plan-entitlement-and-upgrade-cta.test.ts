import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  DEFAULT_PLANS,
  checkFeatureAccess,
  getMinimumPlanForFeature,
  isPlanSufficient,
  PLAN_TIER_ORDER,
  FEATURE_METADATA,
} from '../../lib/subscription/subscription-constants.ts'
import { EntitlementService } from '../../services/entitlement.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { FeatureCode, CompanySubscriptionRecord } from '../../types/subscription.types.ts'

describe('Business Plan Entitlement, Canonical Features & Upgrade CTA Security', () => {
  const businessFeatures: FeatureCode[] = [
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
  ]

  const enterpriseOnlyFeatures: FeatureCode[] = [
    'multi_branch',
    'advanced_analytics',
    'advanced_permissions',
    'custom_workflows',
    'api_access',
    'priority_support',
  ]

  const starterFeatures: FeatureCode[] = [
    'basic_sales',
    'basic_customers',
    'quotation_pdf',
    'delivery_challan',
  ]

  it('1. Business plan catalog includes all 18 canonical business features', () => {
    const businessPlan = DEFAULT_PLANS.find((p) => p.code === 'business')
    assert.ok(businessPlan, 'Business plan must exist in DEFAULT_PLANS')
    assert.strictEqual(businessPlan.features.length, 18)

    for (const feat of businessFeatures) {
      assert.strictEqual(
        businessPlan.features.includes(feat),
        true,
        `Business plan must include feature: ${feat}`
      )
    }

    for (const feat of enterpriseOnlyFeatures) {
      assert.strictEqual(
        businessPlan.features.includes(feat),
        false,
        `Business plan must NOT include enterprise-only feature: ${feat}`
      )
    }
  })

  it('2. Enterprise plan catalog includes all 24 canonical features', () => {
    const enterprisePlan = DEFAULT_PLANS.find((p) => p.code === 'enterprise')
    assert.ok(enterprisePlan, 'Enterprise plan must exist in DEFAULT_PLANS')
    assert.strictEqual(enterprisePlan.features.length, 24)

    const allFeatures = Object.keys(FEATURE_METADATA) as FeatureCode[]
    for (const feat of allFeatures) {
      assert.strictEqual(
        enterprisePlan.features.includes(feat),
        true,
        `Enterprise plan must include feature: ${feat}`
      )
    }
  })

  it('3. Starter plan catalog includes exactly 4 starter features', () => {
    const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')
    assert.ok(starterPlan, 'Starter plan must exist in DEFAULT_PLANS')
    assert.strictEqual(starterPlan.features.length, 4)

    for (const feat of starterFeatures) {
      assert.strictEqual(
        starterPlan.features.includes(feat),
        true,
        `Starter plan must include feature: ${feat}`
      )
    }

    assert.strictEqual(starterPlan.features.includes('production'), false)
    assert.strictEqual(starterPlan.features.includes('inventory'), false)
    assert.strictEqual(starterPlan.features.includes('reports'), false)
    assert.strictEqual(starterPlan.features.includes('hr'), false)
  })

  it('4. isPlanSufficient correctly compares plan hierarchy levels', () => {
    // Current Business
    assert.strictEqual(isPlanSufficient('business', 'business'), true)
    assert.strictEqual(isPlanSufficient('business', 'starter'), true)
    assert.strictEqual(isPlanSufficient('business', 'trial'), true)
    assert.strictEqual(isPlanSufficient('business', 'enterprise'), false)

    // Current Enterprise
    assert.strictEqual(isPlanSufficient('enterprise', 'business'), true)
    assert.strictEqual(isPlanSufficient('enterprise', 'enterprise'), true)
    assert.strictEqual(isPlanSufficient('enterprise', 'starter'), true)

    // Current Starter
    assert.strictEqual(isPlanSufficient('starter', 'business'), false)
    assert.strictEqual(isPlanSufficient('starter', 'enterprise'), false)
    assert.strictEqual(isPlanSufficient('starter', 'starter'), true)

    // Casing normalization
    assert.strictEqual(isPlanSufficient('BUSINESS', 'business'), true)
    assert.strictEqual(isPlanSufficient('Business', 'Starter'), true)
  })

  it('5. getMinimumPlanForFeature resolves canonical minimum plan codes', () => {
    const starterMin = getMinimumPlanForFeature('basic_sales', DEFAULT_PLANS)
    assert.strictEqual(starterMin.code, 'starter')

    const productionMin = getMinimumPlanForFeature('production', DEFAULT_PLANS)
    assert.strictEqual(productionMin.code, 'business')

    const inventoryMin = getMinimumPlanForFeature('inventory', DEFAULT_PLANS)
    assert.strictEqual(inventoryMin.code, 'business')

    const reportsMin = getMinimumPlanForFeature('reports', DEFAULT_PLANS)
    assert.strictEqual(reportsMin.code, 'business')

    const hrMin = getMinimumPlanForFeature('hr', DEFAULT_PLANS)
    assert.strictEqual(hrMin.code, 'business')

    const multiBranchMin = getMinimumPlanForFeature('multi_branch', DEFAULT_PLANS)
    assert.strictEqual(multiBranchMin.code, 'enterprise')

    const apiMin = getMinimumPlanForFeature('api_access', DEFAULT_PLANS)
    assert.strictEqual(apiMin.code, 'enterprise')
  })

  it('6. EntitlementService allows active Business tenant access to Shop Floor Production', async () => {
    const testCompanyId = 'test-co-biz-001'
    const businessPlan = DEFAULT_PLANS.find((p) => p.code === 'business')!

    const subRecord: CompanySubscriptionRecord = {
      id: 'sub-biz-001',
      company_id: testCompanyId,
      plan_id: businessPlan.id,
      plan_code: 'business',
      plan_name: 'Business Plan',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      trial_ends_at: null,
      payment_method_type: 'bkash',
      last_payment_reference: 'TRX-BIZ-001',
      custom_limits_override: null,
    }

    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, {
      [testCompanyId]: subRecord,
    }, false)
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_PLANS, DEFAULT_PLANS, false)

    // Test Shop Floor Production
    const canAccessProduction = await EntitlementService.canUseFeature(testCompanyId, 'production')
    assert.strictEqual(canAccessProduction, true, 'Active Business tenant MUST have access to Shop Floor Production')

    // Test Inventory
    const canAccessInventory = await EntitlementService.canUseFeature(testCompanyId, 'inventory')
    assert.strictEqual(canAccessInventory, true, 'Active Business tenant MUST have access to Inventory')

    // Test Reports
    const canAccessReports = await EntitlementService.canUseFeature(testCompanyId, 'reports')
    assert.strictEqual(canAccessReports, true, 'Active Business tenant MUST have access to Reports')

    // Test HR
    const canAccessHr = await EntitlementService.canUseFeature(testCompanyId, 'hr')
    assert.strictEqual(canAccessHr, true, 'Active Business tenant MUST have access to HR')

    // Test Enterprise feature denial for Business tenant
    const canAccessMultiBranch = await EntitlementService.canUseFeature(testCompanyId, 'multi_branch')
    assert.strictEqual(canAccessMultiBranch, false, 'Business tenant must NOT have access to multi_branch')
  })

  it('7. EntitlementService denies expired Business tenant access to Production', async () => {
    const testCompanyId = 'test-co-biz-expired'
    const businessPlan = DEFAULT_PLANS.find((p) => p.code === 'business')!

    const subRecord: CompanySubscriptionRecord = {
      id: 'sub-biz-exp',
      company_id: testCompanyId,
      plan_id: businessPlan.id,
      plan_code: 'business',
      plan_name: 'Business Plan',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date(Date.now() - 60 * 86400000).toISOString(),
      current_period_end: new Date(Date.now() - 5 * 86400000).toISOString(), // Expired 5 days ago
      trial_ends_at: null,
      payment_method_type: 'bkash',
      last_payment_reference: 'TRX-BIZ-EXP',
      custom_limits_override: null,
    }

    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, {
      [testCompanyId]: subRecord,
    }, false)
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_PLANS, DEFAULT_PLANS, false)

    const canAccessProduction = await EntitlementService.canUseFeature(testCompanyId, 'production')
    assert.strictEqual(canAccessProduction, false, 'Expired Business tenant must be denied feature access')
  })

  it('8. EntitlementService denies Starter tenant access to Production', async () => {
    const testCompanyId = 'test-co-starter-001'
    const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!

    const subRecord: CompanySubscriptionRecord = {
      id: 'sub-str-001',
      company_id: testCompanyId,
      plan_id: starterPlan.id,
      plan_code: 'starter',
      plan_name: 'Starter Plan',
      status: 'active',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      trial_ends_at: null,
      payment_method_type: 'bkash',
      last_payment_reference: 'TRX-STR-001',
      custom_limits_override: null,
    }

    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, {
      [testCompanyId]: subRecord,
    }, false)
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_PLANS, DEFAULT_PLANS, false)

    const canAccessProduction = await EntitlementService.canUseFeature(testCompanyId, 'production')
    assert.strictEqual(canAccessProduction, false, 'Starter tenant must be denied Business feature')

    const canAccessSales = await EntitlementService.canUseFeature(testCompanyId, 'basic_sales')
    assert.strictEqual(canAccessSales, true, 'Starter tenant must have access to basic_sales')
  })
})
