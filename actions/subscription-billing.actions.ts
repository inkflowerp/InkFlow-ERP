'use server'

// ==============================================================================
// InkFlow ERP SaaS - SaaS Billing & Subscription Server Actions
// Server-side actions for SaaS Invoices, Payment Settlement, Credits, and MRR/ARR.
// Strictly isolated from Tenant Customer Invoicing.
// ==============================================================================

import { revalidatePath } from 'next/cache'
import { SaasBillingService } from '@/services/saas-billing.service'
import { SaasRevenueService } from '@/services/saas-revenue.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { getCurrentPlatformUser } from '@/lib/auth/platform-auth'
import type {
  SaasSubscriptionInvoiceRecord,
  SaasRevenueOverview,
} from '@/types/subscription.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Fetches all official SaaS Subscription Invoices for the authenticated tenant
 */
export async function getTenantSaasInvoicesAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<SaasSubscriptionInvoiceRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }
    const companyId = tenant.companyId

    const invoices = await SaasBillingService.getCompanyInvoices(companyId)
    return { success: true, data: invoices }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch SaaS invoices' }
  }
}

/**
 * Server Action: Fetches a single SaaS invoice by ID
 */
export async function getSaasInvoiceByIdAction(
  invoiceId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<SaasSubscriptionInvoiceRecord | null>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const platformUser = await getCurrentPlatformUser()

    if (!tenant?.companyId && (!platformUser || !platformUser.is_active)) {
      return { success: false, error: 'Unauthorized: Valid tenant session or platform admin privileges required.' }
    }

    const invoice = await SaasBillingService.getInvoiceById(invoiceId)
    if (!invoice) return { success: true, data: null }

    if (tenant?.companyId && invoice.company_id !== tenant.companyId && (!platformUser || !platformUser.is_active)) {
      return { success: false, error: 'Unauthorized: Access to invoice denied.' }
    }

    return { success: true, data: invoice }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch SaaS invoice' }
  }
}

/**
 * Server Action: Fetches platform-wide SaaS revenue telemetry (MRR, ARR, ARPU, Churn, Conversion)
 */
export async function getPlatformRevenueAnalyticsAction(): Promise<
  ServerActionResult<SaasRevenueOverview>
> {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || !platformUser.is_active) {
      return { success: false, error: 'Unauthorized: Platform administrator privileges required.' }
    }

    const overview = await SaasRevenueService.getRevenueOverview()
    return { success: true, data: overview }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to compute revenue analytics' }
  }
}

/**
 * Server Action: Issues a platform credit adjustment to a tenant company
 */
export async function issuePlatformCreditAdjustmentAction(params: {
  companyId: string
  amount: number
  reason: string
}): Promise<ServerActionResult<{ creditInvoiceId?: string }>> {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || !platformUser.is_active) {
      return { success: false, error: 'Unauthorized: Platform administrator privileges required.' }
    }

    const res = await SaasBillingService.issueCreditAdjustment({
      companyId: params.companyId,
      amount: params.amount,
      reason: params.reason,
      actorId: platformUser.id,
    })

    if (!res.success) {
      return { success: false, error: res.error }
    }

    revalidatePath('/', 'layout')
    return { success: true, data: { creditInvoiceId: res.creditInvoiceId } }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to issue credit adjustment' }
  }
}

/**
 * Server Action: Voids an unpaid SaaS subscription invoice
 */
export async function voidSaasInvoiceAction(params: {
  invoiceId: string
  reason: string
}): Promise<ServerActionResult<void>> {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || !platformUser.is_active) {
      return { success: false, error: 'Unauthorized: Platform administrator privileges required.' }
    }

    const res = await SaasBillingService.voidInvoice(
      params.invoiceId,
      params.reason,
      platformUser.id
    )

    if (!res.success) {
      return { success: false, error: res.error }
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to void SaaS invoice' }
  }
}
