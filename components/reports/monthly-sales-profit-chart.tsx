'use client'

import React, { useState, useMemo } from 'react'
import { MonthlySalesVsProfitPoint } from '@/types/reports.types'
import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MonthlySalesProfitChartProps {
  data: MonthlySalesVsProfitPoint[]
  monthsCount: 6 | 9 | 12
  onMonthsCountChange: (count: 6 | 9 | 12) => void
}

export function MonthlySalesProfitChart({
  data,
  monthsCount,
  onMonthsCountChange,
}: MonthlySalesProfitChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // Dynamic maximum scale for bar heights matching Finance Dashboard
  const maxVal = useMemo(() => {
    const highest = Math.max(0, ...data.map((d) => Math.max(d.sales, d.profit)))
    if (highest <= 0) return 100000
    const magnitude = Math.pow(10, Math.floor(Math.log10(highest)))
    return Math.ceil(highest / magnitude) * magnitude
  }, [data])

  const formatYAxis = (val: number) => {
    if (val === 0) return '0'
    if (val >= 10000000) return `৳ ${(val / 10000000).toFixed(1)}Cr`
    if (val >= 100000) return `৳ ${(val / 100000).toFixed(1)}L`
    if (val >= 1000) return `৳ ${(val / 1000).toFixed(0)}K`
    return `৳ ${val}`
  }

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Header matching Finance Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Monthly Sales vs Profit
        </h3>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Sales</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span>Profit</span>
            </div>
          </div>

          {/* Timeframe Toggle */}
          <div className="relative">
            <select
              value={monthsCount}
              onChange={(e) => onMonthsCountChange(Number(e.target.value) as 6 | 9 | 12)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-2xs transition-colors focus:outline-none"
            >
              <option value={6}>Last 6 Months</option>
              <option value={9}>Last 9 Months</option>
              <option value={12}>Last 12 Months</option>
            </select>
          </div>
        </div>
      </div>

      {/* Responsive Flexbox Grouped Bar Chart */}
      <div className="relative w-full h-56 pt-2">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
            <Activity className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-700 mb-2" />
            <span>No monthly sales or profit recorded for this period</span>
          </div>
        ) : (
          <>
            {/* Y Axis Grid Labels */}
            <div className="absolute left-0 top-0 bottom-6 w-14 flex flex-col justify-between text-2xs font-mono text-slate-400 pointer-events-none select-none text-right pr-2">
              <span>{formatYAxis(maxVal)}</span>
              <span>{formatYAxis(maxVal * 0.75)}</span>
              <span>{formatYAxis(maxVal * 0.5)}</span>
              <span>{formatYAxis(maxVal * 0.25)}</span>
              <span>0</span>
            </div>

            {/* Horizontal Gridlines */}
            <div className="absolute left-16 right-0 top-1 bottom-6 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-dashed border-slate-100 dark:border-slate-800 w-full" />
              <div className="border-b border-dashed border-slate-100 dark:border-slate-800 w-full" />
              <div className="border-b border-dashed border-slate-100 dark:border-slate-800 w-full" />
              <div className="border-b border-dashed border-slate-100 dark:border-slate-800 w-full" />
              <div className="border-b border-slate-200 dark:border-slate-700 w-full" />
            </div>

            {/* Bars container */}
            <div className="absolute left-16 right-0 top-0 bottom-6 flex items-end justify-between px-1">
              {data.map((item, idx) => {
                const salesHeight = maxVal > 0 ? Math.min(100, (item.sales / maxVal) * 100) : 0
                const profitHeight = maxVal > 0 ? Math.min(100, (item.profit / maxVal) * 100) : 0
                const isHovered = hoveredIdx === idx

                return (
                  <div
                    key={item.monthKey}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="flex-1 flex items-end justify-center gap-1 h-full relative group cursor-pointer"
                  >
                    {/* Hover Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white text-2xs py-2 px-3 rounded-xl whitespace-nowrap shadow-xl pointer-events-none border border-slate-700">
                        <div className="font-bold text-slate-200 mb-0.5 flex items-center justify-between gap-2">
                          <span>{item.monthLabel}</span>
                          <span className="text-[10px] text-blue-300 font-mono">
                            {item.margin}% margin
                          </span>
                        </div>
                        <div className="text-emerald-400 font-mono">
                          Sales: ৳ {item.sales.toLocaleString()}
                        </div>
                        <div className="text-blue-400 font-mono">
                          Profit: ৳ {item.profit.toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* Sales Bar (Emerald) */}
                    <div
                      style={{ height: `${Math.max(salesHeight > 0 ? 3 : 0, salesHeight)}%` }}
                      className={cn(
                        'w-1.5 sm:w-2.5 2xl:w-3 bg-emerald-500 rounded-t-xs transition-all duration-200',
                        isHovered ? 'bg-emerald-400 brightness-110' : ''
                      )}
                    />

                    {/* Profit Bar (Blue) */}
                    <div
                      style={{ height: `${Math.max(profitHeight > 0 ? 3 : 0, profitHeight)}%` }}
                      className={cn(
                        'w-1.5 sm:w-2.5 2xl:w-3 bg-blue-600 rounded-t-xs transition-all duration-200',
                        isHovered ? 'bg-blue-500 brightness-110' : ''
                      )}
                    />
                  </div>
                )
              })}
            </div>

            {/* X Axis Month Labels */}
            <div className="absolute left-16 right-0 bottom-0 flex justify-between text-2xs text-slate-400 font-medium px-2">
              {data.map((c) => (
                <span
                  key={c.monthKey}
                  className="truncate text-center"
                  style={{ width: `${100 / data.length}%` }}
                >
                  {c.monthShort}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
