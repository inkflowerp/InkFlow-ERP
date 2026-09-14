'use client'

import React from 'react'
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  Building,
  ShieldCheck,
  TrendingUp,
  Layers,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { BalanceSheetStatement } from '@/types/finance.types'

interface BalanceSheetViewProps {
  statement: BalanceSheetStatement | null
  isLoading?: boolean
}

export function BalanceSheetView({ statement, isLoading }: BalanceSheetViewProps) {
  const { tBilingual } = useI18n()

  if (isLoading || !statement) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm animate-pulse">
        {tBilingual('Loading Balance Sheet...', 'ব্যালেন্স শিট লোড হচ্ছে...')}
      </div>
    )
  }

  const { assets, liabilities, equity, is_balanced, imbalance_amount } = statement

  return (
    <div className="space-y-6">
      {/* 1. Accounting Equation Invariant Banner */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between shadow-xs ${
          is_balanced
            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
            : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
        }`}
      >
        <div className="flex items-center gap-3">
          {is_balanced ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <div>
            <h4 className="text-sm font-bold">
              {is_balanced
                ? tBilingual('Double-Entry Books are 100% Balanced', 'অ্যাকাউন্টিং সমীকরণ সম্পূর্ণ সঠিক ও সমান')
                : tBilingual('Balance Sheet Imbalance Detected', 'ব্যালেন্স শিটে অমিল পরিলক্ষিত হয়েছে')}
            </h4>
            <p className="text-xs opacity-90">
              {tBilingual(
                'Assets = Total Liabilities + Total Equity',
                'মোট সম্পদ = মোট দায় + মোট মালিকানা স্বত্ব'
              )}
            </p>
          </div>
        </div>

        <div className="text-right">
          <Badge
            className={`text-xs font-semibold ${
              is_balanced
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-600 text-white'
            }`}
          >
            {is_balanced
              ? tBilingual('Balanced ✓', 'সমান ✓')
              : `Diff: ৳${imbalance_amount.toLocaleString()}`}
          </Badge>
        </div>
      </div>

      {/* 2. Side-by-Side: Assets vs Liabilities & Equity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ASSETS CARD */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                <span>{tBilingual('1. Total Assets', '১. মোট সম্পদ')}</span>
              </CardTitle>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                ৳{assets.total.toLocaleString()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Liquid Assets */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>{tBilingual('Liquid Assets (Cash, Bank, MFS)', 'নগদ, ব্যাংক ও বিকাশ')}</span>
                <span>৳{assets.liquid_assets.total.toLocaleString()}</span>
              </div>
              <div className="pl-3 space-y-1 text-xs text-slate-500 dark:text-slate-400 border-l-2 border-blue-200 dark:border-blue-900">
                {assets.liquid_assets.accounts.map((acc) => (
                  <div key={acc.code} className="flex justify-between">
                    <span>{acc.name}</span>
                    <span>৳{acc.balance.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Receivables */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>{tBilingual('Accounts Receivable (Customer Dues)', 'গ্রাহক দেনাদার হিসাব (বাকি)')}</span>
                <span>৳{assets.receivables.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Inventory */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>{tBilingual('Inventory (Materials & Goods)', 'মজুদ কাঁচামাল ও পণ্য')}</span>
                <span>৳{assets.inventory.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Fixed Assets */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>{tBilingual('Machinery & Fixed Assets', 'মেশিনারি ও স্থায়ী সম্পদ')}</span>
                <span>৳{assets.fixed_assets.total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LIABILITIES & EQUITY CARD */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-600" />
                <span>{tBilingual('2. Liabilities & Equity', '২. মোট দায় ও মূলধন')}</span>
              </CardTitle>
              <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                ৳{(liabilities.total + equity.total).toLocaleString()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            {/* Liabilities Section */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-100 dark:border-slate-800">
                <span>{tBilingual('Total Liabilities', 'মোট দায়')}</span>
                <span>৳{liabilities.total.toLocaleString()}</span>
              </div>
              <div className="pl-3 space-y-1 text-xs text-slate-500 dark:text-slate-400 border-l-2 border-purple-200 dark:border-purple-900">
                <div className="flex justify-between">
                  <span>{tBilingual('Accounts Payable (Suppliers)', 'সরবরাহকারী পাওনাদার')}</span>
                  <span>৳{liabilities.payables.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{tBilingual('Customer Advance Deposits', 'গ্রাহক অগ্রিম জমা')}</span>
                  <span>৳{liabilities.advances.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{tBilingual('VAT & Tax Payable', 'ভ্যাট ও ট্যাক্স প্রদেয়')}</span>
                  <span>৳{liabilities.tax_payable.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Equity Section */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-100 dark:border-slate-800">
                <span>{tBilingual("Owner's Equity & Retained Earnings", 'মালিকানা তহবিল ও সঞ্চিত আয়')}</span>
                <span>৳{equity.total.toLocaleString()}</span>
              </div>
              <div className="pl-3 space-y-1 text-xs text-slate-500 dark:text-slate-400 border-l-2 border-emerald-200 dark:border-emerald-900">
                <div className="flex justify-between">
                  <span>{tBilingual("Owner's Capital", 'মালিকানা মূলধন')}</span>
                  <span>৳{equity.capital.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>{tBilingual('Current Period Net Profit', 'বর্তমান মেয়াদের অর্জিত মুনাফা')}</span>
                  <span>৳{equity.current_period_profit.toLocaleString()}</span>
                </div>
                {equity.drawings > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>{tBilingual('Less: Owner Drawings', 'বাদ: মালিকের উত্তোলন')}</span>
                    <span>-৳{equity.drawings.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
