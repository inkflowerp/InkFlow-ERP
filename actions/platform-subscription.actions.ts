'use server'

// ==============================================================================
// PrintFlow SaaS - Server Actions for Platform SaaS Billing & Subscriptions
// Strict server-side authorization: accessible ONLY by Platform Admins with proper RBAC.
// ==============================================================================

import { PlatformSubscriptionService, InitiatePlatformCheckoutInput } from '../services/platform-subscription.service.ts'
import { PlatformEntitlementService } from '../services/platform-entitlement.service.ts'
import { ApiResponse } from '../types/common.types.ts'
import type {
  PlatformSubscriptionRecord,
  PlatformSaasPlanRecord,
  PlatformBillingTransactionRecord,
  PlatformSubscriptionEventRecord,
  PlatformEntitlementSummary,
  PlatformReconciliationItem,
} from '../types/platform-subscription.types.ts'
import { withPlatformAction } from '../lib/actions/action-wrapper.ts'

export const getPlatformSubscriptionAction = withPlatformAction(
  { permission: 'subscription.view' },
  async (_ctx): Promise<ApiResponse<PlatformSubscriptionRecord>> => {
    const data = await PlatformSubscriptionService.getPlatformSubscription('platform_root')
    return { success: true, data }
  }
)

export const getPlatformPlansAction = withPlatformAction(
  { permission: 'plan.view' },
  async (_ctx): Promise<ApiResponse<PlatformSaasPlanRecord[]>> => {
    const data = await PlatformSubscriptionService.getPlatformPlans()
    return { success: true, data }
  }
)

export const getPlatformEntitlementSummaryAction = withPlatformAction(
  { permission: 'subscription.view' },
  async (_ctx): Promise<ApiResponse<PlatformEntitlementSummary>> => {
    const data = await PlatformEntitlementService.getPlatformEntitlementSummary('platform_root')
    return { success: true, data }
  }
)

export const initiatePlatformCheckoutAction = withPlatformAction(
  {
    permission: 'subscription.manage',
    audit: true,
    actionName: 'subscription.initiate_checkout',
    entityType: 'platform_subscription',
  },
  async (_ctx, input: InitiatePlatformCheckoutInput): Promise<ApiResponse<{ internalTrxId?: string; checkoutUrl?: string; amount?: number; currency?: string }>> => {
    const res = await PlatformSubscriptionService.createPlatformBillingTransaction(input)
    if (!res.success) {
      throw new Error(res.error || 'Failed to initiate platform checkout.')
    }
    return {
      success: true,
      data: {
        internalTrxId: res.internalTrxId,
        checkoutUrl: res.checkoutUrl,
        amount: res.amount,
        currency: res.currency,
      },
    }
  }
)

export const verifyPlatformPaymentAction = withPlatformAction(
  {
    permission: 'subscription.manage',
    audit: true,
    actionName: 'subscription.verify_payment',
    entityType: 'platform_subscription',
  },
  async (_ctx, internalTrxId: string, verificationPayload?: Record<string, any>): Promise<ApiResponse<{ isVerified: boolean; message?: string }>> => {
    const res = await PlatformSubscriptionService.verifyPlatformPaymentAndActivateSubscription(
      internalTrxId,
      verificationPayload
    )
    if (!res.isVerified) {
      throw new Error(res.failureReason || 'Payment verification failed with provider.')
    }
    return {
      success: true,
      data: {
        isVerified: true,
        message: res.message,
      },
    }
  }
)

export const schedulePlatformDowngradeAction = withPlatformAction(
  {
    permission: 'subscription.manage',
    audit: true,
    actionName: 'subscription.schedule_downgrade',
    entityType: 'platform_subscription',
  },
  async (_ctx, newPlanId: string): Promise<ApiResponse<{ effectiveDate?: string }>> => {
    const res = await PlatformSubscriptionService.schedulePlatformPlanDowngrade('platform_root', newPlanId)
    if (!res.success) {
      throw new Error(res.error || 'Failed to schedule plan downgrade.')
    }
    return { success: true, data: { effectiveDate: res.effectiveDate } }
  }
)

export const cancelPlatformSubscriptionAction = withPlatformAction(
  {
    permission: 'subscription.manage',
    audit: true,
    actionName: 'subscription.cancel',
    entityType: 'platform_subscription',
  },
  async (_ctx, atPeriodEnd: boolean = true): Promise<ApiResponse<{ message: string }>> => {
    const res = await PlatformSubscriptionService.cancelPlatformSubscription('platform_root', atPeriodEnd)
    return { success: true, data: { message: res.message } }
  }
)

export const reactivatePlatformSubscriptionAction = withPlatformAction(
  {
    permission: 'subscription.manage',
    audit: true,
    actionName: 'subscription.reactivate',
    entityType: 'platform_subscription',
  },
  async (_ctx): Promise<ApiResponse<{ message: string }>> => {
    const res = await PlatformSubscriptionService.reactivatePlatformSubscription('platform_root')
    return { success: true, data: { message: res.message } }
  }
)

export const getPlatformBillingHistoryAction = withPlatformAction(
  { permission: 'subscription.view' },
  async (_ctx): Promise<ApiResponse<PlatformBillingTransactionRecord[]>> => {
    const data = await PlatformSubscriptionService.getPlatformBillingHistory('platform_root')
    return { success: true, data }
  }
)

export const getPlatformSubscriptionEventsAction = withPlatformAction(
  { permission: 'subscription.view' },
  async (_ctx): Promise<ApiResponse<PlatformSubscriptionEventRecord[]>> => {
    const data = await PlatformSubscriptionService.getPlatformSubscriptionEvents('platform_root')
    return { success: true, data }
  }
)

export const getPlatformSubscriptionReconciliationAction = withPlatformAction(
  { permission: 'billing.reconcile' },
  async (_ctx): Promise<ApiResponse<PlatformReconciliationItem[]>> => {
    const data = await PlatformSubscriptionService.getPlatformSubscriptionReconciliation()
    return { success: true, data }
  }
)
