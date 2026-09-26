'use client'

import React, { useState } from 'react'
import {
  TrendingUp,
  Search,
  CheckCircle2,
  AlertTriangle,
  Calculator,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import type { JobProfitabilityMetric } from '@/types/finance.types'

interface JobProfitabilityViewProps {
  metrics: JobProfitabilityMetric[]
  isLoading?: boolean
}

export function JobProfitabilityView({ metrics, isLoading }: JobProfitabilityViewProps) {
  const { tBilingual } = useI18n()
  const [search, setSearch] = useState('')

  const filtered = metrics.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.job_number.toLowerCase().includes(q) ||
      m.customer_name.toLowerCase().includes(q) ||
      m.item_title.toLowerCase().includes(q)
    )
  })

  const totalRevenue = filtered.reduce((s, m) => s + m.selling_price, 0)
  const totalCost = filtered.reduce((s, m) => s + m.total_actual_cost, 0)
  const totalGrossProfit = totalRevenue - totalCost
  const avgMargin = totalRevenue > 0 ? Number(((totalGrossProfit / totalRevenue) * 100).toFixed(2)) : 0

  return (
    <div className="space-y-4">
      {/* 1. Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tBilingual('Total Order Revenue', 'মোট অর্ডার বিক্রয়')}
          </span>
          <div className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">
            ৳{totalRevenue.toLocaleString()}
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tBilingual('Total Production Cost', 'মোট উৎপাদন খরচ')}
          </span>
          <div className="text-base font-bold text-rose-600 mt-0.5">
            ৳{totalCost.toLocaleString()}
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tBilingual('Total Gross Profit', 'মোট মোট মুনাফা')}
          </span>
          <div className="text-base font-bold text-emerald-600 mt-0.5">
            ৳{totalGrossProfit.toLocaleString()}
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tBilingual('Average Profit Margin', 'গড় লাভ মার্জিন')}
          </span>
          <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
            {avgMargin}%
          </div>
        </div>
      </div>

      {/* 2. Search & Table */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-600" />
            <span>{tBilingual('Job-by-Job Profitability Analysis', 'প্রতিটি কাজের লাভ-ক্ষতি বিশ্লেষণ')}</span>
          </CardTitle>

          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={tBilingual('Search job # or customer...', 'কাজের নং বা গ্রাহক...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs rounded-lg"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 text-xs animate-pulse">
              {tBilingual('Loading Job Profitability...', 'কাজের তথ্য লোড হচ্ছে...')}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              {tBilingual('No costing or job profitability records found.', 'কোনো কাজের তথ্য পাওয়া যায়নি।')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-28">{tBilingual('Job #', 'কাজের নং')}</th>
                    <th className="p-3">{tBilingual('Customer & Work Item', 'গ্রাহক ও কাজের নাম')}</th>
                    <th className="p-3 text-right w-24">{tBilingual('Selling Price', 'বিক্রয়মূল্য')}</th>
                    <th className="p-3 text-right w-20">{tBilingual('Material', 'কাঁচামাল')}</th>
                    <th className="p-3 text-right w-20">{tBilingual('Labor', 'শ্রম')}</th>
                    <th className="p-3 text-right w-20">{tBilingual('Machine', 'মেশিন')}</th>
                    <th className="p-3 text-right w-24">{tBilingual('Total Cost', 'মোট খরচ')}</th>
                    <th className="p-3 text-right w-24">{tBilingual('Gross Profit', 'লাভ')}</th>
                    <th className="p-3 text-right w-20">{tBilingual('Margin', 'মার্জিন')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filtered.map((j) => (
                    <tr key={j.job_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-mono font-medium text-blue-600 dark:text-blue-400">
                        {j.job_number}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{j.item_title}</div>
                        <div className="text-2xs text-slate-500">{j.customer_name}</div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        ৳{j.selling_price.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        ৳{j.material_cost.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        ৳{j.labor_cost.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        ৳{j.machine_cost.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                        ৳{j.total_actual_cost.toLocaleString()}
                      </td>
                      <td className={`p-3 text-right font-mono font-bold ${j.gross_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ৳{j.gross_profit.toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <Badge
                          className={`text-2xs font-bold ${
                            j.margin_percentage >= 30
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : j.margin_percentage >= 15
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                          }`}
                        >
                          {j.margin_percentage}%
                        </Badge>
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
