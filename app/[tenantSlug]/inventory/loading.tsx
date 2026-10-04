import React from 'react'
import { TablePageSkeleton } from '@/components/shared/table-skeleton'

export default function InventoryLoading() {
  return <TablePageSkeleton title="Inventory & Raw Materials" rows={7} kpiCards={4} />
}
