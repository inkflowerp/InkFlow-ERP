// ==============================================================================
// InkFlow ERP - Authoritative Business Owner Dashboard Service (V9.1)
// PostgreSQL server-side aggregation for Executive Control Center
// Tenant-safe, Branch-scoped, Permission-aware, and Timezone-accurate (Asia/Dhaka)
// ==============================================================================

import { BillingRepository } from '@/lib/repositories/billing.repository'
import { OrderRepository } from '@/lib/repositories/order.repository'
import { ProductionRepository } from '@/lib/repositories/production.repository'
import { LogisticsRepository } from '@/lib/repositories/logistics.repository'
import { DesignRepository } from '@/lib/repositories/design.repository'
import { InventoryRepository } from '@/lib/repositories/inventory.repository'
import { CostingRepository } from '@/lib/repositories/costing.repository'
import { BranchRepository } from '@/lib/repositories/branch.repository'
import { QuotationRepository } from '@/lib/repositories/quotation.repository'
import {
  CanonicalFinance,
  type CanonicalSalesMetrics,
  type CanonicalCollectionMetrics,
  type CanonicalReceivablesMetrics,
  type CanonicalProfitMetrics,
  type OverdueReceivableSummary,
} from '@/lib/finance/canonical-finance'
import { JobRiskEngine, type EvaluatedJobRisk, type NeedsAttentionItem, type BlockedWorkItem } from '@/lib/dashboard/job-risk-engine'
import {
  getBangladeshTodayDateString,
  getBangladeshDateRange,
  toBangladeshDateString,
} from '@/lib/utils/business-date'
import type { InvoiceRecord, PaymentRecord } from '@/types/billing.types'
import type { SalesOrderRecord } from '@/types/order.types'
import type { ProductionJobRecord } from '@/types/production.types'
import type { DeliveryChallanRecord } from '@/types/logistics.types'
import type { DesignJobRecord } from '@/types/design.types'
import type { MaterialRecord } from '@/types/inventory.types'
import type { JobCostingRecord } from '@/types/costing.types'
import type { QuotationRecord } from '@/types/quotation.types'

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

  // 2. Needs Your Attention
  attentionItems: NeedsAttentionItem[]

  // 3. Blocked Work
  blockedWorkItems: BlockedWorkItem[]

  // 4. Production Today
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

  // 5. Delivery Today
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

  // 6. Money to Collect
  moneyToCollect: OverdueReceivableSummary[]

  // 7. Workflow Pipeline Counts
  pipelineCounts: {
    newWork: number
    quotation: number
    approved: number
    design: number
    production: number
    ready: number
    delivered: number
  }

  // 8. Business Trend (Past 7 Days)
  trendData: Array<{
    dateStr: string
    dayLabelEn: string
    dayLabelBn: string
    sales: number
    collections: number
  }>

  branchCount: number
}

