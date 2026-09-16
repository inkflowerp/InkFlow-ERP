'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ShoppingBag,
  Calendar,
  ArrowUpDown,
  Filter,
  TrendingUp,
  Package,
  Layers,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { CustomerProductPurchaseStat } from '@/types/crm.types'
import { formatBDT } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getCustomerProductAnalyticsAction } from '@/actions/customer.actions'
import { cn } from '@/lib/utils'

interface CustomerProductAnalyticsProps {
  customerId: string
  companyId?: string
  initialStats?: CustomerProductPurchaseStat[]
}

type TimeframeOption = 'week' | 'month' | 'year' | 'all' | 'custom'
type SortByOption = 'amount' | 'quantity' | 'recent' | 'name'

export function CustomerProductAnalytics({
  customerId,
  companyId,
  initialStats = [],
}: CustomerProductAnalyticsProps) {
  const [stats, setStats] = useState<CustomerProductPurchaseStat[]>(initialStats)
  const [timeframe, setTimeframe] = useState<TimeframeOption>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortByOption>('amount')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getCustomerProductAnalyticsAction(
        customerId,
        {
          timeframe,
          startDate: timeframe === 'custom' ? startDate : undefined,
          endDate: timeframe === 'custom' ? endDate : undefined,
          sortBy,
          sortOrder,
        },
        companyId
      )
      if (res.success && res.data) {
        setStats(res.data)
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false)
    }
  }, [customerId, companyId, timeframe, startDate, endDate, sortBy, sortOrder])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const totalVolume = stats.reduce((sum, s) => sum + s.totalQuantity, 0)
  const totalSpend = stats.reduce((sum, s) => sum + s.totalAmount, 0)

  return (
    <div className="space-y-4">
      {/* Top Filter & Metrics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        {/* Timeframe Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(
            [
              { key: 'all', label: 'All Time' },
              { key: 'month', label: 'Last 30 Days' },
              { key: 'week', label: 'Last 7 Days' },
              { key: 'year', label: 'This Year' },
              { key: 'custom', label: 'Custom' },
            ] as const
          ).map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={timeframe === t.key ? 'default' : 'outline'}
              onClick={() => setTimeframe(t.key)}
              className={cn(
                'h-7 px-2.5 text-xs rounded-lg',
                timeframe === t.key && 'bg-blue-600 hover:bg-blue-700 text-white font-semibold'
              )}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {/* Aggregate KPI Badges */}
        <div className="flex items-center gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Package className="h-3.5 w-3.5 text-blue-500" />
            <span>Products: <strong className="text-slate-900 dark:text-white">{stats.length}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span>Spend: <strong className="text-emerald-600 dark:text-emerald-400">৳{totalSpend.toLocaleString('en-IN')}</strong></span>
          </div>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {timeframe === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs animate-in fade-in duration-150">
          <span className="font-semibold text-slate-700 dark:text-slate-300">From:</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 w-36 text-xs bg-white dark:bg-slate-950"
          />
          <span className="font-semibold text-slate-700 dark:text-slate-300">To:</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 w-36 text-xs bg-white dark:bg-slate-950"
          />
          <Button
            size="sm"
            onClick={fetchStats}
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 ml-auto"
          >
            Apply Range
          </Button>
        </div>
      )}

      {/* Sort Options */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center gap-2">
          <span>Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortByOption)}
            className="h-7 px-2 text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
          >
            <option value="amount">Total Amount (৳)</option>
            <option value="quantity">Total Quantity</option>
            <option value="recent">Most Recent Purchase</option>
            <option value="name">Product Name</option>
          </select>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="h-7 px-2 text-xs"
            title="Toggle Ascending/Descending"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            {sortOrder.toUpperCase()}
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-1.5 text-blue-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Updating...</span>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
            <tr>
              <th className="py-3 px-4">Product / Item Description</th>
              <th className="py-3 px-3 text-right">Quantity</th>
              <th className="py-3 px-3 text-right">Last Billed Rate</th>
              <th className="py-3 px-3 text-right">Total Amount</th>
              <th className="py-3 px-4 text-right">Last Purchase Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {stats.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <div>No purchase records found for this timeframe.</div>
                </td>
              </tr>
            ) : (
              stats.map((item, idx) => (
                <tr key={item.productId || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {item.productName}
                    </div>
                    {item.productNameBn && (
                      <div className="text-[11px] text-slate-500">{item.productNameBn}</div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {item.invoiceCount} {item.invoiceCount === 1 ? 'invoice' : 'invoices'}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-900 dark:text-white">
                    {item.totalQuantity.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal uppercase">{item.unit}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-300">
                    {formatBDT(item.lastRate)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {formatBDT(item.totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 font-medium">
                    {item.lastPurchaseDate}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-2.5">
        {stats.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-950 rounded-xl border p-4">
            No product purchases recorded.
          </div>
        ) : (
          stats.map((item, idx) => (
            <Card key={item.productId || idx} className="border-slate-200 dark:border-slate-800 shadow-sm p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {item.productName}
                  </div>
                  {item.productNameBn && (
                    <div className="text-xs text-slate-500">{item.productNameBn}</div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {item.invoiceCount} {item.invoiceCount === 1 ? 'invoice' : 'invoices'}
                  </div>
                </div>

                <Badge variant="outline" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30">
                  {formatBDT(item.totalAmount)}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Total Qty</div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {item.totalQuantity} <span className="uppercase text-[9px] text-slate-400">{item.unit}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Last Rate</div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatBDT(item.lastRate)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Last Date</div>
                  <div className="font-medium text-slate-600 dark:text-slate-400 truncate">
                    {item.lastPurchaseDate}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
