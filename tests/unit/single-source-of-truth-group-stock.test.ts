import test from 'node:test'
import assert from 'node:assert/strict'
import { InventoryService } from '@/services/inventory.service'
import { InventoryRepository } from '@/lib/repositories/inventory.repository'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { getMaterialWarehouseStockBreakdown } from '@/lib/units'
import { MaterialRecord } from '@/types/inventory.types'

test('Single Source of Truth: Group stock isolation on receive and issue', async (t) => {
  const companyId = `test-comp-${Date.now()}`

  // Setup initial test location
  const locId = `loc-${Date.now()}`
  PrintERPDataStore.addItem(STORAGE_KEYS.LOCATIONS, {
    id: locId,
    company_id: companyId,
    location_code: 'WH-TEST',
    location_name: 'Test Warehouse',
    location_type: 'raw_material_store',
    is_active: true,
  }, companyId)

  await t.test('1. Multi-Size Roll Media: Receive & Issue to Floor strictly isolates selected size group', async () => {
    const matId = `mat-roll-${Date.now()}`
    const rollMaterial: MaterialRecord = {
      id: matId,
      company_id: companyId,
      sku: 'MED-VINYL-SAV',
      name: 'High Gloss SAV Vinyl Media',
      category: 'large_format_media',
      unit: 'sft',
      purchase_unit: 'roll',
      master_purchase_unit: 'roll',
      is_roll: true,
      roll_width_ft: 4,
      standard_roll_length_ft: 164,
      available_widths_ft: [3, 4, 5],
      roll_sizes: [
        {
          key: '3x164',
          name: 'High Gloss SAV Vinyl Media',
          width: 3,
          nominal_width_ft: 3,
          width_ft: 3,
          allowance_ft: 0,
          length: 164,
          length_ft: 164,
          purchase_price: 3000,
          unit_cost: 3000,
          price: 3000,
          gsm: 120,
          finishing: 'gloss',
          quantity: 0,
          stock: 0,
          stock_qty: 0,
          roll_count: 0,
          total_sft: 0,
        },
        {
          key: '4x164',
          name: 'High Gloss SAV Vinyl Media',
          width: 4,
          nominal_width_ft: 4,
          width_ft: 4,
          allowance_ft: 0,
          length: 164,
          length_ft: 164,
          purchase_price: 4000,
          unit_cost: 4000,
          price: 4000,
          gsm: 120,
          finishing: 'gloss',
          quantity: 0,
          stock: 0,
          stock_qty: 0,
          roll_count: 0,
          total_sft: 0,
        },
        {
          key: '5x164',
          name: 'High Gloss SAV Vinyl Media',
          width: 5,
          nominal_width_ft: 5,
          width_ft: 5,
          allowance_ft: 0,
          length: 164,
          length_ft: 164,
          purchase_price: 5000,
          unit_cost: 5000,
          price: 5000,
          gsm: 120,
          finishing: 'gloss',
          quantity: 0,
          stock: 0,
          stock_qty: 0,
          roll_count: 0,
          total_sft: 0,
        },
      ],
      current_stock: 0,
      average_cost: 4000,
      cost_per_unit: 4000,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, rollMaterial, companyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, rollMaterial)

    // Receive 5 rolls of 4ft x 164ft
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: matId,
      location_id: locId,
      quantity: 5,
      unit_cost: 4000,
      notes: 'Received 5 rolls of 4ft',
      width_ft: 4,
      nominal_width_ft: 4,
      length_ft: 164,
      gsm: 120,
      finishing: 'gloss',
    })

    // Receive 3 rolls of 5ft x 164ft
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: matId,
      location_id: locId,
      quantity: 3,
      unit_cost: 5000,
      notes: 'Received 3 rolls of 5ft',
      width_ft: 5,
      nominal_width_ft: 5,
      length_ft: 164,
      gsm: 120,
      finishing: 'gloss',
    })

    // Inspect warehouse breakdown
    const matAfterReceive = await InventoryRepository.getMaterialById(matId, companyId)
    assert.ok(matAfterReceive, 'Material should exist')
    const breakdown1 = getMaterialWarehouseStockBreakdown(matAfterReceive)

    const r3 = breakdown1.roll_items?.find((r) => r.width_ft === 3)
    const r4 = breakdown1.roll_items?.find((r) => r.width_ft === 4)
    const r5 = breakdown1.roll_items?.find((r) => r.width_ft === 5)

    assert.equal(r3?.roll_count || 0, 0, '3ft group must remain 0 rolls')
    assert.equal(r4?.roll_count, 5, '4ft group must have exactly 5 rolls')
    assert.equal(r5?.roll_count, 3, '5ft group must have exactly 3 rolls')
    // 5 * (4 * 164) + 3 * (5 * 164) = 5 * 656 + 3 * 820 = 3280 + 2460 = 5740 SFT
    assert.equal(matAfterReceive.current_stock, 5740, 'Total current stock must equal 5,740 SFT')

    // ISSUE TO FLOOR: Issue 2 rolls of 4ft x 164ft to Floor
    const issueRes = await InventoryService.issueMasterRollsBatch({
      company_id: companyId,
      material_id: matId,
      width_ft: 4,
      length_ft: 164,
      quantity_rolls: 2,
      location_id: locId,
      destination: 'machine',
      machine_id: 'roland',
      machine_name: 'Roland Eco-Solvent Press',
      operator_name: 'Sajib Rahman',
    })

    assert.equal(issueRes.total_area_sft, 1312, 'Issued area must be 2 * 656 = 1312 SFT')

    // Verify stock after issue
    const matAfterIssue = await InventoryRepository.getMaterialById(matId, companyId)
    assert.ok(matAfterIssue)
    const breakdown2 = getMaterialWarehouseStockBreakdown(matAfterIssue)

    const r3After = breakdown2.roll_items?.find((r) => r.width_ft === 3)
    const r4After = breakdown2.roll_items?.find((r) => r.width_ft === 4)
    const r5After = breakdown2.roll_items?.find((r) => r.width_ft === 5)

    assert.equal(r3After?.roll_count || 0, 0, '3ft group must remain 0 rolls')
    assert.equal(r4After?.roll_count, 3, '4ft group must be reduced from 5 to 3 rolls')
    assert.equal(r5After?.roll_count, 3, '5ft group MUST REMAIN 3 rolls without bleeding or mutation!')
    // 3 * 656 + 3 * 820 = 1968 + 2460 = 4428 SFT
    assert.equal(matAfterIssue.current_stock, 4428, 'Remaining available stock must be 4,428 SFT')

    // Verify Floor Consumption records were created
    const floorConsumptions = await InventoryRepository.getFloorConsumptions(companyId)
    const floorItems = floorConsumptions.filter((f) => f.material_id === matId)
    assert.ok(floorItems.length > 0, 'Floor consumption entry must exist for issued material')
    const totalFloorIssued = floorItems.reduce((sum, f) => sum + f.issued_quantity, 0)
    assert.equal(totalFloorIssued, 1312, 'Total floor consumption issued quantity must be 1,312 SFT')
  })

  await t.test('2. Multi-Size Rigid Sheets: Receive & Issue to Floor strictly isolates selected sheet size', async () => {
    const sheetMatId = `mat-sheet-${Date.now()}`
    const sheetMaterial: MaterialRecord = {
      id: sheetMatId,
      company_id: companyId,
      sku: 'RIG-ACRYLIC-3MM',
      name: 'Cast Clear Acrylic Sheet 3mm',
      category: 'rigid_sheet',
      unit: 'sft',
      purchase_unit: 'sheet',
      master_purchase_unit: 'sheet',
      is_roll: false,
      sheet_sizes: [
        {
          id: 'sz-8x4',
          label: '8ft × 4ft',
          width: 8,
          width_ft: 8,
          length: 4,
          length_ft: 4,
          quantity: 0,
          stock: 0,
          stock_qty: 0,
          sheet_count: 0,
          unit_cost: 3200,
          purchase_price: 3200,
        },
        {
          id: 'sz-6x4',
          label: '6ft × 4ft',
          width: 6,
          width_ft: 6,
          length: 4,
          length_ft: 4,
          quantity: 0,
          stock: 0,
          stock_qty: 0,
          sheet_count: 0,
          unit_cost: 2400,
          purchase_price: 2400,
        },
      ],
      current_stock: 0,
      average_cost: 100,
      cost_per_unit: 100,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, sheetMaterial, companyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, sheetMaterial)

    // Receive 10 sheets of 8ft x 4ft (32 SFT per sheet -> 320 SFT)
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: sheetMatId,
      location_id: locId,
      quantity: 10,
      unit_cost: 3200,
      width_ft: 8,
      nominal_width_ft: 8,
      length_ft: 4,
      notes: 'Received 10 sheets 8x4',
    })

    // Receive 5 sheets of 6ft x 4ft (24 SFT per sheet -> 120 SFT)
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: sheetMatId,
      location_id: locId,
      quantity: 5,
      unit_cost: 2400,
      width_ft: 6,
      nominal_width_ft: 6,
      length_ft: 4,
      notes: 'Received 5 sheets 6x4',
    })

    const matAfterReceive = await InventoryRepository.getMaterialById(sheetMatId, companyId)
    assert.ok(matAfterReceive)
    const breakdown1 = getMaterialWarehouseStockBreakdown(matAfterReceive)

    const s8x4 = breakdown1.roll_items?.find((s) => s.width_ft === 8 && s.length_ft === 4)
    const s6x4 = breakdown1.roll_items?.find((s) => s.width_ft === 6 && s.length_ft === 4)

    assert.equal(s8x4?.roll_count, 10, '8x4 sheet group must have 10 sheets')
    assert.equal(s6x4?.roll_count, 5, '6x4 sheet group must have 5 sheets')
    // 10 * 32 + 5 * 24 = 320 + 120 = 440 SFT
    assert.equal(matAfterReceive.current_stock, 440, 'Total stock must be 440 SFT')

    // ISSUE TO FLOOR: Issue 2 sheets of 6ft x 4ft
    const issueRes = await InventoryService.issueMasterRollsBatch({
      company_id: companyId,
      material_id: sheetMatId,
      width_ft: 6,
      length_ft: 4,
      quantity_rolls: 2,
      location_id: locId,
      destination: 'machine',
      machine_id: 'cnc',
      machine_name: 'CNC Router Workstation',
      operator_name: 'Tareq Aziz',
    })

    assert.equal(issueRes.total_area_sft, 48, 'Issued area must be 2 * 24 = 48 SFT')

    const matAfterIssue = await InventoryRepository.getMaterialById(sheetMatId, companyId)
    assert.ok(matAfterIssue)
    const breakdown2 = getMaterialWarehouseStockBreakdown(matAfterIssue)

    const s8x4After = breakdown2.roll_items?.find((s) => s.width_ft === 8 && s.length_ft === 4)
    const s6x4After = breakdown2.roll_items?.find((s) => s.width_ft === 6 && s.length_ft === 4)

    assert.equal(s8x4After?.roll_count, 10, '8x4 sheet group MUST REMAIN 10 sheets without any deduction')
    assert.equal(s6x4After?.roll_count, 3, '6x4 sheet group must be reduced from 5 to 3 sheets')
    // 10 * 32 + 3 * 24 = 320 + 72 = 392 SFT
    assert.equal(matAfterIssue.current_stock, 392, 'Remaining available stock must be 392 SFT')
  })

  await t.test('3. Multi-Variant Consumables: Receive & Issue to Floor strictly isolates selected variant', async () => {
    const inkMatId = `mat-ink-${Date.now()}`
    const inkMaterial: MaterialRecord = {
      id: inkMatId,
      company_id: companyId,
      sku: 'INK-ECO-SOLVENT',
      name: 'Roland Eco-Sol Max 2 Ink 1L',
      category: 'inks_chemicals',
      unit: 'bottle',
      purchase_unit: 'bottle',
      master_purchase_unit: 'bottle',
      is_roll: false,
      variants: [
        {
          id: 'v-cyan',
          variant_name: 'Cyan',
          quantity: 0,
          stock: 0,
          stock_qty: 0,
          count: 0,
          unit_cost: 3500,
          purchase_price: 3500,
        },
        {
          id: 'v-magenta',
          variant_name: 'Magenta',
          quantity: 0,
          stock: 0,
          stock_qty: 0,
          count: 0,
          unit_cost: 3500,
          purchase_price: 3500,
        },
        {
          id: 'v-yellow',
          variant_name: 'Yellow',
          quantity: 0,
          stock: 0,
          stock_qty: 0,
          count: 0,
          unit_cost: 3500,
          purchase_price: 3500,
        },
      ],
      current_stock: 0,
      average_cost: 3500,
      cost_per_unit: 3500,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, inkMaterial, companyId)
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, inkMaterial)

    // Receive 8 bottles of Cyan
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: inkMatId,
      location_id: locId,
      quantity: 8,
      unit_cost: 3500,
      variant_id: 'v-cyan',
      variant_name: 'Cyan',
      notes: 'Received 8 Cyan bottles',
    })

    // Receive 6 bottles of Magenta
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: inkMatId,
      location_id: locId,
      quantity: 6,
      unit_cost: 3500,
      variant_id: 'v-magenta',
      variant_name: 'Magenta',
      notes: 'Received 6 Magenta bottles',
    })

    // Receive 4 bottles of Yellow
    await InventoryService.receiveStock({
      company_id: companyId,
      material_id: inkMatId,
      location_id: locId,
      quantity: 4,
      unit_cost: 3500,
      variant_id: 'v-yellow',
      variant_name: 'Yellow',
      notes: 'Received 4 Yellow bottles',
    })

    const matAfterReceive = await InventoryRepository.getMaterialById(inkMatId, companyId)
    assert.ok(matAfterReceive)

    const cyanVar = matAfterReceive.variants?.find((v) => v.id === 'v-cyan' || v.variant_name === 'Cyan')
    const magVar = matAfterReceive.variants?.find((v) => v.id === 'v-magenta' || v.variant_name === 'Magenta')
    const yelVar = matAfterReceive.variants?.find((v) => v.id === 'v-yellow' || v.variant_name === 'Yellow')

    assert.equal(cyanVar?.quantity, 8, 'Cyan must have 8 bottles')
    assert.equal(magVar?.quantity, 6, 'Magenta must have 6 bottles')
    assert.equal(yelVar?.quantity, 4, 'Yellow must have 4 bottles')
    assert.equal(matAfterReceive.current_stock, 18, 'Total stock must be 18 bottles')

    // ISSUE TO FLOOR: Issue 2 bottles of Cyan
    await InventoryService.issueMasterRollsBatch({
      company_id: companyId,
      material_id: inkMatId,
      width_ft: 1,
      length_ft: 1,
      quantity_rolls: 2,
      location_id: locId,
      variant_id: 'v-cyan',
      variant_name: 'Cyan',
      destination: 'machine',
      machine_id: 'roland',
      machine_name: 'Roland Eco-Solvent Press',
      operator_name: 'Sajib Rahman',
    })

    const matAfterIssue = await InventoryRepository.getMaterialById(inkMatId, companyId)
    assert.ok(matAfterIssue)

    const cyanAfter = matAfterIssue.variants?.find((v) => v.id === 'v-cyan' || v.variant_name === 'Cyan')
    const magAfter = matAfterIssue.variants?.find((v) => v.id === 'v-magenta' || v.variant_name === 'Magenta')
    const yelAfter = matAfterIssue.variants?.find((v) => v.id === 'v-yellow' || v.variant_name === 'Yellow')

    assert.equal(cyanAfter?.quantity, 6, 'Cyan must be reduced from 8 to 6 bottles')
    assert.equal(magAfter?.quantity, 6, 'Magenta MUST REMAIN 6 bottles untouched')
    assert.equal(yelAfter?.quantity, 4, 'Yellow MUST REMAIN 4 bottles untouched')
    assert.equal(matAfterIssue.current_stock, 16, 'Total available stock must be 16 bottles')
  })
})
