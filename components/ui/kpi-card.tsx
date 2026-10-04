'use client'

import React, { useId } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  AlertCircle,
  LucideIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type KpiTrendDirection = 'up' | 'down' | 'neutral'

export interface KpiDelta {
  value: string | number
  direction?: KpiTrendDirection
  isGood?: boolean // true = up is good (revenue), false = down is good (churn/cost)
  label?: string
}

export interface KpiCardProps {
  label: React.ReactNode
  value: React.ReactNode
  unit?: string
  delta?: KpiDelta
  icon?: LucideIcon | React.ComponentType<{ className?: string }>
  sparklineData?: number[]
  sparklineColor?: string
  loading?: boolean
  error?: string | null
  href?: string
  onClick?: () => void
  formula?: string
  subtitle?: React.ReactNode
  className?: string
  badge?: React.ReactNode
}

export function KpiCard({
  label,
  value,
  unit,
  delta,
  icon: Icon,
  sparklineData,
  sparklineColor,
  loading = false,
  error = null,
  href,
  onClick,
  formula,
  subtitle,
  className,
  badge,
}: KpiCardProps) {
  const tooltipId = useId()

  if (loading) {
    return (
      <Card className={cn('p-4 sm:p-5 rounded-xl border border-border bg-card shadow-xs min-h-28 flex flex-col justify-between', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="space-y-1 mt-3">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('p-4 sm:p-5 rounded-xl border border-destructive/20 bg-destructive/5 shadow-xs min-h-28 flex items-center gap-3', className)}>
        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-destructive uppercase tracking-wider">Error loading metric</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{error}</p>
        </div>
      </Card>
    )
  }

  // Derive Delta icon and color
  let deltaNode: React.ReactNode = null
  if (delta) {
    const isUp = delta.direction === 'up'
    const isDown = delta.direction === 'down'
    const isPositive = delta.isGood !== undefined ? delta.isGood : isUp
    const DeltaIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus

    const colorClass =
      delta.direction === 'neutral'
        ? 'text-muted-foreground'
        : isPositive
        ? 'text-success'
        : 'text-destructive'

    deltaNode = (
      <div className={cn('flex items-center gap-1 text-xs font-semibold tabular-nums', colorClass)}>
        <DeltaIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          {isUp ? '+' : ''}
          {delta.value}
        </span>
        {delta.label && <span className="text-muted-foreground font-normal ml-0.5">{delta.label}</span>}
      </div>
    )
  }

  const content = (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 sm:p-5 rounded-xl border border-border bg-card text-card-foreground shadow-xs min-h-28 flex flex-col justify-between transition-all duration-200 group relative',
        (href || onClick) && 'cursor-pointer hover:border-primary/40 hover:shadow-sm hover:bg-muted/30',
        className
      )}
    >
      {/* Top Header: Label & Formula / Icon */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            {label}
          </span>
          {formula && (
            <div className="relative group/tooltip">
              <button
                type="button"
                className="text-muted-foreground/60 hover:text-muted-foreground focus:outline-none p-0.5"
                aria-describedby={tooltipId}
                aria-label={`Formula for ${label}`}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              <div
                id={tooltipId}
                role="tooltip"
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/tooltip:block z-50 px-2.5 py-1 text-xs font-medium text-primary-foreground bg-foreground rounded shadow-md whitespace-nowrap pointer-events-none"
              >
                {formula}
              </div>
            </div>
          )}
        </div>

        {badge && <div className="shrink-0">{badge}</div>}

        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
      </div>

      {/* Numerical Value with Tabular Nums & Currency/Unit */}
      <div className="mt-2.5 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
            {unit}
          </span>
        )}
      </div>

      {/* Bottom Row: Delta / Sparkline / Subtitle */}
      {(deltaNode || subtitle || sparklineData) && (
        <div className="mt-2 flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
          <div className="flex items-center gap-2 truncate">
            {deltaNode}
            {subtitle && <span className="text-muted-foreground truncate">{subtitle}</span>}
          </div>

          {/* Simple Sparkline SVG if data provided */}
          {sparklineData && sparklineData.length > 1 && (
            <div className="w-16 h-5 shrink-0">
              <Sparkline data={sparklineData} color={sparklineColor} />
            </div>
          )}
        </div>
      )}
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
        {content}
      </Link>
    )
  }

  return content
}

function Sparkline({ data, color = 'currentColor' }: { data: number[]; color?: string }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const width = 64
  const height = 20

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((val - min) / range) * (height - 4) - 2
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible text-primary">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

export interface KpiGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4
  children: React.ReactNode
}

const columnClasses: Record<1 | 2 | 3 | 4, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

export function KpiGrid({ columns = 4, className, children, ...props }: KpiGridProps) {
  return (
    <div className={cn('grid gap-4 sm:gap-5 w-full', columnClasses[columns], className)} {...props}>
      {children}
    </div>
  )
}
