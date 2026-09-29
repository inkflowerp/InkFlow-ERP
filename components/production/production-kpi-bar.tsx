'use client'

import React from 'react'
import {
  Printer,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Layers,
  Scissors,
} from 'lucide-react'
import { KpiCard, KpiGrid, type KpiColorVariant } from '@/components/shared/kpi-card'
import { ProductionKpiMetrics } from '@/services/production.service'

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
  }[] = [
    {
      id: 'all',
      titleEn: 'Total Jobs',
      titleBn: 'মোট কাজ',
      count: metrics.totalTasks,
      icon: Layers,
      colorVariant: 'slate',
    },
    {
      id: 'running',
      titleEn: 'Running Now',
      titleBn: 'মেশিনে রানিং',
      count: metrics.runningNow,
      icon: Printer,
      colorVariant: 'blue',
    },
    {
      id: 'queued',
      titleEn: 'Queued & Ready',
      titleBn: 'মাউন্টিং প্রস্তুত',
      count: metrics.queuedReady,
      icon: Clock,
      colorVariant: 'purple',
    },
    {
      id: 'finishing',
      titleEn: 'Finishing & QC',
      titleBn: 'ফিনিশিং ও কিউসি',
      count: metrics.finishingCount ?? 0,
      icon: Scissors,
      colorVariant: 'indigo',
    },
    {
      id: 'urgent',
      titleEn: 'Rush / Urgent',
      titleBn: 'জরুরি ডেলিভারি',
      count: metrics.urgentCount,
      icon: ShieldAlert,
      colorVariant: 'rose',
    },
    {
      id: 'completed',
      titleEn: 'Completed',
      titleBn: 'আজ সম্পন্ন',
      count: metrics.completedToday,
      icon: CheckCircle2,
      colorVariant: 'emerald',
    },
  ]

  return (
    <KpiGrid columns={6}>
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
            onClick={() => onSelectFilter(isActive && card.id !== 'all' ? 'all' : card.id)}
          />
        )
      })}
    </KpiGrid>
  )
})
