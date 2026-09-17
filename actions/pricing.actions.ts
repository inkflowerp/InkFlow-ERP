'use server'

import { revalidatePath } from 'next/cache'
import { PricingService } from '@/services/pricing.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import type {
  PricingCustomerType,
  PricingRuleRecord,
  PricingRuleInput,
  BulkPricingPayload,
  CopyPricingPayload,
  ResolvePriceParams,
  ResolvedPriceResult,
  PricingSummaryStats,
  PricingMatrixRow,
} from '@/types/pricing.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Get pricing rules for current tenant
 */
export async function getPricingRulesAction(
  filter?: {
    customerType?: PricingCustomerType | 'all'
    productId?: string
    category?: string
    status?: string
    search?: string
  },
  requestedCompanyId?: string
): Promise<ServerActionResult<PricingRuleRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    const rules = await PricingService.getPricingRules(tenant.companyId, filter)
    return { success: true, data: rules }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch pricing rules.' }
  }
}

/**
 * Server Action: Get summary stats for Pricing page header
 */
export async function getPricingSummaryAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<PricingSummaryStats>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    const summary = await PricingService.getPricingSummary(tenant.companyId)
    return { success: true, data: summary }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch pricing summary.' }
  }
}

/**
 * Server Action: Get customer-type comparison pricing matrix
 */
export async function getPricingMatrixAction(
  filter?: { category?: string; search?: string },
  requestedCompanyId?: string
): Promise<ServerActionResult<PricingMatrixRow[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    const matrix = await PricingService.getPricingMatrix(tenant.companyId, filter)
    return { success: true, data: matrix }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to generate pricing matrix.' }
  }
}

/**
 * Server Action: Save (create or update) a pricing rule
 */
export async function savePricingRuleAction(
  payload: PricingRuleInput & { id?: string },
  requestedCompanyId?: string
): Promise<ServerActionResult<PricingRuleRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    let result: PricingRuleRecord
    if (payload.id) {
      result = await PricingService.updatePricingRule(payload.id, tenant.companyId, payload, tenant.userId)
    } else {
      result = await PricingService.createPricingRule(tenant.companyId, payload, tenant.userId)
    }

    revalidatePath(`/${tenant.companySlug}/pricing`)
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save pricing rule.' }
  }
}

/**
 * Server Action: Deactivate a pricing rule
 */
export async function deactivatePricingRuleAction(
  id: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    const result = await PricingService.deactivatePricingRule(id, tenant.companyId, tenant.userId)
    revalidatePath(`/${tenant.companySlug}/pricing`)
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to deactivate pricing rule.' }
  }
}

/**
 * Server Action: Duplicate pricing rule for another customer type
 */
export async function duplicatePricingRuleAction(
  id: string,
  targetCustomerType: PricingCustomerType,
  requestedCompanyId?: string
): Promise<ServerActionResult<PricingRuleRecord>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    const result = await PricingService.duplicatePricingRule(id, tenant.companyId, targetCustomerType, tenant.userId)
    revalidatePath(`/${tenant.companySlug}/pricing`)
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to duplicate pricing rule.' }
  }
}

/**
 * Server Action: Apply bulk pricing across products
 */
export async function bulkPricingAction(
  payload: BulkPricingPayload,
  requestedCompanyId?: string
): Promise<ServerActionResult<{ createdCount: number; updatedCount: number }>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    const result = await PricingService.bulkCreateOrUpdateRules(tenant.companyId, payload, tenant.userId)
    revalidatePath(`/${tenant.companySlug}/pricing`)
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to apply bulk pricing.' }
  }
}

/**
 * Server Action: Copy pricing rules from one customer type to another
 */
export async function copyPricingAction(
  payload: CopyPricingPayload,
  requestedCompanyId?: string
): Promise<ServerActionResult<{ copiedCount: number; overwrittenCount: number }>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    const result = await PricingService.copyPricingBetweenCustomerTypes(tenant.companyId, payload, tenant.userId)
    revalidatePath(`/${tenant.companySlug}/pricing`)
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to copy pricing between customer types.' }
  }
}

/**
 * Server Action: Resolve product rate dynamically for customer / customer type
 */
export async function resolveProductPriceAction(
  params: ResolvePriceParams,
  requestedCompanyId?: string
): Promise<ServerActionResult<ResolvedPriceResult>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return { success: false, error: 'Unauthorized: Valid authenticated tenant session required.' }
    }

    const result = await PricingService.resolvePrice(tenant.companyId, params)
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to resolve price.' }
  }
}
