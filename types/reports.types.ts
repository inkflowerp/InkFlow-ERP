export interface ReportFilterState {
  dateRange: 'today' | '7d' | 'this_month' | 'last_month' | 'quarter'
  branch: 'all' | 'motijheel' | 'dhanmondi'
  customerType: 'all' | 'corporate' | 'agency' | 'retail'
  department: 'all' | 'printing' | 'finishing' | 'fabrication' | 'installation'
}

export interface SalesBreakdownItem {
  id: string
  label: string
  category?: string
  revenue: number
  ordersCount: number
  sharePercent: number
}

export interface ProductionMetricItem {
  id: string
  metric: string
  value: string | number
  subtext: string
  statusColor: 'emerald' | 'amber' | 'red' | 'blue' | 'purple'
}

export interface FinancialAgingItem {
  id: string
  range: string
  amount: number
  invoicesCount: number
  riskLevel: 'low' | 'moderate' | 'high' | 'critical'
}

export interface InventoryValuationItem {
  id: string
  materialName: string
  category: string
  stockQty: number
  unit: string
  unitCost: number
  totalValue: number
  reorderLevel: number
  isLowStock: boolean
}

export interface CustomerReportItem {
  id: string
  customerName: string
  customerType: string
  lifetimeSales: number
  totalPaid: number
  dueBalance: number
  ordersCount: number
  lastOrderDate: string
}
