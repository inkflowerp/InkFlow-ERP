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
  Scissors,
  Play,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { ProductionKpiMetrics } from '@/services/production.service'

export interface ProductionKpiBarProps {
  metrics: ProductionKpiMetrics & { finishingCount?: number }
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
      titleEn: 'Total Jobs',
      titleBn: 'মোট কাজ',
      count: metrics.totalTasks,
      icon: Layers,
      color: 'text-slate-700 dark:text-slate-200',
      iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      activeBorder: 'border-slate-800 dark:border-slate-200 ring-2 ring-slate-800/10',
      bgColor: 'bg-white/90 dark:bg-slate-900/90',
    },
    {
      id: 'running',
      titleEn: 'Running Now',
      titleBn: 'মেশিনে রানিং',
      count: metrics.runningNow,
      icon: Play,
      color: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20',
      bgColor: 'bg-gradient-to-br from-white via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20',
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
      iconBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
      activeBorder: 'border-purple-500 ring-2 ring-purple-500/20',
      bgColor: 'bg-gradient-to-br from-white via-white to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/20',
    },
    {
      id: 'finishing',
      titleEn: 'Finishing & QC',
      titleBn: 'ফিনিশিং ও কিউসি',
      count: metrics.finishingCount ?? 0,
      icon: Scissors,
      color: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
      activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/20',
      bgColor: 'bg-gradient-to-br from-white via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20',
    },
    {
      id: 'urgent',
      titleEn: 'Rush / Urgent',
      titleBn: 'জরুরি ডেলিভারি',
      count: metrics.urgentCount,
      icon: ShieldAlert,
      color: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20',
      bgColor: 'bg-gradient-to-br from-white via-white to-rose-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/20',
      badge: metrics.urgentCount > 0 ? 'URGENT' : undefined,
      badgeColor: 'bg-rose-600 text-white animate-pulse',
    },
    {
      id: 'completed',
      titleEn: 'Completed Today',
      titleBn: 'আজ সম্পন্ন',
      count: metrics.completedToday,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
      bgColor: 'bg-gradient-to-br from-white via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        const isSelected = selectedFilter === kpi.id

        return (
          <button
            key={kpi.id}
            type="button"
            onClick={() => onSelectFilter(isSelected && kpi.id !== 'all' ? 'all' : kpi.id)}
            className="text-left w-full focus:outline-hidden transition-transform active:scale-[0.98] cursor-pointer"
          >
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden backdrop-blur-md shadow-xs ${
                isSelected
                  ? `${kpi.activeBorder} shadow-sm bg-white dark:bg-slate-900`
                  : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              } ${kpi.bgColor}`}
            >
              {kpi.badge && (
                <div className="absolute right-2.5 top-2.5">
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${kpi.badgeColor}`}
                  >
                    {kpi.badge}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                  {isBn ? kpi.titleBn : kpi.titleEn}
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${kpi.color}`}>
                  {kpi.count}
                </div>
                {kpi.id === 'running' && (
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
                    Fleet
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
