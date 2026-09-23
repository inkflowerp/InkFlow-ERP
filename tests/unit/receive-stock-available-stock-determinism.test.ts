import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore } from '../../lib/db/data-store.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { getMaterialWarehouseStockBreakdown } from '../../lib/units.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'

describe('Available Stock & Receive Stock Determinism Across Refreshes', () => {
  const testCompanyId = 'comp-determinism-audit-test'

  // Replicate exact user setup: PVC with 2ft x 164ft and 3.25ft (+0.25) x 164ft
  const initialPvcMaster: MaterialRecord = {
    id: 'mat-pvc-user-scenario',
    company_id: testCompanyId,
    sku: 'MAT-52752',
    name: 'PVC',
    category: 'flex_banner',
    unit: 'sft',
    purchase_unit: 'roll',
    is_roll: true,
    production_width_allowance: 0.25,
    roll_sizes: [
      {
        id: 'roll-size-2x164',
        label: '2ft × 164ft',
        width: 2,
        nominal_width_ft: 2,
        width_ft: 2,
        allowance_ft: 0,
        extra_allowance: 0,
        length: 164,
        length_ft: 164,
        quantity: 16,
        stock_qty: 16,
        stock: 16,
        roll_count: 16,
        total_sft: 16 * 328,
        price: 3280,
        unit_cost: 3280,
      },
      {
        id: 'roll-size-3x164-0.25',
        label: '3ft (+0.25ft) × 164ft',
        width: 3,
        nominal_width_ft: 3,
        width_ft: 3.25,
        allowance_ft: 0.25,
        extra_allowance: 0.25,
        length: 164,
        length_ft: 164,
        quantity: 17,
        stock_qty: 17,
        stock: 17,
        roll_count: 17,
        total_sft: 17 * 533,
        price: 5330,
        unit_cost: 5330,
      },
    ],
    current_stock: 16 * 328 + 17 * 533, // 5,248 + 9,061 = 14,309 SFT
    min_stock_level: 500,
    average_cost: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(async () => {
    PrintERPDataStore.purgeTenantData(testCompanyId)
    PrintERPDataStore.clearAll(testCompanyId)
    await InventoryService.createMaterial(initialPvcMaster)
  })

  it('1. Pre-intake verification: shows exactly 16 rolls of 2ft and 17 rolls of 3.25ft (Total 33 rolls, 14,309 SFT)', async () => {
    const mat = await InventoryRepository.getMaterialById(initialPvcMaster.id, testCompanyId)
    assert.ok(mat)

    const rolls = await InventoryRepository.getInventoryRolls(testCompanyId, {
      materialId: initialPvcMaster.id,
    })

    const breakdown = getMaterialWarehouseStockBreakdown(mat!, rolls)

    assert.strictEqual(breakdown.total_rolls, 33, 'Total rolls must be exactly 33')
    assert.strictEqual(breakdown.roll_items.length, 2, 'Must have exactly 2 configured sizes')

    const size2ft = breakdown.roll_items.find((x) => Math.abs(x.width_ft - 2) < 0.05)
    const size325ft = breakdown.roll_items.find((x) => Math.abs(x.width_ft - 3.25) < 0.05)

    assert.ok(size2ft, '2ft size must exist')
    assert.strictEqual(size2ft?.roll_count, 16, '2ft size must have 16 rolls')
    assert.strictEqual(size2ft?.total_sft, 5248, '2ft size total SFT must be 5,248')

    assert.ok(size325ft, '3.25ft size must exist')
    assert.strictEqual(size325ft?.roll_count, 17, '3.25ft size must have 17 rolls')
    assert.strictEqual(size325ft?.total_sft, 9061, '3.25ft size total SFT must be 9,061')
  })

  it('2. Receive 50 rolls of 2ft x 164ft: 2ft becomes 66 rolls (21,648 SFT) and 3.25ft preserves 17 rolls (9,061 SFT)', async () => {
    // Receive 50 rolls of 2ft x 164ft (allowance 0)
    const intakeResult = await InventoryService.receiveStock({
      company_id: testCompanyId,
      material_id: initialPvcMaster.id,
      location_id: 'loc-main-warehouse',
      quantity: 50,
      unit_cost: 3280,
      width_ft: 2,
      length_ft: 164,
      allowance_ft: 0,
      size_label: '2ft × 164ft (328 sqft)',
      physical_form: 'roll',
      purchase_unit: 'roll',
      supplier_name: 'Standard Flex Supplier',
      performed_by_name: 'Store Keeper',
    })

    assert.strictEqual(intakeResult.rollsCreated?.length, 50, 'Must create 50 physical rolls')
    assert.strictEqual(intakeResult.rollsCreated![0].width_ft, 2, 'Physical roll width must be exactly 2ft, NOT 2.25ft')
    assert.strictEqual(intakeResult.rollsCreated![0].remaining_area_sft, 328, 'Physical roll area must be 328 SFT')

    // Fetch updated material & rolls
    const updatedMat = await InventoryRepository.getMaterialById(initialPvcMaster.id, testCompanyId)
    assert.ok(updatedMat)

    const storeRolls = await InventoryRepository.getInventoryRolls(testCompanyId, {
      materialId: initialPvcMaster.id,
    })

    assert.strictEqual(storeRolls.length, 50, 'Must have 50 physical warehouse rolls')

    // Initial breakdown after intake
    const breakdown1 = getMaterialWarehouseStockBreakdown(updatedMat!, storeRolls)

    assert.strictEqual(breakdown1.total_rolls, 83, 'Total rolls must be 16 + 50 + 17 = 83')
    assert.strictEqual(breakdown1.roll_items.length, 2, 'Must remain strictly 2 configured size groups, NO 2.25ft duplicate')

    const size2ft = breakdown1.roll_items.find((x) => Math.abs(x.width_ft - 2) < 0.05)
    const size325ft = breakdown1.roll_items.find((x) => Math.abs(x.width_ft - 3.25) < 0.05)

    assert.ok(size2ft, '2ft size must exist')
    assert.strictEqual(size2ft?.roll_count, 66, '2ft size must have 16 + 50 = 66 rolls')
    assert.strictEqual(size2ft?.total_sft, 66 * 328, '2ft size total SFT must be 21,648')
    assert.strictEqual(size2ft?.total_valuation, 66 * 3280, '2ft size valuation must be ৳ 2,16,480')

    assert.ok(size325ft, '3.25ft size must exist')
    assert.strictEqual(size325ft?.roll_count, 17, '3.25ft size must preserve 17 rolls')
    assert.strictEqual(size325ft?.total_sft, 17 * 533, '3.25ft size total SFT must be 9,061')
    assert.strictEqual(size325ft?.total_valuation, 17 * 5330, '3.25ft size valuation must be ৳ 90,610')

    // Total valuation must be exact sum
    assert.strictEqual(breakdown1.total_valuation, 66 * 3280 + 17 * 5330, 'Total valuation must be ৳ 3,07,090')
  })

  it('3. Multi-Refresh Invariance: Data remains 100% deterministic across 10 consecutive refreshes / evaluations', async () => {
    // Receive 50 rolls of 2ft x 164ft
    await InventoryService.receiveStock({
      company_id: testCompanyId,
      material_id: initialPvcMaster.id,
      location_id: 'loc-main-warehouse',
      quantity: 50,
      unit_cost: 3280,
      width_ft: 2,
      length_ft: 164,
      allowance_ft: 0,
      size_label: '2ft × 164ft (328 sqft)',
      physical_form: 'roll',
      purchase_unit: 'roll',
      performed_by_name: 'Store Keeper',
    })

    // Simulate 10 page refreshes with various client/server query permutations
    for (let refresh = 1; refresh <= 10; refresh++) {
      const liveMat = await InventoryRepository.getMaterialById(initialPvcMaster.id, testCompanyId)
      const liveRolls = await InventoryRepository.getInventoryRolls(testCompanyId, {
        materialId: initialPvcMaster.id,
      })

      // Breakdown with rolls
      const bWithRolls = getMaterialWarehouseStockBreakdown(liveMat!, liveRolls)
      assert.strictEqual(bWithRolls.total_rolls, 83, `Refresh #${refresh}: total rolls must be 83`)
      const r2ft = bWithRolls.roll_items.find((x) => Math.abs(x.width_ft - 2) < 0.05)
      const r325ft = bWithRolls.roll_items.find((x) => Math.abs(x.width_ft - 3.25) < 0.05)
      assert.strictEqual(r2ft?.roll_count, 66, `Refresh #${refresh}: 2ft must have 66 rolls`)
      assert.strictEqual(r325ft?.roll_count, 17, `Refresh #${refresh}: 3.25ft must have 17 rolls`)

      // Breakdown without rolls array (fallback to explicit material roll sizes)
      const bWithoutRolls = getMaterialWarehouseStockBreakdown(liveMat!)
      assert.strictEqual(bWithoutRolls.total_rolls, 83, `Refresh #${refresh} (fallback): total rolls must be 83`)
      const f2ft = bWithoutRolls.roll_items.find((x) => Math.abs(x.width_ft - 2) < 0.05)
      const f325ft = bWithoutRolls.roll_items.find((x) => Math.abs(x.width_ft - 3.25) < 0.05)
      assert.strictEqual(f2ft?.roll_count, 66, `Refresh #${refresh} (fallback): 2ft must have 66 rolls`)
      assert.strictEqual(f325ft?.roll_count, 17, `Refresh #${refresh} (fallback): 3.25ft must have 17 rolls`)
    }
  })
})
