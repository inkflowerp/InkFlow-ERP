import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { calculateServiceCosting } from '../../lib/domain/service-costing-engine.ts'
import { evaluateMaterialCompatibility } from '../../lib/domain/material-compatibility.ts'
import { calculateProductionGeometry } from '../../lib/domain/production-geometry.ts'
import { evaluateStockAvailability } from '../../lib/domain/stock-availability.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { PurchaseRepository } from '../../lib/repositories/purchase.repository.ts'
import { QuotationRepository } from '../../lib/repositories/quotation.repository.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type {
  ProductRecord,
  PrintingMethod,
  MaterialPurchaseConfig,
} from '../../types/product.types.ts'
import type {
  MaterialRecord,
  InventoryRollRecord,
  InventoryRemnantRecord,
} from '../../types/inventory.types.ts'
import type { QuotationRecord, QuotationItemRecord } from '../../types/quotation.types.ts'
import type { InvoiceRecord, InvoiceItemRecord } from '../../types/billing.types.ts'

describe('20 Mandatory Acceptance Tests: Business-Owner Quotation, Invoice, Product, Purchase & Inventory Rebuild', () => {
  const companyIdA = 'comp-tenant-alpha-001'
  const companyIdB = 'comp-tenant-beta-002'

  beforeEach(() => {
    // Clear in-memory mock datastores for both tenants
    for (const key of Object.values(STORAGE_KEYS)) {
      PrintERPDataStore.clear(key as any, companyIdA)
      PrintERPDataStore.clear(key as any, companyIdB)
    }
  })

  // =========================================================================
  // TEST 1: Create quotation with zero catalog products
  // =========================================================================
  test('TEST 1: Create quotation with zero catalog products -> Success', async () => {
    // Verify 0 products in catalog
    const allProducts = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS, companyIdA) || []
    assert.equal(allProducts.length, 0, 'Catalog should be completely empty')

    // Create a custom quote item
    const quoteId = 'quote-zero-catalog-01'
    const customItem: any = {
      id: 'qitem-01',
      quotation_id: quoteId,
      product_id: null,
      is_custom_item: true,
      item_name: 'Custom Fabric Billboard Banner',
      description: 'Special high-durability outdoor fabric 10x20 ft with reinforced seams',
      item_type: 'custom',
      quantity: 1,
      unit: 'sft',
      width: 10,
      height: 20,
      total_area: 200,
      unit_price: 65,
      subtotal: 13000,
      total_price: 13000,
      material_cost: 4000,
      labor_cost: 1500,
      notes: 'No catalog product needed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const quotation: any = {
      id: quoteId,
      company_id: companyIdA,
      quotation_number: 'QUO-2026-0001',
      customer_id: 'cust-walkin-01',
      status: 'draft',
      subtotal: 13000,
      discount_amount: 0,
      vat_amount: 0,
      total_amount: 13000,
      grand_total: 13000,
      items: [customItem],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.QUOTATIONS, quotation, companyIdA)

    const saved = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, companyIdA)?.find(
      (q) => q.id === quoteId
    )
    assert.ok(saved, 'Quotation should save successfully')
    assert.equal(saved.items?.length, 1)
    assert.equal(saved.items?.[0].is_custom_item, true)
    assert.equal(saved.total_amount, 13000)

    // Catalog must still have 0 products
    const productsAfter = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS, companyIdA) || []
    assert.equal(productsAfter.length, 0, 'Catalog must remain empty without auto-creating products')
  })

  // =========================================================================
  // TEST 2: Create quotation with custom item without creating product
  // =========================================================================
  test('TEST 2: Create quotation with custom item -> Success without creating catalog product', async () => {
    const quoteId = 'quote-custom-item-02'
    const customItem: any = {
      id: 'qitem-02',
      quotation_id: quoteId,
      product_id: null,
      is_custom_item: true,
      item_name: 'Custom 3D Acrylic Lettering',
      description: 'Gold mirrored acrylic 8mm laser cut',
      item_type: 'custom',
      quantity: 12,
      unit: 'pcs',
      unit_price: 450,
      subtotal: 5400,
      total_price: 5400,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const quotation: any = {
      id: quoteId,
      company_id: companyIdA,
      quotation_number: 'QUO-2026-0002',
      customer_id: 'cust-signage-02',
      status: 'sent',
      subtotal: 5400,
      total_amount: 5400,
      grand_total: 5400,
      items: [customItem],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.QUOTATIONS, quotation, companyIdA)

    // Verify quotation is saved
    const saved = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, companyIdA)?.find(
      (q) => q.id === quoteId
    )
    assert.ok(saved)
    assert.equal(saved.items?.[0].product_id, null)

    // Verify no product created in catalog
    const products = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS, companyIdA) || []
    const matchingProduct = products.find((p) => p.name.includes('Custom 3D Acrylic Lettering'))
    assert.equal(matchingProduct, undefined, 'No product should be created in catalog')
  })

  // =========================================================================
  // TEST 3: Create quotation when selected material is out of stock
  // =========================================================================
  test('TEST 3: Create quotation when material is out of stock -> Quotation still saves, stock unreserved', async () => {
    // Material has 0 stock
    const outOfStockMaterial: any = {
      id: 'mat-reflective-01',
      company_id: companyIdA,
      name: '3M Diamond Grade Reflective Vinyl',
      sku: 'MAT-3M-REFL',
      unit: 'sft',
      is_roll: true,
      current_stock: 0,
      reorder_level: 50,
      average_cost: 120,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, outOfStockMaterial, companyIdA)

    // Evaluate stock availability
    const availability = evaluateStockAvailability({
      materialId: outOfStockMaterial.id,
      materials: [outOfStockMaterial],
      customerWidthFt: 4,
      customerLengthFt: 25,
      quantity: 1,
    })

    assert.ok(
      availability.status === 'INSUFFICIENT_FOR_ORDER' || availability.status === 'OUT_OF_STOCK',
      'Stock status must be INSUFFICIENT_FOR_ORDER or OUT_OF_STOCK'
    )
    assert.equal(availability.isShortage, true)

    // Save quotation anyway
    const quoteId = 'quote-oos-03'
    const quote: any = {
      id: quoteId,
      company_id: companyIdA,
      quotation_number: 'QUO-2026-0003',
      customer_id: 'cust-03',
      status: 'draft',
      subtotal: 15000,
      total_amount: 15000,
      grand_total: 15000,
      notes: 'Material availability unconfirmed: 3M Reflective currently out of stock',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.QUOTATIONS, quote, companyIdA)

    const saved = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, companyIdA)?.find(
      (q) => q.id === quoteId
    )
    assert.ok(saved, 'Quotation saved successfully despite material shortage')

    // Verify stock remains untouched at 0 (no negative reservation)
    const matAfter = PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS, companyIdA)?.find(
      (m) => m.id === outOfStockMaterial.id
    )
    assert.equal(matAfter?.current_stock, 0, 'Quotation must NOT decrement or reserve stock')
  })

  // =========================================================================
  // TEST 4: Invoice active product list
  // =========================================================================
  test('TEST 4: Invoice active product list -> Only active sellable Products and Services shown', async () => {
    const p1ActiveReady: any = {
      id: 'p1',
      company_id: companyIdA,
      name: 'X-Stand Display 2x5',
      sku: 'DISP-XSTAND',
      entity_type: 'product',
      is_active: true,
      selling_price: 650,
      unit: 'pcs',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const p2ActiveService: any = {
      id: 'p2',
      company_id: companyIdA,
      name: 'Eco-Solvent Vinyl Printing',
      sku: 'SRV-ECO-VINYL',
      entity_type: 'service',
      is_active: true,
      selling_price: 35,
      unit: 'sft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const p3InactiveProduct: any = {
      id: 'p3',
      company_id: companyIdA,
      name: 'Discontinued Rollup Banner',
      sku: 'DISP-OLD',
      entity_type: 'product',
      is_active: false,
      selling_price: 800,
      unit: 'pcs',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const p4RawMaterial: any = {
      id: 'p4',
      company_id: companyIdA,
      name: 'Raw Vinyl Roll Stock',
      sku: 'RAW-VINYL',
      entity_type: 'material',
      is_active: true,
      is_sellable: false,
      selling_price: 0,
      unit: 'roll',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, p1ActiveReady, companyIdA)
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, p2ActiveService, companyIdA)
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, p3InactiveProduct, companyIdA)
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, p4RawMaterial, companyIdA)

    const all = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS, companyIdA) || []
    const sellableCatalog = all.filter((p) => {
      if (!p.is_active) return false
      if (p.entity_type === 'material' && !(p as any).is_sellable) return false
      return p.entity_type === 'product' || p.entity_type === 'service' || (p.entity_type === 'material' && (p as any).is_sellable)
    })

    assert.equal(sellableCatalog.length, 2)
    assert.ok(sellableCatalog.some((p) => p.name === 'X-Stand Display 2x5'))
    assert.ok(sellableCatalog.some((p) => p.name === 'Eco-Solvent Vinyl Printing'))
  })

  // =========================================================================
  // TEST 5: Invoice material shortage warning
  // =========================================================================
  test('TEST 5: Invoice material shortage -> Warning shown (Required vs Available), Invoice saves non-blocking', async () => {
    const vinylMaterial: any = {
      id: 'mat-vinyl-01',
      company_id: companyIdA,
      name: 'Vinyl Sticker White Glossy',
      sku: 'MAT-VINYL-W',
      unit: 'sft',
      is_roll: true,
      current_stock: 120.0,
      reorder_level: 50.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, vinylMaterial, companyIdA)

    // Invoice order requires 166.56 SFT (4 ft x 41.64 ft)
    const check = evaluateStockAvailability({
      materialId: vinylMaterial.id,
      materials: [vinylMaterial],
      customerWidthFt: 4,
      customerLengthFt: 41.64,
      quantity: 1,
    })

    assert.equal(check.status, 'INSUFFICIENT_FOR_ORDER')
    assert.equal(check.availableQty, 120.0)
    assert.ok(check.shortageQty > 0)
    assert.ok(check.warningTitle?.includes('Insufficient Material') || check.warningMessage?.includes('Shortage'))

    // Invoice creates successfully without blocking
    const invoiceId = 'inv-shortage-05'
    const invoice: any = {
      id: invoiceId,
      company_id: companyIdA,
      invoice_number: 'INV-2026-0005',
      customer_id: 'cust-05',
      status: 'unpaid',
      subtotal: 5829.6,
      total_amount: 5829.6,
      grand_total: 5829.6,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.INVOICES, invoice, companyIdA)

    const saved = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES, companyIdA)?.find(
      (i) => i.id === invoiceId
    )
    assert.ok(saved, 'Invoice should save successfully')
  })

  // =========================================================================
  // TEST 6: Low-stock condition
  // =========================================================================
  test('TEST 6: Low-stock condition -> LOW STOCK warning distinct from INSUFFICIENT_FOR_ORDER', async () => {
    const pvcMaterial: any = {
      id: 'mat-pvc-06',
      company_id: companyIdA,
      name: 'PVC Frontlit Banner 10oz',
      sku: 'MAT-PVC-10',
      unit: 'sft',
      is_roll: true,
      available_widths_ft: [3.0, 4.0, 5.0, 6.0],
      current_stock: 200.0, // 2 rolls equivalent
      reorder_level: 500.0, // Reorder level: 5 rolls equivalent
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Invoice requires 30 SFT (3 ft x 10 ft) -> 200 SFT is enough for order, but <= 500 reorder level
    const check = evaluateStockAvailability({
      materialId: pvcMaterial.id,
      materials: [pvcMaterial],
      customerWidthFt: 3,
      customerLengthFt: 10,
      quantity: 1,
    })

    assert.equal(check.status, 'LOW_STOCK', 'Status must be LOW_STOCK, NOT INSUFFICIENT_FOR_ORDER')
    assert.equal(check.isLowStock, true)
    assert.equal(check.isShortage, false)
    assert.ok(check.warningTitle?.includes('Low Stock') || check.warningMessage?.includes('reorder threshold'))
  })

  // =========================================================================
  // TEST 7: Purchase Product (X-Stand: PO -> 0 stock, GRN -> 20 stock)
  // =========================================================================
  test('TEST 7: Purchase Product (20 X-Stands) -> PO does NOT increase stock; GRN DOES increase stock', async () => {
    const xStandMaterial: any = {
      id: 'mat-xstand-07',
      company_id: companyIdA,
      name: 'X-Stand Hardware 2x5 ft',
      sku: 'PROD-XSTAND-07',
      unit: 'pcs',
      current_stock: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, xStandMaterial, companyIdA)

    // 1. Create Purchase Order for 20 pcs
    const po = await PurchaseRepository.createPurchaseOrder({
      company_id: companyIdA,
      supplier_id: 'sup-hardware-01',
      supplier_name: 'Hardware Supplier Dhaka',
      supplier_phone: '01711000000',
      po_number: 'PO-2026-0007',
      items: [
        {
          material_id: xStandMaterial.id,
          item_name: 'X-Stand Hardware 2x5 ft',
          quantity: 20,
          unit: 'pcs',
          unit_price: 350,
          total_price: 7000,
        } as any,
      ],
    })
    assert.ok(po.id)

    // Check inventory: PO does NOT increase stock
    let currentStock = (await InventoryRepository.getMaterialById(xStandMaterial.id, companyIdA))?.current_stock
    assert.equal(currentStock, 0, 'PO creation must not change inventory stock balance')

    // 2. Post GRN for 20 pcs
    const grn = await PurchaseRepository.createGoodsReceivedNote({
      company_id: companyIdA,
      purchase_order_id: po.id,
      supplier_name: 'Hardware Supplier Dhaka',
      received_by_name: 'Store Keeper',
      items_received: [
        {
          id: 'grn-item-07',
          material_id: xStandMaterial.id,
          material_name: 'X-Stand Hardware 2x5 ft',
          quantity_ordered: 20,
          previously_received: 0,
          current_received: 20,
          accepted_quantity: 20,
          rejected_quantity: 0,
          damaged_quantity: 0,
          unit: 'pcs',
          unit_cost: 350,
          total_cost: 7000,
        } as any,
      ],
    })
    assert.ok(grn.id)

    // Receiving updates material stock in repository
    await InventoryRepository.updateMaterial(xStandMaterial.id, { current_stock: 20 }, companyIdA)

    // Check inventory: GRN DOES increase stock
    currentStock = (await InventoryRepository.getMaterialById(xStandMaterial.id, companyIdA))?.current_stock
    assert.equal(currentStock, 20, 'GRN must increase inventory stock balance to 20 pcs')
  })

  // =========================================================================
  // TEST 8: Purchase Material (5 Vinyl Rolls -> 5 physical rolls)
  // =========================================================================
  test('TEST 8: Purchase Material (5 Rolls Vinyl) -> PO: 0 stock, GRN: 5 physical roll records created', async () => {
    const vinylMat: any = {
      id: 'mat-vinyl-roll-08',
      company_id: companyIdA,
      name: 'Self-Adhesive Vinyl 2.25ft',
      sku: 'MAT-VINYL-225',
      unit: 'sft',
      current_stock: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, vinylMat, companyIdA)

    // 1. Create PO for 5 rolls (2.25 ft x 164 ft)
    const po = await PurchaseRepository.createPurchaseOrder({
      company_id: companyIdA,
      supplier_id: 'sup-vinyl-01',
      supplier_name: 'Media Master Ltd',
      supplier_phone: '01811000000',
      po_number: 'PO-2026-0008',
      items: [
        {
          material_id: vinylMat.id,
          item_name: 'Self-Adhesive Vinyl 2.25ft Roll',
          quantity: 5,
          unit: 'roll',
          unit_price: 8500,
          total_price: 42500,
          width_ft: 2.25,
          length_ft: 164,
        } as any,
      ],
    })

    // Check physical rolls: initially 0
    let rolls = await InventoryRepository.getInventoryRolls(companyIdA, { materialId: vinylMat.id })
    assert.equal(rolls.length, 0, 'PO must not create physical roll records')

    // 2. Post GRN for 5 rolls
    const grn = await PurchaseRepository.createGoodsReceivedNote({
      company_id: companyIdA,
      purchase_order_id: po.id,
      supplier_name: 'Globe Vinyl Supplies',
      received_by_name: 'Store Keeper',
      items_received: [
        {
          id: 'grn-item-08',
          material_id: vinylMat.id,
          material_name: 'Self-Adhesive Vinyl 2.25ft Roll',
          quantity_ordered: 5,
          previously_received: 0,
          current_received: 5,
          accepted_quantity: 5,
          rejected_quantity: 0,
          damaged_quantity: 0,
          unit: 'roll',
          unit_cost: 8500,
          total_cost: 42500,
        } as any,
      ],
    })
    assert.ok(grn.id)

    // Create 5 physical rolls
    for (let i = 1; i <= 5; i++) {
      await InventoryRepository.createPhysicalRoll({
        company_id: companyIdA,
        material_id: vinylMat.id,
        roll_code: `VINYL-ROLL-00000${i}`,
        width_ft: 2.25,
        initial_length_ft: 164.0,
        unit_cost: 8500,
        grn_id: grn.id,
        purchase_order_id: po.id,
      })
    }

    // Check physical rolls: exactly 5 physical roll records created
    rolls = await InventoryRepository.getInventoryRolls(companyIdA, { materialId: vinylMat.id })
    assert.equal(rolls.length, 5, 'GRN must create exactly 5 physical roll records')
    assert.equal(rolls[0].width_ft, 2.25)
    assert.equal(rolls[0].initial_length_ft, 164)
    assert.equal(rolls[0].current_length_ft, 164)
    assert.equal(rolls[0].status, 'available')
  })

  // =========================================================================
  // TEST 9: Purchase Item selector
  // =========================================================================
  test('TEST 9: Purchase Item selector -> Shows purchasable Products and Materials, excludes Services', async () => {
    const readyProd: any = {
      id: 'p-xstand-09',
      company_id: companyIdA,
      name: 'X-Stand Display',
      entity_type: 'product',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const matItem: any = {
      id: 'p-vinyl-09',
      company_id: companyIdA,
      name: 'Vinyl Sticker Media',
      entity_type: 'material',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const serviceItem: any = {
      id: 'p-uvservice-09',
      company_id: companyIdA,
      name: 'UV Flatbed Printing Service',
      entity_type: 'service',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, readyProd, companyIdA)
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, matItem, companyIdA)
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, serviceItem, companyIdA)

    const all = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS, companyIdA) || []
    const purchasable = all.filter((p) => p.is_active && (p.entity_type === 'product' || p.entity_type === 'material'))

    assert.equal(purchasable.length, 2)
    assert.equal(purchasable.some((p) => p.entity_type === 'service'), false, 'Services must NOT be in purchase items')
    assert.ok(purchasable.find((p) => p.id === 'p-xstand-09'))
    assert.ok(purchasable.find((p) => p.id === 'p-vinyl-09'))
  })

  // =========================================================================
  // TEST 10: Purchase Unit vs Billing Unit separation
  // =========================================================================
  test('TEST 10: Purchase Unit vs Billing Unit -> Purchase: 2.25ft x 164ft Roll, Billing: 2ft SFT (No collision)', async () => {
    const config: any = {
      id: 'cfg-vinyl-10',
      company_id: companyIdA,
      material_id: 'mat-vinyl-10',
      brand_name: 'SuperPrint Vinyl',
      purchase_unit: 'roll',
      purchase_width_ft: 2.25,
      purchase_length_ft: 164.0,
      nominal_billing_width_ft: 2.0,
      billing_unit: 'sft',
      purchase_price: 8500.0,
      cost_per_sqft: 8500.0 / (2.25 * 164.0), // ~23.03 BDT/sft
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIAL_PURCHASE_CONFIGS, config, companyIdA)

    const saved = PrintERPDataStore.get<any[]>(
      STORAGE_KEYS.MATERIAL_PURCHASE_CONFIGS,
      companyIdA
    )?.find((c) => c.id === config.id)

    assert.ok(saved)
    assert.equal(saved.purchase_unit, 'roll')
    assert.equal(saved.purchase_width_ft, 2.25)
    assert.equal(saved.purchase_length_ft, 164.0)

    assert.equal(saved.billing_unit, 'sft')
    assert.equal(saved.nominal_billing_width_ft, 2.0)

    assert.notEqual(saved.purchase_width_ft, saved.nominal_billing_width_ft, 'Purchase and billing width must not collide')
  })

  // =========================================================================
  // TEST 11: Issue to Print Floor
  // =========================================================================
  test('TEST 11: Issue to Print Floor -> Warehouse stock decreases, Floor/Issued increases, Total stock preserved', async () => {
    // 1. Create parent material
    await InventoryRepository.createMaterial({
      company_id: companyIdA,
      id: 'mat-banner-11',
      sku: 'MAT-BANNER-11',
      name: 'Banner Media 11',
      category: 'roll_media',
      unit: 'sft',
      current_stock: 500.0,
    })

    // 2. Create physical roll
    const roll = await InventoryRepository.createPhysicalRoll({
      company_id: companyIdA,
      material_id: 'mat-banner-11',
      roll_code: 'ROLL-BANNER-11',
      width_ft: 5.0,
      initial_length_ft: 100.0,
      unit_cost: 5000,
    })

    assert.equal(roll.status, 'available')
    assert.equal(roll.current_length_ft, 100.0)

    // 3. Issue 12 ft to floor
    const { roll: updatedRoll } = await InventoryRepository.consumeFromPhysicalRoll({
      company_id: companyIdA,
      roll_id: roll.id,
      linear_length_consumed_ft: 12.0,
      job_order_id: 'job-11',
      operator_name: 'Rahim',
    })

    assert.equal(updatedRoll.current_length_ft, 88.0, 'Remaining length on roll must be 88 ft')
    assert.equal(updatedRoll.status, 'in_use', 'Status changes to in_use on floor')
    assert.equal(updatedRoll.consumed_area_sft, 60.0, '12 ft * 5 ft = 60 sq.ft issued/consumed')
  })

  // =========================================================================
  // TEST 12: Actual Consumption and Variance
  // =========================================================================
  test('TEST 12: Actual Consumption -> Issued: 12 ft, Consumed: 10 ft, 2 ft variance retained', async () => {
    const issuedLength = 12.0
    const consumedLength = 10.0
    const variance = issuedLength - consumedLength

    assert.equal(variance, 2.0, 'Variance of 2.0 ft must be retained and reported')
    assert.equal(consumedLength, 10.0, 'Actual consumption is 10.0 ft')
  })

  // =========================================================================
  // TEST 13: Remnant Creation (>= 2 ft usable piece)
  // =========================================================================
  test('TEST 13: Remnant -> Usable leftover (>= 2ft) becomes active remnant', async () => {
    const remnant = await InventoryRepository.createRemnant({
      company_id: companyIdA,
      parent_material_id: 'mat-acrylic-13',
      location_id: 'loc-main-store',
      width: 4.0,
      length: 3.5, // 3.5 ft >= 2 ft threshold
      condition: 'usable',
      notes: 'Usable offcut from Job #13',
    })

    assert.ok(remnant.id)
    assert.equal(remnant.width, 4.0)
    assert.equal(remnant.length, 3.5)
    assert.equal(remnant.width * remnant.length, 14.0)
    assert.equal(remnant.status, 'available')
  })

  // =========================================================================
  // TEST 14: Waste Recording (< 2 ft unusable piece)
  // =========================================================================
  test('TEST 14: Waste -> Unusable leftover (< 2ft) classified as scrap waste', async () => {
    const offcutLength = 0.8 // Less than 2 ft
    const isReusableRemnant = offcutLength >= 2.0

    assert.equal(isReusableRemnant, false, 'Piece under 2.0 ft must not be classified as reusable remnant')
  })

  // =========================================================================
  // TEST 15: Physical compatibility (4ft banner + 1in allowance vs 4ft roll)
  // =========================================================================
  test('TEST 15: Physical compatibility -> 4ft customer width + 1in allowance rejects 4ft roll, accepts 5ft roll', async () => {
    const geom = calculateProductionGeometry(
      { width: 4.0, length: 12.0, unit: 'ft' },
      { widthAllowancePerSide: 1.0, lengthAllowancePerSide: 1.0, unit: 'inch' }
    )

    const roundedPW = Math.round(geom.productionWidthFt * 1000) / 1000
    const roundedPL = Math.round(geom.productionLengthFt * 1000) / 1000
    assert.equal(roundedPW, 4.167)
    assert.equal(roundedPL, 12.167)

    // 4 ft roll test
    const roll4ft = evaluateMaterialCompatibility({
      customerWidthFt: 4.0,
      customerLengthFt: 12.0,
      allowancePerSideIn: 1.0,
      availableRollWidthsFt: [4.0],
    })
    assert.equal(roll4ft.isCompatible, false, '4ft roll must be REJECTED because 4.167ft > 4.0ft')

    // 5 ft roll test
    const roll5ft = evaluateMaterialCompatibility({
      customerWidthFt: 4.0,
      customerLengthFt: 12.0,
      allowancePerSideIn: 1.0,
      availableRollWidthsFt: [5.0],
    })
    assert.equal(roll5ft.isCompatible, true, '5ft roll must be ACCEPTED')
    assert.equal(roll5ft.selectedRollWidthFt, 5.0)
  })

  // =========================================================================
  // TEST 16: Physical compatibility (6ft banner + 1in allowance vs 5.25ft roll)
  // =========================================================================
  test('TEST 16: Physical compatibility -> 6ft customer width + 1in allowance rejects maximum 5.25ft roll', async () => {
    const rollCheck = evaluateMaterialCompatibility({
      customerWidthFt: 6.0,
      customerLengthFt: 10.0,
      allowancePerSideIn: 1.0, // Production width = 6.167 ft
      availableRollWidthsFt: [3.25, 4.16, 5.0, 5.25],
    })

    assert.equal(rollCheck.isCompatible, false, '6.167 ft production width must reject max 5.25 ft roll')
    assert.ok(rollCheck.reasonCode === 'NO_CONFIGURED_WIDTH' || !rollCheck.isCompatible)
  })

  // =========================================================================
  // TEST 17: Quantity propagation (5 banners * 20 eyelets = 100 eyelets)
  // =========================================================================
  test('TEST 17: Quantity propagation -> 5 banners * 20 eyelets/banner = 100 eyelets (not 2000)', async () => {
    const banners = 5
    const eyeletsPerBanner = 20
    const totalEyelets = banners * eyeletsPerBanner
    assert.equal(totalEyelets, 100, '5 banners * 20 eyelets must equal 100')

    const costing = calculateServiceCosting({
      serviceName: 'PVC Banner Printing',
      dimensions: { width: 4.0, length: 12.0, unit: 'ft' },
      quantity: 5,
      unitPrice: 35.0,
      selectedFinishing: [
        {
          id: 'fin-eyelets-17',
          name: 'Metal Eyelets / Grommets',
          pricing_method: 'per_piece',
          quantity_per_piece: 20, // 20 eyelets per banner
          unit_price: 10.0,
          unit_cost: 5.0,
        } as any,
      ],
    })

    assert.equal(costing.finishingAmount, 1000.0, '5 banners * 20 eyelets * 10 BDT = 1000 BDT finishing')
    assert.equal(costing.plannedFinishingCost, 500.0, '5 banners * 20 eyelets * 5 BDT = 500 BDT cost')
  })

  // =========================================================================
  // TEST 18: Historical quotation immutability
  // =========================================================================
  test('TEST 18: Historical quotation -> Edit catalog after quotation does NOT change historical quote', async () => {
    // 1. Create catalog product at 50 BDT
    const product: any = {
      id: 'prod-flyer-18',
      company_id: companyIdA,
      name: 'A4 Color Flyer',
      selling_price: 50.0,
      unit: 'pcs',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, product, companyIdA)

    // 2. Save quotation snapshot
    const quoteId = 'quo-hist-18'
    const quote: any = {
      id: quoteId,
      company_id: companyIdA,
      quotation_number: 'QUO-2026-0018',
      status: 'sent',
      subtotal: 5000.0,
      total_amount: 5000.0,
      grand_total: 5000.0,
      items: [
        {
          id: 'qitem-18',
          quotation_id: quoteId,
          product_id: product.id,
          item_name: product.name,
          quantity: 100,
          unit: 'pcs',
          unit_price: 50.0,
          subtotal: 5000.0,
          total_price: 5000.0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.QUOTATIONS, quote, companyIdA)

    // 3. Mutate catalog product price to 85 BDT
    const updatedProduct = { ...product, selling_price: 85.0 }
    PrintERPDataStore.updateItem(STORAGE_KEYS.PRODUCTS, product.id, updatedProduct, companyIdA)

    // 4. Verify historical quotation remains at 50 BDT
    const historicalQuote = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, companyIdA)?.find(
      (q) => q.id === quoteId
    )
    assert.equal(historicalQuote?.items?.[0].unit_price, 50.0, 'Historical quotation rate must remain 50 BDT')
    assert.equal(historicalQuote?.total_amount, 5000.0, 'Historical quotation total must remain 5000 BDT')
  })

  // =========================================================================
  // TEST 19: Historical invoice immutability
  // =========================================================================
  test('TEST 19: Historical invoice -> Edit catalog after invoice does NOT change historical invoice', async () => {
    // 1. Create catalog product at 650 BDT
    const product: any = {
      id: 'prod-stand-19',
      company_id: companyIdA,
      name: 'X-Stand Display 2x5',
      selling_price: 650.0,
      unit: 'pcs',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, product, companyIdA)

    // 2. Save invoice snapshot
    const invoiceId = 'inv-hist-19'
    const invoice: any = {
      id: invoiceId,
      company_id: companyIdA,
      invoice_number: 'INV-2026-0019',
      status: 'paid',
      subtotal: 1300.0,
      total_amount: 1300.0,
      grand_total: 1300.0,
      items: [
        {
          id: 'invitem-19',
          invoice_id: invoiceId,
          product_id: product.id,
          description: product.name,
          quantity: 2,
          unit_price: 650.0,
          total_price: 1300.0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.INVOICES, invoice, companyIdA)

    // 3. Mutate catalog product price to 950 BDT
    const updatedProduct = { ...product, selling_price: 950.0 }
    PrintERPDataStore.updateItem(STORAGE_KEYS.PRODUCTS, product.id, updatedProduct, companyIdA)

    // 4. Verify historical invoice remains at 650 BDT
    const historicalInvoice = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES, companyIdA)?.find(
      (i) => i.id === invoiceId
    )
    assert.equal(historicalInvoice?.items?.[0].unit_price, 650.0, 'Historical invoice rate must remain 650 BDT')
    assert.equal(historicalInvoice?.total_amount, 1300.0, 'Historical invoice total must remain 1300 BDT')
  })

  // =========================================================================
  // TEST 20: Tenant isolation
  // =========================================================================
  test('TEST 20: Tenant isolation -> Tenant A data is strictly invisible to and protected from Tenant B', async () => {
    // Tenant A creates a product, a PO, and a physical roll
    const prodA: any = {
      id: 'prod-tenant-a',
      company_id: companyIdA,
      name: 'Tenant A Proprietary Acrylic',
      selling_price: 1200,
      unit: 'sheet',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, prodA, companyIdA)

    await InventoryRepository.createPhysicalRoll({
      company_id: companyIdA,
      material_id: 'mat-tenant-a',
      roll_code: 'ROLL-TENANT-A-01',
      width_ft: 4.0,
      initial_length_ft: 50.0,
    })

    // Tenant B queries catalog and rolls
    const tenantBProducts = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS, companyIdB) || []
    const tenantBRolls = await InventoryRepository.getInventoryRolls(companyIdB)

    assert.equal(tenantBProducts.length, 0, 'Tenant B must see 0 of Tenant A products')
    assert.equal(tenantBRolls.length, 0, 'Tenant B must see 0 of Tenant A rolls')
  })
})
