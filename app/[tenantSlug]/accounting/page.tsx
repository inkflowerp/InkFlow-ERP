'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { cn } from '@/lib/utils'
import {
  Wallet,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  ShoppingBag,
  RefreshCw,
  Receipt,
  Users,
  Download,
  ArrowLeftRight,
  Calendar,
  ChevronDown,
  LayoutDashboard,
  BarChart3,
  ChevronLeft,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS, PrintERPDataStore } from '@/lib/db/data-store'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import type { CustomerRecord, SupplierRecord } from '@/types/crm.types'
import type {
  AccountRecord,
  FinancialTransactionRecord,
  FinancialDashboardMetrics,
  ReceivablesAgingSummary,
  PayablesAgingSummary,
  ExpenseSummaryReport,
  CashClosingRecord,
} from '@/types/finance.types'

// The 8 Practical PrintERP Finance Components
import { FinanceDashboardView } from '@/components/finance/finance-dashboard-view'
import { CashBankView } from '@/components/finance/cash-bank-view'
import { ReceivablesView } from '@/components/finance/receivables-view'
import { PayablesView } from '@/components/finance/payables-view'
import { ExpensesTabView } from '@/components/finance/expenses-tab-view'
import { TransactionsLedgerView } from '@/components/finance/transactions-ledger-view'
import { CashClosingView } from '@/components/finance/cash-closing-view'
import { FinancialReportsView } from '@/components/finance/financial-reports-view'

// Modals
import { SpendMoneyModal } from '@/components/finance/modals/spend-money-modal'
import { TransferMoneyModal } from '@/components/finance/modals/transfer-money-modal'
import { PaySupplierModal } from '@/components/finance/modals/pay-supplier-modal'
import { CashClosingModal } from '@/components/finance/modals/cash-closing-modal'
import { AddAccountModal } from '@/components/finance/modals/add-account-modal'
import { CollectPaymentModal } from '@/components/finance/modals/collect-payment-modal'
import { NextActionModal, type NextActionConfig } from '@/components/shared/next-action-modal'

import {
  getAccountsAction,
  getFinancialDashboardAction,
  getReceivablesAgingAction,
  getPayablesAgingAction,
  getExpensesAction,
  getTransactionsAction,
  getCashClosingsAction,
  recordExpenseAction,
  recordTransferAction,
  recordSupplierPaymentAction,
  submitCashClosingAction,
} from '@/actions/finance.actions'

