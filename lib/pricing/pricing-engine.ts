import type {
  PricingCustomerType,
  PricingRuleType,
  MarginBasis,
  RoundingRule,
  PricingTierRange,
  PricingRuleRecord,
  PricingRuleStatus,
} from '../../types/pricing.types'
import type { ProductRecord, PricingFormulaConfig } from '../../types/product.types'
import { calculateJobPricing } from '../pricing-engine.ts'

/**
 * Accurately applies price rounding according to the configured rounding rule
 */
export function applyPriceRounding(amount: number, rule: RoundingRule = 'none'): number {
  if (isNaN(amount) || amount < 0) return 0
  switch (rule) {
    case 'round_1':
      return Math.round(amount)
    case 'round_5':
      return Math.round(amount / 5) * 5
    case 'round_10':
      return Math.round(amount / 10) * 10
    case 'ceil_5':
      return Math.ceil(amount / 5) * 5
    case 'floor_5':
      return Math.floor(amount / 5) * 5
    case 'round_2_decimals':
      return Math.round(amount * 100) / 100
    case 'none':
    default:
      return Math.round(amount * 100) / 100
  }
}

/**
 * Distinguishes accurately between Margin and Markup:
 * - Margin: Cost / (1 - margin/100) (e.g. Cost ৳100 with 50% margin -> ৳200 selling price)
 * - Markup: Cost * (1 + markup/100) (e.g. Cost ৳100 with 50% markup -> ৳150 selling price)
 */
export function calculateMarginOrMarkupPrice(
  cost: number,
  percentage: number,
  basis: MarginBasis = 'margin'
): number {
  const safeCost = Math.max(0, Number(cost) || 0)
  const safePercent = Number(percentage) || 0

  if (safeCost === 0) return 0

  if (basis === 'margin') {
    if (safePercent >= 100) {
      throw new Error('Target margin percentage cannot be 100% or greater.')
    }
    if (safePercent < 0) {
      return Math.round(safeCost * (1 + safePercent / 100) * 100) / 100
    }
    const factor = 1 - safePercent / 100
    return Math.round((safeCost / factor) * 100) / 100
  } else {
    // Markup
    const factor = 1 + safePercent / 100
    return Math.round(safeCost * factor * 100) / 100
  }
}

/**
 * Resolves tiered unit rate for a given order/billing quantity
 */
export function resolveTierRate(
  quantity: number,
  tierRanges: PricingTierRange[] | null | undefined,
  fallbackRate: number
): { unitPrice: number; matchedTier?: PricingTierRange } {
  if (!tierRanges || tierRanges.length === 0) {
    return { unitPrice: fallbackRate }
  }

  const safeQty = Math.max(0.0001, Number(quantity) || 1)

  // Find exact bracket
  const matched = tierRanges.find((tier) => {
    const min = Number(tier.min_qty) || 0
    const max = tier.max_qty !== null && tier.max_qty !== undefined ? Number(tier.max_qty) : Infinity
    return safeQty >= min && safeQty <= max
  })

  if (matched && Number(matched.unit_price) >= 0) {
    return { unitPrice: Number(matched.unit_price), matchedTier: matched }
  }

  // Fallback: If quantity exceeds all maximums, pick the tier with highest min_qty
  const sorted = [...tierRanges].sort((a, b) => (Number(b.min_qty) || 0) - (Number(a.min_qty) || 0))
  const highestTier = sorted.find((tier) => safeQty >= (Number(tier.min_qty) || 0))

  if (highestTier && Number(highestTier.unit_price) >= 0) {
    return { unitPrice: Number(highestTier.unit_price), matchedTier: highestTier }
  }

  return { unitPrice: fallbackRate }
}

/**
 * Calculates rule selling price based on rule configuration and base product data
 */
