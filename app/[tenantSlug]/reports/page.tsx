'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Printer,
  ShoppingCart,
  ClipboardList,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Settings,
  Sparkles,
  Clock,
  PauseCircle,
  Package,
  FileText,
  Users,
  Truck,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FeatureGate } from '@/components/subscriptions/feature-gate'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { formatBDT } from '@/lib/formatters'
import { listBranchesAction } from '@/actions/branch.actions'
import { getBusinessReportDataAction } from '@/actions/reports.actions'
import {
  ReportsService,
  exportToCsv,
} from '@/services/reports.service'
import type {
  ReportPeriodKey,
  BusinessReportCalculatedData,
  ProductSalesPoint,
  CustomerTypeSalesPoint,
  TopSellingProductItem,
  TopCustomerSalesItem,
  JobStatusMetric,
  FinancialSummaryRow,
  MonthlyOverviewRow,
} from '@/types/reports.types'
import type { SalesOrderRecord } from '@/types/order.types'
import type { CustomerRecord } from '@/types/crm.types'
import type { InvoiceRecord, PaymentRecord } from '@/types/billing.types'
import type { MaterialRecord } from '@/types/inventory.types'
import type { ProductionJobRecord } from '@/types/production.types'
import type { ExpenseRecord } from '@/types/accounting.types'
import type { BranchMasterRecord } from '@/types/branch.types'

import { MonthlySalesProfitChart } from '@/components/reports/monthly-sales-profit-chart'
import { DonutDistributionChart } from '@/components/reports/donut-distribution-chart'
import { QuickReportModal, QuickReportType } from '@/components/reports/quick-report-modal'

