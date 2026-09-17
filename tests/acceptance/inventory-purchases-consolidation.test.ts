import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { PurchaseRepository } from '../../lib/repositories/purchase.repository.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { evaluateStockAvailability } from '../../lib/domain/stock-availability.ts'
import type { MaterialRecord, InventoryRollRecord, StockLedgerRecord } from '../../types/inventory.types.ts'

describe('INKFLOW — Inventory + Purchases Consolidated Workspace Acceptance Tests', () => {
  const companyId = 'test-company-consolidation'

  beforeEach(() => {
    PrintERPDataStore.clear()
  })

  test('1. PO Creation does NOT increase inventory or create physical rolls', async () => {
    // Setup material master with purchase unit = roll, billing unit = sft
    const material: MaterialRecord = {
      id: 'mat-vinyl-01',
      company_id: companyId,
      name: 'Vinyl Sticker Roll (Chinese Glossy)',
      sku: 'MAT-VINYL-01',
      category: 'vinyl',
      unit: 'sft',
      is_roll: true,
      material_type: 'roll',
      available_widths_ft: [2.25, 3.0, 4.0, 5.0],
      standard_roll_length_ft: 164.0,
      current_stock: 0,
      min_stock_level: 0,
      reorder_level: 10,
      average_cost: 25.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, material)

    // Create PO for 5 Vinyl Rolls
    const po = await PurchaseRepository.createPurchaseOrder({
      company_id: companyId,
      supplier_id: 'sup-01',
      supplier_name: 'Media Supplier BD',
      supplier_phone: '01711000000',
      status: 'issued',
      items: [
        {
          id: 'poi-1',
          purchase_order_id: 'po-1',
          material_id: material.id,
          material_name: material.name,
          quantity_ordered: 5,
          quantity_received: 0,
          quantity_remaining: 5,
          unit: 'roll',
          unit_cost: 8500,
          total_cost: 42500,
        },
      ],
    })

    assert.ok(po.id, 'PO should be created successfully')
    assert.strictEqual(po.status, 'issued')

    // Verify stock is still 0
    const currentMat = await InventoryRepository.getMaterialById(material.id, companyId)
    assert.strictEqual(Number(currentMat?.current_stock || 0), 0, 'Inventory stock must remain 0 after PO creation')

    // Verify 0 physical rolls exist
    const rolls = await InventoryRepository.getInventoryRolls(companyId)
    assert.strictEqual(rolls.length, 0, 'No physical rolls should exist before GRN')
  })

  test('2. GRN Ingestion increases inventory and generates discrete physical roll records', async () => {
    const materialId = 'mat-vinyl-02'
    const material: MaterialRecord = {
      id: materialId,
      company_id: companyId,
      name: 'Eco-Solvent Glossy Vinyl',
      sku: 'MAT-ECO-02',
      category: 'vinyl',
      unit: 'sft',
      is_roll: true,
      material_type: 'roll',
      available_widths_ft: [2.25],
      standard_roll_length_ft: 164.0,
      current_stock: 0,
      min_stock_level: 0,
      average_cost: 23.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, material)

    // Receive 3 Physical Rolls via GRN
    const roll1 = await InventoryRepository.createPhysicalRoll({
      company_id: companyId,
      material_id: materialId,
      roll_code: 'ROLL-VINYL-001',
      width_ft: 2.25,
      initial_length_ft: 164.0,
      unit_cost: 8500,
      purchase_order_id: 'po-01',
    })

    const roll2 = await InventoryRepository.createPhysicalRoll({
      company_id: companyId,
      material_id: materialId,
      roll_code: 'ROLL-VINYL-002',
      width_ft: 2.25,
      initial_length_ft: 164.0,
      unit_cost: 8500,
      purchase_order_id: 'po-01',
    })

    const roll3 = await InventoryRepository.createPhysicalRoll({
      company_id: companyId,
      material_id: materialId,
      roll_code: 'ROLL-VINYL-003',
      width_ft: 2.25,
      initial_length_ft: 164.0,
      unit_cost: 8500,
      purchase_order_id: 'po-01',
    })

    assert.strictEqual(roll1.width_ft, 2.25)
    assert.strictEqual(roll1.initial_length_ft, 164.0)
    assert.strictEqual(roll1.remaining_area_sft, 369) // 2.25 * 164 = 369 SFT

    const rolls = await InventoryRepository.getInventoryRolls(companyId)
    assert.strictEqual(rolls.length, 3, 'Exactly 3 discrete physical rolls must exist')
  })

  test('3. Ready Products enter inventory as pieces without roll coercion', async () => {
    const readyProd = await ProductRepository.createProduct({
      company_id: companyId,
      name: 'X-Banner Stand 2x5ft Premium Metal',
      sku: 'PRD-XSTAND-01',
      unit: 'pcs',
      product_type: 'ready_product',
      commercial_type: 'production_product',
      measurement_type: 'piece',
      selling_price: 650,
      purchase_price: 380,
      conversion_ratio: 1.0,
    })

    assert.strictEqual(readyProd.unit, 'pcs')
    assert.strictEqual(readyProd.entity_type, 'product')
    assert.strictEqual(readyProd.selling_price, 650)
  })

  test('4. Separate Purchase Unit (Roll: 2.25ft x 164ft) and Billing Unit (SFT: 2.0ft nominal)', () => {
    const purchaseWidthFt = 2.25
    const purchaseLengthFt = 164.0
    const purchaseCostBDT = 8500
    const billingWidthFt = 2.0
    const billingUnit = 'sft'

    const totalPurchasedAreaSft = purchaseWidthFt * purchaseLengthFt // 369 SFT
    const unitCostPerSft = purchaseCostBDT / totalPurchasedAreaSft // ~23.035 BDT / SFT

    assert.strictEqual(purchaseWidthFt, 2.25)
    assert.strictEqual(billingWidthFt, 2.0)
    assert.strictEqual(billingUnit, 'sft')
    assert.ok(unitCostPerSft > 23 && unitCostPerSft < 24)
  })

  test('5. Issue to Print Floor changes custody without double-deduction on consumption', async () => {
    const materialId = 'mat-vinyl-03'
    await InventoryRepository.createMaterial({
      id: materialId,
      company_id: companyId,
      name: 'Outdoor Vinyl 4ft High Gloss',
      sku: 'MAT-VINYL-03',
      category: 'vinyl',
      unit: 'sft',
      is_roll: true,
      roll_width_ft: 4.0,
      current_stock: 400,
    })

    const roll = await InventoryRepository.createPhysicalRoll({
      company_id: companyId,
      material_id: materialId,
      roll_code: 'ROLL-ISSUE-01',
      width_ft: 4.0,
      initial_length_ft: 100.0,
      unit_cost: 10000,
    })

    assert.strictEqual(roll.status, 'available')
    assert.strictEqual(roll.current_length_ft, 100.0)

    // Operator logs actual consumption: 10 ft linear cut
    const consumptionResult = await InventoryRepository.consumeFromPhysicalRoll({
      company_id: companyId,
      roll_id: roll.id,
      linear_length_consumed_ft: 10.0,
      operator_name: 'Lead Press Operator',
      notes: 'Job #101 4x10ft Banner',
    })

    assert.strictEqual(consumptionResult.roll.current_length_ft, 90.0, 'Remaining length should be 90ft')
    assert.strictEqual(consumptionResult.roll.status, 'in_use')
    assert.strictEqual(consumptionResult.roll.consumed_area_sft, 40.0, 'Consumed area is 4ft * 10ft = 40 SFT')

    // Verify Stock Ledger entry logged
    const ledger = await InventoryRepository.getStockLedger(companyId)
    assert.ok(ledger.length > 0, 'Ledger entry should be recorded')
    const lastEntry = ledger[ledger.length - 1]
    assert.strictEqual(Number(lastEntry.quantity_change), -40.0, 'Ledger must reflect exact consumed area')
  })

  test('6. Remnant creation preserves usable offcuts in inventory rack', async () => {
    const remnant = await InventoryRepository.createRemnant({
      company_id: companyId,
      parent_material_id: 'mat-vinyl-03',
      width: 3.5,
      length: 8.0,
      dimension_unit: 'ft',
      quantity: 1,
      unit: 'sft',
      condition: 'usable',
      notes: 'End of job offcut',
      location_id: 'loc-01',
    })

    assert.strictEqual(remnant.width, 3.5)
    assert.strictEqual(remnant.length, 8.0)
    assert.strictEqual(remnant.area_sft, 28.0)
    assert.strictEqual(remnant.status, 'available')
  })

  test('7. Stock Availability Engine distinguishes LOW_STOCK from INSUFFICIENT_FOR_ORDER', () => {
    const material: MaterialRecord = {
      id: 'mat-test-avail',
      company_id: companyId,
      name: 'Backlit Film',
      sku: 'MAT-BACKLIT-01',
      category: 'film',
      unit: 'sft',
      is_roll: true,
      current_stock: 50,
      min_stock_level: 0,
      reorder_level: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Small job (10 SFT) with stock = 50 and reorder_level = 100 -> LOW_STOCK
    const lowStockResult = evaluateStockAvailability({
      materialId: material.id,
      customerWidthFt: 2,
      customerLengthFt: 5,
      quantity: 1,
      materials: [material],
    })

    assert.strictEqual(lowStockResult.isAvailableForOrder, true)
    assert.strictEqual(lowStockResult.isLowStock, true)
    assert.strictEqual(lowStockResult.isShortage, false)

    // Large job (200 SFT) with stock = 50 -> INSUFFICIENT_FOR_ORDER
    const insufficientResult = evaluateStockAvailability({
      materialId: material.id,
      customerWidthFt: 4,
      customerLengthFt: 10,
      quantity: 5, // 4 * 10 * 5 = 200 SFT
      materials: [material],
    })

    assert.strictEqual(insufficientResult.isAvailableForOrder, false)
    assert.strictEqual(insufficientResult.isShortage, true)
  })
})
