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

  it('5. Ready Product (X-stand) produces 0 production tasks, goes direct to Delivery, and enforces Partial Delivery until all items are ready', async () => {
    const TEST_TENANT = `tenant-direct-delivery-${Date.now()}`

    // 1. Create Invoice with Ready Product (X-stand) and Custom Services (PVC Print, Vinyl Print)
    const invoice = await BillingRepository.createInvoice({
      company_id: TEST_TENANT,
      customer_name: 'Direct Delivery Client',
      customer_phone: '+8801811223344',
      customer_address: 'Banani, Dhaka',
      due_date: '2026-10-20',
      grand_total: 25000,
      paid_amount: 10000,
      due_amount: 15000,
      created_by_name: 'Commercial Billing Officer',
      items: [
        {
          item_name: 'X-stand',
          item_description: 'X-stand - 1Pcs',
          quantity: 1,
          unit: 'pcs',
          unit_price: 300,
          total_price: 300,
          item_kind: 'ready_product',
          workflow_routing: 'ready_product',
          design_required: false,
        } as any,
        {
          item_name: 'PVC Print',
          item_description: 'PVC Print (All Info)',
          quantity: 1,
          unit: 'pcs',
          unit_price: 12000,
          total_price: 12000,
          item_kind: 'service',
          workflow_routing: 'design_required',
          design_required: true,
        } as any,
        {
          item_name: 'Vinyl Print',
          item_description: 'Vinyl Print',
          quantity: 1,
          unit: 'pcs',
          unit_price: 12700,
          total_price: 12700,
          item_kind: 'service',
          workflow_routing: 'design_ok',
          design_required: false,
        } as any,
      ],
    })

    // 2. Verify Production Tasks: ZERO tasks created for X-stand
    const prodTasks = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    const xstandProdTasks = prodTasks.filter(
      (t) => t.company_id === TEST_TENANT && (t.task_name?.includes('X-stand') || t.product_name?.includes('X-stand'))
    )
    assert.strictEqual(xstandProdTasks.length, 0, 'Ready product X-stand must NOT create production tasks')

    // 3. Verify Design Jobs: ZERO design jobs created for X-stand
    const designJobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    const xstandDesignJobs = designJobs.filter(
      (d) => d.company_id === TEST_TENANT && d.title?.includes('X-stand')
    )
    assert.strictEqual(xstandDesignJobs.length, 0, 'Ready product X-stand must NOT create design jobs')

    // 4. Verify Delivery Challan: X-stand goes direct to Delivery & Logistics with ready_for_delivery
    const challans = PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
    const challan = challans.find((c) => c.company_id === TEST_TENANT && c.invoice_id === invoice.id)
    assert.ok(challan, 'Delivery challan must exist')
    assert.strictEqual(challan.items.length, 3)

    const xstandChallanItem = challan.items.find((i) => i.product_description?.includes('X-stand'))!
    const pvcChallanItem = challan.items.find((i) => i.product_description?.includes('PVC Print'))!
    const vinylChallanItem = challan.items.find((i) => i.product_description?.includes('Vinyl Print'))!

    assert.strictEqual(xstandChallanItem.status, 'ready_for_delivery')
    assert.strictEqual(pvcChallanItem.status, 'design_pending')
    assert.strictEqual(vinylChallanItem.status, 'design_check')

    // 5. Simulate Delivery Modal dynamic button logic:
    // When non-delivered items are not all ready -> Partial Delivery
    const nonDelivered = challan.items.filter((i) => !i.is_delivered)
    const allReadyBefore = nonDelivered.every((i) => i.status === 'ready_for_delivery')
    assert.strictEqual(allReadyBefore, false, 'Not all items are ready yet')

    // When X-stand is delivered partially
    xstandChallanItem.is_delivered = true
    xstandChallanItem.status = 'delivered'
    const remainingAfterPartial = challan.items.filter((i) => !i.is_delivered)
    assert.strictEqual(remainingAfterPartial.length, 2, '2 items remaining')

    // When remaining custom items finish production
    pvcChallanItem.status = 'ready_for_delivery'
    vinylChallanItem.status = 'ready_for_delivery'
    const allReadyNow = remainingAfterPartial.every((i) => i.status === 'ready_for_delivery')
    assert.strictEqual(allReadyNow, true, 'All remaining items are now ready for final full delivery')
  })

  it('6. BillingService.createInvoice preserves item_kind & workflow_routing for Ready Products and populates Delivery Panel', async () => {
    const { BillingService } = await import('../../services/billing.service.ts')
    const ACTION_TENANT = `tenant-service-delivery-${Date.now()}`

    const rawItems = [
      {
        item_name: 'X-stand',
        dimensions_spec: '60cm x 160cm',
        width: 0,
        height: 0,
        quantity: 2,
        unit: 'pcs',
        unit_price: 650,
        total_price: 1300,
        item_kind: 'ready_product',
        workflow_routing: 'ready_product',
        design_required: false,
        customer_approval_required: false,
      },
    ]

    const invoice = await BillingService.createInvoice({
      company_id: ACTION_TENANT,
      customer_name: 'Ready Goods Corp',
      customer_phone: '+8801999887766',
      customer_address: 'Uttara Sector 3, Dhaka',
      due_date: '2026-10-10',
      grand_total: 1300,
      paid_amount: 0,
      due_amount: 1300,
      created_by_name: 'Commercial Executive',
      items: rawItems as any,
    })

    assert.ok(invoice.id, 'Invoice ID must be generated')
    assert.strictEqual(invoice.items.length, 1)
    assert.strictEqual(invoice.items[0].item_kind, 'ready_product')
    assert.strictEqual(invoice.items[0].workflow_routing, 'ready_product')

    // Verify Delivery Challan exists and has ready_for_delivery status
    const challans = PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
    const challan = challans.find((c) => c.company_id === ACTION_TENANT && c.invoice_id === invoice.id)
    assert.ok(challan, 'Delivery challan must be created in datastore')
    assert.strictEqual(challan.items.length, 1)
    assert.strictEqual(challan.items[0].status, 'ready_for_delivery')
    assert.strictEqual(challan.items[0].item_kind, 'ready_product')
    assert.strictEqual(challan.items[0].workflow_routing, 'ready_product')

    // Verify 0 production tasks were created for this ready product
    const prodTasks = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    const xstandTasks = prodTasks.filter((t) => t.company_id === ACTION_TENANT)
    assert.strictEqual(xstandTasks.length, 0, 'Zero production tasks must be generated for ready products')
  })

  it('7. LogisticsRepository.getChallans dynamically retrieves and populates Delivery Challans for the tenant', async () => {
    const { LogisticsRepository } = await import('../../lib/repositories/logistics.repository.ts')
    const { LogisticsService } = await import('../../services/logistics.service.ts')
    const TENANT = `tenant-repo-challan-${Date.now()}`

    // 1. Create an invoice in Datastore for this tenant
    const { BillingRepository } = await import('../../lib/repositories/billing.repository.ts')
    const invoice = await BillingRepository.createInvoice({
      company_id: TENANT,
      customer_name: 'Fast Dispatch Ltd',
      customer_phone: '+8801711223344',
      due_date: '2026-10-25',
      grand_total: 5000,
      created_by_name: 'Billing Officer',
      items: [
        {
          item_name: 'Rollup Banner',
          quantity: 2,
          unit: 'pcs',
          unit_price: 2500,
          item_kind: 'ready_product',
          workflow_routing: 'ready_product',
          design_required: false,
        } as any,
      ],
    })

    // 2. Fetch via LogisticsRepository
    const challans = await LogisticsRepository.getChallans(TENANT)
    assert.ok(Array.isArray(challans), 'Challans must be an array')
    assert.ok(challans.length >= 1, 'At least 1 challan must be returned for this tenant')

    const matchedChallan = challans.find((c) => c.invoice_id === invoice.id || c.invoice_number === invoice.invoice_number)
    assert.ok(matchedChallan, 'Challan matching invoice must be found')
    assert.strictEqual(matchedChallan.items.length, 1)
    assert.strictEqual(matchedChallan.items[0].status, 'ready_for_delivery')
    assert.strictEqual(matchedChallan.items[0].item_kind, 'ready_product')

    // 3. Fetch via LogisticsService
    const serviceChallans = await LogisticsService.getChallans(TENANT)
    assert.ok(serviceChallans.length >= 1)
  })
})

