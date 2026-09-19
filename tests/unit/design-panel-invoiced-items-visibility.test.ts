import { describe, it } from 'node:test'
import assert from 'node:assert'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { DesignRepository } from '../../lib/repositories/design.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { DesignJobRecord } from '../../types/design.types.ts'

describe('Design Panel Invoiced Items Visibility & Tab Filtering Tests', () => {
  const TENANT_ID = `tenant-design-vis-${Date.now()}`

  it('1. Invoiced items with Design Required and Design OK appear in DesignRepository.getDesignJobs', async () => {
    // 1. Create Invoice with 3 items (1 ready, 1 design required, 1 design ok)
    const invoice = await BillingRepository.createInvoice({
      company_id: TENANT_ID,
      customer_name: 'Apex Pharma Ltd',
      customer_phone: '+8801755998877',
      customer_address: 'Mohakhali C/A, Dhaka',
      due_date: '2026-10-20',
      grand_total: 55000,
      paid_amount: 30000,
      due_amount: 25000,
      created_by_name: 'Cashier Agent',
      items: [
        {
          item_name: 'Display X-Stand 6x2.5ft',
          item_description: 'Display X-Stand 6x2.5ft (Ready Hardware)',
          quantity: 2,
          unit: 'pcs',
          unit_price: 2500,
          total_price: 5000,
          item_kind: 'ready_product',
          workflow_routing: 'ready_product',
          design_required: false,
        } as any,
        {
          item_name: 'Corporate Annual Report 2026',
          item_description: 'Corporate Annual Report Design & Print - 64 Pages',
          quantity: 500,
          unit: 'pcs',
          unit_price: 60,
          total_price: 30000,
          item_kind: 'custom_manufacturing',
          workflow_routing: 'design_required',
          design_required: true,
        } as any,
        {
          item_name: 'Branded Foil Packaging Box',
          item_description: 'Branded Foil Packaging Box - Customer Artwork Ready',
          quantity: 1000,
          unit: 'pcs',
          unit_price: 20,
          total_price: 20000,
          item_kind: 'custom_manufacturing',
          workflow_routing: 'design_ok',
          design_required: false,
        } as any,
      ],
    })

    assert.ok(invoice.id)
    assert.ok(invoice.invoice_number)

    // 2. Fetch Design Jobs for this tenant
    const jobs = await DesignRepository.getDesignJobs(TENANT_ID)
    assert.ok(jobs.length >= 2, `Design jobs must contain at least 2 jobs for custom items, found ${jobs.length}`)

    // 3. Verify Design Required job (Tab: Design Request)
    const designReqJob = jobs.find(
      (j) => j.invoice_id === invoice.id && (j.workflow_routing === 'design_required' || j.customer_approval_required === true)
    )
    assert.ok(designReqJob, 'Design Required item must be present in design jobs')
    assert.strictEqual(designReqJob.workflow_routing, 'design_required')
    assert.strictEqual(designReqJob.customer_approval_required, true)
    assert.strictEqual(designReqJob.status, 'received')
    assert.strictEqual(designReqJob.invoice_number, invoice.invoice_number)

    // 4. Verify Design OK job (Tab: Design Check)
    const designOkJob = jobs.find(
      (j) => j.invoice_id === invoice.id && j.workflow_routing === 'design_ok'
    )
    assert.ok(designOkJob, 'Design OK item must be present in design jobs')
    assert.strictEqual(designOkJob.workflow_routing, 'design_ok')
    assert.strictEqual(designOkJob.customer_approval_required, false)
    assert.strictEqual(designOkJob.invoice_number, invoice.invoice_number)
    assert.strictEqual(designOkJob.versions[0].proof_file_name, 'customer_artwork.pdf')

    // 5. Verify Tab Filtering Logic
    const designRequestsTab = jobs.filter(
      (j) => j.workflow_routing === 'design_required' || (!j.workflow_routing && j.status !== 'approved')
    )
    const designChecksTab = jobs.filter((j) => j.workflow_routing === 'design_ok')

    assert.ok(designRequestsTab.some((j) => j.id === designReqJob.id), 'Design Request tab must include design required item')
    assert.ok(designChecksTab.some((j) => j.id === designOkJob.id), 'Design Check tab must include design ok item')
  })
})
