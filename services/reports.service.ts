import {
  SalesBreakdownItem,
  ProductionMetricItem,
  FinancialAgingItem,
  InventoryValuationItem,
  CustomerReportItem,
} from '@/types/reports.types'

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
    rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { SalesOrderRecord } from '@/types/order.types'
import { CustomerRecord } from '@/types/crm.types'
import { InvoiceRecord } from '@/types/billing.types'
import { MaterialRecord } from '@/types/inventory.types'
import { ProductionJobRecord } from '@/types/production.types'

export const DEMO_SALES_BY_PRODUCT: SalesBreakdownItem[] = []
export const DEMO_SALES_BY_CUSTOMER: SalesBreakdownItem[] = []
export const DEMO_SALES_BY_PERSON: SalesBreakdownItem[] = []
export const DEMO_SALES_BY_AREA: SalesBreakdownItem[] = []
export const DEMO_PAYMENT_METHODS: SalesBreakdownItem[] = []
export const DEMO_PRODUCTION_METRICS: ProductionMetricItem[] = []
export const DEMO_FINANCIAL_AGING: FinancialAgingItem[] = []
export const DEMO_INVENTORY_VALUATION: InventoryValuationItem[] = []
export const DEMO_CUSTOMER_REPORTS: CustomerReportItem[] = []

export class ReportsService {
  static getSalesByProduct(): SalesBreakdownItem[] {
    const orders = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
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

  static getSalesByCustomer(): SalesBreakdownItem[] {
    const orders = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
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

  static getSalesByPerson(): SalesBreakdownItem[] {
    const orders = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
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

  static getSalesByArea(): SalesBreakdownItem[] {
    const orders = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
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

  static getPaymentMethods(): SalesBreakdownItem[] {
    const invoices = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
    if (!invoices.length) return []
    const map = new Map<string, { revenue: number; count: number }>()
    let totalRev = 0
    invoices.forEach((inv) => {
      const method = (inv as any).payment_method || 'Cash / Bank'
      const amt = inv.paid_amount || 0
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

  static getProductionMetrics(): ProductionMetricItem[] {
    const jobs = PrintERPDataStore.get<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
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

  static getFinancialAging(): FinancialAgingItem[] {
    const invoices = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
    const overdueInvoices = invoices.filter((i) => (i.due_amount || 0) > 0)
    const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (i.due_amount || 0), 0)

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

  static getInventoryValuation(): InventoryValuationItem[] {
    const materials = PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS) || []
    return materials.map((m, idx) => ({
      id: `iv-${idx}`,
      materialName: m.name,
      category: m.category,
      stockQty: m.current_stock,
      unit: m.unit,
      unitCost: m.average_cost,
      totalValue: m.current_stock * m.average_cost,
      reorderLevel: m.min_stock_level,
      isLowStock: m.current_stock <= m.min_stock_level,
    }))
  }

  static getCustomerReports(): CustomerReportItem[] {
    const customers = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
    return customers.map((c, idx) => ({
      id: `cr-${idx}`,
      customerName: c.name,
      customerType: c.customer_type || 'Regular',
      lifetimeSales: c.total_orders_amount || 0,
      totalPaid: (c.total_orders_amount || 0) - (c.total_due_balance || 0),
      dueBalance: c.total_due_balance || 0,
      ordersCount: c.total_orders_count || 0,
      lastOrderDate: c.updated_at ? c.updated_at.split('T')[0] : 'N/A',
    }))
  }
}
