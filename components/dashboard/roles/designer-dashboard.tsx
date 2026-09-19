'use client'

import React from 'react'
import {
  Palette,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Download,
  Share2,
  Sparkles,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import { ProductionTaskRecord } from '@/types/production.types'

interface DesignerDashboardProps {
  tasks: ProductionTaskRecord[]
  onRefresh: () => void
}

export function DesignerDashboard({ tasks, onRefresh }: DesignerDashboardProps) {
  const { tBilingual } = useI18n()

  const safeTasks = Array.isArray(tasks) ? tasks : []
  const designTasks = safeTasks.filter((t) => ((t as any).stage_name || t.department)?.toLowerCase().includes('design') || t.task_name?.toLowerCase().includes('design'))
  const pendingApproval = designTasks.filter((t) => t.status === 'paused' || t.hold_reason === 'customer_approval')
  const approvedReady = designTasks.filter((t) => t.status === 'completed' || (t.status as any) === 'ready')

  return (
    <div className="space-y-6">
      <div className="p-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 text-white rounded-2xl shadow-md">
        <Badge className="bg-white/20 text-white border-none text-xs font-semibold backdrop-blur-xs">
          {tBilingual('Pre-Press & Creative Studio', 'ডিজাইন ও প্রি-প্রেস স্টুডিও')}
        </Badge>
        <h1 className="text-xl sm:text-2xl font-black mt-1">
          {tBilingual('My Design Queue & Proofing', 'আমার ডিজাইন কিউ ও প্রুফিং')}
        </h1>
        <p className="text-xs text-purple-100/90 mt-0.5">
          {tBilingual('Artwork revisions, client proofs, prepress separations, and machine releases.', 'ক্লায়েন্ট প্রুফিং, ডিজাইন সংশোধন এবং প্রেসে ফাইল ছাড়ার ব্যবস্থা।')}
        </p>
      </div>

      <KpiGrid columns={3}>
        <KpiCard
          titleEn="Active Design Tasks"
          titleBn="চলমান ডিজাইন কাজ"
          value={designTasks.length}
          icon={Palette}
          colorVariant="purple"
        />
        <KpiCard
          titleEn="Awaiting Client Approval"
          titleBn="কাস্টমার অনুমোদনের অপেক্ষায়"
          value={pendingApproval.length}
          icon={Clock}
          colorVariant="warning"
        />
        <KpiCard
          titleEn="Approved for Print Release"
          titleBn="প্রিন্টের জন্য ছাড়প্রাপ্ত"
          value={approvedReady.length}
          icon={FileCheck}
          colorVariant="success"
        />
      </KpiGrid>

      {/* Design Tasks List */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Palette className="h-4 w-4 text-purple-600" />
          <span>{tBilingual('Design Work Order Queue', 'ডিজাইন কাজের তালিকা')}</span>
        </h2>

        {designTasks.length === 0 ? (
          <Card className="border border-dashed p-8 text-center text-xs text-slate-500">
            {tBilingual('No pending design tasks right now. Great job!', 'বর্তমানে কোনো ডিজাইন কাজ বাকি নেই।')}
          </Card>
        ) : (
          designTasks.map((t) => (
            <Card key={t.id} className="border border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono font-bold">#{t.job_number || t.task_number}</Badge>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.task_name}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Customer: {t.customer_name} • Qty: {t.quantity} {t.unit}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="text-xs">
                    <Share2 className="h-3.5 w-3.5 mr-1" /> WhatsApp Proof
                  </Button>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold">
                    <FileCheck className="h-3.5 w-3.5 mr-1" /> Approve Design
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
