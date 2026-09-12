import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  DEFAULT_PLANS,
  DEFAULT_TRIAL_PLAN,
  FEATURE_METADATA,
  TENANT_ACCOUNT_TYPE_METADATA,
  checkFeatureAccess,
  checkResourceLimit,
  getMinimumPlanForFeature,
  getNextTierPlan,
  getSubscriptionTimeRemaining,
  getTrialDaysRemaining,
  toBengaliDigits,
} from '../../lib/subscription/subscription-constants.ts'
import {
  resolveTenantAccountType,
  resolveSubscriptionPlan,
  type SubscriptionPlanRecord,
  type CompanySubscriptionRecord,
  type FeatureCode,
  type ConfigurableLimitType,
} from '../../types/subscription.types.ts'

describe('Subscription Plan, Limit, Restriction and Expiry Audit Suite', () => {
  describe('1. Subscription Plan Integrity & Dynamic Resolution', () => {
    it('verifies all default subscription plans have valid structures and unique codes', () => {
      assert.strictEqual(DEFAULT_PLANS.length, 4)
      const codes = DEFAULT_PLANS.map((p) => p.code)
      assert.deepStrictEqual(codes, ['trial', 'starter', 'business', 'enterprise'])

      DEFAULT_PLANS.forEach((plan) => {
        assert.ok(plan.id, `Plan ${plan.code} must have an ID`)
        assert.ok(plan.name, `Plan ${plan.code} must have an English name`)
        assert.ok(plan.name_bn, `Plan ${plan.code} must have a Bengali name`)
        assert.ok(Array.isArray(plan.features), `Plan ${plan.code} features must be an array`)
        assert.strictEqual(typeof plan.price_monthly, 'number')
        assert.strictEqual(typeof plan.price_yearly, 'number')
        assert.strictEqual(typeof plan.max_users, 'number')
        assert.strictEqual(typeof plan.max_branches, 'number')
        assert.strictEqual(typeof plan.storage_gb, 'number')
        assert.strictEqual(typeof plan.monthly_orders, 'number')
        assert.strictEqual(typeof plan.max_customers, 'number')
        assert.strictEqual(typeof plan.max_products, 'number')
      })
    })

    it('resolves subscription plan state dynamically with fallback to default and custom plans', () => {
      // Null subscription falls back to trial plan
      const nullRes = resolveSubscriptionPlan(null, DEFAULT_PLANS)
      assert.strictEqual(nullRes.planCode, 'trial')
      assert.strictEqual(nullRes.isTrial, true)
      assert.strictEqual(nullRes.isSuspended, false)

      // Active Starter subscription
      const starterRes = resolveSubscriptionPlan({
        status: 'active',
        plan_code: 'starter',
      }, DEFAULT_PLANS)
      assert.strictEqual(starterRes.planCode, 'starter')
      assert.strictEqual(starterRes.isTrial, false)
      assert.strictEqual(starterRes.planName, 'Starter Plan')

      // Custom Plan from platform administration
      const customPlans: SubscriptionPlanRecord[] = [
        {
          ...DEFAULT_TRIAL_PLAN,
          name: 'Custom 30-Day Pro Trial',
          name_bn: 'কাস্টম ৩০ দিনের প্রো ট্রায়াল',
          trial_days: 30,
        },
        {
          id: 'sp-custom-business',
          code: 'business',
          name: 'Factory Ultra Plan',
          name_bn: 'ফ্যাক্টরি আল্ট্রা প্ল্যান',
          price_monthly: 6500,
          price_yearly: 65000,
          max_users: 25,
          max_branches: 5,
          storage_gb: 50,
          monthly_orders: 2000,
          max_customers: 5000,
          max_products: 5000,
          features: Object.keys(FEATURE_METADATA) as FeatureCode[],
          is_active: true,
          sort_order: 2,
        },
      ]

      const customTrialRes = resolveSubscriptionPlan({ status: 'trial', plan_code: 'trial' }, customPlans)
      assert.strictEqual(customTrialRes.planName, 'Custom 30-Day Pro Trial')
      assert.strictEqual(customTrialRes.planNameBn, 'কাস্টম ৩০ দিনের প্রো ট্রায়াল')

      const customBusinessRes = resolveSubscriptionPlan({ status: 'active', plan_code: 'business', plan_id: 'sp-custom-business' }, customPlans)
      assert.strictEqual(customBusinessRes.planName, 'Factory Ultra Plan')
      assert.strictEqual(customBusinessRes.badgeTextEn, 'Factory Ultra')
    })
  })

  describe('2. Resource Quotas & Limits Verification', () => {
    const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
    const enterprisePlan = DEFAULT_PLANS.find((p) => p.code === 'enterprise')!

    it('accurately evaluates usage against plan limits and emits warnings at 80%', () => {
      // Starter plan max_users is 3
      // Under limit: 1 user
      const underCheck = checkResourceLimit('max_users', 1, starterPlan)
      assert.strictEqual(underCheck.allowed, true)
      assert.strictEqual(underCheck.exceeded, false)
      assert.strictEqual(underCheck.warning, false)
      assert.strictEqual(underCheck.percentage, 33)

      // Warning threshold: 2 users out of 3 is 67% (not 80%)
      // If limit is 10, 8 users is 80% -> warning
      const businessPlan = DEFAULT_PLANS.find((p) => p.code === 'business')!
      const warnCheck = checkResourceLimit('max_users', 8, businessPlan)
      assert.strictEqual(warnCheck.allowed, true)
      assert.strictEqual(warnCheck.warning, true)
      assert.strictEqual(warnCheck.percentage, 80)

      // Limit reached: 3 users out of 3
      const limitReached = checkResourceLimit('max_users', 3, starterPlan)
      assert.strictEqual(limitReached.allowed, false)
      assert.strictEqual(limitReached.exceeded, true)
      assert.strictEqual(limitReached.percentage, 100)

      // Limit exceeded: 4 users out of 3
      const exceeded = checkResourceLimit('max_users', 4, starterPlan)
      assert.strictEqual(exceeded.allowed, false)
      assert.strictEqual(exceeded.exceeded, true)
    })

    it('honors tenant custom_limits_override when provided', () => {
      // Starter plan default monthly_orders is 50, but tenant was granted override of 150
      const override = { monthly_orders: 150 }
      const checkWithOverride = checkResourceLimit('monthly_orders', 60, starterPlan, override)
      assert.strictEqual(checkWithOverride.allowed, true)
      assert.strictEqual(checkWithOverride.limit, 150)
      assert.strictEqual(checkWithOverride.exceeded, false)
    })

    it('treats enterprise or zero/negative/large quotas as unlimited', () => {
      const unlimitedCheck = checkResourceLimit('monthly_orders', 50000, enterprisePlan)
      assert.strictEqual(unlimitedCheck.allowed, true)
      assert.strictEqual(unlimitedCheck.exceeded, false)

      const zeroLimitPlan: SubscriptionPlanRecord = {
        ...starterPlan,
        max_users: 0, // 0 signifies unlimited
      }
      const zeroCheck = checkResourceLimit('max_users', 999, zeroLimitPlan)
      assert.strictEqual(zeroCheck.allowed, true)
      assert.strictEqual(zeroCheck.exceeded, false)
    })
  })

  describe('3. Feature Restrictions & Entitlements Matrix', () => {
    it('verifies all 21 system features have proper metadata and categories', () => {
      const allFeatures = Object.keys(FEATURE_METADATA) as FeatureCode[]
      assert.strictEqual(allFeatures.length, 21)

      allFeatures.forEach((feat) => {
        const meta = FEATURE_METADATA[feat]
        assert.ok(meta.name, `Feature ${feat} must have a name`)
        assert.ok(meta.name_bn, `Feature ${feat} must have a Bengali name`)
        assert.ok(meta.minPlan, `Feature ${feat} must define a minimum plan`)
        assert.ok(['sales', 'production', 'management', 'advanced'].includes(meta.category))
      })
    })

    it('enforces feature gating across Trial, Starter, Business, and Enterprise tiers', () => {
      // Trial has full evaluation access to all features
      assert.strictEqual(checkFeatureAccess('trial', 'basic_sales', DEFAULT_PLANS), true)
      assert.strictEqual(checkFeatureAccess('trial', 'inventory_rolls', DEFAULT_PLANS), true)
      assert.strictEqual(checkFeatureAccess('trial', 'production_kanban', DEFAULT_PLANS), true)
      assert.strictEqual(checkFeatureAccess('trial', 'api_access', DEFAULT_PLANS), true)

      // Starter has only basic sales & quotation features
      assert.strictEqual(checkFeatureAccess('starter', 'basic_sales', DEFAULT_PLANS), true)
      assert.strictEqual(checkFeatureAccess('starter', 'quotation_pdf', DEFAULT_PLANS), true)
      assert.strictEqual(checkFeatureAccess('starter', 'delivery_challan', DEFAULT_PLANS), true)
      assert.strictEqual(checkFeatureAccess('starter', 'inventory', DEFAULT_PLANS), false)
      assert.strictEqual(checkFeatureAccess('starter', 'production', DEFAULT_PLANS), false)
      assert.strictEqual(checkFeatureAccess('starter', 'multi_branch', DEFAULT_PLANS), false)

      // Business has inventory, production, reports, HR, but not multi_branch or api_access
      assert.strictEqual(checkFeatureAccess('business', 'inventory_rolls', DEFAULT_PLANS), true)
      assert.strictEqual(checkFeatureAccess('business', 'production_kanban', DEFAULT_PLANS), true)
      assert.strictEqual(checkFeatureAccess('business', 'hr_payroll', DEFAULT_PLANS), true)
      assert.strictEqual(checkFeatureAccess('business', 'multi_branch', DEFAULT_PLANS), false)
      assert.strictEqual(checkFeatureAccess('business', 'api_access', DEFAULT_PLANS), false)

      // Enterprise has all advanced features
      assert.strictEqual(checkFeatureAccess('enterprise', 'multi_branch', DEFAULT_PLANS), true)
      assert.strictEqual(checkFeatureAccess('enterprise', 'advanced_analytics', DEFAULT_PLANS), true)
      assert.strictEqual(checkFeatureAccess('enterprise', 'api_access', DEFAULT_PLANS), true)
      assert.strictEqual(checkFeatureAccess('enterprise', 'custom_workflows', DEFAULT_PLANS), true)
    })

    it('resolves minimum required plan and suggests next tier accurately', () => {
      const minForSales = getMinimumPlanForFeature('basic_sales', DEFAULT_PLANS)
      assert.strictEqual(minForSales.code, 'starter')

      const minForKanban = getMinimumPlanForFeature('production_kanban', DEFAULT_PLANS)
      assert.strictEqual(minForKanban.code, 'business')

      const minForApi = getMinimumPlanForFeature('api_access', DEFAULT_PLANS)
      assert.strictEqual(minForApi.code, 'enterprise')

      const nextFromTrial = getNextTierPlan('trial', DEFAULT_PLANS)
      assert.strictEqual(nextFromTrial.code, 'business')

      const nextFromStarter = getNextTierPlan('starter', DEFAULT_PLANS)
      assert.strictEqual(nextFromStarter.code, 'business')

      const nextFromBusiness = getNextTierPlan('business', DEFAULT_PLANS)
      assert.strictEqual(nextFromBusiness.code, 'enterprise')
    })
  })

  describe('4. Expiry Timers, Countdown & Bilingual Formatting', () => {
    it('calculates trial days remaining accurately', () => {
      const now = Date.now()
      const future5Days = new Date(now + 5 * 86400000).toISOString()
      assert.strictEqual(getTrialDaysRemaining(future5Days), 5)

      const pastDate = new Date(now - 10000).toISOString()
      assert.strictEqual(getTrialDaysRemaining(pastDate), 0)

      assert.strictEqual(getTrialDaysRemaining(null), 0)
      assert.strictEqual(getTrialDaysRemaining('invalid-date'), 0)
    })

    it('generates high-precision expiry countdown objects in English and Bengali', () => {
      const now = Date.now()
      // 2 days, 3 hours in future
      const target2d3h = new Date(now + (2 * 86400000 + 3 * 3600000 + 15 * 60000)).toISOString()
      const res = getSubscriptionTimeRemaining(target2d3h)

      assert.strictEqual(res.isExpired, false)
      assert.strictEqual(res.days, 2)
      assert.strictEqual(res.hours, 3)
      assert.ok(res.formattedEn.includes('2d 3h left'))
      assert.ok(res.formattedBn.includes('২ দিন ৩ ঘণ্টা বাকি'))

      // Expired case
      const expiredRes = getSubscriptionTimeRemaining(new Date(now - 1000).toISOString())
      assert.strictEqual(expiredRes.isExpired, true)
      assert.strictEqual(expiredRes.formattedEn, 'Expired')
      assert.strictEqual(expiredRes.formattedBn, 'মেয়াদ শেষ')
    })

    it('converts digits accurately to Bengali script', () => {
      assert.strictEqual(toBengaliDigits(0), '০')
      assert.strictEqual(toBengaliDigits(14), '১৪')
      assert.strictEqual(toBengaliDigits(1999), '১৯৯৯')
      assert.strictEqual(toBengaliDigits(2026), '২০২৬')
      assert.strictEqual(toBengaliDigits(undefined), '')
      assert.strictEqual(toBengaliDigits(null), '')
    })
  })
})
