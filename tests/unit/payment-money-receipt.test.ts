import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'

// Payment types & models
export type PaymentMethod = 'cash' | 'bkash' | 'nagad' | 'bank' | 'bank_transfer' | 'cheque' | 'other_mfs'

export interface InvoiceItem {
  id: string
  invoice_number: string
  invoice_date: string
  grand_total: number
  paid_amount: number
  due_amount: number
  status: 'unpaid' | 'partially_paid' | 'paid'
}

export interface PaymentAllocation {
  id: string
  payment_id: string
  invoice_id: string
  invoice_number: string
  allocated_amount: number
  created_at: string
}

export interface PaymentRecord {
  id: string
  company_id: string
  receipt_number: string
  customer_id: string
  customer_name: string
  payment_date: string
  payment_method: PaymentMethod
  amount: number
  bank_name?: string | null
  cheque_number?: string | null
  cheque_date?: string | null
  mfs_transaction_id?: string | null
  notes?: string | null
  received_by_name: string
  allocations?: PaymentAllocation[]
  created_at: string
}

export interface CustomerState {
  id: string
  name: string
  total_due_balance: number
}

// Bangladeshi Taka in Words Converter
export function numberToWordsBDT(amount: number): string {
  if (amount === 0) return 'Zero Taka Only'
  if (amount < 0) return 'Negative ' + numberToWordsBDT(Math.abs(amount))

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertLessThanOneThousand = (num: number): string => {
    let current = ''
    if (num >= 100) {
      current += units[Math.floor(num / 100)] + ' Hundred '
      num %= 100
    }
    if (num >= 20) {
      current += tens[Math.floor(num / 10)] + ' '
      num %= 10
    }
    if (num > 0) {
      current += units[num] + ' '
    }
    return current.trim()
  }

  const integerPart = Math.floor(amount)
  const paisa = Math.round((amount - integerPart) * 100)

  let result = ''
  let num = integerPart

  // Bangladeshi Numbering: Crore (1,00,00,000), Lakh (1,00,000), Thousand (1,000), Hundred
  const crore = Math.floor(num / 10000000)
  num %= 10000000
  if (crore > 0) {
    result += convertLessThanOneThousand(crore) + ' Crore '
  }

  const lakh = Math.floor(num / 100000)
  num %= 100000
  if (lakh > 0) {
    result += convertLessThanOneThousand(lakh) + ' Lakh '
  }

  const thousand = Math.floor(num / 1000)
  num %= 1000
  if (thousand > 0) {
    result += convertLessThanOneThousand(thousand) + ' Thousand '
  }

  if (num > 0) {
    result += convertLessThanOneThousand(num) + ' '
  }

  result = result.trim() + ' Taka'
  if (paisa > 0) {
    result += ' and ' + convertLessThanOneThousand(paisa) + ' Paisa'
  }
  return result + ' Only'
}

// Payment Allocation Engine
export class PaymentAllocationEngine {
  static recordPayment(params: {
    customer: CustomerState
    invoices: InvoiceItem[]
    amount: number
    paymentMethod: PaymentMethod
    receiptNumber: string
    bankName?: string
    chequeNumber?: string
    mfsTrxId?: string
    notes?: string
    receivedByName?: string
    allocations?: { invoiceId: string; amount: number }[]
  }): { payment: PaymentRecord; updatedInvoices: InvoiceItem[]; updatedCustomer: CustomerState } {
    const paymentId = `pay-${Date.now()}`
    const paymentDate = new Date().toISOString().split('T')[0]
    const updatedInvoices = params.invoices.map(inv => ({ ...inv }))
    const recordedAllocations: PaymentAllocation[] = []

    if (params.allocations && params.allocations.length > 0) {
      // Explicit Custom Allocation
      for (const alloc of params.allocations) {
        if (alloc.amount > 0) {
          const inv = updatedInvoices.find(i => i.id === alloc.invoiceId)
          if (inv) {
            inv.paid_amount = (Number(inv.paid_amount) || 0) + alloc.amount
            inv.due_amount = Math.max(0, (Number(inv.grand_total) || 0) - inv.paid_amount)
            inv.status = inv.due_amount === 0 ? 'paid' : 'partially_paid'
            recordedAllocations.push({
              id: `alloc-${Date.now()}-${inv.id}`,
              payment_id: paymentId,
              invoice_id: inv.id,
              invoice_number: inv.invoice_number,
              allocated_amount: alloc.amount,
              created_at: new Date().toISOString(),
            })
          }
        }
      }
    } else {
      // Auto FIFO Allocation (Oldest first)
      const sortedInvoices = [...updatedInvoices]
        .filter(inv => inv.due_amount > 0)
        .sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime())

      let remainingToAllocate = params.amount
      for (const inv of sortedInvoices) {
        if (remainingToAllocate <= 0) break
        const invDue = Number(inv.due_amount) || 0
        const allocAmt = Math.min(remainingToAllocate, invDue)
        inv.paid_amount = (Number(inv.paid_amount) || 0) + allocAmt
        inv.due_amount = Math.max(0, (Number(inv.grand_total) || 0) - inv.paid_amount)
        inv.status = inv.due_amount === 0 ? 'paid' : 'partially_paid'

        recordedAllocations.push({
          id: `alloc-${Date.now()}-${inv.id}`,
          payment_id: paymentId,
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          allocated_amount: allocAmt,
          created_at: new Date().toISOString(),
        })
        remainingToAllocate -= allocAmt
      }
    }

