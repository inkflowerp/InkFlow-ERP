import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { getNavigationConfig } from '../../config/navigation.config.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { PrintFlowDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { InvoiceRecord } from '../../types/billing.types.ts'
import type { SalesOrderRecord, JobOrderRecord } from '../../types/order.types.ts'

const TENANT_ID = 'company-test-orders-flow'

describe('Orders & Job Flow Upgrade & Invoice Works Ingestion', () => {
  beforeEach(() => {
    PrintFlowDataStore.set(STORAGE_KEYS.INVOICES, [])
    PrintFlowDataStore.set(STORAGE_KEYS.ORDERS, [])
    PrintFlowDataStore.set(STORAGE_KEYS.JOB_ORDERS, [])
    PrintFlowDataStore.set(STORAGE_KEYS.CUSTOMERS, [])
    PrintFlowDataStore.set(STORAGE_KEYS.DELIVERY_CHALLANS, [])
  })

  it('1. Navigation config contains Orders & Jobs with bilingual titles', () => {
    const navSections = getNavigationConfig('acme-press')
    const allItems = navSections.flatMap((s) => s.items)
    const ordersItem = allItems.find((item) => item.key === 'orders')
    assert.ok(ordersItem, 'Orders item must exist in navigation config')
    assert.strictEqual(ordersItem.title, 'Orders & Jobs')
    assert.strictEqual(ordersItem.titleBn, 'কাজের অর্ডার ও জব')
    assert.strictEqual(ordersItem.href, '/orders')
  })

  it('2. Creating an invoice automatically provisions linked sales order and job orders for Orders & Job Flow', async () => {
    const invoicePayload: Partial<InvoiceRecord> = {
      id: 'inv-test-flow-001',
      company_id: TENANT_ID,
      invoice_number: 'INV-2026-9901',
      customer_id: 'cust-abc',
      customer_name: 'Apex Footwear Ltd',
      customer_phone: '01711000999',
      customer_address: 'Gulshan, Dhaka',
      invoice_date: '2026-09-21',
      due_date: '2026-09-24',
      status: 'unpaid',
      subtotal: 15000,
      grand_total: 15000,
      paid_amount: 0,
      due_amount: 15000,
      items: [
        {
          id: 'item-1',
          invoice_id: 'inv-test-flow-001',
          item_description: 'Star Flex Billboard Banner',
          dimensions_spec: '20ft × 10ft',
          quantity: 2,
          unit: 'sft',
          unit_price: 37.5,
          total_price: 15000,
          finishing: 'Eyelets every 2ft, Pipe pocket',
          workflow_routing: 'ready_production',
          material_spec: 'China Star Flex 280gsm',
        } as any,
      ],
    }

    const created = await BillingRepository.createInvoice(invoicePayload as InvoiceRecord)
    assert.ok(created, 'Invoice should be created')

    // Verify Orders Datastore contains auto-provisioned matching order
    const orders = PrintFlowDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
    const matchingOrder = orders.find(
      (o) => o.invoice_id === created.id || o.order_number === 'ORD-2026-9901' || o.invoice_number === created.invoice_number
    )
    assert.ok(matchingOrder, 'Orders & Job Flow should contain the auto-linked sales order')
    assert.strictEqual(matchingOrder.customer_name, 'Apex Footwear Ltd')
    assert.strictEqual(matchingOrder.commercial_status, 'invoice_created')
    assert.strictEqual(matchingOrder.production_gate_status, 'ready_for_production')

    // Verify Job Orders Datastore contains job tickets for the items
    const jobOrders = PrintFlowDataStore.get<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS) || []
    const matchingJob = jobOrders.find((j) => j.invoice_id === created.id || j.order_id === matchingOrder?.id)
    assert.ok(matchingJob, 'Job order should be provisioned for invoice item')
    assert.strictEqual(matchingJob.product_name, 'Star Flex Billboard Banner')
    assert.strictEqual(matchingJob.commercial_status, 'invoice_created')
    assert.strictEqual(matchingJob.production_gate_status, 'ready_for_production')
  })

  it('3. Direct Sales Order creation routes properly with specs and status', () => {
    const orderData: Partial<SalesOrderRecord> = {
      id: 'ord-test-002',
      company_id: TENANT_ID,
      order_number: 'ORD-2026-9902',
      customer_name: 'Beximco Pharma',
      customer_phone: '01811223344',
      order_date: '2026-09-21',
      delivery_date: '2026-09-25',
      priority: 'urgent',
      status: 'confirmed',
      workflow_routing: 'design_required',
      items: [
        {
          id: 'oi-1',
          item_name: 'Frosted Vinyl Glass Sticker',
          width: 8,
          height: 4,
          dimension_unit: 'ft',
          quantity: 4,
          unit: 'sft',
          material_spec: 'Avery Frosted Film',
        } as any,
      ],
    }

    const createdOrder = PrintFlowDataStore.createSalesOrderWithIntegrations(orderData)
    assert.ok(createdOrder, 'Order should be created with integrations')

    const savedOrders = PrintFlowDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
    const found = savedOrders.find((o) => o.id === 'ord-test-002')
    assert.ok(found, 'Sales order must be stored')
    assert.strictEqual(found.priority, 'urgent')
    assert.strictEqual(found.items[0].item_name, 'Frosted Vinyl Glass Sticker')
  })

  it('4. Creating an invoice for an existing order updates the order instead of creating duplicate records', async () => {
    // 1. Initial order placed via Work Order modal
    const initialOrder: Partial<SalesOrderRecord> = {
      id: 'ord-client-1727400000',
      company_id: TENANT_ID,
      order_number: 'ORD-000011',
      customer_name: 'Asif',
      customer_phone: '0155555',
      order_date: '2026-09-27',
      delivery_date: '',
      priority: 'normal',
      status: 'confirmed',
      workflow_routing: 'design_required',
      final_price: 0,
      advance_amount: 50000,
      due_amount: 0,
      items: [
        {
          id: 'item-work-1',
          item_name: 'Printing Item',
          width: 100,
          height: 100,
          dimension_unit: 'ft',
          quantity: 10,
          unit: 'pcs',
          unit_price: 0,
          total_price: 0,
        } as any,
      ],
    }

    PrintFlowDataStore.createSalesOrderWithIntegrations(initialOrder)

    // 2. Invoice created later with billing figures for ORD-000011
    const invoicePayload: Partial<InvoiceRecord> = {
      id: 'inv-test-flow-011',
      company_id: TENANT_ID,
      invoice_number: 'INV-000011',
      customer_name: 'Asif',
      customer_phone: '0155555',
      invoice_date: '2026-09-27',
      status: 'partial',
      subtotal: 2200000,
      grand_total: 2200000,
      paid_amount: 50000,
      due_amount: 2150000,
      items: [
        {
          id: 'inv-item-1',
          item_description: 'Printing Item 100000 sft',
          quantity: 10,
          unit: 'pcs',
          unit_price: 220000,
          total_price: 2200000,
          workflow_routing: 'ready_production',
        } as any,
      ],
    }

    await BillingRepository.createInvoice(invoicePayload as InvoiceRecord)

    // Verify orders store has only ONE order for ORD-000011
    const allOrders = PrintFlowDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
    const matchingOrders = allOrders.filter(
      (o) => o.order_number?.replace(/\s+/g, '').toUpperCase() === 'ORD-000011'
    )

    assert.strictEqual(matchingOrders.length, 1, 'Should only have 1 order record for ORD-000011, no duplicates')
    const unified = matchingOrders[0]
    assert.strictEqual(unified.invoice_number, 'INV-000011', 'Should link the invoice number')
    assert.strictEqual(unified.final_price, 2200000, 'Should have the final billed price')
    assert.strictEqual(unified.advance_amount, 50000, 'Should retain advance amount')
    assert.strictEqual(unified.due_amount, 2150000, 'Should have correct due amount')
    assert.ok(unified.items.length >= 1, 'Should preserve order items')
  })
})

