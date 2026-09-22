import test from 'node:test'
import assert from 'node:assert/strict'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store'
import { InventoryRepository } from '../../lib/repositories/inventory.repository'
import {
  getMaterialWarehouseStockBreakdown,
  formatFloorPieceDisplay,
} from '../../lib/units'
import { RollConsumptionEngine } from '../../lib/domain/roll-consumption-engine'

test('Purchase Unit Store & Piece-Based Floor Consumption Lifecycle', async (t) => {
  const companyId = 'tenant-purchase-unit-test-corp'

  // Reset store
  PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [], true, companyId)
  PrintERPDataStore.set(STORAGE_KEYS.MOUNTED_ROLLS, [], true, companyId)
  PrintERPDataStore.set(STORAGE_KEYS.STOCK_LEDGER, [], true, companyId)

  // 1. Setup Material: PVC Media
  const pvcMaterial = {
    id: 'mat-pvc-001',
    company_id: companyId,
    sku: 'PVC-GEN-01',
    name: 'PVC Banner Media',
    unit: 'sft',
    current_stock: 11480, // 10 Rolls of 3ft (4920 SFT) + 8 Rolls of 5ft (6560 SFT)
    is_roll: true,
    available_widths_ft: [3, 5],
    standard_roll_length_ft: 164,
  }

  // 2. Setup Registered Warehouse Rolls (10 Rolls @ 3ft, 8 Rolls @ 5ft)
  const warehouseRolls = [
    ...Array.from({ length: 10 }).map((_, i) => ({
      id: `wh-roll-3ft-${i + 1}`,
      company_id: companyId,
      material_id: 'mat-pvc-001',
      roll_code: `ROL-3FT-${String(i + 1).padStart(3, '0')}`,
      width_ft: 3,
      initial_length_ft: 164,
      current_length_ft: 164,
      initial_area_sft: 492,
      remaining_area_sft: 492,
      status: 'in_warehouse' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    ...Array.from({ length: 8 }).map((_, i) => ({
      id: `wh-roll-5ft-${i + 1}`,
      company_id: companyId,
      material_id: 'mat-pvc-001',
      roll_code: `ROL-5FT-${String(i + 1).padStart(3, '0')}`,
      width_ft: 5,
      initial_length_ft: 164,
      current_length_ft: 164,
      initial_area_sft: 820,
      remaining_area_sft: 820,
      status: 'in_warehouse' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
  ]

  PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [pvcMaterial], true, companyId)
  PrintERPDataStore.set(STORAGE_KEYS.MOUNTED_ROLLS, warehouseRolls, true, companyId)

  await t.test('1. Warehouse Inventory Breakdown displays stock as Purchase Units', () => {
    const breakdown = getMaterialWarehouseStockBreakdown(pvcMaterial, warehouseRolls)

    assert.equal(breakdown.total_rolls, 18)
    assert.equal(breakdown.purchase_unit_display, '18 Rolls')
    assert.equal(breakdown.total_stock_display, '11,480 SFT')

    assert.equal(breakdown.roll_items.length, 2)
    assert.equal(breakdown.roll_items[0].width_ft, 3)
    assert.equal(breakdown.roll_items[0].roll_count, 10)
    assert.equal(breakdown.roll_items[0].total_sft, 4920)

    assert.equal(breakdown.roll_items[1].width_ft, 5)
    assert.equal(breakdown.roll_items[1].roll_count, 8)
    assert.equal(breakdown.roll_items[1].total_sft, 6560)

    assert.equal(
      breakdown.formatted_summary,
      '10 Roll (3ft × 164ft) • 8 Roll (5ft × 164ft)'
    )
  })

  await t.test('2. Issue whole Purchase Unit (1 Roll) to floor and verify warehouse decrement', async () => {
    // Dispatch 1 roll of 3ft to the print floor
    const issuedRoll = warehouseRolls[0]
    issuedRoll.status = 'available'
    issuedRoll.location_name = 'Print Floor'

    PrintERPDataStore.set(STORAGE_KEYS.MOUNTED_ROLLS, warehouseRolls, true, companyId)

    // Verify remaining warehouse rolls (now 9 rolls of 3ft and 8 rolls of 5ft in warehouse)
    const breakdownAfterIssue = getMaterialWarehouseStockBreakdown(pvcMaterial, warehouseRolls)
    assert.equal(breakdownAfterIssue.total_rolls, 17)
    assert.equal(
      breakdownAfterIssue.formatted_summary,
      '9 Roll (3ft × 164ft) • 8 Roll (5ft × 164ft)'
    )
  })

  await t.test('3. Floor Consumption Unit formatting standard matches piece specs', () => {
    // User requested examples:
    // "PVC Width 3ft Available Length 143.75ft - 1 Pcs"
    // "PVC Width 3ft Available Length 18.00ft - 1 Pcs"
    // "PVC Width 5ft Available Length 30.00ft - 1 Pcs"

    const piece1 = {
      material_name: 'PVC',
      width_ft: 3,
      current_length_ft: 143.75,
      remaining_area_sft: 143.75 * 3,
    }
    const piece2 = {
      material_name: 'PVC',
      width_ft: 3,
      current_length_ft: 18.0,
      remaining_area_sft: 18.0 * 3,
    }
    const piece3 = {
      material_name: 'PVC',
      width_ft: 5,
      current_length_ft: 30.0,
      remaining_area_sft: 30.0 * 5,
    }

    assert.equal(formatFloorPieceDisplay(piece1), 'PVC Width 3ft Available Length 143.75ft - 1 Pcs')
    assert.equal(formatFloorPieceDisplay(piece2), 'PVC Width 3ft Available Length 18.00ft - 1 Pcs')
    assert.equal(formatFloorPieceDisplay(piece3), 'PVC Width 5ft Available Length 30.00ft - 1 Pcs')
  })

  await t.test('4. Consume from physical piece and verify piece-level remaining length update', async () => {
    // Create an active floor piece: PVC Width 3ft, Available Length 18.00ft - 1 Pcs
    const floorPiece = await InventoryRepository.createPhysicalRoll({
      company_id: companyId,
      material_id: 'mat-pvc-001',
      roll_code: 'ROL-PVC-PIECE-18FT',
      width_ft: 3,
      initial_length_ft: 18.0,
      unit_cost: 15,
    })

    assert.equal(formatFloorPieceDisplay({ ...floorPiece, material_name: 'PVC' }), 'PVC Width 3ft Available Length 18.00ft - 1 Pcs [ROL-PVC-PIECE-18FT]')

    // Calculate linear consumption: print job 3ft x 5ft (1 Pcs) with 3 inch (0.25ft) bleed
    const feed = RollConsumptionEngine.calculateRollLinearFeed({
      roll_width_ft: floorPiece.width_ft,
      roll_current_length_ft: floorPiece.current_length_ft,
      job_width_ft: 3,
      job_length_ft: 5,
      quantity: 1,
      bleed_allowance_in: 3,
    })

    assert.equal(feed.linear_feed_ft, 5.0)
    assert.equal(feed.bleed_allowance_ft, 0.25)
    assert.equal(feed.total_linear_deduction_ft, 5.25)
    assert.equal(feed.new_remaining_length_ft, 12.75)

    // Execute direct piece consumption
    const consumptionResult = await InventoryRepository.consumeFromPhysicalRoll({
      company_id: companyId,
      roll_id: floorPiece.id,
      linear_length_consumed_ft: feed.linear_feed_ft,
      bleed_allowance_ft: feed.bleed_allowance_ft,
      operator_name: 'Print Operator Karim',
      notes: '3x5 Banner Run on Active Piece',
    })

    assert.equal(consumptionResult.roll.current_length_ft, 12.75)
    assert.equal(consumptionResult.roll.remaining_area_sft, 12.75 * 3) // 38.25 SFT

    // Format new piece display
    const updatedPieceDisplay = formatFloorPieceDisplay({
      ...consumptionResult.roll,
      material_name: 'PVC',
    })
    assert.equal(
      updatedPieceDisplay,
      'PVC Width 3ft Available Length 12.75ft - 1 Pcs [ROL-PVC-PIECE-18FT]'
    )
  })

  await t.test('5. Non-roll warehouse materials fall back gracefully to item count purchase units', () => {
    const hardwareItem = {
      id: 'prod-standee-001',
      name: 'Roll-up Standee 3ftx6ft Hardware',
      unit: 'pcs',
      current_stock: 45,
      is_roll: false,
    }

    const breakdown = getMaterialWarehouseStockBreakdown(hardwareItem)
    assert.equal(breakdown.total_rolls, 0)
    assert.equal(breakdown.purchase_unit_display, '45 pcs')
    assert.equal(breakdown.formatted_summary, '45 pcs')
  })
})
