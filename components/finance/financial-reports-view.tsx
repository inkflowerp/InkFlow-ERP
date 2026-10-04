'use client'

import React, { useState, useMemo } from 'react'
import {
 BarChart3,
 TrendingUp,
 TrendingDown,
 ArrowLeftRight,
 Printer,
 Download,
 Calendar,
 Wallet,
 Building2,
 Smartphone,
 Users,
 ShoppingBag,
 FileText,
 Clock,
 CheckCircle2,
 PieChart,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type {
 AccountRecord,
 FinancialTransactionRecord,
 ReceivablesAgingSummary,
 PayablesAgingSummary,
 ExpenseSummaryReport,
} from '@/types/finance.types'

export interface FinancialReportsViewProps {
 accounts: AccountRecord[]
 transactions?: FinancialTransactionRecord[]
 receivables: ReceivablesAgingSummary | null
 payables: PayablesAgingSummary | null
 expensesReport: ExpenseSummaryReport | null
 timeframeLabel?: string
}

export function FinancialReportsView({
 accounts,
 transactions = [],
 receivables,
 payables,
 expensesReport,
 timeframeLabel = 'This Month',
}: FinancialReportsViewProps) {
 const { tBilingual } = useI18n()
 const [activeReport, setActiveReport] = useState<'income_expense' | 'cash_flow' | 'receivables' | 'payables' | 'statement'>('income_expense')
 const [selectedStatementAccountId, setSelectedStatementAccountId] = useState<string>(accounts[0]?.id || '')

  // Liquid accounts for statement selector
 const liquidAccounts = accounts.filter(
    (a) => a.account_subtype === 'CASH' || a.account_subtype === 'BANK' || a.account_subtype === 'MFS'
  )

  // Inflow vs Outflow calculations
 const { totalInflow, totalOutflow, expenseByCategory } = useMemo(() => {
 let inflow = 0
 let outflow = 0
 const catMap = new Map<string, number>()

 for (const t of transactions) {
 const amt = Number(t.total_amount || 0)
 if (t.transaction_type === 'CUSTOMER_PAYMENT' || t.transaction_type === 'SALES_INVOICE') {
 inflow += amt
      } else if (t.transaction_type === 'EXPENSE' || t.transaction_type === 'SUPPLIER_PAYMENT') {
 outflow += amt
 const cat = t.transaction_type === 'SUPPLIER_PAYMENT' ? 'Supplier Purchases' : (t.narration || 'General Expense')
 catMap.set(cat, (catMap.get(cat) || 0) + amt)
      }
    }

 if (inflow === 0 && (expensesReport?.total_expenses ?? 0) > 0) {
 outflow = expensesReport!.total_expenses
    }

 return {
 totalInflow: inflow,
 totalOutflow: outflow,
 expenseByCategory: Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]) as [string, number][],
    }
  }, [transactions, expensesReport])

 const netSurplus = totalInflow - totalOutflow

  // Current liquid cash balance
 const currentTotalLiquid = accounts
    .filter((a) => a.account_subtype === 'CASH' || a.account_subtype === 'BANK' || a.account_subtype === 'MFS')
    .reduce((s, a) => s + Number(a.current_balance || 0), 0)

  // Account statement entries for selected account
 const selectedAccount = accounts.find((a) => a.id === selectedStatementAccountId) || liquidAccounts[0]

 interface StatementRow {
 id: string
 date: string
 number: string
 memo: string
 isInflow: boolean
 amount: number
 runningBalance: number
  }

 const statementLines: StatementRow[] = useMemo(() => {
 if (!selectedAccount) return []
 let running = Number(selectedAccount.opening_balance || 0)

 const mapped: StatementRow[] = (transactions || [])
      .filter((t) => t.lines?.some((l: any) => l.account_id === selectedAccount.id))
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())
      .map((t) => {
 const line = t.lines?.find((l: any) => l.account_id === selectedAccount.id)
 const debit = Number(line?.debit || 0)
 const credit = Number(line?.credit || 0)
 const isInflow = debit > 0
 const amt = isInflow ? debit : credit

 if (isInflow) running += amt
 else running -= amt

 return {
 id: t.id,
 date: t.transaction_date,
 number: t.transaction_number,
 memo: t.narration || line?.memo || 'Transaction',
 isInflow,
 amount: amt,
 runningBalance: running,
        }
      })

 return mapped
  }, [transactions, selectedAccount])

 const handlePrint = () => {
 window.print()
  }

 return (
    <div className="space-y-6">
      {/* 1. TOP REPORT TABS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div className="flex flex-wrap items-center gap-1.5 bg-muted p-1 rounded-xl">
          <button
 type="button"onClick={() => setActiveReport('income_expense')}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeReport === 'income_expense'
                ? 'bg-card text-primary text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Income & Expense', 'আয় ও ব্যয়')}
          </button>

          <button
 type="button"onClick={() => setActiveReport('cash_flow')}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeReport === 'cash_flow'
                ? 'bg-card text-success text-success shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Cash Flow', 'ক্যাশ ফ্লো')}
          </button>

          <button
 type="button"onClick={() => setActiveReport('receivables')}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeReport === 'receivables'
                ? 'bg-card text-warning text-warning shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Customer Due Report', 'বাকি আদায়')}
          </button>

          <button
 type="button"onClick={() => setActiveReport('payables')}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeReport === 'payables'
                ? 'bg-card text-destructive text-destructive shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Supplier Due Report', 'মহাজন দেনা')}
          </button>

          <button
 type="button"onClick={() => setActiveReport('statement')}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeReport === 'statement'
                ? 'bg-card text-primary text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Account Statements', 'হিসাব বিবরণী')}
          </button>
        </div>

        <Button
 size="sm"variant="outline"onClick={handlePrint}
 className="text-xs h-8 px-3 rounded-xl border-border bg-card font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto">
          <Printer className="w-3.5 h-3.5"/>
          <span>{tBilingual('Print Report', 'প্রিন্ট')}</span>
        </Button>
      </div>

      {/* 2. REPORT CONTENT PANELS */}

      {/* Report 1: Income & Expense */}
      {activeReport === 'income_expense' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-xl border-border p-5 bg-card shadow-xs">
              <span className="text-xs uppercase font-semibold text-muted-foreground block">
                {tBilingual('Total Money In (Revenue/Collections)', 'মোট আয় ও কালেকশন')}
              </span>
              <span className="text-2xl sm:text-3xl font-black tabular-nums text-success text-success mt-1 block">
                +৳{totalInflow.toLocaleString()}
              </span>
              <p className="text-xs text-success/80 mt-1">{tBilingual('Invoice receipts & deposits', 'আদায়কৃত বিল')}</p>
            </Card>

            <Card className="rounded-xl border-border p-5 bg-card shadow-xs">
              <span className="text-xs uppercase font-semibold text-muted-foreground block">
                {tBilingual('Total Money Out (Expenditures)', 'মোট খরচ ও বিল পরিশোধ')}
              </span>
              <span className="text-2xl sm:text-3xl font-black tabular-nums text-destructive text-destructive mt-1 block">
                -৳{totalOutflow.toLocaleString()}
              </span>
              <p className="text-xs text-destructive/80 mt-1">{tBilingual('Operating & supplier payouts', 'পরিচালন ও মহাজন বিল')}</p>
            </Card>

            <Card className="rounded-xl border-border p-5 bg-card shadow-xs">
              <span className="text-xs uppercase font-semibold text-muted-foreground block">
                {tBilingual('Net Cash Surplus / Margin', 'নিট নগদ উদ্বৃত্ত')}
              </span>
              <span className={`text-2xl sm:text-3xl font-black tabular-nums mt-1 block ${netSurplus >= 0 ? 'text-success' : 'text-destructive'}`}>
                {netSurplus >= 0 ? '+' : ''}৳{netSurplus.toLocaleString()}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {netSurplus >= 0 ? tBilingual('Positive operating cash flow', 'ধনাত্মক নগদ উদ্বৃত্ত') : tBilingual('Deficit cash flow', 'ঘাটতি')}
              </p>
            </Card>
          </div>

          {/* Expense Category Breakdown */}
          <Card className="rounded-xl border-border shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground">
                {tBilingual('Expense Breakdown by Category', 'খাতভিত্তিক ব্যয় বিবরণী')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {expenseByCategory.slice(0, 8).map(([cat, amt]) => {
 const amtNum = Number(amt)
 const pct = totalOutflow > 0 ? Math.round((amtNum / totalOutflow) * 100) : 0
 return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-foreground">
                      <span>{cat}</span>
                      <span className="tabular-nums text-destructive">৳{amtNum.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                      <div className="bg-destructive h-full rounded-full"style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                )
              })}

              {expenseByCategory.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-6">
                  {tBilingual('No categorized expenses logged in this timeframe.', 'কোনো খরচের রেকর্ড পাওয়া যায়নি।')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report 2: Cash Flow */}
      {activeReport === 'cash_flow' && (
        <Card className="rounded-xl border-border shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">
              {tBilingual('Cash Flow Statement', 'ক্যাশ ফ্লো স্টেটমেন্ট')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="flex justify-between font-bold pb-2 border-b">
              <span>{tBilingual('1. Cash Inflows (Operating Collections)', '১. নগদ জমা (আদায় ও কালেকশন)')}</span>
              <span className="text-success tabular-nums">+৳{totalInflow.toLocaleString()}</span>
            </div>

            <div className="flex justify-between font-bold pb-2 border-b">
              <span>{tBilingual('2. Cash Outflows (Expenses & Payments)', '২. নগদ খরচ ও বিল পরিশোধ')}</span>
              <span className="text-destructive tabular-nums">-৳{totalOutflow.toLocaleString()}</span>
            </div>

            <div className="flex justify-between font-bold text-sm bg-muted dark:bg-muted p-3 rounded-xl">
              <span>{tBilingual('Net Cash In/Out', 'নিট নগদ প্রবাহ')}</span>
              <span className={`tabular-nums ${netSurplus >= 0 ? 'text-success' : 'text-destructive'}`}>
                {netSurplus >= 0 ? '+' : ''}৳{netSurplus.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between font-bold text-base bg-success-surface bg-success-surface p-4 rounded-xl text-success text-success border border-success-border">
              <span>{tBilingual('Total Money in Hand & Bank', 'বর্তমান মোট নগদ ও ব্যাংক স্থিতি')}</span>
              <span className="tabular-nums">৳{currentTotalLiquid.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report 3: Receivables */}
      {activeReport === 'receivables' && (
        <Card className="rounded-xl border-border shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">
              {tBilingual('Customer Due Report', 'কাস্টমার বকেয়া ও কালেকশন রিপোর্ট')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted font-semibold border-b">
                  <tr>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3 text-right">Billed</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Due</th>
                    <th className="p-3 text-center">Bucket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border/50">
                  {(receivables?.items || []).map((i) => (
                    <tr key={i.reference_id} className="hover:bg-muted">
                      <td className="p-3 font-semibold">{i.party_name}</td>
                      <td className="p-3 tabular-nums text-primary">{i.reference_id}</td>
                      <td className="p-3 text-right tabular-nums">৳{i.total_amount.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums text-success">৳{i.paid_amount.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums font-bold text-warning">৳{i.due_amount.toLocaleString()}</td>
                      <td className="p-3 text-center tabular-nums text-xs">{i.bucket}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report 4: Payables */}
      {activeReport === 'payables' && (
        <Card className="rounded-xl border-border shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">
              {tBilingual('Supplier Due Report', 'মহাজন দেনা রিপোর্ট')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted font-semibold border-b">
                  <tr>
                    <th className="p-3">Supplier</th>
                    <th className="p-3">Bill #</th>
                    <th className="p-3 text-right">Total Purchase</th>
                    <th className="p-3 text-right">Disbursed</th>
                    <th className="p-3 text-right">Net Payable</th>
                    <th className="p-3 text-center">Aging</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border/50">
                  {(payables?.items || []).map((i) => (
                    <tr key={i.reference_id} className="hover:bg-muted">
                      <td className="p-3 font-semibold">{i.party_name}</td>
                      <td className="p-3 tabular-nums text-muted-foreground">{i.reference_id}</td>
                      <td className="p-3 text-right tabular-nums">৳{i.total_amount.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums text-success">৳{i.paid_amount.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums font-bold text-destructive">৳{i.due_amount.toLocaleString()}</td>
                      <td className="p-3 text-center tabular-nums text-xs">{i.bucket}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report 5: Account Statements */}
      {activeReport === 'statement' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {tBilingual('Select Money Account', 'হিসাব নির্বাচন করুন')}
              </span>
              <select
 value={selectedStatementAccountId}
 onChange={(e) => setSelectedStatementAccountId(e.target.value)}
 className="mt-1 h-9 rounded-xl bg-muted border border-border px-3 text-xs font-bold">
                {liquidAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.account_subtype}) — ৳{Number(a.current_balance || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {selectedAccount && (
              <div className="text-right">
                <span className="text-xs text-muted-foreground block uppercase font-semibold">Current Balance</span>
                <span className="text-xl font-black tabular-nums text-primary text-primary">
                  ৳{Number(selectedAccount.current_balance || 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <Card className="rounded-xl border-border shadow-xs overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted font-semibold border-b">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Voucher #</th>
                      <th className="p-3">Memo</th>
                      <th className="p-3 text-right">Inflow (+)</th>
                      <th className="p-3 text-right">Outflow (-)</th>
                      <th className="p-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border/50">
                    {statementLines.map((l) => (
                      <tr key={l.id} className="hover:bg-muted">
                        <td className="p-3 tabular-nums text-muted-foreground">{l.date}</td>
                        <td className="p-3 tabular-nums text-primary">{l.number}</td>
                        <td className="p-3">{l.memo}</td>
                        <td className="p-3 text-right tabular-nums text-success">
                          {l.isInflow ? `+৳${l.amount.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-3 text-right tabular-nums text-destructive">
                          {!l.isInflow ? `-৳${l.amount.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-3 text-right tabular-nums font-bold">
                          ৳{l.runningBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))}

                    {statementLines.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">
                          {tBilingual('No entries found for this account in the selected period.', 'কোনো লেনদেন রেকর্ড পাওয়া যায়নি।')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
