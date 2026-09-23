import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store'
import { InventoryRepository } from '../../lib/repositories/inventory.repository'
import { InventoryService } from '../../services/inventory.service'
import { getMaterialWarehouseStockBreakdown } from '../../lib/units'
import type { MaterialRecord, InventoryLocationRecord, InventoryRollRecord } from '../../types/inventory.types'

test('Direct Material Issue to Production — Auto Source Store & Purchase Unit Handling', async (t) => {
  const companyId = `comp-issue-test-${Date.now()}`

  // Setup sample warehouse locations
  const storeLocation: InventoryLocationRecord = {
    id: `loc-raw-${Date.now()}`,
    company_id: companyId,
    location_code: 'WH-MAIN',
    location_name: 'Main Material Warehouse',
    location_type: 'raw_material_store',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const floorLocation: InventoryLocationRecord = {
    id: `loc-floor-${Date.now()}`,
    company_id: companyId,
    location_code: 'FL-MAIN',
    location_name: 'Production Floor Buffer',
    location_type: 'production_floor',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  PrintERPDataStore.addItem(STORAGE_KEYS.LOCATIONS, storeLocation, companyId)
  PrintERPDataStore.addItem(STORAGE_KEYS.LOCATIONS, floorLocation, companyId)

  await t.test('1. Material breakdown correctly derives purchase units and roll size groups', () => {
    const pvcMat: MaterialRecord = {
      id: `mat-pvc-${Date.now()}`,
      company_id: companyId,
      sku: 'MAT-11925',
      name: 'PVC Matte Flex Banner',
      category: 'roll_media',
      unit: 'sft',
      purchase_unit: 'roll',
      master_purchase_unit: 'roll',
      current_stock: 4920,
      average_cost: 25,
      last_purchase_price: 25,
      is_roll: true,
      roll_width_ft: 3,
      standard_roll_length_ft: 164,
      roll_sizes: [
        { width_ft: 3, length_ft: 164, roll_count: 10 },
        { width_ft: 5, length_ft: 164, roll_count: 31 },
      ],
      is_active: true,
    }

    const breakdown = getMaterialWarehouseStockBreakdown(pvcMat)
    assert.strictEqual(breakdown.is_roll, true)
    assert.strictEqual(breakdown.purchase_unit, 'roll')
    assert.strictEqual(breakdown.consumption_unit, 'sft')
    assert.strictEqual(breakdown.roll_items.length, 2)
    assert.strictEqual(breakdown.roll_items[0].width_ft, 3)
    assert.strictEqual(breakdown.roll_items[0].length_ft, 164)
    assert.strictEqual(breakdown.roll_items[0].roll_count, 10)
    assert.strictEqual(breakdown.roll_items[1].width_ft, 5)
    assert.strictEqual(breakdown.roll_items[1].length_ft, 164)
    assert.strictEqual(breakdown.roll_items[1].roll_count, 31)
  })

  await t.test('2. Direct Issue 1 Roll (3ft × 164ft = 492 sft) deducts stock and reduces roll size count (10 -> 9)', async () => {
    const pvcMatId = `mat-pvc-issue-${Date.now()}`
    const initialStock = 30340 // 10 rolls of 3x164 (4920 sft) + 31 rolls of 5x164 (25420 sft)

    const pvcMat: MaterialRecord = {
      id: pvcMatId,
      company_id: companyId,
      sku: 'MAT-11925',
      name: 'PVC',
      category: 'roll_media',
      unit: 'sft',
      purchase_unit: 'roll',
      master_purchase_unit: 'roll',
      current_stock: initialStock,
      average_cost: 25,
      last_purchase_price: 25,
      is_roll: true,
      roll_width_ft: 3,
      standard_roll_length_ft: 164,
      roll_sizes: [
        { width_ft: 3, length_ft: 164, roll_count: 10 },
        { width_ft: 5, length_ft: 164, roll_count: 31 },
      ],
      is_active: true,
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, pvcMat, companyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, pvcMat)

    // Issue 1 Roll of 3ft × 164ft
    const issueResult = await InventoryService.issueMaterial({
      company_id: companyId,
      source_location_id: storeLocation.id,
      destination_location_id: floorLocation.id,
      issued_by_name: 'Store Manager',
      received_by_name: 'Rahim (Head Pressman)',
      notes: 'Machine: Roland TrueVIS Eco-Solvent (64") | Job Ref: JOB-2026-1042',
      items: [
        {
          material_id: pvcMatId,
          issued_quantity: 492, // 1 Roll = 3ft × 164ft = 492 sft
          unit: 'sft',
          unit_cost: 25,
        },
      ],
    })

    assert.ok(issueResult.id, 'Issue record should be created')
    assert.strictEqual(issueResult.items.length, 1)
    assert.strictEqual(issueResult.items[0].issued_quantity, 492)
    assert.strictEqual(issueResult.items[0].unit, 'sft')

    // Verify Material updated
    const updatedMat = await InventoryRepository.getMaterialById(pvcMatId, companyId)
    assert.ok(updatedMat)
    assert.strictEqual(updatedMat.current_stock, initialStock - 492)

    // Verify 3ft roll count reduced from 10 to 9
    const size3 = updatedMat.roll_sizes?.find((s: any) => s.width_ft === 3)
    assert.strictEqual(size3?.roll_count, 9)

    // 5ft roll count untouched at 31
    const size5 = updatedMat.roll_sizes?.find((s: any) => s.width_ft === 5)
    assert.strictEqual(size5?.roll_count, 31)
  })

  await t.test('3. Issue 1 Box of accessories (1000 pcs/box) deducts 1000 pcs in consumption unit', async () => {
    const eyeletMatId = `mat-eyelet-${Date.now()}`
    const eyeletMat: MaterialRecord = {
      id: eyeletMatId,
      company_id: companyId,
      sku: 'MAT-EYELET-01',
      name: 'Brass Grommets / Eyelets',
      category: 'hardware_accessories',
      unit: 'pcs',
      purchase_unit: 'box',
      master_purchase_unit: 'box',
      current_stock: 5000,
      average_cost: 0.5,
      last_purchase_price: 0.5,
      is_roll: false,
      material_config: {
        pack_quantity: 1000,
      } as any,
      is_active: true,
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, eyeletMat, companyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, eyeletMat)

    const breakdown = getMaterialWarehouseStockBreakdown(eyeletMat)
    assert.strictEqual(breakdown.purchase_unit, 'box')
    assert.strictEqual(breakdown.consumption_unit, 'pcs')

    // Issue 1 Box = 1000 pcs
    const issueResult = await InventoryService.issueMaterial({
      company_id: companyId,
      source_location_id: storeLocation.id,
      destination_location_id: floorLocation.id,
      issued_by_name: 'Store Keeper',
      received_by_name: 'Finishing Lead',
      notes: 'Voucher: VOUCH-2026-4014',
      items: [
        {
          material_id: eyeletMatId,
          issued_quantity: 1000,
          unit: 'pcs',
          unit_cost: 0.5,
        },
      ],
    })

    assert.ok(issueResult.id)
    const updatedEyelet = await InventoryRepository.getMaterialById(eyeletMatId, companyId)
    assert.strictEqual(updatedEyelet?.current_stock, 4000)
  })
})
