'use client'

import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Activity,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { CashFlowStatement } from '@/types/finance.types'

interface CashFlowViewProps {
  statement: CashFlowStatement | null
  isLoading?: boolean
}

export function CashFlowView({ statement, isLoading }: CashFlowViewProps) {
  const { tBilingual } = useI18n()

  if (isLoading || !statement) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm animate-pulse">
        {tBilingual('Loading Cash Flow Statement...', 'ক্যাশ ফ্লো স্টেটমেন্ট লোড হচ্ছে...')}
      </div>
    )
  }

  const {
    opening_cash_balance,
    operating_activities,
    investing_activities,
    financing_activities,
    net_cash_movement,
    closing_cash_balance,
  } = statement

  return (
    <div className="space-y-6">
      {/* 1. Cash Position Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs p-4">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tBilingual('Opening Cash Balance', 'প্রারম্ভিক নগদ তহবিল')}
          </span>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1">
            ৳{opening_cash_balance.toLocaleString()}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs p-4">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tBilingual('Net Cash Movement', 'নগদ তহবিলের নিট পরিবর্তন')}
          </span>
          <div
            className={`text-xl font-bold mt-1 ${
              net_cash_movement >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {net_cash_movement >= 0 ? `+৳${net_cash_movement.toLocaleString()}` : `-৳${Math.abs(net_cash_movement).toLocaleString()}`}
          </div>
        </Card>

        <Card className="rounded-2xl border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs p-4">
          <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
            {tBilingual('Closing Cash Balance', 'সমাপনী নগদ তহবিল')}
          </span>
          <div className="text-xl font-bold text-blue-800 dark:text-blue-200 mt-1">
            ৳{closing_cash_balance.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* 2. Detailed Cash Flow Breakdown */}
      <div className="space-y-4">
        {/* Operating Activities */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>{tBilingual('1. Cash Flows from Operating Activities', '১. পরিচালন কার্যক্রম থেকে নগদ প্রবাহ')}</span>
              </CardTitle>
              <span className={`text-sm font-bold ${operating_activities.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ৳{operating_activities.total.toLocaleString()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>{tBilingual('Customer Cash & MFS Receipts', 'গ্রাহক থেকে নগদ ও বিকাশ প্রাপ্তি')}</span>
              <span className="text-emerald-600 font-semibold">+৳{operating_activities.customer_receipts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>{tBilingual('Supplier Payments for Materials', 'সরবরাহকারীকে কাঁচামাল বাবদ পরিশোধ')}</span>
              <span className="text-rose-600 font-semibold">-৳{operating_activities.supplier_payments.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>{tBilingual('Operating Expenses Paid (Rent, Utility, Salary)', 'পরিচালন ব্যয় পরিশোধ (ভাড়া, বেতন, বিল)')}</span>
              <span className="text-rose-600 font-semibold">-৳{operating_activities.operating_expenses_paid.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Investing Activities */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600" />
                <span>{tBilingual('2. Cash Flows from Investing Activities', '২. বিনিয়োগ কার্যক্রম থেকে নগদ প্রবাহ')}</span>
              </CardTitle>
              <span className={`text-sm font-bold ${investing_activities.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ৳{investing_activities.total.toLocaleString()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>{tBilingual('Purchase of Machinery & Equipment', 'যন্ত্রপাতি ও সরঞ্জাম ক্রয়')}</span>
              <span className="text-rose-600 font-semibold">
                {investing_activities.equipment_purchases > 0 ? `-৳${investing_activities.equipment_purchases.toLocaleString()}` : '৳0'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Financing Activities */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span>{tBilingual('3. Cash Flows from Financing Activities', '৩. অর্থায়ন কার্যক্রম থেকে নগদ প্রবাহ')}</span>
              </CardTitle>
              <span className={`text-sm font-bold ${financing_activities.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ৳{financing_activities.total.toLocaleString()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>{tBilingual('Owner Capital Injections', 'মালিকের নতুন মূলধন বিনিয়োগ')}</span>
              <span className="text-emerald-600 font-semibold">+৳{financing_activities.capital_injections.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>{tBilingual('Owner Drawings / Withdrawals', 'মালিকের ব্যক্তিগত উত্তোলন')}</span>
              <span className="text-rose-600 font-semibold">
                {financing_activities.owner_drawings > 0 ? `-৳${financing_activities.owner_drawings.toLocaleString()}` : '৳0'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
