'use client'

import React, { useState, useMemo } from 'react'
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Calendar,
  Wallet,
  Coins,
  FileCheck2,
  RotateCcw,
  Search,
  ShieldCheck,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { CashClosingRecord, AccountRecord } from '@/types/finance.types'
import { submitCashClosingAction } from '@/actions/finance.actions'

export interface CashClosingViewProps {
  cashClosings: CashClosingRecord[]
  accounts: AccountRecord[]
  todayOpeningCash?: number
  todayCashReceived?: number
  todayCashExpenses?: number
  todayCashTransfers?: number
  onSuccessClosing: () => void
  isLoading?: boolean
}

export function CashClosingView({
  cashClosings = [],
  accounts = [],
  todayOpeningCash = 0,
  todayCashReceived = 0,
  todayCashExpenses = 0,
  todayCashTransfers = 0,
  onSuccessClosing,
  isLoading = false,
}: CashClosingViewProps) {
  const { tBilingual } = useI18n()
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'history' | 'variance'>('daily')

  // Find primary cash drawer account
  const cashAccount = accounts.find((a) => a.account_subtype === 'CASH' || a.code === '1010') || accounts[0]
  const todayStr = new Date().toISOString().split('T')[0]

  // Check if today's closing is already recorded & locked
  const todayClosing = cashClosings.find((c) => c.closing_date === todayStr)

  // Live closing formula values
  const openingCash = todayClosing ? Number(todayClosing.opening_cash) : todayOpeningCash
  const cashReceived = todayClosing ? Number(todayClosing.cash_inflows) : todayCashReceived
  const cashExpenses = todayClosing ? Number(todayClosing.cash_outflows) : todayCashExpenses
  const cashTransfers = todayCashTransfers
  const expectedCash = openingCash + cashReceived - cashExpenses - cashTransfers

  // Input state
  const [countedCash, setCountedCash] = useState<string>(
    todayClosing ? String(todayClosing.counted_cash) : ''
  )
  const [varianceReason, setVarianceReason] = useState<string>(todayClosing?.variance_reason || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)
  const [useDenominations, setUseDenominations] = useState(false)

  // Denominations counter
  const [notes, setNotes] = useState<Record<string, number>>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
  })

  const handleDenominationChange = (denom: number, count: number) => {
    const updated = { ...notes, [denom]: Math.max(0, count) }
    setNotes(updated)
    const sum = Object.entries(updated).reduce((s, [d, c]) => s + Number(d) * Number(c), 0)
    setCountedCash(String(sum))
  }

  const actualCounted = parseFloat(countedCash) || 0
  const variance = actualCounted - expectedCash
  const isBalanced = Math.abs(variance) < 0.01

  const handleLockClosing = async () => {
    if (!cashAccount) return
    setIsSubmitting(true)
    setFeedbackMsg(null)

    try {
      const res = await submitCashClosingAction({
        accountId: cashAccount.id,
        closingDate: todayStr,
        countedCash: actualCounted,
        varianceReason: varianceReason.trim() || undefined,
      })

      if (res.success) {
        setFeedbackMsg(tBilingual("Today's cash closing confirmed & locked successfully! ✓", 'আজকের ক্যাশ ক্লোজিং সম্পন্ন ও লক করা হয়েছে! ✓'))
        onSuccessClosing()
      } else {
        setFeedbackMsg(res.error || 'Failed to submit closing')
      }
    } catch (err: any) {
      setFeedbackMsg(err.message || 'Error locking closing')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER STRIP */}
      <div className="p-5 rounded-3xl bg-linear-to-r from-purple-950 via-slate-900 to-indigo-950 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-purple-500/20 text-purple-300 border-none text-2xs uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{tBilingual('Print Shop Day Closing', 'দৈনিক ক্যাশ ক্লোজিং ও ড্রয়ার অডিট')}</span>
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            {todayClosing ? tBilingual("Today's Register: Locked ✓", 'আজকের ক্যাশ ক্লোজিং: লকড ✓') : tBilingual('End of Day Cash Closing', 'দিনের শেষে ক্যাশ ক্লোজিং')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {tBilingual(
              'Audit counter cash, reconcile cash received against expenses, and lock daily register records.',
              'দোকানের গোনা নগদ টাকার সাথে হিসাব মিলিয়ে হিসাব সংরক্ষণ ও লক করুন।'
            )}
          </p>
        </div>

        {todayClosing ? (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <Lock className="w-5 h-5 text-emerald-400" />
            <div className="text-xs">
              <span className="font-bold block">{tBilingual('Register Locked', 'ক্লোজিং লক করা আছে')}</span>
              <span className="text-3xs text-slate-400 tabular-nums">Closed by: {todayClosing.closed_by_name}</span>
            </div>
          </div>
        ) : (
          <Button
            onClick={handleLockClosing}
            disabled={isSubmitting}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-lg shadow-purple-950/40 flex items-center gap-2 cursor-pointer self-start md:self-auto transition-all hover:scale-102"
          >
            <Lock className="w-4 h-4" />
            <span>{isSubmitting ? tBilingual('Locking...', 'লক হচ্ছে...') : tBilingual('Confirm & Lock Closing', 'নিশ্চিত করুন ও লক করুন')}</span>
          </Button>
        )}
      </div>

      {feedbackMsg && (
        <div className="p-3 text-xs bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('daily')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'daily'
              ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          {tBilingual('Daily Closing', 'দৈনিক ক্লোজিং')}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          {tBilingual('Closing History', 'ক্লোজিং ইতিহাস')} ({cashClosings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('variance')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'variance'
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          {tBilingual('Variance Analysis', 'অমিল বিশ্লেষণ')}
        </button>
      </div>

      {/* 3. SUB-TAB CONTENT */}

      {/* Sub-tab A: Daily Interactive Closing Register */}
      {activeSubTab === 'daily' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Formula Breakdown (7 Cols) */}
          <Card className="lg:col-span-7 rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs p-6 bg-white dark:bg-slate-900">
            <CardHeader className="p-0 pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{tBilingual('Cash Register Breakdown (আজকের ক্যাশ হিসাব)', 'ক্যাশ রেজিস্টার হিসাব')}</span>
                <span className="tabular-nums text-xs text-slate-500">{todayStr}</span>
              </CardTitle>
            </CardHeader>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2 text-xs">
              {/* Opening Cash */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                    {tBilingual('Opening Cash in Drawer', 'সকালে ড্রয়ারে থাকা ক্যাশ (Opening)')}
                  </span>
                  <span className="text-3xs text-slate-400">
                    {tBilingual('Carried forward from yesterday', 'পূর্ববর্তী দিনের অবশিষ্ট নগদ')}
                  </span>
                </div>
                <span className="tabular-nums font-bold text-slate-900 dark:text-white text-sm">
                  ৳{openingCash.toLocaleString()}
                </span>
              </div>

              {/* + Cash Received */}
              <div className="py-3 flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <div>
                  <span className="font-semibold block">
                    {tBilingual('(+) Cash Received Today', '(+) আজকের নগদ কালেকশন / জমা')}
                  </span>
                  <span className="text-3xs text-emerald-600/70">
                    {tBilingual('Invoice payments, advances, and spot receipts', 'ইনভয়েস পরিশোধ ও অগ্রিম নগদ')}
                  </span>
                </div>
                <span className="tabular-nums font-bold text-sm">
                  +৳{cashReceived.toLocaleString()}
                </span>
              </div>

              {/* - Cash Expenses */}
              <div className="py-3 flex items-center justify-between text-rose-600 dark:text-rose-400">
                <div>
                  <span className="font-semibold block">
                    {tBilingual('(-) Cash Expenses Today', '(-) আজকের নগদ খরচ ও বিল')}
                  </span>
                  <span className="text-3xs text-rose-600/70">
                    {tBilingual('Tea, electricity, transport, emergency items', 'চা-নাস্তা, যাতায়াত ও খুচরা খরচ')}
                  </span>
                </div>
                <span className="tabular-nums font-bold text-sm">
                  -৳{cashExpenses.toLocaleString()}
                </span>
              </div>

              {/* - Cash Transfers */}
              <div className="py-3 flex items-center justify-between text-blue-600 dark:text-blue-400">
                <div>
                  <span className="font-semibold block">
                    {tBilingual('(-) Cash Transfers Out', '(-) ব্যাংক বা ওয়ালেটে স্থানান্তর')}
                  </span>
                  <span className="text-3xs text-blue-600/70">
                    {tBilingual('Deposited into bank account or bKash wallet', 'ড্রয়ার থেকে ব্যাংকে জমা')}
                  </span>
                </div>
                <span className="tabular-nums font-bold text-sm">
                  -৳{cashTransfers.toLocaleString()}
                </span>
              </div>

              {/* Expected Cash in Hand */}
              <div className="py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-850 p-3 rounded-xl mt-3">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm block">
                    {tBilingual('Expected Cash in Drawer', 'হিসাবমতে ড্রয়ারে থাকা উচিত (Expected)')}
                  </span>
                  <span className="text-3xs text-slate-400">
                    {tBilingual('Opening + Received - Expenses - Transfers', 'ওপেনিং + জমা - খরচ - স্থানান্তর')}
                  </span>
                </div>
                <span className="tabular-nums font-black text-xl text-purple-600 dark:text-purple-400">
                  ৳{expectedCash.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>

          {/* Right Column: Counted Cash & Variance Lock (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs p-5 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {tBilingual('Actual Counted Cash', 'গোনা নগদ টাকা (Actual Cash)')}
                </span>
                <button
                  type="button"
                  onClick={() => setUseDenominations(!useDenominations)}
                  className="text-3xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  {useDenominations ? tBilingual('Direct Input', 'সরাসরি লিখুন') : tBilingual('Use Note Counter', 'নোট গুনে লিখুন')}
                </button>
              </div>

              {/* Denomination Counter (Optional) */}
              {useDenominations ? (
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-850 mb-3 border border-slate-200 dark:border-slate-800">
                  {[1000, 500, 200, 100, 50, 20].map((denom) => (
                    <div key={denom} className="flex items-center justify-between text-2xs">
                      <span className="tabular-nums font-bold text-slate-600 dark:text-slate-400 w-16">
                        ৳{denom} ×
                      </span>
                      <Input
                        type="number"
                        min="0"
                        value={notes[denom] || 0}
                        onChange={(e) => handleDenominationChange(denom, parseInt(e.target.value, 10) || 0)}
                        className="h-7 w-20 text-xs text-center tabular-nums rounded-lg"
                      />
                      <span className="tabular-nums text-slate-800 dark:text-slate-200 w-20 text-right font-semibold">
                        ৳{((notes[denom] || 0) * denom).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative mb-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">৳</span>
                  <Input
                    type="number"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    disabled={Boolean(todayClosing)}
                    placeholder="0.00"
                    className="h-11 pl-8 text-lg tabular-nums font-black rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Variance Card */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between mb-4 ${
                  isBalanced
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                    : variance < 0
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-800 dark:text-amber-300'
                }`}
              >
                <div>
                  <span className="text-3xs uppercase font-bold block">
                    {tBilingual('Discrepancy / Variance', 'অমিল / ভ্যারিয়েন্স')}
                  </span>
                  <span className="text-xs font-semibold">
                    {isBalanced
                      ? tBilingual('100% Balanced ✓', 'হিসাব নিখুঁত মিল আছে ✓')
                      : variance < 0
                      ? tBilingual('Shortage in cash drawer', 'ক্যাশে টাকা কম রয়েছে (ঘাটতি)')
                      : tBilingual('Overage in cash drawer', 'ক্যাশে টাকা বেশি রয়েছে')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl tabular-nums font-black block">
                    {variance > 0 ? `+৳${variance.toLocaleString()}` : `৳${variance.toLocaleString()}`}
                  </span>
                </div>
              </div>

              {/* Variance Notes Input */}
              <div className="mb-4">
                <Label className="text-2xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  {tBilingual('Variance Reason / Closing Note', 'অমিলে কারণ বা সমাপনী নোট')}
                </Label>
                <Input
                  value={varianceReason}
                  onChange={(e) => setVarianceReason(e.target.value)}
                  disabled={Boolean(todayClosing)}
                  placeholder="e.g. ৳500 paid for delivery fare pending voucher"
                  className="h-8.5 text-xs rounded-xl"
                />
              </div>

              {/* Lock Button */}
              {!todayClosing ? (
                <Button
                  onClick={handleLockClosing}
                  disabled={isSubmitting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isSubmitting ? tBilingual('Locking...', 'লক হচ্ছে...') : tBilingual('Confirm & Lock Today Closing', 'ক্লোজিং নিশ্চিত করুন ও লক করুন')}</span>
                </Button>
              ) : (
                <div className="p-3 text-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>{tBilingual('Day records locked by Cashier', 'ক্যাশিয়ার কর্তৃক এই দিনের হিসাব লক করা আছে')}</span>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Sub-tab B: Closing History */}
      {activeSubTab === 'history' && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">{tBilingual('Date', 'তারিখ')}</th>
                    <th className="p-3">{tBilingual('Closing #', 'ক্লোজিং নং')}</th>
                    <th className="p-3 text-right">{tBilingual('Opening Cash', 'ওপেনিং ক্যাশ')}</th>
                    <th className="p-3 text-right">{tBilingual('Cash In', 'মোট জমা')}</th>
                    <th className="p-3 text-right">{tBilingual('Cash Out', 'মোট খরচ')}</th>
                    <th className="p-3 text-right">{tBilingual('Expected', 'হিসাবমতো')}</th>
                    <th className="p-3 text-right">{tBilingual('Counted (Actual)', 'গোনা টাকা')}</th>
                    <th className="p-3 text-right">{tBilingual('Variance', 'অমিল')}</th>
                    <th className="p-3">{tBilingual('Closed By', 'ক্লোজ করেছেন')}</th>
                    <th className="p-3 text-center">{tBilingual('Status', 'অবস্থা')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {cashClosings.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {c.closing_date}
                      </td>
                      <td className="p-3 tabular-nums font-medium text-purple-600 dark:text-purple-400">
                        {c.closing_number}
                      </td>
                      <td className="p-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                        ৳{Number(c.opening_cash || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums text-emerald-600">
                        +৳{Number(c.cash_inflows || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums text-rose-600">
                        -৳{Number(c.cash_outflows || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-slate-800 dark:text-slate-200">
                        ৳{Number(c.expected_cash || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                        ৳{Number(c.counted_cash || 0).toLocaleString()}
                      </td>
                      <td className={`p-3 text-right tabular-nums font-bold ${Math.abs(c.variance) <= 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {c.variance > 0 ? `+৳${c.variance}` : `৳${c.variance}`}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {c.closed_by_name}
                      </td>
                      <td className="p-3 text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 text-3xs font-semibold">
                          Locked ✓
                        </Badge>
                      </td>
                    </tr>
                  ))}

                  {cashClosings.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-10 text-center text-slate-400 text-xs">
                        {tBilingual('No past cash closing records found.', 'কোনো পূর্ববর্তী ক্যাশ ক্লোজিং রেকর্ড পাওয়া যায়নি।')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-tab C: Variance Analysis */}
      {activeSubTab === 'variance' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900">
            <span className="text-3xs uppercase font-semibold text-slate-400 block">
              {tBilingual('Total Days Audited', 'মোট অডিটকৃত দিন')}
            </span>
            <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-white mt-1 block">
              {cashClosings.length} {tBilingual('Days', 'দিন')}
            </span>
            <p className="text-3xs text-slate-400 mt-1">{tBilingual('100% daily register compliance', 'শতভাগ দৈনিক রেজিস্টার সম্পন্নের রেকর্ড')}</p>
          </Card>

          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900">
            <span className="text-3xs uppercase font-semibold text-slate-400 block">
              {tBilingual('Perfect Closings', 'নিখুঁত মিল')}
            </span>
            <span className="text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 mt-1 block">
              {cashClosings.filter((c) => Math.abs(c.variance) <= 0.01).length} / {cashClosings.length || 1}
            </span>
            <p className="text-3xs text-emerald-600 mt-1">{tBilingual('Zero variance audit days', 'কোনো অমিল ছাড়া দিন')}</p>
          </Card>

          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900">
            <span className="text-3xs uppercase font-semibold text-slate-400 block">
              {tBilingual('Net Monthly Variance', 'নিট মাসিক অমিল')}
            </span>
            <span className="text-3xl font-black tabular-nums text-rose-600 dark:text-rose-400 mt-1 block">
              ৳{cashClosings.reduce((s, c) => s + Number(c.variance || 0), 0).toLocaleString()}
            </span>
            <p className="text-3xs text-slate-400 mt-1">{tBilingual('Cumulative drawer discrepancy', 'মাসিক পুঞ্জীভূত ক্যাশ অমিল')}</p>
          </Card>
        </div>
      )}
    </div>
  )
}
