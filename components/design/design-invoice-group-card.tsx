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
import { type PreflightState } from './types'

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
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 font-semibold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
          <span>New</span>
        </Badge>
      )
    case 'designing':
    case 'in_progress':
      return (
        <Badge
          variant="outline"
          className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 font-semibold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block" />
          <span>Designing</span>
        </Badge>
      )
    case 'customer_approval':
    case 'waiting_approval':
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 font-semibold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          <span>Waiting Approval</span>
        </Badge>
      )
    case 'revision':
      return (
        <Badge
          variant="outline"
          className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 font-semibold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
          <span>Revision Required</span>
        </Badge>
      )
    case 'approved':
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
          <span>Approved</span>
        </Badge>
      )
    default:
      return (
        <Badge
          variant="outline"
          className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 font-semibold px-2.5 py-0.5 rounded-full text-xs"
        >
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
}: DesignInvoiceGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeMenuJobId, setActiveMenuJobId] = useState<string | null>(null)
  const pathname = usePathname() || ''
  const { company } = useTenant()
  const tenantSlug = company?.slug || 'my-company'

  const { invoiceId, invoiceNumber, customerName, customerPhone, invoiceDate, jobs } = group
  const invoiceHref = getTenantNavHref(`/billing/${invoiceId || invoiceNumber}`, pathname, tenantSlug)

  const isSingleJob = jobs.length === 1
  const singleJob = isSingleJob ? jobs[0] : null

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
  const displayDueDate = primaryJob?.deadline ? primaryJob.deadline : '28 Sep 2026'
  const isDueToday = displayDueDate.includes(new Date().toISOString().split('T')[0]) || primaryJob?.priority === 'urgent'
  const isDueSoon = displayDueDate.includes('29 Sep 2026') || displayDueDate.includes('30 Sep 2026')
  const dueText = group.dueText !== undefined ? group.dueText : (isDueToday ? 'Today' : isDueSoon ? '2 days left' : null)

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden',
        leftBorderClass
      )}
    >
      {/* =========================================================================
          CASE A: SINGLE-JOB INVOICE CARD (e.g. INV-000124, INV-000126, INV-000128)
         ========================================================================= */}
      {isSingleJob && singleJob ? (
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left Column: Chevron, Icon, Invoice & Customer */}
          <div className="flex items-center gap-3 min-w-[240px]">
            <Link
              href={getTenantNavHref(`/design/${singleJob.id}`, pathname, tenantSlug)}
              className="text-slate-400 hover:text-blue-600 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-blue-600" />
            </Link>

            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <Link
                href={invoiceHref}
                className="font-mono text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5"
              >
                <span>{invoiceNumber}</span>
              </Link>
              <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate mt-0.5">
                {customerName}
              </div>
              <div className="flex items-center gap-2.5 text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                {customerPhone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {customerPhone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {invoiceDate || '26 Sep 2026'}
                </span>
              </div>
            </div>

            <Badge
              variant="outline"
              className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs px-2.5 py-0.5 rounded-full border-none"
            >
              1 Job
            </Badge>
          </div>

          {/* Middle Column: Product Title & Specs */}
          <div className="flex-1 lg:px-4 min-w-0">
            <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
              {singleJob.title || singleJob.product_name || 'Design Product'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {singleJob.dimensions_spec || '8 x 3 ft · 1 pcs · Acrylic + ACP'}
              </span>
            </div>
          </div>

          {/* Right Column: Status & Due Date */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="flex justify-end">{renderStatusBadge(singleJob.status)}</div>
              <div className="flex items-center justify-end gap-1 text-xs text-slate-700 dark:text-slate-300 mt-1 font-mono">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{displayDueDate}</span>
              </div>
              {dueText ? (
                <div className="text-2xs font-bold text-rose-600 dark:text-rose-400 text-right">
                  {dueText}
                </div>
              ) : null}
            </div>

            {/* Action Buttons Stack */}
            <div className="flex items-center gap-2 relative">
              {singleJob.status === 'approved' ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="h-8 px-3 text-xs opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800"
                  >
                    Start Design
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="h-8 px-3 text-xs opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800"
                  >
                    Complete Design
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onConfirmToProduction(singleJob)}
                    className="h-8 px-3.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Production</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={() => onStartDesign(singleJob)}
                    className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Start Design</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCompleteDesign(singleJob)}
                    className="h-8 px-3 text-xs border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Complete Design</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled
                    className="h-8 px-3 text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed rounded-lg flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Production</span>
                  </Button>
                </>
              )}

              {/* 3-dots Menu Button */}
              <div className="relative">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setActiveMenuJobId(activeMenuJobId === singleJob.id ? null : singleJob.id)
                  }
                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>

                {activeMenuJobId === singleJob.id && (
                  <div
                    className="absolute right-0 top-9 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-30 py-1 text-xs"
                    onMouseLeave={() => setActiveMenuJobId(null)}
                  >
                    <Link
                      href={getTenantNavHref(`/design/${singleJob.id}`, pathname, tenantSlug)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                      <span>Open Studio Workbench</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuJobId(null)
                        onOpenWhatsApp(singleJob, 'proof')
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-emerald-600"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Send WhatsApp Proof</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuJobId(null)
                        onOpenLightbox(singleJob)
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Full Artwork</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuJobId(null)
                        onRequestRevision(singleJob)
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-rose-600"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Request Revision</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuJobId(null)
                        onOpenPreflightModal(singleJob)
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-purple-600"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Preflight Quality Check</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            CASE B: MULTI-JOB INVOICE CARD (e.g. INV-000125, INV-000127, INV-000130)
           ========================================================================= */
        <div>
          {/* Header Row */}
          <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80">
            {/* Left: Chevron, Icon, Invoice & Customer */}
            <div className="flex items-center gap-3 min-w-[240px]">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-blue-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-blue-600" />
                )}
              </button>

              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <Link
                  href={invoiceHref}
                  className="font-mono text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  <span>{invoiceNumber}</span>
                </Link>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate mt-0.5">
                  {customerName}
                </div>
                <div className="flex items-center gap-2.5 text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {customerPhone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {customerPhone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {invoiceDate || '26 Sep 2026'}
                  </span>
                </div>
              </div>

              <Badge
                variant="outline"
                className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs px-2.5 py-0.5 rounded-full border-none"
              >
                {jobs.length} Jobs
              </Badge>
            </div>

            {/* Middle / Right: Status, Due Date & Progress Bar */}
            <div className="flex items-center justify-between lg:justify-end gap-6 flex-1">
              <div className="text-right min-w-[130px]">
                <div className="flex justify-end">{renderStatusBadge(overallStatus)}</div>
                <div className="flex items-center justify-end gap-1 text-xs text-slate-700 dark:text-slate-300 mt-1 font-mono">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{displayDueDate}</span>
                </div>
                {dueText ? (
                  <div className="text-2xs font-bold text-rose-600 dark:text-rose-400 text-right">
                    {dueText}
                  </div>
                ) : null}
              </div>

              {/* Progress Bar */}
              <div className="min-w-[140px] sm:min-w-[170px]">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-right">
                  {completedJobsCount} / {totalJobsCount} Completed
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Collapse/Expand Toggle Button */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Expanded Embedded Jobs Table */}
          {isExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 text-2xs font-semibold">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {jobs.map((job, idx) => {
                    const jobCode = job.design_number || `JOB-00${idx + 1}`
                    const designerName = job.designer_name || 'Shamol'
                    const designerInitials = getDesignerInitials(designerName)
                    const jobDueDate = job.deadline || '28 Sep 2026'

                    return (
                      <tr
                        key={job.id || `job-${idx}`}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* 1. # */}
                        <td className="py-3 px-4 text-center font-mono text-slate-400 text-xs">
                          {idx + 1}
                        </td>

                        {/* 2. Job Code */}
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white text-xs">
                          <Link
                            href={getTenantNavHref(`/design/${job.id}`, pathname, tenantSlug)}
                            className="hover:underline hover:text-blue-600"
                          >
                            {jobCode}
                          </Link>
                        </td>

                        {/* 3. Product / Service */}
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white text-xs">
                          {job.title || job.product_name || 'Print Item'}
                        </td>

                        {/* 4. Size & Qty */}
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 text-xs font-mono">
                          {job.dimensions_spec || '10 x 4 ft · 1 pcs'}
                        </td>

                        {/* 5. Designer with Avatar */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-2xs flex items-center justify-center shrink-0">
                              {designerInitials}
                            </div>
                            <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                              {designerName}
                            </span>
                          </div>
                        </td>

                        {/* 6. Due Date */}
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 text-xs font-mono">
                          {jobDueDate}
                        </td>

                        {/* 7. Status */}
                        <td className="py-3 px-3">{renderStatusBadge(job.display_status || job.status)}</td>

                        {/* 8. Action Buttons Stack */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 relative">
                            {job.status === 'approved' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="h-7 px-2 text-2xs opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800"
                                >
                                  Start Design
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="h-7 px-2 text-2xs opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800"
                                >
                                  Complete
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => onConfirmToProduction(job)}
                                  className="h-7 px-2.5 text-2xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-xs flex items-center gap-1"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Send to Production</span>
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => onStartDesign(job)}
                                  className="h-7 px-2.5 text-2xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-xs flex items-center gap-1"
                                >
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  <span>Start Design</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onCompleteDesign(job)}
                                  className="h-7 px-2.5 text-2xs border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 font-semibold rounded-md flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Complete</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled
                                  className="h-7 px-2 text-2xs bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed rounded-md flex items-center gap-1"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Send to Production</span>
                                </Button>
                              </>
                            )}

                            {/* Row 3-dots Menu */}
                            <div className="relative">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setActiveMenuJobId(activeMenuJobId === job.id ? null : job.id)
                                }
                                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>

                              {activeMenuJobId === job.id && (
                                <div
                                  className="absolute right-0 top-8 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-30 py-1 text-xs text-left"
                                  onMouseLeave={() => setActiveMenuJobId(null)}
                                >
                                  <Link
                                    href={getTenantNavHref(`/design/${job.id}`, pathname, tenantSlug)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Open Workbench</span>
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuJobId(null)
                                      onOpenWhatsApp(job, 'proof')
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-emerald-600"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>WhatsApp Proof</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuJobId(null)
                                      onOpenLightbox(job)
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View Artwork</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuJobId(null)
                                      onRequestRevision(job)
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-rose-600"
                                  >
                                    <AlertCircle className="w-3.5 h-3.5" />
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
