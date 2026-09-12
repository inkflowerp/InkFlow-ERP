'use client'

import React from 'react'
import { ArrowUpRight, ArrowDownRight, Minus, LucideIcon } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { toBengaliNumerals, formatBDT } from '@/lib/formatters'
import { CurrencyDisplay } from './currency-display'
import { cn } from '@/lib/utils'

export type KpiColorVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'cyan'

export interface KpiTrend {
  value: string | number
  labelEn?: string
  labelBn?: string
  direction?: 'up' | 'down' | 'neutral'
}

export interface KpiCardProps {
  titleEn: string
  titleBn: string
  value: number | string
  unitEn?: string
  unitBn?: string
  isCurrency?: boolean
  icon?: React.ComponentType<{ className?: string }> | LucideIcon | React.ElementType
  colorVariant?: KpiColorVariant
  trend?: KpiTrend
  subtitleEn?: string
  subtitleBn?: string
  badge?: string
  onClick?: () => void
  isLoading?: boolean
  className?: string
}

const VARIANT_STYLES: Record<
  KpiColorVariant,
  {
    iconBg: string
    iconText: string
    iconBorder: string
    accentBorder: string
    glow: string
  }
> = {
  primary: {
    iconBg: 'bg-blue-50 dark:bg-blue-500/10',
    iconText: 'text-blue-600 dark:text-blue-400',
    iconBorder: 'border-blue-200/80 dark:border-blue-500/20',
    accentBorder: 'border-l-blue-500',
    glow: 'group-hover:shadow-blue-500/10',
  },
  success: {
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    iconBorder: 'border-emerald-200/80 dark:border-emerald-500/20',
    accentBorder: 'border-l-emerald-500',
    glow: 'group-hover:shadow-emerald-500/10',
  },
  warning: {
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    iconText: 'text-amber-600 dark:text-amber-400',
    iconBorder: 'border-amber-200/80 dark:border-amber-500/20',
    accentBorder: 'border-l-amber-500',
    glow: 'group-hover:shadow-amber-500/10',
  },
  danger: {
    iconBg: 'bg-rose-50 dark:bg-rose-500/10',
    iconText: 'text-rose-600 dark:text-rose-400',
    iconBorder: 'border-rose-200/80 dark:border-rose-500/20',
    accentBorder: 'border-l-rose-500',
    glow: 'group-hover:shadow-rose-500/10',
  },
  info: {
    iconBg: 'bg-sky-50 dark:bg-sky-500/10',
    iconText: 'text-sky-600 dark:text-sky-400',
    iconBorder: 'border-sky-200/80 dark:border-sky-500/20',
    accentBorder: 'border-l-sky-500',
    glow: 'group-hover:shadow-sky-500/10',
  },
  purple: {
    iconBg: 'bg-indigo-50 dark:bg-indigo-500/10',
    iconText: 'text-indigo-600 dark:text-indigo-400',
    iconBorder: 'border-indigo-200/80 dark:border-indigo-500/20',
    accentBorder: 'border-l-indigo-500',
    glow: 'group-hover:shadow-indigo-500/10',
  },
  cyan: {
    iconBg: 'bg-cyan-50 dark:bg-cyan-500/10',
    iconText: 'text-cyan-600 dark:text-cyan-400',
    iconBorder: 'border-cyan-200/80 dark:border-cyan-500/20',
    accentBorder: 'border-l-cyan-500',
    glow: 'group-hover:shadow-cyan-500/10',
  },
}

export function KpiCard({
  titleEn,
  titleBn,
  value,
  unitEn,
  unitBn,
  isCurrency = false,
  icon: Icon,
  colorVariant = 'primary',
  trend,
  subtitleEn,
  subtitleBn,
  badge,
  onClick,
  isLoading = false,
  className,
}: KpiCardProps) {
  const { locale, tBilingual } = useI18n()
  const variant = VARIANT_STYLES[colorVariant] || VARIANT_STYLES.primary

  const title = tBilingual(titleEn, titleBn)
  const subtitle = subtitleEn && subtitleBn ? tBilingual(subtitleEn, subtitleBn) : (subtitleEn || subtitleBn)
  const unit = unitEn && unitBn ? tBilingual(unitEn, unitBn) : (unitEn || unitBn)

  const formatVal = (v: number | string) => {
    if (typeof v === 'number') {
      return locale === 'bn' ? toBengaliNumerals(v.toLocaleString()) : v.toLocaleString()
    }
    return locale === 'bn' ? toBengaliNumerals(v) : v
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs animate-pulse space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-9 w-9 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
        <div className="h-7 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'group p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs transition-all duration-200 flex flex-col justify-between relative overflow-hidden',
        'border-l-4',
        variant.accentBorder,
        onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md active:scale-[0.99]' : 'hover:shadow-xs',
        variant.glow,
        className
      )}
    >
      {/* Top row: Title + Icon Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate bangla-text">
            {title}
          </span>
          {badge && (
            <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {badge}
            </span>
          )}
        </div>

        {Icon && (
          <div
            className={cn(
              'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 shadow-xs',
              variant.iconBg,
              variant.iconText,
              variant.iconBorder
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
        {isCurrency && typeof value === 'number' ? (
          <div className="text-xl sm:text-2xl lg:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white" suppressHydrationWarning>
            <CurrencyDisplay amount={value} />
          </div>
        ) : (
          <div className="text-xl sm:text-2xl lg:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white" suppressHydrationWarning>
            {formatVal(value)}
          </div>
        )}

        {unit && (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bangla-text" suppressHydrationWarning>
            {unit}
          </span>
        )}
      </div>

      {/* Bottom row: Trend badge or Subtitle */}
      {(trend || subtitle) && (
        <div className="mt-2.5 flex items-center justify-between gap-2 text-xs flex-wrap">
          {trend ? (
            <div
              className={cn(
                'inline-flex items-center gap-1 font-semibold text-[11px] font-mono rounded-md px-1.5 py-0.5 border',
                trend.direction === 'up'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80'
                  : trend.direction === 'down'
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/80'
                  : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              )}
            >
              {trend.direction === 'up' && <ArrowUpRight className="h-3 w-3 shrink-0" />}
              {trend.direction === 'down' && <ArrowDownRight className="h-3 w-3 shrink-0" />}
              {trend.direction === 'neutral' && <Minus className="h-3 w-3 shrink-0" />}
              <span>{typeof trend.value === 'number' ? formatVal(trend.value) : trend.value}</span>
              {(trend.labelEn || trend.labelBn) && (
                <span className="text-[10px] font-sans font-normal opacity-80 bangla-text">
                  {tBilingual(trend.labelEn || '', trend.labelBn || '')}
                </span>
              )}
            </div>
          ) : null}

          {subtitle && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate bangla-text">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function KpiGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5 | 6
  className?: string
}) {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  }[columns]

  return (
    <div className={cn('grid gap-3 sm:gap-4', colClass, className)}>
      {children}
    </div>
  )
}
