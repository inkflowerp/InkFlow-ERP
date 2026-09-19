import { describe, it } from 'node:test'
import assert from 'node:assert'
import { BillingService } from '../../services/billing.service.ts'
import { DesignService } from '../../services/design.service.ts'
import { ProductionPlanningService } from '../../services/production-planning.service.ts'
import { ProductionTaskRepository } from '../../lib/repositories/production-task.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Invoice Created + Design Approved -> Production Planning & Shop Floor Terminal E2E', () => {
  const companyId = `comp-prod-flow-${Date.now()}`

  it('1. Invoice with design_required=true generates design job with invoice linkage', async () => {
    const invoice = await BillingService.createInvoice({
      company_id: companyId,
      customer_name: 'Apex Footwear Ltd.',
      customer_phone: '+8801711998877',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      grand_total: 15000,
      created_by_name: 'Billing Manager',
      items: [
        {
          item_name: 'Backlit Signboard (Backlit Film)',
          item_description: 'Backlit Signboard (Backlit Film)',
          quantity: 2,
          unit: 'pcs',
          unit_price: 7500,
          total_price: 15000,
          design_required: true,
          customer_approval_required: true,
        } as any,
      ],
    })

    assert.ok(invoice.id)
    assert.ok(invoice.invoice_number)

    // Check Design Job created
    const designJobs = await DesignService.getJobs(companyId)
    const matchingJob = designJobs.find((dj) => dj.invoice_id === invoice.id || dj.invoice_number === invoice.invoice_number)
    assert.ok(matchingJob, 'Design job should be automatically created for invoice line item')
    assert.strictEqual(matchingJob.commercial_status, 'invoice_created')
    assert.strictEqual(matchingJob.status, 'received')
  })

  it('2. Design version is added and customer approved -> Production tasks appear unblocked in Planning & Operator Queue', async () => {
    const designJobs = await DesignService.getJobs(companyId)
    const job = designJobs[0]
    assert.ok(job)

    // Add high-res proof version
    const version = await DesignService.addVersion({
      company_id: companyId,
      design_job_id: job.id,
      version_number: 1,
      file_name: 'Apex_Backlit_Final.pdf',
      file_url: 'https://storage.printerp.com/designs/apex_final.pdf',
      created_by_name: 'Designer Rifat',
    })

    // Approve the artwork
    await DesignService.updateVersionApproval({
      company_id: companyId,
      design_job_id: job.id,
      version_id: version.id,
      approval_status: 'approved',
      customer_feedback: 'Approved by Marketing GM over email',
    })

    // Now query Production Planning Service
    const tasks = await ProductionPlanningService.getTasks(companyId)
    assert.ok(tasks.length >= 2, 'Should contain at least Print and Finishing tasks')

    const printTask = tasks.find((t) => t.task_type === 'printing' || t.department === 'printing')
    assert.ok(printTask, 'Print task must exist')
    assert.strictEqual(printTask.is_blocked_by_commercial_gate, false, 'Commercial gate must be cleared because invoice exists')
    assert.strictEqual(printTask.is_blocked_by_design_gate, false, 'Design gate must be cleared because design is approved')
    assert.strictEqual(printTask.customer_name, 'Apex Footwear Ltd.')
    assert.ok(printTask.product_name, 'Product name must be populated')

    // Operator starts print task
    const started = await ProductionPlanningService.startTask(printTask.id, companyId, 'op-01', 'Operator Jamal')
    assert.strictEqual(started.status, 'in_progress')
    assert.ok(started.actual_start)

    // Operator completes print task
    const completed = await ProductionPlanningService.completeTask(printTask.id, companyId, {
      good_quantity: 2,
      rejected_quantity: 0,
      notes: 'Printed on UV flatbed, flawless output',
    })
    assert.strictEqual(completed.completedTask.status, 'completed')
  })

  it('3. Direct invoice with ready-to-print items (design_required=false) immediately appears unblocked in Production Board', async () => {
    const directCompanyId = `comp-direct-${Date.now()}`
    const invoice = await BillingService.createInvoice({
      company_id: directCompanyId,
      customer_name: 'Square Textiles',
      customer_phone: '+8801822334455',
      due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      grand_total: 5000,
      created_by_name: 'Counter Sales',
      items: [
        {
          item_name: 'Standard PVC Banner',
          item_description: 'Standard PVC Banner',
          quantity: 10,
          unit: 'pcs',
          unit_price: 500,
          total_price: 5000,
          design_required: false,
        } as any,
      ],
    })

    assert.ok(invoice.id)

    const tasks = await ProductionPlanningService.getTasks(directCompanyId)
    assert.ok(tasks.length > 0, 'Production tasks should be immediately provisioned for ready items')

    const task = tasks[0]
    assert.strictEqual(task.is_blocked_by_commercial_gate, false)
    assert.strictEqual(task.is_blocked_by_design_gate, false)
    assert.strictEqual(task.status, 'queued')
  })
})
