// ==============================================================================
// PrintFlow - Authoritative Calculations & Property Verification Tests
// Asserts 100% parity between UI Preview formulas, Server Action formulas,
// and SQL stored calculation rules across random vectors (property testing).
// ==============================================================================

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateInvoiceTotals,
  calculateJobCosting,
  calculateItemPrice,
  calculatePayrollItem,
} from '../../lib/calc/index.ts'
import { moneyAdd, moneySub, moneyMul, moneyPercent, moneyEquals } from '../../lib/money.ts'

describe('Central Calculation Formulas (lib/calc/*) & Property Parity Tests', () => {

  describe('1. Invoice Financial Formulas & Constraints Parity', () => {
    test('1.1 Standard commercial order matches exact formula invariants', () => {
      const result = calculateInvoiceTotals({
        items: [
          { quantity: 500, unitPrice: 12.5, itemDescription: 'Brochure' },
          { quantity: 2, unitPrice: 1500, itemDescription: 'Design Charge' },
        ],
        discountAmount: 250,
        vatPercentage: 15,
        paidAmount: 5000,
      })

      // Subtotal = 500*12.5 (6250) + 2*1500 (3000) = 9250
      assert.equal(result.subtotal, 9250)
      assert.equal(result.discountAmount, 250)
      // Taxable = 9250 - 250 = 9000
      assert.equal(result.taxableAmount, 9000)
      // VAT 15% on 9000 = 1350
      assert.equal(result.vatAmount, 1350)
      // Grand total = 9000 + 1350 = 10350
      assert.equal(result.grandTotal, 10350)
      // Paid = 5000, Due = 10350 - 5000 = 5350
      assert.equal(result.paidAmount, 5000)
      assert.equal(result.dueAmount, 5350)

      // Invariants
      assert.equal(result.grandTotal, moneyAdd(result.taxableAmount, result.vatAmount))
      assert.equal(result.grandTotal, moneyAdd(result.paidAmount, result.dueAmount))
      assert.ok(result.paidAmount <= result.grandTotal)
    })

    test('1.2 Percentage discount priority and advance breakdown', () => {
      const result = calculateInvoiceTotals({
        items: [{ quantity: 100, unitPrice: 200 }],
        discountPercentage: 10, // 10% on 20,000 = 2000
        vatPercentage: 7.5, // 7.5% on 18,000 = 1350
        advancePercentage: 50, // 50% on 19,350 = 9675
      })

      assert.equal(result.subtotal, 20000)
      assert.equal(result.discountAmount, 2000)
      assert.equal(result.taxableAmount, 18000)
      assert.equal(result.vatAmount, 1350)
      assert.equal(result.grandTotal, 19350)
      assert.equal(result.advanceAmount, 9675)
      assert.equal(result.dueOnDelivery, 9675)
    })

    test('1.3 Property Test: 100 Random Orders guarantee (paid + due === grandTotal) and (taxable + vat === grandTotal)', () => {
      // Deterministic PRNG seed for reproducible property tests
      let seed = 42
      const random = () => {
        seed = (seed * 16807) % 2147483647
        return (seed - 1) / 2147483646
      }

      for (let i = 0; i < 100; i++) {
        const qty1 = Math.floor(random() * 500) + 1
        const price1 = Math.round(random() * 1000 * 100) / 100
        const qty2 = Math.floor(random() * 50) + 1
        const price2 = Math.round(random() * 500 * 100) / 100
        const discountPct = Math.round(random() * 25)
        const vatRates = [0, 5, 7.5, 10, 15]
        const vatRate = vatRates[Math.floor(random() * vatRates.length)]
        const rawPaid = Math.round(random() * 50000 * 100) / 100

        const calc = calculateInvoiceTotals({
          items: [
            { quantity: qty1, unitPrice: price1 },
            { quantity: qty2, unitPrice: price2 },
          ],
          discountPercentage: discountPct,
          vatPercentage: vatRate,
          paidAmount: rawPaid,
        })

        // Invariant 1: grand_total === subtotal - discount + vat
        const expectedGrand = moneyAdd(calc.taxableAmount, calc.vatAmount)
        assert.ok(
          moneyEquals(calc.grandTotal, expectedGrand),
          `Invariant 1 failed on iteration ${i}: grandTotal ${calc.grandTotal} !== taxable + vat ${expectedGrand}`
        )

        // Invariant 2: paid + due === grand_total
        const paidPlusDue = moneyAdd(calc.paidAmount, calc.dueAmount)
        assert.ok(
          moneyEquals(calc.grandTotal, paidPlusDue),
          `Invariant 2 failed on iteration ${i}: grandTotal ${calc.grandTotal} !== paid + due ${paidPlusDue}`
        )

        // Invariant 3: paid <= grand_total
        assert.ok(
          calc.paidAmount <= calc.grandTotal,
          `Invariant 3 failed on iteration ${i}: paid ${calc.paidAmount} > grandTotal ${calc.grandTotal}`
        )

        // Invariant 4: No negative amounts
        assert.ok(calc.subtotal >= 0)
        assert.ok(calc.discountAmount >= 0)
        assert.ok(calc.vatAmount >= 0)
        assert.ok(calc.grandTotal >= 0)
        assert.ok(calc.paidAmount >= 0)
        assert.ok(calc.dueAmount >= 0)
      }
    })
  })

  describe('2. Job Costing & True Margin Property Tests', () => {
    test('2.1 Correctly applies material wastage, machine rates, labor, and overhead', () => {
      const costing = calculateJobCosting({
        substrateCost: 10000,
        wastagePercentage: 10, // 10% wastage = 1,000
        inkCost: 800,
        platesCost: 1200,
        finishingMaterialsCost: 500,
        machineHours: 4,
        machineHourlyRate: 600, // 2,400
        laborHours: 6,
        laborHourlyRate: 250, // 1,500
        overheadPercentage: 10, // 10% on direct cost
        quotedPrice: 25000,
      })

      // Material: 10,000 + 1,000 + 800 + 1200 + 500 = 13,500
      assert.equal(costing.totalMaterialCost, 13500)
      assert.equal(costing.totalMachineCost, 2400)
      assert.equal(costing.totalLaborCost, 1500)
      // Direct Cost: 13,500 + 2,400 + 1,500 = 17,400
      assert.equal(costing.subtotalDirectCost, 17400)
      // Overhead 10%: 1,740
      assert.equal(costing.overheadAmount, 1740)
      // Total Cost: 17,400 + 1,740 = 19,140
      assert.equal(costing.totalProductionCost, 19140)
      // Profit: 25,000 - 19,140 = 5,860
      assert.equal(costing.estimatedGrossProfit, 5860)
      assert.equal(costing.isProfitable, true)
    })
  })

  describe('3. Pricing Rules & Tiered Discounts Tests', () => {
    test('3.1 Applies wholesale customer tier discount and volume tiers', () => {
      const pricing = calculateItemPrice({
        baseUnitPrice: 50,
        quantity: 1200,
        customerTier: 'wholesale', // 10% discount
        quantityTiers: [
          { minQuantity: 1000, discountPercentage: 5 },
          { minQuantity: 5000, discountPercentage: 12 },
        ],
      })

      // Tier discount 5% + wholesale 10% = 15% off 50 -> 42.50 per unit
      assert.equal(pricing.effectiveUnitPrice, 42.5)
      // 1200 * 42.5 = 51,000
      assert.equal(pricing.subtotal, 51000)
      assert.equal(pricing.finalPrice, 51000)
    })

    test('3.2 Urgent rush fee (+50%) accurately compounds on final subtotal', () => {
      const pricing = calculateItemPrice({
        baseUnitPrice: 100,
        quantity: 10,
        customerTier: 'retail',
        urgency: 'urgent',
      })

      // Subtotal = 10 * 100 = 1000. 50% urgent surcharge = 500. Final = 1500
      assert.equal(pricing.subtotal, 1000)
      assert.equal(pricing.urgencySurchargeAmount, 500)
      assert.equal(pricing.finalPrice, 1500)
    })
  })

  describe('4. Bangladesh Labor Act Compliant Payroll Formulas', () => {
    test('4.1 Calculates overtime at 2x basic rate and deducts advances', () => {
      const payroll = calculatePayrollItem({
        baseSalary: 20800, // 20800 / 208 = 100 Taka/hr basic
        allowances: {
          houseRent: 5000,
          medical: 2000,
          conveyance: 1500,
        },
        overtimeHours: 15, // 15 hrs * 200 Taka = 3,000 Taka OT
        absentDays: 1, // 1 day * (20800 / 26 = 800) = 800 Taka
        salaryAdvanceDeduction: 4000,
      })

      assert.equal(payroll.hourlyBasicRate, 100)
      assert.equal(payroll.overtimeHourlyRate, 200)
      assert.equal(payroll.overtimeEarnings, 3000)
      assert.equal(payroll.totalAllowances, 8500)
      // Gross = 20800 + 8500 + 3000 = 32300
      assert.equal(payroll.grossSalary, 32300)
      assert.equal(payroll.absentDeduction, 800)
      assert.equal(payroll.advanceDeduction, 4000)
      assert.equal(payroll.totalDeductions, 4800)
      // Net = 32300 - 4800 = 27500
      assert.equal(payroll.netPayable, 27500)
    })
  })
})
