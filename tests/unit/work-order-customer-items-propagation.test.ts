import test, { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InvoiceRequestService } from '../../services/invoice-request.service.ts'
import { InvoiceRequestRepository } from '../../lib/repositories/invoice-request.repository.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import type { InvoiceRecord } from '../../types/billing.types.ts'

describe('Work Order Modal Customer Info, Multi-Item Specs & Workflow Routing', () => {
  const companyAlpha = 'comp-tenant-alpha'

  beforeEach(() => {
    PrintERPDataStore.clear(STORAGE_KEYS.INVOICE_REQUESTS)
    PrintERPDataStore.clear(STORAGE_KEYS.ORDERS)
    PrintERPDataStore.clear(STORAGE_KEYS.DESIGN_JOBS)
    PrintERPDataStore.clear(STORAGE_KEYS.JOB_ORDERS)
    PrintERPDataStore.clear(STORAGE_KEYS.PRODUCTION_TASKS)
    PrintERPDataStore.clear(STORAGE_KEYS.DELIVERY_CHALLANS)
    PrintERPDataStore.clear(STORAGE_KEYS.IN_APP_NOTIFICATIONS)
  })

  it('1. Persists all customer information (Customer Type, WhatsApp, Address, Company) and item specs (Finishing, Add-ons, Dimensions) without required pricing', async () => {
    const customerPayload = {
      companyId: companyAlpha,
      customerName: 'Anik Rahman',
      customerType: 'corporate' as const,
      customerPhone: '01711223344',
      whatsappNumber: '01711223344',
      customerEmail: 'anik@acme-corp.com',
      customerAddress: 'House 42, Road 11, Banani, Dhaka',
      companyName: 'Acme Media & Advertising Ltd.',
      itemsSummary: 'Eco Solvent Ink (Black) (4×6 ft, Qty: 2); Backlit Signboard (10×4 ft, Qty: 1)',
      items: [
        {
          productId: 'prod-eco-ink-01',
          itemName: 'Eco Solvent Banner',
          item_kind: 'service' as const,
          width: '4',
          height: '6',
          dimension_unit: 'ft',
          quantity: 2,
          unit: 'sft',
          finishing: 'Eyelets / Grommets (চারপাশে রিং)',
          add_on: 'High Density Inking (ডাবল কালার প্রিন্ট)',
          workflow_routing: 'ready_production' as const,
          design_required: false,
        },
        {
          productId: 'prod-stand-02',
          itemName: 'Roll-up Standee Hardware (3x6 ft)',
          item_kind: 'ready_product' as const,
          width: '0',
          height: '0',
          dimension_unit: 'ft',
          quantity: 1,
          unit: 'pcs',
          finishing: 'None',
          add_on: 'None',
          workflow_routing: 'ready_product' as const,
          design_required: false,
        },
      ],
      estimatedAmount: 2400,
      notes: 'Urgent prepress proof verified in Design Studio.',
    }

    const created = await InvoiceRequestService.createInvoiceRequest(customerPayload)

    assert.ok(created.id, 'Request ID should be generated')
    assert.equal(created.customer_name, 'Anik Rahman')
    assert.equal(created.customer_type, 'corporate')
    assert.equal(created.customer_phone, '01711223344')
    assert.equal(created.whatsapp_number, '01711223344')
    assert.equal(created.customer_email, 'anik@acme-corp.com')
    assert.equal(created.customer_address, 'House 42, Road 11, Banani, Dhaka')
    assert.equal(created.company_name, 'Acme Media & Advertising Ltd.')
    assert.equal(created.status, 'pending')
    assert.ok(Array.isArray(created.items), 'Items array must be persisted')
    assert.equal(created.items?.length, 2)
    assert.equal(created.items?.[0].itemName, 'Eco Solvent Banner')
    assert.equal(created.items?.[0].finishing, 'Eyelets / Grommets (চারপাশে রিং)')
    assert.equal(created.items?.[0].add_on, 'High Density Inking (ডাবল কালার প্রিন্ট)')
    assert.equal(created.items?.[0].workflow_routing, 'ready_production')
    assert.equal(created.items?.[1].itemName, 'Roll-up Standee Hardware (3x6 ft)')
    assert.equal(created.items?.[1].item_kind, 'ready_product')
    assert.equal(created.items?.[1].workflow_routing, 'ready_product')
  })

  it('2. Retrieves invoice request with full items payload for pre-filling NewInvoiceModal', async () => {
    const created = await InvoiceRequestRepository.createRequest({
      company_id: companyAlpha,
      customer_name: 'Shakil Ahmed',
      customer_type: 'reseller',
      customer_phone: '01899887766',
      whatsapp_number: '01899887766',
      customer_email: 'shakil@printpress.bd',
      customer_address: 'Motijheel C/A, Dhaka-1000',
      company_name: 'Fast Track Printing Hub',
      items_summary: 'Pana Flex Banner Print (20×10 ft, Qty: 1)',
      items: [
        {
          productId: 'prod-pana-flex',
          itemName: 'Pana Flex Banner Print',
          item_kind: 'service',
          width: '20',
          height: '10',
          dimension_unit: 'ft',
          quantity: 1,
          unit: 'sft',
          finishing: 'Pocket / Pole Seaming (পাইপ পকেট)',
          add_on: 'Corner Reinforcement (কোণায় অতিরিক্ত টান)',
          workflow_routing: 'ready_production',
          design_required: false,
        },
      ],
      estimated_amount: 5000,
      requested_by_name: 'Pre-Press Designer Labib',
    })

    const fetched = await InvoiceRequestRepository.getRequestById(created.id, companyAlpha)

    assert.ok(fetched, 'Request should be retrievable')
    assert.equal(fetched?.customer_name, 'Shakil Ahmed')
    assert.equal(fetched?.customer_type, 'reseller')
    assert.equal(fetched?.whatsapp_number, '01899887766')
    assert.equal(fetched?.customer_email, 'shakil@printpress.bd')
    assert.equal(fetched?.customer_address, 'Motijheel C/A, Dhaka-1000')
    assert.equal(fetched?.company_name, 'Fast Track Printing Hub')
    assert.equal(fetched?.items?.length, 1)
    assert.equal(fetched?.items?.[0].width, '20')
    assert.equal(fetched?.items?.[0].height, '10')
    assert.equal(fetched?.items?.[0].finishing, 'Pocket / Pole Seaming (পাইপ পকেট)')
    assert.equal(fetched?.items?.[0].add_on, 'Corner Reinforcement (কোণায় অতিরিক্ত টান)')
  })

  it('3. Invoice Creation from Work Order sends custom print items to Production Planning & Shop Floor and ready products to Delivery Challan', async () => {
    const invoiceRecord: InvoiceRecord = {
      id: 'inv-workorder-001',
      company_id: companyAlpha,
      invoice_number: 'INV-2026-WO001',
      customer_id: 'cust-anik-01',
      customer_name: 'Anik Rahman',
      customer_phone: '01711223344',
      customer_address: 'House 42, Road 11, Banani, Dhaka',
      customer_type: 'corporate',
      invoice_date: '2026-09-21',
      due_date: '2026-09-24',
      invoice_type: 'sales_invoice',
      currency: 'BDT',
      subtotal: 3500,
      discount_amount: 0,
      vat_amount: 0,
      grand_total: 3500,
      paid_amount: 1000,
      due_amount: 2500,
      payment_status: 'partial',
      status: 'issued',
      items: [
        {
          id: 'item-custom-print-01',
          item_name: 'Star Pana Flex Frontlit Banner',
          item_description: 'Star Pana Flex Frontlit Banner (20x10 ft)',
          item_kind: 'custom_manufacturing',
          dimensions_spec: '20 × 10 ft',
          width: 20,
          height: 10,
          unit: 'sft',
          quantity: 200,
          unit_price: 15,
          line_total: 3000,
          finishing: 'Eyelets / Grommets (চারপাশে রিং)',
          add_on: 'High Density Inking (ডাবল কালার প্রিন্ট)',
          design_required: false,
          workflow_routing: 'ready_production',
        },
        {
          id: 'item-ready-hardware-02',
          item_name: 'Luxury X-Banner Stand (60x160cm)',
          item_description: 'Luxury X-Banner Stand (60x160cm)',
          item_kind: 'ready_product',
          dimensions_spec: '60 × 160 cm',
          unit: 'pcs',
          quantity: 1,
          unit_price: 500,
          line_total: 500,
          finishing: 'None',
          add_on: 'None',
          design_required: false,
          workflow_routing: 'ready_product',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await BillingRepository.syncCommercialWorkflowOnInvoiceCreated(invoiceRecord, companyAlpha)

    // Verify 1: Sales Order auto-created with commercial status and production gate status
    const orders = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []).filter((o) => o.company_id === companyAlpha)
    const matchingOrder = orders.find((o) => o.invoice_id === invoiceRecord.id)
    assert.ok(matchingOrder, 'Sales Order should be auto-synchronized for the invoice')
    assert.equal(matchingOrder.commercial_status, 'invoice_created')
    assert.equal(matchingOrder.production_gate_status, 'ready_for_production')

    // Verify 2: Job Order created for custom print item and NOT for ready product
    const jobOrders = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.JOB_ORDERS) || []).filter((j) => j.company_id === companyAlpha)
    assert.equal(jobOrders.length, 1, 'Only the custom print item should generate a job order')
    assert.equal(jobOrders[0].product_name, 'Star Pana Flex Frontlit Banner (20x10 ft)')
    assert.equal(jobOrders[0].commercial_status, 'invoice_created')
    assert.equal(jobOrders[0].production_gate_status, 'ready_for_production')
    assert.equal(jobOrders[0].is_blocked_by_commercial_gate, false)
    assert.equal(jobOrders[0].is_blocked_by_design_gate, false)

    // Verify 3: Production Tasks created for Shop Floor Terminal
    const prodTasks = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []).filter((t) => t.company_id === companyAlpha)
    assert.ok(prodTasks.length >= 2, 'Should create print and finishing tasks for Shop Floor')
    const printTask = prodTasks.find((t) => t.task_type === 'printing')
    const finishTask = prodTasks.find((t) => t.task_type === 'finishing')
    assert.ok(printTask, 'Printing task must exist')
    assert.equal(printTask.status, 'queued')
    assert.equal(printTask.is_blocked_by_commercial_gate, false)
    assert.ok(finishTask, 'Finishing task must exist')
    assert.equal(finishTask.is_blocked_by_commercial_gate, false)

    // Verify 4: Delivery Challan created with both products tracked
    const challans = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []).filter((c) => c.company_id === companyAlpha)
    assert.equal(challans.length, 1, 'Delivery challan should be created for delivery logistics')
    assert.equal(challans[0].items?.length, 2, 'Challan should track both line items')

    const readyProductChallanItem = challans[0].items?.find((i: any) => i.item_kind === 'ready_product')
    const customPrintChallanItem = challans[0].items?.find((i: any) => i.item_kind !== 'ready_product')

    assert.ok(readyProductChallanItem, 'Ready product must be in challan')
    assert.equal(readyProductChallanItem.status, 'ready_for_delivery', 'Ready product is immediately ready for delivery')

    assert.ok(customPrintChallanItem, 'Custom print item must be in challan')
    assert.equal(customPrintChallanItem.status, 'in_production', 'Custom print item reflects in_production status')
  })
})
