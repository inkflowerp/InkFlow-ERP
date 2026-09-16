import { test, describe } from 'node:test'
import assert from 'node:assert'
import { TaxService } from '../../services/tax.service.ts'
import { LocalizationService } from '../../services/localization.service.ts'
import { TaxRepository } from '../../lib/repositories/tax.repository.ts'
import { LocalizationRepository } from '../../lib/repositories/localization.repository.ts'
import { FinanceRepository } from '../../lib/repositories/finance.repository.ts'
import { FinanceService } from '../../services/finance.service.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { SupplierRepository } from '../../lib/repositories/supplier.repository.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import type { InvoiceRecord } from '../../types/billing.types.ts'
import type { VatCalculationItemInput } from '../../types/tax.types.ts'

describe('Bangladesh Localization + VAT Lifecycle Integration Test (V7)', () => {
  const companyId = 'co-bangladesh-vat-lifecycle-v7'
  const branchId = 'br-dhaka-main-v7'

  test('executes end-to-end localized Bangladesh business workflow with line-level VAT, procurement, inventory, and GL reconciliation', async () => {
    // --------------------------------------------------------------------------
    // 1. CONFIGURE BANGLADESH COMPANY & BRANCH IDENTITY
    // --------------------------------------------------------------------------
    const companyProfile = await LocalizationService.updateCompanyProfile(companyId, {
      name: 'Premier Print & Signage Ltd',
      legal_name_bn: 'প্রিমিয়ার প্রিন্ট অ্যান্ড সাইনেজ লিঃ',
      trade_name: 'Premier Print',
      trade_name_bn: 'প্রিমিয়ার প্রিন্ট',
      bin_number: '1234567890123', // 13-digit BD BIN
      tin_number: '987654321098',  // 12-digit BD TIN
      trade_license_number: 'TRAD/DSCC/012948/2026',
      vat_commissionerate: 'Dhaka (South)',
      vat_circle: 'Motijheel Circle-2',
      division_id: 1, // Dhaka
      district_id: 1, // Dhaka
      upazila_id: 2,  // Paltan / Fakirapool
      area: 'Fakirapool Printing Market',
      address: 'House 14, Inner Circular Road, Fakirapool, Motijheel, Dhaka-1000',
      full_address_bn: 'বাড়ি ১৪, ইনার সার্কুলার রোড, ফকিরাপুল, মতিঝিল, ঢাকা-১০০০',
      phone: '01711000000',
      default_language: 'bn',
      default_currency: 'BDT',
      fiscal_year_start: '07-01',
    })

    assert.strictEqual(companyProfile.bin_number, '1234567890123')
    assert.strictEqual(companyProfile.legal_name_bn, 'প্রিমিয়ার প্রিন্ট অ্যান্ড সাইনেজ লিঃ')

    // Branch Profile
    const branchProfile = await LocalizationRepository.updateBranchProfile(branchId, companyId, {
      id: branchId,
      company_id: companyId,
      name: 'Motijheel Printing Branch',
      name_bn: 'মতিঝিল প্রিন্টিং শাখা',
      division_id: 1,
      district_id: 1,
      upazila_id: 1,
      address: 'Motijheel C/A, Dhaka',
      address_bn: 'মতিঝিল বা/এ, ঢাকা',
      is_active: true,
    })
    assert.strictEqual(branchProfile.name_bn, 'মতিঝিল প্রিন্টিং শাখা')

    // --------------------------------------------------------------------------
    // 2. SEED VAT PROFILES & CHART OF ACCOUNTS
    // --------------------------------------------------------------------------
    const taxProfiles = await TaxService.seedDefaultTaxProfiles(companyId)
    assert.ok(taxProfiles.length >= 5)

    const stdVat = taxProfiles.find((p) => p.code === 'VAT-15')!
    const truncVat = taxProfiles.find((p) => p.code === 'VAT-7.5')!
    const exemptVat = taxProfiles.find((p) => p.code === 'VAT-EXEMPT')!

    assert.strictEqual(stdVat.rate, 15)
    assert.strictEqual(truncVat.rate, 7.5)
    assert.strictEqual(exemptVat.tax_type, 'EXEMPT')

    const accounts = await FinanceRepository.seedDefaultAccounts(companyId)
    const bankAcc = accounts.find((a) => a.code === '1020')!
    const vatPayableAcc = accounts.find((a) => a.code === '2020')!
    const inputTaxAcc = accounts.find((a) => a.code === '1060')!
    await FinanceRepository.updateAccountBalance(bankAcc.id, companyId, 100000)

    // --------------------------------------------------------------------------
    // 3. SALES INVOICE WITH MULTI-RATE LINE-LEVEL VAT
    // --------------------------------------------------------------------------
    const salesItems: VatCalculationItemInput[] = [
      {
        item_id: 'line-01',
        description: 'Flex Banner Printing (ফ্লেক্স ব্যানার প্রিন্টিং)',
        quantity: 100,
        unit_price: 50, // Gross 5,000
        discount_amount: 0,
        custom_rate: stdVat.rate,
        tax_type: stdVat.tax_type,
        custom_mode: 'exclusive',
        tax_profile_id: stdVat.id,
      },
      {
        item_id: 'line-02',
        description: 'Signboard Fabrication (সাইনবোর্ড তৈরি)',
        quantity: 1,
        unit_price: 10000,
        discount_amount: 1000, // Gross 10,000 - 1,000 Discount = Taxable 9,000
        custom_rate: truncVat.rate,
        tax_type: truncVat.tax_type,
        custom_mode: 'exclusive',
        tax_profile_id: truncVat.id,
      },
      {
        item_id: 'line-03',
        description: 'Educational Textbook Offset Printing (পাঠ্যপুস্তক মুদ্রণ)',
        quantity: 1000,
        unit_price: 20, // Gross 20,000
        discount_amount: 0,
        custom_rate: exemptVat.rate,
        tax_type: exemptVat.tax_type,
        custom_mode: 'exclusive',
        tax_profile_id: exemptVat.id,
      },
    ]

    const salesVatBreakdown = TaxService.calculateDocumentVat(salesItems)

    assert.strictEqual(salesVatBreakdown.subtotal, 35000)
    assert.strictEqual(salesVatBreakdown.total_discount, 1000)
    assert.strictEqual(salesVatBreakdown.taxable_subtotal, 34000)
    assert.strictEqual(salesVatBreakdown.total_vat, 1425) // 750 + 675 + 0
    assert.strictEqual(salesVatBreakdown.grand_total, 35425)
    assert.strictEqual(salesVatBreakdown.rate_breakdowns.length, 3)

    // Record Immutable Sales Tax Transaction Lines
    const salesTaxLines = await TaxService.recordSalesTaxLines({
      companyId,
      branchId,
      documentType: 'invoice',
      documentId: 'inv-bd-vat-01',
      documentNumber: 'INV-2026-0001',
      partyId: 'cust-bata-bd',
      partyName: 'Bata Shoe Company (Bangladesh) Limited',
      partyBin: '9988776655443',
      taxDate: '2026-09-14',
      items: salesItems,
      userId: 'usr-sales-lead',
    })
    assert.strictEqual(salesTaxLines.length, 3)

    // Create Invoice in Billing Repository
    const invoiceRecord: InvoiceRecord = {
      id: 'inv-bd-vat-01',
      company_id: companyId,
      invoice_number: 'INV-2026-0001',
      invoice_type: 'sales_invoice',
      customer_id: 'cust-bata-bd',
      customer_name: 'Bata Shoe Company (Bangladesh) Limited',
      customer_phone: '+8801811223344',
      invoice_date: '2026-09-14',
      due_date: '2026-09-28',
      status: 'unpaid',
      subtotal: salesVatBreakdown.subtotal,
      discount_amount: salesVatBreakdown.total_discount,
      vat_percentage: 15,
      vat_amount: salesVatBreakdown.total_vat,
      grand_total: salesVatBreakdown.grand_total,
      paid_amount: 0,
      due_amount: salesVatBreakdown.grand_total,
      write_off_amount: 0,
      items: [],
      created_by_name: 'Sales Manager',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await BillingRepository.createInvoice(invoiceRecord)

    // Customer settles invoice via Bank
    const paymentResult = await FinanceService.recordCustomerPayment({
      companyId,
      branchId,
      invoiceId: invoiceRecord.id,
      customerId: 'cust-bata-bd',
      customerName: 'Bata Shoe Company (Bangladesh) Limited',
      paymentAccountId: bankAcc.id,
      amount: salesVatBreakdown.grand_total,
      paymentMethod: 'bank_transfer',
      referenceNumber: 'EFT-BATA-20260914',
      actorName: 'Accountant',
    })
    assert.strictEqual(paymentResult.invoiceUpdated, true)
    const paidInvoice = await BillingRepository.getInvoiceById(invoiceRecord.id, companyId)
    assert.strictEqual(paidInvoice?.status, 'paid')

    // --------------------------------------------------------------------------
    // 4. PROCUREMENT WITH RECOVERABLE INPUT VAT & V3 PHYSICAL INVENTORY
    // --------------------------------------------------------------------------
    const supplier = await SupplierRepository.createSupplier({
      company_id: companyId,
      supplier_name: 'Meghna Media & Substrates Ltd',
      contact_person: 'Md. Karim',
      mobile: '+8801911998877',
      bin: '1122334455667', // Supplier 13-digit BIN
      address: 'Tejgaon Industrial Area, Dhaka',
      category: 'materials',
    })

    // Material purchase: 10 Rolls PVC Banner @ ৳1,500 = ৳15,000 pre-tax, 15% VAT = ৳2,250
    const purchaseItems: VatCalculationItemInput[] = [
      {
        item_id: 'po-line-01',
        description: 'Star Frontlit PVC Banner 10oz (স্টার ফ্রন্টলিট ব্যানার)',
        quantity: 10,
        unit_price: 1500,
        discount_amount: 0,
        custom_rate: 15,
        tax_type: stdVat.tax_type,
        custom_mode: 'exclusive',
        tax_profile_id: stdVat.id,
      },
    ]

    const purchaseVatBreakdown = TaxService.calculateDocumentVat(purchaseItems)
    assert.strictEqual(purchaseVatBreakdown.subtotal, 15000)
    assert.strictEqual(purchaseVatBreakdown.total_vat, 2250)
    assert.strictEqual(purchaseVatBreakdown.grand_total, 17250)

    // Record GRN into V3 Physical Inventory (Authority: inventory unit cost is pre-tax ৳1,500)
    const inventoryItem = await InventoryRepository.createMaterial({
      company_id: companyId,
      name: 'Star Frontlit PVC Banner 10oz',
      sku: 'MAT-PVC-10OZ',
      category: 'raw_materials',
      unit: 'roll',
      last_purchase_price: 1500, // Pre-tax physical cost
      average_cost: 1500,
      current_stock: 10,
      min_stock_level: 2,
    })
    assert.strictEqual(inventoryItem.last_purchase_price, 1500)

    // Record Purchase Tax Transaction Lines (Eligible Input Tax)
    const purchaseTaxLines = await TaxService.recordPurchaseTaxLines({
      companyId,
      branchId,
      documentType: 'purchase_order',
      documentId: 'po-bd-01',
      documentNumber: 'PO-2026-0001',
      partyId: supplier.id,
      partyName: supplier.supplier_name,
      partyBin: supplier.bin || null,
      taxDate: '2026-09-14',
      items: purchaseItems,
      isRecoverable: true,
      userId: 'usr-purchase-officer',
    })
    assert.strictEqual(purchaseTaxLines.length, 1)
    assert.strictEqual(purchaseTaxLines[0].vat_amount, 2250)
    assert.strictEqual(purchaseTaxLines[0].is_recoverable, true)

    // Settle Supplier Payable via Bank
    const billPayment = await FinanceService.recordSupplierPayment({
      companyId,
      branchId,
      supplierId: supplier.id,
      supplierName: supplier.supplier_name,
      paymentAccountId: bankAcc.id,
      amount: purchaseVatBreakdown.grand_total, // ৳17,250
      referenceNumber: 'PO-PAY-MEGHNA-01',
      actorName: 'Accountant',
    })
    assert.ok(billPayment.id)

    // --------------------------------------------------------------------------
    // 5. VAT RECONCILIATION & STATUTORY TAX REPORTS
    // --------------------------------------------------------------------------
    const taxReport = await TaxService.getTaxSummaryReport(companyId)

    assert.strictEqual(taxReport.output_vat.total_output_vat, 1425)
    assert.strictEqual(taxReport.input_vat.total_input_vat, 2250)
    assert.strictEqual(taxReport.input_vat.eligible_input_vat, 2250)
    assert.strictEqual(taxReport.net_tax_position, -825) // Output (1425) - Input (2250) = -825 (Net Refundable / Carried Forward)
    assert.strictEqual(taxReport.output_vat.total_taxable_sales, 34000)
    assert.strictEqual(taxReport.input_vat.total_taxable_purchases, 15000)
    assert.strictEqual(taxReport.output_vat.exempt_sales, 20000)

    // Verify Registers
    const salesRegister = await TaxService.getTaxRegister(companyId, 'sales')
    assert.strictEqual(salesRegister.length, 3)

    const purchaseRegister = await TaxService.getTaxRegister(companyId, 'purchase')
    assert.strictEqual(purchaseRegister.length, 1)

    // --------------------------------------------------------------------------
    // 6. BILINGUAL NUMBER-TO-WORDS & FORMATTERS
    // --------------------------------------------------------------------------
    const englishWords = LocalizationService.amountInWords(salesVatBreakdown.grand_total, 'en')
    assert.strictEqual(englishWords, 'Thirty Five Thousand Four Hundred Twenty Five Taka Only')

    const banglaWords = LocalizationService.amountInWords(salesVatBreakdown.grand_total, 'bn')
    assert.strictEqual(banglaWords, 'পঁয়ত্রিশ হাজার চার শত পঁচিশ টাকা মাত্র')

    const formattedCurrencyEn = LocalizationService.formatCurrency(salesVatBreakdown.grand_total, false)
    assert.strictEqual(formattedCurrencyEn, '৳\u00A035,425')

    const formattedCurrencyBn = LocalizationService.formatCurrency(salesVatBreakdown.grand_total, true)
    assert.strictEqual(formattedCurrencyBn, '৳\u00A0৩৫,৪২৫')

    // Hierarchical Address String
    const formattedAddrEn = LocalizationService.formatAddress(
      {
        area: 'Fakirapool Printing Market',
        upazila_name: 'Paltan / Fakirapool',
        district_name: 'Dhaka',
        division_name: 'Dhaka',
        post_code: '1000',
      },
      'en'
    )
    assert.strictEqual(formattedAddrEn, 'Fakirapool Printing Market, Paltan / Fakirapool, Dhaka, Dhaka, 1000')

    const formattedAddrBn = LocalizationService.formatAddress(
      {
        area: 'ফকিরাপুল প্রিন্টিং মার্কেট',
        upazila_name_bn: 'পল্টন / ফকিরাপুল',
        district_name_bn: 'ঢাকা',
        division_name_bn: 'ঢাকা',
        post_code: '1000',
      },
      'bn'
    )
    assert.strictEqual(formattedAddrBn, 'ফকিরাপুল প্রিন্টিং মার্কেট, পল্টন / ফকিরাপুল, ঢাকা, ঢাকা, ১০০০')
  })
})
