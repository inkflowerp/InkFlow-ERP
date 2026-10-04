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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
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
 size="sm"variant={timeframe === t.key ? 'default' : 'outline'}
 onClick={() => setTimeframe(t.key)}
 className={cn(
                'h-7 px-2.5 text-xs rounded-lg',
 timeframe === t.key && 'bg-primary hover:bg-primary/90 text-primary-foreground font-semibold'
              )}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {/* Aggregate KPI Badges */}
        <div className="flex items-center gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="h-3.5 w-3.5 text-primary"/>
            <span>Products: <strong className="text-foreground">{stats.length}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-success"/>
            <span>Spend: <strong className="text-success text-success">৳{totalSpend.toLocaleString('en-IN')}</strong></span>
          </div>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {timeframe === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-muted text-xs animate-in fade-in duration-150">
          <span className="font-semibold text-foreground">From:</span>
          <Input
 type="date"value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className="h-8 w-36 text-xs bg-card"/>
          <span className="font-semibold text-foreground">To:</span>
          <Input
 type="date"value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 className="h-8 w-36 text-xs bg-card"/>
          <Button
 size="sm"onClick={fetchStats}
 className="h-8 text-xs bg-primary hover:bg-primary ml-auto">
 Apply Range
          </Button>
        </div>
      )}

      {/* Sort Options */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-2">
          <span>Sort By:</span>
          <select
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value as SortByOption)}
 className="h-7 px-2 text-xs rounded-md border border-border bg-card font-medium">
            <option value="amount">Total Amount (৳)</option>
            <option value="quantity">Total Quantity</option>
            <option value="recent">Most Recent Purchase</option>
            <option value="name">Product Name</option>
          </select>
          <Button
 size="sm"variant="ghost"onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
 className="h-7 px-2 text-xs"title="Toggle Ascending/Descending">
            <ArrowUpDown className="h-3 w-3 mr-1"/>
            {sortOrder.toUpperCase()}
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-1.5 text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin"/>
            <span>Updating...</span>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th className="py-3 px-4">Product / Item Description</th>
              <th className="py-3 px-3 text-right">Quantity</th>
              <th className="py-3 px-3 text-right">Last Billed Rate</th>
              <th className="py-3 px-3 text-right">Total Amount</th>
              <th className="py-3 px-4 text-right">Last Purchase Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border">
            {stats.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-muted-foreground">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30"/>
                  <div>No purchase records found for this timeframe.</div>
                </td>
              </tr>
            ) : (
 stats.map((item, idx) => (
                <tr key={item.productId || idx} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-foreground">
                      {item.productName}
                    </div>
                    {item.productNameBn && (
                      <div className="text-xs text-muted-foreground">{item.productNameBn}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.invoiceCount} {item.invoiceCount === 1 ? 'invoice' : 'invoices'}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-foreground">
                    {item.totalQuantity.toLocaleString()} <span className="text-xs text-muted-foreground font-normal uppercase">{item.unit}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-muted-foreground">
                    {formatBDT(item.lastRate)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-sm text-success text-success">
                    {formatBDT(item.totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground font-medium">
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
          <div className="py-8 text-center text-muted-foreground text-xs bg-card rounded-xl border p-4">
 No product purchases recorded.
          </div>
        ) : (
 stats.map((item, idx) => (
            <Card key={item.productId || idx} className="border-border shadow-sm p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-foreground">
                    {item.productName}
                  </div>
                  {item.productNameBn && (
                    <div className="text-xs text-muted-foreground">{item.productNameBn}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.invoiceCount} {item.invoiceCount === 1 ? 'invoice' : 'invoices'}
                  </div>
                </div>

                <Badge variant="outline"className="text-xs font-bold text-success text-success bg-success-surface/50 bg-success-surface">
                  {formatBDT(item.totalAmount)}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-muted text-xs">
                <div>
                  <div className="text-xs text-muted-foreground">Total Qty</div>
                  <div className="font-semibold text-foreground">
                    {item.totalQuantity} <span className="uppercase text-xs text-muted-foreground">{item.unit}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Last Rate</div>
                  <div className="font-semibold text-foreground">
                    {formatBDT(item.lastRate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Last Date</div>
                  <div className="font-medium text-muted-foreground truncate">
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
