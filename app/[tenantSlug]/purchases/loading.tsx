import React from 'react'
import { TablePageSkeleton } from '@/components/shared/table-skeleton'

export default function PurchasesLoading() {
  return <TablePageSkeleton title="Purchase Orders & Procurement" rows={7} kpiCards={4} />
}
