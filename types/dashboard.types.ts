import type {
  CanonicalSalesMetrics,
  CanonicalCollectionMetrics,
  CanonicalReceivablesMetrics,
  CanonicalProfitMetrics,
  OverdueReceivableSummary,
} from '@/lib/finance/canonical-finance'
import type { EvaluatedJobRisk, NeedsAttentionItem, BlockedWorkItem } from '@/lib/dashboard/job-risk-engine'

export interface CriticalStockAlert {
  id: string
  name: string
  sku: string
  category: string
  currentStock: number
  minStockLevel: number
  unit: string
  reorderQuantity: number
  severity: 'critical' | 'warning'
}

export interface SegmentMetrics {
  digital: {
    activeJobsCount: number
    completedTodayCount: number
    todaySales: number
  }
  offset: {
    activeJobsCount: number
    platesPending: number
    pressRunning: number
    todaySales: number
  }
  signage: {
    activeJobsCount: number
    totalSqFt: number
    installationPending: number
    todaySales: number
  }
}

export interface LiquiditySummary {
  cashInHand: number
  bankBalance: number
  mfsBalance: number // bKash, Nagad, Rocket
  totalLiquidAssets: number
  todayCollection: number
  todayExpenses: number
  todayNetCashFlow: number
}

export interface MachineryFloorSummary {
  totalMachines: number
  runningCount: number
  idleCount: number
  maintenanceCount: number
  breakdownCount: number
}

export interface TopCustomerSummary {
  customerId: string
  customerName: string
  companyName?: string
  totalSales: number
  ordersCount: number
  dueBalance: number
}

export interface FastSummaryMetrics {
  todaySales: number
  todayCollections: number
  totalReceivables: number
  totalOverdueReceivables: number
  activeOrdersCount: number
  inProductionCount: number
  pendingDesignCount: number
  criticalStockCount: number
  isCached: boolean
}

export interface OwnerDashboardSnapshot {
  timestamp: string
  companyId: string
  branchId: string | null
  businessDate: string
  hasFinancialPermission?: boolean

  // 1. Business Today Core KPIs
  salesMetrics: CanonicalSalesMetrics
  collectionMetrics: CanonicalCollectionMetrics
  receivablesMetrics: CanonicalReceivablesMetrics
  profitMetrics: CanonicalProfitMetrics

  // 2. Liquid Funds & Cash Drawer (BDT)
  liquiditySummary?: LiquiditySummary

  // 3. Printing Segment Metrics (Digital / Offset / Signage)
  segmentMetrics?: SegmentMetrics

  // 4. Critical Stock Watchlist (Low Paper, Vinyl, Banner, Ink, Plates)
  criticalStockAlerts?: CriticalStockAlert[]

  // 5. Machine Floor Status
  machinerySummary?: MachineryFloorSummary

  // 6. Needs Your Attention
  attentionItems: NeedsAttentionItem[]

  // 7. Blocked Work
  blockedWorkItems: BlockedWorkItem[]

  // 8. Production Today
  productionSummary: {
    activeCount: number
    runningCount: number
    queuedCount: number
    waitingCount: number
    finishingCount: number
    atRiskCount: number
    completedTodayCount: number
    topJobs: EvaluatedJobRisk[]
  }

  // 9. Delivery Today
  deliverySummary: {
    scheduledCount: number
    assignedCount: number
    outForDeliveryCount: number
    deliveredCount: number
    delayedCount: number
    topDeliveries: Array<{
      id: string
      challanNumber: string
      customerName: string
      deliveryAddress: string
      status: string
      scheduledDate: string
      deliveryPersonName?: string | null
      isDelayed: boolean
    }>
  }

  // 10. Money to Collect
  moneyToCollect: OverdueReceivableSummary[]

  // 11. Workflow Pipeline Counts
  pipelineCounts: {
    newWork: number
    quotation: number
    approved: number
    design: number
    production: number
    ready: number
    delivered: number
  }

  // 12. Business Trend (Past 30 Days)
  trendData: Array<{
    dateStr: string
    dayLabelEn: string
    dayLabelBn: string
    shortDate: string
    sales: number
    collections: number
  }>

  // 13. Top Customers by Revenue (Past 30 Days / All active)
  topCustomers: TopCustomerSummary[]

  branchCount: number
  fastSummary?: FastSummaryMetrics | null
}

