'use client'

import React from 'react'
import { Sparkles, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LiveDhakaClock } from '@/components/shared/live-dhaka-clock'
import { useI18n } from '@/i18n/context'

interface DashboardHeaderProps {
  companyName?: string | null
  companyNameBn?: string | null
  branchName?: string | null
  userDisplayName: string
  activeResponsibilities: string[]
}

export function DashboardHeader({
  companyName,
  companyNameBn,
  branchName,
  userDisplayName,
  activeResponsibilities,
}: DashboardHeaderProps) {
  const { locale, tBilingual } = useI18n()

  const orgTitle = companyName
    ? tBilingual(companyName, companyNameBn || companyName)
    : 'PrintERP Organization'

  const branchDisplay = branchName ? ` • ${branchName.split('(')[0].trim()}` : ''

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-5 sm:p-6 text-white shadow-xl shadow-blue-900/10">
      <div className="space-y-1.5 min-w-0">
        <div
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-cyan-300 backdrop-blur-sm"
          suppressHydrationWarning
        >
          <Sparkles className="h-3 w-3 shrink-0" />
          <span className="truncate" suppressHydrationWarning>
            {orgTitle}
            {branchDisplay}
          </span>
        </div>

        <h1
          className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight bangla-text leading-tight"
          suppressHydrationWarning
        >
          {tBilingual('Welcome back,', 'স্বাগতম,')} {userDisplayName}
        </h1>

        <p className="text-xs sm:text-sm text-slate-200 bangla-text">
          {tBilingual(
            'Real-time operational dashboard tailored to your active responsibilities.',
            'আপনার দায়িত্ব ও পারমিশন অনুযায়ী ব্যক্তিগতকৃত লাইভ ড্যাশবোর্ড।'
          )}
        </p>
      </div>

      <div className="flex flex-wrap md:flex-col md:items-end gap-1.5 shrink-0">
        <div className="flex flex-wrap items-center gap-1">
          {activeResponsibilities.map((resp) => (
            <Badge
              key={resp}
              variant="outline"
              className="bg-white/10 text-white border-white/20 text-xs py-0.5 capitalize bangla-text"
            >
              {resp.replace('_', ' ')}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
          <span className="flex items-center gap-1" suppressHydrationWarning>
            <Calendar className="h-3.5 w-3.5 text-cyan-300" />
            {new Date().toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US', {
              timeZone: 'Asia/Dhaka',
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span>·</span>
          <LiveDhakaClock
            showSeconds={true}
            showIcon={true}
            className="inline-flex items-center gap-1 tabular-nums text-xs font-semibold text-cyan-200"
          />
        </div>
      </div>
    </div>
  )
}
