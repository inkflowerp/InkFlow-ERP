import { describe, it } from 'node:test'
import assert from 'node:assert'
import { CanonicalFinance } from '../../lib/finance/canonical-finance.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { PrintFlowDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { InvoiceRecord } from '../../types/billing.types.ts'

describe('Invoice Partially Paid Status Resolution', () => {
  it('1. CanonicalFinance correctly evaluates partially_paid when paid > 0 and due > 0', () => {
    const invoice: InvoiceRecord = {
      id: 'inv-test-partial-1',
      company_id: 'comp-test',
      invoice_number: 'INV-247408',
      invoice_type: 'sales_invoice',
      invoice_date: '2026-10-09',
      due_date: '2026-10-12',
      status: 'unpaid',
      subtotal: 6038,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 6038,
      paid_amount: 300,
      due_amount: 5738,
      items: [],
      payments: [],
      write_offs: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const resolvedStatus = CanonicalFinance.evaluateInvoiceStatus(invoice, '2026-10-10')
    assert.strictEqual(resolvedStatus, 'partially_paid', 'Must evaluate to partially_paid despite raw unpaid status')
  })

  it('2. BillingRepository.getInvoiceById normalizes status to partially_paid for cached/local invoice', async () => {
    const testInv: InvoiceRecord = {
      id: 'inv-test-partial-repo',
      company_id: 'comp-test-billing',
      invoice_number: 'INV-TEST-PARTIAL',
      invoice_type: 'sales_invoice',
      invoice_date: '2026-10-09',
      due_date: '2026-10-15',
      status: 'unpaid' as any,
      subtotal: 5000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 5000,
      paid_amount: 1500,
      due_amount: 3500,
      items: [],
      payments: [],
      write_offs: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintFlowDataStore.addItem(STORAGE_KEYS.INVOICES, testInv, 'comp-test-billing')

    const fetched = await BillingRepository.getInvoiceById('INV-TEST-PARTIAL', 'comp-test-billing')
    assert.ok(fetched, 'Invoice must be found')
    assert.strictEqual(fetched.status, 'partially_paid', 'Status must be canonically normalized to partially_paid')
  })

  it('3. createSalesOrderWithIntegrations sets status to partially_paid when advance is paid', () => {
    const newOrder = PrintFlowDataStore.createSalesOrderWithIntegrations({
      company_id: 'comp-test-so',
      customer_name: 'Test Customer',
      customer_phone: '01700000000',
      order_date: '2026-10-10',
      delivery_date: '2026-10-15',
      subtotal: 10000,
      discount_amount: 0,
      vat_amount: 0,
      final_price: 10000,
      advance_paid: 2000,
      due_amount: 8000,
      items: [],
    })

    assert.ok(newOrder, 'Order created')
    const allInvs = PrintFlowDataStore.getAll<InvoiceRecord>(STORAGE_KEYS.INVOICES)
    const matchingInv = allInvs.find((inv) => inv.sales_order_id === newOrder.id)
    assert.ok(matchingInv, 'Linked invoice must be created')
    assert.strictEqual(matchingInv.paid_amount, 2000)
    assert.strictEqual(matchingInv.due_amount, 8000)
    assert.strictEqual(matchingInv.status, 'partially_paid', 'Invoice created from sales order with advance must have status partially_paid')
  })
})
