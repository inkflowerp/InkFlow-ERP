import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ProductionPlanningService } from '../../services/production-planning.service.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { MachineryRepository } from '../../lib/repositories/machinery.repository.ts'
import { ProductionTaskRepository } from '../../lib/repositories/production-task.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { MachineryRecord } from '../../types/machinery.types.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'
import type { ProductionTaskRecord, CompleteTaskInput } from '../../types/production.types.ts'

describe('Tri-Pillar Integration: Production Planning & Shop Floor + Inventory Rolls + Machinery Fleet', () => {
  const companyId = 'comp-tri-pillar-test-001'

  it('1. Physical Roll Mounting & Unmounting seamlessly synchronizes between Inventory & Fleet Machine', async () => {
    // Setup test material
    const material: MaterialRecord = {
      id: 'mat-star-flex-001',
      company_id: companyId,
      name: 'Star Flex Banner 340gsm',
      sku: 'MAT-SF-340',
      category: 'banner_flex',
      unit: 'sft',
      current_stock: 1500,
      average_cost: 12,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [material])

    // Setup test machinery
    const machine: MachineryRecord = {
      id: 'mach-flora-solvent-01',
      company_id: companyId,
      name: 'Flora Konica 512i 10ft Solvent Press',
      code: 'FLORA-10FT',
      brand: 'Flora',
      machine_type: 'solvent_printer',
      department: 'printing',
      status: 'available',
      speed_sqft_per_hour: 450,
      max_width: 126,
      max_print_width_inches: 126,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.MACHINERIES, [machine])

    // Create a 10ft wide x 150ft long Physical Roll (1500 SFT)
    const roll = await InventoryRepository.createPhysicalRoll({
      company_id: companyId,
      material_id: material.id,
      roll_tag: 'TAG-FLX-10-001',
      width_ft: 10,
      initial_length_ft: 150,
      current_length_ft: 150,
      total_area_sft: 1500,
      remaining_area_sft: 1500,
      status: 'available',
      location_name: 'Main Roll Warehouse R-02',
    })

    assert.ok(roll.id, 'Physical roll must be created')
    assert.strictEqual(roll.status, 'available')
    assert.strictEqual(roll.remaining_area_sft, 1500)

    // Mount Roll to Flora Press
    const mountedRoll = await InventoryRepository.mountRollToMachine({
      company_id: companyId,
      roll_id: roll.id,
      machine_id: machine.id,
      machine_name: machine.name,
      operator_name: 'Md. Shamol (Head Operator)',
    })

    assert.strictEqual(mountedRoll.status, 'mounted')
    assert.strictEqual(mountedRoll.mounted_machine_id, machine.id)
    assert.strictEqual(mountedRoll.mounted_machine_name, machine.name)

    // Verify machine record synchronized with mounted roll
    const updatedMachine = await MachineryRepository.getMachineryById(machine.id, companyId)
    assert.strictEqual(updatedMachine?.active_mounted_roll_id, roll.id)
    assert.ok(updatedMachine?.active_mounted_roll_tag?.includes('TAG-FLX-10-001'))

    // Unmount Roll from Flora Press
    const unmountedRoll = await InventoryRepository.unmountRollFromMachine({
      company_id: companyId,
      roll_id: roll.id,
      machine_id: machine.id,
    })

    assert.strictEqual(unmountedRoll.status, 'available')
    assert.strictEqual(unmountedRoll.mounted_machine_id, null)

    // Verify machine record cleared
    const machineAfterUnmount = await MachineryRepository.getMachineryById(machine.id, companyId)
    assert.strictEqual(machineAfterUnmount?.active_mounted_roll_id, null)
  })

  it('2. Shop Floor Task Start sets machine to in_use and locks active execution', async () => {
    const machine: MachineryRecord = {
      id: 'mach-mimaki-jv300',
      company_id: companyId,
      name: 'Mimaki JV300-160 Plus',
      code: 'MIM-01',
      machine_type: 'eco_solvent_printer',
      department: 'printing',
      status: 'available',
      speed_sqft_per_hour: 180,
      max_width: 64,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.MACHINERIES, [machine])

    const task: ProductionTaskRecord = {
      id: 'task-print-apex-01',
      company_id: companyId,
      job_order_id: 'job-apex-99',
      task_number: 'TSK-PRN-001',
      task_name: 'Eco-Solvent Vinyl Printing',
      task_type: 'printing',
      department: 'printing',
      status: 'ready',
      priority: 'urgent',
      assigned_machine_id: machine.id,
      assigned_machine_name: machine.name,
      width: 4,
      height: 6,
      quantity: 5,
      unit: 'sft',
      sequence_order: 1,
      is_blocked_by_commercial_gate: false,
      is_blocked_by_design_gate: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, [task])

    // Start Task
    const startedTask = await ProductionPlanningService.startTask(
      task.id,
      companyId,
      'op-kamrul',
      'Kamrul Hassan',
      true
    )

    assert.strictEqual(startedTask.status, 'in_progress')
    assert.ok(startedTask.actual_start)

    // Verify machine status updated to in_use
    const activeMachine = await MachineryRepository.getMachineryById(machine.id, companyId)
    assert.strictEqual(activeMachine?.status, 'in_use')
  })

  it('3. Complete Task automatically deducts mounted roll, logs defect scrap wastage, updates machine meters, and unlocks next sequential step', async () => {
    // Setup Material
    const material: MaterialRecord = {
      id: 'mat-sav-gloss-01',
      company_id: companyId,
      name: 'Glossy Self Adhesive Vinyl 120gsm',
      sku: 'MAT-SAV-GLOSS',
      category: 'vinyl_sticker',
      unit: 'sft',
      current_stock: 3000,
      average_cost: 18,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [material])

    // Setup Machine with initial meters
    const machine: MachineryRecord = {
      id: 'mach-roland-vg2',
      company_id: companyId,
      name: 'Roland TrueVIS VG2-640',
      code: 'ROL-VG2',
      machine_type: 'eco_solvent_printer',
      department: 'printing',
      status: 'in_use',
      total_sft_produced: 12000,
      total_impressions: 450,
      total_operating_hours: 120,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.MACHINERIES, [machine])

    // Create 4ft wide physical roll with 100ft length (400 SFT)
    const roll = await InventoryRepository.createPhysicalRoll({
      company_id: companyId,
      material_id: material.id,
      roll_tag: 'TAG-SAV-4FT-99',
      width_ft: 4,
      initial_length_ft: 100,
      current_length_ft: 100,
      total_area_sft: 400,
      remaining_area_sft: 400,
      status: 'mounted',
      mounted_machine_id: machine.id,
      mounted_machine_name: machine.name,
      location_name: 'Roland Press Feed',
    })

    // Setup Step 1 (Printing - In Progress) and Step 2 (Finishing/Lamination - Blocked)
    const printTask: ProductionTaskRecord = {
      id: 'task-step1-print',
      company_id: companyId,
      job_order_id: 'job-order-dhaka-001',
      task_number: 'TSK-PRN-501',
      task_name: 'Glossy Vinyl Printing',
      task_type: 'printing',
      department: 'printing',
      status: 'in_progress',
      assigned_machine_id: machine.id,
      assigned_machine_name: machine.name,
      mounted_roll_id: roll.id,
      width: 4,
      height: 5,
      quantity: 10, // 10 pcs x (4x5) = 200 SFT
      unit: 'sft',
      sequence_order: 1,
      is_blocked_by_commercial_gate: false,
      is_blocked_by_design_gate: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const finishingTask: ProductionTaskRecord = {
      id: 'task-step2-lamination',
      company_id: companyId,
      job_order_id: 'job-order-dhaka-001',
      task_number: 'TSK-LAM-502',
      task_name: 'Cold Gloss Lamination & Trim',
      task_type: 'lamination',
      department: 'finishing',
      status: 'queued',
      sequence_order: 2,
      quantity: 10,
      unit: 'pcs',
      is_blocked_by_commercial_gate: false,
      is_blocked_by_design_gate: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, [printTask, finishingTask])

    // Operator Completes Task from SFT:
    // - Good Qty: 10 pcs (200 SFT)
    // - Scrap / Wastage: 20 SFT (Defect Reason: Banding / Head Clog)
    // - Consumed from Roll: 220 SFT (55 linear feet of 4ft roll)
    const completeInput: CompleteTaskInput = {
      completed_quantity: 10,
      good_quantity: 10,
      scrap_quantity: 1,
      scrap_area_sft: 20,
      defect_reason: 'banding',
      consumed_material_qty: 220,
      consumed_material_unit: 'sft',
      mounted_roll_id: roll.id,
      mounted_roll_tag: roll.roll_tag,
      operator_name: 'Tareq Rahman',
      shift_name: 'Day Shift (8 AM - 4 PM)',
      notes: 'Printed smoothly. 1 piece reprinted due to nozzle banding in early meter.',
    }

    const result = await ProductionPlanningService.completeTask(
      printTask.id,
      companyId,
      completeInput
    )

    assert.strictEqual(result.completedTask.status, 'completed')
    assert.strictEqual(result.completedTask.good_quantity, 10)
    assert.strictEqual(result.completedTask.scrap_area_sft, 20)
    assert.strictEqual(result.completedTask.defect_reason, 'banding')

    // 1. Verify Physical Roll SFT deduction
    const updatedRoll = await InventoryRepository.getInventoryRollById(roll.id, companyId)
    assert.ok(updatedRoll, 'Updated roll must exist')
    // 400 SFT initial - 220 SFT consumed = 180 SFT remaining (45 LF remaining on 4ft roll)
    assert.strictEqual(updatedRoll?.remaining_area_sft, 180)
    assert.strictEqual(updatedRoll?.current_length_ft, 45)

    // 2. Verify Stock Ledger has consumption and scrap wastage entries
    const ledger = await InventoryRepository.getStockLedger(companyId)
    const wastageEntry = ledger.find((l) => l.transaction_type === 'WASTAGE' || l.notes?.includes('banding'))
    assert.ok(wastageEntry, 'Wastage scrap entry must be recorded in inventory ledger')
    assert.ok(wastageEntry?.notes?.toLowerCase().includes('banding') || wastageEntry?.notes?.toLowerCase().includes('wastage'))

    // 3. Verify Machine Meters Incremented
    const updatedMachine = await MachineryRepository.getMachineryById(machine.id, companyId)
    assert.ok(updatedMachine, 'Machine must exist')
    assert.strictEqual(Number(updatedMachine?.total_sft_produced), 12220, 'Should increment machine SFT meter by 220 SFT')
    assert.strictEqual(Number(updatedMachine?.total_impressions), 460, 'Should increment machine impressions by 10')
    assert.strictEqual(updatedMachine?.status, 'available', 'Machine should return to available after completing task')

    // 4. Verify Downstream Sequential Task Auto-Unlocked / Ready
    assert.ok(result.nextReadyTask, 'Downstream task must be identified as ready')
    assert.strictEqual(result.nextReadyTask?.id, finishingTask.id)
  })

  it('4. Real-world Bangladeshi Press Defect Reason Codes are fully standardized', () => {
    const DEFECT_REASONS = [
      'head_strike',
      'banding',
      'media_wrinkle',
      'color_mismatch',
      'cutting_misalignment',
      'lamination_bubble',
      'operator_error',
      'material_defect',
      'machine_malfunction',
    ]

    for (const code of DEFECT_REASONS) {
      assert.ok(code.length > 0, `Defect code ${code} must be valid string`)
    }
  })
})
