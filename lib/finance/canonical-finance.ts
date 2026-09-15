// ==============================================================================
// InkFlow ERP - Authoritative Canonical Finance Calculation Engine (V9.1)
// Standardizes definitions for Sales, Collections, Customer Receivables, Dues,
// Write-Offs, and Gross Profit/Margins across the entire application.
// ==============================================================================

import type { InvoiceRecord, PaymentRecord, FinancialWriteOffRecord } from '@/types/billing.types'
import type { SalesOrderRecord } from '@/types/order.types'
import type { JobCostingRecord } from '@/types/costing.types'
import {
  getBangladeshTodayDateString,
  getBangladeshYesterdayDateString,
  toBangladeshDateString,
  calculateDaysOverdue,
} from '../utils/business-date.ts'

export interface CanonicalInvoiceReceivable {
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  customerPhone?: string | null
  invoiceDate: string
  dueDate: string
  grandTotal: number
  paidAmount: number
  writeOffAmount: number
  dueAmount: number
  daysOverdue: number
  status: 'paid' | 'partially_paid' | 'unpaid' | 'overdue' | 'cancelled' | 'written_off'
  branchId?: string | null
}

export interface CanonicalSalesMetrics {
  isRestricted: boolean
  todaySales: number | null
  todaySalesCount: number | null
  yesterdaySales: number | null
  yesterdaySalesCount: number | null
  salesChangePercent: number | null
  currency: 'BDT'
}

export interface CanonicalCollectionMetrics {
  isRestricted: boolean
  todayCollection: number | null
  todayCollectionCount: number | null
  yesterdayCollection: number | null
  yesterdayCollectionCount: number | null
  collectionChangePercent: number | null
  currency: 'BDT'
}

export interface CanonicalReceivablesMetrics {
  isRestricted: boolean
  totalDue: number | null
  overdueCount: number | null
  overdueTotal: number | null
  unpaidInvoicesCount: number | null
  currency: 'BDT'
}

export interface CanonicalProfitMetrics {
  isRestricted: boolean
  hasReliableCostData: boolean
  totalRevenue: number | null
  totalCost: number | null
  grossProfit: number | null
  marginPercent: number | null
  currency: 'BDT'
  costBreakdown?: {
    materialCost: number
    laborCost: number
    machineCost: number
    otherCost: number
  }
}

export interface OverdueReceivableSummary {
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  customerPhone?: string | null
  dueAmount: number
  totalAmount: number
  daysOverdue: number
  dueDate: string
  status: string
}

export class CanonicalFinance {
  /**
   * Calculates canonical due amount for a single invoice.
   * Cancelled/voided invoices have 0 due.
   * Formula: max(0, grand_total - paid_amount - write_off_amount)
   */
  static calculateInvoiceDue(invoice: InvoiceRecord): number {
    if (!invoice) return 0
    const status = String(invoice.status || '').toLowerCase()
    if (status === 'cancelled' || status === 'void' || status === 'written_off') {
      return 0
    }

    const grandTotal = Number(invoice.grand_total) || Number((invoice as any).total_amount) || Number(invoice.subtotal) || 0
    const paidAmount = Number(invoice.paid_amount) || 0
    const writeOff = Number(invoice.write_off_amount) || 0

    return Math.max(0, Number((grandTotal - paidAmount - writeOff).toFixed(2)))
  }

  /**
   * Evaluates invoice status based on payment state and due date
   */
  static evaluateInvoiceStatus(invoice: InvoiceRecord, asOfDateStr?: string): 'paid' | 'partially_paid' | 'unpaid' | 'overdue' | 'cancelled' | 'written_off' {
    const rawStatus = String(invoice.status || '').toLowerCase()
    if (rawStatus === 'cancelled' || rawStatus === 'void') return 'cancelled'
    if (rawStatus === 'written_off') return 'written_off'

    const dueAmount = this.calculateInvoiceDue(invoice)
    const paidAmount = Number(invoice.paid_amount) || 0

    if (dueAmount <= 0) {
      return 'paid'
    }

    const todayStr = asOfDateStr || getBangladeshTodayDateString()
    const isOverdue = Boolean(invoice.due_date && invoice.due_date < todayStr)

    if (isOverdue) {
      return 'overdue'
    }

    if (paidAmount > 0) {
      return 'partially_paid'
    }

    return 'unpaid'
  }

  /**
   * Evaluates if invoice is overdue as of given date
   */
  static isInvoiceOverdue(invoice: InvoiceRecord, asOfDateStr?: string): boolean {
    return this.evaluateInvoiceStatus(invoice, asOfDateStr) === 'overdue'
  }

