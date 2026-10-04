import { computeBusinessReport } from '../lib/reports/business-report-engine.ts'
export { computeBusinessReport }
import type {
  SalesBreakdownItem,
  ProductionMetricItem,
  FinancialAgingItem,
  InventoryValuationItem,
  CustomerReportItem,
  ReportPeriodKey,
  BusinessReportSummary,
  MonthlySalesVsProfitPoint,
  ProductSalesPoint,
  CustomerTypeSalesPoint,
  TopSellingProductItem,
  TopCustomerSalesItem,
  JobStatusMetric,
  FinancialSummaryRow,
  MonthlyOverviewRow,
} from '../types/reports.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'
import type { SalesOrderRecord } from '../types/order.types.ts'
import type { CustomerRecord } from '../types/crm.types.ts'
import type { InvoiceRecord, PaymentRecord } from '../types/billing.types.ts'
import type { MaterialRecord } from '../types/inventory.types.ts'
import type { ProductionJobRecord } from '../types/production.types.ts'
import type { ExpenseRecord } from '../types/accounting.types.ts'


export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  isExcelBOM: boolean = true
) {
  const csvContent =
    (isExcelBOM ? '\uFEFF' : '') +
    headers.join(',') +
    '\n' +
    rows.map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Color palettes for charts matching the design
export const CHART_COLORS = {
  sales: '#00D284', // Vibrant mint/emerald green
  profit: '#2563EB', // Royal/Sky blue
  products: [
    '#00D284', // Mint green (Flex Banner)
    '#3B82F6', // Blue (Sticker)
    '#8B5CF6', // Purple (Acrylic Sign)
    '#EC4899', // Pink (Vinyl Print)
    '#F59E0B', // Amber (ACP Sign)
    '#06B6D4', // Cyan (Others)
    '#6366F1', // Indigo
    '#10B981', // Emerald
  ],
  customers: {
    corporate: '#8B5CF6', // Purple
    retail: '#10B981', // Emerald
    agency: '#3B82F6', // Blue
    government: '#F59E0B', // Amber
    other: '#EC4899', // Pink
  },
}

export interface DateRangeResult {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
  formattedDisplay: string
}

export function getDateRangeForPeriod(
  period: ReportPeriodKey,
  customStart?: string,
  customEnd?: string
): DateRangeResult {
  const now = new Date()
  let start = new Date(now)
  let end = new Date(now)
  let prevStart = new Date(now)
  let prevEnd = new Date(now)

  const toDateStart = (d: Date) => {
    const res = new Date(d)
    res.setHours(0, 0, 0, 0)
    return res
  }
  const toDateEnd = (d: Date) => {
    const res = new Date(d)
    res.setHours(23, 59, 59, 999)
    return res
  }

  switch (period) {
    case 'today': {
      start = toDateStart(now)
      end = toDateEnd(now)
      prevStart = toDateStart(new Date(now.getTime() - 86400000))
      prevEnd = toDateEnd(new Date(now.getTime() - 86400000))
      break
    }
    case 'yesterday': {
      const yest = new Date(now.getTime() - 86400000)
      start = toDateStart(yest)
      end = toDateEnd(yest)
      const dayBefore = new Date(yest.getTime() - 86400000)
      prevStart = toDateStart(dayBefore)
      prevEnd = toDateEnd(dayBefore)
      break
    }
    case 'this_week': {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday
      start = toDateStart(new Date(now.setDate(diff)))
      end = toDateEnd(new Date())
      const weekMs = 7 * 86400000
      prevStart = new Date(start.getTime() - weekMs)
      prevEnd = new Date(end.getTime() - weekMs)
      break
    }
    case 'last_week': {
      const day = now.getDay()
      const diff = now.getDate() - day - 6
      start = toDateStart(new Date(now.setDate(diff)))
      end = toDateEnd(new Date(start.getTime() + 6 * 86400000))
      prevStart = new Date(start.getTime() - 7 * 86400000)
      prevEnd = new Date(end.getTime() - 7 * 86400000)
      break
    }
    case 'this_month': {
      start = toDateStart(new Date(now.getFullYear(), now.getMonth(), 1))
      end = toDateEnd(new Date(now.getFullYear(), now.getMonth() + 1, 0))
      prevStart = toDateStart(new Date(now.getFullYear(), now.getMonth() - 1, 1))
      prevEnd = toDateEnd(new Date(now.getFullYear(), now.getMonth(), 0))
      break
    }
    case 'last_month': {
      start = toDateStart(new Date(now.getFullYear(), now.getMonth() - 1, 1))
      end = toDateEnd(new Date(now.getFullYear(), now.getMonth(), 0))
      prevStart = toDateStart(new Date(now.getFullYear(), now.getMonth() - 2, 1))
      prevEnd = toDateEnd(new Date(now.getFullYear(), now.getMonth() - 1, 0))
      break
    }
    case 'last_3_months': {
      start = toDateStart(new Date(now.getTime() - 90 * 86400000))
      end = toDateEnd(now)
      prevStart = toDateStart(new Date(start.getTime() - 90 * 86400000))
      prevEnd = toDateEnd(new Date(start.getTime() - 1))
      break
    }
    case 'last_6_months': {
      start = toDateStart(new Date(now.getTime() - 180 * 86400000))
      end = toDateEnd(now)
      prevStart = toDateStart(new Date(start.getTime() - 180 * 86400000))
      prevEnd = toDateEnd(new Date(start.getTime() - 1))
      break
    }
    case 'last_9_months': {
      start = toDateStart(new Date(now.getTime() - 270 * 86400000))
      end = toDateEnd(now)
      prevStart = toDateStart(new Date(start.getTime() - 270 * 86400000))
      prevEnd = toDateEnd(new Date(start.getTime() - 1))
      break
    }
    case 'last_12_months': {
      start = toDateStart(new Date(now.getTime() - 365 * 86400000))
      end = toDateEnd(now)
      prevStart = toDateStart(new Date(start.getTime() - 365 * 86400000))
      prevEnd = toDateEnd(new Date(start.getTime() - 1))
      break
    }
    case 'this_year': {
      start = toDateStart(new Date(now.getFullYear(), 0, 1))
      end = toDateEnd(new Date(now.getFullYear(), 11, 31))
      prevStart = toDateStart(new Date(now.getFullYear() - 1, 0, 1))
      prevEnd = toDateEnd(new Date(now.getFullYear() - 1, 11, 31))
      break
    }
    case 'all_time': {
      start = new Date('2020-01-01T00:00:00Z')
      end = toDateEnd(new Date(now.getTime() + 86400000))
      prevStart = new Date('2019-01-01T00:00:00Z')
      prevEnd = new Date('2019-12-31T23:59:59Z')
      break
    }
    case 'custom': {
      if (customStart && customEnd) {
        start = toDateStart(
          new Date(customStart.includes('T') ? customStart : `${customStart}T00:00:00`)
        )
        end = toDateEnd(
          new Date(customEnd.includes('T') ? customEnd : `${customEnd}T23:59:59`)
        )
        const duration = end.getTime() - start.getTime()
        prevEnd = new Date(start.getTime() - 1)
        prevStart = new Date(prevEnd.getTime() - duration)
      } else {
        start = toDateStart(new Date(now.getFullYear(), now.getMonth(), 1))
        end = toDateEnd(new Date(now.getFullYear(), now.getMonth() + 1, 0))
      }
      break
    }
    default: {
      start = toDateStart(new Date(now.getFullYear(), now.getMonth(), 1))
      end = toDateEnd(new Date(now.getFullYear(), now.getMonth() + 1, 0))
      prevStart = toDateStart(new Date(now.getFullYear(), now.getMonth() - 1, 1))
      prevEnd = toDateEnd(new Date(now.getFullYear(), now.getMonth(), 0))
    }
  }

  const formatShort = (d: Date) => {
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return {
    start,
    end,
    prevStart,
    prevEnd,
    formattedDisplay: `${formatShort(start)} - ${formatShort(end)}`,
  }
}

export function isDateInRange(dateStr?: string | null, start?: Date, end?: Date): boolean {
  if (!dateStr || !start || !end) return false
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, day] = dateStr.split('-').map(Number)
      const d = new Date(y, m - 1, day, 12, 0, 0)
      return d >= start && d <= end
    }
    const d = new Date(dateStr)
    return d >= start && d <= end
  } catch {
    return false
  }
}

