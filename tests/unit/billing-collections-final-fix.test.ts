import { describe, it } from 'node:test'
import assert from 'node:assert'
import { BillingRepository, getTodayDateString } from '../../lib/repositories/billing.repository.ts'
import { BillingService } from '../../services/billing.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { formatBDT, numberToWordsBDT } from '../../lib/formatters.ts'

describe('Billing & Collections Final Fix - Forensic Suite', () => {
  const companyId = 'comp-test-billing-final-fix'

  it('1. KPI Calculations - Reconciles Sales, Collected, Outstanding Due, and Overdue', async () => {
    // Reset DataStore for isolated test run
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.PAYMENTS, [])

    const todayStr = getTodayDateString()
    const pastDueDate = '2026-01-01'

    // Scenario A: Create invoice ৳10,000
    const inv1 = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-1',
      customer_name: 'Forensic Test Customer',
      customer_phone: '01700000001',
      invoice_number: 'INV-TEST-001',
      invoice_type: 'sales_invoice',
      invoice_date: todayStr,
      due_date: todayStr,
      subtotal: 10000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 10000,
      paid_amount: 0,
      due_amount: 10000,
      payment_method: 'cash',
      status: 'unpaid',
      created_by_name: 'Auditor',
    } as any)

    let overview = await BillingRepository.getBillingOverview(companyId, 'today')
    assert.strictEqual(overview.metrics.salesAmount, 10000, 'Total Invoiced must be 10000')
    assert.strictEqual(overview.metrics.salesCount, 1, '1 bill generated')
    assert.strictEqual(overview.metrics.collectionAmount, 0, 'Collected must be 0')
    assert.strictEqual(overview.metrics.outstandingDue, 10000, 'Outstanding Due must be 10000')
    assert.strictEqual(overview.metrics.totalReceivables, 10000, 'Total Receivable must reconcile with outstanding due')
    assert.strictEqual(overview.metrics.collectionRate, 0, 'Collection Rate must be 0% when 0 collected')

    // Scenario B: Receive Partial Payment ৳5,000
    await BillingService.recordPayment({
      companyId,
      customerId: 'cust-1',
      customerName: 'Forensic Test Customer',
      amount: 5000,
      paymentMethod: 'bkash',
      receivedByName: 'Auditor Cashier',
      notes: 'Partial payment on INV-TEST-001',
    })

    overview = await BillingRepository.getBillingOverview(companyId, 'today')
    assert.strictEqual(overview.metrics.salesAmount, 10000)
    assert.strictEqual(overview.metrics.collectionAmount, 5000, 'Collected must be 5000')
    assert.strictEqual(overview.metrics.outstandingDue, 5000, 'Outstanding Due must be 5000')
    assert.strictEqual(overview.metrics.collectionRate, 50, 'Collection Rate must be 50%')

    // Scenario C: Receive remaining ৳5,000
    await BillingService.recordPayment({
      companyId,
      customerId: 'cust-1',
      customerName: 'Forensic Test Customer',
      amount: 5000,
      paymentMethod: 'cash',
      receivedByName: 'Auditor Cashier',
      notes: 'Final settlement on INV-TEST-001',
    })

    overview = await BillingRepository.getBillingOverview(companyId, 'today')
    assert.strictEqual(overview.metrics.collectionAmount, 10000, 'Collected must be 10000')
    assert.strictEqual(overview.metrics.outstandingDue, 0, 'Outstanding Due must be 0')
    assert.strictEqual(overview.metrics.collectionRate, 100, 'Collection Rate must be 100%')

    // Scenario D: Overdue Invoice
    await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-2',
      customer_name: 'Overdue Customer',
      customer_phone: '01700000002',
      invoice_number: 'INV-TEST-002',
      invoice_type: 'sales_invoice',
      invoice_date: pastDueDate,
      due_date: pastDueDate,
      subtotal: 8000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 8000,
      paid_amount: 0,
      due_amount: 8000,
      payment_method: 'bank_transfer',
      status: 'unpaid',
      created_by_name: 'Auditor',
    } as any)

    overview = await BillingRepository.getBillingOverview(companyId, 'today')
    assert.strictEqual(overview.metrics.overdueAmount, 8000, 'Overdue Amount must be 8000')
    assert.strictEqual(overview.metrics.overdueCount, 1, '1 overdue bill')
    assert.strictEqual(overview.metrics.outstandingDue, 8000, 'Outstanding Due must be 8000')

    // Scenario E: Zero Period Sales with Payments -> Collection Rate must be 0% (not 100%)
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.PAYMENTS, [
      {
        id: 'pay-past',
        company_id: companyId,
        customer_id: 'cust-1',
        customer_name: 'Old Customer',
        amount: 10000,
        payment_date: todayStr,
        payment_method: 'cash',
        receipt_number: 'PAY-0001',
        created_at: new Date().toISOString(),
      } as any,
    ])

    overview = await BillingRepository.getBillingOverview(companyId, 'today')
    assert.strictEqual(overview.metrics.salesAmount, 0, 'Zero sales today')
    assert.strictEqual(overview.metrics.collectionAmount, 10000, 'Collected 10000 today')
    assert.strictEqual(overview.metrics.collectionRate, 0, 'Collection rate must be 0% when period sales are 0')
  })

  it('2. Invoice Deletion Lifecycle & Protection Rules', async () => {
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
    const todayStr = getTodayDateString()

    // Create Draft / Unpaid invoice
    const unpaidInv = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-del-1',
      customer_name: 'Delete Target Customer',
      customer_phone: '01800000001',
      invoice_number: 'INV-DEL-001',
      invoice_type: 'sales_invoice',
      invoice_date: todayStr,
      due_date: todayStr,
      subtotal: 4000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 4000,
      paid_amount: 0,
      due_amount: 4000,
      payment_method: 'cash',
      status: 'unpaid',
      created_by_name: 'Auditor',
    } as any)

    // Unpaid invoice can be deleted
    const deleteSuccess = await BillingService.deleteInvoice(unpaidInv.id, companyId, 'Audit Admin')
    assert.strictEqual(deleteSuccess, true, 'Unpaid invoice deletion should succeed')

    const afterDelInvoices = await BillingRepository.getInvoices(companyId)
    const delTarget = afterDelInvoices.find((i) => i.id === unpaidInv.id)
    assert.strictEqual(delTarget?.status, 'cancelled', 'Status should transition to cancelled')
    assert.strictEqual(delTarget?.due_amount, 0, 'Due amount should be zeroed')

    // Create Paid invoice -> Deletion must be blocked
    const paidInv = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-del-2',
      customer_name: 'Paid Target Customer',
      customer_phone: '01800000002',
      invoice_number: 'INV-DEL-002',
      invoice_type: 'sales_invoice',
      invoice_date: todayStr,
      due_date: todayStr,
      subtotal: 6000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 6000,
      paid_amount: 6000,
      due_amount: 0,
      payment_method: 'cash',
      status: 'paid',
      created_by_name: 'Auditor',
    } as any)

    await assert.rejects(
      async () => {
        await BillingService.deleteInvoice(paidInv.id, companyId, 'Audit Admin')
      },
      /Paid invoices cannot be cancelled directly/i,
      'Paid invoice deletion must be rejected'
    )

    // Create Partially Paid invoice -> Deletion must be blocked
    const partialInv = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: 'cust-del-3',
      customer_name: 'Partial Target Customer',
      customer_phone: '01800000003',
      invoice_number: 'INV-DEL-003',
      invoice_type: 'sales_invoice',
      invoice_date: todayStr,
      due_date: todayStr,
      subtotal: 6000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 6000,
      paid_amount: 2000,
      due_amount: 4000,
      payment_method: 'cash',
      status: 'partially_paid',
      created_by_name: 'Auditor',
    } as any)

    await assert.rejects(
      async () => {
        await BillingService.deleteInvoice(partialInv.id, companyId, 'Audit Admin')
      },
      /Partially paid invoices/i,
      'Partially paid invoice deletion must be rejected'
    )
  })

  it('3. Money Receipt Formatting & BDT Grouping (Global BDT Decimal Display Rule)', () => {
    assert.strictEqual(formatBDT(5000), '৳\u00A05,000')
    assert.strictEqual(formatBDT(10000), '৳\u00A010,000')
    assert.strictEqual(formatBDT(125000), '৳\u00A01,25,000')
    assert.strictEqual(formatBDT(1000000), '৳\u00A010,00,000')
    assert.strictEqual(formatBDT(5000.50), '৳\u00A05,000.50')
    assert.strictEqual(formatBDT(5000.25), '৳\u00A05,000.25')
    assert.strictEqual(numberToWordsBDT(5000), 'Five Thousand Taka Only')
    assert.strictEqual(numberToWordsBDT(5000.50), 'Five Thousand Taka and Fifty Paisa Only')
    assert.strictEqual(numberToWordsBDT(125000), 'One Lakh Twenty Five Thousand Taka Only')
    assert.strictEqual(numberToWordsBDT(125000.75), 'One Lakh Twenty Five Thousand Taka and Seventy Five Paisa Only')
  })
})
