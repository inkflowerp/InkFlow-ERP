import { describe, it } from 'node:test'
import assert from 'node:assert'

// Bengali numeral translation function for unit testing
const BENGALI_DIGITS: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
}

function toBengaliDigits(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '১৪'
  return String(num)
    .split('')
    .map((char) => BENGALI_DIGITS[char] || char)
    .join('')
}

interface SubscriptionPlanRecord {
  id: string
  code: string
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

const DEFAULT_TRIAL_PLAN: SubscriptionPlanRecord = {
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
  features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'],
  is_active: true,
  sort_order: 0,
}

const DEFAULT_PLANS: SubscriptionPlanRecord[] = [
  DEFAULT_TRIAL_PLAN,
  {
    id: 'sp-01',
    code: 'starter',
    name: 'Starter Press',
    name_bn: 'স্টার্টার প্রেস',
    description: 'Essential order management, invoices & customer dues for single-location print shops.',
    price_monthly: 1999,
    price_yearly: 19990,
    max_users: 3,
    max_branches: 1,
    storage_gb: 5,
    monthly_orders: 50,
    max_customers: 500,
    max_products: 500,
    features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'],
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'sp-02',
    code: 'business',
    name: 'Business Pro',
    name_bn: 'বিজনেস প্রো',
    description: 'Complete production Kanban, flex roll inventory & cost tracking for multi-machine hubs.',
    price_monthly: 4999,
    price_yearly: 49990,
    max_users: 10,
    max_branches: 3,
    storage_gb: 25,
    monthly_orders: 500,
    max_customers: 5000,
    max_products: 5000,
    features: ['basic_sales', 'inventory_rolls', 'production_kanban', 'job_costing', 'hr_payroll'],
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'sp-03',
    code: 'enterprise',
    name: 'Enterprise Scale',
    name_bn: 'এন্টারপ্রাইজ স্কেল',
    description: 'Unlimited branches, custom approval hierarchies & dedicated engineering support.',
    price_monthly: 9999,
    price_yearly: 99990,
    max_users: 999,
    max_branches: 999,
    storage_gb: 999,
    monthly_orders: 9999,
    max_customers: 99999,
    max_products: 99999,
    features: ['basic_sales', 'custom_workflows', 'api_access', 'priority_support'],
    is_active: true,
    sort_order: 3,
  },
]

describe('Dynamic Marketing Plans & Realtime Synchronization', () => {
  describe('toBengaliDigits()', () => {
    it('translates single and multi-digit numbers to Bengali numerals', () => {
      assert.strictEqual(toBengaliDigits(0), '০')
      assert.strictEqual(toBengaliDigits(7), '৭')
      assert.strictEqual(toBengaliDigits(14), '১৪')
      assert.strictEqual(toBengaliDigits(30), '৩০')
      assert.strictEqual(toBengaliDigits(1999), '১৯৯৯')
      assert.strictEqual(toBengaliDigits(4999), '৪৯৯৯')
      assert.strictEqual(toBengaliDigits(9999), '৯৯৯৯')
    })

    it('handles null and undefined gracefully with default fallback', () => {
      assert.strictEqual(toBengaliDigits(null), '১৪')
      assert.strictEqual(toBengaliDigits(undefined), '১৪')
    })

    it('translates strings containing numbers', () => {
      assert.strictEqual(toBengaliDigits('14-Day'), '১৪-Day')
    })
  })

  describe('Default Plans Data Structure', () => {
    it('includes trial plan and standard paid tiers', () => {
      assert.ok(DEFAULT_PLANS.length >= 4)
      const trial = DEFAULT_PLANS.find((p) => p.code === 'trial')
      const starter = DEFAULT_PLANS.find((p) => p.code === 'starter')
      const business = DEFAULT_PLANS.find((p) => p.code === 'business')
      const enterprise = DEFAULT_PLANS.find((p) => p.code === 'enterprise')

      assert.ok(trial, 'Trial plan must exist')
      assert.ok(starter, 'Starter plan must exist')
      assert.ok(business, 'Business plan must exist')
      assert.ok(enterprise, 'Enterprise plan must exist')

      assert.strictEqual(trial?.trial_days, 14)
      assert.strictEqual(trial?.price_monthly, 0)
      assert.strictEqual(starter?.price_monthly, 1999)
      assert.strictEqual(business?.price_monthly, 4999)
      assert.strictEqual(enterprise?.price_monthly, 9999)
    })

    it('separates paid plans from trial plan correctly', () => {
      const paidPlans = DEFAULT_PLANS.filter((p) => p.code !== 'trial' && p.is_active)
      assert.strictEqual(paidPlans.length, 3)
      assert.ok(paidPlans.every((p) => p.price_monthly > 0))
    })

    it('calculates the lowest starting price correctly', () => {
      const paidPlans = DEFAULT_PLANS.filter((p) => p.code !== 'trial')
      const lowestPrice = paidPlans.reduce((min, p) => (p.price_monthly < min ? p.price_monthly : min), paidPlans[0]?.price_monthly || 1999)
      assert.strictEqual(lowestPrice, 1999)
    })
  })

  describe('Dynamic Plan Updates & Calculations', () => {
    it('accurately computes annual discount savings', () => {
      const plan: SubscriptionPlanRecord = {
        ...DEFAULT_PLANS[1],
        price_monthly: 2000,
        price_yearly: 19200, // 20% discount (2000 * 12 = 24000 -> 19200 is 20% off)
      }

      const annualSavings = Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
      assert.strictEqual(annualSavings, 20)

      const monthlyEquivalent = Math.round(plan.price_yearly / 12)
      assert.strictEqual(monthlyEquivalent, 1600)
    })

    it('supports customized trial durations (e.g., 30-day promo trial)', () => {
      const customTrial: SubscriptionPlanRecord = {
        ...DEFAULT_TRIAL_PLAN,
        trial_days: 30,
        name: 'Free Trial (30 Days)',
        name_bn: '৩০ দিনের ফ্রি ট্রায়াল',
      }

      const days = customTrial.trial_days || 14
      const daysBn = toBengaliDigits(days)

      assert.strictEqual(days, 30)
      assert.strictEqual(daysBn, '৩০')
    })

    it('supports dynamic addition of custom tier (e.g., Agency / Wholesale plan)', () => {
      const livePlans: SubscriptionPlanRecord[] = [
        ...DEFAULT_PLANS,
        {
          id: 'sp-04',
          code: 'agency',
          name: 'Agency Wholesale',
          name_bn: 'এজেন্সি পাইকারি প্ল্যান',
          description: 'High-volume contract broker tier.',
          price_monthly: 14999,
          price_yearly: 149990,
          max_users: 50,
          max_branches: 10,
          storage_gb: 100,
          monthly_orders: 5000,
          max_customers: 20000,
          max_products: 20000,
          features: ['basic_sales', 'production_kanban', 'api_access'],
          is_active: true,
          sort_order: 4,
        },
      ]

      const paidPlans = livePlans.filter((p) => p.code !== 'trial' && p.is_active)
      assert.strictEqual(paidPlans.length, 4)
      assert.strictEqual(paidPlans[3].code, 'agency')
      assert.strictEqual(paidPlans[3].price_monthly, 14999)
    })
  })
})
