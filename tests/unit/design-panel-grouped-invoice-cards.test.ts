import { describe, it } from 'node:test'
import assert from 'node:assert'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { DesignRepository } from '../../lib/repositories/design.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { DesignJobRecord, DesignPriority, DesignStatus, DesignFormat } from '../../types/design.types.ts'
import type { InvoiceRecord } from '../../types/billing.types.ts'

interface GroupedDesignWorkItem {
  id: string
  jobRecord: DesignJobRecord
  design_number: string
  title: string
  product_name?: string | null
  dimensions_spec?: string | null
  material?: string | null
  finishing?: string | null
  quantity?: number | null
  unit?: string | null
  priority: DesignPriority
  status: DesignStatus
  workflow_routing?: 'design_required' | 'design_ok' | 'ready_production' | 'custom'
  commercial_status?: string | null
  current_version: number
  is_locked?: boolean
  customer_approval_required?: boolean
  format: DesignFormat
  proof_url: string
  proof_file_name: string
  designer_name: string
  deadline?: string | null
  instructions?: string | null
  created_at: string
}

interface GroupedDesignCard {
  groupId: string
  groupKey: string
  groupType: 'invoice' | 'order' | 'standalone'
  invoice_id?: string | null
  invoice_number?: string | null
  sales_order_id?: string | null
  order_number?: string | null
  customer_id?: string | null
  customer_name: string
  customer_phone?: string | null
  customer_email?: string | null
  deadline?: string | null
  created_at: string
  hasInvoice: boolean
  isInvoicePending: boolean
  invoice_request_id?: string | null
  works: GroupedDesignWorkItem[]
  overallStatus: 'all_approved' | 'in_progress' | 'awaiting_approval' | 'revisions' | 'received'
  approvedCount: number
  totalWorks: number
  highestPriority: DesignPriority
}

function buildGroupedDesignCards(
  jobs: DesignJobRecord[],
  invoices: InvoiceRecord[] = []
): GroupedDesignCard[] {
  const groupsMap = new Map<string, GroupedDesignCard>()

  for (const job of jobs) {
    let groupKey = ''
    let groupType: 'invoice' | 'order' | 'standalone' = 'standalone'

    if (job.invoice_id || job.invoice_number) {
      groupKey = `inv_${job.invoice_id || job.invoice_number}`
      groupType = 'invoice'
    } else if (job.sales_order_id || job.order_number) {
      groupKey = `ord_${job.sales_order_id || job.order_number}`
      groupType = 'order'
    } else {
      groupKey = `job_${job.id}`
      groupType = 'standalone'
    }

    const latestVersion = job.versions?.[job.versions.length - 1]
    const fmt = (latestVersion?.file_format || (latestVersion?.proof_file_name?.split('.').pop() as any) || 'png') as DesignFormat

    const workItem: GroupedDesignWorkItem = {
      id: job.id,
      jobRecord: job,
      design_number: job.design_number,
      title: job.title,
      product_name: job.product_name,
      dimensions_spec: job.dimensions_spec,
      material: job.material,
      finishing: job.finishing,
      quantity: job.quantity,
      unit: job.unit,
      priority: job.priority || 'normal',
      status: job.status,
      workflow_routing: job.workflow_routing,
      commercial_status: job.commercial_status,
      current_version: job.current_version || 1,
      is_locked: job.is_locked,
      customer_approval_required: job.customer_approval_required,
      format: fmt,
      proof_url: latestVersion?.proof_file_url || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80',
      proof_file_name: latestVersion?.proof_file_name || `${job.design_number}.${fmt}`,
      designer_name: job.designer_name || 'Designer',
      deadline: job.deadline,
      instructions: job.instructions,
      created_at: job.created_at,
    }

    if (!groupsMap.has(groupKey)) {
      const matchingInv = invoices.find((i) => i.id === job.invoice_id || i.invoice_number === job.invoice_number)

      groupsMap.set(groupKey, {
        groupId: groupKey,
        groupKey,
        groupType,
        invoice_id: job.invoice_id || matchingInv?.id || null,
        invoice_number: job.invoice_number || matchingInv?.invoice_number || null,
        sales_order_id: job.sales_order_id || null,
        order_number: job.order_number || null,
        customer_id: job.customer_id || matchingInv?.customer_id || null,
        customer_name: job.customer_name || matchingInv?.customer_name || 'Walk-in Customer',
        customer_phone: (job as any).customer_phone || matchingInv?.customer_phone || null,
        customer_email: (job as any).customer_email || matchingInv?.customer_email || null,
        deadline: job.deadline || matchingInv?.due_date || null,
        created_at: job.created_at || matchingInv?.created_at || new Date().toISOString(),
        hasInvoice: Boolean(job.invoice_id || job.invoice_number || matchingInv || job.commercial_status === 'invoice_created'),
        isInvoicePending: job.commercial_status === 'invoice_requested',
        invoice_request_id: job.invoice_request_id || null,
        works: [workItem],
        overallStatus: job.status === 'approved' ? 'all_approved' : job.status === 'customer_approval' ? 'awaiting_approval' : job.status === 'revision' ? 'revisions' : 'in_progress',
        approvedCount: job.status === 'approved' || job.is_locked ? 1 : 0,
        totalWorks: 1,
        highestPriority: job.priority || 'normal',
      })
    } else {
      const group = groupsMap.get(groupKey)!
      group.works.push(workItem)
      group.totalWorks = group.works.length
      group.approvedCount = group.works.filter((w) => w.status === 'approved' || w.is_locked).length
      if (group.approvedCount === group.totalWorks) {
        group.overallStatus = 'all_approved'
      } else if (group.works.some((w) => w.status === 'revision')) {
        group.overallStatus = 'revisions'
      } else if (group.works.some((w) => w.status === 'customer_approval')) {
        group.overallStatus = 'awaiting_approval'
      } else if (group.works.some((w) => w.status === 'designing' || w.status === 'in_progress')) {
        group.overallStatus = 'in_progress'
      } else {
        group.overallStatus = 'received'
      }

      const priorityOrder: Record<DesignPriority, number> = { very_urgent: 3, urgent: 2, normal: 1 }
      if (priorityOrder[workItem.priority] > priorityOrder[group.highestPriority]) {
        group.highestPriority = workItem.priority
      }
    }
  }

  return Array.from(groupsMap.values())
}