export class DashboardService {
  /**
   * Generates a complete authoritative snapshot for the Business Owner Dashboard
   */
  static async getOwnerDashboardSnapshot(
    companyId: string,
    branchId?: string | null,
    hasFinancialPermission: boolean = true
  ): Promise<OwnerDashboardSnapshot> {
    const todayStr = getBangladeshTodayDateString()

    // Parallel fetch from PostgreSQL repositories
    const [
      invoices,
      payments,
      orders,
      productionJobs,
      deliveryChallans,
      designJobs,
      materials,
      costings,
      quotations,
      branches,
    ]: [
      InvoiceRecord[],
      PaymentRecord[],
      SalesOrderRecord[],
      ProductionJobRecord[],
      DeliveryChallanRecord[],
      DesignJobRecord[],
      MaterialRecord[],
      JobCostingRecord[],
      QuotationRecord[],
      any[],
    ] = await Promise.all([
      BillingRepository.getInvoices(companyId).catch(() => []),
      BillingRepository.getPayments(companyId).catch(() => []),
      OrderRepository.getOrders(companyId).catch(() => []),
      ProductionRepository.getProductionJobs(companyId).catch(() => []),
      LogisticsRepository.getChallans(companyId).catch(() => []),
      DesignRepository.getDesignJobs(companyId).catch(() => []),
      InventoryRepository.getMaterials(companyId).catch(() => []),
      CostingRepository.getCostings(companyId).catch(() => []),
      QuotationRepository.getQuotations(companyId).catch(() => []),
      BranchRepository.listBranches(companyId).catch(() => []),
    ])

    // Filter by branch if specific branch selected
    const branchInvoices = branchId ? invoices.filter((i) => !(i as any).branch_id || (i as any).branch_id === branchId) : invoices
    const branchPayments = branchId ? payments.filter((p) => !(p as any).branch_id || (p as any).branch_id === branchId) : payments
    const branchOrders = branchId ? orders.filter((o) => !(o as any).branch_id || (o as any).branch_id === branchId) : orders
    const branchProduction = branchId ? productionJobs.filter((p) => !(p as any).branch_id || (p as any).branch_id === branchId) : productionJobs
    const branchDelivery = branchId ? deliveryChallans.filter((d) => !(d as any).branch_id || (d as any).branch_id === branchId) : deliveryChallans
    const branchDesign = branchId ? designJobs.filter((d) => !(d as any).branch_id || (d as any).branch_id === branchId) : designJobs
    const branchMaterials = branchId ? materials.filter((m) => !(m as any).branch_id || (m as any).branch_id === branchId) : materials
    const branchQuotations = branchId ? quotations.filter((q) => !(q as any).branch_id || (q as any).branch_id === branchId) : quotations

    // 1. Business Today KPIs (Permission Gated)
    const salesMetrics = hasFinancialPermission
      ? CanonicalFinance.calculateSalesMetrics(branchInvoices, branchOrders, branchId)
      : CanonicalFinance.createRestrictedSalesMetrics()

    const collectionMetrics = hasFinancialPermission
      ? CanonicalFinance.calculateCollectionMetrics(branchPayments, branchId)
      : CanonicalFinance.createRestrictedCollectionMetrics()

    const receivablesMetrics = hasFinancialPermission
      ? CanonicalFinance.calculateTotalReceivables(branchInvoices, branchId)
      : CanonicalFinance.createRestrictedReceivablesMetrics()

    const profitMetrics = hasFinancialPermission
      ? CanonicalFinance.calculateProfitMetrics(costings, branchInvoices, branchId)
      : CanonicalFinance.createRestrictedProfitMetrics()

    // 2. Needs Your Attention (Filter invoice exceptions if financial permission missing)
    const rawAttentionItems = JobRiskEngine.generateNeedsAttentionItems({
      productionJobs: branchProduction,
      designJobs: branchDesign,
      deliveryChallans: branchDelivery,
      invoices: hasFinancialPermission ? branchInvoices : [],
      materials: branchMaterials,
      branchId,
    })
    const attentionItems = hasFinancialPermission
      ? rawAttentionItems
      : rawAttentionItems.filter((item) => item.category !== 'money')

    // 3. Blocked Work
    const blockedWorkItems = JobRiskEngine.getBlockedWorkItems({
      productionJobs: branchProduction,
      designJobs: branchDesign,
      materials: branchMaterials,
      branchId,
    })

    // 4. Production Today Summary & Top Jobs
    const evaluatedJobs = branchProduction.map((pj) =>
      JobRiskEngine.evaluateProductionJobRisk(pj, branchMaterials, todayStr)
    )

    const runningJobs = branchProduction.filter((p) => p.status === 'in_progress')
    const queuedJobs = branchProduction.filter((p) => p.status === 'queued' || (p as any).status === 'ready' || (p as any).status === 'scheduled')
    const waitingJobs = evaluatedJobs.filter((j) => j.isBlocked)
    const finishingJobs = branchProduction.filter((p) => p.stage === 'finishing' || (p as any).department === 'finishing')
    const atRiskJobs = evaluatedJobs.filter((j) => j.riskLevel === 'critical' || j.riskLevel === 'at_risk')
    const completedToday = branchProduction.filter((p) => {
      const compDate = toBangladeshDateString((p as any).completed_at || p.updated_at)
      return p.status === 'completed' && compDate === todayStr
    })

    const productionSummary = {
      activeCount: branchProduction.filter((p) => p.status !== 'completed' && (p.status as string) !== 'cancelled').length,
      runningCount: runningJobs.length,
      queuedCount: queuedJobs.length,
      waitingCount: waitingJobs.length,
      finishingCount: finishingJobs.length,
      atRiskCount: atRiskJobs.length,
      completedTodayCount: completedToday.length,
      topJobs: evaluatedJobs
        .filter((j) => j.riskLevel !== 'on_track' || j.currentStage === 'printing' || j.currentStage === 'finishing')
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 6),
    }

