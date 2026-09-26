'use client'

import React from 'react'
import {
  Printer,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Layers,
  Scissors,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'
import { ProductionKpiMetrics } from '@/services/production.service'

export interface ProductionKpiBarProps {
  metrics: ProductionKpiMetrics & { finishingCount?: number }
  selectedFilter: string
  onSelectFilter: (filterId: string) => void
}

export const ProductionKpiBar = React.memo(function ProductionKpiBar({
  metrics,
  selectedFilter,
  onSelectFilter,
}: ProductionKpiBarProps) {
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  const cards = [
    {
      id: 'all',
      label: isBn ? 'মোট কাজ' : 'Total Jobs',
      count: metrics.totalTasks,
      icon: Layers,
      iconBg: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      id: 'running',
      label: isBn ? 'মেশিনে রানিং' : 'Running Now',
      count: metrics.runningNow,
      icon: Printer,
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400',
    },
    {
      id: 'queued',
      label: isBn ? 'মাউন্টিং প্রস্তুত' : 'Queued & Ready',
      count: metrics.queuedReady,
      icon: Clock,
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400',
    },
    {
      id: 'finishing',
      label: isBn ? 'ফিনিশিং ও কিউসি' : 'Finishing & QC',
      count: metrics.finishingCount ?? 0,
      icon: Scissors,
      iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400',
    },
    {
      id: 'urgent',
      label: isBn ? 'জরুরি ডেলিভারি' : 'Rush / Urgent',
      count: metrics.urgentCount,
      icon: ShieldAlert,
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400',
    },
    {
      id: 'completed',
      label: isBn ? 'আজ সম্পন্ন' : 'Completed',
      count: metrics.completedToday,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon
        const isActive = selectedFilter === card.id

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectFilter(isActive && card.id !== 'all' ? 'all' : card.id)}
            className={cn(
              'bg-white dark:bg-slate-900 border rounded-2xl p-3.5 sm:p-4 text-left transition-all duration-150 flex items-center gap-3.5 shadow-2xs hover:shadow-xs cursor-pointer',
              isActive
                ? 'border-blue-500/80 ring-2 ring-blue-500/20 shadow-xs'
                : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform',
                card.iconBg
              )}
            >
              <Icon className="w-5 h-5 stroke-[2.2]" />
            </div>

            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white leading-none">
                {card.count}
              </div>
              <div className="text-2xs sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
                {card.label}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
})
