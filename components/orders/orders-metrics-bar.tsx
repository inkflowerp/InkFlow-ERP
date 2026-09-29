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
  const cards: {
    id: OrderStage
    titleEn: string
    titleBn: string
    count: number
    icon: React.ComponentType<{ className?: string }>
    colorVariant: KpiColorVariant
  }[] = [
    {
      id: 'all',
      titleEn: 'Total Orders',
      titleBn: 'মোট অর্ডার',
      count: metrics.total,
      icon: Layers,
      colorVariant: 'slate',
    },
    {
      id: 'new_orders',
      titleEn: 'New Orders',
      titleBn: 'নতুন অর্ডার',
      count: metrics.newOrders,
      icon: Sparkles,
      colorVariant: 'amber',
    },
    {
      id: 'in_design',
      titleEn: 'In Design',
      titleBn: 'ডিজাইন ও চেক',
      count: metrics.inDesign,
      icon: Edit3,
      colorVariant: 'blue',
    },
    {
      id: 'in_production',
      titleEn: 'In Production',
      titleBn: 'প্রেসে প্রোডাকশন',
      count: metrics.inProduction,
      icon: Printer,
      colorVariant: 'indigo',
    },
    {
      id: 'ready_delivery',
      titleEn: 'Ready Delivery',
      titleBn: 'ডেলিভারি রেডি',
      count: metrics.readyDelivery,
      icon: Truck,
      colorVariant: 'purple',
    },
    {
      id: 'delivered',
      titleEn: 'Delivered',
      titleBn: 'ডেলিভারি সম্পন্ন',
      count: metrics.delivered,
      icon: CheckCircle2,
      colorVariant: 'emerald',
    },
  ]

  return (
    <KpiGrid columns={6}>
      {cards.map((c) => {
        const isActive = activeStage === c.id && activeQuickFilter === 'all'

        return (
          <KpiCard
            key={c.id}
            titleEn={c.titleEn}
            titleBn={c.titleBn}
            value={c.count}
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
