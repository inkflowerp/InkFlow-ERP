export type ReportPeriodKey =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_9_months'
  | 'last_12_months'
  | 'this_year'
  | 'all_time'
  | 'custom'

export interface ReportFilterState {
  dateRange: 'today' | '7d' | 'this_month' | 'last_month' | 'quarter' | 'all'
  branch: string
  customerType: 'all' | 'corporate' | 'agency' | 'retail' | 'government' | 'other'
  department: 'all' | 'printing' | 'finishing' | 'fabrication' | 'installation'
  startDate?: string
  endDate?: string
}

export interface BusinessReportSummary {
  totalSales: number
  salesTrendPercent: number | null
  invoicesCount: number
  totalJobs: number
  jobsTrendPercent: number | null
  uniqueCustomersCount: number
  grossProfit: number
  grossProfitMarginPercent: number
  profitTrendPercent: number | null
  totalExpenses: number
  expensesTrendPercent: number | null
  expenseTransactionsCount: number
}

export interface MonthlySalesVsProfitPoint {
  monthKey: string // 'YYYY-MM'
  monthLabel: string // 'Sep 2026'
  monthShort: string // 'Sep'
  sales: number
  cost: number
  profit: number
  margin: number
}

export interface ProductSalesPoint {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  amount: number
  sharePercent: number
  color: string
}

export interface CustomerTypeSalesPoint {
  type: string
  amount: number
  sharePercent: number
  color: string
  invoicesCount: number
}

export interface TopSellingProductItem {
  rank: number
  id: string
  name: string
  category?: string
  quantityFormatted: string
  amount: number
  sharePercent: number
}

export interface TopCustomerSalesItem {
  rank: number
  id: string
  customerName: string
  customerType?: string
  invoicesCount: number
  amount: number
  sharePercent: number
}

export interface JobStatusMetric {
  key: 'completed' | 'in_production' | 'designing' | 'pending' | 'on_hold'
  label: string
  count: number
  percentage: number
  color: string
  barColor: string
}

export interface FinancialSummaryRow {
  key: string
  item: string
  amount: number
  percentOfSales: number
  highlight: 'none' | 'green' | 'red'
}

export interface MonthlyOverviewRow {
  month: string
  sales: number
  cost: number
  profit: number
  margin: number
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

export type QuickReportType =
  | 'sales'
  | 'production'
  | 'inventory'
  | 'financial'
  | 'customer'
  | 'supplier'
  | 'profitability'
  | 'custom'

// Legacy compatibility
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
