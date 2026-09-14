'use client'

import React from 'react'
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  DollarSign,
  FileCheck,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'

interface DeliveryDashboardProps {
  metrics: {
    readyForDispatchCount: number
    outForDeliveryCount: number
    deliveredTodayCount: number
    cashCollectedCount: number
  }
  onRefresh: () => void
}

export function DeliveryDashboard({ metrics, onRefresh }: DeliveryDashboardProps) {
  const { tBilingual } = useI18n()

  return (
    <div className="space-y-6">
      <div className="p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white rounded-2xl shadow-md flex items-center justify-between">
        <div className="space-y-1">
          <Badge className="bg-white/20 text-white border-none text-xs font-semibold backdrop-blur-xs">
            {tBilingual('Logistics & Delivery Fleet', 'ডেলিভারি ও চালান ব্যবস্থাপনা')}
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black">
            {tBilingual("Today's Dispatches & Installations", 'আজকের ডেলিভারি ও চালান')}
          </h1>
          <p className="text-xs text-emerald-100/90">
            {tBilingual('Print delivery challans, capture signed receipts, and record COD balance collections.', 'চালান প্রিন্ট করুন, গ্রাহকের রিসিট নিশ্চিত করুন এবং বাকি টাকা গ্রহণ করুন।')}
          </p>
        </div>
      </div>

      <KpiGrid columns={4}>
        <KpiCard
          titleEn="Ready for Dispatch"
          titleBn="ডেলিভারি প্রস্তুত"
          value={metrics.readyForDispatchCount}
          icon={Clock}
          colorVariant="warning"
          badge={tBilingual('On Shelf', 'তৈরি আছে')}
        />
        <KpiCard
          titleEn="Out for Delivery"
          titleBn="পথে আছে"
          value={metrics.outForDeliveryCount}
          icon={Truck}
          colorVariant="primary"
        />
        <KpiCard
          titleEn="Delivered Today"
          titleBn="আজকের ডেলিভারি সম্পন্ন"
          value={metrics.deliveredTodayCount}
          icon={CheckCircle2}
          colorVariant="success"
        />
        <KpiCard
          titleEn="COD Collected"
          titleBn="নগদ আদায়"
          value={metrics.cashCollectedCount}
          icon={DollarSign}
          colorVariant="purple"
        />
      </KpiGrid>
    </div>
  )
}
