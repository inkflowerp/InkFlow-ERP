import { describe, it } from 'node:test'
import assert from 'node:assert'
import type {
  PlanCode,
  FeatureCode,
  ConfigurableLimitType,
  SubscriptionPlanRecord,
  CompanySubscriptionRecord,
} from '../../types/subscription.types.ts'
import {
  checkFeatureAccess,
  checkResourceLimit,
  getTenantResourceUsage,
  getTrialDaysRemaining,
  getNextTierPlan,
  DEFAULT_PLANS,
  DEFAULT_TRIAL_PLAN,
} from '../../services/subscription.service.ts'

describe('Database-Driven Trial Plan Limitations and Restrictions Test Suite', () => {
  // Scenario: Platform Admin modifies trial plan quotas and restricts certain premium features in subscription_plans DB table
  const dynamicDatabaseTrialPlan: SubscriptionPlanRecord = {
    id: 'sp-db-trial',
    code: 'trial',
    name: 'Customized DB Trial (7 Days)',
    name_bn: 'কাস্টমাইজড ৭ দিনের ট্রায়াল',
    description: 'Customized trial configured by platform admin in DB',
    price_monthly: 0,
    price_yearly: 0,
    max_users: 2, // Modified from 5 to 2
    max_branches: 1,
    storage_gb: 1, // Modified from 2 to 1
    monthly_orders: 25, // Modified from 100 to 25
    max_customers: 50, // Modified from 200 to 50
    max_products: 40, // Modified from 200 to 40
    trial_days: 7, // Modified from 14 to 7
    features: [
      'basic_sales',
      'basic_customers',
      'quotation_pdf',
      'delivery_challan',
      'inventory',
      // Notice: 'api_access', 'custom_workflows', 'priority_support', 'advanced_analytics' omitted in DB
    ] as FeatureCode[],
    is_active: true,
    sort_order: 0,
  }

  const liveDatabasePlans: SubscriptionPlanRecord[] = [
    dynamicDatabaseTrialPlan,
    DEFAULT_PLANS[1], // Starter
    DEFAULT_PLANS[2], // Business
    DEFAULT_PLANS[3], // Enterprise
  ]

  describe('1. Dynamic Trial Duration & Remaining Calculation', () => {
    it('calculates days remaining based on database trial duration (7 days)', () => {
      const now = new Date()
      const endsAt = new Date(now.getTime() + 7 * 86400000).toISOString()
      const remaining = getTrialDaysRemaining(endsAt)
      assert.strictEqual(remaining, 7)
    })

    it('returns 0 when trial period has elapsed', () => {
      const pastDate = new Date(Date.now() - 2 * 86400000).toISOString()
      const remaining = getTrialDaysRemaining(pastDate)
      assert.strictEqual(remaining, 0)
    })

    it('returns 0 if endsAt is missing (no arbitrary fallback grants)', () => {
      const remaining = getTrialDaysRemaining(null)
      assert.strictEqual(remaining, 0)
    })
  })

  describe('2. Dynamic Resource Limit Enforcement from Database Trial Plan', () => {
    it('enforces modified database max_users limit (limit = 2)', () => {
      const underCheck = checkResourceLimit('max_users', 1, dynamicDatabaseTrialPlan)
      assert.strictEqual(underCheck.allowed, true)
      assert.strictEqual(underCheck.exceeded, false)
      assert.strictEqual(underCheck.limit, 2)
      assert.strictEqual(underCheck.current, 1)

      const atLimitCheck = checkResourceLimit('max_users', 2, dynamicDatabaseTrialPlan)
      assert.strictEqual(atLimitCheck.allowed, false)
      assert.strictEqual(atLimitCheck.exceeded, true)

      const overLimitCheck = checkResourceLimit('max_users', 3, dynamicDatabaseTrialPlan)
      assert.strictEqual(overLimitCheck.allowed, false)
      assert.strictEqual(overLimitCheck.exceeded, true)
    })

    it('enforces modified database monthly_orders limit (limit = 25)', () => {
      const check24 = checkResourceLimit('monthly_orders', 24, dynamicDatabaseTrialPlan)
      assert.strictEqual(check24.allowed, true)
      assert.strictEqual(check24.exceeded, false)
      assert.strictEqual(check24.warning, true) // 24/25 = 96% >= 80%

      const check25 = checkResourceLimit('monthly_orders', 25, dynamicDatabaseTrialPlan)
      assert.strictEqual(check25.allowed, false)
      assert.strictEqual(check25.exceeded, true)
    })

    it('enforces modified database max_customers (limit = 50) and max_products (limit = 40)', () => {
      const custCheck = checkResourceLimit('max_customers', 50, dynamicDatabaseTrialPlan)
      assert.strictEqual(custCheck.allowed, false)
      assert.strictEqual(custCheck.exceeded, true)
      assert.strictEqual(custCheck.limit, 50)

      const prodCheck = checkResourceLimit('max_products', 40, dynamicDatabaseTrialPlan)
      assert.strictEqual(prodCheck.allowed, false)
      assert.strictEqual(prodCheck.exceeded, true)
      assert.strictEqual(prodCheck.limit, 40)
    })
  })

  describe('3. Dynamic Feature Access Restrictions from Database Trial Plan', () => {
    it('allows features enabled in database trial plan', () => {
      const hasSales = checkFeatureAccess('trial', 'basic_sales', liveDatabasePlans)
      const hasCustomers = checkFeatureAccess('trial', 'basic_customers', liveDatabasePlans)
      const hasInventory = checkFeatureAccess('trial', 'inventory', liveDatabasePlans)

      assert.strictEqual(hasSales, true)
      assert.strictEqual(hasCustomers, true)
      assert.strictEqual(hasInventory, true)
    })

    it('strictly denies features omitted / disabled from database trial plan', () => {
      const hasApi = checkFeatureAccess('trial', 'api_access', liveDatabasePlans)
      const hasWorkflows = checkFeatureAccess('trial', 'custom_workflows', liveDatabasePlans)
      const hasPrioritySupport = checkFeatureAccess('trial', 'priority_support', liveDatabasePlans)
      const hasAnalytics = checkFeatureAccess('trial', 'advanced_analytics', liveDatabasePlans)

      assert.strictEqual(hasApi, false, 'api_access should be restricted because it is not in dynamic trial features')
      assert.strictEqual(hasWorkflows, false, 'custom_workflows should be restricted')
      assert.strictEqual(hasPrioritySupport, false, 'priority_support should be restricted')
      assert.strictEqual(hasAnalytics, false, 'advanced_analytics should be restricted')
    })
  })

  describe('4. Custom Tenant Limits Override Precedence over Trial Plan', () => {
    it('overrides database trial quota when custom_limits_override is explicitly set', () => {
      const customOverride = {
        max_users: 10, // Platform admin gave special trial tenant 10 users
        monthly_orders: 500,
      }

      const check = checkResourceLimit('max_users', 4, dynamicDatabaseTrialPlan, customOverride)
      assert.strictEqual(check.allowed, true)
      assert.strictEqual(check.limit, 10)
      assert.strictEqual(check.current, 4)
      assert.strictEqual(check.exceeded, false)
    })
  })

  describe('5. Next Tier Upgrade Resolution', () => {
    it('suggests business tier when upgrading from trial plan', () => {
      const nextPlan = getNextTierPlan('trial', liveDatabasePlans)
      assert.strictEqual(nextPlan.code, 'business')
    })
  })
})
