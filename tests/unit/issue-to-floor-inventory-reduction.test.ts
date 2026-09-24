import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { getMaterialWarehouseStockBreakdown } from '../../lib/units.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'

describe('Issue to Floor Inventory Stock Reduction & Synchronization', () => {
  const testCompanyId = `test-floor-issue-company-${Date.now()}`

  beforeEach(() => {
    PrintERPDataStore.clear()
  })

  it('1. Roll media: issuing 1 of 2 rolls reduces warehouse breakdown to 1 roll (656 SFT), issuing second reduces to 0 rolls (0 SFT)', async () => {
    // 1. Setup roll material with 2 rolls (4ft x 164ft = 1,312 SFT)
    const rollMaterial: MaterialRecord = {
      id: `mat-roll-pvcflex-${Date.now()}`,
      company_id: testCompanyId,
      sku: 'MAT-PVC-FLEX',
      name: 'Star Flex Banner 380gsm',
      category: 'rolls',
      unit: 'sft',
      purchase_unit: 'roll',
      master_purchase_unit: 'roll',
      current_stock: 1312,
      average_cost: 6560,
      cost_per_unit: 10,
      is_roll: true,
      roll_width_ft: 4,
      roll_length_ft: 164,
      standard_roll_length_ft: 164,
      roll_sizes: [
        {
          nominal_width_ft: 4,
          width_ft: 4,
          length_ft: 164,
          roll_count: 2,
          quantity: 2,
          stock_qty: 2,
          price: 6560,
          allowance_ft: 0,
        },
      ],
      is_active: true,
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, rollMaterial, testCompanyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, rollMaterial)

    // Verify initial stock breakdown: 2 rolls, 1312 SFT
    const initialBreakdown = getMaterialWarehouseStockBreakdown(rollMaterial)
    assert.strictEqual(initialBreakdown.total_rolls, 2, 'Initial warehouse rolls must be 2')
    assert.strictEqual(initialBreakdown.total_stock_display, '1,312 SFT')
    assert.strictEqual(initialBreakdown.roll_items[0].roll_count, 2)
    assert.strictEqual(initialBreakdown.roll_items[0].total_sft, 1312)

    // 2. Issue 1 roll to floor
    const issue1Result = await InventoryService.issueMasterRollsBatch({
      company_id: testCompanyId,
      material_id: rollMaterial.id,
      quantity_rolls: 1,
      width_ft: 4,
      length_ft: 164,
      destination: 'floor_staging',
      operator_name: 'Floor Operator 1',
    })

    assert.strictEqual(issue1Result.quantity_issued, 1)
    assert.strictEqual(issue1Result.total_area_sft, 656)

    // 3. Verify warehouse material stock and breakdown after issuing 1 roll
    const updatedMat1 = await InventoryRepository.getMaterialById(rollMaterial.id, testCompanyId)
    assert.ok(updatedMat1)
    assert.strictEqual(updatedMat1.current_stock, 656, 'Warehouse material stock must be reduced to 656 SFT')

    const rollsInWarehouse1 = await InventoryRepository.getInventoryRolls(testCompanyId, {
      materialId: rollMaterial.id,
      status: 'available',
    })
    const breakdownAfter1 = getMaterialWarehouseStockBreakdown(updatedMat1, rollsInWarehouse1)
    assert.strictEqual(breakdownAfter1.total_rolls, 1, 'Warehouse breakdown total rolls must be reduced to 1')
    assert.strictEqual(breakdownAfter1.total_stock_display, '656 SFT')
    assert.strictEqual(breakdownAfter1.roll_items[0].roll_count, 1)
    assert.strictEqual(breakdownAfter1.roll_items[0].total_sft, 656)

    // 4. Issue the second roll to floor
    const issue2Result = await InventoryService.issueMasterRollsBatch({
      company_id: testCompanyId,
      material_id: rollMaterial.id,
      quantity_rolls: 1,
      width_ft: 4,
      length_ft: 164,
      destination: 'floor_staging',
      operator_name: 'Floor Operator 2',
    })

    assert.strictEqual(issue2Result.quantity_issued, 1)

    // 5. Verify warehouse stock is completely 0 and breakdown shows 0 rolls, 0 SFT, 0 valuation
    const updatedMat2 = await InventoryRepository.getMaterialById(rollMaterial.id, testCompanyId)
    assert.ok(updatedMat2)
    assert.strictEqual(updatedMat2.current_stock, 0, 'Warehouse material stock must be 0 SFT')

    const rollsInWarehouse2 = await InventoryRepository.getInventoryRolls(testCompanyId, {
      materialId: rollMaterial.id,
      status: 'available',
    })
    const breakdownAfter2 = getMaterialWarehouseStockBreakdown(updatedMat2, rollsInWarehouse2)
    assert.strictEqual(breakdownAfter2.total_rolls, 0, 'Warehouse breakdown total rolls must be 0')
    assert.strictEqual(breakdownAfter2.total_stock_display, '0 SFT')
    assert.strictEqual(breakdownAfter2.total_valuation, 0, 'Total valuation must be 0')
    if (breakdownAfter2.roll_items.length > 0) {
      assert.strictEqual(breakdownAfter2.roll_items[0].roll_count, 0)
      assert.strictEqual(breakdownAfter2.roll_items[0].total_sft, 0)
      assert.strictEqual(breakdownAfter2.roll_items[0].total_valuation, 0)
    }

    // 6. Floor Consumptions must contain the 2 issued rolls
    const floorConsumptions = await InventoryService.getFloorConsumptions(testCompanyId)
    assert.strictEqual(floorConsumptions.length, 2, 'Floor consumptions must have 2 records')
  })

  it('2. Rigid sheet: issuing 4 sheets from 10 sheets reduces warehouse stock to 6 sheets', async () => {
    const sheetMaterial: MaterialRecord = {
      id: `mat-sheet-acrylic-${Date.now()}`,
      company_id: testCompanyId,
      sku: 'MAT-ACRYLIC-3MM',
      name: 'Clear Cast Acrylic Sheet 3mm',
      category: 'rigid_sheet',
      unit: 'sft',
      purchase_unit: 'sheet',
      master_purchase_unit: 'sheet',
      current_stock: 320, // 10 sheets * 32 sft
      average_cost: 3200,
      cost_per_unit: 100,
      sheet_width_ft: 4,
      sheet_length_ft: 8,
      sheet_sizes: [
        {
          width_ft: 4,
          length_ft: 8,
          sheet_count: 10,
          quantity: 10,
          purchase_price: 3200,
        },
      ],
      is_active: true,
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, sheetMaterial, testCompanyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, sheetMaterial)

    const initialBreakdown = getMaterialWarehouseStockBreakdown(sheetMaterial)
    assert.strictEqual(initialBreakdown.purchase_unit_display, '10 Sheets')

    // Issue 4 sheets (128 SFT) to floor
    await InventoryService.issueMasterRollsBatch({
      company_id: testCompanyId,
      material_id: sheetMaterial.id,
      quantity_rolls: 4,
      destination: 'floor_staging',
      operator_name: 'Sheet Cutter',
    })

    const updatedMat = await InventoryRepository.getMaterialById(sheetMaterial.id, testCompanyId)
    assert.ok(updatedMat)
    assert.strictEqual(updatedMat.current_stock, 192, 'Warehouse stock must be 192 SFT (6 sheets * 32 sft)')

    const updatedBreakdown = getMaterialWarehouseStockBreakdown(updatedMat)
    assert.strictEqual(updatedBreakdown.purchase_unit_display, '6 Sheets')
    assert.strictEqual(updatedBreakdown.total_stock_display, '192 sft')
  })

  it('3. Direct Issue via issueMaterial reduces stock and adds floor consumption record', async () => {
    const bannerMaterial: MaterialRecord = {
      id: `mat-banner-direct-${Date.now()}`,
      company_id: testCompanyId,
      sku: 'MAT-BANNER-DIRECT',
      name: 'Frontlit Banner 280gsm',
      category: 'rolls',
      unit: 'sft',
      purchase_unit: 'roll',
      current_stock: 1000,
      average_cost: 10,
      roll_width_ft: 5,
      standard_roll_length_ft: 164,
      is_roll: true,
      roll_sizes: [
        {
          width_ft: 5,
          length_ft: 164,
          roll_count: 2,
          quantity: 2,
          price: 8200,
        },
      ],
      is_active: true,
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, bannerMaterial, testCompanyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, bannerMaterial)

    // Issue 500 SFT via direct issueMaterial
    const issueResult = await InventoryService.issueMaterial({
      company_id: testCompanyId,
      source_location_id: 'loc-main-warehouse',
      issued_by_name: 'Store Manager',
      items: [
        {
          material_id: bannerMaterial.id,
          issued_quantity: 500,
          unit: 'sft',
          unit_cost: 10,
          width_ft: 5,
          length_ft: 164,
          purchase_quantity: 1,
        },
      ],
    })

    assert.ok(issueResult.id)

    const updatedMat = await InventoryRepository.getMaterialById(bannerMaterial.id, testCompanyId)
    assert.ok(updatedMat)
    assert.strictEqual(updatedMat.current_stock, 500, 'Warehouse current_stock must be reduced by 500 SFT')

    const floorConsumptions = await InventoryService.getFloorConsumptions(testCompanyId)
    const floorItem = floorConsumptions.find((f) => f.material_id === bannerMaterial.id)
    assert.ok(floorItem, 'Must have floor consumption record for issued material')
    assert.strictEqual(floorItem?.remaining_floor_balance, 500)
  })
})
