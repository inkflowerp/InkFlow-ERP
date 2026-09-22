'use client'

import React from 'react'
import {
  Truck,
  Clock,
  Package,
  Wrench,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  DollarSign,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { LogisticsKpiMetrics } from '@/services/logistics.service'
import { cn } from '@/lib/utils'
import { formatBDT } from '@/lib/formatters'

export interface DeliveryKpiBarProps {
  metrics: LogisticsKpiMetrics
  selectedFilter: string
  onSelectFilter: (filter: string) => void
}

export function DeliveryKpiBar({
  metrics,
  selectedFilter,
  onSelectFilter,
}: DeliveryKpiBarProps) {
  const { tBilingual } = useI18n()

  const cards = [
    {
      id: 'scheduled_today',
      labelEn: 'Scheduled Today',
      labelBn: 'আজকের ডেলিভারি',
      value: `${metrics.dispatchesToday}`,
      unitEn: 'Dispatches',
      unitBn: 'টি চালান',
      subtextEn: 'Loading at dock today',
      subtextBn: 'আজ লোডিং ও রিলিজ',
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      borderColor: 'border-blue-200 dark:border-blue-800/60',
      activeRing: 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/30',
      filterTarget: 'scheduled_today',
    },
    {
      id: 'out_for_delivery',
      labelEn: 'Out for Delivery',
      labelBn: 'গাড়িতে চলমান',
      value: `${metrics.outForDelivery}`,
      unitEn: 'In Transit',
      unitBn: 'ট্রানজিটে',
      subtextEn: 'Vans / Couriers on way',
      subtextBn: 'ভ্যান / কুরিয়ার পথে আছে',
      icon: Truck,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: 'border-amber-200 dark:border-amber-800/60',
      activeRing: 'ring-2 ring-amber-500 bg-amber-50/50 dark:bg-amber-950/30',
      filterTarget: 'out_for_delivery',
      badge: metrics.outForDelivery > 0 ? 'LIVE' : undefined,
      badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-700 animate-pulse',
    },
    {
      id: 'partially_delivered',
      labelEn: 'Partially Delivered',
      labelBn: 'আংশিক ডেলিভারি',
      value: `${metrics.partiallyDelivered}`,
      unitEn: 'Challans',
      unitBn: 'টি চালান',
      subtextEn: 'Balance items pending',
      subtextBn: 'বাকি আইটেম অপেক্ষমাণ',
      icon: Package,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/40',
      borderColor: 'border-orange-200 dark:border-orange-800/60',
      activeRing: 'ring-2 ring-orange-500 bg-orange-50/50 dark:bg-orange-950/30',
      filterTarget: 'partially_delivered',
    },
    {
      id: 'installations',
      labelEn: 'On-Site Fitting',
      labelBn: 'সাইনেজ ফিটিং',
      value: `${metrics.installationsActive}`,
      unitEn: 'Sites',
      unitBn: 'টি সাইট',
      subtextEn: 'Signage rigging crews',
      subtextBn: 'LED ও রিগিং ক্রু ফিল্ডে',
      icon: Wrench,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40',
      borderColor: 'border-purple-200 dark:border-purple-800/60',
      activeRing: 'ring-2 ring-purple-500 bg-purple-50/50 dark:bg-purple-950/30',
      filterTarget: 'installations',
    },
    {
      id: 'pending_due',
      labelEn: 'Due on Delivery',
      labelBn: 'ডেলিভারিতে বকেয়া',
      value: formatBDT(metrics.totalPendingDue),
      subtextEn: 'COD collection pending',
      subtextBn: 'ক্যাশ অন ডেলিভারি আদায়',
      icon: DollarSign,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      borderColor: 'border-rose-200 dark:border-rose-800/60',
      activeRing: 'ring-2 ring-rose-500 bg-rose-50/50 dark:bg-rose-950/30',
      filterTarget: 'has_due',
      badge: metrics.totalPendingDue > 0 ? 'COD' : undefined,
      badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-300 dark:border-rose-700 font-bold',
    },
    {
      id: 'delivered',
      labelEn: 'Delivered & Signed',
      labelBn: 'সম্পূর্ণ ডেলিভারি',
      value: `${metrics.fullyDelivered}`,
      unitEn: 'Completed',
      unitBn: 'সম্পন্ন',
      subtextEn: 'Receiver signed off',
      subtextBn: 'গ্রহীতার স্বাক্ষর গৃহীত',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200 dark:border-emerald-800/60',
      activeRing: 'ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30',
      filterTarget: 'delivered',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const Icon = c.icon
        const isSelected = selectedFilter === c.filterTarget

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectFilter(isSelected ? 'all' : c.filterTarget)}
            className={cn(
              'text-left transition-all duration-200 rounded-2xl p-3.5 border focus:outline-hidden cursor-pointer group shadow-2xs hover:shadow-xs flex flex-col justify-between min-h-[115px] select-none',
              c.borderColor,
              isSelected
                ? c.activeRing
                : 'bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500'
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider line-clamp-1 bangla-text">
                {tBilingual(c.labelEn, c.labelBn)}
              </span>
              <div className="flex items-center gap-1.5">
                {c.badge && (
                  <Badge variant="outline" className={cn('text-[9px] py-0 px-1 font-bold font-mono', c.badgeColor)}>
                    {c.badge}
                  </Badge>
                )}
                <div className={cn('h-7 w-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs', c.bgColor, c.color)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            <div className="my-1">
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight font-mono truncate">
                {c.value}
                {c.unitEn && (
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1">
                    {tBilingual(c.unitEn, c.unitBn)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between w-full text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              <span className="truncate bangla-text">{tBilingual(c.subtextEn, c.subtextBn)}</span>
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-1 text-blue-500" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
