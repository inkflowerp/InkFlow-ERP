import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PriceIntelligenceEngine } from '../../lib/domain/price-intelligence-engine.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'
import type { PriceIntelligenceRecord } from '../../types/price-intelligence.types.ts'

describe('Direct Stock Intake & Price Intelligence Engine', () => {
  const testCompanyId = `test-company-price-intel-${Date.now()}`

  // 1. Material Master Physical Classification & Purchase Unit Inheritance
  it('should automatically detect physical classification and preserve purchase unit from material master', () => {
    // Roll Media
    const flexMaster = {
      id: 'mat-flx-001',
      name: 'Eco Solvent Flex 440 GSM',
      category: 'roll_media',
      unit: 'sft',
      purchase_unit: 'roll',
      is_roll: true,
      available_widths_ft: [2.5, 3.2, 5],
      standard_roll_length_ft: 164,
    }
    const flexForm = PriceIntelligenceEngine.detectMaterialPhysicalForm(flexMaster)
    assert.strictEqual(flexForm, 'roll', 'Eco Solvent Flex must be classified as roll')

    // Rigid Sheet
    const pvcMaster = {
      id: 'mat-pvc-003',
      name: 'PVC Board 3mm',
      category: 'rigid_sheet',
      unit: 'sheet',
      purchase_unit: 'sheet',
      available_sheet_sizes: ['8x4 ft (32 sft)', '6x4 ft (24 sft)'],
    }
    const pvcForm = PriceIntelligenceEngine.detectMaterialPhysicalForm(pvcMaster)
    assert.strictEqual(pvcForm, 'sheet', 'PVC Board must be classified as sheet')

    // Liquid Consumable
    const inkMaster = {
      id: 'mat-ink-001',
      name: 'Eco Solvent Ink Black',
      category: 'ink_chemistry',
      unit: 'ltr',
      purchase_unit: 'bottle',
    }
    const inkForm = PriceIntelligenceEngine.detectMaterialPhysicalForm(inkMaster)
    assert.strictEqual(inkForm, 'liquid', 'Eco Solvent Ink must be classified as liquid')

    // Piece / Hardware
    const eyeletMaster = {
      id: 'mat-eyl-001',
      name: 'Eyelet 12mm',
      category: 'hardware_accessories',
      unit: 'pcs',
      purchase_unit: 'pack',
    }
    const eyeletForm = PriceIntelligenceEngine.detectMaterialPhysicalForm(eyeletMaster)
    assert.strictEqual(eyeletForm, 'piece', 'Eyelet must be classified as piece')
  })

  // 2. Active Configured Roll Sizes & Discrete Economics
  it('should extract active configured roll sizes and their discrete economic characteristics', () => {
    const flexMaster = {
      id: 'mat-flx-001',
      name: 'Eco Solvent Flex 440 GSM',
      category: 'roll_media',
      unit: 'sft',
      purchase_unit: 'roll',
      is_roll: true,
      standard_roll_length_ft: 164,
      roll_sizes: [
        { id: 'rs-1', width_ft: 2.5, length_ft: 164, label: '2.5 ft × 50 m', default_supplier_price: 8500, is_active: true },
        { id: 'rs-2', width_ft: 3.2, length_ft: 164, label: '3.2 ft × 50 m', default_supplier_price: 10500, is_active: true },
        { id: 'rs-3', width_ft: 5.0, length_ft: 164, label: '5 ft × 50 m', default_supplier_price: 15500, is_active: true },
        { id: 'rs-4', width_ft: 3.2, length_ft: 328, label: '3.2 ft × 100 m', default_supplier_price: 21000, is_active: false }, // Inactive
      ],
    }

    const sizes = PriceIntelligenceEngine.getMaterialActiveSizes(flexMaster)
    assert.strictEqual(sizes.length, 3, 'Only the 3 active roll sizes should be extracted')
    assert.strictEqual(sizes[0].label, '2.5 ft × 50 m')
    assert.strictEqual(sizes[0].default_supplier_price, 8500)
    assert.strictEqual(sizes[1].label, '3.2 ft × 50 m')
    assert.strictEqual(sizes[1].default_supplier_price, 10500)
    assert.strictEqual(sizes[2].label, '5 ft × 50 m')
    assert.strictEqual(sizes[2].default_supplier_price, 15500)

    // Verify discrete economics area calculations
    assert.strictEqual(sizes[0].standard_area_sft, 410, '2.5 ft * 164 ft = 410 sft')
    assert.strictEqual(sizes[1].standard_area_sft, 524.8, '3.2 ft * 164 ft = 524.8 sft')
  })

  // 3. Normalized Unit Economics Calculations (৳/sqft, ৳/linear ft, ৳/liter)
  it('should correctly calculate normalized unit economics across physical forms', () => {
    // 3.2 ft × 50 m roll @ ৳10,500
    const rollEconomics = PriceIntelligenceEngine.calculateNormalizedUnitEconomics({
      physical_form: 'roll',
      width_ft: 3.2,
      length_ft: 164,
      unit_purchase_price: 10500,
      purchase_unit: 'roll',
    })
    assert.ok(rollEconomics.normalized_cost_per_sft !== undefined)
    assert.strictEqual(Number(rollEconomics.normalized_cost_per_sft?.toFixed(2)), 20.01) // 10,500 / 524.8 sft

    // 8x4 ft PVC Sheet (32 sqft) @ ৳3,200
    const sheetEconomics = PriceIntelligenceEngine.calculateNormalizedUnitEconomics({
      physical_form: 'sheet',
      width_ft: 8,
      length_ft: 4,
      unit_purchase_price: 3200,
      purchase_unit: 'sheet',
    })
    assert.strictEqual(sheetEconomics.normalized_cost_per_sft, 100) // 3,200 / 32 = 100/sqft

    // 5 Liter Can of Ink @ ৳12,500
    const liquidEconomics = PriceIntelligenceEngine.calculateNormalizedUnitEconomics({
      physical_form: 'liquid',
      capacity_liters: 5,
      unit_purchase_price: 12500,
      purchase_unit: 'can',
    })
    assert.strictEqual(liquidEconomics.normalized_cost_per_liter, 2500) // 12,500 / 5 = 2,500/liter
  })

  // 4. Price Intelligence Aggregator & Historical Supplier Analysis
  it('should build a comprehensive price intelligence summary across suppliers with trends and records', () => {
    const material = {
      id: 'mat-flx-001',
      name: 'Eco Solvent Flex 440 GSM',
      sku: 'MAT-FLX-001',
      category: 'roll_media',
      purchase_unit: 'Roll',
      average_cost: 10500,
    }

    const historyRecords: PriceIntelligenceRecord[] = [
      {
        id: 'pi-1',
        company_id: testCompanyId,
        material_id: 'mat-flx-001',
        material_name: 'Eco Solvent Flex 440 GSM',
        material_sku: 'MAT-FLX-001',
        physical_form: 'roll',
        size_label: '3.2 ft × 50 m',
        purchase_unit: 'Roll',
        quantity_received: 5,
        unit_purchase_price: 10500,
        total_purchase_amount: 52500,
        supplier_id: 'sup-a',
        supplier_name: 'ABC Trading',
        purchase_date: '2026-09-10',
        challan_number: 'ABC-101',
        normalized_price_per_sft: 20.01,
        created_at: '2026-09-10T10:00:00Z',
      },
      {
        id: 'pi-2',
        company_id: testCompanyId,
        material_id: 'mat-flx-001',
        material_name: 'Eco Solvent Flex 440 GSM',
        material_sku: 'MAT-FLX-001',
        physical_form: 'roll',
        size_label: '3.2 ft × 50 m',
        purchase_unit: 'Roll',
        quantity_received: 3,
        unit_purchase_price: 10200,
        total_purchase_amount: 30600,
        supplier_id: 'sup-b',
        supplier_name: 'Dhaka Media Supplies',
        purchase_date: '2026-09-15',
        challan_number: 'DMS-882',
        normalized_price_per_sft: 19.44,
        created_at: '2026-09-15T10:00:00Z',
      },
      {
        id: 'pi-3',
        company_id: testCompanyId,
        material_id: 'mat-flx-001',
        material_name: 'Eco Solvent Flex 440 GSM',
        material_sku: 'MAT-FLX-001',
        physical_form: 'roll',
        size_label: '3.2 ft × 50 m',
        purchase_unit: 'Roll',
        quantity_received: 5,
        unit_purchase_price: 10800,
        total_purchase_amount: 54000,
        supplier_id: 'sup-a',
        supplier_name: 'ABC Trading',
        purchase_date: '2026-09-20',
        challan_number: 'ABC-1024',
        normalized_price_per_sft: 20.58,
        created_at: '2026-09-20T10:00:00Z',
      },
    ]

    const summary = PriceIntelligenceEngine.buildPriceIntelligenceSummary({
      material,
      size_label: '3.2 ft × 50 m',
      current_unit_price: 10800,
      current_supplier_id: 'sup-a',
      history: historyRecords,
    })

    assert.strictEqual(summary.latest_cost, 10800, 'Latest cost should be ৳10,800')
    assert.strictEqual(summary.lowest_cost, 10200, 'Lowest recorded cost should be ৳10,200')
    assert.strictEqual(summary.lowest_supplier_name, 'Dhaka Media Supplies')
    assert.strictEqual(summary.highest_cost, 10800, 'Highest recorded cost should be ৳10,800')
    assert.strictEqual(summary.supplier_comparison.length, 2, 'Should compare 2 distinct suppliers')
    assert.strictEqual(summary.total_records_count, 3, 'Should reflect 3 historical records')
  })

  // 5. Direct Stock Intake Creating Discrete Physical Units (Rolls) & Price Intelligence Event
  it('should receive 5 rolls of 3.2 ft × 50 m and create 5 individual warehouse roll units with discrete traceability', async () => {
    // 1. Create registered material
    const material = await InventoryService.createMaterial({
      company_id: testCompanyId,
      sku: 'MAT-FLX-440',
      name: 'Eco Solvent Flex 440 GSM',
      category: 'roll_media',
      unit: 'sft',
      purchase_unit: 'roll',
      is_roll: true,
      roll_width_ft: 3.2,
      standard_roll_length_ft: 164,
      cost_per_unit: 20.01,
      current_stock: 0,
    })

    // 2. Direct Stock Intake of 5 rolls of 3.2 ft × 50 m from Supplier ABC
    const intakeResult = await InventoryService.receiveStock({
      company_id: testCompanyId,
      material_id: material.id,
      location_id: 'main-store-loc',
      quantity: 5,
      unit_cost: 10500, // ৳10,500 per roll
      supplier_id: 'sup-abc-trading',
      supplier_name: 'ABC Trading',
      size_label: '3.2 ft × 50 m',
      width_ft: 3.2,
      length_ft: 164,
      physical_form: 'roll',
      purchase_unit: 'roll',
      challan_number: 'ABC-INV-1024',
      supplier_invoice_number: 'INV-9901',
      batch_lot_number: 'LOT-FLX-01',
      purchase_date: '2026-09-23',
      notes: 'Direct warehouse stock intake for Eco Solvent Flex 440 GSM',
    })

    assert.ok(intakeResult.material, 'Should return updated material')
    assert.ok(intakeResult.ledgerEntry, 'Should return stock ledger entry')
    assert.strictEqual(intakeResult.rollsCreated?.length, 5, 'Must create exactly 5 individual physical roll records')

    // Verify discrete roll properties
    const firstRoll = intakeResult.rollsCreated![0]
    assert.strictEqual(firstRoll.width_ft, 3.2, 'Roll width must be 3.2 ft')
    assert.strictEqual(firstRoll.original_length_ft, 164, 'Original length must be 164 ft')
    assert.strictEqual(firstRoll.remaining_length_ft, 164, 'Initial remaining length must be 164 ft')
    assert.strictEqual(firstRoll.status, 'in_warehouse', 'Initial roll status must be in_warehouse')
    assert.strictEqual(firstRoll.unit_cost, 10500, 'Roll discrete purchase price must be ৳10,500')
    assert.strictEqual(firstRoll.batch_lot_number, 'LOT-FLX-01')

    // Verify Price Intelligence recorded event
    const priceIntel = await InventoryService.getPriceIntelligence(
      material.id,
      testCompanyId,
      '3.2 ft × 50 m',
      10500,
      'sup-abc-trading'
    )

    assert.ok(priceIntel, 'Price intelligence summary must exist')
    assert.strictEqual(priceIntel.latest_cost, 10500)
    assert.strictEqual(priceIntel.lowest_cost, 10500)
    assert.strictEqual(priceIntel.lowest_supplier_name, 'ABC Trading')
    assert.strictEqual(priceIntel.total_records_count, 1)
  })
})
