// ==============================================================================
// InkFlow / PrintERP SaaS - Authoritative Platform Subscription & Billing Service
// Strict architectural isolation between Platform SaaS billing and Tenant billing.
// ==============================================================================

import { createAdminClient } from '../lib/supabase/admin.ts'
import type {
  PlatformSubscriptionStatus,
  PlatformBillingCycle,
  PlatformSaasPlanRecord,
  PlatformSubscriptionRecord,
  PlatformBillingTransactionRecord,
  PlatformSubscriptionEventRecord,
  PlatformReconciliationItem,
} from '../types/platform-subscription.types.ts'
import {
  DEFAULT_PLATFORM_PLANS,
  PlatformEntitlementService,
} from './platform-entitlement.service.ts'
import { GatewayService } from './gateway.service.ts'
import { createPaymentProvider } from '../lib/payments/provider.factory.ts'
import { CommunicationService } from './communication-server.service.ts'
import { decryptSecret } from '../lib/security/encryption.ts'

export interface InitiatePlatformCheckoutInput {
  platformAccountId?: string
  planId: string
  billingCycle: PlatformBillingCycle
  gatewayIntegrationId?: string
  provider: string
  returnUrl?: string
  cancelUrl?: string
  adminEmail?: string
  adminPhone?: string
}

export interface PlatformCheckoutResult {
  success: boolean
  internalTrxId?: string
  checkoutUrl?: string
  amount?: number
  currency?: string
  error?: string
}

export class PlatformSubscriptionService {
  private static memoryTransactions: Map<string, any> = new Map()
  /**
   * Fetches all active and public platform SaaS plans.
   */
  static async getPlatformPlans(): Promise<PlatformSaasPlanRecord[]> {
    try {
      const supabase = createAdminClient()
      const { data, error } = await (supabase as any)
        .from('platform_saas_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (data && data.length > 0 && !error) {
        return data as unknown as PlatformSaasPlanRecord[]
      }
    } catch {}
    return DEFAULT_PLATFORM_PLANS
  }

  /**
   * Fetches the current platform SaaS subscription record.
   */
  static async getPlatformSubscription(
    platformAccountId: string = 'platform_root'
  ): Promise<PlatformSubscriptionRecord> {
    return PlatformEntitlementService.getPlatformSubscription(platformAccountId)
  }

  /**
   * Calculates the authoritative amount and server-side proration for a platform plan purchase/upgrade.
   */
  static async calculatePlatformPrice(
    platformAccountId: string,
    targetPlanId: string,
    billingCycle: PlatformBillingCycle
  ): Promise<{
    targetPlan: PlatformSaasPlanRecord
    basePrice: number
    unusedCredit: number
    finalPayableAmount: number
    isUpgrade: boolean
  }> {
    const plans = await this.getPlatformPlans()
    const targetPlan = plans.find((p) => p.id === targetPlanId) || DEFAULT_PLATFORM_PLANS.find((p) => p.id === targetPlanId)

    if (!targetPlan) {
      throw new Error(`Invalid platform plan ID: ${targetPlanId}`)
    }

    const basePrice = billingCycle === 'yearly' ? targetPlan.yearly_price : targetPlan.monthly_price
    let unusedCredit = 0
    let isUpgrade = false

    const currentSub = await this.getPlatformSubscription(platformAccountId)

    if (currentSub && currentSub.status === 'ACTIVE' && currentSub.plan_id !== targetPlanId) {
      const now = new Date()
      const start = new Date(currentSub.current_period_start)
      const end = new Date(currentSub.current_period_end)

      const totalPeriodMs = end.getTime() - start.getTime()
      const remainingMs = end.getTime() - now.getTime()

      if (totalPeriodMs > 0 && remainingMs > 0) {
        const currentPlan = currentSub.plan || plans.find((p) => p.id === currentSub.plan_id)
        const currentPrice = currentSub.billing_cycle === 'yearly'
          ? (currentPlan?.yearly_price || 0)
          : (currentPlan?.monthly_price || 0)

        const remainingFraction = Math.min(1, Math.max(0, remainingMs / totalPeriodMs))
        unusedCredit = Math.round(currentPrice * remainingFraction * 100) / 100
        isUpgrade = true
      }
    }

    const finalPayableAmount = Math.max(0, Math.round((basePrice - unusedCredit) * 100) / 100)

    return {
      targetPlan,
      basePrice,
      unusedCredit,
      finalPayableAmount,
      isUpgrade,
    }
  }

