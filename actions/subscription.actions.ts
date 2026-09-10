'use server'

import { revalidatePath } from 'next/cache'
import { SubscriptionService } from '@/services/subscription.service'
import { EntitlementService } from '@/services/entitlement.service'
import { PlatformService } from '@/services/platform.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { GatewayService } from '@/services/gateway.service'
import { PAYMENT_GATEWAY_METADATA_LIST, PaymentGatewayMeta } from '@/lib/payments/types'
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
  SubscriptionPlanRecord,
} from '@/types/subscription.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PublicPlansData {
  plans: SubscriptionPlanRecord[]
  trialPlan: SubscriptionPlanRecord
  trialDays: number
  paidPlans: SubscriptionPlanRecord[]
  lowestPrice: number
  activePaymentGateways: PaymentGatewayMeta[]
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

/**
 * Server Action: Fetches active, valid & integrated platform payment gateways for checkout
 */
export async function getActivePaymentGatewaysAction(): Promise<ServerActionResult<PaymentGatewayMeta[]>> {
  try {
    const rawGateways = await GatewayService.listGateways({ tenantId: null, category: 'payment' })

    // Filter strictly for enabled and valid integrations
    const activeGateways = rawGateways.filter((g) => {
      if (g.is_enabled === false) return false
      if (g.status === 'disabled') return false
      if (g.provider === 'bank_wire') return true
      return g.has_credentials || g.status === 'connected' || Boolean(g.public_config && Object.keys(g.public_config).length > 0)
    })

    if (rawGateways && rawGateways.length > 0) {
      const activeMetas: PaymentGatewayMeta[] = []
      for (const g of activeGateways) {
        const meta = PAYMENT_GATEWAY_METADATA_LIST.find((m) => m.id === g.provider)
        if (meta && !activeMetas.some((m) => m.id === meta.id)) {
          activeMetas.push(meta)
        } else if (!meta) {
          activeMetas.push({
            id: g.provider as any,
            name: g.name,
            nameBn: g.name,
            category: 'gateway',
            iconName: 'CreditCard',
            description: `Payment via ${g.name}`,
            descriptionBn: `${g.name} গেটওয়ে`,
          })
        }
      }
      return { success: true, data: activeMetas }
    }

    // Default integrated fallback when no custom integrations are configured in DB at all
    const fallbackActive = PAYMENT_GATEWAY_METADATA_LIST.filter((m) =>
      ['bkash', 'sslcommerz', 'nagad', 'bank_wire'].includes(m.id)
    )
    return { success: true, data: fallbackActive }
  } catch (err: any) {
    const fallbackActive = PAYMENT_GATEWAY_METADATA_LIST.filter((m) =>
      ['bkash', 'sslcommerz', 'nagad', 'bank_wire'].includes(m.id)
    )
    return { success: true, data: fallbackActive }
  }
}

/**
 * Server Action: Fetches public active subscription plans & trial parameters for marketing surfaces
 */
export async function getPublicSubscriptionPlansAction(): Promise<ServerActionResult<PublicPlansData>> {
  try {
    const res = await PlatformService.getPlans()
    const allPlans = (res.success && res.data && res.data.length > 0) ? res.data : DEFAULT_PLANS
    const activePlans = allPlans.filter((p) => p.is_active !== false)
    const trialPlan = activePlans.find((p) => p.code === 'trial') || DEFAULT_TRIAL_PLAN
    const trialDays = trialPlan.trial_days || 14
    const paidPlans = activePlans
      .filter((p) => p.code !== 'trial')
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.price_monthly - b.price_monthly)

    const lowestPrice = paidPlans.length > 0 ? Math.min(...paidPlans.map((p) => p.price_monthly)) : 1999

    const gwRes = await getActivePaymentGatewaysAction()
    const activePaymentGateways = gwRes.data || PAYMENT_GATEWAY_METADATA_LIST.filter((m) =>
      ['bkash', 'sslcommerz', 'nagad', 'bank_wire'].includes(m.id)
    )

    return {
      success: true,
      data: {
        plans: activePlans,
        trialPlan,
        trialDays,
        paidPlans,
        lowestPrice,
        activePaymentGateways,
      },
    }
  } catch (err: any) {
    const trialPlan = DEFAULT_TRIAL_PLAN
    const paidPlans = DEFAULT_PLANS.filter((p) => p.code !== 'trial')
    const fallbackActive = PAYMENT_GATEWAY_METADATA_LIST.filter((m) =>
      ['bkash', 'sslcommerz', 'nagad', 'bank_wire'].includes(m.id)
    )
    return {
      success: true,
      data: {
        plans: DEFAULT_PLANS,
        trialPlan,
        trialDays: 14,
        paidPlans,
        lowestPrice: 1999,
        activePaymentGateways: fallbackActive,
      },
    }
  }
}


