'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  UserPlus,
  UserCheck,
  FileText,
  CreditCard,
  PhoneCall,
  ShoppingBag,
  Sparkles,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react'
import { CustomerTimelineEvent } from '@/types/crm.types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { cn } from '@/lib/utils'

interface CustomerTimelineProps {
  events: CustomerTimelineEvent[]
  isLoading?: boolean
  tenantSlug?: string
  onSelectPaymentForReceipt?: (paymentId: string) => void
}

export function CustomerTimeline({
  events,
  isLoading = false,
  tenantSlug,
  onSelectPaymentForReceipt,
}: CustomerTimelineProps) {
  const pathname = usePathname()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <Card className="border-slate-200 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-950">
        <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No Activity Logged Yet
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Invoices, payments, quotations, and communications will appear chronologically here.
        </p>
      </Card>
    )
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'customer_created':
        return <UserPlus className="h-4 w-4 text-blue-600" />
      case 'quotation_sent':
      case 'quotation_created':
        return <Send className="h-4 w-4 text-amber-600" />
      case 'order_created':
      case 'job_started':
        return <ShoppingBag className="h-4 w-4 text-cyan-600" />
      case 'invoice_created':
        return <FileText className="h-4 w-4 text-indigo-600" />
      case 'payment_received':
        return <CreditCard className="h-4 w-4 text-emerald-600" />
      case 'communication_logged':
        return <PhoneCall className="h-4 w-4 text-sky-600" />
      case 'rate_overridden':
        return <Tag className="h-4 w-4 text-purple-600" />
      default:
        return <Clock className="h-4 w-4 text-slate-400" />
    }
  }

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'payment_received':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 text-2xs">
            Payment
          </Badge>
        )
      case 'invoice_created':
        return (
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 text-2xs">
            Invoice
          </Badge>
        )
      case 'quotation_sent':
      case 'quotation_created':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 text-2xs">
            Quotation
          </Badge>
        )
      case 'order_created':
      case 'job_started':
        return (
          <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 text-2xs">
            Order
          </Badge>
        )
      case 'communication_logged':
        return (
          <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 text-2xs">
            Comm
          </Badge>
        )
      default:
        return null
    }
  }

  const renderReferenceLink = (evt: CustomerTimelineEvent) => {
    if (!evt.referenceNumber && !evt.referenceId) return null
    const refNum = evt.referenceNumber || evt.referenceId
    const baseSlug = tenantSlug || 'my-company'

    if (evt.referenceType === 'invoice' || evt.type === 'invoice_created') {
      return (
        <Link
          href={getTenantNavHref(`/billing/${evt.referenceId || refNum}`, pathname, baseSlug)}
          className="inline-flex items-center gap-1 font-mono text-2xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline bg-blue-50/70 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900"
          title="Open Invoice"
        >
          <span>{refNum}</span>
          <span className="text-2xs">&rarr;</span>
        </Link>
      )
    }

    if (evt.referenceType === 'quotation' || evt.type.startsWith('quotation')) {
      return (
        <Link
          href={getTenantNavHref('/quotations', pathname, baseSlug)}
          className="inline-flex items-center gap-1 font-mono text-2xs font-bold text-amber-600 hover:text-amber-800 dark:text-amber-400 hover:underline bg-amber-50/70 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900"
          title="Open Quotations"
        >
          <span>{refNum}</span>
          <span className="text-2xs">&rarr;</span>
        </Link>
      )
    }

    if (evt.referenceType === 'order' || evt.type.startsWith('order') || evt.type === 'job_started') {
      return (
        <Link
          href={getTenantNavHref('/orders', pathname, baseSlug)}
          className="inline-flex items-center gap-1 font-mono text-2xs font-bold text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 hover:underline bg-cyan-50/70 dark:bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-200 dark:border-cyan-900"
          title="Open Orders"
        >
          <span>{refNum}</span>
          <span className="text-2xs">&rarr;</span>
        </Link>
      )
    }

    if (evt.referenceType === 'payment' || evt.type === 'payment_received') {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-2xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
          MR #{refNum}
        </span>
      )
    }

    return (
      <span className="font-mono text-2xs font-medium text-slate-600 dark:text-slate-400">
        Ref: {refNum}
      </span>
    )
  }

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {events.map((evt) => (
        <div key={evt.id} className="relative group">
          {/* Node Icon */}
          <div className="absolute -left-6 top-1 h-5 w-5 rounded-full border-2 border-white dark:border-slate-950 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-xs">
            {getEventIcon(evt.type)}
          </div>

          {/* Event Content Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <CardContent className="p-3 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {evt.title}
                  </span>
                  {getEventBadge(evt.type)}
                  {renderReferenceLink(evt)}
                </div>

                <div className="text-2xs text-slate-400 font-medium shrink-0">
                  {new Date(evt.timestamp).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>

              {evt.description && (
                <div className="text-slate-600 dark:text-slate-400 text-2xs leading-relaxed">
                  {evt.description}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-2xs text-slate-400">
                {evt.actorName && (
                  <span>
                    By: <strong className="text-slate-600 dark:text-slate-300 font-medium">{evt.actorName}</strong>
                  </span>
                )}
                {evt.amount !== undefined && evt.amount !== null && (
                  <span className="font-bold text-slate-700 dark:text-slate-300 ml-auto">
                    Amount: ৳{evt.amount.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
