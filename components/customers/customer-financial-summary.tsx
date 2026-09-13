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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Invoices */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
        <CardContent className="p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Invoices</span>
            <FileText className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {summary.totalInvoices}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Valid sales bills
          </p>
        </CardContent>
      </Card>

      {/* 2. Total Invoiced Amount */}
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
            Cumulative business
          </p>
        </CardContent>
      </Card>

      {/* 3. Total Paid */}
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

      {/* 4. Total Outstanding Due */}
      <Card
        className={cn(
          'border shadow-sm transition-colors',
          hasDue
            ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
        )}
      >
        <CardContent className="p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-xs font-bold',
                hasDue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
              )}
            >
              Current Due
            </span>
            <AlertCircle
              className={cn('h-4 w-4', hasDue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400')}
            />
          </div>
          <div
            className={cn(
              'text-lg sm:text-xl font-black truncate',
              hasDue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
            )}
          >
            ৳{summary.totalDue.toLocaleString('en-IN')}
          </div>
          <p
            className={cn(
              'text-[10px] truncate',
              hasDue ? 'text-rose-600/80 dark:text-rose-400/80 font-medium' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            {hasDue ? 'Action needed' : 'All cleared'}
          </p>
        </CardContent>
      </Card>

      {/* 5. Last Payment */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
        <CardContent className="p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Last Payment</span>
            <CreditCard className="h-4 w-4 text-cyan-500" />
          </div>
          {summary.lastPayment ? (
            <>
              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                ৳{summary.lastPayment.amount.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {summary.lastPayment.date}
              </p>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-slate-400 dark:text-slate-600">None</div>
              <p className="text-[10px] text-slate-400">No payment yet</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* 6. Last Order */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
        <CardContent className="p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Last Order</span>
            <ShoppingBag className="h-4 w-4 text-purple-500" />
          </div>
          {summary.lastOrder ? (
            <>
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate" title={summary.lastOrder.orderNumber}>
                {summary.lastOrder.orderNumber}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {summary.lastOrder.date}
              </p>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-slate-400 dark:text-slate-600">None</div>
              <p className="text-[10px] text-slate-400">No orders yet</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
