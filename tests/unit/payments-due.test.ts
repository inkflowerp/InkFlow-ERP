import { test, describe } from 'node:test'
import assert from 'node:assert'

export interface PaymentEntry {
  method: 'cash' | 'bkash' | 'nagad' | 'bank_transfer' | 'cheque'
  amount: number
  reference?: string
  date: string
}

export function processInvoicePayments(
  invoiceTotal: number,
  payments: PaymentEntry[]
) {
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0)
  const dueBalance = Math.max(0, Number((invoiceTotal - totalPaid).toFixed(2)))
  const excessCredit = Math.max(0, Number((totalPaid - invoiceTotal).toFixed(2)))

  let status: 'unpaid' | 'partially_paid' | 'paid' | 'overpaid' = 'unpaid'
  if (totalPaid === 0) {
    status = 'unpaid'
  } else if (totalPaid < invoiceTotal) {
    status = 'partially_paid'
  } else if (totalPaid === invoiceTotal) {
    status = 'paid'
  } else {
    status = 'overpaid'
  }

  return {
    invoiceTotal,
    totalPaid,
    dueBalance,
    excessCredit,
    status,
    paymentsCount: payments.length,
  }
}

export function calculateReceivablesAging(invoices: Array<{ dueBalance: number; daysPastDue: number }>) {
  let current = 0 // 0-30 days
  let overdue30 = 0 // 31-60 days
  let overdue60 = 0 // 61-90 days
  let overdue90Plus = 0 // 90+ days

  for (const inv of invoices) {
    if (inv.daysPastDue <= 30) {
      current += inv.dueBalance
    } else if (inv.daysPastDue <= 60) {
      overdue30 += inv.dueBalance
    } else if (inv.daysPastDue <= 90) {
      overdue60 += inv.dueBalance
    } else {
      overdue90Plus += inv.dueBalance
    }
  }

  return {
    current,
    overdue30,
    overdue60,
    overdue90Plus,
    totalReceivables: current + overdue30 + overdue60 + overdue90Plus,
  }
}

describe('Payments & Due Balance Unit Tests', () => {
  test('Unpaid status: newly issued invoice with zero payments', () => {
    const res = processInvoicePayments(28500, [])
    assert.strictEqual(res.totalPaid, 0)
    assert.strictEqual(res.dueBalance, 28500)
    assert.strictEqual(res.excessCredit, 0)
    assert.strictEqual(res.status, 'unpaid')
  })

  test('Partial payment: 50% advance deposit paid via bKash', () => {
    const res = processInvoicePayments(50000, [
      { method: 'bkash', amount: 25000, reference: 'TRX-BK-991', date: '2026-09-01' },
    ])
    assert.strictEqual(res.totalPaid, 25000)
    assert.strictEqual(res.dueBalance, 25000)
    assert.strictEqual(res.status, 'partially_paid')
  })

  test('Multi-tender split payment: Cash ৳10,000 + bKash ৳15,000 + Bank Transfer ৳25,000', () => {
    const res = processInvoicePayments(50000, [
      { method: 'cash', amount: 10000, date: '2026-09-01' },
      { method: 'bkash', amount: 15000, reference: 'TRX-BK-110', date: '2026-09-02' },
      { method: 'bank_transfer', amount: 25000, reference: 'EFT-DBBL-55', date: '2026-09-03' },
    ])
    assert.strictEqual(res.totalPaid, 50000)
    assert.strictEqual(res.dueBalance, 0)
    assert.strictEqual(res.status, 'paid')
  })

  test('Overpayment handling: client transfers ৳60,000 for ৳55,000 invoice', () => {
    const res = processInvoicePayments(55000, [
      { method: 'bank_transfer', amount: 60000, date: '2026-09-01' },
    ])
    assert.strictEqual(res.totalPaid, 60000)
    assert.strictEqual(res.dueBalance, 0)
    assert.strictEqual(res.excessCredit, 5000) // 5,000 BDT credit credited to customer wallet
    assert.strictEqual(res.status, 'overpaid')
  })

  test('Receivables Aging: Categorizes overdue buckets accurately', () => {
    const invoices = [
      { dueBalance: 15000, daysPastDue: 10 }, // current
      { dueBalance: 25000, daysPastDue: 45 }, // 30-60
      { dueBalance: 10000, daysPastDue: 75 }, // 60-90
      { dueBalance: 50000, daysPastDue: 120 }, // 90+
    ]

    const aging = calculateReceivablesAging(invoices)
    assert.strictEqual(aging.current, 15000)
    assert.strictEqual(aging.overdue30, 25000)
    assert.strictEqual(aging.overdue60, 10000)
    assert.strictEqual(aging.overdue90Plus, 50000)
    assert.strictEqual(aging.totalReceivables, 100000)
  })
})
