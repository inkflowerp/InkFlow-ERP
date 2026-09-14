'use client'

import React from 'react'
import {
  Package,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Layers,
  Clock,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'

interface StoreDashboardProps {
  metrics: {
    lowStockCount: number
    pendingRequisitionsCount: number
    todayIssuesCount: number
    todayReceivedCount: number
  }
  onRefresh: () => void
}

export function StoreDashboard({ metrics, onRefresh }: StoreDashboardProps) {
  const { tBilingual } = useI18n()

  return (
    <div className="space-y-6">
      <div className="p-5 bg-gradient-to-r from-amber-700 to-orange-800 text-white rounded-2xl shadow-md flex items-center justify-between">
        <div className="space-y-1">
          <Badge className="bg-white/20 text-white border-none text-xs font-semibold backdrop-blur-xs">
            {tBilingual('Warehouse & Raw Materials Store', 'কাঁচামাল ও গুদাম ব্যবস্থাপনা')}
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black">
            {tBilingual('Inventory Requisitions & Stock Control', 'স্টক বিলি ও কাঁচামাল স্টোর')}
          </h1>
          <p className="text-xs text-amber-100/90">
            {tBilingual('Issue materials to production floor, monitor roll remnants, and receive supplier shipments.', 'ফ্লোরে মাল বিলি করুন, অবশিষ্ট রোল ট্র্যাক করুন এবং চালান গ্রহণ করুন।')}
          </p>
        </div>
      </div>

      <KpiGrid columns={4}>
        <KpiCard
          titleEn="Pending Material Requests"
          titleBn="বিলি করার অপেক্ষায়"
          value={metrics.pendingRequisitionsCount}
          icon={Clock}
          colorVariant="warning"
          badge={tBilingual('Requisitions', 'রিকুইজিশন')}
        />
        <KpiCard
          titleEn="Low Stock Warnings"
          titleBn="কম স্টক সতর্কতা"
          value={metrics.lowStockCount}
          icon={AlertTriangle}
          colorVariant="danger"
          badge={tBilingual('Reorder Needed', 'অর্ডার প্রয়োজন')}
        />
        <KpiCard
          titleEn="Today's Material Issues"
          titleBn="আজকে ফ্লোরে মাল বিলি"
          value={metrics.todayIssuesCount}
          icon={ArrowUpRight}
          colorVariant="primary"
        />
        <KpiCard
          titleEn="Goods Received Today"
          titleBn="আজকের মাল রিসিভ"
          value={metrics.todayReceivedCount}
          icon={ArrowDownLeft}
          colorVariant="success"
        />
      </KpiGrid>
    </div>
  )
}
