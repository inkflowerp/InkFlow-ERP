import { describe, it } from 'node:test'
import assert from 'node:assert'
import type { MaterialRecord } from '../../types/inventory.types.ts'
import type { ProductRecord } from '../../types/product.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { ProductService } from '../../services/product.service.ts'

describe('Receive Stock Unified Catalog & Pricing Update Intelligence Tests', () => {
  const companyId = 'test-co-receive-pricing'

  const mockMaterials: MaterialRecord[] = [
    {
      id: 'mat-flex-101',
      company_id: companyId,
      sku: 'FLEX-STAR-440',
      name: 'Star Flex Banner 440 GSM 10ft',
      name_bn: 'স্টার ফ্লেক্স ৪৪০ জিএসএম',
      category: 'flex' as any,
      unit: 'sft',
      current_stock: 500,
      average_cost: 12.0,
      last_purchase_price: 12.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mat-acrylic-202',
      company_id: companyId,
      sku: 'ACRYLIC-CAST-5MM',
      name: 'Cast Clear Acrylic Sheet 5mm (8x4ft)',
      name_bn: 'ক্লিয়ার অ্যাক্রিলিক ৫ মিমি',
      category: 'acrylic' as any,
      unit: 'sheet',
      current_stock: 10,
      average_cost: 3200.0,
      last_purchase_price: 3200.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const mockProducts: ProductRecord[] = [
    {
      id: 'prod-rollup-301',
      company_id: companyId,
      sku: 'STAND-ROLLUP-ALU',
      name: 'Roll-up Banner Display Stand (Aluminium 2.5x6ft)',
      name_bn: 'রোল-আপ ব্যানার ডিসপ্লে স্ট্যান্ড',
      category: 'Ready Merchandise & Hardware',
      product_type: 'ready_product',
      unit: 'pcs',
      purchase_unit: 'pcs',
      purchase_price: 850.0,
      base_cost: 850.0,
      selling_price: 1400.0,
      target_margin_percentage: 39,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-print-service-401',
      company_id: companyId,
      sku: 'PRINT-BACKLIT-UV',
      name: 'UV Backlit Film Printing Service',
      name_bn: 'ইউভি ব্যাকলিট প্রিন্ট সার্ভিস',
      category: 'Digital Print Services',
      product_type: 'print_service',
      unit: 'sft',
      purchase_unit: 'sft',
      purchase_price: 35.0,
      base_cost: 35.0,
      selling_price: 65.0,
      target_margin_percentage: 46,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  it('1. Unified Catalog correctly presents both materials and commercial products with units & pricing', () => {
    // Merge materials and products
    const unified = [
      ...mockMaterials.map((m) => ({
        id: m.id,
        sku: m.sku,
        name: m.name,
        unit: m.unit,
        item_type: 'material',
        previous_cost: m.average_cost,
        previous_selling_price: Math.round(m.average_cost * 1.35),
      })),
      ...mockProducts.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        item_type: 'product',
        previous_cost: p.purchase_price || p.base_cost,
        previous_selling_price: p.selling_price,
      })),
    ]

    assert.strictEqual(unified.length, 4, 'Should contain all 4 items across materials and products')
    
    const rollup = unified.find((x) => x.sku === 'STAND-ROLLUP-ALU')
    assert.ok(rollup, 'Rollup stand product must be in unified catalog')
    assert.strictEqual(rollup?.unit, 'pcs')
    assert.strictEqual(rollup?.previous_cost, 850)
    assert.strictEqual(rollup?.previous_selling_price, 1400)

    const flex = unified.find((x) => x.sku === 'FLEX-STAR-440')
    assert.ok(flex, 'Flex material must be in unified catalog')
    assert.strictEqual(flex?.unit, 'sft')
    assert.strictEqual(flex?.previous_cost, 12)
  })

  it('2. Purchase cost variance calculation detects price increases and price drops', () => {
    const previousCost = 850
    const newCostIncrease = 950
    const varianceIncrease = Math.round(((newCostIncrease - previousCost) / previousCost) * 100)
    assert.strictEqual(varianceIncrease, 12, 'Cost increase from 850 to 950 should be +12%')

    const newCostDrop = 765
    const varianceDrop = Math.round(((newCostDrop - previousCost) / previousCost) * 100)
    assert.strictEqual(varianceDrop, -10, 'Cost reduction from 850 to 765 should be -10%')
  })

  it('3. Auto-suggests new selling price preserving gross profit margin %', () => {
    const previousCost = 850
    const previousSellingPrice = 1400
    const targetMarginPercent = Math.round(((previousSellingPrice - previousCost) / previousSellingPrice) * 100)
    assert.strictEqual(targetMarginPercent, 39, 'Target margin should be 39%')

    // Supplier increases cost to 1,000 BDT
    const newPurchaseCost = 1000
    // Suggested selling price = ceil(newCost / (1 - targetMargin/100))
    const suggestedSellingPrice = Math.ceil(newPurchaseCost / (1 - targetMarginPercent / 100))
    assert.strictEqual(suggestedSellingPrice, 1640, 'Suggested selling price should maintain 39% margin at ৳1,640')

    // Check recalculated margin with new selling price
    const recalculatedMargin = Math.round(((suggestedSellingPrice - newPurchaseCost) / suggestedSellingPrice) * 100)
    assert.strictEqual(recalculatedMargin, 39, 'Recalculated margin matches target margin')
  })

  it('4. Updating product pricing with new purchase cost persists in DataStore and ProductService', async () => {
    // Seed initial product in DataStore across default and tenant partition
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, mockProducts, false)
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, mockProducts, false, companyId)

    const productId = 'prod-rollup-301'
    const newPurchasePrice = 950
    const newSellingPrice = 1600
    const newMarginPercent = 41

    const updated = await ProductService.updatePrice(
      productId,
      newSellingPrice,
      'Receive Stock Intake price adjustment',
      'Store Manager',
      'usr-store-1',
      companyId,
      {
        newPurchasePrice,
        newTargetMarginPercent: newMarginPercent,
      }
    )

    assert.ok(updated, 'Product update must succeed')
    assert.strictEqual(updated?.selling_price, 1600, 'Selling price must be updated to 1600')
    assert.strictEqual(updated?.purchase_price, 950, 'Purchase price must be updated to 950')
    assert.strictEqual(updated?.target_margin_percentage, 41, 'Target margin must be updated to 41%')

    // Verify price history was recorded
    const history = await ProductService.getPriceHistory(productId, companyId)
    assert.ok(history.length > 0, 'Price change history must be recorded')
    assert.strictEqual(history[0].old_price, 1400)
    assert.strictEqual(history[0].new_price, 1600)
  })

  it('5. Receiving stock for a product updates inventory ledger and location stock balance', async () => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, mockProducts, false)
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, mockProducts, false, companyId)
    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, mockMaterials, false)
    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, mockMaterials, false, companyId)

    const res = await InventoryRepository.recordStockAdjustment({
      company_id: companyId,
      material_id: 'prod-rollup-301',
      location_id: 'loc-main-store',
      quantity_change: 25,
      transaction_type: 'RECEIPT',
      unit_cost: 950,
      reference_type: 'STOCK_RECEIPT',
      reference_id: 'REC-2026-001',
      notes: 'Direct Inward Intake from supplier [Lot: LOT-091A]',
      performed_by_id: 'usr-store-1',
      performed_by_name: 'Store Keeper',
    })

    assert.ok(res, 'Stock adjustment must return result')
    assert.strictEqual(res.ledgerEntry.material_id, 'prod-rollup-301')
    assert.strictEqual(res.ledgerEntry.quantity_change, 25)
    assert.strictEqual(res.ledgerEntry.unit_cost, 950)
    assert.strictEqual(res.ledgerEntry.total_cost, 23750)

    // Check that product current_stock in DataStore was updated
    const productsInStore = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS, companyId) || []
    const updatedRollup = productsInStore.find((p) => p.id === 'prod-rollup-301')
    assert.ok(updatedRollup, 'Product must be found in products store')
    assert.strictEqual(updatedRollup.current_stock, 25, 'Product current_stock must be updated to 25')
  })

  it('6. Ready product stock on hand and total valuation calculation for X-Stand (RP-09470)', async () => {
    const xStandProduct: ProductRecord = {
      id: 'prod-xstand-09470',
      company_id: companyId,
      sku: 'RP-09470',
      name: 'X-Stand',
      name_bn: 'এক্স-স্ট্যান্ড',
      category: 'Ready Merchandise & Hardware',
      product_type: 'ready_product',
      entity_type: 'product',
      unit: 'pcs',
      selling_unit: 'PIECE',
      purchase_price: 200.0,
      base_cost: 200.0,
      selling_price: 300.0,
      target_margin_percentage: 33,
      dimensions_spec: '2ft × 5ft (60 × 160 cm)',
      min_order_quantity: 1,
      current_stock: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [xStandProduct], false)
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [xStandProduct], false, companyId)

    // Initially: Stock On Hand is 0, Total Valuation is 0
    let prods = await ProductService.getProducts(companyId, false, 'all', undefined, 'product')
    let stand = prods.find((p) => p.sku === 'RP-09470')
    assert.ok(stand, 'X-Stand product must be retrieved')
    assert.strictEqual(stand.current_stock, 0)
    assert.strictEqual(Number(stand.current_stock || 0) * Number(stand.base_cost || 0), 0)

    // Inward Receive Stock: Receive 50 units @ 200 BDT
    const adjResult = await InventoryRepository.recordStockAdjustment({
      company_id: companyId,
      material_id: xStandProduct.id,
      location_id: 'loc-main-store',
      quantity_change: 50,
      transaction_type: 'RECEIPT',
      unit_cost: 200,
      reference_type: 'STOCK_RECEIPT',
      reference_id: 'GRN-2026-XSTAND',
      notes: 'Direct Stock Inward for X-Stand display hardware',
      performed_by_id: 'usr-store-1',
      performed_by_name: 'Store Keeper',
    })

    assert.ok(adjResult, 'Adjustment must succeed')
    assert.strictEqual(adjResult.material.current_stock, 50)

    // After Receipt: Stock On Hand is 50, Total Valuation is 50 * 200 = 10,000 BDT
    prods = await ProductService.getProducts(companyId, false, 'all', undefined, 'product')
    stand = prods.find((p) => p.sku === 'RP-09470')
    assert.ok(stand)
    const stockQty = Number((stand as any).current_stock ?? (stand as any).stock ?? 0)
    const cost = Number(stand.base_cost || stand.purchase_price || 0)
    const totalValuation = stockQty * cost

    assert.strictEqual(stockQty, 50, 'Stock on hand must now be 50')
    assert.strictEqual(cost, 200, 'Unit base cost must be 200')
    assert.strictEqual(totalValuation, 10000, 'Total valuation must be 10,000 BDT')
  })
})
