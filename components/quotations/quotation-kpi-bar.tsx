'use client'

import React from 'react'
import {
  TrendingUp,
  FileCheck2,
  Clock,
  AlertTriangle,
  Award,
} from 'lucide-react'
import { KpiCard, KpiGrid, type KpiColorVariant } from '@/components/shared/kpi-card'

export interface QuotationKpiMetrics {
  openPipeline: number
  activeCount: number
  followUpToday: number
  expiringSoon: number
  negotiatingCount?: number
  wonCount: number
  wonValue: number
  totalQuotes: number
}

export interface QuotationKpiBarProps {
  metrics: QuotationKpiMetrics
  selectedFilter: string
  onSelectFilter: (filter: string) => void
}

export function QuotationKpiBar({
  metrics,
  selectedFilter,
  onSelectFilter,
}: QuotationKpiBarProps) {
  const negotiatingVal = metrics.negotiatingCount ?? 0

  const cards: {
    id: string
    titleEn: string
    titleBn: string
    value: number | string
    isCurrency?: boolean
    unitEn?: string
    unitBn?: string
    icon: React.ComponentType<{ className?: string }>
    colorVariant: KpiColorVariant
    badge?: string
    badgeColor?: KpiColorVariant
    subtitleEn?: string
    subtitleBn?: string
  }[] = [
    {
      id: 'active',
      titleEn: 'Open Pipeline',
      titleBn: 'চলতি পাইপলাইন',
      value: metrics.openPipeline,
      isCurrency: true,
      icon: TrendingUp,
      colorVariant: 'blue',
      subtitleEn: `${metrics.activeCount} active proposals`,
      subtitleBn: `${metrics.activeCount}টি চলমান কোটেশন`,
    },
    {
      id: 'follow_up_today',
      titleEn: 'Follow-Up Today',
      titleBn: 'আজকের ফলো-আপ',
      value: metrics.followUpToday,
      icon: Clock,
      colorVariant: 'amber',
      badge: metrics.followUpToday > 0 ? `${metrics.followUpToday} Due` : undefined,
      badgeColor: 'amber',
      subtitleEn: 'Scheduled today',
      subtitleBn: 'আজকে যোগাযোগ করতে হবে',
    },
    {
      id: 'expiring_soon',
      titleEn: 'Expiring Soon',
      titleBn: 'মেয়াদ শেষের পথে',
      value: metrics.expiringSoon,
      icon: AlertTriangle,
      colorVariant: 'rose',
      badge: metrics.expiringSoon > 0 ? 'Urgent' : undefined,
      badgeColor: 'rose',
      subtitleEn: 'Expiring in ≤ 3 days',
      subtitleBn: '৩ দিনের মধ্যে মেয়াদ শেষ',
    },
    {
      id: 'negotiation',
      titleEn: 'Negotiating',
      titleBn: 'দরকষাকষি চলছে',
      value: negotiatingVal,
      unitEn: 'Quotes',
      unitBn: 'টি কোটেশন',
      icon: FileCheck2,
      colorVariant: 'cyan',
      subtitleEn: 'Awaiting client decision',
      subtitleBn: 'মূল্য নির্ধারণ প্রক্রিয়াধীন',
    },
    {
      id: 'converted',
      titleEn: 'Won & Converted',
      titleBn: 'অনুমোদিত ও অর্ডার',
      value: metrics.wonValue,
      isCurrency: true,
      icon: Award,
      colorVariant: 'emerald',
      subtitleEn: `${metrics.wonCount} converted orders`,
      subtitleBn: `${metrics.wonCount}টি সফল অর্ডার`,
    },
  ]

  return (
    <KpiGrid columns={5}>
      {cards.map((c) => {
        const isSelected = selectedFilter === c.id
        return (
          <KpiCard
            key={c.id}
            titleEn={c.titleEn}
            titleBn={c.titleBn}
            value={c.value}
            isCurrency={c.isCurrency}
            unitEn={c.unitEn}
            unitBn={c.unitBn}
            icon={c.icon}
            colorVariant={c.colorVariant}
            badge={c.badge}
            badgeColor={c.badgeColor}
            subtitleEn={c.subtitleEn}
            subtitleBn={c.subtitleBn}
            selected={isSelected}
            onClick={() => onSelectFilter(isSelected ? 'all' : c.id)}
          />
        )
      })}
    </KpiGrid>
  )
}
