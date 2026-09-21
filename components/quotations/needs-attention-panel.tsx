'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AlertCircle,
  MessageSquare,
  PhoneCall,
  Calendar,
  ExternalLink,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { QuotationRecord } from '@/types/quotation.types'
import { QuotationService } from '@/services/quotation.service'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

export interface NeedsAttentionPanelProps {
  quotations: QuotationRecord[]
  tenantSlug: string
  companyName?: string
  onOpenFollowUp: (quote: QuotationRecord) => void
}

export function NeedsAttentionPanel({
  quotations,
  tenantSlug,
  companyName = 'InkFlow',
  onOpenFollowUp,
}: NeedsAttentionPanelProps) {
  const pathname = usePathname()
  const urgentQuotes = QuotationService.getNeedsAttentionQuotes(quotations)

  if (urgentQuotes.length === 0) {
    return null
  }

  const getAttentionReason = (q: QuotationRecord) => {
    if (q.status === 'approved') {
      return {
        label: 'Approved • Ready to Convert to Job Order',
        urgency: 'success',
      }
    }

    const expiry = QuotationService.calculateExpiryUrgency(q.valid_until)
    if (expiry.urgency === 'critical') {
      return {
        label: expiry.label,
        urgency: 'critical',
      }
    }

    if (q.follow_up_date) {
      const fDate = new Date(q.follow_up_date)
      fDate.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (fDate <= today) {
        return {
          label: 'Follow-up Scheduled Today',
          urgency: 'warning',
        }
      }
    }

    if (expiry.urgency === 'warning') {
      return {
        label: expiry.label,
        urgency: 'warning',
      }
    }

    if (q.status === 'sent') {
      return {
        label: 'Sent • Awaiting Customer Response',
        urgency: 'normal',
      }
    }

    if (q.status === 'negotiation') {
      return {
        label: 'Customer is Negotiating Margin',
        urgency: 'warning',
      }
    }

    return {
      label: 'Action Required',
      urgency: 'normal',
    }
  }

  return (
    <Card className="border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/40 via-white to-orange-50/30 dark:from-amber-950/20 dark:via-slate-900/80 dark:to-orange-950/20 shadow-xs overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-amber-200/60 dark:border-amber-900/40 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200">
              Needs Attention ({urgentQuotes.length})
            </CardTitle>
          </div>
        </div>
        <span className="text-[11px] font-medium text-amber-800/80 dark:text-amber-400/80 hidden sm:inline">
          High-priority commercial follow-ups & approvals
        </span>
      </CardHeader>

      <CardContent className="p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {urgentQuotes.map((q) => {
            const reason = getAttentionReason(q)
            const cleanPhone = (q.customer_whatsapp || q.customer_phone || '').replace(/\D/g, '')
            const waText = encodeURIComponent(
              `Hello ${q.customer_name},\nRegarding quotation #${q.quotation_number} (${formatBDT(q.grand_total)}) from ${companyName}. Please let us know if you'd like us to proceed with production.`
            )
            const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('880') ? cleanPhone : `880${cleanPhone.replace(/^0/, '')}`}?text=${waText}` : '#'

            return (
              <div
                key={q.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-2.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                {/* Header: Quote # & Value */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <Link
                      href={getTenantNavHref(`/quotations/${q.id}`, pathname, tenantSlug)}
                      className="font-mono font-bold text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>{q.quotation_number}</span>
                    </Link>
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {formatBDT(q.grand_total)}
                    </span>
                  </div>

                  {/* Customer & Job snippet */}
                  <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {q.customer_name}
                    {q.customer_company && (
                      <span className="text-slate-500 font-normal text-[11px] ml-1 truncate">
                        ({q.customer_company})
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {q.items?.[0]?.description || 'Custom Print Job'}
                  </div>
                </div>

                {/* Attention Tag */}
                <div
                  className={cn(
                    'px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5',
                    reason.urgency === 'critical'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900'
                      : reason.urgency === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900'
                  )}
                >
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="truncate">{reason.label}</span>
                </div>

                {/* Fast Action Buttons */}
                <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {cleanPhone ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 h-7 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80"
                      title="Send WhatsApp Follow-up"
                    >
                      <MessageSquare className="h-3 w-3 text-emerald-600" />
                      <span>WA</span>
                    </a>
                  ) : (
                    <Button size="sm" variant="outline" disabled className="h-7 text-[11px] opacity-40">
                      WA
                    </Button>
                  )}

                  {q.customer_phone ? (
                    <a
                      href={`tel:${q.customer_phone}`}
                      className="inline-flex items-center justify-center gap-1 h-7 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      title="Call Customer"
                    >
                      <PhoneCall className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                      <span>Call</span>
                    </a>
                  ) : (
                    <Button size="sm" variant="outline" disabled className="h-7 text-[11px] opacity-40">
                      Call
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenFollowUp(q)}
                    className="h-7 text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/80 cursor-pointer"
                    title="Log Follow-up Note"
                  >
                    Follow
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
