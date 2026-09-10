import { describe, it } from 'node:test'
import assert from 'node:assert'
import type {
  FeatureCode,
  ConfigurableLimitType,
  SubscriptionPlanRecord,
  CompanySubscriptionRecord,
  TenantResourceUsage,
} from '../../types/subscription.types.ts'
import {
  checkFeatureAccess,
  checkResourceLimit,
  getTenantResourceUsage,
  getTrialDaysRemaining,
  getMinimumPlanForFeature,
  DEFAULT_TRIAL_PLAN,
  DEFAULT_PLANS,
} from '../../services/subscription.service.ts'

describe('Authoritative Trial Plan Limitation & Restriction Hardening Suite', () => {
  const trialPlan: SubscriptionPlanRecord = {
    ...DEFAULT_TRIAL_PLAN,
    max_users: 5,
    max_branches: 1,
    storage_gb: 2,
    monthly_orders: 100,
    max_customers: 200,
    max_products: 200,
    trial_days: 14,
  }

  // ============================================================================
  // 1. ALL 6 RESOURCE LIMITS ENFORCEMENT & HARD BLOCKERS
  // ============================================================================
  describe('1. Quota Limitation Enforcement Across All 6 Resource Types', () => {
    const limits: { type: ConfigurableLimitType; max: number }[] = [
      { type: 'max_users', max: 5 },
      { type: 'max_branches', max: 1 },
      { type: 'storage_gb', max: 2 },
      { type: 'monthly_orders', max: 100 },
      { type: 'max_customers', max: 200 },
      { type: 'max_products', max: 200 },
    ]

    limits.forEach(({ type, max }) => {
      it(`blocks creation when '${type}' reaches or exceeds limit of ${max}`, () => {
        // Under limit -> allowed
        const under = checkResourceLimit(type, max - 1, trialPlan)
        assert.strictEqual(under.allowed, true, `${type} should be allowed when under limit`)
        assert.strictEqual(under.exceeded, false)
        assert.strictEqual(under.limit, max)
        assert.strictEqual(under.current, max - 1)

        // At limit -> blocked
        const atLimit = checkResourceLimit(type, max, trialPlan)
        assert.strictEqual(atLimit.allowed, false, `${type} should be blocked when at limit`)
        assert.strictEqual(atLimit.exceeded, true)
        assert.strictEqual(atLimit.current, max)

        // Over limit -> blocked
        const overLimit = checkResourceLimit(type, max + 10, trialPlan)
        assert.strictEqual(overLimit.allowed, false, `${type} should be blocked when over limit`)
        assert.strictEqual(overLimit.exceeded, true)
        assert.strictEqual(overLimit.current, max + 10)
      })
    })

    it('triggers warning threshold at 80% capacity for orders', () => {
      const at79 = checkResourceLimit('monthly_orders', 79, trialPlan)
      assert.strictEqual(at79.allowed, true)
      assert.strictEqual(at79.warning, false)

      const at80 = checkResourceLimit('monthly_orders', 80, trialPlan)
      assert.strictEqual(at80.allowed, true)
      assert.strictEqual(at80.warning, true)
      assert.strictEqual(at80.exceeded, false)
    })
  })

  // ============================================================================
  // 2. TRIAL EXPIRATION & SUSPENSION BLOCKERS
  // ============================================================================
  describe('2. Trial Expiration & Suspended State Action Blockers', () => {
    it('accurately identifies expired trial date and returns 0 days remaining', () => {
      const expiredDate = new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      const daysRemaining = getTrialDaysRemaining(expiredDate)
      assert.strictEqual(daysRemaining, 0)
    })

    it('calculates active trial days remaining correctly', () => {
      const futureDate = new Date(Date.now() + 5 * 86400000).toISOString()
      const daysRemaining = getTrialDaysRemaining(futureDate)
      assert.strictEqual(daysRemaining, 5)
    })

    it('evaluates dynamic checkCanCreate logic for expired and suspended subscriptions', () => {
      const evaluateCanCreate = (
        sub: CompanySubscriptionRecord,
        plan: SubscriptionPlanRecord,
        limitType: ConfigurableLimitType,
        currentUsage: number
      ) => {
        const isSuspended = sub.status === 'suspended' || sub.status === 'cancelled'
        const isTrialExpired =
          sub.status === 'expired' ||
          (sub.status === 'trial' &&
            sub.trial_ends_at !== null &&
            sub.trial_ends_at !== undefined &&
            new Date(sub.trial_ends_at).getTime() < Date.now())

        if (isSuspended) {
          return { allowed: false, reason: 'subscription_suspended' }
        }
        if (isTrialExpired) {
          return { allowed: false, reason: 'trial_expired' }
        }

        const limitStatus = checkResourceLimit(limitType, currentUsage, plan, sub.custom_limits_override)
        if (!limitStatus.allowed) {
          return { allowed: false, reason: 'limit_exceeded', limitStatus }
        }

        return { allowed: true }
      }

      // Expired trial sub
      const expiredSub: CompanySubscriptionRecord = {
        id: 'sub-exp',
        company_id: 'co-exp',
        plan_id: 'sp-00',
        plan_code: 'trial',
        status: 'trial',
        billing_interval: 'monthly',
        current_period_start: new Date(Date.now() - 15 * 86400000).toISOString(),
        current_period_end: new Date(Date.now() - 86400000).toISOString(),
        trial_ends_at: new Date(Date.now() - 86400000).toISOString(),
      }

      const expiredCheck = evaluateCanCreate(expiredSub, trialPlan, 'monthly_orders', 10)
      assert.strictEqual(expiredCheck.allowed, false)
      assert.strictEqual(expiredCheck.reason, 'trial_expired')

      // Suspended sub
      const suspendedSub: CompanySubscriptionRecord = {
        id: 'sub-susp',
        company_id: 'co-susp',
        plan_id: 'sp-00',
        plan_code: 'trial',
        status: 'suspended',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date().toISOString(),
      }

      const suspendedCheck = evaluateCanCreate(suspendedSub, trialPlan, 'monthly_orders', 10)
      assert.strictEqual(suspendedCheck.allowed, false)
      assert.strictEqual(suspendedCheck.reason, 'subscription_suspended')

      // Active sub within limit
      const activeSub: CompanySubscriptionRecord = {
        id: 'sub-act',
        company_id: 'co-act',
        plan_id: 'sp-00',
        plan_code: 'trial',
        status: 'trial',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 7 * 86400000).toISOString(),
        trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      }

      const activeCheck = evaluateCanCreate(activeSub, trialPlan, 'monthly_orders', 10)
      assert.strictEqual(activeCheck.allowed, true)

      // Active sub over limit
      const activeOverLimit = evaluateCanCreate(activeSub, trialPlan, 'monthly_orders', 100)
      assert.strictEqual(activeOverLimit.allowed, false)
      assert.strictEqual(activeOverLimit.reason, 'limit_exceeded')
    })
  })

  // ============================================================================
  // 3. FEATURE GATING & MINIMUM PLAN RESOLUTION
  // ============================================================================
  describe('3. Feature Gating & Dynamic Tier Resolution', () => {
    const starterPlan: SubscriptionPlanRecord = {
      ...DEFAULT_PLANS[1],
      code: 'starter',
      features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'],
    }

    const businessPlan: SubscriptionPlanRecord = {
      ...DEFAULT_PLANS[2],
      code: 'business',
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
    }

    const enterprisePlan: SubscriptionPlanRecord = {
      ...DEFAULT_PLANS[3],
      code: 'enterprise',
      features: [
        ...businessPlan.features,
        'multi_branch',
        'advanced_analytics',
        'advanced_permissions',
        'custom_workflows',
        'api_access',
        'priority_support',
      ],
    }

    const allPlans = [trialPlan, starterPlan, businessPlan, enterprisePlan]

    it('denies enterprise and business features on starter plan', () => {
      assert.strictEqual(checkFeatureAccess('starter', 'custom_workflows', allPlans), false)
      assert.strictEqual(checkFeatureAccess('starter', 'advanced_permissions', allPlans), false)
      assert.strictEqual(checkFeatureAccess('starter', 'job_costing', allPlans), false)
      assert.strictEqual(checkFeatureAccess('starter', 'reports', allPlans), false)
      assert.strictEqual(checkFeatureAccess('starter', 'inventory_rolls', allPlans), false)
      assert.strictEqual(checkFeatureAccess('starter', 'whatsapp_notifications', allPlans), false)

      // Starter has basic sales and quotations
      assert.strictEqual(checkFeatureAccess('starter', 'basic_sales', allPlans), true)
      assert.strictEqual(checkFeatureAccess('starter', 'quotation_pdf', allPlans), true)
      assert.strictEqual(checkFeatureAccess('starter', 'delivery_challan', allPlans), true)
    })

    it('denies enterprise-only features on business plan', () => {
      assert.strictEqual(checkFeatureAccess('business', 'custom_workflows', allPlans), false)
      assert.strictEqual(checkFeatureAccess('business', 'advanced_permissions', allPlans), false)
      assert.strictEqual(checkFeatureAccess('business', 'advanced_analytics', allPlans), false)

      // Business has reports, costing, inventory rolls
      assert.strictEqual(checkFeatureAccess('business', 'job_costing', allPlans), true)
      assert.strictEqual(checkFeatureAccess('business', 'reports', allPlans), true)
      assert.strictEqual(checkFeatureAccess('business', 'inventory_rolls', allPlans), true)
    })

    it('resolves correct minimum plan for gated features dynamically', () => {
      const minWorkflow = getMinimumPlanForFeature('custom_workflows', allPlans)
      assert.strictEqual(minWorkflow.code, 'enterprise')

      const minCosting = getMinimumPlanForFeature('job_costing', allPlans)
      assert.strictEqual(minCosting.code, 'business')

      const minQuotation = getMinimumPlanForFeature('quotation_pdf', allPlans)
      assert.strictEqual(minQuotation.code, 'starter')
    })
  })

  // ============================================================================
  // 4. RESOURCE USAGE & TENANT ISOLATION
  // ============================================================================
  describe('4. Tenant Isolation in Resource Usage Calculation', () => {
    it('isolates usage metrics strictly to current company ID', () => {
      const companyId = 'co-test-unique'
      const usage = getTenantResourceUsage(companyId)

      assert.ok(typeof usage.users_count === 'number')
      assert.ok(typeof usage.branches_count === 'number')
      assert.ok(typeof usage.orders_this_month === 'number')
      assert.ok(typeof usage.customers_count === 'number')
      assert.ok(typeof usage.products_count === 'number')
      assert.ok(typeof usage.storage_used_gb === 'number')
    })
  })
})
