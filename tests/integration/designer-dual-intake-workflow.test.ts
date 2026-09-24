import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { DesignService } from '../../services/design.service.ts'
import { InvoiceRequestService } from '../../services/invoice-request.service.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { CustomerRepository } from '../../lib/repositories/customer.repository.ts'
import type { CustomerRecord } from '../../types/crm.types.ts'

describe('PrintERP Designer Panel & Dual Intake Workflow Architecture', () => {
  const TENANT_A = 'tenant-designer-test-a'
  const TENANT_B = 'tenant-designer-test-b'

  beforeEach(() => {
    // Reset DataStore for clean isolation
    PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.ORDERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.JOB_ORDERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_JOBS, [])
    PrintERPDataStore.set(STORAGE_KEYS.IN_APP_NOTIFICATIONS, [])
  })

  describe('PATH A: Direct Customer to Designer Intake Workflow', () => {
    it('1. Existing customer search and auto-population for Work Order', async () => {
      // Seed existing customer in repository
      await CustomerRepository.createCustomer({
        id: 'cust-direct-001',
        company_id: TENANT_A,
        name: 'ABC Fashion Ltd',
        mobile: '01811223344',
        email: 'info@abcfashion.com',
        address: 'House 12, Road 4, Dhanmondi, Dhaka',
        area: 'Dhanmondi',
        customer_type: 'corporate',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)

      // Search customer by tenant
      const allCustomers = await CustomerRepository.getCustomers(TENANT_A)
      const found = allCustomers.find((c: CustomerRecord) => c.mobile === '01811223344')
      assert.ok(found, 'Customer should be found by mobile phone')
      assert.strictEqual(found?.name, 'ABC Fashion Ltd')
      assert.strictEqual(found?.address, 'House 12, Road 4, Dhanmondi, Dhaka')
    })

    it('2. Designer creates Work Order for direct customer with multi-item specs', async () => {
      // Create direct customer design job
      const designJob = await DesignService.createJob({
        company_id: TENANT_A,
        customer_id: 'cust-direct-001',
        customer_name: 'ABC Fashion Ltd',
        title: 'Spring Collection Flex Banner',
        intake_source: 'direct_customer',
        customer_approval_required: true,
        commercial_status: 'invoice_required',
        product_name: 'Star Flex Banner 10x4',
        dimensions_spec: '10ft x 4ft',
        material: 'Star Flex Heavy 380gsm',
        finishing: 'Eyelet all corners',
        quantity: 2,
        unit: 'pcs',
        items_summary: '2x Star Flex Banner (10ft x 4ft)',
        assigned_designer_name: 'Sazzad Designer',
        priority: 'urgent',
      } as any)

      assert.ok(designJob.id)
      assert.strictEqual(designJob.intake_source, 'direct_customer')
      assert.strictEqual(designJob.commercial_status, 'invoice_required')
      assert.strictEqual(designJob.customer_approval_required, true)
      assert.strictEqual(designJob.versions.length, 1, 'Initial draft version should be present')
    })

    it('3. Designer completes design versions immutably and requests Invoice', async () => {
      const designJob = await DesignService.createJob({
        company_id: TENANT_A,
        customer_id: 'cust-direct-001',
        customer_name: 'ABC Fashion Ltd',
        title: 'Spring Collection Flex Banner',
        intake_source: 'direct_customer',
        commercial_status: 'invoice_required',
        customer_approval_required: true,
      })

      // Designer uploads completed version V2
      const v2 = await DesignService.addVersion({
        company_id: TENANT_A,
        design_job_id: designJob.id,
        version_number: 2,
        file_name: 'abc_fashion_v2.pdf',
        file_url: 'https://storage.printerp.com/designs/abc_fashion_v2.pdf',
        preview_url: 'https://storage.printerp.com/designs/abc_fashion_v2_thumb.jpg',
        file_size_bytes: 4500000,
        notes: 'Completed final proof for client',
        created_by_name: 'Sazzad Designer',
      })

      assert.strictEqual(v2.version_number, 2)

      // Mark ready
      const readyJob = await DesignService.updateJob(designJob.id, TENANT_A, {
        status: 'approved',
        commercial_status: 'invoice_required',
      })
      assert.strictEqual(readyJob?.status, 'approved')

      // Designer sends invoice request to Manager / Billing
      const invoiceReq = await InvoiceRequestService.createInvoiceRequest({
        company_id: TENANT_A,
        sales_order_id: null,
        design_job_id: designJob.id,
        design_number: designJob.design_number,
        order_number: `WO-${designJob.design_number.replace('DSN-', '')}`,
        customer_id: 'cust-direct-001',
        customer_name: 'ABC Fashion Ltd',
        requested_by_id: 'usr-designer-01',
        requested_by_name: 'Sazzad Designer',
        notes: 'Design is completed. Please create the official invoice to continue.',
      })

      assert.ok(invoiceReq.id)
      assert.strictEqual(invoiceReq.status, 'pending')
      assert.strictEqual(invoiceReq.design_job_id, designJob.id)

      // Verify in-app notification to billing team
      const notifs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS) || []
      const billingNotif = notifs.find((n) => n.company_id === TENANT_A && n.type === 'invoice_request')
      assert.ok(billingNotif, 'Billing team must receive in-app notification for invoice request')
    })

    it('4. Duplicate invoice request is prevented while pending', async () => {
      const designJob = await DesignService.createJob({
        company_id: TENANT_A,
        customer_id: 'cust-direct-001',
        customer_name: 'ABC Fashion Ltd',
        title: 'Spring Collection Flex Banner',
        intake_source: 'direct_customer',
        commercial_status: 'invoice_required',
      })

      // First request
      const req1 = await InvoiceRequestService.createInvoiceRequest({
        company_id: TENANT_A,
        design_job_id: designJob.id,
        design_number: designJob.design_number,
        order_number: 'WO-1001',
        customer_id: 'cust-direct-001',
        customer_name: 'ABC Fashion Ltd',
        requested_by_id: 'usr-designer-01',
        requested_by_name: 'Sazzad Designer',
      })

      // Duplicate request attempt returns existing pending request without creating a duplicate
      const req2 = await InvoiceRequestService.createInvoiceRequest({
        company_id: TENANT_A,
        design_job_id: designJob.id,
        design_number: designJob.design_number,
        order_number: 'WO-1001',
        customer_id: 'cust-direct-001',
        customer_name: 'ABC Fashion Ltd',
        requested_by_id: 'usr-designer-01',
        requested_by_name: 'Sazzad Designer',
      })

      assert.strictEqual(req1.id, req2.id, 'Duplicate request must return existing pending request')
      const allRequests = await InvoiceRequestService.getRequests(TENANT_A)
      const matching = allRequests.filter((r) => r.design_job_id === designJob.id)
      assert.strictEqual(matching.length, 1, 'Only one invoice request row must exist')
    })

    it('5. Manager creates invoice and auto-reconnects direct customer design job', async () => {
      const designJob = await DesignService.createJob({
        company_id: TENANT_A,
        customer_id: 'cust-direct-001',
        customer_name: 'ABC Fashion Ltd',
        title: 'Spring Collection Flex Banner',
        intake_source: 'direct_customer',
        commercial_status: 'invoice_required',
        customer_approval_required: true,
      })

      // Pending invoice request
      await InvoiceRequestService.createInvoiceRequest({
        company_id: TENANT_A,
        design_job_id: designJob.id,
        design_number: designJob.design_number,
        order_number: 'WO-1001',
        customer_id: 'cust-direct-001',
        customer_name: 'ABC Fashion Ltd',
        requested_by_id: 'usr-designer-01',
        requested_by_name: 'Sazzad Designer',
      })

      // Manager creates official invoice
      const invoice = await BillingRepository.createInvoice({
        company_id: TENANT_A,
        customer_id: 'cust-direct-001',
        customer_name: 'ABC Fashion Ltd',
        customer_phone: '01811223344',
        due_date: '2026-09-30',
        created_by_name: 'Manager / Billing',
        invoice_number: 'INV-2026-0500',
        subtotal: 1000,
        vat_amount: 50,
        discount_amount: 0,
        grand_total: 1050,
        paid_amount: 1050,
        status: 'paid',
        items: [
          {
            product_id: 'prod-01',
            item_description: 'Spring Collection Flex Banner 10x4',
            quantity: 2,
            unit: 'pcs',
            unit_price: 500,
            total_price: 1000,
            design_required: true,
            customer_approval_required: true,
            design_job_id: designJob.id,
          },
        ],
      })

      assert.ok(invoice.id)

      // Verify invoice request is marked fulfilled
      const requests = await InvoiceRequestService.getRequests(TENANT_A)
      const req = requests.find((r) => r.design_job_id === designJob.id)
      assert.strictEqual(req?.status, 'invoice_created')
      assert.strictEqual(req?.invoice_id, invoice.id)

      // Verify design job commercial status is updated to invoice_created
      const reloadedJob = await DesignService.getJobById(designJob.id, TENANT_A)
      assert.strictEqual(reloadedJob?.commercial_status, 'invoice_created')
      assert.strictEqual(reloadedJob?.invoice_id, invoice.id)
    })

    it('6. Production handoff remains blocked until Commercial Gate + Design Gate are both cleared', async () => {
      const designJob = await DesignService.createJob({
        company_id: TENANT_A,
        customer_id: 'cust-direct-001',
        customer_name: 'ABC Fashion Ltd',
        title: 'Spring Collection Flex Banner',
        intake_source: 'direct_customer',
        commercial_status: 'invoice_required', // Missing Invoice!
        customer_approval_required: true,
        status: 'received',
      })

      // 1. Attempt send to print without invoice or approval -> Must fail Gate
      const result1 = await DesignService.sendToPrintOperator(designJob.id, TENANT_A)
      assert.strictEqual(result1.success, false)
      assert.match(result1.error || '', /Design Gate Blocked|Commercial Gate Blocked/i)

      // 2. Link invoice but design not approved -> Must fail Design Gate
      await DesignService.updateJob(designJob.id, TENANT_A, {
        commercial_status: 'invoice_created',
        invoice_id: 'inv-500',
        status: 'customer_approval',
      })

      const result2 = await DesignService.sendToPrintOperator(designJob.id, TENANT_A)
      assert.strictEqual(result2.success, false)
      assert.match(result2.error || '', /Design Gate Blocked/i)

      // 3. Customer approves design -> Commercial Gate + Design Gate both pass!
      await DesignService.updateVersionApproval({
        company_id: TENANT_A,
        design_job_id: designJob.id,
        version_id: designJob.versions[0].id,
        approval_status: 'approved',
        customer_feedback: 'Client Approved via Signature',
      })

      const result3 = await DesignService.sendToPrintOperator(designJob.id, TENANT_A)
      assert.strictEqual(result3.success, true, 'Handoff must succeed when all gates are satisfied')

      // Verify production job is queued
      const prodJobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
      const pj = prodJobs.find((p) => p.company_id === TENANT_A && p.customer_name === 'ABC Fashion Ltd')
      assert.ok(pj, 'Production job must be queued on the shop floor')
      assert.strictEqual(pj.status, 'queued')
      assert.strictEqual(pj.commercial_gate_status, 'ready_for_production')
    })
  })

  describe('PATH B: Manager/Billing Creates Invoice with Design Required', () => {
    it('7. Automatically creates Designer Task & In-App Notification when item has design_required=true', async () => {
      const invoice = await BillingRepository.createInvoice({
        company_id: TENANT_A,
        customer_id: 'cust-xyz-001',
        customer_name: 'XYZ Restaurant',
        customer_phone: '01711223344',
        due_date: '2026-09-30',
        created_by_name: 'Manager / Billing',
        invoice_number: 'INV-2026-0600',
        subtotal: 3000,
        vat_amount: 150,
        discount_amount: 0,
        grand_total: 3150,
        paid_amount: 3150,
        status: 'paid',
        items: [
          {
            product_id: 'prod-menu-01',
            item_description: 'Premium Leather Bound Restaurant Menu A4',
            quantity: 20,
            unit: 'pcs',
            unit_price: 150,
            total_price: 3000,
            design_required: true,
            customer_approval_required: true,
          },
        ],
      })

      assert.ok(invoice.id)

      // Verify automatic Design Job was created
      const designJobs = await DesignService.getJobs(TENANT_A)
      const matchingJob = designJobs.find((dj) => dj.invoice_id === invoice.id)
      assert.ok(matchingJob, 'Automatic Design Job must be created for invoice item with design_required=true')
      assert.strictEqual(matchingJob.intake_source, 'manager_billing')
      assert.strictEqual(matchingJob.commercial_status, 'invoice_created')
      assert.strictEqual(matchingJob.customer_approval_required, true)
      assert.strictEqual(matchingJob.status, 'received')
      assert.strictEqual(matchingJob.customer_name, 'XYZ Restaurant')

      // Verify in-app notification was sent to Designer
      const notifs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS) || []
      const designerNotif = notifs.find(
        (n) => n.company_id === TENANT_A && n.type === 'design_assigned' && n.title.includes(matchingJob.design_number)
      )
      assert.ok(designerNotif, 'Designer must receive in-app notification of new assignment')
    })

    it('8. Designer starts design, uploads versions, manages revisions, and obtains approval', async () => {
      // Setup invoice-originated design job
      const invoice = await BillingRepository.createInvoice({
        company_id: TENANT_A,
        customer_id: 'cust-xyz-001',
        customer_name: 'XYZ Restaurant',
        customer_phone: '01711223344',
        due_date: '2026-09-30',
        created_by_name: 'Manager / Billing',
        invoice_number: 'INV-2026-0601',
        subtotal: 1000,
        vat_amount: 0,
        discount_amount: 0,
        grand_total: 1000,
        paid_amount: 1000,
        status: 'paid',
        items: [
          {
            product_id: 'prod-menu-01',
            item_description: 'Restaurant Menu A4',
            quantity: 10,
            unit: 'pcs',
            unit_price: 100,
            total_price: 1000,
            design_required: true,
            customer_approval_required: true,
          },
        ],
      })

      const designJobs = await DesignService.getJobs(TENANT_A)
      const job = designJobs.find((dj) => dj.invoice_id === invoice.id)!
      assert.ok(job)

      // 1. Designer clicks "Start Design" -> transitions to 'in_progress'
      const inProgressJob = await DesignService.updateJob(job.id, TENANT_A, {
        status: 'in_progress',
      })
      assert.strictEqual(inProgressJob?.status, 'in_progress')

      // 2. Designer uploads Version 2
      const v2 = await DesignService.addVersion({
        company_id: TENANT_A,
        design_job_id: job.id,
        version_number: 2,
        file_name: 'menu_v2.pdf',
        file_url: 'https://storage.printerp.com/menu_v2.pdf',
        file_size_bytes: 2000000,
        notes: 'First draft for client review',
        created_by_name: 'Tareq Designer',
      })
      assert.strictEqual(v2.version_number, 2)

      // 3. Customer requests Revision
      await DesignService.updateVersionApproval({
        company_id: TENANT_A,
        design_job_id: job.id,
        version_id: v2.id,
        approval_status: 'revision_requested',
        customer_feedback: 'Please change font color from blue to maroon on the dessert page',
      })
      const revJob = await DesignService.getJobById(job.id, TENANT_A)
      assert.strictEqual(revJob?.status, 'in_progress')

      // 4. Designer uploads Version 3 addressing revision
      const v3 = await DesignService.addVersion({
        company_id: TENANT_A,
        design_job_id: job.id,
        version_number: 3,
        file_name: 'menu_v3.pdf',
        file_url: 'https://storage.printerp.com/menu_v3.pdf',
        file_size_bytes: 2100000,
        notes: 'Updated dessert page font color to maroon',
        created_by_name: 'Tareq Designer',
      })
      assert.strictEqual(v3.version_number, 3)

      // 5. Customer Approves Version 3
      await DesignService.updateVersionApproval({
        company_id: TENANT_A,
        design_job_id: job.id,
        version_id: v3.id,
        approval_status: 'approved',
        customer_feedback: 'Looks perfect! Approved for printing.',
      })
      const approvedJob = await DesignService.getJobById(job.id, TENANT_A)
      assert.strictEqual(approvedJob?.status, 'approved')
      assert.strictEqual(approvedJob?.is_locked, true)

      // 6. Send to Print Operator succeeds
      const handoff = await DesignService.sendToPrintOperator(job.id, TENANT_A)
      assert.strictEqual(handoff.success, true)
    })
  })

  describe('MIXED INVOICE ITEMS: Selective Design Task Generation', () => {
    it('9. Invoice with mixed items creates design tasks ONLY for design-required items', async () => {
      const invoice = await BillingRepository.createInvoice({
        company_id: TENANT_A,
        customer_id: 'cust-mixed-001',
        customer_name: 'Global Expo LLC',
        customer_phone: '01911223344',
        due_date: '2026-09-30',
        created_by_name: 'Manager / Billing',
        invoice_number: 'INV-2026-0700',
        subtotal: 15000,
        vat_amount: 750,
        discount_amount: 0,
        grand_total: 15750,
        paid_amount: 15750,
        status: 'paid',
        items: [
          // Item 1: Custom Backdrop (Design Required + Approval Required)
          {
            product_id: 'prod-backdrop',
            item_description: 'Custom Stage Backdrop 20x10',
            quantity: 1,
            unit: 'pcs',
            unit_price: 10000,
            total_price: 10000,
            design_required: true,
            customer_approval_required: true,
          },
          // Item 2: Ready Pop-up Stand Hardware (Design NOT required)
          {
            product_id: 'prod-stand',
            item_description: 'Aluminum Pop-up Stand 3x3',
            quantity: 2,
            unit: 'pcs',
            unit_price: 2500,
            total_price: 5000,
            design_required: false,
            customer_approval_required: false,
          },
        ],
      })

      const allDesignJobs = await DesignService.getJobs(TENANT_A)
      const invoiceDesignJobs = allDesignJobs.filter((dj) => dj.invoice_id === invoice.id)

      // Exactly 1 design job created (for Item 1 only)
      assert.strictEqual(invoiceDesignJobs.length, 1, 'Only design-required items must spawn design tasks')
      assert.strictEqual(invoiceDesignJobs[0].title, 'Custom Stage Backdrop 20x10')
      assert.strictEqual(invoiceDesignJobs[0].customer_approval_required, true)
    })
  })

  describe('SECURITY & TENANT ISOLATION', () => {
    it('10. Multi-tenant isolation is strictly enforced across Design Jobs, Requests, and Production', async () => {
      // Create design job in Tenant A
      const jobA = await DesignService.createJob({
        company_id: TENANT_A,
        customer_name: 'Tenant A Customer',
        customer_id: 'cust-ta-01',
        title: 'Secret Banner',
        intake_source: 'direct_customer',
      })

      // Query from Tenant B must return null
      const crossTenantJob = await DesignService.getJobById(jobA.id, TENANT_B)
      assert.strictEqual(crossTenantJob, null, 'Tenant B must not see Tenant A design job')

      // Cross-tenant send to print attempt must be denied
      const crossHandoff = await DesignService.sendToPrintOperator(jobA.id, TENANT_B)
      assert.strictEqual(crossHandoff.success, false)
      assert.strictEqual(crossHandoff.error, 'Design job not found.')
    })
  })
})
