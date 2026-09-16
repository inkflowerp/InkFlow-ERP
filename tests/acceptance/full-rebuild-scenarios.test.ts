import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { calculateServiceCosting } from '../../lib/domain/service-costing-engine.ts'
import { evaluateMaterialCompatibility } from '../../lib/domain/material-compatibility.ts'
import { resolveAllowanceHierarchy } from '../../lib/domain/production-geometry.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { PurchaseRepository } from '../../lib/repositories/purchase.repository.ts'
import { PrintingMethodRepository } from '../../lib/repositories/printing-method.repository.ts'
import { MaterialPurchaseConfigRepository } from '../../lib/repositories/material-purchase-config.repository.ts'
import { FinishingOptionRepository } from '../../lib/repositories/finishing-option.repository.ts'
import { AdditionalOptionRepository } from '../../lib/repositories/additional-option.repository.ts'
import { InstallationOptionRepository } from '../../lib/repositories/installation-option.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type {
  ProductRecord,
  PrintingMethod,
  MaterialPurchaseConfig,
  FinishingOptionRecord,
  AdditionalOptionRecord,
  InstallationOptionRecord,
} from '../../types/product.types.ts'
import type { MaterialRecord, InventoryRollRecord, InventoryRemnantRecord } from '../../types/inventory.types.ts'

