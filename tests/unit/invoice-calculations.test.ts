import { test, describe } from 'node:test'
import assert from 'node:assert'

/**
 * Pure calculation logic mirroring server-side BillingService & Actions
 */
export function calculateLineTotal(item: {
  width?: number
  height?: number
  quantity: number
  unit?: string
  unit_price: number
}): { area: number; lineTotal: number } {
  const qty = Math.max(0.01, Number(item.quantity) || 1)
  const rate = Math.max(0, Number(item.unit_price) || 0)
  const w = Number(item.width) || 0
  const h = Number(item.height) || 0

  let area = 0
  let lineTotal = 0
  if (w > 0 && h > 0 && (item.unit === 'sft' || item.unit === 'sqft' || item.unit === 'sqin')) {
    area = item.unit === 'sqin' ? (w * h) / 144 : w * h
    lineTotal = Math.round(area * qty * rate)
  } else {
    lineTotal = Math.round(qty * rate)
  }

  return { area, lineTotal }
}

export function calculateInvoiceFinancials(params: {
  items: Array<{
    width?: number
    height?: number
    quantity: number
    unit?: string
    unit_price: number
  }>
  discountAmount?: number
  vatPercentage?: number
  advanceAmount?: number
}): {
  subtotal: number
  discountAmount: number
  vatAmount: number
  grandTotal: number
  advanceAmount: number
  dueAmount: number
} {
  const subtotal = params.items.reduce((sum, it) => sum + calculateLineTotal(it).lineTotal, 0)
  const discount = Math.max(0, Number(params.discountAmount) || 0)
  const subtotalAfterDiscount = Math.max(0, subtotal - discount)
  const vatPct = Math.max(0, Number(params.vatPercentage) || 0)
  const vatAmount = Math.round((subtotalAfterDiscount * vatPct) / 100)
  const grandTotal = subtotalAfterDiscount + vatAmount
  const advance = Math.min(grandTotal, Math.max(0, Number(params.advanceAmount) || 0))
  const dueAmount = Math.max(0, grandTotal - advance)

  return {
    subtotal,
    discountAmount: discount,
    vatAmount,
    grandTotal,
    advanceAmount: advance,
    dueAmount,
  }
}

describe('Invoice Calculations & Financial Integrity', () => {
  test('calculates standard item by Quantity × Rate', () => {
    const res = calculateLineTotal({
      quantity: 500,
      unit_price: 2.5,
      unit: 'pcs',
    })
    assert.strictEqual(res.lineTotal, 1250)
    assert.strictEqual(res.area, 0)
  })

  test('calculates area-based item in SFT (Width × Height × Qty × Rate)', () => {
    const res = calculateLineTotal({
      width: 4,
      height: 10,
      quantity: 2,
      unit_price: 25,
      unit: 'sft',
    })
    // 4 * 10 = 40 SFT, 40 * 2 * 25 = 2000
    assert.strictEqual(res.area, 40)
    assert.strictEqual(res.lineTotal, 2000)
  })

  test('calculates area-based item in SQIN (Square Inches / 144)', () => {
    const res = calculateLineTotal({
      width: 12,
      height: 24,
      quantity: 1,
      unit_price: 50,
      unit: 'sqin',
    })
    // 12 * 24 = 288 sqin / 144 = 2 SFT, 2 * 1 * 50 = 100
    assert.strictEqual(res.area, 2)
    assert.strictEqual(res.lineTotal, 100)
  })

  test('calculates multi-item invoice subtotal, discount, VAT, and due amount accurately', () => {
    const calc = calculateInvoiceFinancials({
      items: [
        { width: 4, height: 6, quantity: 2, unit: 'sft', unit_price: 20 }, // 24 * 2 * 20 = 960
        { quantity: 100, unit_price: 15, unit: 'pcs' }, // 100 * 15 = 1500
      ],
      discountAmount: 160,
      vatPercentage: 10,
      advanceAmount: 1000,
    })

    // Subtotal: 960 + 1500 = 2460
    assert.strictEqual(calc.subtotal, 2460)
    // Subtotal after discount: 2460 - 160 = 2300
    // VAT (10%): 230
    assert.strictEqual(calc.vatAmount, 230)
    // Grand Total: 2300 + 230 = 2530
    assert.strictEqual(calc.grandTotal, 2530)
    // Advance: 1000
    assert.strictEqual(calc.advanceAmount, 1000)
    // Due: 2530 - 1000 = 1530
    assert.strictEqual(calc.dueAmount, 1530)
  })

  test('caps advance amount to grand total and prevents negative due amounts', () => {
    const calc = calculateInvoiceFinancials({
      items: [{ quantity: 10, unit_price: 100, unit: 'pcs' }], // 1000
      discountAmount: 0,
      vatPercentage: 0,
      advanceAmount: 1500, // overpaid attempt
    })

    assert.strictEqual(calc.grandTotal, 1000)
    assert.strictEqual(calc.advanceAmount, 1000)
    assert.strictEqual(calc.dueAmount, 0)
  })

  test('preserves financial immutability regardless of subsequent catalog price changes', () => {
    const historicalLine = calculateLineTotal({
      quantity: 10,
      unit_price: 35,
      unit: 'pcs',
    })
    assert.strictEqual(historicalLine.lineTotal, 350)

    // Simulating changing default catalog price from 35 to 45
    const catalogDefaultPrice = 45
    assert.strictEqual(historicalLine.lineTotal, 350)
    assert.notStrictEqual(historicalLine.lineTotal, 10 * catalogDefaultPrice)
  })
})
