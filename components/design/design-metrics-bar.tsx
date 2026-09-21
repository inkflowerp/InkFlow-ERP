'use client'

import React from 'react'
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Printer,
  AlertCircle,
  UserCheck,
  Layers,
} from 'lucide-react'

export interface DesignMetrics {
  total: number
  newTasks: number
  designRunning: number
  waitingApproval: number
  inProduction: number
  dueToday: number
  walkIn: number
}

interface DesignMetricsBarProps {
  metrics: DesignMetrics
  activeFilter: string
  onSelectFilter: (filter: string) => void
}

export const DesignMetricsBar = React.memo(function DesignMetricsBar({
  metrics,
  activeFilter,
  onSelectFilter,
}: DesignMetricsBarProps) {
  const cards = [
    {
      id: 'all',
      title: 'মোট ডিজাইন কাজ',
      subtitle: 'Total Jobs',
      count: metrics.total,
      icon: Layers,
      color: 'text-slate-700 dark:text-slate-200',
      bgColor: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      activeBorder: 'border-slate-800 dark:border-slate-200 ring-2 ring-slate-400/30',
    },
    {
      id: 'new_tasks',
      title: 'নতুন রিকোয়ারমেন্ট / চেক',
      subtitle: 'New Queue',
      count: metrics.newTasks,
      icon: Sparkles,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50',
      activeBorder: 'border-amber-500 ring-2 ring-amber-400/30',
    },
    {
      id: 'design_running',
      title: 'ডিজাইন চলতেছে',
      subtitle: 'In Progress',
      count: metrics.designRunning,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50',
      activeBorder: 'border-blue-500 ring-2 ring-blue-400/30',
    },
    {
      id: 'waiting_approval',
      title: 'অনুমোদনের অপেক্ষা',
      subtitle: 'Waiting Approval',
      count: metrics.waitingApproval,
      icon: AlertCircle,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50',
      activeBorder: 'border-purple-500 ring-2 ring-purple-400/30',
    },
    {
      id: 'in_production',
      title: 'প্রেসে চালু',
      subtitle: 'Production Floor',
      count: metrics.inProduction,
      icon: Printer,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-400/30',
    },
    {
      id: 'urgent_today',
      title: 'আজকের ডেলিভারি',
      subtitle: 'Due Today',
      count: metrics.dueToday,
      icon: CheckCircle2,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50',
      activeBorder: 'border-rose-500 ring-2 ring-rose-400/30',
    },
    {
      id: 'walk_in',
      title: 'দোকানে বসা কাস্টমার',
      subtitle: 'Walk-in Waiting',
      count: metrics.walkIn,
      icon: UserCheck,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50',
      activeBorder: 'border-orange-500 ring-2 ring-orange-400/30',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
      {cards.map((c) => {
        const Icon = c.icon
        const isActive = activeFilter === c.id
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectFilter(c.id)}
            className={`p-3 rounded-xl border text-left transition-all duration-200 hover:shadow-sm ${
              c.bgColor
            } ${isActive ? c.activeBorder : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                {c.subtitle}
              </span>
              <Icon className={`h-4 w-4 shrink-0 ${c.color}`} />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                {c.count}
              </span>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[85px]">
                {c.title}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
})
