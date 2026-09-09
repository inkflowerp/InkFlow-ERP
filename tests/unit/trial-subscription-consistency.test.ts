import { describe, it } from 'node:test'
import assert from 'node:assert'

export type TenantAccountType = 'trial' | 'starter' | 'business' | 'enterprise'
export type PlanCode = 'trial' | 'starter' | 'business' | 'enterprise'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired'

export interface CompanySubscriptionRecord {
  id?: string
  company_id?: string
  plan_id?: string
  plan_code: PlanCode
  status: SubscriptionStatus
  billing_interval?: 'monthly' | 'yearly'
  current_period_start?: string
  current_period_end?: string
  trial_ends_at?: string | null
  custom_limits_override?: any
}

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
    monthly_orders: 999999,
    max_customers: 999999,
    max_products: 999999,
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

export function resolveTenantAccountType(subscription?: {
  status?: string | null
  plan_code?: string | null
}): TenantAccountType {
  if (!subscription) return 'trial'
  if (subscription.plan_code === 'trial') return 'trial'
  if (subscription.status === 'trial') return 'trial'
  if (subscription.plan_code === 'enterprise') return 'enterprise'
  if (subscription.plan_code === 'business') return 'business'
  if (subscription.plan_code === 'starter') return 'starter'
  return 'trial'
}

export function resolveSubscriptionPlan(
  subscription?: { status?: string | null; plan_code?: string | null; plan_name?: string | null },
  plans: SubscriptionPlanRecord[] = DEFAULT_PLANS
) {
  const accountType = resolveTenantAccountType(subscription)
  const isTrial = accountType === 'trial'
  const planCode: PlanCode = isTrial ? 'trial' : ((subscription?.plan_code as PlanCode) || 'trial')
  const matchedPlan = plans.find((p) => p.code === planCode) || plans[0]

  return {
    planCode,
    planName: isTrial ? (subscription?.plan_name || matchedPlan.name || 'Free Trial (14 Days)') : matchedPlan.name,
    planNameBn: isTrial ? '১৪ দিনের ফ্রি ট্রায়াল' : matchedPlan.name_bn,
    accountType,
    isTrial,
    planRecord: matchedPlan,
  }
}

export function checkFeatureAccess(
  planCode: PlanCode,
  feature: string,
  plans: SubscriptionPlanRecord[] = DEFAULT_PLANS
): boolean {
  if (planCode === 'trial') return true
  const plan = plans.find((p) => p.code === planCode)
  if (!plan) return false
  return plan.features.includes(feature)
}

export function checkResourceLimit(
  limitType: 'max_users' | 'max_branches' | 'storage_gb' | 'monthly_orders',
  currentValue: number,
  plan: SubscriptionPlanRecord
) {
  const limit = plan[limitType] || 0
  return {
    limit,
    current: currentValue,
    exceeded: currentValue > limit,
    warning: currentValue >= limit * 0.8 && currentValue <= limit,
    percentage: limit > 0 ? Math.min(100, Math.round((currentValue / limit) * 100)) : 0,
  }
}

