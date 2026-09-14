'use client'

import React from 'react'
import {
  Plus,
  FileSpreadsheet,
  Receipt,
  Users,
  Clock,
  CheckCircle2,
  DollarSign,
  Phone,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import { TodaysWorkFeed } from '@/components/dashboard/todays-work-feed'
import { ProductionTaskRecord } from '@/types/production.types'
import { formatBDT } from '@/lib/formatters'

interface SalesDashboardProps {
  metrics: {
    pendingQuotations: number
    unpaidInvoicesCount: number
    unpaidDuesTotal: number
    todaySales: number
    customerFollowupsCount: number
  }
  tasks: ProductionTaskRecord[]
  onOpenNewWork: () => void
  onOpenPaymentModal: () => void
  onRefresh: () => void
}

export function SalesDashboard({
  metrics,
  tasks,
  onOpenNewWork,
  onOpenPaymentModal,
  onRefresh,
}: SalesDashboardProps) {
  const { tBilingual } = useI18n()

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-600 to-cyan-700 text-white rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <Badge className="bg-white/20 text-white border-none text-xs font-semibold backdrop-blur-xs">
            {tBilingual('Sales & Counter Desk', 'সেলস ও কাউন্টার ডেস্ক')}
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black">
            {tBilingual('Commercial Sales Command Center', 'সেলস ও বুকিং সেন্টার')}
          </h1>
          <p className="text-xs text-blue-100/90">
            {tBilingual('Fast job order booking, customer quotations, dues follow-up, and billing.', 'দ্রুত কাজের বুকিং, কোটেশন, কাস্টমার বাকি টাকা আদায় এবং বিলিং।')}
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          onClick={onOpenNewWork}
          className="bg-white text-blue-900 hover:bg-blue-50 text-sm font-black h-12 px-8 shadow-lg"
        >
          <Plus className="h-5 w-5 mr-1.5 stroke-[3]" />
          {tBilingual('New Work', 'নতুন কাজ')}
        </Button>
      </div>

      {/* KPI Cards */}
      <KpiGrid columns={4}>
        <KpiCard
          titleEn="Today's Billed Sales"
          titleBn="আজকের বিক্রয়"
          value={metrics.todaySales}
          isCurrency={true}
          icon={TrendingUp}
          colorVariant="primary"
        />
        <KpiCard
          titleEn="Quotations Awaiting Approval"
          titleBn="দরপ্রস্তাব / কোটেশন"
          value={metrics.pendingQuotations}
          icon={FileSpreadsheet}
          colorVariant="warning"
          badge={tBilingual('Pending', 'অপেক্ষমাণ')}
        />
        <KpiCard
          titleEn="Unpaid Invoices (বাকি বিল)"
          titleBn="বাকি ইনভয়েস"
          value={metrics.unpaidInvoicesCount}
          icon={Receipt}
          colorVariant="danger"
          badge={formatBDT(metrics.unpaidDuesTotal)}
        />
        <KpiCard
          titleEn="Follow-ups & Contacts"
          titleBn="কাস্টমার ফলোআপ"
          value={metrics.customerFollowupsCount}
          icon={Users}
          colorVariant="purple"
        />
      </KpiGrid>

      {/* Actionable Today's Work Feed */}
      <TodaysWorkFeed tasks={tasks} onRefresh={onRefresh} onOpenNewWork={onOpenNewWork} />
    </div>
  )
}
