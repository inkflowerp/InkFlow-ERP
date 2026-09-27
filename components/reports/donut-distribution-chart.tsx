'use client'

import React, { useState } from 'react'

export interface DonutSliceItem {
  id: string
  label: string
  amount: number
  sharePercent: number
  color: string
  subtext?: string
}

interface DonutDistributionChartProps {
  title: string
  totalAmount: number
  items: DonutSliceItem[]
  periodLabel?: string
  centerSubtext?: string
}

export function DonutDistributionChart({
  title,
  totalAmount,
  items,
  periodLabel = 'This Month',
  centerSubtext = 'Total Sales',
}: DonutDistributionChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Donut geometry matching Finance Dashboard
  const R = 38
  const C = 2 * Math.PI * R // ~238.761

  const validItems = items.filter((it) => it.amount > 0 || it.sharePercent > 0)
  const isAllZero = validItems.length === 0 || totalAmount === 0

  let accumulatedPercent = 0
  const slices = validItems.map((item) => {
    const len = (item.sharePercent / 100) * C
    const offset = -((accumulatedPercent / 100) * C)
    accumulatedPercent += item.sharePercent
    return {
      ...item,
      len,
      offset,
    }
  })

  const activeItem = hoveredId ? items.find((i) => i.id === hoveredId) : null

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate pr-2">
          {title}
        </h3>
        {periodLabel && (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {periodLabel}
          </span>
        )}
      </div>

      {/* Donut & Legend Container matching Finance Dashboard */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 2xl:gap-6 py-2">
        {/* Donut Graphic */}
        <div className="relative w-32 h-32 2xl:w-36 2xl:h-36 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {/* Background Ring */}
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="transparent"
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
              strokeWidth="14"
            />

            {!isAllZero &&
              slices.map((slice) => {
                const isHovered = hoveredId === slice.id
                return (
                  <circle
                    key={slice.id}
                    cx="50"
                    cy="50"
                    r={R}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? 16 : 14}
                    strokeDasharray={`${slice.len.toFixed(1)} ${C.toFixed(1)}`}
                    strokeDashoffset={slice.offset.toFixed(1)}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredId(slice.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                )
              })}
          </svg>

          {/* Donut Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
            {activeItem ? (
              <>
                <span className="text-xs 2xl:text-sm font-black text-slate-900 dark:text-white font-mono truncate max-w-[85px] 2xl:max-w-[100px]">
                  ৳ {activeItem.amount.toLocaleString()}
                </span>
                <span className="text-[10px] 2xl:text-3xs text-blue-600 dark:text-blue-400 font-bold truncate max-w-[85px]">
                  {activeItem.sharePercent}%
                </span>
              </>
            ) : (
              <>
                <span className="text-xs 2xl:text-sm font-black text-slate-900 dark:text-white font-mono truncate max-w-[85px] 2xl:max-w-[100px]">
                  ৳ {totalAmount.toLocaleString()}
                </span>
                <span className="text-[10px] 2xl:text-3xs text-slate-400 font-medium">
                  {centerSubtext}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend & Breakdown values matching Finance Dashboard */}
        <div className="flex-1 w-full space-y-1.5 2xl:space-y-2 text-xs">
          {isAllZero ? (
            <div className="text-center py-4 text-xs text-slate-400">
              No sales records in this period
            </div>
          ) : (
            validItems.slice(0, 5).map((item) => {
              const isHovered = hoveredId === item.id
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`flex items-center justify-between py-0.5 px-1.5 rounded-lg transition-colors cursor-pointer ${
                    isHovered ? 'bg-slate-50 dark:bg-slate-800/60' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 2xl:gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ৳ {item.amount.toLocaleString()}
                    </span>
                    <span className="text-slate-400 text-2xs w-7 text-right font-medium">
                      {item.sharePercent}%
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
