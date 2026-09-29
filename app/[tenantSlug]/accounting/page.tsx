'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
  Wallet,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  Building,
  CreditCard,
  FileCheck2,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  PieChart,
  HelpCircle,
  BookOpen,
  Scale,
  Activity,
  Calculator,
  RotateCcw,
  ShoppingBag,
  RefreshCw,
  Landmark,
  Receipt,
  Users,
  Download,
  ArrowLeftRight,
  Calendar,
  ChevronDown,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import type { CustomerRecord, SupplierRecord } from '@/types/crm.types'
import type {
  AccountRecord,
  FinancialTransactionRecord,
  FinancialDashboardMetrics,
  ProfitAndLossStatement,
  BalanceSheetStatement,
  CashFlowStatement,
  TrialBalanceStatement,
  GeneralLedgerEntry,
  ReceivablesAgingSummary,
  PayablesAgingSummary,
  JobProfitabilityMetric,
  CashClosingRecord,
} from '@/types/finance.types'

import { FinanceDashboardView } from '@/components/finance/finance-dashboard-view'
import { FinanceQuickActions } from '@/components/finance/finance-quick-actions'
import { SpendMoneyModal } from '@/components/finance/modals/spend-money-modal'
import { TransferMoneyModal } from '@/components/finance/modals/transfer-money-modal'
import { PaySupplierModal } from '@/components/finance/modals/pay-supplier-modal'
import { CustomerRefundModal } from '@/components/finance/modals/customer-refund-modal'
import { CashClosingModal } from '@/components/finance/modals/cash-closing-modal'
import { RecordAdjustmentModal } from '@/components/finance/modals/record-adjustment-modal'
import { NextActionModal, type NextActionConfig } from '@/components/shared/next-action-modal'
import { BalanceSheetView } from '@/components/finance/statements/balance-sheet-view'
import { CashFlowView } from '@/components/finance/statements/cash-flow-view'
import { TrialBalanceView } from '@/components/finance/statements/trial-balance-view'
import { GeneralLedgerView } from '@/components/finance/statements/general-ledger-view'
import { JobProfitabilityView } from '@/components/finance/statements/job-profitability-view'
import { ExpensesView } from '@/components/finance/statements/expenses-view'
import type { ExpenseSummaryReport } from '@/types/finance.types'

import {
  getAccountsAction,
  getFinancialDashboardAction,
  getProfitAndLossAction,
  getBalanceSheetAction,
  getCashFlowAction,
  getTrialBalanceAction,
  getGeneralLedgerAction,
  getReceivablesAgingAction,
  getPayablesAgingAction,
  getJobProfitabilityAction,
  getExpensesAction,
  recordExpenseAction,
  recordTransferAction,
  recordSupplierPaymentAction,
  recordCustomerRefundAction,
  recordFinancialAdjustmentAction,
  submitCashClosingAction,
} from '@/actions/finance.actions'

