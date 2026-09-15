import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import type {
  BillingOverviewMetrics,
  CollectionPriorityItem,
  ReceivablesAgingSummary,
  CustomerReceivablesAging,
  SalespersonCollectionStat,
  PaymentMethodSummaryItem,
  MultiInvoicePaymentInput,
  CreditLimitWarningInfo,
  InvoiceRecord,
  PaymentRecord,
} from '../../types/billing.types.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { BillingService } from '../../services/billing.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Billing & Collections Owner Control Center Unit Tests', () => {
  const companyA = 'comp-tenant-alpha'
  const companyB = 'comp-tenant-beta'

  beforeEach(() => {
    PrintERPDataStore.clear()

    // Seed mock customers
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [
      {
        id: 'cust-01',
        company_id: companyA,
        name: 'Dhaka Packaging Ltd',
        phone: '01711111111',
        total_invoiced_amount: 250000,
        total_paid_amount: 150000,
        total_due_balance: 100000,
        credit_limit: 120000,
      },
      {
        id: 'cust-02',
        company_id: companyA,
        name: 'Chittagong Prints & Co',
        phone: '01822222222',
        total_invoiced_amount: 500000,
        total_paid_amount: 200000,
        total_due_balance: 300000,
        credit_limit: 250000, // already near/exceeding credit limit
      },
      {
        id: 'cust-b01',
        company_id: companyB,
        name: 'Sylhet Graphics',
        phone: '01933333333',
        total_invoiced_amount: 80000,
        total_paid_amount: 40000,
        total_due_balance: 40000,
        credit_limit: 100000,
      },
    ])

    const getTodayStr = () => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    const todayStr = getTodayStr()

    // Helper date functions for aging
    const daysAgo = (days: number) => {
      const d = new Date()
      d.setDate(d.getDate() - days)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    // Seed mock invoices for Company A
    const mockInvoicesCompA: InvoiceRecord[] = [
      {
        id: 'inv-a01',
        company_id: companyA,
        invoice_number: 'INV-2026-001',
        invoice_date: todayStr,
        due_date: todayStr,
        customer_id: 'cust-01',
        customer_name: 'Dhaka Packaging Ltd',
        customer_phone: '01711111111',
        items: [
          {
            id: 'item-1',
            item_description: 'Glossy Hangtags',
            quantity: 1000,
            unit: 'PCS',
            unit_price: 25,
            total_price: 25000,
            vat_percentage: 0,
          },
        ],
        subtotal: 25000,
        discount_amount: 0,
        vat_percentage: 0,
        vat_amount: 0,
        grand_total: 25000,
        paid_amount: 0,
        due_amount: 25000,
        write_off_amount: 0,
        status: 'unpaid',
        invoice_type: 'sales_invoice',
        salesperson_id: 'sales-shakil',
        salesperson_name: 'Shakil Ahmed',
        created_by_name: 'Cashier Shamol',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'inv-a02',
        company_id: companyA,
        invoice_number: 'INV-2026-002',
        invoice_date: daysAgo(5),
        due_date: daysAgo(4), // 4 days overdue -> 1-7 days bucket
        customer_id: 'cust-01',
        customer_name: 'Dhaka Packaging Ltd',
        customer_phone: '01711111111',
        items: [],
        subtotal: 75000,
        discount_amount: 0,
        vat_percentage: 0,
        vat_amount: 0,
        grand_total: 75000,
        paid_amount: 0,
        due_amount: 75000,
        write_off_amount: 0,
        status: 'overdue',
        invoice_type: 'sales_invoice',
        salesperson_id: 'sales-shakil',
        salesperson_name: 'Shakil Ahmed',
        created_by_name: 'Cashier Shamol',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'inv-a03',
        company_id: companyA,
        invoice_number: 'INV-2026-003',
        invoice_date: daysAgo(20),
        due_date: daysAgo(15), // 15 days overdue -> 8-30 days bucket
        customer_id: 'cust-02',
        customer_name: 'Chittagong Prints & Co',
        customer_phone: '01822222222',
        items: [],
        subtotal: 120000,
        discount_amount: 0,
        vat_percentage: 0,
        vat_amount: 0,
        grand_total: 120000,
        paid_amount: 20000,
        due_amount: 100000,
        write_off_amount: 0,
        status: 'partially_paid',
        invoice_type: 'sales_invoice',
        salesperson_id: 'sales-rahim',
        salesperson_name: 'Rahim Khan',
        created_by_name: 'Cashier Shamol',
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'inv-a04',
        company_id: companyA,
        invoice_number: 'INV-2026-004',
        invoice_date: daysAgo(45),
        due_date: daysAgo(40), // 40 days overdue -> 31-60 days bucket
        customer_id: 'cust-02',
        customer_name: 'Chittagong Prints & Co',
        customer_phone: '01822222222',
        items: [],
        subtotal: 200000,
        discount_amount: 0,
        vat_percentage: 0,
        vat_amount: 0,
        grand_total: 200000,
        paid_amount: 0,
        due_amount: 200000,
        write_off_amount: 0,
        status: 'overdue',
        invoice_type: 'sales_invoice',
        salesperson_id: 'sales-rahim',
        salesperson_name: 'Rahim Khan',
        created_by_name: 'Cashier Shamol',
        created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    // Seed mock invoices for Company B (Multi-tenant isolation)
    const mockInvoicesCompB: InvoiceRecord[] = [
      {
        id: 'inv-b01',
        company_id: companyB,
        invoice_number: 'INV-B-001',
        invoice_date: todayStr,
        due_date: todayStr,
        customer_id: 'cust-b01',
        customer_name: 'Sylhet Graphics',
        customer_phone: '01933333333',
        items: [],
        subtotal: 40000,
        discount_amount: 0,
        vat_percentage: 0,
        vat_amount: 0,
        grand_total: 40000,
        paid_amount: 0,
        due_amount: 40000,
        write_off_amount: 0,
        status: 'unpaid',
        invoice_type: 'sales_invoice',
        salesperson_id: 'sales-tanvir',
        salesperson_name: 'Tanvir Hossain',
        created_by_name: 'Cashier Shamol',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [...mockInvoicesCompA, ...mockInvoicesCompB])

    // Seed mock payment for Company A (Received today)
    const mockPayments: PaymentRecord[] = [
      {
        id: 'pay-001',
        company_id: companyA,
        receipt_number: 'MR-2026-001',
        customer_id: 'cust-02',
        customer_name: 'Chittagong Prints & Co',
        payment_date: todayStr,
        payment_type: 'due_payment',
        payment_method: 'bkash',
        amount: 20000,
        mfs_transaction_id: 'TRX-BK-99182',
        received_by_name: 'Cashier Shamol',
        allocations: [
          {
            id: 'alloc-1',
            payment_id: 'pay-001',
            invoice_id: 'inv-a03',
            invoice_number: 'INV-2026-003',
            allocated_amount: 20000,
            created_at: new Date().toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
      },
    ]

    PrintERPDataStore.set(STORAGE_KEYS.PAYMENTS, mockPayments)
  })

  test('1. Financial Metrics & Period Calculations: Accurately separates Sales from Collection', async () => {
    const overview = await BillingService.getBillingOverview(companyA, 'today')

    // Today's Sales = inv-a01 = 25,000
    assert.strictEqual(overview.metrics.salesAmount, 25000)
    // Today's Collection = pay-001 = 20,000
    assert.strictEqual(overview.metrics.collectionAmount, 20000)
    // Due Today = inv-a01 = 25,000
    assert.strictEqual(overview.metrics.dueTodayAmount, 25000)
    // Overdue = inv-a02 (75,000) + inv-a03 (100,000) + inv-a04 (200,000) = 375,000
    assert.strictEqual(overview.metrics.overdueAmount, 375000)
    // Total Receivable = 25,000 + 75,000 + 100,000 + 200,000 = 400,000
    assert.strictEqual(overview.metrics.totalReceivables, 400000)
    // Collection rate = 20,000 / 25,000 * 100 = 80%
    assert.strictEqual(overview.metrics.collectionRate, 80)
  })

  test('2. Collection Priority Classification: Correctly groups Due Today, Overdue, High Value Due, Near Credit Limit', async () => {
    const overview = await BillingService.getBillingOverview(companyA, 'today')
    const priority = overview.priorityItems

    assert.ok(priority.length >= 1, 'Should have priority items')
    const dueToday = priority.filter(p => p.priorityReason === 'due_today')
    assert.ok(dueToday.length >= 1, 'Should flag due today invoice')
    assert.strictEqual(dueToday[0].invoiceNumber, 'INV-2026-001')

    const overdue = priority.filter(p => p.priorityReason === 'overdue')
    assert.ok(overdue.length >= 1, 'Should flag overdue invoices')
    assert.ok(priority.some(p => p.invoiceNumber === 'INV-2026-004' && p.dueAmount >= 25000), 'Should contain high value overdue invoice')
  })

  test('3. Multi-Invoice Payment Allocation (Auto FIFO): Distributes payment chronologically to oldest invoices', async () => {
    const result = await BillingService.recordMultiInvoicePayment({
      companyId: companyA,
      customerId: 'cust-01',
      customerName: 'Dhaka Packaging Ltd',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'bank',
      amount: 80000,
      bankName: 'City Bank PLC',
      receivedByName: 'Cashier Shamol',
      // No explicit allocations -> should apply Auto FIFO
    })

    assert.ok(result, 'Payment record should be created')
    assert.strictEqual(result.amount, 80000)
    assert.strictEqual(result.allocations?.length, 2)

    // Oldest invoice (inv-a02, due 75,000) should be fully settled first
    const allocInv2 = result.allocations?.find(a => a.invoice_id === 'inv-a02')
    assert.strictEqual(allocInv2?.allocated_amount, 75000)

    // Newer invoice (inv-a01, due 25,000) should receive remaining 5,000
    const allocInv1 = result.allocations?.find(a => a.invoice_id === 'inv-a01')
    assert.strictEqual(allocInv1?.allocated_amount, 5000)

    // Verify updated invoices in store
    const updatedInvoices = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES)
    const inv2 = updatedInvoices.find(i => i.id === 'inv-a02')
    assert.strictEqual(inv2?.paid_amount, 75000)
    assert.strictEqual(inv2?.due_amount, 0)
    assert.strictEqual(inv2?.status, 'paid')

    const inv1 = updatedInvoices.find(i => i.id === 'inv-a01')
    assert.strictEqual(inv1?.paid_amount, 5000)
    assert.strictEqual(inv1?.due_amount, 20000)
    assert.strictEqual(inv1?.status, 'partially_paid')
  })

  test('4. Multi-Invoice Payment Allocation (Custom Split): Applies explicit line allocations', async () => {
    const result = await BillingService.recordMultiInvoicePayment({
      companyId: companyA,
      customerId: 'cust-02',
      customerName: 'Chittagong Prints & Co',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'nagad',
      amount: 60000,
      mfsTransactionId: 'NGD-99120',
      receivedByName: 'Accountant Shamol',
      allocations: [
        { invoiceId: 'inv-a03', amount: 40000 },
        { invoiceId: 'inv-a04', amount: 20000 },
      ],
    })

    assert.strictEqual(result.amount, 60000)
    assert.strictEqual(result.payment_method, 'nagad')

    const updatedInvoices = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES)
    const inv3 = updatedInvoices.find(i => i.id === 'inv-a03')
    // Was 20k paid before, now +40k = 60k paid out of 120k grand total -> 60k due
    assert.strictEqual(inv3?.paid_amount, 60000)
    assert.strictEqual(inv3?.due_amount, 60000)
    assert.strictEqual(inv3?.status, 'partially_paid')

    const inv4 = updatedInvoices.find(i => i.id === 'inv-a04')
    // Was 0 paid, now 20k paid -> 180k due
    assert.strictEqual(inv4?.paid_amount, 20000)
    assert.strictEqual(inv4?.due_amount, 180000)
    assert.strictEqual(inv4?.status, 'partially_paid')
  })

  test('5. Customer Credit Limit Control: Detects credit limit breach and returns warning details', async () => {
    // cust-01: current_outstanding = 100,000, credit_limit = 120,000, available = 20,000
    // Test a new invoice of 35,000 -> Exceeds credit limit by 15,000
    const warning = await BillingService.checkCustomerCreditLimit(companyA, 'cust-01', 35000)
    assert.ok(warning, 'Should return credit limit warning')
    assert.strictEqual(warning.isExceeded, true)
    assert.strictEqual(warning.currentOutstanding, 100000)
    assert.strictEqual(warning.creditLimit, 120000)
    assert.strictEqual(warning.projectedOutstanding, 135000)
    assert.strictEqual(warning.exceededBy, 15000)

    // Test a new invoice of 10,000 -> Within credit limit
    const noWarning = await BillingService.checkCustomerCreditLimit(companyA, 'cust-01', 10000)
    assert.ok(noWarning)
    assert.strictEqual(noWarning.isExceeded, false)
    assert.strictEqual(noWarning.exceededBy, 0)
  })

  test('6. Receivables Aging Buckets: Categorizes customer debts into the 6 standard aging tiers', async () => {
    const aging = await BillingService.getReceivablesAging(companyA)

    assert.ok(aging.buckets, 'Aging buckets must exist')
    // Find buckets
    const current = aging.buckets.find(b => b.bucket === 'current')
    const d1_7 = aging.buckets.find(b => b.bucket === '1_7')
    const d8_30 = aging.buckets.find(b => b.bucket === '8_30')
    const d31_60 = aging.buckets.find(b => b.bucket === '31_60')
    const d61_90 = aging.buckets.find(b => b.bucket === '61_90')
    const d90Plus = aging.buckets.find(b => b.bucket === '90_plus')

    // inv-a01: 0 days overdue -> current (25,000)
    assert.strictEqual(current?.amount, 25000)
    // inv-a02: 4 days overdue -> 1-7 days (75,000)
    assert.strictEqual(d1_7?.amount, 75000)
    // inv-a03: 15 days overdue -> 8-30 days (100,000)
    assert.strictEqual(d8_30?.amount, 100000)
    // inv-a04: 40 days overdue -> 31-60 days (200,000)
    assert.strictEqual(d31_60?.amount, 200000)
    // 61-90 and 90+ are 0 in our seed
    assert.strictEqual(d61_90?.amount, 0)
    assert.strictEqual(d90Plus?.amount, 0)
    assert.strictEqual(aging.totalReceivables, 400000)

    // Customer level breakdown
    assert.strictEqual(aging.customerAging.length, 2)
    const dhakaCust = aging.customerAging.find(c => c.customerId === 'cust-01')
    assert.ok(dhakaCust)
    assert.strictEqual(dhakaCust.current, 25000)
    assert.strictEqual(dhakaCust.days1_7, 75000)
    assert.strictEqual(dhakaCust.currentOutstanding, 100000)
  })

  test('7. Salesperson Collection Responsibility: Aggregates outstanding collections by salesperson', async () => {
    const overview = await BillingService.getBillingOverview(companyA, 'today')
    const salesStats = overview.salespersonStats

    assert.strictEqual(salesStats.length, 2)
    const shakil = salesStats.find(s => s.salespersonName === 'Shakil Ahmed')
    assert.ok(shakil)
    // Shakil is responsible for inv-a01 (25k due) + inv-a02 (75k due) = 100k total outstanding
    assert.strictEqual(shakil.outstandingDue, 100000)
    assert.strictEqual(shakil.overdueAmount, 75000)

    const rahim = salesStats.find(s => s.salespersonName === 'Rahim Khan')
    assert.ok(rahim)
    // Rahim is responsible for inv-a03 (100k due) + inv-a04 (200k due) = 300k total outstanding
    assert.strictEqual(rahim.outstandingDue, 300000)
    assert.strictEqual(rahim.overdueAmount, 300000)
  })

  test('8. Non-Destructive Financial Write-Off: Reduces debt balance with audit logging without erasing invoice record', async () => {
    // Write off 10,000 on inv-a01 (which has 25,000 due)
    const writeOffRecord = await BillingService.recordWriteOff({
      company_id: companyA,
      invoice_id: 'inv-a01',
      amount: 10000,
      reason: 'Authorized discount settlement for minor print shade variance',
      authorized_by_name: 'Managing Director Shamol',
    })

    assert.strictEqual(writeOffRecord.amount, 10000)
    assert.strictEqual(writeOffRecord.authorized_by_name, 'Managing Director Shamol')

    const updatedInvoices = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES)
    const inv1 = updatedInvoices.find(i => i.id === 'inv-a01')
    assert.strictEqual(inv1?.write_off_amount, 10000)
    // Due balance should reduce from 25,000 to 15,000
    assert.strictEqual(inv1?.due_amount, 15000)
    // Grand total should remain intact for historical accounting
    assert.strictEqual(inv1?.grand_total, 25000)
  })

  test('9. Safe Invoice Cancellation: Reconciles customer debt balance without deleting invoice record', async () => {
    const success = await BillingRepository.cancelInvoice(
      'inv-a01',
      'Client cancelled job prior to final material preparation',
      'Managing Director Shamol',
      companyA
    )

    assert.strictEqual(success, true)
    const updatedInvoices = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES)
    const inv1 = updatedInvoices.find(i => i.id === 'inv-a01')
    assert.strictEqual(inv1?.status, 'cancelled')
    assert.strictEqual(inv1?.due_amount, 0)
    assert.strictEqual(inv1?.grand_total, 25000) // gross historical number preserved
  })

  test('10. Multi-Tenant Boundary Isolation: Strict partition prevents cross-tenant access', async () => {
    // Company A overview should not include Company B's invoice or payments
    const invoicesA = await BillingService.getInvoices(companyA)
    const invoicesB = await BillingService.getInvoices(companyB)

    assert.strictEqual(invoicesA.some(i => i.company_id === companyB), false)
    assert.strictEqual(invoicesB.some(i => i.company_id === companyA), false)
    assert.strictEqual(invoicesA.length, 4)
    assert.strictEqual(invoicesB.length, 1)
    assert.strictEqual(invoicesB[0].invoice_number, 'INV-B-001')

    // Company B overview should only reflect Company B numbers
    const overviewB = await BillingService.getBillingOverview(companyB, 'today')
    assert.strictEqual(overviewB.metrics.salesAmount, 40000)
    assert.strictEqual(overviewB.metrics.totalReceivables, 40000)
  })
})
