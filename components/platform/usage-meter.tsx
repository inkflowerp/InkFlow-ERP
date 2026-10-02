'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface UsageMeterProps {
  label: string
  current: number
  max: number
  unit?: string
  warningThreshold?: number // Default: 80
  dangerThreshold?: number // Default: 95
  showPercentage?: boolean
  description?: string
  className?: string
}

export function UsageMeter({
  label,
  current,
  max,
  unit = '',
  warningThreshold = 80,
  dangerThreshold = 95,
  showPercentage = true,
  description,
  className,
}: UsageMeterProps) {
  const percentage = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
  const isDanger = percentage >= dangerThreshold
  const isWarning = !isDanger && percentage >= warningThreshold

  const barColor = isDanger
    ? 'bg-destructive'
    : isWarning
    ? 'bg-warning'
    : 'bg-primary'

  const textColor = isDanger
    ? 'text-destructive'
    : isWarning
    ? 'text-warning-foreground'
    : 'text-foreground'

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground truncate">{label}</span>
        <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
          <span className="font-semibold text-foreground">
            {current.toLocaleString()}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">
            {max.toLocaleString()}{unit ? ` ${unit}` : ''}
          </span>
          {showPercentage && (
            <span className={cn('text-2xs font-semibold px-1 py-0.5 rounded ml-1 bg-muted', textColor)}>
              {percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Progress Track */}
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-300 rounded-full', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {description && (
        <div className="text-2xs text-muted-foreground">{description}</div>
      )}
    </div>
  )
}
