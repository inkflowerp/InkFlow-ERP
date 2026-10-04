'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
 Phone,
 Calendar,
 ChevronDown,
 ChevronRight,
 ChevronUp,
 FileText,
 Play,
 Check,
 Send,
  Upload,
 MoreVertical,
 ExternalLink,
 MessageSquare,
 Eye,
 Sliders,
 Sparkles,
 Layers,
 AlertCircle,
 Clock,
 CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DesignJobRecord } from '@/types/design.types'
import { type PreflightState, resolveDesignJobSpecs } from './types'
import { useI18n } from '@/i18n/context'
import { DesignTimerBadge } from './design-timer-badge'

export interface InvoiceGroup {
 invoiceId: string
 invoiceNumber: string
 customerName: string
 customerPhone?: string | null
 invoiceDate?: string | null
 jobs: DesignJobRecord[]
 allInvoiceItems?: any[]
 overallStatus?: string
 completedCount?: number
 dueText?: string | null
 leftBorderColor?: string
}

interface DesignInvoiceGroupCardProps {
 group: InvoiceGroup
 activeTab: string
 getPreflightStatus: (jobId: string, status?: string) => PreflightState
 onTogglePreflight: (jobId: string, key: keyof PreflightState, designNumber?: string) => void
 onOpenWhatsApp: (job: DesignJobRecord, tpl?: 'proof' | 'reminder' | 'production' | 'revision') => void
 onOpenLightbox: (job: DesignJobRecord, versionIndex?: number) => void
 onOpenCompare: (job: DesignJobRecord) => void
 onOpenPreflightModal: (job: DesignJobRecord) => void
 onStartDesign: (job: DesignJobRecord) => void
 onCompleteDesign: (job: DesignJobRecord) => void
 onConfirmToProduction: (job: DesignJobRecord) => void
 onPauseProduction?: (job: DesignJobRecord) => void
 onResumeProduction?: (job: DesignJobRecord) => void
 onRequestRevision: (job: DesignJobRecord) => void
  onUploadVersion?: (job: DesignJobRecord) => void
}

