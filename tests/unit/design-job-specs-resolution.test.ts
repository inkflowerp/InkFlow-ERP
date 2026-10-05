import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { resolveDesignJobSpecs, inferMaterialFromItemName } from '../../components/design/types.ts'
import { DesignRepository } from '../../lib/repositories/design.repository.ts'
import { PrintFlowDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { DesignJobRecord } from '../../types/design.types.ts'

describe('Design Panel Job Information & Specifications Resolution', () => {
  const companyId = 'comp-design-test-01'

  beforeEach(() => {
    PrintFlowDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [])
    PrintFlowDataStore.set(STORAGE_KEYS.INVOICES, [])
    PrintFlowDataStore.set(STORAGE_KEYS.ORDERS, [])
  })

  it('1. Correctly resolves structured 6-field specifications from invoice item', () => {
    const job: DesignJobRecord = {
      id: 'dsn-test-01',
      company_id: companyId,
      design_number: 'DSN-000011',
      title: 'Order Artwork Design', // generic fallback title
      customer_name: 'Asif',
      customer_phone: '0155555',
      status: 'received',
      priority: 'normal',
      deadline: '2026-10-04',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      versions: [],
    }

    const allInvoiceItems = [
      {
        id: 'inv-item-1',
        item_name: 'Eco Vinyl Print',
        material_spec: 'Self-Adhesive Glossy Vinyl',
        dimensions_spec: '8 × 3 ft',
        quantity: 1,
        unit: 'pcs',
        finishing: 'Gloss Lamination',
        selected_add_ons: [{ id: 'a1', name: 'Paper Tube Packaging' }],
      },
    ]

    const specs = resolveDesignJobSpecs(job, allInvoiceItems)

    assert.equal(specs.serviceName, 'Eco Vinyl Print', 'Should resolve actual item name instead of generic "Order Artwork Design"')
    assert.equal(specs.material, 'Self-Adhesive Glossy Vinyl', 'Should resolve real material spec')
    assert.equal(specs.size, '8 × 3 ft', 'Should resolve real dimensions')
    assert.equal(specs.quantity, '1 pcs', 'Should format quantity with pcs')
    assert.equal(specs.finishing, 'Gloss Lamination', 'Should resolve finishing')
    assert.equal(specs.addOn, 'Paper Tube Packaging', 'Should resolve add-on')
  })

  it('2. Never displays fake fallback text like "8 x 3 ft · 1 pcs · Acrylic + ACP" or "10 x 4 ft · 1 pcs"', () => {
    const job: DesignJobRecord = {
      id: 'dsn-test-02',
      company_id: companyId,
      design_number: 'DSN-000012',
      title: 'Corporate Visiting Cards',
      customer_name: 'Rahim',
      status: 'received',
      priority: 'urgent',
      deadline: '2026-10-01',
      dimensions_spec: null, // missing dimensions
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      versions: [],
    }

    const specs = resolveDesignJobSpecs(job, [])

    assert.notEqual(specs.size, '8 x 3 ft · 1 pcs · Acrylic + ACP')
    assert.notEqual(specs.size, '10 x 4 ft · 1 pcs')
    assert.notEqual(specs.material, 'Acrylic + ACP')
    assert.equal(specs.serviceName, 'Corporate Visiting Cards')
    assert.equal(specs.material, '300gsm Matt Art Card', 'Infers material from visiting card')
    assert.equal(specs.size, 'Standard Specification', 'Clean fallback when dimensions are unspecified')
    assert.equal(specs.finishing, 'None', 'None when missing')
    assert.equal(specs.addOn, 'None', 'None when missing')
  })

  it('3. Ingests and auto-heals INV-000011 stored design jobs with real invoice information', async () => {
    const invoice = {
      id: 'inv-000011-id',
      company_id: companyId,
      invoice_number: 'INV-000011',
      customer_name: 'Asif',
      customer_phone: '0155555',
      items: [
        {
          id: 'item-inv-11',
          item_name: 'Star Flex Banner',
          material_spec: 'Star Flex Media (380 GSM)',
          dimensions_spec: '10 × 4 ft',
          quantity: 2,
          unit: 'pcs',
          finishing: 'Eyelet Punching',
          workflow_routing: 'design_required',
          design_required: true,
        },
      ],
      created_at: new Date().toISOString(),
    }
    PrintFlowDataStore.set(STORAGE_KEYS.INVOICES, [invoice])

    // Suppose an existing stored design job previously had generic title and missing specs
    const staleJob: DesignJobRecord = {
      id: 'dsn-stale-01',
      company_id: companyId,
      design_number: 'DSN-000011',
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer_name: 'Asif',
      customer_phone: '0155555',
      title: 'Order Artwork Design', // previously stored generic fallback
      dimensions_spec: null, // previously missing
      material: null,
      status: 'received',
      priority: 'normal',
      deadline: '2026-10-04',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      versions: [],
    }
    PrintFlowDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [staleJob])

    // Load jobs through DesignRepository
    const loadedJobs = await DesignRepository.getDesignJobs(companyId)
    assert.equal(loadedJobs.length, 1)

    const healedJob = loadedJobs[0]
    assert.equal(healedJob.title, 'Star Flex Banner', 'Should be auto-healed with real item name from invoice')
    assert.equal(healedJob.dimensions_spec, '10 × 4 ft', 'Should be auto-healed with real dimensions from invoice')
    assert.equal(healedJob.material, 'Star Flex Media (380 GSM)', 'Should be auto-healed with real material')
    assert.equal(healedJob.finishing, 'Eyelet Punching', 'Should be auto-healed with real finishing')
    assert.ok(healedJob.all_invoice_items && healedJob.all_invoice_items.length === 1, 'Should attach all_invoice_items')

    // Resolving specs on healed job
    const specs = resolveDesignJobSpecs(healedJob, healedJob.all_invoice_items)
    assert.equal(specs.serviceName, 'Star Flex Banner')
    assert.equal(specs.material, 'Star Flex Media (380 GSM)')
    assert.equal(specs.size, '10 × 4 ft')
    assert.equal(specs.quantity, '2 pcs')
    assert.equal(specs.finishing, 'Eyelet Punching')
  })
})
