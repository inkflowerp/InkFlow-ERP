'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Lock,
  CheckCircle2,
  Wallet,
  Coins,
  CreditCard,
  Printer,
  Download,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  PayrollPeriodRecord,
  PayrollItemRecord,
} from '@/types/workforce.types'

export interface PayrollSheetProps {
  period: PayrollPeriodRecord
  items: PayrollItemRecord[]
  isLoading?: boolean
  tenantSlug: string
  onApprovePeriod?: () => Promise<void>
  onLockPeriod?: () => Promise<void>
  onOpenPaymentModal: (item: PayrollItemRecord) => void
}

export function PayrollSheet({
  period,
  items,
  isLoading = false,
  tenantSlug,
  onApprovePeriod,
  onLockPeriod,
  onOpenPaymentModal,
}: PayrollSheetProps) {
  const [selectedItemDetail, setSelectedItemDetail] = useState<PayrollItemRecord | null>(null)
  const [isActionPending, setIsActionPending] = useState(false)

  const isLocked = Boolean(period.locked_at) || period.status === 'locked'
  const isApproved = period.status === 'approved' || isLocked || period.status === 'paid'

  const handleApprove = async () => {
    if (!onApprovePeriod) return
    setIsActionPending(true)
    try {
      await onApprovePeriod()
    } finally {
      setIsActionPending(false)
    }
  }

  const handleLock = async () => {
    if (!onLockPeriod) return
    setIsActionPending(true)
    try {
      await onLockPeriod()
    } finally {
      setIsActionPending(false)
    }
  }

  const getItemStatusBadge = (status: string) => {
    if (status === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (status === 'partial') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top Summary Banner */}
      <Card className="bg-white border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{period.period_name}</h2>
              <Badge variant="outline" className="text-xs uppercase font-bold px-2 py-0.5">
                {period.status}
              </Badge>
              {isLocked && (
                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-xs flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Locked</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Dates: {period.start_date} to {period.end_date} • {items.length} Employees
            </p>
          </div>

          {/* Lifecycle Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isApproved && onApprovePeriod && (
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={isActionPending}
                className="h-8 px-3.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white min-h-[32px]"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                <span>Approve Payroll</span>
              </Button>
            )}

            {isApproved && !isLocked && onLockPeriod && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleLock}
                disabled={isActionPending}
                className="h-8 px-3.5 text-xs font-semibold border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 min-h-[32px]"
              >
                <Lock className="w-3.5 h-3.5 mr-1" />
                <span>Lock Period</span>
              </Button>
            )}

            {isLocked && (
              <div className="text-right text-[11px] text-slate-500">
                <span className="font-medium text-slate-700">Period is locked & immutable.</span>
                <span className="block text-slate-400">
                  Locked {period.locked_at ? new Date(period.locked_at).toLocaleDateString() : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Financial KPI Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Gross Payroll</span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              ৳ {Number(period.total_gross_salary || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Overtime</span>
            <span className="text-sm font-bold text-indigo-600 tabular-nums">
              ৳ {Number(period.total_ot_amount || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Advances Deducted</span>
            <span className="text-sm font-bold text-amber-600 tabular-nums">
              ৳ {Number(period.total_advances_deducted || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Other Deductions</span>
            <span className="text-sm font-bold text-red-600 tabular-nums">
              ৳ {Number(period.total_other_deductions || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Net Payable</span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              ৳ {Number(period.total_net_salary || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Paid</span>
            <span className="text-sm font-bold text-emerald-600 tabular-nums">
              ৳ {Number(period.total_paid_amount || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Due Remaining</span>
            <span className="text-sm font-bold text-rose-600 tabular-nums">
              ৳ {Number(period.total_due_amount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </Card>

      {/* Main Itemized Employee Table */}
      <Card className="bg-white border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">Basis</th>
                <th className="py-3 px-3 text-right">Base</th>
                <th className="py-3 px-3 text-center">Days</th>
                <th className="py-3 px-3 text-center">OT (h)</th>
                <th className="py-3 px-3 text-right">OT (৳)</th>
                <th className="py-3 px-3 text-right">Bonuses</th>
                <th className="py-3 px-3 text-right">Advance Ded.</th>
                <th className="py-3 px-3 text-right">Net Salary</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Due</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const base = Number(item.base_salary || 0)
                const otAmt = Number(item.overtime_amount || 0)
                const bonuses = Number(item.bonuses || 0)
                const advDed = Number(item.advance_salary_deducted || 0)
                const net = Number(item.net_salary || 0)
                const paid = Number(item.paid_amount || 0)
                const due = Number(item.due_amount || (net - paid))

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Employee */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.employee_name}</div>
                      <div className="text-[11px] text-slate-400 capitalize">
                        {item.role || item.department}
                      </div>
                    </td>

                    {/* Basis */}
                    <td className="py-3 px-3 capitalize text-slate-600">
                      {(item.salary_basis || 'monthly').replace('_', ' ')}
                    </td>

                    {/* Base */}
                    <td className="py-3 px-3 text-right font-medium text-slate-800 tabular-nums">
                      ৳ {base.toLocaleString('en-IN')}
                    </td>

                    {/* Days */}
                    <td className="py-3 px-3 text-center font-medium text-slate-800 tabular-nums">
                      {item.days_present || 0}
                    </td>

                    {/* OT Hours */}
                    <td className="py-3 px-3 text-center font-medium text-indigo-600 tabular-nums">
                      {item.overtime_hours || 0}
                    </td>

                    {/* OT Amount */}
                    <td className="py-3 px-3 text-right font-medium text-indigo-600 tabular-nums">
                      ৳ {otAmt.toLocaleString('en-IN')}
                    </td>

                    {/* Bonuses */}
                    <td className="py-3 px-3 text-right font-medium text-emerald-600 tabular-nums">
                      ৳ {bonuses.toLocaleString('en-IN')}
                    </td>

                    {/* Advance Deducted */}
                    <td className="py-3 px-3 text-right font-medium text-amber-600 tabular-nums">
                      ৳ {advDed.toLocaleString('en-IN')}
                    </td>

                    {/* Net Salary */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                      ৳ {net.toLocaleString('en-IN')}
                    </td>

                    {/* Paid */}
                    <td className="py-3 px-3 text-right font-bold text-emerald-600 tabular-nums">
                      ৳ {paid.toLocaleString('en-IN')}
                    </td>

                    {/* Due */}
                    <td className="py-3 px-3 text-right font-bold text-rose-600 tabular-nums">
                      ৳ {due.toLocaleString('en-IN')}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getItemStatusBadge(
                          item.payment_status || (due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid')
                        )}`}
                      >
                        {item.payment_status || (due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid')}
                      </Badge>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      {due > 0 ? (
                        <Button
                          size="sm"
                          onClick={() => onOpenPaymentModal(item)}
                          className="h-7 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white min-h-[28px]"
                        >
                          <CreditCard className="w-3 h-3 mr-1" />
                          <span>Pay Due</span>
                        </Button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Fully Paid</span>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
