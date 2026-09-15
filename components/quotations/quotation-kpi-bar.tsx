'use client'

import React from 'react'
import {
  TrendingUp,
  FileCheck2,
  Clock,
  AlertTriangle,
  Award,
  ArrowRight,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { cn } from '@/lib/utils'

export interface QuotationKpiMetrics {
  openPipeline: number
  activeCount: number
  followUpToday: number
  expiringSoon: number
  wonCount: number
  wonValue: number
  totalQuotes: number
}

export interface QuotationKpiBarProps {
  metrics: QuotationKpiMetrics
  selectedFilter: string
  onSelectFilter: (filter: string) => void
}

export function QuotationKpiBar({
  metrics,
  selectedFilter,
  onSelectFilter,
}: QuotationKpiBarProps) {
  const cards = [
    {
      id: 'active',
      label: 'Open Pipeline',
      labelBn: 'চলতি পাইপলাইন',
      value: <CurrencyDisplay amount={metrics.openPipeline} />,
      subtext: `${metrics.activeCount} active proposals in play`,
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      borderColor: 'border-blue-200 dark:border-blue-800/60',
      activeRing: 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/30',
      filterTarget: 'active',
    },
    {
      id: 'follow_up_today',
      label: 'Follow-Up Today',
      labelBn: 'আজকের ফলো-আপ',
      value: metrics.followUpToday,
      subtext: 'Scheduled or overdue contacts',
      icon: Clock,
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: 'border-amber-200 dark:border-amber-800/60',
      activeRing: 'ring-2 ring-amber-500 bg-amber-50/50 dark:bg-amber-950/30',
      filterTarget: 'follow_up_today',
      badge: metrics.followUpToday > 0 ? `${metrics.followUpToday} Due` : undefined,
    },
    {
      id: 'expiring_soon',
      label: 'Expiring Soon',
      labelBn: 'মেয়াদোত্তীর্ণের কাছাকাছি',
      value: metrics.expiringSoon,
      subtext: 'Expiring in ≤ 3 days',
      icon: AlertTriangle,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      borderColor: 'border-rose-200 dark:border-rose-800/60',
      activeRing: 'ring-2 ring-rose-500 bg-rose-50/50 dark:bg-rose-950/30',
      filterTarget: 'expiring_soon',
      badge: metrics.expiringSoon > 0 ? 'Urgent' : undefined,
    },
    {
      id: 'negotiation',
      label: 'Negotiating',
      labelBn: 'দরকষাকষি চলছে',
      value: metrics.activeCount > 0 ? (
        <span className="text-xl">{metrics.activeCount} <span className="text-xs font-normal text-slate-400">Quotes</span></span>
      ) : (
        0
      ),
      subtext: 'Awaiting client confirmation',
      icon: FileCheck2,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/40',
      borderColor: 'border-cyan-200 dark:border-cyan-800/60',
      activeRing: 'ring-2 ring-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30',
      filterTarget: 'negotiation',
    },
    {
      id: 'converted',
      label: 'Won & Converted',
      labelBn: 'অনুমোদিত ও সফল রূপান্তর',
      value: <CurrencyDisplay amount={metrics.wonValue} />,
      subtext: `${metrics.wonCount} job tickets & invoices`,
      icon: Award,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200 dark:border-emerald-800/60',
      activeRing: 'ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30',
      filterTarget: 'converted',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => {
        const Icon = c.icon
        const isSelected = selectedFilter === c.filterTarget

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectFilter(isSelected ? 'all' : c.filterTarget)}
            className={cn(
              'text-left transition-all duration-150 rounded-xl p-3.5 border focus:outline-none cursor-pointer group shadow-xs hover:shadow-sm flex flex-col justify-between min-h-[105px]',
              c.borderColor,
              isSelected
                ? c.activeRing
                : 'bg-white dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700'
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider line-clamp-1">
                {c.label}
              </span>
              <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0', c.bgColor, c.color)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="my-1">
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {c.value}
              </div>
            </div>

            <div className="flex items-center justify-between w-full text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              <span className="truncate">{c.subtext}</span>
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-1 text-slate-400" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
