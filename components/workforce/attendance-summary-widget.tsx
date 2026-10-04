'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, UserCheck, Clock, UserMinus, UserX, Activity } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n/context'

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
  const { tBilingual } = useI18n()
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
 color: 'text-success bg-success-surface border-success-border',
 badgeBg: 'bg-success-surface text-success',
    },
    {
 label: 'Late',
 labelBn: 'দেরিতে আগমন',
 count: late,
 icon: Clock,
 color: 'text-warning bg-warning-surface border-warning-border',
 badgeBg: 'bg-warning-surface text-warning',
    },
    {
 label: 'On Leave',
 labelBn: 'ছুটিতে',
 count: leave,
 icon: UserMinus,
 color: 'text-primary bg-primary/10 border-primary/20',
 badgeBg: 'bg-primary/10 text-primary',
    },
    {
 label: 'Absent',
 labelBn: 'অনুপস্থিত',
 count: absent,
 icon: UserX,
 color: 'text-destructive bg-danger-surface border-danger-border',
 badgeBg: 'bg-danger-surface text-destructive',
    },
    {
 label: 'Currently Working',
 labelBn: 'বর্তমানে কর্মরত (ফ্লোরে)',
 count: currentlyWorking,
 icon: Activity,
 color: 'text-primary bg-primary/10 border-primary/20',
 badgeBg: 'bg-primary/10 text-primary',
    },
  ]

 return (
    <Card className="bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl flex flex-col justify-between h-full">
      <CardHeader className="pb-3 border-b border-border px-5 pt-5 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <span>{tBilingual("Today's Attendance", 'আজকের হাজিরা')}</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tBilingual(
              `${attendanceRatio}% workforce attendance rate today (${present + late}/${totalActive} active)`,
              `আজ উপস্থিতির হার ${attendanceRatio}% (${totalActive} জনের মধ্যে ${present + late} জন)`
            )}
          </p>
        </div>
        <Link
 href={`/${tenantSlug}/hr/attendance`}
 className="text-xs font-medium text-primary hover:text-primary flex items-center gap-1 shrink-0">
          <span>{tBilingual('Floor Roster', 'ফ্লোর রোস্টার')}</span>
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
                    {tBilingual(item.label, item.labelBn)}
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
