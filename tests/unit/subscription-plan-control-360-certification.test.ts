import { describe, it } from 'node:test'
import assert from 'node:assert'
import { EntitlementService } from '../../services/entitlement.service.ts'
import { SubscriptionGuard } from '../../lib/subscription/subscription-guard.ts'
import {
  DEFAULT_PLANS,
  DEFAULT_TRIAL_PLAN,
  checkFeatureAccess,
  checkResourceLimit,
  getTenantResourceUsage,
} from '../../lib/subscription/subscription-constants.ts'
import type {
  SubscriptionPlanRecord,
  CompanySubscriptionRecord,
  CustomLimitsOverride,
} from '../../types/subscription.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Subscription Plan Control 360 - Certification & Hardening Suite', () => {
  const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
  const businessPlan = DEFAULT_PLANS.find((p) => p.code === 'business')!
  const enterprisePlan = DEFAULT_PLANS.find((p) => p.code === 'enterprise')!

  describe('1. Temporary & Auditable Plan Overrides with Expiration', () => {
    it('applies temporary numerical limit override while non-expired', () => {
      const futureExpiry = new Date(Date.now() + 7 * 86400000).toISOString()
      const override: CustomLimitsOverride = {
        max_users: 15,
        expires_at: futureExpiry,
        reason: 'Customer special campaign grant (+5 users for 7 days)',
        is_active: true,
      }

      const check = checkResourceLimit('max_users', 12, businessPlan, override)
      assert.strictEqual(check.limit, 15, 'Effective limit should be 15 under active override')
      assert.strictEqual(check.allowed, true, 'Usage of 12 users should be allowed when limit is 15')
      assert.strictEqual(check.exceeded, false)
    })

    it('falls back to base plan limit immediately once temporary override has expired', () => {
      const pastExpiry = new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      const expiredOverride: CustomLimitsOverride = {
        max_users: 15,
        expires_at: pastExpiry,
        reason: 'Expired promo grant',
        is_active: true,
      }

      const check = checkResourceLimit('max_users', 12, businessPlan, expiredOverride)
      assert.strictEqual(check.limit, businessPlan.max_users, 'Limit should revert to base Business Plan limit (10)')
      assert.strictEqual(check.allowed, false, 'Usage of 12 users should now be rejected as limit is 10')
      assert.strictEqual(check.exceeded, true)
    })

    it('applies temporary feature override while non-expired', () => {
      const futureExpiry = new Date(Date.now() + 14 * 86400000).toISOString()
      const featureOverride: CustomLimitsOverride = {
        feature_overrides: {
          whatsapp_notifications: true,
          api_access: true,
        },
        feature_expires_at: futureExpiry,
        is_active: true,
      }

      // Starter plan normally does NOT have whatsapp_notifications or api_access
      const hasWhatsApp = checkFeatureAccess('starter', 'whatsapp_notifications', DEFAULT_PLANS, featureOverride)
      const hasApi = checkFeatureAccess('starter', 'api_access', DEFAULT_PLANS, featureOverride)
      assert.strictEqual(hasWhatsApp, true, 'Starter should have temporary access to whatsapp_notifications')
      assert.strictEqual(hasApi, true, 'Starter should have temporary access to api_access')
    })

    it('falls back to base plan feature permissions once feature override has expired', () => {
      const pastExpiry = new Date(Date.now() - 3600000).toISOString()
      const expiredFeatureOverride: CustomLimitsOverride = {
        feature_overrides: {
          whatsapp_notifications: true,
          api_access: true,
        },
        feature_expires_at: pastExpiry,
        is_active: true,
      }

      const hasWhatsApp = checkFeatureAccess('starter', 'whatsapp_notifications', DEFAULT_PLANS, expiredFeatureOverride)
      const hasApi = checkFeatureAccess('starter', 'api_access', DEFAULT_PLANS, expiredFeatureOverride)
      assert.strictEqual(hasWhatsApp, false, 'Expired override must not grant whatsapp_notifications to Starter')
      assert.strictEqual(hasApi, false, 'Expired override must not grant api_access to Starter')
    })
  })

  describe('2. Practice Mode Quota Isolation', () => {
    it('strictly excludes practice mode orders from consuming monthly order quota in usage calculations', () => {
      const companyId = 'test-co-practice-isolation'
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      const dateIso = startOfMonth.toISOString()

      // Seed store with real orders and practice orders
      const orders = [
        { id: 'ord-1', company_id: companyId, created_at: dateIso, is_practice: false },
        { id: 'ord-2', company_id: companyId, created_at: dateIso, is_practice: false },
        { id: 'ord-3', company_id: companyId, created_at: dateIso, is_practice: true }, // Practice mode
        { id: 'ord-4', company_id: companyId, created_at: dateIso, is_practice: true }, // Practice mode
      ]
      PrintERPDataStore.set(STORAGE_KEYS.ORDERS, orders)

      const usage = getTenantResourceUsage(companyId, starterPlan)
      assert.strictEqual(usage.orders_this_month, 2, 'Usage calculation must only count non-practice orders (2 instead of 4)')
    })
  })

  describe('3. Resource Creation Feasibility (canCreate)', () => {
    it('returns true when resource count is under allowed limit', async () => {
      const companyId = 'test-can-create-under'
      const plan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
      const sub: CompanySubscriptionRecord = {
        id: 'sub-can-create-1',
        company_id: companyId,
        plan_id: plan.id,
        plan_code: 'starter',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      }
      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [companyId]: sub })
      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_USERS, [{ id: 'u1', company_id: companyId, status: 'active' }])

      const canAddUser = await EntitlementService.canCreate(companyId, 'max_users')
      assert.strictEqual(canAddUser, true, 'Tenant with 1 user and limit of 3 should be able to create user')
    })

    it('returns false when resource count reaches or exceeds limit', async () => {
      const companyId = 'test-can-create-over'
      const plan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
      const sub: CompanySubscriptionRecord = {
        id: 'sub-can-create-2',
        company_id: companyId,
        plan_id: plan.id,
        plan_code: 'starter',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      }
      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [companyId]: sub })
      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_USERS, [
        { id: 'u1', company_id: companyId, status: 'active' },
        { id: 'u2', company_id: companyId, status: 'active' },
        { id: 'u3', company_id: companyId, status: 'active' },
      ])

      const canAddUser = await EntitlementService.canCreate(companyId, 'max_users')
      assert.strictEqual(canAddUser, false, 'Tenant with 3 users on Starter (limit 3) must be blocked from adding user')
    })
  })

  describe('4. Over-Limit State Detection & Non-Destructive Remediation', () => {
    it('detects over-limit state across metered resources without destroying existing records', async () => {
      const companyId = 'test-downgrade-overlimit'
      // Tenant downgraded to Starter (limit: 3 users, 1 branch) but has 5 users and 3 branches
      const plan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
      const sub: CompanySubscriptionRecord = {
        id: 'sub-overlimit',
        company_id: companyId,
        plan_id: plan.id,
        plan_code: 'starter',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      }
      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, { [companyId]: sub })
      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_USERS, [
        { id: 'u1', company_id: companyId, status: 'active' },
        { id: 'u2', company_id: companyId, status: 'active' },
        { id: 'u3', company_id: companyId, status: 'active' },
        { id: 'u4', company_id: companyId, status: 'active' },
        { id: 'u5', company_id: companyId, status: 'active' },
      ])
      PrintERPDataStore.set(STORAGE_KEYS.BRANCHES, [
        { id: 'b1', company_id: companyId, is_active: true },
        { id: 'b2', company_id: companyId, is_active: true },
        { id: 'b3', company_id: companyId, is_active: true },
      ])

      const summary = await EntitlementService.getOverLimitSummary(companyId)
      assert.strictEqual(summary.isOverLimit, true, 'Summary must flag over-limit state')
      assert.ok(summary.exceededItems.some((i) => i.resource === 'max_users' && i.excessCount === 2))
      assert.ok(summary.exceededItems.some((i) => i.resource === 'max_branches' && i.excessCount === 2))
    })
  })

  describe('5. SubscriptionGuard Server Integration', () => {
    it('exposes canCreate and getOverLimitSummary on SubscriptionGuard', async () => {
      const companyId = 'test-guard-integration'
      const summary = await SubscriptionGuard.getOverLimitSummary(companyId)
      assert.ok(summary !== undefined)
      assert.ok(typeof summary.isOverLimit === 'boolean')
    })
  })
})
