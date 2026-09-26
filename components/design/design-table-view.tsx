import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
  Sparkles,
  Phone,
  Printer,
  Eye,
  MessageSquare,
  FileCheck,
  Check,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DesignJobRecord } from '@/types/design.types'
import { type PreflightState } from './types'

interface DesignTableViewProps {
  jobs: DesignJobRecord[]
  activeTab: string
  getPreflightStatus: (jobId: string, status?: string) => PreflightState
  onTogglePreflight: (jobId: string, key: keyof PreflightState, designNumber?: string) => void
  onOpenWhatsApp: (job: DesignJobRecord, tpl?: 'proof' | 'reminder' | 'production' | 'revision') => void
  onOpenLightbox: (job: DesignJobRecord, versionIndex?: number) => void
  onOpenPreflightModal: (job: DesignJobRecord) => void
  onStartDesign: (job: DesignJobRecord) => void
  onCompleteDesign: (job: DesignJobRecord) => void
  onConfirmToProduction: (job: DesignJobRecord) => void
  onPauseProduction: (job: DesignJobRecord) => void
  onResumeProduction: (job: DesignJobRecord) => void
  onRequestRevision: (job: DesignJobRecord) => void
}

export const DesignTableView = React.memo(function DesignTableView({
  jobs,
  activeTab,
  getPreflightStatus,
  onTogglePreflight,
  onOpenWhatsApp,
  onOpenLightbox,
  onOpenPreflightModal,
  onStartDesign,
  onCompleteDesign,
  onConfirmToProduction,
  onPauseProduction,
  onResumeProduction,
  onRequestRevision,
}: DesignTableViewProps) {
  const pathname = usePathname() || ''
  const { company } = useTenant()
  const tenantSlug = company?.slug || 'my-company'

  if (jobs.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
        কোনো ডিজাইন রেকর্ড পাওয়া যায়নি।
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-2xs font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">জব আইডি / ইনভয়েস</th>
              <th className="py-3 px-4">কাস্টমার ও যোগাযোগ</th>
              <th className="py-3 px-4">কাজের বিবরণ ও সাইজ</th>
              <th className="py-3 px-4">প্রি-প্রেস কোয়ালিটি</th>
              <th className="py-3 px-4">আর্টওয়ার্ক</th>
              <th className="py-3 px-4 text-right">অ্যাকশন (Actions)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {jobs.map((job) => {
              const pf = getPreflightStatus(job.id, job.status)
              const latestVer = job.versions?.[job.versions.length - 1]
              const previewUrl =
                latestVer?.proof_file_url ||
                latestVer?.preview_url ||
                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80'

              const workbenchHref = getTenantNavHref(`/design/${job.id}`, pathname, tenantSlug)
              const invoiceHref = job.invoice_number
                ? getTenantNavHref(`/billing/${job.invoice_id || job.invoice_number}`, pathname, tenantSlug)
                : null

              return (
                <tr
                  key={job.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {/* Job ID & Invoice */}
                  <td className="py-3 px-4 align-middle">
                    <Link
                      href={workbenchHref}
                      className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>#{job.design_number}</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                    </Link>
                    {job.invoice_number && (
                      <div className="font-mono text-2xs text-slate-500">
                        {invoiceHref ? (
                          <Link href={invoiceHref} className="hover:underline hover:text-slate-800 dark:hover:text-slate-200">
                            Inv: #{job.invoice_number}
                          </Link>
                        ) : (
                          <span>Inv: #{job.invoice_number}</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Customer & Phone */}
                  <td className="py-3 px-4 align-middle">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {job.customer_name}
                    </div>
                    {(job.customer_phone || (job as any).mobile) && (
                      <button
                        type="button"
                        onClick={() => onOpenWhatsApp(job, 'proof')}
                        className="text-2xs text-emerald-700 dark:text-emerald-400 font-mono hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{job.customer_phone || (job as any).mobile}</span>
                      </button>
                    )}
                  </td>

                  {/* Title & Dimensions */}
                  <td className="py-3 px-4 align-middle">
                    <Link
                      href={workbenchHref}
                      className="font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1 transition-colors block"
                    >
                      {job.title}
                    </Link>
                    <div className="text-2xs text-slate-500 font-mono">
                      {job.dimensions_spec || 'Standard Spec'} | {job.quantity || 1} {job.unit || 'pcs'}
                    </div>
                  </td>

                  {/* Preflight Checklist Badges */}
                  <td className="py-3 px-4 align-middle">
                    <div className="flex items-center gap-1">
                      <span
                        onClick={() => onTogglePreflight(job.id, 'cmyk', job.design_number)}
                        className={`cursor-pointer px-1.5 py-0.5 rounded text-2xs font-bold border ${
                          pf.cmyk
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800'
                        }`}
                      >
                        {pf.cmyk ? '✓ CMYK' : 'CMYK'}
                      </span>
                      <span
                        onClick={() => onTogglePreflight(job.id, 'dpi300', job.design_number)}
                        className={`cursor-pointer px-1.5 py-0.5 rounded text-2xs font-bold border ${
                          pf.dpi300
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800'
                        }`}
                      >
                        {pf.dpi300 ? '✓ 300DPI' : '300DPI'}
                      </span>
                      <span
                        onClick={() => onTogglePreflight(job.id, 'bleed', job.design_number)}
                        className={`cursor-pointer px-1.5 py-0.5 rounded text-2xs font-bold border ${
                          pf.bleed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800'
                        }`}
                      >
                        {pf.bleed ? '✓ Bleed' : 'Bleed'}
                      </span>
                      <span
                        onClick={() => onTogglePreflight(job.id, 'curves', job.design_number)}
                        className={`cursor-pointer px-1.5 py-0.5 rounded text-2xs font-bold border ${
                          pf.curves
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800'
                        }`}
                      >
                        {pf.curves ? '✓ Curves' : 'Curves'}
                      </span>
                    </div>
                  </td>

                  {/* Artwork Preview */}
                  <td className="py-3 px-4 align-middle">
                    <button
                      type="button"
                      onClick={() => onOpenLightbox(job)}
                      className="h-10 w-14 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden relative group block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt={job.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="h-3.5 w-3.5 text-white" />
                      </div>
                    </button>
                  </td>

                  {/* Actions Column */}
                  <td className="py-3 px-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        asChild
                        className="h-7 px-2 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 font-semibold"
                      >
                        <Link href={workbenchHref}>
                          <span>Workbench</span>
                        </Link>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenWhatsApp(job, 'proof')}
                        className="h-7 px-2 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        <span>WhatsApp</span>
                      </Button>

                      {activeTab === 'new_tasks' && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onStartDesign(job)}
                          className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          <span>Start Design</span>
                        </Button>
                      )}

                      {activeTab === 'design_running' && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onCompleteDesign(job)}
                          className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          <span>Complete & Proof</span>
                        </Button>
                      )}

                      {activeTab === 'waiting_approval' && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onConfirmToProduction(job)}
                          className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          <span>Send to Production</span>
                        </Button>
                      )}

                      {activeTab === 'in_production' && (
                        <>
                          {(job as any).is_production_paused ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => onResumeProduction(job)}
                              className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <PlayCircle className="h-3 w-3 mr-1" />
                              <span>Resume</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => onPauseProduction(job)}
                              className="h-7 px-2 text-xs border-rose-300 text-rose-700"
                            >
                              <PauseCircle className="h-3 w-3 mr-1" />
                              <span>Pause</span>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
})