export function calculatePricingRulePrice(params: {
  ruleType: PricingRuleType
  basePrice: number
  baseCost?: number
  adjustmentType?: 'percentage' | 'fixed' | 'none'
  adjustmentValue?: number
  fixedPrice?: number | null
  targetMargin?: number | null
  marginBasis?: MarginBasis
  roundingRule?: RoundingRule
  quantity?: number
  tierRanges?: PricingTierRange[] | null
  formulaConfig?: PricingFormulaConfig | null
  dimensions?: { width?: number; height?: number; dimensionUnit?: 'ft' | 'inch' | 'm' }
}): { calculatedPrice: number; rawPrice: number } {
  const {
    ruleType,
    basePrice,
    baseCost = 0,
    adjustmentType = 'none',
    adjustmentValue = 0,
    fixedPrice,
    targetMargin,
    marginBasis = 'margin',
    roundingRule = 'none',
    quantity = 1,
    tierRanges,
    formulaConfig,
    dimensions,
  } = params

  const safeBasePrice = Math.max(0, Number(basePrice) || 0)
  let rawPrice = safeBasePrice

  switch (ruleType) {
    case 'fixed_price':
      rawPrice = fixedPrice !== null && fixedPrice !== undefined ? Math.max(0, Number(fixedPrice)) : safeBasePrice
      break

    case 'unit_rate':
      if (adjustmentType === 'percentage' && adjustmentValue !== undefined) {
        rawPrice = safeBasePrice * (1 + Number(adjustmentValue) / 100)
      } else if (adjustmentType === 'fixed' && adjustmentValue !== undefined) {
        rawPrice = safeBasePrice + Number(adjustmentValue)
      } else if (fixedPrice !== null && fixedPrice !== undefined) {
        rawPrice = Math.max(0, Number(fixedPrice))
      }
      break

    case 'percentage_adjustment':
      const pct = Number(adjustmentValue) || 0
      rawPrice = safeBasePrice * (1 + pct / 100)
      break

    case 'fixed_adjustment':
      const fixedDiff = Number(adjustmentValue) || 0
      rawPrice = safeBasePrice + fixedDiff
      break

    case 'tiered':
      const tierResult = resolveTierRate(quantity, tierRanges, safeBasePrice)
      rawPrice = tierResult.unitPrice
      break

    case 'formula':
      if (targetMargin !== null && targetMargin !== undefined && baseCost > 0) {
        rawPrice = calculateMarginOrMarkupPrice(baseCost, targetMargin, marginBasis)
      } else if (formulaConfig) {
        const jobResult = calculateJobPricing(
          formulaConfig,
          {
            width: dimensions?.width || 0,
            height: dimensions?.height || 0,
            dimensionUnit: dimensions?.dimensionUnit || 'ft',
            quantity: Math.max(1, quantity),
          },
          0
        )
        rawPrice = jobResult.unitPriceBDT || jobResult.suggestedSellingPrice || safeBasePrice
      }
      break

    default:
      rawPrice = safeBasePrice
      break
  }

  // Prevent negative prices
  rawPrice = Math.max(0, rawPrice)
  const calculatedPrice = applyPriceRounding(rawPrice, roundingRule)

  return { calculatedPrice, rawPrice }
}

/**
 * Determines whether a pricing rule is currently active and within effective dates
 */
export function isRuleCurrentlyEffective(rule: PricingRuleRecord, checkDate: Date = new Date()): boolean {
  if (rule.status === 'inactive' || rule.status === 'draft' || rule.status === 'expired' || rule.status === 'pending_approval') {
    return false
  }

  const nowTime = checkDate.getTime()

  if (rule.effective_from) {
    const fromTime = new Date(rule.effective_from).getTime()
    if (nowTime < fromTime) return false
  }

  if (rule.effective_until) {
    const untilTime = new Date(rule.effective_until).getTime()
    if (nowTime > untilTime) return false
  }

  return rule.status === 'active' || rule.status === 'scheduled'
}

/**
 * Resolves effective pricing rule status based on effective dates
 */
export function resolveRuleEffectiveStatus(rule: {
  status: PricingRuleStatus
  effective_from?: string | null
  effective_until?: string | null
}, checkDate: Date = new Date()): PricingRuleStatus {
  if (rule.status === 'inactive' || rule.status === 'draft' || rule.status === 'pending_approval') {
    return rule.status
  }

  const nowTime = checkDate.getTime()

  if (rule.effective_until) {
    const untilTime = new Date(rule.effective_until).getTime()
    if (nowTime > untilTime) {
      return 'expired'
    }
  }

  if (rule.effective_from) {
    const fromTime = new Date(rule.effective_from).getTime()
    if (nowTime < fromTime) {
      return 'scheduled'
    }
  }

  return 'active'
}
