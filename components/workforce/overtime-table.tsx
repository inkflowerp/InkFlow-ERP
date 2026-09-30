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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'paid':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200'
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200 p-6">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
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
          <h3 className="text-base font-semibold text-slate-900">Overtime Requests & Approvals</h3>
          <p className="text-xs text-slate-500">
            Verify worked extra hours, multiplier rates and total overtime payouts
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto overflow-x-auto">
          {[
            { id: 'pending_approval', label: 'Pending Approval' },
            { id: 'approved', label: 'Approved' },
            { id: 'paid', label: 'Paid' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'all', label: 'All Records' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === st.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <Card className="bg-white border-slate-200 py-12 text-center">
          <p className="text-sm font-medium text-slate-600">No overtime records found</p>
          <p className="text-xs text-slate-400 mt-1">There are no requests matching this status.</p>
        </Card>
      ) : (
        <Card className="bg-white border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">OT Type</th>
                  <th className="py-3 px-3 text-center">Duration</th>
                  <th className="py-3 px-3 text-right">Base Rate</th>
                  <th className="py-3 px-3 text-center">Multiplier</th>
                  <th className="py-3 px-3 text-right">OT Rate</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => {
                  const isProcessing = processingId === rec.id
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{rec.employee_name || 'Staff Member'}</div>
                        <div className="text-[11px] text-slate-400 capitalize">{rec.employee_department}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{rec.ot_date}</td>
                      <td className="py-3 px-3 capitalize font-medium text-slate-700">
                        {rec.ot_type.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800 tabular-nums">
                        {rec.duration_hours || Math.round((rec.duration_minutes / 60) * 10) / 10} hrs
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">
                        ৳ {rec.base_hourly_rate || 0}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                        {rec.multiplier || 1.5}x
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">
                        ৳ {rec.effective_ot_rate || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                        ৳ {rec.calculated_amount ? rec.calculated_amount.toLocaleString('en-IN') : 0}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full ${getStatusBadge(
                            rec.status
                          )}`}
                        >
                          {rec.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {rec.status === 'pending_approval' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleReviewAction(rec.id, 'approved')}
                              className="h-7 px-2.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white min-h-[28px]"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              <span>Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isProcessing}
                              onClick={() => handleReviewAction(rec.id, 'rejected')}
                              className="h-7 px-2.5 text-xs font-medium border-red-200 text-red-600 hover:bg-red-50 min-h-[28px]"
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              <span>Reject</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 capitalize">
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
