'use client'

import React, { useState, useMemo } from 'react'
import {
 Receipt,
 Search,
 Filter,
 Download,
 Calendar,
 ArrowDownLeft,
 ArrowUpRight,
 ArrowLeftRight,
 Wallet,
 Building2,
 Smartphone,
 ExternalLink,
 ChevronDown,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { FinancialTransactionRecord, AccountRecord } from '@/types/finance.types'

export interface TransactionsLedgerViewProps {
 transactions: FinancialTransactionRecord[]
 accounts: AccountRecord[]
 isLoading?: boolean
}

export function TransactionsLedgerView({
 transactions = [],
 accounts = [],
 isLoading = false,
}: TransactionsLedgerViewProps) {
 const { tBilingual } = useI18n()
 const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('ALL')
 const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL')
 const [searchQuery, setSearchQuery] = useState('')

  // Map account id to account name & subtype
 const accountMap = useMemo(() => {
 return new Map(accounts.map((a) => [a.id, a]))
  }, [accounts])

  // Normalize transactions into unified entries
 const normalizedEntries = useMemo(() => {
 const list = transactions.map((t) => {
 let isIncome = false
 let isExpense = false
 let isTransfer = false
 let entryType: 'INCOME' | 'EXPENSE' | 'TRANSFER' = 'INCOME'
 let typeLabel = 'Money In'
 let accountDisplay = 'Cash / Bank'

 if (t.transaction_type === 'CUSTOMER_PAYMENT' || t.transaction_type === 'SALES_INVOICE') {
 isIncome = true
 entryType = 'INCOME'
 typeLabel = 'Money In'
      } else if (t.transaction_type === 'ACCOUNT_TRANSFER') {
 isTransfer = true
 entryType = 'TRANSFER'
 typeLabel = 'Transfer'
      } else {
 isExpense = true
 entryType = 'EXPENSE'
 typeLabel = 'Money Out'
      }

      // Determine main account used from lines
 const lineWithAccount = t.lines?.find((l) => {
 const acc = accountMap.get(l.account_id)
 return acc && (acc.account_subtype === 'CASH' || acc.account_subtype === 'BANK' || acc.account_subtype === 'MFS')
      })

 if (lineWithAccount) {
 const acc = accountMap.get(lineWithAccount.account_id)
 if (acc) {
 accountDisplay = `${acc.name} (${acc.code})`
        }
      } else if (t.lines && t.lines[0]) {
 const acc = accountMap.get(t.lines[0].account_id)
 if (acc) accountDisplay = acc.name
      }

 return {
 id: t.id,
 date: t.transaction_date,
 number: t.transaction_number,
 rawType: t.transaction_type,
 entryType,
 typeLabel,
 description: t.narration || t.reference_id || 'Financial Entry',
 referenceId: t.reference_id,
 accountDisplay,
 accountIds: t.lines?.map((l) => l.account_id) || [],
 amount: Number(t.total_amount || 0),
 status: t.status,
      }
    })

 return list
  }, [transactions, accountMap])

  // Calculate totals
 const totals = useMemo(() => {
 let income = 0
 let expense = 0
 let transfer = 0

 for (const entry of normalizedEntries) {
 if (entry.entryType === 'INCOME') income += entry.amount
 else if (entry.entryType === 'EXPENSE') expense += entry.amount
 else if (entry.entryType === 'TRANSFER') transfer += entry.amount
    }

 return {
 income,
 expense,
 transfer,
 net: income - expense,
    }
  }, [normalizedEntries])

  // Filtered transactions
 const filteredEntries = useMemo(() => {
 return normalizedEntries.filter((entry) => {
      // Type filter
 if (filterType !== 'ALL' && entry.entryType !== filterType) return false

      // Account filter
 if (selectedAccountId !== 'ALL' && !entry.accountIds.includes(selectedAccountId)) {
 return false
      }

      // Search query
 if (!searchQuery.trim()) return true
 const q = searchQuery.toLowerCase()
 const matchDesc = entry.description.toLowerCase().includes(q)
 const matchNum = entry.number.toLowerCase().includes(q)
 const matchRef = (entry.referenceId || '').toLowerCase().includes(q)
 const matchAcc = entry.accountDisplay.toLowerCase().includes(q)
 return matchDesc || matchNum || matchRef || matchAcc
    })
  }, [normalizedEntries, filterType, selectedAccountId, searchQuery])

  // CSV Export handler
 const handleExportCSV = () => {
 const rows = [
      ['PrintERP - Unified Transactions Ledger'],
      ['Exported At', new Date().toLocaleString()],
      ['Filter Type', filterType],
      ['Total Records', String(filteredEntries.length)],
      [],
      ['Date', 'Type', 'Voucher / Trx #', 'Description', 'Account', 'Amount (BDT)', 'Status'],
    ]

 for (const e of filteredEntries) {
 rows.push([
 e.date,
 e.typeLabel,
 e.number,
        `"${e.description}"`,
        `"${e.accountDisplay}"`,
 e.entryType === 'INCOME' ? `+${e.amount}` : e.entryType === 'EXPENSE' ? `-${e.amount}` : String(e.amount),
 e.status,
      ])
    }

 const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((r) => r.join(',')).join('\n')
 const link = document.createElement('a')
 link.setAttribute('href', encodeURI(csvContent))
 link.setAttribute('download', `transactions_ledger_${new Date().toISOString().split('T')[0]}.csv`)
 document.body.appendChild(link)
 link.click()
 document.body.removeChild(link)
  }

 return (
    <div className="space-y-6">
      {/* 1. TOP SUMMARY METRICS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-semibold">{tBilingual('Total Money In (Income)', 'মোট জমা (ইনকাম)')}</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-500"/>
          </div>
          <div className="text-xl sm:text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
            +৳{totals.income.toLocaleString()}
          </div>
          <span className="text-3xs text-muted-foreground block mt-1">{tBilingual('Collections & receipts', 'আদায় ও জমা')}</span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-semibold">{tBilingual('Total Money Out (Expense)', 'মোট খরচ (ব্যয়)')}</span>
            <ArrowUpRight className="w-4 h-4 text-rose-500"/>
          </div>
          <div className="text-xl sm:text-2xl font-black tabular-nums text-rose-600 dark:text-rose-400">
            -৳{totals.expense.toLocaleString()}
          </div>
          <span className="text-3xs text-muted-foreground block mt-1">{tBilingual('Overheads & payouts', 'পরিচালন ও মহাজন বিল')}</span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-semibold">{tBilingual('Total Transfers', 'অ্যাকাউন্ট ট্রান্সফার')}</span>
            <ArrowLeftRight className="w-4 h-4 text-blue-500"/>
          </div>
          <div className="text-xl sm:text-2xl font-black tabular-nums text-blue-600 dark:text-blue-400">
            ৳{totals.transfer.toLocaleString()}
          </div>
          <span className="text-3xs text-muted-foreground block mt-1">{tBilingual('Internal movements', 'অভ্যন্তরীণ স্থানান্তর')}</span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-semibold">{tBilingual('Net Cash Movement', 'নিট নগদ প্রবাহ')}</span>
            <Receipt className="w-4 h-4 text-muted-foreground"/>
          </div>
          <div className={`text-xl sm:text-2xl font-black tabular-nums ${totals.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {totals.net >= 0 ? '+' : ''}৳{totals.net.toLocaleString()}
          </div>
          <span className="text-3xs text-muted-foreground block mt-1">{totals.net >= 0 ? tBilingual('Net surplus', 'নগদ উদ্বৃত্ত') : tBilingual('Net deficit', 'ঘাটতি')}</span>
        </div>
      </div>

      {/* 2. FILTER PILLS: ALL · MONEY IN · MONEY OUT · TRANSFER & SEARCH */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl w-fit">
          <button
 type="button"onClick={() => setFilterType('ALL')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 filterType === 'ALL'
                ? 'bg-card text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('All', 'সকল লেনদেন')} ({normalizedEntries.length})
          </button>

          <button
 type="button"onClick={() => setFilterType('INCOME')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
 filterType === 'INCOME'
                ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500"/>
            <span>{tBilingual('Money In (Income)', 'Money In (জমা)')}</span>
          </button>

          <button
 type="button"onClick={() => setFilterType('EXPENSE')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
 filterType === 'EXPENSE'
                ? 'bg-card text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-500"/>
            <span>{tBilingual('Money Out (Expense)', 'Money Out (খরচ)')}</span>
          </button>

          <button
 type="button"onClick={() => setFilterType('TRANSFER')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
 filterType === 'TRANSFER'
                ? 'bg-card text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500"/>
            <span>{tBilingual('Transfer', 'ট্রান্সফার')}</span>
          </button>
        </div>

        {/* Filter Controls: Account selector, search & export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Account Filter Dropdown */}
          <select
 value={selectedAccountId}
 onChange={(e) => setSelectedAccountId(e.target.value)}
 className="h-8.5 text-xs rounded-xl bg-card border border-border px-3 text-foreground font-medium">
            <option value="ALL">{tBilingual('All Accounts (ক্যাশ/ব্যাংক)', 'সকল হিসাব')}</option>
            {accounts
              .filter((a) => a.account_subtype === 'CASH' || a.account_subtype === 'BANK' || a.account_subtype === 'MFS')
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.account_subtype})
                </option>
              ))}
          </select>

          {/* Search Box */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
            <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={tBilingual('Search description, voucher...', 'বিবরণ বা ভাউচার খুঁজুন...')}
 className="h-8.5 pl-8 text-xs rounded-xl bg-card"/>
          </div>

          {/* Export Button */}
          <Button
 onClick={handleExportCSV}
 variant="outline"className="h-8.5 px-3 text-xs rounded-xl border-border bg-card font-semibold flex items-center gap-1.5 cursor-pointer">
            <Download className="w-3.5 h-3.5"/>
            <span>CSV</span>
          </Button>
        </div>
      </div>

      {/* 3. ONE UNIFIED LEDGER TABLE */}
      <Card className="rounded-xl border-border shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3 w-28">{tBilingual('Date', 'তারিখ')}</th>
                  <th className="p-3 w-32">{tBilingual('Type', 'ধরন')}</th>
                  <th className="p-3">{tBilingual('Description & Reference', 'বিবরণ ও রেফারেন্স')}</th>
                  <th className="p-3">{tBilingual('Account', 'হিসাব')}</th>
                  <th className="p-3 text-right">{tBilingual('Amount (৳)', 'পরিমাণ')}</th>
                  <th className="p-3 text-center w-24">{tBilingual('Status', 'অবস্থা')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border/50">
                {filteredEntries.map((entry) => {
 const isIncome = entry.entryType === 'INCOME'
 const isExpense = entry.entryType === 'EXPENSE'
 const isTransfer = entry.entryType === 'TRANSFER'

 return (
                    <tr key={entry.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                      <td className="p-3 tabular-nums text-muted-foreground whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="p-3">
                        <Badge
 variant="outline"className={
 isIncome
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-3xs font-semibold'
                              : isExpense
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 text-3xs font-semibold'
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 text-3xs font-semibold'
                          }
                        >
                          {isIncome ? 'Money In' : isExpense ? 'Money Out' : 'Transfer'}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        <div className="font-semibold text-foreground">
                          {entry.description}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-3xs text-muted-foreground tabular-nums">
                          <span>{entry.number}</span>
                          {entry.referenceId && <span>• Ref: {entry.referenceId}</span>}
                        </div>
                      </td>
                      <td className="p-3 tabular-nums text-2xs text-muted-foreground">
                        {entry.accountDisplay}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-sm">
                        {isIncome && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +৳{entry.amount.toLocaleString()}
                          </span>
                        )}
                        {isExpense && (
                          <span className="text-rose-600 dark:text-rose-400">
                            -৳{entry.amount.toLocaleString()}
                          </span>
                        )}
                        {isTransfer && (
                          <span className="text-blue-600 dark:text-blue-400">
                            ৳{entry.amount.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline"className="text-3xs uppercase tabular-nums px-1.5 py-0 h-4">
                          {entry.status}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}

                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground text-xs">
                      {tBilingual('No transactions found matching your filters.', 'কোনো লেনদেন রেকর্ড পাওয়া যায়নি।')}
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
