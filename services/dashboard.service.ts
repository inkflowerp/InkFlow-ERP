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
import { FinanceRepository } from '@/lib/repositories/finance.repository'
import { MachineryRepository } from '@/lib/repositories/machinery.repository'
import { AccountingService } from '@/services/accounting.service'
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
import type { ExpenseRecord } from '@/types/accounting.types'

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

  // 12. Business Trend (Past 7 Days)
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
      accounts,
      machineries,
      expenses,
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
      any[],
      any[],
      ExpenseRecord[],
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
      FinanceRepository.getAccounts(companyId, branchId || undefined).catch(() => []),
      MachineryRepository.getMachineries(companyId, { branch_id: branchId || undefined }).catch(() => []),
      AccountingService.getExpenses(companyId).catch(() => []),
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
    const branchExpenses = branchId ? expenses.filter((e) => !(e as any).branch_id || (e as any).branch_id === branchId) : expenses

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

    // 2. Liquid Funds & Cash Drawer Calculations (Permission Gated)
    let cashBal = 0
    let bankBal = 0
    let mfsBal = 0

    for (const acc of accounts || []) {
      const bal = Number(acc.current_balance) || 0
      const code = String(acc.code || '')
      const subtype = String(acc.account_subtype || '').toUpperCase()

      if (subtype === 'CASH' || code === '1010' || code === '1001') {
        cashBal += bal
      } else if (subtype === 'BANK' || code === '1020' || code === '1002') {
        bankBal += bal
      } else if (subtype === 'MFS' || code === '1030' || code === '1031' || code === '1032' || code === '1003') {
        mfsBal += bal
      }
    }

    const todayCollectionAmt = collectionMetrics.todayCollection || 0
    
    // Live Today's Shop Expenses (Vouchers logged today)
    const todayExpensesAmt = branchExpenses
      .filter((e) => toBangladeshDateString(e.expense_date || e.created_at) === todayStr)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

    const todayNetCashFlow = Number((todayCollectionAmt - todayExpensesAmt).toFixed(2))

    const liquiditySummary: LiquiditySummary | undefined = hasFinancialPermission
      ? {
          cashInHand: Number(cashBal.toFixed(2)),
          bankBalance: Number(bankBal.toFixed(2)),
          mfsBalance: Number(mfsBal.toFixed(2)),
          totalLiquidAssets: Number((cashBal + bankBal + mfsBal).toFixed(2)),
          todayCollection: todayCollectionAmt,
          todayExpenses: Number(todayExpensesAmt.toFixed(2)),
          todayNetCashFlow,
        }
      : undefined

    // 3. Printing Segment Metrics (Digital / Offset / Signage Streams)
    const isDigital = (text: string) => {
      const t = text.toLowerCase()
      return (
        t.includes('digital') ||
        t.includes('laser') ||
        t.includes('card') ||
        t.includes('visiting') ||
        t.includes('flyer') ||
        t.includes('brochure') ||
        t.includes('id') ||
        t.includes('mug') ||
        t.includes('crest') ||
        t.includes('sublimation') ||
        t.includes('sticker') ||
        t.includes('glossy') ||
        t.includes('envelope')
      )
    }
    const isOffset = (text: string) => {
      const t = text.toLowerCase()
      return (
        t.includes('offset') ||
        t.includes('book') ||
        t.includes('box') ||
        t.includes('carton') ||
        t.includes('packaging') ||
        t.includes('magazine') ||
        t.includes('memo') ||
        t.includes('voucher') ||
        t.includes('poster') ||
        t.includes('pad') ||
        t.includes('forma') ||
        t.includes('ctp') ||
        t.includes('plate') ||
        t.includes('calendar') ||
        t.includes('impression')
      )
    }
    const isSignage = (text: string) => {
      const t = text.toLowerCase()
      return (
        t.includes('signage') ||
        t.includes('large_format') ||
        t.includes('banner') ||
        t.includes('vinyl') ||
        t.includes('flex') ||
        t.includes('star flex') ||
        t.includes('backlit') ||
        t.includes('acrylic') ||
        t.includes('letter') ||
        t.includes('board') ||
        t.includes('standee') ||
        t.includes('sign') ||
        t.includes('led') ||
        t.includes('neon') ||
        t.includes('acp') ||
        t.includes('fabrication') ||
        t.includes('installation')
      )
    }

    let digitalActive = 0
    let digitalCompletedToday = 0
    let digitalSales = 0

    let offsetActive = 0
    let offsetPlatesPending = 0
    let offsetPressRunning = 0
    let offsetSales = 0

    let signageActive = 0
    let signageSqFt = 0
    let signageInstallationPending = 0
    let signageSales = 0

    // Classify production jobs into streams
    for (const pj of branchProduction) {
      const name = `${pj.product_name || ''} ${pj.department || ''} ${(pj as any).stage || ''}`
      const isCompToday = pj.status === 'completed' && toBangladeshDateString((pj as any).completed_at || pj.updated_at) === todayStr
      const isActive = pj.status !== 'completed' && (pj.status as string) !== 'cancelled'

      if (isDigital(name) || (pj.department === 'printing' && !isOffset(name) && !isSignage(name))) {
        if (isActive) digitalActive++
        if (isCompToday) digitalCompletedToday++
      } else if (isOffset(name)) {
        if (isActive) {
          offsetActive++
          if (pj.status === 'in_progress') offsetPressRunning++
          if ((pj as any).stage === 'prepress' || (pj as any).stage === 'ctp' || pj.status === 'queued') offsetPlatesPending++
        }
      } else if (isSignage(name) || pj.department === 'fabrication' || pj.department === 'installation') {
        if (isActive) {
          signageActive++
          signageSqFt += Number(pj.quantity) || 10
          if (pj.department === 'installation' || (pj as any).stage === 'installation') signageInstallationPending++
        }
      }
    }

    // Segment sales from orders / invoices
    for (const inv of branchInvoices) {
      const invDate = toBangladeshDateString(inv.invoice_date || inv.created_at)
      if (invDate !== todayStr) continue
      const amt = Number(inv.grand_total) || 0
      const desc = `${(inv as any).notes || ''} ${(inv as any).customer_name || ''} ${(inv as any).item_names || ''}`
      if (isOffset(desc)) offsetSales += amt
      else if (isSignage(desc)) signageSales += amt
      else digitalSales += amt
    }

    const segmentMetrics: SegmentMetrics = {
      digital: {
        activeJobsCount: digitalActive,
        completedTodayCount: digitalCompletedToday,
        todaySales: Number(digitalSales.toFixed(2)),
      },
      offset: {
        activeJobsCount: offsetActive,
        platesPending: offsetPlatesPending,
        pressRunning: offsetPressRunning,
        todaySales: Number(offsetSales.toFixed(2)),
      },
      signage: {
        activeJobsCount: signageActive,
        totalSqFt: signageSqFt,
        installationPending: signageInstallationPending,
        todaySales: Number(signageSales.toFixed(2)),
      },
    }

    // 4. Critical Stock Watchlist (Depleted Consumables Alert)
    const criticalStockAlerts: CriticalStockAlert[] = (branchMaterials || [])
      .filter((m) => {
        const stock = Number(m.current_stock) || 0
        const minLvl = Number(m.min_stock_level) || 10
        return stock <= minLvl
      })
      .slice(0, 6)
      .map((m) => ({
        id: m.id,
        name: m.name,
        sku: m.sku || m.id.slice(0, 6).toUpperCase(),
        category: (m as any).category || 'Raw Material',
        currentStock: Number(m.current_stock) || 0,
        minStockLevel: Number(m.min_stock_level) || 10,
        unit: m.unit || 'pcs',
        reorderQuantity: (Number(m.min_stock_level) || 10) * 2,
        severity: (Number(m.current_stock) || 0) === 0 ? 'critical' : 'warning',
      }))

    // 5. Machinery Floor Summary
    const totalMachs = (machineries || []).length
    const runningMachs = (machineries || []).filter((m: any) => m.status === 'running' || m.status === 'in_use').length
    const idleMachs = (machineries || []).filter((m: any) => m.status === 'idle' || m.status === 'available').length
    const maintMachs = (machineries || []).filter((m: any) => m.status === 'maintenance' || m.status === 'under_maintenance').length
    const breakdownMachs = (machineries || []).filter((m: any) => m.status === 'breakdown' || m.status === 'damaged').length

    const machinerySummary: MachineryFloorSummary = {
      totalMachines: totalMachs,
      runningCount: runningMachs,
      idleCount: idleMachs,
      maintenanceCount: maintMachs,
      breakdownCount: breakdownMachs,
    }

    // 6. Needs Your Attention (Filter invoice exceptions if financial permission missing)
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

    // 7. Blocked Work
    const blockedWorkItems = JobRiskEngine.getBlockedWorkItems({
      productionJobs: branchProduction,
      designJobs: branchDesign,
      materials: branchMaterials,
      branchId,
    })

    // 8. Production Today Summary & Top Jobs
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

    // 9. Delivery Today Summary & Top Deliveries
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

    // 10. Money to Collect (Gated)
    const moneyToCollect = hasFinancialPermission
      ? CanonicalFinance.getTopOverdueReceivables(branchInvoices, 5, branchId)
      : []

    // 11. Workflow Pipeline Counts
    const pipelineCounts = {
      newWork: branchOrders.filter((o) => o.status === 'draft' || o.status === 'confirmed').length,
      quotation: branchQuotations.filter((q) => q.status === 'draft' || q.status === 'sent').length,
      approved: branchQuotations.filter((q) => q.status === 'approved').length + branchOrders.filter((o) => o.status === 'confirmed').length,
      design: branchDesign.filter((d) => d.status !== 'approved' && (d.status as string) !== 'cancelled').length,
      production: branchProduction.filter((p) => p.status !== 'completed' && (p.status as string) !== 'cancelled').length,
      ready: branchDelivery.filter((d) => d.status === 'scheduled' || d.status === 'assigned').length,
      delivered: branchDelivery.filter((d) => d.status === 'delivered').length,
    }

    // 12. 7-Day Trend (Gated)
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
      liquiditySummary,
      segmentMetrics,
      criticalStockAlerts,
      machinerySummary,
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
