'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Printer,
  Scissors,
  Cpu,
  Layers,
  Truck,
  Palette,
  AlertTriangle,
  ArrowRight,
  User,
  Calendar,
  ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import type { JobOrderRecord } from '@/types/order.types'
import type { ChildJobWorkflowState } from '@/lib/workflow/workflow-engine'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

export interface JobCardProps {
  job: JobOrderRecord
  workflow?: ChildJobWorkflowState
  customerName?: string
  tenantSlug: string
  className?: string
  onOpenJob?: (job: JobOrderRecord) => void
}

export function JobCard({
  job,
  workflow,
  customerName,
  tenantSlug,
  className = '',
  onOpenJob,
}: JobCardProps) {
  const pathname = usePathname()
  const { tBilingual } = useI18n()

  const jobNumber = workflow?.jobNumber || job.job_number
  const title = workflow?.productName || job.product_name || job.title || 'Print Job'
  const customer = customerName || (job as any).customer_name || 'Customer'
  const department = workflow?.department || job.assigned_department || 'printing'

  const dimensions =
    workflow?.dimensions ||
    (job as any).dimensions_spec ||
    ((job as any).width && (job as any).height
      ? `${(job as any).width} × ${(job as any).height} ${(job as any).dimension_unit || 'ft'}`
      : null)

  const quantity = workflow?.quantity ?? job.quantity ?? 1
  const machine = workflow?.assignedMachine || (job as any).assigned_machine_name || '—'
  const operator = workflow?.assignedOperator || (job as any).assigned_operator_name || '—'

  const rawDueDate = workflow?.dueDate || job.deadline || (job as any).delivery_date
  let dueText = '—'
  let isDueToday = false
  let isOverdue = false

  if (rawDueDate) {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const target = new Date(rawDueDate)
      target.setHours(0, 0, 0, 0)
      if (!isNaN(target.getTime())) {
        const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) {
          dueText = 'Today'
          isDueToday = true
        } else if (diffDays === 1) {
          dueText = 'Tomorrow'
        } else if (diffDays > 1) {
          dueText = `${diffDays}d`
        } else {
          dueText = `${Math.abs(diffDays)}d overdue`
          isOverdue = true
        }
      }
    } catch {
      dueText = String(rawDueDate).split('T')[0]
    }
  }

  const currentStage = workflow?.humanStage || workflow?.stageLabelEn || 'In Production'
  const nextAction = workflow?.nextActionEn || 'Open Production'
  const isBlocked = Boolean(workflow?.isBlocked)
  const isDelivered = Boolean(workflow?.isDelivered)
  const isReady = Boolean(workflow?.isReadyForDelivery)

  // Status badge style mapping
  let stageBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200'
  if (isBlocked) {
    stageBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300'
  } else if (isDelivered) {
    stageBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'
  } else if (isReady) {
    stageBadgeClass = 'bg-teal-50 text-teal-700 border-teal-200'
  }

  // Department icon mapping
  const getDeptIcon = () => {
    const d = department.toLowerCase()
    if (d.includes('design')) return <Palette className="h-3.5 w-3.5 text-purple-600" />
    if (d.includes('finish')) return <Scissors className="h-3.5 w-3.5 text-amber-600" />
    if (d.includes('fab') || d.includes('laser') || d.includes('cnc'))
      return <Cpu className="h-3.5 w-3.5 text-indigo-600" />
    if (d.includes('delivery')) return <Truck className="h-3.5 w-3.5 text-emerald-600" />
    return <Printer className="h-3.5 w-3.5 text-blue-600" />
  }

  const jobDetailUrl = getTenantNavHref(
    `/orders/${job.sales_order_id || job.order_number}?job=${jobNumber}`,
    pathname,
    tenantSlug
  )

  return (
    <div
      className={`bg-card border rounded-xl p-4 transition-all duration-150 hover:shadow-xs flex flex-col justify-between ${
        isBlocked
          ? 'border-amber-300 bg-amber-50/20'
          : isOverdue
          ? 'border-rose-300'
          : 'border-border dark:border-border'
      } ${className}`}
    >
      <div className="space-y-3">
        {/* Top: Job # & Department */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {getDeptIcon()}
            <span className="font-mono text-xs font-bold text-foreground truncate">
              {jobNumber}
            </span>
          </div>
          <Badge variant="outline" className={`text-2xs font-semibold px-2 py-0.5 ${stageBadgeClass}`}>
            {currentStage}
          </Badge>
        </div>

        {/* Title & Customer */}
        <div>
          <h4 className="text-sm font-bold text-foreground dark:text-white line-clamp-1 leading-snug">
            {title}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{customer}</p>
        </div>

        {/* Specs & Qty */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-lg border border-border dark:border-border">
          {dimensions && (
            <span className="font-medium truncate">{dimensions}</span>
          )}
          {dimensions && <span className="text-muted-foreground">•</span>}
          <span className="font-bold tabular-nums">Qty {quantity}</span>
        </div>

        {/* CURRENT & NEXT */}
        <div className="space-y-1.5 text-xs pt-1 border-t border-border dark:border-border">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">CURRENT</span>
            <span className="font-semibold text-foreground text-right truncate">
              {currentStage}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">NEXT</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400 text-right truncate">
              {nextAction}
            </span>
          </div>
        </div>

        {/* Blocker alert if active */}
        {isBlocked && workflow?.blockedReasonEn && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg p-2.5 text-2xs space-y-1.5">
            <div className="flex items-start gap-1.5 text-amber-900 dark:text-amber-200 font-bold">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>BLOCKED: {workflow.blockedReasonEn}</span>
            </div>
            {workflow.blockerActionLabelEn && workflow.blockerActionHref && (
              <div className="pt-1">
                <Link
                  href={getTenantNavHref(workflow.blockerActionHref, pathname, tenantSlug)}
                  className="inline-flex items-center gap-1 text-2xs font-bold text-amber-800 hover:text-amber-900 underline"
                >
                  <span>[{workflow.blockerActionLabelEn}]</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Machine, Operator, Due Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center">
          <div className="bg-muted p-1.5 rounded">
            <span className="text-3xs uppercase font-bold text-muted-foreground block">MACHINE</span>
            <span className="text-xs font-semibold text-foreground truncate block">
              {machine}
            </span>
          </div>
          <div className="bg-muted p-1.5 rounded">
            <span className="text-3xs uppercase font-bold text-muted-foreground block">OPERATOR</span>
            <span className="text-xs font-semibold text-foreground truncate block">
              {operator}
            </span>
          </div>
          <div className="bg-muted p-1.5 rounded">
            <span className="text-3xs uppercase font-bold text-muted-foreground block">DUE</span>
            <span
              className={`text-xs font-bold truncate block ${
                isOverdue
                  ? 'text-rose-600'
                  : isDueToday
                  ? 'text-amber-600'
                  : 'text-foreground dark:text-foreground'
              }`}
            >
              {dueText}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Primary Action: [Open Job] */}
      <div className="pt-3 mt-3 border-t border-border dark:border-border">
        {onOpenJob ? (
          <Button
            size="sm"
            onClick={() => onOpenJob(job)}
            className="w-full h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <span>{tBilingual('Open Job', 'জব খুলুন')}</span>
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            asChild
            size="sm"
            className="w-full h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link href={jobDetailUrl}>
              <span>{tBilingual('Open Job', 'জব খুলুন')}</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
