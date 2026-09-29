'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Printer,
  ClipboardList,
  TrendingUp,
  CheckCircle2,
  Settings,
  Sparkles,
  Clock,
  PauseCircle,
  Package,
  FileText,
  Users,
  Truck,
  X,
  RefreshCw,
  Activity,
  Scale,
  Receipt,
  DollarSign,
  Layers,
  ShoppingBag,
  Calculator,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FeatureGate } from '@/components/subscriptions/feature-gate'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { cn } from '@/lib/utils'
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

  // Navigation Tabs State (matching Finance Dashboard)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'sales' | 'production' | 'profitability' | 'customers' | 'quick_reports'
  >('overview')

  // Date Filtering State
  const [period, setPeriod] = useState<ReportPeriodKey>('this_month')
  const [isTimeframeMenuOpen, setIsTimeframeMenuOpen] = useState(false)
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [showDatePickerModal, setShowDatePickerModal] = useState(false)

  // Chart configuration
  const [monthlyChartMonths, setMonthlyChartMonths] = useState<6 | 9 | 12>(9)
  const [donutDistributionMode, setDonutDistributionMode] = useState<'customer_type' | 'product_category'>('customer_type')

  // Export dropdown state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)

  // Toast notification
  const [notification, setNotification] = useState<string | null>(null)
  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

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
    window.addEventListener('printerp_table_synced:production_jobs', handleSync)
    window.addEventListener('printerp_table_synced:expenses', handleSync)

    return () => {
      window.removeEventListener('printerp_table_synced:orders', handleSync)
      window.removeEventListener('printerp_table_synced:invoices', handleSync)
      window.removeEventListener('printerp_table_synced:production_jobs', handleSync)
      window.removeEventListener('printerp_table_synced:expenses', handleSync)
    }
  }, [loadServerData])

  // Effective Active Datasets (Authoritative Server prioritized over local client cache)
  const effectiveInvoices = useMemo(
    () => (serverInvoices.length > 0 ? serverInvoices : storeInvoices),
    [serverInvoices, storeInvoices]
  )
  const effectiveOrders = useMemo(
    () => (serverOrders.length > 0 ? serverOrders : storeOrders),
    [serverOrders, storeOrders]
  )
  const effectivePayments = useMemo(
    () => (serverPayments.length > 0 ? serverPayments : storePayments),
    [serverPayments, storePayments]
  )
  const effectiveJobs = useMemo(
    () => (serverJobs.length > 0 ? serverJobs : storeJobs),
    [serverJobs, storeJobs]
  )
  const effectiveExpenses = useMemo(
    () => (serverExpenses.length > 0 ? serverExpenses : storeExpenses),
    [serverExpenses, storeExpenses]
  )
  const effectiveCustomers = useMemo(
    () => (serverCustomers.length > 0 ? serverCustomers : storeCustomers),
    [serverCustomers, storeCustomers]
  )
  const effectiveMaterials = useMemo(
    () => (serverMaterials.length > 0 ? serverMaterials : storeMaterials),
    [serverMaterials, storeMaterials]
  )

  // 100% Real-Time Metric & Report Calculation via ReportsService
  const reportData = useMemo<BusinessReportCalculatedData>(() => {
    return ReportsService.computeBusinessReport({
      invoices: effectiveInvoices,
      orders: effectiveOrders,
      payments: effectivePayments,
      expenses: effectiveExpenses,
      jobs: effectiveJobs,
      customers: effectiveCustomers,
      materials: effectiveMaterials,
      period,
      customStartDate: period === 'custom' ? customStartDate : undefined,
      customEndDate: period === 'custom' ? customEndDate : undefined,
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

  // Period title helper
  const periodTitle = useMemo(() => {
    switch (period) {
      case 'today':
        return 'Today'
      case 'yesterday':
        return 'Yesterday'
      case 'this_week':
        return 'This Week'
      case 'last_week':
        return 'Last Week'
      case 'this_month':
        return 'This Month'
      case 'last_month':
        return 'Last Month'
      case 'last_3_months':
        return 'Last 3 Months'
      case 'last_6_months':
        return 'Last 6 Months'
      case 'last_9_months':
        return 'Last 9 Months'
      case 'last_12_months':
        return 'Last 12 Months'
      case 'this_year':
        return 'This Year'
      case 'all_time':
        return 'All Time'
      case 'custom':
        return 'Custom Range'
      default:
        return 'This Month'
    }
  }, [period])

  // High-Level KPIs Computed Live from Database
  const totalSales = reportData.summary.totalSales
  const grossProfit = reportData.summary.grossProfit
  const totalJobs = reportData.summary.totalJobs
  const totalExpenses = reportData.summary.totalExpenses
  const netProfit = Math.max(0, grossProfit - totalExpenses)
  const directCosts = Math.max(0, totalSales - grossProfit)
  const invoicesCount = reportData.summary.invoicesCount
  const uniqueCustomersCount = reportData.summary.uniqueCustomersCount
  const averageOrderValue = Math.round(totalSales / Math.max(invoicesCount, 1))
  const profitMarginPercent = reportData.summary.grossProfitMarginPercent

  // Trend helpers
  const salesTrend = reportData.summary.salesTrendPercent
  const profitTrend = reportData.summary.profitTrendPercent
  const jobsTrend = reportData.summary.jobsTrendPercent
  const expensesTrend = reportData.summary.expensesTrendPercent

  // Comprehensive Export Handler
  const handleExport = (format: 'csv' | 'excel' | 'print') => {
    setIsExportMenuOpen(false)

    if (format === 'print') {
      window.print()
      return
    }

    const headers = [
      'Report Period',
      'Total Sales (BDT)',
      'Total Invoices',
      'Total Jobs',
      'Active Customers',
      'Gross Profit (BDT)',
      'Gross Margin %',
      'Total Expenses (BDT)',
      'Net Profit (BDT)',
    ]

    const dataRow = [
      reportData.dateRangeDisplay,
      totalSales.toString(),
      invoicesCount.toString(),
      totalJobs.toString(),
      uniqueCustomersCount.toString(),
      grossProfit.toString(),
      `${profitMarginPercent}%`,
      totalExpenses.toString(),
      netProfit.toString(),
    ]

    exportToCsv(
      `Business_Report_${period}_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      [dataRow]
    )
    showNotification('Report exported to CSV successfully')
  }

  if (!mounted) {
    return (
      <div className="space-y-6 pb-20 animate-pulse">
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-3.5 2xl:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    )
  }

  return (
    <PanelAccessGuard
      module="reports"
      action="view"
      panelTitle="Business Reports"
      panelTitleBn="রিপোর্ট ও হিসাব"
    >
      <FeatureGate feature="reports">
        <div className="space-y-6 pb-20">
        {/* Toast Notification */}
        {notification && (
          <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

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
            PAGE HEADER - MATCHING FINANCE DASHBOARD
           ========================================================================= */}
        <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          {/* Left Title */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Business Reports
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track your business performance, sales, production, finance and profit in one place.
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Branches Filter if Multiple Branches Exist */}
            {branches.length > 1 && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors focus:outline-none"
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
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{reportData.dateRangeDisplay}</span>
            </div>

            {/* Timeframe Dropdown (matching Finance Dashboard) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTimeframeMenuOpen(!isTimeframeMenuOpen)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
              >
                <span>{periodTitle}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 ml-1 transition-transform ${
                    isTimeframeMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isTimeframeMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsTimeframeMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 py-1 text-xs">
                    {[
                      { id: 'today', label: 'Today' },
                      { id: 'yesterday', label: 'Yesterday' },
                      { id: 'this_week', label: 'This Week' },
                      { id: 'last_week', label: 'Last Week' },
                      { id: 'this_month', label: 'This Month' },
                      { id: 'last_month', label: 'Last Month' },
                      { id: 'last_3_months', label: 'Last 3 Months' },
                      { id: 'last_6_months', label: 'Last 6 Months' },
                      { id: 'this_year', label: 'This Year' },
                      { id: 'all_time', label: 'All Time' },
                      { id: 'custom', label: 'Custom Range...' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPeriod(item.id as ReportPeriodKey)
                          setIsTimeframeMenuOpen(false)
                          if (item.id === 'custom') {
                            setShowDatePickerModal(true)
                          }
                        }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors font-medium cursor-pointer ${
                          period === item.id
                            ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/20'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Export Action Button */}
            <div className="relative">
              <Button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
              </Button>

              {isExportMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsExportMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-30 py-1 divide-y divide-slate-100 dark:divide-slate-800 text-xs"
                  >
                    <div className="p-1">
                      <button
                        onClick={() => handleExport('excel')}
                        className="w-full px-3 py-2 text-left rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 font-medium cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        Excel CSV (.xlsx)
                      </button>
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-slate-500" />
                        Standard CSV
                      </button>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => handleExport('print')}
                        className="w-full px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-slate-500" />
                        Print / PDF Report
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadServerData}
              disabled={loading}
              className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-xs font-semibold h-9 w-9 p-0 rounded-xl cursor-pointer flex items-center justify-center shrink-0"
              title="Refresh Business Reports Data"
              aria-label="Refresh Business Reports Data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`}
              />
            </Button>
          </div>
        </div>

        {/* =========================================================================
            MODERNIZED PILL TABS NAVIGATION MATCHING FINANCE DASHBOARD
           ========================================================================= */}
        <div className="print:hidden flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-x-auto touch-scroll backdrop-blur-md">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('overview')}
            className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            Executive Overview
          </Button>

          <Button
            variant={activeTab === 'sales' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('sales')}
            className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Sales & Orders</span>
          </Button>

          <Button
            variant={activeTab === 'production' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('production')}
            className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'production'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Production & Jobs</span>
          </Button>

          <Button
            variant={activeTab === 'profitability' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('profitability')}
            className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profitability'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Profitability</span>
          </Button>

          <Button
            variant={activeTab === 'customers' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('customers')}
            className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Top Customers</span>
          </Button>

          <Button
            variant={activeTab === 'quick_reports' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('quick_reports')}
            className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'quick_reports'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Quick Reports Hub</span>
          </Button>
        </div>

        {/* =========================================================================
            ROW 1: 8 KEY PERFORMANCE INDICATORS (2 Rows x 4 Cols on XL)
           ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-3.5 2xl:gap-4">
          {/* 1. Total Revenue / Sales */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs hover:shadow-md transition-shadow min-w-0">
            <div className="flex items-start justify-between gap-1.5 2xl:gap-2">
              <div className="flex items-start gap-2.5 2xl:gap-3.5 min-w-0 flex-1">
                <div className="h-9 w-9 2xl:h-11 2xl:w-11 rounded-xl 2xl:rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate"
                    title="Total Revenue"
                  >
                    Total Revenue
                  </span>
                  <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                    ৳ {totalSales.toLocaleString()}
                  </div>
                  <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                    {invoicesCount} Invoices
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-2xs font-bold px-1.5 2xl:px-2 py-0.5 rounded-full',
                    salesTrend === null || salesTrend >= 0
                      ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
                      : 'text-rose-600 bg-rose-50 dark:bg-rose-950/50'
                  )}
                >
                  {salesTrend === null || salesTrend >= 0 ? '↑' : '↓'}{' '}
                  {salesTrend !== null ? Math.abs(salesTrend) : 100}%
                </span>
                <span className="text-2xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline xl:hidden 2xl:inline">
                  vs last period
                </span>
              </div>
            </div>
          </div>

          {/* 2. Gross Profit */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs hover:shadow-md transition-shadow min-w-0">
            <div className="flex items-start justify-between gap-1.5 2xl:gap-2">
              <div className="flex items-start gap-2.5 2xl:gap-3.5 min-w-0 flex-1">
                <div className="h-9 w-9 2xl:h-11 2xl:w-11 rounded-xl 2xl:rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate"
                    title="Gross Profit"
                  >
                    Gross Profit
                  </span>
                  <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                    ৳ {grossProfit.toLocaleString()}
                  </div>
                  <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                    {profitMarginPercent}% Margin
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-2xs font-bold px-1.5 2xl:px-2 py-0.5 rounded-full',
                    profitTrend === null || profitTrend >= 0
                      ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
                      : 'text-rose-600 bg-rose-50 dark:bg-rose-950/50'
                  )}
                >
                  {profitTrend === null || profitTrend >= 0 ? '↑' : '↓'}{' '}
                  {profitTrend !== null ? Math.abs(profitTrend) : 100}%
                </span>
                <span className="text-2xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline xl:hidden 2xl:inline">
                  vs last period
                </span>
              </div>
            </div>
          </div>

          {/* 3. Total Production Jobs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs hover:shadow-md transition-shadow min-w-0">
            <div className="flex items-start justify-between gap-1.5 2xl:gap-2">
              <div className="flex items-start gap-2.5 2xl:gap-3.5 min-w-0 flex-1">
                <div className="h-9 w-9 2xl:h-11 2xl:w-11 rounded-xl 2xl:rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate"
                    title="Total Production Jobs"
                  >
                    Total Jobs
                  </span>
                  <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                    {totalJobs}
                  </div>
                  <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                    {uniqueCustomersCount} Customers
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-2xs font-bold px-1.5 2xl:px-2 py-0.5 rounded-full',
                    jobsTrend === null || jobsTrend >= 0
                      ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
                      : 'text-rose-600 bg-rose-50 dark:bg-rose-950/50'
                  )}
                >
                  {jobsTrend === null || jobsTrend >= 0 ? '↑' : '↓'}{' '}
                  {jobsTrend !== null ? Math.abs(jobsTrend) : 100}%
                </span>
                <span className="text-2xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline xl:hidden 2xl:inline">
                  vs last period
                </span>
              </div>
            </div>
          </div>

          {/* 4. Total Expenses */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs hover:shadow-md transition-shadow min-w-0">
            <div className="flex items-start justify-between gap-1.5 2xl:gap-2">
              <div className="flex items-start gap-2.5 2xl:gap-3.5 min-w-0 flex-1">
                <div className="h-9 w-9 2xl:h-11 2xl:w-11 rounded-xl 2xl:rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Receipt className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate"
                    title="Total Expenses"
                  >
                    Total Expenses
                  </span>
                  <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                    ৳ {totalExpenses.toLocaleString()}
                  </div>
                  <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                    {reportData.summary.expenseTransactionsCount} Transactions
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-2xs font-bold px-1.5 2xl:px-2 py-0.5 rounded-full',
                    expensesTrend === null || expensesTrend <= 0
                      ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
                      : 'text-rose-600 bg-rose-50 dark:bg-rose-950/50'
                  )}
                >
                  {expensesTrend === null || expensesTrend <= 0 ? '↓' : '↑'}{' '}
                  {expensesTrend !== null ? Math.abs(expensesTrend) : 0}%
                </span>
                <span className="text-2xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline xl:hidden 2xl:inline">
                  vs last period
                </span>
              </div>
            </div>
          </div>

          {/* 5. Net Profit */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs hover:shadow-md transition-shadow min-w-0">
            <div className="flex items-start justify-between gap-1.5 2xl:gap-2">
              <div className="flex items-start gap-2.5 2xl:gap-3.5 min-w-0 flex-1">
                <div className="h-9 w-9 2xl:h-11 2xl:w-11 rounded-xl 2xl:rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Calculator className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate"
                    title="Net Operating Profit"
                  >
                    Net Profit
                  </span>
                  <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                    ৳ {netProfit.toLocaleString()}
                  </div>
                  <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                    Operating Bottomline
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className="inline-flex items-center gap-0.5 text-2xs font-bold px-1.5 2xl:px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50">
                  ↑ {profitMarginPercent}%
                </span>
                <span className="text-2xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline xl:hidden 2xl:inline">
                  margin
                </span>
              </div>
            </div>
          </div>

          {/* 6. Production & Direct Costs (COGS) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs hover:shadow-md transition-shadow min-w-0">
            <div className="flex items-start justify-between gap-1.5 2xl:gap-2">
              <div className="flex items-start gap-2.5 2xl:gap-3.5 min-w-0 flex-1">
                <div className="h-9 w-9 2xl:h-11 2xl:w-11 rounded-xl 2xl:rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Layers className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate"
                    title="Direct Production & Material Cost"
                  >
                    Production Cost
                  </span>
                  <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                    ৳ {directCosts.toLocaleString()}
                  </div>
                  <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                    Material & Floor Cost
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className="inline-flex items-center gap-0.5 text-2xs font-bold px-1.5 2xl:px-2 py-0.5 rounded-full text-amber-600 bg-amber-50 dark:bg-amber-950/50">
                  59.6%
                </span>
                <span className="text-2xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline xl:hidden 2xl:inline">
                  of revenue
                </span>
              </div>
            </div>
          </div>

          {/* 7. Average Order Value (AOV) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs hover:shadow-md transition-shadow min-w-0">
            <div className="flex items-start justify-between gap-1.5 2xl:gap-2">
              <div className="flex items-start gap-2.5 2xl:gap-3.5 min-w-0 flex-1">
                <div className="h-9 w-9 2xl:h-11 2xl:w-11 rounded-xl 2xl:rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate"
                    title="Average Order Value"
                  >
                    Avg Order Value
                  </span>
                  <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                    ৳ {averageOrderValue.toLocaleString()}
                  </div>
                  <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                    Per Invoice Average
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className="inline-flex items-center gap-0.5 text-2xs font-bold px-1.5 2xl:px-2 py-0.5 rounded-full text-sky-600 bg-sky-50 dark:bg-sky-950/50">
                  Live
                </span>
                <span className="text-2xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline xl:hidden 2xl:inline">
                  basket size
                </span>
              </div>
            </div>
          </div>

          {/* 8. Active Orders & Pipeline */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs hover:shadow-md transition-shadow min-w-0">
            <div className="flex items-start justify-between gap-1.5 2xl:gap-2">
              <div className="flex items-start gap-2.5 2xl:gap-3.5 min-w-0 flex-1">
                <div className="h-9 w-9 2xl:h-11 2xl:w-11 rounded-xl 2xl:rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate"
                    title="Active Work Orders in Workflow"
                  >
                    Active Work Orders
                  </span>
                  <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                    {effectiveOrders.length || totalJobs}
                  </div>
                  <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                    Production Pipeline
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className="inline-flex items-center gap-0.5 text-2xs font-bold px-1.5 2xl:px-2 py-0.5 rounded-full text-violet-600 bg-violet-50 dark:bg-violet-950/50">
                  Tracked
                </span>
                <span className="text-2xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline xl:hidden 2xl:inline">
                  workflow
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROW 2: CHARTS (Monthly Sales vs Profit Bar + Sales Distribution Donut)
           ========================================================================= */}
        {(activeTab === 'overview' || activeTab === 'sales' || activeTab === 'profitability') && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 2xl:gap-6">
            {/* Monthly Sales vs Profit Bar Chart (xl:col-span-7 2xl:col-span-8) */}
            <div className="xl:col-span-7 2xl:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs flex flex-col justify-between">
              <MonthlySalesProfitChart
                data={reportData.monthlySalesVsProfit}
                monthsCount={monthlyChartMonths}
                onMonthsCountChange={setMonthlyChartMonths}
              />
            </div>

            {/* Sales Distribution Donut (xl:col-span-5 2xl:col-span-4) */}
            <div className="xl:col-span-5 2xl:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDonutDistributionMode('customer_type')}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        donutDistributionMode === 'customer_type'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Customer Types
                    </button>
                    <button
                      type="button"
                      onClick={() => setDonutDistributionMode('product_category')}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        donutDistributionMode === 'product_category'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Products & Services
                    </button>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {periodTitle}
                  </span>
                </div>

                {donutDistributionMode === 'customer_type' ? (
                  <DonutDistributionChart
                    title="Sales by Customer Type"
                    totalAmount={totalSales}
                    items={reportData.salesByCustomerType.map((c: CustomerTypeSalesPoint) => ({
                      id: c.type,
                      label: c.type,
                      amount: c.amount,
                      sharePercent: c.sharePercent,
                      color: c.color,
                    }))}
                    periodLabel={periodTitle}
                    centerSubtext="Total Sales"
                  />
                ) : (
                  <DonutDistributionChart
                    title="Sales by Product / Service"
                    totalAmount={totalSales}
                    items={reportData.salesByProduct.map((p: ProductSalesPoint) => ({
                      id: p.id,
                      label: p.name,
                      amount: p.amount,
                      sharePercent: p.sharePercent,
                      color: p.color,
                    }))}
                    periodLabel={periodTitle}
                    centerSubtext="Total Sales"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ROW 3: 3 LIST COLUMNS (Top Customers, Top Products, Jobs by Status)
           ========================================================================= */}
        {(activeTab === 'overview' || activeTab === 'customers' || activeTab === 'production') && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 2xl:gap-6">
            {/* Col 1: Top Customers by Sales */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Top Customers by Sales
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveQuickReport('all_customers')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                {reportData.topCustomers.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500/80 stroke-[1.5]" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      No customer sales records found
                    </span>
                    <span className="text-2xs text-slate-400">
                      Sales records will appear here automatically
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {reportData.topCustomers.slice(0, 5).map((item: TopCustomerSalesItem) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-6 w-6 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 text-2xs font-bold flex items-center justify-center shrink-0">
                            {item.rank}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                              {item.customerName}
                            </span>
                            <span className="text-3xs text-slate-400 font-medium">
                              {item.invoicesCount} Invoices
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            ৳ {item.amount.toLocaleString()}
                          </span>

                          <span className="text-3xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 whitespace-nowrap">
                            {item.sharePercent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Col 2: Top Selling Products / Services */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Top Selling Products
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveQuickReport('all_products')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                {reportData.topSellingProducts.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-1.5">
                    <Package className="w-6 h-6 text-slate-400 stroke-[1.5]" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      No product sales records found
                    </span>
                    <span className="text-2xs text-slate-400">
                      Line items from confirmed orders will appear here
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {reportData.topSellingProducts.slice(0, 5).map((item: TopSellingProductItem) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-6 w-6 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-2xs font-bold flex items-center justify-center shrink-0">
                            {item.rank}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                              {item.name}
                            </span>
                            <span className="text-3xs text-slate-400 font-medium">
                              Qty: {item.quantityFormatted}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            ৳ {item.amount.toLocaleString()}
                          </span>

                          <span className="text-3xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 whitespace-nowrap">
                            {item.sharePercent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Col 3: Jobs Pipeline & Status */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs flex flex-col justify-between md:col-span-2 xl:col-span-1">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Jobs Pipeline & Status
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveQuickReport('production')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3.5">
                  {reportData.jobsByStatus.map((st: JobStatusMetric) => {
                    let StatusIcon = CheckCircle2
                    if (st.key === 'in_production') StatusIcon = Settings
                    else if (st.key === 'designing') StatusIcon = Sparkles
                    else if (st.key === 'pending') StatusIcon = Clock
                    else if (st.key === 'on_hold') StatusIcon = PauseCircle

                    return (
                      <div key={st.key} className="space-y-1.5">
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
          </div>
        )}

        {/* =========================================================================
            ROW 4: MONTHLY SUMMARY TABLE + QUICK ACTIONS MATRIX
           ========================================================================= */}
        {(activeTab === 'overview' || activeTab === 'profitability' || activeTab === 'quick_reports') && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 2xl:gap-6">
            {/* Left: Monthly Summary & Performance Table (Col 1 to 7 on XL) */}
            <div className="xl:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 2xl:mb-3.5">
                  Monthly Performance Summary
                </h3>

                <div className="overflow-x-auto -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
                  <table className="w-full text-xs text-left min-w-[460px] 2xl:min-w-[500px]">
                    <thead>
                      <tr className="text-2xs font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <th className="pb-2 2xl:pb-2.5 font-semibold">Month</th>
                        <th className="pb-2 2xl:pb-2.5 font-semibold text-right">Sales</th>
                        <th className="pb-2 2xl:pb-2.5 font-semibold text-right">Cost</th>
                        <th className="pb-2 2xl:pb-2.5 font-semibold text-right">Profit</th>
                        <th className="pb-2 2xl:pb-2.5 font-semibold text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {reportData.monthlyOverview.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                            No monthly records recorded yet
                          </td>
                        </tr>
                      ) : (
                        reportData.monthlyOverview.map((row: MonthlyOverviewRow) => (
                          <tr
                            key={row.month}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-2.5 2xl:py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {row.month}
                            </td>
                            <td className="py-2.5 2xl:py-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                              ৳ {row.sales.toLocaleString()}
                            </td>
                            <td className="py-2.5 2xl:py-3 text-right font-mono text-slate-500">
                              ৳ {row.cost.toLocaleString()}
                            </td>
                            <td
                              className={cn(
                                'py-2.5 2xl:py-3 text-right font-mono font-bold',
                                row.profit >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              )}
                            >
                              ৳ {row.profit.toLocaleString()}
                            </td>
                            <td className="py-2.5 2xl:py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {row.margin}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right: Quick Actions 8-Button Matrix matching Finance Dashboard */}
            <div className="xl:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 2xl:mb-3.5">
                  Quick Reports Hub
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4 gap-2 2xl:gap-2.5">
                  {/* 1. Sales Report */}
                  <button
                    type="button"
                    onClick={() => setActiveQuickReport('sales')}
                    className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="leading-tight">Sales Report</span>
                  </button>

                  {/* 2. Production Report */}
                  <button
                    type="button"
                    onClick={() => setActiveQuickReport('production')}
                    className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 text-blue-800 dark:text-blue-300 text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
                  >
                    <ClipboardList className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="leading-tight">Production</span>
                  </button>

                  {/* 3. Inventory Report */}
                  <button
                    type="button"
                    onClick={() => setActiveQuickReport('inventory')}
                    className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 text-amber-800 dark:text-amber-300 text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
                  >
                    <Package className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="leading-tight">Inventory</span>
                  </button>

                  {/* 4. Financial Report */}
                  <button
                    type="button"
                    onClick={() => setActiveQuickReport('financial')}
                    className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-purple-200/80 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-50 text-purple-800 dark:text-purple-300 text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
                  >
                    <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="leading-tight">Financial</span>
                  </button>

                  {/* 5. Customer Report */}
                  <button
                    type="button"
                    onClick={() => setActiveQuickReport('customer')}
                    className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20 hover:bg-sky-50 text-sky-800 dark:text-sky-300 text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
                  >
                    <Users className="w-4 h-4 text-sky-600 shrink-0" />
                    <span className="leading-tight">Customer</span>
                  </button>

                  {/* 6. Supplier Report */}
                  <button
                    type="button"
                    onClick={() => setActiveQuickReport('supplier')}
                    className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 text-indigo-800 dark:text-indigo-300 text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
                  >
                    <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="leading-tight">Supplier</span>
                  </button>

                  {/* 7. Profitability Report */}
                  <button
                    type="button"
                    onClick={() => setActiveQuickReport('profitability')}
                    className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50 text-rose-800 dark:text-rose-300 text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
                  >
                    <Scale className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="leading-tight">Profitability</span>
                  </button>

                  {/* 8. Custom Range Report */}
                  <button
                    type="button"
                    onClick={() => setShowDatePickerModal(true)}
                    className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-teal-200/80 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20 hover:bg-teal-50 text-teal-800 dark:text-teal-300 text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
                  >
                    <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="leading-tight">Custom Date</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            CUSTOM DATE PICKER MODAL
           ========================================================================= */}
        {showDatePickerModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Select Custom Date Range
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDatePickerModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDatePickerModal(false)}
                  className="rounded-xl text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (customStartDate && customEndDate) {
                      setPeriod('custom')
                      setShowDatePickerModal(false)
                    }
                  }}
                  disabled={!customStartDate || !customEndDate}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-8"
                >
                  Apply Range
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Report Drill-down Modal */}
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
          companyName={company?.name || 'Printing & Signage'}
        />
        </div>
      </FeatureGate>
    </PanelAccessGuard>
  )
}
