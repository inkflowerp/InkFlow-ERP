'use client'

import React from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { formatBDT } from '@/lib/formatters'

export interface TrendDataPoint {
  dayLabelEn?: string
  shortDate?: string
  sales: number
  collections: number
}

interface DashboardTrendChartProps {
  data: TrendDataPoint[]
  trendDays: number
}

export function DashboardTrendChart({ data, trendDays }: DashboardTrendChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="ownerSalesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ownerColGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
          <XAxis
            dataKey={trendDays === 7 ? 'dayLabelEn' : 'shortDate'}
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickFormatter={(val) => `৳${val / 1000}k`}
          />
          <Tooltip formatter={(value: any) => [formatBDT(Number(value)), '']} />
          <Area
            type="monotone"
            dataKey="sales"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#ownerSalesGrad)"
            name="Sales"
          />
          <Area
            type="monotone"
            dataKey="collections"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#ownerColGrad)"
            name="Collections"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
