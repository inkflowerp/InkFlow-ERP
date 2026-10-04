'use client'

import React from 'react'
import {
 Plus,
 Scissors,
 RotateCcw,
 ShoppingBag,
 Printer,
 RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

export interface InventoryActionBarProps {
 pathname?: string
 slug?: string
 loading: boolean
 onReceiveStock: () => void
 onFloorIssue: () => void
 onLogConsumption?: () => void
 onTransfer?: () => void
 onAdjustment: () => void
 onNewPurchase: () => void
 onRefresh: () => void
}

export function InventoryActionBar({
 loading,
 onReceiveStock,
 onFloorIssue,
 onLogConsumption,
 onAdjustment,
 onNewPurchase,
 onRefresh,
}: InventoryActionBarProps) {
 const { locale } = useI18n()
 const isBn = locale === 'bn'

 return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-card rounded-xl border border-border shadow-xs">
      {/* Primary Operations (Left) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Receive Stock (GRN) */}
        <Button
 size="sm"onClick={onReceiveStock}
 className="bg-success hover:bg-success/90 text-xs text-success-foreground h-9 px-3.5 shadow-xs font-bold cursor-pointer gap-1.5"title="Receive raw materials or ready products into warehouse">
          <Plus className="h-4 w-4"/>
          <span>{isBn ? 'মালামাল গ্রহণ (GRN)' : 'Receive Stock (GRN)'}</span>
        </Button>

        {/* Floor Issue */}
        <Button
 size="sm"variant="outline"onClick={onFloorIssue}
 className="text-xs h-9 px-3 border-border text-foreground hover:bg-muted hover:bg-primary/10 dark:hover:bg-primary/10 cursor-pointer gap-1.5 font-semibold"title="Issue materials to printing or fabrication floor">
          <Scissors className="h-3.5 w-3.5 text-primary"/>
          <span>{isBn ? 'ফ্লোরে ইস্যু' : 'Floor Issue'}</span>
        </Button>

        {/* Log Floor Consumption */}
        {onLogConsumption && (
          <Button
 size="sm"variant="outline"onClick={onLogConsumption}
 className="text-xs h-9 px-3 border-border text-foreground hover:bg-muted hover:bg-warning/20 cursor-pointer gap-1.5 font-semibold"title="Log actual floor consumption, scrap, and remnants">
            <Printer className="h-3.5 w-3.5 text-warning"/>
            <span>{isBn ? 'কনজাম্পশন হিসাব' : 'Log Consumption'}</span>
          </Button>
        )}

        {/* Stock Audit / Adjustment */}
        <Button
 size="sm"variant="outline"onClick={onAdjustment}
 className="text-xs h-9 px-3 border-border text-foreground hover:bg-muted hover:bg-warning-surface dark:hover:bg-warning-surface cursor-pointer gap-1.5 font-semibold"title="Audit physical count and adjust stock variance">
          <RotateCcw className="h-3.5 w-3.5 text-warning"/>
          <span>{isBn ? 'স্টক অডিট / সমন্বয়' : 'Audit / Adjust'}</span>
        </Button>

        {/* New Purchase Order */}
        <Button
 size="sm"variant="outline"onClick={onNewPurchase}
 className="text-xs h-9 px-3 border-primary/20 border-border text-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/10 cursor-pointer gap-1.5 font-semibold"title="Create a new Purchase Order to suppliers">
          <ShoppingBag className="h-3.5 w-3.5 text-primary"/>
          <span>{isBn ? 'নতুন PO' : 'New PO'}</span>
        </Button>
      </div>

      {/* Utilities (Right) */}
      <div className="flex items-center gap-1.5">
        <Button
 variant="outline"size="sm"onClick={onRefresh}
 disabled={loading}
 className="text-xs h-9 w-9 p-0 flex items-center justify-center cursor-pointer font-medium text-muted-foreground hover:bg-muted shrink-0"title={isBn ? 'ইনভেন্টরি রিফ্রেশ করুন' : 'Refresh live inventory data'}
 aria-label={isBn ? 'ইনভেন্টরি রিফ্রেশ করুন' : 'Refresh live inventory data'}
        >
          <RefreshCw className={cn('h-3.5 w-3.5 text-muted-foreground', loading && 'animate-spin')} />
        </Button>
      </div>
    </div>
  )
}
