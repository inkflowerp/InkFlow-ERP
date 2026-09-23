'use client'

import React from 'react'
import {
  DollarSign,
  AlertTriangle,
  AlertOctagon,
  Disc,
  Truck,
  Scissors,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { getMaterialWarehouseStockBreakdown } from '@/lib/units'
import type { InventorySummaryStats, MaterialRecord, InventoryRollRecord, InventoryRemnantRecord } from '@/types/inventory.types'
import type { ProductRecord } from '@/types/product.types'
import type { PurchaseOrderRecord } from '@/types/purchase.types'

export interface InventoryKpiBarProps {
  summary: InventorySummaryStats
  materials: MaterialRecord[]
  readyProducts: ProductRecord[]
  lowStockMaterials: MaterialRecord[]
  outOfStockMaterials: MaterialRecord[]
  rolls: InventoryRollRecord[]
  pendingInwardPOs: PurchaseOrderRecord[]
  remnants: InventoryRemnantRecord[]
  activeFilter?: string
  onFilterClick?: (filterKey: string) => void
}

export function InventoryKpiBar({
  summary,
  materials,
  readyProducts,
  lowStockMaterials,
  outOfStockMaterials,
  rolls,
  pendingInwardPOs,
  remnants,
  activeFilter,
  onFilterClick,
}: InventoryKpiBarProps) {
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  const mountedRollsCount = rolls.filter((r) => r.status === 'mounted' || r.mounted_machine_id).length

  const computedMaterialsValue = materials.reduce((sum, m) => {
    const b = getMaterialWarehouseStockBreakdown(m, rolls)
    return sum + (b.total_valuation || 0)
  }, 0)

  const computedProductsValue = readyProducts.reduce((sum, p) => {
    const stock = Number((p as any).current_stock || (p as any).stock || (p as any).opening_stock || 0)
    const cost = Number(p.base_cost || p.purchase_price || (p as any).cost_per_unit || 0)
    return sum + (stock > 0 ? stock * cost : 0)
  }, 0)

  const displayTotalValue =
    (computedMaterialsValue + computedProductsValue) > 0
      ? (computedMaterialsValue + computedProductsValue)
      : (summary.totalAvailableStockValue || 0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Valuation */}
      <Card
        onClick={() => onFilterClick?.('all')}
        className={cn(
          'p-3.5 border-l-4 border-l-emerald-600 bg-emerald-50/10 dark:bg-emerald-950/10 transition-all hover:shadow-xs cursor-pointer',
          activeFilter === 'all' && 'ring-2 ring-emerald-500 shadow-xs'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {isBn ? 'মোট স্টক মূল্য' : 'Total Stock Value'}
          </span>
          <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="text-xl font-black text-slate-900 dark:text-white mt-1 font-numeric">
          <CurrencyDisplay amount={displayTotalValue} />
        </div>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
          {materials.length} {isBn ? 'কাঁচামাল' : 'Materials'} • {readyProducts.length} {isBn ? 'প্রোডাক্ট' : 'Products'}
        </span>
      </Card>

      {/* 2. Low Stock Warning */}
      <Card
        onClick={() => onFilterClick?.('low_stock')}
        className={cn(
          'p-3.5 border-l-4 transition-all hover:shadow-xs cursor-pointer',
          lowStockMaterials.length > 0
            ? 'border-l-amber-500 bg-amber-50/15 dark:bg-amber-950/15'
            : 'border-l-slate-300 dark:border-l-slate-700',
          activeFilter === 'low_stock' && 'ring-2 ring-amber-500 shadow-xs'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {isBn ? 'রি-অর্ডার সতর্কতা' : 'Low Stock Warning'}
          </span>
          <AlertTriangle className={cn('h-3.5 w-3.5', lowStockMaterials.length > 0 ? 'text-amber-600' : 'text-slate-400')} />
        </div>
        <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 font-numeric">
          {lowStockMaterials.length}
        </div>
        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-0.5">
          {isBn ? 'রি-অর্ডার লেভেলের নিচে' : 'Below reorder point'}
        </span>
      </Card>

      {/* 3. Out of Stock */}
      <Card
        onClick={() => onFilterClick?.('out_of_stock')}
        className={cn(
          'p-3.5 border-l-4 transition-all hover:shadow-xs cursor-pointer',
          outOfStockMaterials.length > 0
            ? 'border-l-rose-500 bg-rose-50/15 dark:bg-rose-950/15'
            : 'border-l-slate-300 dark:border-l-slate-700',
          activeFilter === 'out_of_stock' && 'ring-2 ring-rose-500 shadow-xs'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {isBn ? 'স্টক শূন্য (শূন্য মজুদ)' : 'Out of Stock'}
          </span>
          <AlertOctagon className={cn('h-3.5 w-3.5', outOfStockMaterials.length > 0 ? 'text-rose-600' : 'text-slate-400')} />
        </div>
        <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 font-numeric">
          {outOfStockMaterials.length}
        </div>
        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium block mt-0.5">
          {isBn ? 'স্টক নিঃশেষ' : 'Zero warehouse stock'}
        </span>
      </Card>

      {/* 4. Active Rolls */}
      <Card
        onClick={() => onFilterClick?.('rolls')}
        className={cn(
          'p-3.5 border-l-4 border-l-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/10 transition-all hover:shadow-xs cursor-pointer',
          activeFilter === 'rolls' && 'ring-2 ring-indigo-500 shadow-xs'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {isBn ? 'সক্রিয় মিডিয়া রোল' : 'Active Rolls'}
          </span>
          <Disc className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-numeric">
          {rolls.length}
        </div>
        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block mt-0.5">
          {mountedRollsCount} {isBn ? 'মেশিনে মাউন্ট করা' : 'mounted on press'}
        </span>
      </Card>

      {/* 5. Pending Inward GRN */}
      <Card
        onClick={() => onFilterClick?.('receiving')}
        className={cn(
          'p-3.5 border-l-4 transition-all hover:shadow-xs cursor-pointer',
          pendingInwardPOs.length > 0
            ? 'border-l-blue-500 bg-blue-50/15 dark:bg-blue-950/15'
            : 'border-l-slate-300 dark:border-l-slate-700',
          activeFilter === 'receiving' && 'ring-2 ring-blue-500 shadow-xs'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {isBn ? 'পেন্ডিং ইনওয়ার্ড' : 'Pending Inward'}
          </span>
          <Truck className={cn('h-3.5 w-3.5', pendingInwardPOs.length > 0 ? 'text-blue-600' : 'text-slate-400')} />
        </div>
        <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 font-numeric">
          {pendingInwardPOs.length} {isBn ? 'অর্ডার' : 'POs'}
        </div>
        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium block mt-0.5">
          {isBn ? 'GRN রিসিভিং অপেক্ষমান' : 'Awaiting GRN receipt'}
        </span>
      </Card>

      {/* 6. Usable Remnants & Off-Cuts */}
      <Card
        onClick={() => onFilterClick?.('remnants')}
        className={cn(
          'p-3.5 border-l-4 border-l-purple-500 bg-purple-50/10 dark:bg-purple-950/10 transition-all hover:shadow-xs cursor-pointer',
          activeFilter === 'remnants' && 'ring-2 ring-purple-500 shadow-xs'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {isBn ? 'ব্যবহারযোগ্য অবশিষ্টাংশ' : 'Usable Remnants'}
          </span>
          <Scissors className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 font-numeric">
          {remnants.length}
        </div>
        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium block mt-0.5">
          {isBn ? 'সাশ্রয়ী অফ-কাট উপলব্ধ' : 'Available offcuts'}
        </span>
      </Card>
    </div>
  )
}
