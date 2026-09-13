import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type {
  ProductionTaskRecord,
  ProductionTaskStatus,
  ScheduleTaskInput,
} from '../../types/production.types.ts'
import type { MachineryRecord } from '../../types/machinery.types.ts'

// In-Memory Test Store & State Machine Engine for Concurrency Testing
class ProductionConcurrencyTestStore {
  private tasks: ProductionTaskRecord[] = []
  private machines: MachineryRecord[] = []
  private mutexLocks = new Map<string, Promise<void>>()

  clear() {
    this.tasks = []
    this.machines = []
    this.mutexLocks.clear()
  }

  addMachine(machine: MachineryRecord) {
    this.machines.push(machine)
  }

  createTask(data: Partial<ProductionTaskRecord>): ProductionTaskRecord {
    const task: ProductionTaskRecord = {
      id: data.id || `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: data.company_id || 'comp-01',
      branch_id: data.branch_id || null,
      job_order_id: data.job_order_id || 'job-01',
      task_number: data.task_number || `TSK-${this.tasks.length + 1}`,
      task_name: data.task_name || 'Printing',
      task_type: data.task_type || 'printing',
      department: data.department || 'printing',
      sequence_order: data.sequence_order || 1,
      quantity: data.quantity || 1,
      unit: data.unit || 'pcs',
      priority: data.priority || 'normal',
      width: data.width || null,
      height: data.height || null,
      estimated_duration_minutes: data.estimated_duration_minutes || 60,
      assigned_machine_id: data.assigned_machine_id || null,
      assigned_machine_name: data.assigned_machine_name || null,
      assigned_operator_id: data.assigned_operator_id || null,
      assigned_operator_name: data.assigned_operator_name || null,
      scheduled_start: data.scheduled_start || null,
      scheduled_end: data.scheduled_end || null,
      status: data.status || 'queued',
      is_rework: data.is_rework ?? false,
      good_quantity: data.good_quantity ?? 0,
      rejected_quantity: data.rejected_quantity ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    this.tasks.push(task)
    return task
  }

  async scheduleTask(input: ScheduleTaskInput, companyId: string): Promise<ProductionTaskRecord> {
    const lockKey = `${companyId}:${input.assigned_machine_id || 'manual'}`

    // Acquire mutex lock to simulate serialized database transaction / FOR UPDATE lock
    while (this.mutexLocks.has(lockKey)) {
      try {
        await this.mutexLocks.get(lockKey)
      } catch (_) {}
    }

    let resolveLock = () => {}
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve
    })
    this.mutexLocks.set(lockKey, lockPromise)

    try {
      const task = this.tasks.find((t) => t.id === input.task_id && t.company_id === companyId)
      if (!task) throw new Error(`Production task not found: ${input.task_id}`)

      if (task.status === 'cancelled') {
        throw new Error('Cannot schedule a cancelled production task.')
      }

      const startDate = new Date(input.scheduled_start)
      const durationMinutes = input.estimated_duration_minutes || task.estimated_duration_minutes || 60
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)

      let machineName: string | null = null

      if (input.assigned_machine_id) {
        const machine = this.machines.find((m) => m.id === input.assigned_machine_id && m.company_id === companyId)
        if (!machine) throw new Error('Assigned machine not found in this company')

        if (machine.status === 'breakdown') {
          throw new Error(`Cannot schedule task on ${machine.name}: Machine is currently broken down.`)
        }
        if (machine.status === 'maintenance') {
          throw new Error(`Cannot schedule task on ${machine.name}: Machine is currently under maintenance.`)
        }
        if (machine.status === 'retired' || machine.status === 'offline') {
          throw new Error(`Cannot schedule task on ${machine.name}: Machine is ${machine.status}.`)
        }

        // Capability validation
        if (task.width && machine.max_width && task.width > machine.max_width) {
          throw new Error(
            `Machine capability exceeded: Task width (${task.width}) exceeds ${machine.name} max width (${machine.max_width} ${machine.dimension_unit || 'inch'}).`
          )
        }

        // Check overlapping active tasks on this machine
        for (const t of this.tasks) {
          if (
            t.id !== task.id &&
            t.company_id === companyId &&
            t.assigned_machine_id === machine.id &&
            t.status !== 'cancelled' &&
            t.status !== 'completed' &&
            t.scheduled_start &&
            t.scheduled_end
          ) {
            const exStart = new Date(t.scheduled_start)
            const exEnd = new Date(t.scheduled_end)
            if (startDate < exEnd && endDate > exStart) {
              throw new Error(
                `Schedule conflict: Machine ${machine.name} is already booked from ${exStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${exEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Job #${t.task_number}).`
              )
            }
          }
        }

        machineName = machine.name
      }

      task.assigned_machine_id = input.assigned_machine_id || null
      task.assigned_machine_name = machineName
      task.scheduled_start = startDate.toISOString()
      task.scheduled_end = endDate.toISOString()
      task.estimated_duration_minutes = durationMinutes
      task.status = task.status === 'queued' ? 'scheduled' : task.status
      task.updated_at = new Date().toISOString()

      return task
    } finally {
      this.mutexLocks.delete(lockKey)
      resolveLock()
    }
  }

  startTask(taskId: string, companyId: string): ProductionTaskRecord {
    const task = this.tasks.find((t) => t.id === taskId && t.company_id === companyId)
    if (!task) throw new Error('Task not found')
    if (task.status === 'completed') {
      throw new Error(`Invalid status transition from completed to in_progress`)
    }
    task.status = 'in_progress'
    task.actual_start = new Date().toISOString()
    return task
  }

  completeTask(taskId: string, companyId: string): ProductionTaskRecord {
    const task = this.tasks.find((t) => t.id === taskId && t.company_id === companyId)
    if (!task) throw new Error('Task not found')
    if (task.status === 'on_hold') {
      throw new Error('Cannot complete task while on hold. Resume or start task first.')
    }
    task.status = 'completed'
    task.actual_end = new Date().toISOString()
    return task
  }
}

