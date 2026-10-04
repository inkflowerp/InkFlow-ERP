'use client'

import React, { useId } from 'react'
import { MoreVertical, LucideIcon, Info } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { formatLakhCrore } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export type KpiColorVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'cyan'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'sky'
  | 'indigo'
  | 'teal'
  | 'violet'
  | 'slate'

export interface KpiTrend {
  value: string | number
  labelEn?: string
  labelBn?: string
  comparison?: string
  direction?: 'up' | 'down' | 'neutral'
  isGood?: boolean
  color?: 'emerald' | 'rose' | 'slate' | 'amber' | 'blue'
}

export interface KpiCardProps {
  titleEn?: string
  titleBn?: string
  title?: string
  value?: number | string | null
  unitEn?: string
  unitBn?: string
  unit?: string
  isCurrency?: boolean
  icon?: React.ComponentType<{ className?: string }> | LucideIcon | React.ElementType
  colorVariant?: KpiColorVariant
  trend?: KpiTrend
  subtitleEn?: string
  subtitleBn?: string
  subtitle?: string
  badge?: string
  badgeColor?: string
  sparklineData?: number[]
  sparklineColor?: string
  showSparkline?: boolean
  showMenu?: boolean
  onMenuClick?: (e: React.MouseEvent) => void
  onClick?: () => void
  selected?: boolean
  isActive?: boolean
  isLoading?: boolean
  isLive?: boolean
  pulse?: boolean
  className?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  formula?: string
  dateRange?: string
  branchScope?: string
  timezone?: string
}

const variantStyles: Record<
  KpiColorVariant,
  {
    icon: string
    text: string
    dot: string
    ping: string
  }
> = {
  emerald: { icon: 'text-success', text: 'text-success', dot: 'bg-success', ping: 'bg-success/50' },
  success: { icon: 'text-success', text: 'text-success', dot: 'bg-success', ping: 'bg-success/50' },
  amber: { icon: 'text-warning', text: 'text-warning', dot: 'bg-warning', ping: 'bg-warning/50' },
  warning: { icon: 'text-warning', text: 'text-warning', dot: 'bg-warning', ping: 'bg-warning/50' },
  rose: { icon: 'text-destructive', text: 'text-destructive', dot: 'bg-destructive', ping: 'bg-destructive/50' },
  danger: { icon: 'text-destructive', text: 'text-destructive', dot: 'bg-destructive', ping: 'bg-destructive/50' },
  blue: { icon: 'text-primary', text: 'text-primary', dot: 'bg-primary', ping: 'bg-primary/50' },
  info: { icon: 'text-info', text: 'text-info', dot: 'bg-info', ping: 'bg-info/50' },
  indigo: { icon: 'text-primary', text: 'text-primary', dot: 'bg-primary', ping: 'bg-primary/50' },
  purple: { icon: 'text-primary', text: 'text-primary', dot: 'bg-primary', ping: 'bg-primary/50' },
  violet: { icon: 'text-primary', text: 'text-primary', dot: 'bg-primary', ping: 'bg-primary/50' },
  cyan: { icon: 'text-info', text: 'text-info', dot: 'bg-info', ping: 'bg-info/50' },
  sky: { icon: 'text-info', text: 'text-info', dot: 'bg-info', ping: 'bg-info/50' },
  teal: { icon: 'text-success', text: 'text-success', dot: 'bg-success', ping: 'bg-success/50' },
  slate: { icon: 'text-muted-foreground', text: 'text-foreground', dot: 'bg-muted-foreground', ping: 'bg-muted' },
  primary: { icon: 'text-primary', text: 'text-foreground', dot: 'bg-primary', ping: 'bg-primary/50' },
}

/**
 * Compact SVG Micro-Sparkline for data-driven cards
 */