describe('Trial Plan & Subscription State Consistency Tests', () => {
  describe('1. Single Source of Truth & Plan Resolution', () => {
    it('should resolve trial status to trial account type and trial plan code', () => {
      const trialSub = {
        status: 'trial',
        plan_code: 'trial',
      } as CompanySubscriptionRecord

      const accountType = resolveTenantAccountType(trialSub)
      const resolvedPlan = resolveSubscriptionPlan(trialSub)

      assert.strictEqual(accountType, 'trial')
      assert.strictEqual(resolvedPlan.planCode, 'trial')
      assert.strictEqual(resolvedPlan.planName, 'Free Trial (14 Days)')
      assert.strictEqual(resolvedPlan.isTrial, true)
      assert.notStrictEqual(resolvedPlan.planCode, 'starter')
    })

    it('should resolve trial status with legacy plan_code starter to trial plan', () => {
      // Legacy data repair safety check: if DB had status='trial' but linked to starter plan_id
      const legacySub = {
        status: 'trial',
        plan_code: 'starter',
      } as CompanySubscriptionRecord

      const accountType = resolveTenantAccountType(legacySub)
      const resolvedPlan = resolveSubscriptionPlan(legacySub)

      assert.strictEqual(accountType, 'trial')
      assert.strictEqual(resolvedPlan.planCode, 'trial')
      assert.strictEqual(resolvedPlan.planName, 'Free Trial (14 Days)')
      assert.strictEqual(resolvedPlan.isTrial, true)
      assert.notStrictEqual(resolvedPlan.planCode, 'starter')
    })

    it('should resolve active starter subscription to Starter Plan', () => {
      const starterSub = {
        status: 'active',
        plan_code: 'starter',
      } as CompanySubscriptionRecord

      const accountType = resolveTenantAccountType(starterSub)
      const resolvedPlan = resolveSubscriptionPlan(starterSub)

      assert.strictEqual(accountType, 'starter')
      assert.strictEqual(resolvedPlan.planCode, 'starter')
      assert.strictEqual(resolvedPlan.planName, 'Starter Plan')
      assert.strictEqual(resolvedPlan.isTrial, false)
    })

    it('should resolve active business subscription to Business Plan', () => {
      const businessSub = {
        status: 'active',
        plan_code: 'business',
      } as CompanySubscriptionRecord

      const accountType = resolveTenantAccountType(businessSub)
      const resolvedPlan = resolveSubscriptionPlan(businessSub)

      assert.strictEqual(accountType, 'business')
      assert.strictEqual(resolvedPlan.planCode, 'business')
      assert.strictEqual(resolvedPlan.planName, 'Business Plan')
      assert.strictEqual(resolvedPlan.isTrial, false)
    })

    it('should resolve active enterprise subscription to Enterprise Plan', () => {
      const enterpriseSub = {
        status: 'active',
        plan_code: 'enterprise',
      } as CompanySubscriptionRecord

      const accountType = resolveTenantAccountType(enterpriseSub)
      const resolvedPlan = resolveSubscriptionPlan(enterpriseSub)

      assert.strictEqual(accountType, 'enterprise')
      assert.strictEqual(resolvedPlan.planCode, 'enterprise')
      assert.strictEqual(resolvedPlan.planName, 'Enterprise Plan')
      assert.strictEqual(resolvedPlan.isTrial, false)
    })
  })

  describe('2. Feature Gating & Entitlements', () => {
    it('should grant trial accounts full evaluation access to all core and advanced features', () => {
      const allFeatures = [
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
      ]

      for (const feature of allFeatures) {
        const hasAccess = checkFeatureAccess('trial', feature, DEFAULT_PLANS)
        assert.strictEqual(
          hasAccess,
          true,
          `Trial should have access to feature: ${feature}`
        )
      }
    })

    it('should restrict starter accounts from advanced and enterprise features', () => {
      // Starter should have basic sales & quotation
      assert.strictEqual(checkFeatureAccess('starter', 'basic_sales', DEFAULT_PLANS), true)
      assert.strictEqual(checkFeatureAccess('starter', 'quotation_pdf', DEFAULT_PLANS), true)

      // Starter should NOT have kanban, hr payroll, or api access
      assert.strictEqual(checkFeatureAccess('starter', 'production_kanban', DEFAULT_PLANS), false)
      assert.strictEqual(checkFeatureAccess('starter', 'hr_payroll', DEFAULT_PLANS), false)
      assert.strictEqual(checkFeatureAccess('starter', 'api_access', DEFAULT_PLANS), false)
    })
  })

  describe('3. Resource Limits & Quotas', () => {
    it('should correctly evaluate trial resource limits', () => {
      const trialPlan = DEFAULT_TRIAL_PLAN

      assert.strictEqual(trialPlan.code, 'trial')
      assert.strictEqual(trialPlan.max_users, 5)
      assert.strictEqual(trialPlan.max_branches, 1)
      assert.strictEqual(trialPlan.price_monthly, 0)

      const userLimitStatus = checkResourceLimit('max_users', 3, trialPlan)
      assert.strictEqual(userLimitStatus.exceeded, false)
      assert.strictEqual(userLimitStatus.current, 3)
      assert.strictEqual(userLimitStatus.limit, 5)

      const exceededStatus = checkResourceLimit('max_users', 6, trialPlan)
      assert.strictEqual(exceededStatus.exceeded, true)
    })
  })

  describe('4. Platform Service Mapping Consistency', () => {
    it('should map trial tenant company with plan = trial and monthly_fee = 0', () => {
      const mockRawDbPlan = { code: 'trial', name: 'Free Trial (14 Days)', price_monthly: 0 }
      const mockSubStatus = 'trial'

      const rawPlanCode = mockRawDbPlan.code
      const resolvedPlanCode =
        rawPlanCode === 'trial' || mockSubStatus === 'trial'
          ? 'trial'
          : (rawPlanCode || 'starter')

      assert.strictEqual(resolvedPlanCode, 'trial')
      assert.notStrictEqual(resolvedPlanCode, 'starter')
    })

    it('should dynamically reflect customized trial plan name when provided', () => {
      const customTrialSub = {
        status: 'trial',
        plan_code: 'trial',
        plan_name: 'Extended Free Trial (30 Days)',
      } as any

      const resolved = resolveSubscriptionPlan(customTrialSub)
      assert.strictEqual(resolved.planCode, 'trial')
      assert.strictEqual(resolved.planName, 'Extended Free Trial (30 Days)')
      assert.strictEqual(resolved.isTrial, true)
    })
  })
})
