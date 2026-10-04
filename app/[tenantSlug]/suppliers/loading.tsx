import React from 'react'
import { TablePageSkeleton } from '@/components/shared/table-skeleton'

export default function SuppliersLoading() {
  return <TablePageSkeleton title="Supplier & Vendor Directory" rows={8} kpiCards={4} />
}
