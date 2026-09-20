import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { CustomerRepository } from '../../lib/repositories/customer.repository.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { DesignRepository } from '../../lib/repositories/design.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { CustomerRecord } from '../../types/crm.types.ts'

describe('Customer Outstanding Balance, Orders & Job Flow, and Design Panel Intake Tests', () => {
  const TENANT_ID = `tenant-cust-flow-${Date.now()}`

  it('1. Customer Outstanding Balance aggregates accurately from non-cancelled invoices', async () => {
    // 1. Create Customer
    const customer = await CustomerRepository.createCustomer({
      company_id: TENANT_ID,
      name: 'Shamim Media Ltd',
      mobile: '+8801911223344',
      address: 'Kawran Bazar, Dhaka',
      customer_type: 'corporate',
    })

    assert.ok(customer.id)
    assert.equal(customer.name, 'Shamim Media Ltd')

    // Initial balance should be 0
    let customers = await CustomerRepository.getCustomers(TENANT_ID)
    let found = customers.find((c) => c.id === customer.id)
    assert.ok(found)
    assert.equal(found.total_due_balance, 0)

    // 2. Create Invoice 1 with ৳25,000 due
    const invoice1 = await BillingRepository.createInvoice({
      company_id: TENANT_ID,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.mobile,
      customer_address: customer.address,
      due_date: '2026-10-15',
      grand_total: 50000,
      paid_amount: 25000,
      due_amount: 25000,
      created_by_name: 'Billing Exec',
      items: [
        {
          item_name: 'Backlit Signboard 10x4ft',
          quantity: 1,
          unit: 'pcs',
          unit_price: 50000,
          total_price: 50000,
          workflow_routing: 'ready_production',
        } as any,
      ],
    })

    assert.ok(invoice1.id)

    // Fetch customers again - total_due_balance must now be ৳25,000
    customers = await CustomerRepository.getCustomers(TENANT_ID)
    found = customers.find((c) => c.id === customer.id)
    assert.ok(found)
    assert.equal(found.total_due_balance, 25000)
    assert.equal(found.total_invoiced_amount, 50000)
    assert.equal(found.total_paid_amount, 25000)

    // getCustomerById must also return ৳25,000
    const custById = await CustomerRepository.getCustomerById(customer.id, TENANT_ID)
    assert.ok(custById)
    assert.equal(custById.total_due_balance, 25000)
  })

  it('2. Invoice created items appear with auto-provisioned sales order & job orders in Orders Flow', async () => {
    const invoice = await BillingRepository.createInvoice({
      company_id: TENANT_ID,
      customer_name: 'Rahim Garments',
      customer_phone: '+8801822334455',
      customer_address: 'Gazipur, Dhaka',
      due_date: '2026-10-20',
      grand_total: 12000,
      paid_amount: 12000,
      due_amount: 0,
      created_by_name: 'Billing Exec',
      items: [
        {
          item_name: 'Hangtag Label Printing',
          quantity: 1000,
          unit: 'pcs',
          unit_price: 12,
          total_price: 12000,
          workflow_routing: 'ready_production',
          finishing: 'Gloss Lamination + Die Cut',
        } as any,
      ],
    })

    assert.ok(invoice.id)

    // Verify Sales Order was auto-provisioned in datastore
    const orders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
    const matchingOrder = orders.find((o) => o.company_id === TENANT_ID && o.invoice_id === invoice.id)
    assert.ok(matchingOrder, 'Sales Order must be auto-provisioned for invoice')
    assert.equal(matchingOrder.commercial_status, 'invoice_created')
    assert.equal(matchingOrder.production_gate_status, 'ready_for_production')

    // Verify Job Orders were auto-provisioned
    const jobOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.JOB_ORDERS) || []
    const matchingJobs = jobOrders.filter((j) => j.company_id === TENANT_ID && j.invoice_id === invoice.id)
    assert.ok(matchingJobs.length >= 1, 'Job Order must be auto-provisioned for invoice line items')
    assert.equal(matchingJobs[0].production_instructions, 'Finishing: Gloss Lamination + Die Cut')
  })

  it('3. Invoices with design_required items auto-provision design jobs and appear in Design Panel', async () => {
    const invoice = await BillingRepository.createInvoice({
      company_id: TENANT_ID,
      customer_name: 'Creative Horizon Ltd',
      customer_phone: '+8801733445566',
      customer_address: 'Dhanmondi, Dhaka',
      due_date: '2026-10-25',
      grand_total: 18000,
      paid_amount: 10000,
      due_amount: 8000,
      created_by_name: 'Billing Exec',
      items: [
        {
          item_name: 'Vehicle Branding Vinyl Wrap',
          width: 20,
          height: 8,
          dimension_unit: 'ft',
          quantity: 1,
          unit: 'sft',
          unit_price: 100,
          total_price: 16000,
          design_required: true,
          workflow_routing: 'design_required',
          customer_approval_required: true,
        } as any,
        {
          item_name: 'Vinyl Sticker Ready Print',
          width: 4,
          height: 2,
          dimension_unit: 'ft',
          quantity: 2,
          unit: 'sft',
          unit_price: 125,
          total_price: 2000,
          design_required: false,
          workflow_routing: 'design_ok',
          customer_approval_required: false,
        } as any,
      ],
    })

    assert.ok(invoice.id)

    // Fetch design jobs via DesignRepository
    const designJobs = await DesignRepository.getDesignJobs(TENANT_ID)
    assert.ok(designJobs.length >= 2, `Expected at least 2 design jobs for custom items, got ${designJobs.length}`)

    const designReqJob = designJobs.find(
      (j) => j.invoice_id === invoice.id && j.workflow_routing === 'design_required'
    )
    assert.ok(designReqJob, 'design_required item must be present in design jobs')
    assert.equal(designReqJob.status, 'received')
    assert.equal(designReqJob.customer_approval_required, true)
    assert.equal(designReqJob.commercial_status, 'invoice_created')

    const designOkJob = designJobs.find(
      (j) => j.invoice_id === invoice.id && j.workflow_routing === 'design_ok'
    )
    assert.ok(designOkJob, 'design_ok item must be present in design jobs')
    assert.equal(designOkJob.status, 'approved')
    assert.equal(designOkJob.customer_approval_required, false)
    assert.equal(designOkJob.is_locked, true)
  })
})
