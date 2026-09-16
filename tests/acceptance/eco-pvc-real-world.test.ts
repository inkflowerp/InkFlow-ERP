import { test, describe } from 'node:test'
import assert from 'node:assert'
import { calculateServiceCosting } from '../../lib/domain/service-costing-engine.ts'
import { evaluateMaterialCompatibility } from '../../lib/domain/material-compatibility.ts'
import type { ProductRecord } from '../../types/product.types.ts'

describe('Real-World Acceptance Test 52: Eco PVC Banner Print and Width Rejection', () => {
  const companyId = 'comp-eco-pvc-scenario'

  const ecoPvcService: ProductRecord = {
    id: 'srv-eco-pvc',
    company_id: companyId,
    name: 'Eco PVC Banner Print',
    name_bn: 'ইকো পিভিসি ব্যানার প্রিন্ট',
    sku: 'SRV-ECO-PVC',
    category: 'printing',
    entity_type: 'service',
    product_type: 'print_service',
    commercial_type: 'service',
    measurement_type: 'area',
    pricing_method: 'per_area',
    unit: 'sft',
    selling_unit: 'sft',
    purchase_unit: 'roll',
    selling_price: 18.0, // ৳18 per sqft
    minimum_charge: 100.0,
    base_cost: 6.5,
    is_active: true,
    is_service: true,
    is_ready_product: false,
    requires_production: true,
    tax_rate: 7.5,
    min_price: 14.0,
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
          id: 'mat-pvc-req',
          material_name: 'PVC',
          is_required: true,
          consumption_rule: 'roll_linear_length',
          allowance_per_side_in: 1.0,
          compatible_widths_ft: [3.25, 4.25, 5.25],
          consumption_unit: 'sqft',
        },
      ],
      finishing_options: [
        { id: 'fin-eyelet', name: 'Eyelet (রিং বসানো)', pricing_method: 'per_piece', unit_price: 20.0 },
        { id: 'fin-msframe', name: 'MS Frame (লোহার ফ্রেম)', pricing_method: 'per_sqft', unit_price: 45.0 },
      ],
      additional_options: [
        { id: 'add-xstand-ready', name: 'X-Stand Hardware', pricing_method: 'per_piece', unit_price: 350.0 },
      ],
      installation_options: [
        { id: 'inst-shop', name: 'Shop Delivery', fulfillment_type: 'delivery', pricing_method: 'per_piece', unit_price: 0 },
      ],
      pricing_method: 'per_area',
    },
  }

  test('correctly handles 4x10 Eco PVC order with Eyelets, X-Stand additional, and Shop Delivery', () => {
    // Customer orders 3 pcs of 4x10 ft
    const quote = calculateServiceCosting({
      service: ecoPvcService,
      customer_width: 4,
      customer_length: 10,
      dimension_unit: 'ft',
      quantity: 3,
      selected_finishing_ids: ['fin-eyelet'],
      selected_additional_ids: ['add-xstand-ready'],
      selected_installation_id: 'inst-shop',
    })

    // Customer area: 4 * 10 = 40 sqft per piece x 3 = 120 sqft total
    assert.strictEqual(quote.customer_single_area_sqft, 40)
    assert.strictEqual(quote.total_customer_area_sqft, 120)

    // Production geometry: 4ft 2in x 10ft 2in
    assert.strictEqual(quote.production_geometry.formatted_production_spec, '4ft 2in × 10ft 2in')

    // Commercial breakdown:
    // Base print: 120 sqft @ ৳18 = ৳2,160
    // Eyelet finishing: 3 pcs @ ৳20 = ৳60
    // X-Stand hardware additional: 3 pcs @ ৳350 = ৳1,050
    // Shop delivery: ৳0
    // Total = ৳3,270
    assert.strictEqual(quote.base_service_price, 2160)
    assert.strictEqual(quote.finishing_total_price, 60)
    assert.strictEqual(quote.additional_total_price, 1050)
    assert.strictEqual(quote.installation_total_price, 0)
    assert.strictEqual(quote.final_selling_price, 3270)

    // Verify material compatibility: 4ft 2in fits on 4.25ft (4ft 3in) PVC roll!
    const availablePvcRollWidths = [3.25, 4.25, 5.25]
    const compatResult = evaluateMaterialCompatibility({
      required_material_name: 'PVC',
      geometry: quote.production_geometry,
      available_roll_widths_ft: availablePvcRollWidths,
    })

    assert.strictEqual(compatResult.is_compatible, true)
    assert.strictEqual(compatResult.selected_roll_width_ft, 4.25)
  })

  test('CRITICAL: Rejects 6ft customer width when available PVC rolls are 3.25ft, 4.25ft, 5.25ft and displays warning', () => {
    // Customer requests 6ft x 10ft banner
    const quote = calculateServiceCosting({
      service: ecoPvcService,
      customer_width: 6,
      customer_length: 10,
      dimension_unit: 'ft',
      quantity: 1,
    })

    // Production geometry: 6ft + 2in = 6ft 2in (74 inches)
    assert.strictEqual(quote.production_geometry.formatted_production_spec, '6ft 2in × 10ft 2in')

    const availablePvcRollWidths = [3.25, 4.25, 5.25]
    const compatResult = evaluateMaterialCompatibility({
      required_material_name: 'PVC',
      geometry: quote.production_geometry,
      available_roll_widths_ft: availablePvcRollWidths,
    })

    // System MUST NOT silently treat this job as producible
    assert.strictEqual(compatResult.is_compatible, false)
    assert.strictEqual(compatResult.selected_roll_width_ft, null)
    assert.strictEqual(
      compatResult.warning_message,
      'No compatible PVC material width configured for 6ft 2in production width.'
    )
  })
})
