import { test, describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { InventoryService } from '../../services/inventory.service.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { ProductService } from '../../services/product.service.ts'
import { getMaterialWarehouseStockBreakdown } from '../../lib/units.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Preservation of Multi-Active Sizes on Stock Intake', () => {
  const companyId = 'test-co-multi-sizes'

  beforeEach(() => {
    PrintERPDataStore.clear(companyId)
  })

  it('preserves PVC 3.25ft x 164ft when receiving 10 rolls of PVC 2ft x 164ft', async () => {
    // 1. Create a Product / Raw Material Master with 2 active configured sizes:
    // Size 1: 2ft x 164ft (৳3,280)
    // Size 2: 3.25ft x 164ft (৳5,330)
    const product = await ProductRepository.createProduct({
      company_id: companyId,
      name: 'PVC Flex Banner',
      sku: 'MAT-89258',
      category: 'roll_media',
      product_type: 'material',
      entity_type: 'material',
      unit: 'sft',
      purchase_unit: 'roll',
      selling_price: 15,
      purchase_price: 10,
      base_cost: 10,
      roll_width_ft: 2,
      standard_roll_length_ft: 164,
      available_widths_ft: [2, 3.25],
      roll_sizes: [
        { width: 2, nominal_width_ft: 2, length: 164, extra_allowance: 0, price: 3280, default_supplier_price: 3280 },
        { width: 3.25, nominal_width_ft: 3.25, length: 164, extra_allowance: 0, price: 5330, default_supplier_price: 5330 },
      ],
      material_config: {
        material_type: 'roll',
        purchase_unit: 'roll',
        usage_unit: 'sft',
        available_widths_ft: [2, 3.25],
        standard_roll_length_ft: 164,
        roll_sizes: [
          { width: 2, nominal_width_ft: 2, length: 164, extra_allowance: 0, price: 3280, default_supplier_price: 3280 },
          { width: 3.25, nominal_width_ft: 3.25, length: 164, extra_allowance: 0, price: 5330, default_supplier_price: 5330 },
        ],
      },
    })

    // Initial check: Both sizes must exist in material breakdown (both 0 stock)
    const initialMat = await InventoryRepository.getMaterialById(product.id, companyId)
    assert.ok(initialMat, 'Material should be accessible via getMaterialById')
    const initialBreakdown = getMaterialWarehouseStockBreakdown(initialMat)
    assert.strictEqual(initialBreakdown.roll_items.length, 2, 'Initial breakdown should show 2 configured roll sizes')

    // 2. Receive Stock for PVC 2ft x 164ft (10 rolls at ৳3,280)
    const intakeResult = await InventoryService.receiveStock({
      company_id: companyId,
      material_id: product.id,
      location_id: 'loc-store-1',
      quantity: 10,
      unit_cost: 3280,
      width_ft: 2,
      length_ft: 164,
      allowance_ft: 0,
      size_label: '2ft × 164ft',
      purchase_unit: 'roll',
      performed_by_name: 'Store Manager',
      notes: 'Direct Stock Intake: 10 rolls 2ft x 164ft',
    })

    assert.ok(intakeResult.material, 'Stock intake should succeed')

    // 3. Update master catalog price and commercial margin (as Direct Stock Intake modal does)
    await ProductService.updatePrice(
      product.id,
      15,
      'Updated during Direct Stock Intake',
      'Store Manager',
      null,
      companyId,
      {
        newPurchasePrice: 3280,
        newTargetMarginPercent: 35,
      }
    )

    // 4. Verification: Fetch fresh material and rolls from repository
    const freshMat = await InventoryRepository.getMaterialById(product.id, companyId)
    assert.ok(freshMat, 'Material should exist after intake and price sync')

    const rolls = intakeResult.rollsCreated || []
    const breakdown = getMaterialWarehouseStockBreakdown(freshMat, rolls)

    // Verify BOTH sizes are present in roll_items
    assert.strictEqual(breakdown.roll_items.length, 2, 'Warehouse stock breakdown MUST retain both roll sizes')

    const size2ft = breakdown.roll_items.find((r) => Math.abs(r.width_ft - 2) < 0.1)
    const size325ft = breakdown.roll_items.find((r) => Math.abs(r.width_ft - 3.25) < 0.1)

    assert.ok(size2ft, 'Size 2ft x 164ft must be present')
    assert.strictEqual(size2ft.roll_count, 10, 'Size 2ft must have 10 rolls')
    assert.strictEqual(size2ft.total_sft, 3280, 'Size 2ft must have 3,280 SFT (10 rolls * 328 sft)')

    assert.ok(size325ft, 'Size 3.25ft x 164ft must NOT disappear and must be present')
    assert.strictEqual(size325ft.roll_count, 0, 'Size 3.25ft should have 0 rolls (out of stock/configured)')

    // Verify InventoryRepository.getMaterials returns both sizes
    const allMaterials = await InventoryRepository.getMaterials(companyId)
    const matInList = allMaterials.find((m) => m.id === product.id)
    assert.ok(matInList, 'Material should be in getMaterials list')
    const listBreakdown = getMaterialWarehouseStockBreakdown(matInList, rolls)
    assert.strictEqual(listBreakdown.roll_items.length, 2, 'getMaterials breakdown MUST retain both roll sizes')

    // 5. Subsequent Intake for the second size: 5 rolls of 3.25ft x 164ft
    const secondIntake = await InventoryService.receiveStock({
      company_id: companyId,
      material_id: product.id,
      location_id: 'loc-store-1',
      quantity: 5,
      unit_cost: 5330,
      width_ft: 3.25,
      length_ft: 164,
      allowance_ft: 0,
      size_label: '3.25ft × 164ft',
      purchase_unit: 'roll',
      performed_by_name: 'Store Manager',
      notes: 'Direct Stock Intake: 5 rolls 3.25ft x 164ft',
    })

    const allRolls = [...(intakeResult.rollsCreated || []), ...(secondIntake.rollsCreated || [])]
    const updatedMat = await InventoryRepository.getMaterialById(product.id, companyId)
    const finalBreakdown = getMaterialWarehouseStockBreakdown(updatedMat, allRolls)

    assert.strictEqual(finalBreakdown.roll_items.length, 2, 'Final breakdown must have both roll sizes')
    const final2ft = finalBreakdown.roll_items.find((r) => Math.abs(r.width_ft - 2) < 0.1)
    const final325ft = finalBreakdown.roll_items.find((r) => Math.abs(r.width_ft - 3.25) < 0.1)

    assert.strictEqual(final2ft?.roll_count, 10, '2ft size must still have 10 rolls')
    assert.strictEqual(final325ft?.roll_count, 5, '3.25ft size must now have 5 rolls')
  })
})
