import React from 'react'
import { TablePageSkeleton } from '@/components/shared/table-skeleton'

export default function DeliveryLoading() {
  return <TablePageSkeleton title="Delivery Challans & Logistics" rows={7} kpiCards={4} />
}
