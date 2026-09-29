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
  className?: string
  children?: React.ReactNode
  footer?: React.ReactNode
}

/**
 * High-fidelity SVG Sparkline matching modern SaaS analytics cards
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
  const width = 84
  const height = 34

  // Determine stroke color (#10B981 for green, #EF4444 for red, or custom)
  const strokeColor =
    color || (isGood ? '#10B981' : '#EF4444')

  let linePath = ''
  let areaPath = ''

  if (data && data.length > 1) {
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const padding = 4
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
      // Dip down toward right (e.g. Production Cost -4.2%)
      linePath = 'M 2 12 C 16 10, 28 6, 42 14 C 56 22, 68 26, 82 24'
      areaPath = 'M 2 12 C 16 10, 28 6, 42 14 C 56 22, 68 26, 82 24 L 84 34 L 0 34 Z'
    } else if (!isGood || strokeColor === '#EF4444') {
      // Alert upward wave (e.g. Pending Orders +3.6%, Outstanding +5.4%)
      linePath = 'M 2 26 C 16 28, 28 18, 42 14 C 56 10, 68 20, 82 8'
      areaPath = 'M 2 26 C 16 28, 28 18, 42 14 C 56 10, 68 20, 82 8 L 84 34 L 0 34 Z'
    } else {
      // Growth upward wave (e.g. Total Orders +12.5%, Sales +12.8%, Profit +20.4%)
      linePath = 'M 2 24 C 16 26, 26 14, 40 18 C 54 22, 64 8, 82 4'
      areaPath = 'M 2 24 C 16 26, 26 14, 40 18 C 54 22, 64 8, 82 4 L 84 34 L 0 34 Z'
    }
  }

  const gradId = `spark-grad-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <div className="w-[84px] h-[34px] shrink-0 overflow-hidden select-none pointer-events-none">
      <svg
        viewBox="0 0 84 34"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.22" />
            <stop offset="75%" stopColor={strokeColor} stopOpacity="0.05" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
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
  showSparkline = true,
  showMenu = true,
  onMenuClick,
  onClick,
  selected = false,
  isActive = false,
  isLoading = false,
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
    'vs last month'

  const cleanTrendValue = trend
    ? String(trend.value).replace(/^[+-\u2191\u2193]/, '').trim()
    : null

  if (isLoading) {
    return (
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'group p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all duration-200 flex flex-col justify-between relative overflow-hidden',
        'shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]',
        onClick ? 'cursor-pointer hover:border-slate-200 dark:hover:border-slate-700 active:scale-[0.99]' : '',
        isSelected && 'ring-2 ring-blue-500/40 border-blue-500/50 bg-blue-50/10 dark:bg-blue-950/10',
        className
      )}
    >
      {/* 1. TOP ROW: Bare outline icon + title on left, three-dots vertical on right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <Icon className="w-[18px] h-[18px] text-slate-400 dark:text-slate-500 shrink-0 stroke-[1.8]" />
          )}
          <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300 truncate tracking-tight">
            {title}
          </span>
          {badge && (
            <span
              className={cn(
                'inline-block px-1.5 py-0.5 rounded text-3xs font-bold uppercase tracking-wider',
                badgeColor || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {badge}
            </span>
          )}
        </div>

        {showMenu && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onMenuClick?.(e)
            }}
            aria-label="Options"
            className="p-1 -mr-1 rounded-md text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. MIDDLE ROW: Big Bold Metric Value */}
      <div className="mt-3.5 mb-2 flex items-baseline gap-1.5">
        {isCurrency && typeof value === 'number' ? (
          <div className="text-2xl sm:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">
            <span className="font-semibold mr-1">৳</span>
            {formatLakhCrore(value)}
          </div>
        ) : (
          <div className="text-2xl sm:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">
            {formatVal(value)}
          </div>
        )}

        {unit && (
          <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 ml-1">
            {unit}
          </span>
        )}
      </div>

      {/* Embedded children if any (e.g. progress bars, meters) */}
      {children && <div className="my-2 w-full">{children}</div>}

      {/* 3. BOTTOM ROW: Trend comparison on Left, Smooth Wave Sparkline on Right */}
      <div className="flex items-end justify-between gap-3 mt-auto pt-1">
        {/* Left: Trend line */}
        <div className="flex items-center flex-wrap gap-1 text-xs">
          {trend ? (
            <div
              className={cn(
                'inline-flex items-center gap-1 font-semibold text-xs sm:text-[13px]',
                isGood
                  ? 'text-[#10B981] dark:text-[#34D399]'
                  : 'text-[#EF4444] dark:text-[#F87171]'
              )}
            >
              <span className="text-sm font-bold leading-none">
                {direction === 'up' ? '↑' : direction === 'down' ? '↓' : '—'}
              </span>
              <span>{cleanTrendValue}</span>
              {comparisonText && (
                <span className="font-normal text-slate-400 dark:text-slate-500 text-xs ml-0.5">
                  {comparisonText}
                </span>
              )}
            </div>
          ) : subtitle ? (
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
              {subtitle}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {comparisonText}
            </span>
          )}
        </div>

        {/* Right: Sparkline Chart with soft gradient area */}
        {showSparkline && (
          <KpiSparkline
            direction={direction}
            isGood={isGood}
            data={sparklineData}
            color={sparklineColor}
            id={rawId}
          />
        )}
      </div>

      {footer && <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">{footer}</div>}
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
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
    7: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-7',
    8: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8',
  }[columns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'

  return (
    <div className={cn('grid gap-4 sm:gap-5', colClass, className)}>
      {children}
    </div>
  )
}
