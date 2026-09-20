import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ProductionPlanningService } from '../../services/production-planning.service.ts'
import { MachineryService } from '../../services/machinery.service.ts'
import { MachineryRepository } from '../../lib/repositories/machinery.repository.ts'
import { ProductionTaskRepository } from '../../lib/repositories/production-task.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { MachineryRecord } from '../../types/machinery.types.ts'
import type { ProductionTaskRecord } from '../../types/production.types.ts'

describe('Products, Machinery Fleet & Shop Floor Production Integration Tests', () => {
  const companyId = 'comp-test-prod-fleet-001'

  it('1. Generates sequential production tasks from Order with machine auto-matching and runtime estimation', async () => {
    // Seed test machine in DataStore
    const testMachine: MachineryRecord = {
      id: 'mach-roland-001',
      company_id: companyId,
      name: 'Roland TrueVIS VG2-640',
      code: 'ROL-01',
      brand: 'Roland',
      model: 'VG2-640',
      machine_type: 'eco_solvent_printer',
      department: 'printing',
      status: 'available',
      hourly_rate_bdt: 650,
      speed_sqft_per_hour: 120,
      max_width: 64,
      max_print_width_inches: 64,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const currentMachines = PrintERPDataStore.get<MachineryRecord[]>(STORAGE_KEYS.MACHINERIES) || []
    PrintERPDataStore.set(STORAGE_KEYS.MACHINERIES, [
      ...currentMachines.filter((m) => m.id !== testMachine.id),
      testMachine,
    ])

    const tasks = await ProductionPlanningService.generateTasksFromOrderOrProduct(
      {
        job_order_id: 'job-ord-2026-01',
        product_name: 'Glossy Vinyl Banner with Lamination',
        customer_name: 'Apex Holdings Ltd',
        quantity: 2,
        width: 4,
        height: 10,
        dimension_unit: 'ft',
        printing_method: 'eco_solvent',
        finishing_tasks: ['Gloss Thermal Lamination'],
      },
      companyId
    )

    assert.ok(tasks.length >= 3, 'Should generate at least Prepress, Printing, and Finishing/QC tasks')

    // Find printing task
    const printTask = tasks.find((t) => t.department === 'printing' && t.task_name.includes('Print'))
    assert.ok(printTask, 'Printing task must exist')
    assert.strictEqual(printTask?.assigned_machine_id, testMachine.id, 'Should auto-match compatible Roland printer')
    assert.ok((printTask?.estimated_duration_minutes || 0) > 0, 'Estimated runtime must be calculated from 120 sqft/hr speed')

    // Find finishing task
    const finishingTask = tasks.find((t) => t.department === 'finishing' || t.task_name.includes('Finishing') || t.task_name.includes('Lamination'))
    assert.ok(finishingTask, 'Finishing task must be generated')
  })

  it('2. Checks machine compatibility based on width, department, and operational status', async () => {
    const wideMachine: MachineryRecord = {
      id: 'mach-solvent-wide',
      company_id: companyId,
      name: 'Allwin 10ft Solvent Flex Printer',
      code: 'ALW-10FT',
      machine_type: 'solvent_printer',
      department: 'printing',
      status: 'available',
      max_width: 126,
      max_print_width_inches: 126,
      speed_sqft_per_hour: 400,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const smallMachine: MachineryRecord = {
      id: 'mach-small-laser',
      company_id: companyId,
      name: 'Desktop Laser 12x18',
      code: 'LAS-MINI',
      machine_type: 'laser_printer',
      department: 'printing',
      status: 'available',
      max_width: 13,
      max_print_width_inches: 13,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const currentMachines = PrintERPDataStore.get<MachineryRecord[]>(STORAGE_KEYS.MACHINERIES) || []
    PrintERPDataStore.set(STORAGE_KEYS.MACHINERIES, [
      ...currentMachines.filter((m) => m.id !== wideMachine.id && m.id !== smallMachine.id),
      wideMachine,
      smallMachine,
    ])

    // Create a 96-inch task
    const testTask = await ProductionPlanningService.createTask(
      {
        job_order_id: 'job-ord-comp-01',
        task_name: 'Billboard Flex Print 96 inch',
        department: 'printing',
        width: 96,
        height: 48,
        quantity: 1,
      },
      companyId
    )

    // Check compatibility for 96 inch task
    const compResults = await ProductionPlanningService.getCompatibleMachinesForTask(testTask.id, companyId)

    const wideCheck = compResults.find((r) => r.machine.id === wideMachine.id)
    const smallCheck = compResults.find((r) => r.machine.id === smallMachine.id)

    assert.ok(wideCheck?.isCompatible, '10ft machine (126") must be compatible with 96" job')
    assert.strictEqual(smallCheck?.isCompatible, false, '13" laser machine must be flagged incompatible for 96" banner')
  })

  it('3. Starts task, tracks live workstation telemetry, and sets machine status to in_use', async () => {
    const machineId = 'mach-test-live-01'
    const testMachine: MachineryRecord = {
      id: machineId,
      company_id: companyId,
      name: 'Mimaki UCJV300 UV Roll',
      code: 'MIM-UV',
      machine_type: 'uv_printer',
      department: 'printing',
      status: 'available',
      hourly_rate_bdt: 800,
      speed_sqft_per_hour: 150,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const currentMachines = PrintERPDataStore.get<MachineryRecord[]>(STORAGE_KEYS.MACHINERIES) || []
    PrintERPDataStore.set(STORAGE_KEYS.MACHINERIES, [
      ...currentMachines.filter((m) => m.id !== testMachine.id),
      testMachine,
    ])

    const testTask = await ProductionPlanningService.createTask(
      {
        job_order_id: 'job-ord-live-01',
        task_name: 'UV Roll Banner Print',
        department: 'printing',
        assigned_machine_id: machineId,
        assigned_machine_name: testMachine.name,
        quantity: 10,
        estimated_duration_minutes: 45,
      },
      companyId
    )

    // Start task
    const started = await ProductionPlanningService.startTask(testTask.id, companyId, 'op-shamol', 'Operator Shamol', true)
    assert.strictEqual(started.status, 'in_progress')
    assert.ok(started.actual_start, 'actual_start timestamp must be recorded')

    // Verify machine transitioned to in_use
    const updatedMach = await MachineryService.getMachineryById(machineId, companyId)
    assert.strictEqual(updatedMach?.status, 'in_use', 'Machine must transition to in_use when task starts')
  })

  it('4. Completes task with defect reason, good/scrap counts, and releases machine to available', async () => {
    const machineId = 'mach-test-comp-01'
    const testMachine: MachineryRecord = {
      id: machineId,
      company_id: companyId,
      name: 'HP Latex 570',
      code: 'HP-570',
      machine_type: 'latex_printer',
      department: 'printing',
      status: 'in_use',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const currentMachines = PrintERPDataStore.get<MachineryRecord[]>(STORAGE_KEYS.MACHINERIES) || []
    PrintERPDataStore.set(STORAGE_KEYS.MACHINERIES, [
      ...currentMachines.filter((m) => m.id !== testMachine.id),
      testMachine,
    ])

    const testTask = await ProductionPlanningService.createTask(
      {
        job_order_id: 'job-ord-comp-02',
        task_name: 'Backlit Film Print',
        department: 'printing',
        assigned_machine_id: machineId,
        assigned_machine_name: testMachine.name,
        quantity: 20,
      },
      companyId
    )

    // Start task first
    await ProductionPlanningService.startTask(testTask.id, companyId, 'op-shamol', 'Operator Shamol', true)

    // Complete task with 18 good, 2 scrap, defect reason
    const { completedTask } = await ProductionPlanningService.completeTask(
      testTask.id,
      companyId,
      {
        good_quantity: 18,
        rejected_quantity: 2,
        defect_reason: 'head_strike',
        scrap_notes: 'Nozzle strike on right edge, reprinted 2 pieces',
      }
    )

    assert.strictEqual(completedTask.status, 'completed')
    assert.strictEqual(completedTask.good_quantity, 18)
    assert.strictEqual(completedTask.rejected_quantity, 2)
    assert.strictEqual(completedTask.defect_reason, 'head_strike')
    assert.strictEqual(completedTask.scrap_notes, 'Nozzle strike on right edge, reprinted 2 pieces')

    // Machine should now be released back to 'available'
    const updatedMach = await MachineryService.getMachineryById(machineId, companyId)
    assert.strictEqual(updatedMach?.status, 'available', 'Machine must be released back to available upon completion')
  })

  it('5. Report breakdown puts active and scheduled tasks on hold and bulk reassigns to target machine', async () => {
    const brokenMachineId = 'mach-breakdown-01'
    const targetMachineId = 'mach-backup-02'

    const brokenMachine: MachineryRecord = {
      id: brokenMachineId,
      company_id: companyId,
      name: 'Gongzheng Starfire 1024',
      code: 'GZ-01',
      machine_type: 'solvent_printer',
      department: 'printing',
      status: 'in_use',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const targetMachine: MachineryRecord = {
      id: targetMachineId,
      company_id: companyId,
      name: 'Flora Konica 512i Backup',
      code: 'FLO-02',
      machine_type: 'solvent_printer',
      department: 'printing',
      status: 'available',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const currentMachines = PrintERPDataStore.get<MachineryRecord[]>(STORAGE_KEYS.MACHINERIES) || []
    PrintERPDataStore.set(STORAGE_KEYS.MACHINERIES, [
      ...currentMachines.filter((m) => m.id !== brokenMachine.id && m.id !== targetMachine.id),
      brokenMachine,
      targetMachine,
    ])

    const task1 = await ProductionPlanningService.createTask(
      {
        job_order_id: 'job-ord-bd-01',
        task_name: 'Road Billboard Print 40x20',
        department: 'printing',
        assigned_machine_id: brokenMachineId,
        assigned_machine_name: brokenMachine.name,
        quantity: 1,
      },
      companyId
    )

    const task2 = await ProductionPlanningService.createTask(
      {
        job_order_id: 'job-ord-bd-02',
        task_name: 'Shopfront Flex 20x10',
        department: 'printing',
        assigned_machine_id: brokenMachineId,
        assigned_machine_name: brokenMachine.name,
        quantity: 1,
      },
      companyId
    )

    // Start task 1 so it's in_progress
    await ProductionPlanningService.startTask(task1.id, companyId, 'op-shamol', 'Operator Shamol', true)

    // Report breakdown
    await MachineryService.reportBreakdown({
      company_id: companyId,
      machine_id: brokenMachineId,
      reported_by_name: 'Lead Operator Shamol',
      problem_title: 'Main Carriage Belt Snapped',
      problem_description: 'Belt broke during high speed pass',
      severity: 'high',
      production_impact: 'job_stalled',
    })

    // Check machine status
    const mAfter = await MachineryService.getMachineryById(brokenMachineId, companyId)
    assert.strictEqual(mAfter?.status, 'breakdown')

    // Check that both tasks were placed on hold
    const heldTasks = await ProductionTaskRepository.getTasks(companyId, { assigned_machine_id: brokenMachineId })
    assert.ok(heldTasks.every((t) => t.status === 'on_hold'), 'All tasks on broken machine must be placed on_hold')
    assert.ok(heldTasks.every((t) => t.hold_reason === 'machine_breakdown'), 'hold_reason must be machine_breakdown')

    // Bulk reassign held tasks to target backup machine
    const { reassignedCount } = await ProductionPlanningService.reassignHeldTasks(
      brokenMachineId,
      targetMachineId,
      companyId
    )

    assert.strictEqual(reassignedCount, 2, 'Should have reassigned both tasks')

    // Verify tasks on target machine
    const newTasks = await ProductionTaskRepository.getTasks(companyId, { assigned_machine_id: targetMachineId })
    assert.strictEqual(newTasks.length, 2, 'Target machine must now have 2 tasks')
    assert.ok(newTasks.every((t) => t.status === 'scheduled'), 'Reassigned tasks should be scheduled')
    assert.ok(newTasks.every((t) => t.assigned_machine_id === targetMachineId), 'Tasks must have target machine ID')
  })
})
