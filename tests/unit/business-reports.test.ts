import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ReportsService,
  getDateRangeForPeriod,
} from '../../services/reports.service.ts'
import type { InvoiceRecord, PaymentRecord } from '../../types/billing.types.ts'
import type { SalesOrderRecord } from '../../types/order.types.ts'
import type { ProductionJobRecord } from '../../types/production.types.ts'
import type { CustomerRecord } from '../../types/crm.types.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'
import type { ExpenseRecord } from '../../types/accounting.types.ts'

describe('Business Reports Calculation Engine', () => {
  it('correctly calculates date ranges for all period keys', () => {
    const today = getDateRangeForPeriod('today')
    assert.ok(today.start instanceof Date)
    assert.ok(today.end instanceof Date)
    assert.ok(today.start <= today.end)

    const thisMonth = getDateRangeForPeriod('this_month')
    assert.equal(thisMonth.start.getDate(), 1)

    const custom = getDateRangeForPeriod('custom', '2026-09-01', '2026-09-30')
    assert.equal(custom.start.toLocaleDateString('en-CA'), '2026-09-01')
    assert.equal(custom.end.toLocaleDateString('en-CA'), '2026-09-30')
  })

  it('handles empty datasets cleanly without crashing or NaN values', () => {
    const result = ReportsService.computeBusinessReport({
      invoices: [],
      orders: [],
      payments: [],
      expenses: [],
      jobs: [],
      customers: [],
      materials: [],
      period: 'this_month',
    })

    assert.equal(result.summary.totalSales, 0)
    assert.equal(result.summary.invoicesCount, 0)
    assert.equal(result.summary.totalJobs, 0)
    assert.equal(result.summary.grossProfit, 0)
    assert.equal(result.summary.grossProfitMarginPercent, 0)
    assert.equal(result.summary.totalExpenses, 0)
    assert.equal(result.salesByProduct.length, 0)
    assert.equal(result.topSellingProducts.length, 0)
    assert.equal(result.topCustomers.length, 0)
  })

  it('correctly aggregates real invoice and order metrics', () => {
    const nowStr = new Date().toISOString()
    const mockInvoices: InvoiceRecord[] = [
      {
        id: 'inv-1',
        company_id: 'c-1',
        invoice_number: 'INV-001',
        customer_id: 'cust-1',
        customer_name: 'ABC Corp',
        grand_total: 100000,
        subtotal: 100000,
        paid_amount: 80000,
        due_amount: 20000,
        status: 'partially_paid',
        invoice_date: nowStr.slice(0, 10),
        created_at: nowStr,
        items: [],
      } as any,
      {
        id: 'inv-2',
        company_id: 'c-1',
        invoice_number: 'INV-002',
        customer_id: 'cust-2',
        customer_name: 'XYZ Retail',
        grand_total: 50000,
        subtotal: 50000,
        paid_amount: 50000,
        due_amount: 0,
        status: 'paid',
        invoice_date: nowStr.slice(0, 10),
        created_at: nowStr,
        items: [],
      } as any,
    ]

    const mockOrders: SalesOrderRecord[] = [
      {
        id: 'ord-1',
        company_id: 'c-1',
        order_number: 'ORD-001',
        customer_id: 'cust-1',
        customer_name: 'ABC Corp',
        customer_type: 'corporate',
        final_price: 100000,
        order_date: nowStr.slice(0, 10),
        created_at: nowStr,
        items: [
          {
            id: 'item-1',
            item_name: 'Flex Banner',
            quantity: 500,
            unit: 'sq ft',
            unit_price: 200,
            total_price: 100000,
          } as any,
        ],
      } as any,
      {
        id: 'ord-2',
        company_id: 'c-1',
        order_number: 'ORD-002',
        customer_id: 'cust-2',
        customer_name: 'XYZ Retail',
        customer_type: 'retail',
        final_price: 50000,
        order_date: nowStr.slice(0, 10),
        created_at: nowStr,
        items: [
          {
            id: 'item-2',
            item_name: 'Vinyl Sticker',
            quantity: 1000,
            unit: 'pcs',
            unit_price: 50,
            total_price: 50000,
          } as any,
        ],
      } as any,
    ]

    const mockExpenses: ExpenseRecord[] = [
      {
        id: 'exp-1',
        company_id: 'c-1',
        title: 'Electricity Bill',
        amount: 25000,
        expense_date: nowStr.slice(0, 10),
        created_at: nowStr,
      } as any,
    ]

    const mockJobs: ProductionJobRecord[] = [
      {
        id: 'job-1',
        company_id: 'c-1',
        job_number: 'JOB-001',
        status: 'completed',
        scheduled_date: nowStr.slice(0, 10),
        created_at: nowStr,
      } as any,
      {
        id: 'job-2',
        company_id: 'c-1',
        job_number: 'JOB-002',
        status: 'in_progress',
        scheduled_date: nowStr.slice(0, 10),
        created_at: nowStr,
      } as any,
    ]

    const result = ReportsService.computeBusinessReport({
      invoices: mockInvoices,
      orders: mockOrders,
      payments: [],
      expenses: mockExpenses,
      jobs: mockJobs,
      customers: [
        { id: 'cust-1', name: 'ABC Corp', customer_type: 'corporate' } as any,
        { id: 'cust-2', name: 'XYZ Retail', customer_type: 'retail' } as any,
      ],
      materials: [],
      period: 'this_month',
    })

    assert.equal(result.summary.totalSales, 150000)
    assert.equal(result.summary.invoicesCount, 2)
    assert.equal(result.summary.totalJobs, 2)
    assert.equal(result.summary.uniqueCustomersCount, 2)
    assert.equal(result.summary.totalExpenses, 25000)
    assert.equal(result.summary.expenseTransactionsCount, 1)

    // Check product ranking
    assert.equal(result.topSellingProducts.length, 2)
    assert.equal(result.topSellingProducts[0].name, 'Flex Banner')
    assert.equal(result.topSellingProducts[0].amount, 100000)

    // Check customer ranking
    assert.equal(result.topCustomers.length, 2)
    assert.equal(result.topCustomers[0].customerName, 'ABC Corp')
    assert.equal(result.topCustomers[0].amount, 100000)

    // Check status counts
    const completed = result.jobsByStatus.find((s) => s.key === 'completed')
    const inProd = result.jobsByStatus.find((s) => s.key === 'in_production')
    assert.equal(completed?.count, 1)
    assert.equal(inProd?.count, 1)

    // Check financial summary lines
    assert.equal(result.financialSummary[0].amount, 150000)
    assert.equal(result.financialSummary[3].amount, 25000)
  })
})
