import { test, describe } from 'node:test'
import assert from 'node:assert'

// ==============================================================================
// INKFLOW SaaS — Tenant Account Types (Trial, Starter, Business, Enterprise)
// Unit Test Suite verifying account type resolution, quotas, and entitlements.
// ==============================================================================

export type TenantAccountType = 'trial' | 'starter' | 'business' | 'enterprise'
export type PlanCode = 'starter' | 'business' | 'enterprise'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired'

export interface TenantAccountTypeMeta {
  type: TenantAccountType
  nameEn: string
  nameBn: string
  badgeTextEn: string
  badgeTextBn: string
  color: string
  badgeClass: string
  priceMonthly: number
  priceYearly: number
  maxUsers: number
  maxBranches: number
  monthlyOrders: number
  descriptionEn: string
  descriptionBn: string
}

export function resolveTenantAccountType(
  subscription?: { status?: SubscriptionStatus; plan_code?: PlanCode } | null
): TenantAccountType {
  if (!subscription) return 'trial'
  if (subscription.status === 'trial') return 'trial'
  if (subscription.plan_code === 'enterprise') return 'enterprise'
  if (subscription.plan_code === 'business') return 'business'
  if (subscription.plan_code === 'starter') return 'starter'
  return 'starter'
}

export const ACCOUNT_TYPE_METADATA: Record<TenantAccountType, TenantAccountTypeMeta> = {
  trial: {
    type: 'trial',
    nameEn: 'Free Trial (14 Days)',
    nameBn: '১৪ দিনের ফ্রি ট্রায়াল',
    badgeTextEn: 'Trial',
    badgeTextBn: 'ফ্রি ট্রায়াল',
    color: 'amber',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
    priceMonthly: 0,
    priceYearly: 0,
    maxUsers: 5,
    maxBranches: 1,
    monthlyOrders: 100,
    descriptionEn: '14-day evaluation with full access to all ERP modules. No credit card required.',
    descriptionBn: '১৪ দিনের জন্য সকল মডিউল ব্যবহারের পূর্ণ সুযোগ। কোনো ক্রেডিট কার্ডের প্রয়োজন নেই।',
  },
  starter: {
    type: 'starter',
    nameEn: 'Starter Plan',
    nameBn: 'স্টার্টার প্ল্যান',
    badgeTextEn: 'Starter',
    badgeTextBn: 'স্টার্টার',
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800',
    priceMonthly: 1999,
    priceYearly: 19990,
    maxUsers: 3,
    maxBranches: 1,
    monthlyOrders: 50,
    descriptionEn: 'For small shops needing limited users, basic sales, and essential customer tracking.',
    descriptionBn: 'ছোট প্রেস ও ডিজিটাল প্রিন্ট দোকানের জন্য প্রয়োজনীয় বিলিং ও জব অর্ডার ব্যবস্থাপনা।',
  },
  business: {
    type: 'business',
    nameEn: 'Business Plan',
    nameBn: 'বিজনেস প্ল্যান',
    badgeTextEn: 'Business',
    badgeTextBn: 'বিজনেস',
    color: 'purple',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800',
    priceMonthly: 4999,
    priceYearly: 49990,
    maxUsers: 10,
    maxBranches: 3,
    monthlyOrders: 500,
    descriptionEn: 'For growing factories requiring multiple departments, inventory, production, reports, and HR.',
    descriptionBn: 'মাঝারি প্রিন্টিং ফ্যাক্টরির ইনভেন্টরি, প্রোডাকশন কানবান বোর্ড এবং এইচআর পেরোল।',
  },
  enterprise: {
    type: 'enterprise',
    nameEn: 'Enterprise Plan',
    nameBn: 'এন্টারপ্রাইজ প্ল্যান',
    badgeTextEn: 'Enterprise',
    badgeTextBn: 'এন্টারপ্রাইজ',
    color: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
    priceMonthly: 9999,
    priceYearly: 99990,
    maxUsers: 999,
    maxBranches: 999,
    monthlyOrders: 99999,
    descriptionEn: 'For enterprise sign makers requiring multiple branches, advanced analytics, permissions, and custom workflows.',
    descriptionBn: 'বহু শাখা সম্বলিত বড় প্রিন্টিং প্রতিষ্ঠানের জন্য কাস্টম ওয়ার্কফ্লো, এপিআই ও ডেডিকেটেড সাপোর্ট।',
  },
}

