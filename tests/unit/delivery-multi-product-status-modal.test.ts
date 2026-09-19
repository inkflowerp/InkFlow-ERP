import { describe, it } from 'node:test'
import assert from 'node:assert'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { DesignRepository } from '../../lib/repositories/design.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { DeliveryChallanRecord } from '../../types/logistics.types.ts'

describe('Delivery Panel Multi-Product Status & Partial Delivery Workflow Tests', () => {
  const TENANT_ID = `tenant-delivery-multi-${Date.now()}`

  it('1. Single invoice with 3 item types (Ready Product, Design Required, Design OK) propagates all items to Delivery Panel with live statuses', async () => {
    // 1. Create Invoice with 3 items
    const invoice = await BillingRepository.createInvoice({
      company_id: TENANT_ID,
      customer_name: 'Apex Brands Ltd',
      customer_phone: '+8801700112233',
      customer_address: 'Gulshan-2, Dhaka',
      due_date: '2026-10-15',
      grand_total: 45000,
      paid_amount: 20000,
      due_amount: 25000,
      created_by_name: 'Cashier Agent',
      items: [
        {
          item_name: 'X-stand',
          item_description: 'X-stand - 1Pcs (Display Stand)',
          quantity: 1,
          unit: 'pcs',
          unit_price: 1500,
          total_price: 1500,
          item_kind: 'ready_product',
          workflow_routing: 'ready_product',
          design_required: false,
        } as any,
        {
          item_name: 'PVC Print',
          item_description: 'PVC Print (All Info) - 5x3ft High Res',
          quantity: 1,
          unit: 'pcs',
          unit_price: 8500,
          total_price: 8500,
          item_kind: 'custom_manufacturing',
          workflow_routing: 'design_required',
          design_required: true,
        } as any,
        {
          item_name: 'Vinyl Print',
          item_description: 'Vinyl Print - Matte Laminated Sticker',
          quantity: 1,
          unit: 'pcs',
          unit_price: 35000,
          total_price: 35000,
          item_kind: 'custom_manufacturing',
          workflow_routing: 'design_ok',
          design_required: false,
        } as any,
      ],
    })

    assert.ok(invoice.id, 'Invoice must have ID')
    assert.ok(invoice.invoice_number, 'Invoice must have number')

    // 2. Fetch Delivery Challan created in Delivery Panel
    const challans = PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
    const challan = challans.find(
      (c) => c.company_id === TENANT_ID && c.invoice_id === invoice.id
    )

    assert.ok(challan, 'A Delivery Challan must be created for the Invoice')
    assert.strictEqual(challan.invoice_number, invoice.invoice_number)
    assert.strictEqual(challan.customer_name, 'Apex Brands Ltd')
    assert.strictEqual(challan.status, 'pending_dispatch')
    assert.strictEqual(challan.items.length, 3, 'Delivery Challan must contain all 3 products')

    // 3. Verify Item 1: Ready Product (X-stand)
    const item1 = challan.items.find((i) => i.product_description?.includes('X-stand'))
    assert.ok(item1, 'Item 1 (X-stand) must be present')
    assert.strictEqual(item1.workflow_routing, 'ready_product')
    assert.strictEqual(item1.status, 'ready_for_delivery')
    assert.strictEqual(item1.is_delivered, false)

    // 4. Verify Item 2: Design Required (PVC Print)
    const item2 = challan.items.find((i) => i.product_description?.includes('PVC Print'))
    assert.ok(item2, 'Item 2 (PVC Print) must be present')
    assert.strictEqual(item2.workflow_routing, 'design_required')
    assert.strictEqual(item2.status, 'design_pending')
    assert.strictEqual(item2.is_delivered, false)

    // 5. Verify Item 3: Design OK (Vinyl Print)
    const item3 = challan.items.find((i) => i.product_description?.includes('Vinyl Print'))
    assert.ok(item3, 'Item 3 (Vinyl Print) must be present')
    assert.strictEqual(item3.workflow_routing, 'design_ok')
    assert.strictEqual(item3.status, 'design_check')
    assert.strictEqual(item3.is_delivered, false)

    // 6. Verify Design Jobs created for custom manufacturing items
    const designJobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    const invoiceDesignJobs = designJobs.filter(
      (d) => d.company_id === TENANT_ID && d.invoice_id === invoice.id
    )
    assert.strictEqual(invoiceDesignJobs.length, 2, '2 custom items must produce design jobs')
  })

  it('2. Production flow updates item status to printing/finishing pending and updates challan item status', async () => {
    const designJobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    const vinylDesignJob = designJobs.find(
      (d) => d.company_id === TENANT_ID && d.workflow_routing === 'design_ok'
    )
    assert.ok(vinylDesignJob, 'Design OK job for Vinyl Print must exist')

    // Designer sends to Print Operator
    const operatorResult = await DesignRepository.sendToPrintOperator(
      vinylDesignJob.id,
      TENANT_ID,
      'Printing specs verified. Ready for HP Latex 800W'
    )
    assert.ok(operatorResult.success)

    // Verify Challan item status is updated to printing_pending / in_production
    const challans = PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
    const challan = challans.find((c) => c.company_id === TENANT_ID)
    assert.ok(challan)

    const vinylItem = challan.items.find((i) => i.product_description?.includes('Vinyl Print'))
    assert.ok(vinylItem)
    assert.strictEqual(vinylItem.status, 'printing_pending')
  })

  it('3. Partial Delivery: Marking only Ready Product (X-stand) delivered changes status to partially_delivered', async () => {
    const challans = PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
    const challanIndex = challans.findIndex((c) => c.company_id === TENANT_ID)
    assert.ok(challanIndex !== -1)

    const targetChallan = challans[challanIndex]
    const xstandItem = targetChallan.items.find((i) => i.product_description?.includes('X-stand'))!
    assert.ok(xstandItem, 'X-stand item must be found')

    // Mark Item 1 delivered (Partial Delivery)
    const selectedItemIds = [xstandItem.id]
    const updatedItems = targetChallan.items.map((item) => {
      if (selectedItemIds.includes(item.id)) {
        return {
          ...item,
          is_delivered: true,
          status: 'delivered' as const,
          delivered_at: new Date().toISOString(),
          delivered_quantity: item.quantity,
        }
      }
      return item
    })

    const allDelivered = updatedItems.every((item) => item.is_delivered)
    const someDelivered = updatedItems.some((item) => item.is_delivered)

    const updatedChallan: DeliveryChallanRecord = {
      ...targetChallan,
      items: updatedItems,
      status: allDelivered ? 'delivered' : someDelivered ? 'partially_delivered' : 'pending_dispatch',
      received_by: 'Customer Rep (Partial Pickup)',
      received_date: new Date().toISOString(),
    }

    challans[challanIndex] = updatedChallan
    PrintERPDataStore.set(STORAGE_KEYS.DELIVERY_CHALLANS, challans)

    // Verify status is partially_delivered
    assert.strictEqual(updatedChallan.status, 'partially_delivered')
    assert.strictEqual(updatedChallan.items[0].is_delivered, true)
    assert.strictEqual(updatedChallan.items[1].is_delivered, false)
    assert.strictEqual(updatedChallan.items[2].is_delivered, false)
  })

  it('4. Full Delivery: Marking remaining items delivered marks challan as delivered', async () => {
    const challans = PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
    const challanIndex = challans.findIndex((c) => c.company_id === TENANT_ID)
    assert.ok(challanIndex !== -1)

    const targetChallan = challans[challanIndex]
    const remainingItemIds = targetChallan.items.filter((i) => !i.is_delivered).map((i) => i.id)

    // Mark remaining items delivered
    const updatedItems = targetChallan.items.map((item) => {
      if (remainingItemIds.includes(item.id) || item.is_delivered) {
        return {
          ...item,
          is_delivered: true,
          status: 'delivered' as const,
          delivered_at: item.delivered_at || new Date().toISOString(),
          delivered_quantity: item.quantity,
        }
      }
      return item
    })

    const allDelivered = updatedItems.every((item) => item.is_delivered)

    const updatedChallan: DeliveryChallanRecord = {
      ...targetChallan,
      items: updatedItems,
      status: allDelivered ? 'delivered' : 'partially_delivered',
      received_by: 'Customer Rep (Final Pickup)',
      received_date: new Date().toISOString(),
    }

    challans[challanIndex] = updatedChallan
    PrintERPDataStore.set(STORAGE_KEYS.DELIVERY_CHALLANS, challans)

    // Verify status is fully delivered
    assert.strictEqual(updatedChallan.status, 'delivered')
    assert.ok(updatedChallan.items.every((i) => i.is_delivered))
  })
})
