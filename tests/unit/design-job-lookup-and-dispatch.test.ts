import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { DesignRepository } from '../../lib/repositories/design.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { DesignJobRecord } from '../../types/design.types.ts'

describe('Graphic Design Studio - Design Job Lookup & Print Dispatch Hardening', () => {
  const companyId = 'c-test-design-lookup'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.JOB_ORDERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_JOBS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, [])
  })

  it('1. Retrieves design job by exact UUID id', async () => {
    const job: DesignJobRecord = {
      id: 'uuid-job-1111',
      company_id: companyId,
      design_number: 'DSN-000001',
      customer_id: 'cust-1',
      customer_name: 'Apex Ltd',
      title: 'Backlit Signboard',
      status: 'customer_approval',
      current_version: 1,
      invoice_id: 'inv-1',
      invoice_number: 'INV-000001',
      commercial_status: 'invoice_created',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.DESIGN_JOBS, job)

    const found = await DesignRepository.getDesignJobById('uuid-job-1111', companyId)
    assert.ok(found, 'Should find design job by UUID')
    assert.equal(found?.design_number, 'DSN-000001')
  })

  it('2. Retrieves design job by design_number (e.g., DSN-000003)', async () => {
    const job: DesignJobRecord = {
      id: 'uuid-job-3333',
      company_id: companyId,
      design_number: 'DSN-000003',
      customer_id: 'cust-2',
      customer_name: 'Beximco Corp',
      title: 'PVC Print',
      status: 'approved',
      is_locked: true,
      current_version: 1,
      invoice_id: 'inv-3',
      invoice_number: 'INV-000003',
      commercial_status: 'invoice_created',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.DESIGN_JOBS, job)

    // Lookup using design number instead of UUID
    const found = await DesignRepository.getDesignJobById('DSN-000003', companyId)
    assert.ok(found, 'Should find design job by design_number DSN-000003')
    assert.equal(found?.id, 'uuid-job-3333')
    assert.equal(found?.title, 'PVC Print')
  })

  it('3. Dynamically synthesizes design job from invoices when not present in DESIGN_JOBS', async () => {
    // Only invoice exists in storage
    const invoice = {
      id: 'inv-000003',
      company_id: companyId,
      invoice_number: 'INV-000003',
      customer_id: 'cust-3',
      customer_name: 'Square Textiles',
      status: 'confirmed',
      items: [
        {
          id: 'item-1',
          item_name: 'PVC Print',
          item_description: 'PVC Print (55 × 10 sft)',
          dimensions_spec: '55 × 10 sft',
          quantity: 1,
          unit: 'sft',
          workflow_routing: 'ready_production',
        },
      ],
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.INVOICES, invoice)

    // Attempt to lookup DSN-000003
    const found = await DesignRepository.getDesignJobById('DSN-000003', companyId)
    assert.ok(found, 'Should synthesize and return design job for DSN-000003 from invoice')
    assert.equal(found?.design_number, 'DSN-000003')
    assert.equal(found?.invoice_number, 'INV-000003')
    assert.equal(found?.customer_name, 'Square Textiles')
  })

  it('4. sendToPrintOperator successfully releases DSN-000003 to production and generates tasks', async () => {
    const job: DesignJobRecord = {
      id: 'uuid-job-send-print',
      company_id: companyId,
      design_number: 'DSN-000003',
      customer_id: 'cust-4',
      customer_name: 'Square Pharmaceuticals',
      title: 'PVC Print',
      status: 'approved',
      is_locked: true,
      current_version: 1,
      invoice_id: 'inv-000003',
      invoice_number: 'INV-000003',
      commercial_status: 'invoice_created',
      workflow_routing: 'ready_production',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.DESIGN_JOBS, job)

    // Call sendToPrintOperator with design_number 'DSN-000003'
    const result = await DesignRepository.sendToPrintOperator('DSN-000003', companyId)
    assert.equal(result.success, true, `sendToPrintOperator should succeed: ${result.error}`)
    assert.ok(result.designJob)
    assert.equal(result.designJob?.status, 'approved')
    assert.equal(result.designJob?.workflow_routing, 'ready_production')

    // Verify job orders and production tasks are created/queued
    const jobOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.JOB_ORDERS) || []
    assert.ok(jobOrders.length > 0, 'Job order should be queued')
    assert.equal(jobOrders[0].production_gate_status, 'ready_for_production')

    const prodTasks = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    assert.ok(prodTasks.length >= 2, 'Production tasks for printing and finishing should be queued')
    assert.equal(prodTasks[0].is_blocked_by_design_gate, false)
    assert.equal(prodTasks[0].is_blocked_by_commercial_gate, false)
  })
})
