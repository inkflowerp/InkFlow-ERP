'use client'

import React from 'react'
import {
  Layers,
  Sparkles,
  Printer,
  Truck,
  CheckCircle2,
  AlertTriangle,
  BadgePercent,
  Wallet,
} from 'lucide-react'
import type { OrderStage } from './types'

export interface OrderMetrics {
  total: number
  newOrders: number
  inDesign: number
  inProduction: number
  readyDelivery: number
  delivered: number
  dueToday: number
  totalDueAmount: number
}

interface OrdersMetricsBarProps {
  metrics: OrderMetrics
  activeStage: OrderStage
  activeQuickFilter: string
  onSelectStage: (stage: OrderStage) => void
  onSelectQuickFilter: (filter: string) => void
}

export const OrdersMetricsBar = React.memo(function OrdersMetricsBar({
  metrics,
  activeStage,
  activeQuickFilter,
  onSelectStage,
  onSelectQuickFilter,
}: OrdersMetricsBarProps) {
  const cards = [
    {
      id: 'all',
      type: 'stage' as const,
      title: 'মোট অর্ডার',
      subtitle: 'Total Orders',
      count: metrics.total,
      icon: Layers,
      color: 'text-slate-700 dark:text-slate-200',
      bgColor: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      activeBorder: 'border-slate-800 dark:border-slate-200 ring-2 ring-slate-400/30',
    },
    {
      id: 'new_orders',
      type: 'stage' as const,
      title: 'নতুন অর্ডার / ইনটেক',
      subtitle: 'New Intake',
      count: metrics.newOrders,
      icon: Sparkles,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50',
      activeBorder: 'border-amber-500 ring-2 ring-amber-400/30',
    },
    {
      id: 'in_design',
      type: 'stage' as const,
      title: 'ডিজাইন ও চেক',
      subtitle: 'In Design',
      count: metrics.inDesign,
      icon: Sparkles,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50',
      activeBorder: 'border-blue-500 ring-2 ring-blue-400/30',
    },
    {
      id: 'in_production',
      type: 'stage' as const,
      title: 'প্রেসে প্রোডাকশন',
      subtitle: 'Machine Floor',
      count: metrics.inProduction,
      icon: Printer,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50',
      activeBorder: 'border-indigo-500 ring-2 ring-indigo-400/30',
    },
    {
      id: 'ready_delivery',
      type: 'stage' as const,
      title: 'ডেলিভারি রেডি',
      subtitle: 'Ready for Pickup',
      count: metrics.readyDelivery,
      icon: Truck,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50',
      activeBorder: 'border-purple-500 ring-2 ring-purple-400/30',
    },
    {
      id: 'due_today',
      type: 'filter' as const,
      title: 'আজকের ডেলিভারি',
      subtitle: 'Due Today',
      count: metrics.dueToday,
      icon: CheckCircle2,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50',
      activeBorder: 'border-rose-500 ring-2 ring-rose-400/30',
    },
    {
      id: 'unpaid_due',
      type: 'filter' as const,
      title: 'মোট বকেয়া বাকি',
      subtitle: 'Due Receivable',
      count: `৳${metrics.totalDueAmount.toLocaleString()}`,
      isCurrency: true,
      icon: Wallet,
      color: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-400/30',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
      {cards.map((c) => {
        const Icon = c.icon
        const isActive =
          c.type === 'stage'
            ? activeStage === c.id && activeQuickFilter === 'all'
            : activeQuickFilter === c.id

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              if (c.type === 'stage') {
                onSelectStage(c.id as OrderStage)
                onSelectQuickFilter('all')
              } else {
                onSelectQuickFilter(c.id)
              }
            }}
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
              <span className={`font-black tracking-tight text-slate-900 dark:text-white font-mono ${c.isCurrency ? 'text-base' : 'text-xl'}`}>
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
