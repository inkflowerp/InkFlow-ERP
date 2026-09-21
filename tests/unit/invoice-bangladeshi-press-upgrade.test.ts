import test from 'node:test'
import assert from 'node:assert/strict'
import { BANGLADESHI_PRINT_PRESETS, getPresetsByCategory } from '../../lib/quotation-presets'
import { BillingRepository } from '../../lib/repositories/billing.repository'
import { formatBDT, numberToWordsBangla, numberToWordsBDT } from '../../lib/formatters'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store'

test('Invoice Bangladeshi Press Upgrade - Presets Catalog & Domain Specs', () => {
  // Test presets availability for Invoices
  assert.ok(BANGLADESHI_PRINT_PRESETS.length >= 10, 'Expected at least 10 Bangladeshi printing presets')

  const digital = getPresetsByCategory('digital')
  assert.ok(digital.some((p) => p.name.includes('Pana Flex') && p.name.includes('Frontlit')), 'Should contain Frontlit Flex')
  assert.ok(digital.some((p) => p.name.includes('Vinyl Sticker')), 'Should contain Vinyl Sticker')

  const offset = getPresetsByCategory('offset')
  assert.ok(offset.some((p) => p.name.includes('Visiting Card')), 'Should contain Visiting Card')
  assert.ok(offset.some((p) => p.name.includes('Cash Memo')), 'Should contain Cash Memo')

  const signage = getPresetsByCategory('signage')
  assert.ok(signage.some((p) => p.name.includes('Acrylic LED')), 'Should contain Acrylic LED Sign')
  assert.ok(signage.some((p) => p.name.includes('SS') || p.name.includes('Stainless')), 'Should contain SS Sign')

  const ready = getPresetsByCategory('ready')
  assert.ok(ready.some((p) => p.name.includes('ID Card') || p.name.includes('Rollup')), 'Should contain Ready Merchandise')
})

test('Invoice Creation with Bangladeshi Press Domain Items (Digital, Offset, Signage)', async () => {
  const testCompanyId = `test-comp-inv-${Date.now()}`

  const created = await BillingRepository.createInvoice({
    company_id: testCompanyId,
    customer_id: 'cust-bengal-001',
    customer_name: 'Bengal Media & Publications Ltd',
    customer_name_bn: 'বেঙ্গল মিডিয়া অ্যান্ড পাবলিকেশন্স লিঃ',
    customer_phone: '01711998877',
    customer_address: 'Motijheel C/A, Dhaka-1000',
    invoice_type: 'sales_invoice',
    advance_percentage: 50,
    mushak_version: '6.3',
    tax_rate: 7.5,
    delivery_location: 'Dilkusha Commercial Area, Dhaka',
    delivery_method: 'Office Delivery Van',
    payment_method_note: 'bKash Merchant: 01700-000000 / City Bank A/C: 1102938475001',
    items: [
      {
        description: 'Pana Flex Frontlit Signboard Banner (280 GSM)',
        description_bn: 'প্যানা ফ্লেক্স ফ্রন্টলিট ব্যানার প্রিন্ট',
        category_preset: 'digital',
        material_spec: '280 GSM Star Frontlit China Flex',
        width: 20,
        height: 10,
        quantity: 1,
        unit: 'sft',
        unit_rate: 22,
        item_total: 4400, // 20 * 10 * 22 = 4400
      },
      {
        description: 'Multi-Color Cash Memo (3-Part NCR Paper)',
        description_bn: '৩-পার্ট এনসিআর ক্যাশ মেমো',
        category_preset: 'offset',
        material_spec: '55 GSM Carbonless NCR Paper',
        width: 0,
        height: 0,
        quantity: 50,
        unit: 'book',
        unit_rate: 180,
        item_total: 9000, // 50 * 180 = 9000
        offset_specs: {
          paper_gsm: '55',
          print_mode: 'Single Color (1+0)',
          binding: 'Top Pad Binding & Perforation',
          ncr_parts: 3,
          numbering_range: '0001 - 5000',
        },
      },
      {
        description: '3D Acrylic Backlit Channel Letter Sign',
        description_bn: '৩ডি এক্রিলিক ব্যাকলিট সাইনবোর্ড',
        category_preset: 'signage',
        material_spec: '3mm Cast Acrylic + LED Module',
        width: 15,
        height: 4,
        quantity: 1,
        unit: 'sft',
        unit_rate: 650,
        item_total: 39000, // 60 sft * 650 = 39000
        signage_specs: {
          letter_height_inch: 18,
          lighting: 'Samsung Module 1.2W LED Backlit',
          power_supply: 'Rainproof 400W SMPS',
          structure: '1.5-inch MS Square Pipe Structure',
          frame: 'SS 304 Gold Mirror Frame',
          installation_included: true,
        },
      },
    ],
  })

  assert.ok(created.id, 'Invoice ID must be generated')
  assert.equal(created.items.length, 3, 'Invoice must have 3 items')
  
  // Total checks: 4400 + 9000 + 39000 = 52400
  assert.equal(created.subtotal, 52400, 'Subtotal should be 52400')
  // VAT @ 7.5% = 3930
  assert.equal(created.tax_amount, 3930, 'VAT @ 7.5% on 52400 should be 3930')
  // Grand total = 56330
  assert.equal(created.grand_total, 56330, 'Grand total should be 56330')

  // 50% Commercial Advance breakdown
  assert.equal(created.advance_percentage, 50, 'Advance percentage should be 50%')
  assert.equal(created.advance_amount, 28165, 'Advance amount should be 50% of 56330 = 28165')
  assert.equal(created.due_on_delivery, 28165, 'Due on delivery should be 28165')

  // Verification of domain specs in items
  const offsetItem = created.items.find((i) => i.category_preset === 'offset')
  assert.ok(offsetItem, 'Offset item should be present')
  assert.equal(offsetItem?.offset_specs?.ncr_parts, 3)
  assert.equal(offsetItem?.offset_specs?.numbering_range, '0001 - 5000')

  const signageItem = created.items.find((i) => i.category_preset === 'signage')
  assert.ok(signageItem, 'Signage item should be present')
  assert.equal(signageItem?.signage_specs?.letter_height_inch, 18)
  assert.equal(signageItem?.signage_specs?.power_supply, 'Rainproof 400W SMPS')
  assert.equal(signageItem?.signage_specs?.installation_included, true)

  // Language & BDT Currency helpers
  const wordsBn = numberToWordsBangla(created.grand_total)
  assert.ok(wordsBn.length > 0, 'Bangla in-words should be generated')

  const wordsEn = numberToWordsBDT(created.grand_total)
  assert.ok(wordsEn.includes('Fifty Six Thousand Three Hundred Thirty Taka Only'), `Words EN mismatch: ${wordsEn}`)
})

