'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
 Phone,
 Clock,
 Printer,
 FileText,
 AlertTriangle,
 ArrowRight,
 ExternalLink,
 Calendar,
 Layers,
 MessageSquare,
 AlertOctagon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import type { UnifiedOrderRecord } from './types'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

interface OrderCardProps {
 order: UnifiedOrderRecord
 tenantSlug: string
 onOpenWhatsApp?: (order: UnifiedOrderRecord, tpl?: any) => void
 onOpenJobTicket?: (order: UnifiedOrderRecord) => void
 onPrintJobTicket?: (order: UnifiedOrderRecord) => void
 onOpenQuickStatus?: (order: UnifiedOrderRecord) => void
 onAdvanceStage?: (orderId: string, nextStage: any) => void
 onUpdateLiveStatus?: (orderId: string, newStatus: any) => void
}

export const OrderCard = React.memo(function OrderCard({
 order,
 tenantSlug,
 onOpenWhatsApp,
 onOpenJobTicket,
 onPrintJobTicket,
}: OrderCardProps) {
 const pathname = usePathname()
 const { tBilingual } = useI18n()

 const wf = order.workflowResolution
 const jobsCount = wf?.jobsSummary?.total ?? (order.items?.length || 1)

  // Financial amounts
 const totalAmount = order.totalAmount || 0
 const advanceAmount = order.advanceAmount || 0
 const dueAmount = order.dueAmount || 0

  // Current stage & Next action (from workflow resolution or fallback)
 const currentStage =
 wf?.derivedOrderStatus ||
    (order.stage === 'delivered'
      ? 'Delivered'
      : order.stage === 'ready_delivery'
      ? 'Ready'
      : order.stage === 'in_production'
      ? 'In Progress'
      : order.stage === 'in_design'
      ? 'In Design'
      : 'Confirmed')

 const nextAction =
 wf?.nextActionEn ||
    (dueAmount > 0 && order.stage === 'delivered'
      ? 'Collect Due'
      : order.stage === 'ready_delivery'
      ? 'Create Delivery'
      : order.stage === 'in_production'
      ? 'Complete Production'
      : order.stage === 'in_design'
      ? 'Approve Design'
      : 'Open Job Flow')

 const nextActionHref =
 wf?.nextActionHref || getTenantNavHref(`/orders/${order.id}`, pathname, tenantSlug)

 const isBlocked = Boolean(wf?.isBlocked)
 const blockedReason = wf?.blockedReasonEn
 const blockerActionLabel = wf?.blockerActionLabelEn
 const blockerActionHref = wf?.blockerActionHref

  // Jobs mini-checklist (Section 9: ✓ Banner, ● ACP Sign, ○ Business Card)
 const miniJobs = wf?.jobsSummary?.miniList || (order.items || []).slice(0, 3).map((it, idx) => ({
 jobNumber: `JOB-${idx + 1}`,
 title: it.itemName || 'Custom Job',
 statusIcon: (order.stage === 'delivered' ? '✓' : idx === 0 ? '●' : '○') as '✓' | '●' | '○' | '—',
 statusType: (order.stage === 'delivered' ? 'completed' : idx === 0 ? 'current' : 'pending') as
      | 'completed'
      | 'current'
      | 'pending'
      | 'not_required',
 stageLabel: currentStage,
  }))

 const isUrgent = order.priority === 'urgent' || order.priority === 'very_urgent'
 const isDueToday =
 order.deliveryDate?.includes(new Date().toISOString().split('T')[0])

 return (
    <div
 className={`bg-card border rounded-xl p-4 transition-all duration-200 hover:shadow-xs flex flex-col justify-between ${
 isBlocked
          ? 'border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-300/30'
          : isUrgent
          ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-300/30'
          : 'border-border '
      }`}
    >
      <div className="space-y-3.5">
        {/* Top: ORDER # & Customer & Jobs Count */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
 href={getTenantNavHref(`/orders/${order.id}`, pathname, tenantSlug)}
 className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                <span>ORDER #{order.orderNumber}</span>
                <ExternalLink className="h-3 w-3"/>
              </Link>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {jobsCount} {jobsCount === 1 ? 'Job' : 'Jobs'}
              </span>
              {isUrgent && (
                <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
 URGENT
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-foreground truncate mt-1">
              {order.customerName || 'Walk-in Customer'}
            </h3>
          </div>

          {/* Quick Contact & Ticket Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {order.customerPhone && onOpenWhatsApp && (
              <button
 type="button"onClick={() => onOpenWhatsApp(order, 'order_confirmed')}
 className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"title={tBilingual('Send WhatsApp Update', 'হোয়াটসঅ্যাপ মেসেজ')}
 aria-label="WhatsApp">
                <Phone className="h-3.5 w-3.5"/>
              </button>
            )}
            {onOpenJobTicket && (
              <button
 type="button"onClick={() => onOpenJobTicket(order)}
 className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"title={tBilingual('Print Job Ticket', 'জব টিকেট প্রিন্ট')}
 aria-label="Job Ticket">
                <Printer className="h-3.5 w-3.5"/>
              </button>
            )}
          </div>
        </div>

        {/* Financial Row: Total, Paid, Due (Section 9) */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-muted border border-border text-xs">
          <div>
            <span className="text-3xs font-bold uppercase tracking-wider text-muted-foreground block">Total</span>
            <span className="font-bold tabular-nums text-foreground block mt-0.5">
              ৳{totalAmount.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-3xs font-bold uppercase tracking-wider text-muted-foreground block">Paid</span>
            <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400 block mt-0.5">
              ৳{advanceAmount.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-3xs font-bold uppercase tracking-wider text-muted-foreground block">Due</span>
            <span
 className={`font-bold tabular-nums block mt-0.5 ${
 dueAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
              }`}
            >
              ৳{dueAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Operational State: CURRENT & NEXT (Section 9) */}
        <div className="space-y-1.5 text-xs pt-1 border-t border-border">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">CURRENT:</span>
            <Badge
 variant="outline"className={`text-2xs font-semibold px-2 py-0.5 ${
 isBlocked
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : currentStage === 'Delivered'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : currentStage === 'Ready'
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {currentStage}
            </Badge>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">NEXT:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400 text-right truncate">
              {nextAction}
            </span>
          </div>
        </div>

        {/* Blocker alert if active (Section 15) */}
        {isBlocked && blockedReason && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg p-2.5 text-2xs space-y-1.5">
            <div className="flex items-start gap-1.5 text-amber-900 dark:text-amber-200 font-bold">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5"/>
              <span>BLOCKED: {blockedReason}</span>
            </div>
            {blockerActionLabel && blockerActionHref && (
              <div className="pt-0.5">
                <Link
 href={getTenantNavHref(blockerActionHref, pathname, tenantSlug)}
 className="inline-flex items-center gap-1 font-bold text-amber-800 hover:text-amber-900 underline">
                  <span>[{blockerActionLabel}]</span>
                  <ExternalLink className="h-2.5 w-2.5"/>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Jobs Mini Checklist (Section 9: ✓ Banner, ● ACP Sign, ○ Business Card) */}
        <div className="pt-2 border-t border-border">
          <span className="text-3xs uppercase font-bold text-muted-foreground block mb-1.5">Jobs:</span>
          <div className="space-y-1">
            {miniJobs.slice(0, 4).map((j, idx) => (
              <div key={idx} className="flex items-center justify-between text-2xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
 className={`font-mono font-bold text-xs ${
 j.statusIcon === '✓'
                        ? 'text-emerald-600'
                        : j.statusIcon === '●'
                        ? 'text-blue-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {j.statusIcon}
                  </span>
                  <span className="text-foreground truncate">{j.title}</span>
                </div>
                <span className="text-3xs text-muted-foreground shrink-0 ml-2">{j.stageLabel}</span>
              </div>
            ))}
            {miniJobs.length > 4 && (
              <p className="text-3xs text-muted-foreground italic pt-0.5">
                +{miniJobs.length - 4} more jobs...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Primary Action Button: [Open Job Flow] (Section 9 & Section 11) */}
      <div className="pt-3 mt-3 border-t border-border">
        <Button
 asChild
 size="sm"className="w-full h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
          <Link href={getTenantNavHref(`/orders/${order.id}`, pathname, tenantSlug)}>
            <span>{tBilingual('Open Job Flow', 'কাজের ফ্লো খুলুন')}</span>
            <ArrowRight className="ml-1.5 h-3.5 w-3.5"/>
          </Link>
        </Button>
      </div>
    </div>
  )
})