function KpiSparkline({
  direction = 'up',
  isGood = true,
  data,
  color,
  id,
}: {
  direction?: 'up' | 'down' | 'neutral'
  isGood?: boolean
  data?: number[]
  color?: string
  id: string
}) {
  const width = 48
  const height = 14

  const strokeColor = color || (isGood ? 'hsl(var(--success))' : 'hsl(var(--destructive))')

  let linePath = ''
  let areaPath = ''

  if (data && data.length > 1) {
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const padding = 1.5
    const usableHeight = height - padding * 2

    const points: [number, number][] = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 4) + 2
      const y = height - padding - ((val - min) / range) * usableHeight
      return [x, y]
    })

    linePath = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1]

      const cp1x = p1[0] + (p2[0] - p0[0]) / 6
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6

      linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
    }
    areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`
  } else {
    if (direction === 'down') {
      linePath = 'M 2 4 C 12 4, 20 10, 32 8 C 38 7, 44 11, 46 11'
      areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`
    } else {
      linePath = 'M 2 11 C 12 10, 20 5, 32 7 C 38 8, 44 3, 46 3'
      areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`
    }
  }

  const gradId = `spark-grad-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <div className="w-[48px] h-[14px] shrink-0 overflow-hidden select-none pointer-events-none">
      <svg
        viewBox="0 0 48 14"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

export function KpiCard({
  titleEn,
  titleBn,
  title: directTitle,
  value,
  unitEn,
  unitBn,
  unit: directUnit,
  isCurrency = false,
  icon: Icon,
  colorVariant = 'primary',
  trend,
  subtitleEn,
  subtitleBn,
  subtitle: directSubtitle,
  badge,
  badgeColor,
  sparklineData,
  sparklineColor,
  showSparkline = false,
  showMenu = false,
  onMenuClick,
  onClick,
  selected = false,
  isActive = false,
  isLoading = false,
  isLive = false,
  pulse = false,
  className,
  children,
  footer,
  formula,
  dateRange,
  branchScope,
  timezone = 'Asia/Dhaka',
}: KpiCardProps) {
  const { tBilingual } = useI18n()
  const rawId = useId()
  const isSelected = selected || isActive

  const title = (titleEn && titleBn) ? tBilingual(titleEn, titleBn) : (directTitle || titleEn || titleBn || '')
  const subtitle = (subtitleEn && subtitleBn) ? tBilingual(subtitleEn, subtitleBn) : (directSubtitle || subtitleEn || subtitleBn)
  const unit = (unitEn && unitBn) ? tBilingual(unitEn, unitBn) : (directUnit || unitEn || unitBn)

  const formatVal = (v: number | string | null | undefined) => {
    if (v === null || v === undefined) return '—'
    if (typeof v === 'number') {
      return v.toLocaleString()
    }
    return v
  }

  // Determine trend direction and sentiment
  const titleLower = String(titleEn || directTitle || title || '').toLowerCase()
  const isAlertMetric =
    titleLower.includes('due') ||
    titleLower.includes('outstanding') ||
    titleLower.includes('pending') ||
    titleLower.includes('overdue') ||
    titleLower.includes('বকেয়া')

  const isCostMetric =
    titleLower.includes('cost') ||
    titleLower.includes('expense') ||
    titleLower.includes('খরচ')

  let direction: 'up' | 'down' | 'neutral' = trend?.direction || 'up'
  if (trend && !trend.direction) {
    const strVal = String(trend.value).trim()
    if (strVal.startsWith('-') || strVal.includes('↓')) direction = 'down'
    else direction = 'up'
  }

  let isGood = true
  if (trend?.isGood !== undefined) {
    isGood = trend.isGood
  } else if (trend?.color === 'rose' || colorVariant === 'rose' || colorVariant === 'danger') {
    isGood = false
  } else if (trend?.color === 'emerald' || colorVariant === 'emerald' || colorVariant === 'success') {
    isGood = true
  } else if (isAlertMetric) {
    isGood = direction === 'down'
  } else if (isCostMetric) {
    isGood = direction === 'down'
  } else {
    isGood = direction === 'up'
  }

  const comparisonText =
    trend?.comparison ||
    (trend?.labelEn && trend?.labelBn ? tBilingual(trend.labelEn, trend.labelBn) : trend?.labelEn) ||
    ''

  const cleanTrendValue = trend
    ? String(trend.value).replace(/^[+-\u2191\u2193]/, '').trim()
    : null

  const styleConfig = variantStyles[colorVariant] || variantStyles.primary
  const hasLivePulse = isLive || pulse

  if (isLoading) {
    return (
      <div
        className={cn(
          'py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl bg-card border border-border shadow-xs animate-pulse flex flex-col justify-between min-h-20',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-5.5 w-5.5 bg-muted rounded-md" />
        </div>
        <div className="h-5 w-24 bg-muted rounded mt-1" />
        <div className="h-2.5 w-16 bg-muted rounded mt-1" />
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card text-card-foreground border border-border py-2 px-3 sm:py-2.5 sm:px-3.5 shadow-xs rounded-xl transition-colors duration-150 flex flex-col justify-between relative overflow-hidden',
        onClick ? 'cursor-pointer hover:border-primary/30 active:scale-[0.99]' : '',
        isSelected && 'ring-2 ring-primary/40 border-primary bg-primary/5',
        className
      )}
    >
      {/* 1. TOP ROW: Title on Left, Subtle Icon/Pulse on Right */}
      <div className="flex items-center justify-between gap-1.5 leading-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate leading-tight">
            {title}
          </span>
          {formula && (
            <span
              title={`Formula: ${formula}\nDate Range: ${dateRange || 'Today'}\nScope: ${branchScope || 'Branch / Company'}\nTimezone: ${timezone}`}
              className="inline-flex items-center text-muted-foreground/70 hover:text-foreground cursor-help p-0.5 rounded transition-colors shrink-0"
              aria-label={`Formula: ${formula}`}
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          )}
          {badge && (
            <span
              className={cn(
                'inline-block px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider shrink-0 leading-none',
                badgeColor || 'bg-muted text-muted-foreground'
              )}
            >
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasLivePulse ? (
            <span className="relative flex h-2 w-2">
              <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', styleConfig.ping)} />
              <span className={cn('relative inline-flex rounded-full h-2 w-2', styleConfig.dot)} />
            </span>
          ) : Icon ? (
            <div className="h-6 w-6 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
              <Icon className={cn('h-3.5 w-3.5 shrink-0', styleConfig.icon)} />
            </div>
          ) : null}

          {(showMenu || onMenuClick) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onMenuClick?.(e)
              }}
              aria-label="Options"
              className="p-0.5 -mr-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. MIDDLE ROW: Large Value with Clean Foreground Hierarchy + Tabular Figures */}
      <div className="text-xl sm:text-2xl font-bold font-sans tracking-tight mt-1 leading-tight flex items-baseline gap-1 text-foreground tabular-nums">
        {isCurrency && typeof value === 'number' ? (
          <>
            <span className="font-semibold text-base sm:text-lg text-muted-foreground mr-0.5">৳</span>
            {formatLakhCrore(value)}
          </>
        ) : (
          <span>{formatVal(value)}</span>
        )}

        {unit && (
          <span className="text-xs font-normal text-muted-foreground ml-1 font-sans">
            {unit}
          </span>
        )}
      </div>

      {/* Embedded children if any */}
      {children && <div className="mt-1.5 w-full">{children}</div>}

      {/* 3. BOTTOM ROW: Helper Note / Subtitle / Trend */}
      {(trend || subtitle || comparisonText || (showSparkline && sparklineData)) && (
        <div className="flex items-center justify-between gap-1.5 mt-1 leading-tight">
          {trend ? (
            <div className="flex items-center gap-1 font-semibold text-xs truncate leading-tight">
              <span
                className={cn(
                  isGood ? 'text-success' : 'text-destructive'
                )}
              >
                {direction === 'up' ? '↑' : direction === 'down' ? '↓' : '—'} {cleanTrendValue}
              </span>
              {comparisonText && (
                <span className="font-normal text-muted-foreground text-xs truncate">
                  {comparisonText}
                </span>
              )}
            </div>
          ) : subtitle ? (
            <div className="text-xs text-muted-foreground font-medium truncate leading-tight">
              {subtitle}
            </div>
          ) : comparisonText ? (
            <div className="text-xs text-muted-foreground font-medium truncate leading-tight">
              {comparisonText}
            </div>
          ) : (
            <div />
          )}

          {showSparkline && sparklineData && sparklineData.length > 0 && (
            <KpiSparkline
              direction={direction}
              isGood={isGood}
              data={sparklineData}
              color={sparklineColor}
              id={rawId}
            />
          )}
        </div>
      )}

      {footer && <div className="mt-1.5 pt-1 border-t border-border">{footer}</div>}
    </div>
  )
}

export function KpiGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5 | 6 | 7 | 8
  className?: string
}) {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
    7: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7',
    8: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8',
  }[columns] || 'grid-cols-2 sm:grid-cols-4'

  return (
    <div className={cn('grid gap-2.5 sm:gap-3', colClass, className)}>
      {children}
    </div>
  )
}
