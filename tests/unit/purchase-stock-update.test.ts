import { describe, it } from 'node:test'
import assert from 'node:assert'
import { PrintFlowDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { PurchaseService } from '../../services/purchase.service.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import type { ProductRecord } from '../../types/product.types.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'

describe('Purchase Order Direct Intake & Ready Product Stock Update Tests', () => {
  const companyId = 'test-co-po-stock-intake'

  const mockProduct: ProductRecord = {
    id: 'prod-xstand-test',
    company_id: companyId,
    sku: 'RP-XSTAND-60X160',
    name: 'X-Stand 2ft x 5ft (60 x 160 cm)',
    category: 'ready_product',
    product_type: 'ready_product',
    commercial_type: 'ready_product',
    unit: 'pcs',
    selling_unit: 'pcs',
    purchase_unit: 'pcs',
    purchase_price: 350,
    base_cost: 350,
    selling_price: 650,
    current_stock: 100,
    stock: 100,
    pricing_formula: {
      current_stock: 100,
      stock: 100,
    } as any,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const mockMaterial: MaterialRecord = {
    id: 'mat-banner-test',
    company_id: companyId,
    sku: 'MAT-STAR-FLEX-10',
    name: 'Star Flex Banner 10ft',
    category: 'flex' as any,
    unit: 'sft',
    purchase_unit: 'roll',
    current_stock: 500,
    average_cost: 15,
    last_purchase_price: 15,
    is_roll: true,
    roll_width_ft: 10,
    roll_length_ft: 164,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  it('1. Initializes mock products and materials in PrintFlowDataStore', () => {
    PrintFlowDataStore.addItem(STORAGE_KEYS.PRODUCTS, mockProduct, companyId)
    PrintFlowDataStore.addItem(STORAGE_KEYS.MATERIALS, mockMaterial, companyId)

    const prods = PrintFlowDataStore.getAll<ProductRecord>(STORAGE_KEYS.PRODUCTS, companyId)
    const p = prods.find((x) => x.id === mockProduct.id)
    assert.ok(p, 'Mock product should exist in DataStore')
    assert.strictEqual(p?.current_stock, 100)

    const mats = PrintFlowDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, companyId)
    const m = mats.find((x) => x.id === mockMaterial.id)
    assert.ok(m, 'Mock material should exist in DataStore')
    assert.strictEqual(m?.current_stock, 500)
  })

  it('2. Creating a Purchase Order with receive_immediately: true updates Ready Product stock on hand', async () => {
    const po = await PurchaseService.createPurchaseOrder({
      company_id: companyId,
      supplier_id: 'sup-test-01',
      supplier_name: 'Apex Displays Ltd',
      supplier_phone: '+8801711111111',
      target_location_id: 'loc-main-store',
      receive_immediately: true,
      items: [
        {
          id: 'poi-xstand-1',
          purchase_order_id: '',
          material_id: mockProduct.id,
          material_name: mockProduct.name,
          quantity_ordered: 50,
          quantity_received: 0,
          quantity_remaining: 50,
          unit: 'pcs',
          unit_cost: 340,
          total_cost: 17000,
        },
      ],
    })

    assert.ok(po, 'Purchase Order should be created')
    assert.strictEqual(po.status, 'received', 'PO status should be marked as received')
    assert.strictEqual(po.items[0].quantity_received, 50)
    assert.strictEqual(po.items[0].quantity_remaining, 0)

    // Verify product stock increased from 100 to 150 in DataStore
    const prods = PrintFlowDataStore.getAll<ProductRecord>(STORAGE_KEYS.PRODUCTS, companyId)
    const updatedProd = prods.find((x) => x.id === mockProduct.id)
    assert.ok(updatedProd, 'Product should exist in DataStore')
    assert.strictEqual(updatedProd?.current_stock, 150, 'Stock on hand should increase to 150')

    // Verify location stock balance exists
    const balances = PrintFlowDataStore.getAll<any>(STORAGE_KEYS.INVENTORY_STOCK_BALANCES, companyId)
    const locBal = balances.find((b) => b.material_id === mockProduct.id && b.location_id === 'loc-main-store')
    assert.ok(locBal, 'Location stock balance should be recorded')
    assert.strictEqual(locBal.quantity, 150, 'Location balance should reflect 150')
  })

  it('3. InventoryService.receiveStock succeeds for Ready Products and updates stock on hand', async () => {
    const currentProd = PrintFlowDataStore.getAll<ProductRecord>(STORAGE_KEYS.PRODUCTS, companyId).find((x) => x.id === mockProduct.id)
    const initialStock = Number(currentProd?.current_stock || 150)

    const result = await InventoryService.receiveStock({
      company_id: companyId,
      material_id: mockProduct.id,
      location_id: 'loc-main-store',
      quantity: 25,
      unit_cost: 330,
      performed_by_name: 'Store Manager',
    })

    assert.ok(result, 'Stock intake result should exist')
    assert.strictEqual(result.ledgerEntry.transaction_type, 'RECEIPT')

    const prods = PrintFlowDataStore.getAll<ProductRecord>(STORAGE_KEYS.PRODUCTS, companyId)
    const updatedProd = prods.find((x) => x.id === mockProduct.id)
    assert.strictEqual(updatedProd?.current_stock, initialStock + 25, 'Stock should be 175')
  })

  it('4. PurchaseService.createPurchaseOrder with receive_immediately: true updates raw materials and rolls', async () => {
    const matBefore = PrintFlowDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, companyId).find((x) => x.id === mockMaterial.id)
    const initialMatStock = Number(matBefore?.current_stock || 500)

    const po = await PurchaseService.createPurchaseOrder({
      company_id: companyId,
      supplier_id: 'sup-media-01',
      supplier_name: 'Dhaka Media Supplier',
      supplier_phone: '+8801722222222',
      target_location_id: 'loc-main-store',
      receive_immediately: true,
      items: [
        {
          id: 'poi-banner-1',
          purchase_order_id: '',
          material_id: mockMaterial.id,
          material_name: mockMaterial.name,
          quantity_ordered: 2, // 2 rolls = 2 * (10 * 164) = 3280 sft
          quantity_received: 0,
          quantity_remaining: 2,
          unit: 'roll',
          unit_cost: 24600,
          total_cost: 49200,
        },
      ],
    })

    assert.ok(po, 'Material PO should be created')
    assert.strictEqual(po.status, 'received')

    const mats = PrintFlowDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, companyId)
    const updatedMat = mats.find((x) => x.id === mockMaterial.id)
    assert.ok(updatedMat, 'Material should exist in DataStore')
    // 2 rolls of 10ft x 164ft = 3280 sft + 500 = 3780 sft
    assert.strictEqual(updatedMat?.current_stock, initialMatStock + 3280, 'Material stock should increase by roll area')
  })

  it('5. Receiving 1000 rolls of 10.5ft x 164ft on multi-width roll material updates the 10.5ft roll size and leaves 2.25ft unchanged', async () => {
    const multiRollMat: MaterialRecord = {
      id: 'mat-pvc-multi-width',
      company_id: companyId,
      sku: 'MAT-PVC-MULTI',
      name: 'PVC Flex Banner',
      category: 'pvc' as any,
      unit: 'sft',
      purchase_unit: 'roll',
      current_stock: 177735,
      average_cost: 15,
      last_purchase_price: 15,
      is_roll: true,
      roll_width_ft: 2.25,
      roll_length_ft: 164,
      standard_roll_length_ft: 164,
      available_widths_ft: [2.25, 3.25, 4.25, 5.25, 6.25, 7.25, 8.25, 10.5],
      roll_sizes: [
        {
          name: 'PVC (2.25ft x 164ft)',
          nominal_width_ft: 2,
          width_ft: 2.25,
          length_ft: 164,
          quantity: 15,
          stock: 15,
          stock_qty: 15,
          roll_count: 15,
          total_sft: 15 * 2.25 * 164,
          price: 3321,
          unit_cost: 3321,
        },
        {
          name: 'PVC (10.5ft x 164ft)',
          nominal_width_ft: 10,
          width_ft: 10.5,
          length_ft: 164,
          quantity: 100,
          stock: 100,
          stock_qty: 100,
          roll_count: 100,
          total_sft: 100 * 10.5 * 164,
          price: 12054,
          unit_cost: 12054,
        },
      ],
      material_config: {
        roll_sizes: [
          {
            name: 'PVC (2.25ft x 164ft)',
            nominal_width_ft: 2,
            width_ft: 2.25,
            length_ft: 164,
            quantity: 15,
            stock: 15,
            stock_qty: 15,
            roll_count: 15,
            total_sft: 15 * 2.25 * 164,
            price: 3321,
            unit_cost: 3321,
          },
          {
            name: 'PVC (10.5ft x 164ft)',
            nominal_width_ft: 10,
            width_ft: 10.5,
            length_ft: 164,
            quantity: 100,
            stock: 100,
            stock_qty: 100,
            roll_count: 100,
            total_sft: 100 * 10.5 * 164,
            price: 12054,
            unit_cost: 12054,
          },
        ],
      } as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintFlowDataStore.addItem(STORAGE_KEYS.MATERIALS, multiRollMat, companyId)

    // Purchase 1000 rolls of 10.5ft x 164ft
    const po = await PurchaseService.createPurchaseOrder({
      company_id: companyId,
      supplier_id: 'sup-media-01',
      supplier_name: 'Dhaka Media Supplier',
      supplier_phone: '+8801722222222',
      target_location_id: 'loc-main-store',
      receive_immediately: true,
      items: [
        {
          id: 'poi-pvc-10-5ft',
          purchase_order_id: '',
          material_id: multiRollMat.id,
          material_name: 'PVC Flex Banner (10.5ft × 164ft)',
          roll_width_ft: 10.5,
          roll_length_ft: 164,
          quantity_ordered: 1000,
          quantity_received: 0,
          quantity_remaining: 1000,
          unit: 'roll',
          unit_cost: 12054,
          total_cost: 12054000,
        },
      ],
    })

    assert.ok(po, 'PO should be created')
    assert.strictEqual(po.status, 'received')

    const mats = PrintFlowDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, companyId)
    const updated = mats.find((x) => x.id === multiRollMat.id)
    assert.ok(updated, 'Updated material should exist')

    const sizes = updated?.roll_sizes || (updated?.material_config as any)?.roll_sizes
    assert.ok(sizes, 'Roll sizes must exist')

    const size2_25 = sizes.find((s: any) => Math.abs((s.width_ft || s.width) - 2.25) < 0.05)
    const size10_5 = sizes.find((s: any) => Math.abs((s.width_ft || s.width) - 10.5) < 0.05)

    assert.ok(size2_25, '2.25ft size should exist')
    assert.ok(size10_5, '10.5ft size should exist')

    // 2.25ft MUST remain at 15 rolls (MUST NOT BE incremented to 1015!)
    assert.strictEqual(size2_25.quantity, 15, '2.25ft rolls must remain 15, NOT 1015')
    assert.strictEqual(size2_25.stock, 15, '2.25ft stock must remain 15')

    // 10.5ft MUST be incremented by 1000 rolls (from 100 to 1100)
    assert.strictEqual(size10_5.quantity, 1100, '10.5ft rolls must be incremented from 100 to 1100')
    assert.strictEqual(size10_5.stock, 1100, '10.5ft stock must be incremented from 100 to 1100')
    assert.strictEqual(size10_5.total_sft, 1100 * 10.5 * 164, '10.5ft total_sft must equal 1,894,200')
  })
})
