import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { SubscriptionService, DEFAULT_PLANS } from '../../services/subscription.service.ts'
import { EntitlementService } from '../../services/entitlement.service.ts'
import { SubscriptionGuard } from '../../lib/subscription/subscription-guard.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { CompanySubscriptionRecord, SubscriptionPlanRecord } from '../../types/subscription.types.ts'

describe('Subscription Security & Bypass Prevention Test Suite (Adversarial Certification)', () => {
  const tenantA = 'tenant-sec-a'
  const tenantB = 'tenant-sec-b'

  beforeEach(() => {
    // Reset test memory store with base seed
    const subs: Record<string, CompanySubscriptionRecord> = {
      [tenantA]: {
        id: 'sub-sec-a',
        company_id: tenantA,
        plan_id: 'sp-01',
        plan_code: 'starter',
        plan_name: 'Starter Plan',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date(Date.now() - 5 * 86400000).toISOString(),
        current_period_end: new Date(Date.now() + 25 * 86400000).toISOString(),
        trial_ends_at: null,
        payment_method_type: 'bkash',
        last_payment_reference: 'TRX-LEGIT-1001',
        custom_limits_override: null,
      },
      [tenantB]: {
        id: 'sub-sec-b',
        company_id: tenantB,
        plan_id: 'sp-02',
        plan_code: 'business',
        plan_name: 'Business Plan',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date(Date.now() - 10 * 86400000).toISOString(),
        current_period_end: new Date(Date.now() + 20 * 86400000).toISOString(),
        trial_ends_at: null,
        payment_method_type: 'sslcommerz',
        last_payment_reference: 'TRX-LEGIT-2002',
        custom_limits_override: null,
      },
    }

    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, subs, false)
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_PLANS, DEFAULT_PLANS, false)
    PrintERPDataStore.set(STORAGE_KEYS.GATEWAY_TRANSACTIONS, [], false)
  })

  // ============================================================================
  // 1. ABSOLUTE BUSINESS RULE & PATH AUTHORIZATION TESTS
  // ============================================================================
  describe('1. Absolute Business Rule (Path 1: Payment, Path 2: Admin Only)', () => {
    test('Tenant cannot self-verify manual or bank_wire payment without platform admin session', async () => {
      const pendingTx = {
        id: 'tx-manual-1',
        tenant_id: tenantA,
        provider: 'manual',
        internal_trx_id: 'SUB-MANUAL-1001',
        amount: 4999,
        currency: 'BDT',
        payment_status: 'initiated',
        verification_status: 'unverified',
        verification_payload: {
          companyId: tenantA,
          planCode: 'business',
          interval: 'monthly',
        },
      }
      PrintERPDataStore.set(STORAGE_KEYS.GATEWAY_TRANSACTIONS, [pendingTx], false)

      const res = await SubscriptionService.verifyPaymentAndActivateSubscription({
        internalTrxId: 'SUB-MANUAL-1001',
        userId: 'regular-tenant-user-uuid',
        isPlatformAdmin: false,
      })

      assert.strictEqual(res.success, false, 'Manual payment verification must fail for non-admin')
      assert.match(res.error || '', /platform administrator authorization/i)

      const sub = await SubscriptionService.getTenantSubscription(tenantA)
      assert.strictEqual(sub.plan_code, 'starter', 'Tenant plan must remain starter after rejected verification')
    })

    test('Platform admin CAN verify manual payment and activate upgrade', async () => {
      const pendingTx = {
        id: 'tx-manual-2',
        tenant_id: tenantA,
        provider: 'bank_wire',
        internal_trx_id: 'SUB-WIRE-2002',
        amount: 4999,
        currency: 'BDT',
        payment_status: 'initiated',
        verification_status: 'unverified',
        verification_payload: {
          companyId: tenantA,
          planCode: 'business',
          interval: 'monthly',
        },
      }
      PrintERPDataStore.set(STORAGE_KEYS.GATEWAY_TRANSACTIONS, [pendingTx], false)

      const res = await SubscriptionService.verifyPaymentAndActivateSubscription({
        internalTrxId: 'SUB-WIRE-2002',
        userId: 'admin-user-uuid',
        isPlatformAdmin: true,
      })

      assert.strictEqual(res.success, true, 'Manual payment verification must succeed for platform admin')
      assert.strictEqual(res.status, 'paid')

      const sub = await SubscriptionService.getTenantSubscription(tenantA)
      assert.strictEqual(sub.plan_code, 'business', 'Tenant plan must be upgraded to business')
    })

    test('Non-existent or forged transaction ID fails verification', async () => {
      const res = await SubscriptionService.verifyPaymentAndActivateSubscription({
        internalTrxId: 'SUB-FORGED-9999999',
        userId: 'any-user',
      })

      assert.strictEqual(res.success, false)
      assert.match(res.error || '', /not found/i)
    })

    test('Replaying already verified transaction returns idempotent success without corrupting state', async () => {
      const tx = {
        id: 'tx-idempotent-1',
        tenant_id: tenantA,
        provider: 'mock',
        internal_trx_id: 'SUB-IDEMPOTENT-100',
        amount: 4999,
        currency: 'BDT',
        payment_status: 'paid',
        verification_status: 'verified',
        verification_payload: {
          companyId: tenantA,
          planCode: 'business',
          interval: 'monthly',
        },
      }
      PrintERPDataStore.set(STORAGE_KEYS.GATEWAY_TRANSACTIONS, [tx], false)

      const res = await SubscriptionService.verifyPaymentAndActivateSubscription({
        internalTrxId: 'SUB-IDEMPOTENT-100',
        userId: 'user-owner',
      })

      assert.strictEqual(res.success, true)
      assert.strictEqual(res.status, 'paid')
    })
  })

  // ============================================================================
  // 2. FAIL-CLOSED & EXPIRY ENFORCEMENT
  // ============================================================================
  describe('2. Fail-Closed & Server Timestamp Expiry Enforcement', () => {
    test('Expired trial account is denied premium feature access immediately', async () => {
      const trialCompany = 'tenant-expired-trial'
      const subs = PrintERPDataStore.get<Record<string, any>>(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS) || {}
      subs[trialCompany] = {
        id: 'sub-expired-trial',
        company_id: trialCompany,
        plan_id: 'sp-00',
        plan_code: 'trial',
        plan_name: 'Free Trial',
        status: 'trial',
        billing_interval: 'monthly',
        current_period_start: new Date(Date.now() - 30 * 86400000).toISOString(),
        current_period_end: new Date(Date.now() - 16 * 86400000).toISOString(),
        trial_ends_at: new Date(Date.now() - 16 * 86400000).toISOString(),
        payment_method_type: null,
        last_payment_reference: null,
      }
      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, subs, false)

      const canAccess = await EntitlementService.canUseFeature(trialCompany, 'inventory_rolls')
      assert.strictEqual(canAccess, false, 'Expired trial must have zero access to premium features')

      await assert.rejects(
        async () => {
          await SubscriptionGuard.requireFeature(trialCompany, 'inventory_rolls')
        },
        /Subscription Expired|Feature Access Restricted/i,
        'SubscriptionGuard must throw error on expired trial'
      )
    })

    test('Expired active subscription past grace period is denied feature access', async () => {
      const expiredActiveCompany = 'tenant-expired-active'
      const subs = PrintERPDataStore.get<Record<string, any>>(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS) || {}
      subs[expiredActiveCompany] = {
        id: 'sub-expired-active',
        company_id: expiredActiveCompany,
        plan_id: 'sp-02',
        plan_code: 'business',
        plan_name: 'Business Plan',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date(Date.now() - 60 * 86400000).toISOString(),
        current_period_end: new Date(Date.now() - 10 * 86400000).toISOString(),
        grace_period_ends_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        trial_ends_at: null,
        payment_method_type: 'bkash',
        last_payment_reference: 'TRX-OLD-999',
      }
      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, subs, false)

      const canAccess = await EntitlementService.canUseFeature(expiredActiveCompany, 'inventory_rolls')
      assert.strictEqual(canAccess, false, 'Expired active subscription past grace period must lose access')
    })

    test('Cancelled subscription past current_period_end is denied feature access', async () => {
      const cancelledCompany = 'tenant-cancelled-past-period'
      const subs = PrintERPDataStore.get<Record<string, any>>(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS) || {}
      subs[cancelledCompany] = {
        id: 'sub-cancelled-1',
        company_id: cancelledCompany,
        plan_id: 'sp-02',
        plan_code: 'business',
        plan_name: 'Business Plan',
        status: 'cancelled',
        billing_interval: 'monthly',
        current_period_start: new Date(Date.now() - 60 * 86400000).toISOString(),
        current_period_end: new Date(Date.now() - 5 * 86400000).toISOString(),
        trial_ends_at: null,
        payment_method_type: null,
        last_payment_reference: null,
      }
      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, subs, false)

      const canAccess = await EntitlementService.canUseFeature(cancelledCompany, 'inventory_rolls')
      assert.strictEqual(canAccess, false, 'Cancelled subscription past period end must have zero feature access')
    })

    test('Unknown or missing company fails closed with 0 quotas and 0 features', async () => {
      const unknownCompany = 'non-existent-company-uuid-0000'
      const entitlements = await EntitlementService.getTenantEntitlements(unknownCompany)

      assert.strictEqual(entitlements.status, 'unknown')
      assert.strictEqual(entitlements.features.length, 0, 'Unknown company must have 0 features')

      const canAccess = await EntitlementService.canUseFeature(unknownCompany, 'basic_sales')
      assert.strictEqual(canAccess, false, 'Unknown company must be denied all features')
    })

    test('Suspended account is blocked from all operations', async () => {
      const suspendedCompany = 'tenant-suspended-corp'
      const subs = PrintERPDataStore.get<Record<string, any>>(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS) || {}
      subs[suspendedCompany] = {
        id: 'sub-suspended',
        company_id: suspendedCompany,
        plan_id: 'sp-03',
        plan_code: 'enterprise',
        plan_name: 'Enterprise Plan',
        status: 'suspended',
        billing_interval: 'yearly',
        current_period_start: new Date(Date.now() - 30 * 86400000).toISOString(),
        current_period_end: new Date(Date.now() + 335 * 86400000).toISOString(),
        trial_ends_at: null,
        payment_method_type: null,
        last_payment_reference: null,
      }
      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, subs, false)

      const canAccess = await EntitlementService.canUseFeature(suspendedCompany, 'api_access')
      assert.strictEqual(canAccess, false, 'Suspended enterprise account must be denied feature access')

      await assert.rejects(
        async () => {
          await SubscriptionGuard.requireSubscription(suspendedCompany)
        },
        /Account Suspended/i
      )
    })
  })

  // ============================================================================
  // 3. STRICT FEATURE GATING & LIMIT ENFORCEMENT
  // ============================================================================
  describe('3. Strict Feature Gating & Quota Limits', () => {
    test('Starter plan is restricted from Business and Enterprise features', async () => {
      const hasRolls = await EntitlementService.canUseFeature(tenantA, 'inventory_rolls')
      const hasWorkflows = await EntitlementService.canUseFeature(tenantA, 'custom_workflows')
      const hasMultiBranch = await EntitlementService.canUseFeature(tenantA, 'multi_branch')
      const hasBasicSales = await EntitlementService.canUseFeature(tenantA, 'basic_sales')

      assert.strictEqual(hasRolls, false, 'Starter plan cannot access inventory_rolls')
      assert.strictEqual(hasWorkflows, false, 'Starter plan cannot access custom_workflows')
      assert.strictEqual(hasMultiBranch, false, 'Starter plan cannot access multi_branch')
      assert.strictEqual(hasBasicSales, true, 'Starter plan can access basic_sales')
    })

    test('Business plan can access inventory_rolls and reports, but not multi_branch or api_access', async () => {
      const hasRolls = await EntitlementService.canUseFeature(tenantB, 'inventory_rolls')
      const hasReports = await EntitlementService.canUseFeature(tenantB, 'reports')
      const hasMultiBranch = await EntitlementService.canUseFeature(tenantB, 'multi_branch')
      const hasApi = await EntitlementService.canUseFeature(tenantB, 'api_access')

      assert.strictEqual(hasRolls, true, 'Business plan can access inventory_rolls')
      assert.strictEqual(hasReports, true, 'Business plan can access reports')
      assert.strictEqual(hasMultiBranch, false, 'Business plan cannot access multi_branch')
      assert.strictEqual(hasApi, false, 'Business plan cannot access api_access')
    })

    test('enforceLimit throws Quota Exceeded error when limit is breached', async () => {
      await assert.rejects(
        async () => {
          await EntitlementService.enforceLimit(tenantA, 'max_users', 4)
        },
        /Plan Limit Reached|quota/i
      )
    })

    test('Expired custom overrides automatically stop granting elevated limits', async () => {
      const overrideTenant = 'tenant-override-exp'
      const subs = PrintERPDataStore.get<Record<string, any>>(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS) || {}
      subs[overrideTenant] = {
        id: 'sub-override-1',
        company_id: overrideTenant,
        plan_id: 'sp-01',
        plan_code: 'starter',
        plan_name: 'Starter Plan',
        status: 'active',
        billing_interval: 'monthly',
        current_period_start: new Date(Date.now() - 5 * 86400000).toISOString(),
        current_period_end: new Date(Date.now() + 25 * 86400000).toISOString(),
        trial_ends_at: null,
        custom_limits_override: {
          max_users: 10,
          is_active: true,
          expires_at: new Date(Date.now() - 1 * 86400000).toISOString(), // Expired yesterday
        },
      }
      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS, subs, false)

      // Base Starter limit is 3. Attempting 5 users with expired override of 10 must fail
      await assert.rejects(
        async () => {
          await EntitlementService.enforceLimit(overrideTenant, 'max_users', 5)
        },
        /Plan Limit Reached|quota/i,
        'Expired override must not grant quota'
      )
    })
  })

  // ============================================================================
  // 4. MULTI-TENANT ISOLATION & IDOR PREVENTION
  // ============================================================================
  describe('4. Multi-Tenant Isolation & IDOR Protection', () => {
    test('Cross-tenant payment consumption is blocked', async () => {
      const txB = {
        id: 'tx-sec-b-1',
        tenant_id: tenantB,
        provider: 'mock',
        internal_trx_id: 'SUB-MOCK-B001',
        amount: 4999,
        currency: 'BDT',
        payment_status: 'initiated',
        verification_status: 'unverified',
        verification_payload: {
          companyId: tenantB,
          planCode: 'business',
          interval: 'monthly',
        },
      }
      PrintERPDataStore.set(STORAGE_KEYS.GATEWAY_TRANSACTIONS, [txB], false)

      const res = await SubscriptionService.verifyPaymentAndActivateSubscription({
        internalTrxId: 'SUB-MOCK-B001',
        userId: 'user-tenant-a',
      })

      const subA = await SubscriptionService.getTenantSubscription(tenantA)
      assert.strictEqual(subA.plan_code, 'starter', 'Tenant A must not be upgraded by Tenant B transaction')

      const subB = await SubscriptionService.getTenantSubscription(tenantB)
      assert.strictEqual(subB.plan_code, 'business', 'Tenant B is the legitimate target')
    })
  })
})
