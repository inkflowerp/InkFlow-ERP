import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { MaterialRecord } from '../../types/inventory.types.ts'

describe('Unit: Physical Rolls Inventory & Warehouse Tracking', () => {
  const testCompanyId = `test-roll-company-${Date.now()}`

  beforeEach(() => {
    PrintERPDataStore.clear(STORAGE_KEYS.MOUNTED_ROLLS)
    PrintERPDataStore.clear(STORAGE_KEYS.MATERIALS)
    PrintERPDataStore.clear(STORAGE_KEYS.PRODUCTS)
  })

  test('1. Auto-synchronizes physical rolls when roll substrates exist in warehouse materials', async () => {
    // Seed 3 raw materials: 2 roll substrates and 1 consumable (non-roll)
    const flexMat: Partial<MaterialRecord> = {
      id: `mat-flex-${Date.now()}`,
      company_id: testCompanyId,
      sku: 'MAT-STARFLEX-10FT',
      name: 'Star Frontlit Flex 10ft',
      name_bn: 'স্টার ফ্রন্টলিট ফ্লেক্স ১০ ফিট',
      category: 'flex' as any,
      unit: 'roll' as any,
      purchase_unit: 'roll',
      is_roll: true,
      roll_width_ft: 10,
      roll_length_ft: 164,
      current_stock: 2, // 2 rolls
      average_cost: 4500,
    }

    const vinylMat: Partial<MaterialRecord> = {
      id: `mat-vinyl-${Date.now()}`,
      company_id: testCompanyId,
      sku: 'MAT-SAV-GLOSS-4FT',
      name: 'Glossy SAV Vinyl 4ft',
      name_bn: 'গ্লসি ভিনাইল ৪ ফিট',
      category: 'vinyl' as any,
      unit: 'sft' as any,
      purchase_unit: 'roll',
      is_roll: true,
      roll_width_ft: 4,
      roll_length_ft: 164,
      current_stock: 656, // 1 roll (4 * 164 = 656 sft)
      average_cost: 3200,
    }

    const eyeletMat: Partial<MaterialRecord> = {
      id: `mat-eyelet-${Date.now()}`,
      company_id: testCompanyId,
      sku: 'MAT-EYELET-METAL',
      name: 'Metal Eyelets / Ring',
      name_bn: 'আইলেট মেটাল রিং',
      category: 'accessories' as any,
      unit: 'pcs' as any,
      purchase_unit: 'box',
      is_roll: false,
      current_stock: 5000,
      average_cost: 0.5,
    }

    await InventoryRepository.createMaterial(flexMat as any)
    await InventoryRepository.createMaterial(vinylMat as any)
    await InventoryRepository.createMaterial(eyeletMat as any)

    // Now call getInventoryRolls
    const rolls = await InventoryRepository.getInventoryRolls(testCompanyId)

    assert.ok(rolls.length >= 3, `Expected at least 3 physical rolls generated (2 flex + 1 vinyl), got ${rolls.length}`)

    const flexRolls = rolls.filter((r) => r.material_id === flexMat.id)
    assert.strictEqual(flexRolls.length, 2, 'Should create exactly 2 physical rolls for Flex')
    assert.strictEqual(flexRolls[0].width_ft, 10, 'Flex roll width should be 10ft')
    assert.strictEqual(flexRolls[0].initial_length_ft, 164, 'Flex roll initial length should be 164ft')
    assert.strictEqual(flexRolls[0].remaining_area_sft, 1640, 'Flex roll area should be 1640 SFT')
    assert.strictEqual(flexRolls[0].material?.name, 'Star Frontlit Flex 10ft', 'Material name should be enriched')
    assert.strictEqual(flexRolls[0].material?.name_bn, 'স্টার ফ্রন্টলিট ফ্লেক্স ১০ ফিট', 'Material name_bn should be enriched')

    const vinylRolls = rolls.filter((r) => r.material_id === vinylMat.id)
    assert.strictEqual(vinylRolls.length, 1, 'Should create 1 physical roll for Vinyl')
    assert.strictEqual(vinylRolls[0].width_ft, 4, 'Vinyl roll width should be 4ft')
    assert.strictEqual(vinylRolls[0].remaining_area_sft, 656, 'Vinyl roll area should be 656 SFT')
    assert.strictEqual(vinylRolls[0].status, 'available', 'Status should be available')

    const nonRollCheck = rolls.filter((r) => r.material_id === eyeletMat.id)
    assert.strictEqual(nonRollCheck.length, 0, 'Consumable / non-roll accessories should not generate physical rolls')
  })

  test('2. Filters physical rolls correctly by status (available vs mounted vs depleted)', async () => {
    // Create physical roll and mount it
    const roll = await InventoryRepository.createPhysicalRoll({
      company_id: testCompanyId,
      material_id: 'mat-test-123',
      roll_code: 'ROL-TEST-5FT-001',
      width_ft: 5,
      initial_length_ft: 164,
    })

    const availableRolls = await InventoryRepository.getInventoryRolls(testCompanyId, { status: 'available' })
    assert.ok(availableRolls.some((r) => r.id === roll.id), 'Newly created roll should be available')

    // Mount roll to machine
    await InventoryRepository.mountRollToMachine({
      company_id: testCompanyId,
      roll_id: roll.id,
      machine_id: 'mach-roland',
      machine_name: 'Roland Eco-Solvent Press',
      operator_name: 'Shamim',
    })

    const mountedRolls = await InventoryRepository.getInventoryRolls(testCompanyId, { status: 'mounted' })
    assert.ok(mountedRolls.some((r) => r.id === roll.id), 'Mounted roll should match mounted filter')

    const availableAfterMount = await InventoryRepository.getInventoryRolls(testCompanyId, { status: 'available' })
    assert.ok(!availableAfterMount.some((r) => r.id === roll.id), 'Mounted roll should not appear in available filter')
  })

  test('3. Auto-creates physical rolls when raw material product is created with opening stock', async () => {
    const createdProduct = await ProductRepository.createProduct({
      company_id: testCompanyId,
      sku: 'RM-BACKLIT-FILM-5FT',
      name: 'Backlit Film Media 5ft',
      entity_type: 'material',
      product_type: 'material',
      category: 'banner',
      purchase_unit: 'roll',
      roll_width_ft: 5,
      roll_length_ft: 164,
      initial_stock: 3,
      purchase_price: 3800,
    } as any)

    const rolls = await InventoryService.getInventoryRolls(testCompanyId)
    const backlitRolls = rolls.filter((r) => r.material_id === createdProduct.id)
    assert.strictEqual(backlitRolls.length, 3, 'Should have created 3 physical rolls for Backlit Film')
    assert.strictEqual(backlitRolls[0].width_ft, 5)
    assert.strictEqual(backlitRolls[0].initial_length_ft, 164)
  })

  test('4. Correctly computes roll width, purchase unit display, and total valuation for 1148 SFT PVC at ৳ 11,480/roll', async () => {
    const pvcCompanyId = `test-pvc-valuation-${Date.now()}`
    const pvcMat: Partial<MaterialRecord> = {
      id: `mat-pvc-${Date.now()}`,
      company_id: pvcCompanyId,
      sku: 'MAT-11925',
      name: 'PVC',
      category: 'flex_banner' as any,
      unit: 'sft' as any,
      purchase_unit: 'roll',
      current_stock: 1148,
      average_cost: 11480, // ৳ 11,480 per roll
    }

    await InventoryRepository.createMaterial(pvcMat as any)

    // Check physical rolls generation
    const rolls = await InventoryRepository.getInventoryRolls(pvcCompanyId)
    const pvcRolls = rolls.filter((r) => r.material_id === pvcMat.id)
    assert.strictEqual(pvcRolls.length, 1, 'Should auto-generate 1 physical roll for 1148 SFT PVC')
    assert.strictEqual(pvcRolls[0].width_ft, 7, 'Auto-deduced width should be 7ft (1148 / 164)')
    assert.strictEqual(pvcRolls[0].initial_length_ft, 164, 'Standard length should be 164ft')
    assert.strictEqual(pvcRolls[0].remaining_area_sft, 1148, 'Area should be 1148 SFT')
    assert.strictEqual(pvcRolls[0].status, 'available')

    // Check units & valuation breakdown
    const { getMaterialWarehouseStockBreakdown } = await import('../../lib/units.ts')
    const breakdown = getMaterialWarehouseStockBreakdown(pvcMat, rolls)

    assert.strictEqual(breakdown.is_roll, true, 'Should be detected as roll substrate')
    assert.strictEqual(breakdown.purchase_unit_display, '1 Roll', 'Purchase unit display should be 1 Roll')
    assert.strictEqual(breakdown.purchase_unit, 'roll')
    assert.strictEqual(breakdown.consumption_unit, 'sft')
    assert.strictEqual(breakdown.cost_per_purchase_unit, 11480, 'Cost per roll should be 11480')
    assert.strictEqual(breakdown.cost_per_consumption_unit, 10, 'Cost per SFT should be 10 (11480 / 1148)')
    assert.strictEqual(breakdown.total_valuation, 11480, 'Total valuation must be exactly ৳ 11,480 (NOT ৳ 1,31,79,040)')

    // Check inventory summary valuation
    const summary = await InventoryService.getInventorySummary(pvcCompanyId)
    assert.strictEqual(summary.totalAvailableStockValue, 11480, 'Inventory summary valuation must reflect normalized ৳ 11,480')
  })
})

