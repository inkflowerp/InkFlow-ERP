'use client'

import React from 'react'
import { useI18n } from '@/i18n/context'
import Link from 'next/link'
import {
 Wallet,
 Calendar,
 Lock,
 CheckCircle2,
 Clock,
 ArrowRight,
 Plus,
 FileSpreadsheet,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { PayrollPeriodRecord, PayrollPeriodStatus } from '@/types/workforce.types'

export interface PayrollPeriodTableProps {
 periods: PayrollPeriodRecord[]
 isLoading?: boolean
 tenantSlug: string
 onOpenGenerateModal: () => void
}

const LIFECYCLE_STEPS = [
  { step: 1, label: 'Select Period', labelBn: 'পিরিয়ড নির্বাচন' },
  { step: 2, label: 'Generate Draft', labelBn: 'ড্রাফট তৈরি' },
  { step: 3, label: 'Review', labelBn: 'রিভিউ' },
  { step: 4, label: 'Approve', labelBn: 'অনুমোদন' },
  { step: 5, label: 'Lock', labelBn: 'লক' },
  { step: 6, label: 'Pay', labelBn: 'পরিশোধ' },
  { step: 7, label: 'Complete', labelBn: 'সম্পন্ন' },
]

export function PayrollPeriodTable({
 periods,
 isLoading = false,
 tenantSlug,
 onOpenGenerateModal,
}: PayrollPeriodTableProps) {
  const { locale, tBilingual } = useI18n()
 const getStatusBadge = (status: PayrollPeriodStatus) => {
 switch (status) {
 case 'locked':
 return 'bg-muted text-foreground border-input'
 case 'paid':
 return 'bg-emerald-50 text-emerald-700 border-emerald-200'
 case 'approved':
 return 'bg-blue-50 text-blue-700 border-blue-200'
 case 'review':
 return 'bg-purple-50 text-purple-700 border-purple-200'
 default:
 return 'bg-amber-50 text-amber-700 border-amber-200'
    }
  }

 return (
    <div className="space-y-5">
      {/* Visual Stepper Lifecycle Header */}
      <Card className="bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
 {tBilingual('Payroll Processing Lifecycle', 'পেরোল প্রসেসিং লাইফসাইকেল')}
            </h4>
            <p className="text-[11px] text-muted-foreground">
 {tBilingual('Standardized flow preventing accidental skips from draft to paid without review and lock', 'ড্রাফট থেকে অনুমোদনের পর্যায়ক্রমিক নিরাপদ ধাপসমূহ')}
            </p>
          </div>

          <Button
 size="sm"onClick={onOpenGenerateModal}
 className="h-8 px-3.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground min-h-[32px] shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1"/>
            <span>{tBilingual('Generate New Period', 'নতুন পিরিয়ড তৈরি')}</span>
          </Button>
        </div>

        {/* Stepper Steps */}
        <div className="flex items-center gap-1 overflow-x-auto pt-2 pb-1">
          {LIFECYCLE_STEPS.map((s, idx) => (
            <React.Fragment key={s.step}>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted border border-border shrink-0">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                  {s.step}
                </span>
                <div className="text-left">
                  <div className="text-[11px] font-semibold text-foreground whitespace-nowrap leading-tight">
                    {locale === 'bn' ? s.labelBn : s.label}
                  </div>
                </div>
              </div>
              {idx < LIFECYCLE_STEPS.length - 1 && (
                <div className="text-muted-foreground text-xs shrink-0 px-0.5">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Main Payroll Periods Table */}
      {isLoading ? (
        <Card className="bg-card border-border p-6">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg"/>
            ))}
          </div>
        </Card>
      ) : periods.length === 0 ? (
        <Card className="bg-card border-border py-16 px-4 text-center">
          <div className="max-w-sm mx-auto flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
              <Wallet className="w-6 h-6"/>
            </div>
            <h3 className="text-base font-semibold text-foreground">No payroll periods created yet</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-5">
 Draft your first monthly salary sheet based on verified floor attendance and advances.
            </p>
            <Button
 onClick={onOpenGenerateModal}
 size="sm"className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground min-h-[36px]">
              <Plus className="w-4 h-4 mr-1.5"/>
              <span>Create Payroll Period</span>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted border-b border-border text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-3">{tBilingual('Date Range', 'সময়সীমা')}</th>
                  <th className="py-3 px-3 text-center">{tBilingual('Employees', 'মোট কর্মী')}</th>
                  <th className="py-3 px-3 text-right">Gross</th>
                  <th className="py-3 px-3 text-right">OT</th>
                  <th className="py-3 px-3 text-right">Deductions</th>
                  <th className="py-3 px-3 text-right">{tBilingual('Net Payable', 'নীট প্রদেয়')}</th>
                  <th className="py-3 px-3 text-right">Paid</th>
                  <th className="py-3 px-3 text-right">Due</th>
                  <th className="py-3 px-3 text-center">{tBilingual('Status', 'অবস্থা')}</th>
                  <th className="py-3 px-4 text-right">{tBilingual('Actions', 'অ্যাকশন')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {periods.map((period) => {
 const gross = Number(period.total_gross_salary || 0)
 const ot = Number(period.total_ot_amount || 0)
 const deductions = Number(period.total_other_deductions || 0) + Number(period.total_advances_deducted || 0)
 const net = Number(period.total_net_salary || 0)
 const paid = Number(period.total_paid_amount || 0)
 const due = Number(period.total_due_amount || 0)

 return (
                    <tr
 key={period.id}
 className="hover:bg-muted transition-colors group cursor-pointer">
                      {/* Period Name */}
                      <td className="py-3.5 px-4">
                        <Link
 href={`/${tenantSlug}/hr/payroll/${period.id}`}
 className="font-bold text-foreground group-hover:text-blue-600 transition-colors block">
                          {period.period_name}
                        </Link>
                        {period.locked_at && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                            <Lock className="w-3 h-3 text-muted-foreground"/>
                            <span>Locked {new Date(period.locked_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </td>

                      {/* Date Range */}
                      <td className="py-3.5 px-3 font-mono text-muted-foreground">
                        {period.start_date} to {period.end_date}
                      </td>

                      {/* Employees */}
                      <td className="py-3.5 px-3 text-center font-semibold text-foreground tabular-nums">
                        {period.items?.length || 0}
                      </td>

                      {/* Gross */}
                      <td className="py-3.5 px-3 text-right font-medium text-foreground tabular-nums">
                        ৳ {gross.toLocaleString('en-IN')}
                      </td>

                      {/* OT */}
                      <td className="py-3.5 px-3 text-right font-medium text-indigo-600 tabular-nums">
                        ৳ {ot.toLocaleString('en-IN')}
                      </td>

                      {/* Deductions */}
                      <td className="py-3.5 px-3 text-right font-medium text-amber-600 tabular-nums">
                        ৳ {deductions.toLocaleString('en-IN')}
                      </td>

                      {/* Net */}
                      <td className="py-3.5 px-3 text-right font-bold text-foreground tabular-nums">
                        ৳ {net.toLocaleString('en-IN')}
                      </td>

                      {/* Paid */}
                      <td className="py-3.5 px-3 text-right font-bold text-emerald-600 tabular-nums">
                        ৳ {paid.toLocaleString('en-IN')}
                      </td>

                      {/* Due */}
                      <td className="py-3.5 px-3 text-right font-bold text-rose-600 tabular-nums">
                        ৳ {due.toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <Badge
 variant="outline"className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getStatusBadge(
 period.status
                          )}`}
                        >
                          {period.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
 asChild
 size="sm"variant="outline"className="h-7 px-2.5 text-xs font-semibold text-foreground border-border hover:bg-muted min-h-[28px]">
                          <Link href={`/${tenantSlug}/hr/payroll/${period.id}`}>
                            <span>Open Sheet</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1"/>
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