describe('Design Panel - Unified Multi-Work Invoice Card Grouping Tests', () => {
  const TENANT_ID = `tenant-grouped-inv-${Date.now()}`

  it('1. Groups all 3 works from the same invoice into exactly ONE card', async () => {
    // 1. Create Invoice with 3 distinct custom design items
    const invoice = await BillingRepository.createInvoice({
      company_id: TENANT_ID,
      customer_name: 'Beximco Communications Ltd',
      customer_phone: '+8801811223344',
      due_date: '2026-11-15',
      grand_total: 95000,
      paid_amount: 50000,
      due_amount: 45000,
      created_by_name: 'Lead Commercial Officer',
      items: [
        {
          item_name: 'Outdoor Highway Billboard 40x20ft',
          item_description: 'PVC Panagraphics Flex with UV Print',
          quantity: 1,
          unit: 'pcs',
          unit_price: 45000,
          total_price: 45000,
          item_kind: 'custom_manufacturing',
          workflow_routing: 'design_required',
          design_required: true,
          dimensions_spec: '40ft × 20ft',
        } as any,
        {
          item_name: 'Acrylic LED Glow Signboard',
          item_description: '3D Lettering with Korean Module LED',
          quantity: 2,
          unit: 'pcs',
          unit_price: 15000,
          total_price: 30000,
          item_kind: 'custom_manufacturing',
          workflow_routing: 'design_ok',
          design_required: false,
          dimensions_spec: '12ft × 3ft',
        } as any,
        {
          item_name: 'Roll-up Standee 6x2.5ft',
          item_description: 'Roll-up Standee Artwork Design & Print',
          quantity: 4,
          unit: 'pcs',
          unit_price: 5000,
          total_price: 20000,
          item_kind: 'custom_manufacturing',
          workflow_routing: 'design_required',
          design_required: true,
          dimensions_spec: '6ft × 2.5ft',
        } as any,
      ],
    })

    assert.ok(invoice.id)
    assert.ok(invoice.invoice_number)

    // 2. Fetch jobs from repository
    const jobs = await DesignRepository.getDesignJobs(TENANT_ID)
    const invoiceJobs = jobs.filter((j) => j.invoice_id === invoice.id || j.invoice_number === invoice.invoice_number)
    assert.strictEqual(invoiceJobs.length, 3, 'Must have 3 distinct design work items for the 3 invoice items')

    // 3. Build Grouped Cards
    const cards = buildGroupedDesignCards(invoiceJobs, [invoice])

    // 4. Validate unified card grouping
    assert.strictEqual(cards.length, 1, 'Must group all 3 invoice items into exactly ONE Card')

    const card = cards[0]
    assert.strictEqual(card.groupType, 'invoice')
    assert.strictEqual(card.invoice_number, invoice.invoice_number)
    assert.strictEqual(card.customer_name, 'Beximco Communications Ltd')
    assert.strictEqual(card.customer_phone, '+8801811223344')
    assert.strictEqual(card.totalWorks, 3)
    assert.strictEqual(card.works.length, 3)

    // 5. Verify individual work items within the grouped card
    assert.strictEqual(card.works[0].title, 'PVC Panagraphics Flex with UV Print')
    assert.strictEqual(card.works[0].workflow_routing, 'design_required')
    assert.strictEqual(card.works[0].dimensions_spec, '40ft × 20ft')

    assert.strictEqual(card.works[1].title, '3D Lettering with Korean Module LED')
    assert.strictEqual(card.works[1].workflow_routing, 'design_ok')
    assert.strictEqual(card.works[1].dimensions_spec, '12ft × 3ft')

    assert.strictEqual(card.works[2].title, 'Roll-up Standee Artwork Design & Print')
    assert.strictEqual(card.works[2].workflow_routing, 'design_required')
    assert.strictEqual(card.works[2].dimensions_spec, '6ft × 2.5ft')
  })

  it('2. Maintains standalone projects and order-based groups separately from invoice cards', async () => {
    const standaloneJob: DesignJobRecord = {
      id: `dsn-standalone-${Date.now()}`,
      company_id: TENANT_ID,
      design_number: 'DSN-999991',
      customer_name: 'Walk-in Retail Client',
      title: 'Visiting Card Minimalist Redesign',
      designer_name: 'Tanvir Ahmed',
      priority: 'urgent',
      status: 'received',
      deadline: '2026-11-20',
      dimensions_spec: '3.5 × 2.0 in',
      current_version: 1,
      versions: [
        {
          id: 'dv-1',
          design_job_id: `dsn-standalone-${Date.now()}`,
          version_number: 1,
          proof_file_name: 'visiting_card.png',
          file_format: 'png',
          proof_file_url: 'https://example.com/vc.png',
          created_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const orderJobA: DesignJobRecord = {
      id: `dsn-ord-1`,
      company_id: TENANT_ID,
      sales_order_id: 'so-1001',
      order_number: 'ORD-1001',
      design_number: 'DSN-ORD-1A',
      customer_name: 'Daraz Bangladesh',
      title: 'Daraz 11.11 Promotional Banner',
      designer_name: 'Design Team',
      priority: 'very_urgent',
      status: 'designing',
      deadline: '2026-11-10',
      dimensions_spec: '10 × 4 ft',
      current_version: 1,
      versions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const orderJobB: DesignJobRecord = {
      id: `dsn-ord-2`,
      company_id: TENANT_ID,
      sales_order_id: 'so-1001',
      order_number: 'ORD-1001',
      design_number: 'DSN-ORD-1B',
      customer_name: 'Daraz Bangladesh',
      title: 'Daraz 11.11 Voucher Coupon',
      designer_name: 'Design Team',
      priority: 'normal',
      status: 'approved',
      deadline: '2026-11-10',
      dimensions_spec: '8 × 4 in',
      current_version: 1,
      versions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const cards = buildGroupedDesignCards([standaloneJob, orderJobA, orderJobB])

    // Should result in 2 cards: 1 standalone card + 1 combined order card (with 2 works)
    assert.strictEqual(cards.length, 2)

    const standaloneCard = cards.find((c) => c.groupId === `job_${standaloneJob.id}`)
    assert.ok(standaloneCard)
    assert.strictEqual(standaloneCard.groupType, 'standalone')
    assert.strictEqual(standaloneCard.totalWorks, 1)

    const orderCard = cards.find((c) => c.groupId === 'ord_ORD-1001' || c.groupId === 'ord_so-1001')
    assert.ok(orderCard)
    assert.strictEqual(orderCard.groupType, 'order')
    assert.strictEqual(orderCard.order_number, 'ORD-1001')
    assert.strictEqual(orderCard.totalWorks, 2)
    assert.strictEqual(orderCard.highestPriority, 'very_urgent')
    assert.strictEqual(orderCard.approvedCount, 1)
  })
})
