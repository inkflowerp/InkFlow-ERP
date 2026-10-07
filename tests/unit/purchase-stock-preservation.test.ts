import { describe, it } from 'node:test'
import assert from 'node:assert'
import type { ProductRecord } from '../../types/product.types.ts'
import { PrintFlowDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { ProductService } from '../../services/product.service.ts'

describe('Purchase Stock Preservation & Incremental Receiving Tests', () => {
  const companyId = 'test-co-stock-preserve'

  it('1. Opening stock of 50 units is preserved and incremented to 80 when a purchase of 30 units is received', async () => {
    // Setup initial product with opening stock = 50 in pricing_formula
    const xStand: ProductRecord = {
      id: 'prod-xstand-preserve',
      company_id: companyId,
      sku: 'PRD-XSTAND-01',
      name: 'X-Stand Display 2x5ft',
      product_type: 'ready_product',
      category: 'display_stands',
      unit: 'piece',
      purchase_unit: 'piece',
      selling_unit: 'piece',
      base_cost: 180,
      purchase_price: 180,
      selling_price: 350,
      pricing_formula: {
        opening_stock: 50,
        current_stock: 50,
        stock: 50,
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as ProductRecord

    PrintFlowDataStore.set(STORAGE_KEYS.PRODUCTS, [xStand], false)
    PrintFlowDataStore.set(STORAGE_KEYS.PRODUCTS, [xStand], false, companyId)

    // Verify initial stock resolution
    const initialMat = await InventoryRepository.getMaterialById(xStand.id, companyId)
    assert.ok(initialMat, 'Bridged material must be found')
    assert.strictEqual(initialMat.current_stock, 50, 'Initial bridged stock must reflect opening stock of 50')

    // Receive 30 units via InventoryService.receiveStock
    const receiveResult = await InventoryService.receiveStock({
      company_id: companyId,
      material_id: xStand.id,
      quantity: 30,
      unit_cost: 180,
      performed_by_name: 'Store Manager',
      location_id: 'loc-main',
    })

    assert.ok(receiveResult, 'Receive stock must succeed')
    assert.strictEqual(
      receiveResult.material.current_stock,
      80,
      'Bridged material stock must be 80 (50 + 30), NOT 30!'
    )

    // Check product in DataStore and ProductRepository
    const updatedProd = await ProductRepository.getProductById(xStand.id, companyId)
    assert.ok(updatedProd, 'Product must exist')
    const formula = updatedProd.pricing_formula as any
    assert.strictEqual(formula.opening_stock, 50, 'Opening stock must remain 50')
    assert.strictEqual(formula.current_stock, 80, 'Current stock in pricing_formula must be 80 (50 + 30)')
    assert.strictEqual(formula.stock, 80, 'Stock in pricing_formula must be 80')
  })

  it('2. Subsequent purchase adds to existing stock rather than replacing it', async () => {
    // Current stock is 80, receive another 20 units
    const secondReceive = await InventoryService.receiveStock({
      company_id: companyId,
      material_id: 'prod-xstand-preserve',
      quantity: 20,
      unit_cost: 180,
      performed_by_name: 'Store Manager',
      location_id: 'loc-main',
    })

    assert.strictEqual(
      secondReceive.material.current_stock,
      100,
      'Stock must increment from 80 to 100 (80 + 20)'
    )

    const prod = await ProductRepository.getProductById('prod-xstand-preserve', companyId)
    const formula = prod?.pricing_formula as any
    assert.strictEqual(formula.current_stock, 100, 'Current stock must be 100')
    assert.strictEqual(formula.opening_stock, 50, 'Opening stock must still remain 50')
  })

  it('3. Updating product details does not reset current stock to opening stock', async () => {
    // Edit product description and price without touching stock
    await ProductRepository.updateProduct(
      'prod-xstand-preserve',
      {
        description: 'Premium Silver Anodized Finish',
        selling_price: 380,
      },
      companyId
    )

    const prod = await ProductRepository.getProductById('prod-xstand-preserve', companyId)
    const formula = prod?.pricing_formula as any
    assert.strictEqual(
      formula.current_stock,
      100,
      'Current stock must remain 100 after updating product metadata'
    )
    assert.strictEqual(prod?.selling_price, 380)
  })

  it('4. InventoryRepository.recordStockAdjustment preserves stock on hand for products', async () => {
    const directAdj = await InventoryRepository.recordStockAdjustment({
      company_id: companyId,
      material_id: 'prod-xstand-preserve',
      quantity_change: 15,
      transaction_type: 'purchase',
      unit_cost: 180,
      performed_by_name: 'Warehouse Clerk',
    })

    assert.strictEqual(
      directAdj.material.current_stock,
      115,
      'Stock must increment from 100 to 115 (100 + 15)'
    )
  })
})
