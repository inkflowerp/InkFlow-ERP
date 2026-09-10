'use server'

import { revalidatePath } from 'next/cache'
import { SubscriptionService } from '@/services/subscription.service'
import { EntitlementService } from '@/services/entitlement.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import type {
  PlanCode,
  BillingInterval,
  PaymentGatewayType,
  CompanySubscriptionRecord,
  TenantEntitlements,
  SubscriptionCheckoutInput,
  SubscriptionCheckoutResult,
  SubscriptionVerificationResult,
  SubscriptionEventRecord,
  SubscriptionInvoiceRecord,
} from '@/types/subscription.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Fetches authoritative tenant subscription record
 */
export async function getTenantSubscriptionAction(
  requestedCompanyId?: string,
  companySlug?: string
): Promise<ServerActionResult<CompanySubscriptionRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId || 'default'

    const subscription = await SubscriptionService.getTenantSubscription(companyId, companySlug)
    return { success: true, data: subscription }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch subscription' }
  }
}

/**
 * Server Action: Fetches authoritative tenant entitlements & quota limits
 */
export async function getTenantEntitlementsAction(
  requestedCompanyId?: string,
  companySlug?: string
): Promise<ServerActionResult<TenantEntitlements>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId || 'default'

    const entitlements = await EntitlementService.getTenantEntitlements(companyId, companySlug)
    return { success: true, data: entitlements }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch entitlements' }
  }
}

/**
 * Server Action: Initiates real payment gateway checkout for plan purchase or upgrade
 */
export async function initiateSubscriptionCheckoutAction(
  input: Omit<SubscriptionCheckoutInput, 'companyId'> & { companyId?: string },
  requestedCompanyId?: string
): Promise<ServerActionResult<SubscriptionCheckoutResult>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId || input.companyId)
    const companyId = tenant?.companyId || requestedCompanyId || input.companyId

    if (!companyId) {
      return { success: false, error: 'Unauthorized: No active tenant context.' }
    }

    const hasPermission =
      !tenant ||
      tenant.companyRole === 'business_owner' ||
      tenant.permissions?.includes('*') ||
      tenant.permissions?.includes('billing.manage')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: Only company owners can change subscription.' }
    }

    const result = await SubscriptionService.initiatePlanCheckout(
      {
        ...input,
        companyId,
        customerName: tenant?.fullName || input.customerName || 'Tenant Administrator',
        customerEmail: tenant?.userEmail || input.customerEmail || '',
        customerPhone: input.customerPhone || '',
      },
      tenant?.userId
    )

    revalidatePath('/', 'layout')
    return { success: result.success, data: result, error: result.error }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to initiate checkout' }
  }
}

/**
 * Server Action: Verifies payment with provider API and activates paid subscription
 */
export async function verifySubscriptionPaymentAction(params: {
  internalTrxId?: string
  providerTrxId?: string
  gatewayReference?: string
  provider?: string
}): Promise<ServerActionResult<SubscriptionVerificationResult>> {
  try {
    const tenant = await getCurrentTenant()
    const result = await SubscriptionService.verifyPaymentAndActivateSubscription({
      ...params,
      userId: tenant?.userId,
    })

    revalidatePath('/', 'layout')
    return { success: result.success, data: result, error: result.error }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to verify payment' }
  }
}

/**
 * Server Action: Schedules safe plan downgrade at the end of the billing cycle
 */
export async function schedulePlanDowngradeAction(
  nextPlanCode: PlanCode,
  requestedCompanyId?: string
): Promise<ServerActionResult<{ effectiveAt?: string }>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId

    if (!companyId) {
      return { success: false, error: 'Unauthorized: No active tenant context.' }
    }

    const result = await SubscriptionService.schedulePlanDowngrade(
      companyId,
      nextPlanCode,
      tenant?.userId
    )

    revalidatePath('/', 'layout')
    return { success: result.success, data: { effectiveAt: result.effectiveAt }, error: result.error }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to schedule downgrade' }
  }
}

/**
 * Server Action: Cancels subscription (at period end or immediately)
 */
export async function cancelSubscriptionAction(
  immediately: boolean = false,
  reason?: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId

    if (!companyId) {
      return { success: false, error: 'Unauthorized: No active tenant context.' }
    }

    const result = await SubscriptionService.cancelSubscription(
      companyId,
      immediately,
      reason,
      tenant?.userId
    )

    revalidatePath('/', 'layout')
    return { success: result.success, data: true, error: result.error }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to cancel subscription' }
  }
}

/**
 * Server Action: Reactivates subscription with pending cancellation
 */
export async function reactivateSubscriptionAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId

    if (!companyId) {
      return { success: false, error: 'Unauthorized: No active tenant context.' }
    }

    const result = await SubscriptionService.reactivateSubscription(companyId, tenant?.userId)

    revalidatePath('/', 'layout')
    return { success: result.success, data: true, error: result.error }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reactivate subscription' }
  }
}

/**
 * Server Action: Fetches immutable subscription events audit ledger
 */
export async function getSubscriptionEventsAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<SubscriptionEventRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId

    const events = await SubscriptionService.getSubscriptionEvents(companyId)
    return { success: true, data: events }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch subscription events' }
  }
}

/**
 * Server Action: Platform reconciliation list
 */
export async function getPlatformReconciliationAction(): Promise<ServerActionResult<any[]>> {
  try {
    const list = await SubscriptionService.getPlatformReconciliationList()
    return { success: true, data: list }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch reconciliation' }
  }
}

/**
 * Server Action: Triggers background lifecycle evaluation cron
 */
export async function triggerLifecycleCronAction(): Promise<ServerActionResult<any>> {
  try {
    const result = await SubscriptionService.processLifecycleCron()
    revalidatePath('/', 'layout')
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to execute lifecycle cron' }
  }
}

/**
 * Server Action: Fetches authoritative tenant invoices and receipts
 */
export async function getTenantSubscriptionInvoicesAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<SubscriptionInvoiceRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId

    if (!companyId) {
      return { success: false, error: 'Unauthorized: No active tenant context.' }
    }

    const invoices = await SubscriptionService.getTenantInvoices(companyId)
    return { success: true, data: invoices }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch tenant invoices' }
  }
}
