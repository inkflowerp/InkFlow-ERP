'use client'

import React, { useState } from 'react'
import {
  BookOpen,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import type { GeneralLedgerEntry, AccountRecord } from '@/types/finance.types'

interface GeneralLedgerViewProps {
  entries: GeneralLedgerEntry[]
  accounts: AccountRecord[]
  selectedAccountId?: string
  onSelectAccount: (accId: string) => void
  isLoading?: boolean
}

export function GeneralLedgerView({
  entries,
  accounts,
  selectedAccountId,
  onSelectAccount,
  isLoading,
}: GeneralLedgerViewProps) {
  const { tBilingual } = useI18n()
  const [search, setSearch] = useState('')

  const filteredEntries = entries.filter((e) => {
    if (search) {
      const q = search.toLowerCase()
      return (
        e.transaction_number.toLowerCase().includes(q) ||
        e.narration.toLowerCase().includes(q) ||
        (e.reference_id && e.reference_id.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0">
            {tBilingual('Account:', 'হিসাব:')}
          </label>
          <select
            value={selectedAccountId || 'all'}
            onChange={(e) => onSelectAccount(e.target.value === 'all' ? '' : e.target.value)}
            className="h-9 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex-1"
          >
            <option value="all">{tBilingual('All Accounts (সব হিসাব)', 'সব হিসাব')}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={tBilingual('Search transaction # or memo...', 'ভাউচার বা বিবরণ খুঁজুন...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>{tBilingual('General Ledger Book (খতিয়ান বিবরণী)', 'খতিয়ান বই')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 text-xs animate-pulse">
              {tBilingual('Loading Ledger Entries...', 'খতিয়ান তথ্য লোড হচ্ছে...')}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              {tBilingual('No ledger entries recorded for this filter.', 'কোনো খতিয়ান এন্ট্রি পাওয়া যায়নি।')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-24">{tBilingual('Date', 'তারিখ')}</th>
                    <th className="p-3 w-32">{tBilingual('Txn #', 'ভাউচার নং')}</th>
                    <th className="p-3 w-40">{tBilingual('Account', 'হিসাব')}</th>
                    <th className="p-3">{tBilingual('Narration / Memo', 'বিবরণ')}</th>
                    <th className="p-3 text-right w-28">{tBilingual('Debit (৳)', 'ডেবিট (৳)')}</th>
                    <th className="p-3 text-right w-28">{tBilingual('Credit (৳)', 'ক্রেডিট (৳)')}</th>
                    <th className="p-3 text-right w-32">{tBilingual('Running Bal (৳)', 'চলতি ব্যালেন্স')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 text-slate-500 whitespace-nowrap">{e.transaction_date}</td>
                      <td className="p-3 font-mono font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {e.transaction_number}
                      </td>
                      <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                        {e.account_code} - {e.account_name}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {e.narration}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-800 dark:text-slate-200">
                        {e.debit > 0 ? `৳${e.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-800 dark:text-slate-200">
                        {e.credit > 0 ? `৳${e.credit.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ৳{e.running_balance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
