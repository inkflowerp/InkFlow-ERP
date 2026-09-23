'use client'

import React from 'react'
import {
  Plus,
  ArrowRightLeft,
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
  onTransfer: () => void
  onAdjustment: () => void
  onNewPurchase: () => void
  onRefresh: () => void
}

export function InventoryActionBar({
  loading,
  onReceiveStock,
  onFloorIssue,
  onLogConsumption,
  onTransfer,
  onAdjustment,
  onNewPurchase,
  onRefresh,
}: InventoryActionBarProps) {
  const { locale } = useI18n()
  const isBn = locale === 'bn'

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
      {/* Primary Operations (Left) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Receive Stock (GRN) */}
        <Button
          size="sm"
          onClick={onReceiveStock}
          className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white h-9 px-3.5 shadow-xs font-bold cursor-pointer gap-1.5"
          title="Receive raw materials or ready products into warehouse"
        >
          <Plus className="h-4 w-4" />
          <span>{isBn ? 'মালামাল গ্রহণ (GRN)' : 'Receive Stock (GRN)'}</span>
        </Button>

        {/* Floor Issue */}
        <Button
          size="sm"
          variant="outline"
          onClick={onFloorIssue}
          className="text-xs h-9 px-3 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer gap-1.5 font-semibold"
          title="Issue materials to printing or fabrication floor"
        >
          <Scissors className="h-3.5 w-3.5 text-indigo-600" />
          <span>{isBn ? 'ফ্লোরে ইস্যু' : 'Floor Issue'}</span>
        </Button>

        {/* Log Floor Consumption */}
        {onLogConsumption && (
          <Button
            size="sm"
            variant="outline"
            onClick={onLogConsumption}
            className="text-xs h-9 px-3 border-amber-300 dark:border-amber-700 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 cursor-pointer gap-1.5 font-semibold"
            title="Log actual floor consumption, scrap, and remnants"
          >
            <Printer className="h-3.5 w-3.5 text-amber-600" />
            <span>{isBn ? 'কনজাম্পশন হিসাব' : 'Log Consumption'}</span>
          </Button>
        )}

        {/* Store Transfer */}
        <Button
          size="sm"
          variant="outline"
          onClick={onTransfer}
          className="text-xs h-9 px-3 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer gap-1.5 font-semibold"
          title="Transfer stock between locations or branch stores"
        >
          <ArrowRightLeft className="h-3.5 w-3.5 text-slate-500" />
          <span>{isBn ? 'স্টোর ট্রান্সফার' : 'Transfer'}</span>
        </Button>

        {/* Stock Audit / Adjustment */}
        <Button
          size="sm"
          variant="outline"
          onClick={onAdjustment}
          className="text-xs h-9 px-3 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer gap-1.5 font-semibold"
          title="Audit physical count and adjust stock variance"
        >
          <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
          <span>{isBn ? 'স্টক অডিট / সমন্বয়' : 'Audit / Adjust'}</span>
        </Button>

        {/* New Purchase Order */}
        <Button
          size="sm"
          variant="outline"
          onClick={onNewPurchase}
          className="text-xs h-9 px-3 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/40 cursor-pointer gap-1.5 font-semibold"
          title="Create a new Purchase Order to suppliers"
        >
          <ShoppingBag className="h-3.5 w-3.5 text-violet-600" />
          <span>{isBn ? 'নতুন PO' : 'New PO'}</span>
        </Button>
      </div>

      {/* Utilities (Right) */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="text-xs h-9 px-3 cursor-pointer gap-1.5 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Refresh live inventory data"
        >
          <RefreshCw className={cn('h-3.5 w-3.5 text-slate-500', loading && 'animate-spin')} />
          <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
        </Button>
      </div>
    </div>
  )
}
