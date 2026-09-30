'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Wallet, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export interface PayrollSummaryWidgetProps {
  periodName: string
  grossPayroll: number
  paid: number
  pending: number
  due: number
  isLoading?: boolean
  tenantSlug: string
}

export function PayrollSummaryWidget({
  periodName,
  grossPayroll,
  paid,
  pending,
  due,
  isLoading = false,
  tenantSlug,
}: PayrollSummaryWidgetProps) {
  if (isLoading) {
    return (
      <Card className="p-4 bg-white border-slate-200 shadow-none">
        <Skeleton className="h-6 w-44 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  const paidPct = grossPayroll > 0 ? Math.min(100, Math.round((paid / grossPayroll) * 100)) : 0

  const items = [
    {
      label: 'Gross Payroll',
      labelBn: 'মোট পেরোল ব্যয়',
      amount: grossPayroll,
      icon: Wallet,
      color: 'text-slate-700 bg-slate-50 border-slate-200',
      badgeBg: 'text-slate-900',
    },
    {
      label: 'Paid Amount',
      labelBn: 'পরিশোধিত',
      amount: paid,
      icon: CheckCircle2,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      badgeBg: 'text-emerald-700',
    },
    {
      label: 'Pending Approval',
      labelBn: 'অনুমোদনের অপেক্ষায়',
      amount: pending,
      icon: Clock,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      badgeBg: 'text-amber-700',
    },
    {
      label: 'Due Outstanding',
      labelBn: 'বকেয়া বেতন',
      amount: due,
      icon: AlertCircle,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      badgeBg: 'text-rose-700',
    },
  ]

  return (
    <Card className="bg-white border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl flex flex-col justify-between h-full">
      <CardHeader className="pb-3 border-b border-slate-100 px-5 pt-5 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span>Payroll Status</span>
            <span className="text-xs font-normal text-slate-500">বেতন পরিস্থিতি</span>
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            {periodName} • {paidPct}% paid of gross commitments
          </p>
        </div>
        <Link
          href={`/${tenantSlug}/hr/payroll`}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0"
        >
          <span>Payroll Sheets</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="px-5 py-4 space-y-2.5">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-md border ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800 leading-tight">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    {item.labelBn}
                  </div>
                </div>
              </div>
              <span className={`text-sm font-bold tabular-nums ${item.badgeBg}`}>
                ৳ {item.amount.toLocaleString('en-IN')}
              </span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
