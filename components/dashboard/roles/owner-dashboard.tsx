'use client'

import React from 'react'
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Package,
  Truck,
  Printer,
  Users,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  Receipt,
  Building,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import { TodaysWorkFeed } from '@/components/dashboard/todays-work-feed'
import { ProductionTaskRecord } from '@/types/production.types'
import { formatBDT } from '@/lib/formatters'

interface OwnerDashboardProps {
  metrics: {
    todaySales: number
    todayCollection: number
    totalReceivableDue: number
    activeProductionCount: number
    readyDeliveriesCount: number
    profitMarginPercent: number
    lowStockCount: number
    branchCount?: number
  }
  tasks: ProductionTaskRecord[]
  onOpenNewWork: () => void
  onOpenPaymentModal: () => void
  onRefresh: () => void
}

export function OwnerDashboard({
  metrics,
  tasks,
  onOpenNewWork,
  onOpenPaymentModal,
  onRefresh,
}: OwnerDashboardProps) {
  const { tBilingual } = useI18n()

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white rounded-2xl shadow-md">
        <div className="space-y-1">
          <Badge className="bg-white/20 text-white border-none text-xs font-semibold backdrop-blur-xs">
            {tBilingual('Business Executive Hub', 'ব্যবসা ও মালিকের ড্যাশবোর্ড')}
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {tBilingual("Today's Business Overview", 'আজকের ব্যবসার সারসংক্ষেপ')}
          </h1>
          <p className="text-xs text-blue-100/90">
            {tBilingual('Real-time revenue, collections, outstanding dues, and floor operations.', 'লাইভ বিক্রয়, কালেকশন, বাকি টাকা এবং প্রোডাকশন মনিটরিং।')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            onClick={onOpenPaymentModal}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold h-11 px-4 shadow-xs"
          >
            <DollarSign className="h-4 w-4 mr-1.5" />
            {tBilingual('Record Collection', 'পেমেন্ট নিন')}
          </Button>

          <Button
            type="button"
            onClick={onOpenNewWork}
            className="bg-white text-blue-900 hover:bg-blue-50 text-xs font-black h-11 px-6 shadow-lg"
          >
            <Plus className="h-4 w-4 mr-1.5 stroke-[3]" />
            {tBilingual('New Work', 'নতুন কাজ')}
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <KpiGrid columns={4}>
        <KpiCard
          titleEn="Today's Sales"
          titleBn="আজকের বিক্রয়"
          value={metrics.todaySales}
          isCurrency={true}
          icon={TrendingUp}
          colorVariant="primary"
          badge="Live"
        />
        <KpiCard
          titleEn="Today's Collection"
          titleBn="আজকের কালেকশন"
          value={metrics.todayCollection}
          isCurrency={true}
          icon={DollarSign}
          colorVariant="success"
        />
        <KpiCard
          titleEn="Receivable Due (বাকি টাকা)"
          titleBn="মোট বাকি টাকা"
          value={metrics.totalReceivableDue}
          isCurrency={true}
          icon={Receipt}
          colorVariant={metrics.totalReceivableDue > 0 ? 'danger' : 'success'}
        />
        <KpiCard
          titleEn="Active Production"
          titleBn="চলমান প্রোডাকশন"
          value={metrics.activeProductionCount}
          icon={Printer}
          colorVariant="warning"
          badge={tBilingual('On Floor', 'ফ্লোরে')}
        />
      </KpiGrid>

      {/* Secondary Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-slate-500">{tBilingual('Ready for Delivery', 'ডেলিভারি প্রস্তুত')}</span>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{metrics.readyDeliveriesCount}</div>
          </div>
          <Truck className="h-6 w-6 text-blue-600" />
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-slate-500">{tBilingual('Gross Margin', 'লাভের মার্জিন')}</span>
            <div className="text-lg font-bold text-emerald-600 font-mono">{metrics.profitMarginPercent}%</div>
          </div>
          <TrendingUp className="h-6 w-6 text-emerald-600" />
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-slate-500">{tBilingual('Low Stock Items', 'কম স্টক সতর্কতা')}</span>
            <div className="text-lg font-bold text-rose-600 font-mono">{metrics.lowStockCount}</div>
          </div>
          <AlertTriangle className="h-6 w-6 text-rose-600" />
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-slate-500">{tBilingual('Active Branches', 'চালু ব্রাঞ্চ')}</span>
            <div className="text-lg font-bold text-indigo-600 font-mono">{metrics.branchCount || 1}</div>
          </div>
          <Building className="h-6 w-6 text-indigo-600" />
        </div>
      </div>

      {/* Actionable Today's Work Feed */}
      <TodaysWorkFeed tasks={tasks} onRefresh={onRefresh} onOpenNewWork={onOpenNewWork} />
    </div>
  )
}
