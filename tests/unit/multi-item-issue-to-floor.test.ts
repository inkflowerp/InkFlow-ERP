import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { PrintFlowDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { getMaterialWarehouseStockBreakdown } from '../../lib/units.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'

describe('Multi-Item Direct Issue to Print Floor', () => {
  const testCompanyId = `test-multi-issue-${Date.now()}`

  beforeEach(() => {
    PrintFlowDataStore.clear()
  })

  it('1. Successfully issues multiple materials (Roll Media + Liquid Consumable) in batch with accurate inventory deductions', async () => {
    // 1. Setup Roll Material (2 rolls of 3ft x 164ft = 984 SFT)
    const rollMaterial: MaterialRecord = {
      id: `mat-flex-roll-${Date.now()}`,
      company_id: testCompanyId,
      sku: 'MAT-FLEX-3FT',
      name: 'Star Flex Banner 3ft',
      category: 'rolls',
      unit: 'sft',
      purchase_unit: 'roll',
      master_purchase_unit: 'roll',
      current_stock: 984,
      average_cost: 4920,
      cost_per_unit: 10,
      is_roll: true,
      roll_width_ft: 3,
      roll_length_ft: 164,
      standard_roll_length_ft: 164,
      roll_sizes: [
        {
          nominal_width_ft: 3,
          width_ft: 3,
          length_ft: 164,
          roll_count: 2,
          quantity: 2,
          stock_qty: 2,
          price: 4920,
          allowance_ft: 0,
        },
      ],
      is_active: true,
    }

    // 2. Setup Consumable Ink Material (5 bottles of 1000ml = 5000ml)
    const inkMaterial: MaterialRecord = {
      id: `mat-ink-cyan-${Date.now()}`,
      company_id: testCompanyId,
      sku: 'MAT-INK-CYAN',
      name: 'Solvent Ink Cyan 1L',
      category: 'ink',
      unit: 'ml',
      purchase_unit: 'bottle',
      master_purchase_unit: 'bottle',
      current_stock: 5000,
      average_cost: 1200,
      cost_per_unit: 1.2,
      is_roll: false,
      is_active: true,
    }

    PrintFlowDataStore.addItem(STORAGE_KEYS.MATERIALS, rollMaterial, testCompanyId)
    PrintFlowDataStore.addItem(STORAGE_KEYS.MATERIALS, rollMaterial)
    PrintFlowDataStore.addItem(STORAGE_KEYS.MATERIALS, inkMaterial, testCompanyId)
    PrintFlowDataStore.addItem(STORAGE_KEYS.MATERIALS, inkMaterial)

    // 3. Issue Item 1: 1 Roll of Flex (492 SFT)
    const res1 = await InventoryService.issueMasterRollsBatch({
      company_id: testCompanyId,
      material_id: rollMaterial.id,
      width_ft: 3,
      length_ft: 164,
      quantity_rolls: 1,
      destination: 'floor_staging',
      operator_name: 'Floor Operator 1',
      notes: 'Batch Requisition Item 1',
    })

    assert.strictEqual(res1.quantity_issued, 1, 'Roll item quantity issued should be 1')
    assert.strictEqual(res1.total_area_sft, 492, 'Roll item area should be 492 SFT')

    // 4. Issue Item 2: 2 Bottles of Ink (2000 ML)
    const res2 = await InventoryService.issueMasterRollsBatch({
      company_id: testCompanyId,
      material_id: inkMaterial.id,
      width_ft: 0,
      length_ft: 0,
      quantity_rolls: 2,
      destination: 'floor_staging',
      operator_name: 'Floor Operator 1',
      notes: 'Batch Requisition Item 2',
    })

    assert.strictEqual(res2.quantity_issued, 2, 'Ink quantity issued should be 2')

    // 5. Verify Roll Material inventory reduction (984 - 492 = 492 SFT, 1 roll left)
    const updatedRoll = await InventoryRepository.getMaterialById(rollMaterial.id, testCompanyId)
    assert.strictEqual(Number(updatedRoll?.current_stock), 492, 'Roll stock should be reduced to 492 SFT')
    const breakdown = getMaterialWarehouseStockBreakdown(updatedRoll)
    assert.strictEqual(breakdown.total_rolls, 1, 'Remaining warehouse rolls should be 1')

    // 6. Verify Ink Material inventory reduction (5000 - 2000 = 3000 ML)
    const updatedInk = await InventoryRepository.getMaterialById(inkMaterial.id, testCompanyId)
    assert.strictEqual(Number(updatedInk?.current_stock), 3000, 'Ink stock should be reduced to 3000 ML')
  })
})
