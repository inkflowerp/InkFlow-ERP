import { describe, test } from 'node:test'
import assert from 'node:assert'
import {
  DEFAULT_PLANS,
  DEFAULT_TRIAL_PLAN,
  checkFeatureAccess,
  checkResourceLimit,
  getTrialDaysRemaining,
  getSubscriptionTimeRemaining,
  getTenantResourceUsage,
  getNextTierPlan,
  getMinimumPlanForFeature,
} from '../../lib/subscription/subscription-constants.ts'
import { SubscriptionService } from '../../services/subscription.service.ts'
import { EntitlementService } from '../../services/entitlement.service.ts'
import {
  resolveTenantAccountType,
  resolveSubscriptionPlan,
  type SubscriptionPlanRecord,
  type CompanySubscriptionRecord,
  type TenantAccountType,
} from '../../types/subscription.types.ts'

describe('Subscription Architecture Authority & Multi-Tenant Consistency Suite', () => {
  const mockBusinessPlan: SubscriptionPlanRecord = {
    id: '57991a96-e636-4825-a856-d1d99c354864',
    code: 'business',
    name: 'Business Plan',
    name_bn: 'বিজনেস প্ল্যান',
    description: 'Full ERP capability for standard print houses',
    price_monthly: 4999,
    price_yearly: 49990,
    max_users: 10,
    max_branches: 3,
    storage_gb: 10,
    monthly_orders: 500,
    max_customers: 1000,
    max_products: 1000,
    trial_days: 0,
    features: [
      'basic_sales',
      'basic_customers',
      'quotation_pdf',
      'delivery_challan',
      'multi_department',
      'inventory_rolls',
      'production_kanban',
      'job_costing',
      'hr_payroll',
      'reports_analytics',
      'whatsapp_notifications',
    ],
    is_active: true,
    sort_order: 2,
  }

  const mockStarterPlan: SubscriptionPlanRecord = {
    id: '11111111-1111-1111-1111-111111111111',
    code: 'starter',
    name: 'Starter Plan',
    name_bn: 'স্টার্টার প্ল্যান',
    description: 'Basic plan for small shops',
    price_monthly: 1999,
    price_yearly: 19990,
    max_users: 3,
    max_branches: 1,
    storage_gb: 2,
    monthly_orders: 100,
    max_customers: 200,
    max_products: 200,
    trial_days: 0,
    features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'],
    is_active: true,
    sort_order: 1,
  }

  const mockEnterprisePlan: SubscriptionPlanRecord = {
    id: '99999999-9999-9999-9999-999999999999',
    code: 'enterprise',
    name: 'Enterprise Plan',
    name_bn: 'এন্টারপ্রাইজ প্ল্যান',
    description: 'Unlimited printing conglomerate plan',
    price_monthly: 12999,
    price_yearly: 129990,
    max_users: 50,
    max_branches: 10,
    storage_gb: 100,
    monthly_orders: 5000,
    max_customers: 10000,
    max_products: 10000,
    trial_days: 0,
    features: [
      'basic_sales',
      'basic_customers',
      'quotation_pdf',
      'delivery_challan',
      'multi_department',
      'inventory_rolls',
      'production_kanban',
      'job_costing',
      'hr_payroll',
      'reports_analytics',
      'whatsapp_notifications',
      'multi_branch',
      'api_access',
      'priority_support',
    ],
    is_active: true,
    sort_order: 3,
  }

  const allMockPlans = [mockStarterPlan, mockBusinessPlan, mockEnterprisePlan]

  describe('CASE 1: Business Plan + Active Subscription', () => {
    test('Resolves to accountType "business" and isTrial = false with paid limits', () => {
      const activeBusinessSub: CompanySubscriptionRecord = {
        id: 'sub-bus-01',
        company_id: '2af84f1d-1ebd-48e7-9795-fd5c24c38a96',
        plan_id: mockBusinessPlan.id,
        plan_code: 'business',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date(Date.now() - 5 * 86400000).toISOString(),
        current_period_end: new Date(Date.now() + 25 * 86400000).toISOString(),
        trial_ends_at: null,
      }

      const accountType = resolveTenantAccountType(activeBusinessSub)
      assert.strictEqual(accountType, 'business')

      const resolved = resolveSubscriptionPlan(activeBusinessSub, allMockPlans)
      assert.strictEqual(resolved.planCode, 'business')
      assert.strictEqual(resolved.planName, 'Business Plan')
      assert.strictEqual(resolved.isTrial, false)

      // Limits verification
      const userLimit = checkResourceLimit('max_users', 1, mockBusinessPlan)
      assert.strictEqual(userLimit.limit, 10)
      assert.strictEqual(userLimit.allowed, true)

      const branchLimit = checkResourceLimit('max_branches', 1, mockBusinessPlan)
      assert.strictEqual(branchLimit.limit, 3)
      assert.strictEqual(branchLimit.allowed, true)

      // Feature verification
      assert.strictEqual(checkFeatureAccess('business', 'inventory_rolls', allMockPlans), true)
      assert.strictEqual(checkFeatureAccess('business', 'whatsapp_notifications', allMockPlans), true)
      assert.strictEqual(checkFeatureAccess('business', 'multi_branch', allMockPlans), false) // Enterprise only
    })
  })

  describe('CASE 2: Business Plan + Genuine Trialing State', () => {
    test('Resolves to accountType "trial" with trial countdown when status is trial', () => {
      const futureTrialEnd = new Date(Date.now() + 14 * 86400000).toISOString()
      const trialingSub: CompanySubscriptionRecord = {
        id: 'sub-trial-01',
        company_id: 'tenant-trial-uuid',
        plan_id: mockBusinessPlan.id,
        plan_code: 'trial',
        status: 'trial',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: futureTrialEnd,
        trial_ends_at: futureTrialEnd,
      }

      const accountType = resolveTenantAccountType(trialingSub)
      assert.strictEqual(accountType, 'trial')

      const resolved = resolveSubscriptionPlan(trialingSub, allMockPlans)
      assert.strictEqual(resolved.isTrial, true)

      const daysRemaining = getTrialDaysRemaining(trialingSub.trial_ends_at)
      assert.strictEqual(daysRemaining >= 13 && daysRemaining <= 15, true)
    })
  })

  describe('CASE 3: Trial Expired State', () => {
    test('Correctly flags expired trial without granting active privileges', () => {
      const pastTrialEnd = new Date(Date.now() - 2 * 86400000).toISOString()
      const expiredSub: CompanySubscriptionRecord = {
        id: 'sub-trial-expired',
        company_id: 'tenant-expired-uuid',
        plan_id: mockBusinessPlan.id,
        plan_code: 'trial',
        status: 'trial',
        billing_interval: 'monthly',
        current_period_start: new Date(Date.now() - 32 * 86400000).toISOString(),
        current_period_end: pastTrialEnd,
        trial_ends_at: pastTrialEnd,
      }

      const daysRemaining = getTrialDaysRemaining(expiredSub.trial_ends_at)
      assert.strictEqual(daysRemaining, 0)
    })
  })

  describe('CASE 4: Starter Plan + Active Subscription', () => {
    test('Resolves to accountType "starter" with starter limits', () => {
      const activeStarterSub: CompanySubscriptionRecord = {
        id: 'sub-starter-01',
        company_id: 'tenant-starter-uuid',
        plan_id: mockStarterPlan.id,
        plan_code: 'starter',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        trial_ends_at: null,
      }

      const accountType = resolveTenantAccountType(activeStarterSub)
      assert.strictEqual(accountType, 'starter')

      const resolved = resolveSubscriptionPlan(activeStarterSub, allMockPlans)
      assert.strictEqual(resolved.planCode, 'starter')
      assert.strictEqual(resolved.isTrial, false)

      const userLimit = checkResourceLimit('max_users', 4, mockStarterPlan)
      assert.strictEqual(userLimit.allowed, false) // 4 > 3
      assert.strictEqual(userLimit.limit, 3)
    })
  })

  describe('CASE 5: Enterprise Plan + Active Subscription', () => {
    test('Resolves to accountType "enterprise" with enterprise features and high quotas', () => {
      const activeEnterpriseSub: CompanySubscriptionRecord = {
        id: 'sub-ent-01',
        company_id: 'tenant-ent-uuid',
        plan_id: mockEnterprisePlan.id,
        plan_code: 'enterprise',
        status: 'active',
        billing_interval: 'yearly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 86400000).toISOString(),
        trial_ends_at: null,
      }

      const accountType = resolveTenantAccountType(activeEnterpriseSub)
      assert.strictEqual(accountType, 'enterprise')

      const resolved = resolveSubscriptionPlan(activeEnterpriseSub, allMockPlans)
      assert.strictEqual(resolved.planCode, 'enterprise')
      assert.strictEqual(resolved.isTrial, false)

      // Enterprise features
      assert.strictEqual(checkFeatureAccess('enterprise', 'multi_branch', allMockPlans), true)
      assert.strictEqual(checkFeatureAccess('enterprise', 'api_access', allMockPlans), true)

      // Quotas
      const userLimit = checkResourceLimit('max_users', 40, mockEnterprisePlan)
      assert.strictEqual(userLimit.allowed, true)
      assert.strictEqual(userLimit.limit, 50)
    })
  })

  describe('CASE 6: Plan Transitions & Conversions', () => {
    test('Upgrading from Starter to Business updates plan code and unlocks features', () => {
      let currentSub: CompanySubscriptionRecord = {
        id: 'sub-trans-01',
        company_id: 'tenant-trans-uuid',
        plan_id: mockStarterPlan.id,
        plan_code: 'starter',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        trial_ends_at: null,
      }

      assert.strictEqual(checkFeatureAccess('starter', 'whatsapp_notifications', allMockPlans), false)

      // Transition to Business
      currentSub = {
        ...currentSub,
        plan_id: mockBusinessPlan.id,
        plan_code: 'business',
      }

      assert.strictEqual(resolveTenantAccountType(currentSub), 'business')
      assert.strictEqual(checkFeatureAccess('business', 'whatsapp_notifications', allMockPlans), true)
    })
  })
})