function getDesignerInitials(name?: string): string {
 if (!name) return 'DS'
 const trimmed = name.trim()
 const lower = trimmed.toLowerCase()
 if (lower === 'rahim') return 'R'
 if (lower === 'shamol') return 'SH'
 if (lower === 'sadia') return 'SA'
 const parts = trimmed.split(/\s+/)
 if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
 return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function renderStatusBadge(status?: string) {
 switch (status) {
 case 'received':
 case 'new':
 return (
        <Badge
 variant="outline"className="bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary font-semibold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"/>
          <span>New</span>
        </Badge>
      )
 case 'designing':
 case 'in_progress':
 return (
        <Badge
 variant="outline"className="bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary font-semibold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"/>
          <span>Designing</span>
        </Badge>
      )
 case 'customer_approval':
 case 'waiting_approval':
 return (
        <Badge
 variant="outline"className="bg-warning-surface text-warning border-warning-border bg-warning-surface/80 text-warning font-semibold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block"/>
          <span>Waiting Approval</span>
        </Badge>
      )
 case 'revision':
 return (
        <Badge
 variant="outline"className="bg-danger-surface text-destructive border-danger-border bg-danger-surface/80 text-destructive font-semibold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block"/>
          <span>Revision Required</span>
        </Badge>
      )
 case 'approved':
 return (
        <Badge
 variant="outline"className="bg-success-surface text-success border-success-border bg-success-surface/80 text-success font-semibold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block"/>
          <span>Approved</span>
        </Badge>
      )
 default:
 return (
        <Badge
 variant="outline"className="bg-muted text-foreground border-border font-semibold px-2.5 py-0.5 rounded-full text-xs">
          {status || 'Unknown'}
        </Badge>
      )
  }
}

export const DesignInvoiceGroupCard = React.memo(function DesignInvoiceGroupCard({
 group,
 activeTab,
 getPreflightStatus,
 onTogglePreflight,
 onOpenWhatsApp,
 onOpenLightbox,
 onOpenCompare,
 onOpenPreflightModal,
 onStartDesign,
 onCompleteDesign,
 onConfirmToProduction,
 onPauseProduction,
 onResumeProduction,
 onRequestRevision,
  onUploadVersion,
}: DesignInvoiceGroupCardProps) {
 const [isExpanded, setIsExpanded] = useState(true)
 const [activeMenuJobId, setActiveMenuJobId] = useState<string | null>(null)
 const pathname = usePathname() || ''
 const { company } = useTenant()
 const tenantSlug = company?.slug || 'my-company'

 const { invoiceId, invoiceNumber, customerName, customerPhone, invoiceDate, jobs } = group
 const invoiceHref = getTenantNavHref(`/billing/${invoiceId || invoiceNumber}`, pathname, tenantSlug)

 const { tBilingual } = useI18n()
 const isSingleJob = jobs.length === 1
 const singleJob = isSingleJob ? jobs[0] : null
 const singleJobSpecs = singleJob ? resolveDesignJobSpecs(singleJob, group.allInvoiceItems, tBilingual) : null

  // Calculate completed count for multi-job invoices
 const completedJobsCount =
 group.completedCount !== undefined
      ? group.completedCount
      : jobs.filter((j) => j.status === 'approved').length
 const totalJobsCount = jobs.length
 const progressPercent = totalJobsCount > 0 ? Math.round((completedJobsCount / totalJobsCount) * 100) : 0

  // Determine overall status for multi-job card header
 const overallStatus = React.useMemo(() => {
 if (group.overallStatus) return group.overallStatus
 if (jobs.some((j) => j.status === 'revision')) return 'revision'
 if (jobs.some((j) => j.status === 'customer_approval')) return 'customer_approval'
 if (jobs.some((j) => j.status === 'designing' || j.status === 'in_progress')) return 'designing'
 if (jobs.every((j) => j.status === 'approved')) return 'approved'
 return 'received'
  }, [group.overallStatus, jobs])

  // Determine left border color accent
 const leftBorderClass = React.useMemo(() => {
 if (group.leftBorderColor) return group.leftBorderColor
 const sStatus: string = singleJob?.status || ''
 if (isSingleJob && sStatus === 'revision') return 'border-l-4 border-l-rose-500'
 if (isSingleJob && sStatus === 'approved') return 'border-l-4 border-l-indigo-600'
 if (isSingleJob && (sStatus === 'received' || sStatus === 'new')) return 'border-l-4 border-l-indigo-600'
 if (isSingleJob && (sStatus === 'designing' || sStatus === 'in_progress')) return 'border-l-4 border-l-indigo-600'
 return 'border-l-4 border-l-blue-600'
  }, [group.leftBorderColor, isSingleJob, singleJob?.status])

  // Formatting date display
 const primaryJob = jobs[0]
 const displayDueDate = primaryJob?.deadline
    ? (primaryJob.deadline.includes('T') || primaryJob.deadline.includes('-')
        ? new Date(primaryJob.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : primaryJob.deadline)
    : '—'
 const isDueToday = primaryJob?.deadline ? new Date(primaryJob.deadline).toDateString() === new Date().toDateString() : false
 const dueText = group.dueText !== undefined ? group.dueText : (isDueToday ? 'Today' : null)

 return (
    <div
 className={cn(
        'rounded-xl border border-border /90 bg-card shadow-2xs hover:shadow-xs transition-all relative overflow-hidden',
 leftBorderClass
      )}
    >
      {/* =========================================================================
 CASE A: SINGLE-JOB INVOICE CARD
         ========================================================================= */}
      {isSingleJob && singleJob ? (
        <div>
          {/* Main Row */}
          <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left Column: Chevron, Icon, Invoice & Customer */}
            <div className="flex items-center gap-3 shrink-0">
              <button
 type="button"onClick={() => setIsExpanded(!isExpanded)}
 className="text-primary hover:text-primary transition-colors cursor-pointer p-1 -ml-1 rounded-md hover:bg-muted dark:hover:bg-muted"title={isExpanded ? 'Collapse Specifications' : 'Expand Specifications'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-primary"/>
                ) : (
                  <ChevronRight className="w-5 h-5 text-primary"/>
                )}
              </button>

              <div className="w-10 h-10 rounded-xl bg-primary/10 bg-primary/10 text-primary text-primary flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5"/>
              </div>

              <div className="min-w-0">
                <Link
 href={invoiceHref}
 className="tabular-nums text-sm font-bold text-foreground hover:text-primary dark:hover:text-primary transition-colors flex items-center gap-1.5 whitespace-nowrap">
                  <span>{invoiceNumber}</span>
                </Link>
                <div className="font-bold text-xs text-foreground truncate mt-0.5 max-w-[170px]"title={customerName}>
                  {customerName}
                </div>
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                  {customerPhone && (
                    <span className="flex items-center gap-1 tabular-nums">
                      <Phone className="w-3 h-3 text-muted-foreground"/>
                      {customerPhone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted-foreground"/>
                    {invoiceDate || '—'}
                  </span>
                </div>
              </div>

              <Badge
 variant="outline"className="ml-2 bg-muted text-foreground font-bold text-xs px-2.5 py-0.5 rounded-full border-none whitespace-nowrap shrink-0">
                1 Job
              </Badge>
            </div>

            {/* Middle Column: Product Title & Specs */}
            <div className="flex-1 lg:px-4 min-w-0">
              <div className="font-bold text-sm text-foreground truncate">
                {singleJobSpecs?.serviceName || singleJob.title || singleJob.product_name || 'Design Product'}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-1 tabular-nums">
                <span className="inline-flex items-center gap-1 text-foreground font-semibold whitespace-nowrap"title={singleJobSpecs?.material}>
                  <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0"/>
                  <span className="truncate max-w-[220px]">{singleJobSpecs?.material}</span>
                </span>
                <span className="text-muted-foreground select-none">·</span>
                <span className="text-foreground font-semibold whitespace-nowrap">
                  {singleJobSpecs?.size}
                </span>
                <span className="text-muted-foreground select-none">·</span>
                <span className="text-foreground font-semibold whitespace-nowrap">
                  {singleJobSpecs?.quantity}
                </span>
                {singleJobSpecs?.finishing && singleJobSpecs.finishing !== 'None' && (
                  <>
                    <span className="text-muted-foreground select-none">·</span>
                    <span className="text-warning text-warning font-semibold whitespace-nowrap truncate max-w-[150px]"title={singleJobSpecs?.finishing}>
                      ✨ {singleJobSpecs.finishing}
                    </span>
                  </>
                )}
                {singleJobSpecs?.addOn && singleJobSpecs.addOn !== 'None' && (
                  <>
                    <span className="text-muted-foreground select-none">·</span>
                    <span className="text-primary text-primary font-semibold whitespace-nowrap truncate max-w-[150px]"title={singleJobSpecs?.addOn}>
                      ➕ {singleJobSpecs.addOn}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Status & Due Date */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right whitespace-nowrap">
                <div className="flex justify-end">{renderStatusBadge(singleJob.status)}</div>
                <div className="flex items-center justify-end gap-1 text-xs text-foreground mt-1 tabular-nums whitespace-nowrap">
                  <Calendar className="w-3 h-3 text-muted-foreground"/>
                  <span>{displayDueDate}</span>
                </div>
                {dueText ? (
                  <div className="text-xs font-bold text-destructive text-destructive text-right whitespace-nowrap">
                    {dueText}
                  </div>
                ) : null}
              </div>

              {/* Dynamic Progressive Workflow Action Button & Timer */}
              <div className="flex items-center gap-2 relative">
                {singleJob.status === 'approved' || (singleJob.status as string) === 'sent_to_production' || (singleJob.status as string) === 'completed' ? (
                  <>
                    <DesignTimerBadge
 startedAt={singleJob.started_at}
 completedAt={singleJob.completed_at}
 durationSeconds={singleJob.duration_seconds}
 isRunning={false}
                    />
                    <Button
 size="sm"disabled
 className="h-8 px-3.5 text-xs bg-success/15 text-success text-success border border-success-border/30 font-semibold rounded-lg flex items-center gap-1.5 cursor-default">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]"/>
                      <span>Sent to Production</span>
                    </Button>
                  </>
                ) : singleJob.status === 'customer_approval' || (singleJob as any).is_design_completed ? (
                  <>
                    <DesignTimerBadge
 startedAt={singleJob.started_at}
 completedAt={singleJob.completed_at}
 durationSeconds={singleJob.duration_seconds}
 isRunning={false}
                    />
                    <Button
 size="sm"onClick={() => onConfirmToProduction(singleJob)}
 className="h-8 px-3.5 text-xs bg-primary hover:bg-primary text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-transform active:scale-[0.98] cursor-pointer">
                      <Send className="w-3.5 h-3.5"/>
                      <span>Send to Production</span>
                    </Button>
                  </>
                ) : singleJob.status === 'designing' || (singleJob.status as string) === 'in_progress' ? (
                  <>
                    <DesignTimerBadge
 startedAt={singleJob.started_at}
 isRunning={true}
                    />
                    <Button
 size="sm"onClick={() => onCompleteDesign(singleJob)}
 className="h-8 px-3.5 text-xs bg-success hover:bg-success text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-transform active:scale-[0.98] cursor-pointer">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]"/>
                      <span>Design Complete</span>
                    </Button>
                  </>
                ) : (
                  <Button
 size="sm"onClick={() => onStartDesign(singleJob)}
 className="h-8 px-3.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-transform active:scale-[0.98] cursor-pointer">
                    <Play className="w-3 h-3 fill-current"/>
                    <span>Start Design</span>
                  </Button>
                )}

                {/* 3-dots Menu Button */}
                <div className="relative">
                  <Button
 size="sm"variant="ghost"onClick={() =>
 setActiveMenuJobId(activeMenuJobId === singleJob.id ? null : singleJob.id)
                    }
 className="h-8 w-8 p-0 text-muted-foreground hover:text-muted-foreground">
                    <MoreVertical className="w-4 h-4"/>
                  </Button>

                  {activeMenuJobId === singleJob.id && (
                    <div
 className="absolute right-0 top-9 w-48 bg-card border border-border rounded-xl shadow-lg z-30 py-1 text-xs"onMouseLeave={() => setActiveMenuJobId(null)}
                    >
                      <Link
 href={getTenantNavHref(`/design/${singleJob.id}`, pathname, tenantSlug)}
 className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-foreground">
                        <ExternalLink className="w-3.5 h-3.5 text-primary"/>
                        <span>Open Studio Workbench</span>
                      </Link>
                      <button
 type="button"onClick={() => {
 setActiveMenuJobId(null)
 onOpenWhatsApp(singleJob, 'proof')
                        }}
 className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-success">
                        <MessageSquare className="w-3.5 h-3.5"/>
                        <span>Send WhatsApp Proof</span>
                      </button>
                      <button
 type="button"onClick={() => {
 setActiveMenuJobId(null)
 onOpenLightbox(singleJob)
                        }}
 className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-foreground">
                        <Eye className="w-3.5 h-3.5"/>
                        <span>View Full Artwork</span>
                      </button>
                      <button
 type="button"onClick={() => {
 setActiveMenuJobId(null)
 onRequestRevision(singleJob)
                        }}
 className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-3.5 h-3.5"/>
                        <span>Request Revision</span>
                      </button>
                      <button
 type="button"onClick={() => {
 setActiveMenuJobId(null)
 onOpenPreflightModal(singleJob)
                        }}
 className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-primary">
                        <Sliders className="w-3.5 h-3.5"/>
                        <span>Preflight Quality Check</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Technical Specifications (6-Field Specs) Panel - Rendered full width BELOW the row */}
          {isExpanded && singleJobSpecs && (
            <div className="px-5 pb-5 pt-0 border-t border-border /80 bg-muted">
              <div className="rounded-xl bg-card border border-border p-4 text-xs tabular-nums space-y-3 mt-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-primary"/>
                    <span>{tBilingual('Technical Specifications (6-Field Specs)', 'টেকনিক্যাল স্পেসিফিকেশন (৬-ফিল্ড স্পেক্স)')}:</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-sans">
                    {invoiceNumber} · {singleJob.title || singleJob.product_name}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-semibold text-muted-foreground shrink-0">{tBilingual('Service name:', 'সার্ভিসের নাম:')}</span>
                    <span className="font-bold text-foreground break-words">{singleJobSpecs.serviceName}</span>
                  </div>
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-semibold text-muted-foreground shrink-0">{tBilingual('Material name:', 'মেটেরিয়াল নাম:')}</span>
                    <span className="font-bold text-foreground break-words">{singleJobSpecs.material}</span>
                  </div>
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-semibold text-muted-foreground shrink-0">{tBilingual('Size:', 'সাইজ:')}</span>
                    <span className="font-bold text-foreground break-words">{singleJobSpecs.size}</span>
                  </div>
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-semibold text-muted-foreground shrink-0">{tBilingual('Quantity:', 'পরিমাণ:')}</span>
                    <span className="font-bold text-foreground break-words">{singleJobSpecs.quantity}</span>
                  </div>
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-semibold text-muted-foreground shrink-0">{tBilingual('Finishing:', 'ফিনিশিং:')}</span>
                    <span className={`font-semibold break-words ${singleJobSpecs.finishing !== 'None' ? 'text-warning text-warning font-bold' : 'text-muted-foreground'}`}>{singleJobSpecs.finishing}</span>
                  </div>
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-semibold text-muted-foreground shrink-0">{tBilingual('Add-on:', 'অ্যাড-অন:')}</span>
                    <span className={`font-semibold break-words ${singleJobSpecs.addOn !== 'None' ? 'text-primary text-primary font-bold' : 'text-muted-foreground'}`}>{singleJobSpecs.addOn}</span>
                  </div>
                </div>
                {singleJob.instructions && (
                  <div className="pt-2.5 border-t border-border text-xs text-muted-foreground">
                    <span className="font-semibold text-muted-foreground">{tBilingual('Instructions / Notes:', 'নির্দেশনা / নোট:')}</span> {singleJob.instructions}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* =========================================================================
 CASE B: MULTI-JOB INVOICE CARD (e.g. INV-000125, INV-000127, INV-000130)
           ========================================================================= */
        <div>
          {/* Header Row */}
          <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border /80">
            {/* Left: Chevron, Icon, Invoice & Customer */}
            <div className="flex items-center gap-3 shrink-0">
              <button
 type="button"onClick={() => setIsExpanded(!isExpanded)}
 className="text-primary hover:text-primary transition-colors cursor-pointer p-1 -ml-1 rounded-md hover:bg-muted dark:hover:bg-muted">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-primary"/>
                ) : (
                  <ChevronRight className="w-5 h-5 text-primary"/>
                )}
              </button>

              <div className="w-10 h-10 rounded-xl bg-primary/10 bg-primary/10 text-primary text-primary flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5"/>
              </div>

              <div className="min-w-0">
                <Link
 href={invoiceHref}
 className="tabular-nums text-sm font-bold text-foreground hover:text-primary dark:hover:text-primary transition-colors flex items-center gap-1.5 whitespace-nowrap">
                  <span>{invoiceNumber}</span>
                </Link>
                <div className="font-bold text-xs text-foreground truncate mt-0.5 max-w-[170px]"title={customerName}>
                  {customerName}
                </div>
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                  {customerPhone && (
                    <span className="flex items-center gap-1 tabular-nums">
                      <Phone className="w-3 h-3 text-muted-foreground"/>
                      {customerPhone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted-foreground"/>
                    {invoiceDate || '—'}
                  </span>
                </div>
              </div>

              <Badge
 variant="outline"className="ml-2 bg-muted text-foreground font-bold text-xs px-2.5 py-0.5 rounded-full border-none whitespace-nowrap shrink-0">
                {jobs.length} Jobs
              </Badge>
            </div>

            {/* Middle / Right: Status, Due Date & Progress Bar */}
            <div className="flex items-center justify-between lg:justify-end gap-6 flex-1">
              <div className="text-right min-w-[130px]">
                <div className="flex justify-end">{renderStatusBadge(overallStatus)}</div>
                <div className="flex items-center justify-end gap-1 text-xs text-foreground mt-1 tabular-nums">
                  <Calendar className="w-3 h-3 text-muted-foreground"/>
                  <span>{displayDueDate}</span>
                </div>
                {dueText ? (
                  <div className="text-xs font-bold text-destructive text-destructive text-right">
                    {dueText}
                  </div>
                ) : null}
              </div>

              {/* Progress Bar */}
              <div className="min-w-[140px] sm:min-w-[170px]">
                <div className="text-xs font-semibold text-foreground text-right">
                  {completedJobsCount} / {totalJobsCount} Completed
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-1.5">
                  <div
 className="bg-primary h-full rounded-full transition-all duration-300"style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Collapse/Expand Toggle Button */}
              <button
 type="button"onClick={() => setIsExpanded(!isExpanded)}
 className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4"/>
                ) : (
                  <ChevronDown className="w-4 h-4"/>
                )}
              </button>
            </div>
          </div>

          {/* Expanded Embedded Jobs Table */}
          {isExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border /80 bg-muted text-muted-foreground text-xs font-semibold">
                    <th className="py-2.5 px-4 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-24">Job</th>
                    <th className="py-2.5 px-3">Product / Service</th>
                    <th className="py-2.5 px-3">Size & Qty</th>
                    <th className="py-2.5 px-3">Designer</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border/60">
                  {jobs.map((job, idx) => {
 const jobCode = job.design_number || `JOB-00${idx + 1}`
 const designerName = job.designer_name || 'Design Team'
 const designerInitials = getDesignerInitials(designerName)
 const jobDueDate = job.deadline
                      ? (job.deadline.includes('T') || job.deadline.includes('-')
                          ? new Date(job.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : job.deadline)
                      : '—'

 const jobSpecs = resolveDesignJobSpecs(job, group.allInvoiceItems, tBilingual)

 return (
                      <tr
 key={job.id || `job-${idx}`}
 className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                        {/* 1. # */}
                        <td className="py-3 px-4 text-center tabular-nums text-muted-foreground text-xs">
                          {idx + 1}
                        </td>

                        {/* 2. Job Code */}
                        <td className="py-3 px-3 tabular-nums font-bold text-foreground text-xs">
                          <Link
 href={getTenantNavHref(`/design/${job.id}`, pathname, tenantSlug)}
 className="hover:underline hover:text-primary">
                            {jobCode}
                          </Link>
                        </td>

                        {/* 3. Product / Service */}
                        <td className="py-3 px-3 text-xs">
                          <div className="font-bold text-foreground">
                            {jobSpecs.serviceName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]"title={jobSpecs.material}>
                            📄 {jobSpecs.material}
                          </div>
                        </td>

                        {/* 4. Size & Qty */}
                        <td className="py-3 px-3 text-xs tabular-nums">
                          <div className="text-foreground font-semibold">
                            {jobSpecs.size} · {jobSpecs.quantity}
                          </div>
                          {(jobSpecs.finishing !== 'None' || jobSpecs.addOn !== 'None') && (
                            <div className="text-xs text-warning text-warning truncate max-w-[200px]">
                              {jobSpecs.finishing !== 'None' && `✨ ${jobSpecs.finishing}`}
                              {jobSpecs.finishing !== 'None' && jobSpecs.addOn !== 'None' && ' · '}
                              {jobSpecs.addOn !== 'None' && `➕ ${jobSpecs.addOn}`}
                            </div>
                          )}
                        </td>

                        {/* 5. Designer with Avatar */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {designerInitials}
                            </div>
                            <span className="text-xs text-foreground font-medium">
                              {designerName}
                            </span>
                          </div>
                        </td>

                        {/* 6. Due Date */}
                        <td className="py-3 px-3 text-muted-foreground text-xs tabular-nums">
                          {jobDueDate}
                        </td>

                        {/* 7. Status */}
                        <td className="py-3 px-3">{renderStatusBadge(job.display_status || job.status)}</td>

                        {/* 8. Action Buttons Stack */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 relative">
                            {job.status === 'approved' || (job.status as string) === 'sent_to_production' || (job.status as string) === 'completed' ? (
                              <>
                                <DesignTimerBadge
 startedAt={job.started_at}
 completedAt={job.completed_at}
 durationSeconds={job.duration_seconds}
 isRunning={false}
                                />
                                <Button
 size="sm"disabled
 className="h-7 px-2.5 text-xs bg-success/15 text-success text-success border border-success-border/30 font-semibold rounded-md flex items-center gap-1 cursor-default">
                                  <Check className="w-3 h-3 stroke-[2.5]"/>
                                  <span>Sent to Production</span>
                                </Button>
                              </>
                            ) : job.status === 'customer_approval' || (job as any).is_design_completed ? (
                              <>
                                <DesignTimerBadge
 startedAt={job.started_at}
 completedAt={job.completed_at}
 durationSeconds={job.duration_seconds}
 isRunning={false}
                                />
                                <Button
 size="sm"onClick={() => onConfirmToProduction(job)}
 className="h-7 px-2.5 text-xs bg-primary hover:bg-primary text-white font-semibold rounded-md shadow-xs flex items-center gap-1 cursor-pointer">
                                  <Send className="w-3 h-3"/>
                                  <span>Send to Production</span>
                                </Button>
                              </>
                            ) : job.status === 'designing' || (job.status as string) === 'in_progress' ? (
                              <>
                                <DesignTimerBadge
 startedAt={job.started_at}
 isRunning={true}
                                />
                                <Button
 size="sm"onClick={() => onCompleteDesign(job)}
 className="h-7 px-2.5 text-xs bg-success hover:bg-success text-white font-semibold rounded-md shadow-xs flex items-center gap-1 cursor-pointer">
                                  <Check className="w-3 h-3 stroke-[2.5]"/>
                                  <span>Design Complete</span>
                                </Button>
                              </>
                            ) : (
                              <Button
 size="sm"onClick={() => onStartDesign(job)}
 className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-md shadow-xs flex items-center gap-1 cursor-pointer">
                                <Play className="w-2.5 h-2.5 fill-current"/>
                                <span>Start Design</span>
                              </Button>
                            )}

                            {/* Row 3-dots Menu */}
                            <div className="relative">
                              <Button
 size="sm"variant="ghost"onClick={() =>
 setActiveMenuJobId(activeMenuJobId === job.id ? null : job.id)
                                }
 className="h-7 w-7 p-0 text-muted-foreground hover:text-muted-foreground">
                                <MoreVertical className="w-3.5 h-3.5"/>
                              </Button>

                              {activeMenuJobId === job.id && (
                                <div
 className="absolute right-0 top-8 w-44 bg-card border border-border rounded-xl shadow-lg z-30 py-1 text-xs text-left"onMouseLeave={() => setActiveMenuJobId(null)}
                                >
                                  <Link
 href={getTenantNavHref(`/design/${job.id}`, pathname, tenantSlug)}
 className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-foreground">
                                    <ExternalLink className="w-3.5 h-3.5 text-primary"/>
                                    <span>Open Workbench</span>
                                  </Link>
                                  <button
 type="button"onClick={() => {
 setActiveMenuJobId(null)
 onOpenWhatsApp(job, 'proof')
                                    }}
 className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-success">
                                    <MessageSquare className="w-3.5 h-3.5"/>
                                    <span>WhatsApp Proof</span>
                                  </button>
                                  <button
 type="button"onClick={() => {
 setActiveMenuJobId(null)
 onOpenLightbox(job)
                                    }}
 className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-foreground">
                                    <Eye className="w-3.5 h-3.5"/>
                                    <span>View Artwork</span>
                                  </button>
                                  <button
 type="button"onClick={() => {
 setActiveMenuJobId(null)
 onRequestRevision(job)
                                    }}
 className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-destructive">
                                    <AlertCircle className="w-3.5 h-3.5"/>
                                    <span>Request Revision</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