test('NBR Mushak-6.3 VAT Calculations and Tax Invoice Properties', async () => {
  const testCompanyId = `test-comp-mushak-${Date.now()}`

  const taxInvoice = await BillingRepository.createInvoice({
    company_id: testCompanyId,
    customer_id: 'cust-pran-rfl-002',
    customer_name: 'PRAN-RFL Group Corporate Division',
    customer_phone: '01811223344',
    invoice_type: 'vat_invoice',
    mushak_version: '6.3',
    tax_rate: 15, // Standard 15% NBR VAT
    items: [
      {
        description: 'Offset Packaging Box Printing & Matt UV Coating',
        category_preset: 'offset',
        material_spec: '350 GSM Swedish Art Board',
        width: 0,
        height: 0,
        quantity: 5000,
        unit: 'pcs',
        unit_rate: 8.5,
        item_total: 42500,
      },
    ],
  })

  assert.equal(taxInvoice.invoice_type, 'vat_invoice')
  assert.equal(taxInvoice.tax_rate, 15)
  assert.equal(taxInvoice.subtotal, 42500)
  assert.equal(taxInvoice.tax_amount, 6375, '15% VAT on 42500 is 6375')
  assert.equal(taxInvoice.grand_total, 48875)
  assert.equal(taxInvoice.mushak_version, '6.3')
})

test('Invoice Payment Processing & Money Receipt (MR) Generation', async () => {
  const testCompanyId = `test-comp-pay-${Date.now()}`

  // Create invoice of ৳20,000 with 50% advance requirement
  const invoice = await BillingRepository.createInvoice({
    company_id: testCompanyId,
    customer_id: 'cust-square-003',
    customer_name: 'Square Pharmaceuticals Ltd',
    customer_phone: '01911887766',
    advance_percentage: 50,
    items: [
      {
        description: 'Corporate Brochure (Offset 4-Color, Folded)',
        category_preset: 'offset',
        material_spec: '150 GSM Art Paper',
        width: 0,
        height: 0,
        quantity: 1000,
        unit: 'pcs',
        unit_rate: 20,
        item_total: 20000,
      },
    ],
  })

  assert.equal(invoice.grand_total, 20000)
  assert.equal(invoice.due_amount, 20000)
  assert.equal(invoice.status, 'unpaid')

  // Record 50% advance payment via bKash Merchant
  const advancePayment = await BillingRepository.recordPayment({
    company_id: testCompanyId,
    customer_id: 'cust-square-003',
    amount: 10000,
    payment_method: 'bkash_merchant',
    payment_date: '2026-09-22',
    reference_number: 'TRX99882211',
    note: '50% Work Order Advance received via bKash',
    allocations: [
      {
        invoice_id: invoice.id,
        amount: 10000,
      },
    ],
  })

  assert.ok(advancePayment.id, 'Payment ID should be generated')
  assert.ok(advancePayment.payment_number.startsWith('PAY-') || advancePayment.payment_number.startsWith('MR-'))
  assert.equal(advancePayment.amount, 10000)

  // Verify updated invoice due and status
  const updatedInvoice = await BillingRepository.getInvoiceById(invoice.id, testCompanyId)
  assert.ok(updatedInvoice)
  assert.equal(updatedInvoice?.paid_amount, 10000)
  assert.equal(updatedInvoice?.due_amount, 10000)
  assert.equal(updatedInvoice?.status, 'partially_paid')

  // Receive final settlement on delivery via Bank Transfer
  const finalPayment = await BillingRepository.recordPayment({
    company_id: testCompanyId,
    customer_id: 'cust-square-003',
    amount: 10000,
    payment_method: 'bank_transfer',
    payment_date: '2026-09-25',
    reference_number: 'EBL-TRX-445566',
    note: 'Final balance settled on delivery',
    allocations: [
      {
        invoice_id: invoice.id,
        amount: 10000,
      },
    ],
  })

  const settledInvoice = await BillingRepository.getInvoiceById(invoice.id, testCompanyId)
  assert.ok(settledInvoice)
  assert.equal(settledInvoice?.paid_amount, 20000)
  assert.equal(settledInvoice?.due_amount, 0)
  assert.equal(settledInvoice?.status, 'paid')
})