export default function AccountingPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Data State
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [dashboardMetrics, setDashboardMetrics] = useState<FinancialDashboardMetrics | null>(null)
  const [pnl, setPnl] = useState<ProfitAndLossStatement | null>(null)
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetStatement | null>(null)
  const [cashFlow, setCashFlow] = useState<CashFlowStatement | null>(null)
  const [trialBalance, setTrialBalance] = useState<TrialBalanceStatement | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<GeneralLedgerEntry[]>([])
  const [receivables, setReceivables] = useState<ReceivablesAgingSummary | null>(null)
  const [payables, setPayables] = useState<PayablesAgingSummary | null>(null)
  const [jobProfitability, setJobProfitability] = useState<JobProfitabilityMetric[]>([])
  const [expensesReport, setExpensesReport] = useState<ExpenseSummaryReport | null>(null)
  const [customers] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [suppliers] = useDataStore<SupplierRecord[]>(STORAGE_KEYS.SUPPLIERS, [])
  const [cashClosings] = useDataStore<CashClosingRecord[]>(STORAGE_KEYS.CASH_CLOSINGS, [])

  // UI State
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<string>('')
  const [receivablesSearch, setReceivablesSearch] = useState<string>('')
  const [payablesSearch, setPayablesSearch] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [notification, setNotification] = useState<string | null>(null)

  // Timeframe state
  const [timeframe, setTimeframe] = useState<'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all_time'>('this_month')
  const [isTimeframeMenuOpen, setIsTimeframeMenuOpen] = useState(false)

  const getDateRangeForTimeframe = (tf: string) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-indexed
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    if (tf === 'last_month') {
      const prevMonthDate = new Date(year, month - 1, 1)
      const prevYear = prevMonthDate.getFullYear()
      const prevMonth = prevMonthDate.getMonth()
      const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate()
      const startStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`
      const endStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      const label = `01 ${monthNames[prevMonth]} ${prevYear} - ${lastDay} ${monthNames[prevMonth]} ${prevYear}`
      return { startDate: startStr, endDate: endStr, label, title: 'Last Month' }
    }

    if (tf === 'this_quarter') {
      const qStartMonth = Math.floor(month / 3) * 3
      const qEndMonth = qStartMonth + 2
      const lastDay = new Date(year, qEndMonth + 1, 0).getDate()
      const startStr = `${year}-${String(qStartMonth + 1).padStart(2, '0')}-01`
      const endStr = `${year}-${String(qEndMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      const label = `01 ${monthNames[qStartMonth]} ${year} - ${lastDay} ${monthNames[qEndMonth]} ${year}`
      return { startDate: startStr, endDate: endStr, label, title: 'This Quarter' }
    }

    if (tf === 'this_year') {
      const startStr = `${year}-01-01`
      const endStr = `${year}-12-31`
      const label = `01 Jan ${year} - 31 Dec ${year}`
      return { startDate: startStr, endDate: endStr, label, title: 'This Year' }
    }

    if (tf === 'all_time') {
      const label = `All History`
      return { startDate: '2020-01-01', endDate: `${year}-12-31`, label, title: 'All Time' }
    }

    // default: 'this_month'
    const lastDay = new Date(year, month + 1, 0).getDate()
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const label = `01 ${monthNames[month]} ${year} - ${lastDay} ${monthNames[month]} ${year}`
    return { startDate: startStr, endDate: endStr, label, title: 'This Month' }
  }

  const activeRange = getDateRangeForTimeframe(timeframe)

  // Modals
  const [isSpendModalOpen, setIsSpendModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isPaySupplierModalOpen, setIsPaySupplierModalOpen] = useState(false)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  const [isCashClosingModalOpen, setIsCashClosingModalOpen] = useState(false)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false)

  // Next Action Modal State
  const [nextActionConfig, setNextActionConfig] = useState<NextActionConfig | null>(null)
  const [isNextActionOpen, setIsNextActionOpen] = useState(false)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const loadAllData = async (customStart?: string, customEnd?: string) => {
    try {
      setIsLoading(true)
      const curStart = customStart !== undefined ? customStart : activeRange.startDate
      const curEnd = customEnd !== undefined ? customEnd : activeRange.endDate

      const [accRes, dashRes, pnlRes, bsRes, cfRes, tbRes, glRes, arRes, apRes, jpRes, expRes] = await Promise.all([
        getAccountsAction().catch(() => ({ success: false, data: [] })),
        getFinancialDashboardAction({ startDate: curStart, endDate: curEnd }).catch(() => ({ success: false, data: null })),
        getProfitAndLossAction(curStart, curEnd).catch(() => ({ success: false, data: null })),
        getBalanceSheetAction().catch(() => ({ success: false, data: null })),
        getCashFlowAction(curStart, curEnd).catch(() => ({ success: false, data: null })),
        getTrialBalanceAction().catch(() => ({ success: false, data: null })),
        getGeneralLedgerAction({ accountId: selectedLedgerAccountId || undefined, startDate: curStart, endDate: curEnd }).catch(() => ({ success: false, data: [] })),
        getReceivablesAgingAction().catch(() => ({ success: false, data: null })),
        getPayablesAgingAction().catch(() => ({ success: false, data: null })),
        getJobProfitabilityAction().catch(() => ({ success: false, data: [] })),
        getExpensesAction({ startDate: curStart, endDate: curEnd }).catch(() => ({ success: false, data: null })),
      ])

      if (accRes && accRes.success && Array.isArray(accRes.data)) setAccounts(accRes.data)
      if (dashRes && dashRes.success && dashRes.data) setDashboardMetrics(dashRes.data)
      if (pnlRes && pnlRes.success && pnlRes.data) setPnl(pnlRes.data)
      if (bsRes && bsRes.success && bsRes.data) setBalanceSheet(bsRes.data)
      if (cfRes && cfRes.success && cfRes.data) setCashFlow(cfRes.data)
      if (tbRes && tbRes.success && tbRes.data) setTrialBalance(tbRes.data)
      if (glRes && glRes.success && Array.isArray(glRes.data)) setLedgerEntries(glRes.data)
      if (arRes && arRes.success && arRes.data) setReceivables(arRes.data)
      if (apRes && apRes.success && apRes.data) setPayables(apRes.data)
      if (jpRes && jpRes.success && Array.isArray(jpRes.data)) setJobProfitability(jpRes.data)
      if (expRes && expRes.success && expRes.data) setExpensesReport(expRes.data)
    } catch (err: any) {
      console.warn('Failed to load finance data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const range = getDateRangeForTimeframe(timeframe)
    loadAllData(range.startDate, range.endDate)

    const handleRealtimeSync = () => {
      const r = getDateRangeForTimeframe(timeframe)
      loadAllData(r.startDate, r.endDate)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('printerp_table_synced:payments', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:invoices', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:expenses', handleRealtimeSync)
      window.addEventListener('printerp_table_synced', handleRealtimeSync)
      window.addEventListener('printerp_data_sync', handleRealtimeSync)
      window.addEventListener('storage', handleRealtimeSync)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('printerp_table_synced:payments', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:invoices', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:expenses', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced', handleRealtimeSync)
        window.removeEventListener('printerp_data_sync', handleRealtimeSync)
        window.removeEventListener('storage', handleRealtimeSync)
      }
    }
  }, [timeframe, selectedLedgerAccountId])

  // Handlers for Modals
  const handleSpendMoney = async (data: any) => {
    const res = await recordExpenseAction(data)
    if (res.success) {
      showNotification(tBilingual('Expense recorded successfully', 'খরচ সফলভাবে এন্ট্রি হয়েছে'))
      await loadAllData()
      setNextActionConfig({
        titleEn: 'Expense Recorded ✓',
        titleBn: 'খরচ রেকর্ড সম্পন্ন হয়েছে ✓',
        descriptionEn: `Voucher recorded for BDT ${data.amount.toLocaleString()} (${data.category})`,
        descriptionBn: `৳${data.amount.toLocaleString()} টাকার ভাউচার সংরক্ষিত হয়েছে (${data.category})`,
        primaryAction: {
          labelEn: 'View Cash Flow',
          labelBn: 'ক্যাশ ফ্লো দেখুন',
          onClick: () => {
            setIsNextActionOpen(false)
            setActiveTab('cash_flow')
          },
        },
        secondaryActions: [
          {
            labelEn: 'Back to Dashboard',
            labelBn: 'ড্যাশবোর্ডে ফিরুন',
            onClick: () => {
              setIsNextActionOpen(false)
              setActiveTab('overview')
            },
          },
        ],
      })
      setIsNextActionOpen(true)
    } else {
      throw new Error(res.error)
    }
  }

  const handleTransferMoney = async (data: any) => {
    const res = await recordTransferAction(data)
    if (res.success) {
      showNotification(tBilingual('Transfer completed successfully', 'টাকা ট্রান্সফার সফলভাবে সম্পন্ন হয়েছে'))
      await loadAllData()
      setNextActionConfig({
        titleEn: 'Funds Transferred ✓',
        titleBn: 'তহবিল ট্রান্সফার সম্পন্ন হয়েছে ✓',
        descriptionEn: `BDT ${data.amount.toLocaleString()} transferred successfully.`,
        descriptionBn: `৳${data.amount.toLocaleString()} সফলভাবে ট্রান্সফার করা হয়েছে।`,
        primaryAction: {
          labelEn: 'View General Ledger',
          labelBn: 'খতিয়ান দেখুন',
          onClick: () => {
            setIsNextActionOpen(false)
            setActiveTab('ledger')
          },
        },
        secondaryActions: [
          {
            labelEn: 'Done',
            labelBn: 'সম্পন্ন',
            onClick: () => {
              setIsNextActionOpen(false)
            },
          },
        ],
      })
      setIsNextActionOpen(true)
    } else {
      throw new Error(res.error)
    }
  }

  const handlePaySupplier = async (data: any) => {
    const res = await recordSupplierPaymentAction(data)
    if (res.success) {
      showNotification(tBilingual('Supplier payment recorded successfully', 'সরবরাহকারীর পেমেন্ট সফলভাবে সম্পন্ন হয়েছে'))
      await loadAllData()
      setNextActionConfig({
        titleEn: 'Supplier Bill Paid ✓',
        titleBn: 'সরবরাহকারীর পাওনা পরিশোধিত ✓',
        descriptionEn: `Paid BDT ${data.amount.toLocaleString()} to ${data.supplierName}.`,
        descriptionBn: `${data.supplierName} কে ৳${data.amount.toLocaleString()} পরিশোধ করা হয়েছে।`,
        primaryAction: {
          labelEn: 'View Payables Aging',
          labelBn: 'বাকি তালিকা দেখুন',
          onClick: () => {
            setIsNextActionOpen(false)
            setActiveTab('payables')
          },
        },
      })
      setIsNextActionOpen(true)
    } else {
      throw new Error(res.error)
    }
  }

  const handleCustomerRefund = async (data: any) => {
    const res = await recordCustomerRefundAction(data)
    if (res.success) {
      showNotification(tBilingual('Refund recorded successfully', 'রিফান্ড সফলভাবে সম্পন্ন হয়েছে'))
      await loadAllData()
    } else {
      throw new Error(res.error)
    }
  }

  const handleCashClosing = async (data: any) => {
    const res = await submitCashClosingAction(data)
    if (res.success) {
      showNotification(tBilingual('Daily Cash Closing submitted successfully', 'ক্যাশ ড্রয়ার ক্লোজিং সম্পন্ন হয়েছে'))
      await loadAllData()
    } else {
      throw new Error(res.error)
    }
  }

  const handleRecordAdjustment = async (data: any) => {
    const res = await recordFinancialAdjustmentAction(data)
    if (res.success) {
      showNotification(tBilingual('Journal adjustment posted successfully', 'জার্নাল অ্যাডজাস্টমেন্ট পোস্ট হয়েছে'))
      await loadAllData()
    } else {
      throw new Error(res.error)
    }
  }

  const handleExportStatement = () => {
    try {
      const rows = [
        ['InkFlow ERP - Financial Statement & Dashboard Export'],
        ['Company', company?.name || 'PrintERP Tenant'],
        ['Timeframe', `${activeRange.title} (${activeRange.label})`],
        ['Exported At', new Date().toLocaleString()],
        [],
        ['Metric / Account', 'Category', 'Amount (BDT)'],
        ['Total Revenue', 'Income Statement', String(dashboardMetrics?.monthly_revenue || 0)],
        ['Total Payments Received', 'Cash Flow', String(dashboardMetrics?.total_payments_received || 0)],
        ['Total Due (Receivables)', 'Current Asset', String(dashboardMetrics?.total_receivables || 0)],
        ['Total Expenses', 'Income Statement', String(dashboardMetrics?.monthly_expenses || 0)],
        ['Net Profit', 'Income Statement', String(dashboardMetrics?.monthly_net_profit || 0)],
        ['Cash in Drawer', 'Liquid Asset', String(dashboardMetrics?.total_cash_balance || 0)],
        ['Bank Balances', 'Liquid Asset', String(dashboardMetrics?.total_bank_balance || 0)],
        ['MFS Balances', 'Liquid Asset', String(dashboardMetrics?.total_mfs_balance || 0)],
        ['Total Payables', 'Current Liability', String(dashboardMetrics?.total_payables || 0)],
        [],
        ['Payment Breakdown', 'Amount (BDT)', 'Percentage'],
        ['Cash', String(dashboardMetrics?.payment_breakdown?.cash || 0), `${dashboardMetrics?.payment_breakdown?.cash_pct || 0}%`],
        ['Bank Transfer', String(dashboardMetrics?.payment_breakdown?.bank || 0), `${dashboardMetrics?.payment_breakdown?.bank_pct || 0}%`],
        ['bKash', String(dashboardMetrics?.payment_breakdown?.bkash || 0), `${dashboardMetrics?.payment_breakdown?.bkash_pct || 0}%`],
        ['Nagad', String(dashboardMetrics?.payment_breakdown?.nagad || 0), `${dashboardMetrics?.payment_breakdown?.nagad_pct || 0}%`],
        ['Card / SSL', String(dashboardMetrics?.payment_breakdown?.card || 0), `${dashboardMetrics?.payment_breakdown?.card_pct || 0}%`],
      ]

      if (dashboardMetrics?.top_receivables && dashboardMetrics.top_receivables.length > 0) {
        rows.push([])
        rows.push(['Top Customer Receivables', 'Phone', 'Due Amount (BDT)', 'Status'])
        for (const item of dashboardMetrics.top_receivables) {
          rows.push([item.name, item.phone || '-', String(item.amount), item.status])
        }
      }

      if (dashboardMetrics?.top_payables && dashboardMetrics.top_payables.length > 0) {
        rows.push([])
        rows.push(['Top Supplier Payables', 'Phone', 'Due Amount (BDT)', 'Status'])
        for (const item of dashboardMetrics.top_payables) {
          rows.push([item.name, item.phone || '-', String(item.amount), item.status])
        }
      }

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute(
        'download',
        `financial_statement_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showNotification(tBilingual('Financial statement exported to CSV', 'আর্থিক বিবরণী সিএসভি ডাউনলোড সম্পন্ন'))
    } catch {
      showNotification('Export failed')
    }
  }

  if (!mounted) {
    return (
      <div className="space-y-6 pb-20 animate-pulse">
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    )
  }

  return (
    <PanelAccessGuard
      module="payments"
      action="view"
      panelTitle="Finance & Accounts"
      panelTitleBn="হিসাব ও ক্যাশবুক"
    >
      <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header - Matching Reference Image */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Finance Dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track your cash flow, receivables, payables, expenses and profit in one place.
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Picker Display */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{activeRange.label}</span>
          </div>

          {/* Timeframe Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTimeframeMenuOpen(!isTimeframeMenuOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
            >
              <span>{activeRange.title}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-1 transition-transform ${isTimeframeMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isTimeframeMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsTimeframeMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 py-1 text-xs">
                  {[
                    { id: 'this_month', label: 'This Month' },
                    { id: 'last_month', label: 'Last Month' },
                    { id: 'this_quarter', label: 'This Quarter' },
                    { id: 'this_year', label: 'This Year' },
                    { id: 'all_time', label: 'All Time' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTimeframe(item.id as any)
                        setIsTimeframeMenuOpen(false)
                      }}
                      className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors font-medium ${
                        timeframe === item.id
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
          <Button
            onClick={handleExportStatement}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const r = getDateRangeForTimeframe(timeframe)
              loadAllData(r.startDate, r.endDate)
            }}
            disabled={isLoading}
            className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-xs font-semibold h-9 w-9 p-0 rounded-xl cursor-pointer flex items-center justify-center shrink-0"
            title="Refresh Finance Data"
            aria-label="Refresh Finance Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          </Button>
        </div>
      </div>

      {/* Modernized Pill Tabs Navigation to switch between Dashboard and Statements */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-x-auto touch-scroll backdrop-blur-md">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('overview')}
          className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5 mr-1.5" />
          {tBilingual('Finance Dashboard', 'ফাইন্যান্স ড্যাশবোর্ড')}
        </Button>

        <Button
          variant={activeTab === 'expenses' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('expenses')}
          className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'expenses'
              ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-xs'
              : 'text-rose-700 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>{tBilingual('Expenses & Salary', 'খরচ ও স্টাফ বেতন')}</span>
        </Button>

        <Button
          variant={activeTab === 'receivables' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('receivables')}
          className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all ${
            activeTab === 'receivables'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 mr-1.5" />
          {tBilingual('Customer Due', 'গ্রাহকের বাকি')}
        </Button>

        <Button
          variant={activeTab === 'payables' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('payables')}
          className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all ${
            activeTab === 'payables'
              ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
          {tBilingual('Supplier Due', 'পাওনাদার')}
        </Button>

        <Button
          variant={activeTab === 'closings' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('closings')}
          className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all ${
            activeTab === 'closings'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 mr-1.5" />
          {tBilingual('Cash Closings', 'ক্যাশ হিস্ট্রি')}
        </Button>

        <Button
          variant={activeTab === 'ledger' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('ledger')}
          className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all ${
            activeTab === 'ledger'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 mr-1.5" />
          {tBilingual('General Ledger', 'খতিয়ান')}
        </Button>

        <Button
          variant={activeTab === 'pnl' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('pnl')}
          className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all ${
            activeTab === 'pnl'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <PieChart className="w-3.5 h-3.5 mr-1.5" />
          {tBilingual('P&L Statement', 'লাভ-ক্ষতি')}
        </Button>

        <Button
          variant={activeTab === 'balance_sheet' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('balance_sheet')}
          className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all ${
            activeTab === 'balance_sheet'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Scale className="w-3.5 h-3.5 mr-1.5" />
          {tBilingual('Balance Sheet', 'ব্যালেন্স শিট')}
        </Button>

        <Button
          variant={activeTab === 'cash_flow' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('cash_flow')}
          className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all ${
            activeTab === 'cash_flow'
              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
          {tBilingual('Cash Flow', 'ক্যাশ ফ্লো')}
        </Button>

        <Button
          variant={activeTab === 'trial_balance' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('trial_balance')}
          className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all ${
            activeTab === 'trial_balance'
              ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5 mr-1.5" />
          {tBilingual('Trial Balance', 'রেওয়ামিল')}
        </Button>

        <Button
          variant={activeTab === 'job_profitability' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('job_profitability')}
          className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all ${
            activeTab === 'job_profitability'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 mr-1.5" />
          {tBilingual('Job Profitability', 'কস্টিং লাভ')}
        </Button>

        <Button
          variant={activeTab === 'accounts' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('accounts')}
          className={`rounded-xl text-xs px-3.5 h-8.5 shrink-0 font-bold transition-all ${
            activeTab === 'accounts'
              ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Landmark className="w-3.5 h-3.5 mr-1.5" />
          {tBilingual('Chart of Accounts', 'হিসাব তালিকা')}
        </Button>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'overview' && (
        <FinanceDashboardView
          metrics={dashboardMetrics}
          pnl={pnl}
          receivables={receivables}
          payables={payables}
          expensesReport={expensesReport}
          accounts={accounts}
          onOpenSpendModal={() => setIsSpendModalOpen(true)}
          onOpenTransferModal={() => setIsTransferModalOpen(true)}
          onOpenPaySupplierModal={() => setIsPaySupplierModalOpen(true)}
          onOpenCashClosingModal={() => setIsCashClosingModalOpen(true)}
          onOpenPaymentModal={() => router.push(getTenantNavHref('/billing', pathname, slug))}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onExport={handleExportStatement}
        />
      )}

      {activeTab === 'receivables' && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {tBilingual('Accounts Receivable & Aging', 'বাকি আদায় তালিকা')}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={tBilingual('Search customer or inv...', 'গ্রাহক বা ইনভয়েস খুঁজুন...')}
                value={receivablesSearch}
                onChange={(e) => setReceivablesSearch(e.target.value)}
                className="h-8 pl-8 text-xs rounded-xl"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">{tBilingual('Invoice #', 'ইনভয়েস নং')}</th>
                    <th className="p-3">{tBilingual('Customer', 'গ্রাহকের নাম')}</th>
                    <th className="p-3">{tBilingual('Due Date', 'পরিশোধের শেষ তারিখ')}</th>
                    <th className="p-3 text-right">{tBilingual('Total', 'মোট বিল')}</th>
                    <th className="p-3 text-right">{tBilingual('Paid', 'পরিশোধ')}</th>
                    <th className="p-3 text-right">{tBilingual('Due', 'বাকি')}</th>
                    <th className="p-3 text-center">{tBilingual('Aging Bucket', 'মেয়াদ')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {(receivables?.items || [])
                    .filter(
                      (i) =>
                        !receivablesSearch ||
                        i.party_name.toLowerCase().includes(receivablesSearch.toLowerCase()) ||
                        i.reference_id.toLowerCase().includes(receivablesSearch.toLowerCase())
                    )
                    .map((i) => (
                      <tr key={i.reference_id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-medium text-blue-600">{i.reference_id}</td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{i.party_name}</td>
                        <td className="p-3 text-slate-500">{i.due_date}</td>
                        <td className="p-3 text-right font-mono">৳{i.total_amount.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-emerald-600">৳{i.paid_amount.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-amber-600">৳{i.due_amount.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-2xs font-medium">
                            {i.bucket === '0_30' ? '1–30 Days' : i.bucket === '31_60' ? '31–60 Days' : '60+ Days'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  {(receivables?.items || []).filter(
                    (i) =>
                      !receivablesSearch ||
                      i.party_name.toLowerCase().includes(receivablesSearch.toLowerCase()) ||
                      i.reference_id.toLowerCase().includes(receivablesSearch.toLowerCase())
                  ).length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        {tBilingual('No receivable records found', 'কোনো বকেয়া বিল পাওয়া যায়নি')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'payables' && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {tBilingual('Supplier Payables & Aging', 'সরবরাহকারী পাওনা')}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={tBilingual('Search supplier or code...', 'মহাজন বা কোড খুঁজুন...')}
                value={payablesSearch}
                onChange={(e) => setPayablesSearch(e.target.value)}
                className="h-8 pl-8 text-xs rounded-xl"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">{tBilingual('Supplier Code', 'কোড')}</th>
                    <th className="p-3">{tBilingual('Supplier Name', 'সরবরাহকারী')}</th>
                    <th className="p-3 text-right">{tBilingual('Purchases', 'মোট ক্রয়')}</th>
                    <th className="p-3 text-right">{tBilingual('Paid', 'পরিশোধ')}</th>
                    <th className="p-3 text-right">{tBilingual('Net Due', 'নিট পাওনা')}</th>
                    <th className="p-3 text-center">{tBilingual('Action', 'অ্যাকশন')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {(payables?.items || [])
                    .filter(
                      (i) =>
                        !payablesSearch ||
                        i.party_name.toLowerCase().includes(payablesSearch.toLowerCase()) ||
                        i.reference_id.toLowerCase().includes(payablesSearch.toLowerCase())
                    )
                    .map((i) => (
                      <tr key={i.reference_id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono text-slate-500">{i.reference_id}</td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{i.party_name}</td>
                        <td className="p-3 text-right font-mono">৳{i.total_amount.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-emerald-600">৳{i.paid_amount.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600">৳{i.due_amount.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                            onClick={() => setIsPaySupplierModalOpen(true)}
                          >
                            {tBilingual('Pay Supplier', 'পরিশোধ')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  {(payables?.items || []).filter(
                    (i) =>
                      !payablesSearch ||
                      i.party_name.toLowerCase().includes(payablesSearch.toLowerCase()) ||
                      i.reference_id.toLowerCase().includes(payablesSearch.toLowerCase())
                  ).length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                        {tBilingual('No payable records found', 'কোনো মহাজন পাওনা পাওয়া যায়নি')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'closings' && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {tBilingual('Daily Cash Closings & Drawer Audits', 'দৈনিক ক্যাশ ক্লোজিং ইতিহাস')}
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setIsCashClosingModalOpen(true)}
              className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>{tBilingual('New Cash Closing', '+ নতুন ক্লোজিং')}</span>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">{tBilingual('Closing #', 'ক্লোজিং নং')}</th>
                    <th className="p-3">{tBilingual('Date', 'তারিখ')}</th>
                    <th className="p-3">{tBilingual('Drawer / Account', 'হিসাব')}</th>
                    <th className="p-3 text-right">{tBilingual('Expected', 'হিসাবমতো')}</th>
                    <th className="p-3 text-right">{tBilingual('Counted', 'গোনা টাকা')}</th>
                    <th className="p-3 text-right">{tBilingual('Variance', 'অমিল')}</th>
                    <th className="p-3">{tBilingual('Closed By', 'ক্লোজ করেছেন')}</th>
                    <th className="p-3 text-center">{tBilingual('Status', 'অবস্থা')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {cashClosings.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-medium text-purple-600">{c.closing_number}</td>
                      <td className="p-3 text-slate-500">{c.closing_date}</td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{c.account_name}</td>
                      <td className="p-3 text-right font-mono">৳{c.expected_cash.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold">৳{c.counted_cash.toLocaleString()}</td>
                      <td className={`p-3 text-right font-mono font-bold ${Math.abs(c.variance) <= 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {c.variance > 0 ? `+৳${c.variance}` : `৳${c.variance}`}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{c.closed_by_name}</td>
                      <td className="p-3 text-center">
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-2xs">
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Statements */}
      {activeTab === 'ledger' && (
        <GeneralLedgerView
          entries={ledgerEntries}
          accounts={accounts}
          selectedAccountId={selectedLedgerAccountId}
          onSelectAccount={(accId) => setSelectedLedgerAccountId(accId)}
          isLoading={isLoading}
        />
      )}

      {activeTab === 'balance_sheet' && (
        <BalanceSheetView statement={balanceSheet} isLoading={isLoading} />
      )}

      {activeTab === 'cash_flow' && (
        <CashFlowView statement={cashFlow} isLoading={isLoading} />
      )}

      {activeTab === 'trial_balance' && (
        <TrialBalanceView statement={trialBalance} isLoading={isLoading} />
      )}

      {activeTab === 'job_profitability' && (
        <JobProfitabilityView metrics={jobProfitability} isLoading={isLoading} />
      )}

      {activeTab === 'pnl' && pnl && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>{tBilingual('Profit & Loss Statement', 'লাভ-ক্ষতি বিবরণী')}</span>
            </CardTitle>
            <Badge className="bg-emerald-600 text-white text-xs">
              {tBilingual('Net Margin:', 'মার্জিন:')} {pnl.operating_margin_percentage}%
            </Badge>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div className="flex justify-between font-bold text-sm text-slate-800 dark:text-slate-200 pb-2 border-b">
              <span>{tBilingual('1. Total Sales Revenue', '১. মোট বিক্রয় আয়')}</span>
              <span className="text-emerald-600">৳{pnl.revenue.total.toLocaleString()}</span>
            </div>

            <div className="space-y-1 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
              <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                <span>{tBilingual('2. Cost of Goods Sold', '২. বিক্রিত পণ্যের ব্যয়')}</span>
                <span className="text-rose-600">-৳{pnl.cost_of_goods_sold.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500 pl-3">
                <span>• {tBilingual('Material Costs', 'কাঁচামাল খরচ')}</span>
                <span>৳{pnl.cost_of_goods_sold.material_cost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500 pl-3">
                <span>• {tBilingual('Production Labor Costs', 'শ্রমিক মজুরি')}</span>
                <span>৳{pnl.cost_of_goods_sold.labor_cost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500 pl-3">
                <span>• {tBilingual('Machine Electricity & Operations', 'মেশিন ও বিদ্যুৎ খরচ')}</span>
                <span>৳{pnl.cost_of_goods_sold.machine_cost.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between font-bold text-sm bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl">
              <span>{tBilingual('Gross Profit', 'মোট মুনাফা')}</span>
              <span className="text-emerald-600">৳{pnl.gross_profit.toLocaleString()} ({pnl.gross_margin_percentage}%)</span>
            </div>

            <div className="space-y-1 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
              <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                <span>{tBilingual('3. Operating Expenses', '৩. পরিচালন ব্যয়')}</span>
                <span className="text-rose-600">-৳{pnl.operating_expenses.total.toLocaleString()}</span>
              </div>
              {pnl.operating_expenses.categories.map((c) => (
                <div key={c.category} className="flex justify-between text-slate-500 pl-3">
                  <span>• {c.category}</span>
                  <span>৳{c.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-bold text-base bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-emerald-900 dark:text-emerald-200">
              <span>{tBilingual('Net Operating Profit', 'নিট পরিচালনা মুনাফা')}</span>
              <span>৳{pnl.net_profit.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'accounts' && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {tBilingual('Master Chart of Accounts', 'হিসাব তালিকা')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-20">Code</th>
                    <th className="p-3">Account Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Subtype</th>
                    <th className="p-3 text-right">Balance (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {accounts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-medium text-slate-500">{a.code}</td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {a.name} {a.name_bn ? `(${a.name_bn})` : ''}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-2xs">
                          {a.account_type}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-2xs text-slate-500">{a.account_subtype}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ৳{a.current_balance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'expenses' && (
        <ExpensesView
          report={expensesReport}
          isLoading={isLoading}
          onOpenSpendModal={() => setIsSpendModalOpen(true)}
          onRefresh={loadAllData}
        />
      )}

      {/* Modals */}
      <SpendMoneyModal
        isOpen={isSpendModalOpen}
        onClose={() => setIsSpendModalOpen(false)}
        accounts={accounts}
        onSubmit={handleSpendMoney}
      />

      <TransferMoneyModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        accounts={accounts}
        onSubmit={handleTransferMoney}
      />

      <PaySupplierModal
        isOpen={isPaySupplierModalOpen}
        onClose={() => setIsPaySupplierModalOpen(false)}
        accounts={accounts}
        suppliers={suppliers}
        onSubmit={handlePaySupplier}
      />

      <CustomerRefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        accounts={accounts}
        customers={customers}
        onSubmit={handleCustomerRefund}
      />

      <CashClosingModal
        isOpen={isCashClosingModalOpen}
        onClose={() => setIsCashClosingModalOpen(false)}
        accounts={accounts}
        onSubmit={handleCashClosing}
      />

      <RecordAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        accounts={accounts}
        onSubmit={handleRecordAdjustment}
      />

      {/* Next Action Modal */}
      {nextActionConfig && (
        <NextActionModal
          isOpen={isNextActionOpen}
          onClose={() => setIsNextActionOpen(false)}
          config={nextActionConfig}
        />
      )}
    </div>
    </PanelAccessGuard>
  )
}
