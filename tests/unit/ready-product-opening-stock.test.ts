import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ProductService } from '../../services/product.service.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Unit: Ready Product Opening Stock & Warehouse Thresholds Propagation', () => {
  const companyId = 'tenant-ready-stock-test-01'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [], companyId)
    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [], companyId)
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_HISTORY, [], companyId)
    PrintERPDataStore.set(STORAGE_KEYS.STOCK_BALANCES, [], companyId)
    PrintERPDataStore.set(STORAGE_KEYS.STOCK_LEDGER, [], companyId)
  })

  it('1. Correctly saves opening_stock (50 pcs) and reorder_level (10 pcs) when creating Ready Product', async () => {
    const readyProductData = {
      name: 'Roll-Up Standee 3x6 ft',
      name_bn: 'রোল-আপ স্ট্যান্ডি ৩×৬ ফিট',
      sku: 'RP-STAND-3X6',
      category: 'display_stands',
      product_type: 'ready_product' as const,
      entity_type: 'product' as const,
      commercial_type: 'ready_product' as const,
      is_ready_product: true,
      unit: 'piece',
      selling_unit: 'piece',
      purchase_unit: 'piece',
      selling_price: 1850,
      base_cost: 1100,
      purchase_price: 1100,
      opening_stock: 50,
      reorder_level: 10,
      max_stock: 200,
      warehouse_location: 'Shelf B-12',
      company_id: companyId,
    }

    const created = await ProductService.createProduct(readyProductData)

    // Assert that returned enriched record has opening_stock and current_stock = 50
    assert.strictEqual(created.opening_stock, 50, 'created.opening_stock must be 50')
    assert.strictEqual(created.current_stock, 50, 'created.current_stock must be 50')
    assert.strictEqual(created.stock, 50, 'created.stock must be 50')
    assert.strictEqual(created.reorder_level, 10, 'created.reorder_level must be 10')
    assert.strictEqual(created.warehouse_location, 'Shelf B-12', 'created.warehouse_location must match')

    // Assert that fetching products by company returns the product with 50 current stock
    const products = await ProductRepository.getProducts(companyId, false, 'all')
    const found = products.find((p) => p.sku === 'RP-STAND-3X6')
    assert.ok(found, 'Product must be found in catalog')
    assert.strictEqual(found.current_stock, 50, 'found.current_stock must be 50')
    assert.strictEqual(found.opening_stock, 50, 'found.opening_stock must be 50')
    assert.strictEqual(found.reorder_level, 10, 'found.reorder_level must be 10')
    assert.strictEqual(found.warehouse_location, 'Shelf B-12', 'found.warehouse_location must match')
  })

  it('2. Correctly updates stock and reorder thresholds on existing Ready Product', async () => {
    const readyProductData = {
      name: 'Promotional Table Counter',
      sku: 'RP-TABLE-01',
      category: 'promo_items',
      product_type: 'ready_product' as const,
      entity_type: 'product' as const,
      commercial_type: 'ready_product' as const,
      is_ready_product: true,
      unit: 'piece',
      selling_unit: 'piece',
      purchase_unit: 'piece',
      selling_price: 3900,
      base_cost: 2400,
      purchase_price: 2400,
      opening_stock: 20,
      reorder_level: 5,
      warehouse_location: 'Aisle 4',
      company_id: companyId,
    }

    const created = await ProductService.createProduct(readyProductData)
    assert.strictEqual(created.current_stock, 20)

    // Update stock to 75
    const updated = await ProductService.updateProduct(
      created.id,
      {
        current_stock: 75,
        reorder_level: 15,
        warehouse_location: 'Aisle 5',
      },
      companyId
    )

    assert.strictEqual(updated.current_stock, 75, 'updated.current_stock must be 75')
    assert.strictEqual(updated.stock, 75, 'updated.stock must be 75')
    assert.strictEqual(updated.reorder_level, 15, 'updated.reorder_level must be 15')
    assert.strictEqual(updated.warehouse_location, 'Aisle 5', 'updated.warehouse_location must match')

    // Verify fetched record matches
    const refetched = await ProductService.getProductById(created.id, companyId)
    assert.ok(refetched)
    assert.strictEqual(refetched.current_stock, 75)
    assert.strictEqual(refetched.reorder_level, 15)
  })

  it('3. Inventory summary includes ready product opening stock in total stock valuation', async () => {
    const readyProductData = {
      name: 'Acrylic Sandwich Frame A4',
      sku: 'RP-ACR-A4',
      category: 'acrylic_displays',
      product_type: 'ready_product' as const,
      entity_type: 'product' as const,
      commercial_type: 'ready_product' as const,
      is_ready_product: true,
      unit: 'piece',
      selling_unit: 'piece',
      purchase_unit: 'piece',
      selling_price: 720,
      base_cost: 380,
      purchase_price: 380,
      opening_stock: 100, // 100 pcs @ ৳380 = ৳38,000
      reorder_level: 20,
      company_id: companyId,
    }

    await ProductService.createProduct(readyProductData)

    const summary = await InventoryService.getInventorySummary(companyId)
    assert.ok(summary.totalAvailableStockValue >= 38000, `Stock value must be at least 38,000 (actual: ${summary.totalAvailableStockValue})`)
  })
})
