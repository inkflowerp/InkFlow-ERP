import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { PurchaseService } from '../../services/purchase.service.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'
import { getMaterialWarehouseStockBreakdown } from '../../lib/units.ts'

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

  test('5. Groups inventory items by width and length (e.g. PVC 3ft X 164ft 10pcs, PVC 5ft X 164ft 31pcs, PVC 7ft X 100ft 30pcs) and dynamically deducts specific size when issued to floor', async () => {
    const multiSizeCompanyId = `test-multi-size-${Date.now()}`
    const { getMaterialWarehouseStockBreakdown } = await import('../../lib/units.ts')

    // 1. Define PVC Material with 3 distinct width & length specifications
    const pvcMultiSizeMat: Partial<MaterialRecord> = {
      id: `mat-pvc-multi-${Date.now()}`,
      company_id: multiSizeCompanyId,
      sku: 'MAT-PVC-MULTI',
      name: 'PVC Banner Media',
      category: 'flex_banner' as any,
      unit: 'sft' as any,
      purchase_unit: 'roll',
      is_roll: true,
      current_stock: 51340, // 10*(3*164) + 31*(5*164) + 30*(7*100) = 4920 + 25420 + 21000 = 51340 SFT
      average_cost: 10, // ৳ 10 / SFT
      roll_sizes: [
        { width: 3, length: 164, quantity: 10, stock_qty: 10 },
        { width: 5, length: 164, quantity: 31, stock_qty: 31 },
        { width: 7, length: 100, quantity: 30, stock_qty: 30 },
      ],
    }

    await InventoryRepository.createMaterial(pvcMultiSizeMat as any)

    // 2. Query physical rolls — should auto-create discrete rolls for all 3 size configurations
    const initialRolls = await InventoryRepository.getInventoryRolls(multiSizeCompanyId)
    assert.strictEqual(initialRolls.length, 71, 'Total physical rolls should be 71 (10 + 31 + 30)')

    const rolls3ft = initialRolls.filter((r) => r.width_ft === 3)
    const rolls5ft = initialRolls.filter((r) => r.width_ft === 5)
    const rolls7ft = initialRolls.filter((r) => r.width_ft === 7)

    assert.strictEqual(rolls3ft.length, 10, 'Should have 10 rolls of 3ft width')
    assert.strictEqual(rolls3ft[0].initial_length_ft, 164, '3ft roll length should be 164ft')
    assert.strictEqual(rolls5ft.length, 31, 'Should have 31 rolls of 5ft width')
    assert.strictEqual(rolls5ft[0].initial_length_ft, 164, '5ft roll length should be 164ft')
    assert.strictEqual(rolls7ft.length, 30, 'Should have 30 rolls of 7ft width')
    assert.strictEqual(rolls7ft[0].initial_length_ft, 100, '7ft roll length should be 100ft')

    // 3. Inspect multi-dimensional warehouse stock breakdown before issue
    const breakdownBefore = getMaterialWarehouseStockBreakdown(pvcMultiSizeMat, initialRolls)
    assert.strictEqual(breakdownBefore.roll_items.length, 3, 'Should have 3 size groups')
    assert.strictEqual(breakdownBefore.roll_items[0].width_ft, 3)
    assert.strictEqual(breakdownBefore.roll_items[0].roll_count, 10, '3ft size group should have 10 pcs')
    assert.strictEqual(breakdownBefore.roll_items[1].width_ft, 5)
    assert.strictEqual(breakdownBefore.roll_items[1].roll_count, 31, '5ft size group should have 31 pcs')
    assert.strictEqual(breakdownBefore.roll_items[2].width_ft, 7)
    assert.strictEqual(breakdownBefore.roll_items[2].roll_count, 30, '7ft size group should have 30 pcs')
    assert.strictEqual(breakdownBefore.total_rolls, 71, 'Total rolls should be 71')

    // 4. Issue 1 pc of PVC 3ft X 164ft to Print Floor / Roland Press
    const issueResult = await InventoryRepository.issueMasterRollsBatch({
      company_id: multiSizeCompanyId,
      material_id: pvcMultiSizeMat.id!,
      width_ft: 3,
      length_ft: 164,
      quantity_rolls: 1,
      destination: 'machine',
      machine_id: 'mach-roland',
      machine_name: 'Roland Eco-Solvent 64"',
      operator_name: 'Imran',
    })

    assert.strictEqual(issueResult.quantity_issued, 1)
    assert.strictEqual(issueResult.total_area_sft, 492, '1 roll of 3ft × 164ft is 492 SFT')
    assert.strictEqual(issueResult.roll.status, 'mounted')
    assert.strictEqual(issueResult.roll.mounted_machine_id, 'mach-roland')

    // 5. Query updated warehouse rolls after issue
    const rollsAfter = await InventoryRepository.getInventoryRolls(multiSizeCompanyId)
    const warehouseRollsAfter = rollsAfter.filter((r) => (r.status === 'available' || r.status === 'in_warehouse') && r.location_name !== 'Print Floor' && !r.mounted_machine_id)

    const warehouse3ftAfter = warehouseRollsAfter.filter((r) => r.width_ft === 3)
    const warehouse5ftAfter = warehouseRollsAfter.filter((r) => r.width_ft === 5)
    const warehouse7ftAfter = warehouseRollsAfter.filter((r) => r.width_ft === 7)

    // Verification of user requirement:
    // PVC 3ft X 164ft 10pcs - 1pcs = 9pcs
    // PVC 5ft X 164ft 31pcs remains 31pcs
    // PVC 7ft X 100ft 30pcs remains 30pcs
    assert.strictEqual(warehouse3ftAfter.length, 9, 'PVC 3ft X 164ft warehouse stock must be reduced from 10pcs to 9pcs')
    assert.strictEqual(warehouse5ftAfter.length, 31, 'PVC 5ft X 164ft warehouse stock must remain 31pcs')
    assert.strictEqual(warehouse7ftAfter.length, 30, 'PVC 7ft X 100ft warehouse stock must remain 30pcs')

    // Verify Floor Active Roll
    const floorMountedRolls = rollsAfter.filter((r) => r.status === 'mounted' && r.mounted_machine_id === 'mach-roland')
    assert.strictEqual(floorMountedRolls.length, 1, 'Print floor must have 1 active mounted roll')
    assert.strictEqual(floorMountedRolls[0].width_ft, 3)
    assert.strictEqual(floorMountedRolls[0].initial_length_ft, 164)

    // 6. Check updated warehouse stock breakdown reflects 9pcs, 31pcs, 30pcs dynamically
    const updatedMat = await InventoryRepository.getMaterialById(pvcMultiSizeMat.id!, multiSizeCompanyId)
    assert.ok(updatedMat)
    assert.strictEqual(updatedMat!.current_stock, 51340 - 492, 'Warehouse stock in SFT should be 50,848')

    const breakdownAfter = getMaterialWarehouseStockBreakdown(updatedMat, warehouseRollsAfter)
    assert.strictEqual(breakdownAfter.roll_items[0].roll_count, 9, 'Dynamic breakdown for 3ft must be 9 Pcs')
    assert.strictEqual(breakdownAfter.roll_items[1].roll_count, 31, 'Dynamic breakdown for 5ft must be 31 Pcs')
    assert.strictEqual(breakdownAfter.roll_items[2].roll_count, 30, 'Dynamic breakdown for 7ft must be 30 Pcs')
    assert.strictEqual(breakdownAfter.total_rolls, 70, 'Total rolls remaining in warehouse must be 70')
  })

  test('6. Physical roll group by width & length matches exact SKU, Width, Length, Quantity, Area and Location breakdown', async () => {
    const groupTestCompanyId = `test-grp-company-${Date.now()}`

    // Seed MAT-11925 PVC with 2 roll sizes: 2ft x 164ft (10 rolls) and 5.25ft x 164ft (18 rolls)
    const pvcMat: Partial<MaterialRecord> = {
      id: `mat-pvc-${Date.now()}`,
      company_id: groupTestCompanyId,
      sku: 'MAT-11925',
      name: 'PVC',
      name_bn: 'পিভিসি',
      category: 'pvc' as any,
      unit: 'sft' as any,
      purchase_unit: 'roll',
      is_roll: true,
      standard_roll_length_ft: 164,
      location: 'Main Store',
      roll_sizes: [
        { width: 2, length: 164, quantity: 10, total_sft: 3280 },
        { width: 5.25, length: 164, quantity: 18, total_sft: 15498 },
      ],
      current_stock: 3280 + 15498, // 18,778 SFT
    }

    // Seed Vinyl with 3ft x 164ft (39 rolls)
    const vinylMat: Partial<MaterialRecord> = {
      id: `mat-vinyl-${Date.now()}`,
      company_id: groupTestCompanyId,
      sku: 'MAT-11925',
      name: 'Vinyl',
      name_bn: 'ভিনাইল',
      category: 'vinyl' as any,
      unit: 'sft' as any,
      purchase_unit: 'roll',
      is_roll: true,
      standard_roll_length_ft: 164,
      location: 'Main Store',
      roll_sizes: [
        { width: 3, length: 164, quantity: 39, total_sft: 19188 },
      ],
      current_stock: 19188, // 19,188 SFT
    }

    await InventoryRepository.createMaterial(pvcMat as any)
    await InventoryRepository.createMaterial(vinylMat as any)

    const pvcBreakdown = getMaterialWarehouseStockBreakdown(pvcMat)
    const vinylBreakdown = getMaterialWarehouseStockBreakdown(vinylMat)

    // Verify PVC Breakdown:
    // Row 1: MAT-11925 PVC 2ft 164ft 10 Roll 3280 Sft Main Store
    // Row 2: MAT-11925 PVC 5.25ft 164ft 18 Roll 15498 Sft Main Store
    assert.strictEqual(pvcBreakdown.roll_items.length, 2)
    assert.strictEqual(pvcBreakdown.roll_items[0].width_ft, 2)
    assert.strictEqual(pvcBreakdown.roll_items[0].length_ft, 164)
    assert.strictEqual(pvcBreakdown.roll_items[0].roll_count, 10)
    assert.strictEqual(pvcBreakdown.roll_items[0].total_sft, 3280)

    assert.strictEqual(pvcBreakdown.roll_items[1].width_ft, 5.25)
    assert.strictEqual(pvcBreakdown.roll_items[1].length_ft, 164)
    assert.strictEqual(pvcBreakdown.roll_items[1].roll_count, 18)
    assert.strictEqual(pvcBreakdown.roll_items[1].total_sft, 15498)

    // Verify Vinyl Breakdown:
    // Row 3: MAT-11925 Vinyl 3ft 164ft 39 Roll 19188 Sft Main Store
    assert.strictEqual(vinylBreakdown.roll_items.length, 1)
    assert.strictEqual(vinylBreakdown.roll_items[0].width_ft, 3)
    assert.strictEqual(vinylBreakdown.roll_items[0].length_ft, 164)
    assert.strictEqual(vinylBreakdown.roll_items[0].roll_count, 39)
    assert.strictEqual(vinylBreakdown.roll_items[0].total_sft, 19188)
  })

  test('7. Correctly handles Black PVC MAT-43550 configured sizes: zero-stock does not create phantom rolls, and receiving 3 rolls (4ft x 164ft) @ ৳6,560 yields 1968 SFT, ৳19,680 valuation', async () => {
    const blackPvcCompanyId = `black-pvc-company-${Date.now()}`

    // 1. Initial State: Black PVC registered with configured sizes (4ft and 5.25ft) and 0 current stock
    const blackPvcMat: Partial<MaterialRecord> = {
      id: `mat-black-pvc-${Date.now()}`,
      company_id: blackPvcCompanyId,
      sku: 'MAT-43550',
      name: 'Black PVC',
      name_bn: 'ব্ল্যাক পিভিসি',
      category: 'flex_banner' as any,
      unit: 'sft' as any,
      purchase_unit: 'roll',
      is_roll: true,
      standard_roll_length_ft: 164,
      current_stock: 0,
      average_cost: 10,
      purchase_price_per_sft: 10,
      roll_sizes: [
        { width: 4, length: 164, default_supplier_price: 6560, price: 6560 },
        { width: 5.25, length: 164, default_supplier_price: 8610, price: 8610 },
      ],
    }

    await InventoryRepository.createMaterial(blackPvcMat as any)

    // At 0 stock: getInventoryRolls must return 0 rolls (no dummy 3ft or 4ft rolls)
    const initialRolls = await InventoryRepository.getInventoryRolls(blackPvcCompanyId)
    assert.strictEqual(initialRolls.length, 0, 'Zero stock material must not generate phantom rolls')

    // At 0 stock: getMaterialWarehouseStockBreakdown must show 0 rolls, 0 SFT, 0 valuation
    const zeroBreakdown = getMaterialWarehouseStockBreakdown(blackPvcMat, initialRolls)
    assert.strictEqual(zeroBreakdown.total_rolls, 0)
    assert.strictEqual(zeroBreakdown.purchase_unit_display, '0 Rolls')
    assert.strictEqual(zeroBreakdown.consumption_unit_display, '0 SFT')
    assert.strictEqual(zeroBreakdown.total_valuation, 0)
    assert.strictEqual(zeroBreakdown.formatted_summary, '(4ft × 164ft)')

    // 2. Receive 3 rolls of 4ft x 164ft @ ৳6,560 / roll (Total = ৳ 19,680)
    const receiveResult = await InventoryService.receiveStock({
      company_id: blackPvcCompanyId,
      material_id: blackPvcMat.id!,
      location_id: 'loc-main-wh',
      quantity: 3, // 3 rolls
      unit_cost: 6560, // ৳ 6,560 per roll
      width_ft: 4,
      length_ft: 164,
      purchase_unit: 'roll',
      performed_by_name: 'Store Keeper',
      notes: 'GRN for Black PVC 4ft rolls',
    })

    // Verify stock adjustment: 3 rolls * 4ft * 164ft = 1968 SFT
    const updatedMat = await InventoryRepository.getMaterialById(blackPvcMat.id!, blackPvcCompanyId)
    assert.ok(updatedMat)
    assert.strictEqual(updatedMat?.current_stock, 1968, 'Stock must increase by 3 * 656 = 1968 SFT')
    assert.strictEqual(updatedMat?.average_cost, 10, 'Unit cost per SFT must be ৳ 10 (6560 / 656)')

    // Verify created physical rolls in warehouse
    const warehouseRolls = await InventoryRepository.getInventoryRolls(blackPvcCompanyId)
    assert.strictEqual(warehouseRolls.length, 3, 'Must create exactly 3 physical rolls')
    for (const r of warehouseRolls) {
      assert.strictEqual(r.width_ft, 4, 'Roll width must be 4ft')
      assert.strictEqual(r.initial_length_ft, 164, 'Roll length must be 164ft')
      assert.strictEqual(r.remaining_area_sft, 656, 'Roll area must be 656 SFT')
      assert.strictEqual(r.unit_cost, 6560, 'Roll purchase price must be ৳ 6,560')
    }

    // Verify inventory breakdown display
    const finalBreakdown = getMaterialWarehouseStockBreakdown(updatedMat, warehouseRolls)
    assert.strictEqual(finalBreakdown.total_rolls, 3)
    assert.strictEqual(finalBreakdown.purchase_unit_display, '3 Rolls')
    assert.strictEqual(finalBreakdown.consumption_unit_display, '1,968 SFT')
    assert.strictEqual(finalBreakdown.cost_display_primary, '৳ 6,560 / Roll')
    assert.strictEqual(finalBreakdown.cost_display_secondary, '(৳ 10.00 / SFT)')
    assert.strictEqual(finalBreakdown.total_valuation, 19680)
    assert.strictEqual(finalBreakdown.formatted_summary, '(4ft × 164ft)')
  })

  test('8. Distinct 5.25ft and 4ft width rolls maintain separate physical groups and never merge in inventory operations', async () => {
    const companyId = `test-roll-525-${Date.now()}`
    const { getMaterialWarehouseStockBreakdown } = await import('../../lib/units.ts')

    // 1. Create Black PVC material with 4ft and 5.25ft sizes
    const blackPvc: Partial<MaterialRecord> = {
      id: `mat-black-pvc-525-${Date.now()}`,
      company_id: companyId,
      sku: 'MAT-43550-525',
      name: 'Black PVC Flex Banner',
      category: 'flex_banner' as any,
      unit: 'sft' as any,
      purchase_unit: 'roll',
      is_roll: true,
      standard_roll_length_ft: 164,
      current_stock: 0,
      average_cost: 10,
      purchase_price_per_sft: 10,
      roll_sizes: [
        { width: 4, length: 164, default_supplier_price: 6560, price: 6560 },
        { width: 5.25, length: 164, default_supplier_price: 8610, price: 8610 },
      ],
    }
    await InventoryRepository.createMaterial(blackPvc as any)

    // 2. Direct receipt: 2 rolls of 4ft x 164ft
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: blackPvc.id!,
      location_id: 'loc-main',
      quantity: 2,
      unit_cost: 6560,
      width_ft: 4,
      length_ft: 164,
      purchase_unit: 'roll',
      performed_by_name: 'Store Officer',
      notes: 'Direct Intake: 4ft rolls',
    })

    // 3. PO Receipt via PurchaseService: 3 rolls of 5.25ft x 164ft
    const po = await PurchaseService.createPurchaseOrder({
      company_id: companyId,
      supplier_id: 'sup-01',
      supplier_name: 'National Media Supplier',
      supplier_phone: '+8801711000000',
      items: [
        {
          id: `poi-${Date.now()}-1`,
          material_id: blackPvc.id!,
          material_name: 'Black PVC (5.25ft × 164ft)',
          supplier_sku: '5.25ft × 164ft Roll',
          roll_width_ft: 5.25,
          roll_length_ft: 164,
          quantity_ordered: 3,
          quantity_received: 0,
          quantity_remaining: 3,
          unit: 'roll',
          unit_cost: 8610,
          total_cost: 3 * 8610,
        },
      ],
    })

    await PurchaseService.receiveGoods({
      company_id: companyId,
      purchase_order_id: po.id,
      received_by_name: 'Warehouse Manager',
      items_received: [
        {
          po_item_id: po.items[0].id,
          material_id: blackPvc.id!,
          material_name: 'Black PVC (5.25ft × 164ft)',
          current_received: 3,
          accepted_quantity: 3,
          unit: 'roll',
          unit_cost: 8610,
          roll_width_ft: 5.25,
          roll_length_ft: 164,
        },
      ],
    })

    // 4. Verify physical rolls in warehouse
    const allRolls = await InventoryRepository.getInventoryRolls(companyId)
    assert.strictEqual(allRolls.length, 5, 'Total physical rolls must be exactly 5 (2 of 4ft + 3 of 5.25ft)')

    const rolls4ft = allRolls.filter((r) => r.width_ft === 4)
    const rolls525ft = allRolls.filter((r) => r.width_ft === 5.25)

    assert.strictEqual(rolls4ft.length, 2, 'Must have exactly 2 rolls of 4ft width')
    assert.strictEqual(rolls4ft[0].remaining_area_sft, 656, '4ft roll must be 656 SFT')

    assert.strictEqual(rolls525ft.length, 3, 'Must have exactly 3 rolls of 5.25ft width (NOT merged into 4ft!)')
    assert.strictEqual(rolls525ft[0].remaining_area_sft, 861, '5.25ft roll must be 861 SFT (5.25 * 164)')
    assert.strictEqual(rolls525ft[0].unit_cost, 8610, '5.25ft roll cost must be ৳ 8,610')

    // 5. Verify warehouse stock breakdown
    const updatedMat = await InventoryRepository.getMaterialById(blackPvc.id!, companyId)
    assert.ok(updatedMat)
    const breakdown = getMaterialWarehouseStockBreakdown(updatedMat!, allRolls)

    assert.strictEqual(breakdown.total_rolls, 5)
    assert.strictEqual(breakdown.roll_items.length, 2, 'Breakdown must have 2 distinct roll item groups')

    const group4 = breakdown.roll_items.find((it) => it.width_ft === 4)
    assert.ok(group4, '4ft roll item group must exist')
    assert.strictEqual(group4?.roll_count, 2)
    assert.strictEqual(group4?.total_sft, 1312)

    const group525 = breakdown.roll_items.find((it) => it.width_ft === 5.25)
    assert.ok(group525, '5.25ft roll item group must exist')
    assert.strictEqual(group525?.roll_count, 3)
    assert.strictEqual(group525?.total_sft, 2583)

    assert.ok(
      breakdown.formatted_summary.includes('4ft × 164ft') && breakdown.formatted_summary.includes('5.25ft × 164ft'),
      'Formatted summary must display both sizes distinctly'
    )
  })

  test('9. Material with 5ft base width and 0.25ft production allowance computes effective 5.25ft width and 861 Sft area per roll', async () => {
    const companyId = `allowance-company-${Date.now()}`
    const { PriceIntelligenceEngine } = await import('../../lib/domain/price-intelligence-engine.ts')
    const { getMaterialWarehouseStockBreakdown } = await import('../../lib/units.ts')

    // 1. Material configured with 4ft and 5ft available widths and 0.25ft allowance
    const blackPvcMat: Partial<MaterialRecord> = {
      id: `mat-black-pvc-allowance-${Date.now()}`,
      company_id: companyId,
      sku: 'MAT-43550',
      name: 'Black PVC',
      name_bn: 'ব্ল্যাক পিভিসি',
      category: 'flex_banner' as any,
      unit: 'sft' as any,
      purchase_unit: 'roll',
      is_roll: true,
      standard_roll_length_ft: 164,
      production_width_allowance: 0.25,
      available_widths_ft: [4, 5],
      current_stock: 0,
      average_cost: 10,
      purchase_price_per_sft: 10,
    }
    await InventoryRepository.createMaterial(blackPvcMat as any)

    // 2. Verify active sizes generated by PriceIntelligenceEngine
    const activeSizes = PriceIntelligenceEngine.getMaterialActiveSizes(blackPvcMat)
    assert.strictEqual(activeSizes.length, 2, 'Should have 2 active sizes (4.25ft or 4ft, 5.25ft)')
    const size5 = activeSizes.find((s) => s.nominal_width_ft === 5 || s.label.startsWith('5ft'))
    assert.ok(size5, '5ft size option must exist')
    assert.strictEqual(size5?.width_ft, 5.25, 'Effective width must be 5.25ft (5ft + 0.25ft allowance)')
    assert.strictEqual(size5?.standard_area_sft, 861, 'Standard area must be 861 Sft (5.25 * 164)')

    // 3. Receive 41 rolls of 4ft and 1 roll of 5.25ft
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: blackPvcMat.id!,
      location_id: 'loc-wh-main',
      quantity: 41,
      unit_cost: 6560,
      width_ft: 4,
      length_ft: 164,
      purchase_unit: 'roll',
      performed_by_name: 'Store Manager',
      notes: '41 rolls 4ft',
    })

    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: blackPvcMat.id!,
      location_id: 'loc-main-store',
      quantity: 1,
      unit_cost: 8610,
      width_ft: 5.25,
      length_ft: 164,
      purchase_unit: 'roll',
      performed_by_name: 'Store Manager',
      notes: '1 roll 5.25ft',
    })

    // 4. Verify physical rolls in warehouse
    const rolls = await InventoryRepository.getInventoryRolls(companyId)
    assert.strictEqual(rolls.length, 42, 'Total rolls must be 42 (41 + 1)')

    const roll525 = rolls.find((r) => r.width_ft === 5.25)
    assert.ok(roll525, '5.25ft physical roll must exist')
    assert.strictEqual(roll525?.width_ft, 5.25, 'Physical roll width must be 5.25ft')
    assert.strictEqual(roll525?.remaining_area_sft, 861, 'Physical roll area must be 861 Sft (NOT 820 Sft)')

    // 5. Verify stock breakdown
    const updatedMat = await InventoryRepository.getMaterialById(blackPvcMat.id!, companyId)
    assert.ok(updatedMat)
    const breakdown = getMaterialWarehouseStockBreakdown(updatedMat!, rolls)
    assert.strictEqual(breakdown.total_rolls, 42)

    const item4 = breakdown.roll_items.find((it) => it.width_ft === 4)
    assert.ok(item4)
    assert.strictEqual(item4?.roll_count, 41)
    assert.strictEqual(item4?.total_sft, 26896, '41 rolls of 4ft x 164ft = 26,896 Sft')

    const item525 = breakdown.roll_items.find((it) => it.width_ft === 5.25)
    assert.ok(item525, '5.25ft roll group must exist in breakdown')
    assert.strictEqual(item525?.roll_count, 1)
    assert.strictEqual(item525?.total_sft, 861, '1 roll of 5.25ft x 164ft = 861 Sft (NOT 820 Sft)')
  })
})


