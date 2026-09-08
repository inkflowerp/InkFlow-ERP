import { test, describe } from 'node:test'
import assert from 'node:assert'

export function calculateVatAndDiscounts(params: {
  subtotal: number
  discountType?: 'percentage' | 'fixed'
  discountValue?: number
  maxDiscountAllowed?: number
  vatRatePercent: number // 15, 7.5, 5, or 0
  deliveryFee?: number
  isVatInclusive?: boolean
}) {
  let discountAmount = 0
  if (params.discountType === 'percentage' && params.discountValue) {
    discountAmount = (params.subtotal * params.discountValue) / 100
  } else if (params.discountType === 'fixed' && params.discountValue) {
    discountAmount = Math.min(params.subtotal, params.discountValue)
  }

  if (params.maxDiscountAllowed && discountAmount > params.maxDiscountAllowed) {
    discountAmount = params.maxDiscountAllowed
  }

  const taxableAmount = Math.max(0, params.subtotal - discountAmount)
  let vatAmount = 0

  if (params.isVatInclusive) {
    // Reverse VAT extraction: taxableAmount * (vatRate / (100 + vatRate))
    vatAmount = Number(((taxableAmount * params.vatRatePercent) / (100 + params.vatRatePercent)).toFixed(2))
  } else {
    // Standard VAT addition: taxableAmount * (vatRate / 100)
    vatAmount = Number(((taxableAmount * params.vatRatePercent) / 100).toFixed(2))
  }

  const delivery = params.deliveryFee || 0
  const grandTotal = params.isVatInclusive
    ? Number((taxableAmount + delivery).toFixed(2))
    : Number((taxableAmount + vatAmount + delivery).toFixed(2))

  return {
    subtotal: params.subtotal,
    discountAmount,
    taxableAmount,
    vatRatePercent: params.vatRatePercent,
    vatAmount,
    deliveryFee: delivery,
    grandTotal,
  }
}

describe('VAT & Discounts Unit Tests', () => {
  test('Standard NBR 15% VAT on Commercial Print Order of ৳50,000', () => {
    const res = calculateVatAndDiscounts({
      subtotal: 50000,
      vatRatePercent: 15,
    })

    assert.strictEqual(res.discountAmount, 0)
    assert.strictEqual(res.taxableAmount, 50000)
    assert.strictEqual(res.vatAmount, 7500) // 15% of 50,000
    assert.strictEqual(res.grandTotal, 57500)
  })

  test('Truncated 7.5% Service VAT for Advertising Agency with 10% Discount', () => {
    // Subtotal 100,000 -> 10% Discount = 10,000 -> Taxable = 90,000
    // 7.5% VAT on 90,000 = 6,750 -> Grand Total = 96,750
    const res = calculateVatAndDiscounts({
      subtotal: 100000,
      discountType: 'percentage',
      discountValue: 10,
      vatRatePercent: 7.5,
    })

    assert.strictEqual(res.discountAmount, 10000)
    assert.strictEqual(res.taxableAmount, 90000)
    assert.strictEqual(res.vatAmount, 6750)
    assert.strictEqual(res.grandTotal, 96750)
  })

  test('Fixed lump-sum discount of ৳2,500 with 5% Retail POS VAT and ৳500 delivery fee', () => {
    // Subtotal 20,000 - 2,500 = 17,500.
    // 5% VAT on 17,500 = 875.
    // Grand Total = 17,500 + 875 + 500 = 18,875.
    const res = calculateVatAndDiscounts({
      subtotal: 20000,
      discountType: 'fixed',
      discountValue: 2500,
      vatRatePercent: 5,
      deliveryFee: 500,
    })

    assert.strictEqual(res.discountAmount, 2500)
    assert.strictEqual(res.taxableAmount, 17500)
    assert.strictEqual(res.vatAmount, 875)
    assert.strictEqual(res.grandTotal, 18875)
  })

  test('VAT Inclusive Extraction: Total price ৳11,500 with 15% VAT included', () => {
    // Taxable = 11,500 * (100 / 115) = 10,000.
    // VAT = 1,500.
    const res = calculateVatAndDiscounts({
      subtotal: 11500,
      vatRatePercent: 15,
      isVatInclusive: true,
    })

    assert.strictEqual(res.vatAmount, 1500)
    assert.strictEqual(res.grandTotal, 11500)
  })

  test('Discount Cap Enforcement: prevents unauthorized discounts exceeding policy cap', () => {
    // Requested 25% discount on 100,000 = 25,000, but cap is 15,000
    const res = calculateVatAndDiscounts({
      subtotal: 100000,
      discountType: 'percentage',
      discountValue: 25,
      maxDiscountAllowed: 15000,
      vatRatePercent: 15,
    })

    assert.strictEqual(res.discountAmount, 15000)
    assert.strictEqual(res.taxableAmount, 85000)
  })
})
