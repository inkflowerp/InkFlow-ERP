import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { calculateServiceCosting } from '../../lib/domain/service-costing-engine.ts'
import { evaluateMaterialCompatibility } from '../../lib/domain/material-compatibility.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { PrintERPDataStore } from '../../lib/db/data-store.ts'
import type { ProductRecord } from '../../types/product.types.ts'

describe('Real-World Acceptance Test 51: UV Vinyl Print Order for ABC Company', () => {
  const companyId = 'comp-abc-scenario'

  // Master Service Configuration
  const uvVinylService: ProductRecord = {
    id: 'srv-uv-vinyl-master',
    company_id: companyId,
    name: 'UV Vinyl Print',
    name_bn: 'ইউভি ভিনাইল প্রিন্ট',
    sku: 'SRV-UV-VINYL',
    category: 'printing',
    entity_type: 'service',
    product_type: 'print_service',
    commercial_type: 'service',
    measurement_type: 'area',
    pricing_method: 'per_area',
    unit: 'sft',
    selling_unit: 'sft',
    purchase_unit: 'roll',
    selling_price: 38.0, // ৳38 per sqft base
    minimum_charge: 150.0,
    base_cost: 14.0,
    target_margin_percentage: 35.0,
    is_active: true,
    is_service: true,
    is_ready_product: false,
    requires_production: true,
    tax_rate: 7.5,
    min_price: 25.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    service_config: {
      dimension_unit: 'ft',
      allow_custom_dimensions: true,
      presets: [
        { id: 'p1', width: 3, length: 10, label: '3 × 10 ft' },
        { id: 'p2', width: 4, length: 10, label: '4 × 10 ft' },
        { id: 'p3', width: 5, length: 10, label: '5 × 10 ft' },
      ],
      required_materials: [
        {
          id: 'mat-vinyl-req',
          material_name: 'Vinyl Sticker',
          is_required: true,
          consumption_rule: 'roll_linear_length',
          allowance_per_side_in: 1.0,
          compatible_widths_ft: [3, 4, 5],
          consumption_unit: 'sqft',
        },
        {
          id: 'mat-ink-req',
          material_name: 'UV Ink',
          is_required: true,
          consumption_rule: 'area_sqft',
          allowance_per_side_in: 0,
          consumption_unit: 'ml',
        },
      ],
      finishing_options: [
        { id: 'fin-glossy', name: 'Glossy Lamination', pricing_method: 'per_sqft', unit_price: 5.0 },
      ],
      additional_options: [
        { id: 'add-pvc3mm', name: '3mm PVC Board Pasting', pricing_method: 'per_sqft', unit_price: 25.0 },
      ],
      installation_options: [
        { id: 'inst-onsite', name: 'On-Site Installation', fulfillment_type: 'installation', pricing_method: 'per_sqft', unit_price: 15.0 },
      ],
      pricing_method: 'per_area',
    },
  }

  beforeEach(async () => {
    PrintERPDataStore.clearAll()

    // Seed master material
    await InventoryRepository.createMaterial({
      id: 'mat-vinyl-white',
      company_id: companyId,
      sku: 'MAT-VINYL-WHT',
      name: 'Vinyl Sticker White',
      category: 'media',
      unit: 'sft',
      current_stock: 5000,
      is_roll: true,
      roll_width_ft: 5,
      roll_length_ft: 164,
      last_purchase_price: 9500,
      average_cost: 11.5,
    })

    // Seed physical inventory roll in stock: 5ft x 164ft roll
    await InventoryRepository.createPhysicalRoll({
      id: 'roll-vinyl-5ft-001',
      company_id: companyId,
      material_id: 'mat-vinyl-white',
      roll_code: 'VINYL-ROLL-000123',
      width_ft: 5,
      initial_length_ft: 164,
      unit_cost: 9500,
      location_name: 'Main Store',
    })
  })

  test('runs complete commercial quotation to production geometry, material issue, consumption, and remnant tracking', async () => {
    // 1. Calculate Commercial Quotation for ABC Company (5 pieces, 4ft x 12ft)
    const quote = calculateServiceCosting({
      service: uvVinylService,
      customer_width: 4,
      customer_length: 12,
      dimension_unit: 'ft',
      quantity: 5,
      selected_finishing_ids: ['fin-glossy'],
      selected_additional_ids: ['add-pvc3mm'],
      selected_installation_id: 'inst-onsite',
    })

    // Assert customer dimensions & areas
    assert.strictEqual(quote.customer_single_area_sqft, 48) // 4 * 12
    assert.strictEqual(quote.total_customer_area_sqft, 240) // 48 * 5

    // Assert production geometry (1-inch bleed on each side)
    assert.strictEqual(quote.production_geometry.formatted_production_spec, '4ft 2in × 12ft 2in')
    assert.ok(Math.abs(quote.production_single_area_sqft - 50.69) < 0.1)
    assert.ok(Math.abs(quote.total_production_area_sqft - 253.47) < 0.5)

    // Commercial breakdown
    // Base print: 240 sqft @ ৳38 = ৳9,120
    // Glossy lamination: 240 sqft @ ৳5 = ৳1,200
    // 3mm PVC Board Pasting: 240 sqft @ ৳25 = ৳6,000
    // On-Site Installation: 240 sqft @ ৳15 = ৳3,600
    // Total = ৳19,920
    assert.strictEqual(quote.base_service_price, 9120)
    assert.strictEqual(quote.finishing_total_price, 1200)
    assert.strictEqual(quote.additional_total_price, 6000)
    assert.strictEqual(quote.installation_total_price, 3600)
    assert.strictEqual(quote.final_selling_price, 19920)

    // 2. Material Compatibility Verification
    const physicalRolls = await InventoryRepository.getInventoryRolls(companyId)
    const compatResult = evaluateMaterialCompatibility({
      required_material_name: 'Vinyl Sticker',
      geometry: quote.production_geometry,
      available_roll_widths_ft: [3, 4, 5],
      active_physical_rolls: physicalRolls,
    })

    assert.strictEqual(compatResult.is_compatible, true)
    assert.strictEqual(compatResult.selected_roll_width_ft, 5) // 4ft 2in needs 5ft roll
    assert.strictEqual(compatResult.compatible_physical_rolls?.length, 1)
    assert.strictEqual(compatResult.compatible_physical_rolls?.[0].roll_code, 'VINYL-ROLL-000123')

    // 3. Production Material Issue & Consumption:
    // Production pulls 5 pieces of 12ft 2in linear length = 60.83 ft linear consumption from the 5ft roll
    const activeRoll = compatResult.compatible_physical_rolls![0]
    const linearFeetNeeded = 5 * (12 + 2 / 12) // 60.83 ft

    const consumeResult = await InventoryRepository.consumeFromPhysicalRoll({
      company_id: companyId,
      roll_id: activeRoll.id,
      linear_length_consumed_ft: linearFeetNeeded,
      job_order_id: 'JOB-ABC-001',
      operator_name: 'Imran (Press Lead)',
      notes: 'UV Vinyl 4ft 2in x 12ft 2in (5 pcs) for ABC Company',
      offcut_remnant: {
        create_remnant: true,
        width_ft: 5,
        length_ft: 3.17,
        condition: 'usable',
      },
    })

    // Assert roll remaining length & area
    // Original length: 164ft. Consumed: 60.83ft. Remaining: ~103.17ft
    assert.ok(Math.abs((consumeResult.roll.current_length_ft ?? 0) - 103.17) < 0.2)
    assert.strictEqual(consumeResult.roll.status, 'in_use')
    assert.ok(Math.abs((consumeResult.roll.remaining_area_sft ?? 0) - 103.17 * 5) < 1.0)

    // 4. Remnant is created when cutting ends or usable offcuts remain
    assert.ok(consumeResult.remnant)
    assert.strictEqual(consumeResult.remnant?.width, 5)
    assert.strictEqual(consumeResult.remnant?.condition, 'usable')

    // 5. Stock Ledger Audit Verification
    const ledger = await InventoryRepository.getStockLedger(companyId)
    const consumptionLedger = ledger.find((l) => l.transaction_type === 'CONSUMPTION')
    assert.ok(consumptionLedger)
    assert.ok(consumptionLedger?.notes?.includes('VINYL-ROLL-000123'))
    assert.strictEqual(consumptionLedger?.performed_by_name, 'Imran (Press Lead)')
  })
})
