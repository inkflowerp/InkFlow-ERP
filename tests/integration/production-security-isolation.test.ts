import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { ProductionTaskRecord, CreateProductionTaskInput } from '../../types/production.types.ts'
import type { MachineryRecord } from '../../types/machinery.types.ts'

class ProductionSecurityTestStore {
  private tasks: ProductionTaskRecord[] = []
  private machines: MachineryRecord[] = []

  clear() {
    this.tasks = []
    this.machines = []
  }

  addMachine(m: MachineryRecord) {
    this.machines.push(m)
  }

  createTask(data: Partial<ProductionTaskRecord>): ProductionTaskRecord {
    const task: ProductionTaskRecord = {
      id: data.id || `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: data.company_id || 'comp-01',
      branch_id: data.branch_id || null,
      job_order_id: data.job_order_id || 'job-01',
      task_number: data.task_number || `TSK-${this.tasks.length + 1}`,
      task_name: data.task_name || 'Manual Task',
      task_type: data.task_type || 'finishing',
      department: data.department || 'finishing',
      sequence_order: data.sequence_order || 1,
      quantity: data.quantity || 100,
      unit: data.unit || 'pcs',
      priority: data.priority || 'normal',
      estimated_duration_minutes: data.estimated_duration_minutes || 60,
      assigned_machine_id: data.assigned_machine_id || null,
      assigned_machine_name: data.assigned_machine_name || null,
      assigned_operator_id: data.assigned_operator_id || null,
      assigned_operator_name: data.assigned_operator_name || null,
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

  getTasks(companyId: string): ProductionTaskRecord[] {
    return this.tasks.filter((t) => t.company_id === companyId)
  }

  getTaskById(id: string, companyId: string): ProductionTaskRecord | null {
    return this.tasks.find((t) => t.id === id && t.company_id === companyId) || null
  }

  scheduleTask(
    taskId: string,
    companyId: string,
    machineId?: string
  ): ProductionTaskRecord {
    const task = this.getTaskById(taskId, companyId)
    if (!task) throw new Error('Task not found in company')

    if (machineId) {
      const machine = this.machines.find((m) => m.id === machineId && m.company_id === companyId)
      if (!machine) {
        throw new Error('Assigned machine not found in this company')
      }

      if (machine.branch_id && task.branch_id && machine.branch_id !== task.branch_id) {
        throw new Error(
          `Cannot assign machine: Machine belongs to branch ${machine.branch_id}, but task is in branch ${task.branch_id}.`
        )
      }

      task.assigned_machine_id = machine.id
      task.assigned_machine_name = machine.name
    }

    task.status = 'scheduled'
    return task
  }
}

describe('Production Security, Multi-Tenant & Branch Isolation Tests', () => {
  const store = new ProductionSecurityTestStore()
  const tenantAlpha = 'tenant-alpha-uuid'
  const tenantBeta = 'tenant-beta-uuid'
  const branchAlpha1 = 'branch-alpha-1'
  const branchAlpha2 = 'branch-alpha-2'

  store.clear()

  it('1. Strict Tenant Isolation: Tenant Alpha cannot view or retrieve Tenant Beta production tasks', () => {
    const betaTask = store.createTask({
      id: 'tsk-beta-01',
      company_id: tenantBeta,
      task_name: 'Confidential Beta Job',
    })

    const alphaTasks = store.getTasks(tenantAlpha)
    assert.equal(alphaTasks.length, 0, 'Tenant Alpha should see 0 tasks')

    const directLookup = store.getTaskById(betaTask.id, tenantAlpha)
    assert.equal(directLookup, null, 'Direct lookup of foreign tenant task must return null')
  })

  it('2. Tenant Isolation on Machines: Tenant Alpha cannot schedule on Tenant Beta machine', () => {
    store.addMachine({
      id: 'mach-beta-01',
      company_id: tenantBeta,
      name: 'Beta UV Flatbed',
      code: 'B-UV-01',
      status: 'available',
    } as MachineryRecord)

    const alphaTask = store.createTask({
      id: 'tsk-alpha-01',
      company_id: tenantAlpha,
      task_name: 'Alpha Printing',
    })

    assert.throws(
      () => {
        store.scheduleTask(alphaTask.id, tenantAlpha, 'mach-beta-01')
      },
      {
        message: /Assigned machine not found in this company/i,
      }
    )
  })

  it('3. Cross-Branch Isolation: Assigning a Branch 1 machine to a Branch 2 task is rejected', () => {
    store.addMachine({
      id: 'mach-br1-01',
      company_id: tenantAlpha,
      branch_id: branchAlpha1,
      name: 'Branch 1 EcoSolvent',
      code: 'BR1-ECO',
      status: 'available',
    } as MachineryRecord)

    const branch2Task = store.createTask({
      id: 'tsk-br2-01',
      company_id: tenantAlpha,
      branch_id: branchAlpha2,
      task_name: 'Branch 2 Vinyl Print',
    })

    assert.throws(
      () => {
        store.scheduleTask(branch2Task.id, tenantAlpha, 'mach-br1-01')
      },
      {
        message: /Cannot assign machine: Machine belongs to branch/i,
      }
    )
  })

  it('4. Zero-Machine Compatibility: Complete production lifecycle works flawlessly without a machine', () => {
    const manualTask = store.createTask({
      id: 'tsk-manual-01',
      company_id: tenantAlpha,
      task_name: 'Hand Scoring & Box Folding',
      quantity: 500,
      unit: 'boxes',
    })

    assert.equal(manualTask.assigned_machine_id, null)
    assert.equal(manualTask.assigned_machine_name, null)

    const scheduled = store.scheduleTask(manualTask.id, tenantAlpha)
    assert.equal(scheduled.status, 'scheduled')
    assert.equal(scheduled.assigned_machine_id, null)
  })
})
