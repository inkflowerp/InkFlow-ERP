'use client'

import React, { useState } from 'react'
import {
 FileText,
 Printer,
 Download,
 Calendar,
 Wallet,
 Building2,
 Smartphone,
 ArrowDownLeft,
 ArrowUpRight,
 ArrowLeftRight,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { AccountRecord, FinancialTransactionRecord } from '@/types/finance.types'

export interface AccountStatementModalProps {
 isOpen: boolean
 onClose: () => void
 account: AccountRecord | null
 transactions: FinancialTransactionRecord[]
 timeframeLabel?: string
}

export function AccountStatementModal({
 isOpen,
 onClose,
 account,
 transactions,
 timeframeLabel = 'Current Period',
}: AccountStatementModalProps) {
 const { tBilingual } = useI18n()

 if (!account) return null

  // Filter transactions involving this account
 const accountEntries = transactions
    .filter((t) => {
 if (!t.lines || t.lines.length === 0) return false
 return t.lines.some((l) => l.account_id === account.id)
    })
    .map((t) => {
 const line = t.lines?.find((l) => l.account_id === account.id)
 const debit = Number(line?.debit || 0)
 const credit = Number(line?.credit || 0)

      // Inflow vs Outflow for Asset (Cash/Bank/MFS)
 const isInflow = debit > 0
 const amount = isInflow ? debit : credit

 return {
 id: t.id,
 date: t.transaction_date,
 number: t.transaction_number,
 type: t.transaction_type,
 narration: t.narration || line?.memo || 'Transaction',
 isInflow,
 amount,
 debit,
 credit,
      }
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Calculate running balances
 let running = Number(account.opening_balance || 0)
 const statementLines = accountEntries.map((entry) => {
 if (entry.isInflow) {
 running += entry.amount
    } else {
 running -= entry.amount
    }
 return {
      ...entry,
 balanceAfter: running,
    }
  })

 const totalInflow = statementLines.filter((l) => l.isInflow).reduce((s, l) => s + l.amount, 0)
 const totalOutflow = statementLines.filter((l) => !l.isInflow).reduce((s, l) => s + l.amount, 0)

 const handlePrint = () => {
 window.print()
  }

 const handleExportCSV = () => {
 const rows = [
      ['PrintERP - Official Account Statement'],
      ['Account Name', account.name],
      ['Account Code', account.code],
      ['Account Type', account.account_subtype],
      ['Period', timeframeLabel],
      ['Opening Balance', String(account.opening_balance)],
      ['Current Balance', String(account.current_balance)],
      [],
      ['Date', 'Txn #', 'Description', 'Inflow (+)', 'Outflow (-)', 'Balance'],
    ]

 for (const l of statementLines) {
 rows.push([
 l.date,
 l.number,
        `"${l.narration}"`,
 l.isInflow ? String(l.amount) : '',
        !l.isInflow ? String(l.amount) : '',
 String(l.balanceAfter),
      ])
    }

 const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((r) => r.join(',')).join('\n')
 const link = document.createElement('a')
 link.setAttribute('href', encodeURI(csvContent))
 link.setAttribute('download', `account_statement_${account.code}_${new Date().toISOString().split('T')[0]}.csv`)
 document.body.appendChild(link)
 link.click()
 document.body.removeChild(link)
  }

 return (
    <ModalDialog
 open={isOpen}
 onOpenChange={(open) => !open && onClose()}
 title={`${account.name} — ${tBilingual('Account Statement', 'হিসাব বিবরণী')}`}
 description={`${account.code} • ${account.account_subtype} • ${timeframeLabel}`}
 size="xl"hideFooter
    >
      <div className="space-y-4">
        {/* Account Info Header Banner */}
        <div className="p-4 rounded-xl bg-muted dark:bg-muted border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              {account.account_subtype === 'CASH' && <Wallet className="w-6 h-6"/>}
              {account.account_subtype === 'BANK' && <Building2 className="w-6 h-6"/>}
              {account.account_subtype === 'MFS' && <Smartphone className="w-6 h-6"/>}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">{account.name}</span>
                <Badge variant="outline"className="text-3xs uppercase tabular-nums">
                  {account.account_subtype}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {account.metadata?.bank_name || account.metadata?.mfs_provider || 'PrintERP Money Account'}
                {account.metadata?.account_number_masked ? ` • ${account.metadata.account_number_masked}` : ''}
                {account.metadata?.mfs_wallet_number ? ` • ${account.metadata.mfs_wallet_number}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-3xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {tBilingual('Opening Balance', 'প্রারম্ভিক ব্যালেন্স')}
              </span>
              <span className="text-sm tabular-nums font-semibold text-foreground">
                ৳{account.opening_balance.toLocaleString()}
              </span>
            </div>
            <div className="pl-4 border-l border-border">
              <span className="text-3xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                {tBilingual('Current Balance', 'বর্তমান স্থিতি')}
              </span>
              <span className="text-lg tabular-nums font-black text-foreground">
                ৳{account.current_balance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Statement Summary Strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/60">
            <span className="text-3xs font-semibold text-emerald-700 dark:text-emerald-400 block uppercase">
              {tBilingual('Total Inflows (+)', 'মোট জমা (+)')}
            </span>
            <span className="text-base tabular-nums font-bold text-emerald-700 dark:text-emerald-300">
              +৳{totalInflow.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/60">
            <span className="text-3xs font-semibold text-rose-700 dark:text-rose-400 block uppercase">
              {tBilingual('Total Outflows (-)', 'মোট খরচ (-)')}
            </span>
            <span className="text-base tabular-nums font-bold text-rose-700 dark:text-rose-300">
              -৳{totalOutflow.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/60">
            <span className="text-3xs font-semibold text-blue-700 dark:text-blue-400 block uppercase">
              {tBilingual('Net Movement', 'নিট তারতম্য')}
            </span>
            <span className="text-base tabular-nums font-bold text-blue-700 dark:text-blue-300">
              {totalInflow - totalOutflow >= 0 ? '+' : ''}৳{(totalInflow - totalOutflow).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Statement Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-foreground font-semibold sticky top-0 z-10 border-b border-border">
                <tr>
                  <th className="p-2.5">{tBilingual('Date', 'তারিখ')}</th>
                  <th className="p-2.5">{tBilingual('Voucher #', 'ভাউচার')}</th>
                  <th className="p-2.5">{tBilingual('Description', 'বিবরণ')}</th>
                  <th className="p-2.5 text-right">{tBilingual('Inflow (+)', 'জমা (+)')}</th>
                  <th className="p-2.5 text-right">{tBilingual('Outflow (-)', 'খরচ (-)')}</th>
                  <th className="p-2.5 text-right">{tBilingual('Balance', 'স্থিতি')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border/60">
                <tr className="bg-muted dark:bg-muted/40 text-muted-foreground font-medium italic">
                  <td className="p-2.5">-</td>
                  <td className="p-2.5 tabular-nums text-3xs">OPENING</td>
                  <td className="p-2.5">{tBilingual('Opening Balance brought forward', 'প্রারম্ভিক উদ্বৃত্ত')}</td>
                  <td className="p-2.5 text-right tabular-nums">-</td>
                  <td className="p-2.5 text-right tabular-nums">-</td>
                  <td className="p-2.5 text-right tabular-nums font-bold text-foreground">
                    ৳{account.opening_balance.toLocaleString()}
                  </td>
                </tr>

                {statementLines.map((line) => (
                  <tr key={line.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                    <td className="p-2.5 tabular-nums text-muted-foreground whitespace-nowrap">
                      {line.date}
                    </td>
                    <td className="p-2.5 tabular-nums text-3xs font-medium text-blue-600 dark:text-blue-400">
                      {line.number}
                    </td>
                    <td className="p-2.5 font-medium text-foreground max-w-[220px] truncate">
                      {line.narration}
                    </td>
                    <td className="p-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                      {line.isInflow ? `+৳${line.amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-2.5 text-right tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
                      {!line.isInflow ? `-৳${line.amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-2.5 text-right tabular-nums font-bold text-foreground">
                      ৳{line.balanceAfter.toLocaleString()}
                    </td>
                  </tr>
                ))}

                {statementLines.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">
                      {tBilingual('No transaction entries recorded for this account.', 'এই অ্যাকাউন্টে কোনো লেনদেনের রেকর্ড পাওয়া যায়নি।')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
 type="button"variant="outline"size="sm"onClick={handleExportCSV}
 className="text-xs h-8 rounded-xl flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5"/>
            <span>{tBilingual('Download CSV', 'সিএসভি ডাউনলোড')}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
 type="button"variant="outline"size="sm"onClick={handlePrint}
 className="text-xs h-8 rounded-xl flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5"/>
              <span>{tBilingual('Print Statement', 'প্রিন্ট')}</span>
            </Button>
            <Button
 type="button"size="sm"onClick={onClose}
 className="bg-surface-inset text-foreground text-xs h-8 rounded-xl font-semibold">
              {tBilingual('Close', 'বন্ধ করুন')}
            </Button>
          </div>
        </div>
      </div>
    </ModalDialog>
  )
}
