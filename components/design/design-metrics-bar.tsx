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
      color: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
      activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs',
    },
    {
      id: 'new_tasks',
      title: 'নতুন কাজ / ফাইল চেক',
      subtitle: 'New Queue',
      count: metrics.newTasks,
      icon: Sparkles,
      color: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20 shadow-xs',
    },
    {
      id: 'design_running',
      title: 'ডিজাইন চলতেছে',
      subtitle: 'In Progress',
      count: metrics.designRunning,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs',
    },
    {
      id: 'waiting_approval',
      title: 'অনুমোদনের অপেক্ষা',
      subtitle: 'Waiting Approval',
      count: metrics.waitingApproval,
      icon: AlertCircle,
      color: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
      activeBorder: 'border-purple-500 ring-2 ring-purple-500/20 shadow-xs',
    },
    {
      id: 'in_production',
      title: 'প্রেসে চালু',
      subtitle: 'Production Floor',
      count: metrics.inProduction,
      icon: Printer,
      color: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs',
    },
    {
      id: 'urgent_today',
      title: 'আজকের ডেলিভারি',
      subtitle: 'Due Today',
      count: metrics.dueToday,
      icon: CheckCircle2,
      color: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20 shadow-xs',
    },
    {
      id: 'walk_in',
      title: 'দোকানে বসা কাস্টমার',
      subtitle: 'Walk-in Waiting',
      count: metrics.walkIn,
      icon: UserCheck,
      color: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400',
      activeBorder: 'border-orange-500 ring-2 ring-orange-500/20 shadow-xs',
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
            className={`p-3 rounded-2xl border text-left transition-all duration-200 hover:shadow-xs relative overflow-hidden backdrop-blur-md cursor-pointer ${
              isActive
                ? `bg-white dark:bg-slate-900 ${c.activeBorder}`
                : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate uppercase tracking-wider">
                {c.subtitle}
              </span>
              <div className={`h-6 w-6 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                <Icon className="h-3.5 w-3.5 shrink-0" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono leading-none">
                {c.count}
              </div>
              <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate mt-1">
                {c.title}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
})
