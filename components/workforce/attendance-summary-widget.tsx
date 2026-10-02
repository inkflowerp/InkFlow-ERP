'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, UserCheck, Clock, UserMinus, UserX, Activity } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export interface AttendanceSummaryWidgetProps {
 present: number
 late: number
 leave: number
 absent: number
 currentlyWorking: number
 totalActive: number
 isLoading?: boolean
 tenantSlug: string
}

export function AttendanceSummaryWidget({
 present,
 late,
 leave,
 absent,
 currentlyWorking,
 totalActive,
 isLoading = false,
 tenantSlug,
}: AttendanceSummaryWidgetProps) {
 if (isLoading) {
 return (
      <Card className="p-4 bg-card border-border shadow-none">
        <Skeleton className="h-6 w-44 mb-4"/>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full"/>
          ))}
        </div>
      </Card>
    )
  }

 const attendanceRatio = totalActive > 0 ? Math.round(((present + late) / totalActive) * 100) : 0

 const items = [
    {
 label: 'Present',
 labelBn: 'উপস্থিত',
 count: present,
 icon: UserCheck,
 color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
 badgeBg: 'bg-emerald-100 text-emerald-800',
    },
    {
 label: 'Late',
 labelBn: 'দেরিতে আগমন',
 count: late,
 icon: Clock,
 color: 'text-amber-700 bg-amber-50 border-amber-200',
 badgeBg: 'bg-amber-100 text-amber-800',
    },
    {
 label: 'On Leave',
 labelBn: 'ছুটিতে',
 count: leave,
 icon: UserMinus,
 color: 'text-blue-700 bg-blue-50 border-blue-200',
 badgeBg: 'bg-blue-100 text-blue-800',
    },
    {
 label: 'Absent',
 labelBn: 'অনুপস্থিত',
 count: absent,
 icon: UserX,
 color: 'text-rose-700 bg-rose-50 border-rose-200',
 badgeBg: 'bg-rose-100 text-rose-800',
    },
    {
 label: 'Currently Working',
 labelBn: 'বর্তমানে কর্মরত (ফ্লোরে)',
 count: currentlyWorking,
 icon: Activity,
 color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
 badgeBg: 'bg-indigo-100 text-indigo-800',
    },
  ]

 return (
    <Card className="bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl flex flex-col justify-between h-full">
      <CardHeader className="pb-3 border-b border-border px-5 pt-5 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <span>Today's Attendance</span>
            <span className="text-xs font-normal text-muted-foreground">আজকের হাজিরা</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {attendanceRatio}% workforce attendance rate today ({present + late}/{totalActive} active)
          </p>
        </div>
        <Link
 href={`/${tenantSlug}/hr/attendance`}
 className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0">
          <span>Floor Roster</span>
          <ArrowRight className="w-3.5 h-3.5"/>
        </Link>
      </CardHeader>
      <CardContent className="px-5 py-4 space-y-2.5">
        {items.map((item) => {
 const Icon = item.icon
 return (
            <div
 key={item.label}
 className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-md border ${item.color}`}>
                  <Icon className="w-4 h-4"/>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground leading-tight">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-normal">
                    {item.labelBn}
                  </div>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full tabular-nums ${item.badgeBg}`}>
                {item.count}
              </span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
