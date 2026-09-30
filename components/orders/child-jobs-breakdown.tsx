'use client'

import React from 'react'
import Link from 'next/link'
import {
  Layers,
  Clock,
  Printer,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Truck,
  Scissors,
  Palette,
  Plus,
  ExternalLink,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import type { JobOrderRecord, JobStatus } from '@/types/order.types'
import type { ChildJobWorkflowState } from '@/lib/workflow/workflow-engine'

interface ChildJobsBreakdownProps {
  jobs: JobOrderRecord[]
  childWorkflows: ChildJobWorkflowState[]
  tenantSlug: string
  onOpenNewJobModal: () => void
  onSelectJobForPrint: (job: JobOrderRecord) => void
  onUpdateJobStatus: (jobId: string, status: JobStatus) => void
  className?: string
}

export function ChildJobsBreakdown({
  jobs,
  childWorkflows,
  tenantSlug,
  onOpenNewJobModal,
  onSelectJobForPrint,
  onUpdateJobStatus,
  className = '',
}: ChildJobsBreakdownProps) {
  const { locale, tBilingual } = useI18n()

  const getWorkflowForJob = (job: JobOrderRecord): ChildJobWorkflowState | undefined => {
    return childWorkflows.find(
      (w) => w.jobId === job.id || w.jobNumber === job.job_number
    )
  }

  const getDepartmentIcon = (dept: string) => {
    const d = dept?.toLowerCase() || ''
    if (d.includes('design')) return <Palette className="h-3.5 w-3.5" />
    if (d.includes('print') || d.includes('wide')) return <Printer className="h-3.5 w-3.5" />
    if (d.includes('finish')) return <Scissors className="h-3.5 w-3.5" />
    if (d.includes('laser') || d.includes('cnc') || d.includes('fab')) return <Cpu className="h-3.5 w-3.5" />
    if (d.includes('delivery')) return <Truck className="h-3.5 w-3.5" />
    return <Layers className="h-3.5 w-3.5" />
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <span>
              {tBilingual('Production Job Orders', 'প্রোডাকশন জব টিকেটসমূহ')} ({jobs.length}{' '}
              {tBilingual('Jobs', 'টিকেট')})
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {tBilingual(
              'Each job order represents an independent production traveler routed through machine floor bays.',
              'প্রতিটি জব অর্ডার ফ্লোর মেশিন অনুযায়ী পৃথকভাবে পরিচালিত হয়।'
            )}
          </p>
        </div>

        <Button
          size="sm"
          onClick={onOpenNewJobModal}
          className="bg-blue-600 hover:bg-blue-700 text-xs text-white shadow-xs self-start sm:self-auto"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          <span>{tBilingual('+ Add Job Ticket', '+ নতুন জব টিকেট')}</span>
        </Button>
      </div>

      {/* Grid of Child Jobs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => {
          const wf = getWorkflowForJob(job)
          const isDelivered = wf?.isDelivered || false
          const isBlocked = wf?.isBlocked || false

          return (
            <Card
              key={job.id}
              className={`border transition-all ${
                isBlocked
                  ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/20 shadow-xs'
                  : isDelivered
                  ? 'border-emerald-300 dark:border-emerald-900/80 bg-emerald-50/10'
                  : 'border-slate-200 dark:border-slate-800 hover:shadow-md'
              }`}
            >
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="tabular-nums font-black text-blue-600 dark:text-blue-400 text-xs">
                      {job.job_number}
                    </span>
                    {isDelivered && (
                      <Badge className="bg-emerald-600 text-white text-3xs font-bold px-1.5 py-0 h-4">
                        DELIVERED
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Stage Badge */}
                    {wf && (
                      <Badge
                        variant="outline"
                        className={`text-2xs font-bold capitalize ${
                          isBlocked
                            ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                            : wf.stage === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : wf.stage === 'delivery'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-blue-50 text-blue-700 border-blue-300'
                        }`}
                      >
                        {tBilingual(wf.stageLabelEn, wf.stageLabelBn)}
                      </Badge>
                    )}
                  </div>
                </div>

                <CardTitle className="text-sm font-bold mt-1.5 text-slate-900 dark:text-white line-clamp-1">
                  {job.product_name || job.title}
                </CardTitle>

                <div className="text-2xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>
                    {tBilingual('Qty:', 'পরিমাণ:')} <strong className="tabular-nums">{job.quantity || 1}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    {tBilingual('Size:', 'আকার:')}{' '}
                    <strong>{job.dimensions_spec || job.size_spec || 'Custom'}</strong>
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3 text-xs">
                {/* Department & Machine */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1 text-2xs">
                    {getDepartmentIcon(job.assigned_department)}
                    <span>{tBilingual('Department', 'বিভাগ')}</span>
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize text-2xs">
                    {job.assigned_department?.replace(/_/g, ' ') || 'Printing'}
                  </span>
                </div>

                {/* Substrate Material */}
                <div>
                  <span className="text-slate-400 text-2xs block">
                    {tBilingual('Substrate / Material', 'কাঁচামাল ও মিডিয়া')}
                  </span>
                  <div className="text-2xs text-slate-700 dark:text-slate-300 font-medium truncate mt-0.5">
                    {job.material_spec || 'Standard Substrate'}
                  </div>
                </div>

                {/* Blocker Alert if active on this job */}
                {isBlocked && wf?.blockedReasonEn && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-2xs text-rose-800 dark:text-rose-300 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>{tBilingual(wf.blockedReasonEn, wf.blockedReasonBn || '')}</span>
                  </div>
                )}

                {/* Tasks Progress */}
                {wf && wf.tasksCount > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-2xs text-slate-500">
                      <span>{tBilingual('Floor Tasks', 'ফ্লোর টাস্ক')}</span>
                      <span className="tabular-nums font-bold">
                        {wf.completedTasksCount} / {wf.tasksCount} {tBilingual('Done', 'সম্পন্ন')}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{
                          width: `${Math.round((wf.completedTasksCount / wf.tasksCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Next Action Direct Link */}
                {wf && wf.nextActionHref && !isDelivered && (
                  <div className="pt-1">
                    <Link href={wf.nextActionHref}>
                      <Button
                        size="sm"
                        variant={isBlocked ? 'destructive' : 'outline'}
                        className={`w-full h-8 text-2xs font-bold justify-between ${
                          !isBlocked
                            ? 'border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300'
                            : ''
                        }`}
                      >
                        <span className="truncate">{tBilingual(wf.nextActionEn, wf.nextActionBn)}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Footer Controls: Traveler Ticket & Quick Status */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectJobForPrint(job)}
                    className="h-7 text-2xs px-2 text-slate-600 hover:text-slate-900"
                    title="Print Traveler Ticket (Job Bag)"
                  >
                    <Printer className="h-3 w-3 mr-1 text-slate-500" />
                    <span>{tBilingual('Job Bag', 'জব ব্যাগ')}</span>
                  </Button>

                  <select
                    value={job.status}
                    onChange={(e) => onUpdateJobStatus(job.id, e.target.value as JobStatus)}
                    className="h-7 px-1.5 rounded text-2xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  >
                    <option value="queued">Queued</option>
                    <option value="in_progress">In Progress</option>
                    <option value="quality_check">QC Check</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
