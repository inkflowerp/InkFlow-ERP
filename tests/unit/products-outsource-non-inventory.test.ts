import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import {
  isServiceProduct,
  isReadyProduct,
  isMaterialProduct,
  isOutsourceProduct,
  getProductEntityKind,
  getProductEntityKindLabel,
  calculateGrossMargin,
  calculateSuggestedSellingPrice,
} from '../../lib/units.ts'
import { ProductService } from '../../services/product.service.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Unit: Outsource Products & Subcontract Services (Non-Inventory Items)', () => {
  const companyId = 'tenant-outsource-test-01'
  const otherCompanyId = 'tenant-outsource-other-02'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_HISTORY, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_VARIANTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_FORMULAS, [])
  })

  it('1. Correctly classifies Outsource Product (Offset Brochure) as Outsource (Non-Inventory)', async () => {
    const outsourceData = {
      name: 'Offset 4-Color Brochure 150gsm (1000 Pcs)',
      name_bn: 'অফসেট ব্রোশিউর প্রিন্টিং',
      sku: 'OUT-BROCHURE-1000',
      category: 'offset_printing',
      product_type: 'outsource' as const,
      entity_type: 'outsource' as const,
      commercial_type: 'outsource' as const,
      is_outsource: true,
      is_non_inventory: true,
      track_inventory: false,
      requires_production: false,
      unit: 'pcs',
      selling_unit: 'pcs',
      purchase_unit: 'job',
      purchase_price: 3500,
      base_cost: 3500,
      selling_price: 5200,
      vendor_name: 'Fakrul Offset & Packaging Ltd',
      vendor_phone: '+8801711002233',
      vendor_address: 'Arambagh Printing Hub, Dhaka',
      vendor_item_code: 'FOP-BR-150',
      turnaround_days: 4,
      outsource_notes: '150gsm Art Paper with Gloss Aqueous Coating',
      outsource_config: {
        vendor_name: 'Fakrul Offset & Packaging Ltd',
        vendor_phone: '+8801711002233',
        vendor_address: 'Arambagh Printing Hub, Dhaka',
        vendor_item_code: 'FOP-BR-150',
        turnaround_days: 4,
        vendor_cost: 3500,
        vendor_notes: '150gsm Art Paper with Gloss Aqueous Coating',
        price_tiers: {
          retail: 5200,
          corporate: 4800,
          dealer: 4500,
          wholesale: 4200,
          custom: 0,
        },
      },
    }

    assert.strictEqual(isOutsourceProduct(outsourceData), true, 'isOutsourceProduct must be true')
    assert.strictEqual(isReadyProduct(outsourceData), false, 'isReadyProduct must be false')
    assert.strictEqual(isMaterialProduct(outsourceData), false, 'isMaterialProduct must be false')
    assert.strictEqual(isServiceProduct(outsourceData), false, 'isServiceProduct must be false')
    assert.strictEqual(getProductEntityKind(outsourceData), 'outsource')
    assert.strictEqual(getProductEntityKindLabel(outsourceData), 'Outsource (Non-Inventory)')

    const created = await ProductService.createProduct({
      ...outsourceData,
      company_id: companyId,
    })

    assert.strictEqual(created.entity_type, 'outsource')
    assert.strictEqual(created.is_outsource, true)
    assert.strictEqual(created.is_non_inventory, true)
    assert.strictEqual(created.track_inventory, false)
    assert.strictEqual(created.vendor_name, 'Fakrul Offset & Packaging Ltd')
    assert.strictEqual(created.turnaround_days, 4)
    assert.strictEqual(getProductEntityKindLabel(created), 'Outsource (Non-Inventory)')
  })

  it('2. Correctly classifies Neon Sign Outsource item with custom category and vendor lead time', async () => {
    const neonSignData = {
      name: 'Custom Neon Flex Signage (Acrylic Base)',
      name_bn: 'কাস্টম নিয়ন সাইনবোর্ড',
      sku: 'OUT-NEON-FLEX',
      category: 'neon_sign',
      product_type: 'outsource' as const,
      entity_type: 'outsource' as const,
      is_outsource: true,
      is_non_inventory: true,
      track_inventory: false,
      unit: 'sft',
      selling_unit: 'sft',
      purchase_unit: 'sft',
      base_cost: 450,
      selling_price: 850,
      vendor_name: 'Bright Light Neon Subcontract',
      vendor_phone: '+8801912345678',
      turnaround_days: 5,
      price_tiers: {
        retail: 850,
        corporate: 780,
        dealer: 720,
        wholesale: 680,
        custom: 0,
      },
    }

    assert.strictEqual(isOutsourceProduct(neonSignData), true)
    assert.strictEqual(getProductEntityKindLabel(neonSignData), 'Outsource (Non-Inventory)')

    const created = await ProductService.createProduct({
      ...neonSignData,
      company_id: companyId,
    })

    assert.strictEqual(created.sku, 'OUT-NEON-FLEX')
    assert.strictEqual(created.is_outsource, true)
    assert.strictEqual(created.is_non_inventory, true)
    assert.strictEqual(created.turnaround_days, 5)
    assert.strictEqual(created.vendor_name, 'Bright Light Neon Subcontract')
  })

  it('3. Calculates gross margin and markup accurately for Outsource Products', () => {
    const vendorCost = 3500
    const sellingPrice = 5200

    const marginCalc = calculateGrossMargin(vendorCost, sellingPrice)
    assert.strictEqual(marginCalc.grossProfit, 1700)
    // Margin percent: (1700 / 5200) * 100 = 32.69%
    assert.strictEqual(marginCalc.grossMarginPercent, 32.69)

    const suggested = calculateSuggestedSellingPrice(vendorCost, 40)
    // 3500 / (1 - 0.40) = 5833.33
    assert.strictEqual(suggested, 5833.33)
  })

  it('4. Updates outsource product configuration and vendor details via ProductRepository.updateProduct', async () => {
    const initial = await ProductService.createProduct({
      name: 'Computer Embroidery Patch Subcontract',
      sku: 'OUT-EMB-PATCH',
      category: 'embroidery',
      product_type: 'outsource',
      entity_type: 'outsource',
      is_outsource: true,
      is_non_inventory: true,
      track_inventory: false,
      unit: 'pcs',
      selling_unit: 'pcs',
      base_cost: 45,
      selling_price: 85,
      vendor_name: 'StitchCraft Embroidery Zone',
      turnaround_days: 3,
      company_id: companyId,
    })

    assert.strictEqual(initial.vendor_name, 'StitchCraft Embroidery Zone')
    assert.strictEqual(initial.turnaround_days, 3)

    const updated = await ProductRepository.updateProduct(
      initial.id,
      {
        vendor_name: 'StitchCraft Premier Hub',
        vendor_phone: '+8801811223344',
        turnaround_days: 2,
        selling_price: 95,
        outsource_notes: 'Upgraded to Japanese Tajima multi-head machines with metallic thread',
      },
      companyId
    )

    assert.strictEqual(updated.vendor_name, 'StitchCraft Premier Hub')
    assert.strictEqual(updated.vendor_phone, '+8801811223344')
    assert.strictEqual(updated.turnaround_days, 2)
    assert.strictEqual(updated.selling_price, 95)
    assert.strictEqual(updated.is_outsource, true)
    assert.strictEqual(updated.is_non_inventory, true)
  })

  it('5. Enforces strict multi-tenant isolation for outsource catalog items', async () => {
    const tenant1Product = await ProductService.createProduct({
      name: 'Tenant 1 Gold Foil Stamping',
      sku: 'OUT-FOIL-T1',
      category: 'die_cut_foil',
      product_type: 'outsource',
      entity_type: 'outsource',
      is_outsource: true,
      is_non_inventory: true,
      unit: 'pcs',
      selling_unit: 'pcs',
      base_cost: 15,
      selling_price: 35,
      company_id: companyId,
    })

    const tenant2Product = await ProductService.createProduct({
      name: 'Tenant 2 Heavy Metal Fabrication Subcontract',
      sku: 'OUT-METAL-T2',
      category: 'metal_fabrication',
      product_type: 'outsource',
      entity_type: 'outsource',
      is_outsource: true,
      is_non_inventory: true,
      unit: 'job',
      selling_unit: 'job',
      base_cost: 12000,
      selling_price: 22000,
      company_id: otherCompanyId,
    })

    const t1Catalog = await ProductRepository.getProducts(companyId)
    const t2Catalog = await ProductRepository.getProducts(otherCompanyId)

    assert.strictEqual(t1Catalog.some((p) => p.sku === 'OUT-FOIL-T1'), true)
    assert.strictEqual(t1Catalog.some((p) => p.sku === 'OUT-METAL-T2'), false)

    assert.strictEqual(t2Catalog.some((p) => p.sku === 'OUT-METAL-T2'), true)
    assert.strictEqual(t2Catalog.some((p) => p.sku === 'OUT-FOIL-T1'), false)
  })

  it('6. Filters by entityType = outsource accurately in ProductRepository.getProducts', async () => {
    // Add Ready Product
    await ProductService.createProduct({
      name: 'Standard Rollup Standee',
      sku: 'RP-STAND-01',
      category: 'display_stands',
      product_type: 'ready_product',
      entity_type: 'product',
      is_ready_product: true,
      unit: 'pcs',
      selling_unit: 'pcs',
      base_cost: 700,
      selling_price: 1200,
      company_id: companyId,
    })

    // Add Raw Material
    await ProductService.createProduct({
      name: 'Backlit Media Roll',
      sku: 'MAT-BACKLIT-01',
      category: 'roll_media',
      product_type: 'material',
      entity_type: 'material',
      unit: 'sft',
      selling_unit: 'sft',
      purchase_unit: 'roll',
      base_cost: 25,
      selling_price: 45,
      company_id: companyId,
    })

    // Add Outsource Product
    await ProductService.createProduct({
      name: '3D Acrylic Channel Letter Subcontract',
      sku: 'OUT-3D-ACRYLIC',
      category: 'channel_letters',
      product_type: 'outsource',
      entity_type: 'outsource',
      is_outsource: true,
      is_non_inventory: true,
      unit: 'rft',
      selling_unit: 'rft',
      base_cost: 350,
      selling_price: 650,
      vendor_name: 'Metro 3D Sign Workshop',
      turnaround_days: 7,
      company_id: companyId,
    })

    const outsourceOnly = await ProductRepository.getProducts(companyId, false, undefined, undefined, 'outsource')
    assert.strictEqual(outsourceOnly.length, 1)
    assert.strictEqual(outsourceOnly[0].sku, 'OUT-3D-ACRYLIC')
    assert.strictEqual(outsourceOnly[0].is_outsource, true)
    assert.strictEqual(outsourceOnly[0].is_non_inventory, true)
  })
})
