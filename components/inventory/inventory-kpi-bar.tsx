'use client'

import React from 'react'
import {
  DollarSign,
  AlertTriangle,
  AlertOctagon,
  Disc,
  Truck,
  Scissors,
} from 'lucide-react'
import { getMaterialWarehouseStockBreakdown } from '@/lib/units'
import type { InventorySummaryStats, MaterialRecord, InventoryRollRecord, InventoryRemnantRecord } from '@/types/inventory.types'
import type { ProductRecord } from '@/types/product.types'
import type { PurchaseOrderRecord } from '@/types/purchase.types'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'

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
    <KpiGrid columns={6}>
      {/* 1. Total Valuation */}
      <KpiCard
        titleEn="Total Stock Value"
        titleBn="মোট স্টক মূল্য"
        value={displayTotalValue}
        isCurrency
        icon={DollarSign}
        colorVariant="emerald"
        subtitleEn={`${materials.length} Materials • ${readyProducts.length} Products`}
        subtitleBn={`${materials.length} কাঁচামাল • ${readyProducts.length} প্রোডাক্ট`}
        selected={activeFilter === 'all'}
        onClick={() => onFilterClick?.('all')}
      />

      {/* 2. Low Stock Warning */}
      <KpiCard
        titleEn="Low Stock Warning"
        titleBn="রি-অর্ডার সতর্কতা"
        value={lowStockMaterials.length}
        icon={AlertTriangle}
        colorVariant={lowStockMaterials.length > 0 ? 'amber' : 'slate'}
        subtitleEn="Below reorder point"
        subtitleBn="রি-অর্ডার লেভেলের নিচে"
        selected={activeFilter === 'low_stock'}
        onClick={() => onFilterClick?.('low_stock')}
      />

      {/* 3. Out of Stock */}
      <KpiCard
        titleEn="Out of Stock"
        titleBn="স্টক শূন্য (শূন্য মজুদ)"
        value={outOfStockMaterials.length}
        icon={AlertOctagon}
        colorVariant={outOfStockMaterials.length > 0 ? 'danger' : 'slate'}
        subtitleEn="Zero warehouse stock"
        subtitleBn="স্টক নিঃশেষ"
        selected={activeFilter === 'out_of_stock'}
        onClick={() => onFilterClick?.('out_of_stock')}
      />

      {/* 4. Active Rolls */}
      <KpiCard
        titleEn="Active Rolls"
        titleBn="সক্রিয় মিডিয়া রোল"
        value={rolls.length}
        icon={Disc}
        colorVariant="indigo"
        subtitleEn={`${mountedRollsCount} mounted on press`}
        subtitleBn={`${mountedRollsCount}টি মেশিনে মাউন্ট করা`}
        selected={activeFilter === 'rolls'}
        onClick={() => onFilterClick?.('rolls')}
      />

      {/* 5. Pending Inward GRN */}
      <KpiCard
        titleEn="Pending Inward"
        titleBn="পেন্ডিং ইনওয়ার্ড"
        value={pendingInwardPOs.length}
        unitEn="POs"
        unitBn="অর্ডার"
        icon={Truck}
        colorVariant={pendingInwardPOs.length > 0 ? 'blue' : 'slate'}
        subtitleEn="Awaiting GRN receipt"
        subtitleBn="GRN রিসিভিং অপেক্ষমান"
        selected={activeFilter === 'receiving'}
        onClick={() => onFilterClick?.('receiving')}
      />

      {/* 6. Usable Remnants & Off-Cuts */}
      <KpiCard
        titleEn="Usable Remnants"
        titleBn="ব্যবহারযোগ্য অবশিষ্টাংশ"
        value={remnants.length}
        icon={Scissors}
        colorVariant="purple"
        subtitleEn="Available offcuts"
        subtitleBn="সাশ্রয়ী অফ-কাট উপলব্ধ"
        selected={activeFilter === 'remnants'}
        onClick={() => onFilterClick?.('remnants')}
      />
    </KpiGrid>
  )
}
