import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { RollConsumptionEngine } from '../../lib/domain/roll-consumption-engine.ts'
import { getMaterialWarehouseStockBreakdown, formatFloorPieceDisplay } from '../../lib/units.ts'
import type { MaterialRecord, InventoryRollRecord } from '../../types/inventory.types.ts'

describe('PrintERP Inventory Architecture — Purchase Unit, Stock Unit & Consumption Unit', () => {
  const testCompanyId = 'comp-inventory-arch-test-01'

  const pvcMaster: MaterialRecord = {
    id: 'mat-pvc-001',
    company_id: testCompanyId,
    sku: 'MAT-PVC-001',
    name: 'PVC Substrate',
    category: 'roll_media',
    unit: 'sft',
    purchase_unit: 'roll',
    is_roll: true,
    roll_width_ft: 3,
    standard_roll_length_ft: 164,
    available_widths_ft: [3, 5],
    current_stock: 5000,
    min_stock_level: 500,
    average_cost: 20,
    cost_per_unit: 20,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(async () => {
    // Clear test store partition
    PrintERPDataStore.clear(testCompanyId)
    // Register material master
    await InventoryService.createMaterial(pvcMaster)
  })

  // 1. PURCHASE / STORE INVENTORY CONFIGURATIONS
  it('1. should maintain distinct purchase configurations (3ft × 164ft vs 5ft × 164ft) without combining into generic numbers', async () => {
    // Direct intake of 10 Rolls of 3ft × 164ft
    const intake3ft = await InventoryService.receiveStock({
      company_id: testCompanyId,
      material_id: pvcMaster.id,
      location_id: 'loc-main-store',
      quantity: 10,
      unit_cost: 9840, // ৳9,840 / roll
      width_ft: 3,
      length_ft: 164,
      size_label: '3 ft × 50 m',
      physical_form: 'roll',
      purchase_unit: 'roll',
      supplier_name: 'ABC Trading',
      batch_lot_number: 'LOT-PVC3-01',
      performed_by_name: 'Store Manager',
    })

    // Direct intake of 8 Rolls of 5ft × 164ft
    const intake5ft = await InventoryService.receiveStock({
      company_id: testCompanyId,
      material_id: pvcMaster.id,
      location_id: 'loc-main-store',
      quantity: 8,
      unit_cost: 16400, // ৳16,400 / roll
      width_ft: 5,
      length_ft: 164,
      size_label: '5 ft × 50 m',
      physical_form: 'roll',
      purchase_unit: 'roll',
      supplier_name: 'ABC Trading',
      batch_lot_number: 'LOT-PVC5-01',
      performed_by_name: 'Store Manager',
    })

    assert.strictEqual(intake3ft.rollsCreated?.length, 10, 'Must create exactly 10 individual 3ft physical rolls')
    assert.strictEqual(intake5ft.rollsCreated?.length, 8, 'Must create exactly 8 individual 5ft physical rolls')

    // Fetch all warehouse rolls
    const allStoreRolls = await InventoryRepository.getInventoryRolls(testCompanyId, {
      materialId: pvcMaster.id,
    })

    // Breakdown should preserve exact configurations (10 Rolls of 3ft, 8 Rolls of 5ft)
    const breakdown = getMaterialWarehouseStockBreakdown(pvcMaster, allStoreRolls)

    assert.strictEqual(breakdown.total_rolls, 18, 'Total count of physical roll objects is 18')
    assert.strictEqual(breakdown.roll_items.length, 2, 'Must have 2 distinct physical roll configurations')

    const config3ft = breakdown.roll_items.find((x) => x.width_ft === 3)
    const config5ft = breakdown.roll_items.find((x) => x.width_ft === 5)

    assert.ok(config3ft, 'Must contain 3ft roll configuration')
    assert.strictEqual(config3ft?.roll_count, 10, '3ft configuration must have exactly 10 Rolls')
    assert.strictEqual(config3ft?.total_sft, 10 * 3 * 164, '3ft total area must be 4,920 SFT')

    assert.ok(config5ft, 'Must contain 5ft roll configuration')
    assert.strictEqual(config5ft?.roll_count, 8, '5ft configuration must have exactly 8 Rolls')
    assert.strictEqual(config5ft?.total_sft, 8 * 5 * 164, '5ft total area must be 6,560 SFT')

    assert.strictEqual(
      breakdown.formatted_summary,
      '10 Roll (3ft × 164ft) • 8 Roll (5ft × 164ft)',
      'Summary format must explicitly preserve discrete dimensions and roll counts'
    )
  })

  // 2. EVERY ROLL GETS AN INDIVIDUAL IDENTITY
  it('2. should assign and preserve discrete identity and traceability metadata for every physical roll', async () => {
    const roll = await InventoryRepository.createPhysicalRoll({
      company_id: testCompanyId,
      material_id: pvcMaster.id,
      roll_code: 'PVC3-004',
      roll_tag: 'PVC3-004',
      width_ft: 3,
      initial_length_ft: 164,
      unit_cost: 9840,
      supplier_id: 'sup-abc-trading',
      batch_lot_number: 'BATCH-2026-09',
      location_name: 'Main Store',
      notes: 'Direct warehouse stock intake',
      status: 'in_warehouse',
    } as any)

    assert.strictEqual(roll.roll_code, 'PVC3-004', 'Roll ID must be PVC3-004')
    assert.strictEqual(roll.width_ft, 3, 'Width must be 3 ft')
    assert.strictEqual(roll.initial_length_ft, 164, 'Original length must be 164 ft')
    assert.strictEqual(roll.current_length_ft, 164, 'Remaining length must be 164 ft')
    assert.strictEqual(roll.status, 'in_warehouse', 'Initial status must be in_warehouse')
    assert.strictEqual(roll.unit_cost, 9840, 'Purchase unit cost must be preserved')
    assert.strictEqual(roll.supplier_id, 'sup-abc-trading')
    assert.strictEqual(roll.batch_lot_number, 'BATCH-2026-09')
  })

  // 3. ISSUE TO PRODUCTION (PURCHASE UNIT TRANSFER)
  it('3. should issue specific physical roll (1 Roll) to Production Floor without converting to sqft at issue', async () => {
    // 1. Create a warehouse roll in Main Store
    const storeRoll = await InventoryRepository.createPhysicalRoll({
      company_id: testCompanyId,
      material_id: pvcMaster.id,
      roll_code: 'PVC3-004',
      roll_tag: 'PVC3-004',
      width_ft: 3,
      initial_length_ft: 164,
      unit_cost: 9840,
      location_name: 'Main Store',
      status: 'in_warehouse',
    } as any)

    // 2. Issue 1 Roll to Production Floor
    const issueResult = await InventoryRepository.issueMasterRollsBatch({
      company_id: testCompanyId,
      material_id: pvcMaster.id,
      width_ft: 3,
      length_ft: 164,
      quantity_rolls: 1,
      destination: 'machine',
      machine_id: 'roland-eco',
      machine_name: 'Roland Eco-Solvent',
      roll_code_custom: 'PVC3-004',
      operator_name: 'Jamal Ahmed',
    })

    assert.strictEqual(issueResult.quantity_issued, 1, 'Store issues exactly 1 Roll (Purchase Unit)')
    assert.strictEqual(issueResult.total_area_sft, 492, 'Derived area is 492 SFT but unit issued was 1 Roll')
    assert.strictEqual(issueResult.roll.roll_code, 'PVC3-004')
    assert.strictEqual(issueResult.roll.status, 'mounted', 'Roll status is now mounted on floor')
    assert.strictEqual(issueResult.roll.location_name, 'Print Floor', 'Physical location is now Print Floor')
  })

  // 4. PRODUCTION FLOOR INVENTORY & PIECE-LEVEL IDENTIFIABILITY
  it('4. should maintain physical piece identity on production floor (Width 3ft Available Length 143.75ft - 1 Pcs)', () => {
    const floorRoll: InventoryRollRecord = {
      id: 'roll-pvc3-004',
      company_id: testCompanyId,
      material_id: pvcMaster.id,
      material: { name: 'PVC' },
      roll_code: 'PVC3-004',
      roll_tag: 'PVC3-004',
      width_ft: 3,
      initial_length_ft: 164,
      current_length_ft: 143.75,
      remaining_length_ft: 143.75,
      initial_area_sft: 492,
      consumed_area_sft: 60.75,
      remaining_area_sft: 431.25,
      status: 'in_use',
      location_name: 'Print Floor',
      created_at: new Date().toISOString(),
    }

    const display = formatFloorPieceDisplay(floorRoll)
    assert.strictEqual(
      display,
      'PVC Width 3ft Available Length 143.75ft - 1 Pcs [PVC3-004]',
      'Floor display must strictly format piece dimensions and remaining linear footage'
    )

    // Derived area calculation: 3ft * 143.75ft = 431.25 sqft
    const derivedArea = RollConsumptionEngine.calculateDerivedAreaSft(floorRoll.width_ft, floorRoll.current_length_ft!)
    assert.strictEqual(derivedArea, 431.25, 'Derived economic area must be 431.25 sqft')
  })

  // 5. JOB LENGTH REQUIREMENT EVALUATION & RECOMMENDATION
  it('5. should evaluate active floor rolls against job length requirements (20ft) and reject insufficient rolls', () => {
    const floorRolls: InventoryRollRecord[] = [
      {
        id: 'r-004',
        roll_code: 'PVC3-004',
        roll_tag: 'PVC3-004',
        material_id: pvcMaster.id,
        width_ft: 3,
        initial_length_ft: 164,
        current_length_ft: 143.75,
        remaining_area_sft: 431.25,
        consumed_area_sft: 60.75,
        initial_area_sft: 492,
        status: 'in_use',
        created_at: new Date().toISOString(),
      },
      {
        id: 'r-005',
        roll_code: 'PVC3-005',
        roll_tag: 'PVC3-005',
        material_id: pvcMaster.id,
        width_ft: 3,
        initial_length_ft: 164,
        current_length_ft: 18.0, // Short: cannot fulfill 20ft!
        remaining_area_sft: 54.0,
        consumed_area_sft: 438.0,
        initial_area_sft: 492,
        status: 'in_use',
        created_at: new Date().toISOString(),
      },
      {
        id: 'r-006',
        roll_code: 'PVC3-006',
        roll_tag: 'PVC3-006',
        material_id: pvcMaster.id,
        width_ft: 3,
        initial_length_ft: 164,
        current_length_ft: 143.75,
        remaining_area_sft: 431.25,
        consumed_area_sft: 60.75,
        initial_area_sft: 492,
        status: 'available',
        created_at: new Date().toISOString(),
      },
      {
        id: 'r-501',
        roll_code: 'PVC5-001',
        roll_tag: 'PVC5-001',
        material_id: pvcMaster.id,
        width_ft: 5,
        initial_length_ft: 164,
        current_length_ft: 30.0,
        remaining_area_sft: 150.0,
        consumed_area_sft: 670.0,
        initial_area_sft: 820,
        status: 'in_use',
        created_at: new Date().toISOString(),
      },
    ]

    // Job requires 3ft width, 20ft linear length
    const evaluation = RollConsumptionEngine.findEligibleRollsForJobRequirement(floorRolls, 3, 20)

    assert.strictEqual(evaluation.eligible_rolls.length, 3, 'PVC3-004, PVC3-006, and PVC5-001 can fulfill length/width')
    assert.strictEqual(evaluation.ineligible_rolls.length, 1, 'PVC3-005 (18ft) must be rejected for 20ft job')

    const rejectedRoll = evaluation.ineligible_rolls[0]
    assert.strictEqual(rejectedRoll.roll.roll_code, 'PVC3-005')
    assert.strictEqual(rejectedRoll.shortage_ft, 2, 'Shortage must be 2 ft (18ft available vs 20ft required)')
    assert.strictEqual(rejectedRoll.can_fulfill, false)

    // Recommended roll
    assert.ok(evaluation.recommended_roll, 'System should recommend an eligible roll')
  })

  // 6. FLOOR CONSUMPTION DEDUCTION & STOCK LEDGER
  it('6. should consume 20 linear ft from PVC3-004 (143.75ft -> 123.75ft) and update ledger and derived area (371.25 sqft)', async () => {
    // 1. Setup active roll on floor
    const roll = await InventoryRepository.createPhysicalRoll({
      company_id: testCompanyId,
      material_id: pvcMaster.id,
      roll_code: 'PVC3-004',
      roll_tag: 'PVC3-004',
      width_ft: 3,
      initial_length_ft: 164,
      unit_cost: 20, // ৳20/sqft
      location_name: 'Print Floor',
      status: 'mounted',
    } as any)

    // Set current length to 143.75ft
    roll.current_length_ft = 143.75
    roll.remaining_length_ft = 143.75
    roll.remaining_area_sft = 143.75 * 3
    PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, roll, testCompanyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, roll)

    // 2. Consume 20 linear ft for JOB-1050
    const consumptionResult = await InventoryService.consumeFromPhysicalRoll({
      company_id: testCompanyId,
      roll_id: roll.id,
      linear_length_consumed_ft: 20,
      bleed_allowance_ft: 0,
      wastage_length_ft: 0,
      production_task_id: 'JOB-1050',
      operator_name: 'Rafiqul Islam',
      notes: '20 linear ft feed for JOB-1050 banner printing',
    })

    const updatedRoll = consumptionResult.roll
    assert.strictEqual(updatedRoll.current_length_ft, 123.75, 'Remaining length must be exactly 123.75 ft')
    assert.strictEqual(updatedRoll.remaining_area_sft, 371.25, 'Derived remaining area must be 3 × 123.75 = 371.25 sqft')
    assert.strictEqual(updatedRoll.status, 'in_use', 'Partially consumed roll remains active on floor (in_use)')
    assert.strictEqual(updatedRoll.roll_code, 'PVC3-004', 'Roll identity remains PVC3-004')

    // 3. Verify Stock Ledger Entry
    const ledger = await InventoryRepository.getStockLedger(testCompanyId)
    const consumptionEntry = ledger.find((l) => l.production_task_id === 'JOB-1050' && l.transaction_type === 'CONSUMPTION')

    assert.ok(consumptionEntry, 'Must log stock ledger CONSUMPTION entry')
    assert.strictEqual(consumptionEntry?.quantity_change, -60, '60 sqft (20ft × 3ft) deducted from stock ledger')
  })

  // 7. DIFFERENTIATION OF PURCHASED ROLLS, PARTIAL ROLLS & REMNANTS
  it('7. should accurately differentiate Purchased Full Roll, Partial Active Roll, and Separated Remnant', () => {
    const purchasedRoll: Partial<InventoryRollRecord> = {
      width_ft: 3,
      initial_length_ft: 164,
      current_length_ft: 164,
      consumed_area_sft: 0,
      status: 'in_warehouse',
    }

    const partialRoll: Partial<InventoryRollRecord> = {
      width_ft: 3,
      initial_length_ft: 164,
      current_length_ft: 143.75,
      consumed_area_sft: 60.75,
      status: 'in_use',
    }

    const remnantPiece: any = {
      width_ft: 3,
      initial_length_ft: 18,
      current_length_ft: 18,
      is_remnant: true,
      status: 'remnant',
    }

    const depletedRoll: Partial<InventoryRollRecord> = {
      width_ft: 3,
      initial_length_ft: 164,
      current_length_ft: 0.2,
      status: 'depleted',
    }

    assert.strictEqual(
      RollConsumptionEngine.classifyRollState(purchasedRoll),
      'purchased_full_roll',
      'Pristine 164ft roll must be classified as purchased_full_roll'
    )
    assert.strictEqual(
      RollConsumptionEngine.classifyRollState(partialRoll),
      'partial_active_roll',
      'Partially consumed 143.75ft roll must be classified as partial_active_roll'
    )
    assert.strictEqual(
      RollConsumptionEngine.classifyRollState(remnantPiece),
      'remnant',
      'Physically separated offcut must be classified as remnant'
    )
    assert.strictEqual(
      RollConsumptionEngine.classifyRollState(depletedRoll),
      'depleted',
      'Roll with <0.5ft length must be classified as depleted'
    )
  })
})
