'use client'

import React from 'react'
import {
  Printer,
  Flame,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ShieldAlert,
  Layers,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useI18n } from '@/i18n/context'
import { ProductionKpiMetrics } from '@/services/production.service'

export interface ProductionKpiBarProps {
  metrics: ProductionKpiMetrics
  selectedFilter: string
  onSelectFilter: (filterId: string) => void
}

export function ProductionKpiBar({
  metrics,
  selectedFilter,
  onSelectFilter,
}: ProductionKpiBarProps) {
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  const kpis = [
    {
      id: 'all',
      titleEn: 'Total Tasks',
      titleBn: 'মোট কাজ',
      count: metrics.totalTasks,
      icon: Layers,
      color: 'text-slate-700 dark:text-slate-200',
      activeBorder: 'border-slate-800 dark:border-slate-200 ring-2 ring-slate-800/10',
      bgColor: 'bg-white dark:bg-slate-900',
    },
    {
      id: 'running',
      titleEn: 'Running Now',
      titleBn: 'মেশিনে চলমান',
      count: metrics.runningNow,
      icon: Flame,
      color: 'text-blue-600 dark:text-blue-400',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20',
      bgColor: 'bg-blue-50/40 dark:bg-blue-950/20',
      badge: 'LIVE',
      badgeColor: 'bg-blue-600 text-white',
    },
    {
      id: 'queued',
      titleEn: 'Queued & Ready',
      titleBn: 'মাউন্টিং প্রস্তুত',
      count: metrics.queuedReady,
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      activeBorder: 'border-purple-500 ring-2 ring-purple-500/20',
      bgColor: 'bg-purple-50/40 dark:bg-purple-950/20',
    },
    {
      id: 'urgent',
      titleEn: 'Rush / Urgent',
      titleBn: 'জরুরি ডেলিভারি',
      count: metrics.urgentCount,
      icon: ShieldAlert,
      color: 'text-rose-600 dark:text-rose-400',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20',
      bgColor: 'bg-rose-50/40 dark:bg-rose-950/20',
      badge: metrics.urgentCount > 0 ? 'URGENT' : undefined,
      badgeColor: 'bg-rose-600 text-white animate-pulse',
    },
    {
      id: 'on_hold',
      titleEn: 'On Hold / Blocked',
      titleBn: 'স্থগিতাদেশ',
      count: metrics.onHold,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20',
      bgColor: 'bg-amber-50/40 dark:bg-amber-950/20',
      badge: metrics.onHold > 0 ? 'HOLD' : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'completed',
      titleEn: 'Completed Today',
      titleBn: 'আজ সম্পন্ন',
      count: metrics.completedToday,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
      bgColor: 'bg-emerald-50/40 dark:bg-emerald-950/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        const isSelected = selectedFilter === kpi.id

        return (
          <button
            key={kpi.id}
            type="button"
            onClick={() => onSelectFilter(isSelected && kpi.id !== 'all' ? 'all' : kpi.id)}
            className="text-left w-full focus:outline-hidden transition-transform active:scale-[0.98]"
          >
            <Card
              className={`p-3.5 border transition-all hover:shadow-md relative overflow-hidden ${
                isSelected
                  ? `${kpi.activeBorder} shadow-sm`
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              } ${kpi.bgColor}`}
            >
              {kpi.badge && (
                <div className="absolute right-2 top-2">
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${kpi.badgeColor}`}
                  >
                    {kpi.badge}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Icon className={`h-4 w-4 shrink-0 ${kpi.color}`} />
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                  {isBn ? kpi.titleBn : kpi.titleEn}
                </span>
              </div>

              <div className="mt-1.5 flex items-baseline justify-between">
                <div className={`text-xl font-black font-mono tracking-tight ${kpi.color}`}>
                  {kpi.count}
                </div>
                {kpi.id === 'running' && (
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    Fleet Active
                  </span>
                )}
              </div>
            </Card>
          </button>
        )
      })}
    </div>
  )
}
