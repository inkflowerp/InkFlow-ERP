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
        'rounded-xl p-3.5     dark: dark: dark: border border-primary/20/80 border-border/60 shadow-xs space-y-3 transition-all',
 className
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border border-border/50 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <Sparkles className="h-3.5 w-3.5"/>
          </div>
          <div>
            <span className="text-xs font-black tracking-tight text-primary text-primary flex items-center gap-1.5">
 Price Intelligence & Market Reference
              <Badge variant="outline"className="text-xs tabular-nums px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 bg-primary/50 text-primary">
                {summary.size_label}
              </Badge>
            </span>
          </div>
        </div>

        {/* Delta vs Previous Trend */}
        <div className="flex items-center gap-1">
          {summary.price_change_percent !== 0 && (
            <Badge
 variant="outline"className={cn(
                'text-xs font-bold px-2 py-0.5 gap-1',
 isUp
                  ? 'bg-warning-surface text-warning border-warning-border bg-warning-surface/60 text-warning'
                  : isDown
                  ? 'bg-success-surface text-success border-success-border bg-success-surface/60 text-success'
                  : 'bg-muted text-foreground border-input'
              )}
            >
              {isUp ? (
                <TrendingUp className="h-3 w-3 text-warning"/>
              ) : isDown ? (
                <TrendingDown className="h-3 w-3 text-success"/>
              ) : (
                <Minus className="h-3 w-3 text-muted-foreground"/>
              )}
              <span>{summary.price_change_percent > 0 ? `+${summary.price_change_percent}%` : `${summary.price_change_percent}%`} vs prev</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Metric Tiles HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Metric 1: Inward Price */}
        <div className="p-2 rounded-lg bg-card border border-border border-border/40 shadow-2xs">
          <div className="text-xs font-medium text-muted-foreground">Current Inward Price</div>
          <div className="text-sm font-black text-primary text-primary tabular-nums mt-0.5">
            {formatBDT(currentUnitPrice)}
          </div>
          <div className="text-xs text-muted-foreground font-sans">per {purchaseUnit}</div>
        </div>

        {/* Metric 2: Normalized / sqft */}
        <div className="p-2 rounded-lg bg-card border border-border border-border/40 shadow-2xs">
          <div className="text-xs font-medium text-muted-foreground">Normalized Cost</div>
          <div className="text-sm font-black text-foreground tabular-nums mt-0.5">
            {summary.normalized_cost_per_sft !== undefined
              ? formatBDT(summary.normalized_cost_per_sft)
              : formatBDT(currentUnitPrice)}
          </div>
          <div className="text-xs text-muted-foreground font-sans">
            {summary.normalized_cost_per_sft !== undefined ? 'per sqft' : `per ${purchaseUnit}`}
          </div>
        </div>

        {/* Metric 3: Lowest Recorded */}
        <div className="p-2 rounded-lg bg-card border border-success-border border-success-border/40 shadow-2xs">
          <div className="text-xs font-medium text-success text-success">Lowest Recorded</div>
          <div className="text-sm font-black text-success text-success tabular-nums mt-0.5">
            {formatBDT(summary.lowest_cost)}
          </div>
          <div className="text-xs text-success/80 text-success truncate"title={summary.lowest_supplier_name}>
            {summary.lowest_supplier_name || 'Standard'}
          </div>
        </div>

        {/* Metric 4: Market Average */}
        <div className="p-2 rounded-lg bg-card border border-border border-border/40 shadow-2xs">
          <div className="text-xs font-medium text-muted-foreground">Recorded Average</div>
          <div className="text-sm font-black text-foreground tabular-nums mt-0.5">
            {formatBDT(summary.average_cost)}
          </div>
          <div className="text-xs text-muted-foreground font-sans">{summary.total_records_count} past purchase(s)</div>
        </div>
      </div>

      {/* Supplier Comparison Quick Table */}
      {summary.supplier_comparison.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3 text-primary"/>
 Supplier Price Comparison ({summary.supplier_comparison.length})
            </span>
            <Button
 type="button"variant="ghost"size="sm"onClick={() => setShowHistory(!showHistory)}
 className="h-6 px-1.5 text-xs text-primary text-primary hover:bg-primary/10/60">
              {showHistory ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-0.5"/> Less History
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-0.5"/> View Price History ({summary.history.length})
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {summary.supplier_comparison.map((sup, idx) => (
              <div
 key={idx}
 className="flex items-center justify-between p-2 rounded-lg bg-card/80 border border-border text-xs">
                <div className="truncate pr-2">
                  <div className="font-bold text-foreground truncate">{sup.supplier_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums">
                    <Calendar className="h-2.5 w-2.5"/> {sup.last_purchase_date || 'Recent'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="tabular-nums font-black text-foreground">
                    {formatBDT(sup.latest_price)}
                  </div>
                  {sup.normalized_price_per_sft && (
                    <div className="text-xs text-primary tabular-nums">
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
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <History className="h-3 w-3"/> Historical Purchase Events Log
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-border dark:divide-slate-900 text-xs">
                {summary.history.map((h, i) => (
                  <div key={i} className="pt-1 flex items-center justify-between tabular-nums text-xs">
                    <div>
                      <span className="font-bold text-foreground">{h.supplier_name}</span>
                      <span className="text-muted-foreground text-xs ml-1.5 font-sans">
                        {h.purchase_date} {h.challan_number ? `• Ch: ${h.challan_number}` : ''}
                      </span>
                    </div>
                    <div className="font-bold text-foreground">
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
