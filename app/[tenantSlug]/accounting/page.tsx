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
  const [isLoading, setIsLoading] = useState(true)
  const [notification, setNotification] = useState<string | null>(null)

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

  const loadAllData = async () => {
    try {
      setIsLoading(true)
      const [accRes, dashRes, pnlRes, bsRes, cfRes, tbRes, glRes, arRes, apRes, jpRes, expRes] = await Promise.all([
        getAccountsAction(),
        getFinancialDashboardAction(),
        getProfitAndLossAction(),
        getBalanceSheetAction(),
        getCashFlowAction(),
        getTrialBalanceAction(),
        getGeneralLedgerAction({ accountId: selectedLedgerAccountId || undefined }),
        getReceivablesAgingAction(),
        getPayablesAgingAction(),
        getJobProfitabilityAction(),
        getExpensesAction(),
      ])

      if (accRes.success && accRes.data) setAccounts(accRes.data)
      if (dashRes.success && dashRes.data) setDashboardMetrics(dashRes.data)
      if (pnlRes.success && pnlRes.data) setPnl(pnlRes.data)
      if (bsRes.success && bsRes.data) setBalanceSheet(bsRes.data)
      if (cfRes.success && cfRes.data) setCashFlow(cfRes.data)
      if (tbRes.success && tbRes.data) setTrialBalance(tbRes.data)
      if (glRes.success && glRes.data) setLedgerEntries(glRes.data)
      if (arRes.success && arRes.data) setReceivables(arRes.data)
      if (apRes.success && apRes.data) setPayables(apRes.data)
      if (jpRes.success && jpRes.data) setJobProfitability(jpRes.data)
      if (expRes.success && expRes.data) setExpensesReport(expRes.data)
    } catch (err: any) {
      console.error('Failed to load finance data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()

    const handleRealtimeSync = () => {
      loadAllData()
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
  }, [selectedLedgerAccountId])

  // Handlers for Modals
  const handleSpendMoney = async (data: any) => {
    const res = await recordExpenseAction(data)
    if (res.success) {
      showNotification(tBilingual('Expense recorded successfully', 'খরচ সফলভাবে এন্ট্রি হয়েছে'))
      await loadAllData()
      setNextActionConfig({
        titleEn: 'Expense Recorded ✓',
        titleBn: 'খরচ রেকর্ড সম্পন্ন হয়েছে ✓',
        descriptionEn: `Voucher recorded for ৳${data.amount.toLocaleString()} (${data.category})`,
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
        descriptionEn: `৳${data.amount.toLocaleString()} transferred successfully.`,
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
        descriptionEn: `Paid ৳${data.amount.toLocaleString()} to ${data.supplierName}.`,
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
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>{tBilingual('Finance 360', 'ফাইন্যান্স ৩৬০ ও হিসাব ব্যবস্থাপনা')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {tBilingual(
              'Money management, cash closing, General Ledger, Balance Sheet, Trial Balance, and Profitability.',
              'দৈনন্দিন টাকা গ্রহণ, খরচ এন্ট্রি, সাধারণ খতিয়ান, ব্যালেন্স শিট, রেওয়ামিল ও আর্থিক বিবরণী।'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={getTenantNavHref('/billing', pathname, slug)}>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl flex items-center gap-1.5 text-xs h-9 font-semibold text-slate-700 dark:text-slate-300"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>{tBilingual('Billing & Collections', 'বিলিং ও কালেকশন')}</span>
            </Button>
          </Link>

          <Link href={getTenantNavHref('/suppliers', pathname, slug)}>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl flex items-center gap-1.5 text-xs h-9 font-semibold text-slate-700 dark:text-slate-300"
            >
              <Building className="w-3.5 h-3.5 text-teal-600" />
              <span>{tBilingual('Suppliers & Mahajan', 'মহাজন খাতা')}</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={isLoading}
            className="rounded-xl flex items-center gap-1.5 text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{tBilingual('Refresh Data', 'রিফ্রেশ')}</span>
          </Button>
        </div>
      </div>

      {/* Top Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs p-3.5">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {tBilingual('Cash in Drawer', 'ক্যাশ তহবিল')}
          </span>
          <div className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">
            ৳{(dashboardMetrics?.total_cash_balance || 0).toLocaleString()}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs p-3.5">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {tBilingual('Bank Balances', 'ব্যাংক তহবিল')}
          </span>
          <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            ৳{(dashboardMetrics?.total_bank_balance || 0).toLocaleString()}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs p-3.5">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {tBilingual('bKash / MFS', 'বিকাশ / নগদ')}
          </span>
          <div className="text-base font-bold text-pink-600 dark:text-pink-400 mt-0.5">
            ৳{(dashboardMetrics?.total_mfs_balance || 0).toLocaleString()}
          </div>
        </Card>

        <Card className="rounded-2xl border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/10 shadow-xs p-3.5">
          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            {tBilingual('Customer Due (AR)', 'গ্রাহকের বাকি')}
          </span>
          <div className="text-base font-bold text-amber-900 dark:text-amber-200 mt-0.5">
            ৳{(receivables?.total_receivable || 0).toLocaleString()}
          </div>
        </Card>

        <Card className="rounded-2xl border-rose-200 dark:border-rose-800/60 bg-rose-50/30 dark:bg-rose-950/10 shadow-xs p-3.5">
          <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">
            {tBilingual('Supplier Due (AP)', 'সরবরাহকারী পাওনা')}
          </span>
          <div className="text-base font-bold text-rose-900 dark:text-rose-200 mt-0.5">
            ৳{(payables?.total_payable || 0).toLocaleString()}
          </div>
        </Card>

        <Card className="rounded-2xl border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-xs p-3.5">
          <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
            {tBilingual('Monthly Net Profit', 'মাসের নিট লাভ')}
          </span>
          <div className="text-base font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">
            ৳{(pnl?.net_profit || 0).toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Quick Action Toolbar */}
      <FinanceQuickActions
        onReceiveMoney={() => {
          // Open customer billing & collections
          router.push(getTenantNavHref('/billing', pathname, slug))
        }}
        onSpendMoney={() => setIsSpendModalOpen(true)}
        onTransferMoney={() => setIsTransferModalOpen(true)}
        onPaySupplier={() => setIsPaySupplierModalOpen(true)}
        onCustomerRefund={() => setIsRefundModalOpen(true)}
        onCashClosing={() => setIsCashClosingModalOpen(true)}
        onRecordAdjustment={() => setIsAdjustmentModalOpen(true)}
      />

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('overview')}
          className="rounded-xl text-xs"
        >
          {tBilingual('Dashboard', 'ড্যাশবোর্ড')}
        </Button>
        <Button
          variant={activeTab === 'expenses' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('expenses')}
          className={`rounded-xl text-xs flex items-center gap-1.5 font-semibold ${
            activeTab === 'expenses'
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
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
          className="rounded-xl text-xs"
        >
          {tBilingual('Customer Due', 'গ্রাহকের বাকি')}
        </Button>
        <Button
          variant={activeTab === 'payables' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('payables')}
          className="rounded-xl text-xs"
        >
          {tBilingual('Supplier Due', 'পাওনাদার')}
        </Button>
        <Button
          variant={activeTab === 'closings' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('closings')}
          className="rounded-xl text-xs"
        >
          {tBilingual('Cash Closings', 'ক্যাশ হিস্ট্রি')}
        </Button>
        <Button
          variant={activeTab === 'ledger' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('ledger')}
          className="rounded-xl text-xs"
        >
          {tBilingual('General Ledger', 'খতিয়ান')}
        </Button>
        <Button
          variant={activeTab === 'pnl' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('pnl')}
          className="rounded-xl text-xs"
        >
          {tBilingual('P&L Statement', 'লাভ-ক্ষতি')}
        </Button>
        <Button
          variant={activeTab === 'balance_sheet' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('balance_sheet')}
          className="rounded-xl text-xs"
        >
          {tBilingual('Balance Sheet', 'ব্যালেন্স শিট')}
        </Button>
        <Button
          variant={activeTab === 'cash_flow' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('cash_flow')}
          className="rounded-xl text-xs"
        >
          {tBilingual('Cash Flow', 'ক্যাশ ফ্লো')}
        </Button>
        <Button
          variant={activeTab === 'trial_balance' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('trial_balance')}
          className="rounded-xl text-xs"
        >
          {tBilingual('Trial Balance', 'রেওয়ামিল')}
        </Button>
        <Button
          variant={activeTab === 'job_profitability' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('job_profitability')}
          className="rounded-xl text-xs"
        >
          {tBilingual('Job Profitability', 'কস্টিং লাভ')}
        </Button>
        <Button
          variant={activeTab === 'accounts' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('accounts')}
          className="rounded-xl text-xs"
        >
          {tBilingual('Chart of Accounts', 'হিসাব তালিকা')}
        </Button>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Money Flow & Recent Transactions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Liquid Accounts Balances */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>{tBilingual('Liquid Accounts (নগদ ও ব্যাংক তহবিল)', 'তহবিল ও ওয়ালেট ব্যালেন্স')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 divide-y divide-slate-100 dark:divide-slate-800/50">
                {accounts
                  .filter((a) => a.account_subtype === 'CASH' || a.account_subtype === 'BANK' || a.account_subtype === 'MFS')
                  .map((acc) => (
                    <div key={acc.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{acc.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{acc.code} • {acc.account_subtype}</div>
                      </div>
                      <div className="text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ৳{acc.current_balance.toLocaleString()}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Overdue Receivables Alert Box */}
            <Card className="rounded-2xl border-amber-200 dark:border-amber-800/60 shadow-xs">
              <CardHeader className="bg-amber-50/30 dark:bg-amber-950/20 pb-3 border-b border-amber-100 dark:border-amber-900/50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{tBilingual('Top Overdue Customers (তাগাদা দিন)', 'বাকি তাগাদা')}</span>
                </CardTitle>
                <Link href={getTenantNavHref('/customers', pathname, slug)}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-800">
                    {tBilingual('View All', 'সব দেখুন')}
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-4 divide-y divide-slate-100 dark:divide-slate-800/50">
                {receivables?.items.slice(0, 5).map((item) => (
                  <div key={item.reference_id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{item.party_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">Inv #{item.reference_id} • {item.days_overdue} days overdue</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-amber-700 dark:text-amber-400">
                        ৳{item.due_amount.toLocaleString()}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 mt-1 rounded-md"
                        onClick={() => router.push(getTenantNavHref('/billing', pathname, slug))}
                      >
                        {tBilingual('Receive', 'পেমেন্ট')}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'receivables' && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {tBilingual('Accounts Receivable & Aging (গ্রাহকের বাকি হিসাব)', 'বাকি আদায় তালিকা')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">{tBilingual('Invoice #', 'ইনভয়েস নং')}</th>
                    <th className="p-3">{tBilingual('Customer', 'গ্রাহকের নাম')}</th>
                    <th className="p-3">{tBilingual('Due Date', 'পরিশোধের শেষ তারিখ')}</th>
                    <th className="p-3 text-right">{tBilingual('Total (৳)', 'মোট বিল')}</th>
                    <th className="p-3 text-right">{tBilingual('Paid (৳)', 'পরিশোধ')}</th>
                    <th className="p-3 text-right">{tBilingual('Due (৳)', 'বাকি')}</th>
                    <th className="p-3 text-center">{tBilingual('Aging Bucket', 'মেয়াদ')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {receivables?.items.map((i) => (
                    <tr key={i.reference_id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-medium text-blue-600">{i.reference_id}</td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{i.party_name}</td>
                      <td className="p-3 text-slate-500">{i.due_date}</td>
                      <td className="p-3 text-right font-mono">৳{i.total_amount.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-emerald-600">৳{i.paid_amount.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-600">৳{i.due_amount.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {i.bucket === '0_30' ? '1–30 Days' : i.bucket === '31_60' ? '31–60 Days' : '60+ Days'}
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

      {activeTab === 'payables' && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {tBilingual('Supplier Payables & Aging (সরবরাহকারীর পাওনা)', 'সরবরাহকারী পাওনা')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">{tBilingual('Supplier Code', 'কোড')}</th>
                    <th className="p-3">{tBilingual('Supplier Name', 'সরবরাহকারী')}</th>
                    <th className="p-3 text-right">{tBilingual('Purchases (৳)', 'মোট ক্রয়')}</th>
                    <th className="p-3 text-right">{tBilingual('Paid (৳)', 'পরিশোধ')}</th>
                    <th className="p-3 text-right">{tBilingual('Net Due (৳)', 'নিট পাওনা')}</th>
                    <th className="p-3 text-center">{tBilingual('Action', 'অ্যাকশন')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {payables?.items.map((i) => (
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
                    <th className="p-3 text-right">{tBilingual('Expected (৳)', 'হিসাবমতো')}</th>
                    <th className="p-3 text-right">{tBilingual('Counted (৳)', 'গোনা টাকা')}</th>
                    <th className="p-3 text-right">{tBilingual('Variance (৳)', 'অমিল')}</th>
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
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px]">
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
              <span>{tBilingual('Profit & Loss Statement (লাভ-ক্ষতি বিবরণী)', 'লাভ-ক্ষতি বিবরণী')}</span>
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
                <span>{tBilingual('2. Cost of Goods Sold (COGS)', '২. বিক্রিত পণ্যের ব্যয় (COGS)')}</span>
                <span className="text-rose-600">-৳{pnl.cost_of_goods_sold.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500 pl-3">
                <span>• Material Costs</span>
                <span>৳{pnl.cost_of_goods_sold.material_cost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500 pl-3">
                <span>• Production Labor Costs</span>
                <span>৳{pnl.cost_of_goods_sold.labor_cost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500 pl-3">
                <span>• Machine Electricity & Operations</span>
                <span>৳{pnl.cost_of_goods_sold.machine_cost.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between font-bold text-sm bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl">
              <span>{tBilingual('Gross Profit (মোট মুনাফা)', 'মোট মুনাফা')}</span>
              <span className="text-emerald-600">৳{pnl.gross_profit.toLocaleString()} ({pnl.gross_margin_percentage}%)</span>
            </div>

            <div className="space-y-1 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
              <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                <span>{tBilingual('3. Operating Expenses (OPEX)', '৩. পরিচালন ব্যয়')}</span>
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
              <span>{tBilingual('Net Operating Profit (নিট মুনাফা)', 'নিট মুনাফা')}</span>
              <span>৳{pnl.net_profit.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'accounts' && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {tBilingual('Master Chart of Accounts (হিসাবের তালিকা)', 'হিসাব তালিকা')}
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
                        <Badge variant="outline" className="text-[10px]">
                          {a.account_type}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">{a.account_subtype}</td>
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
  )
}
