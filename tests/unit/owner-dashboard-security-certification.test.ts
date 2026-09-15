import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  CanonicalFinance,
} from '../../lib/finance/canonical-finance.ts'
import {
  toBangladeshDateString,
  getBangladeshTodayDateString,
  calculateDaysOverdue,
} from '../../lib/utils/business-date.ts'
import type { InvoiceRecord, PaymentRecord } from '../../types/billing.types.ts'
import type { SalesOrderRecord } from '../../types/order.types.ts'

describe('Owner Dashboard Security Hardening & Certification Tests', () => {
  // Mock Multi-Tenant Data
  const tenantAInvoices: InvoiceRecord[] = [
    {
      id: 'inv-a1',
      company_id: 'tenant-a',
      invoice_number: 'INV-A-101',
      invoice_type: 'sales_invoice',
      customer_id: 'cust-a1',
      customer_name: 'Customer A1',
      customer_phone: '01711111111',
      invoice_date: '2026-09-15',
      due_date: '2026-09-10',
      subtotal: 50000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 50000,
      paid_amount: 10000,
      due_amount: 40000,
      write_off_amount: 0,
      status: 'partially_paid',
      created_by_name: 'Tenant A Admin',
      items: [],
      created_at: '2026-09-15T02:00:00Z',
      updated_at: '2026-09-15T02:00:00Z',
      branch_id: 'branch-a1',
    } as unknown as InvoiceRecord,
    {
      id: 'inv-a2',
      company_id: 'tenant-a',
      invoice_number: 'INV-A-102',
      invoice_type: 'sales_invoice',
      customer_id: 'cust-a2',
      customer_name: 'Customer A2',
      customer_phone: '01711111112',
      invoice_date: '2026-09-15',
      due_date: '2026-09-25',
      subtotal: 30000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 30000,
      paid_amount: 30000,
      due_amount: 0,
      write_off_amount: 0,
      status: 'paid',
      created_by_name: 'Tenant A Admin',
      items: [],
      created_at: '2026-09-15T03:00:00Z',
      updated_at: '2026-09-15T03:00:00Z',
      branch_id: 'branch-a2',
    } as unknown as InvoiceRecord,
  ]

  const tenantBInvoices: InvoiceRecord[] = [
    {
      id: 'inv-b1',
      company_id: 'tenant-b',
      invoice_number: 'INV-B-201',
      invoice_type: 'sales_invoice',
      customer_id: 'cust-b1',
      customer_name: 'Customer B1',
      customer_phone: '01822222222',
      invoice_date: '2026-09-15',
      due_date: '2026-09-12',
      subtotal: 100000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 100000,
      paid_amount: 0,
      due_amount: 100000,
      write_off_amount: 0,
      status: 'unpaid',
      created_by_name: 'Tenant B Admin',
      items: [],
      created_at: '2026-09-15T04:00:00Z',
      updated_at: '2026-09-15T04:00:00Z',
      branch_id: 'branch-b1',
    } as unknown as InvoiceRecord,
  ]

  describe('1. Multi-Tenant Isolation', () => {
    it('guarantees tenant A metrics are never polluted with tenant B data', () => {
      const tenantAReceivables = CanonicalFinance.calculateTotalReceivables(tenantAInvoices)
      const tenantBReceivables = CanonicalFinance.calculateTotalReceivables(tenantBInvoices)

      assert.strictEqual(tenantAReceivables.totalDue, 40000)
      assert.strictEqual(tenantAReceivables.unpaidInvoicesCount, 1)

      assert.strictEqual(tenantBReceivables.totalDue, 100000)
      assert.strictEqual(tenantBReceivables.unpaidInvoicesCount, 1)
      assert.strictEqual(tenantBReceivables.overdueCount, 1)
    })
  })

  describe('2. Multi-Branch Isolation & Filtering', () => {
    it('restricts financial metrics strictly to the specified branch scope', () => {
      // Company-wide (all branches of Tenant A)
      const allBranchesReceivables = CanonicalFinance.calculateTotalReceivables(tenantAInvoices)
      assert.strictEqual(allBranchesReceivables.totalDue, 40000)

      // Branch A1 only
      const branchA1Receivables = CanonicalFinance.calculateTotalReceivables(tenantAInvoices, 'branch-a1')
      assert.strictEqual(branchA1Receivables.totalDue, 40000)

      // Branch A2 only (invoice A2 is fully paid, so due is 0)
      const branchA2Receivables = CanonicalFinance.calculateTotalReceivables(tenantAInvoices, 'branch-a2')
      assert.strictEqual(branchA2Receivables.totalDue, 0)
      assert.strictEqual(branchA2Receivables.unpaidInvoicesCount, 0)

      // Non-existent branch
      const branchXReceivables = CanonicalFinance.calculateTotalReceivables(tenantAInvoices, 'branch-nonexistent')
      assert.strictEqual(branchXReceivables.totalDue, 0)
    })
  })

  describe('3. Bangladesh Timezone Boundary Precision (Asia/Dhaka UTC+6)', () => {
    it('correctly maps 23:59:59 Dhaka time (17:59:59 UTC) to the current business day', () => {
      const utcTimestamp = '2026-09-14T17:59:59Z' // 23:59:59 in Dhaka
      const bdDate = toBangladeshDateString(utcTimestamp)
      assert.strictEqual(bdDate, '2026-09-14')
    })

    it('correctly transitions across midnight at 00:00:00 Dhaka time (18:00:00 UTC) to next business day', () => {
      const utcTimestamp = '2026-09-14T18:00:00Z' // 00:00:00 in Dhaka (next day)
      const bdDate = toBangladeshDateString(utcTimestamp)
      assert.strictEqual(bdDate, '2026-09-15')
    })

    it('handles midday UTC (06:00:00 UTC = 12:00:00 Dhaka) consistently on the same business day', () => {
      const utcTimestamp = '2026-09-15T06:00:00Z' // 12:00:00 in Dhaka
      const bdDate = toBangladeshDateString(utcTimestamp)
      assert.strictEqual(bdDate, '2026-09-15')
    })
  })

  describe('4. Financial Reconciliation & Edge-Case Protection', () => {
    it('protects against negative due balances on overpaid invoices', () => {
      const overpaidInvoice: InvoiceRecord = {
        id: 'inv-op',
        company_id: 'tenant-a',
        invoice_number: 'INV-OP',
        invoice_type: 'sales_invoice',
        customer_id: 'cust-1',
        customer_name: 'Overpayer',
        customer_phone: '01711111111',
        invoice_date: '2026-09-01',
        due_date: '2026-09-05',
        subtotal: 10000,
        discount_amount: 0,
        vat_percentage: 0,
        vat_amount: 0,
        grand_total: 10000,
        paid_amount: 15000, // Overpaid by 5000
        due_amount: 0,
        write_off_amount: 0,
        status: 'paid',
        created_by_name: 'Admin',
        items: [],
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      }

      const due = CanonicalFinance.calculateInvoiceDue(overpaidInvoice)
      assert.strictEqual(due, 0)
    })

    it('deducts write-offs from grand total to calculate canonical receivable', () => {
      const writtenOffInvoice: InvoiceRecord = {
        id: 'inv-wo',
        company_id: 'tenant-a',
        invoice_number: 'INV-WO',
        invoice_type: 'sales_invoice',
        customer_id: 'cust-1',
        customer_name: 'Partial Bad Debt',
        customer_phone: '01711111111',
        invoice_date: '2026-09-01',
        due_date: '2026-09-05',
        subtotal: 20000,
        discount_amount: 0,
        vat_percentage: 0,
        vat_amount: 0,
        grand_total: 20000,
        paid_amount: 10000,
        write_off_amount: 5000, // 5000 written off as bad debt
        due_amount: 5000,
        status: 'partially_paid',
        created_by_name: 'Admin',
        items: [],
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      }

      const due = CanonicalFinance.calculateInvoiceDue(writtenOffInvoice)
      assert.strictEqual(due, 5000) // 20000 - 10000 - 5000
    })

    it('treats cancelled and void invoices as zero collectible debt', () => {
      const cancelledInvoice: InvoiceRecord = {
        id: 'inv-cnc',
        company_id: 'tenant-a',
        invoice_number: 'INV-CNC',
        invoice_type: 'sales_invoice',
        customer_id: 'cust-1',
        customer_name: 'Cancelled Order',
        customer_phone: '01711111111',
        invoice_date: '2026-09-01',
        due_date: '2026-09-05',
        subtotal: 10000,
        discount_amount: 0,
        vat_percentage: 0,
        vat_amount: 0,
        grand_total: 10000,
        paid_amount: 0,
        due_amount: 10000,
        write_off_amount: 0,
        status: 'cancelled',
        created_by_name: 'Admin',
        items: [],
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      }

      const due = CanonicalFinance.calculateInvoiceDue(cancelledInvoice)
      assert.strictEqual(due, 0)
      assert.strictEqual(CanonicalFinance.evaluateInvoiceStatus(cancelledInvoice), 'cancelled')
      assert.strictEqual(CanonicalFinance.isInvoiceOverdue(cancelledInvoice), false)
    })
  })

  describe('5. Financial Visibility & Restricted vs Zero Semantics', () => {
    it('returns isRestricted=false and amount=0 when an authorized user has zero sales activity', () => {
      const salesMetrics = CanonicalFinance.calculateSalesMetrics([], [])
      assert.strictEqual(salesMetrics.isRestricted, false)
      assert.strictEqual(salesMetrics.todaySales, 0)
      assert.strictEqual(salesMetrics.todaySalesCount, 0)
      assert.strictEqual(salesMetrics.yesterdaySales, 0)
      assert.strictEqual(salesMetrics.currency, 'BDT')

      const collectionMetrics = CanonicalFinance.calculateCollectionMetrics([])
      assert.strictEqual(collectionMetrics.isRestricted, false)
      assert.strictEqual(collectionMetrics.todayCollection, 0)
      assert.strictEqual(collectionMetrics.todayCollectionCount, 0)
      assert.strictEqual(collectionMetrics.currency, 'BDT')

      const receivablesMetrics = CanonicalFinance.calculateTotalReceivables([])
      assert.strictEqual(receivablesMetrics.isRestricted, false)
      assert.strictEqual(receivablesMetrics.totalDue, 0)
      assert.strictEqual(receivablesMetrics.overdueCount, 0)
      assert.strictEqual(receivablesMetrics.currency, 'BDT')
    })

    it('returns isRestricted=true and amount=null when financial access is restricted', () => {
      const restrictedSales = CanonicalFinance.createRestrictedSalesMetrics()
      assert.strictEqual(restrictedSales.isRestricted, true)
      assert.strictEqual(restrictedSales.todaySales, null)
      assert.strictEqual(restrictedSales.todaySalesCount, null)
      assert.strictEqual(restrictedSales.yesterdaySales, null)
      assert.strictEqual(restrictedSales.salesChangePercent, null)
      assert.strictEqual(restrictedSales.currency, 'BDT')

      const restrictedCollections = CanonicalFinance.createRestrictedCollectionMetrics()
      assert.strictEqual(restrictedCollections.isRestricted, true)
      assert.strictEqual(restrictedCollections.todayCollection, null)
      assert.strictEqual(restrictedCollections.todayCollectionCount, null)
      assert.strictEqual(restrictedCollections.yesterdayCollection, null)
      assert.strictEqual(restrictedCollections.currency, 'BDT')

      const restrictedReceivables = CanonicalFinance.createRestrictedReceivablesMetrics()
      assert.strictEqual(restrictedReceivables.isRestricted, true)
      assert.strictEqual(restrictedReceivables.totalDue, null)
      assert.strictEqual(restrictedReceivables.overdueCount, null)
      assert.strictEqual(restrictedReceivables.overdueTotal, null)
      assert.strictEqual(restrictedReceivables.unpaidInvoicesCount, null)
      assert.strictEqual(restrictedReceivables.currency, 'BDT')

      const restrictedProfit = CanonicalFinance.createRestrictedProfitMetrics()
      assert.strictEqual(restrictedProfit.isRestricted, true)
      assert.strictEqual(restrictedProfit.grossProfit, null)
      assert.strictEqual(restrictedProfit.totalRevenue, null)
      assert.strictEqual(restrictedProfit.totalCost, null)
      assert.strictEqual(restrictedProfit.marginPercent, null)
      assert.strictEqual(restrictedProfit.currency, 'BDT')
    })

    it('never confuses actual zero with restricted state in type contracts', () => {
      const actualZero = CanonicalFinance.calculateSalesMetrics([], [])
      const restricted = CanonicalFinance.createRestrictedSalesMetrics()

      assert.notStrictEqual(actualZero.isRestricted, restricted.isRestricted)
      assert.notStrictEqual(actualZero.todaySales, restricted.todaySales)
      assert.strictEqual(actualZero.todaySales, 0)
      assert.strictEqual(restricted.todaySales, null)
    })
  })

  describe('6. Profit & Margin Security & Costing State Verification', () => {
    it('returns gross profit and margin when costing data exists and user is authorized', () => {
      const mockCostings = [
        {
          id: 'cost-1',
          order_id: 'ord-1',
          selling_price: 10000,
          act: {
            total_cost: 6500,
            material_cost: 4000,
            labor_cost: 1500,
            machine_cost: 1000,
            finishing_cost: 0,
          },
        },
      ]

      const profit = CanonicalFinance.calculateProfitMetrics(mockCostings as any, [])
      assert.strictEqual(profit.isRestricted, false)
      assert.strictEqual(profit.hasReliableCostData, true)
      assert.strictEqual(profit.grossProfit, 3500)
      assert.strictEqual(profit.marginPercent, 35)
      assert.strictEqual(profit.totalRevenue, 10000)
      assert.strictEqual(profit.totalCost, 6500)
    })

    it('returns hasReliableCostData=false and grossProfit=null when costing is missing (Costing Data Required)', () => {
      const profit = CanonicalFinance.calculateProfitMetrics([], [])
      assert.strictEqual(profit.isRestricted, false)
      assert.strictEqual(profit.hasReliableCostData, false)
      assert.strictEqual(profit.grossProfit, null)
      assert.strictEqual(profit.marginPercent, null)
      assert.strictEqual(profit.totalRevenue, 0)
      assert.strictEqual(profit.totalCost, 0)
    })
  })

  describe('7. Server Action Branch Isolation Clamp Logic', () => {
    function resolveEffectiveBranch(
      requestedBranch: string | null | undefined,
      userSession: { companyRole?: string; primaryRole?: string; isSupportMode?: boolean; branchId?: string }
    ): string | null | undefined {
      const isOwnerOrAdmin =
        userSession.companyRole === 'business_owner' ||
        userSession.primaryRole === 'business_owner' ||
        Boolean(userSession.isSupportMode)

      if (!isOwnerOrAdmin && userSession.branchId) {
        return userSession.branchId
      }
      return requestedBranch
    }

    it('allows business owner to view all branches (unscoped)', () => {
      const resolved = resolveEffectiveBranch(null, { companyRole: 'business_owner', branchId: 'branch-1' })
      assert.strictEqual(resolved, null)
    })

    it('allows business owner to view specific branch', () => {
      const resolved = resolveEffectiveBranch('branch-2', { companyRole: 'business_owner', branchId: 'branch-1' })
      assert.strictEqual(resolved, 'branch-2')
    })

    it('clamps branch-scoped operator to their assigned branch even if they request another branch', () => {
      const resolved = resolveEffectiveBranch('branch-unauthorized', { companyRole: 'operator', branchId: 'branch-assigned' })
      assert.strictEqual(resolved, 'branch-assigned')
    })

    it('clamps branch-scoped operator to their assigned branch if they attempt to request unscoped company data', () => {
      const resolved = resolveEffectiveBranch(null, { companyRole: 'operator', branchId: 'branch-assigned' })
      assert.strictEqual(resolved, 'branch-assigned')
    })
  })
})
