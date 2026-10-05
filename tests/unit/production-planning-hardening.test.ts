import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ProductionPlanningService } from '../../services/production-planning.service.ts'
import { ProductionTaskRepository } from '../../lib/repositories/production-task.repository.ts'
import { MachineryRepository } from '../../lib/repositories/machinery.repository.ts'
import { OrderRepository } from '../../lib/repositories/order.repository.ts'
import { PrintFlowDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Production Planning Hardening & Workflow Automation Tests', () => {
  const companyId = 'comp-hardening-01'

  beforeEach(() => {
    PrintFlowDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, [], false)
    PrintFlowDataStore.set(STORAGE_KEYS.JOB_ORDERS, [], false)
    PrintFlowDataStore.set(STORAGE_KEYS.MACHINERIES, [], false)
  })

  it('1. Section 20 Idempotency: Calling generateTasksFromOrderOrProduct twice does not duplicate tasks', async () => {
    const jobOrderId = 'job-order-idempotent-01'

    // Initial task generation
    const firstRun = await ProductionPlanningService.generateTasksFromOrderOrProduct(
      {
        job_order_id: jobOrderId,
        product_name: 'PVC Banner 5ft x 10ft',
        customer_name: 'Test Client',
        quantity: 1,
        width: 5,
        height: 10,
        dimension_unit: 'ft',
        material_spec: 'Star Flex PVC',
        printing_method: 'wide_format',
      },
      companyId
    )

    assert.ok(firstRun.length >= 2, 'Should create prepress and print tasks')
    const initialCount = firstRun.length

    // Second run with same job_order_id
    const secondRun = await ProductionPlanningService.generateTasksFromOrderOrProduct(
      {
        job_order_id: jobOrderId,
        product_name: 'PVC Banner 5ft x 10ft',
        customer_name: 'Test Client',
        quantity: 1,
        width: 5,
        height: 10,
        dimension_unit: 'ft',
        material_spec: 'Star Flex PVC',
        printing_method: 'wide_format',
      },
      companyId
    )

    assert.strictEqual(secondRun.length, initialCount, 'Executing generation twice must NOT create duplicate tasks')
    const allStoredTasks = await ProductionTaskRepository.getTasks(companyId, {
      job_order_id: jobOrderId,
    })
    assert.strictEqual(allStoredTasks.length, initialCount, 'Database must contain exactly the initial task count')
  })

  it('2. Section 29 Machine Conflict: Cannot start second task on a machine currently running', async () => {
    const machineId = 'mach-dx5-01'
    await MachineryRepository.createMachinery({
      company_id: companyId,
      name: 'Mimaki DX5-01',
      code: 'DX5-01',
      machine_type: 'large_format_printing',
      department: 'printing',
      status: 'available',
    })

    const taskA = await ProductionTaskRepository.createTask({
      company_id: companyId,
      job_order_id: 'job-a',
      task_number: 'TSK-1001',
      task_name: 'Job A Printing',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 1,
      unit: 'pcs',
      priority: 'normal',
      status: 'ready',
      assigned_machine_id: machineId,
      assigned_machine_name: 'Mimaki DX5-01',
    })

    const taskB = await ProductionTaskRepository.createTask({
      company_id: companyId,
      job_order_id: 'job-b',
      task_number: 'TSK-1002',
      task_name: 'Job B Printing',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 1,
      unit: 'pcs',
      priority: 'normal',
      status: 'ready',
      assigned_machine_id: machineId,
      assigned_machine_name: 'Mimaki DX5-01',
    })

    // Start Task A
    await ProductionPlanningService.startTask(taskA.id, companyId, 'op-1', 'Karim')
    const runningTaskA = await ProductionTaskRepository.getTaskById(taskA.id, companyId)
    assert.strictEqual(runningTaskA?.status, 'in_progress')

    // Try starting Task B on the same running machine
    await assert.rejects(
      async () => {
        await ProductionPlanningService.startTask(taskB.id, companyId, 'op-2', 'Rahim')
      },
      /Machine conflict: .* is currently running Task #TSK-1001/
    )
  })

  it('3. Section 21 & 34: Completing all job tasks updates Job Order status to ready for delivery', async () => {
    const jobOrderId = 'job-single-task-01'

    // Create a job order
    const job = await OrderRepository.createJobOrder({
      company_id: companyId,
      sales_order_id: 'so-1',
      order_number: 'ORD-101',
      job_number: 'JOB-101-1',
      title: 'PVC Banner',
      production_type: 'large_format',
      department: 'printing',
      status: 'in_progress',
    })

    const task = await ProductionTaskRepository.createTask({
      company_id: companyId,
      job_order_id: job.id,
      task_number: 'TSK-999',
      task_name: 'Print Banner',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 1,
      unit: 'pcs',
      priority: 'normal',
      status: 'in_progress',
    })

    // Complete the task
    const { completedTask, nextReadyTask } = await ProductionPlanningService.completeTask(
      task.id,
      companyId,
      { good_quantity: 1 }
    )

    assert.strictEqual(completedTask.status, 'completed')
    assert.strictEqual(nextReadyTask, null, 'No next sequential task')

    // Verify Job Order transitioned to ready
    const allJobs = await OrderRepository.getJobOrders(companyId)
    const updatedJob = allJobs.find((j) => j.id === job.id)
    assert.strictEqual(updatedJob?.status, 'ready', 'Job order must be marked ready for delivery')
  })
})
