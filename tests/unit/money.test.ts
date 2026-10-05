// ==============================================================================
// PrintFlow - Money Calculation & Rounding Unit Tests
// Tests integer Paisa conversions, Banker's vs Commercial rounding,
// Bangladesh VAT rates (5%, 7.5%, 10%, 15%), discounts, advance %, and zero-drift allocations.
// ==============================================================================

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  toPaisa,
  toTaka,
  moneyAdd,
  moneySub,
  moneyMul,
  moneyDiv,
  moneyPercent,
  moneySum,
  moneyAllocate,
  roundHalfUp,
  roundHalfEven,
  moneyEquals,
  formatMoney,
} from '../../lib/money.ts'

describe('Authoritative Money Engine (lib/money.ts) Unit Tests', () => {

  describe('1. Exact Integer Paisa Conversions', () => {
    test('1.1 Solves classic floating point 0.1 + 0.2 = 0.3 problem', () => {
      const floatSum = 0.1 + 0.2
      assert.notEqual(floatSum, 0.3) // JavaScript IEEE-754 fails this!

      const safeSum = moneyAdd(0.1, 0.2)
      assert.equal(safeSum, 0.3)
      assert.equal(toPaisa(safeSum), 30) // 30 paisa
    })

    test('1.2 Converts decimal Taka strings and numbers into exact Paisa integers', () => {
      assert.equal(toPaisa(1250.75), 125075)
      assert.equal(toPaisa('1,250.75'), 125075)
      assert.equal(toPaisa(0.01), 1)
      assert.equal(toPaisa(0), 0)
      assert.equal(toPaisa(null), 0)
      assert.equal(toPaisa(undefined), 0)
    })

    test('1.3 Converts Paisa back to Taka without floating-point artifacts', () => {
      assert.equal(toTaka(125075), 1250.75)
      assert.equal(toTaka(1), 0.01)
      assert.equal(toTaka(0), 0)
    })
  })

  describe('2. Rounding Modes: Half-Up (Commercial) & Half-Even (Banker\'s)', () => {
    test('2.1 Commercial Half-Up rounds .005 up to .01', () => {
      assert.equal(roundHalfUp(2.555, 2), 2.56)
      assert.equal(roundHalfUp(2.554, 2), 2.55)
      assert.equal(roundHalfUp(10.005, 2), 10.01)
    })

    test('2.2 Banker\'s Rounding (Half-Even) rounds to nearest even integer on exact half', () => {
      // 2.5 rounds to 2 (even), 3.5 rounds to 4 (even)
      assert.equal(roundHalfEven(2.5, 0), 2)
      assert.equal(roundHalfEven(3.5, 0), 4)
      assert.equal(roundHalfEven(2.545, 2), 2.54) // 4 is even
      assert.equal(roundHalfEven(2.535, 2), 2.54) // 3 rounds to 4
    })
  })

  describe('3. Bangladesh VAT Rates Calculation (5%, 7.5%, 10%, 15%)', () => {
    test('3.1 Standard 15% VAT on commercial print invoice', () => {
      // 10,000 Taka order with 15% VAT = 1,500 Taka
      const subtotal = 10000
      const vat = moneyPercent(subtotal, 15)
      assert.equal(vat, 1500)
      const grandTotal = moneyAdd(subtotal, vat)
      assert.equal(grandTotal, 11500)
    })

    test('3.2 Retail/Commercial 7.5% VAT (Printing Services standard)', () => {
      // 450 Taka printing item with 7.5% VAT = 33.75 Taka
      const vat = moneyPercent(450, 7.5)
      assert.equal(vat, 33.75)
      const grandTotal = moneyAdd(450, vat)
      assert.equal(grandTotal, 483.75)
    })

    test('3.3 Concessional 5% VAT (Specialized print products/paper)', () => {
      // 2,500 Taka order with 5% VAT = 125 Taka
      const vat = moneyPercent(2500, 5)
      assert.equal(vat, 125)
      const grandTotal = moneyAdd(2500, vat)
      assert.equal(grandTotal, 2625)
    })

    test('3.4 Manufacturing 10% VAT', () => {
      // 8,750.50 Taka order with 10% VAT = 875.05 Taka
      const vat = moneyPercent(8750.5, 10)
      assert.equal(vat, 875.05)
      const grandTotal = moneyAdd(8750.5, vat)
      assert.equal(grandTotal, 9625.55)
    })
  })

  describe('4. Discounts & Taxable Base Logic', () => {
    test('4.1 Percentage discount deducted before VAT computation', () => {
      const subtotal = 5000
      const discountPct = 10 // 10%
      const discount = moneyPercent(subtotal, discountPct)
      assert.equal(discount, 500)

      const taxableAmount = moneySub(subtotal, discount)
      assert.equal(taxableAmount, 4500)

      const vat = moneyPercent(taxableAmount, 15) // 15% on 4500 = 675
      assert.equal(vat, 675)

      const grandTotal = moneyAdd(taxableAmount, vat)
      assert.equal(grandTotal, 5175)
    })

    test('4.2 Fixed cash discount capped at subtotal', () => {
      const subtotal = 1200
      const cashDiscount = 200
      const taxable = moneySub(subtotal, cashDiscount)
      assert.equal(taxable, 1000)

      const vat = moneyPercent(taxable, 7.5)
      assert.equal(vat, 75)

      const grandTotal = moneyAdd(taxable, vat)
      assert.equal(grandTotal, 1075)
    })
  })

  describe('5. Advance Payment & Due on Delivery Calculations', () => {
    test('5.1 Booking with 40% advance payment', () => {
      const grandTotal = 15000
      const advance = moneyPercent(grandTotal, 40)
      assert.equal(advance, 6000)

      const due = moneySub(grandTotal, advance)
      assert.equal(due, 9000)
      assert.equal(moneyAdd(advance, due), grandTotal)
    })

    test('5.2 Partial payments sequence maintains exact zero drift', () => {
      const grandTotal = 25450.75
      const payment1 = 10000.00
      const payment2 = 8250.50

      const remaining1 = moneySub(grandTotal, payment1)
      assert.equal(remaining1, 15450.75)

      const remaining2 = moneySub(remaining1, payment2)
      assert.equal(remaining2, 7200.25)

      const finalPayment = 7200.25
      const finalDue = moneySub(remaining2, finalPayment)
      assert.equal(finalDue, 0)
    })
  })

  describe('6. Zero-Drift Remainder Allocation (moneyAllocate)', () => {
    test('6.1 Allocates 100 Taka equally 3 ways with zero loss of Paisa', () => {
      // 100 / 3 = 33.33333333...
      const shares = moneyAllocate(100, [1, 1, 1])
      assert.deepEqual(shares, [33.34, 33.33, 33.33])

      const allocatedSum = moneySum(shares)
      assert.equal(allocatedSum, 100.00)
    })

    test('6.2 Complex multi-branch profit ratio distribution without drift', () => {
      const profitPool = 124578.90
      const ratios = [35, 25, 20, 20]
      const distributed = moneyAllocate(profitPool, ratios)

      assert.equal(distributed.length, 4)
      const sum = moneySum(distributed)
      assert.equal(sum, profitPool)
    })
  })

  describe('7. Formatting & Currency Display', () => {
    test('7.1 Formats English and Bengali Taka representations', () => {
      assert.equal(formatMoney(12500.5, { locale: 'en' }), '৳12,500.50')
      assert.ok(formatMoney(12500.5, { locale: 'bn' }).includes('১২,৫০০.৫০'))
    })
  })
})
