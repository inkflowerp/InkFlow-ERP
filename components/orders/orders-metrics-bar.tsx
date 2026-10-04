'use client'

import React from 'react'
import {
  Layers,
  Printer,
  Truck,
  AlertTriangle,
} from 'lucide-react'
import { KpiCard, KpiGrid, type KpiColorVariant } from '@/components/shared/kpi-card'
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
  needsAttentionCount?: number
  blockedCount?: number
  inApproval?: number
  overdueCount?: number
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
  const needsAttentionVal =
    metrics.needsAttentionCount !== undefined
      ? metrics.needsAttentionCount
      : (metrics.blockedCount || 0) + (metrics.inApproval || 0)

  const cards: {
    id: OrderStage
    titleEn: string
    titleBn: string
    count: number
    subtitleEn: string
    subtitleBn: string
    icon: React.ComponentType<{ className?: string }>
    colorVariant: KpiColorVariant
  }[] = [
    {
      id: 'all',
      titleEn: 'Active Orders',
      titleBn: 'চলতি মোট অর্ডার',
      count: metrics.total,
      subtitleEn: 'Total jobs in workflow',
      subtitleBn: 'পাইপলাইনে মোট কাজ',
      icon: Layers,
      colorVariant: 'blue',
    },
    {
      id: 'in_production',
      titleEn: 'In Production',
      titleBn: 'প্রেসে প্রোডাকশন',
      count: metrics.inProduction,
      subtitleEn: 'Live printing & press',
      subtitleBn: 'প্রেসে চলমান প্রিন্ট',
      icon: Printer,
      colorVariant: 'indigo',
    },
    {
      id: 'ready_delivery',
      titleEn: 'Ready for Delivery',
      titleBn: 'ডেলিভারি প্রস্তুত',
      count: metrics.readyDelivery,
      subtitleEn: 'QC passed & packaged',
      subtitleBn: 'প্যাকেজিং সম্পন্ন ও রেডি',
      icon: Truck,
      colorVariant: 'emerald',
    },
    {
      id: 'needs_attention',
      titleEn: 'Needs Attention',
      titleBn: 'জরুরি মনোযোগ প্রয়োজন',
      count: needsAttentionVal,
      subtitleEn: 'Blocked, proofs & overdue',
      subtitleBn: 'স্থগিত ও অনুমোদনের কাজ',
      icon: AlertTriangle,
      colorVariant: needsAttentionVal > 0 ? 'rose' : 'slate',
    },
  ]

  return (
    <KpiGrid columns={4}>
      {cards.map((c) => {
        const isActive = activeStage === c.id && activeQuickFilter === 'all'

        return (
          <KpiCard
            key={c.id}
            titleEn={c.titleEn}
            titleBn={c.titleBn}
            value={c.count}
            subtitleEn={c.subtitleEn}
            subtitleBn={c.subtitleBn}
            icon={c.icon}
            colorVariant={c.colorVariant}
            selected={isActive}
            onClick={() => {
              onSelectStage(c.id)
              onSelectQuickFilter('all')
            }}
          />
        )
      })}
    </KpiGrid>
  )
})
