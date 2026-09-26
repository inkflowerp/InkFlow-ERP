'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
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
  Package,
  ExternalLink,
  Tag,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { DesignJobRecord } from '@/types/design.types'
import { isReadyProduct, isOutsourceProduct } from '@/lib/units'
import { type PreflightState } from './types'
import { DesignJobCard } from './design-job-card'

export interface InvoiceGroup {
  invoiceId: string
  invoiceNumber: string
  customerName: string
  customerPhone?: string | null
  jobs: DesignJobRecord[]
  allInvoiceItems?: any[]
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
  const pathname = usePathname() || ''
  const { company } = useTenant()
  const tenantSlug = company?.slug || 'my-company'

  const { invoiceId, invoiceNumber, customerName, customerPhone, jobs, allInvoiceItems } = group
  const invoiceHref = getTenantNavHref(`/billing/${invoiceId || invoiceNumber}`, pathname, tenantSlug)

  // Extract all items from invoice or fallback to the jobs' data
  const rawItems: any[] = allInvoiceItems && allInvoiceItems.length > 0
    ? allInvoiceItems
    : (jobs[0]?.all_invoice_items && jobs[0].all_invoice_items.length > 0 ? jobs[0].all_invoice_items : [])

  // Classify sibling items not present in design jobs (e.g. Ready Products & Outsource items)
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

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/30 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm overflow-hidden mb-4">
      {/* Group Header */}
      <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={invoiceHref}
                className="font-mono text-sm font-bold text-indigo-950 dark:text-indigo-200 hover:underline inline-flex items-center gap-1"
              >
                <span>Invoice #{invoiceNumber}</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Link>
              <span className="bg-indigo-200/80 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-2xs font-bold px-2 py-0.5 rounded-full">
                {jobs.length} Design Work(s) (ডিজাইন কাজ)
              </span>
              {readyProductItems.length > 0 && (
                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-2xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span>{readyProductItems.length} Ready Product (ইন-স্টক)</span>
                </span>
              )}
              {outsourceItems.length > 0 && (
                <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-2xs font-bold px-2 py-0.5 rounded-full">
                  {outsourceItems.length} Outsource (আউটসোর্স)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              <span className="font-semibold text-slate-900 dark:text-white">{customerName}</span>
              {customerPhone && (
                <span className="text-2xs font-mono text-emerald-700 dark:text-emerald-400">
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

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3.5 space-y-3">
          {/* Sibling In-Stock Ready Products (Bypassed Design) */}
          {readyProductItems.length > 0 && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-emerald-600" />
                  <span>রেডি প্রোডাক্ট আইটেম (ইন-স্টক — ডিজাইন প্রয়োজন নেই)</span>
                </span>
                <span className="text-2xs text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded font-mono">
                  Bypassed Design Studio
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {readyProductItems.map((rp: any, idx: number) => (
                  <div
                    key={rp.id || `rp-${idx}`}
                    className="flex items-center justify-between bg-white dark:bg-slate-900/80 p-2 rounded border border-emerald-100 dark:border-emerald-900 text-xs shadow-2xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {rp.item_name || rp.item_description || 'Ready Stock Product'}
                      </div>
                      <div className="text-2xs text-slate-500">
                        {rp.dimensions_spec || (rp.width && rp.height ? `${rp.width}×${rp.height} ${rp.unit || 'ft'}` : 'Standard Size')} • {rp.material || rp.material_spec || 'Stock Item'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        Qty: {rp.quantity || 1} {rp.unit || 'pcs'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sibling Outsource Items */}
          {outsourceItems.length > 0 && (
            <div className="rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 p-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-purple-900 dark:text-purple-200 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-purple-600" />
                  <span>আউটসোর্স পণ্য ও সেবা (থার্ড-পার্টি ভেন্ডর কাজ)</span>
                </span>
                <span className="text-2xs text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded font-mono">
                  External Vendor
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {outsourceItems.map((out: any, idx: number) => (
                  <div
                    key={out.id || `out-${idx}`}
                    className="flex items-center justify-between bg-white dark:bg-slate-900/80 p-2 rounded border border-purple-100 dark:border-purple-900 text-xs shadow-2xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {out.item_name || out.item_description || 'Outsource Product'}
                      </div>
                      <div className="text-2xs text-slate-500">
                        {out.dimensions_spec || (out.width && out.height ? `${out.width}×${out.height} ${out.unit || 'ft'}` : 'Custom Outsource')} • {out.finishing || 'Vendor Production'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
                        Qty: {out.quantity || 1} {out.unit || 'pcs'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Custom Design Jobs */}
          <div className="space-y-3">
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
        </div>
      )}
    </div>
  )
})

