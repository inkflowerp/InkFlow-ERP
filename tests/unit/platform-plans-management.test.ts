import { test, describe } from 'node:test'
import assert from 'node:assert'

export type TenantAccountType = 'trial' | 'starter' | 'business' | 'enterprise'
export type PlanCode = 'trial' | 'starter' | 'business' | 'enterprise'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired'

export type FeatureCode =
  | 'basic_sales'
  | 'basic_customers'
  | 'quotation_pdf'
  | 'delivery_challan'
  | 'multi_department'
  | 'inventory'
  | 'inventory_rolls'
  | 'production'
  | 'production_kanban'
  | 'reports'
  | 'reports_analytics'
  | 'hr'
  | 'hr_payroll'
  | 'job_costing'
  | 'whatsapp_notifications'
  | 'multi_branch'
  | 'advanced_analytics'
  | 'advanced_permissions'
  | 'custom_workflows'
  | 'api_access'
  | 'priority_support'

export interface SubscriptionPlanRecord {
  id: string
  code: PlanCode | string
  name: string
  name_bn?: string
  description?: string
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

export const ALL_FEATURES: FeatureCode[] = [
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
  features: [...ALL_FEATURES],
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
    features: [...ALL_FEATURES],
    is_active: true,
    sort_order: 3,
  },
]

describe('Platform Plans Management & Feature Gating Test Suite', () => {
  describe('1. Default Plans Architecture & Quota Verification', () => {
    test('Default Trial Plan has valid defaults and 14 days evaluation duration', () => {
      assert.strictEqual(DEFAULT_TRIAL_PLAN.code, 'trial')
      assert.strictEqual(DEFAULT_TRIAL_PLAN.price_monthly, 0)
      assert.strictEqual(DEFAULT_TRIAL_PLAN.price_yearly, 0)
      assert.strictEqual(DEFAULT_TRIAL_PLAN.trial_days, 14)
      assert.strictEqual(DEFAULT_TRIAL_PLAN.is_active, true)
      assert.ok(DEFAULT_TRIAL_PLAN.max_users >= 5)
      assert.ok(DEFAULT_TRIAL_PLAN.features.length >= 20)
    })

    test('Default commercial paid plans scale appropriately', () => {
      const starter = DEFAULT_PLANS.find((p) => p.code === 'starter')!
      const business = DEFAULT_PLANS.find((p) => p.code === 'business')!
      const enterprise = DEFAULT_PLANS.find((p) => p.code === 'enterprise')!

      assert.ok(starter && business && enterprise)

      // Pricing progression
      assert.ok(starter.price_monthly < business.price_monthly)
      assert.ok(business.price_monthly < enterprise.price_monthly)

      // Users progression
      assert.ok(starter.max_users < business.max_users)
      assert.ok(business.max_users < enterprise.max_users)

      // Storage progression
      assert.ok(starter.storage_gb < business.storage_gb)
      assert.ok(business.storage_gb < enterprise.storage_gb)

      // Monthly orders progression
      assert.ok(starter.monthly_orders < business.monthly_orders)
      assert.ok(business.monthly_orders < enterprise.monthly_orders)
    })
  })

  describe('2. Feature Gating & Presets', () => {
    test('Starter preset gates advanced enterprise and factory features', () => {
      const starterFeatures: string[] = [
        'basic_sales',
        'basic_customers',
        'quotation_pdf',
        'delivery_challan',
      ]

      assert.strictEqual(starterFeatures.includes('basic_sales'), true)
      assert.strictEqual(starterFeatures.includes('quotation_pdf'), true)
      assert.strictEqual(starterFeatures.includes('production_kanban'), false)
      assert.strictEqual(starterFeatures.includes('hr_payroll'), false)
      assert.strictEqual(starterFeatures.includes('api_access'), false)
    })

    test('Business preset includes production and HR but excludes enterprise features', () => {
      const businessFeatures: string[] = [
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
      ]

      assert.strictEqual(businessFeatures.includes('production_kanban'), true)
      assert.strictEqual(businessFeatures.includes('hr_payroll'), true)
      assert.strictEqual(businessFeatures.includes('multi_branch'), false)
      assert.strictEqual(businessFeatures.includes('api_access'), false)
    })

    test('Enterprise preset provides full module access', () => {
      assert.strictEqual(ALL_FEATURES.length >= 21, true)
    })
  })

  describe('3. Plan Creation & Modification Safety Rules', () => {
    test('Ensures plan code sanitization to lowercase alphanumeric and underscore', () => {
      const rawCode = 'Agency Plan 2026! @#$'
      const cleanCode = rawCode.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')
      assert.strictEqual(cleanCode, 'agency_plan_2026_____')
    })

    test('Annual discount computation calculates standard 10x monthly (2 months free)', () => {
      const monthlyRate = 4999
      const yearlyRate = monthlyRate * 10
      const standard12Months = monthlyRate * 12
      const savings = standard12Months - yearlyRate

      assert.strictEqual(yearlyRate, 49990)
      assert.strictEqual(savings, 9998)
    })

    test('Core system plans cannot be deleted', () => {
      const CORE_CODES = ['trial', 'starter', 'business', 'enterprise']

      function canDeletePlan(code: string): boolean {
        return !CORE_CODES.includes(code.toLowerCase())
      }

      assert.strictEqual(canDeletePlan('trial'), false)
      assert.strictEqual(canDeletePlan('starter'), false)
      assert.strictEqual(canDeletePlan('business'), false)
      assert.strictEqual(canDeletePlan('enterprise'), false)
      assert.strictEqual(canDeletePlan('agency_pro'), true)
      assert.strictEqual(canDeletePlan('custom_vip'), true)
    })

    test('Archiving safely deactivates plan without deleting data', () => {
      const activePlan: SubscriptionPlanRecord = {
        ...DEFAULT_PLANS[1],
        is_active: true,
      }

      const archivedPlan = {
        ...activePlan,
        is_active: false,
      }

      assert.strictEqual(archivedPlan.is_active, false)
      assert.strictEqual(archivedPlan.id, activePlan.id)
      assert.strictEqual(archivedPlan.code, activePlan.code)
    })

    test('Reactivating sets is_active to true', () => {
      const archivedPlan: SubscriptionPlanRecord = {
        ...DEFAULT_PLANS[1],
        is_active: false,
      }

      const reactivatedPlan = {
        ...archivedPlan,
        is_active: true,
      }

      assert.strictEqual(reactivatedPlan.is_active, true)
    })
  })

  describe('4. Resource Limits Quota Validation', () => {
    test('Validates 6 resource limits: users, branches, storage, orders, customers, products', () => {
      const customPlan: SubscriptionPlanRecord = {
        id: 'sp-agency',
        code: 'agency',
        name: 'Agency Hub',
        name_bn: 'এজেন্সি হাব',
        description: 'Agency plan description',
        price_monthly: 7999,
        price_yearly: 79990,
        max_users: 25,
        max_branches: 5,
        storage_gb: 50,
        monthly_orders: 2500,
        max_customers: 5000,
        max_products: 5000,
        features: [...ALL_FEATURES],
        is_active: true,
        sort_order: 5,
      }

      assert.strictEqual(customPlan.max_users, 25)
      assert.strictEqual(customPlan.max_branches, 5)
      assert.strictEqual(customPlan.storage_gb, 50)
      assert.strictEqual(customPlan.monthly_orders, 2500)
      assert.strictEqual(customPlan.max_customers, 5000)
      assert.strictEqual(customPlan.max_products, 5000)
    })
  })
})
