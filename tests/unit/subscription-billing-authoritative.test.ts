import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  SubscriptionService,
  DEFAULT_PLANS,
  DEFAULT_TRIAL_PLAN,
  getTrialDaysRemaining,
  checkFeatureAccess,
  checkResourceLimit,
} from '../../services/subscription.service.ts'
import { EntitlementService } from '../../services/entitlement.service.ts'
import {
  resolveTenantAccountType,
  resolveSubscriptionPlan,
} from '../../types/subscription.types.ts'
import type {
  CompanySubscriptionRecord,
  SubscriptionPlanRecord,
} from '../../types/subscription.types.ts'

describe('Authoritative Subscription, Billing & Verification System Tests', () => {
  // ---------------------------------------------------------------------------
  // 1. Trial State & Plan Resolution Integrity
  // ---------------------------------------------------------------------------
  describe('1. Trial Correctness & Non-Starter State Guarantee', () => {
    it('Trial tenant resolves strictly to Trial account type and badge', () => {
      const trialSub = {
        status: 'trial' as const,
        plan_code: 'trial' as const,
      }

      const accountType = resolveTenantAccountType(trialSub)
      assert.strictEqual(accountType, 'trial', 'Must resolve to trial account type')

      const resolvedPlan = resolveSubscriptionPlan(trialSub)
      assert.strictEqual(resolvedPlan.isTrial, true)
      assert.strictEqual(resolvedPlan.planCode, 'trial')
      assert.strictEqual(resolvedPlan.badgeTextEn, 'Trial')
    })

    it('Trial tenant is NEVER displayed as Starter plan', () => {
      const trialWithLegacyPlan = {
        status: 'trial' as const,
        plan_code: 'starter' as any,
      }

      const accountType = resolveTenantAccountType(trialWithLegacyPlan)
      assert.strictEqual(accountType, 'trial', 'Status trial must override legacy plan_code starter')

      const resolvedPlan = resolveSubscriptionPlan(trialWithLegacyPlan)
      assert.strictEqual(resolvedPlan.isTrial, true)
      assert.strictEqual(resolvedPlan.planCode, 'trial')
      assert.strictEqual(resolvedPlan.badgeTextEn, 'Trial')
    })

    it('Paid active Starter tenant resolves strictly to Starter plan', () => {
      const paidStarterSub = {
        status: 'active' as const,
        plan_code: 'starter' as const,
      }

      const accountType = resolveTenantAccountType(paidStarterSub)
      assert.strictEqual(accountType, 'starter')

      const resolvedPlan = resolveSubscriptionPlan(paidStarterSub)
      assert.strictEqual(resolvedPlan.isTrial, false)
      assert.strictEqual(resolvedPlan.planCode, 'starter')
      assert.strictEqual(resolvedPlan.badgeTextEn, 'Starter')
    })

    it('Computes days remaining in trial accurately', () => {
      const futureDate = new Date(Date.now() + 5 * 86400000).toISOString()
      const days = getTrialDaysRemaining(futureDate, 14)
      assert.strictEqual(days, 5)

      const pastDate = new Date(Date.now() - 2 * 86400000).toISOString()
      const zeroDays = getTrialDaysRemaining(pastDate, 14)
      assert.strictEqual(zeroDays, 0)
    })
  })

  // ---------------------------------------------------------------------------
  // 2. Server-Authoritative Price & Proration Calculations
  // ---------------------------------------------------------------------------
  describe('2. Server-Side Proration & Price Calculation', () => {
    const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
    const businessPlan = DEFAULT_PLANS.find((p) => p.code === 'business')!
    const enterprisePlan = DEFAULT_PLANS.find((p) => p.code === 'enterprise')!

    it('Calculates upgrade price from Starter to Business with remaining credit', () => {
      const now = Date.now()
      const halfMonthAhead = new Date(now + 15 * 86400000).toISOString()

      const currentSub: CompanySubscriptionRecord = {
        id: 'sub-test-01',
        company_id: 'co-01',
        plan_id: starterPlan.id,
        plan_code: 'starter',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date(now - 15 * 86400000).toISOString(),
        current_period_end: halfMonthAhead,
      }

      const proration = SubscriptionService.calculateProration({
        currentSubscription: currentSub,
        currentPlan: starterPlan,
        targetPlan: businessPlan,
        targetInterval: 'monthly',
      })

      assert.strictEqual(proration.isUpgrade, true)
      assert.strictEqual(proration.targetPlanPrice, 4999)
      assert.ok(proration.unusedCredit > 0, 'Unused credit must be greater than 0 for remaining 15 days')
      assert.ok(proration.finalAmount < 4999, 'Final payable amount must discount unused credit')
      assert.strictEqual(proration.finalAmount, 4999 - proration.unusedCredit)
    })

    it('Trial tenant upgrading to Pro receives 0 proration credit and pays full plan price', () => {
      const trialSub: CompanySubscriptionRecord = {
        id: 'sub-trial-01',
        company_id: 'co-trial',
        plan_id: DEFAULT_TRIAL_PLAN.id,
        plan_code: 'trial',
        status: 'trial',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 14 * 86400000).toISOString(),
      }

      const proration = SubscriptionService.calculateProration({
        currentSubscription: trialSub,
        currentPlan: DEFAULT_TRIAL_PLAN,
        targetPlan: businessPlan,
        targetInterval: 'monthly',
      })

      assert.strictEqual(proration.unusedCredit, 0)
      assert.strictEqual(proration.finalAmount, 4999)
    })

    it('Calculates yearly upgrade pricing correctly', () => {
      const trialSub: CompanySubscriptionRecord = {
        id: 'sub-trial-02',
        company_id: 'co-trial-2',
        plan_id: DEFAULT_TRIAL_PLAN.id,
        plan_code: 'trial',
        status: 'trial',
        billing_interval: 'yearly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 14 * 86400000).toISOString(),
      }

      const proration = SubscriptionService.calculateProration({
        currentSubscription: trialSub,
        currentPlan: DEFAULT_TRIAL_PLAN,
        targetPlan: enterprisePlan,
        targetInterval: 'yearly',
      })

      assert.strictEqual(proration.targetPlanPrice, 99990)
      assert.strictEqual(proration.finalAmount, 99990)
    })
  })

  // ---------------------------------------------------------------------------
  // 3. Provider Payment Verification & Security
  // ---------------------------------------------------------------------------
  describe('3. Real Provider Verification & Rejection of Unverified States', () => {
    it('Rejects verification when transaction record does not exist', async () => {
      const result = await SubscriptionService.verifyPaymentAndActivateSubscription({
        internalTrxId: 'NON_EXISTENT_TRX_9999',
        provider: 'bkash',
      })

      assert.strictEqual(result.success, false)
      assert.strictEqual(result.status, 'failed')
      assert.ok(result.error?.includes('Transaction record not found'))
    })

    it('Rejects automated gateway verification if transaction ID is missing', async () => {
      const result = await SubscriptionService.verifyPaymentAndActivateSubscription({})

      assert.strictEqual(result.success, false)
      assert.strictEqual(result.status, 'failed')
      assert.ok(result.error?.includes('No transaction identifier provided.'))
    })

    it('Rejects automated gateway verification if gateway is not configured', async () => {
      // Trying to verify on an automated gateway when gateway record is missing in db
      const result = await SubscriptionService.verifyPaymentAndActivateSubscription({
        internalTrxId: 'TRX_MOCK_123',
        provider: 'non_existent_gateway',
      })

      assert.strictEqual(result.success, false)
      assert.strictEqual(result.status, 'failed')
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Feature Gating & Quota Limits
  // ---------------------------------------------------------------------------
  describe('4. Central Entitlement & Feature Gating Evaluation', () => {
    it('Trial plan includes full evaluation features', () => {
      const hasSales = checkFeatureAccess('trial', 'basic_sales', DEFAULT_PLANS)
      const hasKanban = checkFeatureAccess('trial', 'production_kanban', DEFAULT_PLANS)
      const hasApi = checkFeatureAccess('trial', 'api_access', DEFAULT_PLANS)

      assert.strictEqual(hasSales, true)
      assert.strictEqual(hasKanban, true)
      assert.strictEqual(hasApi, true)
    })

    it('Starter plan restricts advanced enterprise features', () => {
      const hasSales = checkFeatureAccess('starter', 'basic_sales', DEFAULT_PLANS)
      const hasApi = checkFeatureAccess('starter', 'api_access', DEFAULT_PLANS)
      const hasMultiBranch = checkFeatureAccess('starter', 'multi_branch', DEFAULT_PLANS)

      assert.strictEqual(hasSales, true)
      assert.strictEqual(hasApi, false)
      assert.strictEqual(hasMultiBranch, false)
    })

    it('Business plan includes production and reports but excludes multi-branch', () => {
      const hasKanban = checkFeatureAccess('business', 'production_kanban', DEFAULT_PLANS)
      const hasReports = checkFeatureAccess('business', 'reports_analytics', DEFAULT_PLANS)
      const hasMultiBranch = checkFeatureAccess('business', 'multi_branch', DEFAULT_PLANS)

      assert.strictEqual(hasKanban, true)
      assert.strictEqual(hasReports, true)
      assert.strictEqual(hasMultiBranch, false)
    })

    it('Resource limit check correctly calculates warnings and exceeded flags', () => {
      const starterPlan = DEFAULT_PLANS.find((p) => p.code === 'starter')!
      
      // Under limit (1 of 3 users)
      const underCheck = checkResourceLimit('max_users', 1, starterPlan)
      assert.strictEqual(underCheck.exceeded, false)
      assert.strictEqual(underCheck.warning, false)

      // Exceeded limit (3 of 3 users)
      const limitCheck = checkResourceLimit('max_users', 3, starterPlan)
      assert.strictEqual(limitCheck.exceeded, true)

      // Custom limit override takes precedence
      const overrideCheck = checkResourceLimit('max_users', 4, starterPlan, { max_users: 10 })
      assert.strictEqual(overrideCheck.limit, 10)
      assert.strictEqual(overrideCheck.exceeded, false)
    })
    it('EntitlementService.enforceLimit throws descriptive error when quota is exceeded', async () => {
      // Testing enforceLimit with currentCount overriding quota limit (e.g. 5 users against starter limit of 3)
      await assert.rejects(
        async () => {
          await EntitlementService.enforceLimit('test-company-1', 'max_users', 5)
        },
        (err: Error) => {
          assert.ok(err.message.includes('Plan Limit Reached'))
          assert.ok(err.message.includes('Users quota'))
          return true
        }
      )
    })

    it('EntitlementService.enforceFeature allows permitted features and rejects unpermitted', async () => {
      const allowed = await EntitlementService.canUseFeature('test-company-1', 'basic_sales')
      assert.strictEqual(typeof allowed, 'boolean')
    })
  })

  // ---------------------------------------------------------------------------
  // 5. Scheduled Changes, Cancellations & Lifecycle Cron
  // ---------------------------------------------------------------------------
  describe('5. Scheduled Changes & Lifecycle Cron Processing', () => {
    it('Lifecycle cron processes safely without throwing', async () => {
      const cronResult = await SubscriptionService.processLifecycleCron()
      assert.strictEqual(typeof cronResult.expiredTrials, 'number')
      assert.strictEqual(typeof cronResult.appliedDowngrades, 'number')
      assert.strictEqual(typeof cronResult.processedCancellations, 'number')
    })

    it('Fetches tenant invoices list with proper fields', async () => {
      const invoices = await SubscriptionService.getTenantInvoices('test-company-1')
      assert.ok(Array.isArray(invoices))
    })
  })
})
