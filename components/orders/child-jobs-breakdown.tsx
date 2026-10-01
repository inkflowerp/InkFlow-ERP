'use client'

import React from 'react'
import Link from 'next/link'
import {
  Layers,
  Printer,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import type { JobOrderRecord, JobStatus } from '@/types/order.types'
import type { ChildJobWorkflowState } from '@/lib/workflow/workflow-engine'
import { JobCard } from './job-card'

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
  const { tBilingual } = useI18n()

  const getWorkflowForJob = (job: JobOrderRecord): ChildJobWorkflowState | undefined => {
    return childWorkflows.find(
      (w) => w.jobId === job.id || w.jobNumber === job.job_number
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground dark:text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <span>
              {tBilingual('Production Job Orders', 'প্রোডাকশন জব টিকেটসমূহ')} ({jobs.length}{' '}
              {tBilingual('Jobs', 'টিকেট')})
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
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

      {/* Grid of Child Jobs using canonical JobCard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => {
          const wf = getWorkflowForJob(job)

          return (
            <div key={job.id} className="flex flex-col">
              <JobCard
                job={job}
                workflow={wf}
                customerName={job.customer_name}
                tenantSlug={tenantSlug}
                className="h-full"
              />
              {/* Quick Traveler Print and Manual Status Override */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted border-x border-b border-border rounded-b-xl text-2xs">
                <button
                  type="button"
                  onClick={() => onSelectJobForPrint(job)}
                  className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground dark:hover:text-white"
                  title={tBilingual('Print Job Traveler (Job Bag)', 'জব ব্যাগ প্রিন্ট করুন')}
                >
                  <Printer className="h-3 w-3 text-muted-foreground" />
                  <span>{tBilingual('Job Bag', 'জব ব্যাগ')}</span>
                </button>

                <select
                  value={job.status}
                  onChange={(e) => onUpdateJobStatus(job.id, e.target.value as JobStatus)}
                  className="h-6 px-1.5 rounded text-3xs font-semibold border border-input bg-card text-foreground dark:text-muted-foreground"
                  aria-label="Status override"
                >
                  <option value="queued">Queued</option>
                  <option value="in_progress">In Progress</option>
                  <option value="quality_check">QC Check</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
