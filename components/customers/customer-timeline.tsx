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
 className="h-16 rounded-xl border border-border bg-muted animate-pulse"/>
        ))}
      </div>
    )
  }

 if (events.length === 0) {
 return (
      <Card className="border-border p-8 text-center bg-card">
        <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground"/>
        <div className="text-sm font-semibold text-foreground">
 No Activity Logged Yet
        </div>
        <p className="text-xs text-muted-foreground mt-1">
 Invoices, payments, quotations, and communications will appear chronologically here.
        </p>
      </Card>
    )
  }

 const getEventIcon = (type: string) => {
 switch (type) {
 case 'customer_created':
 return <UserPlus className="h-4 w-4 text-primary"/>
 case 'quotation_sent':
 case 'quotation_created':
 return <Send className="h-4 w-4 text-warning"/>
 case 'order_created':
 case 'job_started':
 return <ShoppingBag className="h-4 w-4 text-primary"/>
 case 'invoice_created':
 return <FileText className="h-4 w-4 text-primary"/>
 case 'payment_received':
 return <CreditCard className="h-4 w-4 text-success"/>
 case 'communication_logged':
 return <PhoneCall className="h-4 w-4 text-primary"/>
 case 'rate_overridden':
 return <Tag className="h-4 w-4 text-primary"/>
 default:
 return <Clock className="h-4 w-4 text-muted-foreground"/>
    }
  }

 const getEventBadge = (type: string) => {
 switch (type) {
 case 'payment_received':
 return (
          <Badge className="bg-success-surface text-success border-success-border bg-success-surface/60 text-success text-xs">
 Payment
          </Badge>
        )
 case 'invoice_created':
 return (
          <Badge className="bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary text-xs">
 Invoice
          </Badge>
        )
 case 'quotation_sent':
 case 'quotation_created':
 return (
          <Badge className="bg-warning-surface text-warning border-warning-border bg-warning-surface/60 text-warning text-xs">
 Quotation
          </Badge>
        )
 case 'order_created':
 case 'job_started':
 return (
          <Badge className="bg-info-surface text-primary border-primary/20 bg-primary/10 text-primary text-xs">
 Order
          </Badge>
        )
 case 'communication_logged':
 return (
          <Badge className="bg-info-surface text-primary border-primary/20 bg-primary/10 text-primary text-xs">
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
 className="inline-flex items-center gap-1 tabular-nums text-xs font-bold text-primary hover:text-primary text-primary hover:underline bg-primary/10/70 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 border-border"title="Open Invoice">
          <span>{refNum}</span>
          <span className="text-xs">&rarr;</span>
        </Link>
      )
    }

 if (evt.referenceType === 'quotation' || evt.type.startsWith('quotation')) {
 return (
        <Link
 href={getTenantNavHref('/quotations', pathname, baseSlug)}
 className="inline-flex items-center gap-1 tabular-nums text-xs font-bold text-warning hover:text-warning text-warning hover:underline bg-warning-surface/70 bg-warning-surface px-1.5 py-0.5 rounded border border-warning-border border-warning-border"title="Open Quotations">
          <span>{refNum}</span>
          <span className="text-xs">&rarr;</span>
        </Link>
      )
    }

 if (evt.referenceType === 'order' || evt.type.startsWith('order') || evt.type === 'job_started') {
 return (
        <Link
 href={getTenantNavHref('/orders', pathname, baseSlug)}
 className="inline-flex items-center gap-1 tabular-nums text-xs font-bold text-primary hover:text-primary text-primary hover:underline bg-info-surface/70 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 border-border"title="Open Orders">
          <span>{refNum}</span>
          <span className="text-xs">&rarr;</span>
        </Link>
      )
    }

 if (evt.referenceType === 'payment' || evt.type === 'payment_received') {
 return (
        <span className="inline-flex items-center gap-1 tabular-nums text-xs font-bold text-success text-success bg-success-surface/70 bg-success-surface px-1.5 py-0.5 rounded border border-success-border border-success-border">
 MR #{refNum}
        </span>
      )
    }

 return (
      <span className="tabular-nums text-xs font-medium text-muted-foreground">
 Ref: {refNum}
      </span>
    )
  }

 return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted dark:before:bg-card-elevated">
      {events.map((evt) => (
        <div key={evt.id} className="relative group">
          {/* Node Icon */}
          <div className="absolute -left-6 top-1 h-5 w-5 rounded-full border-2 border-white dark:border-border bg-muted flex items-center justify-center shadow-xs">
            {getEventIcon(evt.type)}
          </div>

          {/* Event Content Card */}
          <Card className="border-border shadow-xs hover:border-input transition-colors">
            <CardContent className="p-3 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {evt.title}
                  </span>
                  {getEventBadge(evt.type)}
                  {renderReferenceLink(evt)}
                </div>

                <div className="text-xs text-muted-foreground font-medium shrink-0">
                  {new Date(evt.timestamp).toLocaleDateString('en-GB', {
 day: 'numeric',
 month: 'short',
 year: 'numeric',
                  })}
                </div>
              </div>

              {evt.description && (
                <div className="text-muted-foreground text-xs leading-relaxed">
                  {evt.description}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                {evt.actorName && (
                  <span>
 By: <strong className="text-muted-foreground font-medium">{evt.actorName}</strong>
                  </span>
                )}
                {evt.amount !== undefined && evt.amount !== null && (
                  <span className="font-bold text-foreground ml-auto">
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
