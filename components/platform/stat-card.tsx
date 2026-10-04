'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { KpiCard, type KpiDelta } from '@/components/ui/kpi-card'

export interface StatCardProps {
  title: string
  value: React.ReactNode
  subtitle?: React.ReactNode
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
  iconColor?: string
  trend?: {
    value: string | number
    isPositive?: boolean
    label?: string
  }
  className?: string
  onClick?: () => void
}

/**
 * @deprecated Use `KpiCard` from `@/components/ui/kpi-card` directly.
 */
export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  onClick,
}: StatCardProps) {
  const delta: KpiDelta | undefined = trend
    ? {
        value: trend.value,
        direction: trend.isPositive ? 'up' : 'down',
        isGood: trend.isPositive,
        label: trend.label,
      }
    : undefined

  return (
    <KpiCard
      label={title}
      value={value}
      subtitle={subtitle}
      icon={icon}
      delta={delta}
      className={className}
      onClick={onClick}
    />
  )
}
