'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { useI18n } from '@/i18n/context'
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Package,
  ExternalLink,
  MessageSquare,
  Printer,
  Sparkles,
  Scissors,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductionTaskRecord, UnifiedProductionJob } from '@/types/production.types'
import { ProductionJobCard } from './production-job-card'
import { isReadyProduct, isOutsourceProduct } from '@/lib/units'

export interface ProductionInvoiceGroup {
  invoiceId: string
  invoiceNumber: string
  customerName: string
  customerPhone?: string | null
  jobs: UnifiedProductionJob[]
  allInvoiceItems?: any[]
}

export interface ProductionInvoiceGroupCardProps {
  group: ProductionInvoiceGroup
  activeTab?: string
  onStartTask?: (task: ProductionTaskRecord) => void
  onPauseTask?: (task: ProductionTaskRecord) => void
  onCompleteTask?: (task: ProductionTaskRecord) => void
  onHoldTask?: (task: ProductionTaskRecord) => void
  onResumeTask?: (task: ProductionTaskRecord) => void
  onScheduleTask?: (task: ProductionTaskRecord) => void
  onReworkTask?: (task: ProductionTaskRecord) => void
  onPrintTicket?: (task: ProductionTaskRecord) => void
  onSendWhatsApp?: (task: ProductionTaskRecord) => void
}

export const ProductionInvoiceGroupCard = React.memo(function ProductionInvoiceGroupCard({
  group,
  activeTab,
  onStartTask,
  onPauseTask,
  onCompleteTask,
  onHoldTask,
  onResumeTask,
  onScheduleTask,
  onReworkTask,
  onPrintTicket,
  onSendWhatsApp,
}: ProductionInvoiceGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const pathname = usePathname() || ''
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'
  const tenantSlug = company?.slug || 'my-company'

  const { invoiceId, invoiceNumber, customerName, customerPhone, jobs, allInvoiceItems } = group
  const invoiceHref = getTenantNavHref(`/billing/${invoiceId || invoiceNumber}`, pathname, tenantSlug)

  // Extract all items from invoice or fallback to the jobs' data
  const rawItems: any[] =
    allInvoiceItems && allInvoiceItems.length > 0
      ? allInvoiceItems
      : (jobs[0]?.allInvoiceItems && jobs[0].allInvoiceItems.length > 0 ? jobs[0].allInvoiceItems : [])

  const readyProductItems = rawItems.filter(
    (it) =>
      it.item_kind === 'ready_product' ||
      it.workflow_routing === 'ready_product' ||
      isReadyProduct(it)
  )

  const outsourceItems = rawItems.filter(
    (it) =>
      it.item_kind === 'outsource' ||
      it.workflow_routing === 'outsource' ||
      isOutsourceProduct(it)
  )

  const firstActiveTask = jobs[0]?.activeTask || jobs[0]?.tasks[0]

  return (
    <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-b from-blue-50/30 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 shadow-xs overflow-hidden mb-4">
      {/* Group Header */}
      <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={invoiceHref}
                className="font-mono text-sm font-bold text-slate-950 dark:text-blue-200 hover:underline inline-flex items-center gap-1"
              >
                <span>Invoice #{invoiceNumber}</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Link>
              <span className="bg-blue-200/80 dark:bg-blue-900/70 text-blue-900 dark:text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {jobs.length} {isBn ? 'প্রোডাকশন কাজ' : 'Production Job(s)'}
              </span>
              {readyProductItems.length > 0 && (
                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span>{readyProductItems.length} {isBn ? 'রেডি প্রোডাক্ট' : 'Ready Product'}</span>
                </span>
              )}
              {outsourceItems.length > 0 && (
                <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {outsourceItems.length} {isBn ? 'আউটসোর্স' : 'Outsource'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              <span className="font-semibold text-slate-900 dark:text-white">{customerName}</span>
              {customerPhone && (
                <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                  • {customerPhone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Right: Collapse & WhatsApp */}
        <div className="flex items-center gap-2">
          {firstActiveTask && onSendWhatsApp && customerPhone && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onSendWhatsApp(firstActiveTask)}
              className="text-xs h-8 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl gap-1.5 cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden sm:inline">WhatsApp Floor Update</span>
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-xs h-8 px-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl cursor-pointer"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Content: List of Single Job Cards */}
      {isExpanded && (
        <div className="p-3.5 space-y-3 bg-slate-50/40 dark:bg-slate-950/20">
          {jobs.map((job) => (
            <ProductionJobCard
              key={job.id}
              job={job}
              activeTab={activeTab}
              onStartTask={onStartTask}
              onPauseTask={onPauseTask}
              onCompleteTask={onCompleteTask}
              onHoldTask={onHoldTask}
              onResumeTask={onResumeTask}
              onScheduleTask={onScheduleTask}
              onReworkTask={onReworkTask}
              onPrintTicket={onPrintTicket}
              onSendWhatsApp={onSendWhatsApp}
            />
          ))}
        </div>
      )}
    </div>
  )
})