export function checkTierFeature(tier: TenantAccountType, feature: string): boolean {
  if (tier === 'trial' || tier === 'enterprise') return true
  if (tier === 'business') {
    return ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan', 'inventory_rolls', 'production_kanban', 'hr_payroll', 'whatsapp_notifications'].includes(feature)
  }
  if (tier === 'starter') {
    return ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'].includes(feature)
  }
  return false
}

export function checkTierLimit(
  tier: TenantAccountType,
  limitKey: 'maxUsers' | 'maxBranches' | 'monthlyOrders',
  current: number
): { exceeded: boolean; limit: number; remaining: number } {
  const meta = ACCOUNT_TYPE_METADATA[tier]
  const limit = meta[limitKey]
  const exceeded = current > limit
  return {
    exceeded,
    limit,
    remaining: Math.max(0, limit - current),
  }
}

describe('Tenant Account Types (Trial, Starter, Business, Enterprise) Test Suite', () => {
  // 1. Account Type Resolution
  describe('1. Account Type Resolution', () => {
    test('Identifies Trial account when subscription status is trial', () => {
      const type = resolveTenantAccountType({ status: 'trial', plan_code: 'business' })
      assert.strictEqual(type, 'trial')
    })

    test('Identifies Starter account when status is active and plan is starter', () => {
      const type = resolveTenantAccountType({ status: 'active', plan_code: 'starter' })
      assert.strictEqual(type, 'starter')
    })

    test('Identifies Business account when status is active and plan is business', () => {
      const type = resolveTenantAccountType({ status: 'active', plan_code: 'business' })
      assert.strictEqual(type, 'business')
    })

    test('Identifies Enterprise account when status is active and plan is enterprise', () => {
      const type = resolveTenantAccountType({ status: 'active', plan_code: 'enterprise' })
      assert.strictEqual(type, 'enterprise')
    })

    test('Defaults safely to trial when subscription is null or undefined', () => {
      assert.strictEqual(resolveTenantAccountType(null), 'trial')
      assert.strictEqual(resolveTenantAccountType(undefined), 'trial')
    })
  })

  // 2. Account Type Metadata Integrity
  describe('2. Account Type Metadata Integrity', () => {
    const accountTypes: TenantAccountType[] = ['trial', 'starter', 'business', 'enterprise']

    test('All 4 account types have valid metadata records', () => {
      for (const type of accountTypes) {
        const meta = ACCOUNT_TYPE_METADATA[type]
        assert.ok(meta, `Missing metadata for ${type}`)
        assert.strictEqual(meta.type, type)
        assert.ok(meta.nameEn.length > 0)
        assert.ok(meta.nameBn.length > 0)
        assert.ok(meta.badgeTextEn.length > 0)
        assert.ok(meta.badgeClass.length > 0)
        assert.ok(meta.descriptionEn.length > 0)
      }
    })

    test('Pricing and quotas scale appropriately across tiers', () => {
      const starter = ACCOUNT_TYPE_METADATA.starter
      const business = ACCOUNT_TYPE_METADATA.business
      const enterprise = ACCOUNT_TYPE_METADATA.enterprise

      // Starter: ৳1,999/mo, 3 users, 1 branch
      assert.strictEqual(starter.priceMonthly, 1999)
      assert.strictEqual(starter.maxUsers, 3)
      assert.strictEqual(starter.maxBranches, 1)

      // Business: ৳4,999/mo, 10 users, 3 branches
      assert.strictEqual(business.priceMonthly, 4999)
      assert.strictEqual(business.maxUsers, 10)
      assert.strictEqual(business.maxBranches, 3)

      // Enterprise: ৳9,999/mo, 999 users, 999 branches
      assert.strictEqual(enterprise.priceMonthly, 9999)
      assert.strictEqual(enterprise.maxUsers, 999)
      assert.strictEqual(enterprise.maxBranches, 999)

      // Prices strictly increase
      assert.ok(starter.priceMonthly < business.priceMonthly)
      assert.ok(business.priceMonthly < enterprise.priceMonthly)
    })
  })

  // 3. Feature Entitlements & Gating
  describe('3. Feature Entitlements & Gating', () => {
    test('Trial tier provides unrestricted evaluation access to all modules', () => {
      assert.strictEqual(checkTierFeature('trial', 'basic_sales'), true)
      assert.strictEqual(checkTierFeature('trial', 'inventory_rolls'), true)
      assert.strictEqual(checkTierFeature('trial', 'production_kanban'), true)
      assert.strictEqual(checkTierFeature('trial', 'hr_payroll'), true)
      assert.strictEqual(checkTierFeature('trial', 'api_access'), true)
    })

    test('Starter plan allows basic sales & quotes but gates production & HR', () => {
      assert.strictEqual(checkTierFeature('starter', 'basic_sales'), true)
      assert.strictEqual(checkTierFeature('starter', 'quotation_pdf'), true)
      assert.strictEqual(checkTierFeature('starter', 'production_kanban'), false)
      assert.strictEqual(checkTierFeature('starter', 'hr_payroll'), false)
      assert.strictEqual(checkTierFeature('starter', 'api_access'), false)
    })

    test('Business plan unlocks inventory, production kanban, and HR payroll', () => {
      assert.strictEqual(checkTierFeature('business', 'basic_sales'), true)
      assert.strictEqual(checkTierFeature('business', 'inventory_rolls'), true)
      assert.strictEqual(checkTierFeature('business', 'production_kanban'), true)
      assert.strictEqual(checkTierFeature('business', 'hr_payroll'), true)
      assert.strictEqual(checkTierFeature('business', 'whatsapp_notifications'), true)
      assert.strictEqual(checkTierFeature('business', 'api_access'), false)
    })

    test('Enterprise plan unlocks all advanced enterprise capabilities', () => {
      assert.strictEqual(checkTierFeature('enterprise', 'multi_branch'), true)
      assert.strictEqual(checkTierFeature('enterprise', 'advanced_permissions'), true)
      assert.strictEqual(checkTierFeature('enterprise', 'custom_workflows'), true)
      assert.strictEqual(checkTierFeature('enterprise', 'api_access'), true)
      assert.strictEqual(checkTierFeature('enterprise', 'priority_support'), true)
    })
  })

  // 4. Resource Limits Enforcement
  describe('4. Resource Limits Enforcement', () => {
    test('Starter user ceiling prevents 4th user seat', () => {
      const withinLimit = checkTierLimit('starter', 'maxUsers', 2)
      assert.strictEqual(withinLimit.exceeded, false)
      assert.strictEqual(withinLimit.remaining, 1)

      const atLimit = checkTierLimit('starter', 'maxUsers', 3)
      assert.strictEqual(atLimit.exceeded, false)
      assert.strictEqual(atLimit.remaining, 0)

      const overLimit = checkTierLimit('starter', 'maxUsers', 4)
      assert.strictEqual(overLimit.exceeded, true)
    })

    test('Business branch ceiling allows up to 3 locations', () => {
      const allowed = checkTierLimit('business', 'maxBranches', 2)
      assert.strictEqual(allowed.exceeded, false)
      assert.strictEqual(allowed.remaining, 1)

      const capped = checkTierLimit('business', 'maxBranches', 3)
      assert.strictEqual(capped.exceeded, false)
      assert.strictEqual(capped.remaining, 0)

      const blocked = checkTierLimit('business', 'maxBranches', 4)
      assert.strictEqual(blocked.exceeded, true)
    })

    test('Enterprise branch ceiling allows virtually unlimited locations', () => {
      const largeCorp = checkTierLimit('enterprise', 'maxBranches', 50)
      assert.strictEqual(largeCorp.exceeded, false)
      assert.ok(largeCorp.remaining > 900)
    })
  })
})
