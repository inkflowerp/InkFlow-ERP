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
import { useI18n } from '@/i18n/context'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { cn } from '@/lib/utils'

export interface QuotationKpiMetrics {
  openPipeline: number
  activeCount: number
  followUpToday: number
  expiringSoon: number
  negotiatingCount?: number
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
  const { tBilingual } = useI18n()
  const negotiatingVal = metrics.negotiatingCount ?? 0

  const cards = [
    {
      id: 'active',
      labelEn: 'Open Pipeline',
      labelBn: 'চলতি পাইপলাইন',
      value: <CurrencyDisplay amount={metrics.openPipeline} />,
      subtextEn: `${metrics.activeCount} active proposals`,
      subtextBn: `${metrics.activeCount}টি চলমান কোটেশন`,
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      borderColor: 'border-blue-200 dark:border-blue-800/60',
      activeRing: 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/30',
      filterTarget: 'active',
    },
    {
      id: 'follow_up_today',
      labelEn: 'Follow-Up Today',
      labelBn: 'আজকের ফলো-আপ',
      value: metrics.followUpToday,
      subtextEn: 'Scheduled today',
      subtextBn: 'আজকে যোগাযোগ করতে হবে',
      icon: Clock,
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: 'border-amber-200 dark:border-amber-800/60',
      activeRing: 'ring-2 ring-amber-500 bg-amber-50/50 dark:bg-amber-950/30',
      filterTarget: 'follow_up_today',
      badge: metrics.followUpToday > 0 ? `${metrics.followUpToday} Due` : undefined,
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200',
    },
    {
      id: 'expiring_soon',
      labelEn: 'Expiring Soon',
      labelBn: 'মেয়াদ শেষের পথে',
      value: metrics.expiringSoon,
      subtextEn: 'Expiring in ≤ 3 days',
      subtextBn: '৩ দিনের মধ্যে মেয়াদ শেষ',
      icon: AlertTriangle,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      borderColor: 'border-rose-200 dark:border-rose-800/60',
      activeRing: 'ring-2 ring-rose-500 bg-rose-50/50 dark:bg-rose-950/30',
      filterTarget: 'expiring_soon',
      badge: metrics.expiringSoon > 0 ? 'Urgent' : undefined,
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200',
    },
    {
      id: 'negotiation',
      labelEn: 'Negotiating',
      labelBn: 'দরকষাকষি চলছে',
      value: negotiatingVal > 0 ? (
        <span className="text-xl">{negotiatingVal} <span className="text-xs font-normal text-slate-400">Quotes</span></span>
      ) : (
        0
      ),
      subtextEn: 'Awaiting client decision',
      subtextBn: 'মূল্য নির্ধারণ প্রক্রিয়াধীন',
      icon: FileCheck2,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/40',
      borderColor: 'border-cyan-200 dark:border-cyan-800/60',
      activeRing: 'ring-2 ring-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30',
      filterTarget: 'negotiation',
    },
    {
      id: 'converted',
      labelEn: 'Won & Converted',
      labelBn: 'অনুমোদিত ও অর্ডার',
      value: <CurrencyDisplay amount={metrics.wonValue} />,
      subtextEn: `${metrics.wonCount} converted orders`,
      subtextBn: `${metrics.wonCount}টি সফল অর্ডার`,
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
              'text-left transition-all duration-200 rounded-2xl p-3.5 border focus:outline-hidden cursor-pointer group shadow-2xs hover:shadow-xs flex flex-col justify-between min-h-[110px] select-none',
              c.borderColor,
              isSelected
                ? c.activeRing
                : 'bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500'
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider line-clamp-1 bangla-text">
                {tBilingual(c.labelEn, c.labelBn)}
              </span>
              <div className="flex items-center gap-1.5">
                {c.badge && (
                  <Badge variant="outline" className={cn('text-2xs py-0 px-1 font-bold font-mono', c.badgeColor)}>
                    {c.badge}
                  </Badge>
                )}
                <div className={cn('h-7 w-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs', c.bgColor, c.color)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            <div className="my-1">
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                {c.value}
              </div>
            </div>

            <div className="flex items-center justify-between w-full text-2xs text-slate-400 dark:text-slate-500 font-medium">
              <span className="truncate bangla-text">{tBilingual(c.subtextEn, c.subtextBn)}</span>
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-1 text-blue-500" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