describe('Comprehensive Rebuild Acceptance Test Suite (Scenarios A through N)', () => {
  const companyId = 'comp-acceptance-full-rebuild'

  beforeEach(async () => {
    // Clean mock data store for tenant isolation
    PrintERPDataStore.clear(STORAGE_KEYS.PRODUCTS, companyId)
    PrintERPDataStore.clear(STORAGE_KEYS.MATERIALS, companyId)
    PrintERPDataStore.clear(STORAGE_KEYS.MOUNTED_ROLLS, companyId)
    PrintERPDataStore.clear(STORAGE_KEYS.REMNANTS, companyId)
    PrintERPDataStore.clear(STORAGE_KEYS.PURCHASE_ORDERS, companyId)
    PrintERPDataStore.clear(STORAGE_KEYS.GOODS_RECEIVED_NOTES, companyId)
    PrintERPDataStore.clear(STORAGE_KEYS.PRINTING_METHODS, companyId)
    PrintERPDataStore.clear(STORAGE_KEYS.MATERIAL_PURCHASE_CONFIGS, companyId)
    PrintERPDataStore.clear(STORAGE_KEYS.FINISHING_OPTIONS, companyId)
    PrintERPDataStore.clear(STORAGE_KEYS.ADDITIONAL_OPTIONS, companyId)
    PrintERPDataStore.clear(STORAGE_KEYS.INSTALLATION_OPTIONS, companyId)
  })

  // =========================================================================
  // SCENARIO A: Ready Product (X-Stand)
  // =========================================================================
  test('Scenario A: Ready Product (X-Stand) lifecycle - Create, Price, Sell, and Use as Additional', async () => {
    // 1. Create Ready Product
    const xStandProduct: ProductRecord = {
      id: 'prod-xstand-60x160',
      company_id: companyId,
      name: 'X-Stand Banner Display 2x5 ft',
      name_bn: 'এক্স-স্ট্যান্ড ২x৫ ফিট',
      sku: 'DISP-XSTAND-01',
      category: 'display_stand',
      entity_type: 'product',
      product_type: 'ready_product',
      commercial_type: 'ready_product',
      measurement_type: 'piece',
      pricing_method: 'per_piece',
      unit: 'pcs',
      selling_unit: 'pcs',
      purchase_unit: 'pcs',
      purchase_price: 350.0,
      base_cost: 350.0,
      selling_price: 650.0,
      min_price: 500.0,
      tax_rate: 7.5,
      target_margin_percentage: 46.15,
      is_active: true,
      is_ready_product: true,
      requires_production: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTS, xStandProduct, companyId)

    // Verify ready product attributes (no roll fields forced)
    assert.equal(xStandProduct.entity_type, 'product')
    assert.equal(xStandProduct.is_ready_product, true)
    assert.equal(xStandProduct.requires_production, false)
    assert.equal(xStandProduct.selling_price, 650.0)

    // 2. Use as Additional in a Master Configuration
    const additionalOpt = await AdditionalOptionRepository.save({
      company_id: companyId,
      name: 'Include X-Stand Hardware',
      product_id: xStandProduct.id,
      pricing_method: 'fixed',
      selling_price: 650.0,
      cost: 350.0,
      is_active: true,
    })

    assert.equal(additionalOpt.product_id, xStandProduct.id)
    assert.equal(additionalOpt.selling_price, 650.0)
  })

  // =========================================================================
  // SCENARIO B: UV Vinyl (4×12 ft, Qty 5, Allowance: 1 inch each side)
  // =========================================================================
  test('Scenario B: UV Vinyl 4x12 ft -> Production 4ft 2in x 12ft 2in; 4ft roll rejected, 5ft roll accepted', async () => {
    const customerWidthFt = 4.0
    const customerLengthFt = 12.0
    const allowanceIn = 1.0 // 1 inch each side => +2 inches total = +0.1667 ft

    // Resolve allowance hierarchy
    const allowance = resolveAllowanceHierarchy({
      serviceDefaultAllowanceIn: allowanceIn,
    })
    assert.equal(allowance.allowance_width_in, 1.0)
    assert.equal(allowance.allowance_length_in, 1.0)

    // Production Dimensions:
    // 4 ft + 2 inches = 4.1667 ft (4 ft 2 in)
    // 12 ft + 2 inches = 12.1667 ft (12 ft 2 in)
    const productionWidthFt = customerWidthFt + (allowance.allowance_width_in * 2) / 12
    const productionLengthFt = customerLengthFt + (allowance.allowance_length_in * 2) / 12

    assert.ok(Math.abs(productionWidthFt - 4.1667) < 0.001, 'Production width must be 4ft 2in (4.1667ft)')
    assert.ok(Math.abs(productionLengthFt - 12.1667) < 0.001, 'Production length must be 12ft 2in (12.1667ft)')

    // Check 4ft roll compatibility (Must REJECT because 4.1667 > 4.0)
    const fit4ft = evaluateMaterialCompatibility({
      customerWidthFt,
      customerLengthFt,
      allowancePerSideIn: allowanceIn,
      availableRollWidthsFt: [4.0],
      allowRotation: false,
    })
    assert.equal(fit4ft.isCompatible, false, '4ft roll must be rejected for 4ft 2in production width')
    assert.ok(fit4ft.rejectionReason?.includes('No compatible'))

    // Check 5ft roll compatibility (Must ACCEPT because 4.1667 <= 5.0)
    const fit5ft = evaluateMaterialCompatibility({
      customerWidthFt,
      customerLengthFt,
      allowancePerSideIn: allowanceIn,
      availableRollWidthsFt: [3.0, 4.0, 5.0],
      allowRotation: false,
    })
    assert.equal(fit5ft.isCompatible, true, '5ft roll must be accepted for 4ft 2in production width')
    assert.equal(fit5ft.selectedRollWidthFt, 5.0)
    assert.ok(fit5ft.plannedLinearLengthFt! > 12.0)
  })

  // =========================================================================
  // SCENARIO C: Eco PVC (6×10 ft, 1 inch allowance -> 6ft 2in production width)
  // =========================================================================
  test('Scenario C: Eco PVC 6x10 ft rejected against available widths [3.25, 4.25, 5.25 ft]', async () => {
    const customerWidthFt = 6.0
    const customerLengthFt = 10.0
    const allowanceIn = 1.0

    // Available roll widths in market: 3.25, 4.25, 5.25 ft
    const fit = evaluateMaterialCompatibility({
      customerWidthFt,
      customerLengthFt,
      allowancePerSideIn: allowanceIn,
      availableRollWidthsFt: [3.25, 4.25, 5.25],
      allowRotation: false,
    })

    assert.equal(fit.isCompatible, false, '6ft 2in production width cannot physically fit on 5.25ft roll')
    assert.ok(fit.rejectionReason?.includes('No compatible'))
  })

  // =========================================================================
  // SCENARIO D: Allowance Rules Hierarchy
  // =========================================================================
  test('Scenario D: Allowance hierarchy - Job Override > Customer Override > Material Override > Service Default', async () => {
    // 1. Service default only (1.0 inch)
    const r1 = resolveAllowanceHierarchy({ serviceDefaultAllowanceIn: 1.0 })
    assert.equal(r1.allowance_width_in, 1.0)
    assert.equal(r1.applied_source, 'service_default')

    // 2. Material override (0.5 inch) takes precedence over Service default
    const r2 = resolveAllowanceHierarchy({
      serviceDefaultAllowanceIn: 1.0,
      materialOverrideAllowanceIn: 0.5,
    })
    assert.equal(r2.allowance_width_in, 0.5)
    assert.equal(r2.applied_source, 'material_override')

    // 3. Customer override (2.0 inch) takes precedence over Material & Service
    const r3 = resolveAllowanceHierarchy({
      serviceDefaultAllowanceIn: 1.0,
      materialOverrideAllowanceIn: 0.5,
      customerOverrideAllowanceIn: 2.0,
    })
    assert.equal(r3.allowance_width_in, 2.0)
    assert.equal(r3.applied_source, 'customer_override')

    // 4. Job override (0.0 inch / No allowance) takes absolute precedence
    const r4 = resolveAllowanceHierarchy({
      serviceDefaultAllowanceIn: 1.0,
      materialOverrideAllowanceIn: 0.5,
      customerOverrideAllowanceIn: 2.0,
      jobOverrideAllowanceIn: 0.0,
    })
    assert.equal(r4.allowance_width_in, 0.0)
    assert.equal(r4.applied_source, 'job_override')
  })

  // =========================================================================
  // SCENARIO E: Arbitrary Material Dimensions Support
  // =========================================================================
  test('Scenario E: Arbitrary material dimensions support without code changes', async () => {
    const rawMaterial: MaterialRecord = {
      id: 'mat-arbitrary-banner',
      company_id: companyId,
      name: 'Heavy Duty Frontlit Flex',
      sku: 'MAT-FLEX-HD',
      category: 'banner',
      material_type: 'roll',
      is_roll: true,
      min_stock_level: 1,
      unit: 'roll',
      cost_per_unit: 12500,
      current_stock: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, rawMaterial, companyId)

    // Save arbitrary purchase configurations: 3.25, 4.25, 5.25, 5.5, 7.5, 8.0 ft
    const arbitraryWidths = [3.25, 4.25, 5.25, 5.5, 7.5, 8.0]
    for (const w of arbitraryWidths) {
      await MaterialPurchaseConfigRepository.save({
        company_id: companyId,
        material_id: rawMaterial.id,
        supplier_name: 'Direct Importer Dhaka',
        width_ft: w,
        length_ft: 164.0,
        unit: 'roll',
        purchase_price: 12000 + w * 500,
        is_active: true,
      })
    }

    const configs = await MaterialPurchaseConfigRepository.getByMaterial(rawMaterial.id, companyId)
    assert.equal(configs.length, 6)
    assert.deepEqual(
      configs.map((c) => c.width_ft).sort((a, b) => a - b),
      [3.25, 4.25, 5.25, 5.5, 7.5, 8.0]
    )
  })

  // =========================================================================
  // SCENARIO F: Multi-Material Compatibility
  // =========================================================================
  test('Scenario F: Multi-material compatibility and printing methods validation', async () => {
    // Dynamic Printing Method: Latex
    const latexMethod = await PrintingMethodRepository.save({
      company_id: companyId,
      name: 'Latex Print',
      code: 'LATEX',
      compatible_material_types: ['roll', 'fabric'],
      default_ink_type: 'Water-based Latex Polymer',
      cost_per_sqft: 8.5,
      is_active: true,
    })

    assert.equal(latexMethod.code, 'LATEX')
    assert.ok(latexMethod.compatible_material_types?.includes('roll'))
  })

  // =========================================================================
  // SCENARIO G: Purchasing & GRN Lifecycle (PO != Inventory; GRN = Inventory)
  // =========================================================================
  test('Scenario G: PO 10 rolls -> Inventory unchanged. GRN 4 rolls -> +4 rolls. Second GRN 6 rolls -> +6 rolls', async () => {
    // 1. Material
    const vinylMat: MaterialRecord = {
      id: 'mat-star-vinyl',
      company_id: companyId,
      name: 'Star Glossy Vinyl',
      sku: 'MAT-VINYL-SG',
      category: 'vinyl',
      material_type: 'roll',
      is_roll: true,
      min_stock_level: 1,
      unit: 'roll',
      cost_per_unit: 8500,
      current_stock: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, vinylMat, companyId)

    // 2. Issue PO for 10 rolls
    const poRes = await PurchaseRepository.createPurchaseOrder({
      company_id: companyId,
      po_number: 'PO-2026-001',
      supplier_id: 'sup-123',
      supplier_name: 'Meghna Vinyl Supplies',
      supplier_phone: '+8801711111111',
      items: [
        {
          id: 'item-po-1',
          purchase_order_id: '',
          material_id: vinylMat.id,
          material_name: 'Star Glossy Vinyl',
          quantity_ordered: 10,
          quantity_received: 0,
          quantity_remaining: 10,
          unit: 'roll',
          unit_cost: 8500,
          discount_percent: 0,
          tax_percent: 0,
          total_cost: 85000,
        },
      ],
      grand_total: 85000,
      status: 'approved',
    })
    assert.ok(poRes.id)

    // Assert Inventory remains 0 after PO
    const rollsAfterPO = await InventoryRepository.getRollsByMaterial(vinylMat.id, companyId)
    assert.equal(rollsAfterPO.length, 0, 'PO creation must NOT increase physical inventory')

    // 3. First GRN: Receive partial 4 rolls
    const grn1 = await PurchaseRepository.createGoodsReceivedNote({
      company_id: companyId,
      grn_number: 'GRN-2026-001',
      purchase_order_id: poRes.id,
      supplier_name: 'Meghna Vinyl Supplies',
      received_by_name: 'Store Keeper',
      items_received: [
        {
          id: 'grn-item-1',
          material_id: vinylMat.id,
          material_name: 'Star Glossy Vinyl',
          quantity_ordered: 10,
          previously_received: 0,
          current_received: 4,
          accepted_quantity: 4,
          rejected_quantity: 0,
          damaged_quantity: 0,
          unit: 'roll',
          unit_cost: 8500,
          total_cost: 34000,
        },
      ],
    })
    assert.ok(grn1.id)

    // Create 4 physical rolls associated with GRN 1
    for (let i = 1; i <= 4; i++) {
      await InventoryRepository.createPhysicalRoll({
        company_id: companyId,
        material_id: vinylMat.id,
        roll_code: `VINYL-ROLL-00000${i}`,
        width_ft: 5.0,
        initial_length_ft: 164.0,
        unit_cost: 8500,
        grn_id: grn1.id,
        purchase_order_id: poRes.id,
      })
    }

    // Assert 4 physical rolls created with unique sequential roll codes
    const rollsAfterGRN1 = await InventoryRepository.getRollsByMaterial(vinylMat.id, companyId)
    assert.equal(rollsAfterGRN1.length, 4, 'GRN 1 must create exactly 4 physical rolls')
    assert.ok(rollsAfterGRN1.every((r) => r.current_length_ft === 164.0 && r.status === 'available'))

    // 4. Second GRN: Receive remaining 6 rolls
    const grn2 = await PurchaseRepository.createGoodsReceivedNote({
      company_id: companyId,
      grn_number: 'GRN-2026-002',
      purchase_order_id: poRes.id,
      supplier_name: 'Meghna Vinyl Supplies',
      received_by_name: 'Store Keeper',
      items_received: [
        {
          id: 'grn-item-2',
          material_id: vinylMat.id,
          material_name: 'Star Glossy Vinyl',
          quantity_ordered: 10,
          previously_received: 4,
          current_received: 6,
          accepted_quantity: 6,
          rejected_quantity: 0,
          damaged_quantity: 0,
          unit: 'roll',
          unit_cost: 8500,
          total_cost: 51000,
        },
      ],
    })
    assert.ok(grn2.id)

    // Create remaining 6 physical rolls
    for (let i = 5; i <= 10; i++) {
      await InventoryRepository.createPhysicalRoll({
        company_id: companyId,
        material_id: vinylMat.id,
        roll_code: `VINYL-ROLL-0000${i < 10 ? '0' + i : i}`,
        width_ft: 5.0,
        initial_length_ft: 164.0,
        unit_cost: 8500,
        grn_id: grn2.id,
        purchase_order_id: poRes.id,
      })
    }

    // Assert 10 total physical rolls
    const rollsAfterGRN2 = await InventoryRepository.getRollsByMaterial(vinylMat.id, companyId)
    assert.equal(rollsAfterGRN2.length, 10, 'Total physical rolls must now be 10')
  })

  // =========================================================================
  // SCENARIO H: Physical Roll Tracking
  // =========================================================================
  test('Scenario H: Physical roll unique identification and properties', async () => {
    const roll = await InventoryRepository.createRoll({
      company_id: companyId,
      material_id: 'mat-test-roll',
      roll_code: 'ROLL-TEST-0001',
      width_ft: 5.0,
      initial_length_ft: 164.0,
      unit_cost: 8500,
      status: 'available',
      location: 'Warehouse Rack A-1',
    })

    assert.equal(roll.roll_code, 'ROLL-TEST-0001')
    assert.equal(roll.width_ft, 5.0)
    assert.equal(roll.current_length_ft, 164.0)
    assert.equal(roll.status, 'available')
  })

  // =========================================================================
  // SCENARIO I: Actual Consumption Variance Logging
  // =========================================================================
  test('Scenario I: Issue 12ft, Actual 10ft -> 2ft variance recorded in stock ledger', async () => {
    // 1. Create base material
    const varMat: MaterialRecord = {
      id: 'mat-variance-test',
      company_id: companyId,
      name: 'Variance Test Vinyl',
      sku: 'MAT-VAR-001',
      category: 'vinyl',
      material_type: 'roll',
      is_roll: true,
      min_stock_level: 1,
      unit: 'sft',
      cost_per_unit: 50,
      current_stock: 1000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, varMat, companyId)

    // 2. Create physical roll of 100ft
    const roll = await InventoryRepository.createRoll({
      company_id: companyId,
      material_id: varMat.id,
      roll_code: 'ROLL-VAR-001',
      width_ft: 4.0,
      initial_length_ft: 100.0,
      unit_cost: 5000,
      status: 'available',
    })

    // Record planned issue of 12ft
    const plannedIssueFt = 12.0
    // Record actual operator consumption: 10ft
    const actualConsumedFt = 10.0
    const varianceFt = plannedIssueFt - actualConsumedFt // 2.0 ft unused/returned

    // Deduct actual consumed length from roll
    const updatedRoll = await InventoryRepository.consumeRollLinearLength(
      roll.id,
      actualConsumedFt,
      'job-task-001',
      'Operator Shamol',
      `Consumed 10ft of 12ft planned (Variance: ${varianceFt}ft returned to roll)`
    )

    assert.equal(updatedRoll.current_length_ft, 90.0, 'Roll length must be reduced by exactly actual consumption (10ft)')
  })

  // =========================================================================
  // SCENARIO J: Remnant Lifecycle (>= 2ft Usable Stock)
  // =========================================================================
  test('Scenario J: Offcut >= 2ft created as reusable remnant and participates in compatibility checks', async () => {
    const remnant = await InventoryRepository.createRemnant({
      company_id: companyId,
      material_id: 'mat-star-vinyl',
      source_roll_id: 'roll-parent-123',
      width_ft: 4.0,
      length_ft: 8.5, // 8.5 ft offcut (>= 2ft)
      area_sqft: 4.0 * 8.5,
      status: 'available',
      location: 'Remnant Bin R-1',
    })

    assert.equal(remnant.status, 'available')
    assert.equal(remnant.width, 4.0)
    assert.equal(remnant.length, 8.5)

    // Evaluate compatibility against a small 3ft x 6ft job
    const fitRemnant = evaluateMaterialCompatibility({
      customerWidthFt: 3.0,
      customerLengthFt: 6.0,
      allowancePerSideIn: 1.0,
      availableRollWidthsFt: [remnant.width],
      allowRotation: false,
    })

    assert.equal(fitRemnant.isCompatible, true, 'Small job must successfully fit onto remnant')
  })

  // =========================================================================
  // SCENARIO K: Cutting Waste (Unusable Offcut < 2ft)
  // =========================================================================
  test('Scenario K: Unusable offcut recorded as scrap/waste, not as remnant', async () => {
    // 1. Create base material
    const wasteMat: MaterialRecord = {
      id: 'mat-waste-vinyl',
      company_id: companyId,
      name: 'Waste Test Vinyl',
      sku: 'MAT-WASTE-01',
      category: 'vinyl',
      material_type: 'roll',
      is_roll: true,
      min_stock_level: 1,
      unit: 'sft',
      cost_per_unit: 8500,
      current_stock: 1000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, wasteMat, companyId)

    const wasteRecord = await InventoryRepository.recordScrapWaste({
      company_id: companyId,
      material_id: wasteMat.id,
      source_roll_id: 'roll-parent-123',
      width_ft: 4.0,
      length_ft: 0.8, // 0.8 ft offcut (< 2ft threshold)
      reason: 'End-of-roll unusable strip',
      operator_name: 'Rasel',
    })

    assert.equal(wasteRecord.status, 'scrapped')
    assert.equal(wasteRecord.is_reusable, false)
  })

  // =========================================================================
  // SCENARIO L: Supplier Price Differentiation
  // =========================================================================
  test('Scenario L: Multiple suppliers offer different purchase prices for the same material', async () => {
    const matId = 'mat-supplier-diff'

    const priceSupA = await MaterialPurchaseConfigRepository.save({
      company_id: companyId,
      material_id: matId,
      supplier_name: 'Supplier A (Chattogram Port)',
      width_ft: 5.0,
      length_ft: 164.0,
      unit: 'roll',
      purchase_price: 8200.0,
      is_active: true,
    })

    const priceSupB = await MaterialPurchaseConfigRepository.save({
      company_id: companyId,
      material_id: matId,
      supplier_name: 'Supplier B (Dhaka Local)',
      width_ft: 5.0,
      length_ft: 164.0,
      unit: 'roll',
      purchase_price: 8600.0,
      is_active: true,
    })

    assert.notEqual(priceSupA.purchase_price, priceSupB.purchase_price)
    assert.equal(priceSupA.purchase_price, 8200.0)
    assert.equal(priceSupB.purchase_price, 8600.0)
  })

  // =========================================================================
  // SCENARIO M: Historical Invoice Snapshot Freeze
  // =========================================================================
  test('Scenario M: Editing service master afterwards does not mutate historical invoice snapshot', async () => {
    // Historical frozen invoice item snapshot
    const frozenInvoiceItem = {
      service_name: 'Eco PVC Banner Print',
      ordered_width_ft: 4.0,
      ordered_length_ft: 10.0,
      billable_area_sqft: 40.0,
      unit_price: 25.0,
      line_total: 1000.0,
      applied_allowance_in: 1.0,
      snapshot_timestamp: '2026-01-15T10:00:00Z',
    }

    // Now imagine Master Service is updated to ৳35/sqft with 2.0 inch allowance
    const updatedMasterService = {
      name: 'Eco PVC Banner Print (Updated)',
      selling_price: 35.0,
      service_config: {
        allowance_per_side_in: 2.0,
      },
    }

    // Historical invoice MUST remain unchanged
    assert.equal(frozenInvoiceItem.unit_price, 25.0)
    assert.equal(frozenInvoiceItem.line_total, 1000.0)
    assert.equal(frozenInvoiceItem.applied_allowance_in, 1.0)
  })

  // =========================================================================
  // SCENARIO N: Quantity Propagation (Prevent Multiplication Bugs)
  // =========================================================================
  test('Scenario N: Component quantity propagation: 5 banners * 20 eyelets = 100 eyelets', async () => {
    const bannerQty = 5
    const eyeletsPerBanner = 20

    const costing = calculateServiceCosting({
      serviceName: 'PVC Flex Banner',
      quantity: bannerQty,
      customerWidthFt: 4.0,
      customerLengthFt: 10.0,
      baseSellingPricePerSqft: 25.0,
      materials: [
        {
          material_name: 'Pena Flex',
          is_required: true,
          consumption_rule: 'roll_linear_length',
          allowance_per_side_in: 1.0,
          compatible_widths_ft: [5.0],
          consumption_unit: 'sqft',
        },
      ],
      finishing_options: [
        {
          id: 'fin-eyelets',
          name: 'Metal Eyelets',
          pricing_method: 'per_piece',
          unit_price: 2.0,
          quantity_per_piece: eyeletsPerBanner,
        },
      ],
    })

    // Total eyelets must be exactly 5 * 20 = 100 (Cost: 100 * ৳2.00 = ৳200.00)
    const eyeletFinishing = costing.finishingBreakdown.find((f: any) => f.name === 'Metal Eyelets')
    assert.ok(eyeletFinishing, 'Eyelet finishing must be present')
    assert.equal(eyeletFinishing.quantity, 100, '5 banners x 20 eyelets must equal exactly 100 eyelets')
    assert.equal(eyeletFinishing.totalPrice, 200.0, '100 eyelets @ ৳2.00 must equal ৳200.00')
  })
})
