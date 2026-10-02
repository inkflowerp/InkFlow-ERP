'use client'

import React from 'react'
import Link from 'next/link'
import { Users, UserCheck, UserX, Clock, Wallet, Clock4 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export interface WorkforceKpiGridProps {
 totalEmployees: number
 presentToday: number
 absentToday: number
 lateToday: number
 payrollDue: number
 overtimePendingHours: number
 isLoading?: boolean
 tenantSlug: string
}

export function WorkforceKpiGrid({
 totalEmployees,
 presentToday,
 absentToday,
 lateToday,
 payrollDue,
 overtimePendingHours,
 isLoading = false,
 tenantSlug,
}: WorkforceKpiGridProps) {
 const cards = [
    {
 id: 'total_employees',
 label: 'Total Employees',
 labelBn: 'মোট কর্মী',
 value: totalEmployees.toString(),
 icon: Users,
 iconColor: 'text-blue-600',
 bgColor: 'bg-blue-50',
 borderColor: 'border-border',
 href: `/${tenantSlug}/hr/employees`,
    },
    {
 id: 'present_today',
 label: 'Present Today',
 labelBn: 'আজ উপস্থিত',
 value: presentToday.toString(),
 icon: UserCheck,
 iconColor: 'text-emerald-600',
 bgColor: 'bg-emerald-50',
 borderColor: 'border-border',
 href: `/${tenantSlug}/hr/attendance`,
    },
    {
 id: 'absent_today',
 label: 'Absent Today',
 labelBn: 'আজ অনুপস্থিত',
 value: absentToday.toString(),
 icon: UserX,
 iconColor: 'text-red-600',
 bgColor: 'bg-red-50',
 borderColor: 'border-border',
 href: `/${tenantSlug}/hr/attendance`,
    },
    {
 id: 'late_today',
 label: 'Late Today',
 labelBn: 'দেরিতে আগমন',
 value: lateToday.toString(),
 icon: Clock,
 iconColor: 'text-amber-600',
 bgColor: 'bg-amber-50',
 borderColor: 'border-border',
 href: `/${tenantSlug}/hr/attendance`,
    },
    {
 id: 'payroll_due',
 label: 'Payroll Due',
 labelBn: 'বকেয়া বেতন',
 value: `৳ ${payrollDue.toLocaleString('en-IN')}`,
 icon: Wallet,
 iconColor: 'text-rose-600',
 bgColor: 'bg-rose-50',
 borderColor: 'border-border',
 href: `/${tenantSlug}/hr/payroll`,
    },
    {
 id: 'overtime_pending',
 label: 'Overtime Pending',
 labelBn: 'ওভারটাইম পেন্ডিং',
 value: `${overtimePendingHours} hrs`,
 icon: Clock4,
 iconColor: 'text-indigo-600',
 bgColor: 'bg-indigo-50',
 borderColor: 'border-border',
 href: `/${tenantSlug}/hr/attendance?tab=overtime`,
    },
  ]

 if (isLoading) {
 return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-3.5 bg-card border-border shadow-none">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-20"/>
              <Skeleton className="h-8 w-8 rounded-lg"/>
            </div>
            <Skeleton className="h-7 w-16"/>
          </Card>
        ))}
      </div>
    )
  }

 return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
 const Icon = c.icon
 return (
          <Link key={c.id} href={c.href} className="block group">
            <Card
 className={`p-3.5 bg-card border ${c.borderColor} hover:border-input transition-all rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] h-full flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-[12px] font-medium text-muted-foreground truncate"title={`${c.label} (${c.labelBn})`}>
                  {c.label}
                </span>
                <div className={`p-1.5 rounded-lg ${c.bgColor} shrink-0`}>
                  <Icon className={`w-4 h-4 ${c.iconColor}`} />
                </div>
              </div>
              <div>
                <span className="text-xl lg:text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {c.value}
                </span>
                <span className="block text-[11px] text-muted-foreground font-normal truncate mt-0.5">
                  {c.labelBn}
                </span>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
