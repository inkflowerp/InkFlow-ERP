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

  it('SCENARIO 1 — FULL PAYMENT: due ৳20,000 -> collect ৳20,000 -> due ৳0, status Paid', async () => {
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

  it('SCENARIO 2 — PARTIAL PAYMENT: due ৳20,000 -> collect ৳8,000 -> due ৳12,000, status Partially Paid', async () => {
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

    // Collect Partial Payment of ৳8,000
    const payment = await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: 'cust-abc-02',
      customerName: 'Popular Offset Press',
      amount: 8000,
      paymentMethod: 'bkash',
      mfsTransactionId: 'BK9X2891K',
      receivedByName: 'Cashier',
      allocations: [{ invoiceId: invoice.id, amount: 8000 }],
    })

    assert.strictEqual(payment.amount, 8000)

    const updatedInvoice = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.ok(updatedInvoice)
    assert.strictEqual(updatedInvoice.paid_amount, 8000)
    assert.strictEqual(updatedInvoice.due_amount, 12000)
    assert.strictEqual(updatedInvoice.status, 'partially_paid')
  })

  it('SCENARIO 3 — MULTIPLE PARTIAL PAYMENTS: ৳5k -> ৳5k -> ৳10k -> final due ৳0, status Paid', async () => {
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

    // Payment 3: ৳10,000 (settles remaining due)
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

  it('SCENARIO 4 — OVERPAYMENT REJECTION: attempt ৳20,001 on ৳20,000 due is safely bounded', async () => {
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

    // Attempting ৳20,001 allocation on ৳20,000 due
    const payment = await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: 'cust-abc-04',
      customerName: 'Overpay Test Ltd.',
      amount: 20001,
      paymentMethod: 'cash',
      receivedByName: 'Cashier',
      allocations: [{ invoiceId: invoice.id, amount: 20001 }],
    })

    const inv = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.ok(inv)
    assert.strictEqual(inv.paid_amount, 20000)
    assert.strictEqual(inv.due_amount, 0)
    assert.strictEqual(inv.status, 'paid')
  })

  it('SCENARIO 5 — ZERO PAYMENT: attempt ৳0 is rejected', async () => {
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
  })

  it('SCENARIO 6 — NEGATIVE PAYMENT: attempt -৳100 is rejected', async () => {
    await assert.rejects(
      async () => {
        await BillingRepository.recordMultiInvoicePayment({
          companyId,
          customerId: 'cust-abc-05',
          customerName: 'Negative Pay Test',
          amount: -100,
          paymentMethod: 'cash',
          receivedByName: 'Cashier',
        })
      },
      { message: /greater than zero/i }
    )
  })

  it('SCENARIO 7 — CONCURRENT COLLECTION: cannot over-collect on concurrent payments', async () => {
    const invoice = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-abc-concurrent',
      customer_name: 'Concurrent Race Test Ltd.',
      customer_phone: '+8801700998877',
      due_date: '2026-10-30',
      subtotal: 20000,
      grand_total: 20000,
      paid_amount: 0,
      due_amount: 20000,
      status: 'unpaid',
      created_by_name: 'Accountant',
    })

    // User A collects ৳15,000, User B attempts ৳10,000
    await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: 'cust-abc-concurrent',
      customerName: 'Concurrent Race Test Ltd.',
      amount: 15000,
      paymentMethod: 'cash',
      receivedByName: 'Cashier A',
      allocations: [{ invoiceId: invoice.id, amount: 15000 }],
    })

    await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: 'cust-abc-concurrent',
      customerName: 'Concurrent Race Test Ltd.',
      amount: 10000,
      paymentMethod: 'cash',
      receivedByName: 'Cashier B',
      allocations: [{ invoiceId: invoice.id, amount: 10000 }],
    })

    const finalInv = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.ok(finalInv)
    assert.strictEqual(finalInv.paid_amount, 20000)
    assert.strictEqual(finalInv.due_amount, 0)
    assert.strictEqual(finalInv.status, 'paid')
  })

  it('SCENARIO 8 — WRONG TENANT: querying or updating another tenant invoice is rejected', async () => {
    const invoiceTenantA = await BillingRepository.createInvoice({
      company_id: 'tenant-aaa',
      customer_id: 'cust-aaa',
      customer_name: 'Tenant A Customer',
      customer_phone: '+8801700111111',
      due_date: '2026-10-15',
      subtotal: 10000,
      grand_total: 10000,
      paid_amount: 0,
      due_amount: 10000,
      status: 'unpaid',
      created_by_name: 'Accountant A',
    })

    // Tenant B attempts to fetch Tenant A invoice
    const resultTenantB = await BillingRepository.getInvoiceById(invoiceTenantA.id, 'tenant-bbb')
    assert.strictEqual(resultTenantB, null)
  })

  it('SCENARIO 9 — CUSTOMER SEARCH: returns all outstanding invoices for that customer', async () => {
    await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-multi-search',
      customer_name: 'ABC Printing',
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
      customer_id: 'cust-multi-search',
      customer_name: 'ABC Printing',
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
      customer_id: 'cust-multi-search',
      customer_name: 'ABC Printing',
      customer_phone: '+8801722334455',
      due_date: '2026-10-15',
      subtotal: 12000,
      grand_total: 12000,
      paid_amount: 0,
      due_amount: 12000,
      status: 'unpaid',
      created_by_name: 'Commercial',
    })

    const invoices = await BillingRepository.getInvoices(companyId, { customerId: 'cust-multi-search' })
    assert.strictEqual(invoices.length, 3)
    const totalDue = invoices.reduce((sum, inv) => sum + inv.due_amount, 0)
    assert.strictEqual(totalDue, 37000)
  })

  it('SCENARIO 10 — INVOICE SEARCH: correct invoice appears immediately with accurate Total, Paid, and Due', async () => {
    const created = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-search-inv',
      customer_name: 'Search Target Customer',
      customer_phone: '+8801799887766',
      due_date: '2026-10-25',
      subtotal: 50000,
      grand_total: 50000,
      paid_amount: 30000,
      due_amount: 20000,
      status: 'partially_paid',
      created_by_name: 'Cashier',
    })

    const found = await BillingRepository.getInvoiceById(created.id, companyId)
    assert.ok(found)
    assert.strictEqual(found.grand_total, 50000)
    assert.strictEqual(found.paid_amount, 30000)
    assert.strictEqual(found.due_amount, 20000)
    assert.strictEqual(found.status, 'partially_paid')
  })

  it('SCENARIO 11 — FRESH DATA: after payment, invoice, payments list, and receivables reflect updated state', async () => {
    const invoice = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-fresh-01',
      customer_name: 'Fresh Data Test Ltd.',
      customer_phone: '+8801711002200',
      due_date: '2026-10-18',
      subtotal: 15000,
      grand_total: 15000,
      paid_amount: 0,
      due_amount: 15000,
      status: 'unpaid',
      created_by_name: 'Accountant',
    })

    // Record payment
    const payment = await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: 'cust-fresh-01',
      customerName: 'Fresh Data Test Ltd.',
      amount: 10000,
      paymentMethod: 'cash',
      receivedByName: 'Cashier Desk',
      allocations: [{ invoiceId: invoice.id, amount: 10000 }],
    })

    // 1. Check Invoice updated
    const freshInv = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.ok(freshInv)
    assert.strictEqual(freshInv.paid_amount, 10000)
    assert.strictEqual(freshInv.due_amount, 5000)
    assert.strictEqual(freshInv.status, 'partially_paid')

    // 2. Check Payments list contains record
    const allPayments = await BillingRepository.getPayments(companyId, 'cust-fresh-01')
    assert.ok(allPayments.length >= 1)
    assert.strictEqual(allPayments[0].amount, 10000)
    assert.strictEqual(allPayments[0].receipt_number, payment.receipt_number)

    // 3. Check Receivables Aging summary
    const aging = await BillingRepository.getReceivablesAging(companyId)
    assert.ok(aging)
    assert.ok(aging.totalReceivables >= 5000)
  })

  it('SCENARIO 12 — PAID INVOICE CANNOT RECEIVE ANOTHER PAYMENT: due ৳0 invoice rejects or ignores over-collection', async () => {
    // 1. Create and fully pay an invoice
    const invoice = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-settled-01',
      customer_name: 'Settled Press Ltd.',
      customer_phone: '+8801700991122',
      due_date: '2026-10-15',
      subtotal: 10000,
      grand_total: 10000,
      paid_amount: 10000,
      due_amount: 0,
      status: 'paid',
      created_by_name: 'Accountant',
    })

    assert.strictEqual(invoice.due_amount, 0)
    assert.strictEqual(invoice.status, 'paid')

    // 2. Attempting to allocate payment to already paid invoice must not increase invoice paid_amount above grand_total
    await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: 'cust-settled-01',
      customerName: 'Settled Press Ltd.',
      amount: 5000,
      paymentMethod: 'cash',
      receivedByName: 'Cashier',
      allocations: [{ invoiceId: invoice.id, amount: 5000 }],
    })

    const checkedInv = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.ok(checkedInv)
    assert.strictEqual(checkedInv.paid_amount, 10000) // Unchanged
    assert.strictEqual(checkedInv.due_amount, 0)
    assert.strictEqual(checkedInv.status, 'paid')
  })

  it('SCENARIO 13 — USER SCENARIO PROGRESSION: ৳50k total, ৳30k paid, ৳20k due -> collect ৳5k -> rem ৳15k (Partially Paid) -> collect ৳15k -> rem ৳0 (Paid)', async () => {
    // Create invoice matching user prompt example: Total ৳50,000, Paid ৳30,000, Due ৳20,000
    const invoice = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-exact-spec',
      customer_name: 'ABC Printing',
      customer_phone: '+8801700000001',
      due_date: '2026-10-20',
      subtotal: 50000,
      grand_total: 50000,
      paid_amount: 30000,
      due_amount: 20000,
      status: 'partially_paid',
      created_by_name: 'Owner',
    })

    assert.strictEqual(invoice.grand_total, 50000)
    assert.strictEqual(invoice.paid_amount, 30000)
    assert.strictEqual(invoice.due_amount, 20000)

    // Step 1: Customer pays ৳5,000 -> Remaining Due ৳15,000 -> Partially Paid
    await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: 'cust-exact-spec',
      customerName: 'ABC Printing',
      amount: 5000,
      paymentMethod: 'cash',
      receivedByName: 'Cashier',
      allocations: [{ invoiceId: invoice.id, amount: 5000 }],
    })

    let currentInv = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.ok(currentInv)
    assert.strictEqual(currentInv.paid_amount, 35000)
    assert.strictEqual(currentInv.due_amount, 15000)
    assert.strictEqual(currentInv.status, 'partially_paid')

    // Step 2: Customer pays remaining ৳15,000 -> Remaining Due ৳0 -> Paid
    await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: 'cust-exact-spec',
      customerName: 'ABC Printing',
      amount: 15000,
      paymentMethod: 'bkash',
      mfsTransactionId: 'TRX-FULL-SETTLE',
      receivedByName: 'Cashier',
      allocations: [{ invoiceId: invoice.id, amount: 15000 }],
    })

    currentInv = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.ok(currentInv)
    assert.strictEqual(currentInv.paid_amount, 50000)
    assert.strictEqual(currentInv.due_amount, 0)
    assert.strictEqual(currentInv.status, 'paid')
  })

  it('SCENARIO 14 — CUSTOMER BALANCE RECONCILIATION: balances reconcile correctly after multiple partial collections', async () => {
    const custId = 'cust-reconcile-test'
    // Create 2 invoices
    const inv1 = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: custId,
      customer_name: 'Reconciliation Press',
      customer_phone: '+8801700998811',
      due_date: '2026-10-10',
      subtotal: 30000,
      grand_total: 30000,
      paid_amount: 0,
      due_amount: 30000,
      status: 'unpaid',
      created_by_name: 'Accountant',
    })

    const inv2 = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: custId,
      customer_name: 'Reconciliation Press',
      customer_phone: '+8801700998811',
      due_date: '2026-10-12',
      subtotal: 20000,
      grand_total: 20000,
      paid_amount: 0,
      due_amount: 20000,
      status: 'unpaid',
      created_by_name: 'Accountant',
    })

    // Collect ৳15,000 on inv1 and ৳10,000 on inv2
    await BillingRepository.recordMultiInvoicePayment({
      companyId,
      customerId: custId,
      customerName: 'Reconciliation Press',
      amount: 25000,
      paymentMethod: 'bank',
      bankName: 'BRAC Bank',
      receivedByName: 'Cashier',
      allocations: [
        { invoiceId: inv1.id, amount: 15000 },
        { invoiceId: inv2.id, amount: 10000 },
      ],
    })

    const check1 = await BillingRepository.getInvoiceById(inv1.id, companyId)
    const check2 = await BillingRepository.getInvoiceById(inv2.id, companyId)

    assert.ok(check1)
    assert.ok(check2)
    assert.strictEqual(check1.due_amount, 15000)
    assert.strictEqual(check2.due_amount, 10000)

    const totalRemainingDue = check1.due_amount + check2.due_amount
    assert.strictEqual(totalRemainingDue, 25000)
  })
})
