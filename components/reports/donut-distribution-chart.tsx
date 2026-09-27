'use client'

import React, { useState } from 'react'
import { formatBDT } from '@/lib/formatters'

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

  const radius = 68
  const strokeWidth = 24
  const circumference = 2 * Math.PI * radius

  // Calculate arc offsets
  let accumulatedPercent = 0
  const validItems = items.filter((it) => it.amount > 0 || it.sharePercent > 0)
  const isAllZero = validItems.length === 0 || totalAmount === 0

  const slices = validItems.map((item) => {
    const strokeDasharray = `${(item.sharePercent / 100) * circumference} ${circumference}`
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference)
    accumulatedPercent += item.sharePercent
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    }
  })

  const activeItem = hoveredId ? items.find((i) => i.id === hoveredId) : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate pr-2">
          {title}
        </h3>
        {periodLabel && (
          <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
            {periodLabel}
          </span>
        )}
      </div>

      {/* Main Container: Donut + Legend */}
      <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
        {/* SVG Donut */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          <svg
            className="w-full h-full -rotate-90 transform overflow-visible"
            viewBox="0 0 180 180"
          >
            {/* Background Track */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800/80"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Slices */}
            {!isAllZero &&
              slices.map((slice) => {
                const isHovered = hoveredId === slice.id
                return (
                  <circle
                    key={slice.id}
                    cx="90"
                    cy="90"
                    r={radius}
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="cursor-pointer transition-all duration-200"
                    style={{
                      opacity: hoveredId === null || isHovered ? 1 : 0.6,
                      transformOrigin: '90px 90px',
                    }}
                    onMouseEnter={() => setHoveredId(slice.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                )
              })}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
            {activeItem ? (
              <>
                <span className="text-xs font-black text-slate-900 dark:text-white font-mono truncate max-w-[110px]">
                  {formatBDT(activeItem.amount)}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[110px]">
                  {activeItem.label} ({activeItem.sharePercent}%)
                </span>
              </>
            ) : (
              <>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono truncate max-w-[120px]">
                  {formatBDT(totalAmount)}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {centerSubtext}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 w-full space-y-1.5 min-w-[130px]">
          {isAllZero ? (
            <div className="text-center py-4 text-xs text-slate-400">
              No sales records in this period
            </div>
          ) : (
            validItems.slice(0, 6).map((item) => {
              const isHovered = hoveredId === item.id
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg cursor-pointer transition-colors text-xs ${
                    isHovered
                      ? 'bg-slate-100 dark:bg-slate-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span
                      className={`truncate font-medium ${
                        isHovered
                          ? 'text-slate-900 dark:text-white font-bold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-2xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
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
