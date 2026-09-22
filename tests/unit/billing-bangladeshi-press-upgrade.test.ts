import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { BillingService, numberToWordsBDT, calculateDaysOverdue } from '../../services/billing.service.ts'
import type { InvoiceRecord } from '../../types/billing.types.ts'

describe('Bangladeshi Printing Press & 3D Signage — Billing & Receivables Upgrades', () => {
  const baseInvoice: InvoiceRecord = {
    id: 'inv-test-001',
    company_id: 'comp-dhaka-press',
    invoice_number: 'INV-2026-0891',
    invoice_date: '2026-09-20',
    due_date: '2026-09-25',
    customer_id: 'cust-101',
    customer_name: 'Tanvir Hossain',
    customer_phone: '01711223344',
    customer_email: 'tanvir@banglacorp.com',
    customer_company: 'BanglaCorp Media Ltd',
    customer_address: 'Motijheel C/A, Dhaka-1000',
    customer_bin: '123456789-0101',
    subtotal: 50000,
    discount_amount: 2000,
    vat_percentage: 15,
    vat_amount: 7200,
    grand_total: 55200,
    paid_amount: 20000,
    due_amount: 35200,
    status: 'partially_paid',
    invoice_type: 'sales_invoice',
    created_by_name: 'Shafiqul Islam',
    items: [],
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  }

  describe('1. Industrial Print Sector Detection (getSectorForInvoice)', () => {
    test('Correctly identifies Digital Flex / Vinyl Printing invoice', () => {
      const digitalInvoice: InvoiceRecord = {
        ...baseInvoice,
        items: [
          {
            id: 'item-1',
            invoice_id: 'inv-test-001',
            item_description: 'Star Flex Billboard Banner (Backlight)',
            dimensions_spec: '20ft x 10ft',
            quantity: 200,
            unit: 'sft',
            unit_price: 35,
            total_price: 7000,
            material_spec: 'Star Flex 320 GSM',
          } as any,
        ],
      }
      const sector = BillingService.getSectorForInvoice(digitalInvoice)
      assert.strictEqual(sector, 'digital_print')
    })

    test('Correctly identifies Offset Printing Press invoice with paper specs and NCR books', () => {
      const offsetInvoice: InvoiceRecord = {
        ...baseInvoice,
        items: [
          {
            id: 'item-2',
            invoice_id: 'inv-test-001',
            item_description: '3-Part NCR Cash Memo Book (100 Sets)',
            dimensions_spec: '8.5in x 5.5in',
            quantity: 50,
            unit: 'books',
            unit_price: 250,
            total_price: 12500,
            offset_specs: {
              paper_gsm: '55 GSM NCR Carbonless',
              color_mode: '2-Color Offset (Black & Red)',
              binding_type: 'Top Glue Binding with Perforation',
              numbering_range: '0001 to 5000',
            },
          } as any,
        ],
      }
      const sector = BillingService.getSectorForInvoice(offsetInvoice)
      assert.strictEqual(sector, 'offset_print')
    })

    test('Correctly identifies 3D Signage Fabrication invoice with LED & SS modules', () => {
      const signageInvoice: InvoiceRecord = {
        ...baseInvoice,
        items: [
          {
            id: 'item-3',
            invoice_id: 'inv-test-001',
            item_description: '3D Acrylic Raised Letter LED Backlit Signboard',
            dimensions_spec: '12ft x 4ft',
            quantity: 1,
            unit: 'set',
            unit_price: 35000,
            total_price: 35000,
            signage_specs: {
              letter_height_inch: 18,
              acrylic_thickness_mm: 5,
              led_module_type: 'Samsung 3-LED Lens Module IP67',
              smps_wattage: 400,
              frame_structure: '1.5in MS Box Pipe Anti-Rust Primer',
            },
          } as any,
        ],
      }
      const sector = BillingService.getSectorForInvoice(signageInvoice)
      assert.strictEqual(sector, 'signage_fabrication')
    })

    test('Correctly identifies Corporate Gifts & Ready Merchandise invoice', () => {
      const merchInvoice: InvoiceRecord = {
        ...baseInvoice,
        items: [
          {
            id: 'item-4',
            invoice_id: 'inv-test-001',
            item_description: 'Sublimation Ceramic Coffee Mug with Company Logo',
            quantity: 100,
            unit: 'pcs',
            unit_price: 180,
            total_price: 18000,
            item_kind: 'ready_product',
          } as any,
        ],
      }
      const sector = BillingService.getSectorForInvoice(merchInvoice)
      assert.strictEqual(sector, 'ready_merchandise')
    })
  })

  describe('2. Respectful Bangladeshi Payment Reminder Generation', () => {
    test('Generates respectful greetings, BDT breakdown, and remittance details', async () => {
      const reminder = BillingService.generateInvoiceTextMessage(baseInvoice, 'InkFlow Printing Enterprise', {
        bkash: '01711-000111 (Merchant)',
        nagad: '01811-000222',
        bank: 'City Bank (Gulshan Branch)',
      })

      // Verify respectful Bengali greeting
      assert.match(reminder, /আসসালামু আলাইকুম \/ আদাব Tanvir Hossain ভাই\/ম্যাডাম/)
      assert.match(reminder, /InkFlow Printing Enterprise/)
      assert.match(reminder, /#INV-2026-0891/)

      // Verify financial breakdown in BDT
      assert.match(reminder, /সর্বমোট বিল \(Grand Total\): ৳55,200 BDT/)
      assert.match(reminder, /পরিশোধিত \(Paid\): ৳20,000/)
      assert.match(reminder, /প্রদেয় বকেয়া \(Due Balance\): ৳35,200 BDT/)

      // Verify payment accounts
      assert.match(reminder, /bKash \/ Nagad: 01711-000111 \(Merchant\) \/ 01811-000222/)
      assert.match(reminder, /City Bank \(Gulshan Branch\)/)
    })
  })

  describe('3. Taka in Words (numberToWordsBDT) Conversion', () => {
    test('Accurately converts Lakhs and Thousands to words in Taka', () => {
      assert.strictEqual(numberToWordsBDT(55200), 'Fifty Five Thousand Two Hundred Taka Only')
      assert.strictEqual(numberToWordsBDT(1500000), 'Fifteen Lakh Taka Only')
      assert.strictEqual(numberToWordsBDT(2750350), 'Twenty Seven Lakh Fifty Thousand Three Hundred Fifty Taka Only')
      assert.strictEqual(numberToWordsBDT(0), 'Zero Taka Only')
    })
  })

  describe('4. Days Overdue Calculation', () => {
    test('Calculates days overdue accurately without crashing', () => {
      const futureDate = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0]
      assert.strictEqual(calculateDaysOverdue(futureDate), 0)

      const pastDate = new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0]
      const overdueDays = calculateDaysOverdue(pastDate)
      assert.ok(overdueDays >= 3)
    })
  })
})
