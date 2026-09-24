import test from 'node:test'
import assert from 'node:assert/strict'
import { QuotationRepository } from '../../lib/repositories/quotation.repository'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store'
import { QuotationRecord } from '../../types/quotation.types'

test('Quotation to Job Order: verifies order, job ticket, and cross-partition sync for Commercial Orders & Job Hub', async (t) => {
  const companyId = 'comp-sync-test'

  // 1. Create Quotation in DataStore
  const quote: QuotationRecord = {
    id: `quo-sync-${Date.now()}`,
    company_id: companyId,
    quotation_number: `QUO-${Date.now().toString().slice(-5)}`,
    customer_id: 'cust-sync-101',
    customer_name: 'Metro Billboard Ltd',
    customer_phone: '01712345678',
    status: 'approved',
    quotation_date: '2026-09-25',
    subtotal: 15000,
    discount_amount: 1000,
    vat_rate: 0,
    vat_amount: 0,
    grand_total: 14000,
    total_cost: 9000,
    margin_percent: 35.7,
    advance_amount: 7000,
    advance_percentage: 50,
    language_mode: 'en',
    salesperson_name: 'Imran Hossain',
    items: [
      {
        id: 'it-1',
        description: 'Panaflex Outdoor Banner 20x10',
        width: 20,
        height: 10,
        dimension_unit: 'ft',
        area_sft: 200,
        quantity: 1,
        unit: 'sft',
        unit_rate: 75,
        item_total: 15000,
        material_spec: 'Star Blackout Panaflex 440gsm',
        artwork_required: false,
        installation_required: true,
        material_cost: 6000,
        labor_cost: 1500,
        finishing_cost: 500,
        installation_cost: 1000,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  PrintERPDataStore.addItem(STORAGE_KEYS.QUOTATIONS, quote)
  PrintERPDataStore.addItem(STORAGE_KEYS.QUOTATIONS, quote, companyId)

  await t.test('converts quotation and provisions sales order, job ticket, and production job', async () => {
    const result = await QuotationRepository.convertQuotationToJobOrder(quote.id, companyId, {
      createdByName: 'Imran Hossain',
      advanceAmount: 7000,
    })

    assert.ok(result, 'Conversion result should be defined')
    assert.ok(result.order_number, 'Sales order number should be assigned')
    assert.match(result.order_number, /^ORD-/)
    assert.equal(result.customer_name, 'Metro Billboard Ltd')
    assert.equal(result.final_price, 14000)
    assert.equal(result.advance_amount, 7000)
    assert.equal(result.due_amount, 7000)

    // Check quotation status updated to converted
    const updatedQuote = PrintERPDataStore.findItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, quote.id)
    assert.equal(updatedQuote?.status, 'converted')
    assert.equal(updatedQuote?.converted_order_id, result.order_number)

    // Check Job Order ticket created
    const jobOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.JOB_ORDERS) || []
    const matchingJob = jobOrders.find((j) => j.order_id === result.id || j.order_number === result.order_number)
    assert.ok(matchingJob, 'Linked Job Order ticket must exist in DataStore')
    assert.match(matchingJob.job_number, /^JOB-/)
    assert.equal(matchingJob.customer_name, 'Metro Billboard Ltd')

    // Check Sales Order in DataStore
    const orders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
    const matchingOrder = orders.find((o) => o.id === result.id || o.order_number === result.order_number)
    assert.ok(matchingOrder, 'Sales Order must exist in DataStore for Commercial Orders & Job Hub')
    assert.equal(matchingOrder.quotation_id, quote.id)
    assert.equal(matchingOrder.items.length, 1)
    assert.equal(matchingOrder.items[0].unit_price, 75, 'Quoted unit rate must remain immutable')
  })
})
