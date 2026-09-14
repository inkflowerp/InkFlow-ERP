import { describe, it } from 'node:test'
import assert from 'node:assert'
import { ProductService } from '../../services/product.service.ts'
import { CostingService } from '../../services/costing.service.ts'
import { QuotationService } from '../../services/quotation.service.ts'

describe('V4 Security & Concurrency: Multi-Tenant Isolation, Cost Shielding & Historical Immutability', () => {
  const tenantA = `tenant-v4-a-${Date.now()}`
  const tenantB = `tenant-v4-b-${Date.now()}`

  it('enforces strict tenant isolation across Products, Variants, and Formulas', async () => {
    // 1. Tenant A creates Product
    const prodA = await ProductService.createProduct({
      company_id: tenantA,
      name: 'Tenant A Secret Acrylic Sign',
      sku: 'ACR-TEN-A',
      unit: 'inch',
      selling_price: 150,
    })

    // 2. Tenant B lists products -> Tenant A's product must NOT appear
    const productsB = await ProductService.getProducts(tenantB)
    const leakedProduct = productsB.find((p) => p.id === prodA.id || p.sku === 'ACR-TEN-A')
    assert.strictEqual(leakedProduct, undefined, 'Tenant B must not see Tenant A products')

    // 3. Tenant B direct ID lookup -> returns null
    const directFetch = await ProductService.getProductById(prodA.id, tenantB)
    assert.strictEqual(directFetch, null, 'Tenant B direct ID lookup must fail')
  })

  it('enforces strict tenant isolation across Job Costings', async () => {
    // 1. Tenant A creates Job Costing
    const costingA = await CostingService.createCosting({
      company_id: tenantA,
      job_number: 'CST-SEC-001',
      customer_id: 'cust-a',
      customer_name: 'Tenant A VIP Client',
      item_title: 'Confidential Signage Project',
      selling_price: 25000,
      est: {
        material_cost: 10000,
        machine_cost: 3000,
        ink_cost: 1000,
        printing_cost: 1000,
        finishing_cost: 1000,
        labor_cost: 2000,
        fabrication_cost: 1000,
        installation_cost: 1000,
        transport_cost: 500,
        other_cost: 500,
        total_cost: 20000,
        profit: 5000,
        margin_percentage: 20.0,
      },
    })

    // 2. Tenant B lists costings -> Tenant A's costing must NOT appear
    const costingsB = await CostingService.getCostings(tenantB)
    const leakedCosting = costingsB.find((c) => c.id === costingA.id || c.job_number === 'CST-SEC-001')
    assert.strictEqual(leakedCosting, undefined, 'Tenant B must not see Tenant A costings')

    // 3. Tenant B direct lookup -> returns null
    const directFetch = await CostingService.getCostingById(costingA.id, tenantB)
    assert.strictEqual(directFetch, null, 'Tenant B must not access Tenant A costing record')
  })

  it('guarantees historical costing snapshot immutability when product prices change', async () => {
    const companyId = `comp-immut-${Date.now()}`

    // 1. Create Product at ৳25/sqft with base cost ৳15
    const product = await ProductService.createProduct({
      company_id: companyId,
      name: 'Eco-Solvent Gloss Vinyl',
      sku: 'VIN-GLOSS',
      unit: 'sft',
      base_cost: 15,
      selling_price: 25,
      pricing_formula: {
        model: 'dimensional_area',
        material_rate: 15,
        default_margin_percent: 40.0,
      },
    })

    // 2. Create Quotation based on today's pricing (100 sqft @ ৳25 = ৳2500)
    const quote = await QuotationService.createQuotation({
      company_id: companyId,
      customer_name: 'Dhaka Media Group',
      customer_phone: '+8801811223344',
      items: [
        {
          id: 'quote-item-01',
          product_id: product.id,
          description: product.name,
          width: 10,
          height: 10,
          dimension_unit: 'ft',
          area_sft: 100,
          quantity: 1,
          unit: 'sft',
          unit_rate: 25,
          item_total: 2500,
        },
      ],
    })

    // 3. Next month: Supplier increases price -> Product updated to ৳35/sqft
    await ProductService.updatePrice(product.id, 35, 'Material supplier price hike', 'Admin', companyId)
    const updatedProd = await ProductService.getProductById(product.id, companyId)
    assert.strictEqual(updatedProd?.selling_price, 35)

    // 4. Verify historical quotation remains EXACTLY at ৳25 / ৳2500
    const historicalQuote = await QuotationService.getQuotationById(quote.id, companyId)
    assert.strictEqual(historicalQuote?.items[0].unit_rate, 25, 'Historical quotation rate must NOT change')
    assert.strictEqual(historicalQuote?.items[0].item_total, 2500, 'Historical quotation line total must NOT change')
    assert.strictEqual(historicalQuote?.grand_total, 2500 + Math.round(2500 * (historicalQuote.vat_rate / 100)))
  })

  it('handles concurrent price update requests safely without corrupting history', async () => {
    const companyId = `comp-conc-${Date.now()}`

    const product = await ProductService.createProduct({
      company_id: companyId,
      name: 'Backlit Film UV Print',
      sku: 'BKL-UV-CONC',
      unit: 'sft',
      selling_price: 50,
    })

    // Simulate 5 simultaneous price adjustments
    const priceUpdates = [55, 60, 65, 70, 75]
    await Promise.all(
      priceUpdates.map((price, idx) =>
        ProductService.updatePrice(
          product.id,
          price,
          `Batch adjustment #${idx + 1}`,
          `User-${idx + 1}`,
          companyId
        )
      )
    )

    // Verify product price was updated and price history contains entries
    const finalProduct = await ProductService.getProductById(product.id, companyId)
    assert.ok(finalProduct)
    assert.ok(priceUpdates.includes(finalProduct.selling_price))

    const history = await ProductService.getPriceHistory(product.id)
    assert.ok(history.length >= 1)
  })
})
