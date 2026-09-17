import { createClient } from '../supabase/server.ts'
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
  PricingRuleType,
} from '../../types/pricing.types.ts'
import { CUSTOMER_TYPES_META } from '../../types/pricing.types.ts'
import type { ProductRecord } from '../../types/product.types.ts'
import { ProductRepository } from './product.repository.ts'
import { CustomerRepository } from './customer.repository.ts'
import {
  calculatePricingRulePrice,
  isRuleCurrentlyEffective,
  resolveRuleEffectiveStatus,
} from '../pricing/pricing-engine.ts'
import { measureAsync } from '../performance/logger.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export function isSupabaseConfigured(): boolean {
  return !!(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY)
  )
}

export function isTestMode(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    process.env.NODE_TEST_CONTEXT !== undefined ||
    process.argv.some((arg) => arg.includes('test') || arg.includes('--test'))
  )
}

export class PricingRepository {
  /**
   * Retrieves all pricing rules for a company with optional filters
   */
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
    return measureAsync(`PricingRepository.getPricingRules(${companyId})`, async () => {
      let rules: PricingRuleRecord[] = []

      if (!isSupabaseConfigured()) {
        if (isTestMode()) {
          const allRules = PrintERPDataStore.get<PricingRuleRecord[]>(STORAGE_KEYS.PRICING_RULES) || []
          rules = allRules.filter((r) => r.company_id === companyId)
        }
      } else {
        try {
          const supabase = await createClient()
          let query = (supabase as any)
            .from('pricing_rules')
            .select(`
              *,
              products:product_id (
                id,
                name,
                sku,
                category,
                selling_price,
                base_cost,
                unit
              )
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })

          if (filter?.customerType && filter.customerType !== 'all') {
            query = query.eq('customer_type', filter.customerType)
          }
          if (filter?.productId) {
            query = query.eq('product_id', filter.productId)
          }
          if (filter?.category) {
            query = query.eq('category', filter.category)
          }
          if (filter?.status && filter.status !== 'all') {
            query = query.eq('status', filter.status)
          }

          const { data, error } = await query
          if (error) {
            throw new Error(`Failed to fetch pricing rules: ${error.message}`)
          }

          rules = (data || []).map((row: any) => ({
            ...row,
            product_name: row.products?.name || row.product_name,
            product_sku: row.products?.sku || row.product_sku,
          }))
        } catch (err) {
          if (isTestMode()) {
            const allRules = PrintERPDataStore.get<PricingRuleRecord[]>(STORAGE_KEYS.PRICING_RULES) || []
            rules = allRules.filter((r) => r.company_id === companyId)
          } else {
            throw err
          }
        }
      }

      // Memory-filter for search & computed status
      const now = new Date()
      const resolvedRules = rules.map((r) => ({
        ...r,
        status: resolveRuleEffectiveStatus(r, now),
      }))

      return resolvedRules.filter((r) => {
        if (filter?.customerType && filter.customerType !== 'all' && r.customer_type !== filter.customerType) {
          return false
        }
        if (filter?.productId && r.product_id !== filter.productId) {
          return false
        }
        if (filter?.category && r.category !== filter.category) {
          return false
        }
        if (filter?.status && filter.status !== 'all' && r.status !== filter.status) {
          return false
        }
        if (filter?.search) {
          const q = filter.search.toLowerCase()
          const nameMatch = r.product_name?.toLowerCase().includes(q)
          const skuMatch = r.product_sku?.toLowerCase().includes(q)
          const catMatch = r.category?.toLowerCase().includes(q)
          const typeMatch = r.customer_type.toLowerCase().includes(q)
          if (!nameMatch && !skuMatch && !catMatch && !typeMatch) return false
        }
        return true
      })
    })
  }

  /**
   * Retrieves a single pricing rule by ID
   */
  static async getPricingRuleById(id: string, companyId: string): Promise<PricingRuleRecord | null> {
    return measureAsync(`PricingRepository.getPricingRuleById(${id})`, async () => {
      if (!isSupabaseConfigured()) {
        if (isTestMode()) {
          const allRules = PrintERPDataStore.get<PricingRuleRecord[]>(STORAGE_KEYS.PRICING_RULES) || []
          return allRules.find((r) => r.id === id && r.company_id === companyId) || null
        }
        return null
      }

      try {
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('pricing_rules')
          .select(`
            *,
            products:product_id (
              id,
              name,
              sku,
              category,
              selling_price,
              base_cost,
              unit
            )
          `)
          .eq('id', id)
          .eq('company_id', companyId)
          .maybeSingle()

        if (error || !data) return null

        return {
          ...data,
          product_name: data.products?.name || data.product_name,
          product_sku: data.products?.sku || data.product_sku,
        }
      } catch (err) {
        if (isTestMode()) {
          const allRules = PrintERPDataStore.get<PricingRuleRecord[]>(STORAGE_KEYS.PRICING_RULES) || []
          return allRules.find((r) => r.id === id && r.company_id === companyId) || null
        }
        throw err
      }
    })
  }

  /**
   * Creates a new pricing rule
   */
  static async createPricingRule(
    companyId: string,
    payload: PricingRuleInput,
    userId?: string
  ): Promise<PricingRuleRecord> {
    return measureAsync(`PricingRepository.createPricingRule(${companyId})`, async () => {
      let basePrice = Number(payload.base_price) || 0
      let baseCost = 0
      let productName = ''
      let productSku = ''
      let category = payload.category || 'general'

      if (payload.product_id) {
        const product = await ProductRepository.getProductById(payload.product_id, companyId)
        if (product) {
          basePrice = basePrice || Number(product.selling_price) || 0
          baseCost = Number(product.base_cost) || 0
          productName = product.name
          productSku = product.sku
          category = product.category || category
        }
      }

      // Calculate the rule price
      const { calculatedPrice } = calculatePricingRulePrice({
        ruleType: payload.pricing_rule_type,
        basePrice,
        baseCost,
        adjustmentType: payload.adjustment_type,
        adjustmentValue: payload.adjustment_value,
        fixedPrice: payload.fixed_price,
        targetMargin: payload.target_margin,
        marginBasis: payload.margin_basis,
        roundingRule: payload.rounding_rule,
        tierRanges: payload.tier_ranges,
        formulaConfig: payload.formula_config,
      })

      const newRecord: PricingRuleRecord = {
        id: `pr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        company_id: companyId,
        product_id: payload.product_id || null,
        product_name: productName || null,
        product_sku: productSku || null,
        category,
        customer_type: payload.customer_type,
        customer_id: payload.customer_id || null,
        pricing_rule_type: payload.pricing_rule_type,
        pricing_method: payload.pricing_method || 'per_area',
        base_price: basePrice,
        adjustment_type: payload.adjustment_type || 'none',
        adjustment_value: payload.adjustment_value !== undefined ? Number(payload.adjustment_value) : 0,
        fixed_price: payload.fixed_price !== undefined && payload.fixed_price !== null ? Number(payload.fixed_price) : null,
        calculated_price: payload.calculated_price !== undefined ? Number(payload.calculated_price) : calculatedPrice,
        currency: payload.currency || 'BDT',
        target_margin: payload.target_margin !== undefined && payload.target_margin !== null ? Number(payload.target_margin) : null,
        margin_basis: payload.margin_basis || 'margin',
        rounding_rule: payload.rounding_rule || 'none',
        minimum_billable_quantity: payload.minimum_billable_quantity !== undefined && payload.minimum_billable_quantity !== null ? Number(payload.minimum_billable_quantity) : 0,
        minimum_charge: payload.minimum_charge !== undefined && payload.minimum_charge !== null ? Number(payload.minimum_charge) : 0,
        tier_ranges: payload.tier_ranges || null,
        formula_config: payload.formula_config || null,
        effective_from: payload.effective_from || null,
        effective_until: payload.effective_until || null,
        status: payload.status || 'active',
        notes: payload.notes || null,
        requires_approval: false,
        created_by: userId || null,
        updated_by: userId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (isSupabaseConfigured()) {
        try {
          const supabase = await createClient()
          const { data, error } = await (supabase as any)
            .from('pricing_rules')
            .insert(newRecord)
            .select()
            .single()

          if (!error && data) {
            newRecord.id = data.id
          }
        } catch (err) {
          if (!isTestMode()) throw err
        }
      }

      if (isTestMode() || !isSupabaseConfigured()) {
        PrintERPDataStore.addItem(STORAGE_KEYS.PRICING_RULES, newRecord)
      }

      return newRecord
    })
  }

  /**
   * Updates an existing pricing rule
   */
  static async updatePricingRule(
    id: string,
    companyId: string,
    payload: Partial<PricingRuleInput>,
    userId?: string
  ): Promise<PricingRuleRecord> {
    return measureAsync(`PricingRepository.updatePricingRule(${id})`, async () => {
      const existing = await this.getPricingRuleById(id, companyId)
      if (!existing) {
        throw new Error(`Pricing rule ${id} not found.`)
      }

      const basePrice = payload.base_price !== undefined ? Number(payload.base_price) : existing.base_price
      let baseCost = 0

      if (existing.product_id) {
        const product = await ProductRepository.getProductById(existing.product_id, companyId)
        if (product) baseCost = Number(product.base_cost) || 0
      }

      const { calculatedPrice } = calculatePricingRulePrice({
        ruleType: payload.pricing_rule_type || existing.pricing_rule_type,
        basePrice,
        baseCost,
        adjustmentType: payload.adjustment_type || existing.adjustment_type,
        adjustmentValue: payload.adjustment_value !== undefined ? payload.adjustment_value : existing.adjustment_value,
        fixedPrice: payload.fixed_price !== undefined ? payload.fixed_price : existing.fixed_price,
        targetMargin: payload.target_margin !== undefined ? payload.target_margin : existing.target_margin,
        marginBasis: payload.margin_basis || existing.margin_basis,
        roundingRule: payload.rounding_rule || existing.rounding_rule,
        tierRanges: payload.tier_ranges || existing.tier_ranges,
        formulaConfig: payload.formula_config || existing.formula_config,
      })

      const updatedRecord: PricingRuleRecord = {
        ...existing,
        ...payload,
        calculated_price: payload.calculated_price !== undefined ? Number(payload.calculated_price) : calculatedPrice,
        updated_by: userId || null,
        updated_at: new Date().toISOString(),
      }

      if (isSupabaseConfigured()) {
        try {
          const supabase = await createClient()
          const { error } = await (supabase as any)
            .from('pricing_rules')
            .update({
              ...updatedRecord,
              products: undefined,
            })
            .eq('id', id)
            .eq('company_id', companyId)

          if (error) {
            throw new Error(`Failed to update pricing rule: ${error.message}`)
          }
        } catch (err) {
          if (!isTestMode()) throw err
        }
      }

      if (isTestMode() || !isSupabaseConfigured()) {
        const allRules = PrintERPDataStore.get<PricingRuleRecord[]>(STORAGE_KEYS.PRICING_RULES) || []
        const updatedList = allRules.map((r) => (r.id === id ? updatedRecord : r))
        PrintERPDataStore.set(STORAGE_KEYS.PRICING_RULES, updatedList)
      }

      return updatedRecord
    })
  }

  /**
   * Deactivates / Archives a pricing rule
   */
  static async deactivatePricingRule(id: string, companyId: string, userId?: string): Promise<boolean> {
    return measureAsync(`PricingRepository.deactivatePricingRule(${id})`, async () => {
      await this.updatePricingRule(id, companyId, { status: 'inactive' }, userId)
      return true
    })
  }

  /**
   * Duplicates an existing rule for another customer type
   */
  static async duplicatePricingRule(
    id: string,
    companyId: string,
    targetCustomerType: PricingCustomerType,
    userId?: string
  ): Promise<PricingRuleRecord> {
    const existing = await this.getPricingRuleById(id, companyId)
    if (!existing) {
      throw new Error(`Pricing rule ${id} not found.`)
    }

    return this.createPricingRule(
      companyId,
      {
        product_id: existing.product_id,
        category: existing.category,
        customer_type: targetCustomerType,
        pricing_rule_type: existing.pricing_rule_type,
        pricing_method: existing.pricing_method,
        base_price: existing.base_price,
        adjustment_type: existing.adjustment_type,
        adjustment_value: existing.adjustment_value,
        fixed_price: existing.fixed_price,
        calculated_price: existing.calculated_price,
        currency: existing.currency,
        target_margin: existing.target_margin,
        margin_basis: existing.margin_basis,
        rounding_rule: existing.rounding_rule,
        minimum_billable_quantity: existing.minimum_billable_quantity,
        minimum_charge: existing.minimum_charge,
        tier_ranges: existing.tier_ranges,
        formula_config: existing.formula_config,
        notes: `Duplicated from ${existing.customer_type} pricing`,
        status: 'active',
      },
      userId
    )
  }

  /**
   * Applies Bulk Pricing across multiple products for a customer type
   */
  static async bulkCreateOrUpdateRules(
    companyId: string,
    payload: BulkPricingPayload,
    userId?: string
  ): Promise<{ createdCount: number; updatedCount: number }> {
    return measureAsync(`PricingRepository.bulkCreateOrUpdateRules(${companyId})`, async () => {
      let createdCount = 0
      let updatedCount = 0

      const existingRules = await this.getPricingRules(companyId, {
        customerType: payload.customer_type,
      })

      for (const productId of payload.product_ids) {
        const product = await ProductRepository.getProductById(productId, companyId)
        if (!product) continue

        const existingRule = existingRules.find((r) => r.product_id === productId)
        const basePrice = Number(product.selling_price) || 0

        const ruleType: PricingRuleType = payload.adjustment_type === 'percentage'
          ? 'percentage_adjustment'
          : payload.adjustment_type === 'fixed'
          ? 'fixed_adjustment'
          : 'fixed_price'

        const ruleInput: PricingRuleInput = {
          product_id: productId,
          category: product.category,
          customer_type: payload.customer_type,
          pricing_rule_type: ruleType,
          pricing_method: (product.pricing_method || 'per_area') as any,
          base_price: basePrice,
          adjustment_type: payload.adjustment_type === 'fixed_price' ? 'none' : payload.adjustment_type,
          adjustment_value: payload.adjustment_type === 'fixed_price' ? 0 : payload.adjustment_value,
          fixed_price: payload.adjustment_type === 'fixed_price' ? payload.adjustment_value : null,
          rounding_rule: payload.rounding_rule || 'none',
          effective_from: payload.effective_from || null,
          effective_until: payload.effective_until || null,
          notes: payload.notes || `Bulk pricing rule for ${payload.customer_type}`,
          status: 'active',
        }

        if (existingRule && payload.override_existing) {
          await this.updatePricingRule(existingRule.id, companyId, ruleInput, userId)
          updatedCount++
        } else if (!existingRule) {
          await this.createPricingRule(companyId, ruleInput, userId)
          createdCount++
        }
      }

      return { createdCount, updatedCount }
    })
  }

  /**
   * Copies pricing rules from Source Customer Type to Target Customer Type with optional % modifier
   */
  static async copyPricingBetweenCustomerTypes(
    companyId: string,
    payload: CopyPricingPayload,
    userId?: string
  ): Promise<{ copiedCount: number; overwrittenCount: number }> {
    return measureAsync(`PricingRepository.copyPricingBetweenCustomerTypes(${companyId})`, async () => {
      let copiedCount = 0
      let overwrittenCount = 0

      const sourceRules = await this.getPricingRules(companyId, {
        customerType: payload.source_customer_type,
      })
      const targetRules = await this.getPricingRules(companyId, {
        customerType: payload.target_customer_type,
      })

      const filteredSourceRules = payload.product_ids && payload.product_ids.length > 0
        ? sourceRules.filter((r) => r.product_id && payload.product_ids!.includes(r.product_id))
        : sourceRules

      for (const src of filteredSourceRules) {
        if (!src.product_id) continue

        const existingTarget = targetRules.find((r) => r.product_id === src.product_id)
        const modifierPercent = Number(payload.adjustment_percent) || 0

        let adjustedPrice = src.calculated_price
        let adjValue = src.adjustment_value || 0
        let adjType = src.adjustment_type || 'none'

        if (modifierPercent !== 0) {
          adjustedPrice = Math.round(src.calculated_price * (1 + modifierPercent / 100) * 100) / 100
          if (src.pricing_rule_type === 'percentage_adjustment') {
            adjValue = (src.adjustment_value || 0) + modifierPercent
          }
        }

        const ruleInput: PricingRuleInput = {
          product_id: src.product_id,
          category: src.category,
          customer_type: payload.target_customer_type,
          pricing_rule_type: src.pricing_rule_type,
          pricing_method: src.pricing_method,
          base_price: src.base_price,
          adjustment_type: adjType,
          adjustment_value: adjValue,
          fixed_price: src.fixed_price ? Math.round(src.fixed_price * (1 + modifierPercent / 100) * 100) / 100 : null,
          calculated_price: adjustedPrice,
          rounding_rule: src.rounding_rule,
          minimum_billable_quantity: src.minimum_billable_quantity,
          minimum_charge: src.minimum_charge,
          tier_ranges: src.tier_ranges,
          formula_config: src.formula_config,
          notes: payload.notes || `Copied from ${src.customer_type} pricing with ${modifierPercent}% modifier`,
          status: 'active',
        }

        if (existingTarget && payload.override_existing) {
          await this.updatePricingRule(existingTarget.id, companyId, ruleInput, userId)
          overwrittenCount++
        } else if (!existingTarget) {
          await this.createPricingRule(companyId, ruleInput, userId)
          copiedCount++
        }
      }

      return { copiedCount, overwrittenCount }
    })
  }

  /**
   * Centralized, authoritative 4-tier price resolution service
   *
   * Priority:
   * 1. Approved Customer-Specific Price (`customer_rates` or dedicated contract)
   * 2. Customer Type Active Pricing Rule (Product-specific rule wins over category-level)
   * 3. Product/Service Master Default Selling Price (`products.selling_price`)
   * 4. Fallback base price / cost
   */
  static async resolvePrice(companyId: string, params: ResolvePriceParams): Promise<ResolvedPriceResult> {
    return measureAsync(`PricingRepository.resolvePrice(${params.productId})`, async () => {
      const { productId, customerId, quantity = 1, width = 0, height = 0, dimensionUnit = 'ft' } = params
      const customerType = (params.customerType?.toLowerCase() || 'retail') as PricingCustomerType

      const product = await ProductRepository.getProductById(productId, companyId)
      if (!product) {
        throw new Error(`Product ${productId} not found in catalog.`)
      }

      const defaultRate = Number(product.selling_price) || 0
      const baseCost = Number(product.base_cost) || 0
      const minBillableQty = product.min_billable_quantity !== undefined && product.min_billable_quantity !== null
        ? Math.max(0, Number(product.min_billable_quantity))
        : 0
      const minimumCharge = Number(product.minimum_charge) || 0
      const now = new Date()

      // Default result structure (Tier 3: Product Master Default Price)
      let result: ResolvedPriceResult = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        customerType,
        customerId,
        basePrice: defaultRate,
        effectiveUnitPrice: defaultRate,
        pricingRuleType: 'unit_rate',
        pricingMethod: (product.pricing_method || 'per_area') as any,
        source: 'product_default',
        sourceLabel: 'Product Default Rate',
        sourceDetails: `Standard catalog rate ৳${defaultRate}/${product.unit}`,
        minimumBillableQuantity: minBillableQty,
        minimumCharge,
        timestamp: now.toISOString(),
      }

      // -------------------------------------------------------------
      // TIER 1: Check Customer-Specific Rate (customer_rates)
      // -------------------------------------------------------------
      if (customerId) {
        let customRateFound = false

        if (isTestMode()) {
          const customRates = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMER_RATES) || []
          const match = customRates.find(
            (r) => (!r.company_id || r.company_id === companyId) && r.customer_id === customerId && r.product_id === productId
          )
          if (match && match.rate !== undefined && Number(match.rate) >= 0) {
            const rate = Number(match.rate)
            result = {
              ...result,
              effectiveUnitPrice: rate,
              source: 'customer_specific',
              sourceLabel: 'Customer Dedicated Rate',
              sourceDetails: match.notes ? `Contract Rate: ${match.notes}` : `Dedicated customer rate ৳${rate}/${product.unit}`,
            }
            customRateFound = true
          }
        }

        if (!customRateFound && isSupabaseConfigured()) {
          try {
            const supabase = await createClient()
            const { data: custRate } = await (supabase as any)
              .from('customer_rates')
              .select('rate, notes')
              .eq('company_id', companyId)
              .eq('customer_id', customerId)
              .eq('product_id', productId)
              .maybeSingle()

            if (custRate && custRate.rate !== null && custRate.rate !== undefined) {
              const rate = Number(custRate.rate)
              result = {
                ...result,
                effectiveUnitPrice: rate,
                source: 'customer_specific',
                sourceLabel: 'Customer Dedicated Rate',
                sourceDetails: custRate.notes ? `Contract Rate: ${custRate.notes}` : `Dedicated customer rate ৳${rate}/${product.unit}`,
              }
              customRateFound = true
            }
          } catch {}
        }

        if (customRateFound) return result
      }

      // -------------------------------------------------------------
      // TIER 2: Check Customer Type Pricing Rule (pricing_rules)
      // -------------------------------------------------------------
      const allRules = await this.getPricingRules(companyId, { customerType })
      const activeRules = allRules.filter((r) => isRuleCurrentlyEffective(r, now))

      // Product-specific rule wins over category-level rule
      const productRule = activeRules.find((r) => r.product_id === productId)
      const categoryRule = !productRule && product.category
        ? activeRules.find((r) => !r.product_id && r.category === product.category)
        : null

      const matchedRule = productRule || categoryRule

      if (matchedRule) {
        const { calculatedPrice, rawPrice } = calculatePricingRulePrice({
          ruleType: matchedRule.pricing_rule_type,
          basePrice: defaultRate,
          baseCost,
          adjustmentType: matchedRule.adjustment_type,
          adjustmentValue: matchedRule.adjustment_value,
          fixedPrice: matchedRule.fixed_price,
          targetMargin: matchedRule.target_margin,
          marginBasis: matchedRule.margin_basis,
          roundingRule: matchedRule.rounding_rule,
          quantity,
          tierRanges: matchedRule.tier_ranges,
          formulaConfig: matchedRule.formula_config,
          dimensions: { width, height, dimensionUnit },
        })

        const typeMeta = CUSTOMER_TYPES_META[customerType] || { label: customerType }
        const ruleMinBillable = matchedRule.minimum_billable_quantity !== null && matchedRule.minimum_billable_quantity !== undefined
          ? Number(matchedRule.minimum_billable_quantity)
          : minBillableQty
        const ruleMinCharge = matchedRule.minimum_charge !== null && matchedRule.minimum_charge !== undefined
          ? Number(matchedRule.minimum_charge)
          : minimumCharge

        let adjustmentInfo = undefined
        if (matchedRule.adjustment_type && matchedRule.adjustment_type !== 'none' && matchedRule.adjustment_value) {
          adjustmentInfo = {
            type: matchedRule.adjustment_type,
            value: matchedRule.adjustment_value,
          }
        }

        result = {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unit: product.unit,
          customerType,
          customerId,
          basePrice: defaultRate,
          effectiveUnitPrice: calculatedPrice,
          pricingRuleId: matchedRule.id,
          pricingRuleType: matchedRule.pricing_rule_type,
          pricingMethod: matchedRule.pricing_method,
          source: 'customer_type',
          sourceLabel: `${typeMeta.label} Pricing`,
          sourceDetails: matchedRule.notes || `${typeMeta.label} commercial rate: ৳${calculatedPrice}/${product.unit}`,
          minimumBillableQuantity: ruleMinBillable,
          minimumCharge: ruleMinCharge,
          appliedAdjustment: adjustmentInfo,
          roundedFrom: rawPrice !== calculatedPrice ? rawPrice : undefined,
          effectiveFrom: matchedRule.effective_from,
          effectiveUntil: matchedRule.effective_until,
          timestamp: now.toISOString(),
        }

        return result
      }

      // -------------------------------------------------------------
      // TIER 3 / 4: Fallback to Product Default Rate
      // -------------------------------------------------------------
      return result
    })
  }

