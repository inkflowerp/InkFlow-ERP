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
 if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
 if (status === 'rejected') return 'bg-red-50 text-red-700 border-red-200'
 return 'bg-amber-50 text-amber-700 border-amber-200'
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
          <h3 className="text-base font-semibold text-foreground">Attendance Corrections Inbox</h3>
          <p className="text-xs text-muted-foreground">Employee punch adjustment requests requiring manager sign-off</p>
        </div>

        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg text-xs">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
            <button
 key={st}
 onClick={() => setFilterStatus(st)}
 className={`px-3 py-1 rounded-md capitalize font-medium transition-colors ${
 filterStatus === st
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {filteredCorrections.length === 0 ? (
        <Card className="bg-card border-border py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">No {filterStatus} correction requests</p>
          <p className="text-xs text-muted-foreground mt-1">All employee punch corrections are up to date.</p>
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted border-b border-border text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Requested Time</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
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
                      <td className="py-3 px-3 font-mono font-semibold text-blue-600">
                        {corr.requested_time}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate"title={corr.reason}>
                        {corr.reason || '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
 variant="outline"className={`text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full ${getStatusBadge(
 corr.status
                          )}`}
                        >
                          {corr.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {corr.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
 size="sm"disabled={isProcessing}
 onClick={() => handleReviewAction(corr.id, 'approved')}
 className="h-7 px-2.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white min-h-[28px]">
                              <Check className="w-3.5 h-3.5 mr-1"/>
                              <span>Approve</span>
                            </Button>
                            <Button
 size="sm"variant="outline"disabled={isProcessing}
 onClick={() => handleReviewAction(corr.id, 'rejected')}
 className="h-7 px-2.5 text-xs font-medium border-red-200 text-red-600 hover:bg-red-50 min-h-[28px]">
                              <X className="w-3.5 h-3.5 mr-1"/>
                              <span>Reject</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground capitalize">
 Reviewed by {corr.reviewed_by_name || 'Manager'}
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
