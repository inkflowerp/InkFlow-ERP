import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { BillingService } from '../../services/billing.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { InvoiceRecord, PaymentRecord } from '../../types/billing.types.ts'

describe('Consolidated Billing & Simple Due Collection Engine (Integration & Financial Integrity)', () => {
  const companyId = 'comp-test-billing-01'

  beforeEach(() => {
    PrintERPDataStore.clearAll()
  })

  it('A. Full Payment: due ৳20,000 -> collect ৳20,000 -> due ৳0, status Paid', async () => {
    // 1. Create Invoice with ৳20,000 due
    const invoice = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-abc-01',
      customer_name: 'ABC Printing & Packaging',
      customer_phone: '+8801700112233',
      due_date: '2026-10-15',
      subtotal: 20000,
      grand_total: 20000,
      paid_amount: 0,
      due_amount: 20000,
      status: 'unpaid',
      invoice_type: 'sales_invoice',
      created_by_name: 'Accountant',
    })

    assert.strictEqual(invoice.grand_total, 20000)
    assert.strictEqual(invoice.due_amount, 20000)
    assert.strictEqual(invoice.status, 'unpaid')

    // 2. Collect Full Payment of ৳20,000
    const payment = await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: 'cust-abc-01',
      customerName: 'ABC Printing & Packaging',
      amount: 20000,
      paymentMethod: 'cash',
      receivedByName: 'Cash Counter',
      allocations: [{ invoiceId: invoice.id, amount: 20000 }],
    })

    assert.strictEqual(payment.amount, 20000)
    assert.ok(payment.receipt_number.startsWith('PAY-'))

    // 3. Verify Invoice state updated atomically
    const updatedInvoice = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.ok(updatedInvoice)
    assert.strictEqual(updatedInvoice.paid_amount, 20000)
    assert.strictEqual(updatedInvoice.due_amount, 0)
    assert.strictEqual(updatedInvoice.status, 'paid')
  })

  it('B. Partial Payment: due ৳20,000 -> collect ৳10,000 -> due ৳10,000, status Partially Paid', async () => {
    // 1. Create Invoice with ৳20,000 due
    const invoice = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-abc-02',
      customer_name: 'Popular Offset Press',
      customer_phone: '+8801811223344',
      due_date: '2026-10-20',
      subtotal: 20000,
      grand_total: 20000,
      paid_amount: 0,
      due_amount: 20000,
      status: 'unpaid',
      created_by_name: 'Accountant',
    })

    // 2. Collect Partial Payment of ৳10,000
    const payment = await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: 'cust-abc-02',
      customerName: 'Popular Offset Press',
      amount: 10000,
      paymentMethod: 'bkash',
      mfsTransactionId: 'BK9X2891K',
      receivedByName: 'Cashier',
      allocations: [{ invoiceId: invoice.id, amount: 10000 }],
    })

    assert.strictEqual(payment.amount, 10000)

    // 3. Verify Invoice state
    const updatedInvoice = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.ok(updatedInvoice)
    assert.strictEqual(updatedInvoice.paid_amount, 10000)
    assert.strictEqual(updatedInvoice.due_amount, 10000)
    assert.strictEqual(updatedInvoice.status, 'partially_paid')
  })

  it('C. Sequential Multiple Partial Payments: ৳5k -> ৳5k -> ৳10k -> final due ৳0, status Paid', async () => {
    const invoice = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-abc-03',
      customer_name: 'Meghna Signage Ltd.',
      customer_phone: '+8801911223344',
      due_date: '2026-10-25',
      subtotal: 20000,
      grand_total: 20000,
      paid_amount: 0,
      due_amount: 20000,
      status: 'unpaid',
      created_by_name: 'Accountant',
    })

    // Payment 1: ৳5,000
    await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: 'cust-abc-03',
      customerName: 'Meghna Signage Ltd.',
      amount: 5000,
      paymentMethod: 'cash',
      receivedByName: 'Cashier',
      allocations: [{ invoiceId: invoice.id, amount: 5000 }],
    })

    let inv = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.ok(inv)
    assert.strictEqual(inv.paid_amount, 5000)
    assert.strictEqual(inv.due_amount, 15000)
    assert.strictEqual(inv.status, 'partially_paid')

    // Payment 2: ৳5,000
    await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: 'cust-abc-03',
      customerName: 'Meghna Signage Ltd.',
      amount: 5000,
      paymentMethod: 'nagad',
      mfsTransactionId: 'NG839103K',
      receivedByName: 'Cashier',
      allocations: [{ invoiceId: invoice.id, amount: 5000 }],
    })

    inv = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.ok(inv)
    assert.strictEqual(inv.paid_amount, 10000)
    assert.strictEqual(inv.due_amount, 10000)
    assert.strictEqual(inv.status, 'partially_paid')

    // Payment 3: ৳10,000 (settles the balance)
    await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: 'cust-abc-03',
      customerName: 'Meghna Signage Ltd.',
      amount: 10000,
      paymentMethod: 'bank',
      bankName: 'City Bank Ltd',
      receivedByName: 'Cashier',
      allocations: [{ invoiceId: invoice.id, amount: 10000 }],
    })

    inv = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.ok(inv)
    assert.strictEqual(inv.paid_amount, 20000)
    assert.strictEqual(inv.due_amount, 0)
    assert.strictEqual(inv.status, 'paid')
  })

  it('D. Overpayment Safety: payment capped and surplus handled safely without negative due', async () => {
    const invoice = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-abc-04',
      customer_name: 'Overpay Test Ltd.',
      customer_phone: '+8801511223344',
      due_date: '2026-10-30',
      subtotal: 20000,
      grand_total: 20000,
      paid_amount: 0,
      due_amount: 20000,
      status: 'unpaid',
      created_by_name: 'Accountant',
    })

    // Attempting ৳25,000 allocation on ৳20,000 due
    const payment = await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: 'cust-abc-04',
      customerName: 'Overpay Test Ltd.',
      amount: 25000,
      paymentMethod: 'cash',
      receivedByName: 'Cashier',
      allocations: [{ invoiceId: invoice.id, amount: 25000 }],
    })

    const inv = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.ok(inv)
    // Paid amount cannot exceed grand total
    assert.strictEqual(inv.paid_amount, 20000)
    assert.strictEqual(inv.due_amount, 0)
    assert.strictEqual(inv.status, 'paid')
  })

  it('E. Zero and Negative Payment Rejection', async () => {
    await assert.rejects(
      async () => {
        await BillingRepository.recordMultiInvoicePayment({
          companyId,
          customerId: 'cust-abc-05',
          customerName: 'Zero Pay Test',
          amount: 0,
          paymentMethod: 'cash',
          receivedByName: 'Cashier',
        })
      },
      { message: /greater than zero/i }
    )

    await assert.rejects(
      async () => {
        await BillingRepository.recordMultiInvoicePayment({
          companyId,
          customerId: 'cust-abc-05',
          customerName: 'Negative Pay Test',
          amount: -5000,
          paymentMethod: 'cash',
          receivedByName: 'Cashier',
        })
      },
      { message: /greater than zero/i }
    )
  })

  it('F. Customer-Level Due Search returns all outstanding invoices for customer', async () => {
    // Create 3 invoices for the same customer with different due amounts
    await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-multi-inv',
      customer_name: 'Apex Printing & Publishing',
      customer_phone: '+8801722334455',
      due_date: '2026-10-01',
      subtotal: 5000,
      grand_total: 5000,
      paid_amount: 0,
      due_amount: 5000,
      status: 'unpaid',
      created_by_name: 'Commercial',
    })

    await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-multi-inv',
      customer_name: 'Apex Printing & Publishing',
      customer_phone: '+8801722334455',
      due_date: '2026-10-10',
      subtotal: 20000,
      grand_total: 20000,
      paid_amount: 0,
      due_amount: 20000,
      status: 'unpaid',
      created_by_name: 'Commercial',
    })

    await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-multi-inv',
      customer_name: 'Apex Printing & Publishing',
      customer_phone: '+8801722334455',
      due_date: '2026-10-15',
      subtotal: 12000,
      grand_total: 12000,
      paid_amount: 0,
      due_amount: 12000,
      status: 'unpaid',
      created_by_name: 'Commercial',
    })

    const customerInvoices = await BillingRepository.getInvoices(companyId, { customerId: 'cust-multi-inv' })
    assert.strictEqual(customerInvoices.length, 3)

    const totalDue = customerInvoices.reduce((sum, inv) => sum + inv.due_amount, 0)
    assert.strictEqual(totalDue, 37000)
  })

  it('G. Cannot allocate payment to a cancelled invoice', async () => {
    const invoice = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-cancel-01',
      customer_name: 'Cancelled Invoice Test',
      customer_phone: '+8801733445566',
      due_date: '2026-10-05',
      subtotal: 15000,
      grand_total: 15000,
      paid_amount: 0,
      due_amount: 15000,
      status: 'unpaid',
      created_by_name: 'Commercial',
    })

    // Cancel invoice
    await BillingRepository.cancelInvoice(invoice.id, 'Customer cancelled order', 'Owner', companyId)

    const cancelledInv = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.ok(cancelledInv)
    assert.strictEqual(cancelledInv.status, 'cancelled')

    // Attempting payment on cancelled invoice must reject
    await assert.rejects(
      async () => {
        await BillingRepository.recordMultiInvoicePayment({
          companyId,
          customerId: 'cust-cancel-01',
          customerName: 'Cancelled Invoice Test',
          amount: 5000,
          paymentMethod: 'cash',
          receivedByName: 'Cashier',
          allocations: [{ invoiceId: invoice.id, amount: 5000 }],
        })
      },
      { message: /cancelled invoice/i }
    )
  })
})
