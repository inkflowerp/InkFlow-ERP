'use client'

import React, { useState } from 'react'
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Building2,
  Calendar,
  Layers,
  History,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Disc,
} from 'lucide-react'
import { PriceIntelligenceSummary } from '@/types/price-intelligence.types'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface PriceIntelligenceCardProps {
  summary: PriceIntelligenceSummary | null
  currentUnitPrice: number
  purchaseUnit?: string
  className?: string
}

export function PriceIntelligenceCard({
  summary,
  currentUnitPrice,
  purchaseUnit = 'Roll',
  className,
}: PriceIntelligenceCardProps) {
  const [showHistory, setShowHistory] = useState(false)

  if (!summary) return null

  const isUp = summary.trend === 'up'
  const isDown = summary.trend === 'down'

  return (
    <div
      className={cn(
        'rounded-xl p-3.5 bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-slate-50 dark:from-slate-900/90 dark:via-indigo-950/30 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-900/60 shadow-xs space-y-3 transition-all',
        className
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/50 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-xs font-black tracking-tight text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              Price Intelligence & Market Reference
              <Badge variant="outline" className="text-2xs tabular-nums px-1.5 py-0 h-4 bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300">
                {summary.size_label}
              </Badge>
            </span>
          </div>
        </div>

        {/* Delta vs Previous Trend */}
        <div className="flex items-center gap-1">
          {summary.price_change_percent !== 0 && (
            <Badge
              variant="outline"
              className={cn(
                'text-2xs font-bold px-2 py-0.5 gap-1',
                isUp
                  ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                  : isDown
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-muted text-foreground border-input'
              )}
            >
              {isUp ? (
                <TrendingUp className="h-3 w-3 text-amber-600" />
              ) : isDown ? (
                <TrendingDown className="h-3 w-3 text-emerald-600" />
              ) : (
                <Minus className="h-3 w-3 text-muted-foreground" />
              )}
              <span>{summary.price_change_percent > 0 ? `+${summary.price_change_percent}%` : `${summary.price_change_percent}%`} vs prev</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Metric Tiles HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Metric 1: Inward Price */}
        <div className="p-2 rounded-lg bg-card border border-indigo-100 dark:border-indigo-900/40 shadow-2xs">
          <div className="text-2xs font-medium text-muted-foreground dark:text-muted-foreground">Current Inward Price</div>
          <div className="text-sm font-black text-indigo-700 dark:text-indigo-300 tabular-nums mt-0.5">
            {formatBDT(currentUnitPrice)}
          </div>
          <div className="text-2xs text-muted-foreground font-sans">per {purchaseUnit}</div>
        </div>

        {/* Metric 2: Normalized / sqft */}
        <div className="p-2 rounded-lg bg-card border border-indigo-100 dark:border-indigo-900/40 shadow-2xs">
          <div className="text-2xs font-medium text-muted-foreground dark:text-muted-foreground">Normalized Cost</div>
          <div className="text-sm font-black text-foreground dark:text-white tabular-nums mt-0.5">
            {summary.normalized_cost_per_sft !== undefined
              ? formatBDT(summary.normalized_cost_per_sft)
              : formatBDT(currentUnitPrice)}
          </div>
          <div className="text-2xs text-muted-foreground font-sans">
            {summary.normalized_cost_per_sft !== undefined ? 'per sqft' : `per ${purchaseUnit}`}
          </div>
        </div>

        {/* Metric 3: Lowest Recorded */}
        <div className="p-2 rounded-lg bg-card border border-emerald-100 dark:border-emerald-900/40 shadow-2xs">
          <div className="text-2xs font-medium text-emerald-700 dark:text-emerald-400">Lowest Recorded</div>
          <div className="text-sm font-black text-emerald-700 dark:text-emerald-300 tabular-nums mt-0.5">
            {formatBDT(summary.lowest_cost)}
          </div>
          <div className="text-2xs text-emerald-600/80 dark:text-emerald-400 truncate" title={summary.lowest_supplier_name}>
            {summary.lowest_supplier_name || 'Standard'}
          </div>
        </div>

        {/* Metric 4: Market Average */}
        <div className="p-2 rounded-lg bg-card border border-indigo-100 dark:border-indigo-900/40 shadow-2xs">
          <div className="text-2xs font-medium text-muted-foreground dark:text-muted-foreground">Recorded Average</div>
          <div className="text-sm font-black text-foreground tabular-nums mt-0.5">
            {formatBDT(summary.average_cost)}
          </div>
          <div className="text-2xs text-muted-foreground font-sans">{summary.total_records_count} past purchase(s)</div>
        </div>
      </div>

      {/* Supplier Comparison Quick Table */}
      {summary.supplier_comparison.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-2xs font-bold text-foreground dark:text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3 text-indigo-600" />
              Supplier Price Comparison ({summary.supplier_comparison.length})
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="h-6 px-1.5 text-2xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/60"
            >
              {showHistory ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-0.5" /> Less History
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-0.5" /> View Price History ({summary.history.length})
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {summary.supplier_comparison.map((sup, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-card/80 border border-border text-xs"
              >
                <div className="truncate pr-2">
                  <div className="font-bold text-foreground dark:text-white truncate">{sup.supplier_name}</div>
                  <div className="text-2xs text-muted-foreground flex items-center gap-1 tabular-nums">
                    <Calendar className="h-2.5 w-2.5" /> {sup.last_purchase_date || 'Recent'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="tabular-nums font-black text-foreground dark:text-white">
                    {formatBDT(sup.latest_price)}
                  </div>
                  {sup.normalized_price_per_sft && (
                    <div className="text-2xs text-indigo-600 tabular-nums">
                      {formatBDT(sup.normalized_price_per_sft)}/sqft
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Historical Log Drawer */}
          {showHistory && summary.history.length > 0 && (
            <div className="p-2.5 bg-card rounded-lg border border-border space-y-1.5 mt-2 animate-in fade-in-0">
              <div className="text-2xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <History className="h-3 w-3" /> Historical Purchase Events Log
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-border dark:divide-slate-900 text-xs">
                {summary.history.map((h, i) => (
                  <div key={i} className="pt-1 flex items-center justify-between tabular-nums text-2xs">
                    <div>
                      <span className="font-bold text-foreground dark:text-foreground">{h.supplier_name}</span>
                      <span className="text-muted-foreground text-2xs ml-1.5 font-sans">
                        {h.purchase_date} {h.challan_number ? `• Ch: ${h.challan_number}` : ''}
                      </span>
                    </div>
                    <div className="font-bold text-foreground dark:text-white">
                      {formatBDT(h.unit_purchase_price)} / {h.purchase_unit} ({h.quantity_received} {h.purchase_unit})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
