import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { DesignRepository } from '../../lib/repositories/design.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { DesignJobRecord } from '../../types/design.types.ts'

describe('Design Panel - Invoice Design Required & Design OK Intake Tests', () => {
  const companyId = 'c-test-intake-99'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.JOB_ORDERS, [])
  })

  it('1. Correctly brings invoice item with workflow_routing="design_required" into Design Panel as a new task', async () => {
    const invoice = {
      id: 'inv-test-req-01',
      company_id: companyId,
      invoice_number: 'INV-2026-9001',
      customer_id: 'cust-01',
      customer_name: 'Beximco Pharma',
      customer_phone: '01711223344',
      status: 'confirmed',
      total_amount: 15000,
      items: [
        {
          id: 'item-brochure',
          item_name: 'Medical Product Brochure',
          item_description: 'Tri-fold glossy brochure (A4)',
          dimensions_spec: 'A4 3-Fold',
          quantity: 1000,
          unit: 'pcs',
          material: '150 GSM Glossy Art Paper',
          workflow_routing: 'design_required',
          design_required: true,
        },
      ],
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.INVOICES, invoice)

    await DesignRepository.createDesignJob({
      id: 'dsn-test-req-01',
      company_id: companyId,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer_id: invoice.customer_id,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      title: 'Tri-fold glossy brochure (A4)',
      workflow_routing: 'design_required',
      status: 'received',
      all_invoice_items: invoice.items,
    } as any)

    const jobs = await DesignRepository.getDesignJobs(companyId)
    assert.equal(jobs.length, 1, 'Should find 1 design job from invoice')
    assert.equal(jobs[0].title, 'Tri-fold glossy brochure (A4)')
    assert.equal(jobs[0].customer_name, 'Beximco Pharma')
    assert.equal(jobs[0].workflow_routing, 'design_required')
    assert.equal(jobs[0].status, 'received', 'Must have status received to appear in Tab 1: New Tasks')
  })

  it('2. Correctly brings invoice item with workflow_routing="design_ok" (Design Check) into Design Panel Tab 1 for pre-press checking', async () => {
    const invoice = {
      id: 'inv-test-ok-02',
      company_id: companyId,
      invoice_number: 'INV-2026-9002',
      customer_id: 'cust-02',
      customer_name: 'Akij Group',
      customer_phone: '01811223344',
      status: 'confirmed',
      total_amount: 45000,
      items: [
        {
          id: 'item-banner',
          item_name: 'Star Flex Billboard',
          item_description: '20×10 ft Billboard Flex Print',
          dimensions_spec: '20 × 10 ft',
          quantity: 2,
          unit: 'pcs',
          material: '380 GSM Star Flex',
          workflow_routing: 'design_ok',
          design_required: false,
        },
      ],
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.INVOICES, invoice)

    await DesignRepository.createDesignJob({
      id: 'dsn-test-ok-02',
      company_id: companyId,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer_id: invoice.customer_id,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      title: '20×10 ft Billboard Flex Print',
      workflow_routing: 'design_ok',
      status: 'received',
      all_invoice_items: invoice.items,
    } as any)

    const jobs = await DesignRepository.getDesignJobs(companyId)
    assert.equal(jobs.length, 1, 'Should find 1 design job for Design Check')
    assert.equal(jobs[0].title, '20×10 ft Billboard Flex Print')
    assert.equal(jobs[0].workflow_routing, 'design_ok')
    assert.equal(
      jobs[0].status,
      'received',
      'Design OK items MUST start in status received so pre-press designers can verify CMYK, 300 DPI, Bleed, Curves in Tab 1'
    )
  })

  it('3. Ingests multiple items from multi-work invoice with mixed design_required and design_ok', async () => {
    const invoice = {
      id: 'inv-test-multi-03',
      company_id: companyId,
      invoice_number: 'INV-2026-9003',
      customer_id: 'cust-03',
      customer_name: 'Pran-RFL Group',
      customer_phone: '01911223344',
      status: 'confirmed',
      total_amount: 80000,
      items: [
        {
          id: 'item-packaging-box',
          item_name: 'Juice Box Packaging',
          item_description: 'Custom Juice Box with Die-Cut Crease',
          dimensions_spec: '6 × 4 × 2 inch',
          quantity: 5000,
          unit: 'pcs',
          workflow_routing: 'design_required',
          design_required: true,
        },
        {
          id: 'item-hanger-tag',
          item_name: 'Product Hang Tag',
          item_description: 'Hang Tag 350 GSM Matte Lamination',
          dimensions_spec: '3.5 × 2 inch',
          quantity: 10000,
          unit: 'pcs',
          workflow_routing: 'design_ok',
          design_required: false,
        },
        {
          id: 'item-ready-standee',
          item_name: 'Rollup Standee Base',
          quantity: 2,
          unit: 'pcs',
          workflow_routing: 'ready_product',
          item_kind: 'ready_product',
          design_required: false,
        },
      ],
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.INVOICES, invoice)

    await DesignRepository.createDesignJob({
      id: 'dsn-test-multi-box',
      company_id: companyId,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer_id: invoice.customer_id,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      title: 'Custom Juice Box with Die-Cut Crease',
      workflow_routing: 'design_required',
      status: 'received',
      all_invoice_items: invoice.items,
    } as any)

    await DesignRepository.createDesignJob({
      id: 'dsn-test-multi-tag',
      company_id: companyId,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer_id: invoice.customer_id,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      title: 'Hang Tag 350 GSM Matte Lamination',
      workflow_routing: 'design_ok',
      status: 'received',
      all_invoice_items: invoice.items,
    } as any)

    const jobs = await DesignRepository.getDesignJobs(companyId)
    assert.equal(jobs.length, 2, 'Should ingest exactly 2 design jobs (excluding ready_product)')

    const boxJob = jobs.find((j) => j.title === 'Custom Juice Box with Die-Cut Crease')
    assert.ok(boxJob, 'Packaging box design required job must exist')
    assert.equal(boxJob.workflow_routing, 'design_required')
    assert.equal(boxJob.status, 'received')

    const tagJob = jobs.find((j) => j.title === 'Hang Tag 350 GSM Matte Lamination')
    assert.ok(tagJob, 'Hang tag design ok job must exist')
    assert.equal(tagJob.workflow_routing, 'design_ok')
    assert.equal(tagJob.status, 'received')
  })
})