  /**
   * Retrieves summary statistics for the Pricing Page header cards
   */
  static async getPricingSummary(companyId: string): Promise<PricingSummaryStats> {
    return measureAsync(`PricingRepository.getPricingSummary(${companyId})`, async () => {
      const [rules, products] = await Promise.all([
        this.getPricingRules(companyId),
        ProductRepository.getProducts(companyId, true),
      ])

      const now = new Date()
      const activeRules = rules.filter((r) => isRuleCurrentlyEffective(r, now))
      const scheduledRules = rules.filter((r) => r.status === 'scheduled')
      const expiredRules = rules.filter((r) => r.status === 'expired')

      const customProductIds = new Set<string>()
      const customServiceIds = new Set<string>()
      const configuredCustomerTypes = new Set<PricingCustomerType>()

      for (const r of activeRules) {
        if (r.customer_type) configuredCustomerTypes.add(r.customer_type)
        if (r.product_id) {
          const prod = products.find((p) => p.id === r.product_id)
          if (prod) {
            const isService = prod.product_type === 'service' || prod.product_type === 'print_service' || prod.product_type === 'fabrication_service'
            if (isService) {
              customServiceIds.add(r.product_id)
            } else {
              customProductIds.add(r.product_id)
            }
          }
        }
      }

      const allProductIds = new Set(products.map((p) => p.id))
      const configuredIds = new Set([...customProductIds, ...customServiceIds])
      const defaultPriceCount = Math.max(0, allProductIds.size - configuredIds.size)

      return {
        totalRulesCount: rules.length,
        productsWithCustomPricingCount: customProductIds.size,
        servicesWithCustomPricingCount: customServiceIds.size,
        configuredCustomerTypesCount: configuredCustomerTypes.size,
        productsUsingDefaultCount: defaultPriceCount,
        activeRulesCount: activeRules.length,
        scheduledRulesCount: scheduledRules.length,
        expiredRulesCount: expiredRules.length,
      }
    })
  }

