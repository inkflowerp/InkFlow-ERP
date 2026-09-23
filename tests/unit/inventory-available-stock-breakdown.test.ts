import { test, describe } from 'node:test'
import assert from 'node:assert'
import { getMaterialWarehouseStockBreakdown } from '../../lib/units.ts'
import type { MaterialRecord, InventoryRollRecord } from '../../types/inventory.types.ts'

describe('Inventory Available Stock & Multi-Size Configured Roll Breakdown Tests', () => {
  const companyId = 'test-co-stock-01'

  test('1. Preserves all configured roll sizes in roll_items even when stock is 0 (Out of Stock)', () => {
    const mat: MaterialRecord = {
      id: 'mat-pvc-01',
      company_id: companyId,
      sku: 'PVC-MULTI',
      name: 'PVC Banner',
      category: 'flex_banner',
      unit: 'sft',
      purchase_unit: 'roll',
      is_roll: true,
      current_stock: 0,
      average_cost: 1000,
      roll_sizes: [
        { width_ft: 2.25, length_ft: 164, price: 1000, gsm: 340, finishing: 'glossy' },
        { width_ft: 2.25, length_ft: 100, price: 800, gsm: 340, finishing: 'glossy' },
        { width_ft: 2, length_ft: 100, price: 700, gsm: 340, finishing: 'glossy' },
        { width_ft: 2, length_ft: 400, price: 2500, gsm: 340, finishing: 'glossy' },
        { width_ft: 3, length_ft: 400, price: 3500, gsm: 340, finishing: 'glossy' },
      ] as any,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const breakdown = getMaterialWarehouseStockBreakdown(mat, [])
    assert.strictEqual(breakdown.is_roll, true)
    assert.strictEqual(breakdown.roll_items.length, 5, 'Must preserve all 5 configured size groups in roll_items')
    assert.strictEqual(breakdown.total_rolls, 0, 'Total rolls must be 0')
    assert.strictEqual(breakdown.purchase_unit_display, '0 Rolls')

    // Every item must have roll_count: 0
    for (const item of breakdown.roll_items) {
      assert.strictEqual(item.roll_count, 0)
      assert.strictEqual(item.total_sft, 0)
      assert.strictEqual(item.total_valuation, 0)
    }
  })

  test('2. Populates actual stock on configured sizes matching warehouse physical rolls and keeps 0 on others', () => {
    const mat: MaterialRecord = {
      id: 'mat-pvc-02',
      company_id: companyId,
      sku: 'PVC-STOCK',
      name: 'PVC Banner',
      category: 'flex_banner',
      unit: 'sft',
      purchase_unit: 'roll',
      is_roll: true,
      current_stock: 3690,
      average_cost: 1000,
      roll_sizes: [
        { width_ft: 2.25, length_ft: 164, price: 1000, gsm: 340, finishing: 'glossy' },
        { width_ft: 2.25, length_ft: 100, price: 800, gsm: 340, finishing: 'glossy' },
        { width_ft: 2, length_ft: 100, price: 700, gsm: 340, finishing: 'glossy' },
      ] as any,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 10 physical rolls of 2.25x164 in warehouse
    const rolls: InventoryRollRecord[] = Array.from({ length: 10 }, (_, i) => ({
      id: `roll-${i + 1}`,
      company_id: companyId,
      material_id: mat.id,
      roll_code: `ROL-PVC-${i + 1}`,
      width_ft: 2.25,
      current_length_ft: 164,
      initial_length_ft: 164,
      remaining_area_sft: 369,
      status: 'in_warehouse',
      unit_cost: 1000,
      gsm: 340,
      finishing: 'glossy',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const breakdown = getMaterialWarehouseStockBreakdown(mat, rolls)
    assert.strictEqual(breakdown.is_roll, true)
    assert.strictEqual(breakdown.roll_items.length, 3, 'Must maintain all 3 configured size groups')
    assert.strictEqual(breakdown.total_rolls, 10, 'Total available rolls must be 10')
    assert.strictEqual(breakdown.purchase_unit_display, '10 Rolls')

    const size1 = breakdown.roll_items.find((r) => r.width_ft === 2.25 && r.length_ft === 164)
    const size2 = breakdown.roll_items.find((r) => r.width_ft === 2.25 && r.length_ft === 100)
    const size3 = breakdown.roll_items.find((r) => r.width_ft === 2 && r.length_ft === 100)

    assert.ok(size1)
    assert.strictEqual(size1?.roll_count, 10)
    assert.strictEqual(size1?.total_sft, 3690)
    assert.strictEqual(size1?.total_valuation, 10000)

    assert.ok(size2)
    assert.strictEqual(size2?.roll_count, 0)
    assert.strictEqual(size2?.total_sft, 0)

    assert.ok(size3)
    assert.strictEqual(size3?.roll_count, 0)
    assert.strictEqual(size3?.total_sft, 0)
  })

  test('3. Computes correct available stock for rigid sheets, boxes, and general items', () => {
    // Rigid Sheet Material
    const sheetMat: MaterialRecord = {
      id: 'mat-acrylic-01',
      company_id: companyId,
      sku: 'ACRYLIC-3MM',
      name: 'Acrylic Sheet 3mm',
      category: 'acrylic',
      unit: 'sft',
      purchase_unit: 'sheet',
      is_roll: false,
      width: 4,
      length: 8,
      current_stock: 160, // 160 sft / 32 sft = 5 sheets
      average_cost: 2500,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const sheetBreakdown = getMaterialWarehouseStockBreakdown(sheetMat, [])
    assert.strictEqual(sheetBreakdown.is_roll, false)
    assert.strictEqual(sheetBreakdown.purchase_unit, 'sheet')
    assert.strictEqual(sheetBreakdown.purchase_unit_display, '5 Sheets')
    assert.strictEqual(sheetBreakdown.consumption_unit_display, '160 sft')

    // Box item
    const boxMat: MaterialRecord = {
      id: 'mat-standee-01',
      company_id: companyId,
      sku: 'X-STAND-BOX',
      name: 'X-Stand Hardware',
      category: 'accessories',
      unit: 'pcs',
      purchase_unit: 'box',
      is_roll: false,
      pack_quantity: 50,
      current_stock: 250, // 250 pcs / 50 = 5 boxes
      average_cost: 100,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const boxBreakdown = getMaterialWarehouseStockBreakdown(boxMat, [])
    assert.strictEqual(boxBreakdown.is_roll, false)
    assert.strictEqual(boxBreakdown.purchase_unit, 'box')
    assert.strictEqual(boxBreakdown.purchase_unit_display, '5 BOXs')
    assert.strictEqual(boxBreakdown.consumption_unit_display, '250 pcs')
  })
})