function AccountingContent() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const tabParam = searchParams.get('tab')

  // Map aliases cleanly (e.g. closings -> cash-closing, accounts -> cash-bank, ledger -> transactions)
  const resolveActiveTab = (param: string | null): string => {
    if (!param || param === 'overview' || param === 'dashboard') return 'overview'
    if (param === 'cash-bank' || param === 'accounts') return 'cash-bank'
    if (param === 'receivables') return 'receivables'
    if (param === 'payables') return 'payables'
    if (param === 'expenses') return 'expenses'
    if (param === 'transactions' || param === 'ledger') return 'transactions'
    if (param === 'cash-closing' || param === 'closings') return 'cash-closing'
    if (param === 'reports' || param === 'pnl' || param === 'balance_sheet' || param === 'cash_flow' || param === 'trial_balance') return 'reports'
    return param
  }

  const [activeTab, setActiveTab] = useState<string>(resolveActiveTab(tabParam))

  useEffect(() => {
    setActiveTab(resolveActiveTab(tabParam))
  }, [tabParam])

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab)
    const targetUrl = newTab === 'overview'
      ? getTenantNavHref('/accounting', pathname, slug)
      : getTenantNavHref(`/accounting?tab=${newTab}`, pathname, slug)
    router.push(targetUrl, { scroll: false })
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Data State
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [dashboardMetrics, setDashboardMetrics] = useState<FinancialDashboardMetrics | null>(null)
  const [receivables, setReceivables] = useState<ReceivablesAgingSummary | null>(null)
  const [payables, setPayables] = useState<PayablesAgingSummary | null>(null)
  const [expensesReport, setExpensesReport] = useState<ExpenseSummaryReport | null>(null)
  const [transactions, setTransactions] = useState<FinancialTransactionRecord[]>([])
  const [cashClosings, setCashClosings] = useState<CashClosingRecord[]>([])

  const [customers] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [suppliers] = useDataStore<SupplierRecord[]>(STORAGE_KEYS.SUPPLIERS, [])

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

  // Modals state
  const [isSpendModalOpen, setIsSpendModalOpen] = useState(false)
  const [spendCategoryPrefill, setSpendCategoryPrefill] = useState<string | undefined>()

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferFromAccountId, setTransferFromAccountId] = useState<string | undefined>()

  const [isPaySupplierModalOpen, setIsPaySupplierModalOpen] = useState(false)

  const [isCashClosingModalOpen, setIsCashClosingModalOpen] = useState(false)
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false)

  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false)
  const [collectTarget, setCollectTarget] = useState<{
    customerId?: string
    customerName?: string
    dueAmount?: number
    invoiceId?: string
  }>({})

  // Next Action Modal State
  const [nextActionConfig, setNextActionConfig] = useState<NextActionConfig | null>(null)
  const [isNextActionOpen, setIsNextActionOpen] = useState(false)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const effCompany = company?.id || (slug !== 'my-company' ? slug : undefined)

  const loadAllData = async (customStart?: string, customEnd?: string) => {
    try {
      setIsLoading(true)
      const curStart = customStart !== undefined ? customStart : activeRange.startDate
      const curEnd = customEnd !== undefined ? customEnd : activeRange.endDate

      const [accRes, dashRes, arRes, apRes, expRes, txnsRes, closingsRes] = await Promise.all([
        getAccountsAction(undefined, effCompany).catch(() => ({ success: false, data: [] })),
        getFinancialDashboardAction({ startDate: curStart, endDate: curEnd, companyIdOrSlug: effCompany }).catch(() => ({ success: false, data: null })),
        getReceivablesAgingAction(effCompany).catch(() => ({ success: false, data: null })),
        getPayablesAgingAction(effCompany).catch(() => ({ success: false, data: null })),
        getExpensesAction({ startDate: curStart, endDate: curEnd, companyIdOrSlug: effCompany }).catch(() => ({ success: false, data: null })),
        getTransactionsAction({ startDate: curStart, endDate: curEnd, companyIdOrSlug: effCompany }).catch(() => ({ success: false, data: [] })),
        getCashClosingsAction(undefined, effCompany).catch(() => ({ success: false, data: [] })),
      ])

      const isDemoAccount = (a: AccountRecord) => {
        const meta = a.metadata as any
        return Boolean(
          meta?.mfs_wallet_number === '01711000000' ||
          meta?.mfs_wallet_number === '01811000000' ||
          meta?.mfs_wallet_number === '01911000000' ||
          meta?.account_number_masked === '•••• •••• 4589' ||
          a.name?.includes('(Islami Bank)') ||
          (a.is_system && (a.code === '1030' || a.code === '1031' || a.code === '1032'))
        )
      }

      if (accRes && accRes.success && Array.isArray(accRes.data) && accRes.data.length > 0) {
        setAccounts(accRes.data.filter((a) => !isDemoAccount(a)))
      } else {
        const localAccounts = PrintERPDataStore.get<AccountRecord[]>(STORAGE_KEYS.ACCOUNTS) || []
        const companyAccounts = localAccounts.filter((a) => (!a.company_id || a.company_id === effCompany || a.company_id === 'default') && !isDemoAccount(a))
        if (companyAccounts.length > 0) {
          setAccounts(companyAccounts)
        } else if (accRes && accRes.success && Array.isArray(accRes.data)) {
          setAccounts(accRes.data.filter((a) => !isDemoAccount(a)))
        }
      }

      // Purge any demo accounts cached in local storage for this tenant
      try {
        const localAccs = PrintERPDataStore.get<AccountRecord[]>(STORAGE_KEYS.ACCOUNTS) || []
        const filteredAccs = localAccs.filter((a) => !isDemoAccount(a))
        if (localAccs.length !== filteredAccs.length) {
          PrintERPDataStore.set(STORAGE_KEYS.ACCOUNTS, filteredAccs, false)
        }
      } catch {}

      if (dashRes && dashRes.success && dashRes.data) setDashboardMetrics(dashRes.data)
      if (arRes && arRes.success && arRes.data) setReceivables(arRes.data)
      if (apRes && apRes.success && apRes.data) setPayables(apRes.data)
      if (expRes && expRes.success && expRes.data) setExpensesReport(expRes.data)
      if (txnsRes && txnsRes.success && Array.isArray(txnsRes.data)) setTransactions(txnsRes.data)
      if (closingsRes && closingsRes.success && Array.isArray(closingsRes.data)) setCashClosings(closingsRes.data)
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
  }, [timeframe])

  // Handlers for Modals
  const handleSpendMoney = async (data: any) => {
    const res = await recordExpenseAction({ ...data, companyId: effCompany })
    if (res.success) {
      showNotification(tBilingual('Expense recorded successfully', 'খরচ সফলভাবে এন্ট্রি হয়েছে'))
      await loadAllData()
      setNextActionConfig({
        titleEn: 'Expense Recorded ✓',
        titleBn: 'খরচ রেকর্ড সম্পন্ন হয়েছে ✓',
        descriptionEn: `Voucher recorded for BDT ${data.amount.toLocaleString()} (${data.category})`,
        descriptionBn: `৳${data.amount.toLocaleString()} টাকার ভাউচার সংরক্ষিত হয়েছে (${data.category})`,
        primaryAction: {
          labelEn: 'View Expenses',
          labelBn: 'খরচ তালিকা দেখুন',
          onClick: () => {
            setIsNextActionOpen(false)
            handleTabChange('expenses')
          },
        },
        secondaryActions: [
          {
            labelEn: 'Back to Dashboard',
            labelBn: 'ড্যাশবোর্ডে ফিরুন',
            onClick: () => {
              setIsNextActionOpen(false)
              handleTabChange('overview')
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
    const res = await recordTransferAction({ ...data, companyId: effCompany })
    if (res.success) {
      showNotification(tBilingual('Transfer completed successfully', 'টাকা ট্রান্সফার সফলভাবে সম্পন্ন হয়েছে'))
      await loadAllData()
      setNextActionConfig({
        titleEn: 'Funds Transferred ✓',
        titleBn: 'তহবিল ট্রান্সফার সম্পন্ন হয়েছে ✓',
        descriptionEn: `BDT ${data.amount.toLocaleString()} transferred successfully.`,
        descriptionBn: `৳${data.amount.toLocaleString()} সফলভাবে ট্রান্সফার করা হয়েছে।`,
        primaryAction: {
          labelEn: 'View Cash & Bank',
          labelBn: 'ক্যাশ ও ব্যাংক দেখুন',
          onClick: () => {
            setIsNextActionOpen(false)
            handleTabChange('cash-bank')
          },
        },
        secondaryActions: [
          {
            labelEn: 'Back to Dashboard',
            labelBn: 'ড্যাশবোর্ডে ফিরুন',
            onClick: () => {
              setIsNextActionOpen(false)
              handleTabChange('overview')
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
    const res = await recordSupplierPaymentAction({ ...data, companyId: effCompany })
    if (res.success) {
      showNotification(tBilingual('Supplier payment recorded', 'মহাজন বিল পরিশোধ সফলভাবে সম্পন্ন হয়েছে'))
      await loadAllData()
      setNextActionConfig({
        titleEn: 'Supplier Payment Posted ✓',
        titleBn: 'মহাজন পরিশোধ সম্পন্ন হয়েছে ✓',
        descriptionEn: `BDT ${data.amount.toLocaleString()} paid to ${data.supplierName}.`,
        descriptionBn: `${data.supplierName} কে ৳${data.amount.toLocaleString()} প্রদান করা হয়েছে।`,
        primaryAction: {
          labelEn: 'View Payables',
          labelBn: 'মহাজন দেনা দেখুন',
          onClick: () => {
            setIsNextActionOpen(false)
            handleTabChange('payables')
          },
        },
        secondaryActions: [
          {
            labelEn: 'Back to Dashboard',
            labelBn: 'ড্যাশবোর্ডে ফিরুন',
            onClick: () => {
              setIsNextActionOpen(false)
              handleTabChange('overview')
            },
          },
        ],
      })
      setIsNextActionOpen(true)
    } else {
      throw new Error(res.error)
    }
  }

  const handleCashClosing = async (data: any) => {
    const res = await submitCashClosingAction({ ...data, companyId: effCompany })
    if (res.success) {
      showNotification(tBilingual('Cash closing recorded & locked', 'ক্যাশ ক্লোজিং সম্পন্ন ও লক হয়েছে'))
      await loadAllData()
    } else {
      throw new Error(res.error)
    }
  }

  // Quick Action triggers
  const handleTriggerCollect = (customerId?: string, customerName?: string, dueAmount?: number, invoiceId?: string) => {
    setCollectTarget({ customerId, customerName, dueAmount, invoiceId })
    setIsCollectModalOpen(true)
  }

  const handleTriggerPaySupplier = (supplierId?: string, supplierName?: string, dueAmount?: number) => {
    setIsPaySupplierModalOpen(true)
  }

  const handleTriggerSpend = (prefillCat?: string) => {
    setSpendCategoryPrefill(prefillCat)
    setIsSpendModalOpen(true)
  }

  const handleTriggerTransfer = (fromAccId?: string) => {
    setTransferFromAccountId(fromAccId)
    setIsTransferModalOpen(true)
  }

  if (!mounted) {
    return (
      <div className="space-y-6 pb-20 animate-pulse">
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    )
  }

  // 8 Practical Sub-module Header Configs
  const tabHeaders: Record<string, {
    title: string
    titleBn: string
    description: string
    descriptionBn: string
    icon: React.ElementType
    colorClass: string
  }> = {
    overview: {
      title: 'Finance Dashboard',
      titleBn: 'ফাইন্যান্স ড্যাশবোর্ড',
      description: 'Cash in Hand, Bank accounts, customer dues, supplier liabilities, and today collections.',
      descriptionBn: 'ক্যাশ ব্যালেন্স, ব্যাংক তহবিল, কাস্টমার বাকি, মহাজন দেনা এবং আজকের কালেকশনের সার্বিক চিত্র।',
      icon: LayoutDashboard,
      colorClass: 'bg-emerald-500 text-white',
    },
    'cash-bank': {
      title: 'Cash & Bank Accounts',
      titleBn: 'ক্যাশ ও ব্যাংক হিসাব',
      description: 'Manage real money accounts: Cash in Drawer, Bank Checking, and bKash / Nagad / MFS.',
      descriptionBn: 'ক্যাশ ড্রয়ার, ব্যাংক অ্যাকাউন্ট ও বিকাশ/নগদ ওয়ালেটে থাকা টাকা, স্থানান্তর ও স্টেটমেন্ট।',
      icon: Wallet,
      colorClass: 'bg-blue-600 text-white',
    },
    receivables: {
      title: 'Receivables & Customer Due',
      titleBn: 'গ্রাহকের বকেয়া ও বাকি আদায়',
      description: 'Customer-wise outstanding, payment collection against invoices, payment history, and due aging.',
      descriptionBn: 'ইনভয়েস বকেয়া, গ্রাহকের বাকি, মানি রিসিট সংগ্রহ ও সময়সীমাভিত্তিক বাকি বিশ্লেষণ।',
      icon: Users,
      colorClass: 'bg-amber-500 text-white',
    },
    payables: {
      title: 'Payables & Supplier Dues',
      titleBn: 'মহাজন দেনা ও বিল পরিশোধ',
      description: 'Track material & paper purchase liabilities, vendor payouts, and payable aging.',
      descriptionBn: 'কাঁচামাল ও কাগজের বকেয়া বিল, মহাজন পাওনা পরিশোধ ও দেনার মেয়াদ বিশ্লেষণ।',
      icon: ShoppingBag,
      colorClass: 'bg-rose-600 text-white',
    },
    expenses: {
      title: 'Expenses & Overheads',
      titleBn: 'ব্যয় ও দৈনন্দিন খরচ',
      description: 'Simple expense entry, operating overheads, recurring bills, and category budgets.',
      descriptionBn: 'কারখানা ও দোকানের দৈনন্দিন খরচ, মাসিক নিয়মিত বিল এবং খাতভিত্তিক ব্যয় হিসাব।',
      icon: TrendingDown,
      colorClass: 'bg-rose-500 text-white',
    },
    transactions: {
      title: 'Transactions Ledger',
      titleBn: 'লেনদেন লেজার',
      description: 'One unified ledger for all Money In, Money Out, and Transfer movements.',
      descriptionBn: 'সকল জমা, খরচ এবং ট্রান্সফারের একক পূর্ণাঙ্গ ডিজিটাল খতিয়ান।',
      icon: Receipt,
      colorClass: 'bg-indigo-600 text-white',
    },
    'cash-closing': {
      title: 'Daily Cash Closing',
      titleBn: 'দৈনিক ক্যাশ ক্লোজিং',
      description: 'Reconcile counted cash drawer against expected cash register balance and lock day records.',
      descriptionBn: 'দিনের শেষে হিসাবমতে ড্রয়ার ক্যাশের সাথে গোনা টাকার মিল ও রেজিস্টার লক।',
      icon: Clock,
      colorClass: 'bg-purple-600 text-white',
    },
    reports: {
      title: 'Financial Reports',
      titleBn: 'ফাইন্যান্সিয়াল রিপোর্ট',
      description: 'Practical management reports: Income & Expense, Cash Flow, Receivables, Payables, and Statements.',
      descriptionBn: 'আয়-ব্যয়, নগদ প্রবাহ, বাকি আদায়, মহাজন দেনা এবং ব্যাংক হিসাব বিবরণী রিপোর্ট।',
      icon: BarChart3,
      colorClass: 'bg-teal-600 text-white',
    },
  }

  const currentHeader = tabHeaders[activeTab] || tabHeaders.overview
  const HeaderIcon = currentHeader.icon

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-3 rounded-2xl shadow-xs shrink-0', currentHeader.colorClass)}>
            <HeaderIcon className="w-6 h-6" />
          </div>
          <div>
            {activeTab !== 'overview' && (
              <button
                type="button"
                onClick={() => handleTabChange('overview')}
                className="text-3xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mb-0.5 font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>{tBilingual('Finance Dashboard', 'ফাইন্যান্স ড্যাশবোর্ড')}</span>
              </button>
            )}
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight bangla-text">
              {tBilingual(currentHeader.title, currentHeader.titleBn)}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 bangla-text">
              {tBilingual(currentHeader.description, currentHeader.descriptionBn)}
            </p>
          </div>
        </div>

        {/* Header Controls: Timeframe selector, Export, and Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Display */}
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

      {/* Mobile-Only Quick Tab Selector (when sidebar is hidden on small screens) */}
      <div className="lg:hidden flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2">
          <HeaderIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bangla-text">
            {tBilingual('Active Module:', 'বর্তমান বিভাগ:')}
          </span>
        </div>
        <select
          value={activeTab}
          onChange={(e) => handleTabChange(e.target.value)}
          aria-label={tBilingual('Select Finance Module', 'ফাইন্যান্স মডিউল নির্বাচন করুন')}
          className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bangla-text max-w-[200px]"
        >
          <option value="overview">{tBilingual('Dashboard', 'ফাইন্যান্স ড্যাশবোর্ড')}</option>
          <option value="cash-bank">{tBilingual('Cash & Bank', 'ক্যাশ ও ব্যাংক')}</option>
          <option value="receivables">{tBilingual('Receivables', 'কাস্টমার বাকি')}</option>
          <option value="payables">{tBilingual('Payables', 'মহাজন দেনা')}</option>
          <option value="expenses">{tBilingual('Expenses', 'ব্যয় ও খরচ')}</option>
          <option value="transactions">{tBilingual('Transactions', 'লেনদেন লেজার')}</option>
          <option value="cash-closing">{tBilingual('Cash Closing', 'ক্যাশ ক্লোজিং')}</option>
          <option value="reports">{tBilingual('Financial Reports', 'ফাইন্যান্সিয়াল রিপোর্ট')}</option>
        </select>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 8 PRACTICAL SUB-MODULE VIEWS (Zero traditional accounting bloat) */}
      {/* ------------------------------------------------------------- */}

      {/* View 1: Dashboard */}
      {activeTab === 'overview' && (
        <FinanceDashboardView
          metrics={dashboardMetrics}
          receivables={receivables}
          payables={payables}
          accounts={accounts}
          recentTransactions={transactions}
          onOpenMoneyIn={() => handleTriggerCollect()}
          onOpenSpendModal={() => handleTriggerSpend()}
          onOpenTransferModal={() => handleTriggerTransfer()}
          onOpenCashClosingModal={() => setIsCashClosingModalOpen(true)}
          onNavigateTab={handleTabChange}
          onCollectCustomerDue={(cid, cname, damt) => handleTriggerCollect(cid, cname, damt)}
          onPaySupplier={(sid, sname, damt) => handleTriggerPaySupplier(sid, sname, damt)}
        />
      )}

      {/* View 2: Cash & Bank */}
      {activeTab === 'cash-bank' && (
        <CashBankView
          accounts={accounts}
          transactions={transactions}
          onOpenAddAccount={() => setIsAddAccountModalOpen(true)}
          onOpenMoneyIn={() => handleTriggerCollect()}
          onOpenSpendModal={(accId) => handleTriggerSpend()}
          onOpenTransferModal={(accId) => handleTriggerTransfer(accId)}
          isLoading={isLoading}
        />
      )}

      {/* View 3: Receivables */}
      {activeTab === 'receivables' && (
        <ReceivablesView
          receivables={receivables}
          customers={customers}
          accounts={accounts}
          transactions={transactions}
          onOpenCollectModal={(cid, cname, damt, invId) => handleTriggerCollect(cid, cname, damt, invId)}
        />
      )}

      {/* View 4: Payables */}
      {activeTab === 'payables' && (
        <PayablesView
          payables={payables}
          suppliers={suppliers}
          accounts={accounts}
          transactions={transactions}
          onOpenPaySupplierModal={(sid, sname, damt) => handleTriggerPaySupplier(sid, sname, damt)}
        />
      )}

      {/* View 5: Expenses */}
      {activeTab === 'expenses' && (
        <ExpensesTabView
          report={expensesReport}
          accounts={accounts}
          onOpenSpendModal={(cat) => handleTriggerSpend(cat)}
          isLoading={isLoading}
        />
      )}

      {/* View 6: Transactions */}
      {activeTab === 'transactions' && (
        <TransactionsLedgerView
          transactions={transactions}
          accounts={accounts}
          isLoading={isLoading}
        />
      )}

      {/* View 7: Cash Closing */}
      {activeTab === 'cash-closing' && (
        <CashClosingView
          cashClosings={cashClosings}
          accounts={accounts}
          onSuccessClosing={() => {
            const r = getDateRangeForTimeframe(timeframe)
            loadAllData(r.startDate, r.endDate)
          }}
          isLoading={isLoading}
        />
      )}

      {/* View 8: Financial Reports */}
      {activeTab === 'reports' && (
        <FinancialReportsView
          accounts={accounts}
          transactions={transactions}
          receivables={receivables}
          payables={payables}
          expensesReport={expensesReport}
          timeframeLabel={activeRange.title}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ------------------------------------------------------------- */}

      {/* Spend Money Modal */}
      <SpendMoneyModal
        isOpen={isSpendModalOpen}
        onClose={() => {
          setIsSpendModalOpen(false)
          setSpendCategoryPrefill(undefined)
        }}
        accounts={accounts}
        onSubmit={handleSpendMoney}
      />

      {/* Collect Customer Payment Modal */}
      <CollectPaymentModal
        isOpen={isCollectModalOpen}
        onClose={() => {
          setIsCollectModalOpen(false)
          setCollectTarget({})
        }}
        customers={customers}
        accounts={accounts}
        initialCustomerId={collectTarget.customerId}
        initialCustomerName={collectTarget.customerName}
        initialDueAmount={collectTarget.dueAmount}
        initialInvoiceId={collectTarget.invoiceId}
        companyId={effCompany}
        onSuccess={() => {
          showNotification(tBilingual('Payment collection recorded successfully', 'টাকা জমা সফলভাবে এন্ট্রি হয়েছে'))
          const r = getDateRangeForTimeframe(timeframe)
          loadAllData(r.startDate, r.endDate)
        }}
      />

      {/* Transfer Money Modal */}
      <TransferMoneyModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false)
          setTransferFromAccountId(undefined)
        }}
        accounts={accounts}
        onSubmit={handleTransferMoney}
      />

      {/* Pay Supplier Modal */}
      <PaySupplierModal
        isOpen={isPaySupplierModalOpen}
        onClose={() => setIsPaySupplierModalOpen(false)}
        accounts={accounts}
        suppliers={suppliers}
        onSubmit={handlePaySupplier}
      />

      {/* Cash Closing Modal */}
      <CashClosingModal
        isOpen={isCashClosingModalOpen}
        onClose={() => setIsCashClosingModalOpen(false)}
        accounts={accounts}
        onSubmit={handleCashClosing}
      />

      {/* Add Money Account Modal */}
      <AddAccountModal
        isOpen={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
        existingAccounts={accounts}
        companyId={effCompany}
        onSuccess={(newAcc) => {
          showNotification(tBilingual('New money account created successfully', 'নতুন হিসাব সফলভাবে তৈরি হয়েছে'))
          const r = getDateRangeForTimeframe(timeframe)
          loadAllData(r.startDate, r.endDate)
        }}
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

export default function AccountingPage() {
  return (
    <PanelAccessGuard
      module="accounting"
      action="view"
      panelTitle="Finance & Accounts"
    >
      <AccountingContent />
    </PanelAccessGuard>
  )
}
