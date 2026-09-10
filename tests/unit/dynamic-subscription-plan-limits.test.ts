import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  checkResourceLimit,
  checkFeatureAccess,
  getNextTierPlan,
  getTrialDaysRemaining,
  DEFAULT_PLANS,
  DEFAULT_TRIAL_PLAN,
} from '../../lib/subscription/subscription-constants.ts'
import { EntitlementService } from '../../services/entitlement.service.ts'
import type {
  SubscriptionPlanRecord,
  CustomLimitsOverride,
  ConfigurableLimitType,
} from '../../types/subscription.types.ts'

describe('Dynamic Free & Paid Subscription Plan Limitations Audit & Verification', () => {
  describe('1. Dynamic Free Trial Plan Limitations & Customizations', () => {
    const customTrialPlan: SubscriptionPlanRecord = {
      id: 'sp-trial-custom',
      code: 'trial',
      name: 'Special 30-Day Free Trial',
      name_bn: '৩০ দিনের বিশেষ ফ্রি ট্রায়াল',
      description: 'Extended evaluation with customized quota limits.',
      price_monthly: 0,
      price_yearly: 0,
      max_users: 8,
      max_branches: 2,
      storage_gb: 5,
      monthly_orders: 250,
      max_customers: 500,
      max_products: 500,
      trial_days: 30,
      features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan', 'inventory', 'production'],
      is_active: true,
      sort_order: 0,
    }

    it('should correctly evaluate dynamic trial days remaining with customized duration', () => {
      const futureEnd = new Date(Date.now() + 25 * 86400000).toISOString()
      const daysLeft = getTrialDaysRemaining(futureEnd)
      assert.strictEqual(daysLeft, 25)
    })

    it('should enforce customized quota limits on trial plan (within limit vs exceeded)', () => {
      // 7 users under custom limit of 8 -> allowed
      const withinUsers = checkResourceLimit('max_users', 7, customTrialPlan)
      assert.strictEqual(withinUsers.exceeded, false)
      assert.strictEqual(withinUsers.limit, 8)
      assert.strictEqual(withinUsers.percentage, 88)
      assert.strictEqual(withinUsers.warning, true)

      // 8 users reached custom limit -> exceeded
      const atUsers = checkResourceLimit('max_users', 8, customTrialPlan)
      assert.strictEqual(atUsers.exceeded, true)

      // 200 orders under custom limit of 250 -> allowed
      const withinOrders = checkResourceLimit('monthly_orders', 200, customTrialPlan)
      assert.strictEqual(withinOrders.exceeded, false)
      assert.strictEqual(withinOrders.limit, 250)

      // 250 orders reached custom limit -> exceeded
      const atOrders = checkResourceLimit('monthly_orders', 250, customTrialPlan)
      assert.strictEqual(atOrders.exceeded, true)
    })

    it('should dynamically evaluate trial feature gating based on custom features list', () => {
      assert.strictEqual(checkFeatureAccess('trial', 'inventory', [customTrialPlan]), true)
      assert.strictEqual(checkFeatureAccess('trial', 'production', [customTrialPlan]), true)
      assert.strictEqual(checkFeatureAccess('trial', 'advanced_analytics', [customTrialPlan]), false)
    })
  })

  describe('2. Dynamic Paid Plans Quota Limitations & Upgrades', () => {
    const dynamicStarterPlan: SubscriptionPlanRecord = {
      id: 'sp-starter-custom',
      code: 'starter',
      name: 'Starter Tier Pro',
      name_bn: 'স্টার্টার প্রো',
      price_monthly: 2499,
      price_yearly: 24990,
      max_users: 5,
      max_branches: 1,
      storage_gb: 3,
      monthly_orders: 100,
      max_customers: 200,
      max_products: 200,
      features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'],
      is_active: true,
      sort_order: 1,
    }

    const dynamicBusinessPlan: SubscriptionPlanRecord = {
      id: 'sp-biz-custom',
      code: 'business',
      name: 'Business Enterprise',
      name_bn: 'বিজনেস এন্টারপ্রাইজ',
      price_monthly: 6999,
      price_yearly: 69990,
      max_users: 25,
      max_branches: 5,
      storage_gb: 20,
      monthly_orders: 1000,
      max_customers: 5000,
      max_products: 5000,
      features: [
        'basic_sales',
        'basic_customers',
        'quotation_pdf',
        'delivery_challan',
        'multi_department',
        'inventory',
        'production',
        'reports',
        'hr',
      ],
      is_active: true,
      sort_order: 2,
    }

    it('should enforce dynamic paid plan limits accurately', () => {
      const userCheck = checkResourceLimit('max_users', 4, dynamicStarterPlan)
      assert.strictEqual(userCheck.exceeded, false)
      assert.strictEqual(userCheck.limit, 5)

      const userOverCheck = checkResourceLimit('max_users', 5, dynamicStarterPlan)
      assert.strictEqual(userOverCheck.exceeded, true)

      const branchCheck = checkResourceLimit('max_branches', 1, dynamicStarterPlan)
      assert.strictEqual(branchCheck.exceeded, true)
    })

    it('should resolve next tier plan dynamically using current plans list', () => {
      const dynamicPlans = [dynamicStarterPlan, dynamicBusinessPlan]
      const nextPlan = getNextTierPlan('starter', dynamicPlans)
      assert.strictEqual(nextPlan.code, 'business')
      assert.strictEqual(nextPlan.name, 'Business Enterprise')
    })
  })

  describe('3. Unlimited Quotas & Capacity Threshold Handling (0, -1, 99999+)', () => {
    const enterprisePlan: SubscriptionPlanRecord = {
      id: 'sp-ent',
      code: 'enterprise',
      name: 'Enterprise Unlimited',
      name_bn: 'এন্টারপ্রাইজ আনলিমিটেড',
      price_monthly: 19999,
      price_yearly: 199990,
      max_users: 99999,
      max_branches: 0, // 0 signifies unlimited
      storage_gb: 1000,
      monthly_orders: -1, // -1 signifies unlimited
      max_customers: 0,
      max_products: 99999,
      features: [],
      is_active: true,
      sort_order: 3,
    }

    it('should treat limit of 0 as unlimited and never exceed', () => {
      const checkBranches = checkResourceLimit('max_branches', 500, enterprisePlan)
      assert.strictEqual(checkBranches.exceeded, false)
      assert.strictEqual(checkBranches.warning, false)
      assert.strictEqual(checkBranches.percentage, 0)
    })

    it('should treat limit of -1 as unlimited and never exceed', () => {
      const checkOrders = checkResourceLimit('monthly_orders', 150000, enterprisePlan)
      assert.strictEqual(checkOrders.exceeded, false)
      assert.strictEqual(checkOrders.warning, false)
      assert.strictEqual(checkOrders.percentage, 0)
    })

    it('should treat limit >= 99999 as unlimited and never exceed', () => {
      const checkUsers = checkResourceLimit('max_users', 5000, enterprisePlan)
      assert.strictEqual(checkUsers.exceeded, false)
      assert.strictEqual(checkUsers.warning, false)
      assert.strictEqual(checkUsers.percentage, 0)
    })
  })

  describe('4. Custom Tenant Limits Overrides (custom_limits_override)', () => {
    const standardStarterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!

    it('should respect custom limits override on max_users for a specific tenant', () => {
      // Starter plan has default max_users: 3. Tenant has custom override of 15 users.
      const override: CustomLimitsOverride = {
        max_users: 15,
        monthly_orders: 500,
      }

      // 4 users against starter default (3) would normally exceed, but with override (15) it is allowed
      const check = checkResourceLimit('max_users', 4, standardStarterPlan, override)
      assert.strictEqual(check.exceeded, false)
      assert.strictEqual(check.limit, 15)

      // 15 users reaches override limit
      const checkOver = checkResourceLimit('max_users', 15, standardStarterPlan, override)
      assert.strictEqual(checkOver.exceeded, true)
      assert.strictEqual(checkOver.limit, 15)
    })

    it('should allow unlimited override (-1 or 0) on standard plans', () => {
      const override: CustomLimitsOverride = {
        monthly_orders: -1,
      }

      const check = checkResourceLimit('monthly_orders', 10000, standardStarterPlan, override)
      assert.strictEqual(check.exceeded, false)
      assert.strictEqual(check.percentage, 0)
    })
  })

  describe('5. EntitlementService Enforcement of Restrictions & Suspensions', () => {
    it('checkResourceQuota returns allowed: true when under quota', async () => {
      const result = await EntitlementService.checkResourceQuota('test-company-1', 'max_users', 1)
      assert.strictEqual(result.allowed, true)
      assert.strictEqual(result.exceeded, false)
    })

    it('checkResourceQuota returns allowed: false when quota is reached', async () => {
      const result = await EntitlementService.checkResourceQuota('test-company-1', 'max_users', 100)
      assert.strictEqual(result.allowed, false)
      assert.strictEqual(result.exceeded, true)
    })

    it('enforceLimit succeeds when within limit and throws when exceeding', async () => {
      // Within limit
      await assert.doesNotReject(async () => {
        await EntitlementService.enforceLimit('test-company-1', 'max_users', 1)
      })

      // Exceeding limit
      await assert.rejects(
        async () => {
          await EntitlementService.enforceLimit('test-company-1', 'max_users', 999)
        },
        (err: Error) => {
          assert.ok(err.message.includes('Plan Limit Reached') || err.message.includes('quota'))
          return true
        }
      )
    })
  })
})
