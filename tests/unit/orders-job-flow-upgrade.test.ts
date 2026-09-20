import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { getNavigationConfig } from '../../config/navigation.config.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { InvoiceRecord } from '../../types/billing.types.ts'
import type { SalesOrderRecord, JobOrderRecord } from '../../types/order.types.ts'

const TENANT_ID = 'company-test-orders-flow'

describe('Orders & Job Flow Upgrade & Invoice Works Ingestion', () => {
  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.ORDERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.JOB_ORDERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.DELIVERY_CHALLANS, [])
  })

  it('1. Navigation config contains Orders & Job Flow with bilingual titles', () => {
    const navSections = getNavigationConfig('acme-press')
    const workSection = navSections.find((s) => s.id === 'work')
    assert.ok(workSection, 'Work section should exist in navigation')

    const ordersItem = workSection.items.find((item) => item.key === 'orders')
    assert.ok(ordersItem, 'Orders item must exist in work section')
    assert.strictEqual(ordersItem.title, 'Orders & Job Flow')
    assert.strictEqual(ordersItem.titleBn, 'অর্ডার ও জব ফ্লো')
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
    const orders = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
    const matchingOrder = orders.find(
      (o) => o.invoice_id === created.id || o.order_number === 'ORD-2026-9901' || o.invoice_number === created.invoice_number
    )
    assert.ok(matchingOrder, 'Orders & Job Flow should contain the auto-linked sales order')
    assert.strictEqual(matchingOrder.customer_name, 'Apex Footwear Ltd')
    assert.strictEqual(matchingOrder.commercial_status, 'invoice_created')
    assert.strictEqual(matchingOrder.production_gate_status, 'ready_for_production')

    // Verify Job Orders Datastore contains job tickets for the items
    const jobOrders = PrintERPDataStore.get<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS) || []
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

    const createdOrder = PrintERPDataStore.createSalesOrderWithIntegrations(orderData)
    assert.ok(createdOrder, 'Order should be created with integrations')

    const savedOrders = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
    const found = savedOrders.find((o) => o.id === 'ord-test-002')
    assert.ok(found, 'Sales order must be stored')
    assert.strictEqual(found.priority, 'urgent')
    assert.strictEqual(found.items[0].item_name, 'Frosted Vinyl Glass Sticker')
  })
})
