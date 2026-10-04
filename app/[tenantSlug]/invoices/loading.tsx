import React from 'react'
import { TablePageSkeleton } from '@/components/shared/table-skeleton'

export default function InvoicesLoading() {
  return <TablePageSkeleton title="Invoices & Collections" rows={7} kpiCards={4} />
}
