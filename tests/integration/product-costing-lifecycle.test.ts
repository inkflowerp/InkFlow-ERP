import { describe, it } from 'node:test'
import assert from 'node:assert'
import { ProductService } from '../../services/product.service.ts'
import { CostingService } from '../../services/costing.service.ts'
import { QuotationService } from '../../services/quotation.service.ts'
import { InventoryService } from '../../services/inventory.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { ProductRecord } from '../../types/product.types.ts'

describe('V4 Integration: End-to-End Product, Formula, Costing & Profitability Lifecycle', () => {
  const companyId = `comp-v4-e2e-${Date.now()}`

  it('completes the entire Product -> Formula -> Quote -> Order -> Task -> Consumption -> Actual Costing workflow', async () => {
    // 1. Create a Product Master
    const product = await ProductService.createProduct({
      company_id: companyId,
      name: 'Star Frontlit Flex Banner 340 GSM',
      name_bn: 'স্টার ফ্রন্টলিট ফ্লেক্স ব্যানার ৩৪০ জিএসএম',
      sku: `FLX-${Date.now().toString().slice(-4)}`,
      category: 'flex_banner',
      product_type: 'PRODUCT',
      unit: 'sft',
      material_spec: '340 GSM Outdoor Media with UV Stabilizer',
      base_cost: 15,
      selling_price: 25,
      min_price: 20,
      pricing_formula: {
        model: 'dimensional_area',
        waste_factor_percent: 5.0,
        material_rate: 15,
        machine_rate: 8,
        labor_rate: 4,
        default_margin_percent: 35.0,
        min_margin_percent: 15.0,
      },
    })

    assert.ok(product.id)
    assert.strictEqual(product.name_bn, 'স্টার ফ্রন্টলিট ফ্লেক্স ব্যানার ৩৪০ জিএসএম')

    // 2. Define Product Variants (e.g. 340 GSM vs 440 GSM Heavy Duty)
    const variant = await ProductService.createProductVariant({
      company_id: companyId,
      product_id: product.id,
      variant_name: 'Heavy Duty 440 GSM',
      gsm: 440,
      cost_adjustment: 5,
      price_adjustment: 8,
    })
    assert.ok(variant.id)
    assert.strictEqual(variant.gsm, 440)

    // 3. Define Versioned Production Formula
    const formula = await ProductService.createProductFormula({
      company_id: companyId,
      product_id: product.id,
      formula_name: 'High-Speed Solvent Formula V1',
      model: 'dimensional_area',
      waste_factor_percent: 6.0,
      material_requirements: [
        {
          material_name: 'Star Flex Roll 10ft',
          unit: 'sqft',
          quantity_formula: 'area_sft * 1.06',
          unit_cost: 15,
        },
      ],
      machine_operations: [
        {
          machine_type: 'large_format_printing',
          duration_formula_minutes: 'area_sft / 2.0',
          hourly_rate: 1200,
        },
      ],
      labor_operations: [
        {
          role_name: 'Machine Operator',
          duration_formula_minutes: 'area_sft / 2.0',
          hourly_rate: 300,
        },
      ],
      target_margin_percent: 35.0,
      min_margin_percent: 15.0,
    })
    assert.ok(formula.id)
    assert.strictEqual(formula.version, 1)

    // 4. Create Pre-Production Job Costing from Product & Formula (10ft x 4ft = 40 sft, 2 pcs = 80 sft)
    const costing = await CostingService.createCostingFromProduct(
      product.id,
      {
        width: 10,
        height: 4,
        dimensionUnit: 'ft',
        quantity: 2,
      },
      {
        companyId,
        customer_id: 'cust-v4-01',
        customer_name: 'Apex Advertising Ltd',
        selling_price_override: 4000,
      }
    )

    assert.ok(costing.id)
    assert.strictEqual(costing.selling_price, 4000)
    assert.ok(costing.est.total_cost > 0)
    assert.ok(costing.est.profit > 0)
    assert.strictEqual(costing.status, 'estimated')
    assert.ok(costing.costing_snapshot)

    // 5. Create Quotation referencing Product
    const quote = await QuotationService.createQuotation({
      company_id: companyId,
      customer_id: 'cust-v4-01',
      customer_name: 'Apex Advertising Ltd',
      customer_phone: '+8801711223344',
      items: [
        {
          id: 'item-v4-01',
          product_id: product.id,
          description: product.name,
          width: 10,
          height: 4,
          dimension_unit: 'ft',
          area_sft: 80,
          quantity: 2,
          unit: 'sft',
          unit_rate: 50,
          item_total: 4000,
        },
      ],
    })
    assert.ok(quote.id)

    // 6. Convert Quotation to Sales Order with automatic workflow provisioning
    const salesOrder = await QuotationService.convertToOrder(quote.id)
    assert.ok(salesOrder)
    assert.strictEqual(salesOrder.customer_name, 'Apex Advertising Ltd')

    // 7. Verify V2 Production Tasks and V3 Material Requirements were created
    const tasks = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
    const jobTasks = tasks.filter((t) => t.company_id === companyId)
    assert.ok(jobTasks.length > 0)

    const matReqs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASK_MATERIAL_REQUIREMENTS) || []
    const jobMatReqs = matReqs.filter((m) => m.company_id === companyId)
    assert.ok(jobMatReqs.length > 0)

    // 8. Log Material Consumption in V3 Stock Ledger
    const createdMat = await InventoryService.createMaterial({
      company_id: companyId,
      sku: 'MAT-FLX-01',
      name: 'Flex Roll 10ft Media',
      category: 'flex',
      unit: 'square_feet',
      reorder_level: 50,
    })

    await InventoryService.logProductionConsumption({
      company_id: companyId,
      material_id: createdMat.id,
      consumed_quantity: 85, // 85 sqft consumed
      unit: 'sqft',
      production_task_id: jobTasks[0].id,
      actor_name: 'Operator 1',
    })

    // 9. Sync Actual Consumption to Costing and verify Actualized Status & Realized Margin
    const actualizedCosting = await CostingService.syncActualConsumptionToCosting(costing.id, companyId)
    assert.ok(actualizedCosting)
    assert.strictEqual(actualizedCosting.status, 'actualized')
    assert.ok(actualizedCosting.act.total_cost > 0)
    assert.ok(actualizedCosting.act.profit !== undefined)
    assert.ok(actualizedCosting.act.margin_percentage !== undefined)
  })
})
