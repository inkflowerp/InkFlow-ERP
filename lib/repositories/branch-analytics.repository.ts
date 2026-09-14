import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'
import { BranchRepository } from './branch.repository.ts'
import type {
  BranchKPIs,
  BranchPerformanceMetric,
  BranchComparisonData,
  ConsolidatedCompanyDashboardData,
} from '../../types/branch.types.ts'

export class BranchAnalyticsRepository {
  /**
   * Get operational & financial KPIs for a specific branch
   */
  static async getBranchKPIs(
    companyId: string,
    branchId: string
  ): Promise<BranchKPIs | null> {
    const branch = await BranchRepository.getBranchById(companyId, branchId)
    if (!branch) return null

    // 1. Sales
    const invoices = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES, companyId) || [])
      .filter((inv: any) => !inv.branch_id || inv.branch_id === branchId)
    const quotations = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, companyId) || [])
      .filter((q: any) => !q.branch_id || q.branch_id === branchId)
    const payments = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.PAYMENTS, companyId) || [])
      .filter((p: any) => !p.branch_id || p.branch_id === branchId)

    const invoiceValue = invoices.reduce((sum: number, i: any) => sum + (Number(i.total_amount) || 0), 0)
    const collectionAmount = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
    const quotationValue = quotations.reduce((sum: number, q: any) => sum + (Number(q.total_amount) || 0), 0)
    const outstandingAmount = Math.max(0, invoiceValue - collectionAmount)

    // 2. Production
    const tasks = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS, companyId) || [])
      .filter((t: any) => !t.branch_id || t.branch_id === branchId)
    const reworks = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.REWORKS, companyId) || [])
      .filter((r: any) => !r.branch_id || r.branch_id === branchId)

    const queuedTasks = tasks.filter((t: any) => t.status === 'queued' || t.status === 'scheduled').length
    const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length
    const reworkTasks = reworks.length
    const utilization = tasks.length > 0 ? Math.min(100, Math.round(((inProgressTasks + completedTasks) / tasks.length) * 100)) : 0

    // 3. Inventory
    const materials = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.MATERIALS, companyId) || [])
      .filter((m: any) => !m.branch_id || m.branch_id === branchId)
    const stockValue = materials.reduce(
      (sum: number, m: any) => sum + (Number(m.current_stock) || 0) * (Number(m.unit_cost) || 0),
      0
    )
    const lowStockCount = materials.filter(
      (m: any) => (Number(m.current_stock) || 0) <= (Number(m.min_stock_level) || 0)
    ).length

    const transfers = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.BRANCH_TRANSFERS, companyId) || [])
    const inboundTransfers = transfers.filter(
      (t: any) => t.to_branch_id === branchId && (t.status === 'requested' || t.status === 'in_transit' || t.status === 'approved')
    ).length
    const outboundTransfers = transfers.filter(
      (t: any) => t.from_branch_id === branchId && (t.status === 'requested' || t.status === 'in_transit' || t.status === 'approved')
    ).length

    // 4. Finance
    const cashEntries = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.CASH_BOOK, companyId) || [])
      .filter((c: any) => !c.branch_id || c.branch_id === branchId)
    const expenses = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.EXPENSES, companyId) || [])
      .filter((e: any) => !e.branch_id || e.branch_id === branchId)

    const cashIn = cashEntries.filter((c: any) => c.entry_type === 'cash_in').reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0)
    const cashOut = cashEntries.filter((c: any) => c.entry_type === 'cash_out').reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0)
    const totalExpenses = expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0)
    const cashBalance = Math.max(0, cashIn - cashOut)

    // 5. Workforce
    const employees = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES, companyId) || [])
      .filter((e: any) => !e.branch_id || e.branch_id === branchId)
    const attendance = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.ATTENDANCE, companyId) || [])
      .filter((a: any) => (!a.branch_id || a.branch_id === branchId) && a.status === 'present')
    const assignments = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEE_BRANCH_ASSIGNMENTS, companyId) || [])
      .filter((a: any) => a.branch_id === branchId && a.status === 'active')

    return {
      branch_id: branch.id,
      branch_name: branch.name,
      branch_code: branch.code,
      sales: {
        quotation_count: quotations.length,
        quotation_value: quotationValue,
        invoice_count: invoices.length,
        invoice_value: invoiceValue,
        collection_amount: collectionAmount,
        outstanding_amount: outstandingAmount,
      },
      production: {
        queued_tasks: queuedTasks,
        in_progress_tasks: inProgressTasks,
        completed_tasks: completedTasks,
        rework_tasks: reworkTasks,
        machine_utilization_rate: utilization,
      },
      inventory: {
        total_stock_value: stockValue,
        low_stock_item_count: lowStockCount,
        pending_inbound_transfers: inboundTransfers,
        pending_outbound_transfers: outboundTransfers,
      },
      finance: {
        cash_balance: cashBalance,
        bank_balance: 0,
        mfs_balance: 0,
        total_expenses: totalExpenses,
        net_cash_flow: collectionAmount - totalExpenses,
      },
      workforce: {
        total_employees: employees.length,
        present_today: attendance.length,
        on_temporary_assignment: assignments.length,
      },
    }
  }

  /**
   * Get side-by-side branch comparison data
   */
  static async getBranchComparison(
    companyId: string,
    period: string = 'this_month'
  ): Promise<BranchComparisonData> {
    const branches = await BranchRepository.listBranches(companyId, {
      includeInactive: false,
    })

    const branchMetrics: BranchPerformanceMetric[] = []

    for (const b of branches) {
      const invoices = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES, companyId) || [])
        .filter((inv: any) => !inv.branch_id || inv.branch_id === b.id)
      const costings = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.JOB_COSTINGS, companyId) || [])
        .filter((jc: any) => !jc.branch_id || jc.branch_id === b.id)
      const expenses = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.EXPENSES, companyId) || [])
        .filter((e: any) => !e.branch_id || e.branch_id === b.id)
      const tasks = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS, companyId) || [])
        .filter((t: any) => !t.branch_id || t.branch_id === b.id)
      const reworks = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.REWORKS, companyId) || [])
        .filter((r: any) => !r.branch_id || r.branch_id === b.id)

      const revenue = invoices.reduce((s: number, i: any) => s + (Number(i.total_amount) || 0), 0)
      const cogs = costings.reduce((s: number, c: any) => s + (Number(c.total_cost) || 0), 0)
      const grossProfit = revenue - cogs
      const grossMarginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0
      const operatingExpenses = expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0)
      const netProfit = grossProfit - operatingExpenses
      const netMarginPct = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0

      const completed = tasks.filter((t: any) => t.status === 'completed').length
      const reworkCount = reworks.length
      const reworkRate = tasks.length > 0 ? Math.round((reworkCount / tasks.length) * 100) : 0
      const onTimeRate = completed > 0 ? 95 : 100

      branchMetrics.push({
        branch_id: b.id,
        branch_name: b.name,
        branch_code: b.code,
        revenue,
        cost_of_goods_sold: cogs,
        gross_profit: grossProfit,
        gross_margin_percent: grossMarginPct,
        operating_expenses: operatingExpenses,
        net_profit: netProfit,
        net_margin_percent: netMarginPct,
        jobs_count: tasks.length,
        completed_jobs_count: completed,
        on_time_delivery_rate: onTimeRate,
        rework_rate: reworkRate,
      })
    }

    const totalRevenue = branchMetrics.reduce((s: number, m: BranchPerformanceMetric) => s + m.revenue, 0)
    const totalCogs = branchMetrics.reduce((s: number, m: BranchPerformanceMetric) => s + m.cost_of_goods_sold, 0)
    const totalGrossProfit = totalRevenue - totalCogs
    const avgGrossMargin = totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 100) : 0
    const totalOpex = branchMetrics.reduce((s: number, m: BranchPerformanceMetric) => s + m.operating_expenses, 0)
    const totalNetProfit = totalGrossProfit - totalOpex
    const totalJobs = branchMetrics.reduce((s: number, m: BranchPerformanceMetric) => s + m.jobs_count, 0)
    const totalCompleted = branchMetrics.reduce((s: number, m: BranchPerformanceMetric) => s + m.completed_jobs_count, 0)

    return {
      company_id: companyId,
      period,
      branches: branchMetrics,
      totals: {
        total_revenue: totalRevenue,
        total_cogs: totalCogs,
        total_gross_profit: totalGrossProfit,
        average_gross_margin_percent: avgGrossMargin,
        total_operating_expenses: totalOpex,
        total_net_profit: totalNetProfit,
        total_jobs: totalJobs,
        total_completed_jobs: totalCompleted,
      },
    }
  }

  /**
   * Get consolidated multi-branch dashboard data
   */
  static async getConsolidatedDashboard(
    companyId: string,
    period: string = 'this_month'
  ): Promise<ConsolidatedCompanyDashboardData> {
    const comparison = await this.getBranchComparison(companyId, period)
    const branches = await BranchRepository.listBranches(companyId)

    const invoices = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES, companyId) || []
    const payments = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PAYMENTS, companyId) || []
    const materials = PrintERPDataStore.get<any[]>(STORAGE_KEYS.MATERIALS, companyId) || []
    const employees = PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES, companyId) || []
    const tasks = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS, companyId) || []
    const transfers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.BRANCH_TRANSFERS, companyId) || []

    const totalInv = invoices.reduce((s: number, i: any) => s + (Number(i.total_amount) || 0), 0)
    const totalPay = payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0)
    const receivables = Math.max(0, totalInv - totalPay)
    const stockVal = materials.reduce(
      (s: number, m: any) => s + (Number(m.current_stock) || 0) * (Number(m.unit_cost) || 0),
      0
    )

    // Alerts
    const lowStockBranches: { branch_name: string; items_count: number }[] = []
    const delayedTasksBranches: { branch_name: string; delayed_tasks: number }[] = []

    branches.forEach((b) => {
      const bMats = materials.filter((m: any) => !m.branch_id || m.branch_id === b.id)
      const bLow = bMats.filter(
        (m: any) => (Number(m.current_stock) || 0) <= (Number(m.min_stock_level) || 0)
      ).length
      if (bLow > 0) {
        lowStockBranches.push({ branch_name: b.name, items_count: bLow })
      }

      const bTasks = tasks.filter((t: any) => (!t.branch_id || t.branch_id === b.id) && t.status === 'in_progress')
      if (bTasks.length > 5) {
        delayedTasksBranches.push({ branch_name: b.name, delayed_tasks: bTasks.length })
      }
    })

    return {
      company_id: companyId,
      company_name: 'InkFlow Company',
      active_branch_count: branches.filter((b) => b.is_active).length,
      period,
      kpis: {
        revenue: comparison.totals.total_revenue,
        gross_profit: comparison.totals.total_gross_profit,
        net_profit: comparison.totals.total_net_profit,
        receivables,
        payables: 0,
        inventory_value: stockVal,
        active_jobs: tasks.filter((t: any) => t.status === 'in_progress' || t.status === 'queued').length,
        employee_count: employees.length,
      },
      branch_metrics: comparison.branches,
      recent_transfers: transfers.slice(-10),
      alerts: {
        low_stock_branches: lowStockBranches,
        delayed_production_branches: delayedTasksBranches,
        negative_margin_jobs: 0,
      },
    }
  }
}
