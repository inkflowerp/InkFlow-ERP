'use client'

import React from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  Scale,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { TrialBalanceStatement } from '@/types/finance.types'

interface TrialBalanceViewProps {
  statement: TrialBalanceStatement | null
  isLoading?: boolean
}

export function TrialBalanceView({ statement, isLoading }: TrialBalanceViewProps) {
  const { tBilingual } = useI18n()

  if (isLoading || !statement) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm animate-pulse">
        {tBilingual('Loading Trial Balance...', 'রেওয়ামিল (ট্রায়াল ব্যালেন্স) লোড হচ্ছে...')}
      </div>
    )
  }

  const { total_debit, total_credit, is_balanced, accounts } = statement

  return (
    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-600" />
            <span>{tBilingual('Trial Balance Statement (রেওয়ামিল)', 'রেওয়ামিল বিবরণী')}</span>
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {tBilingual('As of Date:', 'তারিখ:')} {statement.as_of_date}
          </p>
        </div>

        <Badge
          className={`text-xs font-semibold ${
            is_balanced
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {is_balanced ? (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{tBilingual('Balanced (Debit = Credit)', 'ডেবিট = ক্রেডিট মিলেছে')}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{tBilingual('Unbalanced', 'অমিল আছে')}</span>
            </span>
          )}
        </Badge>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 w-20">{tBilingual('Code', 'কোড')}</th>
                <th className="p-3">{tBilingual('Account Name', 'হিসাবের নাম')}</th>
                <th className="p-3 w-28">{tBilingual('Type', 'ধরন')}</th>
                <th className="p-3 text-right w-32">{tBilingual('Debit (৳)', 'ডেবিট (৳)')}</th>
                <th className="p-3 text-right w-32">{tBilingual('Credit (৳)', 'ক্রেডিট (৳)')}</th>
                <th className="p-3 text-right w-32">{tBilingual('Net Balance (৳)', 'নিট ব্যালেন্স')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {accounts.map((acc) => (
                <tr key={acc.account_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-mono font-medium text-slate-500">{acc.code}</td>
                  <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                    {acc.name} {acc.name_bn ? `(${acc.name_bn})` : ''}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px] font-medium border-slate-300 dark:border-slate-700">
                      {acc.account_type}
                    </Badge>
                  </td>
                  <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    {acc.debit > 0 ? `৳${acc.debit.toLocaleString()}` : '-'}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    {acc.credit > 0 ? `৳${acc.credit.toLocaleString()}` : '-'}
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                    ৳{acc.net_balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100/80 dark:bg-slate-800/80 font-bold border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td colSpan={3} className="p-3 text-right text-xs uppercase tracking-wider">
                  {tBilingual('Total Trial Balance', 'মোট রেওয়ামিল')}
                </td>
                <td className="p-3 text-right font-mono text-sm text-indigo-700 dark:text-indigo-400">
                  ৳{total_debit.toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono text-sm text-indigo-700 dark:text-indigo-400">
                  ৳{total_credit.toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">
                  {is_balanced ? '✓ Balanced' : 'Diff: ৳' + Math.abs(total_debit - total_credit).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
