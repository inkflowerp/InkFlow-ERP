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
  RotateCcw,
  ExternalLink,
  Play,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DesignJobRecord } from '@/types/design.types'
import { type PreflightState, resolveDesignJobSpecs } from './types'
import { useI18n } from '@/i18n/context'
import { DesignTimerBadge } from './design-timer-badge'

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
  const { tBilingual } = useI18n()

  if (jobs.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
        কোনো ডিজাইন রেকর্ড পাওয়া যায়নি।
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-foreground dark:text-muted-foreground">
          <thead className="bg-muted border-b border-border text-2xs font-bold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">জব আইডি / ইনভয়েস</th>
              <th className="py-3 px-4">কাস্টমার ও যোগাযোগ</th>
              <th className="py-3 px-4">কাজের বিবরণ ও সাইজ</th>
              <th className="py-3 px-4">প্রি-প্রেস কোয়ালিটি</th>
              <th className="py-3 px-4">আর্টওয়ার্ক</th>
              <th className="py-3 px-4 text-right">অ্যাকশন (Actions)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border">
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
              const specs = resolveDesignJobSpecs(job, job.all_invoice_items, tBilingual)

              return (
                <tr
                  key={job.id}
                  className="hover:bg-muted dark:hover:bg-muted/50 transition-colors"
                >
                  {/* Job ID & Invoice */}
                  <td className="py-3 px-4 align-middle">
                    <Link
                      href={workbenchHref}
                      className="tabular-nums font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>#{job.design_number}</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                    </Link>
                    {job.invoice_number && (
                      <div className="tabular-nums text-2xs text-muted-foreground">
                        {invoiceHref ? (
                          <Link href={invoiceHref} className="hover:underline hover:text-foreground dark:hover:text-foreground">
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
                    <div className="font-semibold text-foreground dark:text-white">
                      {job.customer_name}
                    </div>
                    {(job.customer_phone || (job as any).mobile) && (
                      <button
                        type="button"
                        onClick={() => onOpenWhatsApp(job, 'proof')}
                        className="text-2xs text-emerald-700 dark:text-emerald-400 tabular-nums hover:underline flex items-center gap-1 mt-0.5"
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
                      className="font-bold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1 transition-colors block"
                    >
                      {specs.serviceName}
                    </Link>
                    <div className="text-2xs text-muted-foreground tabular-nums mt-0.5">
                      {specs.size} | {specs.quantity} | {specs.material}
                    </div>
                    {(specs.finishing !== 'None' || specs.addOn !== 'None') && (
                      <div className="text-2xs text-amber-700 dark:text-amber-400 tabular-nums mt-0.5">
                        {specs.finishing !== 'None' && `✨ ${specs.finishing}`}
                        {specs.finishing !== 'None' && specs.addOn !== 'None' && ' · '}
                        {specs.addOn !== 'None' && `➕ ${specs.addOn}`}
                      </div>
                    )}
                  </td>

                  {/* Preflight Checklist Badges */}
                  <td className="py-3 px-4 align-middle">
                    <div className="flex items-center gap-1">
                      <span
                        onClick={() => onTogglePreflight(job.id, 'cmyk', job.design_number)}
                        className={`cursor-pointer px-1.5 py-0.5 rounded text-2xs font-bold border ${
                          pf.cmyk
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground border-border dark:bg-muted'
                        }`}
                      >
                        {pf.cmyk ? '✓ CMYK' : 'CMYK'}
                      </span>
                      <span
                        onClick={() => onTogglePreflight(job.id, 'dpi300', job.design_number)}
                        className={`cursor-pointer px-1.5 py-0.5 rounded text-2xs font-bold border ${
                          pf.dpi300
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground border-border dark:bg-muted'
                        }`}
                      >
                        {pf.dpi300 ? '✓ 300DPI' : '300DPI'}
                      </span>
                      <span
                        onClick={() => onTogglePreflight(job.id, 'bleed', job.design_number)}
                        className={`cursor-pointer px-1.5 py-0.5 rounded text-2xs font-bold border ${
                          pf.bleed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground border-border dark:bg-muted'
                        }`}
                      >
                        {pf.bleed ? '✓ Bleed' : 'Bleed'}
                      </span>
                      <span
                        onClick={() => onTogglePreflight(job.id, 'curves', job.design_number)}
                        className={`cursor-pointer px-1.5 py-0.5 rounded text-2xs font-bold border ${
                          pf.curves
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground border-border dark:bg-muted'
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
                      className="h-10 w-14 rounded bg-muted border border-border overflow-hidden relative group block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt={job.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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

                      {/* Progressive Action Workflow & Timer */}
                      {job.status === 'approved' || (job.status as string) === 'sent_to_production' || (job.status as string) === 'completed' ? (
                        <>
                          <DesignTimerBadge
                            startedAt={job.started_at}
                            completedAt={job.completed_at}
                            durationSeconds={job.duration_seconds}
                            isRunning={false}
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled
                            className="h-7 px-2.5 text-xs bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold cursor-default"
                          >
                            <Check className="h-3 w-3 mr-1 stroke-[2.5]" />
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
                            type="button"
                            size="sm"
                            onClick={() => onConfirmToProduction(job)}
                            className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                          >
                            <Send className="h-3 w-3 mr-1" />
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
                            type="button"
                            size="sm"
                            onClick={() => onCompleteDesign(job)}
                            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                          >
                            <Check className="h-3 w-3 mr-1 stroke-[2.5]" />
                            <span>Design Complete</span>
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onStartDesign(job)}
                          className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer"
                        >
                          <Play className="h-2.5 w-2.5 mr-1 fill-current" />
                          <span>Start Design</span>
                        </Button>
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
