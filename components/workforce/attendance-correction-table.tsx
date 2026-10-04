'use client'

import React, { useState } from 'react'
import {
 CheckCircle2,
 XCircle,
 Clock,
 User,
 AlertCircle,
 Check,
 X,
 Eye,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { AttendanceCorrectionRecord } from '@/types/attendance.types'
import { useI18n } from '@/i18n/context'

export interface AttendanceCorrectionTableProps {
 corrections: AttendanceCorrectionRecord[]
 isLoading?: boolean
 tenantSlug: string
 onReview: (id: string, status: 'approved' | 'rejected', notes?: string) => Promise<void>
}

export function AttendanceCorrectionTable({
 corrections,
 isLoading = false,
 tenantSlug,
 onReview,
}: AttendanceCorrectionTableProps) {
  const { locale, tBilingual } = useI18n()
 const [processingId, setProcessingId] = useState<string | null>(null)
 const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

 const filteredCorrections = corrections.filter((c) => {
 if (filterStatus === 'all') return true
 return c.status === filterStatus
  })

 const handleReviewAction = async (id: string, status: 'approved' | 'rejected') => {
 setProcessingId(id)
 try {
 await onReview(id, status)
    } finally {
 setProcessingId(null)
    }
  }

 const getStatusBadge = (status: string) => {
 if (status === 'approved') return 'bg-success-surface text-success border-success-border'
 if (status === 'rejected') return 'bg-danger-surface text-destructive border-danger-border'
 return 'bg-warning-surface text-warning border-warning-border'
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
      {/* Header and Filter */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">{tBilingual('Attendance Corrections Inbox', 'হাজিরা সংশোধনের ইনবক্স')}</h3>
          <p className="text-xs text-muted-foreground">{tBilingual('Employee punch adjustment requests requiring manager sign-off', 'কর্মীদের পাঞ্চ সংশোধনের আবেদন যা ম্যানেজারের অনুমোদন প্রয়োজন')}</p>
        </div>

        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg text-xs">
          {([
            { key: 'pending', labelEn: 'Pending', labelBn: 'অপেক্ষমাণ' },
            { key: 'approved', labelEn: 'Approved', labelBn: 'অনুমোদিত' },
            { key: 'rejected', labelEn: 'Rejected', labelBn: 'বাতিলকৃত' },
            { key: 'all', labelEn: 'All', labelBn: 'সকল' },
          ] as const).map((st) => (
            <button
              key={st.key}
              onClick={() => setFilterStatus(st.key)}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterStatus === st.key
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tBilingual(st.labelEn, st.labelBn)}
            </button>
          ))}
        </div>
      </div>

      {filteredCorrections.length === 0 ? (
        <Card className="bg-card border-border py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {filterStatus === 'all'
              ? tBilingual('No correction requests', 'কোনো সংশোধনের আবেদন নেই')
              : filterStatus === 'pending'
              ? tBilingual('No pending correction requests', 'কোনো অপেক্ষমাণ সংশোধনের আবেদন নেই')
              : filterStatus === 'approved'
              ? tBilingual('No approved correction requests', 'কোনো অনুমোদিত সংশোধনের আবেদন নেই')
              : tBilingual('No rejected correction requests', 'কোনো বাতিলকৃত সংশোধনের আবেদন নেই')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{tBilingual('All employee punch corrections are up to date.', 'সকল পাঞ্চ সংশোধন হালনাগাদ রয়েছে।')}</p>
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted border-b border-border text-muted-foreground uppercase tracking-wider font-semibold text-xs">
                <tr>
                  <th className="py-3 px-4">{tBilingual('Employee', 'কর্মী')}</th>
                  <th className="py-3 px-3">{tBilingual('Date', 'তারিখ')}</th>
                  <th className="py-3 px-3">{tBilingual('Type', 'ধরন')}</th>
                  <th className="py-3 px-3">{tBilingual('Requested Time', 'অনুরোধকৃত সময়')}</th>
                  <th className="py-3 px-4">{tBilingual('Reason', 'কারণ')}</th>
                  <th className="py-3 px-3 text-center">{tBilingual('Status', 'অবস্থা')}</th>
                  <th className="py-3 px-4 text-right">{tBilingual('Actions', 'অ্যাকশন')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCorrections.map((corr) => {
 const isProcessing = processingId === corr.id
 return (
                    <tr key={corr.id} className="hover:bg-muted transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {corr.employee_name || 'Staff Member'}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">
                        {corr.attendance_date}
                      </td>
                      <td className="py-3 px-3 capitalize font-medium text-foreground">
                        {corr.requested_type.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-primary">
                        {corr.requested_time}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate"title={corr.reason}>
                        {corr.reason || '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
 variant="outline"className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full ${getStatusBadge(
 corr.status
                          )}`}
                        >{corr.status === 'approved' ? tBilingual('Approved', 'অনুমোদিত') : corr.status === 'rejected' ? tBilingual('Rejected', 'বাতিলকৃত') : tBilingual('Pending', 'অপেক্ষমাণ')}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {corr.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
 size="sm"disabled={isProcessing}
 onClick={() => handleReviewAction(corr.id, 'approved')}
 className="h-7 px-2.5 text-xs font-medium bg-success hover:bg-success text-white min-h-[28px]">
                              <Check className="w-3.5 h-3.5 mr-1"/>
                              <span>{tBilingual('Approve', 'অনুমোদন')}</span>
                            </Button>
                            <Button
 size="sm"variant="outline"disabled={isProcessing}
 onClick={() => handleReviewAction(corr.id, 'rejected')}
 className="h-7 px-2.5 text-xs font-medium border-danger-border text-destructive hover:bg-danger-surface min-h-[28px]">
                              <X className="w-3.5 h-3.5 mr-1"/>
                              <span>{tBilingual('Reject', 'বাতিল')}</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground capitalize">
 {tBilingual(`Reviewed by ${corr.reviewed_by_name || 'Manager'}`, `${corr.reviewed_by_name || 'ম্যানেজার'} দ্বারা পর্যালোচিত`)}
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