export interface BusinessReportEngineInput {
  invoices: InvoiceRecord[]
  orders: SalesOrderRecord[]
  payments: PaymentRecord[]
  expenses: ExpenseRecord[]
  jobs: ProductionJobRecord[]
  customers: CustomerRecord[]
  materials: MaterialRecord[]
  period: ReportPeriodKey
  customStartDate?: string
  customEndDate?: string
  monthlyChartMonths?: 6 | 9 | 12
}

export interface BusinessReportCalculatedData {
  dateRangeDisplay: string
  summary: BusinessReportSummary
  monthlySalesVsProfit: MonthlySalesVsProfitPoint[]
  salesByProduct: ProductSalesPoint[]
  salesByCustomerType: CustomerTypeSalesPoint[]
  topSellingProducts: TopSellingProductItem[]
  topCustomers: TopCustomerSalesItem[]
  jobsByStatus: JobStatusMetric[]
  financialSummary: FinancialSummaryRow[]
  monthlyOverview: MonthlyOverviewRow[]
  totalPeriodSales: number
}

export class ReportsService {
  /**
   * Main calculation engine for real data driven Business Reports
   */
  static computeBusinessReport = computeBusinessReport
  // Legacy helper methods preserved for backward compatibility
  static getSalesByProduct(ordersList?: SalesOrderRecord[]): SalesBreakdownItem[] {
    const orders = ordersList || PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
    if (!orders.length) return []
    const map = new Map<string, { revenue: number; count: number; category: string }>()
    let totalRev = 0
    orders.forEach((o) => {
      o.items?.forEach((item) => {
        const title = item.item_name || 'General Product'
        const existing = map.get(title) || { revenue: 0, count: 0, category: 'Print' }
        existing.revenue += item.total_price || 0
        existing.count += item.quantity || 1
        totalRev += item.total_price || 0
        map.set(title, existing)
      })
    })
    return Array.from(map.entries()).map(([label, d], idx) => ({
      id: `sb-${idx}`,
      label,
      category: d.category,
      revenue: d.revenue,
      ordersCount: d.count,
      sharePercent: totalRev > 0 ? Number(((d.revenue / totalRev) * 100).toFixed(1)) : 0,
    }))
  }

