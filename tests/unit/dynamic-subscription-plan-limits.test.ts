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
import type { SubscriptionPlanRecord, CompanySubscriptionRecord } from '../../types/subscription.types.ts'

describe('Dynamic Subscription Plan Limits, Restrictions & Expiry Suite', () => {
  describe('1. Dynamic Plan Limits & Quota Metering', () => {
    test('Reflects dynamically updated max_users, max_branches, storage_gb, monthly_orders', () => {
      const dynamicStarter: SubscriptionPlanRecord = {
        id: 'sp-01',
        code: 'starter',
        name: 'Starter Pro (Updated)',
        name_bn: 'স্টার্টার প্রো',
        description: 'Updated small shop plan',
        price_monthly: 2499,
        price_yearly: 24990,
        max_users: 8, // Changed from default 3 to 8
        max_branches: 2, // Changed from default 1 to 2
        storage_gb: 5, // Changed from default 1 to 5
        monthly_orders: 150, // Changed from default 50 to 150
        max_customers: 300,
        max_products: 300,
        trial_days: 0,
        features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'],
        is_active: true,
        sort_order: 1,
      }

      // Check quota when count is 5 (under the new limit of 8, would have exceeded old limit of 3)
      const userCheck = checkResourceLimit('max_users', 5, dynamicStarter)
      assert.strictEqual(userCheck.allowed, true)
      assert.strictEqual(userCheck.limit, 8)
      assert.strictEqual(userCheck.current, 5)
      assert.strictEqual(userCheck.exceeded, false)
      assert.strictEqual(userCheck.percentage, 63) // 5/8 * 100 = 62.5 -> 63%

      // Check monthly orders when count is 100 (under new limit of 150, would have exceeded old limit of 50)
      const orderCheck = checkResourceLimit('monthly_orders', 100, dynamicStarter)
      assert.strictEqual(orderCheck.allowed, true)
      assert.strictEqual(orderCheck.limit, 150)
      assert.strictEqual(orderCheck.current, 100)
      assert.strictEqual(orderCheck.exceeded, false)

      // Storage quota check
      const storageCheck = checkResourceLimit('storage_gb', 4.5, dynamicStarter)
      assert.strictEqual(storageCheck.allowed, true)
      assert.strictEqual(storageCheck.limit, 5)
    })

    test('Custom limits override takes precedence over dynamic plan defaults', () => {
      const standardBusiness: SubscriptionPlanRecord = {
        id: 'sp-02',
        code: 'business',
        name: 'Business Plan',
        name_bn: 'বিজনেস প্ল্যান',
        description: 'Standard business plan',
        price_monthly: 4999,
        price_yearly: 49990,
        max_users: 10,
        max_branches: 3,
        storage_gb: 10,
        monthly_orders: 500,
        max_customers: 1000,
        max_products: 1000,
        trial_days: 0,
        features: ['basic_sales', 'multi_department', 'inventory', 'production'],
        is_active: true,
        sort_order: 2,
      }

      const customOverride = {
        max_users: 25,
        monthly_orders: 2000,
      }

      // Count is 15 -> Exceeds standard plan (10), but allowed under override (25)
      const userCheck = checkResourceLimit('max_users', 15, standardBusiness, customOverride)
      assert.strictEqual(userCheck.allowed, true)
      assert.strictEqual(userCheck.limit, 25)
      assert.strictEqual(userCheck.current, 15)
      assert.strictEqual(userCheck.exceeded, false)
    })
  })

  describe('2. Dynamic Feature Restrictions & Entitlements', () => {
    test('Dynamic plan granting new feature is immediately authorized', () => {
      // Starter plan dynamically granted 'inventory' feature by administrator
      const customizedStarter: SubscriptionPlanRecord = {
        ...DEFAULT_PLANS[1],
        features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan', 'inventory'],
      }

      const plansList = [DEFAULT_PLANS[0], customizedStarter, DEFAULT_PLANS[2], DEFAULT_PLANS[3]]

      const hasInventory = checkFeatureAccess('starter', 'inventory', plansList)
      assert.strictEqual(hasInventory, true)

      const hasProduction = checkFeatureAccess('starter', 'production', plansList)
      assert.strictEqual(hasProduction, false)
    })

    test('Dynamic trial plan restrictions reflect customized feature matrix', () => {
      const restrictedTrial: SubscriptionPlanRecord = {
        ...DEFAULT_TRIAL_PLAN,
        features: ['basic_sales', 'quotation_pdf'], // Only basic sales and quotation in trial
      }

      const plansList = [restrictedTrial, DEFAULT_PLANS[1], DEFAULT_PLANS[2], DEFAULT_PLANS[3]]

      assert.strictEqual(checkFeatureAccess('trial', 'basic_sales', plansList), true)
      assert.strictEqual(checkFeatureAccess('trial', 'quotation_pdf', plansList), true)
      assert.strictEqual(checkFeatureAccess('trial', 'api_access', plansList), false)
      assert.strictEqual(checkFeatureAccess('trial', 'multi_branch', plansList), false)
    })
  })

  describe('3. Dynamic Subscription Expiry & Countdown Calculations', () => {
    test('Calculates live countdown for active trial ending in 5 days', () => {
      const fiveDaysFuture = new Date(Date.now() + 5 * 86400000 + 3 * 3600000).toISOString()
      const remainingDays = getTrialDaysRemaining(fiveDaysFuture)
      assert.strictEqual(remainingDays >= 5 && remainingDays <= 6, true)

      const countdown = getSubscriptionTimeRemaining(fiveDaysFuture)
      assert.strictEqual(countdown.isExpired, false)
      assert.strictEqual(countdown.days >= 5, true)
      assert.strictEqual(countdown.formattedEn.includes('left'), true)
    })

    test('Identifies expired trial when expiry date is in the past', () => {
      const pastDate = new Date(Date.now() - 24 * 3600000).toISOString()
      const remainingDays = getTrialDaysRemaining(pastDate)
      assert.strictEqual(remainingDays, 0)

      const countdown = getSubscriptionTimeRemaining(pastDate)
      assert.strictEqual(countdown.isExpired, true)
      assert.strictEqual(countdown.formattedEn, 'Expired')
      assert.strictEqual(countdown.formattedBn, 'মেয়াদ শেষ')
    })

    test('Handles sub-day countdowns accurately (e.g. 4 hours left)', () => {
      const fourHoursFuture = new Date(Date.now() + 4 * 3600000 + 15 * 60000).toISOString()
      const countdown = getSubscriptionTimeRemaining(fourHoursFuture)
      assert.strictEqual(countdown.isExpired, false)
      assert.strictEqual(countdown.days, 0)
      assert.strictEqual(countdown.hours >= 4, true)
      assert.strictEqual(countdown.formattedEn.includes('h'), true)
    })
  })

  describe('4. Multi-Key Tenant Company Resolution Consistency', () => {
    test('Resolves next tier plan dynamically based on active plans list', () => {
      const customPlans = [
        DEFAULT_TRIAL_PLAN,
        { ...DEFAULT_PLANS[1], name: 'Custom Starter' },
        { ...DEFAULT_PLANS[2], name: 'Custom Business' },
        { ...DEFAULT_PLANS[3], name: 'Custom Enterprise' },
      ]

      const nextFromStarter = getNextTierPlan('starter', customPlans)
      assert.strictEqual(nextFromStarter.code, 'business')
      assert.strictEqual(nextFromStarter.name, 'Custom Business')

      const nextFromBusiness = getNextTierPlan('business', customPlans)
      assert.strictEqual(nextFromBusiness.code, 'enterprise')
      assert.strictEqual(nextFromBusiness.name, 'Custom Enterprise')
    })
  })
})
