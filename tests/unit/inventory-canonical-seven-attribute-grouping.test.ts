import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore } from '../../lib/db/data-store.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import {
  normalizeInventoryGroupAttributes,
  createInventoryGroupingKey,
  getMaterialWarehouseStockBreakdown,
} from '../../lib/units.ts'
import type { MaterialRecord, InventoryRollRecord } from '../../types/inventory.types.ts'

describe('Inventory & Warehouse Operations 7-Canonical-Attribute Grouping Rule', () => {
  const tenantA = 'tenant-canonical-test-a'
  const tenantB = 'tenant-canonical-test-b'

  beforeEach(() => {
    PrintERPDataStore.purgeTenantData(tenantA)
    PrintERPDataStore.clearAll(tenantA)
    PrintERPDataStore.purgeTenantData(tenantB)
    PrintERPDataStore.clearAll(tenantB)
  })

  describe('1. Canonical Key Normalization & Attribute Comparison Engine', () => {
    it('should normalize floating point representations: 2ft == 2.00ft, 2.25ft == 2.250ft', () => {
      const norm1 = normalizeInventoryGroupAttributes({
        name: 'PVC',
        width_ft: 2,
        length_ft: 100,
        allowance_ft: 0,
        purchase_price: 1000,
        gsm: 200,
        finishing: 'none',
      })

      const norm2 = normalizeInventoryGroupAttributes({
        name: '  PVC  ',
        width_ft: 2.000,
        length_ft: 100.0,
        allowance_ft: 0.0,
        purchase_price: 1000.00,
        gsm: 200,
        finishing: 'NONE',
      })

      assert.strictEqual(norm1.name, norm2.name)
      assert.strictEqual(norm1.width_ft, norm2.width_ft)
      assert.strictEqual(norm1.length_ft, norm2.length_ft)
      assert.strictEqual(norm1.allowance_ft, norm2.allowance_ft)
      assert.strictEqual(norm1.purchase_price, norm2.purchase_price)
      assert.strictEqual(norm1.gsm, norm2.gsm)
      assert.strictEqual(norm1.finishing, norm2.finishing)

      const key1 = createInventoryGroupingKey(norm1)
      const key2 = createInventoryGroupingKey(norm2)
      assert.strictEqual(key1, key2, 'Keys must be identical for normalized equivalents')
    })

    it('should handle null/undefined allowance, GSM, and finishing consistently', () => {
      const norm1 = normalizeInventoryGroupAttributes({
        name: 'Banner Gloss',
        width_ft: 3.2,
        length_ft: 164,
        allowance_ft: null,
        purchase_price: 1500,
        gsm: undefined,
        finishing: null,
      })

      const norm2 = normalizeInventoryGroupAttributes({
        name: 'Banner Gloss',
        width_ft: 3.2,
        length_ft: 164,
        allowance_ft: 0,
        purchase_price: 1500,
        gsm: 0,
        finishing: 'none',
      })

      assert.strictEqual(norm1.allowance_ft, 0)
      assert.strictEqual(norm1.gsm, 0)
      assert.strictEqual(norm1.finishing, 'none')
      assert.strictEqual(createInventoryGroupingKey(norm1), createInventoryGroupingKey(norm2))
    })

    it('should preserve exact purchase price precision without false merging', () => {
      const keyA = createInventoryGroupingKey({
        name: 'PVC',
        width_ft: 2.25,
        length_ft: 164,
        allowance_ft: 0,
        purchase_price: 1000.50,
        gsm: 200,
        finishing: 'none',
      })

      const keyB = createInventoryGroupingKey({
        name: 'PVC',
        width_ft: 2.25,
        length_ft: 164,
        allowance_ft: 0,
        purchase_price: 1000.75,
        gsm: 200,
        finishing: 'none',
      })

      assert.notStrictEqual(keyA, keyB, 'Distinct purchase prices must produce distinct grouping keys')
    })
  })

  describe('2. User Specified Grouping Scenarios (PVC vs Black PVC across sizes)', () => {
    it('should treat PVC and Black PVC across sizes (2.25x164, 2.25x100, 2x100, 2x400, 3x400) as completely separate groups', () => {
      const scenarios = [
        { name: 'PVC', w: 2.25, l: 164, p: 1000 },
        { name: 'Black PVC', w: 2.25, l: 164, p: 1000 },
        { name: 'PVC', w: 2.25, l: 100, p: 650 },
        { name: 'Black PVC', w: 2.25, l: 100, p: 650 },
        { name: 'PVC', w: 2.0, l: 100, p: 600 },
        { name: 'Black PVC', w: 2.0, l: 164, p: 980 },
        { name: 'PVC', w: 2.0, l: 400, p: 2400 },
        { name: 'Black PVC', w: 2.0, l: 400, p: 2400 },
        { name: 'PVC', w: 3.0, l: 400, p: 3600 },
        { name: 'Black PVC', w: 3.0, l: 400, p: 3600 },
      ]

      const keys = scenarios.map((s) =>
        createInventoryGroupingKey({
          name: s.name,
          width_ft: s.w,
          length_ft: s.l,
          allowance_ft: 0,
          purchase_price: s.p,
          gsm: 200,
          finishing: 'none',
        })
      )

      const uniqueKeys = new Set(keys)
      assert.strictEqual(
        uniqueKeys.size,
        10,
        'All 10 scenarios must yield 10 unique, distinct inventory groups'
      )
    })

    it('should separate items identical in 6 attributes when Purchase Price differs (1000 vs 1050)', () => {
      const lotA = createInventoryGroupingKey({
        name: 'PVC',
        width_ft: 2.25,
        length_ft: 164,
        allowance_ft: 0,
        purchase_price: 1000,
        gsm: 200,
        finishing: 'none',
      })

      const lotB = createInventoryGroupingKey({
        name: 'PVC',
        width_ft: 2.25,
        length_ft: 164,
        allowance_ft: 0,
        purchase_price: 1050,
        gsm: 200,
        finishing: 'none',
      })

      assert.notStrictEqual(lotA, lotB, 'Purchase price 1000 vs 1050 must yield separate groups')
    })
  })

  describe('3. Individual Attribute Variance Tests (All 7 Attributes Tested Independently)', () => {
    const baseAttr = {
      name: 'Vinyl Sticker',
      width_ft: 4.0,
      length_ft: 164.0,
      allowance_ft: 0.25,
      purchase_price: 4500.0,
      gsm: 120,
      finishing: 'matte',
    }
    const baseKey = createInventoryGroupingKey(baseAttr)

    it('3.1 Name changed -> separate group', () => {
      const modified = { ...baseAttr, name: 'Reflective Vinyl' }
      assert.notStrictEqual(createInventoryGroupingKey(modified), baseKey)
    })

    it('3.2 Width changed -> separate group', () => {
      const modified = { ...baseAttr, width_ft: 5.0 }
      assert.notStrictEqual(createInventoryGroupingKey(modified), baseKey)
    })

    it('3.3 Length changed -> separate group', () => {
      const modified = { ...baseAttr, length_ft: 100.0 }
      assert.notStrictEqual(createInventoryGroupingKey(modified), baseKey)
    })

    it('3.4 Allowance changed -> separate group', () => {
      const modified = { ...baseAttr, allowance_ft: 0.5 }
      assert.notStrictEqual(createInventoryGroupingKey(modified), baseKey)
    })

    it('3.5 Purchase Price changed -> separate group', () => {
      const modified = { ...baseAttr, purchase_price: 4750.0 }
      assert.notStrictEqual(createInventoryGroupingKey(modified), baseKey)
    })

    it('3.6 GSM changed -> separate group', () => {
      const modified = { ...baseAttr, gsm: 140 }
      assert.notStrictEqual(createInventoryGroupingKey(modified), baseKey)
    })

    it('3.7 Finishing changed -> separate group', () => {
      const modified = { ...baseAttr, finishing: 'gloss' }
      assert.notStrictEqual(createInventoryGroupingKey(modified), baseKey)
    })

    it('3.8 All 7 identical -> exactly SAME group', () => {
      const clone = { ...baseAttr }
      assert.strictEqual(createInventoryGroupingKey(clone), baseKey)
    })
  })

  describe('4. Warehouse Breakdown Aggregation & Valuation Precision', () => {
    it('should aggregate rolls with identical 7 attributes into one group and separate distinct lots', () => {
      const sampleMaterial: MaterialRecord = {
        id: 'mat-test-pvc',
        company_id: tenantA,
        sku: 'PVC-001',
        name: 'PVC Banner',
        category: 'flex_banner',
        unit: 'sft',
        is_roll: true,
        current_stock: 0,
        min_stock_level: 10,
        average_cost: 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const sampleRolls: InventoryRollRecord[] = [
        // Group 1: 2 rolls @ 1000 BDT
        {
          id: 'roll-1',
          company_id: tenantA,
          material_id: sampleMaterial.id,
          roll_code: 'ROLL-1',
          width_ft: 2.25,
          initial_length_ft: 164,
          current_length_ft: 164,
          total_area_sft: 369,
          remaining_area_sft: 369,
          unit_cost: 1000,
          status: 'available',
          location_name: 'Main Warehouse',
          allowance_ft: 0,
          gsm: 200,
          finishing: 'none',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
        {
          id: 'roll-2',
          company_id: tenantA,
          material_id: sampleMaterial.id,
          roll_code: 'ROLL-2',
          width_ft: 2.25,
          initial_length_ft: 164,
          current_length_ft: 164,
          total_area_sft: 369,
          remaining_area_sft: 369,
          unit_cost: 1000,
          status: 'available',
          location_name: 'Main Warehouse',
          allowance_ft: 0,
          gsm: 200,
          finishing: 'none',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
        // Group 2: 1 roll @ 1050 BDT (different purchase price)
        {
          id: 'roll-3',
          company_id: tenantA,
          material_id: sampleMaterial.id,
          roll_code: 'ROLL-3',
          width_ft: 2.25,
          initial_length_ft: 164,
          current_length_ft: 164,
          total_area_sft: 369,
          remaining_area_sft: 369,
          unit_cost: 1050,
          status: 'available',
          location_name: 'Main Warehouse',
          allowance_ft: 0,
          gsm: 200,
          finishing: 'none',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
      ]

      const breakdown = getMaterialWarehouseStockBreakdown(sampleMaterial, sampleRolls)

      assert.strictEqual(breakdown.roll_items.length, 2, 'Must have exactly 2 separate inventory groups')

      const group1000 = breakdown.roll_items.find((g) => g.purchase_price === 1000)
      const group1050 = breakdown.roll_items.find((g) => g.purchase_price === 1050)

      assert.ok(group1000, 'Group @ 1000 BDT must exist')
      assert.ok(group1050, 'Group @ 1050 BDT must exist')

      assert.strictEqual(group1000?.roll_count, 2, 'Group @ 1000 BDT must have 2 rolls')
      assert.strictEqual(group1000?.total_sft, 738, 'Group @ 1000 BDT total area must be 738 Sft')
      assert.strictEqual(group1000?.total_valuation, 2000, 'Group @ 1000 BDT valuation must be 2000 BDT')

      assert.strictEqual(group1050?.roll_count, 1, 'Group @ 1050 BDT must have 1 roll')
      assert.strictEqual(group1050?.total_sft, 369, 'Group @ 1050 BDT total area must be 369 Sft')
      assert.strictEqual(group1050?.total_valuation, 1050, 'Group @ 1050 BDT valuation must be 1050 BDT')
    })
  })

  describe('5. End-to-End Service Intake & Isolation Verification', () => {
    it('should receive multiple rolls with different prices & specs via InventoryService.receiveStock without merging into one size group', async () => {
      // 1. Create base material
      const mat = await InventoryService.createMaterial({
        company_id: tenantA,
        sku: 'PVC-MAT-01',
        name: 'PVC Banner',
        category: 'flex_banner',
        unit: 'sft',
        purchase_unit: 'roll',
        is_roll: true,
        current_stock: 0,
        min_stock_level: 0,
        average_cost: 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      // 2. Receive PVC 2.25 x 164 @ 1000 BDT, GSM 200, Finishing None - 3 Rolls
      await InventoryService.receiveStock({
        company_id: tenantA,
        material_id: mat.id,
        location_id: 'loc-wh-1',
        quantity: 3,
        unit_cost: 1000,
        width_ft: 2.25,
        length_ft: 164,
        allowance_ft: 0,
        gsm: 200,
        finishing: 'none',
        physical_form: 'roll',
        purchase_unit: 'roll',
      })

      // 3. Receive PVC 2.25 x 164 @ 1050 BDT, GSM 200, Finishing None - 2 Rolls
      await InventoryService.receiveStock({
        company_id: tenantA,
        material_id: mat.id,
        location_id: 'loc-wh-1',
        quantity: 2,
        unit_cost: 1050,
        width_ft: 2.25,
        length_ft: 164,
        allowance_ft: 0,
        gsm: 200,
        finishing: 'none',
        physical_form: 'roll',
        purchase_unit: 'roll',
      })

      // 4. Receive PVC 2.25 x 164 @ 1000 BDT, GSM 280 (Different GSM), Finishing None - 4 Rolls
      await InventoryService.receiveStock({
        company_id: tenantA,
        material_id: mat.id,
        location_id: 'loc-wh-1',
        quantity: 4,
        unit_cost: 1000,
        width_ft: 2.25,
        length_ft: 164,
        allowance_ft: 0,
        gsm: 280,
        finishing: 'none',
        physical_form: 'roll',
        purchase_unit: 'roll',
      })

      // Fetch material and verify roll_sizes
      const { InventoryRepository } = await import('../../lib/repositories/inventory.repository.ts')
      const updatedMat = await InventoryRepository.getMaterialById(mat.id, tenantA)
      assert.ok(updatedMat)
      assert.strictEqual(updatedMat?.roll_sizes?.length, 3, 'Must have 3 distinct size groups in roll_sizes')

      // Fetch physical rolls
      const rolls = await InventoryRepository.getInventoryRolls(tenantA, { materialId: mat.id })
      assert.strictEqual(rolls.length, 9, 'Must have 9 total physical roll instances')

      // Verify warehouse breakdown
      const breakdown = getMaterialWarehouseStockBreakdown(updatedMat!, rolls)
      assert.strictEqual(breakdown.roll_items.length, 3, 'Must have 3 distinct operational breakdown groups')

      const grp1 = breakdown.roll_items.find((b) => b.purchase_price === 1000 && b.gsm === 200)
      const grp2 = breakdown.roll_items.find((b) => b.purchase_price === 1050 && b.gsm === 200)
      const grp3 = breakdown.roll_items.find((b) => b.purchase_price === 1000 && b.gsm === 280)

      assert.strictEqual(grp1?.roll_count, 3)
      assert.strictEqual(grp2?.roll_count, 2)
      assert.strictEqual(grp3?.roll_count, 4)
    })

    it('should maintain strict tenant isolation across inventory groups and rolls', async () => {
      // Create identical material in Tenant A and Tenant B
      const matA = await InventoryService.createMaterial({
        company_id: tenantA,
        sku: 'PVC-ISO-01',
        name: 'PVC Banner',
        category: 'flex_banner',
        unit: 'sft',
        purchase_unit: 'roll',
        is_roll: true,
        current_stock: 0,
        min_stock_level: 0,
        average_cost: 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const matB = await InventoryService.createMaterial({
        company_id: tenantB,
        sku: 'PVC-ISO-01',
        name: 'PVC Banner',
        category: 'flex_banner',
        unit: 'sft',
        purchase_unit: 'roll',
        is_roll: true,
        current_stock: 0,
        min_stock_level: 0,
        average_cost: 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      // Receive 5 rolls in Tenant A
      await InventoryService.receiveStock({
        company_id: tenantA,
        material_id: matA.id,
        location_id: 'loc-wh-a',
        quantity: 5,
        unit_cost: 1000,
        width_ft: 2.25,
        length_ft: 164,
        allowance_ft: 0,
        gsm: 200,
        finishing: 'none',
        physical_form: 'roll',
        purchase_unit: 'roll',
      })

      // Verify Tenant B has 0 rolls and 0 inventory breakdown
      const { InventoryRepository } = await import('../../lib/repositories/inventory.repository.ts')
      const rollsA = await InventoryRepository.getInventoryRolls(tenantA, { materialId: matA.id })
      const rollsB = await InventoryRepository.getInventoryRolls(tenantB, { materialId: matB.id })

      assert.strictEqual(rollsA.length, 5)
      assert.strictEqual(rollsB.length, 0, 'Tenant B must see 0 rolls from Tenant A')

      const breakdownB = getMaterialWarehouseStockBreakdown(matB, rollsB)
      assert.strictEqual(breakdownB.roll_items.length, 0, 'Tenant B stock breakdown must be 0')
    })
  })

  describe('4. Universal 7-Attribute Grouping Across All Material Categories', () => {
    it('Rigid Sheets: separates distinct sheet sizes and thicknesses into distinct canonical groups', () => {
      const acrylicSheetMaterial: MaterialRecord = {
        id: 'mat-acrylic-01',
        company_id: tenantA,
        sku: 'ACR-CLR-3MM',
        name: 'Cast Acrylic Clear 3mm',
        category: 'acrylic',
        unit: 'sft',
        purchase_unit: 'sheet',
        is_roll: false,
        current_stock: 560, // 560 sqft total
        min_stock_level: 5,
        average_cost: 3200,
        sheet_sizes: [
          {
            id: 'ss-8x4',
            width_ft: 8,
            length_ft: 4,
            purchase_price: 3200,
            thickness_mm: 3,
            finishing: 'Clear',
            quantity: 10, // 10 sheets * 32 sft = 320 sft (val: ৳ 32,000)
          },
          {
            id: 'ss-6x4',
            width_ft: 6,
            length_ft: 4,
            purchase_price: 2400,
            thickness_mm: 3,
            finishing: 'Clear',
            quantity: 10, // 10 sheets * 24 sft = 240 sft (val: ৳ 24,000)
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const breakdown = getMaterialWarehouseStockBreakdown(acrylicSheetMaterial)
      assert.strictEqual(breakdown.is_roll, false)
      assert.strictEqual(breakdown.purchase_unit, 'sheet')
      assert.strictEqual(breakdown.roll_items.length, 2, 'Must have 2 distinct canonical sheet groups')

      const item8x4 = breakdown.roll_items.find((it) => it.width_ft === 8 && it.length_ft === 4)
      const item6x4 = breakdown.roll_items.find((it) => it.width_ft === 6 && it.length_ft === 4)

      assert.ok(item8x4, '8ft x 4ft sheet group must exist')
      assert.ok(item6x4, '6ft x 4ft sheet group must exist')

      assert.notStrictEqual(item8x4.key, item6x4.key, 'Grouping keys must be different')
      assert.strictEqual(item8x4.roll_count, 10)
      assert.strictEqual(item8x4.total_sft, 320)
      assert.strictEqual(item8x4.total_valuation, 32000)

      assert.strictEqual(item6x4.roll_count, 10)
      assert.strictEqual(item6x4.total_sft, 240)
      assert.strictEqual(item6x4.total_valuation, 24000)

      // Total valuation invariance
      assert.strictEqual(breakdown.total_valuation, 56000)
      assert.strictEqual(breakdown.total_rolls, 0, 'Non-roll material total_rolls is 0')
      assert.strictEqual(breakdown.roll_items.reduce((s, it) => s + it.roll_count, 0), 20)
    })

    it('Inks & Liquids: separates CMYK color variants with discrete costs into distinct canonical groups', () => {
      const ecoSolventInk: MaterialRecord = {
        id: 'mat-ink-01',
        company_id: tenantA,
        sku: 'INK-ECO-SOL',
        name: 'Eco-Solvent Premium Ink 1L',
        category: 'ink',
        unit: 'liter',
        purchase_unit: 'bottle',
        is_roll: false,
        current_stock: 14,
        min_stock_level: 4,
        average_cost: 1500,
        variants: [
          { id: 'var-c', variant_name: 'Cyan', purchase_price: 1500, quantity: 4 },
          { id: 'var-m', variant_name: 'Magenta', purchase_price: 1500, quantity: 4 },
          { id: 'var-y', variant_name: 'Yellow', purchase_price: 1500, quantity: 4 },
          { id: 'var-k', variant_name: 'Black', purchase_price: 1400, quantity: 2 },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const breakdown = getMaterialWarehouseStockBreakdown(ecoSolventInk)
      assert.strictEqual(breakdown.is_roll, false)
      assert.strictEqual(breakdown.purchase_unit, 'bottle')
      assert.strictEqual(breakdown.roll_items.length, 4, 'Must have 4 distinct CMYK color groups')

      const blackVar = breakdown.roll_items.find((it) => it.finishing === 'Black')
      const cyanVar = breakdown.roll_items.find((it) => it.finishing === 'Cyan')

      assert.ok(blackVar)
      assert.ok(cyanVar)
      assert.strictEqual(blackVar.purchase_price, 1400)
      assert.strictEqual(cyanVar.purchase_price, 1500)
      assert.notStrictEqual(blackVar.key, cyanVar.key)

      // Total valuation: (3 * 4 * 1500) + (2 * 1400) = 18000 + 2800 = 20800
      assert.strictEqual(breakdown.total_valuation, 20800)
      assert.strictEqual(breakdown.total_rolls, 0)
      assert.strictEqual(breakdown.roll_items.reduce((s, it) => s + it.roll_count, 0), 14)
    })

    it('Hardware: separates dimensional display standee sizes into distinct canonical groups', () => {
      const standeeMaterial: MaterialRecord = {
        id: 'mat-standee-01',
        company_id: tenantA,
        sku: 'STND-ROLLUP',
        name: 'Roll-Up Standee Luxury Base',
        category: 'hardware',
        unit: 'pcs',
        purchase_unit: 'pcs',
        is_roll: false,
        current_stock: 30,
        min_stock_level: 5,
        average_cost: 1200,
        variants: [
          { id: 'stnd-2.5x6', variant_name: '2.5ft x 6ft Stand', width_ft: 2.5, length_ft: 6, purchase_price: 1200, quantity: 20 },
          { id: 'stnd-3x6.5', variant_name: '3ft x 6.5ft Stand', width_ft: 3, length_ft: 6.5, purchase_price: 1450, quantity: 10 },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const breakdown = getMaterialWarehouseStockBreakdown(standeeMaterial)
      assert.strictEqual(breakdown.roll_items.length, 2)

      const stand2_5 = breakdown.roll_items.find((it) => it.width_ft === 2.5 && it.length_ft === 6)
      const stand3 = breakdown.roll_items.find((it) => it.width_ft === 3 && it.length_ft === 6.5)

      assert.ok(stand2_5)
      assert.ok(stand3)
      assert.strictEqual(stand2_5.roll_count, 20)
      assert.strictEqual(stand2_5.purchase_price, 1200)
      assert.strictEqual(stand3.roll_count, 10)
      assert.strictEqual(stand3.purchase_price, 1450)

      // Total valuation: 20*1200 + 10*1450 = 24000 + 14500 = 38500
      assert.strictEqual(breakdown.total_valuation, 38500)
      assert.strictEqual(breakdown.total_rolls, 0)
      assert.strictEqual(breakdown.roll_items.reduce((s, it) => s + it.roll_count, 0), 30)
    })

    it('Boxes / Packs: groups pack items with conversion into canonical groups', () => {
      const eyeletBoxMaterial: MaterialRecord = {
        id: 'mat-eyelet-01',
        company_id: tenantA,
        sku: 'EYE-10MM',
        name: 'Brass Eyelets #4 10mm',
        category: 'consumables',
        unit: 'pcs',
        purchase_unit: 'box',
        pack_quantity: 1000,
        is_roll: false,
        current_stock: 5000, // 5 boxes
        min_stock_level: 2000,
        average_cost: 850, // ৳ 850 / box
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const breakdown = getMaterialWarehouseStockBreakdown(eyeletBoxMaterial)
      assert.strictEqual(breakdown.roll_items.length, 1)
      assert.strictEqual(breakdown.purchase_unit, 'box')
      assert.strictEqual(breakdown.total_rolls, 0) // 0 rolls since it's a box
      assert.strictEqual(breakdown.roll_items[0].roll_count, 5) // 5 boxes
      assert.strictEqual(breakdown.cost_per_purchase_unit, 850)
      assert.strictEqual(breakdown.total_valuation, 4250) // 5 * 850 = 4250
    })

    it('Single-spec consumables: maintains 7-attribute canonical group invariance', () => {
      const cutterBladeMaterial: MaterialRecord = {
        id: 'mat-cutter-01',
        company_id: tenantA,
        sku: 'TOOL-BLADE-30D',
        name: 'Olfa 30 Degree Craft Cutter Blade',
        category: 'consumables',
        unit: 'pack',
        purchase_unit: 'pack',
        is_roll: false,
        current_stock: 15,
        min_stock_level: 3,
        average_cost: 220,
        default_finishing: '30-Degree Carbon Steel',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const breakdown = getMaterialWarehouseStockBreakdown(cutterBladeMaterial)
      assert.strictEqual(breakdown.roll_items.length, 1)
      const item = breakdown.roll_items[0]
      assert.strictEqual(item.roll_count, 15)
      assert.strictEqual(item.purchase_price, 220)
      assert.strictEqual(item.finishing, '30-Degree Carbon Steel')
      assert.ok(item.key?.includes('30-degree carbon steel'))
      assert.strictEqual(breakdown.total_valuation, 3300)
    })
  })
})