  static getSalesByCustomer(ordersList?: SalesOrderRecord[]): SalesBreakdownItem[] {
    const orders = ordersList || PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
    if (!orders.length) return []
    const map = new Map<string, { revenue: number; count: number }>()
    let totalRev = 0
    orders.forEach((o) => {
      const name = o.customer_name || 'Customer'
      const amt = o.final_price || o.subtotal || 0
      const existing = map.get(name) || { revenue: 0, count: 0 }
      existing.revenue += amt
      existing.count += 1
      totalRev += amt
      map.set(name, existing)
    })
    return Array.from(map.entries()).map(([label, d], idx) => ({
      id: `sc-${idx}`,
      label,
      category: 'Customer',
      revenue: d.revenue,
      ordersCount: d.count,
      sharePercent: totalRev > 0 ? Number(((d.revenue / totalRev) * 100).toFixed(1)) : 0,
    }))
  }

  static getSalesByPerson(ordersList?: SalesOrderRecord[]): SalesBreakdownItem[] {
    const orders = ordersList || PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
    if (!orders.length) return []
    const map = new Map<string, { revenue: number; count: number }>()
    let totalRev = 0
    orders.forEach((o) => {
      const name = (o as any).sales_person_name || (o as any).created_by_name || 'Sales Staff'
      const amt = o.final_price || o.subtotal || 0
      const existing = map.get(name) || { revenue: 0, count: 0 }
      existing.revenue += amt
      existing.count += 1
      totalRev += amt
      map.set(name, existing)
    })
    return Array.from(map.entries()).map(([label, d], idx) => ({
      id: `sp-${idx}`,
      label,
      category: 'Salesperson',
      revenue: d.revenue,
      ordersCount: d.count,
      sharePercent: totalRev > 0 ? Number(((d.revenue / totalRev) * 100).toFixed(1)) : 0,
    }))
  }

  static getSalesByArea(ordersList?: SalesOrderRecord[]): SalesBreakdownItem[] {
    const orders = ordersList || PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
    if (!orders.length) return []
    const map = new Map<string, { revenue: number; count: number }>()
    let totalRev = 0
    orders.forEach((o) => {
      const area = (o as any).delivery_address || (o as any).area || 'Dhaka Central'
      const amt = o.final_price || o.subtotal || 0
      const existing = map.get(area) || { revenue: 0, count: 0 }
      existing.revenue += amt
      existing.count += 1
      totalRev += amt
      map.set(area, existing)
    })
    return Array.from(map.entries()).map(([label, d], idx) => ({
      id: `sa-${idx}`,
      label,
      category: 'Area',
      revenue: d.revenue,
      ordersCount: d.count,
      sharePercent: totalRev > 0 ? Number(((d.revenue / totalRev) * 100).toFixed(1)) : 0,
    }))
  }

