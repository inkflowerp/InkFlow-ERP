import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { InventoryService } from '../../services/inventory.service.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { getMaterialWarehouseStockBreakdown } from '../../lib/units.ts'
import type { MaterialRecord, InventoryLocationRecord } from '../../types/inventory.types.ts'

describe('Multi-Size Roll Stock Intake & Existing Stock Preservation Tests', () => {
  const companyId = `test_comp_preservation_${Date.now()}`

  const mockLocation: InventoryLocationRecord = {
    id: `loc-main-${Date.now()}`,
    company_id: companyId,
    location_name: 'Main Store',
    location_code: 'MAIN-STORE',
    location_type: 'raw_material_store',
    is_active: true,
    created_at: new Date().toISOString(),
  }

  // Substrate with 2 configured sizes: 2.25ft (369 SFT) and 3.25ft (533 SFT)
  const initialStarPvc: MaterialRecord = {
    id: `mat-star-pvc-${Date.now()}`,
    company_id: companyId,
    sku: 'MAT-01622',
    name: 'Star PVC',
    category: 'flex',
    unit: 'sft',
    purchase_unit: 'roll',
    conversion_factor: 369,
    current_stock: 26650, // Starts with 50 rolls of 3.25ft x 164ft = 26,650 SFT
    average_cost: 7.0,
    last_purchase_price: 3731,
    is_roll: true,
    roll_width_ft: 2,
    standard_roll_length_ft: 164,
    production_width_allowance: 0.25,
    roll_sizes: [
      {
        id: 'size-2.25',
        key: 'size-2.25',
        width: 2,
        nominal_width_ft: 2,
        width_ft: 2.25,
        length_ft: 164,
        allowance_ft: 0.25,
        extra_allowance: 0.25,
        purchase_price: 2583,
        roll_count: 0,
        total_sft: 0,
      },
      {
        id: 'size-3.25',
        key: 'size-3.25',
        width: 3,
        nominal_width_ft: 3,
        width_ft: 3.25,
        length_ft: 164,
        allowance_ft: 0.25,
        extra_allowance: 0.25,
        purchase_price: 3731,
        roll_count: 0,
        total_sft: 0,
      },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  it('1. Before receive stock: 3.25ft has 50 rolls (26,650 SFT), 2.25ft has 0 rolls (Out of Stock)', async () => {
    PrintERPDataStore.addItem(STORAGE_KEYS.LOCATIONS, mockLocation, companyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, initialStarPvc, companyId)

    const initialRolls = await InventoryRepository.getInventoryRolls(companyId, { materialId: initialStarPvc.id })
    const breakdown = getMaterialWarehouseStockBreakdown(initialStarPvc, initialRolls)

    const item225 = breakdown.roll_items.find((r) => r.width_ft === 2.25)
    const item325 = breakdown.roll_items.find((r) => r.width_ft === 3.25)

    assert.ok(item225, '2.25ft row must exist')
    assert.ok(item325, '3.25ft row must exist')

    assert.strictEqual(item225?.roll_count, 0, '2.25ft must have 0 rolls before intake')
    assert.strictEqual(item225?.total_sft, 0, '2.25ft must have 0 SFT')

    assert.strictEqual(item325?.roll_count, 50, '3.25ft must have 50 rolls before intake')
    assert.strictEqual(item325?.total_sft, 26650, '3.25ft must have 26,650 SFT')
  })

  it('2. Receive 30 rolls of 2.25ft: 2.25ft becomes 30 rolls AND 3.25ft preserves its 50 rolls (Total 80 rolls)', async () => {
    // Receive 30 rolls of 2.25ft x 164ft (2ft nominal + 0.25ft allowance)
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: initialStarPvc.id,
      location_id: mockLocation.id,
      quantity: 30,
      unit_cost: 2583,
      size_label: '2ft (+0.25ft) x 164ft (369 sqft)',
      width_ft: 2.25,
      length_ft: 164,
      allowance_ft: 0.25,
      purchase_unit: 'roll',
      performed_by_name: 'Store Manager',
    })

    const freshMat = await InventoryRepository.getMaterialById(initialStarPvc.id, companyId)
    assert.ok(freshMat, 'Material must exist after intake')
    assert.strictEqual(freshMat.current_stock, 26650 + 11070, 'Total current_stock must be 37,720 SFT (26,650 + 11,070)')

    const rollsAfter = await InventoryRepository.getInventoryRolls(companyId, { materialId: initialStarPvc.id })
    const breakdownAfter = getMaterialWarehouseStockBreakdown(freshMat, rollsAfter)

    const item225 = breakdownAfter.roll_items.find((r) => r.width_ft === 2.25)
    const item325 = breakdownAfter.roll_items.find((r) => r.width_ft === 3.25)

    assert.ok(item225, '2.25ft row must exist')
    assert.ok(item325, '3.25ft row must exist')

    assert.strictEqual(item225?.roll_count, 30, '2.25ft must now have exactly 30 rolls')
    assert.strictEqual(item225?.total_sft, 11070, '2.25ft must have 11,070 SFT')
    assert.strictEqual(item225?.total_valuation, 77490, '2.25ft valuation must be ৳ 77,490 (30 × ৳2,583)')

    assert.strictEqual(item325?.roll_count, 50, '3.25ft must STILL have 50 rolls (NOT zeroed out!)')
    assert.strictEqual(item325?.total_sft, 26650, '3.25ft must have 26,650 SFT')
    assert.strictEqual(item325?.total_valuation, 186550, '3.25ft valuation must be ৳ 1,86,550 (50 × ৳3,731)')

    assert.strictEqual(breakdownAfter.total_rolls, 80, 'Total rolls in warehouse must be 80 rolls (30 + 50)')
  })

  it('3. Subsequent intake of 10 rolls of 3.25ft accumulates to 60 rolls for 3.25ft and keeps 30 rolls for 2.25ft (Total 90 rolls)', async () => {
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: initialStarPvc.id,
      location_id: mockLocation.id,
      quantity: 10,
      unit_cost: 3731,
      size_label: '3ft (+0.25ft) x 164ft (533 sqft)',
      width_ft: 3.25,
      length_ft: 164,
      allowance_ft: 0.25,
      purchase_unit: 'roll',
      performed_by_name: 'Store Manager',
    })

    const freshMat = await InventoryRepository.getMaterialById(initialStarPvc.id, companyId)
    assert.ok(freshMat, 'Material must exist after second intake')
    assert.strictEqual(freshMat.current_stock, 37720 + 5330, 'Total current_stock must be 43,050 SFT')

    const rollsAfter = await InventoryRepository.getInventoryRolls(companyId, { materialId: initialStarPvc.id })
    const breakdownAfter = getMaterialWarehouseStockBreakdown(freshMat, rollsAfter)

    const item225 = breakdownAfter.roll_items.find((r) => r.width_ft === 2.25)
    const item325 = breakdownAfter.roll_items.find((r) => r.width_ft === 3.25)

    assert.strictEqual(item225?.roll_count, 30, '2.25ft must remain at 30 rolls')
    assert.strictEqual(item325?.roll_count, 60, '3.25ft must accumulate to 60 rolls (50 + 10)')
    assert.strictEqual(breakdownAfter.total_rolls, 90, 'Total rolls must be 90 rolls')
  })
})
