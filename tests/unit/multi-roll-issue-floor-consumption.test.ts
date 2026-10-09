import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { PrintFlowDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'

describe('Multi-Roll Direct Issue and Floor Consumption Verification', () => {
  const testCompanyId = `comp-multi-roll-${Date.now()}`

  beforeEach(() => {
    PrintFlowDataStore.clear()
  })

  it('verifies that issuing 3 rolls of Black PVC (2.25ft x 164ft) results in all 3 physical rolls showing in floor consumptions and rolls fleet', async () => {
    // 1. Setup Black PVC Material with initial stock of 10 rolls (2.25ft x 164ft = 369 SFT/roll, 10 rolls = 3690 SFT)
    const singleRollArea = 2.25 * 164 // 369 SFT
    const initialRolls = 10
    const initialStockSft = initialRolls * singleRollArea // 3690 SFT

    const blackPvcMaterial: MaterialRecord = {
      id: `mat-black-pvc-${Date.now()}`,
      company_id: testCompanyId,
      sku: 'MAT-BLACK-PVC-2.25FT',
      name: 'Black PVC — 2.25ft × 164ft',
      category: 'Roll Media',
      unit: 'sft',
      purchase_unit: 'roll',
      master_purchase_unit: 'roll',
      current_stock: initialStockSft,
      average_cost: 3500,
      cost_per_unit: 3500 / singleRollArea,
      is_roll: true,
      roll_width_ft: 2.25,
      roll_length_ft: 164,
      standard_roll_length_ft: 164,
      roll_sizes: [
        {
          nominal_width_ft: 2.25,
          width_ft: 2.25,
          length_ft: 164,
          roll_count: initialRolls,
          quantity: initialRolls,
          stock_qty: initialRolls,
          total_sft: initialStockSft,
          price: 3500,
          allowance_ft: 0,
        },
      ],
      is_active: true,
    }

    PrintFlowDataStore.addItem(STORAGE_KEYS.MATERIALS, blackPvcMaterial, testCompanyId)
    PrintFlowDataStore.addItem(STORAGE_KEYS.MATERIALS, blackPvcMaterial)

    // 2. Issue 3 rolls to Print Floor
    const issueResult = await InventoryService.issueMasterRollsBatch({
      company_id: testCompanyId,
      material_id: blackPvcMaterial.id,
      width_ft: 2.25,
      length_ft: 164,
      quantity_rolls: 3,
      destination: 'floor_staging',
      operator_name: 'Floor Operator',
      notes: 'Issued Black PVC — 2.25ft × 164ft - 3 roll to Materials & Consumption',
    })

    // Assert batch result contains all 3 rolls
    assert.equal(issueResult.quantity_issued, 3, 'Should record quantity_issued as 3 rolls')
    assert.equal(issueResult.rolls.length, 3, 'Should create exactly 3 discrete physical roll records')
    assert.equal(issueResult.total_area_sft, 3 * singleRollArea, 'Total issued area should be 1107 sft (3 * 369)')

    // 3. Verify getInventoryRolls returns all 3 rolls on Print Floor
    const allRolls = await InventoryService.getInventoryRolls(testCompanyId)
    const floorRolls = allRolls.filter((r) => r.location_name === 'Print Floor' || r.status === 'on_floor')
    assert.equal(floorRolls.length, 3, 'Should retrieve all 3 active physical rolls from getInventoryRolls')

    // Verify all 3 rolls have discrete roll tags and valid IDs
    const rollTags = floorRolls.map((r) => r.roll_code || r.roll_tag)
    const uniqueTags = new Set(rollTags)
    assert.equal(uniqueTags.size, 3, 'All 3 rolls should have distinct roll tags')

    // 4. Verify getFloorConsumptions returns all 3 distinct records (CRITICAL BUG FIX VERIFICATION)
    const floorConsumptions = await InventoryService.getFloorConsumptions(testCompanyId)
    assert.equal(floorConsumptions.length, 3, 'getFloorConsumptions MUST return all 3 issued rolls without collapsing/deduplicating into 1')

    // Check balances on each floor consumption record
    for (const fc of floorConsumptions) {
      assert.equal(fc.issued_quantity, singleRollArea, 'Each issued record should have 369 SFT issued')
      assert.equal(fc.remaining_floor_balance, singleRollArea, 'Each issued record should have 369 SFT remaining floor balance')
      assert.equal(fc.status, 'on_floor', 'Status should be on_floor')
      assert.equal(fc.material_name, 'Black PVC — 2.25ft × 164ft')
    }

    // 5. Verify warehouse inventory stock was decremented by 3 rolls (from 10 to 7)
    const updatedMat = await InventoryRepository.getMaterialById(blackPvcMaterial.id, testCompanyId)
    assert.ok(updatedMat)
    const remainingRollsInGroup = updatedMat.roll_sizes?.[0]?.quantity ?? updatedMat.roll_sizes?.[0]?.roll_count
    assert.equal(remainingRollsInGroup, 7, 'Warehouse stock should be reduced from 10 to 7 rolls')
    assert.equal(updatedMat.current_stock, 7 * singleRollArea, 'Warehouse SFT stock should be 7 * 369 = 2583')
  })
})
