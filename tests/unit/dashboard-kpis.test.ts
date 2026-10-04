import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CanonicalFinance,
  type CanonicalSalesMetrics,
  type CanonicalCollectionMetrics,
  type CanonicalReceivablesMetrics,
  type CanonicalProfitMetrics,
} from '../../lib/finance/canonical-finance.ts'
import {
  getBangladeshTodayDateString,
  getBangladeshYesterdayDateString,
  toBangladeshDateString,
} from '../../lib/utils/business-date.ts'
import type { InvoiceRecord, PaymentRecord } from '../../types/billing.types.ts'
import type { JobCostingRecord } from '../../types/costing.types.ts'

describe('Dashboard KPIs Canonical Engine & Timezone Verification (Asia/Dhaka)', () => {
  const todayStr = getBangladeshTodayDateString()
  const yesterdayStr = getBangladeshYesterdayDateString()

  // 1. Seed deterministic known dataset
  const knownInvoices: InvoiceRecord[] = [
    {
      id: 'inv-001',
      company_id: 'test-co',
      branch_id: 'br-main',
      invoice_number: 'INV-2026-001',
      customer_id: 'cust-1',
      customer_name: 'Alpha Ltd',
      status: 'partially_paid',
      invoice_date: todayStr,
      due_date: todayStr,
      created_at: `${todayStr}T10:30:00+06:00`,
      subtotal: 10000,
      discount_amount: 500,
      vat_amount: 712.5, // 7.5% on 9500
      grand_total: 10212.5,
      paid_amount: 5000,
      due_amount: 5212.5,
      items: [],
    },
    {
      id: 'inv-002',
      company_id: 'test-co',
      branch_id: 'br-main',
      invoice_number: 'INV-2026-002',
      customer_id: 'cust-2',
      customer_name: 'Beta Corp',
      status: 'paid',
      invoice_date: todayStr,
      due_date: todayStr,
      created_at: `${todayStr}T14:15:00+06:00`,
      subtotal: 20000,
      discount_amount: 0,
      vat_amount: 3000, // 15% on 20000
      grand_total: 23000,
      paid_amount: 23000,
      due_amount: 0,
      items: [],
    },
    {
      id: 'inv-003',
      company_id: 'test-co',
      branch_id: 'br-main',
      invoice_number: 'INV-2026-003',
      customer_id: 'cust-3',
      customer_name: 'Gamma Traders',
      status: 'overdue',
      invoice_date: yesterdayStr,
      due_date: yesterdayStr,
      created_at: `${yesterdayStr}T11:00:00+06:00`,
      subtotal: 5000,
      discount_amount: 0,
      vat_amount: 0,
      grand_total: 5000,
      paid_amount: 0,
      due_amount: 5000,
      items: [],
    },
    {
      id: 'inv-004-cancelled',
      company_id: 'test-co',
      branch_id: 'br-main',
      invoice_number: 'INV-2026-004',
      customer_id: 'cust-4',
      customer_name: 'Voided Customer',
      status: 'cancelled',
      invoice_date: todayStr,
      due_date: todayStr,
      created_at: `${todayStr}T09:00:00+06:00`,
      subtotal: 15000,
      discount_amount: 0,
      vat_amount: 0,
      grand_total: 15000,
      paid_amount: 0,
      due_amount: 15000,
      items: [],
    },
  ]

  const knownPayments: PaymentRecord[] = [
    {
      id: 'pay-001',
      company_id: 'test-co',
      branch_id: 'br-main',
      payment_number: 'PAY-2026-001',
      invoice_id: 'inv-001',
      customer_id: 'cust-1',
      customer_name: 'Alpha Ltd',
      amount: 5000,
      payment_method: 'bkash',
      payment_date: todayStr,
      created_at: `${todayStr}T10:35:00+06:00`,
      status: 'completed',
    },
    {
      id: 'pay-002',
      company_id: 'test-co',
      branch_id: 'br-main',
      payment_number: 'PAY-2026-002',
      invoice_id: 'inv-002',
      customer_id: 'cust-2',
      customer_name: 'Beta Corp',
      amount: 23000,
      payment_method: 'bank_transfer',
      payment_date: todayStr,
      created_at: `${todayStr}T14:20:00+06:00`,
      status: 'completed',
    },
    {
      id: 'pay-003',
      company_id: 'test-co',
      branch_id: 'br-main',
      payment_number: 'PAY-2026-003',
      invoice_id: 'inv-000',
      customer_id: 'cust-old',
      customer_name: 'Old Cust',
      amount: 2000,
      payment_method: 'cash',
      payment_date: yesterdayStr,
      created_at: `${yesterdayStr}T16:00:00+06:00`,
      status: 'completed',
    },
  ]

  const knownCostings: JobCostingRecord[] = [
    {
      id: 'cost-001',
      company_id: 'test-co',
      invoice_id: 'inv-001',
      material_cost: 4000,
      machine_cost: 1000,
      labor_cost: 1500,
      other_cost: 500,
      total_cost: 7000,
      selling_price: 10212.5,
      gross_profit: 3212.5,
      profit_margin_percent: 31.46,
      created_at: `${todayStr}T10:30:00+06:00`,
    } as any,
    {
      id: 'cost-002',
      company_id: 'test-co',
      invoice_id: 'inv-002',
      material_cost: 10000,
      machine_cost: 2000,
      labor_cost: 3000,
      other_cost: 1000,
      total_cost: 16000,
      selling_price: 23000,
      gross_profit: 7000,
      profit_margin_percent: 30.43,
      created_at: `${todayStr}T14:15:00+06:00`,
    } as any,
  ]

  it('1. Asserts Sales KPI values strictly exclude cancelled invoices and match Asia/Dhaka date', () => {
    const salesMetrics: CanonicalSalesMetrics = CanonicalFinance.calculateSalesMetrics(knownInvoices, [], 'br-main')

    // Today Sales = 10,212.5 + 23,000 = 33,212.5 (Cancelled 15,000 MUST be ignored)
    assert.equal(salesMetrics.todaySales, 33212.5)
    assert.equal(salesMetrics.todaySalesCount, 2)

    // Yesterday Sales = 5,000
    assert.equal(salesMetrics.yesterdaySales, 5000)
    assert.equal(salesMetrics.yesterdaySalesCount, 1)

    // Change % = ((33212.5 - 5000) / 5000) * 100 = 564%
    assert.equal(salesMetrics.salesChangePercent, 564)
    assert.equal(salesMetrics.currency, 'BDT')
  })

  it('2. Asserts Collection KPI values match completed payments today and yesterday', () => {
    const colMetrics: CanonicalCollectionMetrics = CanonicalFinance.calculateCollectionMetrics(knownPayments, 'br-main')

    // Today Collection = 5,000 + 23,000 = 28,000
    assert.equal(colMetrics.todayCollection, 28000)
    assert.equal(colMetrics.todayCollectionCount, 2)

    // Yesterday Collection = 2,000
    assert.equal(colMetrics.yesterdayCollection, 2000)
    assert.equal(colMetrics.yesterdayCollectionCount, 1)

    // Change % = ((28000 - 2000) / 2000) * 100 = 1300%
    assert.equal(colMetrics.collectionChangePercent, 1300)
  })

  it('3. Asserts Total Receivables (Outstanding) matches active unpaid invoices only', () => {
    const recMetrics: CanonicalReceivablesMetrics = CanonicalFinance.calculateTotalReceivables(knownInvoices, 'br-main')

    // Total Due = 5,212.5 (from inv-001) + 5,000 (from inv-003) = 10,212.5
    // Inv-004 cancelled has 0 due
    assert.equal(recMetrics.totalDue, 10212.5)
    assert.equal(recMetrics.unpaidInvoicesCount, 2)

    // Overdue total = 5,000 (from inv-003 due yesterday)
    assert.equal(recMetrics.overdueTotal, 5000)
    assert.equal(recMetrics.overdueCount, 1)
  })

  it('4. Asserts Gross Profit and Margins are derived from True Costing vs Revenue', () => {
    const profitMetrics: CanonicalProfitMetrics = CanonicalFinance.calculateProfitMetrics(
      knownCostings,
      knownInvoices,
      'br-main'
    )

    // Total Revenue = 33,212.5
    assert.equal(profitMetrics.totalRevenue, 33212.5)

    // Total Cost = 7,000 + 16,000 = 23,000
    assert.equal(profitMetrics.totalCost, 23000)

    // Gross Profit = 33,212.5 - 23,000 = 10,212.5
    assert.equal(profitMetrics.grossProfit, 10212.5)

    // Margin % = Math.round((10,212.5 / 33,212.5) * 100) = 31%
    assert.equal(profitMetrics.marginPercent, 31)

    // Cost Breakdown
    assert.equal(profitMetrics.costBreakdown?.materialCost, 14000)
    assert.equal(profitMetrics.costBreakdown?.machineCost, 3000)
    assert.equal(profitMetrics.costBreakdown?.laborCost, 4500)
    assert.equal(profitMetrics.costBreakdown?.otherCost, 1500)
  })

  it('5. Asserts Timezone Asia/Dhaka accuracy across ISO strings', () => {
    // 2026-10-04T00:30:00+06:00 is Oct 4 in Dhaka
    // but in UTC it is 2026-10-03T18:30:00Z
    const utcIso = '2026-10-03T18:30:00.000Z'
    const bdtDate = toBangladeshDateString(utcIso)
    assert.equal(bdtDate, '2026-10-04')
  })
})
