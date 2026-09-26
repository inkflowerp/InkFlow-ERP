'use client'

import React from 'react'
import {
  Layers,
  Sparkles,
  Edit3,
  Printer,
  Truck,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'
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
  const { tBilingual } = useI18n()

  const cards = [
    {
      id: 'all' as const,
      label: tBilingual('Total Orders', 'মোট অর্ডার'),
      count: metrics.total,
      icon: Layers,
      iconBg: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      id: 'new_orders' as const,
      label: tBilingual('New Orders', 'নতুন অর্ডার'),
      count: metrics.newOrders,
      icon: Sparkles,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400',
    },
    {
      id: 'in_design' as const,
      label: tBilingual('In Design', 'ডিজাইন ও চেক'),
      count: metrics.inDesign,
      icon: Edit3,
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400',
    },
    {
      id: 'in_production' as const,
      label: tBilingual('In Production', 'প্রেসে প্রোডাকশন'),
      count: metrics.inProduction,
      icon: Printer,
      iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400',
    },
    {
      id: 'ready_delivery' as const,
      label: tBilingual('Ready Delivery', 'ডেলিভারি রেডি'),
      count: metrics.readyDelivery,
      icon: Truck,
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400',
    },
    {
      id: 'delivered' as const,
      label: tBilingual('Delivered', 'ডেলিভারি সম্পন্ন'),
      count: metrics.delivered,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const Icon = c.icon
        const isActive = activeStage === c.id && activeQuickFilter === 'all'

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              onSelectStage(c.id)
              onSelectQuickFilter('all')
            }}
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
                c.iconBg
              )}
            >
              <Icon className="w-5 h-5 stroke-[2.2]" />
            </div>

            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white leading-none">
                {c.count}
              </div>
              <div className="text-2xs sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
                {c.label}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
})
