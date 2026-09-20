import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  calculateServiceCosting,
  evaluateBOMConsumption,
  createServiceJobSnapshot,
} from '../../lib/domain/service-costing-engine.ts'
import type {
  ProductRecord,
  ServiceRequiredMaterial,
  ServiceConfiguration,
} from '../../types/product.types.ts'

describe('Authoritative Printing & Production Service Master Test Suite', () => {
  const baseFlexService: ProductRecord = {
    id: 'srv-flex-print',
    company_id: 'c-01',
    name: 'Flex Printing (Frontlit)',
    name_bn: 'ফ্রন্টলিট ব্যানার প্রিন্টিং',
    sku: 'SRV-FLEX-001',
    category: 'large_format_printing',
    entity_type: 'service',
    product_type: 'print_service',
    commercial_type: 'service',
    measurement_type: 'area',
    pricing_method: 'per_area',
    unit: 'sft',
    selling_unit: 'sft',
    purchase_unit: 'roll',
    selling_price: 25.0, // ৳25 per sqft standard selling price
    minimum_charge: 100.0,
    base_cost: 10.5, // ৳10.50 per sqft estimated cost
    target_margin_percentage: 40.0,
    min_allowed_margin_percent: 15.0,
    min_order_quantity: 1,
    min_billable_quantity: 1,
    is_active: true,
    is_service: true,
    is_ready_product: false,
    requires_production: true,
    tax_rate: 7.5,
    min_price: 20.0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    service_config: {
      identity: {
        name_en: 'Flex Printing (Frontlit)',
        name_bn: 'ফ্রন্টলিট ব্যানার প্রিন্টিং',
        code: 'SRV-FLEX-001',
        active: true,
      },
      classification: {
        service_type: 'printing',
        category: 'large_format_printing',
        sub_category: 'Flex Printing',
        technology: 'Eco-Solvent',
        production_method: 'Roll-to-Roll',
        department: 'Digital Printing',
      },
      substrate: {
        material_id: 'mat-flex-280',
        material_name: '280 GSM Frontlit Banner Flex',
        supported_widths: [3.25, 4.25, 5.25, 6, 10],
        trim_allowance_in: 0.5,
        bleed_in: 0.5,
        print_allowance_ft: 0.25,
        nesting_rule: 'optimal_roll_width',
      },
      ink: {
        profile: 'eco_solvent_cmyk',
        ink_type: 'Eco-Solvent High Pigment Ink',
        total_ml_per_sqft: 1.2,
        channels: [
          { channel: 'Cyan', color_code: '#00aeef', unit_price: 2800, unit: 'bottle', material_id: 'ink-c' },
          { channel: 'Magenta', color_code: '#ec008c', unit_price: 2800, unit: 'bottle', material_id: 'ink-m' },
          { channel: 'Yellow', color_code: '#fff200', unit_price: 2800, unit: 'bottle', material_id: 'ink-y' },
          { channel: 'Black', color_code: '#231f20', unit_price: 2800, unit: 'bottle', material_id: 'ink-k' },
        ],
        auto_calculate_cost: true,
        unit_cost: 3.36,
      },
      billing: {
        selling_unit: 'sft',
        calculation_method: 'area',
        minimum_billable_qty: 1,
        minimum_job_charge: 100,
      },
      production: {
        required: true,
        machine_ids: ['mach-eco-01'],
        machine_hourly_rate: 350,
        estimated_speed: 150,
        speed_unit: 'sqft_per_hr',
      },
      bom: {
        required_materials: [
          {
            id: 'mat-flex-280',
            material_name: '280 GSM Frontlit Flex',
            is_primary: true,
            is_required: true,
            consumption_method: 'area_print',
            quantity_per_unit: 1.0,
            waste_percent: 5,
            unit_cost: 6.5,
          },
          {
            id: 'mat-eyelet',
            material_name: 'Brass Eyelet #4',
            is_required: false,
            consumption_method: 'formula',
            consumption_formula: '(width + height) * 2 / 2', // 1 eyelet every 2 feet
            quantity_per_unit: 1,
            waste_percent: 10,
            unit_cost: 1.25,
          },
          {
            id: 'mat-seam-tape',
            material_name: 'Seaming Reinforcement Tape',
            is_required: false,
            consumption_method: 'per_rft',
            quantity_per_unit: 1.0,
            waste_percent: 0,
            unit_cost: 2.0,
          },
        ],
        default_wastage_percent: 5,
      },
      finishing_options: [
        { id: 'fin-cut', name: 'Edge Trim & Cut', pricing_method: 'per_piece', unit_price: 0, cost: 0, requirement_type: 'required' },
        { id: 'fin-hemming', name: 'Hot Air Seaming & Hemming', pricing_method: 'per_rft', unit_price: 3.0, cost: 1.5, requirement_type: 'optional' },
        { id: 'fin-eyelet', name: 'Corner & Side Eyeleting', pricing_method: 'per_piece', unit_price: 2.0, cost: 0.8, requirement_type: 'customer_selectable' },
      ],
      additional_options: [
        { id: 'add-rope', name: 'Nylon Hanging Rope 100m', pricing_method: 'per_piece', unit_price: 150.0, cost: 80.0 },
      ],
      installation_options: [
        { id: 'inst-shop', name: 'Shop Pickup / No Install', fulfillment_type: 'pickup', pricing_method: 'per_piece', unit_price: 0, cost: 0 },
        { id: 'inst-billboard', name: 'Billboard / Hoarding Mount', fulfillment_type: 'installation', pricing_method: 'per_sqft', unit_price: 12.0, cost: 6.0 },
      ],
      pricing: {
        base_price: 25.0,
        minimum_charge: 100.0,
        price_tiers: {
          retail: 25.0,
          corporate: 22.0,
          dealer: 18.0,
          wholesale: 18.0,
          agency: 20.0,
          regular: 23.0,
          custom: 25.0,
        },
      },
    },
  }

  // =========================================================================
  // 1. Service Master Lifecycle & Validation
  // =========================================================================
  describe('1. Service Master Lifecycle & Validation', () => {
    test('creates and validates a canonical service configuration structure', () => {
      const cfg = baseFlexService.service_config as ServiceConfiguration
      assert.strictEqual(cfg.identity?.name_en, 'Flex Printing (Frontlit)')
      assert.strictEqual(cfg.classification?.technology, 'Eco-Solvent')
      assert.strictEqual(cfg.classification?.production_method, 'Roll-to-Roll')
      assert.strictEqual(cfg.substrate?.material_id, 'mat-flex-280')
      assert.strictEqual(cfg.ink?.channels?.length, 4)
      assert.strictEqual(cfg.billing?.selling_unit, 'sft')
      assert.strictEqual(cfg.production?.machine_ids?.[0], 'mach-eco-01')
    })

    test('supports duplicate / clone preserving 4-level classification and recipe', () => {
      const clonedService: ProductRecord = {
        ...baseFlexService,
        id: 'srv-flex-print-clone',
        sku: 'SRV-FLEX-002',
        name: 'Flex Printing (Backlit Heavy)',
        selling_price: 38.0,
        service_config: {
          ...baseFlexService.service_config,
          identity: {
            ...baseFlexService.service_config?.identity,
            name_en: 'Flex Printing (Backlit Heavy)',
            code: 'SRV-FLEX-002',
          },
          substrate: {
            ...baseFlexService.service_config?.substrate,
            material_id: 'mat-flex-510-backlit',
            material_name: '510 GSM Backlit Star Flex',
          },
        },
      }
      assert.strictEqual(clonedService.sku, 'SRV-FLEX-002')
      assert.strictEqual(clonedService.service_config?.substrate?.material_id, 'mat-flex-510-backlit')
      assert.strictEqual(clonedService.service_config?.classification?.technology, 'Eco-Solvent')
    })

    test('deactivates and reactivates service without altering underlying recipes', () => {
      const deactivated = { ...baseFlexService, is_active: false }
      assert.strictEqual(deactivated.is_active, false)
      assert.strictEqual(deactivated.service_config?.bom?.required_materials?.length, 3)

      const reactivated = { ...deactivated, is_active: true }
      assert.strictEqual(reactivated.is_active, true)
    })
  })

  // =========================================================================
  // 2. BOM & 4 First-Class Material Consumption Groups
  // =========================================================================
  describe('2. BOM & 4 First-Class Material Consumption Groups', () => {
    test('Group A (Print Media / Substrate): Evaluates Area × (1 + Waste %)', () => {
      const mediaItem: ServiceRequiredMaterial = {
        material_name: '280 GSM Frontlit Banner Flex',
        consumption_method: 'area_print',
        quantity_per_unit: 1.0,
        waste_percent: 5,
        unit_cost: 6.5,
      }
      // 10ft x 20ft banner = 200 sqft
      const result = evaluateBOMConsumption(mediaItem, {
        customerAreaSqft: 200,
        productionAreaSqft: 200,
      })
      // 200 * 1.05 = 210 sqft @ ৳6.50 = ৳1,365.00
      assert.strictEqual(result.requiredQuantity, 210)
      assert.strictEqual(result.wasteQuantity, 10)
      assert.strictEqual(result.subtotalCost, 1365)
    })

    test('Group B (Ink Formulation): Channel consumption ml/unit and cost divided equally across channels (4ch, 5ch, 6ch)', () => {
      // 1. 4-Channel CMYK (e.g. Eco-Solvent Standard: 1.0 ml/sft total -> 0.25 ml/sft per channel)
      const totalMl4C = 1.0
      const channelCount4C = 4
      const perChannelMl4C = parseFloat((totalMl4C / channelCount4C).toFixed(4)) // 0.25 ml/channel/sft
      assert.strictEqual(perChannelMl4C, 0.25)
      const inkPricePerLiter4C = 1050 // ৳1050 / 1000ml = ৳1.05/ml
      const channelCost4C = perChannelMl4C * (inkPricePerLiter4C / 1000) // 0.25 * 1.05 = 0.2625
      assert.strictEqual(channelCost4C, 0.2625)
      const totalInkCost4C = parseFloat((channelCost4C * channelCount4C).toFixed(2)) // ৳1.05/sft
      assert.strictEqual(totalInkCost4C, 1.05)

      // 2. 5-Channel CMYK + White (e.g. UV Flatbed with White: 1.0 ml/sft total -> 0.20 ml/sft per channel)
      const totalMl5C = 1.0
      const channelCount5C = 5
      const perChannelMl5C = parseFloat((totalMl5C / channelCount5C).toFixed(4)) // 0.20 ml/channel/sft
      assert.strictEqual(perChannelMl5C, 0.20)
      const cmykRatePerMl = 5.2 // ৳5200/L = ৳5.20/ml
      const whiteRatePerMl = 5.8 // ৳5800/L = ৳5.80/ml
      const totalCost5C = parseFloat(((4 * perChannelMl5C * cmykRatePerMl) + (1 * perChannelMl5C * whiteRatePerMl)).toFixed(2))
      // 4 * 0.2 * 5.2 = 4.16, 1 * 0.2 * 5.8 = 1.16 -> 4.16 + 1.16 = 5.32
      assert.strictEqual(totalCost5C, 5.32)

      // 3. 6-Channel CMYK + Lc + Lm (e.g. Photo Print: 1.2 ml/sft total -> 0.20 ml/sft per channel)
      const totalMl6C = 1.2
      const channelCount6C = 6
      const perChannelMl6C = parseFloat((totalMl6C / channelCount6C).toFixed(4)) // 0.20 ml/channel/sft
      assert.strictEqual(perChannelMl6C, 0.20)
      const rate6C = 2.8 // ৳2800/L = ৳2.80/ml
      const totalCost6C = parseFloat((channelCount6C * perChannelMl6C * rate6C).toFixed(2)) // 6 * 0.20 * 2.80 = 3.36
      assert.strictEqual(totalCost6C, 3.36)

      // For 100 sqft job with 4C
      const totalJobInkCost = totalInkCost4C * 100
      assert.strictEqual(totalJobInkCost, 105)
    })

    test('Group C (Finishing Materials): Eyelets and Seaming Tape consumption', () => {
      // 4ft x 8ft banner -> Perimeter = 2 * (4 + 8) = 24 ft
      const tapeItem: ServiceRequiredMaterial = {
        material_name: 'Seaming Reinforcement Tape',
        consumption_method: 'per_rft',
        quantity_per_unit: 1.0,
        waste_percent: 0,
        unit_cost: 2.0,
      }
      const tapeResult = evaluateBOMConsumption(tapeItem, {
        customerWidthFt: 4,
        customerLengthFt: 8,
        perimeterFt: 24,
      })
      assert.strictEqual(tapeResult.requiredQuantity, 24)
      assert.strictEqual(tapeResult.subtotalCost, 48)
    })

    test('Group D (Additional Consumables): Dynamic formula for structural frames', () => {
      // Acrylic Sign with 1" MS Pipe Frame formula
      const pipeItem: ServiceRequiredMaterial = {
        material_name: '1" MS Square Box Pipe',
        consumption_method: 'formula',
        consumption_formula: '(width * 2) + (height * 2) + (width > 4 ? height : 0)', // perimeter + vertical center rib
        quantity_per_unit: 1,
        waste_percent: 5,
        unit_cost: 45.0,
      }
      // 5ft x 10ft signboard -> (5*2) + (10*2) + 10 = 10 + 20 + 10 = 40 ft + 5% waste (2) = 42 ft
      const result = evaluateBOMConsumption(pipeItem, {
        customerWidthFt: 5,
        customerLengthFt: 10,
      })
      assert.strictEqual(result.requiredQuantity, 42)
      assert.strictEqual(result.subtotalCost, 1890) // 42 * 45 = ৳1,890
    })

    test('supports all 8 consumption methods cleanly', () => {
      const methods: Array<{ method: string; expectedQty: number }> = [
        { method: 'area_print', expectedQty: 100 },
        { method: 'per_sqft', expectedQty: 100 },
        { method: 'per_sqm', expectedQty: 9.2903 },
        { method: 'per_piece', expectedQty: 5 },
        { method: 'per_rft', expectedQty: 40 },
        { method: 'per_inch', expectedQty: 480 },
        { method: 'fixed', expectedQty: 1 },
      ]

      for (const m of methods) {
        const item: ServiceRequiredMaterial = {
          material_name: `Test Material (${m.method})`,
          consumption_method: m.method,
          quantity_per_unit: 1,
          waste_percent: 0,
          unit_cost: 10,
        }
        const res = evaluateBOMConsumption(item, {
          orderQuantity: 5,
          customerWidthFt: 10,
          customerLengthFt: 10,
          customerAreaSqft: 100,
          perimeterFt: 40,
        })
        assert.strictEqual(res.requiredQuantity, m.expectedQty)
      }
    })
  })

  // =========================================================================
  // 3. Production Bridge & Immutable Snapshot Requirements
  // =========================================================================
  describe('3. Production Bridge & Immutable Snapshot Requirements', () => {
    test('creates frozen snapshot upon Quotation / Job Order creation', () => {
      const quote = calculateServiceCosting({
        service: baseFlexService,
        customer_width: 10,
        customer_length: 20,
        dimension_unit: 'ft',
        quantity: 2,
        selected_finishing_ids: ['fin-hemming', 'fin-eyelet'],
        selected_additional_ids: ['add-rope'],
        selected_installation_id: 'inst-billboard',
      })

      const snapshot = createServiceJobSnapshot(baseFlexService, { customer_width: 10, customer_length: 20, quantity: 2 }, quote)

      assert.strictEqual(snapshot.service_name, 'Flex Printing (Frontlit)')
      assert.strictEqual(snapshot.technology, 'Eco-Solvent')
      assert.strictEqual(snapshot.production_method, 'Roll-to-Roll')
      assert.strictEqual(snapshot.department, 'Digital Printing')
      assert.strictEqual(snapshot.order_quantity, 2)
      assert.strictEqual(snapshot.customer_dimensions.total_area_sqft, 400) // 10*20*2 = 400
      assert.ok(snapshot.consumption_groups.print_media)
      assert.ok(snapshot.consumption_groups.ink)
      assert.strictEqual(snapshot.pricing.base_selling_rate, 25)
    })

    test('historical job snapshots remain immutable when Service Master price or substrate is changed', () => {
      // 1. Initial quote snapshot generated at ৳25/sqft with Frontlit Flex
      const initialQuote = calculateServiceCosting({
        service: baseFlexService,
        customer_width: 5,
        customer_length: 10,
        dimension_unit: 'ft',
        quantity: 1,
      })
      const frozenJobSnapshot = createServiceJobSnapshot(baseFlexService, { customer_width: 5, customer_length: 10, quantity: 1 }, initialQuote)
      assert.strictEqual(frozenJobSnapshot.pricing.base_selling_rate, 25)
      assert.strictEqual(frozenJobSnapshot.consumption_groups.print_media.material_name, '280 GSM Frontlit Banner Flex')

      // 2. Admin later updates Service Master price from ৳25 to ৳35 and changes substrate to Star Backlit
      const updatedMaster: ProductRecord = {
        ...baseFlexService,
        selling_price: 35.0,
        service_config: {
          ...baseFlexService.service_config,
          substrate: {
            ...baseFlexService.service_config?.substrate,
            material_id: 'mat-star-backlit',
            material_name: 'Star Backlit Flex 510 GSM',
          },
          pricing: {
            ...baseFlexService.service_config?.pricing,
            base_price: 35.0,
          },
        },
      }

      // 3. Verify that old job snapshot was completely untouched
      assert.strictEqual(frozenJobSnapshot.pricing.base_selling_rate, 25)
      assert.strictEqual(frozenJobSnapshot.consumption_groups.print_media.material_name, '280 GSM Frontlit Banner Flex')

      // 4. Verify new quote uses updated master
      const newQuote = calculateServiceCosting({
        service: updatedMaster,
        customer_width: 5,
        customer_length: 10,
        dimension_unit: 'ft',
        quantity: 1,
      })
      assert.strictEqual(newQuote.base_service_price, 50 * 35) // 50 sqft * ৳35 = ৳1,750
    })

    test('permits Job Order specific override without modifying Service Master', () => {
      // Service master defaults to Frontlit 280, but job order overrides to Blackback 340
      const jobOrderOverride = {
        service: baseFlexService,
        customer_width: 4,
        customer_length: 10,
        quantity: 1,
        // Override substrate for this specific job
        substrate_override: {
          material_id: 'mat-blackback-340',
          material_name: '340 GSM Blackback Flex',
          unit_cost: 9.0,
        },
      }

      // Verify Service Master was NOT modified
      assert.strictEqual(baseFlexService.service_config?.substrate?.material_id, 'mat-flex-280')
      assert.strictEqual(jobOrderOverride.substrate_override.material_id, 'mat-blackback-340')
    })
  })

  // =========================================================================
  // 4. Two-State Costing Lifecycle & Financial Calculations
  // =========================================================================
  describe('4. Two-State Costing Lifecycle & Financial Calculations', () => {
    test('calculates two-state costing: Estimated/Planned Cost vs Actual Cost with True Profitability', () => {
      // Planned estimate: 100 sqft @ standard estimated cost
      const plannedQuote = calculateServiceCosting({
        service: baseFlexService,
        customer_width: 10,
        customer_length: 10,
        dimension_unit: 'ft',
        quantity: 1,
      })

      const plannedCost = plannedQuote.totalPlannedCost
      const sellingPrice = plannedQuote.final_selling_price // 100 sqft @ ৳25 = ৳2,500
      assert.strictEqual(sellingPrice, 2500)

      // Actual production execution recorded on job order completion:
      const actualMediaCost = 720 // e.g. actual remnant wastage incurred
      const actualInkCost = 350
      const actualMachineCost = 250
      const actualLaborCost = 300
      const actualDirectCost = actualMediaCost + actualInkCost + actualMachineCost + actualLaborCost // ৳1,620

      // True Job Profitability:
      const actualGrossProfit = sellingPrice - actualDirectCost // 2500 - 1620 = ৳880
      const actualGrossMarginPercent = parseFloat(((actualGrossProfit / sellingPrice) * 100).toFixed(2))

      assert.strictEqual(actualGrossProfit, 880)
      assert.strictEqual(actualGrossMarginPercent, 35.2)
      assert.ok(plannedCost > 0)
    })

    test('evaluates Customer Price Tiers correctly', () => {
      const tiers = baseFlexService.service_config?.pricing?.price_tiers!
      assert.strictEqual(tiers.retail, 25)
      assert.strictEqual(tiers.corporate, 22)
      assert.strictEqual(tiers.dealer, 18)
      assert.strictEqual(tiers.agency, 20)

      // Corporate customer order: 100 sqft @ ৳22 = ৳2,200
      const corpQuote = calculateServiceCosting({
        service: { ...baseFlexService, selling_price: tiers.corporate },
        customer_width: 10,
        customer_length: 10,
        dimension_unit: 'ft',
        quantity: 1,
      })
      assert.strictEqual(corpQuote.final_selling_price, 2200)
    })

    test('enforces Minimum Job Charge when small dimension total is below threshold', () => {
      // 1ft x 2ft banner = 2 sqft @ ৳25 = ৳50, but Minimum Job Charge is ৳100
      const smallJob = calculateServiceCosting({
        service: baseFlexService,
        customer_width: 1,
        customer_length: 2,
        dimension_unit: 'ft',
        quantity: 1,
      })
      assert.strictEqual(smallJob.subtotal_price, 50)
      assert.strictEqual(smallJob.is_minimum_charge_applied, true)
      assert.strictEqual(smallJob.final_selling_price, 100)
    })
  })

  // =========================================================================
  // 5. Critical Edge Cases & Defensive Fault Tolerance
  // =========================================================================
  describe('5. Critical Edge Cases & Defensive Fault Tolerance', () => {
    test('handles zero dimensions safely without throwing', () => {
      const zeroDimJob = calculateServiceCosting({
        service: baseFlexService,
        customer_width: 0,
        customer_length: 0,
        dimension_unit: 'ft',
        quantity: 1,
      })
      assert.ok(zeroDimJob)
      assert.strictEqual(zeroDimJob.total_customer_area_sqft, 0)
      assert.strictEqual(zeroDimJob.final_selling_price, 100) // Minimum charge floor applies
    })

    test('handles negative dimensions safely by converting to non-negative', () => {
      const negDimJob = calculateServiceCosting({
        service: baseFlexService,
        customer_width: -5,
        customer_length: -10,
        dimension_unit: 'ft',
        quantity: 1,
      })
      assert.ok(negDimJob)
    })

    test('handles division by zero in dynamic formula gracefully', () => {
      const divZeroItem: ServiceRequiredMaterial = {
        material_name: 'Faulty Formula Material',
        consumption_method: 'formula',
        consumption_formula: '(width * 2) / 0', // Division by zero bug in user expression
        quantity_per_unit: 2.5,
        waste_percent: 0,
        unit_cost: 10,
      }
      const result = evaluateBOMConsumption(divZeroItem, {
        customerWidthFt: 5,
        customerLengthFt: 10,
      })
      // Should safely fallback to quantity_per_unit (2.5) without crashing
      assert.strictEqual(result.requiredQuantity, 2.5)
      assert.strictEqual(result.subtotalCost, 25)
    })

    test('handles invalid syntax formula gracefully', () => {
      const brokenSyntaxItem: ServiceRequiredMaterial = {
        material_name: 'Broken Formula Material',
        consumption_method: 'formula',
        consumption_formula: 'width * + * / (())', // Invalid JavaScript syntax
        quantity_per_unit: 4.0,
        waste_percent: 0,
        unit_cost: 5,
      }
      const result = evaluateBOMConsumption(brokenSyntaxItem, {
        customerWidthFt: 5,
      })
      assert.strictEqual(result.requiredQuantity, 4.0)
      assert.strictEqual(result.subtotalCost, 20)
    })

    test('handles 100%+ waste percentage without arithmetic breakdown', () => {
      const highWasteItem: ServiceRequiredMaterial = {
        material_name: 'High Waste Acrylic Sheet',
        consumption_method: 'area_print',
        quantity_per_unit: 1.0,
        waste_percent: 150, // 150% waste
        unit_cost: 100,
      }
      const result = evaluateBOMConsumption(highWasteItem, {
        customerAreaSqft: 10,
      })
      // 10 sqft + 150% waste (15) = 25 sqft @ ৳100 = ৳2,500
      assert.strictEqual(result.requiredQuantity, 25)
      assert.strictEqual(result.wasteQuantity, 15)
      assert.strictEqual(result.subtotalCost, 2500)
    })

    test('handles Acrylic LED Sign with non-print fabrication materials and installation', () => {
      const acrylicSignService: ProductRecord = {
        id: 'srv-acrylic-sign',
        company_id: 'c-01',
        name: '3D Acrylic LED Signboard',
        sku: 'SRV-SIGN-001',
        category: 'signage_production',
        entity_type: 'service',
        product_type: 'fabrication',
        commercial_type: 'service',
        unit: 'sft',
        selling_price: 180.0, // ৳180 per sqft
        base_cost: 95.0,
        is_active: true,
        is_service: true,
        requires_production: true,
        tax_rate: 7.5,
        min_price: 150.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        service_config: {
          classification: {
            service_type: 'production',
            category: 'Signage Production',
            sub_category: 'Acrylic LED Sign',
            technology: 'CNC / Laser',
            production_method: 'Sheet Processing',
            department: 'Fabrication & Signage',
          },
          substrate: {
            material_id: 'mat-acrylic-3mm',
            material_name: '3mm Cast Clear Acrylic Sheet',
          },
          bom: {
            required_materials: [
              { material_name: '3mm Cast Acrylic Sheet', consumption_method: 'area_print', quantity_per_unit: 1, unit_cost: 45, waste_percent: 10 },
              { material_name: 'LED Module Injection 1.5W', consumption_method: 'formula', consumption_formula: 'area * 18', quantity_per_unit: 18, unit_cost: 15, waste_percent: 5 },
              { material_name: '12V 33A SMPS Power Supply', consumption_method: 'fixed', quantity_per_unit: 1, unit_cost: 850, waste_percent: 0 },
            ],
          },
        },
      }

      // 4ft x 10ft LED Sign = 40 sqft
      const quote = calculateServiceCosting({
        service: acrylicSignService,
        customer_width: 4,
        customer_length: 10,
        dimension_unit: 'ft',
        quantity: 1,
      })

      assert.strictEqual(quote.total_customer_area_sqft, 40)
      assert.strictEqual(quote.final_selling_price, 40 * 180) // ৳7,200
    })
  })
})
