'use client'

import React from 'react'
import {
  FileText,
  Edit3,
  Clock,
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
    subtitleEn?: string
    subtitleBn?: string
  }[] = [
    {
      id: 'all',
      titleEn: 'Active Design Jobs',
      titleBn: 'মোট সক্রিয় ডিজাইন',
      count: metrics.total,
      icon: FileText,
      colorVariant: 'blue',
      subtitleEn: 'Studio artwork queue',
      subtitleBn: 'স্টুডিও কিউ ও কাজ',
    },
    {
      id: 'design_running',
      titleEn: 'In Progress',
      titleBn: 'ডিজাইন চলমান',
      count: metrics.designRunning + metrics.newTasks,
      icon: Edit3,
      colorVariant: 'emerald',
      subtitleEn: 'Active creative drafting',
      subtitleBn: 'চলমান ড্রাফট ও নতুন কাজ',
    },
    {
      id: 'waiting_approval',
      titleEn: 'Waiting Approval',
      titleBn: 'অনুমোদনের অপেক্ষায়',
      count: metrics.waitingApproval,
      icon: Clock,
      colorVariant: 'purple',
      subtitleEn: 'Proofs sent to clients',
      subtitleBn: 'গ্রাহকের নিকট প্রেরিত প্রুফ',
    },
    {
      id: 'revision',
      titleEn: 'Needs Attention',
      titleBn: 'সংশোধন ও জরুরি',
      count: (metrics.revision || 0) + (metrics.dueToday || 0),
      icon: AlertCircle,
      colorVariant: 'danger',
      subtitleEn: 'Revisions & rush deadlines',
      subtitleBn: 'সংশোধন ও জরুরি ডেলিভারি',
    },
  ]

  return (
    <KpiGrid columns={4}>
      {cards.map((card) => (
        <KpiCard
          key={card.id}
          titleEn={card.titleEn}
          titleBn={card.titleBn}
          value={card.count}
          icon={card.icon}
          colorVariant={card.colorVariant}
          subtitleEn={card.subtitleEn}
          subtitleBn={card.subtitleBn}
          selected={activeFilter === card.id}
          onClick={() => onSelectFilter?.(card.id)}
        />
      ))}
    </KpiGrid>
  )
})
