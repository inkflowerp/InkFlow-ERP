'use client'

import React, { useId } from 'react'
import { MoreVertical, LucideIcon } from 'lucide-react'
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
  emerald: {
    icon: 'text-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    ping: 'bg-emerald-400',
  },
  success: {
    icon: 'text-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    ping: 'bg-emerald-400',
  },
  amber: {
    icon: 'text-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    ping: 'bg-amber-400',
  },
  warning: {
    icon: 'text-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    ping: 'bg-amber-400',
  },
  rose: {
    icon: 'text-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500',
    ping: 'bg-rose-400',
  },
  danger: {
    icon: 'text-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500',
    ping: 'bg-rose-400',
  },
  blue: {
    icon: 'text-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
    ping: 'bg-blue-400',
  },
  info: {
    icon: 'text-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
    ping: 'bg-blue-400',
  },
  indigo: {
    icon: 'text-indigo-500',
    text: 'text-indigo-600 dark:text-indigo-400',
    dot: 'bg-indigo-500',
    ping: 'bg-indigo-400',
  },
  purple: {
    icon: 'text-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    dot: 'bg-purple-500',
    ping: 'bg-purple-400',
  },
  violet: {
    icon: 'text-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
    ping: 'bg-violet-400',
  },
  cyan: {
    icon: 'text-cyan-500',
    text: 'text-cyan-600 dark:text-cyan-400',
    dot: 'bg-cyan-500',
    ping: 'bg-cyan-400',
  },
  sky: {
    icon: 'text-sky-500',
    text: 'text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500',
    ping: 'bg-sky-400',
  },
  teal: {
    icon: 'text-teal-500',
    text: 'text-teal-600 dark:text-teal-400',
    dot: 'bg-teal-500',
    ping: 'bg-teal-400',
  },
  slate: {
    icon: 'text-slate-400 dark:text-slate-500',
    text: 'text-slate-800 dark:text-slate-100',
    dot: 'bg-slate-400',
    ping: 'bg-slate-300',
  },
  primary: {
    icon: 'text-blue-500 dark:text-blue-400',
    text: 'text-slate-900 dark:text-slate-50',
    dot: 'bg-blue-500',
    ping: 'bg-blue-400',
  },
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
  const width = 56
  const height = 20

  const strokeColor = color || (isGood ? '#10B981' : '#EF4444')

  let linePath = ''
  let areaPath = ''

  if (data && data.length > 1) {
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const padding = 2
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
      linePath = 'M 2 6 C 14 6, 24 14, 38 12 C 46 10, 52 16, 54 16'
      areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`
    } else {
      linePath = 'M 2 16 C 14 14, 24 8, 38 10 C 46 12, 52 4, 54 4'
      areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`
    }
  }

  const gradId = `spark-grad-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <div className="w-[56px] h-[20px] shrink-0 overflow-hidden select-none pointer-events-none">
      <svg
        viewBox="0 0 56 20"
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
          strokeWidth="1.8"
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
    // Increase in due or pending orders is an alert (red)
    isGood = direction === 'down'
  } else if (isCostMetric) {
    // Decrease in production cost is a positive saving (green)
    isGood = direction === 'down'
  } else {
    // Normal sales, orders, production: up is positive (green)
    isGood = direction === 'up'
  }

  // Trend comparison text
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
          'p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs animate-pulse flex flex-col justify-between',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 rounded mt-1.5" />
        <div className="h-2.5 w-24 bg-slate-200 dark:bg-slate-800 rounded mt-1" />
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs rounded-2xl transition-all duration-150 flex flex-col justify-between relative overflow-hidden',
        onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99]' : '',
        isSelected && 'ring-2 ring-blue-500/40 border-blue-500/50 bg-blue-50/10 dark:bg-blue-950/10',
        className
      )}
    >
      {/* 1. TOP ROW: Title on Left, Icon/Pulse on Right */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {title}
          </span>
          {badge && (
            <span
              className={cn(
                'inline-block px-1.5 py-0.5 rounded text-3xs font-bold uppercase tracking-wider shrink-0',
                badgeColor || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasLivePulse ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', styleConfig.ping)} />
              <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', styleConfig.dot)} />
            </span>
          ) : Icon ? (
            <Icon className={cn('h-4 w-4 shrink-0', styleConfig.icon)} />
          ) : null}

          {(showMenu || onMenuClick) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onMenuClick?.(e)
              }}
              aria-label="Options"
              className="p-0.5 -mr-1 rounded text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. MIDDLE ROW: Large Value with Variant Color + Tabular Figures */}
      <div className={cn('text-2xl font-bold font-mono tracking-tight mt-1.5 leading-none flex items-baseline gap-1', styleConfig.text)}>
        {isCurrency && typeof value === 'number' ? (
          <>
            <span className="font-semibold text-xl">৳</span>
            {formatLakhCrore(value)}
          </>
        ) : (
          <span>{formatVal(value)}</span>
        )}

        {unit && (
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1 font-sans">
            {unit}
          </span>
        )}
      </div>

      {/* Embedded children if any (e.g. progress bars, meters) */}
      {children && <div className="mt-2 w-full">{children}</div>}

      {/* 3. BOTTOM ROW: Helper Note / Subtitle / Trend */}
      {(trend || subtitle || comparisonText || (showSparkline && sparklineData)) && (
        <div className="flex items-center justify-between gap-2 mt-1">
          {trend ? (
            <div className="flex items-center gap-1 font-semibold text-2xs truncate">
              <span
                className={cn(
                  isGood
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {direction === 'up' ? '↑' : direction === 'down' ? '↓' : '—'} {cleanTrendValue}
              </span>
              {comparisonText && (
                <span className="font-normal text-slate-400 dark:text-slate-500 text-2xs truncate">
                  {comparisonText}
                </span>
              )}
            </div>
          ) : subtitle ? (
            <div className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium truncate">
              {subtitle}
            </div>
          ) : comparisonText ? (
            <div className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium truncate">
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

      {footer && <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">{footer}</div>}
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
    <div className={cn('grid gap-3', colClass, className)}>
      {children}
    </div>
  )
}
