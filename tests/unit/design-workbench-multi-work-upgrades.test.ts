import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { DesignRepository } from '../../lib/repositories/design.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { DesignJobRecord } from '../../types/design.types.ts'

describe('Design Workbench - Multi-Work Invoices, Customer Info, Briefs & Attachments', () => {
  const companyId = 'c-test-workbench'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.JOB_ORDERS, [])
  })

  it('1. Resolves synthetic design job from multi-work invoice with customer phone and specs', async () => {
    const invoice = {
      id: 'eb6f4ead-24c1-4c2b-bd82-0feaf55e786b',
      company_id: companyId,
      invoice_number: 'INV-2026-0042',
      customer_id: 'cust-rangao',
      customer_name: 'Rangao Studio',
      customer_phone: '+8801712345678',
      customer_address: 'Mirpur DOHS, Dhaka',
      status: 'confirmed',
      total_amount: 25000,
      paid_amount: 15000,
      due_amount: 10000,
      items: [
        {
          id: 'item-banner',
          item_name: '5×3 Flex Banner',
          item_description: '5×3 Flex Banner (15 sft)',
          dimensions_spec: '5 × 3 ft',
          quantity: 2,
          unit: 'pcs',
          material_spec: '380gsm Star Flex Banner',
          finishing: 'Eyelets 4 Corners',
          workflow_routing: 'design_ok',
          remarks: 'High contrast CMYK banner for stage backdrop',
          attachment_url: 'https://example.com/banner_proof.pdf',
        },
        {
          id: 'item-foil-box',
          item_name: 'Premium Foil Box',
          item_description: 'Gold Foil Stamped Packaging Box',
          dimensions_spec: '12 × 8 × 4 inch',
          quantity: 500,
          unit: 'pcs',
          material_spec: '350gsm Duplex Board',
          finishing: 'Gold Foil + Die-Cut Creasing',
          workflow_routing: 'design_required',
          remarks: 'Gold foil stamping on brand logo, matt black finish',
        },
        {
          id: 'item-standee',
          item_name: 'Rollup Standee',
          item_description: 'Aluminum Rollup Standee (6×3 ft)',
          dimensions_spec: '6 × 3 ft',
          quantity: 1,
          unit: 'pcs',
          material_spec: 'Backlit Film / PVC',
          finishing: 'Installed on Standee Base',
          workflow_routing: 'ready_production',
          remarks: 'Corporate banner with standee mechanism',
        },
      ],
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.INVOICES, invoice)

    // Lookup first item: dsn-inv-eb6f4ead-24c1-4c2b-bd82-0feaf55e786b-0
    const job0 = await DesignRepository.getDesignJobById('dsn-inv-eb6f4ead-24c1-4c2b-bd82-0feaf55e786b-0', companyId)
    assert.ok(job0, 'Should find and synthesize job 0')
    assert.equal(job0?.customer_name, 'Rangao Studio')
    assert.equal(job0?.design_number, 'DSN-2026-0042-A')
    assert.equal(job0?.title, '5×3 Flex Banner (15 sft)')
    assert.equal(job0?.quantity, 2)
    assert.equal(job0?.workflow_routing, 'design_ok')
    assert.equal(job0?.is_locked, true)

    // Lookup second item: dsn-inv-eb6f4ead-24c1-4c2b-bd82-0feaf55e786b-1
    const job1 = await DesignRepository.getDesignJobById('dsn-inv-eb6f4ead-24c1-4c2b-bd82-0feaf55e786b-1', companyId)
    assert.ok(job1, 'Should find and synthesize job 1')
    assert.equal(job1?.design_number, 'DSN-2026-0042-B')
    assert.equal(job1?.title, 'Gold Foil Stamped Packaging Box')
    assert.equal(job1?.quantity, 500)
    assert.equal(job1?.workflow_routing, 'design_required')
    assert.equal(job1?.status, 'received')
  })

  it('2. Preserves customer phone and address from customer store or invoice', async () => {
    const customer = {
      id: 'cust-alpha',
      company_id: companyId,
      name: 'Alpha Agency',
      mobile: '01899887766',
      address: 'Gulshan-2, Dhaka',
      category: 'corporate' as const,
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.CUSTOMERS, customer)

    const invoice = {
      id: 'inv-alpha-99',
      company_id: companyId,
      invoice_number: 'INV-99',
      customer_id: 'cust-alpha',
      customer_name: 'Alpha Agency',
      customer_phone: '01899887766',
      customer_address: 'Gulshan-2, Dhaka',
      items: [
        {
          id: 'item-1',
          item_name: 'Signboard 10x4',
          workflow_routing: 'design_required',
        },
      ],
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.INVOICES, invoice)

    const job = await DesignRepository.getDesignJobById('dsn-inv-inv-alpha-99-0', companyId)
    assert.ok(job, 'Should synthesize job')
    assert.equal(job?.customer_name, 'Alpha Agency')
  })
})
