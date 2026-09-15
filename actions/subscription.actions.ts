'use server'

import { revalidatePath } from 'next/cache'
import { SubscriptionService } from '@/services/subscription.service'
import { EntitlementService } from '@/services/entitlement.service'
import { PlatformService } from '@/services/platform.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { getCurrentPlatformUser } from '@/lib/auth/platform-auth'
import { GatewayService } from '@/services/gateway.service'
import { PAYMENT_GATEWAY_METADATA_LIST, PaymentGatewayMeta } from '@/lib/payments/types'
import { DEFAULT_PLANS, DEFAULT_TRIAL_PLAN } from '@/lib/subscription/subscription-constants'
import type {
  PlanCode,
  BillingInterval,
  PaymentGatewayType,
  CompanySubscriptionRecord,
  SubscriptionSnapshot,
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
 * Server Action: Fetches authoritative single-source SubscriptionSnapshot for a tenant
 */
export async function getAuthoritativeSubscriptionSnapshotAction(
  requestedCompanyId?: string,
  companySlug?: string
): Promise<ServerActionResult<SubscriptionSnapshot>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId || companySlug)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const slug = tenant.companySlug

    const snapshot = await SubscriptionService.resolveTenantSubscription(companyId, slug)
    return { success: true, data: snapshot }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to resolve authoritative subscription snapshot' }
  }
}

/**
 * Server Action: Fetches authoritative tenant subscription record
 */
export async function getTenantSubscriptionAction(
  requestedCompanyId?: string,
  companySlug?: string
): Promise<ServerActionResult<CompanySubscriptionRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId || companySlug)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const slug = tenant.companySlug

    const subscription = await SubscriptionService.getTenantSubscription(companyId, slug)
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
    const tenant = await getCurrentTenant(requestedCompanyId || companySlug)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId
    const slug = tenant.companySlug

    const entitlements = await EntitlementService.getTenantEntitlements(companyId, slug)
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
    const targetCompanyId = requestedCompanyId || input.companyId
    const tenant = await getCurrentTenant(targetCompanyId)

    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Active authenticated tenant session required.' }
    }

    if (targetCompanyId && tenant.companyId !== targetCompanyId) {
      return { success: false, error: 'Unauthorized: Cross-tenant subscription modification is strictly prohibited.' }
    }

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.primaryRole === 'business_owner' ||
      tenant.permissions.includes('billing.manage') ||
      tenant.permissions.includes('settings.full_control')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: Only company owners and billing administrators can modify subscriptions.' }
    }

    const result = await SubscriptionService.initiatePlanCheckout(
      {
        ...input,
        companyId: tenant.companyId,
        customerName: tenant.fullName || input.customerName || 'Tenant Administrator',
        customerEmail: tenant.userEmail || input.customerEmail || '',
        customerPhone: input.customerPhone || '',
      },
      tenant.userId
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

    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Active authenticated tenant session required.' }
    }

    if (requestedCompanyId && tenant.companyId !== requestedCompanyId) {
      return { success: false, error: 'Unauthorized: Cross-tenant subscription modification is prohibited.' }
    }

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.primaryRole === 'business_owner' ||
      tenant.permissions.includes('billing.manage')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: Insufficient permissions to change plan.' }
    }

    const result = await SubscriptionService.schedulePlanDowngrade(
      tenant.companyId,
      nextPlanCode,
      tenant.userId
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

    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Active authenticated tenant session required.' }
    }

    if (requestedCompanyId && tenant.companyId !== requestedCompanyId) {
      return { success: false, error: 'Unauthorized: Cross-tenant subscription cancellation is prohibited.' }
    }

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.primaryRole === 'business_owner' ||
      tenant.permissions.includes('billing.manage')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: Insufficient permissions to cancel subscription.' }
    }

    const result = await SubscriptionService.cancelSubscription(
      tenant.companyId,
      immediately,
      reason,
      tenant.userId
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

    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Active authenticated tenant session required.' }
    }

    if (requestedCompanyId && tenant.companyId !== requestedCompanyId) {
      return { success: false, error: 'Unauthorized: Cross-tenant subscription reactivation is prohibited.' }
    }

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.primaryRole === 'business_owner' ||
      tenant.permissions.includes('billing.manage')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: Insufficient permissions to reactivate subscription.' }
    }

    const result = await SubscriptionService.reactivateSubscription(tenant.companyId, tenant.userId)

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
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

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
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform administrator session required.' }
    }
    const list = await SubscriptionService.getPlatformReconciliationList()
    return { success: true, data: list }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch reconciliation' }
  }
}

/**
 * Server Action: Triggers background lifecycle evaluation cron
 * Strictly protected: requires Platform Admin authorization
 */
export async function triggerLifecycleCronAction(): Promise<ServerActionResult<any>> {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform administrator authorization required to trigger lifecycle cron.' }
    }
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
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

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
      if ((g.provider as string) === 'bank_wire') return true
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
    const allPlans = await SubscriptionService.getPlans()
    const activePlans = allPlans.filter((p: SubscriptionPlanRecord) => p.is_active !== false)
    const trialPlan = activePlans.find((p: SubscriptionPlanRecord) => p.code === 'trial') || activePlans[0]
    const trialDays = trialPlan?.trial_days || 30
    const paidPlans = activePlans
      .filter((p: SubscriptionPlanRecord) => p.code !== 'trial')
      .sort((a: SubscriptionPlanRecord, b: SubscriptionPlanRecord) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.price_monthly - b.price_monthly)

    const lowestPrice = paidPlans.length > 0 ? Math.min(...paidPlans.map((p: SubscriptionPlanRecord) => p.price_monthly)) : 1999

    const gwRes = await getActivePaymentGatewaysAction()
    const activePaymentGateways = gwRes.data || PAYMENT_GATEWAY_METADATA_LIST.filter((m) =>
      ['bkash', 'sslcommerz', 'nagad', 'bank_wire'].includes(m.id)
    )

    return {
      success: true,
      data: {
        plans: activePlans,
        trialPlan: trialPlan || DEFAULT_TRIAL_PLAN,
        trialDays,
        paidPlans,
        lowestPrice,
        activePaymentGateways,
      },
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to load subscription plans',
    }
  }
}


