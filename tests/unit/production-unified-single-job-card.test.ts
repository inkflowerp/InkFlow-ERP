import { describe, it } from 'node:test'
import assert from 'node:assert'
import type {
  ProductionTaskRecord,
  UnifiedProductionJob,
} from '../../types/production.types.ts'

describe('Production Unified Single Job Card Architecture', () => {
  it('1. Consolidates multiple operation tasks for the same order into a single unified job card', () => {
    const printTask: ProductionTaskRecord = {
      id: 'tsk-001-1',
      company_id: 'test-co',
      job_order_id: 'ord-item-009',
      task_number: 'TSK-009-1',
      task_name: 'Print: Order Artwork Design',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 100,
      unit: 'pcs',
      priority: 'normal',
      status: 'queued',
      job_number: 'INV-000009',
      invoice_number: 'INV-000009',
      customer_name: 'Shamol',
      customer_phone: '01711000000',
      product_name: 'Order Artwork Design',
      assigned_machine_name: 'Heidelberg Speedmaster',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const finishingTask: ProductionTaskRecord = {
      id: 'tsk-001-2',
      company_id: 'test-co',
      job_order_id: 'ord-item-009',
      task_number: 'TSK-009-2',
      task_name: 'Finishing & QC: Order Artwork Design',
      task_type: 'finishing',
      department: 'finishing',
      sequence_order: 2,
      quantity: 100,
      unit: 'pcs',
      priority: 'normal',
      status: 'queued',
      job_number: 'INV-000009',
      invoice_number: 'INV-000009',
      customer_name: 'Shamol',
      customer_phone: '01711000000',
      product_name: 'Order Artwork Design',
      assigned_machine_name: 'Manual (No Machine)',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const tasks = [finishingTask, printTask]

    // Simulate grouping logic from page.tsx
    const jobMap = new Map<string, UnifiedProductionJob>()
    for (const t of tasks) {
      const cleanJobNum = t.job_number || t.task_number.replace(/-[0-9]+$/, '')
      const groupKey =
        t.job_order_id ||
        t.production_job_id ||
        `${cleanJobNum}___${t.customer_name || 'anon'}___${t.product_name}`

      if (!jobMap.has(groupKey)) {
        jobMap.set(groupKey, {
          id: groupKey,
          jobNumber: cleanJobNum,
          orderNumber: (t as any).order_number || (cleanJobNum.startsWith('ORD-') ? cleanJobNum : null),
          invoiceNumber: t.invoice_number || (cleanJobNum.startsWith('INV-') ? cleanJobNum : null),
          title: t.product_name || t.task_name,
          productName: t.product_name || t.task_name,
          customerName: t.customer_name || 'Client',
          customerPhone: t.customer_phone,
          priority: t.priority,
          quantity: t.quantity || 1,
          unit: t.unit || 'pcs',
          status: t.status,
          tasks: [t],
          created_at: t.created_at,
        })
      } else {
        jobMap.get(groupKey)!.tasks.push(t)
      }
    }

    const unifiedJobs = Array.from(jobMap.values()).map((job) => {
      job.tasks.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
      const activeTask =
        job.tasks.find((t) => t.status === 'in_progress') ||
        job.tasks.find((t) => t.status !== 'completed' && t.status !== 'cancelled') ||
        job.tasks[0]
      return {
        ...job,
        activeTask,
      }
    })

    // Exactly 1 job card is generated instead of 2 separate cards!
    assert.strictEqual(unifiedJobs.length, 1)
    const job = unifiedJobs[0]
    assert.strictEqual(job.jobNumber, 'INV-000009')
    assert.strictEqual(job.customerName, 'Shamol')
    assert.strictEqual(job.tasks.length, 2)
    assert.strictEqual(job.tasks[0].task_name, 'Print: Order Artwork Design')
    assert.strictEqual(job.tasks[1].task_name, 'Finishing & QC: Order Artwork Design')
    // Active task is step 1 (printing)
    assert.strictEqual(job.activeTask?.task_type, 'printing')
    assert.strictEqual(job.activeTask?.assigned_machine_name, 'Heidelberg Speedmaster')
  })

  it('2. Advances active task to Finishing after Printing is marked completed in the single card', () => {
    const printDone: ProductionTaskRecord = {
      id: 'tsk-001-1',
      company_id: 'test-co',
      job_order_id: 'ord-item-009',
      task_number: 'TSK-009-1',
      task_name: 'Print: Order Artwork Design',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 100,
      unit: 'pcs',
      priority: 'normal',
      status: 'completed',
      job_number: 'INV-000009',
      customer_name: 'Shamol',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const finishingQueued: ProductionTaskRecord = {
      id: 'tsk-001-2',
      company_id: 'test-co',
      job_order_id: 'ord-item-009',
      task_number: 'TSK-009-2',
      task_name: 'Finishing & QC: Order Artwork Design',
      task_type: 'finishing',
      department: 'finishing',
      sequence_order: 2,
      quantity: 100,
      unit: 'pcs',
      priority: 'normal',
      status: 'queued',
      job_number: 'INV-000009',
      customer_name: 'Shamol',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const tasks = [printDone, finishingQueued]
    const activeTask =
      tasks.find((t) => t.status === 'in_progress') ||
      tasks.find((t) => t.status !== 'completed' && t.status !== 'cancelled')

    assert.strictEqual(activeTask?.task_type, 'finishing')
    assert.strictEqual(activeTask?.status, 'queued')
  })
})
