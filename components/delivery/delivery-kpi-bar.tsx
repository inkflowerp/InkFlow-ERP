'use client'

import React from 'react'
import {
  Truck,
  Clock,
  CheckCircle2,
  DollarSign,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import type { LogisticsKpiMetrics } from '@/types/logistics.types'
import { KpiCard, KpiGrid, KpiColorVariant } from '@/components/shared/kpi-card'

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

  const activeTransitAndRigging = (metrics.outForDelivery || 0) + (metrics.installationsActive || 0)

  const cards: Array<{
    id: string
    labelEn: string
    labelBn: string
    value: number | string
    isCurrency?: boolean
    unitEn?: string
    unitBn?: string
    subtextEn: string
    subtextBn: string
    icon: any
    colorVariant: KpiColorVariant
    filterTarget: string
    badge?: string
    badgeColor?: string
  }> = [
    {
      id: 'scheduled_today',
      labelEn: 'Scheduled Today',
      labelBn: 'আজকের ডেলিভারি',
      value: metrics.dispatchesToday,
      unitEn: 'Dispatches',
      unitBn: 'টি চালান',
      subtextEn: 'Loading at dock today',
      subtextBn: 'আজ লোডিং ও রিলিজ',
      icon: Clock,
      colorVariant: 'blue',
      filterTarget: 'scheduled_today',
    },
    {
      id: 'out_for_delivery',
      labelEn: 'In Transit & Rigging',
      labelBn: 'চলমান ট্রানজিট ও ফিটিং',
      value: activeTransitAndRigging,
      unitEn: 'Active',
      unitBn: 'টি সচল',
      subtextEn: `${metrics.outForDelivery || 0} Vans • ${metrics.installationsActive || 0} Crews`,
      subtextBn: `${metrics.outForDelivery || 0}টি ভ্যান • ${metrics.installationsActive || 0}টি ক্রু`,
      icon: Truck,
      colorVariant: 'amber',
      filterTarget: 'out_for_delivery',
      badge: activeTransitAndRigging > 0 ? 'LIVE' : undefined,
      badgeColor: 'bg-warning/10 text-warning border border-warning-border animate-pulse',
    },
    {
      id: 'pending_due',
      labelEn: 'Pending COD Collection',
      labelBn: 'বকেয়া ক্যাশ অন ডেলিভারি',
      value: metrics.totalPendingDue,
      isCurrency: true,
      subtextEn: 'Collect before unloading',
      subtextBn: 'মাল খালাসের পূর্বে আদায়',
      icon: DollarSign,
      colorVariant: 'danger',
      filterTarget: 'has_due',
      badge: metrics.totalPendingDue > 0 ? 'COD' : undefined,
      badgeColor: 'bg-destructive/10 text-destructive border border-danger-border font-bold',
    },
    {
      id: 'delivered',
      labelEn: 'Delivered & Signed',
      labelBn: 'সম্পূর্ণ ডেলিভারি ও রিসিভড',
      value: metrics.fullyDelivered,
      unitEn: 'Completed',
      unitBn: 'সম্পন্ন',
      subtextEn: 'Receiver signed POD',
      subtextBn: 'গ্রহীতার স্বাক্ষর গৃহীত',
      icon: CheckCircle2,
      colorVariant: 'emerald',
      filterTarget: 'delivered',
    },
  ]

  return (
    <KpiGrid columns={4}>
      {cards.map((c) => {
        const isSelected = selectedFilter === c.filterTarget

        return (
          <KpiCard
            key={c.id}
            titleEn={c.labelEn}
            titleBn={c.labelBn}
            value={c.value}
            isCurrency={c.isCurrency}
            unitEn={c.unitEn}
            unitBn={c.unitBn}
            subtitleEn={c.subtextEn}
            subtitleBn={c.subtextBn}
            icon={c.icon}
            colorVariant={c.colorVariant}
            badge={c.badge}
            badgeColor={c.badgeColor}
            selected={isSelected}
            onClick={() => onSelectFilter(isSelected ? 'all' : c.filterTarget)}
          />
        )
      })}
    </KpiGrid>
  )
}