    // 5. Delivery Today Summary & Top Deliveries
    const scheduledDels = branchDelivery.filter((d) => d.status === 'scheduled')
    const assignedDels = branchDelivery.filter((d) => d.status === 'assigned')
    const outDels = branchDelivery.filter((d) => d.status === 'out_for_delivery' || (d as any).status === 'in_transit')
    const deliveredDels = branchDelivery.filter((d) => {
      const delDate = toBangladeshDateString(d.delivered_at || d.updated_at)
      return d.status === 'delivered' && delDate === todayStr
    })
    const delayedDels = branchDelivery.filter((d) => {
      const isPending = d.status === 'scheduled' || d.status === 'assigned'
      return isPending && d.scheduled_date && d.scheduled_date < todayStr
    })

    const topDeliveries = branchDelivery
      .filter((d) => d.status !== 'delivered' && (d.status as string) !== 'cancelled')
      .slice(0, 5)
      .map((d) => ({
        id: d.id,
        challanNumber: d.challan_number || d.id.slice(0, 8).toUpperCase(),
        customerName: d.customer_name || 'Customer',
        deliveryAddress: d.delivery_address || 'Standard Delivery',
        status: d.status,
        scheduledDate: d.scheduled_date || todayStr,
        deliveryPersonName: d.delivery_person_name,
        isDelayed: Boolean(d.scheduled_date && d.scheduled_date < todayStr),
      }))

    const deliverySummary = {
      scheduledCount: scheduledDels.length,
      assignedCount: assignedDels.length,
      outForDeliveryCount: outDels.length,
      deliveredCount: deliveredDels.length,
      delayedCount: delayedDels.length,
      topDeliveries,
    }

    // 6. Money to Collect (Gated)
    const moneyToCollect = hasFinancialPermission
      ? CanonicalFinance.getTopOverdueReceivables(branchInvoices, 5, branchId)
      : []

    // 7. Workflow Pipeline Counts
    const pipelineCounts = {
      newWork: branchOrders.filter((o) => o.status === 'draft' || o.status === 'confirmed').length,
      quotation: branchQuotations.filter((q) => q.status === 'draft' || q.status === 'sent').length,
      approved: branchQuotations.filter((q) => q.status === 'approved').length + branchOrders.filter((o) => o.status === 'confirmed').length,
      design: branchDesign.filter((d) => d.status !== 'approved' && (d.status as string) !== 'cancelled').length,
      production: branchProduction.filter((p) => p.status !== 'completed' && (p.status as string) !== 'cancelled').length,
      ready: branchDelivery.filter((d) => d.status === 'scheduled' || d.status === 'assigned').length,
      delivered: branchDelivery.filter((d) => d.status === 'delivered').length,
    }

    // 8. 7-Day Trend (Gated)
    const dateRange = getBangladeshDateRange(7)
    const trendData = hasFinancialPermission
      ? dateRange.map((rangeItem) => {
          const daySales = branchInvoices
            .filter((inv) => {
              const invDate = toBangladeshDateString(inv.invoice_date || inv.created_at)
              const rawStatus = String(inv.status || '').toLowerCase()
              return invDate === rangeItem.dateStr && rawStatus !== 'cancelled' && rawStatus !== 'void'
            })
            .reduce((sum, inv) => sum + (Number(inv.grand_total) || Number((inv as any).total_amount) || Number(inv.subtotal) || 0), 0)

          const dayCollections = branchPayments
            .filter((p) => {
              const pDate = toBangladeshDateString(p.payment_date || p.created_at)
              return pDate === rangeItem.dateStr
            })
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

          return {
            dateStr: rangeItem.dateStr,
            dayLabelEn: rangeItem.dayOfWeek,
            dayLabelBn: rangeItem.dayOfWeek,
            sales: Number(daySales.toFixed(2)),
            collections: Number(dayCollections.toFixed(2)),
          }
        })
      : []

    return {
      timestamp: new Date().toISOString(),
      companyId,
      branchId: branchId || null,
      businessDate: todayStr,
      hasFinancialPermission,
      salesMetrics,
      collectionMetrics,
      receivablesMetrics,
      profitMetrics,
      attentionItems,
      blockedWorkItems,
      productionSummary,
      deliverySummary,
      moneyToCollect,
      pipelineCounts,
      trendData,
      branchCount: branches.length || 1,
    }
  }
}
