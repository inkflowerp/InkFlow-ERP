import { PricingRepository } from '../lib/repositories/pricing.repository.ts'
import { AuditService } from './audit.service.ts'
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
} from '../types/pricing.types'

export class PricingService {
  static async getPricingRules(
    companyId: string,
    filter?: {
      customerType?: PricingCustomerType | 'all'
      productId?: string
      category?: string
      status?: string
      search?: string
    }
  ): Promise<PricingRuleRecord[]> {
    return PricingRepository.getPricingRules(companyId, filter)
  }

  static async getPricingRuleById(id: string, companyId: string): Promise<PricingRuleRecord | null> {
    return PricingRepository.getPricingRuleById(id, companyId)
  }

  static async createPricingRule(
    companyId: string,
    payload: PricingRuleInput,
    userId?: string
  ): Promise<PricingRuleRecord> {
    const created = await PricingRepository.createPricingRule(companyId, payload, userId)

    try {
      await AuditService.logEvent(
        companyId,
        userId || null,
        null,
        'pricing.rule_created',
        'pricing_rule' as any,
        created.id,
        null,
        {
          product_id: created.product_id,
          customer_type: created.customer_type,
          calculated_price: created.calculated_price,
          pricing_rule_type: created.pricing_rule_type,
        },
        `Created pricing rule for ${created.customer_type}`
      )
    } catch {}

    return created
  }

  static async updatePricingRule(
    id: string,
    companyId: string,
    payload: Partial<PricingRuleInput>,
    userId?: string
  ): Promise<PricingRuleRecord> {
    const existing = await PricingRepository.getPricingRuleById(id, companyId)
    const updated = await PricingRepository.updatePricingRule(id, companyId, payload, userId)

    try {
      await AuditService.logEvent(
        companyId,
        userId || null,
        null,
        'pricing.rule_updated',
        'pricing_rule' as any,
        id,
        existing ? { calculated_price: existing.calculated_price } : null,
        {
          previous_price: existing?.calculated_price,
          new_price: updated.calculated_price,
          customer_type: updated.customer_type,
        },
        `Updated pricing rule for ${updated.customer_type}`
      )
    } catch {}

    return updated
  }

  static async deactivatePricingRule(id: string, companyId: string, userId?: string): Promise<boolean> {
    const result = await PricingRepository.deactivatePricingRule(id, companyId, userId)

    try {
      await AuditService.logEvent(
        companyId,
        userId || null,
        null,
        'pricing.rule_deactivated',
        'pricing_rule' as any,
        id,
        null,
        { status: 'inactive' },
        'Deactivated pricing rule'
      )
    } catch {}

    return result
  }

  static async duplicatePricingRule(
    id: string,
    companyId: string,
    targetCustomerType: PricingCustomerType,
    userId?: string
  ): Promise<PricingRuleRecord> {
    return PricingRepository.duplicatePricingRule(id, companyId, targetCustomerType, userId)
  }

  static async bulkCreateOrUpdateRules(
    companyId: string,
    payload: BulkPricingPayload,
    userId?: string
  ): Promise<{ createdCount: number; updatedCount: number }> {
    const result = await PricingRepository.bulkCreateOrUpdateRules(companyId, payload, userId)

    try {
      await AuditService.logEvent(
        companyId,
        userId || null,
        null,
        'pricing.bulk_updated',
        'pricing_rule' as any,
        companyId,
        null,
        {
          customer_type: payload.customer_type,
          product_count: payload.product_ids.length,
          created_count: result.createdCount,
          updated_count: result.updatedCount,
        },
        `Bulk updated pricing rules for ${payload.customer_type}`
      )
    } catch {}

    return result
  }

  static async copyPricingBetweenCustomerTypes(
    companyId: string,
    payload: CopyPricingPayload,
    userId?: string
  ): Promise<{ copiedCount: number; overwrittenCount: number }> {
    const result = await PricingRepository.copyPricingBetweenCustomerTypes(companyId, payload, userId)

    try {
      await AuditService.logEvent(
        companyId,
        userId || null,
        null,
        'pricing.copied_between_types',
        'pricing_rule' as any,
        companyId,
        null,
        {
          source: payload.source_customer_type,
          target: payload.target_customer_type,
          modifier: payload.adjustment_percent,
          copied_count: result.copiedCount,
          overwritten_count: result.overwrittenCount,
        },
        `Copied pricing from ${payload.source_customer_type} to ${payload.target_customer_type}`
      )
    } catch {}

    return result
  }

  static async resolvePrice(companyId: string, params: ResolvePriceParams): Promise<ResolvedPriceResult> {
    return PricingRepository.resolvePrice(companyId, params)
  }

  static async getPricingSummary(companyId: string): Promise<PricingSummaryStats> {
    return PricingRepository.getPricingSummary(companyId)
  }

  static async getPricingMatrix(
    companyId: string,
    filter?: { category?: string; search?: string }
  ): Promise<PricingMatrixRow[]> {
    return PricingRepository.getPricingMatrix(companyId, filter)
  }
}
