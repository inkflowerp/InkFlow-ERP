import type { VatCalculationResult, VatPricingMode } from '@/types/tax-and-docs.types'

/**
 * Calculates VAT amounts for exclusive or inclusive pricing modes
 */
export function calculateVat(
  amount: number,
  rate: number,
  mode: VatPricingMode
): VatCalculationResult {
  if (mode === 'inclusive') {
    const totalAmount = amount
    const baseAmount = Math.round(totalAmount / (1 + rate / 100))
    const vatAmount = totalAmount - baseAmount
    return { baseAmount, vatRate: rate, vatAmount, totalAmount, pricingMode: 'inclusive' }
  } else {
    const baseAmount = amount
    const vatAmount = Math.round(baseAmount * (rate / 100))
    const totalAmount = baseAmount + vatAmount
    return { baseAmount, vatRate: rate, vatAmount, totalAmount, pricingMode: 'exclusive' }
  }
}