  /**
   * Computes total customer receivables (Customer Due) across all valid invoices
   */
  static calculateTotalReceivables(
    invoices: InvoiceRecord[],
    branchId?: string | null
  ): CanonicalReceivablesMetrics {
    let totalDue = 0
    let overdueCount = 0
    let overdueTotal = 0
    let unpaidInvoicesCount = 0

    const todayStr = getBangladeshTodayDateString()

    for (const inv of invoices || []) {
      if (branchId && (inv as any).branch_id && (inv as any).branch_id !== branchId) {
        continue
      }

      const due = this.calculateInvoiceDue(inv)
      if (due > 0) {
        totalDue += due
        unpaidInvoicesCount++

        const daysOverdue = calculateDaysOverdue(inv.due_date, todayStr)
        if (daysOverdue > 0) {
          overdueCount++
          overdueTotal += due
        }
      }
    }

    return {
      isRestricted: false,
      totalDue: Number(totalDue.toFixed(2)),
      overdueCount,
      overdueTotal: Number(overdueTotal.toFixed(2)),
      unpaidInvoicesCount,
      currency: 'BDT',
    }
  }

  /**
   * Computes today's and yesterday's Sales based on authoritative invoice / order records
   */
  static calculateSalesMetrics(
    invoices: InvoiceRecord[],
    orders?: SalesOrderRecord[],
    branchId?: string | null
  ): CanonicalSalesMetrics {
    const todayStr = getBangladeshTodayDateString()
    const yesterdayStr = getBangladeshYesterdayDateString()

    let todaySales = 0
    let todaySalesCount = 0
    let yesterdaySales = 0
    let yesterdaySalesCount = 0

    // Prefer invoices if available, fallback to orders if invoices are not yet created
    if (Array.isArray(invoices) && invoices.length > 0) {
      for (const inv of invoices) {
        if (branchId && (inv as any).branch_id && (inv as any).branch_id !== branchId) {
          continue
        }

        const rawStatus = String(inv.status || '').toLowerCase()
        if (rawStatus === 'cancelled' || rawStatus === 'void') continue

        const invDate = toBangladeshDateString(inv.invoice_date || inv.created_at)
        const amount = Number(inv.grand_total) || Number((inv as any).total_amount) || Number(inv.subtotal) || 0

        if (invDate === todayStr) {
          todaySales += amount
          todaySalesCount++
        } else if (invDate === yesterdayStr) {
          yesterdaySales += amount
          yesterdaySalesCount++
        }
      }
    } else if (Array.isArray(orders) && orders.length > 0) {
      for (const ord of orders) {
        if (branchId && (ord as any).branch_id && (ord as any).branch_id !== branchId) {
          continue
        }

        const rawStatus = String(ord.status || '').toLowerCase()
        if (rawStatus === 'cancelled' || rawStatus === 'draft') continue

        const ordDate = toBangladeshDateString(ord.order_date || ord.created_at)
        const amount = Number(ord.final_price) || Number(ord.subtotal) || 0

        if (ordDate === todayStr) {
          todaySales += amount
          todaySalesCount++
        } else if (ordDate === yesterdayStr) {
          yesterdaySales += amount
          yesterdaySalesCount++
        }
      }
    }

    let salesChangePercent: number | null = null
    if (yesterdaySales > 0) {
      salesChangePercent = Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100)
    }

