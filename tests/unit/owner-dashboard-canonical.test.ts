import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  CanonicalFinance,
} from '../../lib/finance/canonical-finance.ts'
import {
  getBangladeshTodayDateString,
  getBangladeshYesterdayDateString,
  calculateDaysOverdue,
  formatBangladeshDate,
  getBangladeshGreeting,
  getBangladeshDateRange,
} from '../../lib/utils/business-date.ts'
import {
  JobRiskEngine,
} from '../../lib/dashboard/job-risk-engine.ts'
import type { InvoiceRecord, PaymentRecord } from '../../types/billing.types.ts'
import type { SalesOrderRecord } from '../../types/order.types.ts'
import type { ProductionJobRecord } from '../../types/production.types.ts'
import type { DeliveryChallanRecord } from '../../types/logistics.types.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'
import type { JobCostingRecord } from '../../types/costing.types.ts'

describe('Canonical Finance Engine', () => {
  const mockInvoices: InvoiceRecord[] = [
    {
      id: 'inv-1',
      company_id: 'comp-1',
      invoice_number: 'INV-1001',
      invoice_type: 'sales_invoice',
      customer_id: 'cust-1',
      customer_name: 'Customer Alpha',
      customer_phone: '01700000001',
      invoice_date: '2026-09-01',
      due_date: '2026-09-05',
      subtotal: 10000,
      discount_amount: 1000,
      vat_percentage: 5,
      vat_amount: 500,
      grand_total: 9500,
      paid_amount: 4000,
      due_amount: 5500,
      write_off_amount: 0,
      status: 'partially_paid',
      created_by_name: 'Admin',
      items: [],
      created_at: '2026-09-01T10:00:00Z',
      updated_at: '2026-09-01T10:00:00Z',
    },
    {
      id: 'inv-2',
      company_id: 'comp-1',
      invoice_number: 'INV-1002',
      invoice_type: 'sales_invoice',
      customer_id: 'cust-2',
      customer_name: 'Customer Beta',
      customer_phone: '01700000002',
      invoice_date: '2026-09-10',
      due_date: '2026-09-12',
      subtotal: 15000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 15000,
      paid_amount: 0,
      due_amount: 15000,
      write_off_amount: 0,
      status: 'unpaid',
      created_by_name: 'Admin',
      items: [],
      created_at: '2026-09-10T12:00:00Z',
      updated_at: '2026-09-10T12:00:00Z',
    },
    {
      id: 'inv-3',
      company_id: 'comp-1',
      invoice_number: 'INV-1003',
      invoice_type: 'sales_invoice',
      customer_id: 'cust-3',
      customer_name: 'Customer Gamma',
      customer_phone: '01700000003',
      invoice_date: '2026-09-15',
      due_date: '2026-09-20',
      subtotal: 5000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 5000,
      paid_amount: 5000,
      due_amount: 0,
      write_off_amount: 0,
      status: 'paid',
      created_by_name: 'Admin',
      items: [],
      created_at: '2026-09-15T08:00:00Z',
      updated_at: '2026-09-15T08:00:00Z',
    },
    {
      id: 'inv-4',
      company_id: 'comp-1',
      invoice_number: 'INV-1004',
      invoice_type: 'sales_invoice',
      customer_id: 'cust-4',
      customer_name: 'Customer Cancelled',
      customer_phone: '01700000004',
      invoice_date: '2026-09-01',
      due_date: '2026-09-02',
      subtotal: 8000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 8000,
      paid_amount: 0,
      due_amount: 8000,
      write_off_amount: 0,
      status: 'cancelled',
      created_by_name: 'Admin',
      items: [],
      created_at: '2026-09-01T08:00:00Z',
      updated_at: '2026-09-01T08:00:00Z',
    },
  ]

  it('calculates canonical invoice receivable accurately', () => {
    assert.strictEqual(CanonicalFinance.calculateInvoiceDue(mockInvoices[0]), 5500)
    assert.strictEqual(CanonicalFinance.calculateInvoiceDue(mockInvoices[1]), 15000)
    assert.strictEqual(CanonicalFinance.calculateInvoiceDue(mockInvoices[2]), 0)
    assert.strictEqual(CanonicalFinance.calculateInvoiceDue(mockInvoices[3]), 0) // cancelled invoice has 0 due
  })

  it('determines invoice overdue correctly based on due date', () => {
    assert.strictEqual(CanonicalFinance.isInvoiceOverdue(mockInvoices[0], '2026-09-15'), true) // due 2026-09-05
    assert.strictEqual(CanonicalFinance.isInvoiceOverdue(mockInvoices[1], '2026-09-15'), true) // due 2026-09-12
    assert.strictEqual(CanonicalFinance.isInvoiceOverdue(mockInvoices[2], '2026-09-15'), false) // paid
    assert.strictEqual(CanonicalFinance.isInvoiceOverdue(mockInvoices[3], '2026-09-15'), false) // cancelled
  })

  it('calculates total customer receivable excluding cancelled and paid invoices', () => {
    const res = CanonicalFinance.calculateTotalReceivables(mockInvoices)
    assert.strictEqual(res.totalDue, 20500) // 5500 + 15000
    assert.strictEqual(res.overdueCount, 2)
  })

  it('ranks overdue receivables by overdue days and amount', () => {
    const topOverdue = CanonicalFinance.getTopOverdueReceivables(mockInvoices, 5)
    assert.strictEqual(topOverdue.length, 2)
    assert.strictEqual(topOverdue[0].invoiceId, 'inv-1')
    assert.strictEqual(topOverdue[0].daysOverdue, calculateDaysOverdue(mockInvoices[0].due_date))
    assert.strictEqual(topOverdue[1].invoiceId, 'inv-2')
    assert.strictEqual(topOverdue[1].daysOverdue, calculateDaysOverdue(mockInvoices[1].due_date))
  })

  it('calculates sales today and sales yesterday strictly by Bangladesh date', () => {
    const todayStr = getBangladeshTodayDateString()
    const yesterdayStr = getBangladeshYesterdayDateString()

    const orders: SalesOrderRecord[] = [
      {
        id: 'ord-1',
        company_id: 'comp-1',
        order_number: 'ORD-1',
        customer_id: 'cust-1',
        customer_name: 'Customer 1',
        customer_phone: '01711111111',
        salesperson_name: 'Sales Rep',
        order_date: todayStr,
        delivery_date: todayStr,
        priority: 'normal',
        payment_terms: 'cash',
        subtotal: 12000,
        discount_amount: 0,
        vat_amount: 0,
        final_price: 12000,
        advance_amount: 0,
        due_amount: 12000,
        items: [],
        status: 'confirmed',
        created_at: `${todayStr}T04:30:00Z`,
        updated_at: `${todayStr}T04:30:00Z`,
      },
      {
        id: 'ord-2',
        company_id: 'comp-1',
        order_number: 'ORD-2',
        customer_id: 'cust-2',
        customer_name: 'Customer 2',
        customer_phone: '01711111112',
        salesperson_name: 'Sales Rep',
        order_date: yesterdayStr,
        delivery_date: yesterdayStr,
        priority: 'urgent',
        payment_terms: 'advance',
        subtotal: 8000,
        discount_amount: 0,
        vat_amount: 0,
        final_price: 8000,
        advance_amount: 0,
        due_amount: 8000,
        items: [],
        status: 'in_production',
        created_at: `${yesterdayStr}T10:00:00Z`,
        updated_at: `${yesterdayStr}T10:00:00Z`,
      },
      {
        id: 'ord-3',
        company_id: 'comp-1',
        order_number: 'ORD-3',
        customer_id: 'cust-3',
        customer_name: 'Customer 3',
        customer_phone: '01711111113',
        salesperson_name: 'Sales Rep',
        order_date: todayStr,
        delivery_date: todayStr,
        priority: 'normal',
        payment_terms: 'credit',
        subtotal: 5000,
        discount_amount: 0,
        vat_amount: 0,
        final_price: 5000,
        advance_amount: 0,
        due_amount: 5000,
        items: [],
        status: 'cancelled',
        created_at: `${todayStr}T06:00:00Z`,
        updated_at: `${todayStr}T06:00:00Z`,
      },
    ]

    const metrics = CanonicalFinance.calculateSalesMetrics([], orders)
    assert.strictEqual(metrics.todaySales, 12000) // excludes cancelled ord-3
    assert.strictEqual(metrics.yesterdaySales, 8000)
  })

  it('calculates collection today and yesterday strictly from valid payments', () => {
    const todayStr = getBangladeshTodayDateString()
    const yesterdayStr = getBangladeshYesterdayDateString()

    const payments: PaymentRecord[] = [
      {
        id: 'pay-1',
        company_id: 'comp-1',
        receipt_number: 'PAY-1',
        customer_id: 'cust-1',
        customer_name: 'Customer 1',
        amount: 7000,
        payment_type: 'full_payment',
        payment_method: 'bkash',
        payment_date: todayStr,
        received_by_name: 'Cashier',
        created_at: `${todayStr}T05:00:00Z`,
      },
      {
        id: 'pay-2',
        company_id: 'comp-1',
        receipt_number: 'PAY-2',
        customer_id: 'cust-2',
        customer_name: 'Customer 2',
        amount: 4000,
        payment_type: 'partial_payment',
        payment_method: 'cash',
        payment_date: yesterdayStr,
        received_by_name: 'Cashier',
        created_at: `${yesterdayStr}T09:00:00Z`,
      },
    ]

    const metrics = CanonicalFinance.calculateCollectionMetrics(payments)
    assert.strictEqual(metrics.todayCollection, 7000)
    assert.strictEqual(metrics.yesterdayCollection, 4000)
  })

  it('distinguishes reliable costing profit from insufficient costing data', () => {
    // Insufficient data case: no costing provided
    const noCosting = CanonicalFinance.calculateProfitMetrics(undefined, mockInvoices)
    assert.strictEqual(noCosting.hasReliableCostData, false)
    assert.strictEqual(noCosting.marginPercent, null)

    // Reliable costing data case
    const mockCostings: JobCostingRecord[] = [
      {
        id: 'cst-1',
        company_id: 'comp-1',
        job_number: 'JOB-1001',
        customer_id: 'cust-1',
        customer_name: 'Alpha',
        item_title: 'Signboard',
        quantity: 1,
        unit: 'pcs',
        selling_price: 10000,
        est: {
          material_cost: 4000,
          machine_cost: 1000,
          ink_cost: 500,
          printing_cost: 500,
          finishing_cost: 500,
          labor_cost: 1000,
          fabrication_cost: 0,
          installation_cost: 0,
          transport_cost: 0,
          other_cost: 0,
          total_cost: 6500,
          profit: 3500,
          margin_percentage: 35,
        },
        act: {
          material_cost: 4000,
          machine_cost: 1000,
          ink_cost: 500,
          printing_cost: 500,
          finishing_cost: 500,
          labor_cost: 1000,
          fabrication_cost: 0,
          installation_cost: 0,
          transport_cost: 0,
          other_cost: 0,
          total_cost: 6500,
          profit: 3500,
          margin_percentage: 35,
        },
        variances: {
          material_variance: 0,
          machine_variance: 0,
          labor_variance: 0,
          finishing_variance: 0,
          transport_variance: 0,
          total_variance: 0,
        },
        costing_snapshot: {},
        labor_cost_mode: 'fixed_job',
        status: 'actualized',
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
    ]

    const withCosting = CanonicalFinance.calculateProfitMetrics(mockCostings, mockInvoices)
    assert.strictEqual(withCosting.hasReliableCostData, true)
    assert.strictEqual(withCosting.grossProfit, 3500)
    assert.strictEqual(withCosting.marginPercent, 35)
  })
})

describe('Bangladesh Timezone & Business Date Helpers', () => {
  it('returns valid Asia/Dhaka YYYY-MM-DD date strings', () => {
    const today = getBangladeshTodayDateString()
    const yesterday = getBangladeshYesterdayDateString()

    assert.match(today, /^\d{4}-\d{2}-\d{2}$/)
    assert.match(yesterday, /^\d{4}-\d{2}-\d{2}$/)
    assert.notStrictEqual(today, yesterday)
  })

  it('calculates days overdue accurately without off-by-one errors', () => {
    assert.strictEqual(calculateDaysOverdue('2026-09-05', '2026-09-15'), 10)
    assert.strictEqual(calculateDaysOverdue('2026-09-15', '2026-09-15'), 0)
    assert.strictEqual(calculateDaysOverdue('2026-09-20', '2026-09-15'), 0) // Future date is not overdue
  })

  it('formats dates in English and Bengali', () => {
    const formattedEn = formatBangladeshDate('2026-09-15', 'en')
    const formattedBn = formatBangladeshDate('2026-09-15', 'bn')

    assert.ok(formattedEn.includes('2026'))
    assert.ok(formattedBn.length > 0)
  })

  it('returns appropriate greetings for time of day in Dhaka', () => {
    const greeting = getBangladeshGreeting()
    assert.ok(['Good morning', 'Good afternoon', 'Good evening', 'Good night', 'Welcome back'].includes(greeting.en))
    assert.ok(['শুভ সকাল', 'শুভ অপরাহ্ন', 'শুভ সন্ধ্যা', 'শুভ রাত্রি', 'স্বাগতম'].includes(greeting.bn))
  })

  it('generates correct date ranges for 7-day trend analysis', () => {
    const range = getBangladeshDateRange(7)
    assert.strictEqual(range.length, 7)
    assert.strictEqual(range[range.length - 1].dateStr, getBangladeshTodayDateString())
  })
})

describe('Job Risk & Blocked Work Engine', () => {
  it('evaluates critical, at-risk, and on-track status with multiple signals', () => {
    const criticalJob: ProductionJobRecord = {
      id: 'job-1',
      company_id: 'comp-1',
      production_job_number: 'JOB-1001',
      customer_name: 'Customer Alpha',
      product_name: 'Acrylic Signboard',
      department: 'printing',
      stage: 'printing',
      quantity: 5,
      material_spec: '5mm Acrylic',
      dimensions_spec: '4x3 ft',
      deadline: '2026-09-10T12:00:00Z', // In the past -> deadline missed
      status: 'queued',
      priority: 'very_urgent',
      has_rework: true,
      rework_count: 1,
      assigned_workers: [],
      created_at: '2026-09-08T10:00:00Z',
      updated_at: '2026-09-10T10:00:00Z',
    }

    const evaluatedCritical = JobRiskEngine.evaluateProductionJobRisk(criticalJob, [], '2026-09-15')
    assert.strictEqual(evaluatedCritical.riskLevel, 'critical')
    assert.strictEqual(evaluatedCritical.isBlocked, true)

    const onTrackJob: ProductionJobRecord = {
      id: 'job-2',
      company_id: 'comp-1',
      production_job_number: 'JOB-1002',
      customer_name: 'Customer Beta',
      product_name: 'Panaflex Banner',
      department: 'printing',
      stage: 'printing',
      quantity: 100,
      material_spec: '280gsm Panaflex',
      dimensions_spec: '10x3 ft',
      deadline: '2026-09-25T18:00:00Z',
      status: 'in_progress',
      priority: 'normal',
      has_rework: false,
      rework_count: 0,
      assigned_workers: ['worker-1'],
      created_at: '2026-09-15T02:00:00Z',
      updated_at: '2026-09-15T04:00:00Z',
    }

    const evaluatedOnTrack = JobRiskEngine.evaluateProductionJobRisk(onTrackJob, [], '2026-09-15')
    assert.strictEqual(evaluatedOnTrack.riskLevel, 'on_track')
    assert.strictEqual(evaluatedOnTrack.isBlocked, false)
  })

  it('aggregates actionable Needs Attention items across domains', () => {
    const productionJobs: ProductionJobRecord[] = [
      {
        id: 'job-1',
        company_id: 'comp-1',
        production_job_number: 'JOB-1001',
        customer_name: 'Alpha Corp',
        product_name: 'Banners',
        department: 'printing',
        stage: 'printing',
        quantity: 10,
        material_spec: 'Glossy',
        dimensions_spec: '6x3 ft',
        deadline: '2026-09-10T00:00:00Z',
        status: 'in_progress',
        priority: 'very_urgent',
        has_rework: true,
        rework_count: 1,
        assigned_workers: [],
        created_at: '2026-09-08T00:00:00Z',
        updated_at: '2026-09-08T00:00:00Z',
      },
    ]

    const overdueInvoices: InvoiceRecord[] = [
      {
        id: 'inv-1',
        company_id: 'comp-1',
        invoice_number: 'INV-1001',
        invoice_type: 'sales_invoice',
        customer_id: 'cust-1',
        customer_name: 'Alpha Corp',
        customer_phone: '01711111111',
        invoice_date: '2026-09-01',
        due_date: '2026-09-05',
        subtotal: 25000,
        discount_amount: 0,
        vat_percentage: 0,
        vat_amount: 0,
        grand_total: 25000,
        paid_amount: 0,
        due_amount: 25000,
        write_off_amount: 0,
        status: 'unpaid',
        created_by_name: 'Admin',
        items: [],
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
    ]

    const materials: MaterialRecord[] = [
      {
        id: 'mat-1',
        company_id: 'comp-1',
        sku: 'VINYL-01',
        name: 'Vinyl Sticker Sheet',
        category: 'rigid_sheet',
        unit: 'sft',
        is_roll: false,
        current_stock: 10,
        min_stock_level: 50, // Low stock!
        last_purchase_price: 10,
        average_cost: 10,
        manual_cost: 10,
        valuation_method: 'average_cost',
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
    ]

    const deliveryChallans: DeliveryChallanRecord[] = [
      {
        id: 'del-1',
        company_id: 'comp-1',
        challan_number: 'CH-1001',
        order_number: 'ORD-1001',
        customer_id: 'cust-1',
        customer_name: 'Alpha Corp',
        customer_phone: '01711111111',
        delivery_address: 'Gulshan, Dhaka',
        delivery_method: 'company_vehicle',
        transport_cost: 0,
        created_by_name: 'Admin',
        status: 'scheduled',
        scheduled_date: '2026-09-12', // Past date -> delayed!
        items: [],
        created_at: '2026-09-11T00:00:00Z',
        updated_at: '2026-09-11T00:00:00Z',
      },
    ]

    const attentionItems = JobRiskEngine.generateNeedsAttentionItems({
      productionJobs,
      invoices: overdueInvoices,
      deliveryChallans,
      materials,
    })

    assert.ok(attentionItems.length >= 3)

    const riskItem = attentionItems.find((i) => i.category === 'risk')
    assert.ok(riskItem)
    assert.strictEqual(riskItem?.severity, 'urgent')

    const moneyItem = attentionItems.find((i) => i.category === 'money')
    assert.ok(moneyItem)
    assert.strictEqual(moneyItem?.actionTarget, '/billing?tab=due')

    const materialItem = attentionItems.find((i) => i.category === 'material')
    assert.ok(materialItem)

    const deliveryItem = attentionItems.find((i) => i.category === 'delivery')
    assert.ok(deliveryItem)
  })

  it('filters blocked work items accurately', () => {
    const productionJobs: ProductionJobRecord[] = [
      {
        id: 'job-1',
        company_id: 'comp-1',
        production_job_number: 'JOB-1001',
        customer_name: 'Client A',
        product_name: 'Banners',
        department: 'printing',
        stage: 'printing',
        quantity: 10,
        material_spec: 'Glossy',
        dimensions_spec: '6x3 ft',
        deadline: '2026-09-10T00:00:00Z',
        status: 'queued',
        priority: 'very_urgent',
        has_rework: true,
        rework_count: 1,
        assigned_workers: [],
        created_at: '2026-09-08T00:00:00Z',
        updated_at: '2026-09-08T00:00:00Z',
      },
      {
        id: 'job-2',
        company_id: 'comp-1',
        production_job_number: 'JOB-1002',
        customer_name: 'Client B',
        product_name: 'Flyers',
        department: 'finishing',
        stage: 'finishing',
        quantity: 500,
        material_spec: '150gsm Art Paper',
        dimensions_spec: 'A4',
        deadline: '2026-09-20T00:00:00Z',
        status: 'in_progress',
        priority: 'normal',
        has_rework: false,
        rework_count: 0,
        assigned_workers: ['worker-1'],
        created_at: '2026-09-15T00:00:00Z',
        updated_at: '2026-09-15T00:00:00Z',
      },
    ]

    const blocked = JobRiskEngine.getBlockedWorkItems({ productionJobs })
    assert.strictEqual(blocked.length, 1)
    assert.strictEqual(blocked[0].id, 'job-1')
  })
})
