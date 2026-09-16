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

interface CustomerFinancialSummaryProps {
  summary: CustomerFinancialSummary
  isLoading?: boolean
}

export function CustomerFinancialSummaryCards({
  summary,
  isLoading = false,
}: CustomerFinancialSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 animate-pulse"
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
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
        <CardContent className="p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Total Billed</span>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
            ৳{summary.totalInvoiceAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Across {summary.totalInvoices} invoice{summary.totalInvoices === 1 ? '' : 's'}
          </p>
        </CardContent>
      </Card>

      {/* 2. Total Paid */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
        <CardContent className="p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Total Paid</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
            ৳{summary.totalPaid.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 truncate">
            Verified collections
          </p>
        </CardContent>
      </Card>

      {/* 3. Current Due */}
      <Card
        className={cn(
          'border shadow-sm transition-colors',
          hasDue
            ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
        )}
      >
        <CardContent className="p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-xs font-bold',
                hasDue ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
              )}
            >
              Current Due
            </span>
            <AlertCircle
              className={cn('h-4 w-4', hasDue ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')}
            />
          </div>
          <div
            className={cn(
              'text-lg sm:text-xl font-black truncate',
              hasDue ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white'
            )}
          >
            ৳{summary.totalDue.toLocaleString('en-IN')}
          </div>
          <p
            className={cn(
              'text-[10px] truncate',
              hasDue ? 'text-amber-700/80 dark:text-amber-400/80 font-medium' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            {hasDue ? 'Outstanding balance' : 'All cleared'}
          </p>
        </CardContent>
      </Card>

      {/* 4. Overdue (Past Deadline) */}
      <Card
        className={cn(
          'border shadow-sm transition-colors',
          hasOverdue
            ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
        )}
      >
        <CardContent className="p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-xs font-bold',
                hasOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
              )}
            >
              Overdue
            </span>
            <AlertCircle
              className={cn('h-4 w-4', hasOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400')}
            />
          </div>
          <div
            className={cn(
              'text-lg sm:text-xl font-black truncate',
              hasOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
            )}
          >
            ৳{(summary.totalOverdue || 0).toLocaleString('en-IN')}
          </div>
          <p
            className={cn(
              'text-[10px] truncate',
              hasOverdue ? 'text-rose-600/80 dark:text-rose-400/80 font-medium' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            {hasOverdue ? 'Past payment deadline' : 'No overdue bills'}
          </p>
        </CardContent>
      </Card>

      {/* 5. Credit Limit & Available Credit */}
      <Card
        className={cn(
          'border shadow-sm bg-white dark:bg-slate-950 transition-colors',
          creditLimit > 0 && summary.totalDue > creditLimit
            ? 'border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20'
            : 'border-slate-200 dark:border-slate-800'
        )}
      >
        <CardContent className="p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Available Credit</span>
            <CreditCard
              className={cn(
                'h-4 w-4',
                creditLimit > 0 && summary.totalDue > creditLimit ? 'text-rose-500' : 'text-cyan-500'
              )}
            />
          </div>
          <div
            className={cn(
              'text-lg sm:text-xl font-bold truncate',
              creditLimit > 0 && summary.totalDue > creditLimit
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-900 dark:text-white'
            )}
          >
            {creditLimit > 0 ? `৳${availableCredit.toLocaleString('en-IN')}` : 'No Limit'}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 truncate">
            <span>{creditLimit > 0 ? `Limit: ৳${creditLimit.toLocaleString('en-IN')}` : 'Pay per order'}</span>
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
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
        <CardContent className="p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Last Payment</span>
            <ShoppingBag className="h-4 w-4 text-purple-500" />
          </div>
          {summary.lastPayment ? (
            <>
              <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">
                ৳{summary.lastPayment.amount.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {summary.lastPayment.date}
              </p>
            </>
          ) : summary.lastOrder ? (
            <>
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {summary.lastOrder.orderNumber}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {summary.lastOrder.date}
              </p>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-slate-400 dark:text-slate-600">None</div>
              <p className="text-[10px] text-slate-400">No activity yet</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
