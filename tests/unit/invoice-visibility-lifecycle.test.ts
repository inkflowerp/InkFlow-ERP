import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import {
  BillingRepository,
  getTodayDateString,
  isValidUUID,
  generateUUID,
} from '../../lib/repositories/billing.repository.ts'
import { BillingService } from '../../services/billing.service.ts'
import { SearchService } from '../../services/search.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { InvoiceRecord, PaymentRecord } from '../../types/billing.types.ts'
import type { CustomerRecord } from '../../types/crm.types.ts'

describe('Invoice Visibility & Full Lifecycle Forensic Tests', () => {
  const companyAlpha = 'comp-visibility-alpha'
  const companyBeta = 'comp-visibility-beta'
  const todayStr = getTodayDateString()

  beforeEach(() => {
    PrintERPDataStore.clear()

    // Seed customers for companyAlpha
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [
      {
        id: '11111111-1111-4111-a111-111111111111',
        company_id: companyAlpha,
        name: 'Dhaka Digital Media',
        mobile: '01700000001',
        company_name: 'Dhaka Media Ltd',
        total_invoiced_amount: 0,
        total_paid_amount: 0,
        total_due_balance: 0,
        credit_limit: 100000,
      },
    ])
  })

  test('1. Invoice creation generates valid RFC4122 UUID and sequential invoice number', async () => {
    const created = await BillingRepository.createInvoice({
      company_id: companyAlpha,
      customer_id: '11111111-1111-4111-a111-111111111111',
      customer_name: 'Dhaka Digital Media',
      customer_phone: '01700000001',
      subtotal: 10000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 10000,
      paid_amount: 0,
      due_amount: 10000,
      invoice_date: todayStr,
      due_date: todayStr,
      created_by_name: 'System Tester',
      items: [
        {
          id: generateUUID(),
          invoice_id: '',
          item_description: 'Vinyl Banner 10x4 ft',
          quantity: 2,
          unit: 'pcs',
          unit_price: 5000,
          vat_percentage: 0,
          total_price: 10000,
        },
      ],
    })

    assert.ok(created.id, 'Invoice ID must be present')
    assert.ok(isValidUUID(created.id), `Invoice ID must be a valid UUID v4, got: ${created.id}`)
    assert.ok(!created.id.startsWith('inv-'), 'Invoice ID must not use legacy inv- timestamp format')
    assert.ok(created.invoice_number.startsWith('INV-'), 'Invoice number must follow sequence format')
    assert.strictEqual(created.items.length, 1)
  })

  test('2. Created invoice appears immediately in getInvoices without browser reload', async () => {
    const created = await BillingRepository.createInvoice({
      company_id: companyAlpha,
      customer_id: '11111111-1111-4111-a111-111111111111',
      customer_name: 'Dhaka Digital Media',
      customer_phone: '01700000001',
      subtotal: 25000,
      grand_total: 25000,
      paid_amount: 5000,
      due_amount: 20000,
      invoice_date: todayStr,
      due_date: todayStr,
      created_by_name: 'System Tester',
      items: [
        {
          id: generateUUID(),
          invoice_id: '',
          item_description: 'Offset Brochure 1000 copies',
          quantity: 1000,
          unit: 'pcs',
          unit_price: 25,
          vat_percentage: 0,
          total_price: 25000,
        },
      ],
    })

    // Fetch invoices immediately
    const list = await BillingService.getInvoices(companyAlpha)
    assert.ok(list.length >= 1, 'Invoices list must return the newly created invoice')
    const found = list.find((i) => i.id === created.id)
    assert.ok(found, 'Created invoice must be found in directory')
    assert.strictEqual(found?.invoice_number, created.invoice_number)
    assert.strictEqual(found?.due_amount, 20000)
    assert.strictEqual(found?.status, 'partially_paid')
  })

  test('3. Created invoice with null customer_id (walk-in customer) persists and is visible', async () => {
    const created = await BillingRepository.createInvoice({
      company_id: companyAlpha,
      customer_id: null as any,
      customer_name: 'Cash Walk-in Client',
      customer_phone: '01999999999',
      subtotal: 1500,
      grand_total: 1500,
      paid_amount: 1500,
      due_amount: 0,
      invoice_date: todayStr,
      due_date: todayStr,
      created_by_name: 'Cash Counter',
      items: [
        {
          id: generateUUID(),
          invoice_id: '',
          item_description: 'Express Visiting Cards',
          quantity: 1,
          unit: 'box',
          unit_price: 1500,
          vat_percentage: 0,
          total_price: 1500,
        },
      ],
    })

    assert.ok(isValidUUID(created.id), 'Walk-in invoice must have valid UUID')
    assert.strictEqual(created.customer_id, null)
    assert.strictEqual(created.status, 'paid')

    const direct = await BillingService.getInvoiceById(created.id, companyAlpha)
    assert.ok(direct, 'Walk-in invoice must be retrievable by ID')
    assert.strictEqual(direct?.customer_name, 'Cash Walk-in Client')
  })

  test('4. Global search immediately indexes newly created invoice', async () => {
    const created = await BillingRepository.createInvoice({
      company_id: companyAlpha,
      customer_id: '11111111-1111-4111-a111-111111111111',
      customer_name: 'Dhaka Digital Media',
      customer_phone: '01700000001',
      subtotal: 45000,
      grand_total: 45000,
      paid_amount: 0,
      due_amount: 45000,
      invoice_date: todayStr,
      due_date: todayStr,
      created_by_name: 'Executive',
      items: [],
    })

    const searchResults = SearchService.search(companyAlpha, created.invoice_number)
    const invoiceResults = searchResults.invoice || []
    const matched = invoiceResults.find((r) => r.id === created.id)
    assert.ok(matched, `Search must immediately find invoice by invoice_number: ${created.invoice_number}`)
  })

  test('5. Billing overview metrics immediately include newly created invoice', async () => {
    const created = await BillingRepository.createInvoice({
      company_id: companyAlpha,
      customer_id: '11111111-1111-4111-a111-111111111111',
      customer_name: 'Dhaka Digital Media',
      customer_phone: '01700000001',
      subtotal: 50000,
      grand_total: 50000,
      paid_amount: 10000,
      due_amount: 40000,
      invoice_date: todayStr,
      due_date: todayStr,
      created_by_name: 'Executive',
      items: [],
    })

    const overview = await BillingService.getBillingOverview(companyAlpha, 'today')
    assert.ok(overview.metrics.salesAmount >= 50000, 'Today sales metric must include new invoice total')
    assert.ok(overview.metrics.totalReceivables >= 40000, 'Total receivables must include invoice due')
    assert.ok(overview.metrics.salesCount >= 1, 'Total invoices count must increase')
  })

  test('6. Multi-tenant isolation: Tenant Beta cannot view Tenant Alpha invoice', async () => {
    const created = await BillingRepository.createInvoice({
      company_id: companyAlpha,
      customer_id: '11111111-1111-4111-a111-111111111111',
      customer_name: 'Dhaka Digital Media',
      customer_phone: '01700000001',
      subtotal: 12000,
      grand_total: 12000,
      paid_amount: 0,
      due_amount: 12000,
      invoice_date: todayStr,
      due_date: todayStr,
      created_by_name: 'Executive',
      items: [],
    })

    // Tenant Beta queries invoices list
    const betaList = await BillingService.getInvoices(companyBeta)
    const betaFoundInList = betaList.find((i) => i.id === created.id)
    assert.strictEqual(betaFoundInList, undefined, 'Tenant Beta must not see Tenant Alpha invoice in list')

    // Tenant Beta tries direct getInvoiceById
    const betaDirect = await BillingService.getInvoiceById(created.id, companyBeta)
    assert.strictEqual(betaDirect, null, 'Tenant Beta must not be able to fetch Tenant Alpha invoice by ID')
  })

  test('7. Payment allocation updates invoice status and due balance', async () => {
    const created = await BillingRepository.createInvoice({
      company_id: companyAlpha,
      customer_id: '11111111-1111-4111-a111-111111111111',
      customer_name: 'Dhaka Digital Media',
      customer_phone: '01700000001',
      subtotal: 30000,
      grand_total: 30000,
      paid_amount: 0,
      due_amount: 30000,
      invoice_date: todayStr,
      due_date: todayStr,
      created_by_name: 'Executive',
      items: [],
    })

    const payment = await BillingService.recordMultiInvoicePayment({
      companyId: companyAlpha,
      customerId: '11111111-1111-4111-a111-111111111111',
      customerName: 'Dhaka Digital Media',
      amount: 30000,
      receivedByName: 'Cashier',
      paymentMethod: 'bkash',
      mfsTransactionId: 'TRX998877',
      allocations: [{ invoiceId: created.id, amount: 30000 }],
    })

    assert.ok(payment.id, 'Payment must have ID')
    assert.ok(payment.receipt_number.startsWith('PAY-') || payment.receipt_number.startsWith('REC-'), 'Receipt number must follow payment document sequence')

    const updated = await BillingService.getInvoiceById(created.id, companyAlpha)
    assert.strictEqual(updated?.status, 'paid')
    assert.strictEqual(updated?.due_amount, 0)
    assert.strictEqual(updated?.paid_amount, 30000)
  })

  test('8. Write-off reduces due balance and preserves invoice history', async () => {
    const created = await BillingRepository.createInvoice({
      company_id: companyAlpha,
      customer_id: '11111111-1111-4111-a111-111111111111',
      customer_name: 'Dhaka Digital Media',
      customer_phone: '01700000001',
      subtotal: 20000,
      grand_total: 20000,
      paid_amount: 0,
      due_amount: 20000,
      invoice_date: todayStr,
      due_date: todayStr,
      created_by_name: 'Executive',
      items: [],
    })

    const writeOff = await BillingService.recordWriteOff({
      company_id: companyAlpha,
      invoice_id: created.id,
      amount: 5000,
      reason: 'Approved commercial discount waiver',
      authorized_by_name: 'Owner',
    })

    assert.ok(writeOff.id, 'Write-off record must be created')
    assert.strictEqual(writeOff.amount, 5000)

    const updated = await BillingService.getInvoiceById(created.id, companyAlpha)
    assert.strictEqual(updated?.due_amount, 15000)
    assert.strictEqual(updated?.write_off_amount, 5000)
  })

  test('9. Cancellation voids invoice due balance without deleting audit record', async () => {
    const created = await BillingRepository.createInvoice({
      company_id: companyAlpha,
      customer_id: '11111111-1111-4111-a111-111111111111',
      customer_name: 'Dhaka Digital Media',
      customer_phone: '01700000001',
      subtotal: 10000,
      grand_total: 10000,
      paid_amount: 0,
      due_amount: 10000,
      invoice_date: todayStr,
      due_date: todayStr,
      created_by_name: 'Executive',
      items: [],
    })

    const cancelled = await BillingService.cancelInvoice(
      created.id,
      'Customer cancelled order before production',
      'Owner',
      companyAlpha
    )

    assert.strictEqual(cancelled, true)

    const updated = await BillingService.getInvoiceById(created.id, companyAlpha)
    assert.strictEqual(updated?.status, 'cancelled')
    assert.strictEqual(updated?.due_amount, 0)
  })
})
