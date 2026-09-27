'use client'

import React, { useState, useMemo } from 'react'
import { MonthlySalesVsProfitPoint } from '@/types/reports.types'
import { formatBDT } from '@/lib/formatters'

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Chart dimensions & scaling
  const maxVal = useMemo(() => {
    const highest = Math.max(...data.map((d) => Math.max(d.sales, d.profit)), 0)
    if (highest === 0) return 100000
    // Round up to nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(highest)))
    return Math.ceil(highest / magnitude) * magnitude
  }, [data])

  const formatShortAmount = (amt: number) => {
    if (amt >= 10000000) return `৳ ${(amt / 10000000).toFixed(1)}Cr`
    if (amt >= 100000) return `৳ ${(amt / 100000).toFixed(1)}L`
    if (amt >= 1000) return `৳ ${Math.round(amt / 1000)}K`
    return `৳ ${amt}`
  }

  const yTicks = [
    maxVal,
    Math.round(maxVal * 0.66),
    Math.round(maxVal * 0.33),
    0,
  ]

  const chartHeight = 160
  const chartWidth = 520
  const paddingLeft = 55
  const paddingBottom = 28
  const paddingTop = 12
  const paddingRight = 15

  const usableWidth = chartWidth - paddingLeft - paddingRight
  const usableHeight = chartHeight - paddingTop - paddingBottom
  const barGroupWidth = usableWidth / Math.max(data.length, 1)
  const barWidth = Math.min(12, Math.max(6, barGroupWidth * 0.28))
  const barGap = 3

  return (
    <div className="flex flex-col h-full">
      {/* Header with Title and Range Select */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Monthly Sales vs Profit
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={monthsCount}
            onChange={(e) => onMonthsCountChange(Number(e.target.value) as 6 | 9 | 12)}
            className="text-xs h-7 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
          >
            <option value={6}>Last 6 Months</option>
            <option value={9}>Last 9 Months</option>
            <option value={12}>Last 12 Months</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 text-xs font-semibold mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#00D284] inline-block" />
          <span className="text-slate-600 dark:text-slate-400">Sales</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB] inline-block" />
          <span className="text-slate-600 dark:text-slate-400">Profit</span>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative flex-1 min-h-[190px] w-full">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Y Axis Grid lines and Labels */}
          {yTicks.map((val, idx) => {
            const y = paddingTop + (usableHeight * (maxVal - val)) / maxVal
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800/80"
                  strokeDasharray={idx === yTicks.length - 1 ? undefined : '2,2'}
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500 select-none"
                >
                  {formatShortAmount(val)}
                </text>
              </g>
            )
          })}

          {/* Bars */}
          {data.map((item, idx) => {
            const groupX = paddingLeft + idx * barGroupWidth
            const centerX = groupX + barGroupWidth / 2

            const salesHeight = maxVal > 0 ? (item.sales / maxVal) * usableHeight : 0
            const profitHeight = maxVal > 0 ? (item.profit / maxVal) * usableHeight : 0

            const salesY = paddingTop + usableHeight - salesHeight
            const profitY = paddingTop + usableHeight - profitHeight

            const salesX = centerX - barWidth - barGap / 2
            const profitX = centerX + barGap / 2

            const isHovered = hoveredIndex === idx

            return (
              <g
                key={item.monthKey}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer transition-opacity"
              >
                {/* Invisible hover zone */}
                <rect
                  x={groupX}
                  y={paddingTop}
                  width={barGroupWidth}
                  height={usableHeight}
                  fill="transparent"
                />

                {/* Sales Bar */}
                <rect
                  x={salesX}
                  y={salesY}
                  width={barWidth}
                  height={Math.max(salesHeight, 2)}
                  rx="3"
                  ry="3"
                  fill="#00D284"
                  className={`transition-all duration-200 ${
                    isHovered ? 'filter brightness-110 drop-shadow-sm' : ''
                  }`}
                  opacity={hoveredIndex === null || isHovered ? 1 : 0.65}
                />

                {/* Profit Bar */}
                <rect
                  x={profitX}
                  y={profitY}
                  width={barWidth}
                  height={Math.max(profitHeight, 2)}
                  rx="3"
                  ry="3"
                  fill="#2563EB"
                  className={`transition-all duration-200 ${
                    isHovered ? 'filter brightness-110 drop-shadow-sm' : ''
                  }`}
                  opacity={hoveredIndex === null || isHovered ? 1 : 0.65}
                />

                {/* X Axis Month Label */}
                <text
                  x={centerX}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  className={`text-[10px] font-semibold select-none ${
                    isHovered
                      ? 'fill-blue-600 dark:fill-blue-400 font-bold'
                      : 'fill-slate-500 dark:fill-slate-400'
                  }`}
                >
                  {item.monthShort}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="absolute z-20 pointer-events-none p-2.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-xl text-xs backdrop-blur-xs border border-slate-700/60 transition-all duration-150 transform -translate-x-1/2"
            style={{
              left: `${
                ((paddingLeft + hoveredIndex * barGroupWidth + barGroupWidth / 2) / chartWidth) * 100
              }%`,
              top: '4px',
            }}
          >
            <div className="font-bold text-slate-200 border-b border-slate-700/80 pb-1 mb-1.5 flex items-center justify-between gap-3">
              <span>{data[hoveredIndex].monthLabel}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-300 font-bold">
                Margin: {data[hoveredIndex].margin}%
              </span>
            </div>
            <div className="space-y-1 font-mono">
              <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold">
                <span className="flex items-center gap-1.5 font-sans font-medium text-slate-300">
                  <span className="w-2 h-2 rounded-xs bg-[#00D284]" />
                  Sales:
                </span>
                <span>{formatBDT(data[hoveredIndex].sales)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-blue-400 font-bold">
                <span className="flex items-center gap-1.5 font-sans font-medium text-slate-300">
                  <span className="w-2 h-2 rounded-xs bg-[#2563EB]" />
                  Profit:
                </span>
                <span>{formatBDT(data[hoveredIndex].profit)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-slate-400 text-[11px]">
                <span className="font-sans">Direct Cost:</span>
                <span>{formatBDT(data[hoveredIndex].cost)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
