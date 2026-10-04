'use client'

import React, { useState, useMemo } from 'react'
import { MonthlySalesVsProfitPoint } from '@/types/reports.types'
import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'

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
  const { tBilingual } = useI18n()
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
        <h3 className="text-sm font-bold text-foreground">
          {tBilingual('Monthly Sales vs Profit', 'মাসিক বিক্রয় বনাম লাভ')}
        </h3>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-success"/>
              <span>{tBilingual('Sales', 'বিক্রয়')}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-primary"/>
              <span>{tBilingual('Profit', 'লাভ')}</span>
            </div>
          </div>

          {/* Timeframe Toggle */}
          <div className="relative">
            <select
 value={monthsCount}
 onChange={(e) => onMonthsCountChange(Number(e.target.value) as 6 | 9 | 12)}
 className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border bg-card text-foreground cursor-pointer hover:bg-muted dark:hover:bg-muted/60 shadow-2xs transition-colors focus:outline-none">
              <option value={6}>{tBilingual('Last 6 Months', 'বিগত ৬ মাস')}</option>
              <option value={9}>{tBilingual('Last 9 Months', 'বিগত ৯ মাস')}</option>
              <option value={12}>{tBilingual('Last 12 Months', 'বিগত ১২ মাস')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Responsive Flexbox Grouped Bar Chart */}
      <div className="relative w-full h-56 pt-2">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs">
            <Activity className="w-8 h-8 stroke-1 text-muted-foreground mb-2"/>
            <span>{tBilingual('No monthly sales or profit recorded for this period', 'এই সময়ের জন্য কোনো মাসিক বিক্রয় বা লাভের তথ্য নেই')}</span>
          </div>
        ) : (
          <>
            {/* Y Axis Grid Labels */}
            <div className="absolute left-0 top-0 bottom-6 w-14 flex flex-col justify-between text-xs tabular-nums text-muted-foreground pointer-events-none select-none text-right pr-2">
              <span>{formatYAxis(maxVal)}</span>
              <span>{formatYAxis(maxVal * 0.75)}</span>
              <span>{formatYAxis(maxVal * 0.5)}</span>
              <span>{formatYAxis(maxVal * 0.25)}</span>
              <span>0</span>
            </div>

            {/* Horizontal Gridlines */}
            <div className="absolute left-16 right-0 top-1 bottom-6 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-dashed border-border w-full"/>
              <div className="border-b border-dashed border-border w-full"/>
              <div className="border-b border-dashed border-border w-full"/>
              <div className="border-b border-dashed border-border w-full"/>
              <div className="border-b border-border w-full"/>
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
 className="flex-1 flex items-end justify-center gap-1 h-full relative group cursor-pointer">
                    {/* Hover Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 bg-surface-inset text-foreground text-xs py-2 px-3 rounded-xl whitespace-nowrap shadow-xs pointer-events-none border border-border">
                        <div className="font-bold text-foreground mb-0.5 flex items-center justify-between gap-2">
                          <span>{item.monthLabel}</span>
                          <span className="text-xs text-primary tabular-nums">
                            {item.margin}% {tBilingual('margin', 'মার্জিন')}
                          </span>
                        </div>
                        <div className="text-success tabular-nums">
 {tBilingual('Sales', 'বিক্রয়')}: ৳ {item.sales.toLocaleString()}
                        </div>
                        <div className="text-primary tabular-nums">
 {tBilingual('Profit', 'লাভ')}: ৳ {item.profit.toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* Sales Bar (Emerald) */}
                    <div
 style={{ height: `${Math.max(salesHeight > 0 ? 3 : 0, salesHeight)}%` }}
 className={cn(
                        'w-1.5 sm:w-2.5 2xl:w-3 bg-success rounded-t-xs transition-all duration-200',
 isHovered ? 'bg-success brightness-110' : ''
                      )}
                    />

                    {/* Profit Bar (Blue) */}
                    <div
 style={{ height: `${Math.max(profitHeight > 0 ? 3 : 0, profitHeight)}%` }}
 className={cn(
                        'w-1.5 sm:w-2.5 2xl:w-3 bg-primary rounded-t-xs transition-all duration-200',
 isHovered ? 'bg-primary brightness-110' : ''
                      )}
                    />
                  </div>
                )
              })}
            </div>

            {/* X Axis Month Labels */}
            <div className="absolute left-16 right-0 bottom-0 flex justify-between text-xs text-muted-foreground font-medium px-2">
              {data.map((c) => (
                <span
 key={c.monthKey}
 className="truncate text-center"style={{ width: `${100 / data.length}%` }}
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
