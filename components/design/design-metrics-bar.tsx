'use client'

import React from 'react'
import {
  FileText,
  Edit3,
  Clock,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DesignMetrics {
  total: number
  newTasks: number
  designRunning: number
  waitingApproval: number
  revision?: number
  inProduction: number
  dueToday?: number
  walkIn?: number
}

interface DesignMetricsBarProps {
  metrics: DesignMetrics
  activeFilter?: string
  onSelectFilter?: (filter: string) => void
}

export const DesignMetricsBar = React.memo(function DesignMetricsBar({
  metrics,
  activeFilter = 'all',
  onSelectFilter,
}: DesignMetricsBarProps) {
  const cards = [
    {
      id: 'all',
      label: 'Total Jobs',
      count: metrics.total,
      icon: FileText,
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400',
    },
    {
      id: 'new_tasks',
      label: 'New',
      count: metrics.newTasks,
      icon: Edit3,
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400',
    },
    {
      id: 'design_running',
      label: 'Designing',
      count: metrics.designRunning,
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400',
    },
    {
      id: 'waiting_approval',
      label: 'Waiting Approval',
      count: metrics.waitingApproval,
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400',
    },
    {
      id: 'revision',
      label: 'Revision',
      count: metrics.revision ?? 0,
      icon: RotateCcw,
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400',
    },
    {
      id: 'approved',
      label: 'Approved',
      count: metrics.inProduction,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon
        const isActive = activeFilter === card.id

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectFilter?.(card.id)}
            className={cn(
              'bg-white dark:bg-slate-900 border rounded-2xl p-3.5 sm:p-4 text-left transition-all duration-150 flex items-center gap-3.5 shadow-2xs hover:shadow-xs cursor-pointer',
              isActive
                ? 'border-indigo-500/80 ring-2 ring-indigo-500/20 shadow-xs'
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
