'use client'

import React from 'react'
import {
 FileText,
 Edit3,
 Clock,
 RotateCcw,
 CheckCircle2,
 AlertCircle,
} from 'lucide-react'
import { KpiCard, KpiGrid, type KpiColorVariant } from '@/components/shared/kpi-card'

export interface DesignMetrics {
 total: number
 newTasks: number
 designRunning: number
 waitingApproval: number
 revision?: number
 inProduction: number
 dueToday?: number
 walkIn?: number
}

interface DesignMetricsBarProps {
 metrics: DesignMetrics
 activeFilter?: string
 onSelectFilter?: (filter: string) => void
}

export const DesignMetricsBar = React.memo(function DesignMetricsBar({
 metrics,
 activeFilter = 'all',
 onSelectFilter,
}: DesignMetricsBarProps) {
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
 count: metrics.total,
 icon: FileText,
 colorVariant: 'slate',
    },
    {
 id: 'new_tasks',
 titleEn: 'New Tasks',
 titleBn: 'নতুন কাজ',
 count: metrics.newTasks,
 icon: Edit3,
 colorVariant: 'blue',
    },
    {
 id: 'design_running',
 titleEn: 'Designing',
 titleBn: 'ডিজাইন চলমান',
 count: metrics.designRunning,
 icon: Clock,
 colorVariant: 'indigo',
    },
    {
 id: 'waiting_approval',
 titleEn: 'Waiting Approval',
 titleBn: 'অনুমোদনের অপেক্ষায়',
 count: metrics.waitingApproval,
 icon: AlertCircle,
 colorVariant: 'amber',
    },
    {
 id: 'revision',
 titleEn: 'Revision',
 titleBn: 'সংশোধন প্রয়োজন',
 count: metrics.revision ?? 0,
 icon: RotateCcw,
 colorVariant: 'purple',
    },
    {
 id: 'completed',
 titleEn: 'Completed',
 titleBn: 'সম্পন্ন',
 count: metrics.inProduction,
 icon: CheckCircle2,
 colorVariant: 'emerald',
    },
  ]

 return (
    <KpiGrid columns={6}>
      {cards.map((card) => (
        <KpiCard
 key={card.id}
 titleEn={card.titleEn}
 titleBn={card.titleBn}
 value={card.count}
 icon={card.icon}
 colorVariant={card.colorVariant}
 selected={activeFilter === card.id}
 onClick={() => onSelectFilter?.(card.id)}
        />
      ))}
    </KpiGrid>
  )
})
