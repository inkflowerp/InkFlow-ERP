'use client'

import React from 'react'
import {
  DollarSign,
  AlertOctagon,
  Disc,
  Truck,
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

  const totalShortagesCount = outOfStockMaterials.length + lowStockMaterials.length

  return (
    <KpiGrid columns={4}>
      {/* 1. Total Valuation */}
      <KpiCard
        titleEn="Total Stock Value"
        titleBn="মোট স্টক মূল্য"
        value={displayTotalValue}
        isCurrency
        icon={DollarSign}
        colorVariant="emerald"
        subtitleEn={`${materials.length} Materials • ${readyProducts.length} Products`}
        subtitleBn={`${materials.length} কাঁচামাল • ${readyProducts.length} ফিনিশড`}
        selected={activeFilter === 'all'}
        onClick={() => onFilterClick?.('all')}
      />

      {/* 2. Critical Shortages (Out of Stock & Below Reorder) */}
      <KpiCard
        titleEn="Critical Shortages"
        titleBn="স্টক ঘাটতি ও সতর্কতা"
        value={totalShortagesCount}
        icon={AlertOctagon}
        colorVariant={outOfStockMaterials.length > 0 ? 'danger' : lowStockMaterials.length > 0 ? 'amber' : 'slate'}
        subtitleEn={`${outOfStockMaterials.length} Depleted • ${lowStockMaterials.length} Low Reorder`}
        subtitleBn={`${outOfStockMaterials.length}টি শূন্য • ${lowStockMaterials.length}টি রি-অর্ডার সতর্কতা`}
        selected={activeFilter === 'shortages' || activeFilter === 'low_stock' || activeFilter === 'out_of_stock'}
        onClick={() => onFilterClick?.('shortages')}
      />

      {/* 3. Active Media Rolls */}
      <KpiCard
        titleEn="Active Media Rolls"
        titleBn="সক্রিয় মিডিয়া রোল"
        value={rolls.length}
        icon={Disc}
        colorVariant="indigo"
        subtitleEn={`${mountedRollsCount} mounted on press • ${remnants.length} off-cuts`}
        subtitleBn={`${mountedRollsCount}টি মেশিনে মাউন্ট • ${remnants.length}টি অফ-কাট`}
        selected={activeFilter === 'rolls'}
        onClick={() => onFilterClick?.('rolls')}
      />

      {/* 4. Pending Inward GRN */}
      <KpiCard
        titleEn="Pending Inward GRN"
        titleBn="পেন্ডিং ইনওয়ার্ড POs"
        value={pendingInwardPOs.length}
        unitEn="POs"
        unitBn="অর্ডার"
        icon={Truck}
        colorVariant={pendingInwardPOs.length > 0 ? 'blue' : 'slate'}
        subtitleEn="Awaiting dock receipt & QC"
        subtitleBn="GRN রিসিভিং অপেক্ষমান"
        selected={activeFilter === 'receiving'}
        onClick={() => onFilterClick?.('receiving')}
      />
    </KpiGrid>
  )
}
