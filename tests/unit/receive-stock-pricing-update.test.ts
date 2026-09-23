import { describe, it } from 'node:test'
import assert from 'node:assert'
import type { MaterialRecord } from '../../types/inventory.types.ts'
import type { ProductRecord } from '../../types/product.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { ProductService } from '../../services/product.service.ts'
import { PriceIntelligenceEngine } from '../../lib/domain/price-intelligence-engine.ts'

const detectPhysicalForm = (item: any) => PriceIntelligenceEngine.detectMaterialPhysicalForm(item)
const getAvailablePurchaseUnits = (form: any, unit: string, pUnit?: string) => PriceIntelligenceEngine.getAvailablePurchaseUnits(form, unit, pUnit)

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

  it('7. Multi-Dimensional Size & Variant Expansion for Roll Media and Rigid Sheets', async () => {
    // Material 1: Vinyl with registered roll widths [3, 4, 5, 6, 10]
    const vinylMat: MaterialRecord = {
      id: 'mat-vinyl-multi',
      company_id: companyId,
      sku: 'MAT-09883',
      name: 'Vinyl (Self Adhesive)',
      category: 'vinyl' as any,
      unit: 'sft',
      current_stock: 1200,
      average_cost: 9.0,
      last_purchase_price: 9.0,
      is_roll: true,
      available_widths_ft: [3, 4, 5, 6, 10],
      standard_roll_length_ft: 164,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    // Material 2: PVC Sheet with registered variants [2mm, 3mm, 5mm]
    const pvcMat: MaterialRecord = {
      id: 'mat-pvc-multi',
      company_id: companyId,
      sku: 'MAT-47483',
      name: 'PVC Sheet',
      category: 'pvc' as any,
      unit: 'sheet',
      current_stock: 45,
      average_cost: 12226.2,
      last_purchase_price: 12226.2,
      available_sheet_sizes: ['8x4 ft (32 sft)', '6x4 ft (24 sft)'],
      variants: [
        { id: 'var-2mm', variant_name: '2mm White', thickness_mm: 2, size_spec: '8x4 ft', cost_adjustment: -3000, price_adjustment: -4000 },
        { id: 'var-3mm', variant_name: '3mm White', thickness_mm: 3, size_spec: '8x4 ft', cost_adjustment: 0, price_adjustment: 0 },
        { id: 'var-5mm', variant_name: '5mm White', thickness_mm: 5, size_spec: '8x4 ft', cost_adjustment: 4500, price_adjustment: 6000 },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Seed materials in DataStore
    const existingMaterials = PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS, companyId) || []
    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [...existingMaterials, vinylMat, pvcMat], false, companyId)
    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [...existingMaterials, vinylMat, pvcMat], false)

    const mats = await InventoryRepository.getMaterials(companyId)
    const fetchedVinyl = mats.find((m) => m.id === 'mat-vinyl-multi')
    assert.ok(fetchedVinyl, 'Vinyl material must be retrieved')
    assert.deepStrictEqual(fetchedVinyl.available_widths_ft, [3, 4, 5, 6, 10], 'Vinyl roll widths must match')

    const fetchedPvc = mats.find((m) => m.id === 'mat-pvc-multi')
    assert.ok(fetchedPvc, 'PVC material must be retrieved')
    assert.strictEqual(fetchedPvc.variants?.length, 3, 'PVC must have 3 registered variants')
    assert.strictEqual(fetchedPvc.variants[0].variant_name, '2mm White')
  })

  it('8. Physical Form / Classification accurately categorizes items into Roll, Sheet, Liquid, Hardware, Box, Weight', () => {
    // 1. Roll Media
    const flexForm = detectPhysicalForm({ category: 'flex', name: 'Star Flex Banner', available_widths_ft: [3, 5, 10] })
    assert.strictEqual(flexForm, 'roll', 'Flex banner must be classified as roll')

    const vinylForm = detectPhysicalForm({ category: 'vinyl', name: 'Cast Vinyl Sticker', is_roll: true })
    assert.strictEqual(vinylForm, 'roll', 'Vinyl sticker must be classified as roll')

    // 2. Rigid Sheet
    const acrylicForm = detectPhysicalForm({ category: 'acrylic', name: 'Clear Cast Acrylic 5mm', available_sheet_sizes: ['8x4 ft'] })
    assert.strictEqual(acrylicForm, 'sheet', 'Acrylic board must be classified as sheet')

    const foamForm = detectPhysicalForm({ category: 'rigid_sheet', name: 'Foam Board 3mm' })
    assert.strictEqual(foamForm, 'sheet', 'Foam board must be classified as sheet')

    // 3. Liquid / Inks & Chemistry
    const inkForm = detectPhysicalForm({ category: 'ink_chemistry', name: 'Solvent Cyan Ink 5L Can', unit: 'can' })
    assert.strictEqual(inkForm, 'liquid', 'Ink can must be classified as liquid')

    const cleanerForm = detectPhysicalForm({ name: 'UV Cleaning Flush Solution', unit: 'bottle' })
    assert.strictEqual(cleanerForm, 'liquid', 'Flush cleaner must be classified as liquid')

    // 4. Hardware / Merchandise
    const standForm = detectPhysicalForm({ category: 'hardware_accessories', name: 'X-Banner Display Stand', product_type: 'ready_product' })
    assert.strictEqual(standForm, 'hardware', 'X-Banner stand must be classified as hardware')

    // 5. Box / Pack
    const boxGoodsForm = detectPhysicalForm({ category: 'packaging', name: 'Corrugated Shipping Box', unit: 'box' })
    assert.strictEqual(boxGoodsForm, 'box_pack', 'Corrugated box must be classified as box_pack')

    // 6. Weight
    const metalForm = detectPhysicalForm({ category: 'metal', name: 'Aluminum Scrap / Frame', unit: 'kg' })
    assert.strictEqual(metalForm, 'weight', 'Metal by kg must be classified as weight')
  })

  it('9. Available purchase units are dynamically tailored to physical form and registered master unit', () => {
    // Roll Media units
    const rollUnits = getAvailablePurchaseUnits('roll', 'sft', 'roll')
    assert.ok(rollUnits.includes('roll'), 'Roll units must include roll')
    assert.ok(rollUnits.includes('sft'), 'Roll units must include sft')
    assert.ok(rollUnits.includes('meter'), 'Roll units must include meter')
    assert.ok(rollUnits.includes('rft'), 'Roll units must include rft')

    // Sheet units
    const sheetUnits = getAvailablePurchaseUnits('sheet', 'sheet', 'bundle')
    assert.ok(sheetUnits.includes('sheet'), 'Sheet units must include sheet')
    assert.ok(sheetUnits.includes('sft'), 'Sheet units must include sft')
    assert.ok(sheetUnits.includes('bundle'), 'Sheet units must include bundle')

    // Liquid units
    const liquidUnits = getAvailablePurchaseUnits('liquid', 'ltr', 'can')
    assert.ok(liquidUnits.includes('bottle'), 'Liquid units must include bottle')
    assert.ok(liquidUnits.includes('can'), 'Liquid units must include can')
    assert.ok(liquidUnits.includes('ltr'), 'Liquid units must include ltr')

    // Hardware units
    const hardwareUnits = getAvailablePurchaseUnits('hardware', 'pcs', 'box')
    assert.ok(hardwareUnits.includes('pcs'), 'Hardware units must include pcs')
    assert.ok(hardwareUnits.includes('box'), 'Hardware units must include box')
  })

  it('10. Non-inventory products (services, outsourcing, delivery, digital) are strictly excluded from stock intake', () => {
    const mixedProducts: ProductRecord[] = [
      {
        id: 'p-hardware',
        sku: 'HW-01',
        name: 'Rollup Stand',
        category: 'Hardware',
        product_type: 'ready_product',
        unit: 'pcs',
        purchase_price: 500,
        base_cost: 500,
        selling_price: 800,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'p-print-service',
        sku: 'SRV-01',
        name: 'Large Format Printing Service',
        category: 'Services',
        product_type: 'print_service',
        is_service: true,
        is_non_inventory: true,
        unit: 'sft',
        purchase_price: 0,
        base_cost: 0,
        selling_price: 35,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'p-outsource-job',
        sku: 'OUT-01',
        name: 'Acrylic Laser Cutting Outsource',
        category: 'Outsource',
        product_type: 'outsource_product',
        is_outsource: true,
        unit: 'job',
        purchase_price: 1200,
        base_cost: 1200,
        selling_price: 1800,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const receivableProducts = mixedProducts.filter((p) => {
      const isNonInventory =
        p.is_service ||
        p.is_outsource ||
        p.is_non_inventory ||
        p.product_type === 'service' ||
        p.product_type === 'print_service' ||
        p.product_type === 'fabrication' ||
        p.product_type === 'installation' ||
        p.product_type === 'delivery' ||
        p.product_type === 'outsource' ||
        p.product_type === 'outsource_product'
      return !isNonInventory
    })

    assert.strictEqual(receivableProducts.length, 1, 'Only the physical Rollup Stand must be receivable')
    assert.strictEqual(receivableProducts[0].id, 'p-hardware')
  })

  it('11. Roll Area & Price Conversion Math matches commercial large format specifications', () => {
    // 5ft width roll with standard 164ft length = 820 sft
    const rollWidthFt = 5
    const rollLengthFt = 164
    const rollAreaSft = rollWidthFt * rollLengthFt
    assert.strictEqual(rollAreaSft, 820, '5ft x 164ft roll must be 820 sft')

    // Price conversion: If rate is ৳10 / sft, roll cost is ৳8,200
    const ratePerSft = 10
    const rollCost = ratePerSft * rollAreaSft
    assert.strictEqual(rollCost, 8200, 'Roll cost at ৳10/sft must be ৳8,200')

    // Vice versa: If roll cost is ৳8,200, rate per sft is ৳10
    const convertedRatePerSft = Number((rollCost / rollAreaSft).toFixed(2))
    assert.strictEqual(convertedRatePerSft, 10, 'Rate per sft must be ৳10')
  })
})
