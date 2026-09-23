import test from 'node:test'
import assert from 'node:assert/strict'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { PriceIntelligenceEngine } from '../../lib/domain/price-intelligence-engine.ts'

test('Direct Stock Intake & Price Intelligence — Registered Masters, Units, & Non-Inflated Pricing', async (t) => {
  const companyId = 'tenant-price-intelligence-test-corp'

  // Reset store
  PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [], true, companyId)
  PrintERPDataStore.set(STORAGE_KEYS.MOUNTED_ROLLS, [], true, companyId)
  PrintERPDataStore.set(STORAGE_KEYS.STOCK_LEDGER, [], true, companyId)
  PrintERPDataStore.set(STORAGE_KEYS.PRICE_INTELLIGENCE, [], true, companyId)
  PrintERPDataStore.set(STORAGE_KEYS.LOCATIONS, [], true, companyId)

  // 1. Registered Material Masters exactly as in Products & Commercial Masters
  const registeredMaterials = [
    {
      id: 'mat-cyan-83366',
      company_id: companyId,
      sku: 'MAT-83366',
      name: 'Eco Solvent Ink (Cyan)',
      category: 'ink_chemistry',
      unit: 'liter',
      purchase_unit: 'liter',
      average_cost: 1050,
      current_stock: 5,
    },
    {
      id: 'mat-lam-54172',
      company_id: companyId,
      sku: 'MAT-54172',
      name: 'Matte Lamination',
      category: 'roll_media',
      unit: 'sft',
      purchase_unit: 'roll',
      is_roll: true,
      available_widths_ft: [3, 4, 5],
      standard_roll_length_ft: 164,
      roll_width_ft: 5,
      roll_length_ft: 164,
      average_cost: 4920, // ৳4,920 for a base 5ft roll (820 sqft)
      current_stock: 820,
    },
    {
      id: 'mat-eyelet-76022',
      company_id: companyId,
      sku: 'MAT-76022',
      name: 'Eyelet',
      category: 'hardware_accessories',
      unit: 'piece',
      purchase_unit: 'piece',
      average_cost: 400,
      current_stock: 500,
    },
    {
      id: 'mat-pvc-47483',
      company_id: companyId,
      sku: 'MAT-47483',
      name: 'PVC Flex Banner',
      category: 'roll_media',
      unit: 'sft',
      purchase_unit: 'roll',
      is_roll: true,
      available_widths_ft: [3, 5],
      standard_roll_length_ft: 164,
      roll_width_ft: 5,
      roll_length_ft: 164,
      average_cost: 12226.2, // ৳12,226.20 for a 5ft roll (820 sqft) -> ৳14.91 / sqft
      current_stock: 820,
    },
    {
      id: 'mat-board-99011',
      company_id: companyId,
      sku: 'MAT-99011',
      name: 'Acrylic Sheet 3mm',
      category: 'rigid_sheet',
      unit: 'sheet',
      purchase_unit: 'sheet',
      available_sheet_sizes: ['8x4 ft (32 sft)', '6x4 ft (24 sft)'],
      average_cost: 3200,
      current_stock: 10,
    },
  ]

  PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, registeredMaterials, true, companyId)

  await t.test('1. Physical Form & Purchase Unit Detection matches registered commercial types', () => {
    const ink = registeredMaterials[0]
    const lam = registeredMaterials[1]
    const eyelet = registeredMaterials[2]
    const sheet = registeredMaterials[4]

    assert.equal(PriceIntelligenceEngine.detectMaterialPhysicalForm(ink), 'liquid')
    assert.equal(PriceIntelligenceEngine.detectMaterialPhysicalForm(lam), 'roll')
    assert.equal(PriceIntelligenceEngine.detectMaterialPhysicalForm(eyelet), 'piece')
    assert.equal(PriceIntelligenceEngine.detectMaterialPhysicalForm(sheet), 'sheet')
  })

  await t.test('2. Active Configured Sizes for Roll Media strictly derives user-configured widths with realistic scaled pricing', () => {
    const lam = registeredMaterials[1]
    const sizes = PriceIntelligenceEngine.getMaterialActiveSizes(lam)

    // Must strictly have 3 options matching [3, 4, 5] (no synthetic 2.5ft or 10ft injections)
    assert.equal(sizes.length, 3)
    assert.equal(sizes[0].width_ft, 3)
    assert.equal(sizes[0].standard_area_sft, 492)
    // 3ft proportional cost = 4920 * (3 / 5) = ৳2,952 (Never 2.4 million taka!)
    assert.equal(sizes[0].default_supplier_price, 2952)

    assert.equal(sizes[1].width_ft, 4)
    assert.equal(sizes[1].standard_area_sft, 656)
    // 4ft proportional cost = 4920 * (4 / 5) = ৳3,936
    assert.equal(sizes[1].default_supplier_price, 3936)

    assert.equal(sizes[2].width_ft, 5)
    assert.equal(sizes[2].standard_area_sft, 820)
    // 5ft base cost = ৳4,920
    assert.equal(sizes[2].default_supplier_price, 4920)
  })

  await t.test('3. Normalized Unit Economics calculates accurate Price per Sqft and Price per Unit', () => {
    // 5ft roll @ ৳4,920 (820 sqft)
    const econ5ft = PriceIntelligenceEngine.calculateNormalizedUnitEconomics({
      physical_form: 'roll',
      width_ft: 5,
      length_ft: 164,
      standard_area_sft: 820,
      unit_purchase_price: 4920,
      purchase_unit: 'roll',
    })

    assert.equal(econ5ft.normalized_cost_per_sft, 6.0) // 4920 / 820 = 6.00 / sqft
    assert.equal(econ5ft.standard_area_sft, 820)
    assert.equal(econ5ft.normalized_cost_per_unit, 4920)

    // 3ft roll @ ৳2,952 (492 sqft)
    const econ3ft = PriceIntelligenceEngine.calculateNormalizedUnitEconomics({
      physical_form: 'roll',
      width_ft: 3,
      length_ft: 164,
      standard_area_sft: 492,
      unit_purchase_price: 2952,
      purchase_unit: 'roll',
    })

    assert.equal(econ3ft.normalized_cost_per_sft, 6.0) // 2952 / 492 = 6.00 / sqft

    // Liquid Ink @ ৳1,050 / liter
    const econInk = PriceIntelligenceEngine.calculateNormalizedUnitEconomics({
      physical_form: 'liquid',
      capacity_liters: 1,
      unit_purchase_price: 1050,
      purchase_unit: 'liter',
    })
    assert.equal(econInk.normalized_cost_per_liter, 1050)
  })

  await t.test('4. Price Intelligence Summary builds supplier comparison & market trend without inflation', () => {
    const lam = registeredMaterials[1]
    const summary = PriceIntelligenceEngine.buildPriceIntelligenceSummary({
      material: lam,
      size_label: '3 ft × 50 m (492 sqft)',
      current_unit_price: 2952,
      current_supplier_id: 'sup-001',
      history: [
        {
          id: 'pi-1',
          company_id: companyId,
          material_id: lam.id,
          material_name: lam.name,
          material_sku: lam.sku,
          physical_form: 'roll',
          size_label: '3 ft × 50 m (492 sqft)',
          width_ft: 3,
          length_ft: 164,
          area_sft: 492,
          purchase_unit: 'roll',
          supplier_id: 'sup-001',
          supplier_name: 'Meghna Substrates Mill',
          unit_purchase_price: 2900,
          quantity_received: 2,
          total_amount: 5800,
          normalized_price_per_sft: 5.89,
          purchase_date: '2026-09-01',
          created_at: '2026-09-01T10:00:00Z',
        },
        {
          id: 'pi-2',
          company_id: companyId,
          material_id: lam.id,
          material_name: lam.name,
          material_sku: lam.sku,
          physical_form: 'roll',
          size_label: '3 ft × 50 m (492 sqft)',
          width_ft: 3,
          length_ft: 164,
          area_sft: 492,
          purchase_unit: 'roll',
          supplier_id: 'sup-002',
          supplier_name: 'Dhaka Spot Media',
          unit_purchase_price: 3100,
          quantity_received: 1,
          total_amount: 3100,
          normalized_price_per_sft: 6.3,
          purchase_date: '2026-09-10',
          created_at: '2026-09-10T10:00:00Z',
        },
      ],
      width_ft: 3,
      length_ft: 164,
      standard_area_sft: 492,
    })

    assert.equal(summary.material_sku, 'MAT-54172')
    assert.equal(summary.latest_cost, 2952)
    assert.equal(summary.lowest_cost, 2900)
    assert.equal(summary.highest_cost, 3100)
    assert.equal(summary.normalized_cost_per_sft, 6.0)
    assert.equal(summary.supplier_comparison.length, 2)
  })

  await t.test('5. Rigid Sheet configured sizes are derived accurately', () => {
    const sheet = registeredMaterials[4]
    const sizes = PriceIntelligenceEngine.getMaterialActiveSizes(sheet)

    assert.equal(sizes.length, 2)
    assert.equal(sizes[0].label, '8x4 ft (32 sft)')
    assert.equal(sizes[0].standard_area_sft, 32)
    assert.equal(sizes[1].label, '6x4 ft (24 sft)')
    assert.equal(sizes[1].standard_area_sft, 24)
  })

  await t.test('6. PVC with 10 configured roll variants and extra allowance produces exact discrete economics', () => {
    const pvcRecord = {
      id: 'mat-pvc-user',
      name: 'PVC Flex Banner',
      sku: 'MAT-47483',
      category: 'roll_media',
      unit: 'sft',
      purchase_unit: 'roll',
      is_roll: true,
      material_config: {
        material_category: 'roll_media',
        standard_roll_length_ft: 164,
        purchase_price_per_sft: 7.1,
        production_width_allowance: 0.25,
        roll_sizes: [
          { width: 2, extra_allowance: 0.25, length: 164, purchase_price: 2620 },
          { width: 2.5, extra_allowance: 0.25, length: 164, purchase_price: 3202 },
          { width: 3, extra_allowance: 0.25, length: 164, purchase_price: 3784 },
          { width: 3.5, extra_allowance: 0.25, length: 164, purchase_price: 4367 },
          { width: 4, extra_allowance: 0.25, length: 164, purchase_price: 4949 },
          { width: 5, extra_allowance: 0.25, length: 164, purchase_price: 6113 },
          { width: 6, extra_allowance: 0.25, length: 164, purchase_price: 7278 },
          { width: 7, extra_allowance: 0.25, length: 164, purchase_price: 8442 },
          { width: 8, extra_allowance: 0.25, length: 164, purchase_price: 9606 },
          { width: 10, extra_allowance: 0.5, length: 164, purchase_price: 12226 },
        ],
      },
    }

    assert.equal(PriceIntelligenceEngine.detectMaterialPhysicalForm(pvcRecord), 'roll')
    const sizes = PriceIntelligenceEngine.getMaterialActiveSizes(pvcRecord)
    assert.equal(sizes.length, 10)
    assert.equal(sizes[0].label, '2ft (+0.25ft) × 164ft (369 sqft)')
    assert.equal(sizes[0].default_supplier_price, 2620)
    assert.equal(sizes[5].label, '5ft (+0.25ft) × 164ft (861 sqft)')
    assert.equal(sizes[5].default_supplier_price, 6113)
    assert.equal(sizes[9].label, '10ft (+0.5ft) × 164ft (1722 sqft)')
    assert.equal(sizes[9].default_supplier_price, 12226)
  })

  await t.test('7. Vinyl with 3 configured roll sizes without allowance produces exact discrete economics', () => {
    const vinylRecord = {
      id: 'mat-vinyl-user',
      name: 'Vinyl Sticker',
      sku: 'MAT-09883',
      category: 'vinyl',
      unit: 'sft',
      purchase_unit: 'roll',
      is_roll: true,
      material_config: {
        material_category: 'roll_media',
        standard_roll_length_ft: 164,
        purchase_price_per_sft: 9.0,
        roll_sizes: [
          { width: 3, extra_allowance: 0, length: 164, purchase_price: 4428 },
          { width: 4, extra_allowance: 0, length: 164, purchase_price: 5904 },
          { width: 5, extra_allowance: 0, length: 164, purchase_price: 7380 },
        ],
      },
    }

    assert.equal(PriceIntelligenceEngine.detectMaterialPhysicalForm(vinylRecord), 'roll')
    const sizes = PriceIntelligenceEngine.getMaterialActiveSizes(vinylRecord)
    assert.equal(sizes.length, 3)
    assert.equal(sizes[0].label, '3ft × 164ft (492 sqft)')
    assert.equal(sizes[0].default_supplier_price, 4428)
    assert.equal(sizes[1].label, '4ft × 164ft (656 sqft)')
    assert.equal(sizes[1].default_supplier_price, 5904)
    assert.equal(sizes[2].label, '5ft × 164ft (820 sqft)')
    assert.equal(sizes[2].default_supplier_price, 7380)
  })

  await t.test('8. Liquid Inks & Solvents are strictly detected as liquid and never display roll sizes', () => {
    const inkRecord = {
      id: 'mat-ink-user',
      name: 'Eco Solvent Ink (Black)',
      sku: 'MAT-40355',
      category: 'ink_chemistry',
      unit: 'liter',
      purchase_unit: 'liter',
      average_cost: 1050,
      material_config: {
        material_category: 'inks',
        ink_type: 'eco_solvent',
        color: 'black',
        bottle_volume_liters: 1,
      },
    }

    assert.equal(PriceIntelligenceEngine.detectMaterialPhysicalForm(inkRecord), 'liquid')
    const sizes = PriceIntelligenceEngine.getMaterialActiveSizes(inkRecord)
    assert.equal(sizes.length, 1)
    assert.equal(sizes[0].physical_form, 'liquid')
    assert.equal(sizes[0].label, 'Standard Container (1 liter)')
    assert.equal(sizes[0].default_supplier_price, 1050)
  })

  await t.test('9. MAT-11925 PVC with base cost ৳10/sqft resolves accurate roll prices for 3ft, 4ft, 5ft', () => {
    const pvc11925 = {
      id: 'mat-pvc-11925',
      sku: 'MAT-11925',
      name: 'PVC',
      category: 'roll_media',
      unit: 'sft',
      purchase_unit: 'roll',
      is_roll: true,
      average_cost: 10, // ৳10 per sqft
      standard_roll_length_ft: 164,
      available_widths_ft: [3, 4, 5],
    }

    assert.equal(PriceIntelligenceEngine.detectMaterialPhysicalForm(pvc11925), 'roll')
    const sizes = PriceIntelligenceEngine.getMaterialActiveSizes(pvc11925)
    assert.equal(sizes.length, 3)

    // 3ft × 164ft = 492 sqft @ ৳10 = ৳4,920
    assert.equal(sizes[0].label, '3ft × 164ft (492 sqft)')
    assert.equal(sizes[0].standard_area_sft, 492)
    assert.equal(sizes[0].default_supplier_price, 4920)

    // 4ft × 164ft = 656 sqft @ ৳10 = ৳6,560
    assert.equal(sizes[1].label, '4ft × 164ft (656 sqft)')
    assert.equal(sizes[1].standard_area_sft, 656)
    assert.equal(sizes[1].default_supplier_price, 6560)

    // 5ft × 164ft = 820 sqft @ ৳10 = ৳8,200
    assert.equal(sizes[2].label, '5ft × 164ft (820 sqft)')
    assert.equal(sizes[2].standard_area_sft, 820)
    assert.equal(sizes[2].default_supplier_price, 8200)

    // Intake of 50 rolls of 3ft: Total Valuation = 50 * 4920 = 246,000 BDT
    const quantity = 50
    const rollUnitPrice = sizes[0].default_supplier_price!
    const totalValuation = quantity * rollUnitPrice
    assert.equal(totalValuation, 246000)

    // Normalized Economics verifies ৳10/sqft
    const econ = PriceIntelligenceEngine.calculateNormalizedUnitEconomics({
      physical_form: 'roll',
      width_ft: 3,
      length_ft: 164,
      standard_area_sft: 492,
      unit_purchase_price: rollUnitPrice,
      purchase_unit: 'roll',
    })
    assert.equal(econ.normalized_cost_per_sft, 10)
  })
})

