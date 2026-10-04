'use client'

import React, { useState } from 'react'
import {
 Clock4,
 Check,
 X,
 AlertCircle,
 FileSpreadsheet,
 Calendar,
 Filter,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { OvertimeRecord, OvertimeStatus } from '@/types/workforce.types'
import { useI18n } from '@/i18n/context'

export interface OvertimeTableProps {
 records: OvertimeRecord[]
 isLoading?: boolean
 tenantSlug: string
 onReview: (id: string, status: 'approved' | 'rejected', notes?: string) => Promise<void>
}

export function OvertimeTable({
 records,
 isLoading = false,
 tenantSlug,
 onReview,
}: OvertimeTableProps) {
  const { locale, tBilingual } = useI18n()
 const [filterStatus, setFilterStatus] = useState<string>('pending_approval')
 const [processingId, setProcessingId] = useState<string | null>(null)

 const filteredRecords = records.filter((r) => {
 if (filterStatus === 'all') return true
 return r.status === filterStatus
  })

 const handleReviewAction = async (id: string, status: 'approved' | 'rejected') => {
 setProcessingId(id)
 try {
 await onReview(id, status)
    } finally {
 setProcessingId(null)
    }
  }

 const getStatusBadge = (status: OvertimeStatus) => {
 switch (status) {
 case 'approved':
 return 'bg-success-surface text-success border-success-border'
 case 'rejected':
 return 'bg-danger-surface text-destructive border-danger-border'
 case 'paid':
 return 'bg-primary/10 text-primary border-primary/20'
 default:
 return 'bg-warning-surface text-warning border-warning-border'
    }
  }

 if (isLoading) {
 return (
      <Card className="bg-card border-border p-6">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg"/>
          ))}
        </div>
      </Card>
    )
  }

 return (
    <div className="space-y-4">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{tBilingual('Overtime Requests & Approvals', 'ওভারটাইম আবেদন ও অনুমোদন')}</h3>
          <p className="text-xs text-muted-foreground">
            {tBilingual('Verify worked extra hours, multiplier rates and total overtime payouts', 'অতিরিক্ত কাজের ঘণ্টা, ওভারটাইম রেট ও মোট অর্থপ্রদান যাচাই করুন')}
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg text-xs self-start sm:self-auto overflow-x-auto">
          {[
            { id: 'pending_approval', labelEn: 'Pending Approval', labelBn: 'অনুমোদন অপেক্ষমাণ' },
            { id: 'approved', labelEn: 'Approved', labelBn: 'অনুমোদিত' },
            { id: 'paid', labelEn: 'Paid', labelBn: 'পরিশোধিত' },
            { id: 'rejected', labelEn: 'Rejected', labelBn: 'বাতিলকৃত' },
            { id: 'all', labelEn: 'All Records', labelBn: 'সকল রেকর্ড' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === st.id
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tBilingual(st.labelEn, st.labelBn)}
            </button>
          ))}
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <Card className="bg-card border-border py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">{tBilingual('No overtime records found', 'কোনো ওভারটাইম রেকর্ড পাওয়া যায়নি')}</p>
          <p className="text-xs text-muted-foreground mt-1">{tBilingual('There are no requests matching this status.', 'এই স্ট্যাটাসে কোনো আবেদন নেই।')}</p>
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted border-b border-border text-muted-foreground uppercase tracking-wider font-semibold text-xs">
                <tr>
                  <th className="py-3 px-4">{tBilingual('Employee', 'কর্মী')}</th>
                  <th className="py-3 px-3">{tBilingual('Date', 'তারিখ')}</th>
                  <th className="py-3 px-3">{tBilingual('OT Type', 'ওভারটাইমের ধরন')}</th>
                  <th className="py-3 px-3 text-center">{tBilingual('Duration', 'সময়কাল')}</th>
                  <th className="py-3 px-3 text-right">{tBilingual('Base Rate', 'মূল হার')}</th>
                  <th className="py-3 px-3 text-center">{tBilingual('Multiplier', 'গুণক')}</th>
                  <th className="py-3 px-3 text-right">{tBilingual('OT Rate', 'ওটি হার')}</th>
                  <th className="py-3 px-3 text-right">{tBilingual('Amount', 'পরিমাণ')}</th>
                  <th className="py-3 px-3 text-center">{tBilingual('Status', 'অবস্থা')}</th>
                  <th className="py-3 px-4 text-right">{tBilingual('Actions', 'অ্যাকশন')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map((rec) => {
 const isProcessing = processingId === rec.id
 return (
                    <tr key={rec.id} className="hover:bg-muted transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{rec.employee_name || 'Staff Member'}</div>
                        <div className="text-xs text-muted-foreground capitalize">{rec.employee_department}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{rec.ot_date}</td>
                      <td className="py-3 px-3 capitalize font-medium text-foreground">
                        {rec.ot_type.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-foreground tabular-nums">
                        {rec.duration_hours || Math.round((rec.duration_minutes / 60) * 10) / 10} {tBilingual('hrs', 'ঘণ্টা')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground tabular-nums">
                        ৳ {rec.base_hourly_rate || 0}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-foreground">
                        {rec.multiplier || 1.5}x
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground tabular-nums">
                        ৳ {rec.effective_ot_rate || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-foreground tabular-nums">
                        ৳ {rec.calculated_amount ? rec.calculated_amount.toLocaleString('en-IN') : 0}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
 variant="outline"className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full ${getStatusBadge(
 rec.status
                          )}`}
                        >{rec.status === 'approved' ? tBilingual('Approved', 'অনুমোদিত') : rec.status === 'rejected' ? tBilingual('Rejected', 'বাতিলকৃত') : rec.status === 'paid' ? tBilingual('Paid', 'পরিশোধিত') : tBilingual('Pending Approval', 'অনুমোদন অপেক্ষমাণ')}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {rec.status === 'pending_approval' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
 size="sm"disabled={isProcessing}
 onClick={() => handleReviewAction(rec.id, 'approved')}
 className="h-7 px-2.5 text-xs font-medium bg-success hover:bg-success text-white min-h-[28px]">
                              <Check className="w-3.5 h-3.5 mr-1"/>
                              <span>{tBilingual('Approve', 'অনুমোদন')}</span>
                            </Button>
                            <Button
 size="sm"variant="outline"disabled={isProcessing}
 onClick={() => handleReviewAction(rec.id, 'rejected')}
 className="h-7 px-2.5 text-xs font-medium border-danger-border text-destructive hover:bg-danger-surface min-h-[28px]">
                              <X className="w-3.5 h-3.5 mr-1"/>
                              <span>{tBilingual('Reject', 'বাতিল')}</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground capitalize">
                            {rec.status}
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
      )}
    </div>
  )
}
