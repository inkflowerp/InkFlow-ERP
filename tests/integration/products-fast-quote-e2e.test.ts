import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ProductService } from '../../services/product.service.ts'
import { QuotationService } from '../../services/quotation.service.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { CustomerRepository } from '../../lib/repositories/customer.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Integration: Real Bangladeshi Business End-to-End Workflow & Price Immutability', () => {
  const companyId = `comp-e2e-real-${Date.now()}`

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMER_RATES, [])
    PrintERPDataStore.set(STORAGE_KEYS.QUOTATIONS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_HISTORY, [])
  })

  it('Executes complete Product -> Fast Quote -> Invoice -> Price Change -> Snapshot Immutability scenario', async () => {
    // 1. Create Catalog Product Master: Star Flex Banner 280 GSM (৳18/sft, base cost ৳11.50, min price ৳15)
    const product = await ProductService.createProduct({
      company_id: companyId,
      name: 'Star Flex Banner (Frontlit 280 GSM)',
      name_bn: 'স্টার ফ্লেক্স ব্যানার (ফ্রন্টলিট)',
      sku: 'PRD-FLX-280',
      category: 'flex_banner',
      product_type: 'print_service',
      unit: 'sft',
      material_spec: '280 GSM Chinese Star Flex Media',
      base_cost: 11.5,
      selling_price: 18.0,
      min_price: 15.0,
      tax_rate: 7.5,
      requires_finishing: true,
      requires_delivery: true,
      default_department: 'printing',
    })

    assert.ok(product.id)
    assert.strictEqual(product.selling_price, 18.0)

    // 2. Resolve Price for Customer "ABC Advertising"
    const customer = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'ABC Advertising',
      company_name: 'ABC Advertising Ltd',
      mobile: '+8801711002233',
      address: 'Motijheel, Dhaka',
      customer_type: 'retail',
    })

    const resolvedPrice = await ProductService.resolveCustomerProductPrice(product.id, customer.id, companyId)
    assert.strictEqual(resolvedPrice.effectiveRate, 18.0)
    assert.strictEqual(resolvedPrice.source, 'default')

    // 3. Fast Quote Calculation for 20ft x 10ft, Qty 2 (Total Area = 20 x 10 x 2 = 400 SFT)
    // Print Cost = 400 SFT * ৳18 = ৳7,200
    // Hemming (60ft perimeter x 2 = 120ft @ ৳2.50) = ৳300
    // Eyelets (48 pcs @ ৳5) = ৳240
    // Delivery = ৳350
    // Subtotal = 7,200 + 300 + 240 + 350 = ৳8,090
    // VAT (7.5%) = ৳607 (approx)
    const quote1 = await QuotationService.createQuotation({
      company_id: companyId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.mobile,
      items: [
        {
          id: 'item-quote-01',
          product_id: product.id,
          description: `${product.name} (20ft x 10ft)`,
          width: 20,
          height: 10,
          dimension_unit: 'ft',
          area_sft: 400,
          quantity: 2,
          unit: 'sft',
          unit_rate: 18.0,
          rate_source: 'default',
          finishing: 'Hemming, 48 Eyelets, Delivery',
          material_cost: 400 * 11.5,
          item_total: 7200,
        },
      ],
      vat_rate: 7.5,
      language_mode: 'bilingual',
    })

    assert.ok(quote1.id)
    assert.strictEqual(quote1.items[0].unit_rate, 18.0)
    assert.strictEqual(quote1.items[0].item_total, 7200)

    // 4. Convert Quotation 1 to Invoice with Price Snapshot
    const invoice1 = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.mobile,
      quotation_id: quote1.id,
      due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      grand_total: 7200,
      created_by_name: 'Admin',
      items: [
        {
          id: 'inv-item-01',
          product_id: product.id,
          item_description: quote1.items[0].description,
          quantity: 2,
          unit: 'sft',
          unit_price: quote1.items[0].unit_rate,
          vat_percentage: 7.5,
          total_price: quote1.items[0].item_total,
        },
      ],
    })
    assert.ok(invoice1)
    assert.strictEqual(invoice1.customer_name, 'ABC Advertising')
    assert.strictEqual(invoice1.items[0].unit_price, 18.0)
    assert.strictEqual(invoice1.items[0].product_id, product.id)

    // 5. Commercial Price Adjustment in Catalog: Raw material cost increases rate to ৳22/sft
    await ProductService.updatePrice(
      product.id,
      22.0,
      'Raw Chinese media import tariff increase from vendor',
      'Owner',
      'user-owner-01',
      companyId
    )

    // Verify product master now reflects ৳22/sft
    const updatedProduct = await ProductService.getProductById(product.id, companyId)
    assert.strictEqual(updatedProduct?.selling_price, 22.0)

    // 6. CRITICAL AUDIT CHECK: Verify historical Quotation 1 and Invoice 1 remained 100% IMMUTABLE
    const oldQuote = await QuotationService.getQuotationById(quote1.id, companyId)
    assert.strictEqual(oldQuote?.items[0].unit_rate, 18.0, 'Historical quotation unit rate must remain unchanged at ৳18')
    assert.strictEqual(oldQuote?.items[0].item_total, 7200, 'Historical quotation total must remain unchanged at ৳7200')

    const oldInvoice = await BillingRepository.getInvoiceById(invoice1.id, companyId)
    assert.strictEqual(oldInvoice?.items[0].unit_price, 18.0, 'Historical invoice item price must remain unchanged at ৳18')

    // 7. Create Quotation 2 for new job: Must now automatically use updated catalog rate ৳22/sft
    const resolvedPriceNew = await ProductService.resolveCustomerProductPrice(product.id, customer.id, companyId)
    assert.strictEqual(resolvedPriceNew.effectiveRate, 22.0, 'New quotation rate resolution must yield updated catalog rate ৳22')

    const quote2 = await QuotationService.createQuotation({
      company_id: companyId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.mobile,
      items: [
        {
          id: 'item-quote-02',
          product_id: product.id,
          description: `${product.name} (20ft x 10ft)`,
          width: 20,
          height: 10,
          dimension_unit: 'ft',
          area_sft: 400,
          quantity: 2,
          unit: 'sft',
          unit_rate: 22.0,
          rate_source: 'default',
          finishing: 'Hemming, 48 Eyelets, Delivery',
          material_cost: 400 * 11.5,
          item_total: 400 * 22.0,
        },
      ],
      vat_rate: 7.5,
    })

    assert.ok(quote2.id)
    assert.strictEqual(quote2.items[0].unit_rate, 22.0, 'New quotation must lock in new rate ৳22')

    // 8. Verify Product Usage Statistics Reflect Both Commercial Quotations
    const usage = await ProductService.getProductUsageStats(product.id, companyId)
    assert.ok(usage.quotationCount >= 2, 'Product usage stats must record referenced quotations')
    assert.ok(usage.invoiceCount >= 1, 'Product usage stats must record referenced invoice')
    assert.strictEqual(usage.isReferenced, true)

    // 9. Payment Collection: Partial payment of ৳5,000 against Invoice 1
    const payment1 = await BillingRepository.recordPayment({
      company_id: companyId,
      customer_id: customer.id,
      customer_name: customer.name,
      invoice_id: invoice1.id,
      amount: 5000,
      payment_method: 'bkash',
      mfs_transaction_id: 'TRX-BKASH-98214',
      received_by_name: 'Cashier',
    })
    assert.ok(payment1)

    // Check invoice remaining balance
    const updatedInvoice1 = await BillingRepository.getInvoiceById(invoice1.id, companyId)
    assert.strictEqual(updatedInvoice1?.paid_amount, 5000)
    assert.strictEqual(updatedInvoice1?.status, 'partially_paid')

    // 10. Phase 20 Audit: Referential Deletion Protection (Prevent physical delete of referenced product)
    const safety = await ProductService.checkProductDeletionSafety(product.id, companyId)
    assert.strictEqual(safety.isSafe, false, 'Product referenced by quotes & invoices must be deemed unsafe to delete')
    assert.ok(safety.references.quotations >= 2)
    assert.ok(safety.references.invoices >= 1)

    // Attempting deleteProduct must automatically safe-archive without deleting
    const deleteResult = await ProductService.deleteProduct(product.id, companyId)
    assert.strictEqual(deleteResult.deleted, false, 'Referenced product must not be permanently deleted')
    assert.strictEqual(deleteResult.archived, true, 'Referenced product must be automatically safe-archived')

    // Verify product is now archived (is_active = false)
    const archivedProd = await ProductService.getProductById(product.id, companyId)
    assert.strictEqual(archivedProd?.is_active, false)

    // Active-only product query must not return the archived product
    const activeProducts = await ProductService.getProducts(companyId, true)
    assert.ok(!activeProducts.some((p) => p.id === product.id), 'Archived product must be hidden from active catalog query')

    // 11. Historical Documents remain 100% accessible even while product is archived
    const quoteWhileArchived = await QuotationService.getQuotationById(quote1.id, companyId)
    assert.ok(quoteWhileArchived, 'Historical quotation must remain fully accessible')
    assert.strictEqual(quoteWhileArchived?.items[0].unit_rate, 18.0)

    // 12. Restore Product back to active catalog
    const restoredProd = await ProductService.restoreProduct(product.id, companyId)
    assert.strictEqual(restoredProd.is_active, true, 'Restored product must have is_active = true')

    const activeProductsAfterRestore = await ProductService.getProducts(companyId, true)
    assert.ok(activeProductsAfterRestore.some((p) => p.id === product.id), 'Restored product must be returned in active catalog')
  })
})
