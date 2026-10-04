'use client'

import React from 'react'
import {
  Printer,
  Layers,
  Scissors,
  ShieldAlert,
} from 'lucide-react'
import { KpiCard, KpiGrid, type KpiColorVariant } from '@/components/shared/kpi-card'
import type { ProductionKpiMetrics } from '@/types/production.types'

export interface ProductionKpiBarProps {
  metrics: ProductionKpiMetrics & { finishingCount?: number }
  selectedFilter: string
  onSelectFilter: (filterId: string) => void
}

export const ProductionKpiBar = React.memo(function ProductionKpiBar({
  metrics,
  selectedFilter,
  onSelectFilter,
}: ProductionKpiBarProps) {
  const cards: {
    id: string
    titleEn: string
    titleBn: string
    count: number
    icon: React.ComponentType<{ className?: string }>
    colorVariant: KpiColorVariant
    subtitleEn?: string
    subtitleBn?: string
  }[] = [
    {
      id: 'all',
      titleEn: 'Active Production',
      titleBn: 'চলমান উৎপাদন',
      count: metrics.totalTasks,
      icon: Layers,
      colorVariant: 'blue',
      subtitleEn: 'Total floor queue & jobs',
      subtitleBn: 'মোট ফ্লোর কিউ ও কাজ',
    },
    {
      id: 'running',
      titleEn: 'Running on Press',
      titleBn: 'মেশিনে রানিং',
      count: metrics.runningNow,
      icon: Printer,
      colorVariant: 'emerald',
      subtitleEn: `${metrics.activeMachines || 0} machines active`,
      subtitleBn: 'সক্রিয় মেশিন',
    },
    {
      id: 'finishing',
      titleEn: 'Finishing & QC',
      titleBn: 'ফিনিশিং ও কিউসি',
      count: metrics.finishingCount ?? 0,
      icon: Scissors,
      colorVariant: 'purple',
      subtitleEn: 'Post-press & QC inspection',
      subtitleBn: 'কাটিং, লেমিনেশন ও কিউসি',
    },
    {
      id: 'urgent',
      titleEn: 'Needs Attention',
      titleBn: 'মনোযোগ প্রয়োজন',
      count: (metrics.urgentCount || 0) + (metrics.onHold || 0),
      icon: ShieldAlert,
      colorVariant: 'danger',
      subtitleEn: 'Rush jobs & on-hold tasks',
      subtitleBn: 'জরুরি ডেলিভারি ও সমস্যাগ্রস্ত',
    },
  ]

  return (
    <KpiGrid columns={4}>
      {cards.map((card) => {
        const isActive = selectedFilter === card.id

        return (
          <KpiCard
            key={card.id}
            titleEn={card.titleEn}
            titleBn={card.titleBn}
            value={card.count}
            icon={card.icon}
            colorVariant={card.colorVariant}
            selected={isActive}
            subtitleEn={card.subtitleEn}
            subtitleBn={card.subtitleBn}
            onClick={() => onSelectFilter(isActive && card.id !== 'all' ? 'all' : card.id)}
          />
        )
      })}
    </KpiGrid>
  )
})
