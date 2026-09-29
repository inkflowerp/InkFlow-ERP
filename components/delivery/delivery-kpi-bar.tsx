'use client'

import React from 'react'
import {
  Truck,
  Clock,
  Package,
  Wrench,
  CheckCircle2,
  DollarSign,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { LogisticsKpiMetrics } from '@/services/logistics.service'
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
      labelEn: 'Out for Delivery',
      labelBn: 'গাড়িতে চলমান',
      value: metrics.outForDelivery,
      unitEn: 'In Transit',
      unitBn: 'ট্রানজিটে',
      subtextEn: 'Vans / Couriers on way',
      subtextBn: 'ভ্যান / কুরিয়ার পথে আছে',
      icon: Truck,
      colorVariant: 'amber',
      filterTarget: 'out_for_delivery',
      badge: metrics.outForDelivery > 0 ? 'LIVE' : undefined,
      badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-700 animate-pulse',
    },
    {
      id: 'partially_delivered',
      labelEn: 'Partially Delivered',
      labelBn: 'আংশিক ডেলিভারি',
      value: metrics.partiallyDelivered,
      unitEn: 'Challans',
      unitBn: 'টি চালান',
      subtextEn: 'Balance items pending',
      subtextBn: 'বাকি আইটেম অপেক্ষমাণ',
      icon: Package,
      colorVariant: 'warning',
      filterTarget: 'partially_delivered',
    },
    {
      id: 'installations',
      labelEn: 'On-Site Fitting',
      labelBn: 'সাইনেজ ফিটিং',
      value: metrics.installationsActive,
      unitEn: 'Sites',
      unitBn: 'টি সাইট',
      subtextEn: 'Signage rigging crews',
      subtextBn: 'LED ও রিগিং ক্রু ফিল্ডে',
      icon: Wrench,
      colorVariant: 'purple',
      filterTarget: 'installations',
    },
    {
      id: 'pending_due',
      labelEn: 'Due on Delivery',
      labelBn: 'ডেলিভারিতে বকেয়া',
      value: metrics.totalPendingDue,
      isCurrency: true,
      subtextEn: 'COD collection pending',
      subtextBn: 'ক্যাশ অন ডেলিভারি আদায়',
      icon: DollarSign,
      colorVariant: 'danger',
      filterTarget: 'has_due',
      badge: metrics.totalPendingDue > 0 ? 'COD' : undefined,
      badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-300 dark:border-rose-700 font-bold',
    },
    {
      id: 'delivered',
      labelEn: 'Delivered & Signed',
      labelBn: 'সম্পূর্ণ ডেলিভারি',
      value: metrics.fullyDelivered,
      unitEn: 'Completed',
      unitBn: 'সম্পন্ন',
      subtextEn: 'Receiver signed off',
      subtextBn: 'গ্রহীতার স্বাক্ষর গৃহীত',
      icon: CheckCircle2,
      colorVariant: 'emerald',
      filterTarget: 'delivered',
    },
  ]

  return (
    <KpiGrid columns={6}>
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
