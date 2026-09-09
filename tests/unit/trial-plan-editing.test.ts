import { test, describe } from 'node:test'
import assert from 'node:assert'

export type TenantAccountType = 'trial' | 'starter' | 'business' | 'enterprise'
export type PlanCode = 'trial' | 'starter' | 'business' | 'enterprise'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired'

export interface SubscriptionPlanRecord {
  id: string
  code: PlanCode
  name: string
  name_bn: string
  description: string
  price_monthly: number
  price_yearly: number
  max_users: number
  max_branches: number
  storage_gb: number
  monthly_orders: number
  max_customers: number
  max_products: number
  features: string[]
  trial_days?: number
  is_active: boolean
  sort_order: number
}

export const DEFAULT_TRIAL_PLAN: SubscriptionPlanRecord = {
  id: 'sp-00',
  code: 'trial',
  name: 'Free Trial (14 Days)',
  name_bn: '১৪ দিনের ফ্রি ট্রায়াল',
  description: '14-day evaluation with full access to all ERP modules. No credit card required.',
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
    'multi_branch',
    'advanced_analytics',
    'advanced_permissions',
    'custom_workflows',
    'api_access',
    'priority_support',
  ],
  is_active: true,
  sort_order: 0,
}

export const DEFAULT_PLANS: SubscriptionPlanRecord[] = [
  DEFAULT_TRIAL_PLAN,
  {
    id: 'sp-01',
    code: 'starter',
    name: 'Starter Plan',
    name_bn: 'স্টার্টার প্ল্যান',
    description: 'For small shops needing limited users, basic sales, and essential customer tracking.',
    price_monthly: 1999,
    price_yearly: 19990,
    max_users: 3,
    max_branches: 1,
    storage_gb: 1,
    monthly_orders: 50,
    max_customers: 100,
    max_products: 100,
    trial_days: 0,
    features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'],
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'sp-02',
    code: 'business',
    name: 'Business Plan',
    name_bn: 'বিজনেস প্ল্যান',
    description: 'For growing factories requiring multiple departments, inventory, production, reports, and HR.',
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
    ],
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'sp-03',
    code: 'enterprise',
    name: 'Enterprise Plan',
    name_bn: 'এন্টারপ্রাইজ প্ল্যান',
    description: 'For enterprise sign makers requiring multiple branches, advanced analytics, permissions, and custom workflows.',
    price_monthly: 9999,
    price_yearly: 99990,
    max_users: 999,
    max_branches: 999,
    storage_gb: 100,
    monthly_orders: 99999,
    max_customers: 99999,
    max_products: 99999,
    trial_days: 0,
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
      'multi_branch',
      'advanced_analytics',
      'advanced_permissions',
      'custom_workflows',
      'api_access',
      'priority_support',
    ],
    is_active: true,
    sort_order: 3,
  },
]

export function getTrialPlan(plans: SubscriptionPlanRecord[] = DEFAULT_PLANS): SubscriptionPlanRecord {
  return plans.find((p) => p.code === 'trial') || DEFAULT_TRIAL_PLAN
}

export function checkFeatureAccess(
  planCode: PlanCode,
  feature: string,
  plans: SubscriptionPlanRecord[] = DEFAULT_PLANS
): boolean {
  const plan = plans.find((p) => p.code === planCode)
  if (!plan) return false
  return plan.features.includes(feature)
}

export function checkResourceLimit(
  limitKey: 'max_users' | 'max_branches' | 'storage_gb' | 'monthly_orders' | 'max_customers' | 'max_products',
  currentCount: number,
  plan: SubscriptionPlanRecord
): { limit: number; current: number; exceeded: boolean; warning: boolean; percentage: number } {
  const effectiveLimit = plan[limitKey]
  const percentage = effectiveLimit > 0 ? Math.round((currentCount / effectiveLimit) * 100) : 0
  return {
    limit: effectiveLimit,
    current: currentCount,
    exceeded: currentCount >= effectiveLimit,
    warning: percentage >= 80 && currentCount < effectiveLimit,
    percentage,
  }
}

export function resolveTenantAccountType(
  subscription?: { status?: SubscriptionStatus; plan_code?: PlanCode } | null
): TenantAccountType {
  if (!subscription) return 'trial'
  if (subscription.status === 'trial' || subscription.plan_code === 'trial') return 'trial'
  if (subscription.plan_code === 'enterprise') return 'enterprise'
  if (subscription.plan_code === 'business') return 'business'
  if (subscription.plan_code === 'starter') return 'starter'
  return 'starter'
}