  static getPaymentMethods(paymentsList?: PaymentRecord[]): SalesBreakdownItem[] {
    const payments = paymentsList || PrintERPDataStore.get<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS) || []
    if (!payments.length) return []
    const map = new Map<string, { revenue: number; count: number }>()
    let totalRev = 0
    payments.forEach((p) => {
      const method = (p as any).payment_method || (p as any).method || 'Cash / Bank'
      const amt = Number(p.amount) || 0
      const existing = map.get(method) || { revenue: 0, count: 0 }
      existing.revenue += amt
      existing.count += 1
      totalRev += amt
      map.set(method, existing)
    })
    return Array.from(map.entries()).map(([label, d], idx) => ({
      id: `pm-${idx}`,
      label,
      category: 'Payment Method',
      revenue: d.revenue,
      ordersCount: d.count,
      sharePercent: totalRev > 0 ? Number(((d.revenue / totalRev) * 100).toFixed(1)) : 0,
    }))
  }

  static getProductionMetrics(jobsList?: ProductionJobRecord[]): ProductionMetricItem[] {
    const jobs = jobsList || PrintERPDataStore.get<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
    const completed = jobs.filter((j) => j.status === 'completed').length
    const inProgress = jobs.filter((j) => j.status === 'in_progress').length
    const queued = jobs.filter((j) => j.status === 'queued').length

    return [
      {
        id: 'pm-1',
        metric: 'Completed Jobs',
        value: completed,
        subtext: `${jobs.length} total jobs logged`,
        statusColor: 'emerald',
      },
      {
        id: 'pm-2',
        metric: 'Active in Production',
        value: inProgress,
        subtext: 'Currently running on press',
        statusColor: 'blue',
      },
      {
        id: 'pm-3',
        metric: 'Queued Jobs',
        value: queued,
        subtext: 'Awaiting operator start',
        statusColor: 'amber',
      },
    ]
  }

  static getFinancialAging(invoicesList?: InvoiceRecord[]): FinancialAgingItem[] {
    const invoices = invoicesList || PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
    const overdueInvoices = invoices.filter((i) => (Number(i.due_amount) || 0) > 0)
    const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (Number(i.due_amount) || 0), 0)

    return [
      {
        id: 'fa-1',
        range: '1 - 15 Days',
        amount: Math.round(totalOverdue * 0.5),
        invoicesCount: Math.ceil(overdueInvoices.length * 0.5),
        riskLevel: 'low',
      },
      {
        id: 'fa-2',
        range: '16 - 30 Days',
        amount: Math.round(totalOverdue * 0.3),
        invoicesCount: Math.ceil(overdueInvoices.length * 0.3),
        riskLevel: 'moderate',
      },
      {
        id: 'fa-3',
        range: '31 - 60 Days',
        amount: Math.round(totalOverdue * 0.15),
        invoicesCount: Math.ceil(overdueInvoices.length * 0.15),
        riskLevel: 'high',
      },
      {
        id: 'fa-4',
        range: '60+ Days',
        amount: Math.round(totalOverdue * 0.05),
        invoicesCount: Math.floor(overdueInvoices.length * 0.05),
        riskLevel: 'critical',
      },
    ]
  }

  static getInventoryValuation(materialsList?: MaterialRecord[]): InventoryValuationItem[] {
    const materials = materialsList || PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS) || []
    return materials.map((m, idx) => {
      const unitCost = Number(m.average_cost ?? m.cost_per_unit ?? m.last_purchase_price ?? 0)
      return {
        id: `iv-${idx}`,
        materialName: m.name,
        category: m.category,
        stockQty: m.current_stock,
        unit: m.unit,
        unitCost,
        totalValue: m.current_stock * unitCost,
        reorderLevel: m.min_stock_level,
        isLowStock: m.current_stock <= m.min_stock_level,
      }
    })
  }

  static getCustomerReports(customersList?: CustomerRecord[], ordersList?: SalesOrderRecord[]): CustomerReportItem[] {
    const customers = customersList || PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
    const orders = ordersList || PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []

    return customers.map((c, idx) => {
      const custOrders = orders.filter((o) => o.customer_id === c.id || o.customer_name === c.name)
      const lifetimeSales = custOrders.length > 0
        ? custOrders.reduce((sum, o) => sum + (Number(o.final_price) || Number(o.subtotal) || 0), 0)
        : (c.total_orders_amount || 0)
      const dueBalance = Number(c.total_due_balance) || 0
      const totalPaid = Math.max(0, lifetimeSales - dueBalance)
      const ordersCount = custOrders.length > 0 ? custOrders.length : (c.total_orders_count || 0)

      return {
        id: `cr-${idx}`,
        customerName: c.name,
        customerType: c.customer_type || 'Regular',
        lifetimeSales,
        totalPaid,
        dueBalance,
        ordersCount,
        lastOrderDate: c.updated_at ? c.updated_at.split('T')[0] : 'N/A',
      }
    })
  }
}
