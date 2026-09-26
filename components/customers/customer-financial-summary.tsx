'use client'

import React from 'react'
import {
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CustomerFinancialSummary } from '@/types/crm.types'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'

interface CustomerFinancialSummaryProps {
  summary: CustomerFinancialSummary
  isLoading?: boolean
}

export function CustomerFinancialSummaryCards({
  summary,
  isLoading = false,
}: CustomerFinancialSummaryProps) {
  const { tBilingual } = useI18n()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-100/60 dark:bg-slate-900/60 animate-pulse"
          />
        ))}
      </div>
    )
  }

  const hasDue = summary.totalDue > 0
  const hasOverdue = (summary.totalOverdue || 0) > 0
  const creditLimit = summary.creditLimit || 0
  const availableCredit = summary.availableCredit !== undefined ? summary.availableCredit : Math.max(0, creditLimit - summary.totalDue)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Billed */}
      <Card className="p-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <CardContent className="p-0 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-2xs font-bold uppercase tracking-wider">{tBilingual('Total Billed', 'মোট বিল')}</span>
            <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-numeric tabular-nums text-slate-900 dark:text-white truncate">
            ৳{summary.totalInvoiceAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-2xs text-slate-500 dark:text-slate-400 truncate">
            {tBilingual(
              `Across ${summary.totalInvoices} invoice${summary.totalInvoices === 1 ? '' : 's'}`,
              `${summary.totalInvoices}টি চালানের মোট`
            )}
          </p>
        </CardContent>
      </Card>

      {/* 2. Total Paid */}
      <Card className="p-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-emerald-200/80 dark:border-emerald-900/40 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <CardContent className="p-0 space-y-1">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-2xs font-bold uppercase tracking-wider">{tBilingual('Total Paid', 'মোট পরিশোধ')}</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-numeric tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
            ৳{summary.totalPaid.toLocaleString('en-IN')}
          </div>
          <p className="text-2xs text-emerald-700/80 dark:text-emerald-400/80 truncate">
            {tBilingual('Verified collections', 'যাচাইকৃত আদায়')}
          </p>
        </CardContent>
      </Card>

      {/* 3. Current Due */}
      <Card
        className={cn(
          'p-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs hover:border-amber-300 dark:hover:border-amber-800 transition-all rounded-2xl relative overflow-hidden group',
          hasDue
            ? 'border-amber-200/80 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/20'
            : 'border-slate-200/80 dark:border-slate-800/80'
        )}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        <CardContent className="p-0 space-y-1">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-2xs font-bold uppercase tracking-wider',
                hasDue ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
              )}
            >
              {tBilingual('Current Due', 'চলতি বকেয়া')}
            </span>
            <AlertCircle
              className={cn('h-3.5 w-3.5', hasDue ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')}
            />
          </div>
          <div
            className={cn(
              'text-lg sm:text-xl font-black font-numeric tabular-nums truncate',
              hasDue ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white'
            )}
          >
            ৳{summary.totalDue.toLocaleString('en-IN')}
          </div>
          <p
            className={cn(
              'text-2xs truncate',
              hasDue ? 'text-amber-700/80 dark:text-amber-400/80 font-medium' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            {hasDue ? tBilingual('Outstanding balance', 'মোট পাওনা বাকি') : tBilingual('All cleared', 'সকল বিল পরিশোধিত')}
          </p>
        </CardContent>
      </Card>

      {/* 4. Overdue (Past Deadline) */}
      <Card
        className={cn(
          'p-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs hover:border-rose-400 dark:hover:border-rose-800 transition-all rounded-2xl relative overflow-hidden group',
          hasOverdue
            ? 'border-rose-300/80 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20'
            : 'border-slate-200/80 dark:border-slate-800/80'
        )}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
        <CardContent className="p-0 space-y-1">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-2xs font-bold uppercase tracking-wider',
                hasOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
              )}
            >
              {tBilingual('Overdue', 'মেয়াদোত্তীর্ণ')}
            </span>
            <AlertCircle
              className={cn('h-3.5 w-3.5', hasOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400')}
            />
          </div>
          <div
            className={cn(
              'text-lg sm:text-xl font-black font-numeric tabular-nums truncate',
              hasOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
            )}
          >
            ৳{(summary.totalOverdue || 0).toLocaleString('en-IN')}
          </div>
          <p
            className={cn(
              'text-2xs truncate',
              hasOverdue ? 'text-rose-600/80 dark:text-rose-400/80 font-medium' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            {hasOverdue ? tBilingual('Past payment deadline', 'সময়সীমা অতিক্রান্ত') : tBilingual('No overdue bills', 'মেয়াদোত্তীর্ণ বিল নেই')}
          </p>
        </CardContent>
      </Card>

      {/* 5. Credit Limit & Available Credit */}
      <Card
        className={cn(
          'p-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all rounded-2xl relative overflow-hidden group',
          creditLimit > 0 && summary.totalDue > creditLimit
            ? 'border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20'
            : 'border-slate-200/80 dark:border-slate-800/80'
        )}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-500" />
        <CardContent className="p-0 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-2xs font-bold uppercase tracking-wider">{tBilingual('Available Credit', 'উপলব্ধ ক্রেডিট')}</span>
            <CreditCard
              className={cn(
                'h-3.5 w-3.5',
                creditLimit > 0 && summary.totalDue > creditLimit ? 'text-rose-500' : 'text-cyan-500'
              )}
            />
          </div>
          <div
            className={cn(
              'text-lg sm:text-xl font-bold font-numeric tabular-nums truncate',
              creditLimit > 0 && summary.totalDue > creditLimit
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-900 dark:text-white'
            )}
          >
            {creditLimit > 0 ? `৳${availableCredit.toLocaleString('en-IN')}` : tBilingual('No Limit', 'লিমিটহীন')}
          </div>
          <div className="flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400 truncate">
            <span>{creditLimit > 0 ? `Limit: ৳${creditLimit.toLocaleString('en-IN')}` : tBilingual('Pay per order', 'অর্ডারভিত্তিক বিল')}</span>
            {creditLimit > 0 && (
              <span
                className={cn(
                  'font-bold ml-1',
                  summary.totalDue > creditLimit
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-600 dark:text-slate-300'
                )}
              >
                {summary.totalDue > creditLimit
                  ? `Over Limit (${Math.round((summary.totalDue / creditLimit) * 100)}%)`
                  : `${Math.round((summary.totalDue / creditLimit) * 100)}% used`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 6. Last Activity (Order / Payment) */}
      <Card className="p-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-600" />
        <CardContent className="p-0 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-2xs font-bold uppercase tracking-wider">{tBilingual('Last Payment', 'সর্বশেষ পরিশোধ')}</span>
            <ShoppingBag className="h-3.5 w-3.5 text-purple-500" />
          </div>
          {summary.lastPayment ? (
            <>
              <div className="text-base sm:text-lg font-bold font-numeric tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
                ৳{summary.lastPayment.amount.toLocaleString('en-IN')}
              </div>
              <p className="text-2xs text-slate-500 dark:text-slate-400 truncate">
                {summary.lastPayment.date}
              </p>
            </>
          ) : summary.lastOrder ? (
            <>
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {summary.lastOrder.orderNumber}
              </div>
              <p className="text-2xs text-slate-500 dark:text-slate-400 truncate">
                {summary.lastOrder.date}
              </p>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-slate-400 dark:text-slate-600">{tBilingual('None', 'নেই')}</div>
              <p className="text-2xs text-slate-400">{tBilingual('No activity yet', 'কোন লেনদেন নেই')}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
