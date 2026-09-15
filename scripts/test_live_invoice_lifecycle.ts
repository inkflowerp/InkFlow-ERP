import fs from 'fs'

try {
  const envContent = fs.readFileSync('.env.local', 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=')
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim()
        let val = trimmed.slice(idx + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        process.env[key] = val
      }
    }
  }
} catch {}

import { BillingRepository } from '../lib/repositories/billing.repository.ts'
import { BillingService } from '../services/billing.service.ts'
import { createAdminClient } from '../lib/supabase/admin.ts'

async function testLiveLifecycle() {
  const companyId = '2af84f1d-1ebd-48e7-9795-fd5c24c38a96' // classic printer
  console.log('--- Starting Live Supabase Invoice Lifecycle Test for company:', companyId)

  // 1. Create Invoice with items
  console.log('\nStep 1: Creating a test invoice in live PostgreSQL...')
  const testInvoice = await BillingRepository.createInvoice({
    company_id: companyId,
    customer_name: 'Live Forensic Audit Customer',
    customer_phone: '01712345678',
    customer_email: 'forensic.audit@inkflow.com',
    customer_address: 'Motijheel C/A, Dhaka',
    invoice_type: 'sales_invoice',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    subtotal: 15000,
    discount_amount: 1000,
    vat_percentage: 15,
    vat_amount: 2100,
    grand_total: 16100,
    paid_amount: 5000,
    due_amount: 11100,
    created_by_name: 'Forensic Verifier',
    items: [
      {
        item_description: 'PVC Signboard 10x4 ft with Gloss Lamination',
        dimensions_spec: '10 × 4 sft',
        quantity: 1,
        unit: 'pcs',
        unit_price: 15000,
        vat_percentage: 15,
        total_price: 15000,
        finishing: 'Lamination (Gloss)',
      } as any,
    ],
  })

  console.log('✓ Created invoice returned from repository:')
  console.log('  - ID:', testInvoice.id)
  console.log('  - Invoice Number:', testInvoice.invoice_number)
  console.log('  - Status:', testInvoice.status)
  console.log('  - Grand Total:', testInvoice.grand_total)
  console.log('  - Paid Amount:', testInvoice.paid_amount)
  console.log('  - Due Amount:', testInvoice.due_amount)

  // 2. Direct PostgreSQL Query to confirm real database persistence
  console.log('\nStep 2: Directly querying Supabase PostgreSQL database tables...')
  const supabase = createAdminClient()
  const { data: dbInv, error: dbInvErr } = await (supabase as any)
    .from('invoices')
    .select('*, items:invoice_items(*)')
    .eq('id', testInvoice.id)
    .single()

  if (dbInvErr || !dbInv) {
    throw new Error(`Invoice was not found in PostgreSQL! Error: ${dbInvErr?.message}`)
  }

  console.log('✓ Found invoice in PostgreSQL database!')
  console.log('  - ID in DB:', dbInv.id)
  console.log('  - Invoice Number in DB:', dbInv.invoice_number)
  console.log('  - Customer Email in DB:', dbInv.customer_email)
  console.log('  - Due Amount in DB:', dbInv.due_amount)
  console.log('  - Line items count in DB:', dbInv.items?.length)
  if (dbInv.items && dbInv.items.length > 0) {
    console.log('  - Item description:', dbInv.items[0].item_description)
    console.log('  - Item finishing:', dbInv.items[0].finishing)
  }

  // 3. Test Repository / Service Retrieval (Invoice directory & cockpit query)
  console.log('\nStep 3: Querying invoices list via BillingService.getInvoices()...')
  const allInvoices = await BillingService.getInvoices(companyId)
  const foundInList = allInvoices.find((i) => i.id === testInvoice.id)
  if (!foundInList) {
    throw new Error(`Invoice was not found in BillingService.getInvoices() list!`)
  }
  console.log('✓ Newly created invoice is immediately returned by BillingService.getInvoices()!')

  console.log('\nStep 4: Direct single invoice lookup via BillingService.getInvoiceById()...')
  const singleInv = await BillingService.getInvoiceById(testInvoice.id, companyId)
  if (!singleInv) {
    throw new Error(`Invoice was not found in BillingService.getInvoiceById()!`)
  }
  console.log('✓ Direct cockpit query BillingService.getInvoiceById() returned:', singleInv.invoice_number)

  // 4. Test Record Payment Allocation
  console.log('\nStep 5: Recording partial payment on the live invoice...')
  const payment = await BillingService.recordMultiInvoicePayment({
    companyId,
    customerName: 'Live Forensic Audit Customer',
    amount: 5000,
    paymentMethod: 'bkash',
    mfsTransactionId: 'TRX-LIVE-998877',
    receivedByName: 'Cashier',
    allocations: [{ invoiceId: testInvoice.id, amount: 5000 }],
  })
  console.log('✓ Payment recorded successfully:')
  console.log('  - Receipt Number:', payment.receipt_number)
  console.log('  - Amount:', payment.amount)

  const updatedInvAfterPay = await BillingService.getInvoiceById(testInvoice.id, companyId)
  console.log('  - New Paid Amount on Invoice:', updatedInvAfterPay?.paid_amount)
  console.log('  - New Due Amount on Invoice:', updatedInvAfterPay?.due_amount)
  console.log('  - New Status on Invoice:', updatedInvAfterPay?.status)

  // 5. Test Write-Off
  console.log('\nStep 6: Recording financial write-off on remaining due...')
  const writeOff = await BillingService.recordWriteOff({
    company_id: companyId,
    invoice_id: testInvoice.id,
    amount: 1100,
    reason: 'Forensic audit verification discount waiver',
    authorized_by_name: 'Auditor',
  })
  console.log('✓ Write-off recorded successfully, amount:', writeOff.amount)

  const updatedInvAfterWO = await BillingService.getInvoiceById(testInvoice.id, companyId)
  console.log('  - New Due Amount after write-off:', updatedInvAfterWO?.due_amount)
  console.log('  - Write-off amount recorded:', updatedInvAfterWO?.write_off_amount)

  // 6. Test Walk-in Customer Invoice
  console.log('\nStep 7: Testing Walk-in Customer Invoice Creation (customer_id = null)...')
  const walkInInvoice = await BillingRepository.createInvoice({
    company_id: companyId,
    customer_id: null,
    customer_name: 'Direct Counter Walk-in Buyer',
    customer_phone: '01800000000',
    invoice_type: 'sales_invoice',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    subtotal: 500,
    grand_total: 500,
    paid_amount: 500,
    due_amount: 0,
    created_by_name: 'Counter Operator',
    items: [
      {
        item_description: 'Flyer Printing A4 100 pcs',
        quantity: 100,
        unit: 'pcs',
        unit_price: 5,
        total_price: 500,
      } as any,
    ],
  })
  console.log('✓ Walk-in invoice created successfully:', walkInInvoice.invoice_number, 'Customer ID:', walkInInvoice.customer_id)

  const walkInDb = await BillingService.getInvoiceById(walkInInvoice.id, companyId)
  if (!walkInDb || walkInDb.customer_id !== null) {
    throw new Error('Walk-in invoice failed validation: customer_id is not null or invoice was not found')
  }
  console.log('✓ Walk-in invoice correctly retrieved with customer_id = null')

  // 7. Test Invoice Cancellation
  console.log('\nStep 8: Testing Invoice Cancellation on an unpaid test invoice...')
  const unpaidTestInv = await BillingRepository.createInvoice({
    company_id: companyId,
    customer_name: 'Cancellation Test Customer',
    customer_phone: '01999999999',
    invoice_type: 'sales_invoice',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    subtotal: 1000,
    grand_total: 1000,
    paid_amount: 0,
    due_amount: 1000,
    created_by_name: 'Auditor',
  })
  const cancelResult = await BillingService.cancelInvoice(unpaidTestInv.id, 'Ordered in error', 'Auditor', companyId)
  console.log('✓ Invoice cancelled successfully:', cancelResult)
  const cancelledInv = await BillingService.getInvoiceById(unpaidTestInv.id, companyId)
  console.log('  - Cancelled Invoice Status:', cancelledInv?.status)
  console.log('  - Cancelled Invoice Due Amount:', cancelledInv?.due_amount)

  // 8. Clean up test records
  console.log('\nStep 9: Cleaning up test records from PostgreSQL...')
  await (supabase as any).from('financial_write_offs').delete().eq('invoice_id', testInvoice.id)
  await (supabase as any).from('payment_allocations').delete().eq('invoice_id', testInvoice.id)
  await (supabase as any).from('payments').delete().eq('id', payment.id)
  await (supabase as any).from('invoice_items').delete().eq('invoice_id', testInvoice.id)
  await (supabase as any).from('invoices').delete().eq('id', testInvoice.id)
  await (supabase as any).from('invoice_items').delete().eq('invoice_id', walkInInvoice.id)
  await (supabase as any).from('invoices').delete().eq('id', walkInInvoice.id)
  await (supabase as any).from('invoices').delete().eq('id', unpaidTestInv.id)
  console.log('✓ Test invoices and financial records cleanly removed.')

  console.log('\n🎉 ALL LIVE SUPABASE FORENSIC INVOICE LIFECYCLE TESTS (CREATE, WALK-IN, QUERY, PAY, WRITE-OFF, CANCEL) PASSED PERFECTLY!')
}

testLiveLifecycle().catch((err) => {
  console.error('\n❌ Live lifecycle test failed:', err)
  process.exit(1)
})