    const updatedCustomer: CustomerState = {
      ...params.customer,
      total_due_balance: Math.max(0, (Number(params.customer.total_due_balance) || 0) - params.amount),
    }

    const payment: PaymentRecord = {
      id: paymentId,
      company_id: 'comp-01',
      receipt_number: params.receiptNumber,
      customer_id: params.customer.id,
      customer_name: params.customer.name,
      payment_date: paymentDate,
      payment_method: params.paymentMethod,
      amount: params.amount,
      bank_name: params.bankName || null,
      cheque_number: params.chequeNumber || null,
      mfs_transaction_id: params.mfsTrxId || null,
      notes: params.notes || null,
      received_by_name: params.receivedByName || 'Cashier',
      allocations: recordedAllocations,
      created_at: new Date().toISOString(),
    }

    return { payment, updatedInvoices, updatedCustomer }
  }
}

describe('Record Customer Payment & Money Receipt (MR) Test Suite', () => {
  let customer: CustomerState
  let invoices: InvoiceItem[]

  beforeEach(() => {
    customer = {
      id: 'cust-test-01',
      name: 'Rahim Printing & Packaging Ltd',
      total_due_balance: 35000,
    }

    invoices = [
      {
        id: 'inv-test-01',
        invoice_number: 'INV-2026-001',
        invoice_date: '2026-09-01',
        grand_total: 15000,
        paid_amount: 0,
        due_amount: 15000,
        status: 'unpaid',
      },
      {
        id: 'inv-test-02',
        invoice_number: 'INV-2026-002',
        invoice_date: '2026-09-05',
        grand_total: 20000,
        paid_amount: 0,
        due_amount: 20000,
        status: 'unpaid',
      },
    ]
  })

  test('1. Auto FIFO Allocation: Settles oldest invoice first and partially settles second invoice', () => {
    const result = PaymentAllocationEngine.recordPayment({
      customer,
      invoices,
      amount: 25000,
      paymentMethod: 'bank',
      bankName: 'Islami Bank Bangladesh PLC',
      receiptNumber: 'MR-2026-001',
      notes: 'Payment received via BEFTN',
      receivedByName: 'Cashier Shamol',
    })

    assert.strictEqual(result.payment.amount, 25000)
    assert.strictEqual(result.payment.receipt_number, 'MR-2026-001')
    assert.strictEqual(result.payment.payment_method, 'bank')
    assert.strictEqual(result.payment.bank_name, 'Islami Bank Bangladesh PLC')

    const inv1 = result.updatedInvoices.find(i => i.id === 'inv-test-01')
    assert.ok(inv1)
    assert.strictEqual(inv1.paid_amount, 15000)
    assert.strictEqual(inv1.due_amount, 0)
    assert.strictEqual(inv1.status, 'paid')

    const inv2 = result.updatedInvoices.find(i => i.id === 'inv-test-02')
    assert.ok(inv2)
    assert.strictEqual(inv2.paid_amount, 10000)
    assert.strictEqual(inv2.due_amount, 10000)
    assert.strictEqual(inv2.status, 'partially_paid')

    assert.strictEqual(result.updatedCustomer.total_due_balance, 10000)
  })

  test('2. Custom Multi-Invoice Allocation: Applies custom amounts across specific invoices', () => {
    const result = PaymentAllocationEngine.recordPayment({
      customer,
      invoices,
      amount: 12000,
      paymentMethod: 'cheque',
      chequeNumber: 'CQ-992810',
      bankName: 'BRAC Bank PLC',
      allocations: [
        { invoiceId: 'inv-test-01', amount: 5000 },
        { invoiceId: 'inv-test-02', amount: 7000 },
      ],
      receiptNumber: 'MR-2026-003',
      receivedByName: 'Accountant',
    })

    assert.strictEqual(result.payment.cheque_number, 'CQ-992810')
    assert.strictEqual(result.payment.bank_name, 'BRAC Bank PLC')

    const inv1 = result.updatedInvoices.find(i => i.id === 'inv-test-01')
    assert.strictEqual(inv1?.paid_amount, 5000)
    assert.strictEqual(inv1?.due_amount, 10000)

    const inv2 = result.updatedInvoices.find(i => i.id === 'inv-test-02')
    assert.strictEqual(inv2?.paid_amount, 7000)
    assert.strictEqual(inv2?.due_amount, 13000)
  })

  test('3. Currency in Words conversion (numberToWordsBDT): Converts exact BDT amounts accurately', () => {
    assert.strictEqual(numberToWordsBDT(0), 'Zero Taka Only')
    assert.strictEqual(numberToWordsBDT(500), 'Five Hundred Taka Only')
    assert.strictEqual(numberToWordsBDT(25000), 'Twenty Five Thousand Taka Only')
    assert.strictEqual(numberToWordsBDT(150000), 'One Lakh Fifty Thousand Taka Only')
    assert.strictEqual(numberToWordsBDT(10500750), 'One Crore Five Lakh Seven Hundred Fifty Taka Only')
  })
})
