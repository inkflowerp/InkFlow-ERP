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
 onSendToFinishing?: (job: UnifiedProductionJob) => void
 onSendToDelivery?: (job: UnifiedProductionJob) => void
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
 onSendToFinishing,
 onSendToDelivery,
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
    <div className="rounded-xl border border-primary/20 border-border/60 via-white to-white dark: dark: dark: shadow-xs overflow-hidden mb-4">
      {/* Group Header */}
      <div className="p-3.5 bg-primary/10/70 bg-primary/10 border-b border-border border-border/40 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <FileText className="h-4 w-4"/>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
 href={invoiceHref}
 className="tabular-nums text-sm font-bold text-foreground text-primary hover:underline inline-flex items-center gap-1">
                <span>Invoice #{invoiceNumber}</span>
                <ExternalLink className="h-3 w-3 opacity-60"/>
              </Link>
              <span className="bg-primary/80 bg-primary/70 text-primary text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                {jobs.length} {isBn ? 'প্রোডাকশন কাজ' : 'Production Job(s)'}
              </span>
              {readyProductItems.length > 0 && (
                <span className="bg-success-surface bg-success-surface/60 text-success text-success border border-success-border border-success-border text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Package className="h-3 w-3"/>
                  <span>{readyProductItems.length} {isBn ? 'রেডি প্রোডাক্ট' : 'Ready Product'}</span>
                </span>
              )}
              {outsourceItems.length > 0 && (
                <span className="bg-primary/10 bg-primary/10 text-primary text-primary border border-primary/20 border-border text-xs font-bold px-2 py-0.5 rounded-full">
                  {outsourceItems.length} {isBn ? 'আউটসোর্স' : 'Outsource'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="font-semibold text-foreground">{customerName}</span>
              {customerPhone && (
                <span className="text-xs tabular-nums text-success text-success">
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
 type="button"size="sm"variant="outline"onClick={() => onSendWhatsApp(firstActiveTask)}
 className="text-xs h-8 border-success-border border-success-border text-success text-success hover:bg-success-surface dark:hover:bg-success-surface rounded-xl gap-1.5 cursor-pointer">
              <MessageSquare className="h-3.5 w-3.5 text-success"/>
              <span className="hidden sm:inline">WhatsApp Floor Update</span>
            </Button>
          )}

          <Button
 type="button"size="sm"variant="ghost"onClick={() => setIsExpanded((prev) => !prev)}
 className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground dark:hover:text-foreground rounded-xl cursor-pointer">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4"/>
            ) : (
              <ChevronDown className="h-4 w-4"/>
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Content: List of Single Job Cards */}
      {isExpanded && (
        <div className="p-3.5 space-y-3 bg-muted">
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
 onSendToFinishing={onSendToFinishing}
 onSendToDelivery={onSendToDelivery}
            />
          ))}
        </div>
      )}
    </div>
  )
})
