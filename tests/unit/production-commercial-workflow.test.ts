import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InvoiceRequestService } from '../../services/invoice-request.service.ts'
import { DesignService } from '../../services/design.service.ts'
import { ProductionPlanningService } from '../../services/production-planning.service.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import type { SalesOrderRecord, JobOrderRecord } from '../../types/order.types.ts'
import type { DesignJobRecord } from '../../types/design.types.ts'
import type { ProductionTaskRecord } from '../../types/production.types.ts'

describe('PrintERP Production Commercial Workflow & Gating Architecture', () => {
  const TENANT_ID = 'tenant-test-01'

  beforeEach(() => {
    // Clear in-memory datastore before each test run
    PrintERPDataStore.set(STORAGE_KEYS.ORDERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.JOB_ORDERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.IN_APP_NOTIFICATIONS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
  })

  it('Path A: Invoice + Design Required -> Designer -> Design Ready -> Customer Approval -> Print -> Finishing -> Delivery', async () => {
    // 1. Create Sales Order with Invoice & Design Required
    const order: SalesOrderRecord = {
      id: 'ord-path-a',
      company_id: TENANT_ID,
      order_number: 'ORD-2026-0001',
      customer_id: 'cust-01',
      customer_name: 'Acme Corp',
      customer_phone: '01700000000',
      salesperson_name: 'Hasan Sales',
      order_date: '2026-09-19',
      delivery_date: '2026-09-22',
      priority: 'normal',
      status: 'confirmed',
      workflow_routing: 'design_required',
      commercial_status: 'invoice_created',
      invoice_id: 'inv-001',
      invoice_number: 'INV-2026-0001',
      production_gate_status: 'blocked_design',
      subtotal: 5000,
      discount_amount: 0,
      vat_amount: 375,
      final_price: 5375,
      advance_amount: 2000,
      due_amount: 3375,
      payment_terms: 'advance',
      items: [
        {
          id: 'item-1',
          item_name: 'Backlit Signboard Banner',
          width: 10,
          height: 4,
          dimension_unit: 'ft',
          quantity: 1,
          unit: 'sft',
          unit_price: 5000,
          total_price: 5000,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.ORDERS, order)

    const jobOrder: JobOrderRecord = {
      id: 'job-001',
      company_id: TENANT_ID,
      job_number: 'JOB-2026-0001-A',
      order_id: order.id,
      product_name: 'Backlit Signboard Banner',
      customer_name: order.customer_name,
      quantity: 1,
      size_spec: '10ft x 4ft',
      material_spec: 'Star Flex Backlit',
      artwork_status: 'approved',
      deadline: '2026-09-22 16:00',
      assigned_department: 'wide_format_print',
      status: 'queued',
      workflow_routing: 'design_required',
      commercial_status: 'invoice_created',
      production_gate_status: 'ready_for_production',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.JOB_ORDERS, jobOrder)

    // 2. Prepress Design Job created
    const designJob: DesignJobRecord = {
      id: 'dj-001',
      company_id: TENANT_ID,
      order_id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      design_number: 'DSG-2026-0001',
      designer_name: 'Rafiq Designer',
      priority: 'normal',
      deadline: '2026-09-22 18:00',
      title: 'Backlit Signboard Artwork',
      workflow_routing: 'design_required',
      commercial_status: 'invoice_created',
      invoice_id: 'inv-001',
      invoice_number: 'INV-2026-0001',
      status: 'in_progress',
      current_version: 1,
      versions: [
        {
          id: 'ver-001',
          company_id: TENANT_ID,
          design_job_id: 'dj-001',
          version_number: 1,
          file_name: 'acme_sign_draft_v1.pdf',
          file_url: 'https://cdn.printerp.com/designs/v1.pdf',
          file_size_bytes: 4096000,
          created_at: new Date().toISOString(),
          created_by_name: 'Rafiq Designer',
          approval_status: 'pending_review',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.DESIGN_JOBS, designJob)

    // 3. Designer completes design -> marks ready
    const readyResult = await DesignService.markReady('dj-001', TENANT_ID, 'Finalized vector layout with bleed lines')
    assert.strictEqual(readyResult?.status, 'customer_approval')

    // 4. Customer Approval
    await DesignService.updateVersionApproval({
      company_id: TENANT_ID,
      design_job_id: 'dj-001',
      version_id: 'ver-001',
      approval_status: 'approved',
      customer_feedback: 'Looks perfect! Please print.',
    })

    const updatedJob = await DesignService.getJobById('dj-001', TENANT_ID)
    assert.strictEqual(updatedJob?.status, 'approved')
    assert.strictEqual(updatedJob?.is_locked, true)

    // 5. Production Tasks created: Print Floor -> Finishing -> Delivery
    const printTask: ProductionTaskRecord = {
      id: 'tsk-001',
      company_id: TENANT_ID,
      job_order_id: 'job-001',
      task_number: 'TSK-001',
      task_name: 'Wide Format UV Print',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 1,
      unit: 'pcs',
      priority: 'normal',
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const finishingTask: ProductionTaskRecord = {
      id: 'tsk-002',
      company_id: TENANT_ID,
      job_order_id: 'job-001',
      task_number: 'TSK-002',
      task_name: 'Lamination & Eyelet Finishing',
      task_type: 'finishing',
      department: 'finishing',
      sequence_order: 2,
      quantity: 1,
      unit: 'pcs',
      priority: 'normal',
      status: 'queued',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, printTask)
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, finishingTask)

    // Check tasks hydration & gating status
    const tasks = await ProductionPlanningService.getTasks(TENANT_ID)
    const hydratedPrint = tasks.find((t) => t.id === 'tsk-001')
    assert.strictEqual(hydratedPrint?.is_blocked_by_commercial_gate, false)
    assert.strictEqual(hydratedPrint?.is_blocked_by_design_gate, false)

    // 6. Start Print Task -> Succeeded
    const startPrint = await ProductionPlanningService.startTask('tsk-001', TENANT_ID, 'op-01', 'Hassan Operator')
    assert.strictEqual(startPrint.status, 'in_progress')

    // 7. Complete Print Task -> Succeeded
    const completePrint = await ProductionPlanningService.completeTask('tsk-001', TENANT_ID, {
      good_quantity: 1,
      rejected_quantity: 0,
    })
    assert.strictEqual(completePrint.completedTask.status, 'completed')
  })

  it('Path B: Invoice + Design OK -> Skips Designer task -> Queues directly for Print & Finishing', async () => {
    // 1. Order intake with Design OK (customer provided print-ready file)
    const order: SalesOrderRecord = {
      id: 'ord-path-b',
      company_id: TENANT_ID,
      order_number: 'ORD-2026-0002',
      customer_id: 'cust-02',
      customer_name: 'Beta Ltd',
      customer_phone: '01700000000',
      salesperson_name: 'Hasan Sales',
      order_date: '2026-09-19',
      delivery_date: '2026-09-20',
      priority: 'urgent',
      status: 'confirmed',
      workflow_routing: 'design_ok',
      commercial_status: 'invoice_created',
      invoice_id: 'inv-002',
      invoice_number: 'INV-2026-0002',
      production_gate_status: 'ready_for_production',
      subtotal: 3000,
      discount_amount: 0,
      vat_amount: 225,
      final_price: 3225,
      advance_amount: 3225,
      due_amount: 0,
      payment_terms: 'cash',
      items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.ORDERS, order)

    const jobOrder: JobOrderRecord = {
      id: 'job-b-001',
      company_id: TENANT_ID,
      job_number: 'JOB-2026-0002-A',
      order_id: order.id,
      product_name: 'Print Ready PVC Vinyl',
      customer_name: order.customer_name,
      quantity: 50,
      size_spec: '3ft x 2ft',
      material_spec: 'Glossy Vinyl Sticker',
      artwork_status: 'approved',
      deadline: '2026-09-20 18:00',
      assigned_department: 'wide_format_print',
      status: 'queued',
      workflow_routing: 'design_ok',
      commercial_status: 'invoice_created',
      production_gate_status: 'ready_for_production',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.JOB_ORDERS, jobOrder)

    const printTask: ProductionTaskRecord = {
      id: 'tsk-b-01',
      company_id: TENANT_ID,
      job_order_id: jobOrder.id,
      task_number: 'TSK-B-01',
      task_name: 'High Speed Vinyl Print',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 50,
      unit: 'pcs',
      priority: 'urgent',
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, printTask)

    const tasks = await ProductionPlanningService.getTasks(TENANT_ID)
    const hydratedTask = tasks.find((t) => t.id === 'tsk-b-01')

    assert.strictEqual(hydratedTask?.is_blocked_by_commercial_gate, false)
    assert.strictEqual(hydratedTask?.is_blocked_by_design_gate, false)

    const started = await ProductionPlanningService.startTask('tsk-b-01', TENANT_ID, 'op-02', 'Karim Operator')
    assert.strictEqual(started.status, 'in_progress')
  })

  it('Path C: Design Ready + Invoice Missing -> Blocks Production -> Send Invoice Request -> Sales Notification -> Invoice Created -> Workflow Auto-Reconnection', async () => {
    // 1. Order intake with Design Required, but NO Invoice created yet
    const order: SalesOrderRecord = {
      id: 'ord-path-c',
      company_id: TENANT_ID,
      order_number: 'ORD-2026-0003',
      customer_id: 'cust-03',
      customer_name: 'Gamma Retail',
      customer_phone: '01700000000',
      salesperson_name: 'Hasan Sales',
      order_date: '2026-09-19',
      delivery_date: '2026-09-25',
      priority: 'normal',
      status: 'confirmed',
      workflow_routing: 'design_required',
      commercial_status: 'invoice_required',
      production_gate_status: 'blocked_commercial',
      subtotal: 12000,
      discount_amount: 0,
      vat_amount: 900,
      final_price: 12900,
      advance_amount: 0,
      due_amount: 12900,
      payment_terms: 'advance',
      items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.ORDERS, order)

    const jobOrder: JobOrderRecord = {
      id: 'job-c-001',
      company_id: TENANT_ID,
      job_number: 'JOB-2026-0003-A',
      order_id: order.id,
      product_name: 'Acrylic 3D LED Letters',
      customer_name: order.customer_name,
      quantity: 1,
      size_spec: '8ft x 3ft',
      material_spec: 'Cast Acrylic + LED Strips',
      artwork_status: 'pending',
      deadline: '2026-09-25 12:00',
      assigned_department: 'laser_cnc',
      status: 'queued',
      workflow_routing: 'design_required',
      commercial_status: 'invoice_required',
      production_gate_status: 'blocked_commercial',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.JOB_ORDERS, jobOrder)

    // 2. Prepress design completes & becomes ready
    const designJob: DesignJobRecord = {
      id: 'dj-003',
      company_id: TENANT_ID,
      order_id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      design_number: 'DSG-2026-0003',
      designer_name: 'Anis Designer',
      priority: 'normal',
      deadline: '2026-09-25 18:00',
      title: 'Acrylic 3D CNC Routing Vector',
      workflow_routing: 'design_required',
      commercial_status: 'invoice_required',
      status: 'in_progress',
      current_version: 1,
      versions: [
        {
          id: 'ver-003',
          company_id: TENANT_ID,
          design_job_id: 'dj-003',
          version_number: 1,
          file_name: 'gamma_acrylic_cnc.dxf',
          file_url: 'https://cdn.printerp.com/designs/gamma.dxf',
          file_size_bytes: 2048000,
          created_at: new Date().toISOString(),
          created_by_name: 'Anis Designer',
          approval_status: 'pending_review',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.DESIGN_JOBS, designJob)

    await DesignService.markReady('dj-003', TENANT_ID, 'Vector cut path generated')
    await DesignService.updateVersionApproval({
      company_id: TENANT_ID,
      design_job_id: 'dj-003',
      version_id: 'ver-003',
      approval_status: 'approved',
    })

    // 3. Floor task is created, but should be BLOCKED by commercial gate (no invoice)
    const cncTask: ProductionTaskRecord = {
      id: 'tsk-c-01',
      company_id: TENANT_ID,
      job_order_id: jobOrder.id,
      task_number: 'TSK-C-01',
      task_name: 'Acrylic CNC Routing',
      task_type: 'cutting',
      department: 'fabrication',
      sequence_order: 1,
      quantity: 1,
      unit: 'set',
      priority: 'normal',
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, cncTask)

    const tasksBeforeInvoice = await ProductionPlanningService.getTasks(TENANT_ID)
    const hydratedTaskBefore = tasksBeforeInvoice.find((t) => t.id === 'tsk-c-01')

    assert.strictEqual(hydratedTaskBefore?.is_blocked_by_commercial_gate, true)
    assert.strictEqual(hydratedTaskBefore?.commercial_gate_reason, 'Official invoice not created yet')

    // Operator trying to start should fail with error
    await assert.rejects(
      async () => {
        await ProductionPlanningService.startTask('tsk-c-01', TENANT_ID, 'op-03', 'Rimon Operator')
      },
      (err: Error) => {
        assert.match(err.message, /Commercial gate blocked/i)
        return true
      }
    )

    // 4. Designer / Floor sends Invoice Request
    const requestResult = await InvoiceRequestService.createInvoiceRequest({
      companyId: TENANT_ID,
      salesOrderId: order.id,
      orderNumber: order.order_number,
      customerId: order.customer_id,
      customerName: order.customer_name,
      requestedById: 'des-01',
      requestedByName: 'Anis Designer',
      notes: 'Design is customer-approved and ready for laser/CNC floor.',
    })

    assert.strictEqual(requestResult.status, 'pending')
    assert.strictEqual(requestResult.sales_order_id, order.id)

    // Verify in-app notification was dispatched to sales/management
    const notifications = PrintERPDataStore.getAll(STORAGE_KEYS.IN_APP_NOTIFICATIONS) as any[]
    const invoiceReqNotif = notifications.find((n) => n.type === 'invoice_request' && n.action_url.includes(order.id))
    assert.ok(invoiceReqNotif, 'Invoice Request notification must be created')
    assert.ok(invoiceReqNotif.action_url.includes('create_invoice'), 'Action URL must link to invoice creator')

    // 5. Test Duplicate Prevention: Attempting to create duplicate invoice request returns existing request
    const duplicateRequest = await InvoiceRequestService.createInvoiceRequest({
      companyId: TENANT_ID,
      salesOrderId: order.id,
      orderNumber: order.order_number,
      customerId: order.customer_id,
      customerName: order.customer_name,
      requestedById: 'des-01',
      requestedByName: 'Anis Designer',
      notes: 'Second attempt should not duplicate',
    })
    assert.strictEqual(duplicateRequest.id, requestResult.id, 'Duplicate invoice request must return existing record')

    // 6. Sales / Accounting creates official invoice
    const newInvoice = await BillingRepository.createInvoice({
      company_id: TENANT_ID,
      sales_order_id: order.id,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      customer_phone: '01700000000',
      created_by_name: 'Sales Manager',
      invoice_number: 'INV-2026-0003',
      subtotal: 12000,
      discount_amount: 0,
      vat_amount: 900,
      grand_total: 12900,
      paid_amount: 5000,
      due_amount: 7900,
      status: 'partially_paid',
      invoice_date: '2026-09-19',
      due_date: '2026-09-25',
      items: [
        {
          item_name: 'Acrylic 3D LED Letters',
          quantity: 1,
          unit: 'set',
          unit_price: 12000,
          total_price: 12000,
        },
      ],
    })
    assert.ok(newInvoice.id, 'Invoice created successfully')

    // 7. Verify Auto-Reconnection & Gate Unlock
    const ordersList = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
    const updatedOrder = ordersList.find((o) => o.id === order.id)
    assert.strictEqual(updatedOrder?.commercial_status, 'invoice_created')
    assert.strictEqual(updatedOrder?.invoice_id, newInvoice.id)
    assert.strictEqual(updatedOrder?.invoice_number, newInvoice.invoice_number)
    assert.strictEqual(updatedOrder?.production_gate_status, 'ready_for_production')

    const jobsList = PrintERPDataStore.get<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS) || []
    const updatedJob = jobsList.find((j) => j.id === jobOrder.id)
    assert.strictEqual(updatedJob?.commercial_status, 'invoice_created')
    assert.strictEqual(updatedJob?.invoice_id, newInvoice.id)
    assert.strictEqual(updatedJob?.production_gate_status, 'ready_for_production')

    const pendingRequests = await InvoiceRequestService.getRequests(TENANT_ID, {
      salesOrderId: order.id,
    })
    assert.strictEqual(pendingRequests[0].status, 'invoice_created')
    assert.strictEqual(pendingRequests[0].invoice_id, newInvoice.id)

    // 8. Verify Production Gating Cleared -> Start Task succeeds now
    const tasksAfterInvoice = await ProductionPlanningService.getTasks(TENANT_ID)
    const hydratedTaskAfter = tasksAfterInvoice.find((t) => t.id === 'tsk-c-01')
    assert.strictEqual(hydratedTaskAfter?.is_blocked_by_commercial_gate, false)

    const startedTask = await ProductionPlanningService.startTask('tsk-c-01', TENANT_ID, 'op-03', 'Rimon Operator')
    assert.strictEqual(startedTask.status, 'in_progress')
  })

  it('Path D: Ready Production -> Direct operational shortcut bypassing unnecessary prepress and print queues', async () => {
    // Ready Production order (e.g. standard stock signage or customer supplied hardware)
    const order: SalesOrderRecord = {
      id: 'ord-path-d',
      company_id: TENANT_ID,
      order_number: 'ORD-2026-0004',
      customer_id: 'cust-04',
      customer_name: 'Delta Corp',
      customer_phone: '01700000000',
      salesperson_name: 'Hasan Sales',
      order_date: '2026-09-19',
      delivery_date: '2026-09-19',
      priority: 'normal',
      status: 'confirmed',
      workflow_routing: 'ready_production',
      commercial_status: 'invoice_created',
      invoice_id: 'inv-004',
      invoice_number: 'INV-2026-0004',
      production_gate_status: 'ready_for_production',
      subtotal: 1500,
      discount_amount: 0,
      vat_amount: 112,
      final_price: 1612,
      advance_amount: 1612,
      due_amount: 0,
      payment_terms: 'cash',
      items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.ORDERS, order)

    const jobOrder: JobOrderRecord = {
      id: 'job-d-001',
      company_id: TENANT_ID,
      job_number: 'JOB-2026-0004-A',
      order_id: order.id,
      product_name: 'Ready-Made Acrylic Table Top Stands',
      customer_name: order.customer_name,
      quantity: 10,
      size_spec: 'A4 Portrait',
      material_spec: '2mm Clear Acrylic',
      artwork_status: 'not_required',
      deadline: '2026-09-19 17:00',
      assigned_department: 'delivery',
      status: 'completed',
      workflow_routing: 'ready_production',
      commercial_status: 'invoice_created',
      production_gate_status: 'ready_for_production',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.JOB_ORDERS, jobOrder)

    assert.strictEqual(jobOrder.workflow_routing, 'ready_production')
    assert.strictEqual(jobOrder.artwork_status, 'not_required')
    assert.strictEqual(jobOrder.production_gate_status, 'ready_for_production')
  })

  it('Design Versioning Preservation: Adding new versions never overwrites previous history', async () => {
    // 1. Create a design job
    const designJob: DesignJobRecord = {
      id: 'dj-version-test',
      company_id: TENANT_ID,
      order_id: 'ord-ver-01',
      order_number: 'ORD-2026-VER',
      customer_id: 'cust-ver',
      customer_name: 'Vers Corp',
      design_number: 'DSG-2026-VER',
      designer_name: 'Designer A',
      priority: 'normal',
      deadline: '2026-09-25 18:00',
      title: 'Packaging Box Design',
      status: 'in_progress',
      current_version: 1,
      versions: [
        {
          id: 'ver-v1',
          company_id: TENANT_ID,
          design_job_id: 'dj-version-test',
          version_number: 1,
          file_name: 'box_v1_initial.pdf',
          file_url: 'https://cdn.printerp.com/box_v1.pdf',
          file_size_bytes: 1024000,
          created_at: '2026-09-18T10:00:00Z',
          created_by_name: 'Designer A',
          approval_status: 'rejected',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.DESIGN_JOBS, designJob)

    // 2. Add version 2
    const v2 = await DesignService.addVersion({
      company_id: TENANT_ID,
      design_job_id: 'dj-version-test',
      version_number: 2,
      file_name: 'box_v2_revised.pdf',
      file_url: 'https://cdn.printerp.com/box_v2.pdf',
      file_size_bytes: 1200000,
      created_by_name: 'Designer B',
      notes: 'Moved barcode 20mm higher as requested.',
    })

    const updatedJob = await DesignService.getJobById('dj-version-test', TENANT_ID)

    assert.strictEqual(updatedJob?.versions?.length, 2, 'Must contain 2 versions')
    assert.strictEqual(updatedJob?.version_count, 2, 'Version count must be 2')

    // Verify Version 1 was untouched
    const v1 = updatedJob?.versions?.find((v) => v.version_number === 1)
    assert.strictEqual(v1?.file_name, 'box_v1_initial.pdf')
    assert.strictEqual(v1?.approval_status, 'rejected')

    // Verify Version 2
    const v2Record = updatedJob?.versions?.find((v) => v.version_number === 2)
    assert.strictEqual(v2Record?.file_name, 'box_v2_revised.pdf')
    assert.strictEqual(v2Record?.approval_status, 'pending_review')

    // Approve Version 2
    await DesignService.updateVersionApproval({
      company_id: TENANT_ID,
      design_job_id: 'dj-version-test',
      version_id: v2.id,
      approval_status: 'approved',
      customer_feedback: 'Barcode looks great. Approved for print.',
    })

    const finalJob = await DesignService.getJobById('dj-version-test', TENANT_ID)
    assert.strictEqual(finalJob?.status, 'approved')
    assert.strictEqual(finalJob?.versions?.find((v) => v.version_number === 1)?.approval_status, 'rejected')
    assert.strictEqual(finalJob?.versions?.find((v) => v.version_number === 2)?.approval_status, 'approved')
  })

  it('Customer Revision Flow: preserves feedback & notes across revisions without overwriting history', async () => {
    // 1. Create a design job with version 1
    const designJob: DesignJobRecord = {
      id: 'dj-rev-flow',
      company_id: TENANT_ID,
      order_id: 'ord-rev-01',
      order_number: 'ORD-2026-REV',
      customer_id: 'cust-rev',
      customer_name: 'Revision Corp',
      design_number: 'DSG-2026-REV',
      designer_name: 'Tariq Designer',
      priority: 'normal',
      deadline: '2026-09-28 18:00',
      title: 'Retail Storefront Signage',
      status: 'customer_approval',
      current_version: 1,
      versions: [
        {
          id: 'ver-rev-1',
          company_id: TENANT_ID,
          design_job_id: 'dj-rev-flow',
          version_number: 1,
          file_name: 'storefront_v1.pdf',
          file_url: 'https://cdn.printerp.com/storefront_v1.pdf',
          file_size_bytes: 3100000,
          created_at: '2026-09-18T09:00:00Z',
          created_by_name: 'Tariq Designer',
          approval_status: 'pending_review',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.DESIGN_JOBS, designJob)

    // 2. Customer requests revision with specific notes
    await DesignService.updateVersionApproval({
      company_id: TENANT_ID,
      design_job_id: 'dj-rev-flow',
      version_id: 'ver-rev-1',
      approval_status: 'revision_requested',
      customer_feedback: 'Please make the logo 15% larger and change the background to royal blue.',
    })

    const jobAfterFeedback = await DesignService.getJobById('dj-rev-flow', TENANT_ID)
    assert.strictEqual(jobAfterFeedback?.status, 'in_progress', 'Job status must revert to in_progress for designer rework')
    const v1Record = jobAfterFeedback?.versions?.find((v) => v.id === 'ver-rev-1')
    assert.strictEqual(v1Record?.approval_status, 'revision_requested')
    assert.strictEqual(v1Record?.customer_feedback, 'Please make the logo 15% larger and change the background to royal blue.')

    // 3. Designer uploads revision v2
    const v2 = await DesignService.addVersion({
      company_id: TENANT_ID,
      design_job_id: 'dj-rev-flow',
      version_number: 2,
      file_name: 'storefront_v2_royal_blue.pdf',
      file_url: 'https://cdn.printerp.com/storefront_v2.pdf',
      file_size_bytes: 3250000,
      created_by_name: 'Tariq Designer',
      notes: 'Enlarged logo and applied royal blue gradient hex #002366.',
    })

    // 4. Designer marks ready for approval again
    await DesignService.markReady('dj-rev-flow', TENANT_ID, 'Ready for final customer review')
    const jobReadyAgain = await DesignService.getJobById('dj-rev-flow', TENANT_ID)
    assert.strictEqual(jobReadyAgain?.status, 'customer_approval')

    // 5. Customer approves version 2
    await DesignService.updateVersionApproval({
      company_id: TENANT_ID,
      design_job_id: 'dj-rev-flow',
      version_id: v2.id,
      approval_status: 'approved',
      customer_feedback: 'Color and scale look perfect now! Approved.',
    })

    const jobFinal = await DesignService.getJobById('dj-rev-flow', TENANT_ID)
    assert.strictEqual(jobFinal?.status, 'approved')
    assert.strictEqual(jobFinal?.is_locked, true)
    // Check v1 feedback is completely preserved
    const v1Final = jobFinal?.versions?.find((v) => v.id === 'ver-rev-1')
    assert.strictEqual(v1Final?.approval_status, 'revision_requested')
    assert.strictEqual(v1Final?.customer_feedback, 'Please make the logo 15% larger and change the background to royal blue.')
  })

  it('Server Enforcement: Production cannot start if Design Approval is pending or unapproved', async () => {
    // 1. Order with Invoice Created, but Design Approval still pending
    const order: SalesOrderRecord = {
      id: 'ord-design-gate',
      company_id: TENANT_ID,
      order_number: 'ORD-2026-GATE',
      customer_id: 'cust-gate',
      customer_name: 'Gate Test Corp',
      customer_phone: '01700000000',
      salesperson_name: 'Sales Rep',
      order_date: '2026-09-19',
      delivery_date: '2026-09-25',
      priority: 'normal',
      status: 'confirmed',
      workflow_routing: 'design_required',
      commercial_status: 'invoice_created',
      invoice_id: 'inv-gate-01',
      invoice_number: 'INV-GATE-01',
      production_gate_status: 'blocked_design',
      subtotal: 5000,
      discount_amount: 0,
      vat_amount: 0,
      final_price: 5000,
      advance_amount: 5000,
      due_amount: 0,
      payment_terms: 'cash',
      items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.ORDERS, order)

    const jobOrder: JobOrderRecord = {
      id: 'job-design-gate-01',
      company_id: TENANT_ID,
      job_number: 'JOB-2026-GATE-A',
      order_id: order.id,
      product_name: 'Vehicle Wrap Graphics',
      customer_name: order.customer_name,
      quantity: 1,
      size_spec: 'Van wrap',
      material_spec: 'Cast Vinyl',
      artwork_status: 'pending',
      deadline: '2026-09-25 18:00',
      assigned_department: 'wide_format_print',
      status: 'queued',
      workflow_routing: 'design_required',
      commercial_status: 'invoice_created',
      production_gate_status: 'blocked_design',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.JOB_ORDERS, jobOrder)

    const printTask: ProductionTaskRecord = {
      id: 'tsk-gate-01',
      company_id: TENANT_ID,
      job_order_id: jobOrder.id,
      task_number: 'TSK-GATE-01',
      task_name: 'Vehicle Wrap UV Print',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 1,
      unit: 'pcs',
      priority: 'normal',
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, printTask)

    const tasks = await ProductionPlanningService.getTasks(TENANT_ID)
    const task = tasks.find((t) => t.id === 'tsk-gate-01')
    assert.strictEqual(task?.is_blocked_by_commercial_gate, false)
    assert.strictEqual(task?.is_blocked_by_design_gate, true)
    assert.strictEqual(task?.design_gate_reason, 'Customer design approval required')

    // Attempting to start must throw error on server
    await assert.rejects(
      async () => {
        await ProductionPlanningService.startTask('tsk-gate-01', TENANT_ID, 'op-gate', 'Gate Operator')
      },
      (err: Error) => {
        assert.match(err.message, /Design gate blocked/i)
        return true
      }
    )
  })

  it('Tenant Isolation: Cross-company access is strictly denied across queries and operations', async () => {
    const COMPANY_A = 'company-alpha'
    const COMPANY_B = 'company-beta'

    // Create invoice request in Company A
    const reqA = await InvoiceRequestService.createInvoiceRequest({
      companyId: COMPANY_A,
      salesOrderId: 'ord-alpha-01',
      orderNumber: 'ORD-ALPHA-01',
      customerId: 'cust-alpha',
      customerName: 'Alpha Customer',
      requestedById: 'user-alpha',
      requestedByName: 'Alpha User',
      notes: 'Company A order request',
    })

    assert.strictEqual(reqA.company_id, COMPANY_A)

    // Company B cannot see Company A request
    const listB = await InvoiceRequestService.getRequests(COMPANY_B)
    assert.strictEqual(listB.length, 0, 'Company B must not see Company A invoice requests')

    // Company A can see it
    const listA = await InvoiceRequestService.getRequests(COMPANY_A)
    assert.strictEqual(listA.length, 1)
    assert.strictEqual(listA[0].id, reqA.id)

    // Attempting to resolve Company A request from Company B throws error
    await assert.rejects(
      async () => {
        await InvoiceRequestService.resolveInvoiceRequest(reqA.id, 'inv-fake', 'INV-FAKE', COMPANY_B)
      },
      (err: Error) => {
        assert.match(err.message, /not found/i)
        return true
      }
    )
  })

  it('Notification deep linking and parameter payload correctness', async () => {
    const orderId = 'ord-deep-link-01'
    const customerName = 'DeepLink Enterprise'

    const req = await InvoiceRequestService.createInvoiceRequest({
      companyId: TENANT_ID,
      salesOrderId: orderId,
      orderNumber: 'ORD-DEEP-01',
      customerId: 'cust-deep',
      customerName: customerName,
      requestedById: 'des-deep',
      requestedByName: 'Deep Designer',
      notes: 'Commercial creation required',
    })

    const notifications = PrintERPDataStore.getAll(STORAGE_KEYS.IN_APP_NOTIFICATIONS) as any[]
    const notif = notifications.find((n) => n.action_url?.includes(orderId))

    assert.ok(notif, 'Notification must exist')
    assert.strictEqual(notif.type, 'invoice_request')
    assert.strictEqual(notif.category, 'billing')
    assert.ok(notif.action_url.includes('action=create_invoice'))
    assert.ok(notif.action_url.includes(`order_id=${encodeURIComponent(orderId)}`))
    assert.ok(notif.action_url.includes(`customer_name=${encodeURIComponent(customerName)}`))
  })

  it('Ready Production Operational Routing: Respects diverse department workflows (Fabrication vs Finishing vs Delivery)', async () => {
    // 1. Ready Production Job requiring Fabrication and Finishing (e.g. standard metal standees)
    const jobOrderFab: JobOrderRecord = {
      id: 'job-ready-fab',
      company_id: TENANT_ID,
      order_id: 'ord-ready-fab-01',
      job_number: 'JOB-READY-FAB-01',
      product_name: 'Stock Metal Standee Frame',
      customer_name: 'Retail Mega Store',
      quantity: 5,
      size_spec: '6ft x 2.5ft',
      material_spec: 'Powder-coated MS Tube',
      artwork_status: 'not_required',
      deadline: '2026-09-20 18:00',
      assigned_department: 'fabrication',
      status: 'queued',
      workflow_routing: 'ready_production',
      commercial_status: 'invoice_created',
      invoice_id: 'inv-ready-fab-01',
      production_gate_status: 'ready_for_production',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.JOB_ORDERS, jobOrderFab)

    const fabTask: ProductionTaskRecord = {
      id: 'tsk-fab-01',
      company_id: TENANT_ID,
      job_order_id: jobOrderFab.id,
      task_number: 'TSK-FAB-01',
      task_name: 'Frame Welding & Assembly',
      task_type: 'fabrication',
      department: 'fabrication',
      sequence_order: 1,
      quantity: 5,
      unit: 'pcs',
      priority: 'normal',
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, fabTask)

    const tasks = await ProductionPlanningService.getTasks(TENANT_ID)
    const task = tasks.find((t) => t.id === 'tsk-fab-01')
    assert.strictEqual(task?.is_blocked_by_commercial_gate, false)
    assert.strictEqual(task?.is_blocked_by_design_gate, false)
    assert.strictEqual(task?.department, 'fabrication')

    const started = await ProductionPlanningService.startTask('tsk-fab-01', TENANT_ID, 'op-fab', 'Welder Operator')
    assert.strictEqual(started.status, 'in_progress')
  })
})

