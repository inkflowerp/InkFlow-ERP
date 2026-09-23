import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore } from '../../lib/db/data-store.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { getMaterialWarehouseStockBreakdown } from '../../lib/units.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'

describe('PVC Multi-Size Roll Stock Intake & Distinct Inventory Grouping', () => {
  const testCompanyId = 'comp-pvc-multi-size-test-01'

  const pvcMaster: MaterialRecord = {
    id: 'mat-pvc-multi-001',
    company_id: testCompanyId,
    sku: 'MAT-50193',
    name: 'PVC',
    category: 'flex_banner',
    unit: 'sft',
    purchase_unit: 'roll',
    is_roll: true,
    production_width_allowance: 0.25,
    roll_sizes: [
      {
        width: 4,
        nominal_width_ft: 4,
        width_ft: 4.25,
        allowance_ft: 0.25,
        extra_allowance: 0.25,
        length: 100,
        length_ft: 100,
        quantity: 0,
        price: 4250,
      },
      {
        width: 5,
        nominal_width_ft: 5,
        width_ft: 5.25,
        allowance_ft: 0.25,
        extra_allowance: 0.25,
        length: 164,
        length_ft: 164,
        quantity: 0,
        price: 8610,
      },
      {
        width: 10,
        nominal_width_ft: 10,
        width_ft: 10.5,
        allowance_ft: 0.5,
        extra_allowance: 0.5,
        length: 164,
        length_ft: 164,
        quantity: 0,
        price: 17220,
      },
    ],
    current_stock: 0,
    min_stock_level: 500,
    average_cost: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(async () => {
    PrintERPDataStore.purgeTenantData(testCompanyId)
    PrintERPDataStore.clearAll(testCompanyId)
    await InventoryService.createMaterial(pvcMaster)
  })

  it('1. should receive 3 distinct roll sizes (5 rolls each) and create 3 separate groups of 5 rolls without collapsing', async () => {
    // 1. Receive PVC 4ft x 100ft - 5 Roll
    const intake1 = await InventoryService.receiveStock({
      company_id: testCompanyId,
      material_id: pvcMaster.id,
      location_id: 'loc-main-store',
      quantity: 5,
      unit_cost: 4250,
      width_ft: 4,
      length_ft: 100,
      size_label: '4 ft (+0.25ft) × 100 ft',
      physical_form: 'roll',
      purchase_unit: 'roll',
      supplier_name: 'Supplier A',
      performed_by_name: 'Store Manager',
    })

    // 2. Receive PVC 5.25ft x 164ft - 5 Roll
    const intake2 = await InventoryService.receiveStock({
      company_id: testCompanyId,
      material_id: pvcMaster.id,
      location_id: 'loc-main-store',
      quantity: 5,
      unit_cost: 8610,
      width_ft: 5.25,
      length_ft: 164,
      size_label: '5 ft (+0.25ft) × 164 ft',
      physical_form: 'roll',
      purchase_unit: 'roll',
      supplier_name: 'Supplier A',
      performed_by_name: 'Store Manager',
    })

    // 3. Receive PVC 10.5ft x 164ft - 5 Roll
    const intake3 = await InventoryService.receiveStock({
      company_id: testCompanyId,
      material_id: pvcMaster.id,
      location_id: 'loc-main-store',
      quantity: 5,
      unit_cost: 17220,
      width_ft: 10.5,
      length_ft: 164,
      size_label: '10 ft (+0.5ft) × 164 ft',
      physical_form: 'roll',
      purchase_unit: 'roll',
      supplier_name: 'Supplier A',
      performed_by_name: 'Store Manager',
    })

    assert.strictEqual(intake1.rollsCreated?.length, 5, 'Must create 5 physical rolls for 4ft')
    assert.strictEqual(intake2.rollsCreated?.length, 5, 'Must create 5 physical rolls for 5.25ft')
    assert.strictEqual(intake3.rollsCreated?.length, 5, 'Must create 5 physical rolls for 10.5ft')

    // Fetch warehouse rolls
    const storeRolls = await InventoryRepository.getInventoryRolls(testCompanyId, {
      materialId: pvcMaster.id,
    })

    assert.strictEqual(storeRolls.length, 15, 'Total warehouse physical rolls must be exactly 15')

    // Fetch live material master
    const updatedMat = await InventoryRepository.getMaterialById(pvcMaster.id, testCompanyId)
    assert.ok(updatedMat, 'Updated material must exist')

    const breakdown = getMaterialWarehouseStockBreakdown(updatedMat, storeRolls)

    assert.strictEqual(breakdown.total_rolls, 15, 'Total rolls in breakdown must be 15')
    assert.strictEqual(breakdown.roll_items.length, 3, 'Must have exactly 3 distinct roll groups')

    const group4ft = breakdown.roll_items.find((x) => Math.abs(x.width_ft - 4) < 0.05 && x.length_ft === 100)
    const group5ft = breakdown.roll_items.find((x) => Math.abs(x.width_ft - 5) < 0.05 && x.length_ft === 164)
    const group10ft = breakdown.roll_items.find((x) => Math.abs(x.width_ft - 10) < 0.05 && x.length_ft === 164)

    assert.ok(group4ft, 'Group 1: 4ft × 100ft must exist')
    assert.strictEqual(group4ft?.roll_count, 5, 'Group 1 must have 5 rolls')
    assert.strictEqual(group4ft?.total_sft, 5 * 4 * 100, 'Group 1 area must be 2,000 SFT')

    assert.ok(group5ft, 'Group 2: 5ft × 164ft must exist')
    assert.strictEqual(group5ft?.roll_count, 5, 'Group 2 must have 5 rolls')
    assert.strictEqual(group5ft?.total_sft, 5 * 5 * 164, 'Group 2 area must be 4,100 SFT')

    assert.ok(group10ft, 'Group 3: 10ft × 164ft must exist')
    assert.strictEqual(group10ft?.roll_count, 5, 'Group 3 must have 5 rolls')
    assert.strictEqual(group10ft?.total_sft, 5 * 10 * 164, 'Group 3 area must be 8,200 SFT')

    assert.strictEqual(
      breakdown.formatted_summary,
      '5 Roll (4ft × 100ft) • 5 Roll (5ft × 164ft) • 5 Roll (10ft × 164ft)'
    )
    assert.strictEqual(breakdown.purchase_unit_display, '15 Rolls')
  })

  it('2. should correctly format stock breakdown with 3 distinct groups even if physical rolls array is not provided', async () => {
    const matWithStock: MaterialRecord = {
      ...pvcMaster,
      current_stock: 12325,
      roll_sizes: [
        {
          width: 4,
          nominal_width_ft: 4,
          width_ft: 4.25,
          allowance_ft: 0.25,
          length: 100,
          length_ft: 100,
        },
        {
          width: 5,
          nominal_width_ft: 5,
          width_ft: 5.25,
          allowance_ft: 0.25,
          length: 164,
          length_ft: 164,
        },
        {
          width: 10,
          nominal_width_ft: 10,
          width_ft: 10.5,
          allowance_ft: 0.5,
          length: 164,
          length_ft: 164,
        },
      ],
    }

    const breakdown = getMaterialWarehouseStockBreakdown(matWithStock)

    assert.strictEqual(breakdown.roll_items.length, 3, 'Must distribute into 3 distinct roll size groups')
    assert.ok(breakdown.roll_items.some((x) => Math.abs(x.width_ft - 4.25) < 0.05), 'Must contain 4.25ft group')
    assert.ok(breakdown.roll_items.some((x) => Math.abs(x.width_ft - 5.25) < 0.05), 'Must contain 5.25ft group')
    assert.ok(breakdown.roll_items.some((x) => Math.abs(x.width_ft - 10.5) < 0.05), 'Must contain 10.5ft group')
    assert.ok(breakdown.formatted_summary.includes('4.25ft × 100ft'), 'Summary must mention 4.25ft')
    assert.ok(breakdown.formatted_summary.includes('5.25ft × 164ft'), 'Summary must mention 5.25ft')
    assert.ok(breakdown.formatted_summary.includes('10.5ft × 164ft'), 'Summary must mention 10.5ft')
  })

  it('3. should receive 4ft (allowance 0) x 100ft - 1 Roll and preserve exact 4ft width and 400 SFT without auto-adding 0.25ft allowance', async () => {
    const intakeZeroAllowance = await InventoryService.receiveStock({
      company_id: testCompanyId,
      material_id: pvcMaster.id,
      location_id: 'loc-main-store',
      quantity: 1,
      unit_cost: 4000,
      width_ft: 4,
      length_ft: 100,
      size_label: '4ft (allowance 0) × 100ft',
      physical_form: 'roll',
      purchase_unit: 'roll',
      supplier_name: 'Supplier A',
      performed_by_name: 'Store Manager',
    })

    assert.strictEqual(intakeZeroAllowance.rollsCreated?.length, 1, 'Must create 1 physical roll')
    const createdRoll = intakeZeroAllowance.rollsCreated![0]
    assert.strictEqual(createdRoll.width_ft, 4, 'Physical roll width must be exactly 4ft, not 4.25ft')
    assert.strictEqual(createdRoll.remaining_area_sft, 400, 'Roll area must be exactly 400 SFT (4 × 100)')

    // Fetch warehouse rolls
    const storeRolls = await InventoryRepository.getInventoryRolls(testCompanyId, {
      materialId: pvcMaster.id,
    })
    const updatedMat = await InventoryRepository.getMaterialById(pvcMaster.id, testCompanyId)
    assert.ok(updatedMat, 'Updated material must exist')

    const breakdown = getMaterialWarehouseStockBreakdown(updatedMat, storeRolls)
    assert.strictEqual(breakdown.total_rolls, 1, 'Total rolls in breakdown must be 1')
    assert.strictEqual(breakdown.roll_items[0].total_sft, 400, 'Total SFT in breakdown must be 400')
    assert.strictEqual(breakdown.roll_items[0].width_ft, 4, 'Width must remain 4ft')
    assert.strictEqual(breakdown.roll_items[0].label, '4ft × 100ft')
  })

  it('4. should receive 2.25ft x 100ft - 1 Pcs on a material with 10 configured sizes and show ONLY 1 roll (2.25ft x 100ft, 225 SFT), NOT 10 rolls (8,384 SFT)', async () => {
    const mat10Sizes: MaterialRecord = {
      id: 'mat-pvc-10-sizes',
      company_id: testCompanyId,
      sku: 'MAT-225-10',
      name: 'Star Flex Banner Multi-Width',
      category: 'flex_banner',
      unit: 'sft',
      purchase_unit: 'roll',
      is_roll: true,
      roll_sizes: [
        { width: 2.25, width_ft: 2.25, length: 100, length_ft: 100 },
        { width: 2.25, width_ft: 2.25, length: 164, length_ft: 164 },
        { width: 2.5, width_ft: 2.5, length: 164, length_ft: 164 },
        { width: 3.25, width_ft: 3.25, length: 164, length_ft: 164 },
        { width: 4.25, width_ft: 4.25, length: 164, length_ft: 164 },
        { width: 5.25, width_ft: 5.25, length: 164, length_ft: 164 },
        { width: 6.25, width_ft: 6.25, length: 164, length_ft: 164 },
        { width: 7.25, width_ft: 7.25, length: 164, length_ft: 164 },
        { width: 8.25, width_ft: 8.25, length: 164, length_ft: 164 },
        { width: 10.5, width_ft: 10.5, length: 164, length_ft: 164 },
      ],
      current_stock: 0,
      average_cost: 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await InventoryService.createMaterial(mat10Sizes)

    // Receive only 1 Roll of 2.25ft x 100ft
    const intake = await InventoryService.receiveStock({
      company_id: testCompanyId,
      material_id: mat10Sizes.id,
      location_id: 'loc-main-store',
      quantity: 1,
      unit_cost: 2250,
      width_ft: 2.25,
      length_ft: 100,
      size_label: '2.25ft × 100ft',
      physical_form: 'roll',
      purchase_unit: 'roll',
      supplier_name: 'Supplier X',
      performed_by_name: 'Store Manager',
    })

    assert.strictEqual(intake.rollsCreated?.length, 1, 'Must create only 1 physical roll')
    assert.strictEqual(intake.rollsCreated![0].width_ft, 2.25)
    assert.strictEqual(intake.rollsCreated![0].initial_length_ft, 100)
    assert.strictEqual(intake.rollsCreated![0].remaining_area_sft, 225)

    const updatedMat = await InventoryRepository.getMaterialById(mat10Sizes.id, testCompanyId)
    assert.ok(updatedMat)

    const storeRolls = await InventoryRepository.getInventoryRolls(testCompanyId, {
      materialId: mat10Sizes.id,
    })
    assert.strictEqual(storeRolls.length, 1, 'Total warehouse physical rolls must be exactly 1')

    const breakdownWithRolls = getMaterialWarehouseStockBreakdown(updatedMat!, storeRolls)
    assert.strictEqual(breakdownWithRolls.total_rolls, 1, 'Total rolls in breakdown must be 1, NOT 10')
    assert.strictEqual(breakdownWithRolls.roll_items.length, 1, 'Must have only 1 active roll size item')
    assert.strictEqual(breakdownWithRolls.roll_items[0].roll_count, 1)
    assert.strictEqual(breakdownWithRolls.roll_items[0].width_ft, 2.25)
    assert.strictEqual(breakdownWithRolls.roll_items[0].length_ft, 100)
    assert.strictEqual(breakdownWithRolls.roll_items[0].total_sft, 225, 'Total SFT must be 225, NOT 8,384')

    // Also test stock breakdown fallback when rolls array is empty but current_stock = 225
    const matWithStockOnly: MaterialRecord = {
      ...mat10Sizes,
      current_stock: 225,
    }
    const breakdownFallback = getMaterialWarehouseStockBreakdown(matWithStockOnly)
    assert.strictEqual(breakdownFallback.total_rolls, 1, 'Fallback total rolls must be 1, NOT 10')
    assert.strictEqual(breakdownFallback.roll_items.length, 1, 'Fallback must allocate only to 2.25ft x 100ft')
    assert.strictEqual(breakdownFallback.roll_items[0].roll_count, 1)
    assert.strictEqual(breakdownFallback.roll_items[0].width_ft, 2.25)
    assert.strictEqual(breakdownFallback.roll_items[0].length_ft, 100)
    assert.strictEqual(breakdownFallback.roll_items[0].total_sft, 225, 'Fallback SFT must be 225, NOT 8,384')
  })
})

