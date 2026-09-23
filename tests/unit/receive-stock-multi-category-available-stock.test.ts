import test from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { getMaterialWarehouseStockBreakdown, createInventoryGroupingKey, normalizeInventoryGroupAttributes } from '../../lib/units.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'

test('Multi-Category Receive Stock & Available Stock Synchronization Tests', async (t) => {
  const companyId = 'test-company-multicat-avail'
  PrintERPDataStore.clearAll()

  await t.test('1. Multi-Size Rigid Sheets: Stock Intake updates sheet_sizes and Available Stock per dimension', async () => {
    // Setup rigid sheet material
    const acrylic = await InventoryRepository.createMaterial({
      company_id: companyId,
      sku: 'MAT-ACR-001',
      name: 'Clear Cast Acrylic 5mm',
      category: 'acrylic',
      unit: 'sft',
      purchase_unit: 'sheet',
      current_stock: 0,
      average_cost: 43.75, // 1400 / 32
      thickness: '5mm',
      available_sheet_sizes: [
        { id: 'sz-8x4', width: 8, length: 4, width_ft: 8, length_ft: 4, label: '8ft × 4ft', quantity: 0, default_supplier_price: 1400 },
        { id: 'sz-6x4', width: 6, length: 4, width_ft: 6, length_ft: 4, label: '6ft × 4ft', quantity: 0, default_supplier_price: 1050 },
      ],
      material_config: {
        sheet_sizes: [
          { id: 'sz-8x4', width: 8, length: 4, width_ft: 8, length_ft: 4, label: '8ft × 4ft', quantity: 0, default_supplier_price: 1400 },
          { id: 'sz-6x4', width: 6, length: 4, width_ft: 6, length_ft: 4, label: '6ft × 4ft', quantity: 0, default_supplier_price: 1050 },
        ],
      },
    })

    // Receive 10 sheets of 8ft × 4ft at ৳ 1400
    const res1 = await InventoryService.receiveStock({
      company_id: companyId,
      material_id: acrylic.id,
      location_id: 'loc-main',
      quantity: 10,
      unit_cost: 1400,
      purchase_unit: 'sheet',
      width_ft: 8,
      length_ft: 4,
      size_label: '8ft × 4ft',
      performed_by_name: 'Store Manager',
      notes: 'Received 10 sheets 8x4ft',
    })

    assert.ok(res1.ledgerEntry, 'Ledger entry should be created')
    const updatedAcrylic1 = await InventoryRepository.getMaterialById(acrylic.id, companyId)
    assert.ok(updatedAcrylic1, 'Material should exist')
    assert.strictEqual(updatedAcrylic1?.current_stock, 320, '10 sheets of 32 sft = 320 sft')

    // Check warehouse breakdown
    const breakdown1 = getMaterialWarehouseStockBreakdown(updatedAcrylic1!)
    assert.strictEqual(breakdown1.roll_items.length, 2, 'Should preserve configured sheet sizes')
    const item8x4_1 = breakdown1.roll_items.find((it) => it.width_ft === 8 && it.length_ft === 4)
    assert.strictEqual(item8x4_1?.roll_count, 10, '8ft × 4ft group should have 10 sheets available')
    assert.strictEqual(item8x4_1?.purchase_price, 1400, '8ft × 4ft group should have unit cost 1400')
    assert.strictEqual(item8x4_1?.total_valuation, 14000, 'Valuation should be 14,000')

    // Receive 5 sheets of 6ft × 4ft at ৳ 1050
    const res2 = await InventoryService.receiveStock({
      company_id: companyId,
      material_id: acrylic.id,
      location_id: 'loc-main',
      quantity: 5,
      unit_cost: 1050,
      purchase_unit: 'sheet',
      width_ft: 6,
      length_ft: 4,
      size_label: '6ft × 4ft',
      performed_by_name: 'Store Manager',
      notes: 'Received 5 sheets 6x4ft',
    })

    const updatedAcrylic2 = await InventoryRepository.getMaterialById(acrylic.id, companyId)
    assert.strictEqual(updatedAcrylic2?.current_stock, 320 + (5 * 24), 'Total stock should be 440 sft')

    const breakdown2 = getMaterialWarehouseStockBreakdown(updatedAcrylic2!)
    const item8x4_2 = breakdown2.roll_items.find((it) => it.width_ft === 8 && it.length_ft === 4)
    const item6x4_2 = breakdown2.roll_items.find((it) => it.width_ft === 6 && it.length_ft === 4)

    assert.strictEqual(item8x4_2?.roll_count, 10, '8ft × 4ft group should have 10 sheets')
    assert.strictEqual(item6x4_2?.roll_count, 5, '6ft × 4ft group should have 5 sheets')
    assert.strictEqual(breakdown2.total_valuation, (10 * 1400) + (5 * 1050), 'Total valuation should be 19,250')
  })

  await t.test('2. Inks & Liquids: Stock Intake updates color variants and discrete Available Stock', async () => {
    const ink = await InventoryRepository.createMaterial({
      company_id: companyId,
      sku: 'MAT-INK-ECO',
      name: 'Eco-Solvent Ultra HD Ink 1L',
      category: 'inks',
      unit: 'bottle',
      purchase_unit: 'bottle',
      current_stock: 0,
      average_cost: 2200,
      variants: [
        { id: 'v-c', variant_name: 'Cyan', color: 'Cyan', quantity: 0, unit_cost: 2200 },
        { id: 'v-m', variant_name: 'Magenta', color: 'Magenta', quantity: 0, unit_cost: 2200 },
        { id: 'v-y', variant_name: 'Yellow', color: 'Yellow', quantity: 0, unit_cost: 2200 },
        { id: 'v-k', variant_name: 'Black', color: 'Black', quantity: 0, unit_cost: 2200 },
      ],
    })

    // Receive 12 bottles Cyan
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: ink.id,
      location_id: 'loc-main',
      quantity: 12,
      unit_cost: 2200,
      purchase_unit: 'bottle',
      variant_id: 'v-c',
      variant_name: 'Cyan',
      performed_by_name: 'Store Keeper',
    })

    // Receive 8 bottles Magenta
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: ink.id,
      location_id: 'loc-main',
      quantity: 8,
      unit_cost: 2200,
      purchase_unit: 'bottle',
      variant_id: 'v-m',
      variant_name: 'Magenta',
      performed_by_name: 'Store Keeper',
    })

    const freshInk = await InventoryRepository.getMaterialById(ink.id, companyId)
    assert.strictEqual(freshInk?.current_stock, 20, 'Total bottles should be 20')

    const breakdown = getMaterialWarehouseStockBreakdown(freshInk!)
    const cyanGroup = breakdown.roll_items.find((it) => it.finishing === 'Cyan')
    const magGroup = breakdown.roll_items.find((it) => it.finishing === 'Magenta')
    const yellowGroup = breakdown.roll_items.find((it) => it.finishing === 'Yellow')

    assert.strictEqual(cyanGroup?.roll_count, 12, 'Cyan should have 12 bottles available')
    assert.strictEqual(magGroup?.roll_count, 8, 'Magenta should have 8 bottles available')
    assert.strictEqual(yellowGroup?.roll_count, 0, 'Yellow should have 0 bottles available')
    assert.strictEqual(breakdown.total_valuation, 20 * 2200, 'Total valuation should be 44,000')
  })

  await t.test('3. Hardware / Display Stands: Multi-Size Standee intake and Available Stock', async () => {
    const stand = await InventoryRepository.createMaterial({
      company_id: companyId,
      sku: 'MAT-HW-XSTAND',
      name: 'Luxury X-Banner Stand',
      category: 'hardware',
      unit: 'pcs',
      purchase_unit: 'piece',
      current_stock: 0,
      average_cost: 650,
      variants: [
        { id: 'v-2.5x6', variant_name: '2.5ft × 6ft Stand', size_spec: '2.5ft × 6ft', width: 2.5, length: 6, quantity: 0, unit_cost: 650 },
        { id: 'v-3x6.5', variant_name: '3ft × 6.5ft Stand', size_spec: '3ft × 6.5ft', width: 3, length: 6.5, quantity: 0, unit_cost: 850 },
      ],
    })

    // Receive 20 of 2.5ft × 6ft
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: stand.id,
      location_id: 'loc-main',
      quantity: 20,
      unit_cost: 650,
      purchase_unit: 'piece',
      variant_id: 'v-2.5x6',
      variant_name: '2.5ft × 6ft Stand',
      performed_by_name: 'Store Keeper',
    })

    // Receive 10 of 3ft × 6.5ft
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: stand.id,
      location_id: 'loc-main',
      quantity: 10,
      unit_cost: 850,
      purchase_unit: 'piece',
      variant_id: 'v-3x6.5',
      variant_name: '3ft × 6.5ft Stand',
      performed_by_name: 'Store Keeper',
    })

    const freshStand = await InventoryRepository.getMaterialById(stand.id, companyId)
    assert.strictEqual(freshStand?.current_stock, 30, 'Total stands = 30 pcs')

    const breakdown = getMaterialWarehouseStockBreakdown(freshStand!)
    const smallStand = breakdown.roll_items.find((it) => it.width_ft === 2.5 && it.length_ft === 6)
    const largeStand = breakdown.roll_items.find((it) => it.width_ft === 3 && it.length_ft === 6.5)

    assert.strictEqual(smallStand?.roll_count, 20, '2.5ft × 6ft should have 20 pcs available')
    assert.strictEqual(largeStand?.roll_count, 10, '3ft × 6.5ft should have 10 pcs available')
    assert.strictEqual(breakdown.total_valuation, (20 * 650) + (10 * 850), 'Total valuation should be 21,500')
  })

  await t.test('4. Large Format Rolls: Discrete roll records & roll_sizes intake', async () => {
    const flex = await InventoryRepository.createMaterial({
      company_id: companyId,
      sku: 'MAT-FLX-340',
      name: 'Star Flex Frontlit 340gsm',
      category: 'flex',
      unit: 'sft',
      purchase_unit: 'roll',
      current_stock: 0,
      average_cost: 7.01, // 11500 / 1640
      roll_width_ft: 10,
      standard_roll_length_ft: 164,
      gsm: 340,
      roll_sizes: [
        { width: 10, width_ft: 10, length: 164, length_ft: 164, quantity: 0, unit_cost: 11500, price: 11500 },
      ],
    })

    const res = await InventoryService.receiveStock({
      company_id: companyId,
      material_id: flex.id,
      location_id: 'loc-main',
      quantity: 3,
      unit_cost: 11500,
      purchase_unit: 'roll',
      width_ft: 10,
      length_ft: 164,
      size_label: '10ft × 164ft',
      performed_by_name: 'Store Keeper',
    })

    assert.strictEqual(res.rollsCreated?.length, 3, 'Should create 3 physical roll records')
    const freshFlex = await InventoryRepository.getMaterialById(flex.id, companyId)
    assert.strictEqual(freshFlex?.current_stock, 3 * 10 * 164, '3 rolls of 1640 sft = 4920 sft')

    const breakdown = getMaterialWarehouseStockBreakdown(freshFlex!, res.rollsCreated)
    assert.strictEqual(breakdown.roll_items.length, 1, 'Should have 1 roll group')
    assert.strictEqual(breakdown.roll_items[0].roll_count, 3, 'Available rolls = 3')
    assert.strictEqual(breakdown.roll_items[0].total_sft, 4920, 'Available SFT = 4,920')
    assert.strictEqual(breakdown.total_valuation, 3 * 11500, 'Total valuation = 34,500')
  })

  await t.test('5. Commercial Ready Product Intake synchronizes both Materials and Products stores', async () => {
    // Register product in DataStore
    const prodId = 'prod-mug-custom'
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, {
      id: prodId,
      company_id: companyId,
      sku: 'RP-MUG-001',
      name: 'Custom Printed Ceramic Mug',
      entity_type: 'product',
      product_type: 'ready_product',
      category: 'merchandise',
      unit: 'pcs',
      selling_unit: 'pcs',
      current_stock: 0,
      stock: 0,
      base_cost: 120,
      purchase_price: 120,
      selling_price: 250,
      is_active: true,
    }, companyId)

    // Receive 50 mugs
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: prodId,
      location_id: 'loc-main',
      quantity: 50,
      unit_cost: 120,
      purchase_unit: 'pcs',
      performed_by_name: 'Merchandise Manager',
      notes: 'Initial Batch 50 Mugs',
    })

    // Check materials repo
    const matRecord = await InventoryRepository.getMaterialById(prodId, companyId)
    assert.strictEqual(matRecord?.current_stock, 50, 'Material current stock should be 50')

    // Check products DataStore
    const prods = PrintERPDataStore.getAll<any>(STORAGE_KEYS.PRODUCTS, companyId) || []
    const prodRecord = prods.find((p) => p.id === prodId)
    assert.strictEqual(prodRecord?.current_stock, 50, 'Product current stock in DataStore should be 50')
  })
})
