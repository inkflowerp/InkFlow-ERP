import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
  Sparkles,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Eye,
  MessageSquare,
  Upload,
  Layers,
  FileCheck,
  Check,
  PauseCircle,
  PlayCircle,
  SplitSquareVertical,
  RotateCcw,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DesignJobRecord } from '@/types/design.types'
import { type PreflightState } from './types'

interface DesignJobCardProps {
  job: DesignJobRecord
  activeTab: string
  preflight: PreflightState
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

export const DesignJobCard = React.memo(function DesignJobCard({
  job,
  activeTab,
  preflight,
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
}: DesignJobCardProps) {
  const pathname = usePathname() || ''
  const { company } = useTenant()
  const tenantSlug = company?.slug || 'my-company'

  const versions = job.versions || []
  const currentVer = versions[versions.length - 1]
  const previewUrl =
    currentVer?.proof_file_url ||
    currentVer?.preview_url ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'

  const isUrgent = job.priority === 'urgent' || job.priority === 'very_urgent'
  const isWalkIn =
    job.customer_name?.toLowerCase().includes('walk') ||
    job.customer_name?.toLowerCase().includes('counter') ||
    (job as any).is_walkin
  const isDueToday = job.deadline?.includes(new Date().toISOString().split('T')[0])

  const allPreflightPassed =
    preflight.cmyk && preflight.dpi300 && preflight.bleed && preflight.curves

  const workbenchHref = getTenantNavHref(`/design/${job.id}`, pathname, tenantSlug)
  const invoiceHref = job.invoice_number
    ? getTenantNavHref(`/billing/${job.invoice_id || job.invoice_number}`, pathname, tenantSlug)
    : null

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-xs ${
        isUrgent
          ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-400/20'
          : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Banner for Urgent / Walk-in / Due Today */}
      {(isUrgent || isWalkIn || isDueToday) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent px-4 py-1.5 border-b border-amber-200/50 dark:border-amber-900/40 flex items-center justify-between text-2xs font-bold">
          <div className="flex items-center gap-2">
            {isWalkIn && (
              <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-2xs uppercase tracking-wide">
                🏃 দোকানে বসা কাস্টমার (Walk-in)
              </span>
            )}
            {isDueToday && (
              <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-2xs uppercase tracking-wide">
                ⏰ আজকের ডেলিভারি (Due Today)
              </span>
            )}
            {isUrgent && !isDueToday && (
              <span className="bg-red-600 text-white px-2 py-0.5 rounded text-2xs uppercase tracking-wide">
                🚨 জরুরী কাজ (Urgent)
              </span>
            )}
          </div>
          <span className="text-slate-500 text-2xs font-mono">
            {job.deadline ? `টার্গেট: ${job.deadline.split('T')[0]}` : ''}
          </span>
        </div>
      )}

      {/* Main Card Body: 2-Column Split (Left Info & Specs, Right Artwork & Quick Actions) */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Info & Specifications (7 Cols) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-3">
          <div>
            {/* Header / Badges */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={workbenchHref}
                  className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors inline-flex items-center gap-1"
                >
                  <span>#{job.design_number}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </Link>
                {job.order_number && (
                  <Link
                    href={getTenantNavHref('/orders', pathname, tenantSlug)}
                    className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                  >
                    Ord: #{job.order_number}
                  </Link>
                )}
                {job.invoice_number && invoiceHref && (
                  <Link
                    href={invoiceHref}
                    className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Inv: #{job.invoice_number}
                  </Link>
                )}
                {job.workflow_routing === 'design_ok' ? (
                  <span className="text-2xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <FileCheck className="h-3 w-3" />
                    <span>রেডি ফাইল চেক (Design OK)</span>
                  </span>
                ) : (
                  <span className="text-2xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>নতুন ডিজাইন দরকার</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={workbenchHref}
                  className="text-2xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Workbench ➔</span>
                </Link>
                <span className="text-2xs font-mono text-slate-400">
                  v{job.current_version || versions.length || 1}
                </span>
              </div>
            </div>

            {/* Title & Customer Name */}
            <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug">
              <Link href={workbenchHref} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {job.title}
              </Link>
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {job.customer_name}
              </span>
              {(job.customer_phone || (job as any).mobile) && (
                <button
                  type="button"
                  onClick={() => onOpenWhatsApp(job, 'proof')}
                  className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <Phone className="h-3 w-3 text-emerald-600" />
                  <span>{job.customer_phone || (job as any).mobile}</span>
                </button>
              )}
            </div>

            {/* Job Specifications Strip */}
            <div className="mt-2.5 grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-2xs">
              <div>
                <span className="text-slate-400 block text-2xs">সাইজ / পরিমাপ:</span>
                <strong className="font-mono text-slate-700 dark:text-slate-200">
                  {job.dimensions_spec || 'Standard Spec'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-2xs">পরিমাণ (Qty):</span>
                <strong className="font-mono text-slate-700 dark:text-slate-200">
                  {job.quantity || 1} {job.unit || 'pcs'}
                </strong>
              </div>
              {job.material && (
                <div className="col-span-2">
                  <span className="text-slate-400 block text-2xs">মেটেরিয়াল ও পেপার:</span>
                  <strong className="text-slate-700 dark:text-slate-200 truncate block">
                    {job.material}
                  </strong>
                </div>
              )}
              {job.instructions && (
                <div className="col-span-2 border-t border-slate-200 dark:border-slate-700/60 pt-1.5 text-slate-600 dark:text-slate-400">
                  <span className="text-2xs font-bold text-slate-500 block">কাস্টমার নির্দেশনা:</span>
                  <p className="line-clamp-2 text-2xs italic">{job.instructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pre-Press Quality Health Strip (Interactive Checklist Badges) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                প্রি-প্রেস কোয়ালিটি হেলথ (Pre-Press Verification):
              </span>
              <button
                type="button"
                onClick={() => onOpenPreflightModal(job)}
                className="text-2xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
              >
                {allPreflightPassed ? '✓ ভেরিফাইড (মেশিন সেট করুন)' : 'চেক করুন ও মেশিন রুট'}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {/* CMYK */}
              <button
                type="button"
                onClick={() => onTogglePreflight(job.id, 'cmyk', job.design_number)}
                className={`py-1 px-1.5 rounded text-2xs font-bold border text-center transition-all ${
                  preflight.cmyk
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                }`}
              >
                {preflight.cmyk ? '✓ CMYK' : 'CMYK?'}
              </button>
              {/* 300 DPI */}
              <button
                type="button"
                onClick={() => onTogglePreflight(job.id, 'dpi300', job.design_number)}
                className={`py-1 px-1.5 rounded text-2xs font-bold border text-center transition-all ${
                  preflight.dpi300
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                }`}
              >
                {preflight.dpi300 ? '✓ 300 DPI' : '300 DPI?'}
              </button>
              {/* Bleed */}
              <button
                type="button"
                onClick={() => onTogglePreflight(job.id, 'bleed', job.design_number)}
                className={`py-1 px-1.5 rounded text-2xs font-bold border text-center transition-all ${
                  preflight.bleed
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                }`}
              >
                {preflight.bleed ? '✓ Bleed' : 'Bleed?'}
              </button>
              {/* Curves */}
              <button
                type="button"
                onClick={() => onTogglePreflight(job.id, 'curves', job.design_number)}
                className={`py-1 px-1.5 rounded text-2xs font-bold border text-center transition-all ${
                  preflight.curves
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                }`}
              >
                {preflight.curves ? '✓ Curves' : 'Curves?'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Artwork Preview & Actions (5 Cols) */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-2.5">
          {/* Artwork Thumbnail with Zoom & Compare */}
          <div className="relative group rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 aspect-[4/3] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={job.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Format & Version Overlay */}
            <div className="absolute top-2 left-2 flex items-center gap-1">
              <span className="bg-slate-900/80 backdrop-blur-sm text-white text-2xs font-bold uppercase px-1.5 py-0.5 rounded">
                {currentVer?.file_format || 'PNG'}
              </span>
              <span className="bg-indigo-600/90 text-white text-2xs font-bold px-1.5 py-0.5 rounded font-mono">
                v{currentVer?.version_number || job.current_version || 1}
              </span>
            </div>

            {/* Hover Actions */}
            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onOpenLightbox(job)}
                className="h-8 px-2.5 text-xs bg-white text-slate-900 font-bold shadow"
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                <span>বড় করে দেখুন</span>
              </Button>
              {versions.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onOpenCompare(job)}
                  className="h-8 px-2.5 text-xs bg-white text-slate-900 font-bold shadow"
                >
                  <SplitSquareVertical className="h-3.5 w-3.5 mr-1" />
                  <span>তুলনা (Diff)</span>
                </Button>
              )}
            </div>
          </div>

          {/* Tab-Specific Action Buttons */}
          <div className="space-y-1.5">
            {/* TAB 1: NEW TASKS */}
            {activeTab === 'new_tasks' && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onStartDesign(job)}
                  className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  <span>Start Design (কাজ শুরু)</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenPreflightModal(job)}
                  className="text-xs h-8 px-2 border-slate-300 text-slate-700 dark:text-slate-300"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* TAB 2: DESIGN RUNNING */}
            {activeTab === 'design_running' && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onCompleteDesign(job)}
                  className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 shadow-sm"
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  <span>Design Complete ➔ Send Proof</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenWhatsApp(job, 'proof')}
                  className="text-xs h-8 px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* TAB 3: WAITING FOR APPROVAL */}
            {activeTab === 'waiting_approval' && (
              <div className="space-y-1.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onConfirmToProduction(job)}
                  className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  <span>Design Confirmed send to production</span>
                </Button>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenWhatsApp(job, 'reminder')}
                    className="flex-1 text-2xs h-7 border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    <span>WhatsApp Reminder</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onRequestRevision(job)}
                    className="flex-1 text-2xs h-7 border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    <span>Revision Needed</span>
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 4: IN PRODUCTION */}
            {activeTab === 'in_production' && (
              <div className="flex items-center gap-1.5">
                {(job as any).is_production_paused ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onResumeProduction(job)}
                    className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8"
                  >
                    <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                    <span>File Ready Start Production</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onPauseProduction(job)}
                    className="flex-1 text-xs border-rose-300 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 font-bold h-8"
                  >
                    <PauseCircle className="h-3.5 w-3.5 mr-1.5" />
                    <span>Pause Production Correction Required</span>
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenWhatsApp(job, 'production')}
                  className="text-xs h-8 px-2 border-emerald-300 text-emerald-700"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* ALL / SEARCH VIEW DEFAULT */}
            {activeTab === 'all' && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onOpenWhatsApp(job, 'proof')}
                  className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  <span>হোয়াটসঅ্যাপ প্রুফ</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenPreflightModal(job)}
                  className="text-xs h-8 px-2.5 border-slate-300"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  <span>মেশিন</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