  /**
   * Generates the multi-customer-type side-by-side Pricing Matrix
   */
  static async getPricingMatrix(
    companyId: string,
    filter?: { category?: string; search?: string }
  ): Promise<PricingMatrixRow[]> {
    return measureAsync(`PricingRepository.getPricingMatrix(${companyId})`, async () => {
      const [products, rules] = await Promise.all([
        ProductRepository.getProducts(companyId, true),
        this.getPricingRules(companyId),
      ])

      const now = new Date()
      const activeRules = rules.filter((r) => isRuleCurrentlyEffective(r, now))
      const customerTypes: PricingCustomerType[] = ['retail', 'reseller', 'corporate', 'agency', 'government', 'regular']

      let filteredProducts = products
      if (filter?.category && filter.category !== 'all') {
        filteredProducts = filteredProducts.filter((p) => p.category === filter.category)
      }
      if (filter?.search) {
        const q = filter.search.toLowerCase()
        filteredProducts = filteredProducts.filter(
          (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        )
      }

      const rows: PricingMatrixRow[] = filteredProducts.map((p) => {
        const defaultRate = Number(p.selling_price) || 0
        const baseCost = Number(p.base_cost) || 0

        const pricesObj: any = {}
        for (const type of customerTypes) {
          const rule = activeRules.find((r) => r.product_id === p.id && r.customer_type === type)
          if (rule) {
            pricesObj[type] = {
              price: rule.calculated_price,
              ruleId: rule.id,
              ruleType: rule.pricing_rule_type,
              hasCustomRule: true,
              adjustmentText: rule.adjustment_value ? `${rule.adjustment_value > 0 ? '+' : ''}${rule.adjustment_value}%` : undefined,
              status: rule.status,
            }
          } else {
            pricesObj[type] = {
              price: defaultRate,
              ruleType: 'unit_rate',
              hasCustomRule: false,
              adjustmentText: 'Default',
              status: 'active',
            }
          }
        }

        return {
          productId: p.id,
          productName: p.name,
          productSku: p.sku,
          category: p.category || 'general',
          productType: p.product_type || 'product',
          unit: p.unit || 'sft',
          baseCost,
          defaultSellingPrice: defaultRate,
          prices: pricesObj,
        }
      })

      return rows
    })
  }
}
