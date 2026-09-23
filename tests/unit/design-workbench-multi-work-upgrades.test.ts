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

  it('1. Retrieves genuine design jobs without synthesizing phantom jobs from invoice', async () => {
    // Non-existent job returns null
    const notFound = await DesignRepository.getDesignJobById('dsn-nonexistent', companyId)
    assert.strictEqual(notFound, null, 'Querying non-existent design job should return null')

    // Create a genuine design job
    const createdJob = await DesignRepository.createDesignJob({
      id: 'dsn-real-0042-a',
      company_id: companyId,
      customer_id: 'cust-rangao',
      customer_name: 'Rangao Studio',
      customer_phone: '+8801712345678',
      customer_address: 'Mirpur DOHS, Dhaka',
      design_number: 'DSN-2026-0042-A',
      title: '5×3 Flex Banner (15 sft)',
      quantity: 2,
      workflow_routing: 'design_ok',
      is_locked: true,
      status: 'received',
    } as any)

    const job0 = await DesignRepository.getDesignJobById(createdJob.id, companyId)
    assert.ok(job0, 'Should find created job')
    assert.equal(job0?.customer_name, 'Rangao Studio')
    assert.equal(job0?.design_number, 'DSN-2026-0042-A')
    assert.equal(job0?.title, '5×3 Flex Banner (15 sft)')
    assert.equal(job0?.quantity, 2)
    assert.equal(job0?.workflow_routing, 'design_ok')
    assert.equal(job0?.is_locked, true)
  })

  it('2. Preserves customer phone and address on created design job', async () => {
    const customer = {
      id: 'cust-alpha',
      company_id: companyId,
      name: 'Alpha Agency',
      mobile: '01899887766',
      address: 'Gulshan-2, Dhaka',
      category: 'corporate' as const,
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.CUSTOMERS, customer)

    const createdJob = await DesignRepository.createDesignJob({
      id: 'dsn-alpha-99-0',
      company_id: companyId,
      customer_id: 'cust-alpha',
      customer_name: 'Alpha Agency',
      customer_phone: '01899887766',
      customer_address: 'Gulshan-2, Dhaka',
      design_number: 'DSN-99-A',
      title: 'Signboard 10x4',
      workflow_routing: 'design_required',
      status: 'received',
    } as any)

    const job = await DesignRepository.getDesignJobById(createdJob.id, companyId)
    assert.ok(job, 'Should find created job')
    assert.equal(job?.customer_name, 'Alpha Agency')
    assert.equal(job?.customer_phone, '01899887766')
    assert.equal(job?.customer_address, 'Gulshan-2, Dhaka')
  })

  it('3. Accurately preserves multi-work item specifications with selected_finishing, selected_add_ons, area, and prices', async () => {
    const createdJob = await DesignRepository.createDesignJob({
      id: 'dsn-box-0088-b',
      company_id: companyId,
      invoice_number: 'INV-2026-0088',
      customer_id: 'cust-rangao-brand',
      customer_name: 'Rangao Brand Ltd',
      customer_phone: '01700112233',
      customer_address: 'Banani, Dhaka',
      design_number: 'DSN-2026-0088-B',
      title: 'Luxury Matt Black Foil Box (Custom Die Cut)',
      dimensions_spec: '8 × 6 × 2.5 inch',
      quantity: 250,
      unit: 'pcs',
      unit_price: 120,
      total_price: 30000,
      material: '350gsm Matte Black Board',
      item_kind: 'Packaging',
      selected_finishing: [
        { id: 'fin-1', name: 'Gold Foil Stamping', cost: 1500 },
        { id: 'fin-2', name: 'Die-Cut & Creasing', cost: 1200 },
        { id: 'fin-3', name: 'Thermal Matt Lamination', cost: 800 },
      ],
      selected_add_ons: [
        { id: 'addon-1', name: 'Velvet Inner Foam Pad', cost: 500 },
      ],
      instructions: 'Ensure 3mm bleed margin for die cut folds. CMYK high contrast.',
      workflow_routing: 'design_required',
      status: 'received',
    } as any)

    const job1 = await DesignRepository.getDesignJobById(createdJob.id, companyId)
    assert.ok(job1, 'Should find created job')
    assert.equal(job1?.design_number, 'DSN-2026-0088-B')
    assert.equal(job1?.title, 'Luxury Matt Black Foil Box (Custom Die Cut)')
    assert.equal(job1?.quantity, 250)
    assert.equal(job1?.unit_price, 120)
    assert.equal(job1?.total_price, 30000)
    assert.equal(job1?.material, '350gsm Matte Black Board')
    assert.equal(job1?.item_kind, 'Packaging')
    assert.equal(job1?.selected_finishing?.length, 3)
    assert.equal(job1?.selected_add_ons?.length, 1)
    assert.equal(job1?.instructions, 'Ensure 3mm bleed margin for die cut folds. CMYK high contrast.')
    assert.equal(job1?.workflow_routing, 'design_required')
  })
})
