import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveChildJobWorkflow,
  resolveOrderJobWorkflow,
  type CanonicalWorkflowStageId,
} from '../../lib/workflow/workflow-engine.ts'
import type { SalesOrderRecord, JobOrderRecord } from '../../types/order.types.ts'
import type { ProductionTaskRecord } from '../../types/production.types.ts'
import type { DesignJobRecord } from '../../types/design.types.ts'
import type { DeliveryChallanRecord } from '../../types/logistics.types.ts'

describe('Canonical Order-to-Delivery Workflow Engine Tests', () => {
  const mockOrder: SalesOrderRecord = {
    id: 'ord-001',
    company_id: 'comp-101',
    order_number: 'ORD-2026-0001',
    customer_id: 'cust-101',
    customer_name: 'Acme Advertising',
    customer_phone: '01711000000',
    order_date: '2026-10-01',
    delivery_date: '2026-10-03',
    priority: 'normal',
    status: 'confirmed',
    payment_terms: 'advance',
    subtotal: 10000,
    final_price: 10000,
    advance_amount: 5000,
    due_amount: 5000,
    workflow_routing: 'design_required',
    commercial_status: 'invoice_created',
    invoice_id: 'inv-001',
    invoice_number: 'INV-2026-0001',
    items: [
      {
        id: 'item-1',
        item_name: 'PVC Flex Banner',
        width: 10,
        height: 5,
        dimension_unit: 'ft',
        quantity: 2,
        unit: 'pcs',
        unit_price: 2500,
        total_price: 5000,
        design_required: true,
      },
      {
        id: 'item-2',
        item_name: 'ACP 3D Letter Signboard',
        width: 8,
        height: 4,
        dimension_unit: 'ft',
        quantity: 1,
        unit: 'pcs',
        unit_price: 5000,
        total_price: 5000,
        finishing: 'Welding and Lamination',
      },
    ],
  }

  const mockJobs: JobOrderRecord[] = [
    {
      id: 'job-001',
      company_id: 'comp-101',
      sales_order_id: 'ord-001',
      order_number: 'ORD-2026-0001',
      job_number: 'JOB-2026-0001-1',
      title: 'PVC Flex Banner',
      product_name: 'PVC Flex Banner',
      production_type: 'large_format',
      assigned_department: 'printing',
      status: 'queued',
      priority: 'normal',
      workflow_routing: 'design_required',
      artwork_status: 'pending',
      quantity: 2,
      created_at: '2026-10-01T10:00:00Z',
    },
    {
      id: 'job-002',
      company_id: 'comp-101',
      sales_order_id: 'ord-001',
      order_number: 'ORD-2026-0001',
      job_number: 'JOB-2026-0001-2',
      title: 'ACP 3D Letter Signboard',
      product_name: 'ACP 3D Letter Signboard',
      production_type: 'large_format',
      assigned_department: 'fabrication',
      status: 'in_progress',
      priority: 'normal',
      workflow_routing: 'ready_production',
      artwork_status: 'approved',
      quantity: 1,
      created_at: '2026-10-01T10:00:00Z',
    },
  ]

  it('1. Design Gate Block: Unapproved artwork holds production and sets isBlocked = true', () => {
    const designJobs: DesignJobRecord[] = [
      {
        id: 'dsn-001',
        company_id: 'comp-101',
        title: 'PVC Flex Banner',
        status: 'customer_approval',
        order_number: 'ORD-2026-0001',
        job_order_id: 'job-001',
        created_at: '2026-10-01T10:00:00Z',
      },
    ]

    const resolution = resolveOrderJobWorkflow(mockOrder, mockJobs, [], designJobs, [], 'test-tenant')

    assert.equal(resolution.overallStage, 'approval')
    assert.equal(resolution.isBlocked, true)
    assert.ok(resolution.blockedReasonEn?.includes('approval'))
    assert.ok(resolution.nextActionHref.includes('design'))

    // The first job is waiting proof approval
    const job1 = resolution.childJobs.find((j) => j.jobId === 'job-001')!
    assert.equal(job1.stage, 'approval')
    assert.equal(job1.isBlocked, true)

    // Stepper reflects approval stage
    const approvalStep = resolution.stepperStages.find((s) => s.id === 'approval')!
    assert.equal(approvalStep.status, 'blocked')
  })

  it('2. Production Advancement: Approved artwork unblocks production queue', () => {
    const approvedJobs = mockJobs.map((j) => ({
      ...j,
      artwork_status: 'approved' as const,
      workflow_routing: 'design_ok' as const,
    }))

    const tasks: ProductionTaskRecord[] = [
      {
        id: 'tsk-001',
        company_id: 'comp-101',
        job_order_id: 'job-001',
        job_number: 'JOB-2026-0001-1',
        task_name: 'Eco-Solvent Print Banner',
        task_type: 'printing',
        department: 'printing',
        status: 'in_progress',
        quantity: 2,
        assigned_machine_name: 'Printer A',
        created_at: '2026-10-01T10:00:00Z',
      },
    ]

    const resolution = resolveOrderJobWorkflow(mockOrder, approvedJobs, tasks, [], [], 'test-tenant')

    assert.equal(resolution.overallStage, 'production')
    assert.equal(resolution.isBlocked, false)
    assert.equal(resolution.overallStageLabelEn, 'In Production')
    assert.ok(resolution.nextActionHref.includes('production'))
  })

  it('3. Finishing & Post-Press: Printed items advance to finishing before dispatch', () => {
    const finishedPrintJobs = mockJobs.map((j) => ({
      ...j,
      artwork_status: 'approved' as const,
    }))

    const tasks: ProductionTaskRecord[] = [
      {
        id: 'tsk-001',
        company_id: 'comp-101',
        job_order_id: 'job-001',
        job_number: 'JOB-2026-0001-1',
        task_name: 'Eco-Solvent Print Banner',
        task_type: 'printing',
        department: 'printing',
        status: 'completed',
        quantity: 2,
        created_at: '2026-10-01T10:00:00Z',
      },
      {
        id: 'tsk-002',
        company_id: 'comp-101',
        job_order_id: 'job-001',
        job_number: 'JOB-2026-0001-1',
        task_name: 'Eyelets and Hemming',
        task_type: 'finishing',
        department: 'finishing',
        status: 'in_progress',
        quantity: 2,
        created_at: '2026-10-01T10:00:00Z',
      },
    ]

    const resolution = resolveOrderJobWorkflow(mockOrder, [finishedPrintJobs[0]], tasks, [], [], 'test-tenant')

    assert.equal(resolution.overallStage, 'finishing')
    assert.equal(resolution.overallStageLabelEn, 'Finishing & Fabrication')
    assert.ok(resolution.nextActionHref.includes('finishing'))
  })

  it('4. Partial Delivery: Delivering Job 1 while Job 2 is in production sets isPartiallyDelivered = true', () => {
    const challans: DeliveryChallanRecord[] = [
      {
        id: 'chl-001',
        company_id: 'comp-101',
        challan_number: 'DC-2026-0001',
        sales_order_id: 'ord-001',
        order_number: 'ORD-2026-0001',
        status: 'delivered',
        recipient_name: 'Acme Receiving',
        recipient_phone: '01711000000',
        destination_address: 'Dhaka',
        delivered_at: '2026-10-02T12:00:00Z',
        items: [
          {
            id: 'it-chl-1',
            challan_id: 'chl-001',
            product_description: 'PVC Flex Banner',
            quantity: 2,
            unit: 'pcs',
            remarks: 'JOB-2026-0001-1 delivered via courier',
          },
        ],
        created_at: '2026-10-02T10:00:00Z',
      },
    ]

    const tasks: ProductionTaskRecord[] = [
      {
        id: 'tsk-001',
        company_id: 'comp-101',
        job_order_id: 'job-001',
        job_number: 'JOB-2026-0001-1',
        task_name: 'Print Banner',
        task_type: 'printing',
        status: 'completed',
        created_at: '2026-10-01T10:00:00Z',
      },
      {
        id: 'tsk-002',
        company_id: 'comp-101',
        job_order_id: 'job-002',
        job_number: 'JOB-2026-0001-2',
        task_name: 'Assemble ACP Signboard',
        task_type: 'printing',
        status: 'in_progress',
        created_at: '2026-10-01T10:00:00Z',
      },
    ]

    const resolution = resolveOrderJobWorkflow(mockOrder, mockJobs, tasks, [], challans, 'test-tenant')

    assert.equal(resolution.isPartiallyDelivered, true)
    assert.equal(resolution.isFullyDelivered, false)
    assert.equal(resolution.overallStage, 'delivery')
    assert.equal(resolution.overallStageLabelEn, 'Partially Delivered')
    assert.notEqual(resolution.overallStage, 'completed', 'Must NOT prematurely mark order completed')

    const child1 = resolution.childJobs.find((j) => j.jobId === 'job-001')!
    assert.equal(child1.isDelivered, true)

    const child2 = resolution.childJobs.find((j) => j.jobId === 'job-002')!
    assert.equal(child2.isDelivered, false)
  })

  it('5. Full Delivery & Settlement: Fully delivered with outstanding balance shows Payment Due', () => {
    const challans: DeliveryChallanRecord[] = [
      {
        id: 'chl-001',
        company_id: 'comp-101',
        challan_number: 'DC-2026-0001',
        sales_order_id: 'ord-001',
        order_number: 'ORD-2026-0001',
        status: 'delivered',
        recipient_name: 'Acme Receiving',
        recipient_phone: '01711000000',
        destination_address: 'Dhaka',
        delivered_at: '2026-10-02T12:00:00Z',
        items: [
          {
            id: 'it-chl-1',
            challan_id: 'chl-001',
            product_description: 'PVC Flex Banner',
            quantity: 2,
            remarks: 'JOB-2026-0001-1',
          },
          {
            id: 'it-chl-2',
            challan_id: 'chl-001',
            product_description: 'ACP 3D Letter Signboard',
            quantity: 1,
            remarks: 'JOB-2026-0001-2',
          },
        ],
        created_at: '2026-10-02T10:00:00Z',
      },
    ]

    const resolution = resolveOrderJobWorkflow(mockOrder, mockJobs, [], [], challans, 'test-tenant')

    assert.equal(resolution.isFullyDelivered, true)
    assert.equal(resolution.hasPendingDue, true)
    assert.equal(resolution.overallStageLabelEn, 'Delivered (Payment Due)')
    assert.ok(resolution.nextActionEn.includes('Payment') || resolution.nextActionEn.includes('Collect'))
  })

  it('6. Fully Paid Settlement: Fully delivered and fully paid shows Completed & Settled', () => {
    const paidOrder: SalesOrderRecord = {
      ...mockOrder,
      due_amount: 0,
      advance_amount: 10000,
      status: 'completed',
    }

    const challans: DeliveryChallanRecord[] = [
      {
        id: 'chl-001',
        company_id: 'comp-101',
        challan_number: 'DC-2026-0001',
        sales_order_id: 'ord-001',
        order_number: 'ORD-2026-0001',
        status: 'delivered',
        recipient_name: 'Acme Receiving',
        recipient_phone: '01711000000',
        destination_address: 'Dhaka',
        delivered_at: '2026-10-02T12:00:00Z',
        items: [
          {
            id: 'it-chl-1',
            challan_id: 'chl-001',
            product_description: 'PVC Flex Banner',
            quantity: 2,
            remarks: 'JOB-2026-0001-1',
          },
          {
            id: 'it-chl-2',
            challan_id: 'chl-001',
            product_description: 'ACP 3D Letter Signboard',
            quantity: 1,
            remarks: 'JOB-2026-0001-2',
          },
        ],
        created_at: '2026-10-02T10:00:00Z',
      },
    ]

    const resolution = resolveOrderJobWorkflow(paidOrder, mockJobs, [], [], challans, 'test-tenant')

    assert.equal(resolution.isFullyDelivered, true)
    assert.equal(resolution.isFullyPaid, true)
    assert.equal(resolution.hasPendingDue, false)
    assert.equal(resolution.overallStage, 'completed')
    assert.equal(resolution.overallStageLabelEn, 'Completed & Settled')
    assert.equal(resolution.progressPercentage, 100)
  })

  it('7. Ready Product Flow: Standard retail products bypass design and machine queue', () => {
    const retailOrder: SalesOrderRecord = {
      ...mockOrder,
      workflow_routing: 'ready_product',
      items: [
        {
          id: 'it-retail-1',
          item_name: 'X-Banner Stand 2x5 ft (Hardware Only)',
          quantity: 5,
          unit: 'pcs',
          unit_price: 650,
          total_price: 3250,
        },
      ],
    }

    const resolution = resolveOrderJobWorkflow(retailOrder, [], [], [], [], 'test-tenant')

    assert.equal(resolution.materialsSummary.hasDesign, false)
    assert.equal(resolution.materialsSummary.hasPrint, false)
    // Stepper marks design and finishing as skipped
    const designStep = resolution.stepperStages.find((s) => s.id === 'design')!
    assert.equal(designStep.status, 'skipped')
  })

  it('8. Human Stage & Blocker Direct Action: Approval and Material blockers expose direct action links', () => {
    const unapprovedJob: JobOrderRecord = {
      ...mockJobs[0],
      artwork_status: 'pending',
      workflow_routing: 'design_required',
    }

    const resolution = resolveChildJobWorkflow(
      unapprovedJob,
      [],
      {
        id: 'dsn-1',
        company_id: 'comp-101',
        title: 'PVC Banner',
        status: 'customer_approval',
        created_at: '2026-10-01T10:00:00Z',
      },
      [],
      'print-shop'
    )

    assert.equal(resolution.humanStage, 'Waiting for Approval')
    assert.equal(resolution.isBlocked, true)
    assert.equal(resolution.blockerActionLabelEn, 'Open Approval')
    assert.equal(resolution.blockerActionHref, '/print-shop/design?job=JOB-2026-0001-1')
    assert.equal(resolution.nextActionEn, 'Approve Design Proof')
  })

  it('9. Derived Order Status: 1 Delivered, 1 Finishing, 1 In Production resolves to In Progress (not Delivered)', () => {
    const jobA: JobOrderRecord = {
      ...mockJobs[0],
      id: 'j-a',
      job_number: 'JOB-A',
      title: 'Banner',
      product_name: 'Banner',
    }
    const jobB: JobOrderRecord = {
      ...mockJobs[1],
      id: 'j-b',
      job_number: 'JOB-B',
      title: 'ACP Sign',
      product_name: 'ACP Sign',
      assigned_department: 'fabrication',
    }
    const jobC: JobOrderRecord = {
      ...mockJobs[0],
      id: 'j-c',
      job_number: 'JOB-C',
      title: 'Business Card',
      product_name: 'Business Card',
      artwork_status: 'approved',
    }

    // Job A is delivered
    const challanA: DeliveryChallanRecord = {
      id: 'ch-a',
      company_id: 'comp-101',
      challan_number: 'DC-01',
      sales_order_id: mockOrder.id,
      order_number: mockOrder.order_number,
      status: 'delivered',
      recipient_name: 'Receiver',
      items: [
        {
          id: 'ci-1',
          challan_id: 'ch-a',
          product_description: 'Banner',
          quantity: 2,
          remarks: 'JOB-A',
        },
      ],
      created_at: '2026-10-01T10:00:00Z',
    }

    // Job B is in finishing / fabrication
    const taskB: ProductionTaskRecord[] = [
      {
        id: 't-b1',
        company_id: 'comp-101',
        job_order_id: 'j-b',
        job_number: 'JOB-B',
        task_name: 'Print Face',
        task_type: 'printing',
        status: 'completed',
        created_at: '2026-10-01T10:00:00Z',
      },
      {
        id: 't-b2',
        company_id: 'comp-101',
        job_order_id: 'j-b',
        job_number: 'JOB-B',
        task_name: 'Fabricate 3D Letter',
        task_type: 'fabrication',
        status: 'in_progress',
        created_at: '2026-10-01T10:00:00Z',
      },
    ]

    // Job C is in printing
    const taskC: ProductionTaskRecord[] = [
      {
        id: 't-c1',
        company_id: 'comp-101',
        job_order_id: 'j-c',
        job_number: 'JOB-C',
        task_name: 'Offset Print Card',
        task_type: 'printing',
        status: 'in_progress',
        created_at: '2026-10-01T10:00:00Z',
      },
    ]

    const resolution = resolveOrderJobWorkflow(
      mockOrder,
      [jobA, jobB, jobC],
      [...taskB, ...taskC],
      [],
      [challanA],
      'print-shop'
    )

    // Order status must be Partially Delivered or In Progress, NEVER Delivered
    assert.equal(resolution.derivedOrderStatus, 'Partially Delivered')
    assert.equal(resolution.isFullyDelivered, false)
    assert.equal(resolution.isPartiallyDelivered, true)

    // Jobs summary mini-checklist must have 3 items
    assert.equal(resolution.jobsSummary.total, 3)
    assert.equal(resolution.jobsSummary.delivered, 1)
    assert.equal(resolution.jobsSummary.miniList[0].statusIcon, '✓')
    assert.equal(resolution.jobsSummary.miniList[0].title, 'Banner')
    assert.equal(resolution.jobsSummary.miniList[1].statusIcon, '●')
    assert.equal(resolution.jobsSummary.miniList[1].title, 'ACP Sign')
    assert.equal(resolution.jobsSummary.miniList[2].statusIcon, '●')
    assert.equal(resolution.jobsSummary.miniList[2].title, 'Business Card')
  })
})

