'use client'

import React, { useState } from 'react'
import {
  Sparkles,
  Phone,
  Printer,
  ChevronDown,
  ChevronUp,
  FileText,
  FileCheck,
  Check,
  Layers,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DesignJobRecord } from '@/types/design.types'
import { type PreflightState } from './types'
import { DesignJobCard } from './design-job-card'

interface InvoiceGroup {
  invoiceId: string
  invoiceNumber: string
  customerName: string
  customerPhone?: string | null
  jobs: DesignJobRecord[]
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
  onPauseProduction: (job: DesignJobRecord) => void
  onResumeProduction: (job: DesignJobRecord) => void
  onRequestRevision: (job: DesignJobRecord) => void
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

  const { invoiceNumber, customerName, customerPhone, jobs } = group

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/30 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm overflow-hidden mb-4">
      {/* Group Header */}
      <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-indigo-950 dark:text-indigo-200">
                Invoice #{invoiceNumber}
              </span>
              <span className="bg-indigo-200/80 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {jobs.length} Works (কাজ)
              </span>
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

        {/* Header Right: Collapse & WhatsApp Proof */}
        <div className="flex items-center gap-2">
          {jobs[0] && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenWhatsApp(jobs[0], 'proof')}
              className="h-8 text-xs border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
            >
              <Phone className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              <span>ইনভয়েস প্রুফ পাঠান</span>
            </Button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Jobs List */}
      {isExpanded && (
        <div className="p-3.5 space-y-3">
          {jobs.map((job) => (
            <DesignJobCard
              key={job.id}
              job={job}
              activeTab={activeTab}
              preflight={getPreflightStatus(job.id, job.status)}
              onTogglePreflight={onTogglePreflight}
              onOpenWhatsApp={onOpenWhatsApp}
              onOpenLightbox={onOpenLightbox}
              onOpenCompare={onOpenCompare}
              onOpenPreflightModal={onOpenPreflightModal}
              onStartDesign={onStartDesign}
              onCompleteDesign={onCompleteDesign}
              onConfirmToProduction={onConfirmToProduction}
              onPauseProduction={onPauseProduction}
              onResumeProduction={onResumeProduction}
              onRequestRevision={onRequestRevision}
            />
          ))}
        </div>
      )}
    </div>
  )
})