    return {
      isRestricted: false,
      todaySales: Number(todaySales.toFixed(2)),
      todaySalesCount,
      yesterdaySales: Number(yesterdaySales.toFixed(2)),
      yesterdaySalesCount,
      salesChangePercent,
      currency: 'BDT',
    }
  }

  /**
   * Computes today's and yesterday's Collections based on actual payment records
   */
  static calculateCollectionMetrics(
    payments: PaymentRecord[],
    branchId?: string | null
  ): CanonicalCollectionMetrics {
    const todayStr = getBangladeshTodayDateString()
    const yesterdayStr = getBangladeshYesterdayDateString()

    let todayCollection = 0
    let todayCollectionCount = 0
    let yesterdayCollection = 0
    let yesterdayCollectionCount = 0

    for (const p of payments || []) {
      if (branchId && (p as any).branch_id && (p as any).branch_id !== branchId) {
        continue
      }

      const pDate = toBangladeshDateString(p.payment_date || p.created_at)
      const amount = Number(p.amount) || 0

      if (pDate === todayStr) {
        todayCollection += amount
        todayCollectionCount++
      } else if (pDate === yesterdayStr) {
        yesterdayCollection += amount
        yesterdayCollectionCount++
      }
    }

    let collectionChangePercent: number | null = null
    if (yesterdayCollection > 0) {
      collectionChangePercent = Math.round(((todayCollection - yesterdayCollection) / yesterdayCollection) * 100)
    }

    return {
      isRestricted: false,
      todayCollection: Number(todayCollection.toFixed(2)),
      todayCollectionCount,
      yesterdayCollection: Number(yesterdayCollection.toFixed(2)),
      yesterdayCollectionCount,
      collectionChangePercent,
      currency: 'BDT',
    }
  }

  /**
   * Computes authoritative Profit & Margin only when actual job costing / COGS exists.
   * Returns hasReliableCostData = false if no cost records exist, never fabricating numbers.
   */
  static calculateProfitMetrics(
    costings: JobCostingRecord[] | undefined,
    invoices: InvoiceRecord[],
    branchId?: string | null
  ): CanonicalProfitMetrics {
    const validCostings = (costings || []).filter((c) => {
      if (branchId && (c as any).branch_id && (c as any).branch_id !== branchId) return false
      const cost = c.act?.total_cost || c.est?.total_cost || (c as any).total_cost || 0
      return Number(cost) > 0
    })

    if (validCostings.length === 0) {
      // No reliable costing records exist
      const totalRevenue = (invoices || []).reduce((sum, inv) => {
        if (branchId && (inv as any).branch_id && (inv as any).branch_id !== branchId) return sum
        return sum + (Number(inv.grand_total) || 0)
      }, 0)

      return {
        isRestricted: false,
        hasReliableCostData: false,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalCost: 0,
        grossProfit: null,
        marginPercent: null,
        currency: 'BDT',
      }
    }

    let totalRevenue = 0
    let totalMaterialCost = 0
    let totalLaborCost = 0
    let totalMachineCost = 0
    let totalOtherCost = 0

    for (const c of validCostings) {
      totalRevenue += Number(c.selling_price) || 0
      totalMaterialCost += Number(c.act?.material_cost ?? c.est?.material_cost ?? (c as any).material_cost ?? 0)
      totalLaborCost += Number(c.act?.labor_cost ?? c.est?.labor_cost ?? (c as any).labor_cost ?? 0)
      totalMachineCost += Number(c.act?.machine_cost ?? c.est?.machine_cost ?? (c as any).machine_cost ?? 0)
      totalOtherCost += Number(c.act?.finishing_cost ?? c.est?.finishing_cost ?? (c as any).finishing_cost ?? 0)
    }

    const totalCost = totalMaterialCost + totalLaborCost + totalMachineCost + totalOtherCost
    const grossProfit = totalRevenue - totalCost
    const marginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0

    return {
      isRestricted: false,
      hasReliableCostData: true,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      marginPercent,
      currency: 'BDT',
      costBreakdown: {
        materialCost: Number(totalMaterialCost.toFixed(2)),
        laborCost: Number(totalLaborCost.toFixed(2)),
        machineCost: Number(totalMachineCost.toFixed(2)),
        otherCost: Number(totalOtherCost.toFixed(2)),
      },
    }
  }

  /**
   * Factory methods for explicit unauthorized/restricted financial values (amounts are null, NEVER 0)
   */
  static createRestrictedSalesMetrics(): CanonicalSalesMetrics {
    return {
      isRestricted: true,
      todaySales: null,
      todaySalesCount: null,
      yesterdaySales: null,
      yesterdaySalesCount: null,
      salesChangePercent: null,
      currency: 'BDT',
    }
  }

  static createRestrictedCollectionMetrics(): CanonicalCollectionMetrics {
    return {
      isRestricted: true,
      todayCollection: null,
      todayCollectionCount: null,
      yesterdayCollection: null,
      yesterdayCollectionCount: null,
      collectionChangePercent: null,
      currency: 'BDT',
    }
  }

  static createRestrictedReceivablesMetrics(): CanonicalReceivablesMetrics {
    return {
      isRestricted: true,
      totalDue: null,
      overdueCount: null,
      overdueTotal: null,
      unpaidInvoicesCount: null,
      currency: 'BDT',
    }
  }

  static createRestrictedProfitMetrics(): CanonicalProfitMetrics {
    return {
      isRestricted: true,
      hasReliableCostData: false,
      totalRevenue: null,
      totalCost: null,
      grossProfit: null,
      marginPercent: null,
      currency: 'BDT',
    }
  }

  /**
   * Retrieves top overdue customer invoices ranked by days overdue and amount
   */
  static getTopOverdueReceivables(
    invoices: InvoiceRecord[],
    limit: number = 5,
    branchId?: string | null
  ): OverdueReceivableSummary[] {
    const todayStr = getBangladeshTodayDateString()
    const overdueList: OverdueReceivableSummary[] = []

    for (const inv of invoices || []) {
      if (branchId && (inv as any).branch_id && (inv as any).branch_id !== branchId) {
        continue
      }

      const due = this.calculateInvoiceDue(inv)
      if (due <= 0) continue

      const daysOverdue = calculateDaysOverdue(inv.due_date, todayStr)
      const grandTotal = Number(inv.grand_total) || Number((inv as any).total_amount) || due

      overdueList.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number || inv.id.slice(0, 8).toUpperCase(),
        customerId: inv.customer_id,
        customerName: inv.customer_name || 'Customer',
        customerPhone: inv.customer_phone,
        dueAmount: due,
        totalAmount: grandTotal,
        daysOverdue,
        dueDate: inv.due_date || 'N/A',
        status: this.evaluateInvoiceStatus(inv, todayStr),
      })
    }

    // Sort by days overdue descending, then dueAmount descending
    return overdueList
      .sort((a, b) => {
        if (b.daysOverdue !== a.daysOverdue) {
          return b.daysOverdue - a.daysOverdue
        }
        return b.dueAmount - a.dueAmount
      })
      .slice(0, limit)
  }
}