describe('Trial Plan Configuration & Editing Test Suite', () => {
  // 1. Default Trial Plan Structure
  describe('1. Default Trial Plan Integrity', () => {
    test('DEFAULT_TRIAL_PLAN has valid defaults and 14 days duration', () => {
      assert.strictEqual(DEFAULT_TRIAL_PLAN.code, 'trial')
      assert.strictEqual(DEFAULT_TRIAL_PLAN.price_monthly, 0)
      assert.strictEqual(DEFAULT_TRIAL_PLAN.price_yearly, 0)
      assert.strictEqual(DEFAULT_TRIAL_PLAN.trial_days, 14)
      assert.strictEqual(DEFAULT_TRIAL_PLAN.max_users, 5)
      assert.strictEqual(DEFAULT_TRIAL_PLAN.max_branches, 1)
      assert.strictEqual(DEFAULT_TRIAL_PLAN.storage_gb, 2)
      assert.strictEqual(DEFAULT_TRIAL_PLAN.monthly_orders, 100)
      assert.strictEqual(DEFAULT_TRIAL_PLAN.max_customers, 200)
      assert.strictEqual(DEFAULT_TRIAL_PLAN.max_products, 200)
      assert.strictEqual(DEFAULT_TRIAL_PLAN.is_active, true)
      assert.ok(DEFAULT_TRIAL_PLAN.features.length >= 20)
    })

    test('DEFAULT_PLANS contains trial plan as the first entry (sort_order 0)', () => {
      const firstPlan = DEFAULT_PLANS[0]
      assert.strictEqual(firstPlan.code, 'trial')
      assert.strictEqual(firstPlan.sort_order, 0)

      const trialFound = getTrialPlan(DEFAULT_PLANS)
      assert.strictEqual(trialFound.code, 'trial')
      assert.strictEqual(trialFound.id, 'sp-00')
    })
  })

  // 2. Trial Plan Editing Simulation
  describe('2. Trial Plan Editing & Customization', () => {
    test('Can customize trial duration from 14 days to 30 days', () => {
      const modifiedTrialPlan: SubscriptionPlanRecord = {
        ...DEFAULT_TRIAL_PLAN,
        trial_days: 30,
        name: 'Extended Enterprise Evaluation (30 Days)',
        name_bn: '৩০ দিনের এন্টারপ্রাইজ ফ্রি ট্রায়াল',
      }

      assert.strictEqual(modifiedTrialPlan.trial_days, 30)
      assert.strictEqual(modifiedTrialPlan.name, 'Extended Enterprise Evaluation (30 Days)')
    })

    test('Can customize trial resource quotas (users, storage, orders)', () => {
      const customizedTrial: SubscriptionPlanRecord = {
        ...DEFAULT_TRIAL_PLAN,
        max_users: 10,
        max_branches: 3,
        storage_gb: 20,
        monthly_orders: 500,
        max_customers: 1000,
        max_products: 1000,
      }

      assert.strictEqual(customizedTrial.max_users, 10)
      assert.strictEqual(customizedTrial.max_branches, 3)
      assert.strictEqual(customizedTrial.storage_gb, 20)
      assert.strictEqual(customizedTrial.monthly_orders, 500)

      // Test limit checking on customized trial
      const withinUsers = checkResourceLimit('max_users', 8, customizedTrial)
      assert.strictEqual(withinUsers.exceeded, false)
      assert.strictEqual(withinUsers.warning, true) // 80%

      const overUsers = checkResourceLimit('max_users', 10, customizedTrial)
      assert.strictEqual(overUsers.exceeded, true)
    })

    test('Can customize feature access gating matrix for trial accounts', () => {
      // Trial with only basic sales features
      const restrictedTrial: SubscriptionPlanRecord = {
        ...DEFAULT_TRIAL_PLAN,
        features: ['basic_sales', 'basic_customers', 'quotation_pdf'],
      }

      const customPlans = [restrictedTrial, ...DEFAULT_PLANS.filter((p) => p.code !== 'trial')]

      assert.strictEqual(checkFeatureAccess('trial', 'basic_sales', customPlans), true)
      assert.strictEqual(checkFeatureAccess('trial', 'quotation_pdf', customPlans), true)
      assert.strictEqual(checkFeatureAccess('trial', 'production_kanban', customPlans), false)
      assert.strictEqual(checkFeatureAccess('trial', 'hr_payroll', customPlans), false)
      assert.strictEqual(checkFeatureAccess('trial', 'api_access', customPlans), false)
    })
  })

  // 3. Account Type Resolution with Trial Plan Code
  describe('3. Account Type Resolution with Trial Plan', () => {
    test('Resolves to trial when plan_code is trial', () => {
      const result = resolveTenantAccountType({ status: 'active', plan_code: 'trial' })
      assert.strictEqual(result, 'trial')
    })

    test('Resolves to trial when status is trial regardless of plan_code', () => {
      assert.strictEqual(resolveTenantAccountType({ status: 'trial', plan_code: 'business' }), 'trial')
      assert.strictEqual(resolveTenantAccountType({ status: 'trial', plan_code: 'enterprise' }), 'trial')
    })
  })
})
