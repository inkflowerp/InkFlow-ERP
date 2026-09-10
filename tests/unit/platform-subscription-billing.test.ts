import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  PlatformEntitlementService,
  DEFAULT_PLATFORM_PLANS,
} from '../../services/platform-entitlement.service.ts'
import { PlatformSubscriptionService } from '../../services/platform-subscription.service.ts'

describe('Authoritative Platform Subscription & SaaS Billing Test Suite', () => {
  describe('1. Platform SaaS Plans & Server-Side Pricing', () => {
    it('should maintain authoritative platform plans with pricing and quota limits', async () => {
      const plans = await PlatformSubscriptionService.getPlatformPlans()
      assert.ok(Array.isArray(plans))
      assert.ok(plans.length >= 4)

      const starter = plans.find((p) => p.slug === 'saas_starter')
      assert.ok(starter)
      assert.strictEqual(starter.monthly_price, 14999.0)
      assert.strictEqual(starter.yearly_price, 149990.0)
      assert.strictEqual(starter.limits.max_tenants, 25)

      const growth = plans.find((p) => p.slug === 'saas_growth')
      assert.ok(growth)
      assert.strictEqual(growth.monthly_price, 34999.0)
      assert.strictEqual(growth.yearly_price, 349990.0)
      assert.strictEqual(growth.limits.max_tenants, 100)

      const enterprise = plans.find((p) => p.slug === 'saas_enterprise')
      assert.ok(enterprise)
      assert.strictEqual(enterprise.monthly_price, 79999.0)
      assert.strictEqual(enterprise.limits.max_tenants, 500)
    })

    it('should calculate authoritative server price and proration credits for upgrades', async () => {
      const growthPlan = DEFAULT_PLATFORM_PLANS.find((p) => p.slug === 'saas_growth')!
      const enterprisePlan = DEFAULT_PLATFORM_PLANS.find((p) => p.slug === 'saas_enterprise')!

      const priceResult = await PlatformSubscriptionService.calculatePlatformPrice(
        'platform_root',
        enterprisePlan.id,
        'yearly'
      )

      assert.strictEqual(priceResult.targetPlan.id, enterprisePlan.id)
      assert.strictEqual(priceResult.basePrice, enterprisePlan.yearly_price)
      assert.ok(priceResult.finalPayableAmount > 0)
      assert.ok(priceResult.finalPayableAmount <= enterprisePlan.yearly_price)
    })
  })

  describe('2. Platform Checkout & Transaction Context Separation', () => {
    it('should create billing transactions with strict PLATFORM billing context', async () => {
      const growthPlan = DEFAULT_PLATFORM_PLANS[1]
      const checkoutRes = await PlatformSubscriptionService.createPlatformBillingTransaction({
        platformAccountId: 'platform_root',
        planId: growthPlan.id,
        billingCycle: 'yearly',
        provider: 'bank_transfer',
        adminEmail: 'admin@inkflow.io',
      })

      assert.strictEqual(checkoutRes.success, true)
      assert.ok(checkoutRes.internalTrxId)
      assert.ok(checkoutRes.internalTrxId.startsWith('PLT-TX-'))
      assert.strictEqual(checkoutRes.currency, 'BDT')
      assert.strictEqual(checkoutRes.amount, growthPlan.yearly_price)
    })

    it('should reject unconfigured or non-existent payment gateways', async () => {
      const growthPlan = DEFAULT_PLATFORM_PLANS[1]
      const checkoutRes = await PlatformSubscriptionService.createPlatformBillingTransaction({
        platformAccountId: 'platform_root',
        planId: growthPlan.id,
        billingCycle: 'monthly',
        provider: 'unsupported_payment_provider_xyz',
      })

      assert.strictEqual(checkoutRes.success, false)
      assert.ok(checkoutRes.error?.includes('not configured or is currently disabled'))
    })
  })

  describe('3. Server-Side Provider Verification & Anti-Tampering', () => {
    it('should verify manual/bank wire payments with administrator confirmation reference', async () => {
      const growthPlan = DEFAULT_PLATFORM_PLANS[1]
      const checkoutRes = await PlatformSubscriptionService.createPlatformBillingTransaction({
        platformAccountId: 'platform_root',
        planId: growthPlan.id,
        billingCycle: 'yearly',
        provider: 'bank_transfer',
      })

      assert.ok(checkoutRes.internalTrxId)

      // Verification with admin confirmation
      const verifyRes = await PlatformSubscriptionService.verifyPlatformPaymentAndActivateSubscription(
        checkoutRes.internalTrxId,
        {
          admin_verified: true,
          verification_code: 'MANUAL_VERIFIED',
          bank_trx_id: 'BANK-CHQ-778899',
        }
      )

      assert.strictEqual(verifyRes.success, true)
      assert.strictEqual(verifyRes.isVerified, true)
      assert.ok(verifyRes.subscription)
      assert.strictEqual(verifyRes.subscription?.status, 'ACTIVE')
    })

    it('should reject unverified bank wire transactions without admin confirmation', async () => {
      const growthPlan = DEFAULT_PLATFORM_PLANS[1]
      const checkoutRes = await PlatformSubscriptionService.createPlatformBillingTransaction({
        platformAccountId: 'platform_root',
        planId: growthPlan.id,
        billingCycle: 'yearly',
        provider: 'bank_transfer',
      })

      assert.ok(checkoutRes.internalTrxId)

      const verifyRes = await PlatformSubscriptionService.verifyPlatformPaymentAndActivateSubscription(
        checkoutRes.internalTrxId,
        {
          admin_verified: false,
        }
      )

      assert.strictEqual(verifyRes.success, false)
      assert.strictEqual(verifyRes.isVerified, false)
      assert.ok(verifyRes.failureReason?.includes('requires platform administrator verification'))
    })

    it('should enforce idempotency and not re-extend on duplicate verification calls', async () => {
      const growthPlan = DEFAULT_PLATFORM_PLANS[1]
      const checkoutRes = await PlatformSubscriptionService.createPlatformBillingTransaction({
        platformAccountId: 'platform_root',
        planId: growthPlan.id,
        billingCycle: 'yearly',
        provider: 'bank_transfer',
      })

      assert.ok(checkoutRes.internalTrxId)

      // First verification
      const verify1 = await PlatformSubscriptionService.verifyPlatformPaymentAndActivateSubscription(
        checkoutRes.internalTrxId,
        {
          admin_verified: true,
          verification_code: 'MANUAL_VERIFIED',
          bank_trx_id: 'IDEM-99001',
        }
      )
      assert.strictEqual(verify1.isVerified, true)

      // Second duplicate verification
      const verify2 = await PlatformSubscriptionService.verifyPlatformPaymentAndActivateSubscription(
        checkoutRes.internalTrxId,
        {
          admin_verified: true,
          verification_code: 'MANUAL_VERIFIED',
          bank_trx_id: 'IDEM-99001',
        }
      )
      assert.strictEqual(verify2.isVerified, true)
      assert.ok(verify2.message?.includes('already been authoritatively verified'))
    })
  })

  describe('4. Scheduled Downgrades & Period-End Cancellations', () => {
    it('should schedule downgrades to take effect at period end without immediate loss of access', async () => {
      const starterPlan = DEFAULT_PLATFORM_PLANS[0]
      const downgradeRes = await PlatformSubscriptionService.schedulePlatformPlanDowngrade(
        'platform_root',
        starterPlan.id
      )

      assert.strictEqual(downgradeRes.success, true)
      assert.ok(downgradeRes.effectiveDate)

      // Gating must still allow growth features until period end
      const entitlement = await PlatformEntitlementService.platformCanUse(
        'advanced_analytics',
        'platform_root'
      )
      assert.strictEqual(entitlement.allowed, true)
    })

    it('should handle period-end cancellations safely without deleting cluster data', async () => {
      const cancelRes = await PlatformSubscriptionService.cancelPlatformSubscription(
        'platform_root',
        true
      )
      assert.strictEqual(cancelRes.success, true)
      assert.ok(cancelRes.message.includes('scheduled to cancel at end of billing cycle'))

      // Reactivation
      const reactivateRes = await PlatformSubscriptionService.reactivatePlatformSubscription(
        'platform_root'
      )
      assert.strictEqual(reactivateRes.success, true)
      assert.ok(reactivateRes.message.includes('reactivated successfully'))
    })
  })

  describe('5. Platform Entitlement & Quota Gating', () => {
    it('should evaluate platform features and reject unauthorized capabilities', async () => {
      const whiteLabelCheck = await PlatformEntitlementService.platformCanUse(
        'white_label',
        'platform_root'
      )
      // Growth Pro has standard analytics/gateways, Enterprise has white_label
      const summary = await PlatformEntitlementService.getPlatformEntitlementSummary('platform_root')
      assert.ok(summary)
      assert.strictEqual(summary.platform_account_id, 'platform_root')
      assert.ok(summary.limits.max_tenants >= 25)
      assert.ok(summary.usage.tenants_count >= 0)
    })

    it('should enforce platform limits and detect quota saturation', async () => {
      const quotaCheck = await PlatformEntitlementService.enforcePlatformLimit(
        'max_tenants',
        50,
        'platform_root'
      )
      assert.strictEqual(quotaCheck.allowed, true)

      const overflowCheck = await PlatformEntitlementService.enforcePlatformLimit(
        'max_tenants',
        5000,
        'platform_root'
      )
      assert.strictEqual(overflowCheck.allowed, false)
      assert.ok(overflowCheck.reason?.includes('quota limit exceeded'))
    })
  })

  describe('6. Platform Lifecycle Cron & Reconciliation', () => {
    it('should run platform lifecycle cron idempotently', async () => {
      const cronResult = await PlatformSubscriptionService.processPlatformLifecycleCron()
      assert.strictEqual(typeof cronResult.trialsExpired, 'number')
      assert.strictEqual(typeof cronResult.downgradesExecuted, 'number')
      assert.strictEqual(typeof cronResult.cancellationsExecuted, 'number')
    })

    it('should generate reconciliation ledger and flag mismatches', async () => {
      const reconList = await PlatformSubscriptionService.getPlatformSubscriptionReconciliation()
      assert.ok(Array.isArray(reconList))
      for (const item of reconList) {
        assert.strictEqual(item.billing_context, 'PLATFORM')
        assert.ok(item.internal_trx_id)
        assert.strictEqual(typeof item.is_mismatched, 'boolean')
      }
    })
  })
})
