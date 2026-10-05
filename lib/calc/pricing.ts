// ==============================================================================
// PrintFlow - Authoritative Pricing & Rate Rules (lib/calc/pricing.ts)
// Calculates Tiered Quantity Pricing, Customer Tier Rules, and Rush Surcharges.
// ==============================================================================

import { moneyAdd, moneySub, moneyMul, moneyPercent } from '../money.ts'

export type CustomerTier = 'retail' | 'wholesale' | 'corporate' | 'distributor'
export type UrgencyTier = 'standard' | 'rush' | 'urgent'

export interface QuantityDiscountTier {
  minQuantity: number
  discountPercentage: number // e.g. 1000+ pcs -> 5% off, 5000+ pcs -> 12% off
}

export interface PricingRuleInput {
  baseUnitPrice: number | string
  quantity: number
  customerTier?: CustomerTier
  urgency?: UrgencyTier
  quantityTiers?: QuantityDiscountTier[]
}

export interface ComputedItemPricing {
  baseUnitPrice: number
  quantity: number
  tierDiscountPercent: number
  customerDiscountPercent: number
  effectiveUnitPrice: number
  subtotal: number
  urgencySurchargePercent: number
  urgencySurchargeAmount: number
  finalPrice: number
}

export function calculateItemPrice(input: PricingRuleInput): ComputedItemPricing {
  const basePrice = Math.max(0, Number(input.baseUnitPrice) || 0)
  const qty = Math.max(1, input.quantity || 1)

  // 1. Resolve quantity tier discount
  let tierDiscountPercent = 0
  if (Array.isArray(input.quantityTiers) && input.quantityTiers.length > 0) {
    const sorted = [...input.quantityTiers].sort((a, b) => b.minQuantity - a.minQuantity)
    const matching = sorted.find((t) => qty >= t.minQuantity)
    if (matching) {
      tierDiscountPercent = Math.max(0, Math.min(100, matching.discountPercentage))
    }
  }

  // 2. Resolve customer tier discount
  let customerDiscountPercent = 0
  switch (input.customerTier) {
    case 'distributor':
      customerDiscountPercent = 20
      break
    case 'corporate':
      customerDiscountPercent = 15
      break
    case 'wholesale':
      customerDiscountPercent = 10
      break
    case 'retail':
    default:
      customerDiscountPercent = 0
      break
  }

  // Best/Combined discount rate (capped at 50% max discount to prevent commercial loss)
  const totalDiscountPct = Math.min(50, tierDiscountPercent + customerDiscountPercent)
  const discountPerUnit = moneyPercent(basePrice, totalDiscountPct)
  const effectiveUnitPrice = moneySub(basePrice, discountPerUnit)

  // Subtotal = effectiveUnitPrice * quantity
  const subtotal = moneyMul(effectiveUnitPrice, qty)

  // 3. Resolve urgency surcharge
  let urgencySurchargePercent = 0
  if (input.urgency === 'urgent') {
    urgencySurchargePercent = 50 // Same-day emergency print
  } else if (input.urgency === 'rush') {
    urgencySurchargePercent = 25 // 24h express print
  }

  const urgencySurchargeAmount = moneyPercent(subtotal, urgencySurchargePercent)
  const finalPrice = moneyAdd(subtotal, urgencySurchargeAmount)

  return {
    baseUnitPrice: basePrice,
    quantity: qty,
    tierDiscountPercent,
    customerDiscountPercent,
    effectiveUnitPrice,
    subtotal,
    urgencySurchargePercent,
    urgencySurchargeAmount,
    finalPrice,
  }
}
