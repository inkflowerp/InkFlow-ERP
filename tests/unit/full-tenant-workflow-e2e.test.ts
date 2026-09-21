import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { QuotationRepository } from '../../lib/repositories/quotation.repository.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { DesignRepository } from '../../lib/repositories/design.repository.ts'
import { ProductionTaskRepository } from '../../lib/repositories/production-task.repository.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { LogisticsRepository } from '../../lib/repositories/logistics.repository.ts'
import type { QuotationRecord } from '../../types/quotation.types.ts'
import type { InvoiceRecord } from '../../types/billing.types.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'

describe('Full Tenant End-to-End Workflow: Quotation -> Invoice -> Orders -> Design -> Production -> Finishing -> Inventory -> Delivery', () => {
  const companyId = 'comp-workflow-audit-001'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.QUOTATIONS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.ORDERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, [])
    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [])
    PrintERPDataStore.set(STORAGE_KEYS.STOCK_LEDGER, [])
    PrintERPDataStore.set(STORAGE_KEYS.DELIVERY_CHALLANS, [])
  })

  test('1. Quotation -> Invoice: preserves quoted rates, item kinds, design requirements, and post-press finishing', async () => {
    const quote: QuotationRecord = {
      id: 'quote-full-101',
      company_id: companyId,
      quotation_number: 'QUO-000101',
      customer_id: 'cust-akij-group',
      customer_name: 'Akij Printing & Packaging',
      customer_phone: '+8801711223344',
      status: 'approved',
      quotation_date: '2026-09-22',
      valid_until: '2026-10-05',
      salesperson_name: 'Tanvir Ahmed',
      language_mode: 'bilingual',
      subtotal: 18500,
      discount_amount: 500,
      vat_rate: 0,
      vat_amount: 0,
      grand_total: 18000,
      total_cost: 11000,
      margin_percent: 38.8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'qi-1',
          description: 'Corporate Brochure (4 Color Print)',
          item_kind: 'custom',
          width: 8.5,
          height: 11,
          dimension_unit: 'inch',
          area_sft: 0.65,
          quantity: 2000,
          unit: 'pcs',
          unit_rate: 6.5,
          item_total: 13000,
          material_spec: '300gsm Art Card',
          finishing: 'Matt Lamination & Die-cut',
          artwork_required: true,
        },
        {
          id: 'qi-2',
          description: 'X-Banner Stand 2ft x 5ft (Metal Base)',
          item_kind: 'ready_product',
          width: 2,
          height: 5,
          dimension_unit: 'ft',
          area_sft: 10,
          quantity: 4,
          unit: 'pcs',
          unit_rate: 850,
          item_total: 3400,
          material_spec: 'Aluminum/Steel Stand',
          artwork_required: false,
        },
        {
          id: 'qi-3',
          description: 'Custom Embossed Metal Pin Badge (Vendor Outsource)',
          item_kind: 'custom',
          width: 1.5,
          height: 1.5,
          dimension_unit: 'inch',
          area_sft: 0.02,
          quantity: 100,
          unit: 'pcs',
          unit_rate: 16,
          item_total: 1600,
          artwork_required: false,
        },
      ],
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.QUOTATIONS, quote)

    // Convert Quotation to Invoice
    const invoice = await QuotationRepository.convertQuotationToInvoice(quote.id, companyId, {
      createdByName: 'Tanvir Ahmed',
    })

    assert.ok(invoice, 'Invoice should be created')
    assert.strictEqual(invoice.grand_total, 18000, 'Grand total preserved')
    assert.strictEqual(invoice.items.length, 3, 'All 3 items preserved')

    // Verify item 1 (Custom print + design required)
    const it1 = invoice.items[0]
    assert.strictEqual(it1.item_description, 'Corporate Brochure (4 Color Print)')
    assert.strictEqual(it1.workflow_routing, 'design_required')
    assert.strictEqual(it1.design_required, true)
    assert.strictEqual(it1.finishing, 'Matt Lamination & Die-cut')

    // Verify item 2 (Ready product)
    const it2 = invoice.items[1]
    assert.strictEqual(it2.item_kind, 'ready_product')
    assert.strictEqual(it2.workflow_routing, 'ready_product')
    assert.strictEqual(it2.design_required, false)

    // Verify Quotation updated to converted
    const updatedQuote = await QuotationRepository.getQuotationById(quote.id, companyId)
    assert.strictEqual(updatedQuote?.status, 'converted')
    assert.strictEqual(updatedQuote?.converted_invoice_id, invoice.id)
  })

  test('2. Design Panel: Synthesizes design jobs ONLY for custom works, attaches parent invoice items, and handles design confirmation', async () => {
    const mixedInvoice: InvoiceRecord = {
      id: 'inv-flow-201',
      company_id: companyId,
      invoice_number: 'INV-000201',
      customer_id: 'cust-navana',
      customer_name: 'Navana Real Estate Ltd.',
      customer_phone: '+8801819001122',
      invoice_type: 'sales_invoice',
      invoice_date: '2026-09-22',
      due_date: '2026-09-29',
      subtotal: 25000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 25000,
      paid_amount: 10000, // Token advance
      due_amount: 15000,
      write_off_amount: 0,
      status: 'partially_paid',
      created_by_name: 'POS Staff',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'inv-item-201-1',
          invoice_id: 'inv-flow-201',
          item_description: 'Backlit Signboard Flex Banner (10ft × 4ft)',
          width: 10,
          height: 4,
          dimension_unit: 'ft',
          area_sft: 40,
          quantity: 1,
          unit: 'pcs',
          unit_price: 6000,
          total_price: 6000,
          workflow_routing: 'design_required',
          design_required: true,
          item_kind: 'custom_manufacturing',
          finishing: 'Pocket Pasting & Eyelet Rings',
        },
        {
          id: 'inv-item-201-2',
          invoice_id: 'inv-flow-201',
          item_description: 'Rollup Banner Stand Heavy Base 3ft × 6.5ft',
          width: 3,
          height: 6.5,
          dimension_unit: 'ft',
          area_sft: 19.5,
          quantity: 2,
          unit: 'pcs',
          unit_price: 3500,
          total_price: 7000,
          workflow_routing: 'ready_product',
          item_kind: 'ready_product',
        },
      ],
    }

    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [mixedInvoice])

    // Fetch design jobs
    const designJobs = await DesignRepository.getDesignJobs(companyId)
    assert.strictEqual(designJobs.length, 1, 'Only 1 design job generated for custom banner')
    const bannerJob = designJobs[0]
    assert.strictEqual(bannerJob.title, 'Backlit Signboard Flex Banner (10ft × 4ft)')
    assert.strictEqual(bannerJob.all_invoice_items?.length, 2, 'Attaches all invoice items for group banner')

    // Action 1: Designer starts design
    const inProgJob = await DesignRepository.updateDesignJob(bannerJob.id, companyId, {
      status: 'in_progress',
    })
    assert.strictEqual(inProgJob?.status, 'in_progress')

    // Action 2: Designer finishes design
    const reviewJob = await DesignRepository.updateDesignJob(bannerJob.id, companyId, {
      status: 'in_review',
    })
    assert.strictEqual(reviewJob?.status, 'in_review')

    // Action 3: Customer confirms design -> Send to production
    const approvedJob = await DesignRepository.updateDesignJob(bannerJob.id, companyId, {
      status: 'approved',
      workflow_routing: 'ready_production',
    })
    assert.strictEqual(approvedJob?.status, 'approved')
  })

  test('3. Production & Finishing: Generates Printing and Finishing tasks for approved design job', async () => {
    const invoice: InvoiceRecord = {
      id: 'inv-prod-301',
      company_id: companyId,
      invoice_number: 'INV-000301',
      customer_id: 'cust-apex',
      customer_name: 'Apex Footwear Ltd.',
      customer_phone: '+8801911334455',
      invoice_type: 'sales_invoice',
      invoice_date: '2026-09-22',
      due_date: '2026-09-29',
      subtotal: 12000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 12000,
      paid_amount: 12000,
      due_amount: 0,
      write_off_amount: 0,
      status: 'paid',
      created_by_name: 'Commercial Billing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'item-301-1',
          invoice_id: 'inv-prod-301',
          item_description: 'Store Vinyl Sticker with Gloss Lamination (8ft × 3ft)',
          width: 8,
          height: 3,
          dimension_unit: 'ft',
          area_sft: 24,
          quantity: 2,
          unit: 'pcs',
          unit_price: 6000,
          total_price: 12000,
          workflow_routing: 'design_ok',
          item_kind: 'custom_manufacturing',
          finishing: 'Gloss Lamination & Board Pasting',
        },
      ],
    }

    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [invoice])

    const tasks = await ProductionTaskRepository.getTasks(companyId)
    assert.strictEqual(tasks.length, 2, '2 tasks generated: 1 Printing + 1 Finishing')

    const printTask = tasks.find((t) => t.department === 'printing' || t.task_type === 'printing')
    const finishTask = tasks.find((t) => t.department === 'finishing' || t.task_type === 'finishing')

    assert.ok(printTask, 'Printing task must exist')
    assert.strictEqual(printTask?.sequence_order, 1)
    assert.strictEqual(printTask?.status, 'queued')

    assert.ok(finishTask, 'Finishing task must exist')
    assert.strictEqual(finishTask?.sequence_order, 2)
  })

  test('4. Inventory: Atomic raw material consumption and ledger entry', async () => {
    const initialMaterial: MaterialRecord = {
      id: 'mat-star-flex-320',
      company_id: companyId,
      name: 'Star Flex Banner 320gsm Frontlit (10ft Roll)',
      sku: 'MED-FLX-320-10',
      category: 'wide_format_media',
      unit: 'sqft',
      current_stock: 3200,
      min_stock_level: 500,
      reorder_level: 800,
      average_cost: 14.5,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, initialMaterial)

    // Deduct 240 sqft for production job
    const result = await InventoryRepository.recordStockAdjustment({
      company_id: companyId,
      material_id: initialMaterial.id,
      quantity_change: -240,
      transaction_type: 'issue_to_production',
      unit_cost: 14.5,
      performed_by_name: 'Flora Machine Operator (Babul)',
      notes: 'Issued 240 sqft Star Flex for INV-000301',
    })

    assert.strictEqual(result.material.current_stock, 2960, 'Stock correctly decremented')
    assert.strictEqual(result.ledgerEntry.quantity_change, -240)
  })

  test('5. Delivery Panel: Unified Challan synthesis, financial due collection warning, and delivery sign-off', async () => {
    const invoiceWithDue: InvoiceRecord = {
      id: 'inv-del-501',
      company_id: companyId,
      invoice_number: 'INV-000501',
      customer_id: 'cust-square',
      customer_name: 'Square Pharmaceuticals Ltd.',
      customer_phone: '+8801700112233',
      customer_address: 'Square Centre, 48 Mohakhali C/A, Dhaka',
      invoice_type: 'sales_invoice',
      invoice_date: '2026-09-22',
      due_date: '2026-09-25',
      subtotal: 30000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 30000,
      paid_amount: 10000, // ৳20,000 Due
      due_amount: 20000,
      write_off_amount: 0,
      status: 'partially_paid',
      created_by_name: 'Commercial Counter',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'inv-item-501-1',
          invoice_id: 'inv-del-501',
          item_description: 'Backdrop Banner 20ft × 10ft',
          width: 20,
          height: 10,
          dimension_unit: 'ft',
          area_sft: 200,
          quantity: 1,
          unit: 'pcs',
          unit_price: 20000,
          total_price: 20000,
          workflow_routing: 'design_ok',
          item_kind: 'custom_manufacturing',
        },
        {
          id: 'inv-item-501-2',
          invoice_id: 'inv-del-501',
          item_description: 'Luxury Rollup Stand 3ft × 6.5ft',
          width: 3,
          height: 6.5,
          dimension_unit: 'ft',
          area_sft: 19.5,
          quantity: 2,
          unit: 'pcs',
          unit_price: 5000,
          total_price: 10000,
          workflow_routing: 'ready_product',
          item_kind: 'ready_product',
        },
      ],
    }

    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [invoiceWithDue])

    const challans = await LogisticsRepository.getChallans(companyId)
    assert.strictEqual(challans.length, 1, 'Synthesizes 1 unified challan')

    const ch = challans[0]
    assert.strictEqual(ch.challan_number, 'CHL-000501')
    assert.strictEqual(ch.grand_total, 30000)
    assert.strictEqual(ch.paid_amount, 10000)
    assert.strictEqual(ch.due_amount, 20000, 'Attaches ৳20,000 due amount to challan')
    assert.strictEqual(ch.payment_status, 'partial')

    // Verify ready product is marked ready_for_delivery immediately
    const readyItem = ch.items.find((it) => it.item_kind === 'ready_product')
    assert.strictEqual(readyItem?.status, 'ready_for_delivery')

    // Confirm Delivery with receiver sign-off
    const now = new Date().toISOString()
    const updatedChallan = PrintERPDataStore.updateItem(STORAGE_KEYS.DELIVERY_CHALLANS, ch.id, {
      status: 'delivered',
      delivered_at: now,
      receiver_name: 'Mahbubur Rahman (Admin Officer)',
      receiver_phone: '+8801700112233',
      receiver_signature: 'Received in good condition and paid remaining due balance',
    })

    assert.strictEqual(updatedChallan?.status, 'delivered')
    assert.strictEqual(updatedChallan?.receiver_name, 'Mahbubur Rahman (Admin Officer)')
  })
})