export default function BusinessReportsPage() {
  const { company } = useTenant()

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<BranchMasterRecord[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('all')

  // Date Filtering State
  const [period, setPeriod] = useState<ReportPeriodKey>('this_month')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [showDatePickerModal, setShowDatePickerModal] = useState(false)

  // Chart configuration
  const [monthlyChartMonths, setMonthlyChartMonths] = useState<6 | 9 | 12>(9)

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Quick report modal state
  const [activeQuickReport, setActiveQuickReport] = useState<QuickReportType | null>(null)

  // Live Data Stores (Fallback & Offline Sync)
  const [storeOrders] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [])
  const [storeInvoices] = useDataStore<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, [])
  const [storePayments] = useDataStore<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, [])
  const [storeMaterials] = useDataStore<MaterialRecord[]>(STORAGE_KEYS.MATERIALS, [])
  const [storeCustomers] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [storeJobs] = useDataStore<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS, [])
  const [storeExpenses] = useDataStore<ExpenseRecord[]>(STORAGE_KEYS.EXPENSES, [])

  // Authoritative Server-side PostgreSQL Data
  const [serverInvoices, setServerInvoices] = useState<InvoiceRecord[]>([])
  const [serverOrders, setServerOrders] = useState<SalesOrderRecord[]>([])
  const [serverPayments, setServerPayments] = useState<PaymentRecord[]>([])
  const [serverJobs, setServerJobs] = useState<ProductionJobRecord[]>([])
  const [serverExpenses, setServerExpenses] = useState<ExpenseRecord[]>([])
  const [serverCustomers, setServerCustomers] = useState<CustomerRecord[]>([])
  const [serverMaterials, setServerMaterials] = useState<MaterialRecord[]>([])

  // Fetch Authoritative Server Data
  const loadServerData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getBusinessReportDataAction(
        selectedBranch === 'all' ? null : selectedBranch
      )
      if (res.success && res.data) {
        setServerInvoices(res.data.invoices || [])
        setServerOrders(res.data.orders || [])
        setServerPayments(res.data.payments || [])
        setServerJobs(res.data.productionJobs || [])
        setServerExpenses(res.data.expenses || [])
        setServerCustomers(res.data.customers || [])
        setServerMaterials(res.data.materials || [])
        if (res.data.branches?.length) {
          setBranches(res.data.branches)
        }
      }
    } catch (err) {
      console.warn('Failed to load server reports data, falling back to local store', err)
    } finally {
      setLoading(false)
    }
  }, [selectedBranch])

  useEffect(() => {
    setMounted(true)
    loadServerData()
    listBranchesAction({ includeInactive: false }).then((res) => {
      if (res.success && res.data) {
        setBranches(res.data as BranchMasterRecord[])
      }
    })
  }, [loadServerData])

  // Realtime Broadcast Listener for Live Multi-User Sync
  useEffect(() => {
    const handleSync = () => {
      loadServerData()
    }

    window.addEventListener('printerp_table_synced:orders', handleSync)
    window.addEventListener('printerp_table_synced:invoices', handleSync)
    window.addEventListener('printerp_table_synced:payments', handleSync)
    window.addEventListener('printerp_table_synced:materials', handleSync)
    window.addEventListener('printerp_table_synced:customers', handleSync)
    window.addEventListener('printerp_table_synced:expenses', handleSync)
    window.addEventListener('printerp_table_synced:branches', handleSync)
    window.addEventListener('printerp_data_sync', handleSync)

    return () => {
      window.removeEventListener('printerp_table_synced:orders', handleSync)
      window.removeEventListener('printerp_table_synced:invoices', handleSync)
      window.removeEventListener('printerp_table_synced:payments', handleSync)
      window.removeEventListener('printerp_table_synced:materials', handleSync)
      window.removeEventListener('printerp_table_synced:customers', handleSync)
      window.removeEventListener('printerp_table_synced:expenses', handleSync)
      window.removeEventListener('printerp_table_synced:branches', handleSync)
      window.removeEventListener('printerp_data_sync', handleSync)
    }
  }, [loadServerData])

  // Resolve Effective Datasets: Merge Server & Local Store
  const effectiveInvoices = useMemo(() => {
    return serverInvoices.length > 0 ? serverInvoices : storeInvoices || []
  }, [serverInvoices, storeInvoices])

  const effectiveOrders = useMemo(() => {
    return serverOrders.length > 0 ? serverOrders : storeOrders || []
  }, [serverOrders, storeOrders])

  const effectivePayments = useMemo(() => {
    return serverPayments.length > 0 ? serverPayments : storePayments || []
  }, [serverPayments, storePayments])

  const effectiveJobs = useMemo(() => {
    return serverJobs.length > 0 ? serverJobs : storeJobs || []
  }, [serverJobs, storeJobs])

  const effectiveExpenses = useMemo(() => {
    return serverExpenses.length > 0 ? serverExpenses : storeExpenses || []
  }, [serverExpenses, storeExpenses])

  const effectiveCustomers = useMemo(() => {
    return serverCustomers.length > 0 ? serverCustomers : storeCustomers || []
  }, [serverCustomers, storeCustomers])

  const effectiveMaterials = useMemo(() => {
    return serverMaterials.length > 0 ? serverMaterials : storeMaterials || []
  }, [serverMaterials, storeMaterials])

  // Compute Full Real-Data Business Report Metrics
  const reportData: BusinessReportCalculatedData = useMemo(() => {
    return ReportsService.computeBusinessReport({
      invoices: effectiveInvoices,
      orders: effectiveOrders,
      payments: effectivePayments,
      expenses: effectiveExpenses,
      jobs: effectiveJobs,
      customers: effectiveCustomers,
      materials: effectiveMaterials,
      period,
      customStartDate,
      customEndDate,
      monthlyChartMonths,
    })
  }, [
    effectiveInvoices,
    effectiveOrders,
    effectivePayments,
    effectiveExpenses,
    effectiveJobs,
    effectiveCustomers,
    effectiveMaterials,
    period,
    customStartDate,
    customEndDate,
    monthlyChartMonths,
  ])

  // Export Handlers
  const handleExport = (format: 'excel' | 'csv' | 'print') => {
    setShowExportMenu(false)
    if (format === 'print') {
      window.print()
      return
    }

    const filename = `PrintERP_Business_Report_${period}_${new Date().toISOString().slice(0, 10)}`
    const isExcel = format === 'excel'

    const headers = ['Category / Item', 'Volume / Count', 'Amount (BDT)', 'Details']
    const rows: (string | number)[][] = [
      ['Total Sales Turnover', `${reportData.summary.invoicesCount} Invoices`, reportData.summary.totalSales, 'Gross Billed'],
      ['Total Production Jobs', `${reportData.summary.totalJobs} Jobs`, reportData.summary.uniqueCustomersCount, 'Unique Customers'],
      ['Gross Profit', `${reportData.summary.grossProfitMarginPercent}% Margin`, reportData.summary.grossProfit, 'Operating Margin'],
      ['Total Expenses', `${reportData.summary.expenseTransactionsCount} Transactions`, reportData.summary.totalExpenses, 'OPEX Outflow'],
      ['Net Profit', '', reportData.summary.grossProfit - reportData.summary.totalExpenses, 'Net Bottomline'],
    ]

    exportToCsv(filename, headers, rows, isExcel)
  }

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 pb-16">
        <div className="h-16 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-72 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <FeatureGate feature="reports">
      <div className="space-y-5 max-w-[1600px] mx-auto p-3 sm:p-6 print:p-0 print:m-0 print:max-w-none text-slate-900 dark:text-slate-100 transition-colors">
        
        {/* =========================================================================
            PRINT-ONLY EXECUTIVE HEADER
           ========================================================================= */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {company?.name || 'Printing & Signage Solutions'}
              </h1>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                Executive Business Intelligence & Performance Report
              </p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <div className="font-bold text-slate-900">Period: {reportData.dateRangeDisplay}</div>
              <div>Generated: {new Date().toLocaleDateString('en-GB')}</div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            HEADER: TITLE + DATE CONTROLS + EXPORT
           ========================================================================= */}
        <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs">
          {/* Left Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
              <BarChart3 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Business Reports
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                Get a complete view of your business performance, sales, production, finance and profit.
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Branches Filter if Multiple Branches Exist */}
            {branches.length > 1 && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
              >
                <option value="all">All Outlets ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            {/* Date Range Display Pill */}
            <button
              onClick={() => setShowDatePickerModal(true)}
              className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{reportData.dateRangeDisplay}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {/* Period Dropdown */}
            <select
              value={period}
              onChange={(e) => {
                const val = e.target.value as ReportPeriodKey
                setPeriod(val)
                if (val === 'custom') {
                  setShowDatePickerModal(true)
                }
              }}
              className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="last_6_months">Last 6 Months</option>
              <option value="this_year">This Year</option>
              <option value="all_time">All Time</option>
              <option value="custom">Custom Range...</option>
            </select>

            {/* Export Button & Dropdown */}
            <div className="relative">
              <Button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
              </Button>

              {showExportMenu && (
                <div
                  className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800 text-xs"
                  onMouseLeave={() => setShowExportMenu(false)}
                >
                  <div className="p-1">
                    <button
                      onClick={() => handleExport('excel')}
                      className="w-full px-3 py-2 text-left rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 font-medium"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Excel CSV (.xlsx)
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      Standard CSV
                    </button>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => handleExport('print')}
                      className="w-full px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      Print / PDF Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROW 1: TOP 4 KPI CARDS
           ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Sales */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
              </div>
              {reportData.summary.salesTrendPercent !== null && (
                <span
                  className={`text-2xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                    reportData.summary.salesTrendPercent >= 0
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {reportData.summary.salesTrendPercent >= 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {Math.abs(reportData.summary.salesTrendPercent)}%
                </span>
              )}
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Sales
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight mt-0.5">
                {formatBDT(reportData.summary.totalSales)}
              </div>
              <div className="mt-1.5 text-2xs text-slate-400 font-medium">
                {reportData.summary.invoicesCount} Invoices
              </div>
            </div>
          </div>

          {/* 2. Total Jobs */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5 stroke-[2.2]" />
              </div>
              {reportData.summary.jobsTrendPercent !== null && (
                <span
                  className={`text-2xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                    reportData.summary.jobsTrendPercent >= 0
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {reportData.summary.jobsTrendPercent >= 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {Math.abs(reportData.summary.jobsTrendPercent)}%
                </span>
              )}
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Jobs
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight mt-0.5">
                {reportData.summary.totalJobs}
              </div>
              <div className="mt-1.5 text-2xs text-slate-400 font-medium">
                {reportData.summary.uniqueCustomersCount} Customers
              </div>
            </div>
          </div>

          {/* 3. Gross Profit */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 stroke-[2.2]" />
              </div>
              {reportData.summary.profitTrendPercent !== null && (
                <span
                  className={`text-2xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                    reportData.summary.profitTrendPercent >= 0
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {reportData.summary.profitTrendPercent >= 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {Math.abs(reportData.summary.profitTrendPercent)}%
                </span>
              )}
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Gross Profit
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight mt-0.5">
                {formatBDT(reportData.summary.grossProfit)}
              </div>
              <div className="mt-1.5 text-2xs text-slate-400 font-medium">
                {reportData.summary.grossProfitMarginPercent}% Margin
              </div>
            </div>
          </div>

          {/* 4. Total Expenses */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 stroke-[2.2]" />
              </div>
              {reportData.summary.expensesTrendPercent !== null && (
                <span
                  className={`text-2xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                    reportData.summary.expensesTrendPercent <= 0
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {reportData.summary.expensesTrendPercent <= 0 ? (
                    <ArrowDownRight className="w-3 h-3" />
                  ) : (
                    <ArrowUpRight className="w-3 h-3" />
                  )}
                  {Math.abs(reportData.summary.expensesTrendPercent)}%
                </span>
              )}
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Expenses
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight mt-0.5">
                {formatBDT(reportData.summary.totalExpenses)}
              </div>
              <div className="mt-1.5 text-2xs text-slate-400 font-medium">
                {reportData.summary.expenseTransactionsCount} Transactions
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROW 2: MIDDLE SECTION (3 CARDS)
            - Monthly Sales vs Profit
            - Sales by Product / Service
            - Sales by Customer Type
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card 1: Monthly Sales vs Profit Chart */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col">
            <MonthlySalesProfitChart
              data={reportData.monthlySalesVsProfit}
              monthsCount={monthlyChartMonths}
              onMonthsCountChange={setMonthlyChartMonths}
            />
          </div>

          {/* Card 2: Sales by Product / Service */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col">
            <DonutDistributionChart
              title="Sales by Product / Service"
              totalAmount={reportData.totalPeriodSales}
              items={reportData.salesByProduct.map((p: ProductSalesPoint) => ({
                id: p.id,
                label: p.name,
                amount: p.amount,
                sharePercent: p.sharePercent,
                color: p.color,
              }))}
              periodLabel={period === 'this_month' ? 'This Month' : period.replace('_', ' ')}
            />
          </div>

          {/* Card 3: Sales by Customer Type */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col">
            <DonutDistributionChart
              title="Sales by Customer Type"
              totalAmount={reportData.totalPeriodSales}
              items={reportData.salesByCustomerType.map((c: CustomerTypeSalesPoint) => ({
                id: c.type,
                label: c.type,
                amount: c.amount,
                sharePercent: c.sharePercent,
                color: c.color,
              }))}
              periodLabel={period === 'this_month' ? 'This Month' : period.replace('_', ' ')}
            />
          </div>
        </div>

        {/* =========================================================================
            ROW 3: LOWER SECTION (3 CARDS)
            - Top Selling Products / Services
            - Top Customers by Sales
            - Jobs by Status
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card 1: Top Selling Products */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Top Selling Products / Services
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {period === 'this_month' ? 'This Month' : period.replace('_', ' ')}
                </span>
                <button
                  onClick={() => setActiveQuickReport('all_products')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  View All
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              {reportData.topSellingProducts.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-xs text-slate-400">
                  No product sales records found
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-1 w-6">#</th>
                      <th className="py-2 px-2">Product / Service</th>
                      <th className="py-2 px-2 text-right">Quantity</th>
                      <th className="py-2 px-2 text-right">Sales Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/60 font-sans">
                    {reportData.topSellingProducts.slice(0, 5).map((item: TopSellingProductItem) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-1 font-mono text-slate-400">{item.rank}</td>
                        <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-600 dark:text-slate-400 text-2xs">
                          {item.quantityFormatted}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatBDT(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Card 2: Top Customers by Sales */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Top Customers by Sales
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {period === 'this_month' ? 'This Month' : period.replace('_', ' ')}
                </span>
                <button
                  onClick={() => setActiveQuickReport('all_customers')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  View All
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              {reportData.topCustomers.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-xs text-slate-400">
                  No customer sales records found
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-1 w-6">#</th>
                      <th className="py-2 px-2">Customer</th>
                      <th className="py-2 px-2 text-center">Invoices</th>
                      <th className="py-2 px-2 text-right">Sales Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/60 font-sans">
                    {reportData.topCustomers.slice(0, 5).map((item: TopCustomerSalesItem) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-1 font-mono text-slate-400">{item.rank}</td>
                        <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                          {item.customerName}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-400 text-2xs">
                          {item.invoicesCount}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatBDT(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Card 3: Jobs by Status */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Jobs by Status
              </h3>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {period === 'this_month' ? 'This Month' : period.replace('_', ' ')}
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-between space-y-3.5">
              {reportData.jobsByStatus.map((st: JobStatusMetric) => {
                let StatusIcon = CheckCircle2
                if (st.key === 'in_production') StatusIcon = Settings
                else if (st.key === 'designing') StatusIcon = Sparkles
                else if (st.key === 'pending') StatusIcon = Clock
                else if (st.key === 'on_hold') StatusIcon = PauseCircle

                return (
                  <div key={st.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          className="w-4 h-4 shrink-0"
                          style={{ color: st.color }}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {st.label}
                        </span>
                      </div>
                      <span className="font-mono text-2xs font-bold text-slate-600 dark:text-slate-400">
                        {st.count} ({st.percentage}%)
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(st.percentage, 100)}%`,
                          backgroundColor: st.color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROW 4: BOTTOM SECTION (3 CARDS)
            - Financial Summary
            - Monthly Overview
            - Quick Reports (8 Action Tiles)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card 1: Financial Summary */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Financial Summary
              </h3>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {period === 'this_month' ? 'This Month' : period.replace('_', ' ')}
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-2 px-2">Item</th>
                    <th className="py-2 px-2 text-right">Amount (৳)</th>
                    <th className="py-2 px-2 text-right">% of Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/60 font-sans">
                  {reportData.financialSummary.map((row: FinancialSummaryRow) => (
                    <tr
                      key={row.key}
                      className={
                        row.highlight === 'green'
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-bold'
                          : row.highlight === 'red'
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-bold'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-slate-800 dark:text-slate-200 font-medium'
                      }
                    >
                      <td className="py-2.5 px-2.5 rounded-l-lg">{row.item}</td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        {row.amount.toLocaleString('en-US')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono rounded-r-lg">
                        {row.percentOfSales}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Monthly Overview */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Monthly Overview
              </h3>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Last 6 Months
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[11px] font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-800 font-sans">
                  <tr>
                    <th className="py-2 px-1">Month</th>
                    <th className="py-2 px-1 text-right">Sales</th>
                    <th className="py-2 px-1 text-right">Cost</th>
                    <th className="py-2 px-1 text-right">Profit</th>
                    <th className="py-2 px-1 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/60">
                  {reportData.monthlyOverview.map((row: MonthlyOverviewRow) => (
                    <tr key={row.month} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-1 font-sans font-bold text-slate-900 dark:text-white truncate">
                        {row.month}
                      </td>
                      <td className="py-2 px-1 text-right text-slate-700 dark:text-slate-300">
                        {row.sales.toLocaleString('en-US')}
                      </td>
                      <td className="py-2 px-1 text-right text-slate-500">
                        {row.cost.toLocaleString('en-US')}
                      </td>
                      <td className="py-2 px-1 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {row.profit.toLocaleString('en-US')}
                      </td>
                      <td className="py-2 px-1 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {row.margin}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3: Quick Reports */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Quick Reports
            </h3>

            <div className="grid grid-cols-2 gap-2.5 flex-1">
              {/* 1. Sales Report */}
              <button
                onClick={() => setActiveQuickReport('sales')}
                className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 border border-emerald-100/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 text-xs font-bold transition-all text-left group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="truncate">Sales Report</span>
              </button>

              {/* 2. Production Report */}
              <button
                onClick={() => setActiveQuickReport('production')}
                className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/70 dark:hover:bg-blue-900/40 border border-blue-100/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 flex items-center gap-2.5 text-xs font-bold transition-all text-left group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Settings className="w-4 h-4" />
                </div>
                <span className="truncate">Production Report</span>
              </button>

              {/* 3. Inventory Report */}
              <button
                onClick={() => setActiveQuickReport('inventory')}
                className="p-3 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/30 hover:bg-cyan-100/70 dark:hover:bg-cyan-900/40 border border-cyan-100/80 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-300 flex items-center gap-2.5 text-xs font-bold transition-all text-left group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/60 text-cyan-600 dark:text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Package className="w-4 h-4" />
                </div>
                <span className="truncate">Inventory Report</span>
              </button>

              {/* 4. Financial Report */}
              <button
                onClick={() => setActiveQuickReport('financial')}
                className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 border border-indigo-100/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 flex items-center gap-2.5 text-xs font-bold transition-all text-left group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="truncate">Financial Report</span>
              </button>

              {/* 5. Customer Report */}
              <button
                onClick={() => setActiveQuickReport('customer')}
                className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 hover:bg-purple-100/70 dark:hover:bg-purple-900/40 border border-purple-100/80 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 flex items-center gap-2.5 text-xs font-bold transition-all text-left group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <span className="truncate">Customer Report</span>
              </button>

              {/* 6. Supplier Report */}
              <button
                onClick={() => setActiveQuickReport('supplier')}
                className="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 hover:bg-sky-100/70 dark:hover:bg-sky-900/40 border border-sky-100/80 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 flex items-center gap-2.5 text-xs font-bold transition-all text-left group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="truncate">Supplier Report</span>
              </button>

              {/* 7. Profitability Report */}
              <button
                onClick={() => setActiveQuickReport('profitability')}
                className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 border border-amber-100/80 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 flex items-center gap-2.5 text-xs font-bold transition-all text-left group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                  <PieChart className="w-4 h-4" />
                </div>
                <span className="truncate">Profitability Report</span>
              </button>

              {/* 8. Custom Report */}
              <button
                onClick={() => setActiveQuickReport('custom')}
                className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100/70 dark:hover:bg-rose-900/40 border border-rose-100/80 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 flex items-center gap-2.5 text-xs font-bold transition-all text-left group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 shrink-0 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span className="truncate">Custom Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CUSTOM DATE RANGE PICKER MODAL
           ========================================================================= */}
        {showDatePickerModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Select Date Range
                </h3>
                <button
                  onClick={() => setShowDatePickerModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-2xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-2xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDatePickerModal(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setPeriod('custom')
                    setShowDatePickerModal(false)
                  }}
                  disabled={!customStartDate || !customEndDate}
                  className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Apply Range
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            DRILL-DOWN QUICK REPORT & VIEW ALL MODAL
           ========================================================================= */}
        <QuickReportModal
          open={activeQuickReport !== null}
          onOpenChange={(open) => {
            if (!open) setActiveQuickReport(null)
          }}
          type={activeQuickReport}
          invoices={effectiveInvoices}
          orders={effectiveOrders}
          productionJobs={effectiveJobs}
          customers={effectiveCustomers}
          materials={effectiveMaterials}
          expenses={effectiveExpenses}
          companyName={company?.name}
        />
      </div>
    </FeatureGate>
  )
}
