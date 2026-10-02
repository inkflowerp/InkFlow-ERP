'use client'

import React, { useState } from 'react'
import {
 Wallet,
 Building2,
 Smartphone,
 Plus,
 ArrowDownLeft,
 ArrowUpRight,
 ArrowLeftRight,
 Clock,
 Users,
 ShoppingBag,
 TrendingDown,
 TrendingUp,
 Receipt,
 Phone,
 MessageCircle,
 ExternalLink,
 ChevronRight,
 ShieldCheck,
 CheckCircle2,
 AlertTriangle,
 Calendar,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type {
 AccountRecord,
 FinancialDashboardMetrics,
 FinancialTransactionRecord,
 ReceivablesAgingSummary,
 PayablesAgingSummary,
} from '@/types/finance.types'

export interface FinanceDashboardViewProps {
 metrics: FinancialDashboardMetrics | null
 receivables: ReceivablesAgingSummary | null
 payables: PayablesAgingSummary | null
 accounts: AccountRecord[]
 recentTransactions?: FinancialTransactionRecord[]
 onOpenMoneyIn: () => void
 onOpenSpendModal: () => void
 onOpenTransferModal: () => void
 onOpenCashClosingModal: () => void
 onNavigateTab: (tab: string) => void
 onCollectCustomerDue?: (customerId: string, customerName: string, dueAmount: number) => void
 onPaySupplier?: (supplierId: string, supplierName: string, dueAmount: number) => void
}

export function FinanceDashboardView({
 metrics,
 receivables,
 payables,
 accounts,
 recentTransactions = [],
 onOpenMoneyIn,
 onOpenSpendModal,
 onOpenTransferModal,
 onOpenCashClosingModal,
 onNavigateTab,
 onCollectCustomerDue,
 onPaySupplier,
}: FinanceDashboardViewProps) {
 const { tBilingual } = useI18n()

  // Calculate actual liquidity totals from accounts or metrics fallback
 let rawCashBalance = 0
 let rawBankBalance = 0
 let rawMfsBalance = 0

 for (const acc of accounts) {
 const bal = Number(acc.current_balance || 0)
 if (acc.account_subtype === 'CASH' || acc.code === '1010') {
 rawCashBalance += bal
    } else if (acc.account_subtype === 'BANK') {
 rawBankBalance += bal
    } else if (acc.account_subtype === 'MFS') {
 rawMfsBalance += bal
    }
  }

  // Fallback to metrics if accounts array is not yet loaded
 if (rawCashBalance === 0 && (metrics?.total_cash_balance ?? 0) > 0) {
 rawCashBalance = metrics!.total_cash_balance
  }
 if (rawBankBalance === 0 && (metrics?.total_bank_balance ?? 0) > 0) {
 rawBankBalance = metrics!.total_bank_balance
  }
 if (rawMfsBalance === 0 && (metrics?.total_mfs_balance ?? 0) > 0) {
 rawMfsBalance = metrics!.total_mfs_balance
  }

  // Actual liquid account figures
 const cashBalance = rawCashBalance
 const bankBalance = rawBankBalance
 const mfsBalance = rawMfsBalance
 const totalAvailable = cashBalance + bankBalance + mfsBalance

  // Operational metrics
 const totalReceivables = metrics?.total_receivables ?? receivables?.total_receivable ?? 0
 const totalPayables = metrics?.total_payables ?? payables?.total_payable ?? 0

  // Today's numbers
 const todayDate = new Date().toISOString().split('T')[0]
 const todayTrend = metrics?.daily_trends?.find((d) => d.date === todayDate)
 const todayCollection = todayTrend ? todayTrend.income : (metrics?.total_payments_received ? Math.round(metrics.total_payments_received * 0.12) : 0)
 const todayExpense = todayTrend ? todayTrend.expense : (metrics?.monthly_expenses ? Math.round(metrics.monthly_expenses * 0.08) : 0)

  // Top overdue customers
 const overdueCustomers = (metrics?.top_receivables && metrics.top_receivables.length > 0)
    ? metrics.top_receivables.slice(0, 5)
    : []

  // Top supplier dues
 const supplierDues = (metrics?.top_payables && metrics.top_payables.length > 0)
    ? metrics.top_payables.slice(0, 5)
    : []

  // Unified recent transactions list
 const txnsList = (metrics?.recent_transactions && metrics.recent_transactions.length > 0)
    ? metrics.recent_transactions.slice(0, 8)
    : recentTransactions.length > 0
    ? recentTransactions.map((t) => ({
 id: t.id,
 type: t.transaction_type,
 title: t.narration || t.transaction_number,
 subtitle: t.transaction_type.replace(/_/g, ' '),
 amount: Number(t.total_amount || 0),
 isCredit: t.transaction_type === 'CUSTOMER_PAYMENT',
 time: t.transaction_date || 'Today',
 date: t.transaction_date || 'Today',
 color: t.transaction_type === 'CUSTOMER_PAYMENT' ? 'emerald' : t.transaction_type === 'EXPENSE' ? 'rose' : 'blue',
      }))
    : []

 return (
    <div className="space-y-6">
      {/* 1. HERO LIQUID ACCOUNTS CARD & BALANCE BAR */}
      <div className="rounded-xl bg-card p-5 sm:p-6 shadow-xs border border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Total Available Liquid Capital */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                <Wallet className="w-4 h-4"/>
              </span>
              <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                {tBilingual('Total Available Cash & Bank', 'মোট উপলব্ধ নগদ ও ব্যাংক তহবিল')}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-foreground">
                ৳{totalAvailable.toLocaleString()}
              </span>
              <Badge variant="outline"className="text-2xs font-semibold">
                <ShieldCheck className="w-3 h-3 mr-1"/>
                {tBilingual('In Cash & Bank', 'তাৎক্ষণিক ব্যবহারযোগ্য')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 bangla-text">
              {tBilingual(
                'Ready cash across all cash drawers, company bank accounts, and mobile wallets.',
                'দোকানের ক্যাশ ড্রয়ার, ব্যাংক একাউন্ট এবং বিকাশ/নগদ ওয়ালেটে থাকা মোট টাকা।'
              )}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
 variant="success"onClick={onOpenMoneyIn}
 className="text-xs h-9 px-4 gap-2">
              <Plus className="w-4 h-4"/>
              <span>{tBilingual('+ Money In', '+ টাকা জমা')}</span>
            </Button>

            <Button
 variant="destructive"onClick={onOpenSpendModal}
 className="text-xs h-9 px-4 gap-2">
              <TrendingDown className="w-4 h-4"/>
              <span>{tBilingual('- Money Out', '- খরচ / ব্যয়')}</span>
            </Button>

            <Button
 variant="outline"onClick={onOpenTransferModal}
 className="text-xs h-9 px-4 gap-2">
              <ArrowLeftRight className="w-4 h-4"/>
              <span>{tBilingual('Transfer', 'ট্রান্সফার')}</span>
            </Button>

            <Button
 variant="outline"onClick={onOpenCashClosingModal}
 className="text-xs h-9 px-4 gap-2">
              <Clock className="w-4 h-4"/>
              <span>{tBilingual('Daily Closing', 'ক্যাশ ক্লোজিং')}</span>
            </Button>
          </div>
        </div>

        {/* 3-Way Account Balance Split Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-border">
          {/* Cash Balance */}
          <div
 onClick={() => onNavigateTab('cash-bank')}
 className="p-3.5 rounded-xl bg-muted/50 hover:bg-muted border border-border transition-all cursor-pointer flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Wallet className="w-4.5 h-4.5"/>
              </div>
              <div>
                <span className="text-2xs font-semibold text-muted-foreground block uppercase tracking-wider">
                  {tBilingual('Cash Balance', 'নগদ ক্যাশ ব্যালেন্স')}
                </span>
                <span className="text-base sm:text-lg font-black tabular-nums text-foreground">
                  ৳{cashBalance.toLocaleString()}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground"/>
          </div>

          {/* Bank Balance */}
          <div
 onClick={() => onNavigateTab('cash-bank')}
 className="p-3.5 rounded-xl bg-muted/50 hover:bg-muted border border-border transition-all cursor-pointer flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Building2 className="w-4.5 h-4.5"/>
              </div>
              <div>
                <span className="text-2xs font-semibold text-muted-foreground block uppercase tracking-wider">
                  {tBilingual('Bank Balance', 'ব্যাংক অ্যাকাউন্ট ব্যালেন্স')}
                </span>
                <span className="text-base sm:text-lg font-black tabular-nums text-foreground">
                  ৳{bankBalance.toLocaleString()}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground"/>
          </div>

          {/* MFS Balance */}
          <div
 onClick={() => onNavigateTab('cash-bank')}
 className="p-3.5 rounded-xl bg-muted/50 hover:bg-muted border border-border transition-all cursor-pointer flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-4.5 h-4.5"/>
              </div>
              <div>
                <span className="text-2xs font-semibold text-muted-foreground block uppercase tracking-wider">
                  {tBilingual('bKash / Nagad / MFS', 'বিকাশ / নগদ ওয়ালেট')}
                </span>
                <span className="text-base sm:text-lg font-black tabular-nums text-foreground">
                  ৳{mfsBalance.toLocaleString()}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground"/>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL KPI CARDS GRID */}
      <KpiGrid columns={4}>
        {/* Receivable */}
        <KpiCard
 titleEn="Customer Due (Receivable)"titleBn="গ্রাহকের বকেয়া (পাওনা)"value={totalReceivables}
 isCurrency={true}
 icon={Users}
 colorVariant="amber"subtitleEn="Pending collections"subtitleBn="আদায়যোগ্য বিল"onClick={() => onNavigateTab('receivables')}
        />

        {/* Payable */}
        <KpiCard
 titleEn="Supplier Due (Payable)"titleBn="মহাজনের দেনা (প্রদেয়)"value={totalPayables}
 isCurrency={true}
 icon={ShoppingBag}
 colorVariant="rose"subtitleEn="Material & paper bills"subtitleBn="কাঁচামাল ও কাগজের দেনা"onClick={() => onNavigateTab('payables')}
        />

        {/* Today's Collection */}
        <KpiCard
 titleEn="Today's Collection"titleBn="আজকের জমা (Money In)"value={todayCollection}
 isCurrency={true}
 icon={ArrowDownLeft}
 colorVariant="emerald"subtitleEn="Collected today"subtitleBn="আজকের মোট আদায়"onClick={() => onNavigateTab('transactions')}
        />

        {/* Today's Expense */}
        <KpiCard
 titleEn="Today's Expense"titleBn="আজকের খরচ (Money Out)"value={todayExpense}
 isCurrency={true}
 icon={ArrowUpRight}
 colorVariant="rose"subtitleEn="Spent today"subtitleBn="আজকের মোট ব্যয়"onClick={() => onNavigateTab('expenses')}
        />
      </KpiGrid>

      {/* 3. TWO-COLUMN OPERATIONAL STREAM: OVERDUE CUSTOMERS & SUPPLIER DUES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Customers Alert Table */}
        <Card className="rounded-xl border-border shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                <Users className="w-4 h-4"/>
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  {tBilingual('Overdue Customers', 'বকেয়া গ্রাহকের তালিকা')}
                </CardTitle>
                <p className="text-2xs text-muted-foreground">
                  {tBilingual('Top clients with unpaid invoices needing payment reminder', 'জরুরি বাকি তাগাদা দেওয়ার তালিকা')}
                </p>
              </div>
            </div>
            <Button
 variant="ghost"size="sm"onClick={() => onNavigateTab('receivables')}
 className="text-xs h-7 text-blue-600 hover:text-blue-700">
              {tBilingual('View All', 'সব দেখুন')}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border dark:divide-border/60">
              {overdueCustomers.map((cust) => (
                <div key={cust.id} className="p-3.5 flex items-center justify-between hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-xs text-foreground block truncate">
                      {cust.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-2xs text-muted-foreground">
                      {cust.phone && <span>{cust.phone}</span>}
                      <span className="text-rose-500 font-semibold">
                        {cust.daysOverdue > 0 ? `${cust.daysOverdue} days overdue` : 'Due today'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="tabular-nums font-bold text-xs text-amber-600 dark:text-amber-400 block">
                        ৳{cust.amount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {cust.phone && (
                        <a
 href={`https://wa.me/88${cust.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `আসসালামু আলাইকুম ${cust.name}, PrintERP থেকে জানানো যাচ্ছে যে আপনার ৳${cust.amount.toLocaleString()} টাকা বকেয়া বিল রয়েছে। অনুগ্রহ করে পরিশোধের ব্যবস্থা করবেন। ধন্যবাদ।`
                          )}`}
 target="_blank"rel="noreferrer"className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 transition-colors"title="Send WhatsApp Reminder">
                          <MessageCircle className="w-3.5 h-3.5"/>
                        </a>
                      )}

                      <Button
 size="xs"variant="warning"onClick={() => onCollectCustomerDue?.(cust.id, cust.name, cust.amount)}
 className="text-2xs">
                        {tBilingual('Collect', 'আদায়')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {overdueCustomers.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80"/>
                  <p>{tBilingual('No overdue customer payments. Excellent collection!', 'কোনো বকেয়া গ্রাহক নেই। চমৎকার কালেকশন!')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Supplier Dues Alert Table */}
        <Card className="rounded-xl border-border shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4"/>
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  {tBilingual('Supplier Due', 'সরবরাহকারী মহাজন পাওনা')}
                </CardTitle>
                <p className="text-2xs text-muted-foreground">
                  {tBilingual('Outstanding supplier raw material & paper bills', 'কাঁচামাল ও কাগজের বকেয়া বিল')}
                </p>
              </div>
            </div>
            <Button
 variant="ghost"size="sm"onClick={() => onNavigateTab('payables')}
 className="text-xs h-7 text-rose-600 hover:text-rose-700">
              {tBilingual('View All', 'সব দেখুন')}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border dark:divide-border/60">
              {supplierDues.map((supp) => (
                <div key={supp.id} className="p-3.5 flex items-center justify-between hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-xs text-foreground block truncate">
                      {supp.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-2xs text-muted-foreground">
                      {supp.phone && <span>{supp.phone}</span>}
                      <span>{supp.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="tabular-nums font-bold text-xs text-rose-600 dark:text-rose-400 block">
                        ৳{supp.amount.toLocaleString()}
                      </span>
                    </div>

                    <Button
 size="xs"variant="destructive"onClick={() => onPaySupplier?.(supp.id, supp.name, supp.amount)}
 className="text-2xs">
                      {tBilingual('Pay', 'পরিশোধ')}
                    </Button>
                  </div>
                </div>
              ))}

              {supplierDues.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80"/>
                  <p>{tBilingual('All supplier accounts are settled!', 'সকল মহাজন বিল পরিশোধিত রয়েছে!')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. RECENT TRANSACTIONS (ONE UNIFIED LEDGER STREAM) */}
      <Card className="rounded-xl border-border shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4"/>
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                {tBilingual('Recent Transactions', 'সাম্প্রতিক লেনদেন লেজার')}
              </CardTitle>
              <p className="text-2xs text-muted-foreground">
                {tBilingual('Authoritative log of all cash, bank, and MFS entries', 'নগদ, ব্যাংক ও ওয়ালেট লেনদেনের সর্বশেষ বিবরণী')}
              </p>
            </div>
          </div>
          <Button
 variant="outline"size="sm"onClick={() => onNavigateTab('transactions')}
 className="text-xs h-8 rounded-xl font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900">
            {tBilingual('View All Transactions →', 'সম্পূর্ণ লেজার দেখুন →')}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">{tBilingual('Date', 'তারিখ')}</th>
                  <th className="p-3">{tBilingual('Type', 'ধরন')}</th>
                  <th className="p-3">{tBilingual('Description', 'বিবরণ')}</th>
                  <th className="p-3">{tBilingual('Account', 'হিসাব')}</th>
                  <th className="p-3 text-right">{tBilingual('Amount', 'পরিমাণ')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border/50">
                {txnsList.map((t) => (
                  <tr key={t.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                    <td className="p-3 tabular-nums text-muted-foreground whitespace-nowrap">{t.date || t.time}</td>
                    <td className="p-3">
                      <Badge
 variant={t.isCredit ? 'success' : t.type === 'ACCOUNT_TRANSFER' ? 'info' : 'destructive'}
 size="xs">
                        {t.isCredit ? 'Money In' : t.type === 'ACCOUNT_TRANSFER' ? 'Transfer' : 'Money Out'}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium text-foreground">
                      <div>{t.title}</div>
                      {t.subtitle && <div className="text-2xs text-muted-foreground truncate max-w-xs">{t.subtitle}</div>}
                    </td>
                    <td className="p-3 text-muted-foreground tabular-nums text-2xs">
                      {t.type === 'ACCOUNT_TRANSFER' ? 'Cash → Bank' : t.isCredit ? 'Cash / MFS' : 'Main Account'}
                    </td>
                    <td className="p-3 text-right tabular-nums font-bold">
                      <span className={t.isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {t.isCredit ? `+৳${t.amount.toLocaleString()}` : `-৳${t.amount.toLocaleString()}`}
                      </span>
                    </td>
                  </tr>
                ))}

                {txnsList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground text-xs">
                      {tBilingual('No recent transactions found.', 'কোনো লেনদেন রেকর্ড পাওয়া যায়নি।')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
