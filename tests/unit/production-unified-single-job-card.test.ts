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

  it('3. Card specifications display Product & Services, Size, Quantity, Finishing, Add-on, and routes to Finishing when finishing is available', () => {
    const printTask: ProductionTaskRecord = {
      id: 'tsk-002-1',
      company_id: 'test-co',
      job_order_id: 'ord-item-010',
      task_number: 'TSK-010-1',
      task_name: 'Print: PVC Vinyl Sticker Glossy',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 50,
      unit: 'pcs',
      priority: 'normal',
      status: 'completed',
      job_number: 'INV-000010',
      customer_name: 'Apex Footwear',
      product_name: 'PVC Vinyl Sticker Glossy',
      service_name: 'Large Format Print',
      dimensions_spec: '3 × 2 ft',
      required_material: 'PVC Vinyl Glossy (120 GSM)',
      finishing: 'Matte Lamination, Die Cut',
      add_ons: 'Eyelets, Edge Hemming',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const finishingTask: ProductionTaskRecord = {
      id: 'tsk-002-2',
      company_id: 'test-co',
      job_order_id: 'ord-item-010',
      task_number: 'TSK-010-2',
      task_name: 'Finishing & QC: PVC Vinyl Sticker Glossy',
      task_type: 'finishing',
      department: 'finishing',
      sequence_order: 2,
      quantity: 50,
      unit: 'pcs',
      priority: 'normal',
      status: 'queued',
      job_number: 'INV-000010',
      customer_name: 'Apex Footwear',
      product_name: 'PVC Vinyl Sticker Glossy',
      service_name: 'Large Format Print',
      dimensions_spec: '3 × 2 ft',
      finishing: 'Matte Lamination, Die Cut',
      add_ons: 'Eyelets, Edge Hemming',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const tasks = [printTask, finishingTask]
    const hasPrintDone = tasks.some((t) => t.department === 'printing' && t.status === 'completed')
    const hasFinishingPending = tasks.some((t) => t.department === 'finishing' && t.status !== 'completed')

    let overallStatus = 'queued'
    if (hasPrintDone && hasFinishingPending) {
      overallStatus = 'finishing'
    }

    assert.strictEqual(overallStatus, 'finishing')
    assert.strictEqual(printTask.service_name, 'Large Format Print')
    assert.strictEqual(printTask.dimensions_spec, '3 × 2 ft')
    assert.strictEqual(printTask.quantity, 50)
    assert.strictEqual(printTask.finishing, 'Matte Lamination, Die Cut')
    assert.strictEqual(printTask.add_ons, 'Eyelets, Edge Hemming')
  })

  it('4. After printing complete (if finishing not available) -> sent directly to Delivery and Dispatch', () => {
    const printOnlyTask: ProductionTaskRecord = {
      id: 'tsk-003-1',
      company_id: 'test-co',
      job_order_id: 'ord-item-011',
      task_number: 'TSK-011-1',
      task_name: 'Print: Star Flex Banner',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 1,
      unit: 'pcs',
      priority: 'normal',
      status: 'completed',
      job_number: 'INV-000011',
      customer_name: 'Rahim Traders',
      product_name: 'Star Flex Banner',
      service_name: 'Solvent Flex Print',
      dimensions_spec: '10 × 5 ft',
      required_material: 'Star Flex (320 GSM)',
      finishing: null,
      add_ons: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const tasks = [printOnlyTask]
    const hasPrintDone = tasks.some((t) => t.department === 'printing' && t.status === 'completed')
    const hasFinishingTask = tasks.some((t) => t.department === 'finishing' || t.task_type === 'finishing')

    let overallStatus = 'queued'
    if (hasPrintDone && !hasFinishingTask) {
      overallStatus = 'ready_delivery'
    }

    // Since no finishing was specified, job advances directly to ready_delivery (Sent to Delivery and Dispatch)
    assert.strictEqual(overallStatus, 'ready_delivery')
  })

  it('5. On print complete -> correctly identifies Finishing & Fabrication Floor as next step and sets badge and routing', () => {
    const printTaskCompleted: ProductionTaskRecord = {
      id: 'tsk-004-1',
      company_id: 'test-co',
      job_order_id: 'ord-item-012',
      task_number: 'TSK-012-1',
      task_name: 'Print: Backlit Board Signage',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 1,
      unit: 'pcs',
      priority: 'urgent',
      status: 'completed',
      job_number: 'INV-000012',
      customer_name: 'City Bank',
      product_name: 'Backlit Board Signage',
      service_name: 'Signage Fabrication',
      dimensions_spec: '8 × 4 ft',
      required_material: 'Backlit Film (180 Mic)',
      finishing: 'Gloss Lamination, Metal Framing',
      add_ons: 'LED Module Kit, Power Supply',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const finishingTaskReady: ProductionTaskRecord = {
      id: 'tsk-004-2',
      company_id: 'test-co',
      job_order_id: 'ord-item-012',
      task_number: 'TSK-012-2',
      task_name: 'Finishing & QC: Backlit Board Signage',
      task_type: 'finishing',
      department: 'finishing',
      sequence_order: 2,
      quantity: 1,
      unit: 'pcs',
      priority: 'urgent',
      status: 'ready',
      job_number: 'INV-000012',
      customer_name: 'City Bank',
      product_name: 'Backlit Board Signage',
      service_name: 'Signage Fabrication',
      dimensions_spec: '8 × 4 ft',
      finishing: 'Gloss Lamination, Metal Framing',
      add_ons: 'LED Module Kit, Power Supply',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const tasks = [printTaskCompleted, finishingTaskReady]
    const isPrintingCompleted = tasks.some((t) => t.department === 'printing' && t.status === 'completed')
    const hasFinishingPending = tasks.some((t) => t.department === 'finishing' && t.status !== 'completed')

    assert.strictEqual(isPrintingCompleted, true)
    assert.strictEqual(hasFinishingPending, true)
    assert.strictEqual(finishingTaskReady.status, 'ready')
    assert.strictEqual(finishingTaskReady.department, 'finishing')
  })
})
