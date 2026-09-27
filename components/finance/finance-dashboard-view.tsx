'use client'

import React, { useState, useMemo } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  Users,
  Building,
  Building2,
  Wallet,
  CreditCard,
  Receipt,
  Phone,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ChevronDown,
  Download,
  Share2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Landmark,
  Calculator,
  PieChart,
  Scale,
  Sparkles,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type {
  AccountRecord,
  FinancialDashboardMetrics,
  ProfitAndLossStatement,
  ReceivablesAgingSummary,
  PayablesAgingSummary,
  ExpenseSummaryReport,
} from '@/types/finance.types'

export interface FinanceDashboardViewProps {
  metrics: FinancialDashboardMetrics | null
  pnl: ProfitAndLossStatement | null
  receivables: ReceivablesAgingSummary | null
  payables: PayablesAgingSummary | null
  expensesReport: ExpenseSummaryReport | null
  accounts: AccountRecord[]
  onOpenSpendModal: () => void
  onOpenTransferModal: () => void
  onOpenPaySupplierModal: () => void
  onOpenCashClosingModal: () => void
  onOpenPaymentModal: () => void
  onNavigateTab: (tab: string) => void
  onExport: () => void
}

export function FinanceDashboardView({
  metrics,
  pnl,
  receivables,
  payables,
  expensesReport,
  accounts,
  onOpenSpendModal,
  onOpenTransferModal,
  onOpenPaySupplierModal,
  onOpenCashClosingModal,
  onOpenPaymentModal,
  onNavigateTab,
  onExport,
}: FinanceDashboardViewProps) {
  const { locale, tBilingual } = useI18n()
  const [chartFrequency, setChartFrequency] = useState<'daily' | 'weekly'>('daily')
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  // 100% Real Data Driven - No Mock or Hardcoded Figures
  const totalRevenue = metrics?.monthly_revenue ?? 0
  const totalReceived = metrics?.total_payments_received ?? 0
  const totalDueReceivable = metrics?.total_receivables ?? receivables?.total_receivable ?? 0
  const totalExpenses = metrics?.monthly_expenses ?? 0
  const netProfit = metrics?.monthly_net_profit ?? 0
  const cashInHand = metrics?.total_cash_balance ?? 0
  const bankBalance = metrics?.total_bank_balance ?? 0
  const totalDuePayable = metrics?.total_payables ?? payables?.total_payable ?? 0

  const invoicesCount = metrics?.invoices_count ?? 0
  const paymentsCount = metrics?.payments_count ?? 0
  const customersDueCount = metrics?.customers_due_count ?? 0
  const expensesCount = metrics?.expenses_count ?? 0
  const bankAccountsCount = metrics?.bank_accounts_count ?? 0
  const suppliersDueCount = metrics?.suppliers_due_count ?? 0
  const profitMarginPercent = metrics?.profit_margin_percent ?? 0

  const revenueTrend = metrics?.revenue_trend ?? { percent: 0, isUp: true }
  const paymentsTrend = metrics?.payments_trend ?? { percent: 0, isUp: true }
  const expensesTrend = metrics?.expenses_trend ?? { percent: 0, isUp: true }
  const profitTrend = metrics?.profit_trend ?? { percent: 0, isUp: true }

  const dailySeries = metrics?.daily_trends || []
  const topReceivablesList = metrics?.top_receivables || []
  const topPayablesList = metrics?.top_payables || []
  const recentTransactionsList = metrics?.recent_transactions || []
  const monthlySummaryRows = metrics?.monthly_summary || []
  const paymentBreakdown = metrics?.payment_breakdown || {
    cash: 0,
    bank: 0,
    bkash: 0,
    nagad: 0,
    card: 0,
    total: 0,
    cash_pct: 0,
    bank_pct: 0,
    bkash_pct: 0,
    nagad_pct: 0,
    card_pct: 0,
  }

  // Chart data aggregation for daily or weekly
  const chartItems = useMemo(() => {
    if (dailySeries.length === 0) return []

    if (chartFrequency === 'weekly') {
      const weeks: { label: string; income: number; expense: number; tooltipTitle: string }[] = []
      const chunkSize = 7
      for (let i = 0; i < dailySeries.length; i += chunkSize) {
        const chunk = dailySeries.slice(i, i + chunkSize)
        const inc = chunk.reduce((s, c) => s + c.income, 0)
        const exp = chunk.reduce((s, c) => s + c.expense, 0)
        const wNum = Math.floor(i / chunkSize) + 1
        const startDay = chunk[0]?.label || `Day ${i + 1}`
        const endDay = chunk[chunk.length - 1]?.label || `Day ${i + chunk.length}`
        weeks.push({
          label: `W${wNum}`,
          income: inc,
          expense: exp,
          tooltipTitle: `${startDay} - ${endDay}`,
        })
      }
      return weeks
    }

    return dailySeries.map((d) => ({
      label: d.label,
      income: d.income,
      expense: d.expense,
      tooltipTitle: d.label,
    }))
  }, [dailySeries, chartFrequency])

  // Dynamic maximum scale for bar heights
  const maxVal = useMemo(() => {
    const highest = Math.max(0, ...chartItems.map((c) => Math.max(c.income, c.expense)))
    if (highest <= 0) return 10000
    const magnitude = Math.pow(10, Math.floor(Math.log10(highest)))
    return Math.ceil(highest / magnitude) * magnitude
  }, [chartItems])

  const formatYAxis = (val: number) => {
    if (val === 0) return '0'
    if (val >= 100000) return `৳ ${(val / 1000).toFixed(0)}K`
    if (val >= 1000) return `৳ ${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`
    return `৳ ${val}`
  }

  // Donut geometry for Payment Breakdown
  const R = 38
  const C = 2 * Math.PI * R // ~238.761
  const pb = paymentBreakdown
  const totalReceivedAmount = pb.total > 0 ? pb.total : totalReceived
  const hasPayments = totalReceivedAmount > 0

  const bankLen = (pb.bank_pct / 100) * C
  const cashLen = (pb.cash_pct / 100) * C
  const bkashLen = (pb.bkash_pct / 100) * C
  const nagadLen = (pb.nagad_pct / 100) * C
  const cardLen = (pb.card_pct / 100) * C

  const bankOffset = 0
  const cashOffset = -bankLen
  const bkashOffset = -(bankLen + cashLen)
  const nagadOffset = -(bankLen + cashLen + bkashLen)
  const cardOffset = -(bankLen + cashLen + bkashLen + nagadLen)

  return (
    <div className="space-y-4 2xl:space-y-6">
      {/* =========================================================================
          ROW 1: 8 KEY FINANCIAL PERFORMANCE INDICATORS (2 Rows x 4 Cols on XL)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-3.5 2xl:gap-4">
        {/* 1. Total Revenue */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs hover:shadow-md transition-shadow min-w-0">
          <div className="flex items-start justify-between gap-1.5 2xl:gap-2">
            <div className="flex items-start gap-2.5 2xl:gap-3.5 min-w-0 flex-1">
              <div className="h-9 w-9 2xl:h-11 2xl:w-11 rounded-xl 2xl:rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <DollarSign className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate" title="Total Revenue">
                  Total Revenue
                </span>
                <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                  ৳ {totalRevenue.toLocaleString()}
                </div>
                <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                  {invoicesCount} Invoices
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[10px] 2xl:text-2xs font-bold px-1.5 2xl:px-2 py-0.5 rounded-full',
                  revenueTrend.isUp
                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
                    : 'text-rose-600 bg-rose-50 dark:bg-rose-950/50'
                )}
              >
                {revenueTrend.isUp ? '↑' : '↓'} {revenueTrend.percent}%
              </span>
              <span className="text-[9px] 2xl:text-3xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline xl:hidden 2xl:inline">
                vs last period
              </span>
            </div>
          </div>
        </div>

        {/* 2. Total Payments Received */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs hover:shadow-md transition-shadow min-w-0">
          <div className="flex items-start justify-between gap-1.5 2xl:gap-2">
            <div className="flex items-start gap-2.5 2xl:gap-3.5 min-w-0 flex-1">
              <div className="h-9 w-9 2xl:h-11 2xl:w-11 rounded-xl 2xl:rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Clock className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate" title="Total Payments Received">
                  Total Payments Received
                </span>
                <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                  ৳ {totalReceived.toLocaleString()}
                </div>
                <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                  {paymentsCount} Payments
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[10px] 2xl:text-2xs font-bold px-1.5 2xl:px-2 py-0.5 rounded-full',
                  paymentsTrend.isUp
                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
                    : 'text-rose-600 bg-rose-50 dark:bg-rose-950/50'
                )}
              >
                {paymentsTrend.isUp ? '↑' : '↓'} {paymentsTrend.percent}%
              </span>
              <span className="text-[9px] 2xl:text-3xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline xl:hidden 2xl:inline">
                vs last period
              </span>
            </div>
          </div>
        </div>

        {/* 3. Total Due (Receivable) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs hover:shadow-md transition-shadow min-w-0">
          <div className="flex items-start justify-between gap-1.5 2xl:gap-2">
            <div className="flex items-start gap-2.5 2xl:gap-3.5 min-w-0 flex-1">
              <div className="h-9 w-9 2xl:h-11 2xl:w-11 rounded-xl 2xl:rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <FileText className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate" title="Total Due (Receivable)">
                  Total Due (Receivable)
                </span>
                <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                  ৳ {totalDueReceivable.toLocaleString()}
                </div>
                <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                  {customersDueCount} Customers
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[10px] 2xl:text-2xs font-bold px-1.5 2xl:px-2 py-0.5 rounded-full',
                  totalDueReceivable === 0
                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
                    : 'text-amber-600 bg-amber-50 dark:bg-amber-950/50'
                )}
              >
                {totalDueReceivable === 0 ? '✓ Zero Due' : 'Active Due'}
              </span>
              <span className="text-[9px] 2xl:text-3xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline xl:hidden 2xl:inline">
                outstanding
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
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate" title="Total Expenses">
                  Total Expenses
                </span>
                <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                  ৳ {totalExpenses.toLocaleString()}
                </div>
                <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                  {expensesCount} Transactions
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[10px] 2xl:text-2xs font-bold px-1.5 2xl:px-2 py-0.5 rounded-full',
                  expensesTrend.isUp
                    ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/50'
                    : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
                )}
              >
                {expensesTrend.isUp ? '↑' : '↓'} {expensesTrend.percent}%
              </span>
              <span className="text-[9px] 2xl:text-3xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline xl:hidden 2xl:inline">
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
                <TrendingUp className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate" title="Net Profit">
                  Net Profit
                </span>
                <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                  ৳ {netProfit.toLocaleString()}
                </div>
                <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                  {profitMarginPercent}% Margin
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[10px] 2xl:text-2xs font-bold px-1.5 2xl:px-2 py-0.5 rounded-full',
                  profitTrend.isUp
                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
                    : 'text-rose-600 bg-rose-50 dark:bg-rose-950/50'
                )}
              >
                {profitTrend.isUp ? '↑' : '↓'} {profitTrend.percent}%
              </span>
              <span className="text-[9px] 2xl:text-3xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline xl:hidden 2xl:inline">
                vs last period
              </span>
            </div>
          </div>
        </div>

        {/* 6. Cash in Hand */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs hover:shadow-md transition-shadow min-w-0">
          <div className="flex items-start justify-between gap-1.5 2xl:gap-2">
            <div className="flex items-start gap-2.5 2xl:gap-3.5 min-w-0 flex-1">
              <div className="h-9 w-9 2xl:h-11 2xl:w-11 rounded-xl 2xl:rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Wallet className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate" title="Cash in Hand">
                  Cash in Hand
                </span>
                <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                  ৳ {cashInHand.toLocaleString()}
                </div>
                <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                  Drawer & Petty Cash
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Bank Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs hover:shadow-md transition-shadow min-w-0">
          <div className="flex items-start justify-between gap-1.5 2xl:gap-2">
            <div className="flex items-start gap-2.5 2xl:gap-3.5 min-w-0 flex-1">
              <div className="h-9 w-9 2xl:h-11 2xl:w-11 rounded-xl 2xl:rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Building2 className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate" title="Bank Balance">
                  Bank Balance
                </span>
                <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                  ৳ {bankBalance.toLocaleString()}
                </div>
                <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 flex items-center gap-1 truncate">
                  <Users className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{bankAccountsCount} Accounts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 8. Total Due (Payable) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs hover:shadow-md transition-shadow min-w-0">
          <div className="flex items-start justify-between gap-1.5 2xl:gap-2">
            <div className="flex items-start gap-2.5 2xl:gap-3.5 min-w-0 flex-1">
              <div className="h-9 w-9 2xl:h-11 2xl:w-11 rounded-xl 2xl:rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Building className="w-4.5 h-4.5 2xl:w-5 2xl:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate" title="Total Due (Payable)">
                  Total Due (Payable)
                </span>
                <div className="text-base sm:text-lg 2xl:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 tracking-tight">
                  ৳ {totalDuePayable.toLocaleString()}
                </div>
                <div className="text-2xs text-slate-400 font-medium mt-0.5 2xl:mt-1 truncate">
                  {suppliersDueCount} Suppliers
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: CHARTS (Income vs Expenses Bar Chart + Payment Breakdown Donut)
         ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 2xl:gap-6">
        {/* Income vs Expenses Bar Chart (Col 1 to 7 on XL, 1 to 8 on 2XL) */}
        <div className="xl:col-span-7 2xl:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Income vs Expenses
            </h3>

            <div className="flex items-center gap-4">
              {/* Legend */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Income</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span>Expenses</span>
                </div>
              </div>

              {/* Frequency Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setChartFrequency(chartFrequency === 'daily' ? 'weekly' : 'daily')}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span className="capitalize">{chartFrequency}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          {/* SVG Grouped Bar Chart */}
          <div className="relative w-full h-56 pt-2">
            {chartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <Activity className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-700 mb-2" />
                <span>No daily income or expense entries recorded for this period</span>
              </div>
            ) : (
              <>
                {/* Y Axis Grid Labels */}
                <div className="absolute left-0 top-0 bottom-6 w-14 flex flex-col justify-between text-2xs font-mono text-slate-400 pointer-events-none select-none text-right pr-2">
                  <span>{formatYAxis(maxVal)}</span>
                  <span>{formatYAxis(maxVal * 0.75)}</span>
                  <span>{formatYAxis(maxVal * 0.5)}</span>
                  <span>{formatYAxis(maxVal * 0.25)}</span>
                  <span>0</span>
                </div>

                {/* Horizontal Gridlines */}
                <div className="absolute left-16 right-0 top-1 bottom-6 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-dashed border-slate-100 dark:border-slate-800 w-full" />
                  <div className="border-b border-dashed border-slate-100 dark:border-slate-800 w-full" />
                  <div className="border-b border-dashed border-slate-100 dark:border-slate-800 w-full" />
                  <div className="border-b border-dashed border-slate-100 dark:border-slate-800 w-full" />
                  <div className="border-b border-slate-200 dark:border-slate-700 w-full" />
                </div>

                {/* Bars container */}
                <div className="absolute left-16 right-0 top-0 bottom-6 flex items-end justify-between px-1">
                  {chartItems.map((item, idx) => {
                    const incHeight = maxVal > 0 ? Math.min(100, (item.income / maxVal) * 100) : 0
                    const expHeight = maxVal > 0 ? Math.min(100, (item.expense / maxVal) * 100) : 0
                    const isHovered = hoveredBar === idx

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredBar(idx)}
                        onMouseLeave={() => setHoveredBar(null)}
                        className="flex-1 flex items-end justify-center gap-0.5 h-full relative group cursor-pointer"
                      >
                        {/* Hover Tooltip */}
                        {isHovered && (
                          <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white text-2xs py-1.5 px-2.5 rounded-lg whitespace-nowrap shadow-xl pointer-events-none border border-slate-700">
                            <div className="font-bold text-slate-200">{item.tooltipTitle}</div>
                            <div className="text-emerald-400 font-mono">
                              Income: ৳ {item.income.toLocaleString()}
                            </div>
                            <div className="text-rose-400 font-mono">
                              Expense: ৳ {item.expense.toLocaleString()}
                            </div>
                          </div>
                        )}

                        {/* Income Bar (Emerald) */}
                        <div
                          style={{ height: `${Math.max(incHeight > 0 ? 3 : 0, incHeight)}%` }}
                          className={cn(
                            'w-1 sm:w-2 bg-emerald-500 rounded-t-xs transition-all',
                            isHovered ? 'bg-emerald-400 brightness-110' : ''
                          )}
                        />

                        {/* Expense Bar (Rose) */}
                        <div
                          style={{ height: `${Math.max(expHeight > 0 ? 3 : 0, expHeight)}%` }}
                          className={cn(
                            'w-1 sm:w-2 bg-rose-400 rounded-t-xs transition-all',
                            isHovered ? 'bg-rose-300 brightness-110' : ''
                          )}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* X Axis Labels */}
                <div className="absolute left-16 right-0 bottom-0 flex justify-between text-2xs text-slate-400 font-medium px-2">
                  {chartFrequency === 'weekly' ? (
                    chartItems.map((c, i) => <span key={i}>{c.label}</span>)
                  ) : (
                    <>
                      <span>{chartItems[0]?.label || 'Start'}</span>
                      {chartItems.length > 10 && (
                        <span>{chartItems[Math.floor(chartItems.length / 3)]?.label}</span>
                      )}
                      {chartItems.length > 15 && (
                        <span>{chartItems[Math.floor((chartItems.length * 2) / 3)]?.label}</span>
                      )}
                      <span>{chartItems[chartItems.length - 1]?.label || 'End'}</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Breakdown Donut (Col 8 to 12 on XL, 9 to 12 on 2XL) */}
        <div className="xl:col-span-5 2xl:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Payment Breakdown
            </h3>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Active Period
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 2xl:gap-6 py-2">
            {/* Donut Graphic */}
            <div className="relative w-32 h-32 2xl:w-36 2xl:h-36 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={R}
                  fill="transparent"
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                  strokeWidth="14"
                />

                {hasPayments && (
                  <>
                    {/* Bank Transfer (Blue) */}
                    {pb.bank_pct > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r={R}
                        fill="transparent"
                        stroke="#3b82f6"
                        strokeWidth="14"
                        strokeDasharray={`${bankLen.toFixed(1)} ${C.toFixed(1)}`}
                        strokeDashoffset={bankOffset.toFixed(1)}
                      />
                    )}

                    {/* Cash (Emerald) */}
                    {pb.cash_pct > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r={R}
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth="14"
                        strokeDasharray={`${cashLen.toFixed(1)} ${C.toFixed(1)}`}
                        strokeDashoffset={cashOffset.toFixed(1)}
                      />
                    )}

                    {/* bKash (Pink) */}
                    {pb.bkash_pct > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r={R}
                        fill="transparent"
                        stroke="#ec4899"
                        strokeWidth="14"
                        strokeDasharray={`${bkashLen.toFixed(1)} ${C.toFixed(1)}`}
                        strokeDashoffset={bkashOffset.toFixed(1)}
                      />
                    )}

                    {/* Nagad (Orange) */}
                    {pb.nagad_pct > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r={R}
                        fill="transparent"
                        stroke="#f97316"
                        strokeWidth="14"
                        strokeDasharray={`${nagadLen.toFixed(1)} ${C.toFixed(1)}`}
                        strokeDashoffset={nagadOffset.toFixed(1)}
                      />
                    )}

                    {/* Card (Purple) */}
                    {pb.card_pct > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r={R}
                        fill="transparent"
                        stroke="#8b5cf6"
                        strokeWidth="14"
                        strokeDasharray={`${cardLen.toFixed(1)} ${C.toFixed(1)}`}
                        strokeDashoffset={cardOffset.toFixed(1)}
                      />
                    )}
                  </>
                )}
              </svg>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                <span className="text-xs 2xl:text-sm font-black text-slate-900 dark:text-white font-mono truncate max-w-[85px] 2xl:max-w-[100px]">
                  ৳ {totalReceivedAmount.toLocaleString()}
                </span>
                <span className="text-[10px] 2xl:text-3xs text-slate-400 font-medium">
                  Total Received
                </span>
              </div>
            </div>

            {/* Legend & Breakdown values */}
            <div className="flex-1 w-full space-y-1.5 2xl:space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 2xl:gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">Cash</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ৳ {pb.cash.toLocaleString()}
                  </span>
                  <span className="text-slate-400 text-2xs w-7 text-right font-medium">
                    {pb.cash_pct}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 2xl:gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Bank Transfer</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ৳ {pb.bank.toLocaleString()}
                  </span>
                  <span className="text-slate-400 text-2xs w-7 text-right font-medium">
                    {pb.bank_pct}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 2xl:gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-pink-500 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">bKash</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ৳ {pb.bkash.toLocaleString()}
                  </span>
                  <span className="text-slate-400 text-2xs w-7 text-right font-medium">
                    {pb.bkash_pct}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 2xl:gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">Nagad</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ৳ {pb.nagad.toLocaleString()}
                  </span>
                  <span className="text-slate-400 text-2xs w-7 text-right font-medium">
                    {pb.nagad_pct}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 2xl:gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">Card (SSL)</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ৳ {pb.card.toLocaleString()}
                  </span>
                  <span className="text-slate-400 text-2xs w-7 text-right font-medium">
                    {pb.card_pct}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 3: 3 LIST COLUMNS (Top Receivables, Top Payables, Recent Transactions)
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 2xl:gap-6">
        {/* Col 1: Top Receivables (Customer Due) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Top Receivables (Customer Due)
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('receivables')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                View All
              </button>
            </div>

            {topReceivablesList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-500/80 stroke-[1.5]" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  All customer dues are cleared
                </span>
                <span className="text-2xs text-slate-400">
                  No outstanding receivables recorded
                </span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {topReceivablesList.map((item) => (
                  <div key={item.rank} className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 text-2xs font-bold flex items-center justify-center shrink-0">
                        {item.rank}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {item.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.phone && (
                        <a
                          href={`tel:${item.phone}`}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
                          title={`Call ${item.phone}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        ৳ {item.amount.toLocaleString()}
                      </span>

                      <span
                        className={cn(
                          'text-3xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap',
                          item.isOverdue
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50'
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Col 2: Top Payables (Supplier Due) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Top Payables (Supplier Due)
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('payables')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                View All
              </button>
            </div>

            {topPayablesList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-500/80 stroke-[1.5]" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  No supplier dues pending
                </span>
                <span className="text-2xs text-slate-400">
                  All procurement bills are settled
                </span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {topPayablesList.map((item) => (
                  <div key={item.rank} className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 text-2xs font-bold flex items-center justify-center shrink-0">
                        {item.rank}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {item.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.phone && (
                        <a
                          href={`tel:${item.phone}`}
                          className="p-1 text-slate-400 hover:text-orange-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
                          title={`Call ${item.phone}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        ৳ {item.amount.toLocaleString()}
                      </span>

                      <span
                        className={cn(
                          'text-3xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap',
                          item.isOverdue
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50'
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Col 3: Recent Transactions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs flex flex-col justify-between md:col-span-2 xl:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Transactions
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('ledger')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                View All
              </button>
            </div>

            {recentTransactionsList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-1.5">
                <Clock className="w-6 h-6 text-slate-400 stroke-[1.5]" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  No transactions recorded
                </span>
                <span className="text-2xs text-slate-400">
                  Vouchers and receipts will appear here
                </span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {recentTransactionsList.map((tx, idx) => (
                  <div key={tx.id || idx} className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          'h-8 w-8 rounded-xl flex items-center justify-center shrink-0',
                          tx.color === 'emerald'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                            : tx.color === 'rose'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                            : tx.color === 'blue'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600'
                            : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600'
                        )}
                      >
                        {tx.type === 'CUSTOMER_PAYMENT' || tx.type === 'INVOICE_RECEIPT' ? (
                          <DollarSign className="w-4 h-4" />
                        ) : tx.type === 'EXPENSE' ? (
                          <Receipt className="w-4 h-4" />
                        ) : tx.type === 'SUPPLIER_PAYMENT' ? (
                          <Building className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white leading-tight truncate">
                          {tx.title}
                        </div>
                        <div className="text-2xs text-slate-400 mt-0.5 truncate">
                          {tx.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={cn(
                          'font-mono font-bold',
                          tx.color === 'emerald'
                            ? 'text-emerald-600'
                            : tx.color === 'rose'
                            ? 'text-rose-600'
                            : 'text-slate-900 dark:text-white'
                        )}
                      >
                        {tx.isCredit ? '+' : '-'} ৳ {tx.amount.toLocaleString()}
                      </div>
                      <div className="text-3xs text-slate-400 mt-0.5">
                        {tx.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 4: MONTHLY SUMMARY TABLE + QUICK ACTIONS HUD
         ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 2xl:gap-6">
        {/* Left: Monthly Summary Table (Col 1 to 7 on XL) */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 2xl:mb-3.5">
              Monthly Summary
            </h3>

            <div className="overflow-x-auto -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
              <table className="w-full text-xs text-left min-w-[460px] 2xl:min-w-[500px]">
                <thead>
                  <tr className="text-2xs font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <th className="pb-2 2xl:pb-2.5 font-semibold">Month</th>
                    <th className="pb-2 2xl:pb-2.5 font-semibold text-center">Invoices</th>
                    <th className="pb-2 2xl:pb-2.5 font-semibold text-right">Revenue</th>
                    <th className="pb-2 2xl:pb-2.5 font-semibold text-right">Received</th>
                    <th className="pb-2 2xl:pb-2.5 font-semibold text-right">Due</th>
                    <th className="pb-2 2xl:pb-2.5 font-semibold text-right">Expenses</th>
                    <th className="pb-2 2xl:pb-2.5 font-semibold text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {monthlySummaryRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No monthly records recorded yet
                      </td>
                    </tr>
                  ) : (
                    monthlySummaryRows.map((row) => (
                      <tr
                        key={row.month}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 2xl:py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {row.month}
                        </td>
                        <td className="py-2.5 2xl:py-3 text-center text-slate-600 dark:text-slate-300 font-mono">
                          {row.invoices}
                        </td>
                        <td className="py-2.5 2xl:py-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          ৳ {row.revenue.toLocaleString()}
                        </td>
                        <td className="py-2.5 2xl:py-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          ৳ {row.received.toLocaleString()}
                        </td>
                        <td className="py-2.5 2xl:py-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          ৳ {row.due.toLocaleString()}
                        </td>
                        <td className="py-2.5 2xl:py-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          ৳ {row.expenses.toLocaleString()}
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions 8-Button Matrix (Col 8 to 12 on XL) */}
        <div className="xl:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3.5 2xl:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 2xl:mb-3.5">
              Quick Actions
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4 gap-2 2xl:gap-2.5">
              {/* 1. Record Payment */}
              <button
                type="button"
                onClick={onOpenPaymentModal}
                className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300 text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
              >
                <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="leading-tight">Record Payment</span>
              </button>

              {/* 2. Add Expense */}
              <button
                type="button"
                onClick={onOpenSpendModal}
                className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50 text-rose-800 dark:text-rose-300 text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
              >
                <Receipt className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="leading-tight">Add Expense</span>
              </button>

              {/* 3. Supplier Payment */}
              <button
                type="button"
                onClick={onOpenPaySupplierModal}
                className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 text-amber-800 dark:text-amber-300 text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
              >
                <ArrowLeftRight className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="leading-tight">Supplier Pay</span>
              </button>

              {/* 4. Bank Transfer */}
              <button
                type="button"
                onClick={onOpenTransferModal}
                className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20 hover:bg-sky-50 text-sky-800 dark:text-sky-300 text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
              >
                <Landmark className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="leading-tight">Bank Transfer</span>
              </button>

              {/* 5. Customer Due Report */}
              <button
                type="button"
                onClick={() => onNavigateTab('receivables')}
                className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-purple-200/80 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-50 text-purple-800 dark:text-purple-300 text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
              >
                <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="leading-tight">Customer Due</span>
              </button>

              {/* 6. Supplier Due Report */}
              <button
                type="button"
                onClick={() => onNavigateTab('payables')}
                className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 text-indigo-800 dark:text-indigo-300 text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
              >
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="leading-tight">Supplier Due</span>
              </button>

              {/* 7. Cash Closing */}
              <button
                type="button"
                onClick={onOpenCashClosingModal}
                className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-teal-200/80 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20 hover:bg-teal-50 text-teal-800 dark:text-teal-300 text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
              >
                <Wallet className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="leading-tight">Cash Closing</span>
              </button>

              {/* 8. Profit & Loss Report */}
              <button
                type="button"
                onClick={() => onNavigateTab('pnl')}
                className="flex items-center gap-2 p-2 2xl:p-2.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 text-blue-800 dark:text-blue-300 text-[11px] 2xl:text-xs font-semibold transition-all cursor-pointer text-left min-h-[42px] 2xl:min-h-[44px]"
              >
                <PieChart className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="leading-tight">Profit & Loss</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
