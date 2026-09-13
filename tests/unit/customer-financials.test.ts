import { test, describe } from 'node:test'
import assert from 'node:assert'

export function calculateCustomerFinancials(params: {
  invoices: Array<{
    id: string
    grandTotal: number
    paidAmount: number
    dueAmount: number
    writeOffAmount?: number
    status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'written_off' | 'cancelled'
    invoiceDate: string
  }>
  payments: Array<{
    id: string
    amount: number
    paymentDate: string
  }>
}) {
  const validInvoices = params.invoices.filter((i) => i.status !== 'cancelled')

  let totalInvoices = 0
  let totalInvoiceAmount = 0
  let totalPaid = 0
  let totalDue = 0

  for (const inv of validInvoices) {
    totalInvoices++
    totalInvoiceAmount += inv.grandTotal
    totalPaid += inv.paidAmount
    totalDue += inv.dueAmount
  }

  const latestPayment = params.payments.length > 0
    ? [...params.payments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0]
    : null

  return {
    totalInvoices,
    totalInvoiceAmount: Math.round(totalInvoiceAmount * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalDue: Math.round(totalDue * 100) / 100,
    lastPaymentAmount: latestPayment?.amount || 0,
    lastPaymentDate: latestPayment?.paymentDate || null,
  }
}

describe('Customer Financial Summary & Accounting Consistency Tests', () => {
  test('Financial Formula: Total Invoiced - Total Paid = Total Due', () => {
    const result = calculateCustomerFinancials({
      invoices: [
        {
          id: 'inv-1',
          grandTotal: 10000,
          paidAmount: 6000,
          dueAmount: 4000,
          status: 'partially_paid',
          invoiceDate: '2026-09-01',
        },
        {
          id: 'inv-2',
          grandTotal: 5000,
          paidAmount: 5000,
          dueAmount: 0,
          status: 'paid',
          invoiceDate: '2026-09-05',
        },
      ],
      payments: [
        { id: 'pay-1', amount: 6000, paymentDate: '2026-09-02' },
        { id: 'pay-2', amount: 5000, paymentDate: '2026-09-05' },
      ],
    })

    assert.strictEqual(result.totalInvoices, 2)
    assert.strictEqual(result.totalInvoiceAmount, 15000)
    assert.strictEqual(result.totalPaid, 11000)
    assert.strictEqual(result.totalDue, 4000)
    assert.strictEqual(result.totalInvoiceAmount - result.totalPaid, result.totalDue)
  })

  test('Cancelled Invoices: Cancelled bills do not contribute to invoiced amount or outstanding receivable', () => {
    const result = calculateCustomerFinancials({
      invoices: [
        {
          id: 'inv-valid',
          grandTotal: 8000,
          paidAmount: 8000,
          dueAmount: 0,
          status: 'paid',
          invoiceDate: '2026-09-01',
        },
        {
          id: 'inv-cancelled',
          grandTotal: 25000,
          paidAmount: 0,
          dueAmount: 25000,
          status: 'cancelled',
          invoiceDate: '2026-09-03',
        },
      ],
      payments: [{ id: 'pay-1', amount: 8000, paymentDate: '2026-09-01' }],
    })

    // Cancelled invoice is excluded
    assert.strictEqual(result.totalInvoices, 1)
    assert.strictEqual(result.totalInvoiceAmount, 8000)
    assert.strictEqual(result.totalDue, 0)
  })

  test('Last Payment Resolution: Identifies most recent payment correctly', () => {
    const result = calculateCustomerFinancials({
      invoices: [],
      payments: [
        { id: 'pay-aug', amount: 3000, paymentDate: '2026-08-20' },
        { id: 'pay-sept', amount: 7500, paymentDate: '2026-09-10' },
      ],
    })

    assert.strictEqual(result.lastPaymentAmount, 7500)
    assert.strictEqual(result.lastPaymentDate, '2026-09-10')
  })
})
