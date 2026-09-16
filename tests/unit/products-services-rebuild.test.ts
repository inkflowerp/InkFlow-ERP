import { test, describe } from 'node:test'
import assert from 'node:assert'
import { calculateServiceCosting } from '../../lib/domain/service-costing-engine.ts'
import type { ProductRecord } from '../../types/product.types.ts'

describe('Products & Services Rebuild Domain Model', () => {
  const uvVinylService: ProductRecord = {
    id: 'srv-uv-vinyl',
    company_id: 'c-01',
    name: 'UV Vinyl Print',
    name_bn: 'ইউভি ভিনাইল প্রিন্ট',
    sku: 'SRV-UV-VINYL',
    category: 'large_format_printing',
    entity_type: 'service',
    product_type: 'print_service',
    commercial_type: 'service',
    measurement_type: 'area',
    pricing_method: 'per_area',
    unit: 'sft',
    selling_unit: 'sft',
    purchase_unit: 'roll',
    selling_price: 35.0, // ৳35 per sqft
    minimum_charge: 150.0,
    base_cost: 12.0,
    target_margin_percentage: 40.0,
    min_allowed_margin_percent: 15.0,
    min_order_quantity: 1,
    min_billable_quantity: 0,
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
          id: 'mat-vinyl',
          material_name: 'Vinyl Sticker',
          is_required: true,
          consumption_rule: 'roll_linear_length',
          allowance_per_side_in: 1.0,
          compatible_widths_ft: [3, 4, 5],
          consumption_unit: 'sqft',
        },
        {
          id: 'mat-ink',
          material_name: 'UV Ink',
          is_required: true,
          consumption_rule: 'area_sqft',
          allowance_per_side_in: 0,
          consumption_unit: 'ml',
        },
      ],
      finishing_options: [
        { id: 'fin-none', name: 'None', pricing_method: 'per_piece', unit_price: 0 },
        { id: 'fin-glossy', name: 'Glossy Lamination', pricing_method: 'per_sqft', unit_price: 5.0 },
        { id: 'fin-matte', name: 'Matte Lamination', pricing_method: 'per_sqft', unit_price: 6.0 },
      ],
      additional_options: [
        { id: 'add-pvc3mm', name: '3mm PVC Board Pasting', pricing_method: 'per_sqft', unit_price: 25.0 },
        { id: 'add-xstand', name: 'X-Stand Hardware', pricing_method: 'per_piece', unit_price: 350.0 },
      ],
      installation_options: [
        { id: 'inst-shop', name: 'Shop Delivery', fulfillment_type: 'delivery', pricing_method: 'per_piece', unit_price: 0 },
        { id: 'inst-onsite', name: 'On-Site Installation', fulfillment_type: 'installation', pricing_method: 'per_sqft', unit_price: 15.0 },
      ],
      pricing_method: 'per_area',
      minimum_charge: 150.0,
    },
  }

  test('calculates accurate pricing, geometry, and cost breakdown for 4ft x 12ft UV Vinyl', () => {
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

    // Customer area: 4 * 12 = 48 sqft per piece x 5 = 240 sqft total
    assert.strictEqual(quote.customer_single_area_sqft, 48)
    assert.strictEqual(quote.total_customer_area_sqft, 240)

    // Production geometry: 4ft + 2in (4.1667) x 12ft + 2in (12.1667) = 50.694 sqft per piece x 5 = 253.47 sqft total
    assert.strictEqual(quote.production_geometry.formatted_production_spec, '4ft 2in × 12ft 2in')
    assert.ok(Math.abs(quote.production_single_area_sqft - 50.69) < 0.1)
    assert.ok(Math.abs(quote.total_production_area_sqft - 253.47) < 0.5)

    // Commercial breakdown:
    // Base print: 240 sqft @ ৳35 = ৳8,400
    assert.strictEqual(quote.base_service_price, 8400)

    // Glossy lamination: 240 sqft @ ৳5 = ৳1,200
    assert.strictEqual(quote.finishing_total_price, 1200)

    // 3mm PVC Pasting: 240 sqft @ ৳25 = ৳6,000
    assert.strictEqual(quote.additional_total_price, 6000)

    // On-Site Installation: 240 sqft @ ৳15 = ৳3,600
    assert.strictEqual(quote.installation_total_price, 3600)

    // Subtotal: 8400 + 1200 + 6000 + 3600 = ৳19,200
    assert.strictEqual(quote.subtotal_price, 19200)
    assert.strictEqual(quote.final_selling_price, 19200)

    // Commercial Snapshot for Invoice
    const snapshot = quote.commercial_snapshot
    assert.strictEqual(snapshot.service_name, 'UV Vinyl Print')
    assert.strictEqual(snapshot.dimensions_summary, '4 × 12 ft')
    assert.strictEqual(snapshot.quantity, 5)
    assert.strictEqual(snapshot.total_price, 19200)
    assert.ok(snapshot.selected_finishing?.includes('Glossy Lamination'))
    assert.ok(snapshot.selected_additional?.includes('3mm PVC Board Pasting'))
    assert.ok(snapshot.selected_installation?.includes('On-Site Installation'))
  })

  test('enforces minimum job charge for small sample print sizes', () => {
    // 1ft x 1ft sample print = 1 sqft @ ৳35 = ৳35, but minimum charge is ৳150
    const quote = calculateServiceCosting({
      service: uvVinylService,
      customer_width: 1,
      customer_length: 1,
      dimension_unit: 'ft',
      quantity: 1,
    })

    assert.strictEqual(quote.total_customer_area_sqft, 1)
    assert.strictEqual(quote.subtotal_price, 35)
    assert.strictEqual(quote.is_minimum_charge_applied, true)
    assert.strictEqual(quote.final_selling_price, 150)
  })

  test('generates immutable snapshot data preserving all transaction-time parameters', () => {
    const quote = calculateServiceCosting({
      service: uvVinylService,
      customer_width: 3,
      customer_length: 10,
      dimension_unit: 'ft',
      quantity: 2,
      selected_finishing_ids: ['fin-matte'],
    })

    const snapshot = quote.commercial_snapshot
    assert.ok(snapshot)
    assert.strictEqual(snapshot.unit_price, 35)
    assert.strictEqual(snapshot.total_area_sqft, 60) // 3*10*2 = 60
    assert.ok(snapshot.selected_finishing?.includes('Matte Lamination'))
  })
})
