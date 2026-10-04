'use server'

import { revalidatePath } from 'next/cache'
import { PricingService } from '@/services/pricing.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { withTenantAction } from '@/lib/actions/action-wrapper'
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
export const getPricingRulesAction = withTenantAction(
  { permission: 'pricing.view' },
  async (
    ctx,
    filter?: {
      customerType?: PricingCustomerType | 'all'
      productId?: string
      category?: string
      status?: string
      search?: string
    },
    requestedCompanyId?: string
  ): Promise<ServerActionResult<PricingRuleRecord[]>> => {
    try {
      const rules = await PricingService.getPricingRules(ctx.companyId, filter)
      return { success: true, data: rules }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch pricing rules.' }
    }
  }
)

/**
 * Server Action: Get summary stats for Pricing page header
 */
export const getPricingSummaryAction = withTenantAction(
  { permission: 'pricing.view' },
  async (
    ctx,
    requestedCompanyId?: string
  ): Promise<ServerActionResult<PricingSummaryStats>> => {
    try {
      const summary = await PricingService.getPricingSummary(ctx.companyId)
      return { success: true, data: summary }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch pricing summary.' }
    }
  }
)

/**
 * Server Action: Get customer-type comparison pricing matrix
 */
export const getPricingMatrixAction = withTenantAction(
  { permission: 'pricing.view' },
  async (
    ctx,
    filter?: { category?: string; search?: string },
    requestedCompanyId?: string
  ): Promise<ServerActionResult<PricingMatrixRow[]>> => {
    try {
      const matrix = await PricingService.getPricingMatrix(ctx.companyId, filter)
      return { success: true, data: matrix }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to generate pricing matrix.' }
    }
  }
)

/**
 * Server Action: Save (create or update) a pricing rule
 */
export const savePricingRuleAction = withTenantAction(
  { permission: 'pricing.edit', auditAction: 'pricing.save', entityType: 'pricing' },
  async (
    ctx,
    payload: PricingRuleInput & { id?: string },
    requestedCompanyId?: string
  ): Promise<ServerActionResult<PricingRuleRecord>> => {
    try {
      let result: PricingRuleRecord
      if (payload.id) {
        result = await PricingService.updatePricingRule(payload.id, ctx.companyId, payload, ctx.user.id)
      } else {
        result = await PricingService.createPricingRule(ctx.companyId, payload, ctx.user.id)
      }

      revalidatePath(`/${ctx.companySlug}/pricing`)
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to save pricing rule.' }
    }
  }
)

/**
 * Server Action: Deactivate a pricing rule
 */
export const deactivatePricingRuleAction = withTenantAction(
  {
    permission: 'pricing.delete',
    destructive: true,
    auditAction: 'pricing.deactivate',
    entityType: 'pricing',
  },
  async (
    ctx,
    id: string,
    requestedCompanyId?: string,
    confirmName?: string
  ): Promise<ServerActionResult<boolean>> => {
    try {
      const result = await PricingService.deactivatePricingRule(id, ctx.companyId, ctx.user.id)
      revalidatePath(`/${ctx.companySlug}/pricing`)
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to deactivate pricing rule.' }
    }
  }
)

/**
 * Server Action: Duplicate pricing rule for another customer type
 */
export const duplicatePricingRuleAction = withTenantAction(
  { permission: 'pricing.create', auditAction: 'pricing.duplicate', entityType: 'pricing' },
  async (
    ctx,
    id: string,
    targetCustomerType: PricingCustomerType,
    requestedCompanyId?: string
  ): Promise<ServerActionResult<PricingRuleRecord>> => {
    try {
      const result = await PricingService.duplicatePricingRule(id, ctx.companyId, targetCustomerType, ctx.user.id)
      revalidatePath(`/${ctx.companySlug}/pricing`)
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to duplicate pricing rule.' }
    }
  }
)

/**
 * Server Action: Apply bulk pricing across products
 */
export const bulkPricingAction = withTenantAction(
  { permission: 'pricing.edit', auditAction: 'pricing.bulk', entityType: 'pricing' },
  async (
    ctx,
    payload: BulkPricingPayload,
    requestedCompanyId?: string
  ): Promise<ServerActionResult<{ createdCount: number; updatedCount: number }>> => {
    try {
      const result = await PricingService.bulkCreateOrUpdateRules(ctx.companyId, payload, ctx.user.id)
      revalidatePath(`/${ctx.companySlug}/pricing`)
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to apply bulk pricing.' }
    }
  }
)

/**
 * Server Action: Copy pricing rules from one customer type to another
 */
export const copyPricingAction = withTenantAction(
  { permission: 'pricing.edit', auditAction: 'pricing.copy', entityType: 'pricing' },
  async (
    ctx,
    payload: CopyPricingPayload,
    requestedCompanyId?: string
  ): Promise<ServerActionResult<{ copiedCount: number; overwrittenCount: number }>> => {
    try {
      const result = await PricingService.copyPricingBetweenCustomerTypes(ctx.companyId, payload, ctx.user.id)
      revalidatePath(`/${ctx.companySlug}/pricing`)
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to copy pricing between customer types.' }
    }
  }
)

/**
 * Server Action: Resolve product rate dynamically for customer / customer type
 */
export const resolveProductPriceAction = withTenantAction(
  { permission: 'pricing.view' },
  async (
    ctx,
    params: ResolvePriceParams,
    requestedCompanyId?: string
  ): Promise<ServerActionResult<ResolvedPriceResult>> => {
    try {
      const result = await PricingService.resolvePrice(ctx.companyId, params)
      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to resolve price.' }
    }
  }
)
