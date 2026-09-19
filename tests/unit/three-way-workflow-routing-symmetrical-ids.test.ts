import { describe, it } from 'node:test'
import assert from 'node:assert'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { OrderRepository } from '../../lib/repositories/order.repository.ts'
import { DesignRepository } from '../../lib/repositories/design.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('3-Way Workflow Routing & Symmetrical ID Sequence Tests', () => {
  const TENANT_ID = `tenant-routing-${Date.now()}`

  it('1. Symmetrical Numbering: Invoice number INV-YYYY-XXXXXX perfectly matches Order number ORD-YYYY-XXXXXX', async () => {
    // Generate next invoice and order numbers
    const invoiceNum = await BillingRepository.getNextInvoiceNumber(TENANT_ID)
    const orderNum = await OrderRepository.getNextOrderNumber(TENANT_ID)

    assert.ok(invoiceNum.startsWith('INV-'))
    assert.ok(orderNum.startsWith('ORD-'))

    const invoiceSuffix = invoiceNum.replace('INV-', '')
    const orderSuffix = orderNum.replace('ORD-', '')

    assert.strictEqual(
      invoiceSuffix,
      orderSuffix,
      `Invoice suffix (${invoiceSuffix}) must be symmetrical with Order suffix (${orderSuffix})`
    )
  })

  it('2. Branch 1: Ready Product routes directly to Delivery Panel Challan, bypassing Design & Production', async () => {
    const invoice = await BillingRepository.createInvoice({
      company_id: TENANT_ID,
      customer_name: 'Fast Food Chain',
      customer_phone: '+8801711223344',
      customer_address: 'Banani, Dhaka',
      due_date: '2026-09-30',
      grand_total: 15000,
      paid_amount: 15000,
      due_amount: 0,
      created_by_name: 'Billing Agent',
      items: [
        {
          item_name: 'Pre-printed Paper Cups 250ml',
          item_description: 'Pre-printed Paper Cups 250ml',
          quantity: 5000,
          unit: 'pcs',
          unit_price: 3,
          total_price: 15000,
          item_kind: 'ready_product',
          workflow_routing: 'ready_product',
          design_required: false,
        } as any,
      ],
    })

    assert.ok(invoice.id)
    assert.ok(invoice.invoice_number)

    // Verify Delivery Challan is automatically created in Delivery Panel
    const challans = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
    const matchingChallan = challans.find(
      (c) => c.company_id === TENANT_ID && c.invoice_id === invoice.id
    )

    assert.ok(matchingChallan, 'Ready product must generate a Delivery Challan')
    assert.strictEqual(matchingChallan.status, 'pending_dispatch')
    assert.strictEqual(matchingChallan.customer_name, 'Fast Food Chain')
    assert.strictEqual(matchingChallan.items[0].product_description, 'Pre-printed Paper Cups 250ml')

    // Verify NO design jobs were created for ready product
    const designJobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    const readyDesignJobs = designJobs.filter(
      (d) => d.company_id === TENANT_ID && d.invoice_id === invoice.id
    )
    assert.strictEqual(readyDesignJobs.length, 0, 'Ready product must NOT create design jobs')
  })

  it('3. Branch 2: Design Required routes to Design Panel (Tab: Design Request) with unapproved brief', async () => {
    const invoice = await BillingRepository.createInvoice({
      company_id: TENANT_ID,
      customer_name: 'Apex Pharma',
      customer_phone: '+8801811223344',
      due_date: '2026-10-05',
      grand_total: 25000,
      created_by_name: 'Billing Agent',
      items: [
        {
          item_name: 'Corporate Brochure Design & Print',
          item_description: 'Tri-fold Corporate Brochure',
          quantity: 2000,
          unit: 'pcs',
          unit_price: 12.5,
          total_price: 25000,
          item_kind: 'custom_manufacturing',
          workflow_routing: 'design_required',
          design_required: true,
        } as any,
      ],
    })

    assert.ok(invoice.id)

    // Verify Design Job created with workflow_routing = 'design_required' and customer_approval_required = true
    const designJobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    const matchingDesignJob = designJobs.find(
      (d) => d.company_id === TENANT_ID && d.invoice_id === invoice.id
    )

    assert.ok(matchingDesignJob, 'Design Required item must create a Design Job')
    assert.strictEqual(matchingDesignJob.workflow_routing, 'design_required')
    assert.strictEqual(matchingDesignJob.customer_approval_required, true)
    assert.strictEqual(matchingDesignJob.status, 'received')
    assert.strictEqual(matchingDesignJob.versions[0].is_approved, false)
  })

  it('4. Branch 3: Design OK (Send to Designer Panel) routes to Design Panel (Tab: Design Check) with pre-press artwork', async () => {
    const invoice = await BillingRepository.createInvoice({
      company_id: TENANT_ID,
      customer_name: 'Square Consumer Products',
      customer_phone: '+8801911223344',
      due_date: '2026-10-02',
      grand_total: 30000,
      created_by_name: 'Billing Agent',
      items: [
        {
          item_name: 'Packaging Box - Artwork Attached',
          item_description: 'Custom Embossed Perfume Box',
          quantity: 1000,
          unit: 'pcs',
          unit_price: 30,
          total_price: 30000,
          item_kind: 'custom_manufacturing',
          workflow_routing: 'design_ok',
          design_required: false,
        } as any,
      ],
    })

    assert.ok(invoice.id)

    // Verify Design Job created with workflow_routing = 'design_ok' and pre-approved artwork version
    const designJobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    const matchingDesignJob = designJobs.find(
      (d) => d.company_id === TENANT_ID && d.invoice_id === invoice.id
    )

    assert.ok(matchingDesignJob, 'Design OK item must create a Design Check Job')
    assert.strictEqual(matchingDesignJob.workflow_routing, 'design_ok')
    assert.strictEqual(matchingDesignJob.customer_approval_required, false)
    assert.strictEqual(matchingDesignJob.versions[0].is_approved, true)
    assert.strictEqual(matchingDesignJob.versions[0].proof_file_name, 'customer_artwork.pdf')

    // Designer completes pre-press flightcheck & releases to Production / Print floor
    const releaseResult = await DesignRepository.releaseToProduction(
      matchingDesignJob.id,
      TENANT_ID,
      'Pre-Press Verified: CMYK 300DPI, 3mm Bleeds OK, Cut contour aligned'
    )

    assert.ok(releaseResult.success, 'Release to production must succeed')
    assert.strictEqual(releaseResult.status, 'released_to_production')

    // Verify Production Tasks are generated for Print & Finishing floors
    const prodTasks = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    const jobProdTasks = prodTasks.filter(
      (t) => t.company_id === TENANT_ID && t.job_number === invoice.invoice_number
    )

    assert.ok(jobProdTasks.length >= 2, 'Must generate Print and Finishing tasks')
    const printTask = jobProdTasks.find((t) => t.task_type === 'printing' || t.department === 'printing')
    const finishTask = jobProdTasks.find((t) => t.task_type === 'finishing' || t.department === 'finishing')

    assert.ok(printTask, 'Print floor task must be provisioned')
    assert.ok(finishTask, 'Finishing floor task must be provisioned')
    assert.strictEqual(printTask.is_blocked_by_commercial_gate, false)
    assert.strictEqual(printTask.is_blocked_by_design_gate, false)
  })
})