describe('Production Concurrency, Scheduling Hardening & State Machine Tests', () => {
  const store = new ProductionConcurrencyTestStore()
  const companyId = 'comp-race-test-01'
  const branchId = 'branch-race-test-01'
  const machineId = 'mach-hpl-570'

  store.clear()
  store.addMachine({
    id: machineId,
    company_id: companyId,
    branch_id: branchId,
    name: 'HP Latex 570 Pro',
    code: 'HPL-570',
    machine_type: 'large_format_printing',
    category: 'printing',
    department: 'printing',
    status: 'available',
    max_width: 64,
    max_height: 1200,
    dimension_unit: 'inch',
    supported_production_types: ['large_format_printing', 'printing'],
  } as MachineryRecord)

  it('1. Prevents race-condition: simultaneous overlapping scheduling requests on same machine must allow only one to succeed', async () => {
    const task1 = store.createTask({
      id: 'tsk-race-01',
      company_id: companyId,
      task_name: 'Banner 1 Printing',
      task_number: 'TSK-101',
    })

    const task2 = store.createTask({
      id: 'tsk-race-02',
      company_id: companyId,
      task_name: 'Banner 2 Printing',
      task_number: 'TSK-102',
    })

    const now = new Date()
    const scheduledStart = new Date(now.getTime() + 60 * 60 * 1000).toISOString()

    const results = await Promise.allSettled([
      store.scheduleTask(
        {
          task_id: task1.id,
          assigned_machine_id: machineId,
          scheduled_start: scheduledStart,
          estimated_duration_minutes: 60,
        },
        companyId
      ),
      store.scheduleTask(
        {
          task_id: task2.id,
          assigned_machine_id: machineId,
          scheduled_start: scheduledStart,
          estimated_duration_minutes: 60,
        },
        companyId
      ),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    assert.equal(fulfilled.length, 1, 'Exactly one scheduling request should succeed')
    assert.equal(rejected.length, 1, 'The competing overlapping request must be rejected')
    const errReason = (rejected[0] as PromiseRejectedResult).reason
    assert.match(errReason.message, /Schedule conflict/i)
  })

  it('2. Allows non-overlapping scheduling requests on the same machine to both succeed', async () => {
    const task1 = store.createTask({
      id: 'tsk-seq-01',
      company_id: companyId,
      task_name: 'Morning Run',
      task_number: 'TSK-201',
    })

    const task2 = store.createTask({
      id: 'tsk-seq-02',
      company_id: companyId,
      task_name: 'Afternoon Run',
      task_number: 'TSK-202',
    })

    const morningStart = new Date(Date.now() + 2 * 3600 * 1000).toISOString()
    const afternoonStart = new Date(Date.now() + 5 * 3600 * 1000).toISOString()

    const [res1, res2] = await Promise.all([
      store.scheduleTask(
        {
          task_id: task1.id,
          assigned_machine_id: machineId,
          scheduled_start: morningStart,
          estimated_duration_minutes: 60,
        },
        companyId
      ),
      store.scheduleTask(
        {
          task_id: task2.id,
          assigned_machine_id: machineId,
          scheduled_start: afternoonStart,
          estimated_duration_minutes: 60,
        },
        companyId
      ),
    ])

    assert.equal(res1.status, 'scheduled')
    assert.equal(res2.status, 'scheduled')
    assert.equal(res1.assigned_machine_name, 'HP Latex 570 Pro')
    assert.equal(res2.assigned_machine_name, 'HP Latex 570 Pro')
  })

  it('3. Rejects scheduling if task dimensions exceed machine physical capabilities', async () => {
    const oversizedTask = store.createTask({
      id: 'tsk-dim-01',
      company_id: companyId,
      task_name: 'Huge Billboard',
      width: 120, // Exceeds 64 inch limit
      height: 240,
    })

    await assert.rejects(
      async () => {
        await store.scheduleTask(
          {
            task_id: oversizedTask.id,
            assigned_machine_id: machineId,
            scheduled_start: new Date(Date.now() + 3600 * 1000).toISOString(),
            estimated_duration_minutes: 60,
          },
          companyId
        )
      },
      {
        message: /Machine capability exceeded: Task width/i,
      }
    )
  })

  it('4. Enforces state machine guardrails (cannot complete task on hold without resume)', () => {
    const task = store.createTask({
      id: 'tsk-hold-01',
      company_id: companyId,
      task_name: 'Hold Test',
      status: 'on_hold',
    })

    assert.throws(
      () => {
        store.completeTask(task.id, companyId)
      },
      {
        message: /Cannot complete task while on hold/i,
      }
    )
  })

  it('5. Rejects illegal transition from completed back to in_progress', () => {
    const task = store.createTask({
      id: 'tsk-comp-01',
      company_id: companyId,
      task_name: 'Complete Test',
      status: 'completed',
    })

    assert.throws(
      () => {
        store.startTask(task.id, companyId)
      },
      {
        message: /Invalid status transition from completed to in_progress/i,
      }
    )
  })
})
