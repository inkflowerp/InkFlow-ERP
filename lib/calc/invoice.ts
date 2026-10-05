// ==============================================================================
// PrintFlow - Authoritative Invoice & Commercial Document Formulas (lib/calc/invoice.ts)
// Single Source of Truth for Subtotal, Discounts, Bangladesh VAT, Advances,
// Due on Delivery, and Paid/Due breakdowns across UI previews and Server Actions.
// ==============================================================================

import {
  moneyAdd,
  moneySub,
  moneyMul,
  moneyPercent,
  moneySum,
  moneyEquals,
  toPaisa,
  toTaka,
} from '../money.ts'

export interface LineItemCalculationInput {
  quantity: number | string
  unitPrice: number | string
  itemDescription?: string
  vatPercentage?: number
}

export interface ComputedLineItem {
  quantity: number
  unitPrice: number
  lineTotal: number
  vatPercentage: number
  itemDescription?: string
}

export interface InvoiceCalculationInput {
  items: LineItemCalculationInput[]
  discountAmount?: number | string | null
  discountPercentage?: number | string | null
  vatEnabled?: boolean
  vatPercentage?: number | string | null
  vatRate?: number | string | null
  paidAmount?: number | string | null
  advancePercentage?: number | string | null
}

export interface ComputedInvoiceTotals {
  subtotal: number
  discountAmount: number
  taxableAmount: number
  vatPercentage: number
  vatAmount: number
  grandTotal: number
  paidAmount: number
  dueAmount: number
  advanceAmount: number
  dueOnDelivery: number
  lineItems: ComputedLineItem[]
  isFullyPaid: boolean
}

/**
 * Calculates authoritative invoice financial breakdown.
 * Enforces zero-tolerance invariant:
 * grandTotal === subtotal - discountAmount + vatAmount
 * paidAmount + dueAmount === grandTotal
 */
export function calculateInvoiceTotals(input: InvoiceCalculationInput): ComputedInvoiceTotals {
  const rawItems = Array.isArray(input.items) ? input.items : []
  
  // 1. Recompute each line item
  const computedItems: ComputedLineItem[] = rawItems.map((item) => {
    const qty = Math.max(0, Number(item.quantity) || 0)
    const price = Math.max(0, Number(item.unitPrice) || 0)
    const lineTotal = moneyMul(price, qty)
    return {
      quantity: qty,
      unitPrice: price,
      lineTotal,
      vatPercentage: Number(item.vatPercentage) || 0,
      itemDescription: item.itemDescription,
    }
  })

  // 2. Subtotal = sum(lineTotal)
  const subtotal = moneySum(computedItems.map((i) => i.lineTotal))

  // 3. Discount calculation (Percentage takes precedence if provided, capped at subtotal)
  let discount = 0
  if (input.discountPercentage !== undefined && input.discountPercentage !== null && input.discountPercentage !== '') {
    const pct = Math.max(0, Math.min(100, Number(input.discountPercentage) || 0))
    discount = moneyPercent(subtotal, pct)
  } else if (input.discountAmount !== undefined && input.discountAmount !== null && input.discountAmount !== '') {
    discount = Math.max(0, Number(input.discountAmount) || 0)
  }
  // Discount cannot exceed subtotal
  discount = Math.min(subtotal, discount)

  // 4. Taxable Base
  const taxableAmount = moneySub(subtotal, discount)

  // 5. VAT calculation
  const isVatEnabled = input.vatEnabled !== false
  const vatRate = isVatEnabled ? Math.max(0, Number(input.vatPercentage ?? input.vatRate) || 0) : 0
  const vatAmount = isVatEnabled && vatRate > 0 ? moneyPercent(taxableAmount, vatRate) : 0

  // 6. Grand Total = taxableAmount + vatAmount (equivalently subtotal - discount + vat)
  const grandTotal = moneyAdd(taxableAmount, vatAmount)

  // 7. Paid Amount & Due Amount (Paid cannot exceed grandTotal)
  let rawPaid = Math.max(0, Number(input.paidAmount) || 0)
  if (rawPaid > grandTotal) {
    rawPaid = grandTotal
  }
  const paidAmount = rawPaid
  const dueAmount = moneySub(grandTotal, paidAmount)

  // 8. Advance & Due On Delivery breakdown
  let advanceAmount = paidAmount
  if (input.advancePercentage !== undefined && input.advancePercentage !== null && Number(input.advancePercentage) > 0) {
    const advPct = Math.min(100, Math.max(0, Number(input.advancePercentage)))
    advanceAmount = moneyPercent(grandTotal, advPct)
  }
  const dueOnDelivery = moneySub(grandTotal, advanceAmount)

  return {
    subtotal,
    discountAmount: discount,
    taxableAmount,
    vatPercentage: vatRate,
    vatAmount,
    grandTotal,
    paidAmount,
    dueAmount,
    advanceAmount,
    dueOnDelivery,
    lineItems: computedItems,
    isFullyPaid: moneyEquals(paidAmount, grandTotal) && grandTotal > 0,
  }
}

/**
 * Calculates a single line item total in exact Paisa arithmetic.
 */
export function calculateItemLineTotal(
  quantity: number | string,
  unitPrice: number | string
): number {
  return moneyMul(Math.max(0, Number(unitPrice) || 0), Math.max(0, Number(quantity) || 0))
}