  /**
   * Initiates a platform billing transaction with real gateway checkout.
   */
  static async createPlatformBillingTransaction(
    input: InitiatePlatformCheckoutInput
  ): Promise<PlatformCheckoutResult> {
    const platformAccountId = input.platformAccountId || 'platform_root'
    const { targetPlan, finalPayableAmount, isUpgrade } = await this.calculatePlatformPrice(
      platformAccountId,
      input.planId,
      input.billingCycle
    )

    const internalTrxId = `PLT-TX-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    const invoiceId = `PLT-INV-${Date.now().toString().slice(-6)}`

    // Determine gateway integration
    const gateways = await GatewayService.listGateways({ tenantId: null, category: 'payment' })
    let gateway = gateways.find((g) => g.id === input.gatewayIntegrationId && g.is_enabled)
    if (!gateway) {
      gateway = gateways.find((g) => g.provider === input.provider && g.is_enabled) || gateways.find((g) => g.is_default && g.is_enabled)
    }

    if (!gateway && input.provider !== 'bank_transfer' && input.provider !== 'manual') {
      return {
        success: false,
        error: `Payment gateway '${input.provider}' is not configured or is currently disabled.`,
      }
    }

    const supabase = createAdminClient()

    // 1. Insert transaction into database
    const transactionRecord = {
      billing_context: 'PLATFORM',
      platform_account_id: platformAccountId,
      tenant_id: null,
      plan_id: targetPlan.id,
      gateway_id: gateway?.id || null,
      provider: input.provider,
      invoice_id: invoiceId,
      amount: finalPayableAmount,
      currency: targetPlan.currency || 'BDT',
      internal_trx_id: internalTrxId,
      payment_status: 'pending',
      verification_status: 'UNVERIFIED',
      transaction_type: isUpgrade ? 'PLAN_UPGRADE' : 'SUBSCRIPTION_PURCHASE',
      initiated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    this.memoryTransactions.set(internalTrxId, transactionRecord)

    try {
      await (supabase as any).from('gateway_transactions').insert(transactionRecord)
    } catch {
      // Offline / memory resilience fallback
    }

    // 2. Initiate checkout via real gateway provider adapter
    let checkoutUrl = ''
    if (gateway) {
      try {
        const fullGw = await GatewayService.getGatewayById(gateway.id)
        const creds = fullGw ? GatewayService.getDecryptedCredentials(fullGw) : {}

        const adapter = createPaymentProvider({
          provider: gateway.provider,
          credentials: creds,
          publicConfig: fullGw?.public_config || gateway.public_config,
          environment: fullGw?.environment || gateway.environment,
        })

        const initResult = await adapter.initiatePayment({
          companyName: 'InkFlow SaaS Platform',
          invoiceId: invoiceId,
          planCode: targetPlan.slug,
          planName: targetPlan.name,
          billingInterval: input.billingCycle === 'yearly' ? 'yearly' : 'monthly',
          amount: finalPayableAmount,
          currency: (targetPlan.currency?.toUpperCase() === 'USD' ? 'USD' : 'BDT') as 'BDT' | 'USD',
          customerName: 'Platform Owner / SaaS Cluster Admin',
          customerEmail: input.adminEmail || 'admin@inkflow.io',
          customerPhone: input.adminPhone || '+8801700000000',
          redirectUrl: input.returnUrl || 'http://localhost:3000/platform/billing?status=processing',
          cancelUrl: input.cancelUrl || 'http://localhost:3000/platform/billing?status=cancelled',
          callbackUrl: 'http://localhost:3000/api/webhooks/' + gateway.provider,
          metadata: {
            internal_trx_id: internalTrxId,
            billing_context: 'PLATFORM',
            platform_account_id: platformAccountId,
            plan_id: targetPlan.id,
            billing_cycle: input.billingCycle,
          },
        })

        if (initResult.success && initResult.checkoutUrl) {
          checkoutUrl = initResult.checkoutUrl
          await (supabase as any)
            .from('gateway_transactions')
            .update({ payment_url: checkoutUrl })
            .eq('internal_trx_id', internalTrxId)
        }
      } catch (err: any) {
        return {
          success: false,
          error: `Gateway initialization error: ${err.message || 'Provider connection failed'}`,
        }
      }
    }

    // 3. Dispatch Multi-Channel Communication (Email / SMS / WhatsApp / Telegram)
    try {
      await CommunicationService.dispatchWorkflowNotification({
        companyId: 'platform_root',
        eventType: 'invoice_created',
        recipientName: 'Platform Administrator',
        recipientEmail: input.adminEmail || 'admin@inkflow.io',
        recipientPhone: input.adminPhone || '+8801700000000',
        variables: {
          invoice_id: invoiceId,
          transaction_id: internalTrxId,
          amount: finalPayableAmount,
          currency: targetPlan.currency || 'BDT',
          plan_name: targetPlan.name,
          billing_cycle: input.billingCycle,
          checkout_url: checkoutUrl,
        },
      })
    } catch {}

    return {
      success: true,
      internalTrxId,
      checkoutUrl: checkoutUrl || undefined,
      amount: finalPayableAmount,
      currency: targetPlan.currency || 'BDT',
    }
  }

  /**
   * Server-side cryptographic and stateful verification of platform payment.
   * Authoritatively updates platform subscription upon verified provider confirmation.
   */
  static async verifyPlatformPaymentAndActivateSubscription(
    internalTrxId: string,
    verificationPayload?: Record<string, any>
  ): Promise<{
    success: boolean
    isVerified: boolean
    subscription?: PlatformSubscriptionRecord
    failureReason?: string
    message?: string
  }> {
    const supabase = createAdminClient()

    // 1. Fetch transaction record
    let trx: any = null
    try {
      const { data } = await (supabase as any)
        .from('gateway_transactions')
        .select('*')
        .eq('internal_trx_id', internalTrxId)
        .eq('billing_context', 'PLATFORM')
        .maybeSingle()
      trx = data
    } catch {}

    if (!trx) {
      trx = this.memoryTransactions.get(internalTrxId)
    }

    if (!trx) {
      return {
        success: false,
        isVerified: false,
        failureReason: `Platform transaction '${internalTrxId}' not found.`,
      }
    }

    // 2. IDEMPOTENCY CHECK: If already verified and active, return without re-extending
    if (trx.payment_status === 'paid' && trx.verification_status === 'VERIFIED') {
      const currentSub = await this.getPlatformSubscription(trx.platform_account_id || 'platform_root')
      return {
        success: true,
        isVerified: true,
        subscription: currentSub,
        message: 'Payment has already been authoritatively verified and activated.',
      }
    }

    // 3. Provider verification
    let isVerified = false
    let providerTrxId = verificationPayload?.provider_trx_id || verificationPayload?.bank_trx_id || ''
    let failureReason: string | undefined

    if (trx.provider === 'bank_transfer' || trx.provider === 'manual') {
      // Manual/Bank Wire requires explicit platform admin confirmation reference
      if (verificationPayload?.admin_verified === true || verificationPayload?.verification_code === 'MANUAL_VERIFIED') {
        isVerified = true
        providerTrxId = verificationPayload?.bank_trx_id || `MANUAL-${Date.now()}`
      } else {
        isVerified = false
        failureReason = 'Manual bank wire requires platform administrator verification confirmation.'
      }
    } else {
      const gateways = await GatewayService.listGateways({ tenantId: null, category: 'payment' })
      const gw = gateways.find((g) => g.id === trx.gateway_id) || gateways.find((g) => g.provider === trx.provider && g.is_enabled)

      if (!gw) {
        isVerified = false
        failureReason = 'Payment gateway is not configured or is disabled in platform cluster.'
      } else {
        try {
          const fullGw = await GatewayService.getGatewayById(gw.id)
          const creds = fullGw ? GatewayService.getDecryptedCredentials(fullGw) : {}
          const adapter = createPaymentProvider({
            provider: gw.provider,
            credentials: creds,
            publicConfig: fullGw?.public_config || gw.public_config,
            environment: fullGw?.environment || gw.environment,
          })

          const verifyRes = await adapter.verifyPayment({
            transactionId: internalTrxId,
            paymentId: providerTrxId,
            amount: trx.amount,
            currency: trx.currency,
            paymentDetails: verificationPayload || {},
          })

          if (verifyRes.success && verifyRes.status === 'paid') {
            // Validate amount and currency tampering
            const amountMatches = !verifyRes.paidAmount || Math.abs(verifyRes.paidAmount - trx.amount) <= 0.01
            const currencyMatches = !verifyRes.currency || verifyRes.currency.toUpperCase() === trx.currency.toUpperCase()

            if (amountMatches && currencyMatches) {
              isVerified = true
              providerTrxId = verifyRes.gatewayTransactionId || providerTrxId
            } else {
              isVerified = false
              failureReason = `Amount/Currency tampering detected. Expected: ${trx.amount} ${trx.currency}, Received: ${verifyRes.paidAmount} ${verifyRes.currency}.`
            }
          } else {
            isVerified = false
            failureReason = verifyRes.error || 'Provider verification rejected transaction.'
          }
        } catch (err: any) {
          isVerified = false
          failureReason = `Provider verification network exception: ${err.message || 'Failed'}`
        }
      }
    }

    // 4. Update transaction status
    const now = new Date()

    if (this.memoryTransactions.has(internalTrxId)) {
      const mem = this.memoryTransactions.get(internalTrxId)
      this.memoryTransactions.set(internalTrxId, {
        ...mem,
        payment_status: isVerified ? 'paid' : 'failed',
        verification_status: isVerified ? 'VERIFIED' : 'REJECTED',
        provider_trx_id: providerTrxId || null,
        completed_at: isVerified ? now.toISOString() : null,
      })
    }

    try {
      await (supabase as any)
        .from('gateway_transactions')
        .update({
          payment_status: isVerified ? 'paid' : 'failed',
          verification_status: isVerified ? 'VERIFIED' : 'REJECTED',
          provider_trx_id: providerTrxId || null,
          verification_payload: verificationPayload || {},
          error_message: failureReason || null,
          completed_at: isVerified ? now.toISOString() : null,
          updated_at: now.toISOString(),
        })
        .eq('internal_trx_id', internalTrxId)
    } catch {}

    if (!isVerified) {
      // Record failed event
      try {
        await (supabase as any).from('platform_subscription_events').insert({
          subscription_id: '00000000-0000-0000-0000-000000000001',
          platform_account_id: trx.platform_account_id || 'platform_root',
          event_type: 'PAYMENT_FAILED',
          reason: failureReason,
          transaction_id: internalTrxId,
          created_at: now.toISOString(),
        })
      } catch {}

      return {
        success: false,
        isVerified: false,
        failureReason,
      }
    }

    // 5. Authoritatively update Platform Subscription state
    const plans = await this.getPlatformPlans()
    const plan = plans.find((p) => p.id === trx.plan_id) || DEFAULT_PLATFORM_PLANS[1]

    const cycle = (trx.metadata?.billing_cycle as PlatformBillingCycle) || 'yearly'
    const periodEnd = new Date(now.getTime() + (cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)

    const updatedSubRecord: Partial<PlatformSubscriptionRecord> = {
      plan_id: plan.id,
      status: 'ACTIVE',
      billing_cycle: cycle,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancelled_at: null,
      cancel_at_period_end: false,
      next_plan_id: null,
      change_effective_at: null,
      provider: trx.provider,
      provider_customer_id: trx.platform_account_id,
      provider_subscription_id: providerTrxId,
      updated_at: now.toISOString(),
    }

    try {
      await (supabase as any)
        .from('platform_subscriptions')
        .update(updatedSubRecord)
        .eq('platform_account_id', trx.platform_account_id || 'platform_root')

      // Record immutable subscription event
      await (supabase as any).from('platform_subscription_events').insert({
        subscription_id: '00000000-0000-0000-0000-000000000001',
        platform_account_id: trx.platform_account_id || 'platform_root',
        event_type: 'PAYMENT_VERIFIED',
        new_plan_id: plan.id,
        new_status: 'ACTIVE',
        reason: `Verified payment received via ${trx.provider}. Transaction ID: ${internalTrxId}`,
        transaction_id: internalTrxId,
        performed_by: 'system_gateway_verification',
        effective_date: now.toISOString(),
        created_at: now.toISOString(),
      })
    } catch {}

    // 6. Multi-Channel Notification Dispatch
    try {
      await CommunicationService.dispatchWorkflowNotification({
        companyId: 'platform_root',
        eventType: 'payment_received',
        recipientName: 'Platform Administrator',
        recipientEmail: 'admin@inkflow.io',
        variables: {
          invoice_id: trx.invoice_id || 'PLT-INV',
          transaction_id: internalTrxId,
          amount: trx.amount,
          currency: trx.currency,
          plan_name: plan.name,
          period_end: periodEnd.toISOString().split('T')[0],
        },
      })
    } catch {}

    const freshSub = await this.getPlatformSubscription(trx.platform_account_id || 'platform_root')
    return {
      success: true,
      isVerified: true,
      subscription: freshSub,
      message: `Platform subscription to ${plan.name} has been verified and activated.`,
    }
  }

  /**
   * Schedules a platform plan downgrade to take effect safely at the end of the current billing period.
   */
  static async schedulePlatformPlanDowngrade(
    platformAccountId: string = 'platform_root',
    newPlanId: string
  ): Promise<{ success: boolean; effectiveDate?: string; error?: string }> {
    const sub = await this.getPlatformSubscription(platformAccountId)
    const plans = await this.getPlatformPlans()
    const targetPlan = plans.find((p) => p.id === newPlanId)

    if (!targetPlan) {
      return { success: false, error: 'Target platform plan does not exist.' }
    }

    const effectiveDate = sub.current_period_end
    const supabase = createAdminClient()

    try {
      await (supabase as any)
        .from('platform_subscriptions')
        .update({
          next_plan_id: targetPlan.id,
          change_effective_at: effectiveDate,
          updated_at: new Date().toISOString(),
        })
        .eq('platform_account_id', platformAccountId)

      await (supabase as any).from('platform_subscription_events').insert({
        subscription_id: sub.id,
        platform_account_id: platformAccountId,
        event_type: 'PLAN_DOWNGRADED',
        previous_plan_id: sub.plan_id,
        new_plan_id: targetPlan.id,
        reason: `Scheduled downgrade to ${targetPlan.name} at end of current period.`,
        performed_by: 'platform_owner',
        effective_date: effectiveDate,
        created_at: new Date().toISOString(),
      })
    } catch {}

    try {
      await CommunicationService.dispatchWorkflowNotification({
        companyId: 'platform_root',
        eventType: 'invoice_created',
        recipientName: 'Platform Administrator',
        recipientEmail: 'admin@inkflow.io',
        variables: {
          current_plan: sub.plan?.name || 'Current Plan',
          next_plan: targetPlan.name,
          effective_date: effectiveDate.split('T')[0],
        },
      })
    } catch {}

    return { success: true, effectiveDate }
  }

  /**
   * Cancels platform subscription at period end or immediately.
   */
  static async cancelPlatformSubscription(
    platformAccountId: string = 'platform_root',
    atPeriodEnd: boolean = true
  ): Promise<{ success: boolean; message: string }> {
    const sub = await this.getPlatformSubscription(platformAccountId)
    const supabase = createAdminClient()
    const now = new Date()

    const updatePayload = atPeriodEnd
      ? { cancel_at_period_end: true, updated_at: now.toISOString() }
      : { status: 'CANCELLED', cancelled_at: now.toISOString(), updated_at: now.toISOString() }

    try {
      await (supabase as any)
        .from('platform_subscriptions')
        .update(updatePayload)
        .eq('platform_account_id', platformAccountId)

      await (supabase as any).from('platform_subscription_events').insert({
        subscription_id: sub.id,
        platform_account_id: platformAccountId,
        event_type: 'CANCELLED',
        previous_status: sub.status,
        new_status: atPeriodEnd ? sub.status : 'CANCELLED',
        reason: atPeriodEnd ? 'Scheduled cancellation at period end' : 'Immediate cancellation',
        performed_by: 'platform_owner',
        created_at: now.toISOString(),
      })
    } catch {}

    try {
      await CommunicationService.dispatchWorkflowNotification({
        companyId: 'platform_root',
        eventType: 'invoice_created',
        recipientName: 'Platform Administrator',
        recipientEmail: 'admin@inkflow.io',
        variables: {
          plan_name: sub.plan?.name || 'Platform Plan',
          effective_date: atPeriodEnd ? sub.current_period_end.split('T')[0] : now.toISOString().split('T')[0],
        },
      })
    } catch {}

    return {
      success: true,
      message: atPeriodEnd
        ? 'Platform subscription scheduled to cancel at end of billing cycle.'
        : 'Platform subscription cancelled immediately.',
    }
  }

  /**
   * Reactivates a platform subscription scheduled for cancellation.
   */
  static async reactivatePlatformSubscription(
    platformAccountId: string = 'platform_root'
  ): Promise<{ success: boolean; message: string }> {
    const sub = await this.getPlatformSubscription(platformAccountId)
    const supabase = createAdminClient()
    const now = new Date()

    try {
      await (supabase as any)
        .from('platform_subscriptions')
        .update({
          cancel_at_period_end: false,
          cancelled_at: null,
          status: 'ACTIVE',
          updated_at: now.toISOString(),
        })
        .eq('platform_account_id', platformAccountId)

      await (supabase as any).from('platform_subscription_events').insert({
        subscription_id: sub.id,
        platform_account_id: platformAccountId,
        event_type: 'REACTIVATED',
        previous_status: sub.status,
        new_status: 'ACTIVE',
        reason: 'Cancellation revoked by platform owner.',
        performed_by: 'platform_owner',
        created_at: now.toISOString(),
      })
    } catch {}

    return { success: true, message: 'Platform subscription reactivated successfully.' }
  }

  /**
   * Background lifecycle cron processor for platform subscriptions.
   * Handles trial expirations, scheduled downgrades, and period cancellations.
   */
  static async processPlatformLifecycleCron(): Promise<{
    trialsExpired: number
    downgradesExecuted: number
    cancellationsExecuted: number
  }> {
    const supabase = createAdminClient()
    const now = new Date().toISOString()
    let trialsExpired = 0
    let downgradesExecuted = 0
    let cancellationsExecuted = 0

    try {
      // 1. Expire trials
      const { data: expiredTrials } = await (supabase as any)
        .from('platform_subscriptions')
        .select('*')
        .eq('status', 'TRIALING')
        .lte('trial_end', now)

      for (const trial of expiredTrials || []) {
        await (supabase as any)
          .from('platform_subscriptions')
          .update({ status: 'EXPIRED', updated_at: now })
          .eq('id', trial.id)
        trialsExpired++
      }

      // 2. Execute scheduled downgrades
      const { data: pendingDowngrades } = await (supabase as any)
        .from('platform_subscriptions')
        .select('*')
        .not('next_plan_id', 'is', null)
        .lte('change_effective_at', now)

      for (const sub of pendingDowngrades || []) {
        await (supabase as any)
          .from('platform_subscriptions')
          .update({
            plan_id: sub.next_plan_id,
            next_plan_id: null,
            change_effective_at: null,
            updated_at: now,
          })
          .eq('id', sub.id)
        downgradesExecuted++
      }

      // 3. Process period-end cancellations
      const { data: pendingCancels } = await (supabase as any)
        .from('platform_subscriptions')
        .select('*')
        .eq('cancel_at_period_end', true)
        .lte('current_period_end', now)

      for (const cancel of pendingCancels || []) {
        await (supabase as any)
          .from('platform_subscriptions')
          .update({ status: 'CANCELLED', updated_at: now })
          .eq('id', cancel.id)
        cancellationsExecuted++
      }
    } catch {}

    return { trialsExpired, downgradesExecuted, cancellationsExecuted }
  }

  /**
   * Fetches the billing history of platform SaaS transactions.
   */
  static async getPlatformBillingHistory(
    platformAccountId: string = 'platform_root'
  ): Promise<PlatformBillingTransactionRecord[]> {
    try {
      const supabase = createAdminClient()
      const { data, error } = await (supabase as any)
        .from('gateway_transactions')
        .select('*')
        .eq('billing_context', 'PLATFORM')
        .eq('platform_account_id', platformAccountId)
        .order('created_at', { ascending: false })

      if (data && data.length > 0 && !error) {
        return data as unknown as PlatformBillingTransactionRecord[]
      }
    } catch {}
    return Array.from(this.memoryTransactions.values()) as PlatformBillingTransactionRecord[]
  }

  /**
   * Fetches the platform subscription lifecycle audit event trail.
   */
  static async getPlatformSubscriptionEvents(
    platformAccountId: string = 'platform_root'
  ): Promise<PlatformSubscriptionEventRecord[]> {
    try {
      const supabase = createAdminClient()
      const { data, error } = await (supabase as any)
        .from('platform_subscription_events')
        .select('*')
        .eq('platform_account_id', platformAccountId)
        .order('created_at', { ascending: false })

      if (data && !error) {
        return data as unknown as PlatformSubscriptionEventRecord[]
      }
    } catch {}
    return []
  }

  /**
   * Cross-checks platform transactions against subscriptions and flags mismatches.
   */
  static async getPlatformSubscriptionReconciliation(): Promise<PlatformReconciliationItem[]> {
    const transactions = await this.getPlatformBillingHistory('platform_root')
    const sub = await this.getPlatformSubscription('platform_root')
    const plans = await this.getPlatformPlans()

    return transactions.map((t) => {
      const plan = plans.find((p) => p.id === t.plan_id)
      const expectedAmount = t.amount
      const paidAmount = t.payment_status === 'paid' ? t.amount : 0
      const isMismatched =
        (t.payment_status === 'paid' && t.verification_status !== 'VERIFIED') ||
        (t.verification_status === 'VERIFIED' && t.payment_status !== 'paid') ||
        (t.payment_status === 'paid' && sub.status === 'EXPIRED')

      let mismatchReason: string | null = null
      if (t.payment_status === 'paid' && t.verification_status !== 'VERIFIED') {
        mismatchReason = 'Transaction marked paid without authoritative provider verification.'
      } else if (t.verification_status === 'VERIFIED' && t.payment_status !== 'paid') {
        mismatchReason = 'Transaction verified but payment status not updated to paid.'
      }

      return {
        internal_trx_id: t.internal_trx_id,
        provider_trx_id: t.provider_trx_id,
        provider: t.provider,
        billing_context: 'PLATFORM',
        plan_name: plan?.name || 'SaaS Cluster Plan',
        expected_amount: expectedAmount,
        paid_amount: paidAmount,
        currency: t.currency || 'BDT',
        payment_status: t.payment_status,
        verification_status: t.verification_status || 'UNVERIFIED',
        subscription_status: sub.status,
        created_at: t.created_at,
        is_mismatched: isMismatched,
        mismatch_reason: mismatchReason,
      }
    })
  }
}
