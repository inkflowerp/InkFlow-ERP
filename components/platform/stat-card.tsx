'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  trend,
  className,
  onClick,
}: StatCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl border border-border bg-card text-card-foreground shadow-xs flex items-center justify-between min-h-24',
        onClick && 'cursor-pointer hover:bg-muted/50 transition-colors',
        className
      )}
    >
      <div className="space-y-1 min-w-0 flex-1 pr-3">
        <div className="text-xs font-medium text-muted-foreground truncate uppercase tracking-wider">
          {title}
        </div>
        <div className="text-2xl font-bold text-foreground tabular-nums tracking-tight truncate">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="text-2xs text-muted-foreground flex items-center gap-1.5 truncate">
            {trend && (
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>

      {Icon && (
        <div
          className={cn(
            'h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20',
            iconColor
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      )}
    </Card>
  )
}
