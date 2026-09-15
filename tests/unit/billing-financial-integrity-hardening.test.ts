import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { BillingRepository, getTodayDateString, calculateDaysOverdue, getFinancialPersistenceMode } from '../../lib/repositories/billing.repository.ts'
import { BillingService } from '../../services/billing.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { InvoiceRecord, PaymentRecord } from '../../types/billing.types.ts'
import type { CustomerRecord } from '../../types/crm.types.ts'

describe('Billing Financial Integrity & Production Hardening Unit Tests', () => {
  const companyA = 'comp-financial-alpha'
  const companyB = 'comp-financial-beta'

  beforeEach(() => {
    PrintERPDataStore.clear()

    // Seed mock customers
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [
      {
        id: 'cust-h01',
        company_id: companyA,
        name: 'Apex Printing & Publishing',
        mobile: '01711223344',
        total_invoiced_amount: 100000,
        total_paid_amount: 40000,
        total_due_balance: 60000,
        credit_limit: 80000,
      },
      {
        id: 'cust-h02',
        company_id: companyA,
        name: 'Bengal Signage Network',
        mobile: '01855667788',
        total_invoiced_amount: 150000,
        total_paid_amount: 150000,
        total_due_balance: 0,
        credit_limit: 200000,
      },
    ])

    const todayStr = getTodayDateString()

    // Seed initial test invoices
    const initialInvoices: InvoiceRecord[] = [
      {
        id: 'inv-h01',
        company_id: companyA,
        invoice_number: 'INV-2026-00101',
        invoice_date: todayStr,
        due_date: todayStr,
        customer_id: 'cust-h01',
        customer_name: 'Apex Printing & Publishing',
        customer_phone: '01711223344',
        subtotal: 50000,
        discount_amount: 0,
        vat_percentage: 0,
        vat_amount: 0,
        grand_total: 50000,
        paid_amount: 20000,
        due_amount: 30000,
        write_off_amount: 0,
        status: 'partially_paid',
        invoice_type: 'sales_invoice',
        created_by_name: 'Audit Clerk',
        items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'inv-h02',
        company_id: companyA,
        invoice_number: 'INV-2026-00102',
        invoice_date: todayStr,
        due_date: todayStr,
        customer_id: 'cust-h01',
        customer_name: 'Apex Printing & Publishing',
        customer_phone: '01711223344',
        subtotal: 30000,
        discount_amount: 0,
        vat_percentage: 0,
        vat_amount: 0,
        grand_total: 30000,
        paid_amount: 0,
        due_amount: 30000,
        write_off_amount: 0,
        status: 'unpaid',
        invoice_type: 'sales_invoice',
        created_by_name: 'Audit Clerk',
        items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'inv-h03',
        company_id: companyA,
        invoice_number: 'INV-2026-00103',
        invoice_date: todayStr,
        due_date: todayStr,
        customer_id: 'cust-h02',
        customer_name: 'Bengal Signage Network',
        customer_phone: '01855667788',
        subtotal: 150000,
        discount_amount: 0,
        vat_percentage: 0,
        vat_amount: 0,
        grand_total: 150000,
        paid_amount: 150000,
        due_amount: 0,
        write_off_amount: 0,
        status: 'paid',
        invoice_type: 'sales_invoice',
        created_by_name: 'Audit Clerk',
        items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, initialInvoices)
  })

  test('1. Financial Persistence Mode: Resolves test/production mode explicitly', () => {
    const mode = getFinancialPersistenceMode()
    assert.ok(mode === 'test' || mode === 'production', 'Persistence mode must resolve to test or production')
  })

  test('2. Strict Invoice Cancellation Rules: Blocks cancellation of Paid, Partially Paid, and Written-Off invoices', async () => {
    // Attempt to cancel fully Paid invoice (inv-h03) -> must reject
    await assert.rejects(
      async () => {
        await BillingRepository.cancelInvoice('inv-h03', 'Owner changed mind', 'Manager', companyA)
      },
      /Paid invoices cannot be cancelled directly/,
      'Must reject cancellation of paid invoice'
    )

    // Attempt to cancel Partially Paid invoice (inv-h01) -> must reject
    await assert.rejects(
      async () => {
        await BillingRepository.cancelInvoice('inv-h01', 'Partial refund test', 'Manager', companyA)
      },
      /Partially paid invoices .* cannot be cancelled directly/,
      'Must reject cancellation of partially paid invoice'
    )

    // Cancel Unpaid invoice (inv-h02) -> must succeed and release customer due balance
    const cancelRes = await BillingRepository.cancelInvoice('inv-h02', 'Customer duplicate order', 'Manager', companyA)
    assert.strictEqual(cancelRes, true, 'Unpaid invoice cancellation should succeed')

    const cancelledInv = await BillingRepository.getInvoiceById('inv-h02', companyA)
    assert.strictEqual(cancelledInv?.status, 'cancelled', 'Status should be cancelled')
    assert.strictEqual(cancelledInv?.due_amount, 0, 'Due amount should be zeroed')

    // Customer total due balance should be reduced from 60,000 to 30,000
    const customers = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
    const cust = customers.find((c) => c.id === 'cust-h01')
    assert.strictEqual(cust?.total_due_balance, 30000, 'Customer due balance should be reduced by released due')
  })

  test('3. Write-Off Bounds & Protection: Rejects excessive write-offs, cancelled invoices, and fully settled invoices', async () => {
    // 1. Attempt to write off more than due amount on inv-h01 (due: 30,000, request: 40,000) -> must reject
    await assert.rejects(
      async () => {
        await BillingRepository.recordWriteOff({
          company_id: companyA,
          invoice_id: 'inv-h01',
          amount: 40000,
          reason: 'Customer insolvency',
          authorized_by_name: 'CFO',
        })
      },
      /cannot exceed due balance/,
      'Must reject write-off exceeding invoice due'
    )

    // 2. Attempt to write off on already paid invoice (inv-h03) -> must reject
    await assert.rejects(
      async () => {
        await BillingRepository.recordWriteOff({
          company_id: companyA,
          invoice_id: 'inv-h03',
          amount: 5000,
          reason: 'Erroneous write-off',
          authorized_by_name: 'CFO',
        })
      },
      /has no remaining due to write off/,
      'Must reject write-off on invoice with 0 due'
    )

    // 3. Valid write-off of ৳10,000 on inv-h01 (due: 30,000) -> must adjust balance and update customer
    const wo = await BillingRepository.recordWriteOff({
      company_id: companyA,
      invoice_id: 'inv-h01',
      amount: 10000,
      reason: 'Commercial bad debt settlement',
      authorized_by_name: 'CFO',
    })
    assert.strictEqual(wo.amount, 10000)

    const updatedInv = await BillingRepository.getInvoiceById('inv-h01', companyA)
    assert.strictEqual(updatedInv?.due_amount, 20000, 'Remaining due should be 20,000')
    assert.strictEqual(updatedInv?.write_off_amount, 10000, 'Write-off amount should be 10,000')

    const customers = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
    const cust = customers.find((c) => c.id === 'cust-h01')
    assert.strictEqual(cust?.total_due_balance, 50000, 'Customer total due balance should decrease by 10,000')
  })

  test('4. Payment Allocation Safety: Rejects allocation to cancelled invoice & handles unallocated advance', async () => {
    // First cancel inv-h02
    await BillingRepository.cancelInvoice('inv-h02', 'Voiding for test', 'Manager', companyA)

    // Attempt to allocate payment to cancelled inv-h02 -> must reject
    await assert.rejects(
      async () => {
        await BillingRepository.recordMultiInvoicePayment({
          companyId: companyA,
          customerId: 'cust-h01',
          customerName: 'Apex Printing & Publishing',
          amount: 15000,
          paymentMethod: 'cash',
          receivedByName: 'Cashier',
          allocations: [{ invoiceId: 'inv-h02', amount: 15000 }],
        })
      },
      /Cannot allocate payment to cancelled invoice/,
      'Must reject payment allocation to cancelled invoice'
    )

    // Record payment of ৳50,000 on remaining inv-h01 (due: 30,000)
    const pay = await BillingRepository.recordMultiInvoicePayment({
      companyId: companyA,
      customerId: 'cust-h01',
      customerName: 'Apex Printing & Publishing',
      amount: 50000,
      paymentMethod: 'bkash',
      mfsTransactionId: 'BKASH-TRX-998877',
      receivedByName: 'Cashier',
      idempotencyKey: 'idem-pay-001',
    })

    assert.strictEqual(pay.amount, 50000)
    assert.strictEqual(pay.unallocated_amount, 20000, 'Excess ৳20,000 should be preserved as unallocated surplus / advance')
    assert.strictEqual(pay.idempotency_key, 'idem-pay-001')

    const inv = await BillingRepository.getInvoiceById('inv-h01', companyA)
    assert.strictEqual(inv?.status, 'paid', 'Invoice should transition to fully paid')
    assert.strictEqual(inv?.due_amount, 0, 'Invoice due should be 0')
  })

  test('5. Customer Balance Reconciliation: Accurately audits and reports balance discrepancies', async () => {
    // Generate reconciliation report for Company A
    const report = await BillingService.reconcileCustomerBalances(companyA)
    assert.strictEqual(report.companyId, companyA)
    assert.ok(report.totalCustomers >= 2, 'Should audit all company customers')

    // Modify a customer balance to simulate a mismatch
    const customers = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
    customers[0].total_due_balance = 999999 // Erroneous stored balance
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, customers)

    const mismatchReport = await BillingService.reconcileCustomerBalances(companyA)
    assert.strictEqual(mismatchReport.mismatchedCustomers, 1, 'Should detect exactly 1 mismatched customer')
    assert.strictEqual(mismatchReport.reconciled, false, 'Should flag report as unreconciled')

    const mismatchedItem = mismatchReport.items.find((i) => i.customerId === 'cust-h01')
    assert.strictEqual(mismatchedItem?.isBalanced, false)
    assert.strictEqual(mismatchedItem?.calculatedDueBalance, 60000)
  })

  test('6. Timezone Integrity: Uses Asia/Dhaka for date formatting and overdue calculation', () => {
    const todayStr = getTodayDateString()
    assert.match(todayStr, /^\d{4}-\d{2}-\d{2}$/, 'Date string must be YYYY-MM-DD in Asia/Dhaka')

    const overdueDays = calculateDaysOverdue(todayStr)
    assert.strictEqual(overdueDays, 0, 'Invoices due today must not be flagged as overdue')
  })
})
